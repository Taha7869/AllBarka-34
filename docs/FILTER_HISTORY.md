# M20-FILTER1, FH02 & M20-FILTER2 — mobile filter history, reduced-motion focus and filter sheet finishing

30 October 2026 (Asia/Karachi). Codex / Antigravity. SELECTED / DONE locally for the bounded mobile filter history (`M20-FILTER1`), reduced-motion navigation focus (`FH02`) and mobile filter sheet safe-area, enlarged-text and focus lifecycle pass (`M20-FILTER2`).

Inspected parents: `a594920e62171a934abb946b2e8cc6e9a8ccec0e`, unfinished checkpoint `7a00826106ab8b31f6cc26fe87500047b8477bac`, security-hardening descendant `898fddeb11cf7b60ced9c352714060e9a72de7ba`, and `M20-FILTER1 + FH02` checkpoint `d13577b57fac813e76e9ed156691c3a4aa7dbfeb` on `codex/admin-catalog-foundation-20261023`, draft PR #16. Navigation lifecycle, `SEC01` security hardening, previously completed design/admin work and deferred release boundaries are preserved.

## Acceptance and changes

1. **Same-URL filter history (`M20-FILTER1`):** Navigating Back/Forward between different React Router history entries with identical pathname/query must cancel an open, uncommitted mobile filter draft. The page must release background inert and scroll lock. Forward must not reopen the old sheet, and a fresh sheet must use committed filters. Existing Cancel/Apply, cart, selected portion and 24 responsive/language/theme card checks remain.
   - `src/components/CategoryPLP.tsx` includes `location.key` in the existing draft-cancellation effect. The existing `CatalogFilterSheet.tsx` owns cleanup; no competing modal, history entry, dependency, translation or commerce logic was added.
   - `tests/premium-browsing-browser.test.tsx` extends its existing mounted RootLayout/ShopPage journey with same-URL navigation, Back/Forward, discarded budget, root inert/scroll-lock cleanup and fresh-draft assertions, synchronized on committed router keys.

2. **Enlarged-text mobile navigation focused-link visibility (`FH02`):** At `844×390` landscape (`en`, `light`, `prefers-reduced-motion: reduce`), doubling computed font sizes inside `#mobile-navigation-menu` and cycling focus with `Tab` then `Shift+Tab` must keep the focused last link (`Instagram`) within the viewport (`r.top >= 0 && r.bottom <= innerHeight` at `tests/interaction-polish-browser.test.tsx:169`) and horizontally contained without clipping.
   - `src/index.css` (`@media (prefers-reduced-motion: reduce)` at line 471) changes `transition-duration: 0.01ms !important;` to `transition-duration: 0s !important;`.
   - No test assertions were weakened, removed, delayed or skipped; enlarged text remains 200% and no artificial test scroll was added.

