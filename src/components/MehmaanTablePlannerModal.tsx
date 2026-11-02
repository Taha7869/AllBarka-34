import React, { useState, useId, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Sparkles, ShoppingBag, Check, Coffee, Utensils, Moon, PartyPopper } from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { getLocalized } from '../utils/localize';
import { acquireScrollLock } from '../utils/scrollLock';
import {
  type MehmaanSetting,
  MEHMAAN_SETTINGS,
  calculateMehmaanPlan,
} from '../lib/mehmaanPlanner';

interface MehmaanTablePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function openMehmaanPlannerModal(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-mehmaan-planner'));
  }
}

export default function MehmaanTablePlannerModal({ isOpen, onClose }: MehmaanTablePlannerModalProps) {
  const allProducts = useCatalogProducts();
  const { t, language, isRtl } = useLanguage();
  const { addToCart } = useCart();
  const mediaCover = useProductMediaCover();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [guests, setGuests] = useState<number>(10);
  const [setting, setSetting] = useState<MehmaanSetting>('dawat');
  const [addedAll, setAddedAll] = useState<boolean>(false);

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

  const plan = useMemo(
    () => calculateMehmaanPlan(allProducts, guests, setting),
    [allProducts, guests, setting]
  );

  const activeAssumptions = MEHMAAN_SETTINGS[setting];

  const handleAddAll = () => {
    for (const item of plan.items) {
      addToCart(
        item.product,
        item.recommendedPortionWeight,
        item.recommendedUnits,
        undefined,
        { silent: true, openCart: false }
      );
    }
    setAddedAll(true);
    setTimeout(() => setAddedAll(false), 3000);
  };

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="mehmaan-planner-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs w-full h-full border-none m-0 max-w-none max-h-none"
      aria-labelledby={titleId}
      dir={isRtl ? 'rtl' : 'ltr'}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl bg-[#FAF9F5] dark:bg-zinc-900 border border-[#D4AF37]/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#D4AF37]/20 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#043327]/10 dark:bg-emerald-950/40 text-[#043327] dark:text-emerald-400 flex items-center justify-center border border-[#D4AF37]/30">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#043327] dark:text-emerald-400">
                {t('mehmaan.eyebrow', 'Hosting & Dastarkhwan Serving Guide')}
              </span>
              <h2 id={titleId} className="text-xl font-serif font-bold text-[#120F17] dark:text-[#FAF9F5]">
                {t('mehmaan.title', 'Mehmaan Table Planner')}
              </h2>
            </div>
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Guest Count Selector */}
          <section className="bg-white dark:bg-zinc-800/80 p-4 rounded-2xl border border-[#D4AF37]/20 shadow-xs">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
              {t('mehmaan.guestCount', 'Number of Guests')}: <span className="text-[#043327] dark:text-emerald-400 font-bold text-base">{guests}</span>
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {[5, 10, 20, 35, 50].map((count) => (
                <button
                  type="button"
                  key={count}
                  onClick={() => setGuests(count)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors focus-ring ${
                    guests === count
                      ? 'bg-[#043327] text-[#FAF9F5] shadow-xs'
                      : 'bg-neutral-100 dark:bg-zinc-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  {count} {t('guests', 'guests')}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={2}
              max={100}
              step={1}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full accent-[#043327] dark:accent-emerald-500 cursor-pointer"
            />
          </section>

          {/* Table Setting & Occasion Selector */}
          <section>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
              {t('mehmaan.setting', 'Table Occasion & Setting')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'chai' as MehmaanSetting, icon: Coffee },
                { id: 'dawat' as MehmaanSetting, icon: Utensils },
                { id: 'iftar' as MehmaanSetting, icon: Moon },
                { id: 'majlis' as MehmaanSetting, icon: PartyPopper },
              ].map(({ id, icon: Icon }) => {
                const isSelected = setting === id;
                const opt = MEHMAAN_SETTINGS[id];
                const label = language === 'ur' ? opt.label_ur : language === 'ar' ? opt.label_ar : opt.label_en;
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setSetting(id)}
                    className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all focus-ring ${
                      isSelected
                        ? 'border-[#043327] dark:border-emerald-500 bg-[#043327]/5 dark:bg-emerald-950/30 text-[#043327] dark:text-emerald-300 font-bold shadow-xs'
                        : 'border-[#D4AF37]/20 bg-white dark:bg-zinc-800/80 text-neutral-600 dark:text-neutral-300 hover:border-[#D4AF37]/40'
                    }`}
                  >
                    <Icon size={20} className="mb-1.5 opacity-80" />
                    <span className="text-xs">{label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 italic px-1">
              {language === 'ur' ? activeAssumptions.description_ur : language === 'ar' ? activeAssumptions.description_ar : activeAssumptions.description_en}
            </p>
          </section>

          {/* Transparent Serving Calculations Breakdown */}
          <section className="bg-[#FAF9F5] dark:bg-zinc-800/40 border border-[#D4AF37]/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 border-b border-[#D4AF37]/20 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#043327] dark:text-emerald-400">
                {t('mehmaan.servingAssumptions', 'Artisan Serving Calculations')}
              </span>
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                {t('mehmaan.totalGrams', 'Total Net Weight')}: {plan.totalGrams}g
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-700">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('nav.dryFruits', 'Roasted Nuts')}</span>
                <span className="text-sm font-bold text-[#120F17] dark:text-[#FAF9F5]">{plan.breakdown.nutsGrams}g</span>
                <span className="text-[10px] text-neutral-500 block">({activeAssumptions.nutsGramsPerGuest}g / {t('guest', 'guest')})</span>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-700">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('nav.dates', 'Select Dates')}</span>
                <span className="text-sm font-bold text-[#120F17] dark:text-[#FAF9F5]">{plan.breakdown.datesGrams}g</span>
                <span className="text-[10px] text-neutral-500 block">({activeAssumptions.datesGramsPerGuest}g / {t('guest', 'guest')})</span>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-700">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('driedFruits', 'Dried Fruits')}</span>
                <span className="text-sm font-bold text-[#120F17] dark:text-[#FAF9F5]">{plan.breakdown.driedFruitsGrams}g</span>
                <span className="text-[10px] text-neutral-500 block">({activeAssumptions.driedFruitsGramsPerGuest}g / {t('guest', 'guest')})</span>
              </div>
            </div>
          </section>

          {/* Curated Recommendations List */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-3">
              {t('mehmaan.recommendedItems', 'Curated Harvest Selections')}
            </h3>
            <div className="space-y-2.5">
              {plan.items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-[#D4AF37]/20 shadow-xs gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                      <img
                        src={mediaCover(item.product)}
                        alt={getLocalized(item.product, 'name', language)}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/product-placeholder.svg';
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#120F17] dark:text-[#FAF9F5] line-clamp-1">
                        {getLocalized(item.product, 'name', language)}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {item.recommendedUnits} × {item.recommendedPortionWeight} ({item.targetGrams}g table need)
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#043327] dark:text-emerald-400 block">
                      Rs. {item.itemTotal.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Rs. {item.unitPrice.toLocaleString()} / {item.recommendedPortionWeight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer with Subtotal & Add All CTA */}
        <footer className="p-4 sm:p-6 border-t border-[#D4AF37]/20 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block">
              {t('mehmaan.estimatedTotal', 'Estimated Table Total')}
            </span>
            <span className="text-xl font-serif font-bold text-[#043327] dark:text-emerald-400">
              Rs. {plan.estimatedTotalPkr.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddAll}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all focus-ring shadow-md ${
              addedAll
                ? 'bg-emerald-600 text-white'
                : 'bg-[#043327] hover:bg-[#074b39] text-[#FAF9F5]'
            }`}
          >
            {addedAll ? <Check size={18} /> : <ShoppingBag size={18} />}
            <span>{addedAll ? t('mehmaan.addedToBag', 'Added to your boutique bag!') : t('mehmaan.addToBag', 'Add All Selections to Bag')}</span>
          </button>
        </footer>
      </div>
    </dialog>,
    document.body
  );
}
