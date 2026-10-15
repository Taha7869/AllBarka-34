import crypto from 'crypto';
import type { Firestore, Transaction, DocumentSnapshot } from 'firebase-admin/firestore';
import { validateAndPriceOrder, validateCustomerDetails, ValidationError, ValidatedOrderItem } from './orderValidation';
import type { AppliedPromo } from '../types/promo';
import { sanitizeFirestoreData } from './firestoreData';
import { PricingSummary } from './pricing';
import { STORE_CONFIG } from '../config/store';
import { REWARDS } from '../data/rewards';
import { CUSTOM_HAMPER_PRODUCT_ID, resolveHamper } from './hamperCatalog';
import { PRODUCTS } from '../data/products';
import { storedOrderStatus, type StoredOrderStatus } from './orderStatuses';

export const SCHEMA_VERSION = '2.0.0';

export type OrderStatus = StoredOrderStatus;
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'NOT_REQUIRED';
export type PaymentMethod = 'cod' | 'bank' | 'quote';

export interface AdminNoteEntry {
  id: string;
  text: string;
  actorUid: string;
  actorEmail: string;
  timestamp: number;
  timestampIso: string;
}

export interface CanonicalCustomerSnapshot {
  name: string;
  phone: string;
  address: string;
  city: string;
  deliverySlot?: string;
  instructions?: string;
}

export interface CanonicalGiftingSnapshot {
  giftWrapping: boolean;
  giftMessage?: string;
  giftWrapFee: number;
}

import { DeliveryScheduleResult } from './deliveryCalendar';

export interface CanonicalOrder extends Partial<AppliedPromo> {
  orderType?: 'ORDER' | 'QUOTE_REQUEST';
  schemaVersion: string; // '2.0.0'
  orderId: string; // e.g. 'AB-20260914-7F89AB'
  source: 'website';
  createdAt: string; // ISO 8601
  createdAtMs: number; // Unix timestamp ms
  updatedAt: string;
  updatedAtMs: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  uid: string | null;
  // Older receipts may omit this field; new canonical orders always persist the mode.
  isWholesale?: boolean;
  guestSessionId?: string | null;
  claimTokenHash?: string | null; // SHA-256 hash of high-entropy token, excluded from public customer responses
  claimTokenExpiry?: number | null;
  claimStatus?: 'ACTIVE' | 'CLAIMED' | 'EXPIRED' | null;
  claimedAt?: number | null;
  customer: CanonicalCustomerSnapshot;
  gifting: CanonicalGiftingSnapshot;
  deliverySchedule?: DeliveryScheduleResult;
  items: ValidatedOrderItem[];
  totals: PricingSummary;
  couponCode?: string | null;
  couponDiscount?: number;
  rewardId?: string | null;
  rewardDiscount?: number;
  earnedPoints: number;
  pointsAwarded?: boolean;
  trackingNumber?: string;
  estimatedDelivery?: string | null;
  integrationUpdatedAt?: string;
  integrationUpdateHash?: string;
  integrationNotes?: string;
  adminNotes?: string[];
  adminNoteEntries?: AdminNoteEntry[];
}

export interface SanitizedCustomerOrder extends Partial<AppliedPromo> {
  orderType?: 'ORDER' | 'QUOTE_REQUEST';
  schemaVersion: string;
  orderId: string;
  createdAt: string;
  createdAtMs?: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  customer: CanonicalCustomerSnapshot;
  gifting: CanonicalGiftingSnapshot;
  deliverySchedule?: DeliveryScheduleResult;
  items: ValidatedOrderItem[];
  totals: PricingSummary;
  couponCode?: string | null;
  couponDiscount?: number;
  rewardId?: string | null;
  rewardDiscount?: number;
  earnedPoints: number;
  pointsAwarded?: boolean;
  claimedAt?: number | null;
  whatsappMessage?: string;
  updatedAt?: string;
  trackingNumber?: string;
  estimatedDelivery?: string | null;
  loyaltyPointsEarned?: number;
  loyaltyPointsTotal?: number;
}

export interface OutboxOrderEvent {
  eventId: string;
  orderId: string;
  eventType: 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'ORDER_PAID' | 'LOYALTY_AWARDED' | 'LOYALTY_REVERSED';
  type?: 'order_created' | 'order_status_updated';
  schemaVersion: string;
  occurredAt: string;
  occurredAtMs: number;
  deliveryState: 'PENDING' | 'LEASED' | 'DELIVERED' | 'FAILED' | 'DISABLED';
  attempts: number;
  nextAttemptAtMs?: number;
  leaseOwner?: string;
  leaseToken?: string;
  leaseUntilMs?: number;
  lastAttemptAtMs?: number;
  deliveredAtMs?: number;
  updatedAtMs?: number;
  disabledReason?: string;
  lastError?: string;
  lastStatusCode?: number;
  payload: Record<string, any>;
}

