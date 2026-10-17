# AllBarka Renovation — Stage 3 Review Packet & Handoff v3.1

**Document Version:** 3.1.0  
**Date:** October 17, 2026  
**Baseline Git Commit:** `c61d0f0f2483403221faf1c404f1f82c38422243` (Initial Stage 3) / `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0` (`launch` / `main`)  
**Active Working Branch:** `feat/renovation-v2` (Tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 3 REVIEW DEFECTS RESOLVED & VERIFIED — HALTED AT STAGE 4 ENTRY GATE**

---

## 1. Stage 3 Review Defects Resolved (from `c61d0f0`)

### Defect 1 — `bidBoxPricing.ts` Invented Bulk Prices and Discounts
- **Root Cause**: `resolveBidBoxConfig` previously synthesized nonexistent 10/25/50/100 pack prices using hardcoded percentage multipliers (`* 0.95`, `* 0.90`, `* 0.82`), attached hardcoded `-5%`, `-10%`, `-18%` badges, and fell back to stale `existingConfig.emptyUnitStarting`, `filledMin`, `filledMax`, and `opt.price` properties.
- **Resolution**:
  - Rewrote `resolveBidBoxConfig` in `src/lib/bidBoxPricing.ts` and `createBidBoxProduct` in `src/data/products.ts` to read strictly from explicitly saved, available (`v.available !== false`), positively priced variants.
  - Removed all invented pack tiers, fallback multiplications, hardcoded discount badges, and stale `bidBoxConfig` price fallbacks.
  - Savings badges (`-X%`) are computed exclusively from actual saved comparable unit prices (`Math.round(((baselineUnitPrice - v.unitPrice) / baselineUnitPrice) * 100)` when `v.unitPrice < baselineUnitPrice`).
  - Updated `ProductDetailPage.tsx` so the Bid Box mode/tier card only renders when saved empty + filled modes or saved multi-piece pack tiers exist, and `"Bulk Tier Savings Available"` is shown only when `emptyTiers.some(t => Boolean(t.discountBadge))`.

### Defect 2 — Variant MOQ Overrides Disappeared Through Persistence/Projection
- **Root Cause**: `CatalogVariant` and `CatalogPricing` in `src/lib/catalogSchema.ts` omitted `moqOverride`, causing `validateCatalogPricing`, `readCatalogPricing`, `productFromPricing`, `updateCatalogPricing`, `getAdminProductRecord`, and `updateAdminProduct` to strip variant and product MOQ overrides during pricing saves and catalog projections.
- **Resolution**:
  - Added `moqOverride?: number | null` to `CatalogVariant` and `CatalogPricing` in `src/lib/catalogSchema.ts`.
  - Added `validateMoqOverride(value)` throwing `CatalogError('INVALID_MOQ_OVERRIDE', 400)` for any non-null/non-empty value outside safe integers `[1, 10000]`.
  - Updated `validateCatalogPricing`, `pricingFromLegacy`, `readCatalogPricing`, `productFromPricing`, `validateDynamicProduct`, `storedCatalogRecord`, `snapshotFromDocuments`, `updateCatalogPricing`, `getAdminProductRecord`, `createAdminProduct`, and `updateAdminProduct` to preserve both product and variant `moqOverride` across create, reload, metadata edits, pricing saves, public catalog projection, and authoritative order quotes, and to clear overrides when `null` is passed.
  - Added admin UI controls for setting and clearing product and per-variant MOQ overrides in `AdminCatalogPricingEditor.tsx`, `AdminProductCreateModal.tsx`, and `AdminProductEditModal.tsx`.

### Defect 3 — Unpriced Inquiry-Only Packaging Threw During Rendering
- **Root Cause**: `ProductCard.tsx` and `ProductDetailPage.tsx` called `calculatePackagingMoq` and `calculateMinOrderQuantityUnits` unconditionally, which threw when rendering an unpriced inquiry-only packaging product (`prices: {}`).
- **Resolution**:
  - Added `getPackagingMoqDisplay(product, variantLabel)` in `src/lib/packagingMoq.ts` returning `{ moqPieces: number | null; minUnits: number | null }` safely without throwing when no positive price exists, and removed the `bidBoxConfig.emptyUnitStarting` fallback from `getPublishedPerPiecePrice`.
  - Updated `ProductCard.tsx`, `ProductDetailPage.tsx`, and `CustomQuoteModal.tsx` to render unpriced/inquiry-only products safely (`isQuoteOnly = true` when no positive available prices exist), omit numeric MOQ badges when `moqPieces === null`, and open the custom inquiry modal while keeping direct checkout blocked server-side (`QUOTE_REQUIRED` / `PRICING_UNAVAILABLE`).

### Defect 4 — `pricingImport.ts` Missed Canonical Existing Prices
- **Root Cause**: `applyReferenceImportPricing` only checked `existingProduct.prices` and singular `price`, missing canonical `existingProduct.variants` (where `updateCatalogPricing` deletes `prices`), collapsed multi-variant products to the first price, and was not wired into a transactional Firestore import path.
- **Resolution**:
  - Added `extractEstablishedVariants` and rewrote `applyReferenceImportPricing` in `src/lib/pricingImport.ts` to recognize established merchant prices in canonical `variants`, legacy `prices` maps, and singular `price`.
  - Multi-variant re-imports preserve each existing variant's distinct merchant price (`sellingPrices`, `variants`) without collapsing to the first variant's price.
  - Added explicit validation for missing `existingProduct` and contradictory import inputs (`CatalogError('CONTRADICTORY_IMPORT_INPUT', 400)`).
  - Implemented transactional, idempotent `importReferenceProduct` in `src/lib/catalogStore.ts` (strictly read-before-write) and exposed `POST /api/admin/catalog/import` and `POST /api/admin/catalog/products/:productId/import` in `src/lib/catalogRouter.ts`.

---

## 2. Test & Build Verification Evidence

All test suites, TypeScript typechecking, React hook linter, and production build pipeline passed with zero errors:

| Command / Suite | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :---: | :--- |
| `npx tsx --test tests/stage3-pricing-moq.test.ts` | **19 passed, 0 failed** | `0` | **VERIFIED:** All 13 original Stage 3 tests + 6 new regression tests covering all 4 review defects (single Rs. 1000 variant Bid Box with no invented tiers/discounts, actual savings calculation, variant MOQ 8 end-to-end persistence & clearing + invalid MOQ rejection, unpriced `prices: {}` rendering in `ProductCard` & `ProductDetailPage`, canonical Rs. 1800 preservation on Rs. 1000 re-import & repeat idempotency, multi-variant distinct price preservation & contradictory input rejection). |
| `npx tsx --test tests/stage2-catalog-crud.test.ts` | **25 passed, 0 failed** (duration 1.92s) | `0` | **VERIFIED:** All Stage 2 data model, admin CRUD, price editor journeys, canonical seed edits, merchandising concurrency, durable migration recovery, and read-before-write transaction ordering intact. |
| `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** Clean compilation across entire repository. |
| `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All React hook dependencies satisfied. |
| `npm run build` | Full pipeline: write-build-info, Vite v6.4.3 bundle, esbuild server.cjs (868.6kb), release privacy audit (83 artifacts checked). | `0` | **VERIFIED:** Production assets and server bundle build without errors. |
| `npm run test:admin` | **37 passed, 0 failed** | `0` | **VERIFIED:** Admin client, catalog, presentation, and operations intact. |
| `npm run test:advanced` | **71 passed, 0 failed** | `0` | **VERIFIED:** Cart input, advanced tools, checkout reliability, and cart shipping intact. |
| `npm run test:shipping` | **19 passed, 0 failed** | `0` | **VERIFIED:** Shipping policy, portion billing weights, hampers, and destination tariffs intact. |
| `npm run test:backend` | **21 passed, 0 failed** | `0` | **VERIFIED:** Backend pricing, order validation, delivery slots, and n8n webhook safety intact. |
| `npm run test:discovery` | **14 passed, 0 failed** | `0` | **VERIFIED:** Discovery, search, and catalog card rendering intact. |

---

## 3. Firestore Emulator Status

- **Status:** **BLOCKED (Emulator / firebase-tools not installed in local environment)**
- **Audit Findings:** Neither `firebase` CLI nor `firebase-tools` are installed in the local environment (`firebase: command not found`).
- **Production Readiness Stance:** Production readiness is **NOT** claimed for live cloud Firestore mutations. Zero production writes have been performed, zero live database operations have been executed, and all pricing, catalog, and checkout guarantees are validated via in-memory transaction mocks enforcing strict read-before-write ordering, `{ merge: true }`, and `FieldValue.delete()`.

---

## 4. Files Modified in Stage 3 Review Fix

1. `src/lib/packagingMoq.ts`: Added `getPackagingMoqDisplay` for safe unpriced rendering and removed `bidBoxConfig.emptyUnitStarting` fallback from `getPublishedPerPiecePrice`.
2. `src/lib/bidBoxPricing.ts`: Removed invented bulk tiers, percentage discount multipliers, hardcoded badges, and stale `bidBoxConfig` price fallbacks; computes savings strictly from saved comparable prices.
3. `src/data/products.ts`: Updated `createBidBoxProduct` to compute savings badges strictly from actual unit price savings.
4. `src/lib/catalogSchema.ts`: Added `moqOverride` to `CatalogVariant` and `CatalogPricing`, added `validateMoqOverride` (`INVALID_MOQ_OVERRIDE`), preserved overrides across `validateCatalogPricing`, `pricingFromLegacy`, `readCatalogPricing`, `productFromPricing`, and `validateDynamicProduct`.
5. `src/lib/catalogStore.ts`: Preserved product and variant `moqOverride` across `storedCatalogRecord`, `snapshotFromDocuments`, `updateCatalogPricing`, `getAdminProductRecord`, `createAdminProduct`, and `updateAdminProduct`; added transactional and idempotent `importReferenceProduct`.
6. `src/lib/pricingImport.ts`: Added `extractEstablishedVariants` recognizing canonical `variants`, preserved distinct multi-variant merchant prices on re-import, and rejected contradictory import inputs (`CONTRADICTORY_IMPORT_INPUT`).
7. `src/lib/catalogRouter.ts`: Added `POST /api/admin/catalog/import` and `POST /api/admin/catalog/products/:productId/import` endpoints.
8. `src/components/ProductCard.tsx`, `src/pages/ProductDetailPage.tsx`, `src/components/CustomQuoteModal.tsx`: Safe rendering and inquiry handling for unpriced (`prices: {}`) packaging products and dynamic Bid Box tier display without invented discounts.
9. `src/components/AdminCatalogPricingEditor.tsx`, `src/components/AdminProductCreateModal.tsx`, `src/components/AdminProductEditModal.tsx`: Added admin inputs and Clear buttons for product and per-variant MOQ overrides.
10. `tests/stage3-pricing-moq.test.ts`: Added 6 comprehensive regression tests for Defects 1–4 (total 19/19 passing).
11. `docs/RENOVATION_REQUIREMENTS.md` & `docs/RENOVATION_HANDOFF.md`: Updated documentation to v3.1.0.

---

## 5. Scope Boundary & Stopping Gate

**STOPPING POINT:** Execution is halted at the Stage 3 completion gate. We have NOT begun Stage 4, merged to `launch`/`main`, deployed, or written production data. Awaiting explicit user review and authorization before proceeding to Stage 4.
