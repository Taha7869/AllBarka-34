import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import type { Firestore } from 'firebase-admin/firestore';
import type { CanonicalOrder } from '../src/lib/serverOrderService';
import {
  ADMIN_SCAN_LIMIT, AdminOperationError, hasAdminClaim, parseAdminOrderFilters, filterAdminOrders,
  adminOrderMetrics, listAdminOrders, getAdminOrder, addAdminOrderNote, updateAdminOrderPayment,
  sanitizeOrderForAdmin, validateAdminOrderId, validateAdminStatusInput,
} from '../src/lib/adminOperations';
import { updateAdminOrderStatus } from '../src/lib/orderDatabase';
import { resolveHamper } from '../src/lib/hamperCatalog';

const NOW = Date.parse('2026-10-02T00:30:00.000Z');
const order = (overrides: Partial<CanonicalOrder> = {}): CanonicalOrder => ({
  schemaVersion: '2.0.0', source: 'website', orderId: 'AB-TEST-00001',
  createdAt: new Date(NOW).toISOString(), createdAtMs: NOW,
  updatedAt: new Date(NOW).toISOString(), updatedAtMs: NOW,
  status: 'ORDER_RECEIVED', paymentStatus: 'UNPAID', paymentMethod: 'bank', uid: 'customer-123',
  customer: { name: 'Taha Patron', phone: '03160666083', address: 'Gulberg III', city: 'Lahore' },
  gifting: { giftWrapping: false, giftWrapFee: 0 },
  items: [{ id: 'pista-500g', productId: 'pista', name: 'Iranian Pistachios', selectedWeight: '500g', quantity: 1, price: 2500, earnedPoints: 25 }],
  totals: { subtotal: 2500, discount: 0, discountedSubtotal: 2500, shipping: 150, giftWrapFee: 0, total: 2650 },
  earnedPoints: 25, pointsAwarded: false, claimTokenHash: 'private-claim-hash', guestSessionId: 'private-session',
  ...overrides,
});

class FakeFirestore {
  store = new Map<string, any>();
  requestedLimit = 0;
  failAudit = false;
  constructor(orders: CanonicalOrder[] = []) { for (const item of orders) this.store.set(`orders/${item.orderId}`, structuredClone(item)); }
  snap(path: string) { const data = this.store.get(path); return { id: path.split('/').pop()!, exists: data !== undefined, data: () => structuredClone(data) }; }
  collection(path: string) {
    const db = this;
    const state: { sort?: string; direction?: string; cap?: number; where?: [string, string, unknown] } = {};
    const query = {
      doc(id: string) { return { path: `${path}/${id}`, collection: (sub: string) => db.collection(`${path}/${id}/${sub}`), get: async () => db.snap(`${path}/${id}`) }; },
      orderBy(field: string, direction: string) { state.sort = field; state.direction = direction; return query; },
      limit(cap: number) { state.cap = cap; db.requestedLimit = cap; return query; },
      where(field: string, operator: string, value: unknown) { state.where = [field, operator, value]; return query; },
      async get() {
        let docs = [...db.store.keys()].filter(key => key.startsWith(`${path}/`) && key.slice(path.length + 1).indexOf('/') === -1).map(key => db.snap(key));
        if (state.where) docs = docs.filter(doc => doc.data()[state.where![0]] === state.where![2]);
        if (state.sort) docs.sort((a, b) => (a.data()[state.sort!] - b.data()[state.sort!]) * (state.direction === 'desc' ? -1 : 1));
        if (state.cap) docs = docs.slice(0, state.cap);
        return { docs };
      },
    };
    return query;
  }
  async runTransaction<T>(run: (transaction: any) => Promise<T>): Promise<T> {
    const pending: Array<{ path: string; data: any; merge: boolean }> = [];
    const transaction = {
      get: async (ref: any) => {
        assert.equal(pending.length, 0, 'Firestore transactions must read before writing');
        return this.snap(ref.path);
      },
      update: (ref: any, data: any) => pending.push({ path: ref.path, data: structuredClone(data), merge: true }),
      create: function(ref, data) { return this.set(ref, data); }, set: (ref: any, data: any, options?: any) => {
        if (this.failAudit && ref.path.startsWith('orderAudits/')) throw new Error('Simulated audit write failure');
        pending.push({ path: ref.path, data: structuredClone(data), merge: !!options?.merge });
      },
    };
    const result = await run(transaction);
    for (const write of pending) this.store.set(write.path, write.merge ? { ...this.store.get(write.path), ...write.data } : write.data);
    return result;
  }
  get db(): Firestore { return this as unknown as Firestore; }
}

