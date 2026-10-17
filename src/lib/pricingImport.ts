/**
 * Catalog Reference Pricing & Import Markup Engine
 *
 * Implements Rule D2 from AllBarka Master Implementation Prompt v2.0:
 * - Initial NEW reference-derived catalog imports use:
 *     sellingPrice = round(referencePrice * 1.05)
 *   exactly once.
 * - Five percent is markup, not guaranteed profit margin.
 * - Preserves referencePrice, sourceUrl, importTimestamp, and importBatch as private staff fields.
 * - Rounding policy: round once to the nearest whole rupee (half up); never silently round to next Rs. 10.
 * - Re-running import must NOT compound prices or overwrite subsequent admin edits.
 * - Recognizes established prices in canonical `variants`, legacy `prices` maps, and singular `price`.
 * - Multi-variant re-import preserves each variant's distinct merchant price without collapsing to the first price.
 * - Admin saves are final selling prices and never receive additional markup.
 * - Display, checkout, and export code reads the saved selling price directly without compounding.
 */

import type { Product } from '../types';
import { CatalogError, catalogVariantId, validateMoqOverride, type CatalogVariant } from './catalogSchema';

export const REFERENCE_IMPORT_MARKUP_RATE = 0.05; // 5% markup
export const REFERENCE_ROUNDING_POLICY = 'half_up_whole_rupee' as const;

export interface ReferenceImportVariantInput {
  id?: string;
  label: string;
  referencePrice: number;
  available?: boolean;
  weightGrams?: number | null;
  moqOverride?: number | null;
}

export interface ReferencePricingResult {
  sellingPrice: number;
  sellingPrices: Record<string, number>;
  variants: CatalogVariant[];
  rawComputedPrice: number;
  referencePrice: number;
  referencePrices: Record<string, number>;
  markupPercent: number;
  roundingPolicy: typeof REFERENCE_ROUNDING_POLICY;
  isNewImport: boolean;
  preservedExistingPrice: boolean;
  importBatch?: string;
  importTimestamp: string;
  sourceUrl?: string;
}

/**
 * Computes the 5% initial reference import price with strict whole-rupee (half-up) rounding.
 */
export function computeReferenceMarkup(referencePrice: number): {
  sellingPrice: number;
  rawComputedPrice: number;
  markupPercent: number;
  roundingPolicy: typeof REFERENCE_ROUNDING_POLICY;
} {
  if (typeof referencePrice !== 'number' || !Number.isFinite(referencePrice) || referencePrice <= 0) {
    throw new CatalogError(
      'INVALID_REFERENCE_PRICE',
      400,
      'A valid positive, finite reference price is required for catalog import.'
    );
  }

  const rawComputedPrice = referencePrice * (1 + REFERENCE_IMPORT_MARKUP_RATE);
  // Standard Math.round implements half-up rounding to nearest integer
  const sellingPrice = Math.round(rawComputedPrice);

  return {
    sellingPrice,
    rawComputedPrice,
    markupPercent: REFERENCE_IMPORT_MARKUP_RATE,
    roundingPolicy: REFERENCE_ROUNDING_POLICY,
  };
}

/**
 * Validates whether a reference price input is valid (finite, positive number).
 */
export function validateReferencePriceInput(price: unknown): boolean {
  return typeof price === 'number' && Number.isFinite(price) && price > 0;
}

/**
 * Extracts established canonical variants and merchant selling prices from an existing product record.
 * Recognizes canonical `variants` arrays, legacy `prices` maps, and singular `price` fields.
 * Preserves each variant's distinct merchant price, availability, weightGrams, and moqOverride.
 */
