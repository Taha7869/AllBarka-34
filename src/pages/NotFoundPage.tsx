import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, ShoppingBag, Home } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();

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
    <div className="w-full min-h-[70vh] bg-[var(--color-base,#FAF9F5)] flex items-center justify-center py-20 px-4 select-none">
      <div className="max-w-lg w-full bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#D4AF37)]/30 rounded-3xl p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
        {/* Subtle gold accent circle */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[var(--color-gold,#D4AF37)]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-20 h-20 bg-[var(--color-emerald,#043327)]/5 dark:bg-[var(--color-emerald,#043327)]/25 border border-[var(--color-gold,#D4AF37)]/35 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xs">
          <Compass size={36} className="text-[var(--color-gold,#D4AF37)] animate-pulse" />
        </div>

        <span className="inline-block px-3.5 py-1 rounded-full bg-[var(--color-gold,#D4AF37)]/10 border border-[var(--color-gold,#D4AF37)]/30 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#8C6B1B] dark:text-[var(--color-gold,#D4AF37)] mb-4">
          404 • Page Not Found
        </span>

        <h1
          dir={language === 'ur' || language === 'ar' ? 'rtl' : 'ltr'}
          className="text-2xl sm:text-3xl font-serif font-bold text-[#120F17] dark:text-[#FAF9F5] mb-3"
        >
          {title}
        </h1>

        <p
          dir={language === 'ur' || language === 'ar' ? 'rtl' : 'ltr'}
          className="text-sm text-[#4A4540] dark:text-[#C5BFB5] mb-8 leading-relaxed max-w-sm mx-auto"
        >
          {description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/shop"
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-full bg-[#043327] hover:bg-[#03251C] text-[#FAF9F5] font-sans font-bold text-xs uppercase tracking-wider border border-[#D4AF37]/40 hover:border-[#D4AF37] transition-all flex items-center justify-center gap-2 shadow-sm focus-ring"
          >
            <ShoppingBag size={14} className="text-[#D4AF37]" />
            <span>{t('shop', 'Explore Shop')}</span>
          </Link>

          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-full bg-white/80 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 text-[#120F17] dark:text-[#FAF9F5] font-sans font-medium text-xs uppercase tracking-wider border border-[#D4AF37]/25 hover:border-[#D4AF37]/60 transition-all flex items-center justify-center gap-2 focus-ring"
          >
            <Home size={14} className="text-[#8C6B1B] dark:text-[#D4AF37]" />
            <span>{t('home', 'Return Home')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
