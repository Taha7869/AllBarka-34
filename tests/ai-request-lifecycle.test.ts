import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createAiChatRouter, type AiChatDiagnostic, type AiChatRouterOptions } from '../src/lib/aiChatRouter';
import { askN8nConsultant } from '../src/services/n8nAIConsultant';

async function fixture(options: Partial<AiChatRouterOptions>) {
  const events: AiChatDiagnostic[] = [];
  const app = express(); app.use(express.json());
  app.use(createAiChatRouter({
    getDb: () => null, getCatalog: async () => [], reserveGuestTrial: async () => null,
    recordDiagnostic: event => events.push(event), ...options,
  }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  return {
    events,
    send: (signal?: AbortSignal) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/chat`, {
      signal,
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userText: 'PRIVATE_TEST_CUSTOMER_TEXT', history: [{ role: 'user', text: 'PRIVATE_HISTORY' }] }),
    }),
    close: async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); },
  };
}

test('AI deadline prevents a provider call after slow catalog resolution', async () => {
  let release: (value: []) => void = () => {};
  const catalog = new Promise<[]> (resolve => { release = resolve; });
  let providerCalls = 0;
  const f = await fixture({ timeoutMs: 25, getCatalog: () => catalog,
    askConsultant: async () => { providerCalls++; return { reply: 'Hello' }; } });
  try {
    const response = await f.send();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'AI_TIMEOUT');
    release([]); await new Promise(resolve => setImmediate(resolve));
    assert.equal(providerCalls, 0, 'Expired request must not start a billable provider request');
    assert.equal(f.events.length, 1);
    assert.equal(f.events[0].outcome, 'timeout');
  } finally { release([]); await f.close(); }
});

test('AI deadline cancels an in-flight consultant and diagnostics contain no customer payload', async () => {
  let receivedSignal: AbortSignal | undefined;
  const f = await fixture({ timeoutMs: 25, askConsultant: ({ signal }) => {
    receivedSignal = signal;
    return new Promise((_, reject) => signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  } });
  try {
    const response = await f.send();
    assert.equal(response.status, 503);
    await response.json();
    assert.equal(receivedSignal?.aborted, true);
    assert.equal(f.events.length, 1);
    assert.equal(f.events[0].requestId, response.headers.get('x-allbarka-request-id'));
    assert.match(f.events[0].requestId, /^[a-f0-9-]{36}$/);
    assert.deepEqual(Object.keys(f.events[0]).sort(), ['catalogMs', 'outcome', 'providerMs', 'requestId', 'status', 'totalMs']);
    assert.equal(JSON.stringify(f.events).includes('PRIVATE_'), false);
  } finally { await f.close(); }
});

test('AI successful request has one bounded diagnostic and no-store response', async () => {
  const f = await fixture({ askConsultant: async () => ({ reply: 'Hello', selectedProducts: [] }) });
  try {
    const response = await f.send(); const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(typeof body.timing.providerMs, 'number');
    assert.equal(f.events.length, 1);
    assert.equal(f.events[0].outcome, 'completed');
    assert.equal(JSON.stringify(f.events).includes('PRIVATE_'), false);
  } finally { await f.close(); }
});

test('disconnecting a customer cancels the consultant without recording their text', async () => {
  let started: () => void = () => {};
  let cancelled: () => void = () => {};
  const providerStarted = new Promise<void>(resolve => { started = resolve; });
  const providerCancelled = new Promise<void>(resolve => { cancelled = resolve; });
  const controller = new AbortController();
  const f = await fixture({ askConsultant: ({ signal }) => {
    started();
    return new Promise((_, reject) => signal?.addEventListener('abort', () => {
      cancelled(); reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true }));
  } });
  try {
    const request = f.send(controller.signal);
    const rejection = assert.rejects(request, error => (error as Error).name === 'AbortError');
    await providerStarted; controller.abort();
    await rejection; await providerCancelled;
    assert.equal(f.events.length, 1);
    assert.equal(f.events[0].outcome, 'cancelled');
    assert.equal(JSON.stringify(f.events).includes('PRIVATE_'), false);
  } finally { await f.close(); }
});

test('private n8n bridge propagates cancellation without forwarding the signal or secrets in JSON', async () => {
  const previous = { url: process.env.N8N_AI_WEBHOOK_URL, secret: process.env.N8N_AI_WEBHOOK_SECRET, fetch: globalThis.fetch };
  process.env.N8N_AI_WEBHOOK_URL = 'https://n8n.example.test/webhook/website';
  process.env.N8N_AI_WEBHOOK_SECRET = 'fixture-secret-abcdefghijklmnopqrstuvwxyz';
  const controller = new AbortController();
  let bridgeSignal: AbortSignal | null | undefined;
  let payload: any;
  let started: () => void = () => {};
  const requestStarted = new Promise<void>(resolve => { started = resolve; });
  globalThis.fetch = async (_input, options) => {
    bridgeSignal = options?.signal; payload = JSON.parse(String(options?.body)); started();
    return new Promise<Response>((_, reject) => bridgeSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  };
  try {
    const pending = askN8nConsultant({ message: 'Hello', system: 'Trusted catalog', history: [], signal: controller.signal });
    const rejection = assert.rejects(pending, error => (error as Error).name === 'AbortError');
    await requestStarted; controller.abort(); await rejection;
    assert.equal(bridgeSignal?.aborted, true);
    assert.deepEqual(Object.keys(payload).sort(), ['history', 'message', 'source', 'system']);
    assert.equal(JSON.stringify(payload).includes('fixture-secret'), false);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.url === undefined) delete process.env.N8N_AI_WEBHOOK_URL; else process.env.N8N_AI_WEBHOOK_URL = previous.url;
    if (previous.secret === undefined) delete process.env.N8N_AI_WEBHOOK_SECRET; else process.env.N8N_AI_WEBHOOK_SECRET = previous.secret;
  }
});
