import { PROMO_CONFIG, type PromoConfig } from '../server/promoConfig';
import type { AppliedPromo } from '../types/promo';
import { ValidationError } from './validationError';

export type { PromoConfig } from '../server/promoConfig';
export type { AppliedPromo, PromoType } from '../types/promo';

export const NO_PROMO: Readonly<AppliedPromo> = Object.freeze({
  promoCode: null,
  promoType: null,
  discountAmount: 0,
  freeShipping: false,
  freeGiftWrap: false,
  freeGift: false,
  isQuoteRequest: false,
});

export function normalizePromoCode(code: unknown): string | null {
  if (code === undefined || code === null || code === '') return null;
  if (typeof code !== 'string') {
    throw new ValidationError('Enter one promo code as text.', 'INVALID_PROMO_FORMAT');
  }
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  if (/[,;+|/\s]/.test(normalized)) {
    throw new ValidationError('Only one promo code can be applied per order.', 'ONE_PROMO_ONLY');
  }
  if (normalized.length > 64 || !/^[A-Z0-9]+$/.test(normalized)) {
    throw new ValidationError('Please enter a valid promo code.', 'INVALID_PROMO_FORMAT');
  }
  return normalized;
}

export function getPromo(code: unknown): PromoConfig | null {
  const normalized = normalizePromoCode(code);
  if (!normalized) return null;
  const promo = Object.hasOwn(PROMO_CONFIG, normalized) ? PROMO_CONFIG[normalized] : null;
  if (!promo) throw new ValidationError('This promo code is invalid. Please check the code and try again.', 'INVALID_PROMO');
  return promo;
}

export interface PromoContext {
  hasPastOrders?: boolean;
  identityVerified?: boolean;
  now?: number;
}

/** Called only with a server definition and a subtotal recalculated from the canonical catalogue. */
export function evaluatePromo(
  promo: PromoConfig | null,
  subtotal: number,
  context: PromoContext = {},
): AppliedPromo {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new ValidationError('The merchandise subtotal is invalid. Please refresh your bag.', 'INVALID_PROMO_SUBTOTAL');
  }
  if (!promo) return { ...NO_PROMO };
  if (!promo.active) throw new ValidationError('This promo code is currently inactive.', 'PROMO_INACTIVE');
  const now = context.now ?? Date.now();
  if (promo.expiresAt !== undefined && promo.expiresAt !== null && now >= promo.expiresAt) {
    throw new ValidationError('This promo code has expired.', 'PROMO_EXPIRED');
  }
  if (subtotal < (promo.minOrder ?? 0)) {
    throw new ValidationError(
      `This promo code requires a minimum merchandise subtotal of Rs. ${promo.minOrder!.toLocaleString('en-PK')}.`,
      'PROMO_MIN_ORDER',
    );
  }
  if (promo.firstOrderOnly) {
    if (context.identityVerified !== true) {
      throw new ValidationError('Please sign in to use this first-order promo code.', 'PROMO_REQUIRES_AUTH');
    }
    if (context.hasPastOrders === true) {
      throw new ValidationError('This promo code is reserved for your first order.', 'PROMO_FIRST_ORDER_ONLY');
    }
    if (context.hasPastOrders !== false) {
      throw new ValidationError('Your first-order eligibility could not be verified. Please try again.', 'PROMO_HISTORY_REQUIRED');
    }
  }

  let discountAmount = 0;
  if (promo.type === 'percent') discountAmount = Math.round(subtotal * (promo.value ?? 0) / 100);
  if (promo.type === 'flat') discountAmount = Math.round(promo.value ?? 0);
  if (promo.maxDiscount !== undefined) discountAmount = Math.min(discountAmount, promo.maxDiscount);
  discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

  return {
    promoCode: promo.code,
    promoType: promo.type,
    ...(promo.value === undefined ? {} : { promoValue: promo.value }),
    discountAmount,
    freeShipping: promo.type === 'free_shipping',
    freeGiftWrap: promo.type === 'free_giftwrap',
    freeGift: promo.type === 'free_gift',
    isQuoteRequest: promo.type === 'quote',
  };
}

// Compatibility types for existing receipt and inactive entitlement code. Runtime
// checkout validation uses getPromo/evaluatePromo and ignores Firestore overrides.
export type CouponType = 'signup' | 'compassion' | 'referral' | 'general';
export type DiscountMode = 'flat' | 'percent' | 'tiered' | 'free_shipping' | 'free_giftwrap' | 'free_gift' | 'quote';
export interface CouponTier { min: number; max: number; percent: number }
export interface CouponRecord {
  code: string;
  type: CouponType;
  discountMode: DiscountMode;
  value?: number;
  tiers?: CouponTier[];
  minSubtotal?: number;
  maxDiscount?: number;
  globalLimit?: number;
  perCustomerLimit?: number;
  usedCount: number;
  expiry?: number | null;
  active: boolean;
  assignedToUid?: string | null;
  adminNote?: string;
  createdAt: number;
}

export const STORE_COUPONS: Record<string, CouponRecord> = {
  ...Object.fromEntries(Object.values(PROMO_CONFIG).map(promo => [promo.code, {
    code: promo.code,
    type: promo.firstOrderOnly ? 'signup' : 'general',
    discountMode: promo.type,
    ...(promo.value === undefined ? {} : { value: promo.value }),
    ...(promo.minOrder === undefined ? {} : { minSubtotal: promo.minOrder }),
    ...(promo.maxDiscount === undefined ? {} : { maxDiscount: promo.maxDiscount }),
    ...(promo.expiresAt === undefined ? {} : { expiry: promo.expiresAt }),
    usedCount: 0,
    active: promo.active,
    createdAt: 1710000000000,
  }] as [string, CouponRecord])),
  WELCOME200: {
    code: 'WELCOME200', type: 'signup', discountMode: 'flat', value: 200,
    minSubtotal: 2000, maxDiscount: 200, globalLimit: 1000, perCustomerLimit: 1,
    usedCount: 0, expiry: null, active: false, createdAt: 1710000000000,
  },
  COMPASSION20: {
    code: 'COMPASSION20', type: 'compassion', discountMode: 'percent', value: 20,
    minSubtotal: 1000, maxDiscount: 1500, globalLimit: 50, perCustomerLimit: 1,
    usedCount: 0, expiry: null, active: false, createdAt: 1710000000000,
  },
  REFERRAL_TIERED: {
    code: 'REFERRAL_TIERED', type: 'referral', discountMode: 'tiered',
    tiers: [{ min: 0, max: 2000, percent: 10 }, { min: 2000, max: 4000, percent: 15 }, { min: 4000, max: Infinity, percent: 20 }],
    minSubtotal: 0, globalLimit: 100, perCustomerLimit: 1, usedCount: 0,
    expiry: null, active: false, createdAt: 1710000000000,
  },
};

/** Legacy callers cannot turn a stored override into a server-approved promotion. */
export function calculateCouponDiscount(
  coupon: CouponRecord,
  subtotal: number,
  customerUid?: string | null,
  context: PromoContext = {},
): { discount: number; error?: string } {
  try {
    const promo = getPromo(coupon.code);
    if (!promo) throw new ValidationError('Please enter a promo code.', 'INVALID_PROMO');
    return { discount: evaluatePromo(promo, subtotal, { ...context, identityVerified: context.identityVerified === true && Boolean(customerUid) }).discountAmount };
  } catch (error) {
    if (error instanceof ValidationError) return { discount: 0, error: error.message };
    throw error;
  }
}
