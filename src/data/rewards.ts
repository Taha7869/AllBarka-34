import { PatronReward } from '../types';

export const REWARDS: PatronReward[] = [
  {
    rewardId: 'free_shipping',
    name: 'Free Standard Shipping',
    description: 'Waive standard delivery fees on your next order.',
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
    active: true,
    expiryDays: 60
  },
  {
    rewardId: 'pista_sample',
    name: 'Free 50g Premium Pista Sample',
    description: 'Applied automatically to your next eligible order.',
    pointsCost: 750,
    rewardType: 'SAMPLE',
    minimumOrderAmount: 1500,
    active: true,
    expiryDays: 60
  },
  {
    rewardId: 'gift_packaging',
    name: 'Premium Gift Packaging Upgrade',
    description: 'Elevate your order with our luxury unboxing experience.',
    pointsCost: 1200,
    rewardType: 'PACKAGING',
    minimumOrderAmount: 0,
    active: true,
    expiryDays: 90
  }
];
