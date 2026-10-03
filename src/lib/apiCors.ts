import type { RequestHandler } from 'express';

/** Exact public frontend origins; authentication remains enforced by each API route. */
export function commerceCors(configuredOrigins = ''): RequestHandler {
  const allowed = new Set(configuredOrigins.split(',').map(entry => entry.trim()).filter(Boolean).map(entry => {
    if (!/^https:\/\/[^/?#\\\s]+\/?$/i.test(entry)) throw new Error('FRONTEND_ORIGINS must contain HTTPS origins only');
    const url = new URL(entry);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('FRONTEND_ORIGINS must contain HTTPS origins only');
    }
    return url.origin;
  }));
  return (req, res, next) => {
    const origin = req.get('Origin');
    res.vary('Origin');
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Idempotency-Key, X-Guest-Claim-Token');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      res.status(origin && allowed.has(origin) ? 204 : 403).end();
      return;
    }
    next();
  };
}
