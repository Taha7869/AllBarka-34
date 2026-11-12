import { useCatalogTaxonomy } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import React, { useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigationType, useLocation, useOutletContext } from 'react-router-dom';
import CategoryPLP from '../components/CategoryPLP';
import CelebrationBoxesDestination from '../components/CelebrationBoxesDestination';
import GiftsHampersDestination from '../components/GiftsHampersDestination';
import DealsDestination from '../components/DealsDestination';
import OccasionsDestination from '../components/OccasionsDestination';
import WholesaleDestination from '../components/WholesaleDestination';
import SEO from '../components/SEO';
import { resolveCategorySlug, getCategoryMeta } from '../config/categories';
import { Product } from '../types';

export default function ShopPage() {
  const { category: paramCategory, occasion: paramOccasion } = useParams<{
    category?: string;
    occasion?: string;
  }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousScrollRoute = useRef<string | null>(null);
  const outletContext = useOutletContext<any>() || {};
  const { setSelectedQuickViewProduct, handleAddToCart } = outletContext;

  const isWholesaleRoute = location.pathname.startsWith('/wholesale');
  const isGiftingRoute = location.pathname.startsWith('/gifting');
  const isOccasionsRoute =
    location.pathname.startsWith('/occasions') ||
    searchParams.get('filter') === 'occasions' ||
    (searchParams.has('occasion') &&
      !paramCategory &&
      !isGiftingRoute &&
      !isWholesaleRoute &&
      !searchParams.get('category'));

  const rawCategory = isGiftingRoute
    ? 'gift-boxes'
    : (paramCategory || searchParams.get('category') || 'all');

  const taxonomy = useCatalogTaxonomy();
  const { language, t } = useLanguage();
  const extraCategory = taxonomy.find(item => item.type !== 'occasion' && item.id === rawCategory);
  const resolvedCategory = resolveCategorySlug(rawCategory) || extraCategory?.id || rawCategory;
  const defaultCategory = getCategoryMeta(resolvedCategory);
  const categoryName = extraCategory?.[`name_${language}`] || (language === 'en'
    ? defaultCategory.name
    : t(`shop.${resolvedCategory}`, extraCategory?.name_en || defaultCategory.name));
  const categoryDescription = extraCategory?.[`description_${language}`] || extraCategory?.description_en || defaultCategory.description;
  const searchQuery = searchParams.get('search') || '';

  const isCelebrationRoute =
    !searchQuery &&
    !isOccasionsRoute &&
    !isWholesaleRoute &&
    (resolvedCategory === 'celebration-boxes' ||
      location.pathname.startsWith('/shop/celebration-boxes') ||
      location.pathname.startsWith('/shop/bid-boxes') ||
      location.pathname.startsWith('/category/celebration-boxes'));

  const isGiftingDestination =
    !searchQuery &&
    !isOccasionsRoute &&
    !isWholesaleRoute &&
    (isGiftingRoute ||
      resolvedCategory === 'gift-boxes' ||
      resolvedCategory === 'combos' ||
      location.pathname.startsWith('/shop/gift-boxes') ||
      location.pathname.startsWith('/shop/combos'));

  const isDealsRoute =
    !searchQuery &&
    !isOccasionsRoute &&
    !isWholesaleRoute &&
    (resolvedCategory === 'deals' ||
      resolvedCategory === 'bundles' ||
      location.pathname.startsWith('/shop/deals') ||
      location.pathname.startsWith('/shop/bundles'));

  useEffect(() => {
    if (previousScrollRoute.current === location.pathname) return;
    previousScrollRoute.current = location.pathname;
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [resolvedCategory, location.pathname, navigationType]);

  const seoTitle = useMemo(() => {
    if (isWholesaleRoute) return 'Wholesale Dry Fruits & Bulk Reserve';
    if (isCelebrationRoute) return 'Celebration & Bid Boxes';
    if (isGiftingDestination) return 'Luxury Gift Boxes & Bespoke Hampers';
    if (isDealsRoute) return 'Value Packages & Curated Deals';
    if (isOccasionsRoute) return 'Curated Gifts for Every Occasion';
    if (searchQuery) return `Search results for "${searchQuery}"`;
    return `${categoryName} Catalogue`;
  }, [
    isWholesaleRoute,
    isCelebrationRoute,
    isGiftingDestination,
    isDealsRoute,
    isOccasionsRoute,
    searchQuery,
    categoryName,
  ]);

  const onQuickView = (p: Product) => setSelectedQuickViewProduct?.(p);

  return (
    <div className="w-full bg-[var(--color-base,#F6F1EA)] pt-6 pb-20">
      <SEO
        title={seoTitle}
        description={categoryDescription}
        canonicalPath={location.pathname}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {isCelebrationRoute ? (
          <CelebrationBoxesDestination onQuickView={onQuickView} />
        ) : isGiftingDestination ? (
          <GiftsHampersDestination onQuickView={onQuickView} />
        ) : isDealsRoute ? (
          <DealsDestination onQuickView={onQuickView} />
        ) : isOccasionsRoute ? (
          <OccasionsDestination
            onQuickView={onQuickView}
            initialOccasion={paramOccasion || searchParams.get('occasion') || undefined}
          />
        ) : isWholesaleRoute ? (
          <WholesaleDestination onQuickView={onQuickView} />
        ) : (
          <CategoryPLP
            initialCategory={resolvedCategory}
            searchFilter={searchQuery}
            isModal={false}
            isWholesale={isWholesaleRoute}
            onQuickView={onQuickView}
            onAddToCart={handleAddToCart}
          />
        )}
      </div>
    </div>
  );
}
