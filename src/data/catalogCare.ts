import type { Product } from '../types';
import type { CareEntry, LocalizedCare, StorageKind } from './care/types';
import { herbCare } from './care/herbs';
import { dryCare } from './care/dry';
import { seedCare } from './care/seeds';
import { oilCare } from './care/oils';
import { bundleCare } from './care/bundles';

export const CATALOG_CARE: Record<string, CareEntry> = { ...herbCare, ...dryCare, ...seedCare, ...oilCare, ...bundleCare };

const facility: LocalizedCare = [
  'Packed in a facility that also handles tree nuts, peanuts and seeds.',
  'ایسی جگہ پیک کیا گیا ہے جہاں درختوں کے میوے، مونگ پھلی اور بیج بھی استعمال ہوتے ہیں۔',
  'معبأ في منشأة تتعامل أيضًا مع المكسرات والفول السوداني والبذور.',
];

const storage: Record<StorageKind, LocalizedCare> = {
  wholeSpice: ['Keep whole spices airtight, cool and dark, away from the cooker and steam. A 6–12 month pantry rotation helps retain aroma; use the printed best-before date if earlier.', 'ثابت مصالحے بند ڈبے میں، ٹھنڈی اور تاریک جگہ پر چولہے اور بھاپ سے دور رکھیں۔ خوشبو کے لیے 6–12 ماہ میں استعمال کریں؛ پیک پر پہلے کی تاریخ ہو تو اسے ترجیح دیں۔', 'احفظ التوابل الكاملة محكمة الإغلاق في مكان بارد ومظلم بعيدًا عن الموقد والبخار. استخدمها خلال 6–12 شهرًا للحفاظ على الرائحة أو قبل التاريخ المطبوع إن كان أقرب.'],
  groundSpice: ['Close ground seasoning immediately after measuring with a dry spoon. Keep it cool, dry and dark and aim to use within 3–6 months for aroma, subject to the earlier printed date.', 'پسا مصالحہ خشک چمچ سے نکال کر فوراً بند کریں۔ ٹھنڈی، خشک اور تاریک جگہ رکھیں اور خوشبو کے لیے 3–6 ماہ میں، یا پیک پر پہلے کی تاریخ تک استعمال کریں۔', 'أغلق التوابل المطحونة بعد أخذها بملعقة جافة. احفظها باردة وجافة ومظلمة واستخدمها خلال 3–6 أشهر للرائحة أو قبل التاريخ المطبوع إن كان أقرب.'],
  leaves: ['Protect dried leaves or petals from light and moisture in a tightly closed container. Plan to use within 3–6 months for their best aroma; discard any damp or mouldy contents and respect the printed date.', 'خشک پتیاں بند ڈبے میں روشنی اور نمی سے دور رکھیں۔ بہتر خوشبو کے لیے 3–6 ماہ میں استعمال کریں؛ نمی یا پھپھوندی ہو تو ضائع کریں اور پیک کی تاریخ دیکھیں۔', 'احفظ الأوراق أو البتلات المجففة في وعاء محكم بعيدًا عن الضوء والرطوبة. استخدمها خلال 3–6 أشهر للرائحة الأفضل وتخلص منها عند الرطوبة أو العفن مع مراعاة التاريخ المطبوع.'],
  gum: ['Keep dry gum in an airtight jar away from humidity and use within a 6-month pantry rotation, or the earlier printed date. Once hydrated, refrigerate promptly and prepare fresh portions rather than storing at room temperature.', 'خشک گوند بند جار میں نمی سے دور رکھیں اور 6 ماہ میں، یا پیک پر پہلے کی تاریخ تک استعمال کریں۔ بھگونے کے بعد فوراً فریج میں رکھیں اور کمرے کے درجہ حرارت پر ذخیرہ نہ کریں۔', 'احفظ الصمغ الجاف في مرطبان محكم بعيدًا عن الرطوبة واستخدمه خلال 6 أشهر أو قبل التاريخ المطبوع إن كان أقرب. بعد نقعه برّده سريعًا وحضّر حصصًا طازجة بدل تخزينه في حرارة الغرفة.'],
  fruit: ['Store dried fruit airtight, cool, dry and dark. Typical dry-storage quality ranges are 4–12 months depending on heat and moisture; refrigerate after opening and aim to finish within 1 month, or the earlier printed date. Discard mouldy fruit.', 'خشک پھل بند ڈبے میں ٹھنڈی، خشک اور تاریک جگہ رکھیں۔ گرمی اور نمی کے لحاظ سے عام خشک ذخیرے کی مدت 4–12 ماہ ہے؛ کھولنے کے بعد فریج میں رکھ کر 1 ماہ میں، یا پہلے درج تاریخ تک استعمال کریں۔ پھپھوندی والا پھل ضائع کریں۔', 'احفظ الفاكهة المجففة محكمة الإغلاق في مكان بارد وجاف ومظلم. تتراوح جودة التخزين الجاف عادة بين 4–12 شهرًا حسب الحرارة والرطوبة؛ برّدها بعد الفتح واستهلكها خلال شهر أو قبل التاريخ الأقرب. تخلص من الفاكهة المتعفنة.'],
  nuts: ['Keep opened nuts airtight and away from heat; use within 1 month in a cool pantry. Refrigeration can retain quality for about 4–6 months, subject to the earlier printed date. Discard nuts with a rancid smell or visible mould.', 'کھلے میوے بند ڈبے میں گرمی سے دور رکھیں؛ ٹھنڈی الماری میں 1 ماہ میں استعمال کریں۔ فریج میں معیار تقریباً 4–6 ماہ رہ سکتا ہے، مگر پیک کی پہلے والی تاریخ مقدم ہے۔ باسی بو یا پھپھوندی ہو تو ضائع کریں۔', 'احفظ المكسرات المفتوحة محكمة الإغلاق بعيدًا عن الحرارة واستهلكها خلال شهر في مكان بارد. قد يحافظ التبريد على الجودة نحو 4–6 أشهر مع أولوية التاريخ الأقرب. تخلص منها عند رائحة التزنخ أو العفن.'],
  seeds: ['Keep whole seeds airtight and cool; refrigerate after opening in hot weather to protect their natural oils. Plan a 3–6 month quality rotation and use the earlier printed date; discard rancid or damp seeds.', 'ثابت بیج بند ڈبے میں ٹھنڈے رکھیں؛ گرم موسم میں کھولنے کے بعد فریج میں رکھیں تاکہ قدرتی تیل محفوظ رہے۔ معیار کے لیے 3–6 ماہ میں یا پہلے درج تاریخ تک استعمال کریں؛ باسی یا نم بیج ضائع کریں۔', 'احفظ البذور الكاملة محكمة الإغلاق وباردة وبرّدها بعد الفتح في الطقس الحار لحماية زيوتها. استخدمها خلال 3–6 أشهر للجودة أو قبل التاريخ الأقرب وتخلص من البذور المتزنخة أو الرطبة.'],
  groundSeeds: ['Keep whole flax seeds airtight and cool. Grind small batches, refrigerate the ground seeds and aim to use within 1 month; whole seeds can follow a 3–6 month quality rotation, subject to the printed date.', 'ثابت السی بند ڈبے میں ٹھنڈی رکھیں۔ تھوڑی مقدار پیسیں، پسی السی فریج میں رکھ کر 1 ماہ میں استعمال کریں؛ ثابت بیج معیار کے لیے 3–6 ماہ یا درج تاریخ تک رکھے جا سکتے ہیں۔', 'احفظ بذور الكتان الكاملة محكمة الإغلاق وباردة. اطحن دفعات صغيرة وبرّد المطحون واستهلكه خلال شهر؛ استخدم البذور الكاملة خلال 3–6 أشهر للجودة مع مراعاة التاريخ المطبوع.'],
  snacks: ['Reseal promptly to protect crispness and keep away from heat and humidity. Aim to enjoy opened roasted snacks within 1 month, or the earlier printed date; do not mix a fresh pack with an old, damp batch.', 'کُرکُرا پن برقرار رکھنے کے لیے فوراً بند کریں اور گرمی و نمی سے دور رکھیں۔ کھلے بھنے اسنیکس 1 ماہ میں یا پہلے درج تاریخ تک استعمال کریں؛ نئی پیکنگ کو پرانی نم مقدار سے نہ ملائیں۔', 'أعد الإغلاق سريعًا للحفاظ على القرمشة وابتعد عن الحرارة والرطوبة. استمتع بالوجبات المحمصة المفتوحة خلال شهر أو قبل التاريخ الأقرب ولا تخلط عبوة جديدة بدفعة قديمة رطبة.'],
  oil: ['Keep the bottle tightly capped, upright and away from light or cooking heat. For best flavour plan to finish opened oil within 3 months, subject to its earlier printed date; discard oil that smells rancid.', 'بوتل مضبوطی سے بند، سیدھی اور روشنی و چولہے کی گرمی سے دور رکھیں۔ بہتر ذائقے کے لیے کھلا تیل 3 ماہ میں یا پہلے درج تاریخ تک استعمال کریں؛ باسی بو ہو تو ضائع کریں۔', 'احفظ الزجاجة مغلقة بإحكام وقائمة بعيدًا عن الضوء وحرارة الطهي. لأفضل نكهة استهلك الزيت المفتوح خلال 3 أشهر أو قبل التاريخ الأقرب وتخلص منه عند التزنخ.'],
  chilledOil: ['Refrigerate this delicate seed or nut oil after opening and close the cap after each pour. Aim to use within 1–3 months for flavour, or its earlier printed date; natural cloudiness in the cold is not a reason to heat the bottle.', 'اس نازک بیج یا میوے کے تیل کو کھولنے کے بعد فریج میں رکھیں اور ہر بار ڈھکن بند کریں۔ ذائقے کے لیے 1–3 ماہ میں یا پہلے درج تاریخ تک استعمال کریں؛ سردی میں قدرتی دھندلا پن ہو تو بوتل گرم نہ کریں۔', 'برّد هذا الزيت الرقيق من البذور أو المكسرات بعد الفتح وأغلق الغطاء بعد كل صب. استهلكه خلال 1–3 أشهر للنكهة أو قبل التاريخ الأقرب؛ العكارة الطبيعية في البرد لا تستدعي تسخين الزجاجة.'],
  cosmetic: ['Keep this external-care oil tightly capped away from heat and direct sunlight. Note the opening date and plan a 3–6 month quality rotation, always using the bottle’s earlier expiry or period-after-opening limit. Keep water out of the bottle.', 'بیرونی استعمال کے اس تیل کو بند بوتل میں گرمی اور دھوپ سے دور رکھیں۔ کھولنے کی تاریخ لکھیں اور معیار کے لیے 3–6 ماہ کی مدت رکھیں؛ بوتل کی پہلے والی میعاد یا کھولنے کے بعد کی حد مقدم ہے۔ بوتل میں پانی نہ جانے دیں۔', 'احفظ زيت العناية الخارجية مغلقًا بعيدًا عن الحرارة والشمس. دوّن تاريخ الفتح وخطط لاستخدامه خلال 3–6 أشهر للجودة مع أولوية الصلاحية أو مدة الاستخدام بعد الفتح على الزجاجة. امنع دخول الماء.'],
  ghee: ['Use a clean, dry spoon and close the jar immediately. Store ghee cool and dark; refrigerate in hot weather and aim to finish within 3 months of opening or the earlier printed date.', 'صاف خشک چمچ استعمال کریں اور جار فوراً بند کریں۔ گھی ٹھنڈی تاریک جگہ رکھیں؛ گرم موسم میں فریج میں رکھ کر کھولنے کے 3 ماہ میں یا پہلے درج تاریخ تک استعمال کریں۔', 'استخدم ملعقة نظيفة وجافة وأغلق المرطبان فورًا. احفظ السمن باردًا ومظلمًا وبرّده في الطقس الحار واستهلكه خلال 3 أشهر من الفتح أو قبل التاريخ الأقرب.'],
  honey: ['Keep honey tightly closed in a dry cupboard and use a dry spoon. A 12-month quality rotation is practical, subject to the printed date; natural crystallisation is normal and the closed jar may be warmed gently in lukewarm water.', 'شہد بند جار میں خشک الماری میں رکھیں اور خشک چمچ استعمال کریں۔ معیار کے لیے 12 ماہ کی مدت مناسب ہے، مگر درج تاریخ مقدم ہے؛ قدرتی دانے بننا معمول ہے اور بند جار کو نیم گرم پانی میں آہستہ نرم کیا جا سکتا ہے۔', 'احفظ العسل مغلقًا في خزانة جافة واستخدم ملعقة جافة. دورة استخدام خلال 12 شهرًا عملية للجودة مع مراعاة التاريخ المطبوع؛ التبلور طبيعي ويمكن تليين المرطبان المغلق في ماء فاتر.'],
  panjeeri: ['Keep panjeeri airtight and refrigerate after opening, particularly in warm weather. Use a dry spoon and aim to finish within 1 month or the earlier printed date to protect the ground nuts and fat from rancidity.', 'پنجیری بند ڈبے میں رکھیں اور خصوصاً گرم موسم میں کھولنے کے بعد فریج میں رکھیں۔ خشک چمچ استعمال کر کے 1 ماہ میں یا پہلے درج تاریخ تک ختم کریں تاکہ پسے میوے اور گھی باسی نہ ہوں۔', 'احفظ البنجيري محكم الإغلاق وبرّده بعد الفتح خصوصًا في الطقس الدافئ. استخدم ملعقة جافة واستهلكه خلال شهر أو قبل التاريخ الأقرب لحماية المكسرات المطحونة والدهن من التزنخ.'],
  sugar: ['Store shakkar in an airtight, moisture-proof jar away from strong smells. A 6–12 month pantry rotation preserves quality, subject to the earlier printed date; use a dry spoon to avoid sticky clumps.', 'شکر بند، نمی سے محفوظ جار میں تیز بو سے دور رکھیں۔ معیار کے لیے 6–12 ماہ میں یا پہلے درج تاریخ تک استعمال کریں؛ خشک چمچ سے چپچپی گٹھلیاں بننے سے بچائیں۔', 'احفظ الشكر في مرطبان محكم ومقاوم للرطوبة بعيدًا عن الروائح القوية. استخدمه خلال 6–12 شهرًا للجودة أو قبل التاريخ الأقرب وبملعقة جافة لمنع التكتل اللزج.'],
  bundle: ['Keep each component in its own sealed pack, cool and dry; follow the shortest printed date in the box. Refrigerate opened nuts in hot weather and finish opened nut or snack packs within 1 month. Store any oil according to its bottle instructions.', 'ہر جزو اپنی بند پیکنگ میں ٹھنڈا اور خشک رکھیں؛ ڈبے میں سب سے پہلے آنے والی میعاد مقدم ہے۔ گرم موسم میں کھلے میوے فریج میں رکھیں اور میوے یا اسنیکس کی کھلی پیکنگ 1 ماہ میں ختم کریں۔ تیل اس کی بوتل کی ہدایت کے مطابق رکھیں۔', 'احفظ كل مكون في عبوته المغلقة باردًا وجافًا واتبع أقرب تاريخ صلاحية في الصندوق. برّد المكسرات المفتوحة في الحر واستهلك عبوات المكسرات أو الوجبات المفتوحة خلال شهر. احفظ أي زيت وفق تعليمات زجاجته.'],
};

