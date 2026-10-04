import crypto from 'node:crypto';
import type { OrderStatus } from './serverOrderService';

export const CANONICAL_ORDER_STATUSES: OrderStatus[] = ['NEW', 'QUOTE_REQUESTED', 'ORDER_RECEIVED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const legacyStatus: Record<string, OrderStatus> = { RECEIVED: 'ORDER_RECEIVED', ORDER: 'ORDER_RECEIVED', CONF: 'CONFIRMED',
  PROC: 'PREPARING', PACK: 'PREPARING', DISP: 'DISPATCHED', SHIP: 'DISPATCHED', DELIV: 'DELIVERED', CANC: 'CANCELLED' };
export interface SheetStatusCommand {
  source: 'google_sheet'; eventId: string; orderId: string; status: OrderStatus;
  expectedStatus: OrderStatus; expectedUpdatedAt: string; reason: string;
}
export interface SheetStatusResult {
  ok: true; eventId: string; orderId: string; status: OrderStatus; updatedAt: string; duplicate: boolean;
}
export class SheetStatusError extends Error {
  readonly statusCode: number;
  constructor(public code: string, public httpStatus = 400, public canonical?: { status: OrderStatus; updatedAt: string }) {
    super(code); this.name = 'SheetStatusError'; this.statusCode = httpStatus;
  }
}
export function normalizeSheetStatus(value: unknown): OrderStatus {
  if (typeof value !== 'string' || value.length > 30) throw new SheetStatusError('INVALID_STATUS');
  const status = value.trim().toUpperCase();
  if (CANONICAL_ORDER_STATUSES.includes(status as OrderStatus)) return status as OrderStatus;
  if (Object.hasOwn(legacyStatus, status)) return legacyStatus[status];
  throw new SheetStatusError('INVALID_STATUS');
}
/** Only owner status intent enters this route; identities, prices and other mutations are rejected. */
export function validateSheetStatusCommand(raw: unknown): SheetStatusCommand {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SheetStatusError('INVALID_STATUS_COMMAND');
  const input = raw as Record<string, unknown>;
  const fields = new Set(['source', 'eventId', 'orderId', 'status', 'expectedStatus', 'expectedUpdatedAt', 'reason']);
  if (Object.keys(input).some(key => !fields.has(key)) || input.source !== 'google_sheet') throw new SheetStatusError('INVALID_STATUS_COMMAND');
  if (typeof input.eventId !== 'string' || !/^sheet:[A-Za-z0-9_-]{8,100}$/.test(input.eventId)) throw new SheetStatusError('INVALID_EVENT_ID');
  if (typeof input.orderId !== 'string' || !/^AB-\d{8}-[A-Fa-f0-9]{6}$/.test(input.orderId)) throw new SheetStatusError('INVALID_ORDER_ID');
  if (typeof input.expectedUpdatedAt !== 'string' || input.expectedUpdatedAt.length > 50
    || !/^\d{4}-\d{2}-\d{2}T/.test(input.expectedUpdatedAt) || !Number.isFinite(Date.parse(input.expectedUpdatedAt))) throw new SheetStatusError('INVALID_REVISION');
  if (typeof input.reason !== 'string' || input.reason.trim().length < 3 || input.reason.trim().length > 500) throw new SheetStatusError('INVALID_REASON');
  return { source: 'google_sheet', eventId: input.eventId, orderId: input.orderId,
    status: normalizeSheetStatus(input.status), expectedStatus: normalizeSheetStatus(input.expectedStatus),
    expectedUpdatedAt: input.expectedUpdatedAt, reason: input.reason.trim() };
}
export function sheetStatusPayloadHash(command: SheetStatusCommand): string {
  return crypto.createHash('sha256').update(JSON.stringify({ source: command.source, eventId: command.eventId, orderId: command.orderId,
    status: command.status, expectedStatus: command.expectedStatus, expectedUpdatedAt: command.expectedUpdatedAt, reason: command.reason })).digest('hex');
}
export const sheetStatusRequestKey = (eventId: string): string => crypto.createHash('sha256').update(`sheet-status:${eventId}`).digest('hex');
