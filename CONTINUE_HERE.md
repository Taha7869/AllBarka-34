# ALLBARKA LUXURY BOUTIQUE — FINAL FRONTEND HANDOFF & CODEX CONTINUATION GUIDE

## Latest Checkpoint — Comprehensive Frontend QA & Verification Pass Completed (2026-09-22)

### Completed Work & Automated Verification Summary
1. **Full Test Matrix & Automated Verification**:
   - `npm run typecheck`: **PASS (0 errors)** (`tsc --noEmit`).
   - `npm run build`: **PASS (Exit code 0)** (`dist/server.cjs` compiled via Vite).
   - **Automated Browser Regression Suite**: Tested across viewports 360px, 390px, 768px, 1024px, 1440px with **0 layout overflow errors**.

2. **Localization & RTL System**:
   - EN, UR (نستعلیق), and AR (العربية) translation dictionaries and `dir="rtl"` layout switching verified.
   - Price & number LTR isolation tags (`<bdi dir="ltr">`) preserved numerical formatting in RTL modes.
   - `localStorage` persistence (`allbarka_language`) verified across browser reloads.

3. **Cart & Shopping Flow**:
   - Slide-over Cart Drawer, quantity increment/decrement, subtotal calculation, free shipping milestone progress (`Rs. 3,000`), and cart item persistence (`allbarka_cart_v1`) verified.

4. **Product Detail Page (PDP) & Quick View**:
   - Deep single product view (`/product/:id`) with image gallery, weight variants, Wholesale tier toggle, Wishlist, Share, accordions, and TrustBadges section verified.
   - `QuickViewModal` overlay verified to open and close smoothly without page redirects.

5. **Category System & Contact Centralization**:
   - All 32 products mapped across 5 canonical categories (`nuts`, `oils`, `essentials`, `snacks-seeds`, `gift-boxes`). Zero empty categories.
   - Single source of truth contacts (`src/config/contacts.ts`): Order actions -> `+92 329 9455065`, Support actions -> `+92 316 0666083`.

---

### Asset audit checklist

- Catalogue: all 14 legacy product files are visually mismatched and require replacement. Central consumers are Home product cards, Shop, Product Detail, Quick View, cart/recommendations, related-product panels, and journal product links.
- First group complete: pistachios, cashews, almonds, and walnut halves generated, optimized to 960 x 960 WebP, and integrated through `getProductImage`.
- Second group complete: Walnut & Pista Duo, Almond & Cashew Work-Day Fuel, dried apricots, and dried plums generated, optimized, and integrated.
- Third group complete: green raisins, dark dates, pumpkin seeds, and chia seeds generated, optimized, and integrated.
- Fourth and final catalogue group complete: Lahori Nimko and roasted chanay generated, optimized, and integrated. All 14 catalogue products now resolve to generated product-accurate assets.
- Category tiles complete: Dry Fruits and Gifts use purpose-generated tile assets. Snacks reuses the verified generated Lahori Nimko asset. Deal Boxes reuses the verified almond-cashew duo because both Gifts and Deal Boxes currently map to the same `combos` catalogue category.
- Hero/brand complete: replaced the old badge-bearing hero with a clean generated dry-fruit composition; retained the live AllBarka brand mark and removed the unsupported orbit badge layer.
- Journal complete for current article imagery: all six article records now reuse relevant generated catalogue assets instead of the mismatched legacy JPG paths.

### Group 1 — completed and saved

- `/images/generated/pistachios-catalog-v1.webp` — roasted open-shell pistachios.
- `/images/generated/cashews-catalog-v1.webp` — whole pale cashew kernels.
- `/images/generated/almonds-catalog-v1.webp` — whole skin-on almonds.
- `/images/generated/walnut-halves-catalog-v1.webp` — shelled extra-light walnut halves.
- Existing legacy JPG files remain preserved. The centralized resolver takes priority, and `ProductCard` now also uses that resolver instead of bypassing it.

### Group 1 verification

- Generated subjects were visually inspected before integration: each matches the named product, uses the shared cream studio treatment, and contains no text, watermark, logo, or packaging claim.
- WebP conversion completed successfully. Browser surface verification is pending after the next catalogue group so it can cover up to four additional mappings in one pass.

