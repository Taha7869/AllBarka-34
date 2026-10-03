/**
 * Bind to the existing Order_Control spreadsheet. Run installOrderControl once
 * as the owner; install its onEdit trigger. Programmatic writes do not run it.
 * Script Properties: ORDER_CONTROL_SHEET=Order_Control, SHEET_SYNC_SECRET=32+ chars.
 * The optional web-app bridge authenticates every POST with that property.
 * Never put this secret in cells, a frontend bundle, or Git.
 */
var ORDER_CONTROL_HEADERS = [
  'order_id', 'status', 'status_revision', 'canonical_status_updated_at', 'sync_error',
  'requested_status', 'request_id', 'request_base_status', 'request_base_revision',
  'request_created_at', 'request_reason', 'last_applied_request_id'
];
var ORDER_CONTROL_OUTPUTS = ['status', 'status_revision', 'canonical_status_updated_at',
  'sync_error', 'request_id', 'request_base_status', 'request_base_revision',
  'request_created_at', 'last_applied_request_id'];

function canonicalStatus(value) {
  var status = String(value || '').trim().toUpperCase();
  var aliases = { RECEIVED: 'ORDER_RECEIVED', ORDER: 'ORDER_RECEIVED', CONF: 'CONFIRMED',
    PROC: 'PREPARING', PACK: 'PREPARING', DISP: 'DISPATCHED', SHIP: 'DISPATCHED',
    DELIV: 'DELIVERED', CANC: 'CANCELLED' };
  status = aliases[status] || status;
  return ['NEW', 'ORDER_RECEIVED', 'CONFIRMED', 'PREPARING', 'DISPATCHED',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].indexOf(status) >= 0 ? status : null;
}

function revisionTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return NaN;
  var time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value ? time : NaN;
}

function safeCell(value) {
  var text = String(value || '').slice(0, 1000);
  return /^[=+@\-\t\r]/.test(text) ? "'" + text : text;
}

function sheetControl() {
  var props = PropertiesService.getScriptProperties();
  var name = props.getProperty('ORDER_CONTROL_SHEET') || 'Order_Control';
  var spreadsheetId = props.getProperty('SHEET_SYNC_SPREADSHEET_ID');
  var spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('BOUND_SPREADSHEET_REQUIRED');
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error('SHEET_NOT_FOUND');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var index = {};
  headers.forEach(function (header, i) {
    if (index[header] !== undefined) throw new Error('DUPLICATE_HEADER');
    index[header] = i;
  });
  ORDER_CONTROL_HEADERS.forEach(function (header) {
    if (index[header] === undefined) throw new Error('MISSING_HEADER_' + header);
  });
  return { sheet: sheet, headers: headers, index: index };
}

function installOrderControl() {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!activeSpreadsheet) throw new Error('RUN_INSTALL_FROM_BOUND_SHEET');
  PropertiesService.getScriptProperties().setProperty('SHEET_SYNC_SPREADSHEET_ID', activeSpreadsheet.getId());
  var control = sheetControl();
  var secret = PropertiesService.getScriptProperties().getProperty('SHEET_SYNC_SECRET');
  if (!secret || secret.length < 32) throw new Error('SET_PRIVATE_SCRIPT_PROPERTY');
  var owner = Session.getEffectiveUser().getEmail();
  if (!owner) throw new Error('OWNER_EMAIL_UNAVAILABLE');
  var writer = PropertiesService.getScriptProperties().getProperty('SHEET_WRITER_EMAIL') || '';
  if (writer && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(writer)) throw new Error('INVALID_SHEET_WRITER_EMAIL');
  var allowedEditors = [owner].concat(writer ? [writer] : []);
  ORDER_CONTROL_OUTPUTS.forEach(function (header) {
    var description = 'AllBarka canonical: ' + header;
    var existing = control.sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE)
      .filter(function (p) { return p.getDescription() === description; })[0];
    var protection = existing || control.sheet.getRange(2, control.index[header] + 1,
      Math.max(1, control.sheet.getMaxRows() - 1), 1).protect();
    protection.setDescription(description).setWarningOnly(false).addEditor(owner);
    if (writer) protection.addEditor(writer);
    var others = protection.getEditors().filter(function (u) { return allowedEditors.indexOf(u.getEmail()) < 0; });
    if (others.length) protection.removeEditors(others);
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  });
  ['status_revision', 'canonical_status_updated_at', 'request_id', 'request_base_revision',
    'request_created_at', 'last_applied_request_id'].forEach(function (header) {
    control.sheet.getRange(2, control.index[header] + 1,
      Math.max(1, control.sheet.getMaxRows() - 1), 1).setNumberFormat('@');
  });
  var requested = control.sheet.getRange(2, control.index.requested_status + 1,
    Math.max(1, control.sheet.getMaxRows() - 1), 1);
  requested.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([
    'NEW', 'ORDER_RECEIVED', 'CONFIRMED', 'PREPARING', 'DISPATCHED',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
  ], true).setAllowInvalid(false).build());
  if (!ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'captureOrderStatusEdit';
  })) ScriptApp.newTrigger('captureOrderStatusEdit').forSpreadsheet(
    SpreadsheetApp.getActiveSpreadsheet()).onEdit().create();
}

