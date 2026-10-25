import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { X, Mail, ShoppingBag, ArrowRight, Crown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { acquireScrollLock } from '../utils/scrollLock';

interface CheckoutAuthChoiceModalProps {
  isOpen: boolean; onClose: () => void; onSignIn: () => void; onContinueAsGuest: () => void;
  itemCount?: number; totalAmount?: number;
}

export default function CheckoutAuthChoiceModal({ isOpen, onClose, onSignIn, onContinueAsGuest, itemCount = 0, totalAmount = 0 }: CheckoutAuthChoiceModalProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const id = useId();
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const release = acquireScrollLock();
    const root = document.getElementById('root');
    const previousInert = root?.inert ?? false;
    if (root) root.inert = true;
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('#checkout-signin-option-btn')?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button') || []);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { cancelAnimationFrame(frame); release(); document.removeEventListener('keydown', keydown); if (root) root.inert = previousInert; if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;
  return createPortal(<div className="fixed inset-0 z-[11500] flex items-center justify-center p-3 sm:p-4" dir="ltr">
    <motion.div aria-hidden="true" initial={{ opacity: reduceMotion ? 1 : 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
    <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint`} initial={reduceMotion ? false : { opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .22 }} className="relative z-10 w-full max-w-md max-h-[92svh] overflow-y-auto rounded-[24px] border border-[var(--color-border-accent)] bg-[var(--color-surface)] px-5 py-6 text-[var(--color-text-primary)] shadow-2xl sm:px-6" id="checkout-auth-choice-modal">
      <button type="button" onClick={onClose} aria-label={t('close')} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--color-base)]"><X size={18} /></button>
      <div className="pt-3 text-center"><span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border-accent)] bg-[var(--color-base)] text-[var(--color-accent-text)]"><Crown size={21} /></span><p className="text-xs text-[var(--color-accent-text)]" dir="auto">AllBarka · {t('checkout')}</p><h2 id={`${id}-title`} className="mt-2 font-serif text-2xl font-semibold" dir="auto">{t('auth.choice.title')}</h2><p id={`${id}-hint`} className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]" dir="auto">{t('auth.choice.hint')}</p></div>
      {totalAmount > 0 && <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-3 text-xs"><ShoppingBag size={15} aria-hidden="true" /><span dir="auto">{t('auth.choice.items').replace('{count}', String(itemCount))}</span><bdi className="font-semibold">Rs. {totalAmount.toLocaleString('en-PK')}</bdi></div>}
      <div className="mt-6"><button type="button" onClick={onSignIn} id="checkout-signin-option-btn" className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border-accent)] bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-fg)]"><span className="flex items-center gap-2"><Mail size={17} /><span dir="auto">{t('auth.choice.signIn')}</span></span><ArrowRight size={16} className="shrink-0" /></button><p className="mt-2 px-1 text-xs leading-relaxed text-[var(--color-text-secondary)]" dir="auto">{t('auth.choice.accountHint')}</p></div>
      <div className="my-4 flex items-center gap-3 text-xs text-[var(--color-text-secondary)]"><span className="h-px flex-1 bg-[var(--color-border)]" /><span dir="auto">{t('auth.choice.or')}</span><span className="h-px flex-1 bg-[var(--color-border)]" /></div>
      <button type="button" onClick={onContinueAsGuest} id="checkout-guest-option-btn" className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border-accent)] bg-[var(--color-base)] px-4 py-3 text-sm font-semibold"><span className="flex items-center gap-2"><ShoppingBag size={17} /><span dir="auto">{t('auth.choice.guest')}</span></span><ArrowRight size={16} className="shrink-0" /></button><p className="mt-2 px-1 text-xs leading-relaxed text-[var(--color-text-secondary)]" dir="auto">{t('auth.choice.guestHint')}</p>
    </motion.div>
  </div>, document.body);
}