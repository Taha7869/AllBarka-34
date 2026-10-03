import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { getN8nOrderDispatchConfig, projectCanonicalOrderForN8n, sendOrderToN8n } from '../src/services/n8nOrderNotification';
import { createOrderOutboxWorker, inspectOrderOutbox, ORDER_OUTBOX_LOCK_PATH, ORDER_OUTBOX_MAX_ATTEMPTS, orderOutboxBackoffMs } from '../src/services/orderOutboxWorker';
import { createDurableOrder, PersistenceUnavailableError } from '../src/lib/orderDatabase';
import type { CanonicalOrder, OutboxOrderEvent } from '../src/lib/serverOrderService';
import { parseOrderOutboxReportArgs, summarizeOrderOutboxReport } from '../scripts/report-order-outbox';
import { getN8nStatusDispatchConfig, sendStatusToN8n } from '../src/services/n8nStatusNotification';

const INITIAL_TIME = Date.parse('2026-10-03T10:00:00Z');
const enabledConfig = getN8nOrderDispatchConfig({ N8N_ORDER_WEBHOOK_URL: 'https://n8n.example.com/webhook/order', N8N_WEBHOOK_SECRET: 'test-only-shared-secret' });
const statusConfig = getN8nStatusDispatchConfig({ N8N_STATUS_WEBHOOK_URL: 'https://n8n.example.com/webhook/status', N8N_STATUS_WEBHOOK_SECRET: 'test-only-status-secret' });
const clone = <T>(value: T): T => value === undefined ? value : structuredClone(value);

/** Serializable transactions with Firestore's read-before-write constraint. No network is used. */
function memoryDatabase(initial: Record<string, any> = {}) {
  const records = new Map(Object.entries(clone(initial)));
  let transactionTail = Promise.resolve();
  const ref = (path: string): any => ({
    path, id: path.split('/').at(-1),
    get: async () => snapshot(path),
    collection: (name: string) => collection(`${path}/${name}`),
  });
  const snapshot = (path: string): any => ({
    exists: records.has(path), id: path.split('/').at(-1), ref: ref(path), data: () => clone(records.get(path)),
  });
  const collection = (path: string): any => {
    const makeQuery = (filters: Array<[string, string, any]> = [], ordering?: string, count = 10000): any => ({
      doc: (id: string) => ref(`${path}/${id}`),
      where: (field: string, op: string, value: any) => makeQuery([...filters, [field, op, value]], ordering, count),
      orderBy: (field: string) => makeQuery(filters, field, count),
      limit: (value: number) => makeQuery(filters, ordering, value),
      get: async () => {
        const docs = [...records.entries()]
          .filter(([key]) => key.startsWith(`${path}/`) && key.slice(path.length + 1).indexOf('/') < 0)
          .filter(([, data]) => filters.every(([field, op, value]) => data[field] !== undefined && (op === '==' ? data[field] === value : data[field] <= value)))
          .sort((a, b) => ordering ? a[1][ordering] - b[1][ordering] : 0)
          .slice(0, count).map(([key]) => snapshot(key));
        return { docs, size: docs.length, empty: !docs.length };
      },
    });
    return makeQuery();
  };
  const db: any = {
    doc: ref, collection,
    runTransaction(callback: any) {
      const operation = transactionTail.then(async () => {
        const writes: Array<() => void> = [];
        const result = await callback({
          get: async (document: any) => { assert.equal(writes.length, 0, 'Firestore reads must precede writes'); return snapshot(document.path); },
          set: (document: any, data: any, options?: { merge?: boolean }) => writes.push(() => records.set(document.path, options?.merge ? { ...records.get(document.path), ...clone(data) } : clone(data))),
          update: (document: any, data: any) => writes.push(() => records.set(document.path, { ...records.get(document.path), ...clone(data) })),
        });
        writes.forEach(write => write());
        return result;
      });
      transactionTail = operation.then(() => undefined, () => undefined);
      return operation;
    },
  };
  return { db, records };
}

