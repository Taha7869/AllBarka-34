import type { Product } from '../types';

export type MehmaanSetting = 'chai' | 'dawat' | 'iftar' | 'majlis';
export type BudgetBand = 'kifayati' | 'standard' | 'premium';

export interface ServingAssumptions {
  setting: MehmaanSetting;
  label_en: string;
  label_ur: string;
  label_ar: string;
  nutsGramsPerGuest: number;
  datesGramsPerGuest: number;
  driedFruitsGramsPerGuest: number;
  description_en: string;
  description_ur: string;
  description_ar: string;
  assumptionSource: string;
}

export const MEHMAAN_SETTINGS: Record<MehmaanSetting, ServingAssumptions> = {
  chai: {
    setting: 'chai',
    label_en: 'Afternoon Chai & Tea Bites',
    label_ur: 'عصرانہ چائے اور لذیذ میوہ جات',
    label_ar: 'شاي الظهيرة والمكسرات الفاخرة',
    nutsGramsPerGuest: 35,
    datesGramsPerGuest: 15,
    driedFruitsGramsPerGuest: 20,
    description_en: 'Crisp roasted pistachios, cashews, and delicate dried fruits paired with tea.',
    description_ur: 'چائے کے ساتھ کرسپی بھنے ہوئے پستے، کاجو اور خستہ میوہ جات۔',
    description_ar: 'فستق محمص مقرمش، كاجو، وفواكه مجففة فاخرة تقدم مع الشاي.',
    assumptionSource: 'Recommended boutique guidelines (editable)',
  },
  dawat: {
    setting: 'dawat',
    label_en: 'Royal Dastarkhwan & Dinner',
    label_ur: 'شاہی دسترخوان و عشائیہ',
    label_ar: 'وليمة دسترخـوان ملكية',
    nutsGramsPerGuest: 45,
    datesGramsPerGuest: 25,
    driedFruitsGramsPerGuest: 25,
    description_en: 'A grand feast presentation featuring premium mixed nuts, Medjool/Safawi dates, and Afghan figs.',
    description_ur: 'بڑے پیمانے کی دعوت کے لیے اعلٰی ترین مکس گری دار میوہ جات، کھجوریں اور افغانی انجیر۔',
    description_ar: 'وليمة فخمة تشتمل على مكسرات مشكلة فاخرة، تمور، وتين أفغاني.',
    assumptionSource: 'Recommended boutique guidelines (editable)',
  },
  iftar: {
    setting: 'iftar',
    label_en: 'Ramzan Iftar & Fast-Breaking',
    label_ur: 'رمضان افطار و برکت',
    label_ar: 'إفطار رمضان المبارك',
    nutsGramsPerGuest: 25,
    datesGramsPerGuest: 40,
    driedFruitsGramsPerGuest: 20,
    description_en: 'Rich Ajwa or Safawi dates to break the fast, accompanied by energy-dense almonds and roasted seeds.',
    description_ur: 'افطار کی برکت کے لیے اعلیٰ کھجوریں اور طاقت بخش بادام۔',
    description_ar: 'تمور مباركة لكسر الصيام، مع لوز مغذٍ.',
    assumptionSource: 'Recommended boutique guidelines (editable)',
  },
  majlis: {
    setting: 'majlis',
    label_en: 'Evening Gathering & Family Majlis',
    label_ur: 'شام کی محفل و مجلس',
    label_ar: 'مجلس مسائي عائلي',
    nutsGramsPerGuest: 30,
    datesGramsPerGuest: 20,
    driedFruitsGramsPerGuest: 25,
    description_en: 'A steady nibble spread of savory pistachios, salted cashews, and chewy golden raisins for conversation.',
    description_ur: 'محفل کی گفتگو کے لیے نمکین پستے، کاجو اور میٹھی کشمش کا شاندار امتزاج۔',
    description_ar: 'تشكيلة للتسالي المسائية من فستق مملح، كاجو، وزبيب ذهبي طازج.',
    assumptionSource: 'Recommended boutique guidelines (editable)',
  },
};

export interface CustomServingAssumptions {
  nutsGramsPerGuest?: number;
  datesGramsPerGuest?: number;
  driedFruitsGramsPerGuest?: number;
}

export interface PackPortionSelection {
  weight: string;
  grams: number;
  units: number;
  unitPrice: number;
  subtotal: number;
}

export interface PackComboResult {
  packs: PackPortionSelection[];
  totalGramsDelivered: number;
  extraGrams: number;
  totalPrice: number;
  summary: string;
}

