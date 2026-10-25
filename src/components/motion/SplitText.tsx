import React, { useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface SplitTextProps {
  text: string;
  className?: string;
  /** Additional delay in ms before the stagger begins */
  delay?: number;
  /** Whether document is currently RTL — pass from useLanguage().isRtl */
  isRtl?: boolean;
}

/**
 * SplitText — staggered word-by-word reveal.
 * Splits on SPACES only — NEVER characters — so Urdu/Arabic connected script
 * is never broken.
 * RTL mode uses opacity-only transition (no y-transform) to avoid layout jank.
 * prefers-reduced-motion: renders plain text immediately with no animation.
 */
const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 0,
  isRtl = false,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <span className={className}>{text}</span>;
  }

  const words = text.split(' ');

  const wordVariants = {
    hidden: isRtl
      ? { opacity: 0 }
      : { opacity: 0, y: 24, filter: 'blur(3px)' },
    visible: isRtl
      ? { opacity: 1 }
      : { opacity: 1, y: 0, filter: 'blur(0px)' },
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        delayChildren: delay / 1000,
        staggerChildren: 0.06,
      },
    },
  };

  const springTransition = isRtl
    ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
    : {
        type: 'spring' as const,
        stiffness: 280,
        damping: 24,
        mass: 0.7,
      };

  return (
    <motion.span
      className={`inline ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      aria-label={text}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          style={{ marginInlineEnd: i < words.length - 1 ? '0.28em' : 0 }}
          variants={wordVariants}
          transition={springTransition}
          aria-hidden="true"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
};

export default SplitText;
