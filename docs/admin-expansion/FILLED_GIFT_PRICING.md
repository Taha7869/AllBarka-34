# Filled gifts: kilogram-based ingredient estimates

Updated: 31 October 2026 (Asia/Karachi).
Task: R04-KG1 / R04-KG1-W1. Owner decision: CONFIRMED. Implementation: IN_PROGRESS (repaired locally on isolated fixtures; live catalog data seeding pending merchant confirmation). Live verification/release: NOT_RUN.
Inspected source parent: `a2fc984d82976add5cf994ebbbfb8e2752f53b4f`.
This checkpoint records the repair of 4 confirmed defects in R04-KG1-W1:
1. Canonical Server Weight Boundary & Resolution: Replaced separate overlay by normalizing weight once at server boundary (`normalizeAndValidateInquiryWeightAndHamper`). Normalizes top-level and nested weights, rejects conflicting weights with HTTP 400 `CONFLICTING_NET_FILLING_WEIGHT`, and constructs canonical `hamperConfiguration` merging `canonicalNetFillingGrams`. An explicit weight never resolves through the historical 200g-per-selection formula (e.g. 750g request with 4 selections yields honest unpriced 750g inquiry, never 800g / Rs. 18,008 estimate).
2. Packaging-Only Price vs Complete Estimate Separation: When `resolveHamper` returns no complete estimate (`estimatedTotalPkr == null`), modal, server response, persisted inquiry, and WhatsApp URL consistently output `requiresTeamQuote: true`, `standardPrice: null`, and `estimatedTotalPkr: null`. Never falls back to packaging price as complete estimate. Preserved `QUOTE_REQUIRED` in `orderValidation.ts` and `CartContext.tsx`.
3. Hamper Composition Idempotency Hashing: `computeInquiryPayloadHash` includes canonical sorted selections, boxId, recipientName, giftMessage, and netFillingGrams. Same request replays cleanly; changed configuration under the same submission key triggers HTTP 409 `IDEMPOTENCY_PAYLOAD_MISMATCH`. Historical replay compatibility (corrected 31 Oct 2026, follow-up): the previous claim was unsupported because both endpoints omitted the legacy hash argument and a legacy-hash match alone ignored composition. Now both endpoints pass the historical hash plus the canonical request composition to persistInquiryAtomically, which replays a historical intent only if the legacy hash matches AND isHistoricalHamperReplayEquivalent (src/lib/inquiryService.ts) confirms the stored original inquiry has the same box, selections (order-insensitive), effective weight, recipient and message. The original record, totals and reference are returned unchanged. Changed configuration returns 409 IDEMPOTENCY_PAYLOAD_MISMATCH. Limitation: a historical inquiry whose stored hamperConfiguration is missing or incomplete cannot be verified and fails closed with 409 (the customer must submit a fresh inquiry); no data migration was performed. Also fixed the /api/inquiries legacy hash, which used the inquiry type instead of the event type and could never match.
4. Gift-Weight UI Alignment & Validation: Removed invented `min=50, max=5000, step=50` constraints, aligning with server validation (`min={1}, max={10000}, step="any"`). Blank custom input triggers localized validation error (`quote.customWeightRequired`) and preserves form draft. Valid non-50g-multiples (e.g. 775g) submit and persist cleanly. Localized across EN, UR, and AR with RTL support.
Verification evidence: `tests/stage6-inquiry-flow.test.ts` (28/28 PASS), `tests/filled-gift-journey-browser.test.tsx` (all 14 stages PASS, including 390px viewport, blank input error, 775g keyboard entry, dark mode, and UR/AR RTL), `tests/hamper-catalog.test.tsx` (9/9 PASS), `tests/filled-gift-pricing.test.ts` (21/21 PASS), `npm run typecheck`, `npm run lint:hooks`.
Remaining live business data (missing Firestore `products`, `hamperBoxes`, and recipes) recorded separately as merchant prerequisites before live release.

## Current owner instruction and precedence

