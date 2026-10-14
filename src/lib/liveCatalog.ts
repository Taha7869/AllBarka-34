import { createHash } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { PRODUCTS } from '../data/products';
import { CUSTOM_HAMPER_PRODUCT_ID, HAMPER_BOXES, HAMPER_SELECTION_IDS } from './hamperCatalog';
import { resolveCartIdentity } from './cartInput';
import { BOX_PRICE_COLLECTION, PRODUCT_PRICE_COLLECTION, CatalogPricingError, defaultProductPricing,
  productWithPricing, boxWithPricing, validateProductPricing, validateBoxPricing, type CatalogSnapshot } from './catalogPricing';

export const pricingVersion = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function staticCatalogSnapshot(): CatalogSnapshot {
  const catalog = PRODUCTS.map(product => productWithPricing(product, defaultProductPricing(product)));
  const boxes = HAMPER_BOXES.map(box => ({ ...box, active: true }));
  return { catalog, boxes, source: 'static', revision: pricingVersion([catalog.map(defaultProductPricing), boxes.map(box => ({ price: box.price, active: box.active }))]) };
}

/** Complete validated catalogue; there is no implicit static price fallback in Firestore mode. */
export function catalogFromRecords(products: Map<string, unknown>, boxRecords: Map<string, unknown>): CatalogSnapshot {
  try {
    const catalog = PRODUCTS.map(product => productWithPricing(product, validateProductPricing(product, products.get(product.id))));
    const boxes = HAMPER_BOXES.map(box => boxWithPricing(box, validateBoxPricing(boxRecords.get(box.id))));
    return { catalog, boxes, source: 'firestore', revision: pricingVersion([catalog.map(defaultProductPricing), boxes.map(box => ({ price: box.price, active: box.active }))]) };
  } catch { throw new CatalogPricingError('CATALOG_NOT_READY', 503); }
}

/** One pair of listeners per server process, rather than rereading every product for every visitor. */
export function createLiveCatalog(options: { getDb: () => Firestore | null; getSource?: () => string | undefined; timeoutMs?: number }) {
  let snapshot: CatalogSnapshot | null = null;
  let started = false;
  let products: Map<string, unknown> | null = null;
  let boxes: Map<string, unknown> | null = null;
  let stopProducts: (() => void) | undefined;
  let stopBoxes: (() => void) | undefined;
  const waiting = new Set<(error?: CatalogPricingError) => void>();
  const finish = (error?: CatalogPricingError) => { for (const resolve of waiting) resolve(error); waiting.clear(); };
  const publish = () => {
    if (!products || !boxes) return;
    try { snapshot = catalogFromRecords(products, boxes); finish(); }
    catch { snapshot = null; finish(new CatalogPricingError('CATALOG_NOT_READY', 503)); }
  };
  const close = () => {
    stopProducts?.(); stopBoxes?.(); stopProducts = stopBoxes = undefined;
    started = false; snapshot = null; products = boxes = null;
  };
  const failed = () => { close(); finish(new CatalogPricingError('CATALOG_UNAVAILABLE', 503)); };
  const start = (db: Firestore) => {
    started = true;
    try {
      stopProducts = db.collection(PRODUCT_PRICE_COLLECTION).limit(PRODUCTS.length * 2).onSnapshot(result => {
        products = new Map(result.docs.map(document => [document.id, document.data()])); publish();
      }, failed);
      stopBoxes = db.collection(BOX_PRICE_COLLECTION).limit(HAMPER_BOXES.length * 2).onSnapshot(result => {
        boxes = new Map(result.docs.map(document => [document.id, document.data()])); publish();
      }, failed);
    } catch { failed(); }
  };
  return {
    async getSnapshot(): Promise<CatalogSnapshot> {
      if ((options.getSource?.() ?? process.env.CATALOG_SOURCE) === 'static') return staticCatalogSnapshot();
      const db = options.getDb();
      if (!db) throw new CatalogPricingError('CATALOG_UNAVAILABLE', 503);
      if (snapshot) return snapshot;
      if (products && boxes) throw new CatalogPricingError('CATALOG_NOT_READY', 503);
      await new Promise<void>((resolve, reject) => {
        const done = (error?: CatalogPricingError) => { clearTimeout(timer); waiting.delete(done); error ? reject(error) : resolve(); };
        const timer = setTimeout(() => done(new CatalogPricingError('CATALOG_UNAVAILABLE', 503)), options.timeoutMs ?? 8000);
        waiting.add(done);
        if (!started) start(db);
      });
      if (!snapshot) throw new CatalogPricingError('CATALOG_UNAVAILABLE', 503);
      return snapshot;
    },
    close() { close(); finish(new CatalogPricingError('CATALOG_UNAVAILABLE', 503)); },
  };
}

/** Fresh reads inside the order transaction prevent a cached display quote from becoming an accepted price. */
export async function transactionalCatalog(db: Firestore, transaction: Transaction, items: unknown, source = process.env.CATALOG_SOURCE, additionalIds: string[] = []): Promise<CatalogSnapshot> {
  if (source === 'static') return staticCatalogSnapshot();
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) throw new CatalogPricingError('INVALID_CATALOG_CART');
  const ids = new Set<string>();
  for (const id of additionalIds) if (PRODUCTS.some(product => product.id === id)) ids.add(id);
  const boxIds = new Set<string>();
  for (const item of items) {
    const identity = resolveCartIdentity(item, PRODUCTS);
    if (identity?.product) ids.add(identity.product.id);
    if (identity?.productId === CUSTOM_HAMPER_PRODUCT_ID) {
      const configuration = item?.hamperConfiguration;
      if (HAMPER_BOXES.some(box => box.id === configuration?.boxId)) boxIds.add(configuration.boxId);
      if (Array.isArray(configuration?.selections)) for (const id of configuration.selections) {
        if (HAMPER_SELECTION_IDS.includes(id)) ids.add(id);
      }
    }
  }
  const records = new Map<string, unknown>();
  const boxRecords = new Map<string, unknown>();
  for (const id of [...ids].sort()) { const record = await transaction.get(db.collection(PRODUCT_PRICE_COLLECTION).doc(id)); records.set(id, record.exists ? record.data() : undefined); }
  for (const id of [...boxIds].sort()) { const record = await transaction.get(db.collection(BOX_PRICE_COLLECTION).doc(id)); boxRecords.set(id, record.exists ? record.data() : undefined); }
  try {
    const catalog = PRODUCTS.filter(product => ids.has(product.id)).map(product => productWithPricing(product, validateProductPricing(product, records.get(product.id))));
    const boxes = HAMPER_BOXES.filter(box => boxIds.has(box.id)).map(box => boxWithPricing(box, validateBoxPricing(boxRecords.get(box.id))));
    return { catalog, boxes, source: 'firestore', revision: pricingVersion([catalog.map(product => [product.id, defaultProductPricing(product)]), boxes.map(box => [box.id, box.price, box.active])]) };
  } catch { throw new CatalogPricingError('CATALOG_NOT_READY', 503); }
}

export function quoteFingerprint(order: { items: unknown; summary: unknown; rewardApplication?: unknown }): string { return pricingVersion([order.items, order.summary, order.rewardApplication ?? null]); }
