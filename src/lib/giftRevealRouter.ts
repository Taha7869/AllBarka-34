import { Router, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { randomBytes, createHash } from 'node:crypto';
import { PRODUCTS } from '../data/products';

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

export function hashRevealToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createGiftRevealRouter(options: {
  getDb: () => Firestore | null;
  requireAuth?: RequestHandler;
  requireAdmin?: RequestHandler;
}) {
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
      const isAdmin =
        user.admin === true ||
        user.role === 'admin' ||
        (user.claims && (user.claims.admin === true || user.claims.role === 'admin'));

      const isOwner =
        (orderData.uid && orderData.uid === user.uid) ||
        (orderData.customerUid && orderData.customerUid === user.uid);

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ code: 'FORBIDDEN', error: 'Unauthorized to create reveal for this order.' });
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
    } catch (e: any) {
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
      const isAdmin =
        user.admin === true ||
        user.role === 'admin' ||
        (user.claims && (user.claims.admin === true || user.claims.role === 'admin'));

      if (!isAdmin && data.creatorUid !== user.uid) {
        return res.status(403).json({ code: 'FORBIDDEN', error: 'Unauthorized to revoke this reveal link.' });
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
    } catch (e: any) {
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
        return res.status(503).json({ code: 'DATABASE_UNAVAILABLE' });
      }

      const rawToken = String(req.params.token || '').trim();
      if (!/^[a-f0-9]{32}$/.test(rawToken)) {
        return res.status(404).json({ code: 'REVEAL_NOT_FOUND' });
      }

      const tokenHash = hashRevealToken(rawToken);
      const doc = await db.collection('giftReveals').doc(tokenHash).get();
      if (!doc.exists) {
        return res.status(404).json({ code: 'REVEAL_NOT_FOUND' });
      }

      const data = doc.data() as StoredGiftRevealRecord;

      // Fail-closed on revoked records
      if (data.revoked === true) {
        return res.status(410).json({ code: 'REVEAL_REVOKED' });
      }

      // Fail-closed on missing, malformed or past expiry
      if (!data.expiresAt || isNaN(Date.parse(data.expiresAt)) || new Date(data.expiresAt).getTime() < Date.now()) {
        return res.status(410).json({ code: 'REVEAL_EXPIRED' });
      }

      // Explicit sanitized recipient DTO (Zero prices, zero address, zero phone, zero internal notes)
      const recipientDto: GiftRevealRecipientDTO = {
        senderName: String(data.senderName || ''),
        recipientName: String(data.recipientName || ''),
        giftMessage: String(data.giftMessage || ''),
        items: Array.isArray(data.items)
          ? data.items.map(i => ({
              productId: String(i.productId || ''),
              name_en: String(i.name_en || ''),
              name_ur: String(i.name_ur || ''),
              name_ar: String(i.name_ar || ''),
              image: String(i.image || ''),
              weight: String(i.weight || ''),
              quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
            }))
          : [],
        expiresAt: data.expiresAt,
      };

      return res.json(recipientDto);
    } catch (e: any) {
      return res.status(500).json({ code: 'REVEAL_LOOKUP_FAILED' });
    }
  });

  return router;
}
