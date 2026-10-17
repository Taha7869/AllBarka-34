import { createHash, randomUUID } from 'node:crypto';
import type { Firestore, Transaction, DocumentSnapshot } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { PRODUCTS, BID_BOX_PRODUCT_IDS } from '../data/products';
import type { Product, MerchandisingSettings } from '../types';
import {
  CatalogError,
  readCatalogPricing,
  productFromPricing,
  unavailableProduct,
  validateCatalogPricing,
  dynamicProductFromDocument,
  validateDynamicProduct,
  validateMerchandisingSettings,
  catalogVariantId,
  type CatalogRecord,
  type CatalogVariant
} from './catalogSchema';
import { resolveCartIdentity } from './cartInput';
import { CUSTOM_HAMPER_PRODUCT_ID, HAMPER_SELECTION_IDS, type HamperBox } from './hamperCatalog';
import { HAMPER_BOX_SEEDS, validateHamperBoxPricing, boxFromPricing, type HamperBoxRecord } from './hamperBoxSchema';

export const CATALOG_CACHE_MS = 15_000;
export const CATALOG_COLLECTION = 'products';
export const MERCHANDISING_COLLECTION = 'merchandising';
const seeds = new Map(PRODUCTS.map(product => [product.id, product]));
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export interface CatalogSnapshot { products: Product[]; hamperBoxes: HamperBox[]; version: string; invalidProductIds: string[]; checkedAt: string }
let cache: { db: Firestore; snapshot: CatalogSnapshot; at: number } | null = null;
export function invalidateCatalogCache() { cache = null; }

export function storedCatalogRecord(productId: string, value: unknown): CatalogRecord {
  const seed = seeds.get(productId);
  if (!seed) {
    if (value && typeof value === 'object') {
      const prod = dynamicProductFromDocument(value, productId);
      // Canonical schemaVersion: 1 documents are authoritative directly
      if ((value as any).schemaVersion === 1 && Array.isArray((value as any).variants)) {
        const raw = value as any;
        const normalizedPricing = {
          schemaVersion: 1 as const,
          productId,
          revision: Number(raw.revision) || 0,
          active: typeof raw.active === 'boolean' ? raw.active : (prod.active !== false && prod.status !== 'archived'),
          quoteOnly: typeof raw.quoteOnly === 'boolean' ? raw.quoteOnly : Boolean(prod.quoteOnly),
          variants: raw.variants.map((v: any) => ({
            id: v.id === catalogVariantId(v.label) ? v.id : catalogVariantId(v.label),
            label: v.label,
            price: Math.round(Number(v.price)),
            available: v.available !== false,
            weightGrams: Number.isSafeInteger(v.weightGrams) ? v.weightGrams : null,
          })),
          wholesale: Number.isSafeInteger(raw.wholesale) ? raw.wholesale : (prod.wholesale || 0),
          pricePer100g: Number.isSafeInteger(raw.pricePer100g) ? raw.pricePer100g : (prod.pricePer100g || 0),
          allowCustomWeight: typeof raw.allowCustomWeight === 'boolean' ? raw.allowCustomWeight : Boolean(prod.allowCustomWeight),
          minCustomWeightG: Number.isSafeInteger(raw.minCustomWeightG) ? raw.minCustomWeightG : (prod.minCustomWeightG || 100),
          maxCustomWeightG: Number.isSafeInteger(raw.maxCustomWeightG) ? raw.maxCustomWeightG : (prod.maxCustomWeightG || 5000),
          shippingWeightG: raw.shippingWeightG ?? prod.shippingWeightG ?? null,
        };
        const pricing = validateCatalogPricing(normalizedPricing, prod);
        const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : null;
        return { pricing, version: fingerprint(pricing), updatedAt };
      }
      const variants = Array.isArray((value as any).variants)
        ? (value as any).variants.map((v: any) => ({
            id: v.id || catalogVariantId(v.label),
            label: v.label,
            price: Math.round(Number(v.price)),
            available: v.available !== false,
            weightGrams: v.weightGrams ?? null,
          }))
        : Object.entries(prod.prices).map(([label, price]) => ({
            id: catalogVariantId(label),
            label,
            price,
            available: true,
            weightGrams: prod.shippingWeights?.[label] ?? null,
          }));
      const pricing = {
        schemaVersion: 1 as const,
        productId,
        revision: Number((value as any).revision) || 1,
        active: prod.active !== false && prod.status !== 'archived',
        quoteOnly: Boolean(prod.quoteOnly),
        variants,
        wholesale: prod.wholesale || 0,
        pricePer100g: prod.pricePer100g || 0,
        allowCustomWeight: Boolean(prod.allowCustomWeight),
        minCustomWeightG: prod.minCustomWeightG || 100,
        maxCustomWeightG: prod.maxCustomWeightG || 5000,
        shippingWeightG: prod.shippingWeightG ?? null,
      };
      const updatedAt = typeof (value as any).updatedAt === 'string' ? (value as any).updatedAt : null;
      return { pricing, version: fingerprint(pricing), updatedAt };
    }
    throw new CatalogError('UNKNOWN_CATALOG_PRODUCT', 404);
  }
  const pricing = readCatalogPricing(value, seed);
  const updatedAt = value && typeof value === 'object' && typeof (value as any).updatedAt === 'string' ? (value as any).updatedAt : null;
  return { pricing, version: fingerprint(pricing), updatedAt };
}

