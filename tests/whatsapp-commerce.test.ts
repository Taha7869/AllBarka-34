import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import {
  getWhatsAppIntegrationConfig, normalizeWhatsAppPhone, verifyMetaEnvelope, ingestMetaWebhook,
  buildWhatsAppPhoneIndex, buildWhatsAppStatusNotification, getWhatsAppReceiptForMessage,
  claimWhatsAppNotification, authorizeWhatsAppSend, completeWhatsAppSend, whatsappDocumentKey,
  extractTrackingOrderId,
  WHATSAPP_WINDOW_MS, WHATSAPP_WINDOW_MARGIN_MS, WHATSAPP_SEND_LEASE_MS,
} from '../src/lib/whatsappCommerce';
import type { CanonicalOrder } from '../src/lib/serverOrderService';

const TIME = Date.parse('2026-10-03T10:00:00Z');
const CONFIG = getWhatsAppIntegrationConfig({ WHATSAPP_META_APP_SECRET: 'test-only-meta-app-secret', WHATSAPP_BUSINESS_PHONE_ID: '1234567890', WHATSAPP_PARENT_VERIFIED: 'true' });
const PHONE = '923001234567';
const clone = <T>(value: T): T => value === undefined ? value : structuredClone(value);

function memoryDatabase(initial: Record<string, any> = {}) {
  const records = new Map(Object.entries(clone(initial)));
  let tail = Promise.resolve();
  const ref = (path: string): any => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path), collection: (name: string) => collection(`${path}/${name}`) });
  const snapshot = (path: string): any => ({ exists: records.has(path), id: path.split('/').at(-1), ref: ref(path), data: () => clone(records.get(path)) });
  const readField = (data: any, field: string) => field.split('.').reduce((value, part) => value?.[part], data);
  const collection = (path: string): any => {
    const query = (filters: Array<[string, string, any]> = [], order?: string, count = 1000): any => ({
      doc: (id: string) => ref(`${path}/${id}`),
      where: (field: string, op: string, value: any) => query([...filters, [field, op, value]], order, count),
      orderBy: (field: string) => query(filters, field, count), limit: (value: number) => query(filters, order, value),
      get: async () => {
        const docs = [...records.entries()].filter(([key]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/'))
          .filter(([, data]) => filters.every(([field, op, value]) => readField(data, field) !== undefined && (op === '==' ? readField(data, field) === value : readField(data, field) <= value)))
          .sort((a, b) => order ? readField(a[1], order) - readField(b[1], order) : 0).slice(0, count).map(([key]) => snapshot(key));
        return { docs, size: docs.length };
      },
    });
    return query();
  };
  const db: any = { collection, doc: ref,
    runTransaction(callback: any) {
      const next = tail.then(async () => {
        const writes: Array<() => void> = [];
        const result = await callback({
          get: async (document: any) => { assert.equal(writes.length, 0, 'Firestore reads must precede writes'); return snapshot(document.path); },
          create: function(ref, data) { return this.set(ref, data); }, set: (document: any, data: any, options?: any) => writes.push(() => records.set(document.path, options?.merge ? { ...records.get(document.path), ...clone(data) } : clone(data))),
        });
        writes.forEach(write => write()); return result;
      });
      tail = next.then(() => undefined, () => undefined); return next;
    },
  };
  return { db, records };
}

function order(id = 'AB-20261003-000001', phone = '03001234567'): CanonicalOrder {
  return {
    schemaVersion: '2.0.0', orderId: id, source: 'website', createdAt: new Date(TIME).toISOString(), createdAtMs: TIME,
    updatedAt: new Date(TIME).toISOString(), updatedAtMs: TIME, status: 'PREPARING', paymentStatus: 'UNPAID', paymentMethod: 'bank', uid: 'private-account',
    claimTokenHash: 'must-not-leak', customer: { name: 'Test Person', phone, address: 'Private address', city: 'Karachi' }, gifting: { giftWrapping: false, giftWrapFee: 0 },
    items: [{ id: 'badam', productId: 'badam', name: 'Royal Almonds', selectedWeight: '500g', quantity: 2, price: 1800, earnedPoints: 10 }],
    totals: { subtotal: 3600, discount: 100, discountedSubtotal: 3500, shipping: 250, giftWrapFee: 0, total: 3750 }, earnedPoints: 20,
    adminNotes: ['private staff note'],
  };
}

function envelope(text = 'Track my order AB-20261003-000001', extras: { id?: string; sender?: string; timestamp?: number; phoneId?: string; statuses?: any[] } = {}) {
  const rawMetaBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: extras.phoneId || CONFIG.businessPhoneId },
    ...(extras.statuses ? { statuses: extras.statuses } : { messages: [{ id: extras.id || 'wamid.inbound-1', from: extras.sender || PHONE, timestamp: String(Math.floor((extras.timestamp ?? TIME) / 1000)), type: 'text', text: { body: text } }] }),
  } }] }] });
  return { source: 'meta_parent', rawMetaBody, metaSignature: `sha256=${crypto.createHmac('sha256', CONFIG.appSecret).update(rawMetaBody).digest('hex')}` };
}