export function extractEstablishedVariants(
  existingProduct?: Partial<Product> | Record<string, any> | null,
  defaultLabel = '1 Piece'
): CatalogVariant[] {
  if (!existingProduct || typeof existingProduct !== 'object') {
    return [];
  }

  const prod = existingProduct as Record<string, any>;
  const result: CatalogVariant[] = [];
  const seenLabels = new Set<string>();

  // 1. Canonical variants array (authoritative)
  if (Array.isArray(prod.variants)) {
    for (const rawVar of prod.variants) {
      if (!rawVar || typeof rawVar !== 'object') continue;
      const label = typeof rawVar.label === 'string' ? rawVar.label.trim() : '';
      const price = Number(rawVar.price);
      if (!label || !Number.isFinite(price) || price <= 0 || seenLabels.has(label)) continue;

      seenLabels.add(label);
      const rawVarMoq = rawVar.moqOverride !== undefined ? rawVar.moqOverride : rawVar.minOrderQuantity;
      const validVarMoq =
        typeof rawVarMoq === 'number' && Number.isSafeInteger(rawVarMoq) && rawVarMoq >= 1 && rawVarMoq <= 10000
          ? rawVarMoq
          : undefined;

      result.push({
        id: typeof rawVar.id === 'string' && rawVar.id.trim() ? rawVar.id.trim() : catalogVariantId(label),
        label,
        price: Math.round(price),
        available: rawVar.available !== false,
        weightGrams: Number.isSafeInteger(rawVar.weightGrams) ? rawVar.weightGrams : null,
        ...(typeof validVarMoq === 'number' ? { moqOverride: validVarMoq } : {}),
      });
    }
  }

  // 2. Legacy prices map (for any variant labels not already in canonical variants)
  if (prod.prices && typeof prod.prices === 'object' && !Array.isArray(prod.prices)) {
    for (const [rawLabel, rawPrice] of Object.entries(prod.prices as Record<string, unknown>)) {
      const label = rawLabel.trim();
      const price = Number(rawPrice);
      if (!label || !Number.isFinite(price) || price <= 0 || seenLabels.has(label)) continue;

      seenLabels.add(label);
      const weightGrams =
        prod.shippingWeights && typeof prod.shippingWeights === 'object' && Number.isSafeInteger(prod.shippingWeights[label])
          ? prod.shippingWeights[label]
          : null;

      result.push({
        id: catalogVariantId(label),
        label,
        price: Math.round(price),
        available: true,
        weightGrams,
      });
    }
  }

  // 3. Singular legacy price fallback
  if (result.length === 0 && typeof prod.price === 'number' && Number.isFinite(prod.price) && prod.price > 0) {
    const label = defaultLabel.trim() || '1 Piece';
    result.push({
      id: catalogVariantId(label),
      label,
      price: Math.round(prod.price),
      available: true,
      weightGrams: null,
    });
  }

  return result;
}

/**
 * Normalizes and validates reference price inputs across `referencePrice`, `referencePrices`, and `variants`.
 * Explicitly rejects contradictory or invalid inputs.
 */
