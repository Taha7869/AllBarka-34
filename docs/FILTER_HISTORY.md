# M20-FILTER1 — same-URL filter history recovery and FH02 reduced-motion transition fix

29 October 2026 (Asia/Karachi). Codex / Antigravity. SELECTED / DONE locally for the bounded same-URL filter history and FH02 reduced-motion focus-containment slice (broader M20 remains SELECTED / IN_PROGRESS for the separate `CatalogFilterSheet.tsx` / `catalog-filters.css` safe-area and focus audit).

Inspected parents: `a594920e62171a934abb946b2e8cc6e9a8ccec0e`, unfinished checkpoint `7a00826106ab8b31f6cc26fe87500047b8477bac`, and security-hardening descendant `898fddeb11cf7b60ced9c352714060e9a72de7ba` on `codex/admin-catalog-foundation-20261023`, draft PR #16. Navigation lifecycle, `SEC01` security hardening, previously completed design/admin work and deferred release boundaries are preserved.

## Acceptance and changes

1. **Same-URL filter history (`M20-FILTER1`):** Navigating Back/Forward between different React Router history entries with identical pathname/query must cancel an open, uncommitted mobile filter draft. The page must release background inert and scroll lock. Forward must not reopen the old sheet, and a fresh sheet must use committed filters. Existing Cancel/Apply, cart, selected portion and 24 responsive/language/theme card checks remain.
   - `src/components/CategoryPLP.tsx` includes `location.key` in the existing draft-cancellation effect. The existing `CatalogFilterSheet.tsx` owns cleanup; no competing modal, history entry, dependency, translation or commerce logic was added.
   - `tests/premium-browsing-browser.test.tsx` extends its existing mounted RootLayout/ShopPage journey with same-URL navigation, Back/Forward, discarded budget, root inert/scroll-lock cleanup and fresh-draft assertions, synchronized on committed router keys.

2. **Enlarged-text mobile navigation focused-link visibility (`FH02`):** At `844×390` landscape (`en`, `light`, `prefers-reduced-motion: reduce`), doubling computed font sizes inside `#mobile-navigation-menu` and cycling focus with `Tab` then `Shift+Tab` must keep the focused last link (`Instagram`) within the viewport (`r.top >= 0 && r.bottom <= innerHeight` at `tests/interaction-polish-browser.test.tsx:169`) and horizontally contained without clipping.
   - `src/index.css` (`@media (prefers-reduced-motion: reduce)` at line 471) changes `transition-duration: 0.01ms !important;` to `transition-duration: 0s !important;`.
   - No test assertions were weakened, removed, delayed or skipped; enlarged text remains 200% and no artificial test scroll was added.

## Reproduction, geometry evidence and review

- **FH01 (resolved, medium):** The previous `CategoryPLP.tsx` effect watched query/category only. A same-URL history traversal kept the filter dialog open and the page inert/scroll-locked (baseline mounted regression FAIL 0/1 waiting for dialog hidden on Back). Fixed by observing `location.key`; affected filter checks PASS 7/7.
- **FH02 (resolved, medium):**
  - **Reproduction:** Reproduced deterministically when running with `ALLBARKA_TEST_BROWSER` (which activates the SwiftShader software-rendering branch `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` in `tests/helpers/browser.mjs:8`), failing `tests/interaction-polish-browser.test.tsx:169` (`AssertionError [ERR_ASSERTION]: false !== true`).
  - **Captured geometry and state (`844×390`, `docLang="en"`, `docDir="ltr"`, `docTheme="light"`, `fixture.language="en"`, `document.fonts.status="loaded"`, `reducedMotion="reduce"`):**
    - *Before 200% text enlargement (1x):* `.overflow-y-auto` scroll container bounds `{ top: 77, bottom: 390, left: 0, right: 339, width: 339, height: 313 }`, `clientHeight: 313`, `scrollHeight: 1137`, `scrollTop: 824`; `links.last()` (`Instagram`) bounds `{ top: 314, bottom: 358, left: 173.5, right: 319, width: 145.5, height: 44 }`, `computedFontSize: "12px"`.
    - *Root cause:* In `src/index.css:471`, `@media (prefers-reduced-motion: reduce)` set `transition-duration: 0.01ms !important` on `*, ::before, ::after`. Because CSS's initial `transition-property` on every element (`*`) is `all`, a non-zero `transition-duration` (`1e-05s > 0s`) turned every DOM element into an active `transition-property: all; transition-duration: 1e-05s` transition target under reduced motion. When `tests/interaction-polish-browser.test.tsx:166` set inline `e.style.fontSize` to 200% on 60 text elements inside `#mobile-navigation-menu`, Chromium started 50 `CSSTransition` animations (`root.getAnimations({ subtree: true }).length === 50`) at `currentTime: 0` instead of updating `getComputedStyle(e).fontSize` synchronously. Under SwiftShader / full-suite load, `Tab` (`first.focus()`) and `Shift+Tab` (`last.focus()` in `MobileMenu.tsx:135`) at line 168 executed before the next compositor `BeginMainFrame` ticked those `0.01ms` transitions. Because `links.last()` was still at its 1x coordinates (`top: 314, bottom: 358 <= 390`), `last.focus()` did not scroll `.overflow-y-auto`. When `BeginMainFrame` then completed the `0.01ms` transitions, `.overflow-y-auto` expanded to `{ top: 81, bottom: 390, clientHeight: 309, scrollHeight: 1538, scrollTop: 1107 }` (instead of `1229`) and the social buttons wrapped onto two rows, pushing `links.last()` to `{ top: 430, bottom: 480, left: 20, right: 319, width: 299, height: 50 }` (`bottom = 480 > innerHeight = 390`). Because `last.focus()` had already executed, nothing scrolled `.overflow-y-auto` afterward, which also explains why a post-focus `waitForFunction` at line 169 timed out in full-suite context. The same `0.01ms` universal transition rule also caused an in-flight identity transform (`matrix(1, 0, 0, 1, 0, 0)` instead of `none`) at `tests/premium-hero-browser.test.tsx:122` when switching to `reducedMotion: 'reduce'`.
    - *After fix (`transition-duration: 0s !important` in `src/index.css:471`):* `root.getAnimations({ subtree: true }).length` is `0` immediately after doubling `fontSize`; `.overflow-y-auto` updates synchronously to `clientHeight: 309, scrollHeight: 1538`; `Shift+Tab` (`last.focus()`) scrolls `.overflow-y-auto` to `scrollTop: 1229`, placing `links.last()` (`Instagram`) at `{ top: 308, bottom: 358, left: 20, right: 319, width: 299, height: 50 }` (`0 <= 308` and `358 <= 390`, `computedFontSize: "24px"`).
