import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PRODUCTS } from '../src/data/products';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import CustomWeightInput from '../src/components/CustomWeightInput';
import { customWeightPresets, displayProductPrice, nearestCustomWeight } from '../src/lib/productSelection';
import { resolveCustomWeight } from '../src/lib/productVariants';

const dry = PRODUCTS.find(product => product.id === 'ceylon-cinnamon')!;

test('invalid custom weights cannot produce NaN, infinity or a purchasable display price', () => {
  for (const value of ['', '4999', '99', '5050', 'bad']) {
    let price: number | null = null;
    try { price = resolveCustomWeight(dry, value).price; } catch { /* Invalid selection. */ }
    assert.equal(displayProductPrice(price), '—');
    assert.equal(displayProductPrice(price, 2), '—');
  }
  for (const price of [NaN, Infinity, undefined, null, -5, 0]) assert.equal(displayProductPrice(price), '—');
  assert.equal(displayProductPrice(250, 2), 'Rs. 500');
});

test('nearest-step hints respect merchant limits without changing typed values', () => {
  assert.equal(nearestCustomWeight(dry, '4999'), 5000);
  assert.equal(nearestCustomWeight(dry, '351'), 350);
  assert.equal(nearestCustomWeight({ ...dry, maxCustomWeightG: 1200 }, '1499'), 1200);
  for (const value of ['', 'bad', '5000', '100']) assert.equal(nearestCustomWeight(dry, value), null);
});

test('1kg and 5kg shortcuts only select canonical eligible weights', () => {
  assert.deepEqual(customWeightPresets(dry), [1000, 5000]);
  assert.deepEqual(customWeightPresets({ ...dry, maxCustomWeightG: 1200 }), [1000]);
  for (const id of ['oil-almond', 'bundle-daily-grind', 'corporate-gifting']) {
    assert.deepEqual(customWeightPresets(PRODUCTS.find(product => product.id === id)!), []);
  }
  const html = renderToString(<LanguageProvider><CustomWeightInput product={dry} selected grams="4999" onSelect={() => {}} onChange={() => {}} /></LanguageProvider>);
  assert.match(html, /value="4999"/);
  assert.match(html, /Nearest valid weight: 5000g/);
  assert.match(html, /aria-invalid="true"/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});
