import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useStorefrontContent } from '../contexts/StorefrontContentContext';
import { contentText } from '../lib/storefrontContent';
import { useMerchandisingSettings } from '../contexts/MerchandisingContext';
import { getSeasonalTheme, pickLocalizedSeasonal } from '../lib/seasonalHomepage';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { MOTION_EASE_CSS } from '../lib/motion';
import { AllBarkaCrestVector } from './AllBarkaLogo';

export const PREMIUM_HERO_IMAGE = '/images/drafts-premium-20261122/01-hero-gift-box-dates.webp';

interface HeroCopy {
  eyebrow: string;
  headline: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  caption: string;
  imageAlt: string;
  pillars: readonly [string, string, string];
}

export const PREMIUM_HERO_COPY: Record<LanguageCode, HeroCopy> = {
  en: {
    eyebrow: 'Lahore gifting house',
    headline: 'Heirloom dry fruits and signature gift boxes.',
    description:
      'Selected dates, mountain nuts, Grade-A Sargol saffron and hand-ribboned hampers — graded and packed fresh to order in Lahore.',
    primaryCta: 'Explore Dry Fruits',
    secondaryCta: 'Shop Gift Boxes',
    caption: 'Signature Emerald Presentation Chest · Dates & Dry Fruits',
    imageAlt:
      'Open AllBarka matte emerald presentation gift box on warm travertine stone displaying dates, pistachios, almonds and walnuts',
    pillars: ['Hand-graded', 'Packed fresh in Lahore', 'Ribbon-tied gift boxes'],
  },
  ur: {
    eyebrow: 'لاہور گفٹنگ ہاؤس',
    headline: 'خالص خشک میوہ جات اور نفیس گفٹ باکسز۔',
    description:
      'منتخب کھجوریں، پہاڑی میوے، گریڈ اے سرگول زعفران اور ربن سے سجے ہیمپرز — لاہور میں تازہ چن کر پیک کیے جاتے ہیں۔',
    primaryCta: 'خشک میوہ جات دیکھیں',
    secondaryCta: 'گفٹ باکسز دیکھیں',
    caption: 'سگنیچر ایمرالڈ گفٹ باکس · کھجوریں اور خشک میوہ جات',
    imageAlt:
      'البرکہ کا گہرے سبز رنگ کا کھلا گفٹ باکس جس میں کھجوریں، پستے، بادام اور اخروٹ سجے ہیں',
    pillars: ['ہاتھ سے منتخب', 'لاہور میں تازہ پیک', 'ربن بند گفٹ باکسز'],
  },
  ar: {
    eyebrow: 'دار الهدايا في لاهور',
    headline: 'فواكه مجففة فاخرة وصناديق هدايا مميزة.',
    description:
      'تمور مختارة ومكسرات جبلية وزعفران سرغول درجة أولى وسلال هدايا مزينة بالشرائط — تُفرز وتُعبأ طازجة عند الطلب في لاهور.',
    primaryCta: 'تسوق الفواكه المجففة',
    secondaryCta: 'تصفح صناديق الهدايا',
    caption: 'صندوق الزمرد الفاخر · تمور ومكسرات مختارة',
    imageAlt:
      'صندوق هدايا البركة باللون الأخضر الزمردي مفتوح على حجر الترافرتين الدافئ ويعرض التمور والفستق واللوز والجوز',
    pillars: ['مفروزة يدوياً', 'معبأة طازجة في لاهور', 'صناديق هدايا بشريط'],
  },
};

export interface PremiumHeroPrototypeProps {
  reducedMotionOverride?: boolean;
  heroImageSrc?: string;
  seasonalDate?: Date;
}

