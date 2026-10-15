import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import express from 'express';
import { PRODUCTS } from '../src/data/products';
import { REWARDS } from '../src/data/rewards';
import { HAMPER_BOXES, CUSTOM_HAMPER_PRODUCT_ID } from '../src/lib/hamperCatalog';
import { staticCatalogSnapshot, quoteFingerprint } from '../src/lib/liveCatalog';
import { defaultProductPricing } from '../src/lib/catalogPricing';
import { validateAndPriceOrder } from '../src/lib/orderValidation';
import { createDurableOrder, updateAdminOrderStatus, QuoteChangedError } from '../src/lib/orderDatabase';
import { INVENTORY_TARGETS, DEFAULT_UNLIMITED_STOCK, inventoryFromStored, validateInventory, orderStockRequirements, InventoryError } from '../src/lib/inventory';
import { updateInventory, createInventoryRouter, createInventoryStore, catalogWithInventory } from '../src/lib/inventoryServer';
import { applyPatronReward, rewardDefinition, sanitizeRewardApplication, rewardPackingLines, rewardFulfillmentNote } from '../src/lib/rewardFulfillment';
import { redeemPatronReward, rewardCancellationOutcome } from '../src/lib/rewardRedemption';
import { sanitizeOrderForCustomer, generateAuthoritativeWhatsAppMessage, type CanonicalOrder } from '../src/lib/serverOrderService';
import { projectCanonicalOrderForN8n, sendOrderToN8n } from '../src/services/n8nOrderNotification';
import { commerceTranslations } from '../src/contexts/commerceTranslations';
import { CommerceFirestoreFixture } from './commerce-firestore-fixture';

process.env.CATALOG_SOURCE = 'static';
const uid = 'fixture-patron';
const now = Date.now();
const voucher = (id = 'cashew_sample', expiry = now + 86400000) => ({ rewardId: id, rewardType: rewardDefinition(id).rewardType, pointsCost: rewardDefinition(id).pointsCost, status: 'ACTIVE', expiresAt: expiry, claimedAt: now });
const stock = (available: number) => ({ mode: 'tracked', available, revision: 0 });
const payload = (extra: Record<string, unknown> = {}) => ({ name: 'Fixture Patron', phone: '03001234567', address: 'Fixture house, test street', city: 'Karachi', paymentMethod: 'cod', shippingMethodId: 'standard', items: [{ productId: 'pista', selectedWeight: '500g', quantity: 1 }], ...extra });
const create = (db: CommerceFirestoreFixture, extra: Record<string, unknown> = {}, key?: string) => createDurableOrder({ db: db.db, payload: payload(extra), uid, catalogSource: 'static', idempotencyKey: key });
const status = (db: CommerceFirestoreFixture, orderId: string, value: any) => updateAdminOrderStatus({ db: db.db, orderId, status: value, reason: 'Fixture fulfilment update', actorUid: 'fixture-admin' });
const errorCode = (code: string) => (error: any) => error?.code === code;
function priced(subtotal = 2200, weight = 1000, shipping = 250, giftWrapFee = 0): any {
  return { items: [], earnedPoints: 0, summary: { subtotal, discount: 0, discountedSubtotal: subtotal, shipping, giftWrapFee, total: subtotal + shipping + giftWrapFee, shippingWeightGrams: weight } };
}
function apply(rewardId: string, order = priced(), extra: Record<string, unknown> = {}) {
  return applyPatronReward({ order, voucher: voucher(rewardId), activeRewardId: 'fixture-voucher', city: 'Karachi', shippingMethodId: 'standard', catalog: PRODUCTS, now, ...extra });
}

