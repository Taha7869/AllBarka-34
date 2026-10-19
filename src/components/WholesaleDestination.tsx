import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ShieldCheck,
  Clock,
  Sparkles,
  ShoppingBag,
  MessageSquareQuote,
  Check,
  Eye,
  ArrowRight,
  PackageCheck,
  Layers,
} from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { Product } from '../types';
import { buildHumanSupportWhatsAppUrl } from '../config/contacts';
import { resolveBidBoxConfig } from '../lib/bidBoxPricing';
import { openCustomQuoteModal } from './CustomQuoteModal';
import DestinationHeader, { DestinationNotice } from './DestinationHeader';

interface WholesaleDestinationProps {
  onQuickView?: (product: Product) => void;
}

export default function WholesaleDestination({ onQuickView }: WholesaleDestinationProps) {
  const { t, language } = useLanguage();
  const products = useCatalogProducts();
  const { addToCart, setIsCartOpen } = useCart();
  const mediaCover = useProductMediaCover();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'packaging' | 'food'>('all');
  const [addedId, setAddedId] = useState<string | null>(null);

  // Products eligible for wholesale / bulk tiers
  const wholesaleProducts = useMemo(() => {
    return products.filter(p => {
      if (p.active === false) return false;
      const isPackaging = p.isBidBox || p.category === 'celebration-boxes';
      const isFood = p.category === 'nuts' || p.category === 'snacks-seeds' || p.category === 'oils' || p.category === 'dates';
      const isCorporate = p.id === 'corporate-gifting' || p.category === 'bundles';
      return isPackaging || isFood || isCorporate;
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeTab === 'packaging') {
      return wholesaleProducts.filter(p => p.isBidBox || p.category === 'celebration-boxes');
    }
    if (activeTab === 'food') {
      return wholesaleProducts.filter(
        p => p.category === 'nuts' || p.category === 'snacks-seeds' || p.category === 'oils' || p.category === 'dates'
      );
    }
    return wholesaleProducts;
  }, [wholesaleProducts, activeTab]);

  const notices: DestinationNotice[] = [
    {
      id: 'wholesale-lead-time',
      type: 'lead-time',
      text: t('dest.wholesale.leadTimeCopy'),
    },
  ];

  const handleAddToCart = (product: Product) => {
    const isPackaging = product.isBidBox || product.category === 'celebration-boxes';
    const cfg = isPackaging ? resolveBidBoxConfig(product) : undefined;
    const firstVariant = isPackaging && cfg && cfg.emptyTiers.length > 0
      ? cfg.emptyTiers[0].variantKey
      : Object.keys(product.prices || {})[0] || 'Standard';
    const price = isPackaging && cfg && cfg.emptyTiers.length > 0
      ? cfg.emptyTiers[0].packPrice
      : product.prices?.[firstVariant] || 0;

    if (product.quoteOnly || product.orderMode === 'inquiry_quote' || price <= 0) {
      openCustomQuoteModal({
        productId: product.id,
        mode: isPackaging ? 'empty' : 'filled',
        quantity: isPackaging ? 50 : 25,
      });
      return;
    }
    addToCart(product, firstVariant, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(prev => (prev === product.id ? null : prev)), 1600);
    setIsCartOpen(true);
  };

  return (
    <div className="w-full">
      {/* Luxury Header */}
      <DestinationHeader
        eyebrow={t('dest.wholesale.eyebrow')}
        title={t('dest.wholesale.title')}
        description={t('dest.wholesale.description')}
        badge="Direct Commercial Desk"
        notices={notices}
      >
        {/* Concierge Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              openCustomQuoteModal({
                mode: 'filled',
                eventType: 'Corporate',
                quantity: 50,
              })
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-[#c7982f] px-6 py-3.5 text-xs font-bold text-[#072a20] hover:bg-[#d8a93e] transition-colors shadow-lg"
          >
            <Briefcase size={16} />
            {t('dest.wholesale.corporateCta')}
          </button>
          <a
            href={buildHumanSupportWhatsAppUrl(
              'Assalam-o-Alaikum AllBarka. I would like to inquire about corporate bulk ordering and tiered wholesale pricing.'
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-xs font-bold text-[#fff8e9] hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            <MessageSquareQuote size={16} />
            {t('dest.wholesale.whatsappConcierge')}
          </a>
        </div>
      </DestinationHeader>

      {/* Transparent Wholesale & MOQ Policies */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-bold text-[var(--color-text)] mb-6 flex items-center gap-2">
          <ShieldCheck size={22} className="text-[#8C6B1B] dark:text-[#c7982f]" />
          {t('dest.wholesale.policyTitle')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Food Exemption */}
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <PackageCheck size={20} />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">
              {t('dest.wholesale.foodMoqTitle')}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {t('dest.wholesale.foodMoqCopy')}
            </p>
          </div>

          {/* Card 2: Packaging Volume Tiers */}
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Layers size={20} />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">
              {t('dest.wholesale.packagingMoqTitle')}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {t('dest.wholesale.packagingMoqCopy')}
            </p>
          </div>

          {/* Card 3: 10-Day Preparation Lead Time */}
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Clock size={20} />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">
              {t('dest.wholesale.leadTimeTitle')}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {t('dest.wholesale.leadTimeCopy')}
            </p>
          </div>
        </div>
      </section>

      {/* Tab Filter */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`min-h-11 rounded-full border px-5 text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'border-[#072a20] bg-[#072a20] text-[#fff8e9] dark:border-[#c7982f] dark:bg-[#c7982f] dark:text-[#072a20]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#c7982f]'
          }`}
        >
          All Wholesale Reserves ({wholesaleProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('packaging')}
          className={`min-h-11 rounded-full border px-5 text-xs font-semibold transition-all ${
            activeTab === 'packaging'
              ? 'border-[#072a20] bg-[#072a20] text-[#fff8e9] dark:border-[#c7982f] dark:bg-[#c7982f] dark:text-[#072a20]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#c7982f]'
          }`}
        >
          Event Packaging &amp; Bid Boxes (Tiered)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('food')}
          className={`min-h-11 rounded-full border px-5 text-xs font-semibold transition-all ${
            activeTab === 'food'
              ? 'border-[#072a20] bg-[#072a20] text-[#fff8e9] dark:border-[#c7982f] dark:bg-[#c7982f] dark:text-[#072a20]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#c7982f]'
          }`}
        >
          Whole Harvest Dry Fruits (MOQ = 1)
        </button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filteredProducts.map(product => {
          const coverImg = mediaCover[product.id] || product.image;
          const isPackaging = product.isBidBox || product.category === 'celebration-boxes';
          const cfg = isPackaging ? resolveBidBoxConfig(product) : undefined;
          const priceKeys = Object.keys(product.prices || {});
          const primaryVariant = priceKeys[0] || '1 pack';
          const price = product.prices?.[primaryVariant] || 0;

          return (
            <article
              key={product.id}
              onClick={(event) => {
                if (!(event.target as HTMLElement).closest('a, button, input, select, textarea, [role="button"]')) {
                  navigate(`/product/${product.id}`);
                }
              }}
              className="flex flex-col cursor-pointer rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md hover:border-[var(--color-border-accent)] hover:shadow-xl transition-all duration-300 overflow-hidden group"
            >
              {/* Product Image Frame */}
              <div className="relative aspect-square w-full overflow-hidden bg-[#FAF6EE] dark:bg-[#061811]">
                <Link
                  to={`/product/${product.id}`}
                  aria-label={language === 'ur' && product.name_ur ? product.name_ur : product.name_en}
                  className="focus-ring block h-full w-full"
                >
                  <img
                    src={coverImg}
                    alt={product.name_en}
                    loading="lazy"
                    className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>

                {/* Tier / MOQ Badge */}
                <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[#072a20]/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e6c786]">
                    {isPackaging ? 'Tiered Wholesale' : 'MOQ = 1 Pack'}
                  </span>
                </div>

                {/* Quick View Button */}
                {onQuickView && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickView(product);
                    }}
                    className="focus-ring absolute top-3 right-3 rounded-full bg-white/90 p-2 text-[#072a20] opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity shadow-md hover:bg-white cursor-pointer"
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
                      className="focus-ring rounded-sm hover:text-[#c7982f] transition-colors"
                    >
                      {language === 'ur' && product.name_ur ? product.name_ur : product.name_en}
                    </Link>
                  </h2>
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                    {product.description || (product as any).description_en || ''}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Link
                      to={`/product/${product.id}`}
                      className="focus-ring inline-flex items-center gap-1 text-[11px] font-semibold text-[#8C6B1B] dark:text-[#e6c786] hover:underline"
                    >
                      <span>{t('dest.common.viewDetails', 'View Details')}</span>
                      <ArrowRight size={12} />
                    </Link>
                    {onQuickView && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickView(product);
                        }}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-base)] hover:text-[#c7982f] transition-colors cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>{t('quickView', 'Quick View')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Packaging Volume Tiers preview or food pricing */}
                {isPackaging && cfg && cfg.emptyTiers.length > 0 ? (
                  <div className="rounded-2xl border border-[var(--color-border)] p-3 bg-[var(--color-base)]/50 space-y-2">
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase">
                      Volume Tiers:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {cfg.emptyTiers.map(tier => (
                        <span
                          key={tier.qty}
                          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text)]"
                        >
                          {tier.qty} pcs · Rs. {tier.unitPrice}/pc
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between border-t border-[var(--color-border)] pt-3">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {primaryVariant}
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
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {!product.quoteOnly && product.orderMode !== 'inquiry_quote' && ((isPackaging && cfg && cfg.emptyTiers.length > 0) || (!isPackaging && price > 0)) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#072a20] py-3 text-xs font-bold text-[#fff8e9] hover:bg-[#124b3b] dark:bg-[#c7982f] dark:text-[#072a20] dark:hover:bg-[#d8a93e] transition-colors shadow-sm cursor-pointer"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        openCustomQuoteModal({
                          productId: product.id,
                          mode: isPackaging ? 'empty' : 'filled',
                          quantity: isPackaging ? 50 : 25,
                        });
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#c7982f] py-3 text-xs font-bold text-[#072a20] hover:bg-[#d8a93e] transition-colors shadow-sm cursor-pointer"
                    >
                      <Briefcase size={14} />
                      Request Commercial Quote
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCustomQuoteModal({
                        productId: product.id,
                        mode: isPackaging ? 'empty' : 'filled',
                        quantity: 100,
                      });
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-[11px] font-semibold text-[var(--color-text-muted)] hover:border-[#c7982f] hover:text-[#c7982f] transition-colors cursor-pointer"
                  >
                    <Briefcase size={13} />
                    Request Custom Commercial Quote
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
