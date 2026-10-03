import type { OrderPayload } from './order';

export const CHECKOUT_ATTEMPT_KEY = 'allbarka_checkout_attempt_v1';
const MAX_AGE_MS = 7 * 86400000;

export interface CheckoutAttempt {
  fingerprint: string;
  key: string;
  createdAt: number;
}

/** Price refreshes and refreshed auth tokens must not turn a retry into a new order. */
export async function checkoutFingerprint(payload: OrderPayload): Promise<string> {
  const serialized = JSON.stringify({
    name: payload.name.trim(), phone: payload.phone.trim(), address: payload.address.trim(), city: payload.city.trim(),
    deliverySlot: payload.deliverySlot?.trim() || 'Fastest Dispatch', instructions: payload.instructions?.trim() || '',
    giftWrapping: !!payload.giftWrapping, giftMessage: payload.giftMessage?.trim() || '', paymentMethod: payload.paymentMethod,
    shippingMethodId: payload.shippingMethodId, discountCode: payload.discountCode?.trim().toUpperCase() || null,
    rewardId: payload.rewardId || null, isWholesale: !!payload.isWholesale,
    items: payload.items.map(item => ({ id: item.productId || item.id, portion: item.selectedWeight, quantity: item.quantity, hamperConfiguration: item.hamperConfiguration })),
  });
  try {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    // Older insecure browser contexts can still reuse the attempt in memory.
    // This fallback is never written to browser storage.
    return serialized;
  }
}

function currentAttempt(attempt: CheckoutAttempt, now: number): boolean {
  return typeof attempt.key === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(attempt.key)
    && Number.isFinite(attempt.createdAt) && attempt.createdAt <= now + 60000 && now - attempt.createdAt <= MAX_AGE_MS;
}

export function resolveCheckoutAttempt(fingerprint: string, previous: CheckoutAttempt | null, createKey: () => string, now = Date.now()): CheckoutAttempt {
  if (previous && currentAttempt(previous, now) && previous.fingerprint === fingerprint) return previous;
  return { fingerprint, key: createKey(), createdAt: now };
}

export function readCheckoutAttempt(now = Date.now()): CheckoutAttempt | null {
  try {
    const attempt = JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY) || 'null');
    return attempt && typeof attempt.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(attempt.fingerprint)
      && currentAttempt(attempt, now) ? attempt : null;
  } catch { return null; }
}

/** Recovery storage is optional and must never determine whether an order succeeded. */
export function writeCheckoutSession(key: string, value: string): boolean {
  try { sessionStorage.setItem(key, value); return true; } catch { return false; }
}

export function persistCheckoutAttempt(attempt: CheckoutAttempt): boolean {
  return /^[a-f0-9]{64}$/.test(attempt.fingerprint)
    ? writeCheckoutSession(CHECKOUT_ATTEMPT_KEY, JSON.stringify(attempt)) : false;
}

export function clearCheckoutAttempt(): void {
  try { sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY); } catch { /* memory remains sufficient */ }
}
