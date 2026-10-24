# Boutique interaction refinement

Owner authorization: 24 October 2026 (Asia/Karachi). Seven supplied screenshots inform interaction principles, not replacement artwork. Direction: balanced luxury across the customer journey, emerald/ivory/gold, mobile first. Extend the verified Stage 5 feature-branch checkpoint `9afaca79459f3cf5da888a53a38344901b97dc78`; do not replace previous work or mark live gates complete.

| Pass | Behavior and acceptance gate | Status |
| --- | --- | --- |
| P0 — Continuation contract | Consolidated instructions, original feature inventory, interaction acceptance matrix, carried-forward blockers and current resume point saved for another model. | DONE |
| P1 — Feedback and shared controls | Reuse MagneticButton; consistent keyboard/press states. Cart confirmation follows an actual committed quantity increase, not a click or invented wait. Checkout loading follows its existing real request state. | TODO |
| P2 — Photos and navigation | Preview a real second gallery photo only for fine-pointer hover; explicit browsing and mobile swipe remain authoritative. Refine active navigation and bounded section reveals. Keep essential information visible without hover. | TODO |
| P3 — Regression and handoff | Browser verify pointer/touch/keyboard, real cart, failed/no-op addition, photo navigation, reduced motion, EN/UR/AR, dark/light and responsive layouts. Type/hooks/build/full suite, reviewed diff, scoped GitHub checkpoint and updated handoff. | TODO |

## Boundaries

Reuse existing gallery, product cards, menus, ToastManager, cart/provider, transitions and reveal components. No duplicate animation framework, artificial loading delay, cursor trail, scroll interception or extra homepage product grid. Keep purchase actions stable, animations finite, focus visible and touch targets at least 44px. Reduced motion removes decorative transforms while preserving state feedback. A second image preview uses the resolved saved gallery and cannot fabricate another product variant or update the selected option.

Canonical prices, quantities, MOQ, shipping, custom units, historical receipts and checkout idempotency retain their existing services. Preserve all admin/content/staff implementations and permission boundaries. No keys/environment files, production data/account writes, live n8n edits, rules publishing, launch/main merge or deployment are included.

## Carried-forward work

Expansion Stage 6 remains IN_PROGRESS with external gates BLOCKED: live Firebase/Auth/Storage and Firestore edition, actual merchant records including four flagged packaging seeds, isolated n8n compatibility and deployment-target review. Read RELEASE_PACKET.md and HANDOFF.md. This design pass does not certify those systems or alter those findings.

## Acceptance and regression matrix

| ID | Approved feature / requirement | Pass | Status / evidence required |
| --- | --- | --- | --- |
| I01 | Shared press/hover/focus treatment using existing controls; essential actions work on touch and keyboard | P1 | TODO — mounted pointer/keyboard/touch checks |
| I02 | Added acknowledgement only after the matching cart line actually increases; no-op/rejected actions cannot show success | P1 | TODO — real CartProvider success, repeat add and no-op browser cases |
| I03 | Actual request loading/disabled state and error recovery in checkout; no invented delay or premature order confirmation | P1 | TODO — preserve request/idempotency logic and run checkout regressions |
| I04 | Saved-product heart and selected portions/filters have clear finite feedback | P1 | TODO — actual aria-pressed state, focus and mobile checks |
| I05 | Fine-pointer preview uses a real second resolved gallery photo; absent/failed image keeps an honest usable cover | P2 | TODO — multi/single/error browser cases |
| I06 | Explicit photo selection, swipe, arrows, focus and full-detail/viewer links retain their behavior; hover does not overwrite browsing | P2 | TODO — actual gallery interactions |
| I07 | Primary menu current-page state, desktop underline and mobile expand/close remain clear and functional | P2 | TODO — actual menu route/keyboard/mobile checks |
| I08 | Bounded section entrances reuse existing reveal/transition components; content and scrolling stay accessible | P2 | TODO — visible content/reduced-motion/browser checks |
| I09 | 360/390px mobile, tablet and 1440px desktop; EN/UR/AR; dark/light; reduced motion; no horizontal overflow or unexpected page/console errors | P3 | TODO — browser matrix and representative screenshots |
| I10 | No extra motion dependency; restrained emerald/ivory/gold; existing photography and single product showcase retained | P3 | TODO — package/diff/source/browser review |
| I11 | Catalog/admin/staff/content work and all pricing/quantity/shipping/quote/order boundaries remain intact | P3 | TODO — original full suite plus affected browser flows |
| I12 | Typecheck, hooks lint, build/privacy audit, targeted checks, full offline suite and diff check actually pass | P3 | TODO — record exact results and any remaining advisories |
| I13 | Changes/evidence/remaining steps saved on existing GitHub branch and PR with unchanged upstream assets preserved | P3 | TODO — remote head and blob verification |
| I14 | Existing Stage 6 live Firebase/Storage/Auth/n8n/merchant-data gates and four seed findings remain explicit | All | BLOCKED externally — RELEASE_PACKET.md; not resolved by design work |

## Exact resume point at documentation checkpoint

The previous expansion code is unchanged. P0 documentation is complete; start P1 by reading `ProductCard.tsx`, `CategoryPLP.tsx`, `ProductDetailPage.tsx`, `QuickViewModal.tsx`, `CartContext.tsx`, `ToastManager.tsx` and `motion/MagneticButton.tsx`. Add one reusable feedback control only if inventory review shows it is needed. Keep actual quantity/rate resolution in the existing cart services. Then read `ProductImageGallery.tsx`, existing gallery CSS, `BubbleMenu.tsx`, `MobileMenu.tsx`, `RootLayout.tsx` and existing motion helpers for P2. Update this section at the next checkpoint so another model does not repeat completed work.
