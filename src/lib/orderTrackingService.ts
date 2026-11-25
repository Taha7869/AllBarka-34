import { ORDER_STATUSES, type FulfillmentStatus, type StoredOrderStatus } from './orderStatuses';
import { apiUrl } from './apiUrl';
import type { Product } from '../types';
import { reviewReorderItems } from './orderPresentation';

export interface TimelineStep {
  status: FulfillmentStatus;
  key: string;
  completed: boolean;
  current: boolean;
}

export interface PublicOrderTrackingResult {
  success: boolean;
  orderId: string;
  status: StoredOrderStatus;
  createdAt: string | null;
  updatedAt: string | null;
  city?: string | null;
  isCancelled: boolean;
  isBankTransfer?: boolean;
  timeline: TimelineStep[];
}

export const TRACKING_STEPS: FulfillmentStatus[] = [
  'ORDER_RECEIVED',
  'CONFIRMED',
  'PREPARING',
  'DISPATCHED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/**
 * Checks if a given raw phone string ends with the specified 4 digits.
 */
export function verifyPhoneLast4(rawPhone: unknown, phoneLast4: string): boolean {
  if (typeof rawPhone !== 'string' && typeof rawPhone !== 'number') return false;
  const digits = String(rawPhone).replace(/\D/g, '');
  const target = String(phoneLast4 || '').trim();
  if (target.length !== 4 || !/^\d{4}$/.test(target)) return false;
  return digits.endsWith(target);
}

/**
 * Builds the canonical visual timeline from ORDER_STATUSES for customer tracking.
 */
export function buildStatusTimeline(currentStatus: unknown): { isCancelled: boolean; timeline: TimelineStep[] } {
  const statusStr = String(currentStatus || 'ORDER_RECEIVED').toUpperCase();
  const isCancelled = statusStr === 'CANCELLED';

  const currentIndex = TRACKING_STEPS.indexOf(statusStr as FulfillmentStatus);

  const timeline: TimelineStep[] = TRACKING_STEPS.map((step, idx) => {
    let completed = false;
    let current = false;

    if (!isCancelled) {
      if (currentIndex >= 0) {
        completed = idx < currentIndex;
        current = idx === currentIndex;
      } else {
        // Unknown forward status defaults to step 0
        current = idx === 0;
      }
    }

    return {
      status: step,
      key: `order.status.${step}`,
      completed,
      current,
    };
  });

  return { isCancelled, timeline };
}

/**
 * Sanitizes order data strictly for public tracking view.
 * PRIVACY GUARANTEE: Never exposes customer name, email, full phone, street address, items, or totals.
 */
export function sanitizeOrderForTracking(order: any, orderId: string): PublicOrderTrackingResult {
  const currentStatus: StoredOrderStatus = order?.status || 'ORDER_RECEIVED';
  const { isCancelled, timeline } = buildStatusTimeline(currentStatus);
  const isBankTransfer =
    String(order?.paymentMethod || '').trim().toLowerCase() === 'bank' &&
    order?.isQuoteRequest !== true;

  return {
    success: true,
    orderId: String(order?.orderId || orderId),
    status: currentStatus,
    createdAt: order?.createdAt ? String(order.createdAt) : null,
    updatedAt: order?.updatedAt ? String(order.updatedAt) : null,
    city: order?.shippingAddress?.city || order?.city || null,
    isCancelled,
    ...(isBankTransfer ? { isBankTransfer: true } : {}),
    timeline,
  };
}

/**
 * Client-side caller for order tracking.
 */
export async function fetchOrderTracking(
  orderId: string,
  phoneLast4: string,
  signal?: AbortSignal
): Promise<PublicOrderTrackingResult> {
  const cleanOrderId = (orderId || '').trim();
  const cleanPhone = (phoneLast4 || '').trim();

  if (!cleanOrderId || !/^\d{4}$/.test(cleanPhone)) {
    throw new Error('INVALID_INPUT');
  }

  const response = await fetch(apiUrl('/api/orders/track'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: cleanOrderId,
      phoneLast4: cleanPhone,
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('ORDER_NOT_FOUND');
    }
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error('SERVER_ERROR');
  }

  const data = await response.json();
  if (!data || !data.success) {
    throw new Error('ORDER_NOT_FOUND');
  }

  return data as PublicOrderTrackingResult;
}

export interface ReorderItemResult {
  productId: string;
  name: string;
  weight: string;
  quantity: number;
  currentUnitPrice: number;
  originalUnitPrice?: number;
  priceChanged: boolean;
  image?: string;
  slug?: string;
}

export interface UnavailableReorderItem {
  productId: string;
  name: string;
  weight?: string;
  reason: 'discontinued' | 'variant_unavailable' | 'quote_only' | 'inactive';
}

export interface PublicOrderReorderResult {
  success: boolean;
  orderId: string;
  items: ReorderItemResult[];
  unavailableItems: UnavailableReorderItem[];
}

/**
 * Sanitizes order items strictly for reordering at current catalog prices.
 * PRIVACY GUARANTEE: Never exposes customer name, email, full phone, address, totals, or payment details.
 */
export function sanitizeOrderForReorder(
  pastItems: any[],
  liveProducts: Product[],
  orderId: string
): PublicOrderReorderResult {
  const analysis = reviewReorderItems(pastItems, liveProducts);

  const items: ReorderItemResult[] = analysis.reorderable.map(r => ({
    productId: r.productId,
    name: r.product.name,
    weight: r.weight,
    quantity: r.quantity,
    currentUnitPrice: r.currentUnitPrice,
    originalUnitPrice: r.originalUnitPrice,
    priceChanged: r.priceChanged,
    image: (r.product as any).images?.[0] || (r.product as any).image || '',
    slug: (r.product as any).slug,
  }));

  const unavailableItems: UnavailableReorderItem[] = analysis.unavailable.map(u => {
    const matched = liveProducts.find(p => p.id === u.productId);
    return {
      productId: u.productId,
      name: matched?.name || u.productId,
      weight: u.weight || '',
      reason: u.reason,
    };
  });

  return {
    success: true,
    orderId,
    items,
    unavailableItems,
  };
}

/**
 * Client-side caller for fetching reorder items.
 */
export async function fetchReorderItems(
  orderId: string,
  phoneLast4: string,
  signal?: AbortSignal
): Promise<PublicOrderReorderResult> {
  const cleanOrderId = (orderId || '').trim();
  const cleanPhone = (phoneLast4 || '').trim();

  if (!cleanOrderId || !/^\d{4}$/.test(cleanPhone)) {
    throw new Error('INVALID_INPUT');
  }

  const response = await fetch(apiUrl('/api/orders/reorder-items'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: cleanOrderId,
      phoneLast4: cleanPhone,
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('ORDER_NOT_FOUND');
    }
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error('SERVER_ERROR');
  }

  const data = await response.json();
  if (!data || !data.success) {
    throw new Error('ORDER_NOT_FOUND');
  }

  return data as PublicOrderReorderResult;
}
