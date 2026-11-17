import type { Product } from '../types';
import { PRODUCTS } from '../data/products';
import { ValidationError } from './validationError';

export type AddonPricingMode = 'fixed' | 'per_item';

export interface AddonDefinition {
  id: string;
  name_en: string;
  name_ur: string;
  name_ar: string;
  description_en?: string;
  description_ur?: string;
  description_ar?: string;
  price: number;
  pricingMode: AddonPricingMode;
  /** Optional product-specific price overrides (productId -> PKR integer >= 0). */
  productPriceOverrides?: Record<string, number>;
  /** Empty array means applies to all categories. */
  categories: string[];
  /** Empty array means applies to all products. */
  productIds: string[];
  /** Empty array means applies to all occasions (e.g. 'gift', 'eid', 'nikah'). */
  occasions: string[];
  minOrderValue: number;
  maxOrderValue: number | null;
  active: boolean;
  sortOrder?: number;
}

export interface AddonsCatalogDocument {
  revision: number;
  addons: AddonDefinition[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface ValidatedOrderAddon {
  id: string;
  name_en: string;
  name_ur: string;
  name_ar: string;
  pricingMode: AddonPricingMode;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface MatchedCartAddon {
  addon: AddonDefinition;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  relevanceScore: number;
}

export interface AddonCartItemInput {
  productId?: string;
  id?: string;
  quantity: number;
  category?: string;
}

export interface AddonOccasionContext {
  isGift?: boolean;
  giftCardStyle?: string;
  occasions?: string[];
}

export const MAX_VISIBLE_ADDONS = 4;

/**
 * 5 starter add-ons seeded as inactive drafts (price: 0, active: false).
 * The owner sets prices and activates them in the Admin Add-ons panel when ready.
 */
export const STARTER_ADDONS: AddonDefinition[] = [
  {
    id: 'printed-card',
    name_en: 'Printed Message Card',
    name_ur: 'پرنٹڈ پیغام کارڈ',
    name_ar: 'بطاقة رسالة مطبوعة',
    description_en: 'Custom printed greeting card with your personal message inside the parcel.',
    description_ur: 'پارسل کے اندر آپ کے ذاتی پیغام کے ساتھ خوبصورت پرنٹڈ کارڈ۔',
    description_ar: 'بطاقة تهنئة مطبوعة برسالتك الخاصة داخل الطرد.',
    price: 0,
    pricingMode: 'fixed',
    productPriceOverrides: {},
    categories: [],
    productIds: [],
    occasions: ['gift', 'eid', 'nikah'],
    minOrderValue: 0,
    maxOrderValue: null,
    active: false,
    sortOrder: 1,
  },
  {
    id: 'eidi-lifafa',
    name_en: 'Eidi Lifafa (Envelope)',
    name_ur: 'عیدی لفافہ',
    name_ar: 'ظرف عيدي فاخر',
    description_en: 'Foil-stamped festive Eidi envelope for Eid and family celebrations.',
    description_ur: 'عید اور خوشی کے مواقع کے لیے سنہری نقش والا عیدی لفافہ۔',
    description_ar: 'ظرف عيدي فاخر مختوم بالذهب لمناسبات العيد والعائلة.',
    price: 0,
    pricingMode: 'per_item',
    productPriceOverrides: {},
    categories: [],
    productIds: [],
    occasions: ['eid', 'gift', 'nikah'],
    minOrderValue: 0,
    maxOrderValue: null,
    active: false,
    sortOrder: 2,
  },
  {
    id: 'naam-sleeve',
    name_en: 'Custom Name Sleeve',
    name_ur: 'نام والی سلیو',
    name_ar: 'غلاف باسم مخصص',
    description_en: 'Personalized outer sleeve printed with the family or recipient name.',
    description_ur: 'خاندان یا وصول کنندہ کے نام کے ساتھ مخصوص پرنٹڈ سلیو۔',
    description_ar: 'غلاف خارجي مطبوع باسم العائلة أو المستلم.',
    price: 0,
    pricingMode: 'per_item',
    productPriceOverrides: {},
    categories: ['Gift Boxes', 'Celebration Bundles', 'Packaging'],
    productIds: [],
    occasions: ['gift', 'nikah', 'eid'],
    minOrderValue: 0,
    maxOrderValue: null,
    active: false,
    sortOrder: 3,
  },
  {
    id: 'glass-jar-upgrade',
    name_en: 'Glass Jar Upgrade',
    name_ur: 'شیشے کے جار میں اپ گریڈ',
    name_ar: 'ترقية إلى برطمان زجاجي',
    description_en: 'Upgrade pouch portions into reusable airtight glass jars.',
    description_ur: 'پاؤچ کی جگہ ایئر ٹائٹ شیشے کے جار میں پیکنگ۔',
    description_ar: 'ترقية التعبئة إلى برطمانات زجاجية محكمة الإغلاق.',
    price: 0,
    pricingMode: 'per_item',
    productPriceOverrides: {},
    categories: ['Nuts', 'Dry Fruits', 'Dates', 'Seeds'],
    productIds: [],
    occasions: [],
    minOrderValue: 0,
    maxOrderValue: null,
    active: false,
    sortOrder: 4,
  },
  {
    id: 'wooden-tray',
    name_en: 'Handcrafted Wooden Tray',
    name_ur: 'لکڑی کی ٹرے',
    name_ar: 'صينية خشبية فاخرة',
    description_en: 'Present your selection on a reusable handcrafted wooden serving tray.',
    description_ur: 'اپنی منتخب اشیا کو ہاتھ سے بنی لکڑی کی خوبصورت ٹرے میں پیش کریں۔',
    description_ar: 'قدّم مختاراتك على صينية خشبية مصنوعة يدوياً.',
    price: 0,
    pricingMode: 'fixed',
    productPriceOverrides: {},
    categories: [],
    productIds: [],
    occasions: ['gift', 'nikah', 'eid'],
    minOrderValue: 3000,
    maxOrderValue: null,
    active: false,
    sortOrder: 5,
  },
];

export const DEFAULT_ADDONS_CATALOG: AddonsCatalogDocument = {
  revision: 0,
  addons: STARTER_ADDONS,
};

const cleanStringList = (input: unknown, maxItems = 50, maxLen = 80): string[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().slice(0, maxLen);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
};

export function validateAddonDefinition(raw: unknown): AddonDefinition {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('Invalid add-on definition.', 'INVALID_ADDON_DEFINITION');
  }
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === 'string' ? item.id.trim().toLowerCase() : '';
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(id)) {
    throw new ValidationError(`Invalid add-on ID "${id}". Use lowercase letters, numbers, and hyphens.`, 'INVALID_ADDON_ID');
  }

  const name_en = typeof item.name_en === 'string' ? item.name_en.trim().slice(0, 120) : '';
  const name_ur = typeof item.name_ur === 'string' ? item.name_ur.trim().slice(0, 120) : '';
  const name_ar = typeof item.name_ar === 'string' ? item.name_ar.trim().slice(0, 120) : '';
  if (!name_en || !name_ur || !name_ar) {
    throw new ValidationError(`Add-on "${id}" requires names in English, Urdu, and Arabic.`, 'ADDON_NAME_REQUIRED');
  }

  const price = typeof item.price === 'number' ? Math.round(item.price) : Number(item.price ?? 0);
  if (!Number.isFinite(price) || price < 0 || price > 500000) {
    throw new ValidationError(`Add-on "${id}" has an invalid price.`, 'INVALID_ADDON_PRICE');
  }

  const pricingMode: AddonPricingMode = item.pricingMode === 'per_item' ? 'per_item' : 'fixed';

  const productPriceOverrides: Record<string, number> = {};
  if (item.productPriceOverrides && typeof item.productPriceOverrides === 'object' && !Array.isArray(item.productPriceOverrides)) {
    for (const [prodId, rawOverride] of Object.entries(item.productPriceOverrides as Record<string, unknown>)) {
      const cleanId = prodId.trim();
      const overrideVal = typeof rawOverride === 'number' ? Math.round(rawOverride) : Number(rawOverride);
      if (cleanId && Number.isFinite(overrideVal) && overrideVal >= 0 && overrideVal <= 500000) {
        productPriceOverrides[cleanId] = overrideVal;
      }
    }
  }

  const minOrderValue = typeof item.minOrderValue === 'number' ? Math.max(0, Math.round(item.minOrderValue)) : Math.max(0, Number(item.minOrderValue || 0) || 0);
  const maxRaw = item.maxOrderValue;
  const maxOrderValue = maxRaw === null || maxRaw === undefined || maxRaw === '' || Number(maxRaw) <= 0
    ? null
    : Math.round(Number(maxRaw));

  if (maxOrderValue !== null && (!Number.isFinite(maxOrderValue) || maxOrderValue < minOrderValue)) {
    throw new ValidationError(`Add-on "${id}" maxOrderValue must be greater than or equal to minOrderValue.`, 'INVALID_ADDON_ORDER_BOUNDS');
  }

  const active = item.active === true;
  if (active && price <= 0 && Object.values(productPriceOverrides).every(v => v <= 0)) {
    throw new ValidationError(`Add-on "${id}" cannot be activated with a price of 0. Set a positive PKR price first.`, 'ADDON_ACTIVE_REQUIRES_PRICE');
  }

  return {
    id,
    name_en,
    name_ur,
    name_ar,
    ...(typeof item.description_en === 'string' && item.description_en.trim() ? { description_en: item.description_en.trim().slice(0, 240) } : {}),
    ...(typeof item.description_ur === 'string' && item.description_ur.trim() ? { description_ur: item.description_ur.trim().slice(0, 240) } : {}),
    ...(typeof item.description_ar === 'string' && item.description_ar.trim() ? { description_ar: item.description_ar.trim().slice(0, 240) } : {}),
    price,
    pricingMode,
    productPriceOverrides,
    categories: cleanStringList(item.categories, 30, 80),
    productIds: cleanStringList(item.productIds, 100, 80),
    occasions: cleanStringList(item.occasions, 20, 40).map(o => o.toLowerCase()),
    minOrderValue,
    maxOrderValue,
    active,
    sortOrder: typeof item.sortOrder === 'number' && Number.isFinite(item.sortOrder) ? Math.round(item.sortOrder) : 99,
  };
}

export function validateAddonsCatalog(raw: unknown): AddonsCatalogDocument {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_ADDONS_CATALOG);
  }
  const doc = raw as Record<string, unknown>;
  const revision = typeof doc.revision === 'number' && Number.isSafeInteger(doc.revision) && doc.revision >= 0 ? doc.revision : 0;
  const rawList = Array.isArray(doc.addons) ? doc.addons : STARTER_ADDONS;
  if (rawList.length > 100) {
    throw new ValidationError('Maximum of 100 add-ons supported.', 'TOO_MANY_ADDONS');
  }
  const seen = new Set<string>();
  const addons: AddonDefinition[] = [];
  for (const entry of rawList) {
    const validated = validateAddonDefinition(entry);
    if (seen.has(validated.id)) {
      throw new ValidationError(`Duplicate add-on ID "${validated.id}".`, 'DUPLICATE_ADDON_ID');
    }
    seen.add(validated.id);
    addons.push(validated);
  }
  return {
    revision,
    addons,
    ...(typeof doc.updatedAt === 'string' ? { updatedAt: doc.updatedAt } : {}),
    ...(typeof doc.updatedBy === 'string' ? { updatedBy: doc.updatedBy } : {}),
  };
}

