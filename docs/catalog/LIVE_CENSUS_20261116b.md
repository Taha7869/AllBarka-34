# Live Firestore Catalog Census (Post-Update) — 2026-11-16

Census taken immediately after publishing the 8 celebration bid boxes and updating copy/names on the 9 older bundles in live Firestore (`allbarka-live` / `(default)`).

---

## 1. Executive Summary

| Metric | Count | Details |
|---|---|---|
| **Live Firestore Total** | **97** | Up from 89; all 97 website seed products are now active in Firestore |
| **Active / Published** | **97** | 100% published and active |
| **Draft / Inactive / Archived** | **0** | No drafts, inactive, or archived products in live catalog |
| **Live IDs Not in Repo** | **0** | No unknown products live |
| **Repo Seeds Missing Live** | **0** | Previously 8 `bid-box-*` missing; now 0 missing |
| **Duplicate Records** | **0** | 0 duplicate IDs, 0 duplicate names |
| **Repository Known Total** | **252** | 97 published seeds + 155 drafts in `MASTER_PRODUCT_LIST.csv` |
| **Repository Drafts Awaiting Import** | **155** | Draft items awaiting merchant photos, pricing review, and publication |

---

## 2. Live Breakdown by Category

| Category | Live Count | Notes |
|---|---|---|
| `nuts` | 22 | Almonds, walnuts, cashews, pistachios, chilgoza, etc. |
| `herbs-spices` | 19 | Saffron, shilajit, whole spices, herbal powders |
| `oils` | 15 | Cold-pressed pure oils |
| `snacks-seeds` | 13 | Makhana, roasted chana, chia, pumpkin, sunflower seeds |
| `bundles` | 13 | 9 older bundles updated + 4 deals |
| **`celebration-boxes`** | **8** | **Newly created and published (`bid-box-*`)** |
| `essentials` | 5 | Gur, desi honey, shakkar |
| `gift-boxes` | 2 | Curated gift boxes |
| **Total** | **97** | **All 97 compiled website seeds are live** |

---

## 3. The 8 Newly Published Celebration Bid Boxes

All 8 celebration / bid boxes have been successfully created in Firestore and published:

1. `bid-box-umrah-tabarruk` — Umrah & Tabarruk Celebration Box (Priced variants: 7)
2. `bid-box-luxury-tin` — Luxury Tin Bid Box (Priced variants: 7)
3. `bid-box-pyramid-favor` — Pyramid Favor Box (Priced variants: 7)
4. `bid-box-card-nikkah` — Nikkah Bid Card (Priced variants: 7)
5. `bid-box-jute-pouch` — Rustic Jute Favor Pouch (Priced variants: 7)
6. `bid-box-sweet-nikkah` — Sweet Nikkah Bid Box (Priced variants: 7)
7. `bid-box-birth-announcement` — Birth Announcement Celebration Box (Priced variants: 7)
8. `bid-box-acrylic-royal` — Royal Acrylic Bid Box (Custom quote variant)

*Note:* In storefront code, these products display the `IndicativePriceNotice` stating that prices are a guide and the team confirms the final order details.

---

## 4. The 9 Updated Older Bundles (Descriptive Names & Claim-Free Copy)

Content fields only (`name_en`, `name_ur`, `name_ar`, descriptions, contents, keywords) were updated via authorized admin transactions. Prices, options, and stock were strictly untouched:

| Product ID | New English Name | New Urdu Name |
|---|---|---|
| `deal-1` | Walnut & Pistachio Duo, 2 × 500 g | اخروٹ اور پستہ جوڑی، 2 × 500 گرام |
| `deal-2` | Almond & Cashew Duo, 2 × 500 g | بادام اور کاجو جوڑی، 2 × 500 گرام |
| `bundle-daily-grind` | Daily Snack Trio: Almonds, Cashews & Raisins, 3 × 250 g | روزانہ اسنیک تینوں: بادام، کاجو اور کشمش، 3 × 250 گرام |
| `bundle-brain-fuel` | Walnut, Almond, Chia & Pumpkin Seed Box | اخروٹ، بادام، چیا اور کدو کے بیج باکس |
| `bundle-winter-warrior` | Traditional Winter Pantry: Gond, Char Maghaz, Panjeeri & Chohara | روایتی سردیوں کی پینٹری: گوند، چار مغز، پنجیری اور چھوہارا |
| `bundle-immunity-shield` | Kalonji Oil, Ajwa Dates & Flax Seed Box | کلونجی تیل، عجوہ کھجور اور السی باکس |
| `bundle-sunrise-seeds` | Morning Seed Set: Chia, Flax, Pumpkin & Sunflower | صبح کے بیجوں کا سیٹ: چیا، السی، کدو اور سورج مکھی |
| `bundle-royal-feast` | Royal Feast: Chilgoza, Medjool Dates, Afghan Figs & Pistachios | شاہی ضیافت: چلغوزہ، میڈجول کھجور، افغانی انجیر اور پستہ |
| `bundle-ramadan-ready` | Ramadan Ready: Ajwa & Medjool Dates, Afghan Figs & Mixed Nuts | رمضان کی تیاری: عجوہ اور میڈجول کھجور، افغانی انجیر اور ملے جلے میوے |

---

## 5. Verification Commands & Evidence

- **Census Tool:** `node --env-file=.env --import tsx scripts/count-live-catalog.ts --project=allbarka-live "--database=(default)"`
- **Output:** Total 97 published, 0 drafts, 0 missing seeds.
- **Audit Logging:** Every published box and updated bundle recorded a corresponding audit record in `catalogAudits`.
