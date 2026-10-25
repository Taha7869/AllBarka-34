import test from 'node:test';
import assert from 'node:assert/strict';
import { convertMeasurement, calculatedUnitPrice, prepareCommercePrices, validateProductCommerce, validateProductAttributes, type ProductCommerce } from '../src/lib/productCommerce';
import { normalizeCommerceInput, validateDynamicProduct, stripPrivateProductFields } from '../src/lib/catalogSchema';
import { resolveCustomWeight, resolveProductVariant, supportsCustomWeight } from '../src/lib/productVariants';
import { validateAndPriceOrder } from '../src/lib/orderValidation';
import { PRODUCTS } from '../src/data/products';
import { calculateMinOrderQuantityUnits, getPackagingMoqDisplay } from '../src/lib/packagingMoq';
import { resolveInquiryProductVariant } from '../src/lib/inquiryResolution';
import { resolveCelebrationCardVariant } from '../src/lib/packagingClassification';
import { formatProductPriceBasis } from '../src/lib/aiBuddyResolution';

function configuration(overrides: Partial<ProductCommerce> = {}): ProductCommerce {
  return { version: 1, kind: 'food', pricingMode: 'calculated', quantityMode: 'both', baseQuantity: 1,
    baseUnit: 'kg', basePrice: 2000,
    options: [{ label: '250g', quantity: 250, unit: 'g', override: false, available: true, shippingWeightG: null },
      { label: '500g', quantity: 500, unit: 'g', override: true, available: true, shippingWeightG: null }],
    custom: { unit: 'g', min: 125, max: 2125, step: 100, shippingWeightGPerUnit: null }, ...overrides };
}
function product(overrides: Record<string, unknown> = {}) {
  return validateDynamicProduct(normalizeCommerceInput({ id: 'owner-almonds', name_en: 'Owner almonds', name_ur: '', name_ar: '',
    desc_en: 'Owner-written product information.', desc_ur: '', desc_ar: '', category: 'nuts', status: 'published',
    image: '/images/product-placeholder.svg', imageName: null, commerce: configuration(), prices: { '500g': 950 }, ...overrides }));
}