const actor = (db: FakeFirestore, original = order()) => ({ db: db.db, orderId: original.orderId,
  expectedUpdatedAt: original.updatedAt, actorUid: 'admin-123', actorEmail: 'admin@example.test' });
const errorCode = (code: string, status = 400) => (error: unknown) => error instanceof AdminOperationError && error.code === code && error.httpStatus === status;

test('admin access accepts only strict verified custom claim values', () => {
  assert.equal(hasAdminClaim({ admin: true }), true);
  assert.equal(hasAdminClaim({ role: 'admin' }), true);
  for (const input of [null, {}, { admin: 'true' }, { admin: 1 }, { role: 'Admin' }, { email: 'admin@example.test' }]) assert.equal(hasAdminClaim(input), false);
});

test('admin sanitation preserves normalized hamper packing data and shipping metadata without extra client fields', () => {
  const hamper = resolveHamper({ version: 1, boxId: 'box-tin', selections: ['pista', 'kaju', 'badam'], recipientName: 'Ayesha', giftMessage: 'Happy anniversary\nFrom Taha' })!;
  const original = order({ items: [{ id: 'custom-hamper', productId: 'custom-hamper', name: hamper.name_en, selectedWeight: hamper.portion, quantity: 1, price: hamper.unitPrice, earnedPoints: 0,
    hamperConfiguration: { ...hamper.configuration, internalToken: 'do-not-expose' } as typeof hamper.configuration }],
    totals: { ...order().totals, shippingWeightGrams: 600, shippingRegion: 'nationwide' } });
  const safe = sanitizeOrderForAdmin(original);
  assert.deepEqual(safe.items[0].hamperConfiguration, hamper.configuration);
  assert.equal('internalToken' in safe.items[0].hamperConfiguration!, false);
  assert.equal(safe.totals.shippingWeightGrams, 600);
  assert.equal(safe.totals.shippingRegion, 'nationwide');
  assert.equal('claimTokenHash' in safe, false);
});

test('filters and mutation validators reject malformed arrays, paths and missing optimistic inputs', () => {
  assert.equal(parseAdminOrderFilters({ limit: '999', page: '2', status: 'PREPARING' }).limit, 50);
  for (const query of [{ status: 'HACKED' }, { paymentStatus: 'PROCESSING' }, { paymentMethod: 'card' }, { range: 'year' }, { queue: 'all-unpaid' }, { search: ['one', 'two'] }, { page: '-1' }]) {
    assert.throws(() => parseAdminOrderFilters(query));
  }
  assert.throws(() => validateAdminOrderId('../private/token'), errorCode('INVALID_ORDER_ID'));
  assert.throws(() => validateAdminStatusInput({ status: 'DELIVERED', reason: 'Delivered' }), errorCode('INVALID_EXPECTED_STATUS'));
  assert.throws(() => validateAdminStatusInput({ status: 'DELIVERED', expectedStatus: 'ORDER_RECEIVED', reason: 'x' }), errorCode('INVALID_REASON'));
  assert.throws(() => validateAdminStatusInput({ status: 'DELIVERED', expectedStatus: 'ORDER_RECEIVED', reason: 'Courier confirmed' }), errorCode('INVALID_REVISION'));
});

