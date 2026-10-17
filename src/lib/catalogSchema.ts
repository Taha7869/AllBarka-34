import type { Product } from '../types';
import { resolveProductVariant } from './productVariants';

export class CatalogError extends Error {
  constructor(public code: string, public httpStatus = 400) { super(code); this.name = 'CatalogError'; }
}
export interface CatalogVariant { id: string; label: string; price: number; available: boolean; weightGrams: number | null }
export interface CatalogPricing {
  schemaVersion: 1; productId: string; revision: number; active: boolean; quoteOnly: boolean;
  variants: CatalogVariant[]; wholesale: number; pricePer100g: number; allowCustomWeight: boolean;
  minCustomWeightG: number; maxCustomWeightG: number; shippingWeightG: number | null;
}
export interface CatalogRecord { pricing: CatalogPricing; version: string; updatedAt: string | null }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, minimum: number, maximum = 10_000_000): value is number => Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
const positive = (value: unknown) => integer(value, 1);
export const catalogVariantId = (label: string) => `portion-${encodeURIComponent(label)}`;

/** Canonical pricing has one editable variants array. Legacy prices are derived only. */
export function validateCatalogPricing(value: unknown, seed: Product): CatalogPricing {
  if (!object(value) || value.schemaVersion !== 1 || value.productId !== seed.id || !integer(value.revision, 0, Number.MAX_SAFE_INTEGER)
    || typeof value.active !== 'boolean' || typeof value.quoteOnly !== 'boolean' || !Array.isArray(value.variants) || value.variants.length > 20
    || !integer(value.wholesale, 0) || !integer(value.pricePer100g, 0) || typeof value.allowCustomWeight !== 'boolean'
    || !integer(value.minCustomWeightG, 100, 5000) || !integer(value.maxCustomWeightG, 100, 5000)
    || value.minCustomWeightG > value.maxCustomWeightG || value.minCustomWeightG % 50 || value.maxCustomWeightG % 50
    || !(value.shippingWeightG === null || integer(value.shippingWeightG, 0))) throw new CatalogError('INVALID_CATALOG_PRICING');
  const seen = new Set<string>();
  const variants = value.variants.map((raw): CatalogVariant => {
    if (!object(raw) || typeof raw.label !== 'string' || !raw.label.trim() || raw.label.length > 40
      || /[\u0000-\u001f\u007f]/.test(raw.label) || raw.label !== raw.label.trim()
      || raw.id !== catalogVariantId(raw.label) || !positive(raw.price) || typeof raw.available !== 'boolean'
      || !(raw.weightGrams === null || integer(raw.weightGrams, 0)) || seen.has(raw.label)) throw new CatalogError('INVALID_CATALOG_VARIANT');
    // A merchant can retain existing fixed bundle labels; new arbitrary units cannot enter checkout.
    const supported = /^\d+(?:\.\d+)?\s*(?:kg|g|ml)$/i.test(raw.label) || Object.hasOwn(seed.prices, raw.label);
    if (!supported || (/ml$/i.test(raw.label) && seed.category !== 'oils')) throw new CatalogError('INVALID_CATALOG_UNIT');
    seen.add(raw.label);
    return { id: raw.id as string, label: raw.label, price: raw.price as number, available: raw.available, weightGrams: raw.weightGrams as number | null };
  });
  if (!value.quoteOnly && variants.length === 0) throw new CatalogError('INVALID_CATALOG_PRICING');
  if (value.allowCustomWeight && (!positive(value.pricePer100g) || seed.isBundle || ['oils', 'bundles', 'gift-boxes'].includes(seed.category))) throw new CatalogError('INVALID_CATALOG_CUSTOM_WEIGHT');
  return { schemaVersion: 1, productId: seed.id, revision: value.revision as number, active: value.active, quoteOnly: value.quoteOnly,
    variants, wholesale: value.wholesale as number, pricePer100g: value.pricePer100g as number,
    allowCustomWeight: value.allowCustomWeight, minCustomWeightG: value.minCustomWeightG as number,
    maxCustomWeightG: value.maxCustomWeightG as number, shippingWeightG: value.shippingWeightG as number | null };
}

