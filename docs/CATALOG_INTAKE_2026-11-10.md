# CATALOG-INTAKE-01 — owner photo selections and create-only drafts

10 November 2026, Asia/Karachi. Branch `codex/premium-table-kit-20261108`, draft PR #17. Inspected parent `3436bac48e0d0014ae88517877fd6d116485a289`. Owner authorizes adding missing items, improving copy and generating AI images; existing products/rates and OG design must remain unchanged. Website launch/payment and live verification remain later work.

## Completed source package

- [17 new draft product payloads](../src/data/catalogIntake20261110.json): English/Urdu/Arabic names and copy, keywords, categories, local media and editable commerce configuration. They are an import input, not a second live price authority.
- 17 independently generated product illustrations, encoded as WebP under `public/images/catalog-intake-20261110/` (4,837,500 bytes total). All images were visually inspected as generated. [Recorded prompts and provenance](evidence/catalog-intake-20261110/image-generation.json). Built-in image generation was used; the actual underlying model identifier was not exposed. Image SEO alt text identifies illustration; no merchant photoshoot or actual bottle specification is claimed.
- [Create-only adapter](../src/lib/catalogIntake20261110.ts) reuses existing `createAdminProduct` validation, transactions, revisions and audits. Existing IDs are skipped, including a concurrent creator. It never updates, deletes, publishes or reprices an existing document.
- [CLI](../scripts/import-catalog-intake-20261110.ts) defaults to a credential-free offline plan. Execution requires explicit project/database and current administrator authority; it imports drafts only. No secrets or customer data are logged.
- `/shop/saunf` grouping includes existing `fennel-seeds` and the two new saunf mixes without changing the saved category of plain fennel. Default taxonomy and EN/UR/AR labels are additive. Saved merchant taxonomy is not overwritten; its visibility/order should be reviewed in Studio on activation.

[Review all 17 images](CATALOG_IMAGE_REVIEW_2026-11-10.md).

## New items

| ID | Customer name / identity | Pricing state |
| --- | --- | --- |
| sweet-fruit-balls | Sweet Fruit Balls; owner confirms sugar shell, powdered sugar centre and tiny sugar crystal | Blank; 100g option prepared |
| mixed-mukhwas | Mixed Saunf Mukhwas; exact batch ingredient list remains to be checked | Blank |
| sweet-makhana-large | Sweet Makhana — Large Sugar Clusters; traditional bid sweets | Blank |
| nakul-dana-small | Nakul Dana — Small Sugar Clusters; separate from large size; no chana included | Blank |
| sugar-coated-saunf | Sugar-Coated Saunf | Blank |
| peanut-jaggery-gachak | Peanut & Jaggery Gachak; owner confirms gur and peanuts | Blank |
| sesame-rewari | Sesame Rewari | Blank; sweetener/batch details need verification |
| brown-raisins | Brown Raisins (Kishmish) | Old photo tag Rs1,000/kg, draft reference |
| dates-soft-brown | Soft Brown Dates | Old photo tag read as Rs300/kg; recheck legibility/current rate |
| dates-dark-round | Dark Round Dates (left tray in zz.jpeg) | Old photo tag Rs500/kg, draft reference |
| dates-dark-long | Dark Elongated Dates (right tray in zz.jpeg) | Old photo tag Rs900/kg, draft reference |
| dates-golden-brown | Golden-Brown Dates (zzz.jpeg foreground) | Old photo tag Rs350/kg, draft reference |
| oil-peanut | Peanut Oil | Blank |
| oil-sunflower | Sunflower Oil | Blank |
| oil-neem | Neem Oil | Blank; grade and intended use must be confirmed |
| oil-taramira | Taramira Oil | Blank; grade and intended use must be confirmed |
| oil-soybean | Soybean Oil | Blank |

Five photo-tag amounts are owner-authorized old **draft references**, not current merchant/live prices. Every new item starts `status=draft`, `active=false`, `quoteOnly=true`; unknown rates stay blank, never zero-price checkout. Before publication review current prices, active state, stock/preparation, appropriate grade/use and facts. For priced standard checkout, select standard order mode, clear quoteOnly and save validated options through the existing editor. Existing commerce products require the options/base-rate editor; do not edit only the legacy prices map and assume that updates the configured commerce contract.

New oils have 100ml,250ml,500ml,1L options and bounded custom volume 10–5000ml in 10ml steps. These are editable intake defaults, not minimum production commitments. No rate is inferred for them, and existing oil sizes are unchanged. The application retains its existing oil shipping tariff; it is not a density claim.

## Existing entries reused, not duplicated or modified

Plain saunf: `fennel-seeds`. Golden/black raisins: `golden-raisins`, `black-raisins`; existing `kishmish` remains unchanged. Board oils already in source: `oil-mustard`, `oil-flaxseed`, `oil-blackseed`, `oil-coconut`, `oil-walnut`, `oil-almond`, `oil-sesame`, `oil-pumpkin`, `oil-chilgoza`. Nine existing plus five new cover the fourteen board names. Existing castor/apricot/olive/onionseed/hair selections and all earlier catalog items remain intact.

No claim is made that visually similar date selections are distinct named cultivars. The four new date IDs identify photo selections; exact cultivar/origin can be edited later. Existing named dates are not renamed, deleted or assigned these rates. Unknown raisin seed status, shelf life, full ingredients, certifications and health benefits are not invented. No neem/taramira ingestion or medical/hair-treatment instructions are supplied.

## Research and naming limits

Merchant terminology varies: Sweet Makhana / Nakul Dana / Mimosa Sugar Balls are used for traditional sugar confections. Large/small are separate here because the owner distinguishes them. They are not automatically fox nuts, cardamom-flavoured candy, cake pearls or sugar-coated chickpeas. The supplied Google AI Overview is a research lead, not product verification.

