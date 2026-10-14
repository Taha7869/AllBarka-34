import { REWARDS } from '../data/rewards';
import type { Product, ShippingMethodId } from '../types';
import type { ValidatedOrder } from './orderValidation';
import { ValidationError } from './validationError';
import { calculateShipping, isLahoreCity } from './shippingPolicy';
import { GIFT_WRAP_FEE } from './pricing';
import { calculateLoyaltyPoints } from './loyaltyPoints';

export const SUPPORTED_REWARD_IDS = ['free_shipping', 'cashew_sample', 'pista_sample', 'gift_packaging'] as const;
export interface RewardApplication {
  activeRewardId: string;
  rewardId: typeof SUPPORTED_REWARD_IDS[number];
  rewardType: 'SHIPPING' | 'SAMPLE' | 'PACKAGING';
  pointsCost: number;
  expiresAt: number;
  shippingDiscount: number;
  giftWrapDiscount: number;
  sample?: { productId: string; name: string; grams: 50; quantity: 1 };
  status: 'APPLIED' | 'FULFILLED' | 'RESTORED' | 'REFUNDED';
}
export function validActiveRewardId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{5,100}$/.test(value)) throw new ValidationError('Choose a supported reward.', 'INVALID_REWARD');
  return value;
}
export function rewardDefinition(id: unknown) {
  const definition = REWARDS.find(reward => reward.rewardId === id && reward.active && SUPPORTED_REWARD_IDS.some(value => value === id));
  if (!definition) throw new ValidationError('This reward is unavailable.', 'INVALID_REWARD');
  return definition;
}

/** Applies an authenticated voucher to canonical pricing and creates explicit physical fulfilment instructions. */
export function applyPatronReward(input: { order: ValidatedOrder; voucher: Record<string, any>; activeRewardId: string; city: string; shippingMethodId: string; catalog: Product[]; isWholesale?: boolean; now?: number }): RewardApplication {
  const { order, voucher } = input; const definition = rewardDefinition(voucher.rewardId);
  if (voucher.status !== 'ACTIVE') throw new ValidationError('This reward has already been used.', 'REWARD_ALREADY_USED');
  if (!Number.isSafeInteger(voucher.expiresAt) || !Number.isFinite(new Date(voucher.expiresAt).getTime()) || voucher.expiresAt <= (input.now ?? Date.now())) throw new ValidationError('This reward has expired.', 'REWARD_EXPIRED');
  if (voucher.pointsCost !== undefined && (!Number.isSafeInteger(voucher.pointsCost) || voucher.pointsCost <= 0 || voucher.pointsCost > 1_000_000)) throw new ValidationError('This reward could not be verified.', 'INVALID_REWARD');
  if (voucher.rewardType && voucher.rewardType !== definition.rewardType) throw new ValidationError('This reward could not be verified.', 'INVALID_REWARD');
  if (order.summary.isQuoteRequest || input.isWholesale) throw new ValidationError('Rewards apply to retail purchases.', 'REWARD_RETAIL_ONLY');
  if (order.summary.discountedSubtotal < definition.minimumOrderAmount) throw new ValidationError('This order does not meet the reward minimum.', 'REWARD_MINIMUM_NOT_MET');
  const application: RewardApplication = { activeRewardId: validActiveRewardId(input.activeRewardId), rewardId: definition.rewardId as RewardApplication['rewardId'],
    rewardType: definition.rewardType as RewardApplication['rewardType'], pointsCost: Number.isSafeInteger(voucher.pointsCost) && voucher.pointsCost > 0 ? voucher.pointsCost : definition.pointsCost,
    expiresAt: voucher.expiresAt, shippingDiscount: 0, giftWrapDiscount: 0, status: 'APPLIED' };
  if (definition.rewardType === 'SHIPPING') {
    if (!isLahoreCity(input.city)) throw new ValidationError('Free shipping rewards apply in Lahore.', 'SHIPPING_REWARD_LAHORE_ONLY');
    if (input.shippingMethodId !== 'standard') throw new ValidationError('This reward applies to standard delivery.', 'REWARD_STANDARD_ONLY');
    if (order.summary.shipping <= 0) throw new ValidationError('Delivery is already free. Keep this reward for another order.', 'REWARD_NO_ADDITIONAL_BENEFIT');
    application.shippingDiscount = order.summary.shipping; order.summary.shipping = 0;
  } else if (definition.rewardType === 'SAMPLE') {
    const productId = definition.rewardId === 'cashew_sample' ? 'kaju' : 'pista';
    const product = input.catalog.find(product => product.id === productId && product.active !== false && !product.quoteOnly);
    if (!product) throw new ValidationError('This sample is unavailable. Your reward is preserved.', 'REWARD_SAMPLE_UNAVAILABLE');
    application.sample = { productId, name: product.name_en, grams: 50, quantity: 1 };
    if (!Number.isFinite(order.summary.shippingWeightGrams)) throw new ValidationError('Delivery weight could not be verified.', 'SHIPPING_WEIGHT_UNAVAILABLE');
    order.summary.shippingWeightGrams! += 50;
    order.summary.shipping = order.summary.freeShipping ? 0 : calculateShipping(order.summary.discountedSubtotal,
      input.shippingMethodId as ShippingMethodId, order.summary.giftWrapFee, input.city, order.summary.shippingWeightGrams);
  } else if (definition.rewardType === 'PACKAGING') {
    if (order.summary.freeGiftWrap) throw new ValidationError('Gift packaging is already included. Keep this reward for another order.', 'REWARD_NO_ADDITIONAL_BENEFIT');
    application.giftWrapDiscount = GIFT_WRAP_FEE;
    order.summary.giftWrapFee = 0;
    order.summary.shipping = order.summary.freeShipping ? 0 : calculateShipping(order.summary.discountedSubtotal,
      input.shippingMethodId as ShippingMethodId, 0, input.city, order.summary.shippingWeightGrams);
  }
  order.summary.total = order.summary.discountedSubtotal + order.summary.shipping + order.summary.giftWrapFee;
  order.earnedPoints = calculateLoyaltyPoints(order.summary.total, input.isWholesale, order.summary.isQuoteRequest);
  return application;
}

