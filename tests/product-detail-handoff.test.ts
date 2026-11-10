import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import type { Product } from '../src/types';
import {
  availableDetailVariants,
  buildProductDetailsPath,
  readProductDetailHandoff,
} from '../src/lib/productDetailHandoff';

const source = PRODUCTS.find(product => product.id === 'pista')!;
assert.ok(source, 'the existing pista source fixture is present');

function food(overrides: Partial<Product> = {}): Product {
  return {
    ...source,
    id: 'handoff-food',
    category: 'dry-fruits',
    active: true,
    status: 'published',
    quoteOnly: false,
    orderMode: 'standard',
    isBidBox: false,
    isBundle: false,
    commerce: undefined,
    allowCustomWeight: false,
    minOrderQuantity: undefined,
    moqOverride: undefined,
    prices: { '250g': 1250, '500g': 2500 },
    variants: [
      { label: '250g', price: 1250, available: true },
      { label: '500g', price: 2500, available: true },
    ],
    ...overrides,
  };
}

function packaging(overrides: Partial<Product> = {}): Product {
  return food({
    id: 'handoff-packaging',
    category: 'celebration-boxes',
    isBidBox: true,
    prices: { 'Empty Pack (10 pcs)': 2000, 'Empty Box (1 pc)': 200 },
    variants: [
      { label: 'Empty Pack (10 pcs)', price: 2000, available: true },
      { label: 'Empty Box (1 pc)', price: 200, available: true },
    ],
    ...overrides,
  });
}

const params = (variant: string, quantity?: string) => new URLSearchParams({
  variant,
  ...(quantity === undefined ? {} : { quantity }),
});

test('fixed selection and quantity roundtrip using only their canonical URL fields', () => {
  const product = food();
  const path = buildProductDetailsPath(product, { variant: '500g', quantity: 4 });
  const url = new URL(path, 'https://store.example');
  assert.equal(url.pathname, '/product/handoff-food');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['quantity', 'variant']);
  assert.equal(url.searchParams.get('variant'), '500g');
  assert.equal(url.searchParams.get('quantity'), '4');
  assert.deepEqual(readProductDetailHandoff(product, url.searchParams), {
    requested: true, variant: '500g', quantity: 4, needsReview: false,
  });
  assert.doesNotMatch(path, /1250|2500|price|catalogRevision|name_en/);
});

test('product IDs and labels containing URL punctuation roundtrip without extra parameters', () => {
  const variant = 'Date + Nut & Seed (25 pcs)';
  const product = food({ id: 'gift/box ?&+', prices: { [variant]: 700 }, variants: [] });
  const path = buildProductDetailsPath(product, { variant, quantity: 2 });
  const url = new URL(path, 'https://store.example');
  assert.equal(url.pathname, '/product/gift%2Fbox%20%3F%26%2B');
  assert.match(url.search, /%2B/);
  assert.match(url.search, /%26/);
  assert.equal(url.hash, '');
  assert.equal(url.searchParams.size, 2);
  assert.deepEqual(readProductDetailHandoff(product, url.searchParams), {
    requested: true, variant, quantity: 2, needsReview: false,
  });
});

test('ordinary detail navigation does not request a handoff or override default MOQ behavior', () => {
  for (const product of [food(), packaging()]) {
    assert.deepEqual(readProductDetailHandoff(product, new URLSearchParams()), {
      requested: false, variant: null, quantity: 1, needsReview: false,
    });
  }
});

