import type { Product } from '../types';

export const ALLERGEN_FILTER_KEYS = [
  'tree-nuts',
  'peanuts',
  'sesame',
  'dairy',
  'gluten',
  'sulfites',
] as const;

export type AllergenFilterKey = typeof ALLERGEN_FILTER_KEYS[number];

const ALLERGEN_SET = new Set<string>(ALLERGEN_FILTER_KEYS);

/**
 * Strips the shared facility cross-contact disclaimer ("Packed in a facility that also handles...")
 * so filtering reflects each product's actual listed allergen / ingredient declaration rather than
 * hiding all 252 products. UI surfaces display the facility disclaimer explicitly alongside the filter.
 */
export function ingredientAllergenText(product: Product): string {
  const warning = String(product.allergenWarning_en || '').trim();
  const facilityIdx = warning.toLowerCase().indexOf('packed in a facility');
  const beforeFacility = facilityIdx >= 0 ? warning.slice(0, facilityIdx) : warning;
  const passportAllergens = Array.isArray(product.passport?.allergens)
    ? product.passport!.allergens.join(' ')
    : '';
  const passportIngredients = Array.isArray(product.passport?.ingredients)
    ? product.passport!.ingredients.join(' ')
    : '';
  return `${beforeFacility} ${passportAllergens} ${passportIngredients}`.toLowerCase();
}

const TREE_NUT_PATTERN = /\b(tree\s*nuts?|almond|almonds|badam|pistachio|pistachios|pista|cashew|cashews|kaju|walnut|walnuts|akhroot|akhrot|pecan|pecans|hazelnut|hazelnuts|macadamia|brazil\s*nuts?|pine\s*nuts?|chilgoza)\b/i;
const PEANUT_PATTERN = /\b(peanuts?|groundnut|groundnuts|moongphali)\b/i;
const SESAME_PATTERN = /\b(sesame|til|rewari)\b/i;
const DAIRY_PATTERN = /\b(milk|dairy|ghee|butter|lactose)\b/i;
const GLUTEN_PATTERN = /\b(wheat|gluten|barley|sooji|suji|semolina)\b/i;
const SULFITE_PATTERN = /\b(sulphites?|sulfites?)\b/i;

export function extractProductAllergens(
  product: Product,
  productLookup?: ReadonlyMap<string, Product>,
  visited: Set<string> = new Set(),
): Set<AllergenFilterKey> {
  const result = new Set<AllergenFilterKey>();
  if (visited.has(product.id)) return result;
  visited.add(product.id);

  const declared = ingredientAllergenText(product);
  const identity = `${product.id || ''} ${product.name_en || ''}`.toLowerCase();
  const combined = `${declared} ${identity}`;

  if (TREE_NUT_PATTERN.test(combined)) result.add('tree-nuts');
  if (PEANUT_PATTERN.test(combined)) result.add('peanuts');
  if (SESAME_PATTERN.test(combined)) result.add('sesame');
  if (DAIRY_PATTERN.test(combined)) result.add('dairy');
  if (GLUTEN_PATTERN.test(combined)) result.add('gluten');
  if (SULFITE_PATTERN.test(declared)) result.add('sulfites');

  // For bundles/hampers, inherit allergens from referenced component products when available
  const components = (product as Product & { componentIds?: string[] }).componentIds;
  if (productLookup && Array.isArray(components)) {
    for (const cid of components) {
      const child = productLookup.get(cid);
      if (!child) continue;
      for (const key of extractProductAllergens(child, productLookup, visited)) {
        result.add(key);
      }
    }
  }

  return result;
}

export function parseAllergenParam(raw?: string | null): AllergenFilterKey[] {
  if (!raw) return [];
  const seen = new Set<AllergenFilterKey>();
  for (const part of raw.split(',')) {
    const key = part.trim().toLowerCase();
    if (ALLERGEN_SET.has(key)) seen.add(key as AllergenFilterKey);
  }
  return [...seen];
}

export function productMatchesAllergenExclusions(
  product: Product,
  excludeAllergens: readonly AllergenFilterKey[],
  productLookup?: ReadonlyMap<string, Product>,
): boolean {
  if (!excludeAllergens || excludeAllergens.length === 0) return true;
  const present = extractProductAllergens(product, productLookup);
  return excludeAllergens.every(key => !present.has(key));
}
