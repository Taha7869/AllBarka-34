import { MOTION_EASE_CSS } from './motion';

export const CART_POP_EVENT = 'allbarka:cart-pop';

function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function findCartTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const candidates = [
    document.getElementById('header-cart-btn'),
    document.querySelector<HTMLElement>('[data-standalone-bag-target]'),
  ];
  for (const el of candidates) {
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

function findSourceVisual(sourceEl: HTMLElement | null): { rect: DOMRect; src: string } | null {
  if (!sourceEl) return null;
  const container = sourceEl.closest(
    '.boutique-product-card, .table-catalog-card, article, .pdp-shell, .pdp-layout, .quick-view-dialog, main',
  );
  const img = container?.querySelector<HTMLImageElement>('img');
  if (img) {
    const src = img.currentSrc || img.src;
    const rect = img.getBoundingClientRect();
    if (src && rect.width > 0 && rect.height > 0) {
      return { rect, src };
    }
  }
  return null;
}

/**
 * Flies a small gold-ringed product thumbnail clone to the visible cart button
 * (desktop & mobile) and dispatches CART_POP_EVENT so the badge gently pops.
 * Pure transform + opacity only; completely silent under prefers-reduced-motion.
 */
export function triggerFlyToCart(sourceEl: HTMLElement | null, fallbackImageSrc?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (isReducedMotion()) return;

  const target = findCartTarget();
  const visual = findSourceVisual(sourceEl);
  const src = visual?.src || fallbackImageSrc || '';

  if (!target || !src || typeof HTMLElement.prototype.animate !== 'function') {
    window.dispatchEvent(new CustomEvent(CART_POP_EVENT));
    return;
  }

  const startRect = visual?.rect || sourceEl?.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  if (!startRect || startRect.width === 0) {
    window.dispatchEvent(new CustomEvent(CART_POP_EVENT));
    return;
  }

  const size = 54;
  const startX = startRect.left + startRect.width / 2 - size / 2;
  const startY = startRect.top + startRect.height / 2 - size / 2;
  const endX = targetRect.left + targetRect.width / 2 - size / 2;
  const endY = targetRect.top + targetRect.height / 2 - size / 2;
  const dx = endX - startX;
  const dy = endY - startY;

  const clone = document.createElement('img');
  clone.src = src;
  clone.alt = '';
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('data-fly-to-cart', 'true');
  clone.style.position = 'fixed';
  clone.style.left = `${startX}px`;
  clone.style.top = `${startY}px`;
  clone.style.width = `${size}px`;
  clone.style.height = `${size}px`;
  clone.style.objectFit = 'cover';
  clone.style.borderRadius = '12px';
  clone.style.border = '2px solid #C7982F';
  clone.style.boxShadow = '0 10px 26px -6px rgba(4, 40, 33, 0.42)';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = '9999';
  clone.style.willChange = 'transform, opacity';

  document.body.appendChild(clone);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clone.remove();
  };

  const popTimer = window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(CART_POP_EVENT));
  }, 440);

  try {
    const anim = clone.animate(
      [
        { transform: 'translate3d(0px, 0px, 0) scale(1)', opacity: 0.96 },
        {
          transform: `translate3d(${(dx * 0.48).toFixed(1)}px, ${(dy * 0.48 - 40).toFixed(1)}px, 0) scale(0.72)`,
          opacity: 0.9,
          offset: 0.5,
        },
        { transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(0.28)`, opacity: 0.14 },
      ],
      {
        duration: 560,
        easing: MOTION_EASE_CSS,
        fill: 'forwards',
      },
    );
    anim.addEventListener('finish', cleanup, { once: true });
    anim.addEventListener('cancel', () => {
      window.clearTimeout(popTimer);
      cleanup();
    }, { once: true });
  } catch {
    window.clearTimeout(popTimer);
    cleanup();
    window.dispatchEvent(new CustomEvent(CART_POP_EVENT));
  }

  window.setTimeout(cleanup, 760);
}
