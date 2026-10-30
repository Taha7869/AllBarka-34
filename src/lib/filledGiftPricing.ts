import type { Product } from '../types';
import { calculatedUnitPrice } from './productCommerce';

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
  recipe?: RecipeIngredient[];
  catalogProducts: Product[];
  requestedBoxes?: number;
}

export interface FilledGiftEstimateResult {
  isAvailable: boolean;
  unavailabilityReason?: 'MISSING_INGREDIENT' | 'UNAVAILABLE_KG_RATE' | 'MISSING_RECIPE' | 'INVALID_QUANTITY';
  ingredientLines: EstimatedIngredientLine[];
  packagingUnitPrice: number | null;
  packagingTotalPkr: number | null;
  ingredientsTotalPkr: number | null;
  estimatedTotalPkr: number | null;
  isEstimate: true;
}

/**
 * Checks whether a packaging variant label indicates a filled dry-fruit configuration
 * that requires merchant quotation rather than direct checkout.
 */
export function isFilledPackagingVariant(label?: string | null): boolean {
  if (!label || typeof label !== 'string') return false;
  const lower = label.toLowerCase().trim();
  if (lower.startsWith('empty')) return false;
  return /\bfilled\b|\bassorted\b|\bwith\s+dry\s+fruits\b/i.test(lower);
}

/**
 * Resolves the authoritative current 1kg selling rate for a product in PKR.
 *
 * Precedence:
 * 1. Fails closed (returns null) if product is inactive, draft, archived, or quote-only.
 * 2. If product.commerce exists:
 *    - Looks up explicit 1kg option. If available === false, returns null.
 *    - If calculated without override, resolves calculatedUnitPrice.
 *    - If manual or override, checks product.variants then product.prices for that option.
 *    - If calculated pricing mode with baseUnit 1kg or 1000g, returns basePrice.
 * 3. Inspects product.variants for a 1kg / 1000g variant. Returns null if disabled/out of stock.
 * 4. Inspects product.prices['1kg'] or ['1 kg'] as long as no variant marks it unavailable.
 * 5. Returns null. NEVER derives kg rates from 250g/500g packs, pricePer100g, or supplier costs.
 */
export function resolveAuthoritativeKgRate(product: Product | null | undefined): number | null {
  if (!product) return null;
  if (
    product.active === false ||
    product.status === 'draft' ||
    product.status === 'archived' ||
    product.quoteOnly === true ||
    product.orderMode === 'inquiry_quote'
  ) {
    return null;
  }

  // 1. Inspect commerce configuration
  if (product.commerce) {
    const options = product.commerce.options;
    if (Array.isArray(options)) {
      const kgOption = options.find(opt => {
        if (!opt || typeof opt !== 'object') return false;
        if (opt.unit === 'kg' && opt.quantity === 1) return true;
        if (opt.unit === 'g' && opt.quantity === 1000) return true;
        const l = typeof opt.label === 'string' ? opt.label.trim().toLowerCase() : '';
        return l === '1kg' || l === '1 kg';
      });

      if (kgOption) {
        if (kgOption.available === false) return null; // Explicitly disabled
        if (product.commerce.pricingMode === 'calculated' && !kgOption.override) {
          try {
            const calculated = calculatedUnitPrice(product.commerce, 1, 'kg');
            if (Number.isSafeInteger(calculated) && calculated > 0) return calculated;
          } catch {
            return null;
          }
        }
        // Manual override or manual mode
        const priceFromPrices = product.prices?.[kgOption.label];
        if (Number.isSafeInteger(priceFromPrices) && priceFromPrices > 0) return priceFromPrices;
        const matchingVariant = product.variants?.find(v => v?.label?.trim() === kgOption.label.trim());
        if (matchingVariant) {
          if (matchingVariant.available === false || matchingVariant.inStock === false) return null;
          if (Number.isSafeInteger(matchingVariant.price) && matchingVariant.price > 0) return matchingVariant.price;
        }
      }
    }

    if (product.commerce.pricingMode === 'calculated') {
      if (product.commerce.baseUnit === 'kg' && product.commerce.baseQuantity === 1) {
        if (Number.isSafeInteger(product.commerce.basePrice) && product.commerce.basePrice! > 0) {
          return product.commerce.basePrice;
        }
      }
      if (product.commerce.baseUnit === 'g' && product.commerce.baseQuantity === 1000) {
        if (Number.isSafeInteger(product.commerce.basePrice) && product.commerce.basePrice! > 0) {
          return product.commerce.basePrice;
        }
      }
    }
  }

  // 2. Check explicitly disabled variant flags first
  if (Array.isArray(product.variants)) {
    const disabledVar = product.variants.find(v => {
      if (!v || typeof v.label !== 'string') return false;
      const l = v.label.trim().toLowerCase();
      return (l === '1kg' || l === '1 kg' || v.weightGrams === 1000) && (v.available === false || v.inStock === false);
    });
    if (disabledVar) return null;
  }

  // 3. Inspect product.prices
  if (product.prices && typeof product.prices === 'object') {
    const price1kg = product.prices['1kg'] ?? product.prices['1 kg'];
    if (Number.isSafeInteger(price1kg) && price1kg > 0) {
      return price1kg;
    }
  }

  // 4. Inspect product.variants
  if (Array.isArray(product.variants)) {
    const kgVariant = product.variants.find(v => {
      if (!v || typeof v.label !== 'string') return false;
      const l = v.label.trim().toLowerCase();
      return l === '1kg' || l === '1 kg' || v.weightGrams === 1000;
    });
    if (kgVariant) {
      if (kgVariant.available === false || kgVariant.inStock === false) return null;
      if (Number.isSafeInteger(kgVariant.price) && kgVariant.price > 0) return kgVariant.price;
    }
  }

  return null;
}

