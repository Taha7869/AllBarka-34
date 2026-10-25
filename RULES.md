# AllBarka — mandatory working and delivery rules

Updated: 25 October 2026 (Asia/Karachi).

Owner request: review the work before delivery, verify that new/updated Firestore products reach the correct categories, preserve working behavior, and keep a reliable record across chats and agents.

**Read this file before every task. Apply the relevant gates before calling that task complete.** These are development instructions, not an installed background monitor, CI check, Firestore trigger or guarantee that defects are impossible. Current implementation status belongs in [MASTER_PLAN.md](MASTER_PLAN.md); catalog audit evidence belongs in [docs/CATALOG_AUDIT.md](docs/CATALOG_AUDIT.md).

## R01 — Resume from verified repository state

1. Read [AGENTS.md](AGENTS.md), [instructions.md](instructions.md), this file, [MASTER_PLAN.md](MASTER_PLAN.md), [design.md](design.md) and the current [handoff](docs/admin-expansion/HANDOFF.md).
2. Inspect the current remote branch/PR head, local changes and the relevant source. Do not infer that `main`, the working branch and the deployed build are identical.
3. Preserve unrelated changes and completed work. Use an isolated checkout if another working copy is dirty. Never overwrite another agent's draft or force-push reconstructed snapshot history.
4. Before a feature checkpoint, select its stable task ID and record scope, acceptance criteria, dependencies and owner/agent. Do not silently add a new app, service or parallel catalog.
5. Resolve routine implementation choices from existing rules. Ask the owner only for a material missing business decision, factual asset/data, ambiguous classification or genuinely unavailable authorization; reuse answers already recorded.

## R02 — Keep approval, implementation, verification and release separate

