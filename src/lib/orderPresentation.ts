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

export interface ReorderReviewItem {
  productId: string;
  weight: string;
  quantity: number;
  product: Product;
  currentUnitPrice: number;
  originalUnitPrice?: number;
  priceChanged: boolean;
  status: 'available' | 'price_changed';
}

export interface ReorderUnavailableItem {
  productId: string;
  weight?: string;
  quantity?: number;
  reason: 'discontinued' | 'variant_unavailable' | 'quote_only' | 'inactive';
}

export interface ReorderAnalysis {
  reorderable: ReorderReviewItem[];
  unavailable: ReorderUnavailableItem[];
  hasUnavailableItems: boolean;
  hasPriceChanges: boolean;
  estimatedSubtotal: number;
}

/**
 * M29: Authorized order history reorder analysis against live catalog availability
 * Evaluates whether past items remain active, priced, or have experienced price changes.
 */
export function reviewReorderItems(
  pastItems: { productId?: string; id?: string; selectedWeight?: string; quantity?: number; price?: number; unitPrice?: number }[],
  liveProducts: Product[]
): ReorderAnalysis {
  const reorderable: ReorderReviewItem[] = [];
  const unavailable: ReorderUnavailableItem[] = [];
  let estimatedSubtotal = 0;
  let hasPriceChanges = false;

  for (const item of pastItems) {
    const rawId = item.productId || item.id || '';
    const cleanId = rawId.split('-')[0].trim();
    const product = liveProducts.find(p => p.id === cleanId || p.id === rawId || `${p.id}-${item.selectedWeight}` === item.id);
    const weight = item.selectedWeight;
    const qty = Number.isFinite(item.quantity) ? Math.max(1, Math.min(50, Math.floor(item.quantity!))) : 1;
    const pastPrice = item.unitPrice ?? item.price;

    if (!product) {
      unavailable.push({ productId: rawId, weight, quantity: qty, reason: 'discontinued' });
      continue;
    }

    if (product.active === false) {
      unavailable.push({ productId: product.id, weight, quantity: qty, reason: 'inactive' });
      continue;
    }

    if (product.quoteOnly) {
      unavailable.push({ productId: product.id, weight, quantity: qty, reason: 'quote_only' });
      continue;
    }

    if (!weight || typeof product.prices?.[weight] !== 'number' || product.prices[weight] <= 0) {
      unavailable.push({ productId: product.id, weight, quantity: qty, reason: 'variant_unavailable' });
      continue;
    }

    const currentPrice = product.prices[weight];
    const priceChanged = typeof pastPrice === 'number' && pastPrice > 0 && pastPrice !== currentPrice;
    if (priceChanged) hasPriceChanges = true;

    reorderable.push({
      productId: product.id,
      weight,
      quantity: qty,
      product,
      currentUnitPrice: currentPrice,
      originalUnitPrice: pastPrice,
      priceChanged,
      status: priceChanged ? 'price_changed' : 'available',
    });

    estimatedSubtotal += currentPrice * qty;
  }

  return {
    reorderable,
    unavailable,
    hasUnavailableItems: unavailable.length > 0,
    hasPriceChanges,
    estimatedSubtotal,
  };
}

export function getReorderItems(
  items: { productId?: string; id?: string; selectedWeight?: string; quantity?: number; price?: number; unitPrice?: number }[],
  products: Product[]
) {
  const review = reviewReorderItems(items, products);
  return review.reorderable.map(item => ({
    product: item.product,
    weight: item.weight,
    quantity: item.quantity,
  }));
}
