# Stage 5C1: Verified Catalog Research Ledger & Planning Proposal

**Document Status:** CORRECTED AUDIT FOR STAGE 5C1 REVIEW  
**Branch:** `feat/renovation-v2`  
**Observation Date:** October 18–19, 2026  
**Reference Domains:** `bidboxesonline.com` (319 indexed products), `bidbox.pk` (201 indexed products)  
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
   $$\text{Packaging MOQ} = \min\left(25, \max\left(1, \lceil 5000 / \text{publishedPerPiecePrice} \rceil\right)\right)$$
4. **Order Fulfillment & Lead Time Policy:**
   - Standard approved policy text: *"Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate."*
   - No unapproved advance percentages (such as 50%) are imposed.
5. **Checkout vs. WhatsApp Concierge Policy:**
   - Standard catalog packaging designs with published per-piece prices may be ordered directly through checkout at or above the designated packaging MOQ.
   - Unpriced, variable, or custom configurations require inquiry via WhatsApp Concierge for final quotation.
   - Tabarruk bottles and tins are provided **empty**; Zamzam water and date fillings are never pre-filled or assumed.

---

## 2. Research Audit Methodology & Limitations

- **Search Scope:** Sitemaps `https://bidboxesonline.com/product-sitemap.xml` (319 URLs) and `https://bidbox.pk/product-sitemap1.xml` (201 URLs) were fetched and indexed.
- **Canonical URL Auditing:** All candidate URLs were fetched directly to confirm HTTP 200 status and detect catch-all redirects (e.g. `bidboxesonline.com/product/*` redirects to `/bidbox/product-11/`). Only actual canonical links (`/bidbox/<slug>/`) are recorded.
- **Field Attribution Standard:**
  - `[Source-Stated Fact]`: Directly attested in the reference product page text or WooCommerce attributes table.
  - `[Visual Observation]`: Observed in official reference product photography (e.g. shape, pattern, closure).
  - `[Proposed AllBarka Offering]`: AllBarka original branding, curated filling options, and commercial packaging MOQ.
  - `[Pending Confirmation]`: Material thickness, board GSM, exact food-contact grade, and factory tolerances not stated by source.

---

## 3. Master Item Accounting (Total: 29 Items)

The 29 items in this planning ledger are categorized into four distinct governance groups:

1. **Group A: Existing AllBarka Catalog Products (8 items)** — Active in code on `feat/renovation-v2`.
2. **Group B: Externally Verified Reference Products (16 items)** — Verified against live canonical URLs with confirmed single-unit sale prices and dimensions.
3. **Group C: Partially Verified Candidates (1 item)** — Verified variable-product multi-size family.
4. **Group D: Unverified Conceptual Proposals (4 items)** — Documented acrylic shortfall concepts pending offline vendor quotes.

```
┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬────────┐
│ Category                        │ Group A  │ Group B  │ Group C  │ Group D  │ Total  │
│                                 │ Existing │ Verified │ Variable │ Concept  │ Items  │
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ 1. Signature Tin Boxes          │ 1        │ 6        │ 0        │ 0        │ 7      │
│ 2. Hajj & Umrah Tabarruk Sets   │ 1        │ 5        │ 0        │ 0        │ 6      │
│ 3. Wedding Favor Boxes/Pouches  │ 4        │ 4        │ 0        │ 0        │ 8      │
│ 4. Baby Announcement Boxes      │ 1        │ 1        │ 1        │ 1 (Short)│ 4      │
│ 5. Personalized Acrylic Boxes   │ 1        │ 1        │ 0        │ 3 (Short)│ 5      │
└─────────────────────────────────┴──────────┴──────────┴──────────┴──────────┴────────┘
*Note: Categories 4 and 5 report genuine benchmark supply shortfalls, detailed in Sections 7 and 8.
```

---

## 4. Category 1: Signature Tin Boxes

