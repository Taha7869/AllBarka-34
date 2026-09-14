import crypto from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import {
  CanonicalOrder,
  OrderStatus,
  PaymentStatus,
  OutboxOrderEvent,
  IdempotencyRecord,
  generateOrderId,
  generateClaimToken,
  hashPayload,
  generateAuthoritativeWhatsAppMessage,
  sanitizeOrderForCustomer,
  SCHEMA_VERSION
} from './serverOrderService';
import { validateAndPriceOrder, validateCustomerDetails, ValidationError } from './orderValidation';
import { STORE_COUPONS, calculateCouponDiscount, CouponRecord } from './couponEngine';
import { PricingSummary } from './pricing';
import { STORE_CONFIG } from '../config/store';

export class PersistenceUnavailableError extends Error {
  code = 'PERSISTENCE_UNAVAILABLE';
  constructor(message = 'Durable order database is currently offline or unreachable.') {
    super(message);
    this.name = 'PersistenceUnavailableError';
  }
}

export class QuoteChangedError extends Error {
  code = 'QUOTE_CHANGED';
  totals: PricingSummary;
  items: any[];
  constructor(message: string, totals: PricingSummary, items: any[]) {
    super(message);
    this.name = 'QuoteChangedError';
    this.totals = totals;
    this.items = items;
  }
}