export interface MehmaanRecommendationItem {
  product: Product;
  category: 'nuts' | 'dates' | 'driedFruits';
  targetGrams: number;
  recommendedPortionWeight: string;
  recommendedUnits: number;
  unitPrice: number;
  itemTotal: number;
  packCombo?: PackComboResult;
}

export interface MehmaanPlanResult {
  setting: MehmaanSetting;
  guests: number;
  totalGrams: number;
  assumptionSource: string;
  budgetBand: BudgetBand;
  breakdown: {
    nutsGrams: number;
    datesGrams: number;
    driedFruitsGrams: number;
  };
  varietyCounts: {
    nuts: number;
    dates: number;
    driedFruits: number;
  };
  items: MehmaanRecommendationItem[];
  estimatedTotalPkr: number;
}

export interface MehmaanPlannerOptions {
  budgetBand?: BudgetBand;
  varietyCounts?: {
    nuts?: number;
    dates?: number;
    driedFruits?: number;
  };
  selectedProductIds?: {
    nuts?: string[];
    dates?: string[];
    driedFruits?: string[];
  };
}

/**
 * Parses a portion string (e.g. '1kg', '500g', '250g', '100g') into net grams.
 */
export function parseWeightGrams(weightStr: string): number {
  if (!weightStr) return 0;
  const match = /^(\d+(?:\.\d+)?)\s*(kg|g)$/i.exec(weightStr.trim());
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  return unit === 'kg' ? Math.round(val * 1000) : Math.round(val);
}

/**
 * Calculates the representative price per kilogram (PKR/kg) for a product from active portions.
 */
export function getProductPricePerKg(product: Product): number {
  if (!product || !product.prices) return 0;
  const disabledLabels = new Set(
    Array.isArray(product.variants)
      ? product.variants.filter(v => v && v.available === false).map(v => v.label.trim())
      : []
  );

  // 1. Direct 1kg portion price if available
  for (const [w, p] of Object.entries(product.prices)) {
    if (w.trim().toLowerCase() === '1kg' && typeof p === 'number' && p > 0 && !disabledLabels.has(w.trim())) {
      return p;
    }
  }

  // 2. Otherwise extrapolate from the largest active portion
  let bestRate = 0;
  let maxGrams = 0;
  for (const [w, p] of Object.entries(product.prices)) {
    if (typeof p === 'number' && p > 0 && !disabledLabels.has(w.trim())) {
      const g = parseWeightGrams(w);
      if (g > 0 && g >= maxGrams) {
        maxGrams = g;
        bestRate = Math.round((p / g) * 1000);
      }
    }
  }
  return bestRate;
}

/**
 * Checks if a given price per kg fits a category's budget band.
 */
export function isProductInBudgetBand(
  pricePerKg: number,
  category: 'nuts' | 'dates' | 'driedFruits',
  band: BudgetBand
): boolean {
  if (pricePerKg <= 0) return false;
  if (category === 'nuts') {
    if (band === 'kifayati') return pricePerKg <= 3800;
    if (band === 'standard') return pricePerKg >= 3500 && pricePerKg <= 5200;
    if (band === 'premium') return pricePerKg >= 4500;
  } else if (category === 'dates') {
    if (band === 'kifayati') return pricePerKg <= 2000;
    if (band === 'standard') return pricePerKg >= 1000 && pricePerKg <= 7500;
    if (band === 'premium') return pricePerKg >= 6000;
  } else {
    // driedFruits
    if (band === 'kifayati') return pricePerKg <= 2200;
    if (band === 'standard') return pricePerKg >= 1800 && pricePerKg <= 4500;
    if (band === 'premium') return pricePerKg >= 3200;
  }
  return true;
}

/**
 * Checks if a product is canonically active, in stock, published, and has valid prices.
 */
export function isProductAvailable(p: Product): boolean {
  return (
    p.active !== false &&
    !p.quoteOnly &&
    p.orderMode !== 'inquiry_quote' &&
    (p as any).status !== 'draft' &&
    (p as any).status !== 'archived' &&
    !p.id.startsWith('bundle-') &&
    !p.id.startsWith('bid-box-') &&
    !p.id.startsWith('box-') &&
    p.category !== 'bundles' &&
    p.category !== 'gifting' &&
    p.category !== 'table-kit' &&
    Object.values(p.prices || {}).some(pr => typeof pr === 'number' && pr > 0)
  );
}

