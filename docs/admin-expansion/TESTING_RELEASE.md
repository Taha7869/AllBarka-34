# Verification and release record

## Stage 1 baseline — actually run

| Command | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | Exit 0; 566 existing packages installed |
| `npm run typecheck` | Exit 0 |
| `npm run lint:hooks` | Exit 0 |
| `npm run build` | Exit 0; existing bundle advisory retained |

These are baseline checks, not evidence that expansion features exist. Local tests use no production secrets. Runtime public assets are restored from the exact upstream commit; download/verification work is not a product change.

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
