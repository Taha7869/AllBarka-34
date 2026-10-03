import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { selectionMatches, selectionResultsPath } from '../src/lib/selectionGuide';
import { trendTranslations } from '../src/contexts/trendTranslations';

test('guide resolves real smallest portions and prices without mutating the catalogue', () => {
  const before = JSON.stringify(PRODUCTS);
  const matches = selectionMatches(PRODUCTS, { category: 'all', budget: null });
  assert.equal(matches.length, PRODUCTS.length);
  for (const { product, weight, price } of matches) {
    assert.equal(price, product.prices[weight]);
    assert.equal(price, Math.min(...Object.values(product.prices)));
  }
  assert.equal(JSON.stringify(PRODUCTS), before);
});
test('per-item budgets and collection choices exclude incompatible portions', () => {
  const matches = selectionMatches(PRODUCTS, { category: 'nuts', budget: 500 });
  assert.ok(matches.length > 0);
  assert.ok(matches.every(match => match.product.category === 'nuts' && match.price <= 500));
  assert.equal(selectionMatches(PRODUCTS, { category: 'gift-boxes', budget: 500 }).length, 0);
  assert.ok(selectionMatches(PRODUCTS, { category: 'gift-boxes', budget: 5000 }).length > 0);
});
test('invalid budgets and unavailable prices do not produce fake matches', () => {
  for (const budget of [0, -1, NaN, Infinity]) assert.equal(selectionMatches(PRODUCTS, { category: 'all', budget }).length, 0);
  const malformed = { ...PRODUCTS[0], prices: { missing: NaN, invalid: -10, zero: 0 } };
  assert.equal(selectionMatches([malformed], { category: 'all', budget: null }).length, 0);
  assert.equal(selectionMatches(PRODUCTS, { category: 'unknown', budget: null }).length, 0);
});
test('the guide opens reloadable shop URLs with the same selections', () => {
  assert.equal(selectionResultsPath({ category: 'nuts', budget: 1500 }), '/shop/nuts?budget=1500');
  assert.equal(selectionResultsPath({ category: 'gift-boxes', budget: null }), '/shop/gift-boxes');
  assert.equal(selectionResultsPath({ category: 'all', budget: 500 }), '/shop?budget=500');
  assert.equal(selectionResultsPath({ category: '../admin', budget: NaN }), '/shop');
});
test('new guide, editorial and photo-viewer copy is complete in all three languages', () => {
  for (const language of ['ur', 'ar']) {
    assert.deepEqual(Object.keys(trendTranslations[language]).sort(), Object.keys(trendTranslations.en).sort());
    for (const [key, text] of Object.entries(trendTranslations[language])) assert.match(text, /[\u0600-\u06ff]/, key);
  }
});
