# AllBarka Renovation — Stage 5B Repair & Handoff v5.6

**Document Version:** 5.6.0  
**Date:** October 18, 2026  
**Baseline Git Commit:** `c9646f3` -> `feat/renovation-v2`  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 5B DEDICATED DESTINATIONS REPAIR COMPLETE & FULLY VERIFIED — HALTED AT STAGE 5B COMPLETION GATE**

---

## 1. Stage 5 Scope Boundaries

Stage 5 is split into three discrete, reviewable milestones:
- **Stage 5A (Completed & Verified):** Homepage, Boutique Selections showcase, autoplay lifecycle, collection alias normalization & visibility conflict resolution, merchant occasion titles, and real browser provider-fetch integration.
- **Stage 5B (Repaired & Fully Verified Here):** Dedicated collection & occasion destinations (`/shop/celebration-boxes`, `/gifting`, `/shop/deals`, `/occasions`, `/wholesale`) with working legacy aliases, transparent wholesale policies, honest empty states, unified variant resolution, and direct checkout / inquiry flows.
- **Stage 5C (Explicitly Pending):** Verified packaging catalog expansion (minimum 6 distinct products per subcategory), comprehensive descriptions, and original studio photography assets.
- **Stage 6 & AI Architecture (Explicitly Pending):** Production release gates, emulator sign-off, live deployments.

> [!IMPORTANT]
> **Strict Halt Gate:** Stage 5B repair is fully implemented and verified. Stage 5C and Stage 6 remain explicitly pending. Zero live production database writes, zero merges to `launch`/`main`, and zero production deployments have occurred. Firestore Emulator remains an outstanding release gate.

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
  - Automatic packaging MOQ calculation via `calculatePackagingMoq` enforces minimum unit thresholds (e.g., 25 units min adds quantity 3 packs for 10-pc tier).
  - Explicit user tier selection updates card highlight and cart payload synchronously without falling back or substituting another mode/variant.
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
- **Occasion Filter Pills:** Filter gift sets across All Gifts, Wedding (`wedding`), Umrah (`umrah`), Ramadan/Eid (`ramadan`), and Corporate (`corporate`).
- **Product Cards:** Live catalog prices, pack variant selectors, and direct checkout via "Add to Bag". Unpriced or custom products route to Request Quote.

### 2.3 Deals & Value Packages (`/shop/deals`, alias: `/shop/bundles`)
- **Farm-Direct Savings Header:** Eyebrow "Farm-Direct Savings", title "Value Packages & Curated Deals".
- **Verified Pricing Integrity Notice:** Prominently highlights that all bundle savings badges and discount calculations are derived directly from individual variant component rates with zero artificial markups or unverified strikethroughs.
- **Sub-Filter Chips:**
  - *All Deals & Packages*
  - *Tasting Duos & Pairs* (`deal-1`, `deal-2`, `bundle-daily-grind`, `bundle-tasting-flight`)
  - *Festive Family Hampers* (`bundle-silver-hamper`, `bundle-gold-hamper`, `bundle-platinum-hamper`, `bundle-royal-feast`)
  - *Wellness & Pantry Reserves* (`bundle-brain-fuel`, `bundle-winter-warrior`, `bundle-immunity-shield`, `bundle-sunrise-seeds`, `bundle-mystery-box`)
- **Direct Checkout & Honest Pricing:** Direct checkout enabled with live pricing; strikethrough badges display strictly when `comparePrice > price`.

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
- **URL Synchronization & History Navigation:**
  - Synchronizes pathname (`/occasions/:occasion`) and search parameters via history push (not replace).
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

## 3. Explanation of Changes to `categories.ts` and `CategoryCarousel.tsx`

### 3.1 `src/config/categories.ts`:
- **Problem:** An earlier commit linked `bundles: 'combos'` and `combos: 'bundles'` inside `COLLECTION_ALIASES` and `COLLECTION_EQUIVALENCE_GROUPS`.
- **Why Changed:** "Bundles" is a distinct commercial collection (`/shop/bundles` -> Value Packages & Curated Deals, mapped to `deals`), whereas "combos" is luxury curated hampers (`/shop/combos` -> `/gifting`). Linking them caused `/shop/bundles` to redirect to `/gifting`, violating the requirement to preserve distinct commercial collections.
- **Resolution:** Removed `bundles` from the `combos` equivalence group. Legitimate alias groups (`dry-fruits` <-> `nuts`, `seeds-snacks` <-> `snacks-seeds`, `gifts` <-> `gift-boxes`) are strictly preserved.

### 3.2 `src/components/CategoryCarousel.tsx`:
- **Problem:** In Stage 5A, CategoryCarousel was refactored to consume dynamic merchandising settings. When tests or callers render CategoryCarousel without custom settings, it previously needed a fallback, but falling back blindly could overwrite merchant configuration or break Stage 5A alias deduplication.
- **Why Changed:** When merchandising settings are unconfigured or equal to default (`!hasCustomSettings`), the carousel safely renders `PANTRY_CATEGORIES`. When custom published merchandising settings are present, it honors the validated configuration: alias normalization (hidden aliases like `nuts` cannot resurrect `dry-fruits`), deterministic conflict handling, merchant overrides (custom title, custom image, destination link, badge), category order and visibility, and canonical destinations.
- **Resolution:** Both the safe legacy default when unconfigured AND the Stage 5A published admin integration / provider fetch are fully preserved without regressing alias handling.

---

## 4. Resolution Evidence for Stage 5B Findings

