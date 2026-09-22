# ALLBARKA LUXURY BOUTIQUE — CODEX FRONTEND HANDOFF DOCUMENT

**Project Name:** AllBarka Luxury Dry Fruits & Spices Boutique  
**Location:** Lahore, Pakistan  
**Repository Path:** `e:\AllBarka-34`  
**Date:** September 21, 2026  
**Status:** Frontend Architecture Fully Finalized & Verified  

---

## 1. Executive Summary & Source of Truth

AllBarka is a high-end luxury boutique web application built with **React Router 7**, **TypeScript**, **Tailwind CSS**, and **Framer Motion**. All customer-facing routes, components, responsive viewports, multilingual systems (EN/UR/AR), and business contact channels have been centralized and verified.

### Central Registries (Single Source of Truth)
- **Business Contacts:** `src/config/contacts.ts`
  - Automated Orders / n8n WhatsApp: `+92 329 9455065` (`923299455065`)
  - Human Support / Concierge WhatsApp: `+92 316 0666083` (`923160666083`)
  - Customer Email: `allbarkalahore@gmail.com`
  - Helpers: `buildAutomatedOrderWhatsAppUrl()`, `buildHumanSupportWhatsAppUrl()`, `buildCustomerEmailUrl()`
- **Categories:** `src/config/categories.ts` (5 Canonical categories: `nuts`, `oils`, `essentials`, `snacks-seeds`, `gift-boxes`)
- **Products Catalog:** `src/data/products.ts` (32 products total, zero empty categories)
- **Store Config:** `src/config/store.ts` (Shipping thresholds, delivery fees, brand meta)

---

## 2. Completed Work & Verified Components

### A. Business Contact Centralization
- Replaced all hardcoded WhatsApp links and email addresses across `src/config/store.ts`, `BoutiqueContactForm`, `Footer`, `MobileMenu`, `FAQSection`, `InfoPage`, `PoliciesPage`, `CartDrawer`, `CartPage`, `StickyCartBottomBar`, `CategoryPLP`, `CheckoutPage`, `OrderSuccessPage`, `InfoPagesModal`, `AnimatedModalDemo`, and `InfiniteMovingCards`.
- **Strict Rule:** Order buttons, cart checkout links, and order fallbacks use `+92 329 9455065`. Concierge, support, and inquiries use `+92 316 0666083`.

### B. Category Architecture & Gift Boxes Fix
- Reassigned `deal-1` (*The Classics Walnut & Pista Duo*) and `deal-2` (*Work-Day Fuel Almonds & Cashews*) to canonical `category: 'gift-boxes'`.
- Mapped `deals` and `combos` to `'gift-boxes'` in `CATEGORY_ALIASES`.
- Verified category mapping:
  - `nuts`: 8 products
  - `oils`: 13 products
  - `essentials`: 5 products
  - `snacks-seeds`: 4 products
  - `gift-boxes`: 2 products
  - **Total:** 32 products (matches `PRODUCTS.length`).

### C. Multilingual UI & RTL Isolation
- Full translation keys added for **English**, **Urdu (نستعلیق)**, and **Arabic (العربية)** in `src/contexts/LanguageContext.tsx`.
- LTR isolation tags (`<bdi dir="ltr">` / `<span dir="ltr">`) applied to prices (`Rs. X,XXX`), phone numbers, emails, and weight labels so RTL layout engines do not scramble numbers or append punctuation incorrectly.
- `localStorage` persistence (`allbarka_language`) verified.

### D. Product Cards & Navigation UX
- Image & title click navigate cleanly to `/product/:id`.
- Quick View button (Eye icon) triggers `QuickViewModal` overlay without triggering page navigation.
- Removed inactive Wishlist heart icons.
- Placeholder image `/images/product-placeholder.svg` configured for 18 Cold-Pressed Oil and Desi Essential items awaiting photography.

---

## 3. Comprehensive Verification & Test Matrix

| Command / Test Suite | Result | Scope & Details |
|---|---|---|
| `npm run typecheck` | **PASS (Exit 0)** | 0 TypeScript compilation errors (`tsc --noEmit`). |
| `npm run build` | **PASS (Exit 0)** | Production bundle compiled cleanly with Vite (`dist/server.cjs`). |
| **Category System & Mapping** | **PASS** | `nuts` (8), `oils` (13), `essentials` (5), `snacks-seeds` (4), `gift-boxes` (2) = 32 total items mapped. |
| **Contact Routing Audit** | **PASS** | Order actions -> `923299455065`, Support/Concierge -> `923160666083`. |
| **Responsive Viewports** | **PASS** | Tested at 360px, 390px, 768px, 1024px, 1440px with 0 horizontal overflow. |
| **Multi-Language & RTL** | **PASS** | EN / UR / AR toggles update `dir="rtl"`, fonts, and keep price LTR tags (`<bdi dir="ltr">`) intact. |
| **Language & Cart Persistence** | **PASS** | Cart items and language selection persist in `localStorage` across page reloads. |
| **PDP, Quick View & Variants** | **PASS** | PDP (`/product/:id`) variants, Wholesale tier, Wishlist, Share, accordions & TrustBadges verified; Quick View modal opens/closes without route navigation. |
| **Missing-Image Audit** | **PASS** | 14 dry fruits & nuts mapped to generated WebP assets; 18 oils & essentials mapped to branded SVG placeholders. |
| **Backend & n8n Persistence** | **NOT TESTED** | Production Firebase keys, Firestore rule enforcement, and n8n WhatsApp webhooks reserved for backend integration. |

---

## 4. Remaining Launch Blockers for Codex Backend Team

1. **Product Photography Delivery:**
   - 18 Cold-Pressed Oil and Desi Essential items currently use `/images/product-placeholder.svg`. Replace image paths in `src/data/products.ts` once studio photography is delivered.

2. **Firebase Production Keys & Order Persistence:**
   - Add production Firebase configuration keys to `.env` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc.).
   - Verify Firestore order document creation before redirecting COD customers to `/success`.

3. **n8n Webhook & WhatsApp Activation:**
   - Connect live n8n webhook URL in `src/services/n8n.ts`.
   - Test automated order notification dispatch to `+92 329 9455065`.

---

## 5. Quick Verification Commands

```bash
# 1. Typecheck
npm run typecheck

# 2. Start Dev Server
npm run dev

# 3. Production Build
npm run build
```
