# Checkout promotions

Promotion definitions live only in `src/server/promoConfig.ts`. Browser estimates never calculate a promo discount. `/api/orders/quote`, `/api/coupons/preview` and `/api/orders` calculate from canonical catalog items; submitted prices, benefit flags and Firestore coupon configuration cannot override these definitions. Trimmed codes are case-insensitive; only one code is accepted per order.

| Code | Benefit | Conditions |
| --- | --- | --- |
| ISHAQUEAHMAD | 10% merchandise discount | Maximum Rs. 1,000 |
| ALLBARKA10 | 10% merchandise discount | Maximum Rs. 500 |
| ZAFRANI | Shipping charge waived | Includes destinations outside Lahore |
| GIFTBOX | Free gift wrapping | Packing flag on, wrapping fee zero |
| MYSTERY | Complimentary gift | Packing flag on; team supplies the gift |
| FRIEND | Rs. 200 merchandise discount | Merchandise subtotal at least Rs. 2,000 |
| WELCOME10 | 10% merchandise discount | Maximum Rs. 500; authenticated first order only |
| BULK10 | 10% merchandise discount | Merchandise subtotal at least Rs. 5,000; no cap |
| EID15 | 15% merchandise discount | Inactive; maximum Rs. 1,500; no expiration configured |
| CANCER | Personalized quote request | No payment or monetary totals |

Minimum-order requirements use the canonical merchandise subtotal before discount and exclude shipping/wrapping. An expiration, when configured, is a millisecond Unix timestamp; null or absence means no expiration. Inactive, expired, invalid, multiple or ineligible codes return a clear HTTP 400 response. WELCOME10 checks existing Firestore orders by the verified Firebase UID. Guest users must sign in to use it. An atomic `customerOrderHistory` marker serializes competing checkouts; retrying a saved order returns its original receipt without another redemption. No extra composite index is needed for the UID equality query. Existing discounts and old receipts are never repriced against new caps.

Every new order stores `promoCode`, `promoType`, `discountAmount`, `freeShipping`, `freeGiftWrap` and `freeGift`, including null/zero/false defaults when no promo is used. All Firestore write payloads pass through `sanitizeFirestoreData`; absent object fields are omitted, undefined array entries become null, and Firestore SDK values keep their original types. Backend `ignoreUndefinedProperties: true` is secondary protection. Coupon documents contain usage counters only; absent `maxDiscount` is never written.

## Quote requests

CANCER saves a durable `QUOTE_REQUEST` with `QUOTE_REQUESTED` status, `NOT_REQUIRED` payment status, all monetary totals zero and zero loyalty points. The checkout skips payment, hides prices, and returns the normal saved tracking ID and protected receipt. The success page says, “Our team will contact you with your personalized rate.” Quote cancellation is allowed; payment and fulfillment changes are blocked. Converting a quote into a priced payable order requires a separate future agreed workflow.

The normal durable `ORDER_CREATED` outbox event uses source `website`. The updated inactive website receiver mirrors the quote status and adds packing notes to `items_summary`, such as `PROMO:GIFTBOX: free gift wrap`, `PROMO:MYSTERY: complimentary gift`, and `PROMO:CANCER: quote request`. Shipping/discount notes use saved canonical amounts. A database outage never returns a manufactured saved quote or order.

## Owner setup after branch review

1. Use the existing Firebase/Railway private configuration; no new secrets are required by coupons. Confirm the order database is available and authenticated customers use the same Firebase project.
2. Import/update `n8n/allbarka-website-integration.json` and `n8n/allbarka-status-sync.json` in the existing n8n setup; preserve selected credentials, Sheet resource and existing workflow linkage.
3. Update the Sheet's bound `n8n/OrderControl.gs`; keep existing private Script Properties and bridge configuration. The status validator now recognizes `QUOTE_REQUESTED` and its cancellation-only rule.
4. Review and publish those updated workflows only when authorized. They remain inactive in this repository. Verify a disposable promo order, quote tracking, packing note and duplicate retry before claiming live integration success.

Run `npm run test:coupons` for coupon regressions. Run `npm test` for the full build, every test file, legacy backend checks, catalog assets and offline production HTTP checks. Tests do not create real customer orders or send messages.
