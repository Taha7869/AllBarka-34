import { Router, json, raw, type Request, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';
import { verifyPhoneLast4 } from './orderTrackingService';
import {
  sanitizeAreaLocation,
  sanitizeReviewPhotoUrl,
  type PublishedPatronReview,
} from './publishedReviews';
import {
  MAX_REVIEW_PHOTO_BYTES,
  sanitizeReviewImageBuffer,
  type SanitizedReviewImage,
} from './reviewImageSanitizer';
import {
  readPublishedReviews,
  resetPublishedReviewsCache,
} from './storefrontContentRouter';

const ORDER_ID_RE = /^AB-\d{8}-[0-9A-F]{6}$/;
const PHONE_LAST4_RE = /^\d{4}$/;

export interface StoredReviewRecord {
  id: string;
  orderId: string;
  verifiedOrder: true;
  status: 'draft' | 'published';
  published: boolean;
  source: 'admin' | 'customer_tracking';
  name_en: string;
  name_ur: string;
  name_ar: string;
  location: string;
  purchasedItem: string;
  headline: string;
  review: string;
  rating: number;
  avatarInitials: string;
  photoUrl?: string;
  reply?: string;
  replyAt?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface ReviewAuditEntry {
  id: string;
  reviewId: string;
  orderId: string;
  action: 'customer_submit' | 'create' | 'update' | 'publish' | 'unpublish' | 'reply' | 'delete';
  actorEmail: string;
  actorUid?: string;
  timestamp: string;
  summary?: string;
}

export interface DeliveredOrderSummary {
  orderId: string;
  customerName: string;
  area: string;
  items: string[];
  createdAt: string;
  hasReview: boolean;
}

export interface ReviewsRouterOptions {
  getDb: () => Firestore | null;
  getBucket: () => Bucket | null;
  requireAdmin: RequestHandler;
  submitLimiter?: RequestHandler;
  /** Optional storage override for offline unit tests (receives already-sanitized, EXIF-free image). */
  savePhoto?: (image: SanitizedReviewImage) => Promise<string>;
}

function cleanStr(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function buildInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function parseRating(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

function isDeliveredStatus(status: unknown): boolean {
  return String(status || '').trim().toUpperCase() === 'DELIVERED';
}

function actorFromRequest(req: Request): { email: string; uid?: string } {
  const user = (req as any).adminUser || (req as any).user || {};
  return {
    email: cleanStr(user.email, 160) || 'admin',
    uid: cleanStr(user.uid, 128) || undefined,
  };
}

function extractOrderItems(order: Record<string, any>): string[] {
  if (!Array.isArray(order.items)) return [];
  const names: string[] = [];
  for (const item of order.items) {
    const label = cleanStr(item?.name || item?.name_en || item?.productName || item?.productId, 120);
    if (label && !names.includes(label)) names.push(label);
  }
  return names.slice(0, 12);
}

function extractOrderArea(order: Record<string, any>): string {
  const city = cleanStr(order.customer?.city || order.shippingAddress?.city || order.city, 80);
  const area = sanitizeAreaLocation(order.customer?.area || order.shippingAddress?.area || '', 80);
  if (area && city && !area.toLowerCase().includes(city.toLowerCase())) {
    return `${area}, ${city}`.slice(0, 120);
  }
  return area || city || 'Lahore';
}

function extractOrderTimestamp(order: Record<string, any>): string {
  const raw = order.createdAt || order.createdAtIso || order.timestamp;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return new Date(raw).toISOString();
  if (raw && typeof raw.toDate === 'function') return raw.toDate().toISOString();
  return '';
}

async function uploadSanitizedPhoto(
  image: SanitizedReviewImage,
  options: ReviewsRouterOptions,
): Promise<string> {
  if (options.savePhoto) {
    return options.savePhoto(image);
  }
  const bucket = options.getBucket();
  if (!bucket) {
    throw new Error('MEDIA_STORAGE_UNAVAILABLE');
  }
  const token = randomUUID();
  const key = `review-uploads/${randomUUID()}.${image.extension}`;
  await bucket.file(key).save(image.buffer, {
    resumable: false,
    validation: 'crc32c',
    metadata: {
      contentType: image.mime,
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(key)}?alt=media&token=${token}`;
}

async function writeAuditLog(
  db: Firestore,
  entry: Omit<ReviewAuditEntry, 'id' | 'timestamp'>,
): Promise<ReviewAuditEntry> {
  const audit: ReviewAuditEntry = {
    id: `ra-${randomUUID()}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  await db.collection('reviewAuditLogs').doc(audit.id).set(audit);
  return audit;
}

export function createReviewsRouter(options: ReviewsRouterOptions) {
  const router = Router();
  const passthrough: RequestHandler = (_req, _res, next) => next();
  const submitLimiter = options.submitLimiter || passthrough;

  // 1. Public sanitized reviews endpoint (5-minute cached, zero orderId / zero PII)
  router.get('/api/reviews', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const db = options.getDb();
      const reviews: PublishedPatronReview[] = await readPublishedReviews(db);
      return res.json({ reviews });
    } catch {
      return res.status(503).json({ code: 'REVIEWS_UNAVAILABLE', reviews: [] });
    }
  });

  // 2. Public order-verified review submission from /track (ALWAYS saved as draft, NEVER auto-published)
  router.post(
    '/api/reviews/submit',
    submitLimiter,
    json({ limit: '3mb' }),
    async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const db = options.getDb();
      if (!db) {
        return res.status(503).json({ code: 'REVIEWS_UNAVAILABLE' });
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const orderId = cleanStr(body.orderId, 40).toUpperCase();
      const phoneLast4 = cleanStr(body.phoneLast4, 10);

      if (!ORDER_ID_RE.test(orderId) || !PHONE_LAST4_RE.test(phoneLast4)) {
        return res.status(400).json({ code: 'INVALID_INPUT' });
      }

      const nameEn = cleanStr(body.name ?? body.name_en, 120);
      const area = sanitizeAreaLocation(body.area ?? body.location, 120);
      const purchasedItem = cleanStr(body.item ?? body.purchasedItem, 160);
      const headline = cleanStr(body.headline, 140);
      const reviewText = cleanStr(body.review, 1200);
      const rating = parseRating(body.rating);

      if (nameEn.length < 2 || area.length < 2 || purchasedItem.length < 2 || reviewText.length < 10 || rating === null) {
        return res.status(400).json({ code: 'INVALID_REVIEW_FIELDS' });
      }

      try {
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
          return res.status(404).json({ code: 'ORDER_NOT_FOUND' });
        }
        const order = (orderDoc.data() || {}) as Record<string, any>;
        const phone = String(order.customer?.phone || order.phone || order.shippingAddress?.phone || '');
        const deliveryPhone = String(order.customer?.deliveryPhone || '');
        if (!verifyPhoneLast4(phone, phoneLast4) && !verifyPhoneLast4(deliveryPhone, phoneLast4)) {
          return res.status(404).json({ code: 'ORDER_NOT_FOUND' });
        }
        if (!isDeliveredStatus(order.status)) {
          return res.status(400).json({ code: 'ORDER_NOT_DELIVERED' });
        }

        // Prevent duplicate submissions for the same orderId
        const existingSnap = await db.collection('reviews').where('orderId', '==', orderId).limit(1).get();
        if (Array.isArray(existingSnap?.docs) && existingSnap.docs.length > 0) {
          return res.status(409).json({ code: 'REVIEW_ALREADY_SUBMITTED' });
        }

        let photoUrl: string | undefined;
        if (typeof body.photoBase64 === 'string' && body.photoBase64.trim()) {
          const photoMime = cleanStr(body.photoMime, 40) || 'image/webp';
          const rawBuf = Buffer.from(body.photoBase64.trim(), 'base64');
          let sanitized: SanitizedReviewImage;
          try {
            sanitized = sanitizeReviewImageBuffer(rawBuf, photoMime);
          } catch (err) {
            return res.status(400).json({ code: (err as Error).message });
          }
          try {
            photoUrl = await uploadSanitizedPhoto(sanitized, options);
          } catch {
            return res.status(503).json({ code: 'MEDIA_STORAGE_UNAVAILABLE' });
          }
        }

        const now = new Date().toISOString();
        const id = `rev-${randomUUID()}`;
        const record: StoredReviewRecord = {
          id,
          orderId,
          verifiedOrder: true,
          status: 'draft',
          published: false,
          source: 'customer_tracking',
          name_en: nameEn,
          name_ur: cleanStr(body.name_ur, 120) || nameEn,
          name_ar: cleanStr(body.name_ar, 120) || nameEn,
          location: area,
          purchasedItem,
          headline,
          review: reviewText,
          rating,
          avatarInitials: buildInitials(nameEn),
          ...(photoUrl ? { photoUrl } : {}),
          createdAt: now,
          updatedAt: now,
        };

        await db.collection('reviews').doc(id).set(record);
        await writeAuditLog(db, {
          reviewId: id,
          orderId,
          action: 'customer_submit',
          actorEmail: 'customer-tracking',
          summary: `Draft submitted (${rating}/5) for ${purchasedItem}`,
        });

        return res.status(201).json({ success: true, id, status: 'draft' });
      } catch {
        return res.status(500).json({ code: 'REVIEWS_SUBMIT_FAILED' });
      }
    },
  );

  // 3. Admin: search real delivered orders to link reviews
  router.get('/api/admin/reviews/delivered-orders', options.requireAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = options.getDb();
    if (!db) return res.status(503).json({ code: 'REVIEWS_UNAVAILABLE' });

    const q = cleanStr(req.query.q, 80).toLowerCase();
    try {
      const [ordersSnap, reviewsSnap] = await Promise.all([
        db.collection('orders').limit(250).get(),
        db.collection('reviews').limit(250).get(),
      ]);

      const reviewedOrderIds = new Set<string>();
      for (const doc of Array.isArray(reviewsSnap?.docs) ? reviewsSnap.docs : []) {
        const data = typeof doc.data === 'function' ? doc.data() : {};
        const oid = cleanStr(data?.orderId, 40).toUpperCase();
        if (oid) reviewedOrderIds.add(oid);
      }

      const matched: DeliveredOrderSummary[] = [];
      for (const doc of Array.isArray(ordersSnap?.docs) ? ordersSnap.docs : []) {
        const data = (typeof doc.data === 'function' ? doc.data() : {}) as Record<string, any>;
        if (!isDeliveredStatus(data.status)) continue;
        const orderId = cleanStr(data.orderId || doc.id, 40).toUpperCase();
        if (!orderId) continue;
        const customerName = cleanStr(data.customer?.name || data.customerName, 120) || 'Patron';
        const area = extractOrderArea(data);
        const items = extractOrderItems(data);
        const createdAt = extractOrderTimestamp(data);

        if (q) {
          const haystack = `${orderId} ${customerName} ${area} ${items.join(' ')}`.toLowerCase();
          if (!haystack.includes(q)) continue;
        }
        matched.push({
          orderId,
          customerName,
          area,
          items,
          createdAt,
          hasReview: reviewedOrderIds.has(orderId),
        });
      }

      matched.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return res.json({ orders: matched.slice(0, 50) });
    } catch {
      return res.status(503).json({ code: 'REVIEWS_UNAVAILABLE' });
    }
  });

  // 4. Admin: upload optional review photo (1200px max, EXIF/location stripped server-side)
  router.post(
    '/api/admin/reviews/photo',
    options.requireAdmin,
    raw({ type: ['image/webp', 'image/jpeg', 'image/png'], limit: MAX_REVIEW_PHOTO_BYTES }),
    async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({ code: 'INVALID_REVIEW_IMAGE_TYPE' });
      }
      let sanitized: SanitizedReviewImage;
      try {
        sanitized = sanitizeReviewImageBuffer(req.body, req.get('Content-Type') || '');
      } catch (err) {
        return res.status(400).json({ code: (err as Error).message });
      }
      try {
        const url = await uploadSanitizedPhoto(sanitized, options);
        return res.status(201).json({ url, width: sanitized.width, height: sanitized.height });
      } catch {
        return res.status(503).json({ code: 'MEDIA_STORAGE_UNAVAILABLE' });
      }
    },
  );

  // 5. Admin: list all reviews (draft + published) and recent audit log entries
  router.get('/api/admin/reviews', options.requireAdmin, async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = options.getDb();
    if (!db) return res.status(503).json({ code: 'REVIEWS_UNAVAILABLE' });

    try {
      const [reviewsSnap, auditSnap] = await Promise.all([
        db.collection('reviews').limit(200).get(),
        db.collection('reviewAuditLogs').limit(80).get(),
      ]);

      const reviews = (Array.isArray(reviewsSnap?.docs) ? reviewsSnap.docs : [])
        .map((doc) => ({
          id: doc.id,
          ...(typeof doc.data === 'function' ? doc.data() : {}),
        }))
        .sort((a: any, b: any) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));

      const audits = (Array.isArray(auditSnap?.docs) ? auditSnap.docs : [])
        .map((doc) => ({
          id: doc.id,
          ...(typeof doc.data === 'function' ? doc.data() : {}),
        }))
        .sort((a: any, b: any) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
        .slice(0, 50);

      return res.json({ reviews, audits });
    } catch {
      return res.status(503).json({ code: 'REVIEWS_UNAVAILABLE' });
    }
  });

  // 6. Admin: create a review linked strictly to a real delivered order
  router.post('/api/admin/reviews', options.requireAdmin, json({ limit: '64kb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = options.getDb();
    if (!db) return res.status(503).json({ code: 'REVIEWS_UNAVAILABLE' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const orderId = cleanStr(body.orderId, 40).toUpperCase();
    if (!orderId || orderId.length < 4) {
      return res.status(400).json({ code: 'DELIVERED_ORDER_REQUIRED' });
    }

    const nameEn = cleanStr(body.name_en ?? body.name, 120);
    const location = sanitizeAreaLocation(body.location ?? body.area, 120);
    const purchasedItem = cleanStr(body.purchasedItem ?? body.item, 160);
    const headline = cleanStr(body.headline, 140);
    const reviewText = cleanStr(body.review, 1200);
    const rating = parseRating(body.rating);
    const photoUrl = body.photoUrl ? sanitizeReviewPhotoUrl(body.photoUrl) : undefined;
    const reply = cleanStr(body.reply, 600) || undefined;
    const publishNow = body.published === true;

    if (body.photoUrl && !photoUrl) {
      return res.status(400).json({ code: 'INVALID_PHOTO_URL' });
    }
    if (nameEn.length < 2 || location.length < 2 || purchasedItem.length < 2 || reviewText.length < 5 || rating === null) {
      return res.status(400).json({ code: 'INVALID_REVIEW_FIELDS' });
    }

    try {
      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (!orderDoc.exists || !isDeliveredStatus((orderDoc.data() as any)?.status)) {
        return res.status(400).json({ code: 'DELIVERED_ORDER_REQUIRED' });
      }

      const actor = actorFromRequest(req);
      const now = new Date().toISOString();
      const id = `rev-${randomUUID()}`;
      const record: StoredReviewRecord = {
        id,
        orderId,
        verifiedOrder: true,
        status: publishNow ? 'published' : 'draft',
        published: publishNow,
        source: 'admin',
        name_en: nameEn,
        name_ur: cleanStr(body.name_ur, 120) || nameEn,
        name_ar: cleanStr(body.name_ar, 120) || nameEn,
        location,
        purchasedItem,
        headline,
        review: reviewText,
        rating,
        avatarInitials: buildInitials(nameEn),
        ...(photoUrl ? { photoUrl } : {}),
        ...(reply ? { reply, replyAt: now } : {}),
        ...(publishNow ? { publishedAt: now } : {}),
        createdAt: now,
        updatedAt: now,
        createdBy: actor.email,
        updatedBy: actor.email,
      };

      await db.collection('reviews').doc(id).set(record);
      await writeAuditLog(db, {
        reviewId: id,
        orderId,
        action: publishNow ? 'publish' : 'create',
        actorEmail: actor.email,
        actorUid: actor.uid,
        summary: `${publishNow ? 'Created & published' : 'Created draft'} review (${rating}/5)`,
      });
      resetPublishedReviewsCache();

      return res.status(201).json({ review: record });
    } catch {
      return res.status(500).json({ code: 'REVIEW_SAVE_FAILED' });
    }
  });

  // 7. Admin: edit, publish/unpublish, or reply to a review
  router.patch('/api/admin/reviews/:id', options.requireAdmin, json({ limit: '64kb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = options.getDb();
    if (!db) return res.status(503).json({ code: 'REVIEWS_UNAVAILABLE' });

    const id = cleanStr(req.params.id, 80);
    if (!id || id.includes('/')) return res.status(400).json({ code: 'INVALID_REVIEW_ID' });

    try {
      const ref = db.collection('reviews').doc(id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ code: 'REVIEW_NOT_FOUND' });

      const current = (snap.data() || {}) as Record<string, any>;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const actor = actorFromRequest(req);
      const now = new Date().toISOString();

      const nextNameEn = body.name_en !== undefined || body.name !== undefined
        ? cleanStr(body.name_en ?? body.name, 120)
        : cleanStr(current.name_en, 120);
      const nextLocation = body.location !== undefined || body.area !== undefined
        ? sanitizeAreaLocation(body.location ?? body.area, 120)
        : sanitizeAreaLocation(current.location, 120);
      const nextItem = body.purchasedItem !== undefined || body.item !== undefined
        ? cleanStr(body.purchasedItem ?? body.item, 160)
        : cleanStr(current.purchasedItem, 160);
      const nextHeadline = body.headline !== undefined
        ? cleanStr(body.headline, 140)
        : cleanStr(current.headline, 140);
      const nextReview = body.review !== undefined
        ? cleanStr(body.review, 1200)
        : cleanStr(current.review, 1200);
      const nextRating = body.rating !== undefined ? parseRating(body.rating) : parseRating(current.rating ?? 5);

      if (nextNameEn.length < 2 || nextLocation.length < 2 || nextItem.length < 2 || nextReview.length < 5 || nextRating === null) {
        return res.status(400).json({ code: 'INVALID_REVIEW_FIELDS' });
      }

      let nextPhotoUrl = current.photoUrl as string | undefined;
      if (body.photoUrl === null || body.photoUrl === '') {
        nextPhotoUrl = undefined;
      } else if (body.photoUrl !== undefined) {
        const sanitizedUrl = sanitizeReviewPhotoUrl(body.photoUrl);
        if (!sanitizedUrl) return res.status(400).json({ code: 'INVALID_PHOTO_URL' });
        nextPhotoUrl = sanitizedUrl;
      }

      let nextReply = current.reply as string | undefined;
      let nextReplyAt = current.replyAt as string | undefined;
      let replyChanged = false;
      if (body.reply !== undefined) {
        const cleanedReply = cleanStr(body.reply, 600);
        if (cleanedReply) {
          replyChanged = cleanedReply !== current.reply;
          nextReply = cleanedReply;
          nextReplyAt = replyChanged ? now : (current.replyAt || now);
        } else {
          replyChanged = Boolean(current.reply);
          nextReply = undefined;
          nextReplyAt = undefined;
        }
      }

      const wasPublished = current.published === true || current.status === 'published';
      const nextPublished = body.published !== undefined ? body.published === true : wasPublished;
      const orderId = cleanStr(current.orderId, 40).toUpperCase();

      // Safety invariant: cannot publish a review that is not linked to a real orderId
      if (nextPublished && orderId.length < 4) {
        return res.status(400).json({ code: 'DELIVERED_ORDER_REQUIRED' });
      }

      const updated: StoredReviewRecord = {
        id,
        orderId,
        verifiedOrder: true,
        status: nextPublished ? 'published' : 'draft',
        published: nextPublished,
        source: current.source === 'customer_tracking' ? 'customer_tracking' : 'admin',
        name_en: nextNameEn,
        name_ur: body.name_ur !== undefined ? (cleanStr(body.name_ur, 120) || nextNameEn) : (cleanStr(current.name_ur, 120) || nextNameEn),
        name_ar: body.name_ar !== undefined ? (cleanStr(body.name_ar, 120) || nextNameEn) : (cleanStr(current.name_ar, 120) || nextNameEn),
        location: nextLocation,
        purchasedItem: nextItem,
        headline: nextHeadline,
        review: nextReview,
        rating: nextRating,
        avatarInitials: buildInitials(nextNameEn),
        ...(nextPhotoUrl ? { photoUrl: nextPhotoUrl } : {}),
        ...(nextReply ? { reply: nextReply, replyAt: nextReplyAt } : {}),
        ...(nextPublished ? { publishedAt: current.publishedAt || now } : {}),
        createdAt: cleanStr(current.createdAt, 40) || now,
        updatedAt: now,
        ...(current.createdBy ? { createdBy: String(current.createdBy) } : {}),
        updatedBy: actor.email,
      };

      await ref.set(updated);

      const action: ReviewAuditEntry['action'] =
        nextPublished && !wasPublished
          ? 'publish'
          : !nextPublished && wasPublished
            ? 'unpublish'
            : replyChanged
              ? 'reply'
              : 'update';

      await writeAuditLog(db, {
        reviewId: id,
        orderId,
        action,
        actorEmail: actor.email,
        actorUid: actor.uid,
        summary:
          action === 'publish'
            ? 'Published review to storefront'
            : action === 'unpublish'
              ? 'Unpublished review back to draft'
              : action === 'reply'
                ? (nextReply ? 'Updated AllBarka reply' : 'Cleared AllBarka reply')
                : 'Updated review fields',
      });
      resetPublishedReviewsCache();

      return res.json({ review: updated });
    } catch {
      return res.status(500).json({ code: 'REVIEW_UPDATE_FAILED' });
    }
  });

  // 8. Admin: delete a review with audit log
  router.delete('/api/admin/reviews/:id', options.requireAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = options.getDb();
    if (!db) return res.status(503).json({ code: 'REVIEWS_UNAVAILABLE' });

    const id = cleanStr(req.params.id, 80);
    if (!id || id.includes('/')) return res.status(400).json({ code: 'INVALID_REVIEW_ID' });

    try {
      const ref = db.collection('reviews').doc(id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ code: 'REVIEW_NOT_FOUND' });

      const current = (snap.data() || {}) as Record<string, any>;
      const actor = actorFromRequest(req);
      await ref.delete();
      await writeAuditLog(db, {
        reviewId: id,
        orderId: cleanStr(current.orderId, 40),
        action: 'delete',
        actorEmail: actor.email,
        actorUid: actor.uid,
        summary: `Deleted review by ${cleanStr(current.name_en, 80) || 'patron'}`,
      });
      resetPublishedReviewsCache();

      return res.json({ deleted: true, id });
    } catch {
      return res.status(500).json({ code: 'REVIEW_DELETE_FAILED' });
    }
  });

  router.use((error: any, _req: any, res: any, next: any) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ code: 'INVALID_REVIEW_IMAGE_SIZE' });
    }
    return next(error);
  });

  return router;
}
