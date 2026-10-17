# AllBarka Renovation Requirements Traceability Matrix (RTM)

**Document Version:** 2.0.0  
**Baseline Git Commit:** `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`  
**Active Working Branch:** `feat/renovation-v2`  
**Authority:** `AllBarka_Antigravity_Master_Prompt (1).md` (Version 2.0 — Final Agreed Scope, 17 Oct 2026)  
**Status:** Baseline Established (Stage 1 Complete)

---

## 1. Traceability Matrix Legend
- **ID:** Unique Requirement Identifier (e.g. `REQ-CAT-001`)
- **Category:** Functional Area (`NAV`, `HOME`, `CAT`, `PKG`, `CHK`, `ADM`, `N8N`, `QA`)
- **Stage:** Target Implementation Stage (Stages 2–8)
- **Status:** `PLANNED` | `IN_PROGRESS` | `VERIFIED` | `BLOCKED`
- **Verification:** Unit test, Playwright E2E test, or HTTP integration test

---

## 2. Master Requirements Matrix

### 2.1 Canonical Taxonomy & Catalog Foundation (CAT) — Stage 2

| Req ID | Description | Source | Stage | Status | Verification Criteria | Target Files |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-CAT-001** | Define 7 canonical categories: `dry-fruits`, `dates`, `seeds-nuts`, `herbs-spices`, `oils-honey`, `combos`, `celebration-boxes`. | Master Prompt B.3 | Stage 2 | PLANNED | `CANONICAL_CATEGORIES` contains exactly 7 keys with metadata, translations, and banners. | `src/config/categories.ts`, `src/types/index.ts` |
| **REQ-CAT-002** | Backward-compatible slug aliasing: map `nuts` -> `dry-fruits`, `oils` -> `oils-honey`, `essentials` -> `oils-honey` / `herbs-spices`, `snacks-seeds` -> `seeds-nuts`, `gift-boxes` -> `combos`, `bundles` -> `combos`. | Master Prompt B.3 | Stage 2 | PLANNED | `resolveCategorySlug('nuts')` returns `dry-fruits`. Old URLs redirect or render target canonical collection. | `src/config/categories.ts`, `src/lib/catalogRouter.ts` |
| **REQ-CAT-003** | Migrate all 97 existing products into the 7 target categories with zero orphan items. | Master Prompt B.3 | Stage 2 | PLANNED | Script validates `PRODUCTS.every(p => CANONICAL_CATEGORIES[p.category]) === true`. | `src/data/products.ts`, `src/data/care/*.ts` |
| **REQ-CAT-004** | Extract Dates into dedicated category (`dates`) with localized Pakistan-available harvests (Ajwa, Medjool, Mabroom, Amber, Sukari, Safawi, Zahidi, Aseel, Chohara). | Master Prompt B.3 | Stage 2 | PLANNED | `dates` category contains at least 9 localized date varieties with real images & prices. | `src/data/products.ts`, `src/config/categories.ts` |
| **REQ-CAT-005** | Consolidate Oils & Honey (`oils-honey`) from legacy `oils` and `essentials` (`org-honey`). | Master Prompt B.3 | Stage 2 | PLANNED | All 15 cold-pressed oils + wild organic honey resolve to `oils-honey`. | `src/data/products.ts` |
| **REQ-CAT-006** | Consolidate Seeds & Nuts (`seeds-nuts`) from legacy `snacks-seeds`. | Master Prompt B.3 | Stage 2 | PLANNED | Pumpkin, chia, watermelon, melon, sesame, basil, fox nuts, and poppy seeds resolve to `seeds-nuts`. | `src/data/products.ts` |
| **REQ-CAT-007** | Consolidate Herbs & Spices (`herbs-spices`) including saffron and desi staples. | Master Prompt B.3 | Stage 2 | PLANNED | 19 herbs & spices + `org-saffron` + `org-panjeeri` + `org-shakkar` properly categorized. | `src/data/products.ts` |
| **REQ-CAT-008** | Dynamic Catalog Adapter: ensure dynamic Firestore products merge cleanly without compiled fallbacks reviving inactive items. | Master Prompt B.3 | Stage 2 | PLANNED | Unit test `mergeAuthoritativeCatalog` verifies inactive Firestore items stay hidden even if present in compiled file. | `src/lib/catalogStore.ts`, `server.ts` |
| **REQ-CAT-009** | Category PLP Filter Overhaul: update PLP pill navigation, breadcrumbs, search, and drawer filters for the 7 canonical categories. | Master Prompt B.3 | Stage 2 | PLANNED | Visiting `/shop/dry-fruits`, `/shop/dates`, etc. highlights correct pill and filters products accurately. | `src/components/CategoryPLP.tsx`, `src/pages/ShopPage.tsx` |
| **REQ-CAT-010** | Multilingual Category Names: provide English, Urdu, and Arabic names and banner descriptions for all 7 categories. | Master Prompt B.3 | Stage 2 | PLANNED | Switching language to `ur` or `ar` renders localized category titles and descriptions. | `src/contexts/catalogTranslations.ts`, `src/config/categories.ts` |

