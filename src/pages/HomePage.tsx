import React, { useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowUpRight, Gift, ListChecks, Truck } from 'lucide-react';
import type { Product } from '../types';
import { usePublishedReviews, useStorefrontContent } from '../contexts/StorefrontContentContext';
import { useMerchandisingSettings } from '../contexts/MerchandisingContext';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { MOTION_STAGGER, revealStyle, useRevealOnce } from '../lib/motion';
import { AllBarkaCrestVector } from '../components/AllBarkaLogo';
import StorefrontBanner from '../components/StorefrontBanner';
import PremiumHeroPrototype from '../components/PremiumHeroPrototype';
import SignatureCollectionsSection from '../components/SignatureCollectionsSection';
import HouseSelectionsSection from '../components/HouseSelectionsSection';
import GiftingAtelierSection from '../components/GiftingAtelierSection';
import PatronVoicesSection from '../components/PatronVoicesSection';

interface OutletContextType {
  setCartOpen: (open: boolean) => void;
  setSelectedQuickViewProduct: (product: Product) => void;
  handleAddToCart: (productId: string, weight: string) => void;
}

const HOUSE_STANDARD_COPY: Record<
  LanguageCode,
  {
    eyebrow: string;
    heading: string;
    lead: string;
    faqLink: string;
    pillars: Array<{
      number: string;
      icon: typeof ListChecks;
      title: string;
      copy: string;
      path: string;
      action: string;
    }>;
  }
> = {
  en: {
    eyebrow: 'The Lahore house standard',
    heading: 'Quiet standards behind every sealed box.',
    lead: 'Prepared in Lahore for family tables and formal gifting across Pakistan — clear weights, honest origins and careful dispatch.',
    faqLink: 'Shipping & Care FAQ',
    pillars: [
      {
        number: '01',
        icon: ListChecks,
        title: 'Hand-Graded Harvests',
        copy: 'Whole kernels, plump dates and Grade-A Sargol saffron sorted by size and lot before packing — listed clearly with weight and price.',
        path: '/shop',
        action: 'Browse all products',
      },
      {
        number: '02',
        icon: Gift,
        title: 'Packed Fresh in Lahore',
        copy: 'Sealed to order in barrier pouches and rigid presentation boxes, with ribbon choices and printed message cards ready for gifting.',
        path: '/gifting',
        action: 'Explore gift boxes',
      },
      {
        number: '03',
        icon: Truck,
        title: 'Nationwide & Gifting Care',
        copy: 'Scheduled dispatch across Lahore and nationwide delivery across Pakistan with transparent shipping shown at checkout.',
        path: '/policies/shipping',
        action: 'Shipping policy',
      },
    ],
  },
  ur: {
    eyebrow: 'لاہور ہاؤس معیار',
    heading: 'ہر بند باکس کے پیچھے ہمارا سادہ اور پختہ معیار۔',
    lead: 'لاہور میں خاندانی دسترخوان اور باوقار تحائف کے لیے تازہ تیاری — واضح وزن، درست تفصیل اور احتیاط سے ترسیل۔',
    faqLink: 'ترسیل اور سوالات',
    pillars: [
      {
        number: '01',
        icon: ListChecks,
        title: 'ہاتھ سے منتخب فصل',
        copy: 'ثابت میوہ جات، منتخب کھجوریں اور سرگول زعفران وزن اور معیار کے مطابق چھانٹ کر صاف قیمت کے ساتھ پیش کیے جاتے ہیں۔',
        path: '/shop',
        action: 'تمام مصنوعات دیکھیں',
      },
      {
        number: '02',
        icon: Gift,
        title: 'لاہور میں تازہ پیکنگ',
        copy: 'آرڈر پر ایئر ٹائٹ پاؤچز اور مضبوط گفٹ باکسز میں ربن اور پرنٹڈ گفٹ کارڈ کے ساتھ پیک۔',
        path: '/gifting',
        action: 'گفٹ باکسز دیکھیں',
      },
      {
        number: '03',
        icon: Truck,
        title: 'ملک بھر میں باوقار ترسیل',
        copy: 'لاہور اور پاکستان بھر میں محفوظ ترسیل، چیک آؤٹ پر واضح ڈلیوری چارجز کے ساتھ۔',
        path: '/policies/shipping',
        action: 'شپنگ پالیسی',
      },
    ],
  },
  ar: {
    eyebrow: 'معيار دار لاهور',
    heading: 'معايير هادئة وراء كل صندوق مختوم.',
    lead: 'تُجهّز في لاهور لمائدة العائلة والهدايا الرسمية في أنحاء باكستان — أوزان واضحة ومصادر موثقة وتوصيل بعناية.',
    faqLink: 'أسئلة الشحن والعناية',
    pillars: [
      {
        number: '01',
        icon: ListChecks,
        title: 'محاصيل منتقاة يدوياً',
        copy: 'مكسرات كاملة وتمور مختارة وزعفران سرغول فاخر تُفرز حسب الحجم والدرجة قبل التعبئة مع وضوح الوزن والسعر.',
        path: '/shop',
        action: 'تصفح جميع المنتجات',
      },
      {
        number: '02',
        icon: Gift,
        title: 'تعبئة طازجة في لاهور',
        copy: 'تُختم عند الطلب في عبوات محكمة وصناديق هدايا متينة مع شرائط وبطاقات إهداء مطبوعة.',
        path: '/gifting',
        action: 'استكشف صناديق الهدايا',
      },
      {
        number: '03',
        icon: Truck,
        title: 'عناية التوصيل والهدايا',
        copy: 'شحن منظم في لاهور وإلى مختلف مدن باكستان مع توضيح رسوم التوصيل بشفافية عند الدفع.',
        path: '/policies/shipping',
        action: 'سياسة الشحن',
      },
    ],
  },
};

