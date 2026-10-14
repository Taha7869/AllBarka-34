import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PRODUCTS } from '../src/data/products';
import type { CartItem } from '../src/types';
import { HAMPER_BOXES, resolveHamper } from '../src/lib/hamperCatalog';
import { createCatalogStore } from '../src/lib/catalogClient';
import { staticCatalogSnapshot, pricingVersion } from '../src/lib/liveCatalog';
import { repriceCart } from '../src/lib/cartPricing';
import { productWithPricing, defaultProductPricing } from '../src/lib/catalogPricing';
import { pricingTranslations } from '../src/contexts/pricingTranslations';

function livePrice(price: number) {
  const snapshot = staticCatalogSnapshot(); const product = snapshot.catalog.find(product => product.id === 'pista')!;
  product.prices['250g'] = price; product.variants = Object.entries(product.prices).map(([label, price]) => ({ label, price }));
  snapshot.source = 'firestore'; snapshot.revision = pricingVersion(price); return snapshot;
}
const response = (price: number) => new Response(JSON.stringify(livePrice(price)), { headers: { 'Content-Type': 'application/json', ETag: `"price-${price}"` } });

test('one client request serves concurrent consumers; ETags and refreshes propagate new effective prices', async () => {
  let calls = 0; let requestHeaders: HeadersInit | undefined;
  let next = () => response(1490);
  const store = createCatalogStore({ fetcher: async (_url, options) => { calls++; requestHeaders = options?.headers; return next(); } });
  await Promise.all(Array.from({ length: 25 }, () => store.refresh())); assert.equal(calls, 1);
  assert.equal(store.getSnapshot().status, 'ready'); assert.equal(store.getSnapshot().catalog.find(product => product.id === 'pista')!.prices['250g'], 1490);
  next = () => new Response(null, { status: 304 }); await store.refresh(); assert.equal(new Headers(requestHeaders).get('If-None-Match'), '"price-1490"'); assert.equal(store.getSnapshot().status, 'ready');
  next = () => response(1600); await store.refresh(); assert.equal(store.getSnapshot().catalog.find(product => product.id === 'pista')!.prices['250g'], 1600);
  store.close();
});

test('invalid and unavailable public pricing is labelled unavailable without losing a bag or accepting malformed values', async () => {
  let next = () => response(1550); const store = createCatalogStore({ fetcher: async () => next() }); await store.refresh();
  const before = store.getSnapshot().catalog;
  next = () => new Response(JSON.stringify({ catalog: [{ id: 'pista', prices: { '250g': '1' } }] })); await store.refresh();
  assert.equal(store.getSnapshot().status, 'unavailable'); assert.strictEqual(store.getSnapshot().catalog, before);
  next = () => new Response(JSON.stringify({ code: 'CATALOG_NOT_READY' }), { status: 503 }); await store.refresh(); assert.equal(store.getSnapshot().status, 'unavailable');
  next = () => response(1650); await store.refresh(); assert.equal(store.getSnapshot().status, 'ready'); store.close();
});

test('a stalled or synchronously failing fetch is bounded and can be retried', async () => {
  let hangs = true;
  const store = createCatalogStore({ timeoutMs: 10, fetcher: () => hangs ? new Promise<Response>(() => {}) : Promise.resolve(response(1450)) });
  await store.refresh(); assert.equal(store.getSnapshot().status, 'unavailable'); hangs = false; await store.refresh(); assert.equal(store.getSnapshot().status, 'ready'); store.close();
  let fails = true;
  const immediate = createCatalogStore({ fetcher: () => { if (fails) throw new Error('synchronous failure'); return Promise.resolve(response(1450)); } });
  await immediate.refresh(); fails = false; await immediate.refresh(); assert.equal(immediate.getSnapshot().status, 'ready'); immediate.close();
});

test('unsaved bags reprice fixed/custom portions, preserve unavailable selections and recover after availability returns', () => {
  const product = PRODUCTS.find(product => product.id === 'pista')!;
  const item: CartItem = { id: 'pista-250g', productId: 'pista', name_en: product.name_en, name_ur: product.name_ur, name_ar: product.name_ar,
    slug: 'pista', image: product.image!, selectedWeight: '250g', quantity: 3, unitPrice: 1, price: 1 };
  const pricing = { ...defaultProductPricing(product), prices: { ...product.prices, '250g': 1450 }, pricePer100g: 571 };
  const catalog = PRODUCTS.map(value => value.id === 'pista' ? productWithPricing(product, pricing) : value);
  const refreshed = repriceCart([item, { ...item, id: 'pista-Custom 350g', selectedWeight: 'Custom 350g' }], catalog, HAMPER_BOXES);
  assert.equal(refreshed[0].unitPrice, 1450); assert.equal(refreshed[0].quantity, 3); assert.equal(refreshed[1].unitPrice, 2000);
  assert.strictEqual(repriceCart(refreshed, catalog, HAMPER_BOXES), refreshed);
  const unavailable = repriceCart(refreshed, catalog.map(value => value.id === 'pista' ? { ...value, active: false } : value), HAMPER_BOXES);
  assert.equal(unavailable.length, 2); assert.equal(unavailable[0].priceUnavailable, true); assert.equal(unavailable[0].unitPrice, 1450);
  assert.equal(repriceCart(unavailable, catalog, HAMPER_BOXES)[0].priceUnavailable, false);
});

test('hamper bags refresh packaging and contents together while preserving recipient details', () => {
  const configuration = { version: 1 as const, boxId: 'box-wood' as const, selections: ['pista', 'kaju', 'badam', 'akhroot'], recipientName: 'A patron', giftMessage: 'A gift' };
  const old = resolveHamper(configuration)!;
  const item: CartItem = { id: 'custom-hamper', productId: 'custom-hamper', name_en: old.name_en, name_ur: old.name_ur, name_ar: old.name_ar,
    slug: 'custom-hamper', image: old.image, selectedWeight: old.portion, quantity: 2, unitPrice: old.unitPrice, price: old.unitPrice, hamperConfiguration: old.configuration };
  const boxes = HAMPER_BOXES.map(box => ({ ...box, price: box.price + 200 }));
  const result = repriceCart([item], PRODUCTS, boxes); assert.equal(result[0].unitPrice, old.unitPrice + 200); assert.deepEqual(result[0].hamperConfiguration, old.configuration);
  assert.equal(repriceCart(result, PRODUCTS, boxes.map(box => ({ ...box, active: false })))[0].priceUnavailable, true);
});

test('pricing and administration copy is complete in all three storefront languages', () => {
  assert.deepEqual(Object.keys(pricingTranslations.ur).sort(), Object.keys(pricingTranslations.en).sort());
  assert.deepEqual(Object.keys(pricingTranslations.ar).sort(), Object.keys(pricingTranslations.en).sort());
  for (const language of ['en', 'ur', 'ar'] as const) for (const text of Object.values(pricingTranslations[language])) assert.ok(text.trim());
});
