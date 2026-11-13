/** Shared care, packing and allergen copy so every intake product reads like the existing catalogue. */
import { careFacility, careStorage } from '../data/catalogCare';
import type { StorageKind } from '../data/care/types';

const tr = (en: string, ur: string, ar: string) => ({ en, ur, ar });
const allergens = {
  nuts: tr('Contains tree nuts.', 'اس میں درختوں کے میوے شامل ہیں۔', 'يحتوي على مكسرات الأشجار.'),
  peanut: tr('Contains peanuts.', 'اس میں مونگ پھلی شامل ہے۔', 'يحتوي على الفول السوداني.'),
  honey: tr('Not suitable for infants under 12 months.', 'بارہ ماہ سے کم عمر بچوں کے لیے موزوں نہیں۔', 'غير مناسب للرضع دون 12 شهرًا.'),
  none: tr('Check the label for any personal sensitivity.', 'کسی ذاتی حساسیت کے لیے لیبل دیکھیں۔', 'راجع الملصق عند وجود أي حساسية.'),
};
const container = {
  liquid: tr('Sealed bottle', 'سیل بند بوتل', 'زجاجة مغلقة'),
  preserve: tr('Sealed jar', 'سیل بند جار', 'برطمان مغلق'),
  food: tr('Food-grade pouch or jar, sealed for dispatch', 'خوراک کے لیے موزوں پاؤچ یا جار، روانگی کے لیے سیل بند', 'كيس أو برطمان مناسب للأغذية ومختوم للإرسال'),
};
const portions = tr('Available net portions', 'دستیاب خالص وزن', 'الحصص الصافية المتاحة');
const volumes = tr('Available volumes', 'دستیاب مقدار', 'الأحجام المتاحة');

/** Fill the shared care, packing and allergen copy so every new product reads like the existing catalogue. */
export function enrichIntakeProduct(source: Record<string, any>) {
  const { careKind, ...rest } = source;
  const labels = (source.commerce.options as Array<{ label: string }>).map(option => option.label).join(' · ');
  const liquid = source.commerce.kind === 'liquid';
  const box = liquid ? container.liquid : careKind === 'preserve' ? container.preserve : container.food;
  const store = careStorage(careKind as StorageKind);
  const allergen = /peanut/.test(String(source.id)) ? allergens.peanut : careKind === 'nuts' ? allergens.nuts : careKind === 'honey' ? allergens.honey : allergens.none;
  const out: Record<string, any> = { ...rest };
  (['en', 'ur', 'ar'] as const).forEach((lang, i) => {
    out[`storageTips_${lang}`] = store[i];
    out[`packagingDetails_${lang}`] = `${box[lang]}. ${(liquid ? volumes : portions)[lang]}: ${labels}.`;
    out[`allergenWarning_${lang}`] = `${allergen[lang]} ${careFacility[i]}`;
  });
  return out;
}


