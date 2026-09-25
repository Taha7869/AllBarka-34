import fs from 'fs';
import path from 'path';

let lines = fs.readFileSync(path.resolve('src/data/products.ts'), 'utf8').split(/\r?\n/);
let outputLines = [];

const dict = {
  'pista': { name_en: 'Roasted Iranian Pistachios (Pista)', name_ur: 'بھنے ہوئے ایرانی پستے', name_ar: 'فستق إيراني محمص', cat_ur: 'میوہ جات', cat_ar: 'مكسرات' },
  'kaju': { name_en: 'Luxury King Cashews (Kaju)', name_ur: 'شاہی کاجو', name_ar: 'كاجو ملكي فاخر', cat_ur: 'میوہ جات', cat_ar: 'مكسرات' },
  'badam': { name_en: 'Golden Mountain Almonds (Badam)', name_ur: 'سنہری পাহاڑی بادام', name_ar: 'لوز اللوز الذهبي', cat_ur: 'میوہ جات', cat_ar: 'مكسرات' },
  'akhroot': { name_en: 'Chilean Walnuts (Akhroot Halves)', name_ur: 'چلی کے اخروٹ', name_ar: 'الجوز التشيلي', cat_ur: 'میوہ جات', cat_ar: 'مكسرات' },
  'deal-1': { name_en: 'The Classics (Walnut & Pista Duo)', name_ur: 'دی کلاسک (اخروٹ اور پستہ)', name_ar: 'الكلاسيكيات (الجوز والفستق)', cat_ur: 'تحائف', cat_ar: 'هدايا' },
  'deal-2': { name_en: 'Work-Day Fuel (Almonds & Cashews)', name_ur: 'روزمرہ توانائی (بادام اور کاجو)', name_ar: 'وقود العمل (لوز وكاجو)', cat_ur: 'تحائف', cat_ar: 'هدايا' },
  'khubani': { name_en: 'Sun-Dried Apricots (Khubani)', name_ur: 'خشک خوبانی', name_ar: 'مشمش مجفف', cat_ur: 'میوہ جات', cat_ar: 'مكسرات' },
  'alubukhara': { name_en: 'Gourmet Dried Plums (Alubukhara)', name_ur: 'گورمیٹ خشک آلو بخارا', name_ar: 'برقوق مجفف طبيعي', cat_ur: 'میوہ جات', cat_ar: 'مكسرات' },
  'kishmish': { name_en: 'Emerald Green Raisins (Kishmish)', name_ur: 'سنہری سبز کشمش', name_ar: 'زبيب أخضر زمردي', cat_ur: 'میوہ جات', cat_ar: 'مكسرات' },
  'khajoor': { name_en: 'Premium Dark Dates (Kali Khajoor)', name_ur: 'پریمیم کالی کھجور', name_ar: 'تمور سوداء فاخرة', cat_ur: 'میوہ جات', cat_ar: 'مكسرات' },
  'pumpkin_seeds': { name_en: 'Raw Pumpkin Seeds (Pepitas)', name_ur: 'کچے کدو کے بیج', name_ar: 'بذور اليقطين النيئة', cat_ur: 'بیج', cat_ar: 'بذور' },
  'chia_seeds': { name_en: 'Organic Chia Seeds', name_ur: 'نامیاتی چیا کے بیج', name_ar: 'بذور الشيا العضوية', cat_ur: 'بیج', cat_ar: 'بذور' },
  'nimko': { name_en: 'Artisanal Lahori Nimko', name_ur: 'لاہوری نمکو', name_ar: 'نمكو لاهوري', cat_ur: 'سنیکس', cat_ar: 'وجبات خفيفة' },
  'chanay': { name_en: 'Crunchy Roasted Chanay (Chickpeas)', name_ur: 'بھنے ہوئے چنے', name_ar: 'حمص محمص مقرمش', cat_ur: 'سنیکس', cat_ar: 'وجبات خفيفة' },
  'oil-almond': { name_en: 'Sweet Almond Oil', name_ur: 'روغن بادام', name_ar: 'زيت اللوز الحلو', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-blackseed': { name_en: 'Black Seed Oil', name_ur: 'کلونجی کا تیل', name_ar: 'زيت الحبة السوداء', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-coconut': { name_en: 'Pure Coconut Oil', name_ur: 'خالص ناریل کا تیل', name_ar: 'زيت جوز الهند النقي', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-castor': { name_en: 'Castor Oil', name_ur: 'ارنڈ کا تیل', name_ar: 'زيت الخروع', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-apricot': { name_en: 'Apricot Kernel Oil', name_ur: 'خوبانی کے بیج کا تیل', name_ar: 'زيت المشمش', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-sesame': { name_en: 'Sesame Oil', name_ur: 'تلوں کا تیل', name_ar: 'زيت السمسم', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-flaxseed': { name_en: 'Flax Seed Oil', name_ur: 'السی کا تیل', name_ar: 'زيت بذور الكتان', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-walnut': { name_en: 'Walnut Oil', name_ur: 'اخروٹ کا تیل', name_ar: 'زيت الجوز', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-olive': { name_en: 'Extra Virgin Olive Oil', name_ur: 'ایکسٹرا ورجن زیتون کا تیل', name_ar: 'زيت زيتون بكر ممتاز', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-onionseed': { name_en: 'Pure Onion Seed Oil', name_ur: 'خالص پیاز کے بیج کا تیل', name_ar: 'زيت بذور البصل النقي', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-mustard': { name_en: 'Cold-Pressed Mustard Oil', name_ur: 'سرسوں کا تیل', name_ar: 'زيت الخردل', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-hairblend': { name_en: 'Special Blended Hair Oil', name_ur: 'خاص بالوں کا تیل', name_ar: 'زيت الشعر المميز', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'oil-hairgrowth': { name_en: 'Organic Hair Growth Oil', name_ur: 'نامیاتی بال بڑھانے کا تیل', name_ar: 'زيت نمو الشعر العضوي', cat_ur: 'روغن', cat_ar: 'زيوت' },
  'org-ghee': { name_en: 'Pure Desi Ghee', name_ur: 'خالص دیسی گھی', name_ar: 'سمن بلدي نقي', cat_ur: 'ضروریات', cat_ar: 'أساسيات' },
  'org-honey': { name_en: 'Wild Organic Honey', name_ur: 'خالص قدرتی شہد', name_ar: 'عسل بري عضوي', cat_ur: 'ضروریات', cat_ar: 'أساسيات' },
  'org-panjeeri': { name_en: 'Traditional Panjeeri', name_ur: 'روایتی پنجیری', name_ar: 'بنجيري تقليدية', cat_ur: 'ضروریات', cat_ar: 'أساسيات' },
  'org-saffron': { name_en: 'Premium Saffron / Zafran', name_ur: 'پریمیم زعفران', name_ar: 'زعفران فاخر', cat_ur: 'ضروریات', cat_ar: 'أساسيات' },
  'org-shakkar': { name_en: 'Desi Shakkar', name_ur: 'دیسی شکر', name_ar: 'سكر الخام', cat_ur: 'ضروریات', cat_ar: 'أساسيات' }
};

const props = ['name', 'category', 'health', 'tag', 'desc', 'tasteProfile', 'origin', 'harvest', 'storageTips', 'packagingDetails', 'allergenWarning', 'recipe', 'contents'];

let currentId = null;

for (let line of lines) {
    let idMatch = line.match(/^(\s*)id:\s*['"]([^'"]+)['"]/);
    if (idMatch) {
       currentId = idMatch[2];
    }
    
    let matchedProp = false;
    for (const p of props) {
        let r = new RegExp(`^(\\s*)${p}:\\s*(['"\`])(.*)\\2(,?)\\s*$`);
        let m = line.match(r);
        if (m) {
            matchedProp = true;
            let indent = m[1];
            let q = m[2];
            let val = m[3];
            let comma = m[4];
            
            if (p === 'name') {
                 if (dict[currentId]) {
                     outputLines.push(`${indent}name_en: ${q}${dict[currentId].name_en.replace(/'/g,"\\'")}${q},`);
                     outputLines.push(`${indent}name_ur: ${q}${dict[currentId].name_ur.replace(/'/g,"\\'")}${q},`);
                     outputLines.push(`${indent}name_ar: ${q}${dict[currentId].name_ar.replace(/'/g,"\\'")}${q}${comma}`);
                 } else {
                     outputLines.push(`${indent}name_en: ${q}${val}${q},`);
                     outputLines.push(`${indent}name_ur: ${q}${val}${q},`);
                     outputLines.push(`${indent}name_ar: ${q}${val}${q}${comma}`);
                 }
            } else if (p === 'category') {
                 if (dict[currentId] && dict[currentId].cat_ar) {
                     outputLines.push(`${indent}category: ${q}${val}${q},`);
                     outputLines.push(`${indent}category_en: ${q}${val}${q},`);
                     outputLines.push(`${indent}category_ur: ${q}${dict[currentId].cat_ur.replace(/'/g,"\\'")}${q},`);
                     outputLines.push(`${indent}category_ar: ${q}${dict[currentId].cat_ar.replace(/'/g,"\\'")}${q}${comma}`);
                 } else {
                     outputLines.push(`${indent}category: ${q}${val}${q},`);
                     outputLines.push(`${indent}category_en: ${q}${val}${q},`);
                     outputLines.push(`${indent}category_ur: ${q}${val}${q},`);
                     outputLines.push(`${indent}category_ar: ${q}${val}${q}${comma}`);
                 }
            } else {
                 outputLines.push(`${indent}${p}_en: ${q}${val}${q},`);
                 outputLines.push(`${indent}${p}_ur: ${q}${val}${q},`);
                 outputLines.push(`${indent}${p}_ar: ${q}${val}${q}${comma}`);
            }
            break;
        }
    }
    if (!matchedProp) {
        outputLines.push(line);
    }
}
fs.writeFileSync(path.resolve('src/data/products.ts'), outputLines.join('\n'), 'utf8');
console.log("Fixed safely mapping lines explicitly");
