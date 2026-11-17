import React, { useMemo, useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { useCart, formatPrice } from '../contexts/CartContext';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getLocalized } from '../utils/localize';
import { matchAddonsForCart, type AddonOccasionContext } from '../lib/addonsCatalog';

interface PaidAddonsSelectorProps {
  occasionContext?: AddonOccasionContext;
  compact?: boolean;
}

export default function PaidAddonsSelector({ occasionContext, compact = false }: PaidAddonsSelectorProps) {
  const { cartItems, subtotal, addonsCatalog, selectedAddons, toggleAddon } = useCart();
  const products = useCatalogProducts();
  const { t, language } = useLanguage();
  const [selectedOccasionTag, setSelectedOccasionTag] = useState<string>('');

  const mergedOccasionContext = useMemo<AddonOccasionContext>(() => ({
    ...occasionContext,
    occasions: [
      ...(occasionContext?.occasions || []),
      ...(selectedOccasionTag ? [selectedOccasionTag] : []),
    ],
  }), [occasionContext, selectedOccasionTag]);

  const matchedAddons = useMemo(() => matchAddonsForCart({
    addons: addonsCatalog,
    items: cartItems,
    subtotal,
    products,
    occasionContext: mergedOccasionContext,
  }), [addonsCatalog, cartItems, subtotal, products, mergedOccasionContext]);

  const hasAnyActiveAddons = useMemo(
    () => addonsCatalog.some(a => a.active && a.price > 0),
    [addonsCatalog]
  );

  if (!hasAnyActiveAddons || cartItems.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-xl border border-[var(--color-gold,#B8935F)]/30 bg-[var(--color-surface,#FDFBF7)] p-3.5 space-y-2.5"
      aria-label={t('addons.heading')}
      data-testid="paid-addons-selector"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-[var(--color-gold,#B8935F)] shrink-0" />
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]">
            {t('addons.heading')}
          </h4>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label={t('addons.occasionFilter')}>
          {(['', 'gift', 'eid', 'nikah'] as const).map(occ => (
            <button
              key={occ || 'all'}
              type="button"
              onClick={() => setSelectedOccasionTag(occ)}
              aria-pressed={selectedOccasionTag === occ}
              className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                selectedOccasionTag === occ
                  ? 'bg-[var(--color-ink,#1F120F)] text-[var(--color-gold,#B8935F)]'
                  : 'bg-[var(--color-base)] text-[var(--color-ink,#1F120F)]/70 hover:text-[var(--color-ink,#1F120F)]'
              }`}
            >
              {occ === '' ? t('addons.occasionAll') : t(`addons.occasion.${occ}`)}
            </button>
          ))}
        </div>
      </div>

      {matchedAddons.length === 0 ? (
        <p className="text-[11px] text-[var(--color-ink,#1F120F)]/60">
          {t('addons.noneForSelection')}
        </p>
      ) : (
        <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {matchedAddons.map(({ addon, quantity, totalPrice }) => {
            const isSelected = selectedAddons.includes(addon.id);
            const title = getLocalized(addon, 'name', language);
            const description = getLocalized(addon, 'description', language);
            return (
              <button
                key={addon.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                data-testid={`paid-addon-option-${addon.id}`}
                onClick={() => toggleAddon(addon.id)}
                className={`flex items-start justify-between gap-2.5 rounded-xl border p-2.5 text-start transition-all cursor-pointer min-h-11 ${
                  isSelected
                    ? 'border-[var(--color-gold,#B8935F)] bg-[var(--color-gold,#B8935F)]/10 shadow-2xs'
                    : 'border-[var(--color-border)] bg-[var(--color-base)] hover:border-[var(--color-gold,#B8935F)]/50'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? 'border-[var(--color-ink,#1F120F)] bg-[var(--color-ink,#1F120F)] text-[var(--color-gold,#B8935F)]'
                        : 'border-[var(--color-gold,#B8935F)]/60'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-[var(--color-ink,#1F120F)]" dir="auto">
                      {title}
                    </span>
                    {description && !compact && (
                      <span className="block text-[10px] text-[var(--color-ink,#1F120F)]/65 line-clamp-2 mt-0.5" dir="auto">
                        {description}
                      </span>
                    )}
                    <span className="block text-[10px] font-semibold text-[var(--color-accent-text,#806326)] mt-0.5">
                      {addon.pricingMode === 'per_item' && quantity > 1
                        ? `${t('addons.perItem')} × ${quantity}`
                        : t('addons.fixedPrice')}
                    </span>
                  </div>
                </div>
                <strong className="text-xs font-black text-[var(--color-ink,#1F120F)] shrink-0">
                  <bdi>+{formatPrice(totalPrice)}</bdi>
                </strong>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
