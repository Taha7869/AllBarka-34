import type { LanguageCode } from '../contexts/LanguageContext';

export type OccasionType = 'birthday' | 'wedding_anniversary' | 'eid' | 'other';

export type RelationshipType =
  | 'parents'
  | 'spouse'
  | 'sibling'
  | 'child'
  | 'friend'
  | 'relative'
  | 'colleague'
  | 'other';

export interface OccasionReminder {
  id: string;
  uid: string;
  recipientName: string;
  relationship: RelationshipType;
  occasionType: OccasionType;
  customOccasion?: string;
  date: string; // ISO 'YYYY-MM-DD' or 'MM-DD'
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OccasionGiftSuggestion {
  title: string;
  url: string;
  description: string;
}

export interface UpcomingReminderAdminRow {
  reminderId: string;
  uid: string;
  customerName: string;
  customerPhone: string;
  recipientName: string;
  relationship: RelationshipType;
  occasionType: OccasionType;
  customOccasion?: string;
  rawDate: string;
  daysRemaining: number;
  targetDateFormatted: string;
  notes?: string;
  whatsAppUrl: string;
  prefilledMessage: string;
  suggestions: OccasionGiftSuggestion[];
}

/**
 * Calculates days remaining from today until the next annual occurrence of the given date.
 */
export function calculateDaysRemaining(dateStr: string, referenceDate: Date = new Date()): {
  daysRemaining: number;
  targetDateFormatted: string;
  isThisWeek: boolean;
} {
  if (!dateStr || typeof dateStr !== 'string') {
    return { daysRemaining: 999, targetDateFormatted: '', isThisWeek: false };
  }

  const parts = dateStr.trim().split('-');
  let month: number;
  let day: number;

  if (parts.length === 3) {
    // YYYY-MM-DD
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else if (parts.length === 2) {
    // MM-DD
    month = parseInt(parts[0], 10) - 1;
    day = parseInt(parts[1], 10);
  } else {
    return { daysRemaining: 999, targetDateFormatted: dateStr, isThisWeek: false };
  }

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  let targetYear = today.getFullYear();
  let candidate = new Date(targetYear, month, day);

  // If the date has already passed this year, the next occurrence is next year
  if (candidate.getTime() < today.getTime()) {
    candidate = new Date(targetYear + 1, month, day);
  }

  const diffMs = candidate.getTime() - today.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const targetDateFormatted = candidate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return {
    daysRemaining,
    targetDateFormatted,
    isThisWeek: daysRemaining >= 0 && daysRemaining <= 7,
  };
}

/**
 * Returns 3 curated gift suggestions tailored to the specific occasion.
 */
export function getGiftSuggestionsForOccasion(occasionType: OccasionType, origin = 'https://allbarka.com'): OccasionGiftSuggestion[] {
  switch (occasionType) {
    case 'birthday':
      return [
        {
          title: 'Bid Box Luxury Tin (Signature Roasted)',
          url: `${origin}/product/bid-box-luxury-tin`,
          description: 'Hand-sorted roasted pistachios & jumbo cashews',
        },
        {
          title: 'Celebration Favor & Gift Hampers',
          url: `${origin}/shop/celebration-boxes`,
          description: 'Festive presentation boxes with satin ribbons',
        },
        {
          title: 'Bespoke Personalized Hamper Atelier',
          url: `${origin}/gifting`,
          description: 'Build your custom assortment with gift card',
        },
      ];
    case 'wedding_anniversary':
      return [
        {
          title: 'Signature Wooden Chest / Keepsake Box',
          url: `${origin}/gifting`,
          description: 'Harrods-level luxury pairing with royal calligraphy',
        },
        {
          title: 'Madinah Ajwa & Amber Dates Collection',
          url: `${origin}/product/ajwa-dates`,
          description: 'Authentic imported dates with organic honeycomb',
        },
        {
          title: 'Grand Mehmaan Celebration Platter',
          url: `${origin}/shop/deals`,
          description: 'Artisanal display of orchard-fresh dried fruits',
        },
      ];
    case 'eid':
      return [
        {
          title: 'Eid Milan Royal Tabarruk Platter',
          url: `${origin}/shop/occasions`,
          description: 'Festive dates, figs, and saffron almonds',
        },
        {
          title: 'Boutique Roasted Pistachio Tin',
          url: `${origin}/product/bid-box-luxury-tin`,
          description: 'Crunchy Himalayan salt pistachios in sealed gold tin',
        },
        {
          title: 'Celebration Family Feast Hamper',
          url: `${origin}/shop/celebration-boxes`,
          description: 'Generous sharing hamper for festive gatherings',
        },
      ];
    case 'other':
    default:
      return [
        {
          title: 'Bespoke Celebration Hamper',
          url: `${origin}/gifting`,
          description: 'Curated gourmet selection with bilingual card',
        },
        {
          title: 'Artisan Bid Box Luxury Tin',
          url: `${origin}/product/bid-box-luxury-tin`,
          description: 'Luxury packaging with orchard-fresh nuts',
        },
        {
          title: 'Boutique Dry Fruits Collection',
          url: `${origin}/shop`,
          description: 'Pure, unbleached, hand-sorted harvest gifts',
        },
      ];
  }
}

/**
 * Builds a pre-filled WhatsApp concierge message and `wa.me` URL.
 * STRICT RULE: Manual click-to-chat only. No automatic dispatch.
 */
export function generateOccasionWhatsAppLink(
  customerName: string,
  customerPhone: string,
  recipientName: string,
  relationship: RelationshipType,
  occasionType: OccasionType,
  daysRemaining: number,
  targetDateFormatted: string,
  origin = 'https://allbarka.com'
): { waUrl: string; message: string; suggestions: OccasionGiftSuggestion[] } {
  const suggestions = getGiftSuggestionsForOccasion(occasionType, origin);

  const cleanPhone = (customerPhone || '').replace(/\D/g, '');
  // Format international number (e.g. 0300... -> 92300...)
  let intlPhone = cleanPhone;
  if (intlPhone.startsWith('0')) {
    intlPhone = '92' + intlPhone.slice(1);
  } else if (!intlPhone.startsWith('92') && intlPhone.length === 10) {
    intlPhone = '92' + intlPhone;
  }

  const occasionNames: Record<OccasionType, string> = {
    birthday: 'Salgirah (Birthday)',
    wedding_anniversary: 'Shaadi ki Salgirah (Wedding Anniversary)',
    eid: 'Eid Mubarak',
    other: 'Khas Mauqa (Celebration)',
  };

  const relationshipNames: Record<RelationshipType, string> = {
    parents: 'Walidain (Parents)',
    spouse: 'Shauhar/Biwi (Spouse)',
    sibling: 'Behn/Bhai (Sibling)',
    child: 'Aulad (Child)',
    friend: 'Dost (Friend)',
    relative: 'Rishtedar (Relative)',
    colleague: 'Colleague',
    other: 'Apne Pyaare',
  };

  const occasionLabel = occasionNames[occasionType] || 'Khas Mauqa';
  const relLabel = relationshipNames[relationship] || 'Apne Pyaare';
  const timingText =
    daysRemaining === 0
      ? 'aaj hai'
      : daysRemaining === 1
      ? 'kal hai'
      : `${daysRemaining} din baad (${targetDateFormatted}) hai`;

  const lines = [
    `Assalam-o-Alaikum ${customerName || 'Mohtaram Patron'}!`,
    `AllBarka Boutique Concierge ki janib se yaad dehani: Aap ke ${relLabel} *${recipientName}* ki *${occasionLabel}* ${timingText}.`,
    '',
    `Un ke liye khas tohfe ke 3 pasandida intekhab:`,
    `1. ${suggestions[0].title} — ${suggestions[0].url}`,
    `2. ${suggestions[1].title} — ${suggestions[1].url}`,
    `3. ${suggestions[2].title} — ${suggestions[2].url}`,
    '',
    `Agar aap chahein to hum custom packing aur personalized calligraphy card ke sath direct deliver kar sakte hain. Kya hum aap ke liye order tayyar karein?`,
  ];

  const message = lines.join('\n');
  const encodedMessage = encodeURIComponent(message);
  const waUrl = intlPhone ? `https://wa.me/${intlPhone}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`;

  return { waUrl, message, suggestions };
}
