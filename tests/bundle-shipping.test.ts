import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import type { Product } from '../src/types';
import { resolveProductVariant } from '../src/lib/productVariants';
import { getCartShippingWeightGrams, getProductShippingWeightGrams } from '../src/lib/shippingPolicy';
import { calculateOrderSummary } from '../src/lib/pricing';
import { validateAndPriceOrder, ValidationError } from '../src/lib/orderValidation';
import { createDurableOrder } from '../src/lib/orderDatabase';

// Independent owner-provided packing masses; edit these expectations only when the tariff inputs change.
const approvedWeights: Record<string, number> = {
  'bundle-daily-grind': 900,
  'bundle-brain-fuel': 1100,
  'bundle-winter-warrior': 1500,
  'bundle-immunity-shield': 800,
  'bundle-sunrise-seeds': 800,
  'bundle-royal-feast': 2500,
  'bundle-silver-hamper': 1500,
  'bundle-gold-hamper': 2500,
  'bundle-platinum-hamper': 4000,
  'bundle-ramadan-ready': 2000,
  'bundle-mystery-box': 1200,
  'bundle-tasting-flight': 500,
};
const line = (productId: string, quantity = 1) => ({ productId, selectedWeight: 'Bundle', quantity });
const bundle = (id: string) => {
  const product = PRODUCTS.find(item => item.id === id);
  assert.ok(product, `Missing bundle ${id}`);
  return product;
};
const isCode = (code: string) => (error: unknown) => error instanceof ValidationError && error.code === code;
const tariff = (grams: number) => Math.max(250, Math.round(grams * 250 / 1000));
const destination = {
  name: 'Test Customer', phone: '03001234567', address: 'Local test address only',
  city: 'Karachi', paymentMethod: 'cod', shippingMethodId: 'standard',
};

test('all twelve payable bundles expose their exact owner-declared gross shipping weight', () => {
  const payableBundles = PRODUCTS.filter(product => product.category === 'bundles' && !product.quoteOnly);
  assert.equal(payableBundles.length, Object.keys(approvedWeights).length);
  for (const [id, grams] of Object.entries(approvedWeights)) {
    const product = bundle(id);
    assert.equal(product.shippingWeightG, grams, id);
    assert.equal(getProductShippingWeightGrams(id, 'Bundle'), grams, id);
    assert.equal(resolveProductVariant(product, 'Bundle')?.weightGrams, grams, id);
    assert.equal(product.allowCustomWeight, false, id);
  }
});

test('nationwide bundle quotes and cart estimates use the minimum and proportional actual weight tariff', () => {
  for (const [id, grams] of Object.entries(approvedWeights)) {
    const product = bundle(id);
    for (const shippingMethodId of ['standard', 'express', 'sameday'] as const) {
      const canonical = validateAndPriceOrder({ city: 'Islamabad', shippingMethodId, items: [line(id)] });
      const estimate = calculateOrderSummary({ city: 'Islamabad', shippingMethodId,
        items: [{ ...line(id), unitPrice: product.prices.Bundle }] });
      assert.equal(canonical.summary.shippingWeightGrams, grams, id);
      assert.equal(canonical.summary.shipping, tariff(grams), id);
      assert.equal(estimate.shipping, canonical.summary.shipping, id);
      assert.equal(canonical.summary.total, product.prices.Bundle + tariff(grams), id);
    }
  }
  assert.equal(tariff(900), 250);
  assert.equal(tariff(1100), 275);
  assert.equal(tariff(1200), 300);
  assert.equal(tariff(1500), 375);
});

test('quantity, mixed dry custom portions and oil mass add once, ignoring all client shipping fields', () => {
  const items = [
    { ...line('bundle-brain-fuel', 2), shippingWeightG: 1, shippingWeightGrams: 0, weightGrams: 1, price: 1 },
    { productId: 'pista', selectedWeight: 'Custom 350g', quantity: 2, shippingWeightG: 1, price: 1 },
    { productId: 'oil-almond', selectedWeight: '100ml', quantity: 3, shippingWeightG: 1, price: 1 },
  ];
  const forgedRequest = { ...destination, shippingWeightG: 1, shippingWeightGrams: 0,
    shipping: 0, total: 1, items };
  const order = validateAndPriceOrder(forgedRequest);
  assert.equal(getCartShippingWeightGrams(items), 3200);
  assert.equal(getCartShippingWeightGrams([{ id: 'bundle-brain-fuel-Bundle', selectedWeight: 'Bundle', quantity: 2 }]), 2200);
  assert.equal(order.summary.shippingWeightGrams, 3200);
  assert.equal(order.summary.shipping, 800);
  assert.equal(order.summary.total, order.summary.subtotal + 800);
  assert.equal(order.items[0].price, bundle('bundle-brain-fuel').prices.Bundle);
});

