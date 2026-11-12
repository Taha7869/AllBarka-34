/**
 * Celebrations registry: branches, occasions, ranges, packaging formats and designs.
 *
 * Names come from docs/celebrations/NAMING_REGISTER.md (owner-approved 12 November 2026);
 * tests/celebrations-registry.test.ts fails if this file and the register drift apart.
 * Arabic strings still need native review. This module is the storefront's single
 * read API for celebrations, so an admin-managed source can replace the constants later
 * without touching the pages. It holds no prices: a design is selected through enquiry.
 */
import type { EventType } from '../lib/occasionPlanning';

export type Lang = 'en' | 'ur' | 'ar';
export type Localized = Record<Lang, string>;
export type LegacyOccasionId = 'wedding' | 'umrah' | 'ramadan' | 'birth' | 'corporate';
export type Finish = 'standard' | 'foil';

export interface CelebrationBranch {
  slug: string;
  /** Signature name: Roman Urdu or English for `en`, script versions for `ur` and `ar`. */
  signature: Localized;
  plain: Localized;
  /** Existing ready-to-order listing that belongs to this branch, if any. */
  legacyOccasion?: LegacyOccasionId;
  /** Closest option in the existing enquiry form, if any. */
  inquiryEvent?: EventType;
}
export interface CelebrationOccasion { slug: string; branch: string; signature: Localized; plain: Localized; }
export interface CelebrationRange { slug: string; branch: string; plain: Localized; }
export interface PackagingFormat { slug: string; group: 'packaging' | 'accessory'; plain: Localized; }
export interface CelebrationDesign {
  slug: string;
  name: string;
  branch: string;
  occasion: string | null;
  range?: string;
  formats: string[];
  palette: { name: string; hex: string }[];
  /** Print finishes the owner can source. Foil costs more and is quoted separately. */
  finishes: Finish[];
  /** Manifest row in docs/celebrations/IMAGE_MANIFEST.md. */
  imageId: string;
  /** Set when the approved WebP is committed. */
  image: string | null;
  /** Further approved views of the same design: top-down, the matching set, a foil variant. */
  gallery?: { shot: 'top-down' | 'set' | 'foil'; src: string }[];
  /** A concept is artwork for a package that has not been sampled yet. */
  status: 'concept' | 'sampled';
  /** Only the owner turns this on. Unpublished designs never reach public pages. */
  publishApproved: boolean;
}

export const CELEBRATION_BRANCHES: CelebrationBranch[] = [
  { slug: "wedding-celebrations", signature: { en: "Rishton Ki Mehfil", ur: "رشتوں کی محفل", ar: "ملتقى الأحبة" }, plain: { en: "Wedding Celebrations", ur: "شادی کی تقریبات", ar: "مناسبات الزواج" }, legacyOccasion: 'wedding', inquiryEvent: 'wedding' },
  { slug: "baby-milestones", signature: { en: "Nanhi Khushiyan", ur: "ننھی خوشیاں", ar: "أفراح صغيرة" }, plain: { en: "Baby & Little Milestones", ur: "بچوں کی آمد اور ننھے سنگِ میل", ar: "المولود ومراحله الأولى" }, legacyOccasion: 'birth', inquiryEvent: 'baby_aqeeqah' },
  { slug: "birthdays-parties", signature: { en: "Khushi Ka Din", ur: "خوشی کا دن", ar: "يوم للفرح" }, plain: { en: "Birthdays & Parties", ur: "سالگرہ اور پارٹیاں", ar: "أعياد الميلاد والحفلات" } },
  { slug: "hajj-tabarruk", signature: { en: "Yaad-e-Hajj", ur: "یادِ حج", ar: "ذكرى الحج" }, plain: { en: "Hajj Tabarruk", ur: "حج کے تبرک کی پیکنگ", ar: "تغليف توزيعات الحج" }, legacyOccasion: 'umrah', inquiryEvent: 'umrah' },
  { slug: "umrah-tabarruk", signature: { en: "Yaad-e-Umrah", ur: "یادِ عمرہ", ar: "ذكرى العمرة" }, plain: { en: "Umrah Tabarruk", ur: "عمرہ کے تبرک کی پیکنگ", ar: "تغليف توزيعات العمرة" }, legacyOccasion: 'umrah', inquiryEvent: 'umrah' },
  { slug: "religious-festive", signature: { en: "Lamha-e-Shukr", ur: "لمحۂ شکر", ar: "لحظات شكر" }, plain: { en: "Religious & Festive Occasions", ur: "دینی اور تہوار کی تقریبات", ar: "المناسبات الدينية والأعياد" }, legacyOccasion: 'ramadan', inquiryEvent: 'eid_ramzan' },
  { slug: "family-personal-gifting", signature: { en: "Apnon Ke Naam", ur: "اپنوں کے نام", ar: "إلى الأحبة" }, plain: { en: "Family & Personal Gifting", ur: "خاندان اور ذاتی تحائف", ar: "هدايا العائلة والأحبة" } },
  { slug: "school-achievements", signature: { en: "Mehnat Ke Naam", ur: "محنت کے نام", ar: "تقديرًا للجهد" }, plain: { en: "School & Achievements", ur: "تعلیم اور کامیابیاں", ar: "الدراسة والإنجازات" } },
  { slug: "corporate-business", signature: { en: "Considered Gestures", ur: "سوچی سمجھی پیشکش", ar: "لفتات مدروسة" }, plain: { en: "Corporate & Business", ur: "کاروباری تحائف", ar: "هدايا الشركات والأعمال" }, legacyOccasion: 'corporate', inquiryEvent: 'corporate' },
  { slug: "event-accessories", signature: { en: "Har Tafseel Mein Pyaar", ur: "ہر تفصیل میں پیار", ar: "محبة في كل تفصيل" }, plain: { en: "Event Accessories & Presentation", ur: "تقریب کی اشیا اور تحائف کی پیشکش", ar: "مستلزمات المناسبات وتقديم الهدايا" } },
];

