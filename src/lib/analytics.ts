import { apiUrl } from './apiUrl';
import { PRODUCTS } from '../data/products';
import { routeMetadata, publicSiteOrigin } from './routeMetadata';
import { validMeasurementId } from './measurementConfig';
export { validMeasurementId } from './measurementConfig';

export type MeasurementConsent = 'unknown' | 'granted' | 'denied';
export const MEASUREMENT_CONSENT_KEY = 'allbarka_measurement_consent_v1';
export function readMeasurementConsent(storage: Pick<Storage, 'getItem'> | null): MeasurementConsent {
  try { const value = JSON.parse(storage?.getItem(MEASUREMENT_CONSENT_KEY) || 'null'); return value?.v === 1 && ['granted', 'denied'].includes(value.choice) ? value.choice : 'unknown'; } catch { return 'unknown'; }
}
export function saveMeasurementConsent(storage: Pick<Storage, 'setItem'> | null, choice: Exclude<MeasurementConsent, 'unknown'>) {
  try { storage?.setItem(MEASUREMENT_CONSENT_KEY, JSON.stringify({ v: 1, choice })); } catch { /* In-memory choice still applies. */ }
}
const names = new Set(['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase', 'web_vital']);
const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100_000_000;
/** Allocate the verified merchandise discount proportionally; shipping and wrapping stay separate. */
export function measuredCheckoutItems(raw: unknown, netMerchandise: unknown): { productId: string; quantity: number; price: number; discount: number }[] | null {
  if (!Array.isArray(raw) || !raw.length || raw.length > 50 || !money(netMerchandise)) return null;
  const items = raw.map(item => ({ productId: item?.productId, quantity: item?.quantity, price: item?.price ?? item?.unitPrice }));
  if (items.some(item => typeof item.productId !== 'string' || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 50 || !money(item.price))) return null;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!money(subtotal) || (netMerchandise as number) > subtotal + .01) return null;
  const ratio = subtotal ? Math.min(1, (netMerchandise as number) / subtotal) : 0;
  return items.map(item => ({ ...item, price: Math.round(item.price * ratio * 1e6) / 1e6, discount: Math.round(item.price * (1 - ratio) * 1e6) / 1e6 }));
}
/** Public catalogue identities and numeric totals only; private URLs, search terms, contacts and auth are excluded. */
export function analyticsPayload(name: string, raw: Record<string, any>, origin: string): Record<string, unknown> | null {
  if (!names.has(name)) return null;
  const metadata = routeMetadata(typeof raw.path === 'string' ? raw.path : '/');
  if (name === 'page_view' && (metadata.noindex || metadata.status !== 200)) return null;
  const path = metadata.noindex || metadata.status !== 200 ? '/shop' : metadata.canonicalPath;
  const result: Record<string, unknown> = { page_location: publicSiteOrigin(origin) + path, page_referrer: '', page_title: metadata.noindex ? 'AllBarka' : metadata.title };
  if (['en', 'ur', 'ar'].includes(raw.language)) result.language = raw.language;
  if (name === 'web_vital') {
    if (!['LCP', 'CLS'].includes(raw.metric) || !money(raw.value)) return null;
    return { ...result, metric_name: raw.metric, value: raw.metric === 'CLS' ? Math.round(raw.value * 1000) / 1000 : Math.round(raw.value), non_interaction: true };
  }
  if (name === 'page_view') return result;
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 50) return null;
  const items = raw.items.map((item: any) => {
    const product = PRODUCTS.find(product => product.id === item.productId);
    if ((!product && item.productId !== 'custom-hamper') || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 50 || !money(item.price) || (item.discount !== undefined && !money(item.discount))) return null;
    return { item_id: product?.id || 'custom-hamper', item_name: product?.name_en || 'Custom hamper', item_category: product?.category || 'gift-boxes', quantity: item.quantity, price: item.price, ...(item.discount !== undefined ? { discount: item.discount } : {}) };
  });
  if (items.some(item => !item)) return null;
  if (!money(raw.value)) return null;
  if (name === 'purchase' && (typeof raw.transactionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(raw.transactionId))) return null;
  return { ...result, currency: 'PKR', value: raw.value, items, ...(name === 'purchase' && money(raw.shipping) ? { shipping: raw.shipping } : {}), ...(name === 'purchase' ? { transaction_id: raw.transactionId } : {}) };
}