function savedOrder(index = 1): CanonicalOrder {
  return {
    schemaVersion: '2.0.0', orderId: `AB-20261003-${index.toString(16).toUpperCase().padStart(6, '0')}`,
    source: 'website', createdAt: '2026-10-01T12:00:00.000Z', createdAtMs: Date.parse('2026-10-01T12:00:00Z'),
    updatedAt: '2026-10-01T12:00:00.000Z', updatedAtMs: Date.parse('2026-10-01T12:00:00Z'),
    status: 'NEW', paymentStatus: 'UNPAID', paymentMethod: 'bank', uid: 'test-customer',
    claimTokenHash: 'private-hash-must-not-be-sent', claimTokenExpiry: INITIAL_TIME + 1000,
    adminNoteEntries: [{ id: 'private', text: 'private-admin-note', actorUid: 'admin', actorEmail: 'private@example.com', timestamp: INITIAL_TIME, timestampIso: new Date(INITIAL_TIME).toISOString() }],
    customer: { name: 'Test Customer', phone: '03001234567', address: 'Test Street, House 12', city: 'Karachi', deliverySlot: 'Evening' },
    gifting: { giftWrapping: true, giftWrapFee: 250, giftMessage: 'Happy birthday' },
    items: [{ id: 'badam-500g', productId: 'badam', name: 'Royal Almonds', selectedWeight: '500g', quantity: 2, price: 1800, earnedPoints: 10 }],
    // Total includes persisted discount + wrapping, which must not be reconstructed from items.
    totals: { subtotal: 3600, discount: 420, discountedSubtotal: 3180, shipping: 250, giftWrapFee: 250, total: 3680 },
    earnedPoints: 20,
    deliverySchedule: { shippingMethodId: 'standard', scheduledDeliveryDate: '2026-10-05' } as any,
  };
}

function pendingEvent(order: CanonicalOrder, now = INITIAL_TIME): OutboxOrderEvent {
  return {
    eventId: `${order.orderId}_ORDER_CREATED_${now}`, orderId: order.orderId, eventType: 'ORDER_CREATED',
    schemaVersion: '2.0.0', occurredAt: new Date(now).toISOString(), occurredAtMs: now,
    deliveryState: 'PENDING', attempts: 0, nextAttemptAtMs: now,
    payload: { total: 1, customerName: 'stale event summary must not be dispatched' },
  };
}

function seeded(...orders: CanonicalOrder[]) {
  return memoryDatabase(Object.fromEntries(orders.flatMap(order => {
    const event = pendingEvent(order);
    return [[`orders/${order.orderId}`, order], [`orderEvents/${event.eventId}`, event]];
  })));
}

function worker(db: any, extras: Record<string, any> = {}) {
  return createOrderOutboxWorker({ getDb: () => db, getConfig: () => enabledConfig, now: () => INITIAL_TIME, ...extras });
}

function pendingStatus(order: CanonicalOrder): OutboxOrderEvent {
  return { ...pendingEvent(order), eventId: `${order.orderId}_STATUS_${INITIAL_TIME}`, eventType: 'ORDER_STATUS_CHANGED',
    payload: { order: { orderId: order.orderId, status: 'DISPATCHED', updatedAt: new Date(INITIAL_TIME).toISOString() }, private: 'never-sent' } };
}

test('status mirror uses a separate authenticated receiver and immutable revision with no customer data', async () => {
  const event = pendingStatus(savedOrder()); let captured: any;
  const result = await sendStatusToN8n(event, { config: statusConfig, now: () => INITIAL_TIME,
    fetchImpl: (async (url: string, init: any) => { captured = { url, ...init }; return { ok: true, status: 200,
      json: async () => ({ ok: true, orderId: event.orderId, eventId: event.eventId, statusRevision: event.payload.order.updatedAt, mirrorStored: true }) }; }) as any });
  assert.equal(result.status, 'SUCCESS'); assert.equal(captured.url, statusConfig.webhookUrl);
  assert.equal(captured.headers['X-AllBarka-Webhook-Secret'], statusConfig.webhookSecret);
  const payload = JSON.parse(captured.body);
  assert.equal(payload.event, 'ORDER_STATUS_CHANGED'); assert.equal(payload.eventId, event.eventId);
  assert.deepEqual(payload.order, event.payload.order);
  assert.doesNotMatch(captured.body, /customer|phone|address|claim|private|price|total/);
});

