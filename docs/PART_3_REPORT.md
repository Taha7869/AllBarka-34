# AllBarka Part 3 — Commerce operations

Implementation and offline verification complete. Prepared for a draft PR stacked on Part 2. Production remains on the original launch commit; Firebase migrations, index/rule publication, live workflow changes and deployment were not executed.

| Part | Scope | State |
| --- | --- | --- |
| 1 | Privacy and launch reliability | Report approved; draft PR #11 |
| 2 | Firestore prices and admin price editor | Report approved; draft PR #12 |
| 3 | Inventory, complete rewards, admin scale and notification delays | Complete for review |
| 4 | Premium UX, mobile/RTL/accessibility, performance, SEO and analytics | Awaiting user approval |

## Delivered

- Default stock remains **9999/unlimited** across all 89 products and three hamper boxes. Admins can opt individual targets into tracked grams, ml or packs, with reasons, version conflicts and atomic audits.
- Checkout atomically reserves tracked stock and consumes the selected reward. Concurrent last-stock/voucher tests accept one competing order. Failed transactions and idempotent retries do not debit twice.
- Undelivered cancellation restores reserved stock and unexpired rewards once; expired attached rewards refund their original points. Delivered benefits finalize and sold goods are not automatically restocked.
- All four existing rewards now have an authenticated redemption and concrete checkout benefit: Lahore standard shipping, one free 50g kaju/pista sample, or premium gift packaging. Existing point costs, minimums and expiry durations are retained. Samples count toward national shipping and tracked stock; only ZAFRANI waives national delivery.
- Receipts, admin packing/CSV, saved-order WhatsApp text and allowlisted n8n payloads include fulfilment instructions. Private redemption metadata stays out of the integration payload.
- Admin pages use indexed cursors with page-size-plus-one reads; counts/sums use native aggregations with a 20-second cache. Prefix search has a bounded, dry-run-first, resumable migration for old orders. Exact order IDs remain searchable before migration.
- Full CSV exports stream 500-row chunks; cancellation, incomplete-body rejection, formula escaping, a 50 MiB browser cap and a three-minute deadline are covered.
- Notification commits wake a bounded 20-event worker batch; pending-event listeners, lease renewal and isolated backoffs remove the previous one-event-per-poll bottleneck. Status dispatch waits for the creation acknowledgement. Idle cycles retain zero lease writes.
- The inactive n8n import accepts current eight-hex IDs and legacy six-hex IDs and preserves reward packing notes. It has not been applied remotely.
- New stock/reward/error copy supports English, Urdu and Arabic. No npm dependency was added.

## Verification

| Check | Result |
| --- | --- |
| Complete test suite | **550/550 passed** across 50 test files |
| Backend checks | **21/21 passed** |
| Offline production checks | **48/48 passed** |
| Catalogue assets | 89 products, 107 references, 103 unique files; none missing |
| Build, TypeScript, hooks lint, diff whitespace | Passed |
| Large admin fixture | 11,005 orders; a 20-row page reads 21 documents with full aggregate totals |
| Export fixture | 1,005 rows streamed without a 500/5,000-record cutoff |
| Concurrency and recovery | Last-stock and same-voucher contention; retries; cancellation/audit rollback; expired-point refund |
| Notification fixture | 20-event drain, immediate wake/listener, independent backoff, slow-batch lease renewal, shutdown and creation/status ordering |

These are offline fixtures and local endpoint checks, not a live Firebase contention/load benchmark or n8n delivery proof. Cloud index readiness and actual browser visual QA remain unverified; no browser executable was available locally.

## Release prerequisites

See [COMMERCE_OPERATIONS.md](COMMERCE_OPERATIONS.md) for the schema, stock units, reward rules, recovery behavior, database/index verification, search migration and staged rollout. Review indexes in the configured named database before release. Enabling tracked inventory requires a count that excludes outstanding orders; older orders are not retroactively reserved. New prefix search does not support arbitrary substring/address/item matching. Reporting remains index-scan based, with a 20-second freshness window.

This checkpoint is for **Part 3 review**. Part 4, merges and production release require the next agreed authorization.
