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

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  isPackagingProduct,
  parsePiecesPerPack,
  getPublishedPerPiecePrice,
  calculatePackagingMoq,
  calculateMinOrderQuantityUnits,
  validatePackagingQuantity,
  getPackagingMoqDisplay,
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
  getAdminCatalogRecord,
  getAdminProductRecord,
  loadAuthoritativeCatalog,
  importReferenceProduct,
  invalidateCatalogCache,
  CATALOG_COLLECTION,
} from '../src/lib/catalogStore';
import { CatalogError } from '../src/lib/catalogSchema';
import { HAMPER_BOX_SEEDS } from '../src/lib/hamperBoxSchema';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { CatalogProvider } from '../src/contexts/CatalogContext';
import { CartProvider } from '../src/contexts/CartContext';
import { ProductMediaProvider } from '../src/contexts/ProductMediaContext';
import ProductCard from '../src/components/ProductCard';
import ProductDetailPage from '../src/pages/ProductDetailPage';
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

  function isFieldDeleteSentinel(val: unknown): boolean {
    if (!val || typeof val !== 'object') return false;
    const ctorName = (val as any).constructor?.name || '';
    return ctorName.includes('DeleteTransform') || (val as any)._methodName === 'FieldValue.delete';
  }

  function sanitizeFirestoreWrite(obj: Record<string, any>, base: Record<string, any> = {}): Record<string, any> {
    const out: Record<string, any> = { ...base };
    for (const [k, v] of Object.entries(obj)) {
      if (isFieldDeleteSentinel(v) || v === undefined) {
        delete out[k];
      } else {
        out[k] = JSON.parse(JSON.stringify(v));
      }
    }
    return out;
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
      set: async (val: any, options?: { merge?: boolean }) => {
        const col = getCollectionMap(colName);
        const existing = options?.merge && col.has(id) ? col.get(id) : {};
        col.set(id, sanitizeFirestoreWrite(val, existing));
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
        getCollectionMap(colName).set(id, sanitizeFirestoreWrite(val));
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
        set: (docRef: any, data: any, options?: { merge?: boolean }) => {
          writeOccurred = true;
          return docRef.set(data, options);
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

// ─────────────────────────────────────────────────────────────────────────────
// 9. STAGE 3 REVIEW REGRESSIONS (DEFECTS 1–4)
// ─────────────────────────────────────────────────────────────────────────────

function renderWithProviders(element: React.ReactElement, initialRoute = '/') {
  return renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: [initialRoute] },
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(
          CatalogProvider,
          null,
          React.createElement(
            ProductMediaProvider,
            null,
            React.createElement(CartProvider, null, element)
          )
        )
      )
    )
  );
}

