# AllBarka launch verification — 3 October 2026

## Verified locally against the production build

- `npm run typecheck`: passed.
- `npm run lint:hooks`: passed.
- `npm run build`: passed. Vite reports a large Firebase vendor chunk; real-device performance still needs measurement.
- `npm run test:backend`: 21 passed, 0 failed. Authoritative pricing, shipping, validation, authentication failures, order ownership, idempotency, rewards and delivery scheduling.
- `npm run test:production`: 42 passed. Actual production server with external integrations disabled: private integration authentication, CORS, honest readiness, routes, private files, product media/updates, OAuth headers, shipping, hampers, quote tampering and unavailable-database containment.
- `npm run test:shipping`: 18 passed. Lahore-only free delivery, national minimum/proportional fees, every catalogue portion, oil billing convention, required real cities, canonical hampers, persistence and idempotency.
- `npm run test:advanced`: 63 passed. Cart restoration, quote/submit deadlines, auth failures, stable retry identity, stale quote recovery, receipt reload and genuine persistence failures.
- `npm run test:admin`: 36 passed; `npm run test:discovery`: 13 passed. Admin validation, revision/audit writes, unauthenticated API boundaries and full Urdu/Arabic product names.
- `npm run test:assets`: all 32 catalogue products and 50 image references resolve to nonempty local files, including secondary photos.
- `npm run test:integrations`: 46 passed. Shared Sheet/Admin conflicts/dedup, forged requests, phone privacy, STOP, replayed/expired windows, final send authorization and provider outcome reconciliation.
- `npm run test:outbox`: 21 passed; `npm run test:concierge`: 9 passed; `npm run test:experience`: 46 passed; `npm run test:workflow`: 45 passed.
- Supplied `AllBarka-n8n-v29-20261003.zip` validator: 29/29 passed offline. Actual Meta parent is not included or verified.
- Browser-only build and real artifact privacy/SPA checks passed. Production static host configuration and live connectivity are separate checks.
- Server output is in `build/`; only `dist/` is publicly served. Server bundle and source map are not downloadable.

## Deployment configuration still required

An empty Railway fullstack service and variable references were prepared without deploying. Production Firebase Admin credentials, source attachment, actual proxy evidence and live connectivity remain pending. These checks do not establish a live deployment or a successful real order. Current progress and exact configuration names are saved in [LAUNCH_HANDOFF.md](../LAUNCH_HANDOFF.md).

Follow [RAILWAY-LAUNCH.md](RAILWAY-LAUNCH.md). Set APP_URL, Firebase Admin credentials and browser Firebase build variables; authorize the deployed domain for Firebase Auth. Configure TRUST_PROXY_HOPS for the actual Railway proxy chain. Configure optional AI and notifications if used.

Before accepting customers, verify on the deployed HTTPS domain:

1. `/api/commerce/readiness` reports read-probed connectivity and a saved order verified in the current process. The saved-order flag resets on restart; also verify actual owner-authorized authentication and durable receipt recovery.
2. Owner test account email/Google login, checkout, receipt reload and patron order history work with production Firebase. Phone authentication is removed.
3. Repeat mobile browsing on real devices: hero suggestions, language selection, card versus quick-view navigation, gallery swipe, cart, footer, dark mode and reduced motion. Local QA covered 320px Arabic checkout, 375px cart drawer and 390px checkout; this does not establish real-device performance.
4. Owner confirms delivery/contact details, bank-transfer instructions and policy wording.

The storefront retains COD/bank checkout and WhatsApp support. Missing database configuration returns a clear failure rather than falsely confirming a saved order.

Delivery policy: Lahore standard delivery Rs.150, free at discounted merchandise subtotal Rs.3,000 or above. Outside Lahore: actual canonical billing weight × Rs.250/kg, minimum Rs.250, with no free-shipping threshold. A 1.2kg national order costs Rs.300. Oil ml counts as the same numeric grams for this merchant tariff.

The new Higgsfield film remains pending at the owner's request. No real account, order, newsletter or customer update was submitted during local QA. Deployment is not authorized in this pass; GitHub publication is authorized separately by the owner.
