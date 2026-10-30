import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import type { Product } from '../src/types';
import {
  calculateIngredientEstimate,
  calculateFilledGiftEstimate,
  resolveAuthoritativeKgRate,
  isFilledPackagingVariant,
  type RecipeIngredient,
} from '../src/lib/filledGiftPricing';
import { validateAndPriceOrder } from '../src/lib/orderValidation';
import { resolveProductVariant, resolveCustomWeight } from '../src/lib/productVariants';

test('Test 1: Rs1000/kg + 50g = Rs50; ten boxes = Rs500 (D14 owner formula)', () => {
  // 1 box of 50g at 1000 PKR/kg = 50 PKR
  const singleBoxEstimate = calculateIngredientEstimate(1000, 50, 1);
  assert.equal(singleBoxEstimate, 50);

  // 10 boxes of 50g at 1000 PKR/kg = 500 PKR
  const tenBoxesEstimate = calculateIngredientEstimate(1000, 50, 10);
  assert.equal(tenBoxesEstimate, 500);

  // Verify that a mock product with 1000 PKR/kg rate and 350 PKR 250g pack rate
  // strictly calculates 50 PKR per box (never 70 PKR from the 250g rate)
  const mockProduct: Product = {
    ...PRODUCTS.find(p => p.id === 'badam')!,
    id: 'mock-nut',
    prices: { '250g': 350, '1kg': 1000 },
    variants: [
      { label: '250g', price: 350, available: true },
      { label: '1kg', price: 1000, available: true },
    ],
  };

  const kgRate = resolveAuthoritativeKgRate(mockProduct);
  assert.equal(kgRate, 1000);

  const estimateResult = calculateFilledGiftEstimate({
    recipe: [{ productId: 'mock-nut', grams: 50 }],
    catalogProducts: [mockProduct],
    requestedBoxes: 1,
  });

  assert.equal(estimateResult.isAvailable, true);
  assert.equal(estimateResult.ingredientsTotalPkr, 50);
  assert.notEqual(estimateResult.ingredientsTotalPkr, 70); // Never 350 * 50 / 250 = 70
});

test('Test 2: Multiple ingredients with different gram quantities calculate accurately with packaging total', () => {
  // Badam: 3800/kg, 50g -> 3800 * 50 / 1000 = 190
  // Pista: 5000/kg, 40g -> 5000 * 40 / 1000 = 200
  // Kaju: 3800/kg, 60g -> 3800 * 60 / 1000 = 228
  // Total ingredients per box: 190 + 200 + 228 = 618
  // For 5 boxes: ingredients = 618 * 5 = 3090
  // Packaging unit price: 150 -> 150 * 5 = 750
  // Estimated total: 3090 + 750 = 3840

  const recipe: RecipeIngredient[] = [
    { productId: 'badam', grams: 50 },
    { productId: 'pista', grams: 40 },
    { productId: 'kaju', grams: 60 },
  ];

  const result = calculateFilledGiftEstimate({
    packagingUnitPrice: 150,
    recipe,
    catalogProducts: PRODUCTS,
    requestedBoxes: 5,
  });

  assert.equal(result.isAvailable, true);
  assert.equal(result.ingredientLines.length, 3);
  assert.equal(result.ingredientLines[0].estimatePkr, 190 * 5);
  assert.equal(result.ingredientLines[1].estimatePkr, 200 * 5);
  assert.equal(result.ingredientLines[2].estimatePkr, 228 * 5);
  assert.equal(result.ingredientsTotalPkr, 3090);
  assert.equal(result.packagingTotalPkr, 750);
  assert.equal(result.estimatedTotalPkr, 3840);
  assert.equal(result.isEstimate, true);
});

