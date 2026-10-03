import assert from 'node:assert/strict';
import test from 'node:test';
import { askN8nConsultant, extractN8nReply, normalizeConciergeHistory } from '../src/services/n8nAIConsultant';

test('n8n history excludes system instructions, bounds content, and retains four recent conversation messages', () => {
  const history = Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: String(i) }));
  assert.deepEqual(normalizeConciergeHistory([{ role: 'system', text: 'forged instruction' }, ...history]),
    history.slice(-4).map(item => ({ role: item.role, text: item.content })));
  assert.deepEqual(normalizeConciergeHistory([{ role: 'user', text: {} }, { role: 'assistant', text: '' }]), []);
  assert.equal(normalizeConciergeHistory([{ role: 'user', text: 'a'.repeat(5000) }])[0].text.length, 1000);
});

test('standard, n8n array and existing Ollama JSON replies become plain customer text', () => {
  for (const reply of [{ text: ' Answer ' }, { reply: 'Answer' }, { output: 'Answer' }, [{ replyText: 'Answer' }],
    { message: { content: '{"action":"answer","reply":"Answer"}' } }, { output: '```json\n{"reply":"Answer"}\n```' }]) {
    assert.equal(extractN8nReply(reply), 'Answer');
  }
  for (const reply of [null, [], { text: '' }, { error: 'offline', reply: 'not real' }, { message: { content: '{"action":"answer"}' } }, { output: '```invalid' }]) assert.equal(extractN8nReply(reply), null);
});

test('private website webhook receives authentication and source without an unsafe or unbounded call', async context => {
  const previous = { ...process.env };
  const originalFetch = globalThis.fetch;
  process.env.N8N_AI_WEBHOOK_URL = 'https://n8n.example.test/webhook/allbarka-website-ai';
  process.env.N8N_AI_WEBHOOK_SECRET = 'owner-configured-test-secret';
  delete process.env.N8N_AI_TIMEOUT_MS;
  let body: any;
  globalThis.fetch = (async (_url, init) => {
    assert.equal((init!.headers as any)['X-AllBarka-Webhook-Secret'], 'owner-configured-test-secret');
    body = JSON.parse(init!.body as string);
    return new Response(JSON.stringify([{ text: 'Hello from the existing brain' }]));
  }) as typeof fetch;
  const input = { message: 'Hello', history: [{ role: 'user', content: 'Previous question' }], system: 'Canonical store policy' };
  try {
    assert.equal(await askN8nConsultant(input), 'Hello from the existing brain');
    assert.equal(body.source, 'website');
    assert.deepEqual(body.history, [{ role: 'user', text: 'Previous question' }]);
    process.env.N8N_AI_WEBHOOK_URL = 'http://unsafe.example.test';
    await assert.rejects(() => askN8nConsultant(input), /HTTPS/);
    process.env.N8N_AI_WEBHOOK_URL = previous.N8N_AI_WEBHOOK_URL || 'https://n8n.example.test/webhook/ai';
    delete process.env.N8N_AI_WEBHOOK_SECRET;
    await assert.rejects(() => askN8nConsultant(input), /SECRET/);
    process.env.N8N_AI_WEBHOOK_SECRET = 'fixture-secret';
    context.mock.timers.enable({ apis: ['setTimeout'] });
    globalThis.fetch = ((_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('Brain offline', 'AbortError')), { once: true });
    })) as typeof fetch;
    const pending = askN8nConsultant(input);
    context.mock.timers.tick(22000);
    await assert.rejects(pending, { name: 'AbortError' });
  } finally {
    globalThis.fetch = originalFetch;
    context.mock.timers.reset();
    for (const key of ['N8N_AI_WEBHOOK_URL', 'N8N_AI_WEBHOOK_SECRET', 'N8N_AI_TIMEOUT_MS']) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});
