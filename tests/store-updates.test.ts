import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import express, { type RequestHandler } from 'express';
import {
  listStoreUpdates, markUpdatesRead, publishStoreUpdate, readUpdateFeed, saveUpdatePreference,
  sanitizeStoreUpdate, StoreUpdateError, updateCopy, updateLink, updatePreferences, validateUpdateDraft,
} from '../src/lib/storeUpdates';
import { createStoreUpdatesRouter } from '../src/lib/storeUpdatesRouter';
import { updatesRequest, UpdateRequestError } from '../src/lib/updatesClient';
import { hasAdminClaim } from '../src/lib/adminOperations';
import { updateTranslations } from '../src/contexts/updateTranslations';

const NOW = Date.parse('2026-10-03T12:00:00Z');
const actor = { uid: 'admin-verified', email: 'admin@example.test' };
const draft = (overrides: Record<string, unknown> = {}) => ({
  requestId: 'updates-test-request-0001',
  title: { en: 'Fresh harvest', ur: 'نئی فصل', ar: 'محصول جديد' },
  message: { en: 'Discover the latest boutique collection.', ur: 'بوتیک کی نئی کلیکشن دیکھیں۔', ar: 'اكتشف أحدث مجموعة في البوتيك.' },
  href: '/shop/nuts?sort=price-asc#products',
  ...overrides,
});
const rejectsStore = (code: string, status = 400) => (error: unknown) => error instanceof StoreUpdateError && error.code === code && error.status === status;
const rejectsRequest = (code: string) => (error: unknown) => error instanceof UpdateRequestError && error.code === code;