test('filters combine state, method, search and Karachi calendar day correctly', () => {
  const early = order({ orderId: 'AB-EARLY', createdAtMs: Date.parse('2026-10-01T18:59:59Z') });
  const sameDay = order({ orderId: 'AB-TODAY', status: 'PREPARING', createdAtMs: Date.parse('2026-10-01T19:00:00Z') });
  const future = order({ orderId: 'AB-FUTURE', status: 'PREPARING', createdAtMs: NOW + 1000 });
  const filters = parseAdminOrderFilters({ status: 'PREPARING', paymentMethod: 'bank', paymentStatus: 'UNPAID', range: 'today', search: '0316 0666 083' });
  assert.deepEqual(filterAdminOrders([early, sameDay, future], filters, NOW).map(item => item.orderId), ['AB-TODAY']);
  assert.equal(filterAdminOrders([sameDay], parseAdminOrderFilters({ search: 'pistachios' }), NOW).length, 1);
  assert.equal(filterAdminOrders([order({ createdAtMs: NOW - 8 * 86400000 })], parseAdminOrderFilters({ range: '7d' }), NOW).length, 0);
});

test('matching metrics exclude cancelled amounts and distinguish unpaid bank orders', () => {
  const metrics = adminOrderMetrics([order(), order({ status: 'DELIVERED', paymentStatus: 'PAID' }),
    order({ status: 'CANCELLED', paymentStatus: 'PAID' }), order({ status: 'DELIVERED', paymentStatus: 'REFUNDED' })]);
  assert.equal(metrics.count, 4);
  assert.equal(metrics.activeCount, 1);
  assert.equal(metrics.deliveredCount, 2);
  assert.equal(metrics.cancelledCount, 1);
  assert.equal(metrics.orderValue, 7950);
  assert.equal(metrics.paidValue, 2650);
  assert.equal(metrics.unpaidValue, 2650);
  assert.equal(metrics.bankPendingCount, 1);
  assert.equal(metrics.statusCounts.DELIVERED, 2);
});

test('grouped queues match new/transit states and exclude cancelled bank payments while preserving other filters', () => {
  const orders = ['ORDER_RECEIVED', 'ORDER_RECEIVED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((status, index) =>
    order({ orderId: `AB-QUEUE-${index}`, status: status as CanonicalOrder['status'] }));
  const matching = (query: Record<string, string>) => filterAdminOrders(orders, parseAdminOrderFilters(query), NOW);
  assert.deepEqual(new Set(matching({ queue: 'new' }).map(item => item.status)), new Set(['ORDER_RECEIVED', 'ORDER_RECEIVED']));
  assert.deepEqual(matching({ queue: 'packing' }).map(item => item.status), ['PREPARING']);
  assert.deepEqual(new Set(matching({ queue: 'transit' }).map(item => item.status)), new Set(['DISPATCHED', 'OUT_FOR_DELIVERY']));
  assert.equal(matching({ queue: 'bank-pending' }).length, 7);
  assert.equal(matching({ queue: 'bank-pending' }).some(item => item.status === 'CANCELLED'), false);
  assert.equal(matching({ queue: 'transit', paymentStatus: 'PAID' }).length, 0);
  assert.deepEqual(matching({ queue: 'new', status: 'ORDER_RECEIVED' }).map(item => item.status), ['ORDER_RECEIVED', 'ORDER_RECEIVED']);
  assert.equal(matching({ queue: 'bank-pending', paymentMethod: 'cod' }).length, 0);
  assert.equal(matching({ queue: 'bank-pending', search: 'QUEUE-3' }).length, 1);
});

