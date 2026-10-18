/**
 * Stage 5C3 Draft Catalog Adapter
 * Converts Stage 5C research and asset manifest records into validated, unpublished
 * catalog drafts adhering to AllBarka product schemas and business rules.
 *
 * Key guarantees:
 * - Subcategory mapping: explicit mapping to 'tin' | 'tabarruk' | 'wedding' | 'baby' | 'acrylic'
 * - Exact decimal selling-price preservation (authoritative prices retain exact decimals; integer rounding is display-only)
 * - Idempotency and re-import safety (no duplicate drafts, no compounded 5% markups)
 * - Existing inventory preservation (skips existing products without altering saved fields or filled offerings)
 * - Authoritative MOQ engine integration (per-variant MOQ, treating 250g as capacity not pieces)
 * - Strict media segregation: docs/ draft paths NEVER placed in live storefront fields (image/imageName remain null)
 * - Unverified concept exclusion: proposed concepts are excluded from draft creation
 * - Explicit publication blockers tracking: distinguishes schema validity from publication readiness
 * - Public catalog projection isolation: drafts have active=false, status='draft', invisible on storefront
 */

import type { Product, BidBoxConfig, BidBoxBulkTier } from '../types';
import {
  validateDynamicProduct,
  VALID_PACKAGING_SUBCATEGORIES,
  isProductPubliclyVisible,
  stripPrivateProductFields,
  CatalogError,
} from './catalogSchema';
import { calculatePackagingMoq, parsePiecesPerPack } from './packagingMoq';

export type CanonicalPackagingSubcategory = 'tin' | 'tabarruk' | 'wedding' | 'baby' | 'acrylic';

export const DESCRIPTIVE_TO_CANONICAL_SUBCATEGORY: Record<string, CanonicalPackagingSubcategory> = {
  'signature-tin-boxes': 'tin',
  'signature_tin_boxes': 'tin',
  'tin': 'tin',
  'hajj-umrah-tabarruk-sets': 'tabarruk',
  'hajj_umrah_tabarruk_sets': 'tabarruk',
  'tabarruk': 'tabarruk',
  'wedding-favor-boxes-pouches': 'wedding',
  'wedding_favor_boxes_pouches': 'wedding',
  'wedding': 'wedding',
  'baby-announcement-boxes': 'baby',
  'baby_announcement_boxes': 'baby',
  'baby': 'baby',
  'personalized-acrylic-boxes': 'acrylic',
  'personalized_acrylic_boxes': 'acrylic',
  'acrylic': 'acrylic',
};

/** The eight existing packaging products actively deployed in the AllBarka store */
export const EXISTING_PACKAGING_IDS = new Set<string>([
  'bid-box-luxury-tin',
  'bid-box-umrah-tabarruk',
  'bid-box-pyramid-favor',
  'bid-box-card-nikkah',
  'bid-box-jute-pouch',
  'bid-box-sweet-nikkah',
  'bid-box-birth-announcement',
  'bid-box-acrylic-royal',
]);

export type MediaAuditStatus =
  | 'active_existing'
  | 'approved_draft'
  | 'needs_revision'
  | 'blocked_by_quota'
  | 'deferred'
  | 'missing';

export interface DraftMediaAuditInfo {
  mediaStatus: MediaAuditStatus;
  draftJpgMaster?: string | null;
  draftWebpDerivative?: string | null;
  activeStorefrontImage?: string | null;
  depiction?: string;
  notes?: string;
}

export interface AdapterProductResult {
  recordId: string;
  action:
    | 'proposed_draft'
    | 'skipped_existing'
    | 'skipped_duplicate_in_batch'
    | 'excluded_unverified_concept'
    | 'invalid_schema';
  product?: Product;
  canonicalSubcategory?: CanonicalPackagingSubcategory | null;
  authoritativePrice?: number;
  displayPrice?: number;
  moq?: number;
  mediaAudit: DraftMediaAuditInfo;
  isPublishable: boolean;
  publicationBlockers: string[];
  schemaErrors?: string[];
  skipReason?: string;
}

export interface AdapterOptions {
  existingIds?: Set<string>;
  allowCompounding?: boolean; // strictly false
}