test('all 92 canonical inventory targets default to 9999 unlimited without seeding records', () => {
  assert.equal(INVENTORY_TARGETS.length, 92);
  assert.equal(new Set(INVENTORY_TARGETS.map(target => target.id)).size, 92);
  assert.deepEqual(inventoryFromStored(undefined), { mode: 'unlimited', available: DEFAULT_UNLIMITED_STOCK });
  for (const target of INVENTORY_TARGETS) assert.ok(['g', 'ml', 'pack'].includes(target.unit));
  for (const product of PRODUCTS.filter(product => !product.quoteOnly)) for (const selectedWeight of Object.keys(product.prices)) {
    const [requirement] = orderStockRequirements([{ productId: product.id, selectedWeight, quantity: 1 }]);
    assert.equal(requirement.id, product.id); assert.ok(requirement.units > 0);
  }
});

test('inventory validation rejects coercion, fractional counts, overflow and arbitrary stock units', () => {
  for (const value of [{ mode: 'tracked', available: '5' }, { mode: 'tracked', available: -1 }, { mode: 'tracked', available: .5 }, { mode: 'tracked', available: 1e9 + 1 }, { mode: 'unlimited', available: 4 }, { mode: 'tracked', available: 1, unit: 'kg' }]) {
    assert.throws(() => validateInventory(value, true), errorCode('INVALID_INVENTORY'));
  }
  assert.throws(() => orderStockRequirements([{ productId: 'pista', selectedWeight: '500ml', quantity: 1 }]), errorCode('INVALID_INVENTORY_ALLOCATION'));
});

test('stock aggregation combines duplicate portions, custom grams, hamper portions, boxes and a reward sample', () => {
  const box = HAMPER_BOXES[0];
  const result = orderStockRequirements([
    { productId: 'pista', selectedWeight: '500g', quantity: 2 }, { productId: 'pista', selectedWeight: 'Custom 1kg', quantity: 1 },
    { productId: CUSTOM_HAMPER_PRODUCT_ID, selectedWeight: 'Custom Hamper', quantity: 2, hamperConfiguration: { boxId: box.id, selections: ['kaju', 'pista'] } },
  ], { productId: 'kaju', grams: 50 });
  assert.equal(result.find(value => value.id === 'pista')?.units, 2400);
  assert.equal(result.find(value => value.id === 'kaju')?.units, 450);
  assert.deepEqual(result.find(value => value.id === box.id), { id: box.id, kind: 'boxes', unit: 'pack', units: 2 });
});

test('unlimited inventory persists an order without writing stock or a reservation', async () => {
  const fixture = new CommerceFirestoreFixture(); const order = await create(fixture);
  assert.equal(fixture.records.get(`orders/${order.orderId}`).inventoryReservation, undefined);
  assert.equal([...fixture.records.keys()].some(path => path.startsWith('catalogInventory/')), false);
});

test('two simultaneous orders cannot both consume the last tracked portion', async () => {
  const fixture = new CommerceFirestoreFixture({ 'catalogInventory/pista': stock(500) });
  const outcomes = await Promise.allSettled([create(fixture, {}, 'stock-concurrency-1'), create(fixture, {}, 'stock-concurrency-2')]);
  assert.equal(outcomes.filter(value => value.status === 'fulfilled').length, 1);
  assert.equal((outcomes.find(value => value.status === 'rejected') as PromiseRejectedResult).reason.code, 'INSUFFICIENT_STOCK');
  assert.equal(fixture.records.get('catalogInventory/pista').available, 0);
  assert.equal([...fixture.records.keys()].filter(path => path.startsWith('orders/')).length, 1);
});

test('quote changes and failed order commits leave inventory and rewards untouched', async () => {
  const fixture = new CommerceFirestoreFixture({ 'catalogInventory/pista': stock(500), [`users/${uid}/activeRewards/fixture-voucher`]: voucher() });
  await assert.rejects(createDurableOrder({ db: fixture.db, payload: payload({ rewardId: 'fixture-voucher' }), uid, catalogSource: 'static', expectedQuoteFingerprint: 'obsolete-quote' }), QuoteChangedError);
  assert.equal(fixture.writes, 0); assert.equal(fixture.records.get('catalogInventory/pista').available, 500);
  assert.equal(fixture.records.get(`users/${uid}/activeRewards/fixture-voucher`).status, 'ACTIVE');
  const original = fixture.runTransaction.bind(fixture);
  fixture.runTransaction = operation => original(transaction => operation({ ...transaction, create: () => { throw new Error('Order create failed'); } }));
  await assert.rejects(create(fixture, { rewardId: 'fixture-voucher' }), /Order create failed/);
  assert.equal(fixture.writes, 0); assert.equal(fixture.records.get('catalogInventory/pista').available, 500);
});

