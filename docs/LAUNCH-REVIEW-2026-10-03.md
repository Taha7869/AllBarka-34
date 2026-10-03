# AllBarka launch review — 3 October 2026

Reviewed GitHub main `3f5123b8e81e9b816dd178877189091744e31831` and live public endpoints. The current source has 32 catalogue products, categories/search/filtering, cart drawer/page, custom hampers, three-step COD/bank checkout, receipt recovery, email/Google accounts, admin order operations, product media, account updates and English/Urdu/Arabic. This feature inventory is not proof that externally hosted integrations are enabled.

## Confirmed live blockers

| Site | Evidence | Implication |
|---|---|---|
| `https://allbarka.netlify.app` | `/api/health` returns 200; `/api/commerce/readiness` reports `authActive:false`, `databaseConnected:false`, `durablePersistenceReady:false`. A non-order quote for Pista 500g returns Rs.2,650. | API pricing is available, but Firebase Admin is unconfigured and automatic orders cannot be saved. Site assets are an older build. |
| `https://jolly-glacier-0c820da10.1.azurestaticapps.net` | Latest main asset hashes match the locally reproduced build. `/api/health` and `/api/commerce/readiness` return 404; quote POST returns 405. The published Firebase config uses blank app ID/API key. | Current frontend deployment has no commerce API routing and no usable Firebase web config. A green Azure deployment does not verify checkout. |

The latest GitHub Actions Azure deployment succeeded on 3 October, run `37111826241`. Neither live environment is verified for accepting automated customer orders. No real order, customer message or production credential was submitted during this review.

## Changes prepared

- Static storefronts can use `VITE_API_BASE_URL`, one HTTPS commerce-server origin with no `/api` suffix. Every existing frontend API caller uses it: checkout/quote, chat, session recovery, order history, contact/newsletter, admin, media and updates. Blank keeps the existing same-origin fullstack behavior.
- Express supports exact comma-separated `FRONTEND_ORIGINS` for cross-host API requests and checkout/authentication preflights. No wildcard or cross-host cookie access is enabled; authenticated operations continue using verified Firebase ID tokens.
- Quotes are invalidated before a refresh/identity change. A `QUOTE_CHANGED` order rejection triggers a new quote for customer review. The order submission deadline now covers stalled JSON bodies, preserving its retry key and releasing the request lock. A signed-in customer with a failed token refresh must sign in again instead of silently creating a guest order.
- Private n8n chat has a required header secret, four-message history, robust existing-brain/n8n response parsing and a bounded 22-second deadline. Offline responses display support/retry and the chat includes an AI guidance notice in all three languages.
- `n8n/allbarka-website-ai.json` is an importable inactive bridge to the existing `allbarka-brain` model. It needs a header credential and the owner's current AI Brain URL. It does not send WhatsApp messages or reuse the WhatsApp order-taking branch.
- Azure CI receives public Firebase web variables and the commerce origin during both checks and the actual Azure build. Its new static-config check stops incomplete builds before publication.
- The backend notification failure test now uses a local mock HTTP 500, preventing its old request from sending fixture customer data to a third-party testing service.

## Exact next configuration

### Existing commerce host (AWS/other chosen backend)

Run the repository's full build and `npm start`. Set `NODE_ENV=production`, `APP_URL`, `FIREBASE_PROJECT_ID=allbarka-live`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIRESTORE_DATABASE_ID=(default)`, `AI_GUEST_HASH_SECRET` (32+ random characters), and `TRUST_PROXY_HOPS` for the actual controlled ingress. Keep private values in host settings, never GitHub source or chat.

For a separately hosted frontend set `FRONTEND_ORIGINS` to its exact HTTPS origin, or comma-separated Azure/Netlify origins if both are intentionally in use. Configure the n8n variables as described in `AI_CONSULTANT_LAUNCH.md`. `N8N_ORDER_WEBHOOK_URL` and `N8N_AI_WEBHOOK_URL` must target their respective order/chat workflows.

### Azure build

In GitHub Settings → Secrets and variables → Actions, set repository variables `VITE_API_BASE_URL` (your actual HTTPS commerce host), `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_STORAGE_BUCKET` and `VITE_FIREBASE_MESSAGING_SENDER_ID`. The workflow accepts existing secrets for the API key and app ID too. These are Firebase public web identifiers; never use Firebase Admin credentials here. Add the frontend domain to Firebase Authentication authorized domains and enable Email/Password and Google.

### Netlify if kept as the frontend

Use build command `npm run verify:static-config && npm run build:frontend`, publish directory `dist-client` and the same public `VITE_*` variables in Netlify build settings. Configure the SPA fallback for `/checkout`, `/product/*` and the other application routes. Keep the existing API proxy if deliberately using same-origin hosting; the new code also supports the explicit HTTPS commerce origin. No paid host is required by these code changes.

## Verification before customers

1. Commerce host `/api/commerce/readiness` must report auth and durable persistence true. This checks SDK initialization; also place one owner-authorized test order and verify its Firestore document, receipt reload and account order history.
2. From the actual frontend, verify a quote plus CORS preflight, COD/bank order, duplicate retry, customer login and owner/admin visibility. A static frontend's own `/api/health` does not establish the separately hosted API's readiness.
3. Activate/test the website n8n bridge and the independent order-event webhook. Correct the older WhatsApp bot's global/VIP free-shipping statements to the canonical Lahore-only rule.
4. Verify mobile cart/checkout, languages, human support, real delivery/payment instructions and product packaging. Local and mocked tests cannot certify production Firebase, the running Ollama model or real order dispatch.

## Local validation of the prepared patch

- TypeScript and React Hooks lint: passed.
- Production build: passed; the existing large Firebase chunk warning remains.
- Node unit/render/integration suite: 216 passed, zero failed, including nine new launch/website-bridge tests.
- Backend suite: 21 passed, zero failed. Production-bundle smoke checks: 36 passed.
- Catalogue assets: 32 products, 50 nonempty local image references verified.
- Standalone browser QA could not run in this environment because the Chromium download did not produce a usable archive. Mobile interaction and full checkout visual QA are not certified by these results.

No new npm dependency was added. `node --import tsx` was used to run tests here because the `tsx` CLI's IPC socket was blocked in this environment; the existing test scripts continue to be available for the owner's environment.

Deployment, n8n activation and a real durable test order remain pending access/configuration of the owner's actual hosts.
