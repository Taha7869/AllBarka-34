import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  getPublicMerchandising,
  getAdminMerchandisingBundle,
  updateAdminMerchandising,
  publishAdminMerchandising,
  MERCHANDISING_COLLECTION,
} from '../src/lib/catalogStore';
import { DEFAULT_MERCHANDISING } from '../src/config/merchandising';
import { PRODUCTS } from '../src/data/products';
import HomePage from '../src/pages/HomePage';
import { MerchandisingProvider } from '../src/contexts/MerchandisingContext';
import BoutiqueSelections from '../src/components/BoutiqueSelections';
import CategoryCarousel from '../src/components/CategoryCarousel';
import FindGiftOccasionSection from '../src/components/FindGiftOccasionSection';
import { LanguageProvider, type LanguageCode } from '../src/contexts/LanguageContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { CartProvider } from '../src/contexts/CartContext';
import { CatalogProvider } from '../src/contexts/CatalogContext';
import type { MerchandisingSettings, Product } from '../src/types';

/**
 * Isolated in-memory Firestore fixture implementing atomic transactions and
 * collections for merchandising integration tests.
 */
function createMockFirestore() {
  const store = new Map<string, any>();

  const makeSnapshot = (path: string, id: string, docRef: any) => ({
    id,
    ref: docRef,
    exists: store.has(path),
    data: () => (store.has(path) ? structuredClone(store.get(path)) : undefined),
  });

  const makeDocRef = (path: string) => {
    const id = path.split('/').at(-1)!;
    const ref: any = {
      id,
      path,
      get: async () => makeSnapshot(path, id, ref),
      set: async (data: any, options?: { merge?: boolean }) => {
        const existing = store.get(path);
        if (options?.merge && existing) {
          store.set(path, { ...existing, ...structuredClone(data) });
        } else {
          store.set(path, structuredClone(data));
        }
      },
      delete: async () => {
        store.delete(path);
      },
      collection: (subCol: string) => makeCollection(`${path}/${subCol}`),
    };
    return ref;
  };

  const makeCollection = (colPath: string) => ({
    path: colPath,
    doc: (docId?: string) => makeDocRef(`${colPath}/${docId || 'auto_' + Math.random().toString(36).slice(2)}`),
    add: async (data: any) => {
      const id = 'auto_' + Math.random().toString(36).slice(2);
      const path = `${colPath}/${id}`;
      store.set(path, structuredClone(data));
      return makeDocRef(path);
    },
    get: async () => {
      const docs: any[] = [];
      const prefix = `${colPath}/`;
      for (const [key] of store.entries()) {
        if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/')) {
          const id = key.slice(prefix.length);
          docs.push(makeSnapshot(key, id, makeDocRef(key)));
        }
      }
      return { docs, empty: docs.length === 0, size: docs.length };
    },
  });

  const mockDb: any = {
    collection: (colPath: string) => makeCollection(colPath),
    doc: (docPath: string) => makeDocRef(docPath),
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>): Promise<any> => {
      const stage = new Map<string, any>();
      const deletes = new Set<string>();

      const transaction = {
        get: async (docRef: any) => {
          const path = docRef.path;
          if (deletes.has(path)) return { id: docRef.id, ref: docRef, exists: false, data: () => undefined };
          if (stage.has(path)) return { id: docRef.id, ref: docRef, exists: true, data: () => structuredClone(stage.get(path)) };
          return makeSnapshot(path, docRef.id, docRef);
        },
        set: (docRef: any, data: any, options?: { merge?: boolean }) => {
          const path = docRef.path;
          deletes.delete(path);
          const existing = stage.has(path) ? stage.get(path) : store.get(path);
          if (options?.merge && existing) {
            stage.set(path, { ...existing, ...structuredClone(data) });
          } else {
            stage.set(path, structuredClone(data));
          }
        },
        delete: (docRef: any) => {
          const path = docRef.path;
          stage.delete(path);
          deletes.add(path);
        },
      };

      const result = await updateFunction(transaction);

      for (const [path, val] of stage.entries()) store.set(path, val);
      for (const path of deletes) store.delete(path);

      return result;
    },
  };

  return { db: mockDb, store };
}