test('Regression 1 (Defect 1): Single Rs.1000 variant Bid Box has no invented pack tiers, discounts, or stale bidBoxConfig fallbacks', () => {
  const singleVariantBox: Product = {
    id: 'single-1000-bid-box',
    name_en: 'Bespoke Velvet Box',
    name_ur: 'مخمل باکس',
    name_ar: 'علبة مخملية',
    category: 'celebration-boxes',
    isBidBox: true,
    prices: {
      'Empty Box (1 pc)': 1000,
    },
    variants: [
      { id: 'portion-Empty%20Box%20(1%20pc)', label: 'Empty Box (1 pc)', price: 1000, available: true },
      { id: 'portion-Empty%20Pack%20(25%20pcs)', label: 'Empty Pack (25 pcs)', price: 20000, available: false }, // disabled variant must be excluded
    ],
    // Attach stale bidBoxConfig values that MUST NOT leak as fallback prices or tiers
    bidBoxConfig: {
      emptyUnitStarting: 450,
      emptyBulk50Unit: 405,
      emptyBulk100Unit: 369,
      filledMin: 950,
      filledMax: 2450,
      emptyTiers: [
        { qty: 10, label: '10 pcs', packPrice: 4500, unitPrice: 450, variantKey: 'Empty Pack (10 pcs)' },
        { qty: 25, label: '25 pcs (-5%)', packPrice: 10688, unitPrice: 428, discountBadge: '-5%', variantKey: 'Empty Pack (25 pcs)' },
      ],
      filledOptions: [
        { label: 'Filled Box (250g Royal Mix)', subtitle: 'Royal Mix', price: 1450, variantKey: 'Filled Box (250g Royal Mix)' },
      ],
    } as any,
    wholesale: 0,
    desc_en: 'Single variant velvet box',
    desc_ur: 'مخمل باکس',
    desc_ar: 'علبة مخملية',
    image: null,
    imageName: null,
  };

  const resolved = resolveBidBoxConfig(singleVariantBox);
  assert.ok(resolved);

  // Only the single available 1-pc saved variant exists -> zero bulk pack tiers are invented
  assert.equal(resolved.emptyTiers.length, 0);

  // No invented 10/25/50/100 bulk prices or stale filled prices
  assert.equal(resolved.emptyUnitStarting, 1000);
  assert.equal((resolved as any).emptyBulk10Unit, undefined);
  assert.equal((resolved as any).emptyBulk25Unit, undefined);
  assert.equal(resolved.emptyBulk50Unit, undefined);
  assert.equal(resolved.emptyBulk100Unit, undefined);
  assert.equal(resolved.filledOptions.length, 0);
  assert.equal(resolved.filledMin, undefined);
  assert.equal(resolved.filledMax, undefined);

  // Render ProductDetailPage for this single-variant Rs.1000 Bid Box and verify no invented tiers or discount claims appear
  PRODUCTS.push(singleVariantBox);
  try {
    const html = renderWithProviders(
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: '/product/:id', element: React.createElement(ProductDetailPage) })
      ),
      '/product/single-1000-bid-box'
    );
    assert.ok(html.includes('Bespoke Velvet Box'));
    assert.ok(!html.includes('Bulk Tier Savings Available'), 'Must not claim Bulk Tier Savings Available when only one variant exists');
    assert.ok(!html.includes('-5%'), 'Must not render hardcoded -5% badge');
    assert.ok(!html.includes('-10%'), 'Must not render hardcoded -10% badge');
    assert.ok(!html.includes('-18%'), 'Must not render hardcoded -18% badge');
    assert.ok(!html.includes('25 pcs'), 'Must not render disabled or nonexistent 25 pcs tier');
  } finally {
    const idx = PRODUCTS.findIndex(p => p.id === 'single-1000-bid-box');
    if (idx !== -1) PRODUCTS.splice(idx, 1);
  }
});

test('Regression 1b (Defect 1): Actual savings badge is calculated from saved comparable prices only', () => {
  const twoTierBox: Product = {
    id: 'two-tier-box',
    name_en: 'Two Tier Favor Box',
    name_ur: 'ٹو ٹیئر باکس',
    name_ar: 'علبة بطبقتين',
    category: 'celebration-boxes',
    isBidBox: true,
    prices: {
      'Empty Pack (10 pcs)': 2000, // 200 / pc baseline
      'Empty Pack (25 pcs)': 4500, // 180 / pc -> ((200 - 180) / 200) * 100 = 10% actual savings
      'Empty Pack (50 pcs)': 10000, // 200 / pc -> 0% savings (no badge)
    },
    wholesale: 0,
    desc_en: 'Two tier box',
    desc_ur: 'باکس',
    desc_ar: 'علبة',
    image: null,
    imageName: null,
  };

  const resolved = resolveBidBoxConfig(twoTierBox);
  assert.ok(resolved);
  assert.equal(resolved.emptyTiers.length, 3);
  assert.equal(resolved.emptyTiers[0].discountBadge, undefined);
  assert.equal(resolved.emptyTiers[1].discountBadge, '-10%'); // Actual savings is 10%, not hardcoded -5%
  assert.equal(resolved.emptyTiers[2].discountBadge, undefined); // Same unit price -> no discount badge
});

