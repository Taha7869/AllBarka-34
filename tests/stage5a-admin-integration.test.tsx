import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import path from 'node:path';
import { once } from 'node:events';
import { type AddressInfo } from 'node:net';
import express from 'express';
import { chromium } from 'playwright-core';
import {
  getPublicMerchandising,
  getAdminMerchandisingBundle,
  updateAdminMerchandising,
  publishAdminMerchandising,
  MERCHANDISING_COLLECTION,
} from '../src/lib/catalogStore';
import { createCatalogRouter } from '../src/lib/catalogRouter';
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

test('2b. CategoryCarousel alias normalization and deterministic conflict handling: nuts/dry-fruits and snacks-seeds/seeds-snacks', async () => {
  // Case A: Hidden legacy 'nuts' in collections must hide the dry-fruits card completely (cannot resurrect via equivalent ID)
  const settingsNutsHidden: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    collections: [
      { collectionId: 'nuts', visible: false, title_en: 'Hidden Nuts' },
    ] as any,
  };
  const htmlNutsHidden = renderWithProviders(<CategoryCarousel settings={settingsNutsHidden} />);
  assert.ok(!htmlNutsHidden.includes('href="/shop/dry-fruits"'), 'Hidden legacy nuts must NOT allow dry-fruits card to appear');
  assert.ok(!htmlNutsHidden.includes('href="/shop/nuts"'), 'Hidden legacy nuts must NOT allow nuts card to appear');
  assert.ok(!htmlNutsHidden.includes('Hidden Nuts'), 'Hidden legacy nuts title must NOT appear');

  // Case B: Hidden canonical 'dry-fruits' in collections must hide dry-fruits completely
  const settingsDryFruitsHidden: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    collections: [
      { collectionId: 'dry-fruits', visible: false, title_en: 'Hidden Dry Fruits' },
    ] as any,
  };
  const htmlDryFruitsHidden = renderWithProviders(<CategoryCarousel settings={settingsDryFruitsHidden} />);
  assert.ok(!htmlDryFruitsHidden.includes('href="/shop/dry-fruits"'), 'Hidden dry-fruits must NOT appear');
  assert.ok(!htmlDryFruitsHidden.includes('href="/shop/nuts"'), 'Hidden dry-fruits must NOT appear');

  // Case C: Conflicting entries: one visible and one hidden -> hidden takes precedence deterministically
  const settingsConflictNuts: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    collections: [
      { collectionId: 'nuts', visible: false },
      { collectionId: 'dry-fruits', visible: true, title_en: 'Visible Dry Fruits' },
    ] as any,
  };
  const htmlConflictNuts = renderWithProviders(<CategoryCarousel settings={settingsConflictNuts} />);
  assert.ok(!htmlConflictNuts.includes('href="/shop/dry-fruits"'), 'Conflicting alias entries: hidden nuts must prevent dry-fruits from reappearing');
  assert.ok(!htmlConflictNuts.includes('Visible Dry Fruits'), 'Conflicting visible title must NOT appear when equivalent alias is hidden');

  // Case D: CategoryVisibility { nuts: false } or { 'dry-fruits': false }
  const settingsVisNutsHidden: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    categoryVisibility: { nuts: false },
  };
  const htmlVisNutsHidden = renderWithProviders(<CategoryCarousel settings={settingsVisNutsHidden} />);
  assert.ok(!htmlVisNutsHidden.includes('href="/shop/dry-fruits"'), 'categoryVisibility.nuts = false must hide dry-fruits');

  const settingsVisDfHidden: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    categoryVisibility: { 'dry-fruits': false },
  };
  const htmlVisDfHidden = renderWithProviders(<CategoryCarousel settings={settingsVisDfHidden} />);
  assert.ok(!htmlVisDfHidden.includes('href="/shop/dry-fruits"'), 'categoryVisibility["dry-fruits"] = false must hide dry-fruits');

  // Case E: Saved title/image/link overrides on 'nuts' rendered once on dry-fruits
  const settingsNutsOverride: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    collections: [
      {
        collectionId: 'nuts',
        title_en: 'Royal Dry Fruits & Nuts',
        image: '/images/nuts-royal.webp',
        slug: '/shop/dry-fruits?promo=royal',
        visible: true,
      },
    ] as any,
  };
  const htmlNutsOverride = renderWithProviders(<CategoryCarousel settings={settingsNutsOverride} />);
  assert.ok(
    htmlNutsOverride.includes('Royal Dry Fruits &amp; Nuts') || htmlNutsOverride.includes('Royal Dry Fruits & Nuts'),
    'Saved title on nuts must be rendered'
  );
  assert.ok(htmlNutsOverride.includes('/images/nuts-royal.webp'), 'Saved image on nuts must be rendered');
  assert.ok(htmlNutsOverride.includes('href="/shop/dry-fruits?promo=royal"'), 'Saved slug on nuts must be rendered');
  // Must render exactly once (no duplicate card)
  const matchesRoyal = htmlNutsOverride.match(/href="\/shop\/dry-fruits\?promo=royal"/g);
  assert.equal(matchesRoyal?.length, 1, 'Only one card must be rendered for nuts/dry-fruits');

  // Case F: Hidden legacy 'snacks-seeds' in collections
  const settingsSnacksHidden: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    collections: [
      { collectionId: 'snacks-seeds', visible: false, title_en: 'Hidden Snacks' },
    ] as any,
  };
  const htmlSnacksHidden = renderWithProviders(<CategoryCarousel settings={settingsSnacksHidden} />);
  assert.ok(!htmlSnacksHidden.includes('href="/shop/seeds-snacks"'), 'Hidden legacy snacks-seeds must NOT allow seeds-snacks card to appear');
  assert.ok(!htmlSnacksHidden.includes('href="/shop/snacks-seeds"'), 'Hidden legacy snacks-seeds must NOT appear');

  // Case G: Hidden canonical 'seeds-snacks' in collections
  const settingsSeedsHidden: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    collections: [
      { collectionId: 'seeds-snacks', visible: false },
    ] as any,
  };
  const htmlSeedsHidden = renderWithProviders(<CategoryCarousel settings={settingsSeedsHidden} />);
  assert.ok(!htmlSeedsHidden.includes('href="/shop/seeds-snacks"'), 'Hidden seeds-snacks must NOT appear');

  // Case H: Conflicting snacks-seeds and seeds-snacks
  const settingsConflictSnacks: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    collections: [
      { collectionId: 'snacks-seeds', visible: true, title_en: 'Visible Snacks' },
      { collectionId: 'seeds-snacks', visible: false },
    ] as any,
  };
  const htmlConflictSnacks = renderWithProviders(<CategoryCarousel settings={settingsConflictSnacks} />);
  assert.ok(!htmlConflictSnacks.includes('href="/shop/seeds-snacks"'), 'Conflicting snacks-seeds: hidden must take precedence');
  assert.ok(!htmlConflictSnacks.includes('Visible Snacks'), 'Visible title must not leak when alias is hidden');

  // Case I: CategoryVisibility for snacks-seeds
  const settingsVisSnacksHidden: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    categoryVisibility: { 'snacks-seeds': false },
  };
  const htmlVisSnacksHidden = renderWithProviders(<CategoryCarousel settings={settingsVisSnacksHidden} />);
  assert.ok(!htmlVisSnacksHidden.includes('href="/shop/seeds-snacks"'), 'categoryVisibility["snacks-seeds"] = false must hide seeds-snacks');

  // Case J: Saved title/image/link overrides on 'snacks-seeds'
  const settingsSnacksOverride: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    collections: [
      {
        collectionId: 'snacks-seeds',
        title_en: 'Artisan Seeds & Superfoods',
        image: '/images/seeds-artisan.webp',
        slug: '/shop/seeds-snacks?artisan=true',
        visible: true,
      },
    ] as any,
  };
  const htmlSnacksOverride = renderWithProviders(<CategoryCarousel settings={settingsSnacksOverride} />);
  assert.ok(
    htmlSnacksOverride.includes('Artisan Seeds &amp; Superfoods') || htmlSnacksOverride.includes('Artisan Seeds & Superfoods'),
    'Saved title on snacks-seeds must be rendered'
  );
  assert.ok(htmlSnacksOverride.includes('/images/seeds-artisan.webp'), 'Saved image on snacks-seeds must be rendered');
  assert.ok(htmlSnacksOverride.includes('href="/shop/seeds-snacks?artisan=true"'), 'Saved link on snacks-seeds must be rendered');

  // Case K: Ordering normalization with legacy alias IDs in categoryOrder
  const settingsOrderLegacy: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    categoryOrder: ['snacks-seeds', 'nuts', 'oils'],
  };
  const htmlOrderLegacy = renderWithProviders(<CategoryCarousel settings={settingsOrderLegacy} />);
  const seedsPos = htmlOrderLegacy.indexOf('href="/shop/seeds-snacks"');
  const nutsPos = htmlOrderLegacy.indexOf('href="/shop/dry-fruits"');
  const oilsPos = htmlOrderLegacy.indexOf('href="/shop/oils"');
  assert.ok(seedsPos !== -1 && nutsPos !== -1 && oilsPos !== -1, 'All ordered cards must be present');
  assert.ok(seedsPos < nutsPos && nutsPos < oilsPos, 'categoryOrder with legacy IDs must order slides deterministically');

  // Case L: Distinct commercial collections (celebration-boxes, deals, combos) remain distinct
  const settingsCommercial: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    collections: [
      { collectionId: 'celebration-boxes', title_en: 'Festive Celebration Chests', visible: true },
      { collectionId: 'deals', title_en: 'Super Deals Hub', visible: true },
    ] as any,
  };
  const htmlCommercial = renderWithProviders(<CategoryCarousel settings={settingsCommercial} />);
  assert.ok(htmlCommercial.includes('Festive Celebration Chests'), 'Celebration boxes distinct collection rendered');
  assert.ok(htmlCommercial.includes('Super Deals Hub'), 'Deals distinct collection rendered');
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

