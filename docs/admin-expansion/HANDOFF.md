# Admin expansion handoff

27 October 2026 — phase planning: owner accepted the revised look. Follow the six delivery phases in [../../MASTER_PLAN.md](../../MASTER_PLAN.md); V1 bounded opening is complete and V2-A product-card/collection continuity is the next SELECTED / TODO slice. No additional owner input is required for existing-asset layout work. Optional features and original Stage 6 live blockers retain their statuses. This checkpoint changes documents only.

27 October 2026: owner-requested emerald/arched hero and motion revision is locally verified. M01/M02 are DONE for this bounded pass; M04–M06/M21 have completed portions and pending broader work. Final offline suite: 707 tests, 21 backend and 36 production checks passed. Read [current revision](../PREMIUM_V1_REVISION.md). Earlier completed work and live Stage 6 blockers remain.

Latest additional workstream (25 October 2026): locally verified V1 hero/discovery (706 tests, 21 backend, 36 production checks) in [PREMIUM_V1.md](../PREMIUM_V1.md), tracked in [MASTER_PLAN.md](../../MASTER_PLAN.md). Owner confirmed retail + gifting balanced and existing assets first. Read [RULES.md](../../RULES.md); preserve completed admin work and separate Stage 6 blockers. Live catalog reconciliation remains BLOCKED in [CATALOG_AUDIT.md](../CATALOG_AUDIT.md).

Updated: 25 October 2026 (Asia/Karachi).

## Current checkpoint

Stages 1–5 DONE after the verification gates in TESTING_RELEASE.md. Stage 6 IN_PROGRESS: local compatibility corrections and read-only public diagnostics verified; release-critical integration and private merchant-data review remain BLOCKED. The complete shared Add/Edit Item workflow, taxonomy/template editor and customer integration are implemented; interaction refinement P0–P3 is also complete under its local gates. The old deployed build reports database connectivity; feature Auth/Storage/n8n and accepted-order execution remain unverified.

Verified upstream: `5e6349051980abd1a20f719f289a24a3fd2cba7b`, tree `236c3c0afef839529e071369f6ede63e55814483`. Both launch/main pointed there when checked. Feature branch `codex/admin-catalog-foundation-20261023` was created at that exact commit. No production merge, deployment, key change or live database mutation.

## Persistence boundary for this checkpoint

Stages 1–5 and P0–P3 are saved in the existing owner-authorized private repository and draft PR #16. Inspected remote parent before this Stage 6 admin-finishing checkpoint: `4772d983373cd51a2186e7e674ec800521c19802` (tree `bf5a5fe50fb2e543cdf0fc59a164cbb46931088d`). Confirm the saved successor through PR #16 before resuming. Preserve upstream ancestry and unchanged files; local snapshot history is not remote history. No production merge/deployment is authorized.

## Completed

- Read root AGENTS, component inventory and repository catalog/design/verification skills.
- Inspected catalog schema/store/router, create/edit modals, order authorization, media and SEO paths.
- Identified existing lifecycle/merchandising features and expansion gaps; see ROADMAP.md.
- Materialized 548 source/text files with matching Git blob hashes. Installed existing locked dependencies.
- Baseline typecheck, hooks lint and production build passed.
- Created linked instructions, design, six-stage roadmap, requirements, decisions, data model, admin forms, verification record and change log.

## Stage 2 implementation

- Added validated units, manual/calculated option pricing, explicit overrides and fixed/custom/both measurement configuration. Canonical prices remain authoritative; metadata saves do not reprice products.
- Added typed reusable templates, revisioned taxonomy settings/admin API, public taxonomy allowlist, localized SEO/gallery data validation and unpriced drafts/inquiry support.
- Integrated existing lifecycle, public serialization, quote fingerprints and packaging piece counts. New configuration rejects the old standalone pricing editor rather than allowing inconsistent saves.
- Added calculation, privacy, real-service persistence and loopback API tests. Existing browser tests now support an installed Linux Chromium through a test-only executable override.

## Stage 3 implementation

- Existing create/edit modal contracts share `AdminItemForm`; prices start empty. Separate language sections, units/options, reusable templates/attributes, gallery, private sourcing, personalization, SEO, readiness and explicit publication controls are present.
- Added admin-only durable photo upload through the existing Firebase bucket, with bounded raster validation and honest provider failures. Product documents store URLs. Reference removal does not delete Storage objects.
- Shop discovery reads revisioned taxonomy; public hidden-ID tombstones suppress compiled defaults. Custom categories/collections/occasions use exact matching. SEO reaches initial server HTML and localized client metadata.
- Legacy metadata saves retain canonical prices; explicit blank translations stay blank. Configured products open the full options editor. Applying a template is explicit and does not modify other items.
- Browser fixture creates a draft, reloads it, uploads a gallery photo, publishes, edits taxonomy/template definitions, preserves input on 409, discovers the item and buys a custom 750mg selection. The server uses PKR 750 despite a submitted PKR 1. All 12 mobile/desktop × EN/UR/AR × light/dark combinations passed without overflow or unexpected console/page errors.
- Final gates passed: typecheck, hooks lint, production build/privacy audit, 681 tests across 63 files, 21 backend checks, catalog asset audit and 36 production checks. Screenshots are in `evidence/`.