| Finding | Description | Resolution & Evidence |
| :--- | :--- | :--- |
| **Finding 1** | Single selected-variant resolver | Implemented `src/lib/packagingClassification.ts` exporting `resolveCelebrationCardVariant`. Card highlighted tier, displayed unit/pack price, MOQ enforcement, and `addToCart` payload are derived from the single source of truth. Verified in CDP browser test: untouched default selection adds tier index 0 (`Empty Pack (10 pcs)` at Rs. 200/pc, qty 3 packs enforcing 25-pc MOQ); clicking tier 1 updates both card highlight and cart payload synchronously. |
| **Finding 2** | Purged fabricated prices & stale fallbacks | Eliminated all hardcoded fake prices (Rs. 180, Rs. 850) and stale filling descriptions across all destinations. Unpriced or quote-only products display "Quote on Request" with "Request Quote" button opening `openCustomQuoteModal`. Strikethrough badges in Deals appear only when `comparePrice > price`. |
| **Finding 3** | URL-driven filtering & back/forward navigation | Synchronized `CelebrationBoxesDestination` and `OccasionsDestination` with URL search parameters (`subcat`, `mode`, `occasion`, `category`). Switched navigation from `{ replace: true }` to history push. In `ShopPage.tsx`, added route precedence guards so `/occasions/wedding?category=celebration-boxes` is not hijacked by category match. CDP browser test confirmed switching occasion preserves `?category=celebration-boxes`, and `window.history.back()` accurately restores the previous URL and filter state. |
| **Finding 4** | Authoritative admin packaging subcategory metadata | Added `packagingSubcategory` to `types.ts` (`Product` and `BidBoxConfig`) and populated all 8 bid box products in `src/data/products.ts`. `getPackagingSubcategory` prioritizes explicit admin metadata, followed by `product.bidBoxConfig.packagingSubcategory`, then legacy map. Unknown products return `null` (unclassified) and NEVER default to `wedding`. |
| **Finding 5** | Purged unapproved commercial claims | In `src/contexts/destinationTranslations.ts`, removed blanket factory discount ("up to 25% factory discount"), response-time guarantees ("within 2 business hours"), engraving promises ("custom brand engraving" -> "custom brand printing"), and free sample claims in Arabic. Standardized lead time notice to minimum 10 calendar days following final design approval and required deposit. |
| **Finding 6** | Real in-browser CDP test against fresh production build | Ran `node scripts/test-stage5b-destinations.mjs` against `npm run build` production distribution. Verified: default tier selection and cart payload; explicit tier change and cart update; occasion switching with category preservation; browser back/forward restoration; keyboard accessibility; and refreshed all 12 visual screenshot artifacts. |

---

## 5. Full Offline Test Suite Results

The complete offline suite ran cleanly with zero failures across all 56 test files, backend suites, asset verifications, and production security checks:

```
ℹ tests 599
ℹ suites 1
ℹ pass 599
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 122363.3283

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
- **Production Build (`npm run build`):** Exit code 0 (Vite client bundle 13.54s + esbuild server.cjs 870.8kb + Release privacy audit passed across 84 text artifacts).
- **Real Browser CDP Test (`node scripts/test-stage5b-destinations.mjs`):** Exit code 0 (All functional assertions passed, 12 screenshots refreshed).
- **Full Offline Suite (`node scripts/run-all-tests.mjs`):** Exit code 0 (599/599 tests passed, 21 backend tests passed, 36 production checks passed).

---

## 6. Visual Artifacts Captured

All 12 visual artifacts have been captured and saved to `<appDataDir>\brain\f408ee7a-7513-4e1a-b8e1-251273bc99e6/` and committed to `docs/artifacts/`:

1. `stage5b_celebration_desktop_light.png` — Celebration Boxes desktop light view with 10-day notice, Tabarruk bottle advisory, 5 subcategory pills, mode switcher, unified variant resolution, and product grid.
2. `stage5b_celebration_desktop_dark.png` — Celebration Boxes desktop dark theme.
3. `stage5b_celebration_urdu_rtl.png` — Celebration Boxes Urdu translation with RTL layout.
4. `stage5b_celebration_mobile.png` — Celebration Boxes mobile responsive view (390×844).
5. `stage5b_gifting_desktop_light.png` — Gifts & Hampers desktop light view with Hamper Builder card, Corporate CTA, and gift sets.
6. `stage5b_gifting_mobile.png` — Gifts & Hampers mobile responsive view.
7. `stage5b_deals_desktop_light.png` — Deals & Value Packages desktop light view with Verified Pricing Integrity banner and filter chips.
8. `stage5b_deals_mobile.png` — Deals & Value Packages mobile responsive view.
9. `stage5b_occasions_desktop_light.png` — Occasions desktop light view with occasion switcher tabs, category intersection, and honest empty states.
10. `stage5b_occasions_mobile.png` — Occasions mobile responsive view.
11. `stage5b_wholesale_desktop_light.png` — Corporate & Bulk Wholesale desktop light view with transparent policy cards (Food Exemption MOQ=1, Packaging Tiers, 10-Day Lead Time) and concierge CTAs.
12. `stage5b_wholesale_mobile.png` — Corporate & Bulk Wholesale mobile responsive view.

---

## 7. Outstanding Tasks & Next Stage

- **Stage 5C (Next):** Verified packaging catalog expansion (minimum 6 distinct products per subcategory), comprehensive specifications, and original studio photography assets.
- **Stage 6 & AI Integration:** Outstanding Firestore emulator release gate, live deployment, production release checks.

> [!NOTE]
> All work for the Stage 5B repair run is completed, verified with passing automated test suites, clean typecheck, clean lint, successful production build, and refreshed visual artifacts. Awaiting user review before proceeding to Stage 5C.
