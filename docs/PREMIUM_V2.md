# Premium V2 — product cards and browsing

27 October 2026 (Asia/Karachi). Owner/agent: Codex. Owner requested the next phase be implemented carefully. Scope SELECTED / DONE for the stated local card/shop browsing scope. Live catalog/release gates remain BLOCKED. Branch `codex/admin-catalog-foundation-20261023`, PR #16; inspected parent `65ba53b4ea209ed309ecc29b00686cf84639b998`, tree `5e297095e9f4d011e9abe2980980b8959a431f53`.

## Delivered scope

V2-A product-card/collection continuity plus bounded V2-B shop presentation and in-session back navigation. Existing collections already use the approved arch; homepage and category cards now repeat that vocabulary with restrained square borders, consistent image framing, clearer typography, simpler quantity controls and emerald purchase actions. Product images use contain rather than cover inside the fixed frame. No new product image, component or dependency; three fixture evidence screenshots added. Shop/category masthead and existing discovery controls match the hero. Original one-showcase/merchant ordering/visibility contracts remain.

ProductCard derives selection from currently available prices when its remembered option disappears. CategoryPLP excludes explicitly disabled variants, falls back from removed remembered sizes and blocks adding an item with no selectable price. No backend total/price rule was changed. Existing gallery, cart acknowledgement, saved/compare/quick-view controls and published media remain authoritative.

Back/forward restoration retains catalogue scroll depth and loaded item count per history entry in a bounded 40-entry in-memory map. Shop and RootLayout skip their top reset on a catalogue POP; filter replacements on the same pathname do not introduce a new reset. This is current-tab SPA history, not persistence across reload/browser restart. Fresh navigation still opens at the top. Modal catalogues do not use the route position map.

## Self-review and fixes

Self-review of final source, original consumers, actual mounted journeys and three screenshots; no independent/CodeRabbit review claimed.

| ID | Finding | Resolution / evidence |
| --- | --- | --- |
| V2-01 | Rounded card stacks and crowded controls diverged from the accepted hero | Shared scoped CSS for both existing renderers; name/price/quantity hierarchy and inspected mobile/desktop images. |
| V2-02 | A retained selection could disappear after catalog refresh | Resolve the remembered option against current available labels before showing/adding it. |
| V2-03 | Category selectors included disabled variants; excluding all could expose a zero-price add | Exclude disabled labels; no-option state shows translated sold-out text and disables add. Canonical validation stays server-side. |
| V2-04 | PDP return reset category position and loaded depth | Bounded history-entry map; mounted test loads 22 cards, opens a real PDP, goes Back and checks 22 cards plus scroll position. |
| V2-05 | Adding navigation-type dependencies could reset scroll on same-path filter replacement | Previous-path guard preserves the existing same-path behavior. |
| V2-06 | Earlier category badge fixture lacked required title_ur/slug fields under typecheck | Add the missing fixture fields; no production taxonomy mutation. |

Superseded concurrent test runs were stopped and discarded. A screenshot exceeded the initial 10-second test deadline during contention; final test allows 30 seconds, with all assertions retained. Final verification uses one full runner and a separate completed evidence capture. Earlier interrupted runs are not evidence of a pass.

## Verification

Runtime source hash `b5eba516c27b16718a9a37d0c5e5a0d976d613aef949a94d69944e6d12398ff3`.

- `npm run typecheck`: PASS, exit 0 after fixture correction.
- `npm run lint:hooks`: PASS, exit 0, zero warnings after complete dependencies.
- `ALLBARKA_SKIP_LOCAL_ENV=true npm run build`: PASS, exit 0, 84-text-artifact privacy audit. Existing bundle advisory remains.
- New `premium-browsing-browser.test.tsx`: PASS, 1/1 on test-only Chromium 153.0.8010.0. Real RootLayout/HomePage/ShopPage/PDP and cart/providers, isolated memory Firestore routers and auth adapter. External resources blocked; existing local fonts supplied. No live order or catalog write.
- 24 layouts: 360/390/768/1440 × EN/UR/AR × light/dark; no page/card horizontal overflow, button/select heights at least 44px. Actual selected 500g price/add, 22-card load/Back recovery, mobile budget draft Cancel/Apply, no-results and homepage shared gallery checked. Existing full-suite tests retain broader touch, 200% text, failed media, reduced-motion and original filter/gallery/customer journeys; this new matrix itself does not assert every browser zoom mode or field performance.
- Full offline runner: PASS, 708/708 tests across 74 files, zero failed/cancelled/skipped; 21 backend and 36 production checks. Asset audit: 97 fixture products / 115 references / 111 unique files, zero missing or retired views. Runner completed successfully.

Evidence: [desktop shop](evidence/premium-v2/shop-1440.jpg), [mobile shop](evidence/premium-v2/shop-390.jpg), [homepage card](evidence/premium-v2/home-card.jpg), [24-layout matrix](evidence/premium-v2/layouts.json). Three current-source JPGs inspected. These are isolated fixture after-images; no matched new V2 before-image capture or live-store screenshot is claimed. Before behavior is established by the pinned parent source diff and historical V1 evidence.

## Catalog / boundaries / next

Live watermark UNKNOWN; no current authorized Firestore snapshot/export. Live R04 audit remains BLOCKED. Source/fixture category membership, disabled options and asset checks are local evidence only. No live reclassification, stock/price/status rewrite, key/config change, workflow edit, rules publication, merge or deployment. Original admin Stage 6 integration/release blockers remain.

Core V2 card/shop presentation and in-session back behavior are the completion target here. Full editorial collection copy/panels, Roman-Urdu search aliases, automated catalog health monitoring, original photography and new Studio fields retain their individual pending/proposed statuses. They are not certified by this checkpoint. Next design phase: V3 product detail and editorial story; use existing media and verified facts, preserve food/packaging purchase differences.

## Delivery checklist

Scope and final local verification are complete; final self-review findings above are dispositioned. Catalog live limitation and historical Stage 6 blockers are explicit; no external verification claimed. Update MASTER_PLAN, handoff, test record and changelog together, then compare all candidate blob hashes to the verified nonempty base and use expected-parent fast-forward. Read back saved commit/tree/ref before delivery. The commit containing the final version identifies the saved checkpoint.


Final R11: bounded scope complete; self-review complete with V2-01–06 resolved; local gates passed and unrun matched-before/live/field gates named; catalog source/fixture versus live scope separated; commerce/privacy/roles/localization preserved by retained regressions; master/handoff/changelog updated. Remote persistence must be read back before delivery; inspect the commit containing this record and PR #16 for its saved identity. No production release.


- [x] Stated core card/shop acceptance complete; remaining editorial/alias/monitoring proposals named.
- [x] Final diff self-reviewed; V2-01–06 fixed/dispositioned, no unresolved critical/high finding in this scope.
- [x] Local automated/browser gates passed; matched new before-images, live integrations and field metrics explicitly unrun.
- [x] Fixture/category scope recorded; current live audit BLOCKED, no live certification or reclassification.
- [x] Canonical commerce, privacy, roles, localization and existing flows retained under the full regression suite.
- [x] Master register, handoff, test record, inventory, audit note and changelog updated.
- [ ] Source/evidence remote commit/tree/ref readback pending; record exact verified save before delivery. Draft PR #16, no deployment.
