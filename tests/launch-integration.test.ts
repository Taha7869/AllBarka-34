import assert from 'node:assert/strict';
import test from 'node:test';
import { apiUrl } from '../src/lib/apiUrl';
import { commerceCors } from '../src/lib/apiCors';
import { verifyStaticConfig } from '../scripts/verify-static-config.mjs';
import { placeOrder, type OrderPayload } from '../src/lib/order';

test('static storefront routes quote, chat and authenticated APIs to one HTTPS commerce origin', () => {
  for (const path of ['/api/orders/quote', '/api/concierge/chat', '/api/admin/orders', '/api/me/orders']) {
    assert.equal(apiUrl(path, ''), path);
    assert.equal(apiUrl(path, ' https://commerce.example.test/ '), 'https://commerce.example.test' + path);
  }
  for (const value of ['http://commerce.example.test', 'https://user:secret@commerce.example.test', 'https://commerce.example.test/api', 'https://commerce.example.test/?secret=x']) {
    assert.throws(() => apiUrl('/api/orders', value));
  }
  assert.throws(() => apiUrl('https://elsewhere.test/api/orders', ''));
});

function corsRequest(origin: string | undefined, method = 'OPTIONS') {
  const headers = new Map<string, string>();
  const result = { next: false, status: 0, body: null as unknown };
  const res = { vary: () => {}, setHeader: (key: string, value: string) => headers.set(key, value),
    sendStatus: (status: number) => { result.status = status; },
    status: (status: number) => { result.status = status; return res; }, json: (body: unknown) => { result.body = body; } };
  commerceCors('https://allbarka.netlify.app, https://store.example.test')({ headers: { origin }, method } as any, res as any, () => { result.next = true; });
  return { headers, ...result };
}

test('CORS permits only configured storefronts and preflights checkout idempotency and verified auth headers', () => {
  const accepted = corsRequest('https://allbarka.netlify.app');
  assert.equal(accepted.status, 204);
  assert.equal(accepted.headers.get('Access-Control-Allow-Origin'), 'https://allbarka.netlify.app');
  assert.match(accepted.headers.get('Access-Control-Allow-Headers')!, /Authorization.*Idempotency-Key/);
  assert.match(accepted.headers.get('Access-Control-Allow-Headers')!, /X-Guest-Claim-Token/);
  for (const origin of ['https://allbarka.netlify.app.evil.test', 'null', undefined]) {
    const rejected = corsRequest(origin);
    assert.equal(rejected.status, 403);
    assert.equal(rejected.headers.has('Access-Control-Allow-Origin'), false);
  }
  assert.equal(corsRequest(undefined, 'GET').next, true);
  assert.equal(corsRequest('https://store.example.test', 'POST').next, true);
  assert.throws(() => commerceCors('*'));
});

test('static deployment cannot pass with absent Firebase build config or a browser-local AI provider', () => {
  const env = { VITE_API_BASE_URL: 'https://commerce.example.test', VITE_FIREBASE_API_KEY: 'public-web-key', VITE_FIREBASE_APP_ID: 'web-app-id' };
  assert.doesNotThrow(() => verifyStaticConfig(env));
  assert.throws(() => verifyStaticConfig({}), /VITE_API_BASE_URL.*VITE_FIREBASE_API_KEY.*VITE_FIREBASE_APP_ID/);
  assert.throws(() => verifyStaticConfig({ ...env, VITE_AI_PROVIDER: 'ollama' }));
});

test('order deadline covers a response body that stalls after HTTP headers and releases the submission lock', async context => {
  const originalFetch = globalThis.fetch;
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const payload = { name: 'Owner test', phone: '03001234567', address: 'Fixture only', city: 'Lahore',
    paymentMethod: 'cod', items: [], shippingMethodId: 'standard', idempotencyKey: 'deadline-attempt-123' } as OrderPayload;
  globalThis.fetch = (async (_url: string, init: RequestInit) => ({ ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }), json: () => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('Body stalled', 'AbortError')), { once: true });
    }) })) as typeof fetch;
  try {
    const pending = placeOrder(payload);
    await Promise.resolve();
    context.mock.timers.tick(15000);
    assert.equal((await pending).code, 'TIMEOUT');
    globalThis.fetch = (async () => new Response(JSON.stringify({ success: true, orderId: 'AB-OWNER-FIXTURE', whatsappMessage: 'Fixture receipt' }), { headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
    assert.equal((await placeOrder(payload)).success, true);
  } finally { globalThis.fetch = originalFetch; context.mock.timers.reset(); }
});
