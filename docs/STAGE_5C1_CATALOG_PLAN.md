# Stage 5C1: Verified Catalog Planning & Research Proposal

**Document Status:** REVISED AUDIT COMMITTED FOR REVIEW  
**Branch:** `feat/renovation-v2`  
**Observation Date:** October 18–19, 2026  
**Reference Domains:** `bidboxesonline.com`, `bidbox.pk`  
**Brand Identity:** AllBarka Luxury Dry Fruits & Confections (Lahore, Pakistan)

---

## 1. Executive Summary & Audit Accounting

Stage 5C1 delivers an audited market research ledger for AllBarka’s upcoming packaging and celebration destinations, strictly preserving existing Stage 2–5A implementations and Stage 5B destination routing. 

Every proposed product is anchored to verified Pakistani market benchmarks, applying AllBarka's one-time 5% import/curation markup ($\text{Selling Price} = \text{Verified Sale Price} \times 1.05$) and exact packaging MOQ formula ($\min(25, \max(1, \lceil 5000 / \text{Price} \rceil))$).

### Master Item Accounting (Total: 29 Items Across Ledger)
1. **Group A: Existing AllBarka Catalog Products (8 items)** — Active in code on `feat/renovation-v2`.
2. **Group B: Externally Verified Reference Products (16 items)** — Verified against live canonical URLs with confirmed single-unit sale prices and dimensions.
3. **Group C: Partially Verified Candidates (1 item)** — Verified variable-product multi-size family.
4. **Group D: Unverified Conceptual Proposals (4 items)** — Documented acrylic and baby shortfall concepts pending offline vendor quotes.

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
*Grand Total Across All Groups: 29 items
```

---

## 2. Discrepancy Resolutions & Fact Checks

1. **“3 inches baby boxes” (`https://bidboxesonline.com/bidbox/3-inches-baby-bid-boxes/`)**:
   - Confirmed live sale price: **Rs. 100 PKR** (regular crossed-out price: Rs. 120 PKR).
   - Confirmed dimensions: **3 inches diameter and 2 inches depth** (circular/cylindrical tin/box, NOT a square box).
2. **“250 GRAM BABY BOXES” (`https://bidboxesonline.com/bidbox/250-gram-baby-boxes/`)**:
   - Confirmed live sale price: **Rs. 150 PKR** (regular crossed-out price: Rs. 200 PKR).
3. **“Baby box 017”**:
   - Slug `/baby-box-017/` returns HTTP 404 (Page Not Found). Removed.
   - Price range Rs. 150–450 belongs to variable multi-size families (`baby-box-011` / `1-kg-baby-sweet-box`), where 250g is Rs. 150, 500g is Rs. 250, 1kg is Rs. 350, and 2kg is Rs. 450. Arbitrary Rs. 350 assignment is removed.
4. **Acrylic Special Boxes (`https://bidboxesonline.com/bidbox/acrylic-special-boxes/`)**:
   - Confirmed live sale price: **Rs. 300 PKR** (regular crossed-out price: Rs. 350 PKR).
   - Confirmed dimensions: **3 × 3 × 3 inches cube**.
   - Removed unsubstantiated claims: 3mm thickness, optical-grade acrylic, flame-polished edges, and dry fruit capacities are unstated by source.
5. **Advance Payment Terms**:
   - Unapproved "50% advance" removed.
   - Standard approved phrasing retained: *"Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate."*

---

## 3. Product Catalog Table by Category

