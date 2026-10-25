/** Only named regions are asserted. Packing location is not a claim of crop origin. */
const namedOrigins: Record<string, readonly [string, string, string]> = {
  'ceylon-cinnamon': ['Ceylon · Sri Lanka', 'سیلون · سری لنکا', 'سيلان · سريلانكا'],
  'kashmiri-walnut': ['Kashmir · Walnut Kernels', 'کشمیر · اخروٹ گری', 'كشمير · لب الجوز'],
  'ajwa-dates': ['Irani Muzafati · Packed in Pakistan', 'ایرانی مضافاتی · پاکستان میں پیک شدہ', 'مضافاتي إيراني · معبأ في باكستان'],
  'afghan-figs': ['Afghanistan · Dried Figs', 'افغانستان · خشک انجیر', 'أفغانستان · تين مجفف'],
  'aseel-dates': ['Khairpur · Aseel Dates', 'خیرپور · اصیل کھجور', 'خيربور · تمر أصيل'],
  // Amber / Panjgur is a date variety packed in Pakistan.
  'medjool-dates': ['Amber Variety · Packed in Pakistan', 'امبر ورائٹی · پاکستان میں پیک شدہ', 'صنف العنبر · معبأ في باكستان'],
};

export function additionOrigin(id: string, category: string) {
  const values = namedOrigins[id] || (category === 'bundles'
    ? ['Curated & Packed in Pakistan', 'پاکستان میں منتخب اور پیک شدہ', 'مختار ومعبأ في باكستان']
    : ['Hand-Packed in Pakistan', 'پاکستان میں ہاتھ سے پیک شدہ', 'معبأ يدويًا في باكستان']);
  return { origin_en: values[0], origin_ur: values[1], origin_ar: values[2] };
}
