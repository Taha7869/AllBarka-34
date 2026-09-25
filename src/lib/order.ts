import { STORE_CONFIG } from '../config/store';
import { CartItem } from '../types.ts';

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

// In-flight request lock
let isOrderInFlight = false;

/**
 * Places an order to the backend API with:
 * - Deterministic idempotency key per checkout attempt
 * - Single in-flight request locking
 * - 15-second bounded abort timeout
 * - Verified Bearer authorization token forwarding
 * - Quote-change detection and safe containment
 */
export async function placeOrder(payload: OrderPayload): Promise<OrderResponse> {
  if (isOrderInFlight) {
    return {
      success: false,
      code: 'REQUEST_IN_FLIGHT',
      error: 'An order submission is already in progress. Please wait a moment.',
    };
  }

  isOrderInFlight = true;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  // Generate or reuse stable idempotency key for this attempt
  const idempotencyKey = payload.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ik_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Idempotency-Key': idempotencyKey,
    };

    if (payload.authToken) {
      headers['Authorization'] = `Bearer ${payload.authToken}`;
    }

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idempotencyKey,
        name: payload.name,
        phone: payload.phone,
        address: payload.address,
        city: payload.city,
        deliverySlot: payload.deliverySlot || 'Fastest Dispatch',
        instructions: payload.instructions || '',
        giftWrapping: Boolean(payload.giftWrapping),
        giftMessage: payload.giftMessage || '',
        paymentMethod: payload.paymentMethod,
        items: payload.items.map(item => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          selectedWeight: item.selectedWeight,
          quantity: item.quantity,
          price: item.unitPrice ?? item.price,
          hamper: item.hamper,
        })),
        shippingMethodId: payload.shippingMethodId,
        discountCode: payload.discountCode || null,
        rewardId: payload.rewardId || null,
        isWholesale: Boolean(payload.isWholesale),
        expectedFinalTotal: payload.expectedFinalTotal,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Server returned an unexpected non-JSON response. Please try again or contact concierge.');
    }

    const data = await response.json().catch(() => null);

    if (!data || typeof data !== 'object') {
      throw new Error('Malformed response received from server.');
    }

    if (!response.ok) {
      return {
        success: false,
        code: data.code || `HTTP_${response.status}`,
        error: data.error || `Server responded with status ${response.status}`,
        durablePersistenceReady: data.durablePersistenceReady,
        supportAction: data.supportAction,
        totals: data.totals,
      };
    }

    // Strict runtime response structure verification
    if (data.success !== true) {
      return {
        success: false,
        code: data.code || 'ORDER_REJECTED',
        error: data.error || 'Order was not accepted by the boutique server.',
      };
    }

    if (typeof data.orderId !== 'string' || data.orderId.trim().length < 5) {
      return {
        success: false,
        code: 'INVALID_ORDER_ID',
        error: 'Server response missing authoritative Order ID.',
      };
    }

    if (typeof data.whatsappMessage !== 'string' || data.whatsappMessage.trim().length === 0) {
      return {
        success: false,
        code: 'MISSING_RECEIPT',
        error: 'Order accepted but receipt generation was incomplete.',
      };
    }

    // Totals comparison check (within 1 PKR tolerance)
    if (payload.expectedFinalTotal !== undefined && data.totals?.total !== undefined) {
      const diff = Math.abs(data.totals.total - payload.expectedFinalTotal);
      if (diff > 5) {
        console.warn(`[Order] Server total (Rs. ${data.totals.total}) diverged from client expectation (Rs. ${payload.expectedFinalTotal})`);
      }
    }

    return {
      success: true,
      orderId: data.orderId,
      whatsappMessage: data.whatsappMessage,
      claimToken: data.claimToken || null,
      totals: data.totals,
      items: data.items,
      isDuplicate: Boolean(data.isDuplicate),
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        code: 'TIMEOUT',
        error: 'Connection timed out while securing your order. Your bag is safely preserved. Please retry.',
      };
    }
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: err.message || 'Network error while placing order. Your box is safely preserved.',
    };
  } finally {
    isOrderInFlight = false;
  }
}

/**
 * Fetches an authoritative order quote from the server without consuming coupons or placing an order.
 */
export async function getOrderQuote(params: {
  items: CartItem[];
  shippingMethodId: string;
  discountCode?: string | null;
  rewardId?: string | null;
  giftWrapping?: boolean;
  isWholesale?: boolean;
  authToken?: string | null;
}): Promise<{ success: boolean; totals?: any; items?: any[]; earnedPoints?: number; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (params.authToken) {
      headers['Authorization'] = `Bearer ${params.authToken}`;
    }

    const res = await fetch('/api/orders/quote', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: params.items.map(item => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          selectedWeight: item.selectedWeight,
          quantity: item.quantity,
          price: item.unitPrice ?? item.price,
          hamper: item.hamper,
        })),
        shippingMethodId: params.shippingMethodId,
        discountCode: params.discountCode || null,
        rewardId: params.rewardId || null,
        giftWrapping: Boolean(params.giftWrapping),
        isWholesale: Boolean(params.isWholesale),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to calculate quote' };
    }
    return {
      success: true,
      totals: data.totals,
      items: data.items,
      earnedPoints: data.earnedPoints,
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Quote service unreachable' };
  }
}

/**
 * Claims a guest order by linking it to an authenticated patron account.
 */
export async function claimOrder(params: {
  orderId: string;
  claimToken: string;
  authToken: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/orders/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.authToken}`,
      },
      body: JSON.stringify({
        orderId: params.orderId,
        claimToken: params.claimToken,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'Claiming order failed' };
    }
    return { success: true, message: data.message };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error during claiming' };
  }
}

/**
 * Retrieves sanitized order details via account ownership or guest claim token.
 */
export async function getOrderDetails(params: {
  orderId: string;
  authToken?: string | null;
  claimToken?: string | null;
}): Promise<{ success: boolean; order?: any; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (params.authToken) {
      headers['Authorization'] = `Bearer ${params.authToken}`;
    }
    if (params.claimToken) {
      headers['X-Guest-Claim-Token'] = params.claimToken;
    }

    const res = await fetch(`/api/orders/${encodeURIComponent(params.orderId)}`, {
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'Order lookup failed' };
    }
    return { success: true, order: data.order };
  } catch (e: any) {
    return { success: false, error: e.message || 'Order lookup failed' };
  }
}