function canonicalProductId(item: AddonCartItemInput): string {
  const raw = String(item.productId || item.id || '').trim();
  return raw;
}

function resolveCartProduct(item: AddonCartItemInput, products: Product[]): Product | undefined {
  const pid = canonicalProductId(item);
  return products.find(p => p.id === pid) || products.find(p => pid.startsWith(`${p.id}-`));
}

function itemMatchesAddonProductOrCategory(
  addon: AddonDefinition,
  item: AddonCartItemInput,
  product: Product | undefined
): { matches: boolean; directProductMatch: boolean; categoryMatch: boolean } {
  const hasProductFilter = addon.productIds.length > 0;
  const hasCategoryFilter = addon.categories.length > 0;
  const pid = product?.id || canonicalProductId(item);
  const directProductMatch = hasProductFilter && addon.productIds.some(id => id.toLowerCase() === pid.toLowerCase());

  const itemCategories = new Set<string>();
  if (item.category) itemCategories.add(item.category.toLowerCase());
  if (product?.category) itemCategories.add(product.category.toLowerCase());
  if ((product as any)?.collection) itemCategories.add(String((product as any).collection).toLowerCase());
  if (product?.isBundle) {
    itemCategories.add('bundles');
    itemCategories.add('celebration bundles');
    itemCategories.add('gift boxes');
  }
  const categoryMatch = hasCategoryFilter && addon.categories.some(cat => itemCategories.has(cat.toLowerCase()));

  if (!hasProductFilter && !hasCategoryFilter) {
    return { matches: true, directProductMatch: false, categoryMatch: false };
  }
  if (hasProductFilter && hasCategoryFilter) {
    return { matches: directProductMatch || categoryMatch, directProductMatch, categoryMatch };
  }
  if (hasProductFilter) {
    return { matches: directProductMatch, directProductMatch, categoryMatch: false };
  }
  return { matches: categoryMatch, directProductMatch: false, categoryMatch };
}

