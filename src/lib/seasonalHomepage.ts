import type { LanguageCode } from '../contexts/LanguageContext';

export const SEASONAL_THEMES = ['ramadan', 'eid', 'shaadi', 'sardi'] as const;
export type ActiveSeasonId = (typeof SEASONAL_THEMES)[number];
export type SeasonalMode = 'auto' | 'default' | ActiveSeasonId;

export const VALID_SEASONAL_MODES: readonly SeasonalMode[] = [
  'auto',
  'default',
  'ramadan',
  'eid',
  'shaadi',
  'sardi',
] as const;

export interface LocalizedText {
  en: string;
  ur: string;
  ar: string;
}

export interface SeasonalThemeConfig {
  id: ActiveSeasonId;
  label: LocalizedText;
  eyebrow: LocalizedText;
  headlinePart1: LocalizedText;
  headlineAccent: LocalizedText;
  description: LocalizedText;
  primaryCtaLabel: LocalizedText;
  primaryCtaPath: string;
  secondaryCtaLabel: LocalizedText;
  secondaryCtaPath: string;
  categoryOrder: string[];
}

export const SEASONAL_THEME_CONFIGS: Record<ActiveSeasonId, SeasonalThemeConfig> = {
  ramadan: {
    id: 'ramadan',
    label: { en: 'Ramadan', ur: 'رمضان', ar: 'رمضان' },
    eyebrow: {
      en: 'Ramadan Reserve · Iftar & Suhoor Table',
      ur: 'رمضان ریزرو · افطار اور سحری دسترخوان',
      ar: 'مختارات رمضان · مائدة الإفطار والسحور',
    },
    headlinePart1: {
      en: 'Selected dates and pantry reserves for',
      ur: 'افطار اور سحری کے لیے منتخب کھجوریں اور',
      ar: 'تمور مختارة ومؤونة فاخرة لمائدة',
    },
    headlineAccent: {
      en: 'blessed Ramadan gatherings.',
      ur: 'بابرکت رمضان کی محفلیں۔',
      ar: 'رمضان المبارك.',
    },
    description: {
      en: 'Medina Ajwa, soft Medjool, whole roasted nuts, traditional murabba and gift-ready iftar hampers packed fresh from our Lahore house.',
      ur: 'مدینہ عجوہ، نرم مجدول، ثابت خشک میوہ جات، روایتی مربع جات اور افطار ہیمپرز — لاہور سے تازہ پیک۔',
      ar: 'عجوة المدينة والمجدول الطري والمكسرات الكاملة والمربى التقليدي وسلال الإفطار المغلفة طازجاً من دارنا في لاهور.',
    },
    primaryCtaLabel: {
      en: 'Shop Ramadan Dates',
      ur: 'رمضان کھجوریں دیکھیں',
      ar: 'تسوق تمور رمضان',
    },
    primaryCtaPath: '/shop/dates',
    secondaryCtaLabel: {
      en: 'Shop Dry Fruits',
      ur: 'خشک میوہ جات خریدیں',
      ar: 'تسوق الفواكه المجففة',
    },
    secondaryCtaPath: '/shop/dry-fruits',
    categoryOrder: [
      'dates',
      'dry-fruits',
      'bundles',
      'gift-boxes',
      'murabba-jaat',
      'essentials',
      'herbal-teas',
      'saunf',
      'seeds-snacks',
      'celebration-boxes',
      'oils',
      'herbs-spices',
      'all',
    ],
  },
  eid: {
    id: 'eid',
    label: { en: 'Eid', ur: 'عید', ar: 'العيد' },
    eyebrow: {
      en: 'Eid Gifting Atelier · Signature Hampers',
      ur: 'عید تحائف · خاص گفٹ ہیمپرز',
      ar: 'دار هدايا العيد · سلال فاخرة',
    },
    headlinePart1: {
      en: 'Thoughtful gift boxes dressed for',
      ur: 'عید کی خوشیوں کے لیے دلکش اور باوقار',
      ar: 'صناديق هدايا مختارة بعناية لأجواء',
    },
    headlineAccent: {
      en: 'Eid visits and family tables.',
      ur: 'عید ملن اور خاندانی دسترخوان۔',
      ar: 'العيد وزيارات الأحبة.',
    },
    description: {
      en: 'Ribboned gift chests, crisp pistachios, cashews, Medjool dates and signature dry-fruit trays ready for family visits and corporate gifting.',
      ur: 'خوبصورت ربن والے گفٹ باکسز، پستہ، کاجو، مجدول کھجوریں اور خشک میوہ جات کے تحائف — خاندانی اور کارپوریٹ تحفوں کے لیے۔',
      ar: 'صناديق هدايا مزينة بالشرائط وفستق وكاجو وتمور مجدول وصواني فواكه مجففة جاهزة لزيارات العائلة وهدايا الشركات.',
    },
    primaryCtaLabel: {
      en: 'Explore Eid Gifts',
      ur: 'عید گفٹ باکسز دیکھیں',
      ar: 'تسوق هدايا العيد',
    },
    primaryCtaPath: '/gifting',
    secondaryCtaLabel: {
      en: 'Shop Dry Fruits',
      ur: 'خشک میوہ جات خریدیں',
      ar: 'تسوق الفواكه المجففة',
    },
    secondaryCtaPath: '/shop/dry-fruits',
    categoryOrder: [
      'gift-boxes',
      'celebration-boxes',
      'bundles',
      'dry-fruits',
      'dates',
      'saunf',
      'herbal-teas',
      'essentials',
      'murabba-jaat',
      'seeds-snacks',
      'oils',
      'herbs-spices',
      'all',
    ],
  },
  shaadi: {
    id: 'shaadi',
    label: { en: 'Shaadi Season', ur: 'شادی سیزن', ar: 'موسم الأفراح' },
    eyebrow: {
      en: 'Shaadi & Mehmaan Atelier · Bid Boxes',
      ur: 'شادی و مہمان · بیڈ اور تبرک باکسز',
      ar: 'ركن الأفراح والضيافة · صناديق التوزيعات',
    },
    headlinePart1: {
      en: 'Bespoke bid boxes and dry-fruit trays for',
      ur: 'نکاح، ولیمہ اور مہمان نوازی کے لیے',
      ar: 'صناديق توزيعات وصواني ضيافة فاخرة لـ',
    },
    headlineAccent: {
      en: 'wedding celebrations.',
      ur: 'شادی کی یادگار تقاریب۔',
      ar: 'احتفالات الزفاف والضيافة.',
    },
    description: {
      en: 'Traditional Nikkah bid boxes, shahi mukhwas, whole almonds, pistachios and custom-packed family hampers prepared to order.',
      ur: 'نکاح بیڈ باکسز، شاہی سونف، ثابت بادام، پستہ اور آرڈر پر تیار کردہ شادی کے خاص تحائف۔',
      ar: 'صناديق توزيعات النكاح والشمر الملكي واللوز الكامل والفستق وسلال العائلة المحضرة حسب الطلب.',
    },
    primaryCtaLabel: {
      en: 'Browse Celebration Boxes',
      ur: 'شادی بیڈ باکسز دیکھیں',
      ar: 'تصفح صناديق الأفراح',
    },
    primaryCtaPath: '/shop/celebration-boxes',
    secondaryCtaLabel: {
      en: 'Shop Dry Fruits',
      ur: 'خشک میوہ جات خریدیں',
      ar: 'تسوق الفواكه المجففة',
    },
    secondaryCtaPath: '/shop/dry-fruits',
    categoryOrder: [
      'celebration-boxes',
      'gift-boxes',
      'dry-fruits',
      'saunf',
      'bundles',
      'dates',
      'essentials',
      'herbal-teas',
      'murabba-jaat',
      'seeds-snacks',
      'oils',
      'herbs-spices',
      'all',
    ],
  },
  sardi: {
    id: 'sardi',
    label: { en: 'Sardi (Winter)', ur: 'سردیوں کا سیزن', ar: 'موسم الشتاء' },
    eyebrow: {
      en: 'Winter Harvest · Sardi Reserve',
      ur: 'سردیوں کی سوغات · تازہ فصل',
      ar: 'موسم الشتاء · قطفة طازجة',
    },
    headlinePart1: {
      en: 'Fresh winter harvests of nuts, honey and',
      ur: 'سردیوں کی شاموں کے لیے تازہ خشک میوہ جات اور',
      ar: 'محاصيل الشتاء الطازجة من المكسرات والعسل و',
    },
    headlineAccent: {
      en: 'warm pantry traditions.',
      ur: 'روایتی گرم سوغات۔',
      ar: 'تقاليد الضيافة الدافئة.',
    },
    description: {
      en: 'Waziristan chilgoza, Kashmiri walnuts, Mamra almonds, traditional murabba, kehwa blends and cold-pressed oils for crisp winter evenings.',
      ur: 'وزیرستان چلغوزہ، کشمیری اخروٹ، مامرا بادام، روایتی مربع جات، کشمیری قہوہ اور خالص تیل سردیوں کی شاموں کے لیے۔',
      ar: 'صنوبر وزيرستان وجوز كشمير ولوز مامرا والمربى التقليدي وشاي القهوة والزيوت المعصورة على البارد لأمسيات الشتاء.',
    },
    primaryCtaLabel: {
      en: 'Shop Winter Dry Fruits',
      ur: 'سردیوں کے خشک میوہ جات',
      ar: 'تسوق الفواكه المجففة للشتاء',
    },
    primaryCtaPath: '/shop/dry-fruits',
    secondaryCtaLabel: {
      en: 'Explore Murabba & Teas',
      ur: 'مربع اور قہوہ دیکھیں',
      ar: 'استكشف المربى والشاي',
    },
    secondaryCtaPath: '/shop/murabba-jaat',
    categoryOrder: [
      'dry-fruits',
      'essentials',
      'murabba-jaat',
      'herbal-teas',
      'oils',
      'dates',
      'seeds-snacks',
      'bundles',
      'gift-boxes',
      'herbs-spices',
      'saunf',
      'celebration-boxes',
      'all',
    ],
  },
};

