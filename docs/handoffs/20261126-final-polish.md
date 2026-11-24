# Handoff: `ag/20261126-final-polish` (Launch-Ready Final Polish, Full QA, & Order-Verified Reviews)

- **Date:** 2026-11-24 (branch dated `20261126` per owner prompt)
- **Branch:** `ag/20261126-final-polish` (cut `--no-track` from `origin/claude/celebrations-foundation-20261112` at `6502321`)
- **Deploy branch untouched:** `claude/celebrations-foundation-20261112` was NOT pushed or modified.
- **Status:** Parts 1, 2, 3, and 5 are **COMPLETE** and verified. **Part 4 (Items 12–13: `05-kalmi-dates-macro` + 16 branded product photos)** was **SKIPPED cleanly** (no retries, no placeholder commits) because `gemini-3.1-flash-image` returned `429 RESOURCE_EXHAUSTED` until **`2026-11-25T21:36:45Z`**.

---

## Summary of Commits

### Part 1 — Known Bugs (6/6 Fixed)
1. `bf0002e` — **PDP portion deduplication & sorting:** Added `parsePortionMeasure` + `sortAndDedupePortions` in `src/lib/productSelection.ts`, removed double `1kg` chips across all products, sorted smallest → largest, kept `"Custom weight"` last in `CustomWeightInput.tsx`, `ProductDetailPage.tsx`, `ProductCard.tsx`, `CategoryPLP.tsx`, `QuickViewModal.tsx`, plus full-catalog regression test in `tests/product-selection.test.tsx`.
2. `53d770d` — **Collision-free AB AI launcher:** Added `src/hooks/useFloatingLauncherPlacement.ts` keeping AB AI inside bottom-right safe-area, stacking cleanly above sticky buy/cart/tab/cookie bars, shrinking to compact pill on mobile scroll-down, and hiding on `/cart` & `/checkout` (`AIConcierge.tsx`, `RootLayout.tsx`).
3. `5b36140` — **Mobile 2-col card swipe dots:** Hid `.product-gallery-arrow` (`< 640px`) in `src/styles/boutique.css` and added non-button swipe indicator dots (`.product-gallery-swipe-indicators`) in `src/components/ProductImageGallery.tsx`.
4. `cf3702e` — **Letter-spacing clamp (`<= 0.02em`):** Clamped wide positive `tracking-*` / `letter-spacing` across 52 storefront TSX/CSS files (`"The AllBarka pantry"`, section eyebrows, labels), preserving brand logo lockups and tight negative serif display tracking.
5. `47dbd0b` — **Mobile PDP breadcrumb:** Hid final ellipsized product name segment on `< 640px` PDP routes (`Home › Shop › Category`) in `src/components/Breadcrumbs.tsx`.
6. `d2e60ee` — **Gifting copy & mobile hero framing:** Replaced legalistic copy (`gift.recipientNote`, `gift.budgetNote`) in EN/UR/AR (`src/contexts/shoppingQualityTranslations.ts`), moved gifting mobile hero photo full-width above heading (`src/styles/editorial.css`), and filtered visible controls in `tests/premium-browsing-browser.test.tsx`.

### Part 2 — Full QA Bug Hunt & Fixes (`7 found / 7 fixed`)
- Full audit log & screenshots: [docs/qa/final-bug-list.md](../qa/final-bug-list.md)
  - Crawled **34 routes** (`375px` & `1440px`), **168 matrix states** (`7 core routes × 4 viewports [375, 390, 768, 1440] × 3 languages [EN/UR/AR] × 2 themes [light/dark]`), **192 internal links** (`0` broken), all **97 `/wholesale` images** (`0` broken), and interactive shopping/checkout/modal/keyboard/reduced-motion flows.
