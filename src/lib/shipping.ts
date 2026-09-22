import { STORE_CONFIG } from '../config/store';
import { ShippingMethodId } from '../types.ts';

export function calculateShipping(methodId: ShippingMethodId, subtotal: number): number {
  const isFreeThreshold = subtotal >= STORE_CONFIG.shipping.freeThreshold;
  switch (methodId) {
    case 'standard':
      return isFreeThreshold ? 0 : STORE_CONFIG.shipping.standardRate;
    case 'express':
      return isFreeThreshold ? Math.floor(STORE_CONFIG.shipping.standardRate * 1.5) : STORE_CONFIG.shipping.standardRate * 2;
    case 'sameday':
      return subtotal <= 3000 ? 500 : 300;
    default:
      return isFreeThreshold ? 0 : STORE_CONFIG.shipping.standardRate;
  }
}
