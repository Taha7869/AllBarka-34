import { PRODUCTS } from '../data/products';
import { STORE_CONFIG } from '../config/store';
import { CONTACT_CONFIG } from '../config/contacts';
import { getLocalized } from '../utils/localize';
import { normalizeSearch, searchCatalog, startingPrice } from './catalogDiscovery';
export type ConciergeLanguage = 'en' | 'ur' | 'ar';
const copy = {
  en: { intro: 'Welcome to AllBarka. Ask about our products, delivery or gift selections.', location: 'AllBarka serves DHA Phase 6 and Gulberg III, Lahore. Contact our team to confirm the location before visiting.', delivery: 'Lahore standard delivery: Rs. {standard}, free from Rs. {free} after discounts. Outside Lahore: Rs.250/kg of actual order weight, minimum Rs.250, with no free shipping. Lahore priority dispatch: Rs. {express}. Contact our team to confirm timing for your address.', gifts: 'Explore these gift selections at current catalogue prices:', price: 'Available portions:', support: 'Our team can help on WhatsApp:', health: 'I can help with product information. For advice about a personal health condition or allergy, please speak with a qualified clinician.' },
  ur: { intro: 'البرکہ میں خوش آمدید۔ مصنوعات، ترسیل یا تحائف کے بارے میں پوچھیں۔', location: 'البرکہ ڈی ایچ اے فیز 6 اور گلبرگ III، لاہور میں خدمات فراہم کرتا ہے۔ آنے سے پہلے درست مقام کی تصدیق کے لیے ہماری ٹیم سے رابطہ کریں۔', delivery: 'لاہور میں عام ترسیل Rs. {standard}؛ رعایت کے بعد Rs. {free} سے مفت۔ لاہور سے باہر اصل وزن پر ۲۵۰ روپے فی کلو، کم از کم ۲۵۰ روپے؛ مفت ترسیل نہیں۔ لاہور میں ترجیحی ڈسپیچ Rs. {express}۔ اپنے پتے کے وقت کی تصدیق ہماری ٹیم سے کریں۔', gifts: 'موجودہ قیمتوں پر یہ تحائف دیکھیں:', price: 'دستیاب مقداریں:', support: 'واٹس ایپ پر ہماری ٹیم سے رابطہ کریں:', health: 'میں مصنوعات کی معلومات میں مدد کر سکتا ہوں۔ ذاتی بیماری یا الرجی کے مشورے کے لیے مستند معالج سے رابطہ کریں۔' },
  ar: { intro: 'أهلاً بك في البركة. اسأل عن المنتجات أو التوصيل أو اختيارات الهدايا.', location: 'تخدم البركة منطقة DHA Phase 6 وGulberg III في لاهور. تواصل مع فريقنا لتأكيد الموقع قبل الزيارة.', delivery: 'التوصيل العادي في لاهور Rs. {standard}، ومجاني من Rs. {free} بعد الخصومات. خارج لاهور: 250 روبية لكل كغ حسب وزن الطلب الفعلي، بحد أدنى 250 روبية، دون شحن مجاني. إرسال بأولوية في لاهور Rs. {express}. تواصل معنا لتأكيد الموعد حسب عنوانك.', gifts: 'اكتشف هذه الهدايا بأسعار الكتالوج الحالية:', price: 'الأحجام المتوفرة:', support: 'يساعدك فريقنا عبر واتساب:', health: 'يمكنني المساعدة بمعلومات عن المنتجات. للحصول على مشورة بشأن حالة صحية شخصية أو حساسية، يرجى استشارة مختص طبي.' },
};
export function conciergeFallback(userText: string, language: ConciergeLanguage = 'en') {
  const text = normalizeSearch(userText); const words = text.split(' ');
  const content = copy[language];
  let reply = content.intro;
  if (/diabetes|disease|cancer|allerg|treatment|شوگر|بیماری|علاج|الرجی|سکر|مرض|حساسی|علاج/.test(text)) reply = content.health;
  else if (/where|location|address|store location|پتہ|دکان کہاں|مقام|موقع|این یقع/.test(text)) reply = content.location;
  else if (/delivery|shipping|dispatch|ترسیل|ڈلیوری|توصیل|شحن/.test(text)) reply = content.delivery.replace('{standard}', String(STORE_CONFIG.shipping.standardRate)).replace('{free}', STORE_CONFIG.shipping.freeThreshold.toLocaleString('en-PK')).replace('{express}', String(STORE_CONFIG.shipping.expressRate));
  else if (/gift|wedding|hamper|تحف|تحائف|شادی|ہدایا|هدایا|زفاف/.test(text)) reply = content.gifts + '\n' + PRODUCTS.filter(product => product.category === 'gift-boxes').slice(0, 3).map(product => `${getLocalized(product, 'name', language)} — Rs. ${startingPrice(product).toLocaleString('en-PK')}`).join('\n');
  else {
    const direct = searchCatalog(PRODUCTS, text)[0];
    const nameTerms = words.filter(word => word.length >= 3 && searchCatalog(PRODUCTS, word).some(product => [product.name_en, product.name_ur, product.name_ar, product.id].some(name => normalizeSearch(name).includes(word))));
    const product = direct || (nameTerms.length ? searchCatalog(PRODUCTS, nameTerms.join(' '))[0] : undefined);
    if (product) reply = `${getLocalized(product, 'name', language)}\n${content.price}\n${Object.entries(product.prices).map(([portion, price]) => `${portion}: Rs. ${price.toLocaleString('en-PK')}`).join('\n')}`;
  }
  return { reply: reply + `\n\n${content.support} ${CONTACT_CONFIG.humanSupportWhatsApp.formatted}`, groundingSources: [] as Array<{ title: string; uri: string; type: 'map' }> };
}
