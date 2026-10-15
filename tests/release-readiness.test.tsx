import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { deploymentReadiness } from '../src/lib/commerceReadiness';
import { staticCatalogSnapshot } from '../src/lib/liveCatalog';
import { calculateDeliverySchedule } from '../src/lib/deliveryCalendar';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { CartProvider } from '../src/contexts/CartContext';
import LahoreExpressTimer from '../src/components/LahoreExpressTimer';
import ProductSlider from '../src/components/ProductSlider';
import { PRODUCTS } from '../src/data/products';

test('deployment requires auth, connected persistence and a complete Firestore catalogue', () => {
  const catalog = { ...staticCatalogSnapshot(), source: 'firestore' as const };
  assert.equal(deploymentReadiness(true, true, catalog).ready, true);
  for (const result of [deploymentReadiness(false, true, catalog), deploymentReadiness(true, false, catalog),
    deploymentReadiness(true, true, null), deploymentReadiness(true, true, staticCatalogSnapshot()),
    deploymentReadiness(true, true, { ...catalog, boxes: catalog.boxes.slice(1) }),
    deploymentReadiness(true, true, { ...catalog, catalog: catalog.catalog.slice(1) })]) {
    assert.equal(result.ready, false);
    assert.equal(result.status, 'not_ready');
  }
});

test('delivery promise uses Pakistan cutoff and rolls Saturday evenings and Sundays to Monday', () => {
  for (const [timestamp, eligible, dispatch] of [
    ['2026-10-15T12:59:00Z', true, '2026-10-15'],
    ['2026-10-15T13:01:00Z', false, '2026-10-16'],
    ['2026-10-17T13:01:00Z', false, '2026-10-19'],
    ['2026-10-18T06:00:00Z', false, '2026-10-19'],
  ] as const) {
    const result = calculateDeliverySchedule({ city: 'Lahore', shippingMethodId: 'sameday', orderTimestamp: timestamp });
    assert.equal(result.isSameDayEligible, eligible);
    assert.equal(result.scheduledDeliveryDate, dispatch);
  }
});

test('delivery banner shows the actual next dispatch instead of restarting an urgency timer', t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-17T13:01:00Z') });
  const render = () => renderToStaticMarkup(<LanguageProvider><LahoreExpressTimer onOpenSchedule={() => {}} /></LanguageProvider>);
  assert.match(render(), /Next dispatch:/);
  assert.match(render(), /Mon/);
  assert.match(render(), /19 Oct|Oct 19/);
  assert.doesNotMatch(render(), /Order within|evening dispatch|4:00/);
  t.mock.timers.setTime(new Date('2026-10-15T12:59:00Z').getTime());
  assert.match(render(), /Order by 6 PM Pakistan time/);
  assert.doesNotMatch(render(), /Next dispatch:/);
});

test('homepage carousel renders only the eight featured selections and links to the full collection', () => {
  const products = PRODUCTS.slice(0, 8);
  const html = renderToStaticMarkup(<MemoryRouter><LanguageProvider><CartProvider><ProductSlider products={products} onAddToCart={() => {}} onQuickView={() => {}} /></CartProvider></LanguageProvider></MemoryRouter>);
  assert.match(html, /href="\/shop"/);
  assert.doesNotMatch(html, /aria-label="[^"]*89[^"]*"/);
  for (const product of PRODUCTS.slice(8)) assert.ok(!html.includes(`data-product-id="${product.id}"`));
  assert.equal((html.match(/class="circular-boutique-slide/g) || []).length, 8);
});
