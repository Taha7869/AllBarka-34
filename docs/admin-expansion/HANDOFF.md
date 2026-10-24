# Admin expansion handoff

Updated: 24 October 2026 (Asia/Karachi).

## Current checkpoint

Stages 1–4 DONE after the verification gates in TESTING_RELEASE.md. Stages 5–6 TODO. The complete shared Add/Edit Item workflow, taxonomy/template editor and customer integration are implemented; live external connectivity remains unverified.

Verified upstream: `5e6349051980abd1a20f719f289a24a3fd2cba7b`, tree `236c3c0afef839529e071369f6ede63e55814483`. Both launch/main pointed there when checked. Feature branch `codex/admin-catalog-foundation-20261023` was created at that exact commit. No production merge, deployment, key change or live database mutation.

## Persistence boundary for this checkpoint

The earlier Stage 3 GitHub save was blocked by automatic approval review for destination authorization. The owner has now requested that completed changes, remaining work and future-model references be maintained in this GitHub repository, continuing the existing feature branch/PR #16. This checkpoint carries the verified Stage 3 source and evidence to `Taha7869/AllBarka-34`, branch `codex/admin-catalog-foundation-20261023`. Confirm its current head through PR #16 when resuming. No production merge or deployment is authorized by this checkpoint.

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

## Next: Stage 5 — content and premium UI

1. Add bounded draft/live content settings, admin editing/preview/publish, revisions/audits and safe link/media validation.
2. Integrate actual hero/banner, homepage section order/visibility, existing desktop/mobile navigation, FAQ and journal rendering. Preserve the single product showcase and existing commerce authority.
3. Refine existing emerald/ivory/gold surfaces with restrained corner light/gold dust, mobile hierarchy and dark/RTL/reduced-motion parity.
4. Verify draft isolation, actual publication/rendering, invalid links, optimistic conflicts and responsive browser evidence before marking DONE.

## Implementation cautions

- Reuse the shared form and existing catalog; do not reintroduce example rate defaults or a second price list.
- `productVariants.ts` retains the old gram resolver when configuration is absent. New custom measurement supports food/liquid mass/volume only; packaging/gifts use fixed packs and ordinary order quantity/MOQ.
- `catalogSchema.ts` and `catalogStore.ts` contain several canonical/legacy adapters. New metadata must survive all relevant create/update/load paths.
- The older media-override service remains compiled-ID-specific. Dynamic/configured products use the shared item cover/gallery and upload flow; do not silently route them into the old editor.
- Staff access is a separate server-authorized reader; never relax the existing admin guards or return an admin order object directly to staff.
- Shop taxonomy discovery is integrated. Header/home content and section controls remain Stage 5; preserve current defaults and routes.
- Existing documentation has historical stack/status differences. Do not present old stage reports as new verification.

## Not yet verified

Stage 5 content/full storefront polish, Stage 6 release/migration review, live Storage/Firebase/n8n connectivity, Firestore edition and deployment. A read-only Firebase CLI edition check could not obtain network approval; no live database assumptions or changes were made. Local service tests use an isolated adapter and do not certify deployed services. Supplier-dependent unpublished products remain outside this implementation scope.
