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
 * Unambiguous identity helper for resolving a past order item or cart key to a canonical live product.
 * Prioritizes exact stable product IDs, exact composite matches, and disambiguated longest-prefix matching.
 * Never naively splits at the first hyphen, preventing prefix collisions (e.g. 'gift' vs 'gift-box').
 */
export function resolveReorderProduct(
  item: { productId?: string; id?: string; selectedWeight?: string },
  liveProducts: Product[]
): { product: Product | null; weight?: string } {
  // 1. Exact productId match first
  if (item.productId) {
    const p = liveProducts.find(prod => prod.id === item.productId);
    if (p) return { product: p, weight: item.selectedWeight };
  }

  // 2. Exact item.id match
  if (item.id) {
    const exact = liveProducts.find(prod => prod.id === item.id);
    if (exact) return { product: exact, weight: item.selectedWeight };
  }

  // 3. Composite key with known selectedWeight: `${p.id}-${selectedWeight}`
  if (item.id && item.selectedWeight) {
    const suffix = `-${item.selectedWeight}`;
    if (item.id.endsWith(suffix)) {
      const candidateId = item.id.slice(0, -suffix.length);
      const match = liveProducts.find(prod => prod.id === candidateId);
      if (match) return { product: match, weight: item.selectedWeight };
    }
  }

  // 4. Disambiguated prefix matching for composite keys without selectedWeight
  if (item.id) {
    const candidates = liveProducts.filter(prod => item.id!.startsWith(`${prod.id}-`));
    if (candidates.length > 0) {
      // Pick longest matching product ID to prevent prefix collisions
      candidates.sort((a, b) => b.id.length - a.id.length);
      const best = candidates[0];
      const weight = item.selectedWeight || item.id.slice(best.id.length + 1);
      return { product: best, weight };
    }
  }

  return { product: null, weight: item.selectedWeight };
}

/**
 * M29: Authorized order history reorder analysis against live catalog availability.
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
    const { product, weight } = resolveReorderProduct(item, liveProducts);
    const rawId = item.productId || item.id || '';
    const qty = Number.isFinite(item.quantity) ? Math.max(1, Math.min(50, Math.floor(item.quantity!))) : 1;
    const pastPrice = item.unitPrice ?? item.price;

    if (!product) {
      unavailable.push({ productId: rawId, weight, quantity: qty, reason: 'discontinued' });
      continue;
    }

    if (product.active === false || (product as any).status === 'draft' || (product as any).status === 'archived') {
      unavailable.push({ productId: product.id, weight, quantity: qty, reason: 'inactive' });
      continue;
    }

    if (product.quoteOnly || product.orderMode === 'inquiry_quote') {
      unavailable.push({ productId: product.id, weight, quantity: qty, reason: 'quote_only' });
      continue;
    }

    const disabledLabels = new Set(
      Array.isArray(product.variants)
        ? product.variants.filter(v => v && v.available === false).map(v => v.label.trim())
        : []
    );

    if (!weight || disabledLabels.has(weight.trim()) || typeof product.prices?.[weight] !== 'number' || product.prices[weight] <= 0) {
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
