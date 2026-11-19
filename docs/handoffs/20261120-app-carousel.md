# Handoff: Shared Carousel Auto-Slide Hook & PWA Polish (2026-11-20)

## Context & Branch
- **Task Branch:** `ag/20261120-app-carousel` (cut from `origin/claude/celebrations-foundation-20261112` at `b05dffd`).
- **Scope:**
  - **Feature A:** Fix carousels permanently stopping after click/touch by introducing one shared `useCarouselAutoSlide` hook across every carousel (hover/touch pause, 4s auto-resume after release, tab-hidden pause, offscreen pause, reduced-motion off).
  - **Feature B:** PWA polish — offline page + previously viewed products, 4 manifest shortcuts, hardened PDP Web Share + copy fallback, installed standalone bottom tab bar (zero collision with cart bar/chat/consent), and one-time iOS Safari "Add to Home Screen" guide.
- **Note:** Section cover images were intentionally NOT generated per owner instruction (image quota).

---

## What Was Done

### Feature A — Shared Auto-Slide Hook Across All Carousels
- Created `src/hooks/useCarouselAutoSlide.ts` (`DEFAULT_CAROUSEL_RESUME_MS = 4000`, `canCarouselAutoSlide`, `useCarouselAutoSlide`):
  - Pauses on mouse hover (`pointerType === 'mouse'` only, preventing mobile touch from sticking in hover) and resumes on pointer leave.
  - Pauses immediately on click/touch (`pointerdown` / `touchstart`), listens globally for release (`pointerup` / `pointercancel` / `touchend` / `touchcancel`), and automatically resumes **4 seconds** after release.
  - Pauses when the browser tab is hidden (`document.visibilitychange`) and resumes on return.
  - Pauses offscreen via `IntersectionObserver`, pauses on keyboard `:focus-visible` and open modals, and completely disables auto-slide when `prefers-reduced-motion: reduce` is active.
- Wired `useCarouselAutoSlide` into every carousel:
  1. `src/components/CircularCarousel.tsx` (Homepage Bestsellers): fixed root bug by changing Embla `Autoplay` `stopOnInteraction: true` → `stopOnInteraction: false` so Embla never permanently kills autoplay on click/drag, driven cleanly by `useCarouselAutoSlide` + Embla `pointerDown`/`pointerUp`.
  2. `src/components/CategoryCarousel.tsx` (Homepage Categories/Collections): replaced manual 8s/visibility/hover timers with `useCarouselAutoSlide` (4s resume).
  3. `src/components/ui/infinite-moving-cards.tsx` (Homepage Testimonials): replaced CSS-only hover pause with `useCarouselAutoSlide` controlling `animationPlayState`, pauses when review modal opens, pauses on touch + resumes after 4s, pauses when tab hidden, and disables `animate-scroll` + duplicate cloning under `prefers-reduced-motion`.
  4. `src/components/Carousel.jsx` (Distinctions carousel): migrated `setInterval` autoplay to `useCarouselAutoSlide` with 4s pause on manual nav/dots/drag.

### Feature B — App (PWA) Polish
1. **Offline Page & Previously Viewed Products:**
   - Added `/offline` route in `src/App.tsx` rendering `src/pages/OfflinePage.tsx`: trilingual (EN/UR/AR, RTL, dark mode) offline notice, Retry button, Bag link, and **Previously Viewed Products** read from `useCatalogActivity()` (`allbarka_recent_v1`) matched against the local catalog (with signature boutique fallback if none viewed yet).
   - Added `src/components/OfflineStatusBar.tsx` in `src/layouts/RootLayout.tsx` showing a slim non-intrusive offline indicator linking to `/offline` whenever `!useOnlineStatus()`.
   - Added CSP-compliant script-free `public/offline.html` (EN/UR/AR, light/dark) and updated `public/sw.js` (`allbarka-static-v2`) to precache `/offline.html` and fall back `/` → `/offline.html` on offline navigation while strictly bypassing `/api/`, `/checkout`, `/admin`, `/staff`, and non-GET requests.
2. **Manifest Shortcuts (`public/manifest.webmanifest`):**
   - Added 4 shortcuts: **Shop** (`/shop`), **Gifting** (`/gifting`), **Track order** (`/track`), and **Bag** (`/cart`).
