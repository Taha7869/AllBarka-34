# AllBarka order integration contract

Firestore is authoritative. Express validates orders, computes prices, applies fulfillment updates, awards points, and authorizes WhatsApp sends. n8n transports events and mirrors backend snapshots to `Order_Control`; it must never price an order, award points, or write directly to Firestore. Nothing in this PR imports/publishes n8n workflows or deploys Railway.

## Runtime and environment

Railway repository `Taha7869/AllBarka-34`, project `AllBarka`, service `allbarka-fullstack`; fullstack root `/`, build `npm run build`, start `npm start`, health `/api/health`. Node `>=22.12.0 <25`, npm11. Express binds the Railway `PORT` on `0.0.0.0`. Keep `VITE_API_BASE_URL` blank for same-origin hosting. Leave `TRUST_PROXY_HOPS` unset until ingress is verified. Preserve and reference existing shared secrets; do not overwrite them.

| Variable | Requirement / format / purpose |
|---|---|
| `NODE_ENV` | `production` on Railway |
| `PORT` | Railway-supplied integer; do not hard-code a public port |
| `APP_URL`, `RAILWAY_PUBLIC_DOMAIN` | Actual public HTTPS origin; Railway domain is the fallback |
| `FRONTEND_ORIGINS` | Optional comma-separated exact HTTPS origins for a separate frontend; blank for same-origin |
| `TRUST_PROXY_HOPS` | Optional verified nonnegative integer; keep unset until verified |
| `FIREBASE_PROJECT_ID` | `allbarka-live` |
| `FIREBASE_CLIENT_EMAIL` | Private Firebase Admin service-account email |
| `FIREBASE_PRIVATE_KEY` | Private PEM string, actual newlines or literal `\n` escapes; **not base64**. `FIREBASE_SERVICE_ACCOUNT` is not read |
| `FIRESTORE_DATABASE_ID` | `(default)` or the actual existing database ID |
| `N8N_ORDER_WEBHOOK_URL` | Required published HTTPS production webhook URL, no query/auth/fragment; used for both event types by default |
| `N8N_WEBHOOK_SECRET` | Required private Header Auth value, recommend independent random32+ characters |
| `N8N_ORDER_TIMEOUT_MS` | Optional integer1000–30000; default5000, includes response JSON parsing |
| `N8N_STATUS_WEBHOOK_URL` | Optional dedicated status endpoint; leave blank to use the order endpoint |
| `N8N_STATUS_WEBHOOK_SECRET` | Required **only** if the dedicated status URL is set; never borrowed from the order secret in that case |
| `N8N_STATUS_TIMEOUT_MS` | Optional1000–30000; falls back to order timeout/default5000 |
| `N8N_INTEGRATION_SECRET` | Required private distinct32–512-character secret for n8n → backend |
| `LOYALTY_POINTS_PER_100_RUPEES` | Optional integer0–10000; default1; 0 disables new awards. Invalid values fail closed |
| `WHATSAPP_META_APP_SECRET` | Private Meta app secret, verifies original inbound webhook bytes |
| `WHATSAPP_BUSINESS_PHONE_ID` | Actual Meta business phone ID, plain numeric string |
| `WHATSAPP_PARENT_VERIFIED` | Literal `true` only after original signed Meta parent forwarding is verified; otherwise `false` |
| `VITE_API_BASE_URL` | **Blank** for this fullstack service; only public HTTPS origin for a deliberately separate frontend |
| `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIRESTORE_DATABASE_ID` | Existing public Firebase Web app identifiers; no Admin secrets |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_MEASUREMENT_ID` | Existing public Web app settings; bundled public config is the fallback; measurement optional |
| `N8N_AI_WEBHOOK_URL`, `N8N_AI_WEBHOOK_SECRET`, `N8N_AI_TIMEOUT_MS`, `AI_GUEST_HASH_SECRET` | Existing separate concierge integration; preserved. Groq credentials stay in n8n, not these order payloads |
| `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | Optional existing legacy contact/newsletter Sheets helpers; not required for the n8n order bridge |
| `ADMIN_UID` | Optional private admin-grant CLI target; does not itself grant a claim |
| `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `GOOGLE_APPLICATION_CREDENTIALS` | Local test/SDK settings; do not set emulator hosts in production |
| `CHROME_PATH` | Local image-generation audit only; not a runtime integration variable |

The existing15 Railway shared variable names were inventoried read-only on4Oct2026. This PR changes no service variables. Presence does not prove the value, service reference, endpoint connectivity, or credentials are correct. Configure `LOYALTY_POINTS_PER_100_RUPEES` only if overriding1. Other private credentials remain in their existing secret stores. n8n needs Google Sheets OAuth/service-account credentials and Meta access-token credentials in **n8n's credential store**, never Sheet cells or Git.

## Durable worker, errors and recovery

`startServer()` starts one worker immediately, then schedules a cycle15seconds after the previous cycle finishes. Shutdown drains the current attempt. Firestore global/event leases and fencing prevent overlapping dispatch across replicas. `/api/health.outboxWorker` reports `started`, `stopped`, `running`, `lastTickAt`, `lastResult`, `pollIntervalMs` without customer data. A public health response shows process activity, not external delivery success.

Each completed cycle logs one `outbox worker tick: N pending, N delivered, N failed` line plus its result. These are **bounded cycle counts**, not whole-collection totals: up to25 due records per enabled event type are scanned, with one dispatched per cycle. Busy/configuration-disabled/DB-unavailable cycles also produce a heartbeat. `lastTickAt` is cycle start; a long-running Firestore request remains `running:true`. The15second timer is a delay after completion, not a claim that SDK/network failures finish within15seconds.

Errors log `errorMessage`, `errorStack` (including Error causes), `step`, `eventId` (`none` before an item is read), optional SDK `errorCode`, and transport `httpStatus` (`no response` when unavailable). Steps distinguish Firestore lease acquisition/read/claim/verification/result-write/release from `N8N_ORDER_WEBHOOK_URL.call` or a configured dedicated status call. Configured secrets, private webhook URLs, private keys and contact values are redacted. Webhook response bodies and full order records are not logged.

Policy: **one initial send + at most five retries** (six total attempts), backoff30s,60s,120s,240s,480s; generic cap15minutes. On exhaustion the event is `deliveryState:FAILED`, has a stable error code/HTTP status when available, and has no `nextAttemptAtMs` or active lease. Delivered events likewise leave the due queue. Malformed or missing canonical orders fail immediately. Firestore failures before claiming cannot mark an unknown item; DB write failures recover from the persisted expiring lease. Historical `DISABLED`/`FAILED` events are never automatically replayed; the operator must inspect them before any deliberate remediation.

Deploy the checked-in composite index **on the configured database**: collection `orderEvents`, collection scope, `eventType ASC`, `nextAttemptAtMs ASC` ([firestore.indexes.json](firestore.indexes.json)). Inspect the new error detail before assuming a missing index, IAM, DNS, gRPC, or webhook issue. `npm run outbox:report` is a bounded read-only report, not a replay command. Firestore transaction reads precede writes and retried callbacks do no external I/O; see [Firebase transactions](https://firebase.google.com/docs/firestore/manage-data/transactions) and [index management](https://firebase.google.com/docs/firestore/query-data/indexing).

Read-only production evidence4Oct2026: Railway service is running `main`, deployment `15663d07-d1c8-4aaf-8678-a4c85019fea0` is `SUCCESS`, Firebase Admin initialization is logged, and the old worker emits repeated label-only errors. This proves the old scheduled worker runs, **not** the underlying failure or successful webhook delivery. New worker startup/scheduling is exercised offline in this PR; its production heartbeat/error details must be verified after owner-reviewed deployment. No live order or WhatsApp was sent during verification.

## Outbound backend → n8n

POST to `N8N_ORDER_WEBHOOK_URL`; headers `Content-Type: application/json`, **`X-AllBarka-Webhook-Secret: <N8N_WEBHOOK_SECRET>`**. Creation also supplies `X-N8n-Signature` as a compatibility raw-body HMAC-SHA256; Header Auth is the required receiver authentication. Stable `eventId` is reused on retry. The backend transaction saves creation `type:order_created` and the required payload before delivery; the worker reprojects the canonical saved order so stale client prices cannot enter the wire payload.

Creation schema/example (all money is numeric PKR; `price` is per selected portion, not extended line total):

```json
{
  "type": "order_created",
  "event": "ORDER_CREATED",
  "eventId": "AB-20261004-ABC123_ORDER_CREATED_1791115200000",
  "source": "website",
  "timestamp": "2026-10-04T12:00:00.000Z",
  "payload": {
    "orderId": "AB-20261004-ABC123",
    "customerName": "Example Customer",
    "customerPhone": "03001234567",
    "items": [{ "name": "Royal Almonds", "qty": 1, "price": 1100 }],
    "total": 1250,
    "paymentMethod": "cod",
    "createdAt": "2026-10-04T12:00:00.000Z"
  },
  "order": {
    "source": "website", "orderType": "ORDER", "orderId": "AB-20261004-ABC123", "customerUid": null,
    "customer": { "name": "Example Customer", "phone": "03001234567", "address": "Example address", "city": "Lahore" },
    "items": [{ "id": "badam-250g", "name": "Royal Almonds", "selectedWeight": "250g", "quantity": 1, "price": 1100 }],
    "totals": { "subtotal": 1100, "discount": 0, "shipping": 150, "total": 1250 },
    "paymentMethod": "cod", "createdAt": "2026-10-04T12:00:00.000Z", "updatedAt": "2026-10-04T12:00:00.000Z", "status": "ORDER_RECEIVED",
    "promoCode": null, "promoType": null, "discountAmount": 0,
    "freeShipping": false, "freeGiftWrap": false, "freeGift": false, "isQuoteRequest": false
  }
}
```

`order` preserves the existing mirror schema. Additional optional fields: `paymentStatus`, `promoValue`, `delivery:{type,priority,promisedDeliveryDate}`, `gifting:{giftWrap,giftWrapFee,giftMessage?}`, and each item's existing `hamperConfiguration`. These are authoritative snapshots, not input fields. `paymentMethod` is `cod|bank|quote`; quote events retain `status:QUOTE_REQUESTED`, `orderType:QUOTE_REQUEST`, zero totals and quote promo flags. No claim tokens/hashes, auth tokens, private admin notes, private key or webhook secrets enter the body.

Creation receiver acknowledges **only after Sheet persistence** (including duplicate/upsert confirmation):

```json
{ "ok": true, "orderId": "AB-20261004-ABC123", "mirrorStored": true }
```

Status delivery uses the same endpoint/header by default. Optional `N8N_STATUS_WEBHOOK_URL` selects a dedicated receiver with its own secret. It retains legacy `event:ORDER_STATUS_CHANGED`, immutable `order` and exact acknowledgement contract:

```json
{
  "type": "order_status_updated", "event": "ORDER_STATUS_CHANGED", "eventId": "AB-20261004-ABC123_STATUS_PREPARING_1791118800000",
  "source": "website", "timestamp": "2026-10-04T13:00:00.000Z",
  "order": { "orderId": "AB-20261004-ABC123", "status": "PREPARING", "updatedAt": "2026-10-04T13:00:00.000Z" },
  "payload": {
    "orderId": "AB-20261004-ABC123", "source": "website", "status": "PREPARING", "updatedAt": "2026-10-04T13:00:00.000Z",
    "customerName": "Example Customer", "customerPhone": "03001234567",
    "trackingNumber": "COURIER-123", "estimatedDelivery": "2026-10-08", "loyaltyPointsEarned": 0
  }
}
```

```json
{ "ok": true, "orderId": "AB-20261004-ABC123", "eventId": "AB-20261004-ABC123_STATUS_PREPARING_1791118800000", "statusRevision": "2026-10-04T13:00:00.000Z", "mirrorStored": true }
```

Historical status events lack the new notification fields; their `payload` is only `{orderId,status,updatedAt,source}`. Read the matching canonical row rather than inventing recipient/tracking information. Private Sheet notes remain in Firestore/audit and are excluded from notification payloads. HTTP2xx without a matching durable acknowledgement is failure. Keep retries safe using `order_id` upsert, immutable revision and `eventId` dedup. Do not acknowledge before the Sheet write or make a WhatsApp timeout cause another successful confirmation send.

## Inbound Google Sheets → n8n → backend

Endpoint **POST `/api/integrations/n8n/order-update`**. JSON content type, authentication **`X-AllBarka-Integration-Secret: <N8N_INTEGRATION_SECRET>`** (not the outbound secret, and not an `N8N_INTEGRATION_SECRET` header name). Authentication is constant-time, runs before database access, and never accepts customer/admin bearer tokens as integration authorization. Payload whitelist:

```json
{
  "orderId": "AB-20261004-ABC123", "status": "DISPATCHED",
  "trackingNumber": "COURIER-123", "estimatedDelivery": "2026-10-08",
  "notes": "Team packing note", "updatedAt": "2026-10-04T14:00:00.000Z",
  "eventId": "sheet:order-update-example-0001"
}
```

Required: `orderId`, `status`, `updatedAt`. Optional: `eventId`, `trackingNumber`, `estimatedDelivery`, `notes`. `updatedAt` must be ISO8601 with timezone and no more than5minutes ahead; it identifies the **original edit**, so retries must preserve it. Missing `eventId` is deterministically derived from orderId+normalized edit time. Event IDs contain8–120 letters/digits/colon/underscore/hyphen. Tracking≤120chars; notes≤1000chars. Omitted fulfillment fields preserve previous values; empty tracking clears it; `estimatedDelivery:null`/empty clears ETA. ETA accepts real `YYYY-MM-DD` or a timezone-bearing ISO timestamp. Invalid/private/money/loyalty fields return400.

| Exact input / stored status | English timeline label |
|---|---|
| `ORDER_RECEIVED` | `ORDER_RECEIVED` |
| `CONFIRMED` | `CONFIRMED` |
| `PREPARING` | `PREPARING` |
| `DISPATCHED` | `DISPATCHED` |
| `OUT_FOR_DELIVERY` | `OUT_FOR_DELIVERY` |
| `DELIVERED` | `DELIVERED` |
| `CANCELLED` | `CANCELLED` (separate terminal notice) |

Only these seven exact uppercase values are accepted by both inbound routes and the Sheet dropdown; lowercase, abbreviations, `NEW` and `PACKED` are rejected. Historical saved `NEW`/`PACKED` records are read as `ORDER_RECEIVED`/`PREPARING`, without bulk rewriting old records. Existing `QUOTE_REQUESTED` is a separate nonpayable inquiry state, never a fulfillment dropdown option; quotes cannot enter fulfillment without a separately priced order. Simple Sheets commands cannot reopen cancelled/delivered orders; a reviewed Admin correction can still use existing optimistic concurrency.

Response200: `{ok:true,orderId,eventId,status,updatedAt,statusRevision,duplicate:false}`. `updatedAt` is source edit time; `statusRevision` is the resulting backend revision. **Same incoming status and tracking number as Firestore returns200 with `duplicate:true,ignored:true` and zero writes, audits, outbox events or loyalty effects**, even if the event ID, timestamp, ETA or notes differ. Omitted tracking means preserve the saved tracking number. Thus an ETA/notes-only edit is ignored under the owner's rule; submit those fields with a real status or tracking change. Unknown order IDs (including WhatsApp-only Sheet orders) likewise return200 with `ignored:true` and no writes; `statusRevision:null` signals there is no canonical order. Never mirror that response as an order snapshot.

Other same-event/payload retries return their original result with `duplicate:true`. Older-than-last-integration or older-than-current-Admin edits are ignored. Rebound event IDs or changed payload at the same timestamp return409 when they are not already semantic no-ops. Missing/bad credentials return401; unconfigured secret/Firestore503. Changed status or tracking creates one canonical update and one status notification. Do not mirror an old duplicate result over a newer Sheet revision.

Existing `/api/integrations/n8n/order-status` is preserved for `n8n/OrderControl.gs` and `n8n/allbarka-status-sync.json`: its existing expected-status/revision command contract is unchanged. **Run one inbound command workflow for each team editing mode, never both for the same edit.**

## Required `Order_Control` columns

Keep current columns and protections; append missing columns rather than replacing the Sheet. Store IDs, telephone numbers and ISO revisions as plain text; use Google Sheets RAW input (or prefix formula-like text) so names/notes cannot execute formulas.

| Columns | Writer / role |
|---|---|
| `order_id`, `source`, `created_at`, `customer_name`, `customer_phone`, `address`, `city` | Backend snapshot via n8n; `source=website` |
| `items_summary`, `subtotal`, `discount`, `shipping`, `total`, `payment_method` | Backend snapshot only; no Sheet price edits fed to API |
| `status`, `status_revision`, `canonical_status_updated_at` | Backend canonical uppercase status and revision; protect from team edits |
| `tracking_number`, `estimated_delivery`, `loyalty_points_earned` | Backend status-event snapshot; protect from team edits |
| `promo_code`, `promo_type`, `free_shipping`, `free_giftwrap`, `free_gift` | Backend benefits; include readable `PROMO:<code>: <effect>` in `items_summary` for packing |
| `requested_status`, `requested_tracking_number`, `requested_estimated_delivery`, `request_reason` | Team command columns; exact seven uppercase status dropdown values above |
| `request_id`, `request_created_at` | One stable edit ID and ISO source timestamp; set once when a complete command is submitted, preserve for retries |
| `last_applied_request_id`, `sync_error` | n8n delivery acknowledgement/error only |
| `request_base_status`, `request_base_revision` | Existing legacy Apps Script workflow needs these; keep them for that workflow |

## Exact n8n setup steps (pending owner review/publish)

1. In Firebase ensure the real public domain is authorized for email/Google auth; install the `orderEvents` index in the actual database. Link existing Railway shared variables without overwriting secrets. Configure private Admin/Meta credentials only in their secret stores.
2. Create n8n Header Auth credentials: outbound webhook name `X-AllBarka-Webhook-Secret`, value matching `N8N_WEBHOOK_SECRET`; inbound HTTP name `X-AllBarka-Integration-Secret`, value matching `N8N_INTEGRATION_SECRET`. Connect Google Sheets credentials with access to the existing Sheet. Use a distinct Header Auth credential for a dedicated status receiver if configured.
3. **Outbound workflow:** Webhook POST with Header Auth and Response Node mode → Switch on `$json.body.type` (`order_created` / `order_status_updated`) → read Sheet by `order_id` → upsert creation row or apply the immutable newer status snapshot → Respond to Webhook with the exact respective acknowledgement above. Preserve `source:website`, promo notes and zero quote totals. Keep the existing revision guard in `OrderControl.gs`/status workflow so older outbound status events cannot overwrite newer snapshots. Acknowledge an already-mirrored revision as persisted without rewriting it. Serialize the Sheet writer as supported by your n8n installation; direct concurrent unguarded Google Sheets update nodes cannot guarantee revision order.
4. Use the **backend WhatsApp job pump** below on its independent schedule. An order webhook may wake this pump, but must not send directly to the payload phone or gate the durable Sheet acknowledgement on Meta delivery. The backend creates confirmation/status jobs atomically; n8n just claims/authorizes/transports them. This avoids duplicated confirmations on Sheet/webhook retry.
5. **Inbound workflow:** Google Sheets Trigger, row updated, poll every1minute → select rows with complete `request_id`, `request_created_at`, `requested_status` → Edit Fields/transform copying only `orderId=order_id`, `status=requested_status`, `trackingNumber=requested_tracking_number`, `estimatedDelivery=requested_estimated_delivery`, `notes=request_reason`, `updatedAt=request_created_at`, `eventId=request_id` → HTTP Request POST `https://<actual-storefront>/api/integrations/n8n/order-update`, JSON, integration Header Auth credential. Omit blank optional fields to preserve existing values; send null explicitly to clear ETA. Use original request ID/timestamp on retries. No n8n points, discount or shipping code.
6. On successful nonduplicate HTTP result, write only acknowledgement columns; the backend outbound event writes canonical status/tracking/points. On `duplicate` or `ignored` mark only the command acknowledgement and do no canonical mirror write; unknown WhatsApp-only rows must retain their existing status. On409 store `sync_error` for owner resolution; do not regenerate timestamps silently. On401/503 investigate configuration; retain the command for deliberate retry. Backend dedup handles repeated trigger events and prevents outbound mirror writes creating a second customer notification.
7. Team submission: populate the complete command row, then assign a new `sheet:<UUID>` `request_id` and a literal UTC ISO `request_created_at` once. An Apps Script installable edit trigger can stamp these transport identifiers; it must not generate a new ID on n8n programmatic mirror/ack writes. The existing `OrderControl.gs` stamps/protects the **legacy** command contract; do not treat it as the new fulfillment-field mapper without adapting the trigger and requested fulfillment columns. The updated legacy workflow remains supported; use the new HTTP contract for fulfillment fields.
8. Review the legacy inactive JSON under `n8n/` before reuse: the website receiver previously handled creation only. A shared endpoint must explicitly support the new status type/ack; importing that old JSON unmodified is insufficient. Import/update, select credentials, then publish manually. After approved deployment use disposable orders to test creation, same-request retry, PREPARING→DISPATCHED tracking, DELIVERED points, and rejected stale edits. Confirm one row/one points award and worker `DELIVERED` heartbeat. This document does not claim those live steps have happened.