export const CELEBRATION_OCCASIONS: CelebrationOccasion[] = [
  { slug: "baat-pakki", branch: "wedding-celebrations", signature: { en: "Rishtay Ki Dastak", ur: "رشتے کی دستک", ar: "بداية الوصال" }, plain: { en: "Baat Pakki", ur: "بات پکی", ar: "الاتفاق على الزواج" } },
  { slug: "engagement", branch: "wedding-celebrations", signature: { en: "Wada-e-Saath", ur: "وعدۂ ساتھ", ar: "وعد المودة" }, plain: { en: "Engagement", ur: "منگنی", ar: "الخطوبة" } },
  { slug: "dholki", branch: "wedding-celebrations", signature: { en: "Aangan Ke Geet", ur: "آنگن کے گیت", ar: "أغاني الدار" }, plain: { en: "Dholki", ur: "ڈھولکی", ar: "ليلة الدهولكي" } },
  { slug: "mayoun", branch: "wedding-celebrations", signature: { en: "Sunehri Shaam", ur: "سنہری شام", ar: "أمسية ذهبية" }, plain: { en: "Mayoun", ur: "مایوں", ar: "احتفال المايون" } },
  { slug: "mehndi", branch: "wedding-celebrations", signature: { en: "Rangon Ki Mehfil", ur: "رنگوں کی محفل", ar: "بهجة الألوان" }, plain: { en: "Mehndi", ur: "مہندی", ar: "ليلة الحناء" } },
  { slug: "nikah-bid", branch: "wedding-celebrations", signature: { en: "Ahd-e-Saath", ur: "عہدِ ساتھ", ar: "عهد المودة" }, plain: { en: "Nikah & Bid", ur: "نکاح اور بید", ar: "عقد القران وتوزيعاته" } },
  { slug: "baraat", branch: "wedding-celebrations", signature: { en: "Jashn-e-Milan", ur: "جشنِ ملاپ", ar: "فرحة اللقاء" }, plain: { en: "Baraat", ur: "بارات", ar: "زفاف وموكب العريس" } },
  { slug: "walima", branch: "wedding-celebrations", signature: { en: "Mehfil-e-Shukr", ur: "محفلِ شکر", ar: "لقاء الشكر" }, plain: { en: "Walima", ur: "ولیمہ", ar: "وليمة الزواج" } },
  { slug: "bridal-shower", branch: "wedding-celebrations", signature: { en: "Khwab Se Qareeb", ur: "خواب سے قریب", ar: "أقرب إلى الحلم" }, plain: { en: "Bridal Shower", ur: "دلہن کی سہیلیوں کی تقریب", ar: "حفلة العروس" } },
  { slug: "bridesmaid-appreciation", branch: "wedding-celebrations", signature: { en: "Saheliyon Ke Naam", ur: "سہیلیوں کے نام", ar: "إلى رفيقات الدرب" }, plain: { en: "Bridesmaid Appreciation", ur: "دلہن کی سہیلیوں کا شکریہ", ar: "تقدير وصيفات العروس" } },
  { slug: "baby-on-the-way", branch: "baby-milestones", signature: { en: "Nanhi Si Aas", ur: "ننھی سی آس", ar: "أمل صغير" }, plain: { en: "Baby on the Way", ur: "ننھے مہمان کی آمد کی خبر", ar: "الإعلان عن انتظار مولود" } },
  { slug: "baby-shower", branch: "baby-milestones", signature: { en: "Nanhe Mehmaan Ke Naam", ur: "ننھے مہمان کے نام", ar: "إلى ضيفنا الصغير" }, plain: { en: "Baby Shower", ur: "بچے کی آمد سے پہلے کی تقریب", ar: "حفلة استقبال المولود المنتظر" } },
  { slug: "birth-announcement", branch: "baby-milestones", signature: { en: "Aangan Mein Bahaar", ur: "آنگن میں بہار", ar: "ربيع في دارنا" }, plain: { en: "Birth Announcement", ur: "پیدائش کی خوش خبری", ar: "إعلان الولادة" } },
  { slug: "twins-announcement", branch: "baby-milestones", signature: { en: "Do Nanhe Sitaray", ur: "دو ننھے ستارے", ar: "نجمان صغيران" }, plain: { en: "Twins Announcement", ur: "جڑواں بچوں کی خوش خبری", ar: "إعلان ولادة توأم" } },
  { slug: "welcome-baby", branch: "baby-milestones", signature: { en: "Ghar Ka Nanha Mehmaan", ur: "گھر کا ننھا مہمان", ar: "ضيف الدار الصغير" }, plain: { en: "Welcome Baby", ur: "بچے کا استقبال", ar: "استقبال المولود" } },
  { slug: "aqiqah", branch: "baby-milestones", signature: { en: "Shukr Ki Khushi", ur: "شکر کی خوشی", ar: "فرحة وشكر" }, plain: { en: "Aqiqah", ur: "عقیقہ", ar: "عقيقة" } },
  { slug: "naming-celebration", branch: "baby-milestones", signature: { en: "Naam Se Pehchaan", ur: "نام سے پہچان", ar: "اسم وحكاية" }, plain: { en: "Naming Celebration", ur: "نام رکھنے کی تقریب", ar: "احتفال تسمية المولود" } },
  { slug: "first-tooth", branch: "baby-milestones", signature: { en: "Pehla Moti", ur: "پہلا موتی", ar: "اللؤلؤة الأولى" }, plain: { en: "First Tooth", ur: "پہلا دانت", ar: "السن الأول" } },
  { slug: "first-birthday", branch: "baby-milestones", signature: { en: "Ek Saal Ka Pyaar", ur: "ایک سال کا پیار", ar: "عام من الحب" }, plain: { en: "First Birthday", ur: "پہلی سالگرہ", ar: "عيد الميلاد الأول" } },
  { slug: "kids-birthday", branch: "birthdays-parties", signature: { en: "Chhoti Duniya, Bara Jashn", ur: "چھوٹی دنیا، بڑا جشن", ar: "عالم صغير وفرح كبير" }, plain: { en: "Kids' Birthday", ur: "بچے کی سالگرہ", ar: "عيد ميلاد طفل" } },
  { slug: "teen-birthday", branch: "birthdays-parties", signature: { en: "Apna Andaaz", ur: "اپنا انداز", ar: "بأسلوبك الخاص" }, plain: { en: "Teen Birthday", ur: "نوعمر کی سالگرہ", ar: "عيد ميلاد مراهق" } },
  { slug: "adult-birthday", branch: "birthdays-parties", signature: { en: "Tumhare Naam Ek Shaam", ur: "تمہارے نام ایک شام", ar: "أمسية من أجلك" }, plain: { en: "Adult Birthday", ur: "بڑوں کی سالگرہ", ar: "عيد ميلاد للكبار" } },
  { slug: "milestone-birthday", branch: "birthdays-parties", signature: { en: "Yaadon Ka Jashn", ur: "یادوں کا جشن", ar: "احتفاء بالذكريات" }, plain: { en: "Milestone Birthday", ur: "خاص عمر کی سالگرہ", ar: "عيد ميلاد مميز" } },
  { slug: "hajj", branch: "hajj-tabarruk", signature: { en: "Hajj Mubarak", ur: "حج مبارک", ar: "حج مبارك" }, plain: { en: "Hajj", ur: "حج", ar: "الحج" } },
  { slug: "hajj-welcome-home", branch: "hajj-tabarruk", signature: { en: "Hajj Se Ghar Tak", ur: "حج سے گھر تک", ar: "من الحج إلى الدار" }, plain: { en: "Hajj Welcome Home", ur: "حج سے واپسی کا استقبال", ar: "استقبال العائد من الحج" } },
  { slug: "umrah", branch: "umrah-tabarruk", signature: { en: "Umrah Mubarak", ur: "عمرہ مبارک", ar: "عمرة مباركة" }, plain: { en: "Umrah", ur: "عمرہ", ar: "العمرة" } },
  { slug: "umrah-return", branch: "umrah-tabarruk", signature: { en: "Umrah Se Ghar Tak", ur: "عمرہ سے گھر تک", ar: "من العمرة إلى الدار" }, plain: { en: "Umrah Return", ur: "عمرہ سے واپسی", ar: "العودة من العمرة" } },
  { slug: "ameen", branch: "religious-festive", signature: { en: "Ameen Ki Khushi", ur: "آمین کی خوشی", ar: "فرحة آمين" }, plain: { en: "Ameen Celebration", ur: "آمین کی تقریب", ar: "حفل آمين" } },
  { slug: "quran-completion", branch: "religious-festive", signature: { en: "Takmeel-e-Quran Ki Yaad", ur: "تکمیلِ قرآن کی یاد", ar: "ذكرى ختم القرآن" }, plain: { en: "Quran Completion", ur: "تکمیلِ قرآن", ar: "ختم القرآن" } },
  { slug: "hifz-completion", branch: "religious-festive", signature: { en: "Hifz Ka Safar", ur: "حفظ کا سفر", ar: "رحلة الحفظ" }, plain: { en: "Hifz Completion", ur: "تکمیلِ حفظ", ar: "إتمام حفظ القرآن" } },
  { slug: "bismillah-ceremony", branch: "religious-festive", signature: { en: "Bismillah Se Aaghaz", ur: "بسم اللہ سے آغاز", ar: "بداية ببسم الله" }, plain: { en: "Bismillah Ceremony", ur: "بسم اللہ کی تقریب", ar: "حفل بدء تعلم القرآن" } },
  { slug: "first-fast", branch: "religious-festive", signature: { en: "Pehle Rozay Ki Khushi", ur: "پہلے روزے کی خوشی", ar: "فرحة الصيام الأول" }, plain: { en: "First Fast / Roza Kushai", ur: "پہلا روزہ / روزہ کشائی", ar: "الصيام الأول" } },
  { slug: "milad", branch: "religious-festive", signature: { en: "Mehfil-e-Milad", ur: "محفلِ میلاد", ar: "مجلس المولد" }, plain: { en: "Milad Gathering", ur: "محفلِ میلاد", ar: "المولد" } },
  { slug: "ramadan", branch: "religious-festive", signature: { en: "Ramzan Ke Lamhe", ur: "رمضان کے لمحے", ar: "لحظات رمضان" }, plain: { en: "Ramadan Gifting", ur: "رمضان کے تحائف", ar: "هدايا رمضان" } },
  { slug: "iftar", branch: "religious-festive", signature: { en: "Dastarkhwan-e-Iftar", ur: "دسترخوانِ افطار", ar: "مائدة الإفطار" }, plain: { en: "Iftar", ur: "افطار", ar: "الإفطار" } },
  { slug: "eid-ul-fitr", branch: "religious-festive", signature: { en: "Eid Ki Apnaaiyat", ur: "عید کی اپنائیت", ar: "دفء العيد" }, plain: { en: "Eid-ul-Fitr", ur: "عید الفطر", ar: "عيد الفطر" } },
  { slug: "eid-ul-adha", branch: "religious-festive", signature: { en: "Eid Ka Rishta", ur: "عید کا رشتہ", ar: "العيد يجمعنا" }, plain: { en: "Eid-ul-Adha", ur: "عید الاضحیٰ", ar: "عيد الأضحى" } },
  { slug: "anniversary", branch: "family-personal-gifting", signature: { en: "Saath Ke Saal", ur: "ساتھ کے سال", ar: "أعوام معًا" }, plain: { en: "Anniversary", ur: "ازدواجی سالگرہ", ar: "ذكرى الزواج" } },
  { slug: "mothers-day", branch: "family-personal-gifting", signature: { en: "Maa Ke Naam", ur: "ماں کے نام", ar: "إلى أمي" }, plain: { en: "Mother's Day", ur: "ماں کا دن", ar: "عيد الأم" } },
  { slug: "fathers-day", branch: "family-personal-gifting", signature: { en: "Baba Ke Naam", ur: "بابا کے نام", ar: "إلى أبي" }, plain: { en: "Father's Day", ur: "باپ کا دن", ar: "عيد الأب" } },
  { slug: "housewarming", branch: "family-personal-gifting", signature: { en: "Naye Ghar Ki Khushi", ur: "نئے گھر کی خوشی", ar: "فرحة البيت الجديد" }, plain: { en: "Housewarming", ur: "نئے گھر کی خوشی", ar: "الانتقال إلى بيت جديد" } },
  { slug: "thank-you", branch: "family-personal-gifting", signature: { en: "Dil Se Shukriya", ur: "دل سے شکریہ", ar: "شكرًا من القلب" }, plain: { en: "Thank You", ur: "شکریہ", ar: "شكر وتقدير" } },
  { slug: "get-well-soon", branch: "family-personal-gifting", signature: { en: "Khayal Tumhara", ur: "خیال تمہارا", ar: "نفكر بك" }, plain: { en: "Get Well Soon", ur: "جلد صحت یابی کی خواہش", ar: "تمنيات بالشفاء" } },
  { slug: "welcome-home", branch: "family-personal-gifting", signature: { en: "Ghar Phir Roshan", ur: "گھر پھر روشن", ar: "أنار البيت بعودتك" }, plain: { en: "Welcome Home", ur: "گھر واپسی کا استقبال", ar: "الترحيب بالعودة" } },
  { slug: "host-appreciation", branch: "family-personal-gifting", signature: { en: "Mezban Ke Naam", ur: "میزبان کے نام", ar: "إلى من أكرم ضيافتنا" }, plain: { en: "Host Appreciation", ur: "میزبان کا شکریہ", ar: "شكر المضيف" } },
  { slug: "graduation", branch: "school-achievements", signature: { en: "Agla Aasmaan", ur: "اگلا آسمان", ar: "أفق جديد" }, plain: { en: "Graduation", ur: "تعلیم کی تکمیل", ar: "التخرج" } },
  { slug: "results-celebration", branch: "school-achievements", signature: { en: "Mehnat Ka Rang", ur: "محنت کا رنگ", ar: "ثمرة الاجتهاد" }, plain: { en: "Results Celebration", ur: "نتیجے کی خوشی", ar: "الاحتفال بالنتائج" } },
  { slug: "teacher-appreciation", branch: "school-achievements", signature: { en: "Ustaad Ke Naam", ur: "استاد کے نام", ar: "إلى معلّمينا" }, plain: { en: "Teacher Appreciation", ur: "استاد کا شکریہ", ar: "تقدير المعلّم" } },
  { slug: "farewell", branch: "school-achievements", signature: { en: "Yaadein Saath Rahengi", ur: "یادیں ساتھ رہیں گی", ar: "تبقى الذكريات معنا" }, plain: { en: "Farewell", ur: "الوداعی تقریب", ar: "حفل وداع" } },
  { slug: "achievement", branch: "school-achievements", signature: { en: "Apni Manzil Ka Jashn", ur: "اپنی منزل کا جشن", ar: "فرحة الإنجاز" }, plain: { en: "Achievement", ur: "کامیابی", ar: "إنجاز" } },
  { slug: "employee-welcome", branch: "corporate-business", signature: { en: "A Shared Beginning", ur: "مشترکہ آغاز", ar: "بداية مشتركة" }, plain: { en: "Employee Welcome", ur: "نئے ملازم کا استقبال", ar: "استقبال موظف جديد" } },
  { slug: "client-appreciation", branch: "corporate-business", signature: { en: "With Appreciation", ur: "اظہارِ تشکر", ar: "مع التقدير" }, plain: { en: "Client Appreciation", ur: "کلائنٹ کا شکریہ", ar: "تقدير العميل" } },
  { slug: "conference", branch: "corporate-business", signature: { en: "Ideas, Together", ur: "خیالات کا سنگم", ar: "أفكار تجمعنا" }, plain: { en: "Conference", ur: "کانفرنس", ar: "مؤتمر" } },
  { slug: "exhibition", branch: "corporate-business", signature: { en: "A Lasting Introduction", ur: "یاد رہنے والا تعارف", ar: "تعارف يبقى في الذاكرة" }, plain: { en: "Exhibition", ur: "نمائش", ar: "معرض" } },
  { slug: "product-launch", branch: "corporate-business", signature: { en: "The First Impression", ur: "پہلا تاثر", ar: "الانطباع الأول" }, plain: { en: "PR & Product Launch", ur: "پی آر اور پروڈکٹ کا اجرا", ar: "إطلاق منتج وحملة علاقات عامة" } },
  { slug: "business-anniversary", branch: "corporate-business", signature: { en: "Years of Partnership", ur: "شراکت کے سال", ar: "أعوام من الشراكة" }, plain: { en: "Business Anniversary", ur: "کاروبار کی سالگرہ", ar: "ذكرى تأسيس الشركة" } },
];

