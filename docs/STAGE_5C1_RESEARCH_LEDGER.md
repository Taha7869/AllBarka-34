# Stage 5C1: Verified Catalog Research Ledger & Planning Proposal

**Document Status:** RECONCILED AUDIT FOR STAGE 5C1 REVIEW  
**Branch:** `feat/renovation-v2`  
**Observation Date:** October 18–19, 2026  
**Reference Domains:** `bidboxesonline.com` (319 indexed products), `bidbox.pk` (201 indexed products)  
**Structured Data Companion:** `docs/STAGE_5C1_DRAFT_CATALOG.json`  
**Brand Governance:** AllBarka Luxury Dry Fruits & Confections (Lahore, Pakistan)

---

## 1. Governance & Rules of Engagement

1. **Brand Identity:** AllBarka's core commercial identity is whole mountain-harvest dry fruits, dates, and luxury gifting. Packaging products are sold as empty keepsake presentation vessels for DIY event gifting or paired with authoritative AllBarka dry fruit/date fillings.
2. **Pricing Policy (Rule D1 & Master Implementation Prompt):**
   - **Current Applicable Selling Price:** All source benchmarks record the live applicable selling/sale price (`ins`), NOT crossed-out regular prices (`del`).
   - **One-Time 5% Markup for NEW Import Proposals:**
     $$\text{Proposed Selling Price} = \text{Verified Source Price} \times 1.05$$
   - **Precision & Display Rounding:** Decimal precision is preserved in calculations (2 decimal places); customer-facing storefront displays are rounded to nearest integer PKR.
   - **Existing Prices:** Existing AllBarka catalog prices are NEVER overwritten or compounded.
3. **Packaging Minimum Order Quantity Engine (`src/lib/packagingMoq.ts`):**
   $$\text{Packaging MOQ} = \min\left(25, \max\left(1, \lceil 5000 / \text{proposedSellingPrice} \rceil\right)\right)$$
4. **Order Fulfillment & Lead Time Policy:**
   - Standard approved policy text: *"Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate."*
   - No unapproved advance percentages (such as 50%) are imposed.
5. **Checkout vs. WhatsApp Concierge Policy:**
   - Standard catalog packaging designs with published per-piece prices may be ordered directly through checkout at or above the designated packaging MOQ.
   - Unpriced, variable, or custom configurations require inquiry via WhatsApp Concierge for final quotation.
6. **Strict Separation of Vessels, Fillings, and Water:**
   - All presentation boxes, pouches, tins, and bottles are sold **EMPTY** as standard.
   - Optional AllBarka dry fruit fillings (e.g. roasted pistachios, cashews, almonds, Ajwa dates) are quoted separately as optional add-ons.
   - Zamzam water bottles in Tabarruk sets are provided as **empty vessels** for customer-provided Zamzam water. AllBarka does not sell, pre-fill, or supply Zamzam water. Water is never captioned or implied as an AllBarka filling.

---

## 2. Research Audit Methodology & Limitations

- **Search Scope:** Sitemaps `https://bidboxesonline.com/product-sitemap.xml` (319 URLs) and `https://bidbox.pk/product-sitemap1.xml` (201 URLs) were fetched and indexed.
- **Canonical URL Auditing:** All candidate URLs were fetched directly to confirm HTTP 200 status and detect catch-all redirects (e.g. `bidboxesonline.com/product/*` redirects to `/bidbox/product-11/`). Only actual canonical links (`/bidbox/<slug>/` or numeric permalinks like `/bidbox/1422/`) are recorded.
- **Field Attribution Standard:**
  - `[Source-Stated Fact]`: Directly attested in the reference product page text, attributes table, or variation script.
  - `[Visual Observation]`: Observed in official reference product photography (e.g. shape, closure, pattern).
  - `[Proposed AllBarka Offering]`: AllBarka original branding, curated filling options, and commercial packaging MOQ.
  - `[Pending Confirmation]`: Material thickness, board GSM, exact food-contact grade, and factory tolerances not stated by source.

---

## 3. Reconciled Master Accounting (30 Roster Products + 3 Separate Concepts)

Summary counts are derived directly from individual row records in `docs/STAGE_5C1_DRAFT_CATALOG.json`. Numerical supply shortfalls are not counted as products or concepts.