## WhatsApp transport and placeholders

Keep existing signed Meta parent → `/api/integrations/n8n/whatsapp/inbound` raw body/signature forwarding. Inbound/receipt/window routes, normalized phone matching, STOP/START and provider delivery evidence remain backend-owned. No saved order ID alone grants receipt access.

Every15–30seconds: Schedule → POST `/whatsapp/notifications/claim` with `{source:"meta_parent"}` → when a job is returned POST `/whatsapp/notifications/authorize` with `{source:"meta_parent",jobId,leaseToken}` → send exactly the authorized `{to,text}` via the existing Meta credential before `sendBeforeMs` → POST `/whatsapp/notifications/result` with `{source:"meta_parent",jobId,leaseToken,outcome:"ACCEPTED",providerMessageId}`. All paths are prefixed `/api/integrations/n8n` and use the integration Header Auth. A definitive provider rejection is `REJECTED`; uncertain timeout is `UNKNOWN` and needs reconciliation, not blind resending. Never use `continue on fail` to manufacture a success acknowledgement. Provider `ACCEPTED` is not customer `DELIVERED`; signed Meta evidence determines delivery.

Current implementation sends backend-authorized **free-form service text inside the verified24-hour customer window** only, to the phone matching the saved order. Closed windows are held; customer re-contact yields the latest receipt/status instead of old queued spam. `renderWhatsAppSavedReceipt` supplies saved line items, totals, status, tracking, ETA and earned points; use the returned `text` rather than recomputing it in n8n. No new template-send authorization outside that window is enabled by this PR.

