# AllBarka lessons learned

Newest first. Shape and rules: `.agents/skills/allbarka-lessons-learned/SKILL.md`.

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
