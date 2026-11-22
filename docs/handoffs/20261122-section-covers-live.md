# Handoff: Final Section Cover (`bundles`) + All 13 Studio Covers Wired Live (`ag/20261122-section-covers-live`) — 2026-11-22

## Context & Branch
- **Task Branch:** `ag/20261122-section-covers-live` (cut from `origin/claude/celebrations-foundation-20261112` at `8fde837`; deploy branch untouched; zero Firestore writes).
- **Preview Sheet:** `docs/design/SECTION_COVERS.html` (`13 ready, 0 pending`).

---

## What Was Done

### 1. Final 13th Section Cover (`bundles`) Generated & Verified + Responsive 800w Variants for All 13
- Generated `public/images/section-covers-20261120/bundles.webp` (`1600×1600` WebP, `196 KB`) in the shared AllBarka travertine + forest-green linen studio style (bowls of whole almonds & roasted pistachios, open plain cream box of Mazafati dates, plain glass jars of golden honey & amla murabba; zero text/labels/price tags/honey dippers) and visually inspected via `read_file`.
- Generated responsive `800×800` WebP variants (`public/images/section-covers-20261120/<id>-800.webp`, `53 KB`–`108 KB`) for all **13** covers via Pillow LANCZOS WebP (`quality=84, method=6`) so mobile devices download ~60% smaller covers via `srcSet`.
- Rebuilt `docs/design/SECTION_COVERS.html` via `scripts/build-section-covers-sheet.ts` (`13 ready, 0 pending`).

### 2. Single Source of Truth & Trilingual EN/UR/AR Alt Text
- Added `src/config/sectionCovers.ts` (`SECTION_COVERS`, `SECTION_COVER_IDS`, `getSectionCover()`, `sectionCoverSrcSet()`) mapping all 13 canonical sections and aliases (`dry-fruits → nuts`, `seeds-snacks → snacks-seeds`, `gifts/combos → gift-boxes`, `deals → bundles`, `bid-boxes/personalized-treats → celebration-boxes`).
- Added accurate, descriptive **EN / UR / AR** alt text for all 13 covers in `src/contexts/catalogTranslations.ts` (`catalog.alt.<id>`) and synchronized legacy `imageAlt.category*` keys in `src/contexts/LanguageContext.tsx` (zero health claims).

### 3. Wired All 13 Covers Live with Responsive `srcSet` (`800w, 1600w`)
- `src/components/CategoryCarousel.tsx`: replaced all legacy `/assets/categories/*` and `/images/generated/category-*` paths and empty fallbacks (`murabba-jaat`, `herbal-teas`) with `SECTION_COVERS` / `getSectionCover()`, responsive `srcSet` (`800w, 1600w`) + `sizes`, and EN/UR/AR `alt`.
- `src/components/CategoryPLP.tsx`: wired matching studio cover with responsive `srcSet` + EN/UR/AR `alt` and RTL-aware readability scrim into the `/shop` and `/shop/:category` header banner.
- `src/components/DestinationHeader.tsx`, `src/components/CelebrationBoxesDestination.tsx`, `src/components/DealsDestination.tsx`: added `coverId` support (`celebration-boxes`, `bundles`) with responsive `srcSet`, EN/UR/AR `alt`, and dark-emerald scrim.
- `src/components/GiftsHampersDestination.tsx`: updated `/gifting` hero `<figure>` to `SECTION_COVERS['gift-boxes']` with responsive `srcSet` and EN/UR/AR `alt`.
- `src/pages/ShopPage.tsx` & `src/lib/routeDocument.ts`: wired category cover paths into `<SEO image={...} />` and SSR Open Graph metadata for `/shop`, `/gifting`, and `/shop/:category`.

### 4. Tests & Verification
- Added `tests/section-covers.test.ts` validating all 13 `1600w` + `800w` files on disk, `srcSet` formatting, EN/UR/AR translations, zero legacy paths in `PANTRY_CATEGORIES`, and SSR category OG metadata.
- `npm run typecheck` → Exit 0
- `npm run lint:hooks` → 0 errors
- `node --import tsx --test tests/catalog-categories.test.tsx tests/section-covers.test.ts tests/route-document.test.ts` → **`# pass 16 / # fail 0`**
- `npm run build` → **PASS** (`✓ built in 10.46s`, `Release privacy audit passed (123 text artifacts; no private values printed)`)
- Full suite (`ALLBARKA_SKIP_LOCAL_ENV=true node scripts/run-all-tests.mjs`) → `984 pass / 2 fail / 1 emulator skip`; fixed the 1 real test (`tests/catalog-categories.test.tsx` expecting legacy `category-saunf-tile-v1.webp` → now `# pass 8 / # fail 0` → **985 pass / 0 app fails**). The remaining `tests/dev-server.test.mjs:54` (`'SIGTERM' !== null`) is a Windows-only Node `SIGTERM` exit-signal check (all HTTP/CSP/SPA assertions in that test passed; Linux CI catches `SIGTERM` cleanly).
- Headless Chromium mobile (`390×844`, EN / UR RTL / AR RTL) check on `/`, `/shop`, `/shop/dates`, `/shop/murabba-jaat`, `/shop/herbal-teas`, `/gifting`, `/shop/celebration-boxes`, `/shop/bundles`: confirmed responsive `-800.webp` selection via `srcSet`, `naturalWidth > 0`, trilingual EN/UR/AR `alt`, and zero `overflow-x`.
