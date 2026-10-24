import type {LanguageCode} from './LanguageContext';
const entries=[
  [
    "title",
    "Storefront studio",
    "اسٹور فرنٹ اسٹوڈیو",
    "استوديو المتجر"
  ],
  [
    "hint",
    "Shape your storefront, review the draft, then publish it deliberately.",
    "اسٹور فرنٹ ترتیب دیں، ڈرافٹ دیکھیں اور پھر شائع کریں۔",
    "نسّق واجهة المتجر وراجع المسودة ثم انشرها."
  ],
  [
    "hero",
    "Hero & photography",
    "مرکزی حصہ اور تصاویر",
    "القسم الرئيسي والصور"
  ],
  [
    "banner",
    "Announcement banner",
    "اعلانیہ بینر",
    "شريط الإعلان"
  ],
  [
    "sections",
    "Homepage sections",
    "ہوم پیج کے حصے",
    "أقسام الصفحة الرئيسية"
  ],
  [
    "navigation",
    "Navigation",
    "نیویگیشن",
    "التنقل"
  ],
  [
    "faq",
    "Questions & answers",
    "سوال اور جواب",
    "الأسئلة والأجوبة"
  ],
  [
    "journal",
    "Journal articles",
    "جرنل مضامین",
    "مقالات المجلة"
  ],
  [
    "custom",
    "Use custom content",
    "اپنا مواد استعمال کریں",
    "استخدام محتوى مخصص"
  ],
  [
    "visible",
    "Visible",
    "نمایاں",
    "ظاهر"
  ],
  [
    "heading",
    "Heading",
    "عنوان",
    "العنوان"
  ],
  [
    "accent",
    "Gold accent text",
    "سنہری نمایاں متن",
    "نص التمييز الذهبي"
  ],
  [
    "description",
    "Description",
    "تفصیل",
    "الوصف"
  ],
  [
    "primaryLabel",
    "Primary button label",
    "مرکزی بٹن کا نام",
    "نص الزر الرئيسي"
  ],
  [
    "primaryPath",
    "Primary destination",
    "مرکزی منزل",
    "الوجهة الرئيسية"
  ],
  [
    "secondaryLabel",
    "Secondary button label",
    "دوسرے بٹن کا نام",
    "نص الزر الثانوي"
  ],
  [
    "secondaryPath",
    "Secondary destination",
    "دوسری منزل",
    "الوجهة الثانوية"
  ],
  [
    "image",
    "Desktop image URL",
    "ڈیسک ٹاپ تصویر کا لنک",
    "رابط صورة الحاسوب"
  ],
  [
    "mobileImage",
    "Mobile image URL",
    "موبائل تصویر کا لنک",
    "رابط صورة الهاتف"
  ],
  [
    "text",
    "Announcement text",
    "اعلان کا متن",
    "نص الإعلان"
  ],
  [
    "linkLabel",
    "Link label",
    "لنک کا نام",
    "نص الرابط"
  ],
  [
    "path",
    "Destination",
    "منزل",
    "الوجهة"
  ],
  [
    "label",
    "Label",
    "نام",
    "التسمية"
  ],
  [
    "question",
    "Question",
    "سوال",
    "السؤال"
  ],
  [
    "answer",
    "Answer",
    "جواب",
    "الإجابة"
  ],
  [
    "addFaq",
    "Add question",
    "سوال شامل کریں",
    "إضافة سؤال"
  ],
  [
    "addArticle",
    "Add article",
    "مضمون شامل کریں",
    "إضافة مقال"
  ],
  [
    "importArticle",
    "Edit an existing article",
    "موجودہ مضمون میں ترمیم",
    "تعديل مقال موجود"
  ],
  [
    "slug",
    "Article slug",
    "مضمون کی شناخت",
    "معرف المقال"
  ],
  [
    "body",
    "Article text (paragraphs on separate lines)",
    "مضمون کا متن (پیراگراف الگ سطروں پر)",
    "نص المقال (فقرات في أسطر منفصلة)"
  ],
  [
    "excerpt",
    "Summary",
    "خلاصہ",
    "الملخص"
  ],
  [
    "articleImage",
    "Article image URL",
    "مضمون کی تصویر کا لنک",
    "رابط صورة المقال"
  ],
  [
    "category",
    "Category",
    "کیٹیگری",
    "الفئة"
  ],
  [
    "date",
    "Publication date",
    "اشاعت کی تاریخ",
    "تاريخ النشر"
  ],
  [
    "related",
    "Related product IDs",
    "متعلقہ آئٹمز کی آئی ڈیز",
    "معرفات المنتجات ذات الصلة"
  ],
  [
    "up",
    "Move up",
    "اوپر کریں",
    "نقل لأعلى"
  ],
  [
    "down",
    "Move down",
    "نیچے کریں",
    "نقل لأسفل"
  ],
  [
    "remove",
    "Remove",
    "ہٹائیں",
    "إزالة"
  ],
  [
    "saveDraft",
    "Save draft",
    "ڈرافٹ محفوظ کریں",
    "حفظ المسودة"
  ],
  [
    "publish",
    "Publish saved draft",
    "محفوظ ڈرافٹ شائع کریں",
    "نشر المسودة المحفوظة"
  ],
  [
    "preview",
    "Preview draft",
    "ڈرافٹ کا پیش منظر",
    "معاينة المسودة"
  ],
  [
    "saved",
    "Draft saved. Customers still see the published version.",
    "ڈرافٹ محفوظ ہے۔ کسٹمر کو شائع شدہ ورژن دکھائی دے گا۔",
    "حُفظت المسودة. ما زال العملاء يرون النسخة المنشورة."
  ],
  [
    "published",
    "Storefront published.",
    "اسٹور فرنٹ شائع ہو گیا۔",
    "تم نشر واجهة المتجر."
  ],
  [
    "unsaved",
    "Save the draft before publishing.",
    "شائع کرنے سے پہلے ڈرافٹ محفوظ کریں۔",
    "احفظ المسودة قبل نشرها."
  ],
  [
    "draftOnly",
    "Private draft preview",
    "نجی ڈرافٹ پیش منظر",
    "معاينة مسودة خاصة"
  ],
  [
    "liveRevision",
    "Published revision",
    "شائع شدہ ورژن",
    "الإصدار المنشور"
  ],
  [
    "error",
    "The request could not complete. Your edits remain here.",
    "درخواست مکمل نہیں ہوئی۔ تبدیلیاں برقرار ہیں۔",
    "تعذر إكمال الطلب. بقيت تعديلاتك هنا."
  ],
  [
    "error.CONTENT_REVISION_CONFLICT",
    "Content changed elsewhere. Keep your edits and reopen the current draft.",
    "مواد دوسری جگہ بدل گیا ہے۔ تبدیلیاں محفوظ رکھ کر نیا ڈرافٹ کھولیں۔",
    "تغير المحتوى من مكان آخر. احتفظ بتعديلاتك وافتح المسودة الحالية."
  ],
  [
    "error.INVALID_CONTENT_DESTINATION",
    "Choose a valid store page; private routes and external links are not allowed.",
    "درست اسٹور صفحہ منتخب کریں؛ نجی اور بیرونی لنکس کی اجازت نہیں۔",
    "اختر صفحة متجر صالحة؛ الروابط الخاصة والخارجية غير مسموحة."
  ],
  [
    "error.CONTENT_TOO_LARGE",
    "This draft is too large. Reduce the article text or number of entries.",
    "ڈرافٹ بڑا ہے۔ مضمون کا متن یا اندراجات کم کریں۔",
    "المسودة كبيرة جدًا. قلل نصوص المقالات أو عدد الإدخالات."
  ],
  [
    "faqEyebrow",
    "A little clarity",
    "چند ضروری باتیں",
    "بعض التوضيح"
  ],
  [
    "faqTitle",
    "Good questions. Clear answers.",
    "اچھے سوال، واضح جواب۔",
    "أسئلة جيدة. إجابات واضحة."
  ],
  [
    "faqHint",
    "The details that help you choose with confidence.",
    "وہ تفصیل جو اعتماد سے انتخاب میں مدد دے۔",
    "تفاصيل تساعدك على الاختيار بثقة."
  ],
  [
    "faqEmpty",
    "Please contact our team with your questions.",
    "سوالات کے لیے ہماری ٹیم سے رابطہ کریں۔",
    "تواصل مع فريقنا لطرح أسئلتك."
  ],
  [
    "contact",
    "Speak with our team",
    "ہماری ٹیم سے بات کریں",
    "تحدث مع فريقنا"
  ],
  [
    "journalEyebrow",
    "Notes from AllBarka",
    "آل برکہ کی جانب سے",
    "ملاحظات من ألبركة"
  ],
  [
    "journalTitle",
    "The Harvest Chronicle",
    "فصل کی کہانیاں",
    "سجل الحصاد"
  ],
  [
    "searchArticles",
    "Search articles…",
    "مضامین تلاش کریں…",
    "ابحث في المقالات…"
  ],
  [
    "collections",
    "Collections",
    "مجموعے",
    "المجموعات"
  ],
  [
    "showcase",
    "Boutique selections",
    "منتخب آئٹمز",
    "مختارات البوتيك"
  ],
  [
    "occasions",
    "Occasions",
    "مواقع",
    "المناسبات"
  ],
  [
    "care",
    "Care & service",
    "دیکھ بھال اور خدمت",
    "العناية والخدمة"
  ],
  [
    "reviews",
    "Customer feedback",
    "کسٹمر کی آرا",
    "آراء العملاء"
  ],
  [
    "category.All",
    "All",
    "سب",
    "الكل"
  ],
  [
    "category.Storage & Care",
    "Storage & Care",
    "ذخیرہ اور دیکھ بھال",
    "التخزين والعناية"
  ],
  [
    "category.Culinary & Pairings",
    "Culinary & Pairings",
    "ترکیبیں اور امتزاج",
    "الطهي والتنسيق"
  ],
  [
    "category.Gifting",
    "Gifting",
    "تحائف",
    "الهدايا"
  ],
  [
    "category.Wellness & Science",
    "Wellness & Science",
    "صحت اور سائنس",
    "الصحة والعلوم"
  ],
  [
    "category.Buying Guides",
    "Buying Guides",
    "خریداری کے رہنما",
    "أدلة الشراء"
  ]
,
["loading","Loading content…","مواد لوڈ ہو رہا ہے…","جار تحميل المحتوى…"]
] as const;
export const contentTranslations:Record<LanguageCode,Record<string,string>>={en:Object.fromEntries(entries.map(([k,en])=>['content.'+k,en])),ur:Object.fromEntries(entries.map(([k,,ur])=>['content.'+k,ur])),ar:Object.fromEntries(entries.map(([k,,,ar])=>['content.'+k,ar]))};
