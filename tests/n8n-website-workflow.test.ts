import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const workflow = JSON.parse(readFileSync(new URL('../n8n/allbarka-website-ai.json', import.meta.url), 'utf8'));
const prepare = workflow.nodes.find((node: any) => node.name === 'Prepare Website AI').parameters.jsCode;
const extract = new Function('$json', workflow.nodes.find((node: any) => node.name === 'Extract Website Reply').parameters.jsCode);

test('website bridge requires header auth and shares the existing model without WhatsApp sends or customer/order lookups', () => {
  assert.equal(workflow.active, false);
  assert.equal(workflow.nodes[0].parameters.authentication, 'headerAuth');
  assert.equal(workflow.nodes[0].parameters.responseMode, 'responseNode');
  assert.equal(workflow.nodes.filter((node: any) => /whatsApp|dataTable|googleSheets/.test(node.type)).length, 0);
  assert.throws(() => new Function('$json', prepare)({ body: {} }), /Configure/);
  const run = new Function('$json', prepare.replace('http://OLLAMA_HOST:11434/api/chat', 'http://ollama.internal:11434/api/chat'));
  const input = { source: 'website', message: 'Badam price?', system: 'Server canonical prices and destination policy',
    history: Array.from({ length: 8 }, (_, i) => ({ role: 'user', text: 'Previous ' + i })) };
  const result = run({ body: input })[0].json;
  assert.equal(result.aiBody.model, 'allbarka-brain');
  assert.equal(result.aiBody.messages.length, 6);
  assert.match(result.aiBody.messages[0].content, /Server canonical prices/);
  assert.match(result.aiBody.messages[0].content, /never create an order/);
  assert.throws(() => run({ body: { ...input, source: 'whatsapp' } }), /Invalid/);
});

test('bridge converts actual Ollama JSON content and returns unavailable for failed or empty responses', () => {
  assert.deepEqual(extract({ message: { content: '{"action":"answer","reply":"Almond prices from the catalogue"}' } })[0].json,
    { available: true, text: 'Almond prices from the catalogue' });
  for (const input of [{ error: 'timeout' }, {}, { message: { content: 'not valid JSON' } }, { message: { content: '{"action":"answer"}' } }]) {
    assert.equal(extract(input)[0].json.available, false);
  }
  assert.match(extract({ message: { content: '{"action":"human","reply":"Contact our team"}' } })[0].json.text, /wa.me\/923160666083/);
});