export function normalizeSeasonalMode(value: unknown): SeasonalMode {
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase() as SeasonalMode;
    if ((VALID_SEASONAL_MODES as readonly string[]).includes(trimmed)) {
      return trimmed;
    }
  }
  return 'auto';
}

function readHijriMonthDay(date: Date): { month: number; day: number } | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      month: 'numeric',
      day: 'numeric',
      timeZone: 'Asia/Karachi',
    });
    const parts = formatter.formatToParts(date);
    const monthStr = parts.find((p) => p.type === 'month')?.value;
    const dayStr = parts.find((p) => p.type === 'day')?.value;
    const month = monthStr ? Number.parseInt(monthStr, 10) : NaN;
    const day = dayStr ? Number.parseInt(dayStr, 10) : NaN;
    if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(day) && day >= 1 && day <= 31) {
      return { month, day };
    }
  } catch {
    // Fallback if runtime lacks Islamic calendar ICU data
  }
  return null;
}

function readKarachiGregorianMonth(date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      timeZone: 'Asia/Karachi',
    }).formatToParts(date);
    const m = Number.parseInt(parts.find((p) => p.type === 'month')?.value || '', 10);
    if (Number.isInteger(m) && m >= 1 && m <= 12) return m;
  } catch {
    // Fallback to UTC month
  }
  return date.getUTCMonth() + 1;
}

