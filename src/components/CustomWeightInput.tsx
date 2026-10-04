import React, { useId } from 'react';
import type { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { resolveCustomWeight, supportsCustomWeight } from '../lib/productVariants';

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
  const error = price === null ? t(Number(grams) < 100 ? 'weight.minimum' : 'weight.range') : '';
  return <div className="mt-3">
    <button type="button" aria-pressed={selected} onClick={onSelect} className={`focus-ring min-h-11 rounded-xl border px-5 text-xs font-semibold ${selected ? 'border-[#1e3a2b] bg-[#1e3a2b] text-[#fff8e9]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[#c7982f]'}`}>{t('weight.custom')}</button>
    {selected && <div className="mt-3 rounded-xl border border-[var(--color-border-accent)] bg-[var(--color-surface)] p-4">
      <label htmlFor={id} className="mb-2 block text-xs font-semibold">{t('weight.grams')}</label>
      <input id={id} type="number" inputMode="numeric" min={100} max={5000} step={50} value={grams} onChange={event => onChange(event.target.value)} aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} className="focus-ring min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-sm text-[var(--color-text-primary)]" dir="ltr" />
      <p id={`${id}-hint`} className="mt-2 text-xs text-[var(--color-text-secondary)]">{t('weight.hint')}</p>
      <div aria-live="polite">{error ? <p id={`${id}-error`} className="mt-2 text-xs font-medium text-red-700 dark:text-red-300">{error}</p> : <p className="mt-2 text-xs font-semibold text-[var(--color-accent-text)]">{t('weight.customPrice')}: <bdi>Rs. {price!.toLocaleString('en-PK')}</bdi></p>}</div>
    </div>}
  </div>;
}