const options = (now: () => number = () => TIME) => ({ now, config: CONFIG });
const windowKey = `whatsappWindows/${whatsappDocumentKey(`whatsapp-phone:${PHONE}`)}`;
async function ingest(store: ReturnType<typeof memoryDatabase>, text?: string, extras?: Parameters<typeof envelope>[1], now: () => number = () => TIME) {
  return ingestMetaWebhook(store.db, envelope(text, extras), CONFIG, { now });
}

test('integration stays gated until actual parent evidence is confirmed and signature configuration exists', () => {
  assert.equal(CONFIG.enabled, true);
  assert.equal(getWhatsAppIntegrationConfig({}).enabled, false);
  assert.equal(getWhatsAppIntegrationConfig({ WHATSAPP_META_APP_SECRET: CONFIG.appSecret, WHATSAPP_BUSINESS_PHONE_ID: CONFIG.businessPhoneId }).disabledReason, 'META_PARENT_NOT_VERIFIED');
  assert.throws(() => verifyMetaEnvelope(envelope(), getWhatsAppIntegrationConfig({}), TIME), (error: any) => error.statusCode === 503);
});

test('phone normalization matches Pakistani checkout formats but rejects arbitrary input and impossible E164 values', () => {
  for (const phone of ['0300 1234567', '+923001234567', '00923001234567', '923001234567']) assert.equal(normalizeWhatsAppPhone(phone), PHONE);
  for (const phone of [null, 923001234567, 'phone:923001234567', '123', '00000000', '1234567890123456']) assert.equal(normalizeWhatsAppPhone(phone), null);
});

test('original Meta signature and configured business phone are required; normalized proof booleans cannot authorize', () => {
  assert.equal(verifyMetaEnvelope(envelope(), CONFIG, TIME).messages[0].sender, PHONE);
  assert.equal(verifyMetaEnvelope(envelope(undefined, { id: 'wamid.HBg/+TQ==' }), CONFIG, TIME).messages[0].messageId, 'wamid.HBg/+TQ==');
  assert.throws(() => verifyMetaEnvelope({ source: 'meta_parent', signatureVerified: true, sender: PHONE }, CONFIG, TIME));
  assert.throws(() => verifyMetaEnvelope({ ...envelope(), rawMetaBody: envelope().rawMetaBody.replace(PHONE, '923119999999') }, CONFIG, TIME), (error: any) => error.code === 'META_SIGNATURE_INVALID');
  assert.throws(() => verifyMetaEnvelope(envelope(undefined, { phoneId: '9999999999' }), CONFIG, TIME), (error: any) => error.code === 'META_BUSINESS_PHONE_MISMATCH');
  assert.throws(() => verifyMetaEnvelope(envelope(undefined, { timestamp: TIME + 31000 }), CONFIG, TIME), (error: any) => error.code === 'META_TIMESTAMP_IN_FUTURE');
});

