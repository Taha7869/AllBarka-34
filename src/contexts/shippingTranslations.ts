import type { LanguageCode } from './LanguageContext';

const entries: readonly (readonly [string, string, string, string])[] = [
  ['shipping.destination', 'Delivery city', 'ترسیل کا شہر', 'مدينة التوصيل'],
  ['shipping.actualCity', 'Enter your city', 'اپنا شہر درج کریں', 'أدخل مدينتك'],
  ['shipping.enterCity', 'Enter the actual delivery city to confirm shipping.', 'ترسیل کی تصدیق کے لیے اصل شہر درج کریں۔', 'أدخل مدينة التوصيل الفعلية لتأكيد رسوم الشحن.'],
  ['payment.confirmInstructions', 'Confirm the bank / Raast account with AllBarka concierge before transferring payment.', 'رقم بھیجنے سے پہلے آل برکہ کی ٹیم سے بینک یا راست اکاؤنٹ کی تصدیق کریں۔', 'أكد الحساب البنكي أو حساب Raast مع فريق ألبركة قبل تحويل المبلغ.'],
  ['payment.transferDetails', 'Bank / Raast transfer', 'بینک یا راست سے ادائیگی', 'تحويل بنكي / Raast'],
  ['payment.bankDescription', 'Confirm payment account details with our concierge after placing your order.', 'آرڈر دینے کے بعد ہماری ٹیم سے ادائیگی کے اکاؤنٹ کی تفصیلات کی تصدیق کریں۔', 'أكد بيانات حساب الدفع مع فريقنا بعد تقديم طلبك.'],
  ['payment.shareReceipt', 'After payment, share the receipt with our concierge on WhatsApp for verification.', 'ادائیگی کے بعد تصدیق کے لیے رسید ہماری ٹیم کو واٹس ایپ پر بھیجیں۔', 'بعد الدفع، أرسل الإيصال إلى فريقنا عبر واتساب للتحقق.'],
  ['shipping.lahore', 'Lahore', 'لاہور', 'لاهور'],
  ['shipping.outside', 'Outside Lahore', 'لاہور سے باہر', 'خارج لاهور'],
  ['shipping.standard', 'Standard delivery', 'معیاری ترسیل', 'التوصيل العادي'],
  ['shipping.express', 'Priority dispatch', 'ترجیحی ڈسپیچ', 'إرسال بأولوية'],
  ['shipping.free', 'Free', 'مفت', 'مجاني'],
  ['shipping.lahoreRule', 'Lahore: Rs.150 standard delivery, free from Rs.3,000 after discounts.', 'لاہور: معیاری ترسیل ۱۵۰ روپے؛ رعایت کے بعد ۳۰۰۰ روپے سے مفت۔', 'لاهور: التوصيل العادي 150 روبية، ومجاني من 3,000 روبية بعد الخصومات.'],
  ['shipping.nationwideRule', 'Outside Lahore: Rs.250/kg by actual order weight, minimum Rs.250. Free shipping applies only in Lahore.', 'لاہور سے باہر: اصل آرڈر کے وزن پر ۲۵۰ روپے فی کلو، کم از کم ۲۵۰ روپے۔ مفت ترسیل صرف لاہور میں ہے۔', 'خارج لاهور: 250 روبية لكل كغ حسب وزن الطلب الفعلي، بحد أدنى 250 روبية. الشحن المجاني في لاهور فقط.'],
  ['shipping.estimate', 'Delivery estimate — confirmed at checkout', 'ترسیل کا تخمینہ — چیک آؤٹ پر تصدیق ہوگی', 'تقدير التوصيل — يُؤكد عند إتمام الطلب'],
  ['shipping.pending', 'Confirm delivery at checkout', 'چیک آؤٹ پر ترسیل کی تصدیق کریں', 'أكد التوصيل عند إتمام الطلب'],
  ['shipping.days', 'Courier delivery; timing depends on your city.', 'کورئیر ترسیل؛ وقت آپ کے شہر پر منحصر ہے۔', 'التوصيل بالبريد؛ المدة تعتمد على مدينتك.'],
  ['shipping.priority', 'Priority courier dispatch; delivery timing is confirmed with your address.', 'ترجیحی کورئیر ڈسپیچ؛ وقت کی تصدیق آپ کے پتے کے مطابق ہوگی۔', 'إرسال بأولوية؛ يُؤكد موعد التوصيل حسب عنوانك.'],
  ['freeShippingUnlocked', 'Free standard delivery in Lahore', 'لاہور میں معیاری ترسیل مفت', 'التوصيل العادي مجاني في لاهور'],
  ['freeShippingHint', 'Add Rs.{amount} for free standard delivery in Lahore', 'لاہور میں مفت معیاری ترسیل کے لیے مزید {amount} روپے شامل کریں', 'أضف {amount} روبية للتوصيل العادي المجاني في لاهور'],
  ['boutique.deliveryValue', 'Lahore: free from Rs.3,000', 'لاہور: ۳۰۰۰ روپے سے مفت', 'لاهور: مجاني من 3,000 روبية'],
  ['boutique.eyebrow', 'AllBarka · Premium Dry Fruits', 'آل برکہ · اعلیٰ خشک میوہ جات', 'ألبركة · فواكه مجففة فاخرة'],
  ['home.deliveryCopy', 'Free standard delivery in Lahore from Rs.3,000. Other cities: Rs.250/kg, minimum Rs.250.', 'لاہور میں ۳۰۰۰ روپے سے معیاری ترسیل مفت۔ دیگر شہر: ۲۵۰ روپے فی کلو، کم از کم ۲۵۰ روپے۔', 'التوصيل العادي مجاني في لاهور من 3,000 روبية. المدن الأخرى: 250 روبية لكل كغ، بحد أدنى 250 روبية.'],
];

export const shippingTranslations = Object.fromEntries(
  (['en', 'ur', 'ar'] as const).map((language, index) => [language, Object.fromEntries(entries.map(entry => [entry[0], entry[index + 1]]))]),
) as Record<LanguageCode, Record<string, string>>;
