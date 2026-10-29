# M20-FILTER1 — same-URL filter history recovery

29 October 2026 (Asia/Karachi). Codex. SELECTED / IN_PROGRESS — affected filter acceptance passes; complete regression blocked by FH02. Saved-result evidence is in draft PR #16.

Inspected parent: `a594920e62171a934abb946b2e8cc6e9a8ccec0e` on `codex/admin-catalog-foundation-20261023`, draft PR #16. This is a bounded continuation of M20. Navigation lifecycle, previously completed design/admin work and deferred release boundaries are preserved.

## Acceptance and change

Navigating Back/Forward between different React Router history entries with identical pathname/query must cancel an open, uncommitted mobile filter draft. The page must release background inert and scroll lock. Forward must not reopen the old sheet, and a fresh sheet must use committed filters. Existing Cancel/Apply, cart, selected portion and 24 responsive/language/theme card checks remain.

Only application change: `src/components/CategoryPLP.tsx` includes `location.key` in the existing draft-cancellation effect. The existing `CatalogFilterSheet.tsx` owns cleanup; no competing modal, history entry, dependency, translation or commerce logic was added. `ShopPage.tsx` is the route entry; CategoryPLP is the actual state owner.

`tests/premium-browsing-browser.test.tsx` extends its existing mounted RootLayout/ShopPage journey with same-URL navigation, Back/Forward, discarded budget, root inert/scroll-lock cleanup and fresh-draft assertions. The fixture exposes committed router keys; synchronization follows those keys rather than arbitrary delays.

## Reproduction, review and evidence

FH01 (medium): the previous effect watched query/category only. A same-URL history traversal kept the filter dialog open and the page inert/scroll-locked. Baseline mounted regression FAIL: 0/1, timeout waiting for dialog hidden at the Back assertion. This is diagnostic evidence, not a passing run.

After adding the entry key, affected filter tests PASS 7/7: six filter-draft tests plus the full mounted browsing journey (including its original 24 card layouts). Typecheck, hooks lint and production build/privacy pass. The complete full-suite gate failed at the separately recorded FH02 navigation assertion; no passing full-suite or live acceptance claim is made.

FH02 (unresolved, medium): the complete frozen-source run ended 714/715, exit 1. The unchanged navigation fixture failed enlarged focused-link viewport containment (`tests/interaction-polish-browser.test.tsx:169`). A diagnostic wait for the exact visibility predicate passed the isolated interaction journey 1/1, but the second full-module run still timed out at that predicate. The timing-only hypothesis is therefore insufficient. The diagnostic test edit was reverted; no assertion was weakened, removed or skipped. The second broad run was interrupted after the repeated failure; it is not a completed/passing suite. Filter-history assertions passed in both full-module runs. No third broad rerun was started.

This is deliberately an UNFINISHED checkpoint: source fix and affected tests are saved for continuity, but the full regression gate remains FAIL/BLOCKED. Current RULES.md R02/R03/R11 permit an explicitly unfinished checkpoint while preserving the failed gate; the historical verification skill's passing-commit workflow is not claimed as satisfied. No verified-completion or release certification is claimed.

Codex self-review: source and final intended diff, effect lifecycle, draft/committed filter separation, explicit Apply/Cancel semantics and focused browser assertions. No independent review claimed. No visual styling changed; existing device/language/theme journey remains enabled.

The temporary test browser is Chromium 153.0.8010.0 installed outside the application. Default Playwright archive was invalid; the separate browser package hit the known archive-ownership extraction issue, resolved by extracting its unmodified files without chown. Application dependencies/lockfile unchanged. The initial interrupted reconstruction run is not counted as verification. Restored missing local assets and normalized reconstructed baseline text from immutable upstream blobs with hash checks; these restorations are not feature changes or remote deletions.

## Live boundary and remaining work

Fresh credential-free GETs of health/readiness/catalog all returned 200. [Sanitized report](evidence/filter-history/public-preflight.json): deployed build `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`, 97 public products, databaseConnected true and durablePersistenceReady false. Four recorded packaging IDs remain inactive with no public price options. These flags are not proof that all attempted orders fail. No private merchant snapshot, feature Auth/Storage, n8n execution or accepted-order verification is claimed.

