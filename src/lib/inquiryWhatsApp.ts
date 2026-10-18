/**
 * WhatsApp Inquiry & Quote URL Builder
 *
 * Implements Stage 6 requirements:
 * - Canonical WhatsApp number: 923160666083
 * - Explicit lead time notice: "Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate."
 * - Tabarruk default empty packaging notice
 * - Non-catalog fillings disclaimer (candies, chocolates, panjeeri subject to team confirmation)
 * - Saved inquiry (with quoteId) vs Unsaved draft distinction
 */

export const CANONICAL_WHATSAPP_PHONE = '923160666083';

export const MANDATORY_LEAD_TIME_NOTICE =
  'Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate.';

export const NON_CATALOG_FILLINGS_DISCLAIMER =
  'Chocolates, candies, and non-catalog fillings are customer-requested options subject to team sourcing confirmation and quote.';

export const TABARRUK_EMPTY_DEFAULT_NOTICE =
  'Tabarruk bottles and base packaging are EMPTY by default. Optional fillings (Zamzam, Ajwa dates, roasted almonds) are custom additions subject to team confirmation and quote.';

export interface CustomerInquiryWhatsAppParams {
  quoteId?: string | null;
  isUnsavedDraft?: boolean;
  productName: string;
  productId: string;
  packagingVariant?: string | null;
  mode: 'empty' | 'filled' | 'custom';
  quantity: number;
  eventType: string;
  targetEventDate?: string | null;
  preferredFillings?: string[];
  customFillingsNotes?: string;
  monogramText?: string;
  cardMessage?: string;
  customPrinting?: string;
  budgetType?: 'per_piece' | 'total' | null;
  targetPricePkr?: number | string | null;
  referenceUnitPrice?: number | null;
  customerName: string;
  customerPhone: string;
  city: string;
  isTabarruk?: boolean;
}

export function formatFillingsLabel(fillings?: string[]): string {
  if (!fillings || fillings.length === 0) return '';
  const labelMap: Record<string, string> = {
    dry_fruits: 'Dry Fruits & Nuts',
    dates: 'Premium Dates',
    chocolates: 'Chocolates & Truffles (Custom-sourced)',
    candies: 'Candies & Sweets (Custom-sourced)',
    other: 'Special Custom Fillings',
  };
  return fillings.map(f => labelMap[f] || f).join(', ');
}

export function buildCustomerInquiryWhatsAppUrl(params: CustomerInquiryWhatsAppParams): string {
  const isSaved = Boolean(params.quoteId && !params.isUnsavedDraft);

  const modeLabel =
    params.mode === 'empty'
      ? 'Box Only (Empty Packaging)'
      : params.mode === 'custom'
      ? 'Bespoke Packaging & Custom Fillings'
      : 'Filled with AllBarka Dry Fruits';

  const lines: string[] = [
    `*Assalam-o-Alaikum AllBarka Concierge!*`,
    isSaved
      ? `I have submitted a *Custom Quote / Event Inquiry* (*Ref #${params.quoteId}*):`
      : `I would like to request a *Direct Custom Quote / Event Inquiry* (*[UNSAVED DRAFT]*):`,
    ``,
    `• *Selected Product:* ${params.productName} (${params.productId})`,
    params.packagingVariant ? `• *Variant / Portion:* ${params.packagingVariant}` : '',
    `• *Packaging Mode:* ${modeLabel}`,
    params.isTabarruk ? `• *Tabarruk Notice:* Empty by default; fillings added upon confirmation` : '',
    `• *Quantity:* ${params.quantity} pcs`,
    `• *Occasion / Event:* ${params.eventType}`,
    params.targetEventDate ? `• *Target Event Date:* ${params.targetEventDate}` : '',
    `• *Preparation Lead Time:* Acknowledged (min 10 calendar days after design approval & advance)`,
  ];

  if (params.preferredFillings && params.preferredFillings.length > 0) {
    lines.push(`• *Preferred Fillings:* ${formatFillingsLabel(params.preferredFillings)}`);
  }
  if (params.customFillingsNotes?.trim()) {
    lines.push(`• *Fillings Details:* ${params.customFillingsNotes.trim()}`);
  }
  if (params.monogramText?.trim()) {
    lines.push(`• *Monogram / Name Tag:* ${params.monogramText.trim()}`);
  }
  if (params.cardMessage?.trim()) {
    lines.push(`• *Card / Ribbon Message:* ${params.cardMessage.trim()}`);
  }
  if (params.customPrinting?.trim()) {
    lines.push(`• *Design & Printing Notes:* ${params.customPrinting.trim()}`);
  }

  if (params.referenceUnitPrice && params.referenceUnitPrice > 0) {
    lines.push(`• *Standard Rate Ref:* Rs. ${Number(params.referenceUnitPrice).toLocaleString()}/pc`);
  } else {
    lines.push(`• *Standard Rate Ref:* Custom Quote on Request`);
  }

  if (params.targetPricePkr) {
    const num = Number(params.targetPricePkr);
    if (Number.isFinite(num) && num > 0) {
      const bType = params.budgetType === 'per_piece' ? 'per piece' : 'total budget';
      lines.push(`• *Target Offer / Budget:* Rs. ${num.toLocaleString()} PKR (${bType})`);
    }
  }

  lines.push(
    ``,
    `*Patron Details:*`,
    params.customerName ? `• *Name:* ${params.customerName}` : '',
    params.customerPhone ? `• *Phone / WhatsApp:* ${params.customerPhone}` : '',
    params.city ? `• *City:* ${params.city}` : '',
    ``,
    `Please confirm availability, wholesale rate, and customization options.`
  );

  const cleanText = lines.filter(Boolean).join('\n');
  return `https://wa.me/${CANONICAL_WHATSAPP_PHONE}?text=${encodeURIComponent(cleanText)}`;
}
