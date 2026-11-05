import { GIFT_RECIPIENT_LABELS, isGiftRecipient } from './giftRecipient';
import type { GiftRecipient } from './giftRecipient';
/**
 * WhatsApp Inquiry & Quote URL Builder
 *
 * Implements Stage 6 requirements:
 * - Canonical WhatsApp number: 923160666083
 * - Explicit lead time notice: "Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate."
 * - Tabarruk bottles empty for customer-provided Zamzam water notice (Zamzam is NOT an AllBarka-supplied filling)
 * - Verified catalog date varieties (Ajwa, Medjool, Panjgur Amber); candies, chocolates, panjeeri remain custom-sourced requests
 * - Explicit quantity unit handling: packs vs pieces vs sets
 * - Do not label a pack price as a per-piece rate
 * - Below-MOQ request review flag
 * - Saved inquiry (with quoteId) vs Unsaved draft distinction
 */

export const CANONICAL_WHATSAPP_PHONE = '923160666083';

export const MANDATORY_LEAD_TIME_NOTICE =
  'Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate.';

export const NON_CATALOG_FILLINGS_DISCLAIMER =
  'Chocolates, candies, and non-catalog fillings are customer-requested options subject to team sourcing confirmation and quote.';

export const TABARRUK_EMPTY_DEFAULT_NOTICE =
  'Tabarruk bottles are empty for customer-provided Zamzam water. Base packaging is empty by default; optional fillings (Ajwa dates, roasted almonds) are custom additions subject to team confirmation and quote.';

export interface CustomerInquiryWhatsAppParams {
  quoteId?: string | null;
  isUnsavedDraft?: boolean;
  productName: string;
  productId: string;
  packagingVariant?: string | null;
  mode: 'empty' | 'filled' | 'custom';
  quantity: number;
  quantityUnit?: 'pieces' | 'packs' | 'sets';
  piecesPerPack?: number;
  eventType: string;
  giftRecipient?: GiftRecipient;
  targetEventDate?: string | null;
  preferredFillings?: string[];
  customFillingsNotes?: string;
  monogramText?: string;
  cardMessage?: string;
  customPrintText?: string;
  customPrinting?: string;
  budgetType?: 'per_piece' | 'total' | null;
  targetPricePkr?: number | string | null;
  referenceUnitPrice?: number | null;
  perPiecePrice?: number | null;
  requiresTeamQuote?: boolean;
  belowMoq?: boolean;
  moqRequired?: number | null;
  leadTimeNoticeAcknowledged?: boolean;
  customerName: string;
  customerPhone: string;
  city: string;
  isTabarruk?: boolean;
  hamperConfiguration?: any;
  estimatedTotalPkr?: number | null;
  netFillingGrams?: number | null;
}

export interface AdminWhatsAppPitchParams {
  id: string;
  type?: string;
  customerName?: string;
  phone?: string;
  productId?: string;
  productName?: string;
  packagingVariant?: string | null;
  boxMode?: 'empty' | 'filled' | 'custom';
  quantity?: number;
  quantityUnit?: 'pieces' | 'packs' | 'sets';
  piecesPerPack?: number;
  eventType?: string;
  giftRecipient?: GiftRecipient;
  targetEventDate?: string | null;
  preferredFillings?: string[];
  monogramText?: string;
  cardMessage?: string;
  customPrintText?: string;
  customPrinting?: string;
  standardPrice?: number | null;
  perPiecePrice?: number | null;
  offeredPrice?: number | null;
  budgetType?: 'per_piece' | 'total' | null;
  finalAgreedPrice?: number | string | null;
  adminNotes?: string | null;
  isTabarruk?: boolean;
  netFillingGrams?: number | null;
}

