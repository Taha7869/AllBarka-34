import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { calculateShipping, calculateOrderSummary, getCartShippingWeightGrams, getProductShippingWeightGrams, isLahoreCity, sanitizePrice } from '../src/lib/pricing';
import { validateShippingRewardDestination } from '../src/lib/shippingPolicy';
import { validateAndPriceOrder, validateCustomerDetails, ValidationError } from '../src/lib/orderValidation';
import { calculateDeliverySchedule } from '../src/lib/deliveryCalendar';
import { createDurableOrder } from '../src/lib/orderDatabase';
import { hashPayload } from '../src/lib/serverOrderService';
import { resolveHamper, type HamperConfiguration } from '../src/lib/hamperCatalog';

const line = (productId: string, selectedWeight: string, quantity = 1) => ({ productId, selectedWeight, quantity });
const mixed = [line('badam', '1kg'), line('oil-almond', '100ml', 2)];
const destination = { name: 'Test Customer', phone: '03001234567', address: 'Local test address only', city: 'Karachi', paymentMethod: 'cod' };
const isCode = (code: string) => (error: unknown) => error instanceof ValidationError && error.code === code;

test('outside Lahore charges proportional billing mass with a minimum, regardless of method or basket value', () => {
  for (const method of ['standard', 'express', 'sameday'] as const) {
    assert.equal(calculateShipping(10000, method, 0, 'Karachi', 250), 250);
    assert.equal(calculateShipping(10000, method, 250, 'Islamabad', 1200), 300);
    assert.equal(calculateShipping(100, method, 0, 'Multan', 2500), 625);
    assert.equal(calculateShipping(0, method, 0, 'Rawalpindi', 1200), 300);
  }
});

test('Lahore threshold uses discounted merchandise only and preserves premium method rates', () => {
  assert.equal(calculateShipping(2999, 'standard', 250, 'Lahore', 1000), 150);
  assert.equal(calculateShipping(3000, 'standard', 0, ' LAHORE ', 1000), 0);
  assert.equal(calculateShipping(0, 'standard', 0, 'Lahore', 1000), 150);
  assert.equal(calculateShipping(4000, 'express', 0, 'Lahore', 1000), 350);
  assert.equal(calculateShipping(3000, 'sameday', 0, 'Lahore', 1000), 500);
  assert.equal(calculateShipping(3001, 'sameday', 0, 'Lahore', 1000), 300);
  assert.equal(calculateShipping(2800, 'sameday', 250, 'Lahore', 1000), 300);
  for (const city of ['Lahore', ' LAHORE ', 'لاہور', 'لاهور']) assert.equal(isLahoreCity(city), true);
  assert.equal(isLahoreCity('Lahore/Multan'), false);
});

test('canonical grams, quantities and paired bundles determine billing mass', () => {
  assert.equal(getCartShippingWeightGrams(mixed), 1200);
  assert.equal(getCartShippingWeightGrams([line('deal-1', 'Combo (500g + 500g)', 2), line('org-saffron', '3g', 2)]), 2006);
  assert.equal(getCartShippingWeightGrams([{ id: 'pista-500g', selectedWeight: '500g', quantity: 3 }]), 1500);
  assert.equal(getCartShippingWeightGrams([]), 0);
});

test('every canonical product portion has an explicit or unambiguous billing weight', () => {
  for (const product of PRODUCTS) {
    for (const portion of Object.keys(product.prices)) {
      const grams = getProductShippingWeightGrams(product.id, portion);
      assert.ok(grams !== null && grams > 0, `${product.id} ${portion} must have a billing weight`);
      if (product.id.startsWith('oil-')) assert.equal(grams, Number(portion.replace('ml', '')));
    }
  }
});

test('unknown products, forged portions and invalid quantities never produce a weight quote', () => {
  for (const items of [
    [line('missing', '1kg')], [line('pista', '100ml')], [line('pista', '500g+tin')],
    [line('pista', '250g', 0)], [line('pista', '250g', 1.2)], [line('pista', '250g', 51)],
    [line('custom-hamper-old', '5 × 200g')],
  ]) assert.equal(getCartShippingWeightGrams(items), null);
  assert.throws(() => calculateShipping(4000, 'standard', 0, 'Karachi', null), isCode('SHIPPING_WEIGHT_UNAVAILABLE'));
  assert.throws(() => calculateOrderSummary({ items: [{ price: 4000, quantity: 1 }], city: 'Karachi' }), isCode('SHIPPING_WEIGHT_UNAVAILABLE'));
});

test('server quote ignores forged price, shipping mass, and shipping totals', () => {
  const result = validateAndPriceOrder({
    city: 'Karachi', shippingMethodId: 'standard', discountCode: 'ALLBARKA10', giftWrapping: true,
    items: mixed.map(item => ({ ...item, price: 1, shippingWeightGrams: 0, shipping: 0 })),
  });
  const expectedSubtotal = mixed.reduce((sum, item) => sum + PRODUCTS.find(product => product.id === item.productId)!.prices[item.selectedWeight] * item.quantity, 0);
  assert.equal(result.summary.subtotal, expectedSubtotal);
  assert.equal(result.summary.discount, Math.round(expectedSubtotal * 0.1));
  assert.equal(result.summary.shippingWeightGrams, 1200);
  assert.equal(result.summary.shippingRegion, 'nationwide');
  assert.equal(result.summary.shipping, 300);
  assert.equal(result.summary.total, expectedSubtotal - result.summary.discount + 250 + 300);
});

