import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutFingerprint, CHECKOUT_ATTEMPT_KEY, clearCheckoutAttempt, persistCheckoutAttempt, readCheckoutAttempt, resolveCheckoutAttempt, writeCheckoutSession } from '../src/lib/checkoutAttempt';
import { getOrderQuote, type OrderPayload } from '../src/lib/order';
import { acceptedCheckoutReceipt } from '../src/lib/checkoutReceipt';
import { PRODUCTS, getProductImage } from '../src/data/products';

const product = PRODUCTS.find(product => product.id === 'pista')!;
const payload: OrderPayload = {
  name: 'Test Customer', phone: '03160666083', address: 'House 1, Main Street', city: 'Lahore', paymentMethod: 'cod', shippingMethodId: 'standard',
  items: [{ id: 'pista-500g', productId: 'pista', slug: 'pista', name_en: product.name_en, name_ur: product.name_ur, name_ar: product.name_ar, image: getProductImage(product), selectedWeight: '500g', quantity: 2, unitPrice: 2500, price: 2500 }],
};

test('identical retries keep their attempt key despite price and auth-token refreshes', async () => {
  const fingerprint = await checkoutFingerprint(payload);
  const refreshed = await checkoutFingerprint({ ...payload, authToken: 'new-token', expectedFinalTotal: 9999, items: payload.items.map(item => ({ ...item, unitPrice: 9999, price: 9999 })) });
  assert.equal(refreshed, fingerprint);
  const attempt = resolveCheckoutAttempt(fingerprint, null, () => 'attempt-12345678');
  assert.equal(resolveCheckoutAttempt(refreshed, attempt, () => { throw new Error('Retry must not mint a new key'); }), attempt);
});

test('changing real order details creates a new attempt rather than reusing an old order', async () => {
  const fingerprint = await checkoutFingerprint(payload);
  const attempt = resolveCheckoutAttempt(fingerprint, null, () => 'first-attempt-123');
  const changes: OrderPayload[] = [
    { ...payload, address: 'House 2, Other Street' }, { ...payload, paymentMethod: 'bank' }, { ...payload, shippingMethodId: 'express' },
    { ...payload, giftWrapping: true, giftMessage: 'Happy birthday' }, { ...payload, items: payload.items.map(item => ({ ...item, quantity: 3 })) },
  ];
  for (const changed of changes) {
    const nextFingerprint = await checkoutFingerprint(changed);
    assert.notEqual(nextFingerprint, fingerprint);
    assert.equal(resolveCheckoutAttempt(nextFingerprint, attempt, () => 'next-attempt-123').key, 'next-attempt-123');
  }
});

test('session recovery retains the attempt without persisting extra recipient data', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
  try {
    const attempt = resolveCheckoutAttempt(await checkoutFingerprint(payload), null, () => 'reload-attempt-123');
    assert.equal(persistCheckoutAttempt(attempt), true);
    const saved = values.get(CHECKOUT_ATTEMPT_KEY)!;
    assert.doesNotMatch(saved, /Test Customer|03160666083|Main Street/);
    const restored = readCheckoutAttempt();
    assert.deepEqual(restored, attempt);
    assert.equal(resolveCheckoutAttempt(attempt.fingerprint, restored, () => 'must-not-use-new').key, attempt.key);
    clearCheckoutAttempt();
    assert.equal(readCheckoutAttempt(), null);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor); else delete (globalThis as any).sessionStorage;
  }
});

test('blocked recovery storage does not throw after an accepted order', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get: () => { throw new Error('Storage blocked'); } });
  try {
    assert.equal(writeCheckoutSession('pendingClaimToken', 'test-token'), false);
    assert.equal(writeCheckoutSession('pendingOrderId', 'test-order'), false);
    assert.equal(readCheckoutAttempt(), null);
    assert.doesNotThrow(clearCheckoutAttempt);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor); else delete (globalThis as any).sessionStorage;
  }
});

test('a hung quote request returns a retryable failure within twelve seconds', async context => {
  const originalFetch = globalThis.fetch;
  context.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = ((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal!.addEventListener('abort', () => reject(new DOMException('Request aborted', 'AbortError')), { once: true });
  })) as typeof fetch;
  try {
    const pending = getOrderQuote({ items: payload.items, city: payload.city, shippingMethodId: 'standard' });
    context.mock.timers.tick(12000);
    const result = await pending;
    assert.equal(result.success, false);
    assert.equal(result.code, 'TIMEOUT');
  } finally { globalThis.fetch = originalFetch; context.mock.timers.reset(); }
});

test('quote timeout also covers a response body that never arrives', async context => {
  const originalFetch = globalThis.fetch;
  context.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = (async (_url: string, init: RequestInit) => ({ ok: true, json: () => new Promise((_resolve, reject) => {
    init.signal!.addEventListener('abort', () => reject(new DOMException('Body aborted', 'AbortError')), { once: true });
  }) })) as typeof fetch;
  try {
    const pending = getOrderQuote({ items: payload.items, city: payload.city, shippingMethodId: 'standard' });
    await Promise.resolve();
    context.mock.timers.tick(12000);
    const result = await pending;
    assert.equal(result.success, false);
    assert.equal(result.code, 'TIMEOUT');
  } finally { globalThis.fetch = originalFetch; context.mock.timers.reset(); }
});


test('accepted duplicate receipt uses the original server prices and totals after a catalogue refresh', () => {
  const fallback = { subtotal: 5000, finalPayable: 5250, shippingFee: 0, discountAmt: 0, giftFee: 250 };
  const receipt = acceptedCheckoutReceipt(payload.items, fallback, {
    items: [{ productId: 'pista', selectedWeight: '500g', quantity: 2, price: 2200 }],
    totals: { subtotal: 4400, total: 4650, shipping: 0, discount: 0, giftWrapFee: 250 },
  });
  assert.equal(receipt.items[0].unitPrice, 2200);
  assert.equal(receipt.items[0].name_ur, product.name_ur);
  assert.equal(receipt.totals.finalPayable, 4650);
  assert.equal(receipt.totals.subtotal, 4400);
  assert.equal(payload.items[0].unitPrice, product.prices['500g']);
});
