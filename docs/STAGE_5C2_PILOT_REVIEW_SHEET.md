# Stage 5C2: Five-Product Visual Pilot Review Sheet

**Document Status:** DRAFT CONCEPT PILOT FOR MERCHANT REVIEW  
**Branch:** `feat/renovation-v2`  
**Generated Date:** October 19, 2026  
**Asset Location:** `public/images/products/drafts/pilot/` (isolated outside live storefront mapping)  
**Structured Manifest:** `docs/STAGE_5C2_PILOT_MANIFEST.json`  
**Brand Governance:** AllBarka Luxury Dry Fruits & Confections (Lahore, Pakistan)

---

## 1. Executive Summary & Governance Controls

Stage 5C2 initiates the visual design phase with a **Five-Product Visual Pilot**, covering one representative benchmark product from each of the five approved celebration packaging subcategories.

### Key Governance Controls Enforced
1. **Isolated Draft Asset Storage:** Draft pilot photographs are stored strictly in `public/images/products/drafts/pilot/`, outside the live storefront catalog asset mapping (`/images/products/<id>.webp`). No live assets or catalog files in `src/data/products.ts` were modified.
2. **Strict Empty Vessel Photography Rule:** Every generated image depicts the **EMPTY** presentation vessel. In the Tabarruk set (`tabarruk-set-004`), the bottle is transparent and empty (no liquid/water), the tin is empty, and the bag is empty. No food, sweets, nuts, or water are shown or implied as included.
3. **Purity of Imagery:** ZERO text, ZERO typography, ZERO calligraphy, ZERO logos, and ZERO watermarks appear on any generated image. Surfaces use authentic warm crema marfil limestone, honed travertine, and natural linen.
4. **Authoritative Pricing Math:** Selling prices are strictly calculated as $\text{Source Sale Price} \times 1.05$. Display prices (rounded to integer PKR) are used solely for presentation and never as a second calculation source. Existing AllBarka prices remain untouched.
5. **Subcategory ID Schema Mapping:** Descriptive research IDs are explicitly mapped to the existing storefront schema:
   - `signature-tin-boxes` $\to$ `tin`
   - `hajj-umrah-tabarruk-sets` $\to$ `tabarruk`
   - `wedding-favor-boxes-pouches` $\to$ `wedding`
   - `baby-announcement-boxes` $\to$ `baby`
   - `personalized-acrylic-boxes` $\to$ `acrylic`

---

## 2. Product-by-Product Pilot Review Cards

---

