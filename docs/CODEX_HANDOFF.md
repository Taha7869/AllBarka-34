# ALLBARKA LUXURY BOUTIQUE — CODEX BACKEND HANDOFF DOCUMENT

**Project Name:** AllBarka Luxury Dry Fruits & Spices Boutique
**Location:** Lahore, Pakistan
**Production Firebase Project:** `AllBarka-Live` (`allbarka-live`)
**Production Firestore Database:** `(default)` (contains existing `coupons`, `customers`, and `orders` collections)
**Repository Path:** `e:\AllBarka-34`
**Date:** September 22, 2026
**Status:** Backend Production Hardening & Frontend Architecture Fully Verified

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

### E. Backend Production Hardening & Security Integration
- **Firebase Admin Initialization:** Refactored `server.ts` to read `FIREBASE_PROJECT_ID` (`allbarka-live`), `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` with newline conversion and zero credential logging. Target Firestore database defaults to `(default)`.
- **Durable Order Safety Gate:** Returns 503 `PERSISTENCE_PENDING` when `db` is unavailable, preserving carts without fake accepted orders.
- **Idempotency Protection:** `createDurableOrder` returns cached result (`isDuplicate: true`) on duplicate payload, and 409 `IDEMPOTENCY_PAYLOAD_MISMATCH` on payload conflict.
- **n8n Order Notification Service:** Isolated, 5-second timeout-protected dispatch in `src/services/n8nOrderNotification.ts` with optional HMAC signature via `N8N_WEBHOOK_SECRET`. Disabled by default when `N8N_ORDER_WEBHOOK_URL` is omitted.
- **n8n Payload Contract**: Emits `{ event: "ORDER_CREATED", timestamp, order: { orderId, customer, totals, items, paymentMethod, createdAt, whatsappMessage } }`.
- **n8n Safe Testing Procedure**: Test webhook contracts using `webhook.site` or a staging n8n workflow before configuring any production EC2 pipeline.
- **Google Auth Error Handling:** `AuthModal.tsx` maps popup-blocked, unauthorized domain, and credential conflict errors to user-friendly messages.
- **Environment Configuration:** Updated `.env.example` with safe server-only placeholders (`FIREBASE_PROJECT_ID=allbarka-live`, `FIRESTORE_DATABASE_ID=(default)`).

---

## 3. Comprehensive Verification & Test Matrix

| Command / Test Suite | Result | Scope & Details |
|---|---|---|
| `npx tsx tests/run-backend-tests.mjs` | **PASS (12/12 Passed)** | Pricing, free shipping, customer phone validation, n8n disabled safety, 503 auth unavailable, 401 unauthorized, order uid binding, owner privacy isolation, sanitized order history (`/api/me/orders`), loyalty points awarded on `DELIVERED`, zero points on `CANCELLED`, points idempotency, cross-user rejection, and guest claim token enforcement. |
| `npm run typecheck` | **PASS (Exit 0)** | 0 TypeScript compilation errors (`tsc --noEmit`). |
| `npm run build` | **PASS (Exit 0)** | Production bundle compiled cleanly with Vite & Esbuild (`dist/server.cjs`). |
| `git diff --check` | **PASS (Exit 0)** | 0 trailing whitespace or formatting warnings across project files. |
| **Checkout Sign-In Flow** | **PASS** | Guest checkout "Sign In" button dispatches `open-auth-modal` (`handleOpenAuth('signin')`); pre-filled form fields, step position, and cart state preserved. |
| **Patron Lounge Orders Display** | **PASS** | Date parsing handles `createdAt`/`createdAtMs`/`timestamp`; total reads `totals.total`/`total`; displays available and pending points badges. |
| **Loyalty Points Idempotency** | **PASS** | Points awarded ONLY when status is set to `DELIVERED`; `pointsAwarded: true` marker prevents duplicate awards on repeated updates; reversed on `CANCELLED`. |
| **Secure Tracking & Privacy** | **PASS** | `/api/orders/:orderId` enforces UID match for patrons or valid SHA-256 claim token for guests. Order ID alone without claim token returns 404/401. |
| **Firebase Admin Auth Fail-Closed** | **PASS** | Server returns HTTP 503 `AUTH_SERVICE_UNAVAILABLE` when server-side credentials missing; 401 `UNAUTHORIZED` reserved for invalid/expired tokens. |
| **Patron Order History (`/api/me/orders`)** | **PASS** | Protected endpoint using `requireAuth` & Bearer token; queries Firestore by verified `uid` & returns sanitized order summaries (`sanitizeOrderForCustomer`). |
| **Server Startup & Readiness** | **PASS** | `node dist/server.cjs` booted successfully; `/api/commerce/readiness` and `/api/health` verified live. |

---

## 4. Owner Configuration Blockers & Firebase Console Setup

> [!WARNING]
> **Owner Configuration Blocker — Firebase Web App Credentials (`AllBarka-Web`)**:
> `firebase-applet-config.json` contains empty placeholders (`apiKey: ""`, `appId: ""`) for the `AllBarka-Web` web app under `AllBarka-Live`.
> The owner must copy the Web App configuration parameters from the [Firebase Console](https://console.firebase.google.com/) for `allbarka-live` and provide them in `.env` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, etc.) or `firebase-applet-config.json`. Do not invent fake values.

1. **Enable Google Provider:**
   - Go to [Firebase Console](https://console.firebase.google.com/) > **Authentication** > **Sign-in method**.
   - Enable **Google** under Sign-in providers.

2. **Add Authorized Domains:**
   - Go to **Authentication** > **Settings** > **Authorized domains**.
   - Add your production domain (e.g. `your-app.onrender.com` or custom domain).

3. **Configure Server Environment Variables:**
   - In your Render / hosting environment variables setting, add:
     - `FIREBASE_PROJECT_ID=allbarka-live`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY`
     - `FIRESTORE_DATABASE_ID=(default)`
     - `N8N_ORDER_WEBHOOK_URL` (optional)
     - `N8N_WEBHOOK_SECRET` (optional)

---

## 5. Quick Verification Commands

```bash
# 1. Typecheck
npm run typecheck

# 2. Production Build
npm run build

# 3. Start Production Server
npm start
```