test('Test 3: Changed kg rate updates estimate deterministically', () => {
  const pistaOriginal = PRODUCTS.find(p => p.id === 'pista')!;
  assert.equal(resolveAuthoritativeKgRate(pistaOriginal), 5000);

  const estimateBefore = calculateFilledGiftEstimate({
    recipe: [{ productId: 'pista', grams: 100 }],
    catalogProducts: PRODUCTS,
    requestedBoxes: 1,
  });
  // 5000 * 100 / 1000 = 500
  assert.equal(estimateBefore.estimatedTotalPkr, 500);

  // Update 1kg selling rate to 6000
  const pistaUpdated: Product = {
    ...pistaOriginal,
    prices: { ...pistaOriginal.prices, '1kg': 6000 },
    variants: pistaOriginal.variants?.map(v => (v.label === '1kg' ? { ...v, price: 6000 } : v)),
  };

  const estimateAfter = calculateFilledGiftEstimate({
    recipe: [{ productId: 'pista', grams: 100 }],
    catalogProducts: [pistaUpdated],
    requestedBoxes: 1,
  });
  // 6000 * 100 / 1000 = 600
  assert.equal(estimateAfter.estimatedTotalPkr, 600);
});

test('Test 4: Changing 250g/500g retail pack rates alone does NOT affect kilogram estimate', () => {
  const pistaOriginal = PRODUCTS.find(p => p.id === 'pista')!;

  const estimateBefore = calculateFilledGiftEstimate({
    recipe: [{ productId: 'pista', grams: 100 }],
    catalogProducts: PRODUCTS,
    requestedBoxes: 1,
  });
  assert.equal(estimateBefore.estimatedTotalPkr, 500);

  // Severely modify 250g and 500g pack rates while preserving 1kg rate at 5000
  const pistaRepricedPacks: Product = {
    ...pistaOriginal,
    prices: { ...pistaOriginal.prices, '250g': 2000, '500g': 4000 },
    variants: pistaOriginal.variants?.map(v => {
      if (v.label === '250g') return { ...v, price: 2000 };
      if (v.label === '500g') return { ...v, price: 4000 };
      return v;
    }),
  };

  const estimateAfter = calculateFilledGiftEstimate({
    recipe: [{ productId: 'pista', grams: 100 }],
    catalogProducts: [pistaRepricedPacks],
    requestedBoxes: 1,
  });

  // Estimate must remain strictly 500 PKR based on unchanged 1kg rate (5000)
  assert.equal(estimateAfter.estimatedTotalPkr, 500);
});

test('Test 5: Missing/disabled/invalid kg rate or absent recipe produces honest unpriced inquiry state', () => {
  const pistaOriginal = PRODUCTS.find(p => p.id === 'pista')!;

  // 1. Missing recipe
  const noRecipeResult = calculateFilledGiftEstimate({
    recipe: [],
    catalogProducts: PRODUCTS,
    requestedBoxes: 1,
  });
  assert.equal(noRecipeResult.isAvailable, false);
  assert.equal(noRecipeResult.unavailabilityReason, 'MISSING_RECIPE');
  assert.equal(noRecipeResult.estimatedTotalPkr, null);

  // 2. Disabled 1kg variant
  const disabledKgProduct: Product = {
    ...pistaOriginal,
    variants: pistaOriginal.variants?.map(v => (v.label === '1kg' ? { ...v, available: false } : v)),
  };
  assert.equal(resolveAuthoritativeKgRate(disabledKgProduct), null);

  const disabledResult = calculateFilledGiftEstimate({
    recipe: [{ productId: 'pista', grams: 50 }],
    catalogProducts: [disabledKgProduct],
    requestedBoxes: 1,
  });
  assert.equal(disabledResult.isAvailable, false);
  assert.equal(disabledResult.unavailabilityReason, 'UNAVAILABLE_KG_RATE');
  assert.equal(disabledResult.estimatedTotalPkr, null);

  // 3. One ingredient in mixture missing kg rate -> entire mixture fails closed
  const mixedCatalog: Product[] = [
    PRODUCTS.find(p => p.id === 'badam')!,
    disabledKgProduct, // pista is disabled
  ];
  const mixtureResult = calculateFilledGiftEstimate({
    recipe: [
      { productId: 'badam', grams: 50 },
      { productId: 'pista', grams: 50 },
    ],
    catalogProducts: mixedCatalog,
    requestedBoxes: 1,
  });
  assert.equal(mixtureResult.isAvailable, false);
  assert.equal(mixtureResult.unavailabilityReason, 'UNAVAILABLE_KG_RATE');
  assert.equal(mixtureResult.estimatedTotalPkr, null); // NEVER zero or partial sum!
});