export class IdempotencyConflictError extends Error {
  code = 'IDEMPOTENCY_PAYLOAD_MISMATCH';
  constructor(message = 'An order submission was already attempted with this idempotency key but different payload details.') {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

export interface CreateOrderParams {
  db: Firestore;
  payload: any;
  uid: string | null;
  idempotencyKey?: string | null;
  expectedFinalTotal?: number | null;
}

/**
 * Creates a durable order inside a single atomic Firestore transaction.
 */
export async function createDurableOrder({
  db,
  payload,
  uid,
  idempotencyKey,
  expectedFinalTotal
}: CreateOrderParams): Promise<{
  orderId: string;
  claimToken?: string | null;
  whatsappMessage: string;
  totals: PricingSummary;
  items: any[];
  isDuplicate?: boolean;
}> {
  if (!db) {
    throw new PersistenceUnavailableError();
  }

  // 1. Authoritative Validation (Prior to Transaction)
  const customer = validateCustomerDetails(payload);
  const validated = validateAndPriceOrder({
    items: payload.items,
    shippingMethodId: payload.shippingMethodId,
    discountCode: payload.discountCode,
    giftWrapping: payload.giftWrapping,
    isWholesale: Boolean(payload.isWholesale),
  });

  // 2. Quote Consistency Check
  if (expectedFinalTotal !== undefined && expectedFinalTotal !== null) {
    const diff = Math.abs(expectedFinalTotal - validated.summary.total);
    if (diff > 1) {
      throw new QuoteChangedError(
        `Prices or delivery rates have been refreshed. New total is Rs. ${validated.summary.total.toLocaleString('en-PK')}. Please reconfirm your order.`,
        validated.summary,
        validated.items
      );
    }
  }

  // 3. Stable IDs and Tokens Generated Outside Retryable Callback
  const resolvedKey = idempotencyKey?.trim() || crypto.randomUUID();
  const payloadHash = hashPayload(payload);
  const orderId = generateOrderId();
  const isGuest = !uid;
  const { token: rawClaimToken, hash: claimTokenHash } = isGuest ? generateClaimToken() : { token: null, hash: null };
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // 4. Atomic Firestore Transaction Execution
  const idempotencyRef = db.collection('checkoutIntents').doc(resolvedKey);
  const orderRef = db.collection('orders').doc(orderId);
  const eventRef = db.collection('orderEvents').doc(`${orderId}_ORDER_CREATED_${nowMs}`);

  let couponRef: any = null;
  const couponCode = payload.discountCode ? String(payload.discountCode).trim().toUpperCase() : null;
  if (couponCode) {
    couponRef = db.collection('coupons').doc(couponCode);
  }

  let rewardRef: any = null;
  const rewardId = payload.rewardId ? String(payload.rewardId).trim() : null;
  if (rewardId && uid) {
    rewardRef = db.collection('users').doc(uid).collection('activeRewards').doc(rewardId);
  }

  const result = await db.runTransaction(async (transaction: any) => {
    // --- STEP 1: READ PHASE (ALL READS MUST PRECEDE ALL WRITES) ---
    const intentSnap = await transaction.get(idempotencyRef);
    if (intentSnap.exists) {
      const intentData = intentSnap.data() as IdempotencyRecord;
      if (intentData.payloadHash !== payloadHash) {
        throw new IdempotencyConflictError();
      }
      // Return cached idempotent result
      return {
        isDuplicate: true,
        orderId: intentData.orderId,
        whatsappMessage: intentData.response.whatsappMessage,
        totals: intentData.response.totals,
        items: intentData.response.items,
        claimToken: intentData.response.claimToken || null,
      };
    }

    // Read coupon if supplied
    let couponRecord: CouponRecord | null = null;
    if (couponRef) {
      const couponSnap = await transaction.get(couponRef);
      if (couponSnap.exists) {
        couponRecord = couponSnap.data() as CouponRecord;
      } else if (STORE_COUPONS[couponCode!]) {
        // Fallback to static coupon store if not yet seeded in Firestore
        couponRecord = STORE_COUPONS[couponCode!];
      } else {
        throw new ValidationError(`Coupon code "${couponCode}" is invalid or does not exist.`, 'INVALID_COUPON');
      }

      // Verify coupon constraints inside transaction
      const calc = calculateCouponDiscount(couponRecord, validated.summary.subtotal, uid);
      if (calc.error) {
        throw new ValidationError(calc.error, 'COUPON_INELIGIBLE');
      }
    }

    // Read reward if supplied
    if (rewardRef) {
      const rewardSnap = await transaction.get(rewardRef);
      if (!rewardSnap.exists) {
        throw new ValidationError(`Selected reward does not exist for this patron.`, 'REWARD_NOT_FOUND');
      }
      const rewardData = rewardSnap.data();
      if (rewardData?.status !== 'ACTIVE') {
        throw new ValidationError(`Selected reward is no longer active or has already been used.`, 'REWARD_ALREADY_USED');
      }
    }

    // --- STEP 2: WRITE PHASE ---
    const canonicalOrder: CanonicalOrder = {
      schemaVersion: SCHEMA_VERSION,
      orderId,
      source: 'website',
      createdAt: nowIso,
      createdAtMs: nowMs,
      updatedAt: nowIso,
      updatedAtMs: nowMs,
      status: 'NEW',
      paymentStatus: 'UNPAID',
      paymentMethod: customer.paymentMethod as any,
      uid: uid || null,
      claimTokenHash: claimTokenHash || null,
      claimTokenExpiry: isGuest ? nowMs + (7 * 24 * 60 * 60 * 1000) : null, // 7 days
      claimStatus: isGuest ? 'ACTIVE' : null,
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        deliverySlot: customer.deliverySlot,
        instructions: customer.instructions,
      },
      gifting: {
        giftWrapping: customer.giftWrapping,
        giftMessage: customer.giftMessage,
        giftWrapFee: validated.summary.giftWrapFee,
      },
      items: validated.items,
      totals: validated.summary,
      couponCode: couponCode || null,
      couponDiscount: validated.summary.discount,
      rewardId: rewardId || null,
      rewardDiscount: 0,
      earnedPoints: validated.earnedPoints,
    };

    const whatsappMessage = generateAuthoritativeWhatsAppMessage(canonicalOrder);

    // Write Order
    transaction.set(orderRef, canonicalOrder);

    // Write Coupon Redemption if applicable
    if (couponCode) {
      const redemptionRef = db.collection('couponRedemptions').doc(`${couponCode}_${orderId}`);
      transaction.set(redemptionRef, {
        couponCode,
        orderId,
        uid: uid || null,
        phone: customer.phone,
        discountAmount: validated.summary.discount,
        redeemedAt: nowMs,
      });

      if (couponRef && couponRecord) {
        transaction.set(couponRef, {
          ...couponRecord,
          usedCount: (couponRecord.usedCount || 0) + 1,
        }, { merge: true });
      }
    }

    // Write Reward Redemption if applicable
    if (rewardRef) {
      transaction.update(rewardRef, {
        status: 'USED',
        usedAt: nowMs,
        orderId,
      });
    }

    // Write Idempotency Document
    const idempotencyRecord: IdempotencyRecord = {
      idempotencyKey: resolvedKey,
      orderId,
      payloadHash,
      createdAt: nowMs,
      response: {
        orderId,
        whatsappMessage,
        totals: validated.summary,
        items: validated.items,
        claimToken: rawClaimToken,
      }
    };
    transaction.set(idempotencyRef, idempotencyRecord);

    // Write Durable Outbox Event
    const outboxEvent: OutboxOrderEvent = {
      eventId: `${orderId}_ORDER_CREATED_${nowMs}`,
      orderId,
      eventType: 'ORDER_CREATED',
      schemaVersion: SCHEMA_VERSION,
      occurredAt: nowIso,
      occurredAtMs: nowMs,
      deliveryState: 'DISABLED', // external delivery disabled in Batch 2
      attempts: 0,
      payload: {
        orderId,
        uid,
        customerName: customer.name,
        phone: customer.phone,
        total: validated.summary.total,
        itemCount: validated.items.length,
      }
    };
    transaction.set(eventRef, outboxEvent);

    return {
      isDuplicate: false,
      orderId,
      whatsappMessage,
      totals: validated.summary,
      items: validated.items,
      claimToken: rawClaimToken,
    };
  });

  return result;
}

/**
 * Claims a guest order by associating it with a verified patron account.
 */
export async function claimGuestOrder({
  db,
  uid,
  orderId,
  claimToken
}: {
  db: Firestore;
  uid: string;
  orderId: string;
  claimToken: string;
}): Promise<{ success: boolean; message: string; order: CanonicalOrder }> {
  if (!db) {
    throw new PersistenceUnavailableError();
  }

  const orderRef = db.collection('orders').doc(orderId);
  const tokenHash = crypto.createHash('sha256').update(claimToken.trim()).digest('hex');
  const now = Date.now();

  const claimedOrder = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists) {
      throw new ValidationError('Order not found.', 'ORDER_NOT_FOUND');
    }