function snapshotFromDocuments(snapshots: DocumentSnapshot[], now: number): CatalogSnapshot {
  const invalidProductIds: string[] = [];
  const products: Product[] = [];
  const handledIds = new Set<string>();

  for (const document of snapshots) {
    if (!document.exists) continue;
    handledIds.add(document.id);

    if (seeds.has(document.id)) {
      const seed = seeds.get(document.id)!;
      try {
        const record = storedCatalogRecord(document.id, document.data());
        const raw = (document.data() || {}) as Record<string, any>;
        const base = productFromPricing(seed, record.pricing, record.version);

        // Explicitly maintain Firestore status and active flags (never revive inactive seeds)
        const isArchived = raw.status === 'archived' || raw.active === false || record.pricing.active === false;
        const status = raw.status === 'archived' ? 'archived' : raw.status === 'draft' ? 'draft' : (isArchived ? 'archived' : (raw.status || 'published'));
        const active = !isArchived && raw.status !== 'draft';

        products.push({
          ...base,
          ...raw,
          id: seed.id,
          name_en: raw.name_en || base.name_en,
          prices: base.prices,
          variants: base.variants,
          active,
          status,
          orderMode: raw.orderMode || base.orderMode || (base.quoteOnly ? 'inquiry_quote' : 'standard'),
          productFamily: raw.productFamily || base.productFamily,
          collections: Array.isArray(raw.collections) ? raw.collections : base.collections,
          occasions: Array.isArray(raw.occasions) ? raw.occasions : base.occasions,
          personalization: raw.personalization || base.personalization,
          inclusions: Array.isArray(raw.inclusions) ? raw.inclusions : base.inclusions,
          exclusions: Array.isArray(raw.exclusions) ? raw.exclusions : base.exclusions,
          moqOverride: typeof raw.moqOverride === 'number' ? raw.moqOverride : base.moqOverride,
          preparationDays: typeof raw.preparationDays === 'number' ? raw.preparationDays : base.preparationDays,
          displayOrder: typeof raw.displayOrder === 'number' ? raw.displayOrder : base.displayOrder,
          catalogRevision: record.version,
        });
      } catch {
        invalidProductIds.push(document.id);
        products.push(unavailableProduct(seed));
      }
    } else {
      // Dynamic product absent from static seeds
      try {
        const dynamicProd = dynamicProductFromDocument(document.data(), document.id);
        products.push(dynamicProd);
      } catch {
        invalidProductIds.push(document.id);
      }
    }
  }

  // Preserve static seeds that were not present in Firestore documents (e.g. initial setup)
  for (const seed of seeds.values()) {
    if (!handledIds.has(seed.id)) {
      const doc = snapshots.find(d => d.id === seed.id);
      if (!doc || !doc.exists) {
        try {
          if (BID_BOX_PRODUCT_IDS.includes(seed.id)) {
            const record = storedCatalogRecord(seed.id, seed);
            products.push(productFromPricing(seed, record.pricing, record.version));
          } else {
            // If a query specifically asked for this doc and it did not exist, unavailable
            if (snapshots.some(d => d.id === seed.id)) {
              invalidProductIds.push(seed.id);
              products.push(unavailableProduct(seed));
            } else {
              // Not in query result, include default seed pricing
              const record = storedCatalogRecord(seed.id, seed);
              products.push(productFromPricing(seed, record.pricing, record.version));
            }
          }
        } catch {
          invalidProductIds.push(seed.id);
          products.push(unavailableProduct(seed));
        }
      }
    }
  }

  const hamperBoxes = HAMPER_BOX_SEEDS.map(seed => {
    const document = snapshots.find(document => document.id === seed.id);
    try {
      if (!document?.exists) throw new CatalogError('MISSING_HAMPER_BOX');
      const record = storedHamperBoxRecord(seed.id, document.data());
      return boxFromPricing(seed, record.pricing, record.version);
    } catch {
      if (document) invalidProductIds.push(seed.id);
      return { ...seed, price: 0, active: false, catalogRevision: 'unavailable' };
    }
  });

  return {
    products,
    hamperBoxes,
    version: fingerprint([
      ...products.map(product => [product.id, product.catalogRevision, product.active, product.status]),
      ...hamperBoxes.map(box => [box.id, box.catalogRevision, box.active])
    ]),
    invalidProductIds,
    checkedAt: new Date(now).toISOString(),
  };
}

