import type { Product } from '../types';
import { readCatalogFilters, searchCatalog, startingPrice } from './catalogDiscovery';
import { productMatchesAllergenExclusions, type AllergenFilterKey } from './allergenFilter';
import { productMatchesCategory, productMatchesOccasion } from '../config/categories';

export type CatalogFilterDraft = Omit<ReturnType<typeof readCatalogFilters>, 'excludeAllergens'> & {
  excludeAllergens?: AllergenFilterKey[];
  shared: string | null;
  occasion?: string | null;
};

/** Drafts are detached values: editing or discarding one never touches the URL. */
export function beginCatalogFilterDraft(params: URLSearchParams): CatalogFilterDraft {
  const draft: CatalogFilterDraft = { ...readCatalogFilters(params), shared: params.get('shared') };
  const occasion = params.get('occasion');
  if (occasion) draft.occasion = occasion;
  return draft;
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
    avoid: draft.excludeAllergens?.length ? draft.excludeAllergens.join(',') : null,
    shared: draft.shared,
    occasion: !draft.occasion || draft.occasion === 'all' ? null : draft.occasion,
  };
  for (const [key, value] of Object.entries(changes)) {
    // An explicitly empty shared selection is different from an unfiltered catalogue.
    if (value !== null && value !== undefined && (value !== '' || key === 'shared')) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

export function filterCatalogSelection(
  products: Product[],
  filters: Omit<ReturnType<typeof readCatalogFilters>, 'excludeAllergens'> & { excludeAllergens?: readonly AllergenFilterKey[]; occasion?: string | null },
  context: { category: string; isWholesale: boolean; savedIds: readonly string[]; sharedIds: readonly string[] | null },
): Product[] {
  const excludeAllergens = filters.excludeAllergens || [];
  const productLookup = excludeAllergens.length ? new Map(products.map(p => [p.id, p])) : undefined;
  return searchCatalog(products, filters.query).filter(product =>
    productMatchesCategory(product, context.category) &&
    productMatchesOccasion(product, filters.occasion) &&
    (context.sharedIds === null || context.sharedIds.includes(product.id)) &&
    (filters.origin === 'all' || product.origin_en === filters.origin) &&
    (!context.isWholesale || product.wholesale > 0) &&
    (!filters.special || !!product.tag_en) &&
    (!filters.saved || context.savedIds.includes(product.id)) &&
    productMatchesAllergenExclusions(product, excludeAllergens, productLookup) &&
    (filters.budget === 10000 || (!product.quoteOnly && startingPrice(product) <= filters.budget)));
}