/**
 * Filter and sort available products for a category and budget band.
 * Returns in-band products first, followed by nearest adjacent products as fallback.
 */
export function getCategoryCandidates(
  allProducts: Product[],
  category: 'nuts' | 'dates' | 'driedFruits',
  band: BudgetBand = 'standard'
): Product[] {
  const available = allProducts.filter(p => isProductAvailable(p) && getProductPricePerKg(p) > 0);

  const matched = available.filter(p => {
    const id = p.id.toLowerCase();
    const name = (p.name_en || '').toLowerCase();
    const cat = p.category;

    if (category === 'nuts') {
      const isNutCategory = cat === 'dry-fruits' || cat === 'nuts';
      const isNutIdentity =
        id === 'pista' || id === 'kaju' || id === 'badam' || id === 'akhroot' ||
        id === 'kashmiri-walnut' || id === 'roasted-cashews' || id === 'masala-almonds' || id === 'pine-nuts' ||
        name.includes('pistachio') || name.includes('cashew') || name.includes('almond') || name.includes('walnut') || name.includes('pine nut');
      const isNotFruitOrDate = !id.includes('date') && !id.includes('fig') && !id.includes('raisin') && !id.includes('khubani') && !id.includes('alubukhara');
      return isNutCategory && isNutIdentity && isNotFruitOrDate;
    }

    if (category === 'dates') {
      return (cat === 'dates' || id === 'khajoor' || id.includes('date') || name.includes('date')) &&
        !id.includes('bundle') && !id.includes('tin') && !id.includes('box');
    }

    if (category === 'driedFruits') {
      const isFruitCategory = cat === 'dry-fruits' || cat === 'fruits' || cat === 'nuts';
      const isFruitIdentity =
        id === 'afghan-figs' || id === 'kishmish' || id === 'khubani' || id === 'alubukhara' ||
        id === 'golden-raisins' || id === 'black-raisins' || id === 'dried-mulberry' || id === 'dried-cranberries' ||
        name.includes('fig') || name.includes('apricot') || name.includes('raisin') || name.includes('mulberry') || name.includes('cranberr') || name.includes('prune');
      const isNotNutOrDate = !id.includes('date') && id !== 'pista' && id !== 'kaju' && id !== 'badam' && id !== 'akhroot' && !name.includes('pistachio') && !name.includes('cashew') && !name.includes('almond');
      return isFruitCategory && isFruitIdentity && isNotNutOrDate;
    }

    return false;
  });

  // Calculate price per kg for each candidate
  const withPrices = matched.map(p => ({
    product: p,
    pricePerKg: getProductPricePerKg(p),
    inBand: isProductInBudgetBand(getProductPricePerKg(p), category, band),
  }));

  // Separate in-band and out-of-band
  const inBandList = withPrices.filter(x => x.inBand);
  const outBandList = withPrices.filter(x => !x.inBand);

  // Sorting logic based on band:
  // Kifayati: ascending by price
  // Premium: descending by price
  // Standard: balanced (ascending from mid-range)
  if (band === 'kifayati') {
    inBandList.sort((a, b) => a.pricePerKg - b.pricePerKg);
    outBandList.sort((a, b) => a.pricePerKg - b.pricePerKg);
  } else if (band === 'premium') {
    inBandList.sort((a, b) => b.pricePerKg - a.pricePerKg);
    outBandList.sort((a, b) => b.pricePerKg - a.pricePerKg);
  } else {
    // standard: sort by distance to ~3800
    inBandList.sort((a, b) => Math.abs(a.pricePerKg - 3800) - Math.abs(b.pricePerKg - 3800));
    outBandList.sort((a, b) => Math.abs(a.pricePerKg - 3800) - Math.abs(b.pricePerKg - 3800));
  }

  // Combined: in-band first, then out-of-band fallbacks
  return [...inBandList, ...outBandList].map(x => x.product);
}

/**
 * Resolves the next candidate product in category and budget band for rotation ('Badlein').
 * Ensures current item is not repeated until list is exhausted, and doesn't collide with other slots.
 */
