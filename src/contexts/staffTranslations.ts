import type {LanguageCode} from './LanguageContext';
const entries=[
  [
    "workspace",
    "Order room",
    "آرڈر روم",
    "غرفة الطلبات"
  ],
  [
    "eyebrow",
    "AllBarka · fulfilment",
    "آل برکہ · آرڈر کی تیاری",
    "ألبركة · تجهيز الطلبات"
  ],
  [
    "title",
    "Every order, carefully seen.",
    "ہر آرڈر، پوری توجہ کے ساتھ۔",
    "كل طلب، بعناية."
  ],
  [
    "hint",
    "Review incoming orders and their details. Changes remain with the administrator.",
    "نئے آرڈر اور ان کی تفصیل دیکھیں۔ تبدیلیاں ایڈمن کرے گا۔",
    "راجع الطلبات الواردة وتفاصيلها. التعديلات لدى المسؤول."
  ],
  [
    "readOnly",
    "View orders only",
    "صرف آرڈر دیکھ سکتے ہیں",
    "عرض الطلبات فقط"
  ],
  [
    "restricted",
    "Order access is unavailable",
    "آرڈر دیکھنے کی اجازت دستیاب نہیں",
    "الوصول إلى الطلبات غير متاح"
  ],
  [
    "accessHint",
    "Ask your administrator to grant order access to your verified account.",
    "اپنے تصدیق شدہ اکاؤنٹ پر ایڈمن سے آرڈر کی اجازت لیں۔",
    "اطلب من المسؤول منح حسابك الموثق صلاحية عرض الطلبات."
  ],
  [
    "team",
    "Team access",
    "ٹیم کی رسائی",
    "صلاحيات الفريق"
  ],
  [
    "teamHint",
    "Choose an existing verified account, then grant or revoke order viewing. Staff cannot edit orders or access the catalog.",
    "موجودہ تصدیق شدہ اکاؤنٹ منتخب کر کے آرڈر دیکھنے کی اجازت دیں یا واپس لیں۔ عملہ آرڈر یا کیٹلاگ تبدیل نہیں کر سکتا۔",
    "اختر حسابًا موثقًا موجودًا ثم امنح أو اسحب عرض الطلبات. لا يمكن للموظفين تعديل الطلبات أو الوصول إلى الكتالوج."
  ],
  [
    "email",
    "Staff account email",
    "عملے کے اکاؤنٹ کا ای میل",
    "بريد حساب الموظف"
  ],
  [
    "lookup",
    "Find account",
    "اکاؤنٹ تلاش کریں",
    "العثور على الحساب"
  ],
  [
    "grant",
    "Grant order access",
    "آرڈر کی اجازت دیں",
    "منح عرض الطلبات"
  ],
  [
    "revoke",
    "Revoke access",
    "اجازت واپس لیں",
    "سحب الصلاحية"
  ],
  [
    "active",
    "Access granted",
    "اجازت موجود ہے",
    "الصلاحية ممنوحة"
  ],
  [
    "inactive",
    "Access revoked",
    "اجازت واپس لی گئی",
    "الصلاحية مسحوبة"
  ],
  [
    "noMembers",
    "No staff access has been granted yet.",
    "ابھی عملے کو اجازت نہیں دی گئی۔",
    "لم تُمنح صلاحيات للموظفين بعد."
  ],
  [
    "saved",
    "Team access saved.",
    "ٹیم کی اجازت محفوظ ہو گئی۔",
    "تم حفظ صلاحيات الفريق."
  ],
  [
    "loading",
    "Loading orders…",
    "آرڈر لوڈ ہو رہے ہیں…",
    "جار تحميل الطلبات…"
  ],
  [
    "empty",
    "No orders match these filters.",
    "ان فلٹرز میں کوئی آرڈر نہیں۔",
    "لا توجد طلبات مطابقة لهذه المرشحات."
  ],
  [
    "details",
    "View details",
    "تفصیل دیکھیں",
    "عرض التفاصيل"
  ],
  [
    "filter",
    "Filter by status",
    "حالت کے مطابق فلٹر",
    "تصفية حسب الحالة"
  ],
  [
    "search",
    "Search orders",
    "آرڈر تلاش کریں",
    "بحث الطلبات"
  ],
  [
    "page",
    "Page",
    "صفحہ",
    "الصفحة"
  ],
  [
    "of",
    "of",
    "از",
    "من"
  ],
  [
    "limited",
    "This search covers a bounded set of recent orders. Narrow the filters if needed.",
    "یہ تلاش محدود حالیہ آرڈرز کی ہے۔ ضرورت ہو تو فلٹر کم کریں۔",
    "يغطي البحث مجموعة محدودة من الطلبات الحديثة. ضيّق المرشحات عند الحاجة."
  ],
  [
    "memberLimit",
    "Only the first 200 staff records are shown. Manage an existing account through email lookup.",
    "پہلے ۲۰۰ ریکارڈ دکھائے گئے ہیں۔ ای میل سے مخصوص اکاؤنٹ تلاش کریں۔",
    "تُعرض أول 200 سجل. ابحث بالبريد لإدارة حساب محدد."
  ],
  [
    "accountReview",
    "Confirm this is the intended account",
    "تصدیق کریں کہ یہی مطلوبہ اکاؤنٹ ہے",
    "تأكد أن هذا هو الحساب المقصود"
  ],
  [
    "gift",
    "Gift instructions",
    "تحفے کی ہدایات",
    "تعليمات الهدية"
  ],
  [
    "error",
    "The request could not complete. Refresh and try again.",
    "درخواست مکمل نہیں ہوئی۔ ریفریش کر کے دوبارہ کوشش کریں۔",
    "تعذر إكمال الطلب. حدّث وحاول مجددًا."
  ],
  [
    "error.STAFF_REVISION_CONFLICT",
    "Access changed since you opened it. Find the account again before retrying.",
    "اجازت بدل گئی ہے۔ دوبارہ اکاؤنٹ تلاش کریں۔",
    "تغيرت الصلاحية. ابحث عن الحساب مجددًا قبل المحاولة."
  ],
  [
    "error.STAFF_EMAIL_UNVERIFIED",
    "The account must verify its email before receiving staff access.",
    "عملے کی اجازت سے پہلے اکاؤنٹ کا ای میل تصدیق ہونا لازمی ہے۔",
    "يجب توثيق بريد الحساب قبل منحه الصلاحية."
  ],
  [
    "error.STAFF_ACCOUNT_NOT_FOUND",
    "No existing account was found. The staff member must sign in first.",
    "اکاؤنٹ نہیں ملا۔ عملہ پہلے سائن اِن کرے۔",
    "لم يُعثر على حساب. يجب على الموظف تسجيل الدخول أولًا."
  ],
  [
    "error.STAFF_ACCOUNT_DISABLED",
    "This account is disabled.",
    "یہ اکاؤنٹ غیر فعال ہے۔",
    "هذا الحساب معطل."
  ],
  [
    "error.STAFF_ALREADY_ADMIN",
    "This account already has administrator access.",
    "یہ اکاؤنٹ پہلے ایڈمن ہے۔",
    "هذا الحساب يملك صلاحيات المسؤول بالفعل."
  ],
  [
    "error.INVALID_STAFF_EMAIL",
    "Enter a valid account email.",
    "درست اکاؤنٹ ای میل درج کریں۔",
    "أدخل بريد حساب صحيحًا."
  ]
] as const;
export const staffTranslations:Record<LanguageCode,Record<string,string>>={en:Object.fromEntries(entries.map(([k,en])=>['staff.'+k,en])),ur:Object.fromEntries(entries.map(([k,,ur])=>['staff.'+k,ur])),ar:Object.fromEntries(entries.map(([k,,,ar])=>['staff.'+k,ar]))};
