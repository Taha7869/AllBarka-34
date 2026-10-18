import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package,
  Gift,
  Sparkles,
  ShoppingBag,
  MessageSquareQuote,
  Eye,
  Check,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { Product } from '../types';
import { resolveBidBoxConfig } from '../lib/bidBoxPricing';
import { openCustomQuoteModal } from './CustomQuoteModal';
import DestinationHeader, { DestinationNotice } from './DestinationHeader';

export type CelebrationSubcategory = 'all' | 'tin' | 'tabarruk' | 'wedding' | 'baby' | 'acrylic';

export function getCelebrationSubcategory(productId: string): CelebrationSubcategory {
  switch (productId) {
    case 'bid-box-luxury-tin':
      return 'tin';
    case 'bid-box-umrah-tabarruk':
      return 'tabarruk';
    case 'bid-box-card-nikkah':
    case 'bid-box-pyramid-favor':
    case 'bid-box-jute-pouch':
    case 'bid-box-sweet-nikkah':
      return 'wedding';
    case 'bid-box-birth-announcement':
      return 'baby';
    case 'bid-box-acrylic-royal':
      return 'acrylic';
    default:
      return 'wedding';
  }
}

interface CelebrationBoxesDestinationProps {
  onQuickView?: (product: Product) => void;
}