---

### 2.2 Packaging & Celebration Favors (PKG) — Stage 3

| Req ID | Description | Source | Stage | Status | Verification Criteria | Target Files |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-PKG-001** | Establish 5 Packaging Subcategories under `celebration-boxes`: (1) Signature Tin Boxes, (2) Hajj & Umrah Tabarruk Sets, (3) Wedding Favor Boxes & Pouches, (4) Baby Announcement Boxes, (5) Personalized Acrylic Boxes. | Master Prompt B.4 | Stage 3 | PLANNED | Category metadata includes all 5 subcategories; subcategory filter tabs render on `/celebration-boxes`. | `src/config/categories.ts`, `src/pages/CelebrationBoxesPage.tsx` |
| **REQ-PKG-002** | Expand catalog to at least 6 distinct products per subcategory (minimum 30 packaging products total). | Master Prompt B.4 | Stage 3 | PLANNED | Database contains >= 30 active packaging products with distinct IDs, names, images, and prices. | `src/data/products.ts` |
| **REQ-PKG-003** | Rule D1 — Packaging Minimum Order Quantity (MOQ): Enforce `min(25, max(1, ceil(5000 / publishedPerPiecePrice)))` with admin override. | Confirmed Rule D1 | Stage 3 | PLANNED | Unit test verifies: Rs. 100 -> 25; Rs. 300 -> 17; Rs. 500 -> 10; Rs. 1000 -> 5; Rs. 6000 -> 1. Cart blocks lower qty. | `src/lib/packagingMoq.ts`, `src/components/ProductCard.tsx`, `src/pages/ProductDetailPage.tsx` |
| **REQ-PKG-004** | Rule D1 — Design isolation: MOQ does not pool across different designs. | Confirmed Rule D1 | Stage 3 | PLANNED | Attempting to buy 15 of Design A and 10 of Design B fails MOQ check if each has MOQ 25. | `src/lib/orderValidation.ts`, `src/contexts/CartContext.tsx` |
| **REQ-PKG-005** | Rule D1 — Food exemption: MOQ applies strictly to packaging items, never to food/dry fruit products. | Confirmed Rule D1 | Stage 3 | PLANNED | Dry fruits, dates, honey can be purchased at quantity = 1. | `src/lib/packagingMoq.ts` |
| **REQ-PKG-006** | Hajj & Umrah Tabarruk Sets Default Mode: Bottles and boxes are EMPTY by default; optional fillings are explicit additions. | Master Prompt B.4 | Stage 3 | PLANNED | Default selection for Tabarruk products is "Empty Packaging Set" with explicit filling upsell pills. | `src/data/products.ts`, `src/pages/ProductDetailPage.tsx` |
| **REQ-PKG-007** | Rule D3 — Custom Order Lead Time: Minimum 10 calendar days lead time for custom packaging orders. | Confirmed Rule D3 | Stage 3 | PLANNED | Packaging items with custom monogram/printing enforce earliest delivery date >= orderDate + 10 calendar days. | `src/lib/deliveryCalendar.ts`, `src/pages/CheckoutPage.tsx` |
| **REQ-PKG-008** | Rule D4 — Dual Order Mode: Standard priced items support direct checkout; unpriced custom configurations route to inquiry modal. | Confirmed Rule D4 | Stage 3 | PLANNED | Fixed tiers allow Add to Cart; "Custom Spec / Target Budget" opens `CustomQuoteModal`. | `src/components/CustomQuoteModal.tsx`, `src/pages/ProductDetailPage.tsx` |
| **REQ-PKG-009** | Dedicated `/celebration-boxes` Collection Page: Full PLP with subcategory pill filter, search, MOQ indicators, and Quick View. | Master Prompt B.4 | Stage 3 | PLANNED | Visiting `/celebration-boxes` renders responsive grid with subcategory tabs and working modals. | `src/pages/CelebrationBoxesPage.tsx`, `src/App.tsx` |
| **REQ-PKG-010** | Packaging Product Studio Visuals: High-res WebP images for all 30+ packaging products with zero text watermarks or overlays. | Master Prompt B.4 | Stage 3 | PLANNED | All packaging products have verified local images in `public/images/products/`. | `src/data/products.ts`, `public/images/products/` |

