import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutFingerprint, checkoutQuoteKey, getCheckoutAuthToken, CheckoutAuthenticationError, CHECKOUT_ATTEMPT_KEY, clearCheckoutAttempt, persistCheckoutAttempt, readCheckoutAttempt, resolveCheckoutAttempt, writeCheckoutSession } from '../src/lib/checkoutAttempt';
import { getOrderQuote, placeOrder, type OrderPayload } from '../src/lib/order';
import { withApiDeadline } from '../src/lib/apiDeadline';
import { apiUrl } from '../src/lib/apiUrl';
import { submitBoutiqueInquiry, subscribeNewsletter } from '../src/lib/storefrontSubmissions';
import { recoverOrderSuccessReceipt } from '../src/lib/orderSuccessRecovery';
import { acceptedCheckoutReceipt, appliedPromotionMessage } from '../src/lib/checkoutReceipt';
import { checkoutReliabilityTranslations } from '../src/contexts/checkoutReliabilityTranslations';
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

const totals = { subtotal: 5000, discount: 0, discountedSubtotal: 5000, shipping: 0, giftWrapFee: 0, total: 5000 };
const savedResponse = (changes: Record<string, unknown> = {}) => ({
  success: true, durablePersistenceReady: true, orderId: 'AB-SAVED-TEST-123', whatsappMessage: 'Saved test receipt',
  claimToken: 'test-private-claim-token', totals,
  items: [{ id: 'pista-500g', productId: 'pista', selectedWeight: '500g', quantity: 2, price: 2500 }], ...changes,
});
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('a current quote becomes stale for every pricing input and account change', () => {
  const key = checkoutQuoteKey(payload, 'patron-one');
  const changes: Partial<OrderPayload>[] = [
    { items: payload.items.map(item => ({ ...item, quantity: item.quantity + 1 })) },
    { items: payload.items.map(item => ({ ...item, selectedWeight: '1kg' })) },
    { items: payload.items.map(item => ({ ...item, productId: 'badam' })) },
    { items: payload.items.map(item => ({ ...item, unitPrice: 2600 })) },
    { city: 'Karachi' }, { shippingMethodId: 'express' }, { giftWrapping: true },
    { discountCode: 'ALLBARKA10' }, { rewardId: 'active-reward-one' }, { isWholesale: true },
  ];
  for (const change of changes) assert.notEqual(checkoutQuoteKey({ ...payload, ...change }, 'patron-one'), key);
  assert.notEqual(checkoutQuoteKey(payload, 'patron-two'), key);
  assert.notEqual(checkoutQuoteKey(payload, null), key);
  assert.equal(checkoutQuoteKey({ ...payload, discountCode: ' allbarka10 ' }, null), checkoutQuoteKey({ ...payload, discountCode: 'ALLBARKA10' }, null));
});

test('hamper configuration changes invalidate both the quote and order retry identity', async () => {
  const hamperPayload = { ...payload, items: payload.items.map(item => ({ ...item,
    productId: 'custom-hamper', hamperConfiguration: { version: 1, boxId: 'box-velvet', selections: ['pista', 'badam', 'kaju'], recipientName: 'Recipient', giftMessage: 'Thank you' },
  })) } as OrderPayload;
  const changed = { ...hamperPayload, items: hamperPayload.items.map(item => ({ ...item,
    hamperConfiguration: { ...item.hamperConfiguration!, selections: ['pista', 'akhroot', 'kaju'] },
  })) } as OrderPayload;
  assert.notEqual(checkoutQuoteKey(hamperPayload, null), checkoutQuoteKey(changed, null));
  assert.notEqual(await checkoutFingerprint(hamperPayload), await checkoutFingerprint(changed));
});

test('account changes never recover another account order attempt', async () => {
  const first = await checkoutFingerprint(payload, 'patron-one');
  const second = await checkoutFingerprint(payload, 'patron-two');
  assert.notEqual(first, second);
  const previous = resolveCheckoutAttempt(first, null, () => 'account-one-attempt');
  assert.equal(resolveCheckoutAttempt(second, previous, () => 'account-two-attempt').key, 'account-two-attempt');
});