test('status ack must match event, order and revision and its body remains under the deadline', async () => {
  const event = pendingStatus(savedOrder());
  const ack = { ok: true, orderId: event.orderId, eventId: event.eventId, statusRevision: event.payload.order.updatedAt, mirrorStored: true };
  for (const invalid of [{ ...ack, eventId: 'older-event' }, { ...ack, statusRevision: 'older' }, { ...ack, mirrorStored: false }, {}]) {
    assert.equal((await sendStatusToN8n(event, { config: statusConfig, fetchImpl: (async () => ({ ok: true, status: 200, json: async () => invalid })) as any })).sent, false);
  }
  assert.equal((await sendStatusToN8n(event, { config: statusConfig, timeoutMs: 10,
    fetchImpl: (async () => ({ ok: true, status: 200, json: async () => new Promise(() => {}) })) as any })).status, 'TIMEOUT');
});

test('status events never enter creation receiver even when only creation dispatch is configured', async () => {
  const order = savedOrder(), event = pendingStatus(order);
  const store = memoryDatabase({ [`orders/${order.orderId}`]: order, [`orderEvents/${event.eventId}`]: event });
  let creationCalls = 0;
  assert.equal((await worker(store.db, { getStatusConfig: () => getN8nStatusDispatchConfig({}), dispatch: async () => { creationCalls++; return { sent: true, status: 'SUCCESS' }; } }).runOnce()).status, 'IDLE');
  assert.equal(creationCalls, 0); assert.equal(store.records.get(`orderEvents/${event.eventId}`).attempts, 0);
});

test('worker can dispatch status while creation integration is disabled, using captured event revision', async () => {
  const order = savedOrder(), event = pendingStatus(order);
  order.status = 'DELIVERED'; order.updatedAt = new Date(INITIAL_TIME + 1000).toISOString();
  const store = memoryDatabase({ [`orders/${order.orderId}`]: order, [`orderEvents/${event.eventId}`]: event });
  let captured: any;
  const instance = worker(store.db, { getConfig: () => getN8nOrderDispatchConfig({}), getStatusConfig: () => statusConfig,
    dispatch: async () => { throw new Error('wrong receiver'); }, dispatchStatus: async (value: any) => { captured = value; return { sent: true, status: 'SUCCESS' }; } });
  assert.equal((await instance.runOnce()).status, 'DELIVERED');
  assert.equal(captured.payload.order.status, 'DISPATCHED'); assert.equal(captured.payload.order.updatedAt, event.payload.order.updatedAt);
});

test('disabled status receiver cannot starve creation dispatch behind a full due page', async () => {
  const order = savedOrder(), creation = pendingEvent(order);
  const blocked = Array.from({ length: 30 }, (_, index) => {
    const event = pendingStatus(order);
    event.eventId = `blocked-status-${index}`;
    event.nextAttemptAtMs = INITIAL_TIME - 1000 + index;
    return [`orderEvents/${event.eventId}`, event];
  });
  const store = memoryDatabase(Object.fromEntries([
    [`orders/${order.orderId}`, order], [`orderEvents/${creation.eventId}`, creation], ...blocked,
  ]));
  let calls = 0;
  const result = await worker(store.db, { getStatusConfig: () => getN8nStatusDispatchConfig({}),
    dispatch: async () => { calls++; return { sent: true, status: 'SUCCESS' }; } }).runOnce();
  assert.equal(result.status, 'DELIVERED'); assert.equal(calls, 1);
  assert.equal(store.records.get('orderEvents/blocked-status-0').attempts, 0);
});

