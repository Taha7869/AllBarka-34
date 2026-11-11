import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import {
  validateProductPassport,
  validateClaimsVerification,
  validateMediaFocalPoint,
  validateCropMode,
  validateDynamicProduct,
  stripPrivateProductFields,
  CatalogError,
} from '../src/lib/catalogSchema';
import { updateAdminProduct, loadAuthoritativeCatalog, invalidateCatalogCache } from '../src/lib/catalogStore';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { memoryFirestore } from './helpers/memoryFirestore';
import { generateCatalogHealthReport } from '../src/lib/catalogHealthReport';
import type { Product } from '../src/types';

test('validateProductPassport: parses valid passport fields cleanly', () => {
  const input = {
    variety: 'Irani Mamra',
    harvestSeason: 'Autumn 2026',
    roastLevel: 'slow_roasted',
    processingMethod: 'Traditional Sun Drying',
    ingredients: ['Almonds', 'Himalayan Pink Salt'],
    allergens: ['Tree Nuts (Almonds)'],
    storageInstructions: 'Store in an airtight jar in a cool, dry pantry.',
    bestBeforeDays: 180,
    certifications: ['halal', 'organic', 'raw_natural'],
  };

  const result = validateProductPassport(input);
  assert.equal(result.variety, 'Irani Mamra');
  assert.equal(result.harvestSeason, 'Autumn 2026');
  assert.equal(result.roastLevel, 'slow_roasted');
  assert.equal(result.processingMethod, 'Traditional Sun Drying');
  assert.deepEqual(result.ingredients, ['Almonds', 'Himalayan Pink Salt']);
  assert.deepEqual(result.allergens, ['Tree Nuts (Almonds)']);
  assert.equal(result.storageInstructions, 'Store in an airtight jar in a cool, dry pantry.');
  assert.equal(result.bestBeforeDays, 180);
  assert.deepEqual(result.certifications, ['halal', 'organic', 'raw_natural']);
});

test('validateProductPassport: rejects invalid roast level or shelf life', () => {
  assert.throws(
    () => validateProductPassport({ roastLevel: 'deep_fried' }),
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_ROAST_LEVEL'
  );

  assert.throws(
    () => validateProductPassport({ bestBeforeDays: -5 }),
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_BEST_BEFORE_DAYS'
  );

  assert.throws(
    () => validateProductPassport({ bestBeforeDays: 99999 }),
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_BEST_BEFORE_DAYS'
  );
});

test('validateClaimsVerification: parses statuses and defaults safely', () => {
  const verified = validateClaimsVerification({
    status: 'verified',
    verifiedAt: '2026-11-01',
    notes: 'Sourcing invoice and lab certificate verified by Lead Auditor',
  });
  assert.equal(verified.status, 'verified');
  assert.equal(verified.verifiedAt, '2026-11-01');
  assert.ok(verified.notes?.includes('Lead Auditor'));

  const fallback = validateClaimsVerification({});
  assert.equal(fallback.status, 'unverified');

  const discrepant = validateClaimsVerification({
    status: 'discrepant',
    notes: 'Batch label states Irani but packaging says Balochi',
  });
  assert.equal(discrepant.status, 'discrepant');
});

test('validateMediaFocalPoint: validates bounds (0.0 to 1.0) and precision', () => {
  const valid = validateMediaFocalPoint({ x: 0.35, y: 0.85 });
  assert.equal(valid.x, 0.35);
  assert.equal(valid.y, 0.85);

  assert.throws(
    () => validateMediaFocalPoint({ x: -0.1, y: 0.5 }),
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_MEDIA_FOCAL_POINT_COORDINATES'
  );

  assert.throws(
    () => validateMediaFocalPoint({ x: 0.5, y: 1.2 }),
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_MEDIA_FOCAL_POINT_COORDINATES'
  );
});

test('validateCropMode: enforces allowed crop modes and rejects custom without semantics', () => {
  assert.equal(validateCropMode('cover'), 'cover');
  assert.equal(validateCropMode('contain'), 'contain');

  assert.throws(
    () => validateCropMode('custom'),
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_CROP_MODE'
  );

  assert.throws(
    () => validateCropMode('stretch'),
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_CROP_MODE'
  );
});