The catalog items are categorized into four distinct evidence groups:
1. **Group A: Existing AllBarka Catalog Products (8 items)** — Active in code on `feat/renovation-v2`.
2. **Group B: Externally Verified Reference Products (21 items)** — Verified against live canonical URLs with confirmed single-unit sale prices and physical dimensions.
3. **Group C: Partially Verified References (1 item)** — Verified variable-product multi-size family (`baby-box-017` / `/bidbox/1422/`).
4. **Group D: Unverified Conceptual Proposals (3 items)** — Documented acrylic shortfall concepts kept strictly separate, pending local vendor quotes.

```
┌─────────────────────────────────┬──────────┬──────────┬──────────┬────────┬──────────┐
│ Category                        │ Group A  │ Group B  │ Group C  │ Roster │ Group D  │
│                                 │ Existing │ Verified │ Variable │ Total  │ Concepts │
├─────────────────────────────────┼──────────┼──────────┼──────────┼────────┼──────────┤
│ 1. Signature Tin Boxes          │ 1        │ 6        │ 0        │ 7      │ 0        │
│ 2. Hajj & Umrah Tabarruk Sets   │ 1        │ 5        │ 0        │ 6      │ 0        │
│ 3. Wedding Favor Boxes/Pouches  │ 4        │ 4        │ 0        │ 8      │ 0        │
│ 4. Baby Announcement Boxes      │ 1        │ 5        │ 1        │ 7      │ 0        │
│ 5. Personalized Acrylic Boxes   │ 1        │ 1        │ 0        │ 2      │ 3        │
├─────────────────────────────────┼──────────┼──────────┼──────────┼────────┼──────────┤
│ TOTALS                          │ 8        │ 21       │ 1        │ 30     │ 3        │
└─────────────────────────────────┴──────────┴──────────┴──────────┴────────┴──────────┘
```

### Category Threshold & Supply Gap Status
- **Signature Tin Boxes:** 7 roster products (Target 6 met: 1 existing + 6 verified references).
- **Hajj & Umrah Tabarruk Sets:** 6 roster products (Target 6 met: 1 existing + 5 verified references).
- **Wedding Favor Boxes & Pouches:** 8 roster products (Target 6 met: 4 existing + 4 verified references).
- **Baby Announcement Boxes:** 7 roster products (Target 6 met: 1 existing + 5 verified single references, plus 1 partially verified variable family).
- **Personalized Acrylic Boxes:** 2 roster products (Unresolved Gap: 4 products short of target; only 1 external reference found across 520 sitemap URLs; 3 concepts proposed separately).

---

## 4. Category 1: Signature Tin Boxes

### Item Roster & Price Ledger (7 Roster Products)
| ID | Normalized Original Name | Canonical Reference URL | Obs. Date | Source PKR (Sale) | Basis | Proposed 5% | Display | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-luxury-tin` | **Luxury Floral Tin Bid Box** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 140.00 | 1 pc | Rs. 140.00 *(Existing)* | Rs. 140 | 25 pcs |
| `tin-box-002` | **Mughal Floral Circular Keepsake Tin** | `https://bidboxesonline.com/bidbox/tin-box-002/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-004` | **Botanical Garden Circular Keepsake Tin** | `https://bidboxesonline.com/bidbox/tin-box-004/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-008` | **Special Edition Floral Circular Keepsake Tin** | `https://bidboxesonline.com/bidbox/tin-box-008-special-edition/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-green` | **Emerald Geometric Patterned Square Tin** | `https://bidboxesonline.com/bidbox/square-tin-box-green-style/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-beige` | **Beige Floral Circular Keepsake Tin** | `https://bidbox.pk/bidbox/beige-floral-tin-box/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-baby-boy` | **Pastel Blue Square Keepsake Favor Tin** | `https://bidbox.pk/bidbox/baby-boy-sweet-tin-box/` | 2026-10-19 | Rs. 120.00 | 1 pc | Rs. 126.00 | Rs. 126 | 25 pcs |

