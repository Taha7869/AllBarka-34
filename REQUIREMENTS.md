# ALLBARKA LUXURY BOUTIQUE — MASTER REQUIREMENTS TRACEABILITY MATRIX

**Project Title:** AllBarka Luxury Dry Fruits, Spices & Gourmet Gifts  
**Architecture:** React 18 + Vite + Tailwind CSS + Express (Port 3000)  
**Location / Brand Origin:** Lahore, Pakistan (Gulberg III & DHA)  
**Current Phase:** Batch 4 Completed -> Transitioning to Batch 5  

---

## 📋 Batch 4 Requirements Status Matrix (B4-01 to B4-08)

| ID | Module / Requirement | Scope & Criteria | Status | Verification Evidence |
|---|---|---|---|---|
| **B4-01** | **Semantic Theme & Contrast Architecture** | Establish strict semantic color system: `--color-base`, `--color-surface`, `--color-surface-elevated`, `--color-surface-subtle`, `--color-ink`, `--color-ink-muted`, `--color-accent`, `--color-border`. Enforce WCAG AA contrast (≥4.5:1 text, ≥3:1 UI controls) in both light (#F6F1EA) and dark (#121615) themes. Zero dark text on dark surfaces; zero pure black/white slop. System OS dark mode detection + instant anti-flash script. | **VERIFIED PASS** | Defined in `src/index.css`. Corrected `--color-cream` dark override to retain light ivory hue (`#F6F1EA`). Anti-flash script in `index.html` updated with `colorScheme` sync. `OrderSuccessPage.tsx` and `HomePage.tsx` converted to semantic CSS variables. |
| **B4-02** | **Typography & Complete Localization** | Distinctive typography pairings (`Playfair Display`, `Amiri`, `Noto Nastaliq Urdu`, `Inter`, `Satoshi`). No unstyled text, zero Latin fallback glitches for Urdu/Arabic. Full localization across English, Urdu (اردو), and Arabic (العربية) with dynamic document direction (`dir="ltr"` / `dir="rtl"`). Enhanced dictionary for all shopping, checkout, concierge, and newsletter actions. | **VERIFIED PASS** | Updated `src/contexts/LanguageContext.tsx` with complete English, Urdu, and Arabic string dictionaries. Configured `src/index.css` with dedicated font stacks, line-height compensation (1.75 for Urdu, 1.4 for headings), `.rtl-flip`, and `.rtl-no-flip` classes. |
| **B4-03** | **Header, Mobile Menu & Navigation** | Sticky top bar with luxury crest logo, localized search placeholder animation, currency indicators (PKR), bag count badge, patron status. Mobile drawer follows strict sequence: 1. Patron Lounge, 2. Shopping Bag, 3. Language Selector, 4. Theme Selector, 5. Boutique Collections, 6. Concierge & Socials. Touch targets ≥44px, scroll lock, ESC dismiss, focus restore. | **VERIFIED PASS** | Verified in `src/layouts/RootLayout.tsx` and `src/components/MobileMenu.tsx`. Drawer sequence matches master spec with ARIA labels, smooth sliding spring transitions, and focus management. |
| **B4-04** | **Premium Boutique Footer** | Trust assurance strip with 3 verified facts (Unbleached & Pure, Lahore Express Dispatch, Airtight Freshness Seal). 4 balanced columns on desktop (Brand & Sourcing, Collections, The Journal, Support & Dispatch + Boutique Concierge). Separate Private Reserve newsletter with real API endpoint, consent checkbox, and transparent terms. Mobile view prioritizes brand and newsletter, single-open accordion groups, dual social buttons. | **VERIFIED PASS** | Verified in `src/components/Footer.tsx`. Validated single-accordion behavior (`openSection`), consent validation, graceful local storage fallback, and deep emerald `#042821` luxury contrast. |
| **B4-05** | **Page, Card & Form Visual Consistency** | Uniform border radius hierarchy (24px cards, 12-16px inner elements, pills for buttons). Product cards feature warm ivory surface, subtle champagne gold borders, clear status badges (In Stock, Organic, Hand-Graded), and responsive quick view/add-to-cart triggers. No competing border-radii or nested card clutter. | **VERIFIED PASS** | Audited in `src/components/ProductCard.tsx`, `QuickViewModal.tsx`, `HomePage.tsx`, and `ShopPage.tsx`. Semantic border accents and clean typography hierarchy maintained throughout. |
| **B4-06** | **Mobile & Desktop Scroll Showcase & Motion** | Parallax depth on hero flatlay with mouse tracking on desktop, lightweight touch performance on mobile. Category sliding showcase with drag-to-scroll desktop mouse pointer support and native momentum swipe on mobile. Drag detection (6px threshold) prevents accidental link activation. Reduced-motion (`prefers-reduced-motion: reduce`) disables parallax and smooth scrolling across components. | **VERIFIED PASS** | Updated `src/components/AllBarkaHero.tsx` with `useReducedMotion()`. `useDragScroll.ts` mouse-drag vs native touch verified. Added global reduced-motion overrides in `src/index.css` and `src/components/BackToTop.tsx`. |
| **B4-07** | **Interaction Feedback & Loading States** | Immediate visual tactile feedback on all interactive elements (buttons, quantity toggles, search pills, accordion headers). Subtle hover scaling, active press transitions (`active:scale-95`), accessible loading spinners with ARIA live announcements. Toast and modal notifications for bag operations. | **VERIFIED PASS** | Integrated across `CartDrawer.tsx`, `ProductSlider.tsx`, `QuickViewModal.tsx`, and `RootLayout.tsx`. |
| **B4-08** | **Accessibility & Performance Verification** | Full keyboard navigation, semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`), valid heading hierarchy (H1 -> H2 -> H3), contrast pass on all surfaces, zero console build or lint errors, fast bundle load with code-split lazy routes. | **VERIFIED PASS** | `npm run lint` (`tsc --noEmit`) passes with 0 errors. `compile_applet` succeeds cleanly. WebP assets utilized for optimal mobile throughput. |

---

## 📌 Prior Batches Summary
- **Batch 1 (Core Foundations):** Vite + Express full-stack scaffold, Master Color Tokens, Product Catalog models, Store Config (`STORE_CONFIG`).
- **Batch 2 (Catalogue & Exploration):** ShopPage with search, category filtering, price sort, Wholesale mode, Gifting/Hamper curation, QuickViewModal, ProductDetailPage.
- **Batch 3 (Cart, Checkout, Auth & Orders):** CartDrawer, CheckoutPage with 3-step checkout, coupon validation (`ALLBARKA10`), Lahore delivery slots, bank transfer & COD, OrderSuccessPage with WhatsApp Concierge direct linking, PatronLounge modal.

---

## 🎯 Batch 5 Objectives (Next Action)
- Final production hardening & telemetry auditing.
- End-to-end checkout & payment verification across edge cases.
- PWA manifest & offline resilience verification.
- SEO meta tags, OpenGraph luxury card previews, sitemap, and structured JSON-LD schema markup.
