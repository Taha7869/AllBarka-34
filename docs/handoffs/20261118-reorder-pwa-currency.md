# Handoff: Reorder ("Dobara Mangwayein"), PWA Offline & Multi-Currency View (2026-11-18)

## Branch & Scope
- **Task branch:** `ag/20261118-reorder-pwa-currency`
- **Base branch:** `origin/claude/celebrations-foundation-20261112`
- **Deploy branch:** `claude/celebrations-foundation-20261112` (untouched, as per Rule 30)
- **Status:** Complete, verified with unit & browser tests, production build audit passed, pushed to origin.

---

## 3 Features & Commits

### 1. Feature A: "Dobara Mangwayein" / Reorder (`bc6cbdd`)
- **Locations:** `/track` result (`OrderTrackingPage.tsx`) and `/success` order confirmation receipt (`OrderSuccessPage.tsx`).
- **Server Endpoint:** `POST /api/orders/reorder-items` with `orderTrackLimiter`.
- **Identity Verification:** Requires `orderId` (pattern `^AB-\d{8}-[0-9A-F]{6}$`) and `phoneLast4` (pattern `^\d{4}$`).
- **Authoritative Re-pricing:** Loads authoritative catalog, evaluates each line item, updates unit prices to live published rates, detects price adjustments (`priceChanged: true`).
- **Unavailable Product Segregation:** Clearly identifies discontinued, inactive, draft, quote-only, or disabled variants (`unavailableItems`) with exact reasons.
- **Privacy Boundary Guarantee:** Zero customer personal information (names, emails, full phone numbers, delivery addresses, payment methods, notes, or totals) is ever sent to the client. Only item references and current catalog statuses are returned.
- **Client Action:** Adds available items to cart via `addToCart`, opens cart drawer, and renders a clear banner/notice for any unavailable items.

### 2. Feature B: Progressive Web App (PWA) (`e94bef0`)
- **Manifest:** `public/manifest.webmanifest` configured with:
  - Name & Short Name: `AllBarka`
  - Theme color: `#042821` (primary dark emerald token)
  - Background color: `#F6F1EA` (brand base cream token)
  - Icons: High-resolution 192x192 (`/icon-192.png`) and 512x512 (`/icon-512.png`) generated with bicubic smoothing from the official AllBarka 1024x1024 seal, plus SVG vector icon.
- **Service Worker (`public/sw.js`):**
  - Cache-first strategy for static assets (scripts, styles, fonts, images, `.woff2`).
  - **Strict Security Bypass:** `/api/*`, `/checkout`, `/admin/*`, `/staff/*`, and non-GET requests are strictly NEVER cached or intercepted.
- **Install Banner (`PwaInstallBanner.tsx`):**
  - One-time boutique "Home screen par lagayein" luxury prompt.
  - Listens to `beforeinstallprompt` and `appinstalled`.
  - Persistent dismissal memory via `localStorage.getItem('allbarka_pwa_dismissed')`.
  - Accessible (min 44px buttons, RTL friendly, dark mode parity).
- **CSP & Headers:**
  - Helmet CSP in `server.ts` updated with `manifestSrc: ["'self'"]` and `workerSrc: ["'self'"]`.
  - Static headers in `server.ts` serve `sw.js` with `Service-Worker-Allowed: /` and `Cache-Control: no-cache`.

### 3. Feature C: Multi-Currency View (`0cae1f6`)
- **Header Currency Chooser (`CurrencySelector.tsx`):**
  - Desktop header dropdown next to language selector in `RootLayout.tsx`.
  - Mobile menu 4-way segmented buttons in `MobileMenu.tsx`.
  - Supported currencies: `PKR` (base), `GBP` (£), `USD` ($), `AED` (د.إ).
- **Approximate Display ("≈"):**
  - Foreign currencies display approximate prices prepended with `"≈"` (e.g. `≈ $ 20.00`, `≈ £ 15.77`).
  - Base PKR display remains standard without `"≈"` (e.g. `Rs. 5,600`).
- **Strict Commerce & Payment Boundary:**
  - All orders, cart totals, discounts, shipping, and checkout processing remain strictly and authoritatively in **PKR**.
  - Localized disclaimer displayed in cart drawer and checkout:
    - EN: *"Approximate display only. Payment is strictly processed in Pakistani Rupees (PKR)."*
    - UR: *"صرف اندازاً قیمت۔ تمام آرڈرز اور پیمنٹ صرف پاکستانی روپے (PKR) میں ہو گی۔"*
    - AR: *"عرض تقديري فقط. تتم جميع عمليات الدفع والطلبات بالروبية الباكستانية (PKR) حصراً."*
- **Static Exchange Rates (`src/lib/currency.ts`):**
  - Environment variable overrides or hardcoded boutique default rates (USD: 280, GBP: 355, AED: 76.5).
  - Strictly zero live exchange rate API calls.

---

## Verification Evidence
- `npm run typecheck`: Passed (0 errors).
- `npm run build`: Passed (0 errors, 86 artifacts audited, zero private values printed).
- `tests/reorder-items.test.ts`: 4 pass, 0 fail.
- `tests/pwa-manifest.test.ts`: 3 pass, 0 fail.
- `tests/currency-conversion.test.ts`: 4 pass, 0 fail.
- Full test runner `run-all-tests.mjs`: complete suite executed.
