# Current workflow: website chat and durable order mirror

The owner supplied **AllBarka-n8n-v29-20261003.zip**. Its full review contains108 nodes (the original90 retained) and17 website nodes; its actual supplied validator passed **29/29 offline checks**. The earlier `(1).zip` had22 checks and is superseded as the tracking source. No Meta parent export is present in either package. These are source artifacts and offline results; no running workflow was imported, published or replaced.

| Artifact | Purpose |
| --- | --- |
| [allbarka-website-integration.json](../n8n/allbarka-website-integration.json) | Inactive 17-node chat/creation mirror addition; one 20-second Groq attempt, canonical status/revision columns. |
| [allbarka-status-sync.json](../n8n/allbarka-status-sync.json) | Inactive explicit Sheet command polling and separately authenticated canonical status receiver. |
| [OrderControl.gs](../n8n/OrderControl.gs) | Bound Apps Script for edit-time revisions, protected outputs and compare-and-ack under a shared script lock. |
| [allbarka-whatsapp-window.json](../n8n/allbarka-whatsapp-window.json) | Inactive raw Meta evidence bridge and claim/authorize/send/result notification consumer. |
| [allbarka-tracking.patch.json](../n8n/allbarka-tracking.patch.json) | Targeted original-child tracking/receipt patches; no credential/resource values. |
| [apply-tracking-patch.mjs](../n8n/apply-tracking-patch.mjs) | Applies that patch to an ignored private review export while retaining the original child ID and resource selections. |

[change-manifest.json](../n8n/change-manifest.json) records the earlier supplied full review. Its other original-node changes are not automatically deployed by this repository. The checked-in tracking patch uses the29-package classifier and receipt safeguards, preserves the canonical backend/window routing, adds the updated normalization fields and Sheet lookup failure handling, and retains manual-verification request language. Source digest and exact repository changes are recorded in the manifest.

## Import without replacing the owner's workflow

Back up the current workflow, import the website-only JSON inactive for review, then copy/paste its 17 nodes into the existing workflow if preserving its ID. Check the parent Execute Workflow reference before activating a separate copy. Publish only one instance of each webhook path. No original WhatsApp, Slack, session, routing or pricing node is removed or deployed by these source changes.

The Git-safe import clears all credential references, Sheet IDs and cached Sheet URLs. Reselect:

- **Website AI Webhook:** Header Auth, header `X-AllBarka-Webhook-Secret`, random 32+ character value matching `N8N_AI_WEBHOOK_SECRET`.
- **Website AI Brain:** existing Groq HTTP Header Auth credential and current `openai/gpt-oss-120b` request. See [AI_CONSULTANT_LAUNCH.md](AI_CONSULTANT_LAUNCH.md).
- **Website Order Webhook:** separate Header Auth credential with the same header name and a different random secret matching `N8N_WEBHOOK_SECRET`.
- **Find Website Order Mirror** and **Write Website Order Mirror:** existing Google service-account credential, owner's actual spreadsheet and existing `Order_Control` tab. Verify access and columns before activation.

Use published Production URLs `/webhook/allbarka-website-ai` and `/webhook/allbarka-website-orders` in commerce server settings. Test-listener `/webhook-test/` URLs stop working when the listener stops. Webhook URLs/secrets/Groq keys stay outside frontend variables.

## Order mirror

Firestore creates the canonical order and its existing `ORDER_CREATED` outbox record atomically. The persistent Express worker leases eligible events, reads the persisted order and sends an event with a fresh dispatch timestamp. Original `orderId` and `createdAt` stay stable on retries. Persisted subtotal, discount, shipping and total are used exactly, including valid wrapping/rewards. No claim or authentication token is forwarded.

The receiver validates the event, looks up the ID in `Order_Control` and appends only a new mirror. A duplicate creation acknowledges its existing row without overwriting progressed status, notes or payment state. Delivery succeeds only for HTTP 2xx and `{ok:true, orderId:<matching ID>, mirrorStored:true}`. Empty/HTML responses and failed writes do not acknowledge success. The timeout remains active through acknowledgement parsing.