---

### 2.3 Navigation & Header Overhaul (NAV) — Stage 4

| Req ID | Description | Source | Stage | Status | Verification Criteria | Target Files |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-NAV-001** | Desktop Top-Level Navigation Structure: (1) Home, (2) Shop (with canonical category dropdown), (3) Celebration & Bid Boxes (`/celebration-boxes`), (4) Deals & Packages (`/deals`), (5) Custom Hampers (builder modal), (6) Journal (`/journal`), (7) Contact (`/pages/contact`). | Master Prompt B.1 | Stage 4 | PLANNED | Header renders all 7 items with active indicators and correct route navigation. | `src/components/BubbleMenu.tsx`, `src/layouts/RootLayout.tsx` |
| **REQ-NAV-002** | Eliminate Hover Bridge Gap in `BubbleMenu`: Dropdown menu must attach seamlessly without mouseleave dead zones. | Master Prompt B.1 | Stage 4 | PLANNED | Dropdown has invisible pseudo-element bridge or zero gap with padding buffer; stays open when moving cursor into menu. | `src/components/BubbleMenu.tsx` |
| **REQ-NAV-003** | Keyboard Accessibility in Desktop Header: Full Enter/Space/Escape triggers, arrow navigation, `aria-haspopup`, `aria-expanded`. | Master Prompt B.1 | Stage 4 | PLANNED | Tabbing to "Shop" and pressing Enter opens dropdown; Escape closes and restores focus; Arrow keys navigate items. | `src/components/BubbleMenu.tsx` |
| **REQ-NAV-004** | Responsive Breakpoints for Header: Center navigation gracefully handles viewports between 1024px and 1280px without clipping or hiding. | Master Prompt B.1 | Stage 4 | PLANNED | Header layout tested at 1024px, 1280px, 1440px; no horizontal overflow or hidden menu triggers. | `src/layouts/RootLayout.tsx` |
| **REQ-NAV-005** | Mobile Navigation Drawer Strict Ordering: (1) Account/Login, (2) Cart with live count, (3) Language selector (en/ur/ar), (4) Theme selector (light/dark/auto), (5) Our Collections (7 canonical categories), (6) Social buttons (WhatsApp/Instagram). | Master Prompt B.1 | Stage 4 | PLANNED | MobileMenu DOM order matches exact specification; all buttons trigger correct drawers/pages. | `src/components/MobileMenu.tsx` |
| **REQ-NAV-006** | Mobile Drawer Trap & Scroll Lock: Accessible focus trap, reference-counted background scroll lock, Escape key dismiss. | Master Prompt B.1 | Stage 4 | PLANNED | Screen readers can navigate mobile drawer; background does not scroll; closing restores focus to hamburger button. | `src/components/MobileMenu.tsx`, `src/utils/scrollLock.ts` |
| **REQ-NAV-007** | Sticky Header Transition: Smooth height/blur/border transition on scroll (>24px) without layout shift or jitter. | Master Prompt B.1 | Stage 4 | PLANNED | CSS transitions verified; no jumping content below header on scroll. | `src/layouts/RootLayout.tsx` |

---

### 2.4 Merchandising & Homepage Reconstruction (HOME) — Stage 5

