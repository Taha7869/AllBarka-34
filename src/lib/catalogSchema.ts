import type { Product } from '../types';
import { resolveProductVariant } from './productVariants';

export class CatalogError extends Error {
  constructor(public code: string, public httpStatus = 400, message?: string) {
    super(message || code);
    this.name = 'CatalogError';
  }
  get status() {
    return this.httpStatus;
  }
}
export interface CatalogVariant {
  id: string;
  label: string;
  price: number;
  available: boolean;
  weightGrams: number | null;
  moqOverride?: number | null;
}
export interface CatalogPricing {
  schemaVersion: 1; productId: string; revision: number; active: boolean; quoteOnly: boolean;
  variants: CatalogVariant[]; wholesale: number; pricePer100g: number; allowCustomWeight: boolean;
  minCustomWeightG: number; maxCustomWeightG: number; shippingWeightG: number | null;
  moqOverride?: number | null;
}
export interface CatalogRecord { pricing: CatalogPricing; version: string; updatedAt: string | null }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, minimum: number, maximum = 10_000_000): value is number => Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
const positive = (value: unknown) => integer(value, 1);
export const catalogVariantId = (label: string) => `portion-${encodeURIComponent(label)}`;

export function validateMoqOverride(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'number' || !integer(value, 1, 10_000)) {
    throw new CatalogError('INVALID_MOQ_OVERRIDE', 400);
  }
  return value;
}

/** Canonical pricing has one editable variants array. Legacy prices are derived only. */
export function validateCatalogPricing(value: unknown, seed: Product): CatalogPricing {
  if (!object(value) || value.schemaVersion !== 1 || (value.productId !== seed.id && (value as any).id !== seed.id) || !integer(value.revision, 0, Number.MAX_SAFE_INTEGER)
    || typeof value.active !== 'boolean' || typeof value.quoteOnly !== 'boolean' || !Array.isArray(value.variants) || value.variants.length > 20
    || !integer(value.wholesale, 0) || !integer(value.pricePer100g, 0) || typeof value.allowCustomWeight !== 'boolean'
    || !integer(value.minCustomWeightG, 100, 5000) || !integer(value.maxCustomWeightG, 100, 5000)
    || value.minCustomWeightG > value.maxCustomWeightG || value.minCustomWeightG % 50 || value.maxCustomWeightG % 50
    || !(value.shippingWeightG === null || integer(value.shippingWeightG, 0))) throw new CatalogError('INVALID_CATALOG_PRICING');

  const rawProductMoq = value.moqOverride !== undefined ? value.moqOverride : (value as any).minOrderQuantity;
  const productMoq = validateMoqOverride(rawProductMoq);

  const seen = new Set<string>();
  const variants = value.variants.map((raw): CatalogVariant => {
    if (!object(raw) || typeof raw.label !== 'string' || !raw.label.trim() || raw.label.length > 40
      || /[\u0000-\u001f\u007f]/.test(raw.label) || raw.label !== raw.label.trim()
      || raw.id !== catalogVariantId(raw.label) || !positive(raw.price) || typeof raw.available !== 'boolean'
      || !(raw.weightGrams === null || integer(raw.weightGrams, 0)) || seen.has(raw.label)) throw new CatalogError('INVALID_CATALOG_VARIANT');
    // A merchant can retain existing fixed bundle labels; new arbitrary units cannot enter checkout.
    const supported = /^\d+(?:\.\d+)?\s*(?:kg|g|ml|pc|pcs|piece|pieces|pack|box|boxes)$/i.test(raw.label)
      || Object.hasOwn(seed.prices, raw.label)
      || /^(?:empty|filled|sample|portion|bundle|box)/i.test(raw.label);
    if (!supported || (/ml$/i.test(raw.label) && seed.category !== 'oils')) throw new CatalogError('INVALID_CATALOG_UNIT');
    const rawVarMoq = raw.moqOverride !== undefined ? raw.moqOverride : (raw as any).minOrderQuantity;
    const varMoq = validateMoqOverride(rawVarMoq);
    seen.add(raw.label);
    return {
      id: raw.id as string,
      label: raw.label,
      price: raw.price as number,
      available: raw.available,
      weightGrams: raw.weightGrams as number | null,
      ...(varMoq !== undefined ? { moqOverride: varMoq } : {}),
    };
  });
  if (!value.quoteOnly && variants.length === 0) throw new CatalogError('INVALID_CATALOG_PRICING');
  if (value.allowCustomWeight && (!positive(value.pricePer100g) || seed.isBundle || ['oils', 'bundles', 'gift-boxes'].includes(seed.category))) throw new CatalogError('INVALID_CATALOG_CUSTOM_WEIGHT');
  return {
    schemaVersion: 1,
    productId: seed.id,
    revision: value.revision as number,
    active: value.active,
    quoteOnly: value.quoteOnly,
    variants,
    wholesale: value.wholesale as number,
    pricePer100g: value.pricePer100g as number,
    allowCustomWeight: value.allowCustomWeight,
    minCustomWeightG: value.minCustomWeightG as number,
    maxCustomWeightG: value.maxCustomWeightG as number,
    shippingWeightG: value.shippingWeightG as number | null,
    ...(productMoq !== undefined ? { moqOverride: productMoq } : {}),
  };
}

