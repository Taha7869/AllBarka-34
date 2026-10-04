import { STORE_CONFIG } from '../config/store';
import { ShippingMethodId } from '../types.ts';
import { calculateShipping, getCartShippingWeightGrams, isLahoreCity } from './shippingPolicy';
import type { HamperConfiguration } from './hamperCatalog';
import type { AppliedPromo } from '../types/promo';
export { calculateShipping, getCartShippingWeightGrams, getProductShippingWeightGrams, isLahoreCity } from './shippingPolicy';

export const GIFT_WRAP_FEE = 250;
export const FREE_SHIPPING_THRESHOLD = STORE_CONFIG.shipping.freeThreshold; // 3000 PKR

export interface OrderItemPriceInput {
  unitPrice?: number;
  price?: number;
  quantity: number;
  productId?: string;
  id?: string;
  selectedWeight?: string;
  hamperConfiguration?: HamperConfiguration;
}

export interface PricingSummary extends Partial<AppliedPromo> {
  subtotal: number;
  discount: number;
  discountedSubtotal: number;
  shipping: number;
  giftWrapFee: number;
  total: number;
  shippingWeightGrams?: number | null;
  shippingRegion?: 'lahore' | 'nationwide';
}

/**
 * Universal safe number parser for prices.
 * Never returns NaN or negative numbers.
 */
export function sanitizePrice(val: unknown): number {
  if (typeof val === 'number') {
    return !Number.isFinite(val) || val < 0 ? 0 : Math.round(val);
  }
  if (!val) return 0;
  const str = String(val).replace(/(?:Rs\.?|PKR|\$)/gi, '').trim();
  const noCommas = str.replace(/,/g, '');
  const match = noCommas.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const parsed = parseFloat(match[0]);
  return !Number.isFinite(parsed) || parsed < 0 ? 0 : Math.round(parsed);
}

/**
 * Cleanly format PKR currency with comma separators.
 * Guarantees no NaN, undefined or floating-point noise.
 */
export function formatPKR(amount: unknown): string {
  const num = sanitizePrice(amount);
  return `Rs. ${num.toLocaleString('en-PK')}`;
}

export function calculateSubtotal(items: OrderItemPriceInput[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.reduce((acc, item) => {
    const unitPrice = sanitizePrice(item.unitPrice ?? item.price);
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 1));
    return acc + unitPrice * qty;
  }, 0);
}

export function calculateDiscount(subtotal: number, couponCode?: string | null): number {
  // Public estimates never own promo rules. Only an authoritative API quote grants a promo.
  return 0;
}

/**
 * Authoritative single calculation contract used by UI and server.
 */
export function calculateOrderSummary({
  items,
  shippingMethodId = 'standard',
  couponCode,
  manualDiscount = 0,
  giftWrapping = false,
  city = 'Lahore',
}: {
  items: OrderItemPriceInput[];
  shippingMethodId?: ShippingMethodId;
  couponCode?: string | null;
  manualDiscount?: number;
  giftWrapping?: boolean;
  city?: string;
}): PricingSummary {
  const subtotal = calculateSubtotal(items);
  const couponDiscount = calculateDiscount(subtotal, couponCode);
  const discount = Math.min(subtotal, Math.max(couponDiscount, sanitizePrice(manualDiscount)));
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const giftWrapFee = giftWrapping ? GIFT_WRAP_FEE : 0;
  const shippingWeightGrams = getCartShippingWeightGrams(items);
  const shipping = calculateShipping(discountedSubtotal, shippingMethodId, giftWrapFee, city, shippingWeightGrams);
  const total = discountedSubtotal + shipping + giftWrapFee;

  return {
    subtotal,
    discount,
    discountedSubtotal,
    shipping,
    giftWrapFee,
    total,
    shippingWeightGrams,
    shippingRegion: isLahoreCity(city) ? 'lahore' : 'nationwide',
  };
}

// Backward-compatible alias for existing imports
export function calculateFinalTotal(
  items: { price: number; quantity: number }[],
  methodId: ShippingMethodId,
  discountAmt: number = 0
): { subtotal: number; shipping: number; total: number } {
  const summary = calculateOrderSummary({
    items,
    shippingMethodId: methodId,
    manualDiscount: discountAmt,
  });
  return {
    subtotal: summary.discountedSubtotal,
    shipping: summary.shipping,
    total: summary.total,
  };
}