function renderWithProviders(
  element: React.ReactElement,
  catalog: Product[] = PRODUCTS,
  language: LanguageCode = 'en'
) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      matchMedia: () => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      addEventListener: () => {},
      removeEventListener: () => {},
      pageXOffset: 0,
      pageYOffset: 0,
    },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => (key === 'allbarka_language' ? language : null) },
  });
  try {
    return renderToString(
      <MemoryRouter initialEntries={['/']}>
        <LanguageProvider>
          <ThemeProvider>
            <CartProvider>
              <CatalogProvider initialProducts={catalog}>{element}</CatalogProvider>
            </CartProvider>
          </ThemeProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else Reflect.deleteProperty(globalThis, 'window');
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

test('1. Admin Merchandising lifecycle: draft save -> draft isolation -> publish promotion -> public retrieval', async () => {
  const { db } = createMockFirestore();

  // A. Initial state before any admin interaction
  const initialPublic = await getPublicMerchandising(db);
  assert.deepEqual(initialPublic.showcaseTabs, DEFAULT_MERCHANDISING.showcaseTabs);
  assert.equal(initialPublic.autoplay?.enabled, true);

  const initialBundle = await getAdminMerchandisingBundle(db);
  assert.equal(initialBundle.draftRevision, DEFAULT_MERCHANDISING.revision);
  assert.equal(initialBundle.liveRevision, DEFAULT_MERCHANDISING.revision);

  // B. Admin saves draft with custom tab order, custom autoplay interval, and category visibility
  const draftUpdate = {
    expectedRevision: initialBundle.draftRevision,
    autoplay: { enabled: true, intervalMs: 8000, resumeDelayMs: 4000 },
    categoryOrder: ['oils', 'dates', 'dry-fruits', 'seeds-snacks', 'essentials'],
    categoryVisibility: { oils: true, dates: true, 'dry-fruits': true, 'seeds-snacks': true, essentials: false },
    showcaseTabs: [
      { id: 'deals', label_en: 'Exclusive Deals', label_ur: 'ڈیلز', productIds: ['royal-amber-box', 'badam'], visible: true },
      { id: 'dry-fruits', label_en: 'Mountain Harvest', label_ur: 'خشک میوہ جات', productIds: ['chilgoza', 'pista'], visible: true },
    ],
    occasions: [
      { tag: 'wedding', title_en: 'Royal Nikkah', title_ur: 'شاہی نکاح', slug: '/shop/celebration-boxes?occasion=wedding', visible: true },
      { tag: 'umrah', title_en: 'Umrah & Hajj', title_ur: 'عمرہ و حج', slug: '/shop/celebration-boxes?occasion=umrah', visible: false },
    ],
    adminNotes: 'Preparing spring deals showcase',
  };

  const savedDraft = await updateAdminMerchandising({
    db,
    body: draftUpdate,
    actorUid: 'admin-lead-789',
  });

  assert.equal(savedDraft.revision, initialBundle.draftRevision + 1);
  assert.equal(savedDraft.updatedBy, 'admin-lead-789');
  assert.equal(savedDraft.autoplay?.intervalMs, 8000);

  // C. Draft isolation: public storefront MUST NOT leak draft changes
  const publicDuringDraft = await getPublicMerchandising(db);
  assert.deepEqual(
    publicDuringDraft.showcaseTabs,
    DEFAULT_MERCHANDISING.showcaseTabs,
    'Public storefront must continue serving live settings during active draft editing'
  );
  assert.equal(publicDuringDraft.autoplay?.intervalMs, 6000, 'Public autoplay must retain live interval');

  // D. Stale revision rejection
  await assert.rejects(
    async () => {
      await updateAdminMerchandising({
        db,
        body: { ...draftUpdate, expectedRevision: initialBundle.draftRevision },
        actorUid: 'admin-lead-789',
      });
    },
    /CATALOG_REVISION_CONFLICT/,
    'Saving with outdated expectedRevision must fail with revision conflict'
  );

  // E. Publish draft to live
  const publishResult = await publishAdminMerchandising({
    db,
    actorUid: 'admin-lead-789',
    body: {
      expectedDraftRevision: savedDraft.revision,
      expectedLiveRevision: initialBundle.liveRevision,
    },
  });

  assert.equal(publishResult.liveRevision, initialBundle.liveRevision + 1, 'Live revision must increment');
  assert.equal(publishResult.draftRevision, savedDraft.revision + 1, 'Draft revision must increment for subsequent edits');

  // F. Public storefront now serves published live settings
  const publicAfterPublish = await getPublicMerchandising(db);
  assert.equal(publicAfterPublish.autoplay?.intervalMs, 8000, 'Published autoplay interval must take effect');
  assert.equal(publicAfterPublish.autoplay?.resumeDelayMs, 4000);
  assert.equal(publicAfterPublish.showcaseTabs.length, 2, 'Published showcase tabs must take effect');
  assert.equal(publicAfterPublish.showcaseTabs[0].id, 'deals');
  assert.equal(publicAfterPublish.showcaseTabs[1].id, 'dry-fruits');

  // Privacy sanitization check: actor identity & adminNotes must NEVER be exposed publicly
  assert.equal((publicAfterPublish as any).updatedBy, undefined, 'Actor UID must be stripped from public settings');
  assert.equal((publicAfterPublish as any).adminNotes, undefined, 'Admin notes must be stripped from public settings');
});

test('2. CategoryCarousel renders published collection title, custom image, destination, visibility, and order', async () => {
  const publishedSettings: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    categoryOrder: ['deals', 'oils', 'dates', 'dry-fruits'],
    categoryVisibility: {
      deals: true,
      oils: true,
      dates: true,
      essentials: false, // Hidden category
      combos: false, // Hidden collection
      'dry-fruits': true,
      nuts: true,
    },
    collections: [
      {
        collectionId: 'deals',
        title_en: 'Mega Spring Deals',
        title_ur: 'بہار کی خصوصی ڈیلز',
        image: '/images/custom-deals-banner.webp',
        slug: '/shop/deals?promo=spring-mega',
        visible: true,
        badge: 'Spring Deal',
      },
      {
        collectionId: 'combos',
        title_en: 'Curated Combos',
        title_ur: 'منتخب بنڈلز',
        slug: '/shop/combos',
        visible: false, // Hidden via collection visibility
      },
    ],
  };

  const html = renderWithProviders(<CategoryCarousel settings={publishedSettings} />);

  // 1. Published collection title, image, destination, and badge must be rendered
  assert.ok(html.includes('Mega Spring Deals'), 'Published collection title must be rendered');
  assert.ok(html.includes('/images/custom-deals-banner.webp'), 'Published custom collection image must be rendered');
  assert.ok(html.includes('href="/shop/deals?promo=spring-mega"'), 'Published custom destination must be rendered');
  assert.ok(html.includes('Spring Deal'), 'Published collection badge must be rendered');

  // 2. Visible categories must appear in the rendered HTML
  assert.ok(html.includes('href="/shop/oils"'), 'Oils must be present');
  assert.ok(html.includes('href="/shop/dates"'), 'Dates must be present');

  // 3. Hidden category (essentials) and hidden collection (combos) must NOT appear
  assert.ok(!html.includes('href="/shop/essentials"'), 'Hidden category essentials must NOT be rendered');
  assert.ok(!html.includes('href="/shop/combos"'), 'Hidden collection combos must NOT be rendered');

  // 4. Order precedence: deals must appear before oils according to categoryOrder
  const dealsIndex = html.indexOf('Mega Spring Deals');
  const oilsIndex = html.indexOf('href="/shop/oils"');
  assert.ok(dealsIndex !== -1 && oilsIndex !== -1 && dealsIndex < oilsIndex, 'CategoryOrder must determine slide ordering');
});

test('3. BoutiqueSelections filters inactive/unpublished products and limits to 3 per tab', async () => {
  // Create a test catalog with active and inactive products
  const testCatalog: Product[] = [
    {
      id: 'active-pista',
      name_en: 'Active Pista',
      category: 'dry-fruits',
      active: true,
      prices: { '250g': 1200 },
      wholesale: 0,
      image: null,
      imageName: null,
      desc_en: 'Fresh',
    },
    {
      id: 'inactive-badam',
      name_en: 'Inactive Badam',
      category: 'dry-fruits',
      active: false, // Inactive!
      prices: { '250g': 900 },
      wholesale: 0,
      image: null,
      imageName: null,
      desc_en: 'Inactive',
    },
    {
      id: 'archived-cashew',
      name_en: 'Archived Cashew',
      category: 'dry-fruits',
      active: true,
      status: 'archived', // Archived!
      prices: { '250g': 1500 },
      wholesale: 0,
      image: null,
      imageName: null,
      desc_en: 'Archived',
    } as any,
    {
      id: 'active-walnut-1',
      name_en: 'Active Walnut 1',
      category: 'dry-fruits',
      active: true,
      prices: { '250g': 1100 },
      wholesale: 0,
      image: null,
      imageName: null,
      desc_en: 'Walnut 1',
    },
    {
      id: 'active-walnut-2',
      name_en: 'Active Walnut 2',
      category: 'dry-fruits',
      active: true,
      prices: { '250g': 1100 },
      wholesale: 0,
      image: null,
      imageName: null,
      desc_en: 'Walnut 2',
    },
    {
      id: 'active-walnut-extra',
      name_en: 'Active Walnut Extra (4th)',
      category: 'dry-fruits',
      active: true,
      prices: { '250g': 1100 },
      wholesale: 0,
      image: null,
      imageName: null,
      desc_en: 'Walnut Extra',
    },
  ];

  const settingsWithMixedProducts: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    showcaseTabs: [
      {
        id: 'dry-fruits',
        label_en: 'Dry Fruits',
        label_ur: 'خشک میوہ جات',
        // 5 products specified:
        // 1. active-pista (active) -> included
        // 2. inactive-badam (inactive) -> EXCLUDED
        // 3. archived-cashew (archived) -> EXCLUDED
        // 4. active-walnut-1 (active) -> included
        // 5. active-walnut-2 (active) -> included
        // 6. active-walnut-extra (4th active) -> EXCLUDED by 3-product cap
        productIds: [
          'active-pista',
          'inactive-badam',
          'archived-cashew',
          'active-walnut-1',
          'active-walnut-2',
          'active-walnut-extra',
        ],
        visible: true,
      },
      {
        id: 'empty-tab',
        label_en: 'Empty Tab',
        label_ur: '',
        productIds: ['inactive-badam', 'archived-cashew'], // No active products!
        visible: true,
      },
    ],
  };

  const html = renderWithProviders(
    <BoutiqueSelections settings={settingsWithMixedProducts} products={testCatalog} />,
    testCatalog
  );

  // Active products in tab must be rendered
  assert.ok(html.includes('Active Pista'), 'Active Pista must be rendered');
  assert.ok(html.includes('Active Walnut 1'), 'Active Walnut 1 must be rendered');
  assert.ok(html.includes('Active Walnut 2'), 'Active Walnut 2 must be rendered');

  // Inactive & archived products must NOT be rendered
  assert.ok(!html.includes('Inactive Badam'), 'Inactive product must NOT be rendered in showcase');
  assert.ok(!html.includes('Archived Cashew'), 'Archived product must NOT be rendered in showcase');

  // 4th product must NOT be rendered (strict 3-product cap)
  assert.ok(!html.includes('Active Walnut Extra'), '4th product must be capped at 3 items maximum');

  // Empty tab with 0 active products must be hidden
  assert.ok(!html.includes('Empty Tab'), 'Tab with 0 active products must be omitted from tablist');
});

