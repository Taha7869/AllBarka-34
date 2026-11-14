import assert from 'node:assert/strict';
import test from 'node:test';
import { PDP_BUY_BAR_EVENT, setPdpBuyBarVisible } from '../src/lib/pdpBuyBarSignal';

test('the product page buy bar announces itself once per change so the layout can hide the cart bar', () => {
  const seen: boolean[] = [];
  const target = new EventTarget();
  const previous = (globalThis as any).window;
  (globalThis as any).window = Object.assign(target, { dispatchEvent: target.dispatchEvent.bind(target), addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target) });
  try {
    window.addEventListener(PDP_BUY_BAR_EVENT, event => seen.push((event as CustomEvent<boolean>).detail));
    setPdpBuyBarVisible(true); setPdpBuyBarVisible(true); setPdpBuyBarVisible(false); setPdpBuyBarVisible(false);
    assert.deepEqual(seen, [true, false]);
  } finally { (globalThis as any).window = previous; }
});

test('the product page shows how much more unlocks free Lahore delivery', async () => {
  const React = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { MemoryRouter, Route, Routes } = await import('react-router-dom');
  const { CartProvider } = await import('../src/contexts/CartContext');
  const { LanguageProvider } = await import('../src/contexts/LanguageContext');
  const { default: ProductDetailPage } = await import('../src/pages/ProductDetailPage');
  const { PRODUCTS } = await import('../src/data/products');
  const product: any = PRODUCTS.find(p => p.id === 'badam');
  const firstPrice = Number(Object.values(product.prices)[0]);
  const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/product/badam'] },
    React.createElement(LanguageProvider, null, React.createElement(CartProvider, null,
      React.createElement(Routes, null, React.createElement(Route, { path: '/product/:id', element: React.createElement(ProductDetailPage) }))))));
  assert.match(html, /data-pdp-delivery-hint/);
  const expected = firstPrice >= 3000 ? /Free standard delivery in Lahore/ : new RegExp(`Add Rs\\.${(3000 - firstPrice).toLocaleString()} for free standard delivery in Lahore`);
  assert.match(html, expected);
  assert.ok(!html.includes('data-pdp-buy-bar'), 'the sticky bar only appears after scrolling on a phone');
});
