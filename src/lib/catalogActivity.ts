import type { Product } from '../types';
export const COMPARE_KEY = 'allbarka_compare_v1';
export const RECENT_KEY = 'allbarka_recent_v1';
export function catalogIds(value: unknown, products: Product[], limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(products.map(product => product.id));
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && known.has(id)))].slice(0, limit);
}
export function recordView(history: string[], id: string, products: Product[]): string[] { return catalogIds([id, ...history.filter(value => value !== id)], products, 8); }
export function unitPrice(price: number, portion: string): { amount: number; unit: '100g' | '100ml' } | null {
  const match = portion.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)$/);
  if (!match || !Number.isFinite(price) || price <= 0) return null;
  const amount = Number(match[1]) * (match[2] === 'kg' || match[2] === 'l' ? 1000 : 1);
  if (amount <= 0) return null;
  return { amount: Math.round(price / amount * 100), unit: match[2] === 'ml' || match[2] === 'l' ? '100ml' : '100g' };
}