test('4. FindGiftOccasionSection filters hidden occasions and preserves validated routes', async () => {
  const publishedSettings: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    occasions: [
      { tag: 'wedding', title_en: 'Wedding & Nikkah', title_ur: 'شادی و نکاح', slug: '/shop/celebration-boxes?occasion=wedding', visible: true },
      { tag: 'umrah', title_en: 'Umrah & Hajj', title_ur: 'عمرہ و حج', slug: '/shop/celebration-boxes?occasion=umrah', visible: false }, // Hidden!
      { tag: 'ramadan', title_en: 'Ramadan & Eid', title_ur: 'رمضان اور عید', slug: '/shop?occasion=ramadan', visible: true },
      { tag: 'birth', title_en: 'Birth & Aqeeqah', title_ur: 'ولادت و عقیقہ', slug: '/shop/celebration-boxes?occasion=birth', visible: true },
      { tag: 'corporate', title_en: 'Corporate Gifting', title_ur: 'کارپوریٹ گفٹنگ', slug: '/wholesale', visible: false }, // Hidden!
    ],
  };

  const html = renderWithProviders(<FindGiftOccasionSection settings={publishedSettings} />);

  // Visible occasions
  assert.ok(html.includes('/shop/celebration-boxes?occasion=wedding'), 'Wedding link must be rendered');
  assert.ok(html.includes('/shop?occasion=ramadan'), 'Ramadan link must be rendered');
  assert.ok(html.includes('/shop/celebration-boxes?occasion=birth'), 'Birth link must be rendered');

  // Hidden occasions must NOT be rendered
  assert.ok(!html.includes('occasion=umrah'), 'Hidden Umrah occasion must NOT be rendered');
  assert.ok(!html.includes('/wholesale'), 'Hidden Corporate occasion must NOT be rendered');
});

