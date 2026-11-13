# Launch readiness check — 13 November 2026

Branch `claude/celebrations-foundation-20261112`. Evidence is local only unless stated; hosted CI has not run on this branch and nothing here has been deployed.

## Verified in this pass

- Compiled catalogue (97 products): every product has description, usage, storage, sourcing, allergen and packing copy in EN, UR and AR (0 missing fields).
- Draft batch 20261110 (17), batch 20261113 (65) and batch 20261114 (41): 0 missing content fields and 0 products without pack prices after import-time enrichment.
- Catalogue translation dictionaries: EN, UR and AR hold the same key set (0 missing keys). All 60 `celeb.*` rows have three languages.
- Units: mg/g/kg and ml/L arithmetic is exact and cross-dimension conversion is rejected (tests).
- Typecheck, hooks lint, production build with privacy audit, and the full offline suite pass.

## Where the owner's "about 200 items" may come from

The compiled catalogue has 97 products but **198 price-option rows** (one per pack size); the WhatsApp export is reported at 204 rows. That is probably the "200". Real product count in the repository: 97 live-source + 17 + 65 + 41 drafts = 220 (the 41 are the 14 November bundles and premium items). The live Firestore count is still unmeasured.

[Master intake register](catalog/MASTER_INTAKE_REGISTER.csv) lists all 123 drafts with rate, photo state and blank owner columns (final rate, supplier, publish date). Regenerate with `npx tsx scripts/export-intake-register.ts`.

## Open gaps, in launch order

| # | Gap | Who | Blocking? |
|---|---|---|---|
| 1 | Live Firestore product count is unknown from here (owner expects about 200; the repository knows 97 + 17 + 65 + 41 = 220). Run `scripts/count-live-catalog.ts` or send `/api/catalog`. Until then duplicates between owner-added items and the two draft batches cannot be ruled out. | Owner | Yes, before any `--execute` import |
| 2 | 123 draft products use the placeholder image or AI illustrations (17 AI illustrations, 106 placeholders); real photographs needed before publishing each. | Owner | Per product |
| 3 | Reference rates (basis A, E, P) are not market-checked; chilgoza needs a decision (see reference check). | Owner | Per product |
| 4 | Backend phase B1 (category, collection and occasion validated against the taxonomy on save) is not implemented; `murabba-jaat` and the new sub-collections must also be added to the Firestore taxonomy document if one has been saved. | Coding agent | Yes |
| 5 | Celebration designs: 0 of 57 images generated, so every design page shows a concept placeholder and stays `noindex`. | Owner (images) | No (pages are gated) |
| 6 | Arabic copy everywhere needs native review. | Owner | No |
| 7 | Claims: sidr honey, mamra almonds, salab misri and traditional herbs are `claimsVerification: unverified`. | Owner | Before publishing those items |
| 8 | Hosted CI and a merge into the launch line: this branch has no pull request. `launch` and `main` are both at `5e63490` (22 Oct). | Coding agent | Yes |
| 9 | Redeem catalogue design, agent rules and skills (owner points 1, 3 and 4 of 12 Nov) are not written yet. | Claude | No |
| 10 | Parked by decision: pulses and other items, written down in [the next-batch roadmap](ROADMAP_NEXT_BATCH.md). Saffron and ginseng were added on 14 November. Anbar and mushk/kastoori are deliberately not listed (legal and authenticity reasons, see [bundles document](CATALOG_BUNDLES_PREMIUM_2026-11-14.md)). | Owner | No |
| 11 | 41 batch-3 drafts: publish component drafts first, re-price bundles after component rates change, and get shilajit and saffron supplier papers before publishing those. | Owner | Per product |

## Originality

Product names are common trade names. All descriptions, usage notes and stories were written for AllBarka; no text or image was copied from akbarionline.pk or any other shop. Akbari was used only for coverage and indicative prices, recorded in the reference check.
