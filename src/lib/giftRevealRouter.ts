import { Router, type Request, type Response, type RequestHandler } from 'express';
import { createHash, randomBytes } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { PRODUCTS } from '../data/products';
import { isCurrentAdministrator } from './adminAuthentication';

export interface GiftRevealItem {
  productId: string;
  name_en: string;
  name_ur: string;
  name_ar: string;
  image: string;
  weight: string;
  quantity: number;
}

export interface StoredGiftRevealRecord {
  tokenHash: string;
  orderId: string;
  creatorUid: string;
  senderName: string;
  recipientName: string;
  giftMessage: string;
  items: GiftRevealItem[];
  expiresAt: string;
  createdAt: string;
  revoked: boolean;
  revokedAt?: string | null;
  revokedBy?: string | null;
}

export interface GiftRevealRecipientDTO {
  senderName: string;
  recipientName: string;
  giftMessage: string;
  items: GiftRevealItem[];
  expiresAt: string;
}

export interface GiftRevealRouterOptions {
  getDb: () => Firestore | null;
  getAuth?: () => Pick<Auth, 'getUser'> | null;
  requireAuth?: RequestHandler;
  requireAdmin?: RequestHandler;
}

export function hashRevealToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function verifyAdminAuthorization(
  req: Request,
  res: Response,
  options: GiftRevealRouterOptions,
  user: any
): Promise<boolean> {
  // 1. If requireAdmin middleware is configured, run it with definitive completion tracking.
  // Never treat middleware return as authorization completion, because compositions like
  // requireAuth(req, res, () => { void currentAdministrator(...) }) return before the async lookup finishes.
  if (options.requireAdmin) {
    return new Promise<boolean>((resolve) => {
      let settled = false;

      const finishSuccess = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(true);
      };

      const finishDenied = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(false);
      };

      const onNext = (err?: any) => {
        if (err) {
          if (!settled) {
            settled = true;
            cleanup();
            if (!res.headersSent) {
              res.status(503).json({ code: 'AUTH_SERVICE_UNAVAILABLE', error: 'Authority verification unavailable.' });
            }
            resolve(false);
          }
        } else {
          finishSuccess();
        }
      };

      const originalEnd = res.end;
      const originalJson = res.json;
      const originalSend = res.send;

      function cleanup() {
        res.removeListener('finish', finishDenied);
        res.removeListener('close', finishDenied);
        res.end = originalEnd;
        res.json = originalJson;
        res.send = originalSend;
      }

      res.once('finish', finishDenied);
      res.once('close', finishDenied);

      (res as any).end = function (...args: any[]) {
        cleanup();
        settled = true;
        resolve(false);
        return originalEnd.apply(res, args);
      };
      (res as any).json = function (...args: any[]) {
        cleanup();
        settled = true;
        resolve(false);
        return originalJson.apply(res, args);
      };
      (res as any).send = function (...args: any[]) {
        cleanup();
        settled = true;
        resolve(false);
        return originalSend.apply(res, args);
      };

      try {
        const p = (options.requireAdmin as any)(req, res, onNext);
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            if (!settled) {
              settled = true;
              cleanup();
              if (!res.headersSent) {
                res.status(503).json({ code: 'AUTH_SERVICE_UNAVAILABLE', error: 'Authority verification unavailable.' });
              }
              resolve(false);
            }
          });
        }
      } catch {
        if (!settled) {
          settled = true;
          cleanup();
          if (!res.headersSent) {
            res.status(503).json({ code: 'AUTH_SERVICE_UNAVAILABLE', error: 'Authority verification unavailable.' });
          }
          resolve(false);
        }
      }
    });
  }

  // 2. Direct current-account authority validator lookup when requireAdmin middleware is omitted
  if (options.getAuth) {
    try {
      const isCurrent = await isCurrentAdministrator(options.getAuth(), user);
      if (!isCurrent) {
        if (!res.headersSent) {
          res.status(403).json({ code: 'FORBIDDEN_ADMIN', error: 'Authoritative admin privileges required.' });
        }
        return false;
      }
      return true;
    } catch {
      if (!res.headersSent) {
        res.status(503).json({ code: 'AUTH_SERVICE_UNAVAILABLE', error: 'Authority verification unavailable.' });
      }
      return false;
    }
  }

  // 3. Fail closed if neither administrator middleware nor Auth instance was configured
  if (!res.headersSent) {
    res.status(403).json({ code: 'FORBIDDEN_ADMIN', error: 'Authoritative admin privileges required.' });
  }
  return false;
}

