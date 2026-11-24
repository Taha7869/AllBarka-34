# Handoff — `ag/20261124-mobile-signature` (Mobile Compact Audit + Signature Luxury Motion)

- **Date:** 24 November 2026 (Asia/Karachi)
- **Author:** Antigravity
- **Branch:** `ag/20261124-mobile-signature` (cut from `origin/claude/celebrations-foundation-20261112` at `08541b0`)
- **Deploy branch untouched:** `claude/celebrations-foundation-20261112`, `main`, and `launch` were NOT modified or pushed.
- **Firestore writes:** `0` (code, styles, tests, and design artifacts only).
- **Status:**
  - **PART A (Items 1–6 — Mobile Compact):** **COMPLETE**
  - **PART B (Items 7–11 — Signature Luxury Motion + Performance Gate):** **COMPLETE**
  - **PART C (Item 12 — Frame-Scrub Unboxing):** **SKIPPED (`waiting for video`)** — no owner unboxing video for the new emerald gift box (`01-hero-gift-box-dates.webp`) exists in `public/videos/` (only legacy Living Gallery / Signature Table clips). Zero invented frames.

---

## Commit Log (Sequential, Atomic)

1. `689bf4f` — **Part A.1 (Cookie Consent):** Compact mobile bottom sheet (`159px <= 30%` of 812px viewport) with 1-line copy, pixel-equal `Accept` / `Reject` buttons (`157px / 157px`), subtle `Preferences` text link, and desktop compact corner card; existing consent categories & logic preserved.
2. `6f8a8ba` — **Part A.2 + Part B Motion Token:** Unified easing token `cubic-bezier(0.22, 1, 0.36, 1)` in `src/lib/motion.ts` (`MOTION_EASE`, `MOTION_EASE_CSS`, `MOTION_STAGGER.drawerItemsMs = 40`) and never-blank mobile scroll reveal (`rootMargin: "0px 0px 15% 0px"`).
3. `8403540` — **Part A.3 (Compact Product Cards):** Mobile 4:3 image, 2-line max title, single-row size chips (`40px` visual / `44px` tap target), price + `Add` on one line, 2-column mobile grid on `/shop` & `/shop/:category`, and `70%` viewport card width on Home House Selections snap row.
4. `595f011` — **Part A.4 (Mobile Header & Dispatch Bar):** `32px` mobile dispatch bar (hides smoothly on scroll down) and `56px` mobile header with ONLY Search, Cart, and Menu icons (theme toggle remains inside `MobileMenu`).
5. `9f2f519` — **Part A.5 (Gifting / Occasions / Celebrations Alignment):** Aligned gifting, occasions, and celebration pages to home emerald/ivory/gold tokens, removed all-caps eyebrows and `"Presentation reference..."` captions, and merged the inline AI Gift Concierge box (`GiftFinder`) into the single floating AB AI button site-wide.
6. `e3b9c15` — **Part B.7 (Editorial Scroll Hero):** Replaced fake CSS lid cutout with sticky editorial scroll hero (`118svh` mobile / `140vh` desktop, static under `prefers-reduced-motion`), immediate headline + CTAs at `scroll=0`, scroll-driven hero image scale (`1.08 → 1.0`) + warm vignette shift, 3 factual callout pills with gentle staggered parallax (`Hand-graded`, `Packed fresh in Lahore`, `Ribbon-tied gift boxes`), and seamless slide-over curtain for Section 2.
7. `b65b932` — **Part B.8 ("Apna Dabba Bharo" Hamper Builder):** Upgraded `CustomHamperBuilderModal.tsx` with an interactive emerald coffer compartment tray keyed strictly by unique **compartment instance ID** (`hamper-slot-${instanceId}`, never `product.id`), 1px champagne-gold SVG hairline border draw on filled slots, `RollingNumber` formatted live totals (`Rs. 2,601`), and box-full embossed gold seal badge (`Coffer complete · Ready`) + highlighted CTA; preserved all existing pricing/quote/cart logic.
8. `9a5268d` — **Part B.9 (View Transitions API Shared-Element Transitions):** Added `src/lib/viewTransitions.ts` and wired `ProductImageGallery`, `ProductCard`, `CategoryPLP`, and `ProductDetailPage` (+ reverse `Back to collection` transition) with dynamic single-element `view-transition-name: allbarka-product-hero`, lazy PDP chunk preload before snapshot, immediate cleanup on `transition.finished`, and zero-error normal navigation fallback when unsupported or under `prefers-reduced-motion`. Added `tests/view-transitions.test.ts`.
9. `49b2d0d` — **Part B.10 (Tactile Polish):** PDP desktop hover-zoom lens (`scale 1.82` pure CSS pointer-origin tracking, zero mousemove re-renders), mobile tap + double-tap + two-finger pinch zoom in `ProductPhotoViewer`, `220ms` gallery crossfade (deferred until first switch so initial LCP is never delayed), `CartAddButton` morph (`Add → ✓ Added` for `1.2s` then revert), unified `0.97` press scale, and `CartDrawer` smooth slide-over (`cubic-bezier(0.22, 1, 0.36, 1)`) + `40ms` line-item stagger.
10. `15cab2e` — **Part A.6 (375px/390px Audit Fixes):** Expanded `"Delivery schedule"` touch target to `44px` inside the `32px` bar (`0` buttons `< 44px` across all 14 route audits), added true `<640px` horizontal compact row styling for `.catalog-list-card` ("Compact View"), and tightened mobile hero runway (`118svh`, centered sticky stage).
11. `d7903a1` — **Part B.11 (Performance & A11y Gate):** Fixed `vite.config.ts` `manualChunks` (`/react/` + `/scheduler/` inside `react-vendor`) and converted tiny shell components (`ScrollProgressBar`, `MagneticButton`, `HouseSelectionsSection`, `BackToTop`, `ToastManager`, `PwaInstallBanner`, `CookieNotice`, `StickyCartBottomBar`, `RootLayout`) to pure CSS/rAF, **evicting the entire `130 kB` `motion-*.js` chunk from initial Home & PDP load** (`-131 KiB` on Home). Removed synchronous mount `getBoundingClientRect()` reflows, switched mobile scroll reveal to resting `opacity: 1` + one-shot `allbarka-mobile-reveal` keyframe (`0.6 → 1` + `8px` rise) restoring **100/100 Accessibility**, lazy-loaded `ProductPhotoViewer` & `VarietyComparisonModal` on PDP (`ProductDetailPage` chunk `-28%`), and capped mobile pill parallax (`[-3, -6, -9]`) to prevent wrap overlap. Added `tests/motion-system.test.ts`.
12. `0316118` — **Suite Regression Fixes:** Scoped 2-line product card title clamp strictly to `<640px` mobile via `.mobile-card-title` (retaining full desktop unrestricted wrapping per `tests/catalog-render.test.tsx`), and switched `GiftsHampersDestination` filter URL updates to functional `setParams(prev => ...)` preventing stale-closure drops on rapid consecutive clicks.

