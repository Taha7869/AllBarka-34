import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import type { CartItem, Product } from '../types';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { formatPrice } from '../contexts/CartContext';
import { getLocalized } from '../utils/localize';
import CartAddButton from './CartAddButton';
import { getCompleteTheBoxSuggestions, type PairingReasonKey } from '../lib/completeTheBox';

const COMPLETE_BOX_COPY: Record<
  LanguageCode,
  {
    title: string;
    eyebrow: string;
    addLabel: string;
    reasons: Record<PairingReasonKey, string>;
  }
> = {
  en: {
    title: 'Complete the Box',
    eyebrow: 'Curated Pairing',
    addLabel: 'Add',
    reasons: {
      pairsWithDates: 'Pairs with your dates',
      pairsWithNuts: 'Pairs with your dry fruits',
      pairsWithGiftBox: 'Adds a refined finish to your gift',
      pairsWithPantry: 'Complements your pantry picks',
      pairsWithTea: 'Lovely with tea & preserves',
      completeBox: 'Fits neatly in your bag',
    },
  },
  ur: {
    title: 'باکس مکمل کریں',
    eyebrow: 'موزوں جوڑ',
    addLabel: 'شامل کریں',
    reasons: {
      pairsWithDates: 'آپ کی کھجوروں کے ساتھ بہترین جوڑ',
      pairsWithNuts: 'آپ کے خشک میوہ جات کے ساتھ موزوں',
      pairsWithGiftBox: 'آپ کے تحفے میں دلکش اضافہ',
      pairsWithPantry: 'آپ کے انتخاب کے ساتھ عمدہ امتزاج',
      pairsWithTea: 'قہوے اور مربع کے ساتھ لاجواب',
      completeBox: 'آپ کے بیگ کے ساتھ خوب جچے',
    },
  },
  ar: {
    title: 'أكمل الصندوق',
    eyebrow: 'تنسيق مختار',
    addLabel: 'إضافة',
    reasons: {
      pairsWithDates: 'يتناغم مع التمور المختارة',
      pairsWithNuts: 'يكمل تشكيلتك من المكسرات',
      pairsWithGiftBox: 'لمسة راقية تكمل هديتك',
      pairsWithPantry: 'إضافة مثالية لمختاراتك',
      pairsWithTea: 'مناسب مع الشاي والمربى',
      completeBox: 'إضافة متناسقة لحقيبتك',
    },
  },
};

function SuggestionThumb({ src, alt, fallbackLetter }: { src: string; alt: string; fallbackLetter: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F6F1EA] dark:bg-[#222A28] font-serif text-base font-bold text-[#C7982F]">
        {fallbackLetter}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={320}
      height={240}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105"
    />
  );
}

export interface CompleteTheBoxSuggestionsProps {
  cartItems: CartItem[];
  products: Product[];
  subtotal: number;
  onAdd: (productId: string, portionLabel: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
}

export default function CompleteTheBoxSuggestions({
  cartItems,
  products,
  subtotal,
  onAdd,
  onNavigate,
  compact = false,
}: CompleteTheBoxSuggestionsProps) {
  const { language, isRtl, t } = useLanguage();
  const mediaCover = useProductMediaCover();
  const copy = COMPLETE_BOX_COPY[language] || COMPLETE_BOX_COPY.en;

  const suggestions = useMemo(
    () => getCompleteTheBoxSuggestions(cartItems, products, { maxItems: 2, subtotal }),
    [cartItems, products, subtotal],
  );

  if (suggestions.length === 0) return null;

  return (
    <section
      aria-label={copy.title}
      data-testid="complete-the-box"
      dir={isRtl ? 'rtl' : 'ltr'}
      className={
        compact
          ? 'pt-3 border-t border-[#29231D]/10 dark:border-[#F6F1EA]/12 space-y-2.5'
          : 'mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 space-y-3'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-serif font-bold text-[#29231D] dark:text-[#F6F1EA] text-sm sm:text-base flex items-center gap-1.5">
          <Sparkles size={14} className="text-[#C7982F] shrink-0" aria-hidden="true" />
          <span>{copy.title}</span>
        </h3>
        <span className="text-[10px] font-semibold text-[#806326] dark:text-[#E4C783] uppercase tracking-wider">
          {copy.eyebrow}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {suggestions.map(({ product, portionLabel, price, reasonKey }) => {
          const name = getLocalized(product, 'name', language);
          const reason = copy.reasons[reasonKey] || copy.reasons.completeBox;

          return (
            <div
              key={product.id}
              data-suggestion-id={product.id}
              className="group flex flex-col justify-between gap-2 rounded-xl border border-[#29231D]/10 dark:border-[#F6F1EA]/12 bg-[#FFFCF7] dark:bg-[#1A201E] p-2.5 transition-colors hover:border-[#C7982F]/60"
            >
              <div className="flex items-start gap-2.5">
                <Link
                  to={`/product/${product.id}`}
                  onClick={onNavigate}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#29231D]/8 dark:border-[#F6F1EA]/10 bg-[#F6F1EA] dark:bg-[#222A28]"
                >
                  <SuggestionThumb
                    src={mediaCover(product)}
                    alt={t(`imageAlt.${product.id}`, name)}
                    fallbackLetter={name.charAt(0).toUpperCase() || 'A'}
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-[#806326] dark:text-[#E4C783] leading-snug mb-0.5">
                    {reason}
                  </p>
                  <Link
                    to={`/product/${product.id}`}
                    onClick={onNavigate}
                    className="block font-serif text-xs sm:text-sm font-bold leading-snug text-[#29231D] dark:text-[#F6F1EA] hover:text-[#806326] dark:hover:text-[#E4C783] line-clamp-2"
                  >
                    {name}
                  </Link>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#635B52] dark:text-[#A8A199]">
                    {portionLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[#29231D]/8 dark:border-[#F6F1EA]/10 pt-2">
                <span className="font-serif text-xs sm:text-sm font-bold text-[#29231D] dark:text-[#F6F1EA]">
                  <bdi>{formatPrice(price)}</bdi>
                </span>
                <CartAddButton
                  productId={product.id}
                  portion={portionLabel}
                  onAdd={() => onAdd(product.id, portionLabel)}
                  className="min-h-11 inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--color-border-accent)] bg-[#042821] dark:bg-[#0E4A3B] px-3 text-xs font-semibold text-[#FFFCF7] hover:bg-[#092e23] transition-colors"
                >
                  {copy.addLabel}
                </CartAddButton>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
