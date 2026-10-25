# AllBarka 34 — Master Technical & Resources Reference Guide

> **AllBarka Organic & Pure Food Storefront**  
> *Authoritative Production Reference, Catalog Inventory, Media Assets, Business Rules, and Deployment Manual.*

---

## 1. Executive Summary & Branch Architecture

AllBarka is an enterprise-grade bilingual (English / Urdu / Arabic) e-commerce storefront specializing in premium dry fruits, cold-pressed oils, organic pantry staples, and artisanal hampers.

### Branch Relationship & Synchronization (`main` vs `launch`)

| Branch | Purpose | Deployment Target | Status |
|---|---|---|---|
| **`launch`** | **Active Production Branch** | **Railway Fullstack Production** (`https://allbarka-fullstack-production.up.railway.app`) | **Active & Live** (Automated Railpack CI/CD) |
| **`main`** | **Unified Core Repository** | Upstream Reference / Staging | **Synchronized with `launch`** (Contains all 56+ WebP images, schemas, test suites) |
| **`release/catalog-live-20261015`** | **Release Branch** | Audited Snapshot | Merged into `launch` and `main` |

#### Why were images & updates originally on `launch`?
- During initial launch hardening, branch `launch` was wired to Railway for real-time live deployments.
- High-resolution WebP photographs (`-1.webp`, `-2.webp`), category banners, and the live catalog migration scripts were committed directly to the release track leading to `launch`.
- The `main` branch was on an earlier baseline (`f02d8d0`). 
- **Resolution**: Both branches have now been unified with an `--allow-unrelated-histories` merge so that `main` and `launch` have **100% file parity**, ensuring all product images, components, tests, and configuration files exist across both branches.

---

## 2. Media & Asset Inventory

All static media assets are served directly from the `/public` directory.

### Total Asset Count: 228 Files
- **131 WebP Images**: Optimized next-gen photography for products, hero banners, and category tiles.
- **58 SVG Illustrations**: Fallback vector covers for 100% catalog coverage across all screen densities.
- **24 JPG Photos**: High-resolution studio photography and hero flatlays.
- **10 PNG Renders**: Category icons and luxury hamper coffers.
- **1 MP4 Video**: `public/videos/allbarka-gifting-motion.mp4` (Luxury gifting ribbon showcase).
- **SEO & Crawlers**: `public/robots.txt`, `public/sitemap.xml`, `public/favicon.ico`, `public/favicon.svg`.

### Key Asset Directories

```
public/
├── assets/
│   ├── categories/       # Category navigation icons (dry_fruits.png, oils.webp, etc.)
│   └── hampers/          # 3D coffer renders (emerald_velvet.png, heritage_gold.png, premium_wood.png)
├── images/
│   ├── generated/        # Branded AI & composite hero images (hero-dry-fruits-wide-v1.webp, etc.)
│   ├── products/         # 89 product covers in SVG and WebP format (*-1.webp, *-2.webp, *.svg)
│   ├── brand-seal.jpg    # Verified authentic seal
│   └── og-image.jpg      # OpenGraph social preview
└── videos/
    └── allbarka-gifting-motion.mp4
```

---

## 3. Product Catalog Directory (89 Canonical Items)

The catalog covers 6 core categories with strict bilingual naming, pricing, and packaging details:

### 1. Nuts & Dry Fruits (`nuts-dry-fruits`)
- **Roasted Iranian Pistachios (Pista)** (`pista`) — 250g: Rs. 1,300, 500g: Rs. 2,500, 1kg: Rs. 4,800 *(Custom Weight: 100g–5000g)*
- **American Almonds (Badam)** (`badam`) — 250g: Rs. 750, 500g: Rs. 1,450, 1kg: Rs. 2,800 *(Custom Weight: 100g–5000g)*
- **Kashmiri Walnut Halves (Akhroot)** (`akhroot`) — 250g: Rs. 750, 500g: Rs. 1,450, 1kg: Rs. 2,800 *(Custom Weight: 100g–5000g)*
- **Roasted Salted Cashews (Kaju)** (`kaju`) — 250g: Rs. 950, 500g: Rs. 1,850, 1kg: Rs. 3,600 *(Custom Weight: 100g–5000g)*
- **Dried Afghan Figs (Injeer)** (`afghan-figs`) — 250g: Rs. 950, 500g: Rs. 1,850, 1kg: Rs. 3,600 *(Custom Weight: 100g–5000g)*
- **Jumbo Black Raisins (Kali Kishmish)** (`black-raisins`) — 250g: Rs. 450, 500g: Rs. 850, 1kg: Rs. 1,600 *(Custom Weight: 100g–5000g)*
- **Green Raisins (Sundarkhani Kishmish)** (`kishmish`) — 250g: Rs. 400, 500g: Rs. 750, 1kg: Rs. 1,400 *(Custom Weight: 100g–5000g)*
- **Golden Raisins (Kishmish)** (`golden-raisins`) — 250g: Rs. 450, 500g: Rs. 850, 1kg: Rs. 1,600 *(Custom Weight: 100g–5000g)*
- **Dried Apricots (Khubani)** (`khubani`) — 250g: Rs. 450, 500g: Rs. 850, 1kg: Rs. 1,600 *(Custom Weight: 100g–5000g)*
- **Dried Plums (Alubukhara)** (`alubukhara`) — 250g: Rs. 400, 500g: Rs. 750, 1kg: Rs. 1,400 *(Custom Weight: 100g–5000g)*
- **Pine Nuts with Shell (Chilgoza)** (`pine-nuts-shell`) — 100g: Rs. 1,400, 250g: Rs. 3,300, 500g: Rs. 6,400 *(Custom Weight: 100g–2000g)*
- **Pine Nuts Shelled (Chilgoza Giri)** (`pine-nuts`) — 100g: Rs. 2,200, 250g: Rs. 5,200, 500g: Rs. 10,000 *(Custom Weight: 100g–2000g)*
- **Kashmiri Snow Walnuts (Kashmiri Akhroot)** (`kashmiri-walnut`) — 250g: Rs. 950, 500g: Rs. 1,850, 1kg: Rs. 3,600 *(Custom Weight: 100g–5000g)*
- **Spiced Masala Almonds** (`masala-almonds`) — 200g: Rs. 700, 400g: Rs. 1,350 *(Custom Weight: 100g–5000g)*
- **Unsalted Roasted Cashews** (`roasted-cashews`) — 250g: Rs. 950, 500g: Rs. 1,850, 1kg: Rs. 3,600 *(Custom Weight: 100g–5000g)*
- **Dried Red Cranberries** (`dried-cranberries`) — 200g: Rs. 650, 500g: Rs. 1,500 *(Custom Weight: 100g–3000g)*
- **Dried Mulberries (Shahtoot)** (`dried-mulberry`) — 200g: Rs. 550, 500g: Rs. 1,250 *(Custom Weight: 100g–3000g)*
- **Dried Red Jujube (Unab)** (`dried-jujube`) — 250g: Rs. 400, 500g: Rs. 750, 1kg: Rs. 1,400 *(Custom Weight: 100g–5000g)*
- **Dried Kiwi Slices** (`dried-kiwi`) — 200g: Rs. 600, 500g: Rs. 1,400 *(Custom Weight: 100g–3000g)*
- **Pista Giri (Unsalted Pistachio Kernels)** (`pista-giri`) — 100g: Rs. 1,200, 250g: Rs. 2,800, 500g: Rs. 5,400 *(Custom Weight: 100g–3000g)*
- **Roasted Peanuts with Shell (Munghphali)** (`munghphali`) — 250g: Rs. 250, 500g: Rs. 450, 1kg: Rs. 800 *(Custom Weight: 100g–5000g)*

### 2. Dates (`dates`)
- **Premium Ajwa Dates (Ajwa Khajoor)** (`ajwa-dates`) — 250g: Rs. 1,100, 500g: Rs. 2,100, 1kg: Rs. 4,000 *(Custom Weight: 100g–5000g)*
- **Premium Medjool Dates** (`medjool-dates`) — 250g: Rs. 1,200, 500g: Rs. 2,300, 1kg: Rs. 4,400 *(Custom Weight: 100g–5000g)*
- **Sindhi Aseel Dates (Aseel Khajoor)** (`aseel-dates`) — 500g: Rs. 450, 1kg: Rs. 850 *(Custom Weight: 250g–5000g)*
- **Premium Dark Dates (Irani Khajoor)** (`khajoor`) — 500g: Rs. 500, 1kg: Rs. 950 *(Custom Weight: 250g–5000g)*
- **Dry Yellow Dates (Chohara)** (`chohara`) — 250g: Rs. 350, 500g: Rs. 650, 1kg: Rs. 1,200 *(Custom Weight: 100g–5000g)*