### Pilot 1: Signature Tin Boxes
**Product ID:** `tin-box-002`  
**Validated Category ID:** `tin` (Mapped from `signature-tin-boxes`)  
**Product Title:** Mughal Floral Circular Keepsake Tin  
**Benchmark Reference URL:** [`https://bidboxesonline.com/bidbox/tin-box-002/`](https://bidboxesonline.com/bidbox/tin-box-002/)  
**Draft Image Asset:** `public/images/products/drafts/pilot/pilot-tin-box-002.jpg`

![Mughal Floral Circular Keepsake Tin](pilot-tin-box-002.jpg)

#### Financial & Commercial Parameters
- **Verified Benchmark Sale Price:** Rs. 100.00 (Crossed-out regular: Rs. 130.00)
- **Authoritative Proposed Selling Price (5% Markup):** **Rs. 105.00**
- **Storefront Display Price:** Rs. 105
- **Packaging MOQ:** **25 pcs** ($\min(25, \max(1, \lceil 5000 / 105 \rceil)) = 25$)

#### Polished English Product Copy
> **Mughal Floral Circular Keepsake Tin**  
> *A 3-inch circular keepsake presentation tin wrapped with an ornamental Mughal floral motif, designed for celebratory favor distribution, Nikkah giveaways, and timeless gift packaging.*  
>  
> **What is Included:**  
> 1 × Circular metal tinplate base container with rolled-rim friction slip-fit lid.  
>  
> **Verified Specifications:**  
> Dimensions: 3 inches diameter × 2 inches height. Fabricated from lightweight metal tinplate wrapped in a delicate printed botanical floral graphic wrapper.  
>  
> **Offering Status:**  
> Supplied completely **empty** as standard for DIY event favor packing. Optional AllBarka dry fruit fillings (such as whole roasted Gilgit almonds, jumbo cashews, or green pistachios) may be added upon request for an additional filling quotation.  
>  
> **Customization Options:**  
> - *Vendor-Attested Available Customization:* Customizable top surface lettering for couple names, event dates, or short celebratory messages.  
> - *Proposed AllBarka Styling Option:* Coordinated metallic foil sealing ribbon and branded AllBarka luxury favor hangtags (subject to final design approval).  
>  
> **Preparation & Fulfillment:**  
> *Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate.*

#### Evidence & Physical Specifications
- **Verified Source Facts:** Diameter 3 inches, height 2 inches; circular cylindrical tinplate body; printed sticker wrap around circumference; slip-fit lid.
- **Pending Confirmation Details:** Tinplate sheet gauge thickness in mm; interior lacquer food-contact certification.

---

### Pilot 2: Hajj & Umrah Tabarruk Sets
**Product ID:** `tabarruk-set-004`  
**Validated Category ID:** `tabarruk` (Mapped from `hajj-umrah-tabarruk-sets`)  
**Product Title:** Rawdah 3-Piece Tabarruk Gift Set  
**Benchmark Reference URL:** [`https://bidboxesonline.com/bidbox/bidbox-bid-boxes-umrah-hajj-set-004/`](https://bidboxesonline.com/bidbox/bidbox-bid-boxes-umrah-hajj-set-004/)  
**Draft Image Asset:** `public/images/products/drafts/pilot/pilot-tabarruk-set-004.jpg`

![Rawdah 3-Piece Tabarruk Gift Set](pilot-tabarruk-set-004.jpg)

#### Financial & Commercial Parameters
- **Verified Benchmark Sale Price:** Rs. 200.00 (Crossed-out regular: Rs. 350.00)
- **Authoritative Proposed Selling Price (5% Markup):** **Rs. 210.00**
- **Storefront Display Price:** Rs. 210
- **Packaging MOQ:** **24 sets** ($\min(25, \max(1, \lceil 5000 / 210 \rceil)) = 24$)

#### Polished English Product Copy
> **Rawdah 3-Piece Tabarruk Gift Set**  
> *A curated three-piece pilgrimage homecoming suite designed to offer returning Hajj and Umrah pilgrims an elegant, coordinated presentation for gifting blessed keepsakes to family and loved ones.*  
>  
> **What is Included (3-Piece Empty Suite):**  
> - 1 × Structured ivory gift bag with carry handles (6 × 8 × 3 inches).  
> - 1 × Circular metal tinplate keepsake box with slip lid (3 inches diameter × 2 inches height).  
> - 1 × Miniature clear bottle with gold-toned screw cap (120ml capacity).  
>  
> **Verified Specifications:**  
> Bag: 6 × 8 × 3 inches, rigid paper construction with cord carry handles. Tin: 3-inch diameter × 2-inch height, printed tinplate. Bottle: 120ml liquid capacity, clear transparent vessel with leak-resistant screw cap.  
>  
> **Offering Status & Strict Separation:**  
> All three pieces are supplied completely **empty**. The 120ml clear bottle is an empty presentation container intended for customer-provided Zamzam water; AllBarka does **not** sell, pre-fill, or supply Zamzam water. The tin box is supplied empty; optional authentic Madina Ajwa date fillings or mountain dry fruits are quoted separately as optional AllBarka add-ons.  
>  
> **Customization Options:**  
> - *Vendor-Attested Available Customization:* Pilgrim name and return date personalization on presentation tags.  
> - *Proposed AllBarka Styling Option:* Hot-stamped gold foil Dua and pilgrimage commemoration seals (subject to final design approval).  
>  
> **Preparation & Fulfillment:**  
> *Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate.*

#### Evidence & Physical Specifications
- **Verified Source Facts:** 3 included pieces (Bag: 6×8×3 in, Tin: 3×2 in, Bottle: 120ml capacity); pilgrim tags included.
- **Pending Confirmation Details:** Bottle material specification (PET vs glass); screw cap seal leak-resistance certification.

---

### Pilot 3: Wedding Favor Boxes & Pouches
**Product ID:** `wedding-card-box-001`  
**Validated Category ID:** `wedding` (Mapped from `wedding-favor-boxes-pouches`)  
**Product Title:** Floral Cardstock Favor Box (3.5×3.5×2 in)  
**Benchmark Reference URL:** [`https://bidboxesonline.com/bidbox/card-box-001/`](https://bidboxesonline.com/bidbox/card-box-001/)  
**Draft Image Asset:** `public/images/products/drafts/pilot/pilot-wedding-card-box-001.jpg`

![Floral Cardstock Favor Box](pilot-wedding-card-box-001.jpg)

#### Financial & Commercial Parameters
- **Verified Benchmark Sale Price:** Rs. 75.00 (Crossed-out regular: Rs. 100.00)
- **Authoritative Proposed Selling Price (5% Markup):** **Rs. 78.75**
- **Storefront Display Price:** Rs. 79
- **Packaging MOQ:** **25 pcs** ($\min(25, \max(1, \lceil 5000 / 78.75 \rceil)) = 25$)

#### Polished English Product Copy
> **Floral Cardstock Favor Box (3.5×3.5×2 in)**  
> *A classic 3.5-inch rigid cardstock favor box finished with a handcrafted paper floral accent, crafted for Nikkah, Baat Pakki, engagement favors, and wedding guest gifting.*  
>  
> **What is Included:**  
> 1 × Two-piece rigid cardstock box (base and telescoping slip lid) adorned with a handcrafted paper flower adornment on the lid.  
>  
> **Verified Specifications:**  
> Dimensions: 3.5 × 3.5 inches square, 2 inches height. Fabricated from smooth, rigid ivory cardboard with applied floral embellishment.  
>  
> **Offering Status:**  
> Supplied completely **empty** as standard. Curated AllBarka dry fruit fillings (such as saffron-infused Jordan almonds, whole cashews, or salted pistachios) are available upon request as optional quoted add-ons.  
>  
> **Customization Options:**  
> - *Vendor-Attested Available Customization:* Couple name and event date printed favor tags.  
> - *Proposed AllBarka Styling Option:* Satin or grosgrain ribbon tie accents in custom wedding palette tones.  
>  
> **Preparation & Fulfillment:**  
> *Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate.*

#### Evidence & Physical Specifications
- **Verified Source Facts:** 3.5 × 3.5 inches, 2 inches height; rigid cardboard body; decorative paper flower on lid; slip lid.
- **Pending Confirmation Details:** Cardboard GSM weight; adhesive durability under transit temperature variations.

---

### Pilot 4: Baby Announcement Boxes
**Product ID:** `baby-box-half-kg`  
**Validated Category ID:** `baby` (Mapped from `baby-announcement-boxes`)  
**Product Title:** Half Kg Square Baby Announcement Box (6×6×2 in)  
**Benchmark Reference URL:** [`https://bidbox.pk/bidbox/half-kg-birth-announcement-box/`](https://bidbox.pk/bidbox/half-kg-birth-announcement-box/)  
**Draft Image Asset:** `public/images/products/drafts/pilot/pilot-baby-box-half-kg.jpg`

![Half Kg Square Baby Announcement Box](pilot-baby-box-half-kg.jpg)

#### Financial & Commercial Parameters
- **Verified Benchmark Sale Price:** Rs. 260.00 (Crossed-out regular: Rs. 280.00)
- **Authoritative Proposed Selling Price (5% Markup):** **Rs. 273.00**
- **Storefront Display Price:** Rs. 273
- **Packaging MOQ:** **19 pcs** ($\min(25, \max(1, \lceil 5000 / 273 \rceil)) = 19$)

#### Polished English Product Copy
> **Half Kg Square Baby Announcement Box (6×6×2 in)**  
> *A generous 6-inch square rigid cardstock presentation box created to announce the joyful arrival of a newborn with family and friends, offering a refined half-kilogram capacity.*  
>  
> **What is Included:**  
> 1 × Rigid square cardstock baby announcement box with full telescoping lid.  
>  
> **Verified Specifications:**  
> Dimensions: 6 × 6 inches square, 2 inches depth. Capacity: 500g (half kg) nominal confection or favor volume. Rigid cardstock construction featuring subtle pastel graphic styling.  
>  
> **Offering Status:**  
> Supplied completely **empty** as standard for sweetmeats (Mithai), confections, or dry fruits. Optional AllBarka gourmet dry fruit assortments, roasted nuts, or traditional celebratory panjeeri pairings are available separately upon request.  
>  
> **Customization Options:**  
> - *Vendor-Attested Available Customization:* Custom lid printing featuring newborn name, birth date, weight, and blessed family greetings.  
> - *Proposed AllBarka Styling Option:* Interior parchment liners and custom divider inserts (subject to vendor sample verification).  
>  
> **Preparation & Fulfillment:**  
> *Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate.*

#### Evidence & Physical Specifications
- **Verified Source Facts:** 6 × 6 inches, 2 inches depth; half kg capacity; rigid cardstock with baby announcement theme; customizable names/dates.
- **Pending Confirmation Details:** Cardboard GSM caliper; factory availability of optional 4-bay internal divider grid.

---

### Pilot 5: Personalized Acrylic Boxes
**Product ID:** `acrylic-box-cube-3in`  
**Validated Category ID:** `acrylic` (Mapped from `personalized-acrylic-boxes`)  
**Product Title:** Clear Acrylic Presentation Cube (3×3×3 in)  
**Benchmark Reference URL:** [`https://bidboxesonline.com/bidbox/acrylic-special-boxes/`](https://bidboxesonline.com/bidbox/acrylic-special-boxes/)  
**Draft Image Asset:** `public/images/products/drafts/pilot/pilot-acrylic-box-cube-3in.jpg`

![Clear Acrylic Presentation Cube](pilot-acrylic-box-cube-3in.jpg)

#### Financial & Commercial Parameters
- **Verified Benchmark Sale Price:** Rs. 300.00 (Crossed-out regular: Rs. 350.00; bulk 100 pcs: Rs. 30,000)
- **Authoritative Proposed Selling Price (5% Markup):** **Rs. 315.00**
- **Storefront Display Price:** Rs. 315
- **Packaging MOQ:** **16 pcs** ($\min(25, \max(1, \lceil 5000 / 315 \rceil)) = 16$)

#### Polished English Product Copy
> **Clear Acrylic Presentation Cube (3×3×3 in)**  
> *A modern, transparent 3-inch presentation cube engineered from high-clarity acrylic, showcasing event favors in complete 360-degree clarity for contemporary weddings and celebratory gifting.*  
>  
> **What is Included:**  
> 1 × Transparent acrylic cube container with precision slip-over acrylic lid.  
>  
> **Verified Specifications:**  
> Dimensions: 3 × 3 × 3 inches cube. Constructed from clear transparent acrylic sheets with seamless bonded square corner joints. *(Note: Specific sheet thickness in mm and exact factory tolerance are pending sample measurement).*  
>  
> **Offering Status:**  
> Supplied completely **empty** as standard. Displays favors with pristine transparency; optional AllBarka premium single-origin dry fruit fillings (such as whole Chilgoza pine nuts, Medjool dates, or roasted pistachios) are available separately upon inquiry.  
>  
> **Customization Options:**  
> - *Vendor-Attested Available Customization:* Custom vinyl decal lettering for wedding titles (*Nikkah Mubarak, Qabool Hai, Baat Pakki, Engagement, Eid Mubarak, Start of Forever*) alongside couple names and event dates, with digital WhatsApp proofing included.  
> - *Proposed AllBarka Styling Option:* Metallic foil sticker seals and tinted acrylic base liner plates (pending factory confirmation).  
>  
> **Preparation & Fulfillment:**  
> *Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate.*

#### Evidence & Physical Specifications
- **Verified Source Facts:** 3 × 3 × 3 inches cube; transparent acrylic; slip-over lid; vinyl decal customization with couple names and event dates; WhatsApp proofing included.
- **Unsubstantiated Claims Purged:** Claims of "3mm optical-grade cast acrylic", "diamond flame-polished edges", and pre-calculated nut filling capacities were purged.
- **Pending Confirmation Details:** Acrylic sheet wall thickness in mm; edge bonding solvent grade.

---

## 3. Product-ID-to-Asset Manifest

| Product ID | Storefront Category ID | Product Name | Draft Asset Path | Size / Aspect | Status |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `tin-box-002` | `tin` | Mughal Floral Circular Keepsake Tin | `public/images/products/drafts/pilot/pilot-tin-box-002.jpg` | 1:1 Square | Reference-Based Concept Visual |
| `tabarruk-set-004` | `tabarruk` | Rawdah 3-Piece Tabarruk Gift Set | `public/images/products/drafts/pilot/pilot-tabarruk-set-004.jpg` | 1:1 Square | Reference-Based Concept Visual |
| `wedding-card-box-001` | `wedding` | Floral Cardstock Favor Box (3.5×3.5×2 in) | `public/images/products/drafts/pilot/pilot-wedding-card-box-001.jpg` | 1:1 Square | Reference-Based Concept Visual |
| `baby-box-half-kg` | `baby` | Half Kg Square Baby Announcement Box | `public/images/products/drafts/pilot/pilot-baby-box-half-kg.jpg` | 1:1 Square | Reference-Based Concept Visual |
| `acrylic-box-cube-3in` | `acrylic` | Clear Acrylic Presentation Cube (3×3×3 in) | `public/images/products/drafts/pilot/pilot-acrylic-box-cube-3in.jpg` | 1:1 Square | Reference-Based Concept Visual |

---

## 4. Unresolved Issues & Stage 5C2 Gating

1. **Category 5 Acrylic Supply Shortfall:**
   - Target: At least 6 distinct products per subcategory.
   - Actual Verified Roster: **2 products** (`bid-box-acrylic-royal` + `acrylic-box-cube-3in`).
   - Unresolved Gap: **4 products short of target**.
   - Proposed concepts (`acrylic-box-sliding-tray-4in`, `acrylic-box-partition-4bay-6in`, `acrylic-box-grand-trousseau-chest`) remain in Group D pending local acrylic vendor quoting. No fictitious entries were created.
2. **Combined Offline Suite Status:**
   - Full combined test execution (`scripts/run-all-tests.mjs`) is tracked as **not established** without test isolation due to port 4589 server collisions under `--test-isolation=none`.
   - Isolated suites confirm individual components pass cleanly:
     - `tests/stage5b-destinations.test.tsx`: 10/10 passed.
     - `tests/stage5a-controlled-clock.test.mjs`: 11/11 passed.
     - `npm run typecheck`: 0 errors.
     - `npm run lint:hooks`: 0 errors.
     - `npm run build`: Production bundle + privacy release audit passed.
3. **Stage 5C2 Visual Pilot Review Halt:**
   - Five reviewable pilot concepts delivered.
   - Zero bulk image generation.
   - Zero catalog ingestion into `src/data/products.ts`.
   - Zero Firestore writes.
   - Zero deployment or merge to launch.