const PILL_PARALLAX_PX = [-6, -13, -20] as const;

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

  const [imageHidden, setImageHidden] = useState(false);
  const runwayRef = useRef<HTMLDivElement | null>(null);
  const imageLayerRef = useRef<HTMLDivElement | null>(null);
  const vignetteRef = useRef<HTMLDivElement | null>(null);
  const pillRefs = useRef<Array<HTMLLIElement | null>>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setImageHidden(false);
  }, [customHero.enabled, customHero.image, customHero.mobileImage, heroImageSrc]);

  // Editorial scroll-driven choreography (pure transform + opacity via rAF, 60fps, static under reduced motion).
  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') {
      if (imageLayerRef.current) imageLayerRef.current.style.transform = 'scale(1)';
      if (vignetteRef.current) vignetteRef.current.style.opacity = '0.14';
      pillRefs.current.forEach((pill) => {
        if (pill) pill.style.transform = 'translate3d(0, 0, 0)';
      });
      return;
    }

    const updateOnScroll = () => {
      const runway = runwayRef.current;
      if (!runway) return;
      const rect = runway.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));

      // (a) Hero image smoothly settles from 1.08 -> 1.00 + subtle warm vignette shift
      if (imageLayerRef.current) {
        const scale = 1.08 - progress * 0.08;
        imageLayerRef.current.style.transform = `scale(${scale.toFixed(4)})`;
      }
      if (vignetteRef.current) {
        const vigOpacity = 0.14 + progress * 0.24;
        vignetteRef.current.style.opacity = vigOpacity.toFixed(3);
      }

      // (b) 3 factual callout pills float with staggered parallax
      pillRefs.current.forEach((pill, idx) => {
        if (!pill) return;
        const dy = progress * (PILL_PARALLAX_PX[idx] ?? -10);
        pill.style.transform = `translate3d(0, ${dy.toFixed(2)}px, 0)`;
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateOnScroll);
    };

    updateOnScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reducedMotion]);

  const headingFontClass =
    language === 'ur'
      ? 'font-urdu text-[1.95rem] sm:text-[2.75rem] lg:text-[3.25rem] leading-[1.85]'
      : language === 'ar'
        ? 'font-arabic text-[2.05rem] sm:text-[2.95rem] lg:text-[3.45rem] leading-[1.45]'
        : 'font-serif text-[2rem] sm:text-[3.05rem] lg:text-[3.7rem] leading-[1.08] tracking-[-0.02em]';

  const bodyFontClass =
    language === 'ur'
      ? 'font-urdu text-sm sm:text-base leading-[2.05]'
      : language === 'ar'
        ? 'font-arabic text-sm sm:text-lg leading-[1.85]'
        : 'font-sans text-[0.94rem] sm:text-[1.04rem] leading-[1.65]';

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
    <div
      ref={runwayRef}
      data-editorial-scroll-hero="true"
      className={`relative w-full bg-[#042821] ${
        reducedMotion ? 'min-h-0' : 'min-h-[118svh] lg:min-h-[140vh] motion-reduce:min-h-0'
      }`}
    >
      <section
        dir={isRtl ? 'rtl' : 'ltr'}
        aria-labelledby="premium-hero-heading"
        data-testid="premium-hero-prototype"
        data-reveal-phase="open"
        data-season={seasonal?.id || 'default'}
        className={`heritage-hero premium-hero-stage w-full overflow-hidden bg-[#042821] text-[#FDFBF7] flex flex-col justify-center ${
          reducedMotion ? 'relative' : 'sticky top-[56px] md:top-[76px] min-h-[calc(100svh-88px)] z-0 motion-reduce:static motion-reduce:min-h-0'
        }`}
        style={{
          backgroundImage:
            'radial-gradient(circle at 80% 35%, rgba(30, 58, 43, 0.72) 0%, rgba(4, 40, 33, 0.96) 58%, #031D18 100%)',
        }}
      >
        <div aria-hidden="true" className="h-px w-full bg-gradient-to-r from-transparent via-[#C7982F]/45 to-transparent" />

        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
          <div className="grid grid-cols-1 items-center gap-5 sm:gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Visual Stage: immediate Frame-1 LCP photograph (scales 1.08 -> 1.0 on scroll) */}
            <div className="table-hero-art order-1 lg:order-2 lg:col-span-7">
              <figure className="m-0">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[20px] sm:rounded-[22px] border border-[#C7982F]/40 bg-[#0B2E26] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]">
                  <div
                    ref={imageLayerRef}
                    data-hero-scale-layer="true"
                    style={{
                      transform: reducedMotion ? 'scale(1)' : 'scale(1.08)',
                      transformOrigin: 'center center',
                      transition: reducedMotion ? undefined : `transform 120ms ${MOTION_EASE_CSS}`,
                    }}
                    className="h-full w-full will-change-transform"
                  >
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
                  </div>

                  {/* Subtle warm vignette layer shifting calmly on scroll (never occludes LCP) */}
                  <div
                    ref={vignetteRef}
                    aria-hidden="true"
                    data-hero-vignette="true"
                    style={{
                      opacity: 0.14,
                      background:
                        'radial-gradient(ellipse at 52% 45%, rgba(199,152,47,0.10) 0%, rgba(28,18,8,0.42) 68%, rgba(4,28,22,0.72) 100%)',
                    }}
                    className="pointer-events-none absolute inset-0 will-change-[opacity]"
                  />
                </div>

                {!customHero.enabled && (
                  <figcaption className="mt-2.5 hidden sm:flex items-center justify-between gap-2 px-1 text-xs text-[#F2ECE2]/75">
                    <span dir="auto">{copy.caption}</span>
                  </figcaption>
                )}
              </figure>
            </div>

            {/* Editorial Copy Stage: headline + primary CTA immediately visible at scroll=0 */}
            <div className="heritage-hero-content order-2 flex flex-col items-start text-start lg:order-1 lg:col-span-5">
              <div className="mb-3 flex items-center gap-2.5 sm:gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-[#C7982F]/45 bg-[#1E3A2B]/65 p-1.5"
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
                className={`heritage-hero-description mt-3 sm:mt-5 max-w-lg text-[#F2ECE2]/85 ${bodyFontClass}`}
              >
                {descriptionText}
              </p>

              {/* Two decisive high-contrast CTAs immediately visible at scroll=0 */}
              <div className="mt-5 sm:mt-7 flex w-full flex-col gap-2.5 sm:gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Link
                  to={primaryPath}
                  className="table-hero-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C7982F] px-7 py-3 text-sm font-semibold text-[#1A150B] transition-all duration-200 hover:bg-[#D7AA43] motion-safe:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDFBF7]"
                >
                  <span dir="auto">{primaryLabel}</span>
                  <ArrowRight size={16} className="rtl-flip shrink-0" aria-hidden="true" />
                </Link>

                <Link
                  to={secondaryPath}
                  className="table-hero-secondary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#F2ECE2]/40 bg-transparent px-7 py-3 text-sm font-semibold text-[#FDFBF7] transition-all duration-200 hover:border-[#E4C783] hover:bg-[#FDFBF7]/10 motion-safe:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4C783]"
                >
                  <span dir="auto">{secondaryLabel}</span>
                  <ArrowRight size={16} className="rtl-flip shrink-0" aria-hidden="true" />
                </Link>
              </div>

              {/* 3 Factual Callout Pills with staggered scroll parallax (zero unverified claims) */}
              <ul
                aria-label="House provenance"
                className="mt-5 sm:mt-8 flex w-full flex-wrap items-center gap-2 border-t border-[#C7982F]/25 pt-4 sm:pt-5 text-[11px] sm:text-xs text-[#F2ECE2]/90"
              >
                {copy.pillars.map((pillar, idx) => (
                  <li
                    key={pillar}
                    ref={(el) => {
                      pillRefs.current[idx] = el;
                    }}
                    data-hero-callout={idx + 1}
                    className="inline-flex items-center rounded-full border border-[#C7982F]/35 bg-[#083329]/85 px-3 py-1.5 font-medium will-change-transform"
                  >
                    <span dir="auto">{pillar}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="h-px w-full bg-gradient-to-r from-transparent via-[#C7982F]/45 to-transparent" />
      </section>
    </div>
  );
}
