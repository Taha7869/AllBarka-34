import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

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

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: rise }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.55,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