test('6. Service/SSR integrated flow: admin save -> preview isolation -> publish -> public fetch -> storefront render (SSR with initialSettings)', async () => {
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

test('7. Browser/client-mounted provider-fetch verification with real local HTTP routes: admin draft save -> public draft isolation -> publish -> MerchandisingProvider HTTP fetch/refresh -> rendered homepage', async () => {
  const { db } = createMockFirestore();

  // Create isolated Express app mounting real catalogRouter with mock db
  const app = express();
  app.use(express.json());
  app.use(createCatalogRouter({ getDb: () => db, requireAdmin: (_req, _res, next) => next() }));
  const distDir = path.resolve('dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;

  let browser: any = null;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() =>
      chromium.launch({ channel: 'msedge', headless: true })
    );
    const page = await browser.newPage();

    // Step 1: Initial client mount — NO initialSettings or direct settings injected
    // Browser client loads real bundle, mounts <MerchandisingProvider>, fetches GET /api/merchandising
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('#boutique-selections');
    await page.waitForSelector('#allbarka-pantry');
    await page.waitForSelector('#gift-for-occasion');

    // Verify initial public state in browser (matches DEFAULT_MERCHANDISING)
    const initialDealsCount = await page.locator('text="Mega Spring Flash Deals"').count();
    assert.equal(initialDealsCount, 0, 'Initial storefront must NOT contain unconfigured flash deals');
    const initialNikkahCount = await page.locator('text="Royal Grand Nikkah Hampers"').count();
    assert.equal(initialNikkahCount, 0, 'Initial storefront must NOT contain custom grand nikkah hampers');

    // Step 2: Admin draft save
    const bundle = await getAdminMerchandisingBundle(db);
    const draftUpdate = {
      ...DEFAULT_MERCHANDISING,
      expectedRevision: bundle.draftRevision,
      categoryOrder: ['deals', 'dry-fruits', 'oils'],
      categoryVisibility: {
        deals: true,
        'dry-fruits': true,
        oils: true,
        combos: false, // Hidden collection
      },
      collections: [
        {
          collectionId: 'deals',
          title_en: 'Mega Spring Flash Deals',
          title_ur: 'بہار کی زبردست ڈیلز',
          slug: '/shop/deals?promo=spring-mega',
          image: '/assets/categories/deals.png',
          visible: true,
          badge: 'Flash Deal',
        },
        {
          collectionId: 'combos',
          title_en: 'Curated Combos',
          title_ur: 'منتخب بنڈلز',
          slug: '/shop/combos',
          visible: false,
        },
      ],
      occasions: [
        {
          tag: 'wedding',
          title_en: 'Royal Grand Nikkah Hampers',
          title_ur: 'شاہی نکاح ہیمپرز',
          slug: '/shop/celebration-boxes?occasion=wedding&tier=royal',
          visible: true,
        },
        {
          tag: 'umrah',
          title_en: 'Umrah & Hajj',
          title_ur: 'عمرہ و حج',
          slug: '/shop/celebration-boxes?occasion=umrah',
          visible: false,
        },
      ],
      autoplay: { enabled: true, intervalMs: 8888, resumeDelayMs: 4444 },
      adminNotes: 'Spring 2026 Live Campaign',
    };

    const savedDraft = await updateAdminMerchandising({
      db,
      body: draftUpdate,
      actorUid: 'admin-lead-789',
    });
    assert.equal(savedDraft.revision, bundle.draftRevision + 1);

    // Step 3: Public Draft Isolation
    // MerchandisingProvider refresh must NOT receive draft changes
    await page.evaluate(async () => {
      if (typeof (window as any).__refreshMerchandising === 'function') {
        await (window as any).__refreshMerchandising();
      }
    });

    const leakCollectionCount = await page.locator('text="Mega Spring Flash Deals"').count();
    assert.equal(leakCollectionCount, 0, 'Storefront must NOT leak draft collection title before publish');
    const leakOccasionCount = await page.locator('text="Royal Grand Nikkah Hampers"').count();
    assert.equal(leakOccasionCount, 0, 'Storefront must NOT leak draft occasion title before publish');

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

    // Step 5: MerchandisingProvider HTTP fetch / refresh
    // First trigger real in-place refresh via provider callback
    await page.evaluate(async () => {
      if (typeof (window as any).__refreshMerchandising === 'function') {
        await (window as any).__refreshMerchandising();
      }
    });

    // Also reload page to test clean client mount fetching GET /api/merchandising
    await page.reload();
    await page.waitForSelector('#boutique-selections');
    await page.waitForSelector('#allbarka-pantry');
    await page.waitForSelector('#gift-for-occasion');

    // Step 6: Assert rendered homepage changes after real HTTP refresh
    // A. Collection title
    await page.locator('text="Mega Spring Flash Deals"').first().waitFor({ state: 'attached' });
    const publishedTitleCount = await page.locator('text="Mega Spring Flash Deals"').count();
    assert.ok(publishedTitleCount > 0, 'Published collection title must be rendered in browser after refresh');

    // B. Collection image
    const customImgCount = await page.locator('img[src="/assets/categories/deals.png"]').count();
    assert.ok(customImgCount > 0, 'Published custom image must be rendered in browser after refresh');

    // C. Collection destination link
    const customLinkCount = await page.locator('a[href="/shop/deals?promo=spring-mega"]').count();
    assert.ok(customLinkCount > 0, 'Published custom destination link must be rendered in browser after refresh');

    // D. Hidden collection must NOT be rendered
    const hiddenCombosCount = await page.locator('#allbarka-pantry a[href="/shop/combos"]').count();
    assert.equal(hiddenCombosCount, 0, 'Hidden collection combos must NOT be rendered in browser');

    // E. Collection ordering
    const orderCheck = await page.evaluate(() => {
      const pantry = document.getElementById('allbarka-pantry');
      if (!pantry) return { dealsPos: -1, oilsPos: -1 };
      const html = pantry.innerHTML;
      return {
        dealsPos: html.indexOf('Mega Spring Flash Deals'),
        oilsPos: html.indexOf('href="/shop/oils"'),
      };
    });
    assert.ok(
      orderCheck.dealsPos !== -1 && orderCheck.oilsPos !== -1 && orderCheck.dealsPos < orderCheck.oilsPos,
      'Deals must appear before Oils according to published categoryOrder in browser'
    );

    // F. Custom occasion title
    const customOccasionTitleCount = await page.locator('text="Royal Grand Nikkah Hampers"').count();
    assert.ok(customOccasionTitleCount > 0, 'Custom merchant occasion title must be rendered in browser after refresh');

    // G. Custom occasion destination link
    const customOccasionLink = await page.locator('#gift-for-occasion a[href*="tier=royal"]').count();
    assert.ok(customOccasionLink > 0, 'Custom occasion destination link must be rendered in browser after refresh');

    // H. Hidden occasion must NOT be rendered
    const hiddenOccasionCount = await page.locator('#gift-for-occasion a[href*="occasion=umrah"]').count();
    assert.equal(hiddenOccasionCount, 0, 'Hidden occasion umrah must NOT be rendered in browser after refresh');

    // I. Autoplay settings applied to DOM
    const appliedInterval = await page.getAttribute('#boutique-selections', 'data-interval');
    assert.equal(appliedInterval, '8888', 'Published autoplay intervalMs must be applied to DOM after refresh');
    const appliedResumeDelay = await page.getAttribute('#boutique-selections', 'data-resume-delay');
    assert.equal(appliedResumeDelay, '4444', 'Published autoplay resumeDelayMs must be applied to DOM after refresh');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