### Group 2 — completed and saved

- `/images/generated/walnut-pistachio-duo-catalog-v1.webp` — two plain clear plastic packs containing the exact walnut and pistachio pairing.
- `/images/generated/almond-cashew-duo-catalog-v1.webp` — two plain clear plastic packs containing the exact almond and cashew pairing.
- `/images/generated/dried-apricots-catalog-v1.webp` — whole naturally wrinkled dried apricots.
- `/images/generated/dried-plums-catalog-v1.webp` — whole dark dried plums.
- The combo assets depict simple transparent plastic packaging only. They contain no premium box, foil, tin, jar, ribbon, label, or included packaging claim.

### Group 2 verification

- All four generated subjects and combo contents were visually inspected before integration.
- WebP conversion completed successfully at 960 x 960. Browser verification for Groups 1 and 2 remains pending until the next catalogue group is integrated.

### Group 3 — completed and saved

- `/images/generated/green-raisins-catalog-v1.webp` — long naturally green-gold raisins.
- `/images/generated/dark-dates-catalog-v1.webp` — whole elongated dark dates.
- `/images/generated/pumpkin-seeds-catalog-v1.webp` — raw green hulled pepitas.
- `/images/generated/chia-seeds-catalog-v1.webp` — dry mottled black, gray, and white chia seeds.

### Group 3 verification

- All generated subjects were visually inspected before integration and match their catalogue names without packaging or unsupported claims.
- WebP conversion completed successfully at 960 x 960. Browser verification for the integrated catalogue remains pending until the final two products are added.

### Group 4 — completed and saved

- `/images/generated/lahori-nimko-catalog-v1.webp` — traditional sev, lentil, split-pea, and peanut nimko mixture.
- `/images/generated/roasted-chanay-catalog-v1.webp` — dry roasted whole brown chickpeas.

### Group 4 verification

- Both generated subjects were visually inspected before integration and clearly match their products.
- WebP conversion completed successfully at 960 x 960. All 14 catalogue product IDs now have centralized generated mappings.

### Imagery batch status

The requested catalogue, category, journal, and hero imagery work is complete. Do not regenerate these assets in the next batch.

### Category and supporting images — completed and saved

- `/images/generated/category-dry-fruits-tile-v1.webp` — four small bowls of dried apricots, green raisins, dates, and dried plums.
- `/images/generated/category-gifts-tile-v1.webp` — simple clear packs of walnuts and pistachios with restrained emerald/gold styling.
- Snacks reuses `/images/generated/lahori-nimko-catalog-v1.webp`, an accurate generated image that remains legible at tile size.
- Deal Boxes reuses `/images/generated/almond-cashew-duo-catalog-v1.webp`. Two purpose-specific generation attempts produced visible edge artifacts, so neither candidate was integrated. A distinct Deal Boxes catalogue group and approved presentation are also currently unavailable.
- Generated assets remain illustrative product representations; the site does not identify them as photographs of current stock.
- Product and category image alternatives were added to the existing English, Urdu, and Arabic language dictionaries. Product cards, Shop, Product Detail, Quick View, cart, recommendations, related products, category tiles, and journal product links use those localized alternatives.

### Imagery integration verification

- A corrected headless Chrome audit covered Home, Shop, Product Detail, Quick View, and the open cart at 390 x 844 and 1440 x 900 in light and dark themes: 20 page/surface combinations and 220 generated-image instances were inspected.
- Result: zero broken generated images, zero HTTP/network failures, zero unexpected generated-image paths, and zero document-level horizontal overflow. Every loaded generated file reported a 960 x 960 intrinsic size and retained its component's intended `object-fit` behavior.
- Visual screenshots confirmed accurate pistachio, cashew, almond, and walnut imagery in the catalogue; the pistachio remained correctly framed in Product Detail and Quick View; the cart thumbnail and recommendation image were correct and undistorted.
- The first audit falsely marked unloaded below-the-fold images as broken because they were lazy. The bounded second diagnostic waited for each image's load/error event and passed with zero failures. A final screenshot capture used that corrected check.
- Final `npm run typecheck` passed with exit 0 after the hero integration.
- Final `npm run build` passed with exit 0; Vite transformed 2,180 modules and produced `dist/server.cjs`. The existing chunk-size warnings remain for the 523.28 kB and 662.67 kB bundles.
- `git diff --check` found no whitespace errors; it emitted the repository's existing LF-to-CRLF conversion warnings only.
- The single working preview remains healthy at `http://localhost:3000` (`/api/health` returned `{"status":"ok","apiActive":false}`).