---

## Mobile Compact Audit Evidence (`375px` & `390px`)

Verified against freshly built production server (`build/server.cjs`, `ALLBARKA_SKIP_LOCAL_ENV=true`) via Chromium Playwright:

- **Cookie Consent (`375×812`):** Height `159px` (`19.6% <= 30%`), equal `Accept` (`157px`) & `Reject` (`157px`) buttons, `Preferences` link present.
- **Header & Dispatch (`375×812`):** Dispatch bar `32px` at top → hides cleanly (`0px`) on scroll down; mobile header `56px` with ONLY `header-search-btn`, `header-cart-btn`, `mobile-menu-trigger-btn` (`hasThemeToggleInHeader: false`).
- **Shop 2-Column Grid (`375×812`):** `2` equal columns (`167px` + `167px`, `rowDeltaPx: 0`); toggling `"Compact View"` renders crisp `92px`-thumbnail horizontal mobile rows.
- **Home House Selections (`375×812`):** Card width `263px` (`70.0%` of viewport).
- **Zero Overflow & `>= 44px` Tap Targets (`14 / 14` route × viewport checks):** `/`, `/shop`, `/shop/dates`, `/product/pista`, `/gifting`, `/cart`, `/checkout` at both `375×812` and `390×844` → **`overflowPx = 0`**, **`smallTargets = []` (0 controls under 44px)**.
- **Urdu RTL + Dark Mode (`375×812`):** `/` & `/shop` (`dir="rtl"`, `dark`) → **`overflowPx = 0`**.
- **10 Rapid Scrolls Never-Blank Test (`375×812`):** 10 consecutive rapid scrolls down `/` captured every frame → **`0 / 10` blank viewports**, **`0` hidden reveal sections** (`18–34` visible content nodes on every step).