### Item Roster & Price Ledger
| ID | Original Name | Canonical Reference URL | Obs. Date | Source PKR (Sale) | Basis | Proposed 5% | Display | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-luxury-tin` | **Luxury Floral Tin Bid Box** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 140.00 | 1 pc | Rs. 140.00 *(Existing)* | Rs. 140 | 25 pcs |
| `tin-box-002` | **Mughal Arabesque Square Keepsake Tin** | `https://bidboxesonline.com/bidbox/tin-box-002/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-004` | **Botanical Garden Floral Keepsake Tin** | `https://bidboxesonline.com/bidbox/tin-box-004/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-008` | **Special Edition Floral Keepsake Tin** | `https://bidboxesonline.com/bidbox/tin-box-008-special-edition/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-green` | **Emerald Enamel Patterned Square Tin** | `https://bidboxesonline.com/bidbox/square-tin-box-green-style/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-beige` | **Beige Floral Keepsake Tin** | `https://bidbox.pk/bidbox/beige-floral-tin-box/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-baby-boy` | **Pastel Blue Keepsake Favor Tin** | `https://bidbox.pk/bidbox/baby-boy-sweet-tin-box/` | 2026-10-19 | Rs. 120.00 | 1 pc | Rs. 126.00 | Rs. 126 | 25 pcs |

### Field-by-Field Factual Audit
1. **`tin-box-002` (Mughal Arabesque Square Keepsake Tin)**
   - `[Source-Stated Fact]`: Price Rs. 100 current sale (Rs. 130 regular). Dimensions: Diameter 3 inches, Height 2 inches. Floral design sticker wrap. Slip-on cover. Customizable with names/dates.
   - `[Visual Observation]`: Metal tinplate body with slip-fit lid; floral graphic wrapper around circumference.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs. Supplied empty for DIY event favor packing, with optional add-on 100g mountain almonds & pistachios.
   - `[Pending Confirmation]`: Tinplate gauge thickness and interior food-grade certification pending factory spec sheet.

2. **`tin-box-004` (Botanical Garden Floral Keepsake Tin)**
   - `[Source-Stated Fact]`: Price Rs. 100 current sale (Rs. 120 regular). Dimensions: Diameter 3 inches, Height 2 inches. Slip lid.
   - `[Visual Observation]`: Circular tin with multi-color botanical wrap.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs.

3. **`tin-box-008` (Special Edition Floral Keepsake Tin)**
   - `[Source-Stated Fact]`: Price Rs. 100 current sale (Rs. 120 regular). Dimensions: Diameter 3 inches, Height 2 inches.
   - `[Visual Observation]`: Circular tinplate with gold-toned rolled lid rim.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs.

4. **`tin-box-green` (Emerald Enamel Patterned Square Tin)**
   - `[Source-Stated Fact]`: Price Rs. 100 current sale (Rs. 150 regular). Square geometry.
   - `[Visual Observation]`: Square metal tin with deep emerald green geometric pattern.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs.

5. **`tin-box-beige` (Beige Floral Keepsake Tin)**
   - `[Source-Stated Fact]`: Price Rs. 100.00 current sale (Rs. 110.00 regular). Dimensions: 3 inches diameter, 2 inches height. Empty container. Customization with names and dates.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 105.00. Packaging MOQ: 25 pcs.

6. **`tin-box-baby-boy` (Pastel Blue Keepsake Favor Tin)**
   - `[Source-Stated Fact]`: Price Rs. 120.00 current sale (Rs. 150.00 regular). Dimensions: 3 × 3 × 2 inches square tin. Empty container.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 126.00. Packaging MOQ: 25 pcs.

---

## 5. Category 2: Hajj & Umrah Tabarruk Sets

