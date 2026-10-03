import React from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { CartProvider } from '../src/contexts/CartContext';
import { ProductMediaProvider } from '../src/contexts/ProductMediaContext';
import { PRODUCTS } from '../src/data/products';
import ProductImageGallery from '../src/components/ProductImageGallery';
import ProductVideo from '../src/components/ProductVideo';
import ProductDetailPage from '../src/pages/ProductDetailPage';
import QuickViewModal from '../src/components/QuickViewModal';

const cover = '/images/generated/pista-secondary-v1.webp';
const film = '/videos/allbarka-gifting-motion.mp4';
const overrides = { pista: { images: [cover], videoUrl: film, videoPoster: cover } };
const render = (children: React.ReactNode, url = '/product/pista') => renderToString(<MemoryRouter initialEntries={[url]}><LanguageProvider><ProductMediaProvider initialOverrides={overrides}><CartProvider>{children}</CartProvider></ProductMediaProvider></LanguageProvider></MemoryRouter>);

test('gallery honors an overridden cover and removes multiphoto controls when the gallery shrinks', () => {
  const html = render(<ProductImageGallery product={PRODUCTS[0]} />);
  assert.match(html, /src="\/images\/generated\/pista-secondary-v1\.webp"/);
  assert.doesNotMatch(html, /pistachios-catalog-v1\.webp/);
  assert.doesNotMatch(html, /product-gallery-arrow/);
  assert.doesNotMatch(html, /product-gallery-counter/);
  assert.match(html, /href="\/product\/pista"/);
});

test('detail photograph and film consistently use the current media override', () => {
  const html = render(<Routes><Route path="/product/:id" element={<ProductDetailPage />} /></Routes>);
  assert.match(html, /<img src="\/images\/generated\/pista-secondary-v1\.webp"/);
  assert.match(html, /<video[^>]+src="\/videos\/allbarka-gifting-motion\.mp4"/);
  assert.match(html, /controls=""[^>]+preload="none"/);
  assert.doesNotMatch(html, /autoPlay|autoplay/);
  assert.match(html, /aria-haspopup="dialog"/);
});

test('quick view shows owner-supplied media without changing the full-detail action or catalogue price', () => {
  const html = render(<QuickViewModal isOpen product={PRODUCTS[0]} onClose={() => {}} />);
  assert.match(html, /src="\/images\/generated\/pista-secondary-v1\.webp"/);
  assert.match(html, /src="\/videos\/allbarka-gifting-motion\.mp4"/);
  assert.match(html, /href="\/product\/pista"/);
  assert.match(html.replace(/<!--.*?-->/g, ''), /Rs\. 1,250/);
  assert.doesNotMatch(html, /autoplay/);
});

test('products with no configured film render no video or invented media controls', () => {
  const html = render(<ProductVideo videoUrl="" poster={cover} productName="Pista" />);
  assert.equal(html, '');
  assert.equal(render(<ProductVideo videoUrl="javascript:alert(1)" productName="Pista" />), '');
});
