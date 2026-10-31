import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { InquiryRecord, InquiryStatus, InquiryType, Product } from '../types';
import { sanitizeFirestoreData } from './firestoreData';
import {
  isValidPhone,
  isValidQuantity,
  isValidBudget,
  sanitizePublicInquiryInput,
  resolveInquiryProductVariant,
  type InquiryVariantResolution,
  type ResolveInquiryParams,
} from './inquiryResolution';
import {
  buildAdminWhatsAppPitchUrl,
  normalizeWhatsAppTargetPhone,
  CANONICAL_WHATSAPP_PHONE,
} from './inquiryWhatsApp';

// Re-export browser-safe resolution functions and types for server/test consumers
export {
  isValidPhone,
  isValidQuantity,
  isValidBudget,
  sanitizePublicInquiryInput,
  resolveInquiryProductVariant,
  type InquiryVariantResolution,
  type ResolveInquiryParams,
  buildAdminWhatsAppPitchUrl,
};

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
 * Normalizes phone number for WhatsApp wa.me link target.
 */
export function normalizeWhatsAppPhone(rawPhone: string): string {
  return normalizeWhatsAppTargetPhone(rawPhone);
}

/**
 * Computes deterministic SHA-256 hash of canonical inquiry fields for idempotency.
 * Normalizes customPrintText and customPrinting aliases to produce identical hashes.
 */
export function computeInquiryPayloadHash(fields: {
  customerName: string;
  phone: string;
  city?: string;
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
  customPrinting?: string;
  budgetType?: string | null;
  targetPricePkr?: number | null;
  leadTimeNoticeAcknowledged?: boolean;
  netFillingGrams?: number | null;
}): string {
  const printText = (fields.customPrintText ?? fields.customPrinting)?.trim() || '';

  const normalized = {
    customerName: String(fields.customerName || '').trim().toLowerCase(),
    phone: normalizeWhatsAppPhone(fields.phone || ''),
    city: String(fields.city || '').trim().toLowerCase(),
    productId: String(fields.productId || '').trim().toLowerCase(),
    packagingVariant: fields.packagingVariant ? String(fields.packagingVariant).trim() : null,
    boxMode: String(fields.boxMode || '').trim().toLowerCase(),
    quantity: fields.quantity,
    eventType: String(fields.eventType || '').trim().toLowerCase(),
    targetEventDate: fields.targetEventDate ? String(fields.targetEventDate).trim() : null,
    preferredFillings: Array.isArray(fields.preferredFillings) ? [...fields.preferredFillings].sort() : [],
    customFillingsNotes: fields.customFillingsNotes ? String(fields.customFillingsNotes).trim() : '',
    monogramText: fields.monogramText ? String(fields.monogramText).trim() : '',
    cardMessage: fields.cardMessage ? String(fields.cardMessage).trim() : '',
    customPrintText: printText,
    budgetType: fields.budgetType || null,
    targetPricePkr: fields.targetPricePkr ?? null,
    leadTimeNoticeAcknowledged: Boolean(fields.leadTimeNoticeAcknowledged),
    ...(fields.netFillingGrams != null && Number.isFinite(fields.netFillingGrams) && Number(fields.netFillingGrams) > 0
      ? { netFillingGrams: Number(fields.netFillingGrams) }
      : {}),
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
