export const CONSENT_POLICY_VERSION = '2026-11-20';
export const CONSENT_STORAGE_KEY = 'allbarka_consent_v1';
export const LEGACY_NOTICE_KEY = 'allbarka_storage_notice';

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing';

export interface ConsentCategories {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentRecord {
  anonymousId: string;
  categories: ConsentCategories;
  policyVersion: string;
  updatedAt: string;
  gpcRespected?: boolean;
}

export interface ConsentLogPayload {
  anonymousId: string;
  categories: ConsentCategories;
  policyVersion: string;
  timestamp: string;
  gpc: boolean;
}

export interface LocalizedText {
  en: string;
  ur: string;
  ar: string;
}

export interface StorageInventoryEntry {
  key: string;
  storageType: 'cookie' | 'localStorage' | 'sessionStorage' | 'script';
  category: ConsentCategory;
  purpose: LocalizedText;
  duration: LocalizedText;
}

const ANON_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;
const VERSION_RE = /^[a-zA-Z0-9._-]{1,32}$/;

export function isGpcEnabled(nav?: { globalPrivacyControl?: boolean } | null): boolean {
  const target = nav !== undefined ? nav : typeof navigator !== 'undefined' ? (navigator as Navigator & { globalPrivacyControl?: boolean }) : null;
  return Boolean(target && target.globalPrivacyControl === true);
}

export function defaultConsentCategories(): ConsentCategories {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
  };
}

