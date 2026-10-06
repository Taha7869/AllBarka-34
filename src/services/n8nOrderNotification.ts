import crypto from 'node:crypto';
import type { CanonicalOrder } from '../lib/serverOrderService';
import type { HamperConfiguration } from '../lib/hamperCatalog';
import { ADMIN_STATUSES } from '../lib/adminOperations';
import type { AppliedPromo } from '../types/promo';
import { outboxErrorDetails } from './outboxDiagnostics';
import { storedOrderStatus } from '../lib/orderStatuses';

export interface N8nNotificationResult {
  sent: boolean;
  status: 'DISABLED' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  reason?: string;
  statusCode?: number;
  errorMessage?: string;
  errorStack?: string;
}

export interface N8nOrderDispatchConfig {
  enabled: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  timeoutMs: number;
  reason?: string;
}

/** The webhook URL and secret must remain exclusively in the server environment. */
export function getN8nOrderDispatchConfig(env: NodeJS.ProcessEnv = process.env): N8nOrderDispatchConfig {
  const webhookUrl = env.N8N_ORDER_WEBHOOK_URL?.trim();
  const webhookSecret = env.N8N_WEBHOOK_SECRET?.trim();
  const configuredTimeout = Number(env.N8N_ORDER_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 1000
    ? Math.min(30000, Math.floor(configuredTimeout)) : 5000;
  if (!webhookUrl) return { enabled: false, timeoutMs, reason: 'ORDER_WEBHOOK_URL_NOT_CONFIGURED' };
  try {
    const parsed = new URL(webhookUrl);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password || parsed.hash || parsed.search) {
      return { enabled: false, timeoutMs, reason: 'ORDER_WEBHOOK_URL_REQUIRES_HTTPS' };
    }
  } catch {
    return { enabled: false, timeoutMs, reason: 'ORDER_WEBHOOK_URL_INVALID' };
  }
  if (!webhookSecret) return { enabled: false, timeoutMs, reason: 'ORDER_WEBHOOK_SECRET_NOT_CONFIGURED' };
  return { enabled: true, webhookUrl, webhookSecret, timeoutMs };
}

export interface N8nOrderDelivery {
  type: string;
  priority: string;
  promisedDeliveryDate: string;
}

export interface N8nOrderData extends Partial<AppliedPromo> {
  source?: 'website';
  orderType?: 'ORDER' | 'QUOTE_REQUEST';
  paymentStatus?: CanonicalOrder['paymentStatus'];
  orderId: string;
  customerUid?: string | null;
  customer: { name: string; phone: string; address: string; city: string; deliverySlot?: string };
  delivery?: N8nOrderDelivery | null;
  totals: { subtotal: number; discount: number; shipping: number; total: number };
  items: Array<{
    id: string; name: string; selectedWeight: string; quantity: number; price: number;
    hamperConfiguration?: HamperConfiguration;
  }>;
  gifting?: { giftWrapping: boolean; giftWrapFee: number; giftMessage?: string };
  paymentMethod: string;
  createdAt: string;
  status: CanonicalOrder['status'];
  updatedAt: string;
}

function requiredText(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('CANONICAL_ORDER_INVALID');
  return value;
}

function money(value: unknown, positive = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000000 || (positive && value === 0)) {
    throw new Error('CANONICAL_ORDER_INVALID');
  }
  return value;
}

/**
 * Project only the persisted canonical receipt. Totals are copied, never recalculated;
 * claim tokens, admin notes, auth data and WhatsApp links cannot enter this envelope.
 */
