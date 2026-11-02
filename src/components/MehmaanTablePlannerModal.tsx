import React, { useState, useId, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, ShoppingBag, Check, Coffee, Utensils, Moon, PartyPopper, AlertCircle } from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart, type AddToCartResult } from '../contexts/CartContext';
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
  const [customNuts, setCustomNuts] = useState<number | undefined>(undefined);
  const [customDates, setCustomDates] = useState<number | undefined>(undefined);
  const [customFruits, setCustomFruits] = useState<number | undefined>(undefined);
  const [addedAll, setAddedAll] = useState<boolean>(false);
  const [addNotice, setAddNotice] = useState<string>('');

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
    () =>
      calculateMehmaanPlan(allProducts, guests, setting, {
        nutsGramsPerGuest: customNuts,
        datesGramsPerGuest: customDates,
        driedFruitsGramsPerGuest: customFruits,
      }),
    [allProducts, guests, setting, customNuts, customDates, customFruits]
  );

  const activeAssumptions = MEHMAAN_SETTINGS[setting];

  const handleAddAll = () => {
    if (plan.items.length === 0) {
      setAddNotice(t('mehmaan.noItems', 'No eligible harvest items available in this category.'));
      setTimeout(() => setAddNotice(''), 4000);
      return;
    }

    const results: { item: typeof plan.items[0]; res?: AddToCartResult }[] = [];
    for (const item of plan.items) {
      if (item.product && item.recommendedPortionWeight && item.unitPrice > 0) {
        const res = addToCart(
          item.product,
          item.recommendedPortionWeight,
          item.recommendedUnits,
          undefined,
          { silent: true, openCart: false }
        );
        results.push({ item, res: res as AddToCartResult | undefined });
      } else {
        results.push({ item, res: undefined });
      }
    }

    const acceptedList = results.filter(r => r.res && r.res.accepted);
    const cappedList = results.filter(r => r.res && r.res.capped);
    const rejectedList = results.filter(r => !r.res || !r.res.accepted);

    if (acceptedList.length === 0) {
      setAddedAll(false);
      const isCapBlocked = cappedList.length > 0;
      setAddNotice(
        isCapBlocked
          ? t('mehmaan.capBlocked', 'Cart limit (50 units per item) reached. Cannot add planner selections.')
          : t('mehmaan.noneAdded', 'None of the requested selections could be added to bag.')
      );
      setTimeout(() => setAddNotice(''), 4000);
      return;
    }

    if (acceptedList.length === plan.items.length && cappedList.length === 0) {
      setAddedAll(true);
      const totalUnits = acceptedList.reduce((acc, r) => acc + (r.res?.acceptedQuantity || 0), 0);
      setAddNotice(t('mehmaan.allAdded', `Added all ${acceptedList.length} selections (${totalUnits} units) to bag!`));
    } else {
      setAddedAll(false);
      let msg = '';
      if (acceptedList.length === plan.items.length && cappedList.length > 0) {
        msg = t('mehmaan.allCapped', `Added ${acceptedList.length} selections, but quantities were adjusted to respect the 50-unit limit.`);
      } else {
        msg = t('mehmaan.partialAdded', `${acceptedList.length} of ${plan.items.length} selections added to bag.`);
        if (cappedList.length > 0) {
          msg += ` ${cappedList.length} item(s) capped at 50 units.`;
        }
        if (rejectedList.length > 0) {
          msg += ` ${rejectedList.length} item(s) unavailable.`;
        }
      }
      setAddNotice(msg);
    }

    setTimeout(() => {
      setAddedAll(false);
      setAddNotice('');
    }, 5000);
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
            <label htmlFor="mehmaan-guests-range" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
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
              id="mehmaan-guests-range"
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
                    onClick={() => { setSetting(id); setCustomNuts(undefined); setCustomDates(undefined); setCustomFruits(undefined); }}
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

          {/* Transparent Serving Calculations Breakdown with Explicit Assumption Labeling */}
          <section className="bg-[#FAF9F5] dark:bg-zinc-800/40 border border-[#D4AF37]/30 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-[#D4AF37]/20 pb-2 gap-1">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#043327] dark:text-emerald-400 block">
                  {t('mehmaan.servingAssumptions', 'Recommended boutique guidelines (editable)')}
                </span>
                <span className="text-[10px] text-neutral-500 italic">
                  {plan.assumptionSource}
                </span>
              </div>
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                {t('mehmaan.totalGrams', 'Total Net Weight')}: {plan.totalGrams}g
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('nav.dryFruits', 'Roasted Nuts')}</span>
                <span className="text-sm font-bold text-[#120F17] dark:text-[#FAF9F5] block">{plan.breakdown.nutsGrams}g</span>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    aria-label="Nuts grams per guest"
                    value={customNuts ?? activeAssumptions.nutsGramsPerGuest}
                    onChange={(e) => setCustomNuts(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-12 text-center text-xs font-bold border border-neutral-300 dark:border-zinc-600 rounded bg-transparent p-0.5 focus-ring"
                  />
                  <span className="text-[10px] text-neutral-500">g/{t('guest', 'guest')}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('nav.dates', 'Select Dates')}</span>
                <span className="text-sm font-bold text-[#120F17] dark:text-[#FAF9F5] block">{plan.breakdown.datesGrams}g</span>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    aria-label="Dates grams per guest"
                    value={customDates ?? activeAssumptions.datesGramsPerGuest}
                    onChange={(e) => setCustomDates(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-12 text-center text-xs font-bold border border-neutral-300 dark:border-zinc-600 rounded bg-transparent p-0.5 focus-ring"
                  />
                  <span className="text-[10px] text-neutral-500">g/{t('guest', 'guest')}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('driedFruits', 'Dried Fruits')}</span>
                <span className="text-sm font-bold text-[#120F17] dark:text-[#FAF9F5] block">{plan.breakdown.driedFruitsGrams}g</span>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    aria-label="Dried fruits grams per guest"
                    value={customFruits ?? activeAssumptions.driedFruitsGramsPerGuest}
                    onChange={(e) => setCustomFruits(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-12 text-center text-xs font-bold border border-neutral-300 dark:border-zinc-600 rounded bg-transparent p-0.5 focus-ring"
                  />
                  <span className="text-[10px] text-neutral-500">g/{t('guest', 'guest')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Curated Recommendations List */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-3">
              {t('mehmaan.recommendedItems', 'Curated Harvest Selections')}
            </h3>
            {plan.items.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-center space-y-2">
                <AlertCircle size={24} className="mx-auto text-amber-500" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('mehmaan.emptyCandidates', 'No active published products currently available for this table configuration.')}
                </p>
              </div>
            ) : (
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
            )}
          </section>
        </div>

        {/* Footer with Subtotal & Add All CTA */}
        <footer className="p-4 sm:p-6 border-t border-[#D4AF37]/20 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block">
              {t('mehmaan.estimatedTotal', 'Estimated Table Total')}
            </span>
            <span className="text-xl font-serif font-bold text-[#043327] dark:text-emerald-400">
              Rs. {plan.estimatedTotalPkr.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {addNotice && (
              <span data-testid="planner-cart-feedback" className="text-xs font-medium text-emerald-700 dark:text-emerald-400 max-w-xs text-right">
                {addNotice}
              </span>
            )}
            <button
              type="button"
              disabled={plan.items.length === 0}
              onClick={handleAddAll}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all focus-ring shadow-md disabled:opacity-50 ${
                addedAll
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#043327] hover:bg-[#074b39] text-[#FAF9F5]'
              }`}
            >
              {addedAll ? <Check size={18} /> : <ShoppingBag size={18} />}
              <span>
                {addedAll
                  ? t('added', 'Added to Bag!')
                  : t('mehmaan.addAll', 'Add All Selections to Bag')}
              </span>
            </button>
          </div>
        </footer>
      </div>
    </dialog>,
    document.body
  );
}
