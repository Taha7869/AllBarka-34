import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryFirestore } from './helpers/memoryFirestore';
import { generateCatalogHealthReport, runCatalogHealthAudit } from '../src/lib/catalogHealthReport';
import { parseHealthReportArgs } from '../scripts/report-catalog-health';
import type { Product } from '../src/types';
import type { HamperBox } from '../src/lib/hamperCatalog';
import { DEFAULT_CATALOG_CONFIGURATION } from '../src/lib/catalogConfiguration';
import { HAMPER_BOX_SEEDS } from '../src/lib/hamperBoxSchema';
import { BID_BOX_PRODUCTS } from '../src/data/products';
import {
  createAdminProduct,
  updateAdminProduct,
  publishAdminProduct,
  updateHamperBoxPricing,
  loadAuthoritativeCatalog,
  invalidateCatalogCache,
  storedCatalogRecord,
} from '../src/lib/catalogStore';

function baseValidProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'test-pista',
    name_en: 'Premium Roasted Pistachio',
    name_ur: 'پستہ',
    name_ar: 'فستق',
    category: 'dry-fruits',
    active: true,
    status: 'published',
    image: '/images/products/pista.webp',
    imageName: 'pista.webp',
    prices: { '250g': 1200, '500g': 2200, '1kg': 4500 },
    wholesale: 4000,
    desc_en: 'Hand-selected roasted pistachios with Himalayan pink salt.',
    desc_ur: 'خالص پستہ',
    desc_ar: 'فستق ممتاز',
    ...overrides,
  };
}

test('generateCatalogHealthReport: identifies definite failures in products', () => {
  const invalidName = baseValidProduct({ id: 'p1', name_en: '' });
  const zeroPrice = baseValidProduct({ id: 'p2', prices: { '250g': 0 } });
  const missing1kgCustom = baseValidProduct({
    id: 'p3',
    allowCustomWeight: true,
    prices: { '250g': 1200, '500g': 2200 }, // No 1kg!
  });
  const badCategory = baseValidProduct({ id: 'p4', category: 'nonexistent-universe' });
  const badImage = baseValidProduct({ id: 'p5', image: 'file://c:/private/img.jpg' });

  const report = generateCatalogHealthReport({
    products: [invalidName, zeroPrice, missing1kgCustom, badCategory, badImage],
    config: DEFAULT_CATALOG_CONFIGURATION,
    source: 'snapshot_fixture',
  });

  assert.equal(report.source, 'snapshot_fixture');
  assert.ok(report.summary.definiteFailuresCount >= 5);

  const codes = new Set(report.issues.map(i => i.code));
  assert.ok(codes.has('MISSING_REQUIRED_NAME'));
  assert.ok(codes.has('ZERO_PRICE_ON_STANDARD'));
  assert.ok(codes.has('MISSING_1KG_RATE'));
  assert.ok(codes.has('ORPHAN_CATEGORY'));
  assert.ok(codes.has('MISSING_MEDIA'));

  assert.ok(report.actionableItems.definiteFailures.includes('p1'));
  assert.ok(report.actionableItems.definiteFailures.includes('p2'));
  assert.ok(report.actionableItems.definiteFailures.includes('p3'));
  assert.ok(report.actionableItems.definiteFailures.includes('p4'));
  assert.ok(report.actionableItems.definiteFailures.includes('p5'));
});

test('generateCatalogHealthReport: audits recipes and ingredient 1kg rates', () => {
  const ingredientGood = baseValidProduct({
    id: 'ing-good',
    prices: { '1kg': 3000 },
  });
  const ingredientNo1kg = baseValidProduct({
    id: 'ing-no-1kg',
    prices: { '250g': 800 }, // No 1kg rate!
  });
  const ingredientInactive = baseValidProduct({
    id: 'ing-inactive',
    active: false,
    prices: { '1kg': 2500 },
  });

  const celebrationBox = baseValidProduct({
    id: 'box-gift',
    category: 'celebration-boxes',
    recipeIngredients: [
      { productId: 'ing-good', grams: 200 },
      { productId: 'ing-no-1kg', grams: 150 },
      { productId: 'ing-inactive', grams: 100 },
      { productId: 'ing-ghost', grams: 50 }, // Missing product!
      { productId: 'ing-good', grams: -10 }, // Invalid grams!
    ],
  });

  const report = generateCatalogHealthReport({
    products: [ingredientGood, ingredientNo1kg, ingredientInactive, celebrationBox],
    config: DEFAULT_CATALOG_CONFIGURATION,
    source: 'snapshot_fixture',
  });

  const boxIssues = report.issues.filter(i => i.itemId === 'box-gift');
  const issueCodes = boxIssues.map(i => i.code);

  assert.ok(issueCodes.includes('RECIPE_INGREDIENT_MISSING_KG_RATE'));
  assert.ok(issueCodes.includes('INVALID_RECIPE_REFERENCE'));
  assert.ok(issueCodes.includes('INVALID_RECIPE_GRAMS'));
});

