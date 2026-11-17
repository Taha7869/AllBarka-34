import { Router, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_ADDONS_CATALOG,
  validateAddonsCatalog,
  type AddonsCatalogDocument,
  type AddonDefinition,
} from './addonsCatalog';
import { ValidationError } from './validationError';
import { sanitizeFirestoreData } from './firestoreData';

export async function loadAuthoritativeAddons(db: Firestore | null): Promise<AddonsCatalogDocument> {
  if (!db) return structuredClone(DEFAULT_ADDONS_CATALOG);
  try {
    const snapshot = await db.collection('catalogSettings').doc('addons').get();
    if (!snapshot.exists) return structuredClone(DEFAULT_ADDONS_CATALOG);
    return validateAddonsCatalog(snapshot.data());
  } catch {
    return structuredClone(DEFAULT_ADDONS_CATALOG);
  }
}

export async function loadAddonsForTransaction(db: Firestore, transaction: any): Promise<AddonDefinition[]> {
  try {
    const ref = db.collection('catalogSettings').doc('addons');
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return structuredClone(DEFAULT_ADDONS_CATALOG.addons);
    return validateAddonsCatalog(snapshot.data()).addons;
  } catch {
    return structuredClone(DEFAULT_ADDONS_CATALOG.addons);
  }
}

export function createAddonsRouter(options: { getDb: () => Firestore | null; requireAdmin: RequestHandler }) {
  const router = Router();

  const fail = (error: unknown, response: import('express').Response) => {
    const code = error instanceof ValidationError ? error.code : 'CATALOG_STORE_UNAVAILABLE';
    const message = error instanceof ValidationError ? error.message : 'Add-ons catalog store is temporarily unavailable.';
    const status = code === 'CONFIGURATION_CONFLICT' ? 409 : code === 'CATALOG_STORE_UNAVAILABLE' ? 503 : 400;
    return response.status(status).json({ ok: false, code, error: message });
  };

  // Public storefront endpoint: returns active & starter add-ons catalog for cart/checkout matching
  router.get('/api/catalog/addons', async (_req, res) => {
    try {
      const doc = await loadAuthoritativeAddons(options.getDb());
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        ok: true,
        revision: doc.revision,
        addons: doc.addons.filter(addon => addon.active && addon.price >= 0),
      });
    } catch (error) {
      res.setHeader('Cache-Control', 'no-store');
      return fail(error, res);
    }
  });

  // Admin endpoint: returns all add-ons (including inactive drafts)
  router.get('/api/admin/catalog/addons', options.requireAdmin, async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const doc = await loadAuthoritativeAddons(options.getDb());
      return res.json({ ok: true, catalog: doc });
    } catch (error) {
      return fail(error, res);
    }
  });

  // Admin endpoint: create, update, or toggle add-ons with optimistic concurrency control
  router.put('/api/admin/catalog/addons', options.requireAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const db = options.getDb();
      if (!db) throw new ValidationError('CATALOG_STORE_UNAVAILABLE', 'CATALOG_STORE_UNAVAILABLE');

      const requested = validateAddonsCatalog(req.body?.catalog ?? req.body);
      const expectedRevision = req.body?.expectedRevision ?? requested.revision;
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        throw new ValidationError('CONFIGURATION_CONFLICT', 'CONFIGURATION_CONFLICT');
      }

      const actorUid = (req as typeof req & { user?: { uid?: string } }).user?.uid;
      if (!actorUid) return res.status(403).json({ ok: false, code: 'FORBIDDEN_ADMIN' });

      const updatedCatalog = await db.runTransaction(async (transaction: any) => {
        const ref = db.collection('catalogSettings').doc('addons');
        const snap = await transaction.get(ref);
        const current = snap.exists ? validateAddonsCatalog(snap.data()) : structuredClone(DEFAULT_ADDONS_CATALOG);

        if (current.revision !== expectedRevision || current.revision >= Number.MAX_SAFE_INTEGER) {
          throw new ValidationError('CONFIGURATION_CONFLICT', 'CONFIGURATION_CONFLICT');
        }

        const updatedAt = new Date().toISOString();
        const nextDoc: AddonsCatalogDocument = {
          revision: current.revision + 1,
          addons: requested.addons,
          updatedAt,
          updatedBy: actorUid,
        };

        transaction.set(ref, sanitizeFirestoreData(nextDoc));
        transaction.set(db.collection('catalogAudits').doc(randomUUID()), sanitizeFirestoreData({
          action: 'ADDONS_CATALOG_UPDATED',
          previousRevision: current.revision,
          revision: nextDoc.revision,
          actorUid,
          updatedAt,
          addonCount: nextDoc.addons.length,
        }));

        return nextDoc;
      });

      return res.json({ ok: true, catalog: updatedCatalog });
    } catch (error) {
      return fail(error, res);
    }
  });

  return router;
}