    const order = snap.data() as CanonicalOrder;

    // Idempotent success if already linked to this exact user
    if (order.uid === uid) {
      return order;
    }

    // Disallow if owned by someone else
    if (order.uid && order.uid !== uid) {
      throw new ValidationError('This order is already claimed by another patron account.', 'ALREADY_CLAIMED');
    }

    // Verify claim token hash
    if (!order.claimTokenHash || order.claimTokenHash !== tokenHash) {
      throw new ValidationError('Invalid or unrecognized claim token credentials.', 'INVALID_CLAIM_TOKEN');
    }

    // Check expiry
    if (order.claimTokenExpiry && now > order.claimTokenExpiry) {
      throw new ValidationError('This guest claim token has expired. Please contact concierge.', 'CLAIM_TOKEN_EXPIRED');
    }

    // Atomically transfer ownership
    transaction.update(orderRef, {
      uid,
      claimStatus: 'CLAIMED',
      claimedAt: now,
      claimTokenHash: null, // Clear hash to prevent replay
      updatedAt: new Date(now).toISOString(),
      updatedAtMs: now,
    });

    return {
      ...order,
      uid,
      claimStatus: 'CLAIMED' as const,
      claimedAt: now,
      claimTokenHash: null,
    };
  });

  return {
    success: true,
    message: 'Order successfully linked to your patron profile.',
    order: claimedOrder,
  };
}

/**
 * Updates order status by an administrator with optimistic concurrency check.
 */
