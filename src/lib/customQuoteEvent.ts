import type { CustomQuoteModalInit } from '../types';

export type { CustomQuoteModalInit };

export const CUSTOM_QUOTE_MODAL_EVENT = 'open-custom-quote-modal';

let pendingCustomQuoteRequest: CustomQuoteModalInit | null = null;

export function takePendingCustomQuoteRequest(): CustomQuoteModalInit | null {
  const next = pendingCustomQuoteRequest;
  pendingCustomQuoteRequest = null;
  return next;
}

export function openCustomQuoteModal(detail: CustomQuoteModalInit = {}): void {
  if (typeof window !== 'undefined') {
    pendingCustomQuoteRequest = detail;
    window.dispatchEvent(new CustomEvent<CustomQuoteModalInit>(CUSTOM_QUOTE_MODAL_EVENT, { detail }));
  }
}
