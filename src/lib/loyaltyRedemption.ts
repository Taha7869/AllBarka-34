import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { sanitizeFirestoreData } from './firestoreData';
import { supportedPatronReward, type IssuedPatronReward } from './rewardPolicy';
import { ValidationError } from './validationError';

/** Issuance is authenticated by the route and all points/reward writes are atomic. */
export async function redeemPatronReward({ db, uid, rewardId, requestId }: {
  db: Firestore | null; uid: string; rewardId: unknown; requestId: unknown;
}): Promise<{ success: true; activeReward: IssuedPatronReward; loyaltyPoints: number; duplicate: boolean }> {
  if (!db) throw new ValidationError('Loyalty redemption is temporarily unavailable. No points have been deducted.', 'PERSISTENCE_UNAVAILABLE');
  const reward = supportedPatronReward(rewardId);
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(requestId)) {
    throw new ValidationError('A valid redemption request identifier is required.', 'INVALID_REDEMPTION_REQUEST');
  }
  const userRef = db.collection('users').doc(uid);
  const requestRef = userRef.collection('rewardRedemptions').doc(requestId);
  const activeId = crypto.randomUUID();
  const now = Date.now();
  return db.runTransaction(async transaction => {
    const previous = await transaction.get(requestRef);
    if (previous.exists) {
      const saved = previous.data()!;
      if (saved.rewardId !== reward.rewardId) throw new ValidationError('This redemption request was already used for another reward.', 'REDEMPTION_CONFLICT');
      return { success: true as const, activeReward: saved.activeReward, loyaltyPoints: saved.loyaltyPoints, duplicate: true };
    }
    const user = await transaction.get(userRef);
    const currentPoints = user.data()?.loyaltyPoints ?? 0;
    if (!Number.isSafeInteger(currentPoints) || currentPoints < reward.pointsCost) {
      throw new ValidationError('You do not have enough points for this reward.', 'INSUFFICIENT_POINTS');
    }
    const active = await transaction.get(userRef.collection('activeRewards').where('status', '==', 'ACTIVE').limit(100));
    if (active.docs.some(doc => !Number.isFinite(doc.data().expiresAt) || doc.data().expiresAt > now)) {
      throw new ValidationError('Please use your active reward before redeeming another.', 'ACTIVE_REWARD_EXISTS');
    }
    // Expired benefits cannot block future redemption. No new deduction occurs unless
    // the complete new issuance and its audit record commit successfully.
    for (const doc of active.docs) transaction.update(doc.ref, { status: 'EXPIRED', expiredAt: now });
    const loyaltyPoints = currentPoints - reward.pointsCost;
    const activeReward: IssuedPatronReward = { id: activeId, rewardId: reward.rewardId, claimedAt: now,
      expiresAt: now + reward.expiryDays * 86400000, status: 'ACTIVE', rewardType: reward.rewardType };
    transaction.set(userRef, { loyaltyPoints }, { merge: true });
    transaction.set(userRef.collection('activeRewards').doc(activeId), sanitizeFirestoreData(activeReward));
    transaction.set(userRef.collection('loyaltyTransactions').doc(`REDEEM_${requestId}`), sanitizeFirestoreData({
      transactionId: `REDEEM_${requestId}`, type: 'REDEEM', points: -reward.pointsCost, rewardId: reward.rewardId,
      description: `Redeemed ${reward.name}`, createdAt: now,
    }));
    transaction.set(requestRef, sanitizeFirestoreData({ rewardId: reward.rewardId, activeReward, loyaltyPoints, createdAt: now }));
    return { success: true as const, activeReward, loyaltyPoints, duplicate: false };
  });
}
