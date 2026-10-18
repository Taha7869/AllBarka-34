/**
 * Authoritative Packaging Classification & Card Variant Resolver
 *
 * Implements:
 * 1. Admin-editable packaging subcategory metadata (with documented legacy fallback).
 * 2. Unclassified status for unknown products (NEVER defaults to wedding).
 * 3. Single selected-variant resolver for card highlight, displayed price, MOQ,
 *    and addToCart payload without silent substitutions or fabricated rates.
 */

import type { Product, BidBoxBulkTier, BidBoxFilledOption } from '../types';
import { resolveBidBoxConfig } from './bidBoxPricing';
import { calculatePackagingMoq } from './packagingMoq';

export type CelebrationSubcategory = 'all' | 'tin' | 'tabarruk' | 'wedding' | 'baby' | 'acrylic';

export const PACKAGING_SUBCATEGORY_LEGACY_MAP: Readonly<Record<string, string>> = Object.freeze({
  'bid-box-luxury-tin': 'tin',
  'bid-box-umrah-tabarruk': 'tabarruk',
  'bid-box-card-nikkah': 'wedding',
  'bid-box-pyramid-favor': 'wedding',
  'bid-box-jute-pouch': 'wedding',
  'bid-box-sweet-nikkah': 'wedding',
  'bid-box-birth-announcement': 'baby',
  'bid-box-acrylic-royal': 'acrylic',
});

/**
 * Resolves the packaging subcategory for a product.
 * Precedence:
 * 1. Explicit admin/product metadata `product.packagingSubcategory`.
 * 2. Explicit config metadata `product.bidBoxConfig.packagingSubcategory`.
 * 3. Documented migration map for existing 8 verified products when metadata is absent.
 * 4. Unknown products return null (unclassified). Never defaults to wedding or any other subcategory.
 */
export function getPackagingSubcategory(product: Partial<Product> | null | undefined): string | null {
  if (!product) return null;

  // 1. Explicit product metadata
  if (typeof product.packagingSubcategory === 'string' && product.packagingSubcategory.trim()) {
    return product.packagingSubcategory.trim().toLowerCase();
  }

  // 2. Explicit bidBoxConfig metadata
  if (
    product.bidBoxConfig &&
    typeof product.bidBoxConfig.packagingSubcategory === 'string' &&
    product.bidBoxConfig.packagingSubcategory.trim()
  ) {
    return product.bidBoxConfig.packagingSubcategory.trim().toLowerCase();
  }

  // 3. Documented legacy fallback for existing products
  if (product.id && PACKAGING_SUBCATEGORY_LEGACY_MAP[product.id]) {
    return PACKAGING_SUBCATEGORY_LEGACY_MAP[product.id];
  }

  // 4. Unknown products remain unclassified
  return null;
}

export function productMatchesPackagingSubcategory(
  product: Partial<Product> | null | undefined,
  subcategory?: string | null
): boolean {
  if (!subcategory || subcategory === 'all') return true;
  const resolved = getPackagingSubcategory(product);
  return resolved !== null && resolved === subcategory.trim().toLowerCase();
}

export interface ResolvedCelebrationCardVariant {
  availableModes: Array<'empty' | 'filled'>;
  activeMode: 'empty' | 'filled';
  selectedTierIndex: number;
  variantKey: string | null;
  unitPrice: number | null;
  packPrice: number | null;
  piecesPerPack: number;
  moq: number;
  discountBadge?: string;
  fillingsDescription?: string;
  isQuoteOnly: boolean;
  isDirectCheckoutEligible: boolean;
  emptyTiers: BidBoxBulkTier[];
  filledOptions: BidBoxFilledOption[];
}

/**
 * Authoritative single selected-variant resolver.
 * Used identically for:
 * - Card highlighted button
 * - Displayed unit price & pack price
 * - Packaging MOQ badge and enforcement
 * - Direct checkout eligibility
 * - addToCart payload
 */
