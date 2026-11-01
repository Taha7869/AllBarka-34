import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { routeMetadata, renderRouteDocument } from '../src/lib/routeDocument';
import { PRODUCTS } from '../src/data/products';

const origin = 'https://store.example.test';
const template = readFileSync('index.html', 'utf8');

test('initial product HTML contains its canonical identity, social tags and current prices', () => {
  const product = { ...PRODUCTS.find(item => item.id === 'pista')!, prices: { '250g': 1350, '500g': 2700 } };
  const metadata = routeMetadata('/product/pista', origin, [product]);
  const html = renderRouteDocument(template, metadata, origin, 'fixture-nonce');
  assert.equal(metadata.status, 200);
  assert.ok(html.includes(`<title>${product.name_en}`));
  assert.ok(html.includes('href="https://store.example.test/product/pista"'));
  assert.ok(html.includes('property="og:type" content="product"'));
  assert.ok(html.includes(`name="twitter:title" content="${product.name_en}`));
  assert.ok(html.includes('"lowPrice":1350'));
  assert.doesNotMatch(html, /schema.org\/InStock/);
  for (const tag of html.matchAll(/<script\b[^>]*>/g)) assert.match(tag[0], /nonce="fixture-nonce"/);
});

test('unknown product, category, article and page URLs return noindex 404 metadata', () => {
  for (const route of ['/unknown', '/product/no-product', '/shop/no-category', '/journal/no-article', '/pages/no-page', '/%E0%A4%A']) {
    const metadata = routeMetadata(route, origin, PRODUCTS);
    assert.equal(metadata.status, 404, route);
    assert.equal(metadata.noindex, true, route);
  }
  assert.equal(routeMetadata('/shop/nuts', origin, PRODUCTS).status, 200);
  assert.equal(routeMetadata('/admin/orders', origin, PRODUCTS).noindex, true);
  assert.equal(routeMetadata('/admin', origin, PRODUCTS).noindex, true);
  assert.equal(routeMetadata('/admin/studio', origin, PRODUCTS).noindex, true);
  assert.equal(routeMetadata('/staff/orders', origin, PRODUCTS).noindex, true);
  assert.equal(routeMetadata('/staff', origin, PRODUCTS).noindex, true);
});

test('catalog content cannot inject HTML or executable JSON into the document', () => {
  const product = { ...PRODUCTS[0], name_en: '<img src=x onerror=alert(1)>', desc_en: '</script><script>alert(1)</script>' };
  const html = renderRouteDocument(template, routeMetadata(`/product/${product.id}`, origin, [product]), origin, 'fixture');
  assert.doesNotMatch(html, /<img src=x|<script>alert/);
  assert.ok(html.includes('\\u003cimg'));
});
