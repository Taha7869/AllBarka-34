import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { AdminNoteEntry, CanonicalOrder, OrderStatus, PaymentStatus } from './serverOrderService';
import { resolveHamper } from './hamperCatalog';

export const ADMIN_SCAN_LIMIT = 5000;
export const ADMIN_STATUSES: OrderStatus[] = ['NEW', 'ORDER_RECEIVED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
export const ADMIN_PAYMENT_STATUSES: PaymentStatus[] = ['UNPAID', 'PAID', 'REFUNDED'];

export class AdminOperationError extends Error {
  constructor(message: string, public code: string, public httpStatus = 400) {
    super(message);
    this.name = 'AdminOperationError';
  }
}

export function hasAdminClaim(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false;
  const claims = user as { admin?: unknown; role?: unknown };
  return claims.admin === true || claims.role === 'admin';
}

export function validateAdminOrderId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{5,100}$/.test(value)) {
    throw new AdminOperationError('A valid order ID is required.', 'INVALID_ORDER_ID');
  }
  return value;
}

function requireDatabase(db: Firestore | null): asserts db is Firestore {
  if (!db) throw new AdminOperationError('Durable database unavailable.', 'DB_UNAVAILABLE', 503);
}

function requiredText(value: unknown, label: string, min: number, max: number, code: string): string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new AdminOperationError(`${label} must contain ${min} to ${max} characters.`, code);
  }
  return value.trim();
}

export function validateAdminRevision(value: unknown): string {
  if (typeof value !== 'string' || value.length > 50 || !Number.isFinite(Date.parse(value))) {
    throw new AdminOperationError('The current order revision is required. Refresh the order.', 'INVALID_REVISION');
  }
  return value;
}

export function validateAdminStatusInput(input: any): { status: OrderStatus; expectedStatus: OrderStatus; expectedUpdatedAt: string; reason: string } {
  if (!ADMIN_STATUSES.includes(input?.status)) throw new AdminOperationError('Invalid order status.', 'INVALID_STATUS');
  if (!ADMIN_STATUSES.includes(input?.expectedStatus)) throw new AdminOperationError('Current expected status is required.', 'INVALID_EXPECTED_STATUS');
  const reason = requiredText(input.reason, 'Reason', 3, 500, 'INVALID_REASON');
  return { status: input.status, expectedStatus: input.expectedStatus, reason,
    expectedUpdatedAt: validateAdminRevision(input.expectedUpdatedAt) };
}

export interface AdminOrderFilters {
  page: number;
  limit: number;
  status: 'ALL' | OrderStatus;
  paymentStatus: 'ALL' | PaymentStatus;
  paymentMethod: 'ALL' | 'cod' | 'bank';
  range: 'all' | 'today' | '7d' | '30d';
  queue: 'all' | 'new' | 'packing' | 'transit' | 'bank-pending';
  search: string;
}

function queryString(value: unknown, fallback: string, maxLength = 200): string {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new AdminOperationError('Invalid order filter.', 'INVALID_FILTER');
  }
  return value.trim();
}

function queryInteger(value: unknown, fallback: number, max: number): number {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d{1,8}$/.test(value) || Number(value) < 1) {
    throw new AdminOperationError('Invalid pagination.', 'INVALID_PAGINATION');
  }
  return Math.min(Number(value), max);
}

export function parseAdminOrderFilters(query: Record<string, unknown>): AdminOrderFilters {
  const status = queryString(query.status, 'ALL');
  const paymentStatus = queryString(query.paymentStatus, 'ALL');
  const paymentMethod = queryString(query.paymentMethod, 'ALL');
  const range = queryString(query.range, 'all');
  const queue = queryString(query.queue, 'all');
  if (!(status === 'ALL' || ADMIN_STATUSES.includes(status as OrderStatus)) ||
      !(paymentStatus === 'ALL' || ADMIN_PAYMENT_STATUSES.includes(paymentStatus as PaymentStatus)) ||
      !['ALL', 'cod', 'bank'].includes(paymentMethod) || !['all', 'today', '7d', '30d'].includes(range) ||
      !['all', 'new', 'packing', 'transit', 'bank-pending'].includes(queue)) {
    throw new AdminOperationError('Invalid order filter.', 'INVALID_FILTER');
  }
  return { page: queryInteger(query.page, 1, 99999999), limit: queryInteger(query.limit, 15, 50),
    status, paymentStatus, paymentMethod, range, queue, search: queryString(query.search, '') } as AdminOrderFilters;
}

