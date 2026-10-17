/**
 * Packaging Minimum Order Quantity (MOQ) Engine
 *
 * Implements Rule D1 from AllBarka Master Implementation Prompt v2.0:
 * - Packaging MOQ per design/variant = min(25, max(1, ceil(5000 / publishedPerPiecePrice)))
 * - Explicit admin product/variant override takes precedence.
 * - Ordinary food items (dry-fruits, dates, seeds-snacks, oils, essentials, herbs-spices) are exempt.
 * - Final published per-piece selling price is used before coupons, delivery, and optional fillings.
 * - Different designs/variants do not pool quantities.
 * - A zero or unknown price cannot enter calculation or become purchasable.
 */

import type { Product } from '../types';
import { FOOD_CATEGORIES } from '../config/categories';

export const DEFAULT_PACKAGING_CAP_MOQ = 25;
export const DEFAULT_PACKAGING_MIN_MOQ = 1;
export const PACKAGING_TARGET_ORDER_VALUE = 5000;

export const FOOD_CATEGORY_IDS: ReadonlySet<string> = new Set([
  ...Object.values(FOOD_CATEGORIES).map(c => c.id),
  'nuts',
  'snacks-seeds',
]);

/**
 * Checks if a product represents packaging/bid boxes rather than ordinary food items.
 * Ordinary food items are strictly exempt from packaging MOQ rules.
 */
export function isPackagingProduct(product: Partial<Product> | null | undefined): boolean {
  if (!product) return false;

  // Explicit packaging flags and taxonomy
  if (product.isBidBox === true) return true;
  if (product.category === 'celebration-boxes') return true;
  if (product.productFamily === 'bid-box') return true;

  // Ordinary food products are explicitly exempt
  const category = (product.category || '').toLowerCase().trim();
  if (FOOD_CATEGORY_IDS.has(category)) {
    return false;
  }

  // Pre-assembled food hampers/bundles (unless explicitly marked as bid-box packaging)
  if (['combos', 'bundles', 'gift-boxes'].includes(category)) {
    return false;
  }

  return false;
}

/**
 * Parses pieces per pack from a variant label.
 * E.g.:
 * - "Empty Pack (25 pcs)" -> 25
 * - "Empty Bulk (50 pcs)" -> 50
 * - "Empty Bulk (100 pcs)" -> 100
 * - "Empty Box (1 pc)" -> 1
 * - "250g" -> 1
 */
export function parsePiecesPerPack(variantLabel: string | undefined | null): number {
  if (!variantLabel || typeof variantLabel !== 'string') return 1;

  const trimmed = variantLabel.trim();
  // Check for patterns like "(25 pcs)", "(50 pcs)", "25 pcs", "100+ pcs"
  const match = /\(?(\d+)\+?\s*(?:pcs|pieces|pack|boxes)\)?/i.exec(trimmed);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
}

/**
 * Resolves the published per-piece price for a packaging design/variant.
 * If variantLabel is provided, uses that variant's price divided by pieces per pack.
 * Otherwise uses the smallest available piece price or starting price.
 */
export function getPublishedPerPiecePrice(product: Product, variantLabel?: string): number | null {
  const prices = product.prices || {};
  const disabledLabels = new Set<string>();
  if (Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (v && typeof v.label === 'string' && v.available === false) {
        disabledLabels.add(v.label);
      }
    }
  }

  if (variantLabel) {
    if (disabledLabels.has(variantLabel)) {
      return null;
    }
    if (Object.hasOwn(prices, variantLabel)) {
      const packPrice = prices[variantLabel];
      if (!Number.isFinite(packPrice) || packPrice <= 0) return null;
      const pieces = parsePiecesPerPack(variantLabel);
      return Math.round((packPrice / pieces) * 100) / 100;
    }
    if (Array.isArray(product.variants)) {
      const v = product.variants.find((item: any) => item.label === variantLabel);
      if (v && Number.isFinite(v.price) && v.price > 0 && v.available !== false) {
        const pieces = parsePiecesPerPack(variantLabel);
        return Math.round((v.price / pieces) * 100) / 100;
      }
    }
    return null;
  }

  // Fallback when no specific variantLabel is requested: look for available 1 pc variant first
  if (
    !disabledLabels.has('Empty Box (1 pc)') &&
    prices['Empty Box (1 pc)'] &&
    Number.isFinite(prices['Empty Box (1 pc)']) &&
    prices['Empty Box (1 pc)'] > 0
  ) {
    return prices['Empty Box (1 pc)'];
  }

  // Use the minimum per-piece price across explicitly saved, available variants
  let minPiecePrice: number | null = null;
  for (const [label, price] of Object.entries(prices)) {
    if (disabledLabels.has(label)) continue;
    if (Number.isFinite(price) && price > 0) {
      const pieces = parsePiecesPerPack(label);
      const piecePrice = price / pieces;
      if (minPiecePrice === null || piecePrice < minPiecePrice) {
        minPiecePrice = piecePrice;
      }
    }
  }

  if (minPiecePrice === null && Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (!v || v.available === false || typeof v.label !== 'string') continue;
      if (Number.isFinite(v.price) && v.price > 0) {
        const pieces = parsePiecesPerPack(v.label);
        const piecePrice = v.price / pieces;
        if (minPiecePrice === null || piecePrice < minPiecePrice) {
          minPiecePrice = piecePrice;
        }
      }
    }
  }

  return minPiecePrice !== null ? Math.round(minPiecePrice * 100) / 100 : null;
}