test('a transaction retry and an idempotent checkout retry reserve inventory and use the voucher once', async () => {
  const fixture = new CommerceFirestoreFixture({ 'catalogInventory/pista': stock(1000), 'catalogInventory/kaju': stock(50), [`users/${uid}/activeRewards/fixture-voucher`]: voucher() });
  fixture.retryOnce = true;
  const first = await create(fixture, { rewardId: 'fixture-voucher' }, 'same-stock-voucher-intent');
  const writes = fixture.writes;
  const repeat = await create(fixture, { rewardId: 'fixture-voucher' }, 'same-stock-voucher-intent');
  assert.equal(repeat.isDuplicate, true); assert.equal(repeat.orderId, first.orderId); assert.equal(fixture.writes, writes);
  assert.equal(fixture.records.get('catalogInventory/pista').available, 500); assert.equal(fixture.records.get('catalogInventory/kaju').available, 0);
  assert.equal(first.rewardApplication?.sample?.grams, 50); assert.deepEqual(repeat.rewardApplication, first.rewardApplication);
});

test('one voucher used by two competing orders accepts one order and preserves the rejected order stock', async () => {
  const fixture = new CommerceFirestoreFixture({ 'catalogInventory/pista': stock(1000), [`users/${uid}/activeRewards/fixture-voucher`]: voucher('gift_packaging') });
  const results = await Promise.allSettled([create(fixture, { rewardId: 'fixture-voucher' }), create(fixture, { rewardId: 'fixture-voucher' })]);
  assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
  assert.equal((results.find(value => value.status === 'rejected') as PromiseRejectedResult).reason.code, 'REWARD_ALREADY_USED');
  assert.equal(fixture.records.get('catalogInventory/pista').available, 500);
});

test('cancelling an undelivered order releases tracked stock and restores the unexpired voucher exactly once', async () => {
  const fixture = new CommerceFirestoreFixture({ 'catalogInventory/pista': stock(500), 'catalogInventory/kaju': stock(50), [`users/${uid}/activeRewards/fixture-voucher`]: voucher() });
  const order = await create(fixture, { rewardId: 'fixture-voucher' });
  await status(fixture, order.orderId, 'CANCELLED'); const writes = fixture.writes;
  await status(fixture, order.orderId, 'CANCELLED');
  assert.equal(fixture.writes, writes); assert.equal(fixture.records.get('catalogInventory/pista').available, 500);
  assert.equal(fixture.records.get('catalogInventory/kaju').available, 50);
  assert.equal(fixture.records.get(`users/${uid}/activeRewards/fixture-voucher`).status, 'ACTIVE');
  assert.equal(fixture.records.get(`orders/${order.orderId}`).rewardApplication.status, 'RESTORED');
  await assert.rejects(status(fixture, order.orderId, 'ORDER_RECEIVED'), errorCode('CANCELLED_ORDER_REQUIRES_CHECKOUT'));
});

test('delivery finalizes stock and benefit; a later cancellation does not automatically replenish sold goods or rewards', async () => {
  const fixture = new CommerceFirestoreFixture({ 'catalogInventory/pista': stock(500), [`users/${uid}/activeRewards/fixture-voucher`]: voucher('gift_packaging'), [`users/${uid}`]: { loyaltyPoints: 100 } });
  const order = await create(fixture, { rewardId: 'fixture-voucher' });
  await status(fixture, order.orderId, 'DELIVERED');
  assert.equal(fixture.records.get(`orders/${order.orderId}`).inventoryReservation.status, 'FULFILLED');
  assert.equal(fixture.records.get(`orders/${order.orderId}`).rewardApplication.status, 'FULFILLED');
  await status(fixture, order.orderId, 'CANCELLED');
  assert.equal(fixture.records.get('catalogInventory/pista').available, 0);
  assert.equal(fixture.records.get(`users/${uid}/activeRewards/fixture-voucher`).status, 'USED');
  assert.equal(fixture.records.get(`users/${uid}`).loyaltyPoints, 100);
});

