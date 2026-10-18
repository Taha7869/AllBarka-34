# Stage 5C1: Verified Catalog Planning & Research Proposal

**Document Status:** RECONCILED PLANNING PROPOSAL FOR STAGE 5C1 REVIEW  
**Branch:** `feat/renovation-v2`  
**Observation Date:** October 18–19, 2026  
**Reference Domains:** `bidboxesonline.com`, `bidbox.pk`  
**Structured Catalog Data:** `docs/STAGE_5C1_DRAFT_CATALOG.json`  
**Brand Identity:** AllBarka Luxury Dry Fruits & Confections (Lahore, Pakistan)

---

## 1. Executive Summary & Master Item Accounting

Stage 5C1 delivers a reconciled market research ledger and structured catalog plan for AllBarka’s upcoming packaging and celebration destinations, strictly preserving existing Stage 2–5A implementations and Stage 5B destination routing. 

Every proposed benchmark product is anchored to verified Pakistani market benchmarks, applying AllBarka's one-time 5% import/curation markup ($\text{Selling Price} = \text{Verified Sale Price} \times 1.05$) and exact packaging MOQ formula ($\min(25, \max(1, \lceil 5000 / \text{Price} \rceil))$).

Summary counts are directly derived from individual product records in `docs/STAGE_5C1_DRAFT_CATALOG.json`. Numerical supply shortfalls are not counted as products or concepts.

### Master Item Accounting (30 Roster Products + 3 Separate Concepts)
1. **Group A: Existing AllBarka Catalog Products (8 items)** — Active in code on `feat/renovation-v2`.
2. **Group B: Externally Verified Reference Products (21 items)** — Verified against live canonical URLs with confirmed single-unit sale prices and physical dimensions.
3. **Group C: Partially Verified References (1 item)** — Verified variable-product multi-size family (`baby-box-017` at `/bidbox/1422/`).
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

---

## 2. Discrepancy Resolutions, Evidence Normalization & Fact Checks

1. **Resolution of `tin-box-002` Contradiction:**
   - Source page explicitly states: **"Diameter: 3 inches, Height: 2 inches"**.
   - Contradiction resolved: Renamed from "Square" to **"Mughal Floral Circular Keepsake Tin"**.
   - Removed "embossed" claim: Source documents printed floral sticker wrap on metal tinplate.
2. **Resolution of `tin-box-green` Contradiction:**
   - Removed unsupported "Enamel" label. Source slug and title is `square tin box green style`; it is printed tinplate, not vitreous enamel. Renamed to **"Emerald Geometric Patterned Square Tin"**.
3. **Baby Announcement Research Completed via Live Pages:**
   - **`https://bidbox.pk/bidbox/half-kg-birth-announcement-box/`**: Verified live sale price **Rs. 260** (regular Rs. 280), dimensions **6 × 6 × 2 inches**. Added as `baby-box-half-kg` (Proposed: Rs. 273, MOQ: 19).
   - **`https://bidbox.pk/bidbox/special-sweet-box-for-baby-girl-announcement/`**: Verified live price **Rs. 380**, dimensions **7 × 5 × 2 inches**. Added as `baby-box-girl-7x5` (Proposed: Rs. 399, MOQ: 13).
   - **`https://bidboxesonline.com/bidbox/1422/` (`Baby box 017`)**: Confirmed live active canonical page. Live variation table verified: 250g (Rs. 150 sale / Rs. 200 reg), Half kg (Rs. 250 sale / Rs. 350 reg), 1 kg (Rs. 350 sale / Rs. 400 reg), 2 kg (Rs. 450 sale / Rs. 500 reg). Maintained as Group C variable reference.
   - Removed "Partitioned" from `baby-box-250g-part` name as internal dividers are optional/unstated.
4. **Purged Marketing Fluff & Unsupported Physical Claims:**
   - `wedding-card-box-001`: Removed "Shehnai" marketing term. Attested item is cardboard box with paper flower adornment (`Floral Cardstock Favor Box (3.5×3.5×2 in)`).
   - `wedding-pouch-054`: Removed "Sufi Heritage" marketing term (`Traditional Jute Drawstring Favor Pouch (4×5.5 in)`).
   - `acrylic-box-cube-3in`: Removed "Crystal Cube" label, purged claims of "3mm optical-grade cast acrylic" and "flame-polished edges" (`Clear Acrylic Presentation Cube (3×3×3 in)`).
5. **Strict Separation of Vessels, Food Fillings, and Zamzam Water:**
   - All presentation vessels are sold **EMPTY** as standard.
   - Optional AllBarka dry fruit fillings (e.g. roasted pistachios, cashews, almonds, Ajwa dates) are quoted separately as optional add-ons.
   - Zamzam water bottles in Tabarruk sets are provided as **empty vessels** for customer-provided Zamzam water. AllBarka does not sell, pre-fill, or supply Zamzam water. Water is never captioned or implied as an AllBarka filling.
6. **Payment & Lead Time Governance:**
   - Unapproved "50% advance" removed.
   - Standard approved phrasing: *"Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate."*

---