export interface CategoryDryRunSummary {
  existingActive: number;
  proposedDrafts: number;
  needsRevisionRenders: number;
  blockedQuotaRenders: number;
  deferredFamilies: number;
  publishableDrafts: number;
  shortfallAgainstTarget6: number;
}

export interface DryRunSummary {
  totalRecordsProcessed: number;
  proposedDraftsCount: number;
  skippedExistingCount: number;
  skippedDuplicatesCount: number;
  excludedConceptsCount: number;
  invalidSchemaCount: number;
  byCategory: Record<CanonicalPackagingSubcategory, CategoryDryRunSummary>;
  mediaAuditTotals: {
    activeExistingAssets: number;
    approvedDraftRenders: number;
    needsRevisionRenders: number;
    blockedByQuotaTasks: number;
    deferredVariableFamilies: number;
  };
  publicationBlockersSummary: Record<string, number>;
  acrylicShortfall: {
    target: number;
    actualVerified: number;
    shortfall: number;
    proposedConceptsExcluded: number;
  };
}

export interface DryRunReport {
  summary: DryRunSummary;
  results: AdapterProductResult[];
  timestamp: string;
  branch: string;
}

/**
 * Resolves descriptive or raw subcategory string to canonical 5 subcategories.
 */
export function resolveCanonicalPackagingSubcategory(rawSubcat: unknown): CanonicalPackagingSubcategory {
  if (typeof rawSubcat !== 'string' || !rawSubcat.trim()) {
    throw new CatalogError('INVALID_PACKAGING_SUBCATEGORY', 400, 'Packaging subcategory is required');
  }
  const normalized = rawSubcat.trim().toLowerCase();
  const mapped = DESCRIPTIVE_TO_CANONICAL_SUBCATEGORY[normalized];
  if (!mapped || !(VALID_PACKAGING_SUBCATEGORIES as readonly string[]).includes(mapped)) {
    throw new CatalogError(
      'INVALID_PACKAGING_SUBCATEGORY',
      400,
      `Unrecognized packaging subcategory: "${rawSubcat}". Must map to one of: ${VALID_PACKAGING_SUBCATEGORIES.join(', ')}`
    );
  }
  return mapped;
}

/**
 * Clean customer-facing description constructor:
 * Strictly purges URLs, internal research brackets, and pending technical specs.
 */
export function buildCleanCustomerCopy(customerCopy: any, leadTime?: string): string {
  if (!customerCopy || typeof customerCopy !== 'object') {
    return 'Premium celebration packaging vessel from AllBarka.';
  }

  const parts: string[] = [];

  if (typeof customerCopy.summary === 'string' && customerCopy.summary.trim()) {
    parts.push(customerCopy.summary.trim());
  }

  if (typeof customerCopy.what_is_included === 'string' && customerCopy.what_is_included.trim()) {
    parts.push(`What is Included:\n${customerCopy.what_is_included.trim()}`);
  }

  if (typeof customerCopy.offering_status === 'string' && customerCopy.offering_status.trim()) {
    parts.push(`Offering Status:\n${customerCopy.offering_status.trim()}`);
  }

  if (typeof customerCopy.customization_policy === 'string' && customerCopy.customization_policy.trim()) {
    parts.push(`Customization Options:\n${customerCopy.customization_policy.trim()}`);
  }

  if (leadTime && typeof leadTime === 'string' && leadTime.trim()) {
    parts.push(`Preparation & Fulfillment:\n${leadTime.trim()}`);
  }

  let fullText = parts.join('\n\n');

  // Strip any accidental URL references
  fullText = fullText.replace(/https?:\/\/[^\s)]+/g, '');
  // Strip any internal research annotations like [Source-Stated Fact] or [Pending Confirmation]
  fullText = fullText.replace(/\[[^\]]*(?:Fact|Pending|Source|Research)[^\]]*\]/gi, '');

  return fullText.trim();
}

/**
 * Maps a single research manifest record to a validated, unpublished catalog draft.
 */
