import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MOTION_DURATION,
  MOTION_EASE,
  MOTION_EASE_CSS,
  MOTION_STAGGER,
  revealStyle,
} from '../src/lib/motion';

test('motion grammar exposes unified Bateel/Aesop deceleration curve and drawer stagger', () => {
  assert.deepEqual(MOTION_EASE, [0.22, 1, 0.36, 1]);
  assert.equal(MOTION_EASE_CSS, 'cubic-bezier(0.22, 1, 0.36, 1)');
  assert.equal(MOTION_DURATION.fast, 0.2);
  assert.equal(MOTION_DURATION.base, 0.4);
  assert.equal(MOTION_DURATION.slow, 0.7);
  assert.equal(MOTION_STAGGER.drawerItemsMs, 40);
});

test('revealStyle stays static under prefers-reduced-motion and never hides mobile sections at rest', () => {
  const prevWin = globalThis.window;
  try {
    (globalThis as Record<string, unknown>).window = { innerWidth: 375, scrollY: 0 };
    assert.deepEqual(revealStyle(false, true), {});
    assert.deepEqual(revealStyle(false, false), {}, 'mobile resting state must never drop opacity at scroll=0');

    (globalThis as Record<string, unknown>).window = { innerWidth: 375, scrollY: 420 };
    const scrolledMobile = revealStyle(true, false, 60);
    assert.match(String(scrolledMobile.animation || ''), /allbarka-mobile-reveal/);
    assert.match(String(scrolledMobile.animation || ''), /cubic-bezier\(0\.22, 1, 0\.36, 1\)/);

    (globalThis as Record<string, unknown>).window = { innerWidth: 1440, scrollY: 0 };
    const desktopHidden = revealStyle(false, false, 60);
    assert.equal(desktopHidden.opacity, 0);
    assert.equal(desktopHidden.transform, 'translate3d(0, 14px, 0)');
    const desktopVisible = revealStyle(true, false, 60);
    assert.equal(desktopVisible.opacity, 1);
    assert.equal(desktopVisible.transform, 'translate3d(0, 0, 0)');
  } finally {
    (globalThis as Record<string, unknown>).window = prevWin;
  }
});
