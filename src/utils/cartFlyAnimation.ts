export interface FlyAnimationOptions {
  startRect?: DOMRect | { left: number; top: number; width?: number; height?: number };
  startX?: number;
  startY?: number;
  imageSrc?: string;
}

/**
 * Checks whether user prefers reduced motion (WCAG 2.3.3 / AA compliance).
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Triggers a luxury boutique micro-animation flying a thumbnail of the product
 * towards the header cart bag icon. Automatically disabled when reduced motion is preferred.
 */
export function flyItemToCart(options: FlyAnimationOptions = {}): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  // Strictly respect prefers-reduced-motion
  if (isReducedMotionPreferred()) {
    return false;
  }

  // Find target bag icon in the header
  const targetEl =
    document.getElementById('header-cart-btn') ||
    document.querySelector('[data-testid="header-cart-button"]') ||
    document.querySelector('.header-cart-icon');

  if (!targetEl) return false;

  const targetRect = targetEl.getBoundingClientRect();
  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;

  // Determine starting position
  let startX = options.startX ?? window.innerWidth / 2;
  let startY = options.startY ?? window.innerHeight / 2;

  if (options.startRect) {
    const w = options.startRect.width || 40;
    const h = options.startRect.height || 40;
    startX = options.startRect.left + w / 2;
    startY = options.startRect.top + h / 2;
  }

  const img = document.createElement('img');
  img.src = options.imageSrc || '/images/product-placeholder.svg';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.className = 'allbarka-flying-item fixed pointer-events-none rounded-full object-cover shadow-2xl border-2 border-[#D4AF37]';
  img.style.width = '48px';
  img.style.height = '48px';
  img.style.left = `${startX - 24}px`;
  img.style.top = `${startY - 24}px`;
  img.style.zIndex = '99999';
  img.style.willChange = 'transform, opacity';

  document.body.appendChild(img);

  const deltaX = targetX - startX;
  const deltaY = targetY - startY;

  if (typeof img.animate === 'function') {
    const animation = img.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${deltaX * 0.45}px, ${deltaY * 0.25 - 35}px) scale(0.85)`, opacity: 0.95, offset: 0.4 },
        { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.25)`, opacity: 0.5 },
      ],
      {
        duration: 600,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards',
      }
    );

    const cleanup = () => {
      if (img.parentNode) img.remove();
      targetEl.classList.add('scale-110');
      setTimeout(() => targetEl.classList.remove('scale-110'), 250);
    };

    animation.onfinish = cleanup;
    animation.oncancel = cleanup;
  } else {
    setTimeout(() => {
      if (img.parentNode) img.remove();
    }, 400);
  }

  return true;
}
