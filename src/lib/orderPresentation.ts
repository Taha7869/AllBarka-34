import type { Product } from '../types';

export function orderProgress(status: string): number {
  const normalized = status.toUpperCase().replaceAll(' ', '_');
  if (normalized === 'DELIVERED') return 3;
  if (['DISPATCHED', 'OUT_FOR_DELIVERY'].includes(normalized)) return 2;
  if (['CONFIRMED', 'PACKED', 'PREPARING'].includes(normalized)) return 1;
  if (['NEW', 'ORDER_RECEIVED'].includes(normalized)) return 0;
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
