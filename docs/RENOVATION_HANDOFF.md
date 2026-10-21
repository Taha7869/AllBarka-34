# AllBarka Renovation — Stage 5B Completion & Handoff v5.7

**Document Version:** 5.7.0  
**Date:** October 18, 2026  
**Baseline Git Commit:** `64484c7` -> `feat/renovation-v2`  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 5B DEDICATED DESTINATIONS REPAIRED & FULLY VERIFIED — HALTED AT STAGE 5B COMPLETION GATE**

---

## 1. Roadmap & Stage Scope Boundaries

The renovation roadmap strictly follows this sequence:
- **Stage 5A (Completed & Verified):** Homepage, Boutique Selections showcase, autoplay lifecycle, collection alias normalization & visibility conflict resolution, merchant occasion titles, and real browser provider-fetch integration.
- **Stage 5B (Repaired & Fully Verified Here):** Dedicated collection & occasion destinations (`/shop/celebration-boxes`, `/gifting`, `/shop/deals`, `/occasions`, `/wholesale`) with working legacy aliases, transparent wholesale policies, honest empty states, unified variant resolution, and direct checkout / inquiry flows.
- **Stage 5C (Explicitly Pending):** Verified packaging catalog expansion (minimum 6 distinct products per subcategory), comprehensive specifications, and original studio photography assets.
- **Stage 6 (Explicitly Pending):** Customization inquiries, bespoke quoting engine, and WhatsApp commerce integration.
- **Stage 7 (Explicitly Pending):** AI Buddy concierge integration and domain-specific assistance.
- **Stage 8 (Explicitly Pending):** Release QA, Firestore emulator release gate, production deployment.

> [!IMPORTANT]
> **Strict Halt Gate:** Stage 5B repair is fully implemented, verified, and complete. Stage 5C through Stage 8 remain explicitly pending. Zero live production database writes, zero merges to `launch`/`main`, and zero production deployments have occurred. Firestore Emulator remains an outstanding release gate.

---

## 2. Dedicated Destinations Implemented & Repaired in Stage 5B

### 2.1 Celebration Boxes (`/shop/celebration-boxes`, aliases: `/shop/bid-boxes`, `/category/celebration-boxes`)
- **Approved Subcategories Filter:**
  1. *Signature Tin Boxes* (`bid-box-luxury-tin`) — 1 product
  2. *Hajj & Umrah Tabarruk Sets* (`bid-box-umrah-tabarruk`) — 1 product
  3. *Wedding Favor Boxes & Pouches* (`bid-box-card-nikkah`, `bid-box-pyramid-favor`, `bid-box-jute-pouch`, `bid-box-sweet-nikkah`) — 4 products
  4. *Baby Announcement Boxes* (`bid-box-birth-announcement`) — 1 product
  5. *Personalized Acrylic Boxes* (`bid-box-acrylic-royal`) — 1 product
  *Total:* Exactly 8 verified products in catalog (no invented items or inflated counts; expanded catalog remains Stage 5C).
- **Mandatory Advisories:**
  - *10 Calendar-Day Preparation Notice:* Artisanal custom printing/assembly requires a minimum of 10 calendar days lead time following final design approval and any required deposit before courier dispatch; courier transit applies separately upon completion (no guaranteed Day-10 delivery).
  - *Tabarruk Bottles Empty Notice:* Zamzam bottles and Tabarruk vials in all sets are supplied empty unless sacred Zamzam or specific fillings are explicitly listed in package inclusions.
- **Packaging vs. Filled Options & Single Selected-Variant Resolver:**
  - Mode switch: "All Options", "Empty Packaging Only", "Freshly Filled with Dry Fruits".
  - Unified resolver `resolveCelebrationCardVariant(product, preferredMode, requestedTierIndex)` guarantees card highlighted tier = displayed unit/pack price = `addToCart` payload = cart quantity.
  - Recognizes saved available 1-piece empty box variants (e.g. standard Rs. 1000 single box) with authoritative MOQ (5 units) and direct checkout eligibility.
  - Prevents silent mode substitution: explicitly requesting an unavailable filled mode returns `activeMode: 'filled'`, `isDirectCheckoutEligible: false`, `isQuoteOnly: true`, `variantKey: null`.
  - Preserves actual pack capacity for filled pack variants (e.g. 10-pc filled pack calculates unit price Rs. 350, pack price Rs. 3500, `piecesPerPack: 10`).
- **Customer Flow & Actions:**
  - Direct checkout enabled via "Add to Bag" only for standard eligible priced tiers.
  - Unpriced / quote-only products display "Quote on Request" and "Request Quote" buttons which trigger `openCustomQuoteModal`.
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
- **URL-Driven Occasion Filtering:**
  - Directly derived from `useSearchParams().get('occasion')` with history push and back/forward navigation.
  - Preserves unrelated URL search parameters (e.g., `ref`, `utm_source`).
  - Displays honest empty state with "Reset Filter" button when an occasion has zero associated hampers.