For dry-fruit/date/nut ingredients inside filled/custom boxes and hampers, calculate each selected ingredient from its current authoritative Firestore kilogram selling rate and its actual net grams in the composition. Final filled/custom quotations are confirmed through WhatsApp by the merchant.

This instruction supersedes the earlier hamper calculation based on a 250g packaged retail option and the R04-CAT2 explanation of that formula. Preserve the old results as dated evidence of old behavior. Do not repeat them as the required future rule. Standalone retail 250g/500g/1kg packs and standalone custom-weight pricing retain their existing prices and behavior; this task does not reprice them.

## Calculation contract

Let `K` be the valid current PKR selling rate for exactly 1kg of the selected ingredient, `g` its net grams per box, and `n` the requested number of boxes.

- Per-box ingredient estimate: `K * g / 1000`.
- Ingredient estimate for the requested boxes: `K * g * n / 1000`.
- Sum the ingredient lines; keep actual known packaging and other merchant-configured charges separate.
- Preserve sufficient precision during the calculation. Apply the existing supported money precision at an explicitly documented final boundary; never round the per-gram rate first or introduce a new Rs5 rounding/markup rule.
- Missing ingredient, kilogram rate, recipe quantity or necessary packaging rate means the complete estimate is unavailable/requires team quote. Never treat missing data as zero, silently omit a line, or label a partial sum as a complete total.
- These calculations are ingredient/box estimates, not an approved final quote, accepted order, payment amount or dispatch commitment.

### Acceptance examples, not new live rates

### Money Precision and Downstream Totals Policy

When money is non-divisible across boxes (e.g. Rs1001/kg × 50g × 10 boxes):
- The shared estimator (calculateFilledGiftEstimate) scales ingredient mass in milligrams and kilogram rates via BigInt, computing the exact ingredient subtotal for the entire requested order (exact = BigInt(rate) * milliGrams(item.grams) * BigInt(requestedBoxes)).
- Rounding to whole PKR (roundHalfUp(exact, MICRO)) occurs once on the order total (ingredientsSubtotalPkr), adding packaging total (packagingTotal) to produce estimatedTotalPkr.
- For display purposes, nominal unit rate (standardPrice / perPiecePrice) is computed as Math.round(estimatedTotalPkr / quantity) (e.g. Rs. 150/box).
- Crucially, authoritative downstream totals (InquiryRecord.estimatedTotalPkr, /api/quotes and /api/inquiries response, displayed modal estimate, and WhatsApp Estimated Total Ref:* Rs. X PKR) preserve the shared estimator's estimatedTotalPkr directly (e.g. Rs. 1,501). They NEVER recalculate standardPrice * quantity, preventing 1 PKR rounding drift (e.g. 150 × 10 = 1500).
- For custom hampers (`resolveHamper` in `src/lib/hamperCatalog.ts` and `src/lib/inquiryResolution.ts`):
  - Order-level BigInt scaling accumulates ingredient costs across requested hampers: `exact += BigInt(kgRate) * 200_000n * BigInt(validQty)`.
  - `ingredientsSubtotal = roundHalfUp(exact, MICRO)` with `packagingTotal = box.price * validQty` to yield exact `estimatedTotalPkr`.
  - Nominal unit rate for display is `Math.round(estimatedTotalPkr / validQty)`.
  - Acceptance example: 4 ingredients at Rs. 1,001/kg, 200g each, 10 hampers: ingredient subtotal = Rs. 8,008; packaging total (Rs. 1,000 × 10) = Rs. 10,000; estimatedTotalPkr = Rs. 18,008; nominal unit price = Rs. 1,801. Neither builder, modal, endpoints, persistence, nor WhatsApp suffer from 10 PKR per-ingredient rounding drift.


