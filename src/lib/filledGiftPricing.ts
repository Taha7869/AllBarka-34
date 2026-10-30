import type { Product } from '../types';
import { isPackagingProduct, parsePiecesPerPack } from './packagingMoq';
import { convertMeasurement, type MeasurementUnit } from './productCommerce';

export interface RecipeIngredient {
  productId: string;
  grams: number;
}

export interface EstimatedIngredientLine {
  productId: string;
  name_en: string;
  kgRatePkr: number;
  gramsPerBox: number;
  totalGrams: number;
  estimatePkr: number;
}

export interface FilledGiftEstimateInput {
  packagingProduct?: Product | null;
  packagingUnitPrice?: number | null;
  packagingRequired?: boolean;
  recipe?: RecipeIngredient[];
  catalogProducts: Product[];
  requestedBoxes?: number;
}

export type EstimateUnavailabilityReason =
  | 'INVALID_QUANTITY'
  | 'MISSING_RECIPE'
  | 'INVALID_RECIPE'
  | 'MISSING_INGREDIENT'
  | 'UNAVAILABLE_KG_RATE'
  | 'MISSING_PACKAGING_PRICE'
  | 'ESTIMATE_OVERFLOW';

export interface FilledGiftEstimateResult {
  isAvailable: boolean;
  unavailabilityReason?: EstimateUnavailabilityReason;
  ingredientsAvailable: boolean;
  ingredientLines: EstimatedIngredientLine[];
  requestedBoxes: number | null;
  ingredientsSubtotalPkr: number | null;
  ingredientsTotalPkr: number | null;
  packagingUnitPrice: number | null;
  packagingTotalPkr: number | null;
  estimatedTotalPkr: number | null;
  isEstimate: true;
}

export const MAX_RECIPE_INGREDIENTS = 30;
export const MAX_INGREDIENT_GRAMS = 10_000;
export const MAX_ESTIMATE_BOXES = 100_000;

const MICRO = 1_000_000n;

function failure(reason: EstimateUnavailabilityReason, boxes: number | null, partial: Partial<FilledGiftEstimateResult> = {}): FilledGiftEstimateResult {
  return {
    isAvailable: false,
    unavailabilityReason: reason,
    ingredientsAvailable: false,
    ingredientLines: [],
    requestedBoxes: boxes,
    ingredientsSubtotalPkr: null,
    ingredientsTotalPkr: null,
    packagingUnitPrice: null,
    packagingTotalPkr: null,
    estimatedTotalPkr: null,
    isEstimate: true,
    ...partial,
  };
}

const validBoxes = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= MAX_ESTIMATE_BOXES;
const validRate = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 100_000_000;

function milliGrams(grams: unknown): bigint | null {
  if (typeof grams !== 'number' || !Number.isFinite(grams) || grams <= 0 || grams > MAX_INGREDIENT_GRAMS) return null;
  const scaled = Math.round(grams * 1000);
  if (scaled <= 0 || Math.abs(grams * 1000 - scaled) > 1e-6) return null;
  return BigInt(scaled);
}

const roundHalfUp = (numerator: bigint, denominator: bigint) => (numerator * 2n + denominator) / (denominator * 2n);

/* ------------------------------------------------------------------ recipes */

/** Strict validation for admin saves. Throws an Error whose message is a stable code. */
export function validateRecipeIngredients(value: unknown): RecipeIngredient[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_RECIPE_INGREDIENTS) throw new Error('INVALID_RECIPE_INGREDIENTS');
  const seen = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('INVALID_RECIPE_INGREDIENT');
    const { productId, grams } = item as Record<string, unknown>;
    if (typeof productId !== 'string' || !/^[a-z0-9_-]{2,80}$/.test(productId.trim())) throw new Error('INVALID_RECIPE_INGREDIENT');
    const id = productId.trim();
    if (seen.has(id)) throw new Error('DUPLICATE_RECIPE_INGREDIENT');
    seen.add(id);
    if (milliGrams(grams) === null) throw new Error('INVALID_RECIPE_GRAMS');
    return { productId: id, grams: grams as number };
  });
}

/** Non-throwing read adapter: an invalid stored recipe is treated as absent (unpriced), never repaired. */
export function readRecipeIngredients(value: unknown): RecipeIngredient[] | undefined {
  try { return validateRecipeIngredients(value); } catch { return undefined; }
}

export function validateFilledRecipes(value: unknown): Record<string, RecipeIngredient[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_FILLED_RECIPES');
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 40) throw new Error('INVALID_FILLED_RECIPES');
  const out: Record<string, RecipeIngredient[]> = {};
  for (const [label, list] of entries) {
    const key = label.trim();
    if (!key || key.length > 160 || /[\u0000-\u001f\u007f]/.test(key) || Object.hasOwn(out, key)) throw new Error('INVALID_FILLED_RECIPES');
    out[key] = validateRecipeIngredients(list);
  }
  return out;
}

