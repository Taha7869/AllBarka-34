# AllBarka launch handoff — 3 October 2026

Branch: `codex/launch-checkout-groq-outbox-20261003`.
Repository: `Taha7869/AllBarka-34`. Existing changes were preserved; no reset or main-branch merge.

## Current implementation

- Checkout uses current canonical quotes, stable attempt keys, bounded requests and persisted receipt recovery; failed authenticated requests never become guest orders.
- Firebase customer UI retains email login, explicit email signup, password reset and Google login. Phone login stays removed.
- Concierge uses the existing n8n/Groq branch with bounded deadlines, durable guest quota and honest unavailable responses.
- Durable Firestore order outbox has atomic event creation, multi-instance leases, restart recovery, bounded retries and verified acknowledgements. Creation and status have separate receivers.
- Sheet and Admin use one canonical status transaction, revision conflicts, payload-bound request dedup, audit and loyalty effects. New orders write a private phone index; status changes create durable WhatsApp jobs.
- WhatsApp helpers verify original Meta signatures and business phone, provider timestamps and message dedup. Own-phone receipts, multiple-order choices, STOP, closed-window holds, final send authorization and UNKNOWN reconciliation are implemented.
- Success action prefills only `Track my order <saved orderId>` on the automated number and explains that the customer must press Send.
- Inactive n8n website/status/window JSON, targeted tracking patch, bound Apps Script and exact setup documentation are supplied under `n8n/` and `docs/`.

Agreed code and protected integration routes are complete. No additional design/features were added during wrap-up. Normal publication is to this dedicated branch; the final response records the resulting commit and verified remote SHA.

## Final offline verification

- Outbox fixtures: 21 passed, including status/creation isolation, blocked-receiver starvation, restarts, token fencing and exact acknowledgement validation.
- Private integration fixtures: 46 passed, including 19 WhatsApp helper, 12 protected HTTP, 12 Sheet status and 3 authentication/tracking checks.
- Inactive workflow/static fixtures: 45 passed, including Sheet request races, v29 tracking and exact mirror acknowledgements.
- Production bundle HTTP checks: 42 passed, with external services disabled.
- Cart/checkout: 63 passed; backend: 21 passed; shipping: 18 passed; Admin: 36 passed; discovery/full product names: 13 passed; email/Google/shopping experience: 46 passed; concierge: 9 passed.
- TypeScript, React hook lint, fullstack build and browser-only build passed. Actual browser-only artifact privacy/SPA validation passed. All 32 products and 50 image references resolve.
- Actual 320px Arabic checkout rendered with RTL form and complete product name; document width and scroll width both305px (remaining15px is the browser scrollbar). Existing cart was preserved. Earlier 375px drawer and 390px checkout checks passed. No real-device performance claim is made.
- Vite still reports a Firebase vendor chunk above500kB; no performance award or live-integration success is claimed.

## Prepared Railway configuration

Project `AllBarka`, production environment: empty `allbarka-fullstack` service prepared for `npm run build`, `npm start`, `/api/health`, Railway PORT and 0.0.0.0.
Reserved hostname: `allbarka-fullstack-production.up.railway.app`.
Existing 15 shared variables were initially linked by reference. Missing public Firebase build identifiers were added from the supplied Web app configuration. The service's public `VITE_API_BASE_URL` was explicitly set blank for same-origin fullstack hosting; shared values and all private secrets were preserved. Variable writes skipped deployments.

No repository source is connected, no app was deployed and no live Railway order was saved. A generated domain is not deployment evidence.

## Pending live setup

1. Privately configure/verify `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, same project/database selection and the owner's existing admin custom claims. `ADMIN_UID` alone grants nothing.
2. Add the reserved production hostname to Firebase Authorized domains. Verify email/Google authentication on that real origin.
3. Create the collection-scope `orderEvents` composite index from `firestore.indexes.json`: `eventType` ASC, `nextAttemptAtMs` ASC. Preserve existing cloud indexes.
4. Connect the completed branch to Railway and deploy only when authorized. Keep `VITE_API_BASE_URL` blank; verify actual ingress before setting `TRUST_PROXY_HOPS`.
5. Select matching private n8n Header Auth credentials for `N8N_AI_WEBHOOK_SECRET`, `N8N_WEBHOOK_SECRET`, `N8N_STATUS_WEBHOOK_SECRET`, `N8N_INTEGRATION_SECRET`; configure published webhook URLs. Existing Groq credential stays in n8n.
6. Install the bound `n8n/OrderControl.gs` script on the existing Sheet, set private Script Properties and deploy its bridge. Configure n8n `ALLBARKA_COMMERCE_ORIGIN`, `N8N_SHEET_BRIDGE_URL`, `N8N_SHEET_SYNC_SECRET`. Import inactive artifacts, reselect existing resources and publish after review; preserve original workflow/parent linkage.
7. Inspect the actual Meta parent and original-body/signature forwarding. Privately set `WHATSAPP_META_APP_SECRET`, `WHATSAPP_BUSINESS_PHONE_ID` and n8n `WHATSAPP_GRAPH_VERSION`; keep `WHATSAPP_PARENT_VERIFIED=false` until that parent is verified. Route every original sender/retry through the same authorization gate before enabling it.
8. Perform owner-approved disposable-account/order/phone tests for saved checkout, duplicate retry, receipt reload, Admin/Sheet conflict, acknowledged mirror and WhatsApp window/delivery evidence.

The owner supplied `AllBarka-n8n-v29-20261003.zip`; its actual offline validator passed29/29. Compatible tracking/receipt fixes were incorporated without replacing the existing work. The private patch smoke check preserved the original child ID, all original node IDs and selected resources. The actual Meta parent is still absent. Validator/fixture passes do not prove import, publish or live delivery.

Legacy retry hashes are accepted only when the saved delivery slot matches and wholesale mode is explicit or positive persisted loyalty points prove retail; missing/zero mode proof conflicts without recreating the order. New orders persist explicit `isWholesale`.

Automatic WhatsApp-created order acceptance remains blocked pending verified product/portion mapping into the canonical stock transaction. Legacy Sheet prices are not trusted canonical orders. Unknown external send results require reconciliation, not automatic resend. The cinematic Higgsfield film remains pending at the owner's request.

No n8n import/publish, Apps Script deployment, real customer message/order, admin grant or website deployment was performed. See `docs/RAILWAY-LAUNCH.md`, `docs/COMMERCE-INTEGRATION.md` and `docs/N8N-INTEGRATION.md` for exact setup contracts.
