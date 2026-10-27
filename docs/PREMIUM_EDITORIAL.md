# V3 editorial continuation — M19

27 October 2026 (Asia/Karachi). Owner/agent Codex. SELECTED / DONE locally for the bounded existing-content presentation and functional fixes; factual/photographic/live dependencies remain open. Inspected parent `9bdc7df926dcf183f00b81967757ae910fb7818a`, tree `2b8e3076afd47e01dd9e1327602b86853e8899a0` (907 blobs), PR #16 / codex/admin-catalog-foundation-20261023.

## Scope / before → after

Bounded M19 layout pass using existing story copy, journal articles and imagery. Story has its own ivory/arch opening, reading section, pantry/gifting entrances and a real journal route; the standalone story branch no longer presents the general information-page tabbed card. Other InfoPage routes and modal behavior retain their implementation. Existing legacy story paragraph/headline/quote remain source-controlled; no new sourcing/people/certification claim or original shoot. Their factual validation is still M33, not established by this design pass.

Journal overview uses an editorial masthead, restrained category/search controls, featured panel and article grid. Article pages use readable measure/line spacing, thematic text tokens, a useful section-contents navigation and real related products. Existing published Studio articles/visibility/translations still flow through contentJournal; draft/publish schema and API are unchanged. Existing article copy/authorship/dates/reference strings are retained, not newly fact-checked. Missing merchant translations retain their English fallback rather than copied-English writes.

Useful additions and fixes:
- Featured article is excluded from the grid only while the feature is actually displayed; selecting its category cannot silently omit it.
- Related products reuse ProductCard/CartAddButton/current catalog media and pricing instead of a duplicate guessed-500g quick-add with an unconditional Added timer. Active records only; existing portions, quote mode, MOQ and committed cart feedback apply.
- Sharing awaits native share/clipboard, reports copy only after success, handles cancellation/failure honestly and clears its copied timer. No tool-sent/customer messages.
- Native contents links expose real headings/anchors; search has a proper label, category buttons expose selection, and missing/empty states have localized recovery.
- Story gets canonical SEO metadata and guarded image fallback. No new app dependency, reusable component, product image, backend or settings field. Added a small verification helper that reuses the mounted fixture.

M19 is complete only for this existing-content presentation scope after verification. Authentic people/process photography, verification of legacy factual claims, additional story editing controls and richer product facts remain open under M03/M11/M23/M33. Full V3 is not certified from this layout pass.

## Self-review / failures resolved

Self-review of final source, existing Studio consumers and actual mounted pages; no independent/CodeRabbit review claimed.

| ID | Finding | Resolution / evidence |
| --- | --- | --- |
| E01 | Featured entry vanished when a category hid the featured panel / medium | Derive featured from the actual all/no-search view; category result assertion retains the first entry. |
| E02 | Duplicate journal quick-add chose a raw label/zero fallback and showed success before committed cart state / medium | Reuse ProductCard with canonical existing options/MOQ and CartAddButton acknowledgement; actual related-cart fixture. |
| E03 | Clipboard success was reported before awaiting the result / medium | Await write/share; explicit failed state; induced permission failure has no false copied state. |
| E04 | Article related-card intrinsic minimum widened mobile page / medium | minmax(0,1fr) tracks and min-width:0 items; retain the no-overflow assertion. |
| E05 | New denial mock serialization referenced tsx __name in page.evaluate / test infrastructure | Browser-side fixed string installs the denied clipboard stub; no application workaround or removed assertion. |
| E06 | Initial story CTA used a nonexistent translation key / low | Reuse hero.exploreGifts; browser assertion rejects raw keys and follows the journal route. |
| E07 | Long legacy quote word overflowed at enlarged text on360px / medium | Explicit wrapping and min-width:0 for story copy/grid children; extra-width/enlarged-text rerun PASS. Main screenshots refreshed and full suite rerun after this source change. |

Workspace exec transport briefly disconnected during the final targeted run. Runtime returned with files/logs intact; no reconstructed source replacement or new environment/key was needed. Final targeted output was inspected after recovery. Earlier failures are diagnostic, not passing evidence.

## Verification / artifacts

Final source/build fingerprint `340a8987cf91b5e6cbdd560a4a71a7485f4b93bbdc1226d6017dacaae6822889`. The build fingerprint includes verification scripts; the earlier e1391efd build preceded the extra-width helper and final quote wrapping fix.

