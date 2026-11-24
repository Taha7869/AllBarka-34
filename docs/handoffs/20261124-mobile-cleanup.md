# Handoff — Mobile Cleanup & Typography Polish (`ag/20261124-mobile-cleanup`)

- **Date:** 24 November 2026
- **Branch:** `ag/20261124-mobile-cleanup` (cut from `origin/claude/celebrations-foundation-20261112` at `2793533`; deploy branch untouched)
- **Author:** Antigravity
- **Status:** Complete, verified, ready for Claude review and merge.

## Summary of Changes

1. **`/shop` mobile single-row controls & above-the-fold first card (`ac25b20`, `2704d3c`):**
   - Placed Search input + `"Filter & sort"` trigger on a single compact horizontal row on mobile (`searchTop: 350px`, `filterTop: 349px` at `375×812`).
   - Moved `Saved`, `Share collection`, `Share wishlist`, and `Compact view` (`role="switch"`, `min-h-[46px]`) inside `CatalogFilterSheet` on mobile (`<1024px`), hiding standalone mobile clutter (`standaloneSaved: 0`, `standaloneShare: 0`, `standaloneCompact: 0`).
   - Compacted the mobile shop header (`table-catalog-header`) so the first row of 2 product cards appears clearly inside the first `812px` screen (`firstCardTop: 523px`, `289px` of first row visible above the fold).
   - Fixed a 1px horizontal overflow at 200% root text zoom (`390px`) on `/shop` mobile cards (`overflow-hidden` + fixed `44px` save button without negative `-me-1.5` margin).

2. **Home hero mobile — eliminated empty green runway gap (`8b0ffef`):**
   - Set mobile hero runway to `min-h-0 lg:min-h-[140vh]` and hero section to `relative lg:sticky lg:top-[76px]`, pulling Section 2's curved cream curtain up (`-mt-4 lg:mt-0`) directly below the 3 callout pills.
   - Kept desktop `140vh` sticky scroll choreography intact and adjusted mobile scroll progress calculation so hero photo scale (`1.08 → 1.00`), warm vignette, and pill parallax remain smooth as the user scrolls past the hero.
   - Measured at `375×812`: `runwayHeight: 728px`, `heroHeight: 728px`, `gapBelowPillsToNextSection: 25px` (zero empty dark-green band).

3. **Site-wide tracked ALL-CAPS → Sentence case & refined `"Bestseller"` badge (`ee1bd66`):**
   - Converted hardcoded ALL-CAPS English translation strings in `src/contexts/catalogTranslations.ts`, `trendTranslations.ts`, `boutiqueTranslations.ts`, and `LanguageContext.tsx` (`The AllBarka collection`, `The AllBarka pantry`, `The AllBarka experience · Lahore`, `The tasting edit`, `The selection guide`, `Shop with clarity`, `Cultivar & flavor comparison`, `Luxury harvests`, etc.).
   - Removed tracked `text-transform: uppercase` + wide `letter-spacing` across storefront stylesheets (`editorial.css`, `boutique.css`, `purchase.css`, `selection-guide.css`, `premium-content.css`, `product-photo-viewer.css`, `visual-refinements.css`, `AllBarkaHero.css`) and 62 customer-facing components/pages (preserving brand wordmark logo, currency codes, admin/staff views, and coupon/order code inputs).
   - Refined `"Bestseller"` badge (`ProductCard.tsx`, `ProductDetailPage.tsx`) to a small sentence-case pill (`11px`, `textTransform: none`), and converted origin pills (`Kerman Orchards & Balochistan Select`), `"Compact view"`, and `"Taste Profile"` to calm sentence case.
   - Playwright verified `uppercaseEls: []` across Home, Shop, PDP, and Gifting at `375px`.

