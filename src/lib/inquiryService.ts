import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { InquiryRecord, InquiryStatus, InquiryType, Product } from '../types';
import { sanitizeFirestoreData } from './firestoreData';
import { calculatePackagingMoq, parsePiecesPerPack, isPackagingProduct } from './packagingMoq';
import {
  buildCustomerInquiryWhatsAppUrl,
  MANDATORY_LEAD_TIME_NOTICE,
  TABARRUK_EMPTY_DEFAULT_NOTICE,
  NON_CATALOG_FILLINGS_DISCLAIMER,
} from './inquiryWhatsApp';

export class PersistenceUnavailableError extends Error {
  readonly code = 'PERSISTENCE_UNAVAILABLE';
  readonly httpStatus = 503;
  constructor(message = 'Inquiry storage is temporarily unavailable. Your inquiry has not been registered.') {
    super(message);
    this.name = 'PersistenceUnavailableError';
  }
}

export class IdempotencyConflictError extends Error {
  readonly code = 'IDEMPOTENCY_PAYLOAD_MISMATCH';
  readonly httpStatus = 409;
  constructor(message = 'An inquiry submission was already attempted with this submission key but different details.') {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

export class InquiryValidationError extends Error {
  readonly code: string;
  readonly httpStatus = 400;
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'InquiryValidationError';
    this.code = code;
  }
}

export const VALID_INQUIRY_TYPES: InquiryType[] = ['bid_box_quote', 'wholesale', 'custom_hamper', 'general'];
export const VALID_INQUIRY_STATUSES: InquiryStatus[] = ['NEW', 'CONTACTED', 'QUOTED', 'APPROVED', 'CLOSED'];

/**
 * Validates phone format. Requires at least 10 digits and only valid phone characters.
 * Rejects strings containing alphabet letters (e.g. "abcdefghij").
 */
export function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  // Strip allowed formatting characters: spaces, hyphens, parentheses
  const clean = trimmed.replace(/[\s\-()]/g, '');
  // Must only contain optional leading + and digits
  if (!/^\+?[0-9]+$/.test(clean)) return false;
  const digitsOnly = clean.replace(/\+/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;

  // Pakistani mobile format check
  if (/^(\+92|0092|92|0)?3[0-9]{9}$/.test(clean)) return true;
  // International E.164 format
  if (/^\+[1-9][0-9]{9,14}$/.test(clean)) return true;
  // Generic 10-12 digit clean phone numbers
  if (/^[0-9]{10,12}$/.test(clean)) return true;

  return false;
}

/**
 * Validates quantity: positive integer between 1 and 50,000.
 * Rejects non-integers (e.g. 1.5).
 */
export function isValidQuantity(qty: unknown): boolean {
  if (typeof qty !== 'number') return false;
  if (!Number.isInteger(qty)) return false;
  return qty >= 1 && qty <= 50000;
}

/**
 * Validates budget: null/undefined or finite non-negative number.
 */
export function isValidBudget(budget: unknown): boolean {
  if (budget == null || budget === '') return true;
  const num = Number(budget);
  return Number.isFinite(num) && num >= 0 && num <= 100000000;
}

/**
 * Normalizes phone number for WhatsApp wa.me link target.
 */
export function normalizeWhatsAppPhone(rawPhone: string): string {
  const digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (!digits) return '923160666083';
  if (digits.startsWith('0092')) return digits.slice(2);
  if (digits.startsWith('92') && digits.length >= 11) return digits;
  if (digits.startsWith('03') && digits.length === 11) return `92${digits.slice(1)}`;
  if (digits.startsWith('3') && digits.length === 10) return `92${digits}`;
  return digits.length >= 10 ? digits : '923160666083';
}

/**
 * Strips all admin/staff-only fields from public inquiries and quotes.
 * Only customer-submitted fields are allowed through.
 */
export function sanitizePublicInquiryInput(raw: any): Record<string, any> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const allowedCustomerKeys = new Set([
    'customerName', 'name', 'phone', 'customerPhone', 'contact', 'email', 'city',
    'type', 'source', 'productId', 'productName', 'boxId', 'boxName', 'boxMode', 'mode',
    'quantity', 'estimatedQuantity', 'standardPrice', 'referenceUnitPrice',
    'offeredPrice', 'targetPricePkr', 'customerOfferedRate', 'eventType',
    'customPrintText', 'customPrinting', 'packagingVariant', 'variantLabel', 'portion', 'targetEventDate',
    'deliveryCity', 'notes', 'message', 'customHamperNotes', 'metadata', 'topic',
    'budgetType', 'preferredFillings', 'customFillingsNotes', 'monogramText', 'cardMessage',
    'leadTimeNoticeAcknowledged', 'submissionKey', 'idempotencyKey'
  ]);
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (allowedCustomerKeys.has(key)) {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Resolves product, variant, pack capacity, authoritative standard pricing, and MOQ server-side.
 * Never trusts the client's submitted product name or reference rate.
 */
export function resolveInquiryProductVariant(params: {
  catalog: Product[];
  productId: string;
  requestedVariantLabel?: string | null;
  boxMode: 'empty' | 'filled' | 'custom';
  quantity: number;
}): {
  productName: string;
  isVerifiedCatalogProduct: boolean;
  packagingVariant: string | null;
  quantityUnit: 'pieces' | 'packs' | 'sets';
  piecesPerPack: number;
  standardPrice: number | null;
  perPiecePrice: number | null;
  requiresTeamQuote: boolean;
  belowMoq: boolean;
  moqRequired: number | null;
  isTabarruk: boolean;
} {
  const { catalog, productId, requestedVariantLabel, boxMode, quantity } = params;
  const catalogProduct = catalog.find(p => p.id === productId);

  if (!catalogProduct) {
    return {
      productName: 'Custom Packaging Request',
      isVerifiedCatalogProduct: false,
      packagingVariant: requestedVariantLabel ? String(requestedVariantLabel).slice(0, 80) : null,
      quantityUnit: 'pieces',
      piecesPerPack: 1,
      standardPrice: null,
      perPiecePrice: null,
      requiresTeamQuote: true,
      belowMoq: false,
      moqRequired: null,
      isTabarruk: String(productId || '').toLowerCase().includes('tabarruk'),
    };
  }

  const isTabarruk =
    catalogProduct.id.toLowerCase().includes('tabarruk') ||
    catalogProduct.name_en.toLowerCase().includes('tabarruk') ||
    catalogProduct.packagingSubcategory === 'tabarruk';

  // 1. Resolve selected variant without switching bulk tiers on quantity
  let matchedVariant: { label: string; price: number } | null = null;
  const requestedLabel = requestedVariantLabel?.trim();

  if (requestedLabel) {
    if (Array.isArray(catalogProduct.variants)) {
      const found = catalogProduct.variants.find(v => v.label.toLowerCase() === requestedLabel.toLowerCase());
      if (found) matchedVariant = { label: found.label, price: found.price };
    }
    if (!matchedVariant && catalogProduct.prices && requestedLabel in catalogProduct.prices) {
      matchedVariant = { label: requestedLabel, price: catalogProduct.prices[requestedLabel] };
    }
  }

  // Fallback to first available variant if requested label not found
  if (!matchedVariant) {
    if (Array.isArray(catalogProduct.variants) && catalogProduct.variants.length > 0) {
      matchedVariant = { label: catalogProduct.variants[0].label, price: catalogProduct.variants[0].price };
    } else if (catalogProduct.prices && Object.keys(catalogProduct.prices).length > 0) {
      const firstKey = Object.keys(catalogProduct.prices)[0];
      matchedVariant = { label: firstKey, price: catalogProduct.prices[firstKey] };
    }
  }

  const selectedLabel = matchedVariant ? matchedVariant.label : null;
  const piecesPerPack = parsePiecesPerPack(selectedLabel);

  // 2. Define quantity units explicitly: packs vs pieces vs sets
  let quantityUnit: 'pieces' | 'packs' | 'sets' = 'pieces';
  if (isTabarruk && (catalogProduct.name_en.toLowerCase().includes('set') || catalogProduct.id.toLowerCase().includes('set'))) {
    quantityUnit = 'sets';
  } else if (isPackagingProduct(catalogProduct) && piecesPerPack > 1) {
    quantityUnit = 'packs';
  }

  // 3. Resolve authoritative pricing
  let standardPrice: number | null = null;
  let perPiecePrice: number | null = null;
  let requiresTeamQuote = false;

  if (boxMode === 'empty') {
    if (matchedVariant && Number.isFinite(matchedVariant.price) && matchedVariant.price > 0) {
      standardPrice = matchedVariant.price;
      perPiecePrice = Math.round((matchedVariant.price / piecesPerPack) * 100) / 100;
    } else {
      requiresTeamQuote = true;
    }
  } else if (boxMode === 'custom') {
    // Custom configurations require team quote
    standardPrice = null;
    perPiecePrice = null;
    requiresTeamQuote = true;
  } else {
    // Filled mode
    if (matchedVariant && matchedVariant.label.toLowerCase().includes('filled') && matchedVariant.price > 0) {
      standardPrice = matchedVariant.price;
      perPiecePrice = Math.round((matchedVariant.price / piecesPerPack) * 100) / 100;
    } else {
      // Empty box price is NOT the filled price
      standardPrice = null;
      perPiecePrice = null;
      requiresTeamQuote = true;
    }
  }

  // 4. Derive authoritative MOQ for packaging
  let belowMoq = false;
  let moqRequired: number | null = null;

  if (isPackagingProduct(catalogProduct)) {
    try {
      const moq = calculatePackagingMoq(catalogProduct, selectedLabel || undefined);
      moqRequired = moq;
      const totalPieces = quantity * piecesPerPack;
      belowMoq = totalPieces < moq;
    } catch {
      requiresTeamQuote = true;
    }
  }

  return {
    productName: catalogProduct.name_en,
    isVerifiedCatalogProduct: true,
    packagingVariant: selectedLabel,
    quantityUnit,
    piecesPerPack,
    standardPrice,
    perPiecePrice,
    requiresTeamQuote,
    belowMoq,
    moqRequired,
    isTabarruk,
  };
}

/**
 * Computes deterministic SHA-256 hash of canonical inquiry fields for idempotency.
 */
export function computeInquiryPayloadHash(fields: {
  customerName: string;
  phone: string;
  city: string;
  productId: string;
  packagingVariant?: string | null;
  boxMode: string;
  quantity: number;
  eventType: string;
  targetEventDate?: string | null;
  preferredFillings?: string[];
  customFillingsNotes?: string;
  monogramText?: string;
  cardMessage?: string;
  customPrintText?: string;
  budgetType?: string | null;
  targetPricePkr?: number | null;
  leadTimeNoticeAcknowledged?: boolean;
}): string {
  const normalized = {
    customerName: fields.customerName.trim().toLowerCase(),
    phone: normalizeWhatsAppPhone(fields.phone),
    city: fields.city.trim().toLowerCase(),
    productId: fields.productId.trim().toLowerCase(),
    packagingVariant: fields.packagingVariant ? fields.packagingVariant.trim() : null,
    boxMode: fields.boxMode.trim().toLowerCase(),
    quantity: fields.quantity,
    eventType: fields.eventType.trim().toLowerCase(),
    targetEventDate: fields.targetEventDate ? fields.targetEventDate.trim() : null,
    preferredFillings: Array.isArray(fields.preferredFillings) ? [...fields.preferredFillings].sort() : [],
    customFillingsNotes: fields.customFillingsNotes ? fields.customFillingsNotes.trim() : '',
    monogramText: fields.monogramText ? fields.monogramText.trim() : '',
    cardMessage: fields.cardMessage ? fields.cardMessage.trim() : '',
    customPrintText: fields.customPrintText ? fields.customPrintText.trim() : '',
    budgetType: fields.budgetType || null,
    targetPricePkr: fields.targetPricePkr ?? null,
    leadTimeNoticeAcknowledged: Boolean(fields.leadTimeNoticeAcknowledged),
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Generates a collision-resistant, human-readable reference ID.
 */
export function generateInquiryReferenceId(type: InquiryType): string {
  const prefix = type === 'bid_box_quote' ? 'ABQ' : type === 'wholesale' ? 'ABW' : type === 'custom_hamper' ? 'ABH' : 'ABI';
  const timestampPart = Date.now().toString(36).toUpperCase().slice(-5);
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestampPart}-${randomPart}`;
}

/**
 * Generates dynamic 1-click WhatsApp concierge reply pitch for the admin desk.
 */
export function buildAdminWhatsAppPitchUrl(record: InquiryRecord): string {
  const targetPhone = normalizeWhatsAppPhone(record.phone);
  const modeLabel =
    record.boxMode === 'empty'
      ? 'Box Only (Empty Packaging)'
      : record.boxMode === 'custom'
      ? 'Bespoke Packaging & Custom Fillings'
      : 'Filled with AllBarka Dry Fruits';

  const lines = [
    `*Assalam-o-Alaikum ${record.customerName || 'Valued Patron'}!*`,
    `Greetings from *AllBarka Luxury Dry Fruits Concierge (Lahore)*.`,
    ``,
    `Thank you for your ${record.type === 'bid_box_quote' ? 'Custom Bid Box / Celebration Quote' : record.type === 'wholesale' ? 'Wholesale Inquiry' : record.type === 'custom_hamper' ? 'Custom Luxury Hamper Request' : 'Boutique Inquiry'} (*Ref #${record.id}*):`,
    record.productName ? `• *Selection:* ${record.productName}` : '',
    record.packagingVariant ? `• *Variant / Portion:* ${record.packagingVariant}` : '',
    record.type === 'bid_box_quote' ? `• *Configuration:* ${modeLabel}` : '',
    record.quantity > 1 ? `• *Quantity:* ${record.quantity} pcs` : '',
    record.eventType ? `• *Occasion:* ${record.eventType}` : '',
    record.targetEventDate ? `• *Target Event Date:* ${record.targetEventDate}` : '',
    record.preferredFillings && record.preferredFillings.length > 0 ? `• *Fillings Selected:* ${record.preferredFillings.join(', ')}` : '',
    record.monogramText ? `• *Monogram / Tag:* ${record.monogramText}` : '',
    record.cardMessage ? `• *Card Message:* ${record.cardMessage}` : '',
    record.standardPrice ? `• *Standard Rate Ref:* Rs. ${Number(record.standardPrice).toLocaleString()}/pc` : '',
    record.finalAgreedPrice
      ? `• *AllBarka Special Approved Rate:* Rs. ${Number(record.finalAgreedPrice).toLocaleString()} PKR`
      : record.offeredPrice
        ? `• *Your Offered Budget:* Rs. ${Number(record.offeredPrice).toLocaleString()} PKR (Ready to finalize terms)`
        : '',
    record.adminNotes ? `• *Concierge Note:* ${record.adminNotes}` : '',
    ``,
    `Please reply here to confirm your order and customization details so we can schedule your fresh preparation.`,
  ].filter(Boolean);

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
}

/**
 * Atomically commits inquiry/quote and idempotency record to Firestore.
 * Fails with 503 if database is missing.
 */
export async function persistInquiryAtomically(
  db: Firestore | null,
  record: InquiryRecord,
  submissionKey?: string,
  payloadHash?: string
): Promise<{ isDuplicate: boolean; inquiry: InquiryRecord }> {
  if (!db) {
    throw new PersistenceUnavailableError('Inquiry storage is temporarily unavailable. Your inquiry has not been registered.');
  }

  return await db.runTransaction(async tx => {
    if (submissionKey) {
      const intentRef = db.collection('inquiryIntents').doc(submissionKey);
      const intentDoc = await tx.get(intentRef);
      if (intentDoc.exists) {
        const intentData = intentDoc.data();
        if (intentData?.payloadHash !== payloadHash) {
          throw new IdempotencyConflictError();
        }
        // Duplicate retry of identical submission: return existing record
        return { isDuplicate: true, inquiry: intentData.inquiry as InquiryRecord };
      }
    }

    const payload = sanitizeFirestoreData({ ...record });
    const inqRef = db.collection('inquiries').doc(record.id);
    tx.set(inqRef, payload);

    if (record.type === 'bid_box_quote') {
      const quoteRef = db.collection('quotes').doc(record.id);
      tx.set(quoteRef, payload);
    }

    if (submissionKey) {
      const intentRef = db.collection('inquiryIntents').doc(submissionKey);
      tx.set(intentRef, sanitizeFirestoreData({
        submissionKey,
        payloadHash,
        recordId: record.id,
        inquiry: record,
        createdAt: Date.now(),
      }));
    }

    return { isDuplicate: false, inquiry: record };
  });
}

/**
 * Atomically updates admin inquiry fields across inquiries and quotes collections.
 */
export async function updateAdminInquiryAtomically(
  db: Firestore | null,
  updated: InquiryRecord
): Promise<InquiryRecord> {
  if (!db) {
    throw new PersistenceUnavailableError('Database is currently unavailable for admin updates.');
  }

  const batch = db.batch();
  const payload = sanitizeFirestoreData({ ...updated });
  batch.set(db.collection('inquiries').doc(updated.id), payload, { merge: true });

  if (updated.type === 'bid_box_quote') {
    batch.set(db.collection('quotes').doc(updated.id), payload, { merge: true });
  }

  await batch.commit();
  return updated;
}
