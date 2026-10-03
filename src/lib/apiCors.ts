import type { RequestHandler } from 'express';

/** Explicit storefront origins only; cross-host authentication uses verified ID tokens. */
export function commerceCors(configuredOrigins: string): RequestHandler {
  const origins = new Set(configuredOrigins.split(',').map(value => value.trim()).filter(Boolean).map(value => {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('FRONTEND_ORIGINS must contain HTTPS origins without paths');
    }
    return url.origin;
  }));
  return (req, res, next) => {
    const origin = req.headers.origin;
    res.vary('Origin');
    if (origin && origins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Idempotency-Key, X-Guest-Claim-Token');
      res.setHeader('Access-Control-Max-Age', '600');
      if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    } else if (req.method === 'OPTIONS') {
      res.status(403).json({ success: false, code: 'ORIGIN_NOT_ALLOWED', error: 'Storefront origin is not configured.' });
      return;
    }
    next();
  };
}