test('quotes and order customer details require an explicit valid destination', () => {
  for (const city of [undefined, null, '', ' ', 'x', 'a'.repeat(61), 'Other City', 'Nationwide', ' Outside   Lahore ']) {
    assert.throws(() => validateAndPriceOrder({ city: city as string, shippingMethodId: 'standard', items: [line('pista', '250g')] }),
      isCode(typeof city === 'string' && city.length > 60 ? 'CITY_TOO_LONG' : 'INVALID_CITY'));
    assert.throws(() => validateCustomerDetails({ ...destination, city: city as string }),
      isCode(typeof city === 'string' && city.length > 60 ? 'CITY_TOO_LONG' : 'INVALID_CITY'));
  }
});

test('region-only cart estimates never become a valid destination for quotes or orders', () => {
  assert.equal(calculateShipping(10000, 'standard', 0, 'Other City', 1200), 300);
  assert.equal(calculateOrderSummary({ items: mixed, city: 'Other City' }).shipping, 300);
  assert.throws(() => validateAndPriceOrder({ city: 'Other City', shippingMethodId: 'standard', items: mixed }), isCode('INVALID_CITY'));
});

test('nonfinite prices and overflowing numeric strings cannot produce infinite order totals', () => {
  for (const amount of [Infinity, -Infinity, NaN, '9'.repeat(400)]) assert.equal(sanitizePrice(amount), 0);
  const summary = calculateOrderSummary({ items: [{ unitPrice: Infinity, quantity: 1 }] });
  assert.equal(summary.subtotal, 0);
  assert.equal(summary.total, 0);
});

test('wholesale cannot bypass canonical portion validation to obtain a false weight', () => {
  assert.throws(() => validateAndPriceOrder({ city: 'Karachi', shippingMethodId: 'standard', isWholesale: true,
    items: [line('pista', '1g')] }), isCode('INVALID_WEIGHT'));
});

test('delivery calendar uses the same fee as the authoritative quote without gift threshold drift', () => {
  const options = { city: 'Karachi', shippingMethodId: 'standard' as const, orderTimestamp: '2026-10-03T10:00:00Z' };
  assert.equal(calculateDeliverySchedule({ ...options, orderSubtotalNet: 10000, shippingWeightGrams: 1200 }).shippingFee, 300);
  assert.equal(calculateDeliverySchedule({ ...options, city: 'Lahore', orderSubtotalNet: 2800, giftWrapFee: 250, shippingWeightGrams: 1200 }).shippingFee, 150);
});

test('shipping rewards are restricted to Lahore without restricting sample rewards', () => {
  assert.throws(() => validateShippingRewardDestination({ rewardType: 'SHIPPING' }, 'Karachi'), isCode('SHIPPING_REWARD_LAHORE_ONLY'));
  assert.throws(() => validateShippingRewardDestination({ rewardId: 'free_shipping' }, 'Karachi'), isCode('SHIPPING_REWARD_LAHORE_ONLY'));
  assert.doesNotThrow(() => validateShippingRewardDestination({ rewardType: 'SHIPPING' }, 'Lahore'));
  assert.doesNotThrow(() => validateShippingRewardDestination({ rewardType: 'SAMPLE' }, 'Karachi'));
});

function mockDatabase(initial: Record<string, unknown> = {}) {
  const records = new Map<string, any>(Object.entries(initial));
  const writes: string[] = [];
  function collection(path: string): any {
    return { doc: (id: string) => {
      const key = `${path}/${id}`;
      return { key, collection: (name: string) => collection(`${key}/${name}`) };
    } };
  }
  return {
    records, writes,
    db: { collection, runTransaction: async (run: (transaction: any) => Promise<unknown>) => {
      const pending: Array<() => void> = [];
      const result = await run({
        get: async (ref: any) => ({ exists: records.has(ref.key), data: () => records.get(ref.key) }),
        set: (ref: any, value: unknown) => pending.push(() => { records.set(ref.key, value); writes.push(ref.key); }),
        update: (ref: any, value: unknown) => pending.push(() => { records.set(ref.key, { ...records.get(ref.key), ...value as object }); writes.push(ref.key); }),
      });
      pending.forEach(write => write());
      return result;
    } },
  };
}

test('persisted order, calendar and idempotent response retain the canonical destination tariff', async () => {
  const mock = mockDatabase();
  const payload = { ...destination, items: mixed, shippingMethodId: 'standard', giftWrapping: true };
  const quote = validateAndPriceOrder(payload);
  const order = await createDurableOrder({ db: mock.db as never, payload, uid: null, expectedFinalTotal: quote.summary.total, idempotencyKey: 'shipping-test' });
  const persisted = mock.records.get(`orders/${order.orderId}`);
  assert.equal(order.totals.shipping, 300);
  assert.equal(persisted.totals.shippingWeightGrams, 1200);
  assert.equal(order.deliverySchedule?.shippingFee, 300);
  assert.equal(persisted.deliverySchedule.shippingFee, persisted.totals.shipping);
  const duplicate = await createDurableOrder({ db: mock.db as never, payload, uid: null, idempotencyKey: 'shipping-test' });
  assert.equal(duplicate.orderId, order.orderId);
  assert.deepEqual(duplicate.totals, order.totals);
});