export function formatFillingsLabel(fillings?: string[]): string {
  if (!fillings || fillings.length === 0) return '';
  const labelMap: Record<string, string> = {
    dry_fruits: 'AllBarka Luxury Dry Fruits & Roasted Nuts',
    dates: 'Verified Catalog Dates (Ajwa, Medjool, Panjgur Amber)',
    chocolates: 'Chocolates & Truffles (Custom-sourced on request)',
    candies: 'Candies & Sweets (Custom-sourced on request)',
    other: 'Special Custom Fillings (Sourcing-dependent request)',
  };
  return fillings.map(f => labelMap[f] || f).join(', ');
}

export function normalizeWhatsAppTargetPhone(rawPhone?: string | null): string {
  const digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (digits.startsWith('0092')) return digits.slice(2);
  if (digits.startsWith('92') && digits.length >= 11) return digits;
  if (digits.startsWith('03') && digits.length === 11) return `92${digits.slice(1)}`;
  if (digits.startsWith('3') && digits.length === 10) return `92${digits}`;
  if (digits.length >= 10) return digits;
  return CANONICAL_WHATSAPP_PHONE;
}

export function buildCustomerInquiryWhatsAppUrl(params: CustomerInquiryWhatsAppParams): string {
  const isSaved = Boolean(params.quoteId && !params.isUnsavedDraft);

  const modeLabel =
    params.mode === 'empty'
      ? 'Box Only (Empty Packaging)'
      : params.mode === 'custom'
      ? 'Bespoke Packaging & Custom Fillings'
      : 'Filled with AllBarka Selections';

  const lines: string[] = [
    `*Assalam-o-Alaikum AllBarka Concierge!*`,
    isSaved
      ? `I have submitted a *Custom Quote / Event Inquiry* (*Ref #${params.quoteId}*):`
      : `I would like to request a *Direct Custom Quote / Event Inquiry* (*[UNSAVED DRAFT]*):`,
    ``,
    `• *Selected Product:* ${params.productName} (${params.productId})`,
    params.packagingVariant ? `• *Variant / Portion:* ${params.packagingVariant}` : '',
    params.netFillingGrams != null && Number(params.netFillingGrams) > 0
      ? `• *Net Filling Weight:* ${Number(params.netFillingGrams) >= 1000 ? `${Number(params.netFillingGrams) / 1000}kg` : `${Number(params.netFillingGrams)}g`} per box`
      : '',
    `• *Packaging Mode:* ${modeLabel}`,
  ];

  if (params.isTabarruk) {
    lines.push(`• *Tabarruk Packaging Notice:* Bottles are empty for customer-provided Zamzam water; packaging is empty by default`);
  }

  // Explicit quantity unit formatting
  if (params.quantityUnit === 'packs') {
    const totalPcs = params.piecesPerPack && params.piecesPerPack > 1 ? ` (${params.quantity * params.piecesPerPack} pcs total, ${params.piecesPerPack} pcs/pack)` : '';
    lines.push(`• *Quantity:* ${params.quantity} pack${params.quantity > 1 ? 's' : ''}${totalPcs}`);
  } else if (params.quantityUnit === 'sets') {
    lines.push(`• *Quantity:* ${params.quantity} set${params.quantity > 1 ? 's' : ''}`);
  } else {
    lines.push(`• *Quantity:* ${params.quantity} pcs`);
  }

  if (params.belowMoq && params.moqRequired) {
    lines.push(`• *MOQ Review:* Requested quantity is below standard minimum order (${params.moqRequired} pcs); team review requested`);
  }

  if (params.hamperConfiguration) {
    const config = params.hamperConfiguration;
    lines.push(`• *Hamper Coffer:* ${config.boxId}`);
    const configNetWeight = config.netFillingGrams ?? params.netFillingGrams;
    if (Array.isArray(config.selections)) {
      if (configNetWeight != null && Number(configNetWeight) > 0) {
        lines.push(`• *Selections:* ${config.selections.join(', ')}`);
      } else {
        lines.push(`• *Selections:* ${config.selections.map((s: string) => `${s} (200g)`).join(', ')}`);
      }
    }
    if (config.recipientName) lines.push(`• *Recipient:* ${config.recipientName}`);
    if (config.giftMessage) lines.push(`• *Gift Message:* ${config.giftMessage}`);
  }

  lines.push(
    `• *Occasion / Event:* ${params.eventType}`,
    params.targetEventDate ? `• *Target Event Date:* ${params.targetEventDate}` : '',
  );

  if (isGiftRecipient(params.giftRecipient)) lines.push(`• *Gift for:* ${GIFT_RECIPIENT_LABELS[params.giftRecipient]}`);

  // Exact lead time notice with honest acknowledgment state
  if (params.leadTimeNoticeAcknowledged) {
    lines.push(`• *Preparation Lead Time:* Acknowledged (min 10 calendar days after design approval & advance payment; courier transit time is separate)`);
  } else {
    lines.push(`• *Preparation Lead Time:* Notice provided (min 10 calendar days after design approval & advance payment; courier transit time is separate; acknowledgment required before production)`);
  }

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
  const printText = (params.customPrintText ?? params.customPrinting)?.trim();
  if (printText) {
    lines.push(`• *Design & Printing Notes:* ${printText}`);
  }

  // Reference pricing with pack/piece clarity
  if (params.requiresTeamQuote || !params.referenceUnitPrice || params.referenceUnitPrice <= 0) {
    lines.push(`• *Standard Rate Ref:* Custom Quote on Request (Team Confirmation Required)`);
  } else {
    if (params.quantityUnit === 'packs') {
      const perPiece = params.perPiecePrice ? ` (Rs. ${Number(params.perPiecePrice).toLocaleString()}/pc)` : '';
      lines.push(`• *Standard Rate Ref:* Rs. ${Number(params.referenceUnitPrice).toLocaleString()}/pack${perPiece}`);
    } else if (params.quantityUnit === 'sets') {
      lines.push(`• *Standard Rate Ref:* Rs. ${Number(params.referenceUnitPrice).toLocaleString()}/set`);
    } else {
      lines.push(`• *Standard Rate Ref:* Rs. ${Number(params.referenceUnitPrice).toLocaleString()}/pc`);
    }

    if (params.estimatedTotalPkr != null && Number(params.estimatedTotalPkr) > 0) {
      lines.push(`• *Estimated Total Ref:* Rs. ${Number(params.estimatedTotalPkr).toLocaleString()} PKR`);
    }
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

export function buildAdminWhatsAppPitchUrl(params: AdminWhatsAppPitchParams): string {
  const targetPhone = normalizeWhatsAppTargetPhone(params.phone);
  const modeLabel =
    params.boxMode === 'empty'
      ? 'Box Only (Empty Packaging)'
      : params.boxMode === 'custom'
      ? 'Bespoke Packaging & Custom Fillings'
      : 'Filled with AllBarka Dry Fruits';

  const agreedNum =
    params.finalAgreedPrice != null && String(params.finalAgreedPrice).trim() !== ''
      ? Number(params.finalAgreedPrice)
      : null;
  const hasAgreed = agreedNum != null && Number.isFinite(agreedNum) && agreedNum > 0;
  const noteText = params.adminNotes ? String(params.adminNotes).trim() : '';

  const isTabarruk =
    params.isTabarruk ||
    String(params.productId || '').toLowerCase().includes('tabarruk') ||
    String(params.productName || '').toLowerCase().includes('tabarruk');

  const printText = (params.customPrintText ?? params.customPrinting)?.trim();

  const lines: string[] = [
    `*Assalam-o-Alaikum ${params.customerName || 'Valued Patron'}!*`,
    `Greetings from *AllBarka Luxury Dry Fruits Concierge (Lahore)*.`,
    ``,
    `Thank you for your ${
      params.type === 'bid_box_quote'
        ? 'Custom Bid Box / Celebration Quote'
        : params.type === 'wholesale'
        ? 'Wholesale Inquiry'
        : params.type === 'custom_hamper'
        ? 'Custom Luxury Hamper Request'
        : 'Boutique Inquiry'
    } (*Ref #${params.id}*):`,
    params.productName ? `• *Selection:* ${params.productName}` : '',
    params.packagingVariant ? `• *Variant / Portion:* ${params.packagingVariant}` : '',
    params.netFillingGrams != null && Number(params.netFillingGrams) > 0
      ? `• *Net Filling Weight:* ${Number(params.netFillingGrams) >= 1000 ? `${Number(params.netFillingGrams) / 1000}kg` : `${Number(params.netFillingGrams)}g`} per box`
      : '',
    params.boxMode ? `• *Configuration:* ${modeLabel}` : '',
    isTabarruk ? `• *Tabarruk Packaging Notice:* Bottles are empty for customer-provided Zamzam water; packaging is empty by default` : '',
  ];

  // Quantity formatting
  const qty = Number(params.quantity || 1);
  if (qty > 1 || params.quantityUnit === 'packs') {
    if (params.quantityUnit === 'packs') {
      const totalPcs = params.piecesPerPack && params.piecesPerPack > 1 ? ` (${qty * params.piecesPerPack} pcs total, ${params.piecesPerPack} pcs/pack)` : '';
      lines.push(`• *Quantity:* ${qty} pack${qty > 1 ? 's' : ''}${totalPcs}`);
    } else if (params.quantityUnit === 'sets') {
      lines.push(`• *Quantity:* ${qty} set${qty > 1 ? 's' : ''}`);
    } else {
      lines.push(`• *Quantity:* ${qty} pcs`);
    }
  }

  if (isGiftRecipient(params.giftRecipient)) lines.push(`• *Gift for:* ${GIFT_RECIPIENT_LABELS[params.giftRecipient]}`);
  if (params.eventType) lines.push(`• *Occasion:* ${params.eventType}`);
  if (params.targetEventDate) lines.push(`• *Target Event Date:* ${params.targetEventDate}`);
  if (params.preferredFillings && params.preferredFillings.length > 0) {
    lines.push(`• *Fillings Selected:* ${formatFillingsLabel(params.preferredFillings)}`);
  }
  if (params.monogramText?.trim()) lines.push(`• *Monogram / Tag:* ${params.monogramText.trim()}`);
  if (params.cardMessage?.trim()) lines.push(`• *Card Message:* ${params.cardMessage.trim()}`);
  if (printText) lines.push(`• *Design & Printing Notes:* ${printText}`);

  // Standard rate reference: MUST NOT label a pack price as "/pc"
  if (params.standardPrice && Number(params.standardPrice) > 0) {
    if (params.quantityUnit === 'packs') {
      const perPiece = params.perPiecePrice ? ` (Rs. ${Number(params.perPiecePrice).toLocaleString()}/pc)` : '';
      lines.push(`• *Standard Rate Ref:* Rs. ${Number(params.standardPrice).toLocaleString()}/pack${perPiece}`);
    } else if (params.quantityUnit === 'sets') {
      lines.push(`• *Standard Rate Ref:* Rs. ${Number(params.standardPrice).toLocaleString()}/set`);
    } else {
      lines.push(`• *Standard Rate Ref:* Rs. ${Number(params.standardPrice).toLocaleString()}/pc`);
    }
  }

  if (hasAgreed) {
    lines.push(`• *AllBarka Special Approved Rate:* Rs. ${Number(agreedNum).toLocaleString()} PKR`);
  } else if (params.offeredPrice && Number(params.offeredPrice) > 0) {
    const bType = params.budgetType === 'per_piece' ? 'per piece' : 'total budget';
    lines.push(`• *Your Offered Budget:* Rs. ${Number(params.offeredPrice).toLocaleString()} PKR (${bType})`);
  }

  if (noteText) lines.push(`• *Concierge Note:* ${noteText}`);

  lines.push(
    ``,
    `Please reply here to confirm your order and customization details so we can schedule your fresh preparation.`
  );

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(lines.filter(Boolean).join('\n'))}`;
}
