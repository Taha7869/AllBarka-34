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
 * - Admin saves are final selling prices and never receive additional markup.
 * - Display, checkout, and export code reads the saved selling price directly without compounding.
 */

import type { Product } from '../types';

export const REFERENCE_IMPORT_MARKUP_RATE = 0.05; // 5% markup
export const REFERENCE_ROUNDING_POLICY = 'half_up_whole_rupee' as const;

export interface ReferencePricingResult {
  sellingPrice: number;
  rawComputedPrice: number;
  referencePrice: number;
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
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
    throw new Error('A valid positive, finite reference price is required for catalog import.');
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
 * Applies reference import markup safely to a product record.
 * - If product is new or has no selling price, applies 5% markup once.
 * - If product already exists and has an established selling price or prior import,
 *   preserves the existing selling price to prevent compounding or overwriting admin edits.
 */
export function applyReferenceImportPricing(input: {
  referencePrice: number;
  sourceUrl?: string;
  importBatch?: string;
  existingProduct?: Partial<Product> | null;
  forceRecompute?: boolean;
  isNewImport?: boolean;
}): ReferencePricingResult {
  const { referencePrice, sourceUrl, importBatch, existingProduct, forceRecompute, isNewImport } = input;

  if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
    throw new Error('A valid positive, finite reference price is required for catalog import.');
  }

  const nowIso = new Date().toISOString();

  // Check if existing product already has a confirmed merchant selling price
  const hasExistingPrices = existingProduct?.prices && Object.keys(existingProduct.prices).length > 0;
  const hasExistingSinglePrice = typeof (existingProduct as any)?.price === 'number' && (existingProduct as any).price > 0;
  const alreadyImported = Boolean(existingProduct?.importBatch || existingProduct?.importTimestamp);

  if (!forceRecompute && (isNewImport === false || (existingProduct && (hasExistingPrices || hasExistingSinglePrice || alreadyImported)))) {
    // PRESERVE EXISTING: Do NOT compound 5% on re-import or overwrite admin edits!
    const existingPrice = hasExistingPrices
      ? Number(Object.values(existingProduct.prices!)[0])
      : Number((existingProduct as any)?.price || referencePrice);

    return {
      sellingPrice: Number.isFinite(existingPrice) && existingPrice > 0 ? existingPrice : Math.round(referencePrice * 1.05),
      rawComputedPrice: referencePrice * 1.05,
      referencePrice,
      markupPercent: REFERENCE_IMPORT_MARKUP_RATE,
      roundingPolicy: REFERENCE_ROUNDING_POLICY,
      isNewImport: false,
      preservedExistingPrice: true,
      importBatch: existingProduct.importBatch || importBatch,
      importTimestamp: existingProduct.importTimestamp || nowIso,
      sourceUrl: existingProduct.supplierItemUrl || sourceUrl,
    };
  }

  // NEW IMPORT: Apply 5% markup exactly once
  const computed = computeReferenceMarkup(referencePrice);

  return {
    ...computed,
    referencePrice,
    isNewImport: true,
    preservedExistingPrice: false,
    importBatch,
    importTimestamp: nowIso,
    sourceUrl,
  };
}