/**
 * Calculates the required minimum order quantity (MOQ) in pieces for a packaging design.
 *
 * Formula: min(25, max(1, ceil(5000 / publishedPerPiecePrice)))
 *
 * Test vectors:
 * - Rs. 100 -> 25
 * - Rs. 200 -> 25
 * - Rs. 300 -> 17
 * - Rs. 500 -> 10
 * - Rs. 1000 -> 5
 * - Rs. 2000 -> 3
 * - Rs. 6000 -> 1
 */
export function calculatePackagingMoq(product: Product, variantLabel?: string): number {
  // 1. Ordinary food items are strictly exempt
  if (!isPackagingProduct(product)) {
    return 1;
  }

  // 2. Variant-specific override if present
  if (variantLabel && Array.isArray(product.variants)) {
    const v: any = product.variants.find((item: any) => item.label === variantLabel);
    const varOverride = v?.moqOverride ?? v?.minOrderQuantity;
    if (typeof varOverride === 'number' && Number.isSafeInteger(varOverride) && varOverride > 0) {
      return varOverride;
    }
  }

  // 3. Explicit admin product-level override
  const prodOverride = product.moqOverride ?? product.minOrderQuantity;
  if (typeof prodOverride === 'number' && Number.isSafeInteger(prodOverride) && prodOverride > 0) {
    return prodOverride;
  }

  // 4. Calculate from published per-piece price
  const perPiecePrice = getPublishedPerPiecePrice(product, variantLabel);

  if (perPiecePrice === null || !Number.isFinite(perPiecePrice) || perPiecePrice <= 0) {
    // Unpriced or zero-priced items cannot enter calculation or be purchasable
    throw new Error(`A valid positive published price is required to calculate MOQ for "${product.name_en || product.id}".`);
  }

  const rawMoq = Math.ceil(PACKAGING_TARGET_ORDER_VALUE / perPiecePrice);
  return Math.min(DEFAULT_PACKAGING_CAP_MOQ, Math.max(DEFAULT_PACKAGING_MIN_MOQ, rawMoq));
}

/**
 * Calculates the minimum number of units (packs or pieces) required to satisfy MOQ for a given variant.
 * For example:
 * - If MOQ is 25 pcs and variant is "Empty Box (1 pc)", min units = 25.
 * - If MOQ is 25 pcs and variant is "Empty Pack (25 pcs)", min units = 1 (1 x 25 = 25 pcs).
 * - If MOQ is 25 pcs and variant is "Empty Pack (10 pcs)", min units = 3 (3 x 10 = 30 pcs >= 25).
 */
export function calculateMinOrderQuantityUnits(product: Product, variantLabel?: string): number {
  if (!isPackagingProduct(product)) {
    return 1;
  }

  const moqPieces = calculatePackagingMoq(product, variantLabel);
  const piecesPerPack = parsePiecesPerPack(variantLabel);

  return Math.max(1, Math.ceil(moqPieces / piecesPerPack));
}

/**
 * Safe, non-throwing MOQ resolver for UI rendering (ProductCard, ProductDetailPage).
 * Returns `{ moqPieces: null, minUnits: null }` for unpriced/inquiry-only packaging products
 * that have neither an explicit MOQ override nor a positive published price.
 */
export function getPackagingMoqDisplay(
  product: Product,
  variantLabel?: string
): { moqPieces: number | null; minUnits: number | null } {
  if (!isPackagingProduct(product)) {
    return { moqPieces: 1, minUnits: 1 };
  }

  try {
    const moqPieces = calculatePackagingMoq(product, variantLabel);
    const piecesPerPack = parsePiecesPerPack(variantLabel);
    const minUnits = Math.max(1, Math.ceil(moqPieces / piecesPerPack));
    return { moqPieces, minUnits };
  } catch {
    return { moqPieces: null, minUnits: null };
  }
}

/**
 * Validates whether the given quantity satisfies the packaging MOQ.
 */
export function validatePackagingQuantity(
  product: Product,
  variantLabel: string,
  quantity: number
): {
  valid: boolean;
  moq: number;
  moqPieces: number;
  piecesPerPack: number;
  totalPieces: number;
  minUnits: number;
  reason?: 'BELOW_MINIMUM_ORDER_QUANTITY' | 'INVALID_QUANTITY';
  error?: string;
} {
  if (!isPackagingProduct(product)) {
    return { valid: true, moq: 1, moqPieces: 1, piecesPerPack: 1, totalPieces: quantity, minUnits: 1 };
  }

  const moqPieces = calculatePackagingMoq(product, variantLabel);
  const piecesPerPack = parsePiecesPerPack(variantLabel);
  const minUnits = Math.max(1, Math.ceil(moqPieces / piecesPerPack));
  const totalPieces = quantity * piecesPerPack;

  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1) {
    return {
      valid: false,
      moq: moqPieces,
      moqPieces,
      piecesPerPack,
      totalPieces,
      minUnits,
      reason: 'INVALID_QUANTITY',
      error: `Quantity must be a positive integer.`,
    };
  }

  if (quantity < minUnits) {
    return {
      valid: false,
      moq: moqPieces,
      moqPieces,
      piecesPerPack,
      totalPieces,
      minUnits,
      reason: 'BELOW_MINIMUM_ORDER_QUANTITY',
      error: `Minimum order quantity for "${product.name_en || product.id}" (${variantLabel}) is ${moqPieces} pieces (at least ${minUnits} ${piecesPerPack > 1 ? 'packs' : 'pieces'}).`,
    };
  }

  return {
    valid: true,
    moq: moqPieces,
    moqPieces,
    piecesPerPack,
    totalPieces,
    minUnits,
  };
}
