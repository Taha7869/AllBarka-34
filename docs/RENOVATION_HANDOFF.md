# AllBarka Renovation — Stage 4 Review Packet & Handoff v4.1

**Document Version:** 4.1.0  
**Date:** October 18, 2026  
**Baseline Git Commit:** `a3da040` -> `feat/renovation-v2`  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 4 NAVIGATION & DROPDOWN REDESIGN COMPLETE & RESOLVED — HALTED AT STAGE 5 ENTRY GATE**

---

## 1. Resolution of Reviewed Gaps

### A. Navigation-to-Catalog Category Mapping
- **Issue Identified**: Existing products in the catalog used `nuts` (22 products) and `snacks-seeds` (13 products), while navigation links resolved to `dry-fruits` and `seeds-snacks`. Filtering used exact category equality, which resulted in empty product lists when clicking new navigation links. In addition, `celebration-boxes` was aliased to `gift-boxes`, excluding actual celebration-boxes products.
- **Resolution**:
  - Implemented and exported `productMatchesCategory(product, categorySlug)` in `src/config/categories.ts`.
  - Canonical equivalences established:
    - `'dry-fruits'` <-> `'nuts'` (22 whole nut products)
    - `'seeds-snacks'` <-> `'snacks-seeds'` (13 seed & snack products)
    - `'celebration-boxes'` <-> `'celebration-boxes'` (8 bespoke celebration boxes)
    - `'dates'` <-> 5 date products (`khajoor`, `ajwa-dates`, `medjool-dates`, `aseel-dates`, `chohara`)
    - `'deals'` <-> matches both `bundles` and `gift-boxes` without mutating legacy alias `deals: 'gift-boxes'`
  - Integrated `productMatchesCategory` across `filterCatalogSelection` (`src/lib/catalogFilterDraft.ts`), `selectionMatches` (`src/lib/selectionGuide.ts`), and `CategoryPLP.tsx`.
  - Preserved legacy URLs (`/shop/nuts`, `/shop/bundles`, `/wholesale`) and all product IDs.

### B. Meaningful Occasion Filtering
- **Issue Identified**: Navigation links contained occasion query parameters (`?occasion=wedding`, `?occasion=umrah`), but `CategoryPLP.tsx` did not consume or filter by occasion.
- **Resolution**:
  - Implemented and exported `productMatchesOccasion(product, occasion)` in `src/config/categories.ts`.
  - Prioritizes approved product occasion metadata (`bidBoxConfig.occasionTag`, `product.tag_en`) over generic text to ensure clean isolation:
    - `wedding`: matches 6 wedding/nikkah celebration boxes (`bid-box-card-nikkah`, `bid-box-luxury-tin`, `bid-box-pyramid-favor`, `bid-box-jute-pouch`, `bid-box-sweet-nikkah`, `bid-box-acrylic-royal`) and excludes Umrah/Birth boxes.
    - `umrah`: isolates Umrah box (`bid-box-umrah-tabarruk`).
    - `birth`: isolates Birth Announcement box (`bid-box-birth-announcement`).
  - `CategoryPLP.tsx` consumes `activeParams.get('occasion')`, passes it to `filterCatalogSelection`, displays an active occasion filter chip with clear button (`X`), and renders an honest contextual fallback message if an occasion yields zero matches.
  - Kept `readCatalogFilters` returning strictly `{ query, sort, budget, origin, special, saved }` to prevent breaking existing draft signatures or deep-equality assertions.

### C. Dropdown Focus, Viewport & Mobile Behavior
- **Issue Identified**: Mouse-leave timer could dismiss disclosure while keyboard focus remained inside the trigger or panel. Focus transitions between disclosure groups needed handling. Dropdown height could overflow on short viewports. Mobile drawer destination items used `<button>` instead of semantic anchors.
- **Resolution**:
  - **Focus-Aware Mouse-Leave Delay**: `scheduleCloseDelay` checks `navContainerRef.current?.contains(document.activeElement)`. If keyboard focus remains inside the disclosure group, dismissal is withheld.
  - **Focus Transition Between Groups**: Trigger `onFocus` closes open sibling dropdowns when focus moves to another disclosure group.
  - **Route-Change Dismissal**: `useEffect([location.pathname, location.search])` immediately cancels pending timers and closes any open dropdown on route navigation.
  - **Bounded Viewport Height**: Added `style={{ maxHeight: 'min(420px, calc(100vh - 140px))' }}` with `overflow-y-auto overscroll-contain` to prevent dropdown panels from clipping or overflowing the viewport.
  - **Semantic Mobile Navigation**: Converted mobile destination items, compact food categories, and `/journal` to semantic `<Link>` anchors (`<a data-nav-path="...">`). Retained `<button>` for accordion disclosure, close button, language/theme selectors, and modal triggers (`open-hamper-builder`, `open-custom-quote`).

