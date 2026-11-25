# AllBarka lessons learned

Newest first. Shape and rules: `.agents/skills/allbarka-lessons-learned/SKILL.md`.

### 2026-11-22 · a11y · Short Urdu pills can fail 44×44 touch-target checks without min-w
- What happened: `tests/premium-browsing-browser.test.tsx` failed `44px targets 360x640/ur/light` after adding allergen filter pills.
- Root cause: pill buttons had `min-h-[44px] px-3.5` but no `min-w-[44px]`, so the two-letter Urdu label `"تل"` (sesame) rendered narrower than 44px.
- Do: always pair `min-h-[44px] min-w-[44px]` (or `min-h-11 min-w-11`) on every interactive pill/chip button across EN/UR/AR.
- Check: `node --import tsx --test tests/premium-browsing-browser.test.tsx`.

### 2026-11-22 · firestore · `getAdminMerchandising` silently falls back to defaults on quota errors
- What happened: live Firestore returned `8 RESOURCE_EXHAUSTED` during a dry-run read, and `getAdminMerchandising()` caught the error and returned `DEFAULT_MERCHANDISING`, which would look like "0 legacy images found".
- Root cause: the helper swallows read errors to keep public pages alive, which is unsafe for CLI audit/migration scripts.
- Do: probe Firestore directly (`preview` + `settings` `.get()`) before calling fallback-swallowing helpers in CLI scripts so quota/auth failures fail loudly.
- Check: `tests/clear-legacy-collection-covers.test.ts`.

### 2026-11-16 · tests · Browser tests fail on any unexpected request
- What happened: adding the demand tracker made four browser acceptance tests fail with `HTTP 404 /api/events` from the static preview.
- Root cause: those tests treat every console error and failed request as a failure, and the preview has no API.
- Do: anything that calls the network on page load must skip `localhost`/`127.*`, or the test harness must stub the route.
- Check: `npm run build` first (the browser tests use `dist`), then the full suite.

### 2026-11-16 · catalogue · Supplier photos carry real tags; named varieties may be placeholders
- What happened: the four "generic" date drafts looked like duplicates, but they came from the owner's supplier photos with real price tags; the named varieties came from web reference rates.
- Root cause: dedupe by name alone ignores where the data came from.
- Do: read `referenceTags` / `referenceRates.basis` before deleting a draft; keep the tagged supplier item and rename it if the variety is known.
- Check: `grep -n referenceTags src/data/catalogIntake*.json`.

### 2026-11-15 · n8n · A 401 can hide a second fault
- What happened: the sheet-to-website workflow got 401 every minute; reading its body showed it also posted to `/order-update` with fields the website rejects.
- Root cause: the workflow was built against an older contract; the sheet route is `/order-status` (`src/lib/sheetStatusCommand.ts`).
- Do: when fixing an integration auth error, also check the request body against the server's validator before saying it is fixed.
- Check: `tests/n8n-sheet-status-payload.test.ts`.

### 2026-11-15 · tests · Stage 5A controlled-clock test can fail under full-suite load
- What happened: `tests/stage5a-controlled-clock.test.mjs` step 10 failed once with "Execution context was destroyed" during the full run; it passed 3 times alone.
- Root cause: not confirmed; the step had no touch input, so the new pull-to-refresh cannot have reloaded it. Most likely timing under load.
- Do: rerun the file alone before treating it as a regression; if it fails twice in full runs, investigate the page reload source.
- Check: `node --import tsx --test tests/stage5a-controlled-clock.test.mjs`.

### 2026-11-15 · ai-chat · "Wait a minute" after 2 messages was Groq, not our limit
- What happened: website chat returned 429 on the 2nd or 3rd message; the UI blamed the customer for sending too fast.
- Root cause: Railway logs showed `providerMs: null` and ~1 s 429s: n8n passed back Groq's per-minute token limit (free tier about 8,000 tokens a minute per model). The prompt carried the whole catalogue (about 5,200 tokens) plus 1,200 reserved reply tokens.
- Do: send only relevant products (`buildBuddySystemInstruction` with `query`); read `AI_CHAT_DIAGNOSTIC` `code` before blaming our limiter; give the guest message back when the provider fails.
- Check: `tests/ai-catalog-relevance.test.ts`, `tests/ai-guest-refund.test.ts`.

### 2026-11-15 · deploy · A push to the work branch is a production deploy
- What happened: Railway service `allbarka-fullstack` follows `claude/celebrations-foundation-20261112`.
- Root cause: source connected on 13 Nov.
- Do: run `/verify` before every push; never push half-done work to that branch.
- Check: `/verify` workflow, step 1.

### 2026-11-14 · files · CRLF and mixed line endings break whole-file rewrites
- What happened: editing `src/pages/ProductDetailPage.tsx` with a text rewrite turned a 4-line change into a 2,500-line diff; the file has `\r\r\n` endings in places.
- Root cause: the file mixes LF, CRLF and CR CR LF.
- Do: edit such files in binary mode with exact-byte anchors; check `git diff --stat` after every edit.
- Check: `git diff --numstat` shows only the lines you meant.

