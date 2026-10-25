import { REWARDS } from '../data/rewards';
import type { PatronReward, ShippingMethodId } from '../types';
import { GIFT_WRAP_FEE, type PricingSummary } from './pricing';
import { isLahoreCity } from './shippingPolicy';
import { ValidationError } from './validationError';

export interface IssuedPatronReward {
  id?: string;
  rewardId: string;
  rewardType?: string;
  status: string;
  claimedAt: number;
  expiresAt: number;
}

/** Only benefits fulfilled by the canonical order transaction may cost points. */
export function supportedPatronReward(rewardId: unknown): PatronReward {
  const reward = typeof rewardId === 'string' && REWARDS.find(item => item.rewardId === rewardId);
  if (!reward || !reward.active || !['free_shipping', 'gift_packaging'].includes(reward.rewardId)) {
    throw new ValidationError('This reward is currently unavailable. No points have been deducted.', 'REWARD_UNAVAILABLE');
  }
  return reward;
}

export function validateRewardInstanceId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new ValidationError('Please select a valid patron reward.', 'INVALID_REWARD');
  }
  return value;
}

/** Pure eligibility/application contract shared by quotes and final persistence. */
export function applyPatronReward({ reward, summary, city, shippingMethodId, nowMs = Date.now() }: {
  reward: IssuedPatronReward;
  summary: PricingSummary;
  city: string;
  shippingMethodId?: ShippingMethodId;
  nowMs?: number;
}): { summary: PricingSummary; rewardDiscount: number } {
  if (reward?.status !== 'ACTIVE') throw new ValidationError('This reward has already been used or is no longer active.', 'REWARD_ALREADY_USED');
  const definition = supportedPatronReward(reward.rewardId);
  if (!Number.isFinite(reward.expiresAt) || reward.expiresAt <= nowMs) {
    throw new ValidationError('This patron reward has expired. It has not been used.', 'REWARD_EXPIRED');
  }
  if (summary.isQuoteRequest) throw new ValidationError('Rewards can be applied to payable orders only.', 'REWARD_QUOTE_UNAVAILABLE');
  if (summary.discountedSubtotal < definition.minimumOrderAmount) {
    throw new ValidationError(`This reward requires an order subtotal of at least Rs. ${definition.minimumOrderAmount.toLocaleString('en-PK')} after discounts.`, 'REWARD_MINIMUM_NOT_MET');
  }
  let benefit = 0;
  const next = { ...summary };
  if (definition.rewardId === 'free_shipping') {
    if (!isLahoreCity(city)) throw new ValidationError('Free shipping rewards are available for Lahore delivery only. Your reward has not been used.', 'SHIPPING_REWARD_LAHORE_ONLY');
    if ((shippingMethodId || 'standard') !== 'standard') throw new ValidationError('This reward applies to Lahore standard delivery only.', 'REWARD_STANDARD_SHIPPING_ONLY');
    benefit = summary.shipping;
    next.shipping = 0;
    next.freeShipping = true;
  } else {
    // Gift packaging is included even when the optional checkout checkbox is off.
    // Its normal price is already in the quote when the checkbox is on.
    benefit = summary.freeGiftWrap ? 0 : GIFT_WRAP_FEE;
    next.giftWrapFee = 0;
    next.freeGiftWrap = true;
  }
  if (benefit <= 0) throw new ValidationError('This order already includes that benefit. Your reward has not been used.', 'REWARD_NO_BENEFIT');
  next.total = next.discountedSubtotal + next.shipping + next.giftWrapFee;
  return { summary: next, rewardDiscount: benefit };
}
