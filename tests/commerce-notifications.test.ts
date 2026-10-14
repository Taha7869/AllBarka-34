import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrderOutboxWorker, ORDER_OUTBOX_LOCK_PATH } from '../src/services/orderOutboxWorker';
import type { CanonicalOrder, OutboxOrderEvent } from '../src/lib/serverOrderService';
import { CommerceFirestoreFixture } from './commerce-firestore-fixture';

const config = { enabled: true, webhookUrl: 'https://fixture.example/order', webhookSecret: 'fixture-secret', timeoutMs: 5000 };
const disabled = { enabled: false, timeoutMs: 5000 };
const startedAt = Date.now();
function order(index: number): CanonicalOrder {
  return { schemaVersion: '2.0.0', orderId: `AB-20261014-${index.toString(16).toUpperCase().padStart(8, '0')}`, source: 'website', uid: null,
    createdAtMs: startedAt, createdAt: new Date(startedAt).toISOString(), updatedAt: new Date(startedAt).toISOString(), updatedAtMs: startedAt,
    status: 'ORDER_RECEIVED', paymentStatus: 'UNPAID', paymentMethod: 'cod', orderType: 'ORDER',
    customer: { name: 'Fixture customer', phone: '03001234567', address: 'Fixture house and street', city: 'Lahore' },
    gifting: { giftWrapping: false, giftWrapFee: 0 }, items: [{ id: 'pista-250g', productId: 'pista', name: 'Pista', selectedWeight: '250g', quantity: 1, price: 1000, earnedPoints: 10 }],
    totals: { subtotal: 1000, discount: 0, discountedSubtotal: 1000, shipping: 150, giftWrapFee: 0, total: 1150 }, earnedPoints: 11, pointsAwarded: false,
  };
}
const event = (value: CanonicalOrder, at = startedAt): OutboxOrderEvent => ({ schemaVersion: '2.0.0', eventId: `${value.orderId}_ORDER_CREATED_${value.createdAtMs}`, orderId: value.orderId, eventType: 'ORDER_CREATED', occurredAt: value.createdAt, occurredAtMs: value.createdAtMs, deliveryState: 'PENDING', attempts: 0, nextAttemptAtMs: at, payload: {} });
const seed = (fixture: CommerceFirestoreFixture, value: CanonicalOrder, at = startedAt) => { fixture.records.set(`orders/${value.orderId}`, value); const pending = event(value, at); fixture.records.set(`orderEvents/${pending.eventId}`, pending); return pending; };
const worker = (fixture: CommerceFirestoreFixture, extra: Record<string, any> = {}) => createOrderOutboxWorker({ getDb: () => fixture.db, getConfig: () => config, getStatusConfig: () => disabled, now: () => startedAt, ...extra });
const delivered = async () => ({ sent: true as const, status: 'SUCCESS' as const });
async function until(condition: () => boolean) { const deadline = Date.now() + 1500; while (!condition()) { if (Date.now() > deadline) throw new Error('Worker did not react before deadline'); await new Promise(resolve => setTimeout(resolve, 10)); } }

test('a bounded batch drains twenty ready orders, then schedules the remaining backlog', async () => {
  const fixture = new CommerceFirestoreFixture(); for (let i = 1; i <= 24; i++) seed(fixture, order(i));
  let calls = 0; const w = worker(fixture, { dispatch: async () => { calls++; return delivered(); } });
  assert.equal((await w.runOnce()).status, 'DELIVERED'); assert.equal(calls, 20);
  assert.deepEqual(w.getState().lastBatch, { processed: 20, delivered: 20, failed: 0, retries: 0, moreWork: true });
  await w.runOnce(); assert.equal(calls, 24); assert.equal(w.getState().lastBatch.moreWork, false);
  assert.ok(fixture.requestedLimits.every(value => value <= 25));
});

test('an uncertain receiver failure backoffs only its event and does not delay unrelated orders', async () => {
  const fixture = new CommerceFirestoreFixture(); const a = seed(fixture, order(1)); const b = seed(fixture, order(2)); let calls = 0;
  const w = worker(fixture, { dispatch: async () => ++calls === 1 ? { sent: false, status: 'TIMEOUT', reason: 'ORDER_WEBHOOK_TIMEOUT' } : delivered() });
  await w.runOnce(); assert.equal(calls, 2);
  assert.equal(fixture.records.get(`orderEvents/${a.eventId}`).deliveryState, 'PENDING');
  assert.equal(fixture.records.get(`orderEvents/${a.eventId}`).nextAttemptAtMs, startedAt + 30000);
  assert.equal(fixture.records.get(`orderEvents/${b.eventId}`).deliveryState, 'DELIVERED');
  assert.equal(fixture.records.get(ORDER_OUTBOX_LOCK_PATH).leaseUntilMs, startedAt);
});

