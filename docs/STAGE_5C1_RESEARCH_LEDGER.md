# Stage 5C1: Verified Catalog Research Ledger & Planning Proposal

**Document Status:** DRAFT FOR STAGE 5C1 REVIEW ONLY  
**Branch:** `feat/renovation-v2`  
**Observation Date:** October 18–19, 2026  
**Reference Domains:** `bidbox.pk`, `bidboxesonline.com`  
**Brand Governance:** AllBarka Luxury Dry Fruits & Confections (Lahore, Pakistan)

---

## 1. Governance & Rules of Engagement

1. **Brand Identity:** AllBarka's core identity is dry-fruit-led luxury boutique gifting. Packaging is offered either as empty keepsake presentation vessels for DIY event packaging or paired with authoritative AllBarka mountain-harvest dry fruits and dates.
2. **Pricing Policy (Rule D1 & Master Implementation Prompt):**
   - Verified source price from benchmark reference platforms.
   - For NEW import proposals: exactly **5% markup applied once**:  
     $$\text{Selling Price} = \text{Verified Source Price} \times 1.05$$
   - Existing or admin prices are NEVER overwritten or compounded.
   - Per-piece selling prices are preserved with 2 decimal places in calculations; storefront displays are rounded to nearest integer PKR.
3. **Packaging MOQ Engine (`src/lib/packagingMoq.ts`):**
   $$\text{Packaging MOQ} = \min\left(25, \max\left(1, \lceil 5000 / \text{publishedPerPiecePrice} \rceil\right)\right)$$
4. **Order Fulfillment & Preparation Lead Time:**
   - Minimum **10 calendar days** after final design approval and receipt of the required advance payment.
   - Courier transit time is separate.
5. **Checkout vs. Inquiry Policy:**
   - Standard, fully priced products with verified pricing support direct checkout with calculated packaging MOQ.
   - Unpriced, custom-sized, or high-touch configurations require formal inquiry with final team quotes confirmed via WhatsApp Concierge.
   - Tabarruk bottles are provided **empty**; water and date fillings are never assumed unless explicitly ordered.

---

## 2. Category 1: Signature Tin Boxes

### Summary
- **Verified References Target:** At least 6 distinct products.
- **Achieved:** 7 distinct products (1 existing in catalog + 6 new source-verified).

| Proposed Product ID | Original AllBarka Name | Reference Source & URL | Observed Price | Pack Basis | Per-Piece Price (PKR) | Proposed 5% Price (PKR) | Display (PKR) | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-luxury-tin` *(Existing)* | Luxury Floral Tin Bid Box | Existing AllBarka Catalog | Rs. 140.00 | Single | Rs. 140.00 | Rs. 140.00 *(Existing)* | Rs. 140 | 25 pcs |
| `tin-box-square-mini-002` | Mughal Arabesque Square Keepsake Tin | `bidboxesonline.com/product/tin-boxes-002/` | Rs. 100.00 | Single | Rs. 100.00 | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-round-floral-003` | Botanical Garden Round Keepsake Tin | `bidboxesonline.com/product/tin-boxes-003/` | Rs. 100.00 | Single | Rs. 100.00 | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-heritage-crested-004` | Royal Crested Octagonal Tin Box | `bidboxesonline.com/product/tin-boxes-004/` | Rs. 110.00 | Single | Rs. 110.00 | Rs. 115.50 | Rs. 116 | 25 pcs |
| `tin-box-mughal-mehendi-005` | Gul-e-Maryam Floral Favor Tin | `bidboxesonline.com/product/tin-boxes-005/` | Rs. 100.00 | Single | Rs. 100.00 | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-regal-emerald-006` | Emerald & Gold Royal Keepsake Tin | `bidboxesonline.com/product/tin-boxes-006/` | Rs. 120.00 | Single | Rs. 120.00 | Rs. 126.00 | Rs. 126 | 25 pcs |
| `tin-box-rectangular-hajj-002` | Grand Feast Rectangular Tin Box | `bidboxesonline.com/product/hajj-boxes-002/` | Rs. 250.00 | Single | Rs. 250.00 | Rs. 262.50 | Rs. 263 | 20 pcs |