/** Transaction writes commit together; a failed audit never leaves a published note. */
class TransactionalFirestore {
  store = new Map<string, any>();
  reads: string[] = [];
  queryLimit = 0;
  failAudit = false;
  private sequence = 0;
  private transactionTail: Promise<unknown> = Promise.resolve();
  snapshot(path: string) {
    const record = this.store.get(path);
    return { id: path.split('/').pop()!, exists: record !== undefined, data: () => structuredClone(record) };
  }
  collection(path: string) {
    const db = this;
    const state: { field?: string; direction?: string; limit?: number } = {};
    const query = {
      doc(id = `auto-${++db.sequence}`) {
        const docPath = `${path}/${id}`;
        return { path: docPath, collection: (name: string) => db.collection(`${docPath}/${name}`),
          get: async () => { db.reads.push(docPath); return db.snapshot(docPath); } };
      },
      orderBy(field: string, direction: string) { state.field = field; state.direction = direction; return query; },
      limit(limit: number) { state.limit = limit; db.queryLimit = limit; return query; },
      async get() {
        db.reads.push(path);
        let documents = [...db.store.keys()].filter(key => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/')).map(key => db.snapshot(key));
        if (state.field) documents.sort((a, b) => (a.data()[state.field!] - b.data()[state.field!]) * (state.direction === 'desc' ? -1 : 1));
        if (state.limit) documents = documents.slice(0, state.limit);
        return { docs: documents };
      },
    };
    return query;
  }
  runTransaction<T>(run: (transaction: any) => Promise<T>): Promise<T> {
    const operation = this.transactionTail.then(async () => {
      const pending: Array<{ path: string; data: any; merge: boolean }> = [];
      const transaction = {
        get: async (ref: { path: string }) => {
          assert.equal(pending.length, 0, 'Firestore reads must precede transaction writes');
          this.reads.push(ref.path);
          return this.snapshot(ref.path);
        },
        set: (ref: { path: string }, data: any, options?: { merge: boolean }) => {
          if (this.failAudit && ref.path.includes('/audit/')) throw new Error('Private audit write failure');
          pending.push({ path: ref.path, data: structuredClone(data), merge: !!options?.merge });
        },
      };
      const result = await run(transaction);
      for (const write of pending) this.store.set(write.path, write.merge ? { ...this.store.get(write.path), ...write.data } : write.data);
      return result;
    });
    this.transactionTail = operation.catch(() => undefined);
    return operation;
  }
}

test('update drafts trim complete language pairs and accept only internal catalogue/content links', () => {
  const result = validateUpdateDraft(draft({ title: { en: '  Fresh harvest  ' }, message: { en: ' New arrivals.\nSee the collection. ' } }));
  assert.equal(result.title.en, 'Fresh harvest');
  assert.equal(result.message.en, 'New arrivals.\nSee the collection.');
  assert.equal(result.title.ur, '');
  for (const href of ['', '/shop', '/shop/nuts?budget=1000', '/product/pista', '/gifting', '/journal#harvest', '/pages/contact', '/policies/privacy']) assert.equal(updateLink(href), href);
  for (const href of ['https://example.test', '//example.test', '/api/admin/updates', '/admin', '/checkout', '/shop\\outside', '/shop/../admin', '/shop/space here', '/shop\n']) {
    assert.throws(() => updateLink(href), rejectsStore('UPDATE_INVALID_LINK'), href);
  }
});

test('malformed drafts cannot publish blank English, partial translations, control characters or unsafe identities', () => {
  const invalid = [null, {}, draft({ title: { en: '' } }), draft({ title: { en: 'Title', ur: 'عنوان' }, message: { en: 'Message' } }),
    draft({ title: { en: 'a'.repeat(91) } }), draft({ message: { en: 'a'.repeat(1001) } }),
    draft({ title: { en: 123 } }), draft({ message: { en: 'private\u0001data' } }),
    draft({ requestId: '../private-token-00001' }), draft({ requestId: 'short' })];
  for (const input of invalid) assert.throws(() => validateUpdateDraft(input), rejectsStore('UPDATE_INVALID'));
  const fallback = sanitizeStoreUpdate('note', { ...draft({ title: { en: 'English' }, message: { en: 'English message' } }), publishedAt: NOW })!;
  assert.deepEqual(updateCopy(fallback, 'ur'), { title: 'English', message: 'English message' });
});

test('public notes use an allowlist and drop private authors, request data and malformed database rows', () => {
  const raw = { ...draft(), publishedAt: NOW, authorUid: 'private-admin', actorEmail: 'private@example.test', accessToken: 'secret' };
  const safe = sanitizeStoreUpdate('note-1', raw)!;
  assert.deepEqual(Object.keys(safe).sort(), ['href', 'id', 'message', 'publishedAt', 'title']);
  assert.equal(JSON.stringify(safe).includes('private-admin'), false);
  assert.deepEqual(updateCopy(safe, 'ar'), { title: 'محصول جديد', message: 'اكتشف أحدث مجموعة في البوتيك.' });
  for (const publishedAt of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 8640000000000001, '2026-10-03']) assert.equal(sanitizeStoreUpdate('bad', { ...raw, publishedAt }), null);
  assert.equal(sanitizeStoreUpdate('bad', { ...raw, href: '//external.test' }), null);
  assert.deepEqual(updatePreferences({ enabled: 'true', seenAt: '100', privateToken: 'hidden' }), { enabled: false, seenAt: 0 });
});

test('account updates are opt-in and initial enablement starts unread tracking at the current snapshot', async () => {
  const db = new TransactionalFirestore();
  await publishStoreUpdate(db, draft(), actor, NOW - 1000);
  const untouched = await readUpdateFeed(db, 'owner-a', NOW);
  assert.deepEqual(untouched, { items: [], preferences: { enabled: false, seenAt: 0 }, unread: 0, asOf: NOW });
  assert.equal(db.reads.filter(path => path === 'storeUpdates').length, 0);
  assert.deepEqual(await saveUpdatePreference(db, 'owner-a', true, NOW), { enabled: true, seenAt: NOW });
  const oldNews = await readUpdateFeed(db, 'owner-a', NOW);
  assert.equal(oldNews.items.length, 1);
  assert.equal(oldNews.unread, 0);
  await publishStoreUpdate(db, draft({ requestId: 'updates-test-request-0002' }), actor, NOW + 1000);
  await publishStoreUpdate(db, draft({ requestId: 'updates-test-request-0003' }), actor, NOW + 5000);
  const feed = await readUpdateFeed(db, 'owner-a', NOW + 2000);
  assert.equal(feed.unread, 1);
  assert.equal(feed.asOf, NOW + 2000);
  assert.deepEqual(feed.items.map(item => item.publishedAt), [NOW + 1000, NOW - 1000]);
  assert.deepEqual((await readUpdateFeed(db, 'owner-b', NOW + 2000)).items, []);
});

