# AllBarka admin expansion — working instructions

28 October 2026 — **M20-NAV1 navigation lifecycle / DONE locally for the bounded slice**. [Scope/evidence](docs/NAVIGATION_LIFECYCLE.md). Existing menu closes on route/history and desktop breakpoint changes; brand keyboard action and early user focus are preserved, duplicate parent navigation removed. Native brand target is at least 44px; enlarged social actions wrap without clipping. Isolated affected 13/13, final all-module-context journey 1/1 and full 715/715 across 79 files, 21 backend and 36 production checks PASS. 25 navigation layouts include doubled landscape text. Saved-checkpoint details are in the linked evidence. Keys/configuration and final release remain deferred.

28 October 2026 — current **M21 live motion preference** slice: [scope/evidence](docs/MOTION_PREFERENCE.md). Existing 35 Motion preference consumers use one subscribed hook; ScrollReveal retains child state. Typecheck/hooks/build/privacy and 21 targeted tests pass; final full regression passes 715/715 across 79 files, 21 backend and 36 production checks; source persistence is recorded in the linked checkpoint. Owner deferred keys/configuration and final release. Preserve prior Stage 3-to-M18 and recovery checkpoints.

27 October 2026 — latest continuation: [V6-R01 recovery verification](docs/RESUME_VERIFICATION.md). Use the current PR #16 head, recovered from `81eedbfe` and corrected for the mobile-menu exit overlay; no Stage 3 rebuild. Current tests and remote-save reconciliation are tracked there. Railway is now connected for read-only metadata; only production is listed, and OAuth variable values remain withheld. Preserve pending private merchant/provider checks and the receiver-before-sender release dependency. Earlier dated entries below are historical.

27 October 2026 — latest work: [M18 cart/checkout continuity](docs/PREMIUM_PURCHASE.md), SELECTED / DONE locally for the bounded purchase pass. Cart/drawer/checkout presentation, shared saved-gift details and current server-quote line prices are verified:53 affected tests and713 full tests across78 files,21 backend and36 production checks PASS. Preserve completed gifting/V1/V2/M15/M19. Next: V6 live integration readiness with authorized Railway/environment access and current merchant catalog snapshot. Current live audit and original Stage6 provider/release gates remain BLOCKED; no deploy or key change.

27 October 2026 — latest continuation: [V4 gifting](docs/PREMIUM_GIFTING.md). Bounded landing, contents/current-catalog builder and existing-message preview are DONE locally for the bounded scope: affected19/19 and final712/712 tests across77 files,21 backend and36 production checks pass. Source/evidence checkpoint: `57e2a0dc707268640e41d9032c4b68eb7a683206`; final documentation records the completed gates. Full V4 remains IN_PROGRESS: merchant printing/accurate assets and broader M18 cart/checkout presentation remain open. Existing Stage6 live blockers and live catalog audit remain BLOCKED. Next independent slice: M18 cart/checkout visual continuity.

27 October 2026 — current task: [M19 editorial continuation](docs/PREMIUM_EDITORIAL.md). Story/journal layout and related-product/share/filter fixes are DONE locally: final 710 tests,21 backend, 36 production checks; 72 layout combinations and enlarged text checks passed. Next independent design work: V4 gifting. Existing Studio publication controls retained; factual validation/original photography and Stage 6 live blockers remain open.

27 October 2026 — current task: [V3 product-detail art direction](docs/PREMIUM_V3.md). M15 and selection summary are DONE locally: 709 tests, 21 backend and 36 production checks passed. Broader V3 story/journal/facts remain pending. Preserve prior V1/V2 and Stage 6 live blockers.

27 October 2026 — next phase implementation: [V2 product cards and browsing](docs/PREMIUM_V2.md) is locally complete for the stated core scope: 708 tests, 21 backend and 36 production checks. Preserve the accepted hero; next recommended phase is V3 product detail. Live catalog audit and original Stage 6 blockers remain.

27 October 2026 — phase planning: owner accepted the revised look. Follow the six delivery phases in [MASTER_PLAN.md](MASTER_PLAN.md); V1 bounded opening is complete and V2-A product-card/collection continuity is the next SELECTED / TODO slice. No additional owner input is required for existing-asset layout work. Optional features and original Stage 6 live blockers retain their statuses. This checkpoint changes documents only.

27 October 2026: owner-requested emerald/arched hero and motion revision is locally verified. M01/M02 are DONE for this bounded pass; M04–M06/M21 have completed portions and pending broader work. Final offline suite: 707 tests, 21 backend and 36 production checks passed. Read [current revision](docs/PREMIUM_V1_REVISION.md). Earlier completed work and live Stage 6 blockers remain.

Read `AGENTS.md`, `RULES.md`, `MASTER_PLAN.md`, `design.md`, and `docs/admin-expansion/HANDOFF.md` before continuing this project. The verification/fix/checkpoint process is `docs/admin-expansion/VERIFICATION_LOOP.md`. The approved admin plan is `docs/admin-expansion/ROADMAP.md`; older renovation documents remain historical evidence, not the status of this expansion.