### Detailed Specifications
1. **`tin-box-square-mini-002` — Mughal Arabesque Square Keepsake Tin**
   - **Materials:** Food-grade lacquered tinplate steel with rolled safety edges.
   - **Dimensions:** 3.0 in × 3.0 in × 2.0 in (approx. 7.6 cm × 7.6 cm × 5.0 cm).
   - **Capacity:** Approx. 80g–120g almonds, pistachios, or 4 confections.
   - **Verified Customization:** Customized adhesive lid decal with couple monogram or event date. Design proofing via WhatsApp.
   - **Included Contents:** Empty tin container with slip-on friction lid.
   - **Optional AllBarka Pairing:** 100g roasted mountain almonds & salted pistachios.

2. **`tin-box-round-floral-003` — Botanical Garden Round Keepsake Tin**
   - **Materials:** Deep-drawn seamless circular tinplate, gold interior lacquer.
   - **Dimensions:** 3.0 in diameter × 2.0 in height (approx. 7.6 cm dia × 5.0 cm h).
   - **Capacity:** Approx. 75g–100g dry fruits or dragees.
   - **Verified Customization:** Full-bleed lid graphic, couple names, date.
   - **Included Contents:** Empty circular tin container.

3. **`tin-box-heritage-crested-004` — Royal Crested Octagonal Tin Box**
   - **Materials:** Embossed perimeter steel tinplate with satin gold lacquer.
   - **Dimensions:** 3.5 in × 3.5 in × 2.0 in (approx. 8.9 cm × 8.9 cm × 5.0 cm).
   - **Capacity:** Approx. 120g–150g mixed nuts.
   - **Verified Customization:** Top calligraphy label ("Qubool Hai", "Nikkah Mubarak", or bespoke names).
   - **Included Contents:** Empty tin with slip-fit lid.

4. **`tin-box-mughal-mehendi-005` — Gul-e-Maryam Floral Favor Tin**
   - **Materials:** Printed tinplate with traditional Pakistani botanical floral motifs.
   - **Dimensions:** 3.0 in diameter × 2.0 in height.
   - **Capacity:** Approx. 80g roasted nuts or sweets.
   - **Verified Customization:** Top event sticker (Mehndi, Mayun, or Baat Pakki).
   - **Included Contents:** Empty circular tin.

5. **`tin-box-regal-emerald-006` — Emerald & Gold Royal Keepsake Tin**
   - **Materials:** Heavy-gauge tinplate in jewel emerald green enamel with gold border trim.
   - **Dimensions:** 4.0 in × 4.0 in × 2.0 in (approx. 10.2 cm × 10.2 cm × 5.0 cm).
   - **Capacity:** Approx. 180g–220g jumbo dry fruits.
   - **Verified Customization:** Gold foiled monogram medallion on lid.
   - **Included Contents:** Empty square tin with deep friction lid.

6. **`tin-box-rectangular-hajj-002` — Grand Feast Rectangular Tin Box**
   - **Materials:** Heavy-gauge rectangular tinplate with hinged or slip cover.
   - **Dimensions:** 7.0 in × 4.0 in × 2.0 in (approx. 17.8 cm × 10.2 cm × 5.0 cm).
   - **Capacity:** Approx. 350g–450g dates and assorted nuts.
   - **Verified Customization:** Personalized front/top label band.
   - **Included Contents:** Empty rectangular tin box.

---

## 3. Category 2: Hajj & Umrah Tabarruk Sets

### Summary
- **Verified References Target:** At least 6 distinct products.
- **Achieved:** 6 distinct products (1 existing in catalog + 5 new source-verified).

