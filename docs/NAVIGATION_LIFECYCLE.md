# M20-NAV1 — mobile navigation lifecycle and keyboard handoff

28 October 2026 (Asia/Karachi). Codex. SELECTED / DONE for the bounded locally verified slice; remote persistence verification follows below. Inspected parent `0d331e8dd03c40d8f48183abc2b5db629d64f9b0`; draft PR #16. Owner requested the next independent part; provider/key changes and final release remain deferred. This selects the bounded navigation portion of M20 and continues M21 keyboard/accessibility checks, not the whole proposed mobile-controls workstream.

## Behavior

- MobileMenu closes on actual React Router history-entry changes, including Back/Forward and navigation originating outside the drawer. Its existing scroll-lock cleanup and closed-shell inert/pointer boundary remain authoritative.
- Crossing Tailwind's `xl` breakpoint (`80rem`) closes the mobile drawer, releases its body lock and, when focus was inside it, moves focus to a visible header control. Returning to mobile does not reopen the drawer. Closing does not focus the now-hidden mobile trigger.
- The brand action is now a native button with the existing visual content and destination. Keyboard Enter works. The initial focus timer yields to a user who has already focused something inside the menu.
- RootLayout no longer sends a second navigation through the mobile menu's optional notification callback. MobileMenu already owns its destination navigation; the duplicate callback could introduce an intermediate/duplicate history entry. The component's optional callback contract is retained for other callers.

The native brand action also has a 44px minimum hit height, with a direct mounted geometry assertion. No new component, dependency, setting, translation field, backend schema, pricing or product assignment. Existing menu accordions/paths, accepted design, language/theme controls, cart contents and the completed live motion preference hook remain.

Screenshot review also found the social actions could extend outside the drawer when their computed text size doubled. The existing flex row now wraps, with a 128px preferred item basis and intrinsic label width retained, so enlarged actions stack instead of clipping. A mounted assertion checks each social label and action stays horizontally within the drawer. The existing scroll area remains responsible for short-height content.

## Findings and review

Codex self-review: actual source/diff, native keyboard interactions, route/history behavior and screenshot inspection. No independent reviewer claimed.

| ID | Finding | Resolution/evidence |
| --- | --- | --- |
| NL01, medium | Programmatic route navigation while open leaves the drawer's modal state/scroll lock active. | New baseline browser assertion reproduced a 3-second timeout waiting for the trigger to close. Route-key effect now closes it; direct route and real browser Back/Forward are checked. |
| NL02, medium | Desktop CSS hides the mobile menu without clearing its open state/body lock. | Breakpoint listener closes it and chooses visible focus when needed. Test crosses 1280px and returns to mobile. |
| NL03, medium | Brand was a click-only div; initial focus timer could steal an early user's brand focus. | Native button; delayed initial focus only runs while focus is outside the drawer. First corrected targeted run reached a keyboard brand failure (12/13); the final test deliberately waits beyond the 50ms initial-focus timer and checks retained focus before Enter. |
| NL04, medium | Parent and menu both navigate for the same action, polluting Back history. | Remove the parent's competing callback; a single keyboard brand activation followed by browser Back must return to the prior cart route. |
| NL05, medium | Screenshot review exposed clipped social text at doubled computed font size in landscape, despite no document-level overflow. | Wrap existing social actions and assert both label/action horizontal containment. Preserve the [diagnostic before image](evidence/navigation-lifecycle/navigation-landscape-enlarged-before.jpg); the corrected final image is recaptured and inspected. |

Additional scoped runtime paths: `src/components/MobileMenu.tsx`, `src/layouts/RootLayout.tsx`. Extended existing `tests/interaction-polish-browser.test.tsx`; original gallery, cart acknowledgement, no-op/failure, enlarged language/theme matrix, quote-error and zero-order-call checks remain enabled.

## Verification

- Isolated affected navigation + interaction run PASS **13/13**, zero failed/cancelled/skipped, exit 0, including the 44px hit target, Forward/enlarged-focus and horizontal social-label containment assertions. This preceded the fixture synchronization correction below; final all-module context affected journey PASS **1/1**, with the 12 navigation assertions retained in the full suite. Typecheck, hooks lint and build/privacy PASS (84 text artifacts). Runtime fingerprint: `90d80acb82c420b9d13b4537b01f2518735375df91b56dc5d241a206d6cea2c2`. Full regression on this frozen source PASS **715/715 across 79 files**, zero failed/cancelled/skipped, exit 0;21 backend and36 production checks PASS. Assets:97 products,115 references/111 unique files, zero missing/retired views. [Machine-readable verification](evidence/navigation-lifecycle/verification.json).
- Actual RootLayout, MobileMenu, CartDrawer, cart state and real catalog/config/content routers run against local memory fixtures. Auth is isolated. No provider or customer order is called.
- Added direct-route/Back/desktop-close and return-to-mobile checks, native keyboard brand navigation, single-entry history and menu → cart → Escape focus restoration. Cart keyboard focus remains inside its dialog.
- Menu matrix: 360×640, 390×844, 768×600, 844×390 × EN/UR/AR × light/dark =24 layouts, plus one doubled-computed-text landscape case =25 rows. Keyboard wrap, scroll-body space, no document overflow and Escape/opener/scroll-lock release are checked. The enlarged case also checks that a fresh keyboard focus cycle brings the final link inside the viewport. The final full run follows the social-wrap correction; application source is frozen for it. Computed-font doubling is not certification of every browser zoom/device setting.
- Evidence: [layout matrix](evidence/navigation-lifecycle/navigation-layouts.json), [landscape](evidence/navigation-lifecycle/navigation-landscape.jpg), [enlarged landscape](evidence/navigation-lifecycle/navigation-landscape-enlarged.jpg). Images are mounted fixtures, not the deployed storefront. Unrelated existing polish screenshots refreshed by the broad capture flag were excluded/restored to their verified baseline. A navigation-only capture flag now writes only this task's two final JPGs/matrix; the third JPG preserves the pre-wrap diagnostic during the final full run.
- An earlier full run passed 715/715 on fingerprint `a5bc9e2e4a3099b3f465341a957b92d77171db75fc85fd48fd96500c2e0b113e`, then screenshot review exposed NL05. That pass is superseded as final evidence. The final full suite passed after the wrap correction. Earlier baseline/focus failures and a corrected test-only capture-initializer type error are diagnostic evidence only; no assertion was removed.

