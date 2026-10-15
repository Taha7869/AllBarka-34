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
    || !(value.shippingWeightG === null || positive(value.shippingWeightG))) throw new CatalogError('INVALID_CATALOG_PRICING');
  const seen = new Set<string>();
  const variants = value.variants.map((raw): CatalogVariant => {
    if (!object(raw) || typeof raw.label !== 'string' || !raw.label.trim() || raw.label.length > 40
      || /[\u0000-\u001f\u007f]/.test(raw.label) || raw.label !== raw.label.trim()
      || raw.id !== catalogVariantId(raw.label) || !positive(raw.price) || typeof raw.available !== 'boolean'
      || !(raw.weightGrams === null || positive(raw.weightGrams)) || seen.has(raw.label)) throw new CatalogError('INVALID_CATALOG_VARIANT');
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
