import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import express from 'express';
import { once } from 'node:events';
import { createN8nCommerceRouter } from '../src/lib/n8nCommerceRouter';
import { getWhatsAppIntegrationConfig } from '../src/lib/whatsappCommerce';

const SECRET = 'offline-test-integration-secret-32-characters';
const CONFIG = getWhatsAppIntegrationConfig({ WHATSAPP_META_APP_SECRET: 'offline-test-meta-secret', WHATSAPP_BUSINESS_PHONE_ID: '1234567890', WHATSAPP_PARENT_VERIFIED: 'true' });
const PHONE = '923001234567';
const ORDER_ID = 'AB-20261003-ABC123';
const clone = (value: any) => value === undefined ? value : structuredClone(value);

function memoryDatabase(initial: Record<string, any> = {}) {
  const records = new Map<string, any>(Object.entries(clone(initial)));
  let tail = Promise.resolve();
  const field = (data: any, name: string) => name.split('.').reduce((value, part) => value?.[part], data);
  const ref = (path: string): any => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path), collection: (name: string) => collection(`${path}/${name}`) });
  const snapshot = (path: string): any => ({ exists: records.has(path), id: path.split('/').at(-1), ref: ref(path), data: () => clone(records.get(path)) });
  const collection = (path: string): any => {
    const query = (filters: any[] = [], order?: string, count = 1000): any => ({
      doc: (id: string) => ref(`${path}/${id}`), where: (name: string, op: string, value: any) => query([...filters, [name, op, value]], order, count),
      orderBy: (name: string) => query(filters, name, count), limit: (value: number) => query(filters, order, value),
      get: async () => ({ docs: [...records.entries()].filter(([key]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/'))
        .filter(([, data]) => filters.every(([name, op, value]) => field(data, name) !== undefined && (op === '==' ? field(data, name) === value : field(data, name) <= value)))
        .sort((a, b) => order ? field(a[1], order) - field(b[1], order) : 0).slice(0, count).map(([key]) => snapshot(key)) }),
    }); return query();
  };
  const db: any = { doc: ref, collection,
    runTransaction(callback: any) {
      const next = tail.then(async () => {
        const writes: any[] = [];
        const result = await callback({ get: async (document: any) => { assert.equal(writes.length, 0); return snapshot(document.path); },
          create: function(ref, data) { return this.set(ref, data); }, set: (document: any, data: any, options?: any) => writes.push(() => records.set(document.path, options?.merge ? { ...records.get(document.path), ...clone(data) } : clone(data))),
          update: (document: any, data: any) => writes.push(() => records.set(document.path, { ...records.get(document.path), ...clone(data) })),
        }); writes.forEach(write => write()); return result;
      }); tail = next.then(() => undefined, () => undefined); return next;
    },
  }; return { db, records };
}

function savedOrder() {
  const now = Date.now();
  return { schemaVersion: '2.0.0', source: 'website', orderId: ORDER_ID, status: 'PREPARING', paymentMethod: 'cod', paymentStatus: 'UNPAID',
    updatedAt: new Date(now).toISOString(), updatedAtMs: now, createdAt: new Date(now).toISOString(), createdAtMs: now,
    uid: null, earnedPoints: 0, claimTokenHash: 'private-claim-hash', adminNotes: ['Private admin note'],
    customer: { name: 'Fixture Customer', phone: '03001234567', address: 'Private address', city: 'Karachi' }, gifting: { giftWrapping: false, giftWrapFee: 0 },
    items: [{ name: 'Royal Almonds', selectedWeight: '500g', quantity: 1, price: 1000 }],
    totals: { subtotal: 1000, discount: 0, shipping: 250, giftWrapFee: 0, total: 1250 },
  };
}

function signedEnvelope(text = `Track my order ${ORDER_ID}`, id = 'wamid.fixture', sender = PHONE, statuses?: any[]) {
  const rawMetaBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: CONFIG.businessPhoneId }, ...(statuses ? { statuses } : { messages: [{ from: sender, id, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }] }),
  } }] }] });
  return { source: 'meta_parent', rawMetaBody, metaSignature: `sha256=${crypto.createHmac('sha256', CONFIG.appSecret).update(rawMetaBody).digest('hex')}` };
}