test('Test 6: Standalone retail 250g/500g/1kg pack and custom-weight prices remain 100% unchanged', () => {
  const pista = PRODUCTS.find(p => p.id === 'pista')!;

  // Retail pack variants
  const v250g = resolveProductVariant(pista, '250g');
  assert.ok(v250g);
  assert.equal(v250g.price, 1250);

  const v500g = resolveProductVariant(pista, '500g');
  assert.ok(v500g);
  assert.equal(v500g.price, 2500);

  const v1kg = resolveProductVariant(pista, '1kg');
  assert.ok(v1kg);
  assert.equal(v1kg.price, 5000);

  // Custom-weight pricing (e.g. 300g)
  if (pista.allowCustomWeight) {
    const custom300 = resolveCustomWeight(pista, 'Custom 300g');
    assert.ok(custom300);
    assert.equal(custom300.isCustom, true);
    assert.equal(custom300.price, Math.round(300 * (pista.pricePer100g || 500) / 100));
  }
});

test('Test 7: Direct checkout of filled packaging variant is rejected with QUOTE_REQUIRED', () => {
  // Mock packaging product with filled and empty variants
  const mockPackagingBox: Product = {
    ...PRODUCTS.find(p => p.id === 'badam')!,
    id: 'bid-box-test',
    name_en: 'Test Luxury Bid Box',
    category: 'celebration-boxes',
    isBidBox: true,
    active: true,
    prices: {
      'Empty Pack (25 pcs)': 2500,
      'Filled with Luxury Dry Fruits': 12000,
      'Assorted Dry Fruits Selection': 15000,
    },
    variants: [
      { label: 'Empty Pack (25 pcs)', price: 2500, available: true },
      { label: 'Filled with Luxury Dry Fruits', price: 12000, available: true },
      { label: 'Assorted Dry Fruits Selection', price: 15000, available: true },
    ],
  };

  assert.equal(isFilledPackagingVariant('Filled with Luxury Dry Fruits'), true);
  assert.equal(isFilledPackagingVariant('Assorted Dry Fruits Selection'), true);
  assert.equal(isFilledPackagingVariant('Empty Pack (25 pcs)'), false);

  const products = [...PRODUCTS, mockPackagingBox];

  // Attempt direct checkout with a filled variant
  assert.throws(
    () => {
      validateAndPriceOrder({
        items: [
          {
            productId: 'bid-box-test',
            selectedWeight: 'Filled with Luxury Dry Fruits',
            quantity: 1,
            price: 12000,
          },
        ],
        shippingMethodId: 'standard',
        city: 'Lahore',
        products,
      });
    },
    (err: any) => {
      assert.equal(err.code, 'QUOTE_REQUIRED');
      return true;
    }
  );

  // Attempt direct checkout with assorted variant
  assert.throws(
    () => {
      validateAndPriceOrder({
        items: [
          {
            productId: 'bid-box-test',
            selectedWeight: 'Assorted Dry Fruits Selection',
            quantity: 1,
            price: 15000,
          },
        ],
        shippingMethodId: 'standard',
        city: 'Lahore',
        products,
      });
    },
    (err: any) => {
      assert.equal(err.code, 'QUOTE_REQUIRED');
      return true;
    }
  );
});

test('Test 8: Eligible empty packaging checkout succeeds through standard validation', () => {
  const mockPackagingBox: Product = {
    ...PRODUCTS.find(p => p.id === 'badam')!,
    id: 'bid-box-test-empty',
    name_en: 'Test Empty Bid Box',
    category: 'celebration-boxes',
    isBidBox: true,
    active: true,
    prices: {
      'Empty Pack (25 pcs)': 2500,
    },
    variants: [
      { label: 'Empty Pack (25 pcs)', price: 2500, available: true },
    ],
  };

  const products = [...PRODUCTS, mockPackagingBox];

  const orderResult = validateAndPriceOrder({
    items: [
      {
        productId: 'bid-box-test-empty',
        selectedWeight: 'Empty Pack (25 pcs)',
        quantity: 2, // 2 packs = 50 pcs
        price: 2500,
      },
    ],
    shippingMethodId: 'standard',
    city: 'Lahore',
    products,
  });

  assert.ok(orderResult);
  assert.equal(orderResult.items.length, 1);
  assert.equal(orderResult.items[0].price, 2500);
  assert.equal(orderResult.items[0].quantity, 2);
  assert.equal(orderResult.summary.subtotal, 5000);
});
