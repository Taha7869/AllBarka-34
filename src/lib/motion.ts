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

    const revealIfNearViewport = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 1.15 && rect.bottom >= -120) {
        setVisible(true);
        return true;
      }
      return false;
    };

    if (revealIfNearViewport()) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight * 1.15) {
            setVisible(true);
            observer.disconnect();
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

    // Lightweight passive scroll fallback guarantees zero blank sections on rapid mobile flicks.
    const onScroll = () => {
      if (revealIfNearViewport()) {
        observer.disconnect();
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [reducedMotion, visible, options?.threshold, options?.rootMargin]);

  return { ref, visible: reducedMotion || visible, reducedMotion };
}

/**
 * Pure transform + opacity reveal style.
 * - Mobile (<768px): subtle opacity 0.6 -> 1 + 8px rise (never blank even mid-flick).
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
  const initialOpacity = compactMobile ? 0.6 : 0;
  const initialRisePx = compactMobile ? 8 : 14;
  const clampedDelay = compactMobile ? Math.min(delayMs, 120) : delayMs;
  return {
    opacity: visible ? 1 : initialOpacity,
    transform: visible ? 'translate3d(0, 0, 0)' : `translate3d(0, ${initialRisePx}px, 0)`,
    transition: `opacity ${MOTION_DURATION_MS.base}ms ${MOTION_EASE_CSS} ${clampedDelay}ms, transform ${MOTION_DURATION_MS.base}ms ${MOTION_EASE_CSS} ${clampedDelay}ms`,
  };
}
