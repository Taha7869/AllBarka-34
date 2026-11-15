import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Home, Search, MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import AlmondLoader from '../components/AlmondLoader';
import { buildHumanSupportWhatsAppUrl } from '../config/contacts';

const help = {
  en: { search: 'Search dry fruits, dates, gift boxes', go: 'Search', popular: 'Popular right now', ask: 'Ask us on WhatsApp',
    links: [['Dry fruits & nuts', '/shop/nuts'], ['Dates', '/shop/dates'], ['Gift boxes & bundles', '/shop/bundles'], ['Celebrations', '/occasions']] },
  ur: { search: 'میوے، کھجور یا گفٹ باکس تلاش کریں', go: 'تلاش', popular: 'اس وقت مقبول', ask: 'واٹس ایپ پر پوچھیں',
    links: [['میوے', '/shop/nuts'], ['کھجور', '/shop/dates'], ['گفٹ باکس اور بنڈل', '/shop/bundles'], ['تقریبات', '/occasions']] },
  ar: { search: 'ابحث عن المكسرات والتمور وصناديق الهدايا', go: 'بحث', popular: 'الأكثر طلبًا الآن', ask: 'اسألنا على واتساب',
    links: [['المكسرات', '/shop/nuts'], ['التمور', '/shop/dates'], ['صناديق الهدايا', '/shop/bundles'], ['المناسبات', '/occasions']] },
} as const;

export default function NotFoundPage() {
  const { language, isRtl, t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const words = help[language];

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
      className="w-full min-h-[70vh] bg-[var(--color-base,#FAF9F5)] flex items-center justify-center py-20 px-4"
    >
      <div className="max-w-lg w-full bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#D4AF37)]/30 rounded-3xl p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
        {/* Subtle gold accent circle */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[var(--color-gold,#D4AF37)]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-20 h-20 bg-[var(--color-emerald,#043327)]/5 dark:bg-[var(--color-emerald,#043327)]/25 border border-[var(--color-gold,#D4AF37)]/35 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xs">
          <AlmondLoader size={40} spinning={false} />
        </div>

        <span className="inline-block px-3.5 py-1 rounded-full bg-[var(--color-gold,#D4AF37)]/10 border border-[var(--color-gold,#D4AF37)]/30 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#8C6B1B] dark:text-[var(--color-gold,#D4AF37)] mb-4">
          404 • {t('notFound', 'Page Not Found')}
        </span>

        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#120F17] dark:text-[#FAF9F5] mb-3">
          {title}
        </h1>

        <p className="text-sm text-[#4A4540] dark:text-[#C5BFB5] mb-8 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>

        <form role="search" className="mx-auto mb-5 flex max-w-sm items-center gap-2" onSubmit={event => { event.preventDefault(); const q = query.trim(); navigate(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop'); }}>
          <label className="sr-only" htmlFor="not-found-search">{words.search}</label>
          <input id="not-found-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={words.search} dir="auto"
            className="min-h-11 min-w-0 flex-1 rounded-full border border-[var(--color-gold,#D4AF37)]/35 bg-transparent px-4 text-sm text-[var(--color-text-primary)] focus-ring" />
          <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#043327] px-4 text-xs font-bold text-[#FAF9F5] focus-ring"><Search size={14} aria-hidden="true" />{words.go}</button>
        </form>

        <p className="mb-2 text-[11px] font-semibold text-[#8C6B1B] dark:text-[var(--color-gold,#D4AF37)]">{words.popular}</p>
        <nav aria-label={words.popular} className="mb-7 flex flex-wrap justify-center gap-2">
          {words.links.map(([label, href]) => <Link key={href} to={href} className="rounded-full border border-[var(--color-gold,#D4AF37)]/30 px-3 py-1.5 text-xs text-[var(--color-text-primary)] hover:border-[var(--color-gold,#D4AF37)] focus-ring">{label}</Link>)}
        </nav>

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
        <a href={buildHumanSupportWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C6B1B] hover:underline dark:text-[var(--color-gold,#D4AF37)] focus-ring">
          <MessageCircle size={14} aria-hidden="true" />{words.ask}
        </a>
      </div>
    </div>
  );
}