function resolveNormalizedReferenceInputs(input: {
  referencePrice?: number;
  referencePrices?: Record<string, number>;
  variants?: ReferenceImportVariantInput[];
  variantLabel?: string;
  existingVariants: CatalogVariant[];
}): {
  primaryReferencePrice: number;
  referencePricesMap: Record<string, number>;
  requestedVariants: ReferenceImportVariantInput[];
} {
  const { referencePrice, referencePrices, variants, variantLabel, existingVariants } = input;

  const hasSingleRef = referencePrice !== undefined;
  const hasRefMap = referencePrices !== undefined;
  const hasVariantsList = variants !== undefined;

  if (!hasSingleRef && !hasRefMap && !hasVariantsList) {
    throw new CatalogError(
      'INVALID_REFERENCE_PRICE',
      400,
      'A valid positive, finite reference price is required for catalog import.'
    );
  }

  if (hasSingleRef && !validateReferencePriceInput(referencePrice)) {
    throw new CatalogError(
      'INVALID_REFERENCE_PRICE',
      400,
      'A valid positive, finite reference price is required for catalog import.'
    );
  }

  if (hasRefMap) {
    if (!referencePrices || typeof referencePrices !== 'object' || Array.isArray(referencePrices)) {
      throw new CatalogError('CONTRADICTORY_IMPORT_INPUT', 400, 'referencePrices must be a non-empty map.');
    }
    const entries = Object.entries(referencePrices);
    if (entries.length === 0) {
      throw new CatalogError('CONTRADICTORY_IMPORT_INPUT', 400, 'referencePrices cannot be empty.');
    }
    for (const [label, val] of entries) {
      if (!label.trim()) {
        throw new CatalogError('CONTRADICTORY_IMPORT_INPUT', 400, 'Variant label in referencePrices cannot be empty.');
      }
      if (!validateReferencePriceInput(val)) {
        throw new CatalogError(
          'INVALID_REFERENCE_PRICE',
          400,
          `Invalid reference price for variant "${label}": must be a positive finite number.`
        );
      }
    }
  }

  if (hasVariantsList) {
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new CatalogError('CONTRADICTORY_IMPORT_INPUT', 400, 'variants list cannot be empty when provided.');
    }
    const seen = new Set<string>();
    for (const v of variants) {
      const label = typeof v?.label === 'string' ? v.label.trim() : '';
      if (!label || seen.has(label)) {
        throw new CatalogError('CONTRADICTORY_IMPORT_INPUT', 400, 'Duplicate or empty variant label in import variants.');
      }
      seen.add(label);
      if (!validateReferencePriceInput(v.referencePrice)) {
        throw new CatalogError(
          'INVALID_REFERENCE_PRICE',
          400,
          `Invalid reference price for variant "${label}": must be a positive finite number.`
        );
      }
      validateMoqOverride(v.moqOverride);
    }
  }

  // Cross-check consistency if multiple forms are provided simultaneously
  if (hasRefMap && hasVariantsList) {
    const mapKeys = Object.keys(referencePrices!).map(k => k.trim());
    if (mapKeys.length !== variants!.length) {
      throw new CatalogError(
        'CONTRADICTORY_IMPORT_INPUT',
        400,
        'Contradictory referencePrices and variants lengths in import input.'
      );
    }
    for (const v of variants!) {
      const label = v.label.trim();
      const mapVal = referencePrices![label] ?? referencePrices![v.label];
      if (mapVal !== v.referencePrice) {
        throw new CatalogError(
          'CONTRADICTORY_IMPORT_INPUT',
          400,
          `Contradictory reference price for variant "${label}" between referencePrices and variants.`
        );
      }
    }
  }

  const defaultLabel =
    (typeof variantLabel === 'string' && variantLabel.trim()) ||
    existingVariants[0]?.label ||
    '1 Piece';

  let requestedVariants: ReferenceImportVariantInput[] = [];
  if (hasVariantsList) {
    requestedVariants = variants!.map(v => ({
      ...v,
      label: v.label.trim(),
    }));
  } else if (hasRefMap) {
    requestedVariants = Object.entries(referencePrices!).map(([label, refPrice]) => ({
      label: label.trim(),
      referencePrice: refPrice,
    }));
  } else {
    requestedVariants = [
      {
        label: defaultLabel,
        referencePrice: referencePrice!,
      },
    ];
  }

  const firstRefPrice = requestedVariants[0].referencePrice;
  if (hasSingleRef && (hasRefMap || hasVariantsList)) {
    // If single referencePrice is also supplied alongside multi-variant inputs, it must match either the first variant or the target variantLabel
    const targetLabel = typeof variantLabel === 'string' && variantLabel.trim() ? variantLabel.trim() : requestedVariants[0].label;
    const matchingVar = requestedVariants.find(v => v.label === targetLabel) || requestedVariants[0];
    if (matchingVar.referencePrice !== referencePrice) {
      throw new CatalogError(
        'CONTRADICTORY_IMPORT_INPUT',
        400,
        'Contradictory referencePrice and variant referencePrices provided.'
      );
    }
  }

  const referencePricesMap: Record<string, number> = {};
  for (const v of requestedVariants) {
    referencePricesMap[v.label] = v.referencePrice;
  }

  return {
    primaryReferencePrice: hasSingleRef ? referencePrice! : firstRefPrice,
    referencePricesMap,
    requestedVariants,
  };
}