test('dispatch config requires HTTPS plus secret, rejects credential-bearing URLs and bounds timeout', () => {
  for (const url of ['', 'not-a-url', 'http://n8n.example.com/webhook/order', 'https://user:pass@n8n.example.com/order', 'https://n8n.example.com/order?secret=test', 'https://n8n.example.com/order#fragment']) {
    assert.equal(getN8nOrderDispatchConfig({ N8N_ORDER_WEBHOOK_URL: url, N8N_WEBHOOK_SECRET: 'test' }).enabled, false);
  }
  assert.equal(getN8nOrderDispatchConfig({ N8N_ORDER_WEBHOOK_URL: enabledConfig.webhookUrl }).enabled, false);
  assert.equal(getN8nOrderDispatchConfig({ N8N_ORDER_WEBHOOK_URL: enabledConfig.webhookUrl, N8N_WEBHOOK_SECRET: '  ' }).enabled, false);
  assert.equal(getN8nOrderDispatchConfig({ N8N_ORDER_TIMEOUT_MS: '999999' }).timeoutMs, 30000);
  assert.equal(getN8nOrderDispatchConfig({ N8N_ORDER_TIMEOUT_MS: 'NaN' }).timeoutMs, 5000);
});

test('canonical projection copies persisted totals and delivery, strips credentials and bounds hamper item ID', () => {
  const order = savedOrder();
  order.items[0] = {
    ...order.items[0], id: `custom-hamper:${'a'.repeat(500)}`, productId: 'custom-hamper',
    hamperConfiguration: { version: 1, boxId: 'box-tin', selections: ['pista', 'kaju', 'badam'], recipientName: 'Recipient', giftMessage: 'Thank you' },
  };
  const wire = projectCanonicalOrderForN8n(order);
  assert.deepEqual(wire.totals, { subtotal: 3600, discount: 420, shipping: 250, total: 3680 });
  assert.equal(wire.createdAt, order.createdAt);
  assert.equal(wire.status, order.status);
  assert.equal(wire.updatedAt, order.updatedAt);
  assert.equal(wire.items[0].id, 'custom-hamper');
  assert.deepEqual(wire.items[0].hamperConfiguration, order.items[0].hamperConfiguration);
  assert.equal(wire.delivery?.promisedDeliveryDate, '2026-10-05');
  assert.equal(wire.gifting?.giftWrapFee, 250);
  const serialized = JSON.stringify(wire);
  assert.doesNotMatch(serialized, /claimToken|private-hash|adminNote|actorUid|actorEmail|private@example|whatsappMessage/);
  assert.throws(() => projectCanonicalOrderForN8n({ ...order, totals: { ...order.totals, total: Infinity } }));
});

test('sender signs exact envelope, refreshes dispatch time and requires persisted-mirror acknowledgement', async () => {
  const order = projectCanonicalOrderForN8n(savedOrder());
  let captured: any;
  const result = await sendOrderToN8n(order, {
    config: enabledConfig, now: () => INITIAL_TIME,
    fetchImpl: (async (_url, options) => {
      captured = options;
      return { ok: true, status: 200, json: async () => ({ ok: true, orderId: order.orderId, mirrorStored: true, duplicate: true }) };
    }) as any,
  });
  assert.equal(result.status, 'SUCCESS');
  assert.equal(captured.redirect, 'error');
  assert.equal(captured.headers['X-AllBarka-Webhook-Secret'], enabledConfig.webhookSecret);
  assert.equal(captured.headers['X-N8n-Signature'], crypto.createHmac('sha256', enabledConfig.webhookSecret!).update(captured.body).digest('hex'));
  assert.equal(JSON.parse(captured.body).timestamp, new Date(INITIAL_TIME).toISOString());
  assert.equal(JSON.parse(captured.body).order.createdAt, order.createdAt);
  assert.equal(JSON.parse(captured.body).order.updatedAt, order.updatedAt);
  assert.equal(JSON.parse(captured.body).order.status, order.status);
});