| Scenario | Kilogram rate | Other pack rate | Net filling | Required ingredient estimate |
| --- | --- | --- | --- | --- |
| Owner example | Rs1000/kg | 250g = Rs350 | 50g per box | Rs50 per box; do not use Rs70 from the 250g pack |
| Same recipe, 10 boxes | Rs1000/kg | 250g = Rs350 | 50g per box | Rs500 total; 500g net filling |
| Historical CAT1 pista snapshot | Rs4500/kg | 250g = Rs1200; custom = Rs500/100g | 200g | Rs900 under the new policy; Rs960 was the old 250g-proration result, Rs1000 is the separate custom-weight result |
| Kilogram rate missing/invalid/disabled | unavailable | positive 250g/500g rate exists | known | No numeric complete estimate; request team quote |
| One ingredient missing in a mixture | one unavailable | any | known | Whole mixture estimate incomplete, not zero-priced or silently reduced |

The pista values above are from the dated CAT1 record, not a new live read. Fresh implementation evidence must identify its actual snapshot/revision.

## Authoritative data and quantity rules

1. Resolve current stored products through the existing authoritative catalog adapter. The first implementation must inspect the real stored kilogram-option/commerce shape. Support an explicit validated 1kg option or an existing explicit merchant kilogram base-rate configuration; document the actual chosen source and any precedence. Do not create a second independently editable kilogram price list.
2. Never derive a missing kilogram base from 250g/500g pack rates, `pricePer100g * 10`, supplier costs, public reference examples or compiled seed fallback. Missing/conflicting supported kilogram sources must be explicit, not guessed.
3. Respect disabled options and existing product publication/availability restrictions. A compiled rate or an unavailable 1kg variant must not be advertised as a current merchant-authorized estimate.
4. Each ingredient needs its own stable product ID, explicit net mass and unit. Read stored recipe/configuration quantities where available. Inspect the existing composition model before extending it additively. If quantities are absent, record the gap; do not invent a filling recipe from photographs, labels, shipping mass or product names.
5. The owner's 50g example is not a new universal quantity. The old `HAMPER_PORTION_GRAMS = 200` is existing source behavior, not proof that every physical box contains 200g per ingredient. Preserve known configuration/identities while making the actual portion quantity explicit and verifiable.
6. Quantity here means ingredient mass and requested boxes, not inventory stock. The 9999 stock convention is not ingredient grams. Net filling and shipping/packaging mass are separate facts.
7. Internal 50g filling does not authorize a standalone 50g retail purchase. Do not alter standalone custom-weight minimums/increments to make an ingredient estimate work.
8. Do not convert oil ml to ingredient kg using the shipping billing convention. This policy covers mass-based food fillings; the existing 1ml=1g shipping convention is not physical density.
9. Use current rates at estimate time. Keep source product/variant identity, portion grams, box quantity and catalog revision/version sufficient for repricing and review. Historical accepted receipts stay immutable.

## Shared architecture and customer flow

- Existing Firestore documents/admin editor remain the single merchant pricing authority. Admin saves must reach the canonical catalog and estimate through the existing invalidation/refresh path. A direct Firestore edit needs its actual cache/refresh behavior verified; it is not automatically identical to an admin API save.
- Reuse one shared deterministic kilogram/grams estimator for the builder, relevant filled-packaging estimate, inquiry summary and authoritative server calculation. Place it within the existing commerce/hamper architecture; do not create parallel editable prices or duplicate arithmetic in components.
- The server resolves trusted product IDs, kilogram rates, recipe quantities and revisions. Browser-submitted prices, totals, rate-source flags and arbitrary recipe weights cannot authorize pricing or bypass quantity validation.
- Read/validate the actual ingredient recipe before estimating filled seed products. A label such as "Assorted Dry Fruits" is not a machine-readable approved recipe. Such items remain inquiry/unpriced until the missing composition is configured.
- Keep estimated ingredient cost distinct from a final merchant selling quote. Do not invent labor, printing, profit, discount, packaging charges or reapply the 5% initial-import markup.
- Filled/custom actions open the existing inquiry flow with exact selected IDs/labels, quantities and available estimated breakdown. Show localized estimate/final-WhatsApp-confirmation wording through the existing translation system.
- The prior review found `BidBoxesSection.tsx` adding filled variants to cart and `orderValidation.ts` only blocking product-level quote-only modes. A product-level `both` flag is not evidence of variant-level enforcement. The pending filled/custom inquiry guard must cover both UI and authoritative server paths; no accepted order/outbox event may be created by a forged direct-checkout request.
- Standard eligible empty packaging and ordinary retail checkout keep working. Do not convert the entire store to inquiry-only.
- No automatic customer message or live n8n execution follows from preparing an inquiry. WhatsApp sending remains the customer's explicit action or separately authorized integration.