test('failed or empty signed-in credentials stop submission without a guest request', async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; return jsonResponse(savedResponse()); };
  try {
    for (const getIdToken of [async () => { throw new Error('Expired account'); }, async () => '', async () => '   ']) {
      await assert.rejects(async () => {
        const authToken = await getCheckoutAuthToken({ getIdToken });
        await placeOrder({ ...payload, authToken });
      }, CheckoutAuthenticationError);
    }
    assert.equal(requests, 0);
    assert.equal(await getCheckoutAuthToken(null), null);
  } finally { globalThis.fetch = original; }
});

test('a stalled token refresh is bounded and cannot acquire a usable credential later', async () => {
  let resolveToken!: (token: string) => void;
  const pending = getCheckoutAuthToken({ getIdToken: () => new Promise(resolve => { resolveToken = resolve; }) }, undefined, 15);
  await assert.rejects(pending, CheckoutAuthenticationError);
  resolveToken('late-token');
  await Promise.resolve();
});

test('cancelled deadlines do not begin token or network work', async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  await assert.rejects(withApiDeadline(async () => { calls++; return true; }, 1000, controller.signal), { name: 'AbortError' });
  await assert.rejects(getCheckoutAuthToken({ getIdToken: async () => { calls++; return 'token'; } }, controller.signal), CheckoutAuthenticationError);
  assert.equal(calls, 0);
});

test('a response-body stall releases the global order lock and leaves the bag untouched', async () => {
  const original = globalThis.fetch;
  const snapshot = JSON.stringify(payload);
  let aborted = false;
  globalThis.fetch = async (_url, init) => {
    init?.signal?.addEventListener('abort', () => { aborted = true; }, { once: true });
    return { ok: true, headers: new Headers({ 'Content-Type': 'application/json' }), json: () => new Promise(() => {}) } as Response;
  };
  try {
    const pending = placeOrder({ ...payload, idempotencyKey: 'body-stall-attempt' }, { timeoutMs: 20 });
    const duplicateClick = await placeOrder(payload);
    assert.equal(duplicateClick.code, 'REQUEST_IN_FLIGHT');
    assert.equal((await pending).code, 'TIMEOUT');
    assert.equal(aborted, true);
    globalThis.fetch = async () => jsonResponse(savedResponse());
    assert.equal((await placeOrder({ ...payload, idempotencyKey: 'body-stall-attempt' })).success, true);
    assert.equal(JSON.stringify(payload), snapshot);
  } finally { globalThis.fetch = original; }
});

test('a timed-out network implementation that ignores abort still returns and permits retry', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => new Promise<Response>(() => {});
  try {
    assert.equal((await placeOrder(payload, { timeoutMs: 15 })).code, 'TIMEOUT');
    globalThis.fetch = async () => jsonResponse(savedResponse());
    assert.equal((await placeOrder(payload)).success, true);
  } finally { globalThis.fetch = original; }
});