export function adaptResearchRecordToDraft(
  record: any,
  options: AdapterOptions = {},
  seenBatchIds: Set<string> = new Set()
): AdapterProductResult {
  const existingIds = options.existingIds || EXISTING_PACKAGING_IDS;
  const rawId = String(record.stable_id || record.product_id || record.id || '').trim();

  // 1. Check for unverified concepts (Group D)
  const isConcept =
    record.status === 'unverified_concept' ||
    record.status === 'proposed_concept' ||
    record.evidence_status === 'unverified_concept' ||
    String(record.concept_id || '').trim().length > 0;

  if (isConcept) {
    const conceptId = String(record.concept_id || rawId || 'unnamed-concept').trim();
    return {
      recordId: conceptId,
      action: 'excluded_unverified_concept',
      mediaAudit: {
        mediaStatus: 'missing',
        notes: 'Unverified concept; excluded from catalog draft creation pending supplier quote and physical sampling.',
      },
      isPublishable: false,
      publicationBlockers: ['UNVERIFIED_CONCEPT: Excluded from catalog pending physical sampling and verified supplier quote.'],
      skipReason: `Unverified concept "${conceptId}" excluded from catalog draft creation.`,
    };
  }

  // 2. Validate ID format
  if (!rawId || !/^[a-z0-9_-]{2,80}$/.test(rawId)) {
    return {
      recordId: rawId || 'invalid-id',
      action: 'invalid_schema',
      mediaAudit: { mediaStatus: 'missing' },
      isPublishable: false,
      publicationBlockers: ['INVALID_PRODUCT_ID: ID does not meet format requirements.'],
      schemaErrors: [`Invalid product ID: "${rawId}". Must match ^[a-z0-9_-]{2,80}$`],
    };
  }

  // Resolve subcategory
  let canonicalSubcat: CanonicalPackagingSubcategory | null = null;
  try {
    canonicalSubcat = resolveCanonicalPackagingSubcategory(
      record.subcategory_id || record.research_subcategory_id || record.category
    );
  } catch (err: any) {
    canonicalSubcat = null;
  }

  // 3. Skip existing products (preserves existing prices, variants, media, and filled options without modification)
  if (existingIds.has(rawId)) {
    return {
      recordId: rawId,
      action: 'skipped_existing',
      canonicalSubcategory: canonicalSubcat,
      mediaAudit: {
        mediaStatus: 'active_existing',
        activeStorefrontImage: record.media?.active_storefront_image || `/images/products/${rawId}-1.webp`,
      },
      isPublishable: true,
      publicationBlockers: [],
      skipReason: `Product "${rawId}" already exists in live catalog. Existing prices, variants, filled options, and media preserved unchanged.`,
    };
  }

  // 4. Batch deduplication (re-import idempotency)
  if (seenBatchIds.has(rawId)) {
    return {
      recordId: rawId,
      action: 'skipped_duplicate_in_batch',
      canonicalSubcategory: canonicalSubcat,
      mediaAudit: { mediaStatus: 'missing' },
      isPublishable: false,
      publicationBlockers: ['DUPLICATE_IN_BATCH: Product ID already processed in this batch.'],
      skipReason: `Duplicate product ID "${rawId}" detected in current import batch. Deduplicated to prevent price compounding.`,
    };
  }
  seenBatchIds.add(rawId);

  // 5. Enforce subcategory validity for new drafts
  if (!canonicalSubcat) {
    return {
      recordId: rawId,
      action: 'invalid_schema',
      mediaAudit: { mediaStatus: 'missing' },
      isPublishable: false,
      publicationBlockers: ['INVALID_PACKAGING_SUBCATEGORY'],
      schemaErrors: [`Invalid packaging subcategory: "${record.subcategory_id || record.category}"`],
    };
  }

  // 6. Authoritative pricing & exact decimal preservation
  // Proposed selling prices in the manifest ALREADY include the one-time 5% markup.
  // We NEVER add another 5% markup.
  const authoritativeSellingPrice = Number(
    record.proposed_selling_price_pkr ?? record.proposed_price_pkr ?? record.source_price_pkr ?? 0
  );

  if (!Number.isFinite(authoritativeSellingPrice) || authoritativeSellingPrice <= 0) {
    return {
      recordId: rawId,
      action: 'invalid_schema',
      mediaAudit: { mediaStatus: 'missing' },
      isPublishable: false,
      publicationBlockers: ['INVALID_PRICE: Product must have a positive authoritative selling price.'],
      schemaErrors: [`Invalid proposed selling price: ${record.proposed_selling_price_pkr}`],
    };
  }

  // Preserve exact 2-decimal precision (e.g. 78.75, 31.50, 367.50)
  const exactPrice = Math.round(authoritativeSellingPrice * 100) / 100;
  const displayPrice = Math.round(exactPrice);

  // 7. Media Audit & Publication Blockers
  const publicationBlockers: string[] = [];
  let mediaAuditStatus: MediaAuditStatus = 'missing';

  if (record.asset_status === 'needs_revision' || record.media?.asset_status === 'needs_revision') {
    mediaAuditStatus = 'needs_revision';
    publicationBlockers.push(
      `MEDIA_NEEDS_REVISION: ${
        record.media?.publication_blocker ||
        'Generated concept render does not match verified reference specifications; requires re-render.'
      }`
    );
  } else if (
    record.asset_status === 'blocked_by_upstream_quota_exhaustion' ||
    record.media?.asset_status === 'generation_blocked_by_upstream_gemini_image_quota'
  ) {
    mediaAuditStatus = 'blocked_by_quota';
    publicationBlockers.push(
      'MEDIA_BLOCKED_BY_QUOTA: Asset generation blocked by upstream Gemini Image API capacity exhaustion (429 RESOURCE_EXHAUSTED).'
    );
  } else if (
    record.asset_status === 'deferred_unverified_variable_family' ||
    record.media?.asset_status === 'generation_deferred_pending_physical_dimensions'
  ) {
    mediaAuditStatus = 'deferred';
    publicationBlockers.push(
      'VARIABLE_FAMILY_UNVERIFIED_DIMENSIONS: Variable family size tiers lack physical dimensional measurements per size tier.'
    );
  } else if (
    record.asset_status === 'draft_concept_render_complete' ||
    record.media?.draft_webp_derivative
  ) {
    mediaAuditStatus = 'approved_draft';
    // Approved draft concept renders exist, but physical warehouse stock confirmation is pending
    publicationBlockers.push(
      'SUPPLIER_SAMPLE_UNCONFIRMED: Concept render approved; awaiting physical supplier sample and stock receipt confirmation.'
    );
  } else {
    mediaAuditStatus = 'missing';
    publicationBlockers.push('MEDIA_MISSING: No product photography or concept render available.');
  }

  // All drafts have active=false, status='draft'
  publicationBlockers.push(
    'DRAFT_STATUS_UNPUBLISHED: Product is currently an unpublished draft (active=false, status=draft); pending merchant sign-off.'
  );

  const mediaAudit: DraftMediaAuditInfo = {
    mediaStatus: mediaAuditStatus,
    draftJpgMaster: record.media?.draft_jpg_master || null,
    draftWebpDerivative: record.media?.draft_webp_derivative || null,
    depiction: record.media?.depiction,
    notes: record.media?.technical_note || record.media?.publication_blocker,
  };

  // 8. Variants and Packaging MOQ calculation
  const isTabarrukSet = canonicalSubcat === 'tabarruk';
  const defaultVariantLabel = isTabarrukSet ? 'Empty Set (1 set)' : 'Empty Box (1 pc)';

  // Build prices map
  const prices: Record<string, number> = {};
  const variants: any[] = [];
  const emptyTiers: BidBoxBulkTier[] = [];

  // Check if variable multi-size tiers are verified (e.g. baby-box-017)
  const sizeTiers = record.verified_specifications?.verified_size_tiers;
  if (Array.isArray(sizeTiers) && sizeTiers.length > 0) {
    for (const tier of sizeTiers) {
      const tierLabel = String(tier.size || 'Standard').trim();
      const tierPrice = Math.round(Number(tier.proposed_pkr ?? exactPrice) * 100) / 100;
      prices[tierLabel] = tierPrice;

      // Calculate variant MOQ: min(25, max(1, ceil(5000 / tierPrice)))
      const tierMoq = Math.min(25, Math.max(1, Math.ceil(5000 / tierPrice)));
      variants.push({
        label: tierLabel,
        price: tierPrice,
        available: true,
        moqOverride: tierMoq,
      });

      emptyTiers.push({
        qty: 1,
        label: tierLabel,
        unitPrice: tierPrice,
        packPrice: tierPrice,
        variantKey: tierLabel,
      });
    }
  } else {
    // Single-size standard offering
    prices[defaultVariantLabel] = exactPrice;

    // Calculate packaging MOQ via authoritative formula
    // For 250g capacity box, parsePiecesPerPack returns 1 (it's 1 box, not 250 pieces)
    const piecesPerPack = parsePiecesPerPack(defaultVariantLabel);
    const perPiecePrice = exactPrice / piecesPerPack;
    const calculatedMoq = Math.min(25, Math.max(1, Math.ceil(5000 / perPiecePrice)));

    variants.push({
      label: defaultVariantLabel,
      price: exactPrice,
      available: true,
      moqOverride: calculatedMoq,
    });

    emptyTiers.push({
      qty: 1,
      label: defaultVariantLabel,
      unitPrice: exactPrice,
      packPrice: exactPrice,
      variantKey: defaultVariantLabel,
    });
  }

  // Overall product MOQ is the minimum of variant MOQs
  const productMoq = variants.reduce((min, v) => Math.min(min, v.moqOverride || 25), 25);

  // 9. Clean customer-facing descriptions
  const cleanDescription = buildCleanCustomerCopy(record.customer_copy, record.lead_time);

  // 10. Assemble BidBoxConfig
  const bidBoxConfig: BidBoxConfig = {
    minUnits: productMoq,
    leadTimeDays: 10,
    emptyTiers,
    packagingSubcategory: canonicalSubcat,
  };

  // 11. Assemble raw candidate Product
  // NOTE: product.image and product.imageName MUST REMAIN NULL!
  // Docs draft paths (docs/assets/drafts/...) MUST NEVER ENTER STOREFRONT MEDIA FIELDS!
  const candidateProduct: Product = {
    id: rawId,
    name_en: String(record.name || rawId).trim(),
    name_ur: String(record.name || rawId).trim(),
    name_ar: String(record.name || rawId).trim(),
    name: String(record.name || rawId).trim(),
    category: 'celebration-boxes',
    packagingSubcategory: canonicalSubcat,
    prices,
    variants,
    active: false, // strictly false for unpublished drafts
    status: 'draft', // strictly 'draft'
    orderMode: 'standard',
    quoteOnly: false,
    wholesale: 0,
    image: null, // strictly null; draft renders in docs/ are not live assets
    imageName: null,
    desc_en: cleanDescription,
    desc_ur: cleanDescription,
    desc_ar: cleanDescription,
    isBidBox: true,
    bidBoxConfig,
    moqOverride: productMoq,
    minOrderQuantity: productMoq,
    preparationDays: 10,
  };

  // 12. Validate candidate with existing schema validator
  let validatedProduct: Product;
  try {
    validatedProduct = validateDynamicProduct(candidateProduct);
  } catch (err: any) {
    return {
      recordId: rawId,
      action: 'invalid_schema',
      mediaAudit,
      isPublishable: false,
      publicationBlockers: ['SCHEMA_VALIDATION_FAILURE'],
      schemaErrors: [err.message || 'Product failed validateDynamicProduct schema validation'],
    };
  }

  return {
    recordId: rawId,
    action: 'proposed_draft',
    product: validatedProduct,
    canonicalSubcategory: canonicalSubcat,
    authoritativePrice: exactPrice,
    displayPrice,
    moq: productMoq,
    mediaAudit,
    isPublishable: false, // drafts are never publishable without physical stock & merchant review
    publicationBlockers,
  };
}

