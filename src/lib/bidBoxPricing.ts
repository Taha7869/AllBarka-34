/**
 * Authoritative Bid Box & Packaging Dynamic Pricing Resolver
 *
 * Removes stale price duplication by deriving all display summaries,
 * bulk tiers, and filled option labels dynamically from canonical
 * `product.prices` and `product.variants`.
 */

import type { Product, BidBoxConfig, BidBoxBulkTier, BidBoxFilledOption } from '../types';

export function resolveBidBoxConfig(product: Product): BidBoxConfig | undefined {
  if (!product.isBidBox && product.category !== 'celebration-boxes') {
    return product.bidBoxConfig;
  }

  const existingConfig = product.bidBoxConfig || {} as Partial<BidBoxConfig>;
  const prices = product.prices || {};

  // 1. Resolve unit piece prices from canonical prices
  const unit1Price = prices['Empty Box (1 pc)']
    ?? (prices['Empty Pack (10 pcs)'] ? Math.round(prices['Empty Pack (10 pcs)'] / 10) : undefined)
    ?? (prices['Empty Pack (25 pcs)'] ? Math.round(prices['Empty Pack (25 pcs)'] / 25) : undefined)
    ?? (prices['Empty Bulk (50 pcs)'] ? Math.round(prices['Empty Bulk (50 pcs)'] / 50) : undefined)
    ?? existingConfig.emptyUnitStarting
    ?? 0;

  const pack10Price = prices['Empty Pack (10 pcs)'] ?? (unit1Price * 10);
  const unit10Price = Math.round(pack10Price / 10);

  const pack25Price = prices['Empty Pack (25 pcs)'] ?? (Math.round((unit1Price * 0.95)) * 25);
  const unit25Price = Math.round(pack25Price / 25);

  const pack50Price = prices['Empty Bulk (50 pcs)'] ?? (Math.round((unit1Price * 0.90)) * 50);
  const unit50Price = Math.round(pack50Price / 50);

  const pack100Price = prices['Empty Bulk (100 pcs)'] ?? (Math.round((unit1Price * 0.82)) * 100);
  const unit100Price = Math.round(pack100Price / 100);

  const emptyUnitStarting = prices['Empty Box (1 pc)']
    ?? (prices['Empty Pack (10 pcs)'] ? unit10Price : undefined)
    ?? (prices['Empty Pack (25 pcs)'] ? unit25Price : undefined)
    ?? (prices['Empty Bulk (50 pcs)'] ? unit50Price : undefined)
    ?? unit1Price;

  // 2. Resolve filled options dynamically from non-empty variant keys
  const filledVariants = Object.entries(prices).filter(([key, val]) =>
    !key.toLowerCase().startsWith('empty') && Number.isFinite(val) && val > 0
  );

  let filledMin = existingConfig.filledMin || 0;
  let filledMax = existingConfig.filledMax || 0;

  if (filledVariants.length > 0) {
    const sortedPrices = filledVariants.map(([, p]) => p).sort((a, b) => a - b);
    filledMin = sortedPrices[0];
    filledMax = sortedPrices[sortedPrices.length - 1];
  }

  const emptyTiers: BidBoxBulkTier[] = [
    { qty: 10, label: '10 pcs', unitPrice: unit10Price, packPrice: pack10Price, variantKey: 'Empty Pack (10 pcs)' },
    { qty: 25, label: '25 pcs', discountBadge: '-5%', unitPrice: unit25Price, packPrice: pack25Price, variantKey: 'Empty Pack (25 pcs)' },
    { qty: 50, label: '50 pcs (-10%)', discountBadge: '-10%', unitPrice: unit50Price, packPrice: pack50Price, variantKey: 'Empty Bulk (50 pcs)' },
    { qty: 100, label: '100+ pcs (-18%)', discountBadge: '-18%', unitPrice: unit100Price, packPrice: pack100Price, variantKey: 'Empty Bulk (100 pcs)' },
  ];

  const filledOptions: BidBoxFilledOption[] = existingConfig.filledOptions && existingConfig.filledOptions.length > 0
    ? existingConfig.filledOptions.map(opt => ({
        ...opt,
        price: prices[opt.variantKey] ?? opt.price,
      }))
    : filledVariants.map(([key, price]) => ({
        label: key,
        subtitle: existingConfig.filledSummary || 'AllBarka Dry Fruits & Dates Assortment',
        price,
        variantKey: key,
      }));

  return {
    ...existingConfig,
    emptyUnitStarting,
    emptyBulk50Unit: unit50Price,
    emptyBulk100Unit: unit100Price,
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
