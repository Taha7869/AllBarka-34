import { defaultProductPricing, parseCatalogResponse, type CatalogSnapshot } from './catalogPricing';

/** Prices/availability travel separately from the immutable public registry already shipped to the client. */
export function compactCatalog(snapshot: CatalogSnapshot) {
  return { format: 'pricing-v1', source: snapshot.source, revision: snapshot.revision,
    catalog: snapshot.catalog.map(product => ({ id: product.id, ...defaultProductPricing(product) })),
    boxes: snapshot.boxes.map(box => ({ id: box.id, price: box.price, active: box.active !== false })) };
}
export function parseCatalogTransport(raw: unknown): CatalogSnapshot {
  if (raw && typeof raw === 'object' && 'format' in raw && (raw as any).format !== 'pricing-v1') throw new Error('INVALID_CATALOG_FORMAT');
  return parseCatalogResponse(raw);
}