test('reading a feed snapshot cannot consume later updates or regress the read cursor', async () => {
  const db = new TransactionalFirestore();
  await saveUpdatePreference(db, 'owner-a', true, NOW);
  await publishStoreUpdate(db, draft(), actor, NOW + 1000);
  const snapshot = await readUpdateFeed(db, 'owner-a', NOW + 2000);
  await publishStoreUpdate(db, draft({ requestId: 'updates-test-request-0002' }), actor, NOW + 3000);
  const marked = await markUpdatesRead(db, 'owner-a', snapshot.asOf, NOW + 4000);
  assert.equal(marked.seenAt, snapshot.asOf);
  assert.equal((await readUpdateFeed(db, 'owner-a', NOW + 4000)).unread, 1);
  assert.equal((await markUpdatesRead(db, 'owner-a', NOW - 1000, NOW + 4000)).seenAt, snapshot.asOf);
  await saveUpdatePreference(db, 'owner-a', false, NOW + 5000);
  assert.deepEqual((await readUpdateFeed(db, 'owner-a', NOW + 5000)).items, []);
  assert.equal((await saveUpdatePreference(db, 'owner-a', true, NOW + 6000)).seenAt, NOW + 6000);
  for (const through of [-1, NOW + 7000, Number.NaN, '100']) await assert.rejects(() => markUpdatesRead(db, 'owner-a', through, NOW + 6000), rejectsStore('UPDATE_INVALID'));
  for (const enabled of ['true', 1, null]) await assert.rejects(() => saveUpdatePreference(db, 'owner-a', enabled, NOW), rejectsStore('UPDATE_INVALID'));
});

test('publication retries are idempotent and cannot overwrite a previously published note', async () => {
  const db = new TransactionalFirestore();
  const [first, retry] = await Promise.all([publishStoreUpdate(db, draft(), actor, NOW), publishStoreUpdate(db, draft(), actor, NOW + 1000)]);
  assert.deepEqual(first, retry);
  assert.equal(first.publishedAt, NOW);
  assert.equal([...db.store.keys()].filter(path => path.startsWith('storeUpdates/') && !path.includes('/audit/')).length, 1);
  assert.equal([...db.store.keys()].filter(path => path.includes('/audit/')).length, 1);
  const audit = [...db.store.entries()].find(([path]) => path.includes('/audit/'))![1];
  assert.deepEqual(audit, { action: 'PUBLISHED', actorUid: actor.uid, actorEmail: actor.email, timestamp: NOW });
  await assert.rejects(() => publishStoreUpdate(db, draft({ title: { en: 'Different title', ur: 'نئی فصل', ar: 'محصول جديد' } }), actor, NOW + 2000), rejectsStore('UPDATE_CONFLICT', 409));
  assert.deepEqual((await listStoreUpdates(db))[0], first);
});

test('failed audit writes roll back the note, and missing persistence never claims success', async () => {
  const db = new TransactionalFirestore(); db.failAudit = true;
  await assert.rejects(() => publishStoreUpdate(db, draft(), actor, NOW), /audit write failure/);
  assert.equal(db.store.size, 0);
  for (const operation of [() => listStoreUpdates(null), () => readUpdateFeed(null, 'owner-a'), () => saveUpdatePreference(null, 'owner-a', true), () => markUpdatesRead(null, 'owner-a', NOW), () => publishStoreUpdate(null, draft(), actor)]) {
    await assert.rejects(operation, rejectsStore('PERSISTENCE_UNAVAILABLE', 503));
  }
});

