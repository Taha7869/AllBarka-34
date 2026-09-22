import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { getProductImage } from '../data/products';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';

interface ProductCardProps {
  product: Product;
  isWholesale: boolean;
  onAddToCart?: (productId: string, weight: string) => void;
  onQuickView?: (product: Product) => void;
  viewMode?: 'grid' | 'list';
}

export default function ProductCard({
  product,
  isWholesale,
  onAddToCart,
  onQuickView,
}: ProductCardProps) {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const weights = Object.keys(product.prices || {});
  const [selectedWeight, setSelectedWeight] = useState(weights[0] || '250g');

  const unitPrice = isWholesale
    ? (product.wholesale || Object.values(product.prices)[0] || 0)
    : (product.prices[selectedWeight] || Object.values(product.prices)[0] || 0);

  return (
    <div
      className="group/card bg-[var(--color-surface,#FFFCF7)] dark:bg-[var(--color-surface,#1A201E)] border border-[var(--color-border)] dark:border-[var(--color-border)] hover:border-[var(--color-accent,#C7982F)] dark:hover:border-[var(--color-accent,#D4A843)] rounded-3xl p-5 flex flex-col justify-between h-full transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] relative"
    >
      {/* Top Meta Line: Dark bronze labels on light backgrounds (WCAG AA compliant) */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)]">
          {product.health || 'Single-Origin'}
        </span>
        {product.tag && (
          <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-base,#F6F1EA)] dark:bg-[var(--color-surface-elevated,#222A28)] border border-[var(--color-accent,#C7982F)]/35 dark:border-[var(--color-accent,#D4A843)]/35 text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] text-[9.5px] font-sans font-semibold uppercase tracking-wider">
            {product.tag}
          </span>
        )}
      </div>

      {/* Image Plate */}
      <Link to={`/product/${product.id}`} className="block w-full aspect-[4/3] rounded-2xl bg-[var(--color-surface-subtle,#FAF9F5)] dark:bg-[var(--color-surface-elevated,#222A28)] border border-[var(--color-border)] dark:border-[var(--color-border)] overflow-hidden flex items-center justify-center p-3 relative group shadow-2xs focus-ring">
        <img
          src={getProductImage(product)}
          alt={t(`imageAlt.${product.id}`, product.name)}
          width={960}
          height={960}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/product-placeholder.svg';
          }}
          className="w-full h-full object-contain group-hover/card:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
      </Link>

      {/* Product Details */}
      <div className="pt-4 pb-2 space-y-1.5 flex-1 text-left">
        <Link to={`/product/${product.id}`} className="block focus-ring rounded-sm w-fit">
          <h3 className="text-lg font-serif font-bold text-[var(--color-text-primary,#29231D)] leading-snug line-clamp-1 hover:text-[#C7982F] transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-[var(--color-text-secondary,#635B52)] line-clamp-2 leading-relaxed font-sans">
          {product.desc}
        </p>
      </div>

      {/* Weights & Action Area */}
      <div className="pt-3 border-t border-dashed border-[var(--color-border)] dark:border-[var(--color-border)] space-y-3 mt-auto">
        {/* Weight Selector */}
        <div className="flex gap-1.5 w-full flex-wrap" role="group" aria-label="Available portion sizes">
          {weights.map((w) => (
            <button
              key={w}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedWeight(w);
              }}
              className={`flex-1 min-w-[54px] min-h-[38px] py-1.5 px-2 rounded-xl text-[10px] font-sans font-semibold tracking-wider uppercase border transition-all duration-200 cursor-pointer focus-ring flex items-center justify-center ${
                selectedWeight === w
                  ? 'bg-[#1E3A2B] text-[#C7982F] border-[#1E3A2B] shadow-xs'
                  : 'bg-[var(--color-base,#FDFBF7)] text-[var(--color-text-primary,#29231D)] border-[var(--color-border)] hover:border-[var(--color-accent,#C7982F)] dark:bg-[var(--color-surface-elevated,#222A28)] dark:text-[var(--color-text-primary,#F6F1EA)] dark:border-[var(--color-border)] dark:hover:border-[var(--color-accent,#D4A843)]'
              }`}
              aria-pressed={selectedWeight === w}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col text-start">
              <span className="text-[8.5px] uppercase tracking-widest text-[var(--color-text-secondary,#635B52)] font-sans font-medium">
                {t('price', 'Price')}
              </span>
              <span className="text-base sm:text-lg font-serif font-bold text-[var(--color-text-price,#29231D)]">
                <bdi dir="ltr">Rs. {unitPrice?.toLocaleString()}</bdi>
              </span>
            </div>
          </div>

          <div className="pt-1 border-t border-[var(--color-border)] w-full flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAddToCart) {
                  onAddToCart(product.id, selectedWeight);
                } else {
                  addToCart(product, selectedWeight, 1);
                }
              }}
              className="flex-1 min-h-[40px] py-1 px-3 rounded-full bg-[#1E3A2B] hover:bg-[#14281E] text-[#FDFBF7] border border-[#C5A059]/40 hover:border-[#C5A059] text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <ShoppingBag size={13} strokeWidth={2} className="text-[#C5A059]" />
              <span>{t('addToCart', 'Add to Cart')}</span>
            </button>
            <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onQuickView) onQuickView(product);
                }}
                className="flex items-center min-w-[40px] h-[40px] rounded-full border border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] dark:bg-[var(--color-surface,#1A201E)] flex items-center justify-center text-[var(--color-text-secondary,#635B52)] hover:text-[#C5A059] hover:border-[#C5A059] transition-colors shadow-xs cursor-pointer focus-ring"
                aria-label={t('quickView', 'Quick View')}
              >
                <Eye size={16} strokeWidth={2.2} />
                <span className="ms-1 text-xs">{t('quickView')}</span>
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
