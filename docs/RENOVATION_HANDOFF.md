# AllBarka Renovation — Stage 3 Review Packet & Handoff v3.0

**Document Version:** 3.0.0  
**Date:** October 17, 2026  
**Baseline Git Commit:** `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 3 COMPLETED & VERIFIED — HALTED AT STAGE 4 ENTRY GATE**

---

## 1. Executive Summary & Stage 3 Deliverables

In accordance with the Stage 3 mandate (Canonical Pricing, Variants, MOQ & Order Compatibility) and agreed business rules, the following 5 areas have been fully implemented, integrated, and verified:

### 1. Rule D1 — Packaging Minimum Order Quantity (MOQ) Engine (`src/lib/packagingMoq.ts`)
- **Formula Implementation**:
  $$\text{MOQ} = \min(25, \max(1, \lceil 5000 / \text{publishedPerPiecePrice} \rceil))$$
- **Exact Test Vectors Verified**:
  - Rs. 100 $\rightarrow$ 25 pcs
  - Rs. 200 $\rightarrow$ 25 pcs
  - Rs. 300 $\rightarrow$ 17 pcs
  - Rs. 500 $\rightarrow$ 10 pcs
  - Rs. 1000 $\rightarrow$ 5 pcs
  - Rs. 2000 $\rightarrow$ 3 pcs
  - Rs. 6000 $\rightarrow$ 1 pc
- **Admin Overrides**: Supported at both product level (`product.moqOverride`) and variant level (`variant.moqOverride`). Variant override takes precedence over product override; invalid overrides fallback safely to the formula.
- **Strict Food Exemption**: All food categories (`dry-fruits`, `dates`, `seeds-snacks`, `oils`, `essentials`, `herbs-spices`, `nuts`, `snacks-seeds`, `combos`, `bundles`, `gift-boxes`) are strictly exempt ($\text{MOQ} = 1$).
- **Pack vs. Piece Variant Calculations**:
  - `parsePiecesPerPack`: Extracts pack capacity (e.g. `"Empty Pack (25 pcs)"` $\rightarrow$ 25 pieces; `"Empty Box (1 pc)"` $\rightarrow$ 1 piece).
  - Pack quantity is never multiplied twice: 1 pack of 25 pcs is billed at the pack rate and satisfies 25 pieces towards MOQ.
- **No Cross-Design Pooling**: Quantities cannot be pooled across different packaging designs or variants to meet MOQ. Every design must independently satisfy its MOQ in cart, server-side quotes, and order placement.
- **Storefront & Checkout Integration**:
  - `ProductCard.tsx`: Displays MOQ badges (`MOQ: X pcs`), adds initial unit count at minimum required units, and replaces direct cart addition with "Request Quote" for quote-only items.
  - `ProductDetailPage.tsx`: Reactive quantity stepper bounded between calculated `minUnits` and `maxUnits`, displays clear piece MOQ and pack breakdown, and conditionally shows "Request Quote" modal trigger.
  - `CartContext.tsx` & `cartInput.ts`: Cart quantity adjustments clamped to `minUnits` for packaging products while retaining standard 1–50 units for food products.
  - `orderValidation.ts`: Rejects orders below MOQ with structured error `BELOW_MINIMUM_ORDER_QUANTITY`.

### 2. Rule D2 — One-Time Reference Import Markup (`src/lib/pricingImport.ts`)
- **Strict 5% Markup**:
  $$\text{sellingPrice} = \text{round}(\text{referencePrice} \times 1.05)$$
  with `half_up_whole_rupee` rounding.
- **Private Audit Fields**: Records `referencePrice`, `sourceUrl`, `importTimestamp`, `importBatch`, and `markupPercent: 0.05` as private audit data.
- **Idempotency on Re-Import**: Re-importing existing products preserves established merchant selling prices with zero compounding.
- **Admin Edit Protection**: Selling prices saved by merchants via admin CRUD (`createAdminProduct`, `updateAdminProduct`) are final selling prices and never receive automatic markup.

### 3. Dynamic Bid Box Pricing (`src/lib/bidBoxPricing.ts`)
- **Single Authoritative Price Source**: Derives `emptyUnitStarting`, `emptyBulk50Unit`, `emptyBulk100Unit`, `filledMin`, and `filledMax` dynamically from canonical `product.prices` / `product.variants`.
- **Elimination of Duplication**: Removes stale hardcoded pricing references from static `bidBoxConfig`, ensuring catalog price updates immediately reflect on detail pages, bulk pricing tiers, and quotes.

### 4. Rule D4 — Dual Order Modes & Quote Enforcement (`src/lib/orderValidation.ts`)
- **Direct Checkout Rejection**: Products configured with `quoteOnly: true` or `orderMode: 'inquiry_quote'` reject direct checkout server-side with `QUOTE_REQUIRED`.
- **Pricing Integrity**: Products or variants with missing or zero prices reject checkout with `PRICING_UNAVAILABLE`.
- **Zero Fake Discounts**: No artificial automatic bulk percentage discounts are injected.

### 5. Order Compatibility
- Preserves full backwards-compatibility for existing food, hamper, bundle, wholesale, and custom-weight orders.
- Enforces disabled-variant rejection and server-authoritative totals across all checkout paths.

---

## 2. Test & Build Verification Evidence

All 9 test suites, TypeScript typechecking, React hook linter, and production build pipeline passed with zero errors:

| Command / Suite | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :---: | :--- |
| `npx tsx --test tests/stage3-pricing-moq.test.ts` | **13 passed, 0 failed** (duration 1.14s) | `0` | **VERIFIED:** Rule D1 formula & test vectors, admin overrides, food exemption, pack vs. piece variants, cross-design pooling prevention, bid box dynamic pricing, Rule D2 5% reference markup & idempotency, admin price preservation, quote-only order mode rejection, unpriced item rejection, and order compatibility end-to-end. |
| `npx tsx --test tests/stage2-catalog-crud.test.ts` | **25 passed, 0 failed** (duration 3.56s) | `0` | **VERIFIED:** All Stage 2 data model, admin CRUD, price editor journeys, canonical seed edits, merchandising concurrency, durable migration recovery, and read-before-write transaction ordering intact. |
| `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** Clean compilation across entire repository. |
| `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All React hook dependencies satisfied. |
| `npm run build` | Full pipeline: write-build-info, Vite v6.4.3 bundle, esbuild server.cjs (839.1kb), release privacy audit (83 artifacts checked). | `0` | **VERIFIED:** Production assets and server bundle build without errors. |
| `npm run test:backend` | **21 passed, 0 failed** | `0` | **VERIFIED:** Backend pricing, order validation, delivery slots, and n8n webhook safety intact. |
| `npm run test:shipping` | **19 passed, 0 failed** | `0` | **VERIFIED:** Shipping policy, portion billing weights, hampers, and destination tariffs intact. |
| `npm run test:integrations` | **58 passed, 0 failed** | `0` | **VERIFIED:** Sheets, WhatsApp commerce router, order outbox, and authentication intact. |
| `npm run test:admin` | **37 passed, 0 failed** | `0` | **VERIFIED:** Admin client, search, image audit, operations, and presentation intact. |
| `npm run test:experience` | **46 passed, 0 failed** | `0` | **VERIFIED:** Selection guide, product photo viewer, catalog filters, and auth modals intact. |
| `npm run test:refinements` | **52 passed, 0 failed** | `0` | **VERIFIED:** Visual refinements, circular carousel, media overrides, and store updates intact. |
| `npm run test:advanced` | **71 passed, 0 failed** | `0` | **VERIFIED:** Cart input, advanced tools, checkout reliability, and cart shipping intact. |
| **Total Automated Tests** | **342 passed, 0 failed** | `0` | **VERIFIED:** 100% test pass rate across all suites. |

---

## 3. Firestore Emulator Status

- **Status:** **BLOCKED (Emulator / firebase-tools not installed in local environment)**
- **Audit Findings:** Neither `firebase` CLI nor `firebase-tools` are installed in the local environment (`firebase: command not found`, `npx firebase` failed with exit 1).
- **Production Readiness Stance:** Production readiness is **NOT** claimed for live cloud Firestore mutations. Zero production writes have been performed, zero live database operations have been executed, and all pricing, catalog, and checkout guarantees are validated via comprehensive mock suites mirroring real Firestore transaction ordering and document behavior.

---

## 4. Files Created & Modified in Stage 3

### Created Files:
1. `src/lib/packagingMoq.ts`: Core Rule D1 MOQ calculator, pack parser, unit converter, and validator.
2. `src/lib/pricingImport.ts`: Core Rule D2 5% markup calculator, audit recorder, and idempotent import logic.
3. `src/lib/bidBoxPricing.ts`: Dynamic bid box pricing derivations from canonical product data.
4. `tests/stage3-pricing-moq.test.ts`: 13 comprehensive Stage 3 acceptance tests.

### Modified Files:
1. `src/lib/orderValidation.ts`: Integrated packaging MOQ validation, `moq`/`piecesPerPack`/`totalPieces` line item fields, and `QUOTE_REQUIRED` / `PRICING_UNAVAILABLE` enforcement.
2. `src/lib/cartInput.ts`: Updated `resolveCartQuantity` to clamp packaging items between `minUnits` and 10,000 units while keeping food items at 1–50 units.
3. `src/contexts/CartContext.tsx`: Enforces MOQ `minUnits` on cart item add and update operations.
4. `src/components/ProductCard.tsx`: Adds MOQ badge, sets initial quick-add units to MOQ, and conditionally shows "Request Quote" for quote-only items.
5. `src/pages/ProductDetailPage.tsx`: Integrates `resolveBidBoxConfig`, reactive MOQ stepper, and conditional quote modal handling.
6. `src/types.ts`: Enriched `Product` and `variants` typing to support `available?`, `moqOverride?`, and `minOrderQuantity?`.
7. `src/lib/catalogStore.ts`: Synchronizes canonical variant prices when `body.prices` is passed to `updateAdminProduct`.
8. `docs/RENOVATION_REQUIREMENTS.md`: Updated RTM to v3.0.0 with Stage 3 marked VERIFIED.
9. `docs/RENOVATION_HANDOFF.md`: Updated handoff packet to v3.0.0.

---

## 5. Stage 4 Entry Criteria Checklist

| Check | Item | Status |
| :---: | :--- | :---: |
| 1 | Baseline commit confirmed on `main` and `launch` (`8cf4410`) | **PASS** |
| 2 | Working feature branch active (`feat/renovation-v2`) | **PASS** |
| 3 | Stage 3 Typecheck clean (`npm run typecheck` exited 0) | **PASS** |
| 4 | Stage 3 Production build clean (`npm run build` exited 0) | **PASS** |
| 5 | Stage 3 Linter clean (`npm run lint:hooks` exited 0) | **PASS** |
| 6 | Stage 3 Acceptance test suite passing (13/13 passed) | **PASS** |
| 7 | Full regression test suites passing (342 automated tests passed) | **PASS** |
| 8 | Rule D1 MOQ & Rule D2 Reference Markup idempotency verified | **PASS** |
| 9 | Firestore Emulator status reported honestly (`BLOCKED`) | **PASS** |
| 10 | Zero production data writes, zero merges to `launch`/`main` | **PASS** |
| 11 | **Explicit User Review & Authorization to Begin Stage 4** | **PENDING USER APPROVAL** |

---

## 6. Scope Boundary & Stopping Gate

**STOPPING POINT:** Execution is halted at the Stage 3 completion gate. All Stage 3 requirements are fully implemented, verified, and committed. In accordance with operating instructions:
- We have NOT begun Stage 4 (no navbar or dropdown redesign).
- We have NOT redesigned homepage or collection pages (Stage 5).
- We have NOT implemented customization inquiry desk (Stage 6).
- We have NOT implemented AI Gifting Buddy (Stage 7).
- We have NOT merged to `launch`/`main` or deployed to production.

Awaiting explicit user review and authorization before proceeding to Stage 4.
