# AllBarka Renovation — Stage 5B Review Packet & Handoff v5.5

**Document Version:** 5.5.0  
**Date:** October 18, 2026  
**Baseline Git Commit:** `8b47974` -> `feat/renovation-v2`  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 5B DEDICATED DESTINATIONS & COLLECTION PAGES COMPLETE & VERIFIED — HALTED AT STAGE 5B COMPLETION GATE**

---

## 1. Stage 5 Scope Boundaries

Stage 5 is split into three discrete, reviewable milestones:
- **Stage 5A (Completed & Verified):** Homepage, Boutique Selections showcase, autoplay lifecycle, collection alias normalization & visibility conflict resolution, merchant occasion titles, and real browser provider-fetch integration.
- **Stage 5B (Implemented & Fully Verified Here):** Dedicated collection & occasion destinations (`/shop/celebration-boxes`, `/gifting`, `/shop/deals`, `/occasions`, `/wholesale`) with working legacy aliases, transparent wholesale policies, honest empty states, and direct checkout / inquiry flows.
- **Stage 5C (Explicitly Pending):** Verified packaging catalog expansion (minimum 6 distinct products per subcategory), comprehensive descriptions, and original studio photography assets.
- **Stage 6 & AI Architecture (Explicitly Pending):** Production release gates, emulator sign-off, live deployments.

> [!IMPORTANT]
> **Strict Halt Gate:** Stage 5B is fully implemented and verified. Stage 5C and Stage 6 remain explicitly pending. Zero live production database writes, zero merges to `launch`/`main`, and zero production deployments have occurred. Firestore Emulator remains an outstanding release gate.

---

## 2. Dedicated Destinations Implemented in Stage 5B

### 2.1 Celebration Boxes (`/shop/celebration-boxes`, aliases: `/shop/bid-boxes`, `/category/celebration-boxes`)
- **Approved Subcategories Filter:**
  1. *Signature Tin Boxes* (`bid-box-luxury-tin`) — 1 product
  2. *Hajj & Umrah Tabarruk Sets* (`bid-box-umrah-tabarruk`) — 1 product
  3. *Wedding Favor Boxes & Pouches* (`bid-box-card-nikkah`, `bid-box-pyramid-favor`, `bid-box-jute-pouch`, `bid-box-sweet-nikkah`) — 4 products
  4. *Baby Announcement Boxes* (`bid-box-birth-announcement`) — 1 product
  5. *Personalized Acrylic Boxes* (`bid-box-acrylic-royal`) — 1 product
  *Total:* Exactly 8 verified products in catalog (no invented items or inflated counts; expanded catalog remains Stage 5C).
- **Mandatory Advisories:**
  - *10 Calendar-Day Preparation Notice:* Artisanal custom printing/assembly requires a minimum of 10 calendar days lead time before courier dispatch; transit applies separately upon completion (no guaranteed Day-10 delivery).
  - *Tabarruk Bottles Empty Notice:* Zamzam bottles and Tabarruk vials in all sets are supplied empty unless sacred Zamzam or specific fillings are explicitly listed in package inclusions.
- **Packaging vs. Filled Options:**
  - Mode switch: "All Options", "Empty Packaging Only", "Freshly Filled with Dry Fruits".
  - Empty packaging tiers derived dynamically via `resolveBidBoxConfig` (e.g. 25, 50, 100+ pcs with volume discounts).
  - Filled options display starting prices and roastery fillings.
- **Customer Flow & Actions:**
  - Direct checkout enabled via "Add to Bag" for all standard eligible tiers.
  - "Custom Quote / Large Order (>100 pcs)" launches `openCustomQuoteModal` with selected product and mode.
  - Cross-sell banner to whole dry fruits (`/shop/dry-fruits`) to fill customer-sourced boxes, and luxury finished hampers (`/gifting`).

### 2.2 Gifts & Hampers, Including Baskets (`/gifting`, aliases: `/shop/gift-boxes`, `/shop/combos`)
- **Luxury Lahore Roastery Header:** Eyebrow "Handcrafted in Lahore", title "Luxury Gifts & Curated Hampers", subtitle describing artisanal boxes and wicker baskets.
- **Bespoke Hamper Builder Feature Card:**
  - Explains custom curation (Sheesham Wooden Chest, Emerald Velvet Coffer, Gold Keepsake Tin).
  - "Launch Hamper Builder" button dispatches `open-hamper-builder` event opening the global builder modal.
