# n8n fixes, 25 November 2026 (live)

Both files are imported and published in n8n (owner, 25 Nov). Previous exports were downloaded by the owner as rollback.

## `sheet-to-website-status-v3.json` — "AllBarka — Sheet to Website Status v3"
Replaces the 15 Nov file (which read `order_id` from the Claim node's output and sent an empty order id → `INVALID_ORDER_ID`).
- Team only picks `requested_status` (column AJ, dropdown or typed; aliases RECEIVED/NEW/PACKED). `request_id` is generated (`auto-<row>-<time>`).
- Body is built in "Pending Requests?" and sent from there; HTTP node uses full response + never-error.
- Missing/invalid `canonical_status_updated_at` → sends sentinel revision, website answers 409 with canonical status/revision, the row is refreshed and retried next minute only if the sheet status matched (otherwise the request is closed with a message — no blind overwrite).
- Success: writes canonical status/revision, `last_applied_request_id`, clears the request columns. Permanent errors close the request with a Roman Urdu `sync_error`; 401/429/5xx/network retry next minute. Max 5 rows per run.
- Verified live: order AB-20261125-3483B8 → CONFIRMED (bootstrap + retry) and → PREPARING.

## `website-chat-v2.json` — "AllBarka Web Chat — 3-model fallback (25 Nov)"
Path `allbarka-web-chat`. On Groq 429: gpt-oss-120b → gpt-oss-20b → qwen/qwen3.8-27b (reasoning_effort none, no include_reasoning). Reply budget 700 tokens. Verified live: 4 messages in 30 s, all 200.

## Railway (25 Nov, owner)
`N8N_STATUS_WEBHOOK_URL` → `/webhook/allbarka-orders` ("AllBarka — Order Mirror (FIXED)", which handles `order_status_updated`), `N8N_STATUS_WEBHOOK_SECRET` → same value as `N8N_WEBHOOK_SECRET`. Before this, status events went to ALL BARKA MAIN (`allbarka-website-orders`), which accepts only ORDER_CREATED and answered 400. Verified: STATUS_PREPARING delivered on attempt 1.

## Known
- New order rows are inserted by n8n without the AJ dropdown; typing the status works.
- WhatsApp tracking reply shows the variant as "Quantity" for website orders (Prepare Tracking Reply parses the first parentheses).