test('Regression 2 (Defect 2): Variant MOQ 8 survives create -> reload -> metadata edit -> pricing save -> public catalog -> authoritative quote, and supports clearing + validation', async () => {
  const { mockDb, collections } = createMockFirestore();
  invalidateCatalogCache();

  // Seed default hamper boxes and compiled products in mockDb so loadAuthoritativeCatalog & quoteOrderForCustomer work
  const productsCol = collections.get(CATALOG_COLLECTION) || new Map();
  collections.set(CATALOG_COLLECTION, productsCol);
  for (const seed of PRODUCTS) {
    productsCol.set(seed.id, {
      ...seed,
      schemaVersion: 1,
      productId: seed.id,
      revision: 1,
      active: seed.active !== false,
      quoteOnly: Boolean(seed.quoteOnly),
      variants: Object.entries(seed.prices).map(([label, price]) => ({
        id: `portion-${encodeURIComponent(label)}`,
        label,
        price,
        available: true,
        weightGrams: seed.shippingWeights?.[label] ?? null,
      })),
      wholesale: seed.wholesale || 0,
      pricePer100g: seed.pricePer100g || 0,
      allowCustomWeight: Boolean(seed.allowCustomWeight),
      minCustomWeightG: seed.minCustomWeightG || 100,
      maxCustomWeightG: seed.maxCustomWeightG || 5000,
      shippingWeightG: seed.shippingWeightG ?? null,
    });
  }
  const boxesCol = new Map();
  collections.set('hamperBoxes', boxesCol);
  for (const box of HAMPER_BOX_SEEDS) {
    boxesCol.set(box.id, {
      schemaVersion: 1,
      boxId: box.id,
      revision: 1,
      price: box.price,
      active: true,
    });
  }

  // 1. CREATE product with variant MOQ override = 8 (price = Rs. 200 -> formula MOQ would be 25)
  const created = await createAdminProduct({
    db: mockDb as any,
    actorUid: 'admin-1',
    body: {
      id: 'moq-journey-bid-box',
      name_en: 'Royal Silk Favor Box',
      name_ur: 'رائل سلک باکس',
      name_ar: 'علبة حرير ملكية',
      category: 'celebration-boxes',
      isBidBox: true,
      status: 'published',
      active: true,
      orderMode: 'standard',
      prices: { 'Empty Box (1 pc)': 200, 'Empty Pack (10 pcs)': 1900 },
      variants: [
        { label: 'Empty Box (1 pc)', price: 200, available: true, weightGrams: 120, moqOverride: 8 },
        { label: 'Empty Pack (10 pcs)', price: 1900, available: true, weightGrams: 1200 },
      ],
    },
  });

  const createdVar1 = created.variants?.find(v => v.label === 'Empty Box (1 pc)');
  assert.equal(createdVar1?.moqOverride, 8);
  assert.equal(calculatePackagingMoq(created, 'Empty Box (1 pc)'), 8);

  // 2. RELOAD via getAdminProductRecord and getAdminCatalogRecord
  const reloadedAdmin = await getAdminProductRecord(mockDb as any, 'moq-journey-bid-box');
  assert.equal(reloadedAdmin.variants?.find(v => v.label === 'Empty Box (1 pc)')?.moqOverride, 8);

  const reloadedPricingRecord = await getAdminCatalogRecord(mockDb as any, 'moq-journey-bid-box');
  assert.equal(
    reloadedPricingRecord.pricing.variants.find(v => v.label === 'Empty Box (1 pc)')?.moqOverride,
    8
  );

  // 3. METADATA EDIT via updateAdminProduct (changing name_en without resending variants)
  const afterMetaEdit = await updateAdminProduct({
    db: mockDb as any,
    productId: 'moq-journey-bid-box',
    actorUid: 'admin-1',
    body: {
      expectedRevision: created.revision,
      name_en: 'Royal Silk Favor Box — Edited Edition',
    },
  });
  assert.equal(afterMetaEdit.name_en, 'Royal Silk Favor Box — Edited Edition');
  assert.equal(afterMetaEdit.variants?.find(v => v.label === 'Empty Box (1 pc)')?.moqOverride, 8);

  // 4. PRICING SAVE via updateCatalogPricing (updating price to Rs. 220 while preserving variant MOQ 8)
  const freshRecordBeforePriceSave = await getAdminCatalogRecord(mockDb as any, 'moq-journey-bid-box');
  const afterPriceSave = await updateCatalogPricing({
    db: mockDb as any,
    productId: 'moq-journey-bid-box',
    actorUid: 'admin-1',
    body: {
      expectedRevision: freshRecordBeforePriceSave.pricing.revision,
      expectedVersion: freshRecordBeforePriceSave.version,
      pricing: {
        ...freshRecordBeforePriceSave.pricing,
        variants: freshRecordBeforePriceSave.pricing.variants.map(v =>
          v.label === 'Empty Box (1 pc)' ? { ...v, price: 220 } : v
        ),
      },
    },
  });
  assert.equal(
    afterPriceSave.pricing.variants.find(v => v.label === 'Empty Box (1 pc)')?.moqOverride,
    8
  );
  assert.equal(
    afterPriceSave.pricing.variants.find(v => v.label === 'Empty Box (1 pc)')?.price,
    220
  );

  // 5. PUBLIC CATALOG via loadAuthoritativeCatalog
  const snapshot = await loadAuthoritativeCatalog(mockDb as any, { fresh: true });
  const publicProduct = snapshot.products.find(p => p.id === 'moq-journey-bid-box');
  assert.ok(publicProduct);
  assert.equal(publicProduct.variants?.find(v => v.label === 'Empty Box (1 pc)')?.moqOverride, 8);
  assert.equal(calculatePackagingMoq(publicProduct, 'Empty Box (1 pc)'), 8);

  // 6. AUTHORITATIVE QUOTE via quoteOrderForCustomer
  // Quantity 7 (< MOQ 8) is rejected
  await assert.rejects(
    () =>
      quoteOrderForCustomer(mockDb as any, {
        items: [{ productId: 'moq-journey-bid-box', weight: 'Empty Box (1 pc)', quantity: 7 }],
        shippingMethodId: 'standard',
        city: 'Lahore',
      }),
    (err: any) => {
      assert.equal(err.code, 'BELOW_MINIMUM_ORDER_QUANTITY');
      return true;
    }
  );

  // Quantity 8 (== MOQ 8) succeeds with updated price 220 * 8 = 1760
  const validQuote = await quoteOrderForCustomer(mockDb as any, {
    items: [{ productId: 'moq-journey-bid-box', weight: 'Empty Box (1 pc)', quantity: 8 }],
    shippingMethodId: 'standard',
    city: 'Lahore',
  });
  assert.equal(validQuote.totals.subtotal, 220 * 8);

  // 7. CLEARING variant MOQ override via updateCatalogPricing (moqOverride: null) restores formula MOQ (ceil(5000 / 220) = 23)
  const clearedRecord = await updateCatalogPricing({
    db: mockDb as any,
    productId: 'moq-journey-bid-box',
    actorUid: 'admin-1',
    body: {
      expectedRevision: afterPriceSave.pricing.revision,
      expectedVersion: afterPriceSave.version,
      pricing: {
        ...afterPriceSave.pricing,
        variants: afterPriceSave.pricing.variants.map(v =>
          v.label === 'Empty Box (1 pc)' ? { ...v, moqOverride: null } : v
        ),
      },
    },
  });
  assert.equal(
    clearedRecord.pricing.variants.find(v => v.label === 'Empty Box (1 pc)')?.moqOverride,
    undefined
  );
  const snapshotAfterClear = await loadAuthoritativeCatalog(mockDb as any, { fresh: true });
  const publicProductAfterClear = snapshotAfterClear.products.find(p => p.id === 'moq-journey-bid-box')!;
  assert.equal(calculatePackagingMoq(publicProductAfterClear, 'Empty Box (1 pc)'), 23);

  // 8. INVALID MOQ overrides produce explicit validation errors (INVALID_MOQ_OVERRIDE)
  for (const invalidMoq of [0, -5, 3.5, 20000, 'invalid' as any]) {
    await assert.rejects(
      () =>
        updateAdminProduct({
          db: mockDb as any,
          productId: 'moq-journey-bid-box',
          actorUid: 'admin-1',
          body: {
            expectedRevision: clearedRecord.pricing.revision,
            moqOverride: invalidMoq,
          },
        }),
      (err: any) => {
        assert.ok(err instanceof CatalogError);
        assert.equal(err.code, 'INVALID_MOQ_OVERRIDE');
        return true;
      }
    );
  }
});