export default function HomePage() {
  const { language, isRtl } = useLanguage();
  const merchandisingSettings = useMerchandisingSettings();
  const content = useStorefrontContent();
  const publishedReviews = usePublishedReviews();
  const outlet = useOutletContext<OutletContextType>() || ({} as Partial<OutletContextType>);
  const setSelectedQuickViewProduct = outlet.setSelectedQuickViewProduct ?? (() => {});
  const handleAddToCart = outlet.handleAddToCart ?? (() => {});
  const standard = HOUSE_STANDARD_COPY[language] || HOUSE_STANDARD_COPY.en;
  const { ref: standardRef, visible: standardVisible, reducedMotion } = useRevealOnce<HTMLElement>();
  const crestWatermarkRef = useRef<HTMLDivElement | null>(null);

  // Subtle gold crest watermark scroll parallax (opacity 0.06, pure translate3d, static on reduced motion).
  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return;
    let rafId = 0;
    const updateParallax = () => {
      const section = standardRef.current;
      const watermark = crestWatermarkRef.current;
      if (!section || !watermark) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 900;
      const progress = (vh - rect.top) / (vh + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      const offsetY = (clamped - 0.5) * -52;
      watermark.style.transform = `translate3d(0, ${offsetY.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateParallax);
    };
    updateParallax();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, [reducedMotion, standardRef]);

  const sectionRenderers: Partial<Record<string, React.ReactNode>> = {
    collections: <SignatureCollectionsSection settings={merchandisingSettings} />,
    showcase: (
      <HouseSelectionsSection
        settings={merchandisingSettings}
        onAddToCart={handleAddToCart}
        onQuickView={setSelectedQuickViewProduct}
      />
    ),
    occasions: <GiftingAtelierSection settings={merchandisingSettings} />,
    care: (
      <section
        ref={standardRef}
        dir={isRtl ? 'rtl' : 'ltr'}
        aria-labelledby="lahore-house-standard-heading"
        data-testid="lahore-house-standard"
        className="editorial-care relative w-full overflow-hidden bg-[#042821] py-14 sm:py-20 text-[#FDFBF7]"
      >
        {/* Subtle gold crest watermark with gentle scroll parallax (opacity 0.06) */}
        <div
          ref={crestWatermarkRef}
          aria-hidden="true"
          data-testid="house-standard-watermark"
          className="pointer-events-none select-none absolute -end-16 top-1/2 -mt-44 h-[340px] w-[340px] sm:-mt-56 sm:h-[440px] sm:w-[440px] opacity-[0.06] will-change-transform"
        >
          <AllBarkaCrestVector />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div
            style={revealStyle(standardVisible, reducedMotion, 0)}
            className="mb-10 flex flex-col items-start justify-between gap-5 border-b border-[#C7982F]/25 pb-8 lg:flex-row lg:items-end"
          >
            <div className="max-w-2xl">
              <p dir="auto" className="text-xs sm:text-[13px] font-medium text-[#E4C783]">
                {standard.eyebrow}
              </p>
              <h2
                id="lahore-house-standard-heading"
                lang={language}
                dir="auto"
                className={`mt-2 font-serif text-2xl sm:text-4xl font-semibold text-[#FDFBF7] ${
                  language === 'ur' ? 'font-urdu leading-[1.9]' : language === 'ar' ? 'font-arabic leading-[1.5]' : 'leading-[1.15] tracking-[-0.015em]'
                }`}
              >
                {standard.heading}
              </h2>
              <p dir="auto" className="mt-3 max-w-xl text-sm leading-relaxed text-[#F2ECE2]/80">
                {standard.lead}
              </p>
            </div>

            <Link
              to="/faq"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#C7982F]/55 px-5 py-2.5 text-xs font-semibold text-[#FDFBF7] transition-all duration-200 hover:bg-[#C7982F] hover:text-[#042821] motion-safe:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4C783]"
            >
              <span dir="auto">{standard.faqLink}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {standard.pillars.map(({ number, icon: Icon, title, copy, path, action }, idx) => (
              <article
                key={number}
                style={revealStyle(standardVisible, reducedMotion, (idx + 1) * MOTION_STAGGER.cardsMs)}
                className="flex flex-col justify-between rounded-2xl border border-[#C7982F]/25 bg-[#1E3A2B]/40 p-6"
              >
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C7982F]/35 bg-[#C7982F]/10 text-[#E4C783]">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="font-serif text-sm text-[#E4C783]/75">{number}</span>
                  </div>
                  <h3 dir="auto" className="font-serif text-xl font-semibold text-[#FDFBF7]">
                    {title}
                  </h3>
                  <p dir="auto" className="mt-3 text-sm leading-relaxed text-[#F2ECE2]/80">
                    {copy}
                  </p>
                </div>

                <Link
                  to={path}
                  className="editorial-care-link mt-6 inline-flex min-h-[44px] w-fit items-center gap-1.5 text-xs font-semibold text-[#E4C783] underline underline-offset-4 hover:text-[#FDFBF7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E4C783]"
                >
                  <span dir="auto">{action}</span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
    reviews: publishedReviews.length > 0 ? <PatronVoicesSection reviews={publishedReviews} /> : null,
  };

  // Serene live Home sections: Hero (#1) + curated below-the-fold sections (Patron Voices renders ONLY with admin-published order reviews).
  // FAQ lives at /faq; GiftFinder & table planners live at /gifting & /occasions; search/voice live in Header.
  const orderedBelowFold = content.sections.filter(
    (entry) => entry.visible && entry.id !== 'faq' && Boolean(sectionRenderers[entry.id]),
  );

  return (
    <div className="editorial-home flex w-full flex-col items-center bg-[var(--color-base,#FDFBF7)] text-[var(--color-text-primary,#29231D)]">
      <StorefrontBanner />

      {/* Section 1 — Sticky Editorial Scroll Hero */}
      <PremiumHeroPrototype />

      {/* Sections 2+ slide seamlessly over the sticky editorial hero */}
      <div className="relative z-10 -mt-4 lg:mt-0 flex w-full flex-col items-center rounded-t-[24px] sm:rounded-t-[28px] bg-[var(--color-base,#FDFBF7)] shadow-[0_-18px_48px_-20px_rgba(4,40,33,0.4)] overflow-x-clip">
        {orderedBelowFold.map((entry) => (
          <div key={entry.id} data-content-section={entry.id} className="content-home-section w-full">
            {sectionRenderers[entry.id]}
          </div>
        ))}
      </div>
    </div>
  );
}
