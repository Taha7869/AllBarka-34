import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTrackingPatch } from '../n8n/apply-tracking-patch.mjs';

const load = file => JSON.parse(fs.readFileSync(new URL('../n8n/' + file, import.meta.url), 'utf8'));
const status = load('allbarka-status-sync.json');
const windowWorkflow = load('allbarka-whatsapp-window.json');
const patch = load('allbarka-tracking.patch.json');
const allNodes = [...status.nodes, ...windowWorkflow.nodes, ...patch.modifiedNodes, ...patch.addedNodes];
const nodes = new Map(allNodes.map(node => [node.name, node]));
const run = (name, input = {}, refs = {}, many = [input]) => {
  const rows = many.map(json => ({ json }));
  const $input = { first: () => rows[0], all: () => rows };
  const $ = key => { assert.ok(key in refs, 'Fixture reference missing: ' + key); return { first: () => ({ json: refs[key] }), item: { json: refs[key] } }; };
  return new Function('$input', '$', '$json', nodes.get(name).parameters.jsCode)($input, $, input);
};
const revision = '2026-10-03T12:00:00.000Z';
const newer = '2026-10-03T12:00:00.001Z';
const orderId = 'AB-20261003-A1B2C3';
const requestId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const command = () => ({ order_id: orderId, requested_status: 'DISP', request_id: requestId,
  request_base_status: 'PREPARING', request_base_revision: revision, request_created_at: revision,
  request_reason: 'Owner changed delivery status in Sheet' });
const header = ['order_id', 'status', 'status_revision', 'canonical_status_updated_at', 'sync_error',
  'requested_status', 'request_id', 'request_base_status', 'request_base_revision', 'request_created_at',
  'request_reason', 'last_applied_request_id'];
function scriptFixture(overrides = {}) {
  const data = { order_id: orderId, status: 'PREPARING', status_revision: revision,
    canonical_status_updated_at: revision, sync_error: '', requested_status: 'DISPATCHED',
    request_id: requestId, request_base_status: 'PREPARING', request_base_revision: revision,
    request_created_at: revision, request_reason: 'Owner edited', last_applied_request_id: '', ...overrides };
  const values = [header, header.map(key => data[key] ?? '')];
  const range = (row, column, height = 1, width = 1) => ({
    getRow: () => row, getColumn: () => column, getNumRows: () => height, getNumColumns: () => width,
    getSheet: () => sheet,
    getValue: () => values[row - 1]?.[column - 1],
    getValues: () => values.slice(row - 1, row - 1 + height).map(value => value.slice(column - 1, column - 1 + width)),
    setValue: value => { values[row - 1] ||= []; values[row - 1][column - 1] = value; },
  });
  const sheet = { getLastColumn: () => header.length, getLastRow: () => values.length,
    getSheetId: () => 1, getRange: range };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => key === 'SHEET_SYNC_SECRET' ? 's'.repeat(32)
      : key === 'ORDER_CONTROL_SHEET' ? 'Order_Control' : null }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }) },
    Utilities: { getUuid: () => 'new-command-uuid-0000000000000000' },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
  });
  vm.runInContext(fs.readFileSync(new URL('../n8n/OrderControl.gs', import.meta.url), 'utf8'), context);
  return { context, sheet, range, values, read: key => values[1][header.indexOf(key)], control: context.sheetControl() };
}

test('inactive status/window graphs compile, are closed, and contain no private credentials/resources', () => {
  for (const graph of [status, windowWorkflow]) {
    assert.equal(graph.active, false);
    assert.deepEqual(graph.pinData, {});
    assert.equal(new Set(graph.nodes.map(n => n.id)).size, graph.nodes.length);
    const names = new Set(graph.nodes.map(n => n.name));
    for (const node of graph.nodes) {
      assert.equal(node.credentials, undefined);
      if (node.parameters.jsCode) new Function('$input', '$', '$json', node.parameters.jsCode);
      if (node.type === 'n8n-nodes-base.httpRequest') {
        assert.equal(node.retryOnFail, false);
        assert.equal(node.maxTries, 1);
      }
    }
    for (const [from, connections] of Object.entries(graph.connections)) {
      assert.ok(names.has(from));
      for (const branch of connections.main || []) for (const edge of branch) assert.ok(names.has(edge.node));
    }
    assert.doesNotMatch(JSON.stringify(graph), /hooks\.slack\.com|gsk_[a-zA-Z0-9]{12}|-----BEGIN.*PRIVATE KEY|Bearer [A-Za-z0-9_-]{15}/);
  }
});

