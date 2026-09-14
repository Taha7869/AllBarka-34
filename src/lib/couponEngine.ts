import { PricingSummary } from './pricing';
import { ValidationError } from './orderValidation';

export type CouponType = 'signup' | 'compassion' | 'referral' | 'general';
export type DiscountMode = 'flat' | 'percent' | 'tiered';

export interface CouponTier {
  min: number;
  max: number;
  percent: number;
}

export interface CouponRecord {
  code: string; // Uppercased normalized code
  type: CouponType;
  discountMode: DiscountMode;
  value?: number; // percentage (0-100) or flat amount in PKR
  tiers?: CouponTier[];
  minSubtotal?: number; // minimum qualifying merchandise subtotal in PKR
  maxDiscount?: number; // maximum discount cap in PKR
  globalLimit?: number; // total redemptions allowed globally
  perCustomerLimit?: number; // redemptions allowed per customer
  usedCount: number;
  expiry?: number | null; // unix timestamp ms
  active: boolean;
  assignedToUid?: string | null;
  adminNote?: string;
  createdAt: number;
}

/**
 * Built-in coupon definitions for AllBarka.
 * Active: ALLBARKA10 (approved 10% discount)
 * Inactive fixtures: WELCOME200, COMPASSION20, REFERRAL_TIERED (awaiting business owner approval)
 */
export const STORE_COUPONS: Record<string, CouponRecord> = {
  ALLBARKA10: {
    code: 'ALLBARKA10',
    type: 'general',
    discountMode: 'percent',
    value: 10,
    minSubtotal: 0,
    maxDiscount: undefined,
    globalLimit: undefined,
    perCustomerLimit: undefined,
    usedCount: 0,
    expiry: null,
    active: true,
    adminNote: 'Standard 10% boutique discount on merchandise subtotal',
    createdAt: 1710000000000,
  },
  WELCOME200: {
    code: 'WELCOME200',
    type: 'signup',
    discountMode: 'flat',
    value: 200,
    minSubtotal: 2000,
    maxDiscount: 200,
    globalLimit: 1000,
    perCustomerLimit: 1,
    usedCount: 0,
    expiry: null,
    active: false, // Inactive fixture until owner sign-off
    adminNote: 'Rs. 200 off first order over Rs. 2,000 for new patrons',
    createdAt: 1710000000000,
  },
  COMPASSION20: {
    code: 'COMPASSION20',
    type: 'compassion',
    discountMode: 'percent',
    value: 20,
    minSubtotal: 1000,
    maxDiscount: 1500,
    globalLimit: 50,
    perCustomerLimit: 1,
    usedCount: 0,
    expiry: null,
    active: false, // Inactive fixture
    adminNote: '20% special care discount, capped at Rs. 1,500',
    createdAt: 1710000000000,
  },
  REFERRAL_TIERED: {
    code: 'REFERRAL_TIERED',
    type: 'referral',
    discountMode: 'tiered',
    tiers: [
      { min: 0, max: 2000, percent: 10 },
      { min: 2000, max: 4000, percent: 15 },
      { min: 4000, max: Infinity, percent: 20 },
    ],
    minSubtotal: 0,
    globalLimit: 100,
    perCustomerLimit: 1,
    usedCount: 0,
    expiry: null,
    active: false, // Inactive fixture
    adminNote: 'Tiered referral voucher (10% under 2k, 15% 2k-4k, 20% 4k+)',
    createdAt: 1710000000000,
  }
};

/**
 * Calculates discount for a validated coupon record against merchandise subtotal.
 */
export function calculateCouponDiscount(
  coupon: CouponRecord,
  subtotal: number,
  customerUid?: string | null
): { discount: number; error?: string } {
  if (!coupon.active) {
    return { discount: 0, error: 'This coupon code is currently inactive.' };
  }

  const now = Date.now();
  if (coupon.expiry && now > coupon.expiry) {
    return { discount: 0, error: 'This coupon code has expired.' };
  }

  if (coupon.assignedToUid && coupon.assignedToUid !== customerUid) {
    return { discount: 0, error: 'This coupon is personalized and exclusive to another patron account.' };
  }

  if (coupon.globalLimit !== undefined && coupon.usedCount >= coupon.globalLimit) {
    return { discount: 0, error: 'This promotional code has reached its maximum global usage limit.' };
  }

  const minSubtotal = coupon.minSubtotal || 0;
  if (subtotal < minSubtotal) {
    return {
      discount: 0,
      error: `This coupon requires a minimum merchandise subtotal of Rs. ${minSubtotal.toLocaleString('en-PK')}.`
    };
  }

  let rawDiscount = 0;
  if (coupon.discountMode === 'flat') {
    rawDiscount = Math.round(coupon.value || 0);
  } else if (coupon.discountMode === 'percent') {
    const pct = Math.min(100, Math.max(0, coupon.value || 0));
    rawDiscount = Math.round(subtotal * (pct / 100));
  } else if (coupon.discountMode === 'tiered' && Array.isArray(coupon.tiers)) {
    // Find matching tier
    const tier = coupon.tiers.find(t => subtotal >= t.min && subtotal < t.max);
    if (tier) {
      rawDiscount = Math.round(subtotal * (tier.percent / 100));
    }
  }

  if (coupon.maxDiscount !== undefined && coupon.maxDiscount > 0) {
    rawDiscount = Math.min(rawDiscount, coupon.maxDiscount);
  }

  // Never discount more than subtotal
  const discount = Math.min(subtotal, Math.max(0, rawDiscount));
  return { discount };
}
