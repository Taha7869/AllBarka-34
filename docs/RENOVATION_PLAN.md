# AllBarka Luxury Boutique — Renovation Plan v2.0
**Comprehensive Architecture Audit, Migration Mapping & 8-Stage Execution Roadmap**

**Document Version:** 2.0.0  
**Baseline Git Commit:** `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`  
**Active Working Branch:** `feat/renovation-v2`  
**Authority:** `AllBarka_Antigravity_Master_Prompt (1).md` (Version 2.0 — Final Agreed Scope, 17 Oct 2026)  
**Status:** Stage 1 Approved Baseline (Awaiting User Sign-off to Begin Stage 2)

---

## 1. Executive Summary & Evidence-Based Audit Findings

A rigorous inspection of the current repository at commit `8cf4410` confirms that while backend security, order processing, and inquiry sanitization have been successfully hardened, several critical storefront, taxonomy, merchandising, and administrative gaps prevent the site from being fully launch-ready.

### 1.1 Navigation & Header Audit
- **Desktop BubbleMenu Dropdown Bridge Gap:** In `src/components/BubbleMenu.tsx` (line 76), the dropdown container has `mt-2` (8px gap) below the trigger button. When the user moves the pointer from the menu item down toward the dropdown list, `onMouseLeave` fires on the parent container before the pointer enters the dropdown, causing flickering and accidental closure.
- **Keyboard Navigation Deficit:** Desktop menu lacks keyboard event handlers (`onKeyDown` for Space/Enter/Arrow keys, `aria-haspopup`, `aria-expanded`). Screen readers cannot ascertain submenu states.
- **Breakpoint Inconsistency:** Center navigation uses `hidden xl:flex` in `src/layouts/RootLayout.tsx` (line 261), while the mobile hamburger trigger uses `xl:hidden`. However, on screens between 1024px and 1279px (`lg`), the logo and trailing controls squeeze the layout, and center navigation disappears without an immediate mobile drawer trigger if CSS cascades conflict.
- **Category Slugs & Aliasing in Header:** Navigation currently links to legacy category slugs (`/shop/herbs-spices` directly on the top bar while `nuts` is nested). The structure does not reflect the target 7-category taxonomy.

### 1.2 Catalog & Taxonomy Audit
- **Legacy 7-Category Fragmentation:** The existing taxonomy defined in `src/config/categories.ts` consists of:
  - `nuts` (22 products)
  - `gift-boxes` (10 products)
  - `snacks-seeds` (13 products)
  - `oils` (15 products)
  - `essentials` (5 products)
  - `herbs-spices` (19 products)
  - `bundles` (13 products)
  Total products: 97.
- **Missing Canonical "Dates" Category:** Dates are currently lumped into `nuts` (`khajoor`, `aseel-dates`, `chohara`). Dates represent a cornerstone of AllBarka's heritage offering in Pakistan and require their own canonical category with specialized metadata, harvest reserves, and provenance details.
- **Fragmented "Oils & Honey" and "Desi Essentials":** Honey is currently in `essentials` (`org-honey`), while cold-pressed oils are in `oils`. In the target taxonomy, they must unite under `oils-honey`. Saffron, Panjeeri, and Shakkar belong in `herbs-spices` or traditional pantry staples.
- **Packaging is not a Canonical Category:** Bid Boxes are currently shoehorned into `gift-boxes` with a boolean flag `isBidBox: true` and an ad-hoc configuration object `bidBoxConfig`. They must be elevated to the 7th canonical category: `celebration-boxes` (Packaging & Favors).

### 1.3 Homepage & Merchandising Audit
- **Hardcoded Product Grids:** `HomePage.tsx` currently hardcodes product IDs (`featuredIds = ['pista', 'kaju', 'badam', 'akhroot', 'deal-1', 'deal-2', 'khajoor', 'org-honey']`). Products rendered in `ProductSlider` do not adapt dynamically to admin merchandising changes.
- **Redundant Full-Bleed Sections:** `HomePage.tsx` renders both `<BidBoxesSection />` (all 8 bid boxes) and `<DealsPackagesSection limit={8} />` inline on the landing page, creating an overwhelming, repetitive catalog dump. The owner explicitly confirmed removing these large product grids from the homepage in favor of a curated "Boutique Selections" tabbed showcase and high-impact collection discovery cards linking to dedicated pages (`/celebration-boxes` and `/deals`).