function deriveCartOccasions(
  items: AddonCartItemInput[],
  products: Product[],
  context?: AddonOccasionContext
): Set<string> {
  const occasions = new Set<string>();
  if (context?.isGift) occasions.add('gift');
  if (context?.giftCardStyle) {
    occasions.add('gift');
    occasions.add(context.giftCardStyle.toLowerCase());
  }
  for (const occ of context?.occasions || []) {
    if (typeof occ === 'string' && occ.trim()) occasions.add(occ.trim().toLowerCase());
  }
  for (const item of items) {
    const product = resolveCartProduct(item, products);
    const pid = canonicalProductId(item).toLowerCase();
    if (pid.includes('hamper') || pid.includes('gift') || pid.includes('bundle') || pid.includes('bid-box')) {
      occasions.add('gift');
    }
    if (pid.includes('eid')) occasions.add('eid');
    if (pid.includes('nikah') || pid.includes('wedding') || pid.includes('bid-box') || pid.includes('shadi')) {
      occasions.add('nikah');
      occasions.add('gift');
    }
    if (product) {
      if (product.isBundle) occasions.add('gift');
      const cat = (product.category || '').toLowerCase();
      if (cat.includes('gift') || cat.includes('bundle') || cat.includes('hamper') || cat.includes('packaging')) {
        occasions.add('gift');
      }
      const prodOccasions = (product as any).occasions;
      if (Array.isArray(prodOccasions)) {
        for (const o of prodOccasions) {
          if (typeof o === 'string' && o.trim()) occasions.add(o.trim().toLowerCase());
        }
      }
    }
  }
  return occasions;
}