test('Regression 3 (Defect 3): Unpriced inquiry-only packaging product (prices:{}) renders in ProductCard and ProductDetailPage and opens inquiry safely while direct checkout stays blocked', () => {
  const unpricedInquiryBox: Product = {
    id: 'unpriced-inquiry-bid-box',
    name_en: 'Bespoke Architectural Nikkah Chest',
    name_ur: 'نکاح چیسٹ',
    name_ar: 'صندوق عقد القران',
    category: 'celebration-boxes',
    isBidBox: true,
    quoteOnly: true,
    orderMode: 'inquiry_quote',
    prices: {},
    variants: [],
    wholesale: 0,
    desc_en: 'Unpriced bespoke packaging requiring custom quote',
    desc_ur: 'کسٹم باکس',
    desc_ar: 'صندوق مخصص',
    image: null,
    imageName: null,
  };

  // 1. Safe display helper returns null MOQ without throwing
  const moqDisplay = getPackagingMoqDisplay(unpricedInquiryBox);
  assert.equal(moqDisplay.moqPieces, null);
  assert.equal(moqDisplay.minUnits, null);

  // 2. ProductCard renders safely with prices:{} and no fictional numeric MOQ
  const cardHtml = renderWithProviders(
    React.createElement(ProductCard, { product: unpricedInquiryBox, isWholesale: false })
  );
  assert.ok(cardHtml.includes('Bespoke Architectural Nikkah Chest'));
  assert.ok(!cardHtml.includes('MOQ:'), 'Unpriced inquiry product card must not display fictional numeric MOQ badge');

  // 3. ProductDetailPage renders safely with prices:{} and shows Request Custom Quote CTA
  PRODUCTS.push(unpricedInquiryBox);
  try {
    const detailHtml = renderWithProviders(
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: '/product/:id', element: React.createElement(ProductDetailPage) })
      ),
      '/product/unpriced-inquiry-bid-box'
    );
    assert.ok(detailHtml.includes('Bespoke Architectural Nikkah Chest'));
    assert.ok(detailHtml.includes('Request Custom Quote'));
    assert.ok(!detailHtml.includes('MOQ:'), 'Unpriced inquiry detail page must not display fictional numeric MOQ badge');
  } finally {
    const idx = PRODUCTS.findIndex(p => p.id === 'unpriced-inquiry-bid-box');
    if (idx !== -1) PRODUCTS.splice(idx, 1);
  }

  // 4. Direct checkout remains strictly blocked server-side
  assert.throws(
    () =>
      validateAndPriceOrder({
        items: [{ productId: 'unpriced-inquiry-bid-box', weight: 'Empty Box (1 pc)', quantity: 25 }],
        shippingMethodId: 'standard',
        city: 'Lahore',
        products: [unpricedInquiryBox],
      }),
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.code, 'QUOTE_REQUIRED');
      return true;
    }
  );
});

