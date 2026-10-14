import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import express from 'express';
import { once } from 'node:events';
import { PRODUCTS } from '../src/data/products';
import { JOURNAL_ARTICLES } from '../src/data/articles';
import { ARTICLE_INDEX } from '../src/data/articleIndex';
import { routeMetadata, publicSiteOrigin, organizationSchema, sitemapPaths } from '../src/lib/routeMetadata';
import { renderSeoDocument, renderRobots, renderSitemap } from '../src/server/seoDocument';
import { staticCatalogSnapshot } from '../src/lib/liveCatalog';
import { compactCatalog, parseCatalogTransport } from '../src/lib/catalogTransport';
import { createCatalogPricingRouter } from '../src/lib/catalogPricingRouter';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { experienceTranslations } from '../src/contexts/experienceTranslations';
import BubbleMenu from '../src/components/BubbleMenu';
import { ErrorFallback } from '../src/components/ErrorBoundary';
import LuxuryPreloader from '../src/components/LuxuryPreloader';
import MeasurementPreferences from '../src/components/MeasurementPreferences';

const origin = 'https://allbarka.example';
const template = '<html><head><title>Old title</title><meta name="description" content="Old"><link rel="canonical" href="https://old.example/"><meta property="og:title" content="Old"><script type="application/ld+json">{"@type":"Store","geo":"unverified"}</script></head><body><div id="root"></div><script type="module" src="/assets/site.js"></script></body></html>';
const render = (element: React.ReactElement) => renderToStaticMarkup(<MemoryRouter><LanguageProvider>{element}</LanguageProvider></MemoryRouter>);

test('every public sitemap path resolves to an indexable unique canonical route with useful metadata', () => {
  const paths = sitemapPaths(); assert.equal(new Set(paths).size, paths.length);
  for (const path of paths) { const metadata = routeMetadata(path, { origin }); assert.equal(metadata.status, 200, path); assert.equal(metadata.noindex, false, path); assert.ok(metadata.title.length > 10); assert.ok(metadata.description.length > 20); assert.equal(metadata.canonicalPath, path); }
  assert.equal(paths.filter(path => path.startsWith('/product/')).length, 89);
});

test('legacy category/info aliases canonicalize consistently and search queries never enter head metadata', () => {
  assert.equal(routeMetadata('/category/combos').canonicalPath, '/shop/gift-boxes');
  assert.equal(routeMetadata('/shop?category=spices').canonicalPath, '/shop/herbs-spices');
  assert.equal(routeMetadata('/story').canonicalPath, '/pages/our-story');
  assert.equal(routeMetadata('/contact').canonicalPath, '/pages/contact');
  const metadata = routeMetadata('/shop?search=private-phone-03001234567&utm_source=email'); assert.equal(metadata.noindex, true); assert.equal(metadata.canonicalPath, '/shop'); assert.doesNotMatch(JSON.stringify(metadata), /private-phone|03001234567|utm_source/);
});

test('private routes receive noindex and unknown products/categories/pages/articles return real 404 metadata', () => {
  for (const path of ['/cart', '/checkout?claimToken=private-token', '/success?orderId=private-order', '/admin', '/admin/orders']) { const metadata = routeMetadata(path); assert.equal(metadata.noindex, true); assert.equal(metadata.status, 200); assert.doesNotMatch(JSON.stringify(metadata), /private-token|private-order/); }
  for (const path of ['/missing', '/product/unknown', '/shop/unknown', '/policies/unknown', '/pages/unknown', '/journal/unknown']) { const metadata = routeMetadata(path); assert.equal(metadata.status, 404, path); assert.equal(metadata.noindex, true); assert.equal(metadata.structuredData, undefined); }
});

