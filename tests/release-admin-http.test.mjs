import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

test('production admin middleware authenticates bearer claims and parses price saves before validation', { timeout: 15000 }, async () => {
  // Local Auth emulator response only. This fixture never contacts Firebase or saves prices.
  const auth = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ users: [{ localId: 'offline-admin', validSince: '0', disabled: false }] }));
  });
  auth.listen(0, '127.0.0.1');
  await once(auth, 'listening');
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(port), CATALOG_SOURCE: 'static',
    FIREBASE_PROJECT_ID: 'allbarka-live', FIREBASE_CLIENT_EMAIL: '', FIREBASE_PRIVATE_KEY: '',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:59999', FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${auth.address().port}`,
    N8N_ORDER_WEBHOOK_URL: '', N8N_STATUS_WEBHOOK_URL: '', N8N_AI_WEBHOOK_URL: '',
    GOOGLE_SHEETS_ID: '', GOOGLE_SERVICE_ACCOUNT_EMAIL: '', GOOGLE_PRIVATE_KEY: '', ANALYTICS_MEASUREMENT_ID: '' };
  const child = spawn(process.execPath, ['build/server.cjs'], { env, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  const request = (path, options) => fetch(base + path, { ...options, signal: AbortSignal.timeout(4000) });
  const token = admin => {
    const now = Math.floor(Date.now() / 1000);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    return encode({ alg: 'none', typ: 'JWT' }) + '.' + encode({ aud: 'allbarka-live', iss: 'https://securetoken.google.com/allbarka-live',
      sub: 'offline-admin', iat: now, exp: now + 300, auth_time: now, admin,
      firebase: { sign_in_provider: 'custom', identities: {} } }) + '.';
  };
  try {
    let started = false;
    for (let i = 0; i < 100; i++) {
      assert.equal(child.exitCode, null, 'production server exited');
      try { started = (await request('/api/health')).ok; } catch {}
      if (started) break;
      await delay(50);
    }
    assert.ok(started, 'production server did not start');
    const target = '/api/admin/catalog-prices/boxes/box-tin';
    assert.equal((await request(target)).status, 401);
    assert.equal((await request(target, { headers: { Authorization: `Bearer ${token(false)}` } })).status, 403);
    const headers = { Authorization: `Bearer ${token(true)}`, Cookie: '__session=stale-cookie', 'Content-Type': 'application/json' };
    const unknown = await request('/api/admin/catalog-prices/products/not-a-product', { headers });
    assert.equal(unknown.status, 404);
    assert.equal((await unknown.json()).code, 'UNKNOWN_PRICE_TARGET');
    const result = await request(target, { method: 'POST', headers, body: JSON.stringify({ expectedVersion: 'a'.repeat(64),
      reason: 'Offline parser regression', pricing: { price: -1, active: true } }) });
    assert.equal(result.status, 400);
    assert.equal((await result.json()).code, 'INVALID_CATALOG_PRICE', 'parsed JSON must reach commercial-field validation');
  } finally {
    child.kill('SIGKILL');
    if (child.exitCode === null) await once(child, 'exit');
    auth.closeAllConnections();
    await new Promise(resolve => auth.close(resolve));
  }
});
