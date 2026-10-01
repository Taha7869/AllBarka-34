import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronUp } from 'lucide-react';

export interface BackToTopProps {
  hide?: boolean;
  threshold?: number;
  hasCartBar?: boolean;
}

export const BackToTop: React.FC<BackToTopProps> = ({
  threshold = 600,
  hasCartBar = false,
  hide = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const checkScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollY > threshold);
    };
    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    });
  };

  const springTransition = shouldReduceMotion 
    ? { duration: 0.01 }
    : { type: 'spring' as const, stiffness: 280, damping: 24 };

  const variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  };

  return (
    <AnimatePresence>
      {isVisible && !hide && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          transition={springTransition}
          // Use CSS logical properties (inset-inline-end) for RTL support
          // Kept above the cart bar or any chat widgets.
          className={`fixed z-30 pb-[env(safe-area-inset-bottom)] ${
            hasCartBar ? 'bottom-[148px] sm:bottom-[158px]' : 'bottom-[88px] sm:bottom-[98px]'
          }`}
          style={{ insetInlineEnd: '1rem' }}
        >
          <button
            id="back-to-top-btn"
            type="button"
            onClick={scrollToTop}
            className="group w-[44px] h-[44px] sm:w-11 sm:h-11 rounded-full bg-[var(--color-surface,#FDFBF7)] dark:bg-[var(--color-surface-elevated,#222A28)] text-[var(--color-primary,#1E3A2B)] dark:text-[var(--color-gold,#D4A843)] flex items-center justify-center shadow-[var(--shadow-card)] border border-[var(--color-accent,#C7982F)]/60 hover:border-[var(--color-accent,#C7982F)] transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="Scroll to top"
          >
            <ChevronUp size={22} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BackToTop;