/** Adopt existing live Product documents without replacing their prices with compiled defaults. */
export function pricingFromLegacy(value: unknown, seed: Product): CatalogPricing {
  if (!object(value) || (value.id !== undefined && value.id !== seed.id) || !object(value.prices)) throw new CatalogError('INVALID_CATALOG_PRICING');
  const candidate = { ...seed, ...value, id: seed.id } as Product;
  const prices = value.prices as Record<string, unknown>;
  const variants = Object.entries(prices).map(([label, price]) => {
    if (!positive(price)) throw new CatalogError('INVALID_CATALOG_VARIANT');
    const weightGrams = resolveProductVariant({ ...candidate, active: true, quoteOnly: false, prices: { [label]: price } }, label)?.weightGrams ?? null;
    return { id: catalogVariantId(label), label, price, available: true, weightGrams };
  });
  return validateCatalogPricing({ schemaVersion: 1, productId: seed.id, revision: value.revision ?? 0,
    active: value.active ?? seed.active ?? true, quoteOnly: value.quoteOnly ?? seed.quoteOnly ?? false,
    variants, wholesale: value.wholesale ?? seed.wholesale ?? 0, pricePer100g: value.pricePer100g ?? seed.pricePer100g ?? 0,
    allowCustomWeight: value.allowCustomWeight ?? seed.allowCustomWeight ?? false,
    minCustomWeightG: value.minCustomWeightG ?? seed.minCustomWeightG ?? 100,
    maxCustomWeightG: value.maxCustomWeightG ?? seed.maxCustomWeightG ?? 5000,
    shippingWeightG: value.shippingWeightG ?? seed.shippingWeightG ?? null,
  }, seed);
}
export function readCatalogPricing(value: unknown, seed: Product): CatalogPricing {
  return object(value) && value.schemaVersion !== undefined ? validateCatalogPricing(value, seed) : pricingFromLegacy(value, seed);
}

export function productFromPricing(seed: Product, pricing: CatalogPricing, version: string): Product {
  const available = pricing.variants.filter(variant => variant.available);
  return { ...seed, active: pricing.active, quoteOnly: pricing.quoteOnly,
    prices: Object.fromEntries(available.map(variant => [variant.label, variant.price])),
    variants: available.map(variant => ({ label: variant.label, price: variant.price })), wholesale: pricing.wholesale,
    pricePer100g: pricing.pricePer100g, allowCustomWeight: pricing.allowCustomWeight,
    minCustomWeightG: pricing.minCustomWeightG, maxCustomWeightG: pricing.maxCustomWeightG,
    shippingWeightG: pricing.shippingWeightG ?? undefined,
    shippingWeights: Object.fromEntries(pricing.variants.filter(variant => variant.weightGrams !== null).map(variant => [variant.label, variant.weightGrams!])),
    catalogRevision: version,
  };
}

/** Missing or corrupt required records are unpurchasable, never silently repriced from source. */
export function unavailableProduct(seed: Product): Product {
  return { ...seed, active: false, prices: {}, variants: [], wholesale: 0, allowCustomWeight: false, pricePer100g: 0, catalogRevision: 'unavailable' };
}

export function stripPrivateProductFields(product: Product): Product {
  const sanitized = { ...product };
  delete sanitized.referencePrice;
  delete sanitized.supplierCost;
  delete sanitized.supplierName;
  delete sanitized.supplierItemUrl;
  delete sanitized.internalNotes;
  delete sanitized.importBatch;
  delete sanitized.importTimestamp;
  delete sanitized.adminRevision;
  return sanitized;
}

export function isProductPubliclyVisible(product: Product): boolean {
  if (product.active === false) return false;
  if (product.status === 'archived' || product.status === 'draft') return false;
  return true;
}

