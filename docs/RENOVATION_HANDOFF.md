# AllBarka Renovation — Stage 2 Code Review Repairs Handoff & Review Packet v2.4

**Document Version:** 2.4.0  
**Date:** October 17, 2026  
**Baseline Git Commit:** `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`  
**Active Working Branch:** `feat/renovation-v2` (Pushed & tracking `origin/feat/renovation-v2`)  
**Parent / Production Branch:** `launch` (synced with `origin/launch` and `origin/main`)  
**Applicable Instructions Read:** `C:\Users\taha\.gemini\antigravity\scratch\AllBarka-34\AGENTS.md` and `C:\Users\taha\.gemini\config\plugins\science\rules\AGENTS.md`  
**Status:** **STAGE 2 CODE REVIEW REPAIRS VERIFIED — HALTED AT ACCEPTANCE GATE**

---

## 1. Executive Summary & Review Repairs Completed

In response to the Stage 2 code review on commit `08612e38d9cd69653187211d80156e924408ad4f`, all 8 required architectural repairs have been implemented and verified:

1. **Admin Catalog Uses Admin Data**:
   - `AdminCatalogPanel.tsx` derives its table rows from authenticated `GET /api/admin/catalog/products` (`loadAdminCatalog`) rather than the public customer catalog.
   - Status filters (`All`, `Published`, `Draft`, `Archived`) allow administrators to manage drafts and archived items.
   - Re-fetches fresh catalog state after creation, editing, duplicating, publishing, and archiving.
   - Customer-facing public catalog (`GET /api/catalog`) strictly suppresses drafts and archived items and strips private supplier data.

2. **Unified Legacy & Dynamic Product Pricing (Full Journey Verified)**:
   - Resolved the disconnect where `updateCatalogPricing` writes canonical `schemaVersion: 1` / `variants` and deletes `prices`, causing `dynamicProductFromDocument` to fail with `PRODUCT_REQUIRES_PRICING`.
   - `validateDynamicProduct` and `dynamicProductFromDocument` now derive `prices` from active canonical variants when `prices` is absent.
   - Test 5 in `tests/stage2-catalog-crud.test.ts` proves the entire end-to-end journey: `create -> publish -> updateCatalogPricing -> save -> reload -> quote -> order`.
   - Test 6 proves existing canonical `schemaVersion: 1` seed documents support admin read, update, duplicate, quote, and order math.

3. **Protect Private Firestore Data**:
   - `firestore.rules` updated so that `/products/{productId}` read rule is restricted to `if isAdmin();`.
   - Anonymous and non-admin requests are rejected with 403 on real HTTP admin routes.
   - Firestore Emulator testing is honestly reported: `BLOCKED (Emulator not installed in local environment)`.

4. **Preserve Product and Shipping Capabilities**:
   - `validateDynamicProduct` validates and preserves `shippingWeightG`, `shippingWeights` (portion map), `isBundle`, `components`, `contents`, `allowCustomWeight`, `minCustomWeightG`, `maxCustomWeightG`, `pricePer100g`, `inStock`, `stockQty`, `isBidBox`, `bidBoxConfig`, `badge`, `badges`, `keywords`, `nutritionalHighlights`, `fragile`, `origins`, `harvest`, `care`, `targetMarginPercent`, and private fields.
   - Malformed records (e.g. negative shipping weights) are rejected with specific error codes.

5. **Complete Admin Editing**:
   - Created `src/components/AdminProductEditModal.tsx` providing multi-tab editing across Basic info, Taxonomy & Occasions, Personalization, Logistics & Sourcing, and Media.
   - Revisions are enforced with strict non-negative integer `expectedRevision` checks across edit, publish, and archive operations; missing, negative, non-integer, or stale revisions return HTTP 409 conflict.

6. **Complete Merchandising Foundation**:
   - `MerchandisingSettings` in `src/types.ts` enhanced with `showcaseTabs` (5 tabs, max 3 products each), `autoplay` config (`enabled`, `intervalMs`, `resumeDelayMs`), `collections` array, and `occasions` array.
   - `validateInternalDestination` strictly validates internal navigation paths (starts with `/`, rejects external URLs, protocol-relative paths, and control characters).
   - Created `src/config/merchandising.ts` providing bundle-safe default merchandising settings accessible to both client React components and server modules without bundling Node.js or Firebase Admin dependencies into Vite.

7. **Test the Actual Migration Engine**:
   - Extracted production migration engine into `src/lib/catalogMigrationV2.ts` (`planCatalogMigrationV2`, `executeCatalogMigrationV2`, `rollbackCatalogMigrationV2`).
   - Refactored `scripts/migrate-catalog-v2.ts` to consume the engine.
   - Test 10 in `tests/stage2-catalog-crud.test.ts` executes:
     1. Dry-run: confirms 0 database writes.
     2. Run 1: applies mutations and preserves existing merchant pricing on legacy items.
     3. Run 2: executes idempotency check, confirming 0 updates (100% SKIP).
     4. Rollback: restores exact pre-migration state using recorded before-images.

8. **Honest Verification & Disclosure**:
   - Verification distinguishes real HTTP loopback server requests over TCP, two-phase in-memory Firestore fixture tests, and explicit non-execution against live production Google Cloud Firestore (prohibited by Stage 2 operating rules).
   - Emulator status: `BLOCKED (Emulator not installed in local environment)`.

---

## 2. Test & Build Verification Evidence