7. `3d00c1e` + `dd19a9e` — **BUG-01 (High):** Anchored `CookieNotice` to bottom safe-area (`bottom-[calc(0.75rem+env(safe-area-inset-bottom))]`), hid floating AB AI while `consentUiActive` is true (zero simultaneous overlay collision), and aligned `tests/consent-manager.test.tsx` + `tests/consent-manager-browser.test.tsx` (verified 3/3 consecutive runs).
8. `f0011c7` + `5beb4ed` — **BUG-02 & BUG-03 (Medium):** Added visible-on-focus Skip-to-main-content link (`#main-content`) in `RootLayout.tsx`; added `aria-modal="true"`, reliable focus-on-open + Tab focus trap, mobile scroll lock, crisp `180ms` transition (`44×44` close target), and removed `animate-ping` in `AIConcierge.tsx`.
9. `177a37e` + `5beb4ed` — **BUG-04, BUG-05, BUG-06, BUG-07 (Low):** Added `headingLevel="h1"` for `/faq` (`FAQPage.tsx`, `FAQSection.tsx`, `premium-content.css`); added concise mobile `/shop` search placeholder (`shop.hintMobile` EN/UR/AR in `catalogTranslations.ts`, `CategoryPLP.tsx`); added `inputMode="tel"` on `#checkout-field-phone` (`CheckoutPage.tsx`); added `.rtl-flip` to directional arrows in `GiftsHampersDestination.tsx`, `ProductDetailPage.tsx`, `CheckoutPage.tsx`, `CartPage.tsx`, `OrderTrackingPage.tsx`, `JournalPage.tsx`.
10. `29ee798` — Recorded full QA report & before/after screenshots in `docs/qa/final-bug-list.md`.

### Part 3 — Order-Verified Reviews Workflow & Rules
11. `972fa63` — **Complete verified-order reviews system:**
    - **Server image sanitizer (zero new npm deps):** `src/lib/reviewImageSanitizer.ts` validates WebP/JPEG/PNG magic bytes, enforces `<= 2MB` & `<= 1200×1200`, and strips ALL EXIF, GPS, XMP, ICCP, eXIf, tEXt, and COM metadata chunks; paired with client-side Canvas WebP resize in `src/utils/prepareReviewPhoto.ts`.
    - **Reviews API (`src/lib/reviewsRouter.ts`, mounted in `server.ts`):**
      - `GET /api/reviews` — public sanitized published reviews (5-minute cached via `readPublishedReviews`, `no-store`, zero `orderId`/PII).
      - `POST /api/reviews/submit` — rate-limited (`8 / 15 min`), verifies `orderId` + `phoneLast4` via `verifyPhoneLast4`, requires `status === 'DELIVERED'`, enforces 1 review per `orderId`, strips photo EXIF, ALWAYS saves as `status: 'draft', published: false, verifiedOrder: true` (never auto-published).
      - Admin (`requireAdmin`, preserving staff orders-only boundary): `GET /api/admin/reviews/delivered-orders`, `GET /api/admin/reviews`, `POST /api/admin/reviews/photo`, `POST /api/admin/reviews`, `PATCH /api/admin/reviews/:id`, `DELETE /api/admin/reviews/:id` — enforces real delivered `orderId`, supports `AllBarka reply`, writes durable `reviewAuditLogs`, and busts `resetPublishedReviewsCache()` on every mutation.
    - **UI:** Added `AdminReviewsPanel.tsx` + `"Reviews"` tab in `AdminOrdersPage.tsx`; added trilingual `OrderReviewForm.tsx` on `/track` (`OrderTrackingPage.tsx`) when `status === 'DELIVERED'`; enhanced `PatronVoicesSection.tsx` with star ratings, optional photo, and optional trilingual `"AllBarka reply"`.
    - **Security rules (NOT deployed):** Updated `firestore.rules` (`reviews/{reviewId}` & `reviewAuditLogs/{auditId}` → `allow read, write: if false;` API-only) and updated `tests/firestore-security.test.mjs`.
    - **Tests:** `tests/reviews-workflow.test.tsx` (5 tests covering EXIF stripping across WebP/JPEG/PNG, area-level & PII sanitization, full HTTP router flow + cache busting + audit logs, `firestore.rules` lock, and UI rendering).