test('gross bundle shippingWeightG overrides content mass; invalid declarations never fall back', () => {
  const product = { ...bundle('bundle-daily-grind'), shippingWeights: { Bundle: 750 } };
  assert.equal(resolveProductVariant(product, 'Bundle')?.weightGrams, 900);
  for (const shippingWeightG of [0, -1, NaN, Infinity, -Infinity, null, '900']) {
    const invalid = { ...product, shippingWeightG } as unknown as Product;
    assert.equal(resolveProductVariant(invalid, 'Bundle')?.weightGrams, null, String(shippingWeightG));
  }
  const legacy = { ...product };
  delete legacy.shippingWeightG;
  assert.equal(resolveProductVariant(legacy, 'Bundle')?.weightGrams, 750);
  assert.equal(resolveProductVariant({ ...legacy, shippingWeights: {} }, 'Bundle')?.weightGrams, null);
});

function fakeFirestore() {
  const records = new Map<string, any>();
  const writes: string[] = [];
  function collection(path: string): any {
    return { doc: (id: string) => ({ key: `${path}/${id}`, collection: (name: string) => collection(`${path}/${id}/${name}`) }) };
  }
  const db = { collection, runTransaction: async (run: (transaction: any) => Promise<unknown>) => {
    const pending: Array<() => void> = [];
    const result = await run({
      get: async (ref: any) => ({ exists: records.has(ref.key), data: () => records.get(ref.key) }),
      create: function(ref, data) { return this.set(ref, data); }, set: (ref: any, value: unknown) => pending.push(() => { records.set(ref.key, value); writes.push(ref.key); }),
      update: (ref: any, value: unknown) => pending.push(() => { records.set(ref.key, { ...records.get(ref.key), ...value as object }); writes.push(ref.key); }),
    });
    pending.forEach(write => write());
    return result;
  } };
  return { db, records, writes };
}

test('every payable bundle completes durable nationwide checkout and idempotent retry without duplicate writes', async context => {
  for (const [id, grams] of Object.entries(approvedWeights)) {
    await context.test(id, async () => {
      const fake = fakeFirestore();
      const payload = { ...destination, items: [{ ...line(id), price: 1, shippingWeightG: 1, shippingWeightGrams: 1 }] };
      const response = await createDurableOrder({ db: fake.db as never, payload, uid: null, idempotencyKey: `bundle-shipping-${id}` });
      const stored = fake.records.get(`orders/${response.orderId}`);
      assert.ok(response.orderId);
      assert.equal(response.status, 'ORDER_RECEIVED');
      assert.equal(response.orderType, 'ORDER');
      assert.equal(stored.items[0].price, bundle(id).prices.Bundle);
      assert.equal(stored.totals.shippingWeightGrams, grams);
      assert.equal(stored.totals.shipping, tariff(grams));
      assert.equal(stored.totals.total, bundle(id).prices.Bundle + tariff(grams));
      assert.equal(response.deliverySchedule?.shippingFee, stored.totals.shipping);
      assert.match(response.whatsappMessage, /Delivery billing weight:/);
      const beforeRetry = fake.writes.length;
      const duplicate = await createDurableOrder({ db: fake.db as never, payload, uid: null, idempotencyKey: `bundle-shipping-${id}` });
      assert.equal(duplicate.isDuplicate, true);
      assert.equal(duplicate.orderId, response.orderId);
      assert.deepEqual(duplicate.totals, response.totals);
      assert.equal(fake.writes.length, beforeRetry);
      assert.equal([...fake.records.keys()].filter(key => key.startsWith('orders/')).length, 1);
    });
  }
});

test('Corporate Gifting remains quote-only and cannot write a paid nationwide order', async () => {
  const corporate = bundle('corporate-gifting');
  assert.equal(corporate.quoteOnly, true);
  assert.equal(corporate.shippingWeightG, undefined);
  assert.equal(getProductShippingWeightGrams(corporate.id, 'Bundle'), null);
  const fake = fakeFirestore();
  await assert.rejects(createDurableOrder({ db: fake.db as never, uid: null, idempotencyKey: 'corporate-no-purchase',
    payload: { ...destination, items: [line(corporate.id)] } }), isCode('QUOTE_REQUIRED'));
  assert.equal(fake.writes.length, 0);
});