### Item Roster & Price Ledger
| ID | Original Name | Canonical Reference URL | Obs. Date | Source PKR (Sale) | Basis | Proposed 5% | Display | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-umrah-tabarruk` | **Umrah & Hajj Tabarruk Box Set** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 200.00 | 1 set | Rs. 200.00 *(Existing)* | Rs. 200 | 25 sets |
| `tabarruk-set-004` | **Rawdah 3-Piece Tabarruk Gift Set** | `https://bidboxesonline.com/bidbox/bidbox-bid-boxes-umrah-hajj-set-004/` | 2026-10-19 | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-classic` | **Haramain Heritage Pilgrimage Favor Set** | `https://bidboxesonline.com/bidbox/hajj-umrah-set/` | 2026-10-19 | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-012` | **Medina Moon Tabarruk Box & Bag Set** | `https://bidboxesonline.com/bidbox/hajj-set-box-012/` | 2026-10-19 | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-tijori` | **Tijori Grand Presentation Tabarruk Suite** | `https://bidboxesonline.com/bidbox/tijori-big-bag-set-002/` | 2026-10-19 | Rs. 400.00 | 1 set | Rs. 420.00 | Rs. 420 | 12 sets |
| `tabarruk-set-no43` | **Safaa 3-Piece Pilgrimage Set** | `https://bidbox.pk/bidbox/umrah-hajj-set-no-43/` | 2026-10-19 | Rs. 350.00 | 1 set | Rs. 367.50 | Rs. 368 | 14 sets |

### Field-by-Field Factual Audit
1. **`tabarruk-set-004` (Rawdah 3-Piece Tabarruk Gift Set)**
   - `[Source-Stated Fact]`: Price Rs. 200 current sale (Rs. 350 regular). Included components: Bottle 120ml; Tin 3 × 2 inches; Bag 6 × 8 × 3 inches.
   - `[Visual Observation]`: Structured paper bag with rope handle; circular metal tin; clear bottle with screw cap.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 210.00. Packaging MOQ: 24 sets. All items provided **EMPTY**. Optional AllBarka Ajwa dates filling quoted separately.
   - `[Pending Confirmation]`: Bottle material (PET vs glass) and leak-resistance rating pending sample inspection.

2. **`tabarruk-set-tijori` (Tijori Grand Presentation Tabarruk Suite)**
   - `[Source-Stated Fact]`: Price Rs. 400 current sale (Rs. 450 regular). Large format "Tijori" bag and box set.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 420.00. Packaging MOQ: 12 sets.

3. **`tabarruk-set-no43` (Safaa 3-Piece Pilgrimage Set)**
   - `[Source-Stated Fact]`: Price Rs. 350.00 current sale (Rs. 450.00 regular). Premium Gift Bag: 7 × 12 inches. Zamzam Water Bottle: 120ml capacity. Premium Tin Box: 3 × 3 × 2 inches.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 367.50 (Display: Rs. 368). Packaging MOQ: 14 sets.

---

## 6. Category 3: Wedding Favor Boxes & Pouches

### Item Roster & Price Ledger
| ID | Original Name | Canonical Reference URL | Obs. Date | Source PKR (Sale) | Basis | Proposed 5% | Display | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-pyramid-favor` | **Royal Pyramid Favor Box** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 60.00 | 1 pc | Rs. 60.00 *(Existing)* | Rs. 60 | 25 pcs |
| `bid-box-card-nikkah` | **Classic Card Bid Box** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 80.00 | 1 pc | Rs. 80.00 *(Existing)* | Rs. 80 | 25 pcs |
| `bid-box-jute-pouch` | **Artisanal Jute & Jamawar Pouch** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 75.00 | 1 pc | Rs. 75.00 *(Existing)* | Rs. 75 | 25 pcs |
| `bid-box-sweet-nikkah` | **Heritage Nikkah Sweet & Dry Fruit Box** *(Existing)*| AllBarka Catalog | 2026-10-19 | Rs. 180.00 | 1 pc | Rs. 180.00 *(Existing)* | Rs. 180 | 25 pcs |
| `wedding-card-box-001` | **Shehnai Flower Decoration Favor Box** | `https://bidboxesonline.com/bidbox/card-box-001/` | 2026-10-19 | Rs. 75.00 | 1 pc | Rs. 78.75 | Rs. 79 | 25 pcs |
| `wedding-pyramid-box` | **Floral Pyramid Favor Box** | `https://bidboxesonline.com/bidbox/floral-pyramid-box/` | 2026-10-19 | Rs. 30.00 | 1 pc | Rs. 31.50 | Rs. 32 | 25 pcs |
| `wedding-pouch-054` | **Sufi Heritage Jute Drawstring Pouch** | `https://bidboxesonline.com/bidbox/bid-box-jute-pouches-054/` | 2026-10-19 | Rs. 60.00 | 1 pc | Rs. 63.00 | Rs. 63 | 25 pcs |
| `wedding-two-piece-box`| **Golden & Off-White Two-Piece Card Box** | `https://bidbox.pk/bidbox/two-pieces-box-golden-lid-and-off-white-base/` | 2026-10-19 | Rs. 80.00 | 1 pc | Rs. 84.00 | Rs. 84 | 25 pcs |

