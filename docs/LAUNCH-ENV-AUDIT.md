# AllBarka Railway connection audit — 4 October 2026

Scope: preserve completed implementation; audit the dedicated branch, correct setup documentation/credential ignore coverage, normal push only. No merge, deployment, variable change, n8n publication or customer traffic.

Repository: Taha7869/AllBarka-34.
Branch: codex/launch-checkout-groq-outbox-20261003.
Preflight base commit: 2afd16f4dbf44ac3d89050ebdc45eb721adcc6b3; GitHub advertised exactly that SHA before this documentation-only follow-up.

## Current Railway evidence

Project AllBarka / production / allbarka-fullstack. Connector reads show an offline service, no latest/active deployment and no staged changes. Build/start/health are configured correctly. Root directory is unset (repository root). Config returned no repo/branch source object; source connection cannot be certified from these connector fields.

There are 28 user-defined service variable names: 21 are used by this implementation and seven are unsupported extras. The table below includes the additional automatic RAILWAY_PUBLIC_DOMAIN. OAuth redacts values: presence does not validate credentials, formats, webhook publication or blank VITE_API_BASE_URL.

S15 means covered by the original 15 shared variables in the handoff; all 15 names are present on the service today. Railway's read-only inspector reported shared references, but did not expose raw reference/value payloads for independent verification. In particular, it reported VITE_API_BASE_URL currently referencing the shared variable. Its resolved value is unknown: verify or explicitly blank the service value for this fullstack setup without overwriting shared/private values.

TRUST_PROXY_HOPS is absent and should remain absent until actual ingress is verified.

## Canonical application/build/operator variables

39 distinct names, including aliases and import.meta.env reads. File references are repository-relative source locations.

### Already in Railway (names verified; values redacted)

| Variable | Coverage | Used where | Required/optional | Expected format |
| --- | --- | --- | --- | --- |
| FIREBASE_PROJECT_ID | S15 | server.ts:60; Admin/outbox scripts | Production; default allbarka-live | Plain project ID |
| FIRESTORE_DATABASE_ID | S15 | server.ts:77–89; outbox report | Optional; default (default) | Plain database ID |
| NODE_ENV | S15 | server.ts:227,933; scripts/dev.mjs | Required production | Plain literal production |
| AI_GUEST_HASH_SECRET | S15 | server.ts:875; src/lib/aiGuestTrial.ts | Required for guest AI | Distinct random plain secret, >=32 characters |
| N8N_AI_WEBHOOK_URL | S15 | src/services/n8nAIConsultant.ts:50 | Required to enable AI | Private HTTPS webhook; no credentials/query/fragment |
| N8N_AI_WEBHOOK_SECRET | S15 | src/services/n8nAIConsultant.ts:51 | Required to enable AI | Plain Header Auth secret, trimmed length >=32 |
| N8N_AI_TIMEOUT_MS | S15 | src/services/n8nAIConsultant.ts:56 | Optional; default22000, clamp1000–22000 | Decimal milliseconds |
| N8N_ORDER_WEBHOOK_URL | S15 | src/services/n8nOrderNotification.ts:23 | Required to enable creation mirror | Separate private HTTPS webhook; no credentials/query/fragment |
| N8N_WEBHOOK_SECRET | S15 | src/services/n8nOrderNotification.ts:24 | Required to enable creation mirror | Nonempty plain Header Auth secret; recommend >=32 |
| N8N_INTEGRATION_SECRET | S15 | src/lib/integrationAuthentication.ts:12 | Required for private n8n routes | Plain secret; trimmed >=32, raw <=512 characters |
| VITE_API_BASE_URL | S15 | src/lib/apiUrl.ts:2; static-config verifier | Must be blank for Railway same-origin | Empty string; external static-host mode accepts HTTPS API origin without /api |
| VITE_FIREBASE_AUTH_DOMAIN | S15 | src/lib/firebaseAuth.ts:9; googleAuthentication.ts:32 | Auth configuration; default existing Firebase domain | Public bare hostname |
| VITE_FIREBASE_PROJECT_ID | S15 | src/lib/firebaseAuth.ts:6; static verifier | Auth configuration; default allbarka-live | Public project ID |
| VITE_FIREBASE_STORAGE_BUCKET | S15 | src/lib/firebaseAuth.ts:10 | Optional for current auth; existing default | Public bucket name |
| VITE_FIRESTORE_DATABASE_ID | S15 | src/lib/firebaseAuth.ts:13 | Optional; default (default) | Public database ID |
| VITE_FIREBASE_API_KEY | Direct/public | src/lib/firebaseAuth.ts:8; googleAuthentication.ts:30 | Required at browser build; empty committed fallback | Public Firebase Web API-key string |
| VITE_FIREBASE_APP_ID | Direct/public | src/lib/firebaseAuth.ts:7; googleAuthentication.ts:31 | Required at browser build; empty committed fallback | Public 1:<digits>:web:<hex> identifier |
| VITE_FIREBASE_MESSAGING_SENDER_ID | Direct/public | src/lib/firebaseAuth.ts:11 | Optional for current authentication | Public numeric string |
| VITE_FIREBASE_MEASUREMENT_ID | Direct/public | src/lib/firebaseAuth.ts:12 | Optional | Public G-… measurement ID |
| APP_URL | Direct | server.ts:944 | Recommended; falls back to Railway hostname | Plain public HTTPS origin |
| FRONTEND_ORIGINS | Direct | server.ts:208; src/lib/apiCors.ts | Optional same-origin; required for external CORS origins | Comma-separated exact HTTPS origins; no path/wildcard |
| RAILWAY_PUBLIC_DOMAIN | Automatic | server.ts:944–945 | Optional automatic APP_URL fallback | Bare Railway hostname |

