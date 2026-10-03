# AllBarka launch verification — 3 October 2026

## Verified locally against the production build

- `npm run typecheck`: passed.
- `npm run lint:hooks`: passed.
- `npm run build`: passed. Vite reports a large Firebase vendor chunk; real-device performance still needs measurement.
- `npm run test:backend`: 21 passed, 0 failed. Authoritative pricing, shipping, validation, authentication failures, order ownership, idempotency, rewards and delivery scheduling.
- `npm run test:production`: 36 passed. Actual production server with external integrations disabled: routes, private files, authentication boundaries, product media and updates, OAuth headers, delivery-city validation, fractional national shipping, canonical hampers, quote tampering and unavailable-database containment.
- `npm run test:shipping`: 18 passed. Lahore-only free delivery, national minimum/proportional fees, every catalogue portion, oil billing convention, required real cities, canonical hampers, persistence and idempotency.
- `npm run test:advanced`: 39 passed. Cart restoration, quantities, saved/shared selections, incomplete city controls, quote deadlines, accepted receipts and hamper packing messages.
- `npm run test:admin`: 36 passed; `npm run test:discovery`: 13 passed. Admin validation, revision/audit writes, unauthenticated API boundaries and full Urdu/Arabic product names.
- `npm run test:assets`: all 32 catalogue products and 50 image references resolve to nonempty local files, including secondary photos.
- Server output is in `build/`; only `dist/` is publicly served. Server bundle and source map are not downloadable.

## Deployment configuration still required

Railway service access and production Firebase Admin credentials were unavailable during local verification. These checks do not establish a live deployment or a successful real order.

Follow [RAILWAY-LAUNCH.md](RAILWAY-LAUNCH.md). Set APP_URL, Firebase Admin credentials and browser Firebase build variables; authorize the deployed domain for Firebase Auth. Configure TRUST_PROXY_HOPS for the actual Railway proxy chain. Configure optional AI and notifications if used.

Before accepting customers, verify on the deployed HTTPS domain:

1. `/api/commerce/readiness` reports auth and persistence enabled. This reports initialized SDKs; also verify an actual test order is durably stored.
2. Owner test account email/Google login, checkout, receipt reload and patron order history work with production Firebase. Phone authentication is removed.
3. Repeat mobile browsing on real devices: hero suggestions, language selection, card versus quick-view navigation, gallery swipe, cart, footer, dark mode and reduced motion. Local browser QA covered 320px/430px mobile and 1440px desktop; this does not establish real-device performance.
4. Owner confirms delivery/contact details, bank-transfer instructions and policy wording.

The storefront retains COD/bank checkout and WhatsApp support. Missing database configuration returns a clear failure rather than falsely confirming a saved order.

Delivery policy: Lahore standard delivery Rs.150, free at discounted merchandise subtotal Rs.3,000 or above. Outside Lahore: actual canonical billing weight × Rs.250/kg, minimum Rs.250, with no free-shipping threshold. A 1.2kg national order costs Rs.300. Oil ml counts as the same numeric grams for this merchant tariff.

The new Higgsfield film remains pending at the owner's request. No real account, order, newsletter or customer update was submitted during local QA. Deployment is not authorized in this pass; GitHub publication is authorized separately by the owner.
