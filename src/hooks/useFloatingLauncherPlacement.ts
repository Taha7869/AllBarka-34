import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export interface FloatingLauncherPlacement {
  bottomPx: number;
  side: 'right' | 'left';
  isCompactOnScroll: boolean;
}

const OBSTACLE_SELECTOR = [
  'main button',
  'main input',
  'main select',
  'main textarea',
  'main h1',
  'main h2',
  'main h3',
  '[data-pdp-buy-bar]',
  '#sticky-cart-bottom-bar',
  '#back-to-top-btn',
].join(',');

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
  pad = 4,
): boolean {
  return !(
    a.right + pad <= b.left ||
    a.left - pad >= b.right ||
    a.bottom + pad <= b.top ||
    a.top - pad >= b.bottom
  );
}

function measureFixedBottomClearance(hasBottomBar: boolean, hasCookieBar: boolean): number {
  if (typeof window === 'undefined') return hasBottomBar ? 84 : 16;
  const isMobile = window.innerWidth < 768;
  let clearance = isMobile ? 12 : 24;

  const selectors = ['[data-pdp-buy-bar]', '#sticky-cart-bottom-bar', '[data-standalone-tab-bar]'];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.bottom >= window.innerHeight - 40) {
      clearance = Math.max(clearance, Math.ceil(window.innerHeight - r.top) + 12);
    }
  }
  if (hasBottomBar && clearance < 80) {
    clearance = Math.max(clearance, isMobile ? 84 : 92);
  }
  if (hasCookieBar) {
    const cookieDialog = document.querySelector<HTMLElement>('[data-consent-banner], [data-cookie-notice], [aria-label*="Cookie"], [aria-label*="cookie"]');
    if (cookieDialog) {
      const r = cookieDialog.getBoundingClientRect();
      if (r.height > 0 && r.bottom >= window.innerHeight - 40) {
        clearance = Math.max(clearance, Math.ceil(window.innerHeight - r.top) + 12);
      }
    } else if (isMobile) {
      clearance = Math.max(clearance, 204);
    }
  }
  return clearance;
}

/**
 * Keeps the floating AB AI concierge launcher inside bottom-right safe area,
 * stacked cleanly above sticky buy/cart/cookie bars, shrunk on scroll-down on mobile,
 * and nudged to the nearest collision-free slot so it never obscures headings or controls.
 */
export function useFloatingLauncherPlacement({
  enabled,
  hasBottomBar,
  hasCookieBar,
}: {
  enabled: boolean;
  hasBottomBar: boolean;
  hasCookieBar: boolean;
}): FloatingLauncherPlacement {
  const location = useLocation();
  const lastScrollYRef = useRef(0);
  const [isCompactOnScroll, setIsCompactOnScroll] = useState(false);
  const [placement, setPlacement] = useState<{ bottomPx: number; side: 'right' | 'left' }>({
    bottomPx: hasBottomBar ? 84 : 16,
    side: 'right',
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let settleTimer: number | null = null;
    let rafId = 0;

    const recompute = () => {
      const vh = window.innerHeight || 812;
      const vw = window.innerWidth || 375;
      const isMobile = vw < 768;
      const size = isMobile ? 44 : 56;
      const edgeInset = isMobile ? 10 : 24;
      const baseBottom = measureFixedBottomClearance(hasBottomBar, hasCookieBar);

      if (!isMobile) {
        setPlacement(prev => (prev.bottomPx === baseBottom && prev.side === 'right' ? prev : { bottomPx: baseBottom, side: 'right' }));
        return;
      }

      const header = document.getElementById('main-navigation-header');
      const minTop = header ? Math.max(64, header.getBoundingClientRect().bottom + 10) : 72;

      const obstacles: Array<{ left: number; top: number; right: number; bottom: number }> = [];
      for (const node of document.querySelectorAll<HTMLElement>(OBSTACLE_SELECTOR)) {
        if (node.closest('[data-ai-buddy-launcher="true"]')) continue;
        const r = node.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        if (r.bottom < minTop || r.top > vh) continue;
        const style = getComputedStyle(node);
        if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') continue;
        obstacles.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      }

      const maxBottom = Math.max(baseBottom, vh - minTop - size);
      const candidates: Array<{ bottomPx: number; side: 'right' | 'left' }> = [];
      // Prefer right-edge slots closest to baseBottom first, then left-edge fallback near baseBottom
      for (let b = baseBottom; b <= maxBottom; b += 48) {
        candidates.push({ bottomPx: b, side: 'right' });
      }
      for (let b = baseBottom; b <= Math.min(maxBottom, baseBottom + 144); b += 48) {
        candidates.push({ bottomPx: b, side: 'left' });
      }

      let chosen = { bottomPx: baseBottom, side: 'right' as 'right' | 'left' };
      for (const cand of candidates) {
        const left = cand.side === 'right' ? vw - edgeInset - size : edgeInset;
        const top = vh - cand.bottomPx - size;
        const box = { left, top, right: left + size, bottom: top + size };
        if (!obstacles.some(obs => rectsIntersect(box, obs, 2))) {
          chosen = cand;
          break;
        }
      }

      setPlacement(prev =>
        prev.bottomPx === chosen.bottomPx && prev.side === chosen.side ? prev : chosen
      );
    };

    const scheduleRecompute = (delayMs = 80) => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(recompute);
      }, delayMs);
    };

    const onScroll = () => {
      const y = window.scrollY || 0;
      if (y <= 16) {
        setIsCompactOnScroll(false);
      } else if (y > lastScrollYRef.current + 6 && y > 48) {
        setIsCompactOnScroll(true);
      } else if (y < lastScrollYRef.current - 12) {
        setIsCompactOnScroll(false);
      }
      lastScrollYRef.current = y;
      scheduleRecompute(110);
    };

    // Initial passes after route commit & lazy images settle
    scheduleRecompute(40);
    const lateTimer = window.setTimeout(() => recompute(), 360);

    const onResize = () => scheduleRecompute(60);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      window.clearTimeout(lateTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [enabled, hasBottomBar, hasCookieBar, location.pathname, location.search]);

  return {
    bottomPx: placement.bottomPx,
    side: placement.side,
    isCompactOnScroll,
  };
}