/** Adopt existing live Product documents without replacing their prices with compiled defaults. */
export function pricingFromLegacy(value: unknown, seed: Product): CatalogPricing {
  if (!object(value) || (value.id !== undefined && value.id !== seed.id) || !object(value.prices)) throw new CatalogError('INVALID_CATALOG_PRICING');
  const candidate = { ...seed, ...value, id: seed.id } as Product;
  const prices = value.prices as Record<string, unknown>;
  const existingVarMap = new Map<string, any>();
  if (Array.isArray(seed.variants)) {
    for (const v of seed.variants) {
      if (v && typeof v.label === 'string') existingVarMap.set(v.label, v);
    }
  }
  if (Array.isArray((value as any).variants)) {
    for (const v of (value as any).variants) {
      if (v && typeof v.label === 'string') existingVarMap.set(v.label, v);
    }
  }
  const variants = Object.entries(prices).map(([label, price]) => {
    if (!positive(price)) throw new CatalogError('INVALID_CATALOG_VARIANT');
    const weightGrams = resolveProductVariant({ ...candidate, active: true, quoteOnly: false, prices: { [label]: price } }, label)?.weightGrams ?? null;
    const existingVar = existingVarMap.get(label);
    const varMoq = existingVar?.moqOverride !== undefined ? existingVar.moqOverride : existingVar?.minOrderQuantity;
    return {
      id: catalogVariantId(label),
      label,
      price,
      available: existingVar?.available !== false,
      weightGrams,
      ...(varMoq !== undefined ? { moqOverride: varMoq } : {}),
    };
  });
  const rawProductMoq =
    (value as any).moqOverride !== undefined
      ? (value as any).moqOverride
      : (value as any).minOrderQuantity !== undefined
        ? (value as any).minOrderQuantity
        : (seed.moqOverride ?? seed.minOrderQuantity);
  return validateCatalogPricing({
    schemaVersion: 1,
    productId: seed.id,
    revision: value.revision ?? 0,
    active: value.active ?? seed.active ?? true,
    quoteOnly: value.quoteOnly ?? seed.quoteOnly ?? false,
    variants,
    wholesale: value.wholesale ?? seed.wholesale ?? 0,
    pricePer100g: value.pricePer100g ?? seed.pricePer100g ?? 0,
    allowCustomWeight: value.allowCustomWeight ?? seed.allowCustomWeight ?? false,
    minCustomWeightG: value.minCustomWeightG ?? seed.minCustomWeightG ?? 100,
    maxCustomWeightG: value.maxCustomWeightG ?? seed.maxCustomWeightG ?? 5000,
    shippingWeightG: value.shippingWeightG ?? seed.shippingWeightG ?? null,
    ...(rawProductMoq !== undefined ? { moqOverride: rawProductMoq } : {}),
  }, seed);
}
export function readCatalogPricing(value: unknown, seed: Product): CatalogPricing {
  if (object(value) && value.schemaVersion !== undefined) {
    const raw = value as any;
    const rawProductMoq =
      raw.moqOverride !== undefined
        ? raw.moqOverride
        : raw.minOrderQuantity !== undefined
          ? raw.minOrderQuantity
          : (seed.moqOverride ?? seed.minOrderQuantity);
    const normalized = {
      schemaVersion: 1,
      productId: seed.id,
      revision: Number.isSafeInteger(raw.revision) ? raw.revision : 0,
      active: typeof raw.active === 'boolean' ? raw.active : (seed.active ?? true),
      quoteOnly: typeof raw.quoteOnly === 'boolean' ? raw.quoteOnly : (seed.quoteOnly ?? false),
      variants: Array.isArray(raw.variants)
        ? raw.variants.map((v: any) => {
            const varMoq = v?.moqOverride !== undefined ? v.moqOverride : v?.minOrderQuantity;
            return {
              id: v.id === catalogVariantId(v.label) ? v.id : catalogVariantId(v.label),
              label: v.label,
              price: Math.round(Number(v.price)),
              available: v.available !== false,
              weightGrams: Number.isSafeInteger(v.weightGrams) ? v.weightGrams : null,
              ...(varMoq !== undefined ? { moqOverride: varMoq } : {}),
            };
          })
        : [],
      wholesale: Number.isSafeInteger(raw.wholesale) ? raw.wholesale : (seed.wholesale ?? 0),
      pricePer100g: Number.isSafeInteger(raw.pricePer100g) ? raw.pricePer100g : (seed.pricePer100g ?? 0),
      allowCustomWeight: typeof raw.allowCustomWeight === 'boolean' ? raw.allowCustomWeight : Boolean(seed.allowCustomWeight),
      minCustomWeightG: Number.isSafeInteger(raw.minCustomWeightG) ? raw.minCustomWeightG : (seed.minCustomWeightG ?? 100),
      maxCustomWeightG: Number.isSafeInteger(raw.maxCustomWeightG) ? raw.maxCustomWeightG : (seed.maxCustomWeightG ?? 5000),
      shippingWeightG: raw.shippingWeightG ?? seed.shippingWeightG ?? null,
      ...(rawProductMoq !== undefined ? { moqOverride: rawProductMoq } : {}),
    };
    return validateCatalogPricing(normalized, seed);
  }
  return pricingFromLegacy(value, seed);
}

