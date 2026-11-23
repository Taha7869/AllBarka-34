import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useStorefrontContent } from '../contexts/StorefrontContentContext';
import { contentText } from '../lib/storefrontContent';
import { useMerchandisingSettings } from '../contexts/MerchandisingContext';
import { getSeasonalTheme, pickLocalizedSeasonal } from '../lib/seasonalHomepage';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { AllBarkaCrestVector } from './AllBarkaLogo';

export const PREMIUM_HERO_IMAGE = '/images/drafts-premium-20261122/01-hero-gift-box-dates.webp';

interface HeroCopy {
  eyebrow: string;
  headline: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  imageAlt: string;
  caption: string;
  replayLabel: string;
  pillars: [string, string, string];
}

export const PREMIUM_HERO_COPY: Record<LanguageCode, HeroCopy> = {
  en: {
    eyebrow: 'Lahore gifting house',
    headline: 'Heirloom dry fruits and signature gift boxes.',
    description:
      'Selected dates, mountain nuts, Grade-A Sargol saffron and hand-ribboned hampers — graded and packed fresh to order in Lahore.',
    primaryCta: 'Explore Dry Fruits',
    secondaryCta: 'Shop Gift Boxes',
    imageAlt:
      'Open AllBarka deep-emerald presentation gift box embossed with the gold AllBarka crest, filled with Medjool dates, Ajwa dates, roasted almonds and pistachios on honed travertine stone',
    caption: 'Signature Emerald Presentation Chest · Dates & Dry Fruits',
    replayLabel: 'Replay reveal',
    pillars: ['Hand-Graded Harvests', 'Packed Fresh in Lahore', 'Nationwide Gifting Care'],
  },
  ur: {
    eyebrow: 'لاہور گفٹنگ ہاؤس',
    headline: 'منتخب خشک میوہ جات اور شاندار گفٹ باکسز۔',
    description:
      'منتخب کھجوریں، پہاڑی خشک میوہ جات، اعلیٰ درجہ سرگول زعفران اور نفیس ربن والے ہیمپرز — لاہور میں آرڈر پر تازہ پیک۔',
    primaryCta: 'خشک میوہ جات دیکھیں',
    secondaryCta: 'گفٹ باکسز دیکھیں',
    imageAlt:
      'البرکہ کا کھلا ہوا زمردی گفٹ باکس جس پر سنہری مہر ثبت ہے اور اندر کھجوریں، بادام اور پستہ سجے ہیں',
    caption: 'البرکہ خاص زمردی گفٹ باکس · کھجوریں اور خشک میوہ جات',
    replayLabel: 'دوبارہ دیکھیں',
    pillars: ['ہاتھ سے منتخب فصل', 'لاہور میں تازہ پیکنگ', 'ملک بھر میں باوقار ترسیل'],
  },
  ar: {
    eyebrow: 'دار هدايا لاهور',
    headline: 'أفخر الفواكه المجففة وصناديق الهدايا الراقية.',
    description:
      'تمور مختارة ومكسرات جبلية وزعفران سرغول فاخر وسلال مزينة بالشرائط — تُفرز وتُعبّأ طازجة عند الطلب في لاهور.',
    primaryCta: 'تسوق الفواكه المجففة',
    secondaryCta: 'تسوق صناديق الهدايا',
    imageAlt:
      'صندوق هدايا البركة الزمردي المفتوح والمختوم بالشعار الذهبي وبداخله تمور ولوز وفستق على رخام الترافرتين الدافئ',
    caption: 'صندوق البركة الزمردي الفاخر · تمور ومكسرات مختارة',
    replayLabel: 'إعادة العرض',
    pillars: ['محاصيل منتقاة يدوياً', 'تعبئة طازجة في لاهور', 'عناية راقية بالهدايا والتوصيل'],
  },
};

type RevealPhase = 'sealed' | 'pressing' | 'opening' | 'open';

export interface PremiumHeroPrototypeProps {
  /** Deterministic override for unit/SSR verification of prefers-reduced-motion. */
  reducedMotionOverride?: boolean;
  /** Optional override for hero image src. */
  heroImageSrc?: string;
  /** Optional deterministic date override for seasonal preview tests. */
  seasonalDate?: Date;
}

