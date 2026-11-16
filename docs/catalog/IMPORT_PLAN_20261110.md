# Catalog Intake 20261110 — Import Plan (Dry Run Report)

**Date:** 2026-11-16  
**Target Project:** `allbarka-live`  
**Database:** `(default)`  
**Execution Mode:** DRY RUN ONLY (`--dry-run` / `--read-only`, no Firestore writes)

---

## 1. Executive Summary

| Metric | Result | Notes |
|---|---|---|
| **Total Products in Batch** | **17** | All 17 defined in `src/data/catalogIntake20261110.json` |
| **New Firestore Documents to Create** | **17** | All will be created as `draft` (`active: false`) |
| **Live Firestore Collisions (Takraav)** | **0** | None of the 17 IDs exist in live Firestore |
| **Repo Seed Collisions** | **0** | All 17 IDs are distinct from compiled seeds in `PRODUCTS` |
| **Reused IDs Referenced** | 12 | Seed IDs referenced for variant/media mapping; none overwritten |
| **Actual Firestore Writes** | **0** | Verified read-only dry run |

---

## 2. Live Collision & Action Breakdown

Each item was checked directly against live Firestore collection `products`:

| # | Product ID | Name (English) | Category | Live Status | Planned Action |
|---|---|---|---|---|---|
| 1 | `sweet-fruit-balls` | Sweet Fruit Balls | `snacks-seeds` | Not Live | `CREATE_DRAFT` (verified) |
| 2 | `mixed-mukhwas` | Mixed Saunf Mukhwas | `herbs-spices` | Not Live | `CREATE_DRAFT` (verified) |
| 3 | `sweet-makhana-large` | Sweet Makhana — Large Sugar Clusters | `snacks-seeds` | Not Live | `CREATE_DRAFT` (verified) |
| 4 | `nakul-dana-small` | Nakul Dana — Small Sugar Clusters | `snacks-seeds` | Not Live | `CREATE_DRAFT` (verified) |
| 5 | `sugar-coated-saunf` | Sugar-Coated Saunf | `herbs-spices` | Not Live | `CREATE_DRAFT` (verified) |
| 6 | `peanut-jaggery-gachak` | Peanut & Jaggery Gachak | `snacks-seeds` | Not Live | `CREATE_DRAFT` (verified) |
| 7 | `sesame-rewari` | Sesame Rewari | `snacks-seeds` | Not Live | `CREATE_DRAFT` (verified) |
| 8 | `brown-raisins` | Brown Raisins (Kishmish) | `dry-fruits` | Not Live | `CREATE_DRAFT` (verified) |
| 9 | `dates-soft-brown` | Soft Brown Dates | `dates` | Not Live | `CREATE_DRAFT` (verified) |
| 10 | `dates-dark-round` | Dark Round Dates | `dates` | Not Live | `CREATE_DRAFT` (verified) |
| 11 | `dates-dark-long` | Dark Elongated Dates | `dates` | Not Live | `CREATE_DRAFT` (verified) |
| 12 | `dates-golden-brown` | Golden-Brown Dates | `dates` | Not Live | `CREATE_DRAFT` (verified) |
| 13 | `oil-peanut` | Peanut Oil | `oils` | Not Live | `CREATE_DRAFT` (verified) |
| 14 | `oil-sunflower` | Sunflower Oil | `oils` | Not Live | `CREATE_DRAFT` (verified) |
| 15 | `oil-neem` | Neem Oil | `oils` | Not Live | `CREATE_DRAFT` (verified) |
| 16 | `oil-taramira` | Taramira Oil | `oils` | Not Live | `CREATE_DRAFT` (verified) |
| 17 | `oil-soybean` | Soybean Oil | `oils` | Not Live | `CREATE_DRAFT` (verified) |

---

## 3. Field Audit: Prices, MOQ, and Images

### A. Price Status
- **Root `price`:** `null` on all 17 items (standard draft behavior).
- **`commerce.basePrice`:** Pre-populated with baseline reference rates from `catalogIntake20261110Overlay.json`:
  - Snacks / Mukhwas: Rs. 80 – Rs. 160 per 100g base.
  - Dates: Rs. 300 – Rs. 900 per 1kg.
  - Raisins: Rs. 1,000 per 1kg.
  - Cold-Pressed Oils: Rs. 80 – Rs. 240 per 100ml base.
- **`prices` map:** Multi-tier options computed (e.g. 100g, 250g, 500g, 1000g; or 100ml, 250ml, 500ml, 1L).
- **Status:** **PLACEHOLDER REFERENCE ONLY.** The owner must confirm merchant rates in admin before publishing.

### B. MOQ (Minimum Order Quantity) Status
- **`commerce.packagingMoq`:** `null` across all 17 items.
- **`commerce.custom.moq`:** `undefined` across all 17 items.
- **Status:** **EMPTY / DEFAULT.** Fallback to standard commerce tier rules (Rule D1) unless custom MOQs are specified prior to publishing.

### C. Image & Media Status
- **File Paths:** All 17 items reference `/images/catalog-intake-20261110/<id>.webp`.
- **Disk Existence:** All 17 `.webp` files physically exist in `public/images/catalog-intake-20261110/`.
- **Status:** **PLACEHOLDER ASSETS.** Existing images are generated label graphics. Real merchant studio photographs should be uploaded via admin before public publishing.

### D. Trilingual & Nutritional Enrichment
- **Trilingual Copy:** English, Urdu, and Arabic (`name`, `desc`, `origin`, `sourcingDetails`, `storageTips`, `packagingDetails`, `allergenWarning`) are 100% complete via `catalogIntakeEnrich.ts` overlay.
- **Visibility:** `status: "draft"`, `active: false`, `isProductPubliclyVisible === false`.

---

## 4. Verification Commands

1. **Offline Dry Run:**
   ```powershell
   npx tsx scripts/import-catalog-intake-20261110.ts --dry-run
   ```
   *Result:* Mode `OFFLINE_PLAN_UNVERIFIED`, 17 items `CREATE_DRAFT`, Exit code 0.

2. **Live Firestore Dry Run:**
   ```powershell
   node --env-file=.env --import tsx scripts/import-catalog-intake-20261110.ts --dry-run --project=allbarka-live "--database=(default)"
   ```
   *Result:* Mode `READ_ONLY_PLAN`, 17 items `CREATE_DRAFT` with `verified: true`, Exit code 0.

3. **Automated Test Suite:**
   ```powershell
   node --import tsx --test tests/catalog-intake-20261110.test.ts
   ```
   *Result:* 6 pass / 0 fail (includes new `--dry-run` CLI test).
