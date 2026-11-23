import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { AllBarkaCrestVector } from '../components/AllBarkaLogo';

export default function NotFoundPage() {
  const { language, isRtl, t } = useLanguage();

  const title =
    language === 'ur'
      ? 'صفحہ دستیاب نہیں ہے'
      : language === 'ar'
      ? 'الصفحة غير موجودة'
      : 'Harvest Path Not Found';

  const description =
    language === 'ur'
      ? 'آپ کا مطلوبہ صفحہ یا کلیکشن دستیاب نہیں ہے۔ برائے مہربانی ہماری بنیادی دکان ملاحظہ فرمائیں۔'
      : language === 'ar'
      ? 'الصفحة أو التشكيلة التي تبحث عنها لم تعد متوفرة حالياً. تفضل باستكشاف متجرنا الفاخر.'
      : 'The harvest lot, page, or boutique collection you are looking for has moved or is currently resting in the reserve.';

  return (
    <div
      data-error-surface="not-found"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="w-full min-h-[70vh] bg-[var(--color-base,#FDFBF7)] flex items-center justify-center py-20 px-4"
    >
      <div className="max-w-lg w-full bg-[var(--color-surface,#FFFCF7)] border border-[#C7982F]/35 rounded-[22px] p-8 sm:p-12 shadow-[0_10px_34px_-12px_rgba(4,40,33,0.12)] text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#C7982F] bg-[#042821] p-3.5 shadow-[0_10px_26px_-10px_rgba(4,40,33,0.45)]">
          <AllBarkaCrestVector />
        </div>

        <p className="text-xs font-medium text-[var(--color-accent-text,#806326)] dark:text-[#E4C783] mb-2">
          404 · {t('notFound', 'Page Not Found')}
        </p>

        <h1 className="text-2xl sm:text-3xl font-serif font-medium text-[var(--color-primary,#042821)] dark:text-[#FDFBF7] mb-3">
          {title}
        </h1>

        <p className="text-sm text-[var(--color-text-secondary,#635B52)] mb-8 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>

        <Link
          to="/shop"
          className="focus-ring inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#042821] hover:bg-[#08352B] text-[#FDFBF7] border border-[#C7982F]/45 px-7 py-3 text-xs font-semibold transition-colors"
        >
          <span>{t('shop', 'Explore Shop')}</span>
          <ArrowRight size={14} className="text-[#E4C783] rtl-flip" aria-hidden="true" />
        </Link>

        <div className="mt-5">
          <Link
            to="/"
            className="focus-ring inline-flex min-h-[44px] items-center text-xs font-medium text-[var(--color-accent-text,#806326)] dark:text-[#E4C783] underline underline-offset-4 hover:opacity-80"
          >
            {t('home', 'Return Home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