test('Regression 4 (Defect 4): Existing canonical Rs.1800 remains Rs.1800 when reference price is Rs.1000; repeat import remains unchanged', async () => {
  const { mockDb } = createMockFirestore();
  invalidateCatalogCache();

  // Create product and update via canonical price editor (which deletes legacy `prices` map and persists canonical `variants` at Rs.1800)
  const created = await createAdminProduct({
    db: mockDb as any,
    actorUid: 'admin-1',
    body: {
      id: 'canonical-1800-box',
      name_en: 'Canonical Acrylic Favor Box',
      category: 'celebration-boxes',
      isBidBox: true,
      status: 'published',
      active: true,
      prices: { '1 Piece': 1500 },
      variants: [{ label: '1 Piece', price: 1500, available: true, weightGrams: 250 }],
    },
  });

  const adminRec = await getAdminCatalogRecord(mockDb as any, 'canonical-1800-box');
  await updateCatalogPricing({
    db: mockDb as any,
    productId: 'canonical-1800-box',
    actorUid: 'admin-1',
    body: {
      expectedRevision: created.revision,
      expectedVersion: adminRec.version,
      pricing: {
        ...adminRec.pricing,
        variants: [
          {
            id: 'portion-1%20Piece',
            label: '1 Piece',
            price: 1800,
            available: true,
            weightGrams: 250,
          },
        ],
      },
    },
  });

  // Verify raw Firestore document has canonical `variants` with 1800 and NO legacy `prices` map
  const rawSnap = await mockDb.collection(CATALOG_COLLECTION).doc('canonical-1800-box').get();
  const rawDoc = rawSnap.data()!;
  assert.equal(rawDoc.prices, undefined);
  assert.equal(rawDoc.variants[0].price, 1800);

  // 1. Direct helper test: applyReferenceImportPricing recognizes canonical variants[0].price = 1800 when referencePrice = 1000
  const directImport = applyReferenceImportPricing({
    referencePrice: 1000,
    sourceUrl: 'https://supplier.example.com/acrylic-box',
    importBatch: 'batch-reimport-1',
    existingProduct: rawDoc,
  });
  assert.equal(directImport.sellingPrice, 1800);
  assert.deepEqual(directImport.sellingPrices, { '1 Piece': 1800 });
  assert.equal(directImport.variants[0].price, 1800);
  assert.equal(directImport.preservedExistingPrice, true);
  assert.equal(directImport.isNewImport, false);

  // 2. Real transactional import path test: importReferenceProduct preserves Rs.1800 and records private audit metadata
  const firstImportRun = await importReferenceProduct({
    db: mockDb as any,
    productId: 'canonical-1800-box',
    actorUid: 'admin-1',
    body: {
      referencePrice: 1000,
      sourceUrl: 'https://supplier.example.com/acrylic-box',
      importBatch: 'batch-reimport-1',
    },
  });
  assert.equal(firstImportRun.importResult.sellingPrice, 1800);
  assert.equal(firstImportRun.product.prices['1 Piece'], 1800);
  assert.equal(firstImportRun.product.variants?.[0]?.price, 1800);

  const afterFirstSnap = await mockDb.collection(CATALOG_COLLECTION).doc('canonical-1800-box').get();
  const afterFirstDoc = afterFirstSnap.data()!;
  assert.equal(afterFirstDoc.variants[0].price, 1800);
  assert.equal(afterFirstDoc.referencePrice, 1000);
  assert.equal(afterFirstDoc.supplierItemUrl, 'https://supplier.example.com/acrylic-box');
  assert.equal(afterFirstDoc.importBatch, 'batch-reimport-1');
  assert.ok(afterFirstDoc.importTimestamp);

  // 3. Repeat import remains completely unchanged and idempotent
  const secondImportRun = await importReferenceProduct({
    db: mockDb as any,
    productId: 'canonical-1800-box',
    actorUid: 'admin-1',
    body: {
      referencePrice: 1000,
      sourceUrl: 'https://supplier.example.com/acrylic-box',
      importBatch: 'batch-reimport-1',
    },
  });
  assert.equal(secondImportRun.importResult.sellingPrice, 1800);
  assert.equal(secondImportRun.product.prices['1 Piece'], 1800);
  assert.equal(secondImportRun.product.revision, firstImportRun.product.revision);

  const afterSecondSnap = await mockDb.collection(CATALOG_COLLECTION).doc('canonical-1800-box').get();
  const afterSecondDoc = afterSecondSnap.data()!;
  assert.equal(afterSecondDoc.variants[0].price, 1800);
  assert.equal(afterSecondDoc.importTimestamp, afterFirstDoc.importTimestamp);
});

