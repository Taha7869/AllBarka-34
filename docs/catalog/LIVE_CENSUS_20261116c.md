# Live Firestore Catalog Census (Post-Draft Import) — 2026-11-16

Census taken immediately after importing all 4 intake draft batches (20261110, 20261113, 20261115, 20261114) into live Firestore (`allbarka-live` / `(default)`).

---

## 1. Executive Summary

| Metric | Count | Details |
|---|---|---|
| **Total Products in Live Firestore** | **252** | Up from 97; entire master catalog is now persisted in Firestore |
| **Active / Published** | **97** | Publicly visible; identical to previous census (0 unwanted publications) |
| **Hidden Drafts** | **155** | Created as `status: 'draft'`, `active: false`, private audit preserved |
| **Archived / Inactive** | **0** | None |
| **Live IDs Not in Repo** | **0** | 100% matched with repository records |
| **Repo Items Missing Live** | **0** | 0 items missing from Firestore; 100% catalog parity achieved |
| **Public Storefront `/api/catalog`** | **97** | All 155 drafts are strictly filtered out from public view |

---

## 2. Live Breakdown by Category

| Category | Published | Draft | Total Live | Notes |
|---|---|---|---|---|
| `bundles` | 13 | 52 | **65** | 9 updated original bundles + 4 deals + 52 curated draft bundles |
| `herbs-spices` | 19 | 44 | **63** | Spices, masalay, saffron, shilajit, herbal teas |
| `nuts` | 22 | 18 | **40** | Almonds, walnuts, cashews, pistachios, chilgoza, seeds |
| `snacks-seeds` | 13 | 9 | **22** | Mukhwas, gachak, rewari, makhana, pumpkin/chia/sunflower seeds |
| `oils` | 15 | 7 | **22** | Cold-pressed pure oils (peanut, sunflower, neem, etc.) |
| `dates` | 0 | 11 | **11** | Soft brown, dark round/long, Mabroom, Mazafati, Piarom, etc. |
| `celebration-boxes` | 8 | 0 | **8** | 8 published celebration / bid boxes |
| `essentials` | 5 | 3 | **8** | Gur, desi honey, shakkar |
| `murabba-jaat` | 0 | 7 | **7** | Amla, gajar, saib, behi, bael, harad, gulkand |
| `dry-fruits` | 2 | 2 | **4** | Raisins, figs, blueberries, kiwi |
| `gift-boxes` | 2 | 0 | **2** | Curated gift boxes |
| **Total** | **97** | **155** | **252** | **Full catalog alignment** |

---

## 3. Imported Batches Detail (Tarteeb)

All 4 batches were imported via create-only transactions:

1. **Batch 20261110 (17 items):**
   - Mode: `EXECUTE_CREATE_ONLY`, Created: 17, Skipped: 0.
   - Products: Mukhwas, rewari, peanut-jaggery gachak, sweet makhana, cold-pressed oils, dates.
2. **Batch 20261113 (63 items):**
   - Mode: `EXECUTE_CREATE_ONLY`, Created: 63, Skipped: 0.
   - Products: Shelled/inshell nuts, herbal teas, traditional murabbas, desi honey, seeds.
3. **Batch 20261115 (16 items):**
   - Mode: `EXECUTE_CREATE_ONLY`, Created: 16, Skipped: 0.
   - Products: Whole spices, lal mirch, tamarind, exotic nuts (macadamia, pecans, brazil nuts).
4. **Batch 20261114 (59 items):**
   - Mode: `EXECUTE_CREATE_ONLY`, Created: 59, Skipped: 0.
   - Products: Curated bundles, deals, event/celebration hampers, pantry kits.

---

## 4. Verification Evidence

- **Live Census Command:**
  ```powershell
  node --env-file=.env --import tsx scripts/count-live-catalog.ts --project=allbarka-live "--database=(default)"
  ```
  *Output:* `total: 252`, `published: 97`, `draft: 155`, `repoItemsNotLive: 0`, `missingFromLive: []`. Exit code 0.
- **Storefront Privacy Verification:**
  - `GET https://allbarka.com/api/catalog` -> Returns 97 published products. Drafts visible: 0.
- **Audit Logging:** Every draft created has a matching `catalogAudits` record logged by admin transaction.
