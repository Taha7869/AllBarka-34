import type { LanguageCode } from './LanguageContext';

const entries: readonly (readonly [string, string, string, string])[] = [
  ['filters.title', 'Filter & sort', 'فلٹر اور ترتیب', 'التصفية والترتيب'],
  ['filters.hint', 'Choose your preferences, then show matching products.', 'اپنی پسند منتخب کریں، پھر متعلقہ مصنوعات دیکھیں۔', 'اختر تفضيلاتك، ثم اعرض المنتجات المطابقة.'],
  ['filters.showResults', 'Show {count} results', '{count} نتائج دیکھیں', 'عرض {count} نتيجة'],
  ['filters.previewCount', '{count} products match these choices', 'ان انتخاب کے مطابق {count} مصنوعات ہیں', 'يتطابق {count} منتجاً مع هذه الخيارات'],
  ['filters.reset', 'Reset choices', 'انتخاب صاف کریں', 'إعادة تعيين الخيارات'],
  ['filters.cancel', 'Cancel', 'منسوخ کریں', 'إلغاء'],
  ['filters.close', 'Close filters', 'فلٹر بند کریں', 'إغلاق المرشحات'],
  ['filters.collection', 'Current collection', 'موجودہ مجموعہ', 'المجموعة الحالية'],
  ['filters.zero', 'No products match yet. Clear a choice or widen your budget.', 'ابھی کوئی مصنوعات نہیں ملتیں۔ کوئی انتخاب ہٹائیں یا بجٹ بڑھائیں۔', 'لا توجد منتجات مطابقة حالياً. أزل أحد الخيارات أو زد الميزانية.'],
  ['filters.budgetHint', 'Based on the smallest available portion.', 'قیمت سب سے چھوٹی دستیاب مقدار کے مطابق ہے۔', 'بحسب أصغر كمية متاحة.'],
  ['filters.savedHint', 'Only products in your wishlist', 'صرف آپ کی پسندیدہ مصنوعات', 'المنتجات في قائمة رغباتك فقط'],
  ['filters.resetGroup', 'Reset', 'صاف کریں', 'إعادة تعيين'],
  ['filters.applied', '{count} active filters', '{count} فلٹر فعال ہیں', '{count} مرشحات نشطة'],
];

export const catalogFilterTranslations: Record<LanguageCode, Record<string, string>> = {
  en: Object.fromEntries(entries.map(([key, en]) => [key, en])),
  ur: Object.fromEntries(entries.map(([key, , ur]) => [key, ur])),
  ar: Object.fromEntries(entries.map(([key, , , ar]) => [key, ar])),
};
