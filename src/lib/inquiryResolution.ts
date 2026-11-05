import { calculateFilledGiftEstimate, resolveFilledRecipe, resolveEmptyPackagingUnitPrice, normalizeNetFillingGrams, isValidNetFillingGrams } from './filledGiftPricing';
import { resolveHamper, HAMPER_BOXES, HamperBox, HamperConfiguration, HAMPER_PORTION_GRAMS } from './hamperCatalog';
import type { Product } from '../types';
import { calculatePackagingMoq, parsePiecesPerPack, isPackagingProduct } from './packagingMoq';

export interface ResolveInquiryParams {
  catalog: Product[];
  productId: string;
  requestedVariantLabel?: string | null;
  boxMode: 'empty' | 'filled' | 'custom';
  quantity: number;
  hamperConfiguration?: any;
  hamperBoxes?: HamperBox[];
  netFillingGrams?: number | null;
}

export interface InquiryVariantResolution {
  productId: string;
  productName: string;
  isVerifiedCatalogProduct: boolean;
  packagingVariant: string | null;
  unresolvedVariant: boolean;
  quantityUnit: 'pieces' | 'packs' | 'sets';
  piecesPerPack: number;
  standardPrice: number | null;
  packPrice: number | null;
  perPiecePrice: number | null;
  totalPieces: number;
  requiresTeamQuote: boolean;
  belowMoq: boolean;
  moqRequired: number | null;
  minPacksRequired: number | null;
  isTabarruk: boolean;
  hamperConfiguration?: HamperConfiguration;
  estimatedTotalPkr?: number | null;
  netFillingGrams?: number | null;
}

/**
 * Validates phone format for Pakistani (03xx, 923xx) and international numbers.
 * Rejects non-digit strings like "abcdefghij".
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)\+\.]/g, '');
  if (!/^\d+$/.test(cleaned)) return false;
  if (cleaned.length < 10 || cleaned.length > 15) return false;
  if (cleaned.startsWith('03') && cleaned.length === 11) return true;
  if (cleaned.startsWith('923') && cleaned.length === 12) return true;
  if (cleaned.startsWith('00923') && cleaned.length === 14) return true;
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Validates that quantity is a finite positive integer between 1 and 50,000.
 * Rejects floats/fractions like 1.5, zero, negatives, and non-numeric inputs.
 */
export function isValidQuantity(quantity: any): boolean {
  if (typeof quantity !== 'number') return false;
  if (!Number.isFinite(quantity)) return false;
  if (!Number.isInteger(quantity)) return false;
  return quantity >= 1 && quantity <= 50000;
}

/**
 * Validates budget amounts. Must be a finite non-negative number if supplied.
 */
export function isValidBudget(budget: any): boolean {
  if (budget == null || budget === '') return true;
  if (typeof budget !== 'number') return false;
  return Number.isFinite(budget) && budget >= 0 && budget <= 100000000;
}

/**
 * Strips all admin/staff-only fields from public inquiries and quotes.
 * Only customer-submitted fields are allowed through.
 */
