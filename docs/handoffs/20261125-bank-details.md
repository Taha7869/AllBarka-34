# Handoff: `ag/20261125-bank-details` (Live Bank/Wallet Details & Checkout/Receipt Dark-Mode Fixes)

- **Date:** 2026-11-25
- **Branch:** `ag/20261125-bank-details` (cut `--no-track` from `origin/claude/celebrations-foundation-20261112` at `5cc1a0c`)
- **Deploy branch untouched:** `claude/celebrations-foundation-20261112` was NOT pushed or modified.
- **Zero real bank numbers in code, tests, docs, or screenshot fixtures:** All tests and Playwright captures use clearly synthetic fixture data (`Example Heritage Bank`, `0000-1111222233`, `PK00EXMP0000000000111122`, `0300-0000001`).

---

## Kaam 1 — Server-Backed Bank & Wallet Transfer Details (`content/paymentDetails`)
1. **Sanitizer (`src/lib/paymentDetails.ts`):**
   - Reads raw Firestore `content/paymentDetails` fields (`bankName`, `accountTitle`, `accountNumber`, `iban`, `raastId`, `wallets[{ label, number }]`, `version`, `updatedAt`).
   - Trims every string (`"Easypaisa "` → `"Easypaisa"`), omits empty/whitespace `raastId`, drops incomplete wallet entries, strips non-allowlisted fields, and returns `null` when no transferable channel is configured.
2. **Server API (`src/lib/paymentDetailsRouter.ts`, mounted in `server.ts`):**
   - `GET /api/payment-details` reads `db.collection('content').doc('paymentDetails').get()` via Firebase Admin with a **5-minute server-side cache** (`PAYMENT_DETAILS_CACHE_MS = 5 * 60_000`) and `Cache-Control: no-store`.
   - Returns `{ available: true, details }` on valid data, `{ available: false, details: null }` if absent/empty, or `503 { available: false, details: null, code: 'PAYMENT_DETAILS_UNAVAILABLE' }` when DB is unconfigured.
3. **Order Tracking BANK indicator (`src/lib/orderTrackingService.ts`):**
   - Added non-PII `isBankTransfer?: boolean` to `PublicOrderTrackingResult` (set `true` only on BANK orders; `paymentMethod`, totals, and personal data remain excluded).
4. **Shared Client Hook & UI Component (`src/hooks/usePaymentDetails.ts`, `src/components/BankTransferDetailsCard.tsx`):**
   - 5-minute in-session client cache + concurrent fetch deduplication.
   - Displays Bank, Account title, Account number, IBAN, non-empty Raast ID only, and trimmed Mobile Wallets (`Easypaisa`, `JazzCash`, etc.).
   - Every value has a `>= 44px` mobile accessible **Copy** button (`aria-label="Copy <label>"`, `"Copied"` visual + `aria-live="polite"` feedback, clipboard API + execCommand fallback).
   - Displays `"Write your Order ID in the payment reference: <orderId>"` (trilingual EN/UR/AR, with Copy button for Order ID) followed by the existing `"share the receipt with our concierge on WhatsApp"` line.
   - Gracefully falls back to existing `payment.confirmInstructions` concierge copy if `/api/payment-details` fails or returns empty.
5. **Wired across all 3 requested surfaces:**
   - **(a) Checkout (`src/pages/CheckoutPage.tsx`):** Shown right below the payment selector when `"Bank / Raast transfer"` is chosen.
   - **(b) Order Success / Receipt (`src/pages/CheckoutPage.tsx` Step 4 + `src/pages/OrderSuccessPage.tsx` `/success`):** Shown on BANK orders with the confirmed Order ID reference line.
   - **(c) Order Tracking (`src/pages/OrderTrackingPage.tsx` `/track`):** Shown on non-cancelled BANK orders (`trackingResult.isBankTransfer`).

---

## Kaam 2 — Dark Mode Contrast & Post-Order Receipt Fixes
1. **Checkout dark-mode selected payment cards (`src/pages/CheckoutPage.tsx`):**
   - Replaced `bg-[#042821] text-[var(--color-surface,#FDFBF7)]` (which resolved `--color-surface` to dark `#1A201E` in dark mode → green text on green background) with explicit ivory text `bg-[#042821] dark:bg-[#0D3D31] text-[#FDFBF7]` across COD/Bank cards, step buttons, delivery slot pills, VIP banner, and primary buttons.
   - Measured dark-mode contrast: Selected Bank title **`11.75:1`**, description **`10.81:1`**, unselected COD title **`14.72:1`** (WCAG AAA).
2. **Success page dark-mode Bank box & Total payable (`src/pages/CheckoutPage.tsx`, `src/pages/OrderSuccessPage.tsx`):**
   - Replaced hardcoded white `bg-[#FDFBF7]` Bank box with dark-mode-native `BankTransferDetailsCard` (value contrast **`13.95:1`**, Copy button **`8.24:1`**).
   - Fixed `"Total payable"` amount from invisible dark emerald (`var(--color-emerald)`) to `text-[#042821] dark:text-[#E8C97A]` (measured dark-mode contrast **`10.29:1`**).
3. **Removed pre-order banner & eyebrow after order placement (`src/pages/CheckoutPage.tsx`):**
   - Guarded quote confirmation banner (`"Please wait for the current total to be confirmed / Check total again"`), `draftNotice`, top `1 Details | 2 Delivery | 3 Review` stepper, and `"A few details, then a final review."` (`purchase.checkoutIntro`) behind `currentStep !== 'success'`, and removed `purchase.checkoutIntro` from Step 4 success.
   - Verified in headless Chromium post-order DOM: `quoteBannerCount=0`, `hasCheckoutIntroText=false`, `hasWaitTotalText=false`, `hasCheckTotalAgainText=false`.

---

## Verification & Evidence
- `npm run typecheck`: **0 errors**
- `npm run lint:hooks`: **0 errors** (3 pre-existing warnings)
- `npm run build`: **PASS** (`Release privacy audit passed — 152 text artifacts; no private values printed`)
- New unit/API/component tests (`tests/payment-details.test.tsx`): **5/5 PASS** (alongside `order-tracking` + `checkout-reliability` = **46/46 PASS**)
- Full offline suite (`ALLBARKA_SKIP_LOCAL_ENV=true node scripts/run-all-tests.mjs`, `155` files, `1,030` tests):
  - **`1,028 PASS / 0 app FAIL / 1 known Windows-only dev-server SIGTERM / 1 emulator skip`**
  - Backend: **21 PASSED, 0 FAILED**
  - Catalog assets: **97 products, 115 refs, 0 missing**
  - Production checks: **36 passed**
- **12 Visually-Inspected Screenshots (`docs/design/bank-details-20261125/`):**
  - `checkout-bank-{375,1440}-{light,dark}.png`
  - `success-bank-{375,1440}-{light,dark}.png`
  - `track-bank-{375,1440}-{light,dark}.png`

## Next Action
- **Claude:** Review and merge `ag/20261125-bank-details` into `claude/celebrations-foundation-20261112`.
