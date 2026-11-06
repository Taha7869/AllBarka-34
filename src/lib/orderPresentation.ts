import type { Product } from '../types';
import { storedOrderStatus } from './orderStatuses';
import { apiUrl } from './apiUrl';
import { withApiDeadline } from './apiDeadline';

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
  serverValidated?: boolean;
  serverResponseReceived?: boolean;
  itemsApprovedForCart?: boolean;
  isQuoteRequest?: boolean;
  requiresRenewedReview?: boolean;
  serverNotice?: string;
  quoteRequiredNotice?: string;
  quoteErrorCode?: string;
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

export interface RevalidateReorderOptions {
  city?: string;
  shippingMethodId?: string;
  authToken?: string | null;
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
}

/**
 * Validates reorder items against the authoritative server quote endpoint (/api/orders/quote).
 * Detects server-side price adjustments, quote-required configurations, or product unavailabilities.
 * Flags requiresRenewedReview if the server outcome differs from the initial client estimate.
 */
export async function revalidateReorderWithServerQuote(
  analysis: ReorderAnalysis,
  options?: RevalidateReorderOptions
): Promise<ReorderAnalysis> {
  if (analysis.reorderable.length === 0) {
    return { ...analysis, serverResponseReceived: true, serverValidated: true, itemsApprovedForCart: false };
  }

  const fetchImpl = options?.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchImpl) {
    return { ...analysis, serverResponseReceived: false, serverValidated: false, itemsApprovedForCart: false };
  }

  const city = options?.city || 'Lahore';
  const shippingMethodId = options?.shippingMethodId || 'standard';

  try {
    const payload = {
      items: analysis.reorderable.map(i => ({
        productId: i.productId,
        selectedWeight: i.weight,
        quantity: i.quantity,
      })),
      city,
      shippingMethodId,
    };

    const targetUrl = typeof apiUrl === 'function' ? apiUrl('/api/orders/quote') : '/api/orders/quote';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (options?.authToken) {
      headers.Authorization = `Bearer ${options.authToken}`;
    }

    const res = await withApiDeadline(
      async signal =>
        fetchImpl(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: options?.signal ? options.signal : signal,
        }),
      12000,
      options?.signal
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 400 && err.code === 'QUOTE_REQUIRED') {
        return {
          ...analysis,
          serverResponseReceived: true,
          serverValidated: true,
          itemsApprovedForCart: false,
          isQuoteRequest: true,
          requiresRenewedReview: true,
          quoteErrorCode: 'QUOTE_REQUIRED',
          quoteRequiredNotice: err.error || 'One or more items require a personalized quote from our concierge.',
        };
      }
      if (res.status === 400 && (err.code === 'PRODUCT_UNAVAILABLE' || err.code === 'VARIANT_UNAVAILABLE')) {
        return {
          ...analysis,
          serverResponseReceived: true,
          serverValidated: true,
          itemsApprovedForCart: false,
          hasUnavailableItems: true,
          requiresRenewedReview: true,
          quoteErrorCode: err.code,
          serverNotice: err.error || 'One or more items are currently unavailable for reorder.',
        };
      }
      return {
        ...analysis,
        serverResponseReceived: true,
        serverValidated: false,
        itemsApprovedForCart: false,
        quoteErrorCode: err.code || 'SERVER_ERROR',
        serverNotice: err.error || 'Authoritative order quote verification failed.',
      };
    }

    const data = await res.json();
    if (data && data.totals && Array.isArray(data.items)) {
      const isQuote = Boolean(data.totals.isQuoteRequest);
      let priceChanged = false;
      const updatedReorderable: ReorderReviewItem[] = [];
      const additionalUnavailable: ReorderUnavailableItem[] = [...analysis.unavailable];

      for (const item of analysis.reorderable) {
        // Exact product & variant identity match - strictly NO prefix guesses
        const found = data.items.find((si: any) =>
          si.productId === item.productId &&
          (si.selectedWeight === item.weight || si.weight === item.weight)
        );

        if (found && typeof found.price === 'number') {
          const changed = item.originalUnitPrice !== undefined && item.originalUnitPrice !== found.price;
          if (changed) priceChanged = true;

          const updatedProduct: Product = {
            ...item.product,
            prices: {
              ...(item.product.prices || {}),
              [item.weight]: found.price,
            },
            variants: item.product.variants?.map(v =>
              v.label.trim() === item.weight.trim() ? { ...v, price: found.price } : v
            ),
          };

          updatedReorderable.push({
            ...item,
            product: updatedProduct,
            currentUnitPrice: found.price,
            priceChanged: changed,
            status: (changed ? 'price_changed' : 'available') as 'price_changed' | 'available',
          });
        } else {
          // If server failed or omitted this variant, treat as unavailable
          additionalUnavailable.push({
            productId: item.productId,
            weight: item.weight,
            quantity: item.quantity,
            reason: 'variant_unavailable',
          });
        }
      }

      const calculatedSubtotal = updatedReorderable.reduce(
        (sum, item) => sum + item.currentUnitPrice * item.quantity,
        0
      );
      const serverSubtotal = Number(data.totals.subtotal) || calculatedSubtotal;
      const hasUnavailable = additionalUnavailable.length > 0;
      const hasPriceChanges = priceChanged || analysis.hasPriceChanges;

      const requiresRenewedReview =
        hasPriceChanges ||
        hasUnavailable ||
        isQuote ||
        serverSubtotal !== analysis.estimatedSubtotal;

      const itemsApprovedForCart = !isQuote && updatedReorderable.length > 0;

      return {
        reorderable: updatedReorderable,
        unavailable: additionalUnavailable,
        hasUnavailableItems: hasUnavailable,
        hasPriceChanges,
        estimatedSubtotal: serverSubtotal,
        serverResponseReceived: true,
        serverValidated: true,
        itemsApprovedForCart,
        isQuoteRequest: isQuote,
        requiresRenewedReview,
        quoteRequiredNotice: isQuote ? (data.totals.quoteNotice || 'One or more items require a personalized quote from our concierge.') : undefined,
      };
    }

    return {
      ...analysis,
      serverResponseReceived: true,
      serverValidated: false,
      itemsApprovedForCart: false,
      serverNotice: 'The quote service returned an invalid response format.',
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        ...analysis,
        serverResponseReceived: false,
        serverValidated: false,
        itemsApprovedForCart: false,
        serverNotice: 'Reorder validation was cancelled.',
      };
    }
    return {
      ...analysis,
      serverResponseReceived: false,
      serverValidated: false,
      itemsApprovedForCart: false,
      serverNotice: err?.message || 'Server quote request failed.',
    };
  }
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
