# Handoff: Draft Images, Reference Prices & Live Publication (2026-11-19)

## Context & Owner Directives
- **Task Branch:** `ag/20261118-draft-images-prices` (cut from `origin/claude/celebrations-foundation-20261112`).
- **Owner & Claude Review:** Claude reviewed all 138 generated draft product images. Owner instructed to **HOLD 33 items in DRAFT** (`IMAGE_HOLD_20261119.txt`) and publish the remaining 122 reviewed drafts.
- **Authority:** Owner gave explicit `"haan"` for `--execute` against live Firestore (`allbarka-live` / `(default)`).

---

## What Was Done

### 1. High-Fidelity Studio Images (<200KB WebP, Unique Content Hashes)
- Generated luxury boutique studio product images for all 138 placeholder drafts under `public/images/drafts-20261118/<id>.webp`, and optimized all 17 batch-1 images under `public/images/catalog-intake-20261110/`.
- All 155 images verified:
  - Valid `.webp` files under 200KB (ranging between 20KB and 192KB).
  - Clean composition matching AllBarka boutique style (soft ambient shadow, warm neutral luxury background, authentic product appearance, no brand/text/logos).
  - **155 unique SHA-256 hashes** across all 155 images (0 duplicates). Every single bundle and gift item features custom composite layout reflecting its actual `componentIds`.
  - Visual sheet created: `docs/catalog/DRAFT_IMAGES_SHEET.html` for instant visual inspection.

### 2. Pakistani Market Median Reference Prices
- Compiled `docs/catalog/REFERENCE_PRICES_20261118.csv` (`id,price_pkr_per_kg,source,date`) covering all 155 draft products using Akbari Mandi wholesale benchmarks and Pakistani online stores (akbarionline.pk, Organic Aprico, Daraz PK verified stores).
- Verified positive per-kg rates for every single and bundle product.

### 3. Indicative Price Storefront Notice
- Added `priceIndicative?: boolean` to:
  - `src/types.ts` (`Product` interface).
  - `src/lib/catalogSchema.ts` (validated in `validateDynamicProduct`, preserved in `stripPrivateProductFields` public projection).
  - `src/lib/catalogIntakeEnrich.ts` (defaults to `true` for intake drafts).
- Wired `IndicativePriceNotice` component onto:
  - `src/pages/ProductDetailPage.tsx`
  - `src/components/QuickViewModal.tsx`
- Clearly informs customers: *"Qeemat andazan hai, team order ke baad confirm karegi"* / *"Prices are indicative and confirmed by our concierge upon order placement"*.

### 4. Selective Publish Script & Hold List Filter
- Created `scripts/publish-ready-drafts-20261118.ts`:
  - Evaluates drafts for readiness (real image present, positive base price, complete trilingual copy in EN/UR/AR).
  - Supports `--exclude-file` (e.g. `docs/catalog/IMAGE_HOLD_20261119.txt`) and `--exclude=<ids>`.
  - Holds back single items and bundles matching excluded IDs with reason `HOLD_IMAGE_OR_ORIGIN_REVIEW`.
  - Supports `--dry-run` and authorized `--execute` (requiring `--confirm-project=allbarka-live` and current admin UID).
  - Safely performs atomic admin update and publish transactions (`updateAdminProduct` -> `publishAdminProduct`), recording full audit entries in `catalogAudits`.

### 5. Live Firestore Execution & Census
- Executed `--dry-run`: verified 122 `WOULD_UPDATE_AND_PUBLISH`, 33 `HELD`, 0 missing.
- After owner authorization, executed `--execute`:
  - **122 draft products updated & published live** to Firestore with studio images, enriched copy, and `priceIndicative: true`.
  - **33 products remained on hold as drafts** (`status: 'draft'`, `active: false`).
- Executed live catalog census (`scripts/count-live-catalog.ts`):
  - **Total in Live Firestore:** 252 (219 published + 33 drafts).
  - Documented in `docs/catalog/LIVE_CENSUS_20261119.md`.

---

## Verification Evidence

1. **Live Publication Output:**
   `docs/catalog/EXECUTE_PUBLISH_20261119.json`
   ```json
   {
     "mode": "EXECUTE_PUBLISH",
     "summary": {
       "totalDrafts": 155,
       "readyToPublish": 122,
       "alreadyPublished": 0,
       "heldBack": 33,
       "missingInFirestore": 0
     }
   }
   ```

2. **Live Catalog Census (`countLiveCatalog`):**
   ```text
   total: 252
   byState: { published: 219, draft: 33, archived: 0, inactive: 0 }
   missingFromLive: []
   notInRepo: []
   ```

3. **Automated Test Suite:**
   `node --import tsx --test tests/draft-publish-20261118.test.ts`
   ```text
   ✔ all 155 drafts have <200KB WebP studio images, unique SHA-256 hashes, priceIndicative: true, and DRAFT_IMAGES_SHEET.html
   ✔ REFERENCE_PRICES_20261118.csv covers all 155 drafts with positive per-kg rates, source and date
   ✔ publish readiness holds back incomplete drafts and executes cleanly on ready drafts in memoryFirestore
   ✔ IMAGE_HOLD_20261119.txt holds back exactly 33 items leaving 122 ready to publish
   # pass 4 / # fail 0
   ```

4. **TypeScript Typecheck:**
   `npm run typecheck` — 0 errors, pass.

---

## Files Added & Modified
- `docs/catalog/IMAGE_HOLD_20261119.txt` (the 33 held product IDs)
- `docs/catalog/LIVE_CENSUS_20261119.md` (post-publish census report)
- `docs/catalog/DRY_RUN_PUBLISH_20261119.json` (dry-run output)
- `docs/catalog/EXECUTE_PUBLISH_20261119.json` (live publish execution output)
- `scripts/publish-ready-drafts-20261118.ts` (hold filter, exclude file support, progress logs, ignoreUndefinedProperties)
- `tests/draft-publish-20261118.test.ts` (test case for hold list filtering 33 items)
- `docs/PENDING_WORK.md` (updated status)
- `docs/handoffs/20261119-draft-images-prices.md` (this handoff note)