export const CELEBRATION_RANGES: CelebrationRange[] = [
  { slug: "jora-presentations", branch: "wedding-celebrations", plain: { en: "Jora Presentation Sets", ur: "جوڑے کی پیشکش کے سیٹ", ar: "أطقم تقديم ملابس الهدايا" } },
  { slug: "party-return-gifts", branch: "birthdays-parties", plain: { en: "Party Return Gifts", ur: "پارٹی کے یادگاری تحائف", ar: "هدايا تذكارية للضيوف" } },
  { slug: "party-goody-bags", branch: "birthdays-parties", plain: { en: "Party Goody Bags", ur: "پارٹی کے گڈی بیگز", ar: "أكياس هدايا الحفلات" } },
  { slug: "hajj-guest-favors", branch: "hajj-tabarruk", plain: { en: "Hajj Guest Favors", ur: "حج کے مہمانوں کے لیے تحائف", ar: "توزيعات الحج للضيوف" } },
  { slug: "hajj-family-sets", branch: "hajj-tabarruk", plain: { en: "Hajj Family Sets", ur: "حج کے خاندانی تحفہ سیٹ", ar: "أطقم هدايا الحج للعائلة" } },
  { slug: "hajj-keepsakes", branch: "hajj-tabarruk", plain: { en: "Hajj Keepsake Boxes", ur: "حج کے یادگاری باکس", ar: "علب تذكارات الحج" } },
  { slug: "umrah-dates-bottle-sets", branch: "umrah-tabarruk", plain: { en: "Umrah Date-Box & Bottle Packaging Sets", ur: "عمرہ کے کھجور باکس اور بوتل کی پیکنگ کے سیٹ", ar: "أطقم تغليف علب التمر والقوارير للعمرة" } },
  { slug: "umrah-tins-pouches", branch: "umrah-tabarruk", plain: { en: "Umrah Tins & Pouches", ur: "عمرہ کے ٹن باکس اور پاؤچ", ar: "علب معدنية وأكياس للعمرة" } },
  { slug: "umrah-baskets", branch: "umrah-tabarruk", plain: { en: "Umrah Gift Baskets", ur: "عمرہ کے تحفہ باسکٹ", ar: "سلال هدايا العمرة" } },
  { slug: "school-giveaways", branch: "school-achievements", plain: { en: "School Giveaways", ur: "اسکول کے یادگاری تحائف", ar: "توزيعات مدرسية" } },
  { slug: "corporate-festive-hampers", branch: "corporate-business", plain: { en: "Corporate Festive Hampers", ur: "کاروباری تہوار کے ہیمپر", ar: "سلال هدايا الأعياد للشركات" } },
  { slug: "matching-presentation-sets", branch: "event-accessories", plain: { en: "Matching Presentation Sets", ur: "ہم آہنگ پیشکش کے سیٹ", ar: "أطقم تقديم متناسقة" } },
];

