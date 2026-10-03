# AB-02 WhatsApp workflow hardening

This is a tested routing core and a migration guide, **not** a live n8n workflow export. The actual AB-02 export, database engine/schema, and provider send nodes are needed to wire and verify it.

## Node order

1. Verify the inbound provider signature at the public webhook edge. Reject invalid requests and ignore delivery/status callbacks. Extract the provider's immutable message ID, type, sender, text, and timestamp. Never derive deduplication from text alone.
2. Write the message to a durable inbox with a **unique constraint on provider message ID**. If it already exists, acknowledge without sending another reply. Acknowledge the webhook as soon as the message is durably accepted; Ollama and WhatsApp sends run afterward. A node-local variable or n8n static data is not a concurrency-safe dedup store.
3. Serialize work **per normalized phone** using a durable queue or database lease. A fixed Wait node does not prevent races. Expired leases must be recoverable; failed jobs go to a retry/dead-letter path with alerting.
4. Normalize sender, detect text/media, and fetch session plus active `wa_products` rows from the database. Map the query to `{ message, products, session }` for `automation-core.mjs`. Product aliases and prices come from the database, not the router. If the product query fails, do not guess a price or confirm an order.
5. Route unsupported media to the text-only reply. For text, use `routeInbound` to apply a 30-minute state timeout, menu/cancel escape, fuzzy product matching, and order priority for mixed questions. Ambiguous or unmatched products require a clarifying question.
6. For FAQ, send only `compactHistory(history)` (last five messages, 500 characters each) and the current question to Ollama. Set a short timeout, branch on error, and use the user's language/script in the system prompt. Never invent prices, inventory, delivery promises, or personal medical advice.
7. For orders, **re-read catalog price and stock in the same database transaction** that reserves stock and creates the order. Lock the product rows, reject insufficient stock, and use the inbound message ID or stable order key as the order uniqueness key. The AI can suggest products but must not calculate the final bill.
8. Write the reply to a durable outbound table with a unique source message ID and send state. Retry only unsent/uncertain replies with reconciliation. Mark success only after the provider accepts the send. Duplicate inbound delivery must never create a second outbound row.
9. Update the session timestamp and a short conversation buffer. A 30-minute inactivity gap resets order state; a separate cleanup job deletes guest chat text after 24 hours. Retain only minimal order/audit data under the business retention policy. Configure n8n execution-data pruning separately so full payloads do not fill the EC2 disk.

## Database operations to implement against the actual schema

- Inbox: `INSERT ... ON CONFLICT(provider_message_id) DO NOTHING RETURNING ...` (Postgres example). A returned row means new work; no row means duplicate. Keep a small ID tombstone longer than the provider retry window, even when guest chat text is purged.
- Per-phone lease: atomic claim with owner and expiry, followed by a fresh session read. Never assume two n8n executions arrive in order. If the DB is not Postgres, use its equivalent unique insert and locking primitives.
- Order transaction: lock requested `wa_products` rows, check `active`, price, unit and available quantity; insert idempotent order; decrement or reserve stock; commit. A separately executed inventory query before an order insert is subject to a race.
- Outbound: unique `source_message_id`; store provider response ID and delivery state. Exact-once sending cannot be guaranteed if a worker crashes after provider acceptance but before recording it; reconcile uncertain sends instead of blindly retrying.
- Cleanup: delete guest transcript/session content older than 24 hours; clear stale leases; keep dedup IDs and confirmed orders according to their separate retention needs.

## Other launch risks

- The website currently has its own product catalog (`src/data/products.ts`) while the WhatsApp plan names `wa_products`. Pick one authoritative catalog or implement a verified sync, otherwise web and WhatsApp prices/stock can diverge.
- Protect the n8n webhook with signature/secret verification, restrict database credentials, and redact phone/address/message bodies from execution logs. The temporary home-PC tunnel is not a production dependency; fall back and alert when it fails.
- Distinguish WhatsApp's customer-service window/template rules, provider rate limits, and human handoff from the bot's internal FAQ/order state. Test provider errors and retries before accepting live orders.
- A guest AI trial keyed by network and browser fingerprint is not strong identity; shared networks can collide and people can evade it. Apply broader rate controls and monitoring.

## Minimum acceptance tests on the real workflow

Replay the same provider message ID twice; send two messages from one phone concurrently; send image/voice/sticker/status events; test typo `psita`, repeated letters `badaaam`, mixed FAQ plus order, cancel/menu from quantity state, and a 31-minute gap. Turn off the home PC, fail the product query, change stock between quote and checkout, and replay an outbound timeout. Verify exactly one order and at most one intended reply record, correct canonical price/stock, a customer-friendly fallback, and guest text purged after 24 hours.
