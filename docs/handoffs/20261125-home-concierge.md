# Handoff — Home Concierge Doorway ("Barkat se poochiye")

- **Date:** 2026-11-25 (Asia/Karachi)
- **Branch:** `ag/20261125-home-concierge` (cut `--no-track` from `origin/claude/celebrations-foundation-20261112` `5cc1a0c`; deploy branch untouched)
- **Owner goal:** Add a direct, restrained doorway to Barkat AI chat + voice on the homepage without altering the existing floating AB AI button.

## Summary of Changes

1. **Window event contract (`'allbarka:open-concierge'`)**
   - Added [`src/lib/conciergeEvent.ts`](../../src/lib/conciergeEvent.ts): defines `OPEN_CONCIERGE_EVENT = 'allbarka:open-concierge'`, `normalizeOpenConciergeDetail` (1,000-char cap, strict boolean `autoSend`), `openConcierge`, and active listener tracking (`registerConciergeListener` / `unregisterConciergeListener` / `hasActiveConciergeListener`).
   - Updated [`src/components/AIConcierge.tsx`](../../src/components/AIConcierge.tsx): listens for `'allbarka:open-concierge'` (`detail: { message?: string, autoSend?: boolean }`) alongside existing `OPEN_AI_BUDDY_EVENT`. Opens the dialog, fills input with `message` when `autoSend` is false/omitted, or sends immediately when `autoSend: true` (preserving input if a request is already in flight). Consumes `initialRequest` once via id deduplication so lazy first-open never drops or double-sends events. Existing floating launcher button is untouched.
   - Updated [`src/layouts/RootLayout.tsx`](../../src/layouts/RootLayout.tsx): listens for `'allbarka:open-concierge'` so when `AIConcierge` has not yet lazy-mounted, `RootLayout` mounts it and forwards the pending `{ message, autoSend }` request race-free.

2. **Homepage section "Barkat se poochiye"**
   - Added [`src/components/HomeConciergeSection.tsx`](../../src/components/HomeConciergeSection.tsx) and mounted it in [`src/pages/HomePage.tsx`](../../src/pages/HomePage.tsx) directly after `<PremiumHeroPrototype />` (and before `[data-content-section]` elements so admin section ordering stays intact).
   - Uses AllBarka's premium home design system (`--color-base`, `--color-surface`, `--color-border-accent`, `Playfair Display`, `Inter`, `Amiri`/`Noto Nastaliq Urdu`, `useRevealOnce`/`revealStyle`), zero AI-slop gradients/glows, zero health claims, zero fabricated stats, and Lahore area-level copy only.
   - Includes single-line EN/Roman Urdu + UR + AR intro (`LanguageContext` via [`src/contexts/conciergeTranslations.ts`](../../src/contexts/conciergeTranslations.ts)), 44px text input + Send button, reused `<VoiceInputButton placement="below" />` (fills input via `onTranscript`, gracefully displays compact `503 VOICE_PROVIDER_UNAVAILABLE` error alert + typing fallback without breaking the page), 4 suggestion chips (`"Shaadi ke liye gift box"`, `"Badam ka rate"`, `"Delivery kitne din mein?"`, `"Ajwa khajoor"` — horizontal scroll on 375px, click dispatches `'allbarka:open-concierge'` with `autoSend: true`), and clear AI assistant disclosure.

3. **Tests & Visual Captures**
   - Added [`tests/home-concierge.test.tsx`](../../tests/home-concierge.test.tsx) (3 test blocks: sanitizer unit test, EN/UR/AR SSR a11y + copy-integrity + placement check, and full headless Chromium flow testing lazy/mounted event open+prefill, chip `autoSend`, `VoiceInputButton` transcript fill, `503 VOICE_PROVIDER_UNAVAILABLE` fallback, 375px touch targets/horizontal chip scroll/light+dark parity, and intact floating AB AI button).
   - Saved and visually inspected 8 PNG captures in `docs/design/home-concierge-20261125/` (`section-{375,1440}-{light,dark}.png`, `chat-open-{375,1440}-{light,dark}.png`).

## Verification Evidence

- `npm run typecheck`: **0 errors**
- `npm run lint:hooks`: **0 errors** (3 pre-existing warnings)
- `npm run build`: **PASS** (`AIConcierge` stays lazy `21.90 kB` / `6.84 kB` gzip; `voiceInput` stays lazy `2.00 kB` / `1.04 kB` gzip; `Release privacy audit passed (150 text artifacts; no private values printed).`)
- Targeted suite (`home-concierge`, `premium-home-preview`, `stage5a-homepage`, `voice-concierge`, `concierge-integration`, `premium-hero-browser`, `voice-concierge-browser`, `admin-expansion-content-browser`): **36 pass / 0 fail** (3/3 in `home-concierge.test.tsx`)
- Full offline suite (`ALLBARKA_SKIP_LOCAL_ENV=true`, 155 test files, 1,028 tests): **1,026 pass / 0 app fail** (`1` known Windows-only `tests/dev-server.test.mjs` SIGTERM fail + `1` emulator-only `firestore-security.test.mjs` skip)
- Backend suite (`tests/run-backend-tests.mjs`): **21 PASSED, 0 FAILED**
- Catalog asset audit (`scripts/verify-catalog-assets.ts`): **97 products, 115 image references (111 unique files); 0 missing files, 0 retired views**
- Production checks (`scripts/verify-production.mjs`): **36 passed**
- Contrast & geometry (Chromium, 375px + 1440px, light & dark): **0 `pageErrors`**, `docOverflow: false`, input `44px`, mic `44×44px`, send `44×44px` (`94×44px` desktop), chips `44px`, contrast **`5.5:1`–`15.27:1`** (light) and **`6.91:1`–`15.08:1`** (dark).

## Next Action
- Claude reviews and merges `ag/20261125-home-concierge` into `claude/celebrations-foundation-20261112`.
