import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import { memoryFirestore } from './helpers/memoryFirestore';
import { PRODUCTS, BID_BOX_PRODUCTS } from '../src/data/products';
import { createAdminProduct, updateAdminProduct, storedCatalogRecord, invalidateCatalogCache } from '../src/lib/catalogStore';
import { calculateMinOrderQuantityUnits } from '../src/lib/packagingMoq';
import { quoteOrderForCustomer } from '../src/lib/orderQuote';
import { createDurableOrder } from '../src/lib/orderDatabase';
import type { CanonicalOrder } from '../src/lib/serverOrderService';
import { createOrderOutboxWorker } from '../src/services/orderOutboxWorker';
import { getN8nOrderDispatchConfig, projectCanonicalOrderForN8n, sendOrderToN8n } from '../src/services/n8nOrderNotification';
import { getN8nStatusDispatchConfig } from '../src/services/n8nStatusNotification';

const workflow = JSON.parse(readFileSync(new URL('../n8n/allbarka-website-integration.json', import.meta.url), 'utf8'));
const config = getN8nOrderDispatchConfig({ N8N_ORDER_WEBHOOK_URL: 'https://stage6-fixture.invalid/webhook/order', N8N_WEBHOOK_SECRET: 'stage6-local-test-secret' });
const customer = { name: 'Fixture Customer', phone: '03001234567', address: 'Fixture house, fixture street', city: 'Karachi', paymentMethod: 'cod', shippingMethodId: 'standard' };
const runNode = (name: string, input: any, refs: Record<string, any> = {}) => {
  const node = workflow.nodes.find((node: any) => node.name === name); assert.ok(node);
  return new Function('$input', '$', node.parameters.jsCode)({ first: () => ({ json: input }), all: () => [{ json: input }] },
    (key: string) => { assert.ok(key in refs); return { first: () => ({ json: refs[key] }), all: () => [{ json: refs[key] }] }; })[0].json;
};
function store() {
  const fixture = memoryFirestore(Object.fromEntries(PRODUCTS.map(product => [`products/${product.id}`, product])));
  // Same isolated adapter; expose the document path shorthand used by the existing outbox lease.
  fixture.db.doc = (path: string) => { const [collection, id] = path.split('/'); return fixture.db.collection(collection).doc(id); };
  return fixture;
}
async function create(fixture: ReturnType<typeof store>, payload: any, key: string, expectedFinalTotal?: number) {
  const previous = [process.env.N8N_ORDER_WEBHOOK_URL, process.env.N8N_WEBHOOK_SECRET];
  try {
    // Test process only; no .env file, real credential, provider URL or live network call.
    process.env.N8N_ORDER_WEBHOOK_URL = config.webhookUrl; process.env.N8N_WEBHOOK_SECRET = config.webhookSecret;
    return await createDurableOrder({ db: fixture.db, payload, uid: null, idempotencyKey: key, expectedFinalTotal });
  } finally {
    for (const [index, key] of ['N8N_ORDER_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET'].entries()) {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    }
  }
}
function eventFor(fixture: ReturnType<typeof store>, orderId: string): any {
  return [...fixture.records].find(([path, event]: [string, any]) => path.startsWith('orderEvents/') && event.orderId === orderId)![1];
}
async function withReceiver(run: (receiver: any) => Promise<void>, wrongFirstAck = false) {
  const rows = new Map<string, any>(); const envelopes: any[] = []; const failures: string[] = [];
  const app = express(); app.use(express.text({ type: 'application/json', limit: '1mb' }));
  app.post('/receiver', (req, res) => {
    try {
      assert.equal(req.headers['x-allbarka-webhook-secret'], config.webhookSecret);
      assert.equal(req.headers['x-n8n-signature'], crypto.createHmac('sha256', config.webhookSecret!).update(req.body).digest('hex'));
      const body = JSON.parse(req.body); envelopes.push(body);
      const valid = runNode('Validate Website Order', { body }); if (!valid.valid) return res.status(valid.httpStatus).json(valid.responseBody);
      const refs = { 'Validate Website Order': valid };
      const classified = runNode('Classify Order Mirror', rows.get(valid.orderId) || {}, refs);
      let result = classified;
      if (classified.route === 'new') {
        rows.set(valid.orderId, classified.sheetRow);
        result = runNode('Acknowledge Website Mirror', { order_id: valid.orderId }, refs);
      }
      if (wrongFirstAck && envelopes.length === 1) return res.json({ ...result.responseBody, orderId: 'AB-20000101-000000' });
      return res.status(result.httpStatus || 200).json(result.responseBody);
    } catch (error) { failures.push(String(error)); return res.status(500).json({ ok: false }); }
  });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  // Production transport still validates HTTPS; the explicit test adapter routes only to this loopback server.
  const localFetch: typeof fetch = async (url, init) => { assert.equal(url, config.webhookUrl); return fetch(`${origin}/receiver`, init); };
  try { await run({ rows, envelopes, localFetch }); assert.deepEqual(failures, []); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
function worker(fixture: ReturnType<typeof store>, receiver: any, now: () => number) {
  return createOrderOutboxWorker({ getDb: () => fixture.db, getConfig: () => config,
    getStatusConfig: () => getN8nStatusDispatchConfig({}), now, logger: () => {},
    dispatch: (order, options) => sendOrderToN8n(order, { ...options, fetchImpl: receiver.localFetch }) });
}

test('all six historical long packaging selections survive quote, durable order and the actual bundled receiver code', async () => {
  await withReceiver(async receiver => {
    for (const seed of BID_BOX_PRODUCTS) for (const label of Object.keys(seed.prices).filter(label => label.length > 40)) {
      const fixture = store(); const merchantPrice = seed.prices[label] + 137;
      const document: any = fixture.records.get(`products/${seed.id}`); document.prices[label] = merchantPrice;
      const canonical = storedCatalogRecord(seed.id, document); document.variants = canonical.pricing.variants; document.variants.find((variant: any) => variant.label === label).price = merchantPrice;
      const quantity = calculateMinOrderQuantityUnits({ ...seed, prices: document.prices }, label);
      const payload = { ...customer, items: [{ productId: seed.id, selectedWeight: label, quantity, price: 1, shippingWeightGrams: 0 }] };
      invalidateCatalogCache(); const quote = await quoteOrderForCustomer(fixture.db, payload);
      const saved = await create(fixture, payload, 'legacy-selection', quote.totals.total);
      assert.equal(saved.items[0].selectedWeight, label); assert.equal(saved.items[0].price, merchantPrice);
      const before = structuredClone(fixture.records.get(`orders/${saved.orderId}`));
      assert.equal(eventFor(fixture, saved.orderId).deliveryState, 'PENDING');
      const result = await worker(fixture, receiver, () => Date.now()).runOnce();
      assert.equal(result.status, 'DELIVERED', `${seed.id}: ${label}`);
      const wire = receiver.envelopes.at(-1).order; assert.equal(wire.items[0].selectedWeight, label); assert.equal(wire.items[0].price, merchantPrice);
      assert.equal(wire.totals.total, quote.totals.total); assert.match(receiver.rows.get(saved.orderId).items_summary, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.deepEqual(fixture.records.get(`orders/${saved.orderId}`), before);
      assert.doesNotMatch(JSON.stringify(wire), /claimToken|supplierCost|adminNotes|catalogRevision/);
    }
    assert.equal(receiver.rows.size, 6);
  });
});

test('new mg and liquid custom options reach persisted receipts and mirrors; quote refresh and idempotent replay preserve authority', async () => {
  const fixture = store();
  const base = { version: 1, pricingMode: 'calculated', quantityMode: 'both', baseQuantity: 1,
    options: [{ label: '500mg', quantity: 500, unit: 'mg', override: false, available: true, shippingWeightG: 10 }],
    custom: { unit: 'mg', min: 250, max: 1000, step: 250, shippingWeightGPerUnit: null } };
  const saffron = await createAdminProduct({ db: fixture.db, actorUid: 'fixture-owner', body: { id: 'stage6-saffron', name_en: 'Fixture saffron',
    desc_en: 'Confirmed fixture details', image: '/images/product-placeholder.svg', category: 'herbs-spices', status: 'published', active: true,
    prices: {}, supplierCost: 17, commerce: { ...base, kind: 'food', baseUnit: 'g', basePrice: 1000 } } });
  await createAdminProduct({ db: fixture.db, actorUid: 'fixture-owner', body: { id: 'stage6-oil', name_en: 'Fixture oil',
    desc_en: 'Confirmed fixture details', image: '/images/product-placeholder.svg', category: 'oils', status: 'published', active: true, prices: {},
    commerce: { ...base, kind: 'liquid', baseUnit: 'L', basePrice: 2000,
      options: [{ label: '500ml', quantity: 500, unit: 'ml', override: false, available: true, shippingWeightG: null }],
      custom: { unit: 'ml', min: 100, max: 1000, step: 100, shippingWeightGPerUnit: null } } } });
  const payload = { ...customer, discountCode: 'ALLBARKA10', items: [
    { productId: saffron.id, selectedWeight: 'Custom 750mg', quantity: 2, price: 1 },
    { productId: 'stage6-oil', selectedWeight: 'Custom 600ml', quantity: 2, price: 1, shippingWeightGrams: 0 } ] };
  const quote = await quoteOrderForCustomer(fixture.db, payload);
  assert.equal(quote.totals.subtotal, 3900); assert.equal(quote.totals.discount, 390);
  assert.equal(quote.totals.shippingWeightGrams, 1202); assert.equal(quote.totals.shipping, 301);
  const first = await create(fixture, payload, 'custom-units', quote.totals.total); assert.deepEqual(first.items, quote.items);
  const receipt = structuredClone(fixture.records.get(`orders/${first.orderId}`));
  const updated = await updateAdminProduct({ db: fixture.db, actorUid: 'fixture-owner', productId: saffron.id,
    body: { expectedRevision: saffron.revision, commerce: { ...saffron.commerce, basePrice: 2000 } } });
  assert.ok(updated.revision! > saffron.revision!);
  const beforeConflict = structuredClone([...fixture.records]);
  await assert.rejects(create(fixture, payload, 'new-attempt', quote.totals.total), { code: 'QUOTE_CHANGED' });
  assert.deepEqual([...fixture.records], beforeConflict, 'stale expected total leaves no order/intent/event writes');
  const duplicate = await create(fixture, { ...payload, items: payload.items.map(item => ({ ...item, price: 999 })) }, 'custom-units', 1);
  assert.equal(duplicate.isDuplicate, true); assert.equal(duplicate.orderId, first.orderId); assert.equal(duplicate.totals.total, first.totals.total);
  await withReceiver(async receiver => {
    assert.equal((await worker(fixture, receiver, () => Date.now()).runOnce()).status, 'DELIVERED');
    assert.equal(receiver.envelopes[0].order.items[0].price, 750, 'dispatch uses persisted receipt, not new catalog rate');
    assert.equal(receiver.envelopes[0].order.totals.total, quote.totals.total);
    assert.deepEqual(fixture.records.get(`orders/${first.orderId}`), receipt);
    assert.equal(receiver.rows.size, 1);
  });
});

test('uncertain acknowledgement retries the same durable event and receiver mirror without a second order or price reset', async () => {
  const fixture = store(); const payload = { ...customer, items: [{ productId: 'pista', selectedWeight: '500g', quantity: 1, price: 1 }] };
  const saved = await create(fixture, payload, 'retry-receipt'); let now = Date.now();
  await withReceiver(async receiver => {
    const instance = worker(fixture, receiver, () => now);
    assert.equal((await instance.runOnce()).status, 'RETRY_SCHEDULED');
    const event = eventFor(fixture, saved.orderId); assert.equal(event.deliveryState, 'PENDING'); assert.equal(event.attempts, 1);
    assert.equal(receiver.rows.size, 1); now = event.nextAttemptAtMs + 1;
    (fixture.records.get('products/pista') as any).prices['500g'] = 9999;
    assert.equal((await instance.runOnce()).status, 'DELIVERED');
    assert.equal(eventFor(fixture, saved.orderId).attempts, 2); assert.equal(receiver.rows.size, 1);
    assert.equal(receiver.envelopes[0].eventId, receiver.envelopes[1].eventId);
    assert.deepEqual(receiver.envelopes[0].order, receiver.envelopes[1].order);
    assert.equal([...fixture.records.keys()].filter(path => path.startsWith('orders/')).length, 1);
  }, true);
});

test('sender and receiver restrict the long selection exception to exact historical labels and product identity', async () => {
  const fixture = store(); const seed = BID_BOX_PRODUCTS.find(product => product.id === 'bid-box-umrah-tabarruk')!;
  const label = Object.keys(seed.prices).find(label => label.length > 50)!;
  const quantity = calculateMinOrderQuantityUnits(seed, label);
  const saved = await create(fixture, { ...customer, items: [{ productId: seed.id, selectedWeight: label, quantity }] }, 'selection-scope');
  const order = fixture.records.get(`orders/${saved.orderId}`) as CanonicalOrder;
  const wire = projectCanonicalOrderForN8n(order); assert.equal(wire.items[0].selectedWeight, label);
  for (const [id, selectedWeight] of [['pista', label], [seed.id, label + ' extra'], [seed.id, 'x'.repeat(51)], [seed.id, 'x'.repeat(161)], [seed.id, label + '\n']]) {
    const changed = structuredClone(order); changed.items[0].productId = id; changed.items[0].selectedWeight = selectedWeight;
    assert.throws(() => projectCanonicalOrderForN8n(changed), /CANONICAL_ORDER_INVALID/);
    const raw = structuredClone(wire); raw.items[0].id = id; raw.items[0].selectedWeight = selectedWeight;
    assert.equal(runNode('Validate Website Order', { body: { event: 'ORDER_CREATED', timestamp: new Date().toISOString(), order: raw } }).valid, false);
  }
});
