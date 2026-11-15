import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { validateSheetStatusCommand } from '../src/lib/sheetStatusCommand';

// Evaluate the n8n expression the workflow sends, against a real sheet row, and validate it with the website's own rules.
const workflow = JSON.parse(readFileSync('n8n/fixed-2026-11-15/sheet-to-website-status.json', 'utf8'));
const send = workflow.nodes.find((n: any) => n.name === 'Send To Backend');
const expression = String(send.parameters.jsonBody).replace(/^=\{\{\s*/, '').replace(/\s*\}\}$/, '');
const build = (row: Record<string, string>) => JSON.parse(new Function('$json', `return ${expression};`)(row));

test('the sheet workflow posts to /order-status with a body the website accepts', () => {
  assert.equal(send.parameters.url, 'https://allbarka.com/api/integrations/n8n/order-status');
  const body = build({ order_id: 'AB-20261115-ABC123', request_id: 'req 7', requested_status: 'confirmed', status: 'ORDER_RECEIVED',
    canonical_status_updated_at: '2026-11-15T10:00:00.000Z', request_reason: '' });
  const command = validateSheetStatusCommand(body);
  assert.equal(command.status, 'CONFIRMED');
  assert.equal(command.expectedStatus, 'ORDER_RECEIVED');
  assert.match(command.eventId, /^sheet:AB-20261115-ABC123-req-7$/);
  assert.equal(command.reason, 'Status updated from the Google Sheet');
});

test('out for delivery written with spaces is normalised, and the request id keeps events unique', () => {
  const a = build({ order_id: 'AB-1', request_id: 'r1', requested_status: 'out for delivery', status: 'DISPATCHED', canonical_status_updated_at: '2026-11-15T10:00:00Z', request_reason: 'Rider left' });
  const b = build({ order_id: 'AB-1', request_id: 'r2', requested_status: 'delivered', status: 'OUT_FOR_DELIVERY', canonical_status_updated_at: '2026-11-15T11:00:00Z', request_reason: 'Handed over' });
  assert.equal(validateSheetStatusCommand(a).status, 'OUT_FOR_DELIVERY');
  assert.notEqual(a.eventId, b.eventId);
  const pending = workflow.nodes.find((n: any) => n.name === 'Pending Requests?').parameters.jsCode;
  assert.match(pending, /return !!hasStatus;/);
});
