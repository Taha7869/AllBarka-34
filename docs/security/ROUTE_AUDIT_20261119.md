# AllBarka — Public & Integration POST Routes Security Audit

**Date:** 19 November 2026  
**Auditor:** Antigravity Agent (`ag/20261119-prelaunch-hardening`)  
**Scope:** Express `server.ts`, mounted routers (`src/lib/*Router.ts`), and webhook entrypoints.  
**Standard:** OWASP Top 10:2025 API Security, AllBarka Security Baseline (`.agents/rules/20-security-baseline.md`).

---

## 1. Executive Summary

Every public and integration POST endpoint in the AllBarka stack was inventoried and analyzed against four mandatory controls:
1. **Rate Limiting:** Prevents denial-of-service, brute force, and credit/token depletion.
2. **Input Validation:** Strict type, length, regex, and bounds checking before business logic or database queries.
3. **Authentication & Authorization:** Enforces least privilege (Public, Authenticated Customer, Admin, or Cryptographic Integration HMAC).
4. **Data Leakage & Safe Errors:** Zero exposure of server secrets, customer PII, internal IDs, or stack traces.

### Remediations Applied During This Audit
- **WhatsApp Webhook:** Implemented timing-safe `crypto.timingSafeEqual` HMAC verification for `X-Hub-Signature-256` header with 401 Unauthorized on invalid/missing signatures (`createWhatsAppWebhookRouter`, `tests/whatsapp-webhook-signature.test.ts`).
- **Session Auth Routes:** Hardened `POST /api/auth/sessionLogin` and `POST /api/auth/sessionLogout` with dedicated `authLimiter` (15 req/min) and strict `idToken` length validation.
- **Order Quote:** Protected `POST /api/orders/quote` with `ordersLimiter` (10 req/min) and body type validation.
- **Coupon Preview:** Bound `POST /api/coupons/preview` with `couponLimiter` (20 req/min) and string/length validation.
- **Checkout Input Hardening:** Enforced strict Pakistani mobile format (`03XXXXXXXXX` / `+923XXXXXXXXX`), minimum 10-character address length, and canonical city validation on both client and server with synchronized EN, UR, and AR error messages.

---

## 2. Comprehensive POST Route Audit Table

