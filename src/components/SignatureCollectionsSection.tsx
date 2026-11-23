import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useMerchandisingSettings } from '../contexts/MerchandisingContext';
import { DEFAULT_MERCHANDISING } from '../config/merchandising';
import { canonicalCollectionKey, getEquivalentCollectionIds } from '../config/categories';
import { SECTION_COVERS } from '../config/sectionCovers';
import { getSeasonalTheme } from '../lib/seasonalHomepage';
import { MOTION_EASE_CSS, MOTION_STAGGER, revealStyle, useRevealOnce } from '../lib/motion';
import type { MerchandisingSettings } from '../types';

interface CuratedTile {
  id: string;
  canonicalKey: string;
  title: { en: string; ur: string; ar: string };
  subtitle: { en: string; ur: string; ar: string };
  image: string;
  alt: { en: string; ur: string; ar: string };
  link: string;
  badge?: string;
}

const CURATED_SIX_TILES: CuratedTile[] = [
  {
    id: 'dates',
    canonicalKey: 'dates',
    title: { en: 'Dates Reserve', ur: 'منتخب کھجوریں', ar: 'مختارات التمور' },
    subtitle: { en: 'Medjool, Ajwa & Kalmi harvests', ur: 'مجدول، عجوہ اور قلمی کھجوریں', ar: 'تمور المجدول والعجوة والقلمي' },
    image: '/images/catalog-intake-20261110/dates-dark-long.webp',
    alt: {
      en: 'Long slender dark brown Kalmi dates in a speckled ceramic bowl on travertine stone beside deep emerald linen',
      ur: 'تراورتین پتھر پر مٹی کے پیالے میں لمبی گہری بھوری قلمی کھجوریں اور سبز کپڑا',
      ar: 'تمور قلمي طويلة داكنة في وعاء خزفي على حجر الترافرتين بجانب قماش زمردي',
    },
    link: '/shop/dates',
  },
  {
    id: 'dry-fruits',
    canonicalKey: 'dry-fruits',
    title: { en: 'Dry Fruits & Hampers', ur: 'خشک میوہ جات اور ہیمپرز', ar: 'المكسرات وسلال الضيافة' },
    subtitle: { en: 'Pistachios, walnuts, almonds & cashews', ur: 'پستہ، اخروٹ، بادام اور کاجو', ar: 'فستق وجوز ولوز وكاجو منتقى' },
    image: '/images/drafts-premium-20261122/04-dry-fruit-hamper-top.webp',
    alt: {
      en: 'Top-down view of an open four-compartment AllBarka dry-fruit hamper filled with pistachios, walnuts, almonds, cashews, dates and figs',
      ur: 'البرکہ کے چار خانوں والے خشک میوہ ہیمپر کا اوپری منظر جس میں پستہ، اخروٹ، بادام، کاجو، کھجور اور انجیر ہیں',
      ar: 'منظر علوي لصندوق مكسرات البركة بأربعة أقسام مليئة بالفستق والجوز واللوز والكاجو والتمور والتين',
    },
    link: '/shop/dry-fruits',
  },
  {
    id: 'herbs-spices',
    canonicalKey: 'herbs-spices',
    title: { en: 'Saffron & Pantry Spices', ur: 'زعفران اور خالص مصالحہ جات', ar: 'الزعفران والتوابل المختارة' },
    subtitle: { en: 'Grade-A Sargol saffron & whole spices', ur: 'اعلیٰ درجہ سرگول زعفران اور ثابت مصالحے', ar: 'زعفران سرغول فاخر وتوابل كاملة' },
    image: '/images/drafts-premium-20261122/02-saffron-jar-closeup.webp',
    alt: {
      en: 'Glass apothecary jar of crimson Grade-A Sargol saffron labelled with the gold AllBarka crest on warm travertine stone',
      ur: 'شیشے کی شیشی میں سرخ سرگول زعفران جس پر البرکہ کا سنہری نشان ہے',
      ar: 'عبوة زجاجية من زعفران سرغول الأحمر تحمل شعار البركة الذهبي على حجر الترافرتين',
    },
    link: '/shop/herbs-spices',
  },
  {
    id: 'essentials',
    canonicalKey: 'essentials',
    title: { en: 'Raw Honey & Desi Essentials', ur: 'خالص شہد اور دیسی پیداوار', ar: 'العسل الخام والأساسيات التقليدية' },
    subtitle: { en: 'Unfiltered honey, desi ghee & panjeeri', ur: 'خالص شہد، دیسی گھی اور پنجیری', ar: 'عسل غير مفلتر وسمن بلدي وبنجيري' },
    image: '/images/drafts-premium-20261122/03-honey-bottle.webp',
    alt: {
      en: 'Faceted clear glass jar of amber raw honey sealed with the AllBarka gold crest label beside raw honeycomb on travertine stone',
      ur: 'شیشے کے مرتبان میں خالص شہد جس پر البرکہ کی سنہری مہر اور لیبل ہے',
      ar: 'مرطبان زجاجي من العسل الخام يحمل ملصق البركة الذهبي بجانب شمع العسل على الترافرتين',
    },
    link: '/shop/essentials',
  },
  {
    id: 'celebration-boxes',
    canonicalKey: 'celebration-boxes',
    title: { en: 'Celebration & Bid Boxes', ur: 'شادی و تقاریب بِد باکسز', ar: 'صناديق الأفراح والتوزيعات' },
    subtitle: { en: 'Nikkah favors, Umrah tabarruk & tins', ur: 'نکاح فیورز، عمرہ تبرک اور ٹن باکسز', ar: 'توزيعات النكاح وتبرك العمرة والعلب المعدنية' },
    image: SECTION_COVERS['celebration-boxes'].src800 || SECTION_COVERS['celebration-boxes'].src,
    alt: {
      en: 'AllBarka ornate celebration and wedding bid boxes arranged on warm travertine stone',
      ur: 'البرکہ کے شادی اور تقاریب کے بِد باکسز',
      ar: 'صناديق توزيعات الأفراح والمناسبات من البركة',
    },
    link: '/shop/celebration-boxes',
  },
  {
    id: 'oils',
    canonicalKey: 'oils',
    title: { en: 'Cold-Pressed Oils', ur: 'کولڈ پریسڈ خالص تیل', ar: 'الزيوت المعصورة على البارد' },
    subtitle: { en: 'Small-batch almond, walnut & black seed', ur: 'بادام، اخروٹ اور کلونجی کا خالص تیل', ar: 'زيت اللوز والجوز والحبة السوداء بكميات صغيرة' },
    image: SECTION_COVERS.oils.src800 || SECTION_COVERS.oils.src,
    alt: {
      en: 'Small-batch cold-pressed oil bottles from AllBarka on warm stone',
      ur: 'البرکہ کے کولڈ پریسڈ خالص تیل کی بوتلیں',
      ar: 'زجاجات الزيوت المعصورة على البارد من البركة',
    },
    link: '/shop/oils',
  },
];