test('outside Lahore a shipping reward cannot be consumed or write an order', async () => {
  const key = 'users/test-customer/activeRewards/reward-1';
  const mock = mockDatabase({ [key]: { rewardType: 'SHIPPING', status: 'ACTIVE' } });
  await assert.rejects(createDurableOrder({ db: mock.db as never, uid: 'test-customer',
    payload: { ...destination, items: mixed, shippingMethodId: 'standard', rewardId: 'reward-1' }, idempotencyKey: 'reward-test' }), isCode('SHIPPING_REWARD_LAHORE_ONLY'));
  assert.equal(mock.records.get(key).status, 'ACTIVE');
  assert.deepEqual(mock.writes, []);
});

const hamperConfiguration: HamperConfiguration = { version: 1, boxId: 'box-velvet',
  selections: ['pista', 'kaju', 'badam'], recipientName: 'Gift Recipient', giftMessage: 'A thoughtful gift.' };
const hamper = { productId: 'custom-hamper', selectedWeight: 'fake 1g', quantity: 2,
  price: 1, shippingWeightGrams: 1, hamperConfiguration };

test('custom hampers use canonical packaging, contents price and mass despite forged client fields', () => {
  const result = validateAndPriceOrder({ city: 'Karachi', shippingMethodId: 'standard', items: [hamper], isWholesale: true });
  const expectedUnitPrice = 1400 + hamperConfiguration.selections.reduce((sum, id) => sum +
    Math.round(PRODUCTS.find(product => product.id === id)!.prices['250g'] * 200 / 250), 0);
  assert.equal(result.items[0].price, expectedUnitPrice);
  assert.equal(result.items[0].selectedWeight, '3 × 200g');
  assert.deepEqual(result.items[0].hamperConfiguration, hamperConfiguration);
  assert.equal(result.summary.subtotal, expectedUnitPrice * 2);
  assert.equal(result.summary.shippingWeightGrams, 1200);
  assert.equal(result.summary.shipping, 300);
  assert.equal(result.earnedPoints, 0);
});

test('invalid or obsolete hamper selections cannot reach an authoritative quote', () => {
  for (const configuration of [undefined, { ...hamperConfiguration, selections: ['pista', 'kaju', 'unknown'] },
    { ...hamperConfiguration, selections: ['pista', 'pista', 'badam'] }, { ...hamperConfiguration, boxId: 'forged-free-box' },
    { ...hamperConfiguration, giftMessage: 'x'.repeat(501) }]) {
    const invalid = { ...hamper, hamperConfiguration: configuration };
    assert.throws(() => validateAndPriceOrder({ city: 'Lahore', shippingMethodId: 'standard', items: [invalid] }), isCode('INVALID_HAMPER_CONFIGURATION'));
    assert.equal(getCartShippingWeightGrams([invalid] as never), null);
  }
});

test('hamper idempotency includes contents, box and card while ignoring client prices and selection ordering', () => {
  const payload = { ...destination, shippingMethodId: 'standard', items: [hamper] };
  const original = hashPayload(payload);
  assert.equal(hashPayload({ ...payload, items: [{ ...hamper, price: 9999,
    hamperConfiguration: { ...hamperConfiguration, selections: [...hamperConfiguration.selections].reverse() } }] }), original);
  for (const configuration of [{ ...hamperConfiguration, recipientName: 'Different Recipient' },
    { ...hamperConfiguration, selections: ['pista', 'kaju', 'akhroot'] },
    { ...hamperConfiguration, boxId: 'box-tin' }, { ...hamperConfiguration, giftMessage: 'Different message' }]) {
    assert.notEqual(hashPayload({ ...payload, items: [{ ...hamper, hamperConfiguration: configuration }] }), original);
  }
});

test('persisted hamper and WhatsApp packing details preserve complete normalized configuration', async () => {
  const mock = mockDatabase();
  const result = await createDurableOrder({ db: mock.db as never, uid: null,
    payload: { ...destination, shippingMethodId: 'standard', items: [hamper] }, idempotencyKey: 'hamper-test' });
  const persisted = mock.records.get(`orders/${result.orderId}`);
  assert.deepEqual(persisted.items[0].hamperConfiguration, resolveHamper(hamperConfiguration)!.configuration);
  assert.equal(persisted.totals.shipping, 300);
  assert.match(result.whatsappMessage, /Hamper contents:/);
  assert.match(result.whatsappMessage, /Gift card recipient: Gift Recipient/);
  assert.match(result.whatsappMessage, /Gift card message: A thoughtful gift\./);
  assert.match(result.whatsappMessage, /Delivery billing weight: 1\.2kg/);
});
