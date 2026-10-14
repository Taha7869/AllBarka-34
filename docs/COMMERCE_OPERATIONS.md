# Commerce operations: inventory, rewards, admin reporting and notifications

Part 3 is stacked on the Part 2 Firestore pricing branch. Apply it after the earlier changes. This document describes implementation and release preparation; none of its migration or deployment commands were executed against production during development.

## Inventory contract

`catalogInventory/{canonicalProductOrBoxId}` stores `{mode, available, revision, updatedAt, updatedBy}`. Missing records mean `mode: unlimited, available: 9999`. Unlimited stock is never decremented. The 89 existing product and three hamper-box identities remain the source of truth; no new product-management system or inventory dependency was introduced.

Tracking is opt-in from the existing admin catalogue. Quantities are whole grams for weighed food, millilitres for oils, and individual packs for bundles/fixed packs and hamper boxes. The unit comes from reviewed product metadata and cannot be edited by a request or document. Grams/ml/pack are distinct inventory units. The existing delivery tariff still uses the owner's separate 1ml = 1g billing convention for oils.

Enter **available to sell**, excluding outstanding orders. Enabling tracking does not retroactively reserve old orders. Disabling tracking stops enforcement and quantity restoration for that target; it does not invent a physical stock count.

Every checkout transaction reads current price, voucher and required stock before any writes. Repeated cart lines, actual custom portions, 200g hamper selections, box counts and optional 50g rewards are combined by target. Tracked stock and the order's `inventoryReservation` are saved atomically with the order, checkout intent, reward consumption, coupon counters and outbox. Competing orders contend on the same inventory documents. A changed quote or failed commit does not reserve stock or use a voucher. A saved idempotent receipt is returned before repricing/reserving again.

`DELIVERED` finalizes reservations. Cancellation before delivery releases each reservation once. Cancellation after delivery does not automatically return sold goods to inventory. Damaged/returned goods require an explicit admin stock adjustment. A cancelled order with released stock or recovered rewards cannot be reopened; place a newly verified checkout.

Admin GET/POST `/api/admin/inventory/:id` require verified admin claims. POST accepts only `expectedVersion`, `inventory: {mode, available}` and a 3–300 character reason. Version digests cover quantity, mode and revision; order reservations and Console edits therefore invalidate stale editors. Every admin adjustment and its audit share a transaction. `inventoryAudits/{id}/entries/{auditId}` is server-only.

One bounded server listener caches inventory per process. Public catalogue responses publish effective active/unavailable flags, never private stock counts or adjustment metadata. Quotes check quantity against the cache; final orders reread stock transactionally. Invalid stock blocks affected availability until the listener receives valid data. Listener errors can retry with a new subscription. Quote requests neither reserve inventory nor spend rewards.

## Fulfilled patron rewards

Point costs, minimums and expiry durations come from the existing four reward definitions:

| Reward | Points | Discounted merchandise minimum | Voucher validity | Fulfilment |
| --- | ---: | ---: | ---: | --- |
| `free_shipping` | 300 | Rs2,000 | 30 days | Waive a payable Lahore standard-delivery fee |
| `cashew_sample` | 500 | Rs1,500 | 60 days | Include one free 50g kaju sample |
| `pista_sample` | 750 | Rs1,500 | 60 days | Include one free 50g pista sample |
| `gift_packaging` | 1,200 | Rs0 | 90 days | Include premium gift packaging and waive the Rs250 wrap fee |

Redemption is an authenticated server transaction: it verifies an integer balance, creates a voucher/ledger entry, and debits once. Clients cannot edit loyalty balances or mint rewards. A stable `requestId` handles uncertain responses; an exact retry never charges twice. New redemption requests reuse an already-active voucher of the same kind, including legacy vouchers. Sample availability is checked before minting; this does not reserve stock until checkout. Recovery of a previously consumed voucher can coexist with another paid-for active voucher.

The profile API returns the caller's ledger and up to five soonest-expiring active vouchers per supported kind. Unknown future reward kinds remain unavailable. The lounge explicitly redeems points; checkout explicitly chooses one voucher. Profile/read failures do not become zero balances.

Quotes and orders validate ownership, voucher status, finite expiry, kind, retail eligibility, discounted merchandise minimum and current sample stock. A benefit already included for free does not consume a redundant voucher. Shipping rewards exclude express/same-day and national delivery. **Only ZAFRANI can waive national shipping.** Samples add 50g to national delivery weight; the existing fractional tariff applies (1,050g costs Rs263). Premium packaging sets the canonical gift instruction even when the customer did not separately tick gift wrap.

`rewardApplication` saves the concrete benefit with `APPLIED`, `FULFILLED`, `RESTORED` or `REFUNDED` status. Free samples are separate packing instructions, not forged zero-price merchandise lines. Receipts, admin packing print, CSV, saved-order WhatsApp text and n8n projection preserve the benefit. n8n receives an allowlisted fulfilment note, excluding voucher IDs, redemption costs, balances and expiry metadata.