export const PACKAGING_FORMATS: PackagingFormat[] = [
  { slug: "folding-boxes", group: 'packaging', plain: { en: "Folding Boxes", ur: "فولڈنگ باکس", ar: "علب قابلة للطي" } },
  { slug: "rigid-boxes", group: 'packaging', plain: { en: "Rigid Boxes", ur: "مضبوط گتے کے باکس", ar: "علب صلبة" } },
  { slug: "drawer-boxes", group: 'packaging', plain: { en: "Drawer Boxes", ur: "دراز والے باکس", ar: "علب بدرج" } },
  { slug: "tins", group: 'packaging', plain: { en: "Tins", ur: "ٹن باکس", ar: "علب معدنية" } },
  { slug: "acrylic-boxes", group: 'packaging', plain: { en: "Acrylic Boxes", ur: "ایکریلک باکس", ar: "علب أكريليك" } },
  { slug: "acrylic-trays", group: 'packaging', plain: { en: "Acrylic Trays", ur: "ایکریلک ٹرے", ar: "صواني أكريليك" } },
  { slug: "wooden-boxes", group: 'packaging', plain: { en: "Wooden Boxes", ur: "لکڑی کے باکس", ar: "علب خشبية" } },
  { slug: "wooden-crates", group: 'packaging', plain: { en: "Wooden Crates", ur: "لکڑی کے کریٹ", ar: "صناديق خشبية" } },
  { slug: "baskets", group: 'packaging', plain: { en: "Baskets", ur: "ٹوکریاں", ar: "سلال" } },
  { slug: "potlis", group: 'packaging', plain: { en: "Potlis", ur: "پوٹلیاں", ar: "صرر قماشية" } },
  { slug: "pouches", group: 'packaging', plain: { en: "Pouches", ur: "پاؤچ", ar: "أكياس صغيرة" } },
  { slug: "gift-bags", group: 'packaging', plain: { en: "Gift Bags", ur: "تحفے کے بیگ", ar: "أكياس الهدايا" } },
  { slug: "jars", group: 'packaging', plain: { en: "Jars", ur: "جار", ar: "برطمانات" } },
  { slug: "bottle-sets", group: 'packaging', plain: { en: "Bottle Sets", ur: "بوتل سیٹ", ar: "أطقم قوارير" } },
  { slug: "invitations", group: 'accessory', plain: { en: "Invitations", ur: "دعوت نامے", ar: "دعوات" } },
  { slug: "gift-tags", group: 'accessory', plain: { en: "Gift Tags", ur: "تحفے کے ٹیگ", ar: "بطاقات الهدايا" } },
  { slug: "stickers-seals", group: 'accessory', plain: { en: "Stickers & Seals", ur: "اسٹیکر اور سیل", ar: "ملصقات وأختام" } },
  { slug: "printed-sleeves", group: 'accessory', plain: { en: "Printed Sleeves", ur: "پرنٹڈ سلیوز", ar: "أغلفة مطبوعة" } },
  { slug: "cake-cupcake-toppers", group: 'accessory', plain: { en: "Cake & Cupcake Toppers", ur: "کیک اور کپ کیک ٹاپرز", ar: "زينة علوية للكيك والكب كيك" } },
  { slug: "place-cards", group: 'accessory', plain: { en: "Place Cards", ur: "مہمانوں کی نشست کے کارڈ", ar: "بطاقات أماكن الضيوف" } },
  { slug: "table-signs", group: 'accessory', plain: { en: "Table Signs", ur: "میزوں کی تختیاں", ar: "لافتات الطاولات" } },
  { slug: "milestone-memory-boards", group: 'accessory', plain: { en: "Milestone & Memory Boards", ur: "اہم لمحوں اور یادوں کے بورڈ", ar: "لوحات المراحل والذكريات" } },
];