3. **Mobile filter sheet reachability, 200% enlarged text, safe-area spacing and focus lifecycle (`M20-FILTER2`):**
   - **Reachability, wrapping, 44px targets and safe-area spacing (`src/styles/catalog-filters.css`, `src/components/CatalogFilterSheet.tsx`):**
     - Bounded `.catalog-filter-heading` (`max-height: 28vh; max-height: 28dvh; overflow-y: auto`) and `.catalog-filter-actions` (`max-height: 38vh; max-height: 38dvh; overflow-y: auto`), converted typography from fixed `px` to `rem` / `clamp(1.25rem, 4.5vh, 1.6875rem)`, and refined `@media (max-height: 660px)` and `@media (max-height: 540px)` spacing so `.catalog-filter-scroll` retains generous scroll height and `Cancel`/`Apply` stay reachable inside the viewport on short screens (`844×390`, `768×600`, `360×640`) and at 200% text enlargement.
     - Added flex wrapping (`flex-wrap: wrap`) and `overflow-wrap: anywhere` to `.catalog-filter-group-top`, `.catalog-filter-saved-label`, and `.catalog-filter-actions > div` (`flex: 1 1 104px` on `Cancel`, `flex: 2 1 176px` on `Apply`), plus `min-width: 44px; min-height: 44px` across interactive buttons/chips/range/selects and `>= 48px` toggle labels.
     - Wrapped `<span>{t('shop.saved')}</span>` inside `.catalog-filter-saved-label` so `<bdi>({savedCount})</bdi>` is a sibling rather than a descendant of an element with a direct text node, preventing 400% nested font scaling (`52px` instead of `26px`) when 200% text-enlargement scripts iterate text-bearing nodes.
     - Preserved `env(safe-area-inset-bottom, 0px)` with `--catalog-safe-area-bottom` fallback (`padding-bottom: calc(14px + var(--catalog-safe-area-bottom, env(safe-area-inset-bottom, 0px)))`, and `8px + ...` under `@media (max-height: 540px)`). Automated Chromium tests verify both default `0px` and simulated `34px` safe-area insets; physical iOS/Android device safe-area verification remains separate and unrun.
   - **Initial focus, `Tab`/`Shift+Tab` containment and focus visibility (`src/components/CatalogFilterSheet.tsx`):**
     - Guarded `requestAnimationFrame` initial focus with `if (!dialog?.contains(document.activeElement)) close.current?.focus()` so an early user or keyboard interaction inside the sheet is never stolen.
     - Added `ensureVisible` (`scrollIntoView({ block: 'nearest', inline: 'nearest' })` on `focusin` and `Tab`/`Shift+Tab` wrap) so focused controls (and enclosing `.catalog-filter-toggles label` rows) stay visible inside `.catalog-filter-scroll` and the viewport.
   - **Dismissal, staged reset, desktop resize and route-change focus restoration (`src/components/CatalogFilterSheet.tsx`):**
     - `Escape`, `Cancel` and `.catalog-filter-backdrop` click discard uncommitted drafts; `Reset choices` remains staged in `filterDraft` until `Apply` commits it.
     - Unmount cleanup always releases scroll lock and restores `#root.inert`. Focus restoration skips when `window.location.pathname !== initialPath` (never stealing focus from a new route) or when focus has already moved to another element outside the sheet, and otherwise restores focus to the opener or a visible `.catalog-quick-controls` / `header` control (covering touch-opened sheets and `>= 1024px` desktop resize).

## Reproduction, geometry evidence and review

- **FH01 (resolved, medium):** The previous `CategoryPLP.tsx` effect watched query/category only. A same-URL history traversal kept the filter dialog open and the page inert/scroll-locked (baseline mounted regression FAIL 0/1 waiting for dialog hidden on Back). Fixed by observing `location.key`; affected filter checks PASS.
- **FH02 (resolved, medium):**
  - **Reproduction:** Reproduced deterministically when running with `ALLBARKA_TEST_BROWSER` (which activates the SwiftShader software-rendering branch `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` in `tests/helpers/browser.mjs:8`), failing `tests/interaction-polish-browser.test.tsx:169` (`AssertionError [ERR_ASSERTION]: false !== true`).
  - **Captured geometry and state (`844×390`, `docLang="en"`, `docDir="ltr"`, `docTheme="light"`, `fixture.language="en"`, `document.fonts.status="loaded"`, `reducedMotion="reduce"`):**
    - *Before 200% text enlargement (1x):* `.overflow-y-auto` scroll container bounds `{ top: 77, bottom: 390, left: 0, right: 339, width: 339, height: 313 }`, `clientHeight: 313`, `scrollHeight: 1137`, `scrollTop: 824`; `links.last()` (`Instagram`) bounds `{ top: 314, bottom: 358, left: 173.5, right: 319, width: 145.5, height: 44 }`, `computedFontSize: "12px"`.
    - *Root cause:* In `src/index.css:471`, `@media (prefers-reduced-motion: reduce)` set `transition-duration: 0.01ms !important` on `*, ::before, ::after`, creating 50 `CSSTransition` animations when 200% inline font sizes were applied on `#mobile-navigation-menu` so `Shift+Tab` (`last.focus()`) ran against 1x geometry before `.overflow-y-auto` expanded to `scrollHeight: 1538` and pushed `Instagram` to `top: 430, bottom: 480 > 390`.
    - *After fix (`transition-duration: 0s !important` in `src/index.css:471`):* `root.getAnimations({ subtree: true }).length` is `0` immediately after doubling `fontSize`; `Shift+Tab` (`last.focus()`) scrolls `.overflow-y-auto` to `scrollTop: 1229`, placing `links.last()` (`Instagram`) at `{ top: 308, bottom: 358, left: 20, right: 319, width: 299, height: 50 }` (`0 <= 308` and `358 <= 390`, `computedFontSize: "24px"`).