test('generateCatalogHealthReport: identifies merchant judgment items and copy discrepancies', () => {
  const ajwa = baseValidProduct({
    id: 'ajwa-dates',
    desc_en: 'Irani Muzafati fresh dates imported directly.',
    prices: { '500g': 1500 },
  });
  const medjool = baseValidProduct({
    id: 'medjool-dates',
    desc_en: 'Panjgur Amber dates from Balochistan.',
    prices: { '500g': 1800 },
  });
  const emptyPackaging = baseValidProduct({
    id: 'bid-box-custom',
    category: 'celebration-boxes',
    orderMode: 'both',
    prices: { 'Empty Box': 300, 'Filled Royal': 1500 },
    // No recipeIngredients or filledRecipes
  });

  const report = generateCatalogHealthReport({
    products: [ajwa, medjool, emptyPackaging],
    config: DEFAULT_CATALOG_CONFIGURATION,
    source: 'snapshot_fixture',
  });

  const merchantIssues = report.issues.filter(i => i.severity === 'MERCHANT_JUDGMENT');
  const codes = new Set(merchantIssues.map(i => i.code));

  assert.ok(codes.has('COPY_FACT_DISCREPANCY'));
  assert.ok(codes.has('MISSING_FILLED_RECIPE'));
  assert.ok(report.actionableItems.merchantJudgments.includes('ajwa-dates'));
  assert.ok(report.actionableItems.merchantJudgments.includes('medjool-dates'));
  assert.ok(report.actionableItems.merchantJudgments.includes('bid-box-custom'));
});

test('runCatalogHealthAudit with memoryFirestore: audits missing stored records and hamper boxes', async () => {
  // Empty memory Firestore simulates live database state where BID_BOX_PRODUCTS & hamperBoxes are not persisted
  const { db } = memoryFirestore();
  invalidateCatalogCache();

  const report = await runCatalogHealthAudit(db, { source: 'firestore_memory' });

  assert.equal(report.source, 'firestore_memory');
  assert.ok(report.summary.totalProductsScanned > 0);
  assert.ok(report.summary.totalHamperBoxesScanned > 0);

  // Check that missing stored records were detected
  const missingRecords = report.issues.filter(i => i.code === 'MISSING_STORED_RECORD');
  assert.equal(missingRecords.length, 8); // All 8 BID_BOX_PRODUCTS absent from products collection

  // The 4 items with legacy long labels (>40 chars) must be DEFINITE_FAILURE because requiresStoredLegacyPackagingPricing holds them unavailable
  const failMissing = missingRecords.filter(i => i.severity === 'DEFINITE_FAILURE');
  assert.equal(failMissing.length, 4);
  assert.ok(failMissing.some(i => i.itemId === 'bid-box-umrah-tabarruk'));
  assert.ok(failMissing.some(i => i.itemId === 'bid-box-pyramid-favor'));
  assert.ok(failMissing.some(i => i.itemId === 'bid-box-card-nikkah'));
  assert.ok(failMissing.some(i => i.itemId === 'bid-box-birth-announcement'));

  // The other 4 items are MERCHANT_JUDGMENT (masquerading via seed fallback, uneditable in admin)
  const judgmentMissing = missingRecords.filter(i => i.severity === 'MERCHANT_JUDGMENT');
  assert.equal(judgmentMissing.length, 4);
  assert.ok(judgmentMissing.some(i => i.itemId === 'bid-box-luxury-tin'));
  assert.ok(judgmentMissing.some(i => i.itemId === 'bid-box-jute-pouch'));
  assert.ok(judgmentMissing.some(i => i.itemId === 'bid-box-sweet-nikkah'));
  assert.ok(judgmentMissing.some(i => i.itemId === 'bid-box-acrylic-royal'));

  // Check missing hamper boxes
  const missingBoxes = report.issues.filter(i => i.code === 'MISSING_STORED_HAMPER_BOX');
  assert.equal(missingBoxes.length, 3);
  assert.ok(missingBoxes.every(i => i.severity === 'DEFINITE_FAILURE'));
});

