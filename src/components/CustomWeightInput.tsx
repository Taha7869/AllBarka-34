import React, { useId } from 'react';
import type { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { resolveCustomWeight, supportsCustomWeight } from '../lib/productVariants';
import { customWeightPresets, nearestCustomWeight } from '../lib/productSelection';

interface Props {
  product: Product;
  selected: boolean;
  grams: string;
  onSelect: () => void;
  onChange: (grams: string) => void;
}

export default function CustomWeightInput({ product, selected, grams, onSelect, onChange }: Props) {
  const { t } = useLanguage();
  const id = useId();
  if (!supportsCustomWeight(product)) return null;
  let price: number | null = null;
  try { price = resolveCustomWeight(product, grams).price; } catch { /* Inline validation below. */ }
  const custom=product.commerce?.custom;
  const error = custom ? (price===null?t('item.invalidQuantity'):'') : price === null ? t(Number(grams) < 100 ? 'weight.minimum' : 'weight.range') : '';
  const suggestion = !custom && price === null ? nearestCustomWeight(product, grams) : null;
  const presets = !custom ? customWeightPresets(product) : [];
  return <>
    {presets.map(weight => <button key={weight} type="button" aria-pressed={selected && grams === String(weight)} onClick={() => { onSelect(); onChange(String(weight)); }} className={`focus-ring min-h-[44px] min-w-[70px] rounded-xl border px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${selected && grams === String(weight) ? 'bg-[var(--color-primary,#042821)] border-[var(--color-primary,#042821)] text-[var(--color-text-on-emerald,#FFFCF7)] shadow-sm' : 'border-[var(--color-border-accent)] bg-[var(--color-surface)] text-[var(--color-accent-text)] hover:border-[var(--color-accent,#C7982F)]'}`}>{weight / 1000}kg</button>)}
    <button type="button" aria-pressed={selected && !presets.some(weight => grams === String(weight))} onClick={()=>{if(custom&&price===null)onChange(String(custom.min));onSelect();}} className={`focus-ring min-h-[44px] rounded-xl border px-5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${selected ? 'border-[#1e3a2b] bg-[#1e3a2b] text-[#fff8e9]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[#c7982f]'}`}>{t('weight.custom')}</button>
    {selected && <div className="mt-2 w-full basis-full rounded-xl border border-[var(--color-border-accent)] bg-[var(--color-surface)] p-4">
      <label htmlFor={id} className="mb-2 block text-xs font-semibold">{custom?`${t('item.quantity')} (${custom.unit})`:t('weight.grams')}</label>
      <input id={id} type="number" inputMode="decimal" min={custom?.min??100} max={custom?.max??5000} step={custom?.step??50} value={grams} onChange={event => onChange(event.target.value)} aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} className="focus-ring min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-sm text-[var(--color-text-primary)]" dir="ltr" />
      <p id={`${id}-hint`} className="mt-2 text-xs text-[var(--color-text-secondary)]">{custom?`${custom.min}–${custom.max} ${custom.unit} · ${t('item.step')}: ${custom.step}. ${t('item.customHint')}`:t('weight.hint')}</p>
      <div aria-live="polite">{error ? <p id={`${id}-error`} className="mt-2 text-xs font-medium text-red-700 dark:text-red-300">{error}</p> : <p className="mt-2 text-xs font-semibold text-[var(--color-accent-text)]">{t('weight.customPrice')}: <bdi>Rs. {price!.toLocaleString('en-PK')}</bdi></p>}</div>
      {suggestion !== null && <button type="button" onClick={() => onChange(String(suggestion))} className="focus-ring mt-2 min-h-11 rounded-lg px-2 text-xs font-semibold text-[var(--color-accent-text)] underline underline-offset-4">{t('weight.nearest').replace('{grams}', String(suggestion))}</button>}
    </div>}
  </>;
}
