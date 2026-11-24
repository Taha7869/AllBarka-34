import BundleContentsSummary from './BundleContentsSummary';
import { initialCardPortion } from '../lib/merchandisingPresentation';
import ProductImageGallery from './ProductImageGallery';
import { navigateToProductWithTransition, shouldInterceptLinkClick, supportsViewTransitions } from '../lib/viewTransitions';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, ShoppingBag, Heart, ArrowUpRight } from 'lucide-react';
import { useSavedProducts } from '../hooks/useSavedProducts';
import { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { getLocalized } from '../utils/localize';
import CartAddButton from './CartAddButton';
import { isPackagingProduct, getPackagingMoqDisplay } from '../lib/packagingMoq';
import { openCustomQuoteModal } from '../lib/customQuoteEvent';

interface ProductCardProps {
  product: Product;
  isWholesale: boolean;
  onAddToCart?: (productId: string, weight: string) => void;
  onQuickView?: (product: Product) => void;
  viewMode?: 'grid' | 'list';
  /** Homepage showcase: Quick View and View Details become full buttons beside/below Add to Bag. */
  separateActions?: boolean;
}

export default function ProductCard({
  product,
  isWholesale,
  onAddToCart,
  onQuickView,
  separateActions = false,
}: ProductCardProps) {
  const { t, language } = useLanguage();
  const { addToCart } = useCart();
  const { savedIds, setSaved } = useSavedProducts();
  const saved = savedIds.includes(product.id);
  const navigate = useNavigate();
  const disabledLabels = new Set(
    Array.isArray(product.variants)
      ? product.variants.filter(v => v && v.available === false).map(v => v.label)
      : []
  );
  const weights = Object.keys(product.prices || {}).filter(
    weight => !disabledLabels.has(weight) && Number.isFinite(product.prices[weight]) && product.prices[weight] > 0
  );
  const [preferredWeight, setSelectedWeight] = useState(initialCardPortion(product, weights));
  const selectedWeight = weights.includes(preferredWeight) ? preferredWeight : initialCardPortion(product, weights);
  const titleTypography = language === 'ur' ? 'font-urdu text-[20px]' : language === 'ar' ? 'font-arabic text-[23px]' : 'font-serif text-[21px] leading-[1.25]';

  const hasPositivePrice = weights.length > 0;
  const isQuoteOnly = Boolean(product.quoteOnly || product.orderMode === 'inquiry_quote' || !hasPositivePrice);
  const isPackaging = isPackagingProduct(product);
  const { moqPieces, minUnits: resolvedMinUnits } = getPackagingMoqDisplay(product, selectedWeight || undefined);
  const minUnits = resolvedMinUnits ?? 1;

  const firstAvailablePrice = weights.length > 0 ? product.prices[weights[0]] : 0;
  const unitPrice = isWholesale
    ? (product.wholesale || firstAvailablePrice || 0)
    : ((selectedWeight ? product.prices?.[selectedWeight] : 0) || firstAvailablePrice || 0);

  return (
    <div
      dir="ltr"
      className="boutique-product-card group/card relative flex h-full cursor-pointer flex-col bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-border)] hover:border-[#C7982F]/55 rounded-[16px] sm:rounded-[18px] p-3 sm:p-5 shadow-[0_4px_20px_-8px_rgba(4,40,33,0.08)] transition-colors duration-200 motion-reduce:transition-none"
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('a, button, input, select, textarea, [role="button"]')) {
          navigateToProductWithTransition(navigate, `/product/${product.id}`, {
            productId: product.id,
            sourceElement: event.currentTarget.querySelector<HTMLElement>('.product-gallery img') || event.currentTarget,
          });
        }
      }}
    >
      {/* Top Meta Line */}
      <div className="table-card-meta mb-1 flex min-h-11 items-center gap-1.5 sm:gap-2">
        <span dir="auto" className="min-w-0 flex-1 truncate text-[9px] font-sans font-medium uppercase tracking-[0.1em] text-[var(--color-accent-text)]">
          {getLocalized(product, 'origin', language)}
        </span>
        {getLocalized(product, 'tag', language) && (
          <span dir="auto" className="hidden sm:inline-block max-w-[42%] truncate rounded-full border border-[var(--color-border-accent)] bg-[var(--color-base)] px-2.5 py-1 text-[8px] font-sans font-medium uppercase tracking-[0.08em] text-[var(--color-accent-text)]">
            {getLocalized(product, 'tag', language) === 'Bestseller' && language !== 'en' ? t('slider.bestseller') : getLocalized(product, 'tag', language)}
          </span>
        )}
        <button type="button" onClick={() => setSaved(product.id, !saved)} aria-pressed={saved} aria-label={`${saved ? t('shop.unsave') : t('shop.save')}: ${getLocalized(product, 'name', language)}`} className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-accent-text)] transition-colors hover:bg-[var(--color-accent)]/10"><Heart size={17} strokeWidth={1.6} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>

      {/* Image Plate — 4:3 on mobile, 1:1 on desktop */}
      <ProductImageGallery product={product} />

      {/* Product Details */}
      <div dir={language === 'en' ? 'ltr' : 'rtl'} className="table-card-details min-w-0 flex-1 space-y-1.5 sm:space-y-2 pb-2.5 sm:pb-4 pt-1 text-start">
        <Link
          to={`/product/${product.id}`}
          className="block max-w-full focus-ring rounded-sm w-fit"
          onClick={(event) => {
            if (!shouldInterceptLinkClick(event) || !supportsViewTransitions()) return;
            const card = event.currentTarget.closest('.boutique-product-card');
            const img = card?.querySelector<HTMLElement>('.product-gallery img') || null;
            if (!img) return;
            event.preventDefault();
            navigateToProductWithTransition(navigate, `/product/${product.id}`, { productId: product.id, sourceElement: img });
          }}
        >
          <h3 lang={language} className={`mobile-card-title min-h-[2.6rem] sm:min-h-[3.5rem] whitespace-normal break-words [overflow-wrap:anywhere] font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent-text)] ${language === 'en' ? 'font-serif text-[15px] sm:text-[21px] leading-[1.25]' : titleTypography}`}>
            {getLocalized(product, 'name', language)}
          </h3>
        </Link>
        <BundleContentsSummary product={product} />
        <p className="hidden sm:block sm:min-h-[3rem] line-clamp-2 text-xs leading-6 text-[var(--color-text-secondary)]">
          {language !== 'en' && getLocalized(product, 'desc', language) === product.desc_en ? t('slider.cardCopy') : getLocalized(product, 'desc', language)}
        </p>
        {!separateActions && (
        <Link
            to={`/product/${product.id}`}
            className="focus-ring hidden sm:inline-flex items-center gap-1 pt-0.5 text-[11px] font-semibold text-[var(--color-accent-text)] hover:underline"
          >
            <span>{t('dest.common.viewDetails', 'View Details')}</span>
          </Link>
        )}
      </div>

      {/* Weights & Action Area */}
      <div className="table-card-purchase mt-auto space-y-2.5 sm:space-y-4 border-t border-[var(--color-border)] pt-2.5 sm:pt-4">
        {/* Size Chips — single horizontal row on mobile (40px visual chip inside 44px tap zone) */}
        {!isQuoteOnly && <div className="flex w-full flex-nowrap sm:flex-wrap gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={t('shop.portion')}>
          {weights.map((w) => (
            <button
              key={w}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedWeight(w);
              }}
              className={`focus-ring flex min-h-[44px] shrink-0 sm:flex-1 sm:min-w-[54px] cursor-pointer items-center justify-center rounded-lg border px-2.5 py-1 text-[10px] font-sans font-medium uppercase tracking-[0.04em] transition-colors duration-200 whitespace-nowrap ${
                selectedWeight === w
                  ? 'border-[#1E3A2B] bg-[#1E3A2B] text-[#FFFCF7] dark:border-[#C7982F]/50'
                  : 'border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]'
              }`}
              aria-pressed={selectedWeight === w}
            >
              {w}
            </button>
          ))}
        </div>}

        {/* Pricing & Add to Bag — single compact row on mobile, editorial stack on desktop */}
        <div className={separateActions ? 'table-card-cta' : 'flex items-center justify-between gap-2 sm:flex-col sm:items-stretch sm:gap-3'}>
          <div className="table-card-cta-price flex min-w-0 items-end justify-between gap-2">
            <div className="flex min-w-0 flex-col text-start">
              <span dir="auto" className="hidden sm:block text-[9px] font-sans font-medium uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                {t('price', 'Price')}
              </span>
              <span className="table-card-price truncate font-serif text-lg sm:text-2xl font-medium leading-tight tracking-tight text-[var(--color-text-price)]">
                {isQuoteOnly ? <span className="text-xs sm:text-base">{t('catalog.requestQuote')}</span> : <bdi dir="ltr">Rs. {unitPrice?.toLocaleString()}</bdi>}
              </span>
              {isPackaging && !isQuoteOnly && moqPieces !== null && (
                <span className="mt-0.5 sm:mt-1 text-[10px] font-semibold text-[#8C6B1B] bg-[#8C6B1B]/10 px-2 py-0.5 rounded-full border border-[#8C6B1B]/20 w-fit">
                  MOQ: {moqPieces} pcs
                </span>
              )}
            </div>
            {onQuickView && !separateActions && <button type="button" onClick={(e) => { e.stopPropagation(); onQuickView(product); }} className="focus-ring hidden sm:inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-base)] hover:text-[var(--color-accent-text)]" aria-label={`${t('quickView')}: ${getLocalized(product, 'name', language)}`}><Eye size={15} strokeWidth={1.7} /><span dir="auto">{t('quickView')}</span></button>}
          </div>

          <div className="table-card-cta-add shrink-0 sm:w-full">
            {isQuoteOnly ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openCustomQuoteModal({
                    productId: product.id,
                    variantLabel: selectedWeight,
                    mode: selectedWeight?.startsWith('Empty') ? 'empty' : 'filled',
                    quantity: moqPieces ?? 50,
                  });
                }}
                className="focus-ring flex min-h-[44px] sm:min-h-[46px] sm:w-full cursor-pointer items-center justify-center rounded-xl border border-[#c7982f]/35 bg-[#1e3a2b] px-3 text-[11px] sm:text-xs font-semibold text-[#fff8e9]"
              >
                {t('catalog.requestQuote')}
              </button>
            ) : <CartAddButton
              productId={product.id}
              portion={selectedWeight}
              onAdd={() => {
                if (onAddToCart) onAddToCart(product.id, selectedWeight);
                else addToCart(product, selectedWeight, minUnits);
              }}
              className="focus-ring flex min-h-[44px] min-w-[44px] sm:min-h-[46px] sm:w-full cursor-pointer items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-[#C7982F]/35 bg-[#1E3A2B] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#FFFCF7] transition-colors duration-200 hover:border-[#C7982F]/70 hover:bg-[#14281E]"
            >
              <span className="sm:hidden">{language === 'ur' ? 'شامل' : language === 'ar' ? 'أضف' : 'Add'}</span>
              <span className="hidden sm:inline">{t('addToCart')}</span>
            </CartAddButton>}
          </div>
          {separateActions && onQuickView && (
            <button type="button" onClick={event => { event.stopPropagation(); onQuickView(product); }} className="table-card-action table-card-cta-quick focus-ring" aria-label={`${t('quickView')} - ${getLocalized(product, 'name', language)}`}>
              <Eye size={15} strokeWidth={1.6} aria-hidden="true" /><span dir="auto">{t('quickView')}</span>
            </button>
          )}
          {separateActions && (
            <Link to={`/product/${product.id}`} className="table-card-action table-card-cta-details focus-ring" aria-label={`${t('dest.common.viewDetails', 'View Details')}: ${getLocalized(product, 'name', language)}`}>
              <span dir="auto">{t('dest.common.viewDetails', 'View Details')}</span><ArrowUpRight size={14} strokeWidth={1.7} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
