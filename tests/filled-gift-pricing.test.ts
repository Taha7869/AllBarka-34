import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import type { Product } from '../src/types';
import {
  calculateIngredientEstimate,
  calculateFilledGiftEstimate,
  resolveAuthoritativeKgRate,
  isFilledPackagingVariant,
  classifyPackagingVariant,
  packagingVariantRequiresInquiry,
  type RecipeIngredient,
} from '../src/lib/filledGiftPricing';
import { CUSTOM_HAMPER_PRODUCT_ID, HAMPER_BOXES } from '../src/lib/hamperCatalog';
import { BID_BOX_PRODUCTS } from '../src/data/products';
import { memoryFirestore } from './helpers/memoryFirestore';
import { createDurableOrder } from '../src/lib/orderDatabase';
import { quoteOrderForCustomer } from '../src/lib/orderQuote';
import {
  hashPayload,
  generateAuthoritativeWhatsAppMessage,
  SCHEMA_VERSION,
  type CanonicalOrder,
} from '../src/lib/serverOrderService';
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

test('Test 9: resolveAuthoritativeKgRate rejects calculated commerce derived from smaller base packs', () => {
  const calculatedFrom250g: Product = {
    ...PRODUCTS.find(p => p.id === 'badam')!,
    id: 'mock-calc-nut',
    commerce: {
      version: 1,
      kind: 'food',
      pricingMode: 'calculated',
      quantityMode: 'fixed',
      baseQuantity: 250,
      baseUnit: 'g',
      basePrice: 350,
      options: [
        { label: '250g', quantity: 250, unit: 'g', override: false, available: true, shippingWeightG: 250 },
        { label: '1kg', quantity: 1, unit: 'kg', override: false, available: true, shippingWeightG: 1000 },
      ],
      custom: null,
    },
    prices: {},
    variants: [],
  };

  // Base is 250g, not 1kg; even though 1kg option exists in calculated mode, base rate is NOT 1kg
  assert.equal(resolveAuthoritativeKgRate(calculatedFrom250g), null);

  // But if base is exactly 1000g / 1kg, it resolves cleanly
  const calculatedFrom1kg: Product = {
    ...calculatedFrom250g,
    commerce: {
      ...calculatedFrom250g.commerce!,
      baseQuantity: 1000,
      baseUnit: 'g',
      basePrice: 1400,
    },
  };
  assert.equal(resolveAuthoritativeKgRate(calculatedFrom1kg), 1400);
});

test('Test 10: resolveAuthoritativeKgRate ignores shipping mass (weightGrams: 1000)', () => {
  const shippingMassProduct: Product = {
    ...PRODUCTS.find(p => p.id === 'badam')!,
    id: 'mock-gift-pack',
    prices: { 'Gift Pack': 2500 },
    variants: [
      { label: 'Gift Pack', price: 2500, weightGrams: 1000, available: true },
    ],
  };

  // A variant named "Gift Pack" with weightGrams: 1000 must NEVER be treated as a 1kg food ingredient rate
  assert.equal(resolveAuthoritativeKgRate(shippingMassProduct), null);
});

test('Test 11: resolveAuthoritativeKgRate fails closed on conflicting rates or disabled variants', () => {
  // Conflicting prices: '1kg' is 1000, '1 kg' is 1200
  const conflictingPrices: Product = {
    ...PRODUCTS.find(p => p.id === 'badam')!,
    prices: { '1kg': 1000, '1 kg': 1200 },
    variants: [],
  };
  assert.equal(resolveAuthoritativeKgRate(conflictingPrices), null);

  // Disabled variant takes precedence and fails closed
  const disabledVariantProduct: Product = {
    ...PRODUCTS.find(p => p.id === 'badam')!,
    prices: { '1kg': 3800 },
    variants: [
      { label: '1kg', price: 3800, available: false },
    ],
  };
  assert.equal(resolveAuthoritativeKgRate(disabledVariantProduct), null);
});

test('Test 12: Incomplete estimate leaves estimatedTotalPkr null while exposing ingredientsSubtotalPkr', () => {
  const packagingProductWithoutPrice: Product = {
    ...PRODUCTS.find(p => p.id === 'badam')!,
    id: 'bid-box-unpriced-pkg',
    category: 'celebration-boxes',
    isBidBox: true,
    prices: {}, // Empty packaging price unknown
    variants: [],
  };

  const result = calculateFilledGiftEstimate({
    packagingProduct: packagingProductWithoutPrice,
    packagingRequired: true,
    recipe: [{ productId: 'badam', grams: 50 }],
    catalogProducts: PRODUCTS,
    requestedBoxes: 2,
  });

  // Must fail closed for total, but expose ingredientsSubtotalPkr
  assert.equal(result.isAvailable, false);
  assert.equal(result.unavailabilityReason, 'MISSING_PACKAGING_PRICE');
  assert.equal(result.estimatedTotalPkr, null);
  assert.equal(result.ingredientsAvailable, true);
  // Badam: 3800/kg * 50g * 2 boxes / 1000 = 380 PKR
  assert.equal(result.ingredientsSubtotalPkr, 380);
});