## Implementation and test acceptance

Continue the existing filled-packaging inquiry fix and implement R04-KG1 in the same coherent flow. Fetch the current remote head before editing; preserve concurrent work.

1. Reproduce the old 250g proration and filled checkout gap on isolated fixtures.
2. Inspect real data shapes with authorized read-only access, logging only sanitized field/availability findings. Distinguish current live inspection from CAT1 snapshots and local fixtures. Missing access is not permission to fabricate a live result.
3. Implement canonical kilogram resolution, explicit recipe grams and the shared estimate. Use additive schema/admin support only where the existing model cannot express the required recipe; do not auto-write or migrate live records.
4. Test the owner example, multiple boxes, multiple ingredients, different retail pack prices, changed Firestore kilogram rates, disabled/invalid/missing kg options, absent recipe, conflicting sources, quantity validation and money precision.
5. Prove standalone packs/custom weights retain their rates, and filled/custom UI/direct quote/final order paths require inquiry with no accepted order/outbox side effects. Preserve old receipts, IDs, exact variant labels, MOQ, preparation, shipping, coupons and idempotency.
6. Verify the actual builder/inquiry journey in EN/UR/AR, RTL, mobile/desktop and light/dark for touched surfaces. Run the repository's required source-change gates once the implementation stabilizes.
7. Update this status, current handoff, decision record, catalog audit/evidence and changelog with actual commands/results. Do not mark implementation DONE from this documentation.

## Checkpoint evidence and boundaries

