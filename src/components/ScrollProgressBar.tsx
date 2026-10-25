import React from 'react';
import { motion, useScroll, useSpring, useReducedMotion } from 'motion/react';

export interface ScrollProgressBarProps {
  className?: string;
  showGlow?: boolean;
}

/**
 * ScrollProgressBar
 * Monitors document page scroll position and displays a thin, elegant
 * gold-leaf progress bar. Now positioned absolutely at the bottom 
 * of its container (usually the sticky header) for the navbar hairline effect.
 */
export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  className = '',
  showGlow = true,
}) => {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();

  // Smooth luxury spring physics for buttery scroll interpolation
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  if (shouldReduceMotion) return null;

  return (
    <div
      id="scroll-progress-bar-container"
      className={`absolute bottom-0 left-0 right-0 z-[100] pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div className="h-[1.5px] w-full bg-transparent overflow-hidden">
        <motion.div
          id="scroll-progress-bar"
          style={{ scaleX }}
          className={`h-full w-full origin-left bg-gradient-to-r from-[var(--color-gold-muted)] via-[var(--color-gold)] to-[#F3DFA2] ${
            showGlow ? 'shadow-[0_0_8px_rgba(212,175,55,0.5)]' : ''
          }`}
        />
      </div>
    </div>
  );
};

export default ScrollProgressBar;