test('sender rejects empty/HTML/malformed/mismatched acknowledgements and non-2xx without dispatch success', async () => {
  const order = projectCanonicalOrderForN8n(savedOrder());
  for (const ack of [null, {}, { ok: false, orderId: order.orderId, mirrorStored: true }, { ok: true, orderId: 'AB-20261003-FFFFFF', mirrorStored: true }, { ok: true, orderId: order.orderId }, { ok: true, orderId: order.orderId, mirrorStored: false }]) {
    const result = await sendOrderToN8n(order, { config: enabledConfig, fetchImpl: (async () => ({ ok: true, status: 200, json: async () => ack })) as any });
    assert.equal(result.status, 'FAILED'); assert.equal(result.sent, false);
  }
  const malformed = await sendOrderToN8n(order, { config: enabledConfig, fetchImpl: (async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('HTML response'); } })) as any });
  assert.equal(malformed.reason, 'ORDER_WEBHOOK_INVALID_ACK');
  const failure = await sendOrderToN8n(order, { config: enabledConfig, fetchImpl: (async () => ({ ok: false, status: 503 })) as any });
  assert.equal(failure.status, 'FAILED');
  let calls = 0;
  const disabled = await sendOrderToN8n(order, { config: getN8nOrderDispatchConfig({}), fetchImpl: (async () => { calls++; }) as any });
  assert.equal(disabled.status, 'DISABLED'); assert.equal(calls, 0);
});

test('sender deadline covers both stalled headers and stalled body even when transport ignores abort', async () => {
  const order = projectCanonicalOrderForN8n(savedOrder());
  for (const fetchImpl of [async () => new Promise(() => {}), async () => ({ ok: true, status: 200, json: async () => new Promise(() => {}) })]) {
    const started = Date.now();
    const result = await sendOrderToN8n(order, { config: enabledConfig, timeoutMs: 20, fetchImpl: fetchImpl as any });
    assert.equal(result.status, 'TIMEOUT'); assert.ok(Date.now() - started < 500);
  }
});

test('worker dispatches persisted snapshot only once and terminal event is not eligible again', async () => {
  const order = savedOrder();
  const store = seeded(order);
  let now = INITIAL_TIME;
  const sent: any[] = [];
  const instance = worker(store.db, { now: () => now, dispatch: async (wire: any) => { sent.push(wire); return { sent: true, status: 'SUCCESS' }; } });
  assert.equal((await instance.runOnce()).status, 'DELIVERED');
  now += 1000;
  assert.equal((await instance.runOnce()).status, 'IDLE');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].totals.total, order.totals.total);
  const event = store.records.get(`orderEvents/${pendingEvent(order).eventId}`);
  assert.equal(event.deliveryState, 'DELIVERED'); assert.equal(event.attempts, 1);
  assert.equal(event.nextAttemptAtMs, undefined); assert.equal(event.leaseToken, undefined);
});

test('global atomic lease serializes separate events across worker instances and in-process runs', async () => {
  const first = savedOrder(1), second = savedOrder(2);
  const store = seeded(first, second);
  let finish!: (value: any) => void;
  let entered!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const sent: string[] = [];
  const a = worker(store.db, { dispatch: async (order: any) => { sent.push(order.orderId); entered(); return new Promise(resolve => { finish = resolve; }); } });
  const b = worker(store.db, { dispatch: async (order: any) => { sent.push(order.orderId); return { sent: true, status: 'SUCCESS' }; } });
  const running = a.runOnce(); await enteredPromise;
  assert.equal((await a.runOnce()).status, 'BUSY');
  assert.equal((await b.runOnce()).status, 'BUSY');
  assert.deepEqual(sent, [first.orderId]);
  finish({ sent: true, status: 'SUCCESS' }); assert.equal((await running).status, 'DELIVERED');
  assert.equal((await b.runOnce()).status, 'DELIVERED'); assert.deepEqual(sent, [first.orderId, second.orderId]);
});