### Category 1: Signature Tin Boxes
| ID | Proposed Original Name | Canonical Reference URL | Source Sale PKR | Basis | Proposed 5% | Display | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-luxury-tin` | **Luxury Floral Tin Bid Box** *(Existing)* | AllBarka Catalog | Rs. 140.00 | 1 pc | Rs. 140.00 | Rs. 140 | 25 pcs |
| `tin-box-002` | **Mughal Arabesque Square Keepsake Tin** | `bidboxesonline.com/bidbox/tin-box-002/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-004` | **Botanical Garden Floral Keepsake Tin** | `bidboxesonline.com/bidbox/tin-box-004/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-008` | **Special Edition Floral Keepsake Tin** | `bidboxesonline.com/bidbox/tin-box-008-special-edition/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-green` | **Emerald Enamel Patterned Square Tin** | `bidboxesonline.com/bidbox/square-tin-box-green-style/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-beige` | **Beige Floral Keepsake Tin** | `bidbox.pk/bidbox/beige-floral-tin-box/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `tin-box-baby-boy` | **Pastel Blue Keepsake Favor Tin** | `bidbox.pk/bidbox/baby-boy-sweet-tin-box/` | Rs. 120.00 | 1 pc | Rs. 126.00 | Rs. 126 | 25 pcs |

### Category 2: Hajj & Umrah Tabarruk Sets
| ID | Proposed Original Name | Canonical Reference URL | Source Sale PKR | Basis | Proposed 5% | Display | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-umrah-tabarruk` | **Umrah & Hajj Tabarruk Box Set** *(Existing)* | AllBarka Catalog | Rs. 200.00 | 1 set | Rs. 200.00 | Rs. 200 | 25 sets |
| `tabarruk-set-004` | **Rawdah 3-Piece Tabarruk Gift Set** | `bidboxesonline.com/bidbox/bidbox-bid-boxes-umrah-hajj-set-004/` | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-classic` | **Haramain Heritage Pilgrimage Favor Set** | `bidboxesonline.com/bidbox/hajj-umrah-set/` | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-012` | **Medina Moon Tabarruk Box & Bag Set** | `bidboxesonline.com/bidbox/hajj-set-box-012/` | Rs. 200.00 | 1 set | Rs. 210.00 | Rs. 210 | 24 sets |
| `tabarruk-set-tijori` | **Tijori Grand Presentation Tabarruk Suite** | `bidboxesonline.com/bidbox/tijori-big-bag-set-002/` | Rs. 400.00 | 1 set | Rs. 420.00 | Rs. 420 | 12 sets |
| `tabarruk-set-no43` | **Safaa 3-Piece Pilgrimage Set** | `bidbox.pk/bidbox/umrah-hajj-set-no-43/` | Rs. 350.00 | 1 set | Rs. 367.50 | Rs. 368 | 14 sets |

### Category 3: Wedding Favor Boxes & Pouches
| ID | Proposed Original Name | Canonical Reference URL | Source Sale PKR | Basis | Proposed 5% | Display | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-pyramid-favor` | **Royal Pyramid Favor Box** *(Existing)* | AllBarka Catalog | Rs. 60.00 | 1 pc | Rs. 60.00 | Rs. 60 | 25 pcs |
| `bid-box-card-nikkah` | **Classic Card Bid Box** *(Existing)* | AllBarka Catalog | Rs. 80.00 | 1 pc | Rs. 80.00 | Rs. 80 | 25 pcs |
| `bid-box-jute-pouch` | **Artisanal Jute & Jamawar Pouch** *(Existing)* | AllBarka Catalog | Rs. 75.00 | 1 pc | Rs. 75.00 | Rs. 75 | 25 pcs |
| `bid-box-sweet-nikkah` | **Heritage Nikkah Sweet & Dry Fruit Box** *(Existing)*| AllBarka Catalog | Rs. 180.00 | 1 pc | Rs. 180.00 | Rs. 180 | 25 pcs |
| `wedding-card-box-001` | **Shehnai Flower Decoration Favor Box** | `bidboxesonline.com/bidbox/card-box-001/` | Rs. 75.00 | 1 pc | Rs. 78.75 | Rs. 79 | 25 pcs |
| `wedding-pyramid-box` | **Floral Pyramid Favor Box** | `bidboxesonline.com/bidbox/floral-pyramid-box/` | Rs. 30.00 | 1 pc | Rs. 31.50 | Rs. 32 | 25 pcs |
| `wedding-pouch-054` | **Sufi Heritage Jute Drawstring Pouch** | `bidboxesonline.com/bidbox/bid-box-jute-pouches-054/` | Rs. 60.00 | 1 pc | Rs. 63.00 | Rs. 63 | 25 pcs |
| `wedding-two-piece-box`| **Golden & Off-White Two-Piece Card Box** | `bidbox.pk/bidbox/two-pieces-box-golden-lid-and-off-white-base/` | Rs. 80.00 | 1 pc | Rs. 84.00 | Rs. 84 | 25 pcs |

