import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BoxLidReveal, { isBoxOrBundleProduct } from '../src/components/BoxLidReveal';

test('isBoxOrBundleProduct identifies gift boxes, celebration boxes, and bundles only', () => {
  assert.equal(isBoxOrBundleProduct({ id: 'bundle-chilgoza-heirloom', category: 'bundles', isBundle: true }), true);
  assert.equal(isBoxOrBundleProduct({ id: 'gift-condolence-visit', category: 'gift-boxes' }), true);
  assert.equal(isBoxOrBundleProduct({ id: 'bid-box-card-nikkah', category: 'celebration-boxes', isBidBox: true }), true);
  assert.equal(isBoxOrBundleProduct({ id: 'gift-custom-hamper', category: 'nuts' }), true);

  // Regular single pantry items must NOT trigger lid animation
  assert.equal(isBoxOrBundleProduct({ id: 'badam', category: 'nuts' }), false);
  assert.equal(isBoxOrBundleProduct({ id: 'murabba-saib', category: 'murabba-jaat' }), false);
  assert.equal(isBoxOrBundleProduct({ id: 'ajwa-dates', category: 'dates' }), false);
  assert.equal(isBoxOrBundleProduct(null), false);
});

test('BoxLidReveal renders non-interactive aria-hidden lid overlay for boxes and disappears completely under reduced motion', () => {
  const box = { id: 'bundle-chilgoza-heirloom', category: 'bundles', isBundle: true };

  const normalHtml = renderToStaticMarkup(
    <BoxLidReveal product={box} reducedMotionOverride={false} />,
  );
  assert.match(normalHtml, /data-testid="box-lid-reveal"/);
  assert.match(normalHtml, /aria-hidden="true"/);
  assert.match(normalHtml, /pointer-events-none/);
  assert.match(normalHtml, /motion-reduce:hidden/);

  // Reduced motion disables the animation completely (renders nothing)
  const reducedHtml = renderToStaticMarkup(
    <BoxLidReveal product={box} reducedMotionOverride={true} />,
  );
  assert.equal(reducedHtml, '');

  // Regular product renders nothing even when motion is allowed
  const singleItemHtml = renderToStaticMarkup(
    <BoxLidReveal product={{ id: 'badam', category: 'nuts' }} reducedMotionOverride={false} />,
  );
  assert.equal(singleItemHtml, '');
});
