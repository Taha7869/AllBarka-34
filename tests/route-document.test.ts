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

test('product HTML carries breadcrumbs Home > Shop > Category > Product for search results', () => {
  const product = PRODUCTS.find(item => item.id === 'pista')!;
  const metadata = routeMetadata('/product/pista', origin, [product]);
  const graph = (metadata.structuredData as any)['@graph'];
  assert.equal(graph[0]['@type'], 'Product');
  const crumbs = graph[1].itemListElement;
  assert.equal(graph[1]['@type'], 'BreadcrumbList');
  assert.deepEqual(crumbs.map((c: any) => c.position), crumbs.map((_: any, i: number) => i + 1));
  assert.equal(crumbs[0].item, `${origin}/`);
  assert.equal(crumbs.at(-1).item, `${origin}/product/pista`);
  assert.ok(crumbs.length >= 3);
});

test('the home page schema names the store, its area only, and its site search', () => {
  const html = readFileSync('index.html', 'utf8');
  const json = JSON.parse(html.split('<script type="application/ld+json">')[1].split('</script>')[0]);
  const store = json['@graph'].find((n: any) => n['@type'] === 'Store');
  const site = json['@graph'].find((n: any) => n['@type'] === 'WebSite');
  assert.equal(store.address.addressLocality, 'Lahore');
  assert.equal(store.address.streetAddress, 'Allama Iqbal Town');
  assert.equal(store.geo, undefined);
  assert.doesNotMatch(store.image, /unsplash/);
  assert.match(site.potentialAction.target.urlTemplate, /\/shop\?search=\{search_term_string\}$/);
});

test('track, cookie policy, offline, reveal routes return 200 with proper indexability and LCP image preloads', () => {
  const cookiesMeta = routeMetadata('/policies/cookies', origin, PRODUCTS);
  assert.equal(cookiesMeta.status, 200);
  assert.equal(cookiesMeta.noindex, undefined);
  assert.match(cookiesMeta.title, /Cookie Policy/);

  const trackMeta = routeMetadata('/track', origin, PRODUCTS);
  assert.equal(trackMeta.status, 200);
  assert.equal(trackMeta.noindex, undefined);

  const offlineMeta = routeMetadata('/offline', origin, PRODUCTS);
  assert.equal(offlineMeta.status, 200);
  assert.equal(offlineMeta.noindex, true);

  const revealMeta = routeMetadata('/reveal/demo-token', origin, PRODUCTS);
  assert.equal(revealMeta.status, 200);
  assert.equal(revealMeta.noindex, true);

  const homeHtml = renderRouteDocument(template, routeMetadata('/', origin, PRODUCTS), origin, 'nonce-1');
  assert.match(homeHtml, /rel="preload" as="image" href="\/images\/living-gallery-final\/hero-mobile\.webp"[^>]*fetchpriority="high"/);

  const pista = PRODUCTS.find(item => item.id === 'pista')!;
  const pdpHtml = renderRouteDocument(template, routeMetadata('/product/pista', origin, [pista]), origin, 'nonce-1');
  assert.match(pdpHtml, /rel="preload" as="image" href="\/images\/[^"]+" fetchpriority="high"/);
});
