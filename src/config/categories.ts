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
    bannerTitle: 'Cold-Pressed Oils — Single First Extraction',
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
  'herbs-spices': {
    id: 'herbs-spices',
    name: 'Herbs & Spices',
    shortName: 'Herbs & Spices',
    description: 'Explore whole spices, traditional herbs and carefully selected pantry ingredients in the portions you need.',
    bannerTitle: 'The AllBarka Herbs & Spices Collection',
    provenance: 'Selected Pantry Ingredients',
  },
  bundles: {
    id: 'bundles',
    name: 'Bundles',
    shortName: 'Bundles',
    description: 'Thoughtful pairings and fixed-price collections for everyday favourites, celebrations and gifting.',
    bannerTitle: 'AllBarka Bundles & Gift Collections',
    badge: 'Bundle',
    provenance: 'Curated by AllBarka',
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
  combos: 'gift-boxes',
  deals: 'gift-boxes',
  gifting: 'gift-boxes',
  gifts: 'gift-boxes',
  oil: 'oils',
  'cold-pressed': 'oils',
  tail: 'oils',
  herbs: 'herbs-spices',
  spices: 'herbs-spices',
  'herbs-and-spices': 'herbs-spices',
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
