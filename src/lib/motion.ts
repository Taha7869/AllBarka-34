import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/**
 * Single AllBarka motion grammar.
 * Durations: 200ms (micro/route fade), 400ms (reveals/tabs), 700ms (hero/image luxury ease).
 * Easing: cubic-bezier(0.22, 0.8, 0.2, 1).
 * Strictly transform + opacity only — zero layout shift.
 */
export const MOTION_EASE = [0.22, 0.8, 0.2, 1] as const;
export const MOTION_EASE_CSS = 'cubic-bezier(0.22, 0.8, 0.2, 1)';

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
  hero: 0.09,
} as const;

export const MOTION_TRANSITION = {
  fast: { duration: MOTION_DURATION.fast, ease: MOTION_EASE },
  base: { duration: MOTION_DURATION.base, ease: MOTION_EASE },
  slow: { duration: MOTION_DURATION.slow, ease: MOTION_EASE },
} as const;

/**
 * Scroll reveal hook backed by native IntersectionObserver (fires ONCE).
 * Immediately visible during SSR, under prefers-reduced-motion, or when IO is unavailable.
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

    // Reveal immediately if already within the initial viewport to avoid flashing above-the-fold content.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.96 && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? '0px 0px -32px 0px',
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion, visible, options?.threshold, options?.rootMargin]);

  return { ref, visible: reducedMotion || visible, reducedMotion };
}

/**
 * Pure transform + opacity reveal style (16px rise, 400ms, single luxury curve).
 * Returns empty static style when prefers-reduced-motion is active.
 */
export function revealStyle(
  visible: boolean,
  reducedMotion: boolean,
  delayMs = 0,
): CSSProperties {
  if (reducedMotion) return {};
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translate3d(0, 0, 0)' : 'translate3d(0, 16px, 0)',
    transition: `opacity ${MOTION_DURATION_MS.base}ms ${MOTION_EASE_CSS} ${delayMs}ms, transform ${MOTION_DURATION_MS.base}ms ${MOTION_EASE_CSS} ${delayMs}ms`,
  };
}
