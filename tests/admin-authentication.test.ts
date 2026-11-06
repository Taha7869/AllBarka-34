import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import { isCurrentAdministrator, requireCurrentAdministrator } from '../src/lib/adminAuthentication';
import { authenticatePatronCredentials } from '../src/lib/serverAuthentication';

test('current authority rejects demotion, disabled/deleted accounts, identity mismatch and revoked sign-ins', async () => {
  const claims = { uid: 'owner', admin: true, auth_time: 1000 };
  let record: any = { uid: 'owner', customClaims: { admin: true }, disabled: false };
  let outage: any;
  const auth: any = { getUser: async () => { if (outage) throw outage; return record; } };
  assert.equal(await isCurrentAdministrator(auth, claims), true);
  record = { ...record, customClaims: { role: 'admin' } };
  assert.equal(await isCurrentAdministrator(auth, claims), true);
  for (const patch of [
    { customClaims: { admin: false } }, { disabled: true }, { uid: 'another-account' },
    { tokensValidAfterTime: new Date(1001000).toISOString() },
  ]) {
    record = { uid: 'owner', customClaims: { admin: true }, disabled: false, ...patch };
    assert.equal(await isCurrentAdministrator(auth, claims), false);
  }
  record = { uid: 'owner', customClaims: { admin: true }, tokensValidAfterTime: new Date(1000000).toISOString() };
  assert.equal(await isCurrentAdministrator(auth, claims), true);
  assert.equal(await isCurrentAdministrator(auth, { uid: 'owner', admin: true }), false);
  outage = { code: 'auth/user-not-found' };
  assert.equal(await isCurrentAdministrator(auth, claims), false);
  outage = new Error('private-provider-error');
  await assert.rejects(isCurrentAdministrator(auth, claims), /private-provider-error/);
  await assert.rejects(isCurrentAdministrator(null, claims), /AUTH_SERVICE_UNAVAILABLE/);
  assert.equal(await isCurrentAdministrator(auth, { uid: 'customer', admin: 'true' }), false);
});

test('real admin middleware fails closed on provider outage and never returns provider details', async () => {
  let record: any = { uid: 'owner', customClaims: { admin: true }, disabled: false };
  let outage = false, calls = 0;
  const auth: any = { getUser: async () => { calls++; if (outage) throw new Error('PRIVATE_PROVIDER_DETAILS'); return record; } };
  const app = express();
  app.use((req, res, next) => {
    if (!req.get('Authorization')) return void res.status(401).json({ code: 'UNAUTHORIZED' });
    (req as any).user = { uid: 'owner', admin: true, auth_time: 1000 }; next();
  });
  app.use('/api/admin', requireCurrentAdministrator(() => auth));
  app.get('/api/admin/orders', (_req, res) => res.json({ privateOrders: true }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/admin/orders`;
  try {
    assert.equal((await fetch(url)).status, 401);
    const request = () => fetch(url, { headers: { Authorization: 'Bearer signed-owner-fixture' } });
    assert.equal((await request()).status, 200);
    record.customClaims = { role: 'customer' };
    const denied = await request(); assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('cache-control'), 'private, no-store');
    record.customClaims = { admin: true }; outage = true;
    const unavailable = await request(); assert.equal(unavailable.status, 503);
    assert.doesNotMatch(await unavailable.text(), /PRIVATE_PROVIDER_DETAILS|privateOrders/);
    assert.equal(calls, 3, 'Authority is rechecked on every authenticated admin request');
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('revoked bearer credentials cannot fall back to a still-valid browser cookie', async () => {
  let cookieReads = 0;
  await assert.rejects(authenticatePatronCredentials('Bearer revoked-fixture', 'other-account-cookie', {
    verifyIdToken: async (_token, checkRevoked) => { assert.equal(checkRevoked, true); throw new Error('auth/id-token-revoked'); },
    verifySessionCookie: async () => { cookieReads++; return { uid: 'other-account' }; },
  }), /auth\/id-token-revoked/);
  assert.equal(cookieReads, 0);
});