test('bounded list and export disclose truncation and paginate without exposing secrets', async () => {
  const orders = Array.from({ length: ADMIN_SCAN_LIMIT + 2 }, (_, index) => order({ orderId: `AB-${String(index).padStart(6, '0')}`, createdAtMs: NOW - index,
    paymentStatus: index % 2 === 0 ? 'PAID' : 'UNPAID' }));
  const db = new FakeFirestore(orders);
  const filters = parseAdminOrderFilters({ page: '2', limit: '3', paymentStatus: 'PAID' });
  const result = await listAdminOrders(db.db, filters);
  assert.equal(db.requestedLimit, ADMIN_SCAN_LIMIT + 1);
  assert.equal(result.scannedCount, ADMIN_SCAN_LIMIT);
  assert.equal(result.truncated, true);
  assert.equal(result.totalCount, 2500);
  assert.equal(result.orders.length, 3);
  assert.equal(result.orders[0].orderId, 'AB-000006');
  assert.equal(result.metrics.count, 2500);
  assert.equal('claimTokenHash' in result.orders[0], false);
  const exported = await listAdminOrders(db.db, filters, true);
  assert.equal(exported.orders.length, 2500);
  assert.equal(exported.truncated, true);
  const missingPage = await listAdminOrders(db.db, { ...filters, page: 999999 });
  assert.equal(missingPage.page, missingPage.totalPages);
  assert.ok(missingPage.orders.length > 0);
});

test('missing database and missing order have distinct honest errors', async () => {
  await assert.rejects(() => listAdminOrders(null, parseAdminOrderFilters({})), errorCode('DB_UNAVAILABLE', 503));
  await assert.rejects(() => getAdminOrder(null, 'AB-NONE'), errorCode('DB_UNAVAILABLE', 503));
  await assert.rejects(() => getAdminOrder(new FakeFirestore().db, 'AB-NONE'), errorCode('ORDER_NOT_FOUND', 404));
});

test('allowlisted admin order/detail responses preserve useful information but remove internal credentials', async () => {
  const original = { ...order(), apiToken: 'secret', claimToken: 'raw-secret', payloadHash: 'internal',
    customer: { ...order().customer, authToken: 'nested-secret' } };
  const safe = sanitizeOrderForAdmin(original);
  for (const key of ['apiToken', 'claimToken', 'claimTokenHash', 'guestSessionId', 'payloadHash']) assert.equal(key in safe, false);
  assert.equal('authToken' in safe.customer, false);
  assert.deepEqual(safe.totals, original.totals);
  const db = new FakeFirestore([original]);
  db.store.set('orderAudits/older', { orderId: original.orderId, timestamp: 1, previousStatus: 'ORDER_RECEIVED', newStatus: 'CONFIRMED', token: 'audit-secret' });
  db.store.set('orderAudits/newer', { orderId: original.orderId, timestamp: 2, action: 'NOTE_ADDED', note: 'Called customer' });
  const detail = await getAdminOrder(db.db, original.orderId);
  assert.deepEqual(detail.audits.map(item => item.id), ['newer', 'older']);
  assert.equal('token' in detail.audits[1], false);
});

test('note transaction preserves legacy notes and pricing, audits actor and advances revision monotonically', async () => {
  const original = order({ adminNotes: ['Legacy note'], updatedAtMs: Date.now() + 10000, updatedAt: new Date(Date.now() + 10000).toISOString() });
  const db = new FakeFirestore([original]);
  const result = await addAdminOrderNote({ ...actor(db, original), note: '  Confirmed address by phone  ' });
  assert.deepEqual(result.adminNotes, ['Legacy note']);
  assert.equal(result.adminNoteEntries?.[0].text, 'Confirmed address by phone');
  assert.equal(result.adminNoteEntries?.[0].actorUid, 'admin-123');
  assert.ok(result.updatedAtMs > original.updatedAtMs);
  assert.deepEqual(result.totals, original.totals);
  assert.equal(result.paymentStatus, 'UNPAID');
  assert.equal(result.pointsAwarded, false);
  const audit = [...db.store.entries()].find(([path]) => path.startsWith('orderAudits/'))![1];
  assert.equal(audit.action, 'NOTE_ADDED');
  assert.equal(audit.noteId, result.adminNoteEntries?.[0].id);
  await assert.rejects(() => addAdminOrderNote({ ...actor(db, original), note: 'Stale note' }), errorCode('ORDER_CONFLICT', 409));
  assert.equal(db.store.get(`orders/${original.orderId}`).adminNoteEntries.length, 1);
});

