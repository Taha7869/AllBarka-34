import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { resolveCartIdentity, resolveCartPortion, resolveCartQuantity, resolveCartUnitPrice } from '../src/lib/cartInput';

test('saved and reordered catalogue items use current prices instead of stale or injected prices', () => {
  const product = PRODUCTS.find(product => product.id === 'pista')!;
  assert.equal(resolveCartUnitPrice(product, '500g', 1), product.prices['500g']);
  assert.equal(resolveCartUnitPrice(product, '500g', 999999), product.prices['500g']);
  assert.equal(resolveCartUnitPrice(product, 'retired-size', 1), 0);
});

test('custom selections keep their supplied price while invalid amounts are rejected', () => {
  assert.equal(resolveCartUnitPrice(undefined, 'Custom Selection', 'Rs. 4,380'), 4380);
  assert.equal(resolveCartUnitPrice(undefined, 'Custom Selection', Infinity), 0);
  assert.equal(resolveCartUnitPrice(undefined, 'Custom Selection', -1), 0);
});

test('raw catalog products retain complete hyphenated IDs during add and reorder', () => {
  for (const id of ['deal-1', 'oil-almond', 'org-honey']) {
    const product = PRODUCTS.find(product => product.id === id)!;
    const identity = resolveCartIdentity(product, PRODUCTS);
    assert.equal(identity?.productId, id);
    assert.equal(identity?.product, product);
  }
});

test('saved composite IDs migrate to exact catalog IDs without a productId field', () => {
  for (const id of ['deal-1', 'oil-almond', 'pista']) {
    const product = PRODUCTS.find(product => product.id === id)!;
    const selectedWeight = Object.keys(product.prices)[0];
    const item = { id: `${id}-${selectedWeight}`, selectedWeight };
    assert.equal(resolveCartIdentity(item, PRODUCTS)?.productId, id);
    assert.equal(resolveCartIdentity({ id: item.id }, PRODUCTS)?.productId, id);
  }
});

test('migration recovers truncated legacy identities using an exact product slug', () => {
  assert.equal(resolveCartIdentity({ id: 'oil-250ml', productId: 'oil', slug: 'oil-almond', selectedWeight: '250ml' }, PRODUCTS)?.productId, 'oil-almond');
});

test('composite migration recovers the stored portion when selectedWeight is absent', () => {
  for (const item of [{ id: 'pista-1kg' }, { id: 'pista-1kg', productId: 'pista' }]) {
    const identity = resolveCartIdentity(item, PRODUCTS)!;
    assert.equal(identity.productId, 'pista');
    assert.equal(resolveCartPortion(identity.product, identity.portion), '1kg');
  }
});

test('unknown identities and custom hampers are preserved whole without prefix guessing', () => {
  assert.equal(resolveCartIdentity({ id: 'oil-almond-unrecognized' }, PRODUCTS)?.productId, 'oil-almond-unrecognized');
  assert.equal(resolveCartIdentity({ id: 'custom-hamper-123', productId: 'custom-hamper-123' }, PRODUCTS)?.productId, 'custom-hamper-123');
  assert.equal(resolveCartIdentity({ id: 'oil-almondish-250ml' }, PRODUCTS)?.product, undefined);
  assert.equal(resolveCartIdentity({}, PRODUCTS), null);
});

test('item quantity is retained unless an explicit call-site quantity overrides it', () => {
  assert.equal(resolveCartQuantity(3), 3);
  assert.equal(resolveCartQuantity(3, 2), 2);
  assert.equal(resolveCartQuantity(undefined), 1);
  assert.equal(resolveCartQuantity('4'), 4);
});

test('cart quantities stay finite integers within the existing 1–50 limits', () => {
  assert.equal(resolveCartQuantity(3.9), 3);
  assert.equal(resolveCartQuantity(0), 1);
  assert.equal(resolveCartQuantity(-3), 1);
  assert.equal(resolveCartQuantity(100), 50);
  assert.equal(resolveCartQuantity(Infinity), 1);
  assert.equal(resolveCartQuantity(NaN), 1);
});

test('invalid catalog portions never fall back to wholesale or a different retail portion', () => {
  const product = PRODUCTS.find(product => product.id === 'pista')!;
  assert.ok(product.wholesale > 0);
  assert.equal(resolveCartPortion(product, '500g'), '500g');
  assert.equal(resolveCartPortion(product, '500g • Vacuum Tin'), null);
  assert.equal(resolveCartPortion(product, 'retired-size'), null);
  assert.equal(resolveCartPortion(product), Object.keys(product.prices)[0]);
  assert.equal(resolveCartPortion(undefined, 'Custom Selection'), 'Custom Selection');
});
