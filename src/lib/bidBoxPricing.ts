/**
 * Authoritative Bid Box & Packaging Dynamic Pricing Resolver
 *
 * Removes stale price duplication by deriving all display summaries,
 * bulk tiers, and filled option labels dynamically from canonical
 * `product.prices` and `product.variants`.
 */

import type { Product, BidBoxConfig, BidBoxBulkTier, BidBoxFilledOption } from '../types';
import { parsePiecesPerPack } from './packagingMoq';

export function resolveBidBoxConfig(product: Product): BidBoxConfig | undefined {
  if (!product.isBidBox && product.category !== 'celebration-boxes' && product.productFamily !== 'bid-box') {
    return product.bidBoxConfig;
  }

  const existingConfig = (product.bidBoxConfig || {}) as Partial<BidBoxConfig>;
  const rawPrices = product.prices || {};

  // Identify any explicitly disabled variants from product.variants
  const disabledLabels = new Set<string>();
  if (Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (v && typeof v.label === 'string' && v.available === false) {
        disabledLabels.add(v.label);
      }
    }
  }

  // Collect only explicitly saved, available, positively priced variants
  const availablePrices = new Map<string, number>();
  for (const [label, price] of Object.entries(rawPrices)) {
    if (disabledLabels.has(label)) continue;
    if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
      availablePrices.set(label, price);
    }
  }

  if (availablePrices.size === 0 && Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (!v || v.available === false || typeof v.label !== 'string') continue;
      if (typeof v.price === 'number' && Number.isFinite(v.price) && v.price > 0) {
        availablePrices.set(v.label, v.price);
      }
    }
  }

  // 1. Resolve empty box / pack variants strictly from saved available variants
  interface ParsedEmptyVariant {
    variantKey: string;
    qty: number;
    packPrice: number;
    unitPrice: number;
  }

  const emptyVariants: ParsedEmptyVariant[] = [];
  const filledEntries: Array<[string, number]> = [];

  const existingFilledMap = new Map<string, BidBoxFilledOption>();
  if (Array.isArray(existingConfig.filledOptions)) {
    for (const opt of existingConfig.filledOptions) {
      if (opt && typeof opt.variantKey === 'string') {
        existingFilledMap.set(opt.variantKey, opt);
      }
    }
  }

  for (const [label, price] of availablePrices.entries()) {
    const trimmed = label.trim();
    const isFilledLabel =
      !/^empty\b/i.test(trimmed) &&
      (/\bfilled\b|\bassorted\b|\bwith\s+dry\s+fruits\b/i.test(trimmed) || existingFilledMap.has(label));
    if (!isFilledLabel) {
      const qty = parsePiecesPerPack(label, product);
      const unitPrice = Math.round((price / qty) * 100) / 100;
      emptyVariants.push({
        variantKey: label,
        qty,
        packPrice: price,
        unitPrice: Number.isInteger(unitPrice) ? unitPrice : Math.round(unitPrice),
      });
    } else {
      filledEntries.push([label, price]);
    }
  }

  emptyVariants.sort((a, b) => a.qty - b.qty || a.packPrice - b.packPrice);

  const baselineUnitPrice = emptyVariants.length > 0 ? emptyVariants[0].unitPrice : undefined;
  const emptyUnitStarting = baselineUnitPrice;

  const empty50 = emptyVariants.find(v => v.qty === 50);
  const empty100 = emptyVariants.find(v => v.qty === 100);
  const emptyBulk50Unit = empty50 ? empty50.unitPrice : undefined;
  const emptyBulk100Unit = empty100 ? empty100.unitPrice : undefined;

  // Build emptyTiers only from actually saved multi-piece empty pack variants (never invent tiers)
  const emptyTiers: BidBoxBulkTier[] = emptyVariants
    .filter(v => v.qty > 1)
    .map(v => {
      const savingsPct =
        baselineUnitPrice !== undefined && baselineUnitPrice > 0 && v.unitPrice < baselineUnitPrice
          ? Math.round(((baselineUnitPrice - v.unitPrice) / baselineUnitPrice) * 100)
          : 0;
      const discountBadge = savingsPct > 0 ? `-${savingsPct}%` : undefined;
      const qtyLabel = v.qty >= 100 ? `${v.qty}+ pcs` : `${v.qty} pcs`;
      const label = discountBadge ? `${qtyLabel} (${discountBadge})` : qtyLabel;

      return {
        qty: v.qty,
        label,
        ...(discountBadge ? { discountBadge } : {}),
        unitPrice: v.unitPrice,
        packPrice: v.packPrice,
        variantKey: v.variantKey,
      };
    });

  // 2. Resolve filled options strictly from saved available non-empty variants
  const filledOptions: BidBoxFilledOption[] = filledEntries.map(([key, price]) => {
    const existingOpt = existingFilledMap.get(key);
    return {
      label: existingOpt?.label || key,
      subtitle: existingOpt?.subtitle || existingConfig.filledSummary || 'AllBarka Dry Fruits & Dates Assortment',
      price,
      variantKey: key,
    };
  });

  let filledMin: number | undefined = undefined;
  let filledMax: number | undefined = undefined;
  if (filledOptions.length > 0) {
    const sortedPrices = filledOptions.map(o => o.price).sort((a, b) => a - b);
    filledMin = sortedPrices[0];
    filledMax = sortedPrices[sortedPrices.length - 1];
  }

  return {
    emptyUnitStarting,
    emptyBulk50Unit,
    emptyBulk100Unit,
    filledMin,
    filledMax,
    filledSummary: existingConfig.filledSummary || 'Irani & Panjgur Dates with Roasted Nuts',
    emptyTiers,
    filledOptions,
    occasionTag: existingConfig.occasionTag || product.tag_en || 'Celebration Favors',
    dimensionsAndCapacity: existingConfig.dimensionsAndCapacity,
    emptyOptionDetails: existingConfig.emptyOptionDetails,
    filledOptionDetails: existingConfig.filledOptionDetails,
  };
}