If the owner later enables approved utility templates, prepare these in Meta (approval and a separate backend-authorized template mode are **pending**, not live):

| Proposed template | Ordered placeholders |
|---|---|
| `allbarka_order_confirmation` | `{{1}} customerName`, `{{2}} orderId`, `{{3}} itemsSummary`, `{{4}} payableTotalPKR`, `{{5}} paymentMethod` |
| `allbarka_order_status_update` | `{{1}} customerName`, `{{2}} orderId`, `{{3}} status`, `{{4}} trackingNumber`, `{{5}} estimatedDelivery`, `{{6}} loyaltyPointsEarned` |

Tracking URLs use `/success?orderId=<savedId>`; authenticated owners recover via Firebase. Guests need their privately retained claim token in the request header/session; never put it in WhatsApp links, Sheet rows or event payloads. Outside-window marketing or unsupported template sends are not added.

## Loyalty and customer tracking

Only orders already in Firestore with `source:"website"` can earn points when they become `DELIVERED`. Unknown Sheet/WhatsApp orders and nonwebsite Firestore orders earn nothing. First delivery transaction calculates `floor(order.totals.total / 100) * LOYALTY_POINTS_PER_100_RUPEES` using the saved payable total (including shipping/wrapping after discount). Existing wholesale/quote exclusions remain0. It reads `pointsLedger/{orderId}` and any historical account `ORDER_<orderId>` marker **before writes**, then atomically commits order status, audit, outbox, WhatsApp job, points ledger and account balance. `pointsLedger` stores `{customerId,orderId,points,type:"EARNED",timestamp,credited}` with ISO timestamp. Historical awards are not credited again. Cancelled previously delivered orders retain the award marker and record reversal; reopening does not award twice.

