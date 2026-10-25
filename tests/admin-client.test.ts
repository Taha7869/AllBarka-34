import assert from 'node:assert/strict';
import test from 'node:test';
import { adminRequest, AdminRequestError } from '../src/lib/adminClient';

const rejectsCode = (code: string, status?: number) => (failure: unknown) => failure instanceof AdminRequestError && failure.code === code && (status === undefined || failure.status === status);

test('admin request uses authenticated no-store JSON requests and exact mutation payloads', async () => {
  const original = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async (path, init) => {
      calls++;
      assert.equal(path, '/api/admin/orders/AB-TEST-01/payment');
      assert.equal(init?.cache, 'no-store');
      assert.equal(init?.credentials, 'omit');
      assert.equal(init?.method, 'POST');
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-token');
      assert.deepEqual(JSON.parse(init?.body as string), { paymentStatus: 'PAID', expectedUpdatedAt: 'revision' });
      return new Response(JSON.stringify({ order: { orderId: 'AB-TEST-01' } }), { status: 200 });
    };
    const result = await adminRequest<{ order: { orderId: string } }>(async () => 'test-token', '/api/admin/orders/AB-TEST-01/payment', { body: { paymentStatus: 'PAID', expectedUpdatedAt: 'revision' } });
    assert.equal(result.order.orderId, 'AB-TEST-01');
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('admin client preserves conflict and permission error codes without exposing server messages', async () => {
  const original = globalThis.fetch;
  try {
    for (const [code, status] of [['ORDER_CONFLICT', 409], ['FORBIDDEN_ADMIN', 403]] as const) {
      globalThis.fetch = async () => new Response(JSON.stringify({ code, error: 'private diagnostics' }), { status });
      await assert.rejects(adminRequest(async () => 'token', '/api/admin/orders'), rejectsCode(code, status));
    }
    globalThis.fetch = async () => new Response('<html>wrong response</html>', { status: 200 });
    await assert.rejects(adminRequest(async () => 'token', '/api/admin/orders'), rejectsCode('REQUEST_FAILED'));
  } finally { globalThis.fetch = original; }
});

test('stalled token refresh is bounded and never sends an unauthenticated request', async () => {
  const original = globalThis.fetch;
  try {
    let fetched = false;
    globalThis.fetch = async () => { fetched = true; return new Response('{}'); };
    await assert.rejects(adminRequest(() => new Promise<string>(() => {}), '/api/admin/orders', { timeoutMs: 20 }), rejectsCode('REQUEST_TIMEOUT'));
    assert.equal(fetched, false);
  } finally { globalThis.fetch = original; }
});

test('deadline covers stalled fetch and response body parsing', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = () => new Promise<Response>(() => {});
    await assert.rejects(adminRequest(async () => 'token', '/api/admin/orders', { timeoutMs: 20 }), rejectsCode('REQUEST_TIMEOUT'));
    globalThis.fetch = async () => ({ ok: true, json: () => new Promise(() => {}) }) as unknown as Response;
    await assert.rejects(adminRequest(async () => 'token', '/api/admin/orders', { timeoutMs: 20 }), rejectsCode('REQUEST_TIMEOUT'));
  } finally { globalThis.fetch = original; }
});

test('cancelled or out-of-scope requests do not retrieve tokens or fetch data', async () => {
  let tokens = 0;
  const token = async () => { tokens++; return 'token'; };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(adminRequest(token, '/api/admin/orders', { signal: controller.signal }), rejectsCode('REQUEST_CANCELLED'));
  await assert.rejects(adminRequest(token, 'https://example.com/admin'), rejectsCode('INVALID_PATH'));
  assert.equal(tokens, 0);
});

test('in-flight cancellation aborts the network signal and synchronous token errors are contained', async () => {
  const original = globalThis.fetch;
  try {
    const controller = new AbortController();
    let networkSignal: AbortSignal | undefined;
    globalThis.fetch = async (_, init) => { networkSignal = init?.signal as AbortSignal; controller.abort(); return new Promise<Response>(() => {}); };
    await assert.rejects(adminRequest(async () => 'token', '/api/admin/orders', { signal: controller.signal }), rejectsCode('REQUEST_TIMEOUT'));
    assert.equal(networkSignal?.aborted, true);
    await assert.rejects(adminRequest(() => { throw new Error('token diagnostics'); }, '/api/admin/orders'), rejectsCode('REQUEST_FAILED'));
  } finally { globalThis.fetch = original; }
});