4. **PDP mobile compaction (~50% shorter) & Gifting mobile collapsibles (`b18253f`, `0b881a5`, `2704d3c`):**
   - **PDP mobile (`ProductDetailAccordion.tsx`, `ProductDetailPage.tsx`, `TrustBadges.tsx`, `PdpStickyBuyBar.tsx`):**
     - Folded mobile description, taste profile, and pack contents into Panel 1 (`Description & taste profile`, open by default on `<768px`) alongside collapsed `Use & storage`, `Details & sourcing`, `Packaging details`, `Allergen information`, and new trilingual (EN/UR/AR) `Delivery & ordering FAQ` panels; desktop (`>=768px`) retains its editorial overview under `<h1>`.
     - Compacted mobile photo frame (`aspect-[4/3] max-h-[250px]`), 3-column single-row selection summary, side-by-side Wishlist & Share buttons at `375px`, compact 2×2 `TrustBadges` pills, and horizontal scroll-snap Related Products row.
     - Reduced mobile PDP total height to `3,396px` (~`2,550px` PDP body vs ~`5,100px` previously — ~50% content height reduction).
     - Fixed a scroll-to-top bug in `PdpStickyBuyBar.tsx` where IntersectionObserver kept the mobile sticky buy bar visible after jumping back to `y = 0`.
   - **Gifting mobile (`GiftsHampersDestination.tsx`, `GiftingPlanningToolsBar.tsx`, `editorial.css`):**
     - Made `"Choose your presentation"` (box list) and the planning tools bar (`Plan Mehmaan Table`, `Shop Table Scene`, `Open Selection Guide`) collapsible on mobile (`<768px`, collapsed by default on mobile with `>=44px` disclosure triggers, expanded on desktop `>=768px`).
     - Added synchronized `latestParamsRef` in `GiftsHampersDestination.tsx` to prevent rapid-tap filter clicks from reading stale React Router `searchParams`.

5. **Mobile 2-col card title strict 2-line clamp (`9e8f062`):**
   - Overrode unlayered `editorial.css` (`1.25rem`) on `<640px` with refined `0.875rem` (`14px`, `line-height: 1.3`) EN and `0.9375rem` (`15px`) UR/AR rules plus strict `-webkit-line-clamp: 2` + `max-height` guard while preserving unrestricted desktop wrapping (`catalog-render.test.tsx` 7/7 pass).
   - Verified every visible 2-col card title on `/shop` at `375px` (`worstTitle`: `36px` tall <= `40px` 2-line max).

## Verification Evidence

- **`npm run typecheck`:** 0 errors
- **`npm run lint:hooks`:** 0 errors (3 pre-existing warnings)
- **`npm run build`:** Passed (`dist/` + `build/server.cjs` + Release privacy audit: 150 text artifacts clean)
- **`@375px` Playwright verification (`verify-mobile-cleanup.mjs` against `build/server.cjs`):** All assertions passed (`0` overflow, `0` uppercase elements across all 4 routes, `25px` hero gap, Shop `firstCardTop: 523px`, 2-line title clamp verified, PDP `3,396px` with `overview` expanded & `faq` collapsed, Gifting presentation & planning tools collapsed by default and expanding cleanly).
- **Updated `@375px` screenshots (visually inspected):**
  - `docs/design/mobile-375-home.png`
  - `docs/design/mobile-375-shop.png`
  - `docs/design/mobile-375-pdp.png`
  - `docs/design/mobile-375-gifting.png`
- **Full offline test suite (`ALLBARKA_SKIP_LOCAL_ENV=true node scripts/run-all-tests.mjs`):**
  - Backend Production Hardening suite: **11 passed / 0 failed**
  - Node offline runner (`1,019` tests): **1,016 pass / 2 fail / 1 emulator skip**
    - `tests/admin-recipe-editor-browser.test.tsx` (untouched admin suite, 30s timeout under concurrent Windows browser CPU load): re-run standalone → **1 pass / 0 fail** (`33.8s`)
    - `tests/dev-server.test.mjs:54`: known Windows-only `SIGTERM !== null` shutdown assertion (passes on Linux CI)
- **Firestore writes:** None. **Secrets committed:** None.