| # | Route | Limiter | Input Validation | Auth Guard | Security Status & Notes |
|---|---|---|---|---|---|
| 1 | `POST /api/auth/sessionLogin` | `authLimiter` (15/min) | `idToken` string check (10–4096 chars) | Public (Firebase ID token) | **Hardened**; cookie set with `httpOnly`, `sameSite: 'lax'`, `secure: prod`. |
| 2 | `POST /api/auth/sessionLogout` | `authLimiter` (15/min) | None (clears `__session` cookie) | Public | **Hardened**; clears session cookie safely. |
| 3 | `POST /api/orders/quote` | `ordersLimiter` (10/min) | `req.body` object check, `validateAndPriceOrder` | `authenticateOptionalUser` | **Hardened**; authoritative pricing projection, client prices ignored. |
| 4 | `POST /api/orders` | `ordersLimiter` (10/min) | Full schema: phone, name, address (>=10 chars), city, payment method, idempotency key | `authenticateOptionalUser` | **Hardened**; durable Firestore write, idempotent, stock/pricing verified on server. |
| 5 | `POST /api/orders/track` | `orderTrackLimiter` (10/min) | Sanitized `orderId`, phone last 4 digits verification | Public | **Hardened**; rate-limited timeline without PII leakage. |
| 6 | `POST /api/orders/reorder-items` | `orderTrackLimiter` (10/min) | Order ID & phone last 4 verification, authoritative published item mapping | Public | **Hardened**; only active published items returned at current prices. |
| 7 | `POST /api/coupons/preview` | `couponLimiter` (20/min) | Code string (<=32 chars), items array, destination city | `authenticateOptionalUser` | **Hardened**; rate-limited preview, does not consume voucher. |
| 8 | `POST /api/newsletter/subscribe` | `contactLimiter` (5/min) | Regex validation for Pakistani mobile (`03XXXXXXXXX`) or standard email | Public | **Hardened**; dual email/mobile validation. |
| 9 | `POST /api/events` | `eventLimiter` (60/min) | Allowed event types allowlist, valid product ID regex, bot filtering | Public | **Hardened**; memory-buffered, non-blocking telemetry. |
| 10 | `POST /api/chat` / `/api/concierge/chat` | `aiMessageLimiter` (5/min visitor, 10/min patron) | Sanitized message length (max 2000 chars), history array validation | `authenticateOptionalUser` | **Hardened**; rate-limited AI concierge, zero prompt leakage, Groq keys server-side. |
| 11 | `POST /api/concierge/transcribe` | `chatLimiter` (10/min) | Audio PCM/WAV payload bounded to 45s / 96KB, content-type check | `authenticateOptionalUser` | **Hardened**; server-side Groq whisper transcription. |
| 12 | `POST /api/contact` | `contactLimiter` (5/min) | Name (2–100 chars), contact (<=200 chars), sanitized message | Public | **Hardened**; prevents spam inquiries, stored in Firestore inquiries collection. |
| 13 | `POST /api/inquiries` | `contactLimiter` (5/min) | Full inquiry schema, sanitized fields, phone/email check | Public | **Hardened**; rate-limited public inquiry ingestion. |
| 14 | `POST /api/quotes` | `contactLimiter` (5/min) | Custom quote schema, items, recipient info, delivery slot | Public | **Hardened**; rate-limited custom quote intake. |
| 15 | `POST /api/webhooks/whatsapp` | `limiter` (60/min) | Timing-safe HMAC SHA-256 (`X-Hub-Signature-256`), Meta JSON payload | Cryptographic HMAC | **Hardened**; returns 401 on missing/mismatched signature, timing-safe equal. |
| 16 | `POST /api/integrations/n8n/whatsapp/inbound` | Integration limiter (60/min) | `metaBody` with `rawMetaBody` and `metaSignature` | `requireN8nIntegration` | **Hardened**; timing-safe `verifyMetaEnvelope`. |
| 17 | `POST /api/gift-reveal` | Default route limiter | Order ID, sender/recipient names, message | `requireAuth` | **Hardened**; only authenticated order owner or admin can create gift reveal. |
| 18 | `POST /api/gift-reveal/:token/revoke` | Default route limiter | Reveal token string | `requireAuth` | **Hardened**; only creator or admin can revoke. |
| 19 | `POST /api/me/occasions` | User session limiter | Occasion name, relationship, type, date format | `requireAuth` | **Hardened**; isolated to `users/{uid}/occasions`. |
| 20 | `POST /api/loyalty/redeem` | User session limiter | Reward ID allowlist, patron points balance check | `requireAuth` | **Hardened**; server validates point balance before reward claim. |
| 21 | `POST /api/orders/claim` | User session limiter | Order ID, claim token verification | `requireAuth` | **Hardened**; binds guest orders to authenticated user. |
| 22 | `POST /api/coupons/welcome/claim` | User session limiter | User UID check, first-order eligibility check | `requireAuth` | **Hardened**; deterministic welcome voucher claim. |
| 23 | `POST /api/consent` | `consentLimiter` (20/min) | `validateConsentLogPayload` (random `anonymousId`, boolean categories, `policyVersion`, ISO timestamp, `gpc`) | Public | **Hardened**; stores zero PII (no IP, UA, cookies, email, phone, or UID); writes to default-denied `consentLogs` collection. |

---

## 3. Security Baseline Verification Checklist

- [x] **No hardcoded secrets:** Verified with `git grep -nIE "AIza[0-9A-Za-z-_]{35}|ghp_[0-9A-Za-z]{36}|xoxb-"`.
- [x] **Timing-Safe HMAC:** `crypto.timingSafeEqual` used for all webhook and integration signature checks.
- [x] **Rate Limiting Coverage:** 100% of public POST routes are gated by `express-rate-limit`.
- [x] **Strict Pakistani Phone:** Enforced on client and server (`03XXXXXXXXX` / `+923XXXXXXXXX`).
- [x] **Address Length:** Enforced minimum 10 characters on client and server.
- [x] **City Validation:** Canonical list + character whitelist (letters only, no numeric or placeholder entries).
- [x] **Server-Side Pricing Authority:** No client prices, subtotals, or discounts are trusted by the backend.