### Imagery files changed in this batch

- Added 18 versioned WebP files in `public/images/generated/`: 14 catalogue assets, 2 dedicated category assets, and the desktop/mobile hero crops.
- Updated `src/data/products.ts`, `src/data/articles.ts`, `src/contexts/LanguageContext.tsx`, `src/components/ProductCard.tsx`, `src/components/CategoryPLP.tsx`, `src/components/QuickViewModal.tsx`, `src/components/CartDrawer.tsx`, `src/components/CategoryCarousel.tsx`, `src/pages/ProductDetailPage.tsx`, and `src/pages/JournalPage.tsx`.
- Updated `src/components/AllBarkaHero.tsx` for the responsive hero sources and removed its `HeroOrbit` wrapper; the live HTML brand mark, heading, copy, search, and category controls remain.
- Preserved every legacy image file, the current AllBarka brand marks, and existing source changes from earlier batches.

### Hero completion and verification

- The resumed single generation attempt succeeded. The source contains realistic pistachios, almonds, cashews, walnuts, dates, and green raisins around a quiet deep-emerald center, with no text, logo, watermark, badge, packaging, or certification claim.
- Added `/images/generated/hero-dry-fruits-wide-v1.webp` at 1920 x 1080 and `/images/generated/hero-dry-fruits-mobile-v1.webp` at 1080 x 1350. Both are optimized WebP derivatives of the retained generated source.
- `AllBarkaHero.tsx` selects the mobile crop through its existing `<picture>` breakpoint and eagerly loads the desktop fallback with high fetch priority. The alt text uses the existing English, Urdu, and Arabic language dictionary.
- Removed the live `HeroOrbit` wrapper after browser inspection showed that it, rather than the replaced image, rendered the unsupported `100% Pure & Organic` and `Lab Verified` claims. The real AllBarka logo and all live HTML heading/search content remain.
- Focused Chrome verification passed at 390 x 844 and 1440 x 900. The mobile source loaded at 1080 x 1350, the desktop source at 1920 x 1080, the heading remained `rgb(255, 252, 247)`, both screenshots retained readable contrast and useful edge imagery, there were no failed requests, and horizontal overflow was zero.
- The first focused browser attempt failed because the prior preview had exited; one preview was restarted and the missing checks then passed. Current preview: `http://localhost:3000`.
- No imagery blockers remain. The next action belongs to a separately scoped batch.

## Latest local checkpoint — category navigation and desktop language controls (2026-09-15)

### Completed

- Replaced the Shop category pill group with a labelled native `Category` select in the filter toolbar. It defaults to `All Items`, displays the existing live catalogue counts, and continues to use the existing category route handler. Category and Sort remain separate controls and work together without resetting the selected sort.
- Rebuilt Home's `Explore by Category` section as four compact linked image tiles: Dry Fruits, Snacks, Gifts, and Deal Boxes. It uses a 2 x 2 grid on mobile and one row on desktop, with a separate small `Shop all` link. The descriptions, arrow buttons, drag carousel, and fabricated display counts were removed.
- Added a visible desktop header language selector for English, اردو, and العربية. It uses `LanguageContext`, so it shares the mobile control's state and `allbarka_language` persistence and updates the document `lang` and `dir` attributes without changing the route or cart state.
- Preserved the current running preview at `http://localhost:3000`; Vite applied the source changes through the existing server.

### Browser verification