test('QUOTE_CHANGED returns the authoritative new total once and never resubmits automatically', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const changedTotals = { ...totals, shipping: 250, total: 5250 };
  globalThis.fetch = async () => { calls++; return jsonResponse({ code: 'QUOTE_CHANGED', error: 'Review the updated total', totals: changedTotals }, 409); };
  try {
    const result = await placeOrder({ ...payload, idempotencyKey: 'quote-review-attempt' });
    assert.equal(result.success, false); assert.equal(result.code, 'QUOTE_CHANGED');
    assert.deepEqual(result.totals, changedTotals); assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('503 persistence failures and network errors retain retry identity, cart, and recipient details', async () => {
  const original = globalThis.fetch;
  const snapshot = JSON.stringify(payload);
  const fingerprint = await checkoutFingerprint(payload, 'patron-one');
  const attempt = resolveCheckoutAttempt(fingerprint, null, () => 'persistent-retry-key');
  const seen: string[] = [];
  try {
    globalThis.fetch = async (_url, init) => {
      seen.push((init?.headers as Record<string, string>)['Idempotency-Key']);
      return jsonResponse({ code: 'PERSISTENCE_PENDING', error: 'Unable to save order', durablePersistenceReady: false }, 503);
    };
    const first = await placeOrder({ ...payload, idempotencyKey: attempt.key });
    assert.equal(first.success, false); assert.equal(first.code, 'PERSISTENCE_PENDING');
    globalThis.fetch = async (_url, init) => {
      seen.push((init?.headers as Record<string, string>)['Idempotency-Key']);
      throw new TypeError('Network disconnected');
    };
    assert.equal((await placeOrder({ ...payload, idempotencyKey: attempt.key })).code, 'NETWORK_ERROR');
    const refreshed = await checkoutFingerprint({ ...payload, expectedFinalTotal: 6000, authToken: 'refreshed-token' }, 'patron-one');
    const retry = resolveCheckoutAttempt(refreshed, attempt, () => { throw new Error('No fresh attempt on retry'); });
    globalThis.fetch = async (_url, init) => {
      seen.push((init?.headers as Record<string, string>)['Idempotency-Key']);
      assert.equal(JSON.parse(String(init?.body)).idempotencyKey, attempt.key);
      return jsonResponse(savedResponse({ isDuplicate: true }));
    };
    const accepted = await placeOrder({ ...payload, authToken: 'refreshed-token', idempotencyKey: retry.key });
    assert.equal(accepted.success, true); assert.equal(accepted.isDuplicate, true);
    assert.deepEqual(seen, [attempt.key, attempt.key, attempt.key]);
    assert.equal(JSON.stringify(payload), snapshot);
  } finally { globalThis.fetch = original; }
});

test('only durable saved receipts or verified duplicates can show order success', async () => {
  const original = globalThis.fetch;
  try {
    for (const changes of [{ durablePersistenceReady: undefined }, { durablePersistenceReady: false }, { success: false },
      { orderId: '' }, { whatsappMessage: '' }, { items: [] }, { totals: { ...totals, total: 1 } },
      { items: [{ productId: 'pista', selectedWeight: '500g', quantity: 2, price: 1 }] }]) {
      globalThis.fetch = async () => jsonResponse(savedResponse(changes));
      assert.equal((await placeOrder(payload)).success, false);
    }
    for (const isDuplicate of [false, true]) {
      globalThis.fetch = async () => jsonResponse(savedResponse({ isDuplicate }));
      const result = await placeOrder(payload);
      assert.equal(result.success, true); assert.equal(result.durablePersistenceReady, true);
      assert.equal(result.claimToken, 'test-private-claim-token'); assert.deepEqual(result.totals, totals);
    }
    globalThis.fetch = async () => new Response('<html>static host fallback</html>');
    assert.equal((await placeOrder(payload)).code, 'INVALID_RESPONSE');
  } finally { globalThis.fetch = original; }
});

test('a canonical quote carries all pricing controls and signed-in authorization without recipient data', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/orders/quote');
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer verified-token');
      const request = JSON.parse(String(init?.body));
      assert.equal(request.city, 'Karachi'); assert.equal(request.shippingMethodId, 'express');
      assert.equal(request.discountCode, 'ALLBARKA10'); assert.equal(request.rewardId, 'reward-id');
      assert.equal(request.giftWrapping, true); assert.equal(request.isWholesale, true);
      assert.equal('name' in request, false); assert.equal('address' in request, false); assert.equal('phone' in request, false);
      return jsonResponse({ success: true, totals });
    };
    assert.equal((await getOrderQuote({ items: payload.items, city: 'Karachi', shippingMethodId: 'express', discountCode: 'ALLBARKA10', rewardId: 'reward-id', giftWrapping: true, isWholesale: true, authToken: 'verified-token' })).success, true);
    globalThis.fetch = async () => jsonResponse({ success: true, totals: { ...totals, discount: 500, discountedSubtotal: 5000 } });
    assert.equal((await getOrderQuote({ items: payload.items, city: 'Lahore', shippingMethodId: 'standard' })).code, 'INVALID_QUOTE');
  } finally { globalThis.fetch = original; }
});

