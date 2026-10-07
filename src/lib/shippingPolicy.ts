import { STORE_CONFIG } from '../config/store';
import { PRODUCTS } from '../data/products';
import type { ShippingMethodId } from '../types';
import { ValidationError } from './validationError';
import { CUSTOM_HAMPER_PRODUCT_ID, resolveHamper, type HamperConfiguration } from './hamperCatalog';
import { resolveProductVariant } from './productVariants';

export interface ShippingWeightItem {
  productId?: string;
  id?: string;
  selectedWeight?: string;
  quantity: number;
  hamperConfiguration?: HamperConfiguration;
}

export function isLahoreCity(city: string): boolean {
  return typeof city === 'string' && ['lahore', 'لاہور', 'لاهور'].includes(city.trim().toLowerCase());
}

export function validateShippingCity(value: unknown, allowEstimate = false): string {
  const city = typeof value === 'string' ? value.trim() : '';
  if (city.length < 2) {
    throw new ValidationError('Please enter a valid delivery city before requesting a quote.', 'INVALID_CITY');
  }
  if (city.length > 60) {
    throw new ValidationError('City name exceeds maximum allowed length (60 characters).', 'CITY_TOO_LONG');
  }
  if (!allowEstimate && ['other city', 'other', 'nationwide', 'outside lahore', 'outside', 'select city', 'choose city']
    .includes(city.toLowerCase().replace(/\s+/g, ' '))) {
    throw new ValidationError('Please enter your actual delivery city before requesting a quote.', 'INVALID_CITY');
  }
  return city;
}

export function validateShippingRewardDestination(reward: { rewardType?: string; rewardId?: string }, city: string): void {
  if ((reward?.rewardType === 'SHIPPING' || reward?.rewardId === 'free_shipping') && !isLahoreCity(city)) {
    throw new ValidationError('Free shipping rewards are available for Lahore delivery only. Your reward has not been used.', 'SHIPPING_REWARD_LAHORE_ONLY');
  }
}

/** Only canonical catalogue portions can supply the shipping billing weight. */
export function getProductShippingWeightGrams(productId: string, selectedWeight: string, catalog: any[] = PRODUCTS): number | null {
  const product = catalog.find(item => item.id === productId);
  return product ? resolveProductVariant(product, selectedWeight)?.weightGrams ?? null : null;
}

/** Null means that an honest weight quote is unavailable; never trust client weight fields. */
export function getCartShippingWeightGrams(items: readonly ShippingWeightItem[]): number | null {
  if (!Array.isArray(items)) return null;
  let total = 0;
  for (const item of items) {
    if (!item || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) return null;
    const selectedWeight = item.selectedWeight || '';
    const rawId = item.productId || item.id || '';
    if (rawId === CUSTOM_HAMPER_PRODUCT_ID) {
      const hamper = resolveHamper(item.hamperConfiguration);
      if (!hamper) return null;
      total += hamper.massGrams * item.quantity;
      continue;
    }
    const productId = catalog.some(product => product.id === rawId)
      ? rawId
      : rawId.endsWith(`-${selectedWeight}`) ? rawId.slice(0, -(selectedWeight.length + 1)) : rawId;
    const grams = getProductShippingWeightGrams(productId, selectedWeight, catalog);
    if (grams === null) return null;
    total += grams * item.quantity;
  }
  return Number.isFinite(total) ? total : null;
}

export function calculateShipping(
  discountedSubtotal: number,
  methodId: ShippingMethodId,
  giftWrapFee = 0,
  city = 'Lahore',
  shippingWeightGrams?: number | null,
): number {
  const destination = validateShippingCity(city, true);
  if (!isLahoreCity(destination)) {
    if (shippingWeightGrams === 0 && discountedSubtotal <= 0) return 0;
    if (shippingWeightGrams === null || shippingWeightGrams === undefined
      || !Number.isFinite(shippingWeightGrams) || shippingWeightGrams <= 0) {
      throw new ValidationError('Shipping weight is unavailable for one or more selections. Please review your bag or contact support.', 'SHIPPING_WEIGHT_UNAVAILABLE');
    }
    return Math.max(STORE_CONFIG.shipping.nationwideMinimum, Math.round(
      shippingWeightGrams / 1000 * STORE_CONFIG.shipping.nationwidePerKg,
    ));
  }
  if (discountedSubtotal <= 0 && !shippingWeightGrams) return 0;
  if (methodId === 'sameday') return discountedSubtotal + giftWrapFee <= 3000 ? 500 : 300;
  if (methodId === 'express') return STORE_CONFIG.shipping.expressRate;
  return discountedSubtotal >= STORE_CONFIG.shipping.freeThreshold ? 0 : STORE_CONFIG.shipping.standardRate;
}
