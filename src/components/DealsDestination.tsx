import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Tag,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Check,
  Eye,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { Product } from '../types';
import DestinationHeader, { DestinationNotice } from './DestinationHeader';
import { openCustomQuoteModal } from './CustomQuoteModal';

interface DealsDestinationProps {
  onQuickView?: (product: Product) => void;
}

export default function DealsDestination({ onQuickView }: DealsDestinationProps) {
  const { t, language } = useLanguage();
  const products = useCatalogProducts();
  const { addToCart, setIsCartOpen } = useCart();
  const mediaCover = useProductMediaCover();
  const [searchParams, setSearchParams] = useSearchParams();

  const filterParam = searchParams.get('filter') || 'all';
  const [filterTab, setFilterTab] = useState<'all' | 'duos' | 'hampers' | 'wellness'>(
    (filterParam as any) || 'all'
  );
  const [addedId, setAddedId] = useState<string | null>(null);

  // All active deals, bundles, and value packages
  const allDeals = useMemo(() => {
    return products.filter(
      p =>
        p.active !== false &&
        !p.isBidBox &&
        (p.id === 'deal-1' ||
          p.id === 'deal-2' ||
          p.category === 'bundles' ||
          p.isBundle ||
          (p.collections && p.collections.includes('deals')))
    );
  }, [products]);

  // Sub-filter tabs
  const filteredProducts = useMemo(() => {
    if (filterTab === 'duos') {
      return allDeals.filter(
        p => p.id.startsWith('deal-') || p.id === 'bundle-daily-grind' || p.id === 'bundle-tasting-flight'
      );
    }
    if (filterTab === 'hampers') {
      return allDeals.filter(
        p =>
          p.id.includes('hamper') ||
          p.id.includes('royal') ||
          p.id.includes('ramadan') ||
          p.id === 'corporate-gifting'
      );
    }
    if (filterTab === 'wellness') {
      return allDeals.filter(
        p =>
          p.id.includes('brain') ||
          p.id.includes('winter') ||
          p.id.includes('immunity') ||
          p.id.includes('sunrise') ||
          p.id.includes('mystery')
      );
    }
    return allDeals;
  }, [allDeals, filterTab]);

  const handleFilterChange = (tab: 'all' | 'duos' | 'hampers' | 'wellness') => {
    setFilterTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'all') {
      next.delete('filter');
    } else {
      next.set('filter', tab);
    }
    setSearchParams(next, { replace: true });
  };

  const handleAddToCart = (product: Product) => {
    const firstVariant = Object.keys(product.prices || {})[0];
    const price = firstVariant ? product.prices?.[firstVariant] || 0 : 0;
    if (!firstVariant || product.quoteOnly || product.orderMode === 'inquiry_quote' || price <= 0) {
      openCustomQuoteModal({ productId: product.id, mode: 'filled', quantity: 25 });
      return;
    }
    addToCart(product, firstVariant, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(prev => (prev === product.id ? null : prev)), 1600);
    setIsCartOpen(true);
  };

  const notices: DestinationNotice[] = [
    {
      id: 'verified-savings',
      type: 'verified',
      text: t('dest.deals.verifiedNotice'),
    },
  ];

  const filterTabs = [
    { id: 'all', labelKey: 'dest.deals.filterAll' },
    { id: 'duos', labelKey: 'dest.deals.filterDuos' },
    { id: 'hampers', labelKey: 'dest.deals.filterHampers' },
    { id: 'wellness', labelKey: 'dest.deals.filterWellness' },
  ];

  return (
    <div className="w-full">
      {/* Luxury Header */}
      <DestinationHeader
        eyebrow={t('dest.deals.eyebrow')}
        title={t('dest.deals.title')}
        description={t('dest.deals.description')}
        badge="Verified Bundle Rates"
        notices={notices}
      />

      {/* Filter Tabs */}
      <nav
        aria-label="Filter Deals & Packages"
        className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none"
      >
        {filterTabs.map(tab => {
          const isActive = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleFilterChange(tab.id as any)}
              aria-pressed={isActive}
              className={`min-h-11 shrink-0 rounded-full border px-5 text-xs font-semibold transition-all ${
                isActive
                  ? 'border-[#072a20] bg-[#072a20] text-[#fff8e9] dark:border-[#c7982f] dark:bg-[#c7982f] dark:text-[#072a20] shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#c7982f]'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </nav>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filteredProducts.map(product => {
          const coverImg = mediaCover[product.id] || product.image;
          const priceKeys = Object.keys(product.prices || {});
          const primaryVariant = priceKeys[0] || '1 pack';
          const price = product.prices?.[primaryVariant] || 0;
          const comparePrice = (product as any).compareAtPrice || (product as any).originalPrice;

          return (
            <article
              key={product.id}
              className="flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
            >
              {/* Product Image Frame */}
              <div className="relative aspect-square w-full overflow-hidden bg-[#FAF6EE] dark:bg-[#061811]">
                <img
                  src={coverImg}
                  alt={product.name_en}
                  loading="lazy"
                  className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />

                {/* Savings / Value Badge */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[#c7982f] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#072a20] shadow-sm flex items-center gap-1">
                    <TrendingDown size={11} />
                    {t('dest.deals.bundleSavings')}
                  </span>
                  {product.tag_en && (
                    <span className="rounded-full bg-[#072a20]/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-[#e6c786]">
                      {product.tag_en}
                    </span>
                  )}
                </div>

                {/* Direct Checkout vs Inquiry Badge */}
                <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold ${
                      !product.quoteOnly && product.orderMode !== 'inquiry_quote' && price > 0
                        ? 'bg-emerald-900/90 text-emerald-200'
                        : 'bg-amber-900/90 text-amber-200'
                    }`}
                  >
                    {!product.quoteOnly && product.orderMode !== 'inquiry_quote' && price > 0
                      ? t('dest.common.directCheckout')
                      : t('dest.common.customInquiry')}
                  </span>
                </div>

                {/* Quick View Button */}
                {onQuickView && (
                  <button
                    type="button"
                    onClick={() => onQuickView(product)}
                    className="absolute top-3 right-3 rounded-full bg-white/90 p-2 text-[#072a20] opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-white"
                    title="Quick view"
                    aria-label={`Quick view ${product.name_en}`}
                  >
                    <Eye size={16} />
                  </button>
                )}
              </div>

              {/* Card Body */}
              <div className="flex flex-col flex-1 p-5 sm:p-6 justify-between space-y-4">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-[var(--color-text)] leading-snug">
                    <Link
                      to={`/product/${product.id}`}
                      className="hover:text-[#c7982f] transition-colors"
                    >
                      {language === 'ur' && product.name_ur ? product.name_ur : product.name_en}
                    </Link>
                  </h2>
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                    {product.description || (product as any).description_en || ''}
                  </p>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline justify-between border-t border-[var(--color-border)] pt-3">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {primaryVariant}
                  </span>
                  <div className="flex items-baseline gap-2">
                    {comparePrice && comparePrice > price && (
                      <span className="text-xs text-[var(--color-text-muted)] line-through">
                        Rs. {comparePrice.toLocaleString()}
                      </span>
                    )}
                    <span className="font-serif text-xl font-bold text-[var(--color-text)]">
                      {price > 0 ? (
                        `Rs. ${price.toLocaleString()}`
                      ) : (
                        <span className="text-xs font-normal text-[var(--color-text-muted)]">
                          Quote on Request
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Direct Add to Cart Action vs Custom Quote */}
                {!product.quoteOnly && product.orderMode !== 'inquiry_quote' && price > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#072a20] py-3 text-xs font-bold text-[#fff8e9] hover:bg-[#124b3b] dark:bg-[#c7982f] dark:text-[#072a20] dark:hover:bg-[#d8a93e] transition-colors shadow-sm"
                  >
                    {addedId === product.id ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        Added to Bag!
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={14} />
                        Add Bundle to Bag
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      openCustomQuoteModal({
                        productId: product.id,
                        mode: 'filled',
                        quantity: 25,
                      })
                    }
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#c7982f] py-3 text-xs font-bold text-[#072a20] hover:bg-[#d8a93e] transition-colors shadow-sm"
                  >
                    Request Quote / Offer Your Rate
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