### 3. Cold-Pressed Pure Oils (`cold-pressed-oils`)
*All oils are packaged with fragile protection; shipping mass corresponds to fluid milliliters.*
- **Pure Almond Oil (Roghan-e-Badam)** (`oil-almond`) — 60ml: Rs. 650, 120ml: Rs. 1,200
- **Extra Virgin Olive Oil** (`oil-olive`) — 250ml: Rs. 1,100, 500ml: Rs. 2,000
- **Cold-Pressed Black Seed Oil (Kalonji)** (`oil-blackseed`) — 60ml: Rs. 550, 120ml: Rs. 980
- **Pure Organic Coconut Oil** (`oil-coconut`) — 200ml: Rs. 600, 500ml: Rs. 1,350
- **Pure Mustard Oil (Sarson ka Tel)** (`oil-mustard`) — 500ml: Rs. 450, 1L: Rs. 850
- **Pure Sesame Oil (Til ka Tel)** (`oil-sesame`) — 250ml: Rs. 650, 500ml: Rs. 1,200
- **Cold-Pressed Castor Oil (Arandi ka Tel)** (`oil-castor`) — 120ml: Rs. 450, 250ml: Rs. 800
- **Cold-Pressed Flaxseed Oil (Alsi ka Tel)** (`oil-flaxseed`) — 120ml: Rs. 480, 250ml: Rs. 850
- **Pure Apricot Kernel Oil** (`oil-apricot`) — 60ml: Rs. 550, 120ml: Rs. 980
- **Pure Walnut Oil (Roghan-e-Akhroot)** (`oil-walnut`) — 60ml: Rs. 700, 120ml: Rs. 1,300
- **Onion Seed Hair Oil (Piyaz ke Beej)** (`oil-onionseed`) — 120ml: Rs. 600, 250ml: Rs. 1,100
- **Hair Growth Elixir Blend** (`oil-hairgrowth`) — 100ml: Rs. 1,250, 200ml: Rs. 2,300
- **Nourishing Hair Blend Oil** (`oil-hairblend`) — 120ml: Rs. 850, 250ml: Rs. 1,600
- **Pine Nut Oil (Roghan-e-Chilgoza)** (`oil-chilgoza`) — 30ml: Rs. 1,800, 60ml: Rs. 3,400
- **Cold-Pressed Pumpkin Seed Oil** (`oil-pumpkin`) — 60ml: Rs. 750, 120ml: Rs. 1,400