export function getNextCategoryProduct(
  allCategoryCandidates: Product[],
  currentProductId: string,
  currentlySelectedIds: string[]
): Product | null {
  if (allCategoryCandidates.length === 0) return null;
  if (allCategoryCandidates.length === 1) return allCategoryCandidates[0];

  const currentIndex = allCategoryCandidates.findIndex(p => p.id === currentProductId);
  const otherSelectedIds = new Set(currentlySelectedIds.filter(id => id !== currentProductId));

  const len = allCategoryCandidates.length;
  const startIdx = currentIndex >= 0 ? (currentIndex + 1) % len : 0;

  for (let step = 0; step < len; step++) {
    const candidateIdx = (startIdx + step) % len;
    const candidate = allCategoryCandidates[candidateIdx];
    if (!otherSelectedIds.has(candidate.id)) {
      return candidate;
    }
  }

  // Fallback if all items are occupied
  return currentIndex >= 0 ? allCategoryCandidates[currentIndex] : allCategoryCandidates[0];
}

/**
 * Optimizes pack combinations to minimize waste/excess weight while meeting target grams.
 * Selects minimum excess grams first, then lowest cost, then fewer packages.
 * When excess is unavoidable, explicit extra note is included (e.g. "1kg × 2 (950g extra)").
 */
export function resolveBestPackCombo(
  product: Product,
  targetGrams: number
): PackComboResult | null {
  if (!product || targetGrams <= 0) return null;

  const disabledLabels = new Set(
    Array.isArray(product.variants)
      ? product.variants.filter(v => v && v.available === false).map(v => v.label.trim())
      : []
  );

  const portions = Object.entries(product.prices || {})
    .filter(([label, price]) => {
      const trimmed = label.trim();
      return typeof price === 'number' && price > 0 && !disabledLabels.has(trimmed);
    })
    .map(([w, price]) => {
      const trimmed = w.trim();
      const grams = parseWeightGrams(trimmed);
      return { weight: trimmed, grams, price };
    })
    .filter(p => p.grams > 0)
    .sort((a, b) => b.grams - a.grams); // Largest to smallest

  if (portions.length === 0) return null;

  const smallest = portions[portions.length - 1];
  const gMin = smallest.grams;

  interface ComboCandidate {
    packs: PackPortionSelection[];
    totalGramsDelivered: number;
    extraGrams: number;
    totalPrice: number;
    totalUnits: number;
  }

  const candidates: ComboCandidate[] = [];

  function search(idx: number, currentCounts: number[], currentGrams: number) {
    if (idx === portions.length) {
      if (currentGrams >= targetGrams) {
        let totPrice = 0;
        let totUnits = 0;
        const packs: PackPortionSelection[] = [];
        for (let i = 0; i < portions.length; i++) {
          if (currentCounts[i] > 0) {
            const subtotal = currentCounts[i] * portions[i].price;
            totPrice += subtotal;
            totUnits += currentCounts[i];
            packs.push({
              weight: portions[i].weight,
              grams: portions[i].grams,
              units: currentCounts[i],
              unitPrice: portions[i].price,
              subtotal,
            });
          }
        }
        candidates.push({
          packs,
          totalGramsDelivered: currentGrams,
          extraGrams: currentGrams - targetGrams,
          totalPrice: totPrice,
          totalUnits: totUnits,
        });
      }
      return;
    }

    const p = portions[idx];
    const rem = targetGrams - currentGrams;
    if (rem <= 0) {
      search(portions.length, currentCounts, currentGrams);
      return;
    }

    const maxCount = Math.ceil((rem + gMin) / p.grams);
    for (let c = maxCount; c >= 0; c--) {
      currentCounts[idx] = c;
      search(idx + 1, currentCounts, currentGrams + c * p.grams);
      currentCounts[idx] = 0;
    }
  }

  search(0, new Array(portions.length).fill(0), 0);

  if (candidates.length === 0) {
    const units = Math.max(1, Math.ceil(targetGrams / smallest.grams));
    const extra = (units * smallest.grams) - targetGrams;
    const price = units * smallest.price;
    const summary = `${smallest.weight}${units > 1 ? ` × ${units}` : ''}${extra > 0 ? ` (${extra}g extra)` : ''}`;
    return {
      packs: [{
        weight: smallest.weight,
        grams: smallest.grams,
        units,
        unitPrice: smallest.price,
        subtotal: price,
      }],
      totalGramsDelivered: units * smallest.grams,
      extraGrams: extra,
      totalPrice: price,
      summary,
    };
  }

  // Filter candidates whose extraGrams is within the minimal waste tier
  const minExtra = Math.min(...candidates.map(c => c.extraGrams));
  const acceptable = candidates.filter(c => c.extraGrams <= minExtra + (gMin > 100 ? 100 : gMin));

  // Sort acceptable candidates:
  // 1. Lowest totalPrice (commercial value)
  // 2. Lowest totalUnits (fewer packaging units)
  // 3. Lowest extraGrams
  acceptable.sort((a, b) => {
    if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
    if (a.totalUnits !== b.totalUnits) return a.totalUnits - b.totalUnits;
    return a.extraGrams - b.extraGrams;
  });

  const best = acceptable[0];
  const packStrings = best.packs.map(p => p.units === 1 ? p.weight : `${p.weight} × ${p.units}`);
  const summary = `${packStrings.join(' + ')}${best.extraGrams > 0 ? ` (${best.extraGrams}g extra)` : ''}`;

  return {
    packs: best.packs,
    totalGramsDelivered: best.totalGramsDelivered,
    extraGrams: best.extraGrams,
    totalPrice: best.totalPrice,
    summary,
  };
}

