# AllBarka Renovation — Stage 4 Review Packet & Handoff v4.0

**Document Version:** 4.0.0  
**Date:** October 18, 2026  
**Baseline Git Commit:** `7e340f1a` (Stage 3 Verification) -> `feat/renovation-v2`  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 4 NAVIGATION & DROPDOWN REDESIGN COMPLETE & VERIFIED — HALTED AT STAGE 5 ENTRY GATE**

---

## 1. Stage 4 Scope & Implementation Summary

### A. Authoritative Navigation Architecture (`src/config/navigation.ts`)
- Implemented single authoritative navigation schema for desktop and mobile headers:
  - **Main Row (Level 1)**: `Shop | Gifts & Hampers | Celebration Boxes | Occasions | Deals`
  - **Compact Food Row (Level 2)**: `Dry Fruits & Nuts | Dates | Seeds & Snacks | Oils | Desi Essentials | Herbs & Spices`
  - **Corporate & Bulk Gifting**: Authoritatively placed under Gifting (`/wholesale`), accessible via desktop dropdown and mobile drawer.
  - **Modal Action Triggers**: Declarative support for `'open-hamper-builder'` and `'open-custom-quote'` modal dispatchers.

### B. Desktop Active Header & BubbleMenu (`src/components/BubbleMenu.tsx`, `src/layouts/RootLayout.tsx`)
- **Continuous Trigger-to-Panel Pointer Bridge**: Pseudo-element bridge (`-top-3 inset-x-0 h-4`) eliminates hover dead zones between disclosure buttons and dropdown menus.
- **Cancelable Close Debounce**: 220ms delay prevents accidental dismissal during diagonal or slow pointer travel; cancels immediately on mouse re-entry.
- **Shared Open State**: Single `openId` state ensures hovering another top-level item immediately transitions panels without lingering stale dropdowns.
- **Accessible Disclosure & Keyboard Navigation**:
  - Semantic disclosure buttons declare `aria-haspopup="true"`, `aria-expanded={isOpen}`, and `aria-controls="nav-dropdown-panel-{id}"`.
  - Destination links use semantic `<Link>` with `role="menuitem"`.
  - `Enter` / `Space` toggles dropdown expansion.
  - `ArrowDown` transfers focus directly into the first panel item.
  - `Escape` closes the active panel and restores focus to the triggering button (`document.activeElement.id === nav-trigger-{id}`).
  - Outside pointer clicks dismiss open dropdown panels immediately.
- **RTL & Dark Mode Support**:
  - Dynamically binds header `dir={isRtl ? 'rtl' : 'ltr'}` from `useLanguage()`.
  - Urdu and Arabic mirror menu ordering, chevron directions, and dropdown alignment without layout clipping.
  - Luxury cream light palette (`#FFFCF7`, `#F6F1EA`, `#042821`) and obsidian dark theme (`#1A201E`, `#121615`, `#C7982F`).
- **Brand & Header Controls**:
  - Retained AllBarka premium typography, crest logo linking home, search shortcut (`#header-search-btn`), custom hamper button, language selector, and dark mode toggle.

### C. Responsive Mobile Navigation Drawer (`src/components/MobileMenu.tsx`)
- **Accessible Accordion**: Replaced squeezed multi-row headers with an accessible slide-out drawer featuring expandable accordion panels (`aria-expanded`, `aria-controls`).
- **Compact Food Category Grid**: Quick-access 2-column food grid inside mobile menu.
- **Strict Master Prompt Order**:
  1. Patron Lounge / VIP Login & Store Updates
  2. Shopping Bag with live item count & review link
  3. Language selector (English, اردو, العربية)
  4. Appearance mode selector (Light, Dark, Auto)
  5. Collections & Occasions accordion + Compact food categories + Journal
  6. Social links (WhatsApp, Instagram)
- **Focus Trap & Scroll Lock**: Traps keyboard focus within drawer and acquires reference-counted body scroll lock.

---

## 2. Test Execution & Verification Evidence

All test suites, TypeScript compilation, React hook linter, production build, and real browser CDP interaction tests passed with zero errors:

