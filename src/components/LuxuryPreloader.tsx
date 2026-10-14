import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AllBarkaHeaderLogo } from './AllBarkaLogo';
import { acquireScrollLock } from '../utils/scrollLock';

/**
 * LuxuryPreloader — Full-screen deep emerald overlay with gold line and logo reveal.
 * Optional brand intro on explicit ?preload=1; regular visits render immediately.
 * Shows at most once per session on an explicit ?preload=1 request.
 * Locked scroll while visible; fully bypassed if prefers-reduced-motion is true.
 */
export default function LuxuryPreloader() {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setIsVisible(false);
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const forceShow = searchParams.get('preload') === '1';
    let hasSeen: string | null = null;
    try { hasSeen = sessionStorage.getItem('allbarka_preloaded'); } catch { /* Storage may be unavailable. */ }

    if (forceShow && !hasSeen) {
      setIsVisible(true);
      try { sessionStorage.setItem('allbarka_preloaded', 'true'); } catch { /* Continue without persistence. */ }
      const releaseScrollLock = acquireScrollLock();

      const timer = setTimeout(() => {
        setIsVisible(false);
        releaseScrollLock();
      }, 1600);

      return () => {
        clearTimeout(timer);
        releaseScrollLock();
      };
    } else {
      setIsVisible(false);
    }
  }, [shouldReduceMotion]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="luxury-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-[var(--color-primary,#1E3A2B)] dark:bg-[var(--color-base,#121615)] text-[var(--color-primary-fg,#FDFBF7)] select-none pointer-events-none"
          aria-hidden="true"
        >
          {/* Logo mask / reveal */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <div className="scale-150">
              <AllBarkaHeaderLogo />
            </div>

            {/* Animating gold line */}
            <div className="w-48 h-[1px] bg-transparent relative overflow-hidden mt-4">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.2, delay: 0.3, ease: 'easeInOut' }}
                className="absolute inset-0 origin-left bg-gradient-to-r from-transparent via-[var(--color-accent,#C7982F)] to-transparent"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
