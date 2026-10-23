import { useCatalogTaxonomy } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import React, { useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useLocation, useOutletContext } from 'react-router-dom';
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

  const taxonomy=useCatalogTaxonomy();const {language}=useLanguage();
  const extraCategory=taxonomy.find(x=>x.type!=='occasion'&&x.id===rawCategory);
  const resolvedCategory = resolveCategorySlug(rawCategory) || extraCategory?.id || rawCategory;
  const categoryMeta = extraCategory?{name:extraCategory[`name_${language}`]||extraCategory.name_en,description:extraCategory[`description_${language}`]||extraCategory.description_en}:getCategoryMeta(resolvedCategory);
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
    window.scrollTo(0, 0);
  }, [resolvedCategory, location.pathname]);

  const seoTitle = useMemo(() => {
    if (isWholesaleRoute) return 'Wholesale Dry Fruits & Bulk Reserve';
    if (isCelebrationRoute) return 'Celebration & Bid Boxes';
    if (isGiftingDestination) return 'Luxury Gift Boxes & Bespoke Hampers';
    if (isDealsRoute) return 'Value Packages & Curated Deals';
    if (isOccasionsRoute) return 'Curated Gifts for Every Occasion';
    if (searchQuery) return `Search results for "${searchQuery}"`;
    return `${categoryMeta.name} Catalogue`;
  }, [
    isWholesaleRoute,
    isCelebrationRoute,
    isGiftingDestination,
    isDealsRoute,
    isOccasionsRoute,
    searchQuery,
    categoryMeta.name,
  ]);

  const onQuickView = (p: Product) => setSelectedQuickViewProduct?.(p);

  return (
    <div className="w-full bg-[var(--color-base,#F6F1EA)] pt-6 pb-20">
      <SEO
        title={seoTitle}
        description={categoryMeta.description}
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