test('durable message dedup preserves the provider timestamp on replay and rejects message ID rebinding', async () => {
  const store = memoryDatabase();
  const first = await ingest(store);
  assert.equal(first.processed, 1); assert.equal(first.receiptsQueued, 1);
  const replay = await ingest(store, undefined, undefined, () => TIME + WHATSAPP_WINDOW_MS + 1);
  assert.equal(replay.duplicates, 1); assert.equal(replay.receiptsQueued, 0);
  assert.equal(store.records.get(windowKey).lastCustomerMessageAtMs, TIME);
  await assert.rejects(() => ingest(store, undefined, { sender: '923119999999' }), (error: any) => error.code === 'META_MESSAGE_ID_CONFLICT');
});

test('out-of-order inbound time cannot move window backwards, and future skew never extends it past processing time', async () => {
  const store = memoryDatabase(); await ingest(store);
  await ingest(store, 'hello', { id: 'wamid.old', timestamp: TIME - 3600000 });
  assert.equal(store.records.get(windowKey).lastCustomerMessageAtMs, TIME);
  await ingest(store, 'hello', { id: 'wamid.skew', timestamp: TIME + 10000 });
  assert.equal(store.records.get(windowKey).lastCustomerMessageAtMs, TIME);
});

test('STOP is durable; unrelated messages do not opt back in; explicit newer START does', async () => {
  const store = memoryDatabase(); await ingest(store, 'STOP');
  assert.equal(store.records.get(windowKey).optedOut, true);
  await ingest(store, 'hello', { id: 'wamid.hello', timestamp: TIME + 1000 }, () => TIME + 1000);
  assert.equal(store.records.get(windowKey).optedOut, true);
  assert.equal((await getWhatsAppReceiptForMessage(store.db, 'wamid.hello', CONFIG)).replyType, 'OPTED_OUT');
  await ingest(store, 'START', { id: 'wamid.start', timestamp: TIME + 2000 }, () => TIME + 2000);
  assert.equal(store.records.get(windowKey).optedOut, false);
  await ingest(store, 'STOP', { id: 'wamid.old-stop', timestamp: TIME - 1000 }, () => TIME + 2000);
  assert.equal(store.records.get(windowKey).optedOut, false);
});

test('a same-second START cannot clear STOP and general conversation does not enqueue a duplicate receipt', async () => {
  const store = memoryDatabase();
  await ingest(store, 'hello, how are you?');
  assert.equal([...store.records.keys()].filter(key => key.startsWith('whatsappNotificationJobs/')).length, 0);
  assert.equal(store.records.get(windowKey).lastCustomerMessageAtMs, TIME);
  await ingest(store, 'STOP', { id: 'wamid.stop' });
  await ingest(store, 'START', { id: 'wamid.same-second-start' });
  assert.equal(store.records.get(windowKey).optedOut, true);
  await ingest(store, 'START', { id: 'wamid.later-start', timestamp: TIME + 1000 }, () => TIME + 1000);
  assert.equal(store.records.get(windowKey).optedOut, false);
});

test('tolerated provider clock-skew replay deduplicates without changing the original bounded window', async () => {
  const store = memoryDatabase();
  await ingest(store, 'Track my orders', { timestamp: TIME + 10000 });
  assert.equal(store.records.get(windowKey).lastCustomerMessageAtMs, TIME);
  const replay = await ingest(store, 'Track my orders', { timestamp: TIME + 10000 }, () => TIME + 20000);
  assert.equal(replay.duplicates, 1); assert.equal(store.records.get(windowKey).lastCustomerMessageAtMs, TIME);
});

