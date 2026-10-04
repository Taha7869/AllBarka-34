import type { Product } from '../types';
import { ValidationError } from './validationError';

export const MIN_CUSTOM_WEIGHT_G = 100;
export const MAX_CUSTOM_WEIGHT_G = 5000;
export const CUSTOM_WEIGHT_STEP_G = 50;

export interface ProductVariant {
  label: string;
  price: number;
  /** Null means the merchant has not supplied the bundle's shipping mass. */
  weightGrams: number | null;
  isCustom: boolean;
}

/** Custom portions are an explicit catalogue capability, never a client flag. */
export function supportsCustomWeight(product: Product): boolean {
  return product.active !== false && product.quoteOnly !== true && product.allowCustomWeight === true
    && product.isBundle !== true && !['oils', 'bundles', 'gift-boxes'].includes(product.category)
    && typeof product.pricePer100g === 'number' && Number.isFinite(product.pricePer100g) && product.pricePer100g > 0;
}

function parseCustomGrams(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  const input = value.trim();
  const match = /^(?:Custom\s+)?(\d+)\s*g$/i.exec(input);
  return match ? Number(match[1]) : /^\d+$/.test(input) ? Number(input) : NaN;
}

function validateGrams(grams: number, minimum = MIN_CUSTOM_WEIGHT_G, maximum = MAX_CUSTOM_WEIGHT_G): void {
  if (!Number.isInteger(grams) || grams < minimum || grams > maximum || grams % CUSTOM_WEIGHT_STEP_G !== 0) {
    throw new ValidationError(
      grams < minimum ? `Minimum ${minimum}g required` : `Choose ${minimum}g–${maximum}g in ${CUSTOM_WEIGHT_STEP_G}g steps.`,
      'INVALID_CUSTOM_WEIGHT',
    );
  }
}

export function getCustomWeightLabel(grams: number): string {
  validateGrams(grams);
  return `Custom ${grams}g`;
}

/** Uses the single merchant-editable price per 100g; always retail and rounded up. */
export function resolveCustomWeight(product: Product, value: unknown): ProductVariant {
  if (!supportsCustomWeight(product)) {
    throw new ValidationError('Custom weight is unavailable for this selection.', 'CUSTOM_WEIGHT_UNAVAILABLE');
  }
  const grams = parseCustomGrams(value);
  const minimum = Math.max(MIN_CUSTOM_WEIGHT_G, product.minCustomWeightG ?? MIN_CUSTOM_WEIGHT_G);
  const maximum = Math.min(MAX_CUSTOM_WEIGHT_G, product.maxCustomWeightG ?? MAX_CUSTOM_WEIGHT_G);
  validateGrams(grams, minimum, maximum);
  const price = Math.ceil((product.pricePer100g! * grams / 100) / 5) * 5;
  if (!Number.isFinite(price) || price <= 0) {
    throw new ValidationError('Pricing is unavailable for this custom portion.', 'PRICING_UNAVAILABLE');
  }
  return { label: getCustomWeightLabel(grams), price, weightGrams: grams, isCustom: true };
}

function fixedShippingWeight(product: Product, label: string): number | null {
  const isFixedBundle = product.isBundle || ['bundles', 'gift-boxes'].includes(product.category);
  // Packed bundle weight includes packaging and takes precedence over legacy
  // portion weights. Invalid explicit values cannot borrow a fallback mass.
  if (isFixedBundle && product.shippingWeightG !== undefined) {
    const grams = product.shippingWeightG;
    return Number.isSafeInteger(grams) && grams > 0 ? grams : null;
  }
  if (Object.hasOwn(product.shippingWeights || {}, label)) {
    const grams = product.shippingWeights![label];
    return Number.isFinite(grams) && grams > 0 ? grams : null;
  }
  // Fixed bundles require an explicit merchant-approved mass, even if their
  // display label resembles a portion. Oil ml follows the approved billing tariff.
  if (isFixedBundle) return null;
  const match = /^(\d+(?:\.\d+)?)\s*(kg|g|ml)$/i.exec(label);
  if (!match || (match[2].toLowerCase() === 'ml' && product.category !== 'oils')) return null;
  const grams = Number(match[1]) * (match[2].toLowerCase() === 'kg' ? 1000 : 1);
  return Number.isFinite(grams) && grams > 0 ? grams : null;
}

/** Resolve a supported canonical label; unknown labels never borrow another price. */
export function resolveProductVariant(product: Product, value: unknown): ProductVariant | null {
  if (product.active === false || product.quoteOnly === true || typeof value !== 'string') return null;
  const label = value.trim();
  if (/^Custom\s+/i.test(label)) {
    try { return resolveCustomWeight(product, label); } catch { return null; }
  }
  if (!Object.hasOwn(product.prices || {}, label)) return null;
  const price = product.prices[label];
  if (!Number.isFinite(price) || price <= 0) return null;
  return { label, price, weightGrams: fixedShippingWeight(product, label), isCustom: false };
}

export function resolveProductPrice(product: Product, label: unknown): number | null {
  return resolveProductVariant(product, label)?.price ?? null;
}
