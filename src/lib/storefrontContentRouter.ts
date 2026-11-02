import { Router, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_STOREFRONT_CONTENT,
  validateStorefrontContent,
  publicStorefrontContent,
  ContentError,
} from './storefrontContent';

function bundle(raw: any) {
  if (!raw) {
    return {
      version: 1,
      revision: 0,
      liveRevision: 0,
      draft: structuredClone(DEFAULT_STOREFRONT_CONTENT),
      live: structuredClone(DEFAULT_STOREFRONT_CONTENT),
    };
  }
  if (
    raw.version !== 1 ||
    !Number.isSafeInteger(raw.revision) ||
    raw.revision < 0 ||
    !Number.isSafeInteger(raw.liveRevision) ||
    raw.liveRevision < 0 ||
    raw.liveRevision > raw.revision
  ) {
    throw new ContentError('CONTENT_STORE_INVALID', 503);
  }
  return {
    version: 1,
    revision: raw.revision,
    liveRevision: raw.liveRevision,
    draft: validateStorefrontContent(raw.draft),
    live: validateStorefrontContent(raw.live, true),
  };
}

export async function readStorefrontContent(db: Firestore | null) {
  if (!db) throw new ContentError('CONTENT_STORE_UNAVAILABLE', 503);
  const snapshot = await db.collection('storefrontContent').doc('main').get();
  return bundle(snapshot.exists ? snapshot.data() : null);
}

export function createStorefrontContentRouter(options: {
  getDb: () => Firestore | null;
  requireAdmin: RequestHandler;
}) {
  const router = Router();
  const error = (failure: unknown, res: import('express').Response) =>
    res
      .status(failure instanceof ContentError ? failure.status : 503)
      .json({
        code:
          failure instanceof ContentError
            ? failure.code
            : 'CONTENT_STORE_UNAVAILABLE',
      });

  // Public endpoint for published live content
  router.get('/api/storefront-content', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const value = await readStorefrontContent(options.getDb());
      return res.json({
        content: publicStorefrontContent(value.live),
        revision: value.liveRevision,
      });
    } catch (e) {
      return error(e, res);
    }
  });

  // Admin endpoint for current draft and live bundle
  router.get('/api/admin/storefront-content', options.requireAdmin, async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      return res.json(await readStorefrontContent(options.getDb()));
    } catch (e) {
      return error(e, res);
    }
  });

  // Admin endpoint for audit history / past revision snapshots
  router.get('/api/admin/storefront-content/history', options.requireAdmin, async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const db = options.getDb();
      if (!db) throw new ContentError('CONTENT_STORE_UNAVAILABLE', 503);
      const snap = await db.collection('storefrontContentAudits').orderBy('revision', 'desc').limit(20).get();
      const history = snap.docs.map(doc => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          action: data.action,
          revision: data.revision,
          updatedAt: data.updatedAt,
          actorUid: data.actorUid,
          content: data.updated,
        };
      });
      return res.json({ history });
    } catch (e) {
      return error(e, res);
    }
  });

  // Mutations: draft, publish, restore
  for (const action of ['draft', 'publish', 'restore'] as const) {
    router.post(`/api/admin/storefront-content/${action}`, options.requireAdmin, async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      try {
        const db = options.getDb();
        if (!db) throw new ContentError('CONTENT_STORE_UNAVAILABLE', 503);
        const actor = (req as any).user?.uid;
        if (typeof actor !== 'string' || !actor) throw new ContentError('FORBIDDEN_ADMIN', 403);

        if (!Number.isSafeInteger(req.body?.expectedRevision) || req.body.expectedRevision < 0) {
          throw new ContentError('CONTENT_REVISION_CONFLICT', 409);
        }

        const requested = action === 'draft' ? validateStorefrontContent(req.body.content) : null;

        const result = await db.runTransaction(async transaction => {
          const reference = db.collection('storefrontContent').doc('main');
          const snapshot = await transaction.get(reference);
          const current = bundle(snapshot.exists ? snapshot.data() : null);

          if (current.revision !== req.body.expectedRevision || current.revision >= Number.MAX_SAFE_INTEGER) {
            throw new ContentError('CONTENT_REVISION_CONFLICT', 409);
          }

          let next: any;
          if (action === 'publish') {
            next = validateStorefrontContent(current.draft, true);
          } else if (action === 'restore') {
            if (req.body?.auditId) {
              const auditRef = db.collection('storefrontContentAudits').doc(String(req.body.auditId));
              const auditSnap = await transaction.get(auditRef);
              if (!auditSnap.exists) throw new ContentError('CONTENT_AUDIT_NOT_FOUND', 404);
              next = validateStorefrontContent(auditSnap.data()?.updated);
            } else if (req.body?.target === 'live' || !req.body?.content) {
              next = validateStorefrontContent(current.live);
            } else {
              next = validateStorefrontContent(req.body.content);
            }
          } else {
            next = requested!;
          }

          if (action === 'draft') {
            for (const entry of current.draft.articles) {
              if (!next.articles.some((article: any) => article.slug === entry.slug)) {
                throw new ContentError('ARCHIVE_ARTICLE_INSTEAD');
              }
            }
          }

          const revision = current.revision + 1;
          const updated = {
            version: 1,
            revision,
            liveRevision: action === 'publish' ? revision : current.liveRevision,
            draft: next,
            live: action === 'publish' ? next : current.live,
          };

          const updatedAt = new Date().toISOString();
          transaction.set(reference, { ...updated, updatedAt, updatedBy: actor });
          transaction.set(db.collection('storefrontContentAudits').doc(randomUUID()), {
            action:
              action === 'publish'
                ? 'CONTENT_PUBLISHED'
                : action === 'restore'
                ? 'CONTENT_DRAFT_RESTORED'
                : 'CONTENT_DRAFT_SAVED',
            actorUid: actor,
            revision,
            updatedAt,
            previous: action === 'publish' ? current.live : current.draft,
            updated: next,
          });
          return updated;
        });

        return res.json(result);
      } catch (e) {
        return error(e, res);
      }
    });
  }

  return router;
}
