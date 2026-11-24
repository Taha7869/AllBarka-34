import assert from 'node:assert/strict';
import test from 'node:test';
import type { NavigateFunction } from 'react-router-dom';
import {
  PRODUCT_HERO_TRANSITION_NAME,
  claimProductTransitionTarget,
  claimReturnCardTransitionTarget,
  clearProductViewTransition,
  navigateBackFromProductWithTransition,
  navigateToProductWithTransition,
  shouldInterceptLinkClick,
  supportsViewTransitions,
} from '../src/lib/viewTransitions';

function createMockImg(width = 240, height = 180) {
  const style: Record<string, string> = {};
  const dataset: Record<string, string> = {};
  return {
    tagName: 'IMG',
    isConnected: true,
    style,
    dataset,
    getBoundingClientRect: () => ({ width, height, top: 0, left: 0, right: width, bottom: height }),
  } as unknown as HTMLImageElement;
}

test('shouldInterceptLinkClick ignores modifier clicks and non-primary buttons', () => {
  assert.equal(shouldInterceptLinkClick({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }), true);
  assert.equal(shouldInterceptLinkClick({ defaultPrevented: true, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }), false);
  assert.equal(shouldInterceptLinkClick({ defaultPrevented: false, button: 1, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }), false);
  assert.equal(shouldInterceptLinkClick({ defaultPrevented: false, button: 0, metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }), false);
  assert.equal(shouldInterceptLinkClick({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: true, shiftKey: false, altKey: false }), false);
  assert.equal(shouldInterceptLinkClick({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: true, altKey: false }), false);
});

test('falls back cleanly to normal navigation when View Transitions API is unsupported', () => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  try {
    (globalThis as Record<string, unknown>).document = undefined;
    (globalThis as Record<string, unknown>).window = undefined;
    assert.equal(supportsViewTransitions(), false);

    const calls: unknown[] = [];
    const nav = ((to: unknown) => { calls.push(to); }) as unknown as NavigateFunction;
    const used = navigateToProductWithTransition(nav, '/product/pista', { productId: 'pista', sourceElement: null });
    assert.equal(used, false);
    assert.deepEqual(calls, ['/product/pista']);
  } finally {
    (globalThis as Record<string, unknown>).document = prevDoc;
    (globalThis as Record<string, unknown>).window = prevWin;
    clearProductViewTransition();
  }
});

test('reverse back transition sets view-transition-name uniquely on one element at a time and clears after finished', async () => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;

  const pdpImg = createMockImg(480, 480);
  const cardImgA = createMockImg(240, 180);
  const cardImgB = createMockImg(240, 180);
  const allImgs = [pdpImg, cardImgA, cardImgB];

  let resolveFinished!: () => void;
  const finished = new Promise<void>((resolve) => { resolveFinished = resolve; });

  const calls: unknown[] = [];
  const nav = ((to: unknown) => {
    calls.push(to);
    // Simulate returning collection mounting two cards with the same product ID
    const claimedA = claimReturnCardTransitionTarget('pista', cardImgA);
    const claimedB = claimReturnCardTransitionTarget('pista', cardImgB);
    assert.equal(claimedA, true, 'first matching card image should claim reverse transition');
    assert.equal(claimedB, false, 'duplicate card image must NEVER claim simultaneously');
  }) as unknown as NavigateFunction;

  try {
    (globalThis as Record<string, unknown>).window = {
      matchMedia: () => ({ matches: false }),
    };
    (globalThis as Record<string, unknown>).document = {
      querySelectorAll: () => allImgs.filter((img) => img.dataset.vtActive === 'true'),
      startViewTransition: (cb: () => void | Promise<void>) => {
        // Before callback: ONLY pdpImg holds the transition name
        assert.equal(pdpImg.style.viewTransitionName, PRODUCT_HERO_TRANSITION_NAME);
        assert.equal(cardImgA.style.viewTransitionName || '', '');
        assert.equal(cardImgB.style.viewTransitionName || '', '');
        void cb();
        // After callback: ONLY cardImgA holds the transition name (pdpImg cleared!)
        assert.equal(pdpImg.style.viewTransitionName || '', '');
        assert.equal(cardImgA.style.viewTransitionName, PRODUCT_HERO_TRANSITION_NAME);
        assert.equal(cardImgB.style.viewTransitionName || '', '');
        return { finished };
      },
    };

    assert.equal(supportsViewTransitions(), true);
    const used = navigateBackFromProductWithTransition(nav, '/shop', { productId: 'pista', sourceElement: pdpImg });
    assert.equal(used, true);
    assert.deepEqual(calls, ['/shop']);

    // Also verify unrelated claimProductTransitionTarget does nothing during to-card transition
    assert.equal(claimProductTransitionTarget('pista', pdpImg), false);

    // Finish transition and assert ALL view-transition-name attributes are immediately cleared
    resolveFinished();
    await finished;
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(pdpImg.style.viewTransitionName || '', '');
    assert.equal(cardImgA.style.viewTransitionName || '', '');
    assert.equal(cardImgB.style.viewTransitionName || '', '');
  } finally {
    clearProductViewTransition();
    (globalThis as Record<string, unknown>).document = prevDoc;
    (globalThis as Record<string, unknown>).window = prevWin;
  }
});
