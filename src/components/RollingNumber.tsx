import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { MOTION_DURATION, MOTION_EASE } from '../lib/motion';

interface RollingNumberProps {
  value: number;
  className?: string;
  format?: (value: number) => string;
}

/**
 * Subtle directional number roll (200ms, transform + opacity only) for quantity steppers and live totals.
 * Renders statically under prefers-reduced-motion and SSR.
 */
export default function RollingNumber({ value, className = '', format }: RollingNumberProps) {
  const reducedMotion = usePrefersReducedMotion();
  const prevRef = useRef(value);
  const direction = value >= prevRef.current ? 1 : -1;
  const formatted = format ? format(value) : String(value);

  useEffect(() => {
    prevRef.current = value;
  }, [value]);

  if (reducedMotion || typeof window === 'undefined') {
    return <span className={`tabular-nums ${className}`}><bdi>{formatted}</bdi></span>;
  }

  return (
    <span className={`relative inline-flex h-[1.4em] items-center justify-center overflow-hidden tabular-nums ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: direction * 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: direction * -10, opacity: 0 }}
          transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE }}
          className="inline-block"
        >
          <bdi>{formatted}</bdi>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