/**
 * Applies reference import markup safely to a product record.
 * - If product is new and has no established selling prices, applies 5% markup once per variant.
 * - If product already exists and has established selling prices (in canonical `variants`, `prices`, or `price`)
 *   or prior import metadata, preserves each existing variant's distinct merchant selling price to prevent
 *   compounding or overwriting admin edits.
 * - Rejects contradictory import inputs explicitly with `CatalogError('CONTRADICTORY_IMPORT_INPUT', 400)`.
 */
export function applyReferenceImportPricing(input: {
  referencePrice?: number;
  referencePrices?: Record<string, number>;
  variants?: ReferenceImportVariantInput[];
  variantLabel?: string;
  sourceUrl?: string;
  importBatch?: string;
  existingProduct?: Partial<Product> | Record<string, any> | null;
  forceRecompute?: boolean;
  isNewImport?: boolean;
}): ReferencePricingResult {
  if (!input || typeof input !== 'object') {
    throw new CatalogError('CONTRADICTORY_IMPORT_INPUT', 400, 'Import input object is required.');
  }

  const { sourceUrl, importBatch, existingProduct, forceRecompute, isNewImport } = input;

  if ( existingProduct !== undefined && existingProduct !== null && (typeof existingProduct !== 'object' || Array.isArray(existingProduct)) ) {
    throw new CatalogError('CONTRADICTORY_IMPORT_INPUT', 400, 'existingProduct must be a valid object or null/undefined.');
  }

  if (forceRecompute === true && isNewImport === false) {
    throw new CatalogError(
      'CONTRADICTORY_IMPORT_INPUT',
      400,
      'Cannot specify both forceRecompute: true and isNewImport: false.'
    );
  }

  const defaultLabel =
    (typeof input.variantLabel === 'string' && input.variantLabel.trim()) || '1 Piece';
  const establishedVariants = extractEstablishedVariants(existingProduct, defaultLabel);
  const hasEstablishedPrices = establishedVariants.length > 0;
  const existingRecord = existingProduct && typeof existingProduct === 'object' ? (existingProduct as Record<string, any>) : null;
  const alreadyImported = Boolean(existingRecord?.importBatch || existingRecord?.importTimestamp);

  const { primaryReferencePrice, referencePricesMap, requestedVariants } = resolveNormalizedReferenceInputs({
    referencePrice: input.referencePrice,
    referencePrices: input.referencePrices,
    variants: input.variants,
    variantLabel: input.variantLabel,
    existingVariants: establishedVariants,
  });

  // Check for contradictory isNewImport flags
  if (isNewImport === false && (!existingRecord || (!hasEstablishedPrices && !alreadyImported))) {
    throw new CatalogError(
      'CONTRADICTORY_IMPORT_INPUT',
      400,
      'isNewImport: false requires an existing product with established prices or prior import metadata.'
    );
  }

  if (isNewImport === true && !forceRecompute && (hasEstablishedPrices || alreadyImported)) {
    throw new CatalogError(
      'CONTRADICTORY_IMPORT_INPUT',
      400,
      'isNewImport: true contradicts existing established prices or import metadata unless forceRecompute: true is set.'
    );
  }

  const nowIso = new Date().toISOString();

  if (!forceRecompute && (isNewImport === false || hasEstablishedPrices || alreadyImported)) {
    // PRESERVE EXISTING: Do NOT compound 5% on re-import or overwrite admin edits!
    // Preserve every existing variant's distinct merchant price without collapsing to the first price.
    const establishedByLabel = new Map<string, CatalogVariant>(
      establishedVariants.map(v => [v.label, v])
    );

    const finalVariants: CatalogVariant[] = [];
    const seenLabels = new Set<string>();

    // First, preserve all established variants in their canonical order with their exact merchant prices
    for (const existingVar of establishedVariants) {
      seenLabels.add(existingVar.label);
      finalVariants.push({ ...existingVar });
    }

    // If the re-import payload contains multiple explicit variants/referencePrices and introduces a brand-new
    // variant label that did not previously exist on the product (or if existingRecord had no prices yet),
    // compute the 5% markup only for the unestablished variant(s).
    const isMultiVariantInput = input.referencePrices !== undefined || input.variants !== undefined;
    if (isMultiVariantInput || finalVariants.length === 0) {
      for (const reqVar of requestedVariants) {
        if (! establishedByLabel.has(reqVar.label) && !seenLabels.has(reqVar.label)) {
          seenLabels.add(reqVar.label);
          const computed = computeReferenceMarkup(reqVar.referencePrice);
          const validMoq = validateMoqOverride(reqVar.moqOverride);
          finalVariants.push({
            id: reqVar.id || catalogVariantId(reqVar.label),
            label: reqVar.label,
            price: computed.sellingPrice,
            available: reqVar.available !== false,
            weightGrams: Number.isSafeInteger(reqVar.weightGrams) ? (reqVar.weightGrams as number) : null,
            ...(typeof validMoq === 'number' ? { moqOverride: validMoq } : {}),
          });
        }
      }
    }

    const sellingPrices: Record<string, number> = {};
    for (const v of finalVariants) {
      if (v.available !== false) {
        sellingPrices[v.label] = v.price;
      }
    }
    // Fallback if all variants are disabled so sellingPrices still reflects preserved variant prices for admin inspection
    if (Object.keys(sellingPrices).length === 0) {
      for (const v of finalVariants) {
        sellingPrices[v.label] = v.price;
      }
    }

    const primarySellingPrice = finalVariants[0]?.price ?? Math.round(primaryReferencePrice * (1 + REFERENCE_IMPORT_MARKUP_RATE));
    const effectiveReferencePrice =
      typeof existingRecord?.referencePrice === 'number' &&
      Number.isFinite(existingRecord.referencePrice) &&
      existingRecord.referencePrice > 0
        ? existingRecord.referencePrice
        : primaryReferencePrice;

    return {
      sellingPrice: primarySellingPrice,
      sellingPrices,
      variants: finalVariants,
      rawComputedPrice: primaryReferencePrice * (1 + REFERENCE_IMPORT_MARKUP_RATE),
      referencePrice: effectiveReferencePrice,
      referencePrices: referencePricesMap,
      markupPercent: REFERENCE_IMPORT_MARKUP_RATE,
      roundingPolicy: REFERENCE_ROUNDING_POLICY,
      isNewImport: false,
      preservedExistingPrice: true,
      importBatch: existingRecord?.importBatch || importBatch,
      importTimestamp: existingRecord?.importTimestamp || nowIso,
      sourceUrl: existingRecord?.supplierItemUrl || existingRecord?.sourceUrl || sourceUrl,
    };
  }

  // NEW IMPORT: Apply 5% markup exactly once per variant
  const newVariants: CatalogVariant[] = requestedVariants.map(reqVar => {
    const computed = computeReferenceMarkup(reqVar.referencePrice);
    const validMoq = validateMoqOverride(reqVar.moqOverride);
    return {
      id: reqVar.id || catalogVariantId(reqVar.label),
      label: reqVar.label,
      price: computed.sellingPrice,
      available: reqVar.available !== false,
      weightGrams: Number.isSafeInteger(reqVar.weightGrams) ? (reqVar.weightGrams as number) : null,
      ...(typeof validMoq === 'number' ? { moqOverride: validMoq } : {}),
    };
  });

  const sellingPrices: Record<string, number> = {};
  for (const v of newVariants) {
    if (v.available !== false) {
      sellingPrices[v.label] = v.price;
    }
  }

  const primaryComputed = computeReferenceMarkup(primaryReferencePrice);

  return {
    sellingPrice: newVariants[0]?.price ?? primaryComputed.sellingPrice,
    sellingPrices,
    variants: newVariants,
    rawComputedPrice: primaryComputed.rawComputedPrice,
    referencePrice: primaryReferencePrice,
    referencePrices: referencePricesMap,
    markupPercent: REFERENCE_IMPORT_MARKUP_RATE,
    roundingPolicy: REFERENCE_ROUNDING_POLICY,
    isNewImport: true,
    preservedExistingPrice: false,
    importBatch,
    importTimestamp: nowIso,
    sourceUrl,
  };
}
