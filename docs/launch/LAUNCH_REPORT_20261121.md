# AllBarka Pre-Launch Audit & Fixes Report — 2026-11-21

- **Branch:** `ag/20261121-launch-check` (cut from `origin/claude/celebrations-foundation-20261112` at `f63505e`; deploy branch untouched; zero Firestore writes).
- **Targets Audited:** Live `https://allbarka.com` + local production build (`dist/` + `build/server.cjs`).
- **Screenshots:** `docs/launch/screenshots/` (38 mobile `390×844` and desktop `1440×900` captures across Home, Shop, Categories, Products, Gifting, Cart, Checkout, Track, Policies, Cookie Policy, 404, Offline, Dark Mode, Urdu RTL, and Arabic RTL).

---

## 1. Kya Mila (Audit Findings on Live `allbarka.com`)

### A. Visual, Responsive (390px / 1440px), Dark Mode & RTL Sweep (28 Routes × 2 Viewports + Dark/UR/AR)
- **Passed cleanly:**
  - **0** horizontal overflow (`overflow-x`) issues across all 28 routes on mobile (`390×844`) and desktop (`1440×900`), including Dark Mode, Urdu RTL (`dir="rtl"`, `lang="ur"`), Arabic RTL (`dir="rtl"`, `lang="ar"`), and Dark+RTL combined.
  - **0** broken `<img>` elements rendered on any route.
  - **0** fixed floating bar overlaps (Cookie Notice, Sticky Cart Bar, Standalone Tab Bar, and AI Concierge button clear each other cleanly).
- **Issues found:**
  1. **Empty `/checkout` lacked an `<h1>` heading** (`checkout h1s: 0` — rendered `<h2>Your bag is empty</h2>` instead of `<h1>`).
  2. **Product page breadcrumbs wrapped onto 2 lines on 390px mobile** when `Inter` webfont loaded, pushing the entire page down and causing **`CLS: 0.198`** on `/product/pista`.
  3. **Initial page load `<motion.div>` faded/shifted from `opacity: 0, y: 10`** on first render, delaying first paint and contributing to layout shift.

### B. Broken Links & Product Images Crawl
- **Product images:** Checked **252/252** live catalog product images via HTTP `HEAD` against `https://allbarka.com` → **252 OK, 0 broken** (including all 33 newly published `/images/held-ai-20261120/*.webp` assets!).
- **Internal links:** Crawled **201** unique internal `<a href>` links across the storefront:
  - **200 OK:** 200 links.
  - **Broken (HTTP 404):** **1** link — **`/policies/cookies`** returned HTTP `404` + `X-Robots-Tag: noindex, nofollow` + `<title>Page Not Found — AllBarka</title>` from Express SSR (`src/lib/routeDocument.ts` did not recognize `cookies` in `policySlug`).
- **Additional SSR 404 routes found:** **`/track`** and **`/offline`** (and `/reveal/:token`) also returned HTTP `404` from Express SSR despite having valid React Router screens, causing browser console 404 errors on every direct visit/refresh.

### C. Speed (Lighthouse Mobile — Home `/` & Product `/product/pista`)
- **Live baseline (`allbarka.com`, before fixes):**
  - **Home `/`:** Performance **39**, Accessibility **88**, Best Practices **100**, SEO **100** | FCP `2.2s`, LCP `11.2s`, CLS `0.00`, TBT `2,400ms`, Total `2,889 KiB`.
  - **Product `/product/pista`:** Performance **33**, Accessibility **95**, Best Practices **100**, SEO **100** | FCP `2.2s`, LCP `12.4s`, CLS `0.198`, TBT `1,240ms`, Total `1,988 KiB`.
- **Root causes identified:**
  1. `src/App.tsx` statically imported all 18 route pages (`AdminOrdersPage` 215 KB, `CelebrationsPages` 87 KB + forced 784 KB manual chunk, `ShopPage` 101 KB, `CheckoutPage` 89 KB, `PoliciesPage`, `InfoPage`, etc.) and `RootLayout.tsx` statically imported 11 closed modals.
  2. `AuthContext.tsx` eagerly imported `firebase/auth` (`vendor-firebase` 222 KiB gzip + `firebaseapp.com/__/auth/iframe.js` 93 KiB + `apis.google.com/gapi`) immediately on mount for every anonymous visitor.
  3. Render-blocking unused Fontshare `Satoshi` stylesheet (`~1,123 ms` wasted) + upfront `Noto Nastaliq Urdu` and `Amiri` font CSS loaded even on English visits.
  4. Hero LCP images lacked initial-document `<link rel="preload" as="image" fetchpriority="high">` in SSR HTML, and PDP main image lacked `fetchPriority="high"`.