## Stage 4 completed — staff order reader

- Added `/staff/orders`, an orders-only workspace with search/status/date filters, bounded pagination, details, accessible shared dialogs and restrained emerald/gold responsive styling.
- Admin Team access finds an existing verified account and grants/revokes `staffAccess/{uid}` with expected revision and an atomic audit. This server-only record is authoritative; Firebase custom claims and unrelated account roles are never rewritten. Fresh Auth identity, disabled status, revoked sign-in timestamp and the grant are checked for every staff request.
- Dedicated staff DTOs omit admin notes, audits, private integration/session/claim data, supplier costs, loyalty internals and aggregate metrics. Staff has no mutation/export/catalog/settings routes. Existing admin guards remain intact.
- The existing dialog and bounded authenticated request machinery are shared, preserving the original admin prefix boundary. Direct browser database access remains denied by existing rules; no rules were published.
- Final checks passed: typecheck, hooks lint, production build/privacy audit, 688 tests across 65 files, 21 backend checks, asset audit and 36 production checks. Browser verified admin grant, order/detail reading, focus restoration, 12 responsive/language/theme combinations and revoke handling without order mutation. Screenshots: `evidence/stage4-*.png`.
- External CodeRabbit review was not performed: CLI auth reported `not_authenticated`; the login attempt returned `environment_unsupported` (browser login unavailable). No review result is invented. Local functional/security tests are independent evidence.

## Stage 5 completed — content studio and premium UI

- Added bounded draft/live content settings and Studio editor with separate draft save, private preview and explicit publication, revision conflicts and atomic audits. Existing source content remains the fallback; no automatic settings documents are created.
- Actual consumers include hero/banner, approved homepage section order/visibility, primary desktop/mobile navigation, native trilingual FAQ and journal rendering with initial HTTP metadata/sitemap. The existing single product showcase and canonical commerce authority remain intact.
- Restrained emerald/ivory/gold corner light, editorial FAQ and responsive Studio controls use existing tokens. No application dependency or generated photography was added. Studio images currently use validated URL inputs; product file upload remains in the item editor. Studio preview covers hero/banner/FAQ, not the complete page/menu/article layout.
- Verification passed: typecheck/hooks/build/privacy audit, 693/693 tests across 67 files, 21 backend checks, 36 production checks and asset audit. Browser covers draft privacy, preview following edits, publish/reload, actual mobile/desktop navigation, section ordering, journal/initial metadata, stale-edit preservation and 12 responsive/language/theme combinations. Representative JPG evidence is fixture-backed homepage body, not a live deployed header.
- A pre-existing carousel test defect was isolated: clock installation after navigation left original timers outside fake-clock control. Installation now precedes page load; existing assertions remain, and all 11 lifecycle tests pass.

## Completed owner-approved addition — interaction refinement

The owner asked for a continuation file before source work. Consolidated `instructions.md`, the complete original feature inventory and P0–P3/I01–I14 tracker were saved first at documentation commit `dbf2b6c37a57b433ac7641d31d295547f30483ea`. The following source checkpoint completes P1–P3; inspect PR #16 for its current head. Do not restart these passes.

Shared CartAddButton confirms committed cart increments; MagneticButton preserves styles/clicks/disabled behavior; the real gallery has mouse-only second-photo preview, fallback and preserved manual/touch controls. Navigation/selected-state/reveal/toast feedback, actual request busy indicators and mobile/desktop header sizing are integrated without a new application dependency. Existing quick-view close/toast behavior stays with its original component. Canonical pricing, cart services, backend/staff/content authorization and live integrations were not replaced.

Latest checks: typecheck/hooks/build/privacy audit and full offline suite passed: 694/694 tests across 68 files, 21 backend, 36 production, asset audit and diff check. New browser uses the actual RootLayout/header/footer, PDP/cart across 24 size/language/theme combinations (48 layouts), plus pointer/keyboard/touch/reduced motion, actual cart add/repeat/no-op/cap cases, image failure, menus and a held/failed checkout quote without an order. Four `evidence/polish-*.jpg` screenshots use isolated data and locally supplied Amiri; live provider/font connectivity is not certified.

Next work remains the original Stage 6 gates below. All prior features and the original four packaging-seed findings remain recorded; the later local correction is below. Read INTERACTION_POLISH.md for exact source and evidence; no deployment or production merge occurred.

## Admin finishing completed locally — owner keys retained

