import type { Product } from '../types';

interface CartIdentityInput {
  id?: unknown;
  productId?: unknown;
  slug?: unknown;
  selectedWeight?: unknown;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

interface CartIdentity {
  productId: string;
  product?: Product;
  portion?: string;
}

function compositePortion(product: Product, candidates: string[], requestedPortion?: string): string | undefined {
  const portions = requestedPortion ? [requestedPortion] : Object.keys(product.prices || {});
  return portions.find(portion => candidates.includes(`${product.id}-${portion}`));
}

/** Resolve complete catalog IDs before considering an exact cart-item suffix. */
export function resolveCartIdentity(input: CartIdentityInput, products: Product[]): CartIdentity | null {
  const candidates = [input.productId, input.id, input.slug].map(nonEmptyString).filter((value): value is string => !!value);
  const weight = nonEmptyString(input.selectedWeight);
  const exactProduct = candidates.map(id => products.find(product => product.id === id)).find(Boolean);
  if (exactProduct) return { productId: exactProduct.id, product: exactProduct, portion: compositePortion(exactProduct, candidates, weight) };

  for (const candidate of candidates) {
    for (const product of products) {
      const portion = compositePortion(product, [candidate], weight);
      if (portion) return { productId: product.id, product, portion };
    }
  }

  // Custom hampers and unknown products keep their complete declared identity.
  // Never guess a catalog product by splitting a hyphenated ID or taking a prefix.
  const productId = nonEmptyString(input.productId) || nonEmptyString(input.id);
  return productId ? { productId, product: undefined } : null;
}

/** Explicit call-site quantity wins; otherwise keep the quantity on the item. */
export function resolveCartQuantity(itemQuantity: unknown, explicitQuantity?: number): number {
  const value = explicitQuantity ?? itemQuantity ?? 1;
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) ? Math.max(1, Math.min(50, Math.floor(number))) : 1;
}

/** Catalog portions must match a supported key; custom hamper labels stay intact. */
export function resolveCartPortion(product: Product | undefined, requestedPortion?: unknown): string | null {
  const portion = nonEmptyString(requestedPortion);
  if (!product) return portion || '250g';
  const supportedPortions = Object.keys(product.prices || {});
  if (!portion) return supportedPortions[0] || null;
  return supportedPortions.includes(portion) ? portion : null;
}

/** Restored catalogue selections always display today's retail price. */
export function resolveCartUnitPrice(product: Product | undefined, portion: string, fallback: unknown): number {
  const value = product ? product.prices[portion] : fallback;
  const amount = typeof value === 'number' ? value : Number(String(value ?? '').replace(/(?:Rs\.?|PKR|\$|,)/gi, '').trim());
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0;
}
