# AllBarka Renovation Requirements Traceability Matrix (RTM)

**Document Version:** 2.1.0  
**Baseline Git Commit:** `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`  
**Active Working Branch:** `feat/renovation-v2`  
**Authority:** `AllBarka_Antigravity_Master_Prompt (1).md` (Version 2.0 — Final Agreed Scope, 17 Oct 2026)  
**Status:** Stage 1 Approved Baseline (Awaiting User Sign-off to Begin Stage 2)

---

## 1. Traceability Matrix Structure & Legend
- **Req ID:** Unique Identifier grouped by Stage:
  - `REQ-S1-xxx`: Stage 1 — Repository Audit, Requirements and Migration Plan
  - `REQ-S2-xxx`: Stage 2 — Data Model, Complete Admin CRUD and Safe Migrations
  - `REQ-S3-xxx`: Stage 3 — Canonical Prices, Variants, MOQ and Order Compatibility
  - `REQ-S4-xxx`: Stage 4 — Navigation and Dropdown Redesign
  - `REQ-S5-xxx`: Stage 5 — Collection Pages, Occasions, Content and Media
  - `REQ-S6-xxx`: Stage 6 — Customization Inquiries and WhatsApp Handoff
  - `REQ-S7-xxx`: Stage 7 — AllBarka Gifting Buddy
  - `REQ-S8-xxx`: Stage 8 — Integration QA and Reviewable Release Candidate
- **Status:** `PLANNED` | `IN_PROGRESS` | `VERIFIED` | `BLOCKED`

---

## 2. Requirements by Stage

### Stage 1: Repository Audit, Requirements and Migration Plan

| Req ID | Description | Source | Status | Implementation Paths | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-S1-001** | Audit existing routes, navbar/mobile menu, category aliases, compiled `PRODUCTS`, cart/order validation, catalog schema/store/router/context, admin editors, media tooling, Firestore rules, inquiry endpoints, AI bridge, and n8n scripts. | Master Prompt Stage 1 | VERIFIED | `docs/RENOVATION_PLAN.md`, `docs/RENOVATION_REQUIREMENTS.md` | Audit documented with actual file references, line numbers, and verified baseline test outputs. |
| **REQ-S1-002** | Formulate current-to-target migration mapping preserving stable product IDs, historical receipts, and explaining legacy category splitting without naive 1:1 aliasing. | Master Prompt Stage 1 & C | VERIFIED | `docs/RENOVATION_PLAN.md` (Section 3) | Mapping covers all 97 existing products, distinguishing product family, collection, occasion, and personalization. |
| **REQ-S1-003** | Record investigation leads and observed backend gaps without presenting mock test assertions as production wiring proof. | Master Prompt Stage 1 & User Review | VERIFIED | `docs/RENOVATION_PLAN.md` (Section 1.6) | Gaps documented: in-memory inquiry fallback on absent DB; wa-products compiled fallback on catalog failure; dynamic merge loader verification. |
| **REQ-S1-004** | Deliver complete Stage 1 review packet and halt at acceptance gate without code modifications, database mutations, or deployment. | Master Prompt Stage 1 & Operating Rules | VERIFIED | `docs/RENOVATION_HANDOFF.md`, Chat Review Packet | Feature branch `feat/renovation-v2` clean; zero commits on `launch`/`main`; explicit user sign-off required. |

---

### Stage 2: Data Model, Complete Admin CRUD and Safe Migrations