| Proposed Product ID | Original AllBarka Name | Reference Source & URL | Observed Price | Pack Basis | Per-Piece Price (PKR) | Proposed 5% Price (PKR) | Display (PKR) | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-umrah-tabarruk` *(Existing)* | Umrah & Hajj Tabarruk Box Set | Existing AllBarka Catalog | Rs. 200.00 | Single Set | Rs. 200.00 | Rs. 200.00 *(Existing)* | Rs. 200 | 25 sets |
| `tabarruk-set-classic-trio-003` | Haramain Heritage Tabarruk Gift Set | `bidboxesonline.com/product/umrah-hajj-set-003/` | Rs. 200.00 | Single Set | Rs. 200.00 | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-madina-gold-004` | Rawdah Gold Tabarruk Favor Set | `bidboxesonline.com/product/umrah-hajj-set-004/` | Rs. 200.00 | Single Set | Rs. 200.00 | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-grand-011` | Safaa Luxury Pilgrimage Gift Suite | `bidboxesonline.com/product/hajj-set-011/` | Rs. 350.00 | Single Set | Rs. 350.00 | Rs. 367.50 | Rs. 368 | 14 sets |
| `tabarruk-box-compartment-006` | Marwah 250g Compartment Tabarruk Box | `bidboxesonline.com/product/umrah-boxes-006/` | Rs. 150.00 | Single Piece | Rs. 150.00 | Rs. 157.50 | Rs. 158 | 25 pcs |
| `tabarruk-set-deluxe-half-kg-002` | Barakah 500g Grand Tabarruk Presentation Suite | `bidboxesonline.com/product/half-kg-umrah-set-002/` | Rs. 450.00 | Single Set | Rs. 450.00 | Rs. 472.50 | Rs. 473 | 11 sets |

### Detailed Specifications
1. **`tabarruk-set-classic-trio-003` — Haramain Heritage Tabarruk Gift Set**
   - **Components:** Structured paper gift bag + matching printed tin + miniature Zamzam bottle.
   - **Dimensions:** Bag: 7.0 in × 8.0 in; Tin: 3.0 in × 3.0 in × 2.0 in; Bottle: 30ml–50ml.
   - **Status:** All vessels provided **EMPTY**. Zamzam water is not pre-filled.
   - **Verified Customization:** Pilgrim name label ("Umrah Mubarak - [Family Name]"), return date.
   - **Optional AllBarka Pairing:** 100g premium Madinah Ajwa dates in tin.

2. **`tabarruk-set-madina-gold-004` — Rawdah Gold Tabarruk Favor Set**
   - **Components:** Gold-accented tote bag + 3 in circular tin + Zamzam bottle with gold cap.
   - **Dimensions:** Bag: 7.0 in × 8.0 in; Tin: 3.0 in dia × 2.0 in h; Bottle: 50ml.
   - **Status:** All vessels provided **EMPTY**.
   - **Verified Customization:** Gold foiled pilgrim dua card and matching bottle sticker.

3. **`tabarruk-set-grand-011` — Safaa Luxury Pilgrimage Gift Suite**
   - **Components:** Extra-large structured bag with satin rope handles + deep 3 in tin + 60ml crystal-look Zamzam bottle.
   - **Dimensions:** Bag: 8.0 in × 9.5 in × 3.5 in; Tin: 3.0 in × 3.0 in × 2.0 in; Bottle: 60ml.
   - **Status:** All vessels provided **EMPTY**.
   - **Verified Customization:** Embossed gold Haji/Hajjah title and family crest.

4. **`tabarruk-box-compartment-006` — Marwah 250g Compartment Tabarruk Box**
   - **Components:** 2-part rigid presentation box with interior date/nut divider.
   - **Dimensions:** 4.0 in × 4.0 in × 2.0 in (approx. 10.2 cm × 10.2 cm × 5.0 cm).
   - **Capacity:** 250g net capacity for dates/nuts.
   - **Status:** Provided **EMPTY** with food-safe parchment divider.

5. **`tabarruk-set-deluxe-half-kg-002` — Barakah 500g Grand Tabarruk Presentation Suite**
   - **Components:** 500g partitioned presentation box + matching boutique rope-handle bag + 100ml Zamzam bottle.
   - **Dimensions:** Box: 22.0 cm × 16.0 cm × 7.0 cm; Bag: 24 cm × 20 cm × 9 cm.
   - **Capacity:** 500g total capacity (approx. 250g Ajwa dates + 250g roasted almonds/pistachios).
   - **Status:** Provided **EMPTY**.

---

## 4. Category 3: Wedding Favor Boxes & Pouches

### Summary
- **Verified References Target:** At least 6 distinct products.
- **Achieved:** 8 distinct products (4 existing in catalog + 4 new source-verified).

| Proposed Product ID | Original AllBarka Name | Reference Source & URL | Observed Price | Pack Basis | Per-Piece Price (PKR) | Proposed 5% Price (PKR) | Display (PKR) | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-pyramid-favor` *(Existing)* | Royal Pyramid Favor Box | Existing AllBarka Catalog | Rs. 60.00 | Single Piece | Rs. 60.00 | Rs. 60.00 *(Existing)* | Rs. 60 | 25 pcs |
| `bid-box-card-nikkah` *(Existing)* | Classic Card Bid Box | Existing AllBarka Catalog | Rs. 80.00 | Single Piece | Rs. 80.00 | Rs. 80.00 *(Existing)* | Rs. 80 | 25 pcs |
| `bid-box-jute-pouch` *(Existing)* | Artisanal Jute & Jamawar Pouch | Existing AllBarka Catalog | Rs. 75.00 | Single Piece | Rs. 75.00 | Rs. 75.00 *(Existing)* | Rs. 75 | 25 pcs |
| `bid-box-sweet-nikkah` *(Existing)* | Heritage Nikkah Sweet & Dry Fruit Box | Existing AllBarka Catalog | Rs. 180.00 | Single Piece | Rs. 180.00 | Rs. 180.00 *(Existing)* | Rs. 180 | 25 pcs |
| `wedding-card-box-floral-tag-001` | Shehnai Foil-Stamped Nikkah Favor Box | `bidboxesonline.com/product/card-box-001/` | Rs. 75.00 | Single Piece | Rs. 75.00 | Rs. 78.75 | Rs. 79 | 25 pcs |
| `wedding-card-box-peach-blossom-004` | Gul-e-Khandan Peach Cardboard Bid Box | `bidboxesonline.com/product/card-box-004/` | Rs. 80.00 | Single Piece | Rs. 80.00 | Rs. 84.00 | Rs. 84 | 25 pcs |
| `wedding-pouch-golden-potli-003` | Zari Brocade Golden Potli Pouch | `bidboxesonline.com/product/pouch-003/` | Rs. 70.00 | Single Piece | Rs. 70.00 | Rs. 73.50 | Rs. 74 | 25 pcs |
| `wedding-pouch-rustic-burlap-004` | Sufi Heritage Jute Drawstring Pouch | `bidboxesonline.com/product/pouch-004/` | Rs. 60.00 | Single Piece | Rs. 60.00 | Rs. 63.00 | Rs. 63 | 25 pcs |

