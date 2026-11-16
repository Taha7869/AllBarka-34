import { ORDER_STATUSES, type FulfillmentStatus, type StoredOrderStatus } from './orderStatuses';
import { apiUrl } from './apiUrl';

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

  return {
    success: true,
    orderId: String(order?.orderId || orderId),
    status: currentStatus,
    createdAt: order?.createdAt ? String(order.createdAt) : null,
    updatedAt: order?.updatedAt ? String(order.updatedAt) : null,
    city: order?.shippingAddress?.city || order?.city || null,
    isCancelled,
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