export type AdminOrder = Omit<CanonicalOrder, 'guestSessionId' | 'claimTokenHash' | 'claimTokenExpiry' | 'claimStatus'>;

/** Explicit allowlist: Firestore may contain private fields added by other integrations. */
export function sanitizeOrderForAdmin(order: CanonicalOrder): AdminOrder {
  const customer = order.customer || {} as CanonicalOrder['customer'];
  const gifting = order.gifting || {} as CanonicalOrder['gifting'];
  const totals = order.totals || {} as CanonicalOrder['totals'];
  return {
    schemaVersion: order.schemaVersion, orderId: order.orderId, source: order.source,
    createdAt: order.createdAt, createdAtMs: order.createdAtMs,
    updatedAt: order.updatedAt || order.createdAt,
    updatedAtMs: order.updatedAtMs || order.createdAtMs,
    status: order.status, paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod,
    uid: order.uid, claimedAt: order.claimedAt,
    customer: { name: customer.name, phone: customer.phone, address: customer.address,
      city: customer.city, deliverySlot: customer.deliverySlot, instructions: customer.instructions },
    gifting: { giftWrapping: gifting.giftWrapping, giftMessage: gifting.giftMessage, giftWrapFee: gifting.giftWrapFee },
    deliverySchedule: order.deliverySchedule,
    items: (Array.isArray(order.items) ? order.items : []).map(item => {
      const hamper = item.productId === 'custom-hamper' ? resolveHamper(item.hamperConfiguration) : null;
      return { id: item.id, productId: item.productId, name: item.name, selectedWeight: item.selectedWeight,
        quantity: item.quantity, price: item.price, earnedPoints: item.earnedPoints,
        ...(hamper ? { hamperConfiguration: hamper.configuration } : {}) };
    }),
    totals: { subtotal: totals.subtotal, discount: totals.discount, discountedSubtotal: totals.discountedSubtotal,
      shipping: totals.shipping, giftWrapFee: totals.giftWrapFee, total: totals.total,
      ...(typeof totals.shippingWeightGrams === 'number' && Number.isSafeInteger(totals.shippingWeightGrams) && totals.shippingWeightGrams >= 0 ? { shippingWeightGrams: totals.shippingWeightGrams } : {}),
      ...(totals.shippingRegion === 'lahore' || totals.shippingRegion === 'nationwide' ? { shippingRegion: totals.shippingRegion } : {}) },
    couponCode: order.couponCode, couponDiscount: order.couponDiscount,
    rewardId: order.rewardId, rewardDiscount: order.rewardDiscount,
    earnedPoints: order.earnedPoints, pointsAwarded: order.pointsAwarded,
    adminNotes: (Array.isArray(order.adminNotes) ? order.adminNotes : []).filter(note => typeof note === 'string'),
    adminNoteEntries: (Array.isArray(order.adminNoteEntries) ? order.adminNoteEntries : []).map(note => ({
      id: note.id, text: note.text, actorUid: note.actorUid, actorEmail: note.actorEmail,
      timestamp: note.timestamp, timestampIso: note.timestampIso,
    })),
  };
}

function orderTime(order: CanonicalOrder): number {
  return Number.isFinite(order.createdAtMs) ? order.createdAtMs : Date.parse(order.createdAt) || 0;
}

function rangeStart(range: AdminOrderFilters['range'], now: number): number {
  if (range === 'all') return 0;
  if (range === 'today') {
    // Pakistan has a fixed UTC+05 offset; a server in another timezone must use Lahore's day.
    const local = new Date(now + 5 * 60 * 60 * 1000);
    return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 5 * 60 * 60 * 1000;
  }
  return now - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000;
}

