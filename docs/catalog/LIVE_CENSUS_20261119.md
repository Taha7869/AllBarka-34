# Live Firestore Catalog Census (Post-Draft Publish) — 2026-11-19

Census taken immediately after publishing 122 reviewed drafts with studio images and reference prices into live Firestore (`allbarka-live` / `(default)`), while keeping 33 items on hold as drafts per owner and review instructions (`IMAGE_HOLD_20261119.txt`).

---

## 1. Executive Summary

| Metric | Count | Details |
|---|---|---|
| **Total Products in Live Firestore** | **252** | Entire catalog persisted in Firestore |
| **Active / Published** | **219** | Up from 97 (+122 published drafts); all display `priceIndicative: true` notice |
| **Hidden Drafts on Hold** | **33** | The 33 items held for image/origin review (`status: 'draft'`, `active: false`) |
| **Archived / Inactive** | **0** | Zero inactive or archived products |
| **Live IDs Not in Repo** | **0** | 100% matched with repository records |
| **Repo Items Missing Live** | **0** | 0 items missing from Firestore; 100% catalog parity achieved |
| **Total Evaluated Drafts** | **155** | 122 published + 33 held |

---

## 2. Live Breakdown by Category

| Category | Published | Draft (Held) | Total Live | Notes |
|---|---|---|---|---|
| `bundles` | 57 | 8 | **65** | 9 updated original bundles + 4 deals + 44 published draft bundles (8 held) |
| `herbs-spices` | 52 | 11 | **63** | Spices, masalay, saffron, shilajit, herbal teas (11 held) |
| `nuts` | 34 | 6 | **40** | Almonds, walnuts, cashews, pistachios, chilgoza, seeds (6 held) |
| `snacks-seeds` | 21 | 1 | **22** | Mukhwas, gachak, rewari, makhana, pumpkin/chia/sunflower seeds (1 held) |
| `oils` | 22 | 0 | **22** | Cold-pressed pure oils (100% published) |
| `dates` | 11 | 0 | **11** | Soft brown, dark round/long, Mabroom, Mazafati, Piarom, Safawi, Sukkari |
| `celebration-boxes` | 8 | 0 | **8** | 8 published celebration / bid boxes |
| `essentials` | 8 | 0 | **8** | Gur, desi honey, shakkar (100% published) |
| `murabba-jaat` | 0 | 7 | **7** | Amla, gajar, saib, behi, bael, harad, gulkand (all 7 on hold) |
| `dry-fruits` | 4 | 0 | **4** | Raisins, figs, blueberries, kiwi (100% published) |
| `gift-boxes` | 2 | 0 | **2** | Curated gift boxes (100% published) |
| **Total** | **219** | **33** | **252** | **Full catalog alignment** |

---

## 3. The 33 Held Products (Draft Status in Firestore)

These 33 items remain in Firestore with `status: 'draft'` and `active: false` per `docs/catalog/IMAGE_HOLD_20261119.txt`:

### Single Items (25):
- `pecans`
- `almond-slices`
- `brazil-nuts`
- `ashwagandha`
- `dadar-mirch-dry-red-chilli`
- `gulkand`
- `gurbandi-almonds-inshell`
- `kagzi-almonds-inshell`
- `macadamia-nuts`
- `korean-red-ginseng-root`
- `mulethi-licorice-root`
- `salab-misri`
- `salted-peanuts`
- `murabba-amla`
- `murabba-bael`
- `murabba-behi`
- `murabba-gajar`
- `murabba-harad`
- `murabba-saib`
- `kamarkas`
- `dried-shikakai`
- `imli-tamarind`
- `chamomile-tea`
- `coriander-seeds-whole`
- `saffron-spanish-coupe`

### Bundles / Gifts / Deals (8):
- `gift-visit-small`
- `gift-visit-hospital-light`
- `gift-condolence-visit`
- `gift-ayadat-basket`
- `deal-date-almond`
- `bundle-chilgoza-heirloom`
- `bundle-murabba-tasting`
- `deal-murabba-duo`

---

## 4. Verification & Audit Trail

- **Execution Command:**
  `npx tsx scripts/publish-ready-drafts-20261118.ts --execute --confirm-project=allbarka-live --project=allbarka-live "--database=(default)" --exclude-file=docs/catalog/IMAGE_HOLD_20261119.txt --actor-uid=M3G6YVS5kjedyPTjpKgW2LB7B2N2 --out=docs/catalog/EXECUTE_PUBLISH_20261119.json`
- **Audit Records:** Every update and publish transaction recorded an audit entry in `catalogAudits` collection with actor UID, previous revision, new revision, and timestamp.
- **Storefront Display:** All newly published items have `priceIndicative: true` and display the `IndicativePriceNotice` component on their PDP and Quick View modals.