test('Test 13: Direct checkout of custom hampers is strictly rejected with QUOTE_REQUIRED without allowInquiryItems', () => {
  const hamper = {
    productId: CUSTOM_HAMPER_PRODUCT_ID,
    quantity: 1,
    hamperConfiguration: {
      version: 1,
      boxId: 'box-wood',
      selections: ['pista', 'kaju', 'badam', 'akhroot'],
      recipientName: 'Test Recipient',
      giftMessage: 'Best wishes',
    },
  };

  assert.throws(
    () => {
      validateAndPriceOrder({
        items: [hamper],
        shippingMethodId: 'standard',
        city: 'Lahore',
      });
    },
    (err: any) => {
      assert.equal(err.code, 'QUOTE_REQUIRED');
      return true;
    }
  );

  // When allowInquiryItems: true is explicitly passed, inquiry pricing succeeds
  const quoted = validateAndPriceOrder({
    items: [hamper],
    shippingMethodId: 'standard',
    city: 'Lahore',
    allowInquiryItems: true,
  });
  assert.ok(quoted);
  assert.equal(quoted.items[0].productId, CUSTOM_HAMPER_PRODUCT_ID);
});

test('Test 14: Canonical variant classification and inquiry guard defaults unknown packaging to inquiry', () => {
  const packagingProduct: Product = {
    ...PRODUCTS.find(p => p.id === 'badam')!,
    id: 'box-classified',
    category: 'celebration-boxes',
    isBidBox: true,
    filledRecipes: {
      'Special Recipe Tier': [{ productId: 'badam', grams: 50 }],
    },
    bidBoxConfig: {
      filledOptions: [{ variantKey: 'Configured Filled Option', label: 'Filled', price: 500 }],
      emptyTiers: [{ variantKey: 'Configured Empty Tier', qty: 25, unitPrice: 100, packPrice: 2500 }],
    } as any,
  };

  assert.equal(classifyPackagingVariant(packagingProduct, 'Special Recipe Tier'), 'filled');
  assert.equal(classifyPackagingVariant(packagingProduct, 'Configured Filled Option'), 'filled');
  assert.equal(classifyPackagingVariant(packagingProduct, 'Configured Empty Tier'), 'empty');
  assert.equal(classifyPackagingVariant(packagingProduct, 'Unknown Mystery Option'), 'unknown');

  // Unknown packaging options require inquiry (default-deny)
  assert.equal(packagingVariantRequiresInquiry(packagingProduct, 'Unknown Mystery Option'), true);
  assert.equal(packagingVariantRequiresInquiry(packagingProduct, 'Configured Empty Tier'), false);
  assert.equal(packagingVariantRequiresInquiry(packagingProduct, 'Configured Filled Option'), true);
});

function createMemoryCatalogStore() {
  const initialRecords: Record<string, unknown> = {};
  for (const product of [...PRODUCTS, ...BID_BOX_PRODUCTS]) {
    initialRecords[`products/${product.id}`] = product;
  }
  for (const box of HAMPER_BOXES) {
    initialRecords[`hamperBoxes/${box.id}`] = { ...box, active: true };
  }
  const fixture = memoryFirestore(initialRecords);
  fixture.db.doc = (path: string) => {
    const [collection, id] = path.split('/');
    return fixture.db.collection(collection).doc(id);
  };
  return fixture;
}

const standardCustomer = {
  name: 'Ahmed Khan',
  phone: '03001234567',
  address: 'House 12, Street 3, F-7/2',
  city: 'Islamabad',
  paymentMethod: 'cod',
  shippingMethodId: 'standard',
};

