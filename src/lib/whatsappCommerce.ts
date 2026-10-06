import { sanitizeFirestoreData } from './firestoreData';
import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { CanonicalOrder } from './serverOrderService';
import { storedOrderStatus } from './orderStatuses';

/** No outbound templates: every send is gated by the authenticated customer's service window. */
export const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;
export const WHATSAPP_WINDOW_MARGIN_MS = 60 * 1000;
export const WHATSAPP_SEND_LEASE_MS = 30 * 1000;
const FUTURE_TOLERANCE_MS = 30 * 1000;
const MAX_META_BYTES = 96 * 1024;
const MAX_BATCH_MESSAGES = 25;

export class WhatsAppIntegrationError extends Error {
  constructor(public code: string, public statusCode = 400) { super(code); this.name = 'WhatsAppIntegrationError'; }
}

export interface WhatsAppIntegrationConfig {
  enabled: boolean;
  appSecret: string;
  businessPhoneId: string;
  disabledReason?: string;
}

export function getWhatsAppIntegrationConfig(env: Record<string, string | undefined> = process.env): WhatsAppIntegrationConfig {
  const appSecret = env.WHATSAPP_META_APP_SECRET?.trim() || '';
  const businessPhoneId = env.WHATSAPP_BUSINESS_PHONE_ID?.trim() || '';
  const configured = appSecret.length >= 16 && /^\d{5,30}$/.test(businessPhoneId);
  const parentVerified = env.WHATSAPP_PARENT_VERIFIED === 'true';
  return { enabled: configured && parentVerified, appSecret, businessPhoneId,
    ...(!configured ? { disabledReason: 'META_SIGNATURE_CONFIG_MISSING' } : !parentVerified ? { disabledReason: 'META_PARENT_NOT_VERIFIED' } : {}) };
}

