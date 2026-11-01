# AllBarka Merchant Review Worksheet & Catalog Decision Packet (M34)

> [!IMPORTANT]
> **WORKSHEET STATUS: REVIEW WORKSHEET (NOT A DIRECT WRITE PAYLOAD)**
> All values in this worksheet are unconfirmed compiled audit references and review questions for merchant decision. Placeholder `null` values and compiled reference prices cannot be written directly to Firestore until confirmed and submitted through existing revisioned admin mutation APIs (`updateAdminProduct`, `updateHamperBoxPricing`).
> In accordance with `FILLED_GIFT_PRICING.md`, filled gift and custom-hamper ingredient estimates require an authoritative 1kg rate (`kgRatePkr * grams / 1000`) and are never prorated from 250g/500g retail packs. Standalone retail custom-weight orders use `product.pricePer100g` and continue to function without a 1kg variant.

---

## 1. Provenance & Audit Foundation

This review worksheet is established from:
1. **Source Definitions:** Compiled seeds in `src/data/products.ts` and `src/lib/hamperCatalog.ts` on branch `codex/admin-catalog-foundation-20261023`.
2. **Dated Audit Evidence:**
   - **R04-CAT1 (30 Oct 2026):** Read-only inspection of live Firestore (`allbarka-live` / `(default)`): 89 stored `products` documents (pista at `revision: 2`, 88 legacy documents), 0 stored `hamperBoxes` documents, 8 missing `BID_BOX_PRODUCTS`.
   - **R04-CAT2 (30 Oct 2026):** Local fixture dry run (`r04-cat2-remediation-dry-run.json`) verifying schema validation and dynamic Rule D1 MOQ without data mutation.
3. **Packaging MOQ Policy:** Dynamic Rule D1 MOQ (`Math.min(25, Math.max(1, Math.ceil(5000 / perPiecePrice)))`) is preserved. `moqOverride` remains unset (`null`) so fixed MOQ 10 is not hardcoded.

---

## 2. Hamper Box Packaging Confirmation Table (3 Items)

| Box ID | Box Name | Slot Capacity | Compiled Seed Ref Price (PKR) | Confirmed Merchant Price (PKR) | Action on Confirmation |
|---|---|---|---|---|---|
| `box-wood` | Sheesham Artisan Wooden Chest | 4 to 6 selections | Rs. 1,800 | `[   ]` | Persist via `updateHamperBoxPricing` |
| `box-velvet` | Royal Emerald Velvet Coffer | 3 to 5 selections | Rs. 1,400 | `[   ]` | Persist via `updateHamperBoxPricing` |
| `box-tin` | Heritage Gold Keepsake Tin | 3 to 4 selections | Rs. 950 | `[   ]` | Persist via `updateHamperBoxPricing` |

*Note: In `loadAuthoritativeCatalog`, missing `hamperBoxes` documents force `active: false, price: 0`, keeping custom hampers fail-closed until merchant persistence.*

---

## 3. Celebration Box Packaging Review Table (8 Products)

| Product ID | Subcategory | Occasion | Ref Empty 1 pc (PKR) | Ref Filled Std (PKR) | Ref Filled Royal (PKR) | Compiled Order Mode | Confirmed Status | Priority |
|---|---|---|---|---|---|---|---|---|
| `bid-box-luxury-tin` | Tin | Wedding | Rs. 140 | Rs. 1,150 | Rs. 2,200 | `both` | `[ Draft / Published ]` | **Priority 1 (Active via Seed)** |
| `bid-box-jute-pouch` | Wedding | Wedding | Rs. 75 | Rs. 450 | Rs. 850 | `both` | `[ Draft / Published ]` | **Priority 1 (Active via Seed)** |
| `bid-box-sweet-nikkah` | Wedding | Wedding | Rs. 180 | Rs. 1,750 | Rs. 3,800 | `both` | `[ Draft / Published ]` | **Priority 1 (Active via Seed)** |
| `bid-box-umrah-tabarruk` | Tabarruk | Umrah | Rs. 200 | Rs. 850 | Rs. 1,650 | `both` | `[ Draft / Published ]` | Priority 2 (Held Inactive) |
| `bid-box-pyramid-favor` | Wedding | Wedding | Rs. 60 | Rs. 350 | Rs. 600 | `both` | `[ Draft / Published ]` | Priority 2 (Held Inactive) |
| `bid-box-card-nikkah` | Wedding | Wedding | Rs. 80 | Rs. 550 | Rs. 1,100 | `both` | `[ Draft / Published ]` | Priority 2 (Held Inactive) |
| `bid-box-birth-announcement` | Baby | Birth | Rs. 150 | Rs. 950 | Rs. 2,900 | `both` | `[ Draft / Published ]` | Priority 2 (Held Inactive) |
| `bid-box-acrylic-royal` | Acrylic | Wedding | Quote Only | Quote Only | Quote Only | `inquiry_quote` | `[ Draft / Published ]` | Inquiry Quote Only |