### 4. Seeds & Healthy Snacks (`seeds-snacks`)
- **Organic Chia Seeds (Tukhm-e-Sharbati)** (`chia_seeds`) — 200g: Rs. 450, 500g: Rs. 1,000 *(Custom Weight: 100g–5000g)*
- **Raw Pumpkin Seeds (Kaddu ke Beej)** (`pumpkin_seeds`) — 200g: Rs. 550, 500g: Rs. 1,250 *(Custom Weight: 100g–5000g)*
- **Raw Sunflower Seeds (Surajmukhi ke Beej)** (`sunflower-seeds`) — 200g: Rs. 380, 500g: Rs. 850 *(Custom Weight: 100g–5000g)*
- **Raw Watermelon Seeds (Tarbuz ke Beej)** (`watermelon-seeds`) — 200g: Rs. 400, 500g: Rs. 900 *(Custom Weight: 100g–5000g)*
- **Raw Melon Seeds (Kharbooza ke Beej)** (`melon-seeds`) — 200g: Rs. 420, 500g: Rs. 950 *(Custom Weight: 100g–5000g)*
- **Roasted Salty Grams (Bhunay Chanay)** (`chanay`) — 250g: Rs. 250, 500g: Rs. 450, 1kg: Rs. 800 *(Custom Weight: 100g–5000g)*
- **Special Lahori Nimko Mix** (`nimko`) — 250g: Rs. 300, 500g: Rs. 550, 1kg: Rs. 1,000 *(Custom Weight: 100g–5000g)*
- **Char Maghaz Four-Seed Mix** (`char-maghaz-mix`) — 200g: Rs. 480, 500g: Rs. 1,100 *(Custom Weight: 100g–5000g)*
- **Organic Flax Seeds (Alsi)** (`flax-seeds`) — 250g: Rs. 250, 500g: Rs. 450, 1kg: Rs. 800 *(Custom Weight: 100g–5000g)*
- **Basil Seeds (Tukh Malanga)** (`basil-seeds`) — 200g: Rs. 350, 500g: Rs. 800 *(Custom Weight: 100g–5000g)*
- **White Sesame Seeds (Safed Til)** (`white-sesame`) — 250g: Rs. 350, 500g: Rs. 650, 1kg: Rs. 1,200 *(Custom Weight: 100g–5000g)*
- **Black Sesame Seeds (Kala Til)** (`black-sesame`) — 250g: Rs. 380, 500g: Rs. 700, 1kg: Rs. 1,300 *(Custom Weight: 100g–5000g)*
- **Roasted Lotus Seeds (Phool Makhana / Fox Nuts)** (`fox-nuts`) — 100g: Rs. 450, 250g: Rs. 1,050 *(Custom Weight: 100g–2000g)*
- **Poppy Seeds (Khashkhash)** (`poppy-seeds`) — 100g: Rs. 400, 250g: Rs. 950 *(Custom Weight: 100g–2000g)*

### 5. Herbs, Spices & Organic Pantry (`herbs-spices`)
- **Organic Desi Ghee** (`org-ghee`) — 500g: Rs. 1,800, 1kg: Rs. 3,500
- **Pure Wild Sidr Honey (Beri ka Shehad)** (`org-honey`) — 500g: Rs. 1,950, 1kg: Rs. 3,700
- **Traditional Herbal Panjeeri** (`org-panjeeri`) — 500g: Rs. 1,650, 1kg: Rs. 3,100
- **Kashmiri Mongra Saffron (Zafran)** (`org-saffron`) — 1g: Rs. 1,200, 3g: Rs. 3,300, 5g: Rs. 5,200
- **Organic Raw Shakkar** (`org-shakkar`) — 500g: Rs. 250, 1kg: Rs. 450
- **Green Cardamom (Sabz Elaichi)** (`green-cardamom`) — 50g: Rs. 650, 100g: Rs. 1,250 *(Custom: 50g–1000g)*
- **Black Cardamom (Badi Elaichi)** (`black-cardamom`) — 100g: Rs. 550, 250g: Rs. 1,300 *(Custom: 100g–2000g)*
- **Ceylon Cinnamon Sticks (Dar Chini)** (`ceylon-cinnamon`) — 100g: Rs. 400, 250g: Rs. 950 *(Custom: 100g–3000g)*
- **Whole Cloves (Laung)** (`whole-cloves`) — 100g: Rs. 350, 250g: Rs. 800 *(Custom: 100g–3000g)*
- **Black Peppercorns (Sabut Kali Mirch)** (`black-peppercorns`) — 100g: Rs. 350, 250g: Rs. 800 *(Custom: 100g–3000g)*
- **Whole Star Anise (Badiyan ka Phool)** (`star-anise`) — 100g: Rs. 380, 250g: Rs. 880 *(Custom: 100g–2000g)*
- **Nutmeg & Mace Duo (Jaiphal & Javitri)** (`nutmeg-mace`) — 50g: Rs. 550, 100g: Rs. 1,050 *(Custom: 50g–1000g)*
- **Fennel Seeds (Saunf)** (`fennel-seeds`) — 250g: Rs. 280, 500g: Rs. 520, 1kg: Rs. 980 *(Custom: 100g–5000g)*
- **Ajwain Carom Seeds** (`ajwain`) — 200g: Rs. 250, 500g: Rs. 580 *(Custom: 100g–5000g)*
- **Cumin Seeds (Zeera)** (`cumin-seeds`) — 200g: Rs. 420, 500g: Rs. 980 *(Custom: 100g–5000g)*
- **Kasuri Methi (Dried Fenugreek Leaves)** (`kasuri-methi`) — 100g: Rs. 220, 250g: Rs. 500 *(Custom: 50g–2000g)*
- **Special Chaat Masala** (`chaat-masala`) — 150g: Rs. 280, 300g: Rs. 520 *(Custom: 100g–3000g)*
- **Authentic Shahi Garam Masala** (`garam-masala`) — 100g: Rs. 420, 250g: Rs. 980 *(Custom: 50g–2000g)*
- **Dried Mint Leaves (Pudina)** (`dried-mint`) — 100g: Rs. 200, 250g: Rs. 450 *(Custom: 50g–2000g)*
- **Dried Ginger (Sonth)** (`dried-ginger`) — 150g: Rs. 320, 300g: Rs. 600 *(Custom: 100g–3000g)*
- **Dried Damask Rose Petals (Gulab ki Pattiyan)** (`dried-rose-petals`) — 100g: Rs. 300, 250g: Rs. 700 *(Custom: 50g–2000g)*
- **Gond Katira (Tragacanth Gum)** (`gond-katira`) — 150g: Rs. 450, 300g: Rs. 850 *(Custom: 100g–2000g)*
- **Edible Gum (Gond Phulai / Gond Babul)** (`edible-gond`) — 200g: Rs. 350, 500g: Rs. 800 *(Custom: 100g–3000g)*

