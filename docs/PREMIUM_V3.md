# Premium V3 — product-detail art direction

27 October 2026 (Asia/Karachi). Owner/agent Codex. SELECTED / DONE for bounded M15 local acceptance. Broader V3 work and live gates remain open. Branch `codex/admin-catalog-foundation-20261023`, PR #16. Inspected parent `136310a35af988fb337daac96435e2bdedd977e7`, tree `0626f97e2debd3e75a8dab388e7343e953d65213` (897 blobs). Owner asked to move carefully to the next part and add useful improvements.

## Scope and before → after

Bounded M15 plus related M04/M21 and a useful selection-summary addition. The existing product page now uses an uncropped contain image in a clean frame and a distinct editorial purchase surface, with lighter heading weight, intentional spacing, readable RTL headings and themed fallback. Existing photo viewer, thumbnails/video, portions, custom measurements, packaging MOQ, canonical price resolver, cart acknowledgement, save/share and related routes are reused. No new component, dependency, backend schema or product image.

The selection summary uses existing selectedWeight, quantity and displayProductPrice to show the chosen portion, quantity and selection total, with a polite live total. It does not create a second quote or include shipping/coupon charges. Invalid custom choices no longer show the unconditional in-stock label. Portion buttons expose their selected state.

Packaging gets a localized packaging/gifting heading and opens packaging details first. Food-only taste notes and the food guarantee block are omitted on packaging; existing care/allergen sections remain accessible. Generic single-origin/hand-sorted text and the unconditional custom-ribbon claim were replaced with neutral localized headings/reference copy. Existing merchant descriptions, facts, historic option labels and rates are preserved; published missing translations retain the existing English fallback. This does not certify those facts or complete M11/M33.

Additional improvements: translated unavailable-product recovery with real Shop/Home actions and themed text; translated packaging headings/actions; related products choose a positive enabled option and show inquiry when no price is available, rather than an undefined price. Delivery/product-detail links route to existing policy/details surfaces. Related card names may wrap instead of being forced to one line.

M19 complete story/journal art direction, richer facts/passport, authentic photography and full M23 Studio extensions remain pending. This is the product-detail slice of V3, not completion of every V3 proposal.

## Review

Self-review of final source, shared consumers, browser journeys and seven screenshots. No independent/CodeRabbit review claimed.

| ID | Finding / severity | Resolution |
| --- | --- | --- |
| V3-01 | Product image used cover/hover scaling and dense rounded controls / design | Contain main photography, flat frame, clearer purchase surface and restrained headings; existing viewer remains available. |
| V3-02 | Selected pack/quantity/total required scanning separate controls / usability | New read-only summary reuses existing calculated state and announces total changes; actual cart check proves 500g × 2 / Rs.5,000. |
| V3-03 | Generic food/sourcing headings and freshness cues appeared on packaging / content | Neutral type-specific headings, packaging default accordion, no food taste/guarantee on packaging. Existing safety details retained. |
| V3-04 | Missing-product recovery and packaging headings were English-only; some hard surfaces lacked dark parity / accessibility | New translated labels/recovery and scoped token overrides; 24 food layouts, Urdu/dark packaging and failed-media touch checks. |
| V3-05 | Related price used the first raw key, including disabled/unpriced entries / correctness | First positive enabled label only; inquiry fallback for no available fixed price. Canonical server authority unchanged. |
| V3-06 | New recovery test matched both header Shop and recovery Shop / test fixture | Scope to actual pdp-empty recovery control; original intended navigation assertion retained. Final targeted run passed. |

No unresolved critical/high finding in this bounded diff. Existing merchant data provenance and translation gaps are not silently replaced with invented content.

## Verification and evidence

Runtime source hash `9f695ab8199dcada2367bf74a7697a2b7feec5990b91b45f6290cc274e3fbc8c`.