test('API routing supports same-origin or one exact HTTPS origin and rejects path/config escapes', () => {
  assert.equal(apiUrl('/api/orders', ''), '/api/orders');
  assert.equal(apiUrl('/api/orders?limit=5', ' https://commerce.example.com/ '), 'https://commerce.example.com/api/orders?limit=5');
  for (const origin of ['http://commerce.example.com', 'https://commerce.example.com/path', 'https://commerce.example.com?query=1', 'https://commerce.example.com#anchor', 'https://user:pass@commerce.example.com', 'https://commerce.example.com\\path', 'https://commerce.example.com/../']) {
    assert.throws(() => apiUrl('/api/orders', origin));
  }
  for (const path of ['https://another.example/api/orders', '//another.example/api/orders', '/api/../outside', '/api/orders\n', '/api/\\outside']) assert.throws(() => apiUrl(path, ''));
});

test('inquiry and newsletter failures never manufacture a confirmation and preserve submitted input', async () => {
  const original = globalThis.fetch;
  const inquiry = { name: 'Test Customer', contact: 'test@example.invalid', topic: 'corporate-gifting', message: 'A test inquiry only' };
  const snapshot = JSON.stringify(inquiry);
  try {
    for (const response of [jsonResponse({ success: false }, 503), jsonResponse({ success: true }), jsonResponse({ success: true, ticketId: '' })]) {
      globalThis.fetch = async () => response;
      await assert.rejects(submitBoutiqueInquiry(inquiry));
    }
    globalThis.fetch = async () => { throw new TypeError('Disconnected'); };
    await assert.rejects(submitBoutiqueInquiry(inquiry));
    await assert.rejects(subscribeNewsletter('test@example.invalid'));
    assert.equal(JSON.stringify(inquiry), snapshot);
    globalThis.fetch = async () => jsonResponse({ success: false });
    await assert.rejects(subscribeNewsletter('test@example.invalid'));
  } finally { globalThis.fetch = original; }
});

test('inquiry and newsletter deadlines include body parsing and a stalled body cannot hang', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: () => new Promise(() => {}) }) as Response;
  try {
    await assert.rejects(submitBoutiqueInquiry({ name: 'Test', contact: 'test@example.invalid', topic: 'general', message: 'Test message' }, { timeoutMs: 15 }), { name: 'AbortError' });
    await assert.rejects(subscribeNewsletter('test@example.invalid', { timeoutMs: 15 }), { name: 'AbortError' });
  } finally { globalThis.fetch = original; }
});

test('saved inquiry tickets and newsletter confirmations use the server response without generated references', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/contact'); assert.equal(init?.method, 'POST');
      return jsonResponse({ success: true, ticketId: 'AB-REAL-SAVED-TEST', message: 'Saved inquiry' });
    };
    assert.deepEqual(await submitBoutiqueInquiry({ name: 'Test', contact: 'test@example.invalid', topic: 'general', message: 'Test message' }), { ticketId: 'AB-REAL-SAVED-TEST', message: 'Saved inquiry' });
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/newsletter/subscribe');
      assert.deepEqual(JSON.parse(String(init?.body)), { email: 'test@example.invalid', consent: true });
      return jsonResponse({ success: true });
    };
    await subscribeNewsletter(' test@example.invalid ');
  } finally { globalThis.fetch = original; }
});

const canonicalSavedOrder = { orderId: 'AB-SAVED-TEST-123', customer: { name: payload.name, phone: payload.phone, address: payload.address, city: payload.city },
  paymentMethod: 'cod', items: savedResponse().items, totals, createdAt: '2026-10-03T10:00:00.000Z' };

