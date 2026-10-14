import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { listAdminOrders, parseAdminOrderFilters, orderSearchPrefixes, normalizeAdminSearch, invalidateAdminOrderMetrics } from '../src/lib/adminOperations';
import { backfillOrderSearch } from '../src/lib/orderSearchBackfill';
import { streamAdminOrdersCsv } from '../src/lib/adminExport';
import { downloadAdminOrdersCsv, MAX_ADMIN_EXPORT_BYTES } from '../src/lib/adminExportClient';
import { createN8nCommerceRouter } from '../src/lib/n8nCommerceRouter';
import { staticCatalogSnapshot } from '../src/lib/liveCatalog';
import { CommerceFirestoreFixture } from './commerce-firestore-fixture';
import express from 'express';
import { once } from 'node:events';

const createdAt = Date.now() - 60000;
function saved(index: number, overrides: Record<string, any> = {}): any {
  const customer = { name: index === 1 ? '=HYPERLINK("fixture.invalid")' : `Patron ${index}`, phone: '03001234567', address: 'Fixture address', city: index % 2 ? 'Lahore' : 'Karachi' };
  const value = { schemaVersion: '2.0.0', orderId: `AB-20261014-${index.toString(16).toUpperCase().padStart(8, '0')}`, source: 'website', uid: null, createdAtMs: createdAt - Math.floor(index / 2), createdAt: new Date(createdAt - Math.floor(index / 2)).toISOString(), updatedAt: new Date(createdAt).toISOString(), updatedAtMs: createdAt,
    status: index % 3 ? 'ORDER_RECEIVED' : 'DELIVERED', paymentStatus: index % 2 ? 'UNPAID' : 'PAID', paymentMethod: 'cod', orderType: 'ORDER',
    customer, gifting: { giftWrapping: false, giftWrapFee: 0 }, items: [{ id: 'pista-250g', productId: 'pista', name: 'Pista', selectedWeight: '250g', quantity: 1, price: 1250 }], totals: { subtotal: 1250, discount: 0, discountedSubtotal: 1250, shipping: 150, giftWrapFee: 0, total: 1400 },
    claimTokenHash: 'private-claim', integrationNotes: 'private-staff', ...overrides };
  return { ...value, searchPrefixes: orderSearchPrefixes(value), searchVersion: 1 };
}
function dataset(size: number) { return new CommerceFirestoreFixture(Object.fromEntries(Array.from({ length: size }, (_, i) => { const order = saved(i + 1); return [`orders/${order.orderId}`, order]; }))); }
const filters = (value: Record<string, string> = {}) => parseAdminOrderFilters(value);
class CsvResponse extends EventEmitter {
  headers = new Map<string, string>(); chunks: string[] = []; headersSent = false; ended = false; destroyed = false;
  stall = false; closeAfterRows = false;
  setHeader(name: string, value: string) { this.headers.set(name.toLowerCase(), value); }
  write(chunk: string) { this.headersSent = true; this.chunks.push(chunk); if (this.closeAfterRows && this.chunks.length > 1) this.emit('close'); if (this.stall) { queueMicrotask(() => this.emit('drain')); return false; } return true; }
  end() { this.ended = true; }
  destroy() { this.destroyed = true; this.emit('close'); }
}

test('11005-order reporting returns exact aggregate totals while a page reads only 21 documents', async () => {
  const fixture = dataset(11005); const result = await listAdminOrders(fixture.db, filters({ limit: '20' }));
  assert.equal(result.totalCount, 11005); assert.equal(result.metrics.orderValue, 11005 * 1400); assert.equal(result.orders.length, 20);
  assert.equal(fixture.documentReads, 21); assert.equal(result.scannedCount, 21); assert.equal(result.totalPages, 551); assert.ok(result.nextCursor);
  assert.doesNotMatch(JSON.stringify(result.orders), /private-claim|private-staff|searchPrefixes/);
});

test('stable timestamp and document-ID cursors neither skip nor repeat orders with tied timestamps', async () => {
  const fixture = dataset(23); let cursor = '', page = 1; const ids: string[] = [];
  do { const data = await listAdminOrders(fixture.db, filters({ limit: '3', page: String(page), cursor })); ids.push(...data.orders.map(value => value.orderId)); cursor = data.nextCursor || ''; page++; } while (cursor);
  assert.equal(ids.length, 23); assert.equal(new Set(ids).size, 23);
  assert.equal(fixture.aggregateReads, 12); // shared 20-second metrics across the same creation window
});