export function readFilledRecipes(value: unknown): Record<string, RecipeIngredient[]> | undefined {
  try { return validateFilledRecipes(value); } catch { return undefined; }
}

/* -------------------------------------------------------------- classification */

export type PackagingVariantKind = 'empty' | 'filled' | 'unknown';

/**
 * Checks whether a packaging variant label indicates a filled dry-fruit configuration
 * that requires merchant quotation rather than direct checkout.
 * Kept for full backward compatibility with legacy callers.
 */
export function isFilledPackagingVariant(label?: string | null): boolean {
  if (!label || typeof label !== 'string') return false;
  const lower = label.toLowerCase().trim();
  if (lower.startsWith('empty')) return false;
  return /\bfilled\b|\bassorted\b|\bwith\s+dry\s+fruits\b/i.test(lower);
}

/**
 * Trusted classification of a packaging variant. Configuration wins over wording:
 * configured recipes and bid-box filled options are filled; configured empty tiers and admin
 * piece/pack count options are empty. Legacy English markers are kept only for compiled seed labels.
 * Everything else is 'unknown' and is treated as requiring an inquiry (default-deny).
 */
export function classifyPackagingVariant(product: Product | null | undefined, label: unknown): PackagingVariantKind {
  if (!product || typeof label !== 'string' || !label.trim()) return 'unknown';
  const key = label.trim();
  if (product.filledRecipes && Object.hasOwn(product.filledRecipes, key)) return 'filled';
  const config = product.bidBoxConfig;
  if (Array.isArray(config?.filledOptions) && config.filledOptions.some(option => option?.variantKey === key)) return 'filled';
  if (Array.isArray(config?.emptyTiers) && config.emptyTiers.some(tier => tier?.variantKey === key)) return 'empty';
  if (/^empty\b/i.test(key)) return 'empty';
  if (/\b(?:filled|assorted)\b|with\s+dry\s+fruits/i.test(key)) return 'filled';
  const option = product.commerce?.options?.find(candidate => candidate?.label?.trim() === key);
  if (product.commerce?.kind === 'packaging' && option && (option.unit === 'piece' || option.unit === 'pack')) return 'empty';
  return 'unknown';
}

/**
 * True when a selection must go through the inquiry / final-quote flow instead of direct checkout:
 * any variant with a configured recipe, and every non-empty (filled or unclassifiable) packaging variant.
 * Ordinary food and empty packaging are unaffected; incidental wording on food never matters.
 */
export function packagingVariantRequiresInquiry(product: Product | null | undefined, label: unknown): boolean {
  if (!product) return false;
  if (typeof label === 'string' && product.filledRecipes && Object.hasOwn(product.filledRecipes, label.trim())) return true;
  if (!isPackagingProduct(product)) return false;
  return classifyPackagingVariant(product, label) !== 'empty';
}

/* ----------------------------------------------------------------- kg rate */

const KG_LABEL = /^1\s*kg$/i;
const unavailableVariant = (variant: { available?: boolean; inStock?: boolean } | null | undefined) =>
  !variant || variant.available === false || variant.inStock === false;

function isNetOneKilogram(quantity: unknown, unit: unknown): boolean {
  if (typeof quantity !== 'number' || (unit !== 'mg' && unit !== 'g' && unit !== 'kg')) return false;
  try { return convertMeasurement(quantity, unit as MeasurementUnit, 'g') === 1000; } catch { return false; }
}

function baseIsOneKilogram(commerce: NonNullable<Product['commerce']>): boolean {
  return commerce.pricingMode === 'calculated' && isNetOneKilogram(commerce.baseQuantity, commerce.baseUnit);
}

/**
 * Current authoritative 1kg selling rate in PKR, or null when it cannot be proven.
 * Sources: an explicit merchant 1kg option/label (manual or override) or a calculated base that is itself
 * exactly 1kg. Never derived from smaller packs or smaller bases, per-100g rates, supplier cost,
 * shipping weight or compiled fallbacks. Conflicting prices or any unavailable representation fail closed.
 */