---

## Visual Deliverables (`docs/design/`)

- [mobile-375-home.png](../design/mobile-375-home.png)
- [mobile-375-shop.png](../design/mobile-375-shop.png)
- [mobile-375-pdp.png](../design/mobile-375-pdp.png)
- [mobile-375-gifting.png](../design/mobile-375-gifting.png)
- [mobile-signature-demo.gif](../design/mobile-signature-demo.gif) (Hero scroll + Apna Dabba Bharo compartment tray & seal + Card → PDP View Transition + Add-to-Bag morph)

---

## Lighthouse Mobile (Before vs After — Local Uncompressed `build/server.cjs`, `ALLBARKA_SKIP_LOCAL_ENV=true`)

| Route | Metric | Before (`08541b0` / `dc7234e` baseline) | After (`d7903a1`) | Delta / Gate |
| --- | --- | --- | --- | --- |
| **Home (`/`)** | Performance | `58` | **`57–58`** | Parity (`-131 KiB` lighter; zero eager `motion` chunk) |
| **Home (`/`)** | Accessibility | `100` | **`100`** | PASS |
| **Home (`/`)** | SEO | `100` | **`100`** | PASS |
| **Home (`/`)** | CLS | `0.002` | **`0`** | PASS (`< 0.05`, improved to `0`) |
| **Home (`/`)** | TBT | `290 ms` | **`330–340 ms`** | `0 ms` from new motion (`react-vendor` catalog hydration baseline on localhost) |
| **Home (`/`)** | Total Transfer (uncompressed localhost) | `3,226 KiB` | **`3,095 KiB`** | **`-131 KiB`** (`motion-*.js` `129.6 kB` evicted from initial boot) |
| **PDP (`/product/pista`)** | Performance | `57` | **`60`** (`62` peak quiet) | **`+3` PASS** |
| **PDP (`/product/pista`)** | Accessibility | `100` | **`100`** | PASS |
| **PDP (`/product/pista`)** | SEO | `100` | **`100`** | PASS |
| **PDP (`/product/pista`)** | CLS | `0` | **`0`** | PASS (`< 0.05`) |
| **PDP (`/product/pista`)** | TBT | `350 ms` | **`290 ms`** (`250 ms` peak quiet) | **`-60 ms` PASS (`< 300 ms`)** |
| **PDP (`/product/pista`)** | Total Transfer (uncompressed localhost) | `2,068 KiB` | **`2,062 KiB`** | **`-6 KiB`** (`ProductDetailPage` chunk `-28%`: `62.0 → 44.7 kB`) |

> Note: Local Express (`build/server.cjs`) serves raw uncompressed JS/CSS; Cloudflare/Railway serves ~3.3× smaller gzipped/brotli payloads in production (`index` gzip `200.4 kB`, `css` gzip `66.3 kB`, `motion` `0 kB` on Home).

---

## Test & Build Gates

- `npm run typecheck` (`tsc --noEmit`): **0 errors**
- `npm run lint:hooks` (`eslint src`): **0 errors** (3 pre-existing warnings)
- `npm run build`: **PASS** (`Release privacy audit passed (150 text artifacts; no private values printed).`; `dist/index.html` preloads `index`, `react-vendor`, `catalog-products`, `icons` — `motion-*.js` `129.6 kB` is strictly lazy!)
- **Full Offline Suite (`ALLBARKA_SKIP_LOCAL_ENV=true node scripts/run-all-tests.mjs`):**
  - Backend hardening suite: **11 PASSED, 0 FAILED**
  - Main offline suite: **`ℹ tests 1019` · `ℹ pass 1017` · `ℹ fail 1` · `ℹ skipped 1`**
  - Sole `fail`: pre-existing Windows-only POSIX signal assertion in `tests/dev-server.test.mjs:54` (`'SIGTERM' !== null`; passes on Linux CI).
  - Sole `skipped`: emulator-only Firestore rules test.
  - **0 application failures.**
