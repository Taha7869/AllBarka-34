import { Router, type RequestHandler, type Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { CatalogError, isProductPubliclyVisible, stripPrivateProductFields } from './catalogSchema';
import {
  getAdminCatalogRecord,
  loadAuthoritativeCatalog,
  updateCatalogPricing,
  getAdminHamperBoxRecord,
  updateHamperBoxPricing,
  getAdminProductRecord,
  listAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  duplicateAdminProduct,
  publishAdminProduct,
  archiveAdminProduct,
  getAdminMerchandising,
  updateAdminMerchandising,
  publishAdminMerchandising,
  getPublicMerchandising
} from './catalogStore';

export function createCatalogRouter(options: { getDb: () => Firestore | null; requireAdmin: RequestHandler }) {
  const router = Router();
  const fail = (error: unknown, response: Response) => response.status(error instanceof CatalogError ? error.httpStatus : 503)
    .json({ code: error instanceof CatalogError ? error.code : 'CATALOG_STORE_UNAVAILABLE' });

  // Public Catalog Endpoint (Stripped of private fields & unpublished products)
  router.get('/api/catalog', async (request, response) => {
    try {
      const snapshot = await loadAuthoritativeCatalog(options.getDb());
      const publicProducts = snapshot.products
        .filter(isProductPubliclyVisible)
        .map(stripPrivateProductFields);
      const etag = `"${snapshot.version}"`;
      response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      response.setHeader('ETag', etag);
      if (request.headers['if-none-match'] === etag) return response.status(304).end();
      return response.json({ products: publicProducts, hamperBoxes: snapshot.hamperBoxes, version: snapshot.version });
    } catch (error) {
      response.setHeader('Cache-Control', 'no-store');
      return fail(error, response);
    }
  });

  // Public Merchandising Settings
  router.get('/api/merchandising', async (_request, response) => {
    try {
      response.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
      const settings = await getPublicMerchandising(options.getDb());
      return response.json({ settings });
    } catch (error) {
      response.setHeader('Cache-Control', 'no-store');
      return fail(error, response);
    }
  });

  // Admin Merchandising Endpoints
  router.get('/api/admin/merchandising', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const preview = request.query.preview !== 'false';
      const settings = await getAdminMerchandising(options.getDb(), preview);
      return response.json({ settings });
    } catch (error) {
      return fail(error, response);
    }
  });

  router.post('/api/admin/merchandising', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const user = (request as typeof request & { user?: { uid?: string } }).user;
    try {
      const settings = await updateAdminMerchandising({ db: options.getDb(), body: request.body, actorUid: user?.uid || '' });
      return response.json({ settings });
    } catch (error) {
      return fail(error, response);
    }
  });

  router.post('/api/admin/merchandising/publish', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const user = (request as typeof request & { user?: { uid?: string } }).user;
    try {
      const settings = await publishAdminMerchandising({ db: options.getDb(), actorUid: user?.uid || '', body: request.body });
      return response.json({ settings });
    } catch (error) {
      return fail(error, response);
    }
  });

  // Admin Catalog: List All Products (including drafts & archived)
  router.get('/api/admin/catalog/products', options.requireAdmin, async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const products = await listAdminProducts(options.getDb());
      return response.json({ products });
    } catch (error) {
      return fail(error, response);
    }
  });

  // Admin Catalog: Get Specific Full Product Record
  router.get('/api/admin/catalog/products/:productId', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const product = await getAdminProductRecord(options.getDb(), request.params.productId);
      return response.json({ product });
    } catch (error) {
      return fail(error, response);
    }
  });

  // Admin Catalog: Create New Product (defaults to draft)
  router.post('/api/admin/catalog/products', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const user = (request as typeof request & { user?: { uid?: string } }).user;
    try {
      const product = await createAdminProduct({ db: options.getDb(), body: request.body, actorUid: user?.uid || '' });
      return response.status(201).json({ product });
    } catch (error) {
      return fail(error, response);
    }
  });

  // Admin Catalog: Update Product (concurrency checked with expectedRevision)
  router.put('/api/admin/catalog/products/:productId', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const user = (request as typeof request & { user?: { uid?: string } }).user;
    try {
      const product = await updateAdminProduct({ db: options.getDb(), productId: request.params.productId, body: request.body, actorUid: user?.uid || '' });
      return response.json({ product });
    } catch (error) {
      return fail(error, response);
    }
  });

  // Admin Catalog: Duplicate Product as Draft
  router.post('/api/admin/catalog/products/:productId/duplicate', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const user = (request as typeof request & { user?: { uid?: string } }).user;
    try {
      const product = await duplicateAdminProduct({ db: options.getDb(), productId: request.params.productId, body: request.body, actorUid: user?.uid || '' });
      return response.status(201).json({ product });
    } catch (error) {
      return fail(error, response);
    }
  });

  // Admin Catalog: Publish Product
  router.post('/api/admin/catalog/products/:productId/publish', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const user = (request as typeof request & { user?: { uid?: string } }).user;
    try {
      const product = await publishAdminProduct({ db: options.getDb(), productId: request.params.productId, body: request.body, actorUid: user?.uid || '' });
      return response.json({ product });
    } catch (error) {
      return fail(error, response);
    }
  });

  // Admin Catalog: Archive Product
  router.post('/api/admin/catalog/products/:productId/archive', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const user = (request as typeof request & { user?: { uid?: string } }).user;
    try {
      const product = await archiveAdminProduct({ db: options.getDb(), productId: request.params.productId, body: request.body, actorUid: user?.uid || '' });
      return response.json({ product });
    } catch (error) {
      return fail(error, response);
    }
  });

  // Legacy Pricing & Hamper Box Endpoints
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
