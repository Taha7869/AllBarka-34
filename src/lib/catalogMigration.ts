import { PRODUCTS } from '../data/products';
import { readCatalogPricing, pricingFromLegacy } from './catalogSchema';
import type { CatalogPricing } from './catalogSchema';

export function planCatalogMigration(documents: { id: string; data: unknown }[]) {
  const live = new Map(documents.map(document => [document.id, document.data]));
  return PRODUCTS.map(seed => {
    const value = live.get(seed.id);
    if (value === undefined) return { productId: seed.id, action: 'CREATE_MISSING' as const, pricing: pricingFromLegacy(seed, seed), differsFromSource: false };
    try {
      const pricing = readCatalogPricing(value, seed);
      const source = pricingFromLegacy(seed, seed);
      const differsFromSource = JSON.stringify({ ...pricing, revision: 0 }) !== JSON.stringify(source);
      return { productId: seed.id, action: (value as any).schemaVersion === 1 ? 'KEEP_CANONICAL' as const : 'ADOPT_LIVE_LEGACY' as const, pricing, differsFromSource };
    } catch { return { productId: seed.id, action: 'REQUIRES_OWNER_REVIEW' as const, pricing: null as CatalogPricing | null, differsFromSource: true }; }
  });
}
