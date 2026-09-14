import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AllBarkaCrestVector } from './AllBarkaLogo';

const SESSION_KEY = 'allbarka_mobile_intro_completed';

interface MobileHeaderBrandProps {
  onHomeClick: () => void;
}

export default function MobileHeaderBrand({ onHomeClick }: MobileHeaderBrandProps) {
  // Determine if intro animation should play:
  // Must only play once per tab/session, only on mobile (<768px), and respect prefers-reduced-motion.
  const [showWordmark, setShowWordmark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === 'true') {
        return false;
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return false;
      }
      // If mounted on desktop, do not initialize wordmark intro yet so it isn't consumed while hidden
      if (window.innerWidth >= 768) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // If not showing wordmark, check if resize to mobile should trigger it (if not yet completed)
    if (!showWordmark) {
      const handleResize = () => {
        try {
          if (
            window.innerWidth < 768 &&
            sessionStorage.getItem(SESSION_KEY) !== 'true' &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ) {
            setShowWordmark(true);
          }
        } catch {
          // Ignore storage restrictions
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    // Keep visible for ~1.3s as explicitly requested by owner, then gently collapse
    const timer = setTimeout(() => {
      setShowWordmark(false);
      try {
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch {
        // Handle storage restricted
      }
    }, 1300);

    return () => clearTimeout(timer);
  }, [showWordmark]);

  return (
    <button
      type="button"
      onClick={onHomeClick}
      className="min-h-[44px] min-w-[44px] flex items-center gap-2 cursor-pointer focus-ring rounded-xl p-1 -m-1 select-none text-left"
      aria-label="AllBarka — Home"
    >
      {/* Permanent Compact Gold Crest */}
      <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center transition-transform duration-300 active:scale-95">
        <AllBarkaCrestVector />
      </div>

      {/* Intro Wordmark with gentle fade and smooth clip collapse */}
      <AnimatePresence initial={false}>
        {showWordmark && (
          <motion.div
            initial={{ opacity: 0, x: -6, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ 
              opacity: 0, 
              x: -4, 
              width: 0, 
              transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } 
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden flex flex-col justify-center whitespace-nowrap"
          >
            <span className="text-base font-serif font-bold tracking-[0.035em] text-[#042821] dark:text-[#FFFCF7] leading-none">
              AllBarka
            </span>
            <span className="text-[6.5px] font-sans font-semibold uppercase tracking-[0.2em] text-[#806326] dark:text-[#C7982F] leading-none mt-0.5">
              LAHORE
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

