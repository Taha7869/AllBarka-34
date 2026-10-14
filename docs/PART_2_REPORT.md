# AllBarka Part 2 — Firestore pricing

Status: implementation and offline checks complete; prepared as a separate review branch stacked on Part 1. Production deployment, Firebase writes/rule publication and remote workflow changes are outside this completed implementation checkpoint.

## Four-part progress

| Part | Scope | State |
| --- | --- | --- |
| 1 | Privacy, customer account reliability, media and launch quality baseline | Report approved; PR #11 remains unmerged |
| 2 | Validated Firestore prices, admin editor, storefront/cart/checkout/hamper/AI pricing | Complete for review |
| 3 | Notification throughput, admin pagination/reporting, inventory controls and complete reward fulfillment | Waiting for Part 2 report approval |
| 4 | Premium UX, mobile/RTL/accessibility, performance, SEO and analytics | Waiting for earlier parts |

## Result

The launch code could read Firestore for a quote, while its final order transaction and many storefront surfaces still used static values. Part 2 uses a shared validated pricing view, connects the active pricing consumers and verifies current records inside each new order transaction.

| Area | Implemented behavior |
| --- | --- |
| Price ownership | Firestore manages supported fixed portions, the legacy wholesale unit rate, custom 100g rate/limits, availability and three hamper box fees. Product IDs, media and approved shipping weights remain reviewed registry metadata. |
| Named database | Pricing receives the actual initialized server database, including the configured database ID. |
| Admin editor | Existing admin catalogue has product and box editors in English, Urdu and Arabic; whole-PKR validation, bounded authenticated requests, change reasons, version conflicts and the latest ten editor audits. |
| Concurrency | Effective pricing plus revision digests detect competing saves and direct Console edits. Price and audit writes share one transaction. |
| Public privacy | Public views reconstruct whitelisted pricing and static public metadata. Stored supplier costs, staff fields and injected names/media/shipping are not copied; rule changes deny direct browser price/audit reads. |
| Refresh | Two shared server listeners per process, one client store/request lifecycle, ETags, 30-second active-tab refresh and focus/online/visibility refresh. |
| Storefront | Shop/filter/search, home slider, product/related products, quick view, recommendations, comparison, guide, journal and reorder consumers use the shared current view. |
| Bag | Fixed/custom/hamper prices update; unavailable selections stay in the bag with a translated notice rather than disappearing. |
| Quote and checkout | Quote/coupon APIs use the same prices. Final order transactions read current cart-specific product/box records and reject changed quote fingerprints, including changed item prices with the same final sum. |
| Historical orders | Saved receipts and idempotent retries retain original amounts and are returned before catalogue reads. |
| Hampers | Current 250g component prices determine the existing 200g component formula; current box fees are included. Inactive components/boxes cannot produce a new purchasable hamper. |
| AI and WhatsApp | Website AI gets current fixed/custom/hamper context. Saved-order WhatsApp messages use persisted amounts. Authenticated n8n catalogue/quote endpoints support remote pricing consumers without granting customer/admin/wholesale identity. |
| Migration | Offline preview and read-only database planning; explicit create-only seeding preserves every existing owner record and refuses invalid existing prices. |
| Compatibility | Existing `/api/catalog` array contract is retained. New storefront consumers request `/api/catalog/snapshot` for the complete product/box view. |

No new npm dependency or product photography was added. Existing shipping charges/weight convention, coupon definitions, reward pause, points and stock policy remain unchanged. The existing web checkout remains retail; this part preserves the legacy approved-wholesale API contract rather than introducing a dedicated wholesale checkout flow.

## Verification

| Check | Result |
| --- | --- |
| Full offline suite | 504/504 tests; 47 test files |
| New pricing coverage | 18 new tests for validation, public privacy, listeners, conflicts/atomic audits, current transaction pricing, changed quotes, receipt replay, custom grams, hampers, seeding, client deadlines/retry/repricing, languages, AI context and n8n pricing guards |
| Backend regression suite | 21/21 passed as part of the full suite |
| Production offline checks | 48 passed |
| TypeScript | Passed |
| React hooks lint | Passed, zero warnings |
| Production build | Passed; existing large-bundle advisory remains for Part 4 |
| Catalogue assets | 89 products, 107 references, 103 unique files, no missing files |
| Empty-database seed preview | 92 planned creates, zero writes |
| Whitespace/diff checks | Passed |

The Firestore and integration cases use in-memory transaction fixtures and local authenticated HTTP routes. Actual Firebase connectivity/rules, signed-in admin browser interaction, remote n8n credentials and external message delivery have not been verified live. Tests were isolated from production credentials; no customer data or external messages were used.

## Release prerequisites and next checkpoint

The detailed schema, Console instructions, create-only migration and release order are in [FIRESTORE_PRICING.md](FIRESTORE_PRICING.md). Before live activation, review the configured project/database, inspect existing records with the read-only plan, create approved missing records, correct invalid records and verify the new application and rules on staging. `CATALOG_SOURCE=static` is an explicit rollback/offline mode and disables live owner price editing.

Direct Console edits update the view but do not create editor audits; use the editor for attributable change history. Remote WhatsApp/n8n flows need to use the new authenticated price endpoints instead of their own price lists. No remote workflow was edited in this part.

Part 3 starts only after the user approves this report. Approval to start Part 3 does not merge these pull requests, publish Firestore rules or deploy allbarka.com.
