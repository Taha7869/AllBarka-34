import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, ShoppingBag, ArrowLeft, Home } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  return (
    <div className="w-full min-h-[70vh] bg-[var(--color-base,#F6F1EA)] flex items-center justify-center py-20 px-4 select-none">
      <div className="max-w-lg w-full bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/25 rounded-3xl p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
        {/* Subtle gold accent circle */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[var(--color-gold,#C7982F)]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-20 h-20 bg-[var(--color-emerald,#042821)]/5 dark:bg-[var(--color-emerald,#042821)]/20 border border-[var(--color-gold,#C7982F)]/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Compass size={36} className="text-[var(--color-gold,#C7982F)] animate-pulse" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-[var(--color-gold,#C7982F)]/10 border border-[var(--color-gold,#C7982F)]/30 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] mb-4">
          404 • Page Not Found
        </span>

        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-ink,#29231D)] dark:text-[var(--color-surface,#FFFCF7)] mb-3">
          {language === 'ur' ? 'صفحہ دستیاب نہیں ہے' : language === 'ar' ? 'الصفحة غير موجودة' : 'Harvest Path Not Found'}
        </h1>

        <p className="text-sm text-[var(--color-ink,#29231D)]/70 dark:text-[var(--color-surface,#FFFCF7)]/70 mb-8 leading-relaxed max-w-sm mx-auto">
          {language === 'ur'
            ? 'آپ کا مطلوبہ صفحہ منتقل یا تبدیل ہو چکا ہے۔ براہ کرم ہماری کلیکشن دیکھیں۔'
            : language === 'ar'
            ? 'الصفحة التي طلبتها قد تم نقلها أو لم تعد متوفرة. تفضل باستكشاف تشكيلتنا الفاخرة.'
            : 'The harvest lot, page, or boutique collection you are looking for has moved or is currently resting in the reserve.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/shop"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[var(--color-emerald,#042821)] hover:bg-[#03201A] text-[var(--color-surface,#FFFCF7)] font-sans font-bold text-xs uppercase tracking-wider border border-[var(--color-gold,#C7982F)]/40 hover:border-[var(--color-gold,#C7982F)] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <ShoppingBag size={14} />
            <span>{t('shop', 'Explore Shop')}</span>
          </Link>

          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/80 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 text-[var(--color-ink,#29231D)] dark:text-[var(--color-surface,#FFFCF7)] font-sans font-medium text-xs uppercase tracking-wider border border-[var(--color-gold,#C7982F)]/25 hover:border-[var(--color-gold,#C7982F)]/60 transition-all flex items-center justify-center gap-2"
          >
            <Home size={14} />
            <span>{t('home', 'Return Home')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