export function withProductCare(product: Product): Product {
  const entry = CATALOG_CARE[product.id];
  if (!entry) return product;
  const portions = Object.keys(product.prices).join(' · ');
  const names = [product.name_en, product.name_ur, product.name_ar];
  const origins = [product.origin_en, product.origin_ur, product.origin_ar];
  const unknown = /packed in pakistan/i.test(product.origin_en || '');
  const source: LocalizedCare = unknown ? [
    `${names[0]} is packed in Pakistan. The growing region and batch grade are not confirmed here; ask our team for the current source before ordering.`,
    `${names[1]} پاکستان میں پیک کیا جاتا ہے۔ اگانے کے علاقے اور موجودہ کھیپ کے درجے کی تصدیق یہاں موجود نہیں؛ آرڈر سے پہلے ہماری ٹیم سے معلوم کریں۔`,
    `${names[2]} معبأ في باكستان. منطقة الزراعة ودرجة الدفعة غير مؤكدتين هنا؛ اسأل فريقنا عن المصدر الحالي قبل الطلب.`,
  ] : [
    `${names[0]} — listed selection: ${origins[0]}. Ask our team to confirm the current batch’s exact source and grade; individual farm traceability is not stated.`,
    `${names[1]} — درج انتخاب: ${origins[1]}۔ موجودہ کھیپ کے درست ماخذ اور درجے کی تصدیق ہماری ٹیم سے کریں؛ کسی خاص فارم کا سراغ درج نہیں۔`,
    `${names[2]} — الاختيار المدرج: ${origins[2]}. اسأل فريقنا لتأكيد مصدر الدفعة ودرجتها؛ لا تُذكر مزرعة بعينها.`,
  ];
  const packaging: LocalizedCare = product.quoteOnly ? [
    'Gift presentation, quantities and individual pack sizes are agreed with your corporate quote before packing.',
    'کارپوریٹ قیمت کی منظوری سے پہلے تحفے کی پیکنگ، تعداد اور ہر پیک کا وزن طے کیا جاتا ہے۔',
    'يُتفق على تغليف الهدايا والكميات وأحجام العبوات الفردية مع عرض الشركات قبل التعبئة.',
  ] : product.isBundle ? [
    `Fixed ${portions} selection with individually packed components. Keep each freshness seal closed until use; confirm final contents for made-to-order hampers before dispatch.`,
    `${portions} کا مقررہ انتخاب، اجزاء الگ پیکنگ میں۔ استعمال تک تازگی کی سیل بند رکھیں؛ حسبِ آرڈر ہیمپر کے آخری اجزاء روانگی سے پہلے تصدیق کریں۔`,
    `اختيار ثابت ${portions} بمكونات معبأة منفردة. أبقِ أختام الطزاجة مغلقة حتى الاستخدام وأكد محتويات السلال المعدة حسب الطلب قبل الإرسال.`,
  ] : product.category === 'oils' ? [
    `Sealed bottle in leak-resistant protective packing. Available net volumes: ${portions}; keep upright and close the cap firmly after use.`,
    `سیل بند بوتل، رساؤ سے محفوظ حفاظتی پیکنگ میں۔ دستیاب خالص حجم: ${portions}؛ سیدھی رکھیں اور استعمال کے بعد ڈھکن مضبوط بند کریں۔`,
    `زجاجة مختومة ضمن تغليف واقٍ مقاوم للتسرب. الأحجام الصافية المتاحة: ${portions}؛ احفظها قائمة وأغلق الغطاء بإحكام بعد الاستخدام.`,
  ] : [
    `Food-grade pouch or jar, sealed for dispatch. Available net portions: ${portions}${product.allowCustomWeight ? '; custom weighed portions are also available' : ''}. Reseal the pouch or transfer to an airtight container after opening.`,
    `خوراک کے لیے موزوں پاؤچ یا جار، روانگی کے لیے سیل بند۔ دستیاب خالص وزن: ${portions}${product.allowCustomWeight ? '؛ اپنی پسند کا وزن بھی دستیاب ہے' : ''}۔ کھولنے کے بعد دوبارہ بند کریں یا بند ڈبے میں منتقل کریں۔`,
    `كيس أو مرطبان مناسب للأغذية ومختوم للإرسال. الحصص الصافية المتاحة: ${portions}${product.allowCustomWeight ? '؛ تتوفر حصص بوزن مخصص أيضًا' : ''}. أعد الإغلاق أو انقل المحتوى إلى وعاء محكم بعد الفتح.`,
  ];
  const allergy = entry.allergen || [
    `Contains ${names[0]}; check the ingredient declaration for any personal spice or plant sensitivity.`,
    `${names[1]} شامل ہے؛ کسی مصالحے یا پودے سے حساسیت ہو تو اجزاء کا اعلان دیکھیں۔`,
    `يحتوي على ${names[2]}؛ تحقق من المكونات عند الحساسية لأي توابل أو نباتات.`,
  ];
  const result = { ...product };
  for (const [index, language] of ['en', 'ur', 'ar'].entries()) {
    Object.assign(result, {
      [`recipe_${language}`]: entry.use[index],
      [`storageTips_${language}`]: storage[entry.storage][index],
      [`sourcingDetails_${language}`]: source[index],
      [`packagingDetails_${language}`]: packaging[index],
      [`allergenWarning_${language}`]: `${allergy[index]} ${facility[index]}`,
    });
  }
  return result;
}
