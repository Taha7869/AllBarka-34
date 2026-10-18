/**
 * Stage 5C3 Catalog Adapter Regression Tests
 *
 * Verifies:
 * 1. Subcategory mapping and schema validation across all 5 subcategories.
 * 2. Exact decimal selling-price preservation (Rs. 78.75 remains 78.75; no compounding).
 * 3. Existing catalog products skipped without altering prices, variants, media, or filled options.
 * 4. Re-import idempotency and duplicate input ID deduplication.
 * 5. Authoritative packaging MOQ calculation and pack capacity handling (250g box = 1 pc, not 250 pcs).
 * 6. Public catalog projection isolation (drafts have active=false, status='draft', invisible to storefront).
 * 7. Unverified concepts strictly excluded (Group D acrylic concepts).
 * 8. Missing and rejected media cannot silently become publishable (docs/ paths never enter image field).
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptResearchRecordToDraft,
  adaptManifestToDraftCatalog,
  resolveCanonicalPackagingSubcategory,
  DESCRIPTIVE_TO_CANONICAL_SUBCATEGORY,
  EXISTING_PACKAGING_IDS,
} from '../src/lib/draftCatalogAdapter';
import {
  validateDynamicProduct,
  isProductPubliclyVisible,
  stripPrivateProductFields,
  VALID_PACKAGING_SUBCATEGORIES,
  CatalogError,
} from '../src/lib/catalogSchema';
import { calculatePackagingMoq, parsePiecesPerPack } from '../src/lib/packagingMoq';
import { PRODUCTS } from '../src/data/products';

test('Regression 1: Subcategory mapping and validation across all 5 canonical subcategories', () => {
  // 1. Verify descriptive mappings
  assert.equal(resolveCanonicalPackagingSubcategory('signature-tin-boxes'), 'tin');
  assert.equal(resolveCanonicalPackagingSubcategory('signature_tin_boxes'), 'tin');
  assert.equal(resolveCanonicalPackagingSubcategory('tin'), 'tin');

  assert.equal(resolveCanonicalPackagingSubcategory('hajj-umrah-tabarruk-sets'), 'tabarruk');
  assert.equal(resolveCanonicalPackagingSubcategory('hajj_umrah_tabarruk_sets'), 'tabarruk');
  assert.equal(resolveCanonicalPackagingSubcategory('tabarruk'), 'tabarruk');

  assert.equal(resolveCanonicalPackagingSubcategory('wedding-favor-boxes-pouches'), 'wedding');
  assert.equal(resolveCanonicalPackagingSubcategory('wedding_favor_boxes_pouches'), 'wedding');
  assert.equal(resolveCanonicalPackagingSubcategory('wedding'), 'wedding');

  assert.equal(resolveCanonicalPackagingSubcategory('baby-announcement-boxes'), 'baby');
  assert.equal(resolveCanonicalPackagingSubcategory('baby_announcement_boxes'), 'baby');
  assert.equal(resolveCanonicalPackagingSubcategory('baby'), 'baby');

  assert.equal(resolveCanonicalPackagingSubcategory('personalized-acrylic-boxes'), 'acrylic');
  assert.equal(resolveCanonicalPackagingSubcategory('personalized_acrylic_boxes'), 'acrylic');
  assert.equal(resolveCanonicalPackagingSubcategory('acrylic'), 'acrylic');

  // 2. Reject unsupported subcategories
  assert.throws(
    () => resolveCanonicalPackagingSubcategory('luxury-furniture'),
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_PACKAGING_SUBCATEGORY'
  );
  assert.throws(
    () => resolveCanonicalPackagingSubcategory(''),
    (err: any) => err instanceof CatalogError && err.code === 'INVALID_PACKAGING_SUBCATEGORY'
  );
});

test('Regression 2: Exact decimal selling-price preservation and anti-compounding', () => {
  // Test item with fractional decimal price (source Rs. 75.00 * 1.05 = Rs. 78.75)
  const decimalRecord = {
    stable_id: 'wedding-card-box-001',
    subcategory_id: 'wedding-favor-boxes-pouches',
    name: 'Floral Cardstock Favor Box (3.5x3.5x2 in)',
    source_price_pkr: 75.0,
    proposed_selling_price_pkr: 78.75,
    customer_copy: {
      summary: 'Cardstock favor box.',
    },
  };

  const result = adaptResearchRecordToDraft(decimalRecord);
  assert.equal(result.action, 'proposed_draft');
  assert.ok(result.product);

  // Authoritative price must retain exact decimal: 78.75
  assert.equal(result.authoritativePrice, 78.75);
  assert.equal(result.displayPrice, 79);
  assert.equal(result.product.prices['Empty Box (1 pc)'], 78.75);
  assert.equal(result.product.variants?.[0].price, 78.75);

  // Schema validation round-trip must preserve exact decimal
  const revalidated = validateDynamicProduct(result.product);
  assert.equal(revalidated.prices['Empty Box (1 pc)'], 78.75);
  assert.equal(revalidated.variants?.[0].price, 78.75);

  // Verify other known fractional prices: Rs. 31.50 and Rs. 367.50
  const pyramid = adaptResearchRecordToDraft({
    stable_id: 'wedding-pyramid-box',
    subcategory_id: 'wedding-favor-boxes-pouches',
    name: 'Floral Cardstock Pyramid Favor Box',
    proposed_selling_price_pkr: 31.5,
  });
  assert.equal(pyramid.authoritativePrice, 31.5);
  assert.equal(pyramid.product?.prices['Empty Box (1 pc)'], 31.5);

  const safaa = adaptResearchRecordToDraft({
    stable_id: 'tabarruk-set-no43',
    subcategory_id: 'hajj-umrah-tabarruk-sets',
    name: 'Safaa 3-Piece Pilgrimage Set',
    proposed_selling_price_pkr: 367.5,
  });
  assert.equal(safaa.authoritativePrice, 367.5);
  assert.equal(safaa.product?.prices['Empty Set (1 set)'], 367.5);

  // Anti-compounding check: the adapter must use proposed_selling_price_pkr directly
  // and NEVER apply another 5% on top of an already marked-up price
  assert.equal(safaa.product?.prices['Empty Set (1 set)'], 367.5);
  assert.notEqual(safaa.product?.prices['Empty Set (1 set)'], 367.5 * 1.05);
});

test('Regression 3: Existing/admin products skipped without modifying saved fields or filled options', () => {
  // Existing product: bid-box-umrah-tabarruk has custom filled options in live catalog
  const existingSeed = PRODUCTS.find((p) => p.id === 'bid-box-umrah-tabarruk')!;
  assert.ok(existingSeed);

  // Simulate an incoming research record trying to re-import the existing product
  const incomingRecord = {
    stable_id: 'bid-box-umrah-tabarruk',
    subcategory_id: 'hajj-umrah-tabarruk-sets',
    name: 'Generic Empty Umrah Tabarruk Set',
    proposed_selling_price_pkr: 200.0,
    customer_copy: {
      summary: 'Generic empty packaging wording.',
    },
  };

  const result = adaptResearchRecordToDraft(incomingRecord, {
    existingIds: EXISTING_PACKAGING_IDS,
  });

  assert.equal(result.action, 'skipped_existing');
  assert.equal(result.product, undefined); // No draft product produced
  assert.ok(result.skipReason?.includes('already exists in live catalog'));

  // The existing catalog seed remains completely intact
  assert.equal(existingSeed.name_en, 'Umrah & Hajj Tabarruk Box Set');
  assert.equal(existingSeed.prices['Empty Box (1 pc)'], 200);
  assert.ok(existingSeed.bidBoxConfig?.filledOptions && existingSeed.bidBoxConfig.filledOptions.length > 0);
  assert.equal(
    existingSeed.bidBoxConfig?.filledOptions[0].label,
    'Filled Standard (Irani Dates, Badam, Kaju & Kishmish)'
  );
});

test('Regression 4: Re-import idempotency and duplicate input IDs handling', () => {
  const records = [
    {
      stable_id: 'tin-box-002',
      subcategory_id: 'signature-tin-boxes',
      name: 'Mughal Floral Keepsake Tin',
      proposed_selling_price_pkr: 105.0,
    },
    {
      // Duplicate entry with same ID in the same batch
      stable_id: 'tin-box-002',
      subcategory_id: 'signature-tin-boxes',
      name: 'Duplicate Mughal Floral Tin',
      proposed_selling_price_pkr: 105.0,
    },
  ];

  const { results, summary } = adaptManifestToDraftCatalog({ products: records });

  assert.equal(results.length, 2);
  assert.equal(results[0].action, 'proposed_draft');
  assert.equal(results[1].action, 'skipped_duplicate_in_batch');
  assert.equal(summary.proposedDraftsCount, 1);
  assert.equal(summary.skippedDuplicatesCount, 1);

  // Idempotency: Running the same manifest again produces identical counts
  const run2 = adaptManifestToDraftCatalog({ products: records });
  assert.equal(run2.summary.proposedDraftsCount, 1);
  assert.equal(run2.summary.skippedDuplicatesCount, 1);
});

test('Regression 5: Authoritative packaging MOQ calculation and pack capacity handling', () => {
  // Test standard single-piece calculation: min(25, max(1, ceil(5000 / price)))
  // 1. Rs. 105.00 -> ceil(5000 / 105) = 48 -> capped at 25
  const tin002 = adaptResearchRecordToDraft({
    stable_id: 'tin-box-002',
    subcategory_id: 'signature-tin-boxes',
    name: 'Mughal Floral Circular Keepsake Tin',
    proposed_selling_price_pkr: 105.0,
  });
  assert.equal(tin002.moq, 25);
  assert.equal(tin002.product?.bidBoxConfig?.minUnits, 25);

  // 2. Rs. 273.00 -> ceil(5000 / 273) = 19
  const babyHalfKg = adaptResearchRecordToDraft({
    stable_id: 'baby-box-half-kg',
    subcategory_id: 'baby-announcement-boxes',
    name: 'Half Kg Square Baby Announcement Box',
    proposed_selling_price_pkr: 273.0,
  });
  assert.equal(babyHalfKg.moq, 19);
  assert.equal(babyHalfKg.product?.bidBoxConfig?.minUnits, 19);

  // 3. Rs. 462.00 -> ceil(5000 / 462) = 11
  const baby1kg = adaptResearchRecordToDraft({
    stable_id: 'baby-box-1kg-boy',
    subcategory_id: 'baby-announcement-boxes',
    name: 'Baby Boy 1kg Announcement Sweet Box',
    proposed_selling_price_pkr: 462.0,
  });
  assert.equal(baby1kg.moq, 11);
  assert.equal(baby1kg.product?.bidBoxConfig?.minUnits, 11);

  // 4. "250g box capacity" must be treated as capacity, NOT 250 pieces!
  const baby250g = adaptResearchRecordToDraft({
    stable_id: 'baby-box-250g-part',
    subcategory_id: 'baby-announcement-boxes',
    name: 'Compact 250g Card Baby Announcement Box',
    proposed_selling_price_pkr: 157.5,
  });
  // Pieces per pack for "Empty Box (1 pc)" is 1 piece holding 250g, NOT 250 pieces
  assert.equal(parsePiecesPerPack('Empty Box (1 pc)'), 1);
  assert.equal(parsePiecesPerPack('250g Capacity Box'), 1);
  // MOQ calculation: ceil(5000 / 157.50) = 32 -> capped at 25 pcs
  assert.equal(baby250g.moq, 25);
  assert.equal(baby250g.product?.bidBoxConfig?.emptyTiers[0].qty, 1);

  // 5. Multi-size tiers (baby-box-017)
  const multiSize = adaptResearchRecordToDraft({
    stable_id: 'baby-box-017',
    subcategory_id: 'baby-announcement-boxes',
    name: 'Multi-Size Baby Announcement Box Family',
    proposed_selling_price_pkr: 157.5,
    asset_status: 'deferred_unverified_variable_family',
    verified_specifications: {
      verified_size_tiers: [
        { size: '250 gram', proposed_pkr: 157.5, display_pkr: 158 },
        { size: 'Half kg', proposed_pkr: 262.5, display_pkr: 263 },
        { size: '1 kg', proposed_pkr: 367.5, display_pkr: 368 },
        { size: '2 kg', proposed_pkr: 472.5, display_pkr: 473 },
      ],
    },
  });
  assert.equal(multiSize.action, 'proposed_draft');
  assert.equal(multiSize.product?.variants?.length, 4);
  assert.equal(multiSize.product?.prices['250 gram'], 157.5);
  assert.equal(multiSize.product?.variants?.[0].moqOverride, 25);
  assert.equal(multiSize.product?.prices['Half kg'], 262.5);
  assert.equal(multiSize.product?.variants?.[1].moqOverride, 20); // ceil(5000/262.5) = 20
  assert.equal(multiSize.product?.prices['1 kg'], 367.5);
  assert.equal(multiSize.product?.variants?.[2].moqOverride, 14); // ceil(5000/367.5) = 14
  assert.equal(multiSize.product?.prices['2 kg'], 472.5);
  assert.equal(multiSize.product?.variants?.[3].moqOverride, 11); // ceil(5000/472.5) = 11
});

test('Regression 6: Public catalog projection isolation (drafts strictly excluded from public view)', () => {
  const draft = adaptResearchRecordToDraft({
    stable_id: 'tin-box-002',
    subcategory_id: 'signature-tin-boxes',
    name: 'Mughal Floral Keepsake Tin',
    proposed_selling_price_pkr: 105.0,
  });

  const p = draft.product!;
  assert.equal(p.status, 'draft');
  assert.equal(p.active, false);

  // Existing projection engine check: isProductPubliclyVisible MUST return false
  assert.equal(isProductPubliclyVisible(p), false);

  // stripPrivateProductFields must safely sanitize fields without making it visible
  const stripped = stripPrivateProductFields(p);
  assert.equal(isProductPubliclyVisible(stripped), false);
  assert.equal(stripped.id, 'tin-box-002');
  assert.equal(stripped.packagingSubcategory, 'tin');
});

test('Regression 7: Unverified concepts strictly excluded (Group D acrylic concepts)', () => {
  const conceptRecord = {
    concept_id: 'acrylic-box-sliding-tray-4in',
    category_id: 'celebration-boxes',
    subcategory_id: 'personalized-acrylic-boxes',
    proposed_name: 'Clear Acrylic Sliding Sleeve Box (4x4x2 in)',
    status: 'proposed_concept',
    evidence_status: 'unverified_concept',
  };

  const res = adaptResearchRecordToDraft(conceptRecord);
  assert.equal(res.action, 'excluded_unverified_concept');
  assert.equal(res.product, undefined);
  assert.ok(res.publicationBlockers.some((b) => b.includes('UNVERIFIED_CONCEPT')));
});

test('Regression 8: Missing and rejected media cannot silently become publishable (docs/ paths segregated)', () => {
  // 1. tabarruk-set-012: component mismatch -> needs_revision
  const set012 = adaptResearchRecordToDraft({
    stable_id: 'tabarruk-set-012',
    subcategory_id: 'hajj-umrah-tabarruk-sets',
    name: 'Medina Moon Tabarruk Set',
    proposed_selling_price_pkr: 210.0,
    asset_status: 'needs_revision',
  });
  assert.equal(set012.action, 'proposed_draft');
  assert.equal(set012.mediaAudit.mediaStatus, 'needs_revision');
  assert.equal(set012.isPublishable, false);
  assert.ok(set012.publicationBlockers.some((b) => b.includes('MEDIA_NEEDS_REVISION')));
  // Storefront image fields MUST be null; docs/ path NEVER placed in product.image
  assert.equal(set012.product?.image, null);
  assert.equal(set012.product?.imageName, null);

  // 2. tabarruk-set-tijori: feature disparity -> needs_revision
  const tijori = adaptResearchRecordToDraft({
    stable_id: 'tabarruk-set-tijori',
    subcategory_id: 'hajj-umrah-tabarruk-sets',
    name: 'Tijori Grand Presentation Tabarruk Suite',
    proposed_selling_price_pkr: 420.0,
    asset_status: 'needs_revision',
  });
  assert.equal(tijori.mediaAudit.mediaStatus, 'needs_revision');
  assert.equal(tijori.isPublishable, false);
  assert.ok(tijori.publicationBlockers.some((b) => b.includes('MEDIA_NEEDS_REVISION')));
  assert.equal(tijori.product?.image, null);

  // 3. Quota blocked product
  const blocked = adaptResearchRecordToDraft({
    stable_id: 'wedding-pyramid-box',
    subcategory_id: 'wedding-favor-boxes-pouches',
    name: 'Floral Pyramid Box',
    proposed_selling_price_pkr: 31.5,
    asset_status: 'blocked_by_upstream_quota_exhaustion',
  });
  assert.equal(blocked.mediaAudit.mediaStatus, 'blocked_by_quota');
  assert.equal(blocked.isPublishable, false);
  assert.ok(blocked.publicationBlockers.some((b) => b.includes('MEDIA_BLOCKED_BY_QUOTA')));

  // 4. Deferred variable family (baby-box-017)
  const deferred = adaptResearchRecordToDraft({
    stable_id: 'baby-box-017',
    subcategory_id: 'baby-announcement-boxes',
    name: 'Multi-Size Baby Announcement Box Family',
    proposed_selling_price_pkr: 157.5,
    asset_status: 'deferred_unverified_variable_family',
  });
  assert.equal(deferred.mediaAudit.mediaStatus, 'deferred');
  assert.equal(deferred.isPublishable, false);
  assert.ok(deferred.publicationBlockers.some((b) => b.includes('VARIABLE_FAMILY_UNVERIFIED_DIMENSIONS')));

  // 5. Approved draft concept render (e.g. tin-box-002)
  const approved = adaptResearchRecordToDraft({
    stable_id: 'tin-box-002',
    subcategory_id: 'signature-tin-boxes',
    name: 'Mughal Floral Circular Keepsake Tin',
    proposed_selling_price_pkr: 105.0,
    asset_status: 'draft_concept_render_complete',
    media: {
      draft_jpg_master: 'docs/assets/drafts/pilot-tin-box-002.jpg',
      draft_webp_derivative: 'docs/assets/drafts/pilot-tin-box-002.webp',
    },
  });
  assert.equal(approved.mediaAudit.mediaStatus, 'approved_draft');
  // Even with approved concept renders, physical warehouse stock confirmation is pending
  assert.equal(approved.isPublishable, false);
  assert.ok(approved.publicationBlockers.some((b) => b.includes('SUPPLIER_SAMPLE_UNCONFIRMED')));
  // Storefront media fields remain null; docs/ path kept in mediaAudit only
  assert.equal(approved.product?.image, null);
  assert.equal(approved.product?.imageName, null);
  assert.equal(approved.mediaAudit.draftWebpDerivative, 'docs/assets/drafts/pilot-tin-box-002.webp');
});