export function createMeasurementTracker(options: { origin: () => string; load: (id: string) => Promise<void>; send: (name: string, payload: Record<string, unknown>) => void; disable: (id: string) => void }) {
  let consent: MeasurementConsent = 'unknown', measurementId: string | null = null, ready = false, generation = 0, lastPage = '', lastItem = '', pending: Promise<void> | null = null;
  const disable = (id: string) => { try { options.disable(id); } catch { /* Measurement never blocks shopping or revocation. */ } };
  const enable = async () => {
    if (consent !== 'granted' || !measurementId || ready) return;
    if (pending) return pending;
    const id = measurementId, version = generation;
    pending = options.load(id).then(() => { if (generation === version && consent === 'granted' && measurementId === id) ready = true; else disable(id); }).catch(() => { ready = false; }).finally(() => { pending = null; });
    return pending;
  };
  return {
    async configure(value: unknown) { const next = validMeasurementId(value) ? value : null; if (next !== measurementId) { if (measurementId) disable(measurementId); generation++; ready = false; lastPage = ''; lastItem = ''; measurementId = next; } await enable(); },
    async consent(choice: MeasurementConsent) { if (choice !== consent) { generation++; consent = choice; ready = false; lastPage = ''; lastItem = ''; } if (choice !== 'granted' && measurementId) disable(measurementId); await enable(); },
    async track(name: string, raw: Record<string, any>) {
      if (consent !== 'granted' || !measurementId) return false;
      await enable(); if (consent !== 'granted' || !ready) return false;
      const payload = analyticsPayload(name, raw, options.origin()); if (!payload) return false;
      const identity = JSON.stringify([payload.page_location, payload.language, name === 'view_item' ? payload.items : null]);
      if (name === 'page_view' && lastPage === identity || name === 'view_item' && lastItem === identity) return false;
      try { options.send(name, payload); if (name === 'page_view') lastPage = identity; if (name === 'view_item') lastItem = identity; return true; } catch { return false; }
    },
    getState: () => ({ consent, configured: !!measurementId, ready }),
  };
}
let singleton: ReturnType<typeof createMeasurementTracker> | null = null;
function browserTracker() {
  if (singleton || typeof window === 'undefined') return singleton;
  const host = window as Window & { dataLayer?: any[]; gtag?: (...args: any[]) => void; [key: string]: any };
  let script: HTMLScriptElement | null = null, loading: Promise<void> | null = null;
  const origin = () => publicSiteOrigin(document.querySelector<HTMLMetaElement>('meta[name="allbarka:origin"]')?.content || window.location.origin);
  singleton = createMeasurementTracker({ origin, load: async id => {
    host[`ga-disable-${id}`] = false;
    if (loading) return loading;
    host.dataLayer ||= []; host.gtag = function () { host.dataLayer!.push(arguments); };
    host.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    host.gtag('js', new Date()); host.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: origin() + '/', page_referrer: '', page_title: 'AllBarka' });
    loading = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { script?.remove(); loading = null; reject(new Error('MEASUREMENT_UNAVAILABLE')); }, 8000);
      script = document.createElement('script'); script.async = true; script.id = 'allbarka-measurement'; script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      script.onload = () => { clearTimeout(timeout); resolve(); }; script.onerror = () => { clearTimeout(timeout); script?.remove(); loading = null; reject(new Error('MEASUREMENT_UNAVAILABLE')); };
      document.head.appendChild(script);
    }); return loading;
  }, send: (name, payload) => host.gtag?.('event', name, payload), disable: id => {
    host[`ga-disable-${id}`] = true; script?.remove(); script = null; loading = null;
    host.dataLayer = [];
    // Best-effort deletion of measurement cookies on this host and its parent domain.
    try { for (const cookie of document.cookie.split(';')) { const name = cookie.trim().split('=')[0]; if (!/^_ga(?:_|$)/.test(name)) continue;
      document.cookie = `${name}=; Max-Age=0; path=/`;
      const parts = window.location.hostname.split('.'); for (let i = 0; i < parts.length - 1; i++) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${parts.slice(i).join('.')}`;
    } } catch { /* Cookies may be disabled by the browser. */ }
  } });
  return singleton;
}
export async function initializeMeasurement() {
  const tracker = browserTracker(); if (!tracker) return false;
  let consent: MeasurementConsent = 'unknown'; try { consent = readMeasurementConsent(window.localStorage); } catch { /* Default remains off. */ }
  await tracker.consent(consent);
  try { const response = await fetch(apiUrl('/api/site/config'), { signal: AbortSignal.timeout(5000), credentials: 'omit', cache: 'default' }); if (!response.ok) return false; const data = await response.json(); await tracker.configure(data?.measurementId); } catch { return false; }
  if (tracker.getState().ready) window.dispatchEvent(new CustomEvent('allbarka-measurement-ready'));
  return tracker.getState().configured;
}
export async function setMeasurementConsent(choice: Exclude<MeasurementConsent, 'unknown'>) {
  try { saveMeasurementConsent(window.localStorage, choice); } catch { /* The browser can deny storage. */ }
  await browserTracker()?.consent(choice);
  window.dispatchEvent(new CustomEvent('allbarka-measurement-changed', { detail: { choice } }));
}
export function trackCommerce(name: string, raw: Record<string, any>) { try { return browserTracker()?.track(name, raw).catch(() => false) ?? Promise.resolve(false); } catch { return Promise.resolve(false); } }
export async function synchronizeMeasurementConsent() {
  let choice: MeasurementConsent = 'unknown'; try { choice = readMeasurementConsent(window.localStorage); } catch { /* Stay off. */ }
  await browserTracker()?.consent(choice);
  window.dispatchEvent(new CustomEvent('allbarka-measurement-changed', { detail: { choice } }));
  return choice;
}
export function currentMeasurementConsent() { return browserTracker()?.getState().consent ?? 'unknown'; }
type AcceptedReceipt = { orderId: string; durablePersistenceReady?: boolean; orderType?: string; totals?: any; items?: any[] };
export function createAcceptedPurchaseRecorder(options: { consent: () => MeasurementConsent; fingerprint: (id: string) => Promise<string>; transactionId: () => string; storage: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>; send: (payload: Record<string, any>) => Promise<boolean> }) {
  return async (receipt: AcceptedReceipt) => {
    let key: string | null = null; let reserved = false;
    try {
      if (!receipt.durablePersistenceReady || receipt.orderType !== 'ORDER' || !/^[A-Za-z0-9_-]{5,100}$/.test(receipt.orderId) || options.consent() !== 'granted') return false;
      const items = measuredCheckoutItems(receipt.items, receipt.totals?.discountedSubtotal); if (!items) return false;
      const fingerprint = await options.fingerprint(receipt.orderId);
      if (!/^[a-f0-9]{64}$/.test(fingerprint) || options.consent() !== 'granted') return false;
      key = 'allbarka_measured_purchase_' + fingerprint;
      const storage = options.storage(); if (storage.getItem(key)) return false;
      const transactionId = options.transactionId(); if (!/^[a-f0-9-]{36}$/i.test(transactionId)) return false;
      // Reserve before transport: deduplication is scoped to this browser tab/session, not a payment ledger.
      storage.setItem(key, transactionId); reserved = true;
      const sent = await options.send({ path: '/checkout', transactionId, items, value: receipt.totals.discountedSubtotal, shipping: receipt.totals.shipping });
      if (!sent) storage.removeItem(key);
      return sent;
    } catch {
      if (reserved && key) { try { options.storage().removeItem(key); } catch { /* Best effort. */ } }
      return false;
    }
  };
}
const recordAcceptedPurchase = createAcceptedPurchaseRecorder({ consent: currentMeasurementConsent,
  fingerprint: async id => { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id)); return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join(''); },
  transactionId: () => crypto.randomUUID(), storage: () => sessionStorage, send: payload => trackCommerce('purchase', payload) });
export function trackAcceptedPurchase(receipt: AcceptedReceipt) {
  return recordAcceptedPurchase(receipt);
}
