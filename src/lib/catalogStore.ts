import { createHash, randomUUID } from 'node:crypto';
import type { Firestore, Transaction, DocumentSnapshot } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { PRODUCTS } from '../data/products';
import type { Product } from '../types';
import { CatalogError, readCatalogPricing, productFromPricing, unavailableProduct, validateCatalogPricing, type CatalogRecord } from './catalogSchema';
import { resolveCartIdentity } from './cartInput';
import { CUSTOM_HAMPER_PRODUCT_ID, HAMPER_SELECTION_IDS, type HamperBox } from './hamperCatalog';
import { HAMPER_BOX_SEEDS, validateHamperBoxPricing, boxFromPricing, type HamperBoxRecord } from './hamperBoxSchema';

export const CATALOG_CACHE_MS = 15_000;
export const CATALOG_COLLECTION = 'products';
const seeds = new Map(PRODUCTS.map(product => [product.id, product]));
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export interface CatalogSnapshot { products: Product[]; hamperBoxes: HamperBox[]; version: string; invalidProductIds: string[]; checkedAt: string }
let cache: { db: Firestore; snapshot: CatalogSnapshot; at: number } | null = null;
export function invalidateCatalogCache() { cache = null; }

export function storedCatalogRecord(productId: string, value: unknown): CatalogRecord {
  const seed = seeds.get(productId);
  if (!seed) throw new CatalogError('UNKNOWN_CATALOG_PRODUCT', 404);
  const pricing = readCatalogPricing(value, seed);
  const updatedAt = value && typeof value === 'object' && typeof (value as any).updatedAt === 'string' ? (value as any).updatedAt : null;
  return { pricing, version: fingerprint(pricing), updatedAt };
}

function snapshotFromDocuments(snapshots: DocumentSnapshot[], now: number): CatalogSnapshot {
  const invalidProductIds: string[] = [];
  const products = snapshots.filter(document => seeds.has(document.id)).map(document => {
    const seed = seeds.get(document.id)!;
    try {
      if (!document.exists) throw new CatalogError('MISSING_CATALOG_PRODUCT');
      const record = storedCatalogRecord(document.id, document.data());
      return productFromPricing(seed, record.pricing, record.version);
    } catch { invalidProductIds.push(document.id); return unavailableProduct(seed); }
  });
  const hamperBoxes = HAMPER_BOX_SEEDS.map(seed => {
    const document = snapshots.find(document => document.id === seed.id);
    try {
      if (!document?.exists) throw new CatalogError('MISSING_HAMPER_BOX');
      const record = storedHamperBoxRecord(seed.id, document.data());
      return boxFromPricing(seed, record.pricing, record.version);
    } catch { if (document) invalidProductIds.push(seed.id); return { ...seed, price: 0, active: false, catalogRevision: 'unavailable' }; }
  });
  return { products, hamperBoxes, version: fingerprint([...products.map(product => [product.id, product.catalogRevision]), ...hamperBoxes.map(box => [box.id, box.catalogRevision])]), invalidProductIds,
    checkedAt: new Date(now).toISOString() };
}

/** Runs before transaction writes so a simultaneous price edit retries final order pricing. */
export async function loadCatalogForTransaction(db: Firestore, transaction: Transaction, items?: unknown[]): Promise<CatalogSnapshot> {
  const ids = new Set<string>();
  const boxIds = new Set<string>();
  if (items) {
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const identity = resolveCartIdentity(item, PRODUCTS);
      if (identity?.product) ids.add(identity.product.id);
      if (identity?.productId === CUSTOM_HAMPER_PRODUCT_ID) {
        const boxId = (item as any).hamperConfiguration?.boxId;
        if (HAMPER_BOX_SEEDS.some(box => box.id === boxId)) boxIds.add(boxId);
        const selected = (item as any).hamperConfiguration?.selections;
        if (Array.isArray(selected)) for (const id of selected) if (HAMPER_SELECTION_IDS.includes(id)) ids.add(id);
      }
    }
  } else { for (const id of seeds.keys()) ids.add(id); for (const box of HAMPER_BOX_SEEDS) boxIds.add(box.id); }
  const references = [...[...ids].map(id => db.collection(CATALOG_COLLECTION).doc(id)), ...[...boxIds].map(id => db.collection('hamperBoxes').doc(id))];
  if (!references.length) return snapshotFromDocuments([], Date.now());
  const snapshots = typeof (transaction as any).getAll === 'function'
    ? await (transaction as any).getAll(...references)
    : await Promise.all(references.map((ref: any) => transaction.get(ref)));
  return snapshotFromDocuments(snapshots, Date.now());
}

/** Fresh is mandatory for quotes and new orders; cache is for public display only. */
export async function loadAuthoritativeCatalog(db: Firestore | null, options: { fresh?: boolean; now?: number } = {}): Promise<CatalogSnapshot> {
  if (!db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  const now = options.now ?? Date.now();
  if (!options.fresh && cache?.db === db && now - cache.at < CATALOG_CACHE_MS) return cache.snapshot;
  let snapshots;
  try {
    const references = [...[...seeds.keys()].map(id => db.collection(CATALOG_COLLECTION).doc(id)), ...HAMPER_BOX_SEEDS.map(box => db.collection('hamperBoxes').doc(box.id))];
    snapshots = typeof (db as any).getAll === 'function'
      ? await (db as any).getAll(...references)
      : await Promise.all(references.map((ref: any) => ref.get()));
  }
  catch { throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503); }
  const snapshot = snapshotFromDocuments(snapshots, now);
  cache = { db, snapshot, at: now };
  return snapshot;
}