test('cancelling after voucher expiry refunds its original point cost rather than issuing an expired benefit', async () => {
  const fixture = new CommerceFirestoreFixture({ 'catalogInventory/pista': stock(500), [`users/${uid}/activeRewards/fixture-voucher`]: voucher('gift_packaging'), [`users/${uid}`]: { loyaltyPoints: 45 } });
  const order = await create(fixture, { rewardId: 'fixture-voucher' });
  fixture.records.get(`orders/${order.orderId}`).rewardApplication.expiresAt = now - 1;
  await status(fixture, order.orderId, 'CANCELLED'); await status(fixture, order.orderId, 'CANCELLED');
  assert.equal(fixture.records.get(`users/${uid}`).loyaltyPoints, 1245);
  assert.equal(fixture.records.get(`users/${uid}/activeRewards/fixture-voucher`).status, 'EXPIRED');
  assert.equal(fixture.records.get(`orders/${order.orderId}`).rewardApplication.status, 'REFUNDED');
});

test('an audit failure rolls back cancellation, reservation release, and reward restoration together', async () => {
  const fixture = new CommerceFirestoreFixture({ 'catalogInventory/pista': stock(500), [`users/${uid}/activeRewards/fixture-voucher`]: voucher('gift_packaging') });
  const order = await create(fixture, { rewardId: 'fixture-voucher' }); fixture.failAudit = true;
  await assert.rejects(status(fixture, order.orderId, 'CANCELLED'), /Audit failed/);
  assert.equal(fixture.records.get('catalogInventory/pista').available, 0);
  assert.equal(fixture.records.get(`orders/${order.orderId}`).status, 'ORDER_RECEIVED');
  assert.equal(fixture.records.get(`users/${uid}/activeRewards/fixture-voucher`).status, 'USED');
});

test('free shipping is restricted to payable Lahore standard fees and discounted merchandise minimum', () => {
  const order = priced(2200, 1000, 150); const result = apply('free_shipping', order, { city: 'Lahore' });
  assert.equal(result.shippingDiscount, 150); assert.equal(order.summary.total, 2200);
  assert.throws(() => apply('free_shipping'), errorCode('SHIPPING_REWARD_LAHORE_ONLY'));
  assert.throws(() => apply('free_shipping', priced(), { city: 'Lahore', shippingMethodId: 'express' }), errorCode('REWARD_STANDARD_ONLY'));
  assert.throws(() => apply('free_shipping', priced(3000, 1000, 0), { city: 'Lahore' }), errorCode('REWARD_NO_ADDITIONAL_BENEFIT'));
  assert.throws(() => apply('free_shipping', priced(1999), { city: 'Lahore' }), errorCode('REWARD_MINIMUM_NOT_MET'));
});

for (const rewardId of ['cashew_sample', 'pista_sample']) test(`${rewardId} includes one free 50g sample and proportional national shipping without a zero-price paid item`, () => {
  const order = priced(); const result = apply(rewardId, order);
  assert.equal(result.sample?.grams, 50); assert.equal(result.sample?.quantity, 1);
  assert.equal(order.summary.shippingWeightGrams, 1050); assert.equal(order.summary.shipping, 263); assert.equal(order.summary.total, 2463);
  assert.deepEqual(order.items, []);
  assert.throws(() => apply(rewardId, priced(1499)), errorCode('REWARD_MINIMUM_NOT_MET'));
});

