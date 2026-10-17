export interface CategoryMeta {
  id: string;
  name: string;
  shortName: string;
  description: string;
  bannerTitle: string;
  badge?: string;
  provenance: string;
}

export const FOOD_CATEGORIES: Record<string, CategoryMeta> = {
  'dry-fruits': {
    id: 'dry-fruits',
    name: 'Dry Fruits & Nuts',
    shortName: 'Dry Fruits & Nuts',
    description: 'Freshly harvested, unbleached whole nuts and naturally sun-cured dried fruits selected from premier orchards in Balochistan, Hunza, and globally.',
    bannerTitle: 'Hand-Selected Mountain Harvest Dry Fruits & Nuts',
    provenance: 'Balochistan, Hunza & Global Certified Farms',
  },
  dates: {
    id: 'dates',
    name: 'Dates',
    shortName: 'Dates',
    description: 'Luscious, hand-sorted dates from prime harvests including Balochistan Panjgur Amber, Irani Muzafati, and Sindh Aseel.',
    bannerTitle: 'Premium Harvest Dates — تازہ کھجوریں',
    provenance: 'Panjgur, Khairpur & Irani Date Orchards',
  },
  'seeds-snacks': {
    id: 'seeds-snacks',
    name: 'Seeds & Snacks',
    shortName: 'Seeds & Snacks',
    description: 'Nutrient-dense seeds and premium wood-roasted snacks for tea-time and daily wellness.',
    bannerTitle: 'Heritage Snacks & Superfood Seeds',
    provenance: 'Traditional Lahori Roasteries & Global Farms',
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
  'herbs-spices': {
    id: 'herbs-spices',
    name: 'Herbs & Spices',
    shortName: 'Herbs & Spices',
    description: 'Explore whole spices, traditional herbs and carefully selected pantry ingredients in the portions you need.',
    bannerTitle: 'The AllBarka Herbs & Spices Collection',
    provenance: 'Selected Pantry Ingredients',
  },
};

export const COMMERCIAL_COLLECTIONS: Record<string, CategoryMeta> = {
  combos: {
    id: 'combos',
    name: 'Gifts & Hampers',
    shortName: 'Gifts & Hampers',
    description: 'Curated assortments in luxury bespoke boxes, perfect for family festivities, weddings, and executive gifting.',
    bannerTitle: 'Signature AllBarka Gift Curations',
    badge: 'Artisanal',
    provenance: 'Hand-Curated in Lahore',
  },
  'celebration-boxes': {
    id: 'celebration-boxes',
    name: 'Celebration Boxes',
    shortName: 'Celebration Boxes',
    description: 'Bespoke bid boxes, favor boxes, and wedding gifting sets available empty or filled.',
    bannerTitle: 'Bespoke Celebration Packaging & Bid Boxes',
    badge: 'Custom',
    provenance: 'Hand-Crafted Packaging',
  },
  deals: {
    id: 'deals',
    name: 'Deals',
    shortName: 'Deals',
    description: 'Exclusive value packages, seasonal combinations, and curated dry fruit deals.',
    bannerTitle: 'AllBarka Value Packages & Special Deals',
    badge: 'Special',
    provenance: 'Curated by AllBarka',
  },
  'personalized-treats': {
    id: 'personalized-treats',
    name: 'Personalized Treats & Wrappers',
    shortName: 'Personalized Treats',
    description: 'Event sleeves, custom-printed candy pouches, date packs, and custom favors.',
    bannerTitle: 'Custom Event Favors & Personalized Wrappers',
    badge: 'Personalized',
    provenance: 'Customized in Lahore',
  },
};

export const OCCASION_TAGS = [
  { id: 'wedding', name: 'Nikkah & Baat Pakki', tag: 'Nikkah / Wedding' },
  { id: 'umrah', name: 'Umrah & Hajj Tabarruk', tag: 'Umrah / Hajj' },
  { id: 'ramadan', name: 'Ramadan & Eid', tag: 'Ramadan / Eid' },
  { id: 'birth', name: 'Birth Announcement & Aqeeqah', tag: 'Birth / Aqeeqah' },
  { id: 'corporate', name: 'Corporate & Executive Gifting', tag: 'Corporate' },
] as const;

export const CANONICAL_CATEGORIES: Record<string, CategoryMeta> = {
  nuts: {
    id: 'nuts',
    name: 'Dry Fruits & Nuts',
    shortName: 'Dry Fruits & Nuts',
    description: 'Freshly harvested, unbleached whole nuts and naturally sun-cured dried fruits selected from premier orchards in Balochistan, Hunza, and globally.',
    bannerTitle: 'Hand-Selected Mountain Harvest Dry Fruits & Nuts',
    provenance: 'Balochistan, Hunza & Global Certified Farms',
  },
  'dry-fruits': FOOD_CATEGORIES['dry-fruits'],
  dates: FOOD_CATEGORIES['dates'],
  'seeds-snacks': FOOD_CATEGORIES['seeds-snacks'],
  oils: FOOD_CATEGORIES['oils'],
  essentials: FOOD_CATEGORIES['essentials'],
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
  'herbs-spices': FOOD_CATEGORIES['herbs-spices'],
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
  'bid-boxes': 'gift-boxes',
  'favor-boxes': 'gift-boxes',
  favors: 'gift-boxes',
  'celebration-boxes': 'gift-boxes',
  'celebration-box': 'gift-boxes',
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