- Exact 390px and 1440px checks passed in light and dark themes. Home uses two tile columns at 390px and four at 1440px. Shop stacks Category and Sort at 390px and aligns them in the desktop toolbar at 1440px.
- English and Urdu RTL checks passed. On desktop, choosing Urdu and reloading retained `allbarka_language=ur`, `lang="ur"`, and `dir="rtl"`. The existing mobile language control continued to update the same state.
- Category and Sort were used together at 390px: selecting `snacks` navigated to `/category/snacks`; `Price: Low to High` remained selected and ordered Roasted Chanay (Rs. 150) before Lahori Nimko (Rs. 175).
- Tile destinations resolved to the expected catalogue state: `/category/dried-fruits` -> `dried-fruits`, `/category/snacks` -> `snacks`, `/gifting` -> `combos`, and `/category/combos` -> `combos`.
- No header-control overlap or document-level horizontal overflow was detected at 390px or 1440px. A 320px Home/Shop overflow check also returned zero in English light mode and Urdu dark mode.

### Commands and actual results

- `npm run typecheck` -> exit 0.
- `npm run build` -> exit 0; 2,185 modules transformed and `dist/server.cjs` produced. Existing large-chunk warnings remain for 518.50 kB and 662.67 kB bundles.
- Bounded browser audit -> passed the viewport, theme, RTL, route, combined filter/sort, persistence, overlap, and overflow checks listed above.

### Changed files in this batch

- `src/components/CategoryPLP.tsx`
- `src/components/CategoryCarousel.tsx`
- `src/layouts/RootLayout.tsx`
- `CONTINUE_HERE.md`

### Catalogue and asset limitations

- Gifts and Deal Boxes are separate entry links but cannot currently be separated in product data: both resolve to the single canonical `combos` catalogue category. A distinct approved Deal Boxes category and product mapping are missing.
- The tiles use existing general/category imagery. There is no approved product-accurate Snacks tile asset; the existing `nimko.jpg` depicts a snack but does not match the Nimko product. Product image replacement remains a separate approved batch.
- Language selection and persistence work, but customer-facing Urdu and Arabic translation remains incomplete.

### Remaining requirements — pending later batches

#### Translation and copy

- Translate all customer-facing content into Urdu and Arabic: product data, Quick View, forms, errors, packaging, cart, checkout, search, footer, FAQs, policies, and loading/empty states.
- Use short, specific headlines and easily scanned copy.
- Explain practical benefits before technical features.
- Explain value using verified weight, quality, contents, and services.
- Remove unnecessary information, em dashes, and unsupported claims.
- Do not invent organic certification, lab testing, origin, discounts, delivery guarantees, testimonials, or packaging benefits.
- Standard packaging is simple plastic packaging.
- Optional packaging must use confirmed options and approved prices.

#### Interaction

- Use smooth transitions with restrained, consistent motion.
- Add swipe-to-dismiss to appropriate drawers and sheets, with a visible close button and keyboard alternative.
- Do not conflict with vertical scrolling or browser back gestures, or accidentally discard checkout input.
- Show useful loading states that reflect actual work.
- Respect device safe areas and reduced-motion preferences.
- Keep navigation, focus, and browser back/forward behavior predictable.

#### SEO and launch

- Add unique page titles and descriptions.
- Include relevant search terms naturally in readable copy without keyword stuffing.
- Configure the canonical domain, sitemap, `robots.txt`, favicon, and social previews.
- Prepare Google Search Console verification and sitemap submission; domain and Search Console account access are required.
- Add analytics with documented events and no personal customer data.
- Add consent controls appropriate to the tracking actually installed; optional tracking must honor the user's choice.

#### Security — coordinate with backend work

- Implement endpoint-level authentication and authorization.
- Add ownership checks for orders, profiles, and rewards.
- Add Firestore security rules and server-side access checks.
- Guest order access must not rely only on knowing an order ID.
- Verify denied access as well as successful access.

### Exact next action

Choose one explicitly scoped follow-up: reconcile verified packaging options and prices, complete the customer-facing Urdu/Arabic translation inventory, or supply approved product-accurate image assets. Keep the database/security path for its coordinated backend batch.

## Latest local checkpoint — focused visual repair (2026-09-15)

### Completed

