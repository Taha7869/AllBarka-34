import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import { PRODUCTS } from '../src/data/products';
import { HAMPER_BOXES, resolveHamper } from '../src/lib/hamperCatalog';
import { CatalogPricingError, defaultProductPricing, validateProductPricing, validateBoxPricing, parseCatalogResponse, productWithPricing } from '../src/lib/catalogPricing';
import { catalogFromRecords, createLiveCatalog, quoteFingerprint, staticCatalogSnapshot } from '../src/lib/liveCatalog';
import { readCatalogPrice, updateCatalogPrice, createCatalogPricingRouter } from '../src/lib/catalogPricingRouter';
import { createDurableOrder, QuoteChangedError } from '../src/lib/orderDatabase';
import { validateAndPriceOrder } from '../src/lib/orderValidation';
import { catalogSeedPlan } from '../src/lib/catalogSeed';
import { CatalogFirestoreFixture } from './catalog-firestore-fixture';
import { catalogConciergeContext } from '../src/lib/catalogConcierge';

const pista = PRODUCTS.find(product => product.id === 'pista')!;
const code = (value: string) => (error: unknown) => error instanceof CatalogPricingError && error.code === value;
const records = (fixture: CatalogFirestoreFixture) => catalogFromRecords(new Map(PRODUCTS.map(product => [product.id, fixture.records.get(`products/${product.id}`)])), new Map(HAMPER_BOXES.map(box => [box.id, fixture.records.get(`catalogBoxes/${box.id}`)])));
const payload = (items = [{ productId: 'pista', selectedWeight: '250g', quantity: 2 }] as any[]) => ({ name: 'Test Patron', phone: '03001234567', address: 'House 12, Test Street', city: 'Karachi', paymentMethod: 'cod', shippingMethodId: 'standard', items });

test('commercial prices reject unsupported portions, coercion, zero retail rates and invalid custom bounds', () => {
  const base = defaultProductPricing(pista);
  for (const price of [0, -1, 1.5, '1000', NaN, Infinity, 1_000_001]) assert.throws(() => validateProductPricing(pista, { ...base, prices: { ...base.prices, '250g': price } }, true));
  for (const changed of [{ ...base, active: 'true' }, { ...base, stock: 0 }, { ...base, minCustomWeightG: 75 }, { ...base, maxCustomWeightG: 6000 }, { ...base, minCustomWeightG: 125 }, { ...base, minCustomWeightG: 1500, maxCustomWeightG: 1000 }, { ...base, pricePer100g: 0 }]) assert.throws(() => validateProductPricing(pista, changed, true));
  assert.throws(() => validateProductPricing(pista, { ...base, prices: { ...base.prices, '999g': 123 } }), code('INVALID_CATALOG_PORTIONS'));
  assert.equal(validateProductPricing(pista, { ...base, wholesale: 0 }, true).wholesale, 0);
  assert.throws(() => validateBoxPricing({ price: 0, active: true }, true));
  assert.throws(() => validateBoxPricing({ price: 2000, active: true, shippingWeightG: 1 }, true));
  for (const product of PRODUCTS) assert.deepEqual(validateProductPricing(product, defaultProductPricing(product), true), defaultProductPricing(product));
});

test('public catalogue overlays only pricing and derives variants while preserving media and shipping metadata', () => {
  const fixture = new CatalogFirestoreFixture().seed();
  const saved = fixture.records.get('products/pista');
  fixture.records.set('products/pista', { ...saved, prices: { ...saved.prices, '250g': 1400 }, variants: [{ label: '250g', price: 1 }],
    costPrice: 42, supplier: 'PRIVATE', updatedBy: 'PRIVATE', shippingWeights: { '250g': 1 }, image: '/private.png', name_en: 'Injected name' });
  const snapshot = records(fixture);
  const product = snapshot.catalog.find(product => product.id === 'pista')!;
  assert.equal(product.prices['250g'], 1400); assert.equal(product.variants?.find(variant => variant.label === '250g')?.price, 1400);
  assert.equal(product.name_en, pista.name_en); assert.equal(product.image, pista.image); assert.deepEqual(product.shippingWeights, pista.shippingWeights);
  assert.equal(JSON.stringify(snapshot).includes('PRIVATE'), false); assert.equal('costPrice' in product, false);
  assert.deepEqual(parseCatalogResponse(snapshot), snapshot);
  fixture.records.delete('products/pista'); assert.throws(() => records(fixture), code('CATALOG_NOT_READY'));
});

