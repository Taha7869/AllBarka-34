import type { CartItem, Product } from '../types';
import { resolveProductVariant } from './productVariants';
import { CUSTOM_HAMPER_PRODUCT_ID, resolveHamper, type HamperBox } from './hamperCatalog';

/** Refresh unsaved bags without silently removing a customer's unavailable selections. */
export function repriceCart(items: CartItem[], catalog: Product[], boxes: readonly HamperBox[]): CartItem[] {
  let changed = false;
  const next = items.map(item => {
    const product = catalog.find(value => value.id === item.productId);
    const hamper = item.productId === CUSTOM_HAMPER_PRODUCT_ID ? resolveHamper(item.hamperConfiguration, catalog, boxes) : null;
    const variant = product && product.active !== false && !product.quoteOnly ? resolveProductVariant(product, item.selectedWeight) : null;
    const price = hamper?.unitPrice ?? variant?.price;
    const unavailable = price === undefined;
    if (item.priceUnavailable === unavailable && (unavailable || item.unitPrice === price && item.price === price)) return item;
    changed = true;
    return { ...item, priceUnavailable: unavailable, ...(!unavailable ? { unitPrice: price, price } : {}) };
  });
  return changed ? next : items;
}
