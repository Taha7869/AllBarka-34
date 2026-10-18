# AllBarka Renovation — Stage 5A Review Packet & Handoff v5.2

**Document Version:** 5.2.0  
**Date:** October 18, 2026  
**Baseline Git Commit:** `26feaaa` -> `feat/renovation-v2`  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 5A HOMEPAGE, BOUTIQUE SELECTIONS & MERCHANDISING LIFECYCLE COMPLETE & VERIFIED — HALTED AT STAGE 5A COMPLETION GATE**

---

## 1. Stage 5 Scope Boundaries

Stage 5 is split into three discrete, reviewable milestones:
- **Stage 5A (Implemented & Verified Here):** Homepage, Boutique Selections showcase, autoplay lifecycle, and published merchandising integration.
- **Stage 5B (Explicitly Pending):** Dedicated collection/occasion destinations (`/shop/celebration-boxes`, `/shop/deals`, `/gifting`).
- **Stage 5C (Explicitly Pending):** Verified packaging catalog, descriptions, and original studio photography assets.

> [!IMPORTANT]
> **Strict Halt Gate:** Stage 5A is fully implemented and verified. Stage 5B and Stage 5C remain explicitly pending. Zero live production database writes, zero merges to `launch`/`main`, and zero production deployments have occurred. Firestore Emulator remains an outstanding release gate.

---

## 2. Homepage Structure & Section Assembly

The approved 6-part homepage structure is implemented in `src/pages/HomePage.tsx`:

1. **Dry-Fruit-Led Premium Hero (`src/components/AllBarkaHero.tsx`)**:
   - Retains AllBarka's signature high-resolution dry fruit backdrop and heritage branding.
   - **Primary CTA**: "Shop Dry Fruits" (`/shop/dry-fruits`), deep amber gold button.
   - **Secondary CTA**: "Explore Gifts" (`/gifting`), subtle translucent bordered pill.
   - Integrated predictive search and language switcher (`en`, `ur`, `ar`).
2. **Explore Our Collections (`src/components/CategoryCarousel.tsx`)**:
   - Compact destination cards presenting deduplicated customer-facing categories.
   - Dynamic ordering and visibility powered by published admin merchandising settings (`settings.categoryOrder` & `settings.categoryVisibility`).
   - Smooth Embla carousel with reduced-motion support, keyboard arrows, and responsive touch drag.
3. **Boutique Selections (`src/components/BoutiqueSelections.tsx`)**:
   - The **SINGLE** homepage product showcase.
   - Replaced old `ProductSlider` ("Boutique Bestsellers").
   - Old large product grids (`BidBoxesSection` and `DealsPackagesSection`) were permanently removed from `HomePage.tsx` without recreating equivalent grids under other headings.
4. **Find a Gift for Your Occasion (`src/components/FindGiftOccasionSection.tsx`)**:
   - Compact destination links highlighting core blessed occasions, dynamically populated and filtered from published settings (`settings.occasions`):
     - Wedding & Nikkah (`/shop/celebration-boxes?occasion=wedding`, "Nikkah Favors")
     - Umrah & Hajj (`/shop/celebration-boxes?occasion=umrah`, "Tabarruk")
     - Ramadan & Eid (`/shop?occasion=ramadan`, "Festive")
     - Birth & Aqeeqah (`/shop/celebration-boxes?occasion=birth`, "Aqeeqah")
     - Corporate Gifting (`/wholesale`, "Bulk Tiers")
5. **Compact Genuine Feedback & Essential Service Information / FAQ**:
   - Editorial service pillars (`ShieldCheck`, `ThermometerSnowflake`, `Truck`) with "Our Standards" link.
   - `AllBarkaMovingReviews`: Genuine customer feedback carousel showing average ratings, published review counts, and freshness guarantees (no fake claims or invented reviews).
   - `FAQSection`: Compact expandable accordion addressing freshness, vacuum sealing, and wholesale tiers.
6. **Footer**:
   - Rendered globally by `RootLayout.tsx` with updated deduplicated collection links.

---

## 3. Boutique Selections Lifecycle & Settings Integration

### 3.1 Timer Ownership & Exact Timing
- **Separated Timer References**:
  - `autoplayTimerRef`: Owns the active rotation countdown (e.g. 6000ms).
  - `hoverResumeTimerRef`: Owns the post-hover resume delay timer (e.g. 3000ms).
- **Exact First-Advance Timing**:
  - When pointer exits the showcase, `isResumePending` becomes `true` and `hoverResumeTimerRef` starts for 3000ms.
  - While `isResumePending` is active, rotation is strictly paused.
  - After 3000ms, `isResumePending` clears to `false`, and React schedules a fresh 6000ms rotation interval.
  - Total elapsed time from pointer exit to first slide rotation: **exactly 9000ms** (3000ms delay + 6000ms interval).
  - Re-entering the showcase before the 3000ms delay expires cancels `hoverResumeTimerRef`; the full 3000ms delay must restart upon next exit.