test('first authenticated tracking message finds saved receipt, ID alone never grants access, private fields are stripped', async () => {
  const saved = order(), store = memoryDatabase({ [`orders/${saved.orderId}`]: saved }); await ingest(store);
  const receipt = await getWhatsAppReceiptForMessage(store.db, 'wamid.inbound-1', CONFIG);
  assert.equal(receipt.replyType, 'RECEIPT'); assert.match(receipt.text, /Rs\. 3,750/); assert.match(receipt.text, /PREPARING/);
  assert.match(receipt.text, /Payment not recorded as received/);
  assert.doesNotMatch(JSON.stringify(receipt), /must-not-leak|private-account|Private address|private staff/);
  await assert.rejects(() => getWhatsAppReceiptForMessage(store.db, 'unverified-message', CONFIG), (error: any) => error.code === 'AUTHENTICATED_MESSAGE_REQUIRED');
  await ingest(store, undefined, { id: 'wamid.other-phone', sender: '923119999999' });
  const denied = await getWhatsAppReceiptForMessage(store.db, 'wamid.other-phone', CONFIG);
  assert.equal(denied.replyType, 'NOT_FOUND'); assert.doesNotMatch(denied.text, /3750|3,750|Royal Almonds|PREPARING/);
  await assert.rejects(() => getWhatsAppReceiptForMessage(store.db, 'wamid.inbound-1', { ...CONFIG, businessPhoneId: '9999999999' }), (error: any) => error.code === 'AUTHENTICATED_MESSAGE_REQUIRED');
});

test('embedded order IDs are recognized and multiple choices contain only same-phone saved orders including pre-index records', async () => {
  const a = order(), b = order('AB-20261003-000002'), other = order('AB-20261003-000003', '03119999999');
  const store = memoryDatabase(Object.fromEntries([a, b, other].map(saved => [`orders/${saved.orderId}`, saved])));
  await ingest(store, 'Track my orders');
  const choices = await getWhatsAppReceiptForMessage(store.db, 'wamid.inbound-1', CONFIG);
  assert.equal(choices.replyType, 'CHOICES'); assert.deepEqual(choices.orderIds.sort(), [a.orderId, b.orderId]);
  assert.doesNotMatch(choices.text, new RegExp(other.orderId));
  await ingest(store, `Can you please Track my order ${b.orderId} thank you`, { id: 'wamid.embedded' });
  const receipt = await getWhatsAppReceiptForMessage(store.db, 'wamid.embedded', CONFIG);
  assert.equal(receipt.replyType, 'RECEIPT'); assert.deepEqual(receipt.orderIds, [b.orderId]);
  assert.equal(buildWhatsAppPhoneIndex(a).phoneKey, windowKey.split('/')[1]);
});

test('multiple distinct embedded IDs request one choice without selecting the first or exposing another phone’s receipt', async () => {
  const owned = order(), other = order('AB-20261003-000002', '03119999999');
  const text = `${owned.orderId} and ${other.orderId}`;
  assert.equal(extractTrackingOrderId(text), null);
  assert.equal(extractTrackingOrderId(`${owned.orderId} ${owned.orderId.toLowerCase()}`), owned.orderId);
  const store = memoryDatabase({ [`orders/${owned.orderId}`]: owned, [`orders/${other.orderId}`]: other });
  assert.equal((await ingest(store, text)).receiptsQueued, 1);
  const response = await getWhatsAppReceiptForMessage(store.db, 'wamid.inbound-1', CONFIG);
  assert.equal(response.replyType, 'CHOICES'); assert.deepEqual(response.orderIds, []);
  assert.match(response.text, /one saved order ID/); assert.doesNotMatch(response.text, /Almonds|3,750|PREPARING/);
  const claim: any = await claimWhatsAppNotification(store.db, options());
  const authorization = await authorizeWhatsAppSend(store.db, claim, options());
  assert.equal(authorization.revision, null); assert.match(authorization.eventId, /^receipt:/);
  assert.equal(authorization.text, response.text);
});

