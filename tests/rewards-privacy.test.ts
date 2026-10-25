import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import type { Firestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../src/data/products';
import { REWARDS } from '../src/data/rewards';
import { applyPatronReward, supportedPatronReward } from '../src/lib/rewardPolicy';
import { redeemPatronReward } from '../src/lib/loyaltyRedemption';
import { createDurableOrder } from '../src/lib/orderDatabase';
import { sanitizeOrderForCustomer } from '../src/lib/serverOrderService';
import { fetchLoyaltyProfile, redeemLoyaltyReward } from '../src/lib/loyaltyClient';
import { rewardTranslations } from '../src/contexts/rewardTranslations';
import { quoteOrderForCustomer } from '../src/lib/orderQuote';

const issued = (rewardId = 'free_shipping', overrides = {}) => ({ rewardId, rewardType: rewardId === 'free_shipping' ? 'SHIPPING' : 'PACKAGING', status: 'ACTIVE', claimedAt: Date.now() - 1000, expiresAt: Date.now() + 86400000, ...overrides });
const summary = { subtotal: 2500, discountedSubtotal: 2500, discount: 0, shipping: 150, giftWrapFee: 0, total: 2650 };
const code = (expected: string) => (error: any) => error.code === expected;

class FakeFirestore {
  records = new Map<string, any>();
  failPath = '';
  private tail: Promise<unknown> = Promise.resolve();
  constructor() { for (const product of PRODUCTS) this.records.set(`products/${product.id}`, structuredClone(product)); }
  collection(path: string, filter?: [string, unknown], cap = Infinity): any {
    const db = this;
    return { path, query: true, filter, cap,
      doc: (id: string) => ({ path: `${path}/${id}`, get: async () => db.snapshot(`${path}/${id}`), collection: (sub: string) => db.collection(`${path}/${id}/${sub}`) }),
      where: (field: string, _operator: string, value: unknown) => db.collection(path, [field, value], cap),
      limit: (limit: number) => db.collection(path, filter, limit),
    };
  }
  snapshot(path: string): any {
    const data = this.records.get(path);
    return { id: path.split('/').pop(), ref: { path }, exists: data !== undefined, data: () => structuredClone(data) };
  }
  async getAll(...references: any[]) { return references.map(reference => this.snapshot(reference.path)); }
  async runTransaction<T>(callback: (transaction: any) => Promise<T>): Promise<T> {
    const operation = async () => {
      const pending: Array<{ path: string; data: any; merge: boolean }> = [];
      const read = async (ref: any): Promise<any> => {
        assert.equal(pending.length, 0, 'Reads must precede every write');
        if (!ref.query) return this.snapshot(ref.path);
        const docs = [...this.records.keys()].filter(path => path.startsWith(`${ref.path}/`) && !path.slice(ref.path.length + 1).includes('/'))
          .map(path => this.snapshot(path)).filter(doc => !ref.filter || doc.data()[ref.filter[0]] === ref.filter[1]).slice(0, ref.cap);
        return { docs, empty: docs.length === 0 };
      };
      const write = (ref: any, data: any, options?: { merge: boolean }) => {
        if (this.failPath && ref.path.includes(this.failPath)) throw new Error('Simulated write failure');
        pending.push({ path: ref.path, data: structuredClone(data), merge: options?.merge ?? false });
      };
      const result = await callback({ get: read, getAll: (...refs: any[]) => Promise.all(refs.map(read)), set: write,
        update: (ref: any, data: any) => write(ref, data, { merge: true }) });
      for (const update of pending) this.records.set(update.path, update.merge ? { ...this.records.get(update.path), ...update.data } : update.data);
      return result;
    };
    const run = this.tail.then(operation, operation);
    this.tail = run.catch(() => {});
    return run;
  }
  get db(): Firestore { return this as unknown as Firestore; }
}
const payload = (rewardId: string, overrides = {}) => ({ name: 'Test Patron', phone: '03001234567', address: 'Gulberg III, Main Road', city: 'Lahore', paymentMethod: 'cod', shippingMethodId: 'standard', items: [{ productId: 'pista', selectedWeight: '500g', quantity: 1 }], rewardId, ...overrides });

test('unsupported reward fulfillment is unavailable before any points can be spent', async () => {
  const store = new FakeFirestore(); store.records.set('users/patron', { loyaltyPoints: 5000 });
  for (const rewardId of ['cashew_sample', 'pista_sample', 'unknown']) {
    assert.throws(() => supportedPatronReward(rewardId), code('REWARD_UNAVAILABLE'));
    await assert.rejects(redeemPatronReward({ db: store.db, uid: 'patron', rewardId, requestId: 'request-0000000001' }), code('REWARD_UNAVAILABLE'));
  }
  assert.equal(store.records.get('users/patron').loyaltyPoints, 5000);
  assert.equal(REWARDS.filter(reward => reward.active).length, 2);
});

test('Lahore standard reward preserves national, express, threshold, expiry and minimum rules', () => {
  const apply = (options = {}) => applyPatronReward({ reward: issued(), summary, city: 'Lahore', shippingMethodId: 'standard', ...options });
  assert.equal(apply().summary.total, 2500);
  assert.equal(apply().rewardDiscount, 150);
  assert.equal(summary.shipping, 150, 'Input quote stays immutable');
  assert.throws(() => apply({ city: 'Karachi' }), code('SHIPPING_REWARD_LAHORE_ONLY'));
  assert.throws(() => apply({ shippingMethodId: 'express' }), code('REWARD_STANDARD_SHIPPING_ONLY'));
  assert.throws(() => apply({ reward: issued('free_shipping', { expiresAt: 1 }) }), code('REWARD_EXPIRED'));
  assert.throws(() => apply({ summary: { ...summary, discountedSubtotal: 1999 } }), code('REWARD_MINIMUM_NOT_MET'));
  assert.throws(() => apply({ summary: { ...summary, shipping: 0, total: 2500 } }), code('REWARD_NO_BENEFIT'));
  assert.throws(() => apply({ reward: issued('free_shipping', { status: 'USED' }) }), code('REWARD_ALREADY_USED'));
  assert.throws(() => apply({ summary: { ...summary, isQuoteRequest: true } }), code('REWARD_QUOTE_UNAVAILABLE'));
});

test('packaging grants a real free packed benefit with or without the gift checkbox', () => {
  const result = applyPatronReward({ reward: issued('gift_packaging'), summary, city: 'Karachi' });
  assert.equal(result.summary.freeGiftWrap, true);
  assert.equal(result.summary.total, 2650);
  assert.equal(result.rewardDiscount, 250);
  const selected = applyPatronReward({ reward: issued('gift_packaging'), summary: { ...summary, giftWrapFee: 250, total: 2900 }, city: 'Lahore' });
  assert.equal(selected.summary.total, 2650);
  assert.throws(() => applyPatronReward({ reward: issued('gift_packaging'), summary: { ...summary, freeGiftWrap: true }, city: 'Lahore' }), code('REWARD_NO_BENEFIT'));
});

test('redemption replay and simultaneous requests deduct once; active and insufficient guards preserve points', async () => {
  const store = new FakeFirestore(); store.records.set('users/patron', { loyaltyPoints: 1000 });
  const redeem = (requestId = 'same-request-00000001') => redeemPatronReward({ db: store.db, uid: 'patron', rewardId: 'free_shipping', requestId });
  const [one, two] = await Promise.all([redeem(), redeem()]);
  assert.equal(one.activeReward.id, two.activeReward.id);
  assert.equal(two.duplicate, true);
  assert.equal(store.records.get('users/patron').loyaltyPoints, 700);
  assert.equal([...store.records.keys()].filter(path => path.includes('/loyaltyTransactions/')).length, 1);
  await assert.rejects(redeem('new-request-00000001'), code('ACTIVE_REWARD_EXISTS'));
  store.records.set('users/poor', { loyaltyPoints: 1 });
  await assert.rejects(redeemPatronReward({ db: store.db, uid: 'poor', rewardId: 'free_shipping', requestId: 'poor-request-0000001' }), code('INSUFFICIENT_POINTS'));
  assert.equal(store.records.get('users/poor').loyaltyPoints, 1);
});

test('expired rewards stop blocking issuance and failed issuance commits no point deduction', async () => {
  const store = new FakeFirestore(); store.records.set('users/patron', { loyaltyPoints: 1000 });
  store.records.set('users/patron/activeRewards/old', issued('free_shipping', { expiresAt: 1 }));
  store.failPath = '/activeRewards/';
  const redeem = () => redeemPatronReward({ db: store.db, uid: 'patron', rewardId: 'free_shipping', requestId: 'valid-request-0000001' });
  await assert.rejects(redeem(), /Simulated write failure/);
  assert.equal(store.records.get('users/patron').loyaltyPoints, 1000);
  assert.equal(store.records.get('users/patron/activeRewards/old').status, 'ACTIVE');
  store.failPath = ''; await redeem();
  assert.equal(store.records.get('users/patron/activeRewards/old').status, 'EXPIRED');
  assert.equal(store.records.get('users/patron').loyaltyPoints, 700);
});

test('order atomically applies and consumes shipping reward, and old idempotent receipt survives consumption and price changes', async () => {
  const store = new FakeFirestore(); store.records.set('users/patron/activeRewards/benefit', issued());
  const input = { db: store.db, uid: 'patron', payload: payload('benefit'), idempotencyKey: 'saved-checkout', expectedFinalTotal: 2500 };
  const result = await createDurableOrder(input);
  assert.equal(result.totals.shipping, 0); assert.equal(result.totals.total, 2500);
  assert.equal(store.records.get('users/patron/activeRewards/benefit').status, 'USED');
  assert.equal(store.records.get(`orders/${result.orderId}`).rewardDiscount, 150);
  store.records.delete('products/pista');
  const duplicate = await createDurableOrder(input);
  assert.equal(duplicate.orderId, result.orderId); assert.equal(duplicate.isDuplicate, true);
  assert.equal(duplicate.totals.total, 2500);
});

test('reward cannot be double consumed by competing checkouts and failed order persistence leaves it active', async () => {
  const store = new FakeFirestore(); store.records.set('users/patron/activeRewards/benefit', issued());
  const create = (key: string) => createDurableOrder({ db: store.db, uid: 'patron', payload: payload('benefit'), idempotencyKey: key });
  store.failPath = 'orderEvents/';
  await assert.rejects(create('failed-order'), /Simulated write failure/);
  assert.equal(store.records.get('users/patron/activeRewards/benefit').status, 'ACTIVE');
  assert.equal([...store.records.keys()].filter(path => path.startsWith('orders/')).length, 0);
  store.failPath = '';
  const attempts = await Promise.allSettled([create('first-order'), create('second-order')]);
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal([...store.records.keys()].filter(path => path.startsWith('orders/')).length, 1);
});

test('packaging order records packing instructions and never waives nationwide delivery', async () => {
  const store = new FakeFirestore(); store.records.set('users/patron/activeRewards/packaging', issued('gift_packaging'));
  const result = await createDurableOrder({ db: store.db, uid: 'patron', payload: payload('packaging', { city: 'Karachi' }), idempotencyKey: 'packaged-order' });
  assert.equal(result.totals.shipping, 250);
  const saved = store.records.get(`orders/${result.orderId}`);
  assert.equal(saved.gifting.giftWrapping, true); assert.equal(saved.gifting.giftWrapFee, 0);
  assert.equal(saved.freeGiftWrap, true); assert.equal(saved.rewardDiscount, 250);
});

test('authoritative quote and final order apply identical supported reward benefits', async () => {
  for (const rewardId of ['free_shipping', 'gift_packaging']) {
    const store = new FakeFirestore(); store.records.set('users/patron/activeRewards/benefit', issued(rewardId));
    const customerPayload = payload('benefit', { giftWrapping: true });
    const quote = await quoteOrderForCustomer(store.db, customerPayload, { uid: 'patron' });
    const order = await createDurableOrder({ db: store.db, uid: 'patron', payload: customerPayload, expectedFinalTotal: quote.totals.total });
    assert.deepEqual(order.totals, quote.totals);
  }
});

test('quote-change, wrong owner, destination and expired reward failures never consume the reward', async () => {
  for (const [overrides, expected, uid, total] of [
    [{ city: 'Karachi' }, 'SHIPPING_REWARD_LAHORE_ONLY', 'patron', undefined],
    [{}, 'QUOTE_CHANGED', 'patron', 100],
    [{}, 'REWARD_NOT_FOUND', 'other', undefined],
    [{}, 'REWARD_REQUIRES_AUTH', null, undefined],
  ] as const) {
    const store = new FakeFirestore(); store.records.set('users/patron/activeRewards/benefit', issued());
    await assert.rejects(createDurableOrder({ db: store.db, uid, payload: payload('benefit', overrides), expectedFinalTotal: total }), code(expected));
    assert.equal(store.records.get('users/patron/activeRewards/benefit').status, 'ACTIVE');
  }
});

test('customer API sanitation excludes private staff fields and rules deny all direct canonical reads', () => {
  const source = { schemaVersion: '2', orderId: 'AB-PRIVATE', createdAt: '', status: 'ORDER_RECEIVED', uid: 'patron',
    paymentMethod: 'cod', paymentStatus: 'UNPAID', customer: { name: 'Patron', phone: '', address: '', city: 'Lahore' },
    gifting: { giftWrapping: false, giftWrapFee: 0 }, items: [], totals: summary,
    adminNotes: ['private'], adminNoteEntries: [{ actorUid: 'staff', text: 'private' }], integrationNotes: 'internal',
    claimTokenHash: 'secret', guestSessionId: 'private', earnedPoints: 0 } as any;
  const safe = sanitizeOrderForCustomer(source) as any;
  for (const key of ['uid', 'adminNotes', 'adminNoteEntries', 'integrationNotes', 'claimTokenHash', 'guestSessionId']) assert.equal(key in safe, false);
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /match \/orders\/\{orderId\}\s*\{\s*allow read, write: if false;/);
  assert.doesNotMatch(rules, /request\.time\s*</);
  const lounge = readFileSync('src/components/PatronLoungeModal.tsx', 'utf8');
  assert.doesNotMatch(lounge, /runTransaction|firebase\/firestore/);
  assert.match(lounge, /\/api\/me\/orders/);
});

test('loyalty browser requests authenticate explicitly and retain redemption idempotency identifier', async () => {
  const requests: any[] = [];
  const request = async (url: unknown, init: any) => { requests.push([url, init]); return new Response(JSON.stringify(init.method === 'POST' ? { success: true } : { loyaltyPoints: 20, transactions: [], activeRewards: [] })); };
  const user = { getIdToken: async () => 'verified-user-token' };
  await fetchLoyaltyProfile(user, undefined, request as typeof fetch);
  await redeemLoyaltyReward(user, 'free_shipping', 'stable-request-000001', request as typeof fetch);
  for (const [, init] of requests) { assert.equal(init.headers.Authorization, 'Bearer verified-user-token'); assert.equal(init.credentials, 'omit'); assert.equal(init.cache, 'no-store'); }
  assert.deepEqual(JSON.parse(requests[1][1].body), { rewardId: 'free_shipping', requestId: 'stable-request-000001' });
  await assert.rejects(redeemLoyaltyReward(user, 'free_shipping', 'stable-request-000001', (async () => new Response('{"error":"No points"}', { status: 400 })) as typeof fetch), /No points/);
});

test('reward labels have matching non-empty English, Urdu and Arabic keys', () => {
  for (const language of ['ur', 'ar'] as const) assert.deepEqual(Object.keys(rewardTranslations[language]).sort(), Object.keys(rewardTranslations.en).sort());
  for (const dictionary of Object.values(rewardTranslations)) for (const text of Object.values(dictionary)) assert.ok(text.trim());
});