test('the admin feed is bounded, sorted newest first and never includes nested audit records', async () => {
  const db = new TransactionalFirestore();
  for (let index = 0; index < 45; index++) db.store.set(`storeUpdates/note-${index}`, { ...draft(), publishedAt: NOW + index, authorUid: 'private-admin' });
  db.store.set('storeUpdates/note-44/audit/entry', { action: 'PUBLISHED', timestamp: NOW + 44 });
  const items = await listStoreUpdates(db);
  assert.equal(db.queryLimit, 40);
  assert.equal(items.length, 40);
  assert.equal(items[0].publishedAt, NOW + 44);
  assert.equal(items.at(-1)!.publishedAt, NOW + 5);
  assert.ok(items.every(item => !('authorUid' in item)));
});

test('the real update router gates every route and binds customer preferences to verified uid', async t => {
  const db = new TransactionalFirestore();
  const identities = new Map<string, { uid: string; email?: string; admin?: unknown }>([
    ['owner-a', { uid: 'owner-a' }], ['owner-b', { uid: 'owner-b' }],
    ['admin', { ...actor, admin: true }], ['fake-admin', { uid: 'intruder', admin: 'true' }],
  ]);
  const requireAuth: RequestHandler = (req, res, next) => {
    const user = identities.get(req.headers.authorization?.replace(/^Bearer /, '') || '');
    if (!user) { res.status(401).json({ code: 'AUTHENTICATION_REQUIRED' }); return; }
    (req as any).user = user; next();
  };
  const requireAdmin: RequestHandler = (req, res, next) => requireAuth(req, res, () => {
    if (!hasAdminClaim((req as any).user)) { res.status(403).json({ code: 'FORBIDDEN_ADMIN' }); return; }
    next();
  });
  const app = express(); app.use(express.json());
  app.use(createStoreUpdatesRouter({ getDb: () => db, requireAuth, requireAdmin }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address() as { port: number };
  const request = (path: string, token?: string, body?: unknown) => fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const [path, body] of [['/api/updates', undefined], ['/api/updates/preferences', { enabled: true }], ['/api/updates/read', { through: NOW }], ['/api/admin/updates', undefined], ['/api/admin/updates', draft()]] as const) {
    assert.equal((await request(path, undefined, body)).status, 401, `${path} must require authentication`);
  }
  assert.equal(db.store.size, 0);
  for (const token of ['owner-a', 'fake-admin']) {
    assert.equal((await request('/api/admin/updates', token)).status, 403);
    assert.equal((await request('/api/admin/updates', token, draft())).status, 403);
  }
  const optIn = await request('/api/updates/preferences?uid=owner-b', 'owner-a', { enabled: true, uid: 'owner-b' });
  assert.equal(optIn.status, 200);
  assert.equal(optIn.headers.get('cache-control'), 'no-store');
  const preferenceSnapshot = await optIn.json();
  assert.equal(db.store.get('customerUpdatePreferences/owner-a').enabled, true);
  assert.equal(db.store.has('customerUpdatePreferences/owner-b'), false);
  const other = await request('/api/updates?uid=owner-a', 'owner-b');
  assert.equal((await other.json()).preferences.enabled, false);
  const published = await request('/api/admin/updates', 'admin', { ...draft(), authorUid: 'forged-admin' });
  assert.equal(published.status, 200);
  const payload = await published.json();
  assert.equal('authorUid' in payload, false);
  assert.equal(db.store.get(`storeUpdates/${payload.id}`).authorUid, actor.uid);
  const read = await request('/api/updates/read', 'owner-a', { through: preferenceSnapshot.seenAt, uid: 'owner-b' });
  assert.equal(read.status, 200);
  assert.equal(db.store.has('customerUpdatePreferences/owner-b'), false);
  assert.equal((await request('/api/updates/preferences', 'owner-a', { enabled: 'true' })).status, 400);
});

test('the router reports database failures honestly without leaking diagnostics or caching responses', async t => {
  const requireIdentity: RequestHandler = (req, _res, next) => { (req as any).user = actor; next(); };
  const app = express(); app.use(express.json());
  app.use(createStoreUpdatesRouter({ getDb: () => null, requireAuth: requireIdentity, requireAdmin: requireIdentity }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address() as { port: number };
  for (const path of ['/api/updates', '/api/admin/updates']) {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { code: 'PERSISTENCE_UNAVAILABLE' });
  }
});

test('the update client sends exact authenticated no-store bodies without cookies', async () => {
  const original = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async (path, init) => {
      calls++;
      assert.equal(path, '/api/updates/preferences');
      assert.equal(init?.method, 'POST'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.cache, 'no-store');
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer verified-token');
      assert.deepEqual(JSON.parse(init?.body as string), { enabled: true });
      return new Response(JSON.stringify({ enabled: true, seenAt: NOW }), { status: 200 });
    };
    assert.deepEqual(await updatesRequest(async () => 'verified-token', '/api/updates/preferences', { body: { enabled: true } }), { enabled: true, seenAt: NOW });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('invalid or cancelled client paths never retrieve account tokens or fetch', async () => {
  let tokens = 0;
  const getToken = async () => { tokens++; return 'token'; };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => updatesRequest(getToken, '/api/updates', { signal: controller.signal }), rejectsRequest('REQUEST_FAILED'));
  for (const path of ['https://external.test/api/updates', '//external.test/api/updates', '/api/admin/updates', '/api/updates-other']) {
    await assert.rejects(() => updatesRequest(getToken, path), rejectsRequest('INVALID_PATH'));
  }
  assert.equal(tokens, 0);
});

test('the deadline covers stalled tokens, network response and JSON parsing', async t => {
  const original = globalThis.fetch;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response('{}'); };
    const token = updatesRequest(() => new Promise<string>(() => {}), '/api/updates');
    t.mock.timers.tick(12001);
    await assert.rejects(token, rejectsRequest('REQUEST_FAILED'));
    assert.equal(calls, 0);
    globalThis.fetch = () => new Promise<Response>(() => {});
    const network = updatesRequest(async () => 'token', '/api/updates');
    await Promise.resolve(); await Promise.resolve();
    t.mock.timers.tick(12001);
    await assert.rejects(network, rejectsRequest('REQUEST_FAILED'));
    globalThis.fetch = async () => ({ ok: true, json: () => new Promise(() => {}) }) as unknown as Response;
    const parsing = updatesRequest(async () => 'token', '/api/updates');
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    t.mock.timers.tick(12001);
    await assert.rejects(parsing, rejectsRequest('REQUEST_FAILED'));
  } finally { t.mock.timers.reset(); globalThis.fetch = original; }
});

test('service error codes survive while raw network, token and malformed-body diagnostics are contained', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ code: 'PERSISTENCE_UNAVAILABLE', message: 'Private Firestore diagnostics' }), { status: 503 });
    await assert.rejects(() => updatesRequest(async () => 'token', '/api/updates'), rejectsRequest('PERSISTENCE_UNAVAILABLE'));
    globalThis.fetch = async () => { throw new Error('private network diagnostics'); };
    await assert.rejects(() => updatesRequest(async () => 'token', '/api/updates'), rejectsRequest('REQUEST_FAILED'));
    globalThis.fetch = async () => new Response('<html>private reverse proxy diagnostics</html>', { status: 503 });
    await assert.rejects(() => updatesRequest(async () => 'token', '/api/updates'), rejectsRequest('REQUEST_FAILED'));
    await assert.rejects(() => updatesRequest(() => { throw new Error('private token diagnostics'); }, '/api/updates'), rejectsRequest('REQUEST_FAILED'));
  } finally { globalThis.fetch = original; }
});

test('all notification and publishing controls have English, Urdu and Arabic translations', () => {
  const keys = Object.keys(updateTranslations.en).sort();
  assert.ok(keys.length >= 25);
  for (const language of ['en', 'ur', 'ar'] as const) {
    assert.deepEqual(Object.keys(updateTranslations[language]).sort(), keys);
    for (const text of Object.values(updateTranslations[language])) assert.ok(text.trim());
  }
  for (const language of ['ur', 'ar'] as const) for (const text of Object.values(updateTranslations[language])) assert.match(text, /[\u0600-\u06ff]/);
});