test('sample benefits retain explicit promotional free shipping, and missing samples cannot consume a voucher', () => {
  const order = priced(2200, 1000, 0); order.summary.freeShipping = true;
  apply('cashew_sample', order); assert.equal(order.summary.shipping, 0);
  assert.throws(() => apply('cashew_sample', priced(), { catalog: PRODUCTS.filter(product => product.id !== 'kaju') }), errorCode('REWARD_SAMPLE_UNAVAILABLE'));
});

test('gift packaging waives its fee and same-day delivery still follows the original subtotal threshold', () => {
  const order = priced(2900, 1000, 300, 250); const benefit = apply('gift_packaging', order, { city: 'Lahore', shippingMethodId: 'sameday' });
  assert.equal(benefit.giftWrapDiscount, 250);
  assert.equal(apply('gift_packaging', priced(2200, 1000, 250, 0)).giftWrapDiscount, 250); assert.equal(order.summary.giftWrapFee, 0); assert.equal(order.summary.shipping, 500); assert.equal(order.summary.total, 3400);
});

test('expired, used, corrupted, wholesale and quote vouchers fail before changing a price', () => {
  for (const [value, code] of [[{ status: 'USED' }, 'REWARD_ALREADY_USED'], [{ expiresAt: now - 1 }, 'REWARD_EXPIRED'], [{ expiresAt: Number.MAX_SAFE_INTEGER }, 'REWARD_EXPIRED'], [{ pointsCost: -1 }, 'INVALID_REWARD'], [{ rewardType: 'PACKAGING' }, 'INVALID_REWARD']] as const) {
    const order = priced(); const original = structuredClone(order);
    assert.throws(() => apply('cashew_sample', order, { voucher: { ...voucher(), ...value } }), errorCode(code)); assert.deepEqual(order, original);
  }
  assert.throws(() => apply('cashew_sample', priced(), { isWholesale: true }), errorCode('REWARD_RETAIL_ONLY'));
  const quote = priced(); quote.summary.isQuoteRequest = true; assert.throws(() => apply('cashew_sample', quote), errorCode('REWARD_RETAIL_ONLY'));
});

test('redemption retries and concurrent browser requests produce one active voucher and one point debit', async () => {
  const fixture = new CommerceFirestoreFixture({ [`users/${uid}`]: { loyaltyPoints: 2000 } }); fixture.retryOnce = true;
  const requests = await Promise.all(['request-one', 'request-two', 'request-one'].map(requestId => redeemPatronReward({ db: fixture.db, uid, body: { rewardId: 'gift_packaging', requestId }, now })));
  assert.equal(new Set(requests.map(value => value.activeRewardId)).size, 1);
  assert.equal(fixture.records.get(`users/${uid}`).loyaltyPoints, 800);
  assert.equal([...fixture.records.keys()].filter(path => path.includes('/loyaltyTransactions/REDEEM_')).length, 1);
  await assert.rejects(redeemPatronReward({ db: fixture.db, uid, body: { rewardId: 'free_shipping', requestId: 'request-one' }, now }), errorCode('REDEMPTION_CONFLICT'));
});

test('legacy active vouchers are reused before charging points and an expired pointer does not hide a valid voucher', async () => {
  const fixture = new CommerceFirestoreFixture({ [`users/${uid}`]: { loyaltyPoints: 0 }, [`users/${uid}/rewardClaims/free_shipping`]: { activeRewardId: 'expired-voucher' },
    [`users/${uid}/activeRewards/expired-voucher`]: voucher('free_shipping', now - 1), [`users/${uid}/activeRewards/legacy-voucher`]: voucher('free_shipping') });
  const result = await redeemPatronReward({ db: fixture.db, uid, body: { rewardId: 'free_shipping', requestId: 'legacy-reuse-request' }, now });
  assert.equal(result.activeRewardId, 'legacy-voucher'); assert.equal(result.duplicate, true); assert.equal(result.loyaltyPoints, 0);
});

