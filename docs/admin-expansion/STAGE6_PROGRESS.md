# Stage 6 integration and compatibility checkpoint

Date: 24 October 2026 (Asia/Karachi). The inspected feature parent is `547081f13cc16df534d66ef1eaf38c3f9dfac90e`; fetch draft PR #16 for the saved successor. Stages 1–5 and interaction P0–P3 remain implemented. **Stage 6 is IN_PROGRESS overall** because release-critical external gates remain BLOCKED. This checkpoint does not authorize deployment, production merge, keys, live writes or account changes.

| Work | Status | Evidence / next action |
| --- | --- | --- |
| Public deployed health/readiness/catalog | DONE for the old deployed build | Three credential-free GETs returned 200. Report: `evidence/stage6-live-readonly.json`. databaseConnected true, durablePersistenceReady false; four affected public items unavailable. Deployed commit 8cf4410 differs from the feature parent. No checkout/webhook called. |
| Exact legacy packaging label reader | DONE locally | Original per-product long labels/IDs accepted without migration. Arbitrary/new commerce labels retain the 40-character bound. Missing affected records stay unavailable. |
| Legacy metadata lifecycle compatibility | DONE locally | Metadata-only edits preserve implicit published status for known active legacy seeds. Explicit drafts/archives, inactive/out-of-stock markers, configured products and unknown IDs are not promoted. |
| Additive impact and merchant-price/order/export checks | DONE locally | All 97 saved fixture records and resolved price lists unchanged; original 93 empty-store products unavailable; zero writes/conversions. Six focused tests use actual catalog/admin/order/export services and loopback diagnostic requests. |
| Full offline gates | DONE | 700/700 tests across 70 files; 21 backend; 36 production; catalog assets; typecheck/hooks/build/privacy and diff check pass. Existing bundle advisory remains. |
| Private merchant records and settings | BLOCKED externally | Public unavailability cannot distinguish missing/archived/invalid records. Obtain an authorized read-only export; compare exact canonical labels, merchant rates and references before a release. Never seed/reset rates. |
| New feature Auth / staff / content / Storage and rules | BLOCKED externally | Local runtime lacks Firebase Admin/Storage credentials; the old deployment cannot certify new feature endpoints. Verify in the authorized integration environment without changing keys or grants here. |
| n8n and accepted-order persistence | BLOCKED externally | Configuration flags do not prove execution. Exercise existing payload/retry contracts and durable acceptance in an isolated integration environment; no live workflow edit or customer order here. |
| Deployment smoke / rollback / release decision | BLOCKED externally | Preview target, real media/CSP/SEO, backups and compatible rollback rehearsal require separate authorized environment/release steps. Draft PR only. |

## What failed and was corrected

The original dry run flagged four packaging seeds because existing filled-option labels exceed the generic 40-character canonical variant bound. The correction only admits exact original labels on their original product IDs; it copies no rates. Tests exposed two associated risks: a missing record could gain a newly valid compiled fallback, and a legacy metadata edit could default an already-public item to draft. The missing-record guard and restricted lifecycle adapter correct both. The final focused and full runs pass; the initial failing run is not counted as successful evidence.

## Resume protocol

1. Confirm the existing feature branch/draft PR head and read `instructions.md`, `HANDOFF.md`, `RELEASE_PACKET.md` and `TESTING_RELEASE.md`.
2. Do not repeat completed UI, staff/content, interaction or local compatibility work. Continue the BLOCKED rows only when the required authorized environment/export exists.
3. Preserve existing rates, labels/IDs, receipts, MOQ, ten-day preparation, shipping/coupons/loyalty and stock convention. No application key/environment edit, production write/deploy/merge, role grant, rules publication or live n8n call is authorized by this checkpoint.
4. Update this tracker, handoff, tests and changelog for each further checkpoint. Save scoped changes against the actual remote parent/tree; reconstructed local history must not replace upstream history.

A readiness flag is a point-in-time server report, not feature certification. The public diagnostic stores only allowlisted flags/counts; no private records, full catalog or customer/credential values are committed. Optional external CodeRabbit review remains unavailable; no Aloop review is claimed.