| Req ID | Description | Source | Stage | Status | Verification Criteria | Target Files |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-HOME-001** | Replace static homepage product grids with "Boutique Selections" unified showcase. | Master Prompt B.2 | Stage 5 | PLANNED | `BidBoxesSection` and `DealsPackagesSection` removed from `HomePage.tsx`; replaced with `BoutiqueSelections.tsx`. | `src/pages/HomePage.tsx`, `src/components/BoutiqueSelections.tsx` |
| **REQ-HOME-002** | Boutique Selections Category Tabs: 7 tabs matching canonical categories (Dry Fruits default). Exactly 3 products per tab (21 total). | Master Prompt B.2 | Stage 5 | PLANNED | Clicking each category tab switches visible products smoothly; exactly 3 products displayed. | `src/components/BoutiqueSelections.tsx` |
| **REQ-HOME-003** | Rule D5 — Boutique Selections Autoplay: 6000ms cycling interval between category tabs. | Confirmed Rule D5 | Stage 5 | PLANNED | Timer advances active category tab every 6000ms when idle. | `src/components/BoutiqueSelections.tsx` |
| **REQ-HOME-004** | Rule D5 — Pause on Interaction: Pause for full duration of hover anywhere on section. Pause on focus/swipe. Wait 3000ms after mouse leaves before resuming. | Confirmed Rule D5 | Stage 5 | PLANNED | Autoplay pauses on mouseenter; resumes 3000ms after mouseleave; pauses when keyboard focus is inside. | `src/components/BoutiqueSelections.tsx` |
| **REQ-HOME-005** | Rule D5 — Play/Pause Control & Reduced Motion: Explicit accessible play/pause toggle button. Disabled by default if `prefers-reduced-motion`. | Confirmed Rule D5 | Stage 5 | PLANNED | Play/pause button toggles state with accessible label; reduced motion disables auto-advance. | `src/components/BoutiqueSelections.tsx` |
| **REQ-HOME-006** | Product Card Interactivity: Every card in Boutique Selections has image, title, weight pills, live price, Quick View, and Add to Cart. | Master Prompt B.2 | Stage 5 | PLANNED | Changing weight pill updates price; clicking card navigates to PDP; Quick View opens modal without navigation. | `src/components/ProductCard.tsx`, `src/components/BoutiqueSelections.tsx` |
| **REQ-HOME-007** | Collection Discovery Cards: Two high-impact visual banner cards linking to `/celebration-boxes` and `/deals`. | Master Prompt B.2 | Stage 5 | PLANNED | Replaces redundant full-bleed product grids with curated editorial discovery cards. | `src/pages/HomePage.tsx` |
| **REQ-HOME-008** | Dedicated `/deals` Page: Curated bundles, multi-buy packs, and seasonal value packages with full store card capabilities. | Master Prompt B.2 | Stage 5 | PLANNED | Route `/deals` renders dedicated PLP of bundles/deals with sorting and filtering. | `src/pages/DealsPage.tsx`, `src/App.tsx` |
| **REQ-HOME-009** | Homepage Layout Performance: Zero CLS (Cumulative Layout Shift) across transitions; fixed container heights for tabs. | Master Prompt B.2 | Stage 5 | PLANNED | Cross-fade tab transition maintains height; Lighthouse CLS < 0.05. | `src/components/BoutiqueSelections.tsx` |

---

### 2.5 Cart, Checkout & Orders Hardening (CHK) — Stage 6