test('5. Custom merchant occasion title honors saved localized title over translated default (e.g. Wedding)', async () => {
  const settingsWithCustomTitles: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    occasions: [
      {
        tag: 'wedding',
        title_en: 'Bespoke Royal Nikkah Favors',
        title_ur: 'شاہی بیڈ باکسز نکاح',
        slug: '/shop/celebration-boxes?occasion=wedding',
        visible: true,
      },
      {
        tag: 'birth',
        title_en: 'Baby Joy Favors',
        title_ur: 'ولادت خوشی بیڈ باکس',
        slug: '/shop/celebration-boxes?occasion=birth',
        visible: true,
      },
      {
        tag: 'ramadan',
        title_en: '', // Empty custom title -> must fallback to translated default
        title_ur: '',
        slug: '/shop?occasion=ramadan',
        visible: true,
      },
    ],
  };

  // English render: merchant title_en must be rendered, NOT the hardcoded 'Wedding & Nikkah' translation key!
  const htmlEn = renderWithProviders(<FindGiftOccasionSection settings={settingsWithCustomTitles} />, PRODUCTS, 'en');
  assert.ok(htmlEn.includes('Bespoke Royal Nikkah Favors'), 'Merchant-saved title_en must be rendered');
  assert.ok(!htmlEn.includes('Wedding &amp; Nikkah') && !htmlEn.includes('Wedding & Nikkah'), 'Translation dictionary key must NOT override merchant title');
  assert.ok(htmlEn.includes('Baby Joy Favors'), 'Baby Joy Favors title must be rendered');
  assert.ok(htmlEn.includes('Ramadan &amp; Eid') || htmlEn.includes('Ramadan & Eid'), 'Empty merchant title must fallback cleanly to translated default');

  // Urdu render: merchant title_ur must be rendered
  const htmlUr = renderWithProviders(<FindGiftOccasionSection settings={settingsWithCustomTitles} />, PRODUCTS, 'ur');
  assert.ok(htmlUr.includes('شاہی بیڈ باکسز نکاح'), 'Merchant-saved title_ur must be rendered in Urdu');
  assert.ok(htmlUr.includes('ولادت خوشی بیڈ باکس'), 'Merchant-saved title_ur must be rendered in Urdu');
});