test('new arrivals are excluded from a continued creation window and filter changes require a new cursor', async () => {
  const fixture = dataset(6); const first = await listAdminOrders(fixture.db, filters({ limit: '2' }));
  const arriving = saved(99, { createdAtMs: Date.parse(first.asOf) + 1 }); fixture.records.set(`orders/${arriving.orderId}`, arriving);
  const second = await listAdminOrders(fixture.db, filters({ limit: '2', page: '2', cursor: first.nextCursor! }));
  assert.equal(second.totalCount, 6); assert.equal(second.orders.some(order => order.orderId === arriving.orderId), false);
  await assert.rejects(listAdminOrders(fixture.db, filters({ status: 'DELIVERED', limit: '2', page: '2', cursor: first.nextCursor! })), (error: any) => error.code === 'INVALID_CURSOR');
  await assert.rejects(listAdminOrders(fixture.db, filters({ page: '2' })), (error: any) => error.code === 'INVALID_CURSOR');
  await assert.rejects(listAdminOrders(fixture.db, filters({ cursor: 'malformed_cursor' })), (error: any) => error.code === 'INVALID_CURSOR');
});

test('indexed prefix filters find normalized phones, names and cities including orders beyond the old scan cap', async () => {
  const fixture = dataset(5005); const a = saved(8000, { customer: { name: 'Taha Fixture', city: 'Islamabad', address: 'Fixture', phone: '03111234567' } }); fixture.records.set(`orders/${a.orderId}`, a);
  for (const search of ['taha', 'islam', '+92 (311) 12']) {
    const result = await listAdminOrders(fixture.db, filters({ search })); assert.equal(result.orders[0]?.orderId, a.orderId); assert.equal(result.totalCount, 1);
  }
  assert.equal(normalizeAdminSearch('+92 (311) 12'), '9231112');
  assert.throws(() => filters({ search: 'a' }), (error: any) => error.code === 'INVALID_SEARCH');
  assert.throws(() => filters({ search: 'x'.repeat(33) }), (error: any) => error.code === 'INVALID_SEARCH');
  const prefixes = orderSearchPrefixes({ ...a, customer: { ...a.customer, name: 'Verylongname '.repeat(10) } }); assert.ok(prefixes.length <= 256); assert.ok(prefixes.includes('islam'));
});

test('legacy NEW and PACKED statuses participate in canonical counts and indexed filtering', async () => {
  const fixture = new CommerceFirestoreFixture(); const a = saved(1, { status: 'NEW' }); const b = saved(2, { status: 'PACKED' }); fixture.records.set(`orders/${a.orderId}`, a); fixture.records.set(`orders/${b.orderId}`, b);
  const result = await listAdminOrders(fixture.db, filters()); assert.equal(result.metrics.statusCounts.ORDER_RECEIVED, 1); assert.equal(result.metrics.statusCounts.PREPARING, 1);
  assert.equal((await listAdminOrders(fixture.db, filters({ queue: 'packing' }))).orders[0].status, 'PREPARING');
  invalidateAdminOrderMetrics(fixture.db);
  assert.equal((await listAdminOrders(fixture.db, filters({ paymentStatus: 'REFUNDED', queue: 'bank-pending' }))).totalCount, 0);
});

test('search backfill defaults to a bounded dry run, resumes, writes only derived fields and is idempotent', async () => {
  const fixture = dataset(205); for (const value of fixture.records.values()) { delete value.searchPrefixes; delete value.searchVersion; }
  const before = structuredClone([...fixture.records]); const plan = await backfillOrderSearch(fixture.db, { maxPages: 1 });
  assert.equal(plan.dryRun, true); assert.equal(plan.scanned, 200); assert.equal(plan.candidates, 200); assert.equal(plan.complete, false); assert.equal(fixture.writes, 0);
  const a = await backfillOrderSearch(fixture.db, { execute: true, maxPages: 1 }); const b = await backfillOrderSearch(fixture.db, { execute: true, afterId: a.afterId! });
  assert.equal(a.updated + b.updated, 205); assert.equal(b.complete, true);
  assert.equal((await backfillOrderSearch(fixture.db, { execute: true })).updated, 0);
  for (const [path, original] of before) { const { searchPrefixes, searchVersion, ...after } = fixture.records.get(path); assert.deepEqual(after, original); assert.equal(searchVersion, 1); assert.ok(searchPrefixes.length <= 256); }
});

