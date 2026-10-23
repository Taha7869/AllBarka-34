# Requirement matrix

Statuses refer to the expansion, not whether an older partial implementation exists.

| ID | Requirement | Stage | Status | Evidence/path |
| --- | --- | --- | --- | --- |
| A01 | Verified baseline, stage plan, decisions and handoff | 1 | DONE | ROADMAP.md; instructions.md; design.md |
| A02 | mg/g/kg/ml/L/piece/pack selection with safe dimension conversion | 2 | DONE | productCommerce.ts; conversion and invalid dimension tests; UI selection remains Stage 3 |
| A03 | Manual and calculated option prices, explicit overrides | 2 | DONE | Explicit-save canonical pricing; exact half-up calculation and preservation tests |
| A04 | Fixed/custom/both quantity with min/max/step | 2–3 | IN_PROGRESS | Backend supports food/liquid custom mass/volume; fixed count packs; Stage 3 input controls pending |
| A05 | Reusable templates and bounded attribute definitions | 2–3 | IN_PROGRESS | Validated admin configuration API and typed attributes complete; template application UI pending |
| A06 | Admin-created category/collection/occasion extensions | 2–3 | IN_PROGRESS | Revisioned taxonomy settings and public allowlist complete; discovery/editor UI pending |
| A07 | Complete add/edit form and visible Required/Optional labels | 3 | TODO | Extend AdminProductCreateModal/AdminProductEditModal |
| A08 | Separate EN/UR/AR descriptions and translation status | 3 | TODO | Reuse LanguageContext/admin translations |
| A09 | Durable image upload, cover, gallery and alt text | 3 | TODO | Existing product media service; current upload gap |
| A10 | Localized SEO fields and social preview | 2–3 | IN_PROGRESS | Metadata validation/persistence complete; form, preview and customer metadata rendering pending |
| A11 | Draft, preview, duplicate, publish, archive and revision conflict handling | 3 | IN_PROGRESS | Backend unpriced drafts/publish validation/reload/conflict verified; full UI remains Stage 3 |
| A12 | Admin-controlled staff access and read-only order workspace | 4 | TODO | Existing admin claims and order services |
| A13 | Staff denied all admin mutations/private catalog/settings | 4 | TODO | Requires API-level tests, not just hidden buttons |
| A14 | Approved content/banner/navigation/FAQ/journal controls | 5 | TODO | Existing merchandising plus additive content record |
| A15 | Gold/ivory/emerald polish with mobile, desktop, dark and RTL parity | 5 | TODO | Existing design tokens/luminous.css |
| A16 | Shared prices in catalog/cart/quote/order/AI exports | 2–6 | IN_PROGRESS | Canonical variants retained; fixed/custom checkout and pack/inquiry/AI basis tested; full UI/integration release gate remains |
| A17 | Changes, evidence and continuation state recorded | All | IN_PROGRESS | CHANGELOG.md; HANDOFF.md |
| A18 | Type/build/hooks, regression suite and browser verification | 6 | IN_PROGRESS | Stage 2 evidence in TESTING_RELEASE.md; later UI/release checks pending |
| A19 | Safe migration preview, preserved owner edits/IDs/history, rollback | 6 | TODO | Create-only or opt-in migration; no production writes |

No requirement is DONE solely because a form or endpoint scaffold exists.