- **Product Cards:** Live catalog prices, pack variant selectors, and direct checkout via "Add to Bag". Unpriced or custom products route to Request Quote.

### 2.3 Deals & Value Packages (`/shop/deals`, alias: `/shop/bundles`)
- **Roastery Curated Header:** Eyebrow "Farm-Direct Savings", title "Value Packages & Curated Deals".
- **Curated Value Packages Notice:** Replaced blanket "verified savings" and "save up to" claims with honest copy: *"Roastery Curated Assortments: Thoughtfully paired bundles and festive sets curated by our Lahore roastery. Direct pricing reflects packaged assortment value."*
- **Omission of Unsupported Comparisons:** Zero `comparePrice > price` strikethroughs or blanket discount badges.
- **URL-Driven Sub-Filter Chips:**
  - *All Deals & Packages* (`filter=all` or default)
  - *Tasting Duos & Pairs* (`filter=duos`: `deal-1`, `deal-2`, `bundle-daily-grind`, `bundle-tasting-flight`)
  - *Festive Family Hampers* (`filter=hampers`: `bundle-silver-hamper`, `bundle-gold-hamper`, `bundle-platinum-hamper`, `bundle-royal-feast`)
  - *Wellness & Pantry Reserves* (`filter=wellness`: `bundle-brain-fuel`, `bundle-winter-warrior`, `bundle-immunity-shield`, `bundle-sunrise-seeds`, `bundle-mystery-box`)
  - Directly derived from URL with history push, back/forward restoration, and parameter preservation.

### 2.4 Occasions Destination (`/occasions`, `/occasions/:occasion`, `/shop?occasion=...`, `/shop?filter=occasions`)
- **Occasion Switcher Tabs:** All Occasions, Nikkah & Wedding (`wedding`), Umrah & Hajj Tabarruk (`umrah`), Ramadan & Eid (`ramadan`), Birth Announcement & Aqeeqah (`birth`), Corporate & Executive (`corporate`).
- **Category Intersection & Accurate Counts:**
  - Evaluates intersection: `productMatchesOccasion(p, occasion) && productMatchesCategory(p, category)`.
  - Displays live accurate count (`{count} products found`).
  - **Honest Empty State:** When a combination yields 0 results (e.g. Birth + Oils), displays honest empty state with "Reset Occasion Filter" button.
- **URL Synchronization & History Navigation:**
  - Synchronizes pathname (`/occasions/:occasion`) and search parameters via history push.
  - Preserves selected `category` query parameter when switching occasions.
  - Fully supports browser back/forward buttons, restoring previous route and filters.

### 2.5 Corporate & Bulk Wholesale (`/wholesale`)
- **Transparent Wholesale Policy Cards:**
  1. *Food Exemption (MOQ = 1):* All food products (dry fruits, nuts, dates, cold-pressed oils) carry an MOQ of 1 pack; volume bulk weights available on request.
  2. *Packaging Volume Tiers:* Event packaging and empty favor boxes feature automated volume tiers at 25, 50, and 100+ pieces with verified tiered unit pricing.
  3. *10-Day Preparation Lead Time:* Custom printed logo tags, foil monograms, and assembled packaging require a minimum of 10 calendar days lead time following final design approval and advance deposit before courier dispatch.
- **Concierge Actions:**
  - "Request Corporate Quote" CTA -> `openCustomQuoteModal`.
  - "Chat with Corporate Concierge" -> WhatsApp direct link.
  - Dedicated concierge handles custom brand printing, digital mockups, and tiered quotes.
- **Catalog Products:** Displays wholesale-eligible products with MOQ and volume tier badges.

---

## 3. Resolution Evidence for Stage 5B Findings