/** Runs before transaction writes so a simultaneous price edit retries final order pricing. */
export async function loadCatalogForTransaction(db: Firestore, transaction: Transaction, items?: unknown[]): Promise<CatalogSnapshot> {
  const ids = new Set<string>();
  const boxIds = new Set<string>();
  if (items) {
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const rawId = String((item as any).productId || (item as any).id || '').trim();
      if (rawId) ids.add(rawId);
      const identity = resolveCartIdentity(item, PRODUCTS);
      if (identity?.product) ids.add(identity.product.id);
      if (identity?.productId) ids.add(identity.productId);
      if (identity?.productId === CUSTOM_HAMPER_PRODUCT_ID || rawId === CUSTOM_HAMPER_PRODUCT_ID) {
        const boxId = (item as any).hamperConfiguration?.boxId;
        if (HAMPER_BOX_SEEDS.some(box => box.id === boxId)) boxIds.add(boxId);
        const selected = (item as any).hamperConfiguration?.selections;
        if (Array.isArray(selected)) for (const id of selected) if (HAMPER_SELECTION_IDS.includes(id)) ids.add(id);
      }
    }
  } else {
    for (const id of seeds.keys()) ids.add(id);
    for (const box of HAMPER_BOX_SEEDS) boxIds.add(box.id);
  }
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

  let snapshots: DocumentSnapshot[];
  try {
    const references = [
      ...[...seeds.keys()].map(id => db.collection(CATALOG_COLLECTION).doc(id)),
      ...HAMPER_BOX_SEEDS.map(box => db.collection('hamperBoxes').doc(box.id))
    ];
    const baseSnapshots = typeof (db as any).getAll === 'function'
      ? await (db as any).getAll(...references)
      : await Promise.all(references.map((ref: any) => ref.get()));

    // Also read any dynamic Firestore products absent from compiled seeds
    let dynamicSnapshots: DocumentSnapshot[] = [];
    if (typeof (db.collection(CATALOG_COLLECTION) as any).get === 'function') {
      const col = await db.collection(CATALOG_COLLECTION).get();
      if (col && Array.isArray((col as any).docs)) {
        dynamicSnapshots = (col as any).docs;
      }
    }

    const snapshotMap = new Map<string, DocumentSnapshot>();
    for (const snap of baseSnapshots) snapshotMap.set(snap.id, snap);
    for (const snap of dynamicSnapshots) snapshotMap.set(snap.id, snap);

    snapshots = [...snapshotMap.values()];
  } catch (error) {
    throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  }
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
  if (!db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  const snapshot = await db.collection(CATALOG_COLLECTION).doc(productId).get();
  if (seeds.has(productId)) {
    if (!snapshot.exists) throw new CatalogError('MISSING_CATALOG_PRODUCT', 409);
    return storedCatalogRecord(productId, snapshot.data());
  }
  if (!snapshot.exists) throw new CatalogError('UNKNOWN_CATALOG_PRODUCT', 404);
  return storedCatalogRecord(productId, snapshot.data());
}

export async function updateCatalogPricing(input: { db: Firestore | null; productId: string; body: unknown; actorUid: string; now?: number }): Promise<CatalogRecord> {
  if (!input.db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!input.actorUid) throw new CatalogError('FORBIDDEN_ADMIN', 403);
  const body = input.body as { expectedRevision?: unknown; expectedVersion?: unknown; pricing?: unknown };
  if (!body || typeof body.expectedVersion !== 'string' || !/^[a-f0-9]{64}$/.test(body.expectedVersion) || !Number.isSafeInteger(body.expectedRevision)) throw new CatalogError('INVALID_CATALOG_PATCH');

  const seed = seeds.get(input.productId);
  const db = input.db;
  const reference = db.collection(CATALOG_COLLECTION).doc(input.productId);
  const audit = db.collection('catalogAudits').doc(randomUUID());
  const updatedAt = new Date(input.now ?? Date.now()).toISOString();
  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new CatalogError('MISSING_CATALOG_PRODUCT', 409);
    const current = storedCatalogRecord(input.productId, snapshot.data());
    if (current.pricing.revision !== body.expectedRevision || current.version !== body.expectedVersion || current.pricing.revision >= Number.MAX_SAFE_INTEGER) throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
    const targetProduct = seed || dynamicProductFromDocument(snapshot.data(), input.productId);
    const requested = validateCatalogPricing(body.pricing, targetProduct);
    const pricing = { ...requested, revision: current.pricing.revision + 1 };
    // Preserve legacy merchandising metadata, remove obsolete duplicate prices and keep actor identity private.
    transaction.set(reference, { ...pricing, updatedAt, prices: FieldValue.delete(), price: FieldValue.delete(), updatedBy: FieldValue.delete() }, { merge: true });
    transaction.set(audit, { productId: input.productId, action: 'PRICING_UPDATED', previous: current.pricing, pricing,
      previousVersion: current.version, actorUid: input.actorUid, updatedAt });
    return { pricing, version: fingerprint(pricing), updatedAt };
  });
  invalidateCatalogCache();
  return result;
}

