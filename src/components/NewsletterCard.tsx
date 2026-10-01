import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Mail, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NewsletterCard() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [newsletterError, setNewsletterError] = useState<string | null>(null);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setNewsletterError(t('footer.emailInvalid'));
      setNewsletterStatus('error');
      return;
    }

    setNewsletterStatus('submitting');
    
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), consent: true }),
      });
      if (!response.ok) throw new Error(t('footer.emailUnavailable'));
      setNewsletterStatus('success');
    } catch (error) {
      setNewsletterStatus('error');
      setNewsletterError(error instanceof Error ? error.message : t('footer.emailFailed'));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 relative z-10 -mt-10 sm:-mt-16">
      <div className="bg-[var(--color-primary)] rounded-3xl p-6 sm:p-10 border border-[var(--color-accent)]/30 shadow-[0_20px_40px_rgba(4,40,33,0.15)] relative overflow-hidden text-center text-[var(--color-primary-fg)]">
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]">
          <div className="absolute -top-40 right-1/4 h-96 w-96 bg-[var(--color-accent)] blur-3xl rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 bg-white/5 border border-[var(--color-accent)]/20 rounded-2xl flex items-center justify-center text-[var(--color-accent)] mb-5">
            <Mail size={24} />
          </div>
          
          <h3 className="font-serif text-2xl font-bold tracking-wide mb-3">
            {t('newsletterTitle', 'Private Reserve / AllBarka Updates')}
          </h3>
          <p className="text-sm text-[var(--color-primary-fg)]/80 max-w-lg mx-auto mb-8">
            {t('newsletterDesc', 'Receive privileged notices regarding fresh seasonal harvests, wild Skardu arrivals, and exclusive patron privileges.')}
          </p>

          <AnimatePresence mode="wait">
            {newsletterStatus === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white/10 border border-emerald-400/40 text-emerald-100 rounded-2xl p-6 flex flex-col items-center max-w-md w-full gap-3"
              >
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                >
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </motion.div>
                <div className="font-semibold">{t('newsletterSuccess', 'Enrolled in AllBarka Private Reserve.')}</div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleNewsletterSubmit}
                className="w-full max-w-md mx-auto space-y-4"
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('footer.emailPlaceholder')}
                    aria-label={t('footer.emailPlaceholder')}
                    className="flex-1 rounded-xl bg-white/5 border border-white/20 px-4 py-3 text-sm text-[var(--color-primary-fg)] placeholder:text-white/40 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'submitting'}
                    className="min-h-[48px] px-6 rounded-xl bg-[var(--color-accent)] text-[var(--color-ink)] font-bold text-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{newsletterStatus === 'submitting' ? t('subscribing', 'Submitting...') : t('subscribe', 'Subscribe')}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

                {newsletterError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-1.5 text-xs text-red-300 bg-red-900/40 py-2 px-3 rounded-lg border border-red-500/20">
                    <AlertCircle size={14} />
                    <span>{newsletterError}</span>
                  </motion.div>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
