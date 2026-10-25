/**
 * Centralized Reference-Counted Scroll Lock Utility for AllBarka Boutique.
 * Prevents multiple modals, drawers, and layouts from clobbering document body styles.
 * Restores original overflow and padding-right only when all lock owners have released.
 */

let lockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

export function acquireScrollLock(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  if (lockCount === 0) {
    const currentOverflow = document.body.style.overflow;
    originalOverflow = currentOverflow === 'hidden' ? '' : currentOverflow;
    originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  lockCount++;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    }
  };
}

export function resetScrollLock(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  lockCount = 0;
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}
