import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type LanguageCode = 'en' | 'ur' | 'ar';

export interface LanguageContextValue {
  language: LanguageCode;
  isRtl: boolean;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, defaultText?: string) => string;
}

const STORAGE_KEY = 'allbarka_language';

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    home: 'Home',
    shop: 'Shop',
    giftBoxes: 'Gift Boxes',
    contact: 'Contact',
    cart: 'Cart',
    vipLogin: 'Patron Login',
    vipPatron: 'VIP Patron',
    menu: 'Menu',
    close: 'Close',
    collections: 'Collections',
    journal: 'Journal',
    account: 'Account',
    orders: 'Orders',
    theme: 'Theme',
    language: 'Language',
    dryFruits: 'Royal Dry Fruits',
    berries: 'Berries & Seeds',
    spices: 'Spices & Saffron',
    combos: 'Gift Combos',
    allProducts: 'All Products',
    storageGuide: 'Cold Storage Guide',
    saffronGuide: 'Kashmiri Saffron Guide',
    giftingEtiquette: 'Gifting Etiquette',
    aboutUs: 'Our Heritage',
    checkout: 'Checkout',
    heroHeadlinePart1: "Nature's finest, delivered with",
    heroHeadlinePart2: 'Pure Elegance',
    heroSubtitle: 'Experience the rich taste of handpicked Iranian pistachios, Chilean walnuts, and roasted cashews. Delivered fresh across Lahore.',
    heroSearchLabel: 'Search luxury dry fruits catalogue',
    searchPlaceholder1: 'Search Iranian Pistachios, Pine Nuts (Chilgoza)...',
    searchPlaceholder2: 'Search Chilean Walnuts & Royal Almonds...',
    searchPlaceholder3: 'Search Bespoke Gift Boxes & Deals...',
    searchPlaceholder4: 'Search Kashmiri Saffron & Medjool Dates...',
    search: 'Search',
    searchPrompt: 'Search dry fruits, saffron, gifts...',
    allBarkaSubtitle: 'LUXURY HARVESTS',
    wholesale: 'Wholesale',
    gifting: 'Luxury Gifting',
    cartEmpty: 'Your Shopping Bag is Empty',
    cartSubtotal: 'Subtotal',
    freeShippingHint: 'Add Rs. {amount} more for Complimentary Courier',
    freeShippingUnlocked: 'Complimentary Courier Unlocked',
    proceedToCheckout: 'Proceed to Checkout',
    continueShopping: 'Continue Shopping',
    filter: 'Filter',
    sort: 'Sort by',
    addToCart: 'Add to Bag',
    quickView: 'Quick View',
    inStock: 'In Stock',
    outOfStock: 'Sold Out',
    freshGuarantee: '100% Freshness Guarantee',
    secureCheckout: 'Verified Secure Checkout',
    lahoreConcierge: 'Lahore Concierge',
    connectWhatsapp: 'Connect on WhatsApp',
    newsletterTitle: 'Private Reserve / AllBarka Updates',
    newsletterDesc: 'Receive privileged notices regarding fresh seasonal harvests, wild Skardu arrivals, and exclusive patron privileges.',
    subscribe: 'Subscribe',
    subscribing: 'Submitting...',
    newsletterSuccess: 'Enrolled in AllBarka Private Reserve.',
    footerStory: 'Ethically procured single-origin dry fruits, nuts, and delicacies hand-graded and dispatched fresh daily from Lahore.',
    privacyConsent: 'I agree to receive seasonal harvest drops and private tasting previews.',
    termsNotice: 'Subscribers receive harvest bulletins & festive allocations. Never shared, unsubscribe anytime.',
    allRightsReserved: 'All rights reserved.',
  },
  ur: {
    home: 'ہوم',
    shop: 'دکان',
    giftBoxes: 'تحائف اور بکس',
    contact: 'رابطہ',
    cart: 'ٹوکری',
    vipLogin: 'معزز لاگ ان',
    vipPatron: 'معزز سرپرست',
    menu: 'فہرست',
    close: 'بند کریں',
    collections: 'مجموعات',
    journal: 'جریدہ اور مضامین',
    account: 'اکاؤنٹ',
    orders: 'آرڈرز',
    theme: 'تھیم',
    language: 'زبان',
    dryFruits: 'شاہی میوہ جات',
    berries: 'بیریز اور بیج',
    spices: 'خالص زعفران و مصالحہ جات',
    combos: 'گفٹ کمبوز',
    allProducts: 'تمام مصنوعات',
    storageGuide: 'تازگی اور اسٹوریج گائیڈ',
    saffronGuide: 'کشمیری زعفران گائیڈ',
    giftingEtiquette: 'شاہی تحائف کے آداب',
    aboutUs: 'ہماری تاریخ',
    checkout: 'چیک آؤٹ',
    heroHeadlinePart1: 'قدرت کے بہترین شاہی میوہ جات،',
    heroHeadlinePart2: 'خالص نفاست کے ساتھ',
    heroSubtitle: 'ایرانی پستے، چلی کے اخروٹ اور بھنے ہوئے کاجو کا لازوال ذائقہ۔ لاہور بھر میں محفوظ اور تازہ ترسیل۔',
    heroSearchLabel: 'خشک میوہ جات کی فہرست میں تلاش کریں',
    searchPlaceholder1: 'ایرانی پستے، چلغوزہ اور کاجو تلاش کریں...',
    searchPlaceholder2: 'چلی کے اخروٹ اور شاہی بادام تلاش کریں...',
    searchPlaceholder3: 'شاہی گفٹ بکس اور خاص پیکیجز تلاش کریں...',
    searchPlaceholder4: 'کشمیری زعفران اور مدینہ کی عجوہ کھجوریں تلاش کریں...',
    search: 'تلاش کریں',
    searchPrompt: 'خشک میوہ جات، زعفران یا گفٹ باکس تلاش کریں...',
    allBarkaSubtitle: 'شاہی سوغات',
    wholesale: 'تھوک / ہول سیل',
    gifting: 'شاہی تحائف',
    cartEmpty: 'آپ کا شاپنگ بیگ خالی ہے',
    cartSubtotal: 'میزان',
    freeShippingHint: 'مفت ترسیل کے لیے مزید {amount} روپے شامل کریں',
    freeShippingUnlocked: 'مفت ترسیل فعال ہو گئی ہے',
    proceedToCheckout: 'چیک آؤٹ کی طرف بڑھیں',
    continueShopping: 'خریداری جاری رکھیں',
    filter: 'فلٹر کریں',
    sort: 'ترتیب دیں',
    addToCart: 'بیگ میں شامل کریں',
    quickView: 'فوری جائزہ',
    inStock: 'دستیاب ہے',
    outOfStock: 'ختم ہو چکا',
    freshGuarantee: '۱۰۰ فیصد تازگی کی ضمانت',
    secureCheckout: 'محفوظ تصدیق شدہ چیک آؤٹ',
    lahoreConcierge: 'لاہور دربان / کونسیرج',
    connectWhatsapp: 'واٹس ایپ پر رابطہ کریں',
    newsletterTitle: 'شاہی خصوصی خبرنامہ',
    newsletterDesc: 'تازہ فصلوں، گلگت و سکردو کی آمد اور خصوصی پیشکشوں کی پیشگی اطلاع حاصل کریں۔',
    subscribe: 'شامل ہوں',
    subscribing: 'ارسال ہو رہا ہے...',
    newsletterSuccess: 'آپ آل برکہ کے خصوصی ریزرو میں شامل ہو چکے ہیں۔',
    footerStory: 'لاہور سے روزانہ تازہ بھیجے جانے والے خالص، اعلیٰ ترین خشک میوہ جات اور شاہی سوغاتیں۔',
    privacyConsent: 'میں تازہ فصلوں کی آمد اور نجی پیشکشوں سے مطلع رہنے کی توثیق کرتا ہوں۔',
    termsNotice: 'ہم آپ کی معلومات کو محفوظ رکھتے ہیں، کسی بھی وقت رکنیت ختم کر سکتے ہیں۔',
    allRightsReserved: 'جملہ حقوق محفوظ ہیں۔',
  },
  ar: {
    home: 'الرئيسية',
    shop: 'المتجر',
    giftBoxes: 'صناديق الهدايا',
    contact: 'اتصل بنا',
    cart: 'السلة',
    vipLogin: 'دخول كبار الشخصيات',
    vipPatron: 'عميل مميز',
    menu: 'القائمة',
    close: 'إغلاق',
    collections: 'المجموعات',
    journal: 'المجلة والقصص',
    account: 'الحساب',
    orders: 'الطلبات',
    theme: 'المظهر',
    language: 'اللغة',
    dryFruits: 'الفواكه المجففة الملكية',
    berries: 'التوت والبذور',
    spices: 'الزعفران والبهارات',
    combos: 'باقات الهدايا',
    allProducts: 'جميع المنتجات',
    storageGuide: 'دليل حفظ النضارة',
    saffronGuide: 'دليل الزعفران الكشميري',
    giftingEtiquette: 'أصول الإهداء الفاخر',
    aboutUs: 'تاريخنا وأصالتنا',
    checkout: 'الدفع',
    heroHeadlinePart1: 'أجود ثمار الطبيعة، بلمسة من',
    heroHeadlinePart2: 'الفخامة الخالصة',
    heroSubtitle: 'تذوق الفستق الإيراني الفاخر والجوز والكاجو المحمص. توصيل طازج وموثوق في جميع أنحاء لاهور.',
    heroSearchLabel: 'ابحث في قائمة الفواكه المجففة الفاخرة',
    searchPlaceholder1: 'ابحث عن الفستق الإيراني، الصنوبر (چلغوزة)...',
    searchPlaceholder2: 'ابحث عن الجوز التشيلي واللوز الملكي...',
    searchPlaceholder3: 'ابحث عن صناديق الهدايا الفاخرة وباقات العروض...',
    searchPlaceholder4: 'ابحث عن الزعفران الكشميري وتمور المجدول...',
    search: 'بحث',
    searchPrompt: 'ابحث عن الفواكه المجففة، الزعفران، الهدايا...',
    allBarkaSubtitle: 'محاصيل فاخرة',
    wholesale: 'بالجملة',
    gifting: 'الهدايا الفاخرة',
    cartEmpty: 'حقيبة التسوق فارغة',
    cartSubtotal: 'المجموع الفرعي',
    freeShippingHint: 'أضف {amount} روبية إضافية للحصول على شحن مجاني',
    freeShippingUnlocked: 'تم تفعيل الشحن المجاني',
    proceedToCheckout: 'متابعة الدفع',
    continueShopping: 'مواصلة التسوق',
    filter: 'تصفية',
    sort: 'ترتيب حسب',
    addToCart: 'أضف إلى السلة',
    quickView: 'نظرة سريعة',
    inStock: 'متوفر',
    outOfStock: 'نفد المخزون',
    freshGuarantee: 'ضمان النضارة ١٠٠٪',
    secureCheckout: 'دفع آمن ومضمون',
    lahoreConcierge: 'خدمة كونسيرج لاهور',
    connectWhatsapp: 'تواصل عبر واتساب',
    newsletterTitle: 'نشرة المحاصيل الخاصة',
    newsletterDesc: 'احصل على إشعارات خاصة بوصول المحاصيل الموسمية الطازجة وعروض الأعضاء الحصرية.',
    subscribe: 'اشتراك',
    subscribing: 'جاري الإرسال...',
    newsletterSuccess: 'تم انضمامك إلى قائمة المحاصيل الخاصة بنجاح.',
    footerStory: 'فواكه مجففة ومكسرات فاخرة مفروزة يدوياً ومغلفة بعناية لتصلكم طازجة يومياً من لاهور.',
    privacyConsent: 'أوافق على استلام تحديثات المحاصيل الموسمية ودعوات التذوق الخاصة.',
    termsNotice: 'بياناتكم سرية ومحفوظة تماماً، يمكنكم إلغاء الاشتراك في أي وقت.',
    allRightsReserved: 'جميع الحقوق محفوظة.',
  }
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ur' || saved === 'ar') {
      return saved;
    }
  } catch {
    // localStorage restricted in certain private modes
  }
  return 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);

  const isRtl = useMemo(() => language === 'ur' || language === 'ar', [language]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  // Update document attributes without remounting or breaking existing state
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    if (isRtl) {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [language, isRtl]);

  const t = useCallback((key: string, defaultText = ''): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || defaultText || key;
  }, [language]);

  const value = useMemo(() => ({
    language,
    isRtl,
    setLanguage,
    t
  }), [language, isRtl, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      isRtl: false,
      setLanguage: () => {},
      t: (key: string, defaultText = '') => defaultText || key
    };
  }
  return context;
}