| Req ID | Description | Source | Stage | Status | Verification Criteria | Target Files |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-CHK-001** | Server-Side Authoritative Pricing: Recalculate and validate every cart item against canonical database rates on checkout quote and order placement. | Master Prompt B.5 | Stage 6 | PLANNED | Client-manipulated price in request body is ignored; server computes exact price from canonical record. | `src/lib/orderValidation.ts`, `server.ts` |
| **REQ-CHK-002** | Shipping Rate Accuracy: Lahore Same-Day (Rs. 500 / Rs. 300 above 3k), Lahore Standard (Rs. 150 / Free above 3k), Lahore Express (Rs. 350), Outside Lahore (Rs. 250/kg). | Master Prompt B.5 | Stage 6 | PLANNED | Unit tests verify all shipping tiers across Lahore and non-Lahore postal destinations. | `src/lib/shippingPolicy.ts`, `src/lib/deliveryCalendar.ts` |
| **REQ-CHK-003** | Rule D3 — Lead Time Verification: Custom packaging orders in checkout enforce minimum 10 calendar days lead time. | Confirmed Rule D3 | Stage 6 | PLANNED | Order payload containing custom packaging sets delivery date >= 10 days out; displays notice to user. | `src/lib/deliveryCalendar.ts`, `src/pages/CheckoutPage.tsx` |
| **REQ-CHK-004** | Rule D4 — Quote-Only Item Separation: Items requiring manual quotation cannot proceed through standard checkout; routes to inquiry flow. | Confirmed Rule D4 | Stage 6 | PLANNED | Cart containing quote-only items prompts user to submit bargain quote or separates checkout batches. | `src/contexts/CartContext.tsx`, `src/pages/CheckoutPage.tsx` |
| **REQ-CHK-005** | Packaging MOQ Cart Enforcement: Cart Drawer and Checkout validate that packaging items meet their respective MOQ. | Confirmed Rule D1 | Stage 6 | PLANNED | Quantity decrement button stops at MOQ; direct manual entry below MOQ snaps back with explanatory tooltip. | `src/components/CartDrawer.tsx`, `src/pages/CartPage.tsx`, `src/contexts/CartContext.tsx` |
| **REQ-CHK-006** | Coupon & Patron Loyalty Engine: Apply welcome coupons, seasonal promo codes, and loyalty reward points cleanly. | Master Prompt B.5 | Stage 6 | PLANNED | Existing test suites `promo-engine.test.ts` and `promo-checkout.test.ts` continue to pass 100%. | `src/lib/couponEngine.ts`, `src/server/promoEligibility.ts` |
| **REQ-CHK-007** | Order Outbox Worker: Ensure all orders enqueue outbox jobs for n8n notification with retry backoff and idempotency. | Master Prompt B.5 | Stage 6 | PLANNED | Test suite `order-outbox.test.ts` passes; duplicate triggers do not resend order notifications. | `src/services/orderOutboxWorker.ts` |

---

### 2.6 Admin Dashboard Expansion (ADM) — Stage 7

| Req ID | Description | Source | Stage | Status | Verification Criteria | Target Files |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-ADM-001** | Rule D6 — Admin Merchandising Tab: Manage Boutique Selections (3 products per category tab), featured IDs, banner controls, and preview mode. | Confirmed Rule D6 | Stage 7 | PLANNED | Admin can select 3 products per category; save to Firestore `merchandising/settings`; preview before publish. | `src/components/AdminMerchandisingPanel.tsx`, `src/pages/AdminOrdersPage.tsx` |
| **REQ-ADM-002** | Rule D2 — Pricing & Import Rules Tab: Initial Import Markup (`sellingPrice = referencePrice * 1.05`) applied once on new imports. | Confirmed Rule D2 | Stage 7 | PLANNED | Admin UI displays reference price, calculates 5% markup, allows manual override, records import timestamp. | `src/components/AdminPricingRulesPanel.tsx`, `src/pages/AdminOrdersPage.tsx` |
| **REQ-ADM-003** | Inquiries & Custom Quotes (Bargain Desk) Integration: Full management of incoming quote requests, wholesale inquiries, contact messages. | Master Prompt B.6 | Stage 7 | PLANNED | Admins can view inquiries, filter by status (`NEW`, `CONTACTED`, `QUOTED`, `APPROVED`, `CLOSED`), set agreed rate, and pitch on WhatsApp. | `src/components/AdminInquiriesPanel.tsx`, `src/pages/AdminOrdersPage.tsx` |
| **REQ-ADM-004** | Complete 7-Tab Admin Layout: (1) Overview, (2) Orders, (3) Catalogue, (4) Merchandising, (5) Inquiries & Quotes, (6) Store Updates, (7) Pricing & Import Rules. | Master Prompt B.6 | Stage 7 | PLANNED | Tab switcher in `AdminOrdersPage.tsx` mounts all 7 panels cleanly with role-based access checks. | `src/pages/AdminOrdersPage.tsx` |
| **REQ-ADM-005** | Packaging MOQ Admin Override: Allow admins to set custom MOQ per product, overriding default D1 formula. | Confirmed Rule D1 | Stage 7 | PLANNED | Admin can input custom MOQ in Catalog Editor; updates Firestore product document `moqOverride`. | `src/components/AdminCatalogPanel.tsx`, `src/lib/adminCatalog.ts` |
| **REQ-ADM-006** | Packing Slip Generation: Thermal/A4 print-ready packing slips with customer info, order items, delivery schedule, and notes. | Master Prompt B.6 | Stage 7 | PLANNED | Packing preview modal formats cleanly for browser print dialog; hides admin chrome. | `src/pages/AdminOrdersPage.tsx` |