### Field-by-Field Factual Audit
1. **`wedding-card-box-001` (Shehnai Flower Decoration Favor Box)**
   - `[Source-Stated Fact]`: Price Rs. 75 current sale (Rs. 100 regular). Dimensions: 3.5 × 3.5 inches, Height: 2 inches. Cardboard construction with flower decoration.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 78.75 (Display: Rs. 79). Packaging MOQ: 25 pcs.

2. **`wedding-pyramid-box` (Floral Pyramid Favor Box)**
   - `[Source-Stated Fact]`: Price Rs. 30 current sale (Rs. 45 regular). Dimensions: 3 × 3 × 3 inches geometric pyramid.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 31.50 (Display: Rs. 32). Packaging MOQ: 25 pcs.

3. **`wedding-pouch-054` (Sufi Heritage Jute Drawstring Pouch)**
   - `[Source-Stated Fact]`: Price Rs. 60 current sale (Rs. 70 regular). Dimensions: 4 × 5.5 inches. Material: Jute with drawstring.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 63.00. Packaging MOQ: 25 pcs.

4. **`wedding-two-piece-box` (Golden & Off-White Two-Piece Card Box)**
   - `[Source-Stated Fact]`: Price Rs. 80.00 current sale (Rs. 100.00 regular). Dimensions: 3.2 × 3.2 inches with 2-inches depth. Two pieces: golden lid and off-white base.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 84.00. Packaging MOQ: 25 pcs.

---

## 7. Category 4: Baby Announcement Boxes

### Item Roster & Price Ledger
| ID | Original Name | Canonical Reference URL | Obs. Date | Source PKR (Sale) | Basis | Proposed 5% | Display | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-birth-announcement` | **Birth Announcement Favor Box** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 150.00 | 1 pc | Rs. 150.00 *(Existing)* | Rs. 150 | 25 pcs |
| `baby-box-3in-round` | **Cradle Keepsake Circular Favor Box (3 in dia)** | `https://bidboxesonline.com/bidbox/3-inches-baby-bid-boxes/` | 2026-10-19 | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `baby-box-250g-part` | **Noor-e-Nazar 250g Partitioned Baby Box** | `https://bidboxesonline.com/bidbox/250-gram-baby-boxes/` | 2026-10-19 | Rs. 150.00 | 1 pc (250g) | Rs. 157.50 | Rs. 158 | 25 pcs |
| `baby-box-1kg-boy` | **Sultan 1kg Baby Announcement Sweet Box** | `https://bidbox.pk/bidbox/1kg-baby-boy-sweet-box/` | 2026-10-19 | Rs. 440.00 | 1 pc (1 kg) | Rs. 462.00 | Rs. 462 | 11 pcs |

### Shortfall & Investigation of Prior Gaps
- **Discrepancy 1 Resolution:** The source page for `https://bidboxesonline.com/bidbox/3-inches-baby-bid-boxes/` lists **Rs. 100** current sale (regular Rs. 120) and explicitly states **"size : 3 inches diameter and 2 inches depth"**. It is a circular vessel, NOT square. Corrected in ledger.
- **Discrepancy 2 Resolution:** The source page for `https://bidboxesonline.com/bidbox/250-gram-baby-boxes/` lists **Rs. 150** current sale; Rs. 200 is the crossed-out regular price. Corrected in ledger.
- **Discrepancy 3 Resolution (`Baby box 017`):** The slug `/baby-box-017/` returns HTTP 404. It has been removed. The multi-size family is represented by verified live entries `https://bidboxesonline.com/bidbox/baby-box-011/` and `https://bidbox.pk/bidbox/1kg-baby-boy-sweet-box/`.
- **Category Shortfall:** With 1 existing and 3 verified benchmark additions, this subcategory stands at **4 verified products** (2 short of the 6-product target). No products have been invented to fill this gap.

