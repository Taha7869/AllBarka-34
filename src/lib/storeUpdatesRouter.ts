import { Router, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { listStoreUpdates, markUpdatesRead, publishStoreUpdate, readUpdateFeed, saveUpdatePreference, StoreUpdateError } from './storeUpdates';

export function createStoreUpdatesRouter(options: { getDb: () => any; requireAuth: RequestHandler; requireAdmin: RequestHandler }) {
  const router = Router();
  const writes = rateLimit({ windowMs: 60000, max: 30, standardHeaders: true, legacyHeaders: false, message: { code: 'UPDATE_RATE_LIMIT' } });
  const run = (handler: (req: any) => Promise<any>): RequestHandler => async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try { res.json(await handler(req)); }
    catch (error) { const known = error instanceof StoreUpdateError; res.status(known ? error.status : 503).json({ code: known ? error.code : 'PERSISTENCE_UNAVAILABLE' }); }
  };
  router.get('/api/updates', options.requireAuth, run(req => readUpdateFeed(options.getDb(), req.user.uid)));
  router.post('/api/updates/preferences', options.requireAuth, writes, run(req => saveUpdatePreference(options.getDb(), req.user.uid, req.body?.enabled)));
  router.post('/api/updates/read', options.requireAuth, writes, run(req => markUpdatesRead(options.getDb(), req.user.uid, req.body?.through)));
  router.get('/api/admin/updates', options.requireAdmin, run(async () => ({ items: await listStoreUpdates(options.getDb()) })));
  router.post('/api/admin/updates', options.requireAdmin, writes, run(req => publishStoreUpdate(options.getDb(), req.body, req.user)));
  return router;
}