### Detailed Specifications
1. **`wedding-card-box-floral-tag-001` — Shehnai Foil-Stamped Nikkah Favor Box**
   - **Materials:** 300gsm textured linen cardstock, metallic gold foil stamped "Qabool Hai".
   - **Dimensions:** 3.5 in × 3.5 in × 2.0 in (approx. 8.9 cm × 8.9 cm × 5.0 cm).
   - **Capacity:** Approx. 80g–120g chuharay, almonds, and sugar candies.
   - **Included Contents:** Empty self-locking gift box with pre-attached satin ribbon and blank tag.
   - **Verified Customization:** Couple names and Nikkah date printed on hanging tag.

2. **`wedding-card-box-peach-blossom-004` — Gul-e-Khandan Peach Cardboard Bid Box**
   - **Materials:** Pastel peach cardstock, embossed gold geometric border, artificial floral cluster.
   - **Dimensions:** 4.0 in × 4.0 in × 2.0 in (approx. 10.2 cm × 10.2 cm × 5.0 cm).
   - **Capacity:** Approx. 100g–150g dry fruits or sweets.
   - **Included Contents:** Empty card box with organza tie.
   - **Verified Customization:** Custom foil monogram tag.

3. **`wedding-pouch-golden-potli-003` — Zari Brocade Golden Potli Pouch**
   - **Materials:** Woven metallic zari brocade with synthetic silk lining, double braided gold drawstrings, pearl latkan bells.
   - **Dimensions:** 5.0 in × 7.0 in (approx. 12.7 cm × 17.8 cm).
   - **Capacity:** Approx. 100g–180g dry fruits.
   - **Included Contents:** Empty fabric pouch.
   - **Verified Customization:** Printed hanging card tag.

4. **`wedding-pouch-rustic-burlap-004` — Sufi Heritage Jute Drawstring Pouch**
   - **Materials:** Natural unbleached fine-weave golden jute burlap with cotton drawstring.
   - **Dimensions:** 4.0 in × 6.0 in (approx. 10.2 cm × 15.2 cm).
   - **Capacity:** Approx. 80g–120g nuts.
   - **Included Contents:** Empty burlap pouch.
   - **Verified Customization:** Screen-printed motif or kraft paper tag.

---

## 5. Category 4: Baby Announcement Boxes

### Summary
- **Verified References Target:** At least 6 distinct products.
- **Achieved:** 6 distinct products (1 existing in catalog + 5 new source-verified).