/** Allowlist keeps balances, staff notes and voucher metadata out of packing/customer/integration views. */
export function sanitizeRewardApplication(raw: unknown): RewardApplication | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, any>;
  try {
    const definition = rewardDefinition(value.rewardId);
    validActiveRewardId(value.activeRewardId);
    if (value.rewardType !== definition.rewardType || !['APPLIED', 'FULFILLED', 'RESTORED', 'REFUNDED'].includes(value.status)
      || !Number.isSafeInteger(value.pointsCost) || value.pointsCost <= 0 || !Number.isSafeInteger(value.expiresAt)
      || !Number.isSafeInteger(value.shippingDiscount) || value.shippingDiscount < 0 || !Number.isSafeInteger(value.giftWrapDiscount) || value.giftWrapDiscount < 0) return null;
    const sample = value.rewardType === 'SAMPLE' && value.sample?.productId === (value.rewardId === 'cashew_sample' ? 'kaju' : 'pista') && value.sample?.grams === 50 && value.sample?.quantity === 1
      ? { productId: value.sample.productId, name: value.rewardId === 'cashew_sample' ? 'Premium Cashew Sample' : 'Premium Pista Sample', grams: 50 as const, quantity: 1 as const } : undefined;
    if (value.rewardType === 'SAMPLE' && !sample) return null;
    return { activeRewardId: value.activeRewardId, rewardId: value.rewardId, rewardType: value.rewardType, pointsCost: value.pointsCost,
      expiresAt: value.expiresAt, shippingDiscount: value.shippingDiscount, giftWrapDiscount: value.giftWrapDiscount, status: value.status, ...(sample ? { sample } : {}) };
  } catch { return null; }
}
export function rewardPackingLines(value: unknown): string[] {
  const reward = sanitizeRewardApplication(value); if (!reward || !['APPLIED', 'FULFILLED'].includes(reward.status)) return [];
  if (reward.sample) return [`Patron reward: include one free ${reward.sample.grams}g ${reward.sample.name}.`];
  return [reward.rewardType === 'PACKAGING' ? 'Patron reward: premium gift packaging included.' : 'Patron reward: Lahore standard delivery fee waived.'];
}

/** The packing wire snapshot excludes voucher IDs, point balances and redemption metadata. */
export type RewardFulfillmentNote = Omit<RewardApplication, 'activeRewardId' | 'pointsCost' | 'expiresAt'>;
export function rewardFulfillmentNote(raw: unknown): RewardFulfillmentNote | null {
  const reward = sanitizeRewardApplication(raw);
  if (!reward) return null;
  return { rewardId: reward.rewardId, rewardType: reward.rewardType, shippingDiscount: reward.shippingDiscount,
    giftWrapDiscount: reward.giftWrapDiscount, status: reward.status, ...(reward.sample ? { sample: reward.sample } : {}) };
}
export function sanitizeRewardFulfillmentNote(raw: unknown): RewardFulfillmentNote | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  return rewardFulfillmentNote({ ...value, activeRewardId: 'packing-snapshot', pointsCost: 1, expiresAt: 1 });
}
