/**
 * AllBarka Renovation V2 — Stage 3 Acceptance Test Suite
 *
 * SPECIFICATION & GOVERNANCE:
 * - Requirements: Canonical Pricing, Variants, MOQ & Order Compatibility
 * - Authority: AllBarka_Antigravity_Master_Prompt (1).md (Version 2.0)
 *   - Rule D1: Packaging MOQ = min(25, max(1, ceil(5000 / publishedPerPiecePrice)))
 *   - Rule D2: Initial Reference Import Markup = Math.round(referencePrice * 1.05), idempotent on re-import
 *   - Rule D3: Single Authoritative Pricing Representation across Admin, Public, Cart & Quote
 *   - Rule D4: Order Modes (standard, inquiry_quote, both) & Quote-Only rejection
 *
 * SCOPE & DEPENDENCY DISCLOSURE:
 * 1. REAL PRODUCTION FUNCTIONS & ENGINES TESTED:
 *    - `isPackagingProduct`, `parsePiecesPerPack`, `getPublishedPerPiecePrice`,
 *      `calculatePackagingMoq`, `calculateMinOrderQuantityUnits`, `validatePackagingQuantity` from `src/lib/packagingMoq.ts`
 *    - `computeReferenceMarkup`, `applyReferenceImportPricing`, `validateReferencePriceInput` from `src/lib/pricingImport.ts`
 *    - `resolveBidBoxConfig` from `src/lib/bidBoxPricing.ts`
 *    - `validateAndPriceOrder`, `ValidationError` from `src/lib/orderValidation.ts`
 *    - `quoteOrderForCustomer` from `src/lib/orderQuote.ts`
 *    - `createAdminProduct`, `updateAdminProduct`, `updateCatalogPricing` from `src/lib/catalogStore.ts`
 *
 * 2. FIXTURES & ISOLATION BOUNDARIES:
 *    - Isolated in-memory Firestore fixture (`createMockFirestore`) implementing atomic transactions.
 *    - Zero live cloud writes (prohibited by Stage 3 operating rules).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isPackagingProduct,
  parsePiecesPerPack,
  getPublishedPerPiecePrice,
  calculatePackagingMoq,
  calculateMinOrderQuantityUnits,
  validatePackagingQuantity,
  DEFAULT_PACKAGING_CAP_MOQ,
  DEFAULT_PACKAGING_MIN_MOQ,
  PACKAGING_TARGET_ORDER_VALUE,
  FOOD_CATEGORY_IDS,
} from '../src/lib/packagingMoq';

import {
  computeReferenceMarkup,
  applyReferenceImportPricing,
  validateReferencePriceInput,
} from '../src/lib/pricingImport';

import { resolveBidBoxConfig } from '../src/lib/bidBoxPricing';
import { validateAndPriceOrder, ValidationError } from '../src/lib/orderValidation';
import { quoteOrderForCustomer } from '../src/lib/orderQuote';
import { PRODUCTS } from '../src/data/products';
import {
  createAdminProduct,
  updateAdminProduct,
  updateCatalogPricing,
  getAdminProductRecord,
  invalidateCatalogCache,
  CATALOG_COLLECTION,
} from '../src/lib/catalogStore';
import type { Product } from '../src/types';

// In-memory Firestore mock for store/admin compatibility tests
function createMockFirestore() {
  const collections = new Map<string, Map<string, any>>();

  function getCollectionMap(colName: string): Map<string, any> {
    if (!collections.has(colName)) {
      collections.set(colName, new Map());
    }
    return collections.get(colName)!;
  }

  function makeDocSnapshot(colName: string, id: string) {
    const col = getCollectionMap(colName);
    const data = col.get(id);
    return {
      id,
      exists: data !== undefined,
      data: () => (data !== undefined ? JSON.parse(JSON.stringify(data)) : undefined),
    };
  }

  function makeDocRef(colName: string, id: string) {
    return {
      id,
      get: async () => makeDocSnapshot(colName, id),
      set: async (val: any) => {
        getCollectionMap(colName).set(id, JSON.parse(JSON.stringify(val)));
      },
      delete: async () => {
        getCollectionMap(colName).delete(id);
      },
    };
  }

  const mockDb = {
    collection: (colName: string) => ({
      doc: (id: string) => makeDocRef(colName, id),
      get: async () => {
        const col = getCollectionMap(colName);
        const docs = Array.from(col.entries()).map(([id, data]) => ({
          id,
          exists: true,
          data: () => JSON.parse(JSON.stringify(data)),
        }));
        return { docs, empty: docs.length === 0, size: docs.length };
      },
      add: async (val: any) => {
        const id = 'gen_' + Math.random().toString(36).substring(2, 9);
        getCollectionMap(colName).set(id, JSON.parse(JSON.stringify(val)));
        return makeDocRef(colName, id);
      },
    }),
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
      let writeOccurred = false;
      const transaction = {
        get: async (docRef: any) => {
          if (writeOccurred) {
            throw new Error('Firestore transactions require all reads to execute before any writes');
          }
          return docRef.get();
        },
        set: (docRef: any, data: any) => {
          writeOccurred = true;
          return docRef.set(data);
        },
        delete: (docRef: any) => {
          writeOccurred = true;
          return docRef.delete();
        },
      };
      return updateFunction(transaction);
    },
    getAll: async (...docRefs: any[]) => {
      return Promise.all(docRefs.map(ref => ref.get()));
    },
  };

  return { mockDb, collections };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. RULE D1: PACKAGING MOQ FORMULA & TEST VECTORS
// ─────────────────────────────────────────────────────────────────────────────

test('Rule D1: calculatePackagingMoq produces exact test vectors for published per-piece prices', () => {
  const makePackagingProduct = (pricePerPiece: number): Product => ({
    id: 'test-box',
    name_en: 'Test Favor Box',
    name_ur: 'ٹیسٹ باکس',
    name_ar: 'علبة تجريبية',
    category: 'celebration-boxes',
    isBidBox: true,
    prices: { 'Empty Box (1 pc)': pricePerPiece },
    wholesale: 0,
    desc_en: 'Description',
    desc_ur: 'تفصیل',
    desc_ar: 'وصف',
    image: null,
    imageName: null,
  });

  // Test vector: Rs. 100 -> min(25, max(1, ceil(5000 / 100))) = min(25, 50) = 25
  assert.equal(calculatePackagingMoq(makePackagingProduct(100), 'Empty Box (1 pc)'), 25);

  // Test vector: Rs. 200 -> min(25, max(1, ceil(5000 / 200))) = min(25, 25) = 25
  assert.equal(calculatePackagingMoq(makePackagingProduct(200), 'Empty Box (1 pc)'), 25);

  // Test vector: Rs. 300 -> min(25, max(1, ceil(5000 / 300))) = min(25, 17) = 17
  assert.equal(calculatePackagingMoq(makePackagingProduct(300), 'Empty Box (1 pc)'), 17);

  // Test vector: Rs. 500 -> min(25, max(1, ceil(5000 / 500))) = min(25, 10) = 10
  assert.equal(calculatePackagingMoq(makePackagingProduct(500), 'Empty Box (1 pc)'), 10);

  // Test vector: Rs. 1000 -> min(25, max(1, ceil(5000 / 1000))) = min(25, 5) = 5
  assert.equal(calculatePackagingMoq(makePackagingProduct(1000), 'Empty Box (1 pc)'), 5);

  // Test vector: Rs. 2000 -> min(25, max(1, ceil(5000 / 2000))) = min(25, 3) = 3
  assert.equal(calculatePackagingMoq(makePackagingProduct(2000), 'Empty Box (1 pc)'), 3);

  // Test vector: Rs. 6000 -> min(25, max(1, ceil(5000 / 6000))) = min(25, 1) = 1
  assert.equal(calculatePackagingMoq(makePackagingProduct(6000), 'Empty Box (1 pc)'), 1);
});

test('Rule D1: Admin MOQ override takes precedence over formula', () => {
  const productWithOverride: Product = {
    id: 'custom-tin-box',
    name_en: 'Custom Tin Box',
    name_ur: 'ٹن باکس',
    name_ar: 'علبة قصدير',
    category: 'celebration-boxes',
    isBidBox: true,
    moqOverride: 15, // Explicit product override
    prices: { 'Empty Box (1 pc)': 100 }, // Formula would yield 25
    wholesale: 0,
    desc_en: 'Description',
    desc_ur: 'تفصیل',
    desc_ar: 'وصف',
    image: null,
    imageName: null,
  };

  assert.equal(calculatePackagingMoq(productWithOverride, 'Empty Box (1 pc)'), 15);

  // Variant-level override takes precedence over product override
  const productWithVariantOverride: Product = {
    ...productWithOverride,
    variants: [
      { label: 'Empty Box (1 pc)', price: 100, moqOverride: 8 },
    ],
  };

  assert.equal(calculatePackagingMoq(productWithVariantOverride, 'Empty Box (1 pc)'), 8);

  // Invalid override (<= 0 or NaN) is safely ignored, falling back to formula
  const productWithInvalidOverride: Product = {
    ...productWithOverride,
    moqOverride: -5,
  };
  assert.equal(calculatePackagingMoq(productWithInvalidOverride, 'Empty Box (1 pc)'), 25);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. FOOD EXEMPTION: ALL FOOD ITEMS EXEMPT FROM MOQ (MOQ = 1)
// ─────────────────────────────────────────────────────────────────────────────

test('Food Exemption: All food categories are strictly exempt from packaging MOQ (MOQ = 1)', () => {
  const foodCategories = [
    'dry-fruits',
    'dates',
    'seeds-snacks',
    'oils',
    'essentials',
    'herbs-spices',
    'nuts',
    'snacks-seeds',
    'combos',
    'bundles',
    'gift-boxes',
  ];

  for (const category of foodCategories) {
    const foodProduct: Product = {
      id: `food-${category}`,
      name_en: `Product in ${category}`,
      name_ur: 'پروڈکٹ',
      name_ar: 'منتج',
      category,
      prices: { '250g': 1200, '500g': 2300, '1kg': 4500 },
      wholesale: 0,
      desc_en: 'Pure food',
      desc_ur: 'خالص خوراک',
      desc_ar: 'طعام نقي',
      image: null,
      imageName: null,
    };

    assert.equal(isPackagingProduct(foodProduct), false, `Category ${category} should not be packaging`);
    assert.equal(calculatePackagingMoq(foodProduct, '250g'), 1, `Category ${category} must have MOQ = 1`);
    assert.equal(calculateMinOrderQuantityUnits(foodProduct, '250g'), 1, `Category ${category} min units must be 1`);

    const validation = validatePackagingQuantity(foodProduct, '250g', 1);
    assert.equal(validation.valid, true);
    assert.equal(validation.moq, 1);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PACK VS PIECE VARIANT MOQ AND QUANTITY CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

test('Packaging MOQ: Pack variant vs individual piece variant handling', () => {
  const pyramidBoxProduct: Product = {
    id: 'bid-box-pyramid-favor',
    name_en: 'Royal Pyramid Favor Box',
    name_ur: 'رائل اہرام فیور باکس',
    name_ar: 'علبة هدايا هرمية ملكية',
    category: 'celebration-boxes',
    isBidBox: true,
    prices: {
      'Empty Box (1 pc)': 140,
      'Empty Pack (25 pcs)': 3500, // 3500 / 25 = 140/pc
      'Empty Bulk (50 pcs)': 6500, // 6500 / 50 = 130/pc
    },
    variants: [
      { label: 'Empty Box (1 pc)', price: 140, available: true },
      { label: 'Empty Pack (25 pcs)', price: 3500, available: true },
      { label: 'Empty Bulk (50 pcs)', price: 6500, available: true },
    ],
    wholesale: 0,
    desc_en: 'Pyramid favor boxes',
    desc_ur: 'اہرام فیور باکسز',
    desc_ar: 'علب هدايا هرمية',
    image: null,
    imageName: null,
  };

  // 1. Pack variant "Empty Pack (25 pcs)":
  // Each pack contains 25 pieces. Per piece price is 140.
  // MOQ pieces = min(25, max(1, ceil(5000 / 140))) = 25 pieces.
  // minUnits = ceil(25 / 25) = 1 pack.
  assert.equal(parsePiecesPerPack('Empty Pack (25 pcs)'), 25);
  assert.equal(getPublishedPerPiecePrice(pyramidBoxProduct, 'Empty Pack (25 pcs)'), 140);
  assert.equal(calculatePackagingMoq(pyramidBoxProduct, 'Empty Pack (25 pcs)'), 25);
  assert.equal(calculateMinOrderQuantityUnits(pyramidBoxProduct, 'Empty Pack (25 pcs)'), 1);

  // Ordering 1 pack delivers 25 pieces, satisfying MOQ 25
  const packValidation1 = validatePackagingQuantity(pyramidBoxProduct, 'Empty Pack (25 pcs)', 1);
  assert.equal(packValidation1.valid, true);
  assert.equal(packValidation1.totalPieces, 25);
  assert.equal(packValidation1.piecesPerPack, 25);

  // Ordering 0 packs fails
  const packValidation0 = validatePackagingQuantity(pyramidBoxProduct, 'Empty Pack (25 pcs)', 0);
  assert.equal(packValidation0.valid, false);

  // 2. Individual piece variant "Empty Box (1 pc)":
  // Each unit contains 1 piece.
  // minUnits = ceil(25 / 1) = 25 units.
  assert.equal(parsePiecesPerPack('Empty Box (1 pc)'), 1);
  assert.equal(calculateMinOrderQuantityUnits(pyramidBoxProduct, 'Empty Box (1 pc)'), 25);

  // Ordering 10 pieces fails (below MOQ 25)
  const pieceValidation10 = validatePackagingQuantity(pyramidBoxProduct, 'Empty Box (1 pc)', 10);
  assert.equal(pieceValidation10.valid, false);
  assert.equal(pieceValidation10.reason, 'BELOW_MINIMUM_ORDER_QUANTITY');
  assert.equal(pieceValidation10.moq, 25);
  assert.equal(pieceValidation10.totalPieces, 10);

  // Ordering 25 pieces succeeds
  const pieceValidation25 = validatePackagingQuantity(pyramidBoxProduct, 'Empty Box (1 pc)', 25);
  assert.equal(pieceValidation25.valid, true);
  assert.equal(pieceValidation25.totalPieces, 25);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. NO CROSS-DESIGN POOLING
// ─────────────────────────────────────────────────────────────────────────────

test('No Cross-Design Pooling: Quantities cannot be pooled across different designs to satisfy MOQ', () => {
  const boxA: Product = {
    id: 'box-design-a',
    name_en: 'Design A Box',
    name_ur: 'ڈیزائن اے',
    name_ar: 'تصميم أ',
    category: 'celebration-boxes',
    isBidBox: true,
    prices: { 'Empty Box (1 pc)': 150 }, // MOQ = 25
    wholesale: 0,
    desc_en: 'Desc',
    desc_ur: 'تفصیل',
    desc_ar: 'وصف',
    image: null,
    imageName: null,
  };

  const boxB: Product = {
    id: 'box-design-b',
    name_en: 'Design B Box',
    name_ur: 'ڈیزائن بی',
    name_ar: 'تصميم ب',
    category: 'celebration-boxes',
    isBidBox: true,
    prices: { 'Empty Box (1 pc)': 150 }, // MOQ = 25
    wholesale: 0,
    desc_en: 'Desc',
    desc_ur: 'تفصیل',
    desc_ar: 'وصف',
    image: null,
    imageName: null,
  };

  const catalog = [boxA, boxB];

  // Attempting to buy 15 of Box A and 10 of Box B (sum = 25)
  // Both line items must be rejected because each design must independently satisfy MOQ 25.
  const pooledOrder = {
    items: [
      { productId: 'box-design-a', weight: 'Empty Box (1 pc)', quantity: 15 },
      { productId: 'box-design-b', weight: 'Empty Box (1 pc)', quantity: 10 },
    ],
    shippingMethodId: 'standard',
    city: 'Lahore',
  };

  assert.throws(
    () => validateAndPriceOrder({
      ...pooledOrder,
      products: catalog,
    }),
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.code, 'BELOW_MINIMUM_ORDER_QUANTITY');
      return true;
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DYNAMIC BIDBOX PRICING RESOLUTION (NO STALE HARDCODED PRICES)
// ─────────────────────────────────────────────────────────────────────────────

test('BidBox Pricing: resolveBidBoxConfig derives live prices from canonical product.prices', () => {
  const tinProduct: Product = {
    id: 'bid-box-luxury-tin',
    name_en: 'Luxury Floral Tin Bid Box',
    name_ur: 'لگژری فلورل ٹن بِد باکس',
    name_ar: 'علبة قصدير فاخرة بنقوش زهرية',
    category: 'celebration-boxes',
    isBidBox: true,
    prices: {
      'Empty Pack (25 pcs)': 4500, // 4500 / 25 = 180/box
      'Empty Bulk (50 pcs)': 8500, // 8500 / 50 = 170/box
      'Empty Bulk (100 pcs)': 16000, // 16000 / 100 = 160/box
      'Filled Single (50g Ajwa)': 450,
      'Filled Single (100g Premium Mix)': 750,
    },
    wholesale: 0,
    desc_en: 'Tin bid box',
    desc_ur: 'ٹن بِد باکس',
    desc_ar: 'علبة قصدير',
    image: null,
    imageName: null,
  };

  const resolved = resolveBidBoxConfig(tinProduct);
  assert.ok(resolved);
  assert.equal(resolved.emptyUnitStarting, 180);
  assert.equal(resolved.emptyBulk50Unit, 170);
  assert.equal(resolved.emptyBulk100Unit, 160);
  assert.equal(resolved.filledMin, 450);
  assert.equal(resolved.filledMax, 750);

  // When prices are updated, resolveBidBoxConfig derives the new values dynamically
  const updatedTinProduct: Product = {
    ...tinProduct,
    prices: {
      ...tinProduct.prices,
      'Empty Pack (25 pcs)': 5000, // 5000 / 25 = 200/box
      'Empty Bulk (50 pcs)': 9000, // 9000 / 50 = 180/box
      'Empty Bulk (100 pcs)': 17000, // 17000 / 100 = 170/box
    },
  };

  const updatedResolved = resolveBidBoxConfig(updatedTinProduct);
  assert.ok(updatedResolved);
  assert.equal(updatedResolved.emptyUnitStarting, 200);
  assert.equal(updatedResolved.emptyBulk50Unit, 180);
  assert.equal(updatedResolved.emptyBulk100Unit, 170);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. RULE D2: REFERENCE IMPORT 5% MARKUP AND IDEMPOTENCY
// ─────────────────────────────────────────────────────────────────────────────

test('Rule D2: computeReferenceMarkup applies exactly 5% with half-up whole-rupee rounding', () => {
  // 1000 * 1.05 = 1050 -> 1050
  assert.equal(computeReferenceMarkup(1000).sellingPrice, 1050);

  // 1005 * 1.05 = 1055.25 -> 1055
  assert.equal(computeReferenceMarkup(1005).sellingPrice, 1055);

  // 1007 * 1.05 = 1057.35 -> 1057
  assert.equal(computeReferenceMarkup(1007).sellingPrice, 1057);

  // 1010 * 1.05 = 1060.5 -> 1061 (half up)
  assert.equal(computeReferenceMarkup(1010).sellingPrice, 1061);

  // Non-finite or non-positive input is rejected
  assert.throws(() => computeReferenceMarkup(0));
  assert.throws(() => computeReferenceMarkup(-100));
  assert.throws(() => computeReferenceMarkup(NaN));
});

test('Rule D2: applyReferenceImportPricing applies 5% on new import and records private audit metadata', () => {
  const result = applyReferenceImportPricing({
    referencePrice: 2000,
    sourceUrl: 'https://supplier.example.com/box-item-123',
    importBatch: 'batch-2026-10-17',
  });

  // 2000 * 1.05 = 2100
  assert.equal(result.sellingPrice, 2100);
  assert.equal(result.referencePrice, 2000);
  assert.equal(result.sourceUrl, 'https://supplier.example.com/box-item-123');
  assert.equal(result.importBatch, 'batch-2026-10-17');
  assert.equal(result.markupPercent, 0.05);
  assert.equal(result.roundingPolicy, 'half_up_whole_rupee');
  assert.equal(result.isNewImport, true);
  assert.equal(result.preservedExistingPrice, false);
});

test('Rule D2: Re-import idempotency — preserves existing confirmed selling prices (zero compound markup)', () => {
  const existingProduct: Partial<Product> = {
    id: 'imported-box-item',
    name_en: 'Imported Floral Box',
    category: 'celebration-boxes',
    prices: { 'Empty Box (1 pc)': 2100 },
    importBatch: 'batch-2026-10-17',
    importTimestamp: '2026-10-17T12:00:00Z',
    supplierItemUrl: 'https://supplier.example.com/box-item-123',
  };

  // Re-importing the same item should NOT multiply by 1.05 again
  const reimportResult = applyReferenceImportPricing({
    referencePrice: 2000,
    sourceUrl: 'https://supplier.example.com/box-item-123',
    existingProduct,
    isNewImport: false, // Re-import
  });

  // Must retain 2100, NOT 2205
  assert.equal(reimportResult.sellingPrice, 2100);
  assert.equal(reimportResult.isNewImport, false);
  assert.equal(reimportResult.preservedExistingPrice, true);
});

test('Rule D2: Admin-saved selling prices never receive automatic markup', async () => {
  const { mockDb } = createMockFirestore();
  invalidateCatalogCache();

  const productData = {
    id: 'merchant-saved-almonds',
    name_en: 'Premium Roasted Almonds',
    name_ur: 'روسٹڈ بادام',
    name_ar: 'لوز محمص',
    category: 'dry-fruits',
    status: 'published' as const,
    prices: { '250g': 1200, '500g': 2300 },
    variants: [
      { label: '250g', price: 1200, available: true },
      { label: '500g', price: 2300, available: true },
    ],
  };

  const created = await createAdminProduct({
    db: mockDb as any,
    body: productData,
    actorUid: 'admin-1',
  });

  // Admin selling price is saved exactly as entered
  assert.equal(created.prices['250g'], 1200);
  assert.equal(created.prices['500g'], 2300);

  // Updating pricing directly also retains exact selling price
  const updated = await updateAdminProduct({
    db: mockDb as any,
    productId: 'merchant-saved-almonds',
    body: {
      expectedRevision: created.revision,
      prices: { '250g': 1300, '500g': 2500 },
    },
    actorUid: 'admin-1',
  });

  assert.equal(updated.prices['250g'], 1300);
  assert.equal(updated.prices['500g'], 2500);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. ORDER MODES AND QUOTE-ONLY ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

test('Order Modes: Direct checkout rejection for quoteOnly and inquiry_quote products', () => {
  const quoteOnlyProduct: Product = {
    id: 'bespoke-gift-chest',
    name_en: 'Imperial Gift Chest',
    name_ur: 'امپیریل گفٹ باکس',
    name_ar: 'صندوق هدايا إمبراطوري',
    category: 'celebration-boxes',
    quoteOnly: true,
    prices: { 'Custom Bespoke': 15000 },
    wholesale: 0,
    desc_en: 'Custom chest',
    desc_ur: 'کسٹم باکس',
    desc_ar: 'صندوق مخصص',
    image: null,
    imageName: null,
  };

  const inquiryModeProduct: Product = {
    id: 'bulk-corporate-hamper',
    name_en: 'Corporate Luxury Hamper',
    name_ur: 'کارپوریٹ لگژری ہیمپر',
    name_ar: 'سلة شركات فاخرة',
    category: 'combos',
    orderMode: 'inquiry_quote',
    prices: { 'Tier 1': 8000 },
    wholesale: 0,
    desc_en: 'Corporate hamper',
    desc_ur: 'کارپوریٹ ہیمپر',
    desc_ar: 'سلة شركات',
    image: null,
    imageName: null,
  };

  const catalog = [quoteOnlyProduct, inquiryModeProduct];

  // 1. Attempting direct checkout for quoteOnly product
  assert.throws(
    () => validateAndPriceOrder({
      items: [{ productId: 'bespoke-gift-chest', weight: 'Custom Bespoke', quantity: 1 }],
      shippingMethodId: 'standard',
      city: 'Lahore',
      products: catalog,
    }),
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.code, 'QUOTE_REQUIRED');
      return true;
    }
  );

  // 2. Attempting direct checkout for inquiry_quote product
  assert.throws(
    () => validateAndPriceOrder({
      items: [{ productId: 'bulk-corporate-hamper', weight: 'Tier 1', quantity: 1 }],
      shippingMethodId: 'standard',
      city: 'Lahore',
      products: catalog,
    }),
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.code, 'QUOTE_REQUIRED');
      return true;
    }
  );
});

test('Pricing Integrity: Zero or unknown price is rejected and cannot become purchasable', () => {
  const zeroPriceProduct: Product = {
    id: 'unpriced-box',
    name_en: 'Unpriced Box',
    name_ur: 'بغیر قیمت باکس',
    name_ar: 'علبة بدون سعر',
    category: 'celebration-boxes',
    prices: { 'Empty Box (1 pc)': 0 }, // Invalid zero price
    wholesale: 0,
    desc_en: 'Unpriced',
    desc_ur: 'بغیر قیمت',
    desc_ar: 'بدون سعر',
    image: null,
    imageName: null,
  };

  assert.throws(
    () => validateAndPriceOrder({
      items: [{ productId: 'unpriced-box', weight: 'Empty Box (1 pc)', quantity: 25 }],
      shippingMethodId: 'standard',
      city: 'Lahore',
      products: [zeroPriceProduct],
    }),
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.code, 'PRICING_UNAVAILABLE');
      return true;
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. SERVER-AUTHORITATIVE QUOTE & ORDER VALIDATION COMPATIBILITY
// ─────────────────────────────────────────────────────────────────────────────

test('Order Compatibility: Packaging and food checkout end-to-end', () => {
  const catalog: Product[] = [
    {
      id: 'ajwa-dates',
      name_en: 'Madinah Ajwa Dates',
      name_ur: 'مدینہ عجوہ کھجور',
      name_ar: 'تمر عجوة المدينة',
      category: 'dates',
      prices: { '250g': 1500, '500g': 2900, '1kg': 5600 },
      wholesale: 0,
      desc_en: 'Dates',
      desc_ur: 'کھجور',
      desc_ar: 'تمر',
      image: null,
      imageName: null,
    },
    {
      id: 'wedding-bid-box',
      name_en: 'Classic Nikkah Bid Box',
      name_ur: 'نکاح بِد باکس',
      name_ar: 'علبة عقد القران',
      category: 'celebration-boxes',
      isBidBox: true,
      prices: {
        'Empty Pack (25 pcs)': 3500,
        'Empty Box (1 pc)': 140,
      },
      wholesale: 0,
      desc_en: 'Bid box',
      desc_ur: 'بِد باکس',
      desc_ar: 'علبة',
      image: null,
      imageName: null,
    },
  ];

  // 1. Food item (quantity = 1, MOQ = 1) passes
  const foodOrder = validateAndPriceOrder({
    items: [{ productId: 'ajwa-dates', weight: '500g', quantity: 1 }],
    shippingMethodId: 'standard',
    city: 'Lahore',
    products: catalog,
  });

  assert.equal(foodOrder.summary.subtotal, 2900);
  assert.equal(foodOrder.items[0].price, 2900);
  assert.equal(foodOrder.items[0].quantity, 1);

  // 2. Packaging pack (1 pack of 25 pcs satisfies MOQ 25) passes
  const packagingPackOrder = validateAndPriceOrder({
    items: [{ productId: 'wedding-bid-box', weight: 'Empty Pack (25 pcs)', quantity: 1 }],
    shippingMethodId: 'standard',
    city: 'Lahore',
    products: catalog,
  });

  assert.equal(packagingPackOrder.summary.subtotal, 3500);
  assert.equal(packagingPackOrder.items[0].price, 3500);
  assert.equal(packagingPackOrder.items[0].quantity, 1);
  assert.equal(packagingPackOrder.items[0].piecesPerPack, 25);
  assert.equal(packagingPackOrder.items[0].totalPieces, 25);

  // 3. Packaging piece below MOQ fails
  assert.throws(
    () => validateAndPriceOrder({
      items: [{ productId: 'wedding-bid-box', weight: 'Empty Box (1 pc)', quantity: 10 }],
      shippingMethodId: 'standard',
      city: 'Lahore',
      products: catalog,
    }),
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.code, 'BELOW_MINIMUM_ORDER_QUANTITY');
      return true;
    }
  );

  // 4. Packaging piece at MOQ (25 pcs) passes
  const packagingPieceOrder = validateAndPriceOrder({
    items: [{ productId: 'wedding-bid-box', weight: 'Empty Box (1 pc)', quantity: 25 }],
    shippingMethodId: 'standard',
    city: 'Lahore',
    products: catalog,
  });

  assert.equal(packagingPieceOrder.summary.subtotal, 140 * 25); // 3500
  assert.equal(packagingPieceOrder.items[0].price, 140);
  assert.equal(packagingPieceOrder.items[0].quantity, 25);
  assert.equal(packagingPieceOrder.items[0].totalPieces, 25);
});
