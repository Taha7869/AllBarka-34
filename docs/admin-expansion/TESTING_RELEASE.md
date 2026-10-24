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

## Stage 3 final verification — actually run

Date: 24 October 2026 (Asia/Karachi). Original application package/lock unchanged.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Exit 0 |
| `npm run lint:hooks` | Exit 0 |
| `npm run build` | Exit 0; release privacy audit passed; existing bundle advisory |
| `node scripts/run-all-tests.mjs` with local test browser | Exit 0; 63 test files; 681/681 tests; 0 failed/cancelled/skipped |
| Additional backend/production checks | 21/21 backend and 36/36 production |
| Catalog assets | 97 products, 115 references / 111 unique files; 0 missing/retired views |
| `git diff --check` | Exit 0 |

New tests cover empty defaults and payload preservation, explicit blank legacy translations, server/client SEO and gallery precedence, custom taxonomy route/filter behavior, upload guards/signatures/size/provider failure, and a mounted browser using the real catalog/configuration/upload routers with isolated services. The browser journey persists a new draft, reloads, uploads, publishes, edits taxonomy and template attributes, checks a stale-edit 409 without losing input, opens customer discovery/PDP and adds `Custom 750mg` to the real CartContext. `validateAndPriceOrder` then ignores a submitted PKR 1 and charges the canonical PKR 750. The upload provider is a local adapter; these checks do not certify the live bucket or create a real customer order.

The responsive matrix covers 390×844 and 1440×900, each in EN/UR/AR and light/dark, with reduced motion, dialog direction/overflow checks and no unexpected console/page errors. The deliberately induced 409 is the only expected error response in that path. Four representative screenshots are saved in `evidence/`: mobile English light, desktop English light, mobile Urdu dark and desktop Arabic dark.

An earlier full run exposed timing drift in three existing autoplay tests; an isolated run reproduced a different boundary failure. Their installed fake clock had continued advancing with real wall time between actions. The harness now pauses wall-time progression between explicit `runFor` calls and flushes via the driver rather than a paused browser timer. All original assertions remain; isolated 11/11 and final full-suite timing checks passed. No carousel runtime logic was changed.

Live Storage availability/permissions, Firestore edition, Railway and n8n remain unverified. No new credentials, application environment edits, live writes, rules publication, workflow edits, deployment or production merge occurred. Stages 4–6 retain their separate gates below.

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

## Stage 4 final verification — actually run

Typecheck, hooks lint, production build/privacy audit and diff check passed. Full offline suite passed: 65 files, 688/688 tests (0 failed/cancelled/skipped), 21 backend checks, 36 production checks and catalog assets with zero missing/retired views. New service/HTTP tests cover grant/revoke, preserved Auth claims, concurrent stale revisions, atomic audit failure, identity/revocation bypasses, response privacy and staff denial across order mutations/export/catalog/media/settings/team/update/inquiry families. Browser verified real admin grant, staff list/detail, focus containment/restoration, all 12 viewport/language/theme combinations and UI clearing after revoke. Only fixture adapters were used; no live accounts, role grants or orders were mutated.

CodeRabbit 0.9.1 was installed outside the repository as an optional review tool. Auth status: `not_authenticated`. `coderabbit auth login --agent` returned `environment_unsupported`: browser login is unavailable in this environment. External review did not run and is not counted as passed. To enable it later, authenticate from a user-controlled terminal with a working browser; no new keys are requested or committed here.

## Stage 5 final verification — actually run

Date: 24 October 2026 (Asia/Karachi). Original application package/lock unchanged.

Typecheck, hooks lint and production build/privacy audit passed; the existing bundle-size advisory remains. Full offline suite passed: **693/693 tests across 67 files**, 0 failed/cancelled/skipped; **21/21 backend**, **36/36 production**; 97 products / 115 image references / 111 unique files, zero missing/retired views. `git diff --check` passed.

New tests cover content schema/aggregate UTF-8 limits, safe internal routes, private projection, local-language fallback, hidden compiled article tombstones, metadata/navigation, real HTTP draft/publish/revision conflicts, incomplete publication and transactional audit failure. Mounted browser covers actual Studio edits, private preview following edits, public draft isolation, publication/reload, section visibility/order, one product showcase, desktop/mobile navigation, journal route/initial metadata and stale-edit input preservation. The homepage matrix is 390×844 / 1440×900 × EN/UR/AR × light/dark with reduced motion and unexpected console/page error checks. Four representative `stage5-*.jpg` images show fixture content and a test header, not live deployment. Studio preview is limited to hero/banner/FAQ; full publication is checked in the customer fixture.

The first full run exposed two old carousel cases failing on resume boundaries. Installing the clock after page load left original timers uncancellable by the fake clock. The helper now installs before navigation, pauses wall time and retains every original assertion. Isolated 11/11 and full-suite cases passed; runtime carousel behavior was not changed. Normal browser tests now write screenshots in their temporary directory. To deliberately refresh committed evidence, set test-only `ALLBARKA_CAPTURE_EVIDENCE=true` alongside `ALLBARKA_TEST_BROWSER` when invoking the relevant browser test; no application environment file is involved.

`node --import tsx scripts/admin-expansion-dry-run.ts` passed in isolated memory only. It accepts no live/apply arguments, preserves all 97 fixture records and saved-price fingerprint, compares 93 valid resolved price lists, performs zero writes/conversions and flags four compiled packaging seeds as `INVALID_CATALOG_VARIANT`. Their long labels require real merchant-data review; this is a finding, not certification of all 97 seeds as purchasable. The empty-store check confirms 93 missing authoritative products remain unavailable and never get automatically seeded. Report: `evidence/additive-dry-run.json`.

Stage 6 external verification remains BLOCKED: no live credentials/connectivity were used. See RELEASE_PACKET.md. No external CodeRabbit/Aloop result is claimed.
