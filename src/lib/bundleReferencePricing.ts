import { PRODUCTS } from '../data/products';
import { intakeProducts20261110 } from './catalogIntake20261110';
import batchTwo from '../data/catalogIntake20261113.json';
import batchThree from '../data/catalogIntake20261114.json';

/** Reference rate of one catalogue item in PKR per gram (solids) or per millilitre (oils), or null if it has none. */
export type ReferenceRate = { perUnit: number; unit: 'g' | 'ml'; source: 'live' | 'draft' };

type DraftLike = { id: string; category: string; commerce?: { baseQuantity: number | null; baseUnit: string; basePrice: number | null } };
// Batch 1 gets its rates from the completion overlay, so read the validated products, not the raw manifest.
const drafts = (): DraftLike[] => [...(intakeProducts20261110() as unknown as DraftLike[]), ...(batchTwo.newProducts as unknown as DraftLike[]), ...(batchThree.newProducts as unknown as DraftLike[])];

const label = /^(?:(\d+)x)?(\d+(?:\.\d+)?)\s*(kg|g|ml|L)$/i;
function liveRate(id: string): ReferenceRate | null {
  const product = PRODUCTS.find(item => item.id === id);
  if (!product || ['bundles', 'celebration-boxes', 'gift-boxes'].includes(product.category)) return null;
  const liquid = product.category === 'oils';
  const rows = Object.entries(product.prices || {}).flatMap(([name, price]) => {
    const match = label.exec(name);
    if (!match) return [];
    const unit = match[3].toLowerCase();
    const amount = Number(match[2]) * (match[1] ? Number(match[1]) : 1) * (unit === 'kg' || unit === 'l' ? 1000 : 1);
    return [{ amount, price: price as number }];
  }).sort((a, b) => a.amount - b.amount);
  // Oils use the smallest bottle (the conservative retail rate); solids use the largest pack.
  const row = liquid ? rows[0] : rows[rows.length - 1];
  return row ? { perUnit: row.price / row.amount, unit: liquid ? 'ml' : 'g', source: 'live' } : null;
}

export function referenceRate(id: string): ReferenceRate | null {
  const draft = drafts().find(item => item.id === id);
  const commerce = draft?.commerce;
  if (draft && commerce?.basePrice && commerce.baseQuantity) {
    const factor = commerce.baseUnit === 'kg' || commerce.baseUnit === 'L' ? 1000 : 1;
    return { perUnit: commerce.basePrice / (commerce.baseQuantity * factor), unit: ['L', 'ml'].includes(commerce.baseUnit) ? 'ml' : 'g', source: 'draft' };
  }
  return liveRate(id);
}

export type BundlePricingEntry = { tier: 'deal' | 'bundle' | 'gift'; discountPct: number; packagingFeePKR: number; pricePKR: number; componentValuePKR: number; components: Array<{ id: string; quantity: number; unit: string }> };

/** Sum of the components at their current reference rates. */
export function bundleComponentValue(entry: Pick<BundlePricingEntry, 'components'>): number {
  return entry.components.reduce((sum, component) => {
    const rate = referenceRate(component.id);
    if (!rate || rate.unit !== component.unit) throw new Error(`NO_REFERENCE_RATE:${component.id}`);
    return sum + rate.perUnit * component.quantity;
  }, 0);
}

/** Deals round down to PKR 50 so the stated saving is real; every other bundle rounds to the nearest PKR 50. */
export function bundlePriceFromValue(entry: Pick<BundlePricingEntry, 'tier' | 'discountPct' | 'packagingFeePKR'>, value: number): number {
  const raw = value * (1 - entry.discountPct / 100) + entry.packagingFeePKR;
  return entry.tier === 'deal' ? Math.floor(raw / 50) * 50 : Math.floor(raw / 50 + 0.5) * 50;
}