test('Sheet commands capture explicit base revision and exact source without customer/price writes', () => {
  const result = run('Validate Sheet Commands', { body: { ok: true, commands: [command()] } })[0].json;
  assert.equal(result.request.status, 'DISPATCHED');
  assert.equal(result.request.expectedUpdatedAt, revision);
  assert.equal(result.request.eventId, 'sheet:' + requestId);
  assert.deepEqual(Object.keys(result.request).sort(), ['source', 'eventId', 'orderId', 'status', 'expectedStatus', 'expectedUpdatedAt', 'reason'].sort());
  assert.equal(result.request.source, 'google_sheet');
});

test('quote status is accepted by revision-protected Sheet and canonical status mirrors', () => {
  const quoteCommand = { ...command(), requested_status: 'CANCELLED', request_base_status: 'QUOTE_REQUESTED' };
  const result = run('Validate Sheet Commands', { body: { ok: true, commands: [quoteCommand] } })[0].json;
  assert.equal(result.request.expectedStatus, 'QUOTE_REQUESTED');
  assert.equal(result.request.status, 'CANCELLED');
  const timestamp = new Date().toISOString();
  const mirrored = run('Validate Canonical Status Event', { body: { event: 'ORDER_STATUS_CHANGED', eventId: 'quote-status-event',
    timestamp, order: { orderId, status: 'QUOTE_REQUESTED', updatedAt: timestamp } } })[0].json;
  assert.equal(mirrored.valid, true);
  assert.equal(mirrored.mirror.status, 'QUOTE_REQUESTED');
});

test('Apps Script accepts quote identity but blocks quote fulfillment and normal-order conversion', () => {
  const quote = scriptFixture({ status: 'QUOTE_REQUESTED', requested_status: 'DISPATCHED' });
  assert.equal(quote.context.canonicalStatus('QUOTE_REQUESTED'), 'QUOTE_REQUESTED');
  quote.context.captureOrderStatusEdit({ range: quote.range(2, 6), value: 'DISPATCHED' });
  assert.equal(quote.read('request_id'), '');
  assert.match(quote.read('sync_error'), /QUOTE_STATUS_RESTRICTED/);
  const cancelled = scriptFixture({ status: 'QUOTE_REQUESTED', requested_status: 'CANCELLED' });
  cancelled.context.captureOrderStatusEdit({ range: cancelled.range(2, 6), value: 'CANCELLED' });
  assert.equal(cancelled.read('request_base_status'), 'QUOTE_REQUESTED');
  assert.equal(cancelled.read('request_id'), 'new-command-uuid-0000000000000000');
  const conversion = scriptFixture({ requested_status: 'QUOTE_REQUESTED' });
  conversion.context.captureOrderStatusEdit({ range: conversion.range(2, 6), value: 'QUOTE_REQUESTED' });
  assert.equal(conversion.read('request_id'), '');
  assert.match(conversion.read('sync_error'), /QUOTE_STATUS_RESTRICTED/);
});

test('Sheet poll rejects duplicate commands/order rows, invalid status and unavailable response', () => {
  assert.throws(() => run('Validate Sheet Commands', { error: 'timeout' }));
  for (const rows of [[command(), command()], [{ ...command(), requested_status: 'PAID' }],
    [{ ...command(), request_base_revision: '' }]]) {
    assert.throws(() => run('Validate Sheet Commands', { body: { ok: true, commands: rows } }));
  }
});

test('409 Sheet acknowledgement keeps the original request ID and requires explicit repair without rebasing', () => {
  const request = run('Validate Sheet Commands', { body: { ok: true, commands: [command()] } })[0].json;
  const ack = run('Prepare Compare And Acknowledge', { statusCode: 409,
    body: { canonical: { status: 'CONFIRMED', updatedAt: newer } } }, { 'Validate Sheet Commands': request })[0].json.ack;
  assert.equal(ack.applied, false);
  assert.equal(ack.requestId, requestId);
  assert.equal(ack.revision, newer);
  assert.match(ack.error, /explicitly edit/);
  assert.equal(request.request.expectedUpdatedAt, revision);
});

