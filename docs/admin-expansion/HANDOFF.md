# Admin expansion handoff

Updated: 24 October 2026 (Asia/Karachi).

## Current checkpoint

Stage 1 DONE. Stages 2–6 TODO. No new runtime feature is implemented at this checkpoint.

Verified upstream: `5e6349051980abd1a20f719f289a24a3fd2cba7b`, tree `236c3c0afef839529e071369f6ede63e55814483`. Both launch/main pointed there when checked. Feature branch `codex/admin-catalog-foundation-20261023` was created at that exact commit. No production merge, deployment, key change or live database mutation.

## Completed

- Read root AGENTS, component inventory and repository catalog/design/verification skills.
- Inspected catalog schema/store/router, create/edit modals, order authorization, media and SEO paths.
- Identified existing lifecycle/merchandising features and expansion gaps; see ROADMAP.md.
- Materialized 548 source/text files with matching Git blob hashes. Installed existing locked dependencies.
- Baseline typecheck, hooks lint and production build passed.
- Created linked instructions, design, six-stage roadmap, requirements, decisions, data model, admin forms, verification record and change log.

## Next: Stage 2

1. Add optional versioned measurement/pricing configuration and bounded reusable template/taxonomy metadata.
2. Integrate through the existing validator/store and public field allowlist, preserving old products.
3. Add meaningful calculation, persistence/privacy and legacy compatibility tests.
4. Record exact changed paths/evidence and advance statuses only after verification.

## Implementation cautions

- Existing `AdminProductCreateModal` contains example prices and literal English labels. Replace those within Stage 3 rather than building a second catalog.
- `productVariants.ts` currently supports gram-only custom portions and the approved legacy rounding. Keep the original path when new config is absent.
- `catalogSchema.ts` and `catalogStore.ts` contain several canonical/legacy adapters. New metadata must survive all relevant create/update/load paths.
- `productMediaRouter.ts` currently uses compiled product IDs. Dynamic media and direct upload require real integration work.
- `AdminOrdersPage.tsx` and server order endpoints currently use admin claims. Staff needs a restricted reader, not a relaxed admin guard.
- Current category/navigation/content defaults live in source. Admin-created extensions must be visible through actual customer discovery.
- Existing documentation has historical stack/status differences. Do not present old stage reports as new verification.

## Not yet verified

New feature tests, full offline suite, expansion browser checks, live storage/Firebase/n8n connectivity and deployment. Supplier-dependent unpublished products remain outside this implementation scope.
