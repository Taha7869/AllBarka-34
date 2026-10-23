# AllBarka admin expansion — working instructions

Read `AGENTS.md`, `design.md`, and `docs/admin-expansion/HANDOFF.md` before continuing this project. The approved plan is `docs/admin-expansion/ROADMAP.md`; older renovation documents remain historical evidence, not the status of this expansion.

## Owner-approved scope

Extend the existing store, without replacing its working commerce system. Phase A covers products, categories, collections, occasions, reusable attribute templates, photos, variants, manual/calculated prices, fixed/custom quantity, SEO, translations and approved website content controls. A staff workspace may **view orders only**. New inventory accounting, coupon systems, customer management and advanced reports are outside this phase; existing features must continue working.

## Execution

1. Work in the six numbered expansion stages. Update the roadmap, requirement matrix, change log and handoff at every stage boundary.
2. Keep statuses honest: TODO, IN_PROGRESS, DONE or BLOCKED. State whether evidence is source inspection, automated verification, browser verification or a real external integration.
3. Reuse the existing catalog, pricing validation, admin request helper, authentication, components and translation contexts. Read `docs/COMPONENTS_INVENTORY.md` before adding a component.
4. Keep product IDs, existing routes, historical receipts, saved carts and integration contracts compatible. Extend schema additively. Existing products without the new optional configuration retain their behavior.
5. Do not use fabricated sample prices as form defaults. Empty prices remain unset; custom/unpriced items use the configured inquiry flow.
6. Mandatory and optional labels must be visible beside every editable field. Incomplete drafts are allowed; publish enforces product-type-specific requirements.
7. Keep English, Urdu and Arabic inputs separate. Unfilled translations use English at display time; do not silently save copied English as a completed translation.
8. Add server validation and permissions alongside UI controls. Staff cannot gain mutation privileges by calling admin endpoints directly.
9. Record meaningful changes in `CHANGELOG.md`: prior behavior, new behavior, reason, paths and evidence. Record business decisions in `docs/admin-expansion/DECISIONS.md`.
10. Run the required build, typecheck, hooks lint, affected regression tests and the full offline suite before declaring the release ready. Verify responsive UI, RTL, dark mode and reduced motion in a browser.

## Existing business invariants

- Firestore is the live catalog/pricing authority. Do not introduce a second independently editable price list for storefront or n8n.
- Preserve existing shipping, coupons, loyalty, packaging MOQ, preparation and order-idempotency rules. Oil's approved shipping tariff convention remains 1ml billed as 1g; it is not a physical density claim.
- Keep supplier information, internal notes, costs and draft records private.
- Existing 9999 stock policy remains an availability convention, not a physical stock assertion.
- No environment variable/key changes, production database writes, published rules, live workflow edits, merges to launch/main or deployment are part of this development instruction. Produce a reviewable feature branch.

## Verified baseline

Repository: `Taha7869/AllBarka-34`. Both `launch` and `main` were verified at `5e6349051980abd1a20f719f289a24a3fd2cba7b`. Expansion branch: `codex/admin-catalog-foundation-20261023`. Remote files were read at that immutable commit and checked against their Git blob hashes. Local snapshot history is only a verification aid; remote commits must retain the original upstream parent and unchanged files.
