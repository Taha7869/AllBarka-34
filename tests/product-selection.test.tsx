import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PRODUCTS } from '../src/data/products';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import CustomWeightInput from '../src/components/CustomWeightInput';
import { customWeightPresets, displayProductPrice, nearestCustomWeight, parsePortionMeasure, sortAndDedupePortions } from '../src/lib/productSelection';
import { resolveCustomWeight } from '../src/lib/productVariants';

const dry = PRODUCTS.find(product => product.id === 'ceylon-cinnamon')!;

test('invalid custom weights cannot produce NaN, infinity or a purchasable display price', () => {
  for (const value of ['', '4999', '99', '5050', 'bad', '350.5', '1e3', 'Infinity', '-100']) {
    let price: number | null = null;
    try { price = resolveCustomWeight(dry, value).price; } catch { /* Invalid selection. */ }
    assert.equal(displayProductPrice(price), '—');
    assert.equal(displayProductPrice(price, 2), '—');
  }
  for (const price of [NaN, Infinity, undefined, null, -5, 0]) assert.equal(displayProductPrice(price), '—');
  for (const quantity of [NaN, Infinity, -1, 0]) assert.equal(displayProductPrice(250, quantity), '—');
  assert.equal(displayProductPrice(250, 2), 'Rs. 500');
});

test('nearest-step hints respect merchant limits without changing typed values', () => {
  assert.equal(nearestCustomWeight(dry, '4999'), 5000);
  assert.equal(nearestCustomWeight(dry, '351'), 350);
  assert.equal(nearestCustomWeight(dry, '349.5'), 350);
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
  for (const grams of ['1000', '5000']) {
    const selected = renderToString(<LanguageProvider><CustomWeightInput product={dry} selected grams={grams} onSelect={() => {}} onChange={() => {}} /></LanguageProvider>);
    assert.match(selected, new RegExp(`value="${grams}"`));
    assert.match(selected, /aria-invalid="false"/);
    assert.ok(selected.includes(resolveCustomWeight(dry, grams).price.toLocaleString('en-PK')));
    assert.doesNotMatch(selected, /Nearest valid weight|NaN|Infinity/);
  }
});

test('every catalog product deduplicates portion chips, sorts smallest-to-largest, and keeps custom weight last', () => {
  for (const product of PRODUCTS) {
    const disabled = new Set(product.variants?.filter(v => v.available === false).map(v => v.label) || []);
    const sorted = sortAndDedupePortions(
      Object.keys(product.prices || {}).filter(k => !disabled.has(k) && Number.isFinite(product.prices[k]) && product.prices[k] > 0)
    );
    const presets = customWeightPresets(product).map(g => `${g / 1000}kg`);
    const allChips = [...sorted, ...presets];
    const normalizedMeasures = allChips.map(label => {
      const m = parsePortionMeasure(label);
      return m ? `${m.kind}:${m.amount}` : label.trim().toLowerCase();
    });
    assert.equal(
      new Set(normalizedMeasures).size,
      normalizedMeasures.length,
      `Duplicate portion chips found on ${product.id}: ${allChips.join(', ')}`
    );
    // Verify ascending numeric order across sorted standard portions
    let prevMass = 0;
    let prevVol = 0;
    for (const label of sorted) {
      const m = parsePortionMeasure(label);
      if (m?.kind === 'mass') {
        assert.ok(m.amount > prevMass, `Mass portions not ascending on ${product.id}: ${sorted.join(', ')}`);
        prevMass = m.amount;
      } else if (m?.kind === 'volume') {
        assert.ok(m.amount > prevVol, `Volume portions not ascending on ${product.id}: ${sorted.join(', ')}`);
        prevVol = m.amount;
      }
    }
  }
  const pista = PRODUCTS.find(p => p.id === 'pista')!;
  assert.deepEqual(customWeightPresets(pista), [5000], 'pista already has 1kg so only 5kg preset should be offered');
});