| Req ID | Description | Source | Status | Implementation Paths | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-S2-001** | Canonical Information Architecture: Model product family (what the item is), collections (curated commercial groupings), occasions (many-to-many tags), personalization options, and sale modes. | Master Prompt Stage 2 & C | PLANNED | `src/types/index.ts`, `src/config/categories.ts`, `src/lib/catalogSchema.ts` | Type definitions distinguish physical item taxonomy from commercial collections and occasion tags. |
| **REQ-S2-002** | Approved 6 Food Categories: `dry-fruits` (Dry Fruits & Nuts), `dates` (Dates), `seeds-snacks` (Seeds & Snacks), `oils` (Oils), `essentials` (Desi Essentials), `herbs-spices` (Herbs & Spices). Keep honey, ghee, panjeeri, shakkar in Desi Essentials. | Master Prompt C & User Review | PLANNED | `src/config/categories.ts`, `src/data/products.ts` | Categories defined exactly per prompt; no `oils-honey` or `seeds-nuts` categories created. |
| **REQ-S2-003** | Commercial Collections: `combos` (Gifts & Hampers), `celebration-boxes` (Celebration Boxes), `deals` (Deals), plus related collection `personalized-treats` (Personalized Treats & Wrappers). | Master Prompt B & C | PLANNED | `src/config/categories.ts`, `src/lib/catalogDiscovery.ts` | Collections support cross-family inclusion without altering physical product families. |
| **REQ-S2-004** | Complete Dynamic Product CRUD: Admin must create, edit, duplicate-as-draft, publish, and archive products directly in Firestore without source code redeployment. | Master Prompt Stage 2 Gate | PLANNED | `src/lib/adminCatalog.ts`, `src/components/AdminCatalogPanel.tsx`, `server.ts` | Acceptance Gate: Create product absent from compiled `PRODUCTS` via admin; survives reload; functions in catalog, PDP, cart, orders, and AI context. |
| **REQ-S2-005** | Security & Stale-Edit Protection: Enforce server-side authentication with trusted admin claims; reject unauthorized mutations; enforce concurrency/revision checks; keep private fields (sourcing cost, draft notes, supplier data) out of public responses. | Master Prompt Stage 2 | PLANNED | `server.ts`, `src/lib/adminOperations.ts`, `firestore.rules` | Regression tests verify: anonymous write rejected with 401/403; stale revision rejected with 409 conflict; public API response strips private fields. |
| **REQ-S2-006** | End-to-End Dynamic Catalog Loaders: Audit and upgrade all code assuming compiled `PRODUCTS` list (including `catalogStore.ts`, transaction loaders, and frontend `CatalogContext.tsx`). Inactive Firestore products must not be revived by compiled fallbacks. | Master Prompt Stage 1 & 2 | PLANNED | `src/lib/catalogStore.ts`, `src/contexts/CatalogContext.tsx`, `server.ts` | Unit tests verify Firestore `active: false` suppresses compiled items across all storefront loaders. |
| **REQ-S2-007** | Safe, Idempotent Migrations: Provide dry-run, conflict-aware migration script and rollback instructions; never overwrite merchant edits or delete existing records. | Master Prompt Stage 2 | PLANNED | `scripts/migrate-catalog-v2.ts`, `docs/CATALOG-OPERATIONS.md` | Dry-run logs planned mutations without writes; re-running leaves existing admin modifications intact. |

---

### Stage 3: Canonical Prices, Variants, MOQ and Order Compatibility

| Req ID | Description | Source | Status | Implementation Paths | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-S3-001** | Single Authoritative Pricing Representation: Derive all display summaries, bulk pack calculations, and filled-option labels from canonical catalog prices; eliminate stale duplication in `bidBoxConfig`. | Master Prompt Stage 3 | PLANNED | `src/data/products.ts`, `src/lib/pricing.ts`, `src/pages/ProductDetailPage.tsx` | All storefront card, detail, cart, and quote views read canonical product pricing exclusively. |
| **REQ-S3-002** | Separation of Pack Quantities, Net Weight & Shipping Weight: Separate per-piece price, pieces-per-pack, and ordered quantity; never multiply pack quantities twice; distinguish packaging capacity, net contents weight, and delivery billing weight. | Master Prompt Stage 3 | PLANNED | `src/lib/cartInput.ts`, `src/lib/orderValidation.ts`, `src/lib/shippingPolicy.ts` | Ordering 2 packs of 25 pcs computes 50 pcs at pack unit rate; shipping weight calculated strictly from physical billing weight. |
| **REQ-S3-003** | Rule D1 — Packaging Minimum Order Quantity (MOQ): Enforce `min(25, max(1, ceil(5000 / publishedPerPiecePrice)))` with admin product/variant override. | Confirmed Rule D1 | PLANNED | `src/lib/packagingMoq.ts`, `src/components/ProductCard.tsx`, `src/pages/ProductDetailPage.tsx`, `src/lib/orderValidation.ts` | Test vectors pass: Rs. 100 -> 25; Rs. 200 -> 25; Rs. 300 -> 17; Rs. 500 -> 10; Rs. 1000 -> 5; Rs. 2000 -> 3; Rs. 6000 -> 1. No cross-design pooling. Food items exempt. |
| **REQ-S3-004** | Rule D2 — Initial Import Markup (5%): Initial NEW reference imports receive `sellingPrice = referencePrice * 1.05` exactly once. Re-import and manual admin saves must NOT compound markup. Existing merchant prices must not be overwritten. | Confirmed Rule D2 | PLANNED | `src/lib/adminCatalog.ts`, `src/components/AdminPricingRulesPanel.tsx` | Unit test proves initial import sets 5% markup; re-running import preserves existing prices; manual edit is final; checkout adds zero additional markup. |
| **REQ-S3-005** | Rule D3 — Custom Preparation Lead Time (10 Calendar Days): Minimum 10 calendar days lead time for custom packaging orders, scheduled after team approval and required advance. Transit is separate. | Confirmed Rule D3 | PLANNED | `src/lib/deliveryCalendar.ts`, `src/pages/CheckoutPage.tsx` | Date picker restricts earliest custom delivery to orderDate + 10 calendar days; displays scheduling notice. |
| **REQ-S3-006** | Rule D4 — Dual Order Mode: Standard fully priced products support direct checkout. Custom/unpriced configurations route to inquiry -> WhatsApp quote. Do NOT introduce automatic bulk discounts or artificial price tiers. | Confirmed Rule D4 & User Review | PLANNED | `src/pages/ProductDetailPage.tsx`, `src/components/CustomQuoteModal.tsx`, `src/lib/orderValidation.ts` | Fully priced standard items check out directly; custom specs route to inquiry; no unapproved bulk percentage discounts applied. |
| **REQ-S3-007** | Integration Export Consistency: `/api/integrations/n8n/wa-products` exports canonical catalog prices, respects inactive products, and handles catalog outage without silent stale fallback. | Master Prompt Stage 3 | PLANNED | `src/lib/waProductsExport.ts`, `server.ts` | Feed returns valid CSV/JSON with canonical rates; catalog read outage returns 503 rather than stale compiled prices. |