/**
 * Calculates an ingredient estimate based strictly on kilogram selling rate and explicit net grams:
 * formula: (kgRatePkr * gramsPerBox * requestedBoxes) / 1000
 * Half-up integer PKR rounding at the final boundary.
 */
export function calculateIngredientEstimate(
  kgRatePkr: number,
  gramsPerBox: number,
  requestedBoxes: number = 1
): number {
  if (
    !Number.isSafeInteger(kgRatePkr) ||
    kgRatePkr <= 0 ||
    typeof gramsPerBox !== 'number' ||
    !Number.isFinite(gramsPerBox) ||
    gramsPerBox <= 0 ||
    !Number.isSafeInteger(requestedBoxes) ||
    requestedBoxes <= 0
  ) {
    throw new Error('INVALID_ESTIMATE_ARGUMENTS');
  }
  const unrounded = (kgRatePkr * gramsPerBox * requestedBoxes) / 1000;
  const rounded = Math.round(unrounded);
  if (!Number.isSafeInteger(rounded) || rounded <= 0) {
    throw new Error('ESTIMATE_OVERFLOW');
  }
  return rounded;
}

/**
 * Shared deterministic filled gift estimator for hampers, bid boxes, and custom inquiries.
 */
export function calculateFilledGiftEstimate({
  packagingProduct,
  packagingUnitPrice,
  recipe,
  catalogProducts,
  requestedBoxes = 1,
}: FilledGiftEstimateInput): FilledGiftEstimateResult {
  if (!Number.isSafeInteger(requestedBoxes) || requestedBoxes < 1) {
    return {
      isAvailable: false,
      unavailabilityReason: 'INVALID_QUANTITY',
      ingredientLines: [],
      packagingUnitPrice: null,
      packagingTotalPkr: null,
      ingredientsTotalPkr: null,
      estimatedTotalPkr: null,
      isEstimate: true,
    };
  }

  const effectiveRecipe =
    recipe && recipe.length > 0
      ? recipe
      : packagingProduct?.recipeIngredients && packagingProduct.recipeIngredients.length > 0
      ? packagingProduct.recipeIngredients
      : null;

  if (!effectiveRecipe || effectiveRecipe.length === 0) {
    return {
      isAvailable: false,
      unavailabilityReason: 'MISSING_RECIPE',
      ingredientLines: [],
      packagingUnitPrice: null,
      packagingTotalPkr: null,
      ingredientsTotalPkr: null,
      estimatedTotalPkr: null,
      isEstimate: true,
    };
  }

  const lines: EstimatedIngredientLine[] = [];
  let ingredientsTotal = 0;

  for (const item of effectiveRecipe) {
    if (typeof item.grams !== 'number' || !Number.isFinite(item.grams) || item.grams <= 0) {
      return {
        isAvailable: false,
        unavailabilityReason: 'MISSING_RECIPE',
        ingredientLines: [],
        packagingUnitPrice: null,
        packagingTotalPkr: null,
        ingredientsTotalPkr: null,
        estimatedTotalPkr: null,
        isEstimate: true,
      };
    }

    const prod = catalogProducts.find(p => p.id === item.productId);
    if (!prod) {
      return {
        isAvailable: false,
        unavailabilityReason: 'MISSING_INGREDIENT',
        ingredientLines: [],
        packagingUnitPrice: null,
        packagingTotalPkr: null,
        ingredientsTotalPkr: null,
        estimatedTotalPkr: null,
        isEstimate: true,
      };
    }

    const kgRate = resolveAuthoritativeKgRate(prod);
    if (kgRate === null || !Number.isSafeInteger(kgRate) || kgRate <= 0) {
      return {
        isAvailable: false,
        unavailabilityReason: 'UNAVAILABLE_KG_RATE',
        ingredientLines: [],
        packagingUnitPrice: null,
        packagingTotalPkr: null,
        ingredientsTotalPkr: null,
        estimatedTotalPkr: null,
        isEstimate: true,
      };
    }

    const lineEstimate = calculateIngredientEstimate(kgRate, item.grams, requestedBoxes);
    ingredientsTotal += lineEstimate;

    lines.push({
      productId: prod.id,
      name_en: prod.name_en || prod.id,
      kgRatePkr: kgRate,
      gramsPerBox: item.grams,
      totalGrams: item.grams * requestedBoxes,
      estimatePkr: lineEstimate,
    });
  }

  const validPackagingUnit =
    Number.isSafeInteger(packagingUnitPrice) && packagingUnitPrice! > 0
      ? packagingUnitPrice!
      : null;
  const packagingTotal = validPackagingUnit !== null ? validPackagingUnit * requestedBoxes : null;
  const estimatedTotal = ingredientsTotal + (packagingTotal ?? 0);

  return {
    isAvailable: true,
    ingredientLines: lines,
    packagingUnitPrice: validPackagingUnit,
    packagingTotalPkr: packagingTotal,
    ingredientsTotalPkr: ingredientsTotal,
    estimatedTotalPkr: estimatedTotal,
    isEstimate: true,
  };
}