test('shared server listeners propagate Console changes, fail closed and reconnect without static fallback', async () => {
  const fixture = new CatalogFirestoreFixture().seed();
  const service = createLiveCatalog({ getDb: () => fixture.db, getSource: () => 'firestore', timeoutMs: 100 });
  const snapshots = await Promise.all(Array.from({ length: 20 }, () => service.getSnapshot()));
  assert.equal(fixture.listeners.get('products')?.size, 1); assert.equal(fixture.listeners.get('catalogBoxes')?.size, 1);
  assert.ok(snapshots.every(snapshot => snapshot.revision === snapshots[0].revision));
  fixture.records.get('products/pista').prices['250g'] = 1600; await fixture.emit('products');
  assert.equal((await service.getSnapshot()).catalog.find(product => product.id === 'pista')!.prices['250g'], 1600);
  fixture.records.get('products/pista').prices['250g'] = '1600'; await fixture.emit('products');
  await assert.rejects(service.getSnapshot(), code('CATALOG_NOT_READY'));
  fixture.records.get('products/pista').prices['250g'] = 1600; await fixture.emit('products');
  fixture.listeners.get('products')?.forEach(listener => listener.error());
  assert.equal((await service.getSnapshot()).source, 'firestore'); service.close();
  await assert.rejects(createLiveCatalog({ getDb: () => null, getSource: () => 'firestore' }).getSnapshot(), code('CATALOG_UNAVAILABLE'));
  assert.equal((await createLiveCatalog({ getDb: () => null, getSource: () => 'static' }).getSnapshot()).source, 'static');
});

test('admin price changes use optimistic versions, preserve private fields and write an atomic audit', async () => {
  const fixture = new CatalogFirestoreFixture().seed();
  fixture.records.get('products/pista').supplierCost = 123;
  const current = await readCatalogPrice(fixture.db, 'products', 'pista');
  const pricing = { ...current.pricing as any, prices: { ...(current.pricing as any).prices, '250g': 1450 } };
  const update = { db: fixture.db, kind: 'products', id: 'pista', actorUid: 'verified-admin', body: { expectedVersion: current.version, pricing, reason: 'Supplier rate update' } };
  const result = await updateCatalogPrice(update);
  assert.equal(result.revision, 1); assert.equal(fixture.records.get('products/pista').supplierCost, 123); assert.equal(JSON.stringify(result).includes('supplierCost'), false);
  const audits = [...fixture.records.entries()].filter(([key]) => key.startsWith('catalogPriceAudits/'));
  assert.equal(audits.length, 1); assert.equal(audits[0][1].previousPricing.prices['250g'], (current.pricing as any).prices['250g']);
  assert.equal(audits[0][1].pricing.prices['250g'], 1450); assert.equal(audits[0][1].actorUid, 'verified-admin');
  await assert.rejects(updateCatalogPrice(update), code('PRICE_VERSION_CONFLICT'));
  const loaded = await readCatalogPrice(fixture.db, 'products', 'pista');
  fixture.records.get('products/pista').prices['250g'] = 1550;
  await assert.rejects(updateCatalogPrice({ ...update, body: { ...update.body, expectedVersion: loaded.version } }), code('PRICE_VERSION_CONFLICT'));
  const fresh = await readCatalogPrice(fixture.db, 'products', 'pista'); fixture.failAudit = true;
  await assert.rejects(updateCatalogPrice({ ...update, body: { ...update.body, expectedVersion: fresh.version } }));
  assert.equal(fixture.records.get('products/pista').prices['250g'], 1550); assert.equal([...fixture.records.keys()].filter(key => key.startsWith('catalogPriceAudits/')).length, 1);
});

