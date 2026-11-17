/**
 * Shared phone rules for checkout (browser and server use the same code).
 *
 * - Contact phone: any country. Pakistani mobiles are written 03XXXXXXXXX / +923XXXXXXXXX;
 *   every other number must carry its country code (+ or 00) and have 8–15 digits (E.164).
 * - Delivery phone: always a Pakistani mobile (03XXXXXXXXX). Couriers only call Pakistani numbers.
 */

export type ContactPhoneResult =
  | { valid: true; normalized: string; isPakistani: boolean; reason?: undefined }
  | { valid: false; reason: 'REQUIRED' | 'INVALID'; normalized?: undefined; isPakistani?: undefined };

const strip = (value: string) => value.replace(/[\s\-().]/g, '');

/** Returns the canonical 03XXXXXXXXX form, or null when the value is not a Pakistani mobile. */
export function normalizePakistaniMobile(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let value = strip(raw.trim());
  if (value.startsWith('+92')) value = `0${value.slice(3)}`;
  else if (value.startsWith('0092')) value = `0${value.slice(4)}`;
  else if (/^92\d{10}$/.test(value)) value = `0${value.slice(2)}`;
  return /^03\d{9}$/.test(value) ? value : null;
}

/** Validates the customer's own contact number (any country). */
export function normalizeContactPhone(raw: unknown): ContactPhoneResult {
  if (typeof raw !== 'string' || !raw.trim()) return { valid: false, reason: 'REQUIRED' };
  const pakistani = normalizePakistaniMobile(raw);
  if (pakistani) return { valid: true, normalized: pakistani, isPakistani: true };
  const value = strip(raw.trim());
  if (value.length > 20) return { valid: false, reason: 'INVALID' };
  let digits: string;
  if (value.startsWith('+')) digits = value.slice(1);
  else if (value.startsWith('00')) digits = value.slice(2);
  else return { valid: false, reason: 'INVALID' }; // foreign numbers need their country code
  if (!/^[1-9]\d{7,14}$/.test(digits)) return { valid: false, reason: 'INVALID' };
  // +92 numbers that are not mobiles (landlines, typos) cannot be used as a contact for this store.
  if (digits.startsWith('92')) return { valid: false, reason: 'INVALID' };
  return { valid: true, normalized: `+${digits}`, isPakistani: false };
}

export interface CheckoutPhones {
  /** Customer's own number (Pakistani 03… or international +…). */
  phone: string;
  /** Pakistani mobile the courier calls. Equals `phone` when the customer number is Pakistani. */
  deliveryPhone: string;
  /** True when the customer number is not Pakistani and a separate delivery number was required. */
  separateDeliveryPhone: boolean;
}

export type CheckoutPhoneError =
  | 'PHONE_REQUIRED' | 'INVALID_PHONE' | 'DELIVERY_PHONE_REQUIRED' | 'INVALID_DELIVERY_PHONE';

/** Shared decision used by both CheckoutPage and validateCustomerDetails. */
export function resolveCheckoutPhones(rawPhone: unknown, rawDeliveryPhone: unknown):
  | { ok: true; value: CheckoutPhones; error?: undefined; field?: undefined }
  | { ok: false; error: CheckoutPhoneError; field: 'phone' | 'deliveryPhone'; value?: undefined } {
  const contact = normalizeContactPhone(rawPhone);
  if (!contact.valid) return { ok: false, error: contact.reason === 'REQUIRED' ? 'PHONE_REQUIRED' : 'INVALID_PHONE', field: 'phone' };
  const deliveryText = typeof rawDeliveryPhone === 'string' ? rawDeliveryPhone.trim() : '';
  if (contact.isPakistani) {
    // An optional second Pakistani number may still be given; it must be valid if present.
    if (deliveryText) {
      const delivery = normalizePakistaniMobile(deliveryText);
      if (!delivery) return { ok: false, error: 'INVALID_DELIVERY_PHONE', field: 'deliveryPhone' };
      return { ok: true, value: { phone: contact.normalized, deliveryPhone: delivery, separateDeliveryPhone: delivery !== contact.normalized } };
    }
    return { ok: true, value: { phone: contact.normalized, deliveryPhone: contact.normalized, separateDeliveryPhone: false } };
  }
  if (!deliveryText) return { ok: false, error: 'DELIVERY_PHONE_REQUIRED', field: 'deliveryPhone' };
  const delivery = normalizePakistaniMobile(deliveryText);
  if (!delivery) return { ok: false, error: 'INVALID_DELIVERY_PHONE', field: 'deliveryPhone' };
  return { ok: true, value: { phone: contact.normalized, deliveryPhone: delivery, separateDeliveryPhone: true } };
}

/** True when the raw contact value is a valid non-Pakistani number (the UI shows the delivery field). */
export function needsPakistaniDeliveryPhone(rawPhone: unknown): boolean {
  const contact = normalizeContactPhone(rawPhone);
  return contact.valid && !contact.isPakistani;
}

/** Delivery number for any saved order, including orders saved before deliveryPhone existed. */
export function orderDeliveryPhone(customer: { phone?: string; deliveryPhone?: string } | null | undefined): string {
  return customer?.deliveryPhone || normalizePakistaniMobile(customer?.phone) || '';
}

/** Translation key for each error code (EN/UR/AR copy lives in shoppingQualityTranslations). */
export const PHONE_ERROR_KEYS: Record<CheckoutPhoneError, string> = {
  PHONE_REQUIRED: 'checkout.phoneRequired',
  INVALID_PHONE: 'checkout.phoneError',
  DELIVERY_PHONE_REQUIRED: 'checkout.deliveryPhoneRequired',
  INVALID_DELIVERY_PHONE: 'checkout.deliveryPhoneError',
};