test('Test 15: Direct order creation fails with QUOTE_REQUIRED for filled packaging and custom hampers', async () => {
  const fixture = createMemoryCatalogStore();

  // A. Filled packaging item
  const filledPackagingItem = {
    productId: 'bid-box-umrah-tabarruk',
    selectedWeight: 'Filled Standard (Irani Dates, Badam, Kaju & Kishmish)',
    quantity: 25,
  };

  await assert.rejects(
    createDurableOrder({
      db: fixture.db,
      payload: { ...standardCustomer, items: [filledPackagingItem] },
      uid: null,
      idempotencyKey: 'test-15-filled-direct',
    }),
    (err: any) => {
      assert.equal(err.code, 'QUOTE_REQUIRED');
      return true;
    }
  );

  // B. Custom hamper item
  const hamperItem = {
    productId: CUSTOM_HAMPER_PRODUCT_ID,
    quantity: 1,
    hamperConfiguration: {
      version: 1,
      boxId: 'box-wood',
      selections: ['pista', 'kaju', 'badam', 'akhroot'],
      recipientName: 'Valued Recipient',
      giftMessage: 'Best wishes',
    },
  };

  await assert.rejects(
    createDurableOrder({
      db: fixture.db,
      payload: { ...standardCustomer, items: [hamperItem] },
      uid: null,
      idempotencyKey: 'test-15-hamper-direct',
    }),
    (err: any) => {
      assert.equal(err.code, 'QUOTE_REQUIRED');
      return true;
    }
  );

  // Verify zero order records were written
  const orderDocs = [...fixture.records.keys()].filter(k => k.startsWith('orders/'));
  assert.equal(orderDocs.length, 0);
});

test('Test 16: Client payload cannot bypass inquiry guard with omitted flags, true, false, strings, numbers, or aliases', async () => {
  const fixture = createMemoryCatalogStore();
  const filledPackagingItem = {
    productId: 'bid-box-umrah-tabarruk',
    selectedWeight: 'Filled Standard (Irani Dates, Badam, Kaju & Kishmish)',
    quantity: 25,
  };

  const bypassAttempts = [
    { allowInquiryItems: true },
    { allowInquiryItems: 'true' },
    { allowInquiryItems: 1 },
    { allowInquiryItems: false },
    { allowPackagingQuote: true },
    { allowPackagingQuote: 'true' },
    { allowPackagingQuote: 1 },
    { permitInquiry: true },
    { isQuoteRequest: true },
    { quoteApproved: true },
    { approvedByMerchant: true },
    { allowInquiry: true },
  ];

  for (let i = 0; i < bypassAttempts.length; i++) {
    const bypassPayload = {
      ...standardCustomer,
      items: [filledPackagingItem],
      ...bypassAttempts[i],
    };

    await assert.rejects(
      createDurableOrder({
        db: fixture.db,
        payload: bypassPayload,
        uid: null,
        idempotencyKey: `test-16-bypass-${i}`,
      }),
      (err: any) => {
        assert.equal(err.code, 'QUOTE_REQUIRED', `Attempt ${JSON.stringify(bypassAttempts[i])} must be rejected with QUOTE_REQUIRED`);
        return true;
      }
    );
  }

  // Verify no orders were created
  const orderDocs = [...fixture.records.keys()].filter(k => k.startsWith('orders/'));
  assert.equal(orderDocs.length, 0);
});

test('Test 17: Quoting an order and submitting with matching expectedFinalTotal does NOT allow order creation', async () => {
  const fixture = createMemoryCatalogStore();
  const filledPackagingItem = {
    productId: 'bid-box-umrah-tabarruk',
    selectedWeight: 'Filled Standard (Irani Dates, Badam, Kaju & Kishmish)',
    quantity: 25,
  };

  const quotePayload = {
    ...standardCustomer,
    items: [filledPackagingItem],
  };

  // 1. Quoting succeeds through legitimate quote path
  const quote = await quoteOrderForCustomer(fixture.db, quotePayload);
  assert.ok(quote.totals.total > 0);

  // 2. Submitting order with exact matching expectedFinalTotal still fails with QUOTE_REQUIRED
  await assert.rejects(
    createDurableOrder({
      db: fixture.db,
      payload: quotePayload,
      uid: null,
      expectedFinalTotal: quote.totals.total,
      idempotencyKey: 'test-17-matching-quote-attempt',
    }),
    (err: any) => {
      assert.equal(err.code, 'QUOTE_REQUIRED');
      return true;
    }
  );

  // 3. Submitting order with matching expectedFinalTotal AND allowInquiryItems: true still fails
  await assert.rejects(
    createDurableOrder({
      db: fixture.db,
      payload: { ...quotePayload, allowInquiryItems: true },
      uid: null,
      expectedFinalTotal: quote.totals.total,
      idempotencyKey: 'test-17-matching-quote-bypass-attempt',
    }),
    (err: any) => {
      assert.equal(err.code, 'QUOTE_REQUIRED');
      return true;
    }
  );
});

