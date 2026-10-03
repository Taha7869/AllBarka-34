import type { Product } from '../types';

export interface SelectionPreferences { category: string; budget: number | null }
export interface SelectionMatch { product: Product; weight: string; price: number }

/** Exact catalogue portions; budgets are per item, before delivery/discounts. */
export function selectionMatches(products: Product[], preferences: SelectionPreferences): SelectionMatch[] {
  if (preferences.budget !== null && (!Number.isFinite(preferences.budget) || preferences.budget <= 0)) return [];
  return products.flatMap(product => {
    if (preferences.category !== 'all' && product.category !== preferences.category) return [];
    const portions = Object.entries(product.prices).filter(([, price]) => Number.isFinite(price) && price > 0)
      .sort((a, b) => a[1] - b[1]);
    const [weight, price] = portions[0] || [];
    if (!weight || !price || (preferences.budget !== null && price > preferences.budget)) return [];
    return [{ product, weight, price }];
  });
}

export function selectionResultsPath(preferences: SelectionPreferences): string {
  const category = ['nuts', 'snacks-seeds', 'gift-boxes', 'oils', 'essentials'].includes(preferences.category) ? preferences.category : 'all';
  const params = new URLSearchParams();
  if (preferences.budget !== null && Number.isFinite(preferences.budget) && preferences.budget >= 300 && preferences.budget < 10000) params.set('budget', String(preferences.budget));
  return `${category === 'all' ? '/shop' : `/shop/${category}`}${params.size ? `?${params}` : ''}`;
}