Guest delivery holds a single award at `customerId:guest:<orderId>` with `credited:false`. A verified Firebase account claiming the order with its private unexpired token transfers/credits the held award exactly once in the claim transaction. A reversed guest award is not credited. It is never matched to a guessed phone/account. Existing `users/{uid}/loyaltyTransactions` and `/api/loyalty/profile` remain compatible.

`GET /api/orders/:orderId` requires owner Firebase authorization, verified admin claim, or the existing private guest header. It returns sanitized canonical `status`, `updatedAt`, `trackingNumber`, `estimatedDelivery`, `loyaltyPointsEarned`, `loyaltyPointsTotal`; private integration notes/request hashes/claim hashes are stripped. Account balance comes from the canonical `users/{uid}.loyaltyPoints`; a guest has0 account balance until claimed. Responses are private/no-store. `/success` immediately refreshes this API, then every30seconds while visible, with focus/visibility refresh and no overlapping requests. ORDER_RECEIVED→CONFIRMED→PREPARING→DISPATCHED→OUT_FOR_DELIVERY→DELIVERED is the six-stage timeline; cancellation/quote states do not imply fulfillment. A connection failure preserves the saved receipt and shows that live updates are unavailable. Thus a **committed backend update** is normally visible within30seconds; a1minute Sheets trigger adds its own polling delay.

