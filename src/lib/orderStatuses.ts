/** Exact fulfillment values from the live Order_Control Sheet. */
export const ORDER_STATUSES = ['ORDER_RECEIVED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const;
export type FulfillmentStatus = typeof ORDER_STATUSES[number];
/** Quote requests remain a separate, non-payable inquiry state, never a Sheet fulfillment input. */
export type StoredOrderStatus = FulfillmentStatus | 'QUOTE_REQUESTED';
/** Read compatibility only for historical records. API inputs never accept these obsolete values. */
export function storedOrderStatus(value: unknown): StoredOrderStatus | null {
  if (value === 'NEW') return 'ORDER_RECEIVED';
  if (value === 'PACKED') return 'PREPARING';
  if (value === 'QUOTE_REQUESTED' || ORDER_STATUSES.includes(value as FulfillmentStatus)) return value as StoredOrderStatus;
  return null;
}