test('note validation, cap and failed audit leave the order unchanged', async () => {
  const original = order();
  const db = new FakeFirestore([original]);
  for (const note of ['', 'x'.repeat(1001), { text: 'wrong shape' }]) {
    await assert.rejects(() => addAdminOrderNote({ ...actor(db), note }), errorCode('INVALID_NOTE'));
  }
  await assert.rejects(() => addAdminOrderNote({ ...actor(db), expectedUpdatedAt: undefined, note: 'Test' }), errorCode('INVALID_REVISION'));
  db.failAudit = true;
  await assert.rejects(() => addAdminOrderNote({ ...actor(db), note: 'Will fail atomically' }), /audit write failure/);
  assert.deepEqual(db.store.get(`orders/${original.orderId}`), original);
  db.failAudit = false;
  db.store.set(`orders/${original.orderId}`, order({ adminNotes: Array(100).fill('legacy') }));
  await assert.rejects(() => addAdminOrderNote({ ...actor(db), note: 'Overflow' }), errorCode('NOTE_LIMIT_REACHED'));
});

test('payment bookkeeping corrections are audited and never touch pricing or loyalty', async () => {
  const original = order();
  const db = new FakeFirestore([original]);
  let current = await updateAdminOrderPayment({ ...actor(db), paymentStatus: 'PAID', expectedPaymentStatus: 'UNPAID', reason: 'Bank transfer verified' });
  assert.equal(current.paymentStatus, 'PAID');
  assert.deepEqual(current.totals, original.totals);
  assert.equal(current.status, original.status);
  assert.equal(current.pointsAwarded, original.pointsAwarded);
  assert.equal([...db.store.keys()].some(key => key.startsWith('users/')), false);
  const audit = [...db.store.entries()].find(([key]) => key.startsWith('orderAudits/'))![1];
  assert.equal(audit.previousPaymentStatus, 'UNPAID');
  assert.equal(audit.newPaymentStatus, 'PAID');
  current = await updateAdminOrderPayment({ ...actor(db, current), paymentStatus: 'REFUNDED', expectedPaymentStatus: 'PAID', reason: 'Refund recorded manually' });
  current = await updateAdminOrderPayment({ ...actor(db, current), paymentStatus: 'PAID', expectedPaymentStatus: 'REFUNDED', reason: 'Corrected mistaken refund record' });
  current = await updateAdminOrderPayment({ ...actor(db, current), paymentStatus: 'UNPAID', expectedPaymentStatus: 'PAID', reason: 'Payment verification reversed' });
  assert.equal(current.paymentStatus, 'UNPAID');
  assert.equal([...db.store.keys()].filter(key => key.startsWith('orderAudits/')).length, 4);
});

test('payment validation, status/revision conflicts and atomic errors prevent accidental bookkeeping changes', async () => {
  const original = order();
  const db = new FakeFirestore([original]);
  const input = { ...actor(db), paymentStatus: 'PAID', expectedPaymentStatus: 'UNPAID', reason: 'Payment checked' };
  await assert.rejects(() => updateAdminOrderPayment({ ...input, reason: 'x' }), errorCode('INVALID_REASON'));
  await assert.rejects(() => updateAdminOrderPayment({ ...input, paymentStatus: 'REFUNDED' }), errorCode('INVALID_PAYMENT_TRANSITION'));
  await assert.rejects(() => updateAdminOrderPayment({ ...input, expectedPaymentStatus: 'PAID' }), errorCode('PAYMENT_CONFLICT', 409));
  await assert.rejects(() => updateAdminOrderPayment({ ...input, expectedUpdatedAt: new Date(NOW - 1).toISOString() }), errorCode('ORDER_CONFLICT', 409));
  db.failAudit = true;
  await assert.rejects(() => updateAdminOrderPayment(input), /audit write failure/);
  assert.deepEqual(db.store.get(`orders/${original.orderId}`), original);
});

