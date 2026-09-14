import React, { useState } from 'react';
import { ShoppingBag, Check, Eye } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { getProductImage } from '../data/products';

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
  const { addToCart } = useCart();
  const weights = Object.keys(product.prices || {});
  const [selectedWeight, setSelectedWeight] = useState(weights[0] || '250g');
  const [isAdded, setIsAdded] = useState(false);

  const unitPrice = isWholesale
    ? (product.wholesale || Object.values(product.prices)[0] || 0)
    : (product.prices[selectedWeight] || Object.values(product.prices)[0] || 0);

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product.id, selectedWeight);
    } else {
      addToCart({
        id: `${product.id}-${selectedWeight}`,
        productId: product.id,
        name: product.name,
        slug: product.id,
        image: product.image || getProductImage(product),
        selectedWeight,
        unitPrice,
        price: unitPrice,
        quantity: 1,
        wholesale: isWholesale,
      });
    }
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1600);
  };

  return (
    <article
      onClick={() => onQuickView && onQuickView(product)}
      className="group/card bg-[var(--color-surface,#FFFCF7)] dark:bg-[var(--color-surface,#1A201E)] border border-[var(--color-border)] dark:border-[var(--color-border)] hover:border-[var(--color-accent,#C7982F)] dark:hover:border-[var(--color-accent,#D4A843)] rounded-3xl p-5 flex flex-col justify-between h-full transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 cursor-pointer select-none text-left relative focus-ring"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onQuickView && onQuickView(product);
        }
      }}
      aria-label={`View details for ${product.name}`}
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
      <div className="w-full aspect-[4/3] rounded-2xl bg-[var(--color-surface-subtle,#FAF9F5)] dark:bg-[var(--color-surface-elevated,#222A28)] border border-[var(--color-border)] dark:border-[var(--color-border)] overflow-hidden flex items-center justify-center p-3 relative group shadow-2xs">
        <img
          src={product.image || `/images/${product.imageName}`}
          alt={product.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/product-placeholder.svg';
          }}
          className="w-full h-full object-contain group-hover/card:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[#042821]/20 backdrop-blur-[2px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
          <span className="px-3.5 py-1.5 rounded-full text-[9px] font-sans font-bold uppercase tracking-widest bg-[var(--color-primary,#042821)] text-[var(--color-text-on-emerald,#FFFCF7)] border border-[var(--color-accent,#C7982F)]/50 shadow-md flex items-center gap-1.5">
            <Eye size={11} className="text-[var(--color-accent,#C7982F)]" />
            <span>Quick Look</span>
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="pt-4 pb-2 space-y-1.5 flex-1 text-left">
        <h3 className="text-lg font-serif font-bold text-[var(--color-text-primary,#29231D)] leading-snug line-clamp-1">
          {product.name}
        </h3>
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
                  ? 'bg-[var(--color-primary,#042821)] text-[var(--color-accent,#C7982F)] border-[var(--color-primary,#042821)] dark:bg-[var(--color-primary,#0E4A3B)] dark:text-[var(--color-accent,#D4A843)] dark:border-[var(--color-primary,#0E4A3B)] shadow-xs'
                  : 'bg-[var(--color-base,#F6F1EA)] text-[var(--color-text-primary,#29231D)] border-[var(--color-border)] hover:border-[var(--color-accent,#C7982F)] dark:bg-[var(--color-surface-elevated,#222A28)] dark:text-[var(--color-text-primary,#F6F1EA)] dark:border-[var(--color-border)] dark:hover:border-[var(--color-accent,#D4A843)]'
              }`}
              aria-pressed={selectedWeight === w}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex flex-col text-left">
            <span className="text-[8.5px] uppercase tracking-widest text-[var(--color-text-secondary,#635B52)] font-sans font-medium">
              Investment
            </span>
            <span className="text-base sm:text-lg font-serif font-bold text-[var(--color-text-price,#29231D)]">
              Rs. {unitPrice?.toLocaleString()}
            </span>
          </div>

          {/* Primary Action Button: Deep Emerald with Champagne Gold details (Min 44px touch height) */}
          <button
            type="button"
            onClick={handleBuy}
            className={`min-w-[120px] min-h-[44px] px-4 py-2.5 rounded-full text-[10.5px] font-sans font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 focus-ring ${
              isAdded
                ? 'bg-emerald-800 text-[var(--color-text-on-emerald,#FFFCF7)] border border-emerald-700'
                : 'bg-[var(--color-primary,#042821)] hover:bg-[#03201A] dark:bg-[var(--color-primary,#0E4A3B)] dark:hover:bg-[#165B4A] text-[var(--color-text-on-emerald,#FFFCF7)] border border-[var(--color-accent,#C7982F)]/40 hover:border-[var(--color-accent,#C7982F)]'
            }`}
            aria-label={isAdded ? 'Added to order' : `Add ${product.name} to box`}
          >
            {isAdded ? (
              <>
                <Check size={13} className="text-emerald-300" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag size={13} className="text-[var(--color-accent,#C7982F)] dark:text-[var(--color-accent,#D4A843)]" />
                <span>Add to Box</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

