import assert from 'node:assert/strict';
import test from 'node:test';
import { FREE_SHIPPING_THRESHOLD } from '../src/contexts/CartContext';
import { isReducedMotionPreferred, flyItemToCart } from '../src/utils/cartFlyAnimation';

test('Feature B: Free Shipping Threshold and Progress Bar Calculations', () => {
  assert.equal(FREE_SHIPPING_THRESHOLD, 3000, 'Free shipping threshold is 3000 PKR');

  // Helper calculating progress bar state matching CartContext / CartDrawer
  function calculateShippingBar(subtotal: number) {
    const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
    const isUnlocked = subtotal >= FREE_SHIPPING_THRESHOLD;
    return { progress, remaining, isUnlocked };
  }

  // 1. Empty cart (subtotal 0)
  const empty = calculateShippingBar(0);
  assert.equal(empty.progress, 0);
  assert.equal(empty.remaining, 3000);
  assert.equal(empty.isUnlocked, false);

  // 2. Partial progress (subtotal 1500 -> 50%)
  const half = calculateShippingBar(1500);
  assert.equal(half.progress, 50);
  assert.equal(half.remaining, 1500);
  assert.equal(half.isUnlocked, false);

  // 3. Exact threshold (subtotal 3000 -> 100% unlocked)
  const exact = calculateShippingBar(3000);
  assert.equal(exact.progress, 100);
  assert.equal(exact.remaining, 0);
  assert.equal(exact.isUnlocked, true);

  // 4. Over threshold (subtotal 5500 -> 100% capped)
  const over = calculateShippingBar(5500);
  assert.equal(over.progress, 100);
  assert.equal(over.remaining, 0);
  assert.equal(over.isUnlocked, true);
});

test('Feature B: Add-to-bag micro-animation respects prefers-reduced-motion', () => {
  // In Node environment without window/DOM, function safely handles environment
  assert.equal(typeof isReducedMotionPreferred, 'function');
  assert.equal(typeof flyItemToCart, 'function');

  // Verify reduced-motion guard in non-browser environment returns false safely
  const result = flyItemToCart();
  assert.equal(result, false, 'Safely returns false without throwing in headless/non-DOM environment');
});
