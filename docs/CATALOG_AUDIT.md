# Catalog and category reconciliation record

Updated: 25 October 2026 (Asia/Karachi).

Protocol: [RULES.md R04](../RULES.md#r04--catalog-classification-is-an-end-to-end-gate). This file records audit evidence; it is not a background synchronization job or automatic Firestore repair.

At each catalog/storefront task, compare the current catalog/taxonomy revision or update watermark with the last audit through existing authorized read access. If newer or unknown, obtain a fresh snapshot; if unavailable, record stale/unverified status instead of waiting for a repeated owner prompt.

## Current checkpoint

| Field | Record |
| --- | --- |
| Trigger | Owner requested a recurring rule for correct category matching after new/updated Firestore items. |
| Source inspected | Repository at `2df0571e52c2281f39f70ed660abef8b62e50784`; category configuration, schema, form and discovery/test paths. |
| Live Firestore data | NOT_READ in this checkpoint; no current snapshot or authorized connection used. |
| Live audit status | BLOCKED / NOT_RUN. Current actual merchant records and published taxonomy must be retrieved through an authorized read path. |
| Total current records scanned | Unknown; no live count is claimed. |
| Production corrections | None. No reclassification, seed, price change or publish performed. |
| Source findings | Current schema distinguishes primary `category`, `collections`, `occasions`, `productFamily` and `packagingSubcategory`. Existing aliases/legacy gift and packaging routes must be preserved. Syntactic validity does not establish semantic correctness. |
| Next step | Obtain the authorized complete catalog/taxonomy snapshot, identify its revision/time and enumerate all pages. Apply R04; classify exceptions before preparing any proposed corrections. |

The full offline suite includes existing catalog/category/discovery fixtures; its result is in [PREMIUM_PLANNING_CHECKPOINT.md](PREMIUM_PLANNING_CHECKPOINT.md). Those fixtures cannot establish the current live category assignments.

## Source map

- `src/config/categories.ts`: built-in categories, commercial collections, occasions and legacy aliases.
- `src/lib/catalogConfiguration.ts` / `catalogConfigurationRouter.ts`: current typed taxonomy, templates, visibility and validated settings.
- `src/lib/catalogSchema.ts` / `catalogStore.ts`: normalization, saved metadata, public projection and publication behavior.
- `src/components/AdminItemForm.tsx`: primary category, template application, collections/occasions and packaging subcategory.
- `src/lib/catalogDiscovery.ts`, `catalogLinks.ts` and actual shop/category routes: search, routing and discovery.
- Existing `tests/catalog-categories.test.tsx`, `catalog-filter-draft.test.ts`, `catalog-render.test.tsx`, `discovery.test.ts`, `admin-expansion-item-workflow.test.ts` and `admin-expansion-persistence.test.ts`: relevant regression coverage to extend when behavior changes.

## Required audit header for each later run

```text
Audit ID / date / auditor:
Trigger and affected product IDs or import batch:
Environment and source type (live / export / emulator / fixture):
Application revision; taxonomy revision; snapshot retrieval time:
Read path, pagination coverage and any inaccessible records:
Totals: scanned / published / draft / archived / unavailable:
Known legacy aliases and approved compatibility exceptions:
Result: PASS / FAIL / BLOCKED; limitations:
```

## Per-item exception format

| Product ID | Observed category / collections / occasions | Expected assignment and merchant/source evidence | Customer impact | Proposed change | Status / verification |
| --- | --- | --- | --- | --- | --- |
| No live rows audited yet | Unknown | Unknown | Not assessed | None | NOT_RUN |

Delete the placeholder row only when replacing it with a dated real audit; retain historical runs or link their sanitized reports. Summaries should include all-product coverage and the full exception list, not only passing examples. Keep private notes, supplier costs, customer information and credentials out of reports.

## Acceptance for an audit result

- Every product in the stated scope was enumerated; counts reconcile with the snapshot and pagination.
- Primary category, collections, occasions and required subtype/template semantics were checked against current configuration and supported compatibility rules.
- Each changed published item appears in its expected customer routes/search/filters with correct imagery and current purchase/inquiry state; negative membership and draft privacy were checked.
- Normal refresh behavior after authorized changes was verified; stale output is distinguished from incorrect persisted data.
- Unknown/ambiguous mappings have evidence or an explicit owner question. Nothing was silently assigned from a guess or a fallback.
- Any correction has a before/after dry run, authorized scope, revision handling and post-change verification; unrelated values/IDs/receipts remain intact.

A source-only or fixture-only result must be labeled as such. The optional automated report remains PROPOSED / TODO as M34 in [MASTER_PLAN.md](../MASTER_PLAN.md).

## V1 — 25 October 2026

Baseline 2c94349b7754a94b936783b4c85595c66f406a83. Live revision UNKNOWN: no configured Firestore read tool/current authorized private export. Live audit BLOCKED. Hero/category-control styling changes no IDs or mappings; existing source/fixture category regressions and real pistachio search/category/PDP navigation are required in PREMIUM_V1.md. No production writes.


## 26 October — visual/motion revision

Baseline 599d13461db796a8f6ad73bbf44910d7ec3a78ab; recovery source 30438be512ac433dfcfb59a911137ec00d46f2f9. Live revision UNKNOWN; no Firestore reader/current export, audit BLOCKED. IDs, taxonomy assignments, routes, membership and prices unchanged. Dates uses existing generated dark-date category imagery if no exact-category cover exists; the legacy khajoor record remains in nuts and normal aliases still control discovery. This is illustration, not a reclassification or delivered-contents claim. Default badges now follow destinations after merchant reorder. Fixture verification is recorded in PREMIUM_V1_REVISION.md; no live writes/certification.


27 October 2026 — V2 presentation checkpoint: live watermark remains UNKNOWN; no new authorized snapshot available, live audit BLOCKED. Existing local readers now exclude disabled variant labels and resolve removed remembered selections, without changing product/category assignments. New fixture checks selected 500g/cart, category results, mobile budget filters and back depth. Full fixture/asset evidence is in PREMIUM_V2.md. No claim that current Firestore records were all audited; no production writes.


27 October 2026 — V3 PDP presentation: watermark UNKNOWN / live audit BLOCKED. No authorized Firestore read tool/current export found; no live writes or category changes. Existing fixture product pista and the first saved bid-box fixture exercise food/packaging presentation, selected quantities/totals, available related-price selection and failure handling. No full live semantic category certification. See PREMIUM_V3.md; prior audits remain historical.


27 October 2026 — editorial presentation: live watermark UNKNOWN/current audit BLOCKED; no authorized current merchant snapshot. Journal related products use the current public active catalog and shared ProductCard instead of a raw first-price/500g fallback. Existing fixture related-cart and full regressions are local evidence; no new classification/price/status or live write. See PREMIUM_EDITORIAL.md.


27 October 2026 — V4 gifting: live watermark UNKNOWN/current audit BLOCKED; no authorized current merchant snapshot. Gift membership/occasion matching retains the existing rule and exact IDs. Starting-pack budget uses an enabled positive option, not order/MOQ affordability. Current snapshot fixtures verify changed pista rate, unlisted filling recovery, saved hamper repricing and unavailable packaging. Shared hamper availability validation now rejects inquiry/draft/archived/disabled250g selections; no record/price/taxonomy mutation. This is source/fixture evidence, not current live semantic reconciliation. See PREMIUM_GIFTING.md.


27 October 2026 — M18 cart/checkout: live watermark UNKNOWN / current semantic audit BLOCKED; no authorized current merchant snapshot/read tool. Current provider images and exact saved identities/variants remain. Fixture deliberately holds an older public snapshot while the actual quote service reads a changed memory-catalog rate, verifying canonical quote line-price/total continuity. Drawer recommendations now exclude unavailable/unpublished/inquiry records and disabled/nonpositive portions. No live assignment, rate, price formula, stock, publication or taxonomy write. Local evidence only; see PREMIUM_PURCHASE.md.