---

## 2. Test Execution & Verification Evidence

All test suites, TypeScript compilation, React hook linter, production build, and real browser CDP interaction tests passed with zero errors:

| Suite / Check | Command | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Real Browser CDP Interaction Tests** | `node scripts/test-active-navigation.mjs` | **25 passed, 0 failed** (16.8s) | `0` | **VERIFIED:** Real headless Chrome CDP execution testing: (1) Two-level header presence (Height 127px); (2) Main row triggers; (3) Compact food row (6 items); (4) Dropdown hover open; (5) Slow diagonal pointer bridge transit; (6) Cursor inside panel stability; (7) Viewport clipping checks; (8) Outside click dismissal; (9) Space key open; (10) Space key close toggle; (11) Tab key into panel items; (12) Mouse leave focus retention (>220ms); (13) Focus transition between disclosure groups; (14) Escape closes & restores focus; (15) Short viewport height bounding (400px height, maxHeight 260px, internal scroll); (16) `/shop/dry-fruits` renders nuts products (`pista`, `badam`); (17) `/shop/celebration-boxes` dropdown navigation; (18) `/shop/dates` renders 5 date products (`khajoor`, `ajwa-dates`); (19) Occasion filter `/shop/celebration-boxes?occasion=wedding` shows 6 wedding boxes, excludes Umrah box, displays chip; (20) Urdu switches `dir="rtl"`; (21) Arabic switches `dir="rtl"` with Arabic text; (22) Dark mode toggle (`documentElement` class `dark`); (23) Mobile menu open via real touch tap; (24) Mobile accordion touch expand (Corporate & Bulk under Gifting); (25) Mobile touch navigation to `/wholesale` and drawer close. |
| **Stage 4 Navigation Unit Tests** | `node --import tsx --test --test-isolation=none tests/stage4-navigation.test.tsx` | **7 passed, 0 failed** (47.5s) | `0` | **VERIFIED:** Taxonomy matching, BubbleMenu disclosure ARIA attributes, MobileMenu anchors & buttons, dark mode / RTL layout, destination aliases, `productMatchesCategory` (22 nuts, 13 snacks, 8 celebration boxes, 5 dates), and `productMatchesOccasion` (6 wedding, 1 umrah, 1 birth). |
| **Catalog Filter Draft Tests** | `node --import tsx --test --test-isolation=none tests/catalog-filter-draft.test.ts` | **6 passed, 0 failed** (1.3s) | `0` | **VERIFIED:** Staged edits, apply commits, reset isolation, shared selection handling, catalogue preview matches committed results, multilingual labels. |
| **Catalog Expansion Regression** | `node --import tsx --test --test-isolation=none tests/catalog-expansion.test.ts` | **8 passed, 0 failed** (320ms) | `0` | **VERIFIED:** 97 unique products (32 original + 57 new + 8 Bid Boxes); canonical category counts intact; photos, portions, weights preserved. |
| **Catalog Categories Regression** | `node --import tsx --test --test-isolation=none tests/catalog-categories.test.tsx` | **6 passed, 0 failed** (45.3s) | `0` | **VERIFIED:** Canonical categories, gift/deal aliases, multilingual labels, discovery filtering, and corporate gifting constraints intact. |
| **Selection Guide Regression** | `node --import tsx --test --test-isolation=none tests/selection-guide.test.ts` | **5 passed, 0 failed** (15ms) | `0` | **VERIFIED:** Guide portion resolution, budget matching, reloadable shop URLs, multilingual copy. |
| **Stage 3 Pricing & MOQ Suite** | `node --import tsx --test --test-isolation=none tests/stage3-pricing-moq.test.ts` | **19 passed, 0 failed** (85.8s) | `0` | **VERIFIED:** Rule D1 packaging MOQ formula, admin variant overrides, food exemptions, single canonical price source, zero invented tiers, 5% reference markup idempotency, unpriced inquiry rendering. |
| **Stage 2 Catalog CRUD Suite** | `node --import tsx --test --test-isolation=none tests/stage2-catalog-crud.test.ts` | **25 passed, 0 failed** (9.2s) | `0` | **VERIFIED:** Product lifecycle, draft invisibility, price editor saves, merchandising concurrency protection, migration precedence, journal persistence, and crash recovery. |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** 100% type safety across the entire repository. |
| **React Hook Linter** | `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All hook dependency arrays and rules satisfied. |
| **Production Build Pipeline** | `npm run build` | Full pipeline: Vite v6.4.3 client bundle (8.5s) + esbuild server.cjs (870.1kb) + Release privacy audit (83 text artifacts clean). | `0` | **VERIFIED:** Production assets and server bundle built cleanly. |

---

## 3. Real Browser Interaction & Screenshot Evidence

Real headless Chrome CDP interaction tests produced the following visual artifacts in the conversation artifact directory (`C:\Users\taha\.gemini\antigravity\brain\f408ee7a-7513-4e1a-b8e1-251273bc99e6`):

| Screenshot Artifact | Description & Verified Visual Criteria |
| :--- | :--- |
| **`stage4_desktop_dropdown.png`** | Desktop two-level header with Shop dropdown open. Continuous pointer bridge active, zero clipping, correct luxury cream palette, dark green accent, search icon, custom hamper button, and theme toggle. |
| **`stage4_desktop_light.png`** | Desktop header in light mode with "GIFTS & HAMPERS" having keyboard focus ring outline immediately after Escape key restored focus from closed panel. |
| **`stage4_desktop_rtl.png`** | Desktop header under Urdu locale (`ur`). Header root set to `dir="rtl"`, mirrored layout (logo on right, utility controls on left, mirrored navigation order `شاپ`, `تحائف اور ہیمپر`, `تقریبات کے ڈبے`, `مواقع و تقریبات`, `خصوصی ڈیلز`), and active gold indicator under `کھجوریں` (`/shop/dates`). |
| **`stage4_desktop_dark.png`** | Desktop header under Dark theme. High contrast luxury dark styling (`#1A201E`), gold borders, crisp typography. |
| **`stage4_mobile_drawer.png`** | Mobile viewport (390x844). Slide-out navigation drawer with Patron lounge, Shopping bag, Language switcher, Theme buttons, and "OUR COLLECTIONS" accessible accordion with "GIFTS & HAMPERS" expanded showing Corporate & Bulk Gifting. |