test('status receiver rejects malformed/creation events and keeps status acknowledgement revision stable', () => {
  assert.equal(run('Validate Canonical Status Event', { body: { event: 'ORDER_CREATED' } })[0].json.httpStatus, 400);
  const valid = run('Validate Canonical Status Event', { body: { event: 'ORDER_STATUS_CHANGED', eventId: 'status-event',
    timestamp: new Date().toISOString(), order: { orderId, status: 'DISPATCHED', updatedAt: revision } } })[0].json;
  assert.equal(valid.valid, true);
  const ack = run('Verify Status Mirror Acknowledgement', { statusCode: 200,
    body: { ok: true, orderId, eventId: 'status-event', mirrorStored: true, ignored: 'STALE_REVISION', revision: newer } },
    { 'Validate Canonical Status Event': valid })[0].json;
  assert.equal(ack.responseBody.statusRevision, revision);
  assert.equal(ack.responseBody.ignored, 'STALE_REVISION');
  for (const wrongRevision of [undefined, 'bad', '2026-10-03T11:59:59.999Z', newer]) {
    const failed = run('Verify Status Mirror Acknowledgement', { statusCode: 200,
      body: { ok: true, orderId, eventId: 'status-event', mirrorStored: true, revision: wrongRevision } },
      { 'Validate Canonical Status Event': valid })[0].json;
    assert.equal(failed.httpStatus, 503);
  }
});

test('Apps Script onEdit stamps fresh request UUID and captured canonical revision', () => {
  const fixture = scriptFixture();
  fixture.context.captureOrderStatusEdit({ range: fixture.range(2, header.indexOf('requested_status') + 1), value: 'DISPATCHED' });
  assert.equal(fixture.read('request_id'), 'new-command-uuid-0000000000000000');
  assert.equal(fixture.read('request_base_revision'), revision);
  assert.equal(fixture.read('request_base_status'), 'PREPARING');
  assert.equal(fixture.read('status'), 'PREPARING');
});

test('Apps Script ignores programmatic/header edits and rejects multi-cell/invalid commands', () => {
  const fixture = scriptFixture();
  fixture.context.captureOrderStatusEdit(undefined);
  fixture.context.captureOrderStatusEdit({ range: fixture.range(1, 6) });
  assert.equal(fixture.read('request_id'), requestId);
  fixture.context.captureOrderStatusEdit({ range: fixture.range(2, 6, 1, 2) });
  assert.equal(fixture.read('request_id'), '');
  assert.match(fixture.read('sync_error'), /MULTI_CELL/);
  const invalid = scriptFixture({ requested_status: 'UNKNOWN' });
  invalid.context.captureOrderStatusEdit({ range: invalid.range(2, 6), value: 'UNKNOWN' });
  assert.equal(invalid.read('request_id'), '');
  assert.match(invalid.read('sync_error'), /INVALID_COMMAND/);
});

test('Apps Script cannot acknowledge an older command over a newer request and never clears requested fields', () => {
  const fixture = scriptFixture({ request_id: 'newer-request', requested_status: 'DELIVERED' });
  const result = fixture.context.acknowledgeStatusCommand(fixture.control, {
    orderId, requestId, applied: true, status: 'DISPATCHED', revision: newer });
  assert.equal(result.newerRequestPreserved, true);
  assert.equal(fixture.read('request_id'), 'newer-request');
  assert.equal(fixture.read('requested_status'), 'DELIVERED');
  assert.equal(fixture.read('last_applied_request_id'), '');
  const original = scriptFixture();
  original.context.acknowledgeStatusCommand(original.control, { orderId, requestId, applied: true, status: 'DISPATCHED', revision: newer });
  assert.equal(original.read('last_applied_request_id'), requestId);
  assert.equal(original.read('requested_status'), 'DISPATCHED');
  assert.equal(original.context.pendingStatusCommands(original.control).length, 0);
});

