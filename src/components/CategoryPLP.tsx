import { useNavigate, Link } from 'react-router-dom';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SlidersHorizontal,
  ChevronDown,
  X,
  Eye,
  ShoppingBag,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Product } from '../types';
import { PRODUCTS, getProductImage } from '../data/products';
import { useLanguage } from '../contexts/LanguageContext';
import {
  CANONICAL_CATEGORIES,
  resolveCategorySlug,
  getCategoryMeta,
} from '../config/categories';
import { useCart } from '../contexts/CartContext';

export interface CategoryPLPProps {
  searchFilter?: string;
  initialCategory?: string;
  onAddToCart?: (productId: string, weight: string) => void;
  onQuickView?: (product: Product) => void;
  isWholesale?: boolean;
  isModal?: boolean;
  onClose?: () => void;
}

export type SortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'harvest-newest';

// Build the dropdown list from canonical config + 'all' entry.
// This is the single source of truth for all category UI in this component.
const ALL_CATEGORY_ENTRY = {
  id: 'all',
  name: 'All Products',
  description: 'Explore our complete collection of luxury dry fruits, roasted nuts, cold-pressed oils, and curated gift sets.',
};

const PLP_CATEGORIES = [
  ALL_CATEGORY_ENTRY,
  ...Object.values(CANONICAL_CATEGORIES),
];

