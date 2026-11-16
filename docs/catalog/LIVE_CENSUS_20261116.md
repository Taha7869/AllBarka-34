# Live Firestore Catalog Census — 2026-11-16

Read-only census of the live Firestore `products` collection (`allbarka-live` / `(default)`), compared against repository seed products and intake draft batches.

## Summary

| Metric | Count | Details |
|---|---|---|
| **Live Firestore Total** | **89** | All live documents in `products` |
| **Active / Published** | 89 | 100% active/published in live database |
| **Draft / Inactive / Archived** | 0 | None in draft, inactive or archived state live |
| **Live IDs Not in Repo** | 0 | No unknown products live |
| **Duplicate Document IDs** | 0 | None |
| **Duplicate Product Names** | 0 | None |
| **Repo Seeds Missing Live** | 8 | All 8 `bid-box-*` celebration boxes |
| **Repo Drafts Awaiting Import** | 157 | Batches 20261110 (17), 20261113 (65), 20261114 (59), 20261115 (16) |
| **Total Products Known to Repo** | 254 | 97 seeds + 157 drafts in `MASTER_PRODUCT_LIST.csv` |

---

## Live Breakdown by Category

| Category | Live Count |
|---|---|
| `nuts` | 22 |
| `herbs-spices` | 19 |
| `oils` | 15 |
| `snacks-seeds` | 13 |
| `bundles` | 13 |
| `essentials` | 5 |
| `gift-boxes` | 2 |
| **Total** | **89** |

---

## Repository Seeds Missing from Live Firestore (8 Items)

These 8 products exist in `src/data/products.ts` under category `celebration-boxes`, but are not yet present in live Firestore:

1. `bid-box-umrah-tabarruk` — Umrah & Tabarruk Celebration Box
2. `bid-box-luxury-tin` — Luxury Tin Bid Box
3. `bid-box-pyramid-favor` — Pyramid Favor Box
4. `bid-box-card-nikkah` — Nikkah Bid Card
5. `bid-box-jute-pouch` — Rustic Jute Favor Pouch
6. `bid-box-sweet-nikkah` — Sweet Nikkah Bid Box
7. `bid-box-birth-announcement` — Birth Announcement Celebration Box
8. `bid-box-acrylic-royal` — Royal Acrylic Bid Box

---

## Repository Draft Batches Not Yet Live (157 Items)

- **Batch 20261110**: 17 items (`catalogIntake20261110.json`)
- **Batch 20261113**: 65 items (`catalogIntake20261113.json`)
- **Batch 20261114**: 59 items (`catalogIntake20261114.json`)
- **Batch 20261115**: 16 items (`catalogIntake20261115.json`)

All 157 draft products are documented in [MASTER_PRODUCT_LIST.csv](MASTER_PRODUCT_LIST.csv) and require merchant price review and publication before importing to Firestore.

---

## Verification Evidence

- Command: `node --env-file=.env --import tsx scripts/count-live-catalog.ts --project=allbarka-live "--database=(default)"`
- Exit Code: 0
- Mode: Read-only query against live Firestore database `(default)` on project `allbarka-live`.
- Verification Script: `tests/catalog-intake-20261113.test.ts` (6 pass / 0 fail).
