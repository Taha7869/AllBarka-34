import { Router, type RequestHandler, type Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { CatalogError } from './catalogSchema';
import { getAdminCatalogRecord, loadAuthoritativeCatalog, updateCatalogPricing, getAdminHamperBoxRecord, updateHamperBoxPricing } from './catalogStore';

export function createCatalogRouter(options: { getDb: () => Firestore | null; requireAdmin: RequestHandler }) {
  const router = Router();
  const fail = (error: unknown, response: Response) => response.status(error instanceof CatalogError ? error.httpStatus : 503)
    .json({ code: error instanceof CatalogError ? error.code : 'CATALOG_STORE_UNAVAILABLE' });
  router.get('/api/catalog', async (request, response) => {
    try {
      const snapshot = await loadAuthoritativeCatalog(options.getDb());
      const etag = `"${snapshot.version}"`;
      // Maximum display propagation is 30s polling + 15s server cache. Checkout always reads fresh.
      response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      response.setHeader('ETag', etag);
      if (request.headers['if-none-match'] === etag) return response.status(304).end();
      return response.json({ products: snapshot.products, hamperBoxes: snapshot.hamperBoxes, version: snapshot.version });
    } catch (error) { response.setHeader('Cache-Control', 'no-store'); return fail(error, response); }
  });
  router.get('/api/admin/catalog/:productId', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try { return response.json({ record: await getAdminCatalogRecord(options.getDb(), request.params.productId) }); }
    catch (error) { return fail(error, response); }
  });
  router.post('/api/admin/catalog/:productId', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const user = (request as typeof request & { user?: { uid?: string } }).user;
    try { return response.json({ record: await updateCatalogPricing({ db: options.getDb(), productId: request.params.productId, body: request.body, actorUid: user?.uid || '' }) }); }
    catch (error) { return fail(error, response); }
  });
  router.get('/api/admin/catalog-boxes/:boxId', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try { return response.json({ record: await getAdminHamperBoxRecord(options.getDb(), request.params.boxId) }); }
    catch (error) { return fail(error, response); }
  });
  router.post('/api/admin/catalog-boxes/:boxId', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const user = (request as typeof request & { user?: { uid?: string } }).user;
    try { return response.json({ record: await updateHamperBoxPricing({ db: options.getDb(), boxId: request.params.boxId, body: request.body, actorUid: user?.uid || '' }) }); }
    catch (error) { return fail(error, response); }
  });
  return router;
}