| Suite / Check | Command | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Stage 4 Navigation Unit Tests** | `node --import tsx --test --test-isolation=none tests/stage4-navigation.test.tsx` | **5 passed, 0 failed** (57.6s) | `0` | **VERIFIED:** Main row 5 items, compact food row 6 items, Corporate under Gifting, ARIA disclosure attributes, mobile accordion, RTL dir="rtl", and category aliases. |
| **Real Browser CDP Interaction Tests** | `node scripts/test-active-navigation.mjs` | **17 passed, 0 failed** (13.2s) | `0` | **VERIFIED:** Headless Chrome CDP execution testing two-level header presence (Height 127px), dropdown hover open, diagonal pointer bridge transit, viewport clipping checks, outside click close, Enter key toggle, Escape focus restoration, compact food route navigation (`/shop/dates`), dropdown item route navigation (`/shop/celebration-boxes`), RTL language switch (`dir="rtl"`), dark mode toggle, mobile touch tap on hamburger, mobile touch tap on accordion (`Gifts & Hampers`), and mobile touch tap navigation to `/wholesale`. |
| **Catalog Expansion Regression** | `node --import tsx --test --test-isolation=none tests/catalog-expansion.test.ts` | **8 passed, 0 failed** (255ms) | `0` | **VERIFIED:** Original 32 + 57 new + 8 Bid Boxes = 97 products total; canonical category counts verified; photos, portions, weights intact. |
| **Catalog Categories Regression** | `node --import tsx --test --test-isolation=none tests/catalog-categories.test.tsx` | **6 passed, 0 failed** (48.7s) | `0` | **VERIFIED:** Canonical categories, gift/deal aliases, multilingual labels, discovery filtering, and corporate gifting constraints intact. |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** 100% type safety across the entire repository. |
| **React Hook Linter** | `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All hook dependency arrays and rules satisfied. |
| **Production Build Pipeline** | `npm run build` | Full pipeline: Vite v6.4.3 client bundle (11.17s) + esbuild server.cjs (868.6kb) + Release privacy audit (83 text artifacts clean). | `0` | **VERIFIED:** Production assets and server bundle built cleanly. |

---

## 3. Real Browser Interaction & Screenshot Evidence

Real headless Chrome CDP interaction tests produced the following visual artifacts in the conversation artifact directory:

| Screenshot Artifact | Description & Verified Visual Criteria |
| :--- | :--- |
| **`stage4_desktop_dropdown.png`** | Desktop two-level header with Shop dropdown open. Continuous pointer bridge active, zero clipping, correct luxury cream palette, dark green accent, search icon, custom hamper button, and theme toggle. |
| **`stage4_desktop_light.png`** | Desktop header in light mode with "GIFTS & HAMPERS" having keyboard focus ring outline immediately after Escape key restored focus from closed panel. |
| **`stage4_desktop_rtl.png`** | Desktop header under Urdu locale (`ur`). Header root set to `dir="rtl"`, mirrored layout (logo on right, utility controls on left, mirrored navigation order `شاپ`, `تحائف اور ہیمپر`, `تقریبات کے ڈبے`, `مواقع و تقریبات`, `خصوصی ڈیلز`), and active gold indicator under `کھجوریں` (`/shop/dates`). |
| **`stage4_desktop_dark.png`** | Desktop header under Dark theme. High contrast luxury dark styling (`#1A201E`), gold borders, crisp typography. |
| **`stage4_mobile_drawer.png`** | Mobile viewport (390x844). Slide-out navigation drawer with Patron lounge, Shopping bag, Language switcher, Theme buttons, and "OUR COLLECTIONS" accessible accordion with "GIFTS & HAMPERS" expanded showing Corporate & Bulk Gifting. |

---

## 4. Technical Diagnoses & Explanation of Test Edits

### A. Diagnosis of Hanging Test Process
- **Root Cause**: On Windows PowerShell, executing test commands via `npx` (e.g. `npx tsx tests/stage4-navigation.test.tsx`) invokes the `npx.cmd` batch wrapper. `npx` handles stdio differently and checks terminal interactivity, which blocks when executed as a background process awaiting stdin. Furthermore, compiling the entire React 19, Motion, and Lucide tree into `node:test` takes ~45-55s on initial pass.
- **Resolution**: Ran tests using the repo's native runner command `node --import tsx --test --test-isolation=none tests/stage4-navigation.test.tsx`. This avoids shell wrapper blocking and executes directly with clean exit codes. All duplicate node processes were confirmed terminated.

