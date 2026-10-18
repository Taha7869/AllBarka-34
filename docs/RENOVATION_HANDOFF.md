# AllBarka Renovation — Stage 5A Review Packet & Handoff v5.4

**Document Version:** 5.4.0  
**Date:** October 18, 2026  
**Baseline Git Commit:** `cfd267b` -> `feat/renovation-v2`  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 5A HOMEPAGE, BOUTIQUE SELECTIONS & MERCHANDISING LIFECYCLE COMPLETE & VERIFIED — HALTED AT STAGE 5A COMPLETION GATE**

---

## 1. Stage 5 Scope Boundaries

Stage 5 is split into three discrete, reviewable milestones:
- **Stage 5A (Implemented & Fully Verified Here):** Homepage, Boutique Selections showcase, autoplay lifecycle, collection alias normalization & visibility conflict resolution, merchant occasion titles, and real browser provider-fetch integration.
- **Stage 5B (Explicitly Pending):** Dedicated collection/occasion destinations (`/shop/celebration-boxes`, `/shop/deals`, `/gifting`).
- **Stage 5C (Explicitly Pending):** Verified packaging catalog, descriptions, and original studio photography assets.

> [!IMPORTANT]
> **Strict Halt Gate:** Stage 5A is fully implemented and verified. Stage 5B and Stage 5C remain explicitly pending. Zero live production database writes, zero merges to `launch`/`main`, and zero production deployments have occurred. Firestore Emulator remains an outstanding release gate.

---

## 2. Collection Alias Normalization & Conflict Resolution

### 2.1 Problem Solved
Previously, `CategoryCarousel` keyed its `collectionsMap` by raw `collectionId` while resolving candidate cards using canonical category keys. When an administrator configured a legacy alias (such as `{ collectionId: 'nuts', visible: false }`), the canonical category `dry-fruits` would fail to match the raw key `nuts`, causing the hidden dry fruits collection card to silently reappear on the homepage.

### 2.2 Canonical Key Normalization
In `src/config/categories.ts`:
- Added and exported `COLLECTION_ALIASES`:
  - `nuts` ↔ `dry-fruits`
  - `snacks-seeds` ↔ `seeds-snacks`
  - `bundles` ↔ `combos`
  - `gift-boxes` ↔ `gifts`
- Exported `canonicalCollectionKey(id)` to reduce any alias to its canonical representation.
- Exported `COLLECTION_EQUIVALENCE_GROUPS` and `getEquivalentCollectionIds(id)` to retrieve all equivalent identifiers for any category or collection.

### 2.3 Deterministic Conflict Handling in `CategoryCarousel`
In `src/components/CategoryCarousel.tsx`:
- Keyed `normalizedCollections` by `canonicalCollectionKey(col.collectionId)`.
- When multiple entries target equivalent collections (e.g. `nuts` and `dry-fruits`):
  - **Hidden Precedence Rule:** `const isHidden = existing.visible === false || col.visible === false;`
  - If any equivalent entry is marked `visible: false`, the hidden state strictly prevails across the entire group.
  - Custom overrides (titles, images, destinations, badges) are merged deterministically without duplicate cards.
- Evaluated category visibility across all equivalent aliases (`isCategoryVisible(cKey)` checks both canonical and legacy keys in `categoryVisibility`).
- Iterated canonical items (`PANTRY_CATEGORIES`) with `seenCanonicalKeys.add(cKey)` unconditionally once visited, guaranteeing no duplicate slides are ever created.
- Normalized `order.map(id => canonicalCollectionKey(id))` for deterministic ordering.
- Preserved distinct commercial collections (`celebration-boxes`, `deals`, `combos`, `personalized-treats`).

---

## 3. Real Browser Provider-Fetch Verification

