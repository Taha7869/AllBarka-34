import { PRODUCTS } from '../data/products';
import { resolveHamper } from './hamperCatalog';
import { getOrderDetails } from './order';
import { getLocalized } from '../utils/localize';
import type { LanguageCode } from '../contexts/LanguageContext';

export interface ConfirmedSuccessReceipt {
  orderId: string; name: string; phone: string; address: string; city: string; deliverySlot?: string;
  items: Array<{ name: string; name_en?: string; name_ur?: string; name_ar?: string; productId?: string; selectedWeight?: string; quantity: number; price: number }>;
  subtotal: number; discount: number; shipping: number; giftWrapFee: number; totalAmount: number;
  paymentMethod: string; whatsappMessage?: string; timestamp?: string;
  orderType?: 'ORDER' | 'QUOTE_REQUEST'; status?: string; promoCode?: string | null; promoType?: string | null;
  discountAmount?: number; freeShipping?: boolean; freeGiftWrap?: boolean; freeGift?: boolean;
  trackingNumber?: string; estimatedDelivery?: string | null; updatedAt?: string;
  loyaltyPointsEarned?: number; loyaltyPointsTotal?: number;
  durablePersistenceReady: true; customerUid: string | null; claimToken?: string;
}

const validOrderId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{5,100}$/.test(value);

function normalizeReceipt(raw: any, language: LanguageCode, customerUid: string | null): ConfirmedSuccessReceipt | null {
  if (!raw || !validOrderId(raw.orderId) || !Array.isArray(raw.items) || !raw.items.length) return null;
  const customer = raw.customer || raw;
  if (['name', 'phone', 'address', 'city'].some(field => typeof customer[field] !== 'string' || !customer[field].trim())) return null;
  const items = raw.items.map((item: any) => {
    const catalogue = PRODUCTS.find(product => product.id === item?.productId);
    const hamper = item?.hamperConfiguration ? resolveHamper(item.hamperConfiguration) : null;
    const source = hamper || catalogue || item;
    return { name: getLocalized(source, 'name', language), name_en: getLocalized(source, 'name', 'en'),
      name_ur: getLocalized(source, 'name', 'ur'), name_ar: getLocalized(source, 'name', 'ar'),
      ...(typeof item?.productId === 'string' ? { productId: item.productId } : {}), selectedWeight: item?.selectedWeight,
      quantity: item?.quantity, price: item?.price ?? item?.unitPrice };
  });
  if (items.some(item => !item.name || !Number.isSafeInteger(item.quantity) || item.quantity < 1
    || typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0)) return null;
  const subtotal = raw.subtotal ?? raw.totals?.subtotal;
  const discount = raw.discount ?? raw.totals?.discount ?? raw.totals?.discountAmt;
  const shipping = raw.shipping ?? raw.totals?.shipping ?? raw.totals?.shippingFee;
  const giftWrapFee = raw.giftWrapFee ?? raw.totals?.giftWrapFee ?? raw.totals?.giftFee ?? 0;
  const totalAmount = raw.totalAmount ?? raw.totals?.total ?? raw.totals?.finalPayable;
  const isQuoteRequest = raw.orderType === 'QUOTE_REQUEST';
  const promoCode = raw.promoCode ?? raw.totals?.promoCode ?? null;
  const promoType = raw.promoType ?? raw.totals?.promoType ?? null;
  if ([subtotal, discount, shipping, giftWrapFee, totalAmount].some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    || discount > subtotal || Math.abs(subtotal - discount + shipping + giftWrapFee - totalAmount) > 1
    || (isQuoteRequest ? promoCode !== 'CANCER' || promoType !== 'quote' || [subtotal, discount, shipping, giftWrapFee, totalAmount].some(value => value !== 0)
      : Math.abs(items.reduce((sum, item) => sum + item.price * item.quantity, 0) - subtotal) > 1)) return null;
  const paymentMethod = raw.paymentMethod || customer.paymentMethod;
  if (!(isQuoteRequest ? paymentMethod === 'quote' : ['cod', 'bank'].includes(paymentMethod))) return null;
  return { orderId: raw.orderId, name: customer.name, phone: customer.phone, address: customer.address, city: customer.city,
    deliverySlot: customer.deliverySlot || raw.deliverySlot, items, subtotal, discount, shipping, giftWrapFee, totalAmount,
    paymentMethod, whatsappMessage: typeof raw.whatsappMessage === 'string' ? raw.whatsappMessage : undefined,
    timestamp: raw.createdAt || raw.timestamp, durablePersistenceReady: true, customerUid,
    orderType: isQuoteRequest ? 'QUOTE_REQUEST' : 'ORDER', status: typeof raw.status === 'string' ? raw.status : undefined,
    promoCode, promoType, discountAmount: raw.discountAmount ?? raw.totals?.discountAmount ?? discount,
    freeShipping: raw.freeShipping === true || raw.totals?.freeShipping === true,
    freeGiftWrap: raw.freeGiftWrap === true || raw.totals?.freeGiftWrap === true,
    freeGift: raw.freeGift === true || raw.totals?.freeGift === true,
    trackingNumber: typeof raw.trackingNumber === 'string' ? raw.trackingNumber : '',
    estimatedDelivery: typeof raw.estimatedDelivery === 'string' ? raw.estimatedDelivery : null,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    loyaltyPointsEarned: Number.isSafeInteger(raw.loyaltyPointsEarned) && raw.loyaltyPointsEarned >= 0 ? raw.loyaltyPointsEarned : 0,
    loyaltyPointsTotal: Number.isSafeInteger(raw.loyaltyPointsTotal) && raw.loyaltyPointsTotal >= 0 ? raw.loyaltyPointsTotal : 0,
    ...(typeof raw.claimToken === 'string' ? { claimToken: raw.claimToken } : {}) };
}

