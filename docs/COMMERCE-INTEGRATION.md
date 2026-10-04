# Frontend, Express and Firebase host settings

4October2026: [INTEGRATIONS.md](../INTEGRATIONS.md) is the current order/status/loyalty contract. Status delivery now falls back to the order webhook when no dedicated status URL is set; its receiver must handle both event types. The worker polls15seconds after completion, with one initial send plus five retries. Existing inactive workflow files require review before publication.

This repository supports same-origin Express hosting and a separately hosted static frontend. Both need a real Express commerce API and durable Firebase Admin persistence for accepted orders. n8n is the chat/order-mirror workflow; it is not the checkout server.

## Existing persistent Express host

Use Node 22.12+ or Node24 and npm11. Run `npm ci`, `npm run build`, then `npm start`. Runtime `build/server.cjs` serves the browser build in `dist` and starts the durable outbox worker. Use the existing chosen backend host; no always-on free service is assumed.

Set server-only host variables:

| Variable | Value/purpose |
|---|---|
| `NODE_ENV`, `PORT`, `APP_URL` | `production`, host port and actual public HTTPS storefront URL |
| `FIREBASE_PROJECT_ID` | Owner's project, currently `allbarka-live` |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin service-account credentials on the actual API host |
| `FIRESTORE_DATABASE_ID` | `(default)` unless deliberately using another database |
| `ADMIN_UID` | Owner UID for the private grant script; this variable alone does not grant access. Existing `admin:true` or `role:admin` custom claims are required. |
| `FRONTEND_ORIGINS` | Comma-separated exact HTTPS static frontend origins; no wildcard/path |
| `TRUST_PROXY_HOPS` | Actual trusted reverse-proxy hop count |
| `AI_GUEST_HASH_SECRET` | Distinct random 32+ character guest-trial secret |
| `N8N_AI_WEBHOOK_URL`, `N8N_AI_WEBHOOK_SECRET` | Published private chat webhook and its random 32+ character Header Auth secret |
| `N8N_AI_TIMEOUT_MS` | `22000`; n8n20s < Express22s < browser30s |
| `N8N_ORDER_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` | Private order mirror webhook and separate random secret |
| `N8N_ORDER_TIMEOUT_MS` | `5000`, bounded1000–30000; includes acknowledgement body |
| `N8N_STATUS_WEBHOOK_URL`, `N8N_STATUS_WEBHOOK_SECRET`, `N8N_STATUS_TIMEOUT_MS` | Optional dedicated authenticated status receiver; blank URL uses the shared order endpoint/secret. |
| `LOYALTY_POINTS_PER_100_RUPEES` | Optional nonnegative integer; default1 point per complete Rs100 of saved payable total. |
| `N8N_INTEGRATION_SECRET` | Distinct random 32+ character n8n-to-commerce credential; private integration routes only. |
| `WHATSAPP_META_APP_SECRET`, `WHATSAPP_BUSINESS_PHONE_ID` | Original Meta signature verification and expected business phone; not browser/profile identifiers. |
| `WHATSAPP_PARENT_VERIFIED` | Keep false until actual Meta parent and raw-signature forwarding are inspected and tested. |

Worker retry/lease controls are fixed in code as documented in [N8N-INTEGRATION.md](N8N-INTEGRATION.md). Static hosting does not execute their jobs. API CORS allows exact configured origins and required Authorization, Content-Type, Idempotency-Key and X-Guest-Claim-Token headers. Account operations continue using verified Firebase Bearer tokens rather than cross-host cookies.

## Public browser build variables

Set these on the frontend build host, or as GitHub Actions repository variables for Azure:

```text
VITE_API_BASE_URL=https://<actual-commerce-api-origin>
VITE_FIREBASE_API_KEY=<Firebase Web app public API key>
VITE_FIREBASE_APP_ID=<Firebase Web app ID>
VITE_FIREBASE_PROJECT_ID=allbarka-live
VITE_FIREBASE_AUTH_DOMAIN=allbarka-live.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=allbarka-live.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<Firebase Web app sender ID>
VITE_FIRESTORE_DATABASE_ID=(default)
```

`VITE_FIREBASE_MEASUREMENT_ID` is optional. Firebase web identifiers are public configuration; Admin private keys and webhook/Groq secrets are not. Static validation rejects unknown nonempty `VITE_*` variables, placeholder credentials, malformed Firebase web identifiers and invalid API origins. It reports names without printing values.

`VITE_API_BASE_URL` is one HTTPS origin without `/api`, user/password, query or fragment. It is required for static hosting. Leave blank only for same-origin fullstack hosting where Express actually serves `/api/*`.

## Azure and Netlify static publication

Actual static output is **`dist-client`** from `npm run build:frontend`, never `build/` or the repository root. Azure CI passes public variables into an explicit browser build, checks its artifact and publishes that already-built directory with `skip_app_build:true`. Netlify uses [netlify.toml](../netlify.toml), which checks configuration, builds `dist-client` and validates the artifact.