---

### 2.7 WhatsApp & n8n Integration Polish (N8N) — Stage 8

| Req ID | Description | Source | Stage | Status | Verification Criteria | Target Files |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-N8N-001** | WhatsApp Products Feed (`/api/integrations/n8n/wa-products`): Export updated 7-category catalog with current prices and stock in CSV/JSON. | Master Prompt B.7 | Stage 8 | PLANNED | Endpoint returns valid CSV with headers required by WhatsApp Catalog import; passes authentication. | `src/lib/waProductsExport.ts`, `server.ts` |
| **REQ-N8N-002** | Dynamic Catalog Sync: n8n webhook syncs price and stock changes bidirectionally between Google Sheets and Firestore. | Master Prompt B.7 | Stage 8 | PLANNED | Integration tests `tests/inquiry-and-sync-security.test.ts` pass; no duplicate writes or state regression. | `src/lib/n8nCommerceRouter.ts`, `server.ts` |
| **REQ-N8N-003** | Meta Webhook Inbound Ingestion: Ingest signed WhatsApp customer messages for concierge routing and tracking receipts. | Master Prompt B.7 | Stage 8 | PLANNED | All 58 tests in `tests/whatsapp-commerce.test.ts` pass; replay protection and STOP opt-out enforced. | `src/lib/whatsappCommerce.ts` |
| **REQ-N8N-004** | Integration Security & Rate Limiting: Strict header authentication (`x-n8n-integration-secret`), IP rate limits, payload validation. | Master Prompt B.7 | Stage 8 | PLANNED | Integration tests verify 401 on missing secret, 403 on invalid source, 429 on rate limit. | `src/lib/integrationAuthentication.ts` |

---

### 2.8 Production Readiness, Performance & QA (QA) — Stage 8

| Req ID | Description | Source | Stage | Status | Verification Criteria | Target Files |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-QA-001** | Full TypeScript Typecheck: `npm run typecheck` passes with zero errors across the entire codebase. | Master Prompt B.8 | Stage 8 | PLANNED | `tsc --noEmit` exits with status code 0. | Entire codebase |
| **REQ-QA-002** | Full Production Build: `npm run build` succeeds, generating optimized client bundle and `build/server.cjs`. | Master Prompt B.8 | Stage 8 | PLANNED | `npm run build` generates dist artifacts and passes `audit-release.mjs`. | `vite.config.ts`, `server.ts` |
| **REQ-QA-003** | Comprehensive Test Suite Execution: All existing and new unit/integration tests pass 100%. | Master Prompt B.8 | Stage 8 | PLANNED | `npm run test` and `npm run test:integrations` exit 0 with 0 failures. | `tests/*.ts` |
| **REQ-QA-004** | Strict Content Security Policy (CSP): Helmet CSP nonce policy allows required scripts, fonts, styles, and assets without console violations. | Master Prompt B.8 | Stage 8 | PLANNED | Production response headers include valid CSP; zero inline script blocking. | `server.ts` |
| **REQ-QA-005** | Static Asset & Image Optimization: All product images use modern WebP format with responsive srcset and lazy loading. | Master Prompt B.8 | Stage 8 | PLANNED | No broken image links; images load efficiently under 150KB per asset. | `public/images/` |
| **REQ-QA-006** | SEO Metadata & Structured Data: Dynamic OpenGraph, Twitter Cards, Schema.org `Product` and `Organization` JSON-LD. | Master Prompt B.8 | Stage 8 | PLANNED | Google Rich Results test valid for product pages; social sharing previews show correct title/image. | `src/components/SEO.tsx` |
| **REQ-QA-007** | Branching & Release Hygiene: All work verified on `feat/renovation-v2`, merged to `main` and `launch` only upon explicit approval. | Operating Rules | Stage 8 | PLANNED | `main` and `launch` match exact HEAD commit hash upon production deployment. | Git repository |

---

**End of Requirements Traceability Matrix**
