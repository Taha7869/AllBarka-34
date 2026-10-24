# Requirement matrix

Statuses refer to the expansion, not whether an older partial implementation exists.

| ID | Requirement | Stage | Status | Evidence/path |
| --- | --- | --- | --- | --- |
| A01 | Verified baseline, stage plan, decisions and handoff | 1 | DONE | ROADMAP.md; instructions.md; design.md |
| A02 | mg/g/kg/ml/L/piece/pack selection with safe dimension conversion | 2 | DONE | productCommerce.ts and shared form; conversion and dimensional mismatch tests |
| A03 | Manual and calculated option prices, explicit overrides | 2 | DONE | Explicit-save canonical pricing; exact half-up calculation and preservation tests |
| A04 | Fixed/custom/both quantity with min/max/step | 2–3 | DONE | Configured food/liquid custom mass/volume controls; fixed count packs; custom 750mg cart and server pricing verified |
| A05 | Reusable templates and bounded attribute definitions | 2–3 | DONE | Revisioned template/typed attribute editor and explicit application controls; browser save plus schema tests |
| A06 | Admin-created category/collection/occasion extensions | 2–3 | DONE | Category/collection/occasion editor, hidden IDs and shop discovery; initial route metadata and sitemap integration |
| A07 | Complete add/edit form and visible Required/Optional labels | 3 | DONE | Shared AdminItemForm with visible mandatory/publish-required/optional markers; responsive browser matrix |
| A08 | Separate EN/UR/AR descriptions and translation status | 3 | DONE | Separate EN/UR/AR names/descriptions/origin; missing translations stay empty and display English fallback |
| A09 | Durable image upload, cover, gallery and alt text | 3 | DONE | Authenticated durable upload implementation, cover/gallery controls and alt text; local provider success/failure tests; live bucket unverified |
| A10 | Localized SEO fields and social preview | 2–3 | DONE | Localized form and client metadata; saved English metadata in initial HTML; keywords/social image and fallback tests |
| A11 | Draft, preview, duplicate, publish, archive and revision conflict handling | 3 | DONE | Existing duplicate/archive lifecycle retained; shared draft/preview/publish flow and real stale-edit conflict browser case |
| A12 | Admin-controlled staff access and read-only order workspace | 4 | DONE | staffAccess.ts, AdminStaffPanel, StaffOrdersWorkspace; grant/read/revoke browser test |
| A13 | Staff denied all admin mutations/private catalog/settings | 4 | DONE | HTTP permission matrix, strict DTO, disabled/revoked/stale claims, audit rollback and concurrency checks |
| A14 | Approved content/banner/navigation/FAQ/journal controls | 5 | DONE | AdminContentPanel, revisioned draft/live router, actual hero/banner/sections/menus/FAQ/journal; HTTP and browser persistence/privacy/conflict checks |
| A15 | Gold/ivory/emerald polish with mobile, desktop, dark and RTL parity | 5 | DONE | premium-content.css, native FAQ and Studio; 390/1440 × EN/UR/AR × light/dark browser matrix, reduced motion |
| A16 | Shared prices in catalog/cart/quote/order/AI exports | 2–6 | IN_PROGRESS | Stage 3 browser cart uses normalized custom label; server ignores submitted price; full regression suite passes; final live integration remains Stage 6 |
| A17 | Changes, evidence and continuation state recorded | All | DONE at checkpoint | CHANGELOG.md; HANDOFF.md; RELEASE_PACKET.md; next external gates explicitly recorded |
| A18 | Type/build/hooks, regression suite and browser verification | 6 | IN_PROGRESS | Stage 5 type/build/hooks, 693/693 tests across 67 files, 21 backend, 36 production and assets pass; browser matrix passes; deployed-service checks BLOCKED |
| A19 | Safe migration preview, preserved owner edits/IDs/history, rollback | 6 | IN_PROGRESS | Offline read-only additive-impact report: 97 fixture records unchanged, 93 valid seed price comparisons, four invalid seed IDs flagged; zero writes. Live owner-data export/review and release rollback rehearsal BLOCKED |

No requirement is DONE solely because a form or endpoint scaffold exists.
