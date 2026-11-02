export type EventType =
  | 'wedding'
  | 'corporate'
  | 'eid_ramzan'
  | 'umrah'
  | 'baby_aqeeqah'
  | 'majlis_milad';

export type DeliveryCity =
  | 'lahore'
  | 'karachi'
  | 'islamabad'
  | 'faisalabad'
  | 'multan'
  | 'other';

export type PackagingPreference =
  | 'luxury_tin'
  | 'velvet_box'
  | 'jute_potli'
  | 'wooden_hamper'
  | 'acrylic_royal'
  | 'custom';

export interface EventOption {
  id: EventType;
  label_en: string;
  label_ur: string;
  label_ar: string;
}

export interface CityOption {
  id: DeliveryCity;
  label_en: string;
  label_ur: string;
  label_ar: string;
  transitDays: number;
}

export interface PackagingOption {
  id: PackagingPreference;
  label_en: string;
  label_ur: string;
  label_ar: string;
  prepDays: number;
  samplePriceEstimate: number;
}

export const EVENT_OPTIONS: EventOption[] = [
  { id: 'wedding', label_en: 'Wedding & Nikkah Favors', label_ur: 'شادی و نکاح کے تحائف', label_ar: 'هدايا الزفاف وعقد القران' },
  { id: 'corporate', label_en: 'Corporate & Executive Gifts', label_ur: 'کارپوریٹ و دفتری تحائف', label_ar: 'هدايا الشركات والمدراء' },
  { id: 'eid_ramzan', label_en: 'Ramzan & Eid Mubarak', label_ur: 'رمضان المبارک و عید تحائف', label_ar: 'هدايا شهر رمضان وعيد الفطر' },
  { id: 'umrah', label_en: 'Umrah & Hajj Tabarruk', label_ur: 'عمرہ و حج تبرک و شکرانہ', label_ar: 'تبرك العمرة والحج' },
  { id: 'baby_aqeeqah', label_en: 'Baby Announcement & Aqeeqah', label_ur: 'عقیقہ و ولادت کی خوشخبری', label_ar: 'بشارة المولود والعقيقة' },
  { id: 'majlis_milad', label_en: 'Milad & Family Majlis', label_ur: 'میلاد و خاندانی محفل', label_ar: 'المواليد والمجالس العائلية' },
];

export const CITY_OPTIONS: CityOption[] = [
  { id: 'lahore', label_en: 'Lahore (Same-Day / Next-Day Boutique)', label_ur: 'لاہور (اسی دن / اگلے دن ڈیلیوری)', label_ar: 'لاهور (نفس اليوم / اليوم التالي)', transitDays: 1 },
  { id: 'karachi', label_en: 'Karachi (Express Courier)', label_ur: 'کراچی (ایکسپریس کوریئر)', label_ar: 'كراتشي (شحن سريع)', transitDays: 2 },
  { id: 'islamabad', label_en: 'Islamabad / Rawalpindi (Express)', label_ur: 'اسلام آباد / راولپنڈی (ایکسپریس)', label_ar: 'إسلام آباد / راولبندي', transitDays: 2 },
  { id: 'faisalabad', label_en: 'Faisalabad (Overnight)', label_ur: 'فیصل آباد (اوور نائٹ)', label_ar: 'فيصل آباد', transitDays: 2 },
  { id: 'multan', label_en: 'Multan (Overnight)', label_ur: 'ملتان (اوور نائٹ)', label_ar: 'ملتان', transitDays: 2 },
  { id: 'other', label_en: 'Other City in Pakistan', label_ur: 'پاکستان کا کوئی اور شہر', label_ar: 'مدينة أخرى في باكستان', transitDays: 3 },
];

export const PACKAGING_OPTIONS: PackagingOption[] = [
  { id: 'luxury_tin', label_en: 'Luxury Gold Embossed Tin', label_ur: 'شاہی گولڈ ٹن ڈبہ', label_ar: 'علبة معدنية مذهبة فاخرة', prepDays: 1, samplePriceEstimate: 140 },
  { id: 'velvet_box', label_en: 'Royal Velvet Keepsake Box', label_ur: 'مخملی رائل باکس', label_ar: 'صندوق مخملي ملكي', prepDays: 2, samplePriceEstimate: 450 },
  { id: 'jute_potli', label_en: 'Handmade Jute & Organza Pouch', label_ur: 'دستی جوٹ و پوٹلی پاؤچ', label_ar: 'كيس خيش وأورجانزا يدوي', prepDays: 1, samplePriceEstimate: 120 },
  { id: 'wooden_hamper', label_en: 'Handcrafted Heritage Wooden Chest', label_ur: 'لکڑی کا روایتی ہیمپر بکس', label_ar: 'صندوق خشبي تراثي فخم', prepDays: 3, samplePriceEstimate: 2200 },
  { id: 'acrylic_royal', label_en: 'Crystal Acrylic Favor Dome', label_ur: 'کرسٹل ایکریلک ڈوم', label_ar: 'قبة أكريليك كريستالية', prepDays: 2, samplePriceEstimate: 350 },
  { id: 'custom', label_en: 'Bespoke Custom Packaging with Logo', label_ur: 'برانڈڈ کسٹم پیکجنگ بمعہ لوگو', label_ar: 'تغليف مخصص بشعار شركتكم', prepDays: 5, samplePriceEstimate: 500 },
];