test('failure schedules bounded backoff, persists attempts and never rolls back canonical order', async () => {
  const order = savedOrder(); const store = seeded(order); let now = INITIAL_TIME; let calls = 0;
  const instance = worker(store.db, { now: () => now, dispatch: async () => { calls++; return { sent: false, status: 'FAILED', reason: 'ORDER_WEBHOOK_INVALID_ACK', statusCode: 200 }; } });
  for (let attempt = 1; attempt <= ORDER_OUTBOX_MAX_ATTEMPTS; attempt++) {
    const result = await instance.runOnce();
    assert.equal(result.status, attempt === ORDER_OUTBOX_MAX_ATTEMPTS ? 'FAILED' : 'RETRY_SCHEDULED');
    const event = store.records.get(`orderEvents/${pendingEvent(order).eventId}`);
    assert.equal(event.attempts, attempt);
    assert.deepEqual(store.records.get(`orders/${order.orderId}`), order);
    if (attempt < ORDER_OUTBOX_MAX_ATTEMPTS) {
      assert.equal(event.nextAttemptAtMs, now + orderOutboxBackoffMs(attempt));
      assert.equal((await instance.runOnce()).status, 'BUSY');
      now = event.nextAttemptAtMs;
    } else assert.equal(event.nextAttemptAtMs, undefined);
  }
  now += 60000; assert.equal((await instance.runOnce()).status, 'IDLE'); assert.equal(calls, ORDER_OUTBOX_MAX_ATTEMPTS);
  assert.equal(orderOutboxBackoffMs(1000), 900000);
});

test('a restarted process recovers an expired event/global lease and preserves original creation time', async () => {
  const order = savedOrder(); const event = pendingEvent(order);
  let now = INITIAL_TIME;
  const store = memoryDatabase({
    [`orders/${order.orderId}`]: order,
    [`orderEvents/${event.eventId}`]: { ...event, deliveryState: 'LEASED', attempts: 1, leaseOwner: 'crashed', leaseToken: 'old-token', leaseUntilMs: now + 50, nextAttemptAtMs: now + 50 },
    [ORDER_OUTBOX_LOCK_PATH]: { owner: 'crashed', token: 'old-global', leaseUntilMs: now + 50 },
  });
  let wire: any;
  const restarted = worker(store.db, { now: () => now, dispatch: async (order: any) => { wire = order; return { sent: true, status: 'SUCCESS' }; } });
  assert.equal((await restarted.runOnce()).status, 'BUSY'); now += 51;
  const result = await restarted.runOnce(); assert.equal(result.status, 'DELIVERED'); assert.equal(result.attempts, 2);
  assert.equal(wire.createdAt, order.createdAt);
});

test('token fencing prevents a late stale process from overwriting or releasing a replacement lease', async () => {
  const order = savedOrder(); const store = seeded(order); let now = INITIAL_TIME;
  let finish!: (value: any) => void; let entered!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const stale = worker(store.db, { now: () => now, dispatch: async () => { entered(); return new Promise(resolve => { finish = resolve; }); } });
  const replacement = worker(store.db, { now: () => now, dispatch: async () => ({ sent: true, status: 'SUCCESS' }) });
  const running = stale.runOnce(); await enteredPromise;
  now += 60001;
  assert.equal((await replacement.runOnce()).status, 'DELIVERED');
  const afterReplacement = clone(store.records.get(ORDER_OUTBOX_LOCK_PATH));
  finish({ sent: false, status: 'FAILED' }); assert.equal((await running).status, 'LEASE_LOST');
  assert.deepEqual(store.records.get(ORDER_OUTBOX_LOCK_PATH), afterReplacement);
  assert.equal(store.records.get(`orderEvents/${pendingEvent(order).eventId}`).deliveryState, 'DELIVERED');
});

test('historical disabled and non-ORDER_CREATED events are report-only and never automatically replayed', async () => {
  const order = savedOrder(); const disabled = { ...pendingEvent(order), deliveryState: 'DISABLED', disabledReason: 'LEGACY_DISABLED' };
  const statusEvent = { ...pendingEvent(savedOrder(2)), eventType: 'ORDER_STATUS_CHANGED' };
  const store = memoryDatabase({ [`orderEvents/${disabled.eventId}`]: disabled, [`orderEvents/${statusEvent.eventId}`]: statusEvent });
  let calls = 0;
  const instance = worker(store.db, { dispatch: async () => { calls++; return { sent: true, status: 'SUCCESS' }; } });
  assert.equal((await instance.runOnce()).status, 'IDLE'); assert.equal(calls, 0);
  assert.deepEqual(store.records.get(`orderEvents/${disabled.eventId}`), disabled);
  assert.deepEqual(store.records.get(`orderEvents/${statusEvent.eventId}`), statusEvent);
  const report = await inspectOrderOutbox(store.db);
  assert.equal(report.counts.DISABLED, 1); assert.equal(report.replayed, 0); assert.equal(report.review[0].reason, 'LEGACY_DISABLED');
});

