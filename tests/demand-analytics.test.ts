import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createDemandBuffer, karachiDay, summarizeDemand, validDemandEvent } from '../src/lib/demandAnalytics';
import { memoryFirestore } from './helpers/memoryFirestore';

test('demand events accept only known types and product ids, never personal data', () => {
  assert.deepEqual(validDemandEvent({ type: 'product_view', productId: 'badam' }), { type: 'product_view', productId: 'badam' });
  assert.deepEqual(validDemandEvent({ type: 'order_placed', email: 'x@y.z' }), { type: 'order_placed', productId: null });
  for (const bad of [null, {}, { type: 'login' }, { type: 'product_view' }, { type: 'add_to_cart', productId: 'Bad Id!' }, { type: 'add_to_cart', productId: 'a'.repeat(90) }]) assert.equal(validDemandEvent(bad), null);
  assert.equal(karachiDay(Date.UTC(2026, 10, 16, 20, 0)), '2026-11-17'); // 1 a.m. in Lahore is the next day
});

test('counts are buffered, flushed as daily totals and summarised for the owner', async () => {
  const { db, records } = memoryFirestore({});
  const now = () => Date.UTC(2026, 10, 16, 10, 0);
  const buffer = createDemandBuffer({ getDb: () => db as any, now });
  buffer.record('product_view', 'badam'); buffer.record('product_view', 'badam'); buffer.record('product_view', 'kaju');
  buffer.record('add_to_cart', 'badam'); buffer.record('order_placed', null);
  assert.ok(await buffer.flush() > 0);
  assert.equal(buffer.size(), 0);
  const saved: any = records.get('analyticsDaily/2026-11-16');
  assert.ok(saved, 'daily document written');
  const flat = JSON.stringify(saved);
  assert.ok(!/ip|agent|email|phone|uid/i.test(Object.keys(saved).join(' ')), flat);
  const summary = summarizeDemand([{ day: '2026-11-16', events: { product_view: { _total: 3, badam: 2, kaju: 1 }, add_to_cart: { _total: 1, badam: 1 }, order_placed: { _total: 1 } } }], 30);
  assert.equal(summary.totals.product_view, 3);
  assert.deepEqual(summary.topProducts.product_view[0], { productId: 'badam', count: 2 });
  assert.equal(summary.totals.order_placed, 1);
});

test('the browser tracker honours Do Not Track and the admin has a demand tab', () => {
  const tracker = fs.readFileSync('src/lib/demandTracking.ts', 'utf8');
  assert.match(tracker, /doNotTrack === '1'/);
  assert.match(tracker, /globalPrivacyControl/);
  assert.match(tracker, /credentials: 'omit'/);
  assert.match(fs.readFileSync('src/pages/AdminOrdersPage.tsx', 'utf8'), /<AdminDemandPanel \/>/);
  assert.match(fs.readFileSync('server.ts', 'utf8'), /createDemandAnalyticsRouter\(/);
});