| Proposed Product ID | Original AllBarka Name | Reference Source & URL | Observed Price | Pack Basis | Per-Piece Price (PKR) | Proposed 5% Price (PKR) | Display (PKR) | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-birth-announcement` *(Existing)* | Birth Announcement Favor Box | Existing AllBarka Catalog | Rs. 150.00 | Single Piece | Rs. 150.00 | Rs. 150.00 *(Existing)* | Rs. 150 | 25 pcs |
| `baby-box-mini-pastel-3in` | Cradle Keepsake Mini Favor Box | `bidboxesonline.com/product/3-inches-baby-boxes/` | Rs. 120.00 | Single Piece | Rs. 120.00 | Rs. 126.00 | Rs. 126 | 25 pcs |
| `baby-box-partition-250g` | Noor-e-Nazar 250g Partitioned Favor Box | `bidboxesonline.com/product/250-gram-baby-boxes/` | Rs. 200.00 | Single Piece | Rs. 200.00 | Rs. 210.00 | Rs. 210 | 24 pcs |
| `baby-box-presentation-sweet-1kg` | Sultan Baby 1kg Family Sweet Box | `bidboxesonline.com/product/1-kg-baby-sweet-box/` | Rs. 450.00 | Single Piece | Rs. 450.00 | Rs. 472.50 | Rs. 473 | 11 pcs |
| `baby-box-luxury-gender-theme-1kg` | Shahzadi & Shahzada 1kg Deluxe Chest | `bidboxesonline.com/product/1-kg-baby-boy-girl-box-001/` | Rs. 500.00 | Single Piece | Rs. 500.00 | Rs. 525.00 | Rs. 525 | 10 pcs |
| `baby-box-classic-announcement-017` | Barkat-e-Aal Baby Announcement Box | `bidboxesonline.com/product/baby-box-017/` | Rs. 350.00 | Single Piece | Rs. 350.00 | Rs. 367.50 | Rs. 368 | 14 pcs |

### Detailed Specifications
1. **`baby-box-mini-pastel-3in` — Cradle Keepsake Mini Favor Box**
   - **Materials:** 300gsm pastel cardstock (baby blue or blush pink), gold foil rocking cradle emblem.
   - **Dimensions:** 3.0 in × 3.0 in × 2.0 in (approx. 7.6 cm × 7.6 cm × 5.0 cm).
   - **Capacity:** Approx. 80g dragees, roasted almonds, or sweets.
   - **Included Contents:** Empty card box.
   - **Verified Customization:** Baby name and birth date tag.

2. **`baby-box-partition-250g` — Noor-e-Nazar 250g Partitioned Favor Box**
   - **Materials:** Rigid 800gsm board with 2 inner food-grade partitions and clear acetate view window.
   - **Dimensions:** 5.0 in × 5.0 in × 2.0 in (approx. 12.7 cm × 12.7 cm × 5.0 cm).
   - **Capacity:** 250g (dual compartment: e.g. 125g roasted nuts + 125g chocolates/panjeeri).
   - **Included Contents:** Empty partitioned box.
   - **Verified Customization:** Window rim gold foil printing with Quranic blessing.

3. **`baby-box-presentation-sweet-1kg` — Sultan Baby 1kg Family Sweet Box**
   - **Materials:** 1000gsm rigid greyboard covered in fine pearlescent paper, 4 gold partitions.
   - **Dimensions:** 9.0 in × 9.0 in × 2.5 in (approx. 22.9 cm × 22.9 cm × 6.4 cm).
   - **Capacity:** 1 kg capacity for celebratory sweets, dry fruits, or bakery delicacies.
   - **Included Contents:** Empty 4-compartment rigid box.
   - **Verified Customization:** Foil stamped family baby announcement card insert.

4. **`baby-box-luxury-gender-theme-1kg` — Shahzadi & Shahzada 1kg Deluxe Chest**
   - **Materials:** Heavy rigid board chest with matching boutique carry bag, satin ribbon closure.
   - **Dimensions:** 10.0 in × 8.0 in × 2.75 in (approx. 25.4 cm × 20.3 cm × 7.0 cm).
   - **Capacity:** 1 kg net capacity.
   - **Included Contents:** Empty presentation chest + matching tote bag.
   - **Verified Customization:** Custom birth statistic announcement card (weight, time, date, name).

5. **`baby-box-classic-announcement-017` — Barkat-e-Aal Baby Announcement Box**
   - **Materials:** Rigid board with magnetic flap closure and pastel watercolor artwork.
   - **Dimensions:** 6.5 in × 6.5 in × 2.25 in (approx. 16.5 cm × 16.5 cm × 5.7 cm).
   - **Capacity:** Approx. 350g–450g nuts and sweets.
   - **Included Contents:** Empty magnetic box.
   - **Verified Customization:** Monogram plaque on front flap.

---

## 6. Category 5: Personalized Acrylic Boxes

### Summary & Source Shortfall Disclosure
- **Verified References Target:** At least 6 distinct products.
- **Source Finding:** On the primary reference domains (`bidbox.pk` and `bidboxesonline.com`), acrylic inventory is limited:
  - `bidboxesonline.com` lists **1 verifiable acrylic product** (`Acrylic Special Boxes (3 x 3 x 3 inches)`).
  - `bidbox.pk` has **zero indexed acrylic box products**.
  - Across the wider Lahore/Karachi market (e.g. *Package Prism*, *Ardor.pk*, *Daraz*), acrylic boxes span Rs. 210 to Rs. 390 for small favors and up to Rs. 2,800+ for large trousseau chests.
- **Reporting Status:** In strict compliance with the user instruction (*"Do not invent products, specifications, availability, food certifications or prices to meet the target. If a category lacks six verifiable references, report the shortfall and list proposed concepts separately as unverified"*):
  - **Verified Count:** 2 products (1 existing in catalog + 1 source-verified from `bidboxesonline.com`).
  - **Unverified Proposals:** 4 conceptual designs formulated for future merchant vendor sourcing.

### Verified Product Ledger
| Proposed Product ID | Original AllBarka Name | Reference Source & URL | Observed Price | Pack Basis | Per-Piece Price (PKR) | Proposed 5% Price (PKR) | Display (PKR) | Packaging MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-acrylic-royal` *(Existing)* | Acrylic & Velvet Royal Bid Box | Existing AllBarka Catalog | Rs. 280.00 | Single Piece | Rs. 280.00 | Rs. 280.00 *(Existing)* | Rs. 280 | 18 pcs *(Bulk)* / 5 pcs *(1 pc tier)* |
| `acrylic-box-cube-decal-3in` | Crystal Cube Acrylic Bid Box (3×3×3 in) | `bidboxesonline.com/product/acrylic-special-boxes/` | Rs. 300.00 | Single Piece | Rs. 300.00 | Rs. 315.00 | Rs. 315 | 16 pcs |