- **Corporate Executive Gifting Sidecard:**
  - Inquiries for personalized company logo branding and scheduled nationwide courier dispatch.
  - "Request Corporate Inquiry" CTA launches `openCustomQuoteModal({ mode: 'filled', eventType: 'Corporate' })`.
- **Occasion Filter Pills:** Filter gift sets across All Gifts, Wedding (`wedding`), Umrah (`umrah`), Ramadan/Eid (`ramadan`), and Corporate (`corporate`).
- **Product Cards:** Live catalog prices, pack variant selectors, and direct checkout via "Add to Bag".

### 2.3 Deals & Value Packages (`/shop/deals`, alias: `/shop/bundles`)
- **Farm-Direct Savings Header:** Eyebrow "Farm-Direct Savings", title "Value Packages & Curated Deals".
- **Verified Pricing Integrity Notice:** Prominently highlights that all bundle savings badges and discount calculations are derived directly from individual variant component rates with zero artificial markups or unverified strikethroughs.
- **Sub-Filter Chips:**
  - *All Deals & Packages*
  - *Tasting Duos & Pairs* (`deal-1`, `deal-2`, `bundle-daily-grind`, `bundle-tasting-flight`)
  - *Festive Family Hampers* (`bundle-silver-hamper`, `bundle-gold-hamper`, `bundle-platinum-hamper`, `bundle-royal-feast`)
  - *Wellness & Pantry Reserves* (`bundle-brain-fuel`, `bundle-winter-warrior`, `bundle-immunity-shield`, `bundle-sunrise-seeds`, `bundle-mystery-box`)
- **Direct Checkout:** Direct checkout enabled with live pricing, strikethrough comparison where verified, and Add to Bag.

### 2.4 Occasions Destination (`/occasions`, `/occasions/:occasion`, `/shop?occasion=...`, `/shop?filter=occasions`)
- **Occasion Switcher Tabs:**
  - All Occasions
  - Nikkah & Wedding (`wedding`)
  - Umrah & Hajj Tabarruk (`umrah`)
  - Ramadan & Eid (`ramadan`)
  - Birth Announcement & Aqeeqah (`birth`)
  - Corporate & Executive (`corporate`)
- **Category Intersection & Accurate Counts:**
  - Evaluates intersection: `productMatchesOccasion(p, occasion) && productMatchesCategory(p, category)`.
  - Displays live accurate count (`{count} products found`).
  - **Honest Empty State:** When a combination yields 0 results (e.g. Birth + Oils), displays honest empty state with "Reset Occasion Filter" button.
- **URL Synchronization:** Synchronizes pathname (`/occasions/:occasion`) and search parameters, supporting browser back/forward history.

### 2.5 Corporate & Bulk Wholesale (`/wholesale`)
- **Transparent Wholesale Policy Cards:**
  1. *Food Exemption (MOQ = 1):* All food products (dry fruits, nuts, dates, cold-pressed oils) carry an MOQ of 1 pack; volume weights available on request.
  2. *Packaging Volume Tiers:* Event packaging and empty favor boxes feature automated volume tiers at 25, 50, and 100+ pieces with up to 25% factory discount.
  3. *10-Day Preparation Lead Time:* Custom printed logo tags, foil monograms, and assembled packaging require a minimum of 10 calendar days lead time before courier dispatch.
- **Concierge Actions:**
  - "Request Corporate Quote" CTA -> `openCustomQuoteModal`.
  - "Chat with Corporate Concierge" -> WhatsApp direct link.
  - Concierge response guarantee: replies within 2 business hours with digital mockups and tiered quote sheets.
- **Catalog Products:** Displays wholesale-eligible products with MOQ and volume tier badges.

---

## 3. Removal of Competing Duplicate Grids

- In `src/components/CategoryPLP.tsx`: Removed lines 171-176 that stacked `BidBoxesSection` and `DealsPackagesSection` inside the PLP whenever category was `gift-boxes` or `bundles`.
- Dedicated destinations now render as clean, distinct views routed through `ShopPage.tsx`.
- Standard food categories (`dry-fruits`, `dates`, `seeds-snacks`, `oils`, `essentials`) and search queries continue to use `CategoryPLP`.