| Command / Suite | Actual Output / Result | Exit Code | Evaluation & Coverage Notes |
| :--- | :--- | :---: | :--- |
| `npx tsx --test tests/stage2-catalog-crud.test.ts` | 12 passed, 0 failed (duration 1.51s) | `0` | **VERIFIED:** Covers all 8 code review items including pricing editor journey, schemaVersion: 1 reads/edits, shipping weights roundtrip, expectedRevision 409s, merchandising validation, and migration double-run + rollback. |
| `npm run typecheck` (`tsc --noEmit`) | `allbarka@0.0.0 typecheck` (zero diagnostics) | `0` | **VERIFIED:** Entire codebase types compile cleanly. |
| `npm run lint:hooks` (`eslint src`) | `allbarka@0.0.0 lint:hooks` (zero warnings, zero errors) | `0` | **VERIFIED:** All hook dependency warnings resolved with `useCallback`. |
| `npm run build` | Full pipeline: write-build-info, Vite v6.4.3 bundle, esbuild server.cjs (819.4kb), release privacy audit (83 artifacts checked). | `0` | **VERIFIED:** Production assets and server bundle build without errors. |
| `npm run test:backend` | 21 passed, 0 failed | `0` | **VERIFIED:** Backend pricing, order validation, delivery slots, and n8n webhook safety intact. |
| `npm run test:integrations` | 58 passed, 0 failed | `0` | **VERIFIED:** Sheets, WhatsApp commerce router, order outbox, and authentication intact. |
| `npm run test:admin` | 37 passed, 0 failed | `0` | **VERIFIED:** Admin client, search, image audit, operations, and presentation intact. |
| `npm run test:shipping` | 19 passed, 0 failed | `0` | **VERIFIED:** Shipping policy, portion billing weights, hampers, and destination tariffs intact. |
| `npm run test:experience` | 46 passed, 0 failed | `0` | **VERIFIED:** Selection guide, product photo viewer, catalog filters, and auth modals intact. |
| `npm run test:refinements` | 52 passed, 0 failed | `0` | **VERIFIED:** Visual refinements, circular carousel, media overrides, and store updates intact. |
| `npx tsx --test tests/catalog-image-labels.test.ts tests/catalog-categories.test.tsx` | 8 passed, 0 failed | `0` | **VERIFIED:** Canonical category aliases, date product names, and rendered safe area text intact. |

---

## 3. Files Changed & Newly Created

### Newly Created Files:
1. `src/components/AdminProductEditModal.tsx`: Comprehensive multi-tab product editor for administrators.
2. `src/config/merchandising.ts`: Client & server bundle-safe default merchandising configuration.
3. `src/lib/catalogMigrationV2.ts`: Production migration engine (`planCatalogMigrationV2`, `executeCatalogMigrationV2`, `rollbackCatalogMigrationV2`).

### Modified Files:
1. `firestore.rules`: Restricted `/products/{productId}` read rule to `if isAdmin();`.
2. `scripts/migrate-catalog-v2.ts`: Refactored to delegate to `catalogMigrationV2.ts`.
3. `src/components/AdminCatalogPanel.tsx`: Authenticated admin catalog loader, status filter pills, edit modal integration.
4. `src/components/AdminMerchandisingPanel.tsx`: Showcase tabs, autoplay intervals, collections, occasions, and clean hook dependencies.
5. `src/components/ProductPhotoViewer.tsx`: Removed static CSS import in favor of `index.css` `@import`.
6. `src/config/categories.ts`: Preserved category aliases and canonical food categories.
7. `src/data/products.ts`: Restored canonical date names and celebration-boxes category mapping.
8. `src/index.css`: Added `@import "./styles/product-photo-viewer.css";`.
9. `src/lib/catalogSchema.ts`: Derived prices from variants when prices is deleted; validated shipping weights, bundles, packaging, and internal destinations; added `CatalogError.status`.
10. `src/lib/catalogStore.ts`: Dynamic product derivation, strict `expectedRevision` validation, duplicate safe ID generation, re-export of `DEFAULT_MERCHANDISING`.
11. `src/types.ts`: Enhanced `Product`, `BidBoxConfig`, and `MerchandisingSettings`.
12. `tests/stage2-catalog-crud.test.ts`: Expanded to 12 acceptance tests covering all code review items.
13. `docs/RENOVATION_REQUIREMENTS.md`: Updated Stage 2 traceability.

---

## 4. Stage 3 Entry Criteria Checklist

| Check | Item | Status |
| :---: | :--- | :---: |
| 1 | Baseline commit confirmed on `main` and `launch` (`8cf4410`) | **PASS** |
| 2 | Working feature branch active (`feat/renovation-v2`) | **PASS** |
| 3 | Stage 2 Typecheck clean (`npm run typecheck` exited 0) | **PASS** |
| 4 | Stage 2 Production build clean (`npm run build` exited 0) | **PASS** |
| 5 | Stage 2 Linter clean (`npm run lint:hooks` exited 0) | **PASS** |
| 6 | Stage 2 Acceptance test suite passing (12/12 passed) | **PASS** |
| 7 | Full regression test suites passing (253+ automated tests passed) | **PASS** |
| 8 | Safe migration engine verified with dry-run, run 1, run 2 skip, and rollback | **PASS** |
| 9 | Zero production data writes, zero merges to `launch`/`main` | **PASS** |
| 10 | **Explicit User Review & Authorization to Begin Stage 3** | **PENDING USER APPROVAL** |

---

## 5. Scope Boundary & Stopping Gate

**STOPPING POINT:** Execution is stopped here. Stage 2 repairs are completely implemented, verified, and pushed to `feat/renovation-v2`. In accordance with operating instructions:
- We have NOT begun Stage 3 (no packaging MOQ rules engine, no lead times, no pricing rules engine).
- We have NOT redesigned homepage or navigation (Stages 4 & 5).
- We have NOT deployed or performed live database mutations.

Awaiting explicit user review and authorization to proceed to Stage 3.