### 2026-11-14 · catalogue · Generator side effects
- What happened: `scripts/generate-catalog-images.mjs` swapped a real product photo for its label art and duplicated an `image:` key in `products.ts`.
- Root cause: the script rewrites `product-media.json` and seed images when it regenerates labels.
- Do: after running any generator, review `git diff` of `src/data/*` and revert unintended changes.
- Check: `npx tsc --noEmit` (catches duplicate keys) and `git diff --stat src/data`.

### 2026-11-13 · counts · Answer "how many products" from the CSV
- What happened: the owner asked for counts several times and got hedged answers.
- Root cause: counts were rebuilt from memory instead of one file.
- Do: run `npx tsx scripts/export-master-list.ts` and quote its numbers; say "live Firestore not checked" only for Firestore.
- Check: `/catalog-count` workflow.


### 2026-11-24 — Windows Node 24 `execFileSync('npx.cmd')` EINVAL & Playwright `fullPage` smooth-scroll sticky header
- **What happened:** (1) Calling `execFileSync('npx.cmd', ...)` directly on Windows Node 24 throws `EINVAL` without `shell: true`. (2) Capturing Playwright `fullPage: true` screenshots after scrolling down to trigger lazy images left the sticky `<header>` stitched mid-page because CSS smooth scrolling had not returned to `window.scrollY === 0`. (3) A static `<link rel="preload" as="image">` for the homepage hero inside `index.html` forced every PDP/Shop route to download the 83 KB Home hero unnecessarily even though `src/lib/routeDocument.ts` already injects route-specific preloads.
- **Rule:** On Windows Node 24, invoke `.cmd` CLIs via `spawnSync(cmdString, { shell: true })`. In screenshot scripts, always reset scroll with `window.scrollTo({ top: 0, left: 0, behavior: 'instant' })` and `waitForFunction(() => window.scrollY === 0)` before `page.screenshot({ fullPage: true })`. Keep route-specific LCP image preloads strictly in `src/lib/routeDocument.ts`, never statically in `index.html`.
- **Check:** `tests/route-document.test.ts` + visual check of `docs/design/*-2a-{desktop,mobile}.png`.


### 2026-11-24 — Unlayered CSS `.footer-links-col ul` overrides Tailwind v4 `hidden`, and `.space-y-1` strict test locator
- **What happened:** (1) Unlayered `.footer-links-col ul { display: grid; }` in `src/styles/boutique.css` overrode Tailwind v4's `@layer utilities` `.hidden`, keeping mobile footer accordions permanently open until visually caught on `home-2b-mobile.png`. (2) Adding `space-y-1` to Footer triggered a Playwright strict-mode collision in `tests/filled-gift-journey-browser.test.tsx:344` (`locator('.space-y-1')`). (3) Test fixtures mocking `AuthContext` may omit newly added optional methods (`ensureAuthReady`).
- **Rule:** When adding Tailwind `hidden sm:block` toggles on refactored sections, check legacy unlayered CSS classes (`boutique.css`) for conflicting `display:` rules and verify collapsed height in Playwright; optional-chain new `useAuth()` helper methods (`ensureAuthReady?.()`); always run the full offline suite to catch strict global test locators.
- **Check:** `tests/filled-gift-journey-browser.test.tsx`, `tests/batch-e-browser.test.tsx`, visual inspection of `docs/design/home-2b-mobile.png`.


### 2026-11-24 — Off-screen mobile `opacity: 0.6` fails Lighthouse `color-contrast`, synchronous mount `getBoundingClientRect` spikes TBT, & `React.lazy` View Transitions
- **What happened:** (1) Setting resting mobile scroll-reveal `opacity: 0.6` made axe-core compute alpha-blended contrast on off-screen sections (`#806326` @ 0.6 over `#fdfbf7` → `2.47:1`), dropping Home Accessibility from 100 to 97. (2) Calling `getBoundingClientRect()` synchronously inside `useEffect` on mount across the hero + 5 Home sections caused a `1,735ms` Style & Layout reflow on mobile Lighthouse. (3) Wrapping a `React.lazy` route (`ProductDetailPage`) directly in `document.startViewTransition` snapshots the loading skeleton unless the chunk is preloaded first. (4) `.catalog-list-card` ("Compact View") only had `@media(min-width:640px)` styles, so toggling Compact View on mobile enlarged cards into single-column blocks. (5) `vite.config.ts` `manualChunks` matched `react-dom` and `react-router` but missed `/react/` (`react/jsx-runtime`), causing Rollup to place `jsx` inside the `motion` chunk so every route eagerly downloaded all 130 KB of `motion` even with zero eager `motion/react` imports.
- **Rule:** Keep resting mobile reveal `opacity: 1` and play a one-shot CSS `@keyframes` (`0.6 → 1` + `8px` rise) when IntersectionObserver (`rootMargin: 0px 0px 15% 0px`) triggers during scroll; never call `getBoundingClientRect()` synchronously on initial mount (`scrollY === 0`); preload lazy destination chunks before `document.startViewTransition` and dynamically assign/clear `view-transition-name` on a single active element; always style `<640px` for list/compact toggles; keep `/react/` and `/scheduler/` inside `react-vendor` in `vite.config.ts` so `motion` stays strictly lazy.
- **Check:** Lighthouse Mobile Home & PDP (`A11y 100`, `CLS < 0.05`, `TBT < 300ms`), `tests/view-transitions.test.ts`, and `375px`/`390px` Playwright audits.


