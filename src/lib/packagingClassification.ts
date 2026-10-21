/**
 * Authoritative Packaging Classification & Card Variant Resolver
 *
 * Implements:
 * 1. Admin-editable packaging subcategory metadata (with documented legacy fallback).
 * 2. Unclassified status for unknown products (NEVER defaults to wedding).
 * 3. Single selected-variant resolver for card highlight, displayed price, MOQ,
 *    and addToCart payload without silent substitutions or fabricated rates.
 * 4. Recognizes saved available 1-piece empty variants even when bulk tiers exclude single-piece.
 * 5. Preserves actual pack capacity for filled pack variants.
 */

import type { Product, BidBoxBulkTier, BidBoxFilledOption } from '../types';
import { resolveBidBoxConfig } from './bidBoxPricing';
import { calculatePackagingMoq, parsePiecesPerPack } from './packagingMoq';

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

  // 1. Explicit deliberate clearing: null, 'none', or empty string
  // If the product was explicitly cleared by the admin, it MUST remain unclassified.
  // Legacy fallback must NEVER resurrect a deliberately cleared product!
  if (product.packagingSubcategory === null || product.packagingSubcategory === 'none' || product.packagingSubcategory === '') {
    return null;
  }
  if (
    product.bidBoxConfig &&
    (product.bidBoxConfig.packagingSubcategory === null ||
      product.bidBoxConfig.packagingSubcategory === 'none' ||
      product.bidBoxConfig.packagingSubcategory === '')
  ) {
    return null;
  }

  // 2. Explicit product metadata
  if (typeof product.packagingSubcategory === 'string' && product.packagingSubcategory.trim()) {
    const val = product.packagingSubcategory.trim().toLowerCase();
    if (val === 'none') return null;
    return val;
  }

  // 3. Explicit bidBoxConfig metadata
  if (
    product.bidBoxConfig &&
    typeof product.bidBoxConfig.packagingSubcategory === 'string' &&
    product.bidBoxConfig.packagingSubcategory.trim()
  ) {
    const val = product.bidBoxConfig.packagingSubcategory.trim().toLowerCase();
    if (val === 'none') return null;
    return val;
  }

  // 4. Documented legacy fallback for existing products ONLY when classification has never been explicitly assigned or cleared
  if (product.id && PACKAGING_SUBCATEGORY_LEGACY_MAP[product.id]) {
    return PACKAGING_SUBCATEGORY_LEGACY_MAP[product.id];
  }

  // 5. Unknown products remain unclassified
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
  preferredMode?: 'empty' | 'filled' | 'all',
  requestedTierIndex?: number
): ResolvedCelebrationCardVariant {
  const cfg = resolveBidBoxConfig(product);
  let emptyTiers: BidBoxBulkTier[] = [...(cfg?.emptyTiers || [])];
  const filledOptions = cfg?.filledOptions || [];

  // Identify any disabled variants
  const disabledLabels = new Set<string>();
  if (Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (v && typeof v.label === 'string' && v.available === false) {
        disabledLabels.add(v.label);
      }
    }
  }

  // If resolveBidBoxConfig.emptyTiers excluded single-piece variants (e.g. standard 1-piece box),
  // recognize saved available empty variants from raw prices and variants.
  if (emptyTiers.length === 0) {
    const rawPrices = product.prices || {};
    const filledKeys = new Set(filledOptions.map(o => o.variantKey));

    for (const [label, price] of Object.entries(rawPrices)) {
      if (disabledLabels.has(label)) continue;
      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue;
      const isFilled =
        filledKeys.has(label) ||
        (!/^empty\b/i.test(label) && /\bfilled\b|\bassorted\b|\bwith\s+dry\s+fruits\b/i.test(label));
      if (!isFilled) {
        const qty = parsePiecesPerPack(label);
        const unitPrice = Math.round((price / qty) * 100) / 100;
        emptyTiers.push({
          qty,
          label: label,
          unitPrice: Number.isInteger(unitPrice) ? unitPrice : Math.round(unitPrice),
          packPrice: price,
          variantKey: label,
        });
      }
    }

    if (emptyTiers.length === 0 && Array.isArray(product.variants)) {
      for (const v of product.variants) {
        if (!v || v.available === false || typeof v.label !== 'string') continue;
        if (typeof v.price !== 'number' || !Number.isFinite(v.price) || v.price <= 0) continue;
        const isFilled =
          filledKeys.has(v.label) ||
          (!/^empty\b/i.test(v.label) && /\bfilled\b|\bassorted\b|\bwith\s+dry\s+fruits\b/i.test(v.label));
        if (!isFilled) {
          const qty = parsePiecesPerPack(v.label);
          const unitPrice = Math.round((v.price / qty) * 100) / 100;
          emptyTiers.push({
            qty,
            label: v.label,
            unitPrice: Number.isInteger(unitPrice) ? unitPrice : Math.round(unitPrice),
            packPrice: v.price,
            variantKey: v.label,
          });
        }
      }
    }

    emptyTiers.sort((a, b) => a.qty - b.qty || a.packPrice - b.packPrice);
  }

  const hasEmpty = emptyTiers.length > 0;
  const hasFilled = filledOptions.length > 0;

  const availableModes: Array<'empty' | 'filled'> = [];
  if (hasEmpty) availableModes.push('empty');
  if (hasFilled) availableModes.push('filled');

  // Determine active mode without silent substitution:
  // If user explicitly requested 'filled' or 'empty', honor that request (never silently substitute the other mode).
  // If preferredMode is 'all' or undefined, pick first available mode (empty first, then filled).
  let activeMode: 'empty' | 'filled';
  if (preferredMode === 'empty') {
    activeMode = 'empty';
  } else if (preferredMode === 'filled') {
    activeMode = 'filled';
  } else {
    activeMode = hasEmpty ? 'empty' : (hasFilled ? 'filled' : 'empty');
  }

  const isQuoteOnly =
    product.quoteOnly === true ||
    product.orderMode === 'inquiry_quote';

  // 1. Empty Mode
  if (activeMode === 'empty') {
    if (hasEmpty) {
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

    // Explicitly requested empty mode is unavailable on this product
    return {
      availableModes,
      activeMode: 'empty',
      selectedTierIndex: 0,
      variantKey: null,
      unitPrice: null,
      packPrice: null,
      piecesPerPack: 1,
      moq: product.bidBoxConfig?.minUnits || 25,
      isQuoteOnly: true,
      isDirectCheckoutEligible: false,
      emptyTiers: [],
      filledOptions,
    };
  }

  // 2. Filled Mode
  if (activeMode === 'filled') {
    if (hasFilled) {
      const rawIdx = typeof requestedTierIndex === 'number' && Number.isInteger(requestedTierIndex) ? requestedTierIndex : 0;
      const safeIdx = Math.max(0, Math.min(rawIdx, filledOptions.length - 1));
      const option = filledOptions[safeIdx];
      const pieces = parsePiecesPerPack(option.variantKey);
      const unitPrice = pieces > 1 ? Math.round((option.price / pieces) * 100) / 100 : option.price;
      const packPrice = option.price;
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
        unitPrice: unitPrice > 0 ? unitPrice : null,
        packPrice: packPrice > 0 ? packPrice : null,
        piecesPerPack: pieces,
        moq,
        fillingsDescription,
        isQuoteOnly,
        isDirectCheckoutEligible: !isQuoteOnly && option.price > 0,
        emptyTiers,
        filledOptions,
      };
    }

    // Explicitly requested filled mode is unavailable on this product
    return {
      availableModes,
      activeMode: 'filled',
      selectedTierIndex: 0,
      variantKey: null,
      unitPrice: null,
      packPrice: null,
      piecesPerPack: 1,
      moq: product.bidBoxConfig?.minUnits || 25,
      isQuoteOnly: true,
      isDirectCheckoutEligible: false,
      emptyTiers,
      filledOptions: [],
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
    activeMode: 'empty',
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
