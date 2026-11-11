# SEC01 — Admin and credential security hardening

29 October 2026 (Asia/Karachi). Inspected parent: `7a00826106ab8b31f6cc26fe87500047b8477bac`; existing review branch `codex/admin-catalog-foundation-20261023`, PR #16. Scope SELECTED by the owner: secure the admin panel and replace any credential found at risk. Source hardening is implemented; provider credential verification/rotation and deployment remain separate, unfinished gates. No production credentials, roles, records, workflows or hosting configuration were changed.

## Findings and changes

| ID | Severity | Before | Implemented correction / evidence |
| --- | --- | --- | --- |
| SEC01-A | High | General admin endpoints trusted admin privileges cached in an unexpired Firebase ID token. Bearer verification did not request revocation checks. The customer receipt endpoint also used the cached admin claim. | Bearer verification requests `checkRevoked=true`. All existing admin endpoint families share `requireCurrentAdministrator`, which reads the current Firebase account, checks current claims, disabled/deleted status, identity and sign-in revocation timestamp. Provider failure denies access. Receipt admin access uses the same current-authority function. Legitimate owner/guest receipts retain their existing authorization. |
| SEC01-B | High | Raw product reads and inquiry/quote reads/writes accepted cached admin claims directly through Firestore rules, bypassing fresh backend checks. | Scoped prototype rules deny direct client reads/writes for these sensitive collections; current admin UI already uses backend APIs. Local demo emulator verifies private get/list/create/update/delete denial for unauthenticated, customer, another user and old admin claims, plus valid own-profile operations and protected role fields. Rules are not published. |
| SEC01-C | High | `wa-products` returned private wholesale catalog fields without authentication when the integration secret was missing/short. It also accepted secrets in query strings. | Reuse the existing header-only `requireN8nIntegration`: unconfigured returns 503; missing/forged/URL-only credentials return 401. The bundled conversation-engine HTTP node now requires selecting its private Header Auth credential; no value is committed and no remote workflow is edited. Database errors use a generic response. |
| SEC01-D | Medium | Fullstack release audit inspected local dotenv files but omitted hosting-injected environment values; it allowed several unknown VITE provider-key names. | Scan process.env and local dotenv files; use the existing strict public VITE allowlist; reject embedded known private values, escaped values, private-key headers and provider-shaped tokens without printing secret values. CLI fixture tests verify rejections and preserve public Firebase configuration. |
| SEC01-E | Dependency advisories | Initial npm audit reported 23 dependency findings (1 critical, 12 high, 10 moderate). These counts do not prove practical exploitation. | Apply compatible transitive patches and existing package updates: Express 4.22.3, express-rate-limit 8.7.1, Firebase 12.19.0, Admin SDK 14.5.0, Vite 6.4.5. Firebase's Node Firestore dependency pinned grpc ~1.9; a scoped override selects patched @grpc/grpc-js 1.14.6. Final npm audit reports zero advisories. Re-evaluate the override when upstream fixes its pin; do not downgrade Firebase to the audit tool's suggested 9.x version. |
| SEC01-F | Minor | An unused legacy Firestore favorites path allowed arbitrary owner-created documents without shape bounds. Current favorites and bag use existing browser storage. | Deny direct legacy favorites creation/update; retain owner-only historical read/delete. Current wishlist/cart code is unchanged. Emulator covers cross-user denial, write rejection and historical owner access. |

## Credential status — no automatic all-key rotation

Current tracked text-source scan: no provider-shaped real token or private-key body detected outside synthetic tests. This is a scoped pattern scan, not a complete historical Git audit or proof that every credential is safe. Public Firebase Web API keys are intentionally browser configuration; Admin private keys, Meta tokens and provider credentials are secrets.

Railway's OAuth connection exposes names only. It cannot verify secret strength, actual values, issuer, expiry, revocation or whether a value matches its n8n credential. There is no authenticated Meta or n8n dashboard/API connection in this environment. No actual provider secret was regenerated, overwritten or revoked.