/**
 * Computes the authoritative unit price and quantity for an add-on given the matching cart items.
 */
export function computeAddonCartPrice(
  addon: AddonDefinition,
  matchingItems: Array<{ item: AddonCartItemInput; product?: Product }>
): { unitPrice: number; quantity: number; totalPrice: number } {
  if (matchingItems.length === 0) {
    return { unitPrice: 0, quantity: 0, totalPrice: 0 };
  }

  const resolveItemPrice = (productId: string): number => {
    const overrides = addon.productPriceOverrides || {};
    for (const [overrideId, overridePrice] of Object.entries(overrides)) {
      if (overrideId.toLowerCase() === productId.toLowerCase() && Number.isFinite(overridePrice) && overridePrice >= 0) {
        return Math.round(overridePrice);
      }
    }
    return Math.max(0, Math.round(addon.price || 0));
  };

  if (addon.pricingMode === 'fixed') {
    // Use the highest applicable override among matching items, or the base addon price
    let unitPrice = Math.max(0, Math.round(addon.price || 0));
    for (const { item, product } of matchingItems) {
      const pid = product?.id || canonicalProductId(item);
      const candidate = resolveItemPrice(pid);
      if (candidate > 0) {
        unitPrice = candidate;
        break;
      }
    }
    return { unitPrice, quantity: 1, totalPrice: unitPrice };
  }

  // per_item pricing mode: sum across matching cart items
  let totalQuantity = 0;
  let totalPrice = 0;
  for (const { item, product } of matchingItems) {
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const pid = product?.id || canonicalProductId(item);
    const itemAddonPrice = resolveItemPrice(pid);
    totalQuantity += qty;
    totalPrice += itemAddonPrice * qty;
  }
  const unitPrice = totalQuantity > 0 ? Math.round(totalPrice / totalQuantity) : Math.max(0, Math.round(addon.price || 0));
  return { unitPrice, quantity: totalQuantity, totalPrice };
}