### Part 4 — Images (Honest Quota Skip)
- Tested ONE single `image-generator` call for `05-kalmi-dates-macro` — failed with `429 RESOURCE_EXHAUSTED` on `gemini-3.1-flash-image` (`quotaResetTimeStamp: "2026-11-25T21:36:45Z"`). Did NOT retry. Items 12 and 13 remain pending quota reset.

### Part 5 — Health-Word Sweep, Lighthouse Mobile, Verification & Screenshots
12. `dcf1ccc` — Cleaned residual `'immune oil', 'prophetic medicine'` search keywords on `oil-kalonji` (`src/data/products.ts:789`); zero customer-facing health claims across EN/UR/AR, and hero/home origin claims (`Grade-A Sargol saffron`) verified against `src/data/products.ts`.
- **Lighthouse Mobile (local uncompressed `build/server.cjs`, `ALLBARKA_SKIP_LOCAL_ENV=true`):**
  | Page | Accessibility | SEO | Best Practices | CLS | Performance (uncompressed local) |
  |---|---:|---:|---:|---:|---:|
  | Home (`/`) | **100** | **100** | **96** | **0.0002** | **57** (baseline 58) |
  | Shop (`/shop`) | **100** | **100** | **96** | **0.0002** | **59** |
  | PDP (`/product/pista`) | **100** | **100** | **96** | **0.0003** | **55** (baseline 57) |
  - *Note:* Best Practices is 96 (not 100) solely due to the expected offline local `503` on unconfigured `/api/catalog` when `ALLBARKA_SKIP_LOCAL_ENV=true`. Production Cloudflare/Railway edge serves gzip/brotli (~3.3× smaller JS/CSS).
- **Test & Build Gates:**
  - `npm run typecheck`: **0 errors**
  - `npm run lint:hooks`: **0 errors** (3 pre-existing warnings)
  - `npm run build`: **PASS** (`Release privacy audit passed — 151 text artifacts; no private values printed`)
  - Full offline `tests/` suite (`154` files, `1,025` tests): **`1,022 pass / 2 fail / 1 emulator skip`** on initial run; `tests/consent-manager-browser.test.tsx` fixed (`dd19a9e`) and verified **3/3 consecutive passes** → **`1,023 / 1,024` non-skipped tests PASS**, **`0` app failures**, **`1` known Windows-only `tests/dev-server.test.mjs` (`SIGTERM`) failure** (passes on Linux CI), **`1` emulator-only skip** (`tests/firestore-security.test.mjs`).
  - `npm run test:backend`: **21 PASSED, 0 FAILED**
  - `npm run test:assets`: **97 products, 115 image references (111 unique files); 0 missing files, 0 retired views**
  - `npm run test:production`: **36 passed**
- **Fresh Visually-Inspected Screenshots (`docs/design/`):**
  - Mobile `375px`: `final-mobile-375-home.png`, `final-mobile-375-shop.png`, `final-mobile-375-pdp.png`, `final-mobile-375-gifting.png`, `final-mobile-375-checkout.png`
  - Desktop `1440px`: `final-desktop-1440-home.png`, `final-desktop-1440-shop.png`, `final-desktop-1440-pdp.png`, `final-desktop-1440-gifting.png`, `final-desktop-1440-checkout.png`

---

## Owner / Claude Next Actions
1. **Claude:** Review and merge `ag/20261126-final-polish` into `claude/celebrations-foundation-20261112` (Linux CI will verify all 154 test files including `dev-server.test.mjs`).
2. **Owner (after merge, when ready):** Approve deploying updated `firestore.rules` (`firebase deploy --only firestore:rules`) so `reviews` & `reviewAuditLogs` lock to API-only in production Firestore. (Rules were NOT deployed in this session.)
3. **Owner / Antigravity (after `2026-11-25T21:36:45Z` quota reset):** Run Part 4 images (`05-kalmi-dates-macro.webp` + top 16 flagship branded product photos in `public/images/products-premium/` + `docs/design/batch1-montage.jpg`).