- **MF01–MF04 (`M20-FILTER2`, resolved, medium):**
  - **MF01 (short-screen & 200% enlarged-text scroll collapse + 400% nested `<bdi>` scaling):**
    - *Reproduced baseline (`d13577b57fac813e76e9ed156691c3a4aa7dbfeb`):* At `844×390` (`en`, 200% text, zero-results status), `.catalog-filter-heading` consumed `131px` and `.catalog-filter-actions` consumed `177px`, leaving `.catalog-filter-scroll` with `clientHeight: 81px` (`scrollHeight: 850px`), and `<bdi>({savedCount})</bdi>` inside `.catalog-filter-saved-label` was double-scaled to `52px` (`4x` instead of `2x`) because its parent `<span>` also held a direct text node. At `360×640` (`en`, 200% text), `.catalog-filter-heading` consumed `252px` and `.catalog-filter-actions` consumed `222px`, leaving `clientHeight: 114px`. See [baseline before screenshot](evidence/filter-history/filter-sheet-landscape-enlarged-before.jpg).
    - *After fix:* At `844×390` (`en`, 200% text, zero-results status), `.catalog-filter-heading` is `94px`, `.catalog-filter-actions` is `134px` (`bottom: 390 <= 390`), `.catalog-filter-scroll` `clientHeight` doubles to `161px` (`193px` in `ur`/`ar`), and `doubleScaled` is `0`. At `360×640` (`en`, 200% text), `.catalog-filter-heading` is `179px`, `.catalog-filter-actions` is `190px` (`bottom: 640 <= 640`), and `.catalog-filter-scroll` `clientHeight` increases from `114px` to `245px` (`248px` in `ur`, `281px` in `ar`). Even with an additional simulated `34px` safe-area inset (`--catalog-safe-area-bottom: 34px`, `paddingBottom >= 42px`), `scrollClientHeight` remains `> 120px` and all controls + `Cancel`/`Apply` remain reachable inside the viewport. See [corrected after screenshot](evidence/filter-history/filter-sheet-landscape-enlarged-after.jpg).
  - **MF02 (initial focus stealing early user interaction):**
    - *Reproduced baseline:* Focusing `input[type="range"]` immediately after opening the sheet (`beforeRaf: 'INPUT:range'`) was overwritten on the next animation frame by `close.current?.focus()` (`afterRaf: 'BUTTON:button'`).
    - *After fix:* `if (!dialog?.contains(document.activeElement)) close.current?.focus()` preserves early focus (`beforeRaf: 'INPUT:range'`, `afterRaf: 'INPUT:range'`).
  - **MF03 (`Tab`/`Shift+Tab` containment and focused control visibility):**
    - *After fix:* `ensureVisible` scrolls focused controls (and enclosing `.catalog-filter-toggles label` rows) with `scrollIntoView({ block: 'nearest', inline: 'nearest' })` on `focusin` and `Tab`/`Shift+Tab` wrap; cycling `Tab` across all controls at 200% text enlargement keeps every active control within the sheet and viewport (`r.top >= -1 && r.bottom <= innerHeight + 1`).
  - **MF04 (touch-open / desktop-resize / route-change focus restoration):**
    - *Reproduced baseline:* Opening the sheet without prior button focus (`document.activeElement === document.body`) and pressing `Escape` or resizing to desktop (`1280×900`) left `document.activeElement` on `BODY` instead of restoring focus to a visible control; route changes while open still invoked `previous.focus()`.
    - *After fix:* Touch-like open followed by `Escape`/`Cancel` and desktop resize (`1280×900`) both restore focus to the visible `.catalog-quick-controls button[aria-controls]` control (`getClientRects().length > 0`) while releasing `#root.inert` and scroll lock; route changes (`/shop/nuts` -> `/shop/dates`) release `#root.inert` and scroll lock without stealing focus onto the filter trigger.
- **Self-review (R03):** Reviewed final diff across `src/components/CatalogFilterSheet.tsx`, `src/styles/catalog-filters.css`, `src/components/CategoryPLP.tsx`, `src/index.css`, and `tests/premium-browsing-browser.test.tsx`. No independent review claimed. All original keyboard, focus, layout and filter assertions remain intact.

