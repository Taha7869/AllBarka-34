import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import CustomWeightInput from '../src/components/CustomWeightInput';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { PRODUCTS } from '../src/data/products';
import type { Product } from '../src/types';
import { getCustomWeightLabel, resolveCustomWeight, resolveProductPrice, resolveProductVariant, supportsCustomWeight } from '../src/lib/productVariants';
import { resolveCartIdentity, resolveCartPortion, resolveCartUnitPrice } from '../src/lib/cartInput';
import { cartLines, readSharedCart, savedBoxes, validateCartLines } from '../src/lib/savedCarts';
import { getCartShippingWeightGrams, getProductShippingWeightGrams } from '../src/lib/shippingPolicy';
import { validateAndPriceOrder, ValidationError } from '../src/lib/orderValidation';
import { createDurableOrder } from '../src/lib/orderDatabase';
import { hashPayload } from '../src/lib/serverOrderService';

const base = PRODUCTS.find(product => product.id === 'pista')!;
const configured: Product = { ...base, allowCustomWeight: true, pricePer100g: 103, minCustomWeightG: 100, maxCustomWeightG: 5000 };
const isCode = (code: string) => (error: unknown) => error instanceof ValidationError && error.code === code;
const line = (productId: string, selectedWeight: string, quantity = 1) => ({ productId, selectedWeight, quantity });

test('product weight control shows the minimum error and a live rounded price only for eligible dry items', () => {
  const render = (product: Product, grams: string) => renderToString(React.createElement(LanguageProvider, null,
    React.createElement(CustomWeightInput, { product, selected: true, grams, onSelect: () => {}, onChange: () => {} })));
  assert.match(render(configured, '50'), /Minimum 100g required/);
  assert.match(render(configured, '350'), /Rs\. <!-- -->365/);
  assert.doesNotMatch(render(PRODUCTS.find(product => product.id === 'oil-blackseed')!, '350'), /Custom weight/);
  assert.doesNotMatch(render(PRODUCTS.find(product => product.id === 'bundle-daily-grind')!, '350'), /Custom weight/);
});

test('custom portions allow only integer 100–5000g choices in 50g steps, with canonical labels', () => {
  for (const grams of [100, 150, 350, 4950, 5000]) {
    const variant = resolveCustomWeight(configured, grams);
    assert.equal(variant.label, `Custom ${grams}g`);
    assert.equal(variant.weightGrams, grams);
    assert.equal(variant.isCustom, true);
    assert.equal(getCustomWeightLabel(grams), variant.label);
  }
  for (const input of [0, 50, 99, 101, 125, 5001, 5050, 350.5, Infinity, NaN, null, undefined, {}, [], '3.5', '-100', '350kg', '350g+tin']) {
    assert.throws(() => resolveCustomWeight(configured, input), isCode('INVALID_CUSTOM_WEIGHT'));
  }
  assert.throws(() => resolveCustomWeight(configured, 50), /Minimum 100g required/);
  for (const input of ['350', '350g', 'Custom 350g', ' custom 350g ']) {
    assert.equal(resolveCustomWeight(configured, input).label, 'Custom 350g');
  }
});

test('custom pricing rounds up to Rs.5 from the canonical per100g rate and respects tighter catalogue limits', () => {
  assert.equal(resolveCustomWeight(configured, 350).price, 365);
  assert.equal(resolveCustomWeight(configured, 100).price, 105);
  assert.equal(resolveCustomWeight(configured, 5000).price, 5150);
  assert.equal(resolveCustomWeight({ ...configured, pricePer100g: 100 }, 350).price, 350);
  const narrower = { ...configured, minCustomWeightG: 200, maxCustomWeightG: 1000 };
  assert.throws(() => resolveCustomWeight(narrower, 100), isCode('INVALID_CUSTOM_WEIGHT'));
  assert.throws(() => resolveCustomWeight(narrower, 1050), isCode('INVALID_CUSTOM_WEIGHT'));
  assert.equal(resolveCustomWeight(narrower, 200).price, 210);
});

test('oil, fixed bundles, inactive, quote-only and explicitly disabled products cannot accept custom grams', () => {
  for (const override of [{ category: 'oils' }, { category: 'bundles' }, { category: 'gift-boxes' },
    { isBundle: true }, { quoteOnly: true }, { active: false }, { allowCustomWeight: false },
    { pricePer100g: 0 }, { pricePer100g: NaN }]) {
    const product = { ...configured, ...override };
    assert.equal(supportsCustomWeight(product), false);
    assert.throws(() => resolveCustomWeight(product, 350), isCode('CUSTOM_WEIGHT_UNAVAILABLE'));
    assert.equal(resolveProductVariant(product, 'Custom 350g'), null);
  }
  for (const product of PRODUCTS.filter(product => product.category === 'oils' || product.isBundle || product.quoteOnly)) {
    assert.equal(supportsCustomWeight(product), false, product.id);
  }
});

