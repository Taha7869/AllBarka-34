import type { OutboxOrderEvent, OrderStatus } from '../lib/serverOrderService';
import { getN8nOrderDispatchConfig, type N8nOrderDispatchConfig, type N8nNotificationResult } from './n8nOrderNotification';
import { outboxErrorDetails } from './outboxDiagnostics';
import { storedOrderStatus } from '../lib/orderStatuses';

export function getN8nStatusDispatchConfig(env: NodeJS.ProcessEnv = process.env): N8nOrderDispatchConfig {
  // The shared order webhook receives both event types unless a dedicated status receiver is configured.
  const dedicated = Boolean(env.N8N_STATUS_WEBHOOK_URL?.trim());
  const config = getN8nOrderDispatchConfig({ N8N_ORDER_WEBHOOK_URL: dedicated ? env.N8N_STATUS_WEBHOOK_URL : env.N8N_ORDER_WEBHOOK_URL,
    N8N_WEBHOOK_SECRET: dedicated ? env.N8N_STATUS_WEBHOOK_SECRET : env.N8N_WEBHOOK_SECRET,
    N8N_ORDER_TIMEOUT_MS: env.N8N_STATUS_TIMEOUT_MS || env.N8N_ORDER_TIMEOUT_MS });
  return { ...config, reason: config.reason?.replace('ORDER_WEBHOOK', 'STATUS_WEBHOOK') };
}

export interface StatusMirrorSnapshot { orderId: string; status: OrderStatus; updatedAt: string; }

/** Immutable transaction snapshot only; security-bearing canonical fields are never serialized. */
export function projectStatusEvent(event: OutboxOrderEvent): StatusMirrorSnapshot {
  const snapshot = event.payload?.order;
  if (event.eventType !== 'ORDER_STATUS_CHANGED' || typeof event.eventId !== 'string' || !event.eventId
    || !snapshot || snapshot.orderId !== event.orderId || !storedOrderStatus(snapshot.status)
    || typeof snapshot.updatedAt !== 'string' || !Number.isFinite(Date.parse(snapshot.updatedAt))) {
    throw new Error('CANONICAL_STATUS_EVENT_INVALID');
  }
  return { orderId: snapshot.orderId, status: storedOrderStatus(snapshot.status)!, updatedAt: snapshot.updatedAt };
}

export async function sendStatusToN8n(event: OutboxOrderEvent, options: {
  config?: N8nOrderDispatchConfig; fetchImpl?: typeof fetch; now?: () => number; timeoutMs?: number;
} = {}): Promise<N8nNotificationResult> {
  const config = options.config ?? getN8nStatusDispatchConfig();
  const verified = getN8nStatusDispatchConfig({ N8N_STATUS_WEBHOOK_URL: config.webhookUrl, N8N_STATUS_WEBHOOK_SECRET: config.webhookSecret });
  if (!config.enabled || !verified.enabled) return { sent: false, status: 'DISABLED', reason: verified.reason || 'STATUS_WEBHOOK_DISABLED' };
  let order: StatusMirrorSnapshot;
  try { order = projectStatusEvent(event); } catch { return { sent: false, status: 'FAILED', reason: 'CANONICAL_STATUS_EVENT_INVALID' }; }
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('STATUS_WEBHOOK_TIMEOUT')); },
      Math.max(1, Math.min(30000, options.timeoutMs ?? config.timeoutMs)));
  });
  try {
    const response = await Promise.race([(options.fetchImpl ?? fetch)(verified.webhookUrl!, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-AllBarka-Webhook-Secret': verified.webhookSecret! },
      body: JSON.stringify({ type: 'order_status_updated', event: 'ORDER_STATUS_CHANGED', eventId: event.eventId, source: 'website',
        timestamp: new Date((options.now ?? Date.now)()).toISOString(), order,
        payload: statusNotificationPayload(event, order) }),
    }), deadline]);
    if (!response.ok) return { sent: false, status: 'FAILED', statusCode: response.status, reason: 'STATUS_WEBHOOK_HTTP_ERROR',
      ...outboxErrorDetails(new Error(`n8n status webhook returned HTTP ${response.status}`)) };
    let ack: any;
    try { ack = await Promise.race([response.json(), deadline]); }
    catch (error) { return { sent: false, status: controller.signal.aborted ? 'TIMEOUT' : 'FAILED', reason: controller.signal.aborted ? 'STATUS_WEBHOOK_TIMEOUT' : 'STATUS_WEBHOOK_INVALID_ACK',
      statusCode: response.status, ...outboxErrorDetails(error, [config.webhookUrl, config.webhookSecret]) }; }
    if (ack?.ok !== true || ack.orderId !== order.orderId || ack.eventId !== event.eventId
      || ack.statusRevision !== order.updatedAt || ack.mirrorStored !== true) {
      return { sent: false, status: 'FAILED', statusCode: response.status, reason: 'STATUS_WEBHOOK_INVALID_ACK',
        ...outboxErrorDetails(new Error('n8n status acknowledgement must confirm matching orderId, eventId, statusRevision and mirrorStored:true')) };
    }
    return { sent: true, status: 'SUCCESS', statusCode: response.status };
  } catch (error) {
    return { sent: false, status: controller.signal.aborted ? 'TIMEOUT' : 'FAILED',
      reason: controller.signal.aborted ? 'STATUS_WEBHOOK_TIMEOUT' : 'STATUS_WEBHOOK_NETWORK_ERROR',
      ...outboxErrorDetails(error, [config.webhookUrl, config.webhookSecret]) };
  } finally { clearTimeout(timer!); controller.abort(); }
}

function statusNotificationPayload(event: OutboxOrderEvent, order: StatusMirrorSnapshot) {
  const raw = event.payload.notification;
  if (!raw || raw.orderId !== order.orderId || raw.updatedAt !== order.updatedAt) return { ...order, source: 'website' };
  // Old status events have no recipient; new events carry only these approved notification fields.
  return { orderId: order.orderId, source: 'website', status: order.status, updatedAt: order.updatedAt,
    customerName: raw.customerName, customerPhone: raw.customerPhone, trackingNumber: raw.trackingNumber || '',
    estimatedDelivery: raw.estimatedDelivery ?? null, loyaltyPointsEarned: raw.loyaltyPointsEarned || 0 };
}
