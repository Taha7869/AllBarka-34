import type { LanguageCode } from './LanguageContext';
const entries = [
  ['tracking.title', 'Your order, in motion', 'آپ کے آرڈر کی پیش رفت', 'تقدم طلبك'],
  ['tracking.ORDER_RECEIVED', 'ORDER_RECEIVED', 'آرڈر موصول ہو گیا', 'تم استلام الطلب'],
  ['tracking.CONFIRMED', 'CONFIRMED', 'تصدیق شدہ', 'مؤكد'],
  ['tracking.PREPARING', 'PREPARING', 'تیاری جاری ہے', 'قيد التجهيز'],
  ['tracking.DISPATCHED', 'DISPATCHED', 'روانہ ہو گیا', 'تم الإرسال'],
  ['tracking.OUT_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'ڈیلیوری کے لیے نکل گیا', 'في الطريق للتسليم'],
  ['tracking.DELIVERED', 'DELIVERED', 'پہنچ گیا', 'تم التسليم'],
  ['tracking.cancelled', 'This order was cancelled.', 'یہ آرڈر منسوخ ہو گیا ہے۔', 'تم إلغاء هذا الطلب.'],
  ['tracking.number', 'Tracking number', 'ٹریکنگ نمبر', 'رقم التتبع'],
  ['tracking.eta', 'Estimated delivery', 'متوقع ڈیلیوری', 'التسليم المتوقع'],
  ['tracking.earned', 'Points earned on this order', 'اس آرڈر پر حاصل کردہ پوائنٹس', 'النقاط المكتسبة لهذا الطلب'],
  ['tracking.balance', 'Your points balance', 'آپ کے پوائنٹس کا بیلنس', 'رصيد نقاطك'],
  ['tracking.guest', 'Sign in and link this order to use your earned points.', 'حاصل کردہ پوائنٹس استعمال کرنے کے لیے سائن اِن کر کے یہ آرڈر اپنے اکاؤنٹ سے جوڑیں۔', 'سجّل الدخول واربط هذا الطلب بحسابك لاستخدام نقاطك المكتسبة.'],
  ['tracking.live', 'Updates automatically every 30 seconds.', 'ہر ۳۰ سیکنڈ بعد خودکار اپ ڈیٹ۔', 'يُحدّث تلقائياً كل ٣٠ ثانية.'],
  ['tracking.unavailable', 'Live updates are temporarily unavailable. Your saved receipt is preserved.', 'لائیو اپ ڈیٹ فی الحال دستیاب نہیں۔ آپ کی محفوظ رسید موجود ہے۔', 'التحديثات المباشرة غير متاحة مؤقتاً. إيصالك المحفوظ ما زال متاحاً.'],
  ['tracking.refresh', 'Refresh status', 'حیثیت اپ ڈیٹ کریں', 'تحديث الحالة'],
  ['tracking.checking', 'Checking your latest status…', 'تازہ ترین حیثیت دیکھی جا رہی ہے…', 'جارٍ التحقق من أحدث حالة…'],
] as const;
export const trackingTranslations = Object.fromEntries((['en', 'ur', 'ar'] as LanguageCode[]).map((lang, i) =>
  [lang, Object.fromEntries(entries.map(entry => [entry[0], entry[i + 1]]))])) as Record<LanguageCode, Record<string, string>>;
