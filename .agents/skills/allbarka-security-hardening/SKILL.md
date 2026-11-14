---
name: allbarka-security-hardening
description: >-
  Security review and hardening for AllBarka mapped to OWASP Top 10:2025 and this
  exact stack (Express server.ts, Firebase Auth/Firestore, Railway). Use when adding
  or changing an API route, auth, checkout, coupons, admin tools, uploads, Firestore
  rules, environment variables, dependencies, or when the owner asks "can it be hacked".
---

# AllBarka security hardening

Report findings as: severity (Critical/High/Medium/Low), file:line, what an attacker does, the fix. Report only what you confirmed in the code.

## 1. Know what already exists (do not rebuild it)
- `server.ts`: `helmet` with a nonce-based CSP, `crossOriginOpenerPolicy` for Google sign-in, `express-rate-limit` limiters (chat, contact, orders).
- Server-side price validation and coupon engine; orders saved through an outbox.
- `src/lib/catalogSchema.ts`: `PUBLIC_PRODUCT_FIELDS` whitelist; `stripPrivateProductFields` removes `supplierName`, `supplierCost`, `internalNotes`.
- Admin access through Firebase custom claims (`hasAdminClaim`), staff are orders-only.
- `firestore.rules` and tests under `tests/` that check them.

## 2. Checklist per change (OWASP 2025)
| Risk | Check in AllBarka |
| --- | --- |
| A01 Broken access control | Every `/api/admin/*` and patron route verifies the Firebase ID token server-side and the admin claim or ownership. No route trusts `uid` from the body. |
| A02 Security misconfiguration | `NODE_ENV=production` on Railway; no `unsafe-inline`/`unsafe-eval` in production CSP; no source maps served from `dist/`; error responses never include stack traces. |
| A03 Supply chain | New dependency? Check weekly downloads, maintainer, last publish; run `npm audit --omit=dev`; pin via lockfile. |
| A04 Cryptographic failures | Secrets only in Railway variables; HTTPS only; no secrets in `VITE_*` vars (those are public in the bundle). |
| A05 Injection | Validate with the schema helpers; never build Firestore paths, HTML or shell commands from raw input; React escapes text — never use `dangerouslySetInnerHTML` with user data. |
| A06 Insecure design | Prices, totals, discounts, stock computed on the server. Quote-only and draft products cannot be ordered. |
| A07 Authentication failures | Rate-limit login-adjacent and OTP/voice routes; no user enumeration in error messages. |
| A08 Integrity failures | Webhooks (n8n, WhatsApp) verify their shared secret / signature before acting. |
| A09 Logging failures | Log security events (rejected admin calls, webhook 401s) without tokens or personal data. |
| A10 Exceptional conditions | Fail closed: on a Firestore error a product is unavailable, not free; an unknown coupon is rejected. |

## 3. Commands
```
npm audit --omit=dev
git grep -nIE "dangerouslySetInnerHTML|eval\(|new Function\(" -- src server.ts
git grep -nE "VITE_[A-Z_]*(SECRET|PRIVATE|TOKEN)" -- . ':!*.example'
node --import tsx --test tests/static-config.test.mjs
```

## 4. Do not
- Do not disable a test to make a security change pass.
- Do not log or echo request bodies that may contain tokens or phone numbers.
- Do not publish `firestore.rules` or change Railway variables without the owner's yes.

## 5. Known open item (Nov 2026)
Railway HTTP logs show `POST /api/integrations/n8n/order-update → 401` every minute: the n8n workflow's `N8N_INTEGRATION_SECRET` does not match the server. The fix is on the n8n side; do not loosen the check.
