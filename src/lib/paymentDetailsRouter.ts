import { Router } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { sanitizePaymentDetails, type PublicPaymentDetails } from './paymentDetails';

// Spark plan read quota: cache content/paymentDetails server-side for 5 minutes.
export const PAYMENT_DETAILS_CACHE_MS = 5 * 60_000;

let paymentDetailsCache: {
  db: Firestore;
  at: number;
  value: PublicPaymentDetails | null;
} | null = null;

export function resetPaymentDetailsCache(): void {
  paymentDetailsCache = null;
}

export async function readPaymentDetails(
  db: Firestore | null,
): Promise<{ available: boolean; details: PublicPaymentDetails | null; failed?: boolean }> {
  if (!db) {
    return { available: false, details: null, failed: true };
  }
  if (
    paymentDetailsCache &&
    paymentDetailsCache.db === db &&
    Date.now() - paymentDetailsCache.at < PAYMENT_DETAILS_CACHE_MS
  ) {
    return {
      available: paymentDetailsCache.value !== null,
      details: paymentDetailsCache.value,
    };
  }
  try {
    const snap = await db.collection('content').doc('paymentDetails').get();
    const raw = snap.exists && typeof snap.data === 'function' ? snap.data() : null;
    const details = sanitizePaymentDetails(raw);
    paymentDetailsCache = { db, at: Date.now(), value: details };
    return { available: details !== null, details };
  } catch {
    if (paymentDetailsCache && paymentDetailsCache.db === db) {
      return {
        available: paymentDetailsCache.value !== null,
        details: paymentDetailsCache.value,
      };
    }
    return { available: false, details: null, failed: true };
  }
}

export function createPaymentDetailsRouter(options: { getDb: () => Firestore | null }) {
  const router = Router();

  router.get('/api/payment-details', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await readPaymentDetails(options.getDb());
    if (result.failed) {
      return res.status(503).json({
        available: false,
        details: null,
        code: 'PAYMENT_DETAILS_UNAVAILABLE',
      });
    }
    return res.json({
      available: result.available,
      details: result.details,
    });
  });

  return router;
}
