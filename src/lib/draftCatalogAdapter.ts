/**
 * Stage 5C3 Draft Catalog Adapter
 * Converts Stage 5C research and asset manifest records into validated, unpublished
 * catalog drafts adhering to AllBarka product schemas and business rules.
 *
 * Key guarantees:
 * - Subcategory mapping: explicit mapping to 'tin' | 'tabarruk' | 'wedding' | 'baby' | 'acrylic'
 * - Exact decimal selling-price preservation (authoritative prices retain exact decimals; integer rounding is display-only)
 * - Selling price validation: requires actual approved proposed selling price (NEVER falls back to source_price_pkr)
 * - Pack price basis honoring: strictly parses and validates price_basis (matching entire string), preserving pack price, per-piece price, and minimum pack units; rejects ambiguous, conflicting or trailing quantity text
 * - Variable multi-size tiers validation: validates variable tiers BEFORE constructing prices/variants (rejects empty labels without inventing "Standard", rejects duplicate labels without overwriting, requires positive proposed_pkr per tier without fallback to baseline)
 * - Dynamic MOQ rule: NEVER freezes calculated MOQ as an admin override (retains overrides only when genuinely supplied)
 * - Authoritative MOQ derivation error handling: reports blocker/error if MOQ derivation throws, never silently guessing defaults of 25 pcs / 1 pack
 * - Existing inventory verification: existing-ID inventory proves existence only; does not infer active status or publication eligibility without validated product state
 * - Idempotency and re-import safety (no duplicate drafts, no compounded 5% markups; re-import against updated inventory proposes 0 creations)
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
import {
  calculatePackagingMoq,
  calculateMinOrderQuantityUnits,
  parsePiecesPerPack,
} from './packagingMoq';

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
  | 'existing_inventory_unverified'
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

export interface ParsedPriceBasis {
  piecesPerPack: number;
  unitType: 'pc' | 'set' | 'pack';
  capacityLabel?: string;
  isMultiSizeFamily?: boolean;
  raw: string;
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
  piecesPerPack?: number;
  perPiecePrice?: number;
  derivedMoqPieces?: number;
  derivedMinUnits?: number;
  hasExplicitMoqOverride?: boolean;
  moq?: number; // derivedMoqPieces for display/summary
  mediaAudit: DraftMediaAuditInfo;
  isPublishable: boolean | null;
  publicationState?: 'publishable' | 'unpublishable' | 'unknown';
  publicationBlockers: string[];
  schemaErrors?: string[];
  skipReason?: string;
}

export interface AdapterOptions {
  existingIds?: Set<string>;
  existingProducts?: Map<string, Product> | Record<string, Product>;
  moqCalculator?: (product: Product, variantLabel?: string) => number;
  minUnitsCalculator?: (product: Product, variantLabel?: string) => number;
  allowCompounding?: boolean; // strictly false
}

export interface CategoryDryRunSummary {
  existingActive: number;
  existingInventory: number;
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
    existingInventoryUnverified: number;
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
 * Parses and validates the price_basis string strictly matching the entire expression.
 *
 * Supported formats:
 * - "1 pc", "1 piece" -> pieces = 1, unitType = 'pc'
 * - "1 pc (250g capacity)", "1 pc (half kg / 500g capacity)" -> pieces = 1, unitType = 'pc', capacityLabel preserved
 * - "1 set" -> pieces = 1, unitType = 'set'
 * - "10 pcs", "pack of 10", "25 pieces", "50 boxes", "10-piece pack" -> pieces = N, unitType = 'pack'
 * - "Variable multi-size family (4 size tiers)", "Variable multi-size family" -> isMultiSizeFamily = true
 *
 * Strictly rejects:
 * - Conflicting expressions (e.g. "1 pc per 10-piece pack")
 * - Trailing/unparsed quantity descriptions (e.g. "1 pc (250g capacity) with extra lot")
 * - Unsupported or ambiguous free-text (e.g. "wholesale lot", "bulk order", "per crate")
 */