test('outside the window status is held, stale revisions coalesce, and the next customer request returns latest status only', async () => {
  const saved = order(), notification = buildWhatsAppStatusNotification(saved, 'status:event-1', TIME);
  const store = memoryDatabase({ [`orders/${saved.orderId}`]: saved, [`whatsappNotificationJobs/${notification.id}`]: notification.data });
  assert.equal((await claimWhatsAppNotification(store.db, options()) as any).idle, true);
  assert.equal(store.records.get(`whatsappNotificationJobs/${notification.id}`).state, 'HELD');
  const latest = { ...saved, status: 'DISPATCHED', updatedAt: new Date(TIME + 1).toISOString() } as CanonicalOrder;
  store.records.set(`orders/${saved.orderId}`, latest);
  const stale = buildWhatsAppStatusNotification(saved, 'status:event-old', TIME);
  store.records.set(`whatsappNotificationJobs/${stale.id}`, stale.data);
  await ingest(store);
  const claim: any = await claimWhatsAppNotification(store.db, options());
  assert.equal(store.records.get(`whatsappNotificationJobs/${stale.id}`).state, 'COALESCED');
  const wire = await authorizeWhatsAppSend(store.db, claim, options());
  assert.match(wire.text, /DISPATCHED/); assert.doesNotMatch(wire.text, /PREPARING/);
});

test('send authorization is single use and checks STOP again after a claim', async () => {
  const saved = order(), store = memoryDatabase({ [`orders/${saved.orderId}`]: saved }); await ingest(store);
  const claim: any = await claimWhatsAppNotification(store.db, options());
  await ingest(store, 'STOP', { id: 'wamid.stop' });
  await assert.rejects(() => authorizeWhatsAppSend(store.db, claim, options()), (error: any) => error.code === 'CUSTOMER_OPTED_OUT');
  assert.equal(store.records.get(`whatsappNotificationJobs/${claim.jobId}`).state, 'OPTED_OUT');
});

test('expired windows and margin block sends even with an earlier valid lease', async () => {
  const saved = order(), store = memoryDatabase({ [`orders/${saved.orderId}`]: saved }); await ingest(store);
  let now = TIME + WHATSAPP_WINDOW_MS - WHATSAPP_WINDOW_MARGIN_MS - 1;
  const claim: any = await claimWhatsAppNotification(store.db, options(() => now));
  assert.equal(claim.idle, undefined); now++;
  await assert.rejects(() => authorizeWhatsAppSend(store.db, claim, options(() => now)), (error: any) => error.code === 'CUSTOMER_WINDOW_CLOSED');
  assert.equal(store.records.get(`whatsappNotificationJobs/${claim.jobId}`).state, 'HELD');
});

test('status revision and phone ownership are checked immediately before send, not only while enqueuing', async () => {
  for (const mutation of [{ updatedAt: new Date(TIME + 1).toISOString() }, { customer: { ...order().customer, phone: '03119999999' } }]) {
    const saved = order(), job = buildWhatsAppStatusNotification(saved, 'status:transactional', TIME);
    const store = memoryDatabase({ [`orders/${saved.orderId}`]: saved }); await ingest(store, 'START');
    store.records.set(`whatsappNotificationJobs/${job.id}`, job.data);
    const claim: any = await claimWhatsAppNotification(store.db, options());
    store.records.set(`orders/${saved.orderId}`, { ...saved, ...mutation });
    await assert.rejects(() => authorizeWhatsAppSend(store.db, claim, options()), (error: any) => ['STALE_CANONICAL_REVISION', 'PHONE_OWNERSHIP_CHANGED'].includes(error.code));
    assert.equal(store.records.get(`whatsappNotificationJobs/${job.id}`).state, 'COALESCED');
  }
});