test('a delayed older onEdit event cannot replace a newer requested value or stamped command', () => {
  const fixture = scriptFixture({ requested_status: 'DELIVERED', request_id: 'newer-edit-B' });
  fixture.context.captureOrderStatusEdit({ range: fixture.range(2, 6), value: 'DISPATCHED' });
  assert.equal(fixture.read('requested_status'), 'DELIVERED');
  assert.equal(fixture.read('request_id'), 'newer-edit-B');
  fixture.context.captureOrderStatusEdit({ range: fixture.range(2, 6), value: 'DELIVERED' });
  assert.equal(fixture.read('request_id'), 'new-command-uuid-0000000000000000');
});

test('Apps Script status mirror rejects conflicting equal revision and ignores stale without overwriting command', () => {
  const fixture = scriptFixture({ status: 'DISPATCHED', status_revision: newer });
  const old = fixture.context.mirrorStatus(fixture.control, { orderId, eventId: 'old', status: 'PREPARING', revision });
  assert.equal(old.ignored, 'STALE_REVISION');
  assert.equal(fixture.read('status'), 'DISPATCHED');
  assert.equal(fixture.read('request_id'), requestId);
  assert.throws(() => fixture.context.mirrorStatus(fixture.control, { orderId, status: 'DELIVERED', revision: newer }), /REVISION_PAYLOAD_CONFLICT/);
});

test('Apps Script bridge rejects missing/wrong secret and duplicate order rows', () => {
  const fixture = scriptFixture();
  const failed = fixture.context.doPost({ postData: { contents: JSON.stringify({ action: 'pending', secret: 'wrong' }) } });
  assert.equal(JSON.parse(failed.text).error, 'UNAUTHORIZED');
  const success = fixture.context.doPost({ postData: { contents: JSON.stringify({ action: 'pending', secret: 's'.repeat(32) }) } });
  assert.equal(JSON.parse(success.text).commands.length, 1);
  fixture.values.push([...fixture.values[1]]);
  assert.throws(() => fixture.context.findUniqueRow(fixture.control, orderId), /DUPLICATE_ORDER_ID/);
});

test('Meta parent requires original body/signature evidence and forwards only that envelope', () => {
  for (const input of [{ from: '923001234567', verified: true }, { rawMetaBody: '{}', metaSignature: 'bad' }]) {
    assert.throws(() => run('Validate Raw Parent Envelope', input), /RAW_META_EVIDENCE_REQUIRED/);
  }
  const result = run('Validate Raw Parent Envelope', { rawMetaBody: '{ "entry": [] }', metaSignature: 'sha256=' + 'a'.repeat(64),
    verified: true, from: '923001234567', receivedAt: Date.now() })[0].json;
  assert.deepEqual(Object.keys(result).sort(), ['source', 'rawMetaBody', 'metaSignature'].sort());
  assert.equal(result.rawMetaBody, '{ "entry": [] }');
  assert.throws(() => run('Verify Inbound Acknowledgement', { statusCode: 401, body: { ok: false } }));
  assert.throws(() => run('Validate Raw Parent Envelope', { rawMetaBody: 'ع'.repeat(50000), metaSignature: 'sha256=' + 'a'.repeat(64) }));
});

test('notification schedule has no direct provider path without claim and final authorization', () => {
  const node = windowWorkflow.nodes.find(n => n.name === 'One Meta Service Message');
  assert.equal(node.parameters.options.timeout, 5000);
  assert.equal(node.retryOnFail, false);
  assert.equal(windowWorkflow.connections['Validate Final Window And Ownership Gate'].main[0][0].node, node.name);
  assert.match(windowWorkflow.nodes.find(n => n.name === 'Authorize Immediately Before Send').parameters.url, /notifications\/authorize/);
  assert.deepEqual(run('Validate Notification Lease', { statusCode: 200, body: { ok: true, idle: true } }), []);
});

test('expired or refused window/ownership authorization never reaches provider', () => {
  const claim = { source: 'meta_parent', jobId: 'job-1', leaseToken: 'token-1' };
  const refs = { 'Validate Notification Lease': claim };
  assert.deepEqual(run('Validate Final Window And Ownership Gate', { statusCode: 409, body: { ok: false } }, refs), []);
  assert.throws(() => run('Validate Final Window And Ownership Gate', { statusCode: 200, body: { ok: true, ...claim,
    to: '923001234567', text: 'Saved receipt', eventId: 'event-1', revision, sendBeforeMs: Date.now() + 1000 } }, refs));
});