test('unavailable sample stock, inactive prices and insufficient balances do not mint vouchers or debit points', async () => {
  for (const available of [0, 49]) {
    const fixture = new CommerceFirestoreFixture({ [`users/${uid}`]: { loyaltyPoints: 2000 }, 'catalogInventory/kaju': stock(available) });
    await assert.rejects(redeemPatronReward({ db: fixture.db, uid, body: { rewardId: 'cashew_sample', requestId: 'sample-unavailable' }, now }), errorCode('REWARD_SAMPLE_UNAVAILABLE'));
    assert.equal(fixture.writes, 0);
  }
  const source = process.env.CATALOG_SOURCE;
  try {
    process.env.CATALOG_SOURCE = 'firestore';
    const kaju = PRODUCTS.find(product => product.id === 'kaju')!;
    const fixture = new CommerceFirestoreFixture({ [`users/${uid}`]: { loyaltyPoints: 2000 }, 'products/kaju': { ...defaultProductPricing(kaju), active: false } });
    await assert.rejects(redeemPatronReward({ db: fixture.db, uid, body: { rewardId: 'cashew_sample', requestId: 'inactive-sample-request' }, now }), errorCode('REWARD_SAMPLE_UNAVAILABLE')); assert.equal(fixture.writes, 0);
  } finally { process.env.CATALOG_SOURCE = source; }
  const fixture = new CommerceFirestoreFixture({ [`users/${uid}`]: { loyaltyPoints: 299 } });
  await assert.rejects(redeemPatronReward({ db: fixture.db, uid, body: { rewardId: 'free_shipping', requestId: 'insufficient-balance' }, now }), errorCode('INSUFFICIENT_POINTS')); assert.equal(fixture.writes, 0);
});

test('private inventory becomes public availability only, and invalid listener data fails closed then recovers', async () => {
  const fixture = new CommerceFirestoreFixture({ 'catalogInventory/pista': stock(0) }); const store = createInventoryStore(() => fixture.db);
  try {
    const snap = catalogWithInventory(staticCatalogSnapshot(), await store.getSnapshot());
    assert.equal(snap.catalog.find(product => product.id === 'pista')?.active, false);
    assert.doesNotMatch(JSON.stringify(snap), /"(?:available|updatedBy|inventoryReservation)"\s*:/);
    fixture.records.set('catalogInventory/pista', stock(-1)); await fixture.notify('catalogInventory');
    await assert.rejects(store.getSnapshot(), errorCode('INVENTORY_UNAVAILABLE'));
    fixture.records.set('catalogInventory/pista', stock(500)); await fixture.notify('catalogInventory');
    assert.equal(catalogWithInventory(snap, await store.getSnapshot()).catalog.find(product => product.id === 'pista')?.active, false); // owner inactive remains inactive
    assert.equal(catalogWithInventory(staticCatalogSnapshot(), await store.getSnapshot()).catalog.find(product => product.id === 'pista')?.active, true);
    fixture.records.set('catalogInventory/pista', stock(-1)); await fixture.notify('catalogInventory');
    [...fixture.watches][0].error(); fixture.records.set('catalogInventory/pista', stock(500));
    assert.equal((await store.getSnapshot()).size, 1); // network errors allow a fresh subscription after invalid data
  } finally { store.close(); } assert.equal(fixture.watches.size, 0);
});

