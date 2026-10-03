import { Router, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { PRODUCTS } from '../data/products';
import { getDefaultProductMedia, isProductMediaId, ProductMediaError, sanitizeProductMediaOverrides, validateMediaPatch, validateProductMedia, type ProductMediaRecord } from './productMedia';

const productById = new Map(PRODUCTS.map(product => [product.id, product]));
const MEDIA_COLLECTION = 'productMedia';
const AUDIT_COLLECTION = 'productMediaAudits';

function recordFromStored(productId: string, stored: Record<string, unknown> | undefined): ProductMediaRecord {
  const defaults = getDefaultProductMedia(productById.get(productId)!);
  let override = null;
  if (stored?.media) {
    try { override = validateProductMedia(stored.media); } catch { /* Stored corruption must not escape to customers. */ }
  }
  const revision = Number.isSafeInteger(stored?.revision) && (stored!.revision as number) >= 0 ? stored!.revision as number : 0;
  const updatedAt = typeof stored?.updatedAt === 'string' && Number.isFinite(Date.parse(stored.updatedAt)) ? stored.updatedAt : null;
  return { productId, revision, updatedAt, override, media: override || defaults };
}

export async function getAdminProductMedia(db: Firestore | null, productId: unknown): Promise<ProductMediaRecord> {
  if (!isProductMediaId(productId)) throw new ProductMediaError('UNKNOWN_MEDIA_PRODUCT', 404);
  if (!db) throw new ProductMediaError('MEDIA_STORE_UNAVAILABLE', 503);
  const snapshot = await db.collection(MEDIA_COLLECTION).doc(productId).get();
  return recordFromStored(productId, snapshot.exists ? snapshot.data() : undefined);
}

export async function getPublicProductMedia(db: Firestore | null) {
  if (!db) throw new ProductMediaError('MEDIA_STORE_UNAVAILABLE', 503);
  // Only canonical IDs are returned; the bounded query cannot enumerate customer or audit data.
  const snapshots = await db.collection(MEDIA_COLLECTION).limit(PRODUCTS.length * 2).get();
  const candidates: Record<string, unknown> = {};
  for (const document of snapshots.docs) if (isProductMediaId(document.id)) candidates[document.id] = document.data().media;
  return { overrides: sanitizeProductMediaOverrides(candidates) };
}

export async function updateProductMedia(input: {
  db: Firestore | null; productId: unknown; body: unknown; actorUid: string; actorEmail?: string; now?: number;
}): Promise<ProductMediaRecord> {
  if (!isProductMediaId(input.productId)) throw new ProductMediaError('UNKNOWN_MEDIA_PRODUCT', 404);
  const productId = input.productId;
  const { expectedRevision, media } = validateMediaPatch(input.body);
  if (!input.actorUid?.trim()) throw new ProductMediaError('FORBIDDEN_ADMIN', 403);
  if (!input.db) throw new ProductMediaError('MEDIA_STORE_UNAVAILABLE', 503);
  const db = input.db;
  const reference = db.collection(MEDIA_COLLECTION).doc(productId);
  const audit = db.collection(AUDIT_COLLECTION).doc(randomUUID());
  const updatedAt = new Date(input.now ?? Date.now()).toISOString();
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reference);
    const current = recordFromStored(productId, snapshot.exists ? snapshot.data() : undefined);
    if (current.revision !== expectedRevision) throw new ProductMediaError('MEDIA_REVISION_CONFLICT', 409);
    if (current.revision >= Number.MAX_SAFE_INTEGER) throw new ProductMediaError('MEDIA_REVISION_CONFLICT', 409);
    const revision = current.revision + 1;
    transaction.set(reference, { productId, media, revision, updatedAt, updatedBy: input.actorUid });
    transaction.set(audit, {
      productId, action: media ? 'MEDIA_UPDATED' : 'MEDIA_RESET', previousRevision: current.revision, revision,
      previousMedia: current.override, media, actorUid: input.actorUid,
      actorEmail: typeof input.actorEmail === 'string' ? input.actorEmail.slice(0, 254) : '', updatedAt,
    });
    return { productId, revision, updatedAt, override: media, media: media || getDefaultProductMedia(productById.get(productId)!) };
  });
}

/** Mount at the app root, after its JSON parser. Caller supplies authoritative custom-claim middleware. */
export function createProductMediaRouter(options: { getDb: () => Firestore | null; requireAdmin: RequestHandler }) {
  const router = Router();
  const fail = (error: unknown, response: import('express').Response) => {
    if (error instanceof ProductMediaError) return response.status(error.httpStatus).json({ code: error.code });
    // Database/provider errors do not expose tokens, credentials, audit records or infrastructure details.
    return response.status(503).json({ code: 'MEDIA_STORE_UNAVAILABLE' });
  };
  router.get('/api/product-media', async (_request, response) => {
    try {
      const result = await getPublicProductMedia(options.getDb());
      response.setHeader('Cache-Control', 'public, max-age=30');
      return response.json(result);
    } catch (error) { response.setHeader('Cache-Control', 'no-store'); return fail(error, response); }
  });
  router.get('/api/admin/product-media/:productId', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try { return response.json({ record: await getAdminProductMedia(options.getDb(), request.params.productId) }); }
    catch (error) { return fail(error, response); }
  });
  router.patch('/api/admin/product-media/:productId', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const actor = (request as typeof request & { user?: { uid?: string; email?: string } }).user;
    try {
      const record = await updateProductMedia({ db: options.getDb(), productId: request.params.productId, body: request.body,
        actorUid: actor?.uid || '', actorEmail: actor?.email });
      return response.json({ record });
    } catch (error) { return fail(error, response); }
  });
  return router;
}