test('legacy success snapshots require a saved receipt lookup and discard copied prices and customer details', async () => {
  const original = globalThis.fetch;
  const legacy = { orderId: canonicalSavedOrder.orderId, name: 'Unverified copied recipient', totalAmount: 1, claimToken: 'private-recovery-token' };
  const snapshot = JSON.stringify(legacy);
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, `/api/orders/${canonicalSavedOrder.orderId}`);
      assert.equal((init?.headers as Record<string, string>)['X-Guest-Claim-Token'], legacy.claimToken);
      assert.equal((init?.headers as Record<string, string>).Authorization, undefined);
      assert.equal(String(url).includes(legacy.claimToken), false);
      return jsonResponse({ success: true, order: canonicalSavedOrder });
    };
    const receipt = await recoverOrderSuccessReceipt(legacy, { language: 'en', customerUid: null, getAuthToken: async () => null });
    assert.ok(receipt); assert.equal(receipt.durablePersistenceReady, true);
    assert.equal(receipt.totalAmount, 5000); assert.equal(receipt.name, payload.name);
    assert.equal(receipt.timestamp, canonicalSavedOrder.createdAt);
    assert.equal(receipt.claimToken, legacy.claimToken);
    assert.equal(JSON.stringify(legacy), snapshot);
  } finally { globalThis.fetch = original; }
});

test('only a durable receipt scoped to the current account can be recovered without a network call', async () => {
  const cached = { ...canonicalSavedOrder, durablePersistenceReady: true, customerUid: 'patron-one' };
  const receipt = await recoverOrderSuccessReceipt(cached, { language: 'ur', customerUid: 'patron-one',
    getAuthToken: async () => { throw new Error('A verified local receipt needs no fresh lookup'); } });
  assert.ok(receipt); assert.equal(receipt.items[0].name, product.name_ur);
  assert.equal(receipt.items[0].price, 2500);
});

test('switching accounts cannot display another account cached receipt without server authorization', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async (_url, init) => {
      calls++; assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer patron-two-token');
      return jsonResponse({ success: false, code: 'ORDER_NOT_FOUND' }, 404);
    };
    const receipt = await recoverOrderSuccessReceipt({ ...canonicalSavedOrder, durablePersistenceReady: true, customerUid: 'patron-one' },
      { language: 'en', customerUid: 'patron-two', getAuthToken: async () => 'patron-two-token' });
    assert.equal(receipt, null); assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('failed signed-in receipt credentials stop recovery instead of downgrading to guest access', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return jsonResponse({ success: true, order: canonicalSavedOrder }); };
  try {
    await assert.rejects(recoverOrderSuccessReceipt({ orderId: canonicalSavedOrder.orderId, claimToken: 'private-recovery-token' },
      { language: 'en', customerUid: 'patron-one', getAuthToken: () => getCheckoutAuthToken({ getIdToken: async () => { throw new Error('Expired'); } }) }), CheckoutAuthenticationError);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});

test('unavailable, mismatched, and inconsistent saved receipts never become a confirmation', async () => {
  const original = globalThis.fetch;
  try {
    for (const [body, status] of [[{ success: false }, 503], [{ success: true, order: { ...canonicalSavedOrder, orderId: 'AB-OTHER-ORDER' } }, 200],
      [{ success: true, order: { ...canonicalSavedOrder, totals: { ...totals, total: 1 } } }, 200]] as const) {
      globalThis.fetch = async () => jsonResponse(body, status);
      assert.equal(await recoverOrderSuccessReceipt({ orderId: canonicalSavedOrder.orderId }, { language: 'en', customerUid: null, getAuthToken: async () => null }), null);
    }
    globalThis.fetch = async () => { throw new TypeError('Disconnected'); };
    assert.equal(await recoverOrderSuccessReceipt({ orderId: canonicalSavedOrder.orderId }, { language: 'en', customerUid: null, getAuthToken: async () => null }), null);
  } finally { globalThis.fetch = original; }
});

