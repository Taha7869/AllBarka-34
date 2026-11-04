import type { Product } from '../types';

export const CATALOG_SORTS = ['featured', 'price-asc', 'price-desc', 'name-asc'] as const;
export type CatalogSort = typeof CATALOG_SORTS[number];

export function normalizeSearch(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit >= '۰' ? 0x06f0 : 0x0660)))
    // Search equivalence only: never selects a portion or computes a commercial price.
    .replace(/(\d+(?:\.\d+)?)\s*(kilograms?|kilogrammes?|kilos?|kg|grams?|g|(?:کلو|کیلو)\s*(?:گرام|غرام)?|گرام|غرام)(?=$|[^\p{L}\p{N}])/gu,
      (match, count: string, unit: string) => {
        const grams = Number(count) * (/^(?:kil|kg|کلو|کیلو)/u.test(unit) ? 1000 : 1);
        return Number.isFinite(grams) && grams > 0 ? `${grams}g` : match;
      })
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Linguistic and multilingual script synonyms keyed strictly by valid canonical product IDs
 */
export const CATALOG_ALIASES: Record<string, string> = {
  pista: 'pistachio pistachios pistachiyo pista pesteh پستہ فستق salted roasted raw green nut',
  badam: 'badam badaam almond almonds mamra badamain بادام لوز sweet almond nuts',
  kaju: 'kaju kaaju cashew cashews caju کاجو كاجو roasted salted raw whole nuts',
  akhroot: 'akhrot akhroot walnut walnuts akrot اخروٹ جوز kaghzi giri halves pieces brain food',
  khajoor: 'khajur khajoor dates ajwa کھجور تمر madina dates',
  'ajwa-dates': 'ajwa dates khajoor madina ajwa عجوة',
  kishmish: 'kishmish kismis raisins sultanas کشمش زبيب green golden afghani black round seedless',
  khubani: 'khubani khobani apricot apricots خوبانی مشمش afghani dried hunza sweet seedless khobani',
  'pine-nuts': 'chilgoza chalgoza chalghoza pine nuts pine nut چلغوزہ صنوبر roasted in shell jumbo afghani',
  'afghan-figs': 'anjeer anjir fig figs انجیر تين afghani open mouth jumbo string dry fig',
  'fox-nuts': 'makhana phool makhana fox nuts lotus seeds پھول مکھانہ بذور اللوتس roasted salted healthy snack',
  'gond-katira': 'gond katira gum tragacanth گوند کتیرا صمغ کثیرا panjeeri cooling gum',
  'edible-gond': 'edible gond dink babool panjeeri gum گوند',
  'org-saffron': 'zafran kesar saffron saffron threads زعفران نگین mongra super negin',
  'flax-seeds': 'flax seeds alsi alsii السی بذور الكتان',
  chia_seeds: 'chia seeds chia seed tukhm e sharbati تخم شربتی بذور الشيا',
  'sunflower-seeds': 'sunflower seeds surajmukhi سورج مکھی بذور دوار الشمس',
  pumpkin_seeds: 'pumpkin seeds kaddu ke beej کدو کے بیج بذور القرع',
  'bid-box-luxury-tin': 'tin box dabba gold tin metallic bid box wedding favor shadi box nikkah favor keepsake',
  'bid-box-umrah-tabarruk': 'tabarruk umrah hajj potli pouch velvet batwa sacred gift hadiya makkah madinah ziarat',
  'bid-box-acrylic-royal': 'acrylic favor box clear royal dome wedding favor nikkah favors',
  'bid-box-birth-announcement': 'baby announcement box aqeeqah favor baby boy baby girl newborn favor',
  'bid-box-jute-pouch': 'jute pouch potli batwa drawstring favor nikah potli',
  'bid-box-pyramid-favor': 'pyramid favor box gift box favor wedding favor',
  'bid-box-card-nikkah': 'nikkah card bid box favor envelope invitation',
  'bid-box-sweet-nikkah': 'sweet nikkah box favor box mithai dabba',
};

export function productSearchScore(product: Product, query: string): number {
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  if (!terms.length) return 1;

  const passportTerms = [
    product.passport?.variety,
    product.passport?.harvestSeason,
    product.passport?.roastLevel,
    product.passport?.processingMethod,
    ...(product.passport?.ingredients || []),
    ...(product.passport?.allergens || []),
    ...(product.passport?.certifications || []),
  ].filter(Boolean).join(' ');

  const names = normalizeSearch([
    product.name_en,
    product.name_ur,
    product.name_ar,
    product.name,
    product.id,
    product.passport?.variety || '',
    CATALOG_ALIASES[product.id] || '',
  ].filter(Boolean).join(' '));

  const details = normalizeSearch([
    product.category,
    product.category_en,
    product.category_ur,
    product.category_ar,
    product.desc_en,
    product.desc_ur,
    product.desc_ar,
    product.origin_en,
    product.origin_ur,
    product.origin_ar,
    product.tasteProfile_en,
    product.tasteProfile_ur,
    product.tasteProfile_ar,
    passportTerms,
    ...(product.keywords || []),
    ...(product.occasions || []),
    ...(product.collections || []),
    ...Object.keys(product.prices || {}).filter(label => Number.isFinite(product.prices[label]) && product.prices[label] > 0),
  ].filter(Boolean).join(' '));

  if (!terms.every(term => names.includes(term) || details.includes(term))) return 0;
  return terms.reduce((score, term) => score + (names.split(' ').includes(term) ? 5 : names.includes(term) ? 3 : 1), 0);
}

export function searchCatalog(products: Product[], query: string): Product[] {
  return products
    .filter(product => product.active !== false)
    .map(product => ({ product, score: productSearchScore(product, query) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(result => result.product);
}

export function startingPrice(product: Product): number {
  if (product.quoteOnly) return Number.POSITIVE_INFINITY;
  const prices = Object.values(product.prices || {}).filter(price => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : product.price || 0;
}

export function readCatalogFilters(params: URLSearchParams) {
  const price = Number(params.get('budget'));
  return {
    query: params.get('search') || '',
    sort: CATALOG_SORTS.includes(params.get('sort') as CatalogSort) ? (params.get('sort') as CatalogSort) : ('featured' as CatalogSort),
    budget: params.has('budget') && Number.isFinite(price) ? Math.max(300, Math.min(10000, price)) : 10000,
    origin: params.get('origin') || 'all',
    special: params.get('special') === '1',
    saved: params.get('saved') === '1',
  };
}

export function sortProducts(products: Product[], sort: CatalogSort): Product[] {
  const list = [...products];
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => {
        const pa = Math.min(...Object.values(a.prices || { 0: Infinity }));
        const pb = Math.min(...Object.values(b.prices || { 0: Infinity }));
        return pa - pb;
      });
    case 'price-desc':
      return list.sort((a, b) => {
        const pa = Math.max(...Object.values(a.prices || { 0: 0 }));
        const pb = Math.max(...Object.values(b.prices || { 0: 0 }));
        return pb - pa;
      });
    case 'name-asc':
      return list.sort((a, b) => a.name_en.localeCompare(b.name_en));
    case 'featured':
    default:
      return list;
  }
}