/**
 * Legacy portion resolution helper kept for backwards compatibility.
 */
export function resolveBestPortion(
  product: Product,
  targetGrams: number
): { weight: string; units: number; unitPrice: number; total: number } | null {
  if (!product || targetGrams <= 0) return null;

  const disabledLabels = new Set(
    Array.isArray(product.variants)
      ? product.variants.filter(v => v && v.available === false).map(v => v.label.trim())
      : []
  );

  const portions = Object.entries(product.prices || {})
    .filter(([label, price]) => {
      const trimmed = label.trim();
      return typeof price === 'number' && price > 0 && !disabledLabels.has(trimmed);
    })
    .map(([w, price]) => {
      const trimmed = w.trim();
      const grams = parseWeightGrams(trimmed);
      return { weight: w, grams, price };
    })
    .filter(p => p.grams > 0)
    .sort((a, b) => b.grams - a.grams);

  if (portions.length === 0) {
    return null;
  }

  for (const p of portions) {
    if (targetGrams >= p.grams) {
      const units = Math.ceil(targetGrams / p.grams);
      return {
        weight: p.weight,
        units: Math.max(1, units),
        unitPrice: p.price,
        total: p.price * Math.max(1, units),
      };
    }
  }

  const smallest = portions[portions.length - 1];
  return {
    weight: smallest.weight,
    units: 1,
    unitPrice: smallest.price,
    total: smallest.price,
  };
}

/**
 * Calculates Mehmaan table servings and selects matching catalog items strictly from
 * published, active, non-quote-only products.
 * Supports budget bands, variety counts (1/2/3 items per category with equal gram partitioning),
 * and minimum-waste pack combo optimization.
 */