test('receipt recovery preserves canonical saved prices across languages and later catalogue prices', async () => {
  const original = globalThis.fetch;
  try {
    const historic = { ...canonicalSavedOrder, items: [{ ...canonicalSavedOrder.items[0], price: 2200 }], totals: { ...totals, subtotal: 4400, discountedSubtotal: 4400, total: 4400 } };
    globalThis.fetch = async () => jsonResponse({ success: true, order: historic });
    const saved = await recoverOrderSuccessReceipt({ orderId: historic.orderId }, { language: 'en', customerUid: null, getAuthToken: async () => null });
    assert.ok(saved); assert.equal(saved.totalAmount, 4400);
    for (const language of ['en', 'ur', 'ar'] as const) {
      const localized = await recoverOrderSuccessReceipt(saved, { language, customerUid: null, getAuthToken: async () => { throw new Error('No network for verified cache'); } });
      assert.ok(localized); assert.equal(localized.items[0].name, product[`name_${language}`]);
      assert.equal(localized.items[0].price, 2200); assert.equal(localized.totalAmount, 4400);
    }
  } finally { globalThis.fetch = original; }
});

test('cancelled or invalid receipt recovery never starts a lookup', async () => {
  const controller = new AbortController(); controller.abort();
  let credentials = 0;
  const getAuthToken = async () => { credentials++; return 'token'; };
  assert.equal(await recoverOrderSuccessReceipt({ orderId: canonicalSavedOrder.orderId }, { language: 'en', customerUid: null, getAuthToken, signal: controller.signal }), null);
  for (const candidate of [null, [], { orderId: '' }, { orderId: '../../not-an-order' }]) {
    assert.equal(await recoverOrderSuccessReceipt(candidate, { language: 'en', customerUid: null, getAuthToken }), null);
  }
  assert.equal(credentials, 0);
});

const personalizedQuoteTotals = { subtotal: 0, discount: 0, discountedSubtotal: 0, shipping: 0, giftWrapFee: 0, total: 0,
  promoCode: 'CANCER', promoType: 'quote', discountAmount: 0, freeShipping: false, freeGiftWrap: false, freeGift: false, isQuoteRequest: true };

test('server-approved nonmonetary promos remain usable even with zero discount', async () => {
  const original = globalThis.fetch;
  try {
    for (const [promoCode, promoType, flag] of [['ZAFRANI', 'free_shipping', 'freeShipping'], ['GIFTBOX', 'free_giftwrap', 'freeGiftWrap'], ['MYSTERY', 'free_gift', 'freeGift']] as const) {
      const canonical = { ...totals, promoCode, promoType, discountAmount: 0, [flag]: true, isQuoteRequest: false };
      globalThis.fetch = async () => jsonResponse({ success: true, totals: canonical });
      const result = await getOrderQuote({ items: payload.items, city: 'Lahore', shippingMethodId: 'standard', discountCode: promoCode });
      assert.equal(result.success, true); assert.equal(result.totals.discount, 0); assert.equal(result.totals[flag], true);
      for (const language of ['en', 'ur', 'ar'] as const) {
        const dictionary = checkoutReliabilityTranslations[language];
        const message = appliedPromotionMessage(result.totals, key => dictionary[key]);
        assert.ok(message?.includes(promoCode)); assert.ok(message!.length > promoCode.length + 3);
      }
    }
  } finally { globalThis.fetch = original; }
});

test('promo confirmation shows the saved amount and rate supplied by the server', () => {
  const dictionary = checkoutReliabilityTranslations.en;
  const message = appliedPromotionMessage({ ...totals, subtotal: 1250, discount: 125, discountedSubtotal: 1125, total: 1125,
    promoCode: 'ALLBARKA10', promoType: 'percent', promoValue: 10, discountAmount: 125 }, key => dictionary[key]);
  assert.equal(message, 'ALLBARKA10: 10% off applied — you saved Rs. 125');
  assert.equal(appliedPromotionMessage(totals, key => dictionary[key]), null);
  assert.equal(dictionary['checkout.promoPlaceholder'], 'Enter promo code');
});

