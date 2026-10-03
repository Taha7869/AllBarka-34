import { subscribeNewsletter } from '../lib/storefrontSubmissions';
import React, { useId, useState } from 'react';
import { useVisualRefinementLanguage } from '../hooks/useVisualRefinementLanguage';
import { CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AllBarkaCrestVector } from './AllBarkaLogo';

export default function NewsletterCard() {
  const { t, language, isRtl } = useVisualRefinementLanguage();
  const instanceId = useId();
  const titleId = `${instanceId}-reserve-title`;
  const emailId = `${instanceId}-reserve-email`;
  const consentId = `${instanceId}-reserve-consent`;
  const errorId = `${instanceId}-reserve-error`;
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [newsletterError, setNewsletterError] = useState<string | null>(null);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterStatus === 'submitting') return;
    setNewsletterError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setNewsletterError(t('footer.emailInvalid'));
      setNewsletterStatus('error');
      return;
    }

    setNewsletterStatus('submitting');
    
    try {
      await subscribeNewsletter(email);
      setNewsletterStatus('success');
    } catch {
      setNewsletterStatus('error');
      setNewsletterError(t('footer.emailUnavailable'));
    }
  };

  return (
    <div className="newsletter-reserve-wrap">
      <section className="newsletter-reserve" lang={language} dir={isRtl ? 'rtl' : 'ltr'} aria-labelledby={titleId}>
        <div className="newsletter-reserve__face">
          <span className="newsletter-reserve__engraving" aria-hidden="true"><AllBarkaCrestVector /></span>
          <div className="newsletter-reserve__masthead"><span className="newsletter-reserve__eyebrow">{t('reserve.eyebrow')}</span></div>
          <div className="newsletter-reserve__medallion" aria-hidden="true"><span><AllBarkaCrestVector /></span></div>
          <h3 id={titleId} className="newsletter-reserve__title"><span>{t('reserve.titleLead')}</span>{' '}<em>{t('reserve.titleAccent')}</em></h3>
          <p className="newsletter-reserve__description">{t('reserve.description')}</p>
          <div className="newsletter-reserve__ornament" aria-hidden="true"><i /><span>✦</span><i /></div>
        </div>
        <div className="newsletter-reserve__paper">
          <span className="newsletter-reserve__paper-corner newsletter-reserve__paper-corner--start" aria-hidden="true" />
          <span className="newsletter-reserve__paper-corner newsletter-reserve__paper-corner--end" aria-hidden="true" />
          <p className="newsletter-reserve__invitation">{t('reserve.invitation')}</p>
          <AnimatePresence mode="wait">
            {newsletterStatus === 'success' ? (
              <motion.div
                key="success"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.25 }}
                role="status"
                className="newsletter-reserve__success"
              >
                <motion.div 
                  initial={reduceMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 15, delay: 0.1 }}
                >
                  <CheckCircle2 size={26} aria-hidden="true" />
                </motion.div>
                <div className="font-semibold">{t('newsletterSuccess', 'Enrolled in AllBarka Private Reserve.')}</div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                onSubmit={handleNewsletterSubmit}
                className="newsletter-reserve__form"
                aria-busy={newsletterStatus === 'submitting'}
              >
                <label className="newsletter-reserve__label" htmlFor={emailId}>{t('reserve.email')}</label>
                <div className="newsletter-reserve__fields">
                  <input
                    id={emailId}
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    required
                    maxLength={254}
                    disabled={newsletterStatus === 'submitting'}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (newsletterError) { setNewsletterError(null); setNewsletterStatus('idle'); } }}
                    placeholder={t('footer.emailPlaceholder')}
                    aria-invalid={newsletterStatus === 'error' ? true : undefined}
                    aria-describedby={newsletterError ? `${consentId} ${errorId}` : consentId}
                    className="newsletter-reserve__input"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'submitting'}
                    className="newsletter-reserve__submit focus-ring"
                  >
                    <span>{newsletterStatus === 'submitting' ? t('subscribing') : t('reserve.join')}</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </div>

                {newsletterError && (
                  <motion.div id={errorId} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} role="alert" className="newsletter-reserve__error">
                    <AlertCircle size={16} aria-hidden="true" />
                    <span>{newsletterError}</span>
                  </motion.div>
                )}
                <p id={consentId} className="newsletter-reserve__consent">{t('reserve.consent')}</p>
              </motion.form>
            )}
          </AnimatePresence>
          <div className="newsletter-reserve__footnote"><span>{t('reserve.notes')}</span></div>
        </div>
      </section>
    </div>
  );
}
