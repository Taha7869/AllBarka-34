# Handoff: Mehmaan Table Planner V2 (2026-11-16)

## Branch & Scope
- **Task branch:** `ag/20261116-table-planner-v2`
- **Deploy branch:** `claude/celebrations-foundation-20261112` (untouched, as per Rule 30)
- **Status:** Complete, tested, build verified, pushed to remote origin.

## What Was Done
1. **Budget Tier Filtering (`kifayati` | `standard` | `premium`):**
   - Added `getProductPricePerKg` to extrapolate canonical per-kilogram prices from available product portions.
   - Added `isProductInBudgetBand` and `getCategoryCandidates` to filter published, in-stock products into three distinct price tiers across all three categories (`nuts`, `dates`, `driedFruits`).
   - Sorted in-band products according to tier characteristics (ascending price for Kifayati, balanced for Standard, descending for Premium), with graceful fallback to nearest products if a tier has fewer candidates.
2. **Variety Selection (1 / 2 / 3 Qism) & Equal Gram Partitioning:**
   - Implemented independent `1 / 2 / 3` variety selectors for each category (`nuts`, `dates`, `driedFruits`).
   - Target grams for the category are split equally across chosen varieties (`Math.floor(totalGrams / count)` with remainder distributed), ensuring the sum of varieties matches the total category requirement.
3. **Item Rotation / Refresh ("Badlein"):**
   - Implemented `getNextCategoryProduct` to cycle to the next available item in the same category and budget band.
   - Enforces collision prevention (never repeats an item currently occupying another variety slot in that category) and wrap-around rotation without immediate repetition.
4. **Waste Minimization & Pack Combo Optimization:**
   - Implemented `resolveBestPackCombo(product, targetGrams)` using bounded search over active product portions.
   - Prioritizes combinations with minimal excess weight, lowest commercial total price, and fewest packages (e.g. `1050g -> 1kg + 100g (50g extra)`).
   - When only single portion sizes exist, transparently documents unavoidable excess (e.g. `1050g` with only 1kg packs yields `1kg × 2 (950g extra)`).
5. **Modal UI & Trilingual Localization:**
   - Updated `MehmaanTablePlannerModal.tsx` with:
     - 3-option Budget Tier buttons with icons (`Coins`, `Sparkles`, `Crown`).
     - `1 / 2 / 3` variety toggle pills for Nuts, Dates, and Dried Fruits.
     - "Badlein" (Change) button on every recommended card with `RotateCcw` icon.
     - Accurate combo summary display with extra grams notice.
     - Updated `handleAddAll` to add each distinct pack portion to the bag.
     - Harrods-luxury styling, 44px min-height buttons, RTL support, dark mode parity, and accessibility labels.
   - Added complete EN, UR, and AR translations to `src/contexts/catalogTranslations.ts`.
6. **Testing & Verification:**
   - Created `tests/mehmaan-table-planner-v2.test.ts` testing budget filtering, variety split, rotation, pack combo waste minimization, and end-to-end plan calculation (5 pass, 0 fail).
   - Verified regression test `tests/batch-c-entertaining.test.ts` (3 pass, 0 fail).
   - Verified `npm run typecheck` (0 errors).
   - Verified `npm run build` (build & privacy audit PASS).

## Verification Evidence
- `node --import tsx --test tests/mehmaan-table-planner-v2.test.ts`:
  `# pass 5 / # fail 0`
- `node --import tsx --test tests/batch-c-entertaining.test.ts`:
  `# pass 3 / # fail 0`
- `npm run typecheck`:
  `Exit code 0 (no errors)`
- `npm run build`:
  `✓ built in 16.72s`
  `Release privacy audit passed (85 text artifacts; no private values printed).`
- Git Status & Push:
  `ag/20261116-table-planner-v2 -> origin/ag/20261116-table-planner-v2` (Exit code 0).

## Files Changed
- `src/lib/mehmaanPlanner.ts`: Core algorithm updates (budget bands, variety split, rotation, pack combo minimization).
- `src/components/MehmaanTablePlannerModal.tsx`: UI controls for budget, variety, rotation, and pack combo display.
- `src/contexts/catalogTranslations.ts`: Trilingual keys (EN, UR, AR) for budget, variety, and refresh copy.
- `tests/mehmaan-table-planner-v2.test.ts`: New dedicated unit test suite.
- `docs/handoffs/20261116-table-planner-v2.md`: This handoff document.