---

### Stage 4: Navigation and Dropdown Redesign

| Req ID | Description | Source | Status | Implementation Paths | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-S4-001** | Agreed Two-Level Header: Main row: `Shop \| Gifts & Hampers \| Celebration Boxes \| Occasions \| Deals`. Second, compact food-category row: `Dry Fruits & Nuts \| Dates \| Seeds & Snacks \| Oils \| Desi Essentials \| Herbs & Spices`. | Master Prompt C | PLANNED | `src/components/BubbleMenu.tsx`, `src/components/DesktopHeader.tsx`, `src/layouts/RootLayout.tsx` | Desktop header displays exact two-level hierarchy; logo links home; utility controls (search, account, cart) properly positioned. |
| **REQ-S4-002** | BubbleMenu Hit Area & Hover Gap Fix: Ensure continuous trigger-to-panel hit area, cancelable short close delay, and stable open state during diagonal/slow pointer movement. | Master Prompt Stage 4 | PLANNED | `src/components/BubbleMenu.tsx` | Pointer can move diagonally from trigger to submenu without closing; no visual gap disconnects hover state. |
| **REQ-S4-003** | Full Keyboard & Accessibility Navigation: Click/tap support, Enter/Space activation, sensible Tab order, Escape with focus restoration, outside-click dismissal, and `aria-expanded`/`aria-controls` attributes. | Master Prompt Stage 4 | PLANNED | `src/components/BubbleMenu.tsx` | Screen reader and keyboard navigation fully functional; no hover-only dependencies. |
| **REQ-S4-004** | Responsive & Mobile Navigation Drawer: Accessible drawer/accordion with identical taxonomy and compact category scroller. Preserve `lg`/`xl` breakpoint behavior with working fallback. | Master Prompt C & User Review | PLANNED | `src/components/MobileMenu.tsx`, `src/layouts/RootLayout.tsx` | Mobile drawer contains: (1) Account/Login, (2) Cart, (3) Language, (4) Theme, (5) Collections & Occasions, (6) Socials. Focus trapped, scroll locked. |
| **REQ-S4-005** | Legacy Slug Compatibility: Provide robust routing and redirect handling for old URLs (`/shop/nuts`, `/shop/bundles`, `/gifting`, `/wholesale`) without naive splitting. | Master Prompt C & User Review | PLANNED | `src/lib/catalogRouter.ts`, `src/config/categories.ts`, `src/App.tsx` | Legacy bookmarks resolve gracefully; `/shop/nuts` directs to Dry Fruits while offering Dates navigation notice. |

---

### Stage 5: Collection Pages, Occasions, Content and Media