test('inventory administration requires admin auth, uses a fresh version, and couples every save to its audit', async () => {
  const fixture = new CommerceFirestoreFixture(); const app = express(); app.use(express.json());
  app.use(createInventoryRouter({ getDb: () => fixture.db, requireAdmin: (req, res, next) => {
    if (req.headers.authorization !== 'Bearer admin-fixture') return res.status(403).json({ code: 'FORBIDDEN_ADMIN' });
    (req as any).user = { uid: 'fixture-admin' }; next();
  } }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); const url = `http://127.0.0.1:${(server.address() as any).port}/api/admin/inventory/pista`;
  try {
    assert.equal((await fetch(url)).status, 403);
    const result = await fetch(url, { headers: { Authorization: 'Bearer admin-fixture' } }); assert.equal(result.headers.get('cache-control'), 'private, no-store');
    const { record } = await result.json(); assert.equal(record.available, 9999);
    const next = await updateInventory({ db: fixture.db, id: 'pista', actorUid: 'fixture-admin', body: { expectedVersion: record.version, inventory: { mode: 'tracked', available: 1000 }, reason: 'Counted stock today' } });
    assert.equal(next.available, 1000); await create(fixture);
    await assert.rejects(updateInventory({ db: fixture.db, id: 'pista', actorUid: 'fixture-admin', body: { expectedVersion: next.version, inventory: { mode: 'tracked', available: 1000 }, reason: 'Stale counted stock' } }), errorCode('INVENTORY_CONFLICT'));
    const current = await (await fetch(url, { headers: { Authorization: 'Bearer admin-fixture' } })).json(); fixture.failAudit = true;
    await assert.rejects(updateInventory({ db: fixture.db, id: 'pista', actorUid: 'fixture-admin', body: { expectedVersion: current.record.version, inventory: { mode: 'tracked', available: 1500 }, reason: 'Atomic counted stock' } }), /Audit failed/);
    assert.equal(fixture.records.get('catalogInventory/pista').available, 500);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('saved reward fulfilment is consistent in receipts, WhatsApp text and allowlisted n8n envelopes', async () => {
  const fixture = new CommerceFirestoreFixture({ [`users/${uid}/activeRewards/fixture-voucher`]: voucher() }); const created = await create(fixture, { rewardId: 'fixture-voucher' });
  const saved = fixture.records.get(`orders/${created.orderId}`) as CanonicalOrder;
  const receipt = sanitizeOrderForCustomer(saved); assert.equal(receipt.rewardApplication?.sample?.grams, 50);
  assert.match(generateAuthoritativeWhatsAppMessage(saved), /free 50g/i);
  const app = { ...saved.rewardApplication, privateStaffNote: 'hidden-private-staff', loyaltyPoints: 4567 };
  assert.doesNotMatch(JSON.stringify(sanitizeRewardApplication(app)), /hidden-private-staff|loyaltyPoints/);
  assert.deepEqual(rewardPackingLines({ ...app, status: 'RESTORED' }), []);
  const wire = projectCanonicalOrderForN8n({ ...saved, rewardApplication: app } as any); assert.deepEqual(wire.rewardApplication, rewardFulfillmentNote(app));
  assert.doesNotMatch(JSON.stringify(wire), /activeRewardId|pointsCost|expiresAt|inventoryReservation|hidden-private-staff/);
  let requestBody = '';
  await sendOrderToN8n(wire, { config: { enabled: true, timeoutMs: 1000, webhookUrl: 'https://fixture.example/order', webhookSecret: 'fixture-secret' }, eventId: 'fixture-event', fetchImpl: (async (_url: string, init: any) => { requestBody = init.body; return Response.json({ ok: true, orderId: saved.orderId, mirrorStored: true }); }) as any });
  assert.equal(JSON.parse(requestBody).order.rewardApplication.sample.grams, 50); assert.doesNotMatch(requestBody, /activeRewardId|inventoryReservation|hidden-private-staff/);
});

test('all commerce copy has complete English, Urdu and Arabic translations', () => {
  for (const language of ['ur', 'ar'] as const) {
    assert.deepEqual(Object.keys(commerceTranslations[language]).sort(), Object.keys(commerceTranslations.en).sort());
    for (const value of Object.values(commerceTranslations[language])) assert.ok(value.trim());
  }
  assert.equal(rewardCancellationOutcome(undefined, 'ORDER_RECEIVED', now), null);
  const ordinary = validateAndPriceOrder({ catalog: PRODUCTS, items: payload().items, city: 'Karachi', shippingMethodId: 'standard' });
  const app = apply('cashew_sample', structuredClone(ordinary));
  assert.notEqual(quoteFingerprint(ordinary), quoteFingerprint({ ...ordinary, rewardApplication: app }));
});