### Owner must add privately / optional absent configuration

Only the first six below are missing integration configuration for the agreed production services. Other rows are optional, supplied by Railway, operator-only, or must remain disabled. URLs/IDs are configuration rather than secrets; keep private webhook endpoints off the browser.

| Variable | Used where | Required/optional | Expected format |
| --- | --- | --- | --- |
| FIREBASE_CLIENT_EMAIL | server.ts:61; set-admin/report scripts | Required for production Auth/Firestore | Plain service-account email |
| FIREBASE_PRIVATE_KEY | server.ts:62–68; set-admin/report scripts | Required for production Auth/Firestore | Plain PEM; actual newlines or literal \n; not JSON/base64 |
| N8N_STATUS_WEBHOOK_URL | src/services/n8nStatusNotification.ts:6 | Required to enable status mirror | Separate private HTTPS webhook; no credentials/query/fragment |
| N8N_STATUS_WEBHOOK_SECRET | src/services/n8nStatusNotification.ts:7 | Required to enable status mirror | Separate nonempty plain Header Auth secret; recommend >=32 |
| WHATSAPP_META_APP_SECRET | src/lib/whatsappCommerce.ts:25 | Required for verified Meta integration | Actual plain Meta app secret, >=16 characters |
| WHATSAPP_BUSINESS_PHONE_ID | src/lib/whatsappCommerce.ts:26 | Required for verified Meta integration | Actual numeric Meta phone ID, 5–30 digits |
| WHATSAPP_PARENT_VERIFIED | src/lib/whatsappCommerce.ts:28 | Optional gate: remain unset/false until parent inspected | Only exact true enables; not a secret |
| ADMIN_UID | scripts/set-admin.mjs:8 | Only required when owner runs claim-grant script | Private Firebase user UID; not runtime admin authorization |
| N8N_ORDER_TIMEOUT_MS | src/services/n8nOrderNotification.ts:25 | Optional; default5000; >=1000 capped30000 | Decimal milliseconds |
| N8N_STATUS_TIMEOUT_MS | src/services/n8nStatusNotification.ts:7 | Optional; same order transport default/bounds | Decimal milliseconds |
| PORT | server.ts:184,977 | Railway supplies at runtime; default3000 | Decimal port; do not manually require |
| TRUST_PROXY_HOPS | server.ts:185–189 | Optional default0; must remain unset until ingress verified | Nonnegative integer string |
| FIRESTORE_EMULATOR_HOST | server.ts:76–91; report script:61 | Must be unset/blank in production | Development host:port only |
| DISABLE_HMR | vite.config.ts:17 | Optional development only | Exact true disables HMR |
| GOOGLE_SHEETS_ID | server.ts:174–180 | Optional dormant legacy initializer; not needed for n8n sync | Plain spreadsheet ID |
| GOOGLE_SERVICE_ACCOUNT_EMAIL | server.ts:174–180 | Optional dormant legacy initializer | Plain service-account email |
| GOOGLE_PRIVATE_KEY | server.ts:174–180 | Optional dormant legacy initializer | Plain PEM; actual newlines or literal \n |

FIREBASE_SERVICE_ACCOUNT is already set in Railway but this branch never reads it. Obtain client_email and private_key from the existing service account privately and set FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY; do not commit its JSON. Keys accept real newlines or literal backslash-n via replace(/\\n/g, '\n'); there is no base64/JSON decoder and surrounding quote characters are not part of the value.

Other current Railway names not consumed by this branch: ADMIN_API_KEY, JWT_SECRET, N8N_WEBHOOK_URL, VERIFY_TOKEN, WHATSAPP_PHONE_ID and WHATSAPP_TOKEN. Do not delete or overwrite them automatically; they do not satisfy the similarly named supported variables.

### Additional scanner/test-only reads

