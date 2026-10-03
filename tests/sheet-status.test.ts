import assert from 'node:assert/strict';
import test from 'node:test';
import type { CanonicalOrder } from '../src/lib/serverOrderService';
import { hashLegacyCheckoutPayload } from '../src/lib/serverOrderService';
import { applySheetStatusCommand, validateSheetStatusCommand, SheetStatusError, updateAdminOrderStatus,
  createDurableOrder, IdempotencyConflictError } from '../src/lib/orderDatabase';
import { sheetStatusRequestKey } from '../src/lib/sheetStatusCommand';
import { validateAndPriceOrder } from '../src/lib/orderValidation';

class MemoryDatabase {
  records = new Map<string, any>();
  tail = Promise.resolve();
  failAudit = false;
  collection(path: string): any { return { doc: (id: string) => ({ path: `${path}/${id}`, collection: (name: string) => this.collection(`${path}/${id}/${name}`) }) }; }
  snapshot(path: string): any { return { exists: this.records.has(path), data: () => structuredClone(this.records.get(path)) }; }
  runTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      const writes: Array<{ path: string; data: any; merge: boolean }> = [];
      const value = await callback({
        get: async (ref: any) => { assert.equal(writes.length, 0, 'All transaction reads precede writes'); return this.snapshot(ref.path); },
        set: (ref: any, data: any, options?: any) => { if (this.failAudit && ref.path.startsWith('orderAudits/')) throw new Error('audit unavailable');
          writes.push({ path: ref.path, data: structuredClone(data), merge: !!options?.merge }); },
        update: (ref: any, data: any) => writes.push({ path: ref.path, data: structuredClone(data), merge: true }),
      });
      for (const write of writes) this.records.set(write.path, write.merge ? { ...this.records.get(write.path), ...write.data } : write.data);
      return value;
    });
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
  get db(): any { return this; }
}
const fixtureOrder = (): CanonicalOrder => ({ schemaVersion: '2.0.0', source: 'website', orderId: 'AB-20261003-A1B2C3',
  createdAt: '2026-10-03T00:00:00.000Z', createdAtMs: Date.parse('2026-10-03T00:00:00Z'),
  updatedAt: '2026-10-03T00:00:00.000Z', updatedAtMs: Date.parse('2026-10-03T00:00:00Z'),
  status: 'PREPARING', paymentStatus: 'UNPAID', paymentMethod: 'cod', uid: 'fixture-patron', isWholesale: false,
  customer: { name: 'Fixture Patron', phone: '03001234567', address: 'Test house, test street', city: 'Lahore', deliverySlot: 'Fastest Dispatch' },
  gifting: { giftWrapping: false, giftWrapFee: 0 },
  items: [{ id: 'pista-500g', productId: 'pista', name: 'Pista', selectedWeight: '500g', quantity: 1, price: 2500, earnedPoints: 25 }],
  totals: { subtotal: 2500, discount: 0, discountedSubtotal: 2500, shipping: 150, giftWrapFee: 0, total: 2650 }, earnedPoints: 25, pointsAwarded: false,
});
const seeded = () => { const store = new MemoryDatabase(), order = fixtureOrder(); store.records.set(`orders/${order.orderId}`, order); return { store, order }; };
const command = (order = fixtureOrder(), patch: Record<string, unknown> = {}) => validateSheetStatusCommand({ source: 'google_sheet',
  eventId: 'sheet:fixture-request-0001', orderId: order.orderId, status: 'DISPATCHED', expectedStatus: order.status,
  expectedUpdatedAt: order.updatedAt, reason: 'Owner updated dispatch status', ...patch });
const code = (value: string, status = 400) => (error: any) => error instanceof SheetStatusError && error.code === value && error.httpStatus === status;
const count = (store: MemoryDatabase, collection: string) => [...store.records.keys()].filter(key => key.startsWith(`${collection}/`)).length;

test('Sheet validation explicitly maps legacy codes and rejects unknown/private mutation fields', () => {
  for (const [raw, expected] of Object.entries({ RECEIVED: 'ORDER_RECEIVED', ORDER: 'ORDER_RECEIVED', CONF: 'CONFIRMED', PROC: 'PREPARING', PACK: 'PREPARING', DISP: 'DISPATCHED', SHIP: 'DISPATCHED', DELIV: 'DELIVERED', CANC: 'CANCELLED' })) assert.equal(command(undefined, { status: raw }).status, expected);
  for (const patch of [{ source: 'browser' }, { status: 'PAID' }, { actorUid: 'admin' }, { totals: { total: 1 } }, { phone: '03009999999' },
    { paymentStatus: 'PAID' }, { eventId: 'sheet:../secret' }, { expectedUpdatedAt: '' }, { reason: 'x' }]) assert.throws(() => command(undefined, patch), SheetStatusError);
});

