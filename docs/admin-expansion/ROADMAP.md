# Admin expansion roadmap

Date: 24 October 2026 (Asia/Karachi). This six-stage plan is separate from the earlier eight-stage renovation.

| Stage | Deliverable and completion gate | Status |
| --- | --- | --- |
| 1 — Audit and documentation | Pin upstream, inspect existing implementation, record decisions/gaps, create linked working documents, establish baseline build/type/lint evidence. | DONE |
| 2 — Catalog data and pricing | Validated units, manual/calculated canonical pricing, fixed/custom/both food/liquid measurement, fixed count packs, reusable template/taxonomy APIs and SEO metadata. Calculation, persistence, privacy and compatibility gates passed; UI remains Stage 3. | DONE |
| 3 — Admin item workflow | Extend existing add/edit controls with templates, all three language sections, descriptions, units/options, images, SEO, review and mandatory/optional labels. Manage categories/templates. Gate: a new product survives reload and flows through public catalog, cart and authoritative checkout. | TODO |
| 4 — Staff order reader | Admin-managed staff access; server-authorized order list/detail reader. Gate: staff can view allowed order data and cannot publish, edit prices, update payment/status, export or access admin data. | TODO |
| 5 — Content and premium UI | Editable approved banners/section settings/navigation/FAQ/journal content; preserve existing merchandising. Gold/ivory/emerald polish, mobile-first forms/storefront, dark/RTL parity. Gate: real browser checks and persisted settings across refresh. | TODO |
| 6 — Integration and release packet | Full checks, migration dry-run, compatibility review, screenshots and final handoff/PR. Gate: all requirements evidenced or explicitly BLOCKED; no local fixture presented as live verification. | TODO |

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
- Live Railway/Firebase/n8n state has not been certified by this audit.
