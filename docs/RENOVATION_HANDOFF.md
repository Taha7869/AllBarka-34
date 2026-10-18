# AllBarka Renovation — Stage 4 Review Packet & Handoff v4.2

**Document Version:** 4.2.0  
**Date:** October 18, 2026  
**Baseline Git Commit:** `2578f9a` -> `feat/renovation-v2`  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 4 NAVIGATION & DROPDOWN REDESIGN COMPLETE & RESOLVED — HALTED AT STAGE 5 ENTRY GATE**

---

## 1. Resolution of Reviewed Gaps

### A. Authoritative Occasion Matching
- **Issue Identified**: `productMatchesOccasion` previously ignored the canonical `product.occasions` array, instead falling back to display badges (`tag_en`), names, and speculative ID heuristics (e.g. `id.includes('ajwa')`, `id.startsWith('combo-')`). This allowed unrelated promotional badges to override eligibility and granted unearned occasion matches to items with empty occasions (`[]`).
- **Resolution**:
  - **Strict Precedence for Canonical Occasions**: `productMatchesOccasion` in `src/config/categories.ts` checks `Array.isArray(product.occasions)` first. If present, it strictly matches against `normalizeOccasionSlug(occ)` and ignores badges, names, and IDs. An explicit empty array (`occasions: []`) strictly returns `false` for any specific occasion (returning `true` only for `'all'` or `null`).
  - **Alias Normalization**: Exported `normalizeOccasionSlug()` supporting aliases for `wedding` (`nikkah`, `shadi`, `baat-pakki`, `mehndi`, `barat`, `walima`), `umrah` (`hajj`, `tabarruk`, `ziyarat`), `birth` (`baby`, `aqeeqah`, `newborn`), `ramadan` (`eid`, `ramzan`, `iftar`), and `corporate` (`executive`, `business`).
  - **Promotional Badge Disentanglement**: Promotional badges (e.g. `tag_en: 'Premium'`) no longer grant or override occasion eligibility.
  - **Removal of Speculative Heuristics**: Completely eliminated keyword and ID prefix/contains guesswork (`combo-`, `ajwa`, etc.).
  - **Documented Legacy Fallback**: Exported `LEGACY_OCCASION_TAG_MAP` used **only** when `product.occasions` is `undefined` or `null`.
  - **Category + Occasion Intersection**: Category and occasion filters remain a strict logical intersection (`productMatchesCategory && productMatchesOccasion`).
  - **Admin Save / Reload Integrity**: Verified that updating a product's canonical `occasions` array alters PLP results dynamically upon catalog reload.

### B. Deals Routing & Consistent Catalog Matching
- **Issue Identified**: `resolveCategorySlug('deals')` previously resolved to `'gift-boxes'`, preventing `/shop/deals` from reaching the `deals` matching branch and conflating generic gift boxes with promotional deals. Furthermore, `bundles` matching had erroneously matched `isBundle` products belonging to `gift-boxes` (`deal-1` and `deal-2`).
- **Resolution**:
  - `resolveCategorySlug('deals')` resolves strictly to `'deals'`.
  - Removed `deals: 'gift-boxes'` from `CATEGORY_ALIASES`.
  - Disentangled `bundles` vs. `deals` in `productMatchesCategory`:
    - `target === 'bundles'`: strictly matches products with `product.category === 'bundles'` (the 13 curated bundles).
    - `target === 'deals'`: matches `category === 'bundles' || category === 'deals' || id === 'deal-1' || id === 'deal-2' || collections.includes('deals')` (the 15 curated bundle & deal offerings).
    - Arbitrary nuts (`pista`), dates (`ajwa-dates`), oils (`cold-pressed-mustard-oil`), and spices are strictly excluded from `/shop/deals`. Zero fictional discounts or unverified tiers are displayed.

### C. Dropdown Focus, Viewport & Mobile Behavior
- **Focus-Aware Mouse-Leave Delay**: `scheduleCloseDelay` verifies whether keyboard focus remains inside the disclosure container (`navContainerRef.current?.contains(document.activeElement)`). If focus remains inside, disclosure dismissal is withheld.
- **Focus Transition Between Groups**: Moving keyboard focus to another trigger button immediately dismisses any open disclosure from a sibling group.
- **Route-Change Dismissal**: Immediate cleanup timer and disclosure dismissal upon route changes (`location.pathname`, `location.search`).
- **Bounded Viewport Height & Internal Scrolling**: Added bounded viewport height (`min(420px, calc(100vh - 140px))`) with `overflow-y-auto overscroll-contain`.
- **Semantic Mobile Navigation**: Converted mobile destination items, compact food categories, and `/journal` to semantic `<Link>` anchors (`<a data-nav-path="...">`). Retained `<button>` for disclosures and action triggers.