## Latest owner continuation — 25 October 2026

The current premium workstream is the bounded V1 hero/discovery pass in [docs/PREMIUM_V1.md](docs/PREMIUM_V1.md). Owner confirmed retail + gifting balanced and existing assets first. [MASTER_PLAN.md](MASTER_PLAN.md) retains stable M01–M34 IDs and unselected proposals. Count only evidenced scope as complete; do not repeat answered questions.

The owner additionally requested a rules file so future agents review before delivery, verify correct category matching after new/updated Firestore products and preserve working behavior without repeated prompting. [RULES.md](RULES.md) is mandatory for every task. Follow R03 review, R04 semantic/end-to-end catalog reconciliation and R11 delivery gates. Current live category-audit status and its reusable report are [docs/CATALOG_AUDIT.md](docs/CATALOG_AUDIT.md); no automatic monitor or live audit is implied by writing the rules.

Use the current feature branch and PR #16 below. Update the master register, relevant handoff, verification evidence and CHANGELOG before ending each checkpoint. New feature selections and owner materials are open in the master plan; finish independent authorized work without repeating already-answered questions. This latest planning/rules task does not reset completed admin stages or close their separate live blockers. Earlier next-step directions below apply to their own workstream. Documentation evidence: [docs/PREMIUM_PLANNING_CHECKPOINT.md](docs/PREMIUM_PLANNING_CHECKPOINT.md).

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

## Approved interaction refinement — 24 October 2026

Continue from Stage 5 commit `9afaca79459f3cf5da888a53a38344901b97dc78`. The owner approved a balanced luxury polish across homepage, catalog/product, cart and checkout based on seven motion references. Execute P1–P3 in `docs/admin-expansion/INTERACTION_POLISH.md`; retain the original six expansion stages and their external blockers. Reuse existing components and motion libraries. Confirm cart success only from the committed cart state; show loading only for a real pending operation. Fine-pointer photo preview must not replace explicit gallery selection or touch/keyboard controls. Verify reduced motion, EN/UR/AR, dark/light, responsive overflow and old commerce/admin/staff/content flows before saving a scoped GitHub checkpoint.

## Required resume protocol for any model or new chat

This file is the entry point for continuation. Never infer completion from a prior chat message alone. Read these current repository files before editing:

1. `AGENTS.md` — stack, existing business rules and safety boundaries.
   Also read `RULES.md` for mandatory review/catalog/delivery gates and `MASTER_PLAN.md` for the current premium proposals, inputs and task status.
2. `design.md` and `docs/COMPONENTS_INVENTORY.md` — visual direction and reusable components.
3. `docs/admin-expansion/HANDOFF.md` and `ROADMAP.md` — completed expansion stages and exact continuation point.
4. `docs/admin-expansion/REQUIREMENTS.md` and `INTERACTION_POLISH.md` — original requirements plus every approved interaction and acceptance gate.
5. `docs/admin-expansion/TESTING_RELEASE.md`, `VERIFICATION_LOOP.md` and `RELEASE_PACKET.md` — actual evidence, fix/recheck process, external blockers and rollback boundaries.
6. `CHANGELOG.md` — before/after behavior and meaningful implementation history.

Read draft PR #16 and confirm its current head before preparing a commit: https://github.com/Taha7869/AllBarka-34/pull/16 . Continue the existing feature branch `codex/admin-catalog-foundation-20261023`; do not create a replacement app or copy only a homepage mockup. The verified implemented Stage 5 parent is `9afaca79459f3cf5da888a53a38344901b97dc78` (tree `4e38e394006e87be385f3cfb0ae48f4e1b1423df`). Later commits can be documentation-only or partially implemented; inspect the current handoff and actual diff. Preserve the remote parent chain and every unmodified file. Recovered local snapshot commits are not upstream ancestry.

If scratch files are unavailable after workspace maintenance, restore source/assets from the verified GitHub feature branch, verify blob hashes and reinstall the unchanged lockfile. Do not replace the saved implementation with older ZIP files or compiled defaults. Save only intended changes against the remote base tree; absent historical binary evidence in a local reconstruction is not a deletion request.

## Feature inventory that must survive this refinement

| Area | Required existing behavior |
| --- | --- |
| Product administration | Shared add/edit workflow; draft/preview/publish/duplicate/archive; visible mandatory/optional markers; conflicts preserve input |
| Options and rates | mg/g/kg/ml/L/piece/pack; manual/calculated options and explicit overrides; fixed/custom/both as validated for product kind; canonical server prices |
| Product organization | Reusable templates/typed attributes; editable categories/collections/occasions; real customer discovery and stable IDs |
| Content and languages | Separate EN/UR/AR fields and display fallback; SEO keywords/localized metadata; cover/gallery/alt text; bounded catalog photo upload |
| Storefront studio | Private saved draft and hero/banner/FAQ preview; explicit publish; actual hero/banner, section order/visibility, primary menus, FAQ and plain-text journal consumption; revision/audit privacy |
| Roles | Admin management and separate staff orders-only reader; fresh server authorization; no staff writes/export/private admin data |
| Commerce | Saved-cart compatibility, custom quantity/units, packaging MOQ and 10-day preparation, canonical quote/order totals and idempotency, original shipping/coupons/loyalty |
| Customer experience | Existing compact homepage and one product showcase; product details, gallery/swipe/viewer, quick view, inquiry flow, cart and checkout |
| Design and access | Emerald/ivory/gold/gold-dust; readable mobile/desktop, dark/light, EN/UR/AR RTL, keyboard focus, 44px controls and reduced motion |
| Integrations and history | Keep existing Firebase/Auth/Storage/n8n contracts, historical receipts and private fields; do not mistake fixture success for live verification |

