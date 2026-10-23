import type { LanguageCode } from './LanguageContext';
const entries = [
  [
    "add",
    "Add item",
    "آئٹم شامل کریں",
    "إضافة منتج"
  ],
  [
    "edit",
    "Edit item",
    "آئٹم میں ترمیم",
    "تعديل المنتج"
  ],
  [
    "intro",
    "Product details, options and publishing",
    "تفصیل، اختیارات اور اشاعت",
    "تفاصيل المنتج وخياراته ونشره"
  ],
  [
    "required",
    "Lazmi / Required",
    "لازمی",
    "مطلوب"
  ],
  [
    "optional",
    "Optional",
    "اختیاری",
    "اختياري"
  ],
  [
    "publishRequired",
    "Required to publish",
    "شائع کرنے کے لیے لازمی",
    "مطلوب للنشر"
  ],
  [
    "identity",
    "Identity & translations",
    "شناخت اور تراجم",
    "الهوية والترجمات"
  ],
  [
    "name",
    "Name",
    "نام",
    "الاسم"
  ],
  [
    "description",
    "Description",
    "تفصیل",
    "الوصف"
  ],
  [
    "origin",
    "Origin",
    "اصل مقام",
    "المنشأ"
  ],
  [
    "id",
    "Product ID",
    "آئٹم آئی ڈی",
    "معرّف المنتج"
  ],
  [
    "category",
    "Category",
    "کیٹیگری",
    "الفئة"
  ],
  [
    "template",
    "Reusable template",
    "دوبارہ استعمال کا سانچہ",
    "قالب قابل لإعادة الاستخدام"
  ],
  [
    "none",
    "None",
    "کوئی نہیں",
    "بدون"
  ],
  [
    "apply",
    "Apply template defaults",
    "سانچے کی ترتیب لگائیں",
    "تطبيق إعدادات القالب"
  ],
  [
    "templateHint",
    "Applying a template keeps your text and prices. Review category, options and attributes before saving.",
    "سانچہ لگانے سے متن اور نرخ برقرار رہتے ہیں۔ محفوظ کرنے سے پہلے اختیارات دیکھیں۔",
    "يحافظ تطبيق القالب على النص والأسعار. راجع الخيارات قبل الحفظ."
  ],
  [
    "options",
    "Quantity & prices",
    "مقدار اور نرخ",
    "الكمية والأسعار"
  ],
  [
    "kind",
    "Product type",
    "آئٹم کی قسم",
    "نوع المنتج"
  ],
  [
    "food",
    "Food",
    "خوراک",
    "غذاء"
  ],
  [
    "liquid",
    "Liquid / oil",
    "مائع / تیل",
    "سائل / زيت"
  ],
  [
    "packaging",
    "Packaging",
    "پیکنگ",
    "تغليف"
  ],
  [
    "gift",
    "Gift / hamper",
    "تحفہ / ہیمپر",
    "هدية / سلة"
  ],
  [
    "pricingMode",
    "Pricing method",
    "نرخ کا طریقہ",
    "طريقة التسعير"
  ],
  [
    "manual",
    "Manual prices",
    "دستی نرخ",
    "أسعار يدوية"
  ],
  [
    "calculated",
    "Calculated from base rate",
    "بنیادی نرخ سے حساب",
    "محسوب من السعر الأساسي"
  ],
  [
    "quantityMode",
    "Quantity choice",
    "مقدار کا انتخاب",
    "اختيار الكمية"
  ],
  [
    "fixed",
    "Fixed options",
    "مقرر اختیارات",
    "خيارات ثابتة"
  ],
  [
    "custom",
    "Custom quantity",
    "اپنی مقدار",
    "كمية مخصصة"
  ],
  [
    "both",
    "Both",
    "دونوں",
    "كلاهما"
  ],
  [
    "baseQuantity",
    "Base quantity",
    "بنیادی مقدار",
    "الكمية الأساسية"
  ],
  [
    "baseUnit",
    "Base unit",
    "بنیادی اکائی",
    "الوحدة الأساسية"
  ],
  [
    "basePrice",
    "Base rate (PKR)",
    "بنیادی نرخ (روپے)",
    "السعر الأساسي (PKR)"
  ],
  [
    "label",
    "Option label",
    "اختیار کا نام",
    "اسم الخيار"
  ],
  [
    "quantity",
    "Quantity",
    "مقدار",
    "الكمية"
  ],
  [
    "unit",
    "Unit",
    "اکائی",
    "الوحدة"
  ],
  [
    "price",
    "Price (PKR)",
    "نرخ (روپے)",
    "السعر (PKR)"
  ],
  [
    "override",
    "Override calculated price",
    "حساب شدہ نرخ بدلیں",
    "تجاوز السعر المحسوب"
  ],
  [
    "available",
    "Available",
    "دستیاب",
    "متاح"
  ],
  [
    "shippingWeightG",
    "Packed shipping weight (g)",
    "پیک شدہ ترسیلی وزن (گرام)",
    "وزن الشحن المغلف (غ)"
  ],
  [
    "piecesPerPack",
    "Physical pieces per option",
    "ہر اختیار میں اصل عدد",
    "عدد القطع الفعلي لكل خيار"
  ],
  [
    "moqOverride",
    "MOQ override (pieces)",
    "کم از کم تعداد (اپنی حد)",
    "تجاوز الحد الأدنى (قطع)"
  ],
  [
    "addOption",
    "Add option",
    "اختیار شامل کریں",
    "إضافة خيار"
  ],
  [
    "remove",
    "Remove",
    "ہٹائیں",
    "إزالة"
  ],
  [
    "min",
    "Minimum",
    "کم از کم",
    "الحد الأدنى"
  ],
  [
    "max",
    "Maximum",
    "زیادہ سے زیادہ",
    "الحد الأقصى"
  ],
  [
    "step",
    "Increment",
    "اضافے کا وقفہ",
    "الزيادة"
  ],
  [
    "shippingBasis",
    "Shipping grams per selected unit",
    "ہر منتخب اکائی کا ترسیلی وزن",
    "غرامات الشحن لكل وحدة مختارة"
  ],
  [
    "customHint",
    "Use the selected unit. Choose a value from the minimum in the stated increments.",
    "منتخب اکائی میں کم از کم مقدار سے مقرر وقفے کے مطابق درج کریں۔",
    "استخدم الوحدة المختارة بدءًا من الحد الأدنى وبالزيادة المحددة."
  ],
  [
    "invalidQuantity",
    "Choose a quantity within the shown limits and increment.",
    "دی گئی حدود اور وقفے کے مطابق مقدار منتخب کریں۔",
    "اختر كمية ضمن الحدود والزيادة المحددة."
  ],
  [
    "media",
    "Photos & gallery",
    "تصاویر اور گیلری",
    "الصور والمعرض"
  ],
  [
    "image",
    "Cover image URL",
    "مرکزی تصویر کا لنک",
    "رابط الصورة الرئيسية"
  ],
  [
    "galleryImages",
    "Gallery URLs (one per line)",
    "گیلری لنکس (ہر سطر پر ایک)",
    "روابط المعرض (واحد لكل سطر)"
  ],
  [
    "upload",
    "Upload photo (JPEG, PNG, WebP; max 5 MB)",
    "تصویر اپ لوڈ (زیادہ سے زیادہ ۵ ایم بی)",
    "رفع صورة (JPEG، PNG، WebP؛ حتى 5 MB)"
  ],
  [
    "seo",
    "Search & social preview",
    "سرچ اور سوشل پیش منظر",
    "معاينة البحث والمشاركة"
  ],
  [
    "seoTitle",
    "SEO title",
    "سرچ کا عنوان",
    "عنوان البحث"
  ],
  [
    "seoDescription",
    "SEO description",
    "سرچ کی تفصیل",
    "وصف البحث"
  ],
  [
    "imageAlt",
    "Photo description (alt text)",
    "تصویر کی تفصیل",
    "وصف الصورة البديل"
  ],
  [
    "socialImage",
    "Social image URL",
    "سوشل تصویر کا لنک",
    "رابط صورة المشاركة"
  ],
  [
    "keywords",
    "Keywords (comma separated)",
    "کلیدی الفاظ (کاما سے الگ)",
    "الكلمات المفتاحية (مفصولة بفواصل)"
  ],
  [
    "logistics",
    "Ordering & details",
    "آرڈر اور تفصیلات",
    "الطلب والتفاصيل"
  ],
  [
    "orderMode",
    "Ordering mode",
    "آرڈر کا طریقہ",
    "طريقة الطلب"
  ],
  [
    "standard",
    "Direct checkout",
    "براہ راست خریداری",
    "شراء مباشر"
  ],
  [
    "inquiry_quote",
    "Inquiry / quote only",
    "صرف معلومات / کوٹیشن",
    "استفسار / عرض فقط"
  ],
  [
    "preparationDays",
    "Preparation days",
    "تیاری کے دن",
    "أيام التجهيز"
  ],
  [
    "collections",
    "Collections (IDs, comma separated)",
    "مجموعے (آئی ڈیز، کاما سے الگ)",
    "المجموعات (معرفات بفواصل)"
  ],
  [
    "occasions",
    "Occasions (IDs, comma separated)",
    "مواقع (آئی ڈیز، کاما سے الگ)",
    "المناسبات (معرفات بفواصل)"
  ],
  [
    "productFamily",
    "Product family",
    "آئٹم کا خاندان",
    "عائلة المنتج"
  ],
  [
    "packagingSubcategory",
    "Packaging subcategory",
    "پیکنگ کی ذیلی قسم",
    "فئة التغليف الفرعية"
  ],
  [
    "inclusions",
    "Included (one per line)",
    "شامل اشیا (ہر سطر پر ایک)",
    "المشمول (واحد لكل سطر)"
  ],
  [
    "exclusions",
    "Excluded (one per line)",
    "غیر شامل (ہر سطر پر ایک)",
    "غير المشمول (واحد لكل سطر)"
  ],
  [
    "wholesale",
    "Wholesale rate (PKR)",
    "تھوک نرخ (روپے)",
    "سعر الجملة (PKR)"
  ],
  [
    "displayOrder",
    "Display order",
    "دکھانے کی ترتیب",
    "ترتيب العرض"
  ],
  [
    "private",
    "Private sourcing notes",
    "نجی سپلائر معلومات",
    "معلومات التوريد الخاصة"
  ],
  [
    "supplierName",
    "Supplier name",
    "سپلائر کا نام",
    "اسم المورد"
  ],
  [
    "supplierCost",
    "Supplier cost (PKR)",
    "سپلائر لاگت (روپے)",
    "تكلفة المورد (PKR)"
  ],
  [
    "referencePrice",
    "Reference price (PKR)",
    "حوالہ نرخ (روپے)",
    "السعر المرجعي (PKR)"
  ],
  [
    "supplierItemUrl",
    "Supplier item URL",
    "سپلائر آئٹم لنک",
    "رابط منتج المورد"
  ],
  [
    "targetMarginPercent",
    "Target margin (%)",
    "مطلوب مارجن (%)",
    "الهامش المستهدف (%)"
  ],
  [
    "internalNotes",
    "Internal notes",
    "اندرونی نوٹس",
    "ملاحظات داخلية"
  ],
  [
    "review",
    "Preview & readiness",
    "پیش منظر اور تیاری",
    "المعاينة والجاهزية"
  ],
  [
    "draft",
    "Save draft",
    "ڈرافٹ محفوظ کریں",
    "حفظ مسودة"
  ],
  [
    "save",
    "Save changes",
    "تبدیلیاں محفوظ کریں",
    "حفظ التغييرات"
  ],
  [
    "publish",
    "Publish item",
    "آئٹم شائع کریں",
    "نشر المنتج"
  ],
  [
    "close",
    "Close",
    "بند کریں",
    "إغلاق"
  ],
  [
    "loading",
    "Loading…",
    "لوڈ ہو رہا ہے…",
    "جار التحميل…"
  ],
  [
    "saved",
    "Saved successfully.",
    "محفوظ ہو گیا۔",
    "تم الحفظ بنجاح."
  ],
  [
    "failed",
    "Could not save. Your input is retained.",
    "محفوظ نہیں ہو سکا۔ آپ کی معلومات برقرار ہیں۔",
    "تعذر الحفظ. تم الاحتفاظ بمدخلاتك."
  ],
  [
    "conflict",
    "This record changed. Keep your input and reopen a fresh record before saving.",
    "ریکارڈ بدل گیا ہے۔ معلومات محفوظ رکھ کر نیا ریکارڈ کھولیں۔",
    "تغير السجل. احتفظ بمدخلاتك وافتح السجل المحدث قبل الحفظ."
  ],
  [
    "fallback",
    "Empty translations display English.",
    "خالی ترجمے کی جگہ انگریزی دکھائی جائے گی۔",
    "تُعرض الإنجليزية عند غياب الترجمة."
  ],
  [
    "legacy",
    "Legacy pricing stays unchanged. Use the existing price editor; applying a template explicitly enables the new options.",
    "پرانے نرخ برقرار ہیں۔ نیا سانچہ لگانے سے نئے اختیارات فعال ہوں گے۔",
    "تبقى الأسعار الحالية. يفعّل تطبيق القالب الخيارات الجديدة."
  ],
  [
    "ready",
    "Ready to publish",
    "اشاعت کے لیے تیار",
    "جاهز للنشر"
  ],
  [
    "discard",
    "Discard unsaved changes?",
    "غیر محفوظ تبدیلیاں چھوڑ دیں؟",
    "تجاهل التغييرات غير المحفوظة؟"
  ],
  [
    "attributes",
    "Product attributes",
    "آئٹم کی خصوصیات",
    "خصائص المنتج"
  ],
  [
    "configuration",
    "Categories & templates",
    "کیٹیگریز اور سانچے",
    "الفئات والقوالب"
  ],
  [
    "addTaxonomy",
    "Add taxonomy entry",
    "نئی درجہ بندی شامل کریں",
    "إضافة تصنيف"
  ],
  [
    "addTemplate",
    "Add template",
    "سانچہ شامل کریں",
    "إضافة قالب"
  ],
  [
    "visible",
    "Visible",
    "نمایاں",
    "ظاهر"
  ],
  [
    "archived",
    "Archived",
    "آرکائیو",
    "مؤرشف"
  ],
  [
    "type",
    "Type",
    "قسم",
    "النوع"
  ],
  [
    "categoryType",
    "Category",
    "کیٹیگری",
    "فئة"
  ],
  [
    "collection",
    "Collection",
    "مجموعہ",
    "مجموعة"
  ],
  [
    "occasion",
    "Occasion",
    "موقع",
    "مناسبة"
  ],
  [
    "definitions",
    "Attribute definitions (JSON)",
    "خصوصیات کی تعریف (JSON)",
    "تعريفات الخصائص (JSON)"
  ],
  [
    "personalization",
    "Personalization",
    "ذاتی ترتیب",
    "التخصيص"
  ],
  [
    "supported",
    "Personalization available",
    "ذاتی ترتیب دستیاب",
    "التخصيص متاح"
  ],
  [
    "allowMonogram",
    "Monogram",
    "نام کے حروف",
    "الأحرف الأولى"
  ],
  [
    "allowCardMessage",
    "Card message",
    "کارڈ کا پیغام",
    "رسالة البطاقة"
  ],
  [
    "allowRibbonColor",
    "Ribbon colour",
    "ربن کا رنگ",
    "لون الشريط"
  ],
  [
    "notes",
    "Notes",
    "نوٹس",
    "ملاحظات"
  ],
  [
    "empty",
    "No items in this section yet.",
    "اس حصے میں ابھی آئٹم نہیں۔",
    "لا توجد منتجات في هذا القسم بعد."
  ],
  [
    "allCategories",
    "Explore categories",
    "کیٹیگریز دیکھیں",
    "استكشف الفئات"
  ],
  [
    "text",
    "Text",
    "متن",
    "نص"
  ],
  [
    "number",
    "Number",
    "عدد",
    "رقم"
  ],
  [
    "select",
    "Selection",
    "انتخاب",
    "اختيار"
  ]
,
["reason.PUBLISH_CONTENT_REQUIRED", "Add the English name, description and category.", "انگریزی نام، تفصیل اور کیٹیگری درج کریں۔", "أضف الاسم والوصف بالإنجليزية والفئة."],
["reason.PUBLISH_IMAGE_REQUIRED", "Add a cover photo before publishing.", "اشاعت سے پہلے مرکزی تصویر شامل کریں۔", "أضف صورة رئيسية قبل النشر."],
["reason.PRODUCT_REQUIRES_PRICING", "Add at least one available option with an approved price.", "منظور شدہ نرخ کے ساتھ ایک دستیاب اختیار شامل کریں۔", "أضف خيارًا متاحًا بسعر معتمد."],
["reason.OPTION_PRICE_REQUIRED", "Enter the missing option price.", "اختیار کا نرخ درج کریں۔", "أدخل سعر الخيار الناقص."],
["reason.BASE_RATE_REQUIRED", "Enter a positive base quantity and rate.", "مثبت بنیادی مقدار اور نرخ درج کریں۔", "أدخل كمية وسعرًا أساسيين موجبين."],
["reason.PUBLISH_PREPARATION_REQUIRED", "Packaging needs at least 10 preparation days.", "پیکنگ کے لیے کم از کم ۱۰ دن کی تیاری درج کریں۔", "يتطلب التغليف 10 أيام تجهيز على الأقل."],
["reason.PUBLISH_SHIPPING_REQUIRED", "Add the approved packed shipping weight.", "منظور شدہ پیک شدہ ترسیلی وزن درج کریں۔", "أضف وزن الشحن المغلف المعتمد."],
["reason.INCOMPATIBLE_MEASUREMENT", "Use compatible units for calculated prices.", "حساب شدہ نرخ کے لیے یکساں قسم کی اکائیاں منتخب کریں۔", "استخدم وحدات متوافقة لحساب الأسعار."],
["reason.PUBLISH_PRICE_REQUIRED", "Add at least one priced, available option.", "کم از کم ایک دستیاب اختیار کا نرخ درج کریں۔", "أضف خيارًا متاحًا بسعر."],
["reason.PUBLISH_ATTRIBUTE_REQUIRED", "Complete the required product attributes.", "آئٹم کی لازمی خصوصیات مکمل کریں۔", "أكمل خصائص المنتج المطلوبة."],
["reason.PUBLISH_PIECES_PER_PACK_REQUIRED", "Enter the actual number of pieces in each pack option.", "ہر پیک میں اصل تعداد درج کریں۔", "أدخل عدد القطع الفعلي في كل خيار حزمة."],
["reason.PRODUCT_ALREADY_EXISTS", "This product ID already exists. Choose another ID.", "یہ آئی ڈی پہلے موجود ہے۔ دوسری آئی ڈی منتخب کریں۔", "هذا المعرف موجود بالفعل. اختر معرفًا آخر."],
["reason.OPTION_LABEL_REQUIRED", "Give each priced option its own label.", "ہر نرخ والے اختیار کا نام درج کریں۔", "أدخل اسمًا لكل خيار مسعّر."],
["packaging.tin", "Tin boxes", "ٹن باکس", "علب معدنية"],
["packaging.tabarruk", "Hajj & Umrah sets", "حج اور عمرہ سیٹ", "أطقم الحج والعمرة"],
["packaging.wedding", "Wedding favours", "شادی کے تحفے", "هدايا الزفاف"],
["packaging.baby", "Baby announcements", "بچے کی آمد", "إعلان المولود"],
["packaging.acrylic", "Acrylic boxes", "ایکریلک باکس", "علب أكريليك"]
,
["makeCover","Use as cover","مرکزی تصویر بنائیں","استخدام كصورة رئيسية"]
] as const;
export const adminExpansionTranslations: Record<LanguageCode, Record<string,string>> = {
 en: Object.fromEntries(entries.map(([key,en])=>['item.'+key,en])),
 ur: Object.fromEntries(entries.map(([key,,ur])=>['item.'+key,ur])),
 ar: Object.fromEntries(entries.map(([key,,,ar])=>['item.'+key,ar])),
};