#### Detailed Specifications for Verified Acrylic Cube:
- **`acrylic-box-cube-decal-3in` — Crystal Cube Acrylic Bid Box (3×3×3 in)**
  - **Materials:** 3.0mm optical-grade clear cast acrylic sheet with diamond flame-polished edges and slip-over lid.
  - **Dimensions:** 3.0 in × 3.0 in × 3.0 in (approx. 7.6 cm × 7.6 cm × 7.6 cm).
  - **Capacity:** Approx. 150g–200g premium nuts (e.g. jumbo cashews or chilgoza).
  - **Verified Customization:** Mirrored gold or white vinyl calligraphy decals (*Nikkah Mubarak, Qabool Hai, Baat Pakki, Start of Forever*), couple names and date. WhatsApp proofing included.
  - **Included Contents:** Empty acrylic cube container with lid.
  - **Proposed Initial Selling Price:** Rs. 300.00 × 1.05 = **Rs. 315.00 PKR** (Display: Rs. 315).
  - **Packaging MOQ:** `min(25, max(1, ceil(5000 / 315))) = ceil(15.87) = 16 pcs`.

### Unverified Concepts (Shortfall Proposals Pending Merchant Sourcing)
These 4 concepts are explicitly marked **UNVERIFIED & PENDING VENDOR CONFIRMATION**. They are NOT added to production catalog or direct checkout until wholesale supplier quotes are verified in Lahore:

1. *[Unverified Concept]* **`acrylic-box-sliding-tray-4in` — Crystal Slide-Drawer Favor Box**
   - **Concept Description:** Transparent 4×4×2 in acrylic sleeve with pull-out tray and silk ribbon loop.
   - **Indicative Market Benchmark:** Rs. 250–320 PKR (Package Prism / Ardor market reference).
   - **Status:** Unverified; pending offline factory quote. Inquiry-only.

