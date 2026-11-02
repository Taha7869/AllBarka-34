import type { Product } from '../types';

export type MehmaanSetting = 'chai' | 'dawat' | 'iftar' | 'majlis';

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

export interface MehmaanRecommendationItem {
  product: Product;
  category: 'nuts' | 'dates' | 'driedFruits';
  targetGrams: number;
  recommendedPortionWeight: string;
  recommendedUnits: number;
  unitPrice: number;
  itemTotal: number;
}

export interface MehmaanPlanResult {
  setting: MehmaanSetting;
  guests: number;
  totalGrams: number;
  assumptionSource: string;
  breakdown: {
    nutsGrams: number;
    datesGrams: number;
    driedFruitsGrams: number;
  };
  items: MehmaanRecommendationItem[];
  estimatedTotalPkr: number;
}

/**
 * Maps a required net gram weight to standard catalog portions (e.g. 250g, 500g, 1kg)
 * Returns null if the product has no valid positive pricing or portions.
 */
export function resolveBestPortion(
  product: Product,
  targetGrams: number
): { weight: string; units: number; unitPrice: number; total: number } | null {
  const portions = Object.entries(product.prices || {})
    .filter(([_, price]) => typeof price === 'number' && price > 0)
    .map(([w, price]) => {
      let g = 0;
      if (w.endsWith('kg')) g = parseFloat(w) * 1000;
      else if (w.endsWith('g')) g = parseFloat(w);
      return { weight: w, grams: g, price };
    })
    .filter(p => p.grams > 0)
    .sort((a, b) => b.grams - a.grams); // Largest to smallest

  if (portions.length === 0) {
    return null;
  }

  // Find portion that fits target with minimum excess units
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

  // If target is smaller than the smallest portion, take 1 unit of smallest portion
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
 * Empty categories remain empty; inactive products cannot be recommended or priced.
 */
export function calculateMehmaanPlan(
  allProducts: Product[],
  guests: number,
  settingKey: MehmaanSetting = 'dawat',
  customAssumptions?: CustomServingAssumptions
): MehmaanPlanResult {
  const guestCount = Math.max(1, Math.min(200, Math.round(guests)));
  const assumptions = MEHMAAN_SETTINGS[settingKey] || MEHMAAN_SETTINGS.dawat;

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

  // Filter ONLY published, active, non-quote-only products with valid positive prices
  const isAvailable = (p: Product) =>
    p.active !== false &&
    !p.quoteOnly &&
    p.orderMode !== 'inquiry_quote' &&
    Object.values(p.prices || {}).some(pr => typeof pr === 'number' && pr > 0);

  const availableProducts = allProducts.filter(isAvailable);

  // Nuts: strictly nuts/dry-fruits category matching authentic nut varieties
  const nutsCandidates = availableProducts.filter(p =>
    (p.category === 'dry-fruits' || p.category === 'nuts') &&
    (p.id === 'pista' || p.id === 'kaju' || p.id === 'badam' || p.id === 'akhroot' ||
     p.name_en.toLowerCase().includes('pistachio') || p.name_en.toLowerCase().includes('cashew') || p.name_en.toLowerCase().includes('almond') || p.name_en.toLowerCase().includes('walnut'))
  );
  const primaryNut = nutsCandidates[0] || null;

  // Dates: strictly dates category or date products
  const datesCandidates = availableProducts.filter(p =>
    p.category === 'dates' || p.id.includes('date') || p.id === 'khajoor' || p.name_en.toLowerCase().includes('date')
  );
  const primaryDate = datesCandidates[0] || null;

  // Dried fruits: strictly dried fruits (figs, raisins, apricots, cranberries, mulberry)
  const fruitsCandidates = availableProducts.filter(p =>
    (p.category === 'dry-fruits' || p.category === 'fruits' || p.category === 'nuts') &&
    (p.id === 'afghan-figs' || p.id === 'kishmish' || p.id === 'khubani' || p.id === 'alubukhara' || p.id === 'golden-raisins' || p.id === 'black-raisins' || p.id === 'dried-mulberry' || p.id === 'dried-cranberries' ||
     p.name_en.toLowerCase().includes('fig') || p.name_en.toLowerCase().includes('apricot') || p.name_en.toLowerCase().includes('raisin'))
  );
  const primaryFruit = fruitsCandidates[0] || null;

  const items: MehmaanRecommendationItem[] = [];
  let estimatedTotalPkr = 0;

  if (primaryNut && nutsGrams > 0) {
    const nutRes = resolveBestPortion(primaryNut, nutsGrams);
    if (nutRes) {
      items.push({
        product: primaryNut,
        category: 'nuts',
        targetGrams: nutsGrams,
        recommendedPortionWeight: nutRes.weight,
        recommendedUnits: nutRes.units,
        unitPrice: nutRes.unitPrice,
        itemTotal: nutRes.total,
      });
      estimatedTotalPkr += nutRes.total;
    }
  }

  if (primaryDate && datesGrams > 0) {
    const dateRes = resolveBestPortion(primaryDate, datesGrams);
    if (dateRes) {
      items.push({
        product: primaryDate,
        category: 'dates',
        targetGrams: datesGrams,
        recommendedPortionWeight: dateRes.weight,
        recommendedUnits: dateRes.units,
        unitPrice: dateRes.unitPrice,
        itemTotal: dateRes.total,
      });
      estimatedTotalPkr += dateRes.total;
    }
  }

  if (primaryFruit && driedFruitsGrams > 0) {
    const fruitRes = resolveBestPortion(primaryFruit, driedFruitsGrams);
    if (fruitRes) {
      items.push({
        product: primaryFruit,
        category: 'driedFruits',
        targetGrams: driedFruitsGrams,
        recommendedPortionWeight: fruitRes.weight,
        recommendedUnits: fruitRes.units,
        unitPrice: fruitRes.unitPrice,
        itemTotal: fruitRes.total,
      });
      estimatedTotalPkr += fruitRes.total;
    }
  }

  return {
    setting: settingKey,
    guests: guestCount,
    totalGrams,
    assumptionSource: assumptions.assumptionSource,
    breakdown: {
      nutsGrams,
      datesGrams,
      driedFruitsGrams,
    },
    items,
    estimatedTotalPkr,
  };
}