Incomplete static configuration fails before publication. Artifact checks reject server bundles, environment files, private key material and known server secrets. Azure's SPA fallback excludes `/api/*` and media. Netlify's API route returns a clear404 before the `/index.html` rewrite. Client routes such as checkout/product pages recover on reload while API errors never become successful HTML receipts.

Changing public variables requires rebuilding. These repository edits do not change host settings or deploy. Config references: [Microsoft prebuilt-app settings](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration), [Netlify file settings](https://docs.netlify.com/build/configure-builds/file-based-configuration/), [Netlify SPA routing](https://docs.netlify.com/build/configure-builds/javascript-spas/).

## Firebase Authentication

The owner confirms Firebase providers are already enabled. Add the exact production frontend hostname(s) to Authorized domains and verify the existing Web app configuration. The app exposes Continue with email, explicit account creation and Continue with Google; phone authentication is absent. An enabled Phone provider does not verify a checkout/profile phone or a WhatsApp sender. Provider enablement does not populate missing Web app identifiers or configure Admin.

Browser login uses public Web app config; Express verifies its ID token using Admin credentials from the same intended project. Verify Google popup/domain handling, email account creation/login and account/admin routes on the actual origin. Never expose Admin credentials in a frontend build to solve authentication.

## Readiness before customer orders

The **actual API host's** `/api/commerce/readiness` must reflect real auth initialization and durable database readiness. A green frontend deployment or pricing quote is insufficient. Verify CORS preflight/quote first, then one specifically owner-authorized saved checkout, receipt reload, duplicate retry, account/admin view and acknowledged Sheet mirror. Offline tests submit no real order/message.

Read-only host checks on 3 October 2026 reached both public hosts. Netlify `/api/health` returned200 with `apiActive:false`; `/api/commerce/readiness` returned200 with `authActive:false`, `databaseConnected:false`, `durablePersistenceReady:false` and `orderStore:none_in_memory_contained`. Azure returned404 for both API paths. These hosts still cannot establish a working customer checkout. The returned Netlify notice is older deployed code, not evidence of a scheduled configuration job. No deployment or workflow activation was performed.

Readiness separates `databaseInitialized` from `databaseConnected`/`connectivityVerified`. It performs a read-only `_health/commerce` document probe with a three-second deadline, cached for thirty seconds; even a nonexistent document verifies access. `durablePersistenceReady` stays false until database access succeeds and this API process has accepted a durably saved order or verified its saved duplicate. The flag resets on restart and reports `readinessBasis:read_only_database_probe_and_saved_order`. No test order is created by the probe. `authActive` reports Admin initialization, not a verified user sign-in; n8n configuration likewise does not certify provider/Sheet connectivity. Perform the owner-authorized end-to-end checks above.

Selected rewards whose benefit is not implemented by canonical pricing are rejected with `REWARD_APPLICATION_UNAVAILABLE` and remain active. The existing checkout does not auto-select them. No new pricing or reward benefit is invented.

## Current follow-up configuration and activation boundary

The Railway project now has an empty `allbarka-fullstack` service with the existing shared variables referenced, required public Firebase build identifiers added and the reserved HTTPS origin set. Existing secrets were preserved and deployment was skipped. There is no connected repository source, deployed revision or live Railway API evidence yet. See [RAILWAY-LAUNCH.md](RAILWAY-LAUNCH.md) for the exact prepared service and remaining host steps.

Before enabling the outbox, create the `orderEvents` collection composite index in [firestore.indexes.json](../firestore.indexes.json): `eventType` ascending, `nextAttemptAtMs` ascending, collection scope. Preserve other project indexes. Wait for Ready. It separates enabled creation/status queues so disabling one receiver cannot starve the other. This source file does not apply any cloud index.

For Sheet synchronization, privately set n8n `ALLBARKA_COMMERCE_ORIGIN`, `N8N_SHEET_BRIDGE_URL`, `N8N_SHEET_SYNC_SECRET` and the matching bound Apps Script property `SHEET_SYNC_SECRET`. Select the private Header Auth credentials and existing Sheet/Groq/Meta resources as described in [N8N-INTEGRATION.md](N8N-INTEGRATION.md). Do not put secrets in Sheet cells. The JSON files are inactive; Apps Script is source only. Import, credential selection, script deployment, publish and owner-approved live tests remain pending.

Automatic WhatsApp-created order acceptance is deliberately blocked pending verified product/portion mapping into the canonical order/stock transaction. Legacy Sheet prices are not imported as trusted checkout totals. Receipt text distinguishes saved order receipt from payment receipt, and link clicks do not start a WhatsApp conversation window. Unknown external send outcomes require reconciliation rather than automatic resend.