export function filterAdminOrders(orders: CanonicalOrder[], filters: AdminOrderFilters, now = Date.now()): CanonicalOrder[] {
  const search = filters.search.toLocaleLowerCase();
  const phoneSearch = search.replace(/[^\d]/g, '');
  const start = rangeStart(filters.range, now);
  return orders.filter(order => {
    if (filters.queue === 'new' && !['NEW', 'ORDER_RECEIVED'].includes(order.status)) return false;
    if (filters.queue === 'packing' && order.status !== 'PREPARING') return false;
    if (filters.queue === 'transit' && !['DISPATCHED', 'OUT_FOR_DELIVERY'].includes(order.status)) return false;
    if (filters.queue === 'bank-pending' && (order.paymentMethod !== 'bank' || order.paymentStatus !== 'UNPAID' || order.status === 'CANCELLED')) return false;
    if (filters.status !== 'ALL' && order.status !== filters.status) return false;
    if (filters.paymentStatus !== 'ALL' && order.paymentStatus !== filters.paymentStatus) return false;
    if (filters.paymentMethod !== 'ALL' && order.paymentMethod !== filters.paymentMethod) return false;
    if (filters.range !== 'all' && (orderTime(order) < start || orderTime(order) > now)) return false;
    if (!search) return true;
    const text = [order.orderId, order.customer?.name, order.customer?.phone, order.customer?.city,
      order.customer?.address, ...(order.items || []).map(item => item.name)].filter(Boolean).join(' ').toLocaleLowerCase();
    return text.includes(search) || (phoneSearch.length >= 3 && /^\+?[\d\s()-]+$/.test(search) &&
      (order.customer?.phone || '').replace(/[^\d]/g, '').includes(phoneSearch));
  }).sort((a, b) => orderTime(b) - orderTime(a) || b.orderId.localeCompare(a.orderId));
}

export interface AdminOrderMetrics {
  count: number; activeCount: number; deliveredCount: number; cancelledCount: number;
  orderValue: number; paidValue: number; unpaidValue: number; bankPendingCount: number;
  statusCounts: Record<OrderStatus, number>;
}

export function adminOrderMetrics(orders: CanonicalOrder[]): AdminOrderMetrics {
  const metrics: AdminOrderMetrics = { count: orders.length, activeCount: 0, deliveredCount: 0, cancelledCount: 0,
    orderValue: 0, paidValue: 0, unpaidValue: 0, bankPendingCount: 0,
    statusCounts: Object.fromEntries(ADMIN_STATUSES.map(status => [status, 0])) as Record<OrderStatus, number> };
  for (const order of orders) {
    if (ADMIN_STATUSES.includes(order.status)) metrics.statusCounts[order.status]++;
    if (order.status === 'CANCELLED') { metrics.cancelledCount++; continue; }
    if (order.status === 'DELIVERED') metrics.deliveredCount++;
    else metrics.activeCount++;
    const total = typeof order.totals?.total === 'number' && Number.isFinite(order.totals.total) && order.totals.total > 0 ? order.totals.total : 0;
    metrics.orderValue += total;
    if (order.paymentStatus === 'PAID') metrics.paidValue += total;
    if (order.paymentStatus === 'UNPAID') {
      metrics.unpaidValue += total;
      if (order.paymentMethod === 'bank') metrics.bankPendingCount++;
    }
  }
  for (const key of ['orderValue', 'paidValue', 'unpaidValue'] as const) metrics[key] = Math.round(metrics[key] * 100) / 100;
  return metrics;
}

