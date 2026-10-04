import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { Firestore, FieldValue, GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { createDurableOrder } from '../src/lib/orderDatabase';
import { validateAndPriceOrder, ValidationError } from '../src/lib/orderValidation';
import { sanitizeFirestoreData } from '../src/lib/firestoreData';
import { evaluatePromo, STORE_COUPONS } from '../src/lib/couponEngine';
import { PROMO_CONFIG } from '../src/server/promoConfig';

const clone = <T>(value: T): T => value === undefined ? value : structuredClone(value);

/** Deliberately rejects undefined even when production enables ignoreUndefinedProperties. */
function assertNoUndefined(value: unknown, path = 'data', ancestors = new WeakSet<object>()): void {
  assert.notEqual(value, undefined, `Firestore cannot persist undefined at ${path}`);
  if (!value || typeof value !== 'object') return;
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return;
  assert.equal(ancestors.has(value), false, `Cyclic payload at ${path}`);
  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) assertNoUndefined(value[index], `${path}[${index}]`, ancestors);
  } else {
    for (const [key, child] of Object.entries(value)) assertNoUndefined(child, `${path}.${key}`, ancestors);
  }
  ancestors.delete(value);
}

/** Atomic, serializable transactions include query reads and enforce read-before-write. */
function strictFirestore(initial: Record<string, any> = {}) {
  const records = new Map<string, any>(Object.entries(clone(initial)));
  const committedWrites: Array<{ path: string; data: any }> = [];
  let attemptedWrites = 0;
  let transactionTail: Promise<unknown> = Promise.resolve();
  const reference = (path: string): any => ({ path, id: path.split('/').at(-1),
    get: async () => snapshot(path), collection: (name: string) => collection(`${path}/${name}`) });
  const snapshot = (path: string): any => ({ exists: records.has(path), id: path.split('/').at(-1), ref: reference(path),
    data: () => clone(records.get(path)) });
  const collection = (path: string): any => {
    const query = (filters: Array<[string, string, unknown]> = [], count = Infinity): any => ({
      queryPath: path,
      doc: (id: string) => reference(`${path}/${id}`),
      where: (field: string, operator: string, value: unknown) => query([...filters, [field, operator, value]], count),
      limit: (limit: number) => query(filters, limit),
      get: async () => {
        const docs = [...records.entries()].filter(([key]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/'))
          .filter(([, data]) => filters.every(([field, operator, value]) => {
            assert.equal(operator, '==', 'This test only expects equality eligibility queries');
            return data[field] === value;
          })).slice(0, count).map(([key]) => snapshot(key));
        return { empty: !docs.length, size: docs.length, docs };
      },
    });
    return query();
  };
  const db: any = { doc: reference, collection,
    runTransaction(callback: (transaction: any) => Promise<any>) {
      const operation = transactionTail.then(async () => {
        const pending: Array<{ path: string; data: any; merge: boolean }> = [];
        const stage = (document: any, data: any, merge: boolean) => {
          attemptedWrites++;
          assertNoUndefined(data, document.path);
          pending.push({ path: document.path, data: clone(data), merge });
        };
        const result = await callback({
          get: async (document: any) => {
            assert.equal(pending.length, 0, 'All Firestore reads must precede writes');
            return document.queryPath ? document.get() : snapshot(document.path);
          },
          set: (document: any, data: any, options?: { merge?: boolean }) => stage(document, data, options?.merge === true),
          update: (document: any, data: any) => { assert.ok(records.has(document.path)); stage(document, data, true); },
        });
        for (const write of pending) {
          const saved = write.merge ? { ...records.get(write.path), ...write.data } : write.data;
          assertNoUndefined(saved, write.path);
          records.set(write.path, saved); committedWrites.push({ path: write.path, data: write.data });
        }
        return result;
      });
      transactionTail = operation.then(() => undefined, () => undefined);
      return operation;
    },
  };
  return { db, records, committedWrites, get attemptedWrites() { return attemptedWrites; } };
}

const basePayload = (discountCode?: unknown, overrides: Record<string, unknown> = {}) => ({
  name: 'Offline Promo Tester', phone: '03001234567', address: 'House 10, Test Street', city: 'Lahore',
  paymentMethod: 'cod', shippingMethodId: 'standard', items: [{ productId: 'pista', selectedWeight: '250g', quantity: 1, price: 1 }],
  ...(discountCode === undefined ? {} : { discountCode }), ...overrides,
});
const merchandise = (productId: string, selectedWeight: string, quantity = 1) => [{ productId, selectedWeight, quantity, price: 1 }];
const savedOrder = (store: ReturnType<typeof strictFirestore>, orderId: string) => store.records.get(`orders/${orderId}`);
const create = (store: ReturnType<typeof strictFirestore>, payload = basePayload(), uid: string | null = null, key: string = crypto.randomUUID()) =>
  createDurableOrder({ db: store.db, payload, uid, idempotencyKey: key });
const expectRejected = async (store: ReturnType<typeof strictFirestore>, payload: ReturnType<typeof basePayload>, code: string, uid: string | null = null) => {
  const before = store.attemptedWrites;
  await assert.rejects(create(store, payload, uid), (error: any) => error instanceof ValidationError && error.code === code && !!error.message);
  assert.equal(store.attemptedWrites, before, 'Rejected promos must never begin a Firestore write');
};
const moneyFields = ['subtotal', 'discount', 'discountedSubtotal', 'shipping', 'giftWrapFee', 'total'];

test('ALLBARKA10 regression saves a Rs125 discount without undefined in any atomic document', async () => {
  const store = strictFirestore();
  const result = await create(store, basePayload('  allbarka10  '), 'promo-customer');
  const order = savedOrder(store, result.orderId);
  assert.equal(result.totals.subtotal, 1250); assert.equal(result.totals.discount, 125);
  assert.equal(result.totals.shipping, 150); assert.equal(result.totals.total, 1275);
  assert.equal(order.promoCode, 'ALLBARKA10'); assert.equal(order.promoType, 'percent'); assert.equal(order.discountAmount, 125);
  assert.equal(order.freeShipping, false); assert.equal(order.freeGiftWrap, false); assert.equal(order.freeGift, false);
  for (const write of store.committedWrites) {
    assertNoUndefined(write.data, write.path);
    assert.equal(Object.hasOwn(write.data, 'maxDiscount'), false, 'Absent cap must not be persisted as undefined');
  }
  for (const prefix of ['orders/', 'coupons/', 'couponRedemptions/', 'checkoutIntents/', 'orderEvents/', 'whatsappPhoneOrders/', 'customerOrderHistory/']) {
    assert.ok(store.committedWrites.some(write => write.path.startsWith(prefix)), `Expected atomic ${prefix} write`);
  }
  assert.equal(store.records.get('coupons/ALLBARKA10').usedCount, 1);
});

test('uncapped BULK10 configuration omits its absent cap and can save every document', async () => {
  assert.equal(Object.hasOwn(STORE_COUPONS.BULK10, 'maxDiscount'), false);
  assertNoUndefined(STORE_COUPONS.BULK10);
  const store = strictFirestore();
  const result = await create(store, basePayload('BULK10', { items: merchandise('pista', '1kg', 3) }));
  assert.equal(result.totals.discount, 1500); assert.equal(result.totals.total, 13500);
  for (const write of store.committedWrites) assertNoUndefined(write.data, write.path);
});

test('ISHAQUEAHMAD caps the configured ten-percent discount at Rs1000 on Rs15000', async () => {
  const store = strictFirestore();
  const result = await create(store, basePayload('ISHAQUEAHMAD', { items: merchandise('pista', '1kg', 3) }));
  assert.equal(result.totals.subtotal, 15000); assert.equal(result.totals.discount, 1000); assert.equal(result.totals.total, 14000);
});

test('FRIEND rejects a canonical Rs1500 bag before writes and grants Rs200 on Rs2500', async () => {
  const rejected = strictFirestore();
  await expectRejected(rejected, basePayload('FRIEND', { items: merchandise('alubukhara', '250g', 3) }), 'PROMO_MIN_ORDER');
  assert.equal(rejected.records.size, 0);
  const store = strictFirestore();
  const result = await create(store, basePayload('FRIEND', { items: merchandise('pista', '500g') }));
  assert.equal(result.totals.subtotal, 2500); assert.equal(result.totals.discount, 200); assert.equal(result.totals.total, 2450);
});

test('ZAFRANI grants zero shipping outside Lahore only from the explicit server promotion', async () => {
  const store = strictFirestore();
  const result = await create(store, basePayload('ZAFRANI', { city: 'Karachi' }));
  const order = savedOrder(store, result.orderId);
  assert.equal(result.totals.shipping, 0); assert.equal(result.totals.total, 1250); assert.equal(order.freeShipping, true);
  assert.equal(order.deliverySchedule.shippingFee, 0);
  const ordinary = validateAndPriceOrder(basePayload(undefined, { city: 'Karachi', freeShipping: true }) as any);
  assert.equal(ordinary.summary.shipping, 250); assert.equal(ordinary.summary.freeShipping, false);
});

test('GIFTBOX and MYSTERY persist packing benefits with zero monetary discount', async () => {
  for (const code of ['GIFTBOX', 'MYSTERY']) {
    const store = strictFirestore();
    const result = await create(store, basePayload(code, { giftWrapping: false, giftMessage: 'Offline test greeting' }));
    const order = savedOrder(store, result.orderId);
    assert.equal(result.totals.discount, 0); assert.equal(order.promoCode, code);
    if (code === 'GIFTBOX') {
      assert.equal(order.freeGiftWrap, true); assert.equal(order.gifting.giftWrapping, true);
      assert.equal(order.gifting.giftWrapFee, 0); assert.equal(order.totals.giftWrapFee, 0);
    } else assert.equal(order.freeGift, true);
    assert.equal(order.discountAmount, 0);
  }
});

test('no-promo orders save explicit neutral fields and internally consistent totals', async () => {
  const store = strictFirestore(); const result = await create(store);
  const order = savedOrder(store, result.orderId);
  assert.equal(order.promoCode, null); assert.equal(order.promoType, null); assert.equal(order.discountAmount, 0);
  for (const flag of ['freeShipping', 'freeGiftWrap', 'freeGift', 'isQuoteRequest']) assert.equal(order[flag], false);
  assert.equal(order.orderType, 'ORDER'); assert.equal(order.paymentStatus, 'UNPAID');
  assert.equal(order.totals.subtotal - order.totals.discount + order.totals.shipping + order.totals.giftWrapFee, order.totals.total);
});

test('CANCER saves a real quote request without payment, zero totals and a normal website outbox event', async () => {
  const store = strictFirestore();
  const { paymentMethod: _payment, ...payload } = basePayload('CANCER', { giftWrapping: true });
  const result = await create(store, payload as ReturnType<typeof basePayload>);
  const order = savedOrder(store, result.orderId);
  assert.match(result.orderId, /^AB-\d{8}-[A-F0-9]{6}$/);
  assert.equal(result.status, 'QUOTE_REQUESTED'); assert.equal(result.orderType, 'QUOTE_REQUEST');
  assert.equal(order.status, 'QUOTE_REQUESTED'); assert.equal(order.orderType, 'QUOTE_REQUEST');
  assert.equal(order.paymentMethod, 'quote'); assert.equal(order.paymentStatus, 'NOT_REQUIRED');
  for (const key of moneyFields) assert.equal((result.totals as any)[key], 0, `${key} must be zero on a quote request`);
  assert.equal(order.earnedPoints, 0); assert.equal(Object.hasOwn(order, 'deliverySchedule'), false);
  assert.match(result.whatsappMessage, /personalized rate/i);
  const events = [...store.records.values()].filter(record => record.eventType === 'ORDER_CREATED');
  assert.equal(events.length, 1); assert.equal(events[0].payload.source, 'website');
  assert.equal(events[0].payload.status, 'QUOTE_REQUESTED'); assert.equal(events[0].payload.total, 0);
  assert.equal(result.claimToken!.length > 20, true);
});

test('invalid, inactive, multiple and malformed codes fail with a clear validation error before writes', async () => {
  for (const [code, reason] of [['UNKNOWN', 'INVALID_PROMO'], ['EID15', 'PROMO_INACTIVE'],
    ['ALLBARKA10,FRIEND', 'ONE_PROMO_ONLY'], ['WELCOME10 FRIEND', 'ONE_PROMO_ONLY'], [{ code: 'ALLBARKA10' }, 'INVALID_PROMO_FORMAT']] as const) {
    const store = strictFirestore(); await expectRejected(store, basePayload(code), reason); assert.equal(store.records.size, 0);
  }
});

test('expiry is validated even when an otherwise valid server promotion is active', () => {
  assert.throws(() => evaluatePromo({ ...PROMO_CONFIG.ALLBARKA10, expiresAt: 1000 }, 1250, { now: 1000 }),
    (error: any) => error instanceof ValidationError && error.code === 'PROMO_EXPIRED');
  assert.equal(evaluatePromo({ ...PROMO_CONFIG.ALLBARKA10, expiresAt: 1000 }, 1250, { now: 999 }).discountAmount, 125);
  assert.equal(evaluatePromo({ ...PROMO_CONFIG.ALLBARKA10, expiresAt: null }, 1250, { now: 999999 }).discountAmount, 125);
});

test('WELCOME10 rejects historical orders found through the transactional Firestore query', async () => {
  const store = strictFirestore({ 'orders/legacy-before-history-marker': { uid: 'returning-customer', status: 'DELIVERED' } });
  await expectRejected(store, basePayload('WELCOME10'), 'PROMO_FIRST_ORDER_ONLY', 'returning-customer');
});

test('WELCOME10 rejects a second order after a normal first order and requires verified account identity', async () => {
  const store = strictFirestore(); await create(store, basePayload(), 'existing-customer');
  await expectRejected(store, basePayload('WELCOME10'), 'PROMO_FIRST_ORDER_ONLY', 'existing-customer');
  const guest = strictFirestore(); await expectRejected(guest, basePayload('WELCOME10'), 'PROMO_REQUIRES_AUTH');
});

test('WELCOME10 retries return the original durable order without consuming another redemption', async () => {
  const store = strictFirestore(); const payload = basePayload('WELCOME10');
  const first = await create(store, payload, 'new-customer', 'stable-first-order-intent');
  const written = store.committedWrites.length;
  const retry = await create(store, payload, 'new-customer', 'stable-first-order-intent');
  assert.equal(first.totals.discount, 125); assert.equal(retry.orderId, first.orderId); assert.equal(retry.isDuplicate, true);
  assert.equal(store.committedWrites.length, written); assert.equal(store.records.get('coupons/WELCOME10').usedCount, 1);
  assert.equal([...store.records.keys()].filter(path => path.startsWith('couponRedemptions/')).length, 1);
});

test('competing WELCOME10 transactions accept only one first order for the same account', async () => {
  const store = strictFirestore();
  const results = await Promise.allSettled([create(store, basePayload('WELCOME10'), 'race-customer', 'race-intent-one'),
    create(store, basePayload('WELCOME10'), 'race-customer', 'race-intent-two')]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof ValidationError); assert.equal(rejected.reason.code, 'PROMO_FIRST_ORDER_ONLY');
  assert.equal([...store.records.keys()].filter(path => path.startsWith('orders/')).length, 1);
  const historyPath = `customerOrderHistory/${crypto.createHash('sha256').update('race-customer').digest('hex')}`;
  assert.equal(store.records.get(historyPath).orderCount, 1); assert.equal(store.records.get('coupons/WELCOME10').usedCount, 1);
});

test('forged coupon documents, prices and benefit flags cannot replace server promotion definitions', async () => {
  const store = strictFirestore({ 'coupons/ALLBARKA10': { usedCount: 8, active: false, value: 99, maxDiscount: 999999,
    discountMode: 'free_shipping', freeGift: true, firstOrderOnly: false } });
  const result = await create(store, basePayload('ALLBARKA10', { discountAmount: 1249, freeShipping: true, freeGiftWrap: true,
    freeGift: true, promoType: 'free_gift', subtotal: 1, shipping: 0, total: 1, maxDiscount: 999999 }));
  const order = savedOrder(store, result.orderId);
  assert.equal(result.totals.subtotal, 1250); assert.equal(result.items[0].price, 1250); assert.equal(result.totals.discount, 125);
  assert.equal(result.totals.shipping, 150); assert.equal(order.promoType, 'percent');
  assert.equal(order.freeShipping, false); assert.equal(order.freeGiftWrap, false); assert.equal(order.freeGift, false);
  assert.equal(store.records.get('coupons/ALLBARKA10').usedCount, 9);
});

test('sanitation strips nested absent properties and handles sparse arrays without flattening SDK values', () => {
  const firestore = new Firestore({ projectId: 'allbarka-offline-test', ignoreUndefinedProperties: false });
  const date = new Date('2026-10-04T00:00:00.000Z'); const timestamp = Timestamp.fromDate(date);
  const point = new GeoPoint(31.5, 74.3); const sentinel = FieldValue.serverTimestamp(); const reference = firestore.doc('offline/test');
  const sparse = new Array(3); sparse[1] = { present: 1, absent: undefined };
  const source = { omit: undefined, nested: { keep: null, omit: undefined }, sparse, date, timestamp, point, sentinel, reference };
  const clean = sanitizeFirestoreData(source);
  assert.equal(Object.hasOwn(clean, 'omit'), false); assert.deepEqual(clean.nested, { keep: null });
  assert.deepEqual(clean.sparse, [null, { present: 1 }, null]); assertNoUndefined(clean);
  for (const key of ['date', 'timestamp', 'point', 'sentinel', 'reference'] as const) assert.equal(clean[key], source[key]);
  assert.equal(Object.hasOwn(source, 'omit'), true); assert.equal(source.sparse[0], undefined, 'Source must not be mutated');
  const cyclic: any = {}; cyclic.self = cyclic; assert.throws(() => sanitizeFirestoreData(cyclic), /Cyclic/);
});

test('actual Firestore SDK validation and serialization accept the saved ALLBARKA10 document offline', async () => {
  const store = strictFirestore(); const result = await create(store, basePayload('ALLBARKA10'));
  const order = savedOrder(store, result.orderId);
  const require = createRequire(import.meta.url);
  // Test-only SDK internals perform the same synchronous preflight as DocumentReference.set, without a network write.
  const { validateDocumentData } = require(path.join(path.dirname(require.resolve('@google-cloud/firestore')), 'write-batch.js'));
  assert.throws(() => validateDocumentData('data', { nested: { maxDiscount: undefined } }, false, false), /undefined/);
  assert.doesNotThrow(() => validateDocumentData('data', order, false, false));
  const firestore = new Firestore({ projectId: 'allbarka-offline-test', ignoreUndefinedProperties: false });
  const encoded = (firestore as any)._serializer.encodeFields(order);
  assert.equal(encoded.promoCode.stringValue, 'ALLBARKA10'); assert.equal(Number(encoded.discountAmount.integerValue), 125);
  assert.equal(Number(encoded.totals.mapValue.fields.total.integerValue), 1275);
});
