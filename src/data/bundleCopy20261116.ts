/**
 * Owner-approved copy upgrade for the older bundles (decision 16 Nov 2026).
 * Names now say what is inside, health-claim wording is gone, and the date
 * variety matches the linked componentIds (Ajwa, Medjool). Prices, stock and
 * ids are untouched. The same fields are applied to live Firestore by
 * scripts/apply-bundle-copy-20261116.ts (dry run first, owner approval to execute).
 */
export interface BundleCopy {
  name_en: string; name_ur: string; name_ar: string;
  desc_en: string; desc_ur: string; desc_ar: string;
  health_en: string; health_ur: string; health_ar: string;
  components?: string[];
  components_ur?: string[];
  components_ar?: string[];
  tasteProfile_en?: string;
  tasteProfile_ur?: string;
  tasteProfile_ar?: string;
  tag_en?: string; tag_ur?: string; tag_ar?: string;
  /** Names this bundle had before, kept out of search keywords. */
  previousNames: string[];
}

export const BUNDLE_COPY_20261116: Record<string, BundleCopy> = {
  'deal-1': {
    previousNames: ['The Classics (Walnut & Pista Duo)', 'کلاسک جوڑی (اخروٹ اور پستہ)', 'الثنائي الكلاسيكي (الجوز والفستق)'],
    name_en: 'Walnut & Pistachio Duo, 2 × 500 g',
    name_ur: 'اخروٹ اور پستہ جوڑی، 2 × 500 گرام',
    name_ar: 'ثنائي الجوز والفستق، 2 × 500 غرام',
    desc_en: 'Two 500 g packs of the pair families buy together most: light Chilean walnut halves and roasted, salted Iranian pistachios.\n\nWhat\'s inside: Chilean walnut halves (Akhroot), 500 g, for breakfast, baking and halwa. Roasted Iranian pistachios (Pista), 500 g, for tea-time bowls and kheer.\n\nWhy this set: one soft and buttery, one crisp and salted, packed separately and ready to serve or gift.',
    desc_ur: 'دو 500 گرام پیک، وہ جوڑی جو گھرانے سب سے زیادہ ساتھ خریدتے ہیں: ہلکے رنگ کے چلی کے اخروٹ کے آدھے ٹکڑے اور بھنے نمکین ایرانی پستے۔\n\nاندر کیا ہے: چلی کے اخروٹ، 500 گرام، ناشتے، بیکنگ اور حلوے کے لیے۔ بھنے ایرانی پستے، 500 گرام، چائے کے وقت اور کھیر کے لیے۔\n\nیہ سیٹ کیوں: ایک نرم اور مکھنی، دوسرا کرکرا اور نمکین؛ الگ الگ پیک، پیش کرنے یا تحفے کے لیے تیار۔',
    desc_ar: 'عبوتان بوزن 500 غرام للثنائي الذي تشتريه العائلات معًا أكثر من غيره: أنصاف جوز تشيلي فاتحة وفستق إيراني محمص ومملح.\n\nفي الداخل: جوز تشيلي، 500 غرام، للإفطار والخبز والحلوى. فستق إيراني محمص، 500 غرام، لأوقات الشاي والكير.\n\nلماذا هذه المجموعة: واحد طري زبدي وآخر مقرمش مملح، معبأان منفصلين وجاهزان للتقديم أو الإهداء.',
    health_en: '2 × 500 G • GIFT-READY', health_ur: '2 × 500 گرام • تحفے کے لیے تیار', health_ar: '2 × 500 غ • جاهز للإهداء',
  },
  'deal-2': {
    previousNames: ['Work-Day Fuel (Almonds & Cashews)', 'کام کے دن کی توانائی (بادام اور کاجو)', 'طاقة يوم العمل (اللوز والكاجو)', 'wellness', 'fuel'],
    tag_en: 'Everyday Duo', tag_ur: 'روزمرہ جوڑی', tag_ar: 'ثنائي يومي',
    name_en: 'Almond & Cashew Duo, 2 × 500 g',
    name_ur: 'بادام اور کاجو جوڑی، 2 × 500 گرام',
    name_ar: 'ثنائي اللوز والكاجو، 2 × 500 غرام',
    desc_en: 'Two 500 g packs of the everyday pair for desks, study tables and guests: golden mountain almonds and large king cashews.\n\nWhat\'s inside: Golden mountain almonds (Badam), 500 g, for snacking, soaking overnight and baking. King cashews (Kaju), 500 g, for snack bowls, korma and sweets.\n\nWhy this set: the two nuts most often refilled at home, in one order and packed separately so each keeps its crunch.',
    desc_ur: 'دو 500 گرام پیک، دفتر کی میز، پڑھائی اور مہمانوں کے لیے روزمرہ کی جوڑی: سنہری پہاڑی بادام اور بڑے شاہی کاجو۔\n\nاندر کیا ہے: سنہری پہاڑی بادام، 500 گرام، اسنیک، رات بھر بھگونے اور بیکنگ کے لیے۔ شاہی کاجو، 500 گرام، اسنیک، قورمہ اور مٹھائی کے لیے۔\n\nیہ سیٹ کیوں: گھر میں سب سے زیادہ دوبارہ منگوائے جانے والے دو میوے، ایک آرڈر میں، الگ الگ پیک تاکہ دونوں کرکرے رہیں۔',
    desc_ar: 'عبوتان بوزن 500 غرام للثنائي اليومي للمكتب والدراسة والضيوف: لوز جبلي ذهبي وكاجو ملكي كبير.\n\nفي الداخل: لوز جبلي ذهبي، 500 غرام، للتسلية والنقع ليلًا والخبز. كاجو ملكي، 500 غرام، لأطباق التسلية والقورمة والحلويات.\n\nلماذا هذه المجموعة: أكثر نوعين يُعاد شراؤهما في البيت، في طلب واحد ومعبأان منفصلين ليحتفظ كل منهما بقرمشته.',
    health_en: '2 × 500 G • EVERYDAY DUO', health_ur: '2 × 500 گرام • روزمرہ جوڑی', health_ar: '2 × 500 غ • ثنائي يومي',
  },
  'bundle-daily-grind': {
    previousNames: ['The Daily Grind', 'دی ڈیلی گرائنڈ — روزمرہ میوے', 'باقة المكسرات اليومية'],
    name_en: 'Daily Snack Trio: Almonds, Cashews & Raisins, 3 × 250 g',
    name_ur: 'روزانہ اسنیک تینوں: بادام، کاجو اور کشمش، 3 × 250 گرام',
    name_ar: 'ثلاثي التسلية اليومية: لوز وكاجو وزبيب، 3 × 250 غرام',
    desc_en: 'Three 250 g packs that make a simple daily snack mix: golden mountain almonds, king cashews and green raisins.\n\nWhat\'s inside: Almonds (Badam), 250 g, for crunch. Cashews (Kaju), 250 g, for a creamy bite. Green raisins (Kishmish), 250 g, for natural sweetness.\n\nWhy this set: mix a small handful of each for the office, school tiffin or tea time, or keep them apart for cooking.',
    desc_ur: 'تین 250 گرام پیک جن سے روزانہ کا سادہ اسنیک مکس بنتا ہے: سنہری پہاڑی بادام، شاہی کاجو اور سبز کشمش۔\n\nاندر کیا ہے: بادام، 250 گرام، کرکراہٹ کے لیے۔ کاجو، 250 گرام، نرم ذائقے کے لیے۔ سبز کشمش، 250 گرام، قدرتی مٹھاس کے لیے۔\n\nیہ سیٹ کیوں: دفتر، اسکول کے ٹفن یا چائے کے وقت کے لیے ہر ایک کی تھوڑی مقدار ملائیں، یا پکانے کے لیے الگ رکھیں۔',
    desc_ar: 'ثلاث عبوات بوزن 250 غرام تصنع خليط تسلية يوميًا بسيطًا: لوز جبلي ذهبي وكاجو ملكي وزبيب أخضر.\n\nفي الداخل: لوز، 250 غرام، للقرمشة. كاجو، 250 غرام، لقضمة كريمية. زبيب أخضر، 250 غرام، لحلاوة طبيعية.\n\nلماذا هذه المجموعة: اخلط حفنة صغيرة من كل نوع للمكتب أو علبة المدرسة أو وقت الشاي، أو احتفظ بها منفصلة للطبخ.',
    health_en: '3 × 250 G • SNACK MIX', health_ur: '3 × 250 گرام • اسنیک مکس', health_ar: '3 × 250 غ • خليط تسلية',
  },
  'bundle-brain-fuel': {
    previousNames: ['Brain Fuel Box', 'برین فیول باکس', 'صندوق برين فيول'],
    name_en: 'Walnut, Almond, Chia & Pumpkin Seed Box',
    name_ur: 'اخروٹ، بادام، چیا اور کدو کے بیج باکس',
    name_ar: 'صندوق الجوز واللوز والشيا وبذور اليقطين',
    desc_en: 'A breakfast box of two nuts and two seeds that go over oats, yoghurt and smoothies.\n\nWhat\'s inside: Chilean walnut halves (Akhroot). Golden mountain almonds (Badam). Chia seeds, soaked before eating. Raw pumpkin seeds (Pepitas).\n\nWhy this set: four toppings in separate pouches, so you can build a different bowl each morning.',
    desc_ur: 'ناشتے کا باکس: دو میوے اور دو بیج جو دلیے، دہی اور اسموتھی پر ڈالے جاتے ہیں۔\n\nاندر کیا ہے: چلی کے اخروٹ۔ سنہری پہاڑی بادام۔ چیا کے بیج، کھانے سے پہلے بھگوئیں۔ کچے کدو کے بیج۔\n\nیہ سیٹ کیوں: چار چیزیں الگ الگ پاؤچ میں، تاکہ ہر صبح نیا پیالہ بنا سکیں۔',
    desc_ar: 'صندوق إفطار من نوعين من المكسرات ونوعين من البذور للشوفان واللبن والعصائر.\n\nفي الداخل: أنصاف جوز تشيلي. لوز جبلي ذهبي. بذور الشيا، تُنقع قبل الأكل. بذور يقطين نيئة.\n\nلماذا هذه المجموعة: أربع إضافات في أكياس منفصلة لتحضير طبق مختلف كل صباح.',
    health_en: '4 SELECTIONS • BREAKFAST BOX', health_ur: '4 انتخاب • ناشتے کا باکس', health_ar: '4 اختيارات • صندوق إفطار',
  },
  'bundle-winter-warrior': {
    previousNames: ['Winter Warrior Pack', 'ونٹر وارئیر پیک', 'باقة وينتر ووريور'],
    name_en: 'Traditional Winter Pantry: Gond, Char Maghaz, Panjeeri & Chohara',
    name_ur: 'روایتی سردیوں کی پینٹری: گوند، چار مغز، پنجیری اور چھوہارا',
    name_ar: 'مؤونة الشتاء التقليدية: صمغ وأربع بذور وبنجيري وتمر مجفف',
    desc_en: 'The four things a Punjabi kitchen reaches for when the cold sets in, in one box.\n\nWhat\'s inside: Edible gond (acacia), fried for gond ladoo. Char maghaz mix, for ladoo and halwa. Traditional panjeeri, ready to eat with tea. Chohara, softened in milk on winter nights.\n\nWhy this set: everything for the season\'s family recipes in sealed pouches, for your own pantry or to send to parents.',
    desc_ur: 'سردی شروع ہوتے ہی پنجابی باورچی خانے کی چار چیزیں، ایک باکس میں۔\n\nاندر کیا ہے: خوردنی گوند، گوند کے لڈو کے لیے تل کر۔ چار مغز، لڈو اور حلوے کے لیے۔ روایتی پنجیری، چائے کے ساتھ تیار۔ چھوہارا، سردیوں کی راتوں میں دودھ میں نرم کر کے۔\n\nیہ سیٹ کیوں: موسم کی خاندانی ترکیبوں کا سامان بند پاؤچ میں، اپنی پینٹری کے لیے یا والدین کو بھیجنے کے لیے۔',
    desc_ar: 'الأشياء الأربعة التي يلجأ إليها المطبخ البنجابي مع بداية البرد، في صندوق واحد.\n\nفي الداخل: صمغ أكاسيا صالح للأكل، يُقلى لحلوى اللادو. خليط البذور الأربع للادو والحلوى. بنجيري تقليدي جاهز مع الشاي. تمر مجفف (شوهارا) يُليّن بالحليب في ليالي الشتاء.\n\nلماذا هذه المجموعة: كل ما تحتاجه وصفات العائلة الموسمية في أكياس محكمة، لمؤونتك أو لإرسالها إلى الوالدين.',
    health_en: '4 SELECTIONS • WINTER TRADITION', health_ur: '4 انتخاب • سردیوں کی روایت', health_ar: '4 اختيارات • تقليد شتوي',
  },
  'bundle-immunity-shield': {
    previousNames: ['Immunity Shield', 'امیونٹی شیلڈ بنڈل', 'باقة إميونيتي شيلد'],
    name_en: 'Kalonji Oil, Ajwa Dates & Flax Seed Box',
    name_ur: 'کلونجی تیل، عجوہ کھجور اور السی باکس',
    name_ar: 'صندوق زيت الحبة السوداء وتمر العجوة وبذور الكتان',
    desc_en: 'Three traditional pantry staples kept in many Pakistani homes, packed together.\n\nWhat\'s inside: Cold-pressed black seed (kalonji) oil. Ajwa dates from Madinah. Flax seeds (alsi), best ground fresh in small batches.\n\nWhy this set: a thoughtful gift for parents and elders who already keep these at home, in one box instead of three shopping trips.',
    desc_ur: 'تین روایتی چیزیں جو بہت سے پاکستانی گھروں میں رکھی جاتی ہیں، ایک ساتھ پیک۔\n\nاندر کیا ہے: کولڈ پریسڈ کلونجی کا تیل۔ مدینہ کی عجوہ کھجور۔ السی، تھوڑی تھوڑی تازہ پیس کر بہترین۔\n\nیہ سیٹ کیوں: والدین اور بزرگوں کے لیے سوچا سمجھا تحفہ جو یہ چیزیں پہلے سے گھر میں رکھتے ہیں، تین بار خریداری کے بجائے ایک باکس میں۔',
    desc_ar: 'ثلاثة أصناف تقليدية تحتفظ بها بيوت باكستانية كثيرة، معبأة معًا.\n\nفي الداخل: زيت الحبة السوداء المعصور على البارد. تمر العجوة من المدينة المنورة. بذور الكتان، الأفضل طحنها طازجة بكميات صغيرة.\n\nلماذا هذه المجموعة: هدية مدروسة للوالدين وكبار السن الذين يحتفظون بها أصلًا، في صندوق واحد بدل ثلاث رحلات تسوق.',
    health_en: '3 SELECTIONS • PANTRY TRIO', health_ur: '3 انتخاب • پینٹری تینوں', health_ar: '3 اختيارات • ثلاثي المؤونة',
    components: ['Black Seed (Kalonji) Oil', 'Ajwa Dates Madina (Khajoor)', 'Flax Seeds (Alsi)'],
    components_ur: ['کلونجی کا تیل', 'مدینہ کی عجوہ کھجور', 'السی'],
    components_ar: ['زيت الحبة السوداء', 'تمر العجوة المدينة', 'بذور الكتان'],
    tasteProfile_en: 'Soft, mildly sweet Ajwa dates with nutty flax seeds and the peppery note of cold-pressed kalonji oil.',
    tasteProfile_ur: 'نرم، ہلکی میٹھی عجوہ کھجور، گری دار ذائقے والی السی اور کولڈ پریسڈ کلونجی تیل کی ہلکی تیزی۔',
    tasteProfile_ar: 'تمر عجوة طري معتدل الحلاوة مع بذور كتان بنكهة جوزية ولمسة حارة من زيت الحبة السوداء المعصور على البارد.',
  },
  'bundle-sunrise-seeds': {
    previousNames: ['Sunrise Seeds', 'سن رائز سیڈز بنڈل', 'باقة بذور الصباح'],
    name_en: 'Morning Seed Set: Chia, Flax, Pumpkin & Sunflower',
    name_ur: 'صبح کے بیجوں کا سیٹ: چیا، السی، کدو اور سورج مکھی',
    name_ar: 'مجموعة بذور الصباح: شيا وكتان ويقطين ودوار الشمس',
    desc_en: 'Four seeds for breakfast bowls, smoothies and multigrain baking.\n\nWhat\'s inside: Chia seeds, soaked before eating. Flax seeds (alsi), ground fresh. Raw pumpkin seeds. Hulled sunflower seeds.\n\nWhy this set: sprinkle a spoonful of two or three over oats or yoghurt, or knead them into roti and bread dough.',
    desc_ur: 'ناشتے کے پیالوں، اسموتھی اور ملٹی گرین بیکنگ کے لیے چار بیج۔\n\nاندر کیا ہے: چیا کے بیج، کھانے سے پہلے بھگوئیں۔ السی، تازہ پیس کر۔ کچے کدو کے بیج۔ چھلے ہوئے سورج مکھی کے بیج۔\n\nیہ سیٹ کیوں: دو تین قسموں کا ایک چمچ دلیے یا دہی پر ڈالیں، یا روٹی اور ڈبل روٹی کے آٹے میں گوندھ لیں۔',
    desc_ar: 'أربع بذور لأطباق الإفطار والعصائر والخبز متعدد الحبوب.\n\nفي الداخل: بذور الشيا، تُنقع قبل الأكل. بذور الكتان، تُطحن طازجة. بذور يقطين نيئة. بذور دوار الشمس المقشرة.\n\nلماذا هذه المجموعة: رش ملعقة من نوعين أو ثلاثة على الشوفان أو اللبن، أو اعجنها في عجين الخبز.',
    health_en: '4 SEEDS • BREAKFAST', health_ur: '4 بیج • ناشتہ', health_ar: '4 بذور • إفطار',
  },
  'bundle-royal-feast': {
    previousNames: ['Royal Feast', 'شاہی ضیافت بنڈل', 'باقة الوليمة الملكية'],
    name_en: 'Royal Feast: Chilgoza, Medjool Dates, Afghan Figs & Pistachios',
    name_ur: 'شاہی ضیافت: چلغوزہ، میڈجول کھجور، افغانی انجیر اور پستہ',
    name_ar: 'الوليمة الملكية: صنوبر وتمر مجهول وتين أفغاني وفستق',
    desc_en: 'Our grandest sharing box for weddings, dawat and senior guests.\n\nWhat\'s inside: Chilgoza (pine nuts), the prized winter nut. Jumbo Medjool dates. Afghan dried figs (Anjeer). Roasted Iranian pistachios (Pista).\n\nWhy this set: four of the most admired dry fruits on one table, in luxury packaging with each item sealed separately.',
    desc_ur: 'شادی، دعوت اور معزز مہمانوں کے لیے ہمارا سب سے شاندار مشترکہ باکس۔\n\nاندر کیا ہے: چلغوزہ، سردیوں کا قیمتی میوہ۔ بڑی میڈجول کھجور۔ افغانی خشک انجیر۔ بھنے ایرانی پستے۔\n\nیہ سیٹ کیوں: سب سے زیادہ پسند کیے جانے والے چار خشک میوے ایک دسترخوان پر، شاندار پیکنگ میں ہر چیز الگ بند۔',
    desc_ar: 'أفخم صندوق مشاركة لدينا للأعراس والولائم وكبار الضيوف.\n\nفي الداخل: الصنوبر (چلغوزہ)، مكسرات الشتاء الثمينة. تمر مجهول كبير. تين أفغاني مجفف. فستق إيراني محمص.\n\nلماذا هذه المجموعة: أربعة من أكثر الفواكه المجففة تقديرًا على مائدة واحدة، بتغليف فاخر وكل صنف محكم الإغلاق.',
    health_en: '4 SELECTIONS • LUXURY GIFT', health_ur: '4 انتخاب • شاندار تحفہ', health_ar: '4 اختيارات • هدية فاخرة',
    components: ['Chilgoza (Pine Nuts)', 'Medjool Dates Jumbo', 'Afghan Dried Figs (Anjeer)', 'Roasted Iranian Pistachios (Pista)'],
    components_ur: ['چلغوزہ', 'بڑی میڈجول کھجور', 'افغانی انجیر', 'بھنے ایرانی پستے'],
    components_ar: ['صنوبر', 'تمر مجهول كبير', 'تين أفغاني مجفف', 'فستق إيراني محمص'],
    tasteProfile_en: 'Resinous roasted chilgoza, soft caramel Medjool dates, honeyed figs and crisp roasted pistachios.',
    tasteProfile_ur: 'بھنے چلغوزے کی خوشبو، نرم کیریمل جیسی میڈجول کھجور، شہد جیسی انجیر اور کرکرے بھنے پستے۔',
    tasteProfile_ar: 'صنوبر محمص عطري، وتمر مجهول طري بطعم الكراميل، وتين بنكهة العسل، وفستق محمص مقرمش.',
  },
  'bundle-ramadan-ready': {
    previousNames: ['Ramadan Ready', 'رمضان ریڈی بنڈل', 'باقة رمضان'],
    name_en: 'Ramadan Ready: Ajwa & Medjool Dates, Afghan Figs & Mixed Nuts',
    name_ur: 'رمضان کی تیاری: عجوہ اور میڈجول کھجور، افغانی انجیر اور ملے جلے میوے',
    name_ar: 'جاهز لرمضان: تمر العجوة والمجهول وتين أفغاني ومكسرات مشكلة',
    desc_en: 'Two dates, figs and nuts for the iftar and suhoor table, portioned for family sharing.\n\nWhat\'s inside: Ajwa dates from Madinah. Jumbo Medjool dates. Afghan dried figs (Anjeer). A mixed nut selection, confirmed with you before dispatch.\n\nWhy this set: open the fast with dates and keep figs and nuts for suhoor; also a ready gift to send to family in Ramadan.',
    desc_ur: 'افطار اور سحری کے دسترخوان کے لیے دو قسم کی کھجور، انجیر اور میوے، خاندان کے ساتھ بانٹنے کی مقدار میں۔\n\nاندر کیا ہے: مدینہ کی عجوہ کھجور۔ بڑی میڈجول کھجور۔ افغانی خشک انجیر۔ ملے جلے میوے، روانگی سے پہلے آپ سے طے کیے جاتے ہیں۔\n\nیہ سیٹ کیوں: کھجور سے روزہ کھولیں اور انجیر اور میوے سحری کے لیے رکھیں؛ رمضان میں رشتہ داروں کو بھیجنے کے لیے تیار تحفہ بھی۔',
    desc_ar: 'نوعان من التمر وتين ومكسرات لمائدة الإفطار والسحور، بكميات للمشاركة العائلية.\n\nفي الداخل: تمر العجوة من المدينة المنورة. تمر مجهول كبير. تين أفغاني مجفف. تشكيلة مكسرات مشكلة تُؤكَّد معك قبل الإرسال.\n\nلماذا هذه المجموعة: أفطر على التمر واحتفظ بالتين والمكسرات للسحور؛ وهي أيضًا هدية جاهزة للأهل في رمضان.',
    health_en: 'IFTAR & SUHOOR • 4 SELECTIONS', health_ur: 'افطار و سحری • 4 انتخاب', health_ar: 'إفطار وسحور • 4 اختيارات',
    components: ['Ajwa Dates Madina (Khajoor)', 'Medjool Dates Jumbo', 'Afghan Dried Figs (Anjeer)', 'Mixed nuts — selection confirmed before dispatch'],
    components_ur: ['مدینہ کی عجوہ کھجور', 'بڑی میڈجول کھجور', 'افغانی انجیر', 'ملے جلے میوے — روانگی سے پہلے طے'],
    components_ar: ['تمر العجوة المدينة', 'تمر مجهول كبير', 'تين أفغاني مجفف', 'مكسرات مشكلة — تُؤكَّد قبل الإرسال'],
    tasteProfile_en: 'Soft Ajwa and caramel Medjool dates with chewy Afghan figs and freshly roasted nuts.',
    tasteProfile_ur: 'نرم عجوہ اور کیریمل جیسی میڈجول کھجور، چبانے والی افغانی انجیر اور تازہ بھنے میوے۔',
    tasteProfile_ar: 'تمر عجوة طري وتمر مجهول بطعم الكراميل مع تين أفغاني طري ومكسرات محمصة طازجة.',
  },
};

