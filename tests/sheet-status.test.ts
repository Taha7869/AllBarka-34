import assert from 'node:assert/strict';
import test from 'node:test';
import type { CanonicalOrder } from '../src/lib/serverOrderService';
import { hashLegacyCheckoutPayload } from '../src/lib/serverOrderService';
import { applySheetStatusCommand, validateSheetStatusCommand, SheetStatusError, updateAdminOrderStatus,
  createDurableOrder, IdempotencyConflictError } from '../src/lib/orderDatabase';
import { sheetStatusRequestKey } from '../src/lib/sheetStatusCommand';
import { validateAndPriceOrder } from '../src/lib/orderValidation';
import crypto from 'node:crypto';
import { applyOrderUpdate, claimGuestOrder } from '../src/lib/orderDatabase';
import { validateOrderUpdate } from '../src/lib/orderUpdateCommand';
import { calculateLoyaltyPoints, loyaltyRate } from '../src/lib/loyaltyPoints';

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

test('Sheet validation accepts only the exact seven live statuses and rejects obsolete/private mutation fields', () => {
  for (const raw of ['ORDER_RECEIVED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']) assert.equal(command(undefined, { status: raw }).status, raw);
  for (const status of ['NEW', 'PACKED', 'pending', 'delivered', 'PACK', 'CONF', 'QUOTE_REQUESTED']) assert.throws(() => command(undefined, { status }), SheetStatusError);
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
  assert.equal(store.records.get('users/fixture-patron').loyaltyPoints, 26);
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

test('Same-state command is ignored with zero writes or status, loyalty and notification effects', async () => {
  const { store, order } = seeded(); const input = command(order, { status: order.status });
  const first = await applySheetStatusCommand({ db: store.db, command: input }); const second = await applySheetStatusCommand({ db: store.db, command: input });
  assert.equal(first.updatedAt, order.updatedAt); assert.equal(second.duplicate, true); assert.equal(count(store, 'orderEvents'), 0); assert.equal(count(store, 'whatsappNotificationJobs'), 0);
  assert.equal(store.records.has(`integrationStatusRequests/${sheetStatusRequestKey(input.eventId)}`), false);
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

const update = (order = fixtureOrder(), patch: Record<string, unknown> = {}) => validateOrderUpdate({ orderId: order.orderId,
  status: 'DELIVERED', updatedAt: new Date(Date.now() + 1000).toISOString(), eventId: 'sheet:new-contract-0001', ...patch });

test('Simple Sheets update is atomic, duplicate-safe, and cannot award points twice under concurrent retry', async () => {
  const { store, order } = seeded(); const command = update(order, { trackingNumber: 'COURIER-123', estimatedDelivery: '2026-10-08', notes: 'Private packing note' });
  const [first, second] = await Promise.all([applyOrderUpdate({ db: store.db, command }), applyOrderUpdate({ db: store.db, command })]);
  assert.equal(first.duplicate, false); assert.equal(second.duplicate, true);
  assert.equal(store.records.get(`orders/${order.orderId}`).trackingNumber, 'COURIER-123');
  assert.equal(store.records.get(`orders/${order.orderId}`).estimatedDelivery, '2026-10-08');
  assert.equal(store.records.get('users/fixture-patron').loyaltyPoints, 26);
  assert.equal(count(store, 'pointsLedger'), 1); assert.equal(count(store, 'orderEvents'), 1); assert.equal(count(store, 'orderAudits'), 1);
  const ledger = store.records.get(`pointsLedger/${order.orderId}`);
  assert.equal(ledger.customerId, 'fixture-patron'); assert.equal(ledger.points, 26); assert.equal(ledger.type, 'EARNED'); assert.ok(ledger.timestamp);
  const before = [...store.records.entries()]; await applyOrderUpdate({ db: store.db, command }); assert.deepEqual([...store.records.entries()], before);
});

test('New event IDs at the same revision deduplicate; changed payload conflicts; old revisions cannot regress state', async () => {
  const { store, order } = seeded(); const command = update(order, { status: 'DISPATCHED' });
  await applyOrderUpdate({ db: store.db, command }); const before = [...store.records.entries()];
  const duplicate = await applyOrderUpdate({ db: store.db, command: { ...command, eventId: 'sheet:new-contract-0002' } });
  assert.equal(duplicate.duplicate, true); assert.deepEqual([...store.records.entries()], before);
  await assert.rejects(() => applyOrderUpdate({ db: store.db, command: { ...command, trackingNumber: 'CHANGED', eventId: 'sheet:new-contract-0003' } }), code('INTEGRATION_REVISION_CONFLICT', 409));
  const stale = await applyOrderUpdate({ db: store.db, command: update(order, { eventId: 'sheet:older-revision-0001', status: 'ORDER_RECEIVED', updatedAt: order.createdAt }) });
  assert.equal(stale.ignored, true); assert.equal(store.records.get(`orders/${order.orderId}`).status, 'DISPATCHED');
  assert.deepEqual([...store.records.entries()], before);
});

test('Tracking-only edits create a new immutable event while duplicate edits remain inert', async () => {
  const { store, order } = seeded(); const command = update(order, { status: 'CONFIRMED' });
  await applyOrderUpdate({ db: store.db, command });
  const next = update(order, { status: 'CONFIRMED', eventId: 'sheet:tracking-update-0002', updatedAt: new Date(Date.parse(command.updatedAt) + 1000).toISOString(), trackingNumber: 'NEW-COURIER-ID' });
  await applyOrderUpdate({ db: store.db, command: next }); await applyOrderUpdate({ db: store.db, command: next });
  assert.equal(count(store, 'orderEvents'), 2); assert.equal(count(store, 'pointsLedger'), 0);
  const event = [...store.records.values()].find(value => value.payload?.notification?.trackingNumber === 'NEW-COURIER-ID');
  assert.equal(event.type, 'order_status_updated'); assert.equal(event.payload.notification.customerPhone, order.customer.phone);
  assert.equal(event.payload.notification.status, 'CONFIRMED'); assert.equal(event.payload.notification.loyaltyPointsEarned, 0);
});

test('Loyalty rate uses payable total, floors whole hundreds, excludes quote/wholesale, and rejects invalid environment', () => {
  assert.equal(loyaltyRate({}), 1); assert.equal(loyaltyRate({ LOYALTY_POINTS_PER_100_RUPEES: '2' }), 2);
  assert.equal(calculateLoyaltyPoints(2650, false, false, 2), 52); assert.equal(calculateLoyaltyPoints(99, false, false, 1), 0);
  assert.equal(calculateLoyaltyPoints(2650, true, false, 1), 0); assert.equal(calculateLoyaltyPoints(2650, false, true, 1), 0);
  for (const value of ['NaN', '-1', '1.5']) assert.throws(() => loyaltyRate({ LOYALTY_POINTS_PER_100_RUPEES: value }), /INVALID_LOYALTY/);
});

test('Ledger blocks re-awarding even after an Admin reverses and reopens the same order', async () => {
  const { store, order } = seeded();
  await updateAdminOrderStatus({ db: store.db, orderId: order.orderId, status: 'DELIVERED', actorUid: 'admin' });
  await updateAdminOrderStatus({ db: store.db, orderId: order.orderId, status: 'CANCELLED', actorUid: 'admin' });
  await updateAdminOrderStatus({ db: store.db, orderId: order.orderId, status: 'CONFIRMED', actorUid: 'admin' });
  await updateAdminOrderStatus({ db: store.db, orderId: order.orderId, status: 'DELIVERED', actorUid: 'admin' });
  assert.equal(store.records.get('users/fixture-patron').loyaltyPoints, 0); assert.equal(count(store, 'pointsLedger'), 1);
});

test('Guest award is held once and credited only by verified private order claim, including claim retry', async () => {
  const { store, order } = seeded(); const token = 'fixture-high-entropy-guest-token';
  order.uid = null; order.claimTokenHash = crypto.createHash('sha256').update(token).digest('hex'); order.claimTokenExpiry = Date.now() + 60000;
  store.records.set(`orders/${order.orderId}`, order);
  await applyOrderUpdate({ db: store.db, command: update(order) });
  assert.equal(count(store, 'pointsLedger'), 1); assert.equal(store.records.get(`pointsLedger/${order.orderId}`).credited, false);
  await assert.rejects(() => claimGuestOrder({ db: store.db, uid: 'claimed-patron', orderId: order.orderId, claimToken: 'wrong' }), /Invalid/);
  await claimGuestOrder({ db: store.db, uid: 'claimed-patron', orderId: order.orderId, claimToken: token });
  await claimGuestOrder({ db: store.db, uid: 'claimed-patron', orderId: order.orderId, claimToken: token });
  assert.equal(store.records.get('users/claimed-patron').loyaltyPoints, 26); assert.equal(count(store, 'pointsLedger'), 1);
  assert.equal(store.records.get(`pointsLedger/${order.orderId}`).customerId, 'claimed-patron');
});

test('Simple update validation rejects price/identity injection, bad statuses and timestamps', () => {
  for (const patch of [{ status: 'paid' }, { status: 'delivered' }, { total: 1 }, { uid: 'fake' }, { updatedAt: 'yesterday' },
    { updatedAt: new Date(Date.now() + 600000).toISOString() }, { estimatedDelivery: '2026-99-99' }, { estimatedDelivery: '2026-02-30' }]) assert.throws(() => update(fixtureOrder(), patch), SheetStatusError);
});

test('Unknown Sheet/WhatsApp order IDs return ignored success without any persistence or notifications', async () => {
  const store = new MemoryDatabase();
  const result = await applyOrderUpdate({ db: store.db, command: update(fixtureOrder(), { orderId: 'WHATSAPP-ORDER-123' }) });
  assert.equal(result.ok, true); assert.equal(result.ignored, true); assert.equal(store.records.size, 0);
  const legacy = await applySheetStatusCommand({ db: store.db, command: command(fixtureOrder(), { orderId: 'WHATSAPP-ORDER-123' }) });
  assert.equal(legacy.ignored, true); assert.equal(store.records.size, 0);
});

test('Identical status and tracking ignore different event IDs, timestamps, ETA and notes with zero writes', async () => {
  const { store, order } = seeded(); order.trackingNumber = 'SAME-TRACKING'; store.records.set(`orders/${order.orderId}`, order);
  const before = [...store.records.entries()];
  for (const eventId of ['sheet:semantic-retry-0001', 'sheet:semantic-retry-0002']) {
    const result = await applyOrderUpdate({ db: store.db, command: update(order, { status: 'PREPARING', trackingNumber: 'SAME-TRACKING',
      eventId, notes: 'Changed notes are not a status/tracking change', estimatedDelivery: '2026-10-09' }) });
    assert.equal(result.ignored, true); assert.equal(result.duplicate, true); assert.deepEqual([...store.records.entries()], before);
  }
});

test('Non-website Firestore orders may change status but never receive a loyalty award', async () => {
  const { store, order } = seeded(); (order as any).source = 'whatsapp'; store.records.set(`orders/${order.orderId}`, order);
  await applyOrderUpdate({ db: store.db, command: update(order) });
  assert.equal(store.records.get(`orders/${order.orderId}`).status, 'DELIVERED');
  assert.equal(store.records.get(`orders/${order.orderId}`).earnedPoints, 0);
  assert.equal(count(store, 'pointsLedger'), 0); assert.equal(store.records.has('users/fixture-patron'), false);
});

test('Tracking-only edits of an already DELIVERED order cannot initiate a new loyalty award', async () => {
  const { store, order } = seeded(); order.status = 'DELIVERED'; order.pointsAwarded = false;
  store.records.set(`orders/${order.orderId}`, order);
  await applyOrderUpdate({ db: store.db, command: update(order, { trackingNumber: 'CORRECTED-TRACKING' }) });
  assert.equal(count(store, 'pointsLedger'), 0); assert.equal(store.records.has('users/fixture-patron'), false);
  assert.equal(store.records.get(`orders/${order.orderId}`).pointsAwarded, false);
});
