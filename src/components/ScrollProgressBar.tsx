import React, { useEffect, useRef } from 'react';
import { usePrefersReducedMotion as useReducedMotion } from '../hooks/usePrefersReducedMotion';
import { MOTION_EASE_CSS } from '../lib/motion';

export interface ScrollProgressBarProps {
  className?: string;
  showGlow?: boolean;
}

/**
 * ScrollProgressBar
 * Monitors document page scroll position and displays a thin champagne-gold
 * hairline progress indicator using pure GPU transform: scaleX(...) with
 * zero Framer Motion scroll-measurement overhead on initial page load.
 */
export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  className = '',
  showGlow = true,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shouldReduceMotion || typeof window === 'undefined') return;
    let rafId = 0;
    let attached = false;

    const update = () => {
      const bar = barRef.current;
      if (!bar) return;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      bar.style.transform = `scaleX(${progress.toFixed(4)})`;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    const timer = window.setTimeout(() => {
      attached = true;
      if (window.scrollY > 0) update();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(rafId);
      if (attached) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    };
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) return null;

  return (
    <div
      id="scroll-progress-bar-container"
      className={`absolute bottom-0 left-0 right-0 z-[100] pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div className="h-[1.5px] w-full bg-transparent overflow-hidden">
        <div
          ref={barRef}
          id="scroll-progress-bar"
          style={{
            transform: 'scaleX(0)',
            transition: `transform 140ms ${MOTION_EASE_CSS}`,
          }}
          className={`h-full w-full origin-left bg-gradient-to-r from-[var(--color-gold-muted)] via-[var(--color-gold)] to-[#F3DFA2] ${
            showGlow ? 'shadow-[0_0_8px_rgba(212,175,55,0.5)]' : ''
          }`}
        />
      </div>
    </div>
  );
};

export default ScrollProgressBar;