## Live boundary and remaining work

Fresh credential-free GETs of health/readiness/catalog returned 200 ([sanitized report](evidence/filter-history/public-preflight.json)): deployed build `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`, 97 public products, `databaseConnected: true` and `durablePersistenceReady: false`. Four recorded packaging IDs remain inactive with no public price options. No private merchant snapshot, feature Auth/Storage, n8n execution or accepted-order verification is claimed.

**Catalog audit (`R04`):** No product/taxonomy membership, route, category, stock, price or availability change belongs to this UI task. Offline catalog asset audit passes (97 products, 115 references, 111 unique files, 0 missing, 0 retired views). Private semantic Firestore catalog reconciliation remains `BLOCKED` pending authorized live credentials; unavailable private data does not block independent UI verification. No key/config, live data, role/rules/workflow, production branch or deployment mutation occurred. Keep `SEC01` security/credential-rotation gates recorded in [SECURITY_HARDENING.md](SECURITY_HARDENING.md).

Remaining core work is grouped into four practical blocks: (1) private catalog/category reconciliation (`R04`) and `SEC01` live credential rotation/provider configuration; (2) feature Auth/staff/content/Storage live verification; (3) n8n/WhatsApp acknowledgement/retry/duplicate and accepted-order execution; (4) final regression, isolated preview/backup/rollback and separately authorized release. Original photography/facts/printing remain merchant dependencies. V5 and unselected M10–M34 proposals are optional and do not automatically block core launch.

## R11 checkpoint

- [x] Bounded `M20-FILTER1`, `FH02` and `M20-FILTER2` mobile filter sheet finishing implemented and verified.
- [x] Baseline findings `FH01`, `FH02` and `MF01`–`MF04` reproduced and corrected with before/after evidence; intended diff self-reviewed.
- [x] Final gate results recorded honestly: affected tests PASS; complete offline suite **721/721 non-skipped PASS** (722 total, 0 fail, 1 emulator-only SKIP for `tests/firestore-security.test.mjs` when `FIRESTORE_EMULATOR_HOST` is unset; verified separately under `SEC01`) across 82 test files, plus 11 pre-suite hardening checks, 21 backend checks, catalog asset audit and 36 production checks PASS.
- [x] Simulated CSS safe-area checks (`--catalog-safe-area-bottom: 34px`) distinguished from physical-device verification; public read-only scope and private catalog/provider limits recorded.
- [x] Commerce/privacy/roles/localization preserved; no new customer copy or data assignments.
- [x] Task/master/instructions/handoff/changelog updated with exact resolution and next remaining work.
- [x] Committed and pushed to `codex/admin-catalog-foundation-20261023` with remote head verified.

Next executable action: when authorized provider/environment access is supplied, execute the `SEC01` live credential/rules/n8n header rollout and private Firestore catalog/category reconciliation (`R04`), or select the next independent offline feature slice from `MASTER_PLAN.md`.

## Exact local commands

Run from `E:\allbarka 29-10\AllBarka-34-work` on Windows (Node `v24.14.0`, npm `11.9.0`) with `ALLBARKA_SKIP_LOCAL_ENV=true` and `ALLBARKA_TEST_BROWSER` pointing to `chrome-headless-shell.exe` (`145.0.7632.77`):

- `npm run typecheck` — PASS, exit 0.
- `npm run lint:hooks` — PASS, exit 0.
- `npm run build` — PASS, exit 0; build source `1d70761420fcdaf0`; privacy audit passed across 84 text artifacts.
- `node --import tsx --test --test-isolation=none tests/premium-browsing-browser.test.tsx tests/catalog-filter-draft.test.ts tests/interaction-polish-browser.test.tsx` — PASS 8/8, exit 0.
- `NODE_OPTIONS=--test-reporter=tap node scripts/run-all-tests.mjs` — PASS 721/721 non-skipped tests (722 total, 0 fail, 1 emulator-only skip) across 82 test files, 11 pre-suite hardening checks, 21 production backend checks, catalog asset audit (97 products, 115 image references, 111 unique files, 57 single-image WebP selections, 0 missing, 0 retired views) and 36 production checks, exit 0.