The owner reconfirmed existing Firebase and all other keys/configuration remain unchanged. `ADMIN_FINISHING.md` F01–F06 are complete locally: eight-section navigation in the shared item editor, independent item/category/template unsaved protection, real cancelled reload/close/Escape checks, save and refresh blocking, focused errors and preserved conflict input. Item save/publish waits for unsaved configuration changes to be saved, preventing post-create close from discarding them. Configuration save does not clear unsaved item input and revision replacement follows refresh. No new editor, local draft store, application dependency or pricing/storage/permission schema was added.

The original create/upload/publish/custom-cart browser still passes. The new mounted form covers 18 viewport/language/theme layouts plus 200% enlarged text/control sizes at 360/1440. Two inspected fixture JPGs are saved. Latest complete gates below include all previous features. Remaining actual Firestore/Auth/Storage/n8n/order/preview/rollback evidence still requires the authorized environment; changing keys alone does not close those gates.

## Stage 6 current continuation point

Latest local gates passed: 705/705 tests across 72 files, 21 backend checks, 36 production checks, asset audit, typecheck/hooks/build/privacy and diff check. Full evidence: TESTING_RELEASE.md.

Read `STAGE6_PROGRESS.md`, `RELEASE_PACKET.md` and the two evidence JSON reports. The inspected remote parent for this checkpoint is `4772d983373cd51a2186e7e674ec800521c19802`; fetch PR #16 for the saved successor. Never shell-push reconstructed local history.

The four long packaging-label findings have a narrow local reader correction. Exact existing labels/IDs and merchant rates survive load, metadata edits, canonical order pricing and WhatsApp export; arbitrary/new-commerce labels stay strict. A known active legacy item lacking explicit status no longer becomes draft on a metadata-only edit. Explicit drafts/archives/new items are not promoted. Missing affected records remain unavailable. The regenerated isolated impact compares 97/97 seed price lists, leaves all saved fixture documents unchanged and retains 93 unavailable products in an empty store with zero writes/conversions. Do not seed prices automatically.

Three credential-free public GETs reached deployed build `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`, which reports databaseConnected true but durablePersistenceReady false. All four affected public items remain unavailable on that old build. Their private saved-record condition cannot be inferred from the public API. Local runtime has no Firebase Admin/Storage credentials; existing keys/configuration were not changed.

The 25 October connected order handoff is locally verified in `N8N_COMPATIBILITY.md`: actual quote → durable transaction → outbox → transport → bundled receiver code. It found that two original Umrah selections (53/76 characters) failed the old 50-character wire limit, even after valid catalog/order pricing. Sender and inactive receiver source now admit those exact identities only. All six long legacy selections and new mg/liquid custom selections preserve canonical rates/receipts through local delivery; stale-total rejection, idempotent saved-receipt replay and uncertain-ack retry/duplicate behavior pass. The JSON remains inactive with only validator code changed; actual n8n/Sheets/Firebase execution is not certified. Verify the compatible receiver before enabling the sender path in any separately authorized release. Do not automatically requeue terminal/disabled historical events.

Next release-critical work requires an authorized integration environment: obtain a read-only export of the actual affected merchant records/settings; review saved variants/rates and invalid references; verify new feature Auth/staff/content/Storage behavior and rules; exercise existing n8n payload/retry contracts with isolated integrations; rehearse backup/rollback and smoke-test a separately authorized deployment target. Accepted-order persistence has not been tested on live services. Keep these BLOCKED until evidence exists; no production action is authorized here. Optional CodeRabbit review remains unavailable and is not counted as passed.

## Implementation cautions

- Reuse the shared form and existing catalog; do not reintroduce example rate defaults or a second price list.
- `productVariants.ts` retains the old gram resolver when configuration is absent. New custom measurement supports food/liquid mass/volume only; packaging/gifts use fixed packs and ordinary order quantity/MOQ.
- `catalogSchema.ts` and `catalogStore.ts` contain several canonical/legacy adapters. New metadata must survive all relevant create/update/load paths.
- The older media-override service remains compiled-ID-specific. Dynamic/configured products use the shared item cover/gallery and upload flow; do not silently route them into the old editor.
- Staff access is a separate server-authorized reader; never relax the existing admin guards or return an admin order object directly to staff.
- Shop taxonomy discovery is integrated. Header/home content and section controls are integrated; preserve default fallbacks, stable IDs and routes.
- Existing documentation has historical stack/status differences. Do not present old stage reports as new verification.

## Not yet verified

Private merchant-data migration review, new-feature Auth/Storage/n8n integration, Firestore edition and feature deployment. Stage 6 is not launch-certified. A read-only Firebase CLI edition check could not obtain network approval; no Firestore edition assumption or live database change was made. Later public GET connectivity evidence is recorded above; it does not establish edition or private permissions. Local service tests use an isolated adapter and do not certify deployed services. Supplier-dependent unpublished products remain outside this implementation scope.
