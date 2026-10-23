import { Router, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { DEFAULT_CATALOG_CONFIGURATION, validateCatalogConfiguration } from './catalogConfiguration';
import { ValidationError } from './validationError';

export async function readCatalogConfiguration(db: Firestore | null) {
  if (!db) throw new ValidationError('CATALOG_STORE_UNAVAILABLE', 'CATALOG_STORE_UNAVAILABLE');
  const snapshot = await db.collection('catalogSettings').doc('main').get();
  return snapshot.exists ? validateCatalogConfiguration(snapshot.data()) : structuredClone(DEFAULT_CATALOG_CONFIGURATION);
}
export function createCatalogConfigurationRouter(options: { getDb: () => Firestore | null; requireAdmin: RequestHandler }) {
  const router = Router();
  const fail = (error: unknown, response: import('express').Response) => {
    const code = error instanceof ValidationError ? error.code : 'CATALOG_STORE_UNAVAILABLE';
    return response.status(code === 'CONFIGURATION_CONFLICT' ? 409 : code === 'CATALOG_STORE_UNAVAILABLE' ? 503 : 400).json({ code });
  };
  router.get('/api/catalog/taxonomy', async (_request, response) => {
    try {
      const configuration = await readCatalogConfiguration(options.getDb());
      response.setHeader('Cache-Control', 'public, max-age=30');
      return response.json({ taxonomy: configuration.taxonomy.filter(entry => entry.visible), revision: configuration.revision });
    } catch (error) { response.setHeader('Cache-Control', 'no-store'); return fail(error, response); }
  });
  router.get('/api/admin/catalog/configuration', options.requireAdmin, async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try { return response.json({ configuration: await readCatalogConfiguration(options.getDb()) }); }
    catch (error) { return fail(error, response); }
  });
  router.put('/api/admin/catalog/configuration', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const db = options.getDb();
      if (!db) throw new ValidationError('CATALOG_STORE_UNAVAILABLE', 'CATALOG_STORE_UNAVAILABLE');
      const requested = validateCatalogConfiguration(request.body?.configuration);
      const expectedRevision = request.body?.expectedRevision;
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision !== requested.revision) throw new ValidationError('CONFIGURATION_CONFLICT', 'CONFIGURATION_CONFLICT');
      const actorUid = (request as typeof request & { user?: { uid?: string } }).user?.uid;
      if (!actorUid) return response.status(403).json({ code: 'FORBIDDEN_ADMIN' });
      const configuration = await db.runTransaction(async transaction => {
        const reference = db.collection('catalogSettings').doc('main');
        const snapshot = await transaction.get(reference);
        const current = snapshot.exists ? validateCatalogConfiguration(snapshot.data()) : DEFAULT_CATALOG_CONFIGURATION;
        if (current.revision !== expectedRevision || current.revision >= Number.MAX_SAFE_INTEGER) throw new ValidationError('CONFIGURATION_CONFLICT', 'CONFIGURATION_CONFLICT');
        // Existing entries are archived/hidden, never silently dropped and orphaned.
        for (const old of current.taxonomy) if (!requested.taxonomy.some(entry => entry.id === old.id && entry.type === old.type)) throw new ValidationError('ARCHIVE_TAXONOMY_INSTEAD', 'ARCHIVE_TAXONOMY_INSTEAD');
        for (const old of current.templates) if (!requested.templates.some(entry => entry.id === old.id)) throw new ValidationError('ARCHIVE_TEMPLATE_INSTEAD', 'ARCHIVE_TEMPLATE_INSTEAD');
        const updated = { ...requested, revision: current.revision + 1 };
        const updatedAt = new Date().toISOString();
        transaction.set(reference, { ...updated, updatedAt, updatedBy: actorUid });
        transaction.set(db.collection('catalogAudits').doc(randomUUID()), { action: 'CATALOG_CONFIGURATION_UPDATED', previous: current, updated, actorUid, updatedAt });
        return updated;
      });
      return response.json({ configuration });
    } catch (error) { return fail(error, response); }
  });
  return router;
}