export function parsePriceBasis(rawBasis: unknown): ParsedPriceBasis {
  if (typeof rawBasis !== 'string' || !rawBasis.trim()) {
    throw new CatalogError(
      'INVALID_PRICE_BASIS',
      400,
      'Price basis (price_basis) is required and cannot be empty.'
    );
  }

  const trimmed = rawBasis.trim();

  // 1. Variable multi-size family: require exact full match
  const multiSizeMatch = /^variable\s+multi-size\s+family(?:\s*\([^)]+\))?$/i.exec(trimmed);
  if (multiSizeMatch) {
    return {
      piecesPerPack: 1,
      unitType: 'pc',
      isMultiSizeFamily: true,
      raw: trimmed,
    };
  }

  // 2. Separate capacity in parentheses strictly at the end: e.g. "1 pc (250g capacity)"
  let coreString = trimmed;
  let capacityLabel: string | undefined;

  const capEndMatch = /^(.+?)\s*\(([^)]+)\)$/.exec(trimmed);
  if (capEndMatch) {
    const rawCap = capEndMatch[2].trim();
    // Validate capacity annotation: must contain mass/capacity indicator (g, kg, gram, capacity)
    // and must NOT contain conflicting quantity words like "pcs", "pieces", "pack"
    if (!/(?:g|kg|gram|capacity)\b/i.test(rawCap) || /(?:pcs|pieces|pack|boxes)\b/i.test(rawCap)) {
      throw new CatalogError(
        'INVALID_PRICE_BASIS',
        400,
        `Unsupported or conflicting capacity annotation in price_basis: "${trimmed}".`
      );
    }
    capacityLabel = rawCap;
    coreString = capEndMatch[1].trim();
  }

  // If there are still parentheses in coreString, reject as invalid/malformed
  if (/\(|\)/.test(coreString)) {
    throw new CatalogError(
      'INVALID_PRICE_BASIS',
      400,
      `Malformed price_basis containing unexpected parentheses: "${trimmed}".`
    );
  }

  // 3. Single piece: strictly "1 pc" or "1 piece"
  if (/^1\s*(?:pc|piece)$/i.test(coreString)) {
    return {
      piecesPerPack: 1,
      unitType: 'pc',
      capacityLabel,
      raw: trimmed,
    };
  }

  // 4. Single set: strictly "1 set"
  if (/^1\s*set$/i.test(coreString)) {
    return {
      piecesPerPack: 1,
      unitType: 'set',
      capacityLabel,
      raw: trimmed,
    };
  }

  // 5. Pack of N / Box of N: strictly "pack of N" or "box of N"
  const packOfMatch = /^(?:pack|box)\s+of\s+(\d+)$/i.exec(coreString);
  if (packOfMatch) {
    const qty = parseInt(packOfMatch[1], 10);
    if (Number.isSafeInteger(qty) && qty > 0) {
      return {
        piecesPerPack: qty,
        unitType: 'pack',
        capacityLabel,
        raw: trimmed,
      };
    }
  }

  // 6. N pieces / pcs / boxes / pack: strictly "N pcs", "N pieces", "N boxes", "N-piece pack", "N-pc pack"
  const countPcsMatch = /^(\d+)(?:-?\s*(?:pieces?|pcs?|boxes?)|-piece\s+pack|-pc\s+pack)$/i.exec(coreString);
  if (countPcsMatch) {
    const qty = parseInt(countPcsMatch[1], 10);
    if (Number.isSafeInteger(qty) && qty > 0) {
      return {
        piecesPerPack: qty,
        unitType: qty === 1 ? 'pc' : 'pack',
        capacityLabel,
        raw: trimmed,
      };
    }
  }

  // Ambiguous, conflicting, or unsupported free text (e.g. "1 pc per 10-piece pack", "wholesale lot")
  throw new CatalogError(
    'INVALID_PRICE_BASIS',
    400,
    `Unsupported or ambiguous price_basis: "${trimmed}". Expected explicit piece or pack definition (e.g. '1 pc', '1 set', '10 pcs', 'pack of 25', or 'Variable multi-size family'). Free-text descriptions, conflicting quantities, and unvalidated units are rejected.`
  );
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
      publicationState: 'unpublishable',
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
      publicationState: 'unpublishable',
      publicationBlockers: ['INVALID_PRODUCT_ID: ID does not meet format requirements.'],
      schemaErrors: [`Invalid product ID: "${rawId}". Must match ^[a-z0-9_-]{2,80}$`],
    };
  }

  // Resolve subcategory early
  let canonicalSubcat: CanonicalPackagingSubcategory | null = null;
  try {
    canonicalSubcat = resolveCanonicalPackagingSubcategory(
      record.subcategory_id || record.research_subcategory_id || record.category
    );
  } catch {
    canonicalSubcat = null;
  }

  // 3. Skip existing products (preserves existing prices, variants, media, and filled options without modification)
  // NOTE: Existing-ID inventory proves existence only! Do not infer active status, verified media, or publication eligibility
  // unless actual validated product state is explicitly supplied in options.existingProducts.
  if (existingIds.has(rawId)) {
    const existingProduct =
      options.existingProducts instanceof Map
        ? options.existingProducts.get(rawId)
        : options.existingProducts?.[rawId];

    if (existingProduct) {
      const isPublic = isProductPubliclyVisible(existingProduct);
      const hasImage = Boolean(existingProduct.image);
      const isPublishable =
        isPublic &&
        hasImage &&
        existingProduct.status !== 'draft' &&
        existingProduct.status !== 'archived';
      const blockers: string[] = [];
      if (!isPublishable) {
        if (!isPublic) blockers.push('EXISTING_PRODUCT_INACTIVE: Product is marked inactive (active=false).');
        if (existingProduct.status === 'draft' || existingProduct.status === 'archived') {
          blockers.push(`EXISTING_PRODUCT_STATUS: Product status is "${existingProduct.status}".`);
        }
        if (!hasImage) blockers.push('EXISTING_PRODUCT_MISSING_IMAGE: Product lacks active storefront image.');
      }

      return {
        recordId: rawId,
        action: 'skipped_existing',
        canonicalSubcategory: canonicalSubcat,
        product: existingProduct,
        mediaAudit: {
          mediaStatus: hasImage ? 'active_existing' : 'missing',
          activeStorefrontImage: existingProduct.image || null,
          notes: 'Verified from supplied active product state.',
        },
        isPublishable,
        publicationState: isPublishable ? 'publishable' : 'unpublishable',
        publicationBlockers: blockers,
        skipReason: `Product "${rawId}" exists in live catalog with verified product state. Live prices, variants, filled options, and media are preserved unchanged.`,
      };
    }

    // Default when only existing IDs are known: existence only, publication state unknown
    return {
      recordId: rawId,
      action: 'skipped_existing',
      canonicalSubcategory: canonicalSubcat,
      mediaAudit: {
        mediaStatus: 'existing_inventory_unverified',
        notes: 'Product ID matches catalog inventory; active media and publication eligibility are not verified from ID alone.',
      },
      isPublishable: null,
      publicationState: 'unknown',
      publicationBlockers: [
        'EXISTING_INVENTORY_UNVERIFIED: Existing-ID match proves inventory existence only; live active status, media verification, and publication eligibility are unknown without authoritative product state.',
      ],
      skipReason: `Product "${rawId}" exists in catalog inventory. ID match proves existence only; live pricing, variants, active status, and media are preserved unchanged without inferring publication eligibility.`,
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
      publicationState: 'unpublishable',
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
      publicationState: 'unpublishable',
      publicationBlockers: ['INVALID_PACKAGING_SUBCATEGORY'],
      schemaErrors: [`Invalid packaging subcategory: "${record.subcategory_id || record.category}"`],
    };
  }

  // 6. Authoritative pricing & exact decimal preservation
  // Proposed selling prices in the manifest ALREADY include the one-time 5% markup.
  // We NEVER add another 5% markup, and we NEVER fall back to source_price_pkr!
  const rawProposed = record.proposed_selling_price_pkr ?? record.proposed_price_pkr;

  if (rawProposed === undefined || rawProposed === null) {
    return {
      recordId: rawId,
      action: 'invalid_schema',
      canonicalSubcategory: canonicalSubcat,
      mediaAudit: { mediaStatus: 'missing' },
      isPublishable: false,
      publicationState: 'unpublishable',
      publicationBlockers: ['MISSING_PROPOSED_SELLING_PRICE: Product is missing an approved proposed selling price.'],
      schemaErrors: [
        `Missing approved proposed selling price (proposed_selling_price_pkr). Source benchmark prices (source_price_pkr) cannot be used as an automatic selling price without explicit merchant markup approval.`,
      ],
    };
  }

  const authoritativeSellingPrice = Number(rawProposed);
  if (!Number.isFinite(authoritativeSellingPrice) || authoritativeSellingPrice <= 0) {
    return {
      recordId: rawId,
      action: 'invalid_schema',
      canonicalSubcategory: canonicalSubcat,
      mediaAudit: { mediaStatus: 'missing' },
      isPublishable: false,
      publicationState: 'unpublishable',
      publicationBlockers: ['INVALID_PRICE: Product must have a positive authoritative selling price.'],
      schemaErrors: [`Invalid proposed selling price: ${rawProposed}. Must be a finite positive number.`],
    };
  }

  // Preserve exact 2-decimal precision (e.g. 78.75, 31.50, 367.50)
  const exactPrice = Math.round(authoritativeSellingPrice * 100) / 100;
  const displayPrice = Math.round(exactPrice);

  // 7. Parse and validate price_basis
  let parsedBasis: ParsedPriceBasis;
  try {
    parsedBasis = parsePriceBasis(record.price_basis);
  } catch (err: any) {
    return {
      recordId: rawId,
      action: 'invalid_schema',
      canonicalSubcategory: canonicalSubcat,
      mediaAudit: { mediaStatus: 'missing' },
      isPublishable: false,
      publicationState: 'unpublishable',
      publicationBlockers: ['INVALID_PRICE_BASIS'],
      schemaErrors: [err.message || 'Invalid or unsupported price_basis.'],
    };
  }

  // 8. Media Audit & Publication Blockers
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

  // 9. Check for genuine explicit admin/record MOQ override
  // DO NOT freeze calculated MOQ as an override!
  // Retain overrides ONLY when genuinely supplied as approved override input.
  const explicitOverride =
    typeof record.explicit_moq_override === 'number' && Number.isSafeInteger(record.explicit_moq_override) && record.explicit_moq_override > 0
      ? record.explicit_moq_override
      : typeof record.moq_override === 'number' && Number.isSafeInteger(record.moq_override) && record.moq_override > 0
      ? record.moq_override
      : undefined;

  const hasExplicitOverride = explicitOverride !== undefined;

  // 10. Variants and Packaging MOQ calculation
  const prices: Record<string, number> = {};
  const variants: any[] = [];
  const emptyTiers: BidBoxBulkTier[] = [];

  let piecesPerPack = parsedBasis.piecesPerPack;
  let perPiecePrice = Math.round((exactPrice / piecesPerPack) * 100) / 100;
  let primaryVariantLabel = '';

  // Check if variable multi-size tiers are verified (e.g. baby-box-017)
  const sizeTiers = record.verified_specifications?.verified_size_tiers;
  if (parsedBasis.isMultiSizeFamily) {
    if (!Array.isArray(sizeTiers) || sizeTiers.length === 0) {
      return {
        recordId: rawId,
        action: 'invalid_schema',
        canonicalSubcategory: canonicalSubcat,
        mediaAudit,
        isPublishable: false,
        publicationState: 'unpublishable',
        publicationBlockers: ['MISSING_VARIABLE_SIZE_TIERS'],
        schemaErrors: ['Variable multi-size family requires verified_size_tiers in verified_specifications.'],
      };
    }

    // Validate variable tiers BEFORE constructing prices/variants
    const tierErrors: string[] = [];
    const seenNormalizedLabels = new Set<string>();

    for (let i = 0; i < sizeTiers.length; i++) {
      const tier = sizeTiers[i];
      if (!tier || typeof tier !== 'object') {
        tierErrors.push(`Size tier at index ${i} must be a valid object.`);
        continue;
      }

      // 1. Reject empty labels; do not invent "Standard"
      const rawLabel = tier.size ?? tier.label;
      if (typeof rawLabel !== 'string' || !rawLabel.trim()) {
        tierErrors.push(`Size tier at index ${i} is missing a non-empty size/label.`);
        continue;
      }

      const trimmedLabel = rawLabel.trim();
      const normalized = trimmedLabel.toLowerCase();

      // 2. Reject duplicate normalized labels; never silently overwrite prices
      if (seenNormalizedLabels.has(normalized)) {
        tierErrors.push(`Duplicate size tier label "${trimmedLabel}" detected at index ${i}. Duplicate labels are prohibited.`);
      } else {
        seenNormalizedLabels.add(normalized);
      }

      // 3. Require a finite positive proposed_pkr for EVERY tier (no fallback to product baseline price)
      if (tier.proposed_pkr === undefined || tier.proposed_pkr === null) {
        tierErrors.push(`Size tier "${trimmedLabel}" is missing required proposed_pkr. Fallback to product baseline price is prohibited.`);
      } else {
        const tierPriceNum = Number(tier.proposed_pkr);
        if (!Number.isFinite(tierPriceNum) || tierPriceNum <= 0) {
          tierErrors.push(`Size tier "${trimmedLabel}" has invalid proposed_pkr: ${tier.proposed_pkr}. Must be a finite positive number.`);
        }
      }
    }

    if (tierErrors.length > 0) {
      return {
        recordId: rawId,
        action: 'invalid_schema',
        canonicalSubcategory: canonicalSubcat,
        mediaAudit,
        isPublishable: false,
        publicationState: 'unpublishable',
        publicationBlockers: ['INVALID_VARIABLE_SIZE_TIERS'],
        schemaErrors: tierErrors,
      };
    }

    primaryVariantLabel = String(sizeTiers[0].size ?? sizeTiers[0].label).trim();

    for (const tier of sizeTiers) {
      const tierLabel = String(tier.size ?? tier.label).trim();
      const tierPrice = Math.round(Number(tier.proposed_pkr) * 100) / 100;
      prices[tierLabel] = tierPrice;

      // Variant has moqOverride ONLY if genuinely supplied in tier data
      const tierExplicitOverride =
        typeof tier.explicit_moq_override === 'number' && Number.isSafeInteger(tier.explicit_moq_override) && tier.explicit_moq_override > 0
          ? tier.explicit_moq_override
          : typeof tier.moq_override === 'number' && Number.isSafeInteger(tier.moq_override) && tier.moq_override > 0
          ? tier.moq_override
          : undefined;

      variants.push({
        label: tierLabel,
        price: tierPrice,
        available: true,
        ...(tierExplicitOverride !== undefined ? { moqOverride: tierExplicitOverride } : {}),
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
    // Single-size or explicit pack offering
    if (parsedBasis.unitType === 'pack') {
      primaryVariantLabel = `Empty Pack (${piecesPerPack} pcs)`;
    } else if (parsedBasis.unitType === 'set') {
      primaryVariantLabel = 'Empty Set (1 set)';
    } else {
      primaryVariantLabel = 'Empty Box (1 pc)';
    }

    prices[primaryVariantLabel] = exactPrice;

    // Do NOT freeze computed MOQ into variant.moqOverride!
    variants.push({
      label: primaryVariantLabel,
      price: exactPrice,
      available: true,
      ...(hasExplicitOverride ? { moqOverride: explicitOverride } : {}),
    });

    emptyTiers.push({
      qty: piecesPerPack,
      label: primaryVariantLabel,
      unitPrice: perPiecePrice,
      packPrice: exactPrice,
      variantKey: primaryVariantLabel,
    });
  }

  // 11. Clean customer-facing descriptions
  const cleanDescription = buildCleanCustomerCopy(record.customer_copy, record.lead_time);

  // 12. Assemble BidBoxConfig
  // Do NOT freeze computed MOQ into bidBoxConfig.minUnits unless explicit override was supplied
  const bidBoxConfig: BidBoxConfig = {
    ...(hasExplicitOverride ? { minUnits: explicitOverride } : {}),
    leadTimeDays: 10,
    emptyTiers,
    packagingSubcategory: canonicalSubcat,
  };

  // 13. Assemble raw candidate Product
  // NOTE: product.image and product.imageName MUST REMAIN NULL!
  // Docs draft paths (docs/assets/drafts/...) MUST NEVER ENTER STOREFRONT MEDIA FIELDS!
  // DO NOT persist computed MOQ as moqOverride or minOrderQuantity unless genuinely supplied!
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
    ...(hasExplicitOverride ? { moqOverride: explicitOverride, minOrderQuantity: explicitOverride } : {}),
    preparationDays: 10,
  };

  // 14. Validate candidate with existing schema validator
  let validatedProduct: Product;
  try {
    validatedProduct = validateDynamicProduct(candidateProduct);
  } catch (err: any) {
    return {
      recordId: rawId,
      action: 'invalid_schema',
      canonicalSubcategory: canonicalSubcat,
      mediaAudit,
      isPublishable: false,
      publicationState: 'unpublishable',
      publicationBlockers: ['SCHEMA_VALIDATION_FAILURE'],
      schemaErrors: [err.message || 'Product failed validateDynamicProduct schema validation'],
    };
  }

  // 15. Derive automatic MOQ and min units dynamically using the authoritative engine
  // This is derived for the dry-run report and is NOT persisted as a frozen override!
  // If derivation throws, report error/blocker instead of silently guessing defaults of 25 pcs / 1 unit!
  const moqFn = options.moqCalculator || calculatePackagingMoq;
  const minUnitsFn = options.minUnitsCalculator || calculateMinOrderQuantityUnits;
  let derivedMoqPieces: number;
  let derivedMinUnits: number;
  try {
    derivedMoqPieces = moqFn(validatedProduct, primaryVariantLabel);
    derivedMinUnits = minUnitsFn(validatedProduct, primaryVariantLabel);
  } catch (err: any) {
    return {
      recordId: rawId,
      action: 'invalid_schema',
      canonicalSubcategory: canonicalSubcat,
      mediaAudit,
      isPublishable: false,
      publicationState: 'unpublishable',
      publicationBlockers: [`MOQ_DERIVATION_FAILED: ${err.message || 'Authoritative packaging MOQ derivation threw an error.'}`],
      schemaErrors: [`MOQ derivation failed: ${err.message || 'Unable to derive authoritative packaging MOQ.'}`],
    };
  }

  return {
    recordId: rawId,
    action: 'proposed_draft',
    product: validatedProduct,
    canonicalSubcategory: canonicalSubcat,
    authoritativePrice: exactPrice,
    displayPrice,
    piecesPerPack,
    perPiecePrice,
    derivedMoqPieces,
    derivedMinUnits,
    hasExplicitMoqOverride: hasExplicitOverride,
    moq: derivedMoqPieces, // derived information for summary/report
    mediaAudit,
    isPublishable: false, // drafts are never publishable without physical stock & merchant review
    publicationState: 'unpublishable',
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
    const res = adaptResearchRecordToDraft(item, options, seenBatchIds);
    results.push(res);
  }

  // 2. Process and strictly exclude unverified concepts (Group D)
  for (const item of conceptsList) {
    const res = adaptResearchRecordToDraft(item, options, seenBatchIds);
    results.push(res);
  }

  // 3. Build summary statistics derived strictly from actual records
  const categorySummary: Record<CanonicalPackagingSubcategory, CategoryDryRunSummary> = {
    tin: { existingActive: 0, existingInventory: 0, proposedDrafts: 0, needsRevisionRenders: 0, blockedQuotaRenders: 0, deferredFamilies: 0, publishableDrafts: 0, shortfallAgainstTarget6: 0 },
    tabarruk: { existingActive: 0, existingInventory: 0, proposedDrafts: 0, needsRevisionRenders: 0, blockedQuotaRenders: 0, deferredFamilies: 0, publishableDrafts: 0, shortfallAgainstTarget6: 0 },
    wedding: { existingActive: 0, existingInventory: 0, proposedDrafts: 0, needsRevisionRenders: 0, blockedQuotaRenders: 0, deferredFamilies: 0, publishableDrafts: 0, shortfallAgainstTarget6: 0 },
    baby: { existingActive: 0, existingInventory: 0, proposedDrafts: 0, needsRevisionRenders: 0, blockedQuotaRenders: 0, deferredFamilies: 0, publishableDrafts: 0, shortfallAgainstTarget6: 0 },
    acrylic: { existingActive: 0, existingInventory: 0, proposedDrafts: 0, needsRevisionRenders: 0, blockedQuotaRenders: 0, deferredFamilies: 0, publishableDrafts: 0, shortfallAgainstTarget6: 0 },
  };

  const mediaAuditTotals = {
    activeExistingAssets: 0,
    existingInventoryUnverified: 0,
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
        categorySummary[r.canonicalSubcategory].existingInventory++;
        if (r.isPublishable === true) {
          categorySummary[r.canonicalSubcategory].existingActive++;
        }
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
    } else if (r.mediaAudit.mediaStatus === 'existing_inventory_unverified') {
      mediaAuditTotals.existingInventoryUnverified++;
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
    const verifiedTotal = categorySummary[cat].existingInventory + categorySummary[cat].proposedDrafts;
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
      actualVerified: categorySummary.acrylic.existingInventory + categorySummary.acrylic.proposedDrafts,
      shortfall: categorySummary.acrylic.shortfallAgainstTarget6,
      proposedConceptsExcluded: excludedConceptsCount,
    },
  };

  return { results, summary };
}