test('product schemas use verified current prices and availability and omit unverified or quote-only offers', () => {
  const snapshot = staticCatalogSnapshot(); const product = snapshot.catalog.find(product => product.id === 'pista')!;
  product.prices = { '250g': 1400, '500g': 2800, '1kg': 5600 }; product.active = false;
  const metadata = routeMetadata('/product/pista?claimToken=private', { origin, catalog: snapshot }); const offer = metadata.structuredData!.offers as any;
  assert.equal(offer.price, 1400); assert.equal(offer.priceCurrency, 'PKR'); assert.equal(offer.availability, 'https://schema.org/OutOfStock'); assert.equal(offer.url, origin + '/product/pista');
  assert.equal(routeMetadata('/product/pista').structuredData!.offers, undefined);
  const quote = PRODUCTS.find(product => product.quoteOnly)!; assert.equal(routeMetadata('/product/' + quote.id, { catalog: snapshot }).structuredData!.offers, undefined);
  assert.doesNotMatch(JSON.stringify(metadata.structuredData), /aggregateRating|private|loyalty|inventoryReservation/);
});

test('article route index matches actual published editorial metadata without bundling article bodies', () => {
  assert.deepEqual(ARTICLE_INDEX.map(value => value.slug), JOURNAL_ARTICLES.map(value => value.slug));
  for (const article of JOURNAL_ARTICLES) { const metadata = ARTICLE_INDEX.find(value => value.slug === article.slug)!; assert.equal(metadata.title, article.title); assert.equal(metadata.excerpt, article.excerpt); assert.equal(metadata.image, article.image); assert.ok(routeMetadata('/journal/' + article.slug).structuredData); }
  assert.doesNotMatch(JSON.stringify(ARTICLE_INDEX), /"sections"|"content"|"sources"/);
});

test('server HTML has one canonical/title/schema, complete share tags, safely escaped values and intact app assets', () => {
  const metadata = routeMetadata('/product/pista', { origin, catalog: staticCatalogSnapshot() });
  metadata.title = 'A "selection" <test>'; metadata.description = '<script>private</script>'; metadata.structuredData!.description = '</script><script>unsafe()</script>';
  const html = renderSeoDocument(template, metadata, origin);
  assert.equal((html.match(/<title>/g) || []).length, 1); assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.equal((html.match(/id="organization-structured-data"/g) || []).length, 1); assert.equal((html.match(/id="route-structured-data"/g) || []).length, 1);
  assert.match(html, /twitter:title/); assert.match(html, /og:image/); assert.match(html, /A &quot;selection&quot; &lt;test&gt;/); assert.match(html, /\\u003c\/script>/);
  assert.doesNotMatch(html, /<script>unsafe\(\)|unverified|https:\/\/old\.example/); assert.match(html, /src="\/assets\/site\.js"/);
});

test('only homepage HTML preloads the matching responsive hero; other routes do not fetch that background', () => {
  const home = renderSeoDocument(template, routeMetadata('/'), origin); assert.match(home, /hero-dry-fruits-mobile-v1.webp/); assert.match(home, /media="\(min-width: 768px\)"/);
  const product = renderSeoDocument(template, routeMetadata('/product/pista'), origin); assert.doesNotMatch(product, /hero-dry-fruits/);
});

