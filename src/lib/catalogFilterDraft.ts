import type { Product } from '../types';
import { readCatalogFilters, searchCatalog, startingPrice } from './catalogDiscovery';

export type CatalogFilterDraft = ReturnType<typeof readCatalogFilters> & { shared: string | null };

/** Drafts are detached values: editing or discarding one never touches the URL. */
export function beginCatalogFilterDraft(params: URLSearchParams): CatalogFilterDraft {
  return { ...readCatalogFilters(params), shared: params.get('shared') };
}

export function resetCatalogFilterDraft(): CatalogFilterDraft {
  return beginCatalogFilterDraft(new URLSearchParams());
}

/** Commit just the filter keys, preserving catalogue view and unrelated URL state. */
export function applyCatalogFilterDraft(params: URLSearchParams, draft: CatalogFilterDraft): URLSearchParams {
  const next = new URLSearchParams(params);
  const changes = {
    search: draft.query,
    sort: draft.sort === 'featured' ? null : draft.sort,
    budget: draft.budget >= 10000 ? null : String(draft.budget),
    origin: draft.origin === 'all' ? null : draft.origin,
    special: draft.special ? '1' : null,
    saved: draft.saved ? '1' : null,
    shared: draft.shared,
  };
  for (const [key, value] of Object.entries(changes)) {
    // An explicitly empty shared selection is different from an unfiltered catalogue.
    if (value !== null && (value !== '' || key === 'shared')) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

export function filterCatalogSelection(
  products: Product[],
  filters: ReturnType<typeof readCatalogFilters>,
  context: { category: string; isWholesale: boolean; savedIds: readonly string[]; sharedIds: readonly string[] | null },
): Product[] {
  return searchCatalog(products, filters.query).filter(product =>
    (context.category === 'all' || product.category === context.category) &&
    (context.sharedIds === null || context.sharedIds.includes(product.id)) &&
    (filters.origin === 'all' || product.origin_en === filters.origin) &&
    (!context.isWholesale || product.wholesale > 0) &&
    (!filters.special || !!product.tag_en) &&
    (!filters.saved || context.savedIds.includes(product.id)) &&
    (filters.budget === 10000 || (!product.quoteOnly && startingPrice(product) <= filters.budget)));
}
