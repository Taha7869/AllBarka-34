import React, { useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingBag, ShieldCheck, Check } from 'lucide-react';
import type { Product } from '../types';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { getLocalized } from '../utils/localize';
import { acquireScrollLock } from '../utils/scrollLock';
import { getComparableProducts, VARIETY_CRITERIA } from '../lib/varietyComparison';

interface VarietyComparisonModalProps {
  product: Product;
  onClose: () => void;
}

export default function VarietyComparisonModal({ product, onClose }: VarietyComparisonModalProps) {
  const allProducts = useCatalogProducts();
  const { t, language, isRtl } = useLanguage();
  const { addToCart } = useCart();
  const mediaCover = useProductMediaCover();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [addedId, setAddedId] = React.useState<string>('');

  const comparableProducts = useMemo(
    () => getComparableProducts(product, allProducts),
    [product, allProducts]
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    try {
      if (!dialog.open) dialog.showModal();
    } catch {
      // ignore
    }
    const release = acquireScrollLock();
    return () => {
      try {
        if (dialog.open) dialog.close();
      } catch {
        // ignore
      }
      release();
    };
  }, []);

  const handleAdd = (p: Product) => {
    const portions = Object.entries(p.prices || {}).sort((a, b) => a[1] - b[1]);
    const [weight] = portions[0] || ['250g'];
    addToCart(p, weight, 1, undefined, { silent: true, openCart: false });
    setAddedId(p.id);
    setTimeout(() => setAddedId(''), 2500);
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="variety-comparison-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs w-full h-full border-none m-0 max-w-none max-h-none"
      aria-labelledby={titleId}
      dir={isRtl ? 'rtl' : 'ltr'}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl bg-[#FAF9F5] dark:bg-zinc-900 border border-[#D4AF37]/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#D4AF37]/20 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md">
          <div>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#043327] dark:text-emerald-400">
              {t('variety.eyebrow', 'Cultivar & Flavor Comparison')}
            </span>
            <h2 id={titleId} className="text-xl font-serif font-bold text-[#120F17] dark:text-[#FAF9F5]">
              {t('variety.title', 'Compare Harvest Varieties')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close', 'Close')}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors focus-ring"
          >
            <X size={20} />
          </button>
        </header>

        {/* Comparison Table Scroll Area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6">
          <table className="w-full text-left border-collapse min-w-[580px]">
            <thead>
              <tr className="border-b border-[#D4AF37]/20">
                <th className="p-3 w-40 text-xs font-semibold text-neutral-500 uppercase tracking-wider bg-[#FAF9F5] dark:bg-zinc-900 sticky left-0 z-10">
                  {t('variety.attribute', 'Attribute')}
                </th>
                {comparableProducts.map((p) => {
                  const isCurrent = p.id === product.id;
                  return (
                    <th key={p.id} className={`p-3 min-w-[150px] text-center ${isCurrent ? 'bg-[#043327]/5 dark:bg-emerald-950/20 rounded-t-xl' : ''}`}>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 border border-[#D4AF37]/30 shadow-xs">
                          <img
                            src={mediaCover(p)}
                            alt={getLocalized(p, 'name', language)}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/product-placeholder.svg';
                            }}
                          />
                        </div>
                        <div className="text-center">
                          {isCurrent && (
                            <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-[#043327] dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full mb-1">
                              {t('variety.viewing', 'Current')}
                            </span>
                          )}
                          <h4 className="text-xs font-serif font-bold text-[#120F17] dark:text-[#FAF9F5] line-clamp-1">
                            {getLocalized(p, 'name', language)}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdd(p)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#043327] hover:bg-[#064e3b] text-[#FAF9F5] transition-colors shadow-xs"
                        >
                          {addedId === p.id ? <Check size={12} /> : <ShoppingBag size={12} />}
                          <span>{addedId === p.id ? t('added', 'Added') : t('addToBag', 'Add to Bag')}</span>
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 dark:divide-zinc-800">
              {VARIETY_CRITERIA.map((criterion) => (
                <tr key={criterion.key} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <td className="p-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-[#FAF9F5] dark:bg-zinc-900 sticky left-0 z-10">
                    {language === 'ur' ? criterion.label_ur : language === 'ar' ? criterion.label_ar : criterion.label_en}
                  </td>
                  {comparableProducts.map((p) => {
                    const value = criterion.render(p);
                    const isCurrent = p.id === product.id;
                    return (
                      <td
                        key={p.id}
                        className={`p-3 text-xs text-center leading-relaxed text-neutral-800 dark:text-neutral-200 ${
                          isCurrent ? 'bg-[#043327]/5 dark:bg-emerald-950/20 font-medium' : ''
                        }`}
                      >
                        {Array.isArray(value) ? (
                          <div className="flex flex-wrap justify-center gap-1">
                            {value.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40"
                              >
                                <ShieldCheck size={10} /> {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span>{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between px-6 py-3 border-t border-[#D4AF37]/20 bg-neutral-50 dark:bg-zinc-800/80 text-[11px] text-neutral-500">
          <span>{t('variety.footerNote', 'All harvests hand-inspected in Lahore. Natural variance may occur by season.')}</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-[#043327] dark:text-emerald-400 hover:underline"
          >
            {t('close', 'Close')}
          </button>
        </footer>
      </div>
    </dialog>,
    document.body
  );
}