test('crawler documents use configured origin, exclude private paths and contain no invented modification dates', () => {
  const xml = renderSitemap(origin); assert.match(xml, /https:\/\/allbarka\.example\/product\/pista/); assert.doesNotMatch(xml, /\/checkout|\/admin|\/cart|\/success|lastmod/);
  const robots = renderRobots(origin); assert.match(robots, /Sitemap: https:\/\/allbarka\.example\/sitemap.xml/); assert.match(robots, /Disallow: \/api\//);
  assert.equal(publicSiteOrigin('javascript:alert(1)'), 'https://allbarka.com'); assert.equal(publicSiteOrigin('https://user:password@example.com'), 'https://allbarka.com');
  assert.equal(publicSiteOrigin('https://allbarka.example/path?private'), origin);
  assert.doesNotMatch(JSON.stringify(organizationSchema(origin)), /geo|openingHours|priceRange|postalCode|allbarkadryfruits/);
});

test('compact pricing round-trips all canonical products/boxes and removes repeated descriptions and media', () => {
  const snapshot = staticCatalogSnapshot(); const compact = compactCatalog(snapshot); assert.deepEqual(parseCatalogTransport(compact), snapshot);
  const fullBytes = Buffer.byteLength(JSON.stringify(snapshot)), compactBytes = Buffer.byteLength(JSON.stringify(compact));
  assert.ok(compactBytes < fullBytes * .1); assert.ok(gzipSync(JSON.stringify(compact)).length < gzipSync(JSON.stringify(snapshot)).length * .1);
  assert.doesNotMatch(JSON.stringify(compact), /desc_en|imageName|health_|keywords|updatedBy|loyaltyPoints/);
  assert.deepEqual(parseCatalogTransport(snapshot), snapshot); // rolling deployments keep the old envelope usable
  assert.throws(() => parseCatalogTransport({ ...compact, format: 'unknown-version' }));
});

test('invalid or missing compact commercial fields fail closed without restoring old prices', () => {
  for (const mutate of [(value: any) => value.catalog.pop(), (value: any) => value.catalog[0].prices['250g'] = 0, (value: any) => value.catalog[0].active = 'yes', (value: any) => value.boxes[0].price = -1]) { const value = compactCatalog(staticCatalogSnapshot()); mutate(value); assert.throws(() => parseCatalogTransport(value)); }
});

test('the pricing HTTP boundary preserves array/full envelopes and uses distinct compact ETags with conditional reads', async () => {
  const snapshot = staticCatalogSnapshot(); const app = express(); app.use(createCatalogPricingRouter({ getDb: () => null, requireAdmin: (_req,res) => res.sendStatus(403), catalog: { getSnapshot: async () => snapshot, getCachedSnapshot: () => snapshot, close: () => {} } }));
  const server = app.listen(0, '127.0.0.1'); await once(server,'listening'); const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const legacy = await fetch(base + '/api/catalog'); assert.ok(Array.isArray(await legacy.json()));
    const full = await fetch(base + '/api/catalog/snapshot'); assert.ok((await full.json()).catalog[0].name_en);
    const compact = await fetch(base + '/api/catalog/snapshot?format=pricing-v1'); const body = await compact.json(); assert.equal(body.format, 'pricing-v1'); assert.equal(body.catalog[0].name_en, undefined);
    assert.notEqual(full.headers.get('etag'), compact.headers.get('etag'));
    assert.equal((await fetch(base + '/api/catalog/snapshot?format=pricing-v1', { headers: { 'If-None-Match': compact.headers.get('etag')! } })).status, 304);
    assert.equal((await fetch(base + '/api/catalog/snapshot?format=unknown')).status, 400);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve())); }
});

test('premium navigation renders crawlable links, 44px controls and an accessible collection disclosure', () => {
  const html = render(<BubbleMenu activeItem="Home"/>);
  for (const path of ['/', '/shop', '/gifting', '/journal', '/pages/contact']) assert.ok(html.includes(`href="${path}"`));
  assert.match(html, /aria-current="page"/); assert.match(html, /aria-expanded="false"/); assert.match(html, /aria-controls="navigation-collections-Shop"/); assert.match(html, /Browse collections/); assert.match(html, /min-h-11/);
});

test('error recovery uses readable theme tokens and translated copy without displaying exception details', () => {
  const html = render(<ErrorFallback/>); assert.match(html, /This page could not load/); assert.match(html, /Your saved bag/); assert.match(html, /Refresh page/); assert.match(html, /role="alert"/); assert.match(html, /var\(--color-surface\)/);
});

test('a normal server render never hides the shop behind a forced brand intro or automatically loaded analytics tag', () => {
  assert.equal(render(<LuxuryPreloader/>), '');
  const preferences = render(<MeasurementPreferences/>); assert.match(preferences, /Optional measurement is currently off/); assert.match(preferences, /Essential only/); assert.doesNotMatch(preferences, /<script|Allow measurement/);
});

test('all new route, privacy and recovery strings have matching English, Urdu and Arabic dictionaries', () => {
  for (const language of ['ur','ar'] as const) { assert.deepEqual(Object.keys(experienceTranslations[language]).sort(), Object.keys(experienceTranslations.en).sort()); for (const value of Object.values(experienceTranslations[language])) assert.ok(value.trim()); }
  for (const path of sitemapPaths()) assert.ok(experienceTranslations.en[routeMetadata(path).labelKey]);
  const root = fs.readFileSync(new URL('../src/layouts/RootLayout.tsx',import.meta.url),'utf8'); assert.match(root,/href="#main-content"/); assert.match(root,/id="main-content" tabIndex=\{-1\}/); assert.match(root,/aria-live="polite"/);
});