| Finding | Description | Resolution & Evidence |
| :--- | :--- | :--- |
| **Finding 1** | Repair `resolveCelebrationCardVariant` | Recognizes saved available 1-piece empty box variants (e.g. Rs. 1000 single box with MOQ 5) even when `resolveBidBoxConfig.emptyTiers` excludes single-piece entries. Prevents silent mode substitution (explicitly requesting unavailable filled mode stays `activeMode: 'filled'` and routes to inquiry without substituting empty). Preserves actual pack capacity for filled pack variants (10-pc filled pack unit price Rs. 350, pack price Rs. 3500, `piecesPerPack: 10`). Verified in unit regression tests 1, 7 and browser test 1, 2, 7. |
| **Finding 2** | `packagingSubcategory` validation & persistence | Added `packagingSubcategory` to `PUBLIC_PRODUCT_FIELDS` in `catalogSchema.ts` and allowed in `validateDynamicProduct`. Enforces supported enum values (`tin`, `tabarruk`, `wedding`, `baby`, `acrylic`) and deliberate clear behavior (`null`, `""`). Supported in admin create/edit modals with dedicated dropdown and clear button. Verified in regression test 8: create tin &rarr; reload authoritative catalog &rarr; match tin filter &rarr; deliberate clear &rarr; unclassified. |
| **Finding 3** | URL-driven filtering across ALL destinations | Removed local `useState` synchronization lag from `GiftsHampersDestination` and `DealsDestination`. Filters derive synchronously from `useSearchParams()`, updating via `setSearchParams` history push. Reused canonical `productMatchesOccasion` across Celebration, Occasions, and Gifting. Browser CDP tests 3, 5, 6 verify occasion switching, parameter preservation (`ref`, `utm_campaign`), and browser back/forward navigation. |
| **Finding 4** | Omission of unsupported savings comparisons | Removed `comparePrice > price` strikethroughs and blanket "verified savings" copy from `DealsDestination`. Replaced with honest "Roastery Curated Assortments" notice and "Curated Value Packages" badge. In-browser CDP test 6 confirmed exactly 0 `.line-through` compare-price elements on `/shop/deals`. |

---

## 4. Full Offline Test Suite Results

The complete offline suite ran cleanly with zero failures across all 56 test files, backend suites, asset verifications, and production security checks:

```
ℹ tests 603
ℹ suites 1
ℹ pass 603
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 90814.2716

🧪 Running AllBarka Production Backend Test Suite...
========================================
RESULTS: 21 PASSED, 0 FAILED.
========================================

97 products, 115 image references (111 unique files); 57 single-image WebP selections; 0 missing files, 0 retired views.

Production checks: 36 passed.
Full offline suite passed (56 test files plus backend, assets and production checks).
```

### Key Verification Gate Summary:
- **TypeScript Typecheck (`npm run typecheck`):** Exit code 0 (zero errors).
- **React Hook Linter (`npm run lint:hooks`):** Exit code 0 (zero warnings, zero errors).
- **Production Build (`npm run build`):** Exit code 0 (Vite client bundle 9.83s + esbuild server.cjs 872.1kb + Release privacy audit passed across 84 text artifacts).
- **Real Browser CDP Test (`node scripts/test-stage5b-destinations.mjs`):** Exit code 0 (Tests 1–7 passed, 12 screenshots refreshed).
- **Full Offline Suite (`node scripts/run-all-tests.mjs`):** Exit code 0 (603/603 tests passed, 21 backend tests passed, 36 production checks passed).

---

## 5. Visual Artifacts Captured

All 12 visual artifacts have been captured and saved to `<appDataDir>\brain\f408ee7a-7513-4e1a-b8e1-251273bc99e6/` and committed to `docs/artifacts/`:

1. `stage5b_celebration_desktop_light.png` — Celebration Boxes desktop light view with 10-day notice, Tabarruk bottle advisory, 5 subcategory pills, mode switcher, unified variant resolution, and product grid.
2. `stage5b_celebration_desktop_dark.png` — Celebration Boxes desktop dark theme.
3. `stage5b_celebration_urdu_rtl.png` — Celebration Boxes Urdu translation with RTL layout.
4. `stage5b_celebration_mobile.png` — Celebration Boxes mobile responsive view (390×844).
5. `stage5b_gifting_desktop_light.png` — Gifts & Hampers desktop light view with Hamper Builder card, Corporate CTA, and gift sets.
6. `stage5b_gifting_mobile.png` — Gifts & Hampers mobile responsive view.
7. `stage5b_deals_desktop_light.png` — Deals & Value Packages desktop light view with Curated Value Packages banner and filter chips.
8. `stage5b_deals_mobile.png` — Deals & Value Packages mobile responsive view.
9. `stage5b_occasions_desktop_light.png` — Occasions desktop light view with occasion switcher tabs, category intersection, and honest empty states.
10. `stage5b_occasions_mobile.png` — Occasions mobile responsive view.
11. `stage5b_wholesale_desktop_light.png` — Corporate & Bulk Wholesale desktop light view with transparent policy cards (Food Exemption MOQ=1, Packaging Tiers, 10-Day Lead Time) and concierge CTAs.
12. `stage5b_wholesale_mobile.png` — Corporate & Bulk Wholesale mobile responsive view.

---

## 6. Outstanding Tasks & Next Stage

- **Stage 5C (Next):** Verified packaging catalog expansion (minimum 6 distinct products per subcategory), comprehensive specifications, and original studio photography assets.
- **Stage 6:** Customization inquiries & WhatsApp integration.
- **Stage 7:** AI Buddy concierge integration.
- **Stage 8:** Release QA, Firestore emulator release gate, live production deployment.

> [!NOTE]
> All work for the Stage 5B repair run is completed, verified with passing automated test suites, clean typecheck, clean lint, successful production build, and refreshed visual artifacts. Awaiting user review before proceeding to Stage 5C.