A subsequent full run ended714/715, exit 1, and exposed a fixture ordering error in the existing active-navigation assertion: the fixture requested a route, opened the menu and counted its current item before the new React route render was committed (0 rather than1). Loading all79 test modules while running only this journey reproduced it, whereas the isolated13-test pair passed. The fixture now exposes its committed pathname/search/language through its existing React effect; preparatory navigation waits for those values, and the dialog waits for visibility before the same current-item assertion. Intended open-menu route-change/Back/Forward checks remain. The full-module-context journey then passed1/1. The new final full run includes this synchronization; no arbitrary delay, skip, removed assertion or application change is used to mask the ordering issue.

The next full run passed the corrected navigation/purchase journey but ended714/715 because an existing Stage5A timing fixture allowed wall time to run while its initial page loaded. Its first assertion saw Pantry instead of the initial Dry Fruits tab. `tests/stage5a-controlled-clock.test.mjs` now freezes the clock on the blank page before navigation and waits for DOM readiness plus the actual section, so only explicit `runFor` calls advance application timers. Carousel runtime and all interval/hover/visibility/manual-play assertions are retained. The initial-advance probe1/1, complete 11/11 timing suite and final715/715 full regression PASS on this final fixture setup.

## Catalog and release

[Fresh public watermark](evidence/navigation-lifecycle/public-watermark.json): 97 products, same public version as the prior checkpoint. No paths, product IDs, category membership, pricing, availability, stock, metadata or merchant settings are changed. Current private semantic/taxonomy audit remains BLOCKED without an authorized complete merchant snapshot. Public responses do not certify private drafts or merchant intent.

Existing feature Auth/Storage/n8n, accepted-order, private catalog, preview/rollback, photography/factual-content/printing and final release dependencies retain their previous states. No key/configuration, live workflow, role/rules, database, production branch or deployment write.

## R11 and next action

- [x] Bounded scope implemented; broader M20/M21 remains separately tracked.
- [x] Actual baseline and focus/history findings reviewed and corrected in existing components.
- [x] Final automated/affected/browser gates and exact evidence recorded; provider/device limits remain stated.
- [x] Catalog impact/watermark recorded with private/live limits.
- [x] Commerce/privacy/roles/language and existing features retained.
- [x] Master, handoff, testing record and changelog updated.
- [ ] Verified parent/tree, intended source/evidence paths and saved ref read back.

After save: inspect the remaining M20 shop filter/overlay controls in `src/components/CatalogFilterSheet.tsx` and `src/pages/ShopPage.tsx`, selecting a separately bounded safe-area/keyboard/recovery task before implementation. Do not restart this lifecycle work or previously completed stages. Actual provider-dependent integration belongs to the deferred final environment/release work; rotating keys is not verification.

## Exact final commands

All commands use the existing lockfile/dependencies. Browser: separately installed Chromium153.0.8010.0 at `ALLBARKA_TEST_BROWSER=/workspace/scratch/f57ba9a36e75/browser-runtime/bin/chromium`.

- `npm run typecheck` and `npm run lint:hooks` — exit 0.
- `ALLBARKA_SKIP_LOCAL_ENV=true npm run build` — exit 0, privacy84 artifacts. Existing bundle advisory remains.
- With `ALLBARKA_SKIP_LOCAL_ENV=true ALLBARKA_CAPTURE_NAVIGATION=true` and the browser variable: `node --import tsx --test --test-isolation=none tests/interaction-polish-browser.test.tsx tests/stage4-navigation.test.tsx` —13/13, exit 0 before the subsequent fixture synchronization. The final all79-module-context filtered journey passed1/1 after synchronization; the final full suite includes all12 navigation checks as well.
- With `ALLBARKA_SKIP_LOCAL_ENV=true` and the browser variable: `node --test --test-reporter=tap tests/stage5a-controlled-clock.test.mjs` —11/11, exit 0 after the blank-page freeze correction.
- With the same environment and `NODE_OPTIONS=--test-reporter=tap`: `node scripts/run-all-tests.mjs` —715/715,79 files,21 backend,36 production; exit 0. Navigation-only capture rewrites only the final two navigation images and matrix. The saved pre-wrap image remains diagnostic.
- Final diff/relative-link checks and documentation delivery build are recorded before the source save. No external acceptance or production claim is derived from fixtures.