| Req ID | Description | Source | Status | Implementation Paths | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-S5-001** | Homepage Reconstruction — Exact 6-Part Structure: (1) Dry-fruit-led hero, (2) Explore Our Collections (compact cards), (3) Boutique Selections (single showcase), (4) Find a Gift for Your Occasion, (5) Feedback & FAQ, (6) Footer. | Master Prompt Stage 5 | PLANNED | `src/pages/HomePage.tsx` | Structure matches exact prompt sequence; large product grids (`BidBoxesSection`, `DealsPackagesSection`) removed from homepage. |
| **REQ-S5-002** | Boutique Selections Showcase: Single homepage product showcase with tabs (Dry Fruits & Nuts default, Pantry, Gifts, Celebration Boxes, Deals). Exactly 3 admin-selected products per tab. | Master Prompt Stage 5 & D5 | PLANNED | `src/components/BoutiqueSelections.tsx`, `src/pages/HomePage.tsx` | Exactly 3 products rendered per active tab; "View Collection" link; no duplicate cards or fake badges. |
| **REQ-S5-003** | Rule D5 — Boutique Selections Autoplay: 6000ms rotation; pause on hover for full duration; resume 3000ms after pointer exit; manual tab/touch/focus pauses until explicit Play; visible Play/Pause control; reduced-motion off by default; pause on hidden tab (`document.visibilityState === 'hidden'`). | Confirmed Rule D5 | PLANNED | `src/components/BoutiqueSelections.tsx` | Component tests verify timing, hover hold, 3000ms delay, focus pause, visibility change hold, and reduced motion bypass. |
| **REQ-S5-004** | Rule D6 — Merchandising Settings: Firestore `merchandising/settings` stores featured IDs and category order. Skip inactive/unavailable items; hide empty tabs and advance to next valid category; admin preview/publish workflow; validated internal URLs. | Confirmed Rule D6 | PLANNED | `src/components/AdminMerchandisingPanel.tsx`, `src/lib/merchandisingStore.ts` | Published settings load dynamically; preview mode accessible only to admins; empty tabs gracefully collapse. |
| **REQ-S5-005** | Dedicated Collection & Occasion Pages: Build dedicated pages for `/celebration-boxes` (5 subcategories), `/deals`, `/corporate-gifting`, `/occasions/:slug`, `/customize`. | Master Prompt C & Stage 5 | PLANNED | `src/pages/CelebrationBoxesPage.tsx`, `src/pages/DealsPage.tsx`, `src/pages/OccasionPage.tsx`, `src/App.tsx` | Dedicated pages render full, responsive product lists with filters, Quick View, and clear packaging-only vs. filled status. |
| **REQ-S5-006** | Evidence-Based Product Expansion: Label unsourced packaging designs `PROPOSED`. Supported designs must reference verified supplier sources (`https://bidbox.pk`, `https://bidboxesonline.com`). Unsupported designs remain drafts/inquiries with explicit blockers. | Master Prompt B & User Review | PLANNED | `src/data/products.ts`, `docs/RENOVATION_PLAN.md` | All 30+ packaging products classified as VERIFIED, OWNER-CONFIRMED, or PROPOSED. Zero fabricated specifications or prices. |
| **REQ-S5-007** | Personalized Treats & Wrappers Collection: Include event sleeves, candy pouches, date packs, and treat packs within the broader gifting structure. | Master Prompt B & User Review | PLANNED | `src/config/categories.ts`, `src/data/products.ts` | Collection defined and linked under Gifting/Celebration packaging; supported products display personalization options. |

---

### Stage 6: Customization Inquiries and WhatsApp Handoff

| Req ID | Description | Source | Status | Implementation Paths | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-S6-001** | Product-Aware Inquiry Brief: Structured form capturing occasion, product/variant, quantity, budget (per-piece vs. total), packaging mode (empty vs. filled), desired contents, names/monogram, message, colors, logo/artwork request, city, event date. | Master Prompt Stage 6 | PLANNED | `src/components/CustomQuoteModal.tsx`, `src/components/CustomInquiryBrief.tsx` | Form validates required fields, distinguishes per-piece vs total budget, and prepares structured payload. |
| **REQ-S6-002** | Secure Artwork Handling: Offer file upload only if authenticated, size-limited private storage is configured; otherwise prompt customer to share artwork via WhatsApp without pretending an upload exists. | Master Prompt Stage 6 | PLANNED | `src/components/CustomQuoteModal.tsx`, `src/lib/artworkUpload.ts` | Upload UI conditionally renders based on storage readiness; fallback to direct WhatsApp attachment. |
| **REQ-S6-003** | Persist Before Claiming Received: Inquiry must be successfully written to Firestore before displaying receipt confirmation. On failure, customer's draft must be preserved with retry or explicit unsaved WhatsApp handoff. | Master Prompt Stage 6 & User Review | PLANNED | `src/lib/storefrontSubmissions.ts`, `server.ts` | Integration tests verify: DB failure retains form state, offers retry, and returns valid WhatsApp link marked `UNSAVED`. |
| **REQ-S6-004** | Admin Inquiry Management (Bargain Desk): Admins review inquiries, update status (`NEW`, `CONTACTED`, `QUOTED`, `APPROVED`, `CLOSED`), set agreed rate, and pitch on WhatsApp. Public endpoints cannot inject staff fields (`adminNotes`, `finalAgreedPrice`). Rate-limit public endpoints. | Master Prompt Stage 6 | PLANNED | `src/components/AdminInquiriesPanel.tsx`, `server.ts` | Regression tests verify: public submission ignores staff fields; admin updates persist with actor audit; rate limiting enforces 60 req/min. |
| **REQ-S6-005** | Tabarruk Default Empty Mode Notice: Explicitly communicate that Tabarruk bottles and base packaging are EMPTY by default; optional fillings (dates, nuts, water) are explicit additions with minimum 10-day lead time. | Master Prompt B & Stage 6 | PLANNED | `src/components/CustomQuoteModal.tsx`, `src/pages/ProductDetailPage.tsx` | Notice displayed in UI, persisted in inquiry record, and formatted in WhatsApp summary message. |

