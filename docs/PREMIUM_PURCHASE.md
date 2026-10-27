# M18 — cart and checkout continuity

27 October 2026 (Asia/Karachi). Codex. SELECTED / DONE locally for the bounded purchase pass; remote save recorded below. Inspected parent `c46735d3ad1007444904c26db9b2c2f43a3e7e74`, tree `6dc26fd67773fbe5d31ba7642f994010bdd9fa76` (928 blobs). Existing branch `codex/admin-catalog-foundation-20261023`, draft [PR16](https://github.com/Taha7869/AllBarka-34/pull/16). Retail + gifting balanced; existing assets first.

## Scope and result

Bounded M18 purchase presentation and continuity; related typography/mobile/empty/error work accompanies those surfaces. Existing CartPage, CartDrawer and CheckoutPage remain the real routes/components. Cart uses an editorial heading, contained product photos, full names/options, selected quantities, readable line totals and an estimated-total panel. Existing destination selection, CartTools/share/save/download controls, WhatsApp action and trust component remain. Existing trust copy is retained, not newly factual-audited. Empty bag has localized recovery.

The drawer retains quantity/removal, payment preference, delivery selection, recommendations, full-cart tools and checkout/WhatsApp actions. Secondary controls/free-shipping progress now scroll with the items; the fixed footer contains totals and purchase actions. Names/options wrap. Controls are44px; number input is also44px wide. Drawer restores the actual opener across language/theme updates and traps keyboard focus. Existing scroll lock remains; reduced-motion removes the new drawer slide. Recommendations use current eligible positive enabled portions and the shared committed-state CartAddButton; no invented savings claim.

New CartItemPersonalization is the one justified reusable component: the inventory had no equivalent read-only saved-hamper view, and cart/drawer/checkout need identical contents/recipient/message display. It reads the existing configuration, current names and existing200g portion definition. Bounded defensive rendering does not rewrite the cart/configuration. Native disclosures, dir-auto message text and preserved newlines work across languages. Existing generated box art is labeled as presentation reference. No font/style/printing promise, physical arrangement proof or new backend field.

Checkout has an emerald heading, readable steps/controls and an order overview. On desktop the selection sits alongside the form; on mobile the total remains visible and the item/cost detail can be opened, reducing initial scrolling. Reading order puts the overview before the form; desktop grid places them alongside. Disclosure state changes at the existing1024px breakpoint and otherwise follows the customer's toggle. Current quote/estimated state is explicit. Both normal checkout item summaries now display current quoted line prices through the existing guarded acceptedCheckoutReceipt adapter, alongside the current quote totals. The original global catalog registry already refreshes; this fix handles a specifically older bag snapshot vs a fresh quote.

Server rate/shipping/promo/MOQ/preparation policy, request payloads, payment preference, storage keys, quote invalidation and order attempts remain. The entire order-submission handler and both explicit WhatsApp handlers were compared with the remote parent and match exactly. Success still requires the existing durable receipt; no new fake acceptance path. No application dependency, raster asset, admin role, merchant record, backend schema or server.ts change.

Affected runtime: `src/pages/CartPage.tsx`, `CheckoutPage.tsx`, `src/components/CartDrawer.tsx`, new `CartItemPersonalization.tsx`, `src/contexts/shoppingQualityTranslations.ts`, new `src/styles/purchase.css`, `src/main.tsx`. New mounted test `tests/premium-purchase-browser.test.tsx`. Linked master/instructions/design/changelog/inventory/catalog/release/handoff records and nine evidence files are updated. Existing unrelated local snapshot differences and runtime node_modules are excluded from the remote checkpoint.

## Self-review and fixes

Codex self-review of final source/diff, shared catalog/cart/quote/receipt consumers, actual mounted screenshots and regressions. No independent/CodeRabbit review claimed.

| ID | Finding | Fix / evidence |
| --- | --- | --- |
| P01 | Medium:40px cart controls, clipped names and English-only labels across purchase UI | Localized labels,44px controls, readable options/names and scoped responsive styling. Browser normal/enlarged matrices and quantity/remove/empty journeys. |
| P02 | Medium: fresh canonical quote totals could appear beside older cart line prices in both checkout item summaries | Retain quoted items with their existing quote key; adapt display through acceptedCheckoutReceipt only while that quote is current. Fixture holds an older public catalog while the actual quote service reads a newer memory-catalog rate. Both summaries show2700 for two pista packs, not the older2500; hamper4620 and total7320. Server calculations/payloads unchanged. |
| P03 | Medium: saved hamper contents, recipient and message were absent from purchase review | Shared guarded read-only disclosure on all three surfaces; actual CartProvider add/reload and failed-order payload contain Ayesha and the bilingual message. Reference-art caption retained. |
| P04 | Medium: secondary drawer footer controls consumed short screens; context-dependent callback could lose opener | Move secondary controls into scrolling body; stable current-close ref, focus trap/restoration and reduced-motion slide.844×390 keeps a usable item area and reachable action; all language/theme changes preserve opener. |
| P05 | Medium: recommended raw first portions could be unavailable/inquiry, and missing images had inconsistent recovery | Filter published/active/priced enabled portions, reuse CartAddButton, guarded cart/checkout photo fallback and existing SafeCartImage. Existing gallery/cart regressions retained. |
| P06 | UX: mobile expanded order review pushed the form too far down | Compact closed overview with visible total; native disclosure opens actual items/full breakdown. Final captures use the closed mobile state, desktop expanded. Final source fingerprint and rerun follow this adjustment. |
| P07 | Implementation/test diagnostics | An initial CartPage replacement split inside the WhatsApp handler; restored the complete original handler and verified exact equality. A browser check initially inspected innerText inside a closed disclosure; it now opens the real control before inspecting prices. The test uses the existing exact Check total again label. No pricing/failure assertion removed. Initial errors are not final evidence. |
| P08 | Medium: server-render environment can expose window without matchMedia; first full run712/713 stopped on that guard | Guard the browser API in initialization/effect and retain the legacy root class/attribute ordering expected by existing SSR checks. Original shopping-quality assertions unchanged;4/4 focused SSR tests PASS. Final full/affected rerun after this fix PASS. |

No unresolved critical/high finding in the reviewed bounded changes.

## Verification

Final runtime source/build fingerprint `dd84bc1eef43282eac53f871a9f3171d9d1e0e35d2433f937ab63c56bf221cb4`. Node24.22.1; existing lockfile/dependencies. Test-only Chromium153.0.8010.0.

- `npm run typecheck`, `npm run lint:hooks`: PASS exit0/0; no source warnings. Existing npm environment advisory retained.
- `ALLBARKA_SKIP_LOCAL_ENV=true npm run build`: PASS exit0;84-text-artifact privacy audit, existing bundle-size advisory.
- Affected run: PASS53/53 on the final fingerprint (earlier49/49 preceded the SSR compatibility fix), zero failed/cancelled/skipped, exit0: `node --import tsx --test --test-isolation=none tests/premium-purchase-browser.test.tsx tests/cart-shipping.test.tsx tests/checkout-reliability.test.ts tests/shopping-quality.test.tsx` with `ALLBARKA_SKIP_LOCAL_ENV=true`, `ALLBARKA_TEST_BROWSER=/workspace/scratch/2298f1388db7/browser-runtime153/chromium`; capture flag only for saved evidence.
- Final full offline runner: PASS713/713 tests across78 files,21 backend and36 production checks; zero failed/cancelled/skipped; exit0. Assets97 products/115 references/111 unique files, zero missing/retired views. This final complete run follows P08 on the final fingerprint. Exact command: `ALLBARKA_SKIP_LOCAL_ENV=true ALLBARKA_TEST_BROWSER=/workspace/scratch/2298f1388db7/browser-runtime153/chromium node scripts/run-all-tests.mjs`. Earlier runs preceded the final compact overview or SSR compatibility fix and are historical. One full run was deliberately stopped before that last source adjustment; it is not final acceptance evidence.

Mounted fixture uses actual RootLayout, catalog/config/content routers, CartProvider, drawer and CheckoutPage. Auth isolated, memory persistence only, external resources blocked and local Urdu/Arabic fonts supplied. It calls the real quoteOrderForCustomer/loadAuthoritativeCatalog/validation path. The fixture explicitly registers test box records; it never auto-seeds production. A controlled newer memory-catalog price with a cached public snapshot reproduces stale bag vs current quote. A503 order endpoint intentionally records/rejects the request; it certifies failure preservation, not accepted provider execution.

Main matrix: cart, drawer, checkout details/shipping/review ×360/390/768/1440 ×EN/UR/AR ×light/dark =120 normal layouts. Mobile height844, others1000. Cart and review doubled-text checks across six language/theme pairs add12 rows, yielding132 saved matrix rows. Drawer doubled-text checks across the same six pairs are asserted separately, plus844×390 short landscape. DOM computed text/input enlargement is not certification of every browser zoom setting. Keyboard focus/opener, actual quantities, Lahore/national tariff selection, bank preference, quote hold/fail/retry, rejected-order cart/message and recipient-draft reload are exercised. Existing checkout-reliability tests retain accepted receipt/retry/idempotency coverage. The browser makes no live order.

Before desktop1440×1000: [cart](evidence/premium-purchase/before-cart-1440.jpg), [drawer](evidence/premium-purchase/before-drawer-1440.jpg), [checkout](evidence/premium-purchase/before-checkout-1440.jpg). After: [cart desktop](evidence/premium-purchase/after-cart-1440.jpg), [cart mobile](evidence/premium-purchase/after-cart-390.jpg), [drawer desktop](evidence/premium-purchase/after-drawer-1440.jpg), [checkout desktop](evidence/premium-purchase/after-checkout-1440.jpg), [checkout mobile](evidence/premium-purchase/after-checkout-390.jpg), [matrix](evidence/premium-purchase/layouts.json).

Same existing media and explicit test box setup; dispatch time differs. Cart/drawer rates match before/after. After checkout intentionally uses the newer quote rate for P02 while baseline uses the original rate; that image supports layout comparison, not a claim that design changed merchant prices. No mobile-before image. After JPGs precede the final SSR guard/root attribute-order compatibility adjustment; the browser layout is unchanged, and the full mounted geometry/journey reruns on the final fingerprint. Baseline-only mode returns early; final acceptance omits ALLBARKA_PURCHASE_BASELINE. Screenshots are local fixtures, not the deployed store. Current source-owned UI copy/layout is not newly merchant-admin editable; broader M23 remains pending.

## Catalog, live gates and next action

Current Firestore/taxonomy watermark UNKNOWN; current semantic reconciliation BLOCKED. No complete current authorized merchant snapshot, live count or all-products-matched claim. Existing product IDs/categories/occasions/prices/statuses are not written. Fixture/source evidence does not certify live assignments. Original Stage6 Auth/Storage/n8n/accepted-order/preview/rollback gates remain.

27 October provider-access discovery confirmed Firebase plugin installed, but no Firebase CLI/authenticated live read tool or Firebase Admin credential flags in this workspace. Railway integration is available and not connected; setup requested through the app flow. No n8n match was returned in this scoped directory search; the search is not exhaustive. Connection suggestion is not a successful connection. Recheck confirmed connection/tool availability on continuation and do not repeat a stale blocker after access is supplied. No secret values were inspected/printed or keys changed.

Next executable action: V6 integration readiness with the authorized Railway project/environment and current read-only merchant catalog/taxonomy snapshot. Verify actual deployed/preview source revision and receiver-before-sender n8n dependency before release decisions. Do not merge/deploy, seed/reset records, replay historical events or change roles/workflows/rules to force a green check. Existing original photography/printing/factual-content dependencies and optional signature proposals keep their statuses. M18 bounded purchase UI is independently deliverable once the local gates and remote save below complete.

## R11 checklist

- [x] Bounded scope complete under final gates; merchant/provider-dependent scope explicitly separate.
- [x] Final source self-reviewed; P01–P08 resolved/dispositioned, original submission/WhatsApp handlers exactly preserved.
- [x] Final full/affected/browser gates evidenced; external checks named.
- [x] Catalog fixture/live separation recorded; current live semantic audit BLOCKED.
- [x] Commerce/privacy/roles/localization contracts reused; no new pricing policy or backend schema.
- [x] Master/handoff/test/changelog statuses updated at final checkpoint.
- [ ] Verified remote parent/tree, intended paths/blob hashes and saved commit/ref; draft PR only.
