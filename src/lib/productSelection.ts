import type { Product } from '../types';
import { resolveCustomWeight, supportsCustomWeight } from './productVariants';

/** Presentation only: canonical prices are still resolved by productVariants. */
export function displayProductPrice(value: unknown, quantity = 1): string {
  const total = typeof value === 'number' ? value * quantity : NaN;
  return Number.isFinite(total) && total > 0 ? `Rs. ${total.toLocaleString('en-PK')}` : '—';
}

interface ParsedPortion {
  kind: 'mass' | 'volume';
  amount: number;
}

export function parsePortionMeasure(label: string): ParsedPortion | null {
  const match = label.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)$/);
  if (!match) return null;
  const raw = Number(match[1]);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const unit = match[2];
  if (unit === 'kg') return { kind: 'mass', amount: Math.round(raw * 1000) };
  if (unit === 'g') return { kind: 'mass', amount: Math.round(raw) };
  if (unit === 'l') return { kind: 'volume', amount: Math.round(raw * 1000) };
  return { kind: 'volume', amount: Math.round(raw) };
}

/** Sort standard weight/volume portions smallest-to-largest and remove duplicate equivalent weights (e.g. 1000g vs 1kg). */
export function sortAndDedupePortions(labels: string[]): string[] {
  const seenMeasures = new Set<string>();
  const seenRaw = new Set<string>();
  const unique: Array<{ label: string; measure: ParsedPortion | null; index: number }> = [];

  labels.forEach((label, index) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const rawKey = trimmed.toLowerCase();
    if (seenRaw.has(rawKey)) return;
    const measure = parsePortionMeasure(trimmed);
    if (measure) {
      const measureKey = `${measure.kind}:${measure.amount}`;
      if (seenMeasures.has(measureKey)) return;
      seenMeasures.add(measureKey);
    }
    seenRaw.add(rawKey);
    unique.push({ label, measure, index });
  });

  return unique
    .sort((a, b) => {
      if (a.measure && b.measure && a.measure.kind === b.measure.kind) {
        return a.measure.amount - b.measure.amount;
      }
      if (a.measure && !b.measure) return -1;
      if (!a.measure && b.measure) return 1;
      return a.index - b.index;
    })
    .map(item => item.label);
}

export function customWeightPresets(product: Product): number[] {
  if (!supportsCustomWeight(product)) return [];
  const disabledLabels = new Set(
    Array.isArray(product.variants)
      ? product.variants.filter(v => v && v.available === false).map(v => v.label)
      : []
  );
  const existingMasses = new Set<number>();
  for (const [label, price] of Object.entries(product.prices || {})) {
    if (disabledLabels.has(label) || !Number.isFinite(price) || price <= 0) continue;
    const parsed = parsePortionMeasure(label);
    if (parsed?.kind === 'mass') existingMasses.add(parsed.amount);
  }
  return [1000, 5000].filter(grams => {
    if (existingMasses.has(grams)) return false;
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