function captureOrderStatusEdit(event) {
  if (!event || !event.range) return;
  var control = sheetControl();
  var range = event.range;
  if (range.getSheet().getSheetId() !== control.sheet.getSheetId() || range.getRow() < 2) return;
  var start = range.getColumn() - 1;
  var end = start + range.getNumColumns() - 1;
  if (control.index.requested_status < start || control.index.requested_status > end) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) {
      for (var row = range.getRow(); row < range.getRow() + range.getNumRows(); row++) {
        control.sheet.getRange(row, control.index.sync_error + 1).setValue('MULTI_CELL_EDIT_REJECTED: edit one requested_status cell');
        control.sheet.getRange(row, control.index.request_id + 1).setValue('');
      }
      return;
    }
    var rowIndex = range.getRow();
    var values = control.sheet.getRange(rowIndex, 1, 1, control.headers.length).getValues()[0];
    // An earlier trigger can run after another human edit. It must not capture
    // that newer value as a fresh command belonging to the earlier event.
    if (String(event.value || '') !== String(values[control.index.requested_status] || '')) return;
    var status = canonicalStatus(values[control.index.requested_status]);
    var baseStatus = canonicalStatus(values[control.index.status]);
    var revision = String(values[control.index.status_revision] || '');
    if (!status || !baseStatus || !Number.isFinite(revisionTime(revision)) || !values[control.index.order_id]) {
      control.sheet.getRange(rowIndex, control.index.sync_error + 1).setValue('INVALID_COMMAND: canonical mirror/revision required');
      control.sheet.getRange(rowIndex, control.index.request_id + 1).setValue('');
      return;
    }
    control.sheet.getRange(rowIndex, control.index.requested_status + 1).setValue(status);
    control.sheet.getRange(rowIndex, control.index.request_id + 1).setValue(Utilities.getUuid());
    control.sheet.getRange(rowIndex, control.index.request_base_status + 1).setValue(baseStatus);
    control.sheet.getRange(rowIndex, control.index.request_base_revision + 1).setValue(revision);
    control.sheet.getRange(rowIndex, control.index.request_created_at + 1).setValue(new Date().toISOString());
    control.sheet.getRange(rowIndex, control.index.sync_error + 1).setValue('');
  } finally { lock.releaseLock(); }
}

function authenticateSheetBridge(supplied, configured) {
  if (typeof supplied !== 'string' || typeof configured !== 'string' || configured.length < 32) return false;
  var difference = supplied.length ^ configured.length;
  for (var i = 0; i < configured.length; i++) difference |= configured.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0);
  return difference === 0;
}

function findUniqueRow(control, orderId) {
  var found = [];
  if (control.sheet.getLastRow() < 2) return null;
  var rows = control.sheet.getRange(2, 1, control.sheet.getLastRow() - 1, control.headers.length).getValues();
  rows.forEach(function (values, i) {
    if (String(values[control.index.order_id]) === orderId) found.push({ values: values, row: i + 2 });
  });
  if (found.length > 1) {
    found.forEach(function (entry) { control.sheet.getRange(entry.row, control.index.sync_error + 1).setValue('DUPLICATE_ORDER_ID: repair rows before synchronization'); });
    throw new Error('DUPLICATE_ORDER_ID');
  }
  return found[0] || null;
}

function pendingStatusCommands(control) {
  if (control.sheet.getLastRow() < 2) return [];
  var rows = control.sheet.getRange(2, 1, control.sheet.getLastRow() - 1, control.headers.length).getValues();
  var seen = {};
  rows.forEach(function (values) {
    var id = String(values[control.index.order_id] || '');
    if (id) seen[id] = (seen[id] || 0) + 1;
  });
  return rows.flatMap(function (values, i) {
    var id = String(values[control.index.order_id] || '');
    var requestId = String(values[control.index.request_id] || '');
    if (!requestId || requestId === String(values[control.index.last_applied_request_id] || '')) return [];
    if (seen[id] !== 1) {
      control.sheet.getRange(i + 2, control.index.sync_error + 1).setValue('DUPLICATE_ORDER_ID');
      return [];
    }
    // A visible failure requires an explicit edit/new command; do not rebase or loop old requests.
    if (values[control.index.sync_error]) return [];
    return [{ order_id: id, requested_status: String(values[control.index.requested_status] || ''),
      request_id: requestId, request_base_status: String(values[control.index.request_base_status] || ''),
      request_base_revision: String(values[control.index.request_base_revision] || ''),
      request_created_at: String(values[control.index.request_created_at] || ''),
      request_reason: String(values[control.index.request_reason] || '') }];
  }).slice(0, 25);
}