export default function PremiumHeroPrototype({
  reducedMotionOverride,
  heroImageSrc = PREMIUM_HERO_IMAGE,
  seasonalDate,
}: PremiumHeroPrototypeProps = {}) {
  const { language, isRtl } = useLanguage();
  const { hero: customHero } = useStorefrontContent();
  const merchandising = useMerchandisingSettings();
  const systemReduced = usePrefersReducedMotion();
  const reducedMotion = reducedMotionOverride ?? systemReduced;
  const copy = PREMIUM_HERO_COPY[language] || PREMIUM_HERO_COPY.en;

  const isForcedSeason = Boolean(
    !customHero.enabled &&
      merchandising.seasonalMode &&
      merchandising.seasonalMode !== 'auto' &&
      merchandising.seasonalMode !== 'default',
  );
  const seasonal = useMemo(
    () => (customHero.enabled ? null : getSeasonalTheme(merchandising.seasonalMode, seasonalDate)),
    [customHero.enabled, merchandising.seasonalMode, seasonalDate],
  );

  const [revealRun, setRevealRun] = useState(0);
  const [phase, setPhase] = useState<RevealPhase>(() => (reducedMotion ? 'open' : 'sealed'));
  const [imageHidden, setImageHidden] = useState(false);

  useEffect(() => {
    setImageHidden(false);
  }, [customHero.enabled, customHero.image, customHero.mobileImage, heroImageSrc]);

  useEffect(() => {
    if (reducedMotion || customHero.enabled) {
      setPhase('open');
      return;
    }

    setPhase('sealed');
    const t1 = window.setTimeout(() => setPhase('pressing'), 90);
    const t2 = window.setTimeout(() => setPhase('opening'), 330);
    const t3 = window.setTimeout(() => setPhase('open'), 1160);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reducedMotion, customHero.enabled, revealRun]);

  const headingFontClass =
    language === 'ur'
      ? 'font-urdu text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem] leading-[1.85]'
      : language === 'ar'
        ? 'font-arabic text-[2.1rem] sm:text-[2.95rem] lg:text-[3.45rem] leading-[1.45]'
        : 'font-serif text-[2.05rem] sm:text-[3.05rem] lg:text-[3.7rem] leading-[1.09] tracking-[-0.02em]';

  const bodyFontClass =
    language === 'ur'
      ? 'font-urdu text-base leading-[2.1]'
      : language === 'ar'
        ? 'font-arabic text-base sm:text-lg leading-[1.85]'
        : 'font-sans text-[0.95rem] sm:text-[1.04rem] leading-[1.68]';

  const eyebrowText = customHero.enabled
    ? copy.eyebrow
    : isForcedSeason && seasonal
      ? pickLocalizedSeasonal(seasonal.eyebrow, language)
      : copy.eyebrow;

  const customHeadingText = [
    contentText(customHero.heading, language),
    contentText(customHero.accent, language),
  ]
    .filter(Boolean)
    .join(' ');

  const headlineText = customHero.enabled
    ? customHeadingText || copy.headline
    : isForcedSeason && seasonal
      ? `${pickLocalizedSeasonal(seasonal.headlinePart1, language)} ${pickLocalizedSeasonal(seasonal.headlineAccent, language)}`
      : copy.headline;

  const descriptionText = customHero.enabled
    ? contentText(customHero.description, language)
    : isForcedSeason && seasonal
      ? pickLocalizedSeasonal(seasonal.description, language)
      : copy.description;

  const primaryPath = customHero.enabled
    ? customHero.primaryPath
    : isForcedSeason && seasonal
      ? seasonal.primaryCtaPath
      : '/shop/dry-fruits';
  const primaryLabel = customHero.enabled
    ? contentText(customHero.primaryLabel, language)
    : isForcedSeason && seasonal
      ? pickLocalizedSeasonal(seasonal.primaryCtaLabel, language)
      : copy.primaryCta;

  const secondaryPath = customHero.enabled
    ? customHero.secondaryPath
    : isForcedSeason && seasonal
      ? seasonal.secondaryCtaPath
      : '/gifting';
  const secondaryLabel = customHero.enabled
    ? contentText(customHero.secondaryLabel, language)
    : isForcedSeason && seasonal
      ? pickLocalizedSeasonal(seasonal.secondaryCtaLabel, language)
      : copy.secondaryCta;

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-labelledby="premium-hero-heading"
      data-testid="premium-hero-prototype"
      data-reveal-phase={phase}
      data-season={seasonal?.id || 'default'}
      className="heritage-hero premium-hero-stage relative w-full overflow-hidden bg-[#042821] text-[#FDFBF7]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 80% 35%, rgba(30, 58, 43, 0.72) 0%, rgba(4, 40, 33, 0.96) 58%, #031D18 100%)',
      }}
    >
      <div aria-hidden="true" className="h-px w-full bg-gradient-to-r from-transparent via-[#C7982F]/45 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-14 lg:px-10 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-12">
          {/* Visual Stage: first on mobile for < 2.5s LCP, right 7 columns on desktop */}
          <div className="table-hero-art order-1 lg:order-2 lg:col-span-7">
            <figure className="m-0">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[22px] border border-[#C7982F]/40 bg-[#0B2E26] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]">
                {/* High-priority static photograph paints immediately at t=0 for optimal mobile LCP */}
                <picture
                  className="heritage-hero-background block h-full w-full"
                  key={`${customHero.enabled}-${customHero.image}-${customHero.mobileImage}-${heroImageSrc}`}
                >
                  {customHero.enabled && customHero.mobileImage && (
                    <source media="(max-width: 767px)" srcSet={customHero.mobileImage} />
                  )}
                  <img
                    src={customHero.enabled && customHero.image ? customHero.image : heroImageSrc}
                    alt={copy.imageAlt}
                    width={1440}
                    height={900}
                    loading="eager"
                    fetchPriority="high"
                    decoding="sync"
                    style={{ visibility: imageHidden ? 'hidden' : 'visible' }}
                    onLoad={() => setImageHidden(false)}
                    onError={() => setImageHidden(true)}
                    className="h-full w-full object-cover object-center"
                  />
                </picture>

                {/* ONE signature orchestrated motion: embossed crest seal press -> rigid emerald lid lifts smoothly once */}
                {!reducedMotion && !customHero.enabled && phase !== 'open' && (
                  <div
                    aria-hidden="true"
                    data-testid="premium-hero-lid"
                    className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[22px] motion-reduce:hidden"
                  >
                    <div
                      style={{
                        transition:
                          'transform 800ms cubic-bezier(0.22, 1, 0.36, 1), opacity 680ms ease-out',
                      }}
                      className={`absolute inset-0 flex flex-col items-center justify-center bg-[#042821] border-b-2 border-[#C7982F] shadow-[0_18px_40px_rgba(0,0,0,0.55)] will-change-transform ${
                        phase === 'opening'
                          ? '-translate-y-[106%] opacity-0'
                          : 'translate-y-0 opacity-100'
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-3 sm:inset-4 rounded-[16px] border border-[#C7982F]/40" />
                      <div className="pointer-events-none absolute inset-5 sm:inset-6 rounded-[12px] border border-[#C7982F]/20" />
                      <div
                        style={{ transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                        className={`flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border border-[#C7982F]/70 bg-[#07332A] p-3.5 shadow-[0_0_28px_rgba(199,152,47,0.22)] ${
                          phase === 'pressing' ? 'scale-90' : 'scale-100'
                        }`}
                      >
                        <AllBarkaCrestVector />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Caption hidden on mobile (prevents truncation); quiet caption + replay on sm+ */}
              {!customHero.enabled && (
                <figcaption className="mt-2.5 hidden sm:flex items-center justify-between gap-2 px-1 text-xs text-[#F2ECE2]/75">
                  <span dir="auto">{copy.caption}</span>
                  {!reducedMotion && (
                    <button
                      type="button"
                      onClick={() => setRevealRun((n) => n + 1)}
                      aria-label={copy.replayLabel}
                      className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#C7982F]/35 px-3.5 text-xs font-medium text-[#E4C783] transition-colors hover:border-[#C7982F] hover:bg-[#C7982F]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4C783]"
                    >
                      <RotateCcw size={13} aria-hidden="true" />
                      <span>{copy.replayLabel}</span>
                    </button>
                  )}
                </figcaption>
              )}
            </figure>
          </div>

          {/* Editorial Copy Stage: calm unified headline treatment, sentence-case eyebrow */}
          <div className="heritage-hero-content order-2 flex flex-col items-start text-start lg:order-1 lg:col-span-5">
            <div className="mb-3.5 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C7982F]/45 bg-[#1E3A2B]/65 p-1.5"
              >
                <AllBarkaCrestVector />
              </span>
              <p dir="auto" className="text-xs sm:text-[13px] font-medium text-[#E4C783]">
                {eyebrowText}
              </p>
            </div>

            <h1
              id="premium-hero-heading"
              lang={language}
              dir="auto"
              className={`heritage-hero-title font-medium text-[#FDFBF7] ${headingFontClass}`}
            >
              {headlineText}
            </h1>

            <p
              dir="auto"
              className={`heritage-hero-description mt-4 sm:mt-5 max-w-lg text-[#F2ECE2]/85 ${bodyFontClass}`}
            >
              {descriptionText}
            </p>

            {/* Two decisive high-contrast CTAs (48px height, crisp keyboard focus ring) */}
            <div className="mt-6 sm:mt-7 flex w-full flex-col gap-2.5 sm:gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link
                to={primaryPath}
                className="table-hero-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C7982F] px-7 py-3 text-sm font-semibold text-[#1A150B] transition-colors hover:bg-[#D7AA43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDFBF7]"
              >
                <span dir="auto">{primaryLabel}</span>
                <ArrowRight size={16} className="rtl-flip shrink-0" aria-hidden="true" />
              </Link>

              <Link
                to={secondaryPath}
                className="table-hero-secondary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#F2ECE2]/40 bg-transparent px-7 py-3 text-sm font-semibold text-[#FDFBF7] transition-colors hover:border-[#E4C783] hover:bg-[#FDFBF7]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4C783]"
              >
                <span dir="auto">{secondaryLabel}</span>
                <ArrowRight size={16} className="rtl-flip shrink-0" aria-hidden="true" />
              </Link>
            </div>

            {/* Quiet Lahore House Provenance Strip (area-level only, zero health claims) */}
            <ul
              aria-label="House provenance"
              className="mt-7 sm:mt-8 flex w-full flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#C7982F]/25 pt-4 sm:pt-5 text-xs text-[#F2ECE2]/80"
            >
              {copy.pillars.map((pillar, idx) => (
                <li key={pillar} className="inline-flex items-center gap-2">
                  {idx > 0 && (
                    <span aria-hidden="true" className="text-[#C7982F]/60">
                      ·
                    </span>
                  )}
                  <span dir="auto">{pillar}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="h-px w-full bg-gradient-to-r from-transparent via-[#C7982F]/45 to-transparent" />
    </section>
  );
}
