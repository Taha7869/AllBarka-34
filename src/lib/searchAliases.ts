import type { Product } from '../types';

export interface SearchConceptRule {
  /** Patterns matching canonical English / ID / Urdu terms on a product */
  match: RegExp;
  /** Roman Urdu, Urdu script, Arabic, and colloquial spelling aliases */
  aliases: string;
}

/**
 * Bidirectional concept aliases applied dynamically across all 252+ products
 * (seeds, intake drafts, bundles, gifts, and future admin-added items).
 */
export const ROMAN_URDU_CONCEPT_RULES: readonly SearchConceptRule[] = [
  { match: /\b(almonds?|badam|mamra|gurbandi|kagzi)\b/i, aliases: 'badam badaam badamain بادام لوز mewa dry fruit' },
  { match: /\b(pistachios?|pista)\b/i, aliases: 'pista pistay pesteh pistachiyo پستہ فستق mewa dry fruit' },
  { match: /\b(cashews?|kaju)\b/i, aliases: 'kaju kaaju caju کاجو كاجو mewa dry fruit' },
  { match: /\b(walnuts?|akhroot|akhrot)\b/i, aliases: 'akhrot akhroot akrot giri اخروٹ جوز mewa dry fruit' },
  { match: /\b(dates?|khajoor|ajwa|mazafati|mabroom|piarom|safawi|sukkari|amber|kalmi|qalmi|rubai|chuhara)\b/i, aliases: 'khajoor khajur khajoorain chuhara chuara کھجور کھجوریں چھوہارا تمر' },
  { match: /\b(raisins?|kishmish|sundarkhani|sultanas?)\b/i, aliases: 'kishmish kismis kishmishain munaqqa کشمش منقی زبيب' },
  { match: /\b(figs?|anjeer)\b/i, aliases: 'anjeer anjir anjeerain انجیر تين' },
  { match: /\b(apricots?|khubani|kishta)\b/i, aliases: 'khubani khobani kishta خوبانی خشتا مشمش' },
  { match: /\b(plums?|alubukhara|kandahari)\b/i, aliases: 'alubukhara aloo bukhara alubukharay آلو بخارہ آلو بخارا' },
  { match: /\b(pine\s*nuts?|chilgoza)\b/i, aliases: 'chilgoza chalgoza chalghoza chilghoza چلغوزہ صنوبر' },
  { match: /\b(peanuts?|groundnuts?)\b/i, aliases: 'moongphali mungphali mongphali مونگ پھلی فول سوداني' },
  { match: /\b(hazelnuts?|pecans?|macadamia|brazil\s*nuts?)\b/i, aliases: 'mewa dry fruit dry fruits خشک میوہ میوہ جات فندق' },
  { match: /\b(coconut|khopra)\b/i, aliases: 'khopra nariyal garri giri کھوپرا ناریل جوز الهند' },
  { match: /\b(fennel|saunf|mukhwas)\b/i, aliases: 'saunf sonf sauf mukhwas mukhvas سونف مکھواس شمر' },
  { match: /\b(turmeric|haldi)\b/i, aliases: 'haldi haldee ہلدی كركم masala masalay' },
  { match: /\b(cinnamon|dalchini|darchini)\b/i, aliases: 'dalchini darchini daar cheeni دارچینی قرفة masala' },
  { match: /\b(cardamom|elaichi|ilaichi)\b/i, aliases: 'elaichi ilaichi choti elaichi badi elaichi الائچی سبز الائچی هيل' },
  { match: /\b(coriander|dhaniya|dhania)\b/i, aliases: 'dhaniya dhania sabit dhaniya پسا دھنیا ثابت دھنیا دھنیا كزبرة' },
  { match: /\b(black\s*pepper|white\s*pepper|peppercorns?)\b/i, aliases: 'kali mirch safed mirch dakhni mirch کالی مرچ سفید مرچ فلفل اسود' },
  { match: /\b(long\s*pepper|dara\s*mirch|pipli)\b/i, aliases: 'dara mirch pipli magha دڑا مرچ پپلی' },
  { match: /\b(red\s*chilli|chili|lal\s*mirch|dadar\s*mirch)\b/i, aliases: 'lal mirch surkh mirch dadar mirch kutti mirch لال مرچ سرخ مرچ دڑا مرچ' },
  { match: /\b(cloves?|laung)\b/i, aliases: 'laung long لونگ قرنفل masala' },
  { match: /\b(cumin|zeera|jeera)\b/i, aliases: 'zeera jeera zira safed zeera kala zeera زیرہ كمون' },
  { match: /\b(garam\s*masala)\b/i, aliases: 'garam masala sabit garam masala گرم مصالحہ مصالحے' },
  { match: /\b(curry\s*leaves?)\b/i, aliases: 'kari patta kadi patta کڑی پتہ' },
  { match: /\b(tamarind|imli)\b/i, aliases: 'imli املی تمر هندي' },
  { match: /\b(pomegranate|anar\s*dana|anardana)\b/i, aliases: 'anardana anar dana انار دانہ' },
  { match: /\b(fenugreek|methi)\b/i, aliases: 'methi dana methray میتھی دانہ میتھرے حلبة' },
  { match: /\b(nigella|kalonji)\b/i, aliases: 'kalonji kalwanji کلونجی حبة البركة' },
  { match: /\b(saffron|zafran|kesar)\b/i, aliases: 'zafran zafraan kesar kashmiri zafran زعفران کیسر' },
  { match: /\b(honey|beri|phulai)\b/i, aliases: 'shehad shahad sahad asli shehad شہد خالص شہد عسل' },
  { match: /\b(ghee)\b/i, aliases: 'desi ghee asli ghee دیسی گھی گھی سمن' },
  { match: /\b(jaggery|gur|shakkar)\b/i, aliases: 'gur gurd shakkar shakar desi shakkar گڑ شکر دیسی شکر' },
  { match: /\b(gachak|rewari|fruit\s*balls|nakul\s*dana|sweet\s*makhana)\b/i, aliases: 'gachak gajak rewari reori mithai میٹھائی گچک ریوڑی' },
  { match: /\b(sesame|til)\b/i, aliases: 'til till safed til کالا تل سفید تل تل سمسم' },
  { match: /\b(chickpeas?|chana|chanay)\b/i, aliases: 'chana chanay bhuna chana بھنے چنے چنے حمص' },
  { match: /\b(fox\s*nuts?|makhana|lotus\s*seeds?)\b/i, aliases: 'makhana phool makhana مکھانہ پھول مکھانہ' },
  { match: /\b(pumpkin\s*seeds?|pepitas?)\b/i, aliases: 'kaddu ke beej maghaz کدو کے بیج مغز' },
  { match: /\b(sunflower)\b/i, aliases: 'surajmukhi suraj mukhi سورج مکھی' },
  { match: /\b(flax|alsi)\b/i, aliases: 'alsi alsii السی' },
  { match: /\b(chia)\b/i, aliases: 'chia tukhm e sharbati tukhmalanga تخم ملنگا چیا' },
  { match: /\b(oils?|cold[- ]pressed|taramira|neem|mustard|sarson)\b/i, aliases: 'tel tail roghan تیل روغن زيت' },
  { match: /\b(murabba|gulkand)\b/i, aliases: 'murabba muraba murabba jaat gulkand gulqand مربہ مربے گلقند مربى' },
  { match: /\b(apple|saib)\b/i, aliases: 'saib seb سیب تفاح' },
  { match: /\b(carrot|gajar)\b/i, aliases: 'gajar گاجر جزر' },
  { match: /\b(quince|behi)\b/i, aliases: 'behi bahi بہی سفرجل' },
  { match: /\b(bael|bel)\b/i, aliases: 'bael bel bail giri بیل بیل گری' },
  { match: /\b(amla|gooseberry)\b/i, aliases: 'amla aamla آملہ' },
  { match: /\b(harad|myrobalan)\b/i, aliases: 'harad harrar hareer ہرڑ حریر' },
  { match: /\b(chai|tea|kahwa|qehwa|chamomile|tulsi|lemongrass|jasmine|noon)\b/i, aliases: 'chai chaye patti sabz chai kahwa qehwa kashmiri chai چائے پتی قہوہ سبز چائے شاي' },
  { match: /\b(licorice|mulethi)\b/i, aliases: 'mulethi mulathi malathi ملٹھی عرق سوس' },
  { match: /\b(psyllium|isabgol)\b/i, aliases: 'isabgol ispaghol اسپغول اسبغول' },
  { match: /\b(ashwagandha|asghand)\b/i, aliases: 'asghand ashwagandha asgandh اسگندھ' },
  { match: /\b(shikakai)\b/i, aliases: 'shikakai sheekakai شکاکائی' },
  { match: /\b(shilajit|salajeet)\b/i, aliases: 'salajeet shilajit silajit سلاجیت شلاجیت' },
  { match: /\b(ginseng)\b/i, aliases: 'ginseng جنسنگ' },
  { match: /\b(kamarkas|salab\s*misri|looban|gond)\b/i, aliases: 'pansar pansari jari booti kamarkas salab misri looban gond پنسار جڑی بوٹی کمرکس ثعلب مصری لوبان گوند' },
  { match: /\b(gift|hamper|box|visit|ayadat|condolence|dawat|rishta|nikkah|wedding|umrah|eid|ramadan|iftar|suhoor)\b/i, aliases: 'tohfa tahfa hadiya shadi shaadi nikkah nikah dawat ayadat iyadat taziyat ramzan eid تحفہ ہدیہ شادی نکاح دعوت عیادت تعزیت رمضان عید' },
];

export function expandRomanUrduAliases(product: Product): string {
  const source = [
    product.id,
    product.name_en,
    product.name,
    product.category,
    product.category_en,
    product.desc_en,
    ...(product.keywords || []),
    ...(product.occasions || []),
  ]
    .filter(Boolean)
    .join(' ');

  const extra: string[] = [];
  for (const rule of ROMAN_URDU_CONCEPT_RULES) {
    if (rule.match.test(source)) {
      extra.push(rule.aliases);
    }
  }
  return extra.join(' ');
}