Owner/agent: owner decision; Antigravity implementation & complete verification.
Changed scope: runtime estimator (`src/lib/filledGiftPricing.ts`), hamper catalog update (`src/lib/hamperCatalog.ts`), admin visual recipe editor (`src/components/AdminRecipeEditor.tsx`, `src/components/AdminItemForm.tsx`), additive schema (`src/types.ts`, `src/lib/catalogSchema.ts`), inquiry guards and customer journeys (`src/lib/orderValidation.ts`, `src/lib/orderQuote.ts`, `src/lib/orderDatabase.ts`, `src/components/BidBoxesSection.tsx`, `src/components/CustomQuoteModal.tsx`, `src/pages/ProductDetailPage.tsx`), comprehensive unit & browser tests (`tests/filled-gift-pricing.test.ts`, `tests/admin-recipe-editor-browser.test.tsx`, `tests/hamper-catalog.test.tsx`, `tests/filled-gift-journey-browser.test.tsx`, `tests/shipping-policy.test.ts`, `tests/stage6-order-handoff.test.ts`, `tests/premium-gifting-browser.test.tsx`, `tests/admin-expansion-content-browser.test.tsx`, `tests/admin-finishing-browser.test.tsx`).
Runtime source:
1. `src/lib/filledGiftPricing.ts`: shared deterministic estimator implementing `resolveAuthoritativeKgRate`, `calculateIngredientEstimate` (`K * g * n / 1000`), `calculateFilledGiftEstimate`, `classifyPackagingVariant`, `isFilledPackagingVariant`, and `packagingVariantRequiresInquiry`. Enforces fail-closed rules: rejects calculated commerce derived from base packs < 1000g, ignores shipping mass (`weightGrams: 1000`), fails closed on conflicting rates or disabled variants, and reports calculated `ingredientsSubtotalPkr` while keeping `estimatedTotalPkr` null if packaging or an ingredient is missing.
2. `src/lib/hamperCatalog.ts`: updated `hamperSelectionPrice` and `resolveHamper` to implement the order-level BigInt scaling precision policy (`exact += BigInt(kgRate) * 200_000n * BigInt(validQty)`), computing exact `ingredientsSubtotalPkr`, `packagingTotal`, and `estimatedTotalPkr`. Unit prices are nominal/display-only (`Math.round(estimatedTotalPkr / validQty)`).
2b. `src/components/AdminRecipeEditor.tsx` & `src/components/AdminItemForm.tsx`: visual admin recipe editor mounted in `#item-section-recipe`. Displays candidate ingredients with live 1kg rate badges (`resolveAuthoritativeKgRate`), grams per box inputs with live cost calculations (`kgRate * grams / 1000`), total net grams, and total estimate per box. Supports localized customer recipe descriptions (`recipe_en/ur/ar`), variant-specific overrides (`filledRecipes`), monotonic revision advancement, recipe clearing, and preview in `#item-section-review`.
3. `src/types.ts` & `src/lib/catalogSchema.ts`: additive `RecipeIngredient` type, `recipeIngredients` and `filledRecipes` allowlisted in `PUBLIC_PRODUCT_FIELDS` and validated in `validateDynamicProduct`.
4. Inquiry guards and persistence boundary:
   - Server guard in `validateAndPriceOrder` (`src/lib/orderValidation.ts`) parameterized with `allowInquiryItems` (aliased with `allowPackagingQuote`, defaulting to `false`). Rejects unquoted custom hampers and filled packaging variants with `QUOTE_REQUIRED`.
   - `quoteOrderForCustomer` (`src/lib/orderQuote.ts`) passes `allowInquiryItems: true` so customer quotes calculate prices and shipping accurately in read-only mode.
   - `createDurableOrder` (`src/lib/orderDatabase.ts`) strictly removes client reliance on `allowInquiryItems`: customer request payloads cannot authorize inquiry items to become accepted orders.
   - Direct checkout attempts for filled packaging and custom hampers strictly fail closed with `QUOTE_REQUIRED`, even if the customer provides `allowInquiryItems: true`, `allowPackagingQuote: true`, or supplies a matching `expectedFinalTotal`.
   - Frontend UI guards in `BidBoxesSection.tsx` and `ProductDetailPage.tsx` routing filled packaging selections to `openCustomQuoteModal` instead of direct cart checkout.
   - `BidBoxesSection.tsx` connected to `calculateFilledGiftEstimate` for per-box estimate display, preserving requested tier quantity without inflating customer budget.
   - `CustomQuoteModal.tsx` displays live recipe ingredients breakdown for filled inquiry mode.

5. Remaining blockers and owner confirmations for complete R04-KG1 closure:
   - Visual dynamic recipe configuration in `AdminItemForm.tsx` / `AdminRecipeEditor.tsx`: COMPLETE (verified by 12-stage browser journey in `tests/admin-recipe-editor-browser.test.tsx` mounting real ThemeProvider, dark mode switch `setTheme('dark')`, 390x844 RTL Urdu usable control bounding boxes, zero horizontal overflow, blank row initialization, client-side validation rejection on incomplete save, and 4x1001 acceptance fixture).
   - Custom Hamper Builder & Recipe Editor shared estimator unification: COMPLETE (`CustomHamperBuilderModal.tsx` and `AdminRecipeEditor.tsx` calculate aggregate totals via `calculateFilledGiftEstimate` / `resolveHamper`, preventing individually rounded lines from dictating order totals).
   - Ten-Hamper Acceptance Fixture via real HTTP endpoints: COMPLETE (`POST /api/quotes` and `POST /api/inquiries` in `tests/filled-gift-journey-browser.test.tsx` Stage 13 verified with 4 x Rs. 1,001/kg @ 200g, qty 10, box Rs. 1,000; strictly preserving Rs. 18,008 across persistence and WhatsApp URLs).
   - Merchant quote-approval workflow: CONFIRMED BY OWNER. Manual quotation and confirmation via WhatsApp is the confirmed and permanent workflow. No automated approval-token or durable quote-to-order conversion system will be built.
   - Live Firestore catalog data population and release gates: PENDING merchant execution (zero live writes or mutations claimed by implementation).