test('only provider message ID establishes ACCEPTED; timeout/empty/5xx are UNKNOWN without retry', () => {
  const refs = { 'Validate Final Window And Ownership Gate': { jobId: 'job-1', leaseToken: 'token-1' } };
  const accepted = run('Classify Actual Provider Outcome', { statusCode: 200, body: { messages: [{ id: 'wamid.fixture' }] } }, refs)[0].json;
  assert.equal(accepted.outcome, 'ACCEPTED');
  assert.equal(accepted.providerMessageId, 'wamid.fixture');
  for (const input of [{ error: 'timeout' }, { statusCode: 200, body: {} }, { statusCode: 500, body: { error: {} } }, { statusCode: 429, body: { error: {} } }]) {
    assert.equal(run('Classify Actual Provider Outcome', input, refs)[0].json.outcome, 'UNKNOWN');
  }
  assert.equal(run('Classify Actual Provider Outcome', { statusCode: 400, body: { error: { code: 100 } } }, refs)[0].json.outcome, 'REJECTED');
  assert.doesNotMatch(JSON.stringify(accepted), /DELIVERED/);
});

test('first-message tracking detects embedded website/legacy IDs and explicit generic tracking', () => {
  for (const [text, expected] of [['Track my order ' + orderId, orderId],
    ['Please track AB-20261003-153302-3456 thanks', 'AB-20261003-153302-3456'], ['Tracking', '']]) {
    const result = run('Classify Customer Intent', {}, { 'Prepare Conversation Context': {
      from: '923001234567', messageId: 'wamid.fixture', messageType: 'text', text, sessionState: 'idle', sessionContext: '{}'
    } }, [{ active: true, name: 'Pista', base_product_id: 'pista' }])[0].json;
    assert.equal(result.intent, 'order_status');
    assert.equal(result.trackingOrderId || '', expected);
  }
});

test('v29 duplicate/STOP and multiple embedded-ID guards stay intact in the source patch', () => {
  const ctx = { from: '923001234567', messageId: 'wamid.fixture', messageType: 'text', text: 'Track my order', sessionState: 'idle', sessionContext: '{}' };
  assert.equal(run('Classify Customer Intent', {}, { 'Prepare Conversation Context': { ...ctx, last_message_id: ctx.messageId } })[0].json.intent, 'duplicate_message');
  assert.equal(run('Classify Customer Intent', {}, { 'Prepare Conversation Context': { ...ctx, text: 'STOP' } })[0].json.intent, 'cancel_order');
  const ambiguous = run('Classify Customer Intent', {}, { 'Prepare Conversation Context': {
    ...ctx, text: 'Track AB-20261003-A1B2C3 and AB-20261003-D4E5F6'
  } })[0].json;
  assert.equal(ambiguous.trackingAmbiguous, true);
  assert.equal(ambiguous.trackingOrderId, '');
});

test('authorized missing-order receipts may have no revision; status updates must still carry one', () => {
  const claim = { source: 'meta_parent', jobId: 'job-1', leaseToken: 'token-1' };
  const body = { ok: true, ...claim, to: '923001234567', text: 'No saved order matching this number.',
    eventId: 'receipt:wamid.fixture', revision: null, sendBeforeMs: Date.now() + 20000 };
  const refs = { 'Validate Notification Lease': claim };
  assert.equal(run('Validate Final Window And Ownership Gate', { statusCode: 200, body }, refs)[0].json.revision, null);
  assert.throws(() => run('Validate Final Window And Ownership Gate', { statusCode: 200,
    body: { ...body, eventId: 'status-event' } }, refs));
});

