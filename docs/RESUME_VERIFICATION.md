# Recovery and integration checkpoint — 27 October 2026

Task **V6-R01**: recover the saved work after the reported Stage 3 interruption, verify the current implementation, synchronize its handoff/PR, and refresh available read-only integration evidence. Codex self-review; no independent reviewer is claimed. Recovery/correction and verified source synchronization are DONE. Source checkpoint `4ee28a08a71d2df7f0a6e3636b693f6ad76630bd` is saved in draft PR #16. No restart is needed. The full recheck exposed a mobile-menu interaction defect, corrected in the existing component as recorded below.

## Authoritative source

- Continue `codex/admin-catalog-foundation-20261023`, [draft PR #16](https://github.com/Taha7869/AllBarka-34/pull/16), targeting `launch`.
- Inspected implementation: `81eedbfe0b09cdd29ba599f4733968a05a60fdbe`; tree `42c6731ff2ffb9109d999c6943ee2062279c4bf1`; parent `c46735d3ad1007444904c26db9b2c2f43a3e7e74`.
- That commit already saved M18 cart/checkout source, its test, nine evidence files and linked documentation: 27 changed paths, with no deletions. The PR description still described the preceding gifting checkpoint; the M18 remote-save checkbox had not been completed. These records need synchronization, not reimplementation.
- Restored and Git-blob-verified 937 of 941 upstream files, including all application source, tests, dependencies' manifests and runtime assets. Four historical PNGs above 1 MB could not be materialized through the connector's binary readers. They remain in the verified remote base tree and are not deletion candidates. Details: [restoration evidence](admin-expansion/evidence/recovery-20261027/restoration.json).
- Fresh production build reproduced the recorded runtime fingerprint exactly: `dd84bc1eef43282eac53f871a9f3171d9d1e0e35d2433f937ab63c56bf221cb4`. The recovered baseline had no source differences. Subsequent changes are limited to the mobile-menu close lifecycle and its existing browser regression; package/lockfile, pricing policy, roles, keys and provider configuration remain untouched.

## Which Stage 3?

| Workstream | Saved work / continuation |
| --- | --- |
| Earlier renovation Stage 3 | Pricing/MOQ and import compatibility already implemented; its regressions pass in the current targeted run. |
| Admin expansion Stage 3 | Shared item form, language fields, photos, units/options, templates/taxonomy, SEO and draft/publish implemented. Fresh mounted browser journey passes. Preserve later staff/content work. |
| Premium V3 | Product detail and bounded story/journal presentation already saved. Preserve V1/V2/gifting and later M18 purchase work. |
| Current continuation | V6 integration readiness. Source/fixture evidence and actual live provider acceptance remain separate. |

The exact prior chat error log was not available, so its cause is not invented. The recorded M18 P08 `window.matchMedia` compatibility failure was already corrected in the saved source; the current SSR regression passes. The current Stage 3 flow does not reproduce a failure under the checks below. The broader suite did expose an intermittent mobile-menu exit overlay blocking checkout; this is separate from the unavailable previous-chat error.

## Fresh local verification

Runtime: Node `24.22.1`, npm `11.9.0`, test-only Chromium `153.0.8010.0`. Existing application lockfile installed with `npm ci --no-audit --no-fund` (566 packages); no dependency changes. Default Playwright download returned an invalid archive. A separately installed test-browser package had an archive ownership extraction error; its original browser/SwiftShader files were extracted without changing ownership. The existing browser helper then launched successfully. These were local test-runtime setup failures, not application failures.

| Gate | Fresh result |
| --- | --- |
| `npm run typecheck` | PASS, exit 0 |
| `npm run lint:hooks` | PASS, exit 0 |
| `ALLBARKA_SKIP_LOCAL_ENV=true GITHUB_SHA=81eedbfe0b09cdd29ba599f4733968a05a60fdbe npm run build` | PASS, exit 0; 84-artifact privacy audit. Existing bundle-size advisory remains. |
| Targeted Stage 3 / pricing / SSR run | PASS, 30/30, zero failures/cancellations/skips, exit 0 |
| First full recovery run | FAIL: 712/713; mobile-menu exit overlay intercepted checkout clicks. Backend/asset/production commands did not run after the failing test family. |
| Final targeted menu/navigation run | PASS 13/13, zero failed/cancelled/skipped, exit 0. Includes actual menu-to-checkout flow and all existing navigation tests. |
| Full suite after fix | PASS 713/713 across 78 files, 21 backend checks and 36 production checks, exit 0; zero failed/cancelled/skipped. Asset audit: 97 products / 115 references / 111 unique files; zero missing or retired views. |
| All 21 `scripts/*.mjs` syntax checks | PASS; read-only parse checks, no script behavior certification |
| Final documentation links/diff | PASS; relative links checked against local files and verified upstream tree; whitespace check passes. Source save verified: 18 intended paths, no deletions, 947 blobs, exact read-back contents and hashes. |

Targeted command, with `ALLBARKA_SKIP_LOCAL_ENV=true` and `ALLBARKA_TEST_BROWSER` pointing to the installed test browser:

```sh
node --import tsx --test --test-isolation=none tests/admin-expansion-item-workflow.test.ts tests/admin-expansion-browser.test.tsx tests/shopping-quality.test.tsx tests/stage3-pricing-moq.test.ts
```

The mounted Stage 3 journey uses actual form/router/catalog/cart code with isolated Auth, Storage and memory persistence. It creates a private draft, reloads it, uploads through the bounded upload interface, publishes, edits templates/taxonomy, preserves a conflicting edit, discovers the item and buys a custom 750mg selection. Authoritative validation retains PKR 750 despite a submitted PKR 1. Mobile/desktop, EN/UR/AR and light/dark combinations pass. This does not certify real Firebase uploads or accepted live orders.

## Fresh external evidence

The previous blanket Railway-access blocker is superseded: the connected Railway plugin now exposes AllBarka metadata. [Sanitized Railway report](admin-expansion/evidence/recovery-20261027/railway.json) and [public GET report](admin-expansion/evidence/recovery-20261027/public-preflight.json) contain no credentials or customer records.

- Project `AllBarka`, service `allbarka-fullstack`, environment `production`; latest deployment `4b42bdd8-cd53-42cf-9abc-8d806ca54a60` is `SUCCESS`, created 17 October 2026. No staged changes. Only production was listed; no preview environment was discovered.
- Railway metadata and `/api/health` agree on deployed commit `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`. This differs from both current `launch`/`main` (`5e6349051980abd1a20f719f289a24a3fd2cba7b` at inspection) and the feature source. A healthy old deployment does not certify the feature.
- All 32 directly configured application variable names are present. OAuth withholds their values; presence is not value validation. Existing keys/configuration were not changed, recreated or exported.
- GET `/api/health`, `/api/commerce/readiness` and `/api/catalog` returned 200. Database/auth initialization flags are true; `durablePersistenceReady`, `savedOrderVerifiedThisProcess` and AI connectivity verification remain false. These indicate missing verified acceptance in the running process, not proof that every attempted order fails.
- Complete public catalog response: 97 unique products, 92 active, five inactive. Catalog version `e911ff4c059a56799c438e03089dde03694ec6bc1235e04582b26778667fd1db`. No duplicate IDs, unknown built-in category IDs or errors through the feature's existing pricing adapter in the captured public scope. [Public projection report](admin-expansion/evidence/recovery-20261027/public-catalog.json) enumerates all 97 rows without prices/private data.
- Four historical long-label packaging IDs remain unavailable: `bid-box-umrah-tabarruk`, `bid-box-pyramid-favor`, `bid-box-card-nikkah`, `bid-box-birth-announcement`. `bid-box-acrylic-royal` is also inactive; source identifies it as inquiry-only, so it is not automatically classified as another malformed pricing record. Active `corporate-gifting` has no price and is explicitly inquiry-only; no rate should be invented.
- `/api/catalog/taxonomy` returned 404 on the old deployed build. The earlier `/api/readiness` probe also returned 404 because the correct existing path is `/api/commerce/readiness`; the successful report uses that correct path. No application fix is implied by either probe.

R04 semantic/private catalog reconciliation remains BLOCKED: this is an old public projection, not a complete merchant Firestore export or current published taxonomy. Actual media/facts, intended classifications, private drafts and changed-item refresh cannot be certified from it. No live writes, webhook calls, orders, customer messages, role grants or workflow/rule mutations were performed.

## Review findings and next action

| ID | Finding | Disposition |
| --- | --- | --- |
| R01, medium | PR summary and incomplete M18 save record lag the already-saved source; repeated Stage 3 numbering can restart completed work. | Synchronize PR and current entry points; retain the source pin and workstream table above. |
| R02, medium | Old notes still say Railway is unavailable. | Replace the current blocker with observed OAuth metadata access and the remaining private/provider limits. Historical notes remain dated evidence. |
| R04, medium | Full suite reproduced a closed-state mobile menu still intercepting checkout clicks. An isolated rerun passed, confirming the timing-sensitive nature; debug capture showed `aria-expanded=false` while exit surfaces remained. | Stable outer shell immediately becomes inert, aria-hidden and pointer-transparent on close; route-keyed exit surfaces are discarded on navigation. Close button/backdrop restore the opener; the focus effect uses the latest close callback without restarting on every parent render. Existing browser test asserts the closed interaction boundary and retains the actual checkout click. Final gates follow. |
| R03, release gate | Feature source is not deployed; current public diagnostics do not prove Auth/Storage/n8n/accepted-order behavior. | Carry forward the live gate. Do not merge/deploy solely because local tests pass. |

Next executable integration action: obtain an authorized private merchant catalog/taxonomy snapshot and an approved isolated integration target/session. Rehearse the feature against current records without seeding/resetting rates; verify real Auth/Storage and accepted receipt persistence. Verify the compatible n8n receiver before enabling the sender; never replay historical terminal events. Existing photography, factual-content and merchant printing/style dependencies remain in MASTER_PLAN.md. An authenticated Railway connection alone does not supply Firebase/private merchant access.

## R11 checklist

- [x] Recovery/correction scope complete; final full verification and source checkpoint saved/read back.
- [x] Self-review identifies source/fixture/live boundaries; no new critical/high source defect reproduced in targeted checks.
- [x] Final full-suite and documentation gates recorded; unrun live gates explicitly named.
- [x] Current public catalog enumerated; full semantic/private audit explicitly BLOCKED.
- [x] Application source and existing commerce/privacy/role/localization behavior preserved.
- [x] Master/handoff/test/changelog synchronized; PR metadata is the final delivery update.
- [x] Source checkpoint remote parent/tree, all 18 intended paths, unchanged blobs and saved ref verified; production release not performed.

## Mobile-menu correction scope

Changed runtime: `src/components/MobileMenu.tsx`; regression: `tests/interaction-polish-browser.test.tsx`. Uses the existing menu and animations, with no new component or dependency. Final runtime fingerprint `e3ca5200b9ff0263736ecef2d694474eb236e6c9b3b9283d43512d3e1a8be4e1`. Fresh build/privacy, typecheck and hooks lint pass after the correction. Final targeted/full results must be recorded before delivery. The first corrected targeted run passed the menu-close assertions and reached checkout, then exposed a separate held-quote fixture timing assertion (12/13). The expected server-error assertion remains enabled and the fixture now releases both queued and later-arriving quote requests with the same 503 response. It waits for the expected error before checking its count; disabled submission and zero order calls remain asserted. A separate isolated rerun had passed before this infrastructure correction, so neither an isolated pass nor an arbitrary delay is treated as the fix.

Final corrected-source command: `ALLBARKA_SKIP_LOCAL_ENV=true ALLBARKA_TEST_BROWSER=/workspace/scratch/f57ba9a36e75/browser-runtime/bin/chromium node scripts/run-all-tests.mjs` (exit 0). Final targeted command adds `tests/stage4-navigation.test.tsx` to `tests/interaction-polish-browser.test.tsx`, with the same environment (13/13, exit 0). Earlier failed runs remain recorded above and are not acceptance evidence.

## Verified source persistence

Source checkpoint `4ee28a08a71d2df7f0a6e3636b693f6ad76630bd`, tree `26ba404b7ac023f047f2d564f180ffda3a97f7d9`, parent `81eedbfe0b09cdd29ba599f4733968a05a60fdbe`. Expected-parent fast-forward succeeded. All 18 intended files were read back with exact text/blob hashes; candidate tree contains 947 blobs and preserves every unrelated upstream blob, including the four historical PNGs unavailable locally. This documentation successor records that completed save. Inspect the current PR head before continuing; local reconstructed snapshot history was never pushed.