An undelivered cancellation restores an unexpired consumed voucher. If it expired while attached to that order, cancellation refunds its original point cost exactly once and marks the voucher expired. Delivery finalizes the benefit; later cancellation does not mint it again. Existing delivered-order loyalty earning/reversal remains in the same canonical status transaction.

## Admin querying and migration

Order lists query Firestore filters and a stable `(createdAtMs DESC, document ID DESC)` cursor; page size is at most 50, plus one look-ahead document. Cursors bind the filter/limit and retain a creation-time window for 24 hours. New arrivals appear after a first-page refresh. Status/payment changes remain current, so this is not a database-wide point-in-time snapshot.

Counts and sums use native index aggregations, cached for 20 seconds per database/filter/window with bounded cache entries. Canonical creation/status/payment paths invalidate this process's cache. Other instances refresh within that TTL. There is no 5,000-order reporting cutoff; costs and latency still scale with matching index entries. Extremely large reporting workloads should move to materialized counters or an analytics warehouse after measured load testing.

Search is normalized **prefix** search (2–32 characters) on order ID, customer name/word, phone and city. It is not arbitrary substring/address/item search. New orders save at most 256 derived prefixes. Existing orders need the resumable search backfill; exact `AB-...` ID lookup still works before backfill. Legacy `NEW` and `PACKED` map to canonical statuses. Lists require canonical `createdAtMs` and known statuses; malformed legacy records need a separate reviewed repair.

```bash
npm run orders:backfill-search -- --help
npm run orders:backfill-search -- --max-pages 10
# After reviewing target database and dry-run counts, explicitly execute:
npm run orders:backfill-search -- --execute --max-pages 10
# Continue a bounded run using its returned cursor:
npm run orders:backfill-search -- --execute --max-pages 10 --after-id ORDER_ID
```

The default reads at most 2,000 orders (200/page). Execution rereads each current order and updates only `searchPrefixes`/`searchVersion`; amounts, staff notes, statuses and order revisions remain unchanged. Repeated execution is idempotent. Use explicit project/server credentials or an emulator and `FIRESTORE_DATABASE_ID`; no database target is guessed.

`GET /api/admin/orders/export.csv` streams all matching rows in 500-row cursor chunks with backpressure, private/no-store headers and formula-safe cells. Browser downloads require bearer auth, cancel on navigation/user action, cap at 50 MiB and time out after three minutes. Provider errors after streaming starts destroy the response so a partial CSV cannot be presented as complete. The older JSON export endpoint now returns cursor chunks. Audit detail returns the latest 100 entries with an explicit truncation notice.

## Notification delivery

The durable outbox wakes after canonical order/status commits and watches the earliest pending creation/status event per enabled receiver. The 60-second poll remains a fallback and idle cycles write no lease documents. Each fenced global lease drains at most 20 ready events by default, sequentially, renewing between transports. Ready backlog gets another immediate cycle. A failed transport schedules only that event's exponential backoff; other customers continue.

A status event waits while its order-creation event is pending/leased, preserving creation-before-status acknowledgement. Existing receiver revision/idempotency checks still protect uncertain retries. Shutdown stops accepting API requests, drains them and the active worker transport, closes listeners, then terminates Firestore.

The bundled **inactive** n8n template now accepts current eight-hex order IDs and legacy six-hex IDs, rejects seven-hex IDs, and retains reward packing instructions. It has not been installed in the live workflow. Header credentials, Sheets IDs and live resources must be configured by the operator; no external customer message was sent during tests. Historical disabled/failed events are not automatically replayed. Use the existing read-only `npm run outbox:report` before any separately approved replay or workflow change.

## Release verification

1. Review/merge the stacked Part 1, 2 and 3 changes in order after the agreed approval gates.
2. Build Firestore indexes from `firestore.indexes.json` in the actual named database and wait for readiness; review/publish server-only rules. Verify every combination of admin filters/search and sum aggregation against that database. The manifest contains row/count and total-sum variants; offline fixtures cannot prove Cloud index readiness.
3. Complete Part 2 pricing migration and the Part 3 search dry run/backfill. Inventory can remain entirely unlimited; count available quantities before enabling tracked targets.
4. In staging, verify signed-in customer/admin auth, last-stock contention, checkout retries, voucher redemption, cancellation recovery, exports and notification acknowledgement with the actual provider/database. Exercise network failures and quota limits. The development suite uses a serializable Firestore fixture, not an emulator or live contention/load benchmark.
5. Install the reviewed n8n template changes only after separate release authorization. Verify a controlled staging order's matching acknowledgement and status mirror without replaying historical messages.
6. Deploy the reviewed application only after release approval, then observe queue failures, index/aggregate latency and catalog availability. Keep all required indexes during rollback; never roll back to an app that ignores reservations after tracked stock/rewards are enabled.

Offline checks do not establish a production throughput SLA, deliverability, live index acceptance or real browser visual QA. No local browser executable was available for this stage; visual/premium mobile and RTL review belongs to Part 4.