const SECTION_COPY: Record<
  LanguageCode,
  { eyebrow: string; heading: string; exploreAll: string }
> = {
  en: {
    eyebrow: 'Curated houses',
    heading: 'Six pillars of the AllBarka pantry.',
    exploreAll: 'Explore all collections',
  },
  ur: {
    eyebrow: 'منتخب شعبے',
    heading: 'البرکہ پینٹری کے چھ خاص شعبے۔',
    exploreAll: 'تمام کلیکشن دیکھیں',
  },
  ar: {
    eyebrow: 'أقسام مختارة',
    heading: 'ست ركائز من مؤونة البركة.',
    exploreAll: 'استكشف جميع التشكيلات',
  },
};

export interface SignatureCollectionsSectionProps {
  settings?: MerchandisingSettings;
}

export default function SignatureCollectionsSection({
  settings: propSettings,
}: SignatureCollectionsSectionProps = {}) {
  const { language, isRtl } = useLanguage();
  const contextSettings = useMerchandisingSettings();
  const activeSettings = propSettings || contextSettings || DEFAULT_MERCHANDISING;
  const copy = SECTION_COPY[language] || SECTION_COPY.en;
  const { ref: sectionRef, visible, reducedMotion } = useRevealOnce<HTMLElement>();

  const tiles = useMemo(() => {
    const visibility = activeSettings.categoryVisibility || {};
    const rawCollections = Array.isArray(activeSettings.collections)
      ? activeSettings.collections
      : DEFAULT_MERCHANDISING.collections;
    const byKey = new Map<string, (typeof rawCollections)[number]>();

    for (const col of rawCollections) {
      const cKey = canonicalCollectionKey(col.collectionId);
      const existing = byKey.get(cKey);
      if (!existing) {
        byKey.set(cKey, col);
      } else {
        const hidden = existing.visible === false || col.visible === false;
        byKey.set(cKey, {
          ...existing,
          ...col,
          visible: hidden ? false : col.visible !== false,
        });
      }
    }

    const isVisible = (cKey: string) => {
      const col = byKey.get(cKey);
      if (col?.visible === false) return false;
      for (const alias of getEquivalentCollectionIds(cKey)) {
        if (visibility[alias] === false) return false;
      }
      return true;
    };

    const resolved: Array<{
      id: string;
      cKey: string;
      title: string;
      subtitle: string;
      image: string;
      alt: string;
      link: string;
      badge?: string;
    }> = [];
    const seen = new Set<string>();

    for (const base of CURATED_SIX_TILES) {
      if (!isVisible(base.canonicalKey)) continue;
      seen.add(base.canonicalKey);
      const override = byKey.get(base.canonicalKey);
      const title =
        override && (language === 'ur' ? override.title_ur || override.title_en : override.title_en)
          ? language === 'ur'
            ? override.title_ur || override.title_en
            : override.title_en
          : base.title[language] || base.title.en;
      resolved.push({
        id: override?.collectionId || base.id,
        cKey: base.canonicalKey,
        title,
        subtitle: base.subtitle[language] || base.subtitle.en,
        image: override?.image || base.image,
        alt: base.alt[language] || base.alt.en,
        link: override?.slug || base.link,
        badge: override?.badge,
      });
    }

    // Include explicitly published custom admin collections (e.g., seasonal deals) if custom-titled/imaged
    for (const col of rawCollections) {
      const cKey = canonicalCollectionKey(col.collectionId);
      if (seen.has(cKey) || !isVisible(cKey)) continue;
      const isDefaultCollection = DEFAULT_MERCHANDISING.collections.some(
        (d) => d.collectionId === col.collectionId && d.title_en === col.title_en && !col.image,
      );
      if (isDefaultCollection) continue;
      seen.add(cKey);
      resolved.push({
        id: col.collectionId,
        cKey,
        title: language === 'ur' ? col.title_ur || col.title_en : col.title_en || col.collectionId,
        subtitle: '',
        image: col.image || '/images/drafts-premium-20261122/04-dry-fruit-hamper-top.webp',
        alt: col.title_en || col.collectionId,
        link: col.slug || `/shop/${col.collectionId}`,
        badge: col.badge,
      });
    }

    const order = activeSettings.categoryOrder || [];
    const defaultSig = DEFAULT_MERCHANDISING.categoryOrder.map(canonicalCollectionKey).join(',');
    const activeSig = order.map(canonicalCollectionKey).join(',');
    const hasCustomOrder = order.length > 0 && activeSig !== defaultSig;
    const forcedSeason = Boolean(
      activeSettings.seasonalMode &&
        activeSettings.seasonalMode !== 'auto' &&
        activeSettings.seasonalMode !== 'default',
    );
    const seasonal = getSeasonalTheme(activeSettings.seasonalMode);
    const effectiveOrder =
      forcedSeason && seasonal
        ? seasonal.categoryOrder
        : hasCustomOrder
          ? order
          : seasonal
            ? seasonal.categoryOrder
            : order;

    if (effectiveOrder.length > 0) {
      const norm = effectiveOrder.map(canonicalCollectionKey);
      resolved.sort((a, b) => {
        const ia = norm.indexOf(a.cKey);
        const ib = norm.indexOf(b.cKey);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    }

    return resolved.slice(0, 6);
  }, [activeSettings, language]);

  return (
    <section
      ref={sectionRef}
      id="allbarka-pantry"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-labelledby="signature-collections-heading"
      data-testid="signature-collections-section"
      className="w-full bg-[var(--color-base,#FDFBF7)] py-14 sm:py-20 text-[var(--color-text-primary,#29231D)]"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div
          style={revealStyle(visible, reducedMotion, 0)}
          className="mb-8 flex flex-col items-start justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end"
        >
          <div className="max-w-xl">
            <p dir="auto" className="text-xs sm:text-[13px] font-medium text-[var(--color-accent-text,#806326)]">
              {copy.eyebrow}
            </p>
            <h2
              id="signature-collections-heading"
              lang={language}
              dir="auto"
              className={`mt-2 font-serif text-2xl sm:text-4xl font-semibold text-[var(--color-text-primary,#29231D)] ${
                language === 'ur' ? 'font-urdu leading-[1.9]' : language === 'ar' ? 'font-arabic leading-[1.5]' : 'leading-[1.15] tracking-[-0.015em]'
              }`}
            >
              {copy.heading}
            </h2>
          </div>

          <Link
            to="/shop"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[var(--color-accent-text,#806326)] underline underline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C7982F]"
          >
            <span dir="auto">{copy.exploreAll}</span>
            <ArrowRight size={15} className="rtl-flip" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {tiles.map((tile, idx) => (
            <div key={tile.id} style={revealStyle(visible, reducedMotion, (idx + 1) * MOTION_STAGGER.cardsMs)}>
              <Link
                to={tile.link}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] transition-colors duration-200 hover:border-[#C7982F]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F2ECE2] dark:bg-[#1E2523]">
                  <img
                    src={tile.image}
                    alt={tile.alt}
                    width={800}
                    height={600}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      if (!event.currentTarget.src.endsWith('/images/product-placeholder.svg')) {
                        event.currentTarget.src = '/images/product-placeholder.svg';
                      }
                    }}
                    style={{
                      transition: reducedMotion ? undefined : `transform 700ms ${MOTION_EASE_CSS}`,
                    }}
                    className="h-full w-full object-cover motion-safe:group-hover:scale-[1.04]"
                  />
                  {tile.badge && (
                    <span className="absolute start-3 top-3 rounded-full bg-[#042821]/90 px-2.5 py-1 text-[10px] font-semibold text-[#E4C783]">
                      {tile.badge}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-5">
                  <div>
                    <h3
                      lang={language}
                      dir="auto"
                      className={`inline-block font-serif text-base sm:text-lg font-semibold text-[var(--color-text-primary,#29231D)] group-hover:text-[var(--color-accent-text,#806326)] transition-colors duration-200 ${
                        language === 'ur' ? 'font-urdu leading-[1.9]' : language === 'ar' ? 'font-arabic leading-[1.5]' : 'leading-snug'
                      }`}
                    >
                      <span>{tile.title}</span>
                      <span
                        aria-hidden="true"
                        style={{
                          transition: reducedMotion ? undefined : `transform 400ms ${MOTION_EASE_CSS}`,
                        }}
                        className="mt-1 block h-[1.5px] w-full origin-left rtl:origin-right scale-x-0 bg-[#C7982F] group-hover:scale-x-100 group-focus-visible:scale-x-100"
                      />
                    </h3>
                    {tile.subtitle && (
                      <p
                        dir="auto"
                        className="mt-1 hidden sm:block text-xs leading-relaxed text-[var(--color-text-secondary,#635B52)]"
                      >
                        {tile.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
