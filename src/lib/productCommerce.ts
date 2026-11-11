import type { Product } from '../types';
import { ValidationError } from './validationError';

export const MEASUREMENT_UNITS = ['mg', 'g', 'kg', 'ml', 'L', 'piece', 'pack'] as const;
export type MeasurementUnit = typeof MEASUREMENT_UNITS[number];
export type QuantityMode = 'fixed' | 'custom' | 'both';
export interface CommerceOption {
  label: string;
  quantity: number;
  unit: MeasurementUnit;
  override: boolean;
  available: boolean;
  shippingWeightG: number | null;
  moqOverride?: number;
  /** Total physical pieces in this purchasable option, independent of its display label. */
  piecesPerPack?: number;
}
export interface ProductCommerce {
  version: 1;
  kind: 'food' | 'liquid' | 'packaging' | 'gift';
  pricingMode: 'manual' | 'calculated';
  quantityMode: QuantityMode;
  baseQuantity: number | null;
  baseUnit: MeasurementUnit;
  basePrice: number | null;
  options: CommerceOption[];
  custom: { unit: MeasurementUnit; min: number; max: number; step: number; shippingWeightGPerUnit: number | null } | null;
}
export interface ProductSeo {
  title_en?: string; title_ur?: string; title_ar?: string;
  description_en?: string; description_ur?: string; description_ar?: string;
  imageAlt_en?: string; imageAlt_ur?: string; imageAlt_ar?: string;
  socialImage?: string;
}
export interface ProductAttribute {
  key: string;
  label_en: string; label_ur: string; label_ar: string;
  type: 'text' | 'number' | 'select';
  required: boolean;
  options: string[];
  value: string | number;
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const fail = (code: string): never => { throw new ValidationError(code, code); };
const positive = (v: unknown, max = 10_000_000): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max && Math.abs(v * 1e6 - Math.round(v * 1e6)) < 0.001;
export const isMeasurementUnit = (v: unknown): v is MeasurementUnit => (MEASUREMENT_UNITS as readonly unknown[]).includes(v);
const dimensions: Record<MeasurementUnit, string> = { mg: 'mass', g: 'mass', kg: 'mass', ml: 'volume', L: 'volume', piece: 'piece', pack: 'pack' };
const factors: Record<MeasurementUnit, number> = { mg: 1, g: 1000, kg: 1_000_000, ml: 1, L: 1000, piece: 1, pack: 1 };

/** A pack has no implied number of pieces. Volume never implies physical mass. */
export function convertMeasurement(amount: number, from: MeasurementUnit, to: MeasurementUnit): number {
  if (!positive(amount) || !isMeasurementUnit(from) || !isMeasurementUnit(to) || dimensions[from] !== dimensions[to]) return fail('INCOMPATIBLE_MEASUREMENT');
  return amount * factors[from] / factors[to];
}
export function measurementLabel(quantity: number, unit: MeasurementUnit): string {
  return `${Number(quantity.toFixed(6))}${unit === 'piece' || unit === 'pack' ? ' ' : ''}${unit === 'piece' ? 'pcs' : unit}`;
}
export function calculatedUnitPrice(commerce: Pick<ProductCommerce, 'baseQuantity' | 'baseUnit' | 'basePrice'>, amount: number, unit: MeasurementUnit): number {
  if (!positive(commerce.baseQuantity) || !positive(commerce.basePrice) || !Number.isSafeInteger(commerce.basePrice)) return fail('BASE_RATE_REQUIRED');
  convertMeasurement(amount, unit, commerce.baseUnit);
  // Integer rational arithmetic gives exact half-up PKR rounding for six-decimal quantities.
  const numerator = BigInt(Math.round(amount * 1e6)) * BigInt(factors[unit]) * BigInt(commerce.basePrice);
  const denominator = BigInt(Math.round(commerce.baseQuantity * 1e6)) * BigInt(factors[commerce.baseUnit]);
  const price = Number((numerator * 2n + denominator) / (denominator * 2n));
  if (!Number.isSafeInteger(price) || price <= 0 || price > 10_000_000) return fail('INVALID_CALCULATED_PRICE');
  return price;
}

export function validateProductCommerce(value: unknown, allowIncomplete = false): ProductCommerce {
  if (!record(value) || value.version !== 1 || !['food', 'liquid', 'packaging', 'gift'].includes(String(value.kind))
    || !['manual', 'calculated'].includes(String(value.pricingMode)) || !['fixed', 'custom', 'both'].includes(String(value.quantityMode))
    || !isMeasurementUnit(value.baseUnit) || !Array.isArray(value.options) || value.options.length > 20) return fail('INVALID_COMMERCE_CONFIGURATION');
  const baseQuantity = value.baseQuantity === null || value.baseQuantity === undefined ? null : value.baseQuantity;
  const basePrice = value.basePrice === null || value.basePrice === undefined ? null : value.basePrice;
  if (baseQuantity !== null && !positive(baseQuantity)) return fail('INVALID_BASE_QUANTITY');
  if (basePrice !== null && (!positive(basePrice) || !Number.isSafeInteger(basePrice))) return fail('INVALID_BASE_PRICE');
  if (!allowIncomplete && (value.pricingMode === 'calculated' || value.quantityMode !== 'fixed') && (!baseQuantity || !basePrice)) return fail('BASE_RATE_REQUIRED');
  const labels = new Set<string>();
  const options = value.options.map((item): CommerceOption => {
    if (!record(item) || !positive(item.quantity) || !isMeasurementUnit(item.unit)
      || typeof item.available !== 'boolean' || typeof item.override !== 'boolean') return fail('INVALID_COMMERCE_OPTION');
    if (['piece', 'pack'].includes(item.unit) && !Number.isSafeInteger(item.quantity)) return fail('INVALID_COUNT_QUANTITY');
    const label = typeof item.label === 'string' && item.label.trim() ? item.label.trim() : measurementLabel(item.quantity, item.unit);
    if (label.length > 40 || /[\u0000-\u001f\u007f]/.test(label) || labels.has(label) || /^Custom\s/i.test(label)) return fail('INVALID_COMMERCE_LABEL');
    labels.add(label);
    if (value.pricingMode === 'calculated' && !item.override) convertMeasurement(item.quantity, item.unit, value.baseUnit as MeasurementUnit);
    const shippingWeightG = item.shippingWeightG === null || item.shippingWeightG === undefined ? null : item.shippingWeightG;
    if (shippingWeightG !== null && (!Number.isSafeInteger(shippingWeightG) || !positive(shippingWeightG))) return fail('INVALID_SHIPPING_WEIGHT');
    if (item.moqOverride !== undefined && (!Number.isSafeInteger(item.moqOverride) || !positive(item.moqOverride, 10000))) return fail('INVALID_MOQ_OVERRIDE');
    if (item.piecesPerPack !== undefined && (!Number.isSafeInteger(item.piecesPerPack) || !positive(item.piecesPerPack, 10000))) return fail('INVALID_PIECES_PER_PACK');
    if (item.unit === 'piece' && item.piecesPerPack !== undefined && item.piecesPerPack !== item.quantity) return fail('INVALID_PIECES_PER_PACK');
    return { label, quantity: item.quantity, unit: item.unit, override: item.override, available: item.available,
      shippingWeightG: shippingWeightG as number | null, ...(typeof item.moqOverride === 'number' ? { moqOverride: item.moqOverride } : {}),
      ...(typeof item.piecesPerPack === 'number' ? { piecesPerPack: item.piecesPerPack } : {}) };
  });
  let custom: ProductCommerce['custom'] = null;
  if (value.quantityMode !== 'fixed') {
    const c = value.custom;
    if (!record(c) || !isMeasurementUnit(c.unit) || !positive(c.min) || !positive(c.max) || !positive(c.step)
      || c.min > c.max || c.step > c.max || (c.max - c.min) / c.step > 1_000_000) return fail('INVALID_CUSTOM_QUANTITY');
    // Packaging uses explicit fixed packs to preserve its per-design MOQ contract.
    if (value.kind === 'packaging' || value.kind === 'gift' || ['piece', 'pack'].includes(c.unit)) return fail('CUSTOM_QUANTITY_REQUIRES_MASS_OR_VOLUME');
    convertMeasurement(c.min, c.unit, value.baseUnit);
    const shipping = c.shippingWeightGPerUnit === null || c.shippingWeightGPerUnit === undefined ? null : c.shippingWeightGPerUnit;
    if (shipping !== null && !positive(shipping)) return fail('INVALID_CUSTOM_SHIPPING_WEIGHT');
    custom = { unit: c.unit, min: c.min, max: c.max, step: c.step, shippingWeightGPerUnit: shipping as number | null };
  }
  return { version: 1, kind: value.kind as ProductCommerce['kind'], pricingMode: value.pricingMode as ProductCommerce['pricingMode'],
    quantityMode: value.quantityMode as QuantityMode, baseQuantity: baseQuantity as number | null, basePrice: basePrice as number | null,
    baseUnit: value.baseUnit, options, custom };
}

export function measurementShippingWeight(amount: number, unit: MeasurementUnit, category: string, explicit: number | null): number | null {
  let weight = explicit;
  if (weight === null && dimensions[unit] === 'mass') weight = Math.max(1, Math.ceil(convertMeasurement(amount, unit, 'g')));
  // Retain the owner's existing oil delivery tariff without asserting density.
  if (weight === null && category === 'oils' && dimensions[unit] === 'volume') weight = Math.max(1, Math.ceil(convertMeasurement(amount, unit, 'ml')));
  if (weight !== null && (!Number.isSafeInteger(weight) || !positive(weight))) return fail('INVALID_SHIPPING_WEIGHT');
  return weight;
}

/** Called on an explicit commerce save. Canonical variants remain the saved price authority. */
export function prepareCommercePrices(value: Record<string, unknown>): Record<string, unknown> {
  if (value.commerce === undefined || value.commerce === null) return value;
  const quoteOnly = value.quoteOnly === true || value.orderMode === 'inquiry_quote';
  const commerce = validateProductCommerce(value.commerce, value.status === 'draft' || quoteOnly);
  const category = typeof value.category === 'string' ? value.category : '';
  const existingPrices = record(value.prices) ? value.prices : {};
  const isDraft = value.status === 'draft';
  const variants: Array<{ label: string; price: number; available: boolean; weightGrams: number | null; moqOverride?: number }> = [];
  if (commerce.quantityMode !== 'custom') for (const option of commerce.options) {
    if ((isDraft || quoteOnly) && commerce.pricingMode === 'calculated' && !option.override && (!commerce.baseQuantity || !commerce.basePrice)) continue;
    const amount = commerce.pricingMode === 'calculated' && !option.override
      ? calculatedUnitPrice(commerce, option.quantity, option.unit) : existingPrices[option.label];
    if (!positive(amount) || !Number.isSafeInteger(amount)) {
      if (isDraft || quoteOnly || !option.available) continue;
      return fail('OPTION_PRICE_REQUIRED');
    }
    variants.push({ label: option.label, price: amount, available: option.available,
      weightGrams: measurementShippingWeight(option.quantity, option.unit, category, option.shippingWeightG),
      ...(option.moqOverride ? { moqOverride: option.moqOverride } : {}) });
  }
  if (commerce.quantityMode === 'custom' && commerce.custom && commerce.basePrice && commerce.baseQuantity) {
    const selection = resolveCommerceQuantity({ category, commerce } as Product, commerce.custom.min);
    variants.push({ label: selection.label, price: selection.price, available: true, weightGrams: selection.weightGrams });
  }
  return { ...value, commerce, variants, isBidBox: commerce.kind === 'packaging' || value.isBidBox === true,
    prices: Object.fromEntries(variants.filter(v => v.available).map(v => [v.label, v.price])),
    shippingWeights: Object.fromEntries(variants.filter(v => v.weightGrams !== null).map(v => [v.label, v.weightGrams])),
    allowCustomWeight: false };
}

export function resolveCommerceQuantity(product: Pick<Product, 'commerce' | 'category'>, value: unknown) {
  const commerce = product.commerce;
  if (!commerce?.custom || commerce.quantityMode === 'fixed') return fail('CUSTOM_WEIGHT_UNAVAILABLE');
  const custom = commerce.custom;
  let amount: number;
  if (typeof value === 'number') amount = value;
  else if (typeof value === 'string') {
    const match = /^(?:Custom\s+)?(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/.exec(value.trim());
    if (!match || (match[2] && match[2] !== custom.unit)) return fail('INVALID_CUSTOM_QUANTITY');
    amount = Number(match[1]);
  } else return fail('INVALID_CUSTOM_QUANTITY');
  const steps = (amount - custom.min) / custom.step;
  if (!positive(amount) || amount < custom.min || amount > custom.max || Math.abs(steps - Math.round(steps)) > 1e-7) return fail('INVALID_CUSTOM_QUANTITY');
  const explicit = custom.shippingWeightGPerUnit === null ? null : Math.max(1, Math.ceil(amount * custom.shippingWeightGPerUnit));
  return { label: `Custom ${measurementLabel(amount, custom.unit)}`, price: calculatedUnitPrice(commerce, amount, custom.unit),
    weightGrams: measurementShippingWeight(amount, custom.unit, product.category, explicit), isCustom: true };
}

export function validateProductAttributes(value: unknown): ProductAttribute[] {
  if (!Array.isArray(value) || value.length > 24) return fail('INVALID_PRODUCT_ATTRIBUTES');
  const keys = new Set<string>();
  return value.map(item => {
    if (!record(item) || typeof item.key !== 'string' || !/^[a-z][a-z0-9_-]{0,39}$/.test(item.key) || keys.has(item.key)
      || !['text', 'number', 'select'].includes(String(item.type)) || typeof item.required !== 'boolean') return fail('INVALID_PRODUCT_ATTRIBUTE');
    keys.add(item.key);
    const text = (v: unknown, max = 120) => typeof v === 'string' && v.length <= max ? v.trim() : '';
    const label_en = text(item.label_en);
    if (!label_en) return fail('ATTRIBUTE_LABEL_REQUIRED');
    if (!Array.isArray(item.options) || item.options.length > 40 || item.options.some(o => typeof o !== 'string' || !o.trim() || o.length > 120)) return fail('INVALID_ATTRIBUTE_OPTIONS');
    const options = [...new Set((item.options as string[]).map(o => o.trim()))];
    if (item.type === 'number' && item.value !== '' && (typeof item.value !== 'number' || !Number.isFinite(item.value))) return fail('INVALID_ATTRIBUTE_VALUE');
    if (item.type !== 'number' && (typeof item.value !== 'string' || item.value.length > 1000)) return fail('INVALID_ATTRIBUTE_VALUE');
    const value = typeof item.value === 'string' ? item.value.trim() : item.value;
    if (item.type === 'select' && value !== '' && !options.includes(String(value))) return fail('INVALID_ATTRIBUTE_VALUE');
    return { key: item.key, label_en, label_ur: text(item.label_ur), label_ar: text(item.label_ar), type: item.type as ProductAttribute['type'],
      required: item.required, options, value: value as string | number };
  });
}
