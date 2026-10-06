import { ShippingMethodId } from '../types.ts';
import { calculateShipping as shippingPolicy } from './shippingPolicy';

export function calculateShipping(methodId: ShippingMethodId, subtotal: number, city = 'Lahore', shippingWeightGrams?: number | null): number {
  return shippingPolicy(subtotal, methodId, 0, city, shippingWeightGrams);
}
