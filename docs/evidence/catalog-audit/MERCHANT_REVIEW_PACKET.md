# AllBarka Merchant Review & Catalog Data-Entry Packet (M34)

> [!IMPORTANT]
> **Owner Decision / Invariant:** All unconfirmed prices and recipe configurations are left strictly blank (`null`). No estimated or invented selling rates are applied. In accordance with `FILLED_GIFT_PRICING.md`, all filled gift and custom-weight calculations require an explicit 1kg rate (`kgRatePkr * grams / 1000`). Never prorate from 250g/500g packs.

## 1. Summary of Catalog Readiness Audit

A comprehensive read-only audit across all 97 projected catalog products and 3 hamper boxes identified:
- **Missing Firestore Persisted Records:**
  - **8 Celebration Boxes (`BID_BOX_PRODUCTS`):** Absent from live Firestore `products` collection. Four legacy boxes with long portion labels (`bid-box-umrah-tabarruk`, `bid-box-pyramid-favor`, `bid-box-card-nikkah`, `bid-box-birth-announcement`) are held unavailable (`active: false`) until merchant-confirmed persistence. Four remaining boxes (`bid-box-luxury-tin`, `bid-box-jute-pouch`, `bid-box-sweet-nikkah`, `bid-box-acrylic-royal`) rely on seed fallback.
  - **3 Hamper Boxes:** Absent from live Firestore `hamperBoxes` collection (`box-wood`, `box-velvet`, `box-tin`). In `loadAuthoritativeCatalog`, missing box documents force `active: false, price: 0`, which disables custom hamper checkout.
- **Kilogram Rates Required for Filled Custom Weights:**
  - 8 core dry fruit & date products currently have 250g or 500g packs but lack an explicit 1kg rate. Because `allowCustomWeight: true` is enabled, custom weight estimation returns `UNAVAILABLE_KG_RATE` until explicit 1kg rates are confirmed.
- **Copy Discrepancies:**
  - `ajwa-dates`: Conflicting mention of Iranian / Muzafati provenance in legacy copy. Authentic Ajwa is sourced from Al-Madinah Al-Munawwarah.
  - `medjool-dates`: Conflicting mention of Panjgur Amber in legacy copy.

---

## 2. Hamper Box Packaging Confirmation Table

| Box ID | Box Name | Dimensions / Slots | Seed Ref Price (PKR) | Confirmed Merchant Price (PKR) | Action on Confirmation |
|---|---|---|---|---|---|
| `box-wood` | Sheesham Artisan Wooden Chest | 4 to 6 selections | Rs. 1,800 | `[   ]` | Persist to `hamperBoxes/box-wood` |
| `box-velvet` | Royal Emerald Velvet Coffer | 3 to 5 selections | Rs. 1,400 | `[   ]` | Persist to `hamperBoxes/box-velvet` |
| `box-tin` | Heritage Gold Keepsake Tin | 3 to 4 selections | Rs. 950 | `[   ]` | Persist to `hamperBoxes/box-tin` |

---

## 3. Celebration Box Packaging Review Table (8 Products)

| Product ID | Subcategory | Occasion | Ref Empty (PKR) | Ref Filled Std (PKR) | Ref Filled Royal (PKR) | Confirmed Status |
|---|---|---|---|---|---|---|
| `bid-box-umrah-tabarruk` | Tabarruk | Umrah | Rs. 180 | Rs. 1,150 | Rs. 3,200 | `[ Draft / Published ]` |
| `bid-box-pyramid-favor` | Wedding | Wedding | Rs. 220 | Rs. 1,250 | Rs. 3,400 | `[ Draft / Published ]` |
| `bid-box-card-nikkah` | Wedding | Wedding | Rs. 160 | Rs. 1,050 | Rs. 3,100 | `[ Draft / Published ]` |
| `bid-box-birth-announcement` | Baby Arrival | Birth | Rs. 150 | Rs. 950 | Rs. 2,900 | `[ Draft / Published ]` |
| `bid-box-luxury-tin` | Wedding | Wedding | Rs. 250 | Rs. 1,350 | Rs. 3,600 | `[ Draft / Published ]` |
| `bid-box-jute-pouch` | Wedding | Wedding | Rs. 120 | Rs. 850 | Rs. 2,600 | `[ Draft / Published ]` |
| `bid-box-sweet-nikkah` | Wedding | Wedding | Rs. 140 | Rs. 980 | Rs. 2,800 | `[ Draft / Published ]` |
| `bid-box-acrylic-royal` | Luxury | Wedding | Quote Only | Quote Only | Quote Only | `[ Draft / Published ]` |

---

## 4. Priority 1kg Rate Confirmations (for Custom Weight & Hamper Recipes)

| Product ID | Name | 250g Price | 500g Price | Confirmed 1kg Rate (PKR) |
|---|---|---|---|---|
| `ajwa-dates` | Ajwa Al-Madinah Dates | - | Rs. 1,500 | `[   ]` |
| `medjool-dates` | Medjool Premium Dates | - | Rs. 1,800 | `[   ]` |
| `aseel-dates` | Aseel Dry Dates | Rs. 400 | Rs. 750 | `[   ]` |
| `chohara` | Yellow Chohara | Rs. 350 | Rs. 650 | `[   ]` |
| `afghan-figs` | Afghan Sun-Dried Figs | Rs. 850 | Rs. 1,600 | `[   ]` |
| `kashmiri-walnut` | Kashmiri Snow Walnut Kernels | Rs. 900 | Rs. 1,700 | `[   ]` |
| `roasted-cashews` | Salted Roasted Cashews W-240 | Rs. 950 | Rs. 1,800 | `[   ]` |
| `pine-nuts` | Chilgoza Roasted Pine Nuts | Rs. 2,900 | - | `[   ]` |

---

## 5. Machine-Readable Schema File

The complete, validated JSON review payload is persisted at:
`docs/evidence/catalog-audit/merchant-data-entry-packet.json`

When the owner confirms the values, the data can be directly imported via Admin Studio or applied with the local import script without manual retyping.
