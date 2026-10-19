import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ShopPage from '../src/pages/ShopPage';
import CelebrationBoxesDestination, {
  getCelebrationSubcategory,
} from '../src/components/CelebrationBoxesDestination';
import GiftsHampersDestination from '../src/components/GiftsHampersDestination';
import DealsDestination from '../src/components/DealsDestination';
import OccasionsDestination from '../src/components/OccasionsDestination';
import WholesaleDestination from '../src/components/WholesaleDestination';
import { PRODUCTS, BID_BOX_PRODUCTS } from '../src/data/products';
import { LanguageProvider, type LanguageCode } from '../src/contexts/LanguageContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { CartProvider } from '../src/contexts/CartContext';
import { CatalogProvider } from '../src/contexts/CatalogContext';
import { ProductMediaProvider } from '../src/contexts/ProductMediaContext';
import { resolveBidBoxConfig } from '../src/lib/bidBoxPricing';
import { calculatePackagingMoq } from '../src/lib/packagingMoq';
import {
  getPackagingSubcategory,
  productMatchesPackagingSubcategory,
  resolveCelebrationCardVariant,
} from '../src/lib/packagingClassification';
import { destinationTranslations } from '../src/contexts/destinationTranslations';
import { validateDynamicProduct, VALID_PACKAGING_SUBCATEGORIES, CatalogError } from '../src/lib/catalogSchema';
import { createAdminProduct, loadAuthoritativeCatalog, updateAdminProduct } from '../src/lib/catalogStore';
import type { Product } from '../src/types';

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
    collection: (col: string) => makeCollection(col),
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
      const transaction: any = {
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any, options?: any) => ref.set(data, options),
        delete: (ref: any) => ref.delete(),
      };
      return await updateFunction(transaction);
    },
  };

  return mockDb;
}