export function resolveCelebrationCardVariant(
  product: Product,
  preferredMode: 'empty' | 'filled',
  requestedTierIndex?: number
): ResolvedCelebrationCardVariant {
  const cfg = resolveBidBoxConfig(product);
  const emptyTiers = cfg?.emptyTiers || [];
  const filledOptions = cfg?.filledOptions || [];

  const hasEmpty = emptyTiers.length > 0;
  const hasFilled = filledOptions.length > 0;

  const availableModes: Array<'empty' | 'filled'> = [];
  if (hasEmpty) availableModes.push('empty');
  if (hasFilled) availableModes.push('filled');

  // Determine active mode without silent substitution
  let activeMode: 'empty' | 'filled';
  if (preferredMode === 'empty' && hasEmpty) {
    activeMode = 'empty';
  } else if (preferredMode === 'filled' && hasFilled) {
    activeMode = 'filled';
  } else if (hasEmpty) {
    activeMode = 'empty';
  } else if (hasFilled) {
    activeMode = 'filled';
  } else {
    activeMode = preferredMode;
  }

  const isQuoteOnly =
    product.quoteOnly === true ||
    product.orderMode === 'inquiry_quote' ||
    (!hasEmpty && !hasFilled && Object.keys(product.prices || {}).length === 0);

  if (activeMode === 'empty' && hasEmpty) {
    const rawIdx = typeof requestedTierIndex === 'number' && Number.isInteger(requestedTierIndex) ? requestedTierIndex : 0;
    const safeIdx = Math.max(0, Math.min(rawIdx, emptyTiers.length - 1));
    const tier = emptyTiers[safeIdx];
    const pieces = tier.qty || 1;
    let moq = 1;
    try {
      moq = calculatePackagingMoq(product, tier.variantKey);
    } catch {
      moq = product.bidBoxConfig?.minUnits || 1;
    }

    return {
      availableModes,
      activeMode: 'empty',
      selectedTierIndex: safeIdx,
      variantKey: tier.variantKey,
      unitPrice: tier.unitPrice > 0 ? tier.unitPrice : null,
      packPrice: tier.packPrice > 0 ? tier.packPrice : null,
      piecesPerPack: pieces,
      moq,
      discountBadge: tier.discountBadge,
      isQuoteOnly,
      isDirectCheckoutEligible: !isQuoteOnly && tier.packPrice > 0,
      emptyTiers,
      filledOptions,
    };
  }

  if (activeMode === 'filled' && hasFilled) {
    const rawIdx = typeof requestedTierIndex === 'number' && Number.isInteger(requestedTierIndex) ? requestedTierIndex : 0;
    const safeIdx = Math.max(0, Math.min(rawIdx, filledOptions.length - 1));
    const option = filledOptions[safeIdx];
    let moq = 1;
    try {
      moq = calculatePackagingMoq(product, option.variantKey);
    } catch {
      moq = product.bidBoxConfig?.minUnits || 1;
    }

    // Only use genuine descriptions, NEVER fabricate fallbacks
    const fillingsDescription =
      option.subtitle ||
      (cfg?.filledSummary !== 'Irani & Panjgur Dates with Roasted Nuts' ? cfg?.filledSummary : undefined) ||
      (product.contents && product.contents.length > 0 ? product.contents.join(', ') : undefined);

    return {
      availableModes,
      activeMode: 'filled',
      selectedTierIndex: safeIdx,
      variantKey: option.variantKey,
      unitPrice: option.price > 0 ? option.price : null,
      packPrice: option.price > 0 ? option.price : null,
      piecesPerPack: 1,
      moq,
      fillingsDescription,
      isQuoteOnly,
      isDirectCheckoutEligible: !isQuoteOnly && option.price > 0,
      emptyTiers,
      filledOptions,
    };
  }

  // Fallback for unpriced or quote-only products
  const firstVariantKey = Object.keys(product.prices || {})[0] || null;
  const firstPrice = firstVariantKey && product.prices[firstVariantKey] ? product.prices[firstVariantKey] : null;

  let fallbackMoq = 1;
  try {
    fallbackMoq = calculatePackagingMoq(product);
  } catch {
    fallbackMoq = product.bidBoxConfig?.minUnits || 1;
  }

  return {
    availableModes,
    activeMode,
    selectedTierIndex: 0,
    variantKey: firstVariantKey,
    unitPrice: firstPrice,
    packPrice: firstPrice,
    piecesPerPack: 1,
    moq: fallbackMoq,
    isQuoteOnly: true,
    isDirectCheckoutEligible: false,
    emptyTiers,
    filledOptions,
  };
}