### Exact Historical Option Labels & Compiled References
- **`bid-box-luxury-tin`:** Empty Box (1 pc): Rs. 140; Empty Pack (10 pcs): Rs. 1,400; Empty Pack (25 pcs): Rs. 3,300; Empty Bulk (50 pcs): Rs. 6,250; Empty Bulk (100 pcs): Rs. 11,500; `Filled Standard (Assorted Dry Fruits)`: Rs. 1,150; `Filled Royal (VIP 4-Nut Assortment)`: Rs. 2,200.
- **`bid-box-umrah-tabarruk`:** Empty Box (1 pc): Rs. 200; Empty Pack (10 pcs): Rs. 2,000; Empty Pack (25 pcs): Rs. 4,800; Empty Bulk (50 pcs): Rs. 9,250; Empty Bulk (100 pcs): Rs. 17,000; `Filled Standard (Irani Dates, Badam, Kaju & Kishmish)`: Rs. 850; `Filled Royal (Jumbo Panjgur Dates, Iranian Pista, Mammra Badam & Honey Nuts)`: Rs. 1,650. *(Note: filled wire labels are 53 and 76 chars; allowlisted by `legacyPackagingLabels`; requires compatible n8n receiver before direct online checkout).*
- **`bid-box-pyramid-favor`:** Empty Box (1 pc): Rs. 60; Empty Pack (10 pcs): Rs. 600; Empty Pack (25 pcs): Rs. 1,375; Empty Bulk (50 pcs): Rs. 2,500; Empty Bulk (100 pcs): Rs. 4,500; `Filled Standard (Almonds, Cashews & Pistachios)`: Rs. 350; `Filled Royal (Deluxe Nut & Saffron Mix)`: Rs. 600.
- **`bid-box-card-nikkah`:** Empty Box (1 pc): Rs. 80; Empty Pack (10 pcs): Rs. 800; Empty Pack (25 pcs): Rs. 1,875; Empty Bulk (50 pcs): Rs. 3,500; Empty Bulk (100 pcs): Rs. 6,500; `Filled Standard (Dry Fruits & Confections)`: Rs. 550; `Filled Royal (Premium Nuts & Dates)`: Rs. 1,100.
- **`bid-box-jute-pouch`:** Empty Box (1 pc): Rs. 75; Empty Pack (10 pcs): Rs. 750; Empty Pack (25 pcs): Rs. 1,800; Empty Bulk (50 pcs): Rs. 3,400; Empty Bulk (100 pcs): Rs. 6,000; `Filled Standard (100g Mixed Nuts)`: Rs. 450; `Filled Royal (250g Mixed Nuts)`: Rs. 850.
- **`bid-box-sweet-nikkah`:** Empty Box (1 pc): Rs. 180; Empty Pack (10 pcs): Rs. 1,800; Empty Pack (25 pcs): Rs. 4,300; Empty Bulk (50 pcs): Rs. 8,250; Empty Bulk (100 pcs): Rs. 15,000; `Filled 500g Luxury Dry Fruit Mix`: Rs. 1,750; `Filled 1kg Luxury Dry Fruit Mix`: Rs. 3,800.
- **`bid-box-birth-announcement`:** Empty Box (1 pc): Rs. 150; Empty Pack (10 pcs): Rs. 1,500; Empty Pack (25 pcs): Rs. 3,550; Empty Bulk (50 pcs): Rs. 6,750; Empty Bulk (100 pcs): Rs. 12,500; `Filled Standard (Dry Fruits & Chocolates)`: Rs. 950; `Filled Royal (Deluxe Nuts, Panjeeri & Chocolates)`: Rs. 2,900.
- **`bid-box-acrylic-royal`:** Quote Only (`quoteOnly: true`, `orderMode: 'inquiry_quote'`); `Filled Standard`: "Custom Filled Quotation"; `Filled Royal`: "Custom VIP Quotation".