export function storedHamperBoxRecord(boxId: string, value: unknown): HamperBoxRecord {
  const pricing = validateHamperBoxPricing(value, boxId);
  return { pricing, version: fingerprint(pricing), updatedAt: typeof (value as any)?.updatedAt === 'string' ? (value as any).updatedAt : null };
}
export async function getAdminHamperBoxRecord(db: Firestore | null, boxId: string): Promise<HamperBoxRecord> {
  if (!db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!HAMPER_BOX_SEEDS.some(box => box.id === boxId)) throw new CatalogError('UNKNOWN_HAMPER_BOX', 404);
  const snapshot = await db.collection('hamperBoxes').doc(boxId).get();
  if (!snapshot.exists) throw new CatalogError('MISSING_HAMPER_BOX', 409);
  return storedHamperBoxRecord(boxId, snapshot.data());
}
export async function updateHamperBoxPricing(input: { db: Firestore | null; boxId: string; body: unknown; actorUid: string }): Promise<HamperBoxRecord> {
  if (!input.db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!input.actorUid) throw new CatalogError('FORBIDDEN_ADMIN', 403);
  const body = input.body as { expectedVersion?: string; expectedRevision?: number; pricing?: unknown };
  if (!body || typeof body.expectedVersion !== 'string' || !Number.isSafeInteger(body.expectedRevision)) throw new CatalogError('INVALID_CATALOG_PATCH');
  const requested = validateHamperBoxPricing(body.pricing, input.boxId), db = input.db;
  const result = await db.runTransaction(async transaction => {
    const ref = db.collection('hamperBoxes').doc(input.boxId), snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new CatalogError('MISSING_HAMPER_BOX', 409);
    const current = storedHamperBoxRecord(input.boxId, snapshot.data());
    if (current.version !== body.expectedVersion || current.pricing.revision !== body.expectedRevision || current.pricing.revision >= Number.MAX_SAFE_INTEGER) throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
    const pricing = { ...requested, revision: current.pricing.revision + 1 }, updatedAt = new Date().toISOString();
    transaction.set(ref, { ...pricing, updatedAt });
    transaction.set(db.collection('catalogAudits').doc(randomUUID()), { productId: input.boxId, action: 'HAMPER_BOX_UPDATED', previous: current.pricing, pricing, actorUid: input.actorUid, updatedAt });
    return { pricing, version: fingerprint(pricing), updatedAt };
  });
  invalidateCatalogCache(); return result;
}

export async function getAdminCatalogRecord(db: Firestore | null, productId: string): Promise<CatalogRecord> {
  if (!seeds.has(productId)) throw new CatalogError('UNKNOWN_CATALOG_PRODUCT', 404);
  if (!db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  const snapshot = await db.collection(CATALOG_COLLECTION).doc(productId).get();
  if (!snapshot.exists) throw new CatalogError('MISSING_CATALOG_PRODUCT', 409);
  return storedCatalogRecord(productId, snapshot.data());
}

export async function updateCatalogPricing(input: { db: Firestore | null; productId: string; body: unknown; actorUid: string; now?: number }): Promise<CatalogRecord> {
  const seed = seeds.get(input.productId);
  if (!seed) throw new CatalogError('UNKNOWN_CATALOG_PRODUCT', 404);
  if (!input.db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!input.actorUid) throw new CatalogError('FORBIDDEN_ADMIN', 403);
  const body = input.body as { expectedRevision?: unknown; expectedVersion?: unknown; pricing?: unknown };
  if (!body || typeof body.expectedVersion !== 'string' || !/^[a-f0-9]{64}$/.test(body.expectedVersion) || !Number.isSafeInteger(body.expectedRevision)) throw new CatalogError('INVALID_CATALOG_PATCH');
  const requested = validateCatalogPricing(body.pricing, seed);
  const db = input.db;
  const reference = db.collection(CATALOG_COLLECTION).doc(seed.id);
  const audit = db.collection('catalogAudits').doc(randomUUID());
  const updatedAt = new Date(input.now ?? Date.now()).toISOString();
  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new CatalogError('MISSING_CATALOG_PRODUCT', 409);
    const current = storedCatalogRecord(seed.id, snapshot.data());
    if (current.pricing.revision !== body.expectedRevision || current.version !== body.expectedVersion || current.pricing.revision >= Number.MAX_SAFE_INTEGER) throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
    const pricing = { ...requested, revision: current.pricing.revision + 1 };
    // Preserve legacy merchandising metadata, remove obsolete duplicate prices and keep actor identity private.
    transaction.set(reference, { ...pricing, updatedAt, prices: FieldValue.delete(), price: FieldValue.delete(), updatedBy: FieldValue.delete() }, { merge: true });
    transaction.set(audit, { productId: seed.id, action: 'PRICING_UPDATED', previous: current.pricing, pricing,
      previousVersion: current.version, actorUid: input.actorUid, updatedAt });
    return { pricing, version: fingerprint(pricing), updatedAt };
  });
  invalidateCatalogCache();
  return result;
}