function mirrorStatus(control, input) {
  var status = canonicalStatus(input.status);
  var revision = String(input.revision || '');
  if (!status || !Number.isFinite(revisionTime(revision))) throw new Error('INVALID_CANONICAL_STATUS');
  var found = findUniqueRow(control, String(input.orderId || ''));
  if (!found) throw new Error('ORDER_ROW_NOT_FOUND');
  var oldRevision = String(found.values[control.index.status_revision] || '');
  var oldTime = revisionTime(oldRevision);
  var newTime = revisionTime(revision);
  if (Number.isFinite(oldTime) && newTime < oldTime) return { ok: true, orderId: input.orderId, eventId: input.eventId, mirrorStored: true, ignored: 'STALE_REVISION', revision: oldRevision };
  if (Number.isFinite(oldTime) && newTime === oldTime) {
    if (canonicalStatus(found.values[control.index.status]) !== status) throw new Error('REVISION_PAYLOAD_CONFLICT');
    return { ok: true, orderId: input.orderId, eventId: input.eventId, mirrorStored: true, duplicate: true, revision: revision };
  }
  control.sheet.getRange(found.row, control.index.status + 1).setValue(status);
  control.sheet.getRange(found.row, control.index.status_revision + 1).setValue(revision);
  control.sheet.getRange(found.row, control.index.canonical_status_updated_at + 1).setValue(revision);
  // Leave requested_* and sync_error intact: an old pending command remains a conflict.
  return { ok: true, orderId: input.orderId, eventId: input.eventId, mirrorStored: true, revision: revision };
}

function acknowledgeStatusCommand(control, input) {
  var found = findUniqueRow(control, String(input.orderId || ''));
  if (!found) throw new Error('ORDER_ROW_NOT_FOUND');
  if (typeof input.requestId !== 'string' || !input.requestId) throw new Error('INVALID_REQUEST_ID');
  if (input.status && input.revision) mirrorStatus(control, input);
  // Compare after acquiring the same document lock. Never erase a newer user edit.
  var currentId = String(control.sheet.getRange(found.row, control.index.request_id + 1).getValue() || '');
  if (currentId !== input.requestId) return { ok: true, orderId: input.orderId, requestId: input.requestId, newerRequestPreserved: true };
  if (input.applied === true) {
    control.sheet.getRange(found.row, control.index.last_applied_request_id + 1).setValue(input.requestId);
    // Keep requested_* intact. An owner edit can occur before its onEdit trigger
    // acquires this lock; clearing the cell here could erase that newer edit.
    control.sheet.getRange(found.row, control.index.sync_error + 1).setValue('');
  } else {
    control.sheet.getRange(found.row, control.index.sync_error + 1).setValue(safeCell(input.error || 'STATUS_SYNC_FAILED'));
  }
  return { ok: true, orderId: input.orderId, requestId: input.requestId, applied: input.applied === true };
}

function doPost(event) {
  var result;
  try {
    var raw = event && event.postData && event.postData.contents;
    if (typeof raw !== 'string' || raw.length > 20000) throw new Error('INVALID_BODY');
    var input = JSON.parse(raw);
    var secret = PropertiesService.getScriptProperties().getProperty('SHEET_SYNC_SECRET');
    if (!authenticateSheetBridge(input.secret, secret)) throw new Error('UNAUTHORIZED');
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var control = sheetControl();
      if (input.action === 'pending') result = { ok: true, commands: pendingStatusCommands(control) };
      else if (input.action === 'ack') result = acknowledgeStatusCommand(control, input);
      else if (input.action === 'mirror') result = mirrorStatus(control, input);
      else throw new Error('INVALID_ACTION');
    } finally { lock.releaseLock(); }
  } catch (error) {
    var code = String(error && error.message || 'SHEET_BRIDGE_FAILED');
    result = { ok: false, error: /^[A-Z_]+$/.test(code) ? code : 'SHEET_BRIDGE_FAILED' };
  }
  // ContentService cannot select HTTP status: callers must verify this JSON acknowledgement.
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