test('quote orders are filterable, preserve promo packing flags and cannot be marked paid', async () => {
  const original = order({ orderType: 'QUOTE_REQUEST', status: 'QUOTE_REQUESTED', paymentMethod: 'quote', paymentStatus: 'NOT_REQUIRED',
    promoCode: 'CANCER', promoType: 'quote', discountAmount: 0, freeShipping: false, freeGiftWrap: false,
    freeGift: false, isQuoteRequest: true,
    totals: { subtotal: 0, discount: 0, discountedSubtotal: 0, shipping: 0, giftWrapFee: 0, total: 0 }, earnedPoints: 0 });
  const filters = parseAdminOrderFilters({ status: 'QUOTE_REQUESTED', paymentMethod: 'quote', paymentStatus: 'NOT_REQUIRED' });
  assert.equal(filterAdminOrders([original, order()], filters).length, 1);
  assert.equal(sanitizeOrderForAdmin(original).promoCode, 'CANCER');
  assert.equal(sanitizeOrderForAdmin(original).isQuoteRequest, true);
  assert.equal(adminOrderMetrics([original]).statusCounts.QUOTE_REQUESTED, 1);
  assert.equal(adminOrderMetrics([original]).paidValue, 0);
  const db = new FakeFirestore([original]);
  await assert.rejects(() => updateAdminOrderPayment({ ...actor(db, original), paymentStatus: 'PAID',
    expectedPaymentStatus: 'NOT_REQUIRED', reason: 'Attempted payment' }), errorCode('QUOTE_PAYMENT_NOT_REQUIRED'));
  assert.deepEqual(db.store.get(`orders/${original.orderId}`), original);
  assert.equal([...db.store.keys()].some(key => key.startsWith('orderAudits/')), false);
  const gift = sanitizeOrderForAdmin(order({ promoCode: 'MYSTERY', promoType: 'free_gift', discountAmount: 0,
    freeGift: true, freeShipping: false, freeGiftWrap: false, isQuoteRequest: false }));
  assert.equal(gift.freeGift, true);
  assert.equal(gift.promoCode, 'MYSTERY');
});

test('existing delivered/cancelled status path preserves once-only loyalty ledger behavior', async () => {
  const original = order();
  const db = new FakeFirestore([original]);
  db.store.set(`users/${original.uid}`, { loyaltyPoints: 10 });
  const input = { db: db.db, orderId: original.orderId, status: 'DELIVERED' as const, expectedStatus: 'ORDER_RECEIVED' as const,
    actorUid: 'admin-123', reason: 'Courier confirmed delivery' };
  await updateAdminOrderStatus(input);
  assert.equal(db.store.get(`users/${original.uid}`).loyaltyPoints, 36);
  await updateAdminOrderStatus({ ...input, expectedStatus: 'DELIVERED' });
  assert.equal(db.store.get(`users/${original.uid}`).loyaltyPoints, 36);
  await updateAdminOrderStatus({ ...input, status: 'CANCELLED', expectedStatus: 'DELIVERED', reason: 'Delivery reversed and order cancelled' });
  assert.equal(db.store.get(`users/${original.uid}`).loyaltyPoints, 10);
});

test('status revision detects ABA changes even when expected status returns to its old value', async () => {
  const original = order();
  const db = new FakeFirestore([original]);
  const input = { db: db.db, orderId: original.orderId, actorUid: 'admin-123', reason: 'Reviewed current order' };
  const confirmed = await updateAdminOrderStatus({ ...input, status: 'CONFIRMED', expectedStatus: 'ORDER_RECEIVED', expectedUpdatedAt: original.updatedAt });
  const restored = await updateAdminOrderStatus({ ...input, status: 'ORDER_RECEIVED', expectedStatus: 'CONFIRMED', expectedUpdatedAt: confirmed.updatedAt });
  assert.notEqual(restored.updatedAt, original.updatedAt);
  await assert.rejects(() => updateAdminOrderStatus({ ...input, status: 'DISPATCHED', expectedStatus: 'ORDER_RECEIVED', expectedUpdatedAt: original.updatedAt }),
    (error: any) => error.code === 'ORDER_CONFLICT');
  assert.equal(db.store.get(`orders/${original.orderId}`).status, 'ORDER_RECEIVED');
  assert.equal([...db.store.keys()].filter(key => key.startsWith('orderAudits/')).length, 2);
});

