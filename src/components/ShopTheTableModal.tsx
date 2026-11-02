import React, { useState, useId, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ShoppingBag, Check, Eye, Tag } from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { getLocalized } from '../utils/localize';
import { acquireScrollLock } from '../utils/scrollLock';
import type { Product } from '../types';

export function openShopTheTableModal(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-shop-the-table'));
  }
}

interface HotspotItem {
  productId: string;
  xPercent: number;
  yPercent: number;
  label: string;
}

const TABLE_HOTSPOTS: HotspotItem[] = [
  { productId: 'pista', xPercent: 28, yPercent: 42, label: 'Roasted Pistachios' },
  { productId: 'kaju', xPercent: 72, yPercent: 38, label: 'Roasted Cashews' },
  { productId: 'safawi', xPercent: 48, yPercent: 65, label: 'Safawi Dates' },
  { productId: 'afghan-figs', xPercent: 46, yPercent: 25, label: 'Sun-dried Figs' },
];

export default function ShopTheTableModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const allProducts = useCatalogProducts();
  const { t, language, isRtl } = useLanguage();
  const { addToCart } = useCart();
  const mediaCover = useProductMediaCover();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [selectedProductId, setSelectedProductId] = useState<string>('pista');
  const [addedId, setAddedId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  const activeProduct = allProducts.find(p => p.id === selectedProductId) || allProducts.find(p => p.id === 'pista') || allProducts[0];

  const handleAdd = (p: Product) => {
    const portions = Object.entries(p.prices || {}).sort((a, b) => a[1] - b[1]);
    const [weight] = portions[0] || ['250g'];
    addToCart(p, weight, 1, undefined, { silent: true, openCart: false });
    setAddedId(p.id);
    setTimeout(() => setAddedId(''), 2500);
  };

  if (!isOpen) return null;

  const portions = activeProduct ? Object.entries(activeProduct.prices || {}).sort((a, b) => a[1] - b[1]) : [];
  const primaryWeight = portions[0]?.[0] || '250g';
  const primaryPrice = portions[0]?.[1] || 0;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="shop-the-table-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs w-full h-full border-none m-0 max-w-none max-h-none"
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
              {t('table.eyebrow', 'The AllBarka Dastarkhwan')}
            </span>
            <h2 id={titleId} className="text-xl font-serif font-bold text-[#120F17] dark:text-[#FAF9F5]">
              {t('table.shopTheTable', 'Shop the Table Scene')}
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

        {/* Interactive Scene Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Visual Scene with Hotspots */}
          <div className="md:col-span-7 relative rounded-2xl overflow-hidden bg-neutral-900 aspect-4/3 border border-[#D4AF37]/30 shadow-md">
            <img
              src="/images/dryfruit_flatlay_hero.webp"
              alt="AllBarka luxury dastarkhwan dry fruits spread"
              className="w-full h-full object-cover opacity-90"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/product-placeholder.svg';
              }}
            />

            {/* Hotspot Pins */}
            {TABLE_HOTSPOTS.map((hotspot) => {
              const isSelected = selectedProductId === hotspot.productId;
              return (
                <button
                  key={hotspot.productId}
                  type="button"
                  data-hotspot={hotspot.productId}
                  onClick={() => setSelectedProductId(hotspot.productId)}
                  style={{ top: `${hotspot.yPercent}%`, left: `${hotspot.xPercent}%` }}
                  aria-label={`View ${hotspot.label}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-transform focus-ring ${
                    isSelected
                      ? 'bg-[#043327] text-[#D4AF37] ring-4 ring-[#D4AF37] scale-125 z-20'
                      : 'bg-white/90 text-[#043327] hover:scale-110 shadow-lg z-10'
                  }`}
                >
                  <Sparkles size={14} />
                </button>
              );
            })}
          </div>

          {/* Selected Item Detail Panel */}
          <div className="md:col-span-5 flex flex-col justify-between p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-[#D4AF37]/20 shadow-xs h-full min-h-[300px]">
            {activeProduct ? (
              <>
                <div>
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 mb-3 max-h-48">
                    <img
                      src={mediaCover(activeProduct)}
                      alt={getLocalized(activeProduct, 'name', language)}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/product-placeholder.svg';
                      }}
                    />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#043327] dark:text-emerald-400 block mb-1">
                    {getLocalized(activeProduct, 'origin', language) || 'Orchard Reserve'}
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#120F17] dark:text-[#FAF9F5]">
                    {getLocalized(activeProduct, 'name', language)}
                  </h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                    {getLocalized(activeProduct, 'desc', language)}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#D4AF37]/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                      Starting price ({primaryWeight})
                    </span>
                    <span className="text-base font-bold text-[#043327] dark:text-emerald-400">
                      Rs. {primaryPrice.toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(activeProduct)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring shadow-xs ${
                      addedId === activeProduct.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#043327] hover:bg-[#074b39] text-[#FAF9F5]'
                    }`}
                  >
                    {addedId === activeProduct.id ? <Check size={14} /> : <ShoppingBag size={14} />}
                    <span>{addedId === activeProduct.id ? t('added', 'Added!') : t('addToCart', 'Add to Bag')}</span>
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-neutral-400">Select a hotspot on the table to view harvest details.</p>
            )}
          </div>
        </div>

        {/* Accessible Caption / Item List */}
        <footer className="px-6 py-3 border-t border-[#D4AF37]/20 bg-neutral-50 dark:bg-zinc-800/50 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            {t('table.itemsOnTable', 'Featured on this Table')}:
          </span>
          {TABLE_HOTSPOTS.map((hotspot) => {
            const isSelected = selectedProductId === hotspot.productId;
            return (
              <button
                key={hotspot.productId}
                type="button"
                data-table-item={hotspot.productId}
                onClick={() => setSelectedProductId(hotspot.productId)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-[#043327] text-white'
                    : 'bg-white dark:bg-zinc-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                }`}
              >
                {hotspot.label}
              </button>
            );
          })}
        </footer>
      </div>
    </dialog>,
    document.body
  );
}