export interface LeadTimeCheck {
  totalRequiredDays: number;
  availableDays: number;
  status: 'safe' | 'tight' | 'urgent';
  transitDays: number;
  prepDays: number;
  earliestDeliveryDate: string;
}

/**
 * Checks if a requested event date allows sufficient lead time for preparation and delivery
 */
export function checkEventLeadTime(
  cityKey: DeliveryCity,
  packagingKey: PackagingPreference,
  requestedDateStr?: string | null,
  now = new Date()
): LeadTimeCheck {
  const city = CITY_OPTIONS.find(c => c.id === cityKey) || CITY_OPTIONS[0];
  const pkg = PACKAGING_OPTIONS.find(p => p.id === packagingKey) || PACKAGING_OPTIONS[0];

  const totalRequiredDays = city.transitDays + pkg.prepDays;

  // Earliest viable date
  const earliest = new Date(now.getTime() + totalRequiredDays * 24 * 60 * 60 * 1000);
  const earliestDeliveryDate = earliest.toISOString().slice(0, 10);

  if (!requestedDateStr) {
    return {
      totalRequiredDays,
      availableDays: totalRequiredDays,
      status: 'safe',
      transitDays: city.transitDays,
      prepDays: pkg.prepDays,
      earliestDeliveryDate,
    };
  }

  const requestedDate = new Date(requestedDateStr);
  const diffMs = requestedDate.getTime() - now.getTime();
  const availableDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  let status: 'safe' | 'tight' | 'urgent' = 'safe';
  if (availableDays < totalRequiredDays) {
    status = 'urgent';
  } else if (availableDays <= totalRequiredDays + 1) {
    status = 'tight';
  }

  return {
    totalRequiredDays,
    availableDays,
    status,
    transitDays: city.transitDays,
    prepDays: pkg.prepDays,
    earliestDeliveryDate,
  };
}

export interface OccasionInquiryPayload {
  name: string;
  phone: string;
  city: DeliveryCity;
  eventType: EventType;
  requestedDate: string;
  quantity: number;
  packagingPreference: PackagingPreference;
  includeCard: boolean;
  notes: string;
}

/**
 * Builds standard WhatsApp consultation link with event parameters
 */
export function buildOccasionWhatsAppUrl(
  payload: OccasionInquiryPayload,
  boutiqueNumber = '923004085448'
): string {
  const event = EVENT_OPTIONS.find(e => e.id === payload.eventType)?.label_en || payload.eventType;
  const city = CITY_OPTIONS.find(c => c.id === payload.city)?.label_en || payload.city;
  const pkg = PACKAGING_OPTIONS.find(p => p.id === payload.packagingPreference)?.label_en || payload.packagingPreference;

  const lines = [
    `👑 *ALLBARKA LUXURY BOUTIQUE — EVENT INQUIRY* 👑`,
    ``,
    `*Client:* ${payload.name}`,
    `*City:* ${city}`,
    `*Occasion / Event:* ${event}`,
    `*Requested Date:* ${payload.requestedDate || 'To be confirmed'}`,
    `*Estimated Quantity:* ${payload.quantity} units / favors`,
    `*Packaging Style:* ${pkg}`,
    `*Greeting Card / Ribbons:* ${payload.includeCard ? 'Yes, personalized' : 'Standard boutique finish'}`,
  ];

  if (payload.notes?.trim()) {
    lines.push(`*Special Instructions:* ${payload.notes.trim()}`);
  }

  lines.push(``);
  lines.push(`*Notice:* Quotation request only; final order confirmed upon artisan review and invoice.`);

  const message = lines.join('\n');
  return `https://wa.me/${boutiqueNumber}?text=${encodeURIComponent(message)}`;
}