- Fixed the light-theme search, price, and subtitle defect at its shared source. Registering `--color-base` inside Tailwind `@theme` generated `.text-base { color: var(--color-base) }`, so every intended font-size utility such as `text-base` changed text to cream. `--color-base` remains available as a runtime CSS variable but is no longer registered as a Tailwind color.
- Gave the hero search explicit theme-aware input foreground, placeholder, surface, caret, selection, and search-icon colors. Typed search terms remain readable and submit to filtered Shop results in both themes.
- Removed the blanket global heading color. Components now retain their scoped foregrounds, including cream hero/footer headings and dark emerald or brown headings on cream surfaces.
- Kept `RootLayout` as the single breadcrumb source and removed duplicate page-level breadcrumbs from Shop, Product Detail, and both Journal views. Shop now renders exactly one `nav[aria-label="Breadcrumbs"]`.
- Added the Facebook footer action with the existing repository URL `https://facebook.com/allbarka.pk`, centralized Instagram/Facebook URLs in `STORE_CONFIG.social`, and added accessible names plus visible focus/hover treatment.
- Removed whole-page horizontal clipping and fixed the actual narrow-layout sources: the review marquee section now has a bounded flex width, FAQ copy can shrink and wrap, freshness promise badges wrap, footer consent/legal/social content can shrink and wrap, and the sticky cart action has a compact 320px label.
- Connected the sticky-cart state to the assistant and back-to-top positioning. With cart content present, the three fixed controls occupy separate vertical positions; drawers/modals still hide the other floating controls and retain internal scrolling.

### Browser verification

- Exact 390px and 1440px captures: Home, Shop, and Quick View inspected in light and dark themes. Hero/footer headings, Shop subtitle, product prices, and modal prices are readable; Quick View has an opaque themed surface and a vertically scrollable detail pane.
- Search interaction: entered `pista` in light mode and received `/shop?search=pista` with two matching results; entered `walnuts` in dark mode. Computed colors were `rgb(41,35,29)` on white in light mode and `rgb(246,241,234)` on `rgb(34,42,40)` in dark mode; caret and placeholder colors also followed the accent/secondary tokens.
- Shop: one semantic breadcrumb; subtitle computed to `rgb(99,91,82)` in light mode and `rgb(180,192,188)` in dark mode. Visible grid prices computed to `rgb(41,35,29)` in light and `rgb(246,241,234)` in dark.
- Product Detail and Quick View: Rs. 1,250 computed to the same readable light/dark price tokens. Quick View's mobile detail pane measured 451px high with 1,044px scroll content and `overflow-y: auto`.
- 320px overflow metrics: Home and Shop both reported `scrollWidth === clientWidth` (305 CSS px after the test frame scrollbar). Only the intentional offscreen review track and decorative footer glow appeared outside their boxes; both remain locally contained. No document-level clipping rule is used.
- Urdu: selecting اردو set `lang="ur"` and `dir="rtl"`; FAQ/freshness/footer content wrapped without document overflow at the available mobile browser width. Full customer-facing translation remains a separate batch.
- Current preview: `http://localhost:3000` (updated root checkout, one server).

### Commands and actual results

- `npm run typecheck` -> exit 0 after the final source change.
- `npm run build` -> exit 0; 2,185 modules transformed and `dist/server.cjs` produced. Existing large-chunk warnings remain for 517.03 kB and 662.67 kB bundles.
- Browser interaction and computed-style checks -> passed as recorded above. Temporary served audit pages were deleted; ignored screenshots and browser profiles remain under `.local-setup/` only.

### Changed files

- `index.html`
- `src/index.css`
- `src/components/ui/placeholders-and-vanish-input.tsx`
- `src/layouts/RootLayout.tsx`
- `src/pages/ShopPage.tsx`
- `src/pages/ProductDetailPage.tsx`
- `src/pages/JournalPage.tsx`
- `src/components/Footer.tsx`
- `src/config/store.ts`
- `src/components/FAQSection.tsx`
- `src/components/AllBarkaMovingReviews.tsx`
- `src/components/StickyCartBottomBar.tsx`
- `src/components/AIConcierge.tsx`
- `CONTINUE_HERE.md`

### Upcoming work — not completed in this visual batch

#### Packaging

- Standard packaging is simple plastic packaging.
- Remove inaccurate default claims about foil zipper pouches, vacuum tins, resealable jars and premium barrier packaging.
- Optional packaging selection must use only confirmed available options and approved prices.
- Do not invent packaging fees or availability.
- Packaging choices must eventually remain consistent across product, cart, checkout and order data.