- [Royal Basket large Nakul Dana](https://royalbasket.pk/products/nakul-dana-large-250g) and [Pasha Sweet Makhany](https://pashadryfruit.com/product/sweet-makhany-%D9%85%DA%A9%DA%BE%D8%A7%D9%86%DB%92/) support regional naming/traditional use; their ingredients, prices, claims and shelf-life promises are not copied.
- [Memon Mimosa Sugar Balls](https://memondryfruits.pk/products/mimosa-sugar-balls-nukal-dana) has a title/description mismatch with chana; it cannot establish this batch's core ingredient.
- [NAVTTC dates-processing material](https://navttc.gov.pk/LessonPlans/3Months/DatesProcessing.pdf) and [TDAP date varieties material](https://agro.tdap.gov.pk/wp-content/uploads/2023/07/Supreme-internation_compressed.pdf) establish variety diversity, not a reliable photo-only cultivar match.

## Commands and live boundary

Offline plan (no credentials, network or writes):

```sh
node --import tsx scripts/import-catalog-intake-20261110.ts
```

After identifying the actual Firebase project, database ID and edition with authorized read access, run a read-only collision plan using configured private environment credentials:

```sh
node --import tsx scripts/import-catalog-intake-20261110.ts --read-only --project=ACTUAL_PROJECT --database=ACTUAL_DATABASE
```

Then execute the owner-authorized additive import against that reviewed target with a current admin UID:

```sh
node --import tsx scripts/import-catalog-intake-20261110.ts --execute --project=ACTUAL_PROJECT --confirm-project=ACTUAL_PROJECT --database=ACTUAL_DATABASE --actor-uid=CURRENT_ADMIN_UID
```

Do not substitute `scripts/migrate-products.ts --execute`: that historical bulk writer sets all compiled products and is unsuitable for the owner's no-overwrite request. The new script never changes `reuseExistingIds`. Read back all new drafts and their revision/audit records; compare existing merchant documents before/after. Publish only reviewed items through existing admin services, then audit full live category/search/PDP membership under RULES R04. No live catalog snapshot or live import was available/performed here; an attempted Firebase metadata CLI check could not complete. Database edition remains unverified and no database is provisioned or reconfigured.

## CI-PR17 exact diagnosis

Decoded GitHub job logs for Run47 (`42476709865`, job128719580921) and source3436bac (`42702581732`, job129450883073) both report `tests/premium-hero-browser.test.tsx:92`: **desktop brand has native keyboard semantics**, actual0/expected1. The care-layout loop leaves the viewport at360px, where the desktop `hidden lg:block` button is correctly absent from the accessible role tree. This reported failure occurs before the film-playback checks; MP4 decoding is not its demonstrated cause.

The fixture now establishes1440px before finding the desktop button, waits for visibility and retains the exact role/name/count assertion with an added keyboard-focus assertion. Existing application logo, navigation, video fallback and acceptance assertions remain intact. Hosted confirmation now PASS on source77975be, Run49:846 passed,0 failed,1 emulator-only skip. The enlarged-care loop explicitly sets360px; the earlier390px note is corrected. The1440px fixture fix is unchanged.

## Static-asset fallback follow-up

The development `appType: custom` wildcard did return HTML for nonexistent file paths after Vite. Added an extension/asset-namespace404 guard, preserving extensionless SPA deep links. Existing `/api` JSON404 and production file guard remain. `tests/dev-server.test.mjs` now exercises missing WebP/PNG/MP4/JS/CSS and extensionless asset namespace, plus a real `/shop/saunf` deep link. This is a separate demonstrated server issue, not the asserted cause of Run47.

## Verification and release state

[Final hosted verification and historical viewport correction](CATALOG_CI_VERIFICATION_2026-11-10.md). The existing caution/master/changelog checkpoints are retained; their earlier pending status is superseded by this source-specific result.

Fresh resumed gates: typecheck/hooks/build/privacy PASS;37 affected intake/taxonomy/CRUD/dev-server tests PASS. Missing-static404, normal SPA deep link and API JSON404 are verified against the actual development process. Local browser remains blocked by execution-environment restrictions; no local full-suite PASS is claimed.

Post-save verification: [Run49](https://github.com/Taha7869/AllBarka-34/actions/runs/42735336005) on source77975be completed successfully:846PASS/0FAIL/1 emulator-only SKIP across109 files,21 backend and36 production checks, zero missing existing assets. All36 changed paths and the exact Git tree matched after remote fetch; all17 WebPs decoded and matched their hashes. Additional fixture checks passed17 category selections and51 EN/UR/AR card route/image/name renders. The hosted screenshot artifact exists but was not manually inspected here. This follow-up changes evidence and the viewport comment only.

Current exact machine-readable results: [verification.json](evidence/catalog-intake-20261110/verification.json). Self-review only; no independent reviewer claimed. Scope is a saved intake/import/CI-diagnosis checkpoint, not a launch-ready release. R04 live snapshot/classification is BLOCKED by unavailable authenticated target data. No deletion/archive, credential change, rules write, workflow publication, merchant overwrite, production merge or deployment occurred.

Delivery checklist: scope supplied as a bounded checkpoint; new source/image/schema checks recorded; existing-data preservation tested transactionally; open browser/live gates explicit; master plan/changelog and [minimal handoff addendum](CATALOG_INTAKE_HANDOFF_2026-11-10.md) updated; historical admin handoff unchanged because automatic approval review rejected re-uploading its sensitive historical contents; expected-parent save and remote content/tree read-back required. Remaining next actions: perform authorized read-only target inventory and additive import, merchant edit/review/publish, then actual storefront and later live integration checks. Original full redesign/security work remains tracked in the confirmed plan.