/**
 * Returns at most 4 active, relevant add-ons matching the cart items, occasions, and order value,
 * sorted with the most relevant first.
 */
export function matchAddonsForCart({
  addons,
  items,
  subtotal,
  products = PRODUCTS,
  occasionContext,
  maxResults = MAX_VISIBLE_ADDONS,
}: {
  addons: AddonDefinition[];
  items: AddonCartItemInput[];
  subtotal: number;
  products?: Product[];
  occasionContext?: AddonOccasionContext;
  maxResults?: number;
}): MatchedCartAddon[] {
  if (!Array.isArray(addons) || !Array.isArray(items) || items.length === 0) return [];

  const activeOccasions = deriveCartOccasions(items, products, occasionContext);
  const matched: MatchedCartAddon[] = [];

  for (const addon of addons) {
    if (!addon || addon.active !== true) continue;
    if (subtotal < (addon.minOrderValue || 0)) continue;
    if (addon.maxOrderValue !== null && addon.maxOrderValue !== undefined && addon.maxOrderValue > 0 && subtotal > addon.maxOrderValue) {
      continue;
    }

    // Check occasion match
    let occasionScore = 0;
    if (addon.occasions && addon.occasions.length > 0) {
      const matchedOccasions = addon.occasions.filter(occ => activeOccasions.has(occ.toLowerCase()));
      if (matchedOccasions.length === 0) continue;
      occasionScore = matchedOccasions.length * 50;
    }

    // Check product / category match across cart items
    const matchingItems: Array<{ item: AddonCartItemInput; product?: Product }> = [];
    let hasDirectProductMatch = false;
    let hasCategoryMatch = false;

    for (const item of items) {
      const product = resolveCartProduct(item, products);
      const check = itemMatchesAddonProductOrCategory(addon, item, product);
      if (check.matches) {
        matchingItems.push({ item, product });
        if (check.directProductMatch) hasDirectProductMatch = true;
        if (check.categoryMatch) hasCategoryMatch = true;
      }
    }

    if (matchingItems.length === 0) continue;

    const pricing = computeAddonCartPrice(addon, matchingItems);
    if (pricing.totalPrice <= 0) continue;

    const relevanceScore =
      (hasDirectProductMatch ? 100 : 0) +
      occasionScore +
      (hasCategoryMatch ? 30 : 0) +
      ((addon.minOrderValue || 0) > 0 ? 10 : 0);

    matched.push({
      addon,
      unitPrice: pricing.unitPrice,
      quantity: pricing.quantity,
      totalPrice: pricing.totalPrice,
      relevanceScore,
    });
  }

  matched.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    const orderA = a.addon.sortOrder ?? 99;
    const orderB = b.addon.sortOrder ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.addon.id.localeCompare(b.addon.id);
  });

  return matched.slice(0, Math.max(1, maxResults));
}

/**
 * Authoritative server-side validation and pricing of selected add-ons.
 * Browser-supplied add-on prices or totals are completely ignored.
 */