### 6. Curated Hampers & Fixed Bundles (`deals`, `gifts`)
- **Royal Feast Hamper** (`bundle-royal-feast`) — Rs. 14,800 *(Gross Shipping Weight: 4,000g)*
- **Immunity Shield Box** (`bundle-immunity-shield`) — Rs. 6,800 *(Gross Shipping Weight: 2,100g)*
- **Daily Grind Power Pack** (`bundle-daily-grind`) — Rs. 5,200 *(Gross Shipping Weight: 1,800g)*
- **Winter Warrior Duo** (`bundle-winter-warrior`) — Rs. 4,600 *(Gross Shipping Weight: 1,400g)*
- **Brain Fuel Trio** (`bundle-brain-fuel`) — Rs. 5,900 *(Gross Shipping Weight: 1,700g)*
- **Sunrise Seeds Collection** (`bundle-sunrise-seeds`) — Rs. 3,400 *(Gross Shipping Weight: 1,600g)*
- **Ramadan Ready Basket** (`bundle-ramadan-ready`) — Rs. 7,400 *(Gross Shipping Weight: 2,500g)*
- **Tasting Flight Discovery Box** (`bundle-tasting-flight`) — Rs. 4,200 *(Gross Shipping Weight: 1,200g)*
- **Silver Jubilee Hamper** (`bundle-silver-hamper`) — Rs. 8,900 *(Gross Shipping Weight: 2,800g)*
- **Gold Heritage Hamper** (`bundle-gold-hamper`) — Rs. 12,500 *(Gross Shipping Weight: 3,500g)*
- **Platinum Imperial Hamper** (`bundle-platinum-hamper`) — Rs. 18,500 *(Gross Shipping Weight: 5,000g)*
- **AllBarka Mystery Box** (`bundle-mystery-box`) — Rs. 4,999 *(Gross Shipping Weight: 1,500g)*
- **Corporate Bespoke Gifting** (`corporate-gifting`) — *Quote Only (No online checkout)*

---

## 4. Authoritative Business Rules & Tariff Engine

### A. Shipping Rates & Delivery Policy
1. **Lahore Standard Delivery (`standard`)**:
   - Flat rate: **Rs. 150**.
   - **FREE Delivery** triggered automatically if merchandise subtotal $\ge$ **Rs. 3,000**.
2. **Lahore Same-Day / Express Delivery (`express` / `sameday`)**:
   - Flat rate: **Rs. 300** regardless of order total (Premium service fee).
   - Cutoff: Orders placed before **6:00 PM PKT** qualify for same-day delivery. Orders after 6:00 PM roll to next operating day.
   - Operating Days: Monday to Saturday. Orders placed on Sunday roll to Monday.
