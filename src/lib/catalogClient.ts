import { PRODUCTS } from '../data/products';
import { HAMPER_BOXES } from './hamperCatalog';
import { parseCatalogResponse, type CatalogSnapshot } from './catalogPricing';
import { apiUrl } from './apiUrl';

export interface CatalogClientState extends CatalogSnapshot { status: 'loading' | 'ready' | 'unavailable' }
const initialState: CatalogClientState = { catalog: PRODUCTS, boxes: HAMPER_BOXES.map(box => ({ ...box, active: true })),
  source: 'static', revision: '', status: 'loading' };

/** Public data only, kept in memory. Old prices are labelled unavailable; checkout still needs a fresh server quote. */
export function createCatalogStore(options: { fetcher?: typeof fetch; timeoutMs?: number; refreshMs?: number } = {}) {
  let state = initialState;
  let etag = '';
  let pending: Promise<void> | null = null;
  let interval: ReturnType<typeof setInterval> | undefined;
  let active: AbortController | null = null;
  const subscribers = new Set<() => void>();
  const emit = () => { for (const listener of subscribers) listener(); };
  const refresh = (): Promise<void> => {
    if (pending) return pending;
    const controller = new AbortController(); active = controller;
    pending = (async () => {
      // Assign the shared promise before a synchronous fetch/configuration failure can clear it.
      await Promise.resolve();
      let abortListener: (() => void) | undefined;
      const aborted = new Promise<never>((_, reject) => { abortListener = () => reject(new Error('CATALOG_TIMEOUT')); controller.signal.addEventListener('abort', abortListener, { once: true }); });
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);
      try {
        const response = await Promise.race([(options.fetcher || fetch)(apiUrl('/api/catalog/snapshot'), {
          headers: { Accept: 'application/json', ...(etag ? { 'If-None-Match': etag } : {}) },
          signal: controller.signal, credentials: 'omit', cache: 'no-store',
        }), aborted]);
        if (response.status === 304 && state.revision) {
          if (state.status !== 'ready') { state = { ...state, status: 'ready' }; emit(); }
          return;
        }
        if (!response.ok) throw new Error('CATALOG_UNAVAILABLE');
        const next = parseCatalogResponse(await Promise.race([response.json(), aborted]));
        etag = response.headers.get('etag') || '';
        if (next.revision !== state.revision || next.source !== state.source || state.status !== 'ready') {
          state = { ...next, status: 'ready' }; emit();
        }
      } catch {
        if (state.status !== 'unavailable') { state = { ...state, status: 'unavailable' }; emit(); }
      } finally {
        clearTimeout(timer); if (abortListener) controller.signal.removeEventListener('abort', abortListener);
        active = null; pending = null;
      }
    })();
    return pending;
  };
  const resume = () => { if (document.visibilityState !== 'hidden') void refresh(); };
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => initialState,
    refresh,
    subscribe(listener: () => void) {
      subscribers.add(listener);
      if (subscribers.size === 1 && typeof window !== 'undefined') {
        void refresh(); interval = setInterval(resume, options.refreshMs ?? 30000);
        window.addEventListener('focus', resume); window.addEventListener('online', resume); document.addEventListener('visibilitychange', resume);
      }
      return () => {
        subscribers.delete(listener);
        if (subscribers.size === 0 && typeof window !== 'undefined') {
          clearInterval(interval); window.removeEventListener('focus', resume); window.removeEventListener('online', resume); document.removeEventListener('visibilitychange', resume);
        }
      };
    },
    close() {
      active?.abort(); clearInterval(interval); subscribers.clear();
      if (typeof window !== 'undefined') { window.removeEventListener('focus', resume); window.removeEventListener('online', resume); document.removeEventListener('visibilitychange', resume); }
    },
  };
}
export const catalogStore = createCatalogStore();
