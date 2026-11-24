import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/**
 * Single AllBarka luxury motion grammar (Bateel / Aesop / Apple restraint).
 * Easing: cubic-bezier(0.22, 1, 0.36, 1) — smooth deceleration, zero bounce.
 * Strictly transform + opacity only — zero layout shift, 60fps.
 */
export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;
export const MOTION_EASE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const MOTION_DURATION = {
  fast: 0.2,
  base: 0.4,
  slow: 0.7,
} as const;

export const MOTION_DURATION_MS = {
  fast: 200,
  base: 400,
  slow: 700,
} as const;

export const MOTION_STAGGER = {
  cards: 0.06,
  cardsMs: 60,
  drawerItemsMs: 40,
  hero: 0.09,
} as const;

export const MOTION_TRANSITION = {
  fast: { duration: MOTION_DURATION.fast, ease: MOTION_EASE },
  base: { duration: MOTION_DURATION.base, ease: MOTION_EASE },
  slow: { duration: MOTION_DURATION.slow, ease: MOTION_EASE },
} as const;

export function isCompactMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Scroll reveal hook backed by native IntersectionObserver (fires ONCE).
 * Uses rootMargin "0px 0px 15% 0px" so content begins revealing BEFORE entering
 * the viewport; mobile never drops below opacity 0.6 so fast scrolls never show
 * a blank viewport. Static under SSR and prefers-reduced-motion.
 */
export function useRevealOnce<T extends HTMLElement = HTMLElement>(options?: {
  threshold?: number;
  rootMargin?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (reducedMotion || visible) {
      if (!visible) setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    let scrollListenerAttached = false;
    const onScroll = () => {
      if (window.scrollY <= 0) return;
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 1.15 && rect.bottom >= -120) {
        setVisible(true);
        observer.disconnect();
        window.removeEventListener('scroll', onScroll);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight * 1.15) {
            setVisible(true);
            observer.disconnect();
            if (scrollListenerAttached) window.removeEventListener('scroll', onScroll);
            break;
          }
        }
      },
      {
        threshold: options?.threshold ?? 0.01,
        rootMargin: options?.rootMargin ?? '0px 0px 15% 0px',
      },
    );

    observer.observe(el);

    // Defer passive scroll fallback so mount does zero synchronous layout reads.
    const idleTimer = window.setTimeout(() => {
      scrollListenerAttached = true;
      window.addEventListener('scroll', onScroll, { passive: true });
    }, 180);

    return () => {
      window.clearTimeout(idleTimer);
      observer.disconnect();
      if (scrollListenerAttached) window.removeEventListener('scroll', onScroll);
    };
  }, [reducedMotion, visible, options?.threshold, options?.rootMargin]);

  return { ref, visible: reducedMotion || visible, reducedMotion };
}

/**
 * Pure transform + opacity reveal style.
 * - Mobile (<768px): resting opacity stays 1 so full-page WCAG AA contrast is 100/100 and
 *   fast scrolls never see a blank viewport; crossing +15% rootMargin plays a one-shot
 *   opacity 0.6 -> 1 + 8px rise animation via CSS keyframes (zero layout shift).
 * - Desktop (>=768px): opacity 0 -> 1 + 14px rise.
 * Returns empty static style when prefers-reduced-motion is active.
 */
export function revealStyle(
  visible: boolean,
  reducedMotion: boolean,
  delayMs = 0,
): CSSProperties {
  if (reducedMotion) return {};
  const compactMobile = isCompactMobileViewport();
  if (compactMobile) {
    if (!visible) return {};
    const scrolled = typeof window !== 'undefined' && window.scrollY > 40;
    if (!scrolled) return {};
    const clampedDelay = Math.min(delayMs, 120);
    return {
      animation: `allbarka-mobile-reveal ${MOTION_DURATION_MS.base}ms ${MOTION_EASE_CSS} ${clampedDelay}ms both`,
    };
  }
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translate3d(0, 0, 0)' : 'translate3d(0, 14px, 0)',
    transition: `opacity ${MOTION_DURATION_MS.base}ms ${MOTION_EASE_CSS} ${delayMs}ms, transform ${MOTION_DURATION_MS.base}ms ${MOTION_EASE_CSS} ${delayMs}ms`,
  };
}
