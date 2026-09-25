export interface HamperConfiguration {
  boxId: string;
  selectionIds: string[];
  recipientName?: string;
  note?: string;
}

export interface HamperBox { id: string; name: string; subtitle: string; price: number; minSelections: number; maxSelections: number; capacity: string; image: string; badge?: string; }

export const BOX_OPTIONS: HamperBox[] = [
  { id: 'box-wood', name: 'Sheesham Artisan Wooden Chest', subtitle: 'Hand-carved brass latches & polished natural timber grain', price: 1800, minSelections: 4, maxSelections: 6, capacity: 'Fits 4 to 6 Gourmet Selections', image: '/images/generated/hamper-sheesham-chest-v1.webp', badge: 'Patron Favorite' },
  { id: 'box-velvet', name: 'Royal Emerald Velvet Coffer', subtitle: 'Plush velvet casing embossed with Champagne Gold foil seal', price: 1400, minSelections: 3, maxSelections: 5, capacity: 'Fits 3 to 5 Gourmet Selections', image: '/images/generated/hamper-emerald-coffer-v1.webp', badge: 'Luxury Edition' },
  { id: 'box-tin', name: 'Heritage Gold Keepsake Tin', subtitle: 'Airtight metallic container with commemorative floral filigree', price: 950, minSelections: 3, maxSelections: 4, capacity: 'Fits 3 to 4 Gourmet Selections', image: '/images/generated/hamper-gold-tin-v1.webp' },
];

export const DRY_FRUIT_CANDIDATES = [
  { id: 'prod-pista', name: 'Roasted Kerman Pistachios', pricePer200g: 950, origin: 'Kerman' },
  { id: 'prod-kaju', name: 'Jumbo Roasted Cashews', pricePer200g: 880, origin: 'Mangalore' },
  { id: 'prod-badam', name: 'California Nonpareil Almonds', pricePer200g: 750, origin: 'Central Valley' },
  { id: 'prod-walnut', name: 'Wild Skardu Walnut Halves', pricePer200g: 650, origin: 'Gilgit-Baltistan' },
  { id: 'prod-chilgoza', name: 'Royal Waziristan Chilgoza', pricePer200g: 2200, origin: 'South Waziristan' },
  { id: 'prod-apricot', name: 'Sun-Dried Sweet Hunza Apricots', pricePer200g: 450, origin: 'Hunza Valley' },
  { id: 'prod-figs', name: 'Turkish Golden Injeer (Figs)', pricePer200g: 780, origin: 'Aydin' },
  { id: 'prod-kishmish', name: 'Afghan Green Kandahari Raisins', pricePer200g: 420, origin: 'Kandahar' },
] as const;
