import { Router, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';

export interface GiftRevealData {
  token: string;
  senderName: string;
  recipientName: string;
  giftMessage: string;
  items: {
    productId: string;
    name_en: string;
    name_ur: string;
    name_ar: string;
    image: string;
    weight: string;
    quantity: number;
  }[];
  expiresAt: string;
  createdAt: string;
}

export function createGiftRevealRouter(options: { getDb: () => Firestore | null; requireAdmin?: RequestHandler }) {
  const router = Router();

  // Create a gift reveal token (called on order completion or admin desk)
  router.post('/api/gift-reveal', async (req, res) => {
    try {
      const db = options.getDb();
      if (!db) return res.status(503).json({ code: 'DATABASE_UNAVAILABLE' });

      const { senderName, recipientName, giftMessage, items } = req.body || {};
      if (!recipientName || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ code: 'INVALID_REVEAL_PAYLOAD' });
      }

      const token = randomBytes(16).toString('hex');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days expiry

      // Strip all prices, billing, customer emails and payment tokens
      const sanitizedItems = items.map((i: any) => ({
        productId: String(i.productId || i.id || '').trim(),
        name_en: String(i.name_en || i.name || 'Artisan Selection').trim(),
        name_ur: String(i.name_ur || '').trim(),
        name_ar: String(i.name_ar || '').trim(),
        image: String(i.image || '/images/product-placeholder.svg').trim(),
        weight: String(i.weight || i.selectedWeight || '250g').trim(),
        quantity: Math.max(1, Math.min(50, Math.floor(Number(i.quantity) || 1))),
      }));

      const record: GiftRevealData = {
        token,
        senderName: String(senderName || 'A Thoughtful Friend').trim(),
        recipientName: String(recipientName).trim(),
        giftMessage: String(giftMessage || '').trim(),
        items: sanitizedItems,
        expiresAt,
        createdAt: now.toISOString(),
      };

      await db.collection('giftReveals').doc(token).set(record);
      return res.status(201).json({
        ok: true,
        token,
        revealUrl: `/reveal/${token}`,
        expiresAt,
      });
    } catch (e: any) {
      return res.status(500).json({ code: 'REVEAL_CREATION_FAILED' });
    }
  });

  // Public recipient reveal lookup (strictly price-hidden, privacy-shielded)
  router.get('/api/gift-reveal/:token', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      const db = options.getDb();
      if (!db) return res.status(503).json({ code: 'DATABASE_UNAVAILABLE' });

      const token = String(req.params.token || '').trim();
      if (!token || !/^[a-f0-9]{32}$/.test(token)) {
        return res.status(404).json({ code: 'REVEAL_NOT_FOUND' });
      }

      const doc = await db.collection('giftReveals').doc(token).get();
      if (!doc.exists) {
        return res.status(404).json({ code: 'REVEAL_NOT_FOUND' });
      }

      const data = doc.data() as GiftRevealData;
      if (new Date(data.expiresAt).getTime() < Date.now()) {
        return res.status(410).json({ code: 'REVEAL_EXPIRED' });
      }

      // Return public recipient presentation (Zero prices, zero address, zero phone)
      return res.json({
        senderName: data.senderName,
        recipientName: data.recipientName,
        giftMessage: data.giftMessage,
        items: data.items,
        expiresAt: data.expiresAt,
      });
    } catch (e: any) {
      return res.status(500).json({ code: 'REVEAL_LOOKUP_FAILED' });
    }
  });

  return router;
}
