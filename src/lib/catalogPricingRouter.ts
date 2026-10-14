import { compactCatalog } from './catalogTransport';
import { Router, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Product } from '../types';
import { type HamperBox } from './hamperCatalog';
import { CatalogPricingError, PRICE_AUDIT_COLLECTION, BOX_PRICE_COLLECTION, PRODUCT_PRICE_COLLECTION,
  canonicalPriceTarget, defaultProductPricing, validateProductPricing, validateBoxPricing,
  type CatalogPriceRecord, type ProductPricing } from './catalogPricing';
import { pricingVersion, type createLiveCatalog } from './liveCatalog';

function record(kind: CatalogPriceRecord['kind'], id: string, raw?: Record<string, unknown>): CatalogPriceRecord {
  const target = canonicalPriceTarget(kind, id);
  const pricing = kind === 'products' ? raw ? validateProductPricing(target as Product, raw) : defaultProductPricing(target as Product)
    : raw ? validateBoxPricing(raw) : { price: (target as HamperBox).price, active: true };
  const revision = Number.isSafeInteger(raw?.revision) && (raw!.revision as number) >= 0 ? raw!.revision as number : 0;
  return { kind, id, initialized: raw !== undefined, version: pricingVersion(raw === undefined ? ['missing', kind, id] : [pricing, revision]), revision,
    updatedAt: typeof raw?.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt)) ? raw.updatedAt : null, pricing };
}
export async function readCatalogPrice(db: Firestore | null, kind: unknown, id: unknown): Promise<CatalogPriceRecord> {
  canonicalPriceTarget(kind, id);
  if (!db) throw new CatalogPricingError('CATALOG_UNAVAILABLE', 503);
  const snapshot = await db.collection(kind === 'products' ? PRODUCT_PRICE_COLLECTION : BOX_PRICE_COLLECTION).doc(id as string).get();
  return record(kind as CatalogPriceRecord['kind'], id as string, snapshot.exists ? snapshot.data() : undefined);
}
export async function updateCatalogPrice(input: { db: Firestore | null; kind: unknown; id: unknown; body: unknown; actorUid: string; now?: number }): Promise<CatalogPriceRecord> {
  const target = canonicalPriceTarget(input.kind, input.id);
  if (!input.actorUid) throw new CatalogPricingError('FORBIDDEN_ADMIN', 403);
  if (!input.db) throw new CatalogPricingError('CATALOG_UNAVAILABLE', 503);
  const body = input.body as Record<string, unknown>;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['expectedVersion', 'pricing', 'reason'].includes(key))
    || typeof body.expectedVersion !== 'string' || !/^[a-f0-9]{64}$/.test(body.expectedVersion)
    || typeof body.reason !== 'string' || body.reason.trim().length < 3 || body.reason.length > 300 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.reason)) {
    throw new CatalogPricingError('INVALID_PRICE_UPDATE');
  }
  const kind = input.kind as CatalogPriceRecord['kind'];
  const reason = body.reason.trim();
  const id = input.id as string;
  const pricing = kind === 'products' ? validateProductPricing(target as Product, body.pricing, true) : validateBoxPricing(body.pricing, true);
  const db = input.db;
  const reference = db.collection(kind === 'products' ? PRODUCT_PRICE_COLLECTION : BOX_PRICE_COLLECTION).doc(id);
  const audit = db.collection(PRICE_AUDIT_COLLECTION).doc(`${kind}_${id}`).collection('entries').doc(randomUUID());
  const updatedAt = new Date(input.now ?? Date.now()).toISOString();
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reference);
    const current = record(kind, id, snapshot.exists ? snapshot.data() : undefined);
    if (current.version !== body.expectedVersion || current.revision >= Number.MAX_SAFE_INTEGER) throw new CatalogPricingError('PRICE_VERSION_CONFLICT', 409);
    const revision = current.revision + 1;
    const stored = { ...pricing, revision, updatedAt, updatedBy: input.actorUid, schemaVersion: 1,
      ...(kind === 'products' ? { variants: Object.entries((pricing as ProductPricing).prices).map(([label, price]) => ({ label, price })) } : {}) };
    transaction.set(reference, stored, { merge: true });
    transaction.set(audit, { kind, targetId: id, previousPricing: current.initialized ? current.pricing : null,
      pricing, previousVersion: current.version, version: pricingVersion([pricing, revision]), revision, actorUid: input.actorUid,
      reason, updatedAt });
    return record(kind, id, stored as Record<string, unknown>);
  });
}

