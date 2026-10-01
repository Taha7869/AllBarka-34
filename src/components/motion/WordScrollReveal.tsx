import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

interface WordScrollRevealProps {
  text: string;
}

export default function WordScrollReveal({ text }: WordScrollRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' });
  const reduceMotion = useReducedMotion();
  const words = text.split(/\s+/);

  return (
    <span ref={ref} aria-label={text}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          aria-hidden="true"
          className="inline-block"
          initial={reduceMotion ? false : { opacity: 0.3, y: 9, filter: 'blur(3px)' }}
          animate={reduceMotion || inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
          transition={{ duration: 0.55, delay: reduceMotion ? 0 : index * 0.065, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}{index < words.length - 1 ? '\u00a0' : ''}
        </motion.span>
      ))}
    </span>
  );
}