| Variable | Used where | Requirement/format |
| --- | --- | --- |
| GROQ_API_KEY | scripts/verify-static-config.mjs artifact scanner | Optional secret-leak inspection only; no application provider read |
| GEMINI_API_KEY | Artifact scanner; production/Admin fixture isolation | Not a launch setting; no current Gemini provider read |
| WHATSAPP_ACCESS_TOKEN | Artifact scanner | Optional secret-leak inspection only; Meta send credential belongs in n8n |
| FIREBASE_AUTH_EMULATOR_HOST | Production/Admin fixture isolation | Must remain unset in production; development host:port only |
| GOOGLE_APPLICATION_CREDENTIALS | Production/Admin fixture isolation | Not a replacement for this server's explicit Admin credential pair |

The dynamic VITE whitelist/scanner and test mutations do not introduce additional supported secret-bearing frontend variables. Never prefix Admin/provider/webhook secrets with VITE_.

## Separate n8n host and Apps Script configuration

These are not application process.env reads or automatically satisfied by Railway variables.

| Name | Used where | Required/format |
| --- | --- | --- |
| ALLBARKA_COMMERCE_ORIGIN | Status, tracking patch, WhatsApp-window JSON | Required when enabled; exact HTTPS backend origin |
| N8N_SHEET_BRIDGE_URL | Status-sync JSON | Required for Sheet bridge; Apps Script HTTPS /exec URL |
| N8N_SHEET_SYNC_SECRET | Status-sync JSON | Required plain secret >=32; same as Apps Script SHEET_SYNC_SECRET |
| WHATSAPP_GRAPH_VERSION | WhatsApp-window JSON | Required for sends; verified supported v<major>.<minor> string |
| WHATSAPP_BUSINESS_PHONE_ID | WhatsApp-window JSON | Required for sends; same actual numeric Meta phone ID as backend |
| ORDER_CONTROL_SHEET | OrderControl.gs Script Properties | Optional plain tab name; default Order_Control |
| SHEET_SYNC_SPREADSHEET_ID | OrderControl.gs Script Properties | Required Sheet ID populated during owner installation |
| SHEET_SYNC_SECRET | OrderControl.gs Script Properties | Required private plain secret >=32 |
| SHEET_WRITER_EMAIL | OrderControl.gs Script Properties | Optional verified writer email; required for that principal's protected writes |

Groq API credentials, Meta send-token credential, Google Sheet credentials and the matching n8n Header Auth credentials belong in existing n8n credential records. They are not committed JSON secrets. Workflows remain unverified for import/publication/live use.

## Exact deploy contract

- Source repository Taha7869/AllBarka-34; exact branch above, never main.
- Service root / (repository root), RAILPACK builder.
- Build npm run build: Vite writes public dist/; esbuild writes private build/server.cjs.
- Start npm start: node build/server.cjs.
- Engines: Node >=22.12.0 <25 and npm11.x.
- server.ts binds Number(process.env.PORT || 3000) on 0.0.0.0.
- Health /api/health, timeout120s; repository restart ON_FAILURE/max3.
- Same-origin VITE_API_BASE_URL must be empty at build; TRUST_PROXY_HOPS remains unset.
- /api/commerce/readiness is a separate readiness probe; a healthy process alone does not prove Auth/Firestore or a saved order.

## Safety evidence and manual steps

446 tracked files at the preflight base plus the branch-specific commit patch were scanned. No xoxb, Slack-hook, EAAG or full-shaped provider tokens were found. apiKey/password matches are empty configuration, application code/docs or synthetic tests. tests/static-config.test.mjs contains a synthetic PEM header for leak rejection, without any key body.

.gitignore covers .env* except intentional .env.example, node_modules, named service-account JSON/credentials files, and now *firebase-adminsdk*.json.

1. Privately set the missing Firebase Admin pair; verify the existing public Web config and blank same-origin API value. Preserve existing shared values.
2. Add allbarka-fullstack-production.up.railway.app (and any final custom hostname) to Firebase Authorized domains; existing email/password and Google providers remain.
3. Create the COLLECTION-scope orderEvents composite index: eventType ASCENDING, nextAttemptAtMs ASCENDING, preserving existing indexes.
4. Configure status webhook pair and Meta app-secret/phone-ID pair privately. Set up n8n/Apps Script using existing docs; keep WHATSAPP_PARENT_VERIFIED false/unset until original Meta parent/signature forwarding is inspected.
5. When separately authorized, connect the exact branch with the settings above, then perform real-origin Auth/readiness/order/retry/Sheet/WhatsApp tests and verify ingress before setting TRUST_PROXY_HOPS.

Not verified: redacted values and resolved blank API base, Admin permissions/key validity, live Firebase authorized domains/index, repo-source linkage, actual ingress chain, published n8n/Apps Script/Meta parent or end-to-end behavior. No deployment was performed.

## Follow-up verification

4Oct checks passed: npm run typecheck; npm run build (public frontend and private server bundle); npm run test:workflow (45/45); git diff --check; git check-ignore for env/dependency/service-account/Firebase-adminsdk credential examples. The existing >500kB Firebase chunk warning remains; this audit changes no application behavior. The3Oct handoff retains the larger offline integration/checkout/backend test results; those were not rerun or represented as live verification here.
