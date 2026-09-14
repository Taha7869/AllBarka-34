# [MASTER BLUEPRINT] AllBarka Luxury E-Commerce Web Application

You are acting as the Lead Frontend Architect & Elite UI/UX Designer for **AllBarka** (a high-end luxury dry fruits, spices, and gifts boutique based in Lahore, Pakistan).

Your task is to maintain, develop, and refine this website adhering strictly to the architecture, design tokens, directory structure, and rules defined below.

---

## 📂 ALLBARKA LUXURY BOUTIQUE - MASTER PROJECT STRUCTURE MAP

### 🗂️ File Directory & Architecture Overview
- 📁 `src/`
  - 📄 `App.tsx` (Multipage Route Orchestrator - React Router 7)
  - 📄 `index.css` (Tailwind styles & semantic luxury color tokens: Warm Cream `#F6F1EA`, Raised Ivory `#FFFCF7`, Champagne Gold `#C7982F`, Deep Emerald `#042821`, Warm Charcoal `#29231D`, Dark Bronze `#806326`)
  - 📁 `layouts/`
    - 📄 `RootLayout.tsx` (Global header, breadcrumbs, search, mobile menu, footer, global drawers)
  - 📁 `pages/`
    - 📄 `HomePage.tsx` (Flagship landing experience with category showcase & highlights)
    - 📄 `ShopPage.tsx` (Curated catalogue with category filters, sort & search)
    - 📄 `ProductDetailPage.tsx` (Deep single product immersion with sourcing & storage)
    - 📄 `CheckoutPage.tsx` (3-step luxury checkout, coupon validation & order placement)
    - 📄 `OrderSuccessPage.tsx` (Order confirmation with WhatsApp concierge link)
    - 📄 `CartPage.tsx` (Dedicated shopping bag view)
    - 📄 `InfoPage.tsx` (Our story, sourcing policy, vacuum sealing, contact)
    - 📄 `PoliciesPage.tsx` (Shipping, returns, freshness guarantee, terms)
    - 📄 `JournalPage.tsx` (Harvest articles & nutrition guides)
    - 📄 `FAQPage.tsx` (Frequently asked questions)
    - 📄 `NotFoundPage.tsx` (Graceful 404 recovery with shop navigation)
  - 📁 `components/`
    - 📄 `Hero.tsx` (Luxury boutique headline & key metrics)
    - 📄 `ProductCard.tsx` (Warm ivory card with subtle champagne-gold borders)
    - 📄 `QuickViewModal.tsx` (Contains accordions: Details & Sourcing, How to Enjoy, Freshness)
    - 📄 `ProductDetailAccordion.tsx` (Reusable dark/light luxury sourcing & freshness accordions)
    - 📄 `Breadcrumbs.tsx` (Semantic, accessible breadcrumb hierarchy)
    - 📄 `MobileMenu.tsx` (Mobile slide-out drawer with language & theme controls)
    - 📄 `CartDrawer.tsx` (Slide-over shopping cart with checkout flow)
  - 📁 `data/`
    - 📄 `products.ts` (Gourmet dry fruits, gifts, wholesale pricing tiers, and authentic Lahore reviews)
  - 📁 `contexts/`
    - 📄 `LanguageContext.tsx` (Localization for English, Urdu, and Arabic with RTL support)
    - 📄 `ThemeContext.tsx` (Light/Dark mode token switching)
    - 📄 `AuthContext.tsx` (Patron lounge & authentication state)
  - 📄 `types.ts` (TypeScript schemas for Products, Reviews, and Cart items)

---

## 1. Core Architectural Rules (Multipage Architecture)
- **Architecture:** Explicitly authorized **Multipage Architecture (MPA / React Router SPA)**.
- **Route Inventory:**
  - `/` -> HomePage
  - `/shop`, `/shop/:category`, `/category/:category` -> ShopPage (Curated Catalogue)
  - `/wholesale` -> ShopPage (Wholesale filter active)
  - `/gifting` -> ShopPage (Gifting/Combos filter active)
  - `/product/:id` -> ProductDetailPage
  - `/checkout` -> CheckoutPage
  - `/success` -> OrderSuccessPage
  - `/cart` -> CartPage
  - `/pages/:slug`, `/story`, `/contact` -> InfoPage
  - `/policies/:slug`, `/policies` -> PoliciesPage
  - `/journal` -> JournalPage
  - `/faq` -> FAQPage
  - `*` -> NotFoundPage (Graceful 404 recovery)

---

## 2. Visual Theme & Palette Fidelity
- **Palette (Warm Luxury Cream & Emerald System):**
  - Main Cream: `#F6F1EA` (`--color-base`)
  - Raised Ivory Surface: `#FFFCF7` (`--color-surface`)
  - Champagne Gold: `#C7982F` (`--color-gold`)
  - Deep Emerald: `#042821` (`--color-emerald-dark`)
  - Warm Charcoal Text: `#29231D` (`--color-ink`)
  - Dark Bronze Accent Text: `#806326`
- **Contrast & Typography:**
  - Strict compliance with WCAG AA (minimum 4.5:1 for body copy).
  - Elegant serif headings (`Playfair Display`, `Amiri` for Arabic/Urdu) paired with crisp sans-serif body copy (`Inter`, `Satoshi`).

---

## 3. Calculation & Checkout Standards
- **Standard Shipping:** Rs. 150. Free standard shipping applies when discounted subtotal >= Rs. 3,000.
- **Express Shipping:** Rs. 350. Priority courier dispatch.
- **Authoritative Server:** Server strictly recalculates prices, coupon discounts (e.g. ALLBARKA10 for 10%), and shipping fees based on the client's selected shipping method ID and discounted subtotal.
- **Recovery:** Direct access or reload on `/success` reads the persisted session order so confirmation details are never lost.

---

## 4. Authentic Customer Reviews & Localization
- **No Hardcoded Relative Dates:** Use localized neighborhood tags (e.g., `DHA Phase 6`, `Gulberg III`, `Model Town`).
- **Natural Copywriting:** Blend natural Roman Urdu, standard Urdu (نستعلیق), Arabic, and everyday English phrasing.
- **Multilingual Support:** All key interfaces support English, Urdu (RTL), and Arabic (RTL).