export function resolveAuthoritativeKgRate(product: Product | null | undefined): number | null {
  if (!product) return null;
  if (product.active === false || product.status === 'draft' || product.status === 'archived' || product.quoteOnly === true || product.orderMode === 'inquiry_quote') return null;

  // 1. Any variant explicitly matching 1kg that is unavailable or out of stock fails closed
  const matchingVariants = (product.variants || []).filter(v => typeof v?.label === 'string' && KG_LABEL.test(v.label.trim()));
  if (matchingVariants.some(unavailableVariant)) return null;

  // 2. Commerce configuration inspection
  if (product.commerce) {
    const options = Array.isArray(product.commerce.options) ? product.commerce.options : [];
    const kgOption = options.find(opt => opt && isNetOneKilogram(opt.quantity, opt.unit));
    if (kgOption) {
      if (kgOption.available === false) return null;
      if (product.commerce.pricingMode === 'calculated' && !kgOption.override) {
        // A calculated 1kg option is explicit only when the merchant's base rate is itself per 1kg.
        if (!baseIsOneKilogram(product.commerce)) return null;
        return validRate(product.commerce.basePrice) ? product.commerce.basePrice : null;
      }
      if (kgOption.override && typeof (kgOption as any).price === 'number') {
        const pr = (kgOption as any).price;
        if (validRate(pr)) return pr;
      }
    } else if (baseIsOneKilogram(product.commerce)) {
      return validRate(product.commerce.basePrice) ? product.commerce.basePrice : null;
    }
  }

  // 3. Inspect product.prices
  const pricesList: number[] = [];
  if (product.prices && typeof product.prices === 'object') {
    for (const [key, val] of Object.entries(product.prices)) {
      if (KG_LABEL.test(key.trim())) {
        if (validRate(val)) pricesList.push(val);
        else return null;
      }
    }
  }
  if (new Set(pricesList).size > 1) return null; // Conflicting rates in prices fail closed
  if (pricesList.length === 1) {
    return pricesList[0];
  }

  // 4. Fallback to matching variants if not in product.prices
  const variantRates = matchingVariants.map(v => v.price).filter(validRate);
  if (variantRates.length === 0 || new Set(variantRates).size > 1) return null;
  return variantRates[0];
}

/* --------------------------------------------------------------- arithmetic */

/** kgRatePkr * grams * boxes / 1000, half-up integer PKR. Throws a stable code on invalid input. */
export function calculateIngredientEstimate(kgRatePkr: number, gramsPerBox: number, requestedBoxes: number = 1): number {
  const grams = milliGrams(gramsPerBox);
  if (!validRate(kgRatePkr) || grams === null || !validBoxes(requestedBoxes)) throw new Error('INVALID_ESTIMATE_ARGUMENTS');
  const rounded = roundHalfUp(BigInt(kgRatePkr) * grams * BigInt(requestedBoxes), MICRO);
  if (rounded <= 0n) throw new Error('ESTIMATE_TOO_SMALL');
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('ESTIMATE_OVERFLOW');
  return Number(rounded);
}

/** Recipe selection for a packaging variant: its own configured recipe, or the product recipe for its single filled variant. */
export function resolveFilledRecipe(product: Product | null | undefined, label: unknown): RecipeIngredient[] | null {
  if (!product || typeof label !== 'string') return null;
  const key = label.trim();
  const own = product.filledRecipes && Object.hasOwn(product.filledRecipes, key) ? readRecipeIngredients(product.filledRecipes[key]) : undefined;
  if (own) return own;
  const shared = readRecipeIngredients(product.recipeIngredients);
  if (!shared || classifyPackagingVariant(product, key) !== 'filled') return null;
  const filledLabels = Object.keys(product.prices || {}).filter(candidate => classifyPackagingVariant(product, candidate) === 'filled');
  return filledLabels.length === 1 && filledLabels[0].trim() === key ? shared : null;
}

/** Per-box price of actual empty packaging for the requested quantity. */
export function resolveEmptyPackagingUnitPrice(product: Product | null | undefined, boxes: number): number | null {
  if (!product || !validBoxes(boxes)) return null;
  const disabled = new Set((product.variants || []).filter(unavailableVariant).map(variant => variant.label));
  let best: { pieces: number; unit: number } | null = null;
  let smallest: { pieces: number; unit: number } | null = null;

  for (const [label, price] of Object.entries(product.prices || {})) {
    if (disabled.has(label) || !Number.isFinite(price) || price <= 0 || classifyPackagingVariant(product, label) !== 'empty') continue;
    const pieces = parsePiecesPerPack(label, product);
    if (!Number.isSafeInteger(pieces) || pieces < 1) continue;
    const unit = Math.round((price / pieces) * 100) / 100;
    if (pieces <= boxes) {
      if (!best || pieces > best.pieces) best = { pieces, unit };
    }
    if (!smallest || pieces < smallest.pieces) {
      smallest = { pieces, unit };
    }
  }

  if (Array.isArray(product.bidBoxConfig?.emptyTiers)) {
    for (const tier of product.bidBoxConfig.emptyTiers) {
      if (!tier || disabled.has(tier.variantKey) || !Number.isFinite(tier.unitPrice) || tier.unitPrice <= 0) continue;
      const pieces = tier.qty;
      if (!Number.isSafeInteger(pieces) || pieces < 1) continue;
      const unit = tier.unitPrice;
      if (pieces <= boxes) {
        if (!best || pieces > best.pieces) best = { pieces, unit };
      }
      if (!smallest || pieces < smallest.pieces) {
        smallest = { pieces, unit };
      }
    }
  }

  return best ? best.unit : (smallest ? smallest.unit : null);
}