test('CLI argument parsing: handles flags correctly', () => {
  assert.deepEqual(parseHealthReportArgs(['--help']), { json: false, help: true });
  assert.deepEqual(parseHealthReportArgs(['-h']), { json: false, help: true });
  assert.deepEqual(parseHealthReportArgs(['--json']), { json: true, output: undefined, help: false });
  assert.deepEqual(parseHealthReportArgs(['--json', '--output=docs/health.json']), {
    json: true,
    output: 'docs/health.json',
    help: false,
  });
});

test('Admin editing path retention, 409 revision conflict, and public projection refresh on memoryFirestore', async () => {
  const { db, records } = memoryFirestore();
  invalidateCatalogCache();

  // 1. Create a draft product with initial pricing
  const created = await createAdminProduct({
    db,
    actorUid: 'admin-tester',
    body: {
      id: 'artisan-walnut-halwa',
      name_en: 'Artisan Walnut Halwa',
      name_ur: 'اخروٹ حلوہ',
      name_ar: 'حلوى الجوز',
      category: 'essentials',
      desc_en: 'Hand-stirred walnut halwa in pure desi ghee.',
      status: 'draft',
      active: false,
      prices: { '500g': 1600 },
    },
  });

  assert.equal(created.id, 'artisan-walnut-halwa');
  assert.equal(created.status, 'draft');
  assert.equal(created.revision, 1);

  // 2. Update the product and add pricing
  const updated = await updateAdminProduct({
    db,
    productId: created.id,
    actorUid: 'admin-tester',
    body: {
      expectedRevision: 1,
      name_en: 'Artisan Walnut Halwa Special',
      prices: { '500g': 1800, '1kg': 3400 },
      wholesale: 3000,
    },
  });

  assert.equal(updated.name_en, 'Artisan Walnut Halwa Special');
  assert.equal(updated.revision, 2);
  assert.equal(updated.prices['1kg'], 3400);

  // 3. Stale update with old expectedRevision (1 instead of 2) fails with 409 CATALOG_REVISION_CONFLICT
  await assert.rejects(
    async () => {
      await updateAdminProduct({
        db,
        productId: created.id,
        actorUid: 'admin-tester',
        body: {
          expectedRevision: 1,
          name_en: 'Stale Edit That Should Fail',
        },
      });
    },
    (err: any) => err.code === 'CATALOG_REVISION_CONFLICT' && (err.httpStatus === 409 || err.statusCode === 409)
  );

  // 4. Publish product
  const published = await publishAdminProduct({
    db,
    productId: created.id,
    expectedRevision: 2,
    actorUid: 'admin-tester',
  });
  assert.equal(published.status, 'published');
  assert.equal(published.active, true);
  assert.equal(published.revision, 3);

  // 5. Invalidate cache and verify public snapshot refresh
  invalidateCatalogCache();
  const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
  const found = snapshot.products.find(p => p.id === created.id);
  assert.ok(found, 'Product must appear in refreshed catalog snapshot');
  assert.equal(found.name_en, 'Artisan Walnut Halwa Special');
  assert.equal(found.prices['1kg'], 3400);

  // 6. Test hamper box pricing update & refresh
  records.set('hamperBoxes/box-wood', {
    schemaVersion: 1,
    boxId: 'box-wood',
    revision: 0,
    price: 1800,
    active: true,
    updatedAt: new Date().toISOString(),
  });
  const initialBox = await loadAuthoritativeCatalog(db, { fresh: true });
  const initialWood = initialBox.hamperBoxes.find(b => b.id === 'box-wood')!;

  const boxUpdated = await updateHamperBoxPricing({
    db,
    boxId: 'box-wood',
    actorUid: 'admin-tester',
    body: {
      expectedVersion: initialWood.catalogRevision,
      expectedRevision: 0,
      pricing: {
        schemaVersion: 1,
        boxId: 'box-wood',
        revision: 0,
        price: 2200,
        active: true,
      },
    },
  });
  assert.equal(boxUpdated.pricing.price, 2200);

  // Refresh and verify box in snapshot
  invalidateCatalogCache();
  const refreshedSnapshot = await loadAuthoritativeCatalog(db, { fresh: true });
  const woodBox = refreshedSnapshot.hamperBoxes.find(b => b.id === 'box-wood');
  assert.ok(woodBox, 'Wood box must be present');
  assert.equal(woodBox.price, 2200);
  assert.equal(woodBox.active, true);
});
