import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../src/contexts/CartContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { PRODUCTS } from '../src/data/products';
import ProductSlider from '../src/components/ProductSlider';
import { circularCatalogue, circularCardProjection, shouldRotateCatalogue, visibleCardFraction, type CatalogueMotionState } from '../src/lib/circularCatalogue';
import { circularCarouselTranslations } from '../src/contexts/circularCarouselTranslations';

test('the boutique tour includes every canonical product once, retaining the featured order', () => {
  const first = PRODUCTS[3];
  const oldCopy = { ...first, name_en: 'Stale copy', prices: { '250g': 1 } };
  const missing = { ...first, id: 'deleted-product' };
  const input = [oldCopy, missing, first];
  const result = circularCatalogue(input, PRODUCTS);
  assert.equal(result.length, PRODUCTS.length);
  assert.equal(new Set(result.map(product => product.id)).size, PRODUCTS.length);
  assert.equal(result[0], first);
  assert.deepEqual(new Set(result.map(product => product.id)), new Set(PRODUCTS.map(product => product.id)));
  assert.equal(input[0], oldCopy);
});

test('automatic rotation stops for every reading, visibility and motion preference condition', () => {
  const state: CatalogueMotionState = { reducedMotion: false, inView: true, pageVisible: true, hovered: false, focusWithin: false, interacting: false, count: PRODUCTS.length };
  assert.equal(shouldRotateCatalogue(state), true);
  for (const [key, value] of Object.entries({ reducedMotion: true, inView: false, pageVisible: false, hovered: true, focusWithin: true, interacting: true, count: 1 })) {
    assert.equal(shouldRotateCatalogue({ ...state, [key]: value }), false, `${key} must pause rotation`);
  }
  assert.equal(shouldRotateCatalogue({ ...state, interacting: false }), true, 'the tour resumes when its temporary reading interval ends');
});

test('the shallow curve has a readable center, symmetric sides and a flat reduced-motion view', () => {
  const center = circularCardProjection(0);
  assert.equal(Math.abs(center.rotation), 0);
  assert.equal(center.scale, 1);
  const left = circularCardProjection(-1);
  const right = circularCardProjection(1);
  assert.equal(left.rotation, -right.rotation);
  assert.equal(left.rise, right.rise);
  assert.equal(left.scale, right.scale);
  assert.ok(circularCardProjection(100).scale >= .95);
  assert.deepEqual(circularCardProjection(1, true), { rotation: 0, rise: 0, scale: 1, depth: 0 });
  assert.equal(circularCardProjection(Number.NaN).scale, 1);
});

test('painted side peeks remain below the readable threshold on either edge', () => {
  const width = 300, viewportWidth = 430;
  assert.equal(visibleCardFraction(65, width, 0, viewportWidth), 1);
  assert.equal(visibleCardFraction(-268, width, 0, viewportWidth), 32 / width);
  assert.equal(visibleCardFraction(398, width, 0, viewportWidth), 32 / width);
  assert.equal(visibleCardFraction(-60, width, 0, viewportWidth), .8);
  assert.ok(visibleCardFraction(-61, width, 0, viewportWidth) < .8);
  assert.equal(visibleCardFraction(-66, width, 0, viewportWidth), .78);
  assert.ok(visibleCardFraction(-67, width, 0, viewportWidth) < .78);
  assert.equal(visibleCardFraction(-301, width, 0, viewportWidth), 0);
  assert.equal(visibleCardFraction(431, width, 0, viewportWidth), 0);
  assert.equal(visibleCardFraction(10, 600, 10, 300), .5);
  for (const args of [[NaN, 300, 0, 430], [0, Infinity, 0, 430], [0, -1, 0, 430], [0, 300, 0, 0]]) {
    assert.equal(visibleCardFraction(...args as [number, number, number, number]), 0);
  }
});

test('the tour keeps real detail links, Quick View, portions, save and add-to-cart controls', () => {
  const html = renderToString(<MemoryRouter><LanguageProvider><CartProvider><ProductSlider products={PRODUCTS.slice(0, 3)} onAddToCart={() => undefined} onQuickView={() => undefined} /></CartProvider></LanguageProvider></MemoryRouter>);
  assert.equal((html.match(/class="circular-boutique-slide"/g) || []).length, PRODUCTS.length);
  assert.equal((html.match(/class="circular-boutique-slide"[^>]*aria-hidden="false"/g) || []).length, 1, 'only the selected product is accessible before geometry is known');
  for (const product of PRODUCTS) assert.ok(html.includes(`href="/product/${product.id}"`), `missing detail link for ${product.id}`);
  assert.match(html, /Quick View/);
  assert.match(html, /Add to Bag/);
  assert.match(html, /aria-label="Save product:/);
  assert.match(html, /250g/i);
  assert.match(html, /aria-label="Previous products"/);
  assert.match(html, /aria-label="Next products"/);
  assert.doesNotMatch(html, /Pause the product tour|Resume the product tour|bestseller-motion-control/);
  assert.match(html, /inert=""/);
  assert.doesNotMatch(html, /role="tablist"/);
});

test('all carousel controls have complete English, Urdu and Arabic copy', () => {
  const keys = Object.keys(circularCarouselTranslations.en).sort();
  for (const language of ['en', 'ur', 'ar'] as const) {
    assert.deepEqual(Object.keys(circularCarouselTranslations[language]).sort(), keys);
    for (const value of Object.values(circularCarouselTranslations[language])) assert.ok(value.trim());
  }
  for (const language of ['ur', 'ar'] as const) {
    for (const value of Object.values(circularCarouselTranslations[language])) assert.match(value, /[\u0600-\u06ff]/);
  }
});