---

### Stage 7: AllBarka Gifting Buddy

| Req ID | Description | Source | Status | Implementation Paths | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-S7-001** | Multilingual Conversational AI: Extend existing verified AI bridge (Groq/Gemini); speak naturally in customer's English, Roman Urdu, Urdu, or Arabic; ask only 1-2 focused questions at a time. | Master Prompt Stage 7 | PLANNED | `src/services/aiConcierge.ts`, `src/components/AIConcierge.tsx` | Test conversations verify prompt discipline, language adaptation, and concise responses. |
| **REQ-S7-002** | Catalog vs. Sourced Add-ons: Distinguish stocked catalog products from potential sourced items (chocolates, candies, ribbons, sleeves). Never claim external items are stocked, halal-certified, or available at a guaranteed rate without data. | Master Prompt Stage 7 | PLANNED | `src/services/aiConcierge.ts` | Evaluation tests verify AI labels custom items as "sourced upon request" and refrains from making unverified certification claims. |
| **REQ-S7-003** | Server-Calculated Price Estimates: Known catalog item estimates must come from server calculations; unknown sourced items marked "pending team final quote". State known subtotal and pending components. | Master Prompt Stage 7 | PLANNED | `src/services/aiConcierge.ts`, `src/lib/orderQuote.ts` | AI outputs subtotal for catalog items and explicitly defers custom additions to concierge WhatsApp quote. |
| **REQ-S7-004** | Structured Inquiry Summary & WhatsApp Bridge: Offer an editable structured summary of recommendations and user-initiated WhatsApp handoff. Chat history cannot override store rules or authorize privileged operations. | Master Prompt Stage 7 | PLANNED | `src/components/AIConcierge.tsx`, `src/services/aiConcierge.ts` | Clicking handoff formats validated summary into WhatsApp link; memory strictly scoped to user session. |

---

### Stage 8: Integration QA and Reviewable Release Candidate

| Req ID | Description | Source | Status | Implementation Paths | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-S8-001** | Full-Suite Regression Verification: Run `npm run typecheck`, `npm run build`, and all unit/integration tests against actual application handlers (not mock routes). | Master Prompt Stage 8 & User Review | PLANNED | Entire codebase | Zero TypeScript errors, zero build warnings, 100% test pass rate across all suites. |
| **REQ-S8-002** | Edge Case & Resilience Testing: Test database absent, database failure, anonymous admin mutation rejection, staff-field injection, catalog outage, price changes during checkout, duplicate requests, and stale edits. | Master Prompt Stage 8 & User Review | PLANNED | `tests/backend.test.ts`, `tests/admin-security.test.ts` | Injected fault tests pass: DB down returns clean 503; anonymous admin returns 401; staff field injection stripped. |
| **REQ-S8-003** | End-to-End User Journeys: Verify Navigation -> Occasion -> Product -> Quantity/MOQ -> Authoritative Quote/Order or Saved Inquiry -> WhatsApp Handoff -> Admin Review. | Master Prompt Stage 8 | PLANNED | E2E test scripts | Full user journey executes on desktop, mobile, dark mode, and RTL languages. |
| **REQ-S8-004** | Release Candidate Deliverable: Deliver complete diff, migration dry-run evidence, rollback plan, and environment variable documentation. Stop before production database writes, deployment, or merge. | Master Prompt Stage 8 Gate | PLANNED | `docs/RENOVATION_HANDOFF.md` | Formal release candidate submitted for owner approval. No unauthorized production deployment. |

---

**End of Revised Requirements Traceability Matrix**
