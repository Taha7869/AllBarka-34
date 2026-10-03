# AllBarka Railway launch

This repository runs the React storefront and Express API together. Use the repository root as the Railway service root. `railway.json` sets `npm run build`, `npm start` and `/api/health`. Node 22–24 and npm 11 are specified in package.json. Railway supplies PORT; the existing server listens on 0.0.0.0.

## Setup

The browser build is written to `dist/`, while the private server bundle is written to `build/server.cjs`. Keep these directories separate: Express publicly serves only `dist/`. Do not use the old `dist/server.cjs` start path.

Before deploying, run `npm run typecheck`, `npm run build`, `npm run test:backend`, `npm run test:assets` and `npm run test:production`. The production smoke test disables external integrations and does not create real customer orders. Current results and remaining live checks are in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

1. Push this updated source to your GitHub repository, then connect that repository to a Railway service.
2. Add the environment variables below before building. Generate a public Railway domain and set APP_URL to its HTTPS URL. Set NODE_ENV=production.
3. Add the Railway/custom domain to Firebase Authentication → Settings → Authorized domains. Enable Email/Password and Google. Keep Phone disabled, in line with the customer's requested login methods. Keep your existing Firestore rules and admin permissions. See [AUTHENTICATION.md](AUTHENTICATION.md) for the customer flows and exact web configuration steps.
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

The concierge now uses the same-origin `/api/concierge/chat` API by default, carrying the signed-in user's ID token. Configure GEMINI_API_KEY or the existing N8N_AI_WEBHOOK_URL / N8N_AI_WEBHOOK_SECRET integration. The backend's guest limits remain enforced. Local Ollama remains available for local development by explicitly setting VITE_AI_PROVIDER=ollama; leave this unset on Railway.

For existing order notifications configure N8N_ORDER_WEBHOOK_URL and N8N_WEBHOOK_SECRET. Google Sheets backup variables remain optional; see `.env.example`. No new account or external service was added by the design upgrade.

The footer newsletter submits to the existing `/api/newsletter/subscribe` endpoint. It needs working Firestore persistence; the form reports an error if saving is unavailable.

## What this update preserves

Product catalogue and sizes, prices, server price validation, coupons, shipping rules, cart, quick view, three-step checkout, gift options, email/Google authentication, patron lounge, rewards, admin orders, Urdu/Arabic, dark mode, and concierge remain in the source. Live Firebase authentication, payment and order processing need the existing production configuration; a local visual preview does not verify those integrations.

Reference: https://docs.railway.com/config-as-code/reference and https://docs.railway.com/builds/build-and-start-commands