/**
 * Shared deterministic estimate. The ingredient subtotal is reported separately from the complete box
 * total: the total stays null until every required component (ingredients and packaging) is known.
 */
export function calculateFilledGiftEstimate({
  packagingProduct,
  recipe,
  packagingUnitPrice,
  packagingRequired,
  catalogProducts,
  requestedBoxes = 1,
}: FilledGiftEstimateInput): FilledGiftEstimateResult {
  if (!validBoxes(requestedBoxes)) return failure('INVALID_QUANTITY', null);

  const effectiveRecipe =
    recipe && recipe.length > 0
      ? recipe
      : packagingProduct?.recipeIngredients && packagingProduct.recipeIngredients.length > 0
      ? packagingProduct.recipeIngredients
      : null;

  if (!effectiveRecipe || !Array.isArray(effectiveRecipe) || effectiveRecipe.length === 0) {
    return failure('MISSING_RECIPE', requestedBoxes);
  }

  let list: RecipeIngredient[];
  try { list = validateRecipeIngredients(effectiveRecipe); } catch { return failure('INVALID_RECIPE', requestedBoxes); }

  const lines: EstimatedIngredientLine[] = [];
  let exact = 0n;
  try {
    for (const item of list) {
      const product = catalogProducts.find(candidate => candidate.id === item.productId);
      if (!product) return failure('MISSING_INGREDIENT', requestedBoxes);
      const rate = resolveAuthoritativeKgRate(product);
      if (rate === null) return failure('UNAVAILABLE_KG_RATE', requestedBoxes);
      exact += BigInt(rate) * milliGrams(item.grams)! * BigInt(requestedBoxes);
      lines.push({
        productId: product.id,
        name_en: product.name_en || product.id,
        kgRatePkr: rate,
        gramsPerBox: item.grams,
        totalGrams: Math.round(item.grams * 1000) * requestedBoxes / 1000,
        estimatePkr: calculateIngredientEstimate(rate, item.grams, requestedBoxes),
      });
    }
  } catch { return failure('ESTIMATE_OVERFLOW', requestedBoxes); }

  const subtotal = roundHalfUp(exact, MICRO);
  if (subtotal <= 0n || subtotal > BigInt(Number.MAX_SAFE_INTEGER)) return failure('ESTIMATE_OVERFLOW', requestedBoxes);
  const ingredientsSubtotalPkr = Number(subtotal);
  const base = {
    ingredientsAvailable: true,
    ingredientLines: lines,
    ingredientsSubtotalPkr,
    ingredientsTotalPkr: ingredientsSubtotalPkr,
    requestedBoxes,
  };

  let resolvedPackagingUnit =
    typeof packagingUnitPrice === 'number' && Number.isFinite(packagingUnitPrice) && packagingUnitPrice > 0
      ? packagingUnitPrice
      : null;

  if (resolvedPackagingUnit === null && packagingProduct) {
    resolvedPackagingUnit = resolveEmptyPackagingUnitPrice(packagingProduct, requestedBoxes);
  }

  let packagingTotal: number | null = null;
  if (resolvedPackagingUnit !== null) {
    const total = Math.round(resolvedPackagingUnit * requestedBoxes);
    if (!Number.isSafeInteger(total) || total <= 0) return failure('ESTIMATE_OVERFLOW', requestedBoxes, base);
    packagingTotal = total;
  }

  const isPackagingNeeded = packagingRequired !== undefined ? packagingRequired : Boolean(packagingProduct);
  if (isPackagingNeeded && packagingTotal === null) {
    return failure('MISSING_PACKAGING_PRICE', requestedBoxes, base);
  }

  const estimatedTotalPkr = ingredientsSubtotalPkr + (packagingTotal ?? 0);
  if (!Number.isSafeInteger(estimatedTotalPkr)) return failure('ESTIMATE_OVERFLOW', requestedBoxes, base);

  return {
    isAvailable: true,
    ...base,
    packagingUnitPrice: resolvedPackagingUnit,
    packagingTotalPkr: packagingTotal,
    estimatedTotalPkr,
    isEstimate: true,
  };
}