### Field-by-Field Factual Audit & Evidence Normalization
1. **`tin-box-002` (Mughal Floral Circular Keepsake Tin)**
   - `[Resolution of Contradiction]`: Renamed from "Square" to "Circular". Source explicitly documents "Diameter: 3 inches, Height: 2 inches".
   - `[Source-Stated Fact]`: Price Rs. 100 current sale (Rs. 130 regular). Dimensions: Diameter 3 inches, Height 2 inches. Body wrapped with delicate floral design sticker. Slip-on cover. Customizable top lettering for names/dates.
   - `[Visual Observation]`: Metal tinplate cylindrical container with slip-fit lid.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs. Supplied empty for DIY event favors, with optional add-on 100g roasted mountain almonds and pistachios.
   - `[Pending Confirmation]`: Tinplate gauge thickness (mm) and interior food-contact certification.

2. **`tin-box-004` (Botanical Garden Circular Keepsake Tin)**
   - `[Source-Stated Fact]`: Price Rs. 100 current sale (Rs. 120 regular). Dimensions: Diameter 3 inches, Height 2 inches. Slip lid.
   - `[Visual Observation]`: Circular tinplate cylinder with multi-color botanical wrap.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs.

3. **`tin-box-008` (Special Edition Floral Circular Keepsake Tin)**
   - `[Source-Stated Fact]`: Price Rs. 100 current sale (Rs. 120 regular). Dimensions: Diameter 3 inches, Height 2 inches.
   - `[Visual Observation]`: Circular tinplate with rolled gold-toned lid rim.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs.

4. **`tin-box-green` (Emerald Geometric Patterned Square Tin)**
   - `[Resolution of Contradiction]`: Removed unsupported "Enamel" descriptor. Source title is `square tin box green style`; it is printed tinplate, not fired enamel.
   - `[Source-Stated Fact]`: Price Rs. 100 current sale (Rs. 150 regular). Square geometry.
   - `[Visual Observation]`: Square metal tinplate with deep emerald green geometric pattern.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs.
   - `[Pending Confirmation]`: Exact edge dimensions in inches, tinplate gauge.

5. **`tin-box-beige` (Beige Floral Circular Keepsake Tin)**
   - `[Source-Stated Fact]`: Price Rs. 100.00 current sale (Rs. 110.00 regular). Dimensions: 3 inches diameter, 2 inches height. Circular tin. Customizable text.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs.

6. **`tin-box-baby-boy` (Pastel Blue Square Keepsake Favor Tin)**
   - `[Source-Stated Fact]`: Price Rs. 120.00 current sale (Rs. 150.00 regular). Dimensions: 3 × 3 × 2 inches square tin.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 126.00. Packaging MOQ: 25 pcs.

---

## 5. Category 2: Hajj & Umrah Tabarruk Sets

### Item Roster & Price Ledger (6 Roster Products)
| ID | Normalized Original Name | Canonical Reference URL | Obs. Date | Source PKR (Sale) | Basis | Proposed 5% | Display | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-umrah-tabarruk` | **Umrah & Hajj Tabarruk Box Set** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 200.00 | 1 set | Rs. 200.00 *(Existing)* | Rs. 200 | 25 sets |
| `tabarruk-set-004` | **Rawdah 3-Piece Tabarruk Gift Set** | `https://bidboxesonline.com/bidbox/bidbox-bid-boxes-umrah-hajj-set-004/` | 2026-10-19 | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-classic` | **Haramain Heritage Pilgrimage Favor Set** | `https://bidboxesonline.com/bidbox/hajj-umrah-set/` | 2026-10-19 | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-012` | **Medina Moon Tabarruk Box & Bag Set** | `https://bidboxesonline.com/bidbox/hajj-set-box-012/` | 2026-10-19 | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-tijori` | **Tijori Grand Presentation Tabarruk Suite** | `https://bidboxesonline.com/bidbox/tijori-big-bag-set-002/` | 2026-10-19 | Rs. 400.00 | 1 set | Rs. 420.00 | Rs. 420 | 12 sets |
| `tabarruk-set-no43` | **Safaa 3-Piece Pilgrimage Set** | `https://bidbox.pk/bidbox/umrah-hajj-set-no-43/` | 2026-10-19 | Rs. 350.00 | 1 set | Rs. 367.50 | Rs. 368 | 14 sets |

