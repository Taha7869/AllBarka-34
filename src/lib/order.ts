import { apiUrl } from './apiUrl';
import { withApiDeadline } from './apiDeadline';
import type { CartItem } from '../types';

export interface OrderPayload {
  name: string;
  phone: string;
  address: string;
  city: string;
  deliverySlot?: string;
  instructions?: string;
  giftWrapping?: boolean;
  giftMessage?: string;
  paymentMethod: string;
  items: CartItem[];
  shippingMethodId: string;
  discountCode?: string | null;
  rewardId?: string | null;
  isWholesale?: boolean;
  expectedFinalTotal?: number;
  authToken?: string | null;
  idempotencyKey?: string | null;
}

export interface SupportAction {
  type: 'whatsapp' | 'call' | 'email';
  label: string;
  whatsappUrl?: string;
}

export interface OrderResponse {
  success: boolean;
  orderId?: string;
  whatsappMessage?: string;
  claimToken?: string | null;
  totals?: any;
  items?: any[];
  code?: string;
  error?: string;
  durablePersistenceReady?: boolean;
  supportAction?: SupportAction;
  isDuplicate?: boolean;
}

let isOrderInFlight = false;

function validTotals(totals: any): boolean {
  return !!totals && ['subtotal', 'discount', 'discountedSubtotal', 'shipping', 'giftWrapFee', 'total'].every(key => typeof totals[key] === 'number' && Number.isFinite(totals[key]) && totals[key] >= 0)
    && totals.discount <= totals.subtotal && Math.abs(totals.subtotal - totals.discount - totals.discountedSubtotal) <= 1
    && Math.abs(totals.discountedSubtotal + totals.shipping + totals.giftWrapFee - totals.total) <= 1;
}

function requestItems(items: CartItem[]) {
  return items.map(item => ({ id: item.id, productId: item.productId, name: item.name_en,
    selectedWeight: item.selectedWeight, quantity: item.quantity, price: item.unitPrice ?? item.price,
    hamperConfiguration: item.hamperConfiguration }));
}

