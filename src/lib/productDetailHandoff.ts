import type { Product } from '../types';
import { getPackagingMoqDisplay, isPackagingProduct } from './packagingMoq';
import { resolveProductVariant } from './productVariants';

/** Navigation hints only. Current catalog and server quotes still own prices. */
export function availableDetailVariants(product: Product): string[] {
  if (product.orderMode === 'inquiry_quote') return [];
  return Object.keys(product.prices || {}).filter(label => {
    const variant = resolveProductVariant(product, label);
    return Boolean(variant && !variant.isCustom);
  });
}

function quantityBounds(product: Product, variant?: string) {
  const maximum = isPackagingProduct(product) ? 10000 : 50;
  const currentMinimum = getPackagingMoqDisplay(product, variant).minUnits ?? 1;
  const minimum = Number.isSafeInteger(currentMinimum) && currentMinimum > 0 ? currentMinimum : 1;
  return { minimum, maximum };
}

export function buildProductDetailsPath(product: Product, selection: { variant: string; quantity: number }): string {
  const path = `/product/${encodeURIComponent(product.id)}`;
  if (!availableDetailVariants(product).includes(selection.variant)
    || !Number.isSafeInteger(selection.quantity) || selection.quantity < 1) return path;
  // Do not pre-clamp: the destination must disclose a changed MOQ or quantity.
  const query = new URLSearchParams({ variant: selection.variant, quantity: String(selection.quantity) });
  return `${path}?${query}`;
}

export function readProductDetailHandoff(product: Product, query: URLSearchParams): {
  requested: boolean; variant: string | null; quantity: number; needsReview: boolean;
} {
  const requested = query.has('variant') || query.has('quantity');
  if (!requested) return { requested: false, variant: null, quantity: 1, needsReview: false };
  const variants = availableDetailVariants(product);
  const labels = query.getAll('variant');
  const variant = labels.length === 1 && variants.includes(labels[0]) ? labels[0] : null;
  const { minimum, maximum } = quantityBounds(product, variant || variants[0]);
  if (!variant || minimum > maximum) return { requested: true, variant: null, quantity: minimum, needsReview: true };
  const quantities = query.getAll('quantity');
  if (!quantities.length) return { requested: true, variant, quantity: minimum, needsReview: false };
  const raw = quantities[0];
  const value = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (quantities.length !== 1 || !Number.isSafeInteger(value) || value < 1) {
    return { requested: true, variant, quantity: minimum, needsReview: true };
  }
  const quantity = Math.max(minimum, Math.min(maximum, value));
  return { requested: true, variant, quantity, needsReview: quantity !== value };
}