## Verification and remaining live setup

Run `npm run typecheck` and `npm test` (frontend/fullstack build, every Node test family, backend tests, catalog asset audit, real production-bundle checks). Tests cover protected HTTP input, parallel/replayed updates, stale/conflicting timestamps, immutable status events, guest claims, once-only/reversed awards, configured rate, retry exhaustion/failed marking, structured/redacted SDK/HTTP diagnostics, timer startup/shutdown, and no-store receipt refresh. Offline fixtures do not prove live IAM/index/Meta credentials.

Verified on4October2026: TypeScript/build/hooks lint passed;478/478 Node tests across44 families,21 legacy backend checks,47 production-bundle HTTP checks. Asset audit:89 products/107 references/103 files,57 single-image placeholders,0 missing or retired files; no catalog/media changes. Twelve local browser cases covered mobile/desktop, all three languages and both themes, including live receipt refresh and timeline bounds. Unknown IDs, identical status/tracking, nonwebsite zero awards and already-delivered tracking-only zero new awards are explicit regression cases.

Remaining owner steps: review/merge this PR when ready; configure/publish the n8n shared receiver + inbound bridge + existing WhatsApp pump; verify actual database index and Meta parent/private credentials; deploy by the existing Railway process only when authorized; inspect new detailed worker logs and `/api/health`; run disposable end-to-end tests. No secrets, service configuration, n8n publication, production data, or deployment were changed in this task.