### 3.1 Service/SSR Flow vs Client HTTP Fetch Distinction
- **Test 6 (`stage5a-admin-integration.test.tsx`):** Accurately re-labeled as Service/SSR flow (`admin save -> preview isolation -> publish -> public fetch -> storefront render (SSR with initialSettings)`).
- **Test 7 (`stage5a-admin-integration.test.tsx`):** Added a dedicated browser/client-mounted integration test that does **NOT** inject `initialSettings` or direct component props into the rendered page:
  1. Spins up an Express HTTP server with `createCatalogRouter` backed by in-memory atomic Firestore fixture on a dynamic port (`0`).
  2. Serves actual production build assets from `dist` and `index.html`.
  3. Launches a real Playwright Chromium browser session navigating to `http://127.0.0.1:<port>/`.
  4. Verifies initial storefront state matches live published settings.
  5. Admin saves a draft with custom collection titles, custom image, destination link, hidden collections, custom occasion title, custom occasion route, hidden occasion, and custom autoplay interval/resume delay.
  6. Verifies public draft isolation: public storefront re-fetching `/api/merchandising` does not leak draft updates prior to publication.
  7. Admin publishes draft to live via `publishAdminMerchandising`.
  8. Client browser triggers `MerchandisingProvider` fetch/refresh (`cache: 'no-store'`) and page reloads.
  9. Asserts all DOM changes rendered in real browser:
     - Collection title: `"Mega Spring Flash Deals"`
     - Collection image: `img[src="/assets/categories/deals.png"]` (real static asset)
     - Collection destination: `a[href="/shop/deals?promo=spring-mega"]`
     - Hidden collection: `combos` absent from pantry
     - Collection ordering: Deals positioned before Oils according to published `categoryOrder`
     - Custom occasion title: `"Royal Grand Nikkah Hampers"`
     - Custom occasion route: `a[href*="tier=royal"]`
     - Hidden occasion: `umrah` absent from occasions section
     - Autoplay settings in DOM: `data-interval="8888"`, `data-resume-delay="4444"`

### 3.2 Autoplay Precedence & Store Merge Fix
- In `src/lib/catalogSchema.ts`: Corrected precedence so modern canonical `rawAutoplay.intervalMs` and `rawAutoplay.resumeDelayMs` take precedence over legacy top-level `value.autoplayDurationMs` / `value.autoplayResumeDelayMs`.
- In `src/lib/catalogStore.ts`: Updated `updateAdminMerchandising` to spread `...current` before `...body`, ensuring partial admin updates do not wipe out existing configuration (e.g. `showcaseTabs`).
- In `src/contexts/MerchandisingContext.tsx`: Added `cache: 'no-store'` to fetch request to prevent stale browser HTTP caching of `/api/merchandising`.

---

## 4. Test Execution & Verification Evidence

All automated suites, controlled-clock tests, integration tests, TypeScript compilation, React hook linter, production build, and real browser CDP interaction tests passed with zero errors:

| Suite / Check | Command | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Admin Merchandising Integration** | `node --import tsx --test --test-isolation=none tests/stage5a-admin-integration.test.tsx` | **8 passed, 0 failed** (61.2s) | `0` | **VERIFIED:** (1) Admin lifecycle: draft save -> draft isolation -> publish promotion -> public retrieval; (2) CategoryCarousel published title, image, destination, visibility, order; (2b) CategoryCarousel alias normalization & deterministic conflict handling for `nuts`/`dry-fruits` and `snacks-seeds`/`seeds-snacks`; (3) BoutiqueSelections product filter & tab cap; (4) FindGiftOccasionSection hidden filtering & routes; (5) Custom merchant occasion title overrides translation keys; (6) Service/SSR integrated flow; (7) Real browser/client-mounted HTTP provider-fetch verification. |
| **Controlled-Clock Lifecycle Suite** | `node --test tests/stage5a-controlled-clock.test.mjs` | **11 passed, 0 failed** (37.7s) | `0` | **VERIFIED:** 11 scenarios using Playwright virtual clock: (1) Initial advance at 6000ms; (2) Sustained hover pauses indefinitely (18000ms); (3) Exact 3000ms resume delay + 6000ms interval = 9000ms first advance; (4) Repeated enter/exit resets delay; (5) Manual pause until Play; (6) Play while hovered maintains hover protection; (7) Hidden document pauses rotation; return restarts fresh countdown without jump; (8) Reduced motion defaults to paused, and explicit Play opts into rotation with hover/delay/visibility protections; (9) Asynchronously loaded `enabled = false` pauses rotation; (10) Empty tabs hidden, rotation disabled when <= 1 tab; (11) Unmount cleanup clears all timers without leaks. |
| **Stage 5A Homepage Unit Tests** | `node --import tsx --test --test-isolation=none tests/stage5a-homepage.test.tsx` | **6 passed, 0 failed** (52.5s) | `0` | **VERIFIED:** 6-part homepage structure, old grid removal, Boutique Selections 5 tabs with verified products, live price reading (zero stored prices), 5 occasion destination routes, category deduplication, and multilingual translations in EN, UR, and AR. |
| **Stage 4 Navigation Regressions** | `node --import tsx --test --test-isolation=none tests/stage4-navigation.test.tsx` | **12 passed, 0 failed** (49.5s) | `0` | **VERIFIED:** Regression check for header taxonomy, disclosure buttons, mobile accordion, RTL/Dark mode, route resolution, occasion matching, and single active indicator. |
| **Stage 3 Pricing & MOQ Regressions** | `node --import tsx --test --test-isolation=none tests/stage3-pricing-moq.test.ts` | **19 passed, 0 failed** (51.8s) | `0` | **VERIFIED:** Rules D1 & D2, food exemption, packaging MOQ, reference markup idempotency, and bid box pricing integrity. |
| **Real Browser CDP Tests** | `node scripts/test-stage5a-homepage.mjs` | **9 passed, 0 failed** (18.2s) | `0` | **VERIFIED:** Real headless Chrome CDP execution on fresh `dist` build: (1) Hero CTAs; (2) Explore Collections cards; (3) Boutique Selections 5 tabs, initial tab 3 cards; (4) Initial tab selected; (5) Old grids absent; (6) Interactive tab switching; (7) Play/Pause toggle; (8) Occasion destination cards; (9) Service pillars, reviews, and FAQ mounted. Captured 6 screenshots. |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** 100% type safety across the entire repository. |
| **React Hook Linter** | `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All hook dependency arrays and rules satisfied. |
| **Production Build Pipeline** | `npm run build` | Full pipeline: Vite client bundle (12.79s) + esbuild server.cjs (870.1kb) + Release privacy audit (84 text artifacts clean). | `0` | **VERIFIED:** Production bundle built cleanly with zero private credential leaks. |

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

- `src/config/categories.ts`: Added `COLLECTION_ALIASES`, `canonicalCollectionKey`, `COLLECTION_EQUIVALENCE_GROUPS`, and `getEquivalentCollectionIds`.
- `src/components/CategoryCarousel.tsx`: Implemented canonical alias normalization, conflict resolution (hidden precedence), and equivalent ID deduplication across both `categoryVisibility` and `collections` entries.
- `src/components/BoutiqueSelections.tsx`: Exposed `data-interval` and `data-resume-delay` attributes for runtime inspection.
- `src/contexts/MerchandisingContext.tsx`: Added `cache: 'no-store'` to `/api/merchandising` fetch call and attached `window.__refreshMerchandising` for browser integration testing.
- `src/lib/catalogRouter.ts`: Set `Cache-Control: no-cache, must-revalidate` on `GET /api/merchandising`.
- `src/lib/catalogSchema.ts`: Fixed autoplay interval and resume delay precedence so nested canonical `rawAutoplay.intervalMs` and `rawAutoplay.resumeDelayMs` override legacy top-level defaults.
- `src/lib/catalogStore.ts`: Merged `...current` before `...body` in `updateAdminMerchandising` transaction so partial updates preserve existing configuration.
- `tests/stage5a-admin-integration.test.tsx`: Added Test 2b (alias normalization and deterministic conflict handling) and Test 7 (browser/client-mounted HTTP provider-fetch verification), while labeling Test 6 as Service/SSR flow.
- `docs/RENOVATION_HANDOFF.md`: Updated to Stage 5A Review Packet v5.4.0.

---

## 7. Stopping Gate & Next Steps

**HALTED AT STAGE 5A REVIEW GATE:**
- **DO NOT** begin Stage 5B (Dedicated collection/occasion destinations) or Stage 5C (Packaging catalog & photography).
- **DO NOT** merge `feat/renovation-v2` into `launch` or `main`.
- **DO NOT** deploy or write live database records.
- Awaiting user review and authorization to proceed to Stage 5B.