export async function getAdminProductRecord(db: Firestore | null, productId: string): Promise<Product & { revision: number }> {
  if (!db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  const snapshot = await db.collection(CATALOG_COLLECTION).doc(productId).get();
  if (snapshot.exists) {
    const data = (snapshot.data() || {}) as Record<string, any>;
    const dynamicProd = dynamicProductFromDocument(data, productId);
    // In admin representation, preserve ALL variants (including disabled ones) with full status
    const allVariants = Array.isArray(data.variants)
      ? data.variants.map((v: any) => ({
          id: v.id || catalogVariantId(v.label),
          label: v.label,
          price: Math.round(Number(v.price)),
          available: v.available !== false,
          weightGrams: v.weightGrams ?? null,
        }))
      : dynamicProd.variants.map(v => ({
          id: catalogVariantId(v.label),
          label: v.label,
          price: v.price,
          available: true,
          weightGrams: dynamicProd.shippingWeights?.[v.label] ?? null,
        }));
    const adminPrices: Record<string, number> = {};
    for (const v of allVariants) adminPrices[v.label] = v.price;

    return {
      ...dynamicProd,
      prices: adminPrices,
      variants: allVariants as any,
      revision: Number(data.revision) || 1,
    };
  }
  if (seeds.has(productId)) {
    const seed = seeds.get(productId)!;
    return {
      ...seed,
      revision: 0,
    };
  }
  throw new CatalogError('UNKNOWN_CATALOG_PRODUCT', 404);
}

export async function listAdminProducts(db: Firestore | null): Promise<Product[]> {
  const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
  return snapshot.products;
}

export async function createAdminProduct(input: { db: Firestore | null; body: unknown; actorUid: string }): Promise<Product & { revision: number }> {
  if (!input.db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!input.actorUid) throw new CatalogError('FORBIDDEN_ADMIN', 403);
  const validated = validateDynamicProduct(input.body);
  const db = input.db;
  const ref = db.collection(CATALOG_COLLECTION).doc(validated.id);
  const auditRef = db.collection('catalogAudits').doc(randomUUID());
  const now = new Date().toISOString();
  const revision = 1;

  const rawBody = (input.body && typeof input.body === 'object' ? input.body : {}) as Record<string, any>;
  const variants = Array.isArray(rawBody.variants)
    ? rawBody.variants.map((v: any) => ({
        id: v.id || catalogVariantId(v.label),
        label: v.label.trim(),
        price: Math.round(Number(v.price)),
        available: v.available !== false,
        weightGrams: Number.isSafeInteger(v.weightGrams) ? v.weightGrams : null,
      }))
    : Object.entries(validated.prices).map(([label, price]) => ({
        id: catalogVariantId(label),
        label,
        price,
        available: true,
        weightGrams: validated.shippingWeights?.[label] ?? null,
      }));

  const docData = {
    ...validated,
    schemaVersion: 1,
    productId: validated.id,
    variants,
    wholesale: validated.wholesale || 0,
    pricePer100g: validated.pricePer100g || 0,
    allowCustomWeight: Boolean(validated.allowCustomWeight),
    minCustomWeightG: validated.minCustomWeightG || 100,
    maxCustomWeightG: validated.maxCustomWeightG || 5000,
    shippingWeightG: validated.shippingWeightG ?? null,
    revision,
    adminRevision: revision,
    status: validated.status || 'draft',
    active: validated.active !== false && validated.status !== 'archived',
    createdAt: now,
    updatedAt: now,
    createdBy: input.actorUid,
    updatedBy: input.actorUid,
  };

  const result = await db.runTransaction(async transaction => {
    const existingSnap = await transaction.get(ref);
    if (existingSnap.exists || seeds.has(validated.id)) throw new CatalogError('PRODUCT_ALREADY_EXISTS', 409);
    transaction.set(ref, docData);
    transaction.set(auditRef, {
      productId: validated.id,
      action: 'PRODUCT_CREATED',
      data: docData,
      actorUid: input.actorUid,
      updatedAt: now,
    });
    return {
      ...dynamicProductFromDocument(docData, validated.id),
      revision,
    };
  });

  invalidateCatalogCache();
  return result;
}

export async function updateAdminProduct(input: { db: Firestore | null; productId: string; body: unknown; actorUid: string }): Promise<Product & { revision: number }> {
  if (!input.db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!input.actorUid) throw new CatalogError('FORBIDDEN_ADMIN', 403);
  const db = input.db;
  const ref = db.collection(CATALOG_COLLECTION).doc(input.productId);
  const body = (input.body && typeof input.body === 'object' ? input.body : {}) as Record<string, any>;
  const expectedRevision = body.expectedRevision !== undefined ? Number(body.expectedRevision) : NaN;
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
  }

  const result = await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const existingData = snap.exists ? (snap.data() as Record<string, any>) : (seeds.get(input.productId) as Record<string, any> | undefined);
    if (!existingData) throw new CatalogError('UNKNOWN_CATALOG_PRODUCT', 404);

    const currentRevision = Number.isSafeInteger(existingData.revision) ? existingData.revision : (existingData.adminRevision || 0);
    if (currentRevision !== expectedRevision) {
      throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
    }

    const nextRevision = currentRevision + 1;
    const now = new Date().toISOString();

    const isCanonical = existingData.schemaVersion === 1 || Array.isArray(existingData.variants);
    const hasBodyVariants = Array.isArray(body.variants);

    let canonicalVariants: CatalogVariant[] | undefined;
    if (hasBodyVariants) {
      const existingVariantsMap = new Map<string, any>(
        Array.isArray(existingData.variants) ? existingData.variants.map((v: any) => [v.label, v]) : []
      );
      canonicalVariants = (body.variants as any[]).map((v: any) => {
        const label = typeof v.label === 'string' ? v.label.trim() : '';
        const price = Math.round(Number(v.price));
        const existingV = existingVariantsMap.get(label);
        const available = typeof v.available === 'boolean' ? v.available : (existingV ? existingV.available !== false : true);
        const weightGrams = Number.isSafeInteger(v.weightGrams) ? v.weightGrams : (existingV?.weightGrams ?? null);
        return {
          id: v.id || catalogVariantId(label),
          label,
          price,
          available,
          weightGrams,
        };
      });
    } else if (isCanonical && Array.isArray(existingData.variants)) {
      canonicalVariants = existingData.variants.map((v: any) => ({
        id: v.id || catalogVariantId(v.label),
        label: v.label,
        price: Math.round(Number(v.price)),
        available: v.available !== false,
        weightGrams: v.weightGrams ?? null,
      }));
    }

    const validated = validateDynamicProduct({
      ...existingData,
      ...body,
      id: input.productId,
      variants: canonicalVariants || existingData.variants,
    }, input.productId);

    const updatedData: Record<string, any> = {
      ...existingData,
      ...validated,
      id: input.productId,
      revision: nextRevision,
      adminRevision: nextRevision,
      updatedAt: now,
      updatedBy: input.actorUid,
    };

    if (isCanonical || canonicalVariants) {
      updatedData.schemaVersion = 1;
      updatedData.productId = input.productId;
      if (canonicalVariants) updatedData.variants = canonicalVariants;
      if (existingData.wholesale !== undefined && body.wholesale === undefined) updatedData.wholesale = existingData.wholesale;
      if (existingData.pricePer100g !== undefined && body.pricePer100g === undefined) updatedData.pricePer100g = existingData.pricePer100g;
      if (existingData.allowCustomWeight !== undefined && body.allowCustomWeight === undefined) updatedData.allowCustomWeight = existingData.allowCustomWeight;
      if (existingData.minCustomWeightG !== undefined && body.minCustomWeightG === undefined) updatedData.minCustomWeightG = existingData.minCustomWeightG;
      if (existingData.maxCustomWeightG !== undefined && body.maxCustomWeightG === undefined) updatedData.maxCustomWeightG = existingData.maxCustomWeightG;
      if (existingData.shippingWeightG !== undefined && body.shippingWeightG === undefined) updatedData.shippingWeightG = existingData.shippingWeightG;
      if (existingData.pricingMode && !body.pricingMode) updatedData.pricingMode = existingData.pricingMode;
    }

    transaction.set(ref, updatedData);
    transaction.set(db.collection('catalogAudits').doc(randomUUID()), {
      productId: input.productId,
      action: 'PRODUCT_UPDATED',
      previous: existingData,
      updated: updatedData,
      actorUid: input.actorUid,
      updatedAt: now,
    });

    return {
      ...dynamicProductFromDocument(updatedData, input.productId),
      revision: nextRevision,
    };
  });

  invalidateCatalogCache();
  return result;
}

