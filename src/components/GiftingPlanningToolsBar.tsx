import React, { lazy, Suspense, useRef, useState } from 'react';
import { ArrowRight, Compass, Eye, Sparkles } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { openMehmaanPlannerModal } from './MehmaanTablePlannerModal';
import { openShopTheTableModal } from './ShopTheTableModal';

const SelectionGuide = lazy(() => import('./SelectionGuide'));

const TOOLS_COPY: Record<
  LanguageCode,
  {
    eyebrow: string;
    heading: string;
    mehmaan: string;
    tableScene: string;
    selectionGuide: string;
  }
> = {
  en: {
    eyebrow: 'Interactive planning tools',
    heading: 'Plan your hosting table or curated gift.',
    mehmaan: 'Plan Mehmaan Table',
    tableScene: 'Shop Table Scene',
    selectionGuide: 'Open Selection Guide',
  },
  ur: {
    eyebrow: 'پلاننگ ٹولز',
    heading: 'مہمان نوازی کی میز یا منتخب تحفہ ترتیب دیں۔',
    mehmaan: 'مہمان میز پلان کریں',
    tableScene: 'ٹیبل سین دیکھیں',
    selectionGuide: 'انتخاب گائیڈ کھولیں',
  },
  ar: {
    eyebrow: 'أدوات التخطيط والضيافة',
    heading: 'خطط لمائدة الضيافة أو هديتك المختارة.',
    mehmaan: 'تخطيط مائدة الضيوف',
    tableScene: 'تسوق مشهد المائدة',
    selectionGuide: 'فتح دليل الاختيار',
  },
};

export default function GiftingPlanningToolsBar({ className = '' }: { className?: string }) {
  const { language, isRtl, t } = useLanguage();
  const copy = TOOLS_COPY[language] || TOOLS_COPY.en;
  const [guideOpen, setGuideOpen] = useState(false);
  const guideTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={copy.eyebrow}
      data-testid="gifting-planning-tools"
      className={`my-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] p-5 sm:p-6 ${className}`.trim()}
    >
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p dir="auto" className="text-xs font-medium text-[var(--color-accent-text,#806326)]">
            {copy.eyebrow}
          </p>
          <h3 dir="auto" className="mt-1 font-serif text-lg sm:text-xl font-semibold text-[var(--color-text-primary,#29231D)]">
            {copy.heading}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => openMehmaanPlannerModal()}
            aria-haspopup="dialog"
            className="heritage-hero-mehmaan inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--color-border-accent)] bg-[var(--color-base)] px-4 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[#C7982F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F] cursor-pointer"
          >
            <Sparkles size={15} className="text-[#C7982F]" aria-hidden="true" />
            <span dir="auto">{copy.mehmaan}</span>
            <ArrowRight size={13} className="rtl-flip" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => openShopTheTableModal()}
            aria-haspopup="dialog"
            className="heritage-hero-table-scene inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--color-border-accent)] bg-[var(--color-base)] px-4 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[#C7982F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F] cursor-pointer"
          >
            <Eye size={15} className="text-[#C7982F]" aria-hidden="true" />
            <span dir="auto">{copy.tableScene}</span>
            <ArrowRight size={13} className="rtl-flip" aria-hidden="true" />
          </button>

          <button
            ref={guideTriggerRef}
            type="button"
            onClick={() => setGuideOpen(true)}
            aria-haspopup="dialog"
            className="heritage-hero-guide inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-base)] px-4 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[#C7982F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F] cursor-pointer"
          >
            <Compass size={15} className="text-[#C7982F]" aria-hidden="true" />
            <span dir="auto">{copy.selectionGuide}</span>
            <ArrowRight size={13} className="rtl-flip" aria-hidden="true" />
          </button>
        </div>
      </div>

      {guideOpen && (
        <Suspense fallback={<p className="mt-3 text-xs text-[var(--color-text-secondary)]" role="status">{t('guide.loading', 'Loading selection guide…')}</p>}>
          <SelectionGuide opener={guideTriggerRef.current} onClose={() => setGuideOpen(false)} />
        </Suspense>
      )}
    </section>
  );
}
