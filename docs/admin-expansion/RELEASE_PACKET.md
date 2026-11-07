# Expansion release packet

## 27 October 2026 continuation

Use [RESUME_VERIFICATION.md](../RESUME_VERIFICATION.md) for the recovered `81eedbfe` source, fresh verification and sanitized Railway/public-catalog evidence. Only the old production build is deployed. Railway connectivity is now confirmed; private merchant/provider acceptance and preview/rollback remain unresolved. The following 25 October packet is retained as historical implementation and release-boundary evidence.

Checkpoint: 25 October 2026 (Asia/Karachi). Stages 1–5 implemented and locally verified; Stage 6 IN_PROGRESS. This feature branch is a draft review candidate, not a deployed release.

## Review evidence

Latest Stage 6 admin-finishing gates: **705/705 tests across 72 files**, 21 backend, 36 production, catalog assets, typecheck/hooks/build/privacy and diff check pass. New finishing browser and original item journey pass (2/2 focused); the previous four connected cases and 58-case targeted run remain recorded. Previous six compatibility/diagnostic cases remain in the full suite. Stage 6 remains IN_PROGRESS under STAGE6_PROGRESS.md.

- Read instructions.md, design.md, CHANGELOG.md, HANDOFF.md and REQUIREMENTS.md for approved scope and continuation.
- Interaction checkpoint gates: 694/694 tests across 68 files, 21 backend checks, 36 production checks, asset audit, typecheck, hooks lint and production build/privacy audit. Existing bundle advisory remains. Exact scope: TESTING_RELEASE.md.
- Fixture-backed screenshots: Stage 3 item form, Stage 4 staff workspace, Stage 5 published homepage body. Browser fixtures use real routers/components and isolated database/auth/upload adapters. They do not certify live systems.
- External CodeRabbit review did not run: CLI not authenticated, browser login unsupported. No Aloop plugin was installed.

## Additive impact and findings

Run `node --import tsx scripts/admin-expansion-dry-run.ts` from the repository root. It has no live/apply option. It initializes an isolated store from compiled seeds and uses actual read/merge/default services. After the narrow Stage 6 correction, all **97** stored fixture records and their saved-price fingerprint remain identical; all **97** resolved price lists match. Zero creates, updates, deletes or automatic commerce conversions are performed. Configuration/content defaults do not create documents. In an empty store, the same **93** missing authoritative products remain unavailable, including the four affected packaging products; no compiled price fallback was newly enabled.

The earlier four `INVALID_CATALOG_VARIANT` findings were reproduced for exact compiled labels above 40 characters: `bid-box-umrah-tabarruk`, `bid-box-pyramid-favor`, `bid-box-card-nikkah`, `bid-box-birth-announcement`. Their **saved-record reader** now accepts only the exact original labels for the original product IDs. Arbitrary/new commerce labels retain the 40-character bound. No label is renamed, no ID is migrated and no rate is copied from a seed into merchant records. Real service fixtures verify merchant prices distinct from seed prices through admin edits, canonical order pricing and WhatsApp export. A metadata-only edit also now preserves the implicit published state of a known active legacy item; explicit drafts/archives and new products are not published by inference. Full output: `evidence/additive-dry-run.json`.

The public GET preflight (`scripts/stage6-readonly-preflight.mjs`) inspected health/readiness/catalog only: three HTTP 200 responses, 97 public products, databaseConnected true, durablePersistenceReady false, and all four affected items unavailable. Deployed commit `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0` differs from the inspected feature parent `547081f13cc16df534d66ef1eaf38c3f9dfac90e`. This is a dated observation of the old deployment, **not evidence that the new fix is deployed or that private merchant records are valid**. The sanitized report contains no full catalog, rates, customer data or credentials: `evidence/stage6-live-readonly.json`.

This is an offline impact check, not a migration preview of the owner's real records. Do not apply compiled seeds to an existing merchant database. New optional commerce remains opt-in, canonical products remain the single price authority, content is independent, and existing order snapshots/history are never migrated by these changes.

## Connected order/receiver source compatibility

`N8N_COMPATIBILITY.md` records a reproduced wire-bound gap after the earlier catalog-only correction: two exact Umrah labels exceed 50 characters. The canonical sender and inactive receiver validator now preserve those original identities with a product-specific exception; other wire labels remain limited to 50, new-commerce labels to 40. No pricing/total/ID migration is introduced. Connected local tests join actual catalog/quote/transaction/outbox/transport with the bundled receiver code and memory mirror rows, including new mg/liquid custom selections, six original long selections, stale quote rejection, saved receipt replay and invalid-ack retry/duplicate handling. This is not real Firebase/n8n/Sheets acceptance.

A future authorized release must verify the compatible receiver before enabling the sender path; the old receiver still rejects those two selections. Back up and compare the actual workflow and retain existing node/resource/credential identity. No workflow activation, secret change or historical outbox replay is authorized by the source correction.

## Admin finishing and existing configuration

The owner reconfirmed existing Firebase/all other keys remain unchanged while completing UI/features. ADMIN_FINISHING.md F01–F06 are locally complete: mobile/desktop section shortcuts in the shared editor; independent item and category/template unsaved protection; held save/refresh protection; focused errors and preserved stale-edit input. The original upload/publish/custom-cart journey remains covered. Browser evidence includes 18 layout/language/theme combinations, real cancelled reload and 200% enlarged text/control-size checks; two inspected fixture JPGs are saved. No new schema, permission, dependency or live configuration change occurred. This is implemented/reviewable source, not a deployed private workspace or real provider verification.

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

Before rolling back an application that has already saved optional commerce, inspect affected product documents against the older resolver and restore only an approved, backed-up compatible product snapshot. Never rewrite orders/receipts or trust a compiled rate as the merchant's current price. Rehearse this with exported data in an isolated environment before launch. Release-critical live gates remain unverified; the limited public GET observation above does not close them.

## Added interaction checkpoint

P0–P3 in INTERACTION_POLISH.md are complete under local evidence. instructions.md now carries the complete feature inventory and resume protocol for another model/chat. The real customer header/PDP/cart were verified across 48 size/language/theme layouts, with pointer/touch/keyboard, actual cart acknowledgement, image failure and held/failed checkout quote checks. Four polish JPGs and TESTING_RELEASE.md record scope. This improves local release evidence; every release-critical external gate and private merchant-data review above remains pending. It does not authorize merging or deploying the draft PR.