export function createCatalogPricingRouter(options: { getDb: () => Firestore | null; requireAdmin: RequestHandler; catalog: ReturnType<typeof createLiveCatalog> }) {
  const router = Router();
  const fail = (error: unknown, res: import('express').Response) => {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(error instanceof CatalogPricingError ? error.httpStatus : 503).json({ code: error instanceof CatalogPricingError ? error.code : 'CATALOG_UNAVAILABLE' });
  };
  router.get(['/api/catalog', '/api/catalog/snapshot'], async (req, res) => {
    try {
      const snapshot = await options.catalog.getSnapshot();
      const envelope = req.path === '/api/catalog/snapshot';
      const compact = envelope && req.query.format === 'pricing-v1';
      if (req.query.format !== undefined && (!compact || typeof req.query.format !== 'string')) throw new CatalogPricingError('INVALID_CATALOG_FORMAT');
      const etag = `"${compact ? 'pricing-v1' : envelope ? 'snapshot' : 'array'}-${snapshot.source}-${snapshot.revision}"`;
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.setHeader('ETag', etag); res.setHeader('X-Catalog-Source', snapshot.source);
      if (req.headers['if-none-match'] === etag) return res.status(304).end();
      // Preserve deployed clients' array contract; new consumers request the complete product/box view.
      return res.json(compact ? compactCatalog(snapshot) : envelope ? snapshot : snapshot.catalog);
    } catch (error) { return fail(error, res); }
  });
  router.get('/api/admin/catalog-prices/:kind/:id', options.requireAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try { return res.json({ record: await readCatalogPrice(options.getDb(), req.params.kind, req.params.id) }); }
    catch (error) { return fail(error, res); }
  });
  router.get('/api/admin/catalog-prices/:kind/:id/history', options.requireAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try {
      const target = canonicalPriceTarget(req.params.kind, req.params.id);
      const db = options.getDb();
      if (!db) throw new CatalogPricingError('CATALOG_UNAVAILABLE', 503);
      const history = await db.collection(PRICE_AUDIT_COLLECTION).doc(`${req.params.kind}_${req.params.id}`).collection('entries').orderBy('updatedAt', 'desc').limit(10).get();
      const parse = (value: unknown) => req.params.kind === 'products' ? validateProductPricing(target as Product, value, true) : validateBoxPricing(value, true);
      const entries = history.docs.flatMap(document => {
        try {
          const entry = document.data();
          if (!Number.isSafeInteger(entry.revision) || typeof entry.updatedAt !== 'string' || !Number.isFinite(Date.parse(entry.updatedAt)) || typeof entry.reason !== 'string') return [];
          return [{ revision: entry.revision, updatedAt: entry.updatedAt, reason: entry.reason.slice(0, 300),
            previousPricing: entry.previousPricing ? parse(entry.previousPricing) : null, pricing: parse(entry.pricing) }];
        } catch { return []; }
      });
      return res.json({ entries });
    } catch (error) { return fail(error, res); }
  });
  router.post('/api/admin/catalog-prices/:kind/:id', options.requireAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try {
      const actor = (req as typeof req & { user?: { uid?: string } }).user;
      return res.json({ record: await updateCatalogPrice({ db: options.getDb(), kind: req.params.kind, id: req.params.id, body: req.body, actorUid: actor?.uid || '' }) });
    } catch (error) { return fail(error, res); }
  });
  return router;
}
