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
    name: 'Royal Dry Fruits & Nuts',
    shortName: 'Nuts & Kernels',
    description: 'Freshly harvested, unbleached whole nuts selected from premier orchards in Balochistan, Hunza, and Chile.',
    bannerTitle: 'Hand-Selected Mountain Harvest Nuts & Kernels',
    provenance: 'Balochistan, Hunza & Chile',
  },
  'dried-fruits': {
    id: 'dried-fruits',
    name: 'Sun-Dried Fruits',
    shortName: 'Dried Fruits',
    description: 'Naturally sweet, sun-cured figs and dried fruits with zero artificial preservatives or sulfur dioxide.',
    bannerTitle: 'Naturally Cured Whole Sun-Dried Fruits',
    provenance: 'Kandahar, Gilgit & Herat',
  },
  seeds: {
    id: 'seeds',
    name: 'Superfood Seeds',
    shortName: 'Seeds',
    description: 'Nutrient-dense raw and roasted seeds packed with omega-3s, plant proteins, and essential trace minerals.',
    bannerTitle: 'Pure Unadulterated Superfood Seeds',
    provenance: 'Local & Global Certified Farms',
  },
  combos: {
    id: 'combos',
    name: 'Gift Boxes & Deals',
    shortName: 'Gift Boxes',
    description: 'Curated assortments in luxury bespoke boxes, perfect for family festivities, weddings, and executive gifting.',
    bannerTitle: 'Signature AllBarka Gift Curations & Value Assortments',
    badge: 'Artisanal',
    provenance: 'Hand-Curated in Lahore',
  },
  snacks: {
    id: 'snacks',
    name: 'Traditional Savories',
    shortName: 'Savories & Nimko',
    description: 'Crunchy roasted split chickpeas, savory dry fruit mixes, and traditional Lahori tea-time accompaniments.',
    bannerTitle: 'Wood-Roasted Chickpeas & Heritage Savories',
    provenance: 'Traditional Lahori Roasteries',
  },
};

export const CATEGORY_ALIASES: Record<string, string> = {
  fruits: 'dried-fruits',
  'dry-fruits': 'nuts',
  berries: 'seeds',
  gifting: 'combos',
  deals: 'combos',
  gifts: 'combos',
  savories: 'snacks',
  nimko: 'snacks',
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