### D. SEO & Structured Data
- **Live `/robots.txt`:** HTTP 200, valid disallows (`/api/`, `/checkout`, `/cart`, `/success`, `/admin`, `/staff`), points to `https://allbarka.com/sitemap.xml`.
- **Live `/sitemap.xml`:** HTTP 200, **278** unique URLs, **0** duplicates, **252/252 live products included (0 missing)**. However, `/story`, `/occasions`, `/packaging`, `/policies`, and `/policies/*` (including `/policies/cookies`) were missing from `/sitemap.xml`.
- **Structured Data (`application/ld+json`):** Valid `Store` + `WebSite` (with `SearchAction`) on all pages; valid `Product` + `BreadcrumbList` on product pages (both seed products like `pista` and newly published intake products like `murabba-saib`).
- **Open Graph (`index.html`):** Static template had relative `content="/images/generated/og-image.jpg"` (missing `https://allbarka.com` origin and `og:image:width`/`og:image:height`).

### E. Accessibility & Keyboard-to-Checkout
- **Keyboard-only E2E test (no order submission):** Passed — reached `Add to Bag` via Tab/Enter (`29` tabs on `/product/pista`), navigated to `/checkout`, reached all `7` checkout inputs (`0` unlabelled inputs).
- **Unlabelled visible buttons/links across 28 routes:** `0` across general crawl, **1** mobile-only icon submit button in `GiftFinder.tsx` caught by Lighthouse (`button-name`).
- **Lighthouse A11y failures found (Home 88, Product 95):**
  1. `aria-prohibited-attr`: `<span aria-label="A little guidance, before you choose">` in `WordScrollReveal.tsx`.
  2. `button-name`: `<button type="submit">` in `GiftFinder.tsx` hid its text on `<640px` mobile without `aria-label`.
  3. `color-contrast`: `text-[var(--color-gold)]` (`#C7982F`, contrast `2.57:1` on cream `#FFFCF7`) used in `AIConcierge.tsx` launcher badge and `ProductDetailPage.tsx` related-card links instead of WCAG AA `var(--color-accent-text)` (`#806326`, `>= 4.6:1`).
  4. `heading-order`: `<h4>` skipping `<h3>` in `infinite-moving-cards.tsx` (Home) and `TrustBadges.tsx` (PDP); `<h3>` skipping `<h2>` in `ProductDetailPage.tsx` guarantee block.

---

## 2. Kya Theek Kiya (Fixes Implemented on `ag/20261121-launch-check`)

| Area | File(s) Changed | Fix |
| --- | --- | --- |
| **SSR Routes & Broken 404s** | `src/lib/routeDocument.ts`, `tests/route-document.test.ts` | Registered `/policies/cookies` (200), `/track` (200), `/offline` (200, `noindex`), and `/reveal/:token` (200, `noindex`). Verified locally: all return HTTP `200`, zero false 404 console errors. |
| **Sitemap & OG Metadata** | `server.ts`, `index.html` | Added `/story`, `/occasions`, `/packaging`, `/policies`, and `/policies/{shipping,refund,privacy,terms,cookies}` to dynamic `/sitemap.xml` (now **287** deduplicated URLs incl. all 252 products). Updated static `og:image` / `twitter:image` to absolute `https://allbarka.com/images/generated/og-image.jpg` with `640×640` dimensions. |
| **LCP Preloads & Priority** | `src/lib/routeDocument.ts`, `src/pages/ProductDetailPage.tsx` | Injected `<link rel="preload" as="image" fetchpriority="high">` in initial SSR HTML for Home hero (`hero-mobile.webp` / `hero-desktop.webp`) and every Product hero image; added `loading="eager" fetchPriority="high"` to PDP main photo. |
| **Fonts & Render Blocking** | `index.html`, `src/contexts/LanguageContext.tsx` | Removed unused render-blocking Fontshare `Satoshi` stylesheet (`-1,123 ms`). Slimmed initial Google Fonts to `Inter` + `Playfair Display`; `Amiri` + `Noto Nastaliq Urdu` now load automatically on demand when switching to `ur` or `ar`. |
| **Code Splitting & Firebase Defer** | `src/App.tsx`, `src/layouts/RootLayout.tsx`, `src/contexts/AuthContext.tsx`, `vite.config.ts` | Split 15 secondary routes (`ShopPage`, `CheckoutPage`, `AdminOrdersPage`, `StaffOrdersWorkspace`, `CelebrationsPages`, `PoliciesPage`, `InfoPage`, `CartPage`, `OrderSuccessPage`, `JournalPage`, `FAQPage`, `GiftRevealPage`, `OrderTrackingPage`, `OfflinePage`, `NotFoundPage`) and 11 closed modals via `React.lazy`; removed forced `celebrations-bundle` manual chunk; deferred `firebase/auth` initialization on anonymous public storefront routes (immediate on `/admin`, `/staff`, `/checkout`, `/success`, `/cart`, or any login click). |
| **CLS Elimination** | `src/components/Breadcrumbs.tsx`, `src/layouts/RootLayout.tsx` | Made `Breadcrumbs` single-line (`flex-nowrap overflow-x-auto whitespace-nowrap`) so font loading never wraps breadcrumbs; set `initial={hasMountedRef.current ? 'initial' : false}` on route `<motion.div>` and `min-h-screen` on suspense fallback. |
| **Accessibility (100/100)** | `src/components/motion/WordScrollReveal.tsx`, `src/components/GiftFinder.tsx`, `src/components/AIConcierge.tsx`, `src/components/ui/infinite-moving-cards.tsx`, `src/components/TrustBadges.tsx`, `src/pages/ProductDetailPage.tsx`, `src/pages/CheckoutPage.tsx` | Replaced prohibited `aria-label` on `<span>` with `.sr-only` text; added `aria-label` to `GiftFinder` mobile submit button; switched gold label text on light surfaces to `--color-accent-text` (WCAG AA); fixed all heading-order skips (`h4→h3`, `h3→h2`) and added `<h1>` on empty `/checkout`. |