### Field-by-Field Factual Audit & Evidence Normalization
1. **`tabarruk-set-004` (Rawdah 3-Piece Tabarruk Gift Set)**
   - `[Source-Stated Fact]`: Price Rs. 200 current sale (Rs. 350 regular). Three included pieces: Bottle 120ml capacity; Tin 3 × 2 inches; Bag 6 × 8 × 3 inches.
   - `[Strict Separation Rule]`: Supplied **EMPTY**. The 120ml bottle is an empty vessel intended for customer-provided Zamzam water. The tin is empty; optional AllBarka Ajwa dates filling is quoted separately. AllBarka does not supply or pre-fill Zamzam water.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 210.00. Packaging MOQ: 24 sets.
   - `[Pending Confirmation]`: Bottle composition (PET vs glass), leak-resistance rating.

2. **`tabarruk-set-classic` (Haramain Heritage Pilgrimage Favor Set)**
   - `[Source-Stated Fact]`: Price Rs. 200 current sale (Rs. 350 regular). 3-piece empty pilgrimage suite.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 210.00. Packaging MOQ: 24 sets.
   - `[Pending Confirmation]`: Exact component dimension breakdown.

3. **`tabarruk-set-012` (Medina Moon Tabarruk Box & Bag Set)**
   - `[Source-Stated Fact]`: Price Rs. 200 current sale (Rs. 350 regular). Matching bag and tin with mini bottle.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 210.00. Packaging MOQ: 24 sets.

4. **`tabarruk-set-tijori` (Tijori Grand Presentation Tabarruk Suite)**
   - `[Source-Stated Fact]`: Price Rs. 400 current sale (Rs. 450 regular). Large format "Tijori" bag and box suite.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 420.00. Packaging MOQ: 12 sets.
   - `[Pending Confirmation]`: Exact edge dimensions.

5. **`tabarruk-set-no43` (Safaa 3-Piece Pilgrimage Set)**
   - `[Source-Stated Fact]`: Price Rs. 350.00 current sale (Rs. 450.00 regular). Gift Bag: 7 × 12 inches; Tin Box: 3 × 3 × 2 inches; Zamzam Bottle: 120ml capacity.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 367.50 (Display: Rs. 368). Packaging MOQ: 14 sets.

---

## 6. Category 3: Wedding Favor Boxes & Pouches

### Item Roster & Price Ledger (8 Roster Products)
| ID | Normalized Original Name | Canonical Reference URL | Obs. Date | Source PKR (Sale) | Basis | Proposed 5% | Display | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-pyramid-favor` | **Royal Pyramid Favor Box** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 60.00 | 1 pc | Rs. 60.00 *(Existing)* | Rs. 60 | 25 pcs |
| `bid-box-card-nikkah` | **Classic Card Bid Box** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 80.00 | 1 pc | Rs. 80.00 *(Existing)* | Rs. 80 | 25 pcs |
| `bid-box-jute-pouch` | **Artisanal Jute & Jamawar Pouch** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 75.00 | 1 pc | Rs. 75.00 *(Existing)* | Rs. 75 | 25 pcs |
| `bid-box-sweet-nikkah` | **Heritage Nikkah Sweet & Dry Fruit Box** *(Existing)*| AllBarka Catalog | 2026-10-19 | Rs. 180.00 | 1 pc | Rs. 180.00 *(Existing)* | Rs. 180 | 25 pcs |
| `wedding-card-box-001` | **Floral Cardstock Favor Box (3.5×3.5×2 in)** | `https://bidboxesonline.com/bidbox/card-box-001/` | 2026-10-19 | Rs. 75.00 | 1 pc | Rs. 78.75 | Rs. 79 | 25 pcs |
| `wedding-pyramid-box` | **Floral Cardstock Pyramid Favor Box (3×3×3 in)** | `https://bidboxesonline.com/bidbox/floral-pyramid-box/` | 2026-10-19 | Rs. 30.00 | 1 pc | Rs. 31.50 | Rs. 32 | 25 pcs |
| `wedding-pouch-054` | **Traditional Jute Drawstring Favor Pouch (4×5.5 in)** | `https://bidboxesonline.com/bidbox/bid-box-jute-pouches-054/` | 2026-10-19 | Rs. 60.00 | 1 pc | Rs. 63.00 | Rs. 63 | 25 pcs |
| `wedding-two-piece-box`| **Golden & Off-White Two-Piece Card Box (3.2×3.2×2 in)** | `https://bidbox.pk/bidbox/two-pieces-box-golden-lid-and-off-white-base/` | 2026-10-19 | Rs. 80.00 | 1 pc | Rs. 84.00 | Rs. 84 | 25 pcs |