Expected Sheet headers:

```text
order_id, order_date, customer_uid, customer_name, phone, address, items_summary,
source, subtotal, shipping_fee, total_amount, payment_method, delivery_type,
promised_delivery_date, priority, status, whatsapp_status, status_revision,
canonical_status_updated_at, sync_error, requested_status, request_id,
request_base_status, request_base_revision, request_created_at, request_reason,
last_applied_request_id
```

Writes use RAW cell formatting, with untrusted text escaped against spreadsheet formulas. Both website branches are isolated from customer WhatsApp sends, Slack notifications and phone-session writes. `whatsapp_status` begins `NOT_SENT`; no customer notification is claimed.

This receiver authenticates **TLS + Header Auth**. It does not verify `X-N8n-Signature`; no HMAC verification is claimed. Adding HMAC requires a separately tested raw-body receiver. Chat and order routes require different secrets.

## Retry and reconciliation

The outbox runs in the existing persistent Express process. Static Azure/Netlify publication does not start a worker. Valid dispatch requires an HTTPS `N8N_ORDER_WEBHOOK_URL` without embedded credentials/hash plus nonempty server-only `N8N_WEBHOOK_SECRET`. Use a distinct random 32+ character secret. `N8N_ORDER_TIMEOUT_MS` defaults to 5000 and is bounded to 1000–30000.

Worker controls are fixed in code: 1000ms polling, six attempts, exponential backoff starting at 30 seconds and capped at 15 minutes, and global/event leases at least 60 seconds (longer when needed to cover the request). A cycle dispatches one event. Atomic Firestore leases prevent concurrent event ownership and expired-lease recovery survives restart. Creation/status dispatch requires the composite index in [firestore.indexes.json](../firestore.indexes.json): collection `orderEvents`, `eventType ASCENDING`, `nextAttemptAtMs ASCENDING`. Install that index privately before enabling the worker; its source is provided but no index deployment occurred here. Terminal events remove the next-attempt field. A failed n8n/Sheet mirror never rolls back the canonical order or turns saved checkout into failure.

New creation events remain explicitly disabled unless dispatch is validly configured. Historical `DISABLED` events are **never replayed automatically**. Use the report-only `inspectOrderOutbox` utility and review a reconciliation report before planning a migration; old orders may already exist or have progressed in the Sheet. Exhausted events retain their attempt/failure state for operator review and require reviewed intervention. Treat mismatched acknowledgements as failures and investigate duplicate rows.

Run `npm run outbox:report -- --limit 100` on the actual API host with its private Firebase Admin credentials to produce aggregate sampled state/reason counts. The sample is bounded to 1–1000 events and labels possible truncation. It performs zero writes, dispatches or replays and prints no customer information or order references. Missing credentials fail before connecting. No live historical report was generated in this workspace because private Admin credentials are unavailable; do not infer that historical events have been reconciled.

Sheet lookup then append is not an atomic unique transaction. Keep dispatch serialized and inspect duplicate IDs when reconciling multiple processes or a lost acknowledgement. Firestore/admin remain authoritative. This receiver still accepts only `ORDER_CREATED`; `ORDER_STATUS_CHANGED` uses the separate status receiver described below and must not be sent to the creation receiver.

## Scope and tests

The private full review includes WhatsApp context, phone-ownership tracking and explicit AI handoff fixes. The targeted patch supplements it without deleting original nodes. The package still lacks the actual Meta ingress/parent, and its WhatsApp product/stock flow is not a canonical atomic checkout. Automatic WhatsApp order acceptance remains blocked: the patched request receipt says manual verification is pending, includes its tracking ID, and promises neither final shipping nor permanent free delivery nor payment received. Do not import legacy Sheet prices as trusted Firestore orders. Website checkout retains canonical Express pricing and Firestore authority.