test('fixed variants retain their prices and only canonical configured bundle mass is accepted', () => {
  assert.equal(resolveProductPrice(configured, '250g'), configured.prices['250g']);
  assert.equal(resolveProductPrice(configured, '350g'), null);
  assert.equal(resolveProductPrice(configured, 'Custom 350g'), 365);
  assert.equal(resolveProductPrice(configured, '__proto__'), null);
  const bundle = { ...configured, category: 'bundles', isBundle: true, prices: { Bundle: 2400 }, shippingWeights: { Bundle: 750 } };
  assert.deepEqual(resolveProductVariant(bundle, 'Bundle'), { label: 'Bundle', price: 2400, weightGrams: 750, isCustom: false });
  assert.equal(resolveProductVariant({ ...bundle, shippingWeights: {} }, 'Bundle')?.weightGrams, null);
  assert.equal(resolveProductVariant({ ...bundle, active: false }, 'Bundle'), null);
  assert.equal(resolveProductVariant({ ...bundle, quoteOnly: true }, 'Bundle'), null);
});

test('cart add, restore, and reorder resolve exact custom composite IDs and ignore injected retail prices', () => {
  const identity = resolveCartIdentity({ id: 'pista-Custom 350g' }, [configured]);
  assert.equal(identity?.productId, 'pista');
  assert.equal(identity?.portion, 'Custom 350g');
  assert.equal(resolveCartPortion(identity?.product, identity?.portion), 'Custom 350g');
  assert.equal(resolveCartIdentity({ id: 'pista-Custom 350g', productId: 'pista' }, [configured])?.portion, 'Custom 350g');
  assert.equal(resolveCartUnitPrice(configured, 'Custom 350g', 1), 365);
  assert.equal(resolveCartUnitPrice(configured, 'Custom 350g', 999999), 365);
  assert.equal(resolveCartPortion(configured, 'Custom 125g'), null);
  const invalidRestored = resolveCartIdentity({ id: 'pista-Custom 125g' }, [configured]);
  assert.equal(invalidRestored?.productId, 'pista');
  assert.equal(resolveCartPortion(invalidRestored?.product, invalidRestored?.portion), null);
  assert.equal(resolveCartPortion({ ...configured, active: false }, '250g'), null);
  assert.equal(resolveCartPortion({ ...configured, quoteOnly: true }, '250g'), null);
  assert.notEqual(`${configured.id}-350g`, `${configured.id}-${getCustomWeightLabel(350)}`);
});

test('saved and shared boxes preserve supported custom quantities without any stale prices or client weight flags', () => {
  const customLine = { productId: 'pista', weight: 'Custom 350g', quantity: 3 };
  assert.deepEqual(readSharedCart(JSON.stringify([{ ...customLine, price: 1, shippingWeightGrams: 1 }]), [configured]), [customLine]);
  assert.deepEqual(validateCartLines([{ ...customLine, quantity: 40 }, { ...customLine, quantity: 30 }], [configured]), [{ ...customLine, quantity: 50 }]);
  assert.deepEqual(savedBoxes([{ id: 'custom-box', name: 'Office', lines: [customLine] }], [configured])[0].lines, [customLine]);
  assert.deepEqual(cartLines([{ productId: 'pista', selectedWeight: customLine.weight, quantity: 3 }] as never, [configured]), [customLine]);
  for (const weight of ['Custom 99g', 'Custom 125g', 'Custom 5050g', '350g']) {
    assert.deepEqual(validateCartLines([{ ...customLine, weight }], [configured]), []);
  }
  assert.deepEqual(validateCartLines([customLine], [{ ...configured, quoteOnly: true }]), []);
});

test('authoritative custom prices, quantity and actual shipping mass come only from the catalogue', () => {
  const product = PRODUCTS.find(product => product.id === 'pista')!;
  assert.equal(supportsCustomWeight(product), true);
  const variant = resolveCustomWeight(product, 350);
  const order = validateAndPriceOrder({ city: 'Karachi', shippingMethodId: 'standard', isWholesale: true,
    items: [{ ...line(product.id, variant.label, 3), price: 1, unitPrice: 1, shippingWeightGrams: 0,
      customWeightGrams: 1, pricePer100g: 1, allowCustomWeight: true }, line('oil-almond', '100ml', 2)] });
  assert.equal(order.items[0].price, variant.price);
  assert.equal(order.items[0].selectedWeight, 'Custom 350g');
  assert.equal(order.items[0].id, 'pista-Custom 350g');
  assert.equal(order.items[0].quantity, 3);
  assert.equal(order.summary.shippingWeightGrams, 1250);
  assert.equal(order.summary.shipping, 313);
  assert.equal(order.summary.total, order.summary.subtotal + 313);
  assert.equal(getProductShippingWeightGrams(product.id, 'Custom 350g'), 350);
  assert.equal(getCartShippingWeightGrams([{ id: 'pista-Custom 350g', selectedWeight: 'Custom 350g', quantity: 3 }]), 1050);
  assert.equal(getProductShippingWeightGrams('oil-almond', 'Custom 350g'), null);
  assert.throws(() => validateAndPriceOrder({ city: 'Karachi', shippingMethodId: 'standard',
    items: [{ ...line('oil-almond', 'Custom 350g'), allowCustomWeight: true, pricePer100g: 1 }] }), isCode('CUSTOM_WEIGHT_UNAVAILABLE'));
});