export async function updateAdminOrderStatus({
  db,
  orderId,
  status,
  reason,
  expectedStatus,
  actorUid,
  actorEmail
}: {
  db: Firestore;
  orderId: string;
  status: OrderStatus;
  reason?: string;
  expectedStatus?: OrderStatus;
  actorUid: string;
  actorEmail?: string;
}): Promise<CanonicalOrder> {
  if (!db) {
    throw new PersistenceUnavailableError();
  }

  const validStatuses: OrderStatus[] = ['NEW', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid order status: ${status}`, 'INVALID_STATUS');
  }

  const orderRef = db.collection('orders').doc(orderId);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists) {
      throw new ValidationError('Order not found.', 'ORDER_NOT_FOUND');
    }

    const order = snap.data() as CanonicalOrder;

    if (expectedStatus && order.status !== expectedStatus) {
      throw new ValidationError(
        `Order status was modified by another session (expected "${expectedStatus}", found "${order.status}"). Please refresh.`,
        'STATUS_CONFLICT'
      );
    }

    if (order.status === status) {
      return order; // No change needed
    }

    const oldStatus = order.status;
    const auditRef = db.collection('orderAudits').doc(`${orderId}_${now}`);
    const auditData = {
      orderId,
      previousStatus: oldStatus,
      newStatus: status,
      reason: reason || 'Admin status adjustment',
      actorUid,
      actorEmail: actorEmail || 'admin',
      timestamp: now,
      timestampIso: nowIso,
    };

    // Loyalty Ledger Updates
    if (status === 'DELIVERED' && order.uid && order.earnedPoints > 0) {
      // Award loyalty points
      const loyaltyRef = db.collection('users').doc(order.uid).collection('loyaltyTransactions').doc(`ORDER_${orderId}`);
      transaction.set(loyaltyRef, {
        points: order.earnedPoints,
        type: 'EARNED',
        orderId,
        description: `Earned from Order #${orderId}`,
        createdAt: now,
      });

      const userRef = db.collection('users').doc(order.uid);
      const userSnap = await transaction.get(userRef);
      const currentPts = userSnap.exists ? (userSnap.data()?.loyaltyPoints || 0) : 0;
      transaction.set(userRef, { loyaltyPoints: currentPts + order.earnedPoints }, { merge: true });
    } else if (oldStatus === 'DELIVERED' && status === 'CANCELLED' && order.uid && order.earnedPoints > 0) {
      // Reverse loyalty points
      const reverseRef = db.collection('users').doc(order.uid).collection('loyaltyTransactions').doc(`REV_${orderId}`);
      transaction.set(reverseRef, {
        points: -order.earnedPoints,
        type: 'REVERSED',
        orderId,
        description: `Points reversed due to Order #${orderId} cancellation`,
        createdAt: now,
      });

      const userRef = db.collection('users').doc(order.uid);
      const userSnap = await transaction.get(userRef);
      const currentPts = userSnap.exists ? (userSnap.data()?.loyaltyPoints || 0) : 0;
      transaction.set(userRef, { loyaltyPoints: Math.max(0, currentPts - order.earnedPoints) }, { merge: true });
    }

    // Outbox Event
    const eventRef = db.collection('orderEvents').doc(`${orderId}_STATUS_${status}_${now}`);
    transaction.set(eventRef, {
      eventId: `${orderId}_STATUS_${status}_${now}`,
      orderId,
      eventType: 'ORDER_STATUS_CHANGED',
      schemaVersion: SCHEMA_VERSION,
      occurredAt: nowIso,
      occurredAtMs: now,
      deliveryState: 'DISABLED',
      attempts: 0,
      payload: { oldStatus, newStatus: status, actorUid, reason },
    });

    transaction.set(auditRef, auditData);
    transaction.update(orderRef, {
      status,
      updatedAt: nowIso,
      updatedAtMs: now,
    });

    return {
      ...order,
      status,
      updatedAt: nowIso,
      updatedAtMs: now,
    };
  });
}
