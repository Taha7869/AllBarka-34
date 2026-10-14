import NotFoundPage from './NotFoundPage';
import React, { useEffect } from 'react';
import { useParams, useSearchParams, useLocation, useOutletContext } from 'react-router-dom';
import CategoryPLP from '../components/CategoryPLP';
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
    ? 'gift-boxes'
    : (paramCategory || searchParams.get('category') || 'all');

  const resolvedCategory = resolveCategorySlug(rawCategory) || 'all';
  const categoryMeta = getCategoryMeta(resolvedCategory);
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [resolvedCategory, location.pathname]);

  if (!resolveCategorySlug(rawCategory)) return <NotFoundPage />;

  return (
    <div className="w-full bg-[var(--color-base,#F6F1EA)] pt-6 pb-20">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
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