export function productFromPricing(seed: Product, pricing: CatalogPricing, version: string): Product {
  const available = pricing.variants.filter(variant => variant.available);
  const resolvedProductMoq =
    pricing.moqOverride === null
      ? undefined
      : typeof pricing.moqOverride === 'number'
        ? pricing.moqOverride
        : seed.moqOverride;
  return {
    ...seed,
    active: pricing.active,
    quoteOnly: pricing.quoteOnly,
    prices: Object.fromEntries(available.map(variant => [variant.label, variant.price])),
    variants: available.map(variant => ({
      label: variant.label,
      price: variant.price,
      ...(typeof variant.moqOverride === 'number' ? { moqOverride: variant.moqOverride } : {}),
    })),
    wholesale: pricing.wholesale,
    pricePer100g: pricing.pricePer100g,
    allowCustomWeight: pricing.allowCustomWeight,
    minCustomWeightG: pricing.minCustomWeightG,
    maxCustomWeightG: pricing.maxCustomWeightG,
    shippingWeightG: pricing.shippingWeightG ?? undefined,
    shippingWeights: Object.fromEntries(
      pricing.variants.filter(variant => variant.weightGrams !== null).map(variant => [variant.label, variant.weightGrams!])
    ),
    moqOverride: resolvedProductMoq,
    catalogRevision: version,
  };
}

/** Missing or corrupt required records are unpurchasable, never silently repriced from source. */
export function unavailableProduct(seed: Product): Product {
  return { ...seed, active: false, prices: {}, variants: [], wholesale: 0, allowCustomWeight: false, pricePer100g: 0, catalogRevision: 'unavailable' };
}

