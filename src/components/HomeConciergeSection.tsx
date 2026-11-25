import React, { useId, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { openConcierge } from '../lib/conciergeEvent';
import { revealStyle, useRevealOnce } from '../lib/motion';
import VoiceInputButton from './VoiceInputButton';

const SUGGESTION_CHIP_KEYS = [
  'homeConcierge.chipWedding',
  'homeConcierge.chipAlmond',
  'homeConcierge.chipDelivery',
  'homeConcierge.chipAjwa',
] as const;

export default function HomeConciergeSection() {
  const { t, language, isRtl } = useLanguage();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const { ref: sectionRef, visible, reducedMotion } = useRevealOnce<HTMLElement>();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;
    window.dispatchEvent(new Event('allbarka:voice-cancel'));
    openConcierge({ message, autoSend: true });
    setDraft('');
  };

  const handleChipClick = (promptText: string) => {
    window.dispatchEvent(new Event('allbarka:voice-cancel'));
    openConcierge({ message: promptText, autoSend: true });
  };

  const handleTranscript = (text: string) => {
    setDraft(text);
    inputRef.current?.focus();
  };

  return (
    <section
      ref={sectionRef}
      id="ask-barkat"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-labelledby="home-concierge-heading"
      data-testid="home-concierge-section"
      className="relative z-20 w-full border-b border-[var(--color-border)] bg-[var(--color-base,#FDFBF7)] py-5 sm:py-9 text-[var(--color-text-primary,#29231D)]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-10">
        <div
          style={revealStyle(visible, reducedMotion, 0)}
          className="rounded-2xl sm:rounded-[26px] border border-[var(--color-border-accent)] bg-[var(--color-surface,#FFFCF7)] dark:bg-[#171E1C] p-4 sm:p-7 lg:px-9 lg:py-7 shadow-[var(--shadow-card)]"
        >
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12 lg:items-center lg:gap-8">
            {/* Editorial heading & single-line intro */}
            <div className="min-w-0 lg:col-span-5">
              <p
                dir="auto"
                className="inline-flex items-center gap-2 text-xs sm:text-[13px] font-medium text-[var(--color-accent-text,#806326)]"
              >
                <span aria-hidden="true" className="inline-block h-px w-4 bg-[#C7982F]" />
                <span>{t('homeConcierge.eyebrow')}</span>
              </p>

              <h2
                id="home-concierge-heading"
                lang={language}
                dir="auto"
                className={`mt-1.5 font-serif text-[22px] sm:text-[28px] font-semibold text-[var(--color-text-primary,#29231D)] ${
                  language === 'ur'
                    ? 'font-urdu leading-[1.85]'
                    : language === 'ar'
                      ? 'font-arabic leading-[1.45]'
                      : 'leading-[1.18] tracking-[-0.015em]'
                }`}
              >
                {t('homeConcierge.heading')}
              </h2>

              <p
                dir="auto"
                className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary,#635B52)]"
              >
                {t('homeConcierge.intro')}
              </p>
            </div>

            {/* Direct input + Voice + Send + 4 quick chips */}
            <div className="min-w-0 lg:col-span-7">
              <form
                onSubmit={handleSubmit}
                aria-label={t('homeConcierge.heading')}
                className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 rounded-2xl sm:rounded-full border border-[var(--color-border-accent)] bg-[var(--color-base,#FDFBF7)] dark:bg-[#111715] p-1.5 transition-colors focus-within:border-[#C7982F] focus-within:ring-2 focus-within:ring-[#C7982F]/25"
              >
                <label htmlFor={inputId} className="sr-only">
                  {t('homeConcierge.inputLabel')}
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  maxLength={1000}
                  autoComplete="off"
                  enterKeyHint="send"
                  dir="auto"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t('homeConcierge.placeholder')}
                  className="min-h-[44px] min-w-[130px] flex-1 bg-transparent px-3 sm:px-4 py-2 text-base sm:text-sm text-[var(--color-text-primary,#29231D)] placeholder:text-[var(--color-text-secondary,#635B52)] focus:outline-none"
                />
                <div className="flex shrink-0 items-center gap-1.5">
                  <VoiceInputButton placement="below" onTranscript={handleTranscript} />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    aria-label={t('homeConcierge.sendAria')}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full bg-[#042821] px-3 sm:px-5 text-xs sm:text-sm font-semibold text-[#FDFBF7] transition-all duration-200 hover:bg-[#1E3A2B] dark:bg-[#C7982F] dark:text-[#121615] dark:hover:bg-[#D4A843] disabled:opacity-45 disabled:cursor-not-allowed motion-safe:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F] cursor-pointer"
                  >
                    <span className="hidden sm:inline" dir="auto">
                      {t('homeConcierge.send')}
                    </span>
                    <Send size={16} aria-hidden="true" />
                  </button>
                </div>
              </form>

              <div
                role="group"
                aria-label={t('homeConcierge.suggestionsLabel')}
                data-testid="home-concierge-chips"
                className="mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0"
                style={{ touchAction: 'pan-x pan-y' }}
              >
                {SUGGESTION_CHIP_KEYS.map((key) => {
                  const label = t(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      dir="auto"
                      onClick={() => handleChipClick(label)}
                      className="min-h-[44px] min-w-[44px] shrink-0 whitespace-nowrap rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle,#FAF9F5)] dark:bg-[#222B28] px-3.5 py-2 text-xs sm:text-[13px] font-medium text-[var(--color-text-primary,#29231D)] transition-colors duration-200 hover:border-[#C7982F] hover:bg-[#042821] hover:text-[#FDFBF7] dark:hover:bg-[#C7982F] dark:hover:text-[#121615] motion-safe:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F] cursor-pointer"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <p
                dir="auto"
                data-testid="home-concierge-ai-notice"
                className="mt-2.5 text-[11px] sm:text-xs leading-relaxed text-[var(--color-text-secondary,#635B52)]"
              >
                {t('homeConcierge.aiNotice')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