3. **Nationwide Delivery (Outside Lahore)**:
   - Rate: **Rs. 250 per kg** based on exact proportional weight.
   - Minimum shipping fee: **Rs. 250**.
   - Free shipping threshold does **NOT** apply nationwide.
   - Calculation formula:
     $$\text{Fee} = \max\left(250, \left\lceil \frac{\text{Gross Weight in Grams}}{1000} \right\rceil \times 250 \right)$$

### B. Custom Gram Weight Pricing Formula
- Allowed only on loose dry selections (`allowCustomWeight: true`).
- Step size: **50g** increments between `minCustomWeightG` (default 100g) and `maxCustomWeightG` (default 5000g).
- Calculation rounds up to nearest **Rs. 5**:
  $$\text{Price} = \left\lceil \frac{\text{Grams} \times \text{pricePer100g}}{100 \times 5} \right\rceil \times 5$$

### C. Promotional Codes Matrix (Central Configuration)
All promo codes are verified authoritatively on the backend (`src/server/promoConfig.ts`):
1. `ALLBARKA10`: 10% off entire order, min spend Rs. 1,000.
2. `BULK10`: 10% off high-volume orders, min spend Rs. 10,000 (uncapped).
3. `ISHAQUEAHMAD`: 10% off, min spend Rs. 2,000, capped at Rs. 1,000.
4. `FRIEND`: Flat Rs. 200 discount on orders $\ge$ Rs. 2,000.
5. `ZAFRANI`: Free nationwide shipping on orders containing saffron.
6. `GIFTBOX`: Free luxury gift wrapping (Rs. 250 fee waived).
7. `MYSTERY`: Free complimentary dry fruit sample tin (zero discount).
8. `WELCOME10`: 10% off first customer order (verified against Firestore purchase history).
9. `WELCOME200`: Legacy first-order Rs. 200 voucher (restricted/historical).
10. `CANCER`: Special inquiry tracking quote token (zero payment, quote dispatch only).

### D. Patron Loyalty Program
- **Earn Rate**: 1 Loyalty Point per whole **Rs. 100** spent on payable subtotal.
- **Accrual Condition**: Credited **strictly once** when admin sets order status to `DELIVERED`.
- Cancelled or returned orders receive 0 points.
- Guest checkouts accumulate uncredited points tied to phone/email, credited upon account claim.

---

## 5. Background Integration & Outbox Pipeline

The long-running background worker runs inside the Express process (`src/services/orderOutboxWorker.ts`):
- **Poll Interval**: 60 seconds (`ORDER_OUTBOX_POLL_MS = 60000`).
- **Read-Before-Lease Optimization**: Reads pending events via sasti query before attempting atomic lease. When no events are due, returns `IDLE` with **0 Firestore writes**.
- **HMAC Authentication**: Signs each payload sent to the n8n webhook with `X-AllBarka-Webhook-Secret` and sha256 `X-N8n-Signature`.
- **Google Sheets Mirror**: Two-way synchronization with `Order_Control` spreadsheet for live fulfillment tracking.

---

## 6. Build, Verification & Deployment Runbook

### Commands

```powershell
# 1. Typecheck validation
npm run typecheck

# 2. Production build (Vite + Node Server Bundle + Privacy Audit)
npm run build

# 3. Complete Test Suites (508 Unit Tests + 21 Backend Tests + 36 Production Checks)
npm test

# 4. Catalog Asset Verification
npx tsx scripts/verify-catalog-assets.ts
```

### Production Deployment Procedure (Railway)
1. Commit all audited changes to `release/catalog-live-20261015`.
2. Fast-forward or merge to branch **`launch`** and push:
   ```powershell
   git push origin release/catalog-live-20261015:launch
   ```
3. Railway automatically detects the commit, runs Railpack (`npm run build && npm start`), and activates the deployment.
4. Verify deployment health:
   - `GET https://allbarka-fullstack-production.up.railway.app/api/health`
   - `GET https://allbarka-fullstack-production.up.railway.app/api/catalog`
   - `POST https://allbarka-fullstack-production.up.railway.app/api/orders/quote`