test('6. End-to-end integrated flow via MerchandisingProvider: admin save -> preview isolation -> publish -> public fetch -> homepage refresh', async () => {
  const { db } = createMockFirestore();

  // Step 1: Initial public state
  const live0 = await getPublicMerchandising(db);
  assert.deepEqual(live0.showcaseTabs, DEFAULT_MERCHANDISING.showcaseTabs);

  // Storefront rendered with MerchandisingProvider (no direct settings prop on child sections)
  const initialHtml = renderWithProviders(
    <MerchandisingProvider initialSettings={live0}>
      <HomePage />
    </MerchandisingProvider>
  );

  assert.ok(initialHtml.includes('/shop/combos') || initialHtml.includes('/shop/bundles'), 'Initial live collection link rendered');
  assert.ok(initialHtml.includes('Wedding &amp; Nikkah') || initialHtml.includes('Wedding & Nikkah'), 'Initial live occasion title rendered');

  // Step 2: Admin saves draft via updateAdminMerchandising
  const bundle = await getAdminMerchandisingBundle(db);
  const draftUpdate = {
    expectedRevision: bundle.draftRevision,
    categoryOrder: ['deals', 'oils', 'dates', 'dry-fruits'],
    categoryVisibility: {
      deals: true,
      oils: true,
      dates: true,
      'dry-fruits': true,
      combos: false, // Hidden collection
      essentials: false,
    },
    collections: [
      {
        collectionId: 'deals',
        title_en: 'Flash Spring Deals',
        title_ur: 'بہار فلیش ڈیلز',
        image: '/images/flash-deals.webp',
        slug: '/shop/deals?promo=flash-spring',
        visible: true,
        badge: 'Hot Deal',
      },
      {
        collectionId: 'combos',
        title_en: 'Curated Combos',
        title_ur: 'منتخب بنڈلز',
        slug: '/shop/combos',
        visible: false, // Hidden via collection
      },
    ],
    occasions: [
      {
        tag: 'wedding',
        title_en: 'Imperial Nikkah Hampers',
        title_ur: 'شاہی نکاح ہیمپرز',
        slug: '/shop/celebration-boxes?occasion=wedding&tier=imperial',
        visible: true,
      },
      {
        tag: 'umrah',
        title_en: 'Umrah & Hajj',
        title_ur: 'عمرہ و حج',
        slug: '/shop/celebration-boxes?occasion=umrah',
        visible: false, // Hidden occasion
      },
    ],
    autoplay: { enabled: true, intervalMs: 8888, resumeDelayMs: 4444 },
    adminNotes: 'Spring promotion campaign',
  };

  const savedDraft = await updateAdminMerchandising({
    db,
    body: draftUpdate,
    actorUid: 'admin-lead-789',
  });
  assert.equal(savedDraft.revision, bundle.draftRevision + 1);

  // Step 3: Preview Isolation — Public retrieval MUST NOT leak draft changes
  const publicDuringDraft = await getPublicMerchandising(db);
  const htmlDuringDraft = renderWithProviders(
    <MerchandisingProvider initialSettings={publicDuringDraft}>
      <HomePage />
    </MerchandisingProvider>
  );

  assert.ok(!htmlDuringDraft.includes('Flash Spring Deals'), 'Public storefront must NOT leak draft collection title');
  assert.ok(!htmlDuringDraft.includes('/images/flash-deals.webp'), 'Public storefront must NOT leak draft image');
  assert.ok(!htmlDuringDraft.includes('Imperial Nikkah Hampers'), 'Public storefront must NOT leak draft occasion title');

  // Step 4: Admin publishes draft to live
  const publishResult = await publishAdminMerchandising({
    db,
    actorUid: 'admin-lead-789',
    body: {
      expectedDraftRevision: savedDraft.revision,
      expectedLiveRevision: bundle.liveRevision,
    },
  });
  assert.equal(publishResult.liveRevision, bundle.liveRevision + 1);

  // Step 5: Public fetch after publish
  const publicAfterPublish = await getPublicMerchandising(db);
  assert.equal(publicAfterPublish.autoplay?.intervalMs, 8888);
  assert.equal(publicAfterPublish.collections[0].title_en, 'Flash Spring Deals');

  // Step 6: Storefront re-rendered with refreshed published settings
  const htmlRefreshed = renderWithProviders(
    <MerchandisingProvider initialSettings={publicAfterPublish}>
      <HomePage />
    </MerchandisingProvider>
  );

  // A. Collection changes
  assert.ok(htmlRefreshed.includes('Flash Spring Deals'), 'Published collection title must be rendered on homepage');
  assert.ok(htmlRefreshed.includes('/images/flash-deals.webp'), 'Published custom image must be rendered on homepage');
  assert.ok(htmlRefreshed.includes('href="/shop/deals?promo=flash-spring"'), 'Published custom destination must be rendered');
  assert.ok(!htmlRefreshed.includes('href="/shop/combos"'), 'Hidden collection must NOT be rendered on homepage');

  // B. Collection ordering
  const pantrySection = htmlRefreshed.slice(htmlRefreshed.indexOf('id="allbarka-pantry"'));
  const dealsPos = pantrySection.indexOf('Flash Spring Deals');
  const oilsPos = pantrySection.indexOf('href="/shop/oils"');
  assert.ok(dealsPos !== -1 && oilsPos !== -1 && dealsPos < oilsPos, 'Published collection order must be reflected on homepage');

  // C. Occasion changes
  assert.ok(htmlRefreshed.includes('Imperial Nikkah Hampers'), 'Custom merchant occasion title must be rendered on homepage');
  assert.ok(
    htmlRefreshed.includes('/shop/celebration-boxes?occasion=wedding&amp;tier=imperial') ||
    htmlRefreshed.includes('/shop/celebration-boxes?occasion=wedding&tier=imperial'),
    'Custom occasion route must be rendered'
  );
  assert.ok(!htmlRefreshed.includes('occasion=umrah'), 'Hidden occasion must NOT be rendered on homepage');
});
