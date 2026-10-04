import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { CartProvider, useCart, parsePrice, type CartContextValue } from '../src/contexts/CartContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { getOrderQuote } from '../src/lib/order';
import type { CartItem } from '../src/types';
import { hamperCartKey, hamperPackingLines, resolveHamper, type HamperConfiguration } from '../src/lib/hamperCatalog';
import { acceptedCheckoutReceipt } from '../src/lib/checkoutReceipt';
import ShippingMethodSelector from '../src/components/ShippingMethodSelector';

const items: CartItem[] = [{ id: 'pista-1kg', productId: 'pista', name_en: 'Pistachios', name_ur: 'پستے', name_ar: 'فستق', slug: 'pista', image: '', selectedWeight: '1kg', quantity: 2, price: 1, unitPrice: 1 }];

function restoredCart(city: string, selections = items, draftCity?: string, cityStorageBlocked = false): CartContextValue {
  const originals = ['window', 'localStorage', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: () => draftCity ? JSON.stringify({ customer: { city: draftCity }, updatedAt: Date.now() }) : null } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => {
    if (cityStorageBlocked && key === 'allbarka_delivery_city') throw new Error('City storage blocked');
    return key === 'allbarka_cart_v1' ? JSON.stringify(selections) : key === 'allbarka_delivery_city' ? city : null;
  } } });
  let observed!: CartContextValue;
  function Probe() { observed = useCart(); return null; }
  try { renderToString(<LanguageProvider><CartProvider><Probe /></CartProvider></LanguageProvider>); return observed; }
  finally { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } }
}

test('restored cart reprices canonically and never unlocks national free shipping', () => {
  const national = restoredCart('Karachi');
  assert.equal(national.subtotal, 10000);
  assert.equal(national.isFreeShippingUnlocked, false);
  assert.equal(national.estimatedShipping, 500);
  const lahore = restoredCart('Lahore');
  assert.equal(lahore.isFreeShippingUnlocked, true);
  assert.equal(lahore.estimatedShipping, 0);
  assert.equal(restoredCart('لاہور').estimatedShipping, 0);
});

test('current cart destination wins over an older checkout draft', () => {
  const national = restoredCart('Karachi', items, 'Lahore');
  assert.equal(national.shippingCity, 'Karachi');
  assert.equal(national.isFreeShippingUnlocked, false);
  assert.equal(national.estimatedShipping, 500);
});

test('an available checkout draft restores the destination when city storage is blocked', () => {
  const national = restoredCart('Lahore', items, 'Karachi', true);
  assert.equal(national.shippingCity, 'Karachi');
  assert.equal(national.isFreeShippingUnlocked, false);
  assert.equal(national.estimatedShipping, 500);
});

test('hamper restoration preserves configuration and recomputes price and shipping', () => {
  const configuration: HamperConfiguration = { version: 1, boxId: 'box-velvet', selections: ['pista', 'kaju', 'badam'], recipientName: 'Test gift', giftMessage: 'A message' };
  const canonical = resolveHamper(configuration)!;
  const hamperItem = { ...items[0], id: 'custom-hamper', productId: 'custom-hamper', slug: 'custom-hamper', selectedWeight: 'fake 1g', price: 1, unitPrice: 1, hamperConfiguration: configuration };
  const cart = restoredCart('Karachi', [hamperItem]);
  assert.equal(cart.subtotal, canonical.unitPrice * 2);
  assert.equal(cart.estimatedShipping, 300);
  assert.equal(cart.cartItems[0].id, hamperCartKey(canonical.configuration));
  assert.deepEqual(cart.cartItems[0].hamperConfiguration, canonical.configuration);
  assert.equal(cart.cartItems[0].selectedWeight, '3 × 200g');
});

test('receipts match separately configured hampers by their complete identity', () => {
  const make = (boxId: HamperConfiguration['boxId']) => {
    const hamper = resolveHamper({ version: 1, boxId, selections: ['pista', 'kaju', 'badam'], recipientName: '', giftMessage: '' })!;
    return { ...items[0], id: hamperCartKey(hamper.configuration), productId: 'custom-hamper', selectedWeight: hamper.portion, quantity: 1, unitPrice: hamper.unitPrice, price: hamper.unitPrice, hamperConfiguration: hamper.configuration };
  };
  const a = make('box-velvet'), b = make('box-tin');
  const receipt = acceptedCheckoutReceipt([a, b], { subtotal: 0, finalPayable: 0, shippingFee: 0, discountAmt: 0, giftFee: 0 }, { items: [{ ...a, price: 3500 }, { ...b, price: 2900 }] });
  assert.equal(receipt.items[0].unitPrice, 3500);
  assert.equal(receipt.items[1].unitPrice, 2900);
});

test('manual hamper checkout preserves chosen harvests and the personal card', () => {
  const config = { version: 1, boxId: 'box-velvet', selections: ['pista', 'kaju', 'badam'], recipientName: 'Test gift', giftMessage: 'A message' };
  for (const language of ['en', 'ur', 'ar'] as const) {
    const lines = hamperPackingLines(config, language);
    assert.equal((lines[0].match(/200g/g) || []).length, 3);
    assert.match(lines[1], /Test gift/);
    assert.match(lines[2], /A message/);
  }
  assert.deepEqual(hamperPackingLines(undefined), []);
});

test('cart formatting contains malformed numeric input', () => {
  assert.equal(parsePrice(Infinity), 0);
  assert.equal(parsePrice(NaN), 0);
  assert.equal(parsePrice('9'.repeat(400)), 0);
});

test('shipping controls stay rendered while an actual city is incomplete or invalid', () => {
  for (const city of ['', 'K', 'K'.repeat(61)]) {
    const html = renderToString(<LanguageProvider><ShippingMethodSelector selected="standard" onSelect={() => {}} subtotal={10000} city={city} items={items} /></LanguageProvider>);
    assert.match(html, /Confirm delivery at checkout/);
    assert.equal((html.match(/<button/g) || []).length, 2);
  }
  const national = renderToString(<LanguageProvider><ShippingMethodSelector selected="standard" onSelect={() => {}} subtotal={10000} city="Karachi" items={items} /></LanguageProvider>);
  assert.match(national, /Rs\. 500/);
});

test('quote transports destination and preserves actionable validation errors', async () => {
  const original = globalThis.fetch;
  let sent: any;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    sent = JSON.parse(String(init.body));
    return { ok: false, status: 400, json: async () => ({ code: 'INVALID_CITY', error: 'City required' }) };
  }) as typeof fetch;
  try {
    const result = await getOrderQuote({ items, city: 'Karachi', shippingMethodId: 'standard' });
    assert.equal(sent.city, 'Karachi');
    assert.equal(result.code, 'INVALID_CITY');
    assert.equal(result.success, false);
  } finally { globalThis.fetch = original; }
});

test('malformed or inconsistent quotes cannot become verified checkout totals', async () => {
  const original = globalThis.fetch;
  try {
    for (const totals of [null, { subtotal: 10, discount: 0, discountedSubtotal: 10, shipping: 250, giftWrapFee: 0, total: 10 }, { subtotal: 10, discount: 0, discountedSubtotal: 10, shipping: '250', giftWrapFee: 0, total: 260 }]) {
      globalThis.fetch = (async () => ({ ok: true, json: async () => ({ success: true, totals }) })) as unknown as typeof fetch;
      const result = await getOrderQuote({ items, city: 'Karachi', shippingMethodId: 'standard' });
      assert.equal(result.success, false);
      assert.equal(result.code, 'INVALID_QUOTE');
    }
  } finally { globalThis.fetch = original; }
});