test('Test 18: Empty packaging and ordinary products continue to create orders normally without inquiry rejection', async () => {
  const fixture = createMemoryCatalogStore();

  // A. Ordinary food item (1kg badam)
  const foodPayload = {
    ...standardCustomer,
    items: [
      {
        productId: 'badam',
        selectedWeight: '1kg',
        quantity: 2,
      },
    ],
  };

  const foodOrder = await createDurableOrder({
    db: fixture.db,
    payload: foodPayload,
    uid: null,
    idempotencyKey: 'test-18-food-order',
  });

  assert.ok(foodOrder.orderId);
  assert.equal(foodOrder.status, 'ORDER_RECEIVED');
  assert.equal(foodOrder.orderType, 'ORDER');
  assert.ok(fixture.records.has(`orders/${foodOrder.orderId}`));

  // B. Eligible empty packaging item (Empty Box 25 pcs)
  const emptyPackagingPayload = {
    ...standardCustomer,
    items: [
      {
        productId: 'bid-box-umrah-tabarruk',
        selectedWeight: 'Empty Pack (25 pcs)',
        quantity: 25,
      },
    ],
  };

  const emptyBoxOrder = await createDurableOrder({
    db: fixture.db,
    payload: emptyPackagingPayload,
    uid: null,
    idempotencyKey: 'test-18-empty-box-order',
  });

  assert.ok(emptyBoxOrder.orderId);
  assert.equal(emptyBoxOrder.status, 'ORDER_RECEIVED');
  assert.equal(emptyBoxOrder.orderType, 'ORDER');
  assert.ok(fixture.records.has(`orders/${emptyBoxOrder.orderId}`));
});

test('Test 19: Idempotency replays of already-persisted orders succeed without re-evaluating inquiry guards', async () => {
  const fixture = createMemoryCatalogStore();
  const filledPackagingItem = {
    productId: 'bid-box-umrah-tabarruk',
    selectedWeight: 'Filled Standard (Irani Dates, Badam, Kaju & Kishmish)',
    quantity: 25,
  };

  const payload = {
    ...standardCustomer,
    items: [filledPackagingItem],
  };

  // Obtain quote to get validated items & totals for seeding
  const quote = await quoteOrderForCustomer(fixture.db, payload);

  const historicalOrderId = 'AB-20261026-HIST01';
  const idempotencyKey = 'historical-filled-idempotency-key';
  const nowMs = 1792999900000;
  const nowIso = new Date(nowMs).toISOString();

  const historicalOrder: CanonicalOrder = {
    schemaVersion: SCHEMA_VERSION,
    orderId: historicalOrderId,
    source: 'website',
    createdAt: nowIso,
    createdAtMs: nowMs,
    updatedAt: nowIso,
    updatedAtMs: nowMs,
    status: 'ORDER_RECEIVED',
    orderType: 'ORDER',
    paymentStatus: 'UNPAID',
    paymentMethod: 'cod',
    uid: null,
    isWholesale: false,
    claimTokenHash: null,
    claimTokenExpiry: null,
    claimStatus: null,
    customer: {
      name: standardCustomer.name,
      phone: standardCustomer.phone,
      address: standardCustomer.address,
      city: standardCustomer.city,
    },
    gifting: {
      giftWrapping: false,
      giftWrapFee: 0,
    },
    items: quote.items,
    totals: quote.totals,
    promoCode: null,
    discountAmount: 0,
    freeShipping: false,
    freeGiftWrap: false,
    freeGift: false,
    isQuoteRequest: false,
    rewardId: null,
    rewardDiscount: 0,
    earnedPoints: 0,
    pointsAwarded: false,
  };

  fixture.records.set(`orders/${historicalOrderId}`, historicalOrder);
  fixture.records.set(`checkoutIntents/${idempotencyKey}`, {
    idempotencyKey,
    orderId: historicalOrderId,
    payloadHash: hashPayload(payload),
    createdAt: nowMs,
    response: {
      orderId: historicalOrderId,
      status: 'ORDER_RECEIVED',
      orderType: 'ORDER',
      whatsappMessage: generateAuthoritativeWhatsAppMessage(historicalOrder),
      totals: quote.totals,
      items: quote.items,
      claimToken: null,
      uid: null,
    },
  });

  // Replaying the submission with the same idempotency key succeeds without throwing QUOTE_REQUIRED
  const replayed = await createDurableOrder({
    db: fixture.db,
    payload,
    uid: null,
    idempotencyKey,
  });

  assert.equal(replayed.isDuplicate, true);
  assert.equal(replayed.orderId, historicalOrderId);
  assert.equal(replayed.status, 'ORDER_RECEIVED');
  assert.match(replayed.whatsappMessage, /ALLBARKA — ORDER CONFIRMATION/);
  assert.match(replayed.whatsappMessage, /Umrah & Hajj Tabarruk Box Set/);
});
