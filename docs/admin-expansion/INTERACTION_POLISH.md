# Boutique interaction refinement

Owner authorization: 24 October 2026 (Asia/Karachi). Seven supplied screenshots inform interaction principles, not replacement artwork. Direction: balanced luxury across the customer journey, emerald/ivory/gold, mobile first. Extend the verified Stage 5 feature-branch checkpoint `9afaca79459f3cf5da888a53a38344901b97dc78`; do not replace previous work or mark live gates complete.

| Pass | Behavior and acceptance gate | Status |
| --- | --- | --- |
| P0 — Continuation contract | Consolidated instructions, original feature inventory, interaction acceptance matrix, carried-forward blockers and current resume point saved for another model. | DONE |
| P1 — Feedback and shared controls | Shared CartAddButton follows committed cart quantity, reuses MagneticButton; real checkout loading/disabled state; bounded RTL-aware toasts and selected-state feedback. | DONE |
| P2 — Photos and navigation | Fine-pointer real second-photo preview with error fallback and explicit browsing preserved; active mobile menu/desktop underline, bounded reveals and actual responsive header fixes. | DONE |
| P3 — Regression and handoff | Type/hooks/build/privacy audit, 694 tests / 68 files, 21 backend, 36 production and assets passed; browser, screenshots and reviewed source/docs checkpoint. | DONE |

## Boundaries

Reuse existing gallery, product cards, menus, ToastManager, cart/provider, transitions and reveal components. No duplicate animation framework, artificial loading delay, cursor trail, scroll interception or extra homepage product grid. Keep purchase actions stable, animations finite, focus visible and touch targets at least 44px. Reduced motion removes decorative transforms while preserving state feedback. A second image preview uses the resolved saved gallery and cannot fabricate another product variant or update the selected option.

Canonical prices, quantities, MOQ, shipping, custom units, historical receipts and checkout idempotency retain their existing services. Preserve all admin/content/staff implementations and permission boundaries. No keys/environment files, production data/account writes, live n8n edits, rules publishing, launch/main merge or deployment are included.

## Carried-forward work

Expansion Stage 6 remains IN_PROGRESS with external gates BLOCKED: live Firebase/Auth/Storage and Firestore edition, actual merchant records including four flagged packaging seeds, isolated n8n compatibility and deployment-target review. Read RELEASE_PACKET.md and HANDOFF.md. This design pass does not certify those systems or alter those findings.

## Acceptance and regression matrix

