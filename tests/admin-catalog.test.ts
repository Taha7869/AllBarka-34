import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { checkCatalogAssets, filterAdminCatalog, getAdminCatalogSnapshot, isLocalCatalogImage } from '../src/lib/adminCatalog';

test('admin catalogue counts unique photographs rather than shared bundle references', () => {
  const snapshot = getAdminCatalogSnapshot(PRODUCTS);
  assert.equal(snapshot.productCount, 89);
  const newImages = PRODUCTS.filter(product => product.image?.startsWith('/images/products/')).length;
  assert.equal(snapshot.imageCount, 46 + newImages * 2);
  assert.equal(snapshot.galleryCount, 14 + newImages);
  assert.equal(snapshot.issueCount, 0);
  assert.equal(snapshot.rows.reduce((count, row) => count + row.images.length, 0), 50 + newImages * 2);
});

test('catalogue quality flags duplicate identities, invalid prices, untranslated names and placeholders', () => {
  const broken = { ...PRODUCTS[0], id: 'test-broken', name_ur: PRODUCTS[0].name_en, prices: { '250g': -1 }, image: '', imageName: '' };
  const snapshot = getAdminCatalogSnapshot([broken, broken]);
  assert.deepEqual(snapshot.rows[0].issues, ['id', 'name', 'portion', 'image']);
  assert.equal(snapshot.issueCount, 8);
});

test('catalogue admin search supports canonical IDs and translated product queries with category filters', () => {
  const { rows } = getAdminCatalogSnapshot(PRODUCTS);
  assert.equal(filterAdminCatalog(rows, 'oil-blackseed', '')[0]?.product.id, 'oil-blackseed');
  assert.ok(filterAdminCatalog(rows, 'بادام', 'nuts').some(row => row.product.id === 'badam'));
  const gifts = filterAdminCatalog(rows, 'بادام', 'gift-boxes');
  assert.ok(gifts.some(row => row.product.id === 'deal-2'));
  assert.ok(gifts.every(row => row.product.category === 'gift-boxes'));
  assert.equal(filterAdminCatalog(rows, '', 'oils').length, 15);
});

test('image health audit only allows local image paths', () => {
  assert.equal(isLocalCatalogImage('/images/generated/pista-secondary-v1.webp'), true);
  for (const path of ['https://example.com/image.webp', '//example.com/image.webp', '/api/admin/orders', '/images/../private', '/images/%2e%2e/private', '/images//file.webp', '/images/./file.webp', '/images/file.webp?secret=1']) {
    assert.equal(isLocalCatalogImage(path), false, path);
  }
});

test('image audit deduplicates requests, bounds concurrency and rejects HTML fallbacks', async () => {
  let active = 0;
  let maxActive = 0;
  const calls: string[] = [];
  const results = await checkCatalogAssets([
    '/images/a.webp', '/images/b.webp', '/images/a.webp', '/images/html.webp', '/images/missing.webp', '/images/c.webp', 'https://example.com/image.webp',
  ], {
    signal: new AbortController().signal,
    concurrency: 99,
    fetcher: (async (path: string, options: RequestInit) => {
      calls.push(path);
      assert.equal(options.method, 'HEAD');
      assert.equal(options.redirect, 'error');
      assert.equal(options.credentials, 'same-origin');
      active++; maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      return new Response(null, { status: path.includes('missing') ? 404 : 200, headers: { 'content-type': path.includes('html') ? 'text/html' : 'image/webp' } });
    }) as typeof fetch,
  });
  assert.equal(calls.length, 5);
  assert.equal(maxActive, 4);
  assert.equal(results.length, 6);
  assert.equal(results.find(result => result.path.includes('html'))?.result, 'type');
  assert.equal(results.find(result => result.path.includes('missing'))?.result, 'http');
  assert.equal(results.find(result => result.path.startsWith('https'))?.result, 'unsafe');
  assert.equal(results.filter(result => result.result === 'ok').length, 3);
});

test('cancelling an image audit prevents queued requests and callback updates', async () => {
  const controller = new AbortController();
  let calls = 0;
  const results = await checkCatalogAssets(['/images/a.webp', '/images/b.webp', '/images/c.webp'], {
    signal: controller.signal, concurrency: 1,
    onResult: () => controller.abort(),
    fetcher: (async () => { calls++; return new Response(null, { headers: { 'content-type': 'image/webp' } }); }) as typeof fetch,
  });
  assert.equal(calls, 1);
  assert.equal(results.length, 1);
  const preAborted = new AbortController(); preAborted.abort();
  assert.deepEqual(await checkCatalogAssets(['/images/a.webp'], { signal: preAborted.signal, fetcher: (() => { throw Error('Should not run'); }) as typeof fetch }), []);
});

test('image audit reports bounded request timeouts and network failures separately', async () => {
  const results = await checkCatalogAssets(['/images/slow.webp', '/images/network.webp'], {
    signal: new AbortController().signal, timeoutMs: 50,
    fetcher: (async (path: string, options: RequestInit) => {
      if (path.includes('network')) throw Error('Offline');
      return new Promise<Response>((_resolve, reject) => options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
    }) as typeof fetch,
  });
  assert.equal(results.find(result => result.path.includes('slow'))?.result, 'timeout');
  assert.equal(results.find(result => result.path.includes('network'))?.result, 'network');
});

test('one image audit has a hard maximum of 256 checks', async () => {
  let calls = 0;
  const results = await checkCatalogAssets(Array.from({ length: 300 }, (_, index) => `/images/${index}.webp`), {
    signal: new AbortController().signal,
    fetcher: (async () => { calls++; return new Response(null, { headers: { 'content-type': 'image/webp' } }); }) as typeof fetch,
  });
  assert.equal(calls, 256);
  assert.equal(results.length, 256);
});
