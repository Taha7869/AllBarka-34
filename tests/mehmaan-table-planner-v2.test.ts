import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import {
  getProductPricePerKg,
  isProductInBudgetBand,
  getCategoryCandidates,
  getNextCategoryProduct,
  resolveBestPackCombo,
  calculateMehmaanPlan,
  type BudgetBand,
} from '../src/lib/mehmaanPlanner';
import type { Product } from '../src/types';

test('Mehmaan Planner V2: Budget Band Filtering selects correct price tiers', () => {
  // 1. Price per kg calculation
  const badam = PRODUCTS.find(p => p.id === 'badam')!;
  assert.ok(badam);
  const badamKg = getProductPricePerKg(badam);
  assert.equal(badamKg, 3800);

  const akhroot = PRODUCTS.find(p => p.id === 'akhroot')!;
  assert.ok(akhroot);
  const akhrootKg = getProductPricePerKg(akhroot);
  assert.equal(akhrootKg, 1100);

  const pineNuts = PRODUCTS.find(p => p.id === 'pine-nuts')!;
  assert.ok(pineNuts);
  const pineNutsKg = getProductPricePerKg(pineNuts);
  assert.equal(pineNutsKg, 44000);

  // 2. Band checks for nuts
  assert.equal(isProductInBudgetBand(akhrootKg, 'nuts', 'kifayati'), true);
  assert.equal(isProductInBudgetBand(badamKg, 'nuts', 'kifayati'), true); // 3800 <= 3800
  assert.equal(isProductInBudgetBand(pineNutsKg, 'nuts', 'kifayati'), false);
  assert.equal(isProductInBudgetBand(pineNutsKg, 'nuts', 'premium'), true);

  // 3. Category candidates by budget band
  const kifayatiNuts = getCategoryCandidates(PRODUCTS, 'nuts', 'kifayati');
  assert.ok(kifayatiNuts.length >= 3);
  assert.equal(kifayatiNuts[0].id, 'akhroot'); // Lowest price first in kifayati

  const premiumNuts = getCategoryCandidates(PRODUCTS, 'nuts', 'premium');
  assert.ok(premiumNuts.length >= 3);
  assert.equal(premiumNuts[0].id, 'pine-nuts'); // Highest luxury first in premium

  // 4. Dates category by budget band
  const kifayatiDates = getCategoryCandidates(PRODUCTS, 'dates', 'kifayati');
  assert.equal(kifayatiDates[0].id, 'khajoor');

  const premiumDates = getCategoryCandidates(PRODUCTS, 'dates', 'premium');
  assert.equal(premiumDates[0].id, 'medjool-dates');

  // 5. Dried Fruits category by budget band
  const kifayatiFruits = getCategoryCandidates(PRODUCTS, 'driedFruits', 'kifayati');
  assert.equal(kifayatiFruits[0].id, 'khubani');

  const premiumFruits = getCategoryCandidates(PRODUCTS, 'driedFruits', 'premium');
  assert.equal(premiumFruits[0].id, 'afghan-figs');
});

test('Mehmaan Planner V2: Variety (1 / 2 / 3 Qism) partitions grams equally', () => {
  const guests = 10; // Dawat setting: nuts = 450g, dates = 250g, fruits = 250g

  // 1. Variety = 1 (default)
  const plan1 = calculateMehmaanPlan(PRODUCTS, guests, 'dawat', undefined, {
    varietyCounts: { nuts: 1, dates: 1, driedFruits: 1 },
  });
  const nuts1 = plan1.items.filter(i => i.category === 'nuts');
  assert.equal(nuts1.length, 1);
  assert.equal(nuts1[0].targetGrams, 450);

  // 2. Variety = 2
  const plan2 = calculateMehmaanPlan(PRODUCTS, guests, 'dawat', undefined, {
    varietyCounts: { nuts: 2, dates: 2, driedFruits: 2 },
  });
  const nuts2 = plan2.items.filter(i => i.category === 'nuts');
  assert.equal(nuts2.length, 2);
  assert.notEqual(nuts2[0].product.id, nuts2[1].product.id);
  // 450 / 2 = 225g each
  assert.equal(nuts2[0].targetGrams, 225);
  assert.equal(nuts2[1].targetGrams, 225);
  assert.equal(nuts2[0].targetGrams + nuts2[1].targetGrams, 450);

  const dates2 = plan2.items.filter(i => i.category === 'dates');
  assert.equal(dates2.length, 2);
  // 250 / 2 = 125g each
  assert.equal(dates2[0].targetGrams, 125);
  assert.equal(dates2[1].targetGrams, 125);
  assert.equal(dates2[0].targetGrams + dates2[1].targetGrams, 250);

  // 3. Variety = 3
  const plan3 = calculateMehmaanPlan(PRODUCTS, guests, 'dawat', undefined, {
    varietyCounts: { nuts: 3, dates: 3, driedFruits: 3 },
  });
  const nuts3 = plan3.items.filter(i => i.category === 'nuts');
  assert.equal(nuts3.length, 3);
  // Unique items
  const uniqueNutIds = new Set(nuts3.map(i => i.product.id));
  assert.equal(uniqueNutIds.size, 3);
  // Sum equals total nuts grams (450g -> 150g each)
  assert.equal(nuts3.reduce((sum, i) => sum + i.targetGrams, 0), 450);

  const dates3 = plan3.items.filter(i => i.category === 'dates');
  assert.equal(dates3.length, 3);
  // 250 partitioned across 3: 84 + 83 + 83 = 250
  assert.equal(dates3.reduce((sum, i) => sum + i.targetGrams, 0), 250);
});