Verification:
- `tests/filled-gift-pricing.test.ts`: 20/20 comprehensive tests PASS (including Test 20 acceptance scenario with 12 assertions across card, modal, and server) (owner 50g example, multi-ingredient mixture, changed kg rates, unchanged 250g pack rates, missing/disabled kg rates failing unpriced, unchanged standalone retail/custom weights, filled checkout rejection with `QUOTE_REQUIRED`, empty packaging checkout success, calculated base < 1kg rejection, shipping mass exclusion, conflicting/disabled variant fail-closed, subtotal exposure with null total, unquoted hamper rejection, canonical variant classification, direct creation failure, client payload bypass denial, quote-match rejection, empty packaging/food normal checkout, and idempotent historical replay).
- `tests/admin-recipe-editor-browser.test.tsx`: 1/1 mounted browser test PASS (12 stages: recipe section navigation, blank row initialization, incomplete row validation rejection, adding ingredients with live calculations at Rs. 4,500/kg -> Rs. 225 PKR and Rs. 2,000/kg -> Rs. 100 PKR, total filling mass & cost display, localized customer descriptions, variant-specific override with pista 100g, review section preview, admin API save, Firestore record verification with revision 2, round-trip reload and live recalculation, recipe clearing and removal with revision 3, acceptance fixture 4 x Rs. 1,001/kg @ 200g showing 4 x Rs. 200 PKR lines and aggregate Rs. 801 PKR / 800g total, mobile 390x844, RTL Urdu, and dark mode parity).
- `tests/hamper-catalog.test.tsx`: 9/9 tests PASS (including custom hamper order-level precision acceptance scenario: 4 × Rs. 1,001/kg × 200g × 10 hampers = Rs. 8,008 ingredients + Rs. 10,000 packaging = Rs. 18,008 total, and CustomHamperBuilderModal rendering shared estimator contents Rs. 801 and total Rs. 2,601).
- `tests/authoritative-quote.test.ts`: 7/7 tests PASS.
- `tests/stage6-legacy-packaging.test.ts`: 4/4 tests PASS.
- `tests/stage6-order-handoff.test.ts`: 4/4 tests PASS.
- `tests/premium-gifting-browser.test.tsx`: 1/1 test PASS.
- `tests/admin-expansion-content-browser.test.tsx`: 1/1 test PASS.
- `tests/admin-finishing-browser.test.tsx`: 1/1 test PASS.
- `npm run typecheck` (`tsc --noEmit`): PASS (0 errors).
- `npm run lint:hooks` (`eslint src`): PASS (0 errors).
- `ALLBARKA_SKIP_LOCAL_ENV=true npm run build`: PASS (exit code 0; source revision `dc9a7d41211453e45b7df4b7e081fa56a91adeb8`, build source `04402a72aab5f441`, release privacy audit passed with 84 text artifacts audited with zero leaks).
- `tests/filled-gift-journey-browser.test.tsx`: 1/1 mounted browser & authoritative API journey PASS (13 stages: card estimate display Rs. 150/box without legacy Rs. 9,000, modal reference rate Rs. 150/box & Est. Rs. 1,500 total with empty customer budget input, quote submission and memoryFirestore persistence, WhatsApp URL concordance, changed authoritative kg rate Rs. 2,000/kg & forged client total rejection, unpriced missing recipe & legacy packaging without recipe, empty packaging deletion/disablement fail-closed, hamper builder inquiry dispatch without cart mutation, direct order QUOTE_REQUIRED failure, hamper box stored rate authority & dynamic updates & fail-closed without fallback to compiled seeds, non-divisible money precision preservation, card honest quote-required state without cfg.filledMin, and 10-hamper acceptance fixture through both real HTTP endpoints /api/quotes and /api/inquiries strictly preserving Rs. 18,008).
- `tests/stage6-inquiry-flow.test.ts`: 19/19 tests PASS.
- `node scripts/run-all-tests.mjs`: PASS (745 passed, 0 failed, 1 skipped across all 85 test files; 21 backend tests passed; 36 production checks passed).
- `git diff --check`: PASS (0 errors).

---

## Child Task R04-KG1-W1: Net Filling Weight Canon & Customer/Admin Flow Integration (31 October 2026)

