import type { Product } from '../types';

export function initialCardPortion(product: Pick<Product, 'id'>, available: string[]): string {
  return product.id === 'pumpkin_seeds' && available.includes('250g') ? '250g' : available[0] || '';
}

/** Only explicit declared pack formats; shipping weight is never treated as food net weight. */
export function readBundleFormat(product: Pick<Product, 'isBundle' | 'badge'>) {
  if (!product.isBundle || typeof product.badge !== 'string') return null;
  const match = /^(\d{1,2})\s*[×x]\s*(\d{1,5})\s*(g|kg)$/i.exec(product.badge.trim());
  if (!match) return null;
  const count = Number(match[1]), gramsEach = Number(match[2]) * (match[3].toLowerCase() === 'kg' ? 1000 : 1);
  if (!count || !gramsEach || gramsEach > 10000 || count * gramsEach > 100000) return null;
  return { count, gramsEach, netGrams: count * gramsEach, label: `${count} × ${gramsEach}g` };
}