---

## 4. Test Execution & Verification Evidence

All automated suites, controlled-clock tests, integration tests, TypeScript compilation, React hook linter, production build, and real browser CDP interaction tests passed with zero errors:

| Suite / Check | Command | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Stage 5B Dedicated Destinations** | `node --import tsx --test --test-isolation=none tests/stage5b-destinations.test.tsx` | **9 passed, 0 failed** (56.2s) | `0` | **VERIFIED:** (1) Celebration boxes 5 approved subcategories and exact 8 verified products; (2) 10-day preparation notice and empty Tabarruk bottle advisory; (3) Legacy `/shop/bid-boxes` alias resolution; (4) Gifts & Hampers builder entry, corporate CTA, and legacy aliases; (5) Deals verified savings notice and filter chips; (6) Occasions switcher tabs, category intersection, and honest empty state; (7) Corporate & Wholesale policies, food exemption, and lead time; (8) Trilingual & RTL support across Urdu and Arabic; (9) Duplicate homepage grids absent from PLP. |
| **Controlled-Clock Lifecycle Suite** | `node --test tests/stage5a-controlled-clock.test.mjs` | **11 passed, 0 failed** (36.5s) | `0` | **VERIFIED:** All 11 virtual clock rotation and pause scenarios intact: initial advance, sustained hover, 3000ms resume delay, repeated hover reset, manual pause until Play, Play while hovered, document visibility lifecycle, reduced motion, disabled autoplay setting, empty tabs, and unmount cleanup. |
| **Admin Merchandising Integration** | `node --import tsx --test --test-isolation=none tests/stage5a-admin-integration.test.tsx` | **8 passed, 0 failed** (58.2s) | `0` | **VERIFIED:** Admin lifecycle, published collection title/image/destination, alias normalization, product tab limit, hidden occasions, custom occasion title, SSR flow, and real browser client-mounted provider HTTP fetch. |
| **Stage 5A Homepage Unit Tests** | `node --import tsx --test --test-isolation=none tests/stage5a-homepage.test.tsx` | **6 passed, 0 failed** (52.8s) | `0` | **VERIFIED:** 6-part homepage structure, old grid removal, Boutique Selections 5 tabs, live price reading, occasion routes, and trilingual translations. |
| **Stage 4 Navigation Regressions** | `node --import tsx --test --test-isolation=none tests/stage4-navigation.test.tsx` | **12 passed, 0 failed** (51.6s) | `0` | **VERIFIED:** Two-level header taxonomy, disclosure triggers, mobile accordion, RTL/Dark mode, route resolution, occasion matching, and single active indicator. |
| **Stage 3 Pricing & MOQ Regressions** | `node --import tsx --test --test-isolation=none tests/stage3-pricing-moq.test.ts` | **19 passed, 0 failed** (53.2s) | `0` | **VERIFIED:** Rules D1 & D2, food exemption (MOQ = 1), packaging MOQ, reference markup idempotency, and bid box pricing integrity. |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** 100% type safety across the entire repository. |
| **React Hook Linter** | `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All hook dependency arrays and rules satisfied. |
| **Production Build Pipeline** | `npm run build` | Full pipeline: Vite client bundle (12.13s) + esbuild server.cjs (870.1kb) + Release privacy audit (84 text artifacts clean). | `0` | **VERIFIED:** Production bundle built cleanly with zero private credential leaks. |
| **Real Browser Visual Verification** | `node scripts/test-stage5b-destinations.mjs` | **12 screenshots captured** (35.4s) | `0` | **VERIFIED:** Real headless Chrome CDP execution on fresh `dist` build across Desktop Light, Desktop Dark, Mobile, and Urdu RTL across all 5 destinations. |

---

## 5. Visual Artifacts Captured

All 12 visual artifacts have been captured and saved to `<appDataDir>\brain\f408ee7a-7513-4e1a-b8e1-251273bc99e6/` and committed to `docs/artifacts/`:

1. `stage5b_celebration_desktop_light.png` — Celebration Boxes desktop light view with 10-day notice, Tabarruk bottle advisory, 5 subcategory pills, mode switcher, and product grid.
2. `stage5b_celebration_desktop_dark.png` — Celebration Boxes desktop dark theme.
3. `stage5b_celebration_urdu_rtl.png` — Celebration Boxes Urdu translation with RTL layout.
4. `stage5b_celebration_mobile.png` — Celebration Boxes mobile responsive view (390×844).
5. `stage5b_gifting_desktop_light.png` — Gifts & Hampers desktop light view with Hamper Builder card, Corporate CTA, and gift sets.
6. `stage5b_gifting_mobile.png` — Gifts & Hampers mobile responsive view.
7. `stage5b_deals_desktop_light.png` — Deals & Value Packages desktop light view with Verified Pricing Integrity banner and filter chips.
8. `stage5b_deals_mobile.png` — Deals & Value Packages mobile responsive view.
9. `stage5b_occasions_desktop_light.png` — Occasions desktop light view with occasion switcher tabs and category intersection.
10. `stage5b_occasions_mobile.png` — Occasions mobile responsive view.
11. `stage5b_wholesale_desktop_light.png` — Corporate & Bulk Wholesale desktop light view with transparent policy cards (Food Exemption MOQ=1, Packaging Tiers, 10-Day Lead Time) and concierge CTAs.
12. `stage5b_wholesale_mobile.png` — Corporate & Bulk Wholesale mobile responsive view.

---

## 6. Files Created and Modified

### Created Files:
- `src/contexts/destinationTranslations.ts`: Trilingual (EN, UR, AR) dictionary for all 5 destinations, 10-day lead time notice, Tabarruk bottle notice, subcategories, modes, builder CTAs, wholesale policies, and empty states.
- `src/components/DestinationHeader.tsx`: Reusable luxury emerald/gold header with eyebrow, title, description, and advisory alert banners.
- `src/components/CelebrationBoxesDestination.tsx`: Celebration Boxes destination with 5 approved subcategories, 8 verified products, 10-day preparation notice, Tabarruk bottle notice, empty wholesale tiers & filled options, and custom quote CTA.
- `src/components/GiftsHampersDestination.tsx`: Gifts & Hampers destination with Bespoke Hamper Builder card, Corporate Gifting CTA, occasion filters, and direct checkout.
- `src/components/DealsDestination.tsx`: Deals destination with Verified Pricing Integrity notice, bundle category filters, and live checkout.
- `src/components/OccasionsDestination.tsx`: Occasions destination with occasion switcher tabs, category intersection, honest empty state with reset, and URL synchronization.
- `src/components/WholesaleDestination.tsx`: Wholesale destination with Food Exemption (MOQ = 1), Packaging Volume Tiers (25, 50, 100+ pcs), 10-Day Preparation notice, and concierge quote CTAs.
- `tests/stage5b-destinations.test.tsx`: 9 automated tests covering routes, subcategories, product counts, notices, legacy aliases, filter intersection, trilingual support, and grid deduplication.
- `scripts/test-stage5b-destinations.mjs`: Real browser CDP screenshot capture script.

### Modified Files:
- `src/contexts/LanguageContext.tsx`: Imported and registered `destinationTranslations` in the fallback translation chain.
- `src/components/SEO.tsx`: Guarded `window.location?.origin` safely for SSR/test environments.
- `src/components/CategoryPLP.tsx`: Removed duplicate stacked sections (`BidBoxesSection` and `DealsPackagesSection`).
- `src/pages/ShopPage.tsx`: Routed dedicated destinations cleanly based on pathname and parameters while serving `CategoryPLP` for standard food categories and search queries.
- `src/App.tsx`: Registered `/occasions` and `/occasions/:occasion` routes.

---

## 7. Outstanding Tasks & Next Stage

- **Stage 5C (Next):** Verified packaging catalog expansion (minimum 6 distinct products per subcategory), comprehensive specifications, and original studio photography assets.
- **Stage 6 & AI Integration:** Outstanding Firestore emulator release gate, live deployment, production release checks.

> [!NOTE]
> All work for Stage 5B is completed, verified with passing automated test suites, clean typecheck, clean lint, successful production build, and committed visual artifacts. Awaiting user instruction before proceeding to Stage 5C.
