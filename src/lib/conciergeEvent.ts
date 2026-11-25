export const OPEN_CONCIERGE_EVENT = 'allbarka:open-concierge';

export interface OpenConciergeDetail {
  message?: string;
  autoSend?: boolean;
}

export interface PendingConciergeRequest {
  id: number;
  detail: OpenConciergeDetail;
}

const MAX_CONCIERGE_MESSAGE_CHARS = 1000;

let activeConciergeListenerCount = 0;

export function registerConciergeListener(): void {
  activeConciergeListenerCount += 1;
}

export function unregisterConciergeListener(): void {
  activeConciergeListenerCount = Math.max(0, activeConciergeListenerCount - 1);
}

export function hasActiveConciergeListener(): boolean {
  return activeConciergeListenerCount > 0;
}

export function normalizeOpenConciergeDetail(raw: unknown): OpenConciergeDetail {
  if (!raw || typeof raw !== 'object') return {};
  const candidate = raw as Record<string, unknown>;
  const rawMessage = typeof candidate.message === 'string' ? candidate.message.slice(0, MAX_CONCIERGE_MESSAGE_CHARS) : undefined;
  const autoSend = candidate.autoSend === true;
  return {
    ...(rawMessage !== undefined ? { message: rawMessage } : {}),
    ...(autoSend ? { autoSend: true } : {}),
  };
}

export function openConcierge(detail: OpenConciergeDetail = {}): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeOpenConciergeDetail(detail);
  window.dispatchEvent(new CustomEvent<OpenConciergeDetail>(OPEN_CONCIERGE_EVENT, { detail: normalized }));
}
