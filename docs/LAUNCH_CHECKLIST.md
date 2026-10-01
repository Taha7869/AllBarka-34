# AllBarka launch verification — 2 October 2026

## Verified locally against the production build

- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports a large Firebase vendor chunk; real-device performance still needs measurement.
- `npm run test:backend`: 21 passed, 0 failed. Authoritative pricing, shipping, validation, authentication failures, order ownership, idempotency, rewards and delivery scheduling.
- `npm run test:production`: 16 passed. Actual production server with external integrations disabled: page delivery, private files returning 404, API JSON 404s, deployment metadata/sitemap/robots, asset caching, video range requests, quote tampering and unavailable-database containment.
- `npm run test:assets`: all 32 catalogue products and 50 image references resolve to nonempty local files, including secondary photos.
- Server output is in `build/`; only `dist/` is publicly served. Server bundle and source map are not downloadable.

## Deployment configuration still required

Railway service access and production Firebase Admin credentials were unavailable during local verification. These checks do not establish a live deployment or a successful real order.

Follow [RAILWAY-LAUNCH.md](RAILWAY-LAUNCH.md). Set APP_URL, Firebase Admin credentials and browser Firebase build variables; authorize the deployed domain for Firebase Auth. Configure TRUST_PROXY_HOPS for the actual Railway proxy chain. Configure optional AI and notifications if used.

Before accepting customers, verify on the deployed HTTPS domain:

1. `/api/commerce/readiness` reports auth and persistence enabled. This reports initialized SDKs; also verify an actual test order is durably stored.
2. Owner test account login/OTP, checkout, receipt reload and patron order history work with production Firebase.
3. Mobile browsing at 360/390px, tablet and desktop: hero suggestions, language selection, card versus quick-view navigation, gallery swipe, cart, footer, dark mode and reduced motion. Responsive code was updated, but final browser/device visual QA remains unverified because local browser access was blocked in this session.
4. Owner confirms delivery/contact details, bank-transfer instructions and policy wording.

The storefront retains COD/bank checkout and WhatsApp support. Missing database configuration returns a clear failure rather than falsely confirming a saved order.