### 1.4 Packaging & Bid Boxes Audit
- **Under-Represented Subcategories:** Only 8 packaging products currently exist in the database. The Master Prompt requires 5 distinct packaging subcategories with at least 6 products each (minimum 30 products total):
  1. Signature Tin Boxes (current: 1 product -> target: 6 products)
  2. Hajj & Umrah Tabarruk Sets (current: 1 product -> target: 6 products; bottles/boxes EMPTY by default)
  3. Wedding Favor Boxes & Pouches (current: 3 products -> target: 6 products)
  4. Baby Announcement Boxes (current: 1 product -> target: 6 products)
  5. Personalized Acrylic Boxes (current: 1 product -> target: 6 products)
  - Plus Personalized Treats & Wrappers (sleeves, pouches, date packs).
- **Pricing & MOQ Logic Divergence:**
  - `bidBoxConfig` in `src/data/products.ts` hardcodes static price tiers (e.g. 10 pcs, 25 pcs, 50 pcs, 100 pcs) and allows ordering a single empty box (1 pc) for Rs. 60 or Rs. 80.
  - Confirmed Rule D1 mandates: `MOQ = min(25, max(1, ceil(5000 / publishedPerPiecePrice)))`. For a Rs. 60 box, MOQ is 25 pieces (Rs. 1,500 minimum pack). Single-piece sales of low-cost favor packaging cause severe operational and shipping losses.
  - Product Detail Page (`ProductDetailPage.tsx`) currently reads both `product.prices` and `product.bidBoxConfig`, causing potential drift when prices are updated in Firestore. Pricing must derive strictly from canonical catalog pricing.

### 1.5 Cart, Checkout & Orders Audit
- **Custom Order Lead Time (D3):** Minimum 10 calendar days lead time for personalized/custom orders is not yet systematically enforced in the delivery calendar or checkout date picker.
- **Dual Order Mode (D4):** Standard priced items support instant checkout, while unpriced/custom bulk configurations must route seamlessly to `CustomQuoteModal` and the Admin Bargain Desk without leaving dead ends in the cart.
- **Idempotency & Resilience:** `orderDatabase.ts` and `orderOutboxWorker.ts` are robust, but cart validation must verify packaging MOQ before proceeding to payment.

### 1.6 Admin Dashboard Audit
- **Missing Tabs:** `AdminOrdersPage.tsx` currently has 5 tabs: `overview`, `orders`, `catalogue`, `updates`, `inquiries`.
  - Missing Tab 4: **Merchandising** (Rule D6: manage 3 products per category in Boutique Selections, featured IDs, preview mode).
  - Missing Tab 7: **Pricing & Import Rules** (Rule D2: 5% initial markup calculator, reference price tracking, bulk price adjustments).
- **Bargain Desk (Inquiries) Panel:** The recently created `AdminInquiriesPanel.tsx` is functional, but needs full tie-in to the new packaging inquiry types and agreed rate logging.

---

## 2. Target Architecture

