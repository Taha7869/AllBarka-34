# Stage 6 integration and compatibility checkpoint

## 27 October 2026 — V6-R01 current continuation

[Recovery verification](../RESUME_VERIFICATION.md) supersedes the old access assumption: authenticated Railway metadata is available. Production remains on `8cf4410`, while recovered feature source is `81eedbfe`. Fresh health/commerce-readiness/catalog GETs returned 200; databaseConnected is true, durable acceptance is unverified. Public scope is 97 products (92 active / 5 inactive), with current version and all IDs captured in the sanitized public report. The published taxonomy endpoint returns 404 on that older deployment.

Private merchant snapshots, feature Auth/Storage, accepted orders, n8n receiver compatibility and isolated preview/rollback gates remain BLOCKED. No keys, records, roles, workflows, production branches or deployment changed. Local recovery gates pass (713 tests, 21 backend and 36 production checks); Source checkpoint `4ee28a08a71d2df7f0a6e3636b693f6ad76630bd` is saved and read-back verified. The 25 October table below is historical evidence, not the newest local test count or Railway-access status.

Date: 25 October 2026 (Asia/Karachi). The inspected feature parent is `4772d983373cd51a2186e7e674ec800521c19802`; fetch draft PR #16 for the saved successor. Stages 1–5 and interaction P0–P3 remain implemented. **Stage 6 is IN_PROGRESS overall** because release-critical external gates remain BLOCKED. This checkpoint does not authorize deployment, production merge, keys, live writes or account changes.

| Work | Status | Evidence / next action |
| --- | --- | --- |
| Public deployed health/readiness/catalog | DONE for the old deployed build | Three credential-free GETs returned 200. Report: `evidence/stage6-live-readonly.json`. databaseConnected true, durablePersistenceReady false; four affected public items unavailable. Deployed commit 8cf4410 differs from the feature parent. No checkout/webhook called. |
| Exact legacy packaging label reader | DONE locally | Original per-product long labels/IDs accepted without migration. Arbitrary/new commerce labels retain the 40-character bound. Missing affected records stay unavailable. |
| Legacy metadata lifecycle compatibility | DONE locally | Metadata-only edits preserve implicit published status for known active legacy seeds. Explicit drafts/archives, inactive/out-of-stock markers, configured products and unknown IDs are not promoted. |
| Additive impact and merchant-price/order/export checks | DONE locally | All 97 saved fixture records and resolved price lists unchanged; original 93 empty-store products unavailable; zero writes/conversions. Six focused tests use actual catalog/admin/order/export services and loopback diagnostic requests. |
| Admin finishing | DONE locally | ADMIN_FINISHING.md F01–F06; existing item editor section shortcuts, independent unsaved scopes, pending-save/refresh guard, error focus, real cancelled browser reload and 18 layouts plus enlarged text. Existing keys retained. |
| Full offline gates | DONE | 705/705 tests across 72 files; 21 backend; 36 production; catalog assets; typecheck/hooks/build/privacy and diff check pass. Existing bundle advisory remains. |
| Private merchant records and settings | BLOCKED externally | Public unavailability cannot distinguish missing/archived/invalid records. Obtain an authorized read-only export; compare exact canonical labels, merchant rates and references before a release. Never seed/reset rates. |
| New feature Auth / staff / content / Storage and rules | BLOCKED externally | Local runtime lacks Firebase Admin/Storage credentials; the old deployment cannot certify new feature endpoints. Verify in the authorized integration environment without changing keys or grants here. |
| Connected order handoff | DONE locally | `N8N_COMPATIBILITY.md`: new custom units and six legacy labels through actual quote/transaction/outbox/transport/receiver code; stale-total rejection, receipt replay and acknowledgement retry/duplicate handling. Memory persistence and loopback only. |
| n8n and accepted-order persistence | BLOCKED externally | Configuration flags do not prove execution. Local connected rehearsal completed; real provider execution and durable acceptance still require the authorized integration environment. Verify the compatible receiver before enabling long-label sender orders; no live workflow edit or customer order here. |
| Deployment smoke / rollback / release decision | BLOCKED externally | Preview target, real media/CSP/SEO, backups and compatible rollback rehearsal require separate authorized environment/release steps. Draft PR only. |

## What failed and was corrected

The original dry run flagged four packaging seeds because existing filled-option labels exceed the generic 40-character canonical variant bound. The correction only admits exact original labels on their original product IDs; it copies no rates. Tests exposed two associated risks: a missing record could gain a newly valid compiled fallback, and a legacy metadata edit could default an already-public item to draft. The missing-record guard and restricted lifecycle adapter correct both. The final focused and full runs pass; the initial failing run is not counted as successful evidence. The 25 October connected continuation additionally reproduced a 50-character n8n wire-bound failure for the two long Umrah labels; exact-identity sender and inactive receiver corrections now pass through the local outbox/receiver chain. See N8N_COMPATIBILITY.md for release dependencies.

## Resume protocol

1. Confirm the existing feature branch/draft PR head and read `instructions.md`, `HANDOFF.md`, `RELEASE_PACKET.md` and `TESTING_RELEASE.md`.
2. Do not repeat completed UI, staff/content, interaction, admin finishing or local compatibility work. The owner reconfirmed existing keys/configuration remain unchanged; key replacement is deferred and is not a substitute for provider verification. Continue the BLOCKED rows only when the required authorized environment/export exists.
3. Preserve existing rates, labels/IDs, receipts, MOQ, ten-day preparation, shipping/coupons/loyalty and stock convention. No application key/environment edit, production write/deploy/merge, role grant, rules publication or live n8n call is authorized by this checkpoint.
4. Update this tracker, handoff, tests and changelog for each further checkpoint. Save scoped changes against the actual remote parent/tree; reconstructed local history must not replace upstream history.

A readiness flag is a point-in-time server report, not feature certification. The public diagnostic stores only allowlisted flags/counts; no private records, full catalog or customer/credential values are committed. Optional external CodeRabbit review remains unavailable; no Aloop review is claimed.
