# AllBarka Renovation — Stage 5A Review Packet & Handoff v5.1

**Document Version:** 5.1.0  
**Date:** October 18, 2026  
**Baseline Git Commit:** `65d818c` -> `feat/renovation-v2`  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 5A HOMEPAGE & BOUTIQUE SELECTIONS COMPLETE & VERIFIED — HALTED AT STAGE 5A COMPLETION GATE**

---

## 1. Stage 5 Scope Boundaries

Stage 5 is split into three discrete, reviewable milestones:
- **Stage 5A (Implemented & Verified Here):** Homepage and Boutique Selections.
- **Stage 5B (Explicitly Pending):** Dedicated collection/occasion destinations (`/shop/celebration-boxes`, `/shop/deals`, `/gifting`).
- **Stage 5C (Explicitly Pending):** Verified packaging catalog, descriptions, and original studio photography assets.

> [!IMPORTANT]
> **Strict Halt Gate:** Stage 5A is fully implemented and verified. Stage 5B and Stage 5C remain explicitly pending. Zero live production database writes, zero merges to `launch`/`main`, and zero production deployments have occurred.

---

## 2. Homepage Structure & Section Assembly

The approved 6-part homepage structure has been completely implemented in `src/pages/HomePage.tsx`:

1. **Dry-Fruit-Led Premium Hero (`src/components/AllBarkaHero.tsx`)**:
   - Retains AllBarka's signature high-resolution dry fruit backdrop and heritage branding.
   - **Primary CTA**: "Shop Dry Fruits" (`/shop/dry-fruits`), deep amber gold button.
   - **Secondary CTA**: "Explore Gifts" (`/gifting`), subtle translucent bordered pill.
   - Integrated predictive search and language switcher (`en`, `ur`, `ar`).
2. **Explore Our Collections (`src/components/CategoryCarousel.tsx`)**:
   - Compact destination cards presenting deduplicated customer-facing categories.
   - Smooth Embla carousel with reduced-motion support, keyboard arrows, and responsive touch drag.
3. **Boutique Selections (`src/components/BoutiqueSelections.tsx`)**:
   - The **SINGLE** homepage product showcase.
   - Replaced old `ProductSlider` ("Boutique Bestsellers").
   - Old large product grids (`BidBoxesSection` and `DealsPackagesSection`) were permanently removed from `HomePage.tsx` without recreating equivalent grids under other headings.
4. **Find a Gift for Your Occasion (`src/components/FindGiftOccasionSection.tsx`)**:
   - Compact destination links highlighting 5 core blessed occasions with badges, icons, and descriptions:
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

## 3. Boutique Selections Specification & Behavior

`src/components/BoutiqueSelections.tsx` was custom-built according to the approved design specification:

- **Approved 5-Tab Taxonomy**:
  1. `dry-fruits`: "Dry Fruits & Nuts" (`/shop/dry-fruits`)
  2. `pantry`: "Dates & Pantry Essentials" (`/shop/essentials`)
  3. `gifts`: "Luxury Hampers & Gift Boxes" (`/gifting`)
  4. `celebration-boxes`: "Celebration Bid Boxes" (`/shop/celebration-boxes`)
  5. `deals`: "Value Bundles & Deals" (`/shop/deals`)
- **Admin-Selected Curated Products**:
  - Exactly 3 active, verified products per tab configured in `src/config/merchandising.ts`:
    - `dry-fruits`: `['pista', 'badam', 'pine-nuts']`
    - `pantry`: `['khajoor', 'oil-blackseed', 'org-honey']`
    - `gifts`: `['bundle-silver-hamper', 'deal-1', 'deal-2']`
    - `celebration-boxes`: `['bid-box-card-nikkah', 'bid-box-luxury-tin', 'bid-box-umrah-tabarruk']`
    - `deals`: `['deal-1', 'deal-2', 'bundle-daily-grind']`
  - Inactive/unpublished products are automatically filtered out.
  - Never duplicates products to fill slots; hides empty tabs.
  - Zero fake bestseller claims.
- **Autoplay State Machine**:
  - Default autoplay interval: 6000ms.
  - Pause throughout pointer hover; resumes with a 3000ms delay after pointer leaves.
  - Manual tab selection, keyboard focus, touch swipe, or product card interaction pauses autoplay until explicit Play.
  - Accessible Play/Pause toggle button with `aria-label` ("Pause showcase autoplay" / "Play showcase autoplay") and `aria-pressed`.
  - `prefers-reduced-motion` defaults autoplay to OFF.
  - `visibilitychange` listener: Pauses when `document.hidden` is true; resets interval timer on return without an immediate advance.
- **Price Authority**:
  - Reads live, authoritative prices from `useCatalogProducts()`.
  - Merchandising configuration stores zero prices.
- **Layout Stability**:
  - Container maintains stable dimensions (`min-h-[460px]`) during tab transitions, eliminating cumulative layout shift (CLS).

---

## 4. Category Cleanup & Deduplication

- **Customer-Facing Presentation**:
  - Exported `CUSTOMER_FACING_CATEGORIES = ['dry-fruits', 'dates', 'seeds-snacks', 'oils', 'essentials', 'herbs-spices', 'celebration-boxes', 'deals', 'gift-boxes', 'bundles'] as const;` in `src/config/categories.ts`.
  - Updated `CategoryPLP.tsx`, `SelectionGuide.tsx`, `Footer.tsx`, and `CategoryCarousel.tsx` to render deduplicated customer-facing lists, eliminating confusing duplicate buttons for `nuts` and `snacks-seeds`.
- **Backward Compatibility**:
  - Maintained `nuts` and `snacks-seeds` in `CANONICAL_CATEGORIES` and `CATEGORY_ALIASES`.
  - All existing URLs (`/shop/nuts`, `/shop/snacks-seeds`), internal product category properties, and historical test contracts remain 100% stable.