### 1. Scope & Objective
Complete the canonical net filling weight model supporting presets (`250g`, `500g`, `1kg`) and `Custom weight` per box across customer inquiry modals, backend router endpoints, database persistence, WhatsApp message generation, and admin inquiry management.

### 2. Architecture & Rules Implemented
- **Single Canonical Weight Field**: Additive `netFillingGrams?: number | null` field on `InquiryRecord`, `CustomQuoteModalInit`, `CustomQuoteSubmissionInput`, `ResolveInquiryParams`, `InquiryVariantResolution`, and `HamperConfiguration`.
- **Unit Normalization & Validation**: `normalizeNetFillingGrams` and `isValidNetFillingGrams` in `src/lib/filledGiftPricing.ts` enforce finite positive integers/milligram values up to `MAX_INGREDIENT_GRAMS` (10,000g), rejecting negative, zero, non-finite, and out-of-bound weights.
- **Recipe Sum Matching Rule**: `calculateFilledGiftEstimate` accepts `expectedNetFillingGrams`. If the explicit recipe ingredient grams sum does not strictly match `expectedNetFillingGrams`, it fails closed returning `isAvailable: false, unavailabilityReason: 'INVALID_RECIPE'`, leaving the inquiry in an honest unpriced quote-required state. No equal-split recipes or automatic weight distributions are ever invented.
- **Historical Compatibility**: Legacy hamper configurations without `netFillingGrams` preserve the historical 200g portion per selection. When `netFillingGrams` is provided, `resolveHamper` sets `massGrams: netFillingGrams` and returns honest unpriced quote-required status (`requiresTeamQuote: true`).
- **Endpoint Security & Validation**: `POST /api/inquiries` and `POST /api/quotes` validate submitted net filling weights, returning HTTP 400 `INVALID_NET_FILLING_WEIGHT` on invalid input.
- **Idempotency Protection**: `computeInquiryPayloadHash` includes `netFillingGrams`. Replays with identical payloads succeed; resubmissions under the same submission key with a changed net filling weight return HTTP 409 `IDEMPOTENCY_PAYLOAD_MISMATCH`.
- **Customer & Admin WhatsApp Concordance**: `buildCustomerInquiryWhatsAppUrl` and `buildAdminWhatsAppPitchUrl` render `• *Net Filling Weight:* {weight} per box`. Hamper selections under custom weight omit the historical `(200g)` suffix.
- **Storefront & Admin UI**:
  - `src/components/CustomQuoteModal.tsx`: mounts 250g, 500g, 1kg, and Custom weight controls when in `filled` or `custom` mode, syncs with weight-bearing variant labels, and validates input.
  - `src/components/CustomHamperBuilderModal.tsx`: passes `netFillingGrams` to `openCustomQuoteModal` and formats selection notes appropriately.
  - `src/components/AdminInquiriesPanel.tsx`: displays the net filling weight badge in inquiry summary and product comparison views.

### 3. Verification Evidence
- `tests/filled-gift-pricing.test.ts`: 21/21 tests PASS (Test 21 verifies presets, custom 750g, strict validation, formula scaling at Rs. 1000/kg, recipe weight matching, and legacy hamper preservation).
- `tests/stage6-inquiry-flow.test.ts`: 23/23 tests PASS (verifying 750g end-to-end persistence, unpriced quote-on-request preservation, HTTP 400 rejection on invalid weights, and HTTP 409 idempotency conflict on changed weight).
- `tests/hamper-catalog.test.tsx`: 9/9 tests PASS.
- `npm run typecheck` (`tsc --noEmit`): PASS (0 errors).
- `npm run lint:hooks` (`eslint src`): PASS (0 errors).
- `ALLBARKA_SKIP_LOCAL_ENV=true npm run build`: PASS (exit code 0).
- `node scripts/run-all-tests.mjs`: PASS (750 tests passed, 0 failed, 1 skipped across all 85 test files; 21 backend tests passed; 36 production checks passed).
- `git diff --check`: PASS (0 errors).