---

## 2. Test Execution & Verification Evidence

All test suites, TypeScript compilation, React hook linter, production build, and real browser CDP interaction tests passed with zero errors:

| Suite / Check | Command | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Real Browser CDP Interaction Tests** | `node scripts/test-active-navigation.mjs` | **27 passed, 0 failed** (17.2s) | `0` | **VERIFIED:** Real headless Chrome CDP execution testing: (1) Two-level header presence (Height 127px); (2) Main row triggers (5); (3) Compact food row (6 items); (4) Dropdown hover open; (5) Slow diagonal pointer bridge transit; (6) Cursor inside panel stability beyond 220ms delay (350ms elapsed); (7) Internal scrolling reaches last link in panel; (8) Viewport clipping checks; (9) Outside click dismissal; (10) Space key open; (11) Space key close toggle; (12) Tab key into panel items; (13) Mouse leave focus retention (>220ms); (14) Focus transition between disclosure groups; (15) Escape closes & restores focus; (16) Short viewport height bounding (Height: 260px, MaxHeight: 260px, Fits: true); (17) `/shop/dry-fruits` renders nuts products (`pista`, `badam`); (18) `/shop/celebration-boxes` dropdown navigation closes menu; (19) `/shop/dates` renders 5 date products; (20) Occasion filter `/shop/celebration-boxes?occasion=wedding` shows 6 wedding boxes, excludes Umrah box, displays chip; (21) `/shop/deals` route renders curated deals & bundles and excludes arbitrary catalog items; (22) Urdu switches `dir="rtl"`; (23) Arabic switches `dir="rtl"` with Arabic text; (24) Dark mode toggle (`documentElement` class `dark`); (25) Mobile menu opens via real touch tap; (26) Mobile accordion expands on touch (Corporate & Bulk under Gifting); (27) Mobile touch navigation routes to `/wholesale` and closes drawer. |
| **Stage 4 Navigation Unit Tests** | `node --import tsx --test --test-isolation=none tests/stage4-navigation.test.tsx` | **10 passed, 0 failed** (47.0s) | `0` | **VERIFIED:** Taxonomy matching, BubbleMenu disclosure ARIA attributes, MobileMenu anchors & buttons, dark mode / RTL layout, destination aliases, `productMatchesCategory` (22 nuts, 13 snacks, 8 celebration boxes, 5 dates), `productMatchesOccasion` (6 wedding, 1 umrah, 1 birth), authoritative occasion overrides & `[]` non-eligibility, admin save/reload PLP reactivity, and `/shop/deals` product curation. |
| **Catalog Filter Draft Tests** | `node --import tsx --test --test-isolation=none tests/catalog-filter-draft.test.ts` | **6 passed, 0 failed** (204ms) | `0` | **VERIFIED:** Staged edits, apply commits, reset isolation, shared selection handling, catalogue preview matches committed results, multilingual labels. |
| **Catalog Expansion Regression** | `node --import tsx --test --test-isolation=none tests/catalog-expansion.test.ts` | **8 passed, 0 failed** (200ms) | `0` | **VERIFIED:** 97 unique products (32 original + 57 new + 8 Bid Boxes); canonical category counts intact; photos, portions, weights preserved. |
| **Catalog Categories Regression** | `node --import tsx --test --test-isolation=none tests/catalog-categories.test.tsx` | **6 passed, 0 failed** (46.5s) | `0` | **VERIFIED:** Canonical categories, gift/deal aliases, multilingual labels, discovery filtering, and corporate gifting constraints intact. |
| **Stage 3 Pricing & MOQ Suite** | `node --import tsx --test --test-isolation=none tests/stage3-pricing-moq.test.ts` | **19 passed, 0 failed** (48.2s) | `0` | **VERIFIED:** Rule D1 packaging MOQ formula, admin variant overrides, food exemptions, single canonical price source, zero invented tiers, 5% reference markup idempotency, unpriced inquiry rendering. |
| **Stage 2 Catalog CRUD Suite** | `node --import tsx --test --test-isolation=none tests/stage2-catalog-crud.test.ts` | **25 passed, 0 failed** (1.6s) | `0` | **VERIFIED:** Product lifecycle, draft invisibility, price editor saves, merchandising concurrency protection, migration precedence, journal persistence, rollback conflict protection, and crash recovery. |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** 100% type safety across the entire repository. |
| **React Hook Linter** | `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All hook dependency arrays and rules satisfied. |
| **Production Build Pipeline** | `npm run build` | Full pipeline: Vite v6.4.3 client bundle (8.96s) + esbuild server.cjs (870.3kb) + Release privacy audit (83 text artifacts clean). | `0` | **VERIFIED:** Production assets and server bundle built cleanly. |

---

## 3. Real Browser Interaction & Screenshot Evidence

Real headless Chrome CDP interaction tests produced the following visual artifacts stored in both the conversation artifact directory (`C:\Users\taha\.gemini\antigravity\brain\f408ee7a-7513-4e1a-b8e1-251273bc99e6`) and the repository artifact directory (`docs/artifacts/`):

| Screenshot Artifact | Repository Path | Description & Verified Visual Criteria |
| :--- | :--- | :--- |
| **`stage4_desktop_dropdown.png`** | `docs/artifacts/stage4_desktop_dropdown.png` | Desktop two-level header with Shop dropdown open. Continuous pointer bridge active, zero clipping, correct luxury cream palette, dark green accent, search icon, custom hamper button, and theme toggle. |
| **`stage4_desktop_light.png`** | `docs/artifacts/stage4_desktop_light.png` | Desktop header in light mode with "GIFTS & HAMPERS" having keyboard focus ring outline immediately after Escape key restored focus from closed panel. |
| **`stage4_desktop_rtl.png`** | `docs/artifacts/stage4_desktop_rtl.png` | Desktop header under Urdu locale (`ur`). Header root set to `dir="rtl"`, mirrored layout (logo on right, utility controls on left, mirrored navigation order `شاپ`, `تحائف اور ہیمپر`, `تقریبات کے ڈبے`, `مواقع و تقریبات`, `خصوصی ڈیلز`), and active gold indicator under `کھجوریں` (`/shop/dates`). |
| **`stage4_desktop_dark.png`** | `docs/artifacts/stage4_desktop_dark.png` | Desktop header under Dark theme. High contrast luxury dark styling (`#1A201E`), gold borders, crisp typography. |
| **`stage4_mobile_drawer.png`** | `docs/artifacts/stage4_mobile_drawer.png` | Mobile viewport (390x844). Slide-out navigation drawer with Patron lounge, Shopping bag, Language switcher, Theme buttons, and "OUR COLLECTIONS" accessible accordion with "GIFTS & HAMPERS" expanded showing Corporate & Bulk Gifting. |

