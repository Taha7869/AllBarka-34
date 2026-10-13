import { Router, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { REWARDS } from '../data/rewards';
import { publicRewards } from './rewardAvailability';
import { sanitizeFirestoreData } from './firestoreData';

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
      const [txSnap, arSnap] = await Promise.all([
        userRef.collection('loyaltyTransactions').orderBy('createdAt', 'desc').limit(10).get(),
        userRef.collection('activeRewards').where('status', '==', 'ACTIVE').get(),
      ]);
      const transactions = txSnap.docs.map(document => {
        const tx = document.data();
        return { transactionId: document.id, type: tx.type, points: tx.points, rewardId: tx.rewardId ?? null,
          description: tx.description, createdAt: tx.createdAt };
      });
      const activeRewards = arSnap.docs.map(document => {
        const reward = document.data();
        return { id: document.id, rewardId: reward.rewardId, rewardType: reward.rewardType,
          claimedAt: reward.claimedAt, expiresAt: reward.expiresAt, status: reward.status };
      });
      return response.json(sanitizeFirestoreData({ loyaltyPoints, transactions, activeRewards, redemptionAvailable: false }));
    } catch {
      return response.status(503).json({ code: 'LOYALTY_UNAVAILABLE' });
    }
  });
  router.get('/api/loyalty/rewards', (_request, response) => response.json(publicRewards(REWARDS)));

  // Reject before accessing the database, including requests from older clients.
  router.post('/api/loyalty/redeem', options.requireAuth, (request, response) => {
    const rewardId = request.body?.rewardId;
    if (!rewardId) return response.status(400).json({ code: 'MISSING_REWARD' });
    if (typeof rewardId !== 'string' || !REWARDS.some(reward => reward.rewardId === rewardId && reward.active)) {
      return response.status(400).json({ code: 'INVALID_REWARD' });
    }
    return response.status(409).json({ code: 'REWARD_APPLICATION_UNAVAILABLE' });
  });
  return router;
}