export const PUBLIC_PRODUCT_FIELDS = [
  'id',
  'name',
  'name_en',
  'name_ur',
  'name_ar',
  'category',
  'category_en',
  'category_ur',
  'category_ar',
  'prices',
  'variants',
  'image',
  'imageName',
  'desc_en',
  'desc_ur',
  'desc_ar',
  'description',
  'active',
  'status',
  'orderMode',
  'quoteOnly',
  'wholesale',
  'isBundle',
  'components',
  'contents',
  'contents_en',
  'contents_ur',
  'contents_ar',
  'inStock',
  'stockQty',
  'isBidBox',
  'bidBoxConfig',
  'allowCustomWeight',
  'minCustomWeightG',
  'maxCustomWeightG',
  'pricePer100g',
  'shippingWeightG',
  'shippingWeights',
  'productFamily',
  'collections',
  'occasions',
  'personalization',
  'inclusions',
  'exclusions',
  'moqOverride',
  'preparationDays',
  'displayOrder',
  'badge',
  'badges',
  'keywords',
  'nutritionalHighlights',
  'fragile',
  'origins',
  'origin_en',
  'origin_ur',
  'origin_ar',
  'harvest_en',
  'harvest_ur',
  'harvest_ar',
  'sourcingDetails_en',
  'sourcingDetails_ur',
  'sourcingDetails_ar',
  'storageTips_en',
  'storageTips_ur',
  'storageTips_ar',
  'packagingDetails_en',
  'packagingDetails_ur',
  'packagingDetails_ar',
  'allergenWarning_en',
  'allergenWarning_ur',
  'allergenWarning_ar',
  'tasteProfile_en',
  'tasteProfile_ur',
  'tasteProfile_ar',
  'recipe_en',
  'recipe_ur',
  'recipe_ar',
  'health_en',
  'health_ur',
  'health_ar',
  'tag_en',
  'tag_ur',
  'tag_ar',
  'catalogRevision',
] as const;

