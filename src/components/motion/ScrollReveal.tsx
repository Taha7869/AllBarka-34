import { usePrefersReducedMotion as useReducedMotion } from '../../hooks/usePrefersReducedMotion';
import React from 'react';
import { motion } from 'motion/react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Index for stagger delay (0-based). 80ms per index. */
  index?: number;
  /** Y offset to rise from (px). Default 16. */
  rise?: number;
}

/**
 * ScrollReveal — wraps content in a whileInView fade-up.
 * - `once: true` so the animation fires only once per page load.
 * - Rise 16px, opacity 0→1, 0.55s ease-out.
 * - Stagger via `index` prop (80ms per step).
 * - Disabled entirely when prefers-reduced-motion is set.
 */
const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  index = 0,
  rise = 16,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: rise }}
      animate={shouldReduceMotion ? { opacity: 1, y: 0 } : undefined}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.55,
        delay: shouldReduceMotion ? 0 : Math.min(4, Math.max(0, index)) * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
