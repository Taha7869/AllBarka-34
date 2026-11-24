import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';
import PremiumHeroPrototype from '../components/PremiumHeroPrototype';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';

const PREVIEW_BAR_COPY: Record<
  LanguageCode,
  { badge: string; note: string; backLive: string }
> = {
  en: {
    badge: 'Phase 1 Hero Prototype',
    note: 'Isolated preview route (/preview/premium-home). Live storefront home page is unchanged.',
    backLive: 'Return to live Home',
  },
  ur: {
    badge: 'فیز ۱ ہیرو پروٹوٹائپ',
    note: 'یہ الگ پریویو روٹ ہے (/preview/premium-home)۔ اصل ہوم پیج تبدیل نہیں کیا گیا۔',
    backLive: 'اصل ہوم پیج پر واپس جائیں',
  },
  ar: {
    badge: 'نموذج البطل — المرحلة ١',
    note: 'مسار معاينة معزول (/preview/premium-home). الصفحة الرئيسية المباشرة لم تتغير.',
    backLive: 'العودة إلى الصفحة الرئيسية',
  },
};

export default function PremiumHomePreviewPage() {
  const { language, isRtl } = useLanguage();
  const bar = PREVIEW_BAR_COPY[language] || PREVIEW_BAR_COPY.en;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-[80vh] w-full bg-[var(--color-base,#FDFBF7)] text-[var(--color-text-primary,#29231D)]"
    >
      <SEO
        title="Premium Home Hero Preview"
        description="Phase 1 isolated hero prototype for AllBarka Lahore gifting house."
        canonicalPath="/preview/premium-home"
        noindex={true}
      />

      <PremiumHeroPrototype />

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] p-5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <span className="inline-block rounded-full border border-[#C7982F]/45 bg-[#C7982F]/10 px-3 py-0.5 text-[10px] font-bold text-[var(--color-accent-text,#806326)]">
              {bar.badge}
            </span>
            <p dir="auto" className="text-xs sm:text-sm text-[var(--color-text-secondary,#635B52)]">
              {bar.note}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-text-primary,#29231D)] transition-colors hover:border-[#C7982F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F]"
          >
            <ArrowLeft size={14} className="rtl-flip" aria-hidden="true" />
            <span dir="auto">{bar.backLive}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