test('Sheet mutation atomically writes canonical status, minimal snapshot, actor audit and window-gated job', async () => {
  const { store, order } = seeded();
  const previous = { url: process.env.N8N_STATUS_WEBHOOK_URL, secret: process.env.N8N_STATUS_WEBHOOK_SECRET };
  process.env.N8N_STATUS_WEBHOOK_URL = 'https://status.example.com/webhook/status'; process.env.N8N_STATUS_WEBHOOK_SECRET = 's'.repeat(32);
  try {
    const result = await applySheetStatusCommand({ db: store.db, command: command(order) });
    const saved = store.records.get(`orders/${order.orderId}`);
    assert.equal(result.status, 'DISPATCHED'); assert.equal(result.updatedAt, saved.updatedAt); assert.equal(result.duplicate, false);
    assert.equal(saved.paymentStatus, 'UNPAID'); assert.deepEqual(saved.customer, order.customer); assert.deepEqual(saved.totals, order.totals);
    const event = [...store.records.values()].find(record => record.eventType === 'ORDER_STATUS_CHANGED');
    assert.equal(event.deliveryState, 'PENDING'); assert.equal(event.payload.statusRevision, result.updatedAt);
    assert.deepEqual(event.payload.order, { orderId: order.orderId, status: 'DISPATCHED', updatedAt: result.updatedAt });
    const audit = [...store.records.values()].find(record => record.previousStatus === 'PREPARING'); assert.equal(audit.actorUid, 'n8n_sheet'); assert.equal(audit.source, 'google_sheet');
    assert.equal(count(store, 'whatsappNotificationJobs'), 1); assert.equal(count(store, 'integrationStatusRequests'), 1);
  } finally { if (previous.url === undefined) delete process.env.N8N_STATUS_WEBHOOK_URL; else process.env.N8N_STATUS_WEBHOOK_URL = previous.url;
    if (previous.secret === undefined) delete process.env.N8N_STATUS_WEBHOOK_SECRET; else process.env.N8N_STATUS_WEBHOOK_SECRET = previous.secret; }
});

test('Duplicate Sheet event returns original result after newer Admin change without repeat effects', async () => {
  const { store, order } = seeded(); const input = command(order, { status: 'DELIVERED' });
  const first = await applySheetStatusCommand({ db: store.db, command: input });
  assert.equal(store.records.get('users/fixture-patron').loyaltyPoints, 25);
  await updateAdminOrderStatus({ db: store.db, orderId: order.orderId, status: 'CANCELLED', expectedStatus: 'DELIVERED',
    expectedUpdatedAt: first.updatedAt, actorUid: 'verified-admin', reason: 'Returned order' });
  const before = [...store.records.entries()];
  const duplicate = await applySheetStatusCommand({ db: store.db, command: input });
  assert.deepEqual(duplicate, { ...first, duplicate: true }); assert.deepEqual([...store.records.entries()], before);
  assert.equal(store.records.get(`orders/${order.orderId}`).status, 'CANCELLED'); assert.equal(store.records.get('users/fixture-patron').loyaltyPoints, 0);
});

test('Changed payload under an existing event ID conflicts and exposes only canonical status/revision', async () => {
  const { store, order } = seeded(); await applySheetStatusCommand({ db: store.db, command: command(order) }); const saved = store.records.get(`orders/${order.orderId}`);
  await assert.rejects(() => applySheetStatusCommand({ db: store.db, command: command(order, { status: 'DELIVERED' }) }), error => {
    assert.ok(code('INTEGRATION_EVENT_CONFLICT', 409)(error)); assert.deepEqual((error as SheetStatusError).canonical, { status: saved.status, updatedAt: saved.updatedAt }); return true;
  });
  assert.equal(count(store, 'orderEvents'), 1);
});

test('Stale Sheet expected status or revision cannot overwrite an Admin change', async () => {
  const { store, order } = seeded();
  const admin = await updateAdminOrderStatus({ db: store.db, orderId: order.orderId, status: 'CONFIRMED', expectedStatus: order.status,
    expectedUpdatedAt: order.updatedAt, actorUid: 'verified-admin', reason: 'Packing verification' });
  for (const patch of [{}, { expectedStatus: admin.status }]) await assert.rejects(() => applySheetStatusCommand({ db: store.db, command: command(order, patch) }), code('ORDER_CONFLICT', 409));
  assert.equal(count(store, 'orderEvents'), 1); assert.equal(count(store, 'integrationStatusRequests'), 0);
});