### Before vs After (Lighthouse Mobile)

| Metric | Live Home (Before) | Local Preview Home (After)* | Live Product (Before) | Local Preview Product (After)* |
| --- | ---: | ---: | ---: | ---: |
| **Accessibility** | 88 | **100** | 95 | **100** |
| **SEO** | 100 | **100** | 100 | **100** |
| **Performance** | 39 | **46** | 33 | **63** (+30) |
| **LCP** | 11.2 s | **9.1 s** | 12.4 s | **6.3 s** (-6.1 s) |
| **CLS** | 0.00 | **0.018** | 0.198 | **0.027** (-86%) |
| **TBT** | 2,400 ms | **600 ms** (-75%) | 1,240 ms | **530 ms** (-57%) |
| **Total Bytes** | 2,889 KiB | **2,024 KiB** (-30%) | 1,988 KiB | **1,036 KiB** (-48%) |

*\*Note: Local Lighthouse ran against `vite preview` (which does not inject our Express SSR `<link rel="preload" as="image" fetchpriority="high">` headers or production gzip/brotli compression). Live Railway scores after merge will improve further on LCP and total transfer bytes. Reaching 90+ Mobile Performance on simulated slow 4G will require a Phase 2 refactor to lazy-load the 20 translation dictionaries and 282 KB compiled seed product array (`src/data/products.ts`) instead of shipping them in the initial bundle.*

---

## 3. Kya Owner / Claude Ko Karna Hai (Remaining Pre-Launch Actions)

1. **Claude review & merge `ag/20261121-launch-check`:** Once merged to `claude/celebrations-foundation-20261112`, Railway deploys these SEO, 404, A11y (`100/100`), CLS, and code-splitting fixes live to `allbarka.com`. Re-run Lighthouse Mobile against live `https://allbarka.com/` and `https://allbarka.com/product/pista` post-deploy to record final production gzip + SSR-preload scores.
2. **Owner: Replace placeholder/indicative prices before public ad spend:** All 155 intake products are published with `priceIndicative: true` (Akbar Mandi / reference rates); confirm final retail margins in Admin before scaling paid traffic.
3. **Owner: Real-device & live-channel smoke tests:**
   - Place **1 real test order** (then cancel/archive) on a physical phone to confirm WhatsApp / Google Sheets / n8n order delivery (`N8N-ORDER-COMPAT`).
   - Test voice input on a real mobile phone (`VOICE-02`).
   - Submit `https://allbarka.com/sitemap.xml` in Google Search Console once merged (287 URLs including all 252 products + policies).
4. **Optional Phase 2 speed work (post-launch):** Split `src/data/products.ts` (282 KB seed fallback) and trilingual translation dictionaries into per-language dynamic imports, and compress/resize `og-image.jpg` to `1200×630` for optimal WhatsApp/Facebook preview framing.
