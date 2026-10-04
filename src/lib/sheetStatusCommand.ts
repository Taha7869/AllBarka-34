import crypto from 'node:crypto';
import type { OrderStatus } from './serverOrderService';
import { ORDER_STATUSES } from './orderStatuses';

export const CANONICAL_ORDER_STATUSES: OrderStatus[] = [...ORDER_STATUSES, 'QUOTE_REQUESTED'];
export interface SheetStatusCommand {
  source: 'google_sheet'; eventId: string; orderId: string; status: OrderStatus;
  expectedStatus: OrderStatus; expectedUpdatedAt: string; reason: string;
}
export interface SheetStatusResult {
  ok: true; eventId: string; orderId: string; status: OrderStatus; updatedAt: string; duplicate: boolean;
  ignored?: boolean;
}
export class SheetStatusError extends Error {
  readonly statusCode: number;
  constructor(public code: string, public httpStatus = 400, public canonical?: { status: OrderStatus; updatedAt: string }) {
    super(code); this.name = 'SheetStatusError'; this.statusCode = httpStatus;
  }
}
export function normalizeSheetStatus(value: unknown): OrderStatus {
  if (typeof value !== 'string' || value.length > 30) throw new SheetStatusError('INVALID_STATUS');
  if (ORDER_STATUSES.includes(value as any)) return value as OrderStatus;
  throw new SheetStatusError('INVALID_STATUS');
}
/** Only owner status intent enters this route; identities, prices and other mutations are rejected. */
export function validateSheetStatusCommand(raw: unknown): SheetStatusCommand {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SheetStatusError('INVALID_STATUS_COMMAND');
  const input = raw as Record<string, unknown>;
  const fields = new Set(['source', 'eventId', 'orderId', 'status', 'expectedStatus', 'expectedUpdatedAt', 'reason']);
  if (Object.keys(input).some(key => !fields.has(key)) || input.source !== 'google_sheet') throw new SheetStatusError('INVALID_STATUS_COMMAND');
  if (typeof input.eventId !== 'string' || !/^sheet:[A-Za-z0-9_-]{8,100}$/.test(input.eventId)) throw new SheetStatusError('INVALID_EVENT_ID');
  if (typeof input.orderId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(input.orderId)) throw new SheetStatusError('INVALID_ORDER_ID');
  if (typeof input.expectedUpdatedAt !== 'string' || input.expectedUpdatedAt.length > 50
    || !/^\d{4}-\d{2}-\d{2}T/.test(input.expectedUpdatedAt) || !Number.isFinite(Date.parse(input.expectedUpdatedAt))) throw new SheetStatusError('INVALID_REVISION');
  if (typeof input.reason !== 'string' || input.reason.trim().length < 3 || input.reason.trim().length > 500) throw new SheetStatusError('INVALID_REASON');
  return { source: 'google_sheet', eventId: input.eventId, orderId: input.orderId,
    status: normalizeSheetStatus(input.status), expectedStatus: input.expectedStatus === 'QUOTE_REQUESTED' ? 'QUOTE_REQUESTED' : normalizeSheetStatus(input.expectedStatus),
    expectedUpdatedAt: input.expectedUpdatedAt, reason: input.reason.trim() };
}
export function sheetStatusPayloadHash(command: SheetStatusCommand): string {
  return crypto.createHash('sha256').update(JSON.stringify({ source: command.source, eventId: command.eventId, orderId: command.orderId,
    status: command.status, expectedStatus: command.expectedStatus, expectedUpdatedAt: command.expectedUpdatedAt, reason: command.reason })).digest('hex');
}
export const sheetStatusRequestKey = (eventId: string): string => crypto.createHash('sha256').update(`sheet-status:${eventId}`).digest('hex');
