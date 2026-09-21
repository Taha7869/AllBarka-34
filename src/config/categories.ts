export interface CategoryMeta {
  id: string;
  name: string;
  shortName: string;
  description: string;
  bannerTitle: string;
  badge?: string;
  provenance: string;
}

export const CANONICAL_CATEGORIES: Record<string, CategoryMeta> = {
  nuts: {
    id: 'nuts',
    name: 'Dry Fruits & Nuts',
    shortName: 'Dry Fruits & Nuts',
    description: 'Freshly harvested, unbleached whole nuts and naturally sun-cured dried fruits selected from premier orchards in Balochistan, Hunza, and globally.',
    bannerTitle: 'Hand-Selected Mountain Harvest Dry Fruits & Nuts',
    provenance: 'Balochistan, Hunza & Global Certified Farms',
  },
  oils: {
    id: 'oils',
    name: 'Oils',
    shortName: 'Oils',
    description: 'Single-press cold-extracted oils preserving maximum nutrients, antioxidants, and natural aroma — for cooking, hair, and skin wellness.',
    bannerTitle: 'Pure Cold-Pressed Oils — First Extraction, Zero Heat',
    provenance: 'Certified Organic Cold-Press Facilities',
  },
  essentials: {
    id: 'essentials',
    name: 'Desi Essentials',
    shortName: 'Desi Essentials',
    description: 'Authentic staples of the Pakistani table — traditional desi ghee, raw honey, panjeeri, premium saffron, and unrefined desi shakkar.',
    bannerTitle: 'Pure Desi Organics — خالص دیسی پیداوار',
    provenance: 'Heritage Dairies, Wild Apiaries & Spice Orchards',
  },
  'snacks-seeds': {
    id: 'snacks-seeds',
    name: 'Snacks & Seeds',
    shortName: 'Snacks & Seeds',
    description: 'Nutrient-dense seeds and premium wood-roasted snacks for tea-time and daily wellness.',
    bannerTitle: 'Heritage Snacks & Superfood Seeds',
    provenance: 'Traditional Lahori Roasteries & Global Farms',
  },
  'gift-boxes': {
    id: 'gift-boxes',
    name: 'Gift Boxes',
    shortName: 'Gift Boxes',
    description: 'Curated assortments in luxury bespoke boxes, perfect for family festivities, weddings, and executive gifting.',
    bannerTitle: 'Signature AllBarka Gift Curations',
    badge: 'Artisanal',
    provenance: 'Hand-Curated in Lahore',
  },
  deals: {
    id: 'deals',
    name: 'Deals',
    shortName: 'Deals',
    description: 'Value-packed curated combos of our best-selling nuts and dried fruits.',
    bannerTitle: 'Exclusive Value Assortments & Combos',
    provenance: 'Curated in Lahore',
  },
};

export const CATEGORY_ALIASES: Record<string, string> = {
  fruits: 'nuts',
  'dry-fruits': 'nuts',
  organics: 'essentials',
  desi: 'essentials',
  ghee: 'essentials',
  honey: 'essentials',
  saffron: 'essentials',
  snacks: 'snacks-seeds',
  seeds: 'snacks-seeds',
  berries: 'snacks-seeds',
  nimko: 'snacks-seeds',
  combos: 'deals',
  gifting: 'gift-boxes',
  gifts: 'gift-boxes',
  oil: 'oils',
  'cold-pressed': 'oils',
  tail: 'oils',
};

/**
 * Resolves a category slug to a canonical category ID or null if not valid.
 */
export function resolveCategorySlug(slug?: string | null): string | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  if (normalized === 'all') return 'all';
  if (CANONICAL_CATEGORIES[normalized]) return normalized;
  if (CATEGORY_ALIASES[normalized]) return CATEGORY_ALIASES[normalized];
  return null;
}

/**
 * Returns canonical meta or fallback for 'all'.
 */
export function getCategoryMeta(categoryId: string): CategoryMeta {
  if (categoryId === 'all') {
    return {
      id: 'all',
      name: 'All Boutique Products',
      shortName: 'All Items',
      description: 'Explore the complete AllBarka collection of unbleached nuts, sun-dried fruits, and curated gift boxes.',
      bannerTitle: 'The Complete AllBarka Boutique Collection',
      provenance: 'Orchards of Pakistan & Global Origins',
    };
  }
  return CANONICAL_CATEGORIES[categoryId] || {
    id: categoryId,
    name: 'Curated Selections',
    shortName: 'Curated',
    description: 'Explore our hand-sorted boutique collection.',
    bannerTitle: 'AllBarka Boutique Selections',
    provenance: 'Orchard Sourced',
  };
}
