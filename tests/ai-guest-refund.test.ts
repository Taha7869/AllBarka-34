import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createAiChatRouter, type AiChatRouterOptions } from '../src/lib/aiChatRouter';
import { guestDailyLimit, releaseGuestAiMessage, reserveGuestAiMessage } from '../src/lib/aiGuestTrial';

async function post(options: Partial<AiChatRouterOptions>) {
  const app = express(); app.use(express.json());
  app.use(createAiChatRouter({ getDb: () => null, getCatalog: async () => [], recordDiagnostic: () => {}, ...options }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userText: 'salam' }),
    });
    return { status: response.status, body: await response.json() };
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}

test('a guest message is given back when the AI provider is busy or gives no answer, but not when it answers', async () => {
  for (const [askConsultant, status, refunded] of [
    [async () => { throw new Error('AI_RATE_LIMITED'); }, 429, 1],
    [async () => null, 503, 1],
    [async () => ({ action: 'answer', reply: 'Walaikum salam' }), 200, 0],
  ] as const) {
    let releases = 0;
    const result = await post({ reserveGuestTrial: async () => 4, releaseGuestTrial: async () => { releases++; }, askConsultant: askConsultant as any });
    assert.equal(result.status, status);
    assert.equal(releases, refunded, `status ${status}`);
  }
});

test('an exhausted trial is not refunded, and the daily limit comes from AI_GUEST_DAILY_LIMIT within 1 to 200', async () => {
  let releases = 0;
  const { GuestTrialLimitError } = await import('../src/lib/aiGuestTrial');
  const result = await post({ askConsultant: async () => ({ action: 'answer', reply: 'x' }), reserveGuestTrial: async () => { throw new GuestTrialLimitError(); }, releaseGuestTrial: async () => { releases++; } });
  assert.equal(result.body.code, 'AI_GUEST_TRIAL_EXHAUSTED');
  assert.equal(releases, 0);
  assert.equal(guestDailyLimit(undefined), 5);
  assert.equal(guestDailyLimit('20'), 20);
  for (const bad of ['0', '201', '2.5', 'many']) assert.equal(guestDailyLimit(bad), 5, bad);
});

test('release gives back exactly one message and never goes below zero', async () => {
  const records = new Map<string, any>();
  const db = {
    collection: () => ({ doc: (key: string) => ({ key }) }),
    runTransaction: async (fn: any) => fn({
      get: async (ref: any) => ({ exists: records.has(ref.key), data: () => records.get(ref.key) }),
      set: (ref: any, data: any) => records.set(ref.key, { ...records.get(ref.key), ...data }),
    }),
  };
  const secret = 'a-real-test-secret-that-is-long-enough';
  const now = Date.UTC(2026, 10, 15);
  assert.equal(await reserveGuestAiMessage(db, '203.0.113.9', 'ua', secret, now, 3), 2);
  assert.equal(await reserveGuestAiMessage(db, '203.0.113.9', 'ua', secret, now, 3), 1);
  await releaseGuestAiMessage(db, '203.0.113.9', 'ua', secret, now);
  assert.equal(await reserveGuestAiMessage(db, '203.0.113.9', 'ua', secret, now, 3), 1);
  for (let i = 0; i < 5; i++) await releaseGuestAiMessage(db, '203.0.113.9', 'ua', secret, now);
  assert.equal([...records.values()][0].used, 0);
});
