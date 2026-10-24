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

## Interaction refinement P0–P3 — actually verified

Date: 24 October 2026 (Asia/Karachi). The complete continuation contract was saved before source work at `dbf2b6c37a57b433ac7641d31d295547f30483ea`; the prior Stage 5 source was restored and hash-checked after scratch maintenance. Restored baseline gates passed (693 tests, 21 backend, 36 production). Application package/lock and original public/bundled photography are unchanged.

Latest source gates: typecheck, hooks lint, production build/privacy audit and diff check passed. Full offline suite: **694/694 tests across 68 files**, zero failed/cancelled/skipped; **21/21 backend** and **36/36 production**; 97 products / 115 image references / 111 unique files with zero missing/retired views. Existing bundle-size advisory remains. Focused original gallery/media/render checks: 19/19.

The new mounted browser uses the real RootLayout/header/footer, cart, catalog/content routers and public pages with isolated memory persistence and an auth adapter. It verifies matching committed add/repeat confirmation, no-op and quantity-cap non-confirmation, native disabled controls, canonical fixture price, anchor keyboard click/style preservation, real second-photo preview, manual/keyboard photo selection and stable detail link, failed photo fallback, actual desktop menu focus/Escape, mobile current state/open/close, native touch scrolling and reduced motion. A held client quote request shows busy/disabled state; deliberate 503 clears pending state while order submission stays disabled, with no order/success invented. Expected 503/404 console errors are narrowly allowed during their explicit failure cases; other console/page errors fail the test.

Actual full-layout matrix: 360, 390, 768 and 1440px × EN/UR/AR × light/dark = **24 combinations**, each on PDP and cart = **48 layouts**, with no document horizontal overflow. The real header exposed two width defects: small-mobile brand/utilities and desktop brand/nav/utilities in one row. These were fixed in the corresponding header layout rather than hiding document overflow. Drawer-exit measurement was also corrected to wait for unmount before measuring stable layout; no assertion was removed.

Four `evidence/polish-*.jpg` screenshots show actual mounted header/PDP with fixture data, not a live deployment. Chromium 153 and readable Amiri fonts were supplied outside the application repository; external font/provider requests are stubbed in this browser fixture. No new application dependency was added. Normal test runs save screenshots temporarily; explicit test-only `ALLBARKA_CAPTURE_EVIDENCE=true` refreshes committed evidence.

New tests do not certify live Firebase/Auth/Storage, n8n, production font delivery or deployment. The four packaging-seed label findings and original Stage 6 external gates remain in RELEASE_PACKET.md. No CodeRabbit/Aloop review is claimed.

## Stage 6 compatibility checkpoint — actually verified

Date: 24 October 2026 (Asia/Karachi). Inspected parent: `547081f13cc16df534d66ef1eaf38c3f9dfac90e`. No UI, application package/lock, price list, shipping/MOQ calculation or original photography changed in this checkpoint.

| Check | Final result |
| --- | --- |
| `npm run typecheck` | Exit 0 |
| `npm run lint:hooks` | Exit 0 |
| `npm run build` | Exit 0; privacy audit passed (84 text artifacts); existing bundle-size advisory |
| Focused two new Stage 6 test files | 6/6 passed; 0 failed/cancelled/skipped |
| `ALLBARKA_TEST_BROWSER=<installed Chromium> node scripts/run-all-tests.mjs` | Exit 0; **700/700 tests across 70 files**; 0 failed/cancelled/skipped |
| Backend / production | **21/21 backend**, **36/36 production** |
| Catalog assets | 97 products / 115 references / 111 unique files; zero missing/retired views |
| Isolated additive dry run | 97 saved records and 97 resolved price lists unchanged; 93 products unavailable in empty store; zero writes/conversions/live database calls |
| `git diff --check` | Exit 0 |

`stage6-legacy-packaging.test.ts` uses real catalog/admin/order/export services with isolated persistence. It verifies exact original long labels and canonical IDs on all four affected products, merchant prices deliberately different from compiled seeds, metadata-only saves and canonical order/WhatsApp export agreement. It rejects altered/arbitrary/control-character labels, wrong product/variant IDs, duplicate variants and long new-commerce labels. It also verifies missing-record fail-closed behavior, unchanged saved records/seed price lists and restricted lifecycle preservation: existing public legacy state survives editing, while explicit drafts/archives and new/unknown products are not promoted.

The initial focused/full run exposed a genuine metadata-edit regression: the new-product draft default was also applied to already-public legacy records without explicit status. The restricted existing-record adapter fixes that behavior without changing new-product defaults. During implementation, a missing-record fallback activation risk was also identified and guarded. The final exact-source full run above passes, including existing admin/staff/content, browser interactions, historical commerce and backend regressions. No assertions were removed to hide these failures.

`stage6-readonly-preflight.test.ts` verifies an actual loopback HTTP server observes exactly three GETs without Authorization/Cookie headers. Output is allowlisted, private injected values are excluded, forbidden origins/credentials are rejected before fetch and malformed/oversized responses cannot claim readiness. The CLI accepts no live/apply mode and invokes no database SDK, Auth/Storage operation, order or webhook.

Separately, the script actually ran against `https://allbarka.com` public health/readiness/catalog endpoints: all three returned 200, with 97 public products. Sanitized report: `evidence/stage6-live-readonly.json`, timestamp `2026-10-24T04:10:45.460Z` (09:10:45 Asia/Karachi). The old deployed commit `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0` differs from the inspected feature parent. It reports databaseConnected true, durablePersistenceReady false, savedOrderVerifiedThisProcess false and aiConnectivityVerified false. All four affected public products are unavailable. This proves neither the private saved-record cause nor deployment of the correction. The report's expected commit is the inspected parent at request time, not the later checkpoint containing the report.

Stage 6 remains IN_PROGRESS. Private merchant exports, feature Auth/staff/Storage/rules, Firestore edition, accepted-order persistence, n8n execution and deployment/rollback checks remain BLOCKED/unverified. No credentials or application environment were changed; no live data/account writes, rules publication, workflow edits, deployment or production merge occurred. Existing external CodeRabbit limitation remains; no Aloop result is claimed.
