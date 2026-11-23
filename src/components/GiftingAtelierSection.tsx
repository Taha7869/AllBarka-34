import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useMerchandisingSettings } from '../contexts/MerchandisingContext';
import { DEFAULT_MERCHANDISING } from '../config/merchandising';
import type { MerchandisingSettings } from '../types';

const ATELIER_IMAGE = '/images/drafts-premium-20261122/06-eid-gift-box-card-ribbon.webp';

const DEFAULT_OCCASION_META: Record<
  string,
  { title: { en: string; ur: string; ar: string }; sub: { en: string; ur: string; ar: string }; path: string }
> = {
  wedding: {
    title: { en: 'Wedding & Nikkah', ur: 'شادی و نکاح', ar: 'عقد القران والزفاف' },
    sub: { en: 'Traditional bid boxes & wedding favors', ur: 'روایتی بِد باکسز اور شادی فیورز', ar: 'صناديق وتوزيعات الأفراح التقليدية' },
    path: '/shop/celebration-boxes?occasion=wedding',
  },
  umrah: {
    title: { en: 'Umrah & Hajj Tabarruk', ur: 'عمرہ و حج تبرک', ar: 'تبرك العمرة والحج' },
    sub: { en: 'Gift-ready date & dry-fruit return sets', ur: 'کھجور اور میوہ جات کے تبرک سیٹس', ar: 'أطقم تبرك جاهزة بالتمور والمكسرات' },
    path: '/shop/celebration-boxes?occasion=umrah',
  },
  ramadan: {
    title: { en: 'Ramadan & Eid', ur: 'رمضان اور عید', ar: 'رمضان والعيد' },
    sub: { en: 'Iftar date chests & silk-ribboned Eid hampers', ur: 'افطار کھجور باکسز اور ربن والے عید ہیمپرز', ar: 'صناديق تمور الإفطار وسلال العيد بالشرائط' },
    path: '/shop/celebration-boxes?occasion=ramadan',
  },
  birth: {
    title: { en: 'Birth & Aqeeqah', ur: 'ولادت و عقیقہ', ar: 'المولود والعقيقة' },
    sub: { en: 'Keepsake announcement boxes & traditional panjeeri', ur: 'خوشخبری باکسز اور روایتی پنجیری', ar: 'صناديق التهنئة بالمولود والبنجيري التقليدي' },
    path: '/shop/celebration-boxes?occasion=birth',
  },
  corporate: {
    title: { en: 'Corporate & Bespoke', ur: 'کارپوریٹ اور کسٹم آرڈرز', ar: 'هدايا الشركات والطلبات الخاصة' },
    sub: { en: 'Branded executive hampers & bulk nationwide dispatch', ur: 'ایگزیکٹو ہیمپرز اور بلک ترسیل', ar: 'سلال تنفيذية بشعار شركتكم وشحن لكل المدن' },
    path: '/wholesale',
  },
};

const ATELIER_COPY: Record<
  LanguageCode,
  {
    eyebrow: string;
    heading: string;
    lead: string;
    imageAlt: string;
    plannerCta: string;
    occasionsCta: string;
  }
> = {
  en: {
    eyebrow: 'The gifting atelier',
    heading: 'Dressed for every milestone.',
    lead: 'From Nikkah bid boxes to ribboned Eid hampers and corporate chests — custom-packed in Lahore with printed cards and nationwide care.',
    imageAlt: 'Closed deep-emerald AllBarka gift box embossed with gold crest, tied in a champagne-gold satin ribbon with an Eid Mubarak cotton card on travertine stone',
    plannerCta: 'Open Gift Finder & Hamper Builder',
    occasionsCta: 'Explore Occasions Hub',
  },
  ur: {
    eyebrow: 'گفٹنگ ایٹیلیئر',
    heading: 'ہر خاص موقع کے لیے باوقار تحائف۔',
    lead: 'نکاح بِد باکسز سے لے کر عید کے ربن والے ہیمپرز اور کارپوریٹ تحائف تک — لاہور میں پرنٹڈ کارڈز کے ساتھ تیار۔',
    imageAlt: 'البرکہ کا سنہری مہر اور ربن والا عید مبارک گفٹ باکس کارڈ کے ساتھ',
    plannerCta: 'گفٹ فائنڈر اور ہیمپر بلڈر کھولیں',
    occasionsCta: 'مناسبات کا صفحہ دیکھیں',
  },
  ar: {
    eyebrow: 'دار الإهداء والمناسبات',
    heading: 'تجهيز راقٍ لكل مناسبة سعيدة.',
    lead: 'من صناديق النكاح إلى سلال العيد المزينة بالشرائط وهدايا الشركات — تُجهَّز بعناية في لاهور مع بطاقات إهداء مخصصة.',
    imageAlt: 'صندوق هدايا البركة الزمردي المغلق بشعار ذهبي وشريط ساتان وبطاقة عيد مبارك على الترافرتين',
    plannerCta: 'افتح باحث الهدايا ومصمم السلال',
    occasionsCta: 'تصفح جميع المناسبات',
  },
};