test('Mehmaan Planner V2: Refresh / Rotation ("Badlein") cycles forward without repetition or collisions', () => {
  const candidates = getCategoryCandidates(PRODUCTS, 'nuts', 'standard');
  assert.ok(candidates.length >= 4);

  const firstId = candidates[0].id;
  const secondId = candidates[1].id;
  const thirdId = candidates[2].id;

  // Single slot rotation: cycling forward
  const next1 = getNextCategoryProduct(candidates, firstId, [firstId]);
  assert.ok(next1);
  assert.equal(next1.id, secondId);

  const next2 = getNextCategoryProduct(candidates, secondId, [secondId]);
  assert.ok(next2);
  assert.equal(next2.id, thirdId);

  // Multi-slot rotation avoids collisions with other slots:
  // If first slot is firstId and second slot is secondId, rotating first slot skips secondId!
  const nextAvoidingCollision = getNextCategoryProduct(candidates, firstId, [firstId, secondId]);
  assert.ok(nextAvoidingCollision);
  assert.equal(nextAvoidingCollision.id, thirdId);

  // Wrap-around test: rotating the last item returns to the beginning
  const lastCandidate = candidates[candidates.length - 1];
  const wrapped = getNextCategoryProduct(candidates, lastCandidate.id, [lastCandidate.id]);
  assert.ok(wrapped);
  assert.equal(wrapped.id, firstId);
});

test('Mehmaan Planner V2: Pack Combo Minimization minimizes waste and reports extra weight', () => {
  // Synthetic mock product with [1kg, 500g, 250g, 100g] portions
  const mockProductMultiPortion: Product = {
    ...PRODUCTS[0],
    id: 'mock-almond',
    name_en: 'Mock Almonds',
    category: 'nuts',
    prices: {
      '1kg': 4000,
      '500g': 2100,
      '250g': 1100,
      '100g': 450,
    },
  };

  // 1. Requirement 4 example: 1050g -> 1kg + 100g (50g extra), NOT 2 x 1kg
  const combo1050 = resolveBestPackCombo(mockProductMultiPortion, 1050);
  assert.ok(combo1050);
  assert.equal(combo1050.totalGramsDelivered, 1100);
  assert.equal(combo1050.extraGrams, 50);
  assert.equal(combo1050.packs.length, 2);
  assert.equal(combo1050.packs.some(p => p.weight === '1kg' && p.units === 1), true);
  assert.equal(combo1050.packs.some(p => p.weight === '100g' && p.units === 1), true);
  assert.equal(combo1050.summary, '1kg + 100g (50g extra)');
  assert.equal(combo1050.totalPrice, 4450); // 4000 + 450

  // 2. Requirement 4 fallback: Product with ONLY 1kg portions
  const mockProductOnly1kg: Product = {
    ...PRODUCTS[0],
    id: 'mock-bulk-nut',
    name_en: 'Mock Bulk Nut',
    category: 'nuts',
    prices: {
      '1kg': 3500,
    },
  };

  const comboOnly1kg = resolveBestPackCombo(mockProductOnly1kg, 1050);
  assert.ok(comboOnly1kg);
  assert.equal(comboOnly1kg.totalGramsDelivered, 2000);
  assert.equal(comboOnly1kg.extraGrams, 950);
  assert.equal(comboOnly1kg.packs.length, 1);
  assert.equal(comboOnly1kg.packs[0].units, 2);
  assert.equal(comboOnly1kg.packs[0].weight, '1kg');
  assert.equal(comboOnly1kg.summary, '1kg × 2 (950g extra)');
  assert.equal(comboOnly1kg.totalPrice, 7000);

  // 3. Exact target match: 500g -> 500g (0g extra)
  const combo500 = resolveBestPackCombo(mockProductMultiPortion, 500);
  assert.ok(combo500);
  assert.equal(combo500.totalGramsDelivered, 500);
  assert.equal(combo500.extraGrams, 0);
  assert.equal(combo500.summary, '500g');
  assert.equal(combo500.totalPrice, 2100);
});

test('Mehmaan Planner V2: End-to-end plan integrates budget, variety, and combos', () => {
  const plan = calculateMehmaanPlan(PRODUCTS, 12, 'dawat', undefined, {
    budgetBand: 'premium',
    varietyCounts: { nuts: 2, dates: 1, driedFruits: 2 },
  });

  assert.equal(plan.budgetBand, 'premium');
  assert.equal(plan.varietyCounts.nuts, 2);
  assert.equal(plan.varietyCounts.dates, 1);
  assert.equal(plan.varietyCounts.driedFruits, 2);
  assert.equal(plan.items.length, 5); // 2 + 1 + 2

  // Total price is positive and sums all items
  assert.ok(plan.estimatedTotalPkr > 0);
  const itemsSum = plan.items.reduce((acc, i) => acc + i.itemTotal, 0);
  assert.equal(plan.estimatedTotalPkr, itemsSum);

  // Each item has a valid pack combo
  for (const item of plan.items) {
    assert.ok(item.packCombo);
    assert.ok(item.packCombo.packs.length >= 1);
    assert.ok(item.packCombo.totalGramsDelivered >= item.targetGrams);
  }
});
