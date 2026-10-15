import assert from 'node:assert/strict';
import test from 'node:test';
import { PROMO_CONFIG } from '../src/server/promoConfig';
import { calculateCouponDiscount, evaluatePromo, getPromo, NO_PROMO, normalizePromoCode, STORE_COUPONS } from '../src/lib/couponEngine';
import { ValidationError } from '../src/lib/validationError';
import { claimWelcomeVoucher } from '../src/lib/welcomeCouponService';

const hasCode = (code: string) => (error: unknown) => error instanceof ValidationError && error.code === code;
const apply = (code: unknown, subtotal: number) => evaluatePromo(getPromo(code), subtotal);

function assertNoUndefined(value: unknown, path = 'payload'): void {
  assert.notEqual(value, undefined, path);
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) assertNoUndefined(child, `${path}.${key}`);
  }
}

test('central server config contains exactly the ten approved promo definitions and omits absent fields', () => {
  assert.deepEqual(Object.keys(PROMO_CONFIG), ['ISHAQUEAHMAD', 'ALLBARKA10', 'ZAFRANI', 'GIFTBOX', 'MYSTERY', 'FRIEND', 'WELCOME10', 'BULK10', 'EID15', 'CANCER']);
  assert.equal(PROMO_CONFIG.ALLBARKA10.maxDiscount, 500);
  assert.equal(Object.hasOwn(PROMO_CONFIG.BULK10, 'maxDiscount'), false);
  assert.equal(Object.hasOwn(STORE_COUPONS.BULK10, 'maxDiscount'), false);
  assertNoUndefined(PROMO_CONFIG);
  assertNoUndefined(STORE_COUPONS);
  assert.equal(Object.isFrozen(PROMO_CONFIG), true);
  assert.equal(Object.isFrozen(PROMO_CONFIG.ALLBARKA10), true);
});

test('codes are case-insensitive and whitespace is trimmed; absent codes have full safe defaults', () => {
  assert.equal(normalizePromoCode('  allbarka10  '), 'ALLBARKA10');
  assert.equal(getPromo(' ishaqueahmad ')?.code, 'ISHAQUEAHMAD');
  for (const value of [undefined, null, '', ' \t\n ']) {
    assert.equal(getPromo(value), null);
    assert.deepEqual(apply(value, 1250), NO_PROMO);
    assertNoUndefined(apply(value, 1250));
  }
});

test('one-promo limit rejects arrays, objects, non-string inputs, and multi-code syntax', () => {
  for (const value of [['ALLBARKA10'], ['ALLBARKA10', 'FRIEND'], {}, 10, true]) {
    assert.throws(() => getPromo(value), hasCode('INVALID_PROMO_FORMAT'));
  }
  for (const value of ['ALLBARKA10 FRIEND', 'ALLBARKA10,FRIEND', 'ALLBARKA10+FRIEND', 'ALLBARKA10/FRIEND', 'ALLBARKA10;FRIEND', 'ALLBARKA10|FRIEND']) {
    assert.throws(() => getPromo(value), hasCode('ONE_PROMO_ONLY'));
  }
  assert.throws(() => getPromo('X'.repeat(65)), hasCode('INVALID_PROMO_FORMAT'));
  assert.throws(() => getPromo('<script>'), hasCode('INVALID_PROMO_FORMAT'));
  assert.throws(() => getPromo('UNKNOWN'), hasCode('INVALID_PROMO'));
  assert.throws(() => getPromo('__proto__'), hasCode('INVALID_PROMO_FORMAT'));
});

test('ALLBARKA10 regression: Rs. 1250 saves Rs. 125 and all output fields are Firestore-safe', () => {
  const result = apply('ALLBARKA10', 1250);
  assert.deepEqual(result, {
    promoCode: 'ALLBARKA10', promoType: 'percent', promoValue: 10,
    discountAmount: 125, freeShipping: false, freeGiftWrap: false, freeGift: false, isQuoteRequest: false,
  });
  assertNoUndefined(result);
  assert.equal(apply('ALLBARKA10', 15000).discountAmount, 500);
});

test('ISHAQUEAHMAD caps Rs. 15000 order at Rs. 1000, while BULK10 remains uncapped', () => {
  assert.equal(apply('ISHAQUEAHMAD', 15000).discountAmount, 1000);
  assert.equal(apply('BULK10', 15000).discountAmount, 1500);
  assert.equal(apply('BULK10', 5000).discountAmount, 500);
  assert.throws(() => apply('BULK10', 4999), hasCode('PROMO_MIN_ORDER'));
});