test('CSV export streams all 1005 rows with one header, formula guards and backpressure', async () => {
  const fixture = dataset(1005); const response = new CsvResponse(); response.stall = true;
  await streamAdminOrdersCsv(fixture.db, filters(), 'en', new EventEmitter() as any, response as any);
  assert.equal(response.ended, true); const csv = response.chunks.join('');
  assert.equal(csv.split('\r\n').filter(Boolean).length, 1006); assert.equal([...csv.matchAll(/\uFEFF/g)].length, 1);
  assert.match(csv, /'=?HYPERLINK/); assert.doesNotMatch(csv, /private-claim|private-staff/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.ok(fixture.requestedLimits.every(limit => limit <= 501));
  assert.equal(fixture.aggregateReads, 0);
});

test('a disconnected export stops reading pages and a provider failure cannot finish a partial CSV', async () => {
  const fixture = dataset(1005); const disconnected = new CsvResponse(); disconnected.closeAfterRows = true;
  await streamAdminOrdersCsv(fixture.db, filters(), 'ur', new EventEmitter() as any, disconnected as any);
  assert.equal(disconnected.ended, false); assert.equal(fixture.documentReads, 501);
  const bad = dataset(1005); const original = bad.collection.bind(bad); let reads = 0;
  const wrap = (query: any): any => new Proxy(query, { get(target, key) {
    if (key === 'get') return async () => { if (++reads === 2) throw new Error('Provider unavailable'); return target.get(); };
    const value = target[key]; return typeof value === 'function' ? (...args: any[]) => { const result = value(...args); return result?.fixtureQuery ? wrap(result) : result; } : value;
  } });
  bad.collection = name => wrap(original(name)); const failed = new CsvResponse();
  await streamAdminOrdersCsv(bad.db, filters(), 'ar', new EventEmitter() as any, failed as any);
  assert.equal(failed.destroyed, true); assert.equal(failed.ended, false);
});

test('the browser export includes bearer auth and rejects HTML, incomplete bodies and navigation cancellation', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => { assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer fixture-token'); assert.equal(init?.cache, 'no-store'); return new Response('a,b\r\n1,2\r\n', { headers: { 'Content-Type': 'text/csv' } }); };
    assert.equal(await (await downloadAdminOrdersCsv(async () => 'fixture-token', '')).text(), 'a,b\r\n1,2\r\n');
    globalThis.fetch = async () => new Response('<html>Provider error</html>');
    await assert.rejects(downloadAdminOrdersCsv(async () => 'fixture-token', ''), (error: any) => error.code === 'INVALID_EXPORT');
    globalThis.fetch = async () => new Response(new ReadableStream({ start(controller) { controller.error(new Error('connection lost')); } }), { headers: { 'Content-Type': 'text/csv' } });
    await assert.rejects(downloadAdminOrdersCsv(async () => 'fixture-token', ''), (error: any) => error.code === 'REQUEST_FAILED');
    const controller = new AbortController(); const pending = downloadAdminOrdersCsv(() => new Promise(() => {}), '', controller.signal); controller.abort();
    await assert.rejects(pending, (error: any) => error.code === 'REQUEST_CANCELLED');
  } finally { globalThis.fetch = original; }
});

test('browser export enforces its 50 MiB limit and never returns an oversized download', async () => {
  const original = globalThis.fetch; let cancelled = false; let sent = 0;
  try {
    globalThis.fetch = async () => new Response(new ReadableStream({ pull(controller) { sent += 1024 * 1024; controller.enqueue(new Uint8Array(1024 * 1024)); }, cancel() { cancelled = true; } }), { headers: { 'Content-Type': 'text/csv' } });
    await assert.rejects(downloadAdminOrdersCsv(async () => 'fixture-token', ''), (error: any) => error.code === 'EXPORT_TOO_LARGE'); assert.equal(cancelled, true); assert.ok(sent > MAX_ADMIN_EXPORT_BYTES);
  } finally { globalThis.fetch = original; }
});

test('secret-guarded integration quotes respect tracked quantities without exposing private stock counts', async () => {
  const app = express(); app.use('/api/integrations/n8n', createN8nCommerceRouter({ getDb: () => null, getIntegrationSecret: () => 'fixture-integration-secret-32-characters', getCatalog: async () => staticCatalogSnapshot(), getInventory: async () => new Map([['pista', { mode: 'tracked', available: 249 }]]) }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); const url = `http://127.0.0.1:${(server.address() as any).port}/api/integrations/n8n/quote`;
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AllBarka-Integration-Secret': 'fixture-integration-secret-32-characters' }, body: JSON.stringify({ items: [{ productId: 'pista', selectedWeight: '250g', quantity: 1 }], city: 'Lahore', shippingMethodId: 'standard' }) });
    assert.equal(response.status, 409); const body = await response.json(); assert.equal(body.code, 'INSUFFICIENT_STOCK'); assert.doesNotMatch(JSON.stringify(body), /available|249|loyalty/);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('tracked query indexes and inventory/server-only reward rules are present with no duplicate indexes', () => {
  const indexes = JSON.parse(fs.readFileSync(new URL('../firestore.indexes.json', import.meta.url), 'utf8')).indexes;
  assert.equal(new Set(indexes.map((index: any) => JSON.stringify(index))).size, indexes.length);
  for (const index of indexes) { assert.equal(index.queryScope, 'COLLECTION'); assert.ok(index.fields.length >= 2); if (index.fields.some((field: any) => field.fieldPath === '__name__')) assert.equal(index.fields.at(-1).fieldPath, '__name__'); }
  assert.ok(indexes.some((index: any) => index.collectionGroup === 'orderEvents' && index.fields.some((field: any) => field.fieldPath === 'deliveryState')));
  assert.equal(indexes.filter((index: any) => index.collectionGroup === 'orders').length, 16);
  const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'); for (const path of ['catalogInventory', 'inventoryAudits', 'rewardClaims', 'rewardRedemptions']) assert.match(rules, new RegExp(`match /${path}/[^\\n]+allow read, write: if false`));
});
