import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, LayoutGroup } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useMerchandisingSettings } from '../contexts/MerchandisingContext';
import { DEFAULT_MERCHANDISING } from '../config/merchandising';
import { MOTION_DURATION, MOTION_EASE, MOTION_STAGGER, revealStyle, useRevealOnce } from '../lib/motion';
import ProductCard from './ProductCard';
import type { MerchandisingSettings, Product } from '../types';

interface HouseSelectionsSectionProps {
  settings?: MerchandisingSettings;
  products?: Product[];
  onAddToCart?: (productId: string, weight: string) => void;
  onQuickView?: (product: Product) => void;
}

type ManualTabId = 'dry-fruits' | 'gifts' | 'celebration-boxes';

const TAB_CONFIG: Array<{
  id: ManualTabId;
  sourceTabIds: string[];
  label: { en: string; ur: string; ar: string };
  destination: string;
}> = [
  {
    id: 'dry-fruits',
    sourceTabIds: ['dry-fruits', 'pantry'],
    label: {
      en: 'Dry Fruits & Dates',
      ur: 'خشک میوہ جات اور کھجوریں',
      ar: 'المكسرات والتمور',
    },
    destination: '/shop/dry-fruits',
  },
  {
    id: 'gifts',
    sourceTabIds: ['gifts', 'deals'],
    label: {
      en: 'Luxury Hampers',
      ur: 'لگژری ہیمپرز',
      ar: 'سلال الهدايا الفاخرة',
    },
    destination: '/gifting',
  },
  {
    id: 'celebration-boxes',
    sourceTabIds: ['celebration-boxes'],
    label: {
      en: 'Celebration Boxes',
      ur: 'شادی و تقاریب باکسز',
      ar: 'صناديق المناسبات',
    },
    destination: '/shop/celebration-boxes',
  },
];

const COPY: Record<
  LanguageCode,
  { eyebrow: string; heading: string; viewAll: string }
> = {
  en: {
    eyebrow: 'House selections',
    heading: 'Featured reserve, graded to order.',
    viewAll: 'View full collection',
  },
  ur: {
    eyebrow: 'منتخب پیشکش',
    heading: 'ہمارے خاص منتخب میوہ جات اور تحائف۔',
    viewAll: 'مکمل کلیکشن دیکھیں',
  },
  ar: {
    eyebrow: 'مختارات الدار',
    heading: 'تشكيلتنا المختارة، تُعبّأ عند الطلب.',
    viewAll: 'عرض التشكيلة الكاملة',
  },
};

function isLivePublished(product: Product): boolean {
  if (product.active === false) return false;
  if (product.status === 'draft' || product.status === 'archived') return false;
  return true;
}