| ID | Approved feature / requirement | Pass | Status / evidence required |
| --- | --- | --- | --- |
| I01 | Shared press/hover/focus treatment using existing controls; essential actions work on touch and keyboard | P1 | DONE — actual mounted control, keyboard anchor, disabled button and touch browser checks |
| I02 | Added acknowledgement only after the matching cart line actually increases; no-op/rejected actions cannot show success | P1 | DONE — actual CartProvider add/repeat, cap-50 no-change and no-op browser cases; canonical seed amount retained |
| I03 | Actual request loading/disabled state and error recovery in checkout; no invented delay or premature order confirmation | P1 | DONE locally — held real client quote request shows busy/disabled; 503 clears loading without order/success; existing checkout/idempotency suite passed |
| I04 | Saved-product heart and selected portions/filters have clear finite feedback | P1 | DONE — existing saved/selected state retained with finite CSS feedback; focus/touch and existing saved/filter regressions passed |
| I05 | Fine-pointer preview uses a real second resolved gallery photo; absent/failed image keeps an honest usable cover | P2 | DONE — real multi-photo hover/error fallback browser cases and existing single-image render regressions |
| I06 | Explicit photo selection, swipe, arrows, focus and full-detail/viewer links retain their behavior; hover does not overwrite browsing | P2 | DONE — mouse/keyboard arrows, stable link, explicit selection disables preview, native touch scrolling and reduced motion checked |
| I07 | Primary menu current-page state, desktop underline and mobile expand/close remain clear and functional | P2 | DONE — actual desktop current state and keyboard Escape/focus; mobile current state/open/close checked |
| I08 | Bounded section entrances reuse existing reveal/transition components; content and scrolling stay accessible | P2 | DONE — existing page/reveal components reused; stagger delay capped; reduced-motion and original homepage browser regressions pass |
| I09 | 360/390px mobile, tablet and 1440px desktop; EN/UR/AR; dark/light; reduced motion; no horizontal overflow or unexpected page/console errors | P3 | DONE locally — 24 size/language/theme combinations × actual PDP/cart (48 layouts), keyboard/touch/reduced-motion checks; four JPGs |
| I10 | No extra motion dependency; restrained emerald/ivory/gold; existing photography and single product showcase retained | P3 | DONE — package/lock and photos unchanged; existing palette/single showcase preserved; reviewed diff and browser |
| I11 | Catalog/admin/staff/content work and all pricing/quantity/shipping/quote/order boundaries remain intact | P3 | DONE locally — complete original regression suite plus new actual cart/menu/gallery/checkout fixture; no service/role mutation logic changed |
| I12 | Typecheck, hooks lint, build/privacy audit, targeted checks, full offline suite and diff check actually pass | P3 | DONE — 694/694, 21/21 backend, 36/36 production, assets; type/hooks/build/privacy audit; existing bundle advisory remains |
| I13 | Changes/evidence/remaining steps saved on existing GitHub branch and PR with unchanged upstream assets preserved | P3 | DONE at saved checkpoint — existing draft PR #16; source/evidence hashes verified against remote after save |
| I14 | Existing Stage 6 live Firebase/Storage/Auth/n8n/merchant-data gates and four seed findings remain explicit | All | BLOCKED externally — RELEASE_PACKET.md; not resolved by design work |

## Implemented source and exact next step

- `CartAddButton.tsx` observes the existing cart state and acknowledges only a matching committed quantity increase. It is shared by ProductCard, CategoryPLP and ProductDetailPage. No artificial network wait. Existing quick view retains its immediate close/toast flow; it was not replaced by another dialog.
- `motion/MagneticButton.tsx` now preserves explicit styles in coarse-pointer/reduced-motion mode, forwards anchor/div clicks and supports native disabled buttons. Existing mouse magnetism is reused.
- `ProductImageGallery.tsx` previews only an actual resolved second photo for mouse/fine-pointer hover. Manual arrows, focus and touch browsing cancel the preview; a failed second image leaves the cover usable. No media/variant data is rewritten.
- `interaction-polish.css`, BubbleMenu, MobileMenu and RootLayout add restrained press/focus/active/underline treatment, current mobile navigation and two real header overflow fixes. At 360px the brand fits beside four 44px utilities; below 360px the dedicated search icon yields to the existing menu search. At 1280px+ navigation occupies a centered second row so brand/utilities do not overflow.
- ToastManager bounds visible notifications to three, respects RTL and reduced motion, and clears timers on unmount. ScrollReveal caps stagger delay at 240ms. Checkout adds busy semantics/spinner only from its existing quote/submission state; no quote/order logic changed. New motion is finite except the indicator for a genuinely pending request.

P0 documentation was saved first at `dbf2b6c37a57b433ac7641d31d295547f30483ea`; subsequent verified source extends that parent on the same PR. Latest checks are in TESTING_RELEASE.md. Four `evidence/polish-*.jpg` screenshots show the actual mounted header/PDP layout with isolated data, not a live deployment. External fonts/providers are stubbed in browser checks; Amiri was supplied by the test host for readable RTL screenshots.

**Next:** continue the original expansion Stage 6 external integration/merchant-data gates in RELEASE_PACKET.md when a permitted test environment is available. The four packaging-seed label findings remain explicit and unmodified. Do not repeat completed polish, overwrite owner prices, mark live checks passed or merge/deploy based only on fixture success. A future change should get its own acceptance row, regression evidence and updated handoff.
