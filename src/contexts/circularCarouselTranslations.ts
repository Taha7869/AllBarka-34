import type { LanguageCode } from './LanguageContext';

const en = {
  'circular.type': 'carousel',
  'circular.slide': 'product slide',
  'circular.position': 'Product {current} of {total}',
  'circular.tour': 'A complete tour of the boutique',
  'circular.swipe': 'Swipe to explore. The tour waits while you browse.',
  'circular.manual': 'Swipe or use the arrows to explore.',
} as const;

export type CircularCarouselTranslationKey = keyof typeof en;
export const circularCarouselTranslations: Record<LanguageCode, Record<CircularCarouselTranslationKey, string>> = {
  en,
  ur: {
    'circular.type': 'گردشی فہرست',
    'circular.slide': 'مصنوعات کی سلائیڈ',
    'circular.position': 'مصنوعہ {current} از {total}',
    'circular.tour': 'بوتیک کی تمام مصنوعات کا انتخاب',
    'circular.swipe': 'دیکھنے کے لیے سوائپ کریں۔ آپ کی تلاش کے دوران گردش رک جاتی ہے۔',
    'circular.manual': 'سوائپ کریں یا تیروں سے مصنوعات دیکھیں۔',
  },
  ar: {
    'circular.type': 'عرض دائري',
    'circular.slide': 'شريحة منتج',
    'circular.position': 'المنتج {current} من {total}',
    'circular.tour': 'جولة في جميع منتجات البوتيك',
    'circular.swipe': 'اسحب للاستكشاف. تنتظر الجولة أثناء تصفحك.',
    'circular.manual': 'اسحب أو استخدم الأسهم لاستكشاف المنتجات.',
  },
};
