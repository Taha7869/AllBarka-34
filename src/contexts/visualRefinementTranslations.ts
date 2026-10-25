import type { LanguageCode } from './LanguageContext';

const entries: readonly (readonly [string, string, string, string])[] = [
  ['visual.home', 'Home', 'ہوم', 'الرئيسية'],
  ['visual.lahore', 'Premium Dry Fruits', 'اعلیٰ خشک میوہ جات', 'فواكه مجففة فاخرة'],
  ['visual.loopLabel', 'Explore AllBarka collections', 'آلبرکہ کے مجموعے دریافت کریں', 'اكتشف مجموعات ألبركة'],
  ['visual.pause', 'Pause collection ribbon', 'مجموعوں کی حرکت روکیں', 'إيقاف شريط المجموعات'],
  ['visual.play', 'Play collection ribbon', 'مجموعوں کی حرکت چلائیں', 'تشغيل شريط المجموعات'],
  ['visual.collections', 'The AllBarka Collection', 'آلبرکہ کے مجموعے', 'مجموعة ألبركة'],
  ['visual.nuts', 'Nuts & Kernels', 'گریاں اور مغز', 'المكسرات واللب'],
  ['visual.deals', 'Pairings & Bundles', 'جوڑے اور مجموعے', 'ثنائيات وحزم'],
  ['visual.snacks', 'Snacks & Seeds', 'اسنیکس اور بیج', 'الوجبات الخفيفة والبذور'],
  ['visual.gifts', 'Thoughtful Gifting', 'خاص تحائف', 'هدايا مختارة'],
  ['visual.oils', 'Cold-Pressed Oils', 'کولڈ پریسڈ تیل', 'زيوت معصورة على البارد'],
  ['visual.essentials', 'Pantry Essentials', 'باورچی خانے کی ضروریات', 'أساسيات المطبخ'],
  ['visual.all', 'The Full Boutique', 'مکمل بوتیک', 'البوتيك الكامل'],
  ['reserve.eyebrow', 'A letter from AllBarka', 'آل برکہ کی جانب سے ایک خط', 'رسالة من ألبركة'],
  ['reserve.title', 'The Private Reserve', 'آل برکہ کا خصوصی ریزرو', 'قائمة ألبركة الخاصة'],
  ['reserve.titleLead', 'The Private', 'آل برکہ کا', 'قائمة ألبركة'],
  ['reserve.titleAccent', 'Reserve', 'خصوصی ریزرو', 'الخاصة'],
  ['reserve.description', 'Seasonal harvests, thoughtful gifts and considered notes from AllBarka.', 'موسمی فصلیں، خوبصورت تحفے اور آل برکہ کی منتخب خبریں۔', 'محاصيل موسمية، وهدايا مختارة وأخبار منتقاة من ألبركة.'],
  ['reserve.invitation', 'Your invitation to stay close.', 'آل برکہ سے جڑے رہنے کی دعوت۔', 'دعوتك للبقاء على تواصل.'],
  ['reserve.email', 'Your email address', 'آپ کا ای میل پتہ', 'عنوان بريدك الإلكتروني'],
  ['reserve.join', 'Join the reserve', 'خصوصی ریزرو میں شامل ہوں', 'انضم إلى القائمة الخاصة'],
  ['reserve.consent', 'By subscribing, you agree to receive AllBarka harvest and gifting updates by email.', 'شامل ہونے پر آپ آل برکہ کی فصلوں اور تحفوں کی خبریں ای میل کے ذریعے وصول کرنے پر رضامند ہوتے ہیں۔', 'بالاشتراك، توافق على تلقي أخبار محاصيل ألبركة والهدايا عبر البريد الإلكتروني.'],
  ['reserve.notes', 'Harvest notes · Gifting inspiration', 'فصلوں کی خبریں · تحفوں کے نئے خیال', 'أخبار المحاصيل · أفكار للهدايا'],
];

export const visualRefinementTranslations: Record<LanguageCode, Record<string, string>> = {
  en: Object.fromEntries(entries.map(([key, en]) => [key, en])),
  ur: Object.fromEntries(entries.map(([key, , ur]) => [key, ur])),
  ar: Object.fromEntries(entries.map(([key, , , ar]) => [key, ar])),
};
