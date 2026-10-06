import crypto from 'node:crypto';
import type { RequestHandler } from 'express';

/** Compare fixed-length hashes so neither a candidate's length nor its prefix changes the comparison. */
export function verifyN8nIntegrationSecret(candidate: unknown, configured: unknown): boolean {
  if (typeof configured !== 'string' || configured.trim().length < 32 || configured.length > 512) return false;
  if (typeof candidate !== 'string' || candidate.length < 1 || candidate.length > 512) return false;
  const digest = (value: string) => crypto.createHash('sha256').update(value, 'utf8').digest();
  return crypto.timingSafeEqual(digest(candidate), digest(configured));
}

export function requireN8nIntegration(getSecret: () => string | undefined = () => process.env.N8N_INTEGRATION_SECRET): RequestHandler {
  return (req, res, next) => {
    const secret = getSecret();
    if (!secret || secret.trim().length < 32 || secret.length > 512) {
      res.status(503).json({ ok: false, error: 'Integration is not configured.', code: 'INTEGRATION_UNAVAILABLE' });
      return;
    }
    if (!verifyN8nIntegrationSecret(req.headers['x-allbarka-integration-secret'], secret)) {
      res.status(401).json({ ok: false, error: 'Integration authentication required.', code: 'INTEGRATION_AUTH_REQUIRED' });
      return;
    }
    next();
  };
}