export function calculateMehmaanPlan(
  allProducts: Product[],
  guests: number,
  settingKey: MehmaanSetting = 'dawat',
  customAssumptions?: CustomServingAssumptions,
  options?: MehmaanPlannerOptions
): MehmaanPlanResult {
  const guestCount = Math.max(1, Math.min(200, Math.round(guests)));
  const assumptions = MEHMAAN_SETTINGS[settingKey] || MEHMAAN_SETTINGS.dawat;

  const budgetBand: BudgetBand = options?.budgetBand || 'standard';
  const varietyCounts = {
    nuts: Math.max(1, Math.min(3, options?.varietyCounts?.nuts || 1)),
    dates: Math.max(1, Math.min(3, options?.varietyCounts?.dates || 1)),
    driedFruits: Math.max(1, Math.min(3, options?.varietyCounts?.driedFruits || 1)),
  };

  const hasCustom = Boolean(
    customAssumptions &&
    (customAssumptions.nutsGramsPerGuest !== undefined ||
     customAssumptions.datesGramsPerGuest !== undefined ||
     customAssumptions.driedFruitsGramsPerGuest !== undefined)
  );

  const assumptionSource = hasCustom
    ? 'Custom patron configuration (editable)'
    : 'Recommended boutique guidelines (editable)';

  const nutsRate = customAssumptions?.nutsGramsPerGuest !== undefined
    ? Math.max(0, customAssumptions.nutsGramsPerGuest)
    : assumptions.nutsGramsPerGuest;
  const datesRate = customAssumptions?.datesGramsPerGuest !== undefined
    ? Math.max(0, customAssumptions.datesGramsPerGuest)
    : assumptions.datesGramsPerGuest;
  const driedFruitsRate = customAssumptions?.driedFruitsGramsPerGuest !== undefined
    ? Math.max(0, customAssumptions.driedFruitsGramsPerGuest)
    : assumptions.driedFruitsGramsPerGuest;

  const nutsGrams = nutsRate * guestCount;
  const datesGrams = datesRate * guestCount;
  const driedFruitsGrams = driedFruitsRate * guestCount;
  const totalGrams = nutsGrams + datesGrams + driedFruitsGrams;

  // Retrieve candidate pools for each category under the selected budget band
  const nutsCandidates = getCategoryCandidates(allProducts, 'nuts', budgetBand);
  const datesCandidates = getCategoryCandidates(allProducts, 'dates', budgetBand);
  const fruitsCandidates = getCategoryCandidates(allProducts, 'driedFruits', budgetBand);

  // Helper to resolve the chosen products for a category
  function resolveSelectedProducts(
    candidates: Product[],
    count: number,
    presetIds?: string[]
  ): Product[] {
    if (candidates.length === 0) return [];
    const selected: Product[] = [];
    const takenIds = new Set<string>();

    // 1. Incorporate presets if valid and present in candidates
    if (presetIds && Array.isArray(presetIds)) {
      for (const id of presetIds) {
        if (selected.length >= count) break;
        const found = candidates.find(c => c.id === id);
        if (found && !takenIds.has(found.id)) {
          selected.push(found);
          takenIds.add(found.id);
        }
      }
    }

    // 2. Fill remaining slots from candidate list in order
    for (const c of candidates) {
      if (selected.length >= count) break;
      if (!takenIds.has(c.id)) {
        selected.push(c);
        takenIds.add(c.id);
      }
    }

    return selected;
  }

  const selectedNuts = resolveSelectedProducts(nutsCandidates, varietyCounts.nuts, options?.selectedProductIds?.nuts);
  const selectedDates = resolveSelectedProducts(datesCandidates, varietyCounts.dates, options?.selectedProductIds?.dates);
  const selectedFruits = resolveSelectedProducts(fruitsCandidates, varietyCounts.driedFruits, options?.selectedProductIds?.driedFruits);

  const items: MehmaanRecommendationItem[] = [];
  let estimatedTotalPkr = 0;

  // Helper to split category target grams across chosen variety items
  function partitionGrams(totalG: number, count: number): number[] {
    if (count <= 0 || totalG <= 0) return [];
    const base = Math.floor(totalG / count);
    const rem = totalG % count;
    return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
  }

  // Process category recommendations
  function processCategory(
    products: Product[],
    categoryGrams: number,
    catName: 'nuts' | 'dates' | 'driedFruits'
  ) {
    if (products.length === 0 || categoryGrams <= 0) return;
    const gramAllocations = partitionGrams(categoryGrams, products.length);

    for (let i = 0; i < products.length; i++) {
      const prod = products[i];
      const targetG = gramAllocations[i];
      const combo = resolveBestPackCombo(prod, targetG);

      if (combo && combo.packs.length > 0) {
        const isSinglePackType = combo.packs.length === 1;
        const portionWeight = isSinglePackType ? combo.packs[0].weight : combo.summary;
        const totalUnits = combo.packs.reduce((acc, p) => acc + p.units, 0);

        items.push({
          product: prod,
          category: catName,
          targetGrams: targetG,
          recommendedPortionWeight: portionWeight,
          recommendedUnits: isSinglePackType ? combo.packs[0].units : totalUnits,
          unitPrice: combo.packs[0]?.unitPrice || 0,
          itemTotal: combo.totalPrice,
          packCombo: combo,
        });
        estimatedTotalPkr += combo.totalPrice;
      } else {
        // Fallback to legacy single portion resolver if combo failed
        const legacyRes = resolveBestPortion(prod, targetG);
        if (legacyRes) {
          items.push({
            product: prod,
            category: catName,
            targetGrams: targetG,
            recommendedPortionWeight: legacyRes.weight,
            recommendedUnits: legacyRes.units,
            unitPrice: legacyRes.unitPrice,
            itemTotal: legacyRes.total,
          });
          estimatedTotalPkr += legacyRes.total;
        }
      }
    }
  }

  processCategory(selectedNuts, nutsGrams, 'nuts');
  processCategory(selectedDates, datesGrams, 'dates');
  processCategory(selectedFruits, driedFruitsGrams, 'driedFruits');

  return {
    setting: settingKey,
    guests: guestCount,
    totalGrams,
    assumptionSource,
    budgetBand,
    breakdown: {
      nutsGrams,
      datesGrams,
      driedFruitsGrams,
    },
    varietyCounts,
    items,
    estimatedTotalPkr,
  };
}