export async function duplicateAdminProduct(input: { db: Firestore | null; productId?: string; sourceProductId?: string; expectedRevision?: number; body?: unknown; actorUid: string }): Promise<Product & { revision: number }> {
  if (!input.db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!input.actorUid) throw new CatalogError('FORBIDDEN_ADMIN', 403);
  const targetId = input.productId || input.sourceProductId;
  if (!targetId) throw new CatalogError('INVALID_PRODUCT_ID', 400);
  const db = input.db;
  const sourceRef = db.collection(CATALOG_COLLECTION).doc(targetId);

  const body = (input.body && typeof input.body === 'object' ? input.body : {}) as Record<string, any>;
  const rawRev = input.expectedRevision !== undefined ? input.expectedRevision : body.expectedRevision;
  const expectedRevision = rawRev !== undefined ? Number(rawRev) : undefined;
  if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) {
    throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
  }

  const requestedId = typeof body.newProductId === 'string' && body.newProductId.trim()
    ? body.newProductId.trim()
    : `${targetId}-draft-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`;
  if (!/^[a-z0-9_-]{2,80}$/.test(requestedId)) throw new CatalogError('INVALID_PRODUCT_ID', 400);

  const existingRef = db.collection(CATALOG_COLLECTION).doc(requestedId);
  const auditRef = db.collection('catalogAudits').doc(randomUUID());
  const now = new Date().toISOString();

  const result = await db.runTransaction(async transaction => {
    const snap = await transaction.get(sourceRef);
    const source = snap.exists ? (snap.data() as Record<string, any>) : (seeds.get(targetId) as Record<string, any> | undefined);
    if (!source) throw new CatalogError('UNKNOWN_CATALOG_PRODUCT', 404);

    if (expectedRevision !== undefined) {
      const currentRev = Number.isSafeInteger(source.revision) ? source.revision : (source.adminRevision || 0);
      if (currentRev !== expectedRevision) throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
    }

    const existingSnap = await transaction.get(existingRef);
    if (existingSnap.exists || seeds.has(requestedId)) throw new CatalogError('PRODUCT_ALREADY_EXISTS', 409);

    const newProductData = {
      ...source,
      id: requestedId,
      productId: requestedId,
      name_en: `${source.name_en || source.name} (Draft Copy)`,
      name: `${source.name_en || source.name} (Draft Copy)`,
      status: 'draft',
      active: false,
      revision: 1,
      adminRevision: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: input.actorUid,
      updatedBy: input.actorUid,
    };

    transaction.set(existingRef, newProductData);
    transaction.set(auditRef, {
      productId: requestedId,
      action: 'PRODUCT_DUPLICATED',
      sourceProductId: targetId,
      actorUid: input.actorUid,
      updatedAt: now,
    });

    return {
      ...dynamicProductFromDocument(newProductData, requestedId),
      revision: 1,
    };
  });

  invalidateCatalogCache();
  return result;
}