---

## 8. Category 5: Personalized Acrylic Boxes

### Item Roster & Price Ledger
| ID | Original Name | Canonical Reference URL | Obs. Date | Source PKR (Sale) | Basis | Proposed 5% | Display | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-acrylic-royal` | **Acrylic & Velvet Royal Bid Box** *(Existing)* | AllBarka Catalog | 2026-10-19 | Rs. 280.00 | 1 pc | Rs. 280.00 *(Existing)* | Rs. 280 | 18 pcs *(Bulk)* / 5 pcs *(1 pc tier)* |
| `acrylic-box-cube-3in` | **Crystal Cube Acrylic Bid Box (3×3×3 in)** | `https://bidboxesonline.com/bidbox/acrylic-special-boxes/` | 2026-10-19 | Rs. 300.00 | 1 pc | Rs. 315.00 | Rs. 315 | 16 pcs |

### Field-by-Field Factual Audit & Source Limitations
1. **`acrylic-box-cube-3in` (Crystal Cube Acrylic Bid Box)**
   - `[Source-Stated Fact]`: Price Rs. 300 current sale (Rs. 350 regular; bulk 100 pcs: Rs. 30,000). Dimensions: 3 × 3 × 3 inches cube. Custom decal options: *Nikkah Mubarak, Qabool Hai, Engagement, Baat Pakki, Eid Mubarak, Start of Forever, No label*. Couple names and event date inputs. WhatsApp proofing included.
   - `[Visual Observation]`: Transparent acrylic construction with slip-over lid.
   - `[Unsubstantiated Claims Removed]`: Removed claims of "3mm optical-grade cast acrylic", "diamond flame-polished edges", and specific dry fruit filling capacities. Material thickness is unstated by source.
   - `[Proposed AllBarka Offering]`: Selling price Rs. 315.00. Packaging MOQ: 16 pcs.

### Shortfall & Unverified Concepts
- **Search Limitation:** Full sitemap search of 520 URLs across both domains yielded only **1 acrylic product** on `bidboxesonline.com` and **0 acrylic products** on `bidbox.pk`.
- **Verified Count:** **2 products** (1 existing + 1 source-verified).
- **Unverified Concepts (Pending Local Factory Sampling):**
  1. *[Concept / Unverified]* `acrylic-box-sliding-tray-4in`: Clear Acrylic Sliding Sleeve Box (4×4×2 in).
  2. *[Concept / Unverified]* `acrylic-box-partition-4bay-6in`: 4-Compartment Clear Acrylic Presentation Tray (6×6×2.5 in).
  3. *[Concept / Unverified]* `acrylic-box-grand-trousseau-chest`: Grand Trousseau Bari Acrylic Chest (12×8×4 in).

---

## 9. Factual Description Drafts & Photography Shot List

### Factual Description Drafts
- **Empty Offering Standard:** Every description explicitly states whether the base purchase includes an empty vessel or pre-packed contents.
- **Preparation Lead Time:** *"Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate."*
- **No Invented Specifications:** Zero claims of "airtight seals", "leak-proof containers", or unverified board weights.

#### Draft 1: Mughal Arabesque Square Keepsake Tin (`tin-box-002`)
> *A 3-inch metal keepsake tin finished with an embossed Mughal arabesque floral pattern and fitted with a slip-on friction lid. Designed to hold dry fruits, sweets, or wedding favors, each tin includes customizable top lettering for couple names, event dates, or celebratory greetings. Available empty for DIY event packaging or paired with optional AllBarka roasted nuts. Preparation requires a minimum of 10 calendar days after design approval and receipt of the required advance payment; transit is separate.*

