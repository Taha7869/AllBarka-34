# Admin expansion roadmap

Date: 24 October 2026 (Asia/Karachi). This six-stage plan is separate from the earlier eight-stage renovation.

| Stage | Deliverable and completion gate | Status |
| --- | --- | --- |
| 1 — Audit and documentation | Pin upstream, inspect existing implementation, record decisions/gaps, create linked working documents, establish baseline build/type/lint evidence. | DONE |
| 2 — Catalog data and pricing | Validated units, manual/calculated canonical pricing, fixed/custom/both food/liquid measurement, fixed count packs, reusable template/taxonomy APIs and SEO metadata. Calculation, persistence, privacy and compatibility gates passed; UI remains Stage 3. | DONE |
| 3 — Admin item workflow | Shared trilingual add/edit form, units/options, templates/taxonomy, photos/upload, SEO and publish readiness. Fixture-backed browser verified create/reload/publish/discovery/custom cart and authoritative order pricing; responsive language/theme matrix passed. | DONE |
| 4 — Staff order reader | Admin-managed, audited server-only grants; fresh identity checks, dedicated list/detail DTO and orders-only responsive workspace. Role bypass/write/export/admin denial, revocation and browser gates passed. | DONE |
| 5 — Content and premium UI | Editable approved banners/section settings/navigation/FAQ/journal content; preserve existing merchandising. Gold/ivory/emerald polish, mobile-first forms/storefront, dark/RTL parity. Gate: real browser checks and persisted settings across refresh passed with isolated fixtures. | DONE |
| 6 — Integration and release packet | Full checks, migration dry-run, compatibility review, screenshots and final handoff/PR. Gate: all requirements evidenced or explicitly BLOCKED; no local fixture presented as live verification. | IN_PROGRESS — local compatibility and public GET diagnostics recorded; release-critical external gates BLOCKED |

Stage transitions update `HANDOFF.md`, `REQUIREMENTS.md` and `CHANGELOG.md`. Owner authorization covers implementation across these stages; routine reversible work does not need repeated confirmation. Production release is a separate operation.

## Source audit

| Area | Verified baseline | Work required |
| --- | --- | --- |
| Product lifecycle | `catalogStore.ts` and `catalogRouter.ts` already create/edit/duplicate/publish/archive dynamic products with revisions and audits. | Extend; do not build a competing product service. |
| Item forms | Existing create/edit modals; create uses literal English and prefilled example prices. Edit has more content fields. | Shared complete workflow, localized labels, empty rate defaults, publish-specific validation. |
| Units and quantity | Existing canonical labels support g/kg/ml and packaging labels. Custom portions are gram-only with existing boundaries/rounding. | Explicit mg/g/kg/ml/L/count units and opt-in flexible quantity. Keep legacy behavior. |
| SEO | Product keywords and generated route metadata exist. | Editable localized titles/descriptions, image alt text and social metadata. Preserve canonical product IDs and links. |
| Categories/content | Category/navigation registries are compiled; merchandising settings are already persisted. | Add admin-managed extensions and bounded content settings while keeping existing defaults/routes. |
| Media | Existing product media editor saves durable URLs; no direct file upload. | Add authenticated durable image upload using existing Firebase configuration, plus gallery support for dynamic products. |
| Access | Server and workspace currently require admin claims. | Explicit staff order-read permission and reduced response shape. |
| Design | Existing emerald/ivory/gold tokens and luminous CSS. | Refine these; do not replace the brand palette. |

## Baseline verification

Upstream commit: `5e6349051980abd1a20f719f289a24a3fd2cba7b`; source tree: `236c3c0afef839529e071369f6ede63e55814483`.

- 548 source/text files materialized and verified against upstream Git blob hashes.
- Existing dependencies installed with `npm ci --ignore-scripts --no-audit --no-fund`; no dependency added or version changed.
- Baseline `npm run typecheck`, `npm run lint:hooks` and `npm run build`: exit 0.
- Stage 2 final checks: typecheck/hooks/build passed; full offline suite passed (674 tests, 21 backend checks, asset verification and 36 production checks). Existing browser regressions passed; new expansion UI checks remain Stage 3. See TESTING_RELEASE.md.
- Stage 3 final checks: 681/681 tests across 63 files, 21 backend checks, asset audit and 36 production checks passed. Live Railway/Firebase/n8n state remains uncertified.

- Stage 5 final checks: 693/693 tests across 67 files, 21 backend, 36 production, assets and 12 responsive/language/theme combinations passed. Stage 6 offline impact report and external gates: RELEASE_PACKET.md.

## Additional owner-approved interaction refinement

This is a tracked refinement after Stage 5, not a replacement or renumbering of the six expansion stages. P0 continuation documentation DONE; P1 shared action/cart/request feedback DONE; P2 photos/navigation/reveals DONE; P3 complete offline regression/evidence/GitHub checkpoint DONE. Full acceptance matrix and exact resume point: INTERACTION_POLISH.md. Stage 6 external blockers remain unchanged.

## Stage 6 compatibility continuation

`STAGE6_PROGRESS.md` is the current executable tracker. The four exact historical packaging label readers and the legacy metadata publication-state regression have local corrections with no rate/ID migration. The isolated impact report now compares 97/97 saved seed price lists unchanged and retains the original 93 unavailable products in an empty store with zero writes. Public GETs reached the old deployed database-connected build; this does not verify the feature deployment, private records, Storage/Auth roles, accepted orders or n8n. Continue the blocked gates in the tracker without restarting Stages 1–5 or P0–P3.
