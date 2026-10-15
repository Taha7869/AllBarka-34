# AllBarka Part 4 — Storefront experience

Implementation and offline verification complete, on `codex/part-4-premium-experience-20261014`, stacked on Part 3 commit `7d75e7f5ef446e561e8daa4fe59ed67e43c67068`. This is a review checkpoint. Production merges/deployment, Firebase publication/migrations and live n8n changes require the owner's separate release approval.

| Part | Scope | State |
| --- | --- | --- |
| 1 | Privacy and launch reliability | Report approved; draft PR #11 unmerged |
| 2 | Firestore prices and admin price editor | Report approved; draft PR #12 unmerged |
| 3 | Inventory, complete rewards, admin scale and notification worker | Report approved; draft PR #13 unmerged |
| 4 | Mobile/RTL/accessibility, performance, SEO and optional analytics | Complete for draft review |

## Delivered

- Compact catalogue refreshes send prices, availability and box fees separately from the public registry. All 89 products and three boxes round-trip through the same strict validation. Legacy array/full APIs remain available, and each format has its own ETag.
- The catalogue registry has an independent hashed cache chunk. A manifest-based budget covers the entry and every static JavaScript dependency. The normal visit no longer waits for a timed brand introduction; homepage-only responsive hero preloads and high fetch priority are implemented.
- Production HTML contains route-specific title, description, canonical, social preview and structured data. The shared client controller updates it on SPA navigation. Product offers use verified cached pricing/stock; unavailable pricing and quote-only products do not advertise invented offers.
- Canonical category/info aliases, configured-origin sitemap/robots, real public unknown-route 404s and private/search noindex behavior are covered. Fake ratings, location/opening-hours claims and repeated conflicting schema were removed from the old global head.
- Existing navigation uses real links and an accessible collection disclosure. Skip navigation, route announcements/heading focus, 44px controls, reactive reduced motion, mobile form sizing and RTL gifting content are implemented. Mobile navigation's competing double route handler is removed.
- New experience/privacy/recovery strings and key checkout/receipt labels support English, Urdu and Arabic. Recovery does not display exception details; the existing theme and cart data are retained.
- Optional GA4 measurement remains disabled without an owner-configured ID and explicit customer opt-in. Consent can be reviewed through the footer. Application event payloads allow only registry identities, quantities and numeric totals; private query/contact/account/order/gift fields are excluded.
- Purchase events require a durably accepted payable order, use random transaction IDs and per-tab session retry protection, and proportionally represent verified merchandise discounts. Quotes and persistence failures do not emit purchases. Storage/crypto/provider failures cannot reject checkout. Numeric document LCP/CLS observers are optional; no INP or performance-score claim is made.
- No new dependency, photography, tariff or commercial pricing formula was introduced.

## Measured transfer changes

| Measure | Before Part 4 | Part 4 |
| --- | --- | --- |
| Full vs compact canonical catalogue JSON | 520,681 bytes | 15,615 bytes, approximately 97% less |
| Main JavaScript entry, uncompressed | 506.84 kB | 327.32 kB |
| Main entry, gzip | 137,933 bytes | 96,055 bytes |
| Static JavaScript import graph | No automated budget | 5 files; 954,477 bytes / 278,690 bytes gzip |
| Enforced gzip limits | None | Entry 105 KiB; static graph 300 KiB |

The catalogue comparison is a canonical static fixture, not a live traffic measurement. Chunk splitting improves cache isolation; the smaller entry alone does not prove a smaller total initial download. The static-graph budget excludes CSS, images and dynamically loaded pages/Auth. The existing optional Firestore chunk still triggers Vite's large-chunk warning.

## Verification

| Check | Result |
| --- | --- |
| Complete test suite | **581/581 passed** across 52 test files |
| New focused experience/measurement tests | **31/31 passed** |
| Backend checks | **21/21 passed** |
| Actual local production bundle HTTP checks | **52/52 passed** |
| Catalogue asset integrity | 89 products, 107 references, 103 unique files; none missing |
| Production build, TypeScript, hooks lint, whitespace | Passed |
| Manifest transfer budgets | Passed |

New coverage includes route/schema escaping, privacy/noindex/404 responses, deployment-origin crawler documents, compact compatibility/ETags/304s, invalid prices, translated recovery/navigation rendering, consent/revocation/provider failures, purchase eligibility/concurrent retries/discounts and numeric CLS/LCP boundaries. The broader suite preserves price, shipping, stock/reward transaction, auth/privacy and outbox behavior from Parts 1–3.

## Review limits and release gate

Real-browser visual/keyboard interaction and Lighthouse were **not completed**. The local browser installation download failed, and the cloud browser could not open the local preview; its policy rejected further access to the error surface. No browser-policy workaround was attempted. Static markup, source, HTTP and offline fixtures verify implementation but cannot certify responsive layout, contrast, focus behavior or actual Core Web Vitals.

Production Firebase connectivity/index/rule behavior, signed-in admin edits, external n8n delivery, paid traffic scale and actual GA4 network collection are also unverified. GA4 Enhanced Measurement must be disabled in the approved provider stream and its real payloads inspected on staging before any optional activation. An accepted-order purchase event is not a payment or delivered-revenue ledger. Deduplication is per tab/session, not a cross-tab/server guarantee.

Read [PREMIUM_EXPERIENCE.md](PREMIUM_EXPERIENCE.md) for configuration, event semantics, staging/browser review and rollout. Apply the earlier pricing/commerce guides for the named Firebase database, create-only price seeding, indexes, stock counts, search migration and recovery. All four parts are implemented for review; live release remains a separate approved action.