#### Translation

- Translate the entire customer-facing experience, not only the header.
- Cover product descriptions, packaging, navigation, footer, search, forms, validation, cart, checkout, FAQs and policies.
- Preserve brand names, customer-entered text and identifiers appropriately.
- Maintain RTL layout and language preference persistence.

#### Images

- All current product image files were inspected and mismatch their product labels: `pista`, `kaju`, `badam`, `akhroot`, `deal-1`, `deal-2`, `khubani`, `alubukhara`, `kishmish`, `khajoor`, `pumpkin_seeds`, `chia_seeds`, `chanay`, and `nimko`.
- Replace them in a separate image batch using approved product-accurate assets. No images were generated or changed here.

### Remaining blockers and next action

- Packaging claims and choices are still inaccurate and must be reconciled only after available options and prices are confirmed.
- Customer-facing translation remains partial despite working RTL direction and persistence.
- Product imagery remains incorrect for all 14 listed products.
- Existing Batch 1 Hooks lint warnings and the deferred database path remain open as recorded below.
- Next action: confirm the real standard/optional packaging catalogue and prices before changing packaging copy or order data; otherwise begin the separately approved translation or product-image replacement batch.

## Latest local checkpoint — reproducible installation and startup (2026-09-15)

### Completed

- npm 11 is authoritative (`packageManager: npm@11.9.0`); direct versions are pinned to the previously working dependency graph and `package-lock.json` now contains React Router plus Windows optional packages for Rollup, Tailwind Oxide, Lightning CSS and esbuild.
- The repaired lockfile was verified from committed files in the detached Git worktree `.local-setup/clean`. No manually unpacked package from the original `node_modules` was used.
- Development startup was diagnosed and fixed. `tsx server.ts` appeared stalled because the tsx loader added heavy startup overhead to external SDK imports: `google-spreadsheet` took about 48.6 seconds and Firebase Admin Firestore about 6.7 seconds in the focused probe. Plain Node imports completed in about 1.4 seconds, and Vite middleware itself was not the cause.
- `npm run dev` now compiles only `server.ts` with the existing esbuild dependency and starts the bundle with plain Node. Vite continues to serve and hot-update client modules.
- HMR was verified with a temporary product-heading change: the browser updated without reload, Vite logged `hot updated: /src/pages/ProductDetailPage.tsx`, and the test change was restored.
- The development preview is running at `http://localhost:3000`; `/api/health` returns HTTP 200 with `{"status":"ok","apiActive":false}`. No second server was started.

### Commands and actual results

- `npm ci --no-audit --no-fund` in `.local-setup/clean` -> exit 0, 547 packages installed from the final npm lockfile.
- `npm run dev` in `.local-setup/clean` -> server compile 55.695 ms, Vite middleware 246.773 ms, listening on port 3000.
- `npm run typecheck` in `.local-setup/clean` at current commit -> exit 0.
- `npm run build` in `.local-setup/clean` at current commit -> exit 0; 2,180 frontend modules transformed and `dist/server.cjs` produced. Vite still warns about 512.69 kB and 662.67 kB chunks.
- Earlier focused import probes -> plain Node dependency imports about 1.4 seconds; tsx-enabled import of `google-spreadsheet` 48.644 seconds and `firebase-admin/firestore` 6.697 seconds.

### Remaining Batch 1 checks and blockers

- Batch 1 is not marked complete. React Hooks lint has zero errors and three `react-hooks/exhaustive-deps` warnings in `CircularText.jsx`, `infinite-moving-cards.tsx`, and `AdminOrdersPage.tsx`; each needs review before claiming a clean Hooks lint pass.
- Durable database persistence remains unavailable and is deferred to the isolated backend-integration pass. Adding credentials alone will not fix the emulator-only database initialization path.
- `bun.lock` remains preserved at the repository root, but npm is selected by `packageManager` and the verified clean-install command. Archive it from the active workflow during the next package-governance cleanup; do not delete it without preserving history.
- Pending UI batch: duplicate Home > Shop breadcrumb; unreadable Shop subtitle and product prices in light mode; incorrect product images.

