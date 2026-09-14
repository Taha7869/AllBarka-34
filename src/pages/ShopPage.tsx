import React, { useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useLocation, useOutletContext } from 'react-router-dom';
import CategoryPLP from '../components/CategoryPLP';
import Breadcrumbs from '../components/Breadcrumbs';
import SEO from '../components/SEO';
import { resolveCategorySlug, getCategoryMeta } from '../config/categories';
import { Product } from '../types';

export default function ShopPage() {
  const { category: paramCategory } = useParams<{ category: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const outletContext = useOutletContext<any>() || {};
  const { setSelectedQuickViewProduct, handleAddToCart } = outletContext;

  const isWholesaleRoute = location.pathname.startsWith('/wholesale');
  const isGiftingRoute = location.pathname.startsWith('/gifting');

  const rawCategory = isGiftingRoute
    ? 'combos'
    : (paramCategory || searchParams.get('category') || 'all');

  const resolvedCategory = resolveCategorySlug(rawCategory) || 'all';
  const categoryMeta = getCategoryMeta(resolvedCategory);
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [resolvedCategory, searchQuery, location.pathname]);

  const seoTitle = useMemo(() => {
    if (isWholesaleRoute) return 'Wholesale Dry Fruits & Bulk Reserve';
    if (isGiftingRoute) return 'Luxury Gift Boxes & Bespoke Hampers';
    if (searchQuery) return `Search results for "${searchQuery}"`;
    return `${categoryMeta.name} Catalogue`;
  }, [isWholesaleRoute, isGiftingRoute, searchQuery, categoryMeta.name]);

  return (
    <div className="w-full bg-[var(--color-base,#F6F1EA)] pt-6 pb-20">
      <SEO
        title={seoTitle}
        description={categoryMeta.description}
        canonicalPath={location.pathname}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <Breadcrumbs />
        <CategoryPLP
          initialCategory={resolvedCategory}
          searchFilter={searchQuery}
          isModal={false}
          isWholesale={isWholesaleRoute}
          onQuickView={(p: Product) => setSelectedQuickViewProduct?.(p)}
          onAddToCart={handleAddToCart}
        />
      </div>
    </div>
  );
}