export function validateAndPriceAddons({
  selectedAddons,
  items,
  subtotal,
  addonsCatalog = STARTER_ADDONS,
  products = PRODUCTS,
}: {
  selectedAddons: unknown;
  items: AddonCartItemInput[];
  subtotal: number;
  addonsCatalog?: AddonDefinition[];
  products?: Product[];
}): { addons: ValidatedOrderAddon[]; addonsFee: number } {
  if (!Array.isArray(selectedAddons) || selectedAddons.length === 0) {
    return { addons: [], addonsFee: 0 };
  }
  if (selectedAddons.length > MAX_VISIBLE_ADDONS) {
    throw new ValidationError(`Maximum of ${MAX_VISIBLE_ADDONS} paid add-ons can be selected per order.`, 'TOO_MANY_ADDONS_SELECTED');
  }

  const requestedIds: string[] = [];
  const seen = new Set<string>();
  for (const raw of selectedAddons) {
    const id = typeof raw === 'string'
      ? raw.trim().toLowerCase()
      : raw && typeof raw === 'object'
        ? String((raw as any).id || (raw as any).addonId || '').trim().toLowerCase()
        : '';
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    requestedIds.push(id);
  }

  if (requestedIds.length === 0) {
    return { addons: [], addonsFee: 0 };
  }

  const validated: ValidatedOrderAddon[] = [];
  let addonsFee = 0;

  for (const id of requestedIds) {
    const addon = addonsCatalog.find(a => a.id.toLowerCase() === id);
    if (!addon || addon.active !== true) {
      throw new ValidationError(`Selected add-on "${id}" is not active or does not exist.`, 'INVALID_ADDON');
    }
    if (subtotal < (addon.minOrderValue || 0)) {
      throw new ValidationError(
        `Add-on "${addon.name_en}" requires a minimum order value of Rs. ${addon.minOrderValue.toLocaleString('en-PK')}.`,
        'ADDON_MIN_ORDER_NOT_MET'
      );
    }
    if (addon.maxOrderValue !== null && addon.maxOrderValue !== undefined && addon.maxOrderValue > 0 && subtotal > addon.maxOrderValue) {
      throw new ValidationError(
        `Add-on "${addon.name_en}" is only available for orders up to Rs. ${addon.maxOrderValue.toLocaleString('en-PK')}.`,
        'ADDON_MAX_ORDER_EXCEEDED'
      );
    }

    const matchingItems: Array<{ item: AddonCartItemInput; product?: Product }> = [];
    for (const item of items) {
      const product = resolveCartProduct(item, products);
      const check = itemMatchesAddonProductOrCategory(addon, item, product);
      if (check.matches) {
        matchingItems.push({ item, product });
      }
    }

    if (matchingItems.length === 0) {
      throw new ValidationError(`Add-on "${addon.name_en}" does not apply to the items in your bag.`, 'ADDON_ITEM_MISMATCH');
    }

    const pricing = computeAddonCartPrice(addon, matchingItems);
    if (pricing.totalPrice <= 0) {
      throw new ValidationError(`Add-on "${addon.name_en}" is not currently priced for sale.`, 'INVALID_ADDON_PRICE');
    }

    validated.push({
      id: addon.id,
      name_en: addon.name_en,
      name_ur: addon.name_ur,
      name_ar: addon.name_ar,
      pricingMode: addon.pricingMode,
      unitPrice: pricing.unitPrice,
      quantity: pricing.quantity,
      totalPrice: pricing.totalPrice,
    });
    addonsFee += pricing.totalPrice;
  }

  return { addons: validated, addonsFee };
}

/**
 * Formats validated order add-ons for WhatsApp confirmation messages and Admin Packing Sheets.
 */
export function addonReceiptLines(addons: ValidatedOrderAddon[] | null | undefined): string[] {
  if (!Array.isArray(addons) || addons.length === 0) return [];
  return addons.map(addon => {
    const qtyNote = addon.pricingMode === 'per_item' && addon.quantity > 1 ? ` (× ${addon.quantity})` : '';
    return `• Add-on: ${addon.name_en}${qtyNote} — Rs. ${addon.totalPrice.toLocaleString('en-PK')}`;
  });
}