## 3. Product Catalog Table by Category (30 Roster Products)

### Category 1: Signature Tin Boxes (7 Products)
| ID | Proposed Normalized Name | Canonical Reference URL | Source Sale PKR | Basis | Proposed 5% | Display | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-luxury-tin` | **Luxury Floral Tin Bid Box** *(Existing)* | AllBarka Catalog | Rs. 140.00 | 1 pc | Rs. 140.00 | Rs. 140 | 25 pcs |
| `tin-box-002` | **Mughal Floral Circular Keepsake Tin** | `bidboxesonline.com/bidbox/tin-box-002/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-004` | **Botanical Garden Circular Keepsake Tin** | `bidboxesonline.com/bidbox/tin-box-004/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-008` | **Special Edition Floral Circular Keepsake Tin** | `bidboxesonline.com/bidbox/tin-box-008-special-edition/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-green` | **Emerald Geometric Patterned Square Tin** | `bidboxesonline.com/bidbox/square-tin-box-green-style/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-beige` | **Beige Floral Circular Keepsake Tin** | `bidbox.pk/bidbox/beige-floral-tin-box/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-baby-boy` | **Pastel Blue Square Keepsake Favor Tin** | `bidbox.pk/bidbox/baby-boy-sweet-tin-box/` | Rs. 120.00 | 1 pc | Rs. 126.00 | Rs. 126 | 25 pcs |

### Category 2: Hajj & Umrah Tabarruk Sets (6 Products)
| ID | Proposed Normalized Name | Canonical Reference URL | Source Sale PKR | Basis | Proposed 5% | Display | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-umrah-tabarruk` | **Umrah & Hajj Tabarruk Box Set** *(Existing)* | AllBarka Catalog | Rs. 200.00 | 1 set | Rs. 200.00 | Rs. 200 | 25 sets |
| `tabarruk-set-004` | **Rawdah 3-Piece Tabarruk Gift Set** | `bidboxesonline.com/bidbox/bidbox-bid-boxes-umrah-hajj-set-004/` | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-classic` | **Haramain Heritage Pilgrimage Favor Set** | `bidboxesonline.com/bidbox/hajj-umrah-set/` | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-012` | **Medina Moon Tabarruk Box & Bag Set** | `bidboxesonline.com/bidbox/hajj-set-box-012/` | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-tijori` | **Tijori Grand Presentation Tabarruk Suite** | `bidboxesonline.com/bidbox/tijori-big-bag-set-002/` | Rs. 400.00 | 1 set | Rs. 420.00 | Rs. 420 | 12 sets |
| `tabarruk-set-no43` | **Safaa 3-Piece Pilgrimage Set** | `bidbox.pk/bidbox/umrah-hajj-set-no-43/` | Rs. 350.00 | 1 set | Rs. 367.50 | Rs. 368 | 14 sets |

### Category 3: Wedding Favor Boxes & Pouches (8 Products)
| ID | Proposed Normalized Name | Canonical Reference URL | Source Sale PKR | Basis | Proposed 5% | Display | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-pyramid-favor` | **Royal Pyramid Favor Box** *(Existing)* | AllBarka Catalog | Rs. 60.00 | 1 pc | Rs. 60.00 | Rs. 60 | 25 pcs |
| `bid-box-card-nikkah` | **Classic Card Bid Box** *(Existing)* | AllBarka Catalog | Rs. 80.00 | 1 pc | Rs. 80.00 | Rs. 80 | 25 pcs |
| `bid-box-jute-pouch` | **Artisanal Jute & Jamawar Pouch** *(Existing)* | AllBarka Catalog | Rs. 75.00 | 1 pc | Rs. 75.00 | Rs. 75 | 25 pcs |
| `bid-box-sweet-nikkah` | **Heritage Nikkah Sweet & Dry Fruit Box** *(Existing)*| AllBarka Catalog | Rs. 180.00 | 1 pc | Rs. 180.00 | Rs. 180 | 25 pcs |
| `wedding-card-box-001` | **Floral Cardstock Favor Box (3.5×3.5×2 in)** | `bidboxesonline.com/bidbox/card-box-001/` | Rs. 75.00 | 1 pc | Rs. 78.75 | Rs. 79 | 25 pcs |
| `wedding-pyramid-box` | **Floral Cardstock Pyramid Favor Box (3×3×3 in)** | `bidboxesonline.com/bidbox/floral-pyramid-box/` | Rs. 30.00 | 1 pc | Rs. 31.50 | Rs. 32 | 25 pcs |
| `wedding-pouch-054` | **Traditional Jute Drawstring Favor Pouch (4×5.5 in)** | `bidboxesonline.com/bidbox/bid-box-jute-pouches-054/` | Rs. 60.00 | 1 pc | Rs. 63.00 | Rs. 63 | 25 pcs |
| `wedding-two-piece-box`| **Golden & Off-White Two-Piece Card Box (3.2×3.2×2 in)**| `bidbox.pk/bidbox/two-pieces-box-golden-lid-and-off-white-base/` | Rs. 80.00 | 1 pc | Rs. 84.00 | Rs. 84 | 25 pcs |

