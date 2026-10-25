# AllBarka launch handoff — 3 October 2026

## Order integration follow-up — 4 October 2026 (current)

Branch `codex/order-integrations-loyalty-20261004`, based on latest merged catalog `origin/main` (`c6e6a04`). Current contract and pending live setup: [INTEGRATIONS.md](INTEGRATIONS.md). Existing catalog, shipping, authentication and coupon work is preserved.

Implemented: structured/redacted outbox error diagnostics with failed step/event/HTTP status, per-cycle heartbeat and health worker state;15second scheduling and max5retries after the initial attempt; stable lowercase event types alongside legacy envelopes; shared order/status receiver fallback; authenticated fulfillment update API with timestamp/event dedup and semantic no-op handling; exact seven live Sheet statuses; unknown-order200 ignore; website-only atomic `pointsLedger/{orderId}` award/legacy-marker checks and held guest claim credit; backend-derived tracking/ETA/points and30second customer refresh. Creation/status also create existing backend-gated WhatsApp jobs. n8n does no pricing/points/window logic.

Read-only Railway inventory/logs confirm a SUCCESS production service on `main`, Firebase Admin startup, and repeated old label-only worker errors. Their root cause cannot be recovered from those logs. New production diagnostics require the owner's reviewed deployment. No production data, variables, workflows or deployment were changed. Older handoff service-offline/missing-Admin-credential statements below are historical; the user reports working Firebase and current inventory shows the running service.

Remaining: review PR; configure/publish the combined or dedicated n8n receiver with the documented acknowledgements, fulfillment command mapper and existing window-gated WhatsApp pump; verify actual database composite index/Meta parent credentials; deploy when authorized; inspect detailed error/heartbeat and test disposable end-to-end orders. Outside-window utility templates require separate backend authorization and Meta approval; they are not enabled here. Final checks and resulting pushed SHA are recorded in the final PR/response.

Final verification: TypeScript and React hooks lint passed. `npm test` built the fullstack app, passed478/478 Node tests across44 test families,21 legacy backend checks and47 production-bundle HTTP checks. Asset audit:89 products,107 image references,103 unique files,57 single-image placeholders,0 missing files or retired views. Browser QA passed12 mobile/desktop × English/Urdu/Arabic × light/dark tracking cases, including current timeline step, private mocked receipt refresh, tracking/ETA/earned points and label overflow checks. Catalog data, fonts and all image files are unchanged. Changed-file credential audit found0 credentials; whitespace checks passed. No live order/update/WhatsApp request was sent.

## Coupon follow-up — 4 October 2026

Current work branch: `codex/full-coupons-quote-fix-20261004`, based on preserved launch branch commit `1fab4ac90374272f801a4211d93b3d8808d4b94a`. This follow-up changes checkout promotions only and their Firestore, receipt, Admin and Sheet safety plumbing. No merge or deployment is authorized.

The undefined `maxDiscount` bug is removed. Every Firestore write is deep-sanitized, with backend `ignoreUndefinedProperties` as secondary protection. Ten codes now share a server-only configuration, canonical pricing, benefit flags, inline effects/errors and one-code validation. WELCOME10 requires a verified account and Firestore history; competing checkouts share an atomic customer history marker. Saved duplicate receipts and historical discounts retain their original values.

CANCER now saves a real `QUOTE_REQUEST`/`QUOTE_REQUESTED` receipt with the normal tracking ID, zero monetary totals, no payment selection and no loyalty award. Admin/Sheet block payment or fulfillment of an unpriced quote. The durable website order event and inactive n8n receiver preserve the quote status and packing promo notes. The input placeholder reads “Enter promo code.” Details and owner setup are in [docs/COUPONS.md](docs/COUPONS.md).

Final verification passed: `npm test` built the fullstack app and ran all 36 test files (400/400 tests), 21 legacy backend checks, 45 production HTTP checks and all 32 products/50 image references. TypeScript, React hooks lint, diff whitespace and actual public artifact credential/promo isolation checks passed. The Firestore regression uses strict write validation and the real SDK serializer with undefined ignoring disabled; no live database was contacted. The existing large Firebase vendor chunk warning remains.

Live setup remains pending: existing Firebase/Railway private configuration, reviewed import/publish of updated n8n website/status artifacts and the bound OrderControl Apps Script, then authorized disposable-order tests. Coupons introduce no new secrets or composite indexes. Nothing has been imported, published, deployed or sent to customers. The final response records the commit and verified remote branch SHA.

## Connection preflight follow-up — 4 October 2026

The launch implementation remains preserved. GitHub initially matched `2afd16f4dbf44ac3d89050ebdc45eb721adcc6b3`; this follow-up changes setup documentation and credential-file ignores only. See [docs/LAUNCH-ENV-AUDIT.md](docs/LAUNCH-ENV-AUDIT.md) for the complete environment inventory and current Railway evidence.

Railway currently lists unsupported `FIREBASE_SERVICE_ACCOUNT`, while the code requires the absent `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. The status webhook pair and Meta app-secret/business-phone-ID pair are also absent. All original15 shared variable names remain present; four public Firebase fields and APP_URL/FRONTEND_ORIGINS are present as well. Values are redacted: do not claim key validity or that the resolved API base is blank. Verify/blank the service's `VITE_API_BASE_URL` for same-origin hosting without overwriting existing shared secrets. `TRUST_PROXY_HOPS` is absent and remains unset.

The service is offline with no deployment or staged changes. Returned config exposes no repository/branch source object; verify the exact source in the owner's dashboard before connecting. Existing build/start/health settings match the branch. No Railway variables, source, deployments, main branch, n8n workflows or customer data were changed in this follow-up. Historical3Oct configuration below describes that day's setup; current4Oct evidence above takes precedence.

Follow-up checks passed: TypeScript, fullstack build, workflow/static fixtures45/45, diff whitespace and credential-file ignores. No actual committed credential was found; private-key header/password/apiKey matches are test fixtures or application/docs references. A normal documentation-only follow-up commit is pushed to the same branch; the final response records its SHA.

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