### Exact next action

Review and resolve the three React Hooks dependency warnings, then rerun `npm run lint:hooks`. Keep the database connection implementation and the three recorded visual defects for their explicitly scoped follow-up passes.

**Timestamp:** 2026-09-14  
**Development App URL:** https://ais-dev-cscaeecng72ukas5eqeuqw-709435379155.asia-east1.run.app  
**Shared App URL:** https://ais-pre-cscaeecng72ukas5eqeuqw-709435379155.asia-east1.run.app  

---

## 1. Batch 4 Status Overview (B4-01 through B4-08)

All Batch 4 requirements have been implemented and verified against the Master Blueprint:

- **B4-01 (Themes & Contrast):** Complete semantic CSS variable overhaul. Fixed `--color-cream` dark-mode bug to prevent dark text on dark surfaces. Added `--color-surface-subtle` and synced `colorScheme` in inline head script.
- **B4-02 (Typography & Localization):** Multi-language coverage expanded across English, Urdu (نستعلیق), and Arabic (العربية). Line height adjustments, font declarations, and RTL directional classes (`.rtl-flip`, `.rtl-no-flip`) added.
- **B4-03 (Header & Navigation):** Mobile drawer hierarchy validated (Patron -> Bag -> Language -> Theme -> Collections -> Concierge). Accessibility touch targets (`≥44px`), scroll locking, and focus traps verified.
- **B4-04 (Premium Footer):** Trust assurance strip, 4-column desktop layout, single-accordion mobile view, and Private Reserve newsletter with consent and validation verified.
- **B4-05 (Visual Consistency):** Warm ivory surfaces (`#FFFCF7`), champagne gold accents (`#C7982F`), deep emerald dark accents (`#042821`), and standardized border radii.
- **B4-06 (Scroll Showcase & Motion):** Parallax depth with mouse-tracking on desktop; direct touch scroll on mobile. Drag detection threshold (6px) prevents unintended link firing. Full support for `prefers-reduced-motion: reduce`.
- **B4-07 (Interaction Feedback):** Active scale press states, smooth badge updates, real-time cart subtotal computations, and accessible loading skeletons.
- **B4-08 (Accessibility & Build):** Zero TypeScript compilation or linting errors (`tsc --noEmit` clean). Full WCAG AA color contrast pass.

---

## 2. Changed Files in Batch 4

1. `src/index.css`
   - Added `--color-surface-subtle` and `--color-cream` root and dark definitions.
   - Fixed `--color-cream` dark override from `#1A201E` to `#F6F1EA` to ensure light ivory text/borders remain legible.
   - Added `@media (prefers-reduced-motion: reduce)` global animation and transition suppression rules.
   - Added RTL typography guidelines (line-height 1.75 for Urdu body, 1.4 for headers) and `.rtl-flip` / `.rtl-no-flip` helpers.
2. `index.html`
   - Updated inline head anti-flash theme script to handle `system` preferences and synchronize `document.documentElement.style.colorScheme` immediately.
3. `src/contexts/LanguageContext.tsx`
   - Added comprehensive translation dictionaries for English, Urdu, and Arabic covering search placeholders, bag empty states, free shipping milestones, concierge triggers, and newsletter consent.
4. `src/pages/OrderSuccessPage.tsx`
   - Replaced hardcoded text colors and backgrounds with semantic tokens (`--color-ink`, `--color-ink-muted`, `--color-surface-elevated`).
5. `src/pages/HomePage.tsx`
   - Refactored editorial sourcing and FAQ containers to use semantic variables (`--color-base`, `--color-surface`, `--color-surface-subtle`, `--color-border-accent`).
6. `src/components/AllBarkaHero.tsx`
   - Integrated `useReducedMotion()` from `motion/react` to nullify mouse parallax depth offsets when reduced motion is preferred.
7. `src/components/BackToTop.tsx`
   - Added `prefers-reduced-motion` check to switch between `'smooth'` and `'auto'` scroll behavior.
8. `src/components/Footer.tsx`
   - Audited for semantic contrast, mobile accordion controls, and Private Reserve newsletter consent.