export function projectCanonicalOrderForN8n(order: CanonicalOrder): N8nOrderData {
  if (!order || !/^AB-\d{8}-[A-F0-9]{6}$/i.test(order.orderId || '') || !Number.isFinite(Date.parse(order.createdAt))) {
    throw new Error('CANONICAL_ORDER_INVALID');
  }
  const isQuote = order.orderType === 'QUOTE_REQUEST';
  const quoteSignal = isQuote || order.isQuoteRequest === true || order.promoType === 'quote'
    || order.promoCode === 'CANCER' || order.status === 'QUOTE_REQUESTED' || order.paymentMethod === 'quote';
  if (quoteSignal) {
    if (!isQuote || order.isQuoteRequest !== true || order.promoCode !== 'CANCER' || order.promoType !== 'quote'
      || order.paymentMethod !== 'quote' || order.paymentStatus !== 'NOT_REQUIRED'
      || !['QUOTE_REQUESTED', 'CANCELLED'].includes(order.status)
      || !order.totals || ['subtotal', 'discount', 'discountedSubtotal', 'shipping', 'giftWrapFee', 'total'].some(key => order.totals[key] !== 0)
      || order.discountAmount !== 0 || order.freeShipping !== false || order.freeGiftWrap !== false || order.freeGift !== false) {
      throw new Error('CANONICAL_ORDER_INVALID');
    }
  } else if ((order.paymentMethod !== 'cod' && order.paymentMethod !== 'bank') || order.paymentStatus === 'NOT_REQUIRED') {
    throw new Error('CANONICAL_ORDER_INVALID');
  }
  const status = storedOrderStatus(order.status);
  if (!status || !ADMIN_STATUSES.includes(status) || !Number.isFinite(Date.parse(order.updatedAt))) throw new Error('CANONICAL_ORDER_INVALID');
  const customer = order.customer;
  const totals = order.totals;
  if (!customer || !totals || !Array.isArray(order.items) || order.items.length < 1 || order.items.length > 100) {
    throw new Error('CANONICAL_ORDER_INVALID');
  }
  if (!/^03\d{9}$/.test(customer.phone)) throw new Error('CANONICAL_ORDER_INVALID');
  const wireOrder: N8nOrderData = {
    source: 'website', orderType: isQuote ? 'QUOTE_REQUEST' : 'ORDER', paymentStatus: order.paymentStatus,
    // Historical receipts keep their saved discount and code, regardless of today's caps.
    promoCode: order.promoCode === undefined ? (order.couponCode?.trim().toUpperCase() || null) : order.promoCode,
    promoType: order.promoType ?? null,
    ...(typeof order.promoValue === 'number' ? { promoValue: money(order.promoValue) } : {}),
    discountAmount: money(order.discountAmount ?? order.couponDiscount ?? totals.discount ?? 0),
    freeShipping: order.freeShipping === true, freeGiftWrap: order.freeGiftWrap === true,
    freeGift: order.freeGift === true, isQuoteRequest: isQuote,
    orderId: order.orderId,
    customerUid: order.uid == null ? null : requiredText(order.uid, 128),
    customer: {
      name: requiredText(customer.name, 120), phone: customer.phone,
      address: requiredText(customer.address, 500), city: requiredText(customer.city, 80),
      ...(customer.deliverySlot ? { deliverySlot: requiredText(customer.deliverySlot, 120) } : {}),
    },
    totals: {
      subtotal: money(totals.subtotal), discount: money(totals.discount),
      shipping: money(totals.shipping), total: money(totals.total),
    },
    items: order.items.map(item => {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) throw new Error('CANONICAL_ORDER_INVALID');
      // Cart identities can contain a complete hamper configuration and exceed the receiver's 120-character limit.
      const projected: N8nOrderData['items'][number] = {
        id: requiredText(item.productId || item.id, 120), name: requiredText(item.name, 200),
        selectedWeight: requiredText(item.selectedWeight, 50), quantity: item.quantity, price: money(item.price, true),
      };
      if (item.hamperConfiguration) {
        const configuration = item.hamperConfiguration;
        projected.hamperConfiguration = {
          version: 1, boxId: configuration.boxId, selections: [...configuration.selections],
          recipientName: configuration.recipientName, giftMessage: configuration.giftMessage,
        };
      }
      return projected;
    }),
    paymentMethod: order.paymentMethod, createdAt: requiredText(order.createdAt, 60),
    status, updatedAt: requiredText(order.updatedAt, 60),
  };
  if (order.gifting) {
    wireOrder.gifting = {
      giftWrapping: Boolean(order.gifting.giftWrapping), giftWrapFee: money(order.gifting.giftWrapFee),
      ...(order.gifting.giftMessage ? { giftMessage: order.gifting.giftMessage } : {}),
    };
  }
  if (order.deliverySchedule) {
    const schedule = order.deliverySchedule;
    wireOrder.delivery = {
      type: schedule.shippingMethodId,
      priority: schedule.shippingMethodId === 'sameday' ? 'SAME_DAY' : schedule.shippingMethodId === 'express' ? 'EXPRESS' : 'STANDARD',
      promisedDeliveryDate: schedule.scheduledDeliveryDate,
    };
  }
  return wireOrder;
}

export interface SendOrderToN8nOptions {
  config?: N8nOrderDispatchConfig;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  eventId?: string;
}