test('lease renewal between slow transports preserves fencing when the full batch exceeds one lease duration', async () => {
  const fixture = new CommerceFirestoreFixture(); for (let i = 1; i <= 3; i++) seed(fixture, order(i)); let clock = startedAt;
  const w = worker(fixture, { now: () => clock, dispatch: async () => { clock += 40000; return delivered(); } });
  await w.runOnce(); assert.equal(w.getState().lastBatch.delivered, 3); assert.equal(clock, startedAt + 120000);
  assert.ok([...fixture.records.values()].filter(value => value.eventType === 'ORDER_CREATED').every(value => value.deliveryState === 'DELIVERED'));
});

test('a local wake dispatches a new order immediately while idle polling remains sixty seconds and write-free', async () => {
  const fixture = new CommerceFirestoreFixture(); let calls = 0; const w = worker(fixture, { dispatch: async () => { calls++; return delivered(); } });
  w.start(); await until(() => w.getState().lastResult === 'IDLE'); assert.equal(fixture.writes, 0); assert.equal(w.getState().pollIntervalMs, 60000);
  seed(fixture, order(1)); w.wake(); await until(() => calls === 1 && !w.getState().running); await w.stop();
  assert.equal(fixture.watches.size, 0); assert.equal((await w.runOnce()).status, 'STOPPED');
});

test('Firestore pending events also wake another server instance and stop removes all subscriptions', async () => {
  const fixture = new CommerceFirestoreFixture(); let calls = 0; const w = worker(fixture, { dispatch: async () => { calls++; return delivered(); } });
  w.start(); await until(() => w.getState().lastResult === 'IDLE'); seed(fixture, order(1)); await fixture.notify('orderEvents');
  await until(() => calls === 1 && !w.getState().running); await w.stop(); assert.equal(fixture.watches.size, 0);
});

test('stop finishes the active transport and leaves the rest of its bounded batch pending', async () => {
  const fixture = new CommerceFirestoreFixture(); for (let i = 1; i <= 3; i++) seed(fixture, order(i));
  let finish!: (value: any) => void, calls = 0;
  const w = worker(fixture, { dispatch: async () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const active = w.runOnce(); await until(() => calls === 1); const stopping = w.stop(); finish(await delivered()); await active; await stopping;
  assert.equal(calls, 1); assert.equal([...fixture.records.values()].filter(value => value.deliveryState === 'PENDING').length, 2);
});

test('a status event waits for its order creation acknowledgement and follows immediately after the mirror exists', async () => {
  const fixture = new CommerceFirestoreFixture(); const value = order(1); const parent = seed(fixture, value, startedAt + 30000); let clock = startedAt, statuses = 0;
  const child = { ...event(value), eventId: `${value.orderId}_STATUS_DISPATCHED_${startedAt + 1}`, eventType: 'ORDER_STATUS_CHANGED', payload: { order: { orderId: value.orderId, status: 'DISPATCHED', updatedAt: new Date(startedAt + 1).toISOString() } } };
  fixture.records.set(`orderEvents/${child.eventId}`, child);
  const w = worker(fixture, { now: () => clock, getStatusConfig: () => ({ ...config, webhookUrl: 'https://fixture.example/status' }), dispatch: delivered, dispatchStatus: async () => { statuses++; return delivered(); } });
  assert.equal((await w.runOnce()).status, 'IDLE'); assert.equal(statuses, 0); assert.equal(fixture.records.get(`orderEvents/${child.eventId}`).attempts, 0);
  clock += 31000; await w.runOnce(); assert.equal(fixture.records.get(`orderEvents/${parent.eventId}`).deliveryState, 'DELIVERED'); assert.equal(w.getState().lastBatch.moreWork, true);
  await w.runOnce(); assert.equal(statuses, 1); assert.equal(fixture.records.get(`orderEvents/${child.eventId}`).deliveryState, 'DELIVERED');
});