Run `npm run test:workflow` for checked-in website/static fixtures and `node --test --test-isolation=none tests/n8n-followup.test.mjs` for the status, Apps Script, tracking and notification artifact fixtures. The newly supplied validator independently passed29 offline checks against the private v29 package. No live n8n, Groq, Sheets, Firebase or customer action was performed by these tests. Live credential/schema compatibility, quotas, concurrency, one specifically owner-authorized order and its mirror remain separate checks.


The Sheet's total_amount includes canonical gift wrapping and valid rewards/discounts. Its supplied schema has no separate giftWrapFee or hamperConfiguration column: the fixture verifies subtotal6500 − discount500 + shipping0 + wrapping150 = total6150 without a second price calculation. Detailed hamper selections, packaging, private gift messages and packing instructions remain in Firestore/admin; the mirror's items_summary is not the packing authority.

Readiness uses a bounded read-only database probe and a saved-order confirmation observed in this API process. Initializing the Firebase SDK alone never sets `durablePersistenceReady:true`; the flag resets on process restart. See [COMMERCE-INTEGRATION.md](COMMERCE-INTEGRATION.md) for its exact fields and the separate live auth/n8n checks.

## Sheet and Admin share the canonical transaction

Firestore holds status and its ISO `updatedAt` revision. Accepted values are `NEW`, `ORDER_RECEIVED`, `CONFIRMED`, `PREPARING`, `DISPATCHED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`. Exact legacy aliases map as follows: `RECEIVED/ORDER` → `ORDER_RECEIVED`, `CONF` → `CONFIRMED`, `PROC/PACK` → `PREPARING`, `DISP/SHIP` → `DISPATCHED`, `DELIV` → `DELIVERED`, `CANC` → `CANCELLED`; unknown values fail. Payment state is separate.

1. Add the headers above to the existing `Order_Control` tab. Back up it and audit duplicate `order_id` rows. Existing rows need a verified canonical revision before they can generate commands; never fabricate a revision from processing time or migrate prices from legacy rows.
2. Bind `OrderControl.gs` to that spreadsheet. Privately set Script Properties `ORDER_CONTROL_SHEET=Order_Control` and `SHEET_SYNC_SECRET` to a distinct random 32+ character value. If the existing n8n Google Sheets credential uses a service account or another principal, set private `SHEET_WRITER_EMAIL` to that verified credential email and retain its normal spreadsheet access; otherwise creation append into protected status/revision columns would fail. Run `installOrderControl` as the owner. It saves the private spreadsheet ID in `SHEET_SYNC_SPREADSHEET_ID`, protects canonical/output columns for the owner and explicitly allowed mirror writer, formats revision/ID columns as text, installs one edit trigger, and validates requested status cells. No owner/credential email is checked into the artifact.
3. Owner edits only **one `requested_status` cell at a time** (with optional `request_reason` prepared first). The installable edit trigger compares the event's value to the current cell and ignores an older superseded edit, then captures the current canonical status/revision, fresh UUID and timestamp under the lock. Multi-cell/paste edits are visibly rejected, have no request ID, and require a single-cell edit. An unknown status or missing canonical revision similarly fails. Programmatic writes do not run this edit trigger.
4. Deploy the bound script as a web app executing as the owner only after reviewing access. Configure private n8n `N8N_SHEET_BRIDGE_URL` with its HTTPS `/exec` URL and `N8N_SHEET_SYNC_SECRET` matching `SHEET_SYNC_SECRET`. The bridge authenticates its small POST JSON before opening the sheet. The secret lives in n8n's server environment and Script Properties, never cells/frontends. Apps Script `ContentService` replies with HTTP200 even for errors; each n8n stage therefore verifies JSON `ok:true` and matching IDs.
5. Import `allbarka-status-sync.json` inactive. Its one-minute poll selects explicit pending requests, validates at most25 distinct rows/orders, and sends the original edit-time revision. Select a private commerce Header Auth credential, header `X-AllBarka-Integration-Secret`, value `N8N_INTEGRATION_SECRET`. Privately set n8n `ALLBARKA_COMMERCE_ORIGIN` to the actual same-origin Railway service. No pricing/customer/payment/inventory fields are sent.

