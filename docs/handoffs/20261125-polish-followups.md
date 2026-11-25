# Handoff — Checkout Bank Copy, Status Labels & Receipt Polish Followups

- **Date:** 2026-11-25 (Asia/Karachi)
- **Branch:** `ag/20261125-polish-followups` (cut `--no-track` from `origin/claude/celebrations-foundation-20261112` `81420fa`; deploy branch untouched)

## Summary of Changes

1. **Checkout Bank/Raast description (`payment.bankDescription`)**
   - Updated [`src/contexts/shippingTranslations.ts`](../../src/contexts/shippingTranslations.ts) across EN/UR/AR so the Bank/Raast option says account details are shown below and instructs writing the Order ID in the payment reference (replacing the old "Confirm payment account details with our concierge" wording; `payment.confirmInstructions` remains intact strictly as the API-unavailable fallback).

2. **`BankTransferDetailsCard` — remove Copy button on Bank name row only**
   - Updated [`src/components/BankTransferDetailsCard.tsx`](../../src/components/BankTransferDetailsCard.tsx): added `copyable?: boolean` to `CopyRow` and set `copyable: false` on `bankName` (`Bank`). Copy buttons remain on Account title, Account number, IBAN, Raast ID (when non-empty), mobile wallets (`Easypaisa`, `JazzCash`), and Order ID.

3. **`/track` (and `/success`) — hide bank details card when `DELIVERED`**
   - Updated [`src/pages/OrderTrackingPage.tsx`](../../src/pages/OrderTrackingPage.tsx) (and [`src/pages/OrderSuccessPage.tsx`](../../src/pages/OrderSuccessPage.tsx)): `BankTransferDetailsCard` renders only for active (non-cancelled, non-delivered) BANK orders.

4. **Human-readable order status labels (EN/UR/AR, zero underscore raw codes)**
   - Added `formatOrderStatusLabel(rawStatus, t)` in [`src/lib/orderStatuses.ts`](../../src/lib/orderStatuses.ts): normalizes canonical and legacy (`NEW`, `PACKED`) statuses, looks up localized `order.status.*`, and falls back to clean sentence-case words so underscore machine codes never leak to customers.
   - Updated [`src/contexts/trackingTranslations.ts`](../../src/contexts/trackingTranslations.ts): replaced raw English `ORDER_RECEIVED` / `OUT_FOR_DELIVERY` / etc. with human labels (`Order received`, `Confirmed`, `Preparing`, `Dispatched`, `Out for delivery`, `Delivered`, `Cancelled`, `Quote requested`) across EN/UR/AR.
   - Updated [`src/contexts/catalogTranslations.ts`](../../src/contexts/catalogTranslations.ts): aligned sentence-case English labels (`Order received`, `Out for delivery`, etc.) and added `order.status.QUOTE_REQUESTED` in EN/UR/AR.
   - Updated [`src/components/PatronLoungeModal.tsx`](../../src/components/PatronLoungeModal.tsx) (Account orders badge + dark-mode status pill colors + 6-step timeline), [`src/pages/OrderTrackingPage.tsx`](../../src/pages/OrderTrackingPage.tsx) (status badge + timeline steps), and [`src/pages/OrderSuccessPage.tsx`](../../src/pages/OrderSuccessPage.tsx) (cancelled label + 6-step timeline).

5. **Single `"Order received"` heading on Checkout Success**
   - Updated [`src/pages/CheckoutPage.tsx`](../../src/pages/CheckoutPage.tsx): removed the duplicate `checkout.receiptReceived` heading from the top modal header on `currentStep === 'success'` and promoted the Step 4 centered body heading below the gold crest seal stamp to `<h1 data-testid="checkout-success-heading">`.

## Verification Evidence

- `npm run typecheck`: **0 errors**
- `npm run lint:hooks`: **0 errors** (3 pre-existing warnings)
- `npm run build`: **PASS** (`Release privacy audit passed (152 text artifacts; no private values printed).`)
- Targeted suite (`payment-details`, `order-tracking`, `checkout-reliability`, `rewards-privacy`, `shipping-policy`): **79 pass / 0 fail** (6/6 in `tests/payment-details.test.tsx`)
- Full offline suite (`ALLBARKA_SKIP_LOCAL_ENV=true`, 155 test files, 1,031 tests): **1,029 pass / 0 app fail** (`1` known Windows-only `tests/dev-server.test.mjs` SIGTERM fail + `1` emulator-only `firestore-security.test.mjs` skip)
- Backend suite (`tests/run-backend-tests.mjs`): **21 PASSED, 0 FAILED**
- Catalog assets (`scripts/verify-catalog-assets.ts`): **97 products, 115 image references (111 unique files); 0 missing files, 0 retired views**
- Production checks (`scripts/verify-production.mjs`): **36 passed**
- Headless Chromium QA (375px + 1440px, light & dark, synthetic fake fixture data only, 0 `pageErrors`, 0 horizontal overflow):
  - Checkout Bank selected: new description visible, `Copy Bank` absent (`checkoutCopyCount: 5`), Account title/number/IBAN/wallets keep Copy buttons.
  - Checkout Step 4 success: `orderReceivedCount === 1`, single `<h1>Order received</h1>`.
  - Account orders (Patron Lounge): badges `"Out for delivery"` and `"Order received"`, 0 underscore codes.
  - `/track`: active `OUT_FOR_DELIVERY` BANK order shows `"Out for delivery"` + bank details card; `DELIVERED` BANK order shows `"Delivered"`, human timeline, and `deliveredBankCardCount: 0`.
- Visual captures (13 PNGs visually inspected): `docs/design/polish-followups-20261125/`.

## Next Action
- Claude reviews and merges `ag/20261125-polish-followups` into `claude/celebrations-foundation-20261112`.