/** Polls Firestore-backed API even when a verified receipt is already cached. */
export async function refreshOrderSuccessReceipt(candidate: Pick<ConfirmedSuccessReceipt, 'orderId' | 'claimToken'>, options: {
  language: LanguageCode; customerUid: string | null; getAuthToken: () => Promise<string | null>; signal?: AbortSignal;
}): Promise<ConfirmedSuccessReceipt | null> {
  if (!validOrderId(candidate.orderId) || options.signal?.aborted) return null;
  const authToken = await options.getAuthToken();
  if (options.signal?.aborted) return null;
  const result = await getOrderDetails({ orderId: candidate.orderId, authToken, claimToken: candidate.claimToken, signal: options.signal });
  if (!result.success) return null;
  const saved = normalizeReceipt(result.order, options.language, options.customerUid);
  return saved ? { ...saved, ...(candidate.claimToken ? { claimToken: candidate.claimToken } : {}) } : null;
}

/** Old snapshots are recovery hints, not proof of a saved order. Never trust their copied totals. */
export async function recoverOrderSuccessReceipt(candidate: unknown, options: {
  language: LanguageCode; customerUid: string | null; getAuthToken: () => Promise<string | null>; signal?: AbortSignal;
}): Promise<ConfirmedSuccessReceipt | null> {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const raw = candidate as Record<string, unknown>;
  if (!validOrderId(raw.orderId) || options.signal?.aborted) return null;
  if (raw.durablePersistenceReady === true && raw.customerUid === options.customerUid) {
    const cached = normalizeReceipt(raw, options.language, options.customerUid);
    if (cached) return cached;
  }
  // A failed signed-in token acquisition rejects this recovery; it cannot silently become a guest lookup.
  const authToken = await options.getAuthToken();
  if (options.signal?.aborted) return null;
  const claimToken = typeof raw.claimToken === 'string' && raw.claimToken.length <= 200 ? raw.claimToken : null;
  const result = await getOrderDetails({ orderId: raw.orderId, authToken, claimToken, signal: options.signal });
  if (!result.success || result.order?.orderId !== raw.orderId) return null;
  const saved = normalizeReceipt(result.order, options.language, options.customerUid);
  return saved ? { ...saved, ...(claimToken ? { claimToken } : {}) } : null;
}