test('fixed options exclude disabled, missing, nonpositive, nonfinite and custom prices', () => {
  const product = food({
    allowCustomWeight: true,
    pricePer100g: 500,
    prices: { '250g': 1250, '500g': 2500, zero: 0, negative: -5, invalid: NaN, infinite: Infinity, 'Custom 100g': 500 },
    variants: [
      { label: '250g', price: 1250, available: true },
      { label: '500g', price: 2500, available: false },
      { label: 'unsaved', price: 800, available: true },
    ],
  });
  assert.deepEqual(availableDetailVariants(product), ['250g']);
  for (const variant of ['500g', 'zero', 'negative', 'invalid', 'infinite', 'Custom 100g', 'unsaved', 'unknown']) {
    assert.equal(buildProductDetailsPath(product, { variant, quantity: 2 }), '/product/handoff-food', variant);
    assert.deepEqual(readProductDetailHandoff(product, params(variant, '2')), {
      requested: true, variant: null, quantity: 1, needsReview: true,
    }, variant);
  }
});

test('nonpurchasable and custom-only products never offer a fixed handoff', () => {
  const customOnly = food({ commerce: {
    version: 1, kind: 'food', pricingMode: 'calculated', quantityMode: 'custom',
    baseQuantity: 100, baseUnit: 'g', basePrice: 500, options: [],
    custom: { unit: 'g', min: 100, max: 5000, step: 50, shippingWeightGPerUnit: 1 },
  } });
  const products = [
    food({ active: false }), food({ status: 'draft' }), food({ status: 'archived' }),
    food({ quoteOnly: true }), food({ orderMode: 'inquiry_quote' }), customOnly,
  ];
  for (const product of products) {
    assert.deepEqual(availableDetailVariants(product), []);
    assert.equal(buildProductDetailsPath(product, { variant: '250g', quantity: 2 }), '/product/handoff-food');
    const read = readProductDetailHandoff(product, params('250g', '2'));
    assert.equal(read.requested, true);
    assert.equal(read.variant, null);
    assert.equal(read.needsReview, true);
  }
});

test('missing or repeated variant requires review and uses the current default variant MOQ', () => {
  const product = packaging();
  const invalidParams = [
    new URLSearchParams('quantity=99'),
    params('', '99'),
    params('unknown', '99'),
    new URLSearchParams('variant=Empty+Pack+%2810+pcs%29&variant=Empty+Box+%281+pc%29&quantity=99'),
    new URLSearchParams('variant=Empty+Pack+%2810+pcs%29&variant=Empty+Pack+%2810+pcs%29&quantity=99'),
  ];
  for (const query of invalidParams) {
    assert.deepEqual(readProductDetailHandoff(product, query), {
      requested: true, variant: null, quantity: 3, needsReview: true,
    }, query.toString());
  }
});

test('missing quantity defaults to the selected variant minimum in packs rather than pieces', () => {
  assert.deepEqual(readProductDetailHandoff(packaging(), params('Empty Pack (10 pcs)')), {
    requested: true, variant: 'Empty Pack (10 pcs)', quantity: 3, needsReview: false,
  });
  assert.deepEqual(readProductDetailHandoff(packaging(), params('Empty Box (1 pc)')), {
    requested: true, variant: 'Empty Box (1 pc)', quantity: 25, needsReview: false,
  });
});

test('invalid quantity text and repeated quantities reset to current minimum with review', () => {
  const product = packaging();
  for (const quantity of ['', '0', '-1', '1.5', '1e2', 'Infinity', 'NaN', 'three', ' 4 ', '9007199254740992']) {
    assert.deepEqual(readProductDetailHandoff(product, params('Empty Pack (10 pcs)', quantity)), {
      requested: true, variant: 'Empty Pack (10 pcs)', quantity: 3, needsReview: true,
    }, JSON.stringify(quantity));
  }
  const duplicated = params('Empty Pack (10 pcs)', '4');
  duplicated.append('quantity', '4');
  assert.deepEqual(readProductDetailHandoff(product, duplicated), {
    requested: true, variant: 'Empty Pack (10 pcs)', quantity: 3, needsReview: true,
  });
});