test('Public Data Privacy: stripPrivateProductFields suppresses private notes and unapproved claims', () => {
  // Case A: Verified product
  const verifiedProduct: Product = {
    id: 'prod-verified',
    name_en: 'Organic Almonds',
    name_ur: '',
    name_ar: '',
    desc_en: 'Raw organic almonds',
    desc_ur: '',
    desc_ar: '',
    category: 'dry-fruits',
    active: true,
    status: 'published',
    orderMode: 'standard',
    image: '/images/almonds.jpg',
    imageName: null,
    prices: { '250g': 1200 },
    wholesale: 1000,
    passport: {
      variety: 'Nonpareil',
      harvestSeason: '2026 Autumn',
      roastLevel: 'raw',
      certifications: ['organic', 'halal'],
    },
    claimsVerification: {
      status: 'verified',
      verifiedAt: '2026-11-01',
      notes: 'PRIVATE_SENTINEL_NOTES_VERIFIED_INTERNAL_EVIDENCE',
    },
    mediaFocalPoint: { x: 0.5, y: 0.5 },
    cropMode: 'cover',
  };

  const publicVerified = stripPrivateProductFields(verifiedProduct);
  assert.equal(publicVerified.claimsVerification?.status, 'verified');
  assert.equal(publicVerified.claimsVerification?.verifiedAt, '2026-11-01');
  assert.equal((publicVerified.claimsVerification as any)?.notes, undefined, 'Private notes must be stripped');
  assert.deepEqual(publicVerified.passport?.certifications, ['organic', 'halal'], 'Approved certifications exposed');
  assert.equal(JSON.stringify(publicVerified).includes('PRIVATE_SENTINEL_NOTES'), false);

  // Case B: Unverified product with claimed certifications
  const unverifiedProduct: Product = {
    ...verifiedProduct,
    id: 'prod-unverified',
    claimsVerification: {
      status: 'unverified',
      notes: 'PRIVATE_SENTINEL_NOTES_UNVERIFIED_EVIDENCE',
    },
  };

  const publicUnverified = stripPrivateProductFields(unverifiedProduct);
  assert.equal(publicUnverified.claimsVerification?.status, 'unverified');
  assert.equal((publicUnverified.claimsVerification as any)?.notes, undefined, 'Private notes must be stripped');
  assert.equal(publicUnverified.passport?.certifications, undefined, 'Unverified certifications must be suppressed from public DTO');
  assert.equal(JSON.stringify(publicUnverified).includes('PRIVATE_SENTINEL_NOTES'), false);

  // Case C: Discrepant product
  const discrepantProduct: Product = {
    ...verifiedProduct,
    id: 'prod-discrepant',
    claimsVerification: {
      status: 'discrepant',
      notes: 'PRIVATE_SENTINEL_DISCREPANCY_LAB_FAILED',
    },
  };

  const publicDiscrepant = stripPrivateProductFields(discrepantProduct);
  assert.equal(publicDiscrepant.claimsVerification?.status, 'discrepant');
  assert.equal((publicDiscrepant.claimsVerification as any)?.notes, undefined, 'Private discrepancy notes must be stripped');
  assert.equal(publicDiscrepant.passport?.certifications, undefined, 'Discrepant certifications must be suppressed');
  assert.equal(JSON.stringify(publicDiscrepant).includes('PRIVATE_SENTINEL_DISCREPANCY'), false);
});