export async function publishAdminProduct(input: { db: Firestore | null; productId: string; expectedRevision?: number; body?: unknown; actorUid: string }): Promise<Product & { revision: number }> {
  if (!input.db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!input.actorUid) throw new CatalogError('FORBIDDEN_ADMIN', 403);
  const db = input.db;
  const ref = db.collection(CATALOG_COLLECTION).doc(input.productId);
  const body = (input.body && typeof input.body === 'object' ? input.body : {}) as Record<string, any>;
  const rawRev = (input as any).expectedRevision !== undefined
    ? (input as any).expectedRevision
    : body?.expectedRevision;
  const expectedRevision = rawRev !== undefined ? Number(rawRev) : NaN;
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
  }

  const result = await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const existing = snap.exists ? (snap.data() as Record<string, any>) : (seeds.get(input.productId) as Record<string, any> | undefined);
    if (!existing) throw new CatalogError('UNKNOWN_CATALOG_PRODUCT', 404);

    const currentRevision = Number.isSafeInteger(existing.revision) ? existing.revision : (existing.adminRevision || 0);
    if (currentRevision !== expectedRevision) {
      throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
    }

    const nextRevision = currentRevision + 1;
    const now = new Date().toISOString();
    const updated = {
      ...existing,
      id: input.productId,
      status: 'published',
      active: true,
      revision: nextRevision,
      adminRevision: nextRevision,
      updatedAt: now,
      updatedBy: input.actorUid,
    };

    transaction.set(ref, updated);
    transaction.set(db.collection('catalogAudits').doc(randomUUID()), {
      productId: input.productId,
      action: 'PRODUCT_PUBLISHED',
      previousStatus: existing.status || 'unknown',
      actorUid: input.actorUid,
      updatedAt: now,
    });

    return {
      ...dynamicProductFromDocument(updated, input.productId),
      revision: nextRevision,
    };
  });

  invalidateCatalogCache();
  return result;
}

