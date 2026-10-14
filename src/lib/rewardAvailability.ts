import type { PatronReward } from '../types';
import { SUPPORTED_REWARD_IDS } from './rewardFulfillment';

export const REWARD_REDEMPTION_AVAILABLE = true;

export function publicRewards(rewards: PatronReward[]) {
  return rewards.map(reward => ({ ...reward, redeemable: REWARD_REDEMPTION_AVAILABLE && reward.active && SUPPORTED_REWARD_IDS.some(id => id === reward.rewardId) }));
}