- Scope: `PROPOSED`, `SELECTED`, `DEFERRED` or `REJECTED`. Capturing an idea is not a claim that it has been selected.
- Work: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`. A blocker includes the reason, affected tasks, unblocker and next independent action.
- Evidence: distinguish source inspection, local automated tests, browser/fixture verification and actual external integration.
- Release: record branch/commit and whether the feature is merged, deployed and live-verified. None follows automatically from another.
- `DONE` means the stated acceptance criteria passed on the stated revision. A stub, button, screenshot, mocked success, compiled fallback or written checklist alone is insufficient.
- Never mark an untested gate `PASS`. Use `NOT_RUN`, `BLOCKED` or justified `N/A`. Old successful tests are historical evidence until rerun on the relevant source.

## R03 — Review before delivery

Review the final diff after implementation and before delivery. Record reviewer/method, revision, affected files and findings. Check correctness, failure behavior, permission boundaries, data compatibility, product/category accuracy, localization, accessibility and unnecessary complexity as applicable.

| Finding | Required response |
| --- | --- |
| Critical/high: unauthorized access, secret/private-data exposure, lost/duplicate order, wrong totals, destructive data loss, blocked core purchase | Fix and recheck before presenting the affected feature as complete or release-ready. An unfinished checkpoint must explicitly carry the blocker. |
| Medium: broken supported flow, wrong product/category or variant, unusable layout/input, missing acceptance behavior | Resolve within the task or explicitly record a scoped deferral and its user impact. A deferral cannot satisfy the affected acceptance criterion. |
| Low: optional polish/maintainability outside the acceptance criteria | Fix where appropriate or record a follow-up task with an owner and reason. |

For every meaningful finding: record ID, severity, reproduction, affected path, fix or disposition and verification. Re-read the changed area after the fix. Do not claim CodeRabbit, independent human review or another agent's review unless it actually occurred. A self-review must be called a self-review. An unavailable optional reviewer does not substitute for the mandatory local review.

## R04 — Catalog classification is an end-to-end gate

At the start of each catalog/storefront task, check the available catalog/taxonomy revision or update watermark through existing authorized read access against the last audit. Newer or unknown data requires a fresh scoped snapshot; do not assume the owner will remind the agent about every new item. If no reliable change marker exists, compare the current complete snapshot or explicitly mark the previous audit stale/unverified.

Trigger this gate after catalog creation/import/metadata updates, an observed/reported Firestore product change, taxonomy edits, category/navigation/filter changes or an authorized catalog release. Do a complete read-only reconciliation of the relevant catalog snapshot and changed-item journeys; do not verify only one screenshot or the first page of results.

1. **Identify the source.** Record environment, configured project/database identifier where appropriate, application commit, configuration revision, retrieval time and whether data is live, exported, emulated or fixture-backed. Never substitute a bundled product list for the current Firestore data.
2. **Read the complete scope.** Enumerate all pages through an authorized read path; include public, draft and archived states when auditing the full admin catalog. Record total scanned and counts by state. If only public data is accessible, label that limitation; private drafts cannot be certified from public responses.
3. **Use actual fields.** Inspect stable product `id`, primary `category`, `collections`, `occasions`, `productFamily`, `packagingSubcategory`, `status`/availability and relevant commerce/template metadata. Use current published taxonomy plus supported legacy routes/aliases from `src/config/categories.ts` and `src/lib/catalogConfiguration.ts`.
4. **Check meaning as well as IDs.** A valid slug is not proof of a correct product match. Compare the merchant's product name, description, product kind, packaging/contents and intended selling route. Food categories, merchandising collections and occasion tags have different purposes. Preserve intentional legacy category/collection compatibility, including gift/packaging routes; do not force all products into food-only categories.
5. **Find exceptions.** Report unknown/orphan IDs, misspellings, duplicate IDs/tags, accidental default-to-dry-fruits assignments, hidden destinations, missing intended collection/occasion links, wrong packaging subcategory, missing routes and mismatched images. An unknown match requires review, not an invented assignment.
6. **Check the actual customer journey.** Confirm changed published items in intended category/collection/occasion results, search, filters and count totals; open the correct PDP and verify current availability, image, variant/unit and authoritative price. Check both positive and negative membership. Confirm drafts/private supplier fields remain hidden. Preserve current publication/availability semantics rather than inventing new filtering rules.
7. **Refresh and compare.** Verify the normal refresh/cache path after an authorized change, including relevant catalog API and configured n8n catalog projection when integration scope is affected. A direct Firestore edit is not proven on the storefront merely because it saved. Do not purge or rewrite production caches/data speculatively.
8. **Record the result.** Use [docs/CATALOG_AUDIT.md](docs/CATALOG_AUDIT.md): product IDs, observed/expected assignments, evidence, revision/counts and unresolved exceptions. A sample alone cannot support “all products matched.”

**Writes are separate from audit.** This rule authorizes no automatic production mutation, bulk reclassification, seed, deletion, price reset or publish. Prepare a product-ID-specific before/after dry run for any correction; use the existing revisioned admin workflow within the owner's authorized scope. Preserve IDs, prices, stock, publication state, saved receipts and compatibility. If the owner already authorized the exact data action, proceed without repeatedly asking. Otherwise keep the audit read-only and make the proposed change reviewable.

If current Firestore access is unavailable, finish source/fixture checks, record the live audit as `BLOCKED`, and continue independent work. A rules document itself does not detect future database changes. Automated orphan/category monitoring is separately tracked as M34 in the master plan.

## R05 — Preserve commerce and data contracts

- Firestore remains the live catalog/pricing authority. Reuse the existing server quote/order services and the same canonical projection for n8n. Do not create an independently editable duplicate price list or invent missing prices.
- Keep stable product/box IDs, exact historical option labels, units, packaging MOQ, ten-calendar-day preparation and saved receipt/cart compatibility. Existing 9999 stock is the availability convention, not measured physical inventory.
- Preserve current shipping/coupon/loyalty rules: Lahore standard Rs.150, free at discounted subtotal >= Rs.3,000; express Rs.350; outside Lahore actual canonical weight × Rs.250/kg with Rs.250 minimum and the existing ZAFRANI exception. The existing oil tariff treats 1ml as 1g for billing only. Reuse calculation code; do not reimplement it in the UI.
- The server validates current totals. Handle repricing, unavailable options and changed quotes explicitly. Preserve idempotency and saved-order recovery; do not show success before accepted/persisted state.
- Metadata changes must not silently publish drafts, archive active items, reset merchant rates or materialize missing records from compiled defaults.
- For integration changes, verify DTOs, retries, acknowledgements and duplicate behavior. Preserve the receiver-before-sender dependency in [N8N_COMPATIBILITY.md](docs/admin-expansion/N8N_COMPATIBILITY.md).

## R06 — Reuse architecture and keep dependencies deliberate

Read [docs/COMPONENTS_INVENTORY.md](docs/COMPONENTS_INVENTORY.md) before adding a component. Extend the existing forms, services, contexts and routes. Keep TypeScript types and client/server validation consistent. Explain a new dependency and its purpose before installation; use the existing lockfile and stack. Remove temporary debugging from the deliverable and keep unrelated refactors outside the task.

## R07 — Verify visible and failure behavior

- Customer-facing text uses the existing translation/content system. Preserve English, Urdu/Arabic RTL and light/dark mode; do not store copied English as a completed translation.
- Check touched UI at 360/390px, tablet/laptop and 1440px desktop, short-height/landscape where relevant, 200% enlarged text, keyboard/focus, touch, safe areas and reduced motion. Minimum 44px targets and readable contrast remain project requirements.
- Exercise slow/loading, empty, invalid, unavailable, interrupted, failed and retry states. Preserve user input and selected variants/messages where promised. Success feedback follows the real state transition.
- Use real product/packaging media for claims about contents, size and presentation. Record generated/concept imagery honestly. Do not invent certifications, reviews, sourcing, health/allergen information or delivery promises.
- Retain the compact homepage, one product showcase and route-appropriate sticky controls. Check that dialogs, cart, navigation and the keyboard do not cover the required action.

## R08 — Verification by impact, with honest evidence

Follow current commands in `package.json` and [VERIFICATION_LOOP.md](docs/admin-expansion/VERIFICATION_LOOP.md). Repository source changes require typecheck, hooks lint, production build/privacy audit, affected regressions and the full offline suite before a verified implementation checkpoint. The existing build rule also applies to this documentation checkpoint. Run the affected browser journeys for UI behavior; external service behavior needs separate authorized external evidence.

| Change | Additional checks |
| --- | --- |
| Documentation only | Check relative links, stable IDs, conflicting instructions, accurate statuses, scope and final diff; do not claim a new visual or live audit. No tests that merely assert prose. |
| Catalog/taxonomy | R04 reconciliation, positive/negative discovery, draft privacy, aliases, actual public DTO and regression tests. |
| Prices/checkout/order | Canonical repricing, validation, stale quote, repeated submission, durable receipt, retries and compatibility. Use isolated test data. |
| Admin/auth/content | Direct API role checks, draft privacy, revision conflicts, unsaved-input protection and publish behavior. |
| Visual changes | Before/after actual-route screenshots, device/language/theme matrix, image/font failure and accessibility. |

Record exact commands, exits/counts, source revision and test conditions. Classify a failure before changing code; do not weaken assertions or replace a real path with a stub to obtain a pass. Re-run affected gates after a fix; broaden only when the changed behavior or unresolved risk warrants it.

## R09 — Production and secret boundaries

Existing keys/configuration remain unchanged for this work. Keep secrets, service-account files, private customer records and provider execution data out of Git, screenshots and reports. Admin permissions are server-enforced; staff remains orders-only. No production merge/deployment, Firestore/rules write, live workflow edit, customer message or role grant is implied by creating these rules. Use already-authorized access; do not solicit new keys merely to satisfy a checklist.

## R10 — Keep a usable handoff at every checkpoint

Update `MASTER_PLAN.md`, the relevant existing tracker, `CHANGELOG.md` and the current handoff together with the change. Record:

```text
Task ID and scope:
Branch + inspected parent + resulting commit/PR:
Status (scope / work / local verification / live verification):
Before -> after; files changed:
Review method + findings + disposition:
Acceptance checks and exact evidence:
Catalog reconciliation (PASS / FAIL / BLOCKED / N/A with reason):
Known failures, blockers and who/what can resolve them:
Next executable action and file:
```

Keep completed requirements and historical evidence; append corrections with dates instead of rewriting past outcomes. Before saving to GitHub, re-read the head and preserve unrelated changes. Use an expected-parent/fast-forward update. Verify the remote commit, intended changed paths and saved content after the write. A local file or uncommitted worktree is not a saved GitHub checkpoint.

## R11 — Delivery checklist

Copy this checklist into the task evidence and record each result with a reason:

- [ ] Scope/acceptance complete, or explicitly labeled as an unfinished checkpoint.
- [ ] Final diff reviewed; critical/high findings fixed and retested; other findings dispositioned.
- [ ] Relevant automated, browser and integration gates evidenced; unrun gates named.
- [ ] Catalog classification audited when triggered; fixture/live scope clearly separated.
- [ ] Commerce, privacy, roles, localization and existing behavior preserved.
- [ ] Task status, decisions, blockers, next action and changelog updated.
- [ ] Correct branch, remote parent and saved files verified; release state stated accurately.

A failed relevant gate prevents declaring the affected task complete. It does not require hiding useful partial work or stopping unrelated authorized work. Do not promise “perfect” or “zero bugs”; provide the tested behavior and its limits.