### Field-by-Field Factual Audit & Evidence Normalization
1. **`wedding-card-box-001` (Floral Cardstock Favor Box 3.5×3.5×2 in)**
   - `[Resolution of Contradiction]`: Removed "Shehnai" marketing descriptor. Attested design is cardboard favor box with paper flower adornment.
   - `[Source-Stated Fact]`: Price Rs. 75 current sale (Rs. 100 regular). Dimensions: 3.5 × 3.5 inches, Height: 2 inches. Cardboard construction with flower decoration.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 78.75 (Display: Rs. 79). Packaging MOQ: 25 pcs.
   - `[Pending Confirmation]`: Cardboard GSM weight.

2. **`wedding-pyramid-box` (Floral Cardstock Pyramid Favor Box 3×3×3 in)**
   - `[Source-Stated Fact]`: Price Rs. 30 current sale (Rs. 45 regular). Dimensions: 3 × 3 × 3 inches geometric pyramid cardstock.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 31.50 (Display: Rs. 32). Packaging MOQ: 25 pcs.

3. **`wedding-pouch-054` (Traditional Jute Drawstring Favor Pouch 4×5.5 in)**
   - `[Resolution of Contradiction]`: Removed "Sufi Heritage" marketing moniker. Attested item is standard natural jute drawstring pouch.
   - `[Source-Stated Fact]`: Price Rs. 60 current sale (Rs. 70 regular). Dimensions: 4 × 5.5 inches. Material: Jute with drawstring.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 63.00. Packaging MOQ: 25 pcs.

4. **`wedding-two-piece-box` (Golden & Off-White Two-Piece Card Box 3.2×3.2×2 in)**
   - `[Source-Stated Fact]`: Price Rs. 80.00 current sale (Rs. 100.00 regular). Dimensions: 3.2 × 3.2 inches with 2-inches depth. Golden lid and off-white base.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 84.00. Packaging MOQ: 25 pcs.

---

## 7. Category 4: Baby Announcement Boxes

### Item Roster & Price Ledger (7 Roster Products)
| ID | Normalized Original Name | Canonical Reference URL | Obs. Date | Source PKR (Sale) | Basis | Proposed 5% | Display | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-birth-announcement` | **Birth Announcement Favor Box** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 150.00 | 1 pc | Rs. 150.00 *(Existing)* | Rs. 150 | 25 pcs |
| `baby-box-3in-round` | **Cradle Keepsake Circular Favor Box (3 in dia × 2 in depth)** | `https://bidboxesonline.com/bidbox/3-inches-baby-bid-boxes/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `baby-box-250g-part` | **Compact 250g Card Baby Announcement Box** | `https://bidboxesonline.com/bidbox/250-gram-baby-boxes/` | 2026-10-19 | Rs. 150.00 | 1 pc (250g) | Rs. 157.50 | Rs. 158 | 25 pcs |
| `baby-box-half-kg` | **Half Kg Square Baby Announcement Box (6×6×2 in)** | `https://bidbox.pk/bidbox/half-kg-birth-announcement-box/` | 2026-10-19 | Rs. 260.00 | 1 pc (500g) | Rs. 273.00 | Rs. 273 | 19 pcs |
| `baby-box-girl-7x5` | **Baby Girl Floral Announcement Sweet Box (7×5×2 in)** | `https://bidbox.pk/bidbox/special-sweet-box-for-baby-girl-announcement/` | 2026-10-19 | Rs. 380.00 | 1 pc | Rs. 399.00 | Rs. 399 | 13 pcs |
| `baby-box-1kg-boy` | **Baby Boy 1kg Announcement Sweet Box (9×7×2 in)** | `https://bidbox.pk/bidbox/1kg-baby-boy-sweet-box/` | 2026-10-19 | Rs. 440.00 | 1 pc (1 kg) | Rs. 462.00 | Rs. 462 | 11 pcs |
| `baby-box-017` | **Multi-Size Baby Announcement Box Family** *(Variable)* | `https://bidboxesonline.com/bidbox/1422/` | 2026-10-19 | Rs. 150–450 | Variable | Rs. 158–473 | Rs. 158–473 | 11–25 pcs |

