import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import express from 'express';
import { createLoyaltyRouter } from '../src/lib/loyaltyRouter';
import { deploymentIdentity } from '../src/lib/deploymentIdentity';
import { publicRewards, REWARD_REDEMPTION_AVAILABLE } from '../src/lib/rewardAvailability';
import { REWARDS } from '../src/data/rewards';
import { loadLoyaltyAccount } from '../src/lib/loyaltyClient';
import { sanitizeOrderForCustomer, type CanonicalOrder } from '../src/lib/serverOrderService';
import { loyaltyTranslations } from '../src/contexts/loyaltyTranslations';

test('public deployment identity accepts a full commit and never exposes other environment values', () => {
  const sha = '36111E6A28BA674162F2C22352C92B659588959B';
  assert.deepEqual(deploymentIdentity({ RAILWAY_GIT_COMMIT_SHA: sha, RAILWAY_GIT_BRANCH: 'launch',
    FIREBASE_PRIVATE_KEY: 'private-do-not-disclose' }), { commit: sha.toLowerCase(), branch: 'launch' });
  assert.deepEqual(deploymentIdentity({ RAILWAY_GIT_COMMIT_SHA: 'secret-token', RAILWAY_GIT_BRANCH: 'bad\nbranch' }),
    { commit: null, branch: null });
  assert.deepEqual(deploymentIdentity({}), { commit: null, branch: null });
});

test('fulfilled rewards retain original point costs; future unsupported definitions cannot be exchanged', () => {
  const before = structuredClone(REWARDS);
  const visible = publicRewards(REWARDS);
  assert.equal(REWARD_REDEMPTION_AVAILABLE, true);
  assert.equal(visible.length, 4);
  assert.ok(visible.every(reward => reward.redeemable === true));
  assert.equal(publicRewards([{ ...REWARDS[0], rewardId: 'future_unsupported' } as any])[0].redeemable, false);
  assert.deepEqual(REWARDS, before);
  assert.deepEqual(visible.map(({ redeemable: _, ...reward }) => reward), before);
  for (const language of ['en', 'ur', 'ar'] as const) {
    assert.ok(loyaltyTranslations[language]['loyalty.paused']);
    assert.ok(loyaltyTranslations[language]['loyalty.existingReward']);
  }
});

test('account points load through bounded authenticated API reads, preserving issued reward identity', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push(String(url));
      assert.equal(options?.method ?? 'GET', 'GET');
      assert.equal(options?.cache, 'no-store');
      assert.equal(options?.credentials, 'omit');
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-account-token');
      return Response.json(String(url).endsWith('/profile') ? {
        loyaltyPoints: 300, transactions: [], activeRewards: [{ id: 'issued-voucher', rewardId: 'free_shipping', status: 'ACTIVE' }],
      } : publicRewards(REWARDS));
    };
    const result = await loadLoyaltyAccount(async () => 'test-account-token');
    assert.equal(result.profile.loyaltyPoints, 300);
    assert.equal(result.profile.activeRewards[0].id, 'issued-voucher');
    assert.deepEqual(calls.sort(), ['/api/loyalty/profile', '/api/loyalty/rewards']);
  } finally { globalThis.fetch = original; }
});

test('failed or malformed account reads never appear as a successful zero-point balance', async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [new Response('{}', { status: 503 }), Response.json({ loyaltyPoints: -1, transactions: [], activeRewards: [] })]) {
      globalThis.fetch = async url => String(url).endsWith('/profile') ? response.clone() : Response.json([]);
      await assert.rejects(loadLoyaltyAccount(async () => 'test-account-token'), /LOYALTY_UNAVAILABLE/);
    }
  } finally { globalThis.fetch = original; }
});