export function generateAnonymousConsentId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `ab_${crypto.randomUUID().replace(/-/g, '')}`;
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return `ab_${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
    }
  } catch {
    // Fallback below
  }
  const rand = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `ab_${rand.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).padEnd(16, '0')}`;
}

export function parseStoredConsent(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.anonymousId !== 'string' || !ANON_ID_RE.test(parsed.anonymousId)) return null;
    if (typeof parsed.policyVersion !== 'string' || !VERSION_RE.test(parsed.policyVersion)) return null;
    if (typeof parsed.updatedAt !== 'string' || Number.isNaN(Date.parse(parsed.updatedAt))) return null;
    const cats = parsed.categories;
    if (!cats || typeof cats !== 'object') return null;
    if (cats.necessary !== true || typeof cats.analytics !== 'boolean' || typeof cats.marketing !== 'boolean') {
      return null;
    }
    return {
      anonymousId: parsed.anonymousId,
      categories: {
        necessary: true,
        analytics: cats.analytics,
        marketing: cats.marketing,
      },
      policyVersion: parsed.policyVersion,
      updatedAt: parsed.updatedAt,
      ...(typeof parsed.gpcRespected === 'boolean' ? { gpcRespected: parsed.gpcRespected } : {}),
    };
  } catch {
    return null;
  }
}

export function readStoredConsent(storage?: Pick<Storage, 'getItem'> | null): ConsentRecord | null {
  try {
    const store = storage !== undefined ? storage : typeof window !== 'undefined' ? window.localStorage : null;
    if (!store) return null;
    return parseStoredConsent(store.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredConsent(
  record: ConsentRecord,
  storage?: Pick<Storage, 'setItem' | 'removeItem'> | null
): boolean {
  try {
    const store = storage !== undefined ? storage : typeof window !== 'undefined' ? window.localStorage : null;
    if (!store) return false;
    store.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    try {
      store.removeItem(LEGACY_NOTICE_KEY);
    } catch {
      // Ignore cleanup failures
    }
    return true;
  } catch {
    return false;
  }
}

export function needsConsentPrompt(
  record: ConsentRecord | null,
  currentVersion: string = CONSENT_POLICY_VERSION
): boolean {
  return !record || record.policyVersion !== currentVersion;
}

export function hasEffectiveConsent(
  record: ConsentRecord | null,
  category: ConsentCategory,
  options?: { currentVersion?: string; gpcEnabled?: boolean }
): boolean {
  if (category === 'necessary') return true;
  const currentVersion = options?.currentVersion ?? CONSENT_POLICY_VERSION;
  if (!record || record.policyVersion !== currentVersion) {
    return false;
  }
  return record.categories[category] === true;
}

export function validateConsentLogPayload(body: unknown): ConsentLogPayload | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;

  if (typeof raw.anonymousId !== 'string' || !ANON_ID_RE.test(raw.anonymousId.trim())) return null;
  const anonymousId = raw.anonymousId.trim();

  if (typeof raw.policyVersion !== 'string' || !VERSION_RE.test(raw.policyVersion.trim())) return null;
  const policyVersion = raw.policyVersion.trim();

  const cats = raw.categories;
  if (!cats || typeof cats !== 'object' || Array.isArray(cats)) return null;
  const c = cats as Record<string, unknown>;
  if (c.necessary !== true || typeof c.analytics !== 'boolean' || typeof c.marketing !== 'boolean') {
    return null;
  }

  let timestamp = new Date().toISOString();
  if (raw.timestamp !== undefined) {
    if (typeof raw.timestamp !== 'string' || raw.timestamp.length > 40 || Number.isNaN(Date.parse(raw.timestamp))) {
      return null;
    }
    timestamp = new Date(raw.timestamp).toISOString();
  }

  const gpc = raw.gpc === true;

  return {
    anonymousId,
    categories: {
      necessary: true,
      analytics: c.analytics,
      marketing: c.marketing,
    },
    policyVersion,
    timestamp,
    gpc,
  };
}

/**
 * Code-derived inventory of every cookie, browser storage key, and optional script gate
 * used across AllBarka. Displayed live on /policies/cookies.
 */
export const STORAGE_INVENTORY: readonly StorageInventoryEntry[] = [
  {
    key: '__session',
    storageType: 'cookie',
    category: 'necessary',
    purpose: {
      en: 'HTTP-only signed session cookie for authenticated patron and admin accounts.',
      ur: 'سائن اِن صارفین اور ایڈمن اکاؤنٹس کے لیے محفوظ HTTP-only سیشن کوکی۔',
      ar: 'ملف تعريف جلسة آمن (HTTP-only) لحسابات العملاء المسجلين والإدارة.',
    },
    duration: {
      en: 'Up to 5 days or until sign-out',
      ur: 'زیادہ سے زیادہ 5 دن یا سائن آؤٹ تک',
      ar: 'حتى 5 أيام أو حتى تسجيل الخروج',
    },
  },
  {
    key: CONSENT_STORAGE_KEY,
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Saves your cookie and privacy preferences, policy version, and random anonymous consent ID.',
      ur: 'آپ کی کوکی اور رازداری کی ترجیحات، پالیسی ورژن اور بے نام رضامندی آئی ڈی محفوظ رکھتی ہے۔',
      ar: 'يحفظ تفضيلات ملفات الارتباط والخصوصية وإصدار السياسة ومعرّف الموافقة المجهول.',
    },
    duration: {
      en: 'Persistent until cleared or policy version updates',
      ur: 'پالیسی ورژن بدلنے یا براؤزر ڈیٹا صاف کرنے تک',
      ar: 'دائم حتى مسح البيانات أو تحديث إصدار السياسة',
    },
  },
  {
    key: 'allbarka_cart_v1',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Preserves selected products, weights, and quantities in your shopping bag.',
      ur: 'آپ کے شاپنگ بیگ میں موجود مصنوعات، وزن اور مقدار محفوظ رکھتی ہے۔',
      ar: 'يحفظ المنتجات والأوزان والكميات المختارة في حقيبة التسوق.',
    },
    duration: {
      en: 'Persistent until checkout or bag cleared',
      ur: 'آرڈر مکمل ہونے یا بیگ خالی کرنے تک',
      ar: 'دائم حتى إتمام الطلب أو إفراغ الحقيبة',
    },
  },
  {
    key: 'allbarka_selected_addons_v1',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Remembers optional gift add-ons (cards, sleeves, trays) attached to your current bag.',
      ur: 'آپ کے بیگ کے ساتھ منتخب کردہ گفٹ ایڈ آنز (کارڈ، سلیو، ٹرے) یاد رکھتی ہے۔',
      ar: 'يتذكر إضافات الهدايا الاختيارية المرفقة بحقيبة التسوق الحالية.',
    },
    duration: {
      en: 'Persistent until checkout or bag cleared',
      ur: 'آرڈر مکمل ہونے یا بیگ خالی کرنے تک',
      ar: 'دائم حتى إتمام الطلب أو إفراغ الحقيبة',
    },
  },
  {
    key: 'allbarka_delivery_city',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Remembers your selected Pakistan city for accurate delivery estimates.',
      ur: 'درست ڈیلیوری چارجز دکھانے کے لیے آپ کا منتخب شہر یاد رکھتی ہے۔',
      ar: 'يتذكر مدينتك المختارة في باكستان لحساب تقدير التوصيل بدقة.',
    },
    duration: {
      en: 'Persistent until changed or cleared',
      ur: 'تبدیل کرنے یا صاف کرنے تک',
      ar: 'دائم حتى التغيير أو المسح',
    },
  },
  {
    key: 'allbarka_language',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Stores your chosen storefront language (English, Urdu, or Arabic).',
      ur: 'آپ کی منتخب کردہ زبان (انگریزی، اردو یا عربی) محفوظ رکھتی ہے۔',
      ar: 'يحفظ لغة المتجر المختارة (الإنجليزية أو الأردية أو العربية).',
    },
    duration: {
      en: 'Persistent until changed or cleared',
      ur: 'تبدیل کرنے یا صاف کرنے تک',
      ar: 'دائم حتى التغيير أو المسح',
    },
  },
  {
    key: 'allbarka_theme',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Stores your Light or Dark appearance preference.',
      ur: 'لائٹ یا ڈارک تھیم کا انتخاب محفوظ رکھتی ہے۔',
      ar: 'يحفظ تفضيل المظهر الفاتح أو الداكن.',
    },
    duration: {
      en: 'Persistent until changed or cleared',
      ur: 'تبدیل کرنے یا صاف کرنے تک',
      ar: 'دائم حتى التغيير أو المسح',
    },
  },
  {
    key: 'allbarka_currency_preference',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Remembers your approximate display currency (PKR, GBP, USD, or AED); checkout always settles in PKR.',
      ur: 'اندازاً قیمت دکھانے کی کرنسی (PKR، GBP، USD، AED) یاد رکھتی ہے؛ ادائیگی ہمیشہ PKR میں ہوتی ہے۔',
      ar: 'يتذكر عملة العرض التقريبية (PKR أو GBP أو USD أو AED)؛ يتم الدفع دائمًا بالروبية الباكستانية.',
    },
    duration: {
      en: 'Persistent until changed or cleared',
      ur: 'تبدیل کرنے یا صاف کرنے تک',
      ar: 'دائم حتى التغيير أو المسح',
    },
  },
  {
    key: 'allbarka_saved_products',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Keeps your locally bookmarked / favourite items on this device.',
      ur: 'اس ڈیوائس پر آپ کی پسندیدہ (محفوظ) مصنوعات کی فہرست رکھتی ہے۔',
      ar: 'يحفظ قائمة المنتجات المفضلة لديك محليًا على هذا الجهاز.',
    },
    duration: {
      en: 'Persistent until removed or cleared',
      ur: 'ہٹانے یا صاف کرنے تک',
      ar: 'دائم حتى الإزالة أو المسح',
    },
  },
  {
    key: 'allbarka_saved_boxes_v1',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Saves custom hamper or box combinations you build for reordering.',
      ur: 'دوبارہ آرڈر کے لیے آپ کے بنائے ہوئے ہیمپر یا باکس سیٹ محفوظ رکھتی ہے۔',
      ar: 'يحفظ تشكيلات السلال أو الصناديق المخصصة لإعادة طلبها لاحقًا.',
    },
    duration: {
      en: 'Persistent until removed or cleared',
      ur: 'ہٹانے یا صاف کرنے تک',
      ar: 'دائم حتى الإزالة أو المسح',
    },
  },
  {
    key: 'allbarka_addresses_v1',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Local address book stored only on your browser for quicker repeat checkout.',
      ur: 'تیز چیک آؤٹ کے لیے صرف آپ کے براؤزر میں محفوظ پتے۔',
      ar: 'دفتر عناوين محلي محفوظ في متصفحك فقط لتسريع إتمام الطلبات المتكررة.',
    },
    duration: {
      en: 'Persistent until deleted by you',
      ur: 'آپ کے حذف کرنے تک',
      ar: 'دائم حتى تقوم بحذفه',
    },
  },
  {
    key: 'allbarka_compare_v1 & allbarka_recent_v1',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Remembers products you selected to compare and items you recently viewed locally.',
      ur: 'موازنے کے لیے منتخب اور حال ہی میں دیکھی گئی مصنوعات مقامی طور پر یاد رکھتی ہے۔',
      ar: 'يتذكر المنتجات المختارة للمقارنة والمنتجات التي شاهدتها مؤخرًا محليًا.',
    },
    duration: {
      en: 'Persistent until cleared',
      ur: 'براؤزر ڈیٹا صاف کرنے تک',
      ar: 'دائم حتى مسح البيانات',
    },
  },
  {
    key: 'allbarka_pwa_dismissed & allbarka_ios_a2hs_dismissed',
    storageType: 'localStorage',
    category: 'necessary',
    purpose: {
      en: 'Remembers if you dismissed the one-time "Install to Home Screen" banner or iOS Safari guide.',
      ur: 'یاد رکھتی ہے کہ آپ نے ہوم اسکرین انسٹال بینر یا iOS سفاری رہنمائی بند کر دی تھی۔',
      ar: 'يتذكر ما إذا كنت قد أغلقت إشعار التثبيت على الشاشة الرئيسية أو دليل سفاري على iOS.',
    },
    duration: {
      en: 'Persistent until cleared',
      ur: 'براؤزر ڈیٹا صاف کرنے تک',
      ar: 'دائم حتى مسح البيانات',
    },
  },
  {
    key: 'allbarka_checkout_draft_v1, allbarka_checkout_attempt_v1, allbarka_preferred_payment',
    storageType: 'sessionStorage',
    category: 'necessary',
    purpose: {
      en: 'Protects your in-progress checkout form, payment choice, and duplicate-order prevention key.',
      ur: 'چیک آؤٹ فارم، ادائیگی کا طریقہ اور ڈبل آرڈر سے بچاؤ کی کلید سیشن کے دوران محفوظ رکھتی ہے۔',
      ar: 'يحفظ نموذج الدفع الجاري وخيار الدفع ومفتاح منع تكرار الطلب خلال الجلسة.',
    },
    duration: {
      en: 'Current browser tab session (cleared on order completion)',
      ur: 'موجودہ براؤزر سیشن (آرڈر مکمل ہونے پر ختم)',
      ar: 'جلسة المتصفح الحالية (تُمسح عند إتمام الطلب)',
    },
  },
  {
    key: 'allbarka_order_success, allbarka_latest_order, pendingOrderId, pendingClaimToken',
    storageType: 'sessionStorage',
    category: 'necessary',
    purpose: {
      en: 'Displays your order confirmation receipt and lets you attach a guest order after signing in.',
      ur: 'آرڈر کی تصدیقی رسید دکھانے اور سائن اِن کے بعد گیسٹ آرڈر اکاؤنٹ سے جوڑنے کے لیے۔',
      ar: 'يعرض إيصال تأكيد الطلب ويتيح ربط طلب الضيف بحسابك بعد تسجيل الدخول.',
    },
    duration: {
      en: 'Current browser tab session',
      ur: 'موجودہ براؤزر سیشن',
      ar: 'جلسة المتصفح الحالية',
    },
  },
  {
    key: 'allbarka_vite_preload_reload & allbarka_chunk_reload_attempted',
    storageType: 'sessionStorage',
    category: 'necessary',
    purpose: {
      en: 'Prevents reload loops if a storefront asset updates while your tab is open.',
      ur: 'ویب سائٹ اپ ڈیٹ ہونے پر بار بار ری لوڈ لوپ سے بچاتی ہے۔',
      ar: 'يمنع تكرار إعادة التحميل عند تحديث ملفات المتجر أثناء فتح الصفحة.',
    },
    duration: {
      en: 'Current browser tab session',
      ur: 'موجودہ براؤزر سیشن',
      ar: 'جلسة المتصفح الحالية',
    },
  },
  {
    key: 'allbarka_seen:*',
    storageType: 'sessionStorage',
    category: 'analytics',
    purpose: {
      en: 'Prevents double-counting anonymous aggregate product views per session. Disabled if Global Privacy Control (GPC) or Do Not Track is enabled, or if Analytics is declined.',
      ur: 'فی سیشن بے نام پروڈکٹ ویوز کی دوہری گنتی روکتی ہے۔ GPC، Do Not Track یا تجزیات رد کرنے پر بند رہتی ہے۔',
      ar: 'يمنع احتساب مشاهدات المنتجات المجهولة مرتين في نفس الجلسة. يتوقف تلقائيًا عند تفعيل GPC أو رفض التحليلات.',
    },
    duration: {
      en: 'Current browser tab session',
      ur: 'موجودہ براؤزر سیشن',
      ar: 'جلسة المتصفح الحالية',
    },
  },
  {
    key: 'Optional Analytics & Marketing Scripts (e.g. Google Analytics, Meta Pixel)',
    storageType: 'script',
    category: 'marketing',
    purpose: {
      en: 'Strictly gated behind ConsentGate. No third-party analytics or advertising scripts load unless you explicitly grant consent for that category.',
      ur: 'ConsentGate کے پیچھے بند ہیں۔ آپ کی واضح اجازت کے بغیر کوئی بھی تھرڈ پارٹی اینالیٹکس یا مارکیٹنگ اسکرپٹ لوڈ نہیں ہوتا۔',
      ar: 'مقيدة بالكامل عبر ConsentGate. لا يتم تحميل أي نصوص برمجية للتحليلات أو التسويق من جهات خارجية إلا بعد موافقتك الصريحة.',
    },
    duration: {
      en: 'Inactive by default; only active while consent is granted',
      ur: 'بائی ڈیفالٹ بند؛ صرف اجازت برقرار رہنے تک فعال',
      ar: 'غير نشطة افتراضيًا؛ تعمل فقط طالما كانت الموافقة ممنوحة',
    },
  },
];