### Field-by-Field Factual Audit & Evidence Normalization
1. **`baby-box-3in-round` (Cradle Keepsake Circular Favor Box 3 in dia × 2 in depth)**
   - `[Source-Stated Fact]`: Price Rs. 100 current sale (Rs. 120 regular). Dimensions: 3 inches diameter and 2 inches depth (circular vessel).
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs.

2. **`baby-box-250g-part` (Compact 250g Card Baby Announcement Box)**
   - `[Resolution of Contradiction]`: Removed "Partitioned" from name as divider inserts are optional/unstated by source.
   - `[Source-Stated Fact]`: Price Rs. 150 current sale (Rs. 200 regular). Capacity: 250g sweets.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 157.50 (Display: Rs. 158). Packaging MOQ: 25 pcs.

3. **`baby-box-half-kg` (Half Kg Square Baby Announcement Box 6×6×2 in)**
   - `[Source-Stated Fact]`: Verified live at `https://bidbox.pk/bidbox/half-kg-birth-announcement-box/`. Price Rs. 260.00 current sale (Rs. 280.00 regular). Dimensions: 6 × 6 inches with 2-inches depth. Personalize with names/dates.
   - `[Visual Observation]`: Rigid square card box with pastel motif.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 273.00. Packaging MOQ: 19 pcs ($\lceil 5000 / 273 \rceil = 19$).

4. **`baby-box-girl-7x5` (Baby Girl Floral Announcement Sweet Box 7×5×2 in)**
   - `[Source-Stated Fact]`: Verified live at `https://bidbox.pk/bidbox/special-sweet-box-for-baby-girl-announcement/`. Price Rs. 380.00. Dimensions: 7 × 5 × 2 inches rectangular format. Personalize with names/dates.
   - `[Visual Observation]`: Rectangular rigid card box, baby girl pastel pink colorway with floral graphic detailing.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 399.00. Packaging MOQ: 13 pcs ($\lceil 5000 / 399 \rceil = 13$).

5. **`baby-box-1kg-boy` (Baby Boy 1kg Announcement Sweet Box 9×7×2 in)**
   - `[Source-Stated Fact]`: Verified live at `https://bidbox.pk/bidbox/1kg-baby-boy-sweet-box/`. Price Rs. 440.00 current sale (Rs. 500.00 regular). Dimensions: 9 × 7 × 2 inches rectangular format.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 462.00. Packaging MOQ: 11 pcs ($\lceil 5000 / 462 \rceil = 11$).

6. **`baby-box-017` (Multi-Size Baby Announcement Box Family)**
   - `[Live Canonical Verification]`: Verified live at `https://bidboxesonline.com/bidbox/1422/`. The page is active and dispels the 404 assumption caused by a guessed slug.
   - `[Source Variation Breakdown]`:
     - 250g tier: Rs. 150 sale / Rs. 200 regular $\to$ Proposed Rs. 157.50 (Display: Rs. 158), MOQ: 25
     - Half kg tier: Rs. 250 sale / Rs. 350 regular $\to$ Proposed Rs. 262.50 (Display: Rs. 263), MOQ: 20
     - 1 kg tier: Rs. 350 sale / Rs. 400 regular $\to$ Proposed Rs. 367.50 (Display: Rs. 368), MOQ: 14
     - 2 kg tier: Rs. 450 sale / Rs. 500 regular $\to$ Proposed Rs. 472.50 (Display: Rs. 473), MOQ: 11
   - `[Status]`: Group C (Partially Verified Variable Reference). Minimum order of 20 boxes across sizes required by source. Physical dimensions per tier pending.

---

## 8. Category 5: Personalized Acrylic Boxes

