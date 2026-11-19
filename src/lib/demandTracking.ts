import { apiUrl } from './apiUrl';
import { readStoredConsent } from './consent';

export type ClientDemandEvent = 'product_view' | 'add_to_cart' | 'checkout_start';

/**
 * Sends one anonymous count to /api/events. No cookie, id or personal data is sent, and
 * browsers that ask not to be tracked (Do Not Track, Global Privacy Control, or declined
 * analytics consent) send nothing. A product view counts once per product per browser session.
 */
export function trackDemand(type: ClientDemandEvent, productId?: string): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  // Local development and test previews are not customer demand.
  if (/^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(window.location.hostname)) return;
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === '1' || nav.globalPrivacyControl === true) return;
    const storedConsent = readStoredConsent();
    if (storedConsent && !storedConsent.categories.analytics) return;
    if (type === 'product_view' || type === 'checkout_start') {
      const key = `allbarka_seen:${type}:${productId || ''}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    }
  } catch { /* storage blocked: still count once per call */ }
  try {
    void fetch(apiUrl('/api/events'), {
      method: 'POST', keepalive: true, credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productId ? { type, productId } : { type }),
    }).catch(() => undefined);
  } catch { /* analytics never blocks shopping */ }
}