test('a durable quote request returns tracking identity while omitting any payment choice', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      assert.equal('paymentMethod' in request, false); assert.equal(request.discountCode, 'CANCER');
      return jsonResponse(savedResponse({ totals: personalizedQuoteTotals, orderType: 'QUOTE_REQUEST', status: 'QUOTE_REQUESTED' }));
    };
    const { paymentMethod: _unused, ...quotePayload } = payload;
    const result = await placeOrder({ ...quotePayload, discountCode: 'CANCER', expectedFinalTotal: 0 });
    assert.equal(result.success, true); assert.equal(result.orderType, 'QUOTE_REQUEST'); assert.equal(result.status, 'QUOTE_REQUESTED');
    assert.equal(result.orderId, savedResponse().orderId); assert.equal(result.totals.total, 0);
    assert.ok(result.items!.every(item => item.price > 0));
  } finally { globalThis.fetch = original; }
});

test('a quote-labelled response cannot bypass receipt verification with inconsistent status or totals', async () => {
  const original = globalThis.fetch;
  try {
    for (const changed of [{ status: 'ORDER_RECEIVED' }, { orderType: 'ORDER' },
      { totals: { ...personalizedQuoteTotals, promoCode: 'OTHER' } }, { totals: { ...personalizedQuoteTotals, total: 1 } }]) {
      globalThis.fetch = async () => jsonResponse(savedResponse({ totals: personalizedQuoteTotals, orderType: 'QUOTE_REQUEST', status: 'QUOTE_REQUESTED', ...changed }));
      assert.equal((await placeOrder({ ...payload, discountCode: 'CANCER' })).success, false);
    }
  } finally { globalThis.fetch = original; }
});

test('quote receipt lookup and reload preserve quote status in every language with zero totals', async () => {
  const original = globalThis.fetch;
  let requests = 0;
  try {
    globalThis.fetch = async () => { requests++; return jsonResponse({ success: true, order: { ...canonicalSavedOrder,
      orderType: 'QUOTE_REQUEST', status: 'QUOTE_REQUESTED', promoCode: 'CANCER', promoType: 'quote', paymentMethod: 'quote', totals: personalizedQuoteTotals } }); };
    const receipt = await recoverOrderSuccessReceipt({ orderId: canonicalSavedOrder.orderId, claimToken: 'private-recovery-token' },
      { language: 'en', customerUid: null, getAuthToken: async () => null });
    assert.ok(receipt); assert.equal(receipt.orderType, 'QUOTE_REQUEST'); assert.equal(receipt.status, 'QUOTE_REQUESTED');
    assert.equal(receipt.paymentMethod, 'quote'); assert.equal(receipt.totalAmount, 0); assert.equal(receipt.subtotal, 0);
    assert.equal(receipt.items[0].price, 2500); assert.equal(receipt.claimToken, 'private-recovery-token');
    for (const language of ['en', 'ur', 'ar'] as const) {
      const restored = await recoverOrderSuccessReceipt(receipt, { language, customerUid: null, getAuthToken: async () => { throw new Error('Verified cache should not require another request'); } });
      assert.ok(restored); assert.equal(restored.orderType, 'QUOTE_REQUEST'); assert.equal(restored.totalAmount, 0);
      assert.equal(restored.items[0].name, product[`name_${language}`]);
    }
    assert.equal(requests, 1);
  } finally { globalThis.fetch = original; }
});

test('a cancelled quote retry keeps its existing tracking receipt only for a verified duplicate', async () => {
  const original = globalThis.fetch;
  try {
    for (const isDuplicate of [true, false]) {
      globalThis.fetch = async () => jsonResponse(savedResponse({ totals: personalizedQuoteTotals, orderType: 'QUOTE_REQUEST', status: 'CANCELLED', isDuplicate }));
      const result = await placeOrder({ ...payload, discountCode: 'CANCER' });
      assert.equal(result.success, isDuplicate);
      if (isDuplicate) { assert.equal(result.status, 'CANCELLED'); assert.equal(result.orderId, savedResponse().orderId); }
    }
  } finally { globalThis.fetch = original; }
});
