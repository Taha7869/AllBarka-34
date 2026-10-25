---
name: allbarka-catalog-pricing-moq
description: >-
  Enforces AllBarka's authoritative catalog resolution, category taxonomy,
  packaging MOQ calculation (Rule D1), draft import markup (Rule D2), and
  server-side shipping and coupon rules. Use this skill whenever working on
  product catalog loading, packaging variants, MOQ logic, draft ingestion,
  checkout pricing, coupons, or shipping calculations.
---

# AllBarka Catalog, Pricing & MOQ Rules

## 1. Authoritative Catalog Resolution
- **Runtime Source of Truth**: Production endpoints (`/api/products`, `/api/quotes`, `/api/inquiries`, `/api/chat`, `/api/concierge/chat`, `/api/orders`) must resolve products through `loadAuthoritativeCatalog(db)` / `mergeAuthoritativeCatalog` in [`src/lib/catalogStore.ts`](../../src/lib/catalogStore.ts).
- **No Silent Compiled Fallback for Commercial Quotes**: When Firestore is unavailable or throws during authoritative catalog resolution, never label compiled static prices as authoritative. Return an honest retryable error (`503`) or mark inquiries as unpriced (`requiresTeamQuote: true`).
- **Public Visibility**: Customer-facing surfaces and AI recommendations must filter products via `isProductPubliclyVisible(product)` and strip internal fields via `stripPrivateProductFields(product)` (`active !== false`, `isDraft !== true`, `publicationStatus !== 'draft'`).

## 2. Category Taxonomy
- **6 Canonical Food Categories**:
  1. `nuts` (Almonds, Cashews, Pistachios, Walnuts, Pine Nuts, Mixed Nuts)
  2. `dates` (Ajwa, Medjool, Mabroom, Safawi, Sugai, Stuffed Dates)
  3. `dried-fruits` (Apricots, Figs, Raisins, Prunes, Berries)
  4. `honey-oils` (Sidr Honey, Wildflower Honey, Pure Oils; 1ml = 1g tariff convention)
  5. `saffron-spices` (Saffron, Cardamom, Whole & Ground Spices, Seeds)
  6. `gifting` (Luxury Hampers, Celebration Platters, Combos)
- **5 Celebration Box Packaging Subcategories** (`packagingSubcategory`):
  1. `tin` (Tin Boxes)
  2. `tabarruk` (Tabarruk Sets — empty bottle default unless explicitly requested otherwise)
  3. `sweet-savory` (Sweet / Savory / Baby Announcement Boxes)
  4. `wedding-card` (Wedding Card Boxes)
  5. `acrylic` (Acrylic Boxes)

## 3. Packaging MOQ Engine (Rule D1)
- **Authoritative Engine**: Always use `calculatePackagingMoq`, `calculateMinOrderQuantityUnits`, and `getPackagingMoqDisplay` from [`src/lib/packagingMoq.ts`](../../src/lib/packagingMoq.ts). Never duplicate the MOQ formula inline.
- **Formula**:
  - Ordinary food items are exempt (`MOQ = 1`).
  - For packaging items without an explicit admin override:
    $$\text{MOQ}_{\text{pieces}} = \min\left(25, \max\left(1, \left\lceil \frac{5000}{\text{perPiecePrice}} \right\rceil\right)\right)$$
  - For multi-piece pack variants (`piecesPerPack > 1`), minimum purchasable units in packs is:
    $$\text{minUnits} = \max\left(1, \left\lceil \frac{\text{MOQ}_{\text{pieces}}}{\text{piecesPerPack}} \right\rceil\right)$$
  - When displaying pack MOQ, always express both minimum packs and minimum purchasable pieces (`minUnits * piecesPerPack`) alongside the piece threshold when they differ (e.g., `3 packs (30 pcs; 25-pc threshold)` for a 10-pc pack with a 25-pc threshold).
- **Do Not Freeze Computed MOQ**: Never write derived/calculated MOQ values into `product.moqOverride`, `product.minOrderQuantity`, or `variant.moqOverride` during catalog import or adaptation. Persist overrides only when explicitly supplied as an approved merchant override.

## 4. Draft Catalog Import & Markup (Rule D2)
- **Initial Import Markup**: Apply `+5%` rounded to the nearest `Rs. 5` (`Math.round((supplierPrice * 1.05) / 5) * 5`) only when converting supplier reference prices during initial draft preparation, unless an explicit `proposed_pkr` is already approved.
- **Strict Tier & Price-Basis Validation**:
  - Every variable tier must have a non-empty unique normalized label and a finite positive `proposed_pkr`.
  - Never invent `"Standard"` for empty tier labels or fall back to baseline price for missing tier prices.

## 5. Server-Side Shipping & Coupons (`server.ts`)
- **NEVER modify server-side pricing or shipping logic in `server.ts` without explicit owner instruction.**
- **Lahore Standard Shipping**: `Rs. 150`; **FREE** when discounted subtotal $\ge \text{Rs. } 3,000$.
- **Lahore Express Shipping**: `Rs. 350` (priority courier).
- **Nationwide (Outside Lahore)**: Actual canonical order weight $\times \text{Rs. } 250/\text{kg}$, minimum `Rs. 250` (do not round up to whole kg; e.g., `1.2kg = Rs. 300`). Order thresholds and loyalty rewards never waive nationwide delivery; only the owner-authorized `ZAFRANI` promo waives it.
- **Oil Billing Convention**: `1ml` counts as `1g` for delivery tariff calculation.