```mermaid
flowchart TD
    subgraph Client [Storefront Frontend - React 19 + Vite]
        NAV[Navigation & Header\nBubbleMenu + MobileMenu]
        HOME[HomePage\nBoutique Selections Autoplay\nDiscovery Cards]
        PLP[Category PLP /shop/:category\n7 Canonical Categories]
        CELEB[/celebration-boxes\n5 Subcategories + MOQ Filter]
        DEALS[/deals\nBundles & Value Packages]
        PDP[Product Detail Page\nDynamic Prices + MOQ + Lead Time]
        CART[Cart Drawer & Checkout\nServer-side Validation & Outbox]
    end

    subgraph Admin [Admin Dashboard]
        ADM_OVERVIEW[Overview & KPIs]
        ADM_ORDERS[Orders & Packing Slips]
        ADM_CATALOG[Catalogue & Stock]
        ADM_MERCH[Merchandising - Rule D6\nBoutique Selections 3/cat]
        ADM_INQUIRIES[Inquiries & Bargain Desk]
        ADM_PRICING[Pricing & Import Rules - Rule D2]
        ADM_UPDATES[Store Updates & Notices]
    end

    subgraph Backend [Express API + Node.js]
        AUTH[Authentication & RBAC]
        CAT_STORE[Authoritative Catalog Store\nFirestore + Memory Cache]
        ORDER_SVC[Order Validation & Pricing Service]
        OUTBOX[Order Outbox Worker]
        N8N_ROUTER[n8n Commerce Router\nwa-products CSV/JSON]
    end

    subgraph External [External Integrations]
        FIRESTORE[(Google Cloud Firestore)]
        N8N_SRV[n8n Automation Engine]
        WHATSAPP[WhatsApp Cloud API / Concierge]
    end

    NAV --> PLP
    NAV --> CELEB
    NAV --> DEALS
    HOME --> CELEB
    HOME --> DEALS
    PLP --> PDP
    CELEB --> PDP
    DEALS --> PDP
    PDP --> CART
    CART --> ORDER_SVC
    ORDER_SVC --> FIRESTORE
    ORDER_SVC --> OUTBOX
    OUTBOX --> N8N_SRV
    N8N_SRV --> WHATSAPP

    ADM_MERCH --> FIRESTORE
    ADM_PRICING --> FIRESTORE
    ADM_INQUIRIES --> FIRESTORE
    CAT_STORE --> FIRESTORE
    N8N_ROUTER --> FIRESTORE
```

---

## 3. Category & Product Migration Mapping

### 3.1 Taxonomy Re-alignment (Current -> Target)

| # | Current Category Slug | Target Canonical Slug | Target Display Name (EN) | Target Display Name (UR) | Scope & Contents |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | `nuts` (dry fruits only) | `dry-fruits` | Dry Fruits | خشک میوہ جات | Whole almonds, roasted & plain pistachios, cashews, walnuts, dried apricots, figs (anjeer), raisins (kishmish), chilgoza pine nuts. |
| 2 | `nuts` (dates subset) | `dates` | Dates | کھجوریں | Ajwa, Medjool, Mabroom, Amber, Sukari, Safawi, Zahidi, Aseel, Chohara, stuffed date selections. |
| 3 | `snacks-seeds` | `seeds-nuts` | Seeds & Nuts | بیج اور گری دار میوے | Chia seeds, raw pumpkin seeds, flax seeds (alsi), watermelon seeds, melon seeds, sesame seeds, roasted chickpeas (chanay), nimko, fox nuts (makhana). |
| 4 | `herbs-spices` + `essentials` | `herbs-spices` | Herbs & Spices | جڑی بوٹیاں اور مصالحہ جات | Ceylon cinnamon, green & black cardamom, cloves, black pepper, star anise, cumin, fennel, ajwain, dried ginger, saffron (zafran), desi panjeeri, desi shakkar. |
| 5 | `oils` + `essentials` (honey) | `oils-honey` | Oils & Honey | خالص تیل اور شہد | All 13 cold-pressed oils (almond, blackseed, coconut, castor, apricot, sesame, flaxseed, walnut, olive, onion seed, mustard, hair blends) + Wild Sidr/Organic Honey. |
| 6 | `bundles` + `gift-boxes` | `combos` | Gift Boxes & Hampers | گفٹ باکسز اور ہیمپرز | Handcrafted wooden hamper chests, corporate gift assortments, daily wellness bundles, seasonal festive flights. |
| 7 | `gift-boxes` (bid boxes) | `celebration-boxes` | Packaging & Favors | تقریب اور شادی کے ڈبے | Signature tin boxes, Hajj & Umrah tabarruk sets, wedding favor boxes & pouches, baby announcement boxes, personalized acrylic boxes, personalized treats & wrappers. |

### 3.2 Product Migration Table (Existing 97 Products)