/** Bound reads to the newest 5,000 orders plus a sentinel; totals disclose incomplete coverage. */
export async function listAdminOrders(db: Firestore | null, filters: AdminOrderFilters, exportAll = false) {
  requireDatabase(db);
  const now = Date.now();
  const snap = await db.collection('orders').orderBy('createdAtMs', 'desc').limit(ADMIN_SCAN_LIMIT + 1).get();
  const scanned = snap.docs.slice(0, ADMIN_SCAN_LIMIT).map(doc => ({ ...doc.data(), orderId: doc.id }) as CanonicalOrder);
  const matching = filterAdminOrders(scanned, filters, now);
  const totalCount = matching.length;
  const totalPages = Math.ceil(totalCount / filters.limit) || 1;
  const page = Math.min(filters.page, totalPages);
  return { orders: (exportAll ? matching : matching.slice((page - 1) * filters.limit, page * filters.limit)).map(sanitizeOrderForAdmin),
    page, limit: exportAll ? ADMIN_SCAN_LIMIT : filters.limit, totalCount, totalPages: exportAll ? 1 : totalPages,
    metrics: adminOrderMetrics(matching), scannedCount: scanned.length, truncated: snap.docs.length > ADMIN_SCAN_LIMIT,
    asOf: new Date(now).toISOString() };
}

function sanitizeAudit(id: string, audit: any) {
  return { id, orderId: audit.orderId, action: audit.action || 'STATUS_CHANGED',
    previousStatus: audit.previousStatus, newStatus: audit.newStatus,
    previousPaymentStatus: audit.previousPaymentStatus, newPaymentStatus: audit.newPaymentStatus,
    noteId: audit.noteId, note: audit.note, reason: audit.reason,
    actorUid: audit.actorUid, actorEmail: audit.actorEmail,
    timestamp: audit.timestamp, timestampIso: audit.timestampIso };
}

export async function getAdminOrder(db: Firestore | null, rawOrderId: unknown) {
  requireDatabase(db);
  const orderId = validateAdminOrderId(rawOrderId);
  const snap = await db.collection('orders').doc(orderId).get();
  if (!snap.exists) throw new AdminOperationError('Order not found.', 'ORDER_NOT_FOUND', 404);
  const auditsSnap = await db.collection('orderAudits').where('orderId', '==', orderId).get();
  const audits = auditsSnap.docs.map(doc => sanitizeAudit(doc.id, doc.data())).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return { order: sanitizeOrderForAdmin({ ...snap.data(), orderId } as CanonicalOrder), audits };
}

interface AdminMutation {
  db: Firestore | null; orderId: unknown; expectedUpdatedAt: unknown; actorUid: string; actorEmail?: string;
}

function mutationInput(input: AdminMutation) {
  requireDatabase(input.db);
  const orderId = validateAdminOrderId(input.orderId);
  const expectedUpdatedAt = validateAdminRevision(input.expectedUpdatedAt);
  if (typeof input.actorUid !== 'string' || !input.actorUid.trim()) throw new AdminOperationError('Admin identity required.', 'FORBIDDEN_ADMIN', 403);
  return { orderId, expectedUpdatedAt, actorUid: input.actorUid,
    actorEmail: input.actorEmail || 'admin' };
}

function assertRevision(order: CanonicalOrder, expectedUpdatedAt: string) {
  if ((order.updatedAt || order.createdAt) !== expectedUpdatedAt) {
    throw new AdminOperationError('This order was changed by another session. Refresh before saving.', 'ORDER_CONFLICT', 409);
  }
}

function revisionTime(order: CanonicalOrder) {
  const previous = Number.isFinite(order.updatedAtMs) ? order.updatedAtMs : Date.parse(order.updatedAt || order.createdAt) || 0;
  const timestamp = Math.max(Date.now(), previous + 1);
  return { timestamp, timestampIso: new Date(timestamp).toISOString() };
}