No product/taxonomy membership, route, category, stock, price or availability change. Private semantic catalog reconciliation remains BLOCKED; public GETs cannot certify merchant intent or private drafts. No key/config, live data, role/rules/workflow, production branch or deployment mutation.

Remaining core work is grouped into five practical blocks, not five equally sized tasks: (1) bounded mobile filter/overlay finishing; (2) private catalog/category reconciliation; (3) feature Auth/staff/content/Storage live verification; (4) n8n/WhatsApp acknowledgement/retry/duplicate and accepted-order execution; (5) final regression, isolated preview/backup/rollback and separately authorized release. Original photography/facts/printing remain merchant dependencies. V5 and unselected M10–M34 proposals are optional and do not automatically block core launch.

## R11 checkpoint

- [x] Bounded same-URL history acceptance implemented; broader mobile-overlay work remains separate.
- [x] Baseline finding reproduced and corrected; intended diff self-reviewed.
- [x] Final gate result recorded honestly: complete run 714/715 FAIL at FH02; affected filter/browser tests 7/7 PASS. Task remains unfinished.
- [x] Public read-only scope and private catalog/provider limits recorded.
- [x] Commerce/privacy/roles/localization preserved; no new customer copy or data assignments.
- [x] Task/master/handoff/changelog record the unfinished checkpoint and exact remaining work.
- [ ] Remote delivery is a subsequent step; see PR #16 description for the resulting commit and exact read-back result. This pre-save record does not self-certify persistence.

Next executable action after the scoped save: diagnose FH02 under complete-module context, capturing focused-link geometry, scroll-container bounds and committed language/theme; fix the demonstrated cause, then rerun affected and full gates. Broader safe-area/enlarged-filter/focus audit belongs to a separate bounded slice in `CatalogFilterSheet.tsx` / `catalog-filters.css`; do not call all of M20 done from this history fix.

## Exact local commands

Run from the feature checkout, with `ALLBARKA_SKIP_LOCAL_ENV=true` and for browser commands `ALLBARKA_TEST_BROWSER=/workspace/scratch/0918af7ad5a5/browser-runtime/bin/chromium`:

- `npm run typecheck` — PASS, exit 0.
- `npm run lint:hooks` — PASS, exit 0.
- `npm run build` — PASS, exit 0; privacy audit 84 text artifacts. Runtime fingerprint `6114591fe157237db5f65aa365e10bb782874dcdad4d154e31cb194d6b77a0bc` after exact upstream restoration; only CategoryPLP differs from upstream runtime inputs.
- `node --import tsx --test --test-isolation=none tests/premium-browsing-browser.test.tsx tests/catalog-filter-draft.test.ts` — PASS 7/7, exit 0; the final full suite also runs the same tests.
- `node --import tsx --test --test-isolation=none tests/interaction-polish-browser.test.tsx` — diagnostic 1/1 with the experimental wait only; that change was reverted after full-context failure. This is not final-source acceptance evidence.
- With `NODE_OPTIONS=--test-reporter=tap`, `node scripts/run-all-tests.mjs` — complete result 714/715, exit 1 at FH02. Subsequent diagnostic broad run interrupted after the same failure. Final application source matches the complete run; the experimental test wait is absent. The runner did not reach backend/asset/production stages, so they were then run separately on the same source: 21 backend checks, 36 production checks and the catalog asset audit PASS (97 products / 115 references / 111 unique files; zero missing/retired views), each exit 0.

Remote delivery uses the pinned nonempty parent tree `d0a10510f0f35f973657fa8f785a5e1268270524`. Compare every candidate blob with that tree; intended changes only, zero deletions, expected-parent fast-forward and exact remote blob read-back. The saved result/commit and post-write read-back evidence belong in the description of [draft PR #16](https://github.com/Taha7869/AllBarka-34/pull/16); a local reconstructed commit is not upstream ancestry.