export interface IdempotencyRecord {
  idempotencyKey: string;
  orderId: string;
  payloadHash: string;
  createdAt: number;
  response: {
    orderId: string;
    status?: OrderStatus;
    orderType?: 'ORDER' | 'QUOTE_REQUEST';
    whatsappMessage: string;
    totals: PricingSummary;
    items: ValidatedOrderItem[];
    claimToken?: string | null;
    uid?: string | null;
    deliverySchedule?: DeliveryScheduleResult;
  };
}

/**
 * Strips private security fields, claim token hashes, and internal admin logs from customer-facing views.
 */
export function sanitizeOrderForCustomer(order: CanonicalOrder, whatsappMessage?: string): SanitizedCustomerOrder {
  return sanitizeFirestoreData({
    schemaVersion: order.schemaVersion,
    orderId: order.orderId,
    createdAt: order.createdAt,
    createdAtMs: order.createdAtMs,
    status: storedOrderStatus(order.status) || order.status,
    orderType: order.orderType || 'ORDER',
    promoCode: order.promoCode ?? order.couponCode ?? null,
    promoType: order.promoType ?? null,
    ...(typeof order.promoValue === 'number' ? { promoValue: order.promoValue } : {}),
    discountAmount: order.discountAmount ?? order.couponDiscount ?? order.totals.discount ?? 0,
    freeShipping: Boolean(order.freeShipping),
    freeGiftWrap: Boolean(order.freeGiftWrap),
    freeGift: Boolean(order.freeGift),
    isQuoteRequest: order.orderType === 'QUOTE_REQUEST',
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    customer: {
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.customer.address,
      city: order.customer.city,
      deliverySlot: order.customer.deliverySlot,
      instructions: order.customer.instructions,
    },
    gifting: {
      giftWrapping: order.gifting.giftWrapping,
      giftMessage: order.gifting.giftMessage,
      giftWrapFee: order.gifting.giftWrapFee,
    },
    deliverySchedule: order.deliverySchedule,
    items: order.items,
    totals: order.totals,
    couponCode: order.couponCode || null,
    couponDiscount: order.couponDiscount || 0,
    rewardId: order.rewardId || null,
    rewardDiscount: order.rewardDiscount || 0,
    earnedPoints: order.earnedPoints || 0,
    pointsAwarded: Boolean(order.pointsAwarded),
    updatedAt: order.updatedAt,
    trackingNumber: order.trackingNumber || '',
    estimatedDelivery: order.estimatedDelivery ?? null,
    loyaltyPointsEarned: order.pointsAwarded ? order.earnedPoints || 0 : 0,
    claimedAt: order.claimedAt || null,
    whatsappMessage,
  });
}

/**
 * Generates an authoritative WhatsApp concierge receipt text for Lahore dispatch.
 */