### Category 4: Baby Announcement Boxes (7 Products)
| ID | Proposed Normalized Name | Canonical Reference URL | Source Sale PKR | Basis | Proposed 5% | Display | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-birth-announcement` | **Birth Announcement Favor Box** *(Existing)* | AllBarka Catalog | Rs. 150.00 | 1 pc | Rs. 150.00 | Rs. 150 | 25 pcs |
| `baby-box-3in-round` | **Cradle Keepsake Circular Favor Box (3 in dia × 2 in depth)** | `bidboxesonline.com/bidbox/3-inches-baby-bid-boxes/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `baby-box-250g-part` | **Compact 250g Card Baby Announcement Box** | `bidboxesonline.com/bidbox/250-gram-baby-boxes/` | Rs. 150.00 | 1 pc (250g) | Rs. 157.50 | Rs. 158 | 25 pcs |
| `baby-box-half-kg` | **Half Kg Square Baby Announcement Box (6×6×2 in)** | `bidbox.pk/bidbox/half-kg-birth-announcement-box/` | Rs. 260.00 | 1 pc (500g) | Rs. 273.00 | Rs. 273 | 19 pcs |
| `baby-box-girl-7x5` | **Baby Girl Floral Announcement Sweet Box (7×5×2 in)** | `bidbox.pk/bidbox/special-sweet-box-for-baby-girl-announcement/` | Rs. 380.00 | 1 pc | Rs. 399.00 | Rs. 399 | 13 pcs |
| `baby-box-1kg-boy` | **Baby Boy 1kg Announcement Sweet Box (9×7×2 in)** | `bidbox.pk/bidbox/1kg-baby-boy-sweet-box/` | Rs. 440.00 | 1 pc (1 kg) | Rs. 462.00 | Rs. 462 | 11 pcs |
| `baby-box-017` | **Multi-Size Baby Announcement Box Family** *(Variable)* | `bidboxesonline.com/bidbox/1422/` | Rs. 150–450 | Variable | Rs. 158–473 | Rs. 158–473 | 11–25 pcs |

### Category 5: Personalized Acrylic Boxes (2 Roster Products)
| ID | Proposed Normalized Name | Canonical Reference URL | Source Sale PKR | Basis | Proposed 5% | Display | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-acrylic-royal` | **Acrylic & Velvet Royal Bid Box** *(Existing)* | AllBarka Catalog | Rs. 280.00 | 1 pc | Rs. 280.00 | Rs. 280 | 18 pcs *(Bulk)* / 5 pcs *(1 pc)* |
| `acrylic-box-cube-3in` | **Clear Acrylic Presentation Cube (3×3×3 in)** | `bidboxesonline.com/bidbox/acrylic-special-boxes/` | Rs. 300.00 | 1 pc | Rs. 315.00 | Rs. 315 | 16 pcs |

#### Unverified Conceptual Proposals (Kept strictly separate, Category 5 gap):
1. *[Concept]* `acrylic-box-sliding-tray-4in` — Clear Acrylic Sliding Sleeve Box (4×4×2 in).
2. *[Concept]* `acrylic-box-partition-4bay-6in` — 4-Compartment Clear Acrylic Presentation Tray (6×6×2.5 in).
3. *[Concept]* `acrylic-box-grand-trousseau-chest` — Grand Trousseau Bari Acrylic Chest (12×8×4 in).

---

## 4. Photography Shot List Standards

- **Primary Image Rule:** The primary product photo MUST clearly depict the **empty presentation vessel**.
- **Secondary / Optional Styling Rule:** Any photo showing dry fruits, nuts, or dates MUST be secondary and explicitly captioned: *"Shown with optional AllBarka dry fruit filling — sold separately."*
- **Strict Water Rule:** Zamzam bottles are photographed empty. Water is never captioned as an AllBarka filling or implied to be supplied by AllBarka.
- **Aesthetic:** Soft natural 45° directional lighting, Italian crema marfil marble or natural travertine surfaces, authentic dry fruit props, zero typography/watermarks.

---

## 5. Offline Test & Release Gating Status

- **Combined Offline Test Suite:** Not established as clean in bulk unisolated runs (`scripts/run-all-tests.mjs`) due to port 4589 server collisions between background instances under `--test-isolation=none`.
- **Targeted Checks Executed for Milestone:**
  - `npm run build`: Exit 0 (vite build transformed 2314 modules, esbuild server.cjs bundle passed, release privacy audit passed on 84 release artifacts).
  - `tests/stage5b-destinations.test.tsx`: 10 / 10 passed (Exit 0).
  - `tests/stage5a-controlled-clock.test.mjs`: 11 / 11 passed (Exit 0).
  - `npm run typecheck`: Exit 0 (`tsc --noEmit`).
  - `npm run lint:hooks`: Exit 0 (`eslint src`).
  - Live HTTP reads for new reference candidate URLs: HTTP 200 confirmed.
- **Stage 5C1 Review Halt:** No image generation, no catalog ingestion into `src/data/products.ts`, no Firestore writes, no deployment.