/** Applies the approved copy to a seed product; ids, prices and stock are never touched. */
export function applyBundleCopy20261116<T extends { id: string }>(product: T): T {
  const copy = BUNDLE_COPY_20261116[product.id];
  if (!copy) return product;
  const next: any = {
    ...product,
    name: copy.name_en, nameUr: copy.name_ur, nameAr: copy.name_ar,
    name_en: copy.name_en, name_ur: copy.name_ur, name_ar: copy.name_ar,
    description: copy.desc_en, desc_en: copy.desc_en, desc_ur: copy.desc_ur, desc_ar: copy.desc_ar,
    health_en: copy.health_en, health_ur: copy.health_ur, health_ar: copy.health_ar,
  };
  if (copy.components) {
    next.components = copy.components;
    next.contents_en = copy.components.join(' · ');
    next.contents_ur = (copy.components_ur || copy.components).join(' · ');
    next.contents_ar = (copy.components_ar || copy.components).join(' · ');
  }
  if (copy.tasteProfile_en) {
    next.tasteProfile = copy.tasteProfile_en; next.tasteProfile_en = copy.tasteProfile_en;
    next.tasteProfile_ur = copy.tasteProfile_ur || copy.tasteProfile_en;
    next.tasteProfile_ar = copy.tasteProfile_ar || copy.tasteProfile_en;
  }
  if (copy.tag_en) { next.tag_en = copy.tag_en; next.tag_ur = copy.tag_ur; next.tag_ar = copy.tag_ar; next.tag = copy.tag_en; }
  if (Array.isArray(next.keywords)) {
    const old = new Set(copy.previousNames.map(name => name.toLowerCase()));
    next.keywords = [...next.keywords.filter((k: string) => !old.has(String(k).toLowerCase())), copy.name_en, copy.name_ur, copy.name_ar];
  }
  delete next.healthTag;
  return next;
}
