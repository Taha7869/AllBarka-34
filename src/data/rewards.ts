import { PatronReward } from '../types';

export const REWARDS: PatronReward[] = [
  {
    rewardId: 'free_shipping',
    name: 'Free Lahore Standard Shipping',
    description: 'Waive Lahore standard delivery on an eligible order of Rs. 2,000 or more within 30 days.',
    pointsCost: 300,
    rewardType: 'SHIPPING',
    minimumOrderAmount: 2000,
    active: true,
    expiryDays: 30
  },
  {
    rewardId: 'cashew_sample',
    name: 'Free 50g Premium Cashew Sample',
    description: 'Applied automatically to your next eligible order.',
    pointsCost: 500,
    rewardType: 'SAMPLE',
    minimumOrderAmount: 1500,
    active: false,
    expiryDays: 60
  },
  {
    rewardId: 'pista_sample',
    name: 'Free 50g Premium Pista Sample',
    description: 'Applied automatically to your next eligible order.',
    pointsCost: 750,
    rewardType: 'SAMPLE',
    minimumOrderAmount: 1500,
    active: false,
    expiryDays: 60
  },
  {
    rewardId: 'gift_packaging',
    name: 'Premium Gift Packaging Upgrade',
    description: 'Include premium gift packaging without its Rs. 250 fee on your next eligible order within 90 days.',
    pointsCost: 1200,
    rewardType: 'PACKAGING',
    minimumOrderAmount: 0,
    active: true,
    expiryDays: 90
  }
];