export interface GiftingAtelierSectionProps {
  settings?: MerchandisingSettings;
}

export default function GiftingAtelierSection({
  settings: propSettings,
}: GiftingAtelierSectionProps = {}) {
  const { language, isRtl } = useLanguage();
  const contextSettings = useMerchandisingSettings();
  const activeSettings = propSettings || contextSettings || DEFAULT_MERCHANDISING;
  const copy = ATELIER_COPY[language] || ATELIER_COPY.en;

  const occasions = useMemo(() => {
    const raw =
      Array.isArray(activeSettings.occasions) && activeSettings.occasions.length > 0
        ? activeSettings.occasions
        : DEFAULT_MERCHANDISING.occasions;

    return raw
      .filter((occ) => occ.visible !== false)
      .map((occ) => {
        const meta = DEFAULT_OCCASION_META[occ.tag];
        const title =
          language === 'ur'
            ? occ.title_ur || meta?.title.ur || occ.title_en
            : language === 'ar'
              ? meta?.title.ar || occ.title_en
              : occ.title_en || meta?.title.en || occ.tag;
        const subtitle = meta ? meta.sub[language] || meta.sub.en : '';
        return {
          id: occ.tag,
          title,
          subtitle,
          path: occ.slug || meta?.path || `/occasions?occasion=${occ.tag}`,
        };
      });
  }, [activeSettings.occasions, language]);

  return (
    <section
      id="gift-for-occasion"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-labelledby="gifting-atelier-heading"
      data-testid="gifting-atelier-section"
      className="w-full bg-[var(--color-base,#FDFBF7)] py-14 sm:py-20 text-[var(--color-text-primary,#29231D)]"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="table-gift-editorial atelier-editorial-split grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Editorial Gift Box Visual */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-[22px] border border-[#C7982F]/35 bg-[#F2ECE2] dark:bg-[#1E2523]">
              <img
                src={ATELIER_IMAGE}
                alt={copy.imageAlt}
                width={1200}
                height={900}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>

          {/* Calm Occasions Ledger */}
          <div className="lg:col-span-7">
            <p dir="auto" className="text-xs sm:text-[13px] font-medium text-[var(--color-accent-text,#806326)]">
              {copy.eyebrow}
            </p>
            <h2
              id="gifting-atelier-heading"
              lang={language}
              dir="auto"
              className={`mt-2 font-serif text-2xl sm:text-4xl font-semibold text-[var(--color-text-primary,#29231D)] ${
                language === 'ur' ? 'font-urdu leading-[1.9]' : language === 'ar' ? 'font-arabic leading-[1.5]' : 'leading-[1.15] tracking-[-0.015em]'
              }`}
            >
              {copy.heading}
            </h2>
            <p dir="auto" className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary,#635B52)]">
              {copy.lead}
            </p>

            <ul className="mt-6 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              {occasions.map((occ, idx) => (
                <li key={occ.id}>
                  <Link
                    to={occ.path}
                    className="group flex min-h-[56px] items-center justify-between gap-4 py-3.5 transition-colors hover:text-[var(--color-accent-text,#806326)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F]"
                  >
                    <div className="flex min-w-0 items-baseline gap-3.5">
                      <span className="shrink-0 font-serif text-xs font-semibold text-[var(--color-accent-text,#806326)] tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <span
                          lang={language}
                          dir="auto"
                          className="block font-serif text-base sm:text-lg font-semibold text-[var(--color-text-primary,#29231D)] group-hover:text-[var(--color-accent-text,#806326)]"
                        >
                          {occ.title}
                        </span>
                        {occ.subtitle && (
                          <span dir="auto" className="mt-0.5 block text-xs text-[var(--color-text-secondary,#635B52)]">
                            {occ.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowUpRight
                      size={17}
                      aria-hidden="true"
                      className="shrink-0 text-[var(--color-accent-text,#806326)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/gifting"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-full bg-[#1E3A2B] px-6 py-2.5 text-xs sm:text-sm font-semibold text-[#FDFBF7] transition-colors hover:bg-[#042821] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F]"
              >
                <span dir="auto">{copy.plannerCta}</span>
                <ArrowRight size={15} className="rtl-flip" aria-hidden="true" />
              </Link>
              <Link
                to="/occasions"
                className="inline-flex min-h-[46px] items-center gap-1.5 rounded-full border border-[var(--color-border)] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-primary,#29231D)] transition-colors hover:border-[#C7982F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F]"
              >
                <span dir="auto">{copy.occasionsCta}</span>
                <ArrowRight size={14} className="rtl-flip" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