| Credential / configuration | Next action and dependency |
| --- | --- |
| FIREBASE_PRIVATE_KEY | If shared/exposed or old key provenance is untrusted, create a replacement key for the existing service account, update Railway, verify Firebase operations, then revoke the old key. Preserve project/database IDs and service-account email when the account is unchanged. Needs authorized Google/Firebase credential access. |
| WHATSAPP_META_APP_SECRET | Inspect the actual Meta app and parent signature receiver; coordinate a reset across all signature verifiers if exposure is established. |
| Meta WhatsApp sending token / Railway WHATSAPP_TOKEN | Inspect the actual n8n credential, expiry, scopes and assigned assets. The inspected Express backend does not read WHATSAPP_TOKEN. Replacing its Railway copy alone cannot rotate n8n. |
| N8N_INTEGRATION_SECRET | If ever transmitted as a URL query, pasted publicly or logged insecurely, treat that copy as exposed and rotate it across Railway and every consuming n8n Header Auth credential before release. Current source removes URL authentication. Actual old URL/log use has not been established. |
| N8N_AI_WEBHOOK_SECRET, N8N_WEBHOOK_SECRET | Inspect private header credentials and values; rotate both sender and receiver together if exposed, reused or weak. Verify AI/order acknowledgements and duplicate handling. |
| AI_GUEST_HASH_SECRET | Replace if exposed, weak or reused. A change resets derived guest fingerprints; do not silently treat it as an account-password change. |
| ADMIN_API_KEY, JWT_SECRET, VERIFY_TOKEN, WHATSAPP_PHONE_ID, N8N_WEBHOOK_URL | Not consumed by the inspected Express implementation. Check external users before deletion or rotation. VERIFY_TOKEN belongs with the actual Meta parent receiver. |
| Groq, Google Sheets/service-account and Apps Script sync credentials | Inspect the actual n8n credential records and Apps Script properties. None was available for value validation or rotation. |

Receiver-before-sender gate: ensure the existing n8n catalog request has private header authentication before releasing the header-only export. No credential is added to the JSON export. Keep the original order receiver compatibility gate from N8N_COMPATIBILITY.md.

WHATSAPP_PARENT_VERIFIED was absent in the read-only Railway inventory. Keep its verified-parent gate closed until original body/signature forwarding and the real business phone ID are inspected. Missing optional dedicated status webhook variables may use the existing order-webhook fallback; they are not automatically errors.

## Verification

- Typecheck, hooks lint and production build/privacy audit: PASS.
- Affected security tests: 37/37 PASS, including real loopback permission matrices, demotion/provider outage, bearer revocation, integration header authentication and release-secret rejection.
- Firestore emulator: PASS on demo-allbarka-security only; no live project or rules write. Existing public read-only reviews/content and valid own-contact updates remain usable; spoofed roles, invalid type/oversized name, changed createdAt and cross-user updates are rejected.
- Existing staff/admin browser grant, reader-only details and immediate revoke handling: PASS using Chrome Headless Shell 153. Initial full Chrome could not start because managed sandbox UNIX socket creation is prohibited; Headless Shell completed the journey without weakening app protections.
- Backend 21/21 PASS; catalog assets 97 products/115 references/111 unique files PASS; production checks 36/36 PASS.
- Final dependency audit: 0 reported advisories. The npm registry/audit snapshot is time-dependent, not a security guarantee.
- Full regression: 722 tests, 720 PASS, 1 FAIL, 1 SKIP in 447.4 seconds across 82 test files. The skip is the emulator-only rules test, which passed separately against the demo emulator. The failure is the existing enlarged-navigation focus assertion in tests/interaction-polish-browser.test.tsx:169 (FH02), preserved from the inspected upstream checkpoint. Full suite exits 1; do not call the release ready. Standalone backend/assets/production gates passed separately because the full runner stops after the failed test family.
- CodeRabbit CLI 0.9.1 installed; auth status not_authenticated. `coderabbit auth login --agent` failed with environment_unsupported: browser login unavailable; Agentic API key or login from a user-controlled terminal is required. No CodeRabbit review was run or passed. Functional tests are independent evidence.

## Review and release boundary

Local source/permission self-review checks the entire intended diff, no pricing/UI/business-rule changes, default-deny failures, role aliases, actual server wiring, private response caching, no secret values in reports and preservation of legacy user contact fields. This is not an independent CodeRabbit review.

Source checkpoint is not merged/deployed and prototype rules are not published. Do not mark the live admin panel secure from local tests alone. Required release gates: current credential review and any justified coordinated rotation, actual admin/staff Auth tests, deploy the matching backend and reviewed rules, verify existing external callers, and retain Stage 6 merchant/order/rollback blockers and the prior M20-FILTER1 status.

Next action: use authenticated Meta/n8n/Firebase access to inspect current credential metadata and coordinate replacements where the risk criteria above apply; resolve the existing FH02 release blocker separately and save this security patch on PR #16. No secret values should be pasted into chat or committed to Git.