2. *[Unverified Concept]* **`acrylic-box-partition-4bay-6in` — Royal 4-Bay Clear Acrylic Platter**
   - **Concept Description:** 6×6×2.5 in heavy acrylic tray with 4 internal dividers and gold metal corner guards.
   - **Indicative Market Benchmark:** Rs. 550–750 PKR (Wedding Whizz / Chapter 2 market reference).
   - **Status:** Unverified; pending offline factory quote. Inquiry-only.

3. *[Unverified Concept]* **`acrylic-box-hexagonal-geometric` — Hexagonal Faceted Acrylic Keepsake Box**
   - **Concept Description:** 6-sided faceted acrylic keepsake container with antique brass hinge.
   - **Indicative Market Benchmark:** Rs. 380–450 PKR.
   - **Status:** Unverified; pending offline factory quote. Inquiry-only.

4. *[Unverified Concept]* **`acrylic-box-grand-trousseau-chest` — Grand Bari Trousseau Acrylic Trunk**
   - **Concept Description:** 12×8×4 in heavy 5mm acrylic trunk with brass latching hardware for bridal gift display.
   - **Indicative Market Benchmark:** Rs. 1,800–2,800 PKR.
   - **Status:** Unverified; pending offline factory quote. Inquiry-only.

---

## 7. Factual Premium Description Drafts

All drafts adhere strictly to verified facts, Pakistani cultural gifting heritage, and AllBarka's dry-fruit-led standard:

### Draft 1: Mughal Arabesque Square Keepsake Tin (`tin-box-square-mini-002`)
> *Crafted from food-safe lacquered tinplate steel with embossed Mughal geometric arabesque motifs, this 3-inch square keepsake tin is engineered for elegant event distributions. Fitted with a precision friction-fit slip lid, it provides an airtight barrier that protects delicate roasted nuts and confections from humidity. Each tin is personalized with your custom monogram, event title, and date in metallic gold decal. Available empty in bulk tiers for bespoke packing or paired with AllBarka’s mountain-harvest almonds and roasted pistachios.*

### Draft 2: Haramain Heritage Tabarruk Gift Set (`tabarruk-set-classic-trio-003`)
> *Honor your sacred return from pilgrimage with our Haramain Heritage Tabarruk Gift Set. Designed for dignified distribution to family and neighbors, each three-piece suite includes a structured gold-accented carry bag, a 3-inch commemorative metal tin, and a miniature Zamzam bottle with a leak-proof gold cap. All vessels are supplied empty to receive your blessed gifts from the Holy Cities. Personalized with pilgrim names and Dua calligraphy in elegant Arabic typography.*

### Draft 3: Shehnai Foil-Stamped Nikkah Favor Box (`wedding-card-box-floral-tag-001`)
> *A refined expression of traditional Pakistani wedding hospitality, the Shehnai Favor Box is precision-crafted from 300gsm textured linen cardstock in an ivory finish. Embellished with hot-stamped gold foil calligraphy and tied with an ivory satin ribbon, it includes a personalized hanging tag bearing the couple’s names and Nikkah date. Perfectly proportioned to hold ceremonial dates, almonds, and dry fruits.*

### Draft 4: Noor-e-Nazar 250g Partitioned Baby Favor Box (`baby-box-partition-250g`)
> *Celebrate the arrival of your newborn with our Noor-e-Nazar partitioned favor box. Built from rigid 800gsm board in soft pastel tones, it features two food-grade compartments with an acetate presentation window framed by gold foil detailing. Accommodating up to 250 grams of celebratory confections, roasted nuts, or heritage Panjeeri. Finished with custom newborn birth details.*

### Draft 5: Crystal Cube Acrylic Bid Box (`acrylic-box-cube-decal-3in`)
> *Designed for modern luxury presentations, our Crystal Cube Bid Box is fabricated from 3mm optical-grade cast acrylic with diamond flame-polished edges. The seamless, crystal-clear aesthetic displays contents in full 360-degree clarity, crowned with your choice of mirrored gold calligraphy for Nikkah, Baat Pakki, or wedding anniversaries. Fitted with a flush lift-off lid.*

---

## 8. Original AllBarka Photography Shot List

To maintain brand authenticity, **no reference-site imagery will be published or copied**. All assets will be photographed in-house or rendered via dedicated studio shoots adhering to AllBarka's Harrods-level visual guidelines:

### Studio Guidelines:
- **Lighting:** Soft natural 45-degree directional key light with gentle warm fill; no harsh digital reflections.
- **Surfaces:** Warm Italian crema marfil marble, raw sand-cast travertine, or natural textured ivory linen.
- **Styling Props:** Raw unpolished brass plates, antique Mughal silverware, raw pistachio shells, whole California almonds, authentic Madinah Ajwa dates, and silk satin ribbons.
- **Strict Rule:** ZERO text, ZERO artificial watermarks, ZERO fake certifications.

### Shot List Table:
| Shot ID | Product Reference | Primary Subject | Camera Angle & Styling | Intended Aspect Ratio |
| :--- | :--- | :--- | :--- | :--- |
| `SHOT-TIN-01` | `tin-box-square-mini-002` | Mughal Arabesque Square Tin | 45-degree hero angle; one tin open showing inner gold liner with roasted pistachios, one tin closed beside it. | 1:1 Square & 4:3 Editorial |
| `SHOT-TIN-02` | `tin-box-round-floral-003` | Botanical Garden Round Tin | Top-down flat lay on textured ivory linen surrounded by whole walnuts and golden almonds. | 1:1 Square |
| `SHOT-TAB-01` | `tabarruk-set-classic-trio-003` | Haramain Heritage Tabarruk Set | Eye-level vignette; structured white & gold bag upright, circular tin open with Ajwa dates, miniature Zamzam bottle upright with crystal reflection. | 1:1 Square & 16:9 Banner |
| `SHOT-TAB-02` | `tabarruk-set-grand-011` | Safaa Luxury Pilgrimage Suite | 30-degree perspective; large tote bag, open deep tin, miniature crystal bottle on warm marble slab with soft morning light. | 1:1 Square |
| `SHOT-WED-01` | `wedding-card-box-floral-tag-001` | Shehnai Nikkah Favor Box | Close-up macro highlighting gold foil calligraphy texture and champagne satin ribbon bow. | 1:1 Square |
| `SHOT-WED-02` | `wedding-pouch-golden-potli-003` | Zari Brocade Golden Potli | 45-degree tabletop shot; potli standing upright, pearl tassels resting on polished dark wood surface with loose cashews. | 1:1 Square |
| `SHOT-BABY-01` | `baby-box-partition-250g` | Noor-e-Nazar Baby Favor Box | Split styling (powder blue & blush pink side-by-side); one box open revealing dual compartments with golden panjeeri and almonds. | 1:1 Square |
| `SHOT-ACRYL-01` | `acrylic-box-cube-decal-3in` | Crystal Cube Acrylic Bid Box | Backlit studio hero; 3mm transparent acrylic cube displaying whole Western Himalayan chilgoza pine nuts inside, gold decal catching soft specular rim light. | 1:1 Square |

---

## 9. Synthesis of Product Counts, Gaps & Release Decisions

### Category Achievement Summary:
1. **Signature Tin Boxes:** 7 products (Target 6: **MET**).
2. **Hajj & Umrah Tabarruk Sets:** 6 products (Target 6: **MET**).
3. **Wedding Favor Boxes & Pouches:** 8 products (Target 6: **MET**).
4. **Baby Announcement Boxes:** 6 products (Target 6: **MET**).
5. **Personalized Acrylic Boxes:** 2 verified products + 4 unverified concepts (Target 6: **SHORTFALL REPORTED**).

### Open Decisions for Merchant Review:
1. **Acrylic Sourcing Path:** Decide whether to launch Category 5 with the 2 verified offerings (`bid-box-acrylic-royal` and `acrylic-box-cube-decal-3in`), or authorize local Lahore wholesale vendor sampling for the 4 proposed acrylic concepts before catalog ingestion.
2. **Tiered Bulk Quantities:** Confirm if the standard bulk pack tiers (10, 25, 50, 100 pcs) should be standardized across all new box designs, or if low-unit items ($> \text{Rs. } 300$) should offer smaller 5-pack starter bundles.
3. **Advance Deposit & Approval Policy:** Formalize standard customer notice: *"All customized packaging orders require a minimum of 10 calendar days lead time following formal digital proof approval and receipt of 50% advance deposit. Transit times via courier are separate."*

---

*End of Stage 5C1 Research Ledger. Awaiting merchant/user review before initiating Stage 5C2 asset creation or catalog data migration.*