- **Self-review (R03):** Reviewed final diff across `src/components/CategoryPLP.tsx`, `src/index.css`, and `tests/premium-browsing-browser.test.tsx`. No independent review claimed. All original keyboard, focus, layout and filter assertions remain intact.

## Live boundary and remaining work

Fresh credential-free GETs of health/readiness/catalog returned 200 ([sanitized report](evidence/filter-history/public-preflight.json)): deployed build `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`, 97 public products, `databaseConnected: true` and `durablePersistenceReady: false`. Four recorded packaging IDs remain inactive with no public price options. No private merchant snapshot, feature Auth/Storage, n8n execution or accepted-order verification is claimed.

No product/taxonomy membership, route, category, stock, price or availability change. Private semantic catalog reconciliation remains BLOCKED; public GETs cannot certify merchant intent or private drafts. No key/config, live data, role/rules/workflow, production branch or deployment mutation.

Remaining core work is grouped into five practical blocks: (1) bounded mobile filter/overlay finishing (`CatalogFilterSheet.tsx` / `catalog-filters.css` safe-area, enlarged-filter and focus audit); (2) private catalog/category reconciliation; (3) feature Auth/staff/content/Storage live verification; (4) n8n/WhatsApp acknowledgement/retry/duplicate and accepted-order execution; (5) final regression, isolated preview/backup/rollback and separately authorized release. Original photography/facts/printing remain merchant dependencies. V5 and unselected M10–M34 proposals are optional and do not automatically block core launch.

## R11 checkpoint

- [x] Bounded same-URL history acceptance and FH02 reduced-motion transition fix implemented; broader mobile-overlay work remains separate.
- [x] Baseline findings FH01 and FH02 reproduced and corrected; intended diff self-reviewed.
- [x] Final gate results recorded honestly: affected tests 23/23 PASS; complete offline suite 721/721 non-skipped PASS (722 total, 1 emulator-only SKIP for `tests/firestore-security.test.mjs`) across 82 test files, plus 21 backend checks, catalog asset audit and 36 production checks PASS.
- [x] Public read-only scope and private catalog/provider limits recorded.
- [x] Commerce/privacy/roles/localization preserved; no new customer copy or data assignments.
- [x] Task/master/handoff/changelog updated with exact resolution and next remaining work.
- [x] Committed and pushed to `codex/admin-catalog-foundation-20261023` with remote head verified.

Next executable action: begin the bounded mobile filter/overlay finishing slice in `src/components/CatalogFilterSheet.tsx` and `src/styles/catalog-filters.css` (safe-area, enlarged-filter layout and focus containment), while keeping private catalog/provider/release gates separate until authorized access is provided.

## Exact local commands

Run from `E:\allbarka 29-10\AllBarka-34-work` on Windows (Node `v24.14.0`, npm `11.9.0`) with `ALLBARKA_SKIP_LOCAL_ENV=true` and `ALLBARKA_TEST_BROWSER` pointing to `chrome-headless-shell.exe` (`145.0.7632.77`) / Chrome (`156.0.8078.73`):

- `npm ci --no-audit --no-fund` — PASS, exit 0 (existing `package-lock.json`).
- `npm run typecheck` — PASS, exit 0.
- `npm run lint:hooks` — PASS, exit 0.
- `npm run build` — PASS, exit 0; build source `dcef90ee88182db0`; privacy audit passed across 84 text artifacts.
- `node --import tsx --test --test-isolation=none tests/interaction-polish-browser.test.tsx` (with `ALLBARKA_TEST_BROWSER` Chrome SwiftShader mode) — PASS 1/1, exit 0 (reproduced FAIL 0/1 at line 169 before `src/index.css` fix).
- `node --import tsx --test --test-isolation=none tests/interaction-polish-browser.test.tsx tests/stage4-navigation.test.tsx tests/premium-browsing-browser.test.tsx tests/catalog-filter-draft.test.ts tests/premium-hero-browser.test.tsx tests/motion-preference.test.tsx` — PASS 23/23, exit 0.
- `NODE_OPTIONS=--test-reporter=tap node scripts/run-all-tests.mjs` — PASS 721/721 non-skipped tests (722 total, 0 fail, 1 emulator-only skip) across 82 test files, 11 pre-suite hardening checks, 21 production backend checks, catalog asset audit (97 products, 115 image references, 111 unique files, 57 single-image WebP selections, 0 missing, 0 retired views) and 36 production checks, exit 0.