---

## 5. Test Execution & Verification Evidence

All automated suites, TypeScript compilation, React hook linter, production build, and real browser CDP interaction tests passed with zero errors:

| Suite / Check | Command | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Real Browser CDP Interaction Tests** | `node scripts/test-stage5a-homepage.mjs` | **9 passed, 0 failed** (18.2s) | `0` | **VERIFIED:** Real headless Chrome CDP execution on `dist` build: (1) Hero CTAs ("Shop Dry Fruits" -> `/shop/dry-fruits`, "Explore Gifts" -> `/gifting`); (2) Explore Collections cards (13); (3) Boutique Selections 5 tabs, initial tab 3 cards; (4) Initial tab selected ("Dry Fruits & Nuts"); (5) Absence of old large BidBox and Deals grids (0 old grids); (6) Interactive tab switching (tab 2 selected, 3 cards rendered); (7) Play/Pause toggle toggles `aria-pressed` (false -> true); (8) Occasion destination cards (5 links match approved paths); (9) Service pillars, reviews, and FAQ mounted. Captured 6 screenshots. |
| **Stage 5A Homepage Unit Tests** | `node --import tsx --test --test-isolation=none tests/stage5a-homepage.test.tsx` | **6 passed, 0 failed** (45.1s) | `0` | **VERIFIED:** 6-part homepage structure, old grid removal, Boutique Selections 5 tabs with verified products, live price reading (zero stored prices), 5 occasion destination routes, category deduplication, and multilingual translations in EN, UR, and AR. |
| **Stage 4 Navigation Unit Tests** | `node --import tsx --test --test-isolation=none tests/stage4-navigation.test.tsx` | **12 passed, 0 failed** (45.0s) | `0` | **VERIFIED:** Regression check for header taxonomy, disclosure buttons, mobile accordion, RTL/Dark mode, route resolution, occasion matching, and single active indicator. |
| **Catalog Categories Regression** | `node --import tsx --test --test-isolation=none tests/catalog-categories.test.tsx` | **6 passed, 0 failed** (45.4s) | `0` | **VERIFIED:** Regression check for canonical categories, discovery filtering, corporate gating, and bundle shipping. |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** 100% type safety across the entire repository. |
| **React Hook Linter** | `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All hook dependency arrays and rules satisfied. |
| **Production Build Pipeline** | `npm run build` | Full pipeline: Vite v6.4.3 client bundle (8.86s) + esbuild server.cjs (870.4kb) + Release privacy audit (84 text artifacts clean). | `0` | **VERIFIED:** Production bundle built cleanly with zero private credential leaks. |

---

## 6. Real Browser Visual Artifacts

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

## 7. Changed Files Summary

- `src/components/AllBarkaHero.tsx`: Updated CTAs to Primary "Shop Dry Fruits" (`/shop/dry-fruits`) and Secondary "Explore Gifts" (`/gifting`); lazy-loaded `SelectionGuide` and removed direct CSS import.
- `src/components/BoutiqueSelections.tsx`: **New Component.** 5-tab showcase with 3 admin-selected products per tab, 6000ms autoplay with hover pause (3000ms resume), manual interaction pause, accessible Play/Pause toggle, `prefers-reduced-motion` handling, live catalog price reading, and stable layout dimensions.
- `src/components/FindGiftOccasionSection.tsx`: **New Component.** Compact destination links to Wedding, Umrah, Ramadan, Birth, and Corporate gifting.
- `src/components/CategoryCarousel.tsx`: Filtered out duplicate legacy alias slides (`nuts`, `snacks-seeds`) for customer presentation while preserving `PANTRY_CATEGORIES`.
- `src/components/CategoryPLP.tsx`: Mapped category pills over `CUSTOMER_FACING_CATEGORIES`.
- `src/components/SelectionGuide.tsx`: Mapped collection choice buttons over `CUSTOMER_FACING_CATEGORIES` and removed direct CSS import.
- `src/components/Footer.tsx`: Mapped footer collection links over `CUSTOMER_FACING_CATEGORIES`.
- `src/config/categories.ts`: Exported `CUSTOMER_FACING_CATEGORIES`.
- `src/config/merchandising.ts`: Configured 5 canonical tabs each with 3 verified product IDs (`pine-nuts` for chilgoza).
- `src/contexts/catalogTranslations.ts`: Added multilingual translations across `en`, `ur`, and `ar` for Hero CTAs, Boutique Selections, and Occasion gifts.
- `src/main.tsx`: Added central CSS imports for `editorial.css`, `selection-guide.css`, and `AllBarkaHero.css`.
- `src/pages/HomePage.tsx`: Assembled approved 6-part homepage structure; removed old `BidBoxesSection` and `DealsPackagesSection` grids; safely defaulted outlet context.
- `tests/stage5a-homepage.test.tsx`: **New Test Suite.** 6 unit tests covering structure, taxonomy, live prices, occasion routes, category deduplication, and multilingual translations.
- `scripts/test-stage5a-homepage.mjs`: **New Browser Automation Script.** 9 CDP interaction checks and 6 screenshot captures.
- `docs/artifacts/*`: 6 new real browser screenshots.
- `docs/RENOVATION_HANDOFF.md`: Updated to Stage 5A Review Packet v5.1.0.

---

## 8. Stopping Gate & Next Steps

**HALTED AT STAGE 5A REVIEW GATE:**
- **DO NOT** begin Stage 5B (Dedicated collection/occasion destinations) or Stage 5C (Packaging catalog & photography).
- **DO NOT** merge `feat/renovation-v2` into `launch` or `main`.
- **DO NOT** deploy or write live database records.
- Awaiting user review and authorization to proceed to Stage 5B.