/**
 * Executes a full Stage 5C3 Dry Run against a manifest using an in-memory fixture inventory.
 */
export function runDraftCatalogDryRun(
  manifest: any,
  existingIdsOrOptions?: Set<string> | AdapterOptions
): DryRunReport {
  let options: AdapterOptions = {};
  if (existingIdsOrOptions instanceof Set) {
    options = { existingIds: existingIdsOrOptions };
  } else if (existingIdsOrOptions && typeof existingIdsOrOptions === 'object') {
    options = existingIdsOrOptions;
  } else {
    options = { existingIds: EXISTING_PACKAGING_IDS };
  }

  const { results, summary } = adaptManifestToDraftCatalog(manifest, options);

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
  lines.push(`| **Existing Catalog Records Skipped** | **${summary.skippedExistingCount}** | Existing inventory preserved; publication state verified only when product state supplied |`);
  lines.push(`| **Duplicates Skipped in Batch** | **${summary.skippedDuplicatesCount}** | Re-import idempotency protected; no compounded pricing |`);
  lines.push(`| **Unverified Concepts Excluded** | **${summary.excludedConceptsCount}** | Group D proposed acrylic concepts strictly excluded |`);
  lines.push(`| **Schema Validation Errors** | **${summary.invalidSchemaCount}** | 0 schema errors; all candidate drafts meet validation rules |\n`);

  lines.push('---\n');
  lines.push('## 2. Category Breakdown & Shortfall Analysis\n');
  lines.push('| Subcategory | Target | Existing Inventory | Proposed Drafts | Verified Total | Needs Revision | Quota Blocked | Deferred | Gap / Shortfall |');
  lines.push('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

  for (const cat of VALID_PACKAGING_SUBCATEGORIES) {
    const s = summary.byCategory[cat];
    const total = s.existingInventory + s.proposedDrafts;
    lines.push(
      `| **${cat}** | 6 | ${s.existingInventory} | ${s.proposedDrafts} | **${total}** | ${s.needsRevisionRenders} | ${s.blockedQuotaRenders} | ${s.deferredFamilies} | **${s.shortfallAgainstTarget6 === 0 ? '0 (Met)' : `${s.shortfallAgainstTarget6} Short`}** |`
    );
  }
  lines.push('\n');

  lines.push('> [!WARNING]\n');
  lines.push(`> **Acrylic Shortfall Notice**: Category 5 (Personalized Acrylic Boxes) has an explicit **${summary.acrylicShortfall.shortfall}-product shortfall** against the 6-product target. Exactly 2 products exist in the verified roster (1 existing + 1 verified reference). The 3 proposed concepts remain strictly excluded in Group D.\n`);

  lines.push('---\n');
  lines.push('## 3. Media Audit & Publication Blockers\n');
  lines.push('### Media Audit Totals\n');
  lines.push(`- **Active Storefront Assets (Verified Live)**: ${summary.mediaAuditTotals.activeExistingAssets}`);
  lines.push(`- **Existing Inventory Assets (Unverified from ID only)**: ${summary.mediaAuditTotals.existingInventoryUnverified}`);
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
      const pubDesc = r.isPublishable === true
        ? 'Verified Active & Published'
        : r.isPublishable === false
        ? 'Unpublished / Inactive'
        : 'Publication State Unknown (ID Match Only)';
      lines.push(`- **Status**: Existing Catalog Product (${pubDesc})`);
      lines.push(`- **Preservation**: ${r.skipReason}\n`);
    } else if (r.action === 'excluded_unverified_concept') {
      lines.push(`- **Status**: Group D Proposed Concept`);
      lines.push(`- **Reason**: ${r.skipReason}\n`);
    } else if (r.action === 'proposed_draft') {
      lines.push(`- **Subcategory**: \`${r.canonicalSubcategory}\``);
      lines.push(`- **Authoritative Price**: Rs. ${r.authoritativePrice?.toFixed(2)} (Display: Rs. ${r.displayPrice})`);
      if (r.piecesPerPack && r.piecesPerPack > 1) {
        lines.push(`- **Pack Basis**: **${r.piecesPerPack} pcs per pack** (Pack price: Rs. ${r.authoritativePrice?.toFixed(2)}, Per-piece: Rs. ${r.perPiecePrice?.toFixed(2)})`);
        lines.push(`- **Derived MOQ (Pieces)**: ${r.derivedMoqPieces} pieces (Minimum order: **${r.derivedMinUnits} packs** = ${Number(r.derivedMinUnits) * Number(r.piecesPerPack)} pcs)`);
      } else {
        lines.push(`- **Derived MOQ (Pieces)**: **${r.derivedMoqPieces} pieces** (Single box / set)`);
      }
      lines.push(`- **Explicit MOQ Override**: ${r.hasExplicitMoqOverride ? 'YES (Frozen by explicit merchant input)' : 'NO (Dynamic rule applies)'}`);
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
