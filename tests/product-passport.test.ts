import test from 'node:test';
import assert from 'node:assert/strict';
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

test('validateCropMode: enforces allowed crop modes', () => {
  assert.equal(validateCropMode('cover'), 'cover');
  assert.equal(validateCropMode('contain'), 'contain');
  assert.equal(validateCropMode('custom'), 'custom');

  assert.throws(
    () => validateCropMode('stretch'),
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_CROP_MODE'
  );
});

test('validateDynamicProduct: seamlessly integrates passport, focal point, and claims', () => {
  const baseCandidate = {
    id: 'test-mamra-badam',
    name_en: 'Premium Mamra Badam',
    desc_en: 'Single-origin wild harvested almonds',
    category: 'dry-fruits',
    status: 'published',
    prices: { '250g': 1500, '500g': 2900 },
    image: '/images/products/mamra.jpg',
    passport: {
      variety: 'Gardi Mamra',
      roastLevel: 'raw',
      ingredients: ['100% Raw Almonds'],
      allergens: ['Tree nuts'],
      bestBeforeDays: 240,
      certifications: ['halal', 'raw_natural'],
    },
    claimsVerification: {
      status: 'verified',
      verifiedAt: '2026-10-30',
      notes: 'Direct orchard procurement verified',
    },
    mediaFocalPoint: { x: 0.5, y: 0.3 },
    cropMode: 'cover',
  };

  const product = validateDynamicProduct(baseCandidate);
  assert.equal(product.id, 'test-mamra-badam');
  assert.equal(product.passport?.variety, 'Gardi Mamra');
  assert.equal(product.passport?.roastLevel, 'raw');
  assert.equal(product.claimsVerification?.status, 'verified');
  assert.equal(product.mediaFocalPoint?.y, 0.3);
  assert.equal(product.cropMode, 'cover');

  // Strip private fields check
  const publicView = stripPrivateProductFields(product);
  assert.equal(publicView.passport?.variety, 'Gardi Mamra');
  assert.equal(publicView.claimsVerification?.status, 'verified');
  assert.equal(publicView.mediaFocalPoint?.x, 0.5);
  assert.equal(publicView.cropMode, 'cover');
});

test('Persistence round-trip: admin update persists passport and increments revision', async () => {
  const { db } = memoryFirestore();
  const productId = 'pista';
  invalidateCatalogCache();

  // Seed initial pista document in memoryFirestore
  await db.collection('products').doc(productId).set({
    schemaVersion: 1,
    id: productId,
    revision: 2,
    active: true,
    status: 'published',
    orderMode: 'standard',
    name_en: 'Royal Iranian Pistachios',
    name_ur: 'شاہی ایرانی پستہ',
    name_ar: 'فستق إيراني ملكي',
    desc_en: 'Freshly roasted lightly salted pistachios',
    desc_ur: 'تازہ بھنا ہوا ہلکا نمکین پستہ',
    desc_ar: 'فستق محمص ومملح خفيف',
    category: 'dry-fruits',
    image: '/images/products/pista.jpg',
    prices: { '250g': 1200, '500g': 2200, '1kg': 4500 },
    variants: [
      { id: '250g', label: '250g', price: 1200, available: true, weightGrams: 250 },
      { id: '500g', label: '500g', price: 2200, available: true, weightGrams: 500 },
      { id: '1kg', label: '1kg', price: 4500, available: true, weightGrams: 1000 },
    ],
    wholesale: 4000,
    pricePer100g: 500,
  });

  const updatePayload = {
    expectedRevision: 2,
    passport: {
      variety: 'Akbari Jumbo',
      roastLevel: 'salted',
      processingMethod: 'Slow roasted in copper vats',
      ingredients: ['Pistachios', 'Sea Salt'],
      allergens: ['Tree Nuts (Pistachios)'],
      storageInstructions: 'Keep refrigerated for maximum crunch.',
      bestBeforeDays: 120,
      certifications: ['halal', 'raw_natural'],
    },
    claimsVerification: {
      status: 'verified',
      verifiedAt: '2026-11-01',
      notes: 'Import bill of lading verified',
    },
    mediaFocalPoint: { x: 0.6, y: 0.4 },
    cropMode: 'cover',
  };

  const updated = await updateAdminProduct({
    db,
    productId,
    body: updatePayload,
    actorUid: 'admin-auditor-1',
  });

  assert.equal(updated.revision, 3);
  assert.equal(updated.passport?.variety, 'Akbari Jumbo');
  assert.equal(updated.claimsVerification?.status, 'verified');
  assert.equal(updated.mediaFocalPoint?.x, 0.6);
  assert.equal(updated.cropMode, 'cover');

  // Reload authoritative catalog
  const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
  const reloaded = snapshot.products.find(p => p.id === productId);
  assert.ok(reloaded, 'Product pista must be found');
  assert.equal(reloaded.revision, 3);
  assert.equal(reloaded.passport?.variety, 'Akbari Jumbo');
  assert.equal(reloaded.passport?.roastLevel, 'salted');
  assert.equal(reloaded.claimsVerification?.status, 'verified');
  assert.equal(reloaded.mediaFocalPoint?.y, 0.4);
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
      status: 'unverified', // Unverified certifications!
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