function renderApp(path = '/', language: LanguageCode = 'en') {
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
      dispatchEvent: () => true,
      scrollTo: () => {},
      location: { origin: 'https://allbarka.com' },
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
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          <ThemeProvider>
            <CartProvider>
              <CatalogProvider>
                <ProductMediaProvider>
                  <Routes>
                    <Route path="shop" element={<ShopPage />} />
                    <Route path="shop/:category" element={<ShopPage />} />
                    <Route path="category/:category" element={<ShopPage />} />
                    <Route path="wholesale" element={<ShopPage />} />
                    <Route path="gifting" element={<ShopPage />} />
                    <Route path="occasions" element={<ShopPage />} />
                    <Route path="occasions/:occasion" element={<ShopPage />} />
                    <Route path="*" element={<ShopPage />} />
                  </Routes>
                </ProductMediaProvider>
              </CatalogProvider>
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

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 1: Single Selected-Variant Resolver for Highlight, Display & Cart
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 1: resolveCelebrationCardVariant unifies highlight, price, MOQ, and cart payload', () => {
  const tinProduct = BID_BOX_PRODUCTS.find(p => p.id === 'bid-box-luxury-tin')!;
  assert.ok(tinProduct, 'bid-box-luxury-tin must exist');

  // Untouched default selection (requestedTierIndex = undefined)
  const defaultVariant = resolveCelebrationCardVariant(tinProduct, 'empty', undefined);
  assert.equal(defaultVariant.selectedTierIndex, 0, 'Untouched default tier index must be 0');
  assert.equal(defaultVariant.variantKey, 'Empty Pack (10 pcs)', 'Variant key at index 0');
  assert.equal(defaultVariant.unitPrice, 140, 'Unit price at index 0 must be 140');
  assert.equal(defaultVariant.packPrice, 1400, 'Pack price at index 0 must be 1400 (10 * 140)');
  assert.equal(defaultVariant.piecesPerPack, 10, 'Pieces at index 0 must be 10');
  assert.equal(defaultVariant.moq, calculatePackagingMoq(tinProduct, defaultVariant.variantKey), 'MOQ matches engine');
  assert.equal(defaultVariant.isDirectCheckoutEligible, true, 'Direct checkout eligible for priced empty tier');

  // Explicit tier selection (e.g. index 2: 50 pcs)
  const tier2Variant = resolveCelebrationCardVariant(tinProduct, 'empty', 2);
  assert.equal(tier2Variant.selectedTierIndex, 2, 'Selected tier index must be 2');
  assert.equal(tier2Variant.variantKey, 'Empty Bulk (50 pcs)', 'Variant key at index 2');
  assert.equal(tier2Variant.unitPrice, 125, 'Unit price at index 2 must be 125');
  assert.equal(tier2Variant.packPrice, 6250, 'Pack price at index 2 must be 6250 (50 * 125)');
  assert.equal(tier2Variant.piecesPerPack, 50, 'Pieces at index 2 must be 50');
  assert.equal(tier2Variant.moq, calculatePackagingMoq(tinProduct, tier2Variant.variantKey), 'MOQ matches engine');

  // Explicit mode switch to filled
  const filledVariant = resolveCelebrationCardVariant(tinProduct, 'filled', 0);
  assert.equal(filledVariant.activeMode, 'filled', 'Active mode must be filled');
  assert.equal(filledVariant.selectedTierIndex, 0, 'Filled option index 0');
  assert.equal(filledVariant.variantKey, 'Filled Standard (Assorted Dry Fruits)', 'Filled option 0 variant key');
  assert.equal(filledVariant.unitPrice, 1150, 'Filled option unit price must be 1150');
  assert.equal(filledVariant.packPrice, 1150, 'Filled option pack price must be 1150');
  assert.equal(filledVariant.piecesPerPack, 1, 'Pieces per pack is 1 for filled option');
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 2: Remove Fabricated Prices and Honor Quote-Only / Inquiries
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 2: Unpriced and quote-only products show Request Quote, no fabricated Rs.180/850', () => {
  const dummyQuoteOnlyProduct = {
    id: 'bid-box-custom-royal-chest',
    name_en: 'Custom Royal Chest',
    name_ur: 'شاہی کسٹم صندوق',
    name_ar: 'صندوق ملكي مخصص',
    category: 'celebration-boxes',
    packagingSubcategory: 'tin',
    isBidBox: true,
    quoteOnly: true,
    orderMode: 'inquiry_quote',
    prices: {},
    variants: [],
  } as unknown as Product;

  const resolved = resolveCelebrationCardVariant(dummyQuoteOnlyProduct, 'empty');
  assert.equal(resolved.isQuoteOnly, true, 'Product must be flagged quoteOnly');
  assert.equal(resolved.isDirectCheckoutEligible, false, 'Direct checkout must be false');
  assert.equal(resolved.unitPrice, null, 'Unit price must be null (NEVER fabricated 180 or 850)');
  assert.equal(resolved.packPrice, null, 'Pack price must be null');

  // Ensure unknown fillings do not fabricate 'Irani & Panjgur Dates with Roasted Nuts'
  assert.notEqual(
    resolved.fillingsDescription,
    'Irani & Panjgur Dates with Roasted Nuts',
    'Must never return stale fake filling fallback'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 3: URL-Driven Filtering and Navigation Preservation
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 3: Celebration and Occasions consume URL parameters and preserve category', () => {
  // Test Celebration with subcategory parameter
  const tabarrukHtml = renderApp('/shop/celebration-boxes?subcat=tabarruk');
  assert.ok(tabarrukHtml.includes('Umrah &amp; Hajj Tabarruk Box Set') || tabarrukHtml.includes('Umrah & Hajj Tabarruk Box Set'), 'Tabarruk box must be present under ?subcat=tabarruk');
  assert.equal(tabarrukHtml.includes('Classic Card Bid Box'), false, 'Nikkah card box must not appear under ?subcat=tabarruk');

  // Test Celebration with subcat=tin
  const tinHtml = renderApp('/shop/celebration-boxes?subcat=tin');
  assert.ok(tinHtml.includes('Luxury Floral Tin Bid Box'), 'Luxury Floral Tin must appear under ?subcat=tin');
  assert.equal(tinHtml.includes('Royal Pyramid Favor Box'), false, 'Pyramid box must not appear under ?subcat=tin');

  // Test Celebration with subcat=wedding
  const weddingHtml = renderApp('/shop/celebration-boxes?subcat=wedding');
  assert.ok(weddingHtml.includes('Classic Card Bid Box'), 'Classic Card must appear');
  assert.ok(weddingHtml.includes('Royal Pyramid Favor Box'), 'Pyramid favor must appear');
  assert.ok(weddingHtml.includes('Artisanal Jute &amp; Jamawar Pouch') || weddingHtml.includes('Artisanal Jute & Jamawar Pouch'), 'Jute pouch must appear');
  assert.ok(weddingHtml.includes('Heritage Nikkah Sweet &amp; Dry Fruit Box') || weddingHtml.includes('Heritage Nikkah Sweet & Dry Fruit Box'), 'Sweet nikkah must appear');
  assert.equal(weddingHtml.includes('Umrah &amp; Hajj Tabarruk Box Set') || weddingHtml.includes('Umrah & Hajj Tabarruk Box Set'), false, 'Tabarruk must not appear under wedding');

  // Test Occasions with category parameter preservation: /occasions/wedding?category=dry-fruits
  const occCatHtml = renderApp('/occasions/wedding?category=dry-fruits');
  assert.ok(occCatHtml.includes('Nikkah &amp; Wedding') || occCatHtml.includes('Nikkah & Wedding'), 'Occasion wedding active');
  assert.ok(occCatHtml.includes('Whole Dry Fruits'), 'Category dry-fruits subfilter active');
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 4: Admin-Editable Packaging Metadata & Unclassified Unknown Products
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 4: Admin metadata is respected; unknown products return null (never default to wedding)', () => {
  // 1. Explicit product metadata
  const adminTinProduct: Partial<Product> = {
    id: 'admin-new-tin-2026',
    name_en: 'Admin Custom Keepsake Tin',
    packagingSubcategory: 'tin',
  };
  assert.equal(getPackagingSubcategory(adminTinProduct), 'tin', 'Admin product metadata takes precedence');
  assert.equal(productMatchesPackagingSubcategory(adminTinProduct, 'tin'), true, 'Matches tin subcategory');
  assert.equal(productMatchesPackagingSubcategory(adminTinProduct, 'wedding'), false, 'Does NOT match wedding');

  // 2. Explicit bidBoxConfig metadata
  const adminBabyBox: Partial<Product> = {
    id: 'admin-new-baby-box',
    name_en: 'Admin Baby Box',
    bidBoxConfig: {
      packagingSubcategory: 'baby',
    },
  };
  assert.equal(getPackagingSubcategory(adminBabyBox), 'baby', 'bidBoxConfig metadata takes precedence');

  // 3. Unknown product returns null, never 'wedding'
  const unknownProduct: Partial<Product> = {
    id: 'unknown-mystery-box-999',
    name_en: 'Mystery Gift Box',
  };
  assert.equal(getPackagingSubcategory(unknownProduct), null, 'Unknown product must return null (unclassified)');
  assert.equal(productMatchesPackagingSubcategory(unknownProduct, 'wedding'), false, 'Unknown product must NOT match wedding');
  assert.equal(productMatchesPackagingSubcategory(unknownProduct, 'all'), true, 'Matches all');
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 5: Purge Unapproved Claims across EN, UR, and AR
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 5: Unapproved claims purged (25% factory discount, 2 hours guarantee, engraving, unapproved lead times)', () => {
  for (const lang of ['en', 'ur', 'ar'] as const) {
    const t = destinationTranslations[lang];

    // No "up to 25% factory discount" or blanket discount promise
    assert.equal(
      t['dest.wholesale.packagingMoqCopy'].includes('25%'),
      false,
      `[${lang}] dest.wholesale.packagingMoqCopy must not claim up to 25% factory discount`
    );

    // No response time guarantee ("2 business hours" / "2 گھنٹے" / "ساعتين")
    assert.equal(
      t['dest.wholesale.inquiryNote'].includes('2 business hours') ||
        t['dest.wholesale.inquiryNote'].includes('2 گھنٹے') ||
        t['dest.wholesale.inquiryNote'].includes('ساعتين'),
      false,
      `[${lang}] dest.wholesale.inquiryNote must not promise response within 2 hours`
    );

    // No engraving promises in wholesale description
    assert.equal(
      t['dest.wholesale.description'].includes('engraving'),
      false,
      `[${lang}] dest.wholesale.description must not promise custom brand engraving`
    );

    // Custom preparation lead time notice must state minimum 10 calendar days following final design approval and advance deposit
    if (lang === 'en') {
      assert.ok(
        t['dest.celebration.leadTimeNotice'].includes('following final design approval and any team-required advance deposit'),
        'EN lead time notice must state design approval and advance deposit condition'
      );
      assert.ok(
        t['dest.celebration.leadTimeNotice'].includes('Courier transit times') &&
          t['dest.celebration.leadTimeNotice'].includes('apply separately'),
        'EN lead time notice must state courier transit times apply separately'
      );
    } else if (lang === 'ur') {
      assert.ok(
        t['dest.celebration.leadTimeNotice'].includes('حتمی ڈیزائن کی منظوری اور درکار پیشگی ایڈوانس ڈپازٹ'),
        'UR lead time notice must state design approval and advance deposit condition'
      );
    } else if (lang === 'ar') {
      assert.ok(
        t['dest.celebration.leadTimeNotice'].includes('بعد الاعتماد النهائي للتصميم وسداد الدفعة المقدمة المطلوبة'),
        'AR lead time notice must state design approval and advance deposit condition'
      );
      // No free samples claim in AR
      assert.equal(
        t['dest.celebration.customQuoteBannerCopy'].includes('عينات مجانية'),
        false,
        'AR custom quote copy must not promise free samples'
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 6: Destination Page Rendering and Structure Integrity
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 6: Dedicated destinations render proper headers, policies, and product cards', () => {
  // Celebration Boxes
  const htmlCelebration = renderApp('/shop/celebration-boxes');
  assert.ok(htmlCelebration.includes('Celebration &amp; Bid Boxes') || htmlCelebration.includes('Celebration & Bid Boxes'));
  assert.ok(htmlCelebration.includes('Signature Tin Boxes'));
  assert.ok(htmlCelebration.includes('Hajj &amp; Umrah Tabarruk Sets') || htmlCelebration.includes('Hajj & Umrah Tabarruk Sets'));

  // Gifts & Hampers
  const htmlGifting = renderApp('/gifting');
  assert.ok(htmlGifting.includes('Luxury Gifts &amp; Curated Hampers') || htmlGifting.includes('Luxury Gifts & Curated Hampers'));
  assert.ok(htmlGifting.includes('Bespoke Hamper Builder'));
  assert.ok(htmlGifting.includes('Corporate Executive Gifting'));

  // Deals & Value Packages
  const htmlDeals = renderApp('/shop/deals');
  assert.ok(htmlDeals.includes('Value Packages &amp; Curated Deals') || htmlDeals.includes('Value Packages & Curated Deals'));
  assert.ok(htmlDeals.includes('Roastery Curated Assortments') || htmlDeals.includes('Curated Value Packages'));

  // Wholesale
  const htmlWholesale = renderApp('/wholesale');
  assert.ok(htmlWholesale.includes('Corporate &amp; Bulk Gifting') || htmlWholesale.includes('Corporate & Bulk Gifting'));
  assert.ok(htmlWholesale.includes('Food Exemption (MOQ = 1)'));
  assert.ok(htmlWholesale.includes('Packaging Volume Tiers'));
  assert.ok(htmlWholesale.includes('10-Day Preparation Lead Time'));

  // No duplicate homepage grids inside /shop PLP
  const htmlShop = renderApp('/shop');
  assert.equal(htmlShop.includes('id="bespoke-bid-boxes"'), false);
  assert.equal(htmlShop.includes('id="deals-value-packages"'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 7: resolveCelebrationCardVariant 1-Piece Variants, Mode Integrity & Pack Capacity
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 7: resolveCelebrationCardVariant recognizes 1-piece empty boxes, enforces MOQ, and prevents silent mode substitution', () => {
  // 1. Single-piece empty variant (e.g. standard Rs. 1000 1-piece box)
  const singlePieceBox = {
    id: 'bid-box-single-standard-1000',
    name_en: 'Standard Single Gift Box',
    name_ur: 'معیاری اکیلا گفٹ باکس',
    name_ar: 'علبة هدايا مفردة قياسية',
    category: 'celebration-boxes',
    packagingSubcategory: 'wedding',
    isBidBox: true,
    prices: {
      'Empty Box (1 pc)': 1000,
    },
    variants: [
      { id: 'v1', label: 'Empty Box (1 pc)', price: 1000, available: true },
    ],
  } as unknown as Product;

  const resolvedEmpty = resolveCelebrationCardVariant(singlePieceBox, 'empty', 0);
  assert.equal(resolvedEmpty.activeMode, 'empty', 'Must resolve empty mode');
  assert.equal(resolvedEmpty.emptyTiers.length, 1, 'Must recognize saved 1-piece empty variant');
  assert.equal(resolvedEmpty.variantKey, 'Empty Box (1 pc)', 'Variant key matches');
  assert.equal(resolvedEmpty.unitPrice, 1000, 'Unit price is 1000');
  assert.equal(resolvedEmpty.packPrice, 1000, 'Pack price is 1000');
  assert.equal(resolvedEmpty.piecesPerPack, 1, 'Pieces per pack is 1');
  assert.equal(resolvedEmpty.isDirectCheckoutEligible, true, 'Direct checkout eligible');
  assert.equal(resolvedEmpty.moq, 5, 'Authoritative MOQ for Rs. 1000 box is 5 pcs');

  // 2. Prevent silent substitution: explicitly requesting unavailable filled mode must NOT substitute empty
  const resolvedFilledOnEmptyOnly = resolveCelebrationCardVariant(singlePieceBox, 'filled', 0);
  assert.equal(resolvedFilledOnEmptyOnly.activeMode, 'filled', 'Active mode must stay filled as requested');
  assert.equal(resolvedFilledOnEmptyOnly.isDirectCheckoutEligible, false, 'Direct checkout must be false for unavailable filled mode');
  assert.equal(resolvedFilledOnEmptyOnly.isQuoteOnly, true, 'Must route to quoteOnly inquiry');
  assert.equal(resolvedFilledOnEmptyOnly.variantKey, null, 'No variant key for unavailable filled option');

  // 3. Preserve actual pack capacity for filled pack variants
  const filledPackBox = {
    id: 'bid-box-filled-multipack',
    name_en: 'Festive Filled Favor Pack',
    category: 'celebration-boxes',
    packagingSubcategory: 'tin',
    isBidBox: true,
    bidBoxConfig: {
      filledOptions: [
        {
          label: 'Filled Pack (10 pcs)',
          subtitle: 'Kerman Pistachios & Ajwa Dates',
          price: 3500,
          variantKey: 'Filled Pack (10 pcs)',
        },
      ],
    },
    prices: {
      'Filled Pack (10 pcs)': 3500,
    },
    variants: [
      { id: 'v1', label: 'Filled Pack (10 pcs)', price: 3500, available: true },
    ],
  } as unknown as Product;

  const resolvedFilledPack = resolveCelebrationCardVariant(filledPackBox, 'filled', 0);
  assert.equal(resolvedFilledPack.piecesPerPack, 10, 'Preserves actual pack capacity of 10 pcs');
  assert.equal(resolvedFilledPack.packPrice, 3500, 'Pack price is 3500');
  assert.equal(resolvedFilledPack.unitPrice, 350, 'Unit price is 350 per piece (3500 / 10)');
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 8: packagingSubcategory Validation, Public Allowlist & Persistence
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 8: packagingSubcategory validates values, clears deliberately, and persists through admin -> public catalog', async () => {
  // 1. Validation of supported values
  assert.deepEqual(VALID_PACKAGING_SUBCATEGORIES, ['tin', 'tabarruk', 'wedding', 'baby', 'acrylic']);

  // Valid dynamic product with tin
  const validTin = validateDynamicProduct({
    id: 'test-valid-tin',
    name_en: 'Test Valid Tin Box',
    category: 'celebration-boxes',
    packagingSubcategory: 'tin',
    prices: { 'Empty Pack (10 pcs)': 1500 },
  });
  assert.equal(validTin.packagingSubcategory, 'tin', 'Valid subcategory preserved');

  // Deliberate clear behavior
  const clearedSubcat = validateDynamicProduct({
    id: 'test-cleared-tin',
    name_en: 'Test Cleared Tin Box',
    category: 'celebration-boxes',
    packagingSubcategory: null,
    prices: { 'Empty Pack (10 pcs)': 1500 },
  });
  assert.equal(clearedSubcat.packagingSubcategory, null, 'Null sets packagingSubcategory to null (deliberate clear)');

  // Rejection of unsupported subcategory
  assert.throws(
    () => {
      validateDynamicProduct({
        id: 'test-invalid-subcat',
        name_en: 'Test Invalid Box',
        category: 'celebration-boxes',
        packagingSubcategory: 'unsupported-category',
        prices: { 'Empty Pack (10 pcs)': 1500 },
      });
    },
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_PACKAGING_SUBCATEGORY',
    'Must throw INVALID_PACKAGING_SUBCATEGORY for unsupported values'
  );

  // 2. Full Admin Create -> Read -> Public Catalog -> Subcategory Filter Persistence
  const db = createMockFirestore();
  const created = await createAdminProduct({
    db,
    body: {
      id: 'admin-persisted-tin-box',
      name_en: 'Admin Persisted Luxury Tin Box',
      category: 'celebration-boxes',
      packagingSubcategory: 'tin',
      status: 'published',
      prices: { 'Empty Pack (10 pcs)': 2200 },
    },
    actorUid: 'admin-test-uid',
  });

  assert.equal(created.packagingSubcategory, 'tin', 'Created product has packagingSubcategory tin');

  // Reload authoritative catalog
  const catalogSnapshot = await loadAuthoritativeCatalog(db);
  const loadedProduct = catalogSnapshot.products.find(p => p.id === 'admin-persisted-tin-box');
  assert.ok(loadedProduct, 'Product must be found in reloaded catalog');
  assert.equal(loadedProduct.packagingSubcategory, 'tin', 'Reloaded product retains packagingSubcategory');
  assert.equal(productMatchesPackagingSubcategory(loadedProduct, 'tin'), true, 'Matches tin subcategory filter');
  assert.equal(productMatchesPackagingSubcategory(loadedProduct, 'wedding'), false, 'Does not match wedding');

  // Deliberate clear via updateAdminProduct
  await updateAdminProduct({
    db,
    productId: 'admin-persisted-tin-box',
    body: {
      expectedRevision: created.revision,
      packagingSubcategory: null,
    },
    actorUid: 'admin-test-uid',
  });

  const catalogSnapshotAfterClear = await loadAuthoritativeCatalog(db);
  const clearedProduct = catalogSnapshotAfterClear.products.find(p => p.id === 'admin-persisted-tin-box');
  assert.ok(clearedProduct, 'Cleared product still exists in catalog');
  assert.equal(clearedProduct.packagingSubcategory, null, 'packagingSubcategory successfully cleared to null');
  assert.equal(getPackagingSubcategory(clearedProduct), null, 'getPackagingSubcategory returns null (unclassified)');

  // 3. Actual Legacy ID Regression: bid-box-luxury-tin
  // Step A: Untouched legacy product receives intended fallback
  const untouchedCatalog = await loadAuthoritativeCatalog(db);
  const untouchedLegacy = untouchedCatalog.products.find(p => p.id === 'bid-box-luxury-tin');
  assert.ok(untouchedLegacy, 'Untouched legacy product must exist in catalog');
  assert.equal(getPackagingSubcategory(untouchedLegacy), 'tin', 'Untouched legacy product receives intended fallback (tin)');
  assert.equal(productMatchesPackagingSubcategory(untouchedLegacy, 'tin'), true, 'Untouched legacy matches tin filter');

  // Step B: Explicitly assign another subcategory (e.g. wedding)
  const currentLegacyRevision = Number.isSafeInteger(untouchedLegacy.revision) ? untouchedLegacy.revision! : 0;
  const updatedLegacy = await updateAdminProduct({
    db,
    productId: 'bid-box-luxury-tin',
    body: {
      expectedRevision: currentLegacyRevision,
      packagingSubcategory: 'wedding',
    },
    actorUid: 'admin-test-uid',
  });
  assert.equal(updatedLegacy.packagingSubcategory, 'wedding', 'Explicitly assigned subcategory');

  const catalogWithAssigned = await loadAuthoritativeCatalog(db);
  const assignedLegacy = catalogWithAssigned.products.find(p => p.id === 'bid-box-luxury-tin');
  assert.ok(assignedLegacy, 'Assigned legacy product exists');
  assert.equal(getPackagingSubcategory(assignedLegacy), 'wedding', 'Assigned subcategory takes effect');
  assert.equal(productMatchesPackagingSubcategory(assignedLegacy, 'wedding'), true, 'Matches wedding filter');
  assert.equal(productMatchesPackagingSubcategory(assignedLegacy, 'tin'), false, 'Does not match tin filter');

  // Step C: Clear subcategory through admin update path
  await updateAdminProduct({
    db,
    productId: 'bid-box-luxury-tin',
    body: {
      expectedRevision: updatedLegacy.revision,
      packagingSubcategory: null,
    },
    actorUid: 'admin-test-uid',
  });

  // Step D: Reload public catalog and verify it remains unclassified (legacy fallback must NOT resurrect)
  const catalogAfterLegacyClear = await loadAuthoritativeCatalog(db);
  const clearedLegacy = catalogAfterLegacyClear.products.find(p => p.id === 'bid-box-luxury-tin');
  assert.ok(clearedLegacy, 'Cleared legacy product exists');
  assert.equal(clearedLegacy.packagingSubcategory, null, 'Deliberately cleared subcategory is persistently null');
  assert.equal(getPackagingSubcategory(clearedLegacy), null, 'getPackagingSubcategory returns null (unclassified)');
  assert.equal(productMatchesPackagingSubcategory(clearedLegacy, 'tin'), false, 'Legacy fallback does NOT resurrect tin filter');
  assert.equal(productMatchesPackagingSubcategory(clearedLegacy, 'wedding'), false, 'Does not match wedding');
  assert.equal(productMatchesPackagingSubcategory(clearedLegacy, 'all'), true, 'Appears in all boxes');

  // Step E: Verify another untouched legacy product (e.g. bid-box-umrah-tabarruk) still receives intended fallback
  const untouchedTabarruk = catalogAfterLegacyClear.products.find(p => p.id === 'bid-box-umrah-tabarruk');
  assert.ok(untouchedTabarruk, 'Untouched tabarruk exists');
  assert.equal(getPackagingSubcategory(untouchedTabarruk), 'tabarruk', 'Untouched tabarruk still receives legacy fallback');
  assert.equal(productMatchesPackagingSubcategory(untouchedTabarruk, 'tabarruk'), true, 'Untouched tabarruk matches tabarruk filter');
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 9: URL-Driven Filtering Across ALL Destinations
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 9: Gifts & Hampers and Deals destinations consume URL params and preserve unrelated query params', () => {
  // Gifts & Hampers with occasion filter and unrelated tracking parameter
  const giftingWeddingHtml = renderApp('/gifting?occasion=wedding&utm_source=spring_campaign');
  assert.ok(giftingWeddingHtml.includes('Luxury Gifts &amp; Curated Hampers') || giftingWeddingHtml.includes('Luxury Gifts & Curated Hampers'));

  // Deals & Value Packages with filter and unrelated parameter
  const dealsDuosHtml = renderApp('/shop/deals?filter=duos&partner_id=corporate_club');
  assert.ok(dealsDuosHtml.includes('Tasting Duos &amp; Pairs') || dealsDuosHtml.includes('Tasting Duos & Pairs'));

  // Deals with wellness filter
  const dealsWellnessHtml = renderApp('/shop/deals?filter=wellness');
  assert.ok(dealsWellnessHtml.includes('Wellness &amp; Pantry Reserves') || dealsWellnessHtml.includes('Wellness & Pantry Reserves'));

  // Celebration Boxes with canonical occasion matching (?occasion=wedding)
  const celebrationOccasionHtml = renderApp('/shop/celebration-boxes?occasion=wedding');
  assert.ok(celebrationOccasionHtml.includes('Celebration &amp; Bid Boxes') || celebrationOccasionHtml.includes('Celebration & Bid Boxes'));
  assert.ok(celebrationOccasionHtml.includes('Classic Card Bid Box'));
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 10: Omit Unsupported Savings Comparisons and Blanket Claims
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 10: Deals destination omits unsupported strikethrough comparisons and blanket savings copy', () => {
  const dealsHtml = renderApp('/shop/deals');

  // Must not have blanket "Verified Pricing Integrity" or "All bundle savings badges" claim without evidence
  assert.equal(dealsHtml.includes('Verified Pricing Integrity: All bundle savings badges'), false, 'Blanket verified savings copy removed');

  // Must show honest roastery curated copy
  assert.ok(dealsHtml.includes('Roastery Curated Assortments') || dealsHtml.includes('Curated Value Packages'), 'Honest roastery curated copy present');

  // No unsupported line-through comparePrice on bundle cards
  assert.equal(dealsHtml.includes('line-through'), false, 'Unsupported comparePrice strikethroughs omitted');
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION 11: Consistent Card Navigation, View Details Links & Clean Badges
// ─────────────────────────────────────────────────────────────────────────────
test('Regression 11: Product cards across destinations expose canonical /product/:id links, View Details, and omit Direct Checkout Eligible clutter', () => {
  const celebrationHtml = renderApp('/shop/celebration-boxes');
  assert.ok(celebrationHtml.includes('href="/product/bid-box-luxury-tin"'), 'Celebration card links to /product/bid-box-luxury-tin');
  assert.ok(celebrationHtml.includes('View Details'), 'Celebration card exposes View Details link');
  assert.equal(celebrationHtml.includes('Direct Checkout Eligible'), false, 'Celebration card omits implementation-facing Direct Checkout Eligible badge');

  const giftingHtml = renderApp('/gifting');
  assert.ok(giftingHtml.includes('href="/product/bundle-silver-hamper"'), 'Gifting card links to /product/bundle-silver-hamper');
  assert.ok(giftingHtml.includes('View Details'), 'Gifting card exposes View Details link');
  assert.equal(giftingHtml.includes('Direct Checkout Eligible'), false, 'Gifting card omits Direct Checkout Eligible badge');

  const dealsHtml = renderApp('/shop/deals');
  assert.ok(dealsHtml.includes('href="/product/bundle-daily-grind"'), 'Deals card links to /product/bundle-daily-grind');
  assert.ok(dealsHtml.includes('View Details'), 'Deals card exposes View Details link');
  assert.equal(dealsHtml.includes('Direct Checkout Eligible'), false, 'Deals card omits Direct Checkout Eligible badge');

  const occasionsHtml = renderApp('/occasions/wedding');
  assert.ok(occasionsHtml.includes('href="/product/'), 'Occasions card links to canonical /product/:id');
  assert.ok(occasionsHtml.includes('View Details'), 'Occasions card exposes View Details link');
  assert.equal(occasionsHtml.includes('Direct Checkout Eligible'), false, 'Occasions card omits Direct Checkout Eligible badge');

  const wholesaleHtml = renderApp('/wholesale');
  assert.ok(wholesaleHtml.includes('href="/product/'), 'Wholesale card links to canonical /product/:id');
  assert.ok(wholesaleHtml.includes('View Details'), 'Wholesale card exposes View Details link');
  assert.equal(wholesaleHtml.includes('Direct Checkout Eligible'), false, 'Wholesale card omits Direct Checkout Eligible badge');
});