test('worker quarantines missing or malformed canonical orders without dispatching stale event payload', async () => {
  for (const saved of [undefined, { ...savedOrder(), paymentMethod: 'untrusted' }]) {
    const order = savedOrder(), event = pendingEvent(order);
    const store = memoryDatabase({ [`orderEvents/${event.eventId}`]: event, ...(saved ? { [`orders/${order.orderId}`]: saved } : {}) });
    let calls = 0;
    const result = await worker(store.db, { dispatch: async () => { calls++; return { sent: true, status: 'SUCCESS' }; } }).runOnce();
    assert.equal(result.status, 'FAILED'); assert.equal(calls, 0);
    assert.equal(store.records.get(`orderEvents/${event.eventId}`).deliveryState, 'FAILED');
  }
});

test('worker remains inert without valid config/database and shutdown drains current dispatch', async () => {
  assert.equal((await worker(null).runOnce()).status, 'PERSISTENCE_UNAVAILABLE');
  assert.equal((await worker(null, { getConfig: () => getN8nOrderDispatchConfig({}) }).runOnce()).status, 'CONFIG_DISABLED');
  const order = savedOrder(); const store = seeded(order);
  let finish!: (value: any) => void; let entered!: () => void; let stopped = false;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const instance = worker(store.db, { dispatch: async () => { entered(); return new Promise(resolve => { finish = resolve; }); } });
  const running = instance.runOnce(); await enteredPromise;
  const stopping = instance.stop().then(() => { stopped = true; });
  await Promise.resolve(); assert.equal(stopped, false);
  finish({ sent: true, status: 'SUCCESS' }); await running; await stopping;
  assert.equal(stopped, true); assert.equal((await instance.runOnce()).status, 'STOPPED');
});

async function withNotificationEnvironment(env: Record<string, string | undefined>, operation: () => Promise<void>) {
  const keys = ['N8N_ORDER_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try { for (const key of keys) { if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key]; } await operation(); }
  finally { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } }
}

const checkoutPayload = { name: 'Test Customer', phone: '03001234567', address: 'Test Street, House 12', city: 'Karachi', paymentMethod: 'cod', shippingMethodId: 'standard', items: [{ productId: 'badam', id: 'badam', selectedWeight: '500g', quantity: 1 }] };

test('order transaction atomically creates eligible outbox only with valid config, duplicates create no second event', async () => {
  await withNotificationEnvironment({ N8N_ORDER_WEBHOOK_URL: enabledConfig.webhookUrl, N8N_WEBHOOK_SECRET: enabledConfig.webhookSecret }, async () => {
    const store = memoryDatabase();
    const first = await createDurableOrder({ db: store.db, payload: checkoutPayload, uid: null, idempotencyKey: 'outbox-creation' });
    const events = [...store.records.entries()].filter(([path]) => path.startsWith('orderEvents/'));
    assert.equal(events.length, 1); assert.equal(events[0][1].deliveryState, 'PENDING'); assert.equal(typeof events[0][1].nextAttemptAtMs, 'number');
    const duplicate = await createDurableOrder({ db: store.db, payload: checkoutPayload, uid: null, idempotencyKey: 'outbox-creation', expectedFinalTotal: first.totals.total + 10000 });
    assert.equal(duplicate.orderId, first.orderId); assert.equal(duplicate.isDuplicate, true);
    assert.equal([...store.records.keys()].filter(path => path.startsWith('orderEvents/')).length, 1);
    await assert.rejects(() => createDurableOrder({ db: store.db, payload: checkoutPayload, uid: 'another-session', idempotencyKey: 'outbox-creation' }), (error: any) => error.code === 'IDEMPOTENCY_OWNER_MISMATCH');
    // Cached response tampering cannot change the canonical duplicate receipt.
    const intent = store.records.get('checkoutIntents/outbox-creation'); intent.response.totals.total = 1;
    const verified = await createDurableOrder({ db: store.db, payload: checkoutPayload, uid: null, idempotencyKey: 'outbox-creation' });
    assert.equal(verified.totals.total, first.totals.total);
    store.records.delete(`orders/${first.orderId}`);
    await assert.rejects(() => createDurableOrder({ db: store.db, payload: checkoutPayload, uid: null, idempotencyKey: 'outbox-creation' }), PersistenceUnavailableError);
  });
  await withNotificationEnvironment({ N8N_ORDER_WEBHOOK_URL: 'http://n8n.example.com/insecure', N8N_WEBHOOK_SECRET: 'test' }, async () => {
    const store = memoryDatabase(); await createDurableOrder({ db: store.db, payload: checkoutPayload, uid: null, idempotencyKey: 'disabled-creation' });
    const event = [...store.records.entries()].find(([path]) => path.startsWith('orderEvents/'))![1];
    assert.equal(event.deliveryState, 'DISABLED'); assert.equal(event.nextAttemptAtMs, undefined);
  });
});