test('Concurrent Sheet/Admin edits with the same revision produce one mutation and one conflict', async () => {
  const { store, order } = seeded();
  const results = await Promise.allSettled([
    updateAdminOrderStatus({ db: store.db, orderId: order.orderId, status: 'CONFIRMED', expectedStatus: order.status,
      expectedUpdatedAt: order.updatedAt, actorUid: 'verified-admin', reason: 'Owner confirmed' }),
    applySheetStatusCommand({ db: store.db, command: command(order) }),
  ]);
  assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected'); assert.equal(count(store, 'orderEvents'), 1); assert.equal(count(store, 'whatsappNotificationJobs'), 1);
});

test('Audit failure rolls back canonical mutation, dedup record, mirror event and notification', async () => {
  const { store, order } = seeded(); store.failAudit = true;
  await assert.rejects(() => applySheetStatusCommand({ db: store.db, command: command(order, { status: 'DELIVERED' }) }), /audit unavailable/);
  assert.deepEqual(store.records.get(`orders/${order.orderId}`), order); assert.equal(store.records.size, 1);
});

test('Same-state command is durably deduplicated without status, loyalty or notification effects', async () => {
  const { store, order } = seeded(); const input = command(order, { status: order.status });
  const first = await applySheetStatusCommand({ db: store.db, command: input }); const second = await applySheetStatusCommand({ db: store.db, command: input });
  assert.equal(first.updatedAt, order.updatedAt); assert.equal(second.duplicate, true); assert.equal(count(store, 'orderEvents'), 0); assert.equal(count(store, 'whatsappNotificationJobs'), 0);
  assert.ok(store.records.has(`integrationStatusRequests/${sheetStatusRequestKey(input.eventId)}`));
});

const checkout = { name: 'Fixture Patron', phone: '03001234567', address: 'Fixture street, house12', city: 'Lahore', paymentMethod: 'cod',
  shippingMethodId: 'standard', deliverySlot: 'Evening', isWholesale: false, items: [{ id: 'pista', selectedWeight: '500g', quantity: 1 }] };
async function legacyCheckout(options: { mode?: boolean; points?: number } = {}) {
  const store = new MemoryDatabase(); const saved = await createDurableOrder({ db: store.db, payload: checkout, uid: 'fixture-patron', idempotencyKey: 'historical-attempt' });
  const canonical = store.records.get(`orders/${saved.orderId}`); if (options.mode === undefined) delete canonical.isWholesale; else canonical.isWholesale = options.mode;
  if (options.points !== undefined) canonical.earnedPoints = options.points;
  store.records.get('checkoutIntents/historical-attempt').payloadHash = hashLegacyCheckoutPayload(checkout);
  return { store, saved };
}

test('New order persists wholesale intent and hashed phone index in the canonical transaction', async () => {
  const store = new MemoryDatabase(); const saved = await createDurableOrder({ db: store.db, payload: checkout, uid: 'fixture-patron', idempotencyKey: 'new-mode' });
  assert.equal(store.records.get(`orders/${saved.orderId}`).isWholesale, false);
  const index = [...store.records.entries()].find(([path]) => path.startsWith('whatsappPhoneOrders/'))!;
  assert.match(index[0], /^whatsappPhoneOrders\/[a-f0-9]{64}\/orders\//); assert.equal(index[1].orderId, saved.orderId);
});

test('Legacy unchanged retry with explicit mode or provable retail returns saved order without repricing/writes', async () => {
  for (const options of [{ mode: false }, { points: 25 }]) {
    const { store, saved } = await legacyCheckout(options); const before = [...store.records.entries()];
    const retry = await createDurableOrder({ db: store.db, payload: { ...checkout, authToken: 'refreshed', expectedFinalTotal: 99999 },
      uid: 'fixture-patron', idempotencyKey: 'historical-attempt', expectedFinalTotal: 99999 });
    assert.equal(retry.orderId, saved.orderId); assert.equal(retry.isDuplicate, true); assert.deepEqual([...store.records.entries()], before);
  }
});

test('Legacy changed slot/mode or missing/zero mode proof conflicts without recreating order', async () => {
  for (const [options, patch] of [[{ mode: false }, { deliverySlot: 'Morning' }], [{ mode: false }, { isWholesale: true }], [{ points: 0 }, {}]] as const) {
    const { store } = await legacyCheckout(options); const before = [...store.records.entries()];
    await assert.rejects(() => createDurableOrder({ db: store.db, payload: { ...checkout, ...patch }, uid: 'fixture-patron', idempotencyKey: 'historical-attempt' }), IdempotencyConflictError);
    assert.deepEqual([...store.records.entries()], before);
  }
});

test('Wholesale canonical pricing guarantees zero loyalty points; unknown legacy mode stays unprovable', () => {
  assert.equal(validateAndPriceOrder({ city: 'Lahore', items: checkout.items, shippingMethodId: 'standard', isWholesale: true }).earnedPoints, 0);
});