export function CategoryPLPSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`plp-skeleton-${i}`}
          className="bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/20 rounded-2xl p-6 flex flex-col items-center select-none"
        >
          {/* Inner Image Zone with 16px padding */}
          <div className="w-full aspect-square bg-[var(--color-cream,#FAF9F5)] rounded-xl p-4 flex items-center justify-center relative overflow-hidden border border-[var(--color-gold,#B8935F)]/15">
            <div className="w-3/4 h-3/4 rounded-lg bg-[var(--color-gold,#B8935F)]/10 animate-pulse" />
          </div>

          {/* Centered Text Details */}
          <div className="w-full flex flex-col items-center text-center mt-5 space-y-2.5">
            {/* Origin Pill Skeleton */}
            <div className="h-3 w-20 rounded-full bg-[var(--color-gold,#B8935F)]/15 animate-pulse" />
            {/* Title Skeleton */}
            <div className="h-5 w-3/4 rounded-md bg-[var(--color-ink,#1F120F)]/10 animate-pulse" />
            {/* Price Skeleton */}
            <div className="h-4 w-28 rounded-md bg-[var(--color-gold,#B8935F)]/20 animate-pulse" />
            {/* Action Bar Skeleton */}
            <div className="h-9 w-full rounded-full bg-[var(--color-ink,#1F120F)]/5 mt-3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CategoryPLP({
  searchFilter: propSearchFilter,
  initialCategory = 'nuts',
  onAddToCart,
  onQuickView,
  isWholesale = false,
  isModal = false,
  onClose
}: CategoryPLPProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  // Category & Sorting State
  
  // Resolve incoming initialCategory through the alias table so legacy slugs work.
  const resolvedInitial = useMemo(
    () => resolveCategorySlug(initialCategory) || 'all',
    [initialCategory]
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(resolvedInitial);

  // Sync when route changes (e.g. user navigates /category/seeds → snacks-seeds)
  React.useEffect(() => {
    setSelectedCategory(resolveCategorySlug(initialCategory) || 'all');
  }, [initialCategory]);

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    if (!isModal) {
      if (id === 'all') navigate('/shop');
      else navigate(`/category/${id}`);
    }
  };

  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter States
  const [priceMax, setPriceMax] = useState<number>(10000);
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all');
  const [onlyDiscounted, setOnlyDiscounted] = useState<boolean>(isWholesale);
  const [searchFilter, setSearchFilter] = useState<string>(propSearchFilter || '');

  React.useEffect(() => {
    if (propSearchFilter !== undefined) {
      setSearchFilter(propSearchFilter);
    }
  }, [propSearchFilter]);

  // Active Category Details — from canonical config
  const activeCategoryMeta = useMemo(() => {
    if (selectedCategory === 'all') return ALL_CATEGORY_ENTRY;
    return getCategoryMeta(selectedCategory);
  }, [selectedCategory]);

  // Handle Category Change with smooth simulated loading
  const handleCategorySwitch = (catId: string) => {
    if (catId === selectedCategory) return;
    setIsLoading(true);
    handleCategorySelect(catId);
    setTimeout(() => {
      setIsLoading(false);
    }, 280);
  };

  // Get available unique origins for filter
  const availableOrigins = useMemo(() => {
    const origins = new Set<string>();
    PRODUCTS.forEach((p) => {
      if (p.origin) origins.add(p.origin);
    });
    return ['all', ...Array.from(origins)];
  }, []);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      // Category Match — resolve aliases so /category/seeds → snacks-seeds products
      if (selectedCategory !== 'all') {
        // selectedCategory is already canonical (resolved on set); compare directly.
        if (product.category !== selectedCategory) return false;
      }

      // Origin Match
      if (selectedOrigin !== 'all' && product.origin !== selectedOrigin) {
        return false;
      }

      // Discount / Wholesale Only Match
      if (onlyDiscounted && !product.wholesale && !product.tag) {
        return false;
      }

      // Search Filter
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDesc = product.desc?.toLowerCase().includes(query);
        const matchesKeywords = product.keywords?.some((k) =>
          k.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesDesc && !matchesKeywords) {
          return false;
        }
      }

      // Price Filter (based on first weight price)
      const firstPrice = Object.values(product.prices)[0] || product.price || 0;
      if (firstPrice > priceMax) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const priceA = Object.values(a.prices)[0] || a.price || 0;
      const priceB = Object.values(b.prices)[0] || b.price || 0;

      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0; // featured default order
    });
  }, [selectedCategory, selectedOrigin, onlyDiscounted, searchFilter, priceMax, sortBy]);

  // Reset Filters
  const handleResetFilters = () => {
    setPriceMax(10000);
    setSelectedOrigin('all');
    setOnlyDiscounted(false);
    setSearchFilter('');
    setSortBy('featured');
  };

  const activeFiltersCount =
    (selectedOrigin !== 'all' ? 1 : 0) +
    (onlyDiscounted ? 1 : 0) +
    (priceMax < 10000 ? 1 : 0) +
    (searchFilter.trim() ? 1 : 0);

  // Per-card selected size state for WhatsApp ordering (keyed by product id)
  const [cardSelectedSizes, setCardSelectedSizes] = React.useState<Record<string, string>>({});

  const getCardSize = (productId: string, weights: string[]) =>
    cardSelectedSizes[productId] || weights[0] || '100ml';

  const setCardSize = (productId: string, size: string) =>
    setCardSelectedSizes((prev) => ({ ...prev, [productId]: size }));

  const handleWhatsAppOrder = (product: Product, size: string, price: number) => {
    const text = `Assalam-o-Alaikum AllBarka! 🌿%0AI want to order:%0A*${product.name}*%0ASize: *${size}*%0APrice: *Rs. ${price.toLocaleString()}*%0A%0APlease confirm availability and delivery details.`;
    window.open(`https://wa.me/923299455065?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="category-plp-container"
      className="min-h-screen bg-[var(--color-surface,#FDFBF7)] text-[var(--color-ink,#1F120F)] font-sans antialiased py-8 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative"
    >
      {/* Modal Close Action if rendered as overlay */}
      {isModal && onClose && (
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-[var(--color-gold,#B8935F)]/25">
          <div className="text-xs uppercase tracking-widest font-bold text-[var(--color-gold,#B8935F)]">
            AllBarka • Curated Boutique Listing
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full border border-[var(--color-gold,#B8935F)]/40 hover:border-[var(--color-ink,#1F120F)] text-[var(--color-ink,#1F120F)] transition-colors cursor-pointer bg-[var(--color-surface,#FDFBF7)] shadow-xs"
            aria-label="Close Category Listing"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. TOP: CLEAN CENTERED CATEGORY TITLE & EDITORIAL HEADER
      ─────────────────────────────────────────────────────────────── */}
      <header className="text-center max-w-3xl mx-auto space-y-4 mb-10 sm:mb-14">
        {/* Subtle Luxury Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[var(--color-gold,#B8935F)]/30 bg-[var(--color-gold,#B8935F)]/10 text-[var(--color-gold,#B8935F)] text-[10.5px] sm:text-xs uppercase tracking-[0.25em] font-bold">
          <Sparkles size={12} className="text-[var(--color-gold,#B8935F)]" />
          <span>Curated Estate Harvest</span>
        </div>

        {/* Primary Category Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-[var(--color-text-primary,#29231D)] tracking-tight leading-tight">
          {activeCategoryMeta.name}
        </h1>

        {/* Editorial Subtitle / Origin Notes — Clean High Contrast Muted Charcoal (WCAG AA 5.9+:1) */}
        <p className="text-sm sm:text-base text-[var(--color-text-secondary,#635B52)] leading-relaxed font-normal max-w-2xl mx-auto">
          {activeCategoryMeta.description}
        </p>

      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MINIMALIST UTILITY BAR: FILTER BUTTON & SORT DROPDOWN
      ─────────────────────────────────────────────────────────────── */}
      <section
        id="plp-utility-bar"
        className="border-y border-[var(--color-gold,#B8935F)]/25 py-3.5 mb-8 sm:mb-10 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        {/* Left: Show Filter Button with Lucide SVG */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              showFilterDrawer || activeFiltersCount > 0
                ? 'bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border-[var(--color-ink,#1F120F)]'
                : 'bg-[var(--color-surface,#FDFBF7)] text-[var(--color-ink,#1F120F)] border-[var(--color-gold,#B8935F)]/40 hover:border-[var(--color-gold,#B8935F)]'
            }`}
            aria-expanded={showFilterDrawer}
            aria-controls="filter-drawer"
          >
            <SlidersHorizontal size={14} className={showFilterDrawer ? 'text-[var(--color-gold-light,#D4B483)]' : 'text-[var(--color-gold,#B8935F)]'} />
            <span>{showFilterDrawer ? 'Hide Filters' : 'Show Filters'}</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[var(--color-gold,#B8935F)] text-[var(--color-surface,#FDFBF7)] text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Item Count Display */}
          <span className="text-xs text-[var(--color-ink,#1F120F)]/60 font-medium">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'Selection' : 'Selections'}
          </span>
        </div>

        {/* Right: Category and Sort Dropdowns */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 w-full sm:w-auto">
          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
            <label htmlFor="plp-category-select" className="text-xs uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70 font-semibold shrink-0">
              Category
            </label>
            <div className="relative min-w-0">
              <select
                id="plp-category-select"
                value={selectedCategory}
                onChange={(e) => handleCategorySwitch(e.target.value)}
                className="w-full appearance-none bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 text-[var(--color-ink,#1F120F)] text-xs sm:text-sm font-semibold rounded-full ps-4 pe-9 py-2 focus:outline-none focus:border-[var(--color-gold,#B8935F)] focus:ring-2 focus:ring-[var(--color-gold,#B8935F)]/20 cursor-pointer shadow-xs transition-colors"
              >
                {PLP_CATEGORIES.map((cat) => {
                  const count = cat.id === 'all'
                    ? PRODUCTS.length
                    : PRODUCTS.filter((p) => p.category === cat.id).length;
                  return <option key={cat.id} value={cat.id}>{cat.name} ({count})</option>;
                })}
              </select>
              <ChevronDown
                size={14}
                className="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-gold,#B8935F)]"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
            <label htmlFor="plp-sort-select" className="text-xs uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70 font-semibold shrink-0">
              Sort
            </label>
            <div className="relative min-w-0">
            <select
              id="plp-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full appearance-none bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 text-[var(--color-ink,#1F120F)] text-xs sm:text-sm font-semibold rounded-full ps-4 pe-9 py-2 focus:outline-none focus:border-[var(--color-gold,#B8935F)] focus:ring-2 focus:ring-[var(--color-gold,#B8935F)]/20 cursor-pointer shadow-xs transition-colors"
            >
              <option value="featured">Featured Curations</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Alphabetical: A - Z</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-gold,#B8935F)]"
              aria-hidden="true"
            />
          </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FILTER PANEL DRAWER (Minimalist Collapsible)
      ─────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilterDrawer && (
          <motion.div
            id="filter-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden mb-10"
          >
            <div className="bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 rounded-2xl p-6 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Max Price Range */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--color-ink,#1F120F)]">
                    <span>Price Threshold</span>
                    <span className="text-[var(--color-gold,#B8935F)] font-bold">Rs. {priceMax?.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="10000"
                    step="100"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full accent-[var(--color-gold,#B8935F)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--color-ink,#1F120F)]/50 font-medium">
                    <span>Rs. 300</span>
                    <span>Rs. 10,000+</span>
                  </div>
                </div>

                {/* Provenance / Origin Filter */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink,#1F120F)]">
                    Orchard Provenance
                  </label>
                  <select
                    value={selectedOrigin}
                    onChange={(e) => setSelectedOrigin(e.target.value)}
                    className="w-full bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 text-[var(--color-ink,#1F120F)] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-gold,#B8935F)] cursor-pointer"
                  >
                    <option value="all">All Heritage Regions</option>
                    {availableOrigins.filter((o) => o !== 'all').map((orig) => (
                      <option key={orig} value={orig}>
                        {orig}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Toggle & Reset */}
                <div className="flex flex-col justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[var(--color-ink,#1F120F)] pt-1">
                    <input
                      type="checkbox"
                      checked={onlyDiscounted}
                      onChange={(e) => setOnlyDiscounted(e.target.checked)}
                      className="rounded accent-[var(--color-gold,#B8935F)] w-4 h-4 cursor-pointer"
                    />
                    <span>Show Wholesale Tier / Special Editions Only</span>
                  </label>

                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--color-gold,#B8935F)] hover:text-[var(--color-ink,#1F120F)] font-semibold transition-colors cursor-pointer self-start"
                    >
                      <RotateCcw size={13} />
                      <span>Reset All Filters</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          3. PRODUCT GRID & CARD DESIGN (24px/16px PROPORTION RULE)
      ─────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <CategoryPLPSkeleton />
      ) : filteredProducts.length > 0 ? (
        <div
          id="plp-products-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8"
        >
          {filteredProducts.map((product) => {
            const weights = Object.keys(product.prices);
            const firstWeight = weights[0] || '500g';
            const basePrice = product.prices[firstWeight] || product.price || 0;
            const hasWholesaleDiscount = product.wholesale && product.wholesale < basePrice;
            const hasSpecialTag = product.tag;

            return (
              <motion.article
                key={product.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="group/card bg-[var(--color-surface,#FFFCF7)] dark:bg-[var(--color-surface,#1A201E)] border border-[var(--color-border)] dark:border-[var(--color-border)] hover:border-[var(--color-accent,#C7982F)] dark:hover:border-[var(--color-accent,#D4A843)] rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 relative select-none"
              >
                {/* Top Discount / Heritage Tag */}
                <div className="absolute top-3.5 right-3.5 z-10 flex flex-col items-end gap-1 pointer-events-none">
                  {hasWholesaleDiscount && (
                    <span className="px-2.5 py-0.5 rounded-full border border-[var(--color-accent,#C7982F)]/50 bg-[var(--color-surface,#FFFCF7)] dark:bg-[var(--color-surface-elevated,#222A28)] text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] text-[9.5px] font-extrabold uppercase tracking-widest shadow-xs">
                      Wholesale Tier
                    </span>
                  )}
                  {hasSpecialTag && (
                    <span className="px-2.5 py-0.5 rounded-full border border-[var(--color-accent,#C7982F)]/50 bg-[var(--color-surface,#FFFCF7)] dark:bg-[var(--color-surface-elevated,#222A28)] text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] text-[9.5px] font-black uppercase tracking-widest shadow-xs">
                      {product.tag}
                    </span>
                  )}
                </div>

                {/* Inner Image Zone — clicking image/title navigates to Product Detail */}
                <Link
                  to={`/product/${product.id}`}
                  className="block w-full aspect-square bg-[var(--color-surface-subtle,#FAF9F5)] dark:bg-[var(--color-surface-elevated,#222A28)] rounded-2xl p-4 flex items-center justify-center relative overflow-hidden border border-[var(--color-border)] dark:border-[var(--color-border)] group-hover/card:border-[var(--color-accent,#C7982F)]/40 transition-colors shadow-2xs focus-ring"
                  aria-label={`View details for ${product.name}`}
                  tabIndex={0}
                >
                  <img
                    src={getProductImage(product)}
                    alt={t(`imageAlt.${product.id}`, product.name)}
                    width={960}
                    height={960}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/product-placeholder.svg';
                    }}
                    className="w-full h-full object-contain filter drop-shadow-sm group-hover/card:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </Link>

                {/* Product Name — links to Product Detail */}
                <div className="w-full flex flex-col items-center text-center mt-4 space-y-1.5">
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)]">
                    {product.origin ? `Harvest • ${product.origin}` : 'Artisanal Selection'}
                  </span>
                  <Link
                    to={`/product/${product.id}`}
                    className="w-full focus-ring rounded-sm"
                  >
                    <h3 className="text-base sm:text-lg font-serif font-bold text-[var(--color-text-primary,#29231D)] leading-snug line-clamp-2 hover:text-[#C7982F] transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                </div>

                {/* Size selector & actions */}
                <div className="w-full mt-3 space-y-2.5">
                  {/* Size Pills */}
                  <div className="flex flex-wrap gap-1.5 justify-center" role="group" aria-label="Available sizes">
                    {Object.keys(product.prices).map((size) => {
                      const isActive = getCardSize(product.id, Object.keys(product.prices)) === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCardSize(product.id, size); }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 cursor-pointer ${
                            isActive
                              ? 'bg-[#1E3A2B] text-[#C7982F] border-[#1E3A2B]'
                              : 'bg-[var(--color-surface-subtle,#FAF9F5)] dark:bg-[var(--color-surface-elevated,#222A28)] text-[var(--color-text-primary,#29231D)] dark:text-[var(--color-text-primary,#F6F1EA)] border-[var(--color-border)] hover:border-[var(--color-accent,#C7982F)]'
                          }`}
                          aria-pressed={isActive}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>

                  {/* Live Price Display */}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-base sm:text-lg font-serif font-bold text-[var(--color-text-price,#29231D)] dark:text-[var(--color-text-price,#F6F1EA)]">
                      Rs. {(product.prices[getCardSize(product.id, Object.keys(product.prices))] || 0).toLocaleString()}
                    </span>
                    {hasWholesaleDiscount && isWholesale && (
                      <span className="text-xs text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] font-bold">
                        (Bulk Rs. {product.wholesale?.toLocaleString()})
                      </span>
                    )}
                  </div>

                  {/* Add to Cart + Quick View Action Row */}
                  <div className="pt-2 border-t border-[var(--color-border)] w-full flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const selectedSize = getCardSize(product.id, Object.keys(product.prices));
                        const selectedPrice = product.prices[selectedSize] || Object.values(product.prices)[0] || 0;
                        if (onAddToCart) {
                          onAddToCart(product.id, selectedSize);
                        } else {
                          addToCart(product, selectedSize, 1, selectedPrice);
                        }
                      }}
                      className="flex-1 min-h-[40px] py-1 px-3 rounded-full bg-[#1E3A2B] hover:bg-[#14281E] text-[#FDFBF7] border border-[#C5A059]/40 hover:border-[#C5A059] text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs active:scale-[0.98]"
                    >
                      <ShoppingBag size={13} strokeWidth={2} className="text-[#C5A059]" />
                      <span>{t('addToCart', 'Add to Cart')}</span>
                    </button>

                    {/* Explicit Quick View button — does NOT navigate to Product Detail */}
                    {onQuickView && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onQuickView(product);
                        }}
                        className="min-w-[40px] h-[40px] rounded-full border border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] dark:bg-[var(--color-surface,#1A201E)] flex items-center justify-center text-[var(--color-text-secondary,#635B52)] hover:text-[#C5A059] hover:border-[#C5A059] transition-colors shadow-xs cursor-pointer focus-ring"
                        aria-label={t('quickView', 'Quick View')}
                        title={t('quickView', 'Quick View')}
                      >
                        <Eye size={16} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-[var(--color-cream,#FAF9F5)] rounded-3xl border border-[var(--color-gold,#B8935F)]/25 space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[var(--color-gold,#B8935F)]/10 text-[var(--color-gold,#B8935F)] flex items-center justify-center mx-auto">
            <Sparkles size={20} />
          </div>
          <h3 className="text-xl font-serif font-bold text-[var(--color-ink,#1F120F)]">
            No Selections Match Your Criteria
          </h3>
          <p className="text-xs text-[var(--color-ink,#1F120F)]/70 max-w-xs mx-auto">
            Try adjusting your price threshold, provenance filters, or category tabs to view other harvest lots.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-5 py-2 rounded-full bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] text-xs font-semibold uppercase tracking-wider transition-all hover:bg-[var(--color-ink,#1F120F)]/90 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
