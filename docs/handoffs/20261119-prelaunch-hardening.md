# Handoff: Pre-Launch Security & Performance Hardening

**Date:** 19 November 2026 (Asia/Karachi)  
**Agent:** Antigravity (PC)  
**Branch:** `ag/20261119-prelaunch-hardening`  
**Base commit:** `9f0619f` (`origin/claude/celebrations-foundation-20261112`)

---

## 1. What was completed

### Item 1: npm audit & Vulnerability Assessment
- **Resolved:** `fast-xml-parser` vulnerability patched cleanly via `npm audit fix` in `package-lock.json`.
- **Reported:** `picomatch` ReDoS advisory flagged. Resolving it via `npm audit fix --force` would downgrade Vite from `6.4.5` to `6.2.7` (major/breaking toolchain regression). Per rule, this breaking downgrade was skipped and reported for upstream Vite patch tracking.
- Static security audit (`git grep -nIE "dangerouslySetInnerHTML|eval\(|new Function\("`) confirmed **zero** dangerous string-to-code executions in `src/` and `server.ts`.

### Item 2: WhatsApp Webhook Timing-Safe HMAC Verification
- Created `src/lib/whatsappWebhook.ts`:
  - `verifyWhatsAppWebhookSignature(rawBody, signatureHeader, appSecret)` strictly verifies `X-Hub-Signature-256` (`sha256=<64-char-hex>`) using `crypto.timingSafeEqual` over raw buffers.
  - Returns `401 Unauthorized` (`INVALID_SIGNATURE`) on missing header, invalid format, or hash mismatch.
  - Implements `GET /api/webhooks/whatsapp` verification handshake for Meta subscribe mode and `POST /api/webhooks/whatsapp` rate-limited inbound event intake.
- Mounted in `server.ts` with `req.rawBody` buffer capture in `express.json({ verify: ... })`.
- Comprehensive unit tests in `tests/whatsapp-webhook-signature.test.ts` (6 pass, 0 fail).

### Item 3: Public POST Routes Audit & Hardening
- Inventoried all 22 POST endpoints across `server.ts` and `src/lib/*Router.ts` in `docs/security/ROUTE_AUDIT_20261119.md`.
- **Hardened:**
  - `POST /api/auth/sessionLogin` & `/api/auth/sessionLogout`: Attached `authLimiter` (15 req/min) and strict `idToken` length validation (10–4096 chars).
  - `POST /api/orders/quote`: Attached `ordersLimiter` (10 req/min) and payload object validation.
  - `POST /api/coupons/preview`: Attached `couponLimiter` (20 req/min) and code string validation.

### Item 4: Checkout Validation Hardening (Client & Server Parity)
- **Phone:** Strictly accepts Pakistani mobile format `03XXXXXXXXX` or `+923XXXXXXXXX` (11 digits, rejecting landlines `042`/`021` and international numbers for dispatch).
- **Address:** Minimum length requirement increased to **10 characters** on both client (`CheckoutPage.tsx`, `bulkGifting.ts`) and server (`orderValidation.ts`).
- **City:** Expanded `DELIVERY_CITIES` with Quetta, Sialkot, Gujranwala, Hyderabad. Server-side `validateShippingCity` strictly rejects placeholder strings and non-alphabetical inputs.
- **Translations:** Synchronized EN, UR, and AR error copy for `checkout.phoneError`, `checkout.addressError` (noting 10-char minimum), and `shipping.enterCity`.
- Unit tests in `tests/checkout-validation-hardening.test.ts` (4 pass, 0 fail).

### Item 5: Lighthouse / Asset & Bundle Optimization
- **Image Dimensions & Lazy Loading:**
  - Added explicit `width={400} height={500}` to `src/components/CategoryCarousel.tsx`.
  - Added `width={300} height={300} loading="lazy" decoding="async"` to `src/components/GiftFinder.tsx`.
  - Added `width={40} height={40} loading="lazy" decoding="async"` to `src/components/AllBarkaHero.tsx`.
- **Vite Chunking Optimization (`vite.config.ts`):**
  - Partitioned heavy vendor and catalog modules into dedicated chunks: `vendor-firebase`, `catalog-products`, `celebrations-bundle`, `motion`, `icons`, `react-vendor`, `vendor-carousel`.
  - Main bundle `index.js` dropped from **2,042 kB** down to **984 kB** (gzip: **257 kB**), cutting initial client download weight by >50%.

---

## 2. Verification Evidence

- `npm run typecheck`: **PASS** (`tsc --noEmit` exited with code 0).
- `npm run build`: **PASS** (Vite build + esbuild `server.ts` + Release privacy audit of 88 text artifacts passed with zero private tokens printed).
- WhatsApp webhook suite: `node --import tsx --test tests/whatsapp-webhook-signature.test.ts` (6 pass, 0 fail).
- Checkout validation suite: `node --import tsx --test tests/checkout-validation-hardening.test.ts` (4 pass, 0 fail).
- Full WhatsApp & Commerce suite: `node --import tsx --test tests/whatsapp-webhook-signature.test.ts tests/checkout-validation-hardening.test.ts tests/n8n-commerce-router.test.ts tests/whatsapp-commerce.test.ts` (**42 pass, 0 fail**).
- Backend test suite: `node --import tsx tests/run-backend-tests.mjs` (**21 pass, 0 fail**).
- Browser UI tests: `tests/premium-purchase-browser.test.tsx` + `tests/premium-hero-browser.test.tsx` + `tests/cart-micro-animation-and-shipping.test.ts` (**4 pass, 0 fail**).

---

## 3. Files Modified / Created

- `server.ts` (authLimiter, couponLimiter, ordersLimiter on quote, rawBody capture, WhatsApp webhook router mount)
- `src/lib/whatsappWebhook.ts` (new timing-safe HMAC verification and webhook router)
- `src/lib/orderValidation.ts` (minimum 10-char address requirement)
- `src/lib/shippingPolicy.ts` (letter-check on destination city)
- `src/lib/bulkGifting.ts` (minimum 10-char address requirement for rows)
- `src/pages/CheckoutPage.tsx` (10-char address check, expanded delivery cities, synchronized validation)
- `src/contexts/shoppingQualityTranslations.ts` (address min 10 chars, new city translations)
- `src/components/CategoryCarousel.tsx` (explicit width/height)
- `src/components/GiftFinder.tsx` (explicit width/height, lazy decoding)
- `src/components/AllBarkaHero.tsx` (explicit width/height, lazy decoding)
- `vite.config.ts` (manualChunks optimization for vendor-firebase, catalog-products, celebrations-bundle)
- `docs/security/ROUTE_AUDIT_20261119.md` (new complete POST route audit document)
- `docs/PENDING_WORK.md` (updated status)
- `tests/whatsapp-webhook-signature.test.ts` (new test suite)
- `tests/checkout-validation-hardening.test.ts` (new test suite)
- `package-lock.json` (fast-xml-parser patch)

---

## 4. Next Actions for Claude

1. Review and merge branch `ag/20261119-prelaunch-hardening` into `claude/celebrations-foundation-20261112`.
2. Deploy to Railway on merge.