### Category 4: Baby Announcement Boxes
| ID | Proposed Original Name | Canonical Reference URL | Source Sale PKR | Basis | Proposed 5% | Display | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-birth-announcement` | **Birth Announcement Favor Box** *(Existing)* | AllBarka Catalog | Rs. 150.00 | 1 pc | Rs. 150.00 | Rs. 150 | 25 pcs |
| `baby-box-3in-round` | **Cradle Keepsake Circular Favor Box (3 in dia)** | `bidboxesonline.com/bidbox/3-inches-baby-bid-boxes/` | Rs. 100.00 | 1 pc | Rs. 105.00 | Rs. 105 | 25 pcs |
| `baby-box-250g-part` | **Noor-e-Nazar 250g Partitioned Baby Box** | `bidboxesonline.com/bidbox/250-gram-baby-boxes/` | Rs. 150.00 | 1 pc (250g) | Rs. 157.50 | Rs. 158 | 25 pcs |
| `baby-box-1kg-boy` | **Sultan 1kg Baby Announcement Sweet Box** | `bidbox.pk/bidbox/1kg-baby-boy-sweet-box/` | Rs. 440.00 | 1 pc (1 kg) | Rs. 462.00 | Rs. 462 | 11 pcs |

### Category 5: Personalized Acrylic Boxes
| ID | Proposed Original Name | Canonical Reference URL | Source Sale PKR | Basis | Proposed 5% | Display | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bid-box-acrylic-royal` | **Acrylic & Velvet Royal Bid Box** *(Existing)* | AllBarka Catalog | Rs. 280.00 | 1 pc | Rs. 280.00 | Rs. 280 | 18 pcs *(Bulk)* / 5 pcs *(1 pc)* |
| `acrylic-box-cube-3in` | **Crystal Cube Acrylic Bid Box (3×3×3 in)** | `bidboxesonline.com/bidbox/acrylic-special-boxes/` | Rs. 300.00 | 1 pc | Rs. 315.00 | Rs. 315 | 16 pcs |

#### Unverified Shortfall Concepts (Pending Local Factory Sampling):
1. *[Concept]* `acrylic-box-sliding-tray-4in` — Clear Acrylic Sliding Sleeve Box (4×4×2 in).
2. *[Concept]* `acrylic-box-partition-4bay-6in` — Royal 4-Bay Clear Acrylic Platter (6×6×2.5 in).
3. *[Concept]* `acrylic-box-grand-trousseau-chest` — Grand Bari Trousseau Acrylic Trunk (12×8×4 in).

---

## 4. Photography Shot List Standards

- **Primary Image Rule:** The primary product photo MUST clearly depict the **empty presentation vessel**.
- **Secondary / Optional Styling Rule:** Any photo showing dates, nuts, or water MUST be captioned: *"Shown with optional AllBarka dry fruit filling — sold separately."*
- **Aesthetic:** Soft natural 45° directional lighting, Italian crema marfil marble or natural travertine surfaces, unpolished brass styling props, authentic whole dry fruits, zero typography/watermarks.

---

*Committed to repository under `docs/STAGE_5C1_CATALOG_PLAN.md` and registered in Antigravity brain.*