export default function HouseSelectionsSection({
  settings: propSettings,
  products: propProducts,
  onAddToCart,
  onQuickView,
}: HouseSelectionsSectionProps = {}) {
  const { language, isRtl } = useLanguage();
  const catalogProducts = useCatalogProducts();
  const contextSettings = useMerchandisingSettings();
  const products = propProducts || catalogProducts;
  const activeSettings = propSettings || contextSettings || DEFAULT_MERCHANDISING;
  const copy = COPY[language] || COPY.en;
  const { ref: sectionRef, visible, reducedMotion } = useRevealOnce<HTMLElement>();

  const [activeTabId, setActiveTabId] = useState<ManualTabId>('dry-fruits');

  const resolvedTabs = useMemo(() => {
    const productById = new Map(products.map((p) => [p.id, p]));
    const configuredTabs = activeSettings.showcaseTabs?.length
      ? activeSettings.showcaseTabs
      : DEFAULT_MERCHANDISING.showcaseTabs;

    return TAB_CONFIG.map((tab) => {
      const picked: Product[] = [];
      const seen = new Set<string>();

      for (const sourceId of tab.sourceTabIds) {
        const cfg = configuredTabs.find((t) => t.id === sourceId && t.visible !== false);
        for (const id of cfg?.productIds || []) {
          if (seen.has(id)) continue;
          const prod = productById.get(id);
          if (prod && isLivePublished(prod)) {
            seen.add(id);
            picked.push(prod);
          }
          if (picked.length >= 3) break;
        }
        if (picked.length >= 3) break;
      }

      // Deterministic category fallback if configured IDs are unavailable
      if (picked.length < 3) {
        const fallbackCategories =
          tab.id === 'dry-fruits'
            ? ['nuts', 'dry-fruits', 'dates']
            : tab.id === 'gifts'
              ? ['bundles', 'gift-boxes']
              : ['celebration-boxes'];
        for (const prod of products) {
          if (picked.length >= 3) break;
          if (seen.has(prod.id) || !isLivePublished(prod)) continue;
          if (fallbackCategories.includes(prod.category)) {
            seen.add(prod.id);
            picked.push(prod);
          }
        }
      }

      return {
        ...tab,
        products: picked.slice(0, 3),
      };
    });
  }, [activeSettings.showcaseTabs, products]);

  const currentTab = resolvedTabs.find((t) => t.id === activeTabId) || resolvedTabs[0];

  return (
    <section
      ref={sectionRef}
      id="boutique-selections"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-labelledby="house-selections-heading"
      data-testid="house-selections-section"
      data-manual-tabs="true"
      className="w-full overflow-x-clip border-y border-[var(--color-border)] bg-[#F2ECE2] dark:bg-[#171D1B] py-14 sm:py-20 text-[var(--color-text-primary,#29231D)]"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div
          style={revealStyle(visible, reducedMotion, 0)}
          className="mb-8 flex flex-col items-start justify-between gap-5 lg:mb-10 lg:flex-row lg:items-end"
        >
          <div>
            <p dir="auto" className="text-xs sm:text-[13px] font-medium text-[var(--color-accent-text,#806326)]">
              {copy.eyebrow}
            </p>
            <h2
              id="house-selections-heading"
              lang={language}
              dir="auto"
              className={`mt-2 font-serif text-2xl sm:text-4xl font-semibold text-[var(--color-text-primary,#29231D)] ${
                language === 'ur' ? 'font-urdu leading-[1.9]' : language === 'ar' ? 'font-arabic leading-[1.5]' : 'leading-[1.15] tracking-[-0.015em]'
              }`}
            >
              {copy.heading}
            </h2>
          </div>

          {/* 3 Calm Manual Tabs — ZERO auto-rotation, ZERO timers; sliding gold indicator */}
          <LayoutGroup id="house-selections-tabs">
            <div
              role="tablist"
              aria-label={copy.eyebrow}
              className="flex flex-wrap gap-2"
            >
              {resolvedTabs.map((tab) => {
                const selected = tab.id === currentTab.id;
                return (
                  <button
                    key={tab.id}
                    id={`house-tab-${tab.id}`}
                    data-tab-id={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`house-panel-${tab.id}`}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`relative isolate min-h-[44px] min-w-[44px] rounded-full border px-5 py-2 text-xs sm:text-sm font-semibold transition-colors duration-200 motion-safe:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F] cursor-pointer ${
                      selected
                        ? 'border-[#C7982F]/80 text-[#FDFBF7] dark:text-[#121615]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] text-[var(--color-text-primary,#29231D)] hover:border-[#C7982F]'
                    }`}
                  >
                    {selected && (
                      <motion.span
                        layoutId={reducedMotion ? undefined : 'house-tab-active-bg'}
                        transition={reducedMotion ? { duration: 0 } : { duration: MOTION_DURATION.base, ease: MOTION_EASE }}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[#042821] dark:bg-[#C7982F]"
                      />
                    )}
                    <span dir="auto" className="relative z-10">{tab.label[language] || tab.label.en}</span>
                    {selected && (
                      <motion.span
                        layoutId={reducedMotion ? undefined : 'house-tab-gold-underline'}
                        transition={reducedMotion ? { duration: 0 } : { duration: MOTION_DURATION.base, ease: MOTION_EASE }}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-4 bottom-1.5 h-[2px] rounded-full bg-[#C7982F] dark:bg-[#042821]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        <motion.div
          key={currentTab.id}
          id={`house-panel-${currentTab.id}`}
          role="tabpanel"
          aria-labelledby={`house-tab-${currentTab.id}`}
          data-mobile-snap-row="true"
          initial={reducedMotion || typeof window === 'undefined' ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE }}
          className="-mx-5 flex flex-nowrap gap-4 overflow-x-auto px-5 pb-2 scroll-px-5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0"
        >
          {currentTab.products.map((product, idx) => (
            <div
              key={product.id}
              style={revealStyle(visible, reducedMotion, (idx + 1) * MOTION_STAGGER.cardsMs)}
              className="w-[70vw] max-w-[280px] shrink-0 snap-start md:w-auto md:max-w-none md:min-w-0"
            >
              <ProductCard
                product={product}
                isWholesale={false}
                onAddToCart={onAddToCart}
                onQuickView={onQuickView}
              />
            </div>
          ))}
        </motion.div>

        <div className="mt-8 flex justify-start sm:justify-end">
          <Link
            to={currentTab.destination}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--color-border-accent)] bg-[var(--color-surface,#FFFCF7)] px-6 text-xs sm:text-sm font-semibold text-[var(--color-text-primary,#29231D)] transition-colors hover:border-[#C7982F] hover:text-[var(--color-accent-text,#806326)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F]"
          >
            <span dir="auto">{copy.viewAll}</span>
            <ArrowRight size={15} className="rtl-flip" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
