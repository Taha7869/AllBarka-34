# Filled gifts: kilogram-based ingredient estimates

Updated: 30 October 2026 (Asia/Karachi).
Task: R04-KG1. Owner decision: CONFIRMED. Implementation: IN_PROGRESS. Live verification/release: NOT_RUN.
Inspected source parent: `5a472f537f2f4a91ee3fb831a6e311fc250ca2f9`.
This checkpoint records the completed implementation of the shared kilogram-based estimator and authoritative inquiry guard.

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
Changed scope: runtime estimator (`src/lib/filledGiftPricing.ts`), hamper catalog update (`src/lib/hamperCatalog.ts`), additive schema (`src/types.ts`, `src/lib/catalogSchema.ts`), inquiry guards and customer journeys (`src/lib/orderValidation.ts`, `src/lib/orderQuote.ts`, `src/lib/orderDatabase.ts`, `src/components/BidBoxesSection.tsx`, `src/components/CustomQuoteModal.tsx`, `src/pages/ProductDetailPage.tsx`), comprehensive unit & browser tests (`tests/filled-gift-pricing.test.ts`, `tests/shipping-policy.test.ts`, `tests/stage6-order-handoff.test.ts`, `tests/premium-gifting-browser.test.tsx`, `tests/admin-expansion-content-browser.test.tsx`, `tests/admin-finishing-browser.test.tsx`).
Runtime source:
1. `src/lib/filledGiftPricing.ts`: shared deterministic estimator implementing `resolveAuthoritativeKgRate`, `calculateIngredientEstimate` (`K * g * n / 1000`), `calculateFilledGiftEstimate`, `classifyPackagingVariant`, `isFilledPackagingVariant`, and `packagingVariantRequiresInquiry`. Enforces fail-closed rules: rejects calculated commerce derived from base packs < 1000g, ignores shipping mass (`weightGrams: 1000`), fails closed on conflicting rates or disabled variants, and reports calculated `ingredientsSubtotalPkr` while keeping `estimatedTotalPkr` null if packaging or an ingredient is missing.
2. `src/lib/hamperCatalog.ts`: updated `hamperSelectionPrice` to use `resolveAuthoritativeKgRate(product) * HAMPER_PORTION_GRAMS / 1000` (half-up integer PKR rounding).
3. `src/types.ts` & `src/lib/catalogSchema.ts`: additive `RecipeIngredient` type, `recipeIngredients` and `filledRecipes` allowlisted in `PUBLIC_PRODUCT_FIELDS` and validated in `validateDynamicProduct`.
4. Inquiry guards and persistence boundary:
   - Server guard in `validateAndPriceOrder` (`src/lib/orderValidation.ts`) parameterized with `allowInquiryItems` (aliased with `allowPackagingQuote`, defaulting to `false`). Rejects unquoted custom hampers and filled packaging variants with `QUOTE_REQUIRED`.
   - `quoteOrderForCustomer` (`src/lib/orderQuote.ts`) passes `allowInquiryItems: true` so customer quotes calculate prices and shipping accurately in read-only mode.
   - `createDurableOrder` (`src/lib/orderDatabase.ts`) strictly removes client reliance on `allowInquiryItems`: customer request payloads cannot authorize inquiry items to become accepted orders.
   - Direct checkout attempts for filled packaging and custom hampers strictly fail closed with `QUOTE_REQUIRED`, even if the customer provides `allowInquiryItems: true`, `allowPackagingQuote: true`, or supplies a matching `expectedFinalTotal`.
   - Frontend UI guards in `BidBoxesSection.tsx` and `ProductDetailPage.tsx` routing filled packaging selections to `openCustomQuoteModal` instead of direct cart checkout.
   - `BidBoxesSection.tsx` connected to `calculateFilledGiftEstimate` for per-box estimate display, preserving requested tier quantity without inflating customer budget.
   - `CustomQuoteModal.tsx` displays live recipe ingredients breakdown for filled inquiry mode.

5. Remaining blockers for complete R04-KG1 closure:
   - Visual dynamic recipe configuration in `AdminProductEditModal.tsx` so merchants can configure ingredients and gram weights through the admin UI.
   - Merchant WhatsApp quote approval and durable quote-to-order conversion mechanism.
   - Live Firestore data seeding/migration for bid-box recipes and authoritative 1kg ingredient rates.

Verification:
- `tests/filled-gift-pricing.test.ts`: 19/19 comprehensive tests PASS (owner 50g example, multi-ingredient mixture, changed kg rates, unchanged 250g pack rates, missing/disabled kg rates failing unpriced, unchanged standalone retail/custom weights, filled checkout rejection with `QUOTE_REQUIRED`, empty packaging checkout success, calculated base < 1kg rejection, shipping mass exclusion, conflicting/disabled variant fail-closed, subtotal exposure with null total, unquoted hamper rejection, canonical variant classification, direct creation failure, client payload bypass denial, quote-match rejection, empty packaging/food normal checkout, and idempotent historical replay).
- `tests/hamper-catalog.test.tsx`: 7/7 tests PASS.
- `tests/authoritative-quote.test.ts`: 7/7 tests PASS.
- `tests/stage6-legacy-packaging.test.ts`: 4/4 tests PASS.
- `tests/stage6-order-handoff.test.ts`: 4/4 tests PASS.
- `tests/premium-gifting-browser.test.tsx`: 1/1 test PASS.
- `tests/admin-expansion-content-browser.test.tsx`: 1/1 test PASS.
- `tests/admin-finishing-browser.test.tsx`: 1/1 test PASS.
- `npm run typecheck` (`tsc --noEmit`): PASS (0 errors).
- `npm run lint:hooks` (`eslint src`): PASS (0 errors).
- `ALLBARKA_SKIP_LOCAL_ENV=true npm run build`: PASS (exit code 0; release privacy audit passed with 84 text artifacts).
- `node scripts/run-all-tests.mjs`: PASS (735 passed, 0 failed, 1 skipped across 83 test files; 21 backend tests passed; 36 production checks passed).
- `git diff --check`: PASS (0 errors).