export default function CelebrationBoxesDestination({
  onQuickView,
}: CelebrationBoxesDestinationProps) {
  const { t, language } = useLanguage();
  const products = useCatalogProducts();
  const { addToCart, setIsCartOpen } = useCart();
  const mediaCover = useProductMediaCover();
  const [searchParams, setSearchParams] = useSearchParams();

  const subcategoryParam = (searchParams.get('subcat') as CelebrationSubcategory) || 'all';
  const modeParam = (searchParams.get('mode') as 'all' | 'empty' | 'filled') || 'all';

  const [selectedSubcat, setSelectedSubcat] = useState<CelebrationSubcategory>(subcategoryParam);
  const [modeFilter, setModeFilter] = useState<'all' | 'empty' | 'filled'>(modeParam);
  const [selectedCardModes, setSelectedCardModes] = useState<Record<string, 'empty' | 'filled'>>({});
  const [selectedTierIdx, setSelectedTierIdx] = useState<Record<string, number>>({});
  const [selectedFilledIdx, setSelectedFilledIdx] = useState<Record<string, number>>({});
  const [addedId, setAddedId] = useState<string | null>(null);

  // Authoritative celebration boxes list from catalog
  const celebrationBoxes = useMemo(() => {
    return products.filter(p => (p.isBidBox || p.category === 'celebration-boxes') && p.active !== false);
  }, [products]);

  // Filter by subcategory
  const filteredProducts = useMemo(() => {
    if (selectedSubcat === 'all') return celebrationBoxes;
    return celebrationBoxes.filter(p => getCelebrationSubcategory(p.id) === selectedSubcat);
  }, [celebrationBoxes, selectedSubcat]);

  const handleSubcatChange = (subcat: CelebrationSubcategory) => {
    setSelectedSubcat(subcat);
    const next = new URLSearchParams(searchParams);
    if (subcat === 'all') {
      next.delete('subcat');
    } else {
      next.set('subcat', subcat);
    }
    setSearchParams(next, { replace: true });
  };

  const handleModeChange = (mode: 'all' | 'empty' | 'filled') => {
    setModeFilter(mode);
    const next = new URLSearchParams(searchParams);
    if (mode === 'all') {
      next.delete('mode');
    } else {
      next.set('mode', mode);
    }
    setSearchParams(next, { replace: true });
  };

  const notices: DestinationNotice[] = [
    {
      id: 'lead-time',
      type: 'lead-time',
      text: t('dest.celebration.leadTimeNotice'),
    },
    {
      id: 'tabarruk',
      type: 'advisory',
      text: t('dest.celebration.tabarrukNotice'),
    },
  ];

  const subcategories: Array<{ id: CelebrationSubcategory; labelKey: string }> = [
    { id: 'all', labelKey: 'dest.celebration.subcat.all' },
    { id: 'tin', labelKey: 'dest.celebration.subcat.tin' },
    { id: 'tabarruk', labelKey: 'dest.celebration.subcat.tabarruk' },
    { id: 'wedding', labelKey: 'dest.celebration.subcat.wedding' },
    { id: 'baby', labelKey: 'dest.celebration.subcat.baby' },
    { id: 'acrylic', labelKey: 'dest.celebration.subcat.acrylic' },
  ];

  const handleAddToCart = (product: Product) => {
    const cfg = resolveBidBoxConfig(product);
    const cardMode = selectedCardModes[product.id] || (modeFilter === 'empty' ? 'empty' : 'filled');
    let variantKey = Object.keys(product.prices)[0] || 'Empty Box (1 pc)';

    if (cfg) {
      if (cardMode === 'empty') {
        const tierIndex = selectedTierIdx[product.id] ?? (cfg.emptyTiers.length > 1 ? 1 : 0);
        const tier = cfg.emptyTiers[tierIndex] || cfg.emptyTiers[0];
        if (tier) {
          variantKey = tier.variantKey;
        }
      } else {
        const filledIndex = selectedFilledIdx[product.id] ?? 0;
        const filledOpt = cfg.filledOptions[filledIndex] || cfg.filledOptions[0];
        if (filledOpt) {
          variantKey = filledOpt.variantKey;
        }
      }
    }

    addToCart(product, variantKey, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(prev => (prev === product.id ? null : prev)), 1600);
    setIsCartOpen(true);
  };

  return (
    <div className="w-full">
      {/* Luxury Header */}
      <DestinationHeader
        eyebrow={t('dest.celebration.eyebrow')}
        title={t('dest.celebration.title')}
        description={t('dest.celebration.description')}
        badge={`${celebrationBoxes.length} Curated Styles`}
        notices={notices}
      />

      {/* Subcategory Navigation Pills */}
      <nav
        aria-label="Celebration Box Subcategories"
        className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none"
      >
        {subcategories.map(cat => {
          const isActive = selectedSubcat === cat.id;
          const count =
            cat.id === 'all'
              ? celebrationBoxes.length
              : celebrationBoxes.filter(p => getCelebrationSubcategory(p.id) === cat.id).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSubcatChange(cat.id)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 min-h-11 shrink-0 rounded-full border px-5 text-xs font-semibold transition-all ${
                isActive
                  ? 'border-[#072a20] bg-[#072a20] text-[#fff8e9] dark:border-[#c7982f] dark:bg-[#c7982f] dark:text-[#072a20] shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#c7982f]'
              }`}
            >
              <span>{t(cat.labelKey)}</span>
              {cat.id !== 'all' && (
                <span
                  className={`text-[11px] rounded-full px-1.5 py-0.2 ${
                    isActive ? 'bg-[#c7982f]/30 text-[#fff8e9]' : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mode Filter & Quick Controls Bar */}
      <div className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Packaging Option:
          </span>
          <div className="inline-flex rounded-xl border border-[var(--color-border)] p-1 bg-[var(--color-base)]">
            <button
              type="button"
              onClick={() => handleModeChange('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                modeFilter === 'all'
                  ? 'bg-[#072a20] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#072a20]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {t('dest.celebration.mode.all')}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('empty')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                modeFilter === 'empty'
                  ? 'bg-[#072a20] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#072a20]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {t('dest.celebration.mode.empty')}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('filled')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                modeFilter === 'filled'
                  ? 'bg-[#072a20] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#072a20]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {t('dest.celebration.mode.filled')}
            </button>
          </div>
        </div>

        {/* Custom Quote Trigger */}
        <button
          type="button"
          onClick={() => openCustomQuoteModal({ mode: modeFilter === 'empty' ? 'empty' : 'filled' })}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c7982f] bg-[#FAF6EE] px-4 py-2 text-xs font-bold text-[#8C6B1B] hover:bg-[#8C6B1B] hover:text-white transition-colors"
        >
          <MessageSquareQuote size={14} />
          {t('dest.celebration.customQuoteCta')}
        </button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filteredProducts.map(product => {
          const cfg = resolveBidBoxConfig(product);
          const coverImg = mediaCover[product.id] || product.image;
          const currentMode = selectedCardModes[product.id] || (modeFilter === 'empty' ? 'empty' : 'filled');
          const subcat = getCelebrationSubcategory(product.id);

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

                {/* Subcategory & Occasion Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[#072a20]/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e6c786]">
                    {t(`dest.celebration.subcat.${subcat}`)}
                  </span>
                  {product.occasions && product.occasions.length > 0 && (
                    <span className="rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-[#072a20] capitalize">
                      {product.occasions[0]}
                    </span>
                  )}
                </div>

                {/* Direct Checkout / Inquiry Badge */}
                <div className="absolute bottom-3 left-3">
                  <span className="rounded-full bg-emerald-900/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
                    {t('dest.common.directCheckout')}
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

                {/* Packaging vs Filled Selector on the Card */}
                <div className="rounded-2xl border border-[var(--color-border)] p-3 bg-[var(--color-base)]/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase">
                      Select Mode:
                    </span>
                    <div className="inline-flex rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-surface)]">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCardModes(prev => ({ ...prev, [product.id]: 'empty' }))
                        }
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                          currentMode === 'empty'
                            ? 'bg-[#072a20] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#072a20]'
                            : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        Box Only
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCardModes(prev => ({ ...prev, [product.id]: 'filled' }))
                        }
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                          currentMode === 'filled'
                            ? 'bg-[#072a20] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#072a20]'
                            : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        Filled
                      </button>
                    </div>
                  </div>

                  {/* Mode-specific Pricing & Tiers */}
                  {currentMode === 'empty' ? (
                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          Starting at
                        </span>
                        <span className="font-serif text-base font-bold text-[var(--color-text)]">
                          Rs. {cfg?.emptyUnitStarting?.toLocaleString() || '180'}
                          <span className="text-xs font-normal text-[var(--color-text-muted)]"> / pc</span>
                        </span>
                      </div>
                      {/* Bulk Tier Chips */}
                      {cfg && cfg.emptyTiers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {cfg.emptyTiers.map((tier, idx) => {
                            const isSelected = (selectedTierIdx[product.id] ?? 0) === idx;
                            return (
                              <button
                                key={tier.qty}
                                type="button"
                                onClick={() =>
                                  setSelectedTierIdx(prev => ({ ...prev, [product.id]: idx }))
                                }
                                className={`rounded-md border px-2 py-1 text-[10px] font-bold transition-all ${
                                  isSelected
                                    ? 'border-[#072a20] bg-[#072a20] text-[#fff8e9] dark:border-[#c7982f] dark:bg-[#c7982f] dark:text-[#072a20]'
                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                                }`}
                              >
                                {tier.qty} pcs: Rs. {tier.unitPrice}/pc
                                {tier.discountBadge && (
                                  <span className="ml-1 text-[#e6c786]">{tier.discountBadge}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          Filled with Dry Fruits
                        </span>
                        <span className="font-serif text-base font-bold text-[var(--color-text)]">
                          Rs. {cfg?.filledMin?.toLocaleString() || '850'}
                          <span className="text-xs font-normal text-[var(--color-text-muted)]"> / box</span>
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#8C6B1B] dark:text-[#e6c786]">
                        {cfg?.filledSummary || 'Irani & Panjgur Dates with Roasted Nuts'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions: Add to Cart & Custom Quote */}
                <div className="space-y-2 pt-2">
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
                        Add to Bag ({currentMode === 'empty' ? 'Packaging' : 'Filled'})
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openCustomQuoteModal({
                        productId: product.id,
                        mode: currentMode,
                      })
                    }
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-[11px] font-semibold text-[var(--color-text-muted)] hover:border-[#c7982f] hover:text-[#c7982f] transition-colors"
                  >
                    <MessageSquareQuote size={13} />
                    Custom Quote / Large Order (&gt;100 pcs)
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bespoke Quote Banner */}
      <section className="mt-14 rounded-3xl border border-[#c7982f]/30 bg-gradient-to-r from-[#072a20] via-[#0d3f31] to-[#072a20] p-8 sm:p-10 text-[#fff8e9] shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#e6c786]">
              Concierge Wholesale &amp; Customization
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold">
              {t('dest.celebration.customQuoteBannerTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-[#d1ded5] leading-relaxed">
              {t('dest.celebration.customQuoteBannerCopy')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCustomQuoteModal({ quantity: 100, mode: 'filled' })}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#c7982f] px-6 py-3.5 text-xs font-bold text-[#072a20] hover:bg-[#d8a93e] transition-colors shadow-lg shrink-0"
          >
            <MessageSquareQuote size={16} />
            {t('dest.celebration.customQuoteCta')}
          </button>
        </div>
      </section>

      {/* Cross-Sell Cards */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C6B1B] dark:text-[#e6c786]">
              Fresh Roastery Inclusions
            </span>
            <h4 className="font-serif text-xl font-bold text-[var(--color-text)] mt-1">
              {t('dest.celebration.crossSellTitle')}
            </h4>
            <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
              {t('dest.celebration.crossSellCopy')}
            </p>
          </div>
          <Link
            to="/shop/dry-fruits"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#072a20] dark:text-[#e6c786] hover:underline"
          >
            {t('dest.celebration.crossSellCta')}
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C6B1B] dark:text-[#e6c786]">
              Family &amp; Executive Hampers
            </span>
            <h4 className="font-serif text-xl font-bold text-[var(--color-text)] mt-1">
              Looking for Finished Hampers?
            </h4>
            <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
              Explore our artisanal wicker baskets, honey pairings, and royal gift boxes ready for immediate delivery.
            </p>
          </div>
          <Link
            to="/gifting"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#072a20] dark:text-[#e6c786] hover:underline"
          >
            {t('dest.celebration.giftingCrossSellCta')}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
