import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

export function useToast() {
  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    window.dispatchEvent(new CustomEvent('ab-toast', { detail: { message, type } }));
  };
  return { addToast };
}

export default function ToastManager() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      const id = Math.random().toString(36).substring(7);
      setToasts(prev => [...prev, { id, ...customEvent.detail }]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };
    window.addEventListener('ab-toast', handleToast);
    return () => window.removeEventListener('ab-toast', handleToast);
  }, []);

  return (
    <div className="fixed top-20 right-4 sm:top-24 sm:right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
            className="pointer-events-auto bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/40 p-3 sm:px-4 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px]"
          >
            {toast.type === 'success' ? (
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <Info size={18} className="text-[var(--color-gold,#B8935F)] shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-semibold text-[var(--color-ink,#1F120F)] flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-[var(--color-ink-muted,#5A5A5A)] hover:text-[var(--color-ink,#1A1A1A)] cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
