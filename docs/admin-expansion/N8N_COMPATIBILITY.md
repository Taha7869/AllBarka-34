# Stage 6 canonical order handoff

Date: 25 October 2026 (Asia/Karachi). Inspected feature parent: `95ae816d34f52aed45e70caff9ac7242913824a0`. This continues the original Stage 6 compatibility gate. Stages 1–5 and interaction P0–P3 remain implemented.

## Finding and correction

The previous checkpoint verified catalog/order pricing for historical packaging labels, but had not exercised those receipts through the n8n projection. Two original `bid-box-umrah-tabarruk` selections exceed the sender and bundled receiver's 50-character wire bound:

| Original selection | Length |
| --- | --- |
| Filled Standard (Irani Dates, Badam, Kaju & Kishmish) | 53 |
| Filled Royal (Jumbo Panjgur Dates, Iranian Pista, Mammra Badam & Honey Nuts) | 76 |

A new connected test reproduced the first order event becoming terminal FAILED before dispatch with CANONICAL_ORDER_INVALID. The sender and inactive workflow import now allow these exact selections for the original product ID without truncating or renaming them. The sender reuses the catalog's existing exact-identity allowlist; the standalone receiver includes only the two above-normal-bound strings. All other wire selections retain the existing 50-character limit. The new optional commerce editor retains its separate 40-character label limit. Arbitrary long labels, wrong product identities and altered historical labels still fail.

No price, total, shipping calculation, packaging MOQ/preparation, cart/receipt ID, webhook URL, authentication contract, Sheet column, retry policy or live workflow is changed. The 17-node import remains inactive, with credential/resource placeholders unchanged. Only `Validate Website Order` code changes in that JSON. Existing receipts and outbox documents are never migrated or requeued by this correction.

## Connected local acceptance

`tests/stage6-order-handoff.test.ts` joins the actual catalog administration, quote, transaction, outbox worker, order projection, bounded transport and checked-in receiver validation/classification/acknowledgement code:

- All six original labels above 40 characters across four packaging products retain distinct merchant-edited prices, original IDs/labels, canonical quote totals and persisted receipts through mirror delivery. Both labels above 50 now reach DELIVERED locally.
- New admin-created mg and liquid products support custom selections through persisted receipts and mirror payloads. Browser-submitted prices/weights cannot override canonical values; existing shipping rounding and ALLBARKA10 remain intact.
- An intervening rate edit rejects a fresh attempt using the stale total without order/intent/event writes. Replaying an already accepted idempotency key returns its original receipt despite changed catalog rates or browser prices; dispatch uses the saved receipt.
- A deliberately mismatched acknowledgement schedules a retry. The same durable event/order payload then receives duplicate-mirror confirmation without a second order or row. The first response cannot claim delivery.
- Wrong product IDs, changed/unbounded long labels and control-character additions fail the sender and receiver. Private claim/admin/supplier data remains outside the wire projection.

Persistence and mirror rows are memory fixtures. HTTP is loopback only; the production HTTPS configuration check remains intact via an explicit test transport adapter. The test receiver verifies emitted header/HMAC values and executes the trusted checked-in Code-node bodies. The actual n8n import authenticates TLS plus Header Auth and **does not independently verify HMAC**; no new deployed HMAC behavior is claimed. Actual Google Sheets, Firebase, the n8n engine and customer messaging are not contacted. Fake configuration exists only during isolated order creation and is restored in `finally`; no application environment file or real key changes.

## Release dependency and next work

These are future release prerequisites, not permission to publish now:

1. Obtain the authorized private merchant export/review already listed in `STAGE6_PROGRESS.md`; public unavailability cannot identify the underlying saved-record problem.
2. In the separately authorized integration environment, back up the actual current receiver and compare its identity, nodes and credentials. Apply only the reviewed compatible validator change to the intended receiver; retain existing workflow/resource selections. Rehearse the old ordinary labels and the two exact long labels without invoking customer notifications.
3. Verify the compatible receiver **before enabling the feature application's long-label order path**. New sender plus old 50-character receiver would still reject those two labels. An updated receiver continues accepting ordinary old sender payloads.
4. Verify real durable acceptance, mirror acknowledgement, retry/duplicate behavior, Auth/staff/content/Storage/rules and deployment-target smoke/rollback under separate authorization. Configuration flags and local memory persistence cannot close those gates.
5. Inspect any relevant historical terminal/disabled outbox events separately. Do not automatically replay them or reset their state; a dated owner-approved reconciliation must distinguish legitimate unsent events from already mirrored/customer-notified orders.

Stage 6 remains IN_PROGRESS. Release-critical external gates remain BLOCKED. Next models must not repeat completed UI/local tests or claim this inactive source change was published.