test('provider acceptance requires message ID; delivered requires matching signature-verified delivery evidence', async () => {
  const saved = order(), store = memoryDatabase({ [`orders/${saved.orderId}`]: saved }); await ingest(store);
  const claim: any = await claimWhatsAppNotification(store.db, options());
  const wire = await authorizeWhatsAppSend(store.db, claim, options());
  assert.equal(wire.to, PHONE); assert.ok(wire.sendBeforeMs > TIME);
  await assert.rejects(() => authorizeWhatsAppSend(store.db, claim, options()), (error: any) => error.code === 'SEND_LEASE_EXPIRED');
  await assert.rejects(() => completeWhatsAppSend(store.db, { ...claim, outcome: 'ACCEPTED' }, options()), (error: any) => error.code === 'PROVIDER_MESSAGE_ID_REQUIRED');
  const result = await completeWhatsAppSend(store.db, { ...claim, outcome: 'ACCEPTED', providerMessageId: 'wamid.outbound-1' }, options());
  assert.equal(result.state, 'ACCEPTED');
  assert.equal((await completeWhatsAppSend(store.db, { ...claim, outcome: 'ACCEPTED', providerMessageId: 'wamid.outbound-1' }, options())).duplicate, true);
  const status = (recipient: string, id = 'wamid.outbound-1') => [{ id, recipient_id: recipient, timestamp: String(TIME / 1000), status: 'delivered' }];
  assert.equal((await ingest(store, '', { statuses: status('923119999999') })).deliveryEvidenceRecorded, 0);
  assert.equal((await ingest(store, '', { statuses: status(PHONE, 'wamid.wrong-id') })).deliveryEvidenceRecorded, 0);
  assert.equal((await ingest(store, '', { statuses: status(PHONE) })).deliveryEvidenceRecorded, 1);
  assert.equal(store.records.get(`whatsappNotificationJobs/${claim.jobId}`).state, 'DELIVERED');
  assert.equal((await ingest(store, '', { statuses: status(PHONE) })).deliveryEvidenceRecorded, 0);
});

test('unknown HTTP outcome is terminal for automatic retries; crashed SENDING lease becomes UNKNOWN instead of duplicate send', async () => {
  for (const crash of [false, true]) {
    const saved = order(), store = memoryDatabase({ [`orders/${saved.orderId}`]: saved }); await ingest(store);
    let now = TIME;
    const claim: any = await claimWhatsAppNotification(store.db, options(() => now));
    await authorizeWhatsAppSend(store.db, claim, options(() => now));
    if (!crash) await completeWhatsAppSend(store.db, { ...claim, outcome: 'UNKNOWN' }, options(() => now));
    now += WHATSAPP_SEND_LEASE_MS + 1;
    assert.equal((await claimWhatsAppNotification(store.db, options(() => now)) as any).idle, true);
    assert.equal(store.records.get(`whatsappNotificationJobs/${claim.jobId}`).state, 'UNKNOWN');
    assert.equal((await claimWhatsAppNotification(store.db, options(() => now)) as any).idle, true);
  }
});

test('early signed provider delivery evidence survives callback ordering and cannot be invented by an ACCEPTED result', async () => {
  const saved = order(), store = memoryDatabase({ [`orders/${saved.orderId}`]: saved }); await ingest(store);
  const claim: any = await claimWhatsAppNotification(store.db, options());
  await authorizeWhatsAppSend(store.db, claim, options());
  assert.equal((await ingest(store, '', { statuses: [{ id: 'wamid.early', recipient_id: PHONE, timestamp: String(TIME / 1000), status: 'delivered' }] })).deliveryEvidenceRecorded, 0);
  const result = await completeWhatsAppSend(store.db, { ...claim, outcome: 'ACCEPTED', providerMessageId: 'wamid.early' }, options());
  assert.equal(result.state, 'DELIVERED');
  assert.equal(store.records.get(`whatsappNotificationJobs/${claim.jobId}`).deliveryEvidence, 'delivered');
  assert.equal((await completeWhatsAppSend(store.db, { ...claim, outcome: 'ACCEPTED', providerMessageId: 'wamid.early' }, options())).duplicate, true);
});

test('two backend claimers serialize jobs and old customer requests cannot cause historical reply spam', async () => {
  const saved = order(), store = memoryDatabase({ [`orders/${saved.orderId}`]: saved });
  await ingest(store); await ingest(store, 'Track my orders', { id: 'wamid.latest' });
  const claims: any[] = await Promise.all([claimWhatsAppNotification(store.db, options()), claimWhatsAppNotification(store.db, options())]);
  assert.equal(claims.filter(claim => !claim.idle).length, 1);
  const oldId = whatsappDocumentKey('receipt:wamid.inbound-1');
  assert.equal(store.records.get(`whatsappNotificationJobs/${oldId}`).state, 'COALESCED');
});