The command contract is:

```json
{"source":"google_sheet","eventId":"sheet:<request_id>","orderId":"AB-20261003-A1B2C3","status":"DISPATCHED","expectedStatus":"PREPARING","expectedUpdatedAt":"<captured ISO revision>","reason":"Owner changed delivery status in Sheet"}
```

`POST /api/integrations/n8n/order-status` authenticates the server credential and assigns actor `n8n_sheet`. The transaction deduplicates the event plus payload. Repeated identical commands return their stored result; changed payload under the same event ID conflicts. A409 returns canonical status/revision. The script records a visible conflict and the poll stops that command. Owner must review and explicitly edit `requested_status` again to capture a new base/UUID; neither n8n nor the script refreshes and blindly retries the old command.

Status-event contract: backend POSTs `{event:"ORDER_STATUS_CHANGED",eventId,timestamp,order:{orderId,status,updatedAt,...}}` to the separate `allbarka-order-status` Production webhook. Select Header Auth `X-AllBarka-Webhook-Secret` with distinct `N8N_STATUS_WEBHOOK_SECRET`; configure Railway `N8N_STATUS_WEBHOOK_URL` and that secret. Each protected mirror update compares the ISO revision under the script lock. Same revision with a different status is a repair error; older revision is safely ignored; exact duplicates acknowledge without changing commands. Only a matching `{ok:true,orderId,eventId,statusRevision:<incoming updatedAt>,mirrorStored:true}` acknowledges the durable backend event, including safely ignored stale events. Missing/duplicate rows or failed writes return no acknowledgement.

`requested_*` fields remain intact. An acknowledgement compares `request_id` under the same shared script lock and never clears any input cell: a human edit may precede its queued onEdit trigger, so even clearing the visible requested status after an old result would be unsafe. `last_applied_request_id` stops completed commands from being polled again; a newer captured request is preserved. Mirror writes do not generate commands or modify the canonical transaction, preventing a feedback loop. Google Sheets itself has no atomic unique constraint; inspect duplicates and restrict direct canonical cell edits even though the owner can override protections.

## Actual Meta parent and service-window contract

The uploaded workflow starts with **When Executed by Another Workflow**. Its example contains normalized sender/text and processing time, but no original Meta signature/raw body. That child and the browser sign-in do **not** prove sender authentication or a 24-hour window. The actual parent export was not supplied or verified. Keep `WHATSAPP_PARENT_VERIFIED` disabled until that parent is inspected and a real owner-approved inbound is checked.

The inactive raw-evidence bridge expects the parent's **unmodified original HTTP body string** and original `X-Hub-Signature-256`. It calls:

```text
POST /api/integrations/n8n/whatsapp/inbound
X-AllBarka-Integration-Secret: <private N8N_INTEGRATION_SECRET>
{source:"meta_parent", rawMetaBody:<exact original JSON bytes decoded as UTF-8>, metaSignature:"sha256=..."}
```

Backend verifies the HMAC with private `WHATSAPP_META_APP_SECRET` and checks the configured `WHATSAPP_BUSINESS_PHONE_ID`. Normalized phone objects, `verified:true`, checkout time, outgoing messages and processing timestamps are not accepted as evidence. Only original provider timestamps from accepted signed messages advance a durable monotonic window; message IDs deduplicate replays, future times are guarded, and unrelated inbound does not remove STOP. Signed provider status callbacks use the same route and are separate delivery evidence.

`POST /api/integrations/n8n/whatsapp/receipt` accepts `{source:"meta_parent",messageId}` only. The backend derives sender from the durable verified inbound message, then returns only that sender's saved receipt or multiple-order choices. An order ID alone or browser/profile phone cannot authorize it. A read of an older message never opens a send window. Tracking must say `Track my order <saved orderId>`; the customer presses **Send**. Clicking the website link or creating an order does not open the window.

The inactive notification consumer uses these narrow authenticated calls:

| Route | Body / result |
| --- | --- |
| `/whatsapp/notifications/claim` | `{source:"meta_parent"}` → one `jobId`, `leaseToken`, lease expiry; or `idle:true`, no receipt/phone. |
| `/whatsapp/notifications/authorize` | `{source:"meta_parent",jobId,leaseToken}` → final current ownership, canonical revision, STOP, window and expiry-margin gate; authorized `to/text/eventId/revision/sendBeforeMs`. |
| `/whatsapp/notifications/result` | `{source:"meta_parent",jobId,leaseToken,outcome:"ACCEPTED"|"REJECTED"|"UNKNOWN",providerMessageId?}` → durable outcome. |

All route names above are under `/api/integrations/n8n`. Authorization occurs immediately before every provider attempt. Privately select the existing Meta Header Auth credential on **One Meta Service Message**, and set n8n `WHATSAPP_BUSINESS_PHONE_ID` and the actual currently supported `WHATSAPP_GRAPH_VERSION`; do not put its token in JSON/Git. The consumer sends one ordinary text service message, with one bounded five-second attempt and no retry. It introduces no templates, marketing or paid-window bypass.

Only an actual provider `messages[0].id` establishes ACCEPTED. Missing IDs, timeout,5xx or an ambiguous429 become UNKNOWN for reconciliation, without automatic resend. DELIVERED requires matched signature-verified provider evidence. A failed result callback similarly needs reconciliation because an external send may already have happened. No exactly-once external-delivery promise is made. Closed windows hold/coalesce the latest status; the next authenticated tracking request receives the current receipt rather than historical-update spam.

## Preserve the original workflow and parent linkage

Apply the targeted patch to an ignored private review export:

```powershell
node n8n/apply-tracking-patch.mjs --input PATH_TO_PRIVATE_OWNER_CHILD_EXPORT --output .local-setup/review-child.json
```

The helper retains original node IDs, credentials/resource selections, all unrelated branches and the child workflow ID; it only changes named tracking/receipt parameters, adds three nodes and redirects the actual tracking router edge. Each changed node must match its recognized22/29-package parameter hashes or the already-patched parameters; newer owner changes stop with `PATCH_PARAMETERS_CHANGED_REVIEW_REQUIRED` for manual comparison. It produces an inactive private review file, refuses existing output or a non-ignored output path, and never calls n8n. Apply changes **in place** to the owner child after review so the real parent's Execute Workflow reference remains intact. Do not publish a separate incomplete replacement copy or claim that applying source patches activates webhooks.

Canonical receipt responses stop in the child because verified inbound queues their durable window-gated send. Existing own-phone legacy Sheet tracking remains a separately identified compatibility path pending validated migration; the original child send nodes and actual parent were not supplied as a verified service-window pipeline. Before enabling those original reply paths, route every send/retry through the same backend evidence/STOP/window gate. Legacy tracking fixture success is not certification of its live Meta parent or external sends. Automatic WhatsApp-created order acceptance remains blocked until verified product/portion mapping reaches the canonical Firestore stock/order transaction.

No parent export, actual n8n import/publish, Apps Script deployment, Google Sheet write, Meta send, Firebase test order, Railway deployment or live service-window test was performed in this work. The remaining private values and owner-approved live checks are listed in [COMMERCE-INTEGRATION.md](COMMERCE-INTEGRATION.md) and [RAILWAY-LAUNCH.md](RAILWAY-LAUNCH.md).

Implementation references: bound-script active-document helpers are unavailable in a web-app execution, so installation stores its spreadsheet ID privately and the bridge uses `openById` ([Google bound scripts](https://developers.google.com/apps-script/guides/bound)). `getScriptLock` covers concurrent users/executions of this script ([Google Lock Service](https://developers.google.com/apps-script/reference/lock/)). The checked-in HTTP node uses n8n's full-response/JSON/never-error options so code can inspect both status and acknowledgement ([n8n HTTP Request source](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/HttpRequest/V3/Description.ts)); actual instance-version/import behavior still requires the inactive review test.