/** Bounded transport only. Durable delivery/retries belong to orderOutboxWorker. */
export async function sendOrderToN8n(orderData: N8nOrderData, options: SendOrderToN8nOptions = {}): Promise<N8nNotificationResult> {
  const config = options.config ?? getN8nOrderDispatchConfig();
  if (!config.enabled || !config.webhookUrl || !config.webhookSecret) {
    return { sent: false, status: 'DISABLED', reason: config.reason || 'ORDER_WEBHOOK_DISABLED' };
  }
  // Even injected configurations must satisfy the HTTPS + secret requirement.
  const verifiedConfig = getN8nOrderDispatchConfig({ N8N_ORDER_WEBHOOK_URL: config.webhookUrl, N8N_WEBHOOK_SECRET: config.webhookSecret });
  if (!verifiedConfig.enabled) return { sent: false, status: 'DISABLED', reason: verifiedConfig.reason };
  const timeoutMs = Math.max(1, Math.min(30000, options.timeoutMs ?? config.timeoutMs));
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      const error = new Error('ORDER_WEBHOOK_TIMEOUT');
      error.name = 'AbortError';
      reject(error);
    }, timeoutMs);
  });
  try {
    // Whitelist again to prevent callers from accidentally serializing a full security-bearing database record.
    const envelopeOrder: N8nOrderData = {
      source: 'website', orderType: orderData.orderType ?? 'ORDER',
      ...(orderData.paymentStatus ? { paymentStatus: orderData.paymentStatus } : {}),
      promoCode: orderData.promoCode ?? null, promoType: orderData.promoType ?? null,
      ...(typeof orderData.promoValue === 'number' ? { promoValue: orderData.promoValue } : {}),
      discountAmount: orderData.discountAmount ?? 0,
      freeShipping: orderData.freeShipping === true, freeGiftWrap: orderData.freeGiftWrap === true,
      freeGift: orderData.freeGift === true, isQuoteRequest: orderData.isQuoteRequest === true,
      orderId: orderData.orderId, customerUid: orderData.customerUid ?? null,
      customer: {
        name: orderData.customer.name, phone: orderData.customer.phone,
        address: orderData.customer.address, city: orderData.customer.city,
        ...(orderData.customer.deliverySlot ? { deliverySlot: orderData.customer.deliverySlot } : {}),
      },
      totals: { subtotal: orderData.totals.subtotal, discount: orderData.totals.discount, shipping: orderData.totals.shipping, total: orderData.totals.total },
      items: orderData.items.map(item => ({
        id: item.id, name: item.name, selectedWeight: item.selectedWeight, quantity: item.quantity, price: item.price,
        ...(item.hamperConfiguration ? { hamperConfiguration: item.hamperConfiguration } : {}),
      })),
      ...(orderData.delivery ? { delivery: orderData.delivery } : {}),
      ...(orderData.gifting ? { gifting: orderData.gifting } : {}),
      paymentMethod: orderData.paymentMethod, createdAt: orderData.createdAt,
      status: orderData.status, updatedAt: orderData.updatedAt,
    };
    const payload = JSON.stringify({ type: 'order_created', event: 'ORDER_CREATED',
      ...(options.eventId ? { eventId: options.eventId } : {}), source: 'website',
      timestamp: new Date((options.now ?? Date.now)()).toISOString(), order: envelopeOrder,
      payload: { orderId: envelopeOrder.orderId, customerName: envelopeOrder.customer.name, customerPhone: envelopeOrder.customer.phone,
        items: envelopeOrder.items.map(item => ({ name: item.name, qty: item.quantity, price: item.price })),
        total: envelopeOrder.totals.total, paymentMethod: envelopeOrder.paymentMethod, createdAt: envelopeOrder.createdAt } });
    const response = await Promise.race([
      (options.fetchImpl ?? fetch)(verifiedConfig.webhookUrl!, {
        method: 'POST', redirect: 'error', signal: controller.signal, body: payload,
        headers: {
          'Content-Type': 'application/json', 'User-Agent': 'AllBarka-OrderService/2.0',
          'X-AllBarka-Webhook-Secret': verifiedConfig.webhookSecret!,
          // Compatibility signature; the bundled receiver authenticates the shared-secret header.
          'X-N8n-Signature': crypto.createHmac('sha256', verifiedConfig.webhookSecret!).update(payload).digest('hex'),
        },
      }), deadline,
    ]);
    if (!response.ok) {
      controller.abort();
      return { sent: false, status: 'FAILED', statusCode: response.status, reason: 'ORDER_WEBHOOK_HTTP_ERROR',
        ...outboxErrorDetails(new Error(`N8N_ORDER_WEBHOOK_URL returned HTTP ${response.status}`)) };
    }
    let acknowledgement: unknown;
    try {
      acknowledgement = await Promise.race([response.json(), deadline]);
    } catch (error) {
      if (controller.signal.aborted || (error as Error)?.name === 'AbortError') throw error;
      return { sent: false, status: 'FAILED', statusCode: response.status, reason: 'ORDER_WEBHOOK_INVALID_ACK',
        ...outboxErrorDetails(error, [config.webhookUrl, config.webhookSecret]) };
    }
    const ack = acknowledgement as { ok?: unknown; orderId?: unknown; mirrorStored?: unknown } | null;
    if (!ack || ack.ok !== true || ack.orderId !== orderData.orderId || ack.mirrorStored !== true) {
      return { sent: false, status: 'FAILED', statusCode: response.status, reason: 'ORDER_WEBHOOK_INVALID_ACK',
        ...outboxErrorDetails(new Error('n8n acknowledgement must confirm matching orderId and mirrorStored:true')) };
    }
    return { sent: true, status: 'SUCCESS', statusCode: response.status };
  } catch (error) {
    return controller.signal.aborted || (error as Error)?.name === 'AbortError'
      ? { sent: false, status: 'TIMEOUT', reason: 'ORDER_WEBHOOK_TIMEOUT', ...outboxErrorDetails(error, [config.webhookUrl, config.webhookSecret]) }
      : { sent: false, status: 'FAILED', reason: 'ORDER_WEBHOOK_NETWORK_ERROR', ...outboxErrorDetails(error, [config.webhookUrl, config.webhookSecret]) };
  } finally {
    clearTimeout(timeoutId!);
  }
}