export function stripPrivateProductFields(product: Product): Product {
  const sanitized: Record<string, unknown> = {};
  for (const field of PUBLIC_PRODUCT_FIELDS) {
    if (Object.hasOwn(product, field) && (product as any)[field] !== undefined) {
      sanitized[field] = (product as any)[field];
    }
  }
  return sanitized as unknown as Product;
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

  let rawPrices = object(value.prices) ? { ...(value.prices as Record<string, unknown>) } : {};
  const hasVariantsArray = Array.isArray(value.variants);
  const variantMoqByLabel = new Map<string, number>();
  if (hasVariantsArray) {
    for (const v of (value.variants as unknown[])) {
      if (object(v) && typeof v.label === 'string' && v.label.trim()) {
        const trimmedLabel = v.label.trim();
        const rawVarMoq = v.moqOverride !== undefined ? v.moqOverride : (v as any).minOrderQuantity;
        const validatedVarMoq = validateMoqOverride(rawVarMoq);
        if (typeof validatedVarMoq === 'number') {
          variantMoqByLabel.set(trimmedLabel, validatedVarMoq);
        }
        const num = Number(v.price);
        if (v.available === false) {
          delete rawPrices[trimmedLabel];
        } else if (Number.isFinite(num) && num > 0) {
          rawPrices[trimmedLabel] = Math.round(num);
        }
      }
    }
  }

  const prices: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawPrices)) {
    const key = k.trim();
    if (!key || key.length > 40) throw new CatalogError('INVALID_PORTION_KEY', 400);
    const num = Number(v);
    if (!Number.isFinite(num) || num <= 0) throw new CatalogError('INVALID_PORTION_PRICE', 400);
    prices[key] = Math.round(num);
  }

  const quoteOnly = Boolean(value.quoteOnly) || value.orderMode === 'inquiry_quote';
  const hasConfiguredVariants = hasVariantsArray && (value.variants as unknown[]).length > 0;
  if (!quoteOnly && Object.keys(prices).length === 0 && !hasConfiguredVariants) {
    throw new CatalogError('PRODUCT_REQUIRES_PRICING', 400);
  }

  const status = value.status === 'published' || value.status === 'archived' || value.status === 'draft'
    ? value.status
    : (value.active === false ? 'archived' : 'draft');
  const active = value.active !== undefined
    ? Boolean(value.active)
    : (status === 'published' && Object.keys(prices).length > 0);

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

  const variants = Object.entries(prices).map(([label, price]) => {
    const varMoq = variantMoqByLabel.get(label);
    return {
      label,
      price,
      ...(typeof varMoq === 'number' ? { moqOverride: varMoq } : {}),
    };
  });

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

  // Shipping weight and portion weights capability
  if (value.shippingWeightG !== undefined) {
    if (value.shippingWeightG === null) {
      product.shippingWeightG = undefined;
    } else if (Number.isSafeInteger(value.shippingWeightG) && (value.shippingWeightG as number) >= 0) {
      product.shippingWeightG = value.shippingWeightG as number;
    } else {
      throw new CatalogError('INVALID_SHIPPING_WEIGHT', 400);
    }
  }

  if (value.shippingWeights !== undefined) {
    if (!object(value.shippingWeights)) throw new CatalogError('INVALID_SHIPPING_WEIGHTS', 400);
    const weights: Record<string, number> = {};
    for (const [k, v] of Object.entries(value.shippingWeights as Record<string, unknown>)) {
      if (!Number.isSafeInteger(v) || (v as number) < 0) throw new CatalogError('INVALID_SHIPPING_WEIGHTS', 400);
      weights[k] = v as number;
    }
    product.shippingWeights = weights;
  } else if (Array.isArray(value.variants)) {
    const derivedWeights: Record<string, number> = {};
    for (const v of value.variants) {
      if (object(v) && typeof v.label === 'string' && Number.isSafeInteger(v.weightGrams) && (v.weightGrams as number) > 0) {
        derivedWeights[v.label] = v.weightGrams as number;
      }
    }
    if (Object.keys(derivedWeights).length > 0) {
      product.shippingWeights = derivedWeights;
    }
  }

  // Bundle capabilities
  if (value.isBundle !== undefined) {
    if (typeof value.isBundle !== 'boolean') throw new CatalogError('INVALID_BUNDLE_FLAG', 400);
    product.isBundle = value.isBundle;
  }
  if (value.components !== undefined) {
    if (!Array.isArray(value.components)) throw new CatalogError('INVALID_COMPONENTS', 400);
    product.components = value.components.map(c => {
      if (typeof c === 'string') return c.trim();
      if (object(c) && typeof c.productId === 'string') return c as any;
      throw new CatalogError('INVALID_COMPONENTS', 400);
    });
  }
  if (value.contents !== undefined) {
    if (!Array.isArray(value.contents)) throw new CatalogError('INVALID_CONTENTS', 400);
    product.contents = value.contents.filter(c => typeof c === 'string' && c.trim()).map(c => c.trim());
  }
  if (typeof value.contents_en === 'string') product.contents_en = value.contents_en.trim();
  if (typeof value.contents_ur === 'string') product.contents_ur = value.contents_ur.trim();
  if (typeof value.contents_ar === 'string') product.contents_ar = value.contents_ar.trim();

  // Custom weight capabilities
  if (value.allowCustomWeight !== undefined) {
    if (typeof value.allowCustomWeight !== 'boolean') throw new CatalogError('INVALID_CUSTOM_WEIGHT_FLAG', 400);
    product.allowCustomWeight = value.allowCustomWeight;
  }
  if (value.minCustomWeightG !== undefined) {
    if (!Number.isSafeInteger(value.minCustomWeightG) || (value.minCustomWeightG as number) <= 0 || (value.minCustomWeightG as number) % 50 !== 0) {
      throw new CatalogError('INVALID_CUSTOM_WEIGHT_BOUNDS', 400);
    }
    product.minCustomWeightG = value.minCustomWeightG as number;
  }
  if (value.maxCustomWeightG !== undefined) {
    if (!Number.isSafeInteger(value.maxCustomWeightG) || (value.maxCustomWeightG as number) <= 0 || (value.maxCustomWeightG as number) % 50 !== 0) {
      throw new CatalogError('INVALID_CUSTOM_WEIGHT_BOUNDS', 400);
    }
    product.maxCustomWeightG = value.maxCustomWeightG as number;
  }
  if (product.minCustomWeightG && product.maxCustomWeightG && product.minCustomWeightG > product.maxCustomWeightG) {
    throw new CatalogError('INVALID_CUSTOM_WEIGHT_BOUNDS', 400);
  }
  if (value.pricePer100g !== undefined) {
    if (!Number.isSafeInteger(value.pricePer100g) || (value.pricePer100g as number) < 0) {
      throw new CatalogError('INVALID_PRICE_PER_100G', 400);
    }
    product.pricePer100g = value.pricePer100g as number;
  }
  if (product.allowCustomWeight && (!product.pricePer100g || product.pricePer100g <= 0)) {
    throw new CatalogError('INVALID_CATALOG_CUSTOM_WEIGHT', 400);
  }

  // Inventory
  if (value.inStock !== undefined) {
    if (typeof value.inStock !== 'boolean') throw new CatalogError('INVALID_INSTOCK_FLAG', 400);
    product.inStock = value.inStock;
  }
  if (value.stockQty !== undefined) {
    if (!Number.isSafeInteger(value.stockQty) || (value.stockQty as number) < 0) {
      throw new CatalogError('INVALID_STOCK_QTY', 400);
    }
    product.stockQty = value.stockQty as number;
  }

  // Bid Box / packaging
  if (value.isBidBox !== undefined) {
    if (typeof value.isBidBox !== 'boolean') throw new CatalogError('INVALID_BID_BOX_FLAG', 400);
    product.isBidBox = value.isBidBox;
  }
  if (value.bidBoxConfig !== undefined) {
    if (!object(value.bidBoxConfig)) throw new CatalogError('INVALID_BID_BOX_CONFIG', 400);
    product.bidBoxConfig = value.bidBoxConfig as any;
  }

  // Taxonomy & collections
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
  const rawProductMoq = value.moqOverride !== undefined ? value.moqOverride : (value as any).minOrderQuantity;
  const validatedProductMoq = validateMoqOverride(rawProductMoq);
  if (typeof validatedProductMoq === 'number') {
    product.moqOverride = validatedProductMoq;
  }
  if (typeof value.preparationDays === 'number' && Number.isSafeInteger(value.preparationDays) && value.preparationDays >= 0) {
    product.preparationDays = value.preparationDays;
  }
  if (typeof value.displayOrder === 'number' && Number.isSafeInteger(value.displayOrder)) {
    product.displayOrder = value.displayOrder;
  }

  // Badges & Keywords
  if (typeof value.badge === 'string') product.badge = value.badge.trim();
  if (Array.isArray(value.badges)) product.badges = value.badges as any;
  if (Array.isArray(value.keywords)) {
    product.keywords = value.keywords.filter(k => typeof k === 'string' && k.trim()).map(k => k.trim());
  }
  if (Array.isArray(value.nutritionalHighlights)) {
    product.nutritionalHighlights = value.nutritionalHighlights.filter(h => typeof h === 'string' && h.trim()).map(h => h.trim());
  }
  if (value.fragile !== undefined) {
    if (typeof value.fragile !== 'boolean') throw new CatalogError('INVALID_FRAGILE_FLAG', 400);
    product.fragile = value.fragile;
  }

  // Provenance, Harvest & Care
  if (Array.isArray(value.origins)) {
    product.origins = value.origins.filter(o => typeof o === 'string' && o.trim()).map(o => o.trim());
  }
  if (typeof value.origin_en === 'string') product.origin_en = value.origin_en.trim();
  if (typeof value.origin_ur === 'string') product.origin_ur = value.origin_ur.trim();
  if (typeof value.origin_ar === 'string') product.origin_ar = value.origin_ar.trim();
  if (typeof value.harvest_en === 'string') product.harvest_en = value.harvest_en.trim();
  if (typeof value.harvest_ur === 'string') product.harvest_ur = value.harvest_ur.trim();
  if (typeof value.harvest_ar === 'string') product.harvest_ar = value.harvest_ar.trim();
  if (typeof value.sourcingDetails_en === 'string') product.sourcingDetails_en = value.sourcingDetails_en.trim();
  if (typeof value.sourcingDetails_ur === 'string') product.sourcingDetails_ur = value.sourcingDetails_ur.trim();
  if (typeof value.sourcingDetails_ar === 'string') product.sourcingDetails_ar = value.sourcingDetails_ar.trim();
  if (typeof value.storageTips_en === 'string') product.storageTips_en = value.storageTips_en.trim();
  if (typeof value.storageTips_ur === 'string') product.storageTips_ur = value.storageTips_ur.trim();
  if (typeof value.storageTips_ar === 'string') product.storageTips_ar = value.storageTips_ar.trim();
  if (typeof value.packagingDetails_en === 'string') product.packagingDetails_en = value.packagingDetails_en.trim();
  if (typeof value.packagingDetails_ur === 'string') product.packagingDetails_ur = value.packagingDetails_ur.trim();
  if (typeof value.packagingDetails_ar === 'string') product.packagingDetails_ar = value.packagingDetails_ar.trim();
  if (typeof value.allergenWarning_en === 'string') product.allergenWarning_en = value.allergenWarning_en.trim();
  if (typeof value.allergenWarning_ur === 'string') product.allergenWarning_ur = value.allergenWarning_ur.trim();
  if (typeof value.allergenWarning_ar === 'string') product.allergenWarning_ar = value.allergenWarning_ar.trim();
  if (typeof value.tasteProfile_en === 'string') product.tasteProfile_en = value.tasteProfile_en.trim();
  if (typeof value.tasteProfile_ur === 'string') product.tasteProfile_ur = value.tasteProfile_ur.trim();
  if (typeof value.tasteProfile_ar === 'string') product.tasteProfile_ar = value.tasteProfile_ar.trim();
  if (typeof value.recipe_en === 'string') product.recipe_en = value.recipe_en.trim();
  if (typeof value.recipe_ur === 'string') product.recipe_ur = value.recipe_ur.trim();
  if (typeof value.recipe_ar === 'string') product.recipe_ar = value.recipe_ar.trim();
  if (typeof value.health_en === 'string') product.health_en = value.health_en.trim();
  if (typeof value.health_ur === 'string') product.health_ur = value.health_ur.trim();
  if (typeof value.health_ar === 'string') product.health_ar = value.health_ar.trim();
  if (typeof value.tag_en === 'string') product.tag_en = value.tag_en.trim();
  if (typeof value.tag_ur === 'string') product.tag_ur = value.tag_ur.trim();
  if (typeof value.tag_ar === 'string') product.tag_ar = value.tag_ar.trim();

  // Margins
  if (value.targetMarginPercent !== undefined) {
    const margin = Number(value.targetMarginPercent);
    if (!Number.isFinite(margin) || margin < 0 || margin > 100) {
      throw new CatalogError('INVALID_TARGET_MARGIN', 400);
    }
    product.targetMarginPercent = Math.round(margin * 100) / 100;
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

export function validateInternalDestination(path: unknown): string {
  if (typeof path !== 'string') throw new CatalogError('INVALID_DESTINATION_PATH', 400);
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\') || /^[a-z]+:/i.test(trimmed) || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new CatalogError('INVALID_DESTINATION_PATH', 400);
  }
  return trimmed;
}

