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

/**
 * Formats any canonical or legacy order status into a localized, human-readable label.
 * Never returns raw underscore-separated machine codes (e.g. ORDER_RECEIVED -> "Order received").
 */
export function formatOrderStatusLabel(
  rawStatus: unknown,
  t: (key: string, defaultText?: string) => string,
): string {
  const raw = String(rawStatus || '').trim();
  if (!raw) return t('order.status.ORDER_RECEIVED', 'Order received');
  const upper = raw.toUpperCase();
  const normalized = storedOrderStatus(upper) || upper;
  const key = `order.status.${normalized}`;
  const translated = t(key, '');
  if (translated && translated !== key && !translated.includes('_')) {
    return translated;
  }
  const readable = normalized.replace(/_/g, ' ').toLowerCase();
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}
