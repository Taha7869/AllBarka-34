import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { memoryFirestore } from './helpers/memoryFirestore';
import {
  generateCatalogHealthReport,
  loadCatalogHealthSnapshotFile,
  runCatalogHealthAudit,
} from '../src/lib/catalogHealthReport';
import { parseHealthReportArgs } from '../scripts/report-catalog-health';
import type { Product } from '../src/types';
import type { HamperBox } from '../src/lib/hamperCatalog';
import { DEFAULT_CATALOG_CONFIGURATION, type CatalogConfiguration } from '../src/lib/catalogConfiguration';
import { HAMPER_BOX_SEEDS } from '../src/lib/hamperBoxSchema';
import { BID_BOX_PRODUCTS, PRODUCTS } from '../src/data/products';
import {
  createAdminProduct,
  updateAdminProduct,
  publishAdminProduct,
  updateHamperBoxPricing,
  loadAuthoritativeCatalog,
  invalidateCatalogCache,
  storedCatalogRecord,
} from '../src/lib/catalogStore';
import { resolveCustomWeight, supportsCustomWeight } from '../src/lib/productVariants';
import { calculatePackagingMoq } from '../src/lib/packagingMoq';

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
  const badCategory = baseValidProduct({ id: 'p4', category: 'nonexistent-universe' });
  const badImage = baseValidProduct({ id: 'p5', image: 'file://c:/private/img.jpg' });

  const report = generateCatalogHealthReport({
    products: [invalidName, zeroPrice, badCategory, badImage],
    config: DEFAULT_CATALOG_CONFIGURATION,
    source: 'snapshot_fixture',
  });

  assert.equal(report.source, 'snapshot_fixture');
  assert.ok(report.summary.definiteFailuresCount >= 4);

  const codes = new Set(report.issues.map(i => i.code));
  assert.ok(codes.has('MISSING_REQUIRED_NAME'));
  assert.ok(codes.has('ZERO_PRICE_ON_STANDARD'));
  assert.ok(codes.has('ORPHAN_CATEGORY'));
  assert.ok(codes.has('MISSING_MEDIA'));

  assert.ok(report.actionableItems.definiteFailures.includes('p1'));
  assert.ok(report.actionableItems.definiteFailures.includes('p2'));
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
  assert.deepEqual(parseHealthReportArgs(['--help']), { json: false, output: undefined, snapshot: undefined, help: true });
  assert.deepEqual(parseHealthReportArgs(['-h']), { json: false, output: undefined, snapshot: undefined, help: true });
  assert.deepEqual(parseHealthReportArgs(['--json']), { json: true, output: undefined, snapshot: undefined, help: false });
  assert.deepEqual(parseHealthReportArgs(['--json', '--output=docs/health.json', '--snapshot=docs/snap.json']), {
    json: true,
    output: 'docs/health.json',
    snapshot: 'docs/snap.json',
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

// REGRESSION 1: Merchant Review Worksheet integrity
test('Merchant Review Worksheet regression: exact IDs, labels, compiled reference prices, and null approvals', () => {
  const packetPath = path.resolve(process.cwd(), 'docs/evidence/catalog-audit/merchant-data-entry-packet.json');
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf-8'));

  assert.equal(packet.worksheetId, 'M34-MERCHANT-REVIEW-WORKSHEET');
  assert.equal(packet.documentClassification, 'REVIEW_WORKSHEET_NOT_DIRECT_WRITE_PAYLOAD');
  assert.equal(packet.pricingRulesAndInvariants.zeroInventedPrices, true);

  // Hamper boxes check
  assert.equal(packet.hamperBoxesReview.length, 3);
  const wood = packet.hamperBoxesReview.find((b: any) => b.boxId === 'box-wood')!;
  assert.equal(wood.referenceSeedPricePkr, 1800);
  assert.equal(wood.confirmedPricePkr, null);

  // Celebration boxes check
  assert.equal(packet.celebrationBoxesReview.length, 8);

  const tin = packet.celebrationBoxesReview.find((p: any) => p.id === 'bid-box-luxury-tin')!;
  assert.equal(tin.name_en, 'Luxury Floral Tin Bid Box');
  assert.equal(tin.moqOverride, null); // Dynamic Rule D1, no hardcoded MOQ 10
  const tinEmpty1 = tin.variants.find((v: any) => v.label === 'Empty Box (1 pc)')!;
  assert.equal(tinEmpty1.referencePricePkr, 140);
  assert.equal(tinEmpty1.confirmedPricePkr, null);
  const tinFilledStd = tin.variants.find((v: any) => v.label === 'Filled Standard (Assorted Dry Fruits)')!;
  assert.equal(tinFilledStd.referencePricePkr, 1150);

  const umrah = packet.celebrationBoxesReview.find((p: any) => p.id === 'bid-box-umrah-tabarruk')!;
  assert.equal(umrah.name_en, 'Umrah & Hajj Tabarruk Box Set');
  const umrahEmpty1 = umrah.variants.find((v: any) => v.label === 'Empty Box (1 pc)')!;
  assert.equal(umrahEmpty1.referencePricePkr, 200);
  assert.equal(umrahEmpty1.confirmedPricePkr, null);
  const umrahFilledStd = umrah.variants.find((v: any) => v.label === 'Filled Standard (Irani Dates, Badam, Kaju & Kishmish)')!;
  assert.equal(umrahFilledStd.referencePricePkr, 850);
});

// REGRESSION 2: Custom taxonomy (collections & occasions) from config.taxonomy
test('generateCatalogHealthReport: respects custom collection and occasion IDs from config.taxonomy', () => {
  const customConfig: CatalogConfiguration = {
    ...DEFAULT_CATALOG_CONFIGURATION,
    taxonomy: [
      { id: 'eid-mubarak', name_en: 'Eid Mubarak', name_ur: 'عید مبارک', name_ar: 'عيد مبارك', description_en: '', description_ur: '', description_ar: '', type: 'occasion', visible: true },
      { id: 'royal-reserves', name_en: 'Royal Reserves', name_ur: 'شاہی ذخائر', name_ar: 'احتياط ملكي', description_en: '', description_ur: '', description_ar: '', type: 'collection', visible: true },
    ],
  };

  const productWithCustomTaxonomy = baseValidProduct({
    id: 'custom-festive-pista',
    occasions: ['eid-mubarak'],
    collections: ['royal-reserves'],
  });

  const productWithOrphans = baseValidProduct({
    id: 'orphan-product',
    occasions: ['unregistered-martian-holiday'],
    collections: ['unregistered-alien-collection'],
  });

  const report = generateCatalogHealthReport({
    products: [productWithCustomTaxonomy, productWithOrphans],
    config: customConfig,
    source: 'snapshot_fixture',
  });

  // productWithCustomTaxonomy should have NO orphan issues
  const customIssues = report.issues.filter(i => i.itemId === 'custom-festive-pista');
  const customIssueCodes = customIssues.map(i => i.code);
  assert.ok(!customIssueCodes.includes('ORPHAN_OCCASION'), 'Configured custom occasion should not be orphan');
  assert.ok(!customIssueCodes.includes('ORPHAN_COLLECTION'), 'Configured custom collection should not be orphan');

  // productWithOrphans should have orphan issues
  const orphanIssues = report.issues.filter(i => i.itemId === 'orphan-product');
  const orphanCodes = orphanIssues.map(i => i.code);
  assert.ok(orphanCodes.includes('ORPHAN_OCCASION'));
  assert.ok(orphanCodes.includes('ORPHAN_COLLECTION'));
});

// REGRESSION 3: Read failure vs confirmed empty data
test('generateCatalogHealthReport: distinguishes unreadable/failed collection reads from confirmed empty collections', () => {
  // Scenario A: Collection read failed (UNREADABLE)
  const reportUnreadable = generateCatalogHealthReport({
    products: PRODUCTS,
    hamperBoxes: HAMPER_BOX_SEEDS,
    storedProductReadStatus: 'UNREADABLE',
    storedHamperBoxReadStatus: 'UNREADABLE',
    configReadStatus: 'UNREADABLE_FALLBACK_DEFAULT',
    source: 'firestore_live',
  });

  assert.equal(reportUnreadable.readStatus.products, 'UNREADABLE');
  assert.equal(reportUnreadable.readStatus.hamperBoxes, 'UNREADABLE');
  assert.equal(reportUnreadable.readStatus.config, 'UNREADABLE_FALLBACK_DEFAULT');

  // Must NOT report MISSING_STORED_RECORD when database read failed!
  const missingProds = reportUnreadable.issues.filter(i => i.code === 'MISSING_STORED_RECORD');
  assert.equal(missingProds.length, 0, 'Must not claim records are missing when store read was unreadable');

  const storeReadIssues = reportUnreadable.issues.filter(i => i.code === 'STORE_READ_UNAVAILABLE');
  assert.ok(storeReadIssues.length >= 2, 'Must record STORE_READ_UNAVAILABLE notice');

  // Scenario B: Collection read confirmed (CONFIRMED) but empty
  const reportConfirmedEmpty = generateCatalogHealthReport({
    products: PRODUCTS,
    hamperBoxes: HAMPER_BOX_SEEDS,
    storedProductDocIds: new Set(), // 0 docs confirmed
    storedProductReadStatus: 'CONFIRMED',
    storedHamperBoxDocIds: new Set(),
    storedHamperBoxReadStatus: 'CONFIRMED',
    source: 'firestore_live',
  });

  assert.equal(reportConfirmedEmpty.readStatus.products, 'CONFIRMED');
  const confirmedMissing = reportConfirmedEmpty.issues.filter(i => i.code === 'MISSING_STORED_RECORD');
  assert.equal(confirmedMissing.length, 8, 'Must identify all 8 missing celebration boxes when collection read was confirmed empty');
});

// REGRESSION 4: Explicit snapshot input and static-reference labeling
test('loadCatalogHealthSnapshotFile: parses audit report and direct export snapshot files with provenance', () => {
  const auditSnapshotPath = 'docs/evidence/catalog-audit/r04-cat1-audit.json';
  const input = loadCatalogHealthSnapshotFile(auditSnapshotPath);

  assert.equal(input.source, 'snapshot_fixture');
  assert.equal(input.storedProductReadStatus, 'CONFIRMED');
  assert.equal(input.storedProductDocIds instanceof Set, true);
  assert.equal((input.storedProductDocIds as Set<string>).size, 89);
  assert.equal(input.provenance?.snapshotFile, auditSnapshotPath);
  assert.ok(input.provenance?.description?.includes('89 Firestore products'));

  const report = generateCatalogHealthReport(input);
  assert.equal(report.source, 'snapshot_fixture');
  assert.equal(report.readStatus.products, 'CONFIRMED');
  assert.equal(report.actionableItems.definiteFailures.length, 7); // 4 long-label boxes + 3 hamper boxes
});

// REGRESSION 5: Valid retail custom pricing without 1kg variant vs gift recipe requirement
test('Retail custom weight vs gift ingredient estimate: valid retail custom pricing without 1kg rate does not fail', () => {
  // Product with 250g, 500g, allowCustomWeight: true, pricePer100g: 300, but NO 1kg rate
  const retailDates = baseValidProduct({
    id: 'retail-dates',
    category: 'dry-fruits',
    prices: { '250g': 800, '500g': 1500 }, // No 1kg!
    pricePer100g: 300,
    allowCustomWeight: true,
  });

  // Verify supportsCustomWeight returns true
  assert.equal(supportsCustomWeight(retailDates), true);

  // Verify resolveCustomWeight calculates retail price cleanly (e.g. 750g = 300 * 7.5 = 2250)
  const custom750 = resolveCustomWeight(retailDates, 'Custom 750g');
  assert.equal(custom750.price, 2250);
  assert.equal(custom750.isCustom, true);

  // Now audit in health report
  const report = generateCatalogHealthReport({
    products: [retailDates],
    config: DEFAULT_CATALOG_CONFIGURATION,
    source: 'snapshot_fixture',
  });

  // It should NOT be a DEFINITE_FAILURE because retail custom weight is functional!
  const failIssues = report.issues.filter(i => i.itemId === 'retail-dates' && i.severity === 'DEFINITE_FAILURE');
  assert.equal(failIssues.length, 0, 'Retail product with valid pricePer100g must not be a definite failure');

  // It should be a MERCHANT_JUDGMENT indicating 1kg rate is unconfigured for hamper recipes
  const judgmentIssues = report.issues.filter(i => i.itemId === 'retail-dates' && i.severity === 'MERCHANT_JUDGMENT');
  const kgIssue = judgmentIssues.find(i => i.code === 'MISSING_1KG_RATE');
  assert.ok(kgIssue, 'Must flag missing 1kg rate as merchant judgment for hamper recipe eligibility');
  assert.ok(kgIssue.message.includes('functional via pricePer100g'));
});
