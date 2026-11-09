# AllBarka safety and release cautions

Updated 10 November 2026 (Asia/Karachi; inspection began 9 November UTC). Task **SEC02**. Source inspected: `3b1a1ef71d0be2b34c0e879a0c549c99c3a0c18f`, branch `codex/premium-table-kit-20261108`, [draft PR #17](https://github.com/Taha7869/AllBarka-34/pull/17).

This is the recurring safety register requested by the owner. A checklist does not install a firewall, publish rules, monitor traffic or prove absence of a breach. This checkpoint changes documentation only. Read [RULES.md](RULES.md), the earlier [SEC01 evidence](docs/SECURITY_HARDENING.md) and the [confirmed design/AI plan](docs/SMART_STOREFRONT_AND_AI_PLAN_2026-11-10.md). Existing M01–M34 meanings remain unchanged.

## Where data belongs

| Data | Current source/storage | Important boundary |
| --- | --- | --- |
| Website products, prices, orders, profiles, inquiries, loyalty, staff grants and durable integration events | Google Cloud Firestore through Firebase client/Admin SDKs | `server.ts:92–132` selects `FIREBASE_PROJECT_ID` and `FIRESTORE_DATABASE_ID`. Bundled fallback configuration is `allbarka-live` / `(default)`; actual production values and database region were not read. Railway's Singapore app region does **not** establish Firestore's region. |
| Product photos uploaded through admin | Configured Firebase Storage / Google Cloud Storage bucket | `src/lib/productUploadRouter.ts`; existing download-token URLs are appropriate only for intended public catalog images. Never reuse them for private customer attachments. |
| Website runtime, environment secrets and application logs | Railway service | Application hosting is separate from Firestore. Railway inventory showed no attached volumes or buckets. Container disk/memory is not durable order or upload storage. |
| Existing AI text requests | Browser → Express `/api/concierge/chat` → authenticated HTTPS n8n bridge → Groq | `aiChatRouter.ts`, `aiBuddyResolution.ts`, `n8nAIConsultant.ts`. The actual Groq text credential/model is owned by n8n, not selected by the browser. n8n execution persistence/retention needs separate inspection. |
| Website voice input | Bounded WAV → Express transcription endpoint → Groq, editable transcript returned | Source has no raw-audio persistence; provider/n8n/platform retention is a separate question. Railway variable-name inventory did not show the direct transcription key/confirmation flag. Website voice connectivity is therefore unverified. |
| WhatsApp orders/workflows | Owner's existing separate Sheets/n8n channel; repository also contains guarded integration contracts | Do not silently migrate, merge or duplicate website/WhatsApp order stores. Verify actual current workflow exports before integration changes. |
| Bag, favorites and some checkout drafts | Browser storage | `CartContext.tsx`, `useSavedProducts.ts`, checkout-draft helpers. Browser storage is not a database backup or authority for a confirmed order; review shared-device privacy and expiry. |
| Future specialist AI knowledge | Proposed scoped, versioned records in the existing backend, with optional retrieval indexes later | Not a second editable price database. No new database, vector service, provider account or model training was provisioned here. |

Firestore Admin/server libraries bypass browser Security Rules: server authorization and service-account IAM must also be correct. Public Firebase web configuration identifies an app; it is not an Admin private key. Never treat hiding that configuration as database access control.

## Hosting evidence, read only

Railway production inventory on 9 November 2026 UTC:

- Project/service: AllBarka / `allbarka-fullstack`; configured source **`launch`**, separate from PR #17.
- Configured region `asia-southeast1-eqsg3a`, **one replica**. Health endpoint `/api/health`, 120s healthcheck timeout, three restart retries.
- Environment status: **OFFLINE**, no active/latest deployment returned, no staged changes. A resource labelled `live` by configuration inventory means it exists; it does not contradict runtime `offline`.
- Custom domain `allbarka.com` and two generated Railway domains exist. Domain inventory does not prove DNS proxying, WAF coverage or origin restrictions.
- `source.checkSuites=false`; deployment should not be assumed to wait for successful GitHub checks. Audit release gating before reactivation.
- Tracing/auto-instrumentation off. No dedicated Redis/shared rate-limit store appears in the one-service project inventory.
- Variable **names only** were inspected. Secret values, IAM, Firestore region, rules publication, Cloudflare settings, n8n credentials and backup policies were not inspected or changed.

Railway supports distributing public traffic across multiple replicas; one configured replica provides no application replica redundancy. Adding replicas alone does not provide bot protection or a global AI quota.

## Controls already present in inspected source

| Control | Evidence and limit |
| --- | --- |
| Current administrator authority | `server.ts`, `src/lib/serverAuthentication.ts`, `src/lib/adminAuthentication.ts`: revoked-token checks and current Auth account/claims checks; denial on lookup failure. Staff has a separate reader contract in `staffAccess.ts`. Live identities/grants remain unverified. |
| Private Firestore browser boundaries | `firestore.rules`: orders/products/coupons/inquiries/quotes deny client reads/writes; owner-only bounded contact changes; role/loyalty fields immutable; default deny. Reviews and legacy content remain public read-only. These source rules are not proof of deployed rules. |
| HTTP safeguards | Helmet, per-request script nonces, CSP, exact HTTPS CORS allowlist, 128KiB JSON parser, validated numeric `TRUST_PROXY_HOPS`. CORS controls browser access to responses; it does not stop curl, bots or all unwanted requests. |
| Request throttling | `server.ts`: AI paths 10/IP/minute plus authenticated patron 10/UID/minute; inquiries/contact 5/IP/minute; order POST 10/IP/minute. n8n commerce router 60/IP/minute. Default in-process stores, not a distributed quota. Not every route has a limiter. |
| Durable guest allowance | `aiGuestTrial.ts`: transactional Firestore counter, five messages per 24-hour hashed IP/user-agent identity; requires a private hash secret. Changing user agents/networks can change identity. Google sign-in skips this guest allowance, not every other throttle. |
| Private AI bridge | HTTPS/no URL credentials/query/hash, minimum secret length, header credential, redirect rejection, 22s bounded request deadline, short normalized history, published catalog projection and deterministic commercial references. Prompt sanitization is not a complete prompt-injection defense. |
| Voice bounds | `voiceRouter.ts`, `voiceTranscription.ts`, `voiceLimits.ts`: 45s capture, 60s defensive processing ceiling, 2MiB WAV limit, metadata validation, one pending request/IP and six/process, 20s deadline, bounded provider transcription response. These are not global provider quotas across replicas. |
| Admin catalog uploads | Admin guard precedes raw body; 5MiB JPEG/PNG/WebP signature checks; PNG dimension checks; generated object names; no SVG/HTML. No general customer attachment endpoint, complete raster decode/re-encode or all-format pixel budget was found. |
| Commerce integrity | `orderValidation.ts`, `orderQuote.ts`, `orderDatabase.ts`, outbox worker: current server pricing, transactional persistence/idempotency, durable events and retry handling. Never replace these with animation-timer success. |
| Integration authority | `integrationAuthentication.ts`, `n8nCommerceRouter.ts`, `whatsappCommerce.ts`: header-only timing-safe secret comparison; original-byte Meta signature and durable deduplication contracts. Actual parent receiver and remote workflow execution still need proof. |
| Release privacy | `.gitignore`, `scripts/audit-release.mjs`, `tests/release-privacy.test.mjs`: private configuration excluded and release artifacts checked. This is not a complete Git-history/credential-issuer audit. |

## Open risk register

Priority P0 = release blocker; P1 = resolve or explicitly disposition before the affected feature/scale change; P2 = hardening follow-up. Rows describe gaps or unverified controls, not evidence of an ongoing attack.

| ID | Priority / state | Risk / evidence | Required action and proof |
| --- | --- | --- | --- |
| SEC02-01 | P0 / BLOCKED | Production service offline; deployed source/rules/identity permissions not established. Earlier local tests cannot certify live protection. | During separately authorized reactivation, identify deployed SHA and database; verify published rules, least-privilege IAM, admin/staff/customer/guest negative API tests and real saved-order recovery. |
| SEC02-02 | P1 / TODO | No verified edge WAF, bot challenge or DDoS configuration. Generated domains could bypass a future custom-domain-only proxy. | Inspect DNS and provider protections; configure an appropriate managed edge policy, sensitive-route throttles/challenges and origin access restrictions covering every public ingress. Verify legitimate checkout, Auth, voice and webhook paths still work. No unconditional challenge on trusted signed webhooks. |
| SEC02-03 | P1 / TODO before replication | One configured replica; rate-limit stores, voice pending set and catalog caches are process-local. More replicas multiply some allowances. | Set server CPU/memory limits; measure a bounded staging workload; use a shared atomic limiter/global provider budget and safe worker leases before enabling extra replicas. Verify trusted proxy/IP handling with spoofed forwarding-header tests. Never load-test live customers. |
| SEC02-04 | P1 / TODO | No universal API limiter; session login, public catalog/receipt lookups and the separately mounted wa-products export need explicit abuse review. Request timeouts alone do not bound aggregate concurrency. | Add route-specific limits where justified, bounded queues/concurrency and circuit breakers; test 429/503 recovery and response limits. Preserve customer receipt ownership checks and webhook compatibility. |
| SEC02-05 | P1 / TODO | Firebase App Check integration/enforcement not found in inspected app; Storage rules/IAM publication not established. Public reviews/content can be directly read. | Inspect current console policy; inventory public collection fields, deny private material, test profile create/update/owner boundaries. Evaluate App Check in monitoring first, then enforced rollout with CI/dev exceptions. It complements authentication and cannot eliminate all abuse. |
| SEC02-06 | P1 / TODO | Fresh npm audit reports 8 moderate package findings overall, 6 with dev dependencies omitted; zero high/critical. Two underlying advisory IDs recur through dependency chains. Historical SEC01 zero count is no longer current. | Review `GHSA-3g3m-2fjr-6pw4` and `GHSA-g3hv-75wg-m249`, actual runtime reachability and compatible patches; rerun build/full regressions after a scoped lockfile fix. Do not run blind `npm audit fix --force`. |
| SEC02-07 | P1 / TODO | Backups, restore drill, deletion/retention, monitoring, spend alerts and incident contacts are not verified. Firestore `aiGuestTrials.resetAt` is logical expiry, not a verified TTL cleanup policy. | Confirm Firestore recovery/backup options, Storage/object retention, n8n/Postgres encrypted backups, restore evidence, budget alerts and application hard spending/request caps. Keep secrets out of reports. |
| SEC02-08 | P1 / TODO | Credentials unchanged; no issuer/history audit. Name presence cannot establish validity, strength or prior exposure. | Follow SEC01 coordinated rotation criteria and receiver-before-sender checks. Inspect scopes/expiry and replace only credentials shown at risk; verify new values before revoking old ones. |
| SEC02-09 | P1 / TODO before attachments | Customer reference upload not implemented. Existing catalog uploads return public token URLs and are unsuitable for private inquiry images. | Implement ATTACH-01 limits, separate private object namespace, authenticated/scoped access, raster decoding/re-encoding, metadata stripping, retention/deletion, quotas and safe model-consent path. Oversize/unsupported files get a WhatsApp handoff. |
| SEC02-10 | P1 / TODO before AI profiles | Specialist role/data permissions and provider budgets are not implemented. More keys/models do not automatically reduce database reads. The text n8n bridge calls `response.json()` without a byte cap. | Server allowlisted role→provider/model/data policy; minimum scoped context, bounded upstream bytes/tokens, cache invalidation, shared quotas and cancellation. Do not expose orders/PII, supplier fields or keys to models. |
| SEC02-11 | P1 / TODO | wa-products export falls back to bundled `PRODUCTS` when DB read fails (`server.ts:270–298`), unlike the chat path's unpriced failure policy. | Reproduce outage with fixtures; change to explicit unavailable/stale-labelled behavior without distributing seed prices as current. Verify the receiving n8n sync does not replace valid data with fallback rates. |
| SEC02-12 | P1 / TODO for launch | Run #47 (`42476709865`) on inspected source failed Complete offline regression gate. API metadata does not identify the exact failing assertion. Codec/old-selector explanations remain hypotheses. | Obtain actual failing test output, reproduce at the recorded SHA, fix the demonstrated cause and rerun relevant/full/hosted gates. Do not assume `premium-hero-browser.test.tsx:92` is the failure without logs. |
| SEC02-13 | P2 / TODO | Dev SPA wildcard lacks file-extension guard; production wildcard already guards missing static files, and API fallback already returns JSON 404. | Add/regress dev missing image/video/JS/CSS 404 handling while preserving real route HTML and Vite scripts/nonces. Treat this as an observed dev behavior gap, not a claimed production omission. |
| SEC02-14 | P1 / TODO for maps | CSP frame sources currently allow self and the Firebase Auth domain, not Google Maps. Session endpoints need an explicit origin/CSRF abuse review; broad HTTPS script/media sources also merit tightening. | Add only the required map frame origin when MAP-01 ships; test CSP + Google sign-in + all locales. Keep nonce enforcement, review script-src-elem separately, and verify cookie/CSRF policy with actual credential flows. |
| SEC02-15 | P1 / TODO for release | Railway source config reports `checkSuites=false`; passing docs/build does not gate auto-deploy by itself. | Review branch protection/deployment approvals and verify only a reviewed, green SHA can reach launch. Record rollback SHA and data compatibility. No branch/settings change in this checkpoint. |

## Firestore rules source assessment

Static scope only; current deployment and IAM are **not scored**. No unauthenticated private-collection or cross-user profile bypass was found in the inspected rules. Create/update checks restrict both identity and allowed contact fields; caller-supplied roles do not grant authority. Existing emulator test is skipped in this audit session because no local demo emulator was started.

```json
{
  "score": 4,
  "summary": "Inspected browser rules have owner/type/size protections and private-collection denial; public read surfaces still require abuse and content review. Live rules and server IAM are unverified.",
  "findings": [
    {
      "check": "Resource exhaustion and public data scope",
      "severity": "minor",
      "issue": "Legacy reviews/content allow unrestricted public reads. Their current fields and direct-read abuse controls were not inspected in production.",
      "recommendation": "Verify these collections contain only public data and evaluate bounded queries/App Check and spend monitoring without breaking supported reads."
    }
  ]
}
```

## Recheck on every relevant change

| Change | Required safety and compatibility checks |
| --- | --- |
| UI, animation, new composer or micro-interaction | Existing routes/native links, card-vs-Quick View separation, sticky PDP, reduced motion/pause, keyboard/RTL, touch, cart correctness; no fake success, activity ticker or invented product claims. |
| New provider/model/knowledge or chat history | Role/data authorization; prompt injection cannot authorize tools; source/version and public DTO checks; context/response/token bounds; quotas, cancellation, timeout and human fallback; no cross-role private history leakage. |
| Upload/media/map/third-party embed | Size, count, type/signature/full decode/pixel limits; private storage/access/expiry; EXIF removal and safe headers; CSP and browser permissions; mobile memory/data budget; no location permission for a static map link. |
| Auth/admin/staff/rules/database | Current-account/revocation and direct endpoint denial tests; profile create/update escalation tests; published rules/IAM comparison; least privilege, no client Admin credentials, backup/restore before migrations. |
| Price/checkout/inquiry/order/webhook | Authoritative prices, legacy variants, MOQ/preparation/shipping; idempotency, uncertain responses, durable receipts, replay/signature checks; no real customer/provider messages from fixtures. |
| Replicas/proxy/cache/CDN | Shared global quotas, trusted forwarding headers, every public ingress protected, private endpoints no-store, public catalog revision invalidation, fresh checkout quotes, outbox duplicate suppression and failure recovery. |
| Dependency/build/deploy | Locked supported toolchain, advisory reachability/patch review, required build/privacy + affected/full regressions, exact hosted SHA, protected deployment and rollback evidence. |

## Release and incident checklist

- [ ] Assign an owner and evidence to each P0/P1 item; mark PASS only after verification on the named environment/SHA.
- [ ] Confirm actual Firestore project/database/region, published Rules, Storage rules and IAM; never paste private keys or customer records.
- [ ] Verify managed edge protection, origin bypass handling, route/global quotas, provider caps, uptime/error/spend alerts and tested human fallback.
- [ ] Confirm Firestore/Storage/n8n backup retention and restore drill; set a rollback source and data-compatible recovery procedure.
- [ ] Run repository impact gates; verify live Auth/roles, isolated order/inquiry/voice/webhook flows after separately authorized release.
- [ ] Review attachments, consent, privacy notice, retention and removal; do not feed personal medical records to the food-tips role.
- [ ] After a suspected breach: restrict the affected route/provider, preserve redacted evidence, revoke affected sessions/credentials in coordinated order, assess data exposure and restore/retest. Log actions without publishing exploit-ready secrets or private records.

Use [the machine-readable checkpoint](docs/evidence/security-20261110/verification.json) for actual current results. This audit did not perform penetration testing, attack simulation or production writes.

## Primary technical references

Checked 9 November 2026 UTC. These describe platform behavior, not enabled settings in this account.

- [Railway scaling and replica routing](https://docs.railway.com/deployments/scaling).
- [Firestore rules and server IAM boundary](https://firebase.google.com/docs/firestore/security/rules-query).
- [Firebase App Check scope and limitations](https://firebase.google.com/docs/app-check).
- [Cloudflare WAF overview and plan-specific controls](https://developers.cloudflare.com/waf/).