test('notes, status and payment advance shared revisions within the same clock millisecond', async () => {
  const original = order();
  const db = new FakeFirestore([original]);
  const realNow = Date.now;
  Date.now = () => NOW;
  try {
    const withNote = await addAdminOrderNote({ ...actor(db), note: 'Address checked' });
    const confirmed = await updateAdminOrderStatus({ db: db.db, orderId: original.orderId, status: 'CONFIRMED', expectedStatus: 'ORDER_RECEIVED',
      expectedUpdatedAt: withNote.updatedAt, reason: 'Order checked', actorUid: 'admin-123' });
    const paid = await updateAdminOrderPayment({ ...actor(db, confirmed), paymentStatus: 'PAID', expectedPaymentStatus: 'UNPAID', reason: 'Payment checked' });
    assert.deepEqual([withNote.updatedAtMs, confirmed.updatedAtMs, paid.updatedAtMs], [NOW + 1, NOW + 2, NOW + 3]);
    await assert.rejects(() => addAdminOrderNote({ ...actor(db, withNote), note: 'Stale note' }), errorCode('ORDER_CONFLICT', 409));
    await assert.rejects(() => updateAdminOrderPayment({ ...actor(db, withNote), paymentStatus: 'REFUNDED', expectedPaymentStatus: 'PAID', reason: 'Stale correction' }), errorCode('ORDER_CONFLICT', 409));
    await updateAdminOrderStatus({ db: db.db, orderId: original.orderId, status: 'PREPARING', expectedStatus: 'CONFIRMED',
      expectedUpdatedAt: paid.updatedAt, reason: 'Packing started', actorUid: 'admin-123' });
    assert.equal([...db.store.keys()].filter(key => key.startsWith('orderAudits/')).length, 4);
    assert.equal(db.store.get(`orders/${original.orderId}`).updatedAtMs, NOW + 4);
  } finally { Date.now = realNow; }
});

test('actual production admin routes reject unauthenticated reads, exports and mutations', { timeout: 35000 }, async () => {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>(resolve => socket.close(() => resolve()));
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(port), TRUST_PROXY_HOPS: '0' };
  for (const key of ['FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST',
    'GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_SHEETS_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GEMINI_API_KEY',
    'N8N_AI_WEBHOOK_URL', 'N8N_ORDER_WEBHOOK_URL']) env[key] = '';
  const child = spawn(process.execPath, ['build/server.cjs'], { env, windowsHide: true, stdio: 'pipe' });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', chunk => { logs += chunk; });
  const request = (path: string, options?: RequestInit) => fetch(`http://127.0.0.1:${port}${path}`, { ...options, signal: AbortSignal.timeout(3000) });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`Production process exited: ${logs}`);
      try { ready = (await request('/api/health')).ok; } catch {}
      if (ready) break;
      await delay(200);
    }
    assert.equal(ready, true, `Production server must start: ${logs}`);
    for (const path of ['/api/admin/orders', '/api/admin/orders/export', '/api/admin/orders/AB-TEST-00001']) {
      const response = await request(path);
      assert.equal(response.status, 401, path);
      assert.equal((await response.json()).code, 'AUTHENTICATION_REQUIRED');
    }
    for (const action of ['status', 'notes', 'payment']) {
      const response = await request(`/api/admin/orders/AB-TEST-00001/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin: true }),
      });
      assert.equal(response.status, 401, action);
    }
  } finally {
    child.kill();
    if (child.exitCode === null) await once(child, 'exit');
  }
});
