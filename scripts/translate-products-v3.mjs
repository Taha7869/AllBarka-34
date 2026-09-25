import fs from 'fs';
import path from 'path';

let productsPath = path.resolve('src/data/products.ts');
let productsText = fs.readFileSync(productsPath, 'utf8');

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

const propsToLoc = ['name', 'category', 'health', 'tag', 'desc', 'tasteProfile', 'origin', 'harvest', 'storageTips', 'packagingDetails', 'allergenWarning', 'recipe', 'contents'];

let blocks = productsText.split('  {');
for (let i = 1; i < blocks.length; i++) {
  let block = blocks[i];
  let idMatch = block.match(/id:\s*['"]([^'"]+)['"]/);
  if (!idMatch) continue;
  let id = idMatch[1];
  let d = dict[id];
  if (!d) continue;

  propsToLoc.forEach(p => {
    // using regex matching standard `prop: 'something',` even with spaces inside the line. Safe because it's the exact property name on a fresh line.
    const rgx = new RegExp(`(\\n\\s*)${p}:\\s*(['"\`])([\\S\\s]*?)\\2(,?|)`, '');
    let m = block.match(rgx);
    if(m) {
      const indent = m[1];
      const val = String(m[3]).replace(/'/g, "\\'");
      if(p === 'name') {
         block = block.replace(rgx, `${indent}name_en: '${d.name_en}',${indent.replace('\n','\n')}name_ur: '${d.name_ur}',${indent.replace('\n','\n')}name_ar: '${d.name_ar}'$4`);
      } else if(p === 'category') {
         block = block.replace(rgx, `${indent}category: '${val}',${indent.replace('\n','\n')}category_en: '${val}',${indent.replace('\n','\n')}category_ur: '${d.cat_ur || ''}',${indent.replace('\n','\n')}category_ar: '${d.cat_ar || ''}'$4`);
      } else {
         block = block.replace(rgx, `${indent}${p}_en: '${val}',${indent.replace('\n','\n')}${p}_ur: '${val}',${indent.replace('\n','\n')}${p}_ar: '${val}'$4`);
      }
    }
  });
  blocks[i] = block;
}
fs.writeFileSync(productsPath, blocks.join('  {'), 'utf8');

function fixMissingGetLocalized(p) {
    let fp = path.resolve(p);
    if (!fs.existsSync(fp)) return;
    let t = fs.readFileSync(fp, 'utf8');
    let dirty = false;
    
    // Quick specific fixes for CartPage and CartDrawer CartItem usages
    if (fp.includes('CartPage.tsx') || fp.includes('CartDrawer.tsx') || fp.includes('CheckoutPage.tsx')) {
        let n1 = t.replace(/item\.name(?![_])/g, "getLocalized(item, 'name', language)");
        let n2 = n1.replace(/product\.name(?![_])/g, "getLocalized(product, 'name', language)");
        if (n1 !== t || n2 !== n1) { t = n2; dirty = true; }
    }

    if (t.includes('getLocalized') && !t.includes('import { getLocalized')) {
        t = `import { getLocalized } from '../utils/localize';\n` + t;
        dirty = true;
    }
    if (t.includes('useLanguage();') && t.includes('getLocalized') && !t.includes('language } = useLanguage()')) {
        // e.g. `const { t, isRtl } = useLanguage();` -> `const { t, isRtl, language } = useLanguage();`
        // or `const { t } = useLanguage();` -> `const { t, language } = useLanguage();`
        t = t.replace(/const\s*{\s*([^}]*)}\s*=\s*useLanguage\(\);/, "const { $1, language } = useLanguage();");
        dirty = true;
    }
    if (dirty) fs.writeFileSync(fp, t, 'utf8');
}

['src/components/CartDrawer.tsx', 'src/components/CategoryPLP.tsx', 'src/components/ProductDetailAccordion.tsx', 'src/pages/CheckoutPage.tsx', 'src/pages/CartPage.tsx', 'src/pages/JournalPage.tsx', 'src/layouts/RootLayout.tsx'].forEach(fixMissingGetLocalized);

console.log('Fixed natively');