export function normalizeWhatsAppPhone(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[+\d\s().-]{7,32}$/.test(value)) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^03\d{9}$/.test(digits)) digits = `92${digits.slice(1)}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export const whatsappDocumentKey = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');
const phoneKey = (phone: string) => whatsappDocumentKey(`whatsapp-phone:${phone}`);
const messageKey = (id: string) => whatsappDocumentKey(`meta-message:${id}`);
// Meta's wamid contains a base64 payload (including padding/slashes); IDs are hashed before becoming document paths.
const validId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_.:+/=-]{1,512}$/.test(value);

export interface AuthenticatedMetaMessage {
  messageId: string;
  sender: string;
  timestampMs: number;
  providerTimestampMs: number;
  text: string;
}

interface MetaDeliveryEvidence { providerMessageId: string; recipient: string; timestampMs: number; status: 'sent' | 'delivered' | 'read' | 'failed' }

/** Verify the actual original Meta bytes. n8n's normalized phone/signatureVerified booleans are never trusted. */
export function verifyMetaEnvelope(envelope: any, config: WhatsAppIntegrationConfig, nowMs = Date.now()): {
  messages: AuthenticatedMetaMessage[]; deliveryEvidence: MetaDeliveryEvidence[];
} {
  if (!config.enabled) throw new WhatsAppIntegrationError(config.disabledReason || 'WHATSAPP_INTEGRATION_DISABLED', 503);
  if (envelope?.source !== 'meta_parent' || typeof envelope.rawMetaBody !== 'string'
    || Buffer.byteLength(envelope.rawMetaBody, 'utf8') > MAX_META_BYTES
    || typeof envelope.metaSignature !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(envelope.metaSignature)) {
    throw new WhatsAppIntegrationError('INVALID_META_ENVELOPE');
  }
  const supplied = Buffer.from(envelope.metaSignature.slice(7), 'hex');
  const expected = crypto.createHmac('sha256', config.appSecret).update(envelope.rawMetaBody, 'utf8').digest();
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) throw new WhatsAppIntegrationError('META_SIGNATURE_INVALID', 401);
  let payload: any;
  try { payload = JSON.parse(envelope.rawMetaBody); } catch { throw new WhatsAppIntegrationError('INVALID_META_JSON'); }
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) throw new WhatsAppIntegrationError('INVALID_META_OBJECT');
  const messages: AuthenticatedMetaMessage[] = [], deliveryEvidence: MetaDeliveryEvidence[] = [];
  const providerTime = (value: unknown): number => {
    if (typeof value !== 'string' || !/^\d{9,12}$/.test(value)) throw new WhatsAppIntegrationError('INVALID_META_TIMESTAMP');
    const ms = Number(value) * 1000;
    if (!Number.isSafeInteger(ms) || ms <= 0 || ms > nowMs + FUTURE_TOLERANCE_MS) throw new WhatsAppIntegrationError('META_TIMESTAMP_IN_FUTURE');
    return ms;
  };
  for (const entry of payload.entry) {
    if (!Array.isArray(entry?.changes)) continue;
    for (const change of entry.changes) {
      const value = change?.value;
      if (change?.field !== 'messages' || value?.metadata?.phone_number_id !== config.businessPhoneId) continue;
      for (const message of Array.isArray(value.messages) ? value.messages : []) {
        const sender = normalizeWhatsAppPhone(message?.from);
        if (!validId(message?.id) || !sender) throw new WhatsAppIntegrationError('INVALID_META_MESSAGE');
        // Interactive replies may request tracking too; unsupported media still opens the genuine customer's window.
        const text = message.type === 'text' ? message.text?.body
          : message.type === 'interactive' ? message.interactive?.button_reply?.id || message.interactive?.list_reply?.id : '';
        if (text !== undefined && typeof text !== 'string') throw new WhatsAppIntegrationError('INVALID_META_MESSAGE');
        const providerTimestampMs = providerTime(message.timestamp);
        messages.push({ messageId: message.id, sender, providerTimestampMs, timestampMs: Math.min(providerTimestampMs, nowMs), text: (text || '').slice(0, 2000) });
      }
      for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
        const recipient = normalizeWhatsAppPhone(status?.recipient_id);
        if (!validId(status?.id) || !recipient || !['sent', 'delivered', 'read', 'failed'].includes(status.status)) continue;
        deliveryEvidence.push({ providerMessageId: status.id, recipient, timestampMs: Math.min(providerTime(status.timestamp), nowMs), status: status.status });
      }
    }
  }
  if (messages.length + deliveryEvidence.length > MAX_BATCH_MESSAGES) throw new WhatsAppIntegrationError('META_BATCH_TOO_LARGE');
  if (!messages.length && !deliveryEvidence.length) throw new WhatsAppIntegrationError('META_BUSINESS_PHONE_MISMATCH');
  return { messages, deliveryEvidence };
}

export interface WhatsAppWindowState {
  sender: string;
  senderKey: string;
  businessPhoneId: string;
  lastCustomerMessageAtMs: number;
  lastCustomerMessageId?: string;
  lastConsentMessageAtMs: number;
  optedOut: boolean;
}

export interface WhatsAppNotificationJob {
  eventId: string;
  kind: 'STATUS' | 'RECEIPT';
  orderId?: string;
  inboundMessageId?: string;
  senderKey: string;
  revision?: string;
  state: 'PENDING' | 'HELD' | 'LEASED' | 'SENDING' | 'ACCEPTED' | 'DELIVERED' | 'REJECTED' | 'UNKNOWN' | 'COALESCED' | 'OPTED_OUT';
  createdAtMs: number;
  updatedAtMs: number;
  attempts: number;
  nextAttemptAtMs?: number;
  leaseToken?: string;
  leaseExpiresAtMs?: number;
  providerMessageId?: string;
  reason?: string;
}

export function buildWhatsAppPhoneIndex(order: CanonicalOrder) {
  const sender = normalizeWhatsAppPhone(order.customer?.phone);
  if (!sender) throw new WhatsAppIntegrationError('CANONICAL_PHONE_INVALID');
  return { phoneKey: phoneKey(sender), orderId: order.orderId, data: { orderId: order.orderId, createdAtMs: order.createdAtMs } };
}

/** Call inside the existing canonical status transaction. Independent revision jobs preserve uncertain old sends. */
export function buildWhatsAppStatusNotification(order: CanonicalOrder, eventId: string, nowMs: number): { id: string; data: WhatsAppNotificationJob } {
  const sender = normalizeWhatsAppPhone(order.customer?.phone);
  if (!sender || !validId(eventId) || !order.updatedAt) throw new WhatsAppIntegrationError('INVALID_WHATSAPP_STATUS_EVENT');
  return { id: whatsappDocumentKey(`whatsapp-status:${eventId}`), data: {
    eventId, kind: 'STATUS', orderId: order.orderId, senderKey: phoneKey(sender), revision: order.updatedAt,
    state: 'PENDING', createdAtMs: nowMs, updatedAtMs: nowMs, nextAttemptAtMs: nowMs, attempts: 0,
  } };
}

function consentCommand(text: string): 'STOP' | 'START' | null {
  const exact = text.trim().toUpperCase();
  if (['STOP', 'UNSUBSCRIBE', 'بند', 'إيقاف', 'توقف'].includes(exact)) return 'STOP';
  if (['START', 'UNSTOP'].includes(exact)) return 'START';
  return null;
}

function windowAllowed(state: WhatsAppWindowState | undefined, nowMs: number, businessPhoneId?: string): boolean {
  return Boolean(state && (!businessPhoneId || state.businessPhoneId === businessPhoneId) && !state.optedOut
    && Number.isFinite(state.lastCustomerMessageAtMs) && state.lastCustomerMessageAtMs <= nowMs
    && nowMs < state.lastCustomerMessageAtMs + WHATSAPP_WINDOW_MS - WHATSAPP_WINDOW_MARGIN_MS);
}

const clearLease = (job: WhatsAppNotificationJob, state: WhatsAppNotificationJob['state'], nowMs: number, reason?: string): WhatsAppNotificationJob => {
  const { leaseToken: _token, leaseExpiresAtMs: _expires, nextAttemptAtMs: _next, ...rest } = job;
  return { ...rest, state, updatedAtMs: nowMs, ...(reason ? { reason } : {}) };
};

/** An old/replayed webhook never reopens the window. STOP survives unrelated messages and process restarts. */
export async function ingestMetaWebhook(db: Firestore, envelope: any, config = getWhatsAppIntegrationConfig(), options: { now?: () => number } = {}) {
  if (!db) throw new WhatsAppIntegrationError('PERSISTENCE_UNAVAILABLE', 503);
  const now = options.now ?? Date.now;
  const verified = verifyMetaEnvelope(envelope, config, now());
  let processed = 0, duplicates = 0, receiptsQueued = 0, deliveryEvidenceRecorded = 0;
  for (const message of verified.messages) {
    const result = await db.runTransaction(async transaction => {
      const senderKey = phoneKey(message.sender);
      const messageRef = db.collection('whatsappInboundMessages').doc(messageKey(message.messageId));
      const windowRef = db.collection('whatsappWindows').doc(senderKey);
      const previous = await transaction.get(messageRef);
      const stateSnap = await transaction.get(windowRef);
      // Hash the immutable provider time, not the processing-time clamp, so tolerated skew replays deduplicate.
      const fingerprint = whatsappDocumentKey(JSON.stringify({ messageId: message.messageId, sender: message.sender, providerTimestampMs: message.providerTimestampMs, text: message.text }));
      if (previous.exists) {
        if (previous.data()?.fingerprint !== fingerprint) throw new WhatsAppIntegrationError('META_MESSAGE_ID_CONFLICT', 409);
        return { duplicate: true, receipt: false };
      }
      const old = stateSnap.exists ? stateSnap.data() as WhatsAppWindowState : undefined;
      const command = consentCommand(message.text);
      const lastConsent = old?.lastConsentMessageAtMs || 0;
      // STOP wins an equal provider timestamp. A same-second START cannot silently undo opt-out.
      const consentChanges = command === 'STOP' ? message.timestampMs >= lastConsent : command === 'START' && message.timestampMs > lastConsent;
      const current: WhatsAppWindowState = {
        sender: message.sender, senderKey, businessPhoneId: config.businessPhoneId,
        lastCustomerMessageAtMs: Math.max(old?.lastCustomerMessageAtMs || 0, message.timestampMs),
        lastCustomerMessageId: message.timestampMs >= (old?.lastCustomerMessageAtMs || 0) ? message.messageId : old?.lastCustomerMessageId || message.messageId,
        lastConsentMessageAtMs: consentChanges ? message.timestampMs : lastConsent,
        optedOut: consentChanges ? command === 'STOP' : old?.optedOut || false,
      };
      const nowMs = now();
      transaction.set(messageRef, sanitizeFirestoreData({ ...message, senderKey, businessPhoneId: config.businessPhoneId, fingerprint, recordedAtMs: nowMs, signatureVerified: true }));
      transaction.set(windowRef, sanitizeFirestoreData(current));
      // Only the latest reply is required after a new request. Never queue historical status spam here.
      const receipt = !command && isWhatsAppTrackingRequest(message.text) && windowAllowed(current, nowMs, config.businessPhoneId);
      if (receipt) {
        const eventId = `receipt:${message.messageId}`;
        transaction.set(db.collection('whatsappNotificationJobs').doc(whatsappDocumentKey(eventId)), sanitizeFirestoreData({
          eventId, kind: 'RECEIPT', inboundMessageId: message.messageId, senderKey,
          state: 'PENDING', createdAtMs: nowMs, updatedAtMs: nowMs, nextAttemptAtMs: nowMs, attempts: 0,
        } satisfies WhatsAppNotificationJob));
      }
      return { duplicate: false, receipt };
    });
    if (result.duplicate) duplicates++; else processed++;
    if (result.receipt) receiptsQueued++;
  }
  for (const evidence of verified.deliveryEvidence) {
    const applied = await db.runTransaction(async transaction => {
      const indexRef = db.collection('whatsappProviderMessages').doc(whatsappDocumentKey(evidence.providerMessageId));
      const evidenceRef = db.collection('whatsappDeliveryEvidence').doc(whatsappDocumentKey(`${evidence.providerMessageId}:${phoneKey(evidence.recipient)}`));
      const index = await transaction.get(indexRef);
      const existingEvidence = await transaction.get(evidenceRef);
      const matching = index.exists && index.data()?.senderKey === phoneKey(evidence.recipient);
      const jobRef = matching ? db.collection('whatsappNotificationJobs').doc(index.data()!.jobId) : null;
      const jobSnap = jobRef ? await transaction.get(jobRef) : null;
      // Provider delivery can arrive before the accepted-result callback. Preserve that evidence durably.
      if (['delivered', 'read'].includes(evidence.status) && (!existingEvidence.exists || evidence.timestampMs > existingEvidence.data()!.timestampMs)) {
        transaction.set(evidenceRef, sanitizeFirestoreData({ providerMessageId: evidence.providerMessageId, senderKey: phoneKey(evidence.recipient), businessPhoneId: config.businessPhoneId, timestampMs: evidence.timestampMs, status: evidence.status, signatureVerified: true }));
      }
      const job = jobSnap?.exists ? jobSnap.data() as WhatsAppNotificationJob : null;
      if (!job || job.providerMessageId !== evidence.providerMessageId || !['ACCEPTED', 'DELIVERED'].includes(job.state)
        || !['delivered', 'read'].includes(evidence.status) || job.state === 'DELIVERED') return false;
      transaction.set(jobRef, sanitizeFirestoreData({ ...job, state: 'DELIVERED', deliveredAtMs: evidence.timestampMs, deliveryEvidence: evidence.status, updatedAtMs: now() }));
      return true;
    });
    if (applied) deliveryEvidenceRecorded++;
  }
  return { ok: true as const, processed, duplicates, receiptsQueued, deliveryEvidenceRecorded };
}

export function extractTrackingOrderIds(text: string): string[] {
  return [...new Set((text.match(/\bAB-\d{8}-[A-Z0-9]{6,12}\b/gi) || []).map(id => id.toUpperCase()))];
}

export function extractTrackingOrderId(text: string): string | null {
  const ids = extractTrackingOrderIds(text);
  return ids.length === 1 ? ids[0] : null;
}

export function isWhatsAppTrackingRequest(text: string): boolean {
  return Boolean(extractTrackingOrderIds(text).length || /\b(?:track(?:ing)?\s+(?:my\s+)?orders?|order\s+(?:status|tracking|receipt)|(?:my\s+)?receipts?)\b/i.test(text)
    || /(?:آرڈر|آرڈرز).*(?:اسٹیٹس|حیثیت|ٹریک|رسید)|(?:تتبع|حالة|إيصال).*(?:طلب|الطلب)/.test(text));
}

function ownOrder(order: CanonicalOrder | undefined, senderKey: string): boolean {
  const phone = normalizeWhatsAppPhone(order?.customer?.phone);
  return Boolean(order && phone && phoneKey(phone) === senderKey && Array.isArray(order.items) && order.items.length
    && order.source === 'website' && storedOrderStatus(order.status) !== null
    && (order.orderType === 'QUOTE_REQUEST'
      ? order.promoCode === 'CANCER' && order.promoType === 'quote' && order.paymentStatus === 'NOT_REQUIRED' && order.paymentMethod === 'quote'
        && ['QUOTE_REQUESTED', 'CANCELLED'].includes(order.status) && ['subtotal', 'discount', 'shipping', 'giftWrapFee', 'total'].every(key => order.totals?.[key] === 0)
      : ['PAID', 'UNPAID', 'REFUNDED'].includes(order.paymentStatus) && ['bank', 'cod'].includes(order.paymentMethod))
    && order.items.every(item => typeof item.name === 'string' && typeof item.selectedWeight === 'string' && Number.isSafeInteger(item.quantity) && item.quantity > 0 && Number.isFinite(item.price) && item.price >= 0)
    && ['subtotal', 'discount', 'shipping', 'total'].every(key => typeof order.totals?.[key] === 'number' && Number.isFinite(order.totals[key]) && order.totals[key] >= 0));
}

export function renderWhatsAppSavedReceipt(order: CanonicalOrder): string {
  if (order.orderType === 'QUOTE_REQUEST') return ['*AllBarka — saved quote request*', `Order: ${order.orderId}`, `Status: ${order.status}`,
    ...order.items.map(item => `• ${item.name} (${item.selectedWeight}) × ${item.quantity}`),
    'Our team will contact you with your personalized rate.'].join('\n');
  const payment = order.paymentStatus === 'PAID' ? 'Recorded as paid' : order.paymentStatus === 'REFUNDED' ? 'Recorded as refunded' : 'Payment not recorded as received';
  return [
    '*AllBarka — saved order receipt*', `Order: ${order.orderId}`, `Status: ${storedOrderStatus(order.status) || order.status}`, '',
    ...(order.trackingNumber ? [`Tracking: ${order.trackingNumber}`] : []),
    ...(order.estimatedDelivery ? [`Estimated delivery: ${order.estimatedDelivery}`] : []),
    ...(order.pointsAwarded ? [`Points earned: ${order.earnedPoints || 0}`] : []),
    ...order.items.map(item => `• ${item.name} (${item.selectedWeight}) × ${item.quantity} — Rs. ${(item.price * item.quantity).toLocaleString('en-PK')}`),
    '', `Subtotal: Rs. ${order.totals.subtotal.toLocaleString('en-PK')}`, `Discount: Rs. ${order.totals.discount.toLocaleString('en-PK')}`,
    `Delivery: Rs. ${order.totals.shipping.toLocaleString('en-PK')}`, `Gift wrapping: Rs. ${(order.totals.giftWrapFee || 0).toLocaleString('en-PK')}`,
    `Total: Rs. ${order.totals.total.toLocaleString('en-PK')}`, `${order.paymentMethod === 'bank' ? 'Bank transfer' : 'Cash on delivery'} — ${payment}`,
  ].join('\n');
}

type ReceiptResponse = { ok: true; replyType: 'RECEIPT' | 'CHOICES' | 'NOT_FOUND' | 'OPTED_OUT'; text: string; orderIds: string[]; revisions?: Record<string, string> };
const missingReceipt = (): ReceiptResponse => ({ ok: true, replyType: 'NOT_FOUND', text: 'No saved order matching this WhatsApp number was found. Send “Track my order <order ID>” using the checkout phone, or contact order support. Legacy orders may require manual verification.', orderIds: [] });

/** Narrow own-phone lookup, authorized exclusively by a durable signature-verified inbound message ID. */
export async function getWhatsAppReceiptForMessage(db: Firestore, messageId: string, config = getWhatsAppIntegrationConfig()): Promise<ReceiptResponse> {
  if (!config.enabled) throw new WhatsAppIntegrationError(config.disabledReason || 'WHATSAPP_INTEGRATION_DISABLED', 503);
  if (!validId(messageId)) throw new WhatsAppIntegrationError('INVALID_META_MESSAGE_ID');
  const messageSnap = await db.collection('whatsappInboundMessages').doc(messageKey(messageId)).get();
  const message = messageSnap.data();
  if (!messageSnap.exists || message?.signatureVerified !== true || !message.senderKey || !message.sender
    || message.businessPhoneId !== config.businessPhoneId) throw new WhatsAppIntegrationError('AUTHENTICATED_MESSAGE_REQUIRED', 403);
  const windowSnap = await db.collection('whatsappWindows').doc(message.senderKey).get();
  if (windowSnap.data()?.optedOut) return { ok: true, replyType: 'OPTED_OUT', text: 'Service updates are stopped. Send START to resume.', orderIds: [] };
  const requestedIds = extractTrackingOrderIds(message.text || '');
  if (requestedIds.length > 1) return { ok: true, replyType: 'CHOICES', text: 'Please send one saved order ID at a time, for example “Track my order <order ID>”.', orderIds: [] };
  const requested = requestedIds[0];
  if (requested) {
    const snapshot = await db.collection('orders').doc(requested).get();
    const order = snapshot.exists ? snapshot.data() as CanonicalOrder : undefined;
    return ownOrder(order, message.senderKey) ? { ok: true, replyType: 'RECEIPT', text: renderWhatsAppSavedReceipt(order!), orderIds: [requested], revisions: { [requested]: order!.updatedAt } } : missingReceipt();
  }
  // Indexed orders require no broad collection scan. A bounded exact-phone fallback supports saved pre-index orders.
  const index = await db.collection('whatsappPhoneOrders').doc(message.senderKey).collection('orders').limit(20).get();
  const ids = new Set(index.docs.map(document => document.id));
  const sender = normalizeWhatsAppPhone(message.sender)!;
  const variants = new Set([sender, `+${sender}`, ...(sender.startsWith('923') ? [`0${sender.slice(2)}`] : [])]);
  for (const value of variants) {
    const previous = await db.collection('orders').where('customer.phone', '==', value).limit(20).get();
    for (const document of previous.docs) ids.add(document.id);
  }
  const orders: CanonicalOrder[] = [];
  for (const id of [...ids].slice(0, 40)) {
    const snapshot = await db.collection('orders').doc(id).get();
    const order = snapshot.exists ? snapshot.data() as CanonicalOrder : undefined;
    if (ownOrder(order, message.senderKey)) orders.push(order!);
  }
  orders.sort((a, b) => b.createdAtMs - a.createdAtMs);
  const latest = orders.slice(0, 10);
  if (!latest.length) return missingReceipt();
  if (latest.length === 1) return { ok: true, replyType: 'RECEIPT', text: renderWhatsAppSavedReceipt(latest[0]), orderIds: [latest[0].orderId], revisions: { [latest[0].orderId]: latest[0].updatedAt } };
  return { ok: true, replyType: 'CHOICES', text: ['Your saved AllBarka orders:', ...latest.map(order => `• ${order.orderId} — ${order.status} — Rs. ${order.totals.total.toLocaleString('en-PK')}`), '', 'Reply “Track my order <order ID>” to choose one.'].join('\n'), orderIds: latest.map(order => order.orderId), revisions: Object.fromEntries(latest.map(order => [order.orderId, order.updatedAt])) };
}

async function readJobGate(transaction: any, db: Firestore, job: WhatsAppNotificationJob, nowMs: number, businessPhoneId: string) {
  const stateSnap = await transaction.get(db.collection('whatsappWindows').doc(job.senderKey));
  const state = stateSnap.exists ? stateSnap.data() as WhatsAppWindowState : undefined;
  if (state?.optedOut) return { state, reason: 'CUSTOMER_OPTED_OUT', disposition: 'OPTED_OUT' as const };
  let order: CanonicalOrder | undefined;
  let message: any;
  if (job.kind === 'STATUS' && job.orderId) {
    const orderSnap = await transaction.get(db.collection('orders').doc(job.orderId));
    order = orderSnap.exists ? orderSnap.data() as CanonicalOrder : undefined;
    if (!ownOrder(order, job.senderKey)) return { state, order, reason: 'PHONE_OWNERSHIP_CHANGED', disposition: 'COALESCED' as const };
    if (order!.updatedAt !== job.revision) return { state, order, reason: 'STALE_CANONICAL_REVISION', disposition: 'COALESCED' as const };
  } else if (job.kind === 'RECEIPT' && job.inboundMessageId) {
    const messageSnap = await transaction.get(db.collection('whatsappInboundMessages').doc(messageKey(job.inboundMessageId)));
    message = messageSnap.data();
    if (!messageSnap.exists || message?.signatureVerified !== true || message.senderKey !== job.senderKey
      || message.businessPhoneId !== businessPhoneId) return { state, reason: 'AUTHENTICATED_MESSAGE_REQUIRED', disposition: 'COALESCED' as const };
    // A subsequent genuine customer request gets one latest receipt, not replies to old queued messages.
    if (state && (message.timestampMs < state.lastCustomerMessageAtMs || state.lastCustomerMessageId && state.lastCustomerMessageId !== job.inboundMessageId)) return { state, reason: 'SUPERSEDED_CUSTOMER_REQUEST', disposition: 'COALESCED' as const };
  } else return { state, reason: 'INVALID_NOTIFICATION_JOB', disposition: 'COALESCED' as const };
  if (state?.optedOut) return { state, order, message, reason: 'CUSTOMER_OPTED_OUT', disposition: 'OPTED_OUT' as const };
  if (!windowAllowed(state, nowMs, businessPhoneId)) return { state, order, message, reason: 'CUSTOMER_WINDOW_CLOSED', disposition: 'HELD' as const };
  return { state: state!, order, message, reason: null, disposition: null };
}

/** A lease is not permission to send: authorizeWhatsAppSend must run immediately before Meta. */
export async function claimWhatsAppNotification(db: Firestore, options: { now?: () => number; config?: WhatsAppIntegrationConfig } = {}) {
  const config = options.config ?? getWhatsAppIntegrationConfig();
  if (!config.enabled) throw new WhatsAppIntegrationError(config.disabledReason || 'WHATSAPP_INTEGRATION_DISABLED', 503);
  const now = options.now ?? Date.now;
  const due = await db.collection('whatsappNotificationJobs').where('nextAttemptAtMs', '<=', now()).orderBy('nextAttemptAtMs', 'asc').limit(25).get();
  for (const document of due.docs) {
    const result = await db.runTransaction(async transaction => {
      const snap = await transaction.get(document.ref);
      if (!snap.exists) return null;
      const job = snap.data() as WhatsAppNotificationJob;
      const nowMs = now();
      if (job.state === 'SENDING' && (job.leaseExpiresAtMs || 0) <= nowMs) {
        // A crashed worker may have reached Meta. Never blindly replay an uncertain send.
        transaction.set(document.ref, sanitizeFirestoreData(clearLease(job, 'UNKNOWN', nowMs, 'SEND_OUTCOME_UNRECONCILED')));
        return null;
      }
      if (!['PENDING', 'LEASED'].includes(job.state) || (job.state === 'LEASED' && (job.leaseExpiresAtMs || 0) > nowMs)) return null;
      const gate = await readJobGate(transaction, db, job, nowMs, config.businessPhoneId);
      if (gate.reason) {
        transaction.set(document.ref, sanitizeFirestoreData(clearLease(job, gate.disposition!, nowMs, gate.reason)));
        return null;
      }
      const leaseToken = crypto.randomUUID(), leaseExpiresAtMs = nowMs + WHATSAPP_SEND_LEASE_MS;
      transaction.set(document.ref, sanitizeFirestoreData({ ...job, state: 'LEASED', leaseToken, leaseExpiresAtMs, updatedAtMs: nowMs, nextAttemptAtMs: leaseExpiresAtMs }));
      return { ok: true as const, jobId: document.id, leaseToken, leaseExpiresAtMs };
    });
    if (result) return result;
  }
  return { ok: true as const, idle: true as const };
}

/** Recheck canonical revision, phone, consent and provider-time window before EVERY actual send/retry. */
export async function authorizeWhatsAppSend(db: Firestore, input: { jobId: string; leaseToken: string }, options: { now?: () => number; config?: WhatsAppIntegrationConfig } = {}) {
  const config = options.config ?? getWhatsAppIntegrationConfig();
  if (!config.enabled) throw new WhatsAppIntegrationError(config.disabledReason || 'WHATSAPP_INTEGRATION_DISABLED', 503);
  if (!/^[a-f0-9]{64}$/.test(input.jobId || '') || !validId(input.leaseToken)) throw new WhatsAppIntegrationError('INVALID_SEND_LEASE');
  const now = options.now ?? Date.now;
  // Receipt generation is read-only; the following transaction rechecks its order snapshots before authorization.
  const initial = await db.collection('whatsappNotificationJobs').doc(input.jobId).get();
  const initialJob = initial.data() as WhatsAppNotificationJob | undefined;
  const receipt = initialJob?.kind === 'RECEIPT' && initialJob.inboundMessageId ? await getWhatsAppReceiptForMessage(db, initialJob.inboundMessageId, config) : undefined;
  const outcome = await db.runTransaction(async transaction => {
    const ref = db.collection('whatsappNotificationJobs').doc(input.jobId);
    const snap = await transaction.get(ref);
    const job = snap.data() as WhatsAppNotificationJob;
    const nowMs = now();
    if (!snap.exists || job.state !== 'LEASED' || job.leaseToken !== input.leaseToken || (job.leaseExpiresAtMs || 0) <= nowMs) throw new WhatsAppIntegrationError('SEND_LEASE_EXPIRED', 409);
    const gate = await readJobGate(transaction, db, job, nowMs, config.businessPhoneId);
    let changed = false;
    for (const id of receipt?.orderIds || []) {
      const current = await transaction.get(db.collection('orders').doc(id));
      if (!current.exists || !ownOrder(current.data() as CanonicalOrder, job.senderKey) || current.data()!.updatedAt !== receipt!.revisions?.[id]) changed = true;
    }
    if (gate.reason || changed || receipt?.replyType === 'OPTED_OUT') {
      transaction.set(ref, sanitizeFirestoreData(clearLease(job, changed ? 'PENDING' : gate.disposition || 'OPTED_OUT', nowMs, changed ? 'RECEIPT_CHANGED_RETRY_CLAIM' : gate.reason || 'CUSTOMER_OPTED_OUT')));
      if (changed) transaction.set(ref, sanitizeFirestoreData({ nextAttemptAtMs: nowMs }), { merge: true });
      return { blocked: true as const, code: changed ? 'RECEIPT_CHANGED_RETRY_CLAIM' : gate.reason || 'CUSTOMER_OPTED_OUT' };
    }
    const text = job.kind === 'STATUS' ? renderWhatsAppSavedReceipt(gate.order!) : receipt!.text;
    const sendBeforeMs = Math.min(nowMs + WHATSAPP_SEND_LEASE_MS, gate.state!.lastCustomerMessageAtMs + WHATSAPP_WINDOW_MS - WHATSAPP_WINDOW_MARGIN_MS);
    transaction.set(ref, sanitizeFirestoreData({ ...job, state: 'SENDING', leaseExpiresAtMs: sendBeforeMs, nextAttemptAtMs: sendBeforeMs, attempts: job.attempts + 1, updatedAtMs: nowMs }));
    return { ok: true as const, jobId: input.jobId, leaseToken: input.leaseToken, to: gate.state!.sender, text, eventId: job.eventId,
      revision: gate.order?.updatedAt || receipt?.revisions?.[receipt.orderIds[0]] || null, sendBeforeMs };
  });
  if ('blocked' in outcome) throw new WhatsAppIntegrationError(outcome.code, 409);
  return outcome;
}

/** Only a definitive provider message ID establishes acceptance; delivered comes from signed Meta evidence. */
export async function completeWhatsAppSend(db: Firestore, input: { jobId: string; leaseToken: string; outcome: 'ACCEPTED' | 'REJECTED' | 'UNKNOWN'; providerMessageId?: string }, options: { now?: () => number } = {}) {
  if (!/^[a-f0-9]{64}$/.test(input.jobId || '') || !validId(input.leaseToken) || !['ACCEPTED', 'REJECTED', 'UNKNOWN'].includes(input.outcome)) throw new WhatsAppIntegrationError('INVALID_SEND_RESULT');
  if (input.outcome === 'ACCEPTED' && !validId(input.providerMessageId)) throw new WhatsAppIntegrationError('PROVIDER_MESSAGE_ID_REQUIRED');
  const now = options.now ?? Date.now;
  return db.runTransaction(async transaction => {
    const ref = db.collection('whatsappNotificationJobs').doc(input.jobId);
    const snap = await transaction.get(ref);
    const job = snap.data() as WhatsAppNotificationJob;
    if (!snap.exists || job.leaseToken !== input.leaseToken || !['SENDING', 'ACCEPTED', 'DELIVERED'].includes(job.state)) throw new WhatsAppIntegrationError('SEND_RESULT_CONFLICT', 409);
    if (['ACCEPTED', 'DELIVERED'].includes(job.state)) {
      if (input.outcome !== 'ACCEPTED' || job.providerMessageId !== input.providerMessageId) throw new WhatsAppIntegrationError('SEND_RESULT_CONFLICT', 409);
      return { ok: true as const, state: job.state, duplicate: true };
    }
    const providerRef = input.outcome === 'ACCEPTED' ? db.collection('whatsappProviderMessages').doc(whatsappDocumentKey(input.providerMessageId!)) : null;
    const providerSnap = providerRef ? await transaction.get(providerRef) : null;
    const evidenceRef = providerRef ? db.collection('whatsappDeliveryEvidence').doc(whatsappDocumentKey(`${input.providerMessageId}:${job.senderKey}`)) : null;
    const evidenceSnap = evidenceRef ? await transaction.get(evidenceRef) : null;
    if (providerSnap?.exists && providerSnap.data()?.jobId !== input.jobId) throw new WhatsAppIntegrationError('PROVIDER_MESSAGE_ID_CONFLICT', 409);
    const updated = clearLease(job, input.outcome, now(), input.outcome === 'UNKNOWN' ? 'SEND_OUTCOME_UNRECONCILED' : undefined);
    // Retain result correlation for idempotent acknowledgement; this is no longer a valid sending lease.
    updated.leaseToken = input.leaseToken;
    if (input.outcome === 'ACCEPTED') {
      updated.providerMessageId = input.providerMessageId;
      const evidence = evidenceSnap?.data();
      if (evidence?.signatureVerified === true && evidence.senderKey === job.senderKey && evidence.providerMessageId === input.providerMessageId
        && ['delivered', 'read'].includes(evidence.status)) {
        updated.state = 'DELIVERED';
        (updated as any).deliveredAtMs = evidence.timestampMs;
        (updated as any).deliveryEvidence = evidence.status;
      }
      transaction.set(providerRef!, sanitizeFirestoreData({ jobId: input.jobId, senderKey: job.senderKey, createdAtMs: now() }));
    }
    transaction.set(ref, sanitizeFirestoreData(updated));
    return { ok: true as const, state: updated.state };
  });
}
