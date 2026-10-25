# AllBarka Railway launch

This repository runs the React storefront and Express API together. Use the repository root as the Railway service root. `railway.json` sets `npm run build`, `npm start` and `/api/health`. Node 22–24 and npm 11 are specified in package.json. Railway supplies PORT; the existing server listens on 0.0.0.0.

## Setup

The browser build is written to `dist/`, while the private server bundle is written to `build/server.cjs`. Keep these directories separate: Express publicly serves only `dist/`. Do not use the old `dist/server.cjs` start path.

Before deploying, run `npm run typecheck`, `npm run build`, `npm run test:backend`, `npm run test:assets` and `npm run test:production`. The production smoke test disables external integrations and does not create real customer orders. Current results and remaining live checks are in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

1. Push this updated source to your GitHub repository, then connect that repository to a Railway service.
2. Add the environment variables below before building. Generate a public Railway domain and set APP_URL to its HTTPS URL. Set NODE_ENV=production.
3. Add the Railway/custom domain to Firebase Authentication → Settings → Authorized domains. The owner has already confirmed provider enablement; do not change or re-enable providers. Customer UI remains email/password and Google only. An enabled Phone provider does not verify a profile phone or a WhatsApp sender. Keep existing Firestore rules and admin permissions. See [AUTHENTICATION.md](AUTHENTICATION.md).
4. Deploy and open `/api/commerce/readiness`. `durablePersistenceReady` and `authActive` must both be true before accepting customer orders. `/api/health` only confirms the process is running.
5. Verify one authorized test order, receipt recovery, email/Google login and the patron account using your own test account, then make the storefront available to customers.

## Required server variables

- NODE_ENV=production
- APP_URL=https://your-domain
- FIREBASE_PROJECT_ID=allbarka-live (or your existing project's actual ID)
- FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY from the existing Firebase service account; keep these server-only. Escaped newline sequences in the private key are handled by the existing server.
- FIRESTORE_DATABASE_ID=(default), unless you use a named database
- AI_GUEST_HASH_SECRET: a random value of at least 32 characters, for the existing guest message quota
- TRUST_PROXY_HOPS: set for your actual controlled reverse-proxy chain; the existing server defaults to 0. Verify forwarding behaviour before enabling guest quotas/rate limiting for launch.

## Firebase browser variables (available during build)

Copy the existing Firebase web-app configuration into VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, and VITE_FIRESTORE_DATABASE_ID. These are web-app identifiers, not admin credentials. Never put the service-account private key in a VITE_ variable.

## AI and optional integrations

The concierge calls the commerce API's `/api/concierge/chat`, carrying the signed-in user's ID token. The owner's current private n8n website branch uses Groq/openai/gpt-oss-120b through its existing n8n credential. Set N8N_AI_WEBHOOK_URL and its separate N8N_AI_WEBHOOK_SECRET server-side; never expose provider/webhook secrets in VITE variables. Guest quotas and authenticated abuse limits remain enforced. See [AI_CONSULTANT_LAUNCH.md](AI_CONSULTANT_LAUNCH.md).

For the durable order mirror configure N8N_ORDER_WEBHOOK_URL and a different N8N_WEBHOOK_SECRET. The persistent Express worker handles leases/retries; historical DISABLED events never replay automatically. The receiver uses TLS + Header Auth, not verified HMAC, and sends no customer WhatsApp message. See [N8N-INTEGRATION.md](N8N-INTEGRATION.md) and [.env.example](../.env.example). For separate static hosting use [COMMERCE-INTEGRATION.md](COMMERCE-INTEGRATION.md).

The footer newsletter submits to the existing `/api/newsletter/subscribe` endpoint. It needs working Firestore persistence; the form reports an error if saving is unavailable.

## What this update preserves

Product catalogue and sizes, prices, server price validation, coupons, shipping rules, cart, quick view, three-step checkout, gift options, email/Google authentication, patron lounge, rewards, admin orders, Urdu/Arabic, dark mode, and concierge remain in the source. Live Firebase authentication, payment and order processing need the existing production configuration; a local visual preview does not verify those integrations.

Reference: https://docs.railway.com/builds/build-and-start-commands and https://docs.railway.com/variables#referencing-a-shared-variable . The current Railway connector rejected setting a `railwayConfigFile` because Config as Code is deprecated. Equivalent build/start/healthcheck settings were set directly on the empty service without triggering a deployment; the existing repository configuration remains preserved.

Readiness uses a bounded read-only database probe and a saved-order confirmation observed in this API process. Initializing Firebase alone does not establish durable readiness; the flag resets on restart. See [COMMERCE-INTEGRATION.md](COMMERCE-INTEGRATION.md) for the exact fields and remaining live checks.

## Prepared owner project — 3 October 2026

Project `AllBarka` (`38281b46-1362-4307-8c2e-7633570fa37b`), production environment `0ae5a09d-9763-41f1-b635-d096d6a07904`, originally had no services. Empty `allbarka-fullstack` service `c5ba8961-3b40-4df6-ae1f-e36bf98dad18` was created and configured for the persistent Express build/start/healthcheck. Its reserved domain is `allbarka-fullstack-production.up.railway.app`; APP_URL/FRONTEND_ORIGINS point to that same HTTPS origin.

The15 existing environment shared variables were linked by `${{shared.NAME}}` references, preserving their values. The four missing public Firebase Web app fields were added from the owner's supplied configuration. Private values were not printed or copied to Git. All variable writes used `skipDeploys:true`. Values are redacted by Railway OAuth; reference presence does not prove secret validity or runtime connectivity.

No source is attached and there is no deployment. Connect this completed branch/source after review. The service's public `VITE_API_BASE_URL` was explicitly set blank for fullstack same-origin hosting, with `skipDeploys:true`; the shared variable and all private secrets were preserved. Private Admin credentials `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` are not present in this service. `TRUST_PROXY_HOPS` remains unverified: inspect the actual ingress forwarding chain after deployment before changing its default. Domain generation alone does not prove an app is running. Verify authorized Firebase hostname and the owner's admin custom claim privately; `ADMIN_UID` alone cannot grant privileges.
