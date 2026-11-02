import type { Product } from '../types';

export const CATALOG_SORTS = ['featured', 'price-asc', 'price-desc', 'name-asc'] as const;
export type CatalogSort = typeof CATALOG_SORTS[number];

export function normalizeSearch(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export const CATALOG_ALIASES: Record<string, string> = {
  pista: 'pistachio pistachios pistachiyo pista pesteh پستہ فستق akbari fandoghi ahmad aghaei salted roasted raw green nut',
  badam: 'badam badaam almond almonds badamain بادام لوز mamra irani mamra kaghzi american sweet almond nuts',
  kaju: 'kaju kaaju cashew cashews caju کاجو كاجو roasted salted raw w240 w320 whole splits whole nuts',
  akhroot: 'akhrot akhroot walnut walnuts akrot اخروٹ جوز kagzi kaghzi giri extra light halves pieces brain food',
  khajoor: 'khajur khajoor dates dates کھجور تمر ajwa medjool mabroom amber sukkari kalmi rabia khadrawi madina dates',
  kishmish: 'kishmish kismis raisins sultanas کشمش زبيب sundekhani green golden afghani black round seedless',
  khubani: 'khubani khobani apricot apricots خوبانی مشمش afghani dried hunza sweet seedless khobani',
  'pine-nuts': 'chilgoza chalgoza chalghoza pine nuts pine nut چلغوزہ صنوبر roasted in shell jumbo afghani',
  chilgoza: 'chilgoza chalgoza chalghoza pine nuts pine nut چلغوزہ صنوبر roasted in shell jumbo afghani',
  'afghan-figs': 'anjeer anjir fig figs انجیر تين afghani open mouth jumbo string dry fig',
  anjeer: 'anjeer anjir fig figs انجیر تين afghani open mouth jumbo string dry fig',
  makhana: 'makhana phool makhana fox nuts lotus seeds پھول مکھانہ بذور اللوتس roasted salted healthy snack',
  chironji: 'chironji charoli charonji چرونجی حب السمنة',
  gond: 'gond gond katira gum tragacanth گوند کتیرا صمغ کثیرا panjeeri cooling gum',
  zafran: 'zafran kesar saffron saffron threads زعفران نگین super negin kashmiri irani mongra',
  'aloe-vera': 'aloe vera kawar gandal کوار گندل صبر حقيقي',
  'flax-seeds': 'flax seeds alsi alsii السی بذور الكتان',
  'chia-seeds': 'chia seeds tukhm-e-sharbati تخم شربتی بذور الشيا',
  'sunflower-seeds': 'sunflower seeds surajmukhi سورج مکھی بذور دوار الشمس',
  'pumpkin-seeds': 'pumpkin seeds kaddu ke beej کدو کے بیج بذور القرع',
  'bid-box-luxury-tin': 'tin box dabba gold tin metallic bid box wedding favor shadi box nikkah favor keepsake keepsake dabba',
  'bid-box-umrah-tabarruk': 'tabarruk umrah hajj potli pouch velvet batwa sacred gift hadiya makkah madinah ziarat',
  'bid-box-velvet-chest': 'velvet chest dabba sandooq bari gift wedding favor luxury velvet royal box mahr favor',
  'bid-box-acrylic-chest': 'acrylic box clear transparent chest trousseau nikah favors shadi bari favors glass chest',
  'bid-box-mughal-four-compartment': 'mughal box four compartment barat bid box sweet box shadi box family gift royal box',
  'bid-box-baby-celebration': 'baby announcement box aqeeqah favor baby boy baby girl newborn favor chocolates panjeeri',
  'bid-box-jamawar-potli': 'potli pouch jamawar batwa jute pouch drawstring favor nikah potli batwa favor',
  'bid-box-hexagonal-wooden-chest': 'wooden chest hexagonal lakri dabba handcrafted keepsake shadi box wooden box',
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
    CATALOG_ALIASES[product.id] || '',
    product.id,
    product.passport?.variety || '',
  ].join(' '));

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
  ].join(' '));

  if (!terms.every(term => names.includes(term) || details.includes(term))) return 0;
  return terms.reduce((score, term) => score + (names.split(' ').includes(term) ? 5 : names.includes(term) ? 3 : 1), 0);
}

export function searchCatalog(products: Product[], query: string): Product[] {
  return products.filter(product => product.active !== false).map(product => ({ product, score: productSearchScore(product, query) }))
    .filter(result => result.score > 0).sort((a, b) => b.score - a.score).map(result => result.product);
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
    sort: CATALOG_SORTS.includes(params.get('sort') as CatalogSort) ? params.get('sort') as CatalogSort : 'featured' as CatalogSort,
    budget: params.has('budget') && Number.isFinite(price) ? Math.max(300, Math.min(10000, price)) : 10000,
    origin: params.get('origin') || 'all',
    special: params.get('special') === '1',
    saved: params.get('saved') === '1',
  };
}
