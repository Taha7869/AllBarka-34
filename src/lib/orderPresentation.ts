import type { Product } from '../types';
import { storedOrderStatus } from './orderStatuses';

export const TRACKING_POLL_MS = 30000;
export const TRACKING_STEPS = ['ORDER_RECEIVED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
export function trackingProgress(status: string): number {
  const canonical = storedOrderStatus(status);
  return TRACKING_STEPS.indexOf(canonical as typeof TRACKING_STEPS[number]);
}

export function orderProgress(status: string): number {
  const normalized = storedOrderStatus(status);
  if (normalized === 'DELIVERED') return 3;
  if (normalized && ['DISPATCHED', 'OUT_FOR_DELIVERY'].includes(normalized)) return 2;
  if (normalized && ['CONFIRMED', 'PREPARING'].includes(normalized)) return 1;
  if (normalized === 'ORDER_RECEIVED') return 0;
  return -1; // Cancelled or unknown statuses must never imply delivery progress.
}

export function getReorderItems(items: { productId?: string; id?: string; selectedWeight?: string; quantity?: number }[], products: Product[]) {
  return items.flatMap(item => {
    const product = products.find(p => p.id === item.productId || p.id === item.id || `${p.id}-${item.selectedWeight}` === item.id);
    const weight = item.selectedWeight;
    if (!product || !weight || !product.prices[weight]) return [];
    const quantity = Number.isFinite(item.quantity) ? Math.max(1, Math.min(50, Math.floor(item.quantity!))) : 1;
    return [{ product, weight, quantity }];
  });
}