| Product ID | Product Name | Current Category | Target Category | Target Subcategory | Migration Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pista` | Roasted Iranian Pistachios | `nuts` | `dry-fruits` | Salted & Roasted | Canonical Dry Fruit |
| `kaju` | Roasted Salted Cashews | `nuts` | `dry-fruits` | Salted & Roasted | Canonical Dry Fruit |
| `badam` | Premium Giri Badam (Almonds) | `nuts` | `dry-fruits` | Raw Kernels | Canonical Dry Fruit |
| `akhroot` | Walnut Halves (Akhroot Giri) | `nuts` | `dry-fruits` | Raw Kernels | Canonical Dry Fruit |
| `deal-1` | Walnut & Pistachio Duo | `nuts` | `combos` | Curated Duos | Reclassified to Combos |
| `deal-2` | Almond & Cashew Duo | `nuts` | `combos` | Curated Duos | Reclassified to Combos |
| `khubani` | Sun-Dried Apricots (Khubani) | `nuts` | `dry-fruits` | Sun-Dried Fruits | Canonical Dry Fruit |
| `alubukhara` | Gourmet Dried Plums | `nuts` | `dry-fruits` | Sun-Dried Fruits | Canonical Dry Fruit |
| `kishmish` | Emerald Green Raisins | `nuts` | `dry-fruits` | Sun-Dried Fruits | Canonical Dry Fruit |
| `khajoor` | Premium Dark Dates | `nuts` | `dates` | Harvest Reserve | Extracted to Dates |
| `aseel-dates` | Aseel Dates Khairpur | `nuts` | `dates` | Single Origin | Extracted to Dates |
| `chohara` | Chohara (Winter Special) | `nuts` | `dates` | Traditional Cured | Extracted to Dates |
| `pumpkin_seeds` | Raw Pumpkin Seeds (Pepitas) | `snacks-seeds` | `seeds-nuts` | Superfood Seeds | Canonical Seeds & Nuts |
| `chia_seeds` | Organic Chia Seeds | `snacks-seeds` | `seeds-nuts` | Superfood Seeds | Canonical Seeds & Nuts |
| `nimko` | Artisanal Lahori Nimko | `snacks-seeds` | `seeds-nuts` | Roasted Snacks | Canonical Seeds & Nuts |
| `chanay` | Crunchy Roasted Chanay | `snacks-seeds` | `seeds-nuts` | Roasted Snacks | Canonical Seeds & Nuts |
| `flax-seeds` | Flax Seeds (Alsi) | `snacks-seeds` | `seeds-nuts` | Superfood Seeds | Canonical Seeds & Nuts |
| `sunflower-seeds`| Sunflower Seeds | `snacks-seeds` | `seeds-nuts` | Superfood Seeds | Canonical Seeds & Nuts |
| `watermelon-seeds`| Watermelon Seeds (Peeled) | `snacks-seeds` | `seeds-nuts` | Superfood Seeds | Canonical Seeds & Nuts |
| `melon-seeds` | Melon Seeds (Kharbooza) | `snacks-seeds` | `seeds-nuts` | Superfood Seeds | Canonical Seeds & Nuts |
| `white-sesame` | White Sesame (Safed Til) | `snacks-seeds` | `seeds-nuts` | Culinary Seeds | Canonical Seeds & Nuts |
| `black-sesame` | Black Sesame (Kala Til) | `snacks-seeds` | `seeds-nuts` | Culinary Seeds | Canonical Seeds & Nuts |
| `basil-seeds` | Basil Seeds (Tukhm-e-Bangla)| `snacks-seeds` | `seeds-nuts` | Wellness Seeds | Canonical Seeds & Nuts |
| `fox-nuts` | Fox Nuts (Makhana) | `snacks-seeds` | `seeds-nuts` | Superfood Snacks | Canonical Seeds & Nuts |
| `poppy-seeds` | Poppy Seeds (Khashkhash) | `snacks-seeds` | `seeds-nuts` | Heritage Pantry | Canonical Seeds & Nuts |
| `oil-almond` to `oil-hairgrowth` (13 oils) | Cold-Pressed Oils | `oils` | `oils-honey` | Cold-Pressed Oils | Canonical Oils & Honey |
| `oil-pumpkin`, `oil-chilgoza` | Specialty Seed Oils | `oils` | `oils-honey` | Cold-Pressed Oils | Canonical Oils & Honey |
| `org-ghee` | Pure Desi Ghee | `essentials` | `herbs-spices` | Desi Pantry | Heritage Dairy Staple |
| `org-honey` | Wild Organic Honey | `essentials` | `oils-honey` | Wild Apiary Honey | Consolidated to Oils & Honey |
| `org-panjeeri` | Traditional Panjeeri | `essentials` | `herbs-spices` | Heritage Confection | Desi Health Essential |
| `org-saffron` | Premium Saffron / Zafran | `essentials` | `herbs-spices` | Royal Spices | Spice of High Value |
| `org-shakkar` | Desi Shakkar | `essentials` | `herbs-spices` | Natural Sweeteners | Traditional Pantry |
| `ceylon-cinnamon` to `dried-rose-petals` (19 items) | Spices & Botanicals | `herbs-spices` | `herbs-spices` | Whole Spices | Canonical Herbs & Spices |
| `bundle-daily-grind` to `bundle-tasting-flight` (12 items) | Curated Bundles | `bundles` | `combos` | Curated Bundles | Consolidated into Combos |
| `corporate-gifting`| Bespoke Corporate Gifting | `bundles` | `combos` | Corporate Concierge | Custom quote order mode |
| `bid-box-umrah-tabarruk` | Umrah & Hajj Tabarruk Set | `gift-boxes` | `celebration-boxes` | Hajj & Umrah Tabarruk | Reclassified to Celebration Boxes |
| `bid-box-luxury-tin` | Luxury Floral Tin Bid Box | `gift-boxes` | `celebration-boxes` | Signature Tin Boxes | Reclassified to Celebration Boxes |
| `bid-box-pyramid-favor`| Royal Pyramid Favor Box | `gift-boxes` | `celebration-boxes` | Wedding Favor Boxes | Reclassified to Celebration Boxes |
| `bid-box-card-nikkah` | Classic Card Bid Box | `gift-boxes` | `celebration-boxes` | Wedding Favor Boxes | Reclassified to Celebration Boxes |
| `bid-box-jute-pouch` | Artisanal Jute & Jamawar Potli| `gift-boxes` | `celebration-boxes` | Wedding Favor Pouches | Reclassified to Celebration Boxes |
| `bid-box-sweet-nikkah`| Heritage Nikkah Sweet Box | `gift-boxes` | `celebration-boxes` | Signature Tin Boxes | Reclassified to Celebration Boxes |
| `bid-box-birth-announcement`| Birth Announcement Favor Box | `gift-boxes` | `celebration-boxes` | Baby Announcement | Reclassified to Celebration Boxes |
| `bid-box-acrylic-royal`| Acrylic & Velvet Royal Chest | `gift-boxes` | `celebration-boxes` | Personalized Acrylic | Reclassified to Celebration Boxes |

### 3.3 New Packaging Products Required (Minimum 30 Products across 5 Subcategories)

To achieve the required 6 distinct products per subcategory:

1. **Subcategory 1: Signature Tin Boxes (6 products)**
   - `bid-box-luxury-tin` (Existing: Luxury Floral Tin Bid Box — Rs. 140/pc)
   - `bid-box-sweet-nikkah` (Existing: Heritage Nikkah Sweet Box — Rs. 180/pc)
   - `tin-mughal-octagonal` (NEW: Royal Mughal Octagonal Keepsake Tin — Rs. 220/pc)
   - `tin-emerald-filigree` (NEW: Emerald Filigree Embossed Rectangular Tin — Rs. 195/pc)
   - `tin-pastoral-round` (NEW: Rose Gold Botanical Round Biscuit Tin — Rs. 165/pc)
   - `tin-vintage-kashmiri` (NEW: Vintage Kashmiri Chinar Art Metal Tin — Rs. 240/pc)

2. **Subcategory 2: Hajj & Umrah Tabarruk Sets (6 products — Bottles/Boxes EMPTY by default)**
   - `bid-box-umrah-tabarruk` (Existing: Umrah & Hajj Tabarruk Box Set — Rs. 200/pc)
   - `tabarruk-crystal-duo` (NEW: Crystal Zamzam Bottle & Gold Tin Duo Set — Rs. 280/pc)
   - `tabarruk-kaaba-pouch` (NEW: Kiswa Black Velvet & Gold Embroidered Pouch Set — Rs. 175/pc)
   - `tabarruk-mini-hamper` (NEW: Madina Green Rigid Tabarruk Chest with Glass Flacons — Rs. 350/pc)
   - `tabarruk-tasbih-casket` (NEW: Pearl White Card Casket with Zamzam Bottle Slot & Tasbih Liner — Rs. 160/pc)
   - `tabarruk-ziyarat-trio` (NEW: Triple Compartment Ziyarat Favors Box for Ajwa & Zamzam — Rs. 225/pc)

3. **Subcategory 3: Wedding Favor Boxes & Pouches (6 products)**
   - `bid-box-pyramid-favor` (Existing: Royal Pyramid Favor Box — Rs. 60/pc)
   - `bid-box-card-nikkah` (Existing: Classic Card Bid Box — Rs. 80/pc)
   - `bid-box-jute-pouch` (Existing: Artisanal Jute & Jamawar Potli — Rs. 75/pc)
   - `wedding-hex-goldfoil` (NEW: Hexagonal Emerald & Gold Hot-Foil Nikkah Box — Rs. 95/pc)
   - `wedding-velvet-envelope` (NEW: Maroon Velvet Envelope Favor Pouch with Pearl Clasp — Rs. 120/pc)
   - `wedding-sheer-organza` (NEW: Dual-Tone Gold Sheer Organza Favor Bag with Tassel — Rs. 55/pc)

4. **Subcategory 4: Baby Announcement Boxes (6 products)**
   - `bid-box-birth-announcement` (Existing: Birth Announcement Favor Box — Rs. 150/pc)
   - `baby-pastel-carousel` (NEW: Pastel Carousel Musical Favor Box — Rs. 210/pc)
   - `baby-hotair-balloon` (NEW: 3D Gold Foil Hot Air Balloon Baby Trunk — Rs. 185/pc)
   - `baby-cradle-sweetbox` (NEW: Laser-Cut Regal Cradle Sweet Box with Ribbon Bow — Rs. 160/pc)
   - `baby-linen-drawstring` (NEW: Hand-Embroidered Cotton Linen Baby Keepsake Pouch — Rs. 110/pc)
   - `baby-pram-acrylic` (NEW: Miniature Clear Pram Favor Box with Gold Accents — Rs. 175/pc)

5. **Subcategory 5: Personalized Acrylic Boxes (6 products)**
   - `bid-box-acrylic-royal` (Existing: Acrylic & Velvet Royal Chest — Rs. 280/pc)
   - `acrylic-crystal-cube` (NEW: Monogrammed Beveled Crystal Acrylic Favor Cube — Rs. 220/pc)
   - `acrylic-slider-gold` (NEW: Clear Acrylic Slider Drawer Box with Brushed Gold Base — Rs. 320/pc)
   - `acrylic-octa-clasp` (NEW: Octagonal Acrylic Jewel Box with Vintage Brass Clasp — Rs. 350/pc)
   - `acrylic-floral-platter` (NEW: Clear Acrylic Compartment Platter with Magnetic Lid — Rs. 580/pc)
   - `acrylic-mini-trunk` (NEW: Luxury Acrylic Mini Steamer Trunk with Leatherette Handle — Rs. 450/pc)

---

## 4. Component Action Matrix

| Component | Current Location | Action | Rationale |
| :--- | :--- | :--- | :--- |
| `BubbleMenu.tsx` | `src/components/` | **MODIFY** | Fix hover gap bridge (`mt-2` removal/invisible bridge), add keyboard accessibility (`onKeyDown`, ARIA), reflect 7 canonical navigation items. |
| `MobileMenu.tsx` | `src/components/` | **MODIFY** | Enforce strict ordering (Profile, Cart, Language, Theme, 7 Collections, Socials), update category paths. |
| `RootLayout.tsx` | `src/layouts/` | **MODIFY** | Fix `hidden xl:flex` breakpoint for `lg` screens, handle navigation links and modal listeners. |
| `HomePage.tsx` | `src/pages/` | **MODIFY** | Remove `BidBoxesSection` and `DealsPackagesSection`; mount new `BoutiqueSelections.tsx` and collection discovery cards. |
| `BoutiqueSelections.tsx`| `src/components/` | **CREATE** | New unified showcase: 7 category tabs, 3 products per tab, 6000ms autoplay (D5), hover pause, reduced motion, full product cards. |
| `BidBoxesSection.tsx`| `src/components/` | **MODIFY** | Retain for `/celebration-boxes` page; remove from `HomePage.tsx`. Derives prices from canonical catalog. |
| `DealsPackagesSection.tsx`| `src/components/` | **MODIFY** | Retain for `/deals` page; remove from `HomePage.tsx`. |
| `CelebrationBoxesPage.tsx`| `src/pages/` | **CREATE** | Dedicated PLP for Packaging & Favors with 5 subcategory filters, MOQ badges, Dual Order Mode (D4). |
| `DealsPage.tsx` | `src/pages/` | **CREATE** | Dedicated PLP for Value Packages & Deals with full card Quick View & Add to Cart. |
| `CategoryPLP.tsx` | `src/components/` | **MODIFY** | Update pill filter navigation for 7 canonical categories; remove inline bid box grid embedding. |
| `ProductDetailPage.tsx`| `src/pages/` | **MODIFY** | Enforce Rule D1 MOQ for packaging items; enforce Rule D3 10-day lead time for custom items; derive price purely from catalog. |
| `ProductCard.tsx` | `src/components/` | **MODIFY** | Add MOQ badge for packaging products; ensure full click navigation and functional Quick View trigger. |
| `packagingMoq.ts` | `src/lib/` | **CREATE** | Pure helper implementing Rule D1 formula `min(25, max(1, ceil(5000 / price)))` and validation. |
| `AdminMerchandisingPanel.tsx`| `src/components/`| **CREATE** | Admin panel for Rule D6: manage 3 products per category tab in Boutique Selections, featured IDs, preview mode. |
| `AdminPricingRulesPanel.tsx`| `src/components/` | **CREATE** | Admin panel for Rule D2: initial 5% markup calculator, reference prices, bulk adjustments. |
| `AdminOrdersPage.tsx`| `src/pages/` | **MODIFY** | Add Merchandising (Tab 4) and Pricing Rules (Tab 7); wire up full 7-tab admin layout. |

---

## 5. 8-Stage Detailed Implementation Sequence

### Stage 1: Evidence-Based Audit & Plan Alignment
- **Deliverables:** `docs/RENOVATION_REQUIREMENTS.md`, `docs/RENOVATION_PLAN.md`, `docs/RENOVATION_HANDOFF.md`, and chat review packet.
- **Dependencies:** Baseline commit `8cf4410` verified.
- **Acceptance Gate:** User reviews and approves Stage 1 before any code changes occur.

### Stage 2: Canonical Taxonomy & Catalog Foundation
- **Deliverables:** `src/config/categories.ts`, `src/types/index.ts`, `src/data/products.ts`, category migration adapter, dynamic Firestore merge tests.
- **Dependencies:** Stage 1 approval.
- **Verification:** Unit tests verifying 7 canonical categories, backward-compatible aliases, and dynamic catalog merge with inactive item suppression.

### Stage 3: Packaging & Celebration Favors Implementation
- **Deliverables:** Expanded packaging catalog (30+ products across 5 subcategories), `src/lib/packagingMoq.ts` (Rule D1), `src/pages/CelebrationBoxesPage.tsx`, dual order mode (D4), custom order lead time (D3).
- **Dependencies:** Stage 2 completion.
- **Verification:** MOQ calculator tests (`min(25, max(1, ceil(5000 / price)))`), PLP navigation, Tabarruk default empty mode.

### Stage 4: Navigation & Header Reconstruction
- **Deliverables:** `src/components/BubbleMenu.tsx` (gap bridge fix, keyboard nav), `src/components/MobileMenu.tsx` (strict ordering), `src/layouts/RootLayout.tsx` (breakpoints).
- **Dependencies:** Stage 2 & 3 completion.
- **Verification:** Playwright/unit tests for dropdown mouseleave resilience, keyboard focus trapping, mobile menu drawer sequence.

### Stage 5: Merchandising & Homepage Overhaul
- **Deliverables:** `src/components/BoutiqueSelections.tsx` (7 tabs, 3 products/tab, 6000ms autoplay D5, hover pause, reduced motion), collection discovery cards on `HomePage.tsx`, dedicated `/deals` page.
- **Dependencies:** Stage 2, 3, 4 completion.
- **Verification:** Component tests verifying autoplay timing, hover pause, exit 3000ms delay, and zero layout shift.

### Stage 6: Cart, Checkout & Orders Hardening
- **Deliverables:** Server-side authoritative pricing recalculation, packaging MOQ cart enforcement, custom order 10-day lead time display, quote-only item bypass, outbox verification.
- **Dependencies:** Stage 3 & 5 completion.
- **Verification:** Cart unit tests, checkout reliability test suite, outbox worker idempotency tests.

### Stage 7: Admin Dashboard Expansion
- **Deliverables:** `src/components/AdminMerchandisingPanel.tsx` (Rule D6), `src/components/AdminPricingRulesPanel.tsx` (Rule D2), full 7-tab mounting in `AdminOrdersPage.tsx`.
- **Dependencies:** Stage 5 & 6 completion.
- **Verification:** Admin operations tests, role-based access tests, merchandising settings persistence.

### Stage 8: n8n/WhatsApp Verification, Full-Suite Testing & Production Deployment
- **Deliverables:** `/api/integrations/n8n/wa-products` feed validation, end-to-end integration tests, `npm run typecheck`, `npm run build`, release commit and push to `main` and `launch`.
- **Dependencies:** All previous stages verified.
- **Verification:** Zero TypeScript errors, 100% test pass rate, exact commit sync on `origin/main` and `origin/launch`.

---

## 6. Risk Register & Mitigations

| Risk ID | Risk Description | Severity | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-001** | Breaking legacy bookmarks or external links using old category slugs (`/shop/nuts`, `/shop/bundles`). | High | Medium | Implement comprehensive category alias dictionary (`CATEGORY_ALIASES`) and router redirects in `catalogRouter.ts`. |
| **RSK-002** | Packaging MOQ causing friction for customers seeking samples. | Medium | High | Display clear bulk tier badges and sample request link leading to Concierge WhatsApp / `CustomQuoteModal`. |
| **RSK-003** | Dynamic Firestore catalog reviving inactive products via compiled fallbacks. | High | Medium | Enforce authoritative merge logic in `catalogStore.ts`: products marked `active: false` in Firestore remain disabled regardless of compiled state. |
| **RSK-004** | Autoplay timer creating performance jitter or distracting users with motion sensitivity. | Low | Medium | Strict compliance with `prefers-reduced-motion` (disabled by default) and pause on any pointer hover or keyboard focus. |
| **RSK-005** | Production deploy chunk mismatch or caching issues after code updates. | High | Low | Main entry direct imports prevent lazy chunk load failures; cache-control headers on HTML force immediate fresh fetches. |

---

## 7. Stage 2 Entry Criteria Checklist

Before any code edits begin for Stage 2, the following conditions must be satisfied:
- [x] Baseline git repository clean on `launch` branch (`8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`).
- [x] Dedicated feature branch created: `feat/renovation-v2`.
- [x] `npm run typecheck` passes with zero errors on baseline.
- [x] All 58 integration tests pass on baseline (`npm run test:integrations`).
- [x] All 4 inquiry and catalog security tests pass on baseline (`tests/inquiry-and-sync-security.test.ts`).
- [x] Full Requirements Traceability Matrix documented in `docs/RENOVATION_REQUIREMENTS.md`.
- [x] Complete Renovation Plan documented in `docs/RENOVATION_PLAN.md`.
- [x] Stage 1 Handoff documented in `docs/RENOVATION_HANDOFF.md`.
- [ ] **Explicit User Authorization received in chat to proceed to Stage 2.**

---

**End of Renovation Plan**
