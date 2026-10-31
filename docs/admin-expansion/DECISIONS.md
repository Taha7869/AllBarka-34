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
| D13 | Keep existing Firebase and all other service keys/configuration while completing UI/features; defer any future rotation. Provider permission/execution verification remains separate. | OWNER-RECONFIRMED, 25 October 2026 |
| D14 | Filled/custom box and hamper ingredient estimates use each product's current authoritative Firestore kilogram selling rate × explicit net filling grams / 1000. No 250g/500g pack proration or inferred kg fallback. Final filled/custom quotations are confirmed via WhatsApp. Preserve standalone retail rates/quantity rules; 50g is an example, not a universal recipe. | OWNER-CONFIRMED, 30 October 2026; implementation verified. [Architecture and acceptance](FILLED_GIFT_PRICING.md). |
| D15 | Admin visual recipe editor (`AdminRecipeEditor.tsx`, `AdminItemForm.tsx`) enables configuring recipe ingredients with live 1kg rate badges and grams per box, variant-specific recipe overrides (`filledRecipes`), and localized descriptions. Custom-hamper order-level precision policy (`resolveHamper`) applies BigInt scaling `exact += BigInt(kgRate) * 200_000n * BigInt(validQty)` with `roundHalfUp(exact, MICRO)` to eliminate rounding drift across endpoints, persistence, and WhatsApp. Status remains IN_PROGRESS pending merchant execution of live Firestore catalog migration. | OWNER-CONFIRMED, 31 October 2026; implementation verified. [Architecture and acceptance](FILLED_GIFT_PRICING.md). |

## Documentation drift discovered

`AGENTS.md` described React 18, while the actual lockfile/package use React 19. Existing category prose in repository skills also differs from the current category registry. Runtime/schema tests and current owner decisions must ground implementation; do not rename categories from stale prose. This expansion does not change reference-import markup or legacy custom-gram rounding.

The working branch is `codex/admin-catalog-foundation-20261023`, created from the verified release. Earlier renovation branch/halt instructions describe a prior workstream and do not describe this branch's current status.

## Stage 4 identity decision

Store the order-reader grant in server-only `staffAccess/{uid}`, atomically with its audit, rather than editing Firebase custom claims. Fresh Firebase Auth identity and this grant are checked on every staff request. This preserves unrelated claims and makes grant/revoke independent of cached token-role refresh. Administrators still require their existing verified admin claim and a fresh admin account check for staff management. Disabled accounts, revoked sign-ins and unverified staff email are denied. No live account or grant was changed during implementation.

## Stage 6 engineering compatibility decision — 24 October 2026

Preserve exact existing long packaging selection labels per original product ID, using the compiled label keys as an identity allowlist only. This is not owner authorization to change prices or materialize missing records. The four affected missing records continue to fail closed. Arbitrary new labels and optional commerce retain the existing 40-character limit. Canonical IDs, historical cart/order selections, merchant rates, shipping/MOQ and export authority remain intact.

Known active legacy seeds without an explicit lifecycle field already load publicly. Their admin representation/metadata update now preserves that state instead of defaulting them to draft. Explicit status, draft/archive markers, inactive/out-of-stock markers and configured/new product defaults are not promoted. The read adapter never writes. The existing audited metadata update records the preserved explicit lifecycle on an intentional edit.

Public deployed diagnostics are restricted to three credential-free GETs with bounded responses and allowlisted output. A configured flag or old deployment is not proof of feature readiness. No live customer order, webhook, role grant or upload is part of that diagnostic.

## Stage 6 wire identity compatibility — 25 October 2026

Reuse the exact catalog identity allowlist for historical n8n selections; keep the general 50-character wire bound and new-commerce 40-character bound. The standalone inactive receiver permits only the two original over-50 Umrah labels on the original product ID. No selection truncation, price recalculation, migration or automatic outbox replay is allowed. This is an engineering compatibility correction, not owner authorization to publish a workflow or change integration secrets. Verify the compatible receiver before enabling the corresponding sender path in a separately authorized release. Connected loopback acceptance is distinct from live Firebase/n8n/Sheets execution.
