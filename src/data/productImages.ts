import type { Product } from '../types';
import { getProductImage, NEW_PRODUCT_IDS } from './products';

const singleCoverIds = new Set(NEW_PRODUCT_IDS);

const secondPhotoIds = new Set(['pista', 'kaju', 'badam', 'akhroot', 'deal-1', 'deal-2', 'khubani', 'alubukhara', 'kishmish', 'khajoor', 'pumpkin_seeds', 'chia_seeds', 'nimko', 'chanay']);
const bundleContents: Record<string, string[]> = {
  'deal-1': ['/images/generated/walnut-halves-catalog-v1.webp', '/images/generated/pistachios-catalog-v1.webp'],
  'deal-2': ['/images/generated/almonds-catalog-v1.webp', '/images/generated/cashews-catalog-v1.webp'],
};

/** Migrated selections retain one approved cover regardless of its file format. */
export function isSingleImageCatalogProduct(product: Product): boolean {
  return singleCoverIds.has(product.id) && product.image !== null;
}

export function getProductImages(product: Product): string[] {
  if (product.image === null) return [];
  const images = [getProductImage(product)];
  if (secondPhotoIds.has(product.id)) images.push(`/images/generated/${product.id}-secondary-v1.webp`);
  images.push(...(bundleContents[product.id] || []));
  return [...new Set(images)];
}
