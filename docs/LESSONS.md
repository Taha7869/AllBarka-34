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