## 2026-11-24 — Unlayered CSS specificity, sticky bar scroll-to-top, and rapid-tap `useSearchParams`
- **Surprises hit:**
  1. Unlayered CSS rules in `src/styles/editorial.css` (imported after Tailwind utilities in `src/main.tsx`) overrode Tailwind `@layer utilities` classes such as `text-[14px]` on `.table-catalog-card > a[lang]` (`font-size: 1.25rem` won) and `hidden` on `.gift-opening ul` (`display: flex` won).
  2. `PdpStickyBuyBar` relied solely on `IntersectionObserver`, which does not fire when jumping straight from below the purchase button back to `y = 0` (`isIntersecting` stays `false → false`), leaving the mobile sticky bar stuck over the top of the page.
  3. Calling React Router 7's `setParams(prev => ...)` twice in rapid succession before React commits the first update reads stale `prev` and reverts the first filter click.
- **Rules to keep:**
  - When toggling visibility or overriding typography on elements styled in `src/styles/editorial.css` or `boutique.css`, check for unlayered selectors first and use matching media-scoped CSS / `data-*` selectors instead of assuming Tailwind utilities will win.
  - Pair `IntersectionObserver` scroll-past triggers with a passive `scroll` fallback check on `getBoundingClientRect().bottom <= 0` so fast scroll-to-top resets cleanly.
  - Keep a synchronized `latestParamsRef` alongside `useSearchParams()` on rapid-tap filter bars (`GiftsHampersDestination`) so consecutive taps never clobber each other.


### 2026-11-24 — Cookie sheet vs AB AI collision, server.ts 128kb JSON limit, and zero-dep EXIF stripping
- **What happened:** (1) `CookieNotice` floated `5.25rem` (84px) up on mobile while `RootLayout` left floating AB AI active simultaneously, causing two overlapping floating controls on first visit; updating `CookieNotice` to anchor cleanly at `0.75rem` and hiding AB AI during `consentUiActive` also required updating the hardcoded CSS shim in `tests/consent-manager-browser.test.tsx`. (2) `server.ts` mounts global `express.json({ limit: '128kb' })` at line 328, so routes handling optional review photo uploads (`POST /api/reviews/submit` & `POST /api/admin/reviews/photo`) must be mounted BEFORE `express.json` with tight route-scoped limits (`64kb` metadata, `2MB` raw photo, `3mb` submit). (3) `sharp` is not in `package.json`, so importing `sharp` in backend code would fail production builds/runtime; binary EXIF/GPS/XMP/comment stripping in `src/lib/reviewImageSanitizer.ts` + browser Canvas WebP resizing in `src/utils/prepareReviewPhoto.ts` delivers strict `<= 1200px` EXIF-free uploads with zero new dependencies.
- **Rules to keep:** Never show two bottom floating overlays simultaneously (hide floating AB AI whenever `consentUiActive` is true); check `package.json` before assuming any native module (`sharp`) is available server-side; mount photo upload / larger-body routers before global `128kb` `express.json` in `server.ts` with route-level limits; when changing `CookieNotice` bottom spacing, update `tests/consent-manager.test.tsx` and `tests/consent-manager-browser.test.tsx` inline CSS shims together.
- **Check:** `tests/reviews-workflow.test.tsx`, `tests/consent-manager-browser.test.tsx` (3/3), `docs/qa/final-bug-list.md`.


### 2026-11-25 — Never use `text-[var(--color-surface)]` or `text-[var(--color-emerald)]` without dark-mode overrides
- **What happened:** In `CheckoutPage.tsx`, dark emerald selected buttons/cards (`bg-[#042821]`) used `text-[var(--color-surface,#FDFBF7)]`, and Step 4 `"Total payable"` used `text-[var(--color-emerald,#042821)]` while the inline Bank box used hardcoded `bg-[#FDFBF7]`. In dark mode (`html.dark`), `--color-surface` resolves to `#1A201E` and `--color-emerald` resolves to `#0E4A3B`, causing unreadable dark-green-on-dark-green text and faint ivory-on-white text on live `allbarka.com`. Also, the quote confirmation banner (`checkout-quote-banner`) and `purchase.checkoutIntro` rendered even when `currentStep === 'success'`.
- **Rule:** On explicitly dark `#042821` backgrounds, always use explicit light ivory text (`text-[#FDFBF7]`), never `var(--color-surface)`. On dark-mode surfaces, pair emerald amounts with `dark:text-[#E8C97A]`. Guard all pre-order checkout chrome (quote banner, stepper, intro eyebrow, draft notice) behind `currentStep !== 'success'`.
- **Check:** `tests/payment-details.test.tsx` + `docs/design/bank-details-20261125/*-dark.png` (contrast >= 8.2:1).
