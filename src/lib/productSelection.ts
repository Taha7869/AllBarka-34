import type { Product } from '../types';
import { resolveCustomWeight, supportsCustomWeight } from './productVariants';

/** Presentation only: canonical prices are still resolved by productVariants. */
export function displayProductPrice(value: unknown, quantity = 1): string {
  const total = typeof value === 'number' ? value * quantity : NaN;
  return Number.isFinite(total) && total > 0 ? `Rs. ${total.toLocaleString('en-PK')}` : '—';
}

export function customWeightPresets(product: Product): number[] {
  if (!supportsCustomWeight(product)) return [];
  return [1000, 5000].filter(grams => {
    try { resolveCustomWeight(product, grams); return true; } catch { return false; }
  });
}

/** Offer a correction without mutating the customer's typed value. */
export function nearestCustomWeight(product: Product, input: string): number | null {
  if (!supportsCustomWeight(product) || !/^\d+(?:\.\d+)?$/.test(input.trim())) return null;
  const grams = Number(input);
  if (!Number.isFinite(grams) || grams % 50 === 0) return null;
  const minimum = Math.ceil(Math.max(100, product.minCustomWeightG ?? 100) / 50) * 50;
  const maximum = Math.floor(Math.min(5000, product.maxCustomWeightG ?? 5000) / 50) * 50;
  const nearest = Math.max(minimum, Math.min(maximum, Math.round(grams / 50) * 50));
  try { resolveCustomWeight(product, nearest); return nearest; } catch { return null; }
}