test('legacy tracking only returns own-phone exact row; duplicates and canonical website rows disclose no items', () => {
  const refs = { 'Prepare Conversation Context': { from: '923001234567' }, 'Classify Customer Intent': { trackingOrderId: '' } };
  const own = { order_id: 'AB-20261003-153302-3456', phone: '03001234567', product: 'Pista', quantity: '500g', total_amount: 2650, status: 'RECEIVED' };
  const other = { ...own, phone: '03009999999', product: 'PRIVATE OTHER ITEM' };
  assert.doesNotMatch(run('Prepare Tracking Reply', {}, refs, [other])[0].json.replyText, /PRIVATE OTHER ITEM/);
  assert.match(run('Prepare Tracking Reply', {}, refs, [own])[0].json.replyText, /Pista/);
  assert.doesNotMatch(run('Prepare Tracking Reply', {}, refs, [own, own])[0].json.replyText, /Pista/);
  assert.doesNotMatch(run('Prepare Tracking Reply', {}, refs, [{ ...own, order_id: orderId }])[0].json.replyText, /Pista/);
});

test('multiple own legacy orders ask for a choice rather than choosing arbitrary latest', () => {
  const refs = { 'Prepare Conversation Context': { from: '923001234567' }, 'Classify Customer Intent': {} };
  const result = run('Prepare Tracking Reply', {}, refs, [1, 2].map(id => ({ order_id: 'AB-20261003-153302-345' + id,
    phone: '923001234567', product: 'Private details until selected' })))[0].json;
  assert.match(result.replyText, /yeh orders/);
  assert.doesNotMatch(result.replyText, /Private details/);
});

test('canonical receipt branch stops so actual send stays in the durable worker', () => {
  const result = run('Canonical Receipt Or Legacy Route', { statusCode: 200, body: { ok: true, replyType: 'RECEIPT', text: 'Saved canonical receipt' } },
    { 'Prepare Conversation Context': { from: '923001234567' } });
  assert.deepEqual(result, []);
});

test('private patch application preserves every original node ID, credentials, resources and parent workflow ID', () => {
  const originalNodes = patch.modifiedNodes.map((node, i) => ({ name: node.name, id: 'owner-node-' + i,
    type: node.type, parameters: structuredClone(node.parameters), credentials: { existing: { id: 'private-selection' } } }));
  originalNodes.push({ id: 'entry', name: 'Parent Child Entry', type: 'n8n-nodes-base.executeWorkflowTrigger', parameters: {} },
    { id: 'router', name: 'Intent Router', type: 'switch', parameters: {} },
    { id: 'tracking', name: 'Has Tracking ID?)', type: 'if', parameters: {} },
    { id: 'send', name: 'Send WhatsApp Reply', type: 'send', parameters: { privateResource: 'keep-me' } },
    { id: 'unrelated', name: 'Owner New Unrelated Branch', type: 'code', parameters: {} },
    { id: 'find-original', name: 'Find Order in Sheet', type: 'n8n-nodes-base.googleSheets', parameters: { privateResource: 'preserve-sheet' } });
  const input = { id: 'actual-child-workflow-id', active: true, nodes: originalNodes,
    connections: { 'Intent Router': { main: [[{ node: 'Has Tracking ID?)', type: 'main', index: 0 },
      { node: 'Owner New Unrelated Branch', type: 'main', index: 0 }]] } }, pinData: { private: [] } };
  const output = applyTrackingPatch(input);
  assert.equal(output.id, input.id);
  assert.equal(output.active, false);
  assert.deepEqual(output.pinData, {});
  for (const original of originalNodes) {
    const updated = output.nodes.find(node => node.name === original.name);
    assert.equal(updated.id, original.id);
    assert.deepEqual(updated.credentials, original.credentials);
  }
  assert.equal(output.nodes.find(n => n.name === 'Send WhatsApp Reply').parameters.privateResource, 'keep-me');
  assert.equal(output.connections['Intent Router'].main[0][1].node, 'Owner New Unrelated Branch');
  assert.equal(output.nodes.length, originalNodes.length + 3);
  assert.deepEqual(applyTrackingPatch(output), output);
  assert.equal(output.nodes.find(n => n.name === 'Find Order in Sheet').parameters.privateResource, 'preserve-sheet');
  assert.equal(output.nodes.find(n => n.name === 'Find Order in Sheet').onError, 'continueRegularOutput');
  const unknown = structuredClone(input);
  unknown.nodes[0].parameters.jsCode = 'Owner changed this code since export';
  assert.throws(() => applyTrackingPatch(unknown), /PATCH_PARAMETERS_CHANGED_REVIEW_REQUIRED/);
});