export function generateAuthoritativeWhatsAppMessage(order: CanonicalOrder): string {
  if (order.orderType === 'QUOTE_REQUEST') {
    return ['*ALLBARKA — QUOTE REQUEST*', `Ref: #${order.orderId}`, `Customer: ${order.customer.name}`,
      ...order.items.map(item => `• ${item.name} (${item.selectedWeight}) × ${item.quantity}`),
      'Your quote request has been received. Our team will contact you shortly.'].join('\n');
  }
  const dateStr = new Date(order.createdAtMs).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const lines: string[] = [
    `*ALLBARKA — ORDER CONFIRMATION*`,
    `Ref: #${order.orderId}`,
    `Date: ${dateStr}`,
    `Customer: ${order.customer.name}`,
    `Contact: ${order.customer.phone}`,
    `Destination: ${order.customer.address}, ${order.customer.city}`,
    `Delivery Slot: ${order.customer.deliverySlot || 'Fastest Dispatch'}`,
    ``,
    `*ITEMS ORDERED:*`
  ];

  order.items.forEach(it => {
    lines.push(`• ${it.name} (${it.selectedWeight}) × ${it.quantity} — Rs. ${(it.price * it.quantity).toLocaleString('en-PK')}`);
    if (it.hamperConfiguration) {
      const configuration = it.hamperConfiguration;
      const selections = configuration.selections.map(id => PRODUCTS.find(product => product.id === id)?.name_en || id);
      lines.push(`  Hamper contents: ${selections.join(', ')} (200g each).`);
      if (configuration.recipientName) lines.push(`  Gift card recipient: ${configuration.recipientName}`);
      if (configuration.giftMessage) lines.push(`  Gift card message: ${configuration.giftMessage}`);
    }
  });

  if (order.gifting.giftWrapping) {
    lines.push(`• Luxury Gift Packaging & Satin Ribbon — Rs. ${order.gifting.giftWrapFee.toLocaleString('en-PK')}`);
    if (order.gifting.giftMessage) {
      lines.push(`  Gift Card Inscription: "${order.gifting.giftMessage}"`);
    }
  }

  lines.push(``);
  lines.push(`*FINANCIAL SUMMARY:*`);
  lines.push(`Merchandise Subtotal: Rs. ${order.totals.subtotal.toLocaleString('en-PK')}`);
  if (order.totals.discount > 0) {
    lines.push(`Discount Applied: -Rs. ${order.totals.discount.toLocaleString('en-PK')}`);
  }
  lines.push(`Delivery Fee: Rs. ${order.totals.shipping.toLocaleString('en-PK')}${order.totals.shipping === 0 ? ' (Complimentary Threshold Waived)' : ''}`);
  lines.push(`*Total Payable: Rs. ${order.totals.total.toLocaleString('en-PK')}*`);
  if (order.totals.shippingRegion === 'nationwide' && typeof order.totals.shippingWeightGrams === 'number') {
    lines.push(`Delivery billing weight: ${(order.totals.shippingWeightGrams / 1000).toLocaleString('en-PK')}kg (Rs. ${STORE_CONFIG.shipping.nationwidePerKg}/kg; minimum Rs. ${STORE_CONFIG.shipping.nationwideMinimum}).`);
  }
  lines.push(`Payment Method: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Direct Bank Transfer'}`);

  if (order.customer.instructions) {
    lines.push(``);
    lines.push(`Special Dispatch Note: ${order.customer.instructions}`);
  }

  lines.push(``);
  lines.push(`Thank you for choosing AllBarka. Our team will prepare your selections for dispatch.`);

  return lines.join('\n');
}

/**
 * Computes payload hash for idempotency checking.
 */
function hashCheckoutPayload(payload: any, includeDeliveryPricingIntent: boolean): string {
  const normalized = {
    name: payload.name?.trim(),
    phone: payload.phone?.trim(),
    address: payload.address?.trim(),
    city: payload.city?.trim(),
    paymentMethod: payload.paymentMethod?.trim(),
    ...(includeDeliveryPricingIntent ? { deliverySlot: payload.deliverySlot?.trim() || 'Fastest Dispatch' } : {}),
    shippingMethodId: payload.shippingMethodId,
    ...(includeDeliveryPricingIntent ? { isWholesale: Boolean(payload.isWholesale) } : {}),
    discountCode: payload.discountCode ? String(payload.discountCode).trim().toUpperCase() : null,
    rewardId: payload.rewardId ? String(payload.rewardId).trim() : null,
    giftWrapping: Boolean(payload.giftWrapping),
    giftMessage: payload.giftMessage?.trim() || '',
    instructions: payload.instructions?.trim() || '',
    items: (payload.items || []).map((it: any) => ({
      id: String(it.productId || it.id || '').trim(),
      selectedWeight: String(it.selectedWeight || '250g').trim(),
      quantity: Number(it.quantity) || 1,
      ...(String(it.productId || it.id || '').trim() === CUSTOM_HAMPER_PRODUCT_ID
        ? { hamperConfiguration: resolveHamper(it.hamperConfiguration)?.configuration || null } : {}),
    })).sort((a: any, b: any) => a.id.localeCompare(b.id)),
  };

  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function hashPayload(payload: any): string { return hashCheckoutPayload(payload, true); }
/** Migration comparison only; the saved canonical slot/mode must independently prove compatibility. */
export function hashLegacyCheckoutPayload(payload: any): string { return hashCheckoutPayload(payload, false); }

/**
 * Generates a unique collision-resistant AllBarka order reference:
 * e.g. AB-20260914-7F89AB
 */
export function generateOrderId(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `AB-${yyyy}${mm}${dd}-${hex}`;
}

/**
 * Generates a high-entropy guest claim token and its SHA-256 hash.
 */
export function generateClaimToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}