test('safe integer quantities retain the original request in the URL and clamp on reading', () => {
  const cases = [
    { product: food(), variant: '500g', requested: 51, expected: 50, review: true },
    { product: food(), variant: '500g', requested: 50, expected: 50, review: false },
    { product: packaging(), variant: 'Empty Pack (10 pcs)', requested: 1, expected: 3, review: true },
    { product: packaging(), variant: 'Empty Pack (10 pcs)', requested: 10001, expected: 10000, review: true },
    { product: packaging(), variant: 'Empty Pack (10 pcs)', requested: 10000, expected: 10000, review: false },
  ];
  for (const entry of cases) {
    const path = buildProductDetailsPath(entry.product, { variant: entry.variant, quantity: entry.requested });
    const query = new URL(path, 'https://store.example').searchParams;
    assert.equal(query.get('quantity'), String(entry.requested));
    assert.deepEqual(readProductDetailHandoff(entry.product, query), {
      requested: true, variant: entry.variant, quantity: entry.expected, needsReview: entry.review,
    });
  }
});

test('invalid builder quantities produce only the encoded product route', () => {
  const product = food({ id: 'product/id' });
  for (const quantity of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(buildProductDetailsPath(product, { variant: '500g', quantity }), '/product/product%2Fid');
  }
});

test('variant MOQ overrides apply to pack units without changing food minimums', () => {
  const product = packaging({ variants: [
    { label: 'Empty Pack (10 pcs)', price: 2000, available: true, moqOverride: 17 },
    { label: 'Empty Box (1 pc)', price: 200, available: true },
  ] });
  assert.deepEqual(readProductDetailHandoff(product, params('Empty Pack (10 pcs)', '1')), {
    requested: true, variant: 'Empty Pack (10 pcs)', quantity: 2, needsReview: true,
  });
  assert.deepEqual(readProductDetailHandoff(food({ minOrderQuantity: 25 }), params('250g', '1')), {
    requested: true, variant: '250g', quantity: 1, needsReview: false,
  });
});

test('catalog reorder and price revision retain canonical label and quantity without URL prices', () => {
  const original = food();
  const path = buildProductDetailsPath(original, { variant: '500g', quantity: 4 });
  const updated = food({ prices: { '500g': 3100, '250g': 1400 }, catalogRevision: 'new-price' });
  const before = JSON.stringify(updated);
  assert.deepEqual(availableDetailVariants(updated), ['500g', '250g']);
  assert.deepEqual(readProductDetailHandoff(updated, new URL(path, 'https://store.example').searchParams), {
    requested: true, variant: '500g', quantity: 4, needsReview: false,
  });
  assert.equal(JSON.stringify(updated), before, 'reading does not mutate the catalog snapshot');
  assert.doesNotMatch(path, /3100|2500|new-price/);
});

test('removed or newly disabled variants cannot revive from an older handoff URL', () => {
  const path = buildProductDetailsPath(food(), { variant: '500g', quantity: 4 });
  const updatedProducts = [
    food({ prices: { '250g': 1400 } }),
    food({ variants: [{ label: '500g', price: 2500, available: false }] }),
  ];
  for (const product of updatedProducts) {
    assert.deepEqual(readProductDetailHandoff(product, new URL(path, 'https://store.example').searchParams), {
      requested: true, variant: null, quantity: 1, needsReview: true,
    });
  }
});

test('current packaging price and MOQ override are re-evaluated for an older URL', () => {
  const original = packaging({ prices: { 'Empty Pack (10 pcs)': 10000 } });
  const path = buildProductDetailsPath(original, { variant: 'Empty Pack (10 pcs)', quantity: 1 });
  const query = new URL(path, 'https://store.example').searchParams;
  assert.deepEqual(readProductDetailHandoff(packaging(), query), {
    requested: true, variant: 'Empty Pack (10 pcs)', quantity: 3, needsReview: true,
  });
  assert.deepEqual(readProductDetailHandoff(packaging({ moqOverride: 41 }), query), {
    requested: true, variant: 'Empty Pack (10 pcs)', quantity: 5, needsReview: true,
  });
});
