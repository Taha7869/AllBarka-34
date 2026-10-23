# Admin expansion handoff

Updated: 24 October 2026 (Asia/Karachi).

## Current checkpoint

Stages 1–2 complete after the verification gates recorded in TESTING_RELEASE.md. Stages 3–6 TODO. Stage 2 implements backend/data contracts; the complete Add/Edit Item UI is not yet implemented.

Verified upstream: `5e6349051980abd1a20f719f289a24a3fd2cba7b`, tree `236c3c0afef839529e071369f6ede63e55814483`. Both launch/main pointed there when checked. Feature branch `codex/admin-catalog-foundation-20261023` was created at that exact commit. No production merge, deployment, key change or live database mutation.

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

## Next: Stage 3

1. Extend the existing Add/Edit Item workflow, using API_CONTRACTS.md and DATA_MODEL.md. Share validated options/template/language/SEO fields; remove example price defaults and show mandatory/optional labels.
2. Configured products must use the full options editor. Route/hide the old standalone pricing editor for them; preserve it for legacy products.
3. Integrate taxonomy settings with actual customer discovery, including safe empty states and existing aliases. Apply template defaults explicitly; do not rewrite existing products when a template changes.
4. Add durable authenticated dynamic-product image upload/gallery integration. Existing media helpers prioritize compiled product paths and need inspection before reuse.
5. Add unit-aware custom customer inputs and localized SEO rendering, then verify create/reload/publish/catalog/cart/checkout in real fixture-backed browsers on mobile and desktop.

## Implementation cautions

- Existing `AdminProductCreateModal` contains example prices and literal English labels. Replace those within Stage 3 rather than building a second catalog.
- `productVariants.ts` retains the old gram resolver when configuration is absent. New custom measurement supports food/liquid mass/volume only; packaging/gifts use fixed packs and ordinary order quantity/MOQ.
- `catalogSchema.ts` and `catalogStore.ts` contain several canonical/legacy adapters. New metadata must survive all relevant create/update/load paths.
- `productMediaRouter.ts` currently uses compiled product IDs. Dynamic media and direct upload require real integration work.
- `AdminOrdersPage.tsx` and server order endpoints currently use admin claims. Staff needs a restricted reader, not a relaxed admin guard.
- Current category/navigation/content defaults live in source. Admin-created extensions must be visible through actual customer discovery.
- Existing documentation has historical stack/status differences. Do not present old stage reports as new verification.

## Not yet verified

Stage 3 new UI/browser journeys, live storage/Firebase/n8n connectivity, Firestore edition and deployment. A read-only Firebase CLI edition check could not obtain network approval; no live database assumptions or changes were made. Local service tests use an isolated adapter and do not certify deployed services. Supplier-dependent unpublished products remain outside this implementation scope.
