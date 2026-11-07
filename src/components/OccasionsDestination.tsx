import React, { useMemo, useState, useEffect } from 'react';
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  RotateCcw,
  Check,
  Eye,
  Heart,
  Calendar,
  Layers,
} from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { Product } from '../types';
import {
  productMatchesOccasion,
  productMatchesCategory,
  normalizeOccasionSlug,
} from '../config/categories';
import DestinationHeader from './DestinationHeader';
import { openCustomQuoteModal } from './CustomQuoteModal';
import { openMehmaanPlannerModal } from './MehmaanTablePlannerModal';
import { openOccasionInquiryModal } from './OccasionInquiryModal';

interface OccasionsDestinationProps {
  onQuickView?: (product: Product) => void;
  initialOccasion?: string;
}

export default function OccasionsDestination({
  onQuickView,
  initialOccasion,
}: OccasionsDestinationProps) {
  const { t, language } = useLanguage();
  const products = useCatalogProducts();
  const { addToCart, setIsCartOpen } = useCart();
  const mediaCover = useProductMediaCover();
  const { occasion: routeOccasion } = useParams<{ occasion?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryOccasion = searchParams.get('occasion');
  const activeOccasionSlug = normalizeOccasionSlug(
    routeOccasion || queryOccasion || initialOccasion || 'all'
  ) || 'all';

  const [selectedOccasion, setSelectedOccasion] = useState<string>(activeOccasionSlug);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all'
  );
  const [addedId, setAddedId] = useState<string | null>(null);

  // Sync state with URL changes
  useEffect(() => {
    const slug = normalizeOccasionSlug(
      routeOccasion || searchParams.get('occasion') || initialOccasion || 'all'
    ) || 'all';
    setSelectedOccasion(slug);
  }, [routeOccasion, searchParams, initialOccasion]);

  useEffect(() => {
    setSelectedCategory(searchParams.get('category') || 'all');
  }, [searchParams]);

  const handleOccasionChange = (occ: string) => {
    setSelectedOccasion(occ);
    const search = searchParams.toString();
    const queryPart = search ? `?${search}` : '';
    if (location.pathname.startsWith('/occasions')) {
      if (occ === 'all') {
        navigate(`/occasions${queryPart}`);
      } else {
        navigate(`/occasions/${occ}${queryPart}`);
      }
    } else {
      const next = new URLSearchParams(searchParams);
      if (occ === 'all') {
        next.delete('occasion');
      } else {
        next.set('occasion', occ);
      }
      setSearchParams(next);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    const next = new URLSearchParams(searchParams);
    if (cat === 'all') {
      next.delete('category');
    } else {
      next.set('category', cat);
    }
    setSearchParams(next, { replace: true });
  };

  const handleResetFilters = () => {
    setSelectedOccasion('all');
    setSelectedCategory('all');
    if (location.pathname.startsWith('/occasions')) {
      navigate('/occasions', { replace: true });
    } else {
      const next = new URLSearchParams(searchParams);
      next.delete('occasion');
      next.delete('category');
      setSearchParams(next, { replace: true });
    }
  };

  // Authoritative filtering: Intersection of Occasion AND Category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.active === false) return false;
      const matchesOcc = productMatchesOccasion(p, selectedOccasion);
      const matchesCat = productMatchesCategory(p, selectedCategory);
      return matchesOcc && matchesCat;
    });
  }, [products, selectedOccasion, selectedCategory]);

  const handleAddToCart = (product: Product) => {
    const firstVariant = Object.keys(product.prices || {})[0] || 'Standard';
    const price = product.prices?.[firstVariant] || 0;
    if (product.quoteOnly || product.orderMode === 'inquiry_quote' || price <= 0) {
      openCustomQuoteModal({ productId: product.id, mode: 'filled', quantity: 25 });
      return;
    }
    addToCart(product, firstVariant, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(prev => (prev === product.id ? null : prev)), 1600);
    setIsCartOpen(true);
  };

  const occasions = [
    {
      id: 'all',
      titleKey: 'dest.occasions.all',
      descKey: 'dest.occasions.description',
    },
    {
      id: 'wedding',
      titleKey: 'dest.occasions.wedding',
      descKey: 'dest.occasions.weddingDesc',
    },
    {
      id: 'umrah',
      titleKey: 'dest.occasions.umrah',
      descKey: 'dest.occasions.umrahDesc',
    },
    {
      id: 'ramadan',
      titleKey: 'dest.occasions.ramadan',
      descKey: 'dest.occasions.ramadanDesc',
    },
    {
      id: 'birth',
      titleKey: 'dest.occasions.birth',
      descKey: 'dest.occasions.birthDesc',
    },
    {
      id: 'corporate',
      titleKey: 'dest.occasions.corporate',
      descKey: 'dest.occasions.corporateDesc',
    },
  ];

  const categorySubfilters = [
    { id: 'all', label: 'All Collections' },
    { id: 'celebration-boxes', label: 'Celebration Boxes' },
    { id: 'gift-boxes', label: 'Luxury Hampers' },
    { id: 'dry-fruits', label: 'Whole Dry Fruits' },
    { id: 'dates', label: 'Dates & Treats' },
  ];

  const currentOccasionMeta = occasions.find(o => o.id === selectedOccasion) || occasions[0];

  return (
    <div className="w-full">
      {/* Luxury Header */}
      <DestinationHeader
        eyebrow={t('dest.occasions.eyebrow')}
        title={t('dest.occasions.title')}
        description={t(currentOccasionMeta.descKey)}
        badge="Curated Celebrations"
      />

      {/* Occasion Switcher Tabs */}
      <nav
        aria-label="Filter by Occasion"
        className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none"
      >
        {occasions.map(occ => {
          const isActive = selectedOccasion === occ.id;
          return (
            <button
              key={occ.id}
              type="button"
              onClick={() => handleOccasionChange(occ.id)}
              aria-pressed={isActive}
              className={`min-h-11 shrink-0 rounded-full border px-5 text-xs font-semibold transition-all ${
                isActive
                  ? 'border-[#072a20] bg-[#072a20] text-[#fff8e9] dark:border-[#c7982f] dark:bg-[#c7982f] dark:text-[#072a20] shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#c7982f]'
              }`}
            >
              {t(occ.titleKey)}
            </button>
          );
        })}
      </nav>

      {/* Occasion & Mehmaan Planning Banners */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#043327]/10 via-[#FAF9F5] to-[#D4AF37]/10 dark:from-emerald-950/40 dark:via-zinc-900 dark:to-amber-950/30 border border-[#D4AF37]/30 shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#043327] dark:text-emerald-400">
            {t('dest.occasions.eyebrow', 'Artisan Celebration Services')}
          </span>
          <h3 className="text-sm font-serif font-bold text-[#120F17] dark:text-[#FAF9F5]">
            {t('mehmaan.servingAssumptions', 'Tailored Table Servings & Event Favors')}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openMehmaanPlannerModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 border border-[#D4AF37]/30 text-[#043327] dark:text-emerald-300 hover:border-[#043327] transition-all focus-ring shadow-xs"
          >
            <Sparkles size={14} />
            <span>{t('mehmaan.cta', 'Plan Mehmaan Table')}</span>
          </button>
          <button
            type="button"
            onClick={() => openOccasionInquiryModal(selectedOccasion !== 'all' ? (selectedOccasion as any) : 'wedding')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#043327] hover:bg-[#074b39] text-[#FAF9F5] transition-all focus-ring shadow-xs"
          >
            <Calendar size={14} />
            <span>{t('occasion.cta', 'Plan Event & Favors')}</span>
          </button>
        </div>
      </div>

      {/* Category Sub-Filters & Results Summary Bar */}
      <div className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            {t('dest.occasions.categoryFilter')}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {categorySubfilters.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#072a20] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#072a20]'
                      : 'border border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-text)] hover:border-[#c7982f]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[var(--color-text-muted)]">
          <span>
            <strong className="font-semibold text-[var(--color-text)]">
              {filteredProducts.length}
            </strong>{' '}
            {t('dest.common.results')}
          </span>
          {(selectedOccasion !== 'all' || selectedCategory !== 'all') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C6B1B] hover:underline dark:text-[#e6c786]"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--color-border)] p-12 text-center bg-[var(--color-surface)] my-8">
          <Calendar className="mx-auto h-12 w-12 text-[var(--color-text-muted)] mb-4" />
          <h3 className="font-serif text-2xl font-bold text-[var(--color-text)]">
            {t('dest.occasions.emptyTitle')}
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
            {t('dest.occasions.emptyCopy')}
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#072a20] px-6 py-3 text-xs font-bold text-[#fff8e9] hover:bg-[#124b3b] dark:bg-[#c7982f] dark:text-[#072a20] transition-colors shadow-md"
            >
              <RotateCcw size={14} />
              {t('dest.occasions.resetOccasion')}
            </button>
          </div>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredProducts.map(product => {
            const coverImg = mediaCover[product.id] || product.image;
            const priceKeys = Object.keys(product.prices || {});
            const primaryVariant = priceKeys[0] || '1 pack';
            const price = product.prices?.[primaryVariant] || 0;
            const isInquiryOnly = Boolean(product.quoteOnly || product.orderMode === 'inquiry_quote' || price <= 0);

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

                  {/* Occasion / Category Badges */}
                  <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {product.occasions && product.occasions.length > 0 && (
                      <span className="rounded-full bg-[#072a20]/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e6c786]">
                        {product.occasions[0]}
                      </span>
                    )}
                    <span className="rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-[#072a20] capitalize">
                      {product.category || 'Special'}
                    </span>
                  </div>

                  {/* Inquiry Badge (only shown when quote-only) */}
                  {isInquiryOnly && (
                    <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-amber-900/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-amber-200">
                        {t('dest.common.customInquiry')}
                      </span>
                    </div>
                  )}

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

                  {/* Price & Action */}
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

                  {!isInquiryOnly ? (
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
                          variantLabel: primaryVariant,
                          mode: 'filled',
                          quantity: 25,
                          eventType: selectedOccasion !== 'all' ? selectedOccasion : undefined,
                        });
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#c7982f] py-3 text-xs font-bold text-[#072a20] hover:bg-[#d8a93e] transition-colors shadow-sm cursor-pointer"
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