- Typecheck / hooks lint: PASS, exit 0 / 0; no hooks warnings.
- `ALLBARKA_SKIP_LOCAL_ENV=true npm run build`: PASS, exit 0; 84-text-artifact privacy audit; existing bundle-size advisory.
- `premium-detail-browser.test.tsx`: PASS 1/1, using isolated real RootLayout/Home/Shop/PDP/cart/providers and memory catalog/content/config routers. Chromium 153.0.8010.0 is test-only outside the repo; external providers blocked, local Arabic/Urdu fonts supplied. Browser commands use ALLBARKA_TEST_BROWSER; evidence run adds ALLBARKA_CAPTURE_EVIDENCE=true.
- 24 food layouts: 360/390/768/1440 × EN/UR/AR × light/dark; correct direction, no page/summary horizontal overflow. Selected 500g × 2 matches Rs.5,000 and the exact cart line. Photo viewer opens and Escape closes. Packaging fixture `bid-box-umrah-tabarruk` has no food taste block; desktop light and mobile Urdu/dark captured, mobile overflow checked. Missing-product Shop recovery works. Cold image failure on a mobile/touch context preserves 500g selection and no horizontal overflow. Broader existing custom-unit/MOQ/inquiry, enlarged text, gallery and commerce regressions remain in the full runner.
- Full offline runner: PASS, 709/709 across 75 test files, zero failed/cancelled/skipped; 21 backend and 36 production checks. Asset audit: 97 fixture products / 115 references / 111 unique files, zero missing/retired views. Runner completed with exit 0.

Before: [desktop](evidence/premium-v3/before-1440.jpg), [mobile](evidence/premium-v3/before-390.jpg). After: [desktop](evidence/premium-v3/after-1440.jpg), [mobile](evidence/premium-v3/after-390.jpg), [Urdu dark](evidence/premium-v3/after-390-ur-dark.jpg), [packaging desktop](evidence/premium-v3/packaging-1440.jpg), [packaging Urdu dark](evidence/premium-v3/packaging-390-ur-dark.jpg), [matrix](evidence/premium-v3/layouts.json).

Before/after are actual mounted routes at equal 1440/390 ×1100 viewport sizes, using the same existing fixture media and fallback-font conditions. Before demonstrates default 250g ×1; after demonstrates 500g ×2 to show the new summary. The dispatch clock/date differs. These are not a price-change comparison or live merchant screenshots. The baseline-only capture branch returned early and is not acceptance evidence; final targeted/full verification omits ALLBARKA_PDP_BASELINE. No generated art is passed off as a new original product shoot or proof of exact delivered contents.

## Catalog / release / next

Available tool discovery found no current authorized Firestore query/read path; no new merchant snapshot/export. Live watermark UNKNOWN; live R04 audit BLOCKED. No product/category assignment, price/stock/status, keys/config, workflow or live provider writes. Original admin Stage 6 Firebase/Auth/Storage/n8n/order/deployment gates remain BLOCKED. No merge/deploy.

After this scoped checkpoint, continue remaining V3 story/journal layout work (M19), preserving actual published content and honest asset provenance. Product facts/scale/printing options require merchant information only when that dependent work is selected. Do not repeat already-answered retail/gifting balance or existing-assets preference.

## R11 delivery checklist

- [x] Stated M15 local acceptance complete; broader V3 items remain pending.
- [x] Final diff self-reviewed, V3-01–06 dispositioned; no unresolved critical/high finding in this scope.
- [x] Full local gates PASS; targeted browser/build/type/hooks passed; live/field gates explicitly unrun.
- [x] Catalog fixture/live scope recorded; live classification audit BLOCKED, no reclassification.
- [x] Commerce/privacy/roles/localization preserved by reuse and scoped regression checks; final full runner PASS.
- [x] Master, handoff, test record and changelog final statuses updated.
- [ ] Remote checkpoint tree/hash/ref verification pending; draft PR #16, no production release.
