import crypto from 'node:crypto';
import type { OrderStatus } from './serverOrderService';
import { SheetStatusError } from './sheetStatusCommand';
import { ORDER_STATUSES, storedOrderStatus } from './orderStatuses';

export const INTEGRATION_STATUSES = ORDER_STATUSES;
export type IntegrationStatus = typeof INTEGRATION_STATUSES[number];
export interface OrderUpdateCommand {
  orderId: string; status: IntegrationStatus; updatedAt: string; eventId: string;
  trackingNumber?: string; estimatedDelivery?: string | null; notes?: string;
}
export interface OrderUpdateResult {
  ok: true; orderId: string; eventId: string; status: IntegrationStatus;
  updatedAt: string; statusRevision: string | null; duplicate: boolean; ignored?: boolean;
}
export function integrationStatus(status: string): OrderStatus {
  const canonical = storedOrderStatus(status);
  if (!canonical) throw new SheetStatusError('INVALID_STORED_STATUS', 503);
  return canonical;
}
export const canonicalIntegrationStatus = (status: IntegrationStatus): OrderStatus => status;
const iso = (value: unknown): value is string => typeof value === 'string' && value.length <= 40
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
/** n8n carries fulfillment intent only. Prices, identities and points cannot enter this API. */
export function validateOrderUpdate(raw: unknown, nowMs = Date.now()): OrderUpdateCommand {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SheetStatusError('INVALID_ORDER_UPDATE');
  const input = raw as Record<string, unknown>;
  if (Object.keys(input).some(key => !['orderId', 'status', 'trackingNumber', 'estimatedDelivery', 'notes', 'updatedAt', 'eventId'].includes(key))) throw new SheetStatusError('INVALID_ORDER_UPDATE');
  if (typeof input.orderId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(input.orderId)) throw new SheetStatusError('INVALID_ORDER_ID');
  if (!INTEGRATION_STATUSES.includes(input.status as IntegrationStatus)) throw new SheetStatusError('INVALID_STATUS');
  if (!iso(input.updatedAt) || Date.parse(input.updatedAt) > nowMs + 300000) throw new SheetStatusError('INVALID_UPDATED_AT');
  const updatedAt = new Date(input.updatedAt).toISOString();
  const eventId = input.eventId ?? `sheet:${crypto.createHash('sha256').update(`${input.orderId}:${updatedAt}`).digest('hex')}`;
  if (typeof eventId !== 'string' || !/^[A-Za-z0-9:_-]{8,120}$/.test(eventId)) throw new SheetStatusError('INVALID_EVENT_ID');
  const result: OrderUpdateCommand = { orderId: input.orderId, status: input.status as IntegrationStatus, updatedAt, eventId };
  for (const key of ['trackingNumber', 'notes'] as const) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string' || input[key].length > (key === 'notes' ? 1000 : 120)
      || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(input[key])) throw new SheetStatusError(`INVALID_${key === 'notes' ? 'NOTES' : 'TRACKING_NUMBER'}`);
    result[key] = input[key].trim();
  }
  if (input.estimatedDelivery !== undefined) {
    if (input.estimatedDelivery === null || input.estimatedDelivery === '') result.estimatedDelivery = null;
    else if (iso(input.estimatedDelivery)) result.estimatedDelivery = new Date(input.estimatedDelivery).toISOString();
    else if (typeof input.estimatedDelivery === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.estimatedDelivery) && Number.isFinite(Date.parse(`${input.estimatedDelivery}T00:00:00Z`))
      && new Date(`${input.estimatedDelivery}T00:00:00Z`).toISOString().slice(0, 10) === input.estimatedDelivery) result.estimatedDelivery = input.estimatedDelivery;
    else throw new SheetStatusError('INVALID_ESTIMATED_DELIVERY');
  }
  return result;
}
export const orderUpdateHash = (command: OrderUpdateCommand): string => crypto.createHash('sha256').update(JSON.stringify({
  orderId: command.orderId, status: command.status, updatedAt: command.updatedAt,
  trackingNumber: command.trackingNumber ?? null, estimatedDelivery: command.estimatedDelivery ?? null, notes: command.notes ?? null,
})).digest('hex');