async function withRouter(options: any, run: (request: (path: string, body?: any, overrides?: RequestInit) => Promise<Response>) => Promise<void>) {
  const app = express();
  app.use('/api/integrations/n8n', createN8nCommerceRouter({ getIntegrationSecret: () => SECRET, metaConfig: CONFIG, ...options }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const { port } = server.address() as { port: number };
  const request = (path: string, body?: any, overrides: RequestInit = {}) => fetch(`http://127.0.0.1:${port}/api/integrations/n8n${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AllBarka-Integration-Secret': SECRET }, body: body === undefined ? undefined : JSON.stringify(body), ...overrides,
  });
  try { await run(request); } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

test('New order-update endpoint authenticates, rejects injected fields, and returns 200 without duplicate effects', async () => {
  const order = savedOrder(); order.uid = 'fixture-patron'; const store = memoryDatabase({ [`orders/${ORDER_ID}`]: order });
  await withRouter({ getDb: () => store.db }, async request => {
    const payload = { orderId: ORDER_ID, status: 'DELIVERED', trackingNumber: 'COURIER-123', estimatedDelivery: '2026-10-08',
      notes: 'Team note', updatedAt: new Date(Date.now() + 1000).toISOString(), eventId: 'sheet:http-contract-0001' };
    assert.equal((await request('/order-update', payload, { headers: { 'Content-Type': 'application/json' } })).status, 401);
    assert.equal((await request('/order-update', { ...payload, loyaltyPoints: 9999 })).status, 400);
    assert.equal((await request('/order-update', { ...payload, status: 'PAID' })).status, 400);
    const unknown = await request('/order-update', { ...payload, orderId: 'WHATSAPP-OUTSIDE-FIRESTORE' });
    assert.equal(unknown.status, 200); assert.equal((await unknown.json()).ignored, true);
    const first = await request('/order-update', payload); assert.equal(first.status, 200); assert.equal((await first.json()).duplicate, false);
    const before = [...store.records.entries()]; const duplicate = await request('/order-update', payload);
    assert.equal(duplicate.status, 200); assert.equal((await duplicate.json()).duplicate, true); assert.deepEqual([...store.records.entries()], before);
    assert.equal(store.records.get(`orders/${ORDER_ID}`).status, 'DELIVERED'); assert.equal(store.records.get('users/fixture-patron').loyaltyPoints, 12);
    assert.ok(store.records.has(`pointsLedger/${ORDER_ID}`));
  });
});

test('forged or missing integration auth cannot touch Firestore or rely on a customer/admin bearer', async () => {
  let reads = 0;
  await withRouter({ getDb: () => { reads++; throw new Error('must not reach database'); } }, async request => {
    for (const headers of [{ 'Content-Type': 'application/json' }, { 'Content-Type': 'application/json', Authorization: 'Bearer customer-token' }, { 'Content-Type': 'application/json', 'X-AllBarka-Integration-Secret': `${SECRET}wrong` }]) {
      const response = await request('/whatsapp/notifications/claim', { source: 'meta_parent' }, { headers });
      assert.equal(response.status, 401); assert.equal((await response.json()).code, 'INTEGRATION_AUTH_REQUIRED');
    }
    assert.equal(reads, 0);
  });
});

test('missing integration configuration returns503 without claiming live connectivity', async () => {
  await withRouter({ getIntegrationSecret: () => undefined, getDb: () => assert.fail('No database access') }, async request => {
    const response = await request('/order-status', {}); assert.equal(response.status, 503); assert.equal((await response.json()).code, 'INTEGRATION_UNAVAILABLE');
  });
});

test('router rejects foreign sources, extra mutable fields, non-JSON, public phone lookup and GET', async () => {
  await withRouter({ getDb: () => assert.fail('Invalid payload must not access database') }, async request => {
    for (const [path, body, status] of [
      ['/whatsapp/receipt', { source: 'website', messageId: 'a' }, 403],
      ['/whatsapp/receipt', { source: 'meta_parent', messageId: 'a', phone: PHONE }, 400],
      ['/whatsapp/inbound', { source: 'meta_parent', rawMetaBody: '{}', metaSignature: 'fake', signatureVerified: true }, 400],
      ['/whatsapp/notifications/result', { source: 'meta_parent', jobId: 'a', leaseToken: 'b', outcome: 'DELIVERED', customer: { phone: PHONE } }, 400],
      ['/order-status', { source: 'google_sheet', eventId: 'sheet:a', orderId: ORDER_ID, status: 'DISPATCHED', expectedStatus: 'PREPARING', expectedUpdatedAt: 'x', reason: 'Owner adjustment', total: 1 }, 400],
    ] as const) assert.equal((await request(path, body)).status, status);
    assert.equal((await request('/whatsapp/receipt', undefined, { method: 'GET' })).status, 404);
    assert.equal((await request('/whatsapp/phone', { source: 'meta_parent', phone: PHONE })).status, 404);
    assert.equal((await request('/whatsapp/notifications/claim', undefined, { headers: { 'X-AllBarka-Integration-Secret': SECRET, 'Content-Type': 'text/plain' }, body: 'hello' })).status, 415);
  });
});

test('invalid JSON and oversized payloads produce safe errors with no echoed body', async () => {
  await withRouter({ getDb: () => null }, async request => {
    const malformed = await request('/whatsapp/inbound', undefined, { body: '{"private":"bad' });
    assert.equal(malformed.status, 400); assert.doesNotMatch(await malformed.text(), /private|SyntaxError|stack/);
    const oversized = await request('/whatsapp/inbound', { private: 'x'.repeat(130 * 1024) });
    assert.equal(oversized.status, 413); assert.equal((await oversized.json()).code, 'INTEGRATION_PAYLOAD_TOO_LARGE');
  });
});

test('all WhatsApp routes fail closed until inspected Meta parent/config is enabled', async () => {
  await withRouter({ getDb: () => memoryDatabase().db, metaConfig: { ...CONFIG, enabled: false, disabledReason: 'META_PARENT_NOT_VERIFIED' } }, async request => {
    for (const [path, body] of [
      ['/whatsapp/inbound', signedEnvelope()], ['/whatsapp/receipt', { source: 'meta_parent', messageId: 'a' }],
      ['/whatsapp/notifications/claim', { source: 'meta_parent' }], ['/whatsapp/notifications/authorize', { source: 'meta_parent', jobId: 'a', leaseToken: 'b' }],
      ['/whatsapp/notifications/result', { source: 'meta_parent', jobId: 'a', leaseToken: 'b', outcome: 'UNKNOWN' }],
    ] as const) {
      const response = await request(path, body); assert.equal(response.status, 503); assert.equal((await response.json()).code, 'META_PARENT_NOT_VERIFIED');
    }
  });
});

test('missing or failed Firestore returns genuine503/500 without fabricating saved orders or exposing errors', async () => {
  await withRouter({ getDb: () => null }, async request => {
    const response = await request('/whatsapp/inbound', signedEnvelope()); assert.equal(response.status, 503); assert.equal((await response.json()).code, 'PERSISTENCE_UNAVAILABLE');
  });
  await withRouter({ getDb: () => { throw new Error('PRIVATE_KEY=do-not-output customer=private'); } }, async request => {
    const response = await request('/whatsapp/inbound', signedEnvelope()); assert.equal(response.status, 500); assert.doesNotMatch(await response.text(), /PRIVATE_KEY|do-not-output|customer/);
  });
});

test('Sheet endpoint delegates exact command only; conflicts expose canonical status/revision and no private fields', async () => {
  const body = { source: 'google_sheet', eventId: 'sheet:fixture', orderId: ORDER_ID, status: 'DISPATCHED', expectedStatus: 'PREPARING', expectedUpdatedAt: '2026-10-03T10:00:00.000Z', reason: 'Owner status change' };
  let applied: any;
  await withRouter({ getDb: () => memoryDatabase().db, statusService: { validate: (raw: any) => raw, apply: async (input: any) => { applied = input.command; return { ok: true, orderId: ORDER_ID, status: 'DISPATCHED', duplicate: false }; } } }, async request => {
    const response = await request('/order-status', body); assert.equal(response.status, 200); assert.deepEqual(applied, body);
    assert.equal((await response.json()).status, 'DISPATCHED');
  });
  await withRouter({ getDb: () => memoryDatabase().db, statusService: { validate: (raw: any) => raw, apply: async () => { throw Object.assign(new Error('private internal detail'), { name: 'SheetStatusError', code: 'ORDER_CONFLICT', statusCode: 409, canonical: { status: 'CONFIRMED', updatedAt: '2026-10-03T10:00:01.000Z', phone: PHONE } }); } } }, async request => {
    const response = await request('/order-status', body); assert.equal(response.status, 409);
    const result = await response.json(); assert.deepEqual(result.canonical, { status: 'CONFIRMED', updatedAt: '2026-10-03T10:00:01.000Z' });
    assert.doesNotMatch(JSON.stringify(result), /private|923001234567/);
  });
});

test('signed inbound first-message tracking is durable, replay-safe, and current own-phone receipt cannot be overridden', async () => {
  const store = memoryDatabase({ [`orders/${ORDER_ID}`]: savedOrder() });
  await withRouter({ getDb: () => store.db }, async request => {
    const envelope = signedEnvelope();
    const forged = await request('/whatsapp/inbound', { ...envelope, rawMetaBody: envelope.rawMetaBody.replace(PHONE, '923119999999') });
    assert.equal(forged.status, 401); assert.equal((await forged.json()).code, 'META_SIGNATURE_INVALID');
    const inbound = await request('/whatsapp/inbound', envelope); assert.equal(inbound.status, 200); assert.equal((await inbound.json()).receiptsQueued, 1);
    assert.equal((await (await request('/whatsapp/inbound', envelope)).json()).duplicates, 1);
    const receipt = await request('/whatsapp/receipt', { source: 'meta_parent', messageId: 'wamid.fixture' });
    const saved = await receipt.json(); assert.equal(saved.replyType, 'RECEIPT'); assert.match(saved.text, /Rs\. 1,250/);
    assert.doesNotMatch(JSON.stringify(saved), /private-claim|Private address|Private admin/);
    await request('/whatsapp/inbound', signedEnvelope(undefined, 'wamid.other', '923119999999'));
    const denied = await (await request('/whatsapp/receipt', { source: 'meta_parent', messageId: 'wamid.other' })).json();
    assert.equal(denied.replyType, 'NOT_FOUND'); assert.doesNotMatch(denied.text, /Almonds|1,250/);
  });
});

test('real Sheet HTTP transaction accepts exact statuses, ignores matching state, rejects rebound requests and assigns actor server-side', async () => {
  const saved = savedOrder(), store = memoryDatabase({ [`orders/${ORDER_ID}`]: saved });
  await withRouter({ getDb: () => store.db }, async request => {
    const command = { source: 'google_sheet', eventId: 'sheet:request-00000001', orderId: ORDER_ID, status: 'DISPATCHED', expectedStatus: 'PREPARING', expectedUpdatedAt: saved.updatedAt, reason: 'Owner dispatch change' };
    const response = await request('/order-status', command); assert.equal(response.status, 200);
    const applied = await response.json(); assert.equal(applied.status, 'DISPATCHED'); assert.equal(applied.duplicate, false);
    assert.equal(store.records.get(`orders/${ORDER_ID}`).status, 'DISPATCHED');
    const audit = [...store.records.entries()].find(([key]) => key.startsWith('orderAudits/'))![1];
    assert.equal(audit.actorUid, 'n8n_sheet');
    const duplicate = await (await request('/order-status', command)).json(); assert.equal(duplicate.duplicate, true); assert.equal(duplicate.updatedAt, applied.updatedAt);
    assert.equal([...store.records.keys()].filter(key => key.startsWith('orderAudits/')).length, 1);
    assert.equal([...store.records.keys()].filter(key => key.startsWith('whatsappNotificationJobs/')).length, 1);
    const stale = await request('/order-status', { ...command, eventId: 'sheet:request-00000002' });
    assert.equal(stale.status, 200); const staleBody = await stale.json(); assert.equal(staleBody.ignored, true); assert.equal(staleBody.updatedAt, applied.updatedAt);
    const rebound = await request('/order-status', { ...command, status: 'CONFIRMED' });
    assert.equal(rebound.status, 409); assert.equal((await rebound.json()).code, 'INTEGRATION_EVENT_CONFLICT');
    assert.equal((await request('/order-status', { ...command, eventId: 'sheet:request-00000003', status: 'UNKNOWN' })).status, 400);
    assert.equal((await request('/order-status', { ...command, actorUid: 'owner-from-body' })).status, 400);
  });
});

test('HTTP claim→authorize→provider result requires ID and signed delivery evidence before delivered', async () => {
  const store = memoryDatabase({ [`orders/${ORDER_ID}`]: savedOrder() });
  await withRouter({ getDb: () => store.db }, async request => {
    await request('/whatsapp/inbound', signedEnvelope());
    const claim = await (await request('/whatsapp/notifications/claim', { source: 'meta_parent' })).json();
    assert.ok(claim.jobId); assert.equal(claim.to, undefined);
    const correlation = { source: 'meta_parent', jobId: claim.jobId, leaseToken: claim.leaseToken };
    const authorization = await (await request('/whatsapp/notifications/authorize', correlation)).json();
    assert.equal(authorization.to, PHONE); assert.match(authorization.text, /Payment not recorded as received/);
    assert.equal((await request('/whatsapp/notifications/result', { ...correlation, outcome: 'ACCEPTED' })).status, 400);
    const accepted = await (await request('/whatsapp/notifications/result', { ...correlation, outcome: 'ACCEPTED', providerMessageId: 'wamid.provider-id' })).json();
    assert.equal(accepted.state, 'ACCEPTED');
    const evidence = signedEnvelope('', '', PHONE, [{ id: 'wamid.provider-id', recipient_id: PHONE, timestamp: String(Math.floor(Date.now() / 1000)), status: 'delivered' }]);
    assert.equal((await (await request('/whatsapp/inbound', evidence)).json()).deliveryEvidenceRecorded, 1);
    assert.equal(store.records.get(`whatsappNotificationJobs/${claim.jobId}`).state, 'DELIVERED');
    assert.equal((await (await request('/whatsapp/notifications/claim', { source: 'meta_parent' })).json()).idle, true);
  });
});

test('STOP arriving after a HTTP claim blocks its subsequent actual-send authorization', async () => {
  const store = memoryDatabase({ [`orders/${ORDER_ID}`]: savedOrder() });
  await withRouter({ getDb: () => store.db }, async request => {
    await request('/whatsapp/inbound', signedEnvelope());
    const claim = await (await request('/whatsapp/notifications/claim', { source: 'meta_parent' })).json();
    await request('/whatsapp/inbound', signedEnvelope('STOP', 'wamid.stop'));
    const blocked = await request('/whatsapp/notifications/authorize', { source: 'meta_parent', jobId: claim.jobId, leaseToken: claim.leaseToken });
    assert.equal(blocked.status, 409); assert.equal((await blocked.json()).code, 'CUSTOMER_OPTED_OUT');
  });
});

test('IP limit caps forged integration requests at60perminute without database access', async () => {
  await withRouter({ getDb: () => assert.fail('No database access') }, async request => {
    const headers = { 'Content-Type': 'application/json', 'X-AllBarka-Integration-Secret': 'forged' };
    for (let index = 0; index < 60; index++) assert.equal((await request('/whatsapp/notifications/claim', { source: 'meta_parent' }, { headers })).status, 401);
    const blocked = await request('/whatsapp/notifications/claim', { source: 'meta_parent' }, { headers });
    assert.equal(blocked.status, 429); assert.equal((await blocked.json()).code, 'INTEGRATION_RATE_LIMITED');
  });
});