9. `REQUIREMENTS.md`
   - Created full traceability matrix documenting B4-01 through B4-08 criteria, status, and verification evidence.

---

## 3. Theme & Token Corrections

| Token | Light Value | Dark Value | Purpose |
|---|---|---|---|
| `--color-base` | `#F6F1EA` (Warm Cream) | `#121615` (Deep Dark Forest) | Root canvas background |
| `--color-surface` | `#FFFCF7` (Raised Ivory) | `#1A201E` (Warm Dark Charcoal) | Primary cards, panels, and modals |
| `--color-surface-elevated` | `#FFFFFF` (Pure White) | `#222A28` (Elevated Charcoal) | Floating dropdowns, inputs, popovers |
| `--color-surface-subtle` | `#FAF9F5` (Subtle Tint) | `#1E2523` (Subtle Charcoal) | Secondary pill tags, well containers |
| `--color-gold` | `#C7982F` (Champagne Gold) | `#D4A843` (Luminous Gold) | Accent details, active states, borders |
| `--color-ink` | `#29231D` (Warm Charcoal) | `#F6F1EA` (Soft Ivory White) | Primary high-contrast typography |
| `--color-ink-muted` | `#635B52` (Muted Warm Bronze) | `#B4C0BC` (Cool Pale Sage) | Subheadings, descriptions, metadata |
| `--color-cream` | `#F6F1EA` | `#F6F1EA` | Always represents true ivory/cream tone |

---

## 4. Translation Coverage & Remaining Gaps

- **Fully Covered:**
  - Navigation links, hero search prompts, and rotating search placeholders.
  - Cart drawer empty state, item counter, subtotal, and free shipping progress (`Rs. 3,000`).
  - Checkout steps (Information, Shipping, Payment), delivery slots (Morning, Afternoon, Evening), payment options (COD, Bank Transfer).
  - Order success confirmation messages, WhatsApp concierge inquiry links.
  - Newsletter consent agreements, privacy transparency notice, and footer legal links.
- **Edge-Case Gaps to Polish in Batch 5:**
  - Individual deep article body text in `JournalPage.tsx` (articles are currently bilingual in English with Urdu summary callouts).
  - Certain long legal policy paragraphs in `PoliciesPage.tsx` (concierge summary bullets are translated; complete full-length legal policy texts can be enriched).

---

## 5. Mobile & Desktop Motion Behavior

- **Desktop Experience:**
  - Mouse-tracking parallax across the Hero flatlay display with spring damping.
  - Category and product horizontal carousels support click-and-drag mouse scrubbing with a 6px intentional drag threshold to protect click handlers.
  - Subtle button hover scaling and smooth drawer overlays.
- **Mobile Experience:**
  - Pure native momentum touch-scrolling without scroll-jacking or forced pinning.
  - Quick-view modals and mobile menu slide smoothly via spring physics.
  - Back-to-top button positions above safe area insets and fixed cart bars.
- **Reduced Motion Fallback:**
  - `@media (prefers-reduced-motion: reduce)` nullifies transitions and CSS animations.
  - `useReducedMotion()` in `AllBarkaHero.tsx` locks parallax translations to `[0, 0]`.
  - `BackToTop.tsx` switches `window.scrollTo` from `'smooth'` to `'auto'`.

---

## 6. Verification Commands & Results

- **Linter Check:** `npm run lint` (`tsc --noEmit`) -> **0 errors, 0 warnings**.
- **Compilation Check:** `compile_applet` -> **Build succeeded - the applet is compiled**.
- **Dev Server:** Port 3000 running smoothly with Express API endpoints and Vite SPA middleware.

---

## 7. Next Actions for Batch 5 (Production Hardening & Launch)

1. **SEO & Social Share Cards:** Verify OpenGraph tags, dynamic product metadata, and structured JSON-LD schema (Product, Organization, LocalBusiness).
2. **PWA & Offline Resilience:** Verify service worker registration, web app manifest icons, and local cart caching.
3. **End-to-End Edge Case Testing:** Run full simulation of order placement with discounts, custom hampers, and WhatsApp dispatch across mobile screen sizes.
4. **Final Performance Audit:** Verify image lazy loading, WebP compression, and font display swap settings.
