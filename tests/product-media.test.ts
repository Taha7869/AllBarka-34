import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { once } from 'node:events';
import express from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import manifest from '../src/data/product-media.json';
import { PRODUCTS, NEW_PRODUCT_IDS, LEGACY_PRODUCT_IDS } from '../src/data/products';
import { getProductImages } from '../src/data/productImages';
import { getDefaultProductMedia, MAX_PRODUCT_IMAGES, ProductMediaError, resolveProductMedia, sanitizeProductMediaOverrides, validateMediaPatch, validateProductMedia, validateProductMediaUrl } from '../src/lib/productMedia';
import { createProductMediaRouter, getAdminProductMedia, getPublicProductMedia, updateProductMedia } from '../src/lib/productMediaRouter';
import { requestProductMedia } from '../src/lib/productMediaClient';
import { productMediaTranslations } from '../src/contexts/productMediaTranslations';

const image = '/images/generated/pista-secondary-v1.webp';
const media = { images: [image], videoUrl: 'https://cdn.allbarka.com/pista.mp4', videoPoster: image };
const errorCode = (code: string, status?: number) => (error: unknown) => error instanceof ProductMediaError && error.code === code && (status === undefined || error.httpStatus === status);

class FakeFirestore {
  store = new Map<string, any>();
  failAudit = false;
  reads = 0;
  snap(path: string) { const value = this.store.get(path); return { id: path.split('/').at(-1)!, exists: value !== undefined, data: () => structuredClone(value) }; }
  collection(path: string) {
    let cap = Infinity;
    const query = {
      doc: (id: string) => ({ path: `${path}/${id}`, get: async () => { this.reads++; return this.snap(`${path}/${id}`); } }),
      limit: (count: number) => { cap = count; return query; },
      get: async () => ({ docs: [...this.store.keys()].filter(key => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/')).slice(0, cap).map(key => this.snap(key)) }),
    };
    return query;
  }
  async runTransaction<T>(run: (transaction: any) => Promise<T>) {
    const writes: Array<{ path: string; value: any }> = [];
    const result = await run({
      get: async (ref: any) => { assert.equal(writes.length, 0); return this.snap(ref.path); },
      create: function(ref, data) { return this.set(ref, data); }, set: (ref: any, value: any) => { if (this.failAudit && ref.path.startsWith('productMediaAudits/')) throw new Error('audit unavailable'); writes.push({ path: ref.path, value: structuredClone(value) }); },
    });
    for (const write of writes) this.store.set(write.path, write.value);
    return result;
  }
  get db() { return this as unknown as Firestore; }
}

test('media URLs accept only public passive image and playable video assets', () => {
  assert.equal(validateProductMediaUrl(` ${image} `, 'image'), image);
  assert.equal(validateProductMediaUrl('/videos/generated/gift.mp4', 'video'), '/videos/generated/gift.mp4');
  assert.equal(validateProductMediaUrl('https://cdn.allbarka.com/assets/photo?width=400', 'image'), 'https://cdn.allbarka.com/assets/photo?width=400');
  assert.equal(validateProductMediaUrl('', 'video', true), '');
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,x', 'http://example.com/p.webp', '//cdn.allbarka.com/p.webp', '/images/../secrets.webp', '/images/%2e%2e/key.png', '/api/private/avatar.png', '/images/a.svg?secret=1', 'https://u:pass@cdn.allbarka.com/a.png', 'https://cdn.allbarka.com:3000/a.png', 'https://cdn.allbarka.com/a.png#fragment', 'https://localhost/a.png', 'https://router.local/a.png', 'https://10.0.0.1/a.png', 'https://172.16.0.1/a.png', 'https://192.168.1.1/a.png', 'https://2130706433/a.png', 'https://0x7f000001/a.png', 'https://127.1/a.png', 'https://[::1]/a.png']) {
    assert.throws(() => validateProductMediaUrl(url, 'image'), errorCode('INVALID_MEDIA_URL'), url);
  }
  assert.throws(() => validateProductMediaUrl('https://www.youtube.com/watch?v=abc', 'video'), errorCode('INVALID_MEDIA_VIDEO'));
});

test('media payloads preserve ordered covers and reject unsafe, duplicate and unbounded galleries', () => {
  assert.deepEqual(validateProductMedia({ images: [image, '/images/generated/pistachios-catalog-v1.webp'] }), {
    images: [image, '/images/generated/pistachios-catalog-v1.webp'], videoUrl: '', videoPoster: '',
  });
  for (const input of [{ images: [] }, { images: Array(MAX_PRODUCT_IMAGES + 1).fill(image) }, { images: [image, image] }, { images: [image], price: 1 }, { images: [image], videoPoster: image }, { images: [''] }]) assert.throws(() => validateProductMedia(input));
  assert.throws(() => validateMediaPatch({ expectedRevision: -1, media }), errorCode('INVALID_MEDIA_REVISION'));
  assert.throws(() => validateMediaPatch({ expectedRevision: '0', media }), errorCode('INVALID_MEDIA_REVISION'));
  assert.throws(() => validateMediaPatch({ expectedRevision: 0, media, actorUid: 'spoofed' }), errorCode('INVALID_MEDIA'));
});

test('all media manifests agree with the catalogue; established photography and single SVG covers are preserved', () => {
  const photographed = PRODUCTS.filter(product => LEGACY_PRODUCT_IDS.includes(product.id));
  assert.equal(photographed.length, 32);
  assert.equal(Object.keys(manifest).length, PRODUCTS.length);
  for (const product of photographed) {
    assert.ok(Object.hasOwn(manifest, product.id));
    const configured = validateProductMedia((manifest as Record<string, unknown>)[product.id]);
    assert.deepEqual(configured.images, getProductImages(product));
    for (const url of configured.images) assert.ok(existsSync(`public${url}`), `${product.id}: ${url}`);
    assert.equal(configured.videoUrl, '', 'Do not invent films for products');
  }
  for (const product of PRODUCTS.filter(item => NEW_PRODUCT_IDS.includes(item.id))) {
    assert.equal(Object.hasOwn(manifest, product.id), true);
    assert.deepEqual(resolveProductMedia(product).images, [product.image]);
    assert.equal(resolveProductMedia(product).source, 'manifest');
    for (const path of resolveProductMedia(product).images) assert.ok(existsSync(`public${path}`), product.id);
  }
  for (const product of PRODUCTS.filter(item => item.image === null)) {
    assert.equal(Object.hasOwn(manifest, product.id), false);
    assert.deepEqual(resolveProductMedia(product).images, []);
  }
});

test('single-image additions discard obsolete pack overrides without changing owner covers or real-photo galleries', () => {
  const product = PRODUCTS.find(product => product.id === 'ceylon-cinnamon')!;
  const retired = `/images/products/${product.id}-secondary.svg`;
  const override = { images: [retired, product.image!], videoUrl: 'https://cdn.allbarka.com/cinnamon.mp4', videoPoster: retired };
  assert.deepEqual(resolveProductMedia(product, { [product.id]: override }), {
    images: [product.image], videoUrl: override.videoUrl, videoPoster: product.image, source: 'override',
  });
  assert.deepEqual(override.images, [retired, product.image], 'Stored overrides must not be mutated');
  assert.deepEqual(resolveProductMedia(product, { [product.id]: { images: [retired] , videoUrl: '', videoPoster: '' } }).images, [product.image]);
  assert.deepEqual(resolveProductMedia(product, { [product.id]: { images: [image, product.image!], videoUrl: '', videoPoster: '' } }).images, [image], 'An owner can still replace the single cover');
  const photographed = PRODUCTS.find(product => product.id === 'pista')!;
  const photos = getProductImages(photographed);
  assert.deepEqual(resolveProductMedia(photographed, { pista: { images: photos, videoUrl: '', videoPoster: '' } }).images, photos);
});

test('resolving overrides never changes canonical catalogue prices or persisted product objects', () => {
  const product = PRODUCTS[0];
  const original = structuredClone(product);
  assert.equal(resolveProductMedia(product).source, 'manifest');
  assert.deepEqual(resolveProductMedia(product, { [product.id]: media }).images, [image]);
  assert.equal(resolveProductMedia(product, { [product.id]: media }).source, 'override');
  assert.deepEqual(product, original);
  assert.deepEqual(sanitizeProductMediaOverrides({ [product.id]: media, 'private-product': media, badam: { images: ['javascript:bad'] } }), { [product.id]: media });
});

test('durable media mutations require canonical IDs, exact revisions and verified actor identity', async () => {
  const fake = new FakeFirestore();
  const first = await updateProductMedia({ db: fake.db, productId: 'pista', body: { expectedRevision: 0, media }, actorUid: 'verified-admin', actorEmail: 'admin@allbarka.com', now: 1000 });
  assert.equal(first.revision, 1);
  assert.deepEqual(first.media, media);
  assert.equal(first.updatedAt, '1970-01-01T00:00:01.000Z');
  const audits = [...fake.store.entries()].filter(([key]) => key.startsWith('productMediaAudits/'));
  assert.equal(audits.length, 1);
  assert.equal(audits[0][1].actorUid, 'verified-admin');
  assert.equal(audits[0][1].actorEmail, 'admin@allbarka.com');
  await assert.rejects(updateProductMedia({ db: fake.db, productId: 'pista', body: { expectedRevision: 0, media }, actorUid: 'verified-admin' }), errorCode('MEDIA_REVISION_CONFLICT', 409));
  assert.equal(fake.store.size, 2, 'A conflicting edit must not write media or audit');
  await assert.rejects(updateProductMedia({ db: fake.db, productId: '../private', body: { expectedRevision: 1, media }, actorUid: 'admin' }), errorCode('UNKNOWN_MEDIA_PRODUCT', 404));
  await assert.rejects(updateProductMedia({ db: fake.db, productId: 'pista', body: { expectedRevision: 1, media }, actorUid: '' }), errorCode('FORBIDDEN_ADMIN', 403));
});

test('reset removes the public override while retaining revision history and default images', async () => {
  const fake = new FakeFirestore();
  await updateProductMedia({ db: fake.db, productId: 'pista', body: { expectedRevision: 0, media }, actorUid: 'admin' });
  const reset = await updateProductMedia({ db: fake.db, productId: 'pista', body: { expectedRevision: 1, media: null }, actorUid: 'admin' });
  assert.equal(reset.revision, 2);
  assert.equal(reset.override, null);
  assert.deepEqual(reset.media, getDefaultProductMedia(PRODUCTS[0]));
  assert.deepEqual(await getPublicProductMedia(fake.db), { overrides: {} });
  assert.equal((await getAdminProductMedia(fake.db, 'pista')).revision, 2);
});

test('a failed audit transaction cannot partially publish media', async () => {
  const fake = new FakeFirestore();
  fake.failAudit = true;
  await assert.rejects(updateProductMedia({ db: fake.db, productId: 'pista', body: { expectedRevision: 0, media }, actorUid: 'admin' }));
  assert.equal(fake.store.size, 0);
});

test('public media responses expose sanitized overrides only, without audit identity', async () => {
  const fake = new FakeFirestore();
  fake.store.set('productMedia/pista', { media, revision: 5, updatedBy: 'private-uid', email: 'private@email.test' });
  fake.store.set('productMedia/badam', { media: { images: ['data:image/png,private'] } });
  fake.store.set('productMedia/not-canonical', { media });
  fake.store.set('productMediaAudits/private', { actorUid: 'private-uid' });
  assert.deepEqual(await getPublicProductMedia(fake.db), { overrides: { pista: media } });
  await assert.rejects(getPublicProductMedia(null), errorCode('MEDIA_STORE_UNAVAILABLE', 503));
  await assert.rejects(getAdminProductMedia(null, 'pista'), errorCode('MEDIA_STORE_UNAVAILABLE', 503));
});

test('router puts every admin read and write behind caller-supplied authoritative middleware', async () => {
  const fake = new FakeFirestore();
  const app = express();
  app.use(express.json());
  app.use(createProductMediaRouter({ getDb: () => fake.db, requireAdmin: (req, res, next) => {
    if (req.headers.authorization !== 'Bearer verified-admin') return res.status(403).json({ code: 'FORBIDDEN_ADMIN' });
    (req as any).user = { uid: 'verified-admin', email: 'admin@allbarka.com' }; next();
  } }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as import('node:net').AddressInfo).port;
  const url = `http://127.0.0.1:${port}`;
  try {
    for (const method of ['GET', 'PATCH']) {
      const denied = await fetch(`${url}/api/admin/product-media/pista`, { method, headers: { 'Content-Type': 'application/json' }, ...(method === 'PATCH' ? { body: JSON.stringify({ expectedRevision: 0, media }) } : {}) });
      assert.equal(denied.status, 403);
    }
    assert.equal(fake.store.size, 0);
    const response = await fetch(`${url}/api/admin/product-media/pista`, { method: 'PATCH', headers: { Authorization: 'Bearer verified-admin', 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, media }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).record.revision, 1);
    const publicResponse = await fetch(`${url}/api/product-media`);
    assert.deepEqual(await publicResponse.json(), { overrides: { pista: media } });
    assert.equal(publicResponse.headers.get('cache-control'), 'public, max-age=30');
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('admin media client sends PATCH with token identity and validates the returned record', async () => {
  const original = globalThis.fetch;
  let request: RequestInit;
  globalThis.fetch = async (url, options) => { assert.equal(url, '/api/admin/product-media/pista'); request = options!; return new Response(JSON.stringify({ record: { productId: 'pista', revision: 1, updatedAt: null, override: media, media } }), { status: 200 }); };
  try {
    const result = await requestProductMedia(async () => 'private-token', 'pista', { patch: { expectedRevision: 0, media } });
    assert.equal(result.revision, 1);
    assert.equal(request!.method, 'PATCH');
    assert.equal((request!.headers as Record<string, string>).Authorization, 'Bearer private-token');
    assert.equal(request!.credentials, 'omit');
    assert.deepEqual(JSON.parse(request!.body as string), { expectedRevision: 0, media });
  } finally { globalThis.fetch = original; }
});

test('a stalled authentication token cannot leave a media save pending forever', async () => {
  await assert.rejects(requestProductMedia(() => new Promise<string>(() => {}), 'pista', { timeoutMs: 25 }), errorCode('MEDIA_REQUEST_TIMEOUT', 0));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(requestProductMedia(async () => 'token', 'pista', { signal: controller.signal }), errorCode('MEDIA_REQUEST_CANCELLED', 0));
});

test('media editor labels have complete English, Urdu and Arabic dictionaries', () => {
  assert.deepEqual(Object.keys(productMediaTranslations.ur).sort(), Object.keys(productMediaTranslations.en).sort());
  assert.deepEqual(Object.keys(productMediaTranslations.ar).sort(), Object.keys(productMediaTranslations.en).sort());
  for (const dictionary of [productMediaTranslations.ur, productMediaTranslations.ar]) for (const value of Object.values(dictionary)) assert.match(value, /[\u0600-\u06ff]/);
});