---

## 4. Outstanding Release Gates & Limitations

1. **Firestore Emulator**:
   - **Status**: **BLOCKED (Offline / Not installed in local workspace)**.
   - **Release Policy**: Production readiness is **NOT** claimed for live cloud Firestore mutations. Zero production database writes, zero live deployments, and zero merges to `launch` or `main` have occurred. All data model integrity and transaction ordering guarantees remain verified through shared in-memory transaction test mocks.
2. **Stage 5 Dependencies**:
   - Navigation links to `/shop/celebration-boxes`, `/wholesale`, and `/shop/deals` currently mount through existing category routing with canonical aliases (`gift-boxes`, `/wholesale`). Dedicated Stage 5 pages (`CelebrationBoxesPage.tsx`, `DealsPage.tsx`, `OccasionPage.tsx`) will be introduced in Stage 5 without breaking existing URLs or product links.

---

## 5. Changed Files Summary

- `src/config/categories.ts` (MODIFIED): Added `productMatchesCategory`, `productMatchesOccasion`, `OCCASION_TAGS`, canonical `celebration-boxes` entry and aliases.
- `src/config/navigation.ts` (CREATED): Shared authoritative navigation configuration for desktop and mobile.
- `src/components/BubbleMenu.tsx` (MODIFIED): Focus-aware mouse-leave debounce, auto-close on route changes, disclosure group transition, bounded viewport height (`min(420px, calc(100vh - 140px))`), pointer bridge.
- `src/components/CategoryPLP.tsx` (MODIFIED): Occasion query consumption, occasion chip display, contextual zero-match fallback, `productMatchesCategory` integration.
- `src/components/MobileMenu.tsx` (MODIFIED): Semantic `<Link>` anchors for destinations, `<button>` for disclosures/actions, accordion panels, compact food grid.
- `src/lib/catalogFilterDraft.ts` (MODIFIED): `filterCatalogSelection` with category and occasion matching, optional occasion draft support.
- `src/lib/selectionGuide.ts` (MODIFIED): `selectionMatches` using `productMatchesCategory`.
- `tests/stage4-navigation.test.tsx` (MODIFIED): Unit tests for taxonomy, ARIA disclosures, mobile anchors/buttons, RTL, category matching, and occasion filtering.
- `scripts/test-active-navigation.mjs` (MODIFIED): Comprehensive 25-test browser suite covering pointer travel, keyboard (Space/Tab/Escape), focus retention, short viewport bounding, category products, occasion filtering, RTL (Urdu/Arabic), dark mode, and mobile touch.
- `docs/RENOVATION_REQUIREMENTS.md` (MODIFIED): Traceability matrix updated.
- `docs/RENOVATION_HANDOFF.md` (MODIFIED): Comprehensive handoff v4.1.0.

---

## 6. Scope Boundary & Stopping Gate

**STOPPING POINT:** Development and verification are strictly halted at the Stage 4 completion gate.
- **DO NOT** begin Stage 5 (no homepage or collection-page redesigns).
- **DO NOT** merge `feat/renovation-v2` into `launch` or `main`.
- **DO NOT** deploy to production or write live database records.
- Awaiting explicit user review and authorization.
