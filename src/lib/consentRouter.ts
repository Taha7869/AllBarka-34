import crypto from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { validateConsentLogPayload, type ConsentLogPayload } from './consent';

export interface ConsentLogEntry {
  anonymousId: string;
  categories: {
    necessary: true;
    analytics: boolean;
    marketing: boolean;
  };
  policyVersion: string;
  clientTimestamp: string;
  recordedAt: string;
  gpc: boolean;
}

export interface CreateConsentRouterOptions {
  getDb: () => Firestore | null;
  consentLimiter?: RequestHandler;
  now?: () => number;
}

/**
 * Anonymous consent audit log router.
 * POST /api/consent logs only the random anonymousId, boolean categories, policy version,
 * timestamps, and GPC boolean. Never reads or stores IP, user-agent, cookies, uid, email, or phone.
 */
export function createConsentRouter(options: CreateConsentRouterOptions) {
  const router = Router();
  const limiter: RequestHandler = options.consentLimiter || ((_req, _res, next) => next());
  const now = options.now || (() => Date.now());

  router.post('/api/consent', limiter, async (req, res) => {
    const validated: ConsentLogPayload | null = validateConsentLogPayload(req.body);
    if (!validated) {
      res.set('Cache-Control', 'no-store').status(400).json({ error: 'INVALID_CONSENT_PAYLOAD' });
      return;
    }

    const entry: ConsentLogEntry = {
      anonymousId: validated.anonymousId,
      categories: {
        necessary: true,
        analytics: validated.categories.analytics,
        marketing: validated.categories.marketing,
      },
      policyVersion: validated.policyVersion,
      clientTimestamp: validated.timestamp,
      recordedAt: new Date(now()).toISOString(),
      gpc: validated.gpc,
    };

    const db = options.getDb();
    if (!db) {
      res.set('Cache-Control', 'no-store').status(202).json({
        ok: true,
        recorded: false,
        policyVersion: entry.policyVersion,
      });
      return;
    }

    try {
      const logId = crypto.randomUUID();
      await db.collection('consentLogs').doc(logId).set(entry);
      res.set('Cache-Control', 'no-store').status(201).json({
        ok: true,
        recorded: true,
        policyVersion: entry.policyVersion,
      });
    } catch {
      res.set('Cache-Control', 'no-store').status(503).json({
        error: 'CONSENT_LOG_UNAVAILABLE',
      });
    }
  });

  return router;
}
