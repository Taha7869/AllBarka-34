import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Gift,
  Sparkles,
  ShoppingBag,
  Briefcase,
  Check,
  Eye,
  SlidersHorizontal,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { Product } from '../types';
import { productMatchesOccasion } from '../config/categories';
import { openCustomQuoteModal } from './CustomQuoteModal';
import DestinationHeader from './DestinationHeader';
import { HAMPER_BOXES } from '../lib/hamperCatalog';

interface GiftsHampersDestinationProps {
  onQuickView?: (product: Product) => void;
}

export default function GiftsHampersDestination({
  onQuickView,
}: GiftsHampersDestinationProps) {
  const { t, language } = useLanguage();
  const products = useCatalogProducts();
  const { addToCart, setIsCartOpen } = useCart();
  const mediaCover = useProductMediaCover();
  const [searchParams, setSearchParams] = useSearchParams();

  const occasionParam = (searchParams.get('occasion') || 'all').trim().toLowerCase();
  const selectedOccasion = occasionParam;
  const [selectedWeight, setSelectedWeight] = useState<Record<string, string>>({});
  const [addedId, setAddedId] = useState<string | null>(null);

  // Authoritative gift & hamper products
  const giftProducts = useMemo(() => {
    return products.filter(p => {
      if (p.active === false) return false;
      const cat = (p.category || '').toLowerCase();
      const id = p.id.toLowerCase();
      return (
        cat === 'gift-boxes' ||
        cat === 'combos' ||
        (p as any).isGift === true ||
        id.includes('hamper') ||
        id === 'deal-1' ||
        id === 'deal-2' ||
        id === 'corporate-gifting' ||
        id === 'bundle-royal-feast'
      );
    });
  }, [products]);

  // Filter by occasion
  const filteredProducts = useMemo(() => {
    if (selectedOccasion === 'all') return giftProducts;
    return giftProducts.filter(p => productMatchesOccasion(p, selectedOccasion));
  }, [giftProducts, selectedOccasion]);

  const handleOccasionChange = (occ: string) => {
    const next = new URLSearchParams(searchParams);
    if (!occ || occ === 'all') {
      next.delete('occasion');
    } else {
      next.set('occasion', occ);
    }
    setSearchParams(next);
  };

  const handleLaunchBuilder = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-hamper-builder'));
    }
  };

  const handleAddToCart = (product: Product) => {
    const keys = Object.keys(product.prices);
    const chosenWeight = selectedWeight[product.id] || keys[0] || '1 box';
    const price = product.prices[chosenWeight] || Object.values(product.prices)[0] || 0;
    if (product.quoteOnly || product.orderMode === 'inquiry_quote' || price <= 0) {
      openCustomQuoteModal({ productId: product.id, mode: 'filled' });
      return;
    }
    addToCart(product, chosenWeight, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(prev => (prev === product.id ? null : prev)), 1600);
    setIsCartOpen(true);
  };

  const occasionTabs = [
    { id: 'all', labelKey: 'dest.occasions.all' },
    { id: 'wedding', labelKey: 'dest.occasions.wedding' },
    { id: 'umrah', labelKey: 'dest.occasions.umrah' },
    { id: 'ramadan', labelKey: 'dest.occasions.ramadan' },
    { id: 'corporate', labelKey: 'dest.occasions.corporate' },
  ];

  return (
    <div className="w-full">
      {/* Luxury Header */}
      <DestinationHeader
        eyebrow={t('dest.gifting.eyebrow')}
        title={t('dest.gifting.title')}
        description={t('dest.gifting.description')}
        badge="Artisanal Keepsakes"
      />

      {/* Featured Bespoke Hamper Builder Card */}
      <section className="mb-10 overflow-hidden rounded-3xl border border-[#c7982f]/40 bg-gradient-to-r from-[#12382a] via-[#1a4a38] to-[#0c2b20] p-6 sm:p-10 text-[#fff8e9] shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#c7982f]/20 px-3 py-1 text-xs font-semibold text-[#e6c786]">
              <Sparkles size={13} />
              {t('dest.gifting.builderSubtitle')}
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold leading-tight">
              {t('dest.gifting.builderTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-[#d1ded5] leading-relaxed max-w-xl">
              {t('dest.gifting.builderCopy')}
            </p>

            {/* Quick Box Options Preview */}
            <div className="pt-2 flex flex-wrap gap-2">
              {HAMPER_BOXES.map(box => (
                <span
                  key={box.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-[#f5efe2]"
                >
                  {box.name_en} · Rs. {box.price.toLocaleString()}
                </span>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleLaunchBuilder}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#c7982f] px-6 py-3.5 text-xs font-bold text-[#072a20] hover:bg-[#d8a93e] transition-colors shadow-lg"
              >
                <Gift size={16} />
                {t('dest.gifting.openBuilder')}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Corporate Inquiries Sidecard */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#e6c786]">
                <Briefcase size={14} />
                {t('dest.gifting.corporateTitle')}
              </div>
              <p className="text-xs text-[#d1ded5] leading-relaxed">
                {t('dest.gifting.corporateCopy')}
              </p>
              <button
                type="button"
                onClick={() =>
                  openCustomQuoteModal({
                    mode: 'filled',
                    eventType: 'Corporate',
                    quantity: 25,
                  })
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e6c786] hover:underline"
              >
                {t('dest.gifting.requestCorporateQuote')}
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Occasion Filter Pills */}
      <nav
        aria-label="Filter Hampers by Occasion"
        className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none"
      >
        {occasionTabs.map(tab => {
          const isActive = selectedOccasion === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleOccasionChange(tab.id)}
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

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center shadow-sm">
          <Gift size={40} className="mx-auto text-[#c7982f] mb-4" />
          <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">
            {t('dest.occasions.emptyTitle')}
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
            {t('dest.occasions.emptyCopy')}
          </p>
          <button
            type="button"
            onClick={() => handleOccasionChange('all')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#072a20] px-5 py-2.5 text-xs font-bold text-[#fff8e9] hover:bg-[#124b3b] dark:bg-[#c7982f] dark:text-[#072a20] dark:hover:bg-[#d8a93e] transition-colors"
          >
            {t('dest.occasions.resetOccasion')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredProducts.map(product => {
          const coverImg = mediaCover[product.id] || product.image;
          const priceKeys = Object.keys(product.prices);
          const currentWeight = selectedWeight[product.id] || priceKeys[0] || '1 box';
          const price = product.prices[currentWeight] || Object.values(product.prices)[0] || 0;

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

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[#072a20]/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e6c786]">
                    Curated Gift
                  </span>
                  {product.occasions && product.occasions.length > 0 && (
                    <span className="rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-[#072a20] capitalize">
                      {product.occasions[0]}
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

                {/* Weights / Pack Sizes */}
                {priceKeys.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {priceKeys.map(key => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedWeight(prev => ({ ...prev, [product.id]: key }))}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          currentWeight === key
                            ? 'border-[#072a20] bg-[#072a20] text-[#fff8e9] dark:border-[#c7982f] dark:bg-[#c7982f] dark:text-[#072a20]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                )}

                {/* Pricing & Inclusions */}
                <div className="flex items-baseline justify-between border-t border-[var(--color-border)] pt-3">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Price
                  </span>
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
                        Add to Bag
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      openCustomQuoteModal({
                        productId: product.id,
                        variantLabel: currentWeight,
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
      )}
    </div>
  );
}
