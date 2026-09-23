import crypto from 'crypto';
import type { Firestore, Transaction, DocumentSnapshot } from 'firebase-admin/firestore';
import { validateAndPriceOrder, validateCustomerDetails, ValidationError, ValidatedOrderItem } from './orderValidation';
import { STORE_COUPONS, calculateCouponDiscount, CouponRecord } from './couponEngine';
import { PricingSummary } from './pricing';
import { STORE_CONFIG } from '../config/store';
import { REWARDS } from '../data/rewards';

export const SCHEMA_VERSION = '2.0.0';

export type OrderStatus = 'NEW' | 'ORDER_RECEIVED' | 'CONFIRMED' | 'PREPARING' | 'DISPATCHED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'cod' | 'bank';

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

export interface CanonicalOrder {
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
  adminNotes?: string[];
}

export interface SanitizedCustomerOrder {
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
}

export interface OutboxOrderEvent {
  eventId: string;
  orderId: string;
  eventType: 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'ORDER_PAID' | 'LOYALTY_AWARDED' | 'LOYALTY_REVERSED';
  schemaVersion: string;
  occurredAt: string;
  occurredAtMs: number;
  deliveryState: 'PENDING' | 'DISABLED';
  attempts: number;
  payload: Record<string, any>;
}

export interface IdempotencyRecord {
  idempotencyKey: string;
  orderId: string;
  payloadHash: string;
  createdAt: number;
  response: {
    orderId: string;
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
  return {
    schemaVersion: order.schemaVersion,
    orderId: order.orderId,
    createdAt: order.createdAt,
    createdAtMs: order.createdAtMs,
    status: order.status,
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
    claimedAt: order.claimedAt || null,
    whatsappMessage,
  };
}

/**
 * Generates an authoritative WhatsApp concierge receipt text for Lahore dispatch.
 */
export function generateAuthoritativeWhatsAppMessage(order: CanonicalOrder): string {
  const dateStr = new Date(order.createdAtMs).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const lines: string[] = [
    `*ALLBARKA GOURMET BOUTIQUE — ORDER CONFIRMATION*`,
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
  lines.push(`Payment Method: ${order.paymentMethod === 'cod' ? 'Cash on Delivery (Lahore)' : 'Direct Bank Transfer'}`);

  if (order.customer.instructions) {
    lines.push(``);
    lines.push(`Special Dispatch Note: ${order.customer.instructions}`);
  }

  lines.push(``);
  lines.push(`Thank you for choosing AllBarka. Your order has been registered in our Lahore kitchen and will be thermal vacuum-sealed just before dispatch.`);

  return lines.join('\n');
}

/**
 * Computes payload hash for idempotency checking.
 */
export function hashPayload(payload: any): string {
  const normalized = {
    name: payload.name?.trim(),
    phone: payload.phone?.trim(),
    address: payload.address?.trim(),
    city: payload.city?.trim(),
    paymentMethod: payload.paymentMethod?.trim(),
    shippingMethodId: payload.shippingMethodId,
    discountCode: payload.discountCode ? String(payload.discountCode).trim().toUpperCase() : null,
    rewardId: payload.rewardId ? String(payload.rewardId).trim() : null,
    giftWrapping: Boolean(payload.giftWrapping),
    giftMessage: payload.giftMessage?.trim() || '',
    instructions: payload.instructions?.trim() || '',
    items: (payload.items || []).map((it: any) => ({
      id: String(it.productId || it.id || '').trim(),
      selectedWeight: String(it.selectedWeight || '250g').trim(),
      quantity: Number(it.quantity) || 1,
    })).sort((a: any, b: any) => a.id.localeCompare(b.id)),
  };

  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Generates a unique collision-resistant AllBarka order reference:
 * e.g. AB-20260914-7F89AB
 */
export function generateOrderId(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
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