export async function addAdminOrderNote(input: AdminMutation & { note: unknown }): Promise<AdminOrder> {
  const actor = mutationInput(input);
  const text = requiredText(input.note, 'Note', 1, 1000, 'INVALID_NOTE');
  const db = input.db!;
  const orderRef = db.collection('orders').doc(actor.orderId);
  const id = crypto.randomUUID();
  return db.runTransaction(async transaction => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists) throw new AdminOperationError('Order not found.', 'ORDER_NOT_FOUND', 404);
    const order = { ...snap.data(), orderId: actor.orderId } as CanonicalOrder;
    assertRevision(order, actor.expectedUpdatedAt);
    const existing = Array.isArray(order.adminNoteEntries) ? order.adminNoteEntries : [];
    const legacyCount = Array.isArray(order.adminNotes) ? order.adminNotes.length : 0;
    if (existing.length + legacyCount >= 100) throw new AdminOperationError('This order has reached its 100-note limit.', 'NOTE_LIMIT_REACHED');
    const clock = revisionTime(order);
    const note: AdminNoteEntry = { id, text, actorUid: actor.actorUid, actorEmail: actor.actorEmail, ...clock };
    const update = { adminNoteEntries: [...existing, note], updatedAt: clock.timestampIso, updatedAtMs: clock.timestamp };
    transaction.update(orderRef, update);
    transaction.set(db.collection('orderAudits').doc(`${actor.orderId}_NOTE_${id}`), {
      orderId: actor.orderId, action: 'NOTE_ADDED', noteId: id, note: text,
      actorUid: actor.actorUid, actorEmail: actor.actorEmail, ...clock,
    });
    return sanitizeOrderForAdmin({ ...order, ...update });
  });
}

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  UNPAID: ['PAID'], PAID: ['UNPAID', 'REFUNDED'], REFUNDED: ['PAID'],
};

/** A bookkeeping record only: never charges, refunds, reprices, or updates loyalty. */
export async function updateAdminOrderPayment(input: AdminMutation & {
  paymentStatus: unknown; expectedPaymentStatus: unknown; reason: unknown;
}): Promise<AdminOrder> {
  const actor = mutationInput(input);
  const paymentStatus = input.paymentStatus as PaymentStatus;
  const expectedPaymentStatus = input.expectedPaymentStatus as PaymentStatus;
  if (!ADMIN_PAYMENT_STATUSES.includes(paymentStatus) || !ADMIN_PAYMENT_STATUSES.includes(expectedPaymentStatus)) {
    throw new AdminOperationError('Valid new and expected payment statuses are required.', 'INVALID_PAYMENT_STATUS');
  }
  const reason = requiredText(input.reason, 'Reason', 3, 500, 'INVALID_REASON');
  const db = input.db!;
  const orderRef = db.collection('orders').doc(actor.orderId);
  const auditId = crypto.randomUUID();
  return db.runTransaction(async transaction => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists) throw new AdminOperationError('Order not found.', 'ORDER_NOT_FOUND', 404);
    const order = { ...snap.data(), orderId: actor.orderId } as CanonicalOrder;
    if (order.paymentStatus !== expectedPaymentStatus) {
      throw new AdminOperationError('Payment status changed in another session. Refresh before saving.', 'PAYMENT_CONFLICT', 409);
    }
    assertRevision(order, actor.expectedUpdatedAt);
    if (order.paymentStatus === paymentStatus) return sanitizeOrderForAdmin(order);
    if (!PAYMENT_TRANSITIONS[order.paymentStatus]?.includes(paymentStatus)) {
      throw new AdminOperationError('That payment correction is not allowed.', 'INVALID_PAYMENT_TRANSITION');
    }
    const clock = revisionTime(order);
    const update = { paymentStatus, updatedAt: clock.timestampIso, updatedAtMs: clock.timestamp };
    transaction.update(orderRef, update);
    transaction.set(db.collection('orderAudits').doc(`${actor.orderId}_PAYMENT_${auditId}`), {
      orderId: actor.orderId, action: 'PAYMENT_STATUS_CHANGED',
      previousPaymentStatus: order.paymentStatus, newPaymentStatus: paymentStatus, reason,
      actorUid: actor.actorUid, actorEmail: actor.actorEmail, ...clock,
    });
    return sanitizeOrderForAdmin({ ...order, ...update });
  });
}
