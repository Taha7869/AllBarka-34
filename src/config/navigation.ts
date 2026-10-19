/**
 * Shared authoritative navigation data for desktop and mobile headers.
 * Stage 4 Navigation & Dropdown Redesign.
 */

export interface NavSubItem {
  id: string;
  labelKey: string;
  defaultLabel: string;
  path: string;
  badge?: string;
  action?: 'open-hamper-builder' | 'open-custom-quote';
}

export interface NavItem {
  id: string;
  labelKey: string;
  defaultLabel: string;
  path: string;
  hasDropdown: boolean;
  dropdownItems?: NavSubItem[];
}

export interface FoodCategoryItem {
  id: string;
  labelKey: string;
  defaultLabel: string;
  path: string;
  slug: string;
}

/**
 * Main Level Navigation:
 * Shop | Gifts & Hampers | Celebration Boxes | Occasions | Deals
 */
export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    id: 'shop',
    labelKey: 'nav.shop',
    defaultLabel: 'Shop',
    path: '/shop',
    hasDropdown: true,
    dropdownItems: [
      { id: 'all-products', labelKey: 'nav.allProducts', defaultLabel: 'All Products', path: '/shop' },
      { id: 'dry-fruits-nuts', labelKey: 'nav.dryFruits', defaultLabel: 'Dry Fruits & Nuts', path: '/shop/dry-fruits' },
      { id: 'dates', labelKey: 'nav.dates', defaultLabel: 'Dates', path: '/shop/dates' },
      { id: 'seeds-snacks', labelKey: 'nav.seedsSnacks', defaultLabel: 'Seeds & Snacks', path: '/shop/seeds-snacks' },
      { id: 'cold-pressed-oils', labelKey: 'nav.oils', defaultLabel: 'Oils', path: '/shop/oils' },
      { id: 'desi-essentials', labelKey: 'nav.essentials', defaultLabel: 'Desi Essentials', path: '/shop/essentials' },
      { id: 'herbs-spices', labelKey: 'nav.herbsSpices', defaultLabel: 'Herbs & Spices', path: '/shop/herbs-spices' },
      { id: 'gifting', labelKey: 'nav.gifting', defaultLabel: 'Gifts & Hampers', path: '/gifting' },
    ],
  },
  {
    id: 'gifting',
    labelKey: 'nav.gifting',
    defaultLabel: 'Gifts & Hampers',
    path: '/gifting',
    hasDropdown: true,
    dropdownItems: [
      { id: 'custom-hamper', labelKey: 'nav.customHamperBuilder', defaultLabel: 'Custom Hamper Builder', path: '/gifting#builder', badge: 'Bespoke', action: 'open-hamper-builder' },
      { id: 'all-gifts', labelKey: 'nav.allGifts', defaultLabel: 'All Gifts & Hampers', path: '/gifting' },
      { id: 'combos', labelKey: 'nav.signatureCombos', defaultLabel: 'Signature Luxury Combos', path: '/shop/combos' },
      { id: 'corporate-bulk', labelKey: 'nav.corporateGifting', defaultLabel: 'Corporate & Bulk Gifting', path: '/wholesale' },
    ],
  },
  {
    id: 'celebration-boxes',
    labelKey: 'nav.celebrationBoxes',
    defaultLabel: 'Celebration Boxes',
    path: '/shop/celebration-boxes',
    hasDropdown: true,
    dropdownItems: [
      { id: 'all-celebration', labelKey: 'nav.allCelebrationBoxes', defaultLabel: 'All Celebration Boxes', path: '/shop/celebration-boxes' },
      { id: 'nikkah-wedding', labelKey: 'nav.nikkahWedding', defaultLabel: 'Nikkah & Wedding Favors', path: '/shop/celebration-boxes?occasion=wedding' },
      { id: 'umrah-hajj', labelKey: 'nav.umrahHajj', defaultLabel: 'Umrah & Hajj Tabarruk', path: '/shop/celebration-boxes?occasion=umrah' },
      { id: 'baby-announcement', labelKey: 'nav.babyAnnouncement', defaultLabel: 'Baby Announcement Favors', path: '/shop/celebration-boxes?occasion=birth' },
      { id: 'custom-quote-boxes', labelKey: 'nav.customPackaging', defaultLabel: 'Custom Packaging & Inquiries', path: '/shop/celebration-boxes#custom', action: 'open-custom-quote' },
    ],
  },
  {
    id: 'occasions',
    labelKey: 'nav.occasions',
    defaultLabel: 'Occasions',
    path: '/shop?filter=occasions',
    hasDropdown: true,
    dropdownItems: [
      { id: 'occ-wedding', labelKey: 'nav.nikkahWedding', defaultLabel: 'Nikkah & Wedding', path: '/shop?occasion=wedding' },
      { id: 'occ-umrah', labelKey: 'nav.umrahHajj', defaultLabel: 'Umrah & Hajj Tabarruk', path: '/shop?occasion=umrah' },
      { id: 'occ-ramadan', labelKey: 'nav.ramadanEid', defaultLabel: 'Ramadan & Eid', path: '/shop?occasion=ramadan' },
      { id: 'occ-birth', labelKey: 'nav.babyAnnouncement', defaultLabel: 'Birth Announcement & Aqeeqah', path: '/shop?occasion=birth' },
      { id: 'occ-corporate', labelKey: 'nav.corporateOccasion', defaultLabel: 'Corporate Celebrations', path: '/wholesale' },
    ],
  },
  {
    id: 'deals',
    labelKey: 'nav.deals',
    defaultLabel: 'Deals',
    path: '/shop/deals',
    hasDropdown: true,
    dropdownItems: [
      { id: 'value-deals', labelKey: 'nav.valueDeals', defaultLabel: 'Value Deals & Packages', path: '/shop/deals' },
      { id: 'curated-bundles', labelKey: 'nav.curatedBundles', defaultLabel: 'Curated Bundles', path: '/shop/bundles' },
      { id: 'wholesale-tiers', labelKey: 'nav.wholesaleTiers', defaultLabel: 'Wholesale & Bulk Tiers', path: '/wholesale' },
    ],
  },
];

/**
 * Compact Food Row Navigation:
 * Dry Fruits & Nuts | Dates | Seeds & Snacks | Oils | Desi Essentials | Herbs & Spices
 */
export const COMPACT_FOOD_NAV_ITEMS: FoodCategoryItem[] = [
  { id: 'dry-fruits', labelKey: 'nav.dryFruits', defaultLabel: 'Dry Fruits & Nuts', path: '/shop/dry-fruits', slug: 'dry-fruits' },
  { id: 'dates', labelKey: 'nav.dates', defaultLabel: 'Dates', path: '/shop/dates', slug: 'dates' },
  { id: 'seeds-snacks', labelKey: 'nav.seedsSnacks', defaultLabel: 'Seeds & Snacks', path: '/shop/seeds-snacks', slug: 'seeds-snacks' },
  { id: 'oils', labelKey: 'nav.oils', defaultLabel: 'Oils', path: '/shop/oils', slug: 'oils' },
  { id: 'essentials', labelKey: 'nav.essentials', defaultLabel: 'Desi Essentials', path: '/shop/essentials', slug: 'essentials' },
  { id: 'herbs-spices', labelKey: 'nav.herbsSpices', defaultLabel: 'Herbs & Spices', path: '/shop/herbs-spices', slug: 'herbs-spices' },
];