### B. Explanation of `tests/catalog-expansion.test.ts` Edit
- **Before**: Line 53 asserted `CATALOG_COUNTS` as `{ nuts: 22, 'gift-boxes': 10, ... }`.
- **Underlying Reason**: In commit `0ebc652`, the 8 newly introduced customizable Bid Boxes were assigned canonical `category: 'celebration-boxes'` (bringing the catalog to 97 products: 22 nuts + 2 gift boxes + 8 celebration boxes + 13 snacks/seeds + 15 oils + 5 essentials + 19 herbs/spices + 13 bundles = 97).
- **After**: Updated assertion to `{ nuts: 22, 'gift-boxes': 2, 'celebration-boxes': 8, ... }`. Assertions were strictly preserved without weakening: all 97 products are accounted for in their exact canonical categories.

### C. Explanation of `tests/stage4-navigation.test.tsx` Edit
- **Underlying Reason**: In `src/config/categories.ts`, `'dry-fruits'` is directly present in `CANONICAL_CATEGORIES` (mapped to `FOOD_CATEGORIES['dry-fruits']`). `resolveCategorySlug('dry-fruits')` checks `CANONICAL_CATEGORIES` first and returns `'dry-fruits'`. The alias `CATEGORY_ALIASES['fruits'] = 'nuts'` applies only to legacy slug `'fruits'`.
- **Preserved Assertions**: Corrected the test to assert `resolveCategorySlug('dry-fruits') === 'dry-fruits'`, and added an explicit assertion `resolveCategorySlug('fruits') === 'nuts'` to verify the alias path. Zero checks were suppressed.

---

## 5. Outstanding Release Gates & Limitations

1. **Firestore Emulator**:
   - **Status**: **BLOCKED (Offline / Not installed in local workspace)**.
   - **Release Policy**: Production readiness is **NOT** claimed for live cloud Firestore mutations. Zero production database writes, zero live deployments, and zero merges to `launch` or `main` have occurred. All data model integrity and transaction ordering guarantees remain verified through shared in-memory transaction test mocks.
2. **Stage 5 Dependencies**:
   - Navigation links to `/shop/celebration-boxes`, `/wholesale`, and `/shop/deals` currently mount through existing category routing with canonical aliases (`gift-boxes`, `/wholesale`). Dedicated Stage 5 pages (`CelebrationBoxesPage.tsx`, `DealsPage.tsx`, `OccasionPage.tsx`) will be introduced in Stage 5 without breaking existing URLs or product links.

---

## 6. Changed Files Summary

- `src/config/navigation.ts` (CREATED): Shared authoritative navigation configuration for desktop and mobile.
- `src/components/BubbleMenu.tsx` (MODIFIED): Two-level header, pointer bridge, 220ms cancelable debounce, keyboard/Escape focus restoration.
- `src/components/MobileMenu.tsx` (MODIFIED): Mobile accordion, compact food category grid, Corporate & Bulk under Gifting.
- `src/layouts/RootLayout.tsx` (MODIFIED): Header RTL binding, search button shortcut, active navigation derivation.
- `src/config/categories.ts` (MODIFIED): Category aliases for `celebration-boxes` and `celebration-box`.
- `src/contexts/catalogTranslations.ts` (MODIFIED): Multilingual strings for all navigation items in `en`, `ur`, and `ar`.
- `tests/stage4-navigation.test.tsx` (CREATED): Unit test suite for two-level header taxonomy, disclosure, mobile drawer, RTL, and aliases.
- `scripts/test-active-navigation.mjs` (CREATED/ENHANCED): Automated headless Chrome CDP interaction test suite and screenshot generator.
- `tests/catalog-expansion.test.ts` (MODIFIED): Explicit canonical category counts matching 97 products.
- `docs/RENOVATION_REQUIREMENTS.md` (MODIFIED): Updated REQ-S4-001 through REQ-S4-005 to VERIFIED.
- `docs/RENOVATION_HANDOFF.md` (MODIFIED): Updated to v4.0.0.

---

## 7. Scope Boundary & Stopping Gate

**STOPPING POINT:** Development and verification are strictly halted at the Stage 4 completion gate.
- **DO NOT** begin Stage 5 (no homepage or collection-page redesigns).
- **DO NOT** merge `feat/renovation-v2` into `launch` or `main`.
- **DO NOT** deploy to production or write live database records.
- Awaiting explicit user review and authorization.