export async function archiveAdminProduct(input: { db: Firestore | null; productId: string; expectedRevision?: number; body?: unknown; actorUid: string }): Promise<Product & { revision: number }> {
  if (!input.db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!input.actorUid) throw new CatalogError('FORBIDDEN_ADMIN', 403);
  const db = input.db;
  const ref = db.collection(CATALOG_COLLECTION).doc(input.productId);
  const body = (input.body && typeof input.body === 'object' ? input.body : {}) as Record<string, any>;
  const rawRev = (input as any).expectedRevision !== undefined
    ? (input as any).expectedRevision
    : body?.expectedRevision;
  const expectedRevision = rawRev !== undefined ? Number(rawRev) : NaN;
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
  }

  const result = await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const existing = snap.exists ? (snap.data() as Record<string, any>) : (seeds.get(input.productId) as Record<string, any> | undefined);
    if (!existing) throw new CatalogError('UNKNOWN_CATALOG_PRODUCT', 404);

    const currentRevision = Number.isSafeInteger(existing.revision) ? existing.revision : (existing.adminRevision || 0);
    if (currentRevision !== expectedRevision) {
      throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
    }

    const nextRevision = currentRevision + 1;
    const now = new Date().toISOString();
    const updated = {
      ...existing,
      id: input.productId,
      status: 'archived',
      active: false,
      revision: nextRevision,
      adminRevision: nextRevision,
      updatedAt: now,
      updatedBy: input.actorUid,
    };

    transaction.set(ref, updated);
    transaction.set(db.collection('catalogAudits').doc(randomUUID()), {
      productId: input.productId,
      action: 'PRODUCT_ARCHIVED',
      previousStatus: existing.status || 'unknown',
      actorUid: input.actorUid,
      updatedAt: now,
    });

    return {
      ...dynamicProductFromDocument(updated, input.productId),
      revision: nextRevision,
    };
  });

  invalidateCatalogCache();
  return result;
}

import { DEFAULT_MERCHANDISING } from '../config/merchandising';
export { DEFAULT_MERCHANDISING };

export async function getAdminMerchandising(db: Firestore | null, preview = true): Promise<MerchandisingSettings> {
  if (!db) return DEFAULT_MERCHANDISING;
  const docName = preview ? 'preview' : 'settings';
  try {
    const snap = await db.collection(MERCHANDISING_COLLECTION).doc(docName).get();
    if (snap.exists) {
      return validateMerchandisingSettings(snap.data());
    }
    if (preview) {
      const liveSnap = await db.collection(MERCHANDISING_COLLECTION).doc('settings').get();
      if (liveSnap.exists) {
        return validateMerchandisingSettings(liveSnap.data());
      }
    }
  } catch {
    // If not found or error, return defaults
  }
  return DEFAULT_MERCHANDISING;
}

export async function updateAdminMerchandising(input: { db: Firestore | null; body: unknown; actorUid: string }): Promise<MerchandisingSettings> {
  if (!input.db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!input.actorUid) throw new CatalogError('FORBIDDEN_ADMIN', 403);
  const db = input.db;
  const body = (input.body && typeof input.body === 'object' ? input.body : {}) as Record<string, any>;
  const expectedRevision = body.expectedRevision !== undefined ? Number(body.expectedRevision) : undefined;
  if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) {
    throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
  }

  const ref = db.collection(MERCHANDISING_COLLECTION).doc('preview');
  const auditRef = db.collection('catalogAudits').doc(randomUUID());

  const result = await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const current = snap.exists ? validateMerchandisingSettings(snap.data()) : DEFAULT_MERCHANDISING;

    if (expectedRevision !== undefined && current.revision !== expectedRevision) {
      throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
    }

    const nextRevision = (current.revision || 0) + 1;
    const validated = validateMerchandisingSettings({
      ...body,
      revision: nextRevision,
      updatedAt: new Date().toISOString(),
      updatedBy: input.actorUid,
    });

    transaction.set(ref, validated);
    transaction.set(auditRef, {
      action: 'MERCHANDISING_DRAFT_UPDATED',
      data: validated,
      actorUid: input.actorUid,
      updatedAt: validated.updatedAt,
    });

    return validated;
  });

  return result;
}

export interface AdminMerchandisingBundle {
  settings: MerchandisingSettings;
  draft: MerchandisingSettings;
  live: MerchandisingSettings;
  draftRevision: number;
  liveRevision: number;
}

export async function getAdminMerchandisingBundle(db: Firestore | null): Promise<AdminMerchandisingBundle> {
  const draft = await getAdminMerchandising(db, true);
  const live = await getAdminMerchandising(db, false);
  return {
    settings: draft,
    draft,
    live,
    draftRevision: draft.revision,
    liveRevision: live.revision,
  };
}

export interface PublishMerchandisingResult {
  published: MerchandisingSettings;
  draft: MerchandisingSettings;
  draftRevision: number;
  liveRevision: number;
}