test('unsupported reward never silently consumes benefits or creates an order/outbox', async () => {
  const key = 'users/test-customer/activeRewards/reward-1';
  for (const rewardType of ['SAMPLE', 'PACKAGING', 'SHIPPING']) {
    const store = memoryDatabase({ [key]: { status: 'ACTIVE', rewardType } });
    await assert.rejects(() => createDurableOrder({ db: store.db, payload: { ...checkoutPayload, city: 'Lahore', rewardId: 'reward-1' }, uid: 'test-customer', idempotencyKey: 'unsupported-reward' }), (error: any) => error.code === 'REWARD_APPLICATION_UNAVAILABLE');
    assert.equal(store.records.get(key).status, 'ACTIVE'); assert.equal(store.records.size, 1);
  }
  const guest = memoryDatabase();
  await assert.rejects(() => createDurableOrder({ db: guest.db, payload: { ...checkoutPayload, rewardId: 'reward-1' }, uid: null }), (error: any) => error.code === 'REWARD_REQUIRES_AUTH');
  assert.equal(guest.records.size, 0);
});

test('outbox report CLI bounds its sample and exposes only aggregate safe metadata', () => {
  assert.deepEqual(parseOrderOutboxReportArgs([]), { limit: 100, help: false });
  assert.deepEqual(parseOrderOutboxReportArgs(['--limit', '1000']), { limit: 1000, help: false });
  assert.deepEqual(parseOrderOutboxReportArgs(['--limit=1']), { limit: 1, help: false });
  assert.equal(parseOrderOutboxReportArgs(['--help']).help, true);
  for (const args of [['--limit', '0'], ['--limit', '1001'], ['--limit', 'NaN'], ['--limit', '-1'], ['--limit', '1.5'], ['--replay'], ['--limit', '10', '--replay']]) {
    assert.throws(() => parseOrderOutboxReportArgs(args));
  }
  const report = summarizeOrderOutboxReport({
    scanned: 2, bounded: true, counts: { PENDING: 0, LEASED: 0, DELIVERED: 0, FAILED: 1, DISABLED: 1 }, replayed: 0,
    review: [
      { eventId: 'private-event-id', orderId: 'private-order-id', state: 'DISABLED', attempts: 0, reason: 'LEGACY_DISABLED' },
      { eventId: 'another-private-event', orderId: 'another-private-order', state: 'FAILED', attempts: 6, reason: 'https://endpoint.example?credential=private-value' },
    ],
  }, 2);
  assert.equal(report.mode, 'REPORT_ONLY'); assert.equal(report.sampleMayBeIncomplete, true);
  assert.deepEqual(report.sampledReviewReasonCounts, { LEGACY_DISABLED: 1, REVIEW_REQUIRED: 1 });
  assert.equal(report.dispatchesPerformed, 0); assert.equal(report.mutationsPerformed, 0); assert.equal(report.historicalDisabledEventsReplayed, 0);
  assert.doesNotMatch(JSON.stringify(report), /private-event|private-order|private-value|endpoint\.example|orderId|eventId/);
});