test('Regression 5 (Defect 4): Multi-variant re-import preserves distinct merchant prices and rejects contradictory inputs', async () => {
  const { mockDb } = createMockFirestore();
  invalidateCatalogCache();

  // Create multi-variant canonical product with distinct merchant prices: 250g -> 950, 500g -> 1800, 1kg -> 3400
  await createAdminProduct({
    db: mockDb as any,
    actorUid: 'admin-1',
    body: {
      id: 'multi-variant-pistachios',
      name_en: 'Iranian Jumbo Pistachios',
      category: 'dry-fruits',
      status: 'published',
      active: true,
      prices: { '250g': 950, '500g': 1800, '1kg': 3400 },
      variants: [
        { label: '250g', price: 950, available: true, weightGrams: 250 },
        { label: '500g', price: 1800, available: true, weightGrams: 500 },
        { label: '1kg', price: 3400, available: true, weightGrams: 1000 },
      ],
    },
  });

  // Re-import with multi-variant reference prices (plus a brand-new '2kg' tier at referencePrice 6000 -> 6300)
  const reimported = await importReferenceProduct({
    db: mockDb as any,
    productId: 'multi-variant-pistachios',
    actorUid: 'admin-1',
    body: {
      referencePrices: {
        '250g': 800,
        '500g': 1500,
        '1kg': 2900,
        '2kg': 6000,
      },
      sourceUrl: 'https://supplier.example.com/pistachios',
      importBatch: 'batch-multi-1',
    },
  });

  // Existing variants MUST retain their distinct merchant prices (950, 1800, 3400) — never collapsed to 950!
  assert.equal(reimported.product.prices['250g'], 950);
  assert.equal(reimported.product.prices['500g'], 1800);
  assert.equal(reimported.product.prices['1kg'], 3400);
  // New variant '2kg' receives one-time 5% markup: round(6000 * 1.05) = 6300
  assert.equal(reimported.product.prices['2kg'], 6300);

  // Re-importing with only a single referencePrice also preserves all distinct variant prices
  const singleRefReimport = applyReferenceImportPricing({
    referencePrice: 800,
    existingProduct: {
      variants: reimported.product.variants,
    },
  });
  assert.deepEqual(singleRefReimport.sellingPrices, {
    '250g': 950,
    '500g': 1800,
    '1kg': 3400,
    '2kg': 6300,
  });

  // Contradictory inputs are explicitly rejected with CONTRADICTORY_IMPORT_INPUT
  // 1. isNewImport: false when existingProduct is missing
  assert.throws(
    () =>
      applyReferenceImportPricing({
        referencePrice: 1000,
        existingProduct: null,
        isNewImport: false,
      }),
    (err: any) => err instanceof CatalogError && err.code === 'CONTRADICTORY_IMPORT_INPUT'
  );

  // 2. isNewImport: true when existingProduct already has established prices (without forceRecompute)
  assert.throws(
    () =>
      applyReferenceImportPricing({
        referencePrice: 1000,
        existingProduct: { variants: [{ id: 'portion-250g', label: '250g', price: 950, available: true, weightGrams: 250 }] },
        isNewImport: true,
      }),
    (err: any) => err instanceof CatalogError && err.code === 'CONTRADICTORY_IMPORT_INPUT'
  );

  // 3. forceRecompute: true combined with isNewImport: false
  assert.throws(
    () =>
      applyReferenceImportPricing({
        referencePrice: 1000,
        existingProduct: { variants: [{ id: 'portion-250g', label: '250g', price: 950, available: true, weightGrams: 250 }] },
        forceRecompute: true,
        isNewImport: false,
      }),
    (err: any) => err instanceof CatalogError && err.code === 'CONTRADICTORY_IMPORT_INPUT'
  );

  // 4. Contradictory referencePrice vs referencePrices
  assert.throws(
    () =>
      applyReferenceImportPricing({
        referencePrice: 1000,
        referencePrices: { '250g': 800, '500g': 1500 },
      }),
    (err: any) => err instanceof CatalogError && err.code === 'CONTRADICTORY_IMPORT_INPUT'
  );
});