### 3.2 Visibility Lifecycle
- Document visibility is tracked reactively via `isDocumentVisible` state (`document.visibilityState === 'visible'`).
- When `document.hidden` becomes true:
  - All rotation and resume timers are canceled.
  - Autoplay does NOT rotate in the background.
- Upon tab return (`document.visibilityState === 'visible'`):
  - A fresh countdown begins without an immediate slide skip or advance.
  - Explicit manual pause states (`isPausedManually`) are strictly preserved across visibility transitions.

### 3.3 Play, Hover & Settings Synchronization
- Clicking "Play" sets `isPausedManually = false` without clearing `isHovered`.
- If the pointer is still hovering inside the showcase when Play is clicked, rotation remains paused until the user leaves the showcase and the 3000ms resume delay completes.
- Asynchronously loaded settings (`autoplay.enabled = false`) immediately pause rotation.
- Rotation is disabled and the control shows paused when:
  - `resolvedTabs.length <= 1` (no rotation possible)
  - `prefers-reduced-motion` is active
  - `autoplay.enabled` is `false`

### 3.4 Merchandising Settings & Catalog Filtering
- `MerchandisingProvider` (`src/contexts/MerchandisingContext.tsx`) exposes `useMerchandisingSettings()`.
- `BoutiqueSelections` resolves showcase tabs from published settings.
- Products are matched against authoritative catalog (`useCatalogProducts()` / `products` prop).
- Filters out inactive (`active: false`), archived (`status: 'archived'`), and out-of-stock (`inStock: false`) products.
- Strictly caps each tab at 3 products maximum.
- Empty tabs (0 active products) are omitted from the tablist; rotation is disabled if 1 or 0 tabs remain.

---

## 4. Test Execution & Verification Evidence

All automated suites, controlled-clock tests, integration tests, TypeScript compilation, React hook linter, production build, and real browser CDP interaction tests passed with zero errors:

| Suite / Check | Command | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Controlled-Clock Lifecycle Suite** | `node --test tests/stage5a-controlled-clock.test.mjs` | **11 passed, 0 failed** (31.6s) | `0` | **VERIFIED:** 11 scenarios using Playwright virtual clock: (1) Initial advance at 6000ms; (2) Sustained hover pauses indefinitely (18000ms); (3) Exact 3000ms resume delay + 6000ms interval = 9000ms first advance; (4) Repeated enter/exit resets delay; (5) Manual pause until Play; (6) Play while hovered maintains hover protection; (7) Hidden document pauses rotation; return restarts fresh countdown without jump; (8) Reduced motion defaults to paused; (9) Asynchronously loaded `enabled = false` pauses rotation; (10) Empty tabs hidden, rotation disabled when <= 1 tab; (11) Unmount cleanup clears all timers without leaks. |
| **Admin Merchandising Integration** | `node --import tsx --test --test-isolation=none tests/stage5a-admin-integration.test.tsx` | **4 passed, 0 failed** (49.5s) | `0` | **VERIFIED:** (1) Admin draft save -> draft isolation -> publish promotion -> public retrieval; (2) `CategoryCarousel` respects published order and visibility; (3) `BoutiqueSelections` filters inactive/unpublished products and caps at 3; (4) `FindGiftOccasionSection` filters hidden occasions and preserves validated routes. |
| **Stage 5A Homepage Unit Tests** | `node --import tsx --test --test-isolation=none tests/stage5a-homepage.test.tsx` | **6 passed, 0 failed** (45.6s) | `0` | **VERIFIED:** 6-part homepage structure, old grid removal, Boutique Selections 5 tabs with verified products, live price reading (zero stored prices), 5 occasion destination routes, category deduplication, and multilingual translations in EN, UR, and AR. |
| **Stage 4 Navigation Regressions** | `node --import tsx --test --test-isolation=none tests/stage4-navigation.test.tsx` | **12 passed, 0 failed** (51.8s) | `0` | **VERIFIED:** Regression check for header taxonomy, disclosure buttons, mobile accordion, RTL/Dark mode, route resolution, occasion matching, and single active indicator. |
| **Stage 3 Pricing & MOQ Regressions** | `node --import tsx --test --test-isolation=none tests/stage3-pricing-moq.test.ts` | **19 passed, 0 failed** (53.2s) | `0` | **VERIFIED:** Rules D1 & D2, food exemption, packaging MOQ, reference markup idempotency, and bid box pricing integrity. |
| **Real Browser CDP Tests** | `node scripts/test-stage5a-homepage.mjs` | **9 passed, 0 failed** (18.2s) | `0` | **VERIFIED:** Real headless Chrome CDP execution on fresh `dist` build: (1) Hero CTAs; (2) Explore Collections cards; (3) Boutique Selections 5 tabs, initial tab 3 cards; (4) Initial tab selected; (5) Old grids absent; (6) Interactive tab switching; (7) Play/Pause toggle; (8) Occasion destination cards; (9) Service pillars, reviews, and FAQ mounted. Captured 6 screenshots. |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** 100% type safety across the entire repository. |
| **React Hook Linter** | `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All hook dependency arrays and rules satisfied. |
| **Production Build Pipeline** | `npm run build` | Full pipeline: Vite client bundle (13.93s) + esbuild server.cjs (870.1kb) + Release privacy audit (84 text artifacts clean). | `0` | **VERIFIED:** Production bundle built cleanly with zero private credential leaks. |

---

## 5. Real Browser Visual Artifacts

Real headless Chrome CDP interaction tests produced the following visual artifacts stored in both the conversation artifact directory (`C:\Users\taha\.gemini\antigravity\brain\f408ee7a-7513-4e1a-b8e1-251273bc99e6`) and the repository artifact directory (`docs/artifacts/`):

| Screenshot Artifact | Repository Path | Description & Verified Visual Criteria |
| :--- | :--- | :--- |
| **`stage5a_homepage_desktop_light.png`** | `docs/artifacts/stage5a_homepage_desktop_light.png` | Desktop light mode view of the dry-fruit hero with brand crest, "Nature's finest, delivered with Pure Elegance", and two CTAs ("Shop Dry Fruits" & "Explore Gifts"). |
| **`stage5a_boutique_selections.png`** | `docs/artifacts/stage5a_boutique_selections.png` | Desktop view of Boutique Selections showing "Single Sourced & Hand Picked" eyebrow, "Boutique Selections" title, Play/Pause control, View Collection link, 5 tab pills, and 3 dry fruit product cards (Pistachio, Almonds, Pine Nuts) with real catalog prices. |
| **`stage5a_homepage_occasions.png`** | `docs/artifacts/stage5a_homepage_occasions.png` | Desktop view of "Find a Gift for Your Occasion" showing 5 compact destination cards with badges and icons, followed by "Quiet luxury, backed by everyday care" service pillars. |
| **`stage5a_homepage_mobile.png`** | `docs/artifacts/stage5a_homepage_mobile.png` | Mobile viewport (390x844) showing clean, responsive header, language switcher, centered brand crest, and stacked CTAs. |
| **`stage5a_homepage_rtl_urdu.png`** | `docs/artifacts/stage5a_homepage_rtl_urdu.png` | Mobile view under Urdu locale (`ur`) with `dir="rtl"`, authentic Nastaliq typography, "خشک میوہ جات دیکھیں" and "تحائف دریافت کریں" CTAs, and mirrored controls. |
| **`stage5a_homepage_dark.png`** | `docs/artifacts/stage5a_homepage_dark.png` | Dark mode view showing high-contrast emerald/charcoal surface, crisp white typography, and gold accent buttons. |

---

## 6. Changed Files Summary

- `src/components/BoutiqueSelections.tsx`: Separated `autoplayTimerRef` and `hoverResumeTimerRef`; implemented 3000ms delay + 6000ms interval = 9000ms first advance; added reactive `isDocumentVisible` lifecycle; preserved `isHovered` on Play; added `products` prop and `data-tab-id` attributes.
- `src/components/CategoryCarousel.tsx`: Connected to `useMerchandisingSettings()`; orders categories by `categoryOrder` and filters out `categoryVisibility: false`.
- `src/components/FindGiftOccasionSection.tsx`: Connected to `useMerchandisingSettings()`; dynamically maps `occasions` and excludes `visible === false`; supports both `id` and `tag` attributes.
- `src/config/merchandising.ts`: Validated canonical collection and occasion routes; configured 5 canonical tabs each with 3 verified product IDs.
- `src/contexts/CatalogContext.tsx`: Supported optional `initialProducts` prop in `CatalogProvider`.
- `src/contexts/MerchandisingContext.tsx`: **New Context.** Created `MerchandisingProvider`, `useMerchandisingSettings`, and `useMerchandisingRefresh`.
- `src/main.tsx`: Mounted `<MerchandisingProvider>` in context hierarchy.
- `src/pages/HomePage.tsx`: Connected to `useMerchandisingSettings()` and passed settings to child components.
- `tests/stage5a-controlled-clock.test.mjs`: **New Test Suite.** 11 controlled-clock tests using Playwright virtual clock covering all timer, hover, visibility, reduced motion, and unmount scenarios.
- `tests/stage5a-admin-integration.test.tsx`: **New Test Suite.** 4 admin draft/publish lifecycle and merchandising integration tests.
- `docs/artifacts/*`: 6 refreshed real browser screenshots.
- `docs/RENOVATION_HANDOFF.md`: Updated to Stage 5A Review Packet v5.2.0.

---

## 7. Stopping Gate & Next Steps

**HALTED AT STAGE 5A REVIEW GATE:**
- **DO NOT** begin Stage 5B (Dedicated collection/occasion destinations) or Stage 5C (Packaging catalog & photography).
- **DO NOT** merge `feat/renovation-v2` into `launch` or `main`.
- **DO NOT** deploy or write live database records.
- Awaiting user review and authorization to proceed to Stage 5B.
