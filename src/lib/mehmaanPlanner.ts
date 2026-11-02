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
    description_en: 'Crisp roasted pistachios, cashews, and delicate dried apricots paired with tea.',
    description_ur: 'چائے کے ساتھ کرسپی بھنے ہوئے پستے، کاجو اور خستہ خوبانی۔',
    description_ar: 'فستق محمص مقرمش، كاجو، ومشمش مجفف فاخر يقدم مع الشاي.',
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
    description_ar: 'وليمة فخمة تشتمل على مكسرات مشكلة فاخرة، تمور مجدول/صفاوي، وتين أفغاني.',
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
    description_ur: 'افطار کی برکت کے لیے اعلیٰ عجوہ و صفاوی کھجوریں، طاقت بخش بادام اور تلسی چیا بیج۔',
    description_ar: 'تمور عجوة وصفاوي مباركة لكسر الصيام، مع لوز مغذٍ وبذور محمصة.',
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
  },
};

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
 */
export function resolveBestPortion(product: Product, targetGrams: number): { weight: string; units: number; unitPrice: number; total: number } {
  const portions = Object.entries(product.prices || {})
    .filter(([_, price]) => typeof price === 'number' && price > 0)
    .map(([w, price]) => {
      let g = 250;
      if (w.endsWith('kg')) g = parseFloat(w) * 1000;
      else if (w.endsWith('g')) g = parseFloat(w);
      return { weight: w, grams: g, price };
    })
    .sort((a, b) => b.grams - a.grams); // Largest to smallest

  if (portions.length === 0) {
    return { weight: '250g', units: 1, unitPrice: 0, total: 0 };
  }

  // Find portion that fits target with minimum excess units
  // Prefer 1kg or 500g if target is large, otherwise 250g
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
 * Calculates Mehmaan table servings and selects matching catalog items
 */
export function calculateMehmaanPlan(
  allProducts: Product[],
  guests: number,
  settingKey: MehmaanSetting = 'dawat'
): MehmaanPlanResult {
  const guestCount = Math.max(1, Math.min(200, Math.round(guests)));
  const assumptions = MEHMAAN_SETTINGS[settingKey] || MEHMAAN_SETTINGS.dawat;

  const nutsGrams = assumptions.nutsGramsPerGuest * guestCount;
  const datesGrams = assumptions.datesGramsPerGuest * guestCount;
  const driedFruitsGrams = assumptions.driedFruitsGramsPerGuest * guestCount;
  const totalGrams = nutsGrams + datesGrams + driedFruitsGrams;

  // Filter candidate products
  const nutsCandidates = allProducts.filter(p =>
    (p.category === 'dry-fruits' || p.category === 'nuts') &&
    (p.id === 'pista' || p.id === 'kaju' || p.id === 'badam' || p.name_en.toLowerCase().includes('pistachio') || p.name_en.toLowerCase().includes('cashew'))
  );
  const primaryNut = nutsCandidates[0] || allProducts.find(p => p.id === 'pista') || allProducts[0];

  const datesCandidates = allProducts.filter(p =>
    p.category === 'dates' || p.id.includes('date') || p.id === 'khajoor' || p.id === 'safawi' || p.id === 'ajwa-dates'
  );
  const primaryDate = datesCandidates[0] || allProducts.find(p => p.id === 'safawi' || p.id === 'ajwa-dates') || allProducts[1] || allProducts[0];

  const fruitsCandidates = allProducts.filter(p =>
    p.id === 'afghan-figs' || p.id === 'anjeer' || p.id === 'kishmish' || p.id === 'khubani' || p.name_en.toLowerCase().includes('fig') || p.name_en.toLowerCase().includes('apricot')
  );
  const primaryFruit = fruitsCandidates[0] || allProducts.find(p => p.id === 'afghan-figs' || p.id === 'anjeer') || allProducts[2] || allProducts[0];

  const items: MehmaanRecommendationItem[] = [];
  let estimatedTotalPkr = 0;

  if (primaryNut) {
    const nutRes = resolveBestPortion(primaryNut, nutsGrams);
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

  if (primaryDate) {
    const dateRes = resolveBestPortion(primaryDate, datesGrams);
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

  if (primaryFruit) {
    const fruitRes = resolveBestPortion(primaryFruit, driedFruitsGrams);
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

  return {
    setting: settingKey,
    guests: guestCount,
    totalGrams,
    breakdown: {
      nutsGrams,
      datesGrams,
      driedFruitsGrams,
    },
    items,
    estimatedTotalPkr,
  };
}
