import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp } from 'lucide-react';

export interface BackToTopProps {
  hide?: boolean;
  /** Threshold in pixels from top before button appears (default: 350) */
  threshold?: number;
  /** Whether the fixed bottom cart bar is currently active */
  hasCartBar?: boolean;
}

/**
 * BackToTop
 * Elegant luxury button that smoothly scrolls the window to the top.
 * Features a soft luxury white/cream (#FDFBF7) background, gold-leaf (#D4AF6A) border,
 * and dark walnut (#1F120F) chevron icon/text matching the AI Chatbot theme.
 */
export const BackToTop: React.FC<BackToTopProps> = ({
  threshold = 350,
  hasCartBar = false,
  hide = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);

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
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && !hide && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed z-30 transition-all duration-300 pb-[env(safe-area-inset-bottom)] ${hasCartBar ? 'bottom-[148px] sm:bottom-[158px] right-4 sm:right-6' : 'bottom-[88px] sm:bottom-[98px] right-4 sm:right-6'}`}
        >
          <button
            id="back-to-top-btn"
            type="button"
            onClick={scrollToTop}
            className="group w-[44px] h-[44px] sm:w-11 sm:h-11 rounded-full bg-[var(--color-surface,#FDFBF7)] text-[var(--color-ink,#1F120F)] flex items-center justify-center shadow-[0_4px_16px_rgba(31,18,15,0.15)] border border-[var(--color-gold,#B8935F)]/60 hover:border-[var(--color-gold,#B8935F)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            aria-label="Scroll to top"
          >
            <ChevronUp size={22} className="group-hover:-translate-y-0.5 transition-transform duration-300" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BackToTop;
