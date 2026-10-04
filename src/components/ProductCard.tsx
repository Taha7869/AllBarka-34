import ProductImageGallery from './ProductImageGallery';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, ShoppingBag, Heart } from 'lucide-react';
import { useSavedProducts } from '../hooks/useSavedProducts';
import { motion, useReducedMotion } from 'motion/react';
import { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { getLocalized } from '../utils/localize';
import MagneticButton from './motion/MagneticButton';

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
  const { t, language } = useLanguage();
  const { addToCart } = useCart();
  const { savedIds, setSaved } = useSavedProducts();
  const saved = savedIds.includes(product.id);
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const weights = Object.keys(product.prices || {});
  const [selectedWeight, setSelectedWeight] = useState(weights[0] || '250g');
  const titleTypography = language === 'ur' ? 'font-urdu text-[20px]' : language === 'ar' ? 'font-arabic text-[23px]' : 'font-serif text-[21px] leading-[1.25]';

  const unitPrice = isWholesale
    ? (product.wholesale || Object.values(product.prices)[0] || 0)
    : (product.prices[selectedWeight] || Object.values(product.prices)[0] || 0);

  // ── Hover lift variants ─────────────────────────────────────────────────────
  const cardVariants = {
    rest: {
      y: 0,
      boxShadow: 'var(--shadow-card, 0 4px 20px -4px rgba(41,35,29,0.06))',
    },
    hover: shouldReduceMotion
      ? {}
      : {
          y: -3,
          boxShadow: 'var(--shadow-card-hover, 0 16px 36px -8px rgba(41,35,29,0.12))',
        },
  };

  return (
    <motion.div
      dir="ltr"
      className="boutique-product-card group/card relative flex h-full cursor-pointer flex-col bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-accent)] rounded-3xl p-5 transition-colors duration-300 motion-reduce:transition-none"
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('a, button, input, select, textarea, [role="button"]')) {
          navigate(`/product/${product.id}`);
        }
      }}
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      transition={{ type: 'spring', stiffness: 340, damping: 28, mass: 0.6 }}

    >
      {/* Top Meta Line */}
      <div className="mb-1 flex min-h-11 items-center gap-2">
        <span dir="auto" className="min-w-0 flex-1 truncate text-[9px] font-sans font-medium uppercase tracking-[0.12em] text-[var(--color-accent-text)]">
          {language === 'en' ? (getLocalized(product, 'health', language) || 'Single-Origin') : t('slider.quality')}
        </span>
        {getLocalized(product, 'tag', language) && (
          <span dir="auto" className="max-w-[42%] truncate rounded-full border border-[var(--color-border-accent)] bg-[var(--color-base)] px-2.5 py-1 text-[8px] font-sans font-medium uppercase tracking-[0.08em] text-[var(--color-accent-text)]">
            {getLocalized(product, 'tag', language) === 'Bestseller' && language !== 'en' ? t('slider.bestseller') : getLocalized(product, 'tag', language)}
          </span>
        )}
        <button type="button" onClick={() => setSaved(product.id, !saved)} aria-pressed={saved} aria-label={`${saved ? t('shop.unsave') : t('shop.save')}: ${getLocalized(product, 'name', language)}`} className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-accent-text)] transition-colors hover:bg-[var(--color-accent)]/10"><Heart size={17} strokeWidth={1.6} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>

      {/* Image Plate — zoom on card hover */}
      <ProductImageGallery product={product} />

      {/* Product Details */}
      <div dir={language === 'en' ? 'ltr' : 'rtl'} className="min-w-0 flex-1 space-y-2 pb-5 pt-1 text-start">
        <Link to={`/product/${product.id}`} className="block max-w-full focus-ring rounded-sm w-fit">
          <h3 lang={language} className={`whitespace-normal break-words [overflow-wrap:anywhere] font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent-text)] ${titleTypography}`}>
            {getLocalized(product, 'name', language)}
          </h3>
        </Link>
        <p className="line-clamp-2 text-xs leading-6 text-[var(--color-text-secondary)]">
          {language !== 'en' && getLocalized(product, 'desc', language) === product.desc_en ? t('slider.cardCopy') : getLocalized(product, 'desc', language)}
        </p>
      </div>

      {/* Weights & Action Area */}
      <div className="mt-auto space-y-4 border-t border-[var(--color-border)] pt-4">
        {/* Weight Selector */}
        {!product.quoteOnly && <div className="flex w-full flex-wrap gap-1.5" role="group" aria-label={t('shop.portion')}>
          {weights.map((w) => (
            <button
              key={w}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedWeight(w);
              }}
              className={`focus-ring flex min-h-[44px] min-w-[54px] flex-1 cursor-pointer items-center justify-center rounded-lg border px-2 py-1.5 text-[10px] font-sans font-medium uppercase tracking-[0.05em] transition-colors duration-200 ${
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

        {/* Pricing & Add to Cart */}
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col text-start">
              <span dir="auto" className="text-[9px] font-sans font-medium uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                {t('price', 'Price')}
              </span>
              <span className="font-serif text-2xl font-medium leading-tight tracking-tight text-[var(--color-text-price)]">
                {product.quoteOnly ? <span className="text-base">{t('catalog.requestQuote')}</span> : <bdi dir="ltr">Rs. {unitPrice?.toLocaleString()}</bdi>}
              </span>
            </div>
            {onQuickView && <button type="button" onClick={(e) => { e.stopPropagation(); onQuickView(product); }} className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-base)] hover:text-[var(--color-accent-text)]" aria-label={`${t('quickView')}: ${getLocalized(product, 'name', language)}`}><Eye size={15} strokeWidth={1.7} /><span dir="auto">{t('quickView')}</span></button>}
          </div>

          <div className="w-full">
            {/* Magnetic Add-to-Cart */}
            {product.quoteOnly ? <Link to="/pages/contact" className="focus-ring flex min-h-[46px] items-center justify-center rounded-xl border border-[#c7982f]/35 bg-[#1e3a2b] px-3 text-xs font-semibold text-[#fff8e9]">{t('catalog.requestQuote')}</Link> : <MagneticButton
              strength={3}
              onClick={(e) => {
                e.stopPropagation();
                if (onAddToCart) {
                  onAddToCart(product.id, selectedWeight);
                } else {
                  addToCart(product, selectedWeight, 1);
                }
              }}
              className="focus-ring flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#C7982F]/35 bg-[#1E3A2B] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#FFFCF7] transition-colors duration-200 hover:border-[#C7982F]/70 hover:bg-[#14281E] motion-safe:active:scale-[0.99]"
            >
              <ShoppingBag size={14} strokeWidth={1.7} className="text-[#E4C783]" />
              <span dir="auto">{t('addToCart', 'Add to Cart')}</span>
            </MagneticButton>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
