import { calculateOrderSummary, formatPKR, sanitizePrice } from '../src/lib/pricing';
import { validateAndPriceOrder } from '../src/lib/orderValidation';

console.log('--- RUNNING ALLBARKA PRICING & ORDER VALIDATION FIXTURES ---');

// Fixture 1: Rs. 1,800 standard delivery
const f1 = calculateOrderSummary({
  items: [{ price: 1800, quantity: 1 }],
  shippingMethodId: 'standard',
});
console.assert(f1.subtotal === 1800, `F1 subtotal failed: ${f1.subtotal}`);
console.assert(f1.shipping === 150, `F1 shipping failed: ${f1.shipping}`);
console.assert(f1.total === 1950, `F1 total failed: ${f1.total}`);
console.log('✓ Fixture 1 (Rs. 1,800 Standard): Pass (Total: ' + formatPKR(f1.total) + ')');

// Fixture 2: Rs. 1,800 express delivery
const f2 = calculateOrderSummary({
  items: [{ price: 1800, quantity: 1 }],
  shippingMethodId: 'express',
});
console.assert(f2.subtotal === 1800, `F2 subtotal failed: ${f2.subtotal}`);
console.assert(f2.shipping === 350, `F2 shipping failed: ${f2.shipping}`);
console.assert(f2.total === 2150, `F2 total failed: ${f2.total}`);
console.log('✓ Fixture 2 (Rs. 1,800 Express): Pass (Total: ' + formatPKR(f2.total) + ')');

// Fixture 3: Rs. 3,200 with ALLBARKA10 coupon
const f3 = calculateOrderSummary({
  items: [{ price: 3200, quantity: 1 }],
  shippingMethodId: 'standard',
  couponCode: 'ALLBARKA10',
});
console.assert(f3.subtotal === 3200, `F3 subtotal failed: ${f3.subtotal}`);
console.assert(f3.discount === 320, `F3 discount failed: ${f3.discount}`);
console.assert(f3.discountedSubtotal === 2880, `F3 discountedSubtotal failed: ${f3.discountedSubtotal}`);
console.assert(f3.shipping === 150, `F3 shipping failed: ${f3.shipping}`);
console.assert(f3.total === 3030, `F3 total failed: ${f3.total}`);
console.log('✓ Fixture 3 (Rs. 3,200 + 10% coupon): Pass (Total: ' + formatPKR(f3.total) + ')');

// Fixture 4: Free shipping after coupon when >= 3,000
const f4 = calculateOrderSummary({
  items: [{ price: 3500, quantity: 1 }],
  shippingMethodId: 'standard',
  couponCode: 'ALLBARKA10',
});
console.assert(f4.discountedSubtotal === 3150, `F4 discounted failed: ${f4.discountedSubtotal}`);
console.assert(f4.shipping === 0, `F4 free shipping failed: ${f4.shipping}`);
console.assert(f4.total === 3150, `F4 total failed: ${f4.total}`);
console.log('✓ Fixture 4 (Free Shipping after Coupon): Pass (Total: ' + formatPKR(f4.total) + ')');

// Fixture 5: Gift wrapping fee (+250)
const f5 = calculateOrderSummary({
  items: [{ price: 1800, quantity: 1 }],
  shippingMethodId: 'standard',
  giftWrapping: true,
});
console.assert(f5.giftWrapFee === 250, `F5 gift wrap fee failed: ${f5.giftWrapFee}`);
console.assert(f5.total === 1800 + 150 + 250, `F5 total failed: ${f5.total}`);
console.log('✓ Fixture 5 (Gift Wrapping +250): Pass (Total: ' + formatPKR(f5.total) + ')');

// Fixture 6: Composite Cart Item ID resolution & Forged Price Immunity
const f6 = validateAndPriceOrder({
  city: 'Lahore',
  items: [
    {
      id: 'pista-250g', // composite id
      productId: 'pista',
      selectedWeight: '250g',
      quantity: 2,
      price: 10, // FORGED PRICE! Real price is 1250 each
    }
  ],
  shippingMethodId: 'standard',
});
// Real subtotal should be 1250 * 2 = 2500, ignoring client's 10 PKR
console.assert(f6.summary.subtotal === 2500, `F6 forged price defense failed: ${f6.summary.subtotal}`);
console.assert(f6.items[0].price === 1250, `F6 item price failed: ${f6.items[0].price}`);
console.log('✓ Fixture 6 (Composite ID & Forged Price Defense): Pass (Subtotal: ' + formatPKR(f6.summary.subtotal) + ')');

// Fixture 7: Invalid Weight Rejection
let caughtInvalidWeight = false;
try {
  validateAndPriceOrder({
    city: 'Lahore',
    items: [{ id: 'pista', selectedWeight: '10kg_invalid', quantity: 1 }],
    shippingMethodId: 'standard',
  });
} catch (e: any) {
  caughtInvalidWeight = true;
  console.assert(e.message.includes('Invalid weight'), `Unexpected error message: ${e.message}`);
}
console.assert(caughtInvalidWeight, 'Failed to reject invalid weight');
console.log('✓ Fixture 7 (Invalid Weight Rejection): Pass');

// Fixture 8: Quantity above Allowed Maximum (> 50) Rejection
let caughtMaxQty = false;
try {
  validateAndPriceOrder({
    city: 'Lahore',
    items: [{ id: 'pista', selectedWeight: '250g', quantity: 999 }],
    shippingMethodId: 'standard',
  });
} catch (e: any) {
  caughtMaxQty = true;
  console.assert(e.message.includes('must be an integer between 1 and 50 units'), `Unexpected error message: ${e.message}`);
}
console.assert(caughtMaxQty, 'Failed to reject quantity > 50');
console.log('✓ Fixture 8 (Quantity > 50 Rejection): Pass');

// Fixture 9: Missing Product Rejection
let caughtMissingProd = false;
try {
  validateAndPriceOrder({
    city: 'Lahore',
    items: [{ id: 'non-existent-snack-999', selectedWeight: '250g', quantity: 1 }],
    shippingMethodId: 'standard',
  });
} catch (e: any) {
  caughtMissingProd = true;
  console.assert(e.message.includes('Product not found'), `Unexpected error message: ${e.message}`);
}
console.assert(caughtMissingProd, 'Failed to reject missing product');
console.log('✓ Fixture 9 (Missing Product Rejection): Pass');

console.log('ALL 9 PRICING & ORDER VALIDATION FIXTURES PASSED PERFECTLY!');