### Item Roster & Price Ledger (2 Roster Products)
| ID | Normalized Original Name | Canonical Reference URL | Obs. Date | Source PKR (Sale) | Basis | Proposed 5% | Display | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-acrylic-royal` | **Acrylic & Velvet Royal Bid Box** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 280.00 | 1 pc | Rs. 280.00 *(Existing)* | Rs. 280 | 18 pcs *(Bulk)* / 5 pcs *(1 pc)* |
| `acrylic-box-cube-3in` | **Clear Acrylic Presentation Cube (3×3×3 in)** | `https://bidboxesonline.com/bidbox/acrylic-special-boxes/` | 2026-10-19 | Rs. 300.00 | 1 pc | Rs. 315.00 | Rs. 315 | 16 pcs |

### Field-by-Field Factual Audit & Evidence Normalization
1. **`acrylic-box-cube-3in` (Clear Acrylic Presentation Cube 3×3×3 in)**
   - `[Resolution of Contradiction]`: Removed "Crystal Cube" marketing label. Purged unsubstantiated claims of 3mm optical-grade thickness, flame-polished edges, and specific nut capacities.
   - `[Source-Stated Fact]`: Price Rs. 300 current sale (Rs. 350 regular; bulk 100 pcs: Rs. 30,000). Dimensions: 3 × 3 × 3 inches cube. Custom decal lettering: *Nikkah Mubarak, Qabool Hai, Engagement, Baat Pakki, Eid Mubarak, Start of Forever, No label*. Couple names and event date inputs. WhatsApp proofing included.
   - `[Visual Observation]`: Transparent acrylic construction with slip-over lid.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 315.00. Packaging MOQ: 16 pcs.
   - `[Pending Confirmation]`: Exact sheet wall thickness in mm.

### Unresolved Acrylic Supply Gap & Unverified Concepts (3 Items)
Across 520 indexed sitemap URLs, only **1 acrylic box product** was found across both supplier catalogs. Category 5 therefore reports an **unresolved supply gap of 4 products** against the 6-product target.

The following 3 conceptual proposals are kept strictly separate from the verified roster and are pending local vendor sampling:
1. *[Concept / Unverified]* `acrylic-box-sliding-tray-4in`: Clear Acrylic Sliding Sleeve Box (4×4×2 in).
2. *[Concept / Unverified]* `acrylic-box-partition-4bay-6in`: 4-Compartment Clear Acrylic Presentation Tray (6×6×2.5 in).
3. *[Concept / Unverified]* `acrylic-box-grand-trousseau-chest`: Grand Trousseau Bari Acrylic Chest (12×8×4 in).

---

## 9. Factual Description Drafts & Studio Photography Shot List

### Factual Description Drafts
- **Empty Vessel Rule:** Every description explicitly states that the base vessel is provided empty.
- **Preparation Lead Time:** *"Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate."*
- **No Invented Specifications:** No claims of "airtight seals", "cast optical acrylic", or unverified board weights.

#### Draft 1: Mughal Floral Circular Keepsake Tin (`tin-box-002`)
> *A 3-inch circular metal keepsake tin with a floral Mughal arabesque patterned wrapper and slip-on friction lid. Designed to hold dry fruits, sweets, or wedding favors, each tin includes customizable top lettering for couple names, event dates, or celebratory greetings. Available empty for DIY event packaging or paired with optional AllBarka roasted nuts. Preparation requires a minimum of 10 calendar days after design approval and receipt of the required advance payment; courier transit time is separate.*

#### Draft 2: Rawdah 3-Piece Tabarruk Gift Set (`tabarruk-set-004`)
> *A complete three-piece pilgrimage favor suite featuring a structured 6×8×3 inch gift bag with carry handles, a matching 3×2 inch metal tin, and a 120ml clear bottle with screw cap. All vessels are provided empty. The bottle is designed as an empty presentation container for customer-provided Zamzam water (AllBarka does not supply or pre-fill water). Tins are supplied empty; optional AllBarka Ajwa dates filling is available separately upon request. Customized with pilgrim name and return date tags. Preparation requires a minimum of 10 calendar days after design approval and receipt of the required advance payment; courier transit time is separate.*

