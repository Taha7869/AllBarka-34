import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowUpRight, Gift, ListChecks, Truck } from 'lucide-react';
import type { Product } from '../types';
import { useStorefrontContent } from '../contexts/StorefrontContentContext';
import { useMerchandisingSettings } from '../contexts/MerchandisingContext';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
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
  const outlet = useOutletContext<OutletContextType>() || ({} as Partial<OutletContextType>);
  const setSelectedQuickViewProduct = outlet.setSelectedQuickViewProduct ?? (() => {});
  const handleAddToCart = outlet.handleAddToCart ?? (() => {});
  const standard = HOUSE_STANDARD_COPY[language] || HOUSE_STANDARD_COPY.en;

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
        dir={isRtl ? 'rtl' : 'ltr'}
        aria-labelledby="lahore-house-standard-heading"
        data-testid="lahore-house-standard"
        className="editorial-care w-full bg-[#042821] py-14 sm:py-20 text-[#FDFBF7]"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mb-10 flex flex-col items-start justify-between gap-5 border-b border-[#C7982F]/25 pb-8 lg:flex-row lg:items-end">
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
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#C7982F]/55 px-5 py-2.5 text-xs font-semibold text-[#FDFBF7] transition-colors hover:bg-[#C7982F] hover:text-[#042821] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4C783]"
            >
              <span dir="auto">{standard.faqLink}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {standard.pillars.map(({ number, icon: Icon, title, copy, path, action }) => (
              <article
                key={number}
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
    reviews: <PatronVoicesSection />,
  };

  // Exactly 6 serene sections on live Home: Hero (#1) + 5 calm below-the-fold sections (#2-#6).
  // FAQ lives at /faq; GiftFinder & table planners live at /gifting & /occasions; search/voice live in Header.
  const orderedBelowFold = content.sections.filter(
    (entry) => entry.visible && entry.id !== 'faq' && Boolean(sectionRenderers[entry.id]),
  );

  return (
    <div className="editorial-home flex w-full flex-col items-center bg-[var(--color-base,#FDFBF7)] text-[var(--color-text-primary,#29231D)]">
      <StorefrontBanner />

      {/* Section 1 — Calm Hero with ONE signature presentation lid reveal */}
      <PremiumHeroPrototype />

      {/* Sections 2–6 — Signature Collections, House Selections, Gifting Atelier, House Standard, Patron Voices */}
      {orderedBelowFold.map((entry) => (
        <div key={entry.id} data-content-section={entry.id} className="content-home-section w-full">
          {sectionRenderers[entry.id]}
        </div>
      ))}
    </div>
  );
}
