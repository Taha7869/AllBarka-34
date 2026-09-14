import React from 'react';
import { motion, useScroll, useSpring } from 'motion/react';

export interface ScrollProgressBarProps {
  /** Height of the progress bar in pixels or Tailwind classes */
  className?: string;
  /** Whether to show the subtle gold-leaf ambient glow */
  showGlow?: boolean;
}

/**
 * ScrollProgressBar
 * Monitors document page scroll position and displays a thin, elegant
 * gold-leaf progress bar at the very top of the viewport using the locked
 * AllBarka 'brand-gold' (#D4AF37) luxury token.
 */
export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  className = '',
  showGlow = true,
}) => {
  const { scrollYProgress } = useScroll();

  // Smooth luxury spring physics for buttery scroll interpolation
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <div
      id="scroll-progress-bar-container"
      className={`fixed top-0 left-0 right-0 z-[100000] pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Background Track (Ultra-subtle dark walnut / gold hairline) */}
      <div className="h-[1.5px] w-full bg-transparent overflow-hidden">
        {/* Dynamic Gold-Leaf Progress Bar */}
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
