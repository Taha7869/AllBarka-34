# Admin expansion handoff

Updated: 24 October 2026 (Asia/Karachi).

## Current checkpoint

Stages 1–5 DONE after the verification gates in TESTING_RELEASE.md. Stage 6 IN_PROGRESS: offline release packet and additive-impact report prepared; live integration and merchant-data review remain BLOCKED. The complete shared Add/Edit Item workflow, taxonomy/template editor and customer integration are implemented; live external connectivity remains unverified.

Verified upstream: `5e6349051980abd1a20f719f289a24a3fd2cba7b`, tree `236c3c0afef839529e071369f6ede63e55814483`. Both launch/main pointed there when checked. Feature branch `codex/admin-catalog-foundation-20261023` was created at that exact commit. No production merge, deployment, key change or live database mutation.

## Persistence boundary for this checkpoint

Stages 3 and 4 are saved in the existing owner-authorized private repository and draft PR #16. Last remote parent before this Stage 5 checkpoint: `ce130f9f225928295d8b292ec0bb6aa82d96de6e` (tree `eda39b945749a70f81db6d36320b8194223d00cb`). Confirm the current head through PR #16 when resuming; it includes the next Stage 5 checkpoint after this parent. Preserve upstream ancestry; local snapshot history is not the remote history. No production merge or deployment is authorized by this checkpoint.

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

## Stage 6 next executable steps

Read `RELEASE_PACKET.md` and `evidence/additive-dry-run.json`. Offline report preserved all 97 saved fixture records, compared 93 valid seed price lists, made zero writes and flagged four compiled packaging seeds as `INVALID_CATALOG_VARIANT`; do not claim all compiled products are purchasable. Their long option labels require merchant-data comparison before any correction. Missing authoritative records remain unavailable; do not seed prices automatically.

Remaining external gates: read-only review/export of actual affected merchant records and those four IDs, deployed Firebase/Storage/Auth availability and rules review, exact n8n payload compatibility in an isolated integration environment, deployment-target smoke checks and explicit release authorization. Existing credentials/configuration are not to be changed by a continuation. Optional CodeRabbit review remains unavailable in this runtime; it is not counted as passed.

## Implementation cautions

- Reuse the shared form and existing catalog; do not reintroduce example rate defaults or a second price list.
- `productVariants.ts` retains the old gram resolver when configuration is absent. New custom measurement supports food/liquid mass/volume only; packaging/gifts use fixed packs and ordinary order quantity/MOQ.
- `catalogSchema.ts` and `catalogStore.ts` contain several canonical/legacy adapters. New metadata must survive all relevant create/update/load paths.
- The older media-override service remains compiled-ID-specific. Dynamic/configured products use the shared item cover/gallery and upload flow; do not silently route them into the old editor.
- Staff access is a separate server-authorized reader; never relax the existing admin guards or return an admin order object directly to staff.
- Shop taxonomy discovery is integrated. Header/home content and section controls are integrated; preserve default fallbacks, stable IDs and routes.
- Existing documentation has historical stack/status differences. Do not present old stage reports as new verification.

## Not yet verified

Live merchant-data migration review, Storage/Firebase/n8n connectivity, Firestore edition and deployment. Stage 6 is not launch-certified. A read-only Firebase CLI edition check could not obtain network approval; no live database assumptions or changes were made. Local service tests use an isolated adapter and do not certify deployed services. Supplier-dependent unpublished products remain outside this implementation scope.