3. **PDP Share Button (`src/pages/ProductDetailPage.tsx`, `src/lib/pwa.ts`):**
   - Added `shareProductLink` (Web Share API with title/text/url → automatic fallback to `navigator.clipboard.writeText` → `execCommand('copy')` → manual fallback) and wired `handleShare` with 3s confirmation reset and `min-h-[44px]` touch target (`data-pdp-share-btn`).
4. **Standalone Bottom Tab Bar (`src/components/StandaloneTabBar.tsx`, `src/layouts/RootLayout.tsx`):**
   - Shown ONLY in installed PWA standalone mode (`isStandaloneDisplayMode` / `useStandaloneMode`), hidden on admin/staff/checkout/modals/PDP buy bar.
   - 5 tabs (EN/UR/AR, RTL, dark mode, `min-h-[48px]`): **Home**, **Shop**, **Gifting**, **Bag** (with live count badge), and **Account**.
   - Coordinates with `RootLayout`: hides `StickyCartBottomBar` (no double bottom bars), shifts `AIConcierge`, `BackToTop`, and `CookieNotice` (`hasTabBar`) cleanly above the tab bar, and reserves bottom scroll spacer so footer links stay clickable.
5. **One-Time iOS Safari "Add to Home Screen" Guide (`src/components/PwaInstallBanner.tsx`, `src/lib/pwa.ts`):**
   - `isIosSafari()` matches strictly iOS/iPadOS Safari when not already standalone (excludes CriOS, FxiOS, OPiOS, EdgiOS, Android, Desktop).
   - Displays a compact trilingual 2-step guide (Share → Add to Home Screen) once; dismissal persists in `allbarka_ios_a2hs_dismissed` (also added to `STORAGE_INVENTORY` in `src/lib/consent.ts` so `/policies/cookies` stays accurate).

---

## Verification Evidence
- `node --import tsx --test tests/app-carousel-pwa.test.tsx tests/app-carousel-pwa-browser.test.tsx tests/pwa-manifest.test.ts tests/circular-carousel.test.tsx tests/pantry-motion.test.tsx tests/consent-manager.test.tsx` → `# pass 23 / # fail 0` (unit + SSR + real Chromium `390×844` mobile touch browser test).
- `npm run typecheck` → Exit 0.
- `npm run build` (including `scripts/audit-release.mjs`) → Exit 0 (`Release privacy audit passed (89 text artifacts; no private values printed)`).
- Full offline suite (`node scripts/run-all-tests.mjs`):
  - Unit & browser suite: `982 pass / 1 fail / 1 emulator skip` — the single failure (`tests/dev-server.test.mjs:54`, `'SIGTERM' !== null`) is the pre-existing Windows process-signal quirk unrelated to this task.
  - `tests/run-backend-tests.mjs` → `21 PASSED, 0 FAILED`.
  - `scripts/verify-catalog-assets.ts` → `97 products, 115 image references (111 unique files); 0 missing files, 0 retired views` (PASS).
  - `scripts/verify-production.mjs` → `36/36 PASS` (ALL production checks passed!).

---

## Files Added / Changed
- Added: `src/hooks/useCarouselAutoSlide.ts`, `src/lib/pwa.ts`, `src/pages/OfflinePage.tsx`, `src/components/OfflineStatusBar.tsx`, `src/components/StandaloneTabBar.tsx`, `public/offline.html`, `tests/app-carousel-pwa.test.tsx`, `tests/app-carousel-pwa-browser.test.tsx`, `docs/handoffs/20261120-app-carousel.md`
- Modified: `src/components/CircularCarousel.tsx`, `src/components/CategoryCarousel.tsx`, `src/components/ui/infinite-moving-cards.tsx`, `src/components/Carousel.jsx`, `src/components/PwaInstallBanner.tsx`, `src/components/CookieNotice.tsx`, `src/layouts/RootLayout.tsx`, `src/pages/ProductDetailPage.tsx`, `src/App.tsx`, `src/lib/consent.ts`, `public/manifest.webmanifest`, `public/sw.js`, `tests/pwa-manifest.test.ts`, `docs/COMPONENTS_INVENTORY.md`, `docs/PENDING_WORK.md`