#### Draft 3: Clear Acrylic Presentation Cube (`acrylic-box-cube-3in`)
> *Fabricated from transparent acrylic with clean square edges and a slip-over lid, this 3×3×3 inch presentation cube displays favors in full view. Features customizable decal lettering for Nikkah, Baat Pakki, or wedding celebrations, with WhatsApp proofing included. Supplied empty; optional AllBarka dry fruit fillings are available separately upon request. Preparation requires a minimum of 10 calendar days after design approval and receipt of the required advance payment; transit is separate.*

---

### Photography Shot List (AllBarka Studio Standards)
- **Primary Image Rule:** The primary hero photograph for every product MUST clearly depict the **empty presentation vessel**.
- **Secondary / Optional Styling Rule:** Any styling showing dry fruits, nuts, or dates MUST be secondary and explicitly captioned: *"Shown with optional AllBarka dry fruit filling — sold separately."*
- **Strict Water Rule:** Never caption water as an AllBarka filling or imply AllBarka supplies Zamzam water.
- **Aesthetic:** Soft natural 45° directional lighting, Italian crema marfil marble or natural travertine surfaces, authentic dry fruit props, zero typography/watermarks.

| Shot ID | Product | Subject & Staging | Role / Caption |
| :--- | :--- | :--- | :--- |
| `SHOT-TIN-01` | `tin-box-002` | Closed circular tin next to open empty tin on travertine slab. | **Primary Hero (Empty Vessel)** |
| `SHOT-TIN-01-ALT` | `tin-box-002` | Open circular tin styled with AllBarka roasted pistachios. | *Secondary Styling (Optional AllBarka dry fruit filling — sold separately)* |
| `SHOT-TAB-01` | `tabarruk-set-004` | Upright empty bag, open empty tin, and empty clear bottle with gold cap. | **Primary Hero (Empty Presentation Suite)** |
| `SHOT-TAB-01-ALT` | `tabarruk-set-004` | Tin displayed with Ajwa dates inside; empty water bottle beside it. | *Secondary Styling (Shown with optional AllBarka Ajwa dates — sold separately; water bottle provided empty for customer's own water)* |
| `SHOT-WED-01` | `wedding-card-box-001` | Closed favor box with flower decoration and tag on stone surface. | **Primary Hero (Empty Box)** |
| `SHOT-BABY-01` | `baby-box-half-kg` | Open empty 6×6×2 inch pastel announcement box on neutral studio surface. | **Primary Hero (Empty Announcement Box)** |
| `SHOT-ACRYL-01` | `acrylic-box-cube-3in` | Empty clear acrylic cube, lid slightly ajar, soft natural rim lighting. | **Primary Hero (Empty Cube)** |
| `SHOT-ACRYL-01-ALT`| `acrylic-box-cube-3in` | Acrylic cube holding whole Chilgoza pine nuts. | *Secondary Styling (Shown with optional AllBarka dry fruit filling — sold separately)* |

---

## 10. Audit Verification & Execution Status

- **Pushed Baseline Commit:** `2951a7f`
- **Reconciled Deliverables:**
  - `docs/STAGE_5C1_DRAFT_CATALOG.json` (Structured, machine-readable record of all 30 roster products and 3 separate concepts)
  - `docs/STAGE_5C1_RESEARCH_LEDGER.md` (Updated factual ledger)
  - `docs/STAGE_5C1_CATALOG_PLAN.md` (Synchronized catalog plan)
- **Combined Offline Suite Status:**
  - Full combined execution under `scripts/run-all-tests.mjs` was **not established** as clean in bulk unisolated runs due to known port 4589 server collisions between background instances in `--test-isolation=none`.
  - Individual test suites and offline verification checks actually executed for this milestone:
    - `npm run build`: Exit 0 (vite build transformed 2314 modules, esbuild server.cjs bundle passed, release privacy audit passed on 84 release artifacts).
    - `tests/stage5b-destinations.test.tsx`: 10 / 10 passed (Exit 0).
    - `tests/stage5a-controlled-clock.test.mjs`: 11 / 11 passed (Exit 0).
    - `npm run typecheck`: Exit 0 (`tsc --noEmit`).
    - `npm run lint:hooks`: Exit 0 (`eslint src`).
    - Live HTTP reads for new reference candidate URLs: HTTP 200 confirmed.
- **Stage 5C1 Review Halt:** No image generation, no catalog ingestion into `src/data/products.ts`, no Firestore writes, no deployment.