- `npm run typecheck` and `npm run lint:hooks`: PASS, exit 0/0, zero warnings.
- `ALLBARKA_SKIP_LOCAL_ENV=true npm run build`: PASS, exit 0; 84-text-artifact privacy audit, existing bundle-size advisory.
- `premium-editorial-browser.test.tsx`: PASS, 1/1 on test-only Chromium 153.0.8010.0. Actual RootLayout, story, journal overview/article, shared ProductCard/cart, public catalog/config/content routers and memory persistence. Auth/provider boundaries isolated; external resources blocked, local Arabic/Urdu fonts supplied. No live order or catalog writes.
- Main matrix: 3 routes × 390/1440 ×EN/UR/AR ×light/dark =36 layouts; screenshots settle transitions before geometry. Search/reset, featured-category membership, contents hash, clipboard failure, committed related cart, story→journal link and unknown-article recovery pass. Additional `node scripts/verify-editorial-widths.mjs` PASS: the same mounted fixture at 360/768 adds 36 layouts, for72 route/size/language/theme combinations total. It also doubles computed editorial text sizes at 360 on all three routes and checks no horizontal page overflow. This is DOM text enlargement, not a certification of every browser zoom setting. The helper copies the existing test into a temporary .verify file, omits duplicate JPG writes, preserves all assertions and removes the file in finally. [Extra matrix](evidence/premium-editorial/layouts-extra.json).
- Final full offline runner: PASS, 710/710 tests across 76 files, zero failed/cancelled/skipped; 21 backend and 36 production checks; asset audit 97 products/115 references/111 unique files, zero missing/retired views; exit 0. Earlier710-test pass preceded the enlarged-text source fix; this final complete rerun follows it.

Before: [journal desktop](evidence/premium-editorial/before-journal-1440.jpg), [story desktop](evidence/premium-editorial/before-story-1440.jpg). After: [journal desktop](evidence/premium-editorial/after-journal-1440.jpg), [journal mobile](evidence/premium-editorial/after-journal-390.jpg), [article desktop](evidence/premium-editorial/after-journal-choosing-pack-sizes-1440.jpg), [article mobile](evidence/premium-editorial/after-journal-choosing-pack-sizes-390.jpg), [story desktop](evidence/premium-editorial/after-story-1440.jpg), [story mobile](evidence/premium-editorial/after-story-390.jpg), [main matrix](evidence/premium-editorial/layouts.json).

These are local fixture routes, not the live store. Before/after desktop uses the same 1440×1000 viewport, default published source content and existing images; dispatch time differs. Mobile after uses 390×1000. No new mobile-before capture is claimed. Baseline-only capture returns early and is not acceptance evidence; final verification omits ALLBARKA_EDITORIAL_BASELINE. Images depict existing still-life/editorial assets, not new merchant people/process photography.

## Catalog / release / continuation

Live watermark UNKNOWN / current live audit BLOCKED; no current authorized Firestore snapshot. This task changes no taxonomy assignment, stock, price or publication record. Related products now respect current public active availability. Prior audit data is historical; full fixtures do not certify live merchant classification.

Original admin Stage 6 Firebase/Auth/Storage/n8n/order/deployment gates remain. No configuration/key change, live write, published rule, workflow edit, production merge or deploy. Journal Studio draft/live controls are retained; story legacy copy is not newly admin-editable. That extension is M23, not implied by this CSS/page work.

Next independent design phase is V4 gifting, while merchant-dependent photography/fact validation remains named. Preserve all V1/V2/M15 work and the completed editorial fixes; do not restart them.

## R11 checklist

- [x] Bounded existing-content layout/functional scope locally complete; missing factual/photo/editor extensions explicitly retained.
- [x] Final source self-reviewed; E01–06 resolved/dispositioned, no unresolved critical/high finding in this diff.
- [x] Final full runner and main/extra browser gates PASS; live/field checks explicitly unrun.
- [x] Catalog fixture/live distinction recorded; current live reconciliation BLOCKED.
- [x] Canonical commerce, privacy/roles and content publication contracts reused; final full regression PASS.
- [x] Final master/handoff/test/changelog statuses updated.
- [ ] Correct branch, candidate hashes and saved remote ref readback pending; no live release.
