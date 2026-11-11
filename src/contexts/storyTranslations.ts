import type { LanguageCode } from './LanguageContext';

const entries: readonly (readonly [string, string, string, string])[] = [
  ['story.label', 'The AllBarka gift box, shown in three steps', 'آل برکہ کا گفٹ باکس، تین مرحلوں میں', 'علبة هدايا ألبركة في ثلاث خطوات'],
  ['story.title', 'Open the box', 'باکس کھولیے', 'افتح العلبة'],
  ['story.one.title', 'Wrapped by hand', 'ہاتھ سے لپیٹا ہوا', 'مغلّفة باليد'],
  ['story.one.copy', 'Every gift leaves our Lahore boutique in an emerald box tied with a gold satin ribbon.', 'ہر تحفہ ہمارے لاہور بوتیک سے زمردی باکس میں، سنہری ساٹن ربن کے ساتھ روانہ ہوتا ہے۔', 'كل هدية تغادر متجرنا في لاهور داخل علبة زمردية مربوطة بشريط ساتان ذهبي.'],
  ['story.two.title', 'Lift the lid', 'ڈھکن اٹھائیے', 'ارفع الغطاء'],
  ['story.two.copy', 'The lid comes away in one piece, so the first thing anyone sees is what you chose for them.', 'ڈھکن ایک ہی حصے میں اٹھتا ہے، اور سب سے پہلے وہی نظر آتا ہے جو آپ نے ان کے لیے چُنا۔', 'يُرفع الغطاء قطعة واحدة، فيكون أول ما يُرى هو ما اخترته لهم.'],
  ['story.three.title', 'Filled with the harvest', 'فصل سے بھرا ہوا', 'مملوءة بخيرات الموسم'],
  ['story.three.copy', 'Pistachios, walnuts, almonds, cashews and figs, each in its own compartment.', 'پستے، اخروٹ، بادام، کاجو اور انجیر، ہر ایک اپنے الگ خانے میں۔', 'فستق وجوز ولوز وكاجو وتين، كلٌّ في حجرته الخاصة.'],
  ['story.cta', 'Choose a gift box', 'گفٹ باکس منتخب کریں', 'اختر علبة هدايا'],
  ['story.imageAlt', 'An emerald AllBarka gift box with dry fruits in separate compartments', 'آل برکہ کا زمردی گفٹ باکس جس کے الگ خانوں میں خشک میوہ جات ہیں', 'علبة هدايا زمردية من ألبركة بحجرات منفصلة للفواكه المجففة'],
];

export const storyTranslations: Record<LanguageCode, Record<string, string>> = {
  en: Object.fromEntries(entries.map(([key, en]) => [key, en])),
  ur: Object.fromEntries(entries.map(([key, , ur]) => [key, ur])),
  ar: Object.fromEntries(entries.map(([key, , , ar]) => [key, ar])),
};