---

## 4. Outstanding Release Gates & Limitations

1. **Firestore Emulator**:
   - **Status**: **BLOCKED (Offline / Not installed in local workspace)**.
   - **Release Policy**: Production readiness is **NOT** claimed for live cloud Firestore mutations. Zero production database writes, zero live deployments, and zero merges to `launch` or `main` have occurred. All data model integrity and transaction ordering guarantees remain verified through shared in-memory transaction test mocks.
2. **Stage 5 Dependencies**:
   - Navigation links to `/shop/celebration-boxes`, `/wholesale`, and `/shop/deals` currently mount through existing category routing with canonical aliases (`gift-boxes`, `/wholesale`). Dedicated Stage 5 pages (`CelebrationBoxesPage.tsx`, `DealsPage.tsx`, `OccasionPage.tsx`) will be introduced in Stage 5 without breaking existing URLs or product links.

---

## 5. Changed Files Summary

- `src/config/categories.ts`: Authoritative `productMatchesOccasion` (canonical `occasions` array precedence, `[]` non-matching, `normalizeOccasionSlug`, `LEGACY_OCCASION_TAG_MAP`), `productMatchesCategory` (disentangled `bundles` vs `deals`), `resolveCategorySlug` (resolves `deals`), `CANONICAL_CATEGORIES` (canonical `deals` entry).
- `src/data/products.ts`: Added `occasions?: string[]` to `BidBoxDefinition` and populated canonical `occasions` array in `createBidBoxProduct`.
- `tests/stage4-navigation.test.tsx`: Added regression tests 8, 9, 10 for authoritative occasions, category+occasion intersection, admin save/reload reactivity, and deals curation; updated test 5 for `resolveCategorySlug('deals') === 'deals'`.
- `tests/catalog-categories.test.tsx`: Updated `resolveCategorySlug('deals')` assertion to `'deals'`.
- `scripts/test-active-navigation.mjs`: Added dual artifact saving to `docs/artifacts/`, pointer transit wait beyond 220ms (350ms elapsed), internal scrolling test reaching last link, and live browser `/shop/deals` route navigation and matching test.
- `docs/artifacts/*`: Generated 5 real browser screenshots.
- `docs/RENOVATION_HANDOFF.md`: Updated handoff documentation to v4.2.0.

---

## 6. Scope Boundary & Stopping Gate

**STOPPING POINT:** Development and verification are strictly halted at the Stage 4 completion gate.
- **DO NOT** begin Stage 5 (no homepage or collection-page redesigns).
- **DO NOT** merge `feat/renovation-v2` into `launch` or `main`.
- **DO NOT** deploy to production or write live database records.
- Awaiting explicit user review and authorization.

