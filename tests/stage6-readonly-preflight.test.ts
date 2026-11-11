import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { collectReadOnlyPreflight, FLAGGED_PACKAGING_IDS } from '../scripts/stage6-readonly-preflight.mjs';

test('release preflight makes only credential-free public GETs and emits a bounded diagnostic allowlist', async () => {
  const app = express(); const observed: string[] = [];
  app.use((req, _res, next) => { assert.equal(req.headers.authorization, undefined); assert.equal(req.headers.cookie, undefined); observed.push(req.method + ' ' + req.path); next(); });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', aiConfigured: true, aiConnectivityVerified: false, secret: 'DO_NOT_EXPORT', build: { commit: 'a'.repeat(40), credential: 'DO_NOT_EXPORT' } }));
  app.get('/api/commerce/readiness', (_req, res) => res.json({ databaseConnected: true, durablePersistenceReady: false, notice: 'DO_NOT_EXPORT' }));
  app.get('/api/catalog', (_req, res) => res.json({ products: FLAGGED_PACKAGING_IDS.map(id => ({ id, active: false, prices: {}, variants: [], supplierNotes: 'DO_NOT_EXPORT' })) }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const report = await collectReadOnlyPreflight({ baseUrl: `http://127.0.0.1:${(server.address() as any).port}`, expectedCommit: 'b'.repeat(40) });
    assert.deepEqual(observed.sort(), ['GET /api/catalog', 'GET /api/commerce/readiness', 'GET /api/health']);
    assert.equal(report.deployedMatchesExpected, false); assert.equal(report.readiness.databaseConnected, true); assert.equal(report.readiness.durablePersistenceReady, false);
    assert.equal(report.writesPerformed, 0); assert.equal(report.acceptedOrderTested, false); assert.equal(report.flaggedProducts.length, 4);
    assert.doesNotMatch(JSON.stringify(report), /DO_NOT_EXPORT|supplierNotes|credential/);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('preflight rejects other origins/credentials and records malformed or oversized responses without claiming readiness', async () => {
  let calls = 0; const neverFetch = async () => { calls++; throw Error('not allowed'); };
  for (const baseUrl of ['https://evil.example', 'https://user:secret@allbarka.com', 'https://allbarka.com/api/admin', 'http://allbarka.com']) await assert.rejects(collectReadOnlyPreflight({ baseUrl, fetchImpl: neverFetch }), /PREFLIGHT_ORIGIN_NOT_ALLOWED/);
  assert.equal(calls, 0);
  const malformed = await collectReadOnlyPreflight({ fetchImpl: async () => new Response('<html>not an API</html>') });
  assert.equal(malformed.readiness.databaseConnected, null); assert.equal(malformed.publicProductCount, null); assert.ok(malformed.requests.every(request => request.error));
  const large = await collectReadOnlyPreflight({ fetchImpl: async () => new Response('x'.repeat(1_048_577)) });
  assert.ok(large.requests.every(request => request.error === 'RESPONSE_TOO_LARGE')); assert.equal(large.n8nExecutionTested, false);
});
