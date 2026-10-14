import { Router, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { REWARDS } from '../data/rewards';
import { publicRewards } from './rewardAvailability';
import { sanitizeFirestoreData } from './firestoreData';
import { redeemPatronReward } from './rewardRedemption';
import { ValidationError } from './validationError';
import { SUPPORTED_REWARD_IDS, rewardDefinition } from './rewardFulfillment';
import rateLimit from 'express-rate-limit';

export function createLoyaltyRouter(options: { getDb: () => Firestore | null; requireAuth: RequestHandler }) {
  const router = Router();
  router.get('/api/loyalty/profile', options.requireAuth, async (request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    try {
      const uid = (request as typeof request & { user: { uid: string } }).user.uid;
      const db = options.getDb();
      if (!db) return response.status(503).json({ code: 'DB_UNAVAILABLE' });
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      const loyaltyPoints = userDoc.exists ? userDoc.data()?.loyaltyPoints ?? 0 : 0;
      if (!Number.isSafeInteger(loyaltyPoints) || loyaltyPoints < 0) throw new Error('Invalid points');
      const [txSnap, ...rewardSnaps] = await Promise.all([
        userRef.collection('loyaltyTransactions').orderBy('createdAt', 'desc').limit(10).get(),
        ...SUPPORTED_REWARD_IDS.map(rewardId => userRef.collection('activeRewards').where('rewardId', '==', rewardId)
          .where('status', '==', 'ACTIVE').where('expiresAt', '>', Date.now()).orderBy('expiresAt', 'asc').limit(5).get()),
      ]);
      const transactions = txSnap.docs.map(document => {
        const tx = document.data();
        return { transactionId: document.id, type: tx.type, points: tx.points, rewardId: tx.rewardId ?? null,
          description: tx.description, createdAt: tx.createdAt };
      });
      const documents = [...new Map(rewardSnaps.flatMap(snapshot => snapshot.docs).map(document => [document.id, document])).values()];
      const activeRewards = documents.flatMap(document => {
        const reward = document.data();
        let definition; try { definition = rewardDefinition(reward.rewardId); } catch { return []; }
        if (reward.rewardType && reward.rewardType !== definition.rewardType) return [];
        if (!Number.isSafeInteger(reward.expiresAt) || !Number.isFinite(new Date(reward.expiresAt).getTime()) || reward.expiresAt <= Date.now()) return [];
        return [{ id: document.id, rewardId: reward.rewardId, rewardType: definition.rewardType,
          claimedAt: reward.claimedAt, expiresAt: reward.expiresAt, status: reward.status }];
      });
      return response.json(sanitizeFirestoreData({ loyaltyPoints, transactions, activeRewards, redemptionAvailable: true }));
    } catch {
      return response.status(503).json({ code: 'LOYALTY_UNAVAILABLE' });
    }
  });
  router.get('/api/loyalty/rewards', (_request, response) => response.json(publicRewards(REWARDS)));

  const redeemLimiter = rateLimit({ windowMs: 60000, max: 15, standardHeaders: true, legacyHeaders: false, message: { code: 'LOYALTY_RATE_LIMIT' } });
  router.post('/api/loyalty/redeem', options.requireAuth, redeemLimiter, async (request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    const rewardId = request.body?.rewardId;
    if (!rewardId) return response.status(400).json({ code: 'MISSING_REWARD' });
    if (typeof rewardId !== 'string' || !REWARDS.some(reward => reward.rewardId === rewardId && reward.active)) {
      return response.status(400).json({ code: 'INVALID_REWARD' });
    }
    if (!request.body || Object.keys(request.body).some(key => !['rewardId', 'requestId'].includes(key))
      || typeof request.body.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(request.body.requestId)) {
      return response.status(400).json({ code: 'INVALID_REDEMPTION_KEY' });
    }
    try {
      const uid = (request as typeof request & { user: { uid: string } }).user.uid;
      return response.json(await redeemPatronReward({ db: options.getDb(), uid, body: request.body }));
    } catch (error) {
      const code = error instanceof ValidationError ? error.code : 'LOYALTY_UNAVAILABLE';
      return response.status(['DB_UNAVAILABLE', 'LOYALTY_UNAVAILABLE'].includes(code) ? 503 : code === 'REDEMPTION_CONFLICT' ? 409 : 400).json({ code });
    }
  });
  return router;
}