/** One bounded attempt; callers retain the same idempotency key when a connection fails. */
export async function placeOrder(payload: OrderPayload, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<OrderResponse> {
  if (isOrderInFlight) return { success: false, code: 'REQUEST_IN_FLIGHT', error: 'An order submission is already in progress. Please wait a moment.' };
  isOrderInFlight = true;
  const idempotencyKey = payload.idempotencyKey || (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `ik_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  try {
    return await withApiDeadline(async signal => {
      const response = await fetch(apiUrl('/api/orders'), {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Idempotency-Key': idempotencyKey,
          ...(payload.authToken ? { Authorization: `Bearer ${payload.authToken}` } : {}) },
        body: JSON.stringify({ idempotencyKey, name: payload.name, phone: payload.phone, address: payload.address,
          city: payload.city, deliverySlot: payload.deliverySlot || 'Fastest Dispatch', instructions: payload.instructions || '',
          giftWrapping: !!payload.giftWrapping, giftMessage: payload.giftMessage || '', paymentMethod: payload.paymentMethod,
          items: requestItems(payload.items), shippingMethodId: payload.shippingMethodId, discountCode: payload.discountCode || null,
          rewardId: payload.rewardId || null, isWholesale: !!payload.isWholesale, expectedFinalTotal: payload.expectedFinalTotal }),
      });
      if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
        return { success: false, code: 'INVALID_RESPONSE', error: 'The order service returned an unexpected response. Your bag is preserved; retry or contact concierge.' };
      }
      const data = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { success: false, code: 'INVALID_RESPONSE', error: 'The order service returned an invalid response. Your bag is preserved.' };
      }
      if (!response.ok) return { success: false, code: data.code || `HTTP_${response.status}`,
        error: data.error || `Server responded with status ${response.status}`, durablePersistenceReady: data.durablePersistenceReady,
        supportAction: data.supportAction, totals: data.totals };
      if (data.success !== true) return { success: false, code: data.code || 'ORDER_REJECTED', error: data.error || 'Order was not accepted by the boutique server.' };
      if (data.durablePersistenceReady !== true) return { success: false, code: 'PERSISTENCE_UNVERIFIED', error: 'The server could not confirm a saved order. Your bag is preserved; retry or contact concierge.' };
      if (typeof data.orderId !== 'string' || data.orderId.trim().length < 5) return { success: false, code: 'INVALID_ORDER_ID', error: 'Server response missing authoritative Order ID.' };
      if (typeof data.whatsappMessage !== 'string' || !data.whatsappMessage.trim()) return { success: false, code: 'MISSING_RECEIPT', error: 'The saved order receipt is incomplete. Your bag is preserved; retry or contact concierge.' };
      if (!validTotals(data.totals) || !Array.isArray(data.items) || !data.items.length
        || data.items.some((item: any) => typeof item?.productId !== 'string' || typeof item.selectedWeight !== 'string'
          || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0)
        || Math.abs(data.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) - data.totals.subtotal) > 1) {
        return { success: false, code: 'INVALID_RECEIPT', error: 'The saved order receipt could not be verified. Your bag is preserved; retry or contact concierge.' };
      }
      // A verified duplicate intentionally returns the original persisted prices, even after a catalogue refresh.
      return { success: true, orderId: data.orderId, whatsappMessage: data.whatsappMessage,
        claimToken: typeof data.claimToken === 'string' ? data.claimToken : null, totals: data.totals, items: data.items,
        isDuplicate: data.isDuplicate === true, durablePersistenceReady: true };
    }, options.timeoutMs ?? 15000, options.signal);
  } catch (error: any) {
    return error?.name === 'AbortError'
      ? { success: false, code: 'TIMEOUT', error: 'Connection timed out while securing your order. Your bag is preserved. Please retry.' }
      : { success: false, code: 'NETWORK_ERROR', error: error?.message || 'The order service is unreachable. Your bag is preserved. Please retry.' };
  } finally { isOrderInFlight = false; }
}

/** An authoritative price check never creates an order or consumes a coupon. */
export async function getOrderQuote(params: {
  items: CartItem[]; city: string; shippingMethodId: string; discountCode?: string | null; rewardId?: string | null;
  giftWrapping?: boolean; isWholesale?: boolean; authToken?: string | null; signal?: AbortSignal;
}): Promise<{ success: boolean; totals?: any; items?: any[]; earnedPoints?: number; error?: string; code?: string }> {
  try {
    return await withApiDeadline(async signal => {
      const response = await fetch(apiUrl('/api/orders/quote'), {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(params.authToken ? { Authorization: `Bearer ${params.authToken}` } : {}) },
        body: JSON.stringify({ items: requestItems(params.items), city: params.city, shippingMethodId: params.shippingMethodId,
          discountCode: params.discountCode || null, rewardId: params.rewardId || null, giftWrapping: !!params.giftWrapping, isWholesale: !!params.isWholesale }),
      });
      const data = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) return { success: false, code: 'INVALID_QUOTE', error: 'The price check returned an invalid response. Please retry.' };
      if (!response.ok) return { success: false, code: data.code || `HTTP_${response.status}`, error: data.error || 'Failed to calculate quote' };
      if (data.success !== true || !validTotals(data.totals)) return { success: false, code: 'INVALID_QUOTE', error: 'The price check returned inconsistent totals. Please retry.' };
      return { success: true, totals: data.totals, items: data.items, earnedPoints: data.earnedPoints };
    }, 12000, params.signal);
  } catch (error: any) {
    return error?.name === 'AbortError' ? { success: false, code: 'TIMEOUT', error: 'The price check timed out. Please retry.' }
      : { success: false, code: 'NETWORK_ERROR', error: error?.message || 'Quote service unreachable' };
  }
}

/** Claims a guest order only after the authenticated server confirms ownership. */
export async function claimOrder(params: { orderId: string; claimToken: string; authToken: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    return await withApiDeadline(async signal => {
      const response = await fetch(apiUrl('/api/orders/claim'), {
        method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.authToken}` },
        body: JSON.stringify({ orderId: params.orderId, claimToken: params.claimToken }),
      });
      const data = await response.json();
      if (!response.ok || data?.success !== true) return { success: false, error: data?.error || 'Claiming order failed' };
      return { success: true, message: data.message };
    }, 12000);
  } catch (error: any) { return { success: false, error: error?.message || 'Network error during claiming' }; }
}

/** Retrieves a saved receipt using account ownership or a private guest recovery header. */
export async function getOrderDetails(params: { orderId: string; authToken?: string | null; claimToken?: string | null; signal?: AbortSignal }): Promise<{ success: boolean; order?: any; error?: string }> {
  try {
    return await withApiDeadline(async signal => {
      const response = await fetch(apiUrl(`/api/orders/${encodeURIComponent(params.orderId)}`), { signal,
        headers: { Accept: 'application/json', ...(params.authToken ? { Authorization: `Bearer ${params.authToken}` } : {}),
          ...(params.claimToken ? { 'X-Guest-Claim-Token': params.claimToken } : {}) },
      });
      const data = await response.json();
      if (!response.ok || data?.success !== true || data.order?.orderId !== params.orderId) return { success: false, error: data?.error || 'Order lookup failed' };
      return { success: true, order: data.order };
    }, 12000, params.signal);
  } catch (error: any) { return { success: false, error: error?.message || 'Order lookup failed' }; }
}
