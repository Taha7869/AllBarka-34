# Expansion release packet

Checkpoint: 24 October 2026 (Asia/Karachi). Stages 1–5 implemented and locally verified; Stage 6 IN_PROGRESS. This feature branch is a draft review candidate, not a deployed release.

## Review evidence

- Read instructions.md, design.md, CHANGELOG.md, HANDOFF.md and REQUIREMENTS.md for approved scope and continuation.
- Latest local gates after interaction refinement: 694/694 tests across 68 files, 21 backend checks, 36 production checks, asset audit, typecheck, hooks lint and production build/privacy audit. Existing bundle advisory remains. Exact scope: TESTING_RELEASE.md.
- Fixture-backed screenshots: Stage 3 item form, Stage 4 staff workspace, Stage 5 published homepage body. Browser fixtures use real routers/components and isolated database/auth/upload adapters. They do not certify live systems.
- External CodeRabbit review did not run: CLI not authenticated, browser login unsupported. No Aloop plugin was installed.

## Additive impact and findings

Run `node --import tsx scripts/admin-expansion-dry-run.ts` from the repository root. It has no live/apply option. It initializes an isolated store from compiled seeds and uses actual read/merge/default services. All 97 stored fixture records and their saved-price fingerprint remain identical; 93 valid resolved price lists match their seeds. Zero creates, updates, deletes or automatic commerce conversions are planned or performed. Configuration/content defaults do not create documents. Missing authoritative records remain unavailable.

Four compiled packaging seeds are flagged as `INVALID_CATALOG_VARIANT`: `bid-box-umrah-tabarruk`, `bid-box-pyramid-favor`, `bid-box-card-nikkah`, `bid-box-birth-announcement`. Compiled filled-option labels exceed the existing 40-character canonical variant bound. They resolve unavailable in this fixture. The script does not trim/rename labels, invent rates, rewrite historical selections or claim the live records are invalid. Compare actual stored canonical variants and merchant edits before deciding on a compatibility-preserving correction. Full output: `evidence/additive-dry-run.json`.

This is an offline impact check, not a migration preview of the owner's real records. Do not apply compiled seeds to an existing merchant database. New optional commerce remains opt-in, canonical products remain the single price authority, content is independent, and existing order snapshots/history are never migrated by these changes.

## External gates still blocked

| Gate | Required evidence before release |
| --- | --- |
| Merchant records | Read-only export of affected products/settings, exact conflict/invalid-reference review and those four seed IDs; preserve owner edits |
| Firebase/Auth | Confirm deployed Firestore edition, server Admin permissions, verified identity/role freshness, rules denying direct private collections |
| Storage | Real bounded image upload/read using the already-configured bucket; verify public display URL and honest provider failure |
| n8n | Isolated integration checks of existing canonical catalog, custom quantity, quote/order payloads and retry behavior; no live workflow edits |
| Deployment target | Preview smoke checks, private noindex/access, initial metadata, real responsive header/footer and actual image/CSP behavior |
| Release decision | Review the draft PR and separately authorize deployment/production merge; no release is implied by local checks |

## Rollback and continuation

Keep a dated export of affected documents before any future live action. There is no schema migration or destructive startup job to undo. Revert the application to the prior reviewed commit if needed; retain new documents for analysis rather than deleting customer or owner edits. For content rollback on the new app, load the prior approved content snapshot as a new draft using the current revision, review and explicitly publish it so history/audits remain. Do not reset revision numbers or blindly restore an old live document. Revoke a staff grant through the revisioned admin interface when necessary; unrelated Auth claims remain untouched.

Before rolling back an application that has already saved optional commerce, inspect affected product documents against the older resolver and restore only an approved, backed-up compatible product snapshot. Never rewrite orders/receipts or trust a compiled rate as the merchant's current price. Rehearse this with exported data in an isolated environment before launch. All live gates remain unverified at this checkpoint.

## Added interaction checkpoint

P0–P3 in INTERACTION_POLISH.md are complete under local evidence. instructions.md now carries the complete feature inventory and resume protocol for another model/chat. The real customer header/PDP/cart were verified across 48 size/language/theme layouts, with pointer/touch/keyboard, actual cart acknowledgement, image failure and held/failed checkout quote checks. Four polish JPGs and TESTING_RELEASE.md record scope. This improves local release evidence; every external gate and merchant-data finding above remains pending. It does not authorize merging or deploying the draft PR.
