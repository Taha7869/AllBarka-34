import type { Product } from '../types';

export const CATALOG_SORTS = ['featured', 'price-asc', 'price-desc', 'name-asc'] as const;
export type CatalogSort = typeof CATALOG_SORTS[number];
export function normalizeSearch(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
const aliases: Record<string, string> = {
  pista: 'pistachio pistachios pistachiyo پستہ فستق',
  badam: 'badam badaam almond almonds بادام لوز',
  kaju: 'kaju kaaju cashew cashews کاجو كاجو',
  akhroot: 'akhrot akhroot walnut walnuts اخروٹ جوز',
  khajoor: 'khajur khajoor dates کھجور تمر',
  kishmish: 'kishmish raisins کشمش زبيب',
  khubani: 'khubani apricot apricots خوبانی مشمش',
};

export function productSearchScore(product: Product, query: string): number {
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  if (!terms.length) return 1;
  const names = normalizeSearch([product.name_en, product.name_ur, product.name_ar, aliases[product.id] || ''].join(' '));
  const details = normalizeSearch([product.category, product.category_en, product.category_ur, product.category_ar, product.desc_en, product.desc_ur, product.desc_ar,
    product.origin_en, product.origin_ur, product.origin_ar, ...(product.keywords || [])].join(' '));
  if (!terms.every(term => names.includes(term) || details.includes(term))) return 0;
  return terms.reduce((score, term) => score + (names.split(' ').includes(term) ? 5 : names.includes(term) ? 3 : 1), 0);
}

export function searchCatalog(products: Product[], query: string): Product[] {
  return products.map(product => ({ product, score: productSearchScore(product, query) }))
    .filter(result => result.score > 0).sort((a, b) => b.score - a.score).map(result => result.product);
}

export function startingPrice(product: Product): number {
  const prices = Object.values(product.prices || {}).filter(price => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : product.price || 0;
}

export function readCatalogFilters(params: URLSearchParams) {
  const price = Number(params.get('budget'));
  return {
    query: params.get('search') || '',
    sort: CATALOG_SORTS.includes(params.get('sort') as CatalogSort) ? params.get('sort') as CatalogSort : 'featured' as CatalogSort,
    budget: params.has('budget') && Number.isFinite(price) ? Math.max(300, Math.min(10000, price)) : 10000,
    origin: params.get('origin') || 'all',
    special: params.get('special') === '1',
    saved: params.get('saved') === '1',
  };
}