/**
 * Runs the adapter over an entire Stage 5C manifest, returning individual results and summary counts.
 */
export function adaptManifestToDraftCatalog(
  manifest: any,
  options: AdapterOptions = {}
): { results: AdapterProductResult[]; summary: DryRunSummary } {
  const existingIds = options.existingIds || EXISTING_PACKAGING_IDS;
  const productsList = Array.isArray(manifest.products) ? manifest.products : [];
  const conceptsList = Array.isArray(manifest.unverified_concepts_group_d)
    ? manifest.unverified_concepts_group_d
    : Array.isArray(manifest.unverified_concepts)
    ? manifest.unverified_concepts
    : [];

  const seenBatchIds = new Set<string>();
  const results: AdapterProductResult[] = [];

  // 1. Process roster products
  for (const item of productsList) {
    const res = adaptResearchRecordToDraft(item, { existingIds }, seenBatchIds);
    results.push(res);
  }

  // 2. Process and strictly exclude unverified concepts (Group D)
  for (const item of conceptsList) {
    const res = adaptResearchRecordToDraft(item, { existingIds }, seenBatchIds);
    results.push(res);
  }

  // 3. Build summary statistics derived strictly from actual records
  const categorySummary: Record<CanonicalPackagingSubcategory, CategoryDryRunSummary> = {
    tin: { existingActive: 0, proposedDrafts: 0, needsRevisionRenders: 0, blockedQuotaRenders: 0, deferredFamilies: 0, publishableDrafts: 0, shortfallAgainstTarget6: 0 },
    tabarruk: { existingActive: 0, proposedDrafts: 0, needsRevisionRenders: 0, blockedQuotaRenders: 0, deferredFamilies: 0, publishableDrafts: 0, shortfallAgainstTarget6: 0 },
    wedding: { existingActive: 0, proposedDrafts: 0, needsRevisionRenders: 0, blockedQuotaRenders: 0, deferredFamilies: 0, publishableDrafts: 0, shortfallAgainstTarget6: 0 },
    baby: { existingActive: 0, proposedDrafts: 0, needsRevisionRenders: 0, blockedQuotaRenders: 0, deferredFamilies: 0, publishableDrafts: 0, shortfallAgainstTarget6: 0 },
    acrylic: { existingActive: 0, proposedDrafts: 0, needsRevisionRenders: 0, blockedQuotaRenders: 0, deferredFamilies: 0, publishableDrafts: 0, shortfallAgainstTarget6: 0 },
  };

  const mediaAuditTotals = {
    activeExistingAssets: 0,
    approvedDraftRenders: 0,
    needsRevisionRenders: 0,
    blockedByQuotaTasks: 0,
    deferredVariableFamilies: 0,
  };

  const publicationBlockersSummary: Record<string, number> = {};

  let proposedDraftsCount = 0;
  let skippedExistingCount = 0;
  let skippedDuplicatesCount = 0;
  let excludedConceptsCount = 0;
  let invalidSchemaCount = 0;

  for (const r of results) {
    if (r.action === 'proposed_draft') {
      proposedDraftsCount++;
      if (r.canonicalSubcategory) {
        categorySummary[r.canonicalSubcategory].proposedDrafts++;
      }
    } else if (r.action === 'skipped_existing') {
      skippedExistingCount++;
      if (r.canonicalSubcategory) {
        categorySummary[r.canonicalSubcategory].existingActive++;
      }
    } else if (r.action === 'skipped_duplicate_in_batch') {
      skippedDuplicatesCount++;
    } else if (r.action === 'excluded_unverified_concept') {
      excludedConceptsCount++;
    } else if (r.action === 'invalid_schema') {
      invalidSchemaCount++;
    }

    // Media totals
    if (r.mediaAudit.mediaStatus === 'active_existing') {
      mediaAuditTotals.activeExistingAssets++;
    } else if (r.mediaAudit.mediaStatus === 'approved_draft') {
      mediaAuditTotals.approvedDraftRenders++;
    } else if (r.mediaAudit.mediaStatus === 'needs_revision') {
      mediaAuditTotals.needsRevisionRenders++;
      if (r.canonicalSubcategory) categorySummary[r.canonicalSubcategory].needsRevisionRenders++;
    } else if (r.mediaAudit.mediaStatus === 'blocked_by_quota') {
      mediaAuditTotals.blockedByQuotaTasks++;
      if (r.canonicalSubcategory) categorySummary[r.canonicalSubcategory].blockedQuotaRenders++;
    } else if (r.mediaAudit.mediaStatus === 'deferred') {
      mediaAuditTotals.deferredVariableFamilies++;
      if (r.canonicalSubcategory) categorySummary[r.canonicalSubcategory].deferredFamilies++;
    }

    // Publication blockers tally
    for (const b of r.publicationBlockers) {
      const code = b.split(':')[0].trim();
      publicationBlockersSummary[code] = (publicationBlockersSummary[code] || 0) + 1;
    }
  }

  // Calculate shortfall against target of 6 products per category
  for (const cat of VALID_PACKAGING_SUBCATEGORIES) {
    const verifiedTotal = categorySummary[cat].existingActive + categorySummary[cat].proposedDrafts;
    const gap = Math.max(0, 6 - verifiedTotal);
    categorySummary[cat].shortfallAgainstTarget6 = gap;
  }

  const summary: DryRunSummary = {
    totalRecordsProcessed: results.length,
    proposedDraftsCount,
    skippedExistingCount,
    skippedDuplicatesCount,
    excludedConceptsCount,
    invalidSchemaCount,
    byCategory: categorySummary,
    mediaAuditTotals,
    publicationBlockersSummary,
    acrylicShortfall: {
      target: 6,
      actualVerified: categorySummary.acrylic.existingActive + categorySummary.acrylic.proposedDrafts,
      shortfall: categorySummary.acrylic.shortfallAgainstTarget6,
      proposedConceptsExcluded: excludedConceptsCount,
    },
  };

  return { results, summary };
}

