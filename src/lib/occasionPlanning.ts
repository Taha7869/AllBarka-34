import { STORE_CONFIG } from '../config/store';

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
  transitNote: string;
}

export interface PackagingOption {
  id: PackagingPreference;
  label_en: string;
  label_ur: string;
  label_ar: string;
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
  { id: 'lahore', label_en: 'Lahore', label_ur: 'لاہور', label_ar: 'لاهور', transitNote: 'Lahore local boutique dispatch' },
  { id: 'karachi', label_en: 'Karachi (Courier Dispatch)', label_ur: 'کراچی (کوریئر ڈسپیچ)', label_ar: 'كراتشي (شحن کوریئر)', transitNote: 'Nationwide courier transit applies separately' },
  { id: 'islamabad', label_en: 'Islamabad / Rawalpindi (Courier Dispatch)', label_ur: 'اسلام آباد / راولپنڈی (کوریئر ڈسپیچ)', label_ar: 'إسلام آباد / راولبندي', transitNote: 'Nationwide courier transit applies separately' },
  { id: 'faisalabad', label_en: 'Faisalabad (Courier Dispatch)', label_ur: 'فیصل آباد (کوریئر ڈسپیچ)', label_ar: 'فيصل آباد', transitNote: 'Nationwide courier transit applies separately' },
  { id: 'multan', label_en: 'Multan (Courier Dispatch)', label_ur: 'ملتان (کوریئر ڈسپیچ)', label_ar: 'ملتان', transitNote: 'Nationwide courier transit applies separately' },
  { id: 'other', label_en: 'Other City in Pakistan', label_ur: 'پاکستان کا کوئی اور شہر', label_ar: 'مدينة أخرى في باكستان', transitNote: 'Nationwide courier transit applies separately' },
];

export const PACKAGING_OPTIONS: PackagingOption[] = [
  { id: 'luxury_tin', label_en: 'Luxury Gold Embossed Tin', label_ur: 'شاہی گولڈ ٹن ڈبہ', label_ar: 'علبة معدنية مذهبة فاخرة' },
  { id: 'velvet_box', label_en: 'Royal Velvet Keepsake Box', label_ur: 'مخملی رائل باکس', label_ar: 'صندوق مخملي ملكي' },
  { id: 'jute_potli', label_en: 'Handmade Jute & Organza Pouch', label_ur: 'دستی جوٹ و پوٹلی پاؤچ', label_ar: 'كيس خيش وأورجانزا يدوي' },
  { id: 'wooden_hamper', label_en: 'Handcrafted Heritage Wooden Chest', label_ur: 'لکڑی کا روایتی ہیمپر بکس', label_ar: 'صندوق خشبي تراثي فخم' },
  { id: 'acrylic_royal', label_en: 'Crystal Acrylic Favor Dome', label_ur: 'کرسٹل ایکریلک ڈوم', label_ar: 'قبة أكريليك كريستالية' },
  { id: 'custom', label_en: 'Bespoke Custom Packaging with Logo', label_ur: 'برانڈڈ کسٹم پیکجنگ بمعہ لوگو', label_ar: 'تغليف مخصص بشعار شركتكم' },
];

/**
 * Canonical AllBarka celebration preparation policy:
 * Custom printed tags, foil monograms, and hand-assembled celebration boxes
 * require a minimum of 10 calendar days lead time following final design approval
 * and required advance deposit, before courier dispatch. Courier transit applies separately.
 */
export const CUSTOM_PREPARATION_MIN_DAYS = 10;

export interface LeadTimeCheck {
  totalRequiredDays: number;
  availableDays: number;
  status: 'safe' | 'tight' | 'urgent';
  prepDays: number;
  transitDays: number;
  earliestDeliveryDate: string;
  transitNote: string;
}

/**
 * Checks if a requested event date respects the standard 10-calendar-day preparation policy.
 * Requested event dates are customer inquiries, not guaranteed arrival commitments.
 */
export function checkEventLeadTime(
  cityKey: DeliveryCity,
  _packagingKey?: PackagingPreference,
  requestedDateStr?: string | null,
  now = new Date()
): LeadTimeCheck {
  const city = CITY_OPTIONS.find(c => c.id === cityKey) || CITY_OPTIONS[0];
  const prepDays = CUSTOM_PREPARATION_MIN_DAYS;
  const totalRequiredDays = CUSTOM_PREPARATION_MIN_DAYS;

  // Earliest viable dispatch readiness date based on the 10-calendar-day policy
  const earliest = new Date(now.getTime() + prepDays * 24 * 60 * 60 * 1000);
  const earliestDeliveryDate = earliest.toISOString().slice(0, 10);

  if (!requestedDateStr) {
    return {
      totalRequiredDays,
      availableDays: totalRequiredDays,
      status: 'safe',
      prepDays,
      transitDays: 0,
      earliestDeliveryDate,
      transitNote: city.transitNote,
    };
  }

  const requestedDate = new Date(requestedDateStr);
  const diffMs = requestedDate.getTime() - now.getTime();
  const availableDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  let status: 'safe' | 'tight' | 'urgent' = 'safe';
  if (availableDays < CUSTOM_PREPARATION_MIN_DAYS) {
    status = 'urgent';
  } else if (availableDays <= CUSTOM_PREPARATION_MIN_DAYS + 4) {
    status = 'tight';
  }

  return {
    totalRequiredDays,
    availableDays,
    status,
    prepDays,
    transitDays: 0,
    earliestDeliveryDate,
    transitNote: city.transitNote,
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
 * Builds standard WhatsApp consultation link with event parameters using canonical concierge number
 */
export function buildOccasionWhatsAppUrl(
  payload: OccasionInquiryPayload,
  boutiqueNumber?: string
): string {
  const number = (boutiqueNumber || STORE_CONFIG.humanSupportWhatsApp || '923160666083').replace(/\D/g, '');
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
  lines.push(`*Notice:* Custom celebration preparation requires a minimum of 10 calendar days lead time following design approval and deposit. Courier transit applies separately. Quotation request only; final order confirmed upon artisan review and invoice.`);

  const message = lines.join('\n');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
