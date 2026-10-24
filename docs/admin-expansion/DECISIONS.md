# Owner decision register

| ID | Decision | Source/status |
| --- | --- | --- |
| D01 | Extend existing AllBarka store and shared Firestore catalog; keep current keys/values unchanged. | OWNER-CONFIRMED |
| D02 | Phase A: catalog plus approved content controls. Preserve existing operations; no new inventory/coupon/reporting program. | OWNER-CONFIRMED |
| D03 | Manual per-option rates and automatic unit-rate calculation are both available. Merchant overrides are explicit. | OWNER-CONFIRMED |
| D04 | Selectable mg, g, kg, ml, L and count/pack units. Mass, volume, packaging capacity and shipping billing weight are separate facts. | OWNER-CONFIRMED / existing tariff preserved |
| D05 | Product quantity mode is fixed, custom or both; admin supplies custom minimum, maximum and increment. Existing custom portions remain compatible. | OWNER-CONFIRMED |
| D06 | Reusable item/category attribute templates; allow relevant future product attributes without a source edit. | OWNER-CONFIRMED |
| D07 | Separate English, Urdu and Arabic content sections; owner fills translations gradually. English display fallback does not mark translations complete. | OWNER-CONFIRMED |
| D08 | Staff's approved scope is order list/detail viewing only. Admin retains catalog, publishing, prices, payment/status changes and account permissions. | OWNER-CONFIRMED |
| D09 | Required/optional field labels, drafts, previews, duplicate-as-draft, archive and change history. | OWNER-CONFIRMED |
| D10 | Preserve existing identity and gold/gold-dust premium detail. Earthy colours are supporting details; prioritize mobile and desktop quality. | OWNER-CONFIRMED |
| D11 | Use six stages with written completed/pending work and verification evidence. | OWNER-CONFIRMED |
| D12 | Preserve existing stock convention 9999, packaging MOQ, 10-calendar-day preparation and standard-vs-inquiry ordering. | Existing owner rules, retained |

## Documentation drift discovered

`AGENTS.md` described React 18, while the actual lockfile/package use React 19. Existing category prose in repository skills also differs from the current category registry. Runtime/schema tests and current owner decisions must ground implementation; do not rename categories from stale prose. This expansion does not change reference-import markup or legacy custom-gram rounding.

The working branch is `codex/admin-catalog-foundation-20261023`, created from the verified release. Earlier renovation branch/halt instructions describe a prior workstream and do not describe this branch's current status.

## Stage 4 identity decision

Store the order-reader grant in server-only `staffAccess/{uid}`, atomically with its audit, rather than editing Firebase custom claims. Fresh Firebase Auth identity and this grant are checked on every staff request. This preserves unrelated claims and makes grant/revoke independent of cached token-role refresh. Administrators still require their existing verified admin claim and a fresh admin account check for staff management. Disabled accounts, revoked sign-ins and unverified staff email are denied. No live account or grant was changed during implementation.