test('server rejects malformed custom portions, bad quantities, and quote-only products without a purchase path', () => {
  for (const portion of ['Custom 50g', 'Custom 125g', 'Custom 5050g', 'Custom 350.5g']) {
    assert.throws(() => validateAndPriceOrder({ city: 'Lahore', shippingMethodId: 'standard',
      items: [line('pista', portion)] }), isCode('INVALID_CUSTOM_WEIGHT'));
  }
  for (const quantity of [0, -1, 51, 1.5, Infinity]) {
    assert.throws(() => validateAndPriceOrder({ city: 'Lahore', shippingMethodId: 'standard',
      items: [line('pista', 'Custom 350g', quantity)] }), isCode('INVALID_QUANTITY'));
  }
  const quoteOnly = PRODUCTS.find(product => product.quoteOnly);
  assert.ok(quoteOnly);
  assert.throws(() => validateAndPriceOrder({ city: 'Lahore', shippingMethodId: 'standard', discountCode: 'CANCER',
    items: [line(quoteOnly.id, 'Bundle')] }), isCode('QUOTE_REQUIRED'));
});

test('unknown bundle mass blocks nationwide purchase but a nonpaying quote remains available', () => {
  const bundle = PRODUCTS.find(product => product.id === 'bundle-immunity-shield');
  assert.ok(bundle);
  const originalWeight = bundle.shippingWeightG;
  const originalPortionWeights = bundle.shippingWeights;
  delete bundle.shippingWeightG;
  bundle.shippingWeights = {};
  try {
    const portion = Object.keys(bundle.prices)[0];
    assert.equal(getProductShippingWeightGrams(bundle.id, portion), null);
    assert.throws(() => validateAndPriceOrder({ city: 'Karachi', shippingMethodId: 'standard', items: [line(bundle.id, portion)] }), isCode('SHIPPING_WEIGHT_UNAVAILABLE'));
    const quote = validateAndPriceOrder({ city: 'Karachi', shippingMethodId: 'standard', discountCode: 'CANCER', items: [line(bundle.id, portion)] });
    assert.equal(quote.summary.isQuoteRequest, true);
    for (const field of ['subtotal', 'discount', 'discountedSubtotal', 'shipping', 'giftWrapFee', 'total', 'shippingWeightGrams'] as const) {
      assert.equal(quote.summary[field], 0, field);
    }
  } finally {
    bundle.shippingWeightG = originalWeight;
    bundle.shippingWeights = originalPortionWeights;
  }
});

function mockDatabase() {
  const records = new Map<string, any>();
  function collection(path: string): any { return { doc: (id: string) => ({ key: `${path}/${id}`, collection: (name: string) => collection(`${path}/${id}/${name}`) }) }; }
  return { records, db: { collection, runTransaction: async (run: (transaction: any) => Promise<unknown>) => {
    const pending: Array<() => void> = [];
    const result = await run({
      get: async (ref: any) => ({ exists: records.has(ref.key), data: () => records.get(ref.key) }),
      set: (ref: any, value: unknown) => pending.push(() => { records.set(ref.key, value); }),
      update: (ref: any, value: unknown) => pending.push(() => { records.set(ref.key, { ...records.get(ref.key), ...value as object }); }),
    });
    pending.forEach(write => write()); return result;
  } } };
}

test('durable checkout and repeated submissions retain the canonical custom portion, price and shipping', async () => {
  const mock = mockDatabase();
  const payload = { name: 'Test Customer', phone: '03001234567', address: 'Local test address only', city: 'Karachi', paymentMethod: 'cod',
    shippingMethodId: 'standard', items: [{ ...line('pista', 'Custom 600g', 2), unitPrice: 1, shippingWeightGrams: 1 }] };
  const canonicalPrice = resolveCustomWeight(base, 600).price;
  const order = await createDurableOrder({ db: mock.db as never, payload, uid: null, idempotencyKey: 'custom-weight-test' });
  const persisted = mock.records.get(`orders/${order.orderId}`);
  assert.equal(persisted.items[0].selectedWeight, 'Custom 600g');
  assert.equal(persisted.items[0].price, canonicalPrice);
  assert.equal(persisted.items[0].quantity, 2);
  assert.equal(persisted.totals.subtotal, canonicalPrice * 2);
  assert.equal(persisted.totals.shippingWeightGrams, 1200);
  assert.equal(persisted.totals.shipping, 300);
  assert.equal(order.deliverySchedule?.shippingFee, 300);
  const duplicate = await createDurableOrder({ db: mock.db as never, payload, uid: null, idempotencyKey: 'custom-weight-test' });
  assert.equal(duplicate.orderId, order.orderId);
  assert.deepEqual(duplicate.totals, order.totals);
  assert.equal(hashPayload({ ...payload, items: [{ ...payload.items[0], unitPrice: 999999 }] }), hashPayload(payload));
  assert.notEqual(hashPayload({ ...payload, items: [line('pista', 'Custom 650g', 2)] }), hashPayload(payload));
});