test('Public Catalog Endpoints: /api/catalog and /api/catalog/products/:id suppress private notes and unapproved claims', async () => {
  const { db } = memoryFirestore();
  invalidateCatalogCache();

  const pVerified: any = {
    schemaVersion: 1,
    id: 'almonds-verified',
    revision: 1,
    active: true,
    status: 'published',
    orderMode: 'standard',
    name_en: 'Verified Almonds',
    name_ur: '',
    name_ar: '',
    desc_en: 'Description',
    desc_ur: '',
    desc_ar: '',
    category: 'dry-fruits',
    image: '/images/almonds.jpg',
    prices: { '250g': 1200 },
    variants: [{ id: '250g', label: '250g', price: 1200, available: true, weightGrams: 250 }],
    wholesale: 1000,
    passport: {
      variety: 'Mamra',
      certifications: ['organic'],
    },
    claimsVerification: {
      status: 'verified',
      verifiedAt: '2026-11-01',
      notes: 'SENTINEL_INTERNAL_VERIFIED_NOTES',
    },
  };

  const pUnverified: any = {
    schemaVersion: 1,
    id: 'almonds-unverified',
    revision: 1,
    active: true,
    status: 'published',
    orderMode: 'standard',
    name_en: 'Unverified Almonds',
    name_ur: '',
    name_ar: '',
    desc_en: 'Description',
    desc_ur: '',
    desc_ar: '',
    category: 'dry-fruits',
    image: '/images/almonds.jpg',
    prices: { '250g': 1200 },
    variants: [{ id: '250g', label: '250g', price: 1200, available: true, weightGrams: 250 }],
    wholesale: 1000,
    passport: {
      variety: 'Kaghzi',
      certifications: ['halal', 'organic'],
    },
    claimsVerification: {
      status: 'unverified',
      notes: 'SENTINEL_INTERNAL_UNVERIFIED_AUDIT_NOTES',
    },
  };

  await db.collection('products').doc('almonds-verified').set(pVerified);
  await db.collection('products').doc('almonds-unverified').set(pUnverified);

  const app = express();
  app.use(express.json());
  app.use(createCatalogRouter({ getDb: () => db, requireAdmin: (_req, _res, next) => next() }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. GET /api/catalog
    const listRes = await fetch(`${baseUrl}/api/catalog`);
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    const listRawText = JSON.stringify(listJson);

    assert.equal(listRawText.includes('SENTINEL_INTERNAL_VERIFIED_NOTES'), false);
    assert.equal(listRawText.includes('SENTINEL_INTERNAL_UNVERIFIED_AUDIT_NOTES'), false);

    const vFromList = listJson.products.find((p: any) => p.id === 'almonds-verified');
    assert.ok(vFromList);
    assert.deepEqual(vFromList.passport?.certifications, ['organic']);
    assert.equal(vFromList.claimsVerification?.status, 'verified');
    assert.equal(vFromList.claimsVerification?.notes, undefined);

    const uFromList = listJson.products.find((p: any) => p.id === 'almonds-unverified');
    assert.ok(uFromList);
    assert.equal(uFromList.claimsVerification?.status, 'unverified');
    assert.equal(uFromList.passport?.certifications, undefined, 'Unverified certifications must be suppressed from public /api/catalog');
    assert.equal(uFromList.claimsVerification?.notes, undefined);

    // 2. GET /api/catalog/products/:id
    const singleVerifiedRes = await fetch(`${baseUrl}/api/catalog/products/almonds-verified`);
    assert.equal(singleVerifiedRes.status, 200);
    const singleVJson = await singleVerifiedRes.json();
    assert.equal(JSON.stringify(singleVJson).includes('SENTINEL_INTERNAL'), false);
    assert.deepEqual(singleVJson.product.passport?.certifications, ['organic']);
    assert.equal(singleVJson.product.claimsVerification?.notes, undefined);

    const singleUnverifiedRes = await fetch(`${baseUrl}/api/catalog/products/almonds-unverified`);
    assert.equal(singleUnverifiedRes.status, 200);
    const singleUJson = await singleUnverifiedRes.json();
    assert.equal(JSON.stringify(singleUJson).includes('SENTINEL_INTERNAL'), false);
    assert.equal(singleUJson.product.passport?.certifications, undefined, 'Unverified certs suppressed on single item');
    assert.equal(singleUJson.product.claimsVerification?.notes, undefined);
  } finally {
    server.closeAllConnections?.();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('Persistence & Clearing: explicit null clears passport, media and claims without resurrecting old data', async () => {
  const { db } = memoryFirestore();
  const productId = 'pista';
  invalidateCatalogCache();

  // Initial document with passport, mediaFocalPoint, cropMode, claimsVerification
  await db.collection('products').doc(productId).set({
    schemaVersion: 1,
    id: productId,
    revision: 1,
    active: true,
    status: 'published',
    orderMode: 'standard',
    name_en: 'Pistachios',
    name_ur: '',
    name_ar: '',
    desc_en: 'Description',
    desc_ur: '',
    desc_ar: '',
    category: 'dry-fruits',
    image: '/images/pista.jpg',
    prices: { '250g': 1200 },
    variants: [{ id: '250g', label: '250g', price: 1200, available: true, weightGrams: 250 }],
    wholesale: 1000,
    pricePer100g: 500,
    passport: {
      variety: 'Akbari',
      roastLevel: 'salted',
      bestBeforeDays: 90,
      certifications: ['halal'],
    },
    claimsVerification: {
      status: 'verified',
      verifiedAt: '2026-11-01',
      notes: 'Initial verification',
    },
    mediaFocalPoint: { x: 0.2, y: 0.8 },
    cropMode: 'cover',
  });

  // Explicitly clear all new fields
  const clearPayload = {
    expectedRevision: 1,
    passport: null,
    claimsVerification: null,
    mediaFocalPoint: null,
    cropMode: null,
  };

  const updated = await updateAdminProduct({
    db,
    productId,
    body: clearPayload,
    actorUid: 'admin-1',
  });

  assert.equal(updated.revision, 2);
  assert.equal(updated.passport, undefined, 'Passport must be cleared');
  assert.equal(updated.claimsVerification, undefined, 'ClaimsVerification must be cleared');
  assert.equal(updated.mediaFocalPoint, undefined, 'MediaFocalPoint must be cleared');
  assert.equal(updated.cropMode, undefined, 'CropMode must be cleared');

  // Verify reload from database confirms fields are truly deleted
  const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
  const reloaded = snapshot.products.find(p => p.id === productId);
  assert.ok(reloaded);
  assert.equal(reloaded.passport, undefined);
  assert.equal(reloaded.claimsVerification, undefined);
  assert.equal(reloaded.mediaFocalPoint, undefined);
  assert.equal(reloaded.cropMode, undefined);
});

test('Shelf-life clearing: clearing bestBeforeDays removes it without converting to 0', async () => {
  const { db } = memoryFirestore();
  const productId = 'pista-shelf';
  invalidateCatalogCache();

  await db.collection('products').doc(productId).set({
    schemaVersion: 1,
    id: productId,
    revision: 1,
    active: true,
    status: 'published',
    orderMode: 'standard',
    name_en: 'Pistachios',
    name_ur: '',
    name_ar: '',
    desc_en: 'Description',
    desc_ur: '',
    desc_ar: '',
    category: 'dry-fruits',
    image: '/images/pista.jpg',
    prices: { '250g': 1200 },
    variants: [{ id: '250g', label: '250g', price: 1200, available: true, weightGrams: 250 }],
    wholesale: 1000,
    passport: {
      variety: 'Akbari',
      bestBeforeDays: 180,
    },
  });

  // Update passport without bestBeforeDays (cleared)
  const updatePayload = {
    expectedRevision: 1,
    passport: {
      variety: 'Akbari',
      bestBeforeDays: undefined, // Cleared input
    },
  };

  const updated = await updateAdminProduct({
    db,
    productId,
    body: updatePayload,
    actorUid: 'admin-1',
  });

  assert.equal(updated.passport?.variety, 'Akbari');
  assert.equal(updated.passport?.bestBeforeDays, undefined, 'Shelf life must be undefined, never 0');
});

test('Re-verification Safety: modifying certifications or passport facts automatically revokes verified status', async () => {
  const { db } = memoryFirestore();
  const productId = 'dates-reverify';
  invalidateCatalogCache();

  await db.collection('products').doc(productId).set({
    schemaVersion: 1,
    id: productId,
    revision: 1,
    active: true,
    status: 'published',
    orderMode: 'standard',
    name_en: 'Ajwa Dates',
    name_ur: '',
    name_ar: '',
    desc_en: 'Description',
    desc_ur: '',
    desc_ar: '',
    category: 'dry-fruits',
    image: '/images/ajwa.jpg',
    prices: { '250g': 1200 },
    variants: [{ id: '250g', label: '250g', price: 1200, available: true, weightGrams: 250 }],
    wholesale: 1000,
    passport: {
      variety: 'Aliya Ajwa',
      certifications: ['organic'],
    },
    claimsVerification: {
      status: 'verified',
      verifiedAt: '2026-10-25',
      notes: 'Audited harvest certificate',
    },
  });

  // Admin edits certifications by adding 'halal' without explicitly providing claimsVerification reconfirmation
  const editPayload = {
    expectedRevision: 1,
    passport: {
      variety: 'Aliya Ajwa',
      certifications: ['organic', 'halal'],
    },
  };

  const updated = await updateAdminProduct({
    db,
    productId,
    body: editPayload,
    actorUid: 'admin-1',
  });

  assert.equal(updated.revision, 2);
  assert.equal(updated.claimsVerification?.status, 'unverified', 'Status must drop to unverified upon content change');
  assert.equal(updated.claimsVerification?.verifiedAt, undefined, 'Verified date must be cleared');

  // Verify that in public projection, certifications are suppressed because status is now unverified
  const publicView = stripPrivateProductFields(updated);
  assert.equal(publicView.passport?.certifications, undefined, 'Newly modified unverified claims must not reach public DTO');
});

test('Catalog Health Report: audits unverified claims and missing allergen advisories', () => {
  const unverifiedProduct: Product = {
    id: 'test-unverified',
    name_en: 'Organic Golden Raisins',
    name_ur: 'سنہری کشمش',
    name_ar: 'زبيب ذهبي',
    desc_en: 'Sun-dried sweet raisins',
    desc_ur: 'دھوپ میں خشک میٹھی کشمش',
    desc_ar: 'زبيب حلو مجفف بالشمس',
    category: 'dry-fruits',
    active: true,
    status: 'published',
    orderMode: 'standard',
    image: '/images/products/raisins.jpg',
    imageName: null,
    prices: { '250g': 500 },
    wholesale: 400,
    passport: {
      certifications: ['organic', 'halal'],
    },
    claimsVerification: {
      status: 'unverified',
    },
  };

  const report1 = generateCatalogHealthReport({
    products: [unverifiedProduct],
    hamperBoxes: [],
    storedProductDocIds: ['test-unverified'],
  });

  const unverifiedIssue = report1.issues.find(i => i.code === 'UNVERIFIED_CERTIFICATION_CLAIM');
  assert.ok(unverifiedIssue, 'Must flag UNVERIFIED_CERTIFICATION_CLAIM');
  assert.equal(unverifiedIssue?.severity, 'MERCHANT_JUDGMENT');

  const allergenIssue = report1.issues.find(i => i.code === 'MISSING_ALLERGEN_ADVISORY');
  assert.ok(allergenIssue, 'Must flag MISSING_ALLERGEN_ADVISORY when no allergen info provided');

  // Verify that once verified and allergen info is added, issues clear
  const verifiedProduct: Product = {
    ...unverifiedProduct,
    passport: {
      ...unverifiedProduct.passport,
      allergens: ['Packed in a facility handling tree nuts'],
    },
    claimsVerification: {
      status: 'verified',
      verifiedAt: '2026-11-01',
    },
  };

  const report2 = generateCatalogHealthReport({
    products: [verifiedProduct],
    hamperBoxes: [],
    storedProductDocIds: ['test-unverified'],
  });

  assert.equal(report2.issues.filter(i => i.code === 'UNVERIFIED_CERTIFICATION_CLAIM').length, 0);
  assert.equal(report2.issues.filter(i => i.code === 'MISSING_ALLERGEN_ADVISORY').length, 0);
});