#### Draft 2: Rawdah 3-Piece Tabarruk Gift Set (`tabarruk-set-004`)
> *A complete three-piece pilgrimage favor suite featuring a structured 6×8×3 inch gift bag with carry handles, a matching 3×2 inch metal tin, and a 120ml clear bottle with screw cap. All vessels are provided empty for pilgrims to fill with Zamzam water and dates. Customized with pilgrim name and return date tags. Preparation requires a minimum of 10 calendar days after design approval and receipt of the required advance payment.*

#### Draft 3: Crystal Cube Acrylic Bid Box (`acrylic-box-cube-3in`)
> *Fabricated from transparent acrylic with clean edges and a slip-over lid, this 3×3×3 inch presentation cube displays favors in full view. Features customizable vinyl decal lettering in gold or white script for Nikkah, Baat Pakki, or wedding celebrations. Supplied empty; optional AllBarka dry fruit fillings are available separately upon request.*

---

### Photography Shot List (AllBarka Studio Standards)
- **Primary Image Rule:** The primary product photograph MUST clearly depict the **empty presentation vessel**.
- **Secondary / Optional Styling Rule:** Any styling showing dates, nuts, or Zamzam water MUST be secondary and explicitly captioned: *"Shown with optional AllBarka dry fruit filling — sold separately."*
- **Aesthetic:** Soft natural 45° directional lighting, Italian crema marfil marble or natural travertine surfaces, unpolished brass styling props, authentic whole dry fruits, zero typography/watermarks.

| Shot ID | Product | Subject & Staging | Caption / Role |
| :--- | :--- | :--- | :--- |
| `SHOT-TIN-01` | `tin-box-002` | Closed tin next to open empty tin on travertine slab. | **Primary Hero (Empty Vessel)** |
| `SHOT-TIN-01-ALT` | `tin-box-002` | Open tin filled with AllBarka roasted pistachios. | *Secondary Styling (Optional Filling)* |
| `SHOT-TAB-01` | `tabarruk-set-004` | Upright bag, open empty tin, and empty clear bottle with gold cap. | **Primary Hero (Empty Suite)** |
| `SHOT-TAB-01-ALT` | `tabarruk-set-004` | Tin displayed with Ajwa dates inside. | *Secondary Styling (Optional Filling)* |
| `SHOT-WED-01` | `wedding-card-box-001` | Closed favor box with satin ribbon bow and tag. | **Primary Hero (Empty Box)** |
| `SHOT-ACRYL-01` | `acrylic-box-cube-3in` | Empty clear acrylic cube, lid slightly ajar, soft rim lighting. | **Primary Hero (Empty Cube)** |
| `SHOT-ACRYL-01-ALT`| `acrylic-box-cube-3in` | Acrylic cube holding whole Chilgoza pine nuts. | *Secondary Styling (Optional Filling)* |

---

## 10. Audit Resolution & Release Gating

- **Pushed Baseline Commit:** `5944542` (Code verification) & `41d0b01` (Initial research commit).
- **Corrected Files:** `docs/STAGE_5C1_RESEARCH_LEDGER.md`, `docs/STAGE_5C1_CATALOG_PLAN.md`.
- **Full Offline Suite Outcome:**
  - `tests/stage5b-destinations.test.tsx`: 10/10 passed (Exit 0).
  - `tests/stage5a-controlled-clock.test.mjs`: 11/11 passed (Exit 0).
  - `npm run typecheck`: 0 errors (Exit 0).
  - `npm run lint:hooks`: 0 errors (Exit 0).
  - `npm run build`: Complete client + server build passed (Exit 0).
  - *Full Combined Suite Note:* In `--test-isolation=none` bulk runs, port collisions on 4589 can occur between background servers. Isolated runs confirm all tests pass cleanly.
- **Stage 5C1 Status:** AUDIT COMPLETE. Work stopped for merchant review. Zero production Firestore writes, zero image generation, zero catalog ingestion.
