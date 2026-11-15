# n8n session runbook (do later, about 65 minutes)

One sitting fixes the website chat limit, the WhatsApp AI, and the order-status sync, then proves an order end to end. Owner clicks in n8n; Claude watches Railway logs and confirms each step.

## When

- **Before the catalogue goes live (plan phase 2) and before any ads.** Chat and order sync must work when customers arrive.
- **At a quiet hour:** after 10 PM PKT, when the day's dispatch is closed, or early morning before 8 AM. Never during a sale or Eid rush.
- **Both online:** owner at n8n and the Google Sheet; Claude in this chat to read Railway logs.

## Before you start (checklist)

- [ ] n8n login works; you can see the 5 workflows (website chat `allbarka-web-chat`, WhatsApp bot `allbarka-bot`, conversation engine, order mirror `allbarka-orders`, sheet-to-website every 1 minute).
- [ ] Railway login works (only to read `N8N_INTEGRATION_SECRET`; do not paste it in chat).
- [ ] Files from GitHub, branch `claude/celebrations-foundation-20261112`, folder `n8n/fixed-2026-11-15/`: `website-chat.json`, `whatsapp-conversation-engine.json`, `sheet-to-website-status.json`.
- [ ] Your phone with WhatsApp, for a test message and a test order.

## Steps

| # | Step | Time | Who | Done when |
| --- | --- | --- | --- | --- |
| 0 | **Backup.** In n8n open each of the 5 workflows → ⋯ → Download. Keep the files in one folder named with today's date. | 10 min | Owner | 5 JSON files saved |
| 1 | **Website chat.** Import `website-chat.json` (as new). Set credentials: webhook = "AllBarka Website Chat Auth"; **Website AI Brain** and **Website AI Brain Fallback** = the Groq credential. Deactivate the old website chat workflow, activate the new one (only one may own path `allbarka-web-chat`). | 15 min | Owner | New workflow active, old one inactive |
| 2 | **Test chat.** On allbarka.com send 6 messages in a row (e.g. salam, badam price, gift box for shaadi, ajwa, delivery, thanks). | 5 min | Owner | Claude sees six `AI_CHAT_DIAGNOSTIC status 200` in Railway logs |
| 3 | **WhatsApp AI.** Import `whatsapp-conversation-engine.json` as new. Select the Groq credential on **AI Brain Fallback**; check the other credentials (WhatsApp, Google Sheets, data tables) are still selected. Point the WhatsApp bot's "Run Conversation Engine" node to the new workflow, keep the old one inactive for rollback, activate. | 15 min | Owner | Bot replies to 3 WhatsApp messages in a row |
| 4 | **Sheet to website.** Import `sheet-to-website-status.json` over the "every 1 minute" workflow (it now posts to `/order-status`, the route the website accepts; the old one posted a body the website rejects even with the right secret). Then Credentials → "Header Auth account 2": Name `X-AllBarka-Integration-Secret`, Value = Railway `N8N_INTEGRATION_SECRET`. Select that credential on **Send To Backend** and the Google credential on the sheet nodes. Activate. | 10 min | Owner | Claude sees no `order-update → 401` for 2 minutes |
| 5 | **End-to-end order.** Place a small cash-on-delivery order on allbarka.com with your own number. | 5 min | Owner | Order success page shows an `AB-` order id |
| 6 | **Order mirror.** Open the "AllBarka Orders" sheet, tab `Order_Control`. | 2 min | Owner | A row with that order id appears |
| 7 | **Status back to website.** In that row set `requested_status` to `confirmed` (any case; allowed: order received, confirmed, preparing, dispatched, out for delivery, delivered, cancelled), a new `request_id` (any text) and optionally `request_reason`. Wait 1 to 2 minutes. | 3 min | Owner | `last_applied_request_id` fills in and `sync_error` stays empty; the order shows Confirmed in your account |
| 8 | **Close the test.** Set the test order to `cancelled` the same way. | 2 min | Owner | Status cancelled; no courier booked |

## If something breaks (rollback)

- Chat broken: deactivate the new website chat workflow, activate the old one from step 0. The site keeps working; chat shows "busy" until fixed.
- WhatsApp broken: point "Run Conversation Engine" back to the old workflow and activate it.
- 401 still there: the header name or value has a typo; re-enter both (no spaces).
- `sync_error` shows `INVALID_REVISION` or `STATUS_CONFLICT`: the row's `status` or `canonical_status_updated_at` is out of date; wait for the next order-mirror update or copy the current values, then set a new `request_id`.
- Tracking numbers and delivery dates are no longer sent from the sheet (the status route takes status only); enter them for the customer in the admin.
- Never delete an old workflow on the same day; delete after a week of normal running.

## After the session

- Claude adds a line to `docs/LESSONS.md` and ticks phase 1 in the plan doc.
- `AI_GUEST_DAILY_LIMIT` stays 5 until Cloudflare is active; then raise it to 20.
- If chat still stops at busy hours: Groq paid Developer tier (owner billing decision).
