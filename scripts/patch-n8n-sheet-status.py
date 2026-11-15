"""Point the Google Sheet -> website status workflow at the route the website actually accepts.

The original "Send To Backend" node posted to /order-update with requestId, requestCreatedAt, reason and
source fields and no updatedAt; the website rejects that body even with the right secret. Sheet status
changes belong to /order-status, whose contract is validated by src/lib/sheetStatusCommand.ts:
source 'google_sheet', eventId 'sheet:<8-100 safe chars>', orderId, status and expectedStatus in
ORDER_STATUSES (upper case), expectedUpdatedAt (ISO), reason (3-500 chars).
Usage: python3 scripts/patch-n8n-sheet-status.py <in.json> <out.json>
"""
import json, sys

BODY = ("={{ JSON.stringify({ source: 'google_sheet', "
        "eventId: 'sheet:' + (String($json.order_id || '') + '-' + String($json.request_id || '')).replace(/[^A-Za-z0-9_-]/g, '-').padEnd(8, '0').slice(0, 100), "
        "orderId: String($json.order_id || '').trim(), "
        "status: String($json.requested_status || '').trim().toUpperCase().replace(/[\\s-]+/g, '_'), "
        "expectedStatus: String($json.status || '').trim().toUpperCase().replace(/[\\s-]+/g, '_'), "
        "expectedUpdatedAt: String($json.canonical_status_updated_at || '').trim(), "
        "reason: (String($json.request_reason || '').trim() || 'Status updated from the Google Sheet').slice(0, 500) }) }}")

wf = json.load(open(sys.argv[1]))
nodes = {n['name']: n for n in wf['nodes']}
send = nodes['Send To Backend']
send['parameters']['url'] = 'https://allbarka.com/api/integrations/n8n/order-status'
send['parameters']['jsonBody'] = BODY
pending = nodes['Pending Requests?']['parameters']
old = 'return !!(hasStatus || hasTracking || hasEta || hasReason);'
assert old in pending['jsCode']
# The status route changes status only; tracking and delivery-date requests stay in the sheet for the team.
pending['jsCode'] = pending['jsCode'].replace(old, 'return !!hasStatus;')
json.dump(wf, open(sys.argv[2], 'w'), ensure_ascii=False, indent=2)
print('patched Send To Backend ->', send['parameters']['url'])
