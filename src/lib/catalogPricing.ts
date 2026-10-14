import { PRODUCTS } from '../data/products';
import type { Product } from '../types';
import { HAMPER_BOXES, type HamperBox } from './hamperCatalog';
import { MIN_CUSTOM_WEIGHT_G, MAX_CUSTOM_WEIGHT_G, CUSTOM_WEIGHT_STEP_G } from './productVariants';

export const PRODUCT_PRICE_COLLECTION = 'products';
export const BOX_PRICE_COLLECTION = 'catalogBoxes';
export const PRICE_AUDIT_COLLECTION = 'catalogPriceAudits';
export const MAX_CATALOG_PRICE = 1_000_000;

export class CatalogPricingError extends Error {
  constructor(public code: string, public httpStatus = 400) { super(code); this.name = 'CatalogPricingError'; }
}

export interface ProductPricing {
  prices: Record<string, number>;
  wholesale: number;
  active: boolean;
  allowCustomWeight: boolean;
  pricePer100g: number;
  minCustomWeightG: number;
  maxCustomWeightG: number;
}
export interface BoxPricing { price: number; active: boolean }
export interface CatalogSnapshot {
  catalog: Product[];
  boxes: HamperBox[];
  source: 'firestore' | 'static';
  revision: string;
}
export interface CatalogPriceRecord {
  kind: 'products' | 'boxes';
  id: string;
  initialized: boolean;
  version: string;
  revision: number;
  updatedAt: string | null;
  pricing: ProductPricing | BoxPricing;
}
export interface CatalogPriceAudit {
  revision: number;
  updatedAt: string;
  reason: string;
  previousPricing: ProductPricing | BoxPricing | null;
  pricing: ProductPricing | BoxPricing;
}

const productById = new Map(PRODUCTS.map(product => [product.id, product]));
export function canonicalPriceTarget(kind: unknown, id: unknown): Product | HamperBox {
  const target = typeof id === 'string' ? kind === 'products' ? productById.get(id)
    : kind === 'boxes' ? HAMPER_BOXES.find(box => box.id === id) : undefined : undefined;
  if (!target) throw new CatalogPricingError('UNKNOWN_PRICE_TARGET', 404);
  return target;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CatalogPricingError('INVALID_CATALOG_PRICE');
  return value as Record<string, unknown>;
}
function money(value: unknown, allowZero = false): number {
  if (!Number.isSafeInteger(value) || (value as number) < (allowZero ? 0 : 1) || (value as number) > MAX_CATALOG_PRICE) {
    throw new CatalogPricingError('INVALID_CATALOG_PRICE');
  }
  return value as number;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new CatalogPricingError('INVALID_CATALOG_PRICE');
  return value;
}
function grams(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < MIN_CUSTOM_WEIGHT_G || (value as number) > MAX_CUSTOM_WEIGHT_G || (value as number) % CUSTOM_WEIGHT_STEP_G !== 0) throw new CatalogPricingError('INVALID_CATALOG_PRICE');
  return value as number;
}

/** Commercial fields only. IDs, shipping weights, media, points and staff fields cannot be edited here. */
export function defaultProductPricing(product: Product): ProductPricing {
  return { prices: { ...product.prices }, wholesale: product.wholesale, active: product.active !== false,
    allowCustomWeight: product.allowCustomWeight === true, pricePer100g: product.pricePer100g || 0,
    minCustomWeightG: product.minCustomWeightG || 100, maxCustomWeightG: product.maxCustomWeightG || 2000 };
}
export function validateProductPricing(product: Product, raw: unknown, strict = false): ProductPricing {
  const input = object(raw);
  const defaults = defaultProductPricing(product);
  const allowed = Object.keys(defaults);
  if (strict && (Object.keys(input).some(key => !allowed.includes(key)) || allowed.some(key => !Object.hasOwn(input, key)))) {
    throw new CatalogPricingError('INVALID_CATALOG_PRICE');
  }
  const prices = object(input.prices);
  const portions = Object.keys(product.prices);
  if (Object.keys(prices).length !== portions.length || portions.some(portion => !Object.hasOwn(prices, portion))) {
    throw new CatalogPricingError('INVALID_CATALOG_PORTIONS');
  }
  const canonicalPrices = Object.fromEntries(portions.map(portion => [portion, money(prices[portion])]));
  // Legacy full-product documents are accepted; the public response never copies their other fields.
  const values = { ...defaults, ...Object.fromEntries(allowed.filter(key => key !== 'prices' && Object.hasOwn(input, key)).map(key => [key, input[key]])) };
  const pricing: ProductPricing = { prices: canonicalPrices, wholesale: money(values.wholesale, true),
    active: boolean(values.active), allowCustomWeight: boolean(values.allowCustomWeight), pricePer100g: money(values.pricePer100g, true),
    minCustomWeightG: grams(values.minCustomWeightG), maxCustomWeightG: grams(values.maxCustomWeightG) };
  if (pricing.minCustomWeightG > pricing.maxCustomWeightG || pricing.allowCustomWeight && (pricing.pricePer100g <= 0 || product.isBundle || product.quoteOnly || ['oils', 'bundles', 'gift-boxes'].includes(product.category))) {
    throw new CatalogPricingError('INVALID_CATALOG_CUSTOM_WEIGHT');
  }
  return pricing;
}
export function validateBoxPricing(raw: unknown, strict = false): BoxPricing {
  const input = object(raw);
  if (strict && (Object.keys(input).length !== 2 || !Object.hasOwn(input, 'price') || !Object.hasOwn(input, 'active'))) throw new CatalogPricingError('INVALID_CATALOG_PRICE');
  return { price: money(input.price), active: input.active === undefined && !strict ? true : boolean(input.active) };
}
export function productWithPricing(product: Product, pricing: ProductPricing): Product {
  return { ...product, ...pricing, variants: Object.entries(pricing.prices).map(([label, price]) => ({ label, price })),
    // Old single-price consumers must also see the effective canonical first portion.
    price: Object.values(pricing.prices)[0] };
}
export function boxWithPricing(box: HamperBox, pricing: BoxPricing): HamperBox { return { ...box, ...pricing }; }

/** Validate the complete API view, then reconstruct from immutable public metadata. */
export function parseCatalogResponse(raw: unknown): CatalogSnapshot {
  const input = object(raw);
  if (!Array.isArray(input.catalog) || input.catalog.length !== PRODUCTS.length || !Array.isArray(input.boxes) || input.boxes.length !== HAMPER_BOXES.length
    || !['firestore', 'static'].includes(String(input.source)) || typeof input.revision !== 'string' || !/^[a-f0-9]{64}$/.test(input.revision)) {
    throw new CatalogPricingError('INVALID_CATALOG_RESPONSE');
  }
  const byId = new Map(input.catalog.map(value => { const entry = object(value); return [entry.id, entry]; }));
  const boxesById = new Map(input.boxes.map(value => { const entry = object(value); return [entry.id, entry]; }));
  return { source: input.source as CatalogSnapshot['source'], revision: input.revision,
    catalog: PRODUCTS.map(product => productWithPricing(product, validateProductPricing(product, byId.get(product.id)))),
    boxes: HAMPER_BOXES.map(box => boxWithPricing(box, validateBoxPricing(boxesById.get(box.id)))) };
}
