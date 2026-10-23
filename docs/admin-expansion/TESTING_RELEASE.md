# Verification and release record

## Stage 1 baseline — actually run

| Command | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | Exit 0; 566 existing packages installed |
| `npm run typecheck` | Exit 0 |
| `npm run lint:hooks` | Exit 0 |
| `npm run build` | Exit 0; existing bundle advisory retained |

These are baseline checks, not evidence that expansion features exist. Local tests use no production secrets. Runtime public assets are restored from the exact upstream commit; download/verification work is not a product change.

## Stage 2 final verification — actually run

Date: 24 October 2026 (Asia/Karachi). Node 24.19.0; npm 11.9.0; original package/lock unchanged.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Exit 0 |
| `npm run lint:hooks` | Exit 0 |
| `npm run build` | Exit 0; release privacy audit passed; pre-existing bundle advisory |
| New commerce/persistence tests | 16/16 passed, also included in the full suite |
| `node scripts/run-all-tests.mjs` with local test browser | Exit 0; 61 test files; 674/674 tests, 0 failed/cancelled/skipped; 21/21 additional backend checks; 36/36 production checks |
| Catalog asset verification | 97 products; 115 references / 111 unique files; 0 missing files, 0 retired views |
| `git diff --check` | Exit 0 |

Coverage includes exact price rounding, unit dimensions, override preservation, quantity steps, shipping constraints, packaging piece counts/MOQ, authoritative checkout, draft publication rollback, create/reload/publish, stale revision/fingerprint behavior, privacy allowlists, configuration permissions and audit transaction paths. Existing storefront provider-fetch and 11 controlled-clock lifecycle browser cases passed against the final production build. These are regression checks, not verification of a new Stage 3 form.

The first full-suite attempt exposed missing Chrome/Edge binaries in this Linux runtime. The two existing browser test files now use a shared helper: Chrome, Edge, then Playwright Chromium. For this run only, `ALLBARKA_TEST_BROWSER` pointed to locally installed Chromium 153 outside the repository. Example: `ALLBARKA_TEST_BROWSER=/absolute/path/to/chromium node scripts/run-all-tests.mjs`. No assertions were removed/skipped and no application `.env` was edited. Browser runtime installation is test infrastructure, not a new application dependency.

All persistence/API tests used isolated fixtures and loopback HTTP. The production checker deliberately verifies unavailable integration behavior without credentials. Live Firestore edition/connectivity, Storage, Railway and n8n remain unverified; an attempted read-only Firebase CLI edition check could not obtain network approval. No live writes, provisioning or deployment took place.

## Required feature evidence

1. Unit conversion boundaries, dimensional mismatch, base-rate math, manual overrides, custom range/step and invalid prices.
2. Legacy products, oil shipping convention, packaging MOQ, custom gram rounding, historical receipts and saved-cart compatibility.
3. Create/edit/reload/publish/archive with revisions, missing required fields, translation fallback, public private-field exclusion and audit writes.
4. Upload type/size checks, durable-storage failure, dynamic-product galleries and private admin access.
5. Staff access: unauthenticated/customer denied; order reader allowed; all mutations/export/settings/catalog denied. Test API responses as well as UI navigation.
6. Settings preview/publish, validated links/references, failure handling and safe empty sections.
7. Run `npm run typecheck`, `npm run lint:hooks`, `npm run build`, affected tests and `node scripts/run-all-tests.mjs`.
8. Browser: 390×844 mobile and 1440×900 desktop; EN/UR/AR, dark/light, keyboard, reduced motion, overflow and console/page errors. Use fixture-backed admin auth and isolated database adapters; do not contact live services as a test.

## Reviewable release

Provide commit/PR, stage/requirement status, meaningful screenshots, exact check results and remaining external blockers. A local fixture does not certify Railway, Firebase Storage, Firestore rules or n8n. Document migration dry-run and rollback; do not publish rules or mutate production as part of offline verification.

Rollback restores the previous application commit and disables new optional settings/configuration without rewriting legacy orders or losing owner edits. Before a future live migration, retain a dated export of affected documents and preview create/update/conflict counts. Unknown or missing records must never trigger destructive replacement.
