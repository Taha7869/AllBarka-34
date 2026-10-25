export interface CheckoutCustomer {
  name: string; phone: string; address: string; city: string; deliverySlot: string;
  giftWrapping: boolean; giftMessage: string; instructions: string;
}
export interface CheckoutDraft { customer: CheckoutCustomer; shipping: 'standard' | 'express'; coupon: string; payment: 'cod' | 'bank'; updatedAt: number; }
export interface SavedAddress { id: string; label: string; name: string; phone: string; address: string; city: string; }
export const CHECKOUT_DRAFT_KEY = 'allbarka_checkout_draft_v1';
export const ADDRESS_BOOK_KEY = 'allbarka_addresses_v1';
const text = (value: unknown, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function normalizeDraft(value: unknown, now = Date.now()): CheckoutDraft | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<CheckoutDraft>;
  if (!raw.customer || !Number.isFinite(raw.updatedAt) || now - Number(raw.updatedAt) > 7 * 86400000 || Number(raw.updatedAt) > now + 60000) return null;
  const customer = raw.customer;
  return { customer: { name: text(customer.name, 80), phone: text(customer.phone, 30), address: text(customer.address, 300), city: text(customer.city, 60) || 'Lahore', deliverySlot: text(customer.deliverySlot, 80) || 'Fastest Dispatch', giftWrapping: customer.giftWrapping === true, giftMessage: text(customer.giftMessage, 300), instructions: text(customer.instructions, 300) }, shipping: raw.shipping === 'express' ? 'express' : 'standard', coupon: text(raw.coupon, 60), payment: raw.payment === 'bank' ? 'bank' : 'cod', updatedAt: Number(raw.updatedAt) };
}
export function readCheckoutDraft(): CheckoutDraft | null {
  try { return normalizeDraft(JSON.parse(sessionStorage.getItem(CHECKOUT_DRAFT_KEY) || 'null')); } catch { return null; }
}
export function normalizeAddresses(value: unknown): SavedAddress[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).flatMap(entry => {
    if (!entry || typeof entry !== 'object' || text(entry.address, 300).length < 8) return [];
    return [{ id: text(entry.id, 80), label: text(entry.label, 40), name: text(entry.name, 80), phone: text(entry.phone, 30), address: text(entry.address, 300), city: text(entry.city, 60) || 'Lahore' }].filter(address => !!address.id);
  });
}
export function readAddresses(): SavedAddress[] { try { return normalizeAddresses(JSON.parse(localStorage.getItem(ADDRESS_BOOK_KEY) || '[]')); } catch { return []; } }