export function createGiftRevealRouter(options: GiftRevealRouterOptions) {
  const router = Router();
  const authMiddleware = options.requireAuth || options.requireAdmin || ((_req, _res, next) => next());

  // 1. Authenticated Creation of Gift Reveal Link from Authoritative Order
  router.post('/api/gift-reveal', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || typeof user.uid !== 'string') {
        return res.status(401).json({ code: 'AUTHENTICATION_REQUIRED', error: 'Authentication credentials required.' });
      }

      const db = options.getDb();
      if (!db) {
        return res.status(503).json({ code: 'DATABASE_UNAVAILABLE', error: 'Database service unavailable.' });
      }

      const { orderId, senderName, recipientName, giftMessage } = req.body || {};
      const trimmedOrderId = String(orderId || '').trim();
      if (!trimmedOrderId) {
        return res.status(400).json({ code: 'INVALID_ORDER_ID', error: 'Valid orderId is required.' });
      }

      const orderDoc = await db.collection('orders').doc(trimmedOrderId).get();
      if (!orderDoc.exists) {
        return res.status(404).json({ code: 'ORDER_NOT_FOUND', error: 'Order not found.' });
      }

      const orderData = orderDoc.data() || {};
      const isOwner = Boolean(
        user.uid &&
        ((orderData.uid && orderData.uid === user.uid) ||
         (orderData.customerUid && orderData.customerUid === user.uid))
      );

      if (!isOwner) {
        const authorized = await verifyAdminAuthorization(req, res, options, user);
        if (!authorized) {
          return;
        }
      }

      const orderItems = Array.isArray(orderData.items) ? orderData.items : [];
      if (orderItems.length === 0) {
        return res.status(400).json({ code: 'ORDER_HAS_NO_ITEMS', error: 'Cannot create gift reveal for order without items.' });
      }

      // Authoritative item presentation: derived from order and canonical products, zero prices/PII
      const sanitizedItems: GiftRevealItem[] = orderItems.map((item: any) => {
        const prodId = String(item.productId || item.id || '').split('-')[0].trim();
        const canonical = PRODUCTS.find(p => p.id === prodId || p.id === item.productId);
        return {
          productId: String(item.productId || canonical?.id || prodId).trim(),
          name_en: String(canonical?.name_en || canonical?.name || item.name || 'Artisan Selection').trim(),
          name_ur: String(canonical?.name_ur || '').trim(),
          name_ar: String(canonical?.name_ar || '').trim(),
          image: String(canonical?.image || '/images/product-placeholder.svg').trim(),
          weight: String(item.selectedWeight || '250g').trim(),
          quantity: Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1))),
        };
      });

      // Bounded and validated greetings
      const boundedSender = String(senderName ?? orderData.customer?.name ?? 'A Thoughtful Friend').trim().slice(0, 80) || 'A Thoughtful Friend';
      const boundedRecipient = String(recipientName ?? orderData.gifting?.recipientName ?? 'Valued Recipient').trim().slice(0, 80) || 'Valued Recipient';
      const boundedMessage = String(giftMessage ?? orderData.gifting?.giftMessage ?? '').trim().slice(0, 500);

      const token = randomBytes(16).toString('hex');
      const tokenHash = hashRevealToken(token);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const record: StoredGiftRevealRecord = {
        tokenHash,
        orderId: trimmedOrderId,
        creatorUid: user.uid,
        senderName: boundedSender,
        recipientName: boundedRecipient,
        giftMessage: boundedMessage,
        items: sanitizedItems,
        expiresAt,
        createdAt: now.toISOString(),
        revoked: false,
        revokedAt: null,
        revokedBy: null,
      };

      // Store using tokenHash as document ID — raw bearer token never stored in plaintext
      await db.collection('giftReveals').doc(tokenHash).set(record);

      return res.status(201).json({
        ok: true,
        token,
        revealUrl: `/reveal/${token}`,
        expiresAt,
      });
    } catch {
      return res.status(500).json({ code: 'REVEAL_CREATION_FAILED', error: 'Internal failure creating gift reveal.' });
    }
  });

  // 2. Authenticated Revocation
  router.post('/api/gift-reveal/:token/revoke', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || typeof user.uid !== 'string') {
        return res.status(401).json({ code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required.' });
      }

      const db = options.getDb();
      if (!db) {
        return res.status(503).json({ code: 'DATABASE_UNAVAILABLE', error: 'Database service unavailable.' });
      }

      const rawToken = String(req.params.token || '').trim();
      if (!/^[a-f0-9]{32}$/.test(rawToken)) {
        return res.status(400).json({ code: 'INVALID_TOKEN', error: 'Malformed token.' });
      }

      const tokenHash = hashRevealToken(rawToken);
      const doc = await db.collection('giftReveals').doc(tokenHash).get();
      if (!doc.exists) {
        return res.status(404).json({ code: 'REVEAL_NOT_FOUND', error: 'Gift reveal record not found.' });
      }

      const data = doc.data() as StoredGiftRevealRecord;
      const isCreator = Boolean(user.uid && data.creatorUid === user.uid);

      if (!isCreator) {
        const authorized = await verifyAdminAuthorization(req, res, options, user);
        if (!authorized) {
          return;
        }
      }

      await db.collection('giftReveals').doc(tokenHash).set(
        {
          revoked: true,
          revokedAt: new Date().toISOString(),
          revokedBy: user.uid,
        },
        { merge: true }
      );

      return res.json({ ok: true, revoked: true });
    } catch {
      return res.status(500).json({ code: 'REVEAL_REVOCATION_FAILED', error: 'Failed to revoke reveal link.' });
    }
  });

  // 3. Public Recipient Reveal Lookup (strictly price-hidden, privacy-shielded, fail-closed)
  router.get('/api/gift-reveal/:token', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      const db = options.getDb();
      if (!db) {
        return res.status(503).json({ code: 'DATABASE_UNAVAILABLE', error: 'Database unavailable.' });
      }

      const rawToken = String(req.params.token || '').trim();
      if (!/^[a-f0-9]{32}$/.test(rawToken)) {
        return res.status(400).json({ code: 'INVALID_TOKEN', error: 'Malformed token.' });
      }

      const tokenHash = hashRevealToken(rawToken);
      const doc = await db.collection('giftReveals').doc(tokenHash).get();
      if (!doc.exists) {
        return res.status(404).json({ code: 'REVEAL_NOT_FOUND', error: 'This gift reveal link was not found or has expired.' });
      }

      const data = doc.data() as StoredGiftRevealRecord;
      if (!data || typeof data !== 'object') {
        return res.status(404).json({ code: 'REVEAL_NOT_FOUND', error: 'This gift reveal link was not found or has expired.' });
      }

      if (data.revoked) {
        return res.status(410).json({ code: 'REVEAL_REVOKED', error: 'This gift unboxing experience has been revoked by the sender.' });
      }

      // Fail-closed validation for missing, invalid, or expired timestamps
      const expiryMs = typeof data.expiresAt === 'string' ? Date.parse(data.expiresAt) : NaN;
      if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) {
        return res.status(410).json({ code: 'REVEAL_EXPIRED', error: 'This gift reveal link has expired.' });
      }

      // Safe, bounded recipient DTO with strictly permitted recipient fields only:
      // Zero prices, zero internal notes, zero customer contact details, zero order IDs, zero creator UIDs
      const rawItems = Array.isArray(data.items) ? data.items : [];
      const sanitizedRecipientItems: GiftRevealItem[] = rawItems.map((raw: any) => ({
        productId: String(raw?.productId || '').trim(),
        name_en: String(raw?.name_en || '').trim(),
        name_ur: String(raw?.name_ur || '').trim(),
        name_ar: String(raw?.name_ar || '').trim(),
        image: String(raw?.image || '/images/product-placeholder.svg').trim(),
        weight: String(raw?.weight || '').trim(),
        quantity: Math.max(1, Math.min(50, Math.floor(Number(raw?.quantity) || 1))),
      }));

      const recipientDTO: GiftRevealRecipientDTO = {
        senderName: String(data.senderName || '').trim(),
        recipientName: String(data.recipientName || '').trim(),
        giftMessage: String(data.giftMessage || '').trim(),
        items: sanitizedRecipientItems,
        expiresAt: data.expiresAt,
      };

      return res.json(recipientDTO);
    } catch {
      return res.status(500).json({ code: 'REVEAL_FETCH_FAILED', error: 'Failed to retrieve gift reveal.' });
    }
  });

  return router;
}
