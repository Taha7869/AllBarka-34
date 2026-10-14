const copy = [
  ['commerce.inventory.edit', 'Manage stock', 'اسٹاک منظم کریں', 'إدارة المخزون'],
  ['commerce.inventory.title', 'Inventory', 'اسٹاک', 'المخزون'],
  ['commerce.inventory.note', 'Unlimited stock stays at 9999. Enable tracking only when you want checkout to reserve real quantities.', 'لامحدود اسٹاک 9999 رہے گا۔ صرف حقیقی مقدار محفوظ کرنے کے لیے ٹریکنگ جاری کریں۔', 'يبقى المخزون غير المحدود عند 9999. فعّل التتبع عندما تريد حجز الكميات الفعلية عند إتمام الطلب.'],
  ['commerce.inventory.mode', 'Stock mode', 'اسٹاک کا طریقہ', 'نمط المخزون'],
  ['commerce.inventory.unlimited', 'Unlimited (9999)', 'لامحدود (9999)', 'غير محدود (9999)'],
  ['commerce.inventory.tracked', 'Track available quantities', 'دستیاب مقدار کی ٹریکنگ', 'تتبع الكميات المتاحة'],
  ['commerce.inventory.available', 'Available to sell; exclude reserved orders', 'فروخت کے لیے دستیاب مقدار؛ محفوظ آرڈرز نکال کر', 'المتاح للبيع؛ باستثناء الطلبات المحجوزة'],
  ['commerce.inventory.g', 'Grams (g)', 'گرام (g)', 'غرام (g)'],
  ['commerce.inventory.ml', 'Millilitres (ml)', 'ملی لیٹر (ml)', 'مليلتر (ml)'],
  ['commerce.inventory.pack', 'Individual packs or boxes', 'انفرادی پیک یا ڈبے', 'عبوات أو صناديق منفردة'],
  ['commerce.inventory.reason', 'Reason for stock adjustment', 'اسٹاک کی تبدیلی کی وجہ', 'سبب تعديل المخزون'],
  ['commerce.inventory.save', 'Save stock', 'اسٹاک محفوظ کریں', 'حفظ المخزون'],
  ['commerce.inventory.saved', 'Stock saved. Quotes and checkout verify the available quantity.', 'اسٹاک محفوظ ہو گیا۔ قیمت کی تصدیق اور چیک آؤٹ دستیاب مقدار چیک کریں گے۔', 'تم حفظ المخزون. تتحقق عروض الأسعار وإتمام الطلب من الكمية المتاحة.'],
  ['commerce.inventory.conflict', 'Stock changed after you opened this editor. Reload before saving again.', 'ایڈیٹر کھولنے کے بعد اسٹاک بدل گیا ہے۔ دوبارہ محفوظ کرنے سے پہلے لوڈ کریں۔', 'تغيّر المخزون بعد فتح المحرر. أعد التحميل قبل الحفظ مجدداً.'],
  ['commerce.inventory.invalid', 'Use a whole quantity from 0 to 1,000,000,000 and a reason of 3–300 characters.', '0 سے 1,000,000,000 تک مکمل مقدار اور 3–300 حروف میں وجہ لکھیں۔', 'أدخل كمية صحيحة من 0 إلى 1,000,000,000 وسبباً من 3–300 حرفاً.'],
  ['commerce.inventory.insufficient', 'A selection no longer has enough stock. Reduce the quantity or change the selection; your bag and reward are kept.', 'کسی انتخاب کا کافی اسٹاک نہیں رہا۔ مقدار کم کریں یا دوسرا انتخاب کریں؛ آپ کا بیگ اور انعام محفوظ ہیں۔', 'لم يعد المخزون كافياً لأحد الاختيارات. قلّل الكمية أو غيّر الاختيار؛ سلتك ومكافأتك محفوظتان.'],
  ['commerce.inventory.unavailable', 'Inventory could not be verified. Please retry before placing the order.', 'اسٹاک کی تصدیق نہیں ہو سکی۔ آرڈر دینے سے پہلے دوبارہ کوشش کریں۔', 'تعذر التحقق من المخزون. أعد المحاولة قبل إرسال الطلب.'],
  ['commerce.rewards.title', 'Patron rewards', 'پیٹرن کے انعامات', 'مكافآت العملاء'],
  ['commerce.rewards.note', 'Exchange points for a voucher, then choose it at checkout. Eligibility and expiry are checked before it is used.', 'پوائنٹس کے بدلے واؤچر حاصل کریں، پھر چیک آؤٹ پر منتخب کریں۔ استعمال سے پہلے اہلیت اور میعاد چیک ہوں گی۔', 'استبدل النقاط بقسيمة ثم اخترها عند إتمام الطلب. تُفحص الشروط والصلاحية قبل استخدامها.'],
  ['commerce.rewards.points', 'Available points', 'دستیاب پوائنٹس', 'النقاط المتاحة'],
  ['commerce.rewards.pending', 'Pending points', 'زیرِ التوا پوائنٹس', 'النقاط المعلقة'],
  ['commerce.rewards.options', 'Exchange options', 'پوائنٹس کے بدلے انعامات', 'خيارات الاستبدال'],
  ['commerce.rewards.active', 'Active vouchers', 'فعال واؤچرز', 'القسائم النشطة'],
  ['commerce.rewards.redeem', 'Exchange points', 'پوائنٹس تبدیل کریں', 'استبدال النقاط'],
  ['commerce.rewards.busy', 'Exchanging…', 'پوائنٹس تبدیل ہو رہے ہیں…', 'جارٍ الاستبدال…'],
  ['commerce.rewards.ready', 'Voucher ready. Select it at checkout.', 'واؤچر تیار ہے۔ چیک آؤٹ پر منتخب کریں۔', 'القسيمة جاهزة. اخترها عند إتمام الطلب.'],
  ['commerce.rewards.choose', 'Use a patron voucher', 'پیٹرن واؤچر استعمال کریں', 'استخدام قسيمة عميل'],
  ['commerce.rewards.none', 'Keep vouchers for later', 'واؤچرز بعد کے لیے رکھیں', 'الاحتفاظ بالقسائم لوقت لاحق'],
  ['commerce.rewards.expiry', 'Valid until {date}', '{date} تک مؤثر', 'صالح حتى {date}'],
  ['commerce.rewards.minimum', 'Minimum discounted merchandise: Rs. {amount}', 'رعایت کے بعد اشیا کی کم از کم رقم: Rs. {amount}', 'الحد الأدنى للمنتجات بعد الخصم: Rs. {amount}'],
  ['commerce.rewards.free_shipping', 'Lahore standard delivery', 'لاہور کی عام ترسیل', 'التوصيل العادي في لاهور'],
  ['commerce.rewards.cashew_sample', 'Free 50g cashew sample', 'مفت 50 گرام کاجو کا نمونہ', 'عينة كاجو مجانية 50 غراماً'],
  ['commerce.rewards.pista_sample', 'Free 50g pista sample', 'مفت 50 گرام پستے کا نمونہ', 'عينة فستق مجانية 50 غراماً'],
  ['commerce.rewards.gift_packaging', 'Premium gift packaging', 'اعلیٰ معیار کی تحفہ پیکنگ', 'تغليف هدايا فاخر'],
  ['commerce.rewards.desc.free_shipping', 'Waives a payable Lahore standard delivery fee on an eligible order. Express and national delivery are excluded.', 'اہل آرڈر پر لاہور کی قابلِ ادائیگی عام ترسیل کی فیس معاف ہوتی ہے۔ ایکسپریس اور دوسرے شہروں کی ترسیل شامل نہیں۔', 'تعفي من رسوم التوصيل العادي المستحقة في لاهور لطلب مؤهل. لا تشمل التوصيل السريع أو خارج لاهور.'],
  ['commerce.rewards.desc.cashew_sample', 'One free 50g cashew sample is included in packing. Its weight counts toward national delivery.', 'پیکنگ میں ایک مفت 50 گرام کاجو کا نمونہ شامل ہوگا۔ دوسرے شہروں کی ترسیل میں اس کا وزن شامل ہے۔', 'تُضاف عينة كاجو مجانية 50 غراماً للتعبئة. يحتسب وزنها ضمن التوصيل خارج لاهور.'],
  ['commerce.rewards.desc.pista_sample', 'One free 50g pista sample is included in packing. Its weight counts toward national delivery.', 'پیکنگ میں ایک مفت 50 گرام پستے کا نمونہ شامل ہوگا۔ دوسرے شہروں کی ترسیل میں اس کا وزن شامل ہے۔', 'تُضاف عينة فستق مجانية 50 غراماً للتعبئة. يحتسب وزنها ضمن التوصيل خارج لاهور.'],
  ['commerce.rewards.desc.gift_packaging', 'Includes premium gift packaging and waives the gift-wrap fee. The packing team receives the instruction.', 'اعلیٰ تحفہ پیکنگ شامل ہوگی اور گفٹ ریپ فیس معاف ہوگی۔ پیکنگ ٹیم کو ہدایت ملے گی۔', 'يشمل تغليف هدايا فاخراً وإعفاء من رسم التغليف. يتلقى فريق التعبئة التعليمات.'],
  ['commerce.rewards.fulfillment', 'Included patron benefit', 'شامل پیٹرن انعام', 'مكافأة العميل المشمولة'],
  ['commerce.rewards.insufficient', 'You do not have enough points for this voucher.', 'اس واؤچر کے لیے کافی پوائنٹس نہیں ہیں۔', 'ليس لديك نقاط كافية لهذه القسيمة.'],
  ['commerce.rewards.expired', 'This voucher has expired. Keep it unselected and choose another voucher.', 'اس واؤچر کی میعاد ختم ہو چکی ہے۔ اسے منتخب نہ کریں اور دوسرا واؤچر چنیں۔', 'انتهت صلاحية هذه القسيمة. ألغِ اختيارها واختر قسيمة أخرى.'],
  ['commerce.rewards.standardOnly', 'Select Lahore standard delivery for this voucher.', 'اس واؤچر کے لیے لاہور کی عام ترسیل منتخب کریں۔', 'اختر التوصيل العادي في لاهور لهذه القسيمة.'],
  ['commerce.rewards.minimumError', 'This order does not meet the voucher’s discounted merchandise minimum.', 'آرڈر کی اشیا کی رعایتی رقم واؤچر کی کم از کم شرط پوری نہیں کرتی۔', 'لا يحقق مبلغ المنتجات بعد الخصم الحد الأدنى للقسيمة.'],
  ['commerce.rewards.noBenefit', 'This benefit is already included. Keep this voucher for another order.', 'یہ سہولت پہلے ہی شامل ہے۔ یہ واؤچر دوسرے آرڈر کے لیے رکھیں۔', 'هذه الميزة مشمولة بالفعل. احتفظ بهذه القسيمة لطلب آخر.'],
  ['commerce.rewards.sampleUnavailable', 'This sample is currently unavailable. Your voucher remains unused.', 'یہ نمونہ فی الحال دستیاب نہیں۔ آپ کا واؤچر استعمال نہیں ہوا۔', 'هذه العينة غير متوفرة حالياً. تبقى قسيمتك غير مستخدمة.'],
  ['commerce.rewards.failed', 'The reward request could not be verified. Retry with the same account; points are not charged twice.', 'انعام کی درخواست کی تصدیق نہیں ہو سکی۔ اسی اکاؤنٹ سے دوبارہ کوشش کریں؛ پوائنٹس دو بار نہیں کٹیں گے۔', 'تعذر التحقق من طلب المكافأة. أعد المحاولة بالحساب نفسه؛ لا تُخصم النقاط مرتين.'],
  ['commerce.rewards.used', 'This voucher has already been used. Choose another or keep vouchers for later.', 'یہ واؤچر استعمال ہو چکا ہے۔ دوسرا منتخب کریں یا واؤچرز بعد کے لیے رکھیں۔', 'استُخدمت هذه القسيمة بالفعل. اختر أخرى أو احتفظ بالقسائم لوقت لاحق.'],
] as const;
export const commerceTranslations: Record<'en' | 'ur' | 'ar', Record<string, string>> = {
  en: Object.fromEntries(copy.map(([key, en]) => [key, en])), ur: Object.fromEntries(copy.map(([key, , ur]) => [key, ur])), ar: Object.fromEntries(copy.map(([key, , , ar]) => [key, ar])),
};
export function commerceErrorKey(code: string | undefined): string | null {
  if (code === 'INSUFFICIENT_STOCK') return 'commerce.inventory.insufficient';
  if (code?.includes('INVENTORY')) return 'commerce.inventory.unavailable';
  if (code === 'INSUFFICIENT_POINTS') return 'commerce.rewards.insufficient';
  if (code === 'REWARD_EXPIRED') return 'commerce.rewards.expired';
  if (['REWARD_STANDARD_ONLY', 'SHIPPING_REWARD_LAHORE_ONLY'].includes(code || '')) return 'commerce.rewards.standardOnly';
  if (code === 'REWARD_MINIMUM_NOT_MET') return 'commerce.rewards.minimumError';
  if (code === 'REWARD_NO_ADDITIONAL_BENEFIT') return 'commerce.rewards.noBenefit';
  if (code === 'REWARD_SAMPLE_UNAVAILABLE') return 'commerce.rewards.sampleUnavailable';
  if (code === 'REWARD_ALREADY_USED') return 'commerce.rewards.used';
  return code?.includes('REWARD') || code?.includes('LOYALTY') ? 'commerce.rewards.failed' : null;
}
