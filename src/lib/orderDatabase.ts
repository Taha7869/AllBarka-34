import { calculateDeliverySchedule } from './deliveryCalendar';
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
  hashLegacyCheckoutPayload,
  generateAuthoritativeWhatsAppMessage,
  sanitizeOrderForCustomer,
  SCHEMA_VERSION
} from './serverOrderService';
import { validateAndPriceOrder, validateCustomerDetails, ValidationError } from './orderValidation';
import { STORE_COUPONS, calculateCouponDiscount, CouponRecord } from './couponEngine';
import { PricingSummary } from './pricing';
import { STORE_CONFIG } from '../config/store';
import { validateShippingRewardDestination } from './shippingPolicy';
import { getN8nOrderDispatchConfig } from '../services/n8nOrderNotification';
import { getN8nStatusDispatchConfig } from '../services/n8nStatusNotification';
import { buildWhatsAppPhoneIndex, buildWhatsAppStatusNotification } from './whatsappCommerce';
import { CANONICAL_ORDER_STATUSES, SheetStatusError, validateSheetStatusCommand, sheetStatusPayloadHash, sheetStatusRequestKey,
  type SheetStatusCommand, type SheetStatusResult } from './sheetStatusCommand';
export { validateSheetStatusCommand, SheetStatusError } from './sheetStatusCommand';

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
  uid?: string | null;
  deliverySchedule?: import('./deliveryCalendar').DeliveryScheduleResult;
}> {
  if (!db) {
    throw new PersistenceUnavailableError();
  }

  // 1. Authoritative Validation (Prior to Transaction)
  const customer = validateCustomerDetails(payload);

  // 3. Stable IDs and Tokens Generated Outside Retryable Callback
  const resolvedKey = idempotencyKey?.trim() || crypto.randomUUID();
  const payloadHash = hashPayload(payload);
  const orderId = generateOrderId();
  const isGuest = !uid;
  const { token: rawClaimToken, hash: claimTokenHash } = isGuest ? generateClaimToken() : { token: null, hash: null };
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  // Capture configuration once outside the retryable transaction. Disabled historical events stay disabled.
  const notificationConfig = getN8nOrderDispatchConfig();

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
  if (rewardId && !uid) {
    throw new ValidationError('Please sign in to use a patron reward.', 'REWARD_REQUIRES_AUTH');
  }
  if (rewardId && uid) {
    rewardRef = db.collection('users').doc(uid).collection('activeRewards').doc(rewardId);
  }

  const result = await db.runTransaction(async (transaction: any) => {
    // --- STEP 1: READ PHASE (ALL READS MUST PRECEDE ALL WRITES) ---
    const intentSnap = await transaction.get(idempotencyRef);
    if (intentSnap.exists) {
      const intentData = intentSnap.data() as IdempotencyRecord;
      const currentHashMatches = intentData.payloadHash === payloadHash;
      const legacyHashMatches = !currentHashMatches && intentData.payloadHash === hashLegacyCheckoutPayload(payload);
      if (!currentHashMatches && !legacyHashMatches) {
        throw new IdempotencyConflictError();
      }
      // A cached intent alone is not proof of persistence. Return the canonical saved receipt.
      const savedOrderSnap = await transaction.get(db.collection('orders').doc(intentData.orderId));
      const savedOrder = savedOrderSnap.exists ? savedOrderSnap.data() as CanonicalOrder : null;
      if (!savedOrder || savedOrder.orderId !== intentData.orderId || !Array.isArray(savedOrder.items) || !savedOrder.items.length
        || !savedOrder.totals || !['subtotal', 'discount', 'shipping', 'total'].every(key =>
          typeof savedOrder.totals[key] === 'number' && Number.isFinite(savedOrder.totals[key]) && savedOrder.totals[key] >= 0)) {
        throw new PersistenceUnavailableError('The saved checkout receipt could not be verified. Please contact order support.');
      }
      if ((savedOrder.uid ?? null) !== (uid ?? null)) {
        throw new ValidationError('This checkout attempt belongs to another customer session.', 'IDEMPOTENCY_OWNER_MISMATCH');
      }
      if (legacyHashMatches) {
        // Every canonical wholesale creation path assigns zero earned points. Positive persisted
        // earned points therefore prove retail; zero/missing points cannot prove either mode.
        const savedWholesale = typeof savedOrder.isWholesale === 'boolean' ? savedOrder.isWholesale
          : Number.isFinite(savedOrder.earnedPoints) && savedOrder.earnedPoints > 0 ? false : null;
        const savedSlot = typeof savedOrder.customer?.deliverySlot === 'string'
          ? savedOrder.customer.deliverySlot.trim() || 'Fastest Dispatch' : 'Fastest Dispatch';
        if (savedWholesale === null || savedWholesale !== Boolean(payload.isWholesale)
          || savedSlot !== (payload.deliverySlot?.trim() || 'Fastest Dispatch')) throw new IdempotencyConflictError();
      }
      return {
        isDuplicate: true,
        orderId: savedOrder.orderId,
        whatsappMessage: generateAuthoritativeWhatsAppMessage(savedOrder),
        totals: savedOrder.totals,
        items: savedOrder.items,
        claimToken: intentData.response.claimToken || null,
        uid: savedOrder.uid ?? null,
        deliverySchedule: savedOrder.deliverySchedule,
      };
    }

    // New orders use current canonical pricing. Saved idempotent receipts are returned before repricing,
    // including when the catalog or a previously expected quote has changed after persistence.
    const validated = validateAndPriceOrder({
      items: payload.items,
      shippingMethodId: payload.shippingMethodId,
      discountCode: payload.discountCode,
      giftWrapping: payload.giftWrapping,
      isWholesale: Boolean(payload.isWholesale),
      city: customer.city,
    });
    if (expectedFinalTotal !== undefined && expectedFinalTotal !== null && Math.abs(expectedFinalTotal - validated.summary.total) > 1) {
      throw new QuoteChangedError(
        `Prices or delivery rates have been refreshed. New total is Rs. ${validated.summary.total.toLocaleString('en-PK')}. Please reconfirm your order.`,
        validated.summary, validated.items,
      );
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
      validateShippingRewardDestination(rewardData, customer.city);
      // Benefits are not implemented in the canonical pricing/packing engine yet.
      // Never consume a patron's reward without actually granting its advertised benefit.
      throw new ValidationError('This reward cannot yet be applied at checkout. Your reward remains available.', 'REWARD_APPLICATION_UNAVAILABLE');
    }

    const deliverySchedule = calculateDeliverySchedule({
      shippingMethodId: (payload.shippingMethodId as any) || 'standard',
      city: customer.city,
      orderSubtotalNet: validated.summary.discountedSubtotal,
      giftWrapFee: validated.summary.giftWrapFee,
      shippingWeightGrams: validated.summary.shippingWeightGrams,
      orderTimestamp: nowMs,
    });

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
      isWholesale: Boolean(payload.isWholesale),
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
      deliverySchedule,
      items: validated.items,
      totals: validated.summary,
      couponCode: couponCode || null,
      couponDiscount: validated.summary.discount,
      rewardId: rewardId || null,
      rewardDiscount: 0,
      earnedPoints: validated.earnedPoints,
      pointsAwarded: false,
    };

    const whatsappMessage = generateAuthoritativeWhatsAppMessage(canonicalOrder);

    // Write Order
    transaction.set(orderRef, canonicalOrder);
    const phoneIndex = buildWhatsAppPhoneIndex(canonicalOrder);
    transaction.set(db.collection('whatsappPhoneOrders').doc(phoneIndex.phoneKey).collection('orders').doc(phoneIndex.orderId), phoneIndex.data);

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
        uid: uid || null,
        deliverySchedule,
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
      deliveryState: notificationConfig.enabled ? 'PENDING' : 'DISABLED',
      attempts: 0,
      ...(notificationConfig.enabled ? { nextAttemptAtMs: nowMs } : { disabledReason: notificationConfig.reason || 'ORDER_WEBHOOK_DISABLED' }),
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
      uid: uid || null,
      deliverySchedule,
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
interface CanonicalStatusMutation {
  db: Firestore;
  orderId: string;
  status: OrderStatus;
  reason?: string;
  expectedStatus?: OrderStatus;
  expectedUpdatedAt?: string;
  actorUid: string;
  actorEmail?: string;
  sheetCommand?: SheetStatusCommand;
}

async function mutateCanonicalOrderStatus({
  db,
  orderId,
  status,
  reason,
  expectedStatus,
  expectedUpdatedAt,
  actorUid,
  actorEmail,
  sheetCommand
}: CanonicalStatusMutation): Promise<{ order: CanonicalOrder; sheetResult?: SheetStatusResult }> {
  if (!db) {
    throw new PersistenceUnavailableError();
  }

  if (!CANONICAL_ORDER_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid order status: ${status}`, 'INVALID_STATUS');
  }

  const orderRef = db.collection('orders').doc(orderId);
  const requestRef = sheetCommand ? db.collection('integrationStatusRequests').doc(sheetStatusRequestKey(sheetCommand.eventId)) : null;
  const commandHash = sheetCommand ? sheetStatusPayloadHash(sheetCommand) : null;
  const statusConfig = getN8nStatusDispatchConfig();

  return await db.runTransaction(async (transaction) => {
    // READ PHASE
    const requestSnap = requestRef ? await transaction.get(requestRef) : null;
    const snap = await transaction.get(orderRef);
    if (requestSnap?.exists && requestSnap.data()?.payloadHash !== commandHash) {
      const current = snap.exists ? snap.data() as CanonicalOrder : null;
      throw new SheetStatusError('INTEGRATION_EVENT_CONFLICT', 409,
        current ? { status: current.status, updatedAt: current.updatedAt || current.createdAt } : undefined);
    }
    if (!snap.exists) {
      if (sheetCommand) throw new SheetStatusError('ORDER_NOT_FOUND', 404);
      throw new ValidationError('Order not found.', 'ORDER_NOT_FOUND');
    }

    const order = snap.data() as CanonicalOrder;
    const canonicalRevision = order.updatedAt || order.createdAt;
    if (requestSnap?.exists) {
      const stored = requestSnap.data();
      if (stored?.source !== 'google_sheet' || stored?.eventId !== sheetCommand!.eventId
        || stored?.result?.ok !== true || stored?.result?.eventId !== sheetCommand!.eventId
        || stored?.result?.orderId !== orderId || !CANONICAL_ORDER_STATUSES.includes(stored?.result?.status)
        || typeof stored?.result?.updatedAt !== 'string' || !Number.isFinite(Date.parse(stored.result.updatedAt))) throw new SheetStatusError('INVALID_STORED_STATUS_RESULT', 503);
      return { order, sheetResult: { ok: true, eventId: sheetCommand!.eventId, orderId,
        status: stored.result.status, updatedAt: stored.result.updatedAt, duplicate: true } };
    }

    if (expectedStatus && order.status !== expectedStatus) {
      if (sheetCommand) throw new SheetStatusError('ORDER_CONFLICT', 409, { status: order.status, updatedAt: canonicalRevision });
      throw new ValidationError(
        `Order status was modified by another session (expected "${expectedStatus}", found "${order.status}"). Please refresh.`,
        'STATUS_CONFLICT'
      );
    }

    if (expectedUpdatedAt !== undefined && canonicalRevision !== expectedUpdatedAt) {
      if (sheetCommand) throw new SheetStatusError('ORDER_CONFLICT', 409, { status: order.status, updatedAt: canonicalRevision });
      throw new ValidationError('This order was modified by another session. Please refresh.', 'ORDER_CONFLICT');
    }

    if (order.status === status) {
      const sheetResult: SheetStatusResult | undefined = sheetCommand ? { ok: true, eventId: sheetCommand.eventId,
        orderId, status: order.status, updatedAt: canonicalRevision, duplicate: false } : undefined;
      if (requestRef) transaction.set(requestRef, { source: 'google_sheet', eventId: sheetCommand!.eventId,
        payloadHash: commandHash, result: sheetResult, appliedAtMs: Date.now() });
      return { order, ...(sheetResult ? { sheetResult } : {}) }; // No repeated effects for a no-op.
    }

    // Read user document BEFORE any writes if loyalty points will be modified
    let userSnap: any = null;
    let userRef: any = null;
    if (order.uid && (order.earnedPoints || 0) > 0) {
      userRef = db.collection('users').doc(order.uid);
      userSnap = await transaction.get(userRef);
    }

    // WRITE PHASE
    // Every status mutation advances the same revision used by notes/payment, even within one millisecond.
    // Compute inside the transaction so Firestore retries obtain a fresh authoritative revision.
    const previousTime = Number.isFinite(order.updatedAtMs) ? order.updatedAtMs : Date.parse(order.updatedAt || order.createdAt) || 0;
    const now = Math.max(Date.now(), previousTime + 1);
    const nowIso = new Date(now).toISOString();
    const oldStatus = order.status;
    const auditRef = db.collection('orderAudits').doc(`${orderId}_${now}`);
    const auditData = {
      orderId,
      previousStatus: oldStatus,
      newStatus: status,
      reason: reason || 'Admin status adjustment',
      actorUid,
      actorEmail: actorEmail || 'admin',
      source: sheetCommand ? 'google_sheet' : 'admin',
      ...(sheetCommand ? { requestEventId: sheetCommand.eventId } : {}),
      timestamp: now,
      timestampIso: nowIso,
    };

    // Loyalty Ledger Updates (Award points ONLY on DELIVERED, exactly once)
    let pointsAwardedNew = order.pointsAwarded || false;
    if (status === 'DELIVERED' && !order.pointsAwarded && order.uid && (order.earnedPoints || 0) > 0) {
      // Award loyalty points exactly once
      const loyaltyRef = db.collection('users').doc(order.uid).collection('loyaltyTransactions').doc(`ORDER_${orderId}`);
      transaction.set(loyaltyRef, {
        points: order.earnedPoints,
        type: 'EARNED',
        orderId,
        description: `Earned from Order #${orderId}`,
        createdAt: now,
      });

      const currentPts = userSnap && userSnap.exists ? (userSnap.data()?.loyaltyPoints || 0) : 0;
      transaction.set(userRef, { loyaltyPoints: currentPts + order.earnedPoints }, { merge: true });
      pointsAwardedNew = true;
    } else if (status === 'CANCELLED' && order.pointsAwarded && order.uid && (order.earnedPoints || 0) > 0) {
      // Reverse loyalty points if order was previously delivered and now cancelled
      const reverseRef = db.collection('users').doc(order.uid).collection('loyaltyTransactions').doc(`REV_${orderId}`);
      transaction.set(reverseRef, {
        points: -order.earnedPoints,
        type: 'REVERSED',
        orderId,
        description: `Points reversed due to Order #${orderId} cancellation`,
        createdAt: now,
      });

      const currentPts = userSnap && userSnap.exists ? (userSnap.data()?.loyaltyPoints || 0) : 0;
      transaction.set(userRef, { loyaltyPoints: Math.max(0, currentPts - order.earnedPoints) }, { merge: true });
      pointsAwardedNew = false;
    }

    const updatedOrder: CanonicalOrder = { ...order, status, pointsAwarded: pointsAwardedNew,
      updatedAt: nowIso, updatedAtMs: now };
    const eventId = `${orderId}_STATUS_${status}_${now}`;
    // Status events have a separate receiver. The immutable snapshot cannot race a newer order revision.
    const eventRef = db.collection('orderEvents').doc(eventId);
    transaction.set(eventRef, {
      eventId,
      orderId,
      eventType: 'ORDER_STATUS_CHANGED',
      schemaVersion: SCHEMA_VERSION,
      occurredAt: nowIso,
      occurredAtMs: now,
      deliveryState: statusConfig.enabled ? 'PENDING' : 'DISABLED',
      attempts: 0,
      ...(statusConfig.enabled ? { nextAttemptAtMs: now } : { disabledReason: statusConfig.reason || 'STATUS_WEBHOOK_DISABLED' }),
      payload: { oldStatus, newStatus: status, actorUid, reason: reason || 'Admin status adjustment',
        order: { orderId, status, updatedAt: nowIso }, statusRevision: nowIso },
    });

    const notification = buildWhatsAppStatusNotification(updatedOrder, eventId, now);
    transaction.set(db.collection('whatsappNotificationJobs').doc(notification.id), notification.data);

    transaction.set(auditRef, auditData);
    transaction.update(orderRef, {
      status,
      pointsAwarded: pointsAwardedNew,
      updatedAt: nowIso,
      updatedAtMs: now,
    });

    const sheetResult: SheetStatusResult | undefined = sheetCommand ? { ok: true, eventId: sheetCommand.eventId,
      orderId, status, updatedAt: nowIso, duplicate: false } : undefined;
    if (requestRef) transaction.set(requestRef, { source: 'google_sheet', eventId: sheetCommand!.eventId,
      payloadHash: commandHash, result: sheetResult, appliedAtMs: now });
    return { order: updatedOrder, ...(sheetResult ? { sheetResult } : {}) };
  });
}

/** Both Admin and Sheet commands use the same canonical status, audit, loyalty and notification transaction. */
export async function updateAdminOrderStatus(input: Omit<CanonicalStatusMutation, 'sheetCommand'>): Promise<CanonicalOrder> {
  return (await mutateCanonicalOrderStatus(input)).order;
}

export async function applySheetStatusCommand({ db, command }: { db: Firestore | null; command: SheetStatusCommand }): Promise<SheetStatusResult> {
  if (!db) throw new SheetStatusError('PERSISTENCE_UNAVAILABLE', 503);
  const verified = validateSheetStatusCommand(command);
  const result = await mutateCanonicalOrderStatus({ db, orderId: verified.orderId, status: verified.status,
    expectedStatus: verified.expectedStatus, expectedUpdatedAt: verified.expectedUpdatedAt, reason: verified.reason,
    actorUid: 'n8n_sheet', actorEmail: 'n8n_sheet', sheetCommand: verified });
  return result.sheetResult!;
}