test('closing an account panel cancels a stalled token request without waiting for the provider', async () => {
  const controller = new AbortController();
  const pending = loadLoyaltyAccount(() => new Promise(() => {}), controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('customer order responses retain receipts while excluding private staff and claim fields', () => {
  const privateOrder = {
    schemaVersion: '2.0.0', orderId: 'AB-TEST-PRIVATE', source: 'website', uid: 'test-customer',
    createdAt: '2026-10-13T12:00:00Z', status: 'ORDER_RECEIVED', paymentStatus: 'UNPAID', paymentMethod: 'cod',
    customer: { name: 'Test Customer', phone: '03001234567', address: 'Test address', city: 'Lahore' },
    gifting: { giftWrapping: false, giftWrapFee: 0 }, items: [],
    totals: { subtotal: 1250, discount: 0, discountedSubtotal: 1250, shipping: 150, giftWrapFee: 0, total: 1400 },
    adminNotes: ['internal-staff-only'], adminNoteEntries: [{ text: 'private-entry', actorEmail: 'private-staff@example.invalid' }],
    integrationNotes: 'private-provider-note', claimTokenHash: 'private-hash', guestSessionId: 'private-session',
  } as unknown as CanonicalOrder;
  const response = sanitizeOrderForCustomer(privateOrder);
  assert.equal(response.orderId, privateOrder.orderId);
  assert.equal(response.totals.total, 1400);
  assert.equal(response.customer.city, 'Lahore');
  assert.doesNotMatch(JSON.stringify(response), /private-|internal-staff|adminNotes|adminNoteEntries|actorEmail|claimTokenHash|guestSessionId/);
});

test('loyalty HTTP boundary blocks keyless exchanges with zero database access and protects account reads', async () => {
  let databaseAccesses = 0;
  const app = express();
  app.use(express.json());
  app.use(createLoyaltyRouter({ getDb: () => { databaseAccesses++; return null; }, requireAuth: (request, response, next) => {
    if (request.headers.authorization !== 'Bearer fixture-token') return response.status(401).json({ code: 'AUTHENTICATION_REQUIRED' });
    (request as any).user = { uid: 'fixture-account' };
    next();
  } }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const listed = await (await fetch(`${origin}/api/loyalty/rewards`)).json();
    assert.ok(listed.every((reward: any) => reward.redeemable === true));
    for (const reward of REWARDS) {
      const response = await fetch(`${origin}/api/loyalty/redeem`, { method: 'POST',
        headers: { Authorization: 'Bearer fixture-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: reward.rewardId }) });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, 'INVALID_REDEMPTION_KEY');
    }
    assert.equal(databaseAccesses, 0);
    assert.equal((await fetch(`${origin}/api/loyalty/profile`)).status, 401);
    const unavailable = await fetch(`${origin}/api/loyalty/profile`, { headers: { Authorization: 'Bearer fixture-token' } });
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await unavailable.json(), { code: 'DB_UNAVAILABLE' });
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('loyalty profile returns only the caller ledger and safe voucher fields', async () => {
  const scopes: string[] = [];
  const user = { get: async () => ({ exists: true, data: () => ({ loyaltyPoints: 450, privateStaffNote: 'private-profile' }) }),
    collection: (name: string) => {
      scopes.push(name);
      const query = { orderBy: () => query, limit: () => query, where: () => query, get: async () => ({ docs: [{
        id: name === 'activeRewards' ? 'issued-voucher' : 'ledger-entry',
        data: () => name === 'activeRewards' ? { rewardId: 'free_shipping', status: 'ACTIVE', rewardType: 'SHIPPING',
          claimedAt: 1, expiresAt: Date.now() + 86400000, privateStaffNote: 'private-voucher' } : { type: 'EARN', points: 450,
          description: 'Completed order', createdAt: 1, privateStaffNote: 'private-ledger' },
      }] }) };
      return query;
    } };
  const db = { collection: (name: string) => { assert.equal(name, 'users'); return { doc: (uid: string) => {
    assert.equal(uid, 'caller-account'); return user;
  } }; } };
  const app = express();
  app.use(createLoyaltyRouter({ getDb: () => db as any, requireAuth: (request, _response, next) => {
    (request as any).user = { uid: 'caller-account' }; next();
  } }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}/api/loyalty/profile`);
    const profile = await response.json();
    assert.equal(profile.loyaltyPoints, 450);
    assert.equal(profile.activeRewards[0].id, 'issued-voucher');
    assert.equal(profile.transactions[0].transactionId, 'ledger-entry');
    assert.deepEqual(scopes.sort(), ['activeRewards', 'activeRewards', 'activeRewards', 'activeRewards', 'loyaltyTransactions']);
    assert.doesNotMatch(JSON.stringify(profile), /private-|privateStaffNote/);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
