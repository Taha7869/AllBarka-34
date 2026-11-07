# V4 gifting — bounded landing, builder and message pass

27 October 2026 (Asia/Karachi). Owner/agent Codex. SELECTED / DONE locally for the bounded landing/builder/message scope. Broader V4 remains IN_PROGRESS. Inspected parent `ef711ebd00b3dd286c6ef47f9f9beb962c5bb2b2`, tree `e47278cc4dbbbba719bb873d011e0a7ad9daa823` (920 blobs). Branch `codex/admin-catalog-foundation-20261023`, draft [PR #16](https://github.com/Taha7869/AllBarka-34/pull/16). Existing assets first; retail + gifting balanced.

## Acceptance and scope

Bounded M16 dedicated gifting entrance and occasion/starting-pack budget discovery; M08 selected box/contents/quantity/current-catalog summary; M09 preview of the existing recipient/message fields; M18 saved-hamper message/configuration and current-catalog repricing continuity. No new card-style, printing, recipient-recommendation, corporate-kit or backend schema. Full V4 remains IN_PROGRESS: accurate actual filled-box photography, merchant-supported printing/styles, complete order/packing handoff and broader cart/checkout art direction remain open.

Before → after:

- Existing `/gifting` uses an emerald two-column opening with the current emerald coffer asset, clear builder/browse hierarchy and quieter inquiry section. Mobile puts the reference photo beside a compact title so the product and main action appear early. EN360px checks both within the844px initial viewport; enlarged/RTL text may need normal scrolling.
- Reuses ProductCard, ProductImageGallery and CartAddButton instead of a duplicate card implementation with a media-cover function treated as a map, raw/disabled default portions and an unconditional Added timer. Current enabled portions, exact visible prices, actual cart acknowledgement, media overrides and packaging MOQ apply.
- Occasion and starting-pack budget filters preserve existing URL parameters. The budget uses the shared card's first enabled positive fixed-portion price, not a complete order/MOQ budget or guaranteed price for all portions. Inquiry-only entries appear with no budget filter; the note explains this. Original gift membership and occasion matching are retained; no taxonomy or product assignment is rewritten.
- Existing builder has a persistent selected-box/contents sidebar, current thumbnails,200g portions, net contents weight and packaging/contents/total breakdown. Box images are presentation references, not a physical arrangement proof. No true3D, layered physical simulation or new raster image.
- Recipient/message preview updates while typing, preserves newlines and supports EN/UR/AR with existing fonts and dir-auto content. Existing100/500-character limits/schema are retained. Explicit text says to confirm printing/card options; the preview is not a merchant printing promise.
- Builder and CartContext now pass their current CatalogProvider snapshot explicitly to the existing shared resolver, avoiding reliance on mutable global registry side effects. The original CatalogContext already refreshes the imported PRODUCTS registry; this is not a claim that all original live totals were necessarily stale.
- Unavailable/inquiry/unpublished/disabled250g fillings are ineligible for the existing200g conversion. The shared formula remains rounded250g rate ×200/250, with existing box prices. No server.ts pricing algorithm, shipping, coupon or merchant rate changed. Invalid custom-hamper adds are rejected; missing/inactive box records never become a free box or auto-seed.
- An unavailable preselection has an explicit removal action; customer can recover rather than remain stuck below validity. Box choices display unavailability instead of Rs0, and the landing builder launcher is disabled when no current packaging is available. Saved unavailable lines remain for existing review/quote validation rather than being silently deleted.
- Escape/focus restoration survives language/theme context updates: stable effect lifecycle plus current close callback. Close/reopen retains existing selection/message state. This is not a new remote saved-draft service.

Affected runtime paths: `src/components/GiftsHampersDestination.tsx`, `CustomHamperBuilderModal.tsx`, `ProductCard.tsx`, `src/contexts/CartContext.tsx`, `shoppingQualityTranslations.ts`, `src/lib/hamperCatalog.ts`, `src/styles/editorial.css`. Tests: new `tests/premium-gifting-browser.test.tsx`, existing `hamper-catalog.test.tsx` and `stage5b-destinations.test.tsx`. Linked master/instructions/handoff/changelog/inventory/catalog/release records and six evidence files are updated; unrelated snapshot differences are excluded from the remote checkpoint.

## Final self-review and findings

Codex self-review of changed source, shared card/catalog/cart contracts, regression output and mounted screenshots; no independent/CodeRabbit review claimed.

| ID | Severity / reproduction | Resolution and verification |
| --- | --- | --- |
| G01 | Medium: duplicate gift cards ignored current gallery helper contract and showed Added via a timer | Reuse shared ProductCard/CartAddButton; full existing card/media/cart regressions plus actual gifting route. |
| G02 | Medium: current provider totals depended implicitly on globally mutated PRODUCTS defaults | Pass provider snapshot explicitly in builder, initial saved-cart resolution and add. Fixture changes pista250g to1750; builder/cart/reload total4940. Existing sync already used current products. |
| G03 | Medium: missing/inactive fixture box records exposed a contents-only total | Do not auto-seed production; separate current packaging availability, show unavailable/dash and disable launcher/choices. Test fixture explicitly registers authorized test box records. |
| G04 | Medium: context updates recreated focus effect and lost the original opener | Keep latest callback in a ref, effect keyed to isOpen; Escape restores launcher after all language/theme changes. |
| G05 | Medium: mobile title pushed reference photo below the opening | Compact mobile title/photo composition; initial EN360 viewport photo/action assertions and refreshed390 screenshot. |
| G06 | Medium: an unavailable initial filling disappeared from candidate controls but stayed selected | Localized explicit removal control in step2; mounted unlisted-product fixture removes it successfully before normal cart journey. |
| G07 | Test infrastructure: first baseline button name was incomplete; later add-close assertion matched the automatically opened cart dialog | Correct original label regex and scope the builder dialog by its class; no application assertion removed. A later missing-price mock supplied an invalid zero rate rejected by the public adapter; corrected to an actual unlisted product response. Diagnostic runs are not final evidence. |
| G08 | Test expectation: full run710/712 had two failures because historical destination regressions asserted the replaced heading/builder title | Assert exact new H1 and builder launch text, retain corporate/other-route checks, add selected Nikkah & Wedding state and mounted occasion/budget tracking-parameter preservation; final full rerun PASS after correction. An intermediate run used the abbreviated Wedding label; the exact existing Nikkah & Wedding translation is retained in the corrected assertion. |
| G09 | Medium: doubled text at360px made the shared card price/Quick View row extend beyond the page | Allow that row to wrap; do not hide/clip content. EN/UR/AR ×both themes doubled-text landing checks and image-fallback verification pass in the isolated diagnostic fixture; the same checks now run in the persistent gifting browser test. Final full suite rerun after this source fix PASS. |

No unresolved critical/high finding in the reviewed bounded diff. Existing R04 live audit and Stage6 external blockers remain explicit.

## Verification

Final runtime source/build fingerprint `39fe0290ec4f3651bf16fc0ca458266d5eb5bf8a1f42809200d54a219027f95f`.

- `npm run typecheck` and `npm run lint:hooks`: PASS exit0/0. Existing npm environment advisory only; no hooks warnings.
- `ALLBARKA_SKIP_LOCAL_ENV=true npm run build`: PASS exit0;84-text-artifact privacy audit, existing bundle-size advisory.
- Affected tests: PASS,19/19 (`premium-gifting-browser.test.tsx`, `hamper-catalog.test.tsx`, `stage5b-destinations.test.tsx`), zero failed/cancelled/skipped; exit0. Capture browser journey also passed after adding URL-state checks. Earlier invalid-zero mock was rejected by the real adapter; G08 exact occasion-label correction is included in final19/19.
- Final full offline runner: PASS,712/712 tests across77 files, zero failed/cancelled/skipped;21 backend and36 production checks; assets97 products/115 references/111 unique files, zero missing/retired views; exit0. Command: `ALLBARKA_SKIP_LOCAL_ENV=true ALLBARKA_TEST_BROWSER=/workspace/scratch/2298f1388db7/browser-runtime153/chromium node scripts/run-all-tests.mjs`. This final complete run follows G09 on the fingerprint above. An earlier full run was interrupted before the initial source fixes; a710/712 run found obsolete heading expectations in G08; the following712/712 main-suite run preceded the enlarged-text card-row fix G09. These are historical checks, not acceptance for the final fingerprint.

Browser uses actual RootLayout/ShopPage/gift destination/builder, shared providers/cart and public catalog/config/content routers with isolated memory persistence. Auth/provider boundaries isolated, external resources blocked, local Urdu/Arabic fonts supplied. Test-only Chromium153.0.8010.0. No live database or accepted-order action.

Main matrix: landing360/390/768/1440 ×EN/UR/AR ×light/dark =24; builder360/768/1440 ×languages/themes =18, total42. Mobile height844px, tablet/desktop1000px. Extra builder844×390 landscape checks usable scroll area and reachable footer action. Doubled computed landing text at360 on all six language/theme pairs and builder text/input size at360 check no horizontal page/dialog overflow and usable scrolling; this is DOM enlargement, not certification of every browser zoom setting. Reduced motion enabled; minimum44px touched controls and keyboard Escape/opener verified. Capacity, URL filters, unlisted-product selection recovery, current price, actual cart message/configuration, reload and all-packaging-unavailable state exercised.

Before: [gifting desktop](evidence/premium-gifting/before-gifting-1440.jpg), [builder desktop](evidence/premium-gifting/before-builder-1440.jpg). After: [gifting desktop](evidence/premium-gifting/after-gifting-1440.jpg), [gifting mobile](evidence/premium-gifting/after-gifting-390.jpg), [builder desktop](evidence/premium-gifting/after-builder-1440.jpg), [matrix](evidence/premium-gifting/layouts.json).

Local fixtures, not deployed store. Desktop viewport1440×1000 and existing media match; dispatch time differs. Baseline was captured before explicit test box records were supplied, so packaging availability differs. It supports a layout comparison, not a matched price/availability comparison. No mobile-before image claimed. Baseline-only mode returns early; final acceptance omits ALLBARKA_GIFT_BASELINE. Existing generated box art remains reference imagery rather than verified merchant photographs.

## Catalog, admin and release boundary

Live catalog/taxonomy watermark UNKNOWN; current live semantic audit BLOCKED, no authorized current Firestore snapshot/read tool. No current live count or “all products matched” claim. Existing category/occasion membership is preserved in source; fixture discovery and full regressions are local evidence only. No product record, assignment, rate, stock, publication state, key/configuration, rules, role or workflow changed.

Existing item editor/product media/catalog/hamper-box pricing flows remain the data authority. New presentation text, fixed discovery thresholds and existing box-reference image definitions remain source-controlled; this pass does not introduce admin fields for them. Broader M23 editability remains pending; no new schema is claimed. Original Stage6 Auth/Storage/n8n/accepted-order/preview/rollback gates remain BLOCKED. No merge/deployment.

Next executable independent slice: broader M18 cart/checkout visual continuity using existing components and exact canonical quote/error/recovery behavior. Preserve V1/V2/M15/M19 and this pass. Merchant input is only needed before printing styles, factual content or accurate physical gift presentation is promised.

## R11 delivery checklist

- [x] Bounded scope complete under final gates; full V4 explicitly remains partial.
- [x] Final source self-reviewed, G01–G06/G09 fixed; G07/G08 are test-only corrections, no unresolved critical/high finding.
- [x] Relevant final full/affected/browser gates evidenced; external gates named.
- [x] Catalog fixture/live separation recorded, current live audit BLOCKED.
- [x] Canonical commerce/privacy/roles/localization contracts reused; existing availability validation strengthened.
- [x] Master/handoff/test/changelog statuses updated at final checkpoint.
- [x] Source/evidence checkpoint `57e2a0dc707268640e41d9032c4b68eb7a683206`, tree `625cf5ad6232dabd4dbab83f4a91272bdcc4154e`, parent `ef711ebd00b3dd286c6ef47f9f9beb962c5bb2b2`. All920 prior blobs preserved; eight added,928 total,24 intended changed/added paths and zero unexpected changes/deletions. Candidate hashes compared before expected-parent fast-forward; remote commit/ref and representative raw content read back exactly. This documentation successor records the final gates. Draft PR only; no production release.