export function sanitizePublicInquiryInput(raw: any): Record<string, any> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const allowedCustomerKeys = new Set([
    'customerName', 'name', 'phone', 'customerPhone', 'contact', 'email', 'city',
    'type', 'source', 'productId', 'productName', 'boxId', 'boxName', 'boxMode', 'mode',
    'quantity', 'estimatedQuantity', 'standardPrice', 'referenceUnitPrice',
    'giftRecipient', 'offeredPrice', 'targetPricePkr', 'customerOfferedRate', 'eventType', 'occasion',
    'customPrintText', 'customPrinting', 'packagingVariant', 'variantLabel', 'portion', 'targetEventDate',
    'deliveryCity', 'notes', 'message', 'customHamperNotes', 'metadata', 'topic',
    'budgetType', 'preferredFillings', 'customFillingsNotes', 'monogramText', 'cardMessage',
    'leadTimeNoticeAcknowledged', 'submissionKey', 'idempotencyKey', 'hamperConfiguration', 'customHamperConfig',
    'netFillingGrams', 'netWeightGrams', 'fillingWeightGrams', 'netWeight'
  ]);
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (allowedCustomerKeys.has(key)) {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Resolves product, variant, pack capacity, authoritative standard pricing, and MOQ.
 * 
 * Rules:
 * 1. Never silently substitute another variant when an explicitly requested variant is nonexistent or unavailable.
 *    Preserves the requested variant string as unresolved with requiresTeamQuote=true and standardPrice=null.
 * 2. Ignore unavailable variants (available: false, inStock: false) and their stale prices.
 * 3. Respect product active/public status and quote-only configuration.
 * 4. An empty-mode request must not use a filled variant's price, and a filled request must not use an empty variant's price.
 * 5. Default selection is permitted ONLY when the customer supplied no variant, and must follow valid available variants and selected mode.
 */
export function resolveInquiryProductVariant(params: ResolveInquiryParams): InquiryVariantResolution {
  const { catalog, productId, requestedVariantLabel, boxMode, quantity, hamperConfiguration, hamperBoxes, netFillingGrams } = params;
  if (productId === 'custom-hamper' || productId?.startsWith('custom-hamper:') || hamperConfiguration) {
    if (hamperConfiguration) {
      // Validate that top-level netFillingGrams and hamperConfiguration.netFillingGrams do not conflict
      const rawNested = (hamperConfiguration as any).netFillingGrams;
      const nestedWeight = rawNested !== undefined && rawNested !== null && rawNested !== ''
        ? normalizeNetFillingGrams(rawNested)
        : null;
      const rawTop = netFillingGrams as unknown;
      const topWeight = rawTop !== undefined && rawTop !== null && rawTop !== ''
        ? normalizeNetFillingGrams(rawTop)
        : null;

      if (nestedWeight !== null && topWeight !== null && nestedWeight !== topWeight) {
        // Conflicting weights: fail closed as unresolved unpriced quote-required
        return {
          productId: 'custom-hamper',
          productName: 'Custom Luxury Hamper',
          isVerifiedCatalogProduct: false,
          packagingVariant: requestedVariantLabel ? String(requestedVariantLabel).slice(0, 80) : 'Custom Hamper',
          unresolvedVariant: true,
          quantityUnit: 'pieces',
          piecesPerPack: 1,
          standardPrice: null,
          packPrice: null,
          perPiecePrice: null,
          estimatedTotalPkr: null,
          totalPieces: quantity,
          requiresTeamQuote: true,
          belowMoq: false,
          moqRequired: null,
          minPacksRequired: null,
          isTabarruk: false,
          netFillingGrams: null,
        };
      }

      const effectiveNetWeight = topWeight ?? nestedWeight ?? null;
      const effectiveHamperConfig: HamperConfiguration = {
        ...hamperConfiguration,
        ...(effectiveNetWeight != null ? { netFillingGrams: effectiveNetWeight } : {}),
      };
      if (effectiveNetWeight == null) {
        delete (effectiveHamperConfig as any).netFillingGrams;
      }

      const resolvedHamper = resolveHamper(effectiveHamperConfig, catalog, hamperBoxes ?? [], quantity);
      if (resolvedHamper) {
        const isEstimated = resolvedHamper.estimatedTotalPkr != null;
        return {
          productId: 'custom-hamper',
          productName: resolvedHamper.name_en,
          isVerifiedCatalogProduct: true,
          packagingVariant: resolvedHamper.portion,
          unresolvedVariant: false,
          quantityUnit: 'pieces',
          piecesPerPack: 1,
          standardPrice: isEstimated ? resolvedHamper.unitPrice : null,
          packPrice: isEstimated ? resolvedHamper.unitPrice : null,
          perPiecePrice: isEstimated ? resolvedHamper.unitPrice : null,
          estimatedTotalPkr: isEstimated ? resolvedHamper.estimatedTotalPkr : null,
          totalPieces: quantity,
          requiresTeamQuote: !isEstimated,
          belowMoq: false,
          moqRequired: null,
          minPacksRequired: null,
          isTabarruk: false,
          hamperConfiguration: resolvedHamper.configuration,
          netFillingGrams: resolvedHamper.configuration.netFillingGrams ?? null,
        };
      }
    }
    return {
      productId: 'custom-hamper',
      productName: 'Custom Luxury Hamper',
      isVerifiedCatalogProduct: false,
      packagingVariant: requestedVariantLabel ? String(requestedVariantLabel).slice(0, 80) : 'Custom Hamper',
      unresolvedVariant: true,
      quantityUnit: 'pieces',
      piecesPerPack: 1,
      standardPrice: null,
      packPrice: null,
      perPiecePrice: null,
      estimatedTotalPkr: null,
      totalPieces: quantity,
      requiresTeamQuote: true,
      belowMoq: false,
      moqRequired: null,
      minPacksRequired: null,
      isTabarruk: false,
      netFillingGrams: netFillingGrams ?? null,
    };
  }
  const catalogProduct = catalog.find(p => p.id === productId);

  if (!catalogProduct) {
    return {
      productId: 'custom',
      productName: 'Custom Packaging Request',
      isVerifiedCatalogProduct: false,
      packagingVariant: requestedVariantLabel ? String(requestedVariantLabel).slice(0, 80) : null,
      unresolvedVariant: true,
      quantityUnit: 'pieces',
      piecesPerPack: 1,
      standardPrice: null,
      packPrice: null,
      perPiecePrice: null,
      totalPieces: quantity,
      requiresTeamQuote: true,
      belowMoq: false,
      moqRequired: null,
      minPacksRequired: null,
      isTabarruk: String(productId || '').toLowerCase().includes('tabarruk'),
      netFillingGrams: netFillingGrams ?? null,
    };
  }

  const isTabarruk =
    catalogProduct.id.toLowerCase().includes('tabarruk') ||
    catalogProduct.name_en.toLowerCase().includes('tabarruk') ||
    catalogProduct.packagingSubcategory === 'tabarruk';

  const isPublicActive = catalogProduct.active !== false;
  const isQuoteOnly = Boolean(
    catalogProduct.quoteOnly ||
    catalogProduct.orderMode === 'inquiry_quote' ||
    !catalogProduct.prices ||
    Object.keys(catalogProduct.prices).length === 0
  );

  // 1. Gather all strictly available variants with finite positive prices
  interface AvailableVariant {
    label: string;
    price: number;
    isFilled: boolean;
    isEmpty: boolean;
  }

  const availableVariants: AvailableVariant[] = [];

  if (Array.isArray(catalogProduct.variants) && catalogProduct.variants.length > 0) {
    for (const v of catalogProduct.variants) {
      if (!v) continue;
      // Stale or disabled variants must be ignored
      if (v.available === false || v.inStock === false) continue;
      if (typeof v.price !== 'number' || !Number.isFinite(v.price) || v.price <= 0) continue;
      const lower = v.label.toLowerCase();
      const isFilled = lower.includes('filled');
      const isEmpty = lower.includes('empty') || !isFilled;
      availableVariants.push({ label: v.label, price: v.price, isFilled, isEmpty });
    }
  } else if (catalogProduct.prices && Object.keys(catalogProduct.prices).length > 0) {
    for (const [lbl, pr] of Object.entries(catalogProduct.prices)) {
      if (typeof pr !== 'number' || !Number.isFinite(pr) || pr <= 0) continue;
      const lower = lbl.toLowerCase();
      const isFilled = lower.includes('filled');
      const isEmpty = lower.includes('empty') || !isFilled;
      availableVariants.push({ label: lbl, price: pr, isFilled, isEmpty });
    }
  }

  // 2. Resolve variant selection
  let matchedVariant: AvailableVariant | null = null;
  let unresolvedVariant = false;
  const requestedLabel = requestedVariantLabel?.trim() || null;

  if (requestedLabel) {
    // Customer explicitly requested a variant: search for an exact or case-insensitive match among available variants
    const found = availableVariants.find(v => v.label.toLowerCase() === requestedLabel.toLowerCase());
    if (found) {
      matchedVariant = found;
    } else {
      // Requested variant is unavailable, disabled, or unlisted.
      // NEVER silently substitute another variant!
      unresolvedVariant = true;
    }
  } else {
    // Customer supplied no variant: default selection is permitted, following mode
    if (boxMode === 'empty') {
      matchedVariant = availableVariants.find(v => v.isEmpty) || null;
    } else if (boxMode === 'filled') {
      matchedVariant = availableVariants.find(v => v.isFilled) || null;
    } else {
      matchedVariant = availableVariants[0] || null;
    }
  }

  const selectedLabel = requestedLabel ? requestedLabel : (matchedVariant ? matchedVariant.label : null);
  const piecesPerPack = parsePiecesPerPack(selectedLabel, catalogProduct);
  const totalPieces = quantity * piecesPerPack;

  // 3. Define quantity units explicitly: packs vs pieces vs sets
  let quantityUnit: 'pieces' | 'packs' | 'sets' = 'pieces';
  if (isTabarruk && (catalogProduct.name_en.toLowerCase().includes('set') || catalogProduct.id.toLowerCase().includes('set'))) {
    quantityUnit = 'sets';
  } else if (isPackagingProduct(catalogProduct) && piecesPerPack > 1) {
    quantityUnit = 'packs';
  }

  // 4. Resolve authoritative pricing
  let standardPrice: number | null = null;
  let packPrice: number | null = null;
  let perPiecePrice: number | null = null;
  let requiresTeamQuote = false;
  let authoritativeEstimatedTotalPkr: number | null = null;

  if (!isPublicActive || isQuoteOnly || unresolvedVariant) {
    requiresTeamQuote = true;
  } else if (boxMode === 'custom') {
    // Custom fillings always require bespoke concierge quoting
    requiresTeamQuote = true;
  } else if (boxMode === 'empty') {
    // An empty-mode request must not use a filled variant's price
    if (matchedVariant && !matchedVariant.isFilled) {
      standardPrice = matchedVariant.price;
      packPrice = matchedVariant.price;
      perPiecePrice = Math.round((matchedVariant.price / piecesPerPack) * 100) / 100;
      authoritativeEstimatedTotalPkr = standardPrice * quantity;
    } else {
      requiresTeamQuote = true;
    }
  } else {
    // Filled mode: recompute estimate server-side using shared estimator
    if (matchedVariant && matchedVariant.isFilled) {
      const recipe = resolveFilledRecipe(catalogProduct, matchedVariant.label, netFillingGrams);
      if (recipe) {
        const emptyUnitPrice = resolveEmptyPackagingUnitPrice(catalogProduct, quantity);
        const est = calculateFilledGiftEstimate({
          packagingProduct: catalogProduct,
          packagingUnitPrice: emptyUnitPrice ?? undefined,
          recipe,
          expectedNetFillingGrams: netFillingGrams,
          catalogProducts: catalog,
          requestedBoxes: quantity,
        });
        if (est.isAvailable && est.estimatedTotalPkr != null) {
          // Documented precision policy:
          // standardPrice is the nominal unit rate for display (half-up integer PKR rounding).
          // However, the downstream total (authoritativeEstimatedTotalPkr) preserves the shared estimator's
          // exact total directly without drift from multiplying a rounded unit rate by box quantity.
          const perBox = Math.round(est.estimatedTotalPkr / quantity);
          standardPrice = perBox;
          packPrice = perBox;
          perPiecePrice = perBox;
          requiresTeamQuote = false;
          authoritativeEstimatedTotalPkr = est.estimatedTotalPkr;
        } else {
          standardPrice = null;
          packPrice = null;
          perPiecePrice = null;
          requiresTeamQuote = true;
        }
      } else {
        // Missing recipe: remains unpriced, including known legacy packaging IDs!
        standardPrice = null;
        packPrice = null;
        perPiecePrice = null;
        requiresTeamQuote = true;
      }
    } else {
      requiresTeamQuote = true;
    }
  }

  // 5. Derive authoritative MOQ for packaging
  let belowMoq = false;
  let moqRequired: number | null = null;
  let minPacksRequired: number | null = null;

  if (isPackagingProduct(catalogProduct)) {
    try {
      const moq = calculatePackagingMoq(catalogProduct, selectedLabel || undefined);
      moqRequired = moq;
      if (piecesPerPack > 1) {
        minPacksRequired = Math.ceil(moq / piecesPerPack);
      }
      belowMoq = totalPieces < moq;
    } catch {
      requiresTeamQuote = true;
    }
  }

  return {
    productId: catalogProduct.id,
    productName: catalogProduct.name_en,
    isVerifiedCatalogProduct: isPublicActive,
    packagingVariant: selectedLabel,
    unresolvedVariant,
    quantityUnit,
    piecesPerPack,
    standardPrice,
    packPrice,
    perPiecePrice,
    totalPieces,
    requiresTeamQuote,
    belowMoq,
    moqRequired,
    minPacksRequired,
    isTabarruk,
    estimatedTotalPkr: authoritativeEstimatedTotalPkr ?? (standardPrice != null ? standardPrice * quantity : null),
    netFillingGrams: netFillingGrams ?? null,
  };
}
