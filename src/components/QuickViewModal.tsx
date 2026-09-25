import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, ShoppingCart, Heart, Scale, Minus, Plus, Check } from 'lucide-react';
import { Product } from '../types';
import ProductDetailAccordion from './ProductDetailAccordion';
import { getProductImage } from '../data/products';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { acquireScrollLock } from '../utils/scrollLock';
import { useLanguage } from '../contexts/LanguageContext';
import { getLocalized } from '../utils/localize';

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  isWholesale: boolean;
  onAddToCart?: (productId: string, weight: string) => void;
}

export default function QuickViewModal({
  isOpen,
  onClose,
  product,
  isWholesale,
  onAddToCart,
}: QuickViewModalProps) {
  const { resolvedTheme } = useTheme();
  const { addToCart } = useCart();
  const { t, language } = useLanguage();
  const [selectedWeight, setSelectedWeight] = useState('500g');
  const [wholesaleQty, setWholesaleQty] = useState(3);
  const [packagingType, setPackagingType] = useState<'pouch' | 'tin'>('pouch');
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  React.useEffect(() => {
    if (product) {
      setImageError(false);
      setSelectedWeight(Object.keys(product.prices)[0] || '500g');
      setPackagingType('pouch');
    }
  }, [product]);

  React.useEffect(() => {
    if (isOpen) {
      const releaseLock = acquireScrollLock();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        releaseLock();
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const weights = Object.keys(product.prices);

  const basePrice = isWholesale ? (product.wholesale * wholesaleQty) : (product.prices[selectedWeight] || 0);
  const packagingFee = packagingType === 'tin' && !isWholesale ? 150 : 0;
  const unitPrice = basePrice + packagingFee;
  const isPremiumBundle = product.id === 'deal-1' || product.id === 'deal-2' || product.id === 'deal-3';

  const handleAddToCart = () => {
    const finalWeight = isWholesale 
      ? `${wholesaleQty}kg` 
      : `${selectedWeight}${packagingType === 'tin' ? ' • Vacuum Tin' : ''}`;
    
    if (onAddToCart) {
      onAddToCart(product.id, finalWeight);
    } else {
      addToCart({
        id: `${product.id}-${finalWeight}`,
        productId: product.id,
        name_en: product.name_en,
        name_ur: product.name_ur,
        name_ar: product.name_ar,
        slug: product.id,
        image: getProductImage(product),
        selectedWeight: finalWeight,
        unitPrice,
        price: unitPrice,
        quantity: 1,
        wholesale: isWholesale,
      });
    }
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 select-none">
      {/* Overlay Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Center Box - Semantic Theme matching Product Cards */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="relative bg-[var(--color-surface)] rounded-[28px] sm:rounded-[36px] w-full max-w-4xl overflow-hidden shadow-2xl border border-[var(--color-border)] z-10 flex flex-col md:flex-row max-h-[92vh] md:max-h-[88vh] text-[var(--color-ink)]"
        id="quickview-modal-container"
      >
        {/* Close Button top-right */}
        <button
          onClick={onClose}
          id="quickview-close-btn"
          aria-label="Close product view"
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-[var(--color-surface)]/95 hover:bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Left Side: Product Visual Showcase */}
        <div className="relative w-full md:w-5/12 aspect-square md:aspect-auto md:h-full min-h-[260px] md:min-h-[480px] overflow-hidden bg-[var(--color-base)] shrink-0 border-b md:border-b-0 md:border-r border-[var(--color-border)]">
          {imageError ? (
            <div className="w-full h-full absolute inset-0 bg-gradient-to-br from-[var(--color-base)] to-[var(--color-surface)] flex flex-col items-center justify-center p-6 text-center select-none text-[var(--color-ink)]">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/40 flex items-center justify-center text-[var(--color-gold)] mb-3 shadow-md">
                <Sparkles size={24} className="fill-[var(--color-gold)]" />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-[var(--color-gold)]">AllBarka Master Selection</span>
              <span className="text-base font-serif font-bold text-[var(--color-ink)] mt-1 max-w-[85%] leading-snug">{getLocalized(product, 'name', language)}</span>
            </div>
          ) : (
            <img
              src={getProductImage(product)}
              alt={t(`imageAlt.${product.id}`, getLocalized(product, 'name', language))}
              width={960}
              height={960}
              referrerPolicy="no-referrer"
              decoding="async"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 hover:scale-105"
            />
          )}

          {/* Subtle Soft Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Reference image caption for hampers */}
          {(product?.category === 'hampers' || product?.category === 'deals' || product?.id?.includes('hamper')) && (
            <div className="absolute bottom-4 right-4 z-20 pointer-events-none text-right flex justify-end">
              <p className="text-[8.5px] italic text-white/90 bg-black/40 backdrop-blur-md px-2 py-1 rounded shadow-sm inline-block">
                Reference image — actual packaging may vary slightly.
              </p>
            </div>
          )}

          {/* Premium Bundle Tag */}
          {isPremiumBundle && (
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-[var(--color-emerald)] text-[var(--color-gold)] text-[9px] font-black uppercase px-3 py-1.5 rounded-full tracking-wider shadow-md border border-[var(--color-gold)]/40">
              <Sparkles size={10} className="fill-[var(--color-gold)] text-[var(--color-gold)]" />
              CONCIERGE SELECTION
            </div>
          )}

          {/* Fresh Stock Badge */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-[var(--color-surface)]/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--color-border)] shadow-sm text-[var(--color-ink)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] animate-pulse" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider">{t('trust.fresh', 'Lahore Fresh Stock')}</span>
          </div>
        </div>

        {/* Right Side: Product Details & Interactive Accordion */}
        <div className="w-full md:w-7/12 p-5 sm:p-7 md:p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar text-[var(--color-ink)] bg-[var(--color-surface)]">
          <div className="space-y-5 text-left">
            {/* Top Meta info */}
            <div className="space-y-1">
              <span className="text-[var(--color-gold)] font-bold uppercase tracking-[0.2em] text-[9.5px] block">
                {getLocalized(product, 'health', language)}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-ink)] leading-tight">
                {getLocalized(product, 'name', language)}
              </h2>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-[13.5px] text-[var(--color-ink-muted)] leading-relaxed font-normal">
              {getLocalized(product, 'desc', language)}
            </p>

            {getLocalized(product, 'tasteProfile', language) && (
              <div className="p-2.5 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#C7982F)]/25 text-[11px] text-[var(--color-ink,#29231D)]">
                <span className="font-bold text-[var(--color-gold,#C7982F)] uppercase tracking-wider text-[9px] block mb-0.5">
                  {t('tasteProfile', 'Taste Profile')}
                </span>
                <span>{getLocalized(product, 'tasteProfile', language)}</span>
              </div>
            )}

            {getLocalized(product, 'contents', language) && (
              <div className="p-2.5 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#C7982F)]/25 text-[11px] text-[var(--color-ink,#29231D)]">
                <span className="font-bold text-[var(--color-gold,#C7982F)] uppercase tracking-wider text-[9px] block mb-0.5">
                  {t('packContents', 'Pack Contents')}
                </span>
                <span>{getLocalized(product, 'contents', language)}</span>
              </div>
            )}

            {/* Weights Selector */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-widest flex items-center gap-1.5">
                  <Scale size={12} className="text-[var(--color-gold)]" /> {isWholesale ? t('wholesaleQty', 'Wholesale Quantity') : t('selectWeight', 'Select Pack Size')}
                </label>
                {isWholesale && (
                  <span className="text-[9px] bg-[var(--color-emerald)] text-[var(--color-gold)] px-2 py-0.5 rounded-full uppercase font-black tracking-wider border border-[var(--color-gold)]/30">
                    Min 3kg - Max 10kg
                  </span>
                )}
              </div>

              {isWholesale ? (
                <div className="flex items-center justify-between bg-[var(--color-base)] border border-[var(--color-border)] rounded-2xl p-1.5 h-11 w-full max-w-[180px] shadow-sm select-none">
                  <button
                    type="button"
                    onClick={() => setWholesaleQty(q => Math.max(3, q - 1))}
                    className="w-7 h-7 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink)] hover:bg-[var(--color-gold)] hover:text-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                    disabled={wholesaleQty <= 3}
                  >
                    <Minus size={11} />
                  </button>
                  <span className="font-mono text-xs font-bold text-[var(--color-ink)]">
                    {wholesaleQty} kg
                  </span>
                  <button
                    type="button"
                    onClick={() => setWholesaleQty(q => Math.min(10, q + 1))}
                    className="w-7 h-7 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink)] hover:bg-[var(--color-gold)] hover:text-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                    disabled={wholesaleQty >= 10}
                  >
                    <Plus size={11} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {weights.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSelectedWeight(w)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                        selectedWeight === w
                          ? 'bg-[var(--color-gold)] text-white border-[var(--color-gold)] shadow-sm font-black'
                          : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-gold)] hover:bg-[var(--color-base)]'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Airtight Packaging Style Selector */}
            {!isWholesale && (
              <div className="pt-2 text-left space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-ink-muted)]">
                    Packaging Style
                  </span>
                  <span className="text-[10px] font-semibold text-[#806326] dark:text-[#E4C783]">
                    {packagingType === 'tin' ? 'Airtight Keepsake Tin (+Rs. 150)' : 'Foil Zipper Pouch (Included)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPackagingType('pouch')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      packagingType === 'pouch'
                        ? 'border-[#C7982F] bg-[#C7982F]/10 text-[#806326] dark:text-[#E4C783] ring-1 ring-[#C7982F]/40'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[#C7982F]/40'
                    }`}
                  >
                    <span>Zipper Foil Pouch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPackagingType('tin')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      packagingType === 'tin'
                        ? 'border-[#C7982F] bg-[#C7982F]/10 text-[#806326] dark:text-[#E4C783] ring-1 ring-[#C7982F]/40'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[#C7982F]/40'
                    }`}
                  >
                    <span>Vacuum Luxury Tin (+150)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Collapsible Accordion Section */}
            <div className="pt-2">
              <ProductDetailAccordion product={product} theme={resolvedTheme} defaultOpenKey="storage" />
            </div>
          </div>

          {/* Pricing & Add to cart footer */}
          <div className="mt-6 pt-5 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center gap-4 text-left">
            <div className="w-full sm:w-auto shrink-0">
              <span className="text-[9.5px] uppercase font-bold text-[var(--color-text-secondary,#635B52)] tracking-widest block">{t('price', 'Price')}</span>
              <span className="text-2xl sm:text-2.5xl font-serif font-bold text-[var(--color-text-price,#29231D)]">
                Rs. {unitPrice?.toLocaleString()}
              </span>
            </div>

            <div className="flex w-full sm:flex-1 gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                id="quickview-add-to-cart-btn"
                className="flex-1 font-bold uppercase tracking-widest py-3.5 px-6 rounded-2xl bg-[var(--color-primary,#042821)] hover:bg-[#03201A] text-[var(--color-text-on-emerald,#FFFCF7)] shadow-md border border-[var(--color-accent,#C7982F)]/60 active:scale-95 transform transition-all duration-200 cursor-pointer text-xs flex items-center justify-center gap-2"
              >
                {addedToast ? (
                  <>
                    <Check size={16} className="text-white shrink-0" />
                    <span>{t('addedToCart', 'Added to Cart')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} className="text-white shrink-0" />
                    <span>{t('addToCart', 'Add to Cart')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.href = `/product/${product.id}`;
                }}
                className="flex-1 font-bold uppercase tracking-widest py-3.5 px-6 rounded-2xl bg-[var(--color-surface)] hover:bg-[var(--color-base)] text-[var(--color-ink)] shadow-sm border border-[var(--color-border)] hover:border-[var(--color-gold)] active:scale-95 transform transition-all duration-200 cursor-pointer text-xs flex items-center justify-center text-center leading-tight whitespace-nowrap"
              >
                {t('viewFullDetails', 'View Full Details')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