export function validateMerchandisingSettings(value: unknown): {
  showcaseTabs: Array<{ id: string; label_en: string; label_ur: string; visible: boolean; productIds: string[] }>;
  featuredProductIds: string[];
  categoryOrder: string[];
  categoryVisibility: Record<string, boolean>;
  autoplay: { enabled: boolean; intervalMs: number; resumeDelayMs: number };
  autoplayDurationMs: number;
  autoplayResumeDelayMs: number;
  collections: Array<{ collectionId: string; title_en: string; title_ur: string; slug: string; image?: string; badge?: string; visible: boolean }>;
  occasions: Array<{ tag: string; title_en: string; title_ur: string; slug: string; icon?: string; visible: boolean }>;
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

  // Autoplay config
  const rawAutoplay = object(value.autoplay) ? (value.autoplay as Record<string, unknown>) : {};
  if (rawAutoplay.intervalMs !== undefined) {
    if (typeof rawAutoplay.intervalMs !== 'number' || !Number.isSafeInteger(rawAutoplay.intervalMs) || rawAutoplay.intervalMs < 1000 || rawAutoplay.intervalMs > 60000) {
      throw new CatalogError('INVALID_AUTOPLAY_CONFIG', 400);
    }
  }
  if (rawAutoplay.resumeDelayMs !== undefined) {
    if (typeof rawAutoplay.resumeDelayMs !== 'number' || !Number.isSafeInteger(rawAutoplay.resumeDelayMs) || rawAutoplay.resumeDelayMs < 500 || rawAutoplay.resumeDelayMs > 30000) {
      throw new CatalogError('INVALID_AUTOPLAY_CONFIG', 400);
    }
  }
  if (value.autoplayDurationMs !== undefined) {
    if (typeof value.autoplayDurationMs !== 'number' || !Number.isSafeInteger(value.autoplayDurationMs) || value.autoplayDurationMs < 1000 || value.autoplayDurationMs > 60000) {
      throw new CatalogError('INVALID_AUTOPLAY_CONFIG', 400);
    }
  }
  if (value.autoplayResumeDelayMs !== undefined) {
    if (typeof value.autoplayResumeDelayMs !== 'number' || !Number.isSafeInteger(value.autoplayResumeDelayMs) || value.autoplayResumeDelayMs < 500 || value.autoplayResumeDelayMs > 30000) {
      throw new CatalogError('INVALID_AUTOPLAY_CONFIG', 400);
    }
  }

  const autoplayDurationMs = typeof rawAutoplay.intervalMs === 'number'
    ? rawAutoplay.intervalMs
    : (typeof value.autoplayDurationMs === 'number' ? value.autoplayDurationMs : 6000);

  const autoplayResumeDelayMs = typeof rawAutoplay.resumeDelayMs === 'number'
    ? rawAutoplay.resumeDelayMs
    : (typeof value.autoplayResumeDelayMs === 'number' ? value.autoplayResumeDelayMs : 3000);

  const autoplay = {
    enabled: typeof rawAutoplay.enabled === 'boolean' ? rawAutoplay.enabled : true,
    intervalMs: autoplayDurationMs,
    resumeDelayMs: autoplayResumeDelayMs,
  };

  // Showcase tabs
  const showcaseTabs = Array.isArray(value.showcaseTabs)
    ? value.showcaseTabs.map((tab: any) => {
        if (!object(tab) || typeof tab.id !== 'string' || !tab.id.trim()) throw new CatalogError('INVALID_SHOWCASE_TAB', 400);
        return {
          id: tab.id.trim(),
          label_en: typeof tab.label_en === 'string' ? tab.label_en.trim() : tab.id.trim(),
          label_ur: typeof tab.label_ur === 'string' ? tab.label_ur.trim() : (typeof tab.label_en === 'string' ? tab.label_en.trim() : tab.id.trim()),
          visible: tab.visible !== false,
          productIds: Array.isArray(tab.productIds) ? tab.productIds.filter((p: any) => typeof p === 'string' && p.trim()).map((p: any) => p.trim()) : [],
        };
      })
    : [];

  // Collections
  const collections = Array.isArray(value.collections)
    ? value.collections.map((col: any) => {
        if (!object(col)) throw new CatalogError('INVALID_COLLECTION_DATA', 400);
        const collectionId = typeof col.collectionId === 'string' && col.collectionId.trim()
          ? col.collectionId.trim()
          : (typeof col.id === 'string' && col.id.trim() ? col.id.trim() : '');
        if (!collectionId) throw new CatalogError('INVALID_COLLECTION_DATA', 400);
        const rawSlug = col.slug || col.destination || `/shop?category=${collectionId}`;
        const slug = validateInternalDestination(rawSlug);
        return {
          id: collectionId,
          collectionId,
          title_en: typeof col.title_en === 'string' ? col.title_en.trim() : collectionId,
          title_ur: typeof col.title_ur === 'string' ? col.title_ur.trim() : (typeof col.title_en === 'string' ? col.title_en.trim() : collectionId),
          slug,
          destination: slug,
          image: typeof col.image === 'string' && col.image.trim() ? col.image.trim() : undefined,
          badge: typeof col.badge === 'string' && col.badge.trim() ? col.badge.trim() : undefined,
          visible: col.visible !== false,
        };
      })
    : [];

  // Occasions
  const occasions = Array.isArray(value.occasions)
    ? value.occasions.map((occ: any) => {
        if (!object(occ)) throw new CatalogError('INVALID_OCCASION_DATA', 400);
        const tag = typeof occ.tag === 'string' && occ.tag.trim()
          ? occ.tag.trim()
          : (typeof occ.id === 'string' && occ.id.trim() ? occ.id.trim() : (typeof occ.occasionId === 'string' && occ.occasionId.trim() ? occ.occasionId.trim() : ''));
        if (!tag) throw new CatalogError('INVALID_OCCASION_DATA', 400);
        const rawSlug = occ.slug || occ.destination || `/occasions/${tag}`;
        const slug = validateInternalDestination(rawSlug);
        return {
          id: tag,
          tag,
          title_en: typeof occ.title_en === 'string' ? occ.title_en.trim() : tag,
          title_ur: typeof occ.title_ur === 'string' ? occ.title_ur.trim() : (typeof occ.title_en === 'string' ? occ.title_en.trim() : tag),
          slug,
          destination: slug,
          icon: typeof occ.icon === 'string' && occ.icon.trim() ? occ.icon.trim() : undefined,
          visible: occ.visible !== false,
        };
      })
    : [];

  const revision = typeof value.revision === 'number' && Number.isSafeInteger(value.revision) && value.revision >= 0
    ? value.revision
    : 0;
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString();
  const updatedBy = typeof value.updatedBy === 'string' ? value.updatedBy : undefined;

  return {
    showcaseTabs,
    featuredProductIds,
    categoryOrder,
    categoryVisibility,
    autoplay,
    autoplayDurationMs,
    autoplayResumeDelayMs,
    collections,
    occasions,
    revision,
    updatedAt,
    updatedBy,
  };
}