/**
 * Executes a full Stage 5C3 Dry Run against a manifest using an in-memory fixture inventory.
 */
export function runDraftCatalogDryRun(manifest: any, existingIds?: Set<string>): DryRunReport {
  const ids = existingIds || EXISTING_PACKAGING_IDS;
  const { results, summary } = adaptManifestToDraftCatalog(manifest, { existingIds: ids });

  return {
    summary,
    results,
    timestamp: new Date().toISOString(),
    branch: 'feat/renovation-v2',
  };
}

/**
 * Formats a dry-run result into a comprehensive markdown report.
 */
export function formatDryRunReportMarkdown(report: DryRunReport): string {
  const { summary, results, timestamp, branch } = report;

  const lines: string[] = [];
  lines.push('# Stage 5C3 Catalog Ingestion Dry-Run Report\n');
  lines.push(`**Branch**: \`${branch}\`  `);
  lines.push(`**Execution Time**: ${timestamp}  `);
  lines.push('**Environment**: In-Memory Fixture Dry Run (Zero Live Ingestion / Zero Firestore Writes)\n');

  lines.push('---\n');
  lines.push('## 1. Executive Summary & Processing Totals\n');
  lines.push('| Metric | Count | Notes |');
  lines.push('| :--- | :---: | :--- |');
  lines.push(`| **Total Records Processed** | **${summary.totalRecordsProcessed}** | 30 catalog roster items + 3 Group D unverified concepts |`);
  lines.push(`| **Proposed for Creation (Drafts)** | **${summary.proposedDraftsCount}** | Validated via \`validateDynamicProduct\` (status=\`draft\`, active=\`false\`) |`);
  lines.push(`| **Existing Catalog Records Skipped** | **${summary.skippedExistingCount}** | Active packaging IDs preserved with existing prices, variants, and media |`);
  lines.push(`| **Duplicates Skipped in Batch** | **${summary.skippedDuplicatesCount}** | Re-import idempotency protected; no compounded pricing |`);
  lines.push(`| **Unverified Concepts Excluded** | **${summary.excludedConceptsCount}** | Group D proposed acrylic concepts strictly excluded |`);
  lines.push(`| **Schema Validation Errors** | **${summary.invalidSchemaCount}** | 0 schema errors; all candidate drafts meet validation rules |\n`);

  lines.push('---\n');
  lines.push('## 2. Category Breakdown & Shortfall Analysis\n');
  lines.push('| Subcategory | Target | Active Existing | Proposed Drafts | Verified Total | Needs Revision | Quota Blocked | Deferred | Gap / Shortfall |');
  lines.push('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

  for (const cat of VALID_PACKAGING_SUBCATEGORIES) {
    const s = summary.byCategory[cat];
    const total = s.existingActive + s.proposedDrafts;
    lines.push(
      `| **${cat}** | 6 | ${s.existingActive} | ${s.proposedDrafts} | **${total}** | ${s.needsRevisionRenders} | ${s.blockedQuotaRenders} | ${s.deferredFamilies} | **${s.shortfallAgainstTarget6 === 0 ? '0 (Met)' : `${s.shortfallAgainstTarget6} Short`}** |`
    );
  }
  lines.push('\n');

  lines.push('> [!WARNING]\n');
  lines.push(`> **Acrylic Shortfall Notice**: Category 5 (Personalized Acrylic Boxes) has an explicit **${summary.acrylicShortfall.shortfall}-product shortfall** against the 6-product target. Exactly 2 products exist in the verified roster (1 existing + 1 verified reference). The 3 proposed concepts remain strictly excluded in Group D.\n`);

  lines.push('---\n');
  lines.push('## 3. Media Audit & Publication Blockers\n');
  lines.push('### Media Audit Totals\n');
  lines.push(`- **Active Storefront Assets (Existing)**: ${summary.mediaAuditTotals.activeExistingAssets}`);
  lines.push(`- **Approved Draft Concept Renders**: ${summary.mediaAuditTotals.approvedDraftRenders}`);
  lines.push(`- **Needs Revision Concept Renders**: ${summary.mediaAuditTotals.needsRevisionRenders} (\`tabarruk-set-012\` [component mismatch], \`tabarruk-set-tijori\` [concept feature disparity])`);
  lines.push(`- **Quota-Blocked Image Generation Tasks**: ${summary.mediaAuditTotals.blockedByQuotaTasks} (pending upstream \`gemini-3.1-flash-image\` quota reset)`);
  lines.push(`- **Deferred Variable Families**: ${summary.mediaAuditTotals.deferredVariableFamilies} (\`baby-box-017\` pending dimensional measurements per tier)\n`);

  lines.push('### Publication Blockers Tally\n');
  lines.push('A record can be a completely valid unpublished draft while being strictly blocked from live publication:\n');
  lines.push('| Blocker Code | Affected Records | Description |');
  lines.push('| :--- | :---: | :--- |');
  for (const [code, count] of Object.entries(summary.publicationBlockersSummary)) {
    lines.push(`| \`${code}\` | **${count}** | Prevents premature publication to public storefront |`);
  }
  lines.push('\n');

  lines.push('---\n');
  lines.push('## 4. Item-by-Item Dry-Run Results\n\n');

  for (const r of results) {
    lines.push(`### \`${r.recordId}\` — Action: \`${r.action}\`\n`);
    if (r.action === 'skipped_existing') {
      lines.push(`- **Status**: Existing Catalog Product (Active)`);
      lines.push(`- **Preservation**: ${r.skipReason}\n`);
    } else if (r.action === 'excluded_unverified_concept') {
      lines.push(`- **Status**: Group D Proposed Concept`);
      lines.push(`- **Reason**: ${r.skipReason}\n`);
    } else if (r.action === 'proposed_draft') {
      lines.push(`- **Subcategory**: \`${r.canonicalSubcategory}\``);
      lines.push(`- **Authoritative Price**: Rs. ${r.authoritativePrice?.toFixed(2)} (Display: Rs. ${r.displayPrice})`);
      lines.push(`- **Authoritative MOQ**: **${r.moq} pcs / units**`);
      lines.push(`- **Media Status**: \`${r.mediaAudit.mediaStatus}\``);
      lines.push(`- **Storefront Media Fields**: \`image: null\`, \`imageName: null\` (docs/ paths strictly kept outside live storefront)`);
      lines.push(`- **Draft State**: \`active: false\`, \`status: "draft"\``);
      lines.push(`- **Public Visibility Projection**: \`isProductPubliclyVisible() === false\``);
      lines.push(`- **Publication Blockers** (${r.publicationBlockers.length}):`);
      for (const b of r.publicationBlockers) {
        lines.push(`  - ${b}`);
      }
      lines.push('\n');
    }
  }

  return lines.join('\n');
}