test('measurement conversion keeps mass, volume and individual pack counts distinct', () => {
  assert.equal(convertMeasurement(2500, 'mg', 'g'), 2.5);
  assert.equal(convertMeasurement(1.25, 'kg', 'g'), 1250);
  assert.equal(convertMeasurement(1.5, 'L', 'ml'), 1500);
  assert.throws(() => convertMeasurement(100, 'ml', 'g'), /INCOMPATIBLE_MEASUREMENT/);
  assert.throws(() => convertMeasurement(1, 'pack', 'piece'), /INCOMPATIBLE_MEASUREMENT/);
  assert.throws(() => convertMeasurement(-1, 'g', 'kg'));
});
test('base-rate calculation rounds once to a whole PKR and rejects zero/invalid rates', () => {
  assert.equal(calculatedUnitPrice(configuration(), 250, 'g'), 500);
  assert.equal(calculatedUnitPrice({ baseQuantity: 100, baseUnit: 'g', basePrice: 101 }, 125, 'g'), 126);
  assert.equal(calculatedUnitPrice({ baseQuantity: 0.2, baseUnit: 'g', basePrice: 7 }, 0.3, 'g'), 11);
  assert.throws(() => calculatedUnitPrice({ baseQuantity: 0, baseUnit: 'g', basePrice: 100 }, 2, 'g'), /BASE_RATE_REQUIRED/);
  assert.throws(() => calculatedUnitPrice(configuration(), 500, 'ml'), /INCOMPATIBLE_MEASUREMENT/);
});
test('explicit manual override survives calculation and saved canonical prices are not compounded', () => {
  const p = product();
  assert.deepEqual(p.prices, { '250g': 500, '500g': 950 });
  assert.deepEqual(p.shippingWeights, { '250g': 250, '500g': 500 });
  const again = validateDynamicProduct(p);
  assert.deepEqual(again.prices, p.prices);
  assert.equal(again.name_ur, '');
  assert.equal(again.desc_ar, '');
  const resaved = prepareCommercePrices({ ...p });
  assert.deepEqual(resaved.prices, p.prices);
});
test('manual prices are required, duplicate labels and mismatched automatic dimensions are rejected', () => {
  assert.throws(() => product({ prices: {} }), /OPTION_PRICE_REQUIRED/);
  assert.throws(() => validateProductCommerce(configuration({ options: [...configuration().options, configuration().options[0]] })), /INVALID_COMMERCE_LABEL/);
  assert.throws(() => validateProductCommerce(configuration({ baseUnit: 'ml' })), /INCOMPATIBLE_MEASUREMENT/);
  assert.throws(() => validateProductCommerce(configuration({ options: [{ ...configuration().options[0], unit: 'piece', quantity: 1.2 }] })), /INVALID_COUNT_QUANTITY/);
});
test('custom quantity validates its configured offset, unit and increment on the server', () => {
  const p = product();
  assert.equal(supportsCustomWeight(p), true);
  assert.equal(resolveCustomWeight(p, 'Custom 225g').price, 450);
  assert.equal(resolveCustomWeight(p, 225).weightGrams, 225);
  assert.throws(() => resolveCustomWeight(p, 200), /INVALID_CUSTOM_QUANTITY/);
  assert.throws(() => resolveCustomWeight(p, '225ml'), /INVALID_CUSTOM_QUANTITY/);
  assert.throws(() => resolveCustomWeight(p, 'Custom 2225g'), /INVALID_CUSTOM_QUANTITY/);
  assert.equal(resolveProductVariant(p, 'Custom 225g')?.label, 'Custom 225g');
});
test('volume options need approved shipping mass except the retained oil billing convention', () => {
  const commerce = configuration({ kind: 'liquid', baseUnit: 'L', baseQuantity: 1, basePrice: 1000,
    options: [{ label: '500ml', unit: 'ml', quantity: 500, override: false, available: true, shippingWeightG: null }],
    custom: { unit: 'ml', min: 100, max: 1000, step: 100, shippingWeightGPerUnit: null } });
  assert.throws(() => product({ category: 'essentials', commerce }), /PUBLISH_SHIPPING_REQUIRED/);
  const oil = product({ category: 'oils', commerce });
  assert.equal(resolveProductVariant(oil, '500ml')?.weightGrams, 500);
  assert.equal(resolveCustomWeight(oil, 'Custom 200ml').price, 200);
  const explicit = product({ category: 'essentials', commerce: { ...commerce,
    options: [{ ...commerce.options[0], shippingWeightG: 700 }], custom: { ...commerce.custom!, shippingWeightGPerUnit: 1.4 } } });
  assert.equal(resolveCustomWeight(explicit, 200).weightGrams, 280);
});
test('custom-only products expose their minimum priced selection without accepting obsolete fixed labels', () => {
  const p = product({ commerce: configuration({ quantityMode: 'custom', options: [] }) });
  assert.deepEqual(p.prices, { 'Custom 125g': 250 });
  assert.equal(resolveProductVariant(p, 'Custom 225g')?.price, 450);
  assert.equal(resolveProductVariant(p, '250g'), null);
});
test('draft or archived products cannot be bought by guessing their ID even with active=true', () => {
  for (const status of ['draft', 'archived'] as const) {
    const p = { ...product(), status, active: true };
    assert.equal(resolveProductVariant(p, '250g'), null);
    assert.equal(supportsCustomWeight(p), false);
    assert.throws(() => validateAndPriceOrder({ products: [p], items: [{ productId: p.id, selectedWeight: '250g', quantity: 1 }],
      city: 'Lahore', shippingMethodId: 'standard', isWholesale: false, giftWrapping: false }));
  }
});
test('unpriced drafts save without fake rates; publishing requires complete content and images', () => {
  const draft = product({ status: 'draft', image: null, desc_en: '', prices: {}, commerce: configuration({ pricingMode: 'manual', quantityMode: 'fixed', options: [], custom: null }) });
  assert.deepEqual(draft.prices, {});
  assert.throws(() => validateDynamicProduct({ ...draft, status: 'published' }), /PRODUCT_REQUIRES_PRICING|PUBLISH_CONTENT_REQUIRED/);
  assert.throws(() => product({ image: null }), /PUBLISH_IMAGE_REQUIRED/);
  assert.throws(() => product({ image: 'javascript:alert(1)' }), /INVALID_MEDIA_URL/);
  const incomplete = product({ status: 'draft', commerce: configuration({ pricingMode: 'manual', quantityMode: 'fixed', custom: null }), prices: { '250g': 500 } });
  assert.throws(() => validateDynamicProduct({ ...incomplete, status: 'published' }), /OPTION_PRICE_REQUIRED/);
});
test('published inquiry-only items do not need invented rates or a completed base price', () => {
  const p = product({ orderMode: 'inquiry_quote', prices: {}, commerce: configuration({ pricingMode: 'calculated', quantityMode: 'fixed',
    basePrice: null, baseQuantity: null, options: [], custom: null }) });
  assert.equal(p.active, true);
  assert.equal(p.quoteOnly, true);
  assert.deepEqual(p.prices, {});
  assert.equal(resolveProductVariant(p, '250g'), null);
});
test('packaging pack counts are explicit and the existing MOQ formula uses actual pieces', () => {
  const commerce = configuration({ kind: 'packaging', pricingMode: 'manual', quantityMode: 'fixed', basePrice: null, baseQuantity: null, baseUnit: 'pack', custom: null,
    options: [{ label: '1 pack', quantity: 1, unit: 'pack', override: false, available: true, shippingWeightG: 500, piecesPerPack: 10 }] });
  const p = product({ category: 'merchant-packaging', commerce, prices: { '1 pack': 1000 }, preparationDays: 10 });
  assert.equal(calculateMinOrderQuantityUnits(p, '1 pack'), 3);
  assert.equal(getPackagingMoqDisplay(p, '1 pack').totalPieces, 30);
  assert.equal(p.isBidBox, true);
  assert.equal(resolveCelebrationCardVariant(p, 'empty').piecesPerPack, 10);
  const inquiry = resolveInquiryProductVariant({ catalog: [p], productId: p.id, requestedVariantLabel: '1 pack', boxMode: 'empty', quantity: 3 });
  assert.equal(inquiry.totalPieces, 30);
  assert.equal(inquiry.perPiecePrice, 100);
  assert.match(formatProductPriceBasis(p, '1 pack', 1000), /10 pcs/);
  const uncounted = { ...commerce, options: [{ ...commerce.options[0], piecesPerPack: undefined }] };
  assert.throws(() => product({ category: 'merchant-packaging', commerce: uncounted, prices: { '1 pack': 1000 }, preparationDays: 10 }), /PUBLISH_PIECES_PER_PACK_REQUIRED/);
});
test('attribute types and option values are validated, private nested fields are not copied', () => {
  const [attribute] = validateProductAttributes([{ key: 'grade', label_en: 'Grade', label_ur: '', label_ar: '', type: 'select',
    required: true, options: ['A', 'B'], value: 'A', supplierSecret: 'private' }]);
  assert.equal((attribute as any).supplierSecret, undefined);
  assert.throws(() => validateProductAttributes([{ ...attribute, value: 'C' }]), /INVALID_ATTRIBUTE_VALUE/);
  const p = product({ attributes: [attribute], seo: { title_en: 'Owner SEO title', description_ur: '' }, supplierCost: 123 });
  const safe = stripPrivateProductFields(p);
  assert.equal(safe.supplierCost, undefined);
  assert.equal(safe.seo?.title_en, 'Owner SEO title');
  assert.equal(safe.commerce?.basePrice, 2000);
  assert.throws(() => product({ seo: { supplierCost: 'private' } }), /INVALID_PRODUCT_SEO/);
});
test('authoritative checkout ignores customer prices for calculated fixed and custom selections', () => {
  const p = product();
  const order = validateAndPriceOrder({ products: [p], items: [{ productId: p.id, selectedWeight: 'Custom 225g', quantity: 2, price: 1 }],
    city: 'Lahore', shippingMethodId: 'standard', isWholesale: false, giftWrapping: false });
  assert.equal(order.items[0].price, 450);
  assert.equal(order.summary.subtotal, 900);
  const fixed = validateAndPriceOrder({ products: [p], items: [{ productId: p.id, selectedWeight: '500g', quantity: 1, price: 1 }],
    city: 'Lahore', shippingMethodId: 'standard', isWholesale: false, giftWrapping: false });
  assert.equal(fixed.items[0].price, 950);
});
test('legacy gram rounding and oil portions remain unchanged without new configuration', () => {
  const original = PRODUCTS.find(p => p.allowCustomWeight && p.pricePer100g && p.category !== 'oils')!;
  assert.ok(original);
  const custom = resolveCustomWeight(original, 150);
  assert.equal(custom.price, Math.ceil((original.pricePer100g! * 1.5) / 5) * 5);
  assert.throws(() => resolveCustomWeight(original, 125));
  const oil = PRODUCTS.find(p => p.category === 'oils' && p.prices['100ml'])!;
  assert.equal(resolveProductVariant(oil, '100ml')?.weightGrams, 100);
});