export function validateDynamicProduct(value: unknown, existingId?: string): Product {
  if (!object(value)) throw new CatalogError('INVALID_PRODUCT_DATA', 400);
  const rawId = typeof value.id === 'string' ? value.id.trim() : (existingId || '');
  if (!rawId || !/^[a-z0-9_-]{2,80}$/.test(rawId)) {
    throw new CatalogError('INVALID_PRODUCT_ID', 400);
  }
  if (existingId && rawId !== existingId) {
    throw new CatalogError('PRODUCT_ID_IMMUTABLE', 400);
  }

  const name_en = typeof value.name_en === 'string' ? value.name_en.trim() : (typeof value.name === 'string' ? value.name.trim() : '');
  if (!name_en || name_en.length < 2 || name_en.length > 120) {
    throw new CatalogError('INVALID_PRODUCT_NAME_EN', 400);
  }
  const name_ur = typeof value.name_ur === 'string' && value.name_ur.trim() ? value.name_ur.trim() : name_en;
  const name_ar = typeof value.name_ar === 'string' && value.name_ar.trim() ? value.name_ar.trim() : name_en;

  const category = typeof value.category === 'string' && value.category.trim() ? value.category.trim() : 'dry-fruits';

  const rawPrices = object(value.prices) ? (value.prices as Record<string, unknown>) : {};
  const prices: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawPrices)) {
    const key = k.trim();
    if (!key || key.length > 40) throw new CatalogError('INVALID_PORTION_KEY', 400);
    const num = Number(v);
    if (!Number.isFinite(num) || num <= 0) throw new CatalogError('INVALID_PORTION_PRICE', 400);
    prices[key] = Math.round(num);
  }

  const quoteOnly = Boolean(value.quoteOnly);
  if (!quoteOnly && Object.keys(prices).length === 0) {
    throw new CatalogError('PRODUCT_REQUIRES_PRICING', 400);
  }

  const status = value.status === 'published' || value.status === 'archived' || value.status === 'draft'
    ? value.status
    : (value.active === false ? 'archived' : 'draft');
  const active = value.active !== undefined
    ? Boolean(value.active)
    : (status === 'published');

  const orderMode = value.orderMode === 'standard' || value.orderMode === 'inquiry_quote' || value.orderMode === 'both'
    ? value.orderMode
    : (quoteOnly ? 'inquiry_quote' : 'standard');

  const wholesale = typeof value.wholesale === 'number' && Number.isFinite(value.wholesale) && value.wholesale >= 0
    ? Math.round(value.wholesale)
    : 0;

  const image = typeof value.image === 'string' && value.image.trim() ? value.image.trim() : null;
  const imageName = typeof value.imageName === 'string' && value.imageName.trim() ? value.imageName.trim() : null;

  const desc_en = typeof value.desc_en === 'string' ? value.desc_en.trim() : (typeof value.description === 'string' ? value.description.trim() : '');
  const desc_ur = typeof value.desc_ur === 'string' ? value.desc_ur.trim() : desc_en;
  const desc_ar = typeof value.desc_ar === 'string' ? value.desc_ar.trim() : desc_en;

  const variants = Object.entries(prices).map(([label, price]) => ({ label, price }));

  const product: Product = {
    id: rawId,
    name_en,
    name_ur,
    name_ar,
    name: name_en,
    category,
    prices,
    variants,
    active,
    status,
    orderMode,
    quoteOnly,
    wholesale,
    image,
    imageName,
    desc_en,
    desc_ur,
    desc_ar,
    catalogRevision: typeof value.catalogRevision === 'string' ? value.catalogRevision : undefined,
  };

  if (typeof value.productFamily === 'string' && value.productFamily.trim()) {
    product.productFamily = value.productFamily.trim();
  }
  if (Array.isArray(value.collections)) {
    product.collections = value.collections.filter(c => typeof c === 'string' && c.trim()).map(c => c.trim());
  }
  if (Array.isArray(value.occasions)) {
    product.occasions = value.occasions.filter(o => typeof o === 'string' && o.trim()).map(o => o.trim());
  }
  if (object(value.personalization)) {
    product.personalization = {
      supported: Boolean((value.personalization as any).supported),
      allowMonogram: Boolean((value.personalization as any).allowMonogram),
      allowCardMessage: Boolean((value.personalization as any).allowCardMessage),
      allowRibbonColor: Boolean((value.personalization as any).allowRibbonColor),
      ribbonColors: Array.isArray((value.personalization as any).ribbonColors) ? (value.personalization as any).ribbonColors : undefined,
      options: Array.isArray((value.personalization as any).options) ? (value.personalization as any).options : undefined,
      notes: typeof (value.personalization as any).notes === 'string' ? (value.personalization as any).notes.trim() : undefined,
    };
  }
  if (Array.isArray(value.inclusions)) {
    product.inclusions = value.inclusions.filter(i => typeof i === 'string' && i.trim()).map(i => i.trim());
  }
  if (Array.isArray(value.exclusions)) {
    product.exclusions = value.exclusions.filter(e => typeof e === 'string' && e.trim()).map(e => e.trim());
  }
  if (typeof value.moqOverride === 'number' && Number.isSafeInteger(value.moqOverride) && value.moqOverride > 0) {
    product.moqOverride = value.moqOverride;
  }
  if (typeof value.preparationDays === 'number' && Number.isSafeInteger(value.preparationDays) && value.preparationDays >= 0) {
    product.preparationDays = value.preparationDays;
  }
  if (typeof value.displayOrder === 'number' && Number.isSafeInteger(value.displayOrder)) {
    product.displayOrder = value.displayOrder;
  }

  // Private fields (authoritative admin only)
  if (typeof value.referencePrice === 'number' && Number.isFinite(value.referencePrice) && value.referencePrice > 0) {
    product.referencePrice = value.referencePrice;
  }
  if (typeof value.supplierCost === 'number' && Number.isFinite(value.supplierCost) && value.supplierCost > 0) {
    product.supplierCost = value.supplierCost;
  }
  if (typeof value.supplierName === 'string' && value.supplierName.trim()) {
    product.supplierName = value.supplierName.trim();
  }
  if (typeof value.supplierItemUrl === 'string' && value.supplierItemUrl.trim()) {
    product.supplierItemUrl = value.supplierItemUrl.trim();
  }
  if (typeof value.internalNotes === 'string' && value.internalNotes.trim()) {
    product.internalNotes = value.internalNotes.trim();
  }
  if (typeof value.importBatch === 'string' && value.importBatch.trim()) {
    product.importBatch = value.importBatch.trim();
  }
  if (typeof value.importTimestamp === 'string' && value.importTimestamp.trim()) {
    product.importTimestamp = value.importTimestamp.trim();
  }
  if (typeof value.adminRevision === 'number' && Number.isSafeInteger(value.adminRevision) && value.adminRevision >= 0) {
    product.adminRevision = value.adminRevision;
  }

  return product;
}

