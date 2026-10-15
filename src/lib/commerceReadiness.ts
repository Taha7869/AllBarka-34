import type { CatalogSnapshot } from './catalogPricing';
import { PRODUCTS } from '../data/products';
import { HAMPER_BOXES } from './hamperCatalog';

/** A bounded read-only probe verifies database access, never an order write. */
export async function probeCommerceDatabase(db: { doc: (path: string) => { get: () => Promise<unknown> } } | null, timeoutMs = 3000) {
  if (!db) return { connected: false, checked: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      db.doc('_health/commerce').get(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DATABASE_PROBE_TIMEOUT')), timeoutMs); }),
    ]);
    return { connected: true, checked: true };
  } catch { return { connected: false, checked: true }; }
  finally { clearTimeout(timer); }
}
/** Never promote a live release with unavailable merchant prices. */
export function deploymentReadiness(authActive: boolean, databaseConnected: boolean, catalog: CatalogSnapshot | null) {
  const checks = { auth: authActive, database: databaseConnected,
    catalog: catalog?.source === 'firestore' && catalog.catalog.length === PRODUCTS.length && catalog.boxes.length === HAMPER_BOXES.length };
  const ready = checks.auth && checks.database && checks.catalog;
  return { ready, status: ready ? 'ready' : 'not_ready', checks };
}
