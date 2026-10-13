import type { PatronReward } from '../types';

// Checkout currently rejects reward application. Do not issue a paid-for voucher
// until its benefit, expiry and fulfilment are implemented and tested together.
export const REWARD_REDEMPTION_AVAILABLE = false;

export function publicRewards(rewards: PatronReward[]) {
  return rewards.map(reward => ({ ...reward, redeemable: REWARD_REDEMPTION_AVAILABLE }));
}