export function dynamicProductFromDocument(data: unknown, id: string): Product {
  const raw = object(data) ? data : {};
  const validated = validateDynamicProduct({ ...raw, id }, id);
  const fingerprintStr = typeof (raw as any).updatedAt === 'string'
    ? `${id}-${(raw as any).revision || 0}-${(raw as any).updatedAt}`
    : `${id}-${(raw as any).revision || 0}`;
  return {
    ...validated,
    catalogRevision: validated.catalogRevision || fingerprintStr,
  };
}

export function validateMerchandisingSettings(value: unknown): {
  featuredProductIds: string[];
  categoryOrder: string[];
  categoryVisibility: Record<string, boolean>;
  autoplayDurationMs: number;
  autoplayResumeDelayMs: number;
  revision: number;
  updatedAt: string;
  updatedBy?: string;
} {
  if (!object(value)) throw new CatalogError('INVALID_MERCHANDISING_DATA', 400);
  const featuredProductIds = Array.isArray(value.featuredProductIds)
    ? value.featuredProductIds.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim())
    : [];
  const categoryOrder = Array.isArray(value.categoryOrder)
    ? value.categoryOrder.filter(c => typeof c === 'string' && c.trim()).map(c => c.trim())
    : [];
  const categoryVisibility: Record<string, boolean> = {};
  if (object(value.categoryVisibility)) {
    for (const [k, v] of Object.entries(value.categoryVisibility)) {
      categoryVisibility[k] = Boolean(v);
    }
  }
  const autoplayDurationMs = typeof value.autoplayDurationMs === 'number' && value.autoplayDurationMs >= 1000 && value.autoplayDurationMs <= 60000
    ? value.autoplayDurationMs
    : 6000;
  const autoplayResumeDelayMs = typeof value.autoplayResumeDelayMs === 'number' && value.autoplayResumeDelayMs >= 500 && value.autoplayResumeDelayMs <= 30000
    ? value.autoplayResumeDelayMs
    : 3000;
  const revision = typeof value.revision === 'number' && Number.isSafeInteger(value.revision) && value.revision >= 0
    ? value.revision
    : 0;
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString();
  const updatedBy = typeof value.updatedBy === 'string' ? value.updatedBy : undefined;

  return {
    featuredProductIds,
    categoryOrder,
    categoryVisibility,
    autoplayDurationMs,
    autoplayResumeDelayMs,
    revision,
    updatedAt,
    updatedBy,
  };
}