---

## 4. Priority 1kg Rate Confirmations (for Gift/Hamper Recipes)

> [!NOTE]
> Standalone retail custom orders for these products are fully functional using their existing `pricePer100g` rates. An explicit 1kg rate is required specifically for filled gift recipes and custom hamper estimation under `FILLED_GIFT_PRICING.md`.

| Product ID | Name | Pack Prices | pricePer100g | Retail Custom Status | Hamper Recipe Status | Confirmed 1kg Rate (PKR) |
|---|---|---|---|---|---|---|
| `ajwa-dates` | Ajwa Dates Madina (Khajoor) | 500g: Rs. 1,500 | Rs. 300 | Functional (300/100g) | Needs 1kg Rate | `[   ]` |
| `medjool-dates` | Medjool Dates Jumbo | 500g: Rs. 1,800 | Rs. 360 | Functional (360/100g) | Needs 1kg Rate | `[   ]` |
| `aseel-dates` | Aseel Dates (Khajoor) | 250g: Rs. 400, 500g: Rs. 750 | Rs. 150 | Functional (150/100g) | Needs 1kg Rate | `[   ]` |
| `chohara` | Yellow Dry Dates (Chohara) | 250g: Rs. 350, 500g: Rs. 650 | Rs. 130 | Functional (130/100g) | Needs 1kg Rate | `[   ]` |
| `anjeer` | Afghan Dried Figs (Anjeer) | 250g: Rs. 850, 500g: Rs. 1,600 | Rs. 320 | Functional (320/100g) | Needs 1kg Rate | `[   ]` |
| `akhrot` | Kashmiri Walnuts (Akhrot) | 250g: Rs. 900, 500g: Rs. 1,700 | Rs. 340 | Functional (340/100g) | Needs 1kg Rate | `[   ]` |
| `kaju` | Roasted Iranian Cashews (Kaju) | 250g: Rs. 950, 500g: Rs. 1,800 | Rs. 360 | Functional (360/100g) | Needs 1kg Rate | `[   ]` |
| `chilgoza` | Roasted Pine Nuts (Chilgoza) | 250g: Rs. 2,900 | Rs. 1,160 | Functional (1160/100g) | Needs 1kg Rate | `[   ]` |

---

## 5. Copy & Taxonomy Review Questions for Merchant

1. **`ajwa-dates` Copy Conflict:** Legacy copy states "Soft, melt-in-your-mouth Irani Muzafati dates...". Authentic Ajwa is harvested exclusively in Al-Madinah Al-Munawwarah, Saudi Arabia. Confirm replacing legacy text with verified Madinah provenance.
2. **`medjool-dates` Copy Conflict:** Legacy copy mentions "Jumbo Panjgur Amber dates...". Confirm replacing with verified Medjool harvest copy.
3. **`gift-boxes` vs `bundles`:** Currently, only `deal-1` and `deal-2` match category `gift-boxes`. The 5 hamper bundles (`bundle-silver-hamper`, `bundle-gold-hamper`, `bundle-platinum-hamper`, `bundle-ramadan-ready`, `corporate-gifting`) have category `bundles`. Confirm adding `collections: ['gift-boxes']` so they appear on `/category/gift-boxes`.
4. **Occasion Tagging:** All 89 Firestore products currently have empty `occasions` arrays. Confirm adding occasion tags (`wedding`, `ramadan`, `corporate`, `umrah`, `birth`) to enable occasion filters on the storefront.

---

## 6. Review Worksheet Data File

The structured review worksheet is located at:
`docs/evidence/catalog-audit/merchant-data-entry-packet.json`

When values are confirmed by the owner, approved updates must be applied through existing revisioned admin mutation APIs (`updateAdminProduct`, `updateHamperBoxPricing`).