/**
 * Resolves the active seasonal homepage theme from admin mode and date.
 * - Admin explicit override ('ramadan' | 'eid' | 'shaadi' | 'sardi' | 'default') always wins.
 * - In 'auto' mode:
 *   1. Islamic calendar takes priority:
 *      - Sha'ban 23–30 & full Ramadan (month 9) -> 'ramadan'
 *      - Shawwal 1–10 (Eid-ul-Fitr) & Dhul Hijjah 5–15 (Eid-ul-Adha) -> 'eid'
 *   2. Gregorian Pakistan calendar seasons:
 *      - Dec & Jan -> 'sardi' (Winter harvest)
 *      - Nov, Feb & Mar -> 'shaadi' (Wedding & celebration season)
 *   3. Otherwise -> null (evergreen default storefront)
 */
export function resolveActiveSeason(
  mode: SeasonalMode | undefined | null,
  now: Date = new Date(),
): ActiveSeasonId | null {
  const normalized = normalizeSeasonalMode(mode);
  if (normalized === 'default') return null;
  if (normalized !== 'auto') return normalized;

  const hijri = readHijriMonthDay(now);
  if (hijri) {
    if (hijri.month === 9 || (hijri.month === 8 && hijri.day >= 23)) {
      return 'ramadan';
    }
    if ((hijri.month === 10 && hijri.day <= 10) || (hijri.month === 12 && hijri.day >= 5 && hijri.day <= 15)) {
      return 'eid';
    }
  }

  const month = readKarachiGregorianMonth(now);
  if (month === 12 || month === 1) return 'sardi';
  if (month === 11 || month === 2 || month === 3) return 'shaadi';
  return null;
}

export function getSeasonalTheme(
  mode: SeasonalMode | undefined | null,
  now: Date = new Date(),
): SeasonalThemeConfig | null {
  const active = resolveActiveSeason(mode, now);
  return active ? SEASONAL_THEME_CONFIGS[active] : null;
}

export function pickLocalizedSeasonal(text: LocalizedText, lang: LanguageCode): string {
  return text[lang] || text.en;
}
