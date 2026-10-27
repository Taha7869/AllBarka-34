import { usePrefersReducedMotion as useReducedMotion } from '../hooks/usePrefersReducedMotion';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { X, CheckCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

export function useToast() {
  const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    window.dispatchEvent(new CustomEvent('ab-toast', { detail: { message, type } }));
  }, []);
  return { addToast };
}

export default function ToastManager() {
  const reduceMotion = useReducedMotion();
  const { t, isRtl } = useLanguage();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      const id = Math.random().toString(36).substring(7);
      setToasts(prev => [...prev, { id, ...customEvent.detail }].slice(-3));
      
      timers.current.set(id, setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        timers.current.delete(id);
      }, 4000));
    };
    window.addEventListener('ab-toast', handleToast);
    const pending = timers.current;
    return () => { window.removeEventListener('ab-toast', handleToast); pending.forEach(clearTimeout); pending.clear(); };
  }, []);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="boutique-toast-stack fixed top-20 inset-x-3 sm:inset-x-auto sm:right-6 sm:top-24 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: .98 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.9, transition: { duration: reduceMotion ? 0 : 0.2 } }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: reduceMotion ? 0 : 0.4 }}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className="boutique-toast pointer-events-auto bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/40 p-3 sm:px-4 rounded-xl shadow-lg flex items-center gap-3 w-full sm:w-auto sm:min-w-[280px]"
          >
            {toast.type === 'success' ? (
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <Info size={18} className="text-[var(--color-gold,#B8935F)] shrink-0" />
            )}
            <span dir="auto" className="text-xs sm:text-sm font-semibold text-[var(--color-ink,#1F120F)] flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              aria-label={t('close')}
              className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center text-[var(--color-ink-muted,#5A5A5A)] hover:text-[var(--color-ink,#1A1A1A)] cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
