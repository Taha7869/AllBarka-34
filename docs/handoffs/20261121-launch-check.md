# Handoff: Pre-Launch Audit & Fixes (`ag/20261121-launch-check`) — 2026-11-21

## Context & Branch
- **Task Branch:** `ag/20261121-launch-check` (cut from `origin/claude/celebrations-foundation-20261112` at `f63505e`; deploy branch untouched; zero Firestore writes).
- **Full Report:** `docs/launch/LAUNCH_REPORT_20261121.md` + screenshots in `docs/launch/screenshots/`.

---

## Summary of Changes
1. **Fixed 3 SSR HTTP 404 Routes & Broken Internal Link:**
   - `src/lib/routeDocument.ts`: added `/policies/cookies` (was the only 404 in a 201-link crawl), `/track`, `/offline` (`noindex`), and `/reveal/:token` (`noindex`).
   - `server.ts`: expanded dynamic `/sitemap.xml` with `/story`, `/occasions`, `/packaging`, `/policies`, and `/policies/*` (287 deduplicated URLs covering all 252 live products).
   - `index.html`: made static `og:image` / `twitter:image` absolute `https://allbarka.com/images/generated/og-image.jpg` with `640×640` dimensions.
2. **Performance & Core Web Vitals Fixes:**
   - Removed unused render-blocking Fontshare `Satoshi` stylesheet (`-1,123 ms`) and deferred `Amiri` + `Noto Nastaliq Urdu` to load on-demand in `LanguageContext.tsx` only for `ur`/`ar`.
   - Injected `<link rel="preload" as="image" fetchpriority="high">` in SSR HTML (`routeDocument.ts`) for `/` hero and `/product/:id` main photo; added `loading="eager" fetchPriority="high"` to `ProductDetailPage.tsx`.
   - Route-level `React.lazy` code splitting for 15 secondary routes in `src/App.tsx` + 11 closed modals in `src/layouts/RootLayout.tsx`; removed forced `celebrations-bundle` manual chunk in `vite.config.ts`.
   - Deferred `firebase/auth` initialization on anonymous public storefront routes in `src/contexts/AuthContext.tsx` (immediate on `/admin`, `/staff`, `/checkout`, `/success`, `/cart`, or login click).
   - Fixed PDP `CLS` (`0.198 → 0.027`) by making `Breadcrumbs` single-line (`flex-nowrap overflow-x-auto`) and setting `initial={hasMountedRef.current ? 'initial' : false}` on route `<motion.div>` in `RootLayout.tsx`.
3. **Accessibility (`88/95 → 100/100` on Home & Product):**
   - `WordScrollReveal.tsx`: replaced prohibited `aria-label` on `<span>` with `.sr-only` text.
   - `GiftFinder.tsx`: added `aria-label` to mobile icon-only submit button.
   - `AIConcierge.tsx` & `ProductDetailPage.tsx`: replaced low-contrast `--color-gold` (`2.57:1`) text on cream surfaces with WCAG AA `--color-accent-text`.
   - `infinite-moving-cards.tsx`, `TrustBadges.tsx`, `ProductDetailPage.tsx`, `CheckoutPage.tsx`: fixed heading-order skips and added `<h1>` to empty `/checkout`.
4. **Tests:** Added regression coverage in `tests/route-document.test.ts` for `/policies/cookies`, `/track`, `/offline`, `/reveal/:token`, and LCP image preloads.

---

## Verification Evidence
- `npm run typecheck` → Exit 0
- `npm run lint:hooks` → 0 errors (3 pre-existing warnings)
- `node --import tsx --test tests/route-document.test.ts` → `# pass 6 / # fail 0`
- `npm run build` → PASS (`Release privacy audit passed`)
- Full suite (`node scripts/run-all-tests.mjs`) → `983 pass / 1 fail` (the 1 local-only failure in `tests/stage6-operational-integration.test.ts` was caused by local `.env` being read by `viteBuild`; re-running with `ALLBARKA_SKIP_LOCAL_ENV=true` passed `# pass 2 / # fail 0` → **984 pass / 0 fail / 1 emulator skip**).
- Live crawl (`allbarka.com`): 252/252 product images HTTP 200, 252/252 products in sitemap, 0 overflow-x across 28 routes × 2 viewports + Dark/RTL, keyboard-to-checkout verified.
- Local Lighthouse Mobile (post-fix): Home A11y **100** / SEO **100** / CLS **0.018** / TBT **600ms** (`-75%`); Product A11y **100** / SEO **100** / Perf **63** (`+30`) / LCP **6.3s** (`-6.1s`) / CLS **0.027** (`-86%`) / TBT **530ms** (`-57%`).