export const CELEBRATION_DESIGNS: CelebrationDesign[] = [
  { slug: "gul-e-ahd", name: "Gul-e-Ahd", branch: "wedding-celebrations", occasion: "nikah-bid", formats: ["folding-boxes"], palette: [{ name: "Dusty rose", hex: "#c9a0a0" }, { name: "Sage", hex: "#a9b8a0" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard', 'foil'], imageId: "IMG-0001", image: null, status: 'concept', publishApproved: false },
  { slug: "moti-ki-muskaan", name: "Moti Ki Muskaan", branch: "baby-milestones", occasion: "first-tooth", formats: ["tins"], palette: [{ name: "Butter yellow", hex: "#f2e2a4" }, { name: "Powder blue", hex: "#b9d0e2" }, { name: "Ivory", hex: "#f6f2e8" }], finishes: ['standard'], imageId: "IMG-0002", image: null, status: 'concept', publishApproved: false },
  { slug: "rangon-ka-safar", name: "Rangon Ka Safar", branch: "birthdays-parties", occasion: "kids-birthday", formats: ["gift-bags"], palette: [{ name: "Coral", hex: "#e39a86" }, { name: "Sky blue", hex: "#a8cbe0" }, { name: "Mustard", hex: "#d9b45a" }], finishes: ['standard'], imageId: "IMG-0003", image: null, status: 'concept', publishApproved: false },
  { slug: "safar-e-hajj", name: "Safar-e-Hajj", branch: "hajj-tabarruk", occasion: "hajj", formats: ["rigid-boxes"], palette: [{ name: "Stone ivory", hex: "#ece5d6" }, { name: "Olive", hex: "#7d8460" }, { name: "Ochre", hex: "#b9954f" }], finishes: ['standard', 'foil'], imageId: "IMG-0004", image: null, status: 'concept', publishApproved: false },
  { slug: "safar-e-umrah", name: "Safar-e-Umrah", branch: "umrah-tabarruk", occasion: "umrah", formats: ["bottle-sets"], palette: [{ name: "Chalk blue", hex: "#b7c9d6" }, { name: "Ivory", hex: "#f3efe6" }, { name: "Soft grey", hex: "#c9c7c0" }], finishes: ['standard', 'foil'], imageId: "IMG-0005", image: null, status: 'concept', publishApproved: false },
  { slug: "naqsh-e-shukr", name: "Naqsh-e-Shukr", branch: "religious-festive", occasion: "quran-completion", formats: ["acrylic-boxes"], palette: [{ name: "Midnight blue", hex: "#1f2c4a" }, { name: "Warm ivory", hex: "#f2ecdf" }, { name: "Ochre", hex: "#b9954f" }], finishes: ['standard'], imageId: "IMG-0006", image: null, status: 'concept', publishApproved: false },
  { slug: "maa-ka-aangan", name: "Maa Ka Aangan", branch: "family-personal-gifting", occasion: "mothers-day", formats: ["baskets"], palette: [{ name: "Wicker", hex: "#c8a878" }, { name: "Sage", hex: "#a9b8a0" }, { name: "Pale rose", hex: "#e3c3c0" }], finishes: ['standard'], imageId: "IMG-0007", image: null, status: 'concept', publishApproved: false },
  { slug: "udaan-ki-nishani", name: "Udaan Ki Nishani", branch: "school-achievements", occasion: "graduation", formats: ["wooden-crates"], palette: [{ name: "Natural wood", hex: "#d2b48c" }, { name: "Indigo", hex: "#2f3e6b" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard'], imageId: "IMG-0008", image: null, status: 'concept', publishApproved: false },
  { slug: "quiet-regards", name: "Quiet Regards", branch: "corporate-business", occasion: "client-appreciation", formats: ["drawer-boxes"], palette: [{ name: "Ink blue", hex: "#1d2b44" }, { name: "Warm grey", hex: "#a8a39a" }, { name: "Ivory", hex: "#f2eee6" }], finishes: ['standard'], imageId: "IMG-0009", image: null, status: 'concept', publishApproved: false },
  { slug: "mehfil-ka-khat", name: "Mehfil Ka Khat", branch: "event-accessories", occasion: null, range: "matching-presentation-sets", formats: ["invitations", "gift-tags", "printed-sleeves", "stickers-seals"], palette: [{ name: "Warm ivory", hex: "#f3ecdf" }, { name: "Terracotta", hex: "#c27e5f" }, { name: "Sage", hex: "#a9b8a0" }], finishes: ['standard'], imageId: "IMG-0010", image: null, status: 'concept', publishApproved: false },
  // Batches 3–11: one design brief per remaining occasion (drafted 12 November, owner review pending).
  { slug: "dastak", name: "Dastak", branch: "wedding-celebrations", occasion: "baat-pakki", formats: ["rigid-boxes"], palette: [{ name: "Champagne", hex: "#e8dcc4" }, { name: "Blush", hex: "#e6c7c2" }, { name: "Olive", hex: "#7d8460" }], finishes: ['standard', 'foil'], imageId: "IMG-0011", image: null, status: 'concept', publishApproved: false },
  { slug: "halqa", name: "Halqa", branch: "wedding-celebrations", occasion: "engagement", formats: ["tins"], palette: [{ name: "Pearl white", hex: "#f3efe7" }, { name: "Soft gold-beige", hex: "#d8c39a" }, { name: "Rose", hex: "#d9a6a0" }], finishes: ['standard', 'foil'], imageId: "IMG-0012", image: null, status: 'concept', publishApproved: false },
  { slug: "geet-mala", name: "Geet Mala", branch: "wedding-celebrations", occasion: "dholki", formats: ["potlis"], palette: [{ name: "Marigold", hex: "#e3a83b" }, { name: "Fuchsia", hex: "#c2477a" }, { name: "Leaf green", hex: "#5f8f5a" }], finishes: ['standard', 'foil'], imageId: "IMG-0013", image: null, status: 'concept', publishApproved: false },
  { slug: "haldi-phool", name: "Haldi Phool", branch: "wedding-celebrations", occasion: "mayoun", formats: ["folding-boxes"], palette: [{ name: "Turmeric yellow", hex: "#e6b93f" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Henna green", hex: "#6f8a4e" }], finishes: ['standard', 'foil'], imageId: "IMG-0014", image: null, status: 'concept', publishApproved: false },
  { slug: "rang-mehfil", name: "Rang Mehfil", branch: "wedding-celebrations", occasion: "mehndi", formats: ["gift-bags"], palette: [{ name: "Emerald", hex: "#1f6b55" }, { name: "Magenta", hex: "#b83b6e" }, { name: "Saffron", hex: "#e39b2d" }], finishes: ['standard', 'foil'], imageId: "IMG-0015", image: null, status: 'concept', publishApproved: false },
  { slug: "shehnai", name: "Shehnai", branch: "wedding-celebrations", occasion: "baraat", formats: ["drawer-boxes"], palette: [{ name: "Deep maroon", hex: "#6d1f2b" }, { name: "Antique cream", hex: "#efe4cf" }, { name: "Muted brass", hex: "#b08d4a" }], finishes: ['standard', 'foil'], imageId: "IMG-0016", image: null, status: 'concept', publishApproved: false },
  { slug: "shukrana", name: "Shukrana", branch: "wedding-celebrations", occasion: "walima", formats: ["acrylic-boxes"], palette: [{ name: "Ivory", hex: "#f4efe4" }, { name: "Sage", hex: "#a9b8a0" }, { name: "Dove grey", hex: "#c9c7c0" }], finishes: ['standard', 'foil'], imageId: "IMG-0017", image: null, status: 'concept', publishApproved: false },
  { slug: "khwab", name: "Khwab", branch: "wedding-celebrations", occasion: "bridal-shower", formats: ["baskets"], palette: [{ name: "Blush pink", hex: "#ebc9c9" }, { name: "Cream", hex: "#f6f0e4" }, { name: "Eucalyptus", hex: "#9db3a1" }], finishes: ['standard', 'foil'], imageId: "IMG-0018", image: null, status: 'concept', publishApproved: false },
  { slug: "saheli", name: "Saheli", branch: "wedding-celebrations", occasion: "bridesmaid-appreciation", formats: ["pouches"], palette: [{ name: "Dusty lilac", hex: "#c3b1cf" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Sage", hex: "#a9b8a0" }], finishes: ['standard', 'foil'], imageId: "IMG-0019", image: null, status: 'concept', publishApproved: false },
  { slug: "aas", name: "Aas", branch: "baby-milestones", occasion: "baby-on-the-way", formats: ["folding-boxes"], palette: [{ name: "Soft mint", hex: "#cfe3d6" }, { name: "Cream", hex: "#f6f0e4" }, { name: "Warm sand", hex: "#d9c6a5" }], finishes: ['standard'], imageId: "IMG-0020", image: null, status: 'concept', publishApproved: false },
  { slug: "nanha-mehmaan", name: "Nanha Mehmaan", branch: "baby-milestones", occasion: "baby-shower", formats: ["gift-bags"], palette: [{ name: "Powder blue", hex: "#bcd3e6" }, { name: "Peach", hex: "#f2cdb3" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard'], imageId: "IMG-0021", image: null, status: 'concept', publishApproved: false },
  { slug: "bahaar", name: "Bahaar", branch: "baby-milestones", occasion: "birth-announcement", formats: ["tins"], palette: [{ name: "Spring green", hex: "#b9d6a8" }, { name: "Blossom pink", hex: "#f0c6cf" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard'], imageId: "IMG-0022", image: null, status: 'concept', publishApproved: false },
  { slug: "do-sitaray", name: "Do Sitaray", branch: "baby-milestones", occasion: "twins-announcement", formats: ["rigid-boxes"], palette: [{ name: "Soft lilac", hex: "#cdbfe0" }, { name: "Butter", hex: "#f2e2a4" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard'], imageId: "IMG-0023", image: null, status: 'concept', publishApproved: false },
  { slug: "nanhe-qadam", name: "Nanhe Qadam", branch: "baby-milestones", occasion: "welcome-baby", formats: ["baskets"], palette: [{ name: "Oatmeal", hex: "#e4d8c2" }, { name: "Sky", hex: "#b9d0e2" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard'], imageId: "IMG-0024", image: null, status: 'concept', publishApproved: false },
  { slug: "shukr", name: "Shukr", branch: "baby-milestones", occasion: "aqiqah", formats: ["rigid-boxes"], palette: [{ name: "Ivory", hex: "#f4efe4" }, { name: "Soft gold-beige", hex: "#d8c39a" }, { name: "Olive", hex: "#7d8460" }], finishes: ['standard'], imageId: "IMG-0025", image: null, status: 'concept', publishApproved: false },
  { slug: "naam", name: "Naam", branch: "baby-milestones", occasion: "naming-celebration", formats: ["acrylic-boxes"], palette: [{ name: "Warm white", hex: "#f6f2e8" }, { name: "Terracotta", hex: "#c27e5f" }, { name: "Sage", hex: "#a9b8a0" }], finishes: ['standard'], imageId: "IMG-0026", image: null, status: 'concept', publishApproved: false },
  { slug: "pehla-saal", name: "Pehla Saal", branch: "baby-milestones", occasion: "first-birthday", formats: ["folding-boxes"], palette: [{ name: "Sunny yellow", hex: "#f1d36b" }, { name: "Sky blue", hex: "#a8cbe0" }, { name: "Coral", hex: "#e39a86" }], finishes: ['standard'], imageId: "IMG-0027", image: null, status: 'concept', publishApproved: false },
  { slug: "apna-rang", name: "Apna Rang", branch: "birthdays-parties", occasion: "teen-birthday", formats: ["pouches"], palette: [{ name: "Teal", hex: "#2f9c95" }, { name: "Warm white", hex: "#f6f2e8" }, { name: "Apricot", hex: "#f0a868" }], finishes: ['standard'], imageId: "IMG-0028", image: null, status: 'concept', publishApproved: false },
  { slug: "ek-shaam", name: "Ek Shaam", branch: "birthdays-parties", occasion: "adult-birthday", formats: ["drawer-boxes"], palette: [{ name: "Midnight navy", hex: "#1e2a44" }, { name: "Champagne", hex: "#e8dcc4" }, { name: "Dusty rose", hex: "#c9a0a0" }], finishes: ['standard'], imageId: "IMG-0029", image: null, status: 'concept', publishApproved: false },
  { slug: "yaadgaar", name: "Yaadgaar", branch: "birthdays-parties", occasion: "milestone-birthday", formats: ["wooden-boxes"], palette: [{ name: "Walnut", hex: "#7a5a3c" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Muted brass", hex: "#b08d4a" }], finishes: ['standard'], imageId: "IMG-0030", image: null, status: 'concept', publishApproved: false },
  { slug: "marhaba", name: "Marhaba", branch: "hajj-tabarruk", occasion: "hajj-welcome-home", formats: ["baskets"], palette: [{ name: "Stone ivory", hex: "#ece5d6" }, { name: "Olive", hex: "#7d8460" }, { name: "Ochre", hex: "#b9954f" }], finishes: ['standard', 'foil'], imageId: "IMG-0031", image: null, status: 'concept', publishApproved: false },
  { slug: "nishani", name: "Nishani", branch: "umrah-tabarruk", occasion: "umrah-return", formats: ["tins"], palette: [{ name: "Chalk blue", hex: "#b7c9d6" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Soft grey", hex: "#c9c7c0" }], finishes: ['standard', 'foil'], imageId: "IMG-0032", image: null, status: 'concept', publishApproved: false },
  { slug: "ameen", name: "Ameen", branch: "religious-festive", occasion: "ameen", formats: ["folding-boxes"], palette: [{ name: "Soft teal", hex: "#7fb3ad" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Ochre", hex: "#b9954f" }], finishes: ['standard'], imageId: "IMG-0033", image: null, status: 'concept', publishApproved: false },
  { slug: "noor", name: "Noor", branch: "religious-festive", occasion: "hifz-completion", formats: ["rigid-boxes"], palette: [{ name: "Deep green", hex: "#1f4d3a" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Ochre", hex: "#b9954f" }], finishes: ['standard'], imageId: "IMG-0034", image: null, status: 'concept', publishApproved: false },
  { slug: "aaghaz", name: "Aaghaz", branch: "religious-festive", occasion: "bismillah-ceremony", formats: ["pouches"], palette: [{ name: "Sky blue", hex: "#a8cbe0" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Leaf green", hex: "#5f8f5a" }], finishes: ['standard'], imageId: "IMG-0035", image: null, status: 'concept', publishApproved: false },
  { slug: "pehla-roza", name: "Pehla Roza", branch: "religious-festive", occasion: "first-fast", formats: ["gift-bags"], palette: [{ name: "Dusk purple", hex: "#5b4a7a" }, { name: "Soft gold-beige", hex: "#d8c39a" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard'], imageId: "IMG-0036", image: null, status: 'concept', publishApproved: false },
  { slug: "mehfil", name: "Mehfil", branch: "religious-festive", occasion: "milad", formats: ["rigid-boxes"], palette: [{ name: "Emerald", hex: "#1f6b55" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Ochre", hex: "#b9954f" }], finishes: ['standard'], imageId: "IMG-0037", image: null, status: 'concept', publishApproved: false },
  { slug: "ramzan-lamhe", name: "Ramzan Lamhe", branch: "religious-festive", occasion: "ramadan", formats: ["tins"], palette: [{ name: "Midnight blue", hex: "#1f2c4a" }, { name: "Sand", hex: "#e2d3b5" }, { name: "Ochre", hex: "#b9954f" }], finishes: ['standard'], imageId: "IMG-0038", image: null, status: 'concept', publishApproved: false },
  { slug: "dastarkhwan", name: "Dastarkhwan", branch: "religious-festive", occasion: "iftar", formats: ["acrylic-trays"], palette: [{ name: "Deep teal", hex: "#1f5f63" }, { name: "Sand", hex: "#e2d3b5" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard'], imageId: "IMG-0039", image: null, status: 'concept', publishApproved: false },
  { slug: "eid-milan", name: "Eid Milan", branch: "religious-festive", occasion: "eid-ul-fitr", formats: ["folding-boxes"], palette: [{ name: "Mint", hex: "#cfe3d6" }, { name: "Blush", hex: "#e6c7c2" }, { name: "Ochre", hex: "#b9954f" }], finishes: ['standard'], imageId: "IMG-0040", image: null, status: 'concept', publishApproved: false },
  { slug: "eid-rishta", name: "Eid Rishta", branch: "religious-festive", occasion: "eid-ul-adha", formats: ["drawer-boxes"], palette: [{ name: "Olive", hex: "#7d8460" }, { name: "Cream", hex: "#f6f0e4" }, { name: "Terracotta", hex: "#c27e5f" }], finishes: ['standard'], imageId: "IMG-0041", image: null, status: 'concept', publishApproved: false },
  { slug: "saath", name: "Saath", branch: "family-personal-gifting", occasion: "anniversary", formats: ["rigid-boxes"], palette: [{ name: "Burgundy", hex: "#6e2433" }, { name: "Blush", hex: "#e6c7c2" }, { name: "Champagne", hex: "#e8dcc4" }], finishes: ['standard'], imageId: "IMG-0042", image: null, status: 'concept', publishApproved: false },
  { slug: "baba", name: "Baba", branch: "family-personal-gifting", occasion: "fathers-day", formats: ["wooden-boxes"], palette: [{ name: "Walnut", hex: "#7a5a3c" }, { name: "Navy", hex: "#1e2a44" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard'], imageId: "IMG-0043", image: null, status: 'concept', publishApproved: false },
  { slug: "naya-aangan", name: "Naya Aangan", branch: "family-personal-gifting", occasion: "housewarming", formats: ["wooden-crates"], palette: [{ name: "Natural wood", hex: "#d2b48c" }, { name: "Terracotta", hex: "#c27e5f" }, { name: "Sage", hex: "#a9b8a0" }], finishes: ['standard'], imageId: "IMG-0044", image: null, status: 'concept', publishApproved: false },
  { slug: "shukriya", name: "Shukriya", branch: "family-personal-gifting", occasion: "thank-you", formats: ["pouches"], palette: [{ name: "Peach", hex: "#f2cdb3" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Sage", hex: "#a9b8a0" }], finishes: ['standard'], imageId: "IMG-0045", image: null, status: 'concept', publishApproved: false },
  { slug: "khayal", name: "Khayal", branch: "family-personal-gifting", occasion: "get-well-soon", formats: ["baskets"], palette: [{ name: "Soft yellow", hex: "#f2e2a4" }, { name: "Sky", hex: "#b9d0e2" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard'], imageId: "IMG-0046", image: null, status: 'concept', publishApproved: false },
  { slug: "roshan-ghar", name: "Roshan Ghar", branch: "family-personal-gifting", occasion: "welcome-home", formats: ["gift-bags"], palette: [{ name: "Warm beige", hex: "#dcc39a" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Olive", hex: "#7d8460" }], finishes: ['standard'], imageId: "IMG-0047", image: null, status: 'concept', publishApproved: false },
  { slug: "mezbaan", name: "Mezbaan", branch: "family-personal-gifting", occasion: "host-appreciation", formats: ["jars"], palette: [{ name: "Olive", hex: "#7d8460" }, { name: "Cream", hex: "#f6f0e4" }, { name: "Terracotta", hex: "#c27e5f" }], finishes: ['standard'], imageId: "IMG-0048", image: null, status: 'concept', publishApproved: false },
  { slug: "mehnat", name: "Mehnat", branch: "school-achievements", occasion: "results-celebration", formats: ["folding-boxes"], palette: [{ name: "Cobalt", hex: "#2f5fa8" }, { name: "Sunny yellow", hex: "#f1d36b" }, { name: "Ivory", hex: "#f4efe4" }], finishes: ['standard'], imageId: "IMG-0049", image: null, status: 'concept', publishApproved: false },
  { slug: "ustaad", name: "Ustaad", branch: "school-achievements", occasion: "teacher-appreciation", formats: ["jars"], palette: [{ name: "Forest green", hex: "#2f5d46" }, { name: "Cream", hex: "#f6f0e4" }, { name: "Brick", hex: "#b5563f" }], finishes: ['standard'], imageId: "IMG-0050", image: null, status: 'concept', publishApproved: false },
  { slug: "yaadein", name: "Yaadein", branch: "school-achievements", occasion: "farewell", formats: ["pouches"], palette: [{ name: "Dusty blue", hex: "#8fa7bf" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Mustard", hex: "#d9b45a" }], finishes: ['standard'], imageId: "IMG-0051", image: null, status: 'concept', publishApproved: false },
  { slug: "manzil", name: "Manzil", branch: "school-achievements", occasion: "achievement", formats: ["rigid-boxes"], palette: [{ name: "Charcoal", hex: "#33363b" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Muted brass", hex: "#b08d4a" }], finishes: ['standard'], imageId: "IMG-0052", image: null, status: 'concept', publishApproved: false },
  { slug: "first-day", name: "First Day", branch: "corporate-business", occasion: "employee-welcome", formats: ["drawer-boxes"], palette: [{ name: "Slate", hex: "#4a5560" }, { name: "Warm white", hex: "#f6f2e8" }, { name: "Teal", hex: "#2f8f8a" }], finishes: ['standard'], imageId: "IMG-0053", image: null, status: 'concept', publishApproved: false },
  { slug: "common-ground", name: "Common Ground", branch: "corporate-business", occasion: "conference", formats: ["pouches"], palette: [{ name: "Graphite", hex: "#3a3d42" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Mustard", hex: "#d9b45a" }], finishes: ['standard'], imageId: "IMG-0054", image: null, status: 'concept', publishApproved: false },
  { slug: "open-house", name: "Open House", branch: "corporate-business", occasion: "exhibition", formats: ["gift-bags"], palette: [{ name: "Warm white", hex: "#f6f2e8" }, { name: "Ink blue", hex: "#1d2b44" }, { name: "Coral", hex: "#e39a86" }], finishes: ['standard'], imageId: "IMG-0055", image: null, status: 'concept', publishApproved: false },
  { slug: "first-look", name: "First Look", branch: "corporate-business", occasion: "product-launch", formats: ["rigid-boxes"], palette: [{ name: "Matte black", hex: "#1c1c1e" }, { name: "Ivory", hex: "#f4efe4" }, { name: "Coral", hex: "#e39a86" }], finishes: ['standard'], imageId: "IMG-0056", image: null, status: 'concept', publishApproved: false },
  { slug: "milestone", name: "Milestone", branch: "corporate-business", occasion: "business-anniversary", formats: ["wooden-boxes"], palette: [{ name: "Walnut", hex: "#7a5a3c" }, { name: "Ink blue", hex: "#1d2b44" }, { name: "Muted brass", hex: "#b08d4a" }], finishes: ['standard'], imageId: "IMG-0057", image: null, status: 'concept', publishApproved: false },
];

/** Old slugs, spellings and former signature names, mapped to their canonical path. */
export const CELEBRATION_ALIASES: Record<string, string> = {
  "nikah": "/occasions/nikah-bid",
  "nikkah": "/occasions/nikah-bid",
  "ahd-e-saath": "/occasions/nikah-bid",
  "pregnancy-announcement": "/occasions/baby-on-the-way",
  "nanhi-si-aas": "/occasions/baby-on-the-way",
  "a-little-promise": "/occasions/baby-on-the-way",
  "pehla-moti": "/occasions/first-tooth",
  "aqeeqa": "/occasions/aqiqah",
  "aqeeqah": "/occasions/aqiqah",
  "akika": "/occasions/aqiqah",
  "bridesmaid-gifts": "/occasions/bridesmaid-appreciation",
  "host-gifts": "/occasions/host-appreciation",
  "achievements": "/occasions/achievement",
  "jora-presentation": "/packaging?range=jora-presentations",
  "gift-bag": "/packaging/gift-bags",
  "tin": "/packaging/tins",
  "folding-box": "/packaging/folding-boxes",
  "rigid-box": "/packaging/rigid-boxes",
  "drawer-box": "/packaging/drawer-boxes",
  "acrylic-box": "/packaging/acrylic-boxes",
  "acrylic-tray": "/packaging/acrylic-trays",
  "wooden-box": "/packaging/wooden-boxes",
  "wooden-crate": "/packaging/wooden-crates",
  "basket": "/packaging/baskets",
  "potli": "/packaging/potlis",
  "pouch": "/packaging/pouches",
  "jar": "/packaging/jars",
  "bottle-set": "/packaging/bottle-sets",
};

const LEGACY_OCCASIONS: readonly LegacyOccasionId[] = ['wedding', 'umrah', 'ramadan', 'birth', 'corporate'];

export const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const occasionBySlug = new Map(CELEBRATION_OCCASIONS.map(item => [item.slug, item]));
const branchBySlug = new Map(CELEBRATION_BRANCHES.map(item => [item.slug, item]));
const formatBySlug = new Map(PACKAGING_FORMATS.map(item => [item.slug, item]));

/** Signature names double as aliases, so "/occasions/pehla-moti" finds First Tooth. */
const signatureAliases = new Map<string, string>();
for (const occasion of CELEBRATION_OCCASIONS) {
  const alias = slugify(occasion.signature.en);
  if (alias && !occasionBySlug.has(alias) && !signatureAliases.has(alias)) signatureAliases.set(alias, occasion.slug);
}

export const getBranch = (slug: string) => branchBySlug.get(slug);
export const getOccasion = (slug: string) => occasionBySlug.get(slug);
export const getFormat = (slug: string) => formatBySlug.get(slug);
export const getDesign = (slug: string) => CELEBRATION_DESIGNS.find(item => item.slug === slug);
export const occasionsInBranch = (branch: string) => CELEBRATION_OCCASIONS.filter(item => item.branch === branch);
export const rangesInBranch = (branch: string) => CELEBRATION_RANGES.filter(item => item.branch === branch);

/** `preview` is the owner's review switch; public pages always pass false. */
export const isDesignVisible = (design: CelebrationDesign, preview = false) => preview || design.publishApproved;
export const designsForOccasion = (slug: string, preview = false) =>
  CELEBRATION_DESIGNS.filter(item => item.occasion === slug && isDesignVisible(item, preview));
export const designsForFormat = (slug: string, preview = false) =>
  CELEBRATION_DESIGNS.filter(item => item.formats.includes(slug) && isDesignVisible(item, preview));
export const designsForBranch = (slug: string, preview = false) =>
  CELEBRATION_DESIGNS.filter(item => item.branch === slug && isDesignVisible(item, preview));
/** Publication gate: an occasion has its own indexable page only with an approved design. */
/** Other designs from the same branch, for the "More from this collection" rail. */
export const relatedDesigns = (design: CelebrationDesign, preview = false) =>
  CELEBRATION_DESIGNS.filter(item => item.slug !== design.slug && item.branch === design.branch && isDesignVisible(item, preview));
export const isOccasionPublished = (slug: string) => designsForOccasion(slug).length > 0;
export const isFormatPublished = (slug: string) => designsForFormat(slug).length > 0;

export function resolveOccasionSlug(raw: string): { slug: string; viaAlias: boolean } | null {
  const key = slugify(raw);
  if (occasionBySlug.has(key)) return { slug: key, viaAlias: false };
  const target = CELEBRATION_ALIASES[key];
  if (target?.startsWith('/occasions/')) return { slug: target.slice('/occasions/'.length), viaAlias: true };
  const signature = signatureAliases.get(key);
  return signature ? { slug: signature, viaAlias: true } : null;
}

export function resolveFormatSlug(raw: string): { slug: string; viaAlias: boolean } | null {
  const key = slugify(raw);
  if (formatBySlug.has(key)) return { slug: key, viaAlias: false };
  const target = CELEBRATION_ALIASES[key];
  if (target?.startsWith('/packaging/')) return { slug: target.slice('/packaging/'.length), viaAlias: true };
  return null;
}

export type OccasionRoute =
  | { kind: 'occasion'; occasion: CelebrationOccasion; redirectTo?: string }
  | { kind: 'request'; occasion: CelebrationOccasion; redirectTo?: string }
  | { kind: 'legacy'; legacy: LegacyOccasionId; occasion?: CelebrationOccasion }
  | { kind: 'unknown' };

/**
 * Decides what "/occasions/:slug" shows.
 * Existing ready-to-order listings keep working until an occasion has an approved design,
 * so no link that sells today turns into an enquiry page.
 */
export function resolveOccasionRoute(raw: string, legacySlug: string | null, preview = false): OccasionRoute {
  const resolved = resolveOccasionSlug(raw);
  const occasion = resolved ? occasionBySlug.get(resolved.slug) : undefined;
  const redirectTo = resolved?.viaAlias ? `/occasions/${resolved.slug}` : undefined;
  if (occasion && designsForOccasion(occasion.slug, preview).length > 0) return { kind: 'occasion', occasion, redirectTo };
  if (legacySlug && (LEGACY_OCCASIONS as readonly string[]).includes(legacySlug)) return { kind: 'legacy', legacy: legacySlug as LegacyOccasionId, occasion };
  if (occasion) return { kind: 'request', occasion, redirectTo };
  return { kind: 'unknown' };
}

export const localized = (value: Localized, language: string) => value[(language as Lang)] || value.en;
/** "Pehla Moti (First Tooth)": the signature name with the plain name in brackets. */
export const displayName = (item: { signature: Localized; plain: Localized }, language: string) =>
  `${localized(item.signature, language)} (${localized(item.plain, language)})`;
