/**
 * M24: Privacy-Preserving Client Funnel Telemetry
 * 
 * Tracks essential e-commerce milestones without collecting PII, cookies,
 * or transmitting sensitive customer details. Dispatches local custom events
 * that can be bound to external telemetry only when explicitly configured.
 */

export type FunnelMilestone =
  | 'view_item'
  | 'add_to_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'order_placed';

export interface FunnelPayload {
  milestone: FunnelMilestone;
  productId?: string;
  category?: string;
  quantity?: number;
  itemCount?: number;
  hasCustomMessage?: boolean;
  timestamp: string;
}

export function recordFunnelEvent(milestone: FunnelMilestone, details: Omit<FunnelPayload, 'milestone' | 'timestamp'> = {}): void {
  if (typeof window === 'undefined') return;

  const payload: FunnelPayload = {
    milestone,
    ...details,
    timestamp: new Date().toISOString(),
  };

  try {
    window.dispatchEvent(new CustomEvent('allbarka-funnel-event', { detail: payload }));
  } catch {
    // Fail silently in non-browser or restricted test sandboxes
  }
}
