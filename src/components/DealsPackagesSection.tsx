import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, MessageSquareQuote, ArrowRight, Check, Eye } from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useCart } from '../contexts/CartContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Product } from '../types';
import { openCustomQuoteModal } from './CustomQuoteModal';

interface DealsPackagesSectionProps {
  limit?: number;
  onQuickView?: (product: Product) => void;
}

export default function DealsPackagesSection({ limit, onQuickView }: DealsPackagesSectionProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const products = useCatalogProducts();
  const { addToCart, setIsCartOpen } = useCart();
  const mediaCover = useProductMediaCover();
  const [filterTab, setFilterTab] = useState<'all' | 'duos' | 'hampers' | 'wellness'>('all');
  const [addedId, setAddedId] = useState<string | null>(null);

  const dealsAndBundles = useMemo(() => {
    const all = products.filter(
      p =>
        p.active !== false &&
        !p.isBidBox &&
        (p.id === 'deal-1' || p.id === 'deal-2' || p.category === 'bundles' || p.isBundle)
    );
    if (filterTab === 'duos') {
      return all.filter(p => p.id.startsWith('deal-') || p.id === 'bundle-daily-grind' || p.id === 'bundle-tasting-flight');
    }
    if (filterTab === 'hampers') {
      return all.filter(p => p.id.includes('hamper') || p.id.includes('royal') || p.id.includes('ramadan') || p.id === 'corporate-gifting');
    }
    if (filterTab === 'wellness') {
      return all.filter(p => p.id.includes('brain') || p.id.includes('winter') || p.id.includes('immunity') || p.id.includes('sunrise') || p.id.includes('mystery'));
    }
    return all;
  }, [products, filterTab]);

  const displayed = limit ? dealsAndBundles.slice(0, limit) : dealsAndBundles;

  if (displayed.length === 0) return null;

  const handleAddBundle = (product: Product) => {
    const firstVariant = Object.keys(product.prices || {})[0];
    if (!firstVariant || product.quoteOnly) {
      openCustomQuoteModal({ productId: product.id, mode: 'filled', quantity: 25 });
      return;
    }
    addToCart(product, firstVariant, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(prev => (prev === product.id ? null : prev)), 1500);
    setIsCartOpen(true);
  };

  return (
    <section
      id="deals-value-packages"
      aria-labelledby="deals-value-packages-heading"
      className="w-full py-14 sm:py-20 bg-[#072A20] text-[#F7F1E3]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF6A]/20 border border-[#D4AF6A]/40 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#E6C786] mb-3">
              <Sparkles size={12} /> Curated Value &amp; Executive Hampers
            </div>
            <h2
              id="deals-value-packages-heading"
              className="font-serif text-3xl sm:text-4xl font-bold text-white"
            >
              Deals &amp; Value Packages
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-[#E5DEC9]/85">
              Signature 1kg Combo Duos, Daily Wellness Packs, and Silver, Gold &amp; Platinum Luxury Hampers synced with our live boutique catalog.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {([
              ['all', 'All Packages'],
              ['duos', '1kg Duos & Flights'],
              ['hampers', 'Luxury Hampers'],
              ['wellness', 'Wellness Bundles'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterTab(key)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  filterTab === key
                    ? 'bg-[#D4AF6A] text-[#072A20] shadow-md'
                    : 'bg-white/10 text-[#F7F1E3] hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Deals & Bundles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayed.map(product => {
            const firstVariant = Object.keys(product.prices || {})[0];
            const price = firstVariant ? product.prices[firstVariant] : null;
            const cover = mediaCover(product) || product.image || '/images/generated/walnut-pistachio-duo-catalog-v1.webp';

            return (
              <article
                key={product.id}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('a, button, input, select, textarea, [role="button"]')) return;
                  navigate(`/product/${product.id}`);
                }}
                className="group relative flex flex-col rounded-2xl border border-[#D4AF6A]/30 bg-[#0B3B2D]/90 overflow-hidden shadow-lg hover:border-[#D4AF6A]/70 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                {/* Clean Image Frame — No text badges overlaid on the photograph */}
                <div className="relative aspect-square w-full overflow-hidden bg-[#051F17]">
                  <Link to={`/product/${product.id}`} className="block w-full h-full">
                    <img
                      src={cover}
                      alt={product.name_en}
                      loading="lazy"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>
                  {onQuickView && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickView(product);
                      }}
                      aria-label={`Quick view ${product.name_en}`}
                      className="absolute top-3 right-3 rounded-full bg-white/95 hover:bg-[#D4AF6A] p-2.5 text-[#072A20] shadow-md transition-all"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                </div>

                {/* Card Body — Badges, Quick View trigger, full title, and actions below image */}
                <div className="flex-1 flex flex-col p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      {product.badge ? (
                        <span className="inline-flex items-center rounded-full bg-[#D4AF6A]/20 border border-[#D4AF6A]/45 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#E6C786]">
                          {product.badge}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E5DEC9]">
                          Value Package
                        </span>
                      )}
                      {onQuickView && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickView(product);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E6C786] hover:text-white transition-colors"
                        >
                          <Eye size={13} /> Quick View
                        </button>
                      )}
                    </div>

                    <Link
                      to={`/product/${product.id}`}
                      className="block font-serif text-base font-bold text-white hover:text-[#E6C786] transition-colors leading-snug"
                    >
                      {product.name_en}
                    </Link>
                    <p className="text-xs text-[#E6C786] font-urdu mt-0.5" dir="rtl">
                      {product.name_ur}
                    </p>
                    <div className="pt-0.5">
                      <Link
                        to={`/product/${product.id}`}
                        className="focus-ring inline-flex items-center gap-1 text-[11px] font-semibold text-[#E6C786] hover:text-white hover:underline"
                      >
                        <span>{t('dest.common.viewDetails', 'View Details')}</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>

                  <p className="text-xs text-[#E5DEC9]/85 line-clamp-2 flex-1">
                    {product.contents_en || product.desc_en}
                  </p>

                  <div className="flex items-baseline justify-between pt-2 border-t border-white/10">
                    <span className="text-[11px] uppercase tracking-wider text-[#E5DEC9]/75">
                      {firstVariant || 'Custom Quote'}
                    </span>
                    <span className="font-serif text-lg font-bold text-[#E6C786]">
                      {price ? `Rs. ${price.toLocaleString()}` : 'Custom Quote'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {!product.quoteOnly && price ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddBundle(product);
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D4AF6A] hover:bg-[#E6C786] text-[#072A20] py-2.5 px-3 text-xs font-extrabold uppercase tracking-wider transition-all"
                      >
                        {addedId === product.id ? (
                          <>
                            <Check size={14} /> Added to Cart
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={14} /> Add Package — Rs. {price.toLocaleString()}
                          </>
                        )}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCustomQuoteModal({
                          productId: product.id,
                          mode: 'filled',
                          quantity: 25,
                          targetUnitPrice: price ? price * 25 : undefined,
                        });
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D4AF6A]/45 bg-white/5 hover:bg-white/15 text-[#F7F1E3] py-2 px-3 text-[11px] font-bold uppercase tracking-wider transition-all"
                    >
                      <MessageSquareQuote size={13} className="text-[#E6C786]" />
                      Request Custom Quote / Bargain
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6">
          <p className="text-xs sm:text-sm text-[#E5DEC9]/80">
            Want to mix and match your own dry fruits or order 20+ corporate gift hampers? Use our Custom Quote &amp; Bargain desk.
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/shop/bundles"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E6C786] hover:underline"
            >
              View All Bundles <ArrowRight size={14} />
            </Link>
            <Link
              to="/gifting"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E6C786] hover:underline"
            >
              Explore Gift Boxes <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