## Existing admin refinement and completion discipline

Previously authorized addition (completed locally): balanced luxury interaction refinement, passes P0–P3 in `docs/admin-expansion/INTERACTION_POLISH.md`. P0–P3 of the interaction refinement are complete under the local evidence in INTERACTION_POLISH.md and TESTING_RELEASE.md. Do not implement the same pass again. The documentation-first checkpoint is `dbf2b6c37a57b433ac7641d31d295547f30483ea`; the subsequent source checkpoint is the current draft PR head. The previously implemented expansion Stages 1–5 remain complete under their recorded offline gates. Expansion Stage 6 is still IN_PROGRESS with external checks BLOCKED, including private merchant-data review for four packaging IDs. Their reader correction is locally verified, not deployed/live-certified; retain the historical finding and its resolution evidence.

Before ending any implementation checkpoint, update the interaction tracker, handoff, requirements where applicable, exact test record and change log. Record: what changed, which acceptance gates passed, what failed and was fixed, what remains, and the next concrete file/behavior to work on. Use TODO / IN_PROGRESS / DONE / BLOCKED honestly. Do not mark an effect done solely because a class or form exists. Commit verified source/docs/evidence together on the review branch, update the existing draft PR and verify remote blob hashes/head. A fresh model should be able to continue using repository documents without access to the original chat.


### Next-model checkpoint after the refinement

The implementation now includes CartAddButton (committed cart quantity acknowledgement), the existing MagneticButton's corrected click/style/disabled forwarding, fine-pointer actual-photo preview with explicit browsing preserved, current mobile-menu state, restrained navigation/reveal/toast feedback and real pending-quote indicators. The actual header was verified and corrected at 360px and desktop widths; desktop navigation uses a centered second row from 1280px. Exact source paths and acceptance results are in INTERACTION_POLISH.md. Interaction checkpoint gates: 694 tests across 68 files, 21 backend checks, 36 production checks and unchanged catalog assets; build/type/hooks pass. See STAGE6_PROGRESS.md and TESTING_RELEASE.md for the later compatibility checkpoint. Original Stage 6 external checks remain BLOCKED and are the next work when a permitted integration environment is available. No production deploy, merge, live data/role write, workflow edit or key change is part of this checkpoint.

### Integration workstream — Stage 6 continuation

Integration continuation is tracked in `docs/admin-expansion/STAGE6_PROGRESS.md`. Read-only deployed checks are permitted; no live write is implied. The local correction preserves exact existing compiled packaging labels above the generic length bound while leaving arbitrary labels/configured commerce strict. Metadata-only edits preserve known active legacy publication state; explicit drafts/archives and new products remain private. Missing affected records stay unavailable with no compiled-price materialization. Never trim/rename historical labels or reset owner rates to compiled defaults. Treat the old deployed build's database connectivity and feature-branch verification as separate evidence.

### Stage 6 order handoff continuation — 25 October 2026

Read `docs/admin-expansion/N8N_COMPATIBILITY.md` for the connected quote → durable order → outbox → bundled receiver rehearsal. Two exact historical Umrah selections exceed the old 50-character wire bound. The sender and inactive receiver import now preserve those identities; do not widen arbitrary/new labels or truncate receipt strings. Real n8n/Sheets/Firebase remain unverified. Before a separately authorized release, verify the compatible receiver before enabling this sender path; never automatically requeue historical terminal/disabled events. `STAGE6_PROGRESS.md` remains the overall stage tracker.

### Owner continuation — preserve keys and finish usability

25 October 2026: the owner explicitly reconfirmed existing Firebase and all other service keys/configuration must remain unchanged while features/UI are completed. Do not treat provider verification as requiring a new key by default; use already-authorized configured access where available, and record absent access honestly. Key rotation alone does not replace permissions, actual upload/order/n8n and deployment checks.

`docs/admin-expansion/ADMIN_FINISHING.md` records the bounded admin finishing pass after remote parent `4772d983373cd51a2186e7e674ec800521c19802`. Preserve the shared eight-section Add/Edit form, section shortcuts, independent item/configuration unsaved protection, pending-save guard and error focus. Item saves must not discard unsaved category/template edits; configuration saves must not clear unsaved item edits or re-enable dismissal before refresh settles. Read current gates in TESTING_RELEASE.md and STAGE6_PROGRESS.md before continuing. Existing storefront/staff/content, connected order handoff and all original features remain implemented.