export async function publishAdminMerchandising(input: {
  db: Firestore | null;
  actorUid: string;
  expectedDraftRevision?: number;
  expectedLiveRevision?: number;
  body?: unknown;
}): Promise<PublishMerchandisingResult> {
  if (!input.db) throw new CatalogError('CATALOG_STORE_UNAVAILABLE', 503);
  if (!input.actorUid) throw new CatalogError('FORBIDDEN_ADMIN', 403);
  const db = input.db;
  const body = (input.body && typeof input.body === 'object' ? input.body : {}) as Record<string, any>;
  const rawExpectedDraft = input.expectedDraftRevision !== undefined
    ? input.expectedDraftRevision
    : (body.expectedDraftRevision !== undefined ? body.expectedDraftRevision : body.expectedRevision);
  if (rawExpectedDraft === undefined || rawExpectedDraft === null) {
    throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
  }
  const expectedDraftRevision = Number(rawExpectedDraft);
  if (!Number.isSafeInteger(expectedDraftRevision) || expectedDraftRevision < 0) {
    throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
  }

  const rawExpectedLive = input.expectedLiveRevision !== undefined
    ? input.expectedLiveRevision
    : body.expectedLiveRevision;
  if (rawExpectedLive === undefined || rawExpectedLive === null) {
    throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
  }
  const expectedLiveRevision = Number(rawExpectedLive);
  if (!Number.isSafeInteger(expectedLiveRevision) || expectedLiveRevision < 0) {
    throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
  }

  const draftRef = db.collection(MERCHANDISING_COLLECTION).doc('preview');
  const liveRef = db.collection(MERCHANDISING_COLLECTION).doc('settings');
  const auditRef = db.collection('catalogAudits').doc(randomUUID());

  const result = await db.runTransaction(async transaction => {
    const draftSnap = await transaction.get(draftRef);
    const draft = draftSnap.exists ? validateMerchandisingSettings(draftSnap.data()) : DEFAULT_MERCHANDISING;

    if (draft.revision !== expectedDraftRevision) {
      throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
    }

    const liveSnap = await transaction.get(liveRef);
    const currentLive = liveSnap.exists ? validateMerchandisingSettings(liveSnap.data()) : DEFAULT_MERCHANDISING;

    if (currentLive.revision !== expectedLiveRevision) {
      throw new CatalogError('CATALOG_REVISION_CONFLICT', 409);
    }

    const now = new Date().toISOString();
    const nextLiveRevision = (currentLive.revision || 0) + 1;
    const published = {
      ...draft,
      revision: nextLiveRevision,
      updatedAt: now,
      updatedBy: input.actorUid,
    };

    const nextDraftRevision = (draft.revision || 0) + 1;
    const updatedDraft = {
      ...draft,
      revision: nextDraftRevision,
      updatedAt: now,
      updatedBy: input.actorUid,
    };

    transaction.set(liveRef, published);
    transaction.set(draftRef, updatedDraft);
    transaction.set(auditRef, {
      action: 'MERCHANDISING_PUBLISHED',
      data: published,
      sourceDraftRevision: draft.revision,
      actorUid: input.actorUid,
      updatedAt: now,
    });

    return {
      published,
      draft: updatedDraft,
      draftRevision: nextDraftRevision,
      liveRevision: nextLiveRevision,
    };
  });

  return result;
}

export async function getPublicMerchandising(db: Firestore | null): Promise<MerchandisingSettings> {
  if (!db) return DEFAULT_MERCHANDISING;
  try {
    const snap = await db.collection(MERCHANDISING_COLLECTION).doc('settings').get();
    if (snap.exists) {
      const validated = validateMerchandisingSettings(snap.data());
      const sanitized = { ...validated };
      delete (sanitized as any).updatedBy;
      delete (sanitized as any).adminNotes;
      return sanitized;
    }
  } catch {}
  return DEFAULT_MERCHANDISING;
}

/**
 * Merges static code products with authoritative Firestore product data.
 * - Respects active: false from Firestore (never reverting to static true).
 * - Appends newly created dynamic Firestore products not in static code products.
 */
export function mergeAuthoritativeCatalog(codeProducts: Product[], firestoreProducts: Product[]): Product[] {
  const byId = new Map(firestoreProducts.map(p => [p.id, p]));
  const merged: Product[] = [];
  const handledIds = new Set<string>();

  for (const codeProd of codeProducts) {
    handledIds.add(codeProd.id);
    const fromDb = byId.get(codeProd.id);
    if (!fromDb) {
      merged.push(codeProd);
    } else {
      const active = fromDb.active !== false && (fromDb as any).inStock !== false;
      merged.push({
        ...codeProd,
        ...fromDb,
        active,
        inStock: (fromDb as any).inStock !== false && active,
      });
    }
  }

  for (const dbProd of firestoreProducts) {
    if (!handledIds.has(dbProd.id) && dbProd.id) {
      const active = dbProd.active !== false && (dbProd as any).inStock !== false;
      merged.push({
        name_en: dbProd.name_en || (dbProd as any).name || dbProd.id,
        name_ur: dbProd.name_ur || '',
        name_ar: dbProd.name_ar || '',
        category: dbProd.category || 'dry-fruits',
        image: dbProd.image ?? null,
        imageName: dbProd.imageName ?? null,
        prices: dbProd.prices || {},
        wholesale: dbProd.wholesale || 0,
        desc_en: dbProd.desc_en || '',
        desc_ur: dbProd.desc_ur || '',
        desc_ar: dbProd.desc_ar || '',
        ...dbProd,
        active,
        inStock: (dbProd as any).inStock !== false && active,
      });
    }
  }

  return merged;
}