test('admin routes require verified admin identity and public ETags never expose staff data', async () => {
  const fixture = new CatalogFirestoreFixture().seed(); const service = createLiveCatalog({ getDb: () => fixture.db, getSource: () => 'firestore' });
  const app = express(); app.use(express.json());
  app.use(createCatalogPricingRouter({ getDb: () => fixture.db, catalog: service, requireAdmin: (req, res, next) => {
    if (req.headers.authorization !== 'Bearer admin-fixture') { res.status(req.headers.authorization ? 403 : 401).json({ code: 'FORBIDDEN_ADMIN' }); return; }
    (req as any).user = { uid: 'verified-admin' }; next();
  } }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); const url = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const price = '/api/admin/catalog-prices/products/pista';
    assert.equal((await fetch(url + price)).status, 401); assert.equal((await fetch(url + price, { headers: { Authorization: 'Bearer patron-fixture' } })).status, 403);
    assert.equal((await fetch(url + price, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
    const publicResponse = await fetch(url + '/api/catalog/snapshot'); assert.equal(publicResponse.status, 200);
    const etag = publicResponse.headers.get('etag')!; assert.equal((await fetch(url + '/api/catalog/snapshot', { headers: { 'If-None-Match': etag } })).status, 304);
    const legacy = await fetch(url + '/api/catalog'); assert.ok(Array.isArray(await legacy.json())); assert.notEqual(legacy.headers.get('etag'), etag);
    const response = await fetch(url + price, { headers: { Authorization: 'Bearer admin-fixture' } }); assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal((await response.json()).record.kind, 'products');
    assert.equal((await fetch(url + '/api/admin/catalog-prices/products/not-a-product', { headers: { Authorization: 'Bearer admin-fixture' } })).status, 404);
  } finally { service.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('durable checkout reads fresh Firestore prices and preserves a saved receipt after deletion or price changes', async () => {
  const fixture = new CatalogFirestoreFixture().seed();
  fixture.records.get('products/pista').prices['250g'] = 1550;
  const input = payload(); const quote = validateAndPriceOrder({ ...input, catalog: records(fixture).catalog, boxes: records(fixture).boxes });
  const created = await createDurableOrder({ db: fixture.db, payload: input, uid: null, idempotencyKey: 'live-price-test', catalogSource: 'firestore', expectedFinalTotal: quote.summary.total, expectedQuoteFingerprint: quoteFingerprint(quote) });
  assert.equal(created.items[0].price, 1550); assert.equal(created.totals.subtotal, 3100); assert.equal(created.totals.shipping, 250);
  assert.deepEqual(fixture.reads.filter(path => path.startsWith('products/')), ['products/pista']);
  assert.equal(fixture.records.get(`orders/${created.orderId}`).priceSource, 'firestore');
  assert.match(fixture.records.get(`orders/${created.orderId}`).catalogRevision, /^[a-f0-9]{64}$/);
  fixture.records.delete('products/pista'); fixture.reads = [];
  const duplicate = await createDurableOrder({ db: fixture.db, payload: input, uid: null, idempotencyKey: 'live-price-test', catalogSource: 'firestore', expectedFinalTotal: 1, expectedQuoteFingerprint: 'changed' });
  assert.equal(duplicate.isDuplicate, true); assert.deepEqual(duplicate.totals, created.totals); assert.deepEqual(duplicate.items, created.items);
  assert.equal(fixture.reads.some(path => path.startsWith('products/')), false);
  await assert.rejects(createDurableOrder({ db: fixture.db, payload: input, uid: null, idempotencyKey: 'new-missing-price', catalogSource: 'firestore' }), code('CATALOG_NOT_READY'));
});

test('a changed quote is rejected before persistence, including equal totals with different item prices', async () => {
  const fixture = new CatalogFirestoreFixture().seed();
  const input = payload([{ productId: 'pista', selectedWeight: '250g', quantity: 1 }, { productId: 'badam', selectedWeight: '250g', quantity: 1 }]);
  const quote = validateAndPriceOrder({ ...input, catalog: records(fixture).catalog });
  fixture.records.get('products/pista').prices['250g'] += 100; fixture.records.get('products/badam').prices['250g'] -= 100;
  await assert.rejects(createDurableOrder({ db: fixture.db, payload: input, uid: null, idempotencyKey: 'equal-total', catalogSource: 'firestore', expectedFinalTotal: quote.summary.total, expectedQuoteFingerprint: quoteFingerprint(quote) }), error => error instanceof QuoteChangedError);
  assert.equal([...fixture.records.keys()].some(path => path.startsWith('orders/')), false);
});

test('custom grams, legacy wholesale units, hamper contents and box fees all use current prices', async () => {
  const fixture = new CatalogFirestoreFixture().seed();
  fixture.records.get('products/pista').pricePer100g = 571; fixture.records.get('products/pista').wholesale = 777;
  const snapshot = records(fixture);
  const custom = validateAndPriceOrder({ ...payload([{ productId: 'pista', selectedWeight: 'Custom 350g', quantity: 1 }]), catalog: snapshot.catalog, isWholesale: true });
  assert.equal(custom.items[0].price, 2000); assert.equal(custom.summary.shippingWeightGrams, 350); assert.equal(custom.summary.shipping, 250);
  const wholesale = validateAndPriceOrder({ ...payload([{ productId: 'pista', selectedWeight: '500g', quantity: 2 }]), catalog: snapshot.catalog, isWholesale: true });
  assert.equal(wholesale.summary.subtotal, 1554);
  fixture.records.get('catalogBoxes/box-wood').price = 2000;
  for (const id of ['pista', 'kaju', 'badam', 'akhroot']) fixture.records.get(`products/${id}`).prices['250g'] = 1000;
  const configuration = { version: 1, boxId: 'box-wood', selections: ['pista', 'kaju', 'badam', 'akhroot'], recipientName: '', giftMessage: '' };
  const current = records(fixture); assert.equal(resolveHamper(configuration, current.catalog, current.boxes)?.unitPrice, 5200);
  const created = await createDurableOrder({ db: fixture.db, payload: payload([{ productId: 'custom-hamper', quantity: 2, hamperConfiguration: configuration }]), uid: null, idempotencyKey: 'live-hamper', catalogSource: 'firestore' });
  assert.equal(created.items[0].price, 5200); assert.equal(created.totals.shippingWeightGrams, 1600); assert.equal(created.totals.shipping, 400);
  fixture.records.get('products/kaju').active = false;
  const inactive = records(fixture); assert.equal(resolveHamper(configuration, inactive.catalog, inactive.boxes), null);
});

test('migration is create-only and reports invalid existing prices without replacing them', () => {
  const first = catalogSeedPlan(new Map(), new Map()); assert.equal(first.create.length, PRODUCTS.length + HAMPER_BOXES.length);
  const ownerPricing = { ...defaultProductPricing(pista), prices: { ...pista.prices, '250g': 1700 } };
  const records = new Map([['pista', ownerPricing]]);
  const plan = catalogSeedPlan(records, new Map()); assert.ok(plan.preserve.includes('products/pista')); assert.ok(!plan.create.some(entry => entry.path === 'products/pista'));
  assert.equal(ownerPricing.prices['250g'], 1700); assert.deepEqual(plan.invalid, []);
  records.set('pista', { ...ownerPricing, wholesale: -1 }); assert.deepEqual(catalogSeedPlan(records, new Map()).invalid, ['products/pista']);
  assert.equal(staticCatalogSnapshot().catalog.length, 89);
});

test('AI context includes live fixed/custom/hamper prices and excludes inactive products', () => {
  const fixture = new CatalogFirestoreFixture().seed(); fixture.records.get('products/pista').prices['250g'] = 1490;
  fixture.records.get('products/pista').pricePer100g = 571; fixture.records.get('catalogBoxes/box-wood').price = 2150;
  fixture.records.get('products/kaju').active = false;
  const context = catalogConciergeContext(records(fixture));
  assert.ok(context.includes('250g: Rs. 1490')); assert.ok(context.includes('Rs. 571 per 100g')); assert.ok(context.includes('Rs. 2150'));
  assert.ok(context.includes('200g hamper portion Rs. 1192')); assert.ok(!context.includes('[kaju]'));
});