test('FRIEND rejects Rs. 1500 and applies Rs. 200 at or above Rs. 2000', () => {
  assert.throws(() => apply('FRIEND', 1500), hasCode('PROMO_MIN_ORDER'));
  assert.equal(apply('FRIEND', 2000).discountAmount, 200);
  assert.equal(apply('FRIEND', 2500).discountAmount, 200);
});

test('shipping, gift wrap, free gift and quote codes return only their own effect flag', () => {
  const expected = [
    ['ZAFRANI', 'free_shipping', 'freeShipping'],
    ['GIFTBOX', 'free_giftwrap', 'freeGiftWrap'],
    ['MYSTERY', 'free_gift', 'freeGift'],
    ['CANCER', 'quote', 'isQuoteRequest'],
  ] as const;
  for (const [code, type, flag] of expected) {
    const result = apply(code, 1250);
    assert.equal(result.promoType, type);
    assert.equal(result.discountAmount, 0);
    for (const key of ['freeShipping', 'freeGiftWrap', 'freeGift', 'isQuoteRequest'] as const) assert.equal(result[key], key === flag);
    assert.equal(Object.hasOwn(result, 'promoValue'), false);
    assertNoUndefined(result);
  }
});

test('WELCOME10 requires verified identity and an explicit first-order Firestore eligibility result', () => {
  const promo = getPromo('WELCOME10');
  assert.throws(() => evaluatePromo(promo, 1250), hasCode('PROMO_REQUIRES_AUTH'));
  assert.throws(() => evaluatePromo(promo, 1250, { hasPastOrders: false }), hasCode('PROMO_REQUIRES_AUTH'));
  assert.throws(() => evaluatePromo(promo, 1250, { identityVerified: true }), hasCode('PROMO_HISTORY_REQUIRED'));
  assert.throws(() => evaluatePromo(promo, 1250, { identityVerified: true, hasPastOrders: true }), hasCode('PROMO_FIRST_ORDER_ONLY'));
  assert.equal(evaluatePromo(promo, 1250, { identityVerified: true, hasPastOrders: false }).discountAmount, 125);
  assert.equal(evaluatePromo(promo, 15000, { identityVerified: true, hasPastOrders: false }).discountAmount, 500);
});

test('inactive codes and expired promotions produce clear validation errors; null expiry remains valid', () => {
  assert.throws(() => apply('EID15', 1250), hasCode('PROMO_INACTIVE'));
  const promo = { ...PROMO_CONFIG.ALLBARKA10, expiresAt: 1000 };
  assert.equal(evaluatePromo(promo, 1250, { now: 999 }).discountAmount, 125);
  assert.throws(() => evaluatePromo(promo, 1250, { now: 1000 }), hasCode('PROMO_EXPIRED'));
  assert.throws(() => evaluatePromo(promo, 1250, { now: 1001 }), hasCode('PROMO_EXPIRED'));
  assert.equal(evaluatePromo({ ...promo, expiresAt: null }, 1250, { now: 1001 }).discountAmount, 125);
});

test('invalid subtotal is rejected and a discount can never exceed subtotal', () => {
  for (const subtotal of [NaN, Infinity, -1]) assert.throws(() => apply('ALLBARKA10', subtotal), hasCode('INVALID_PROMO_SUBTOTAL'));
  assert.equal(evaluatePromo({ ...PROMO_CONFIG.FRIEND, minOrder: 0 }, 50).discountAmount, 50);
  assert.equal(apply('ALLBARKA10', 0).discountAmount, 0);
});

test('legacy calculation resolves approved built-ins from config instead of trusting persisted overrides', () => {
  const forged = { ...STORE_COUPONS.ALLBARKA10, discountMode: 'flat' as const, value: 10000, maxDiscount: 10000 };
  assert.deepEqual(calculateCouponDiscount(forged, 1250), { discount: 125 });
  assert.ok(calculateCouponDiscount({ ...STORE_COUPONS.WELCOME200, active: true }, 2500).error);
  assert.ok(calculateCouponDiscount(STORE_COUPONS.WELCOME10, 2500, 'verified-uid').error);
});

test('inactive legacy WELCOME200 entitlement stays inert and performs no Firestore operation', async () => {
  const db = { collection() { throw new Error('Inactive promo must not touch Firestore'); } };
  const result = await claimWelcomeVoucher(db as never, 'patron');
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'PROMOTION_INACTIVE');
  assert.equal(Object.hasOwn(result, 'couponCode'), false);
  assertNoUndefined(result);
});
