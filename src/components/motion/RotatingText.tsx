import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface RotatingTextProps {
  words: string[];
  className?: string;
  interval?: number; // ms
}

/**
 * RotatingText — word-rotator that cycles through an array of words.
 * Animates with slide-up + blur + fade via AnimatePresence.
 * RTL-safe: words are never character-split.
 * prefers-reduced-motion: shows first word statically, no transitions.
 */
const RotatingText: React.FC<RotatingTextProps> = ({
  words,
  className = '',
  interval = 2500,
}) => {
  const [index, setIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion || words.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(timer);
  }, [words.length, interval, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return (
      <span className={className} aria-live="off">
        {words[0]}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-block overflow-hidden align-bottom ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Reserve height using invisible first word so container doesn't collapse */}
      <span className="invisible pointer-events-none select-none" aria-hidden="true">
        {words.reduce((a, b) => (a.length >= b.length ? a : b), '')}
      </span>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
          transition={{
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default RotatingText;
