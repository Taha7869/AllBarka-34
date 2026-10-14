import { createHash, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { rewardDefinition, sanitizeRewardApplication, type RewardApplication } from './rewardFulfillment';
import { ValidationError } from './validationError';
import { transactionalCatalog } from './liveCatalog';
import { INVENTORY_COLLECTION, inventoryFromStored } from './inventory';

/** One active voucher per reward kind; retries (including another browser) never debit points twice. */
export async function redeemPatronReward(input: { db: Firestore | null; uid: string; body: unknown; now?: number }) {
  const body = input.body as Record<string, unknown>;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['rewardId', 'requestId'].includes(key))) throw new ValidationError('Invalid redemption.', 'INVALID_REWARD');
  const definition = rewardDefinition(body.rewardId);
  if (typeof body.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.requestId)) throw new ValidationError('A redemption request key is required.', 'INVALID_REDEMPTION_KEY');
  if (!input.db) throw new ValidationError('Loyalty service unavailable.', 'DB_UNAVAILABLE');
  const db = input.db; const userRef = db.collection('users').doc(input.uid);
  const intentRef = userRef.collection('rewardRedemptions').doc(createHash('sha256').update(body.requestId).digest('hex'));
  const pointerRef = userRef.collection('rewardClaims').doc(definition.rewardId);
  const id = randomUUID(); const voucherRef = userRef.collection('activeRewards').doc(id);
  const now = input.now ?? Date.now();
  return db.runTransaction(async transaction => {
    const [intent, user, pointer] = await Promise.all([transaction.get(intentRef), transaction.get(userRef), transaction.get(pointerRef)]);
    const balance = user.exists ? user.data()?.loyaltyPoints ?? 0 : 0;
    if (!Number.isSafeInteger(balance) || balance < 0) throw new ValidationError('Loyalty balance cannot be verified.', 'LOYALTY_UNAVAILABLE');
    if (intent.exists) {
      if (intent.data()?.rewardId !== definition.rewardId) throw new ValidationError('This request key belongs to another redemption.', 'REDEMPTION_CONFLICT');
      return { success: true, activeRewardId: intent.data()!.activeRewardId, loyaltyPoints: balance, duplicate: true };
    }
    let existingId: string | null = null;
    if (typeof pointer.data()?.activeRewardId === 'string' && /^[A-Za-z0-9_-]{5,100}$/.test(pointer.data()!.activeRewardId)) {
      const existing = await transaction.get(userRef.collection('activeRewards').doc(pointer.data()!.activeRewardId));
      if (existing.data()?.rewardId === definition.rewardId && existing.data()?.status === 'ACTIVE' && Number.isSafeInteger(existing.data()?.expiresAt) && Number.isFinite(new Date(existing.data()?.expiresAt).getTime()) && existing.data()?.expiresAt > now) existingId = existing.id;
    }
    if (!existingId) {
      // Include pre-upgrade issued vouchers before introducing the canonical pointer.
      const legacy = await transaction.get(userRef.collection('activeRewards').where('rewardId', '==', definition.rewardId)
        .where('status', '==', 'ACTIVE').where('expiresAt', '>', now).orderBy('expiresAt', 'asc').limit(1));
      existingId = legacy.docs[0]?.id || null;
    }
    if (existingId) {
      transaction.set(pointerRef, { activeRewardId: existingId });
      transaction.set(intentRef, { rewardId: definition.rewardId, activeRewardId: existingId, claimedAt: now, reused: true });
      return { success: true, activeRewardId: existingId, loyaltyPoints: balance, duplicate: true };
    }
    if (balance < definition.pointsCost) throw new ValidationError('Not enough loyalty points.', 'INSUFFICIENT_POINTS');
    if (definition.rewardType === 'SAMPLE') {
      const sampleId = definition.rewardId === 'cashew_sample' ? 'kaju' : 'pista';
      const catalog = await transactionalCatalog(db, transaction, [{ productId: sampleId }]);
      const stockDoc = await transaction.get(db.collection(INVENTORY_COLLECTION).doc(sampleId));
      const stock = inventoryFromStored(stockDoc.exists ? stockDoc.data() : undefined);
      if (!catalog.catalog.some(product => product.id === sampleId && product.active !== false && !product.quoteOnly)
        || stock.mode === 'tracked' && stock.available < 50) throw new ValidationError('This sample is currently unavailable.', 'REWARD_SAMPLE_UNAVAILABLE');
    }
    const nextBalance = balance - definition.pointsCost;
    transaction.set(userRef, { loyaltyPoints: nextBalance }, { merge: true });
    transaction.set(voucherRef, { rewardId: definition.rewardId, rewardType: definition.rewardType, pointsCost: definition.pointsCost,
      claimedAt: now, expiresAt: now + definition.expiryDays * 86400000, status: 'ACTIVE', schemaVersion: 1 });
    transaction.set(pointerRef, { activeRewardId: id });
    transaction.set(intentRef, { rewardId: definition.rewardId, activeRewardId: id, claimedAt: now });
    transaction.set(userRef.collection('loyaltyTransactions').doc(`REDEEM_${id}`), { type: 'REDEEM', points: -definition.pointsCost,
      rewardId: definition.rewardId, activeRewardId: id, description: 'Patron reward redeemed', createdAt: now });
    return { success: true, activeRewardId: id, loyaltyPoints: nextBalance, duplicate: false };
  });
}

export function rewardCancellationOutcome(application: RewardApplication | undefined, orderStatus: string, now: number) {
  const reward = sanitizeRewardApplication(application);
  if (!reward || reward.status !== 'APPLIED' || orderStatus === 'DELIVERED') return null;
  return { application: { ...reward, status: reward.expiresAt > now ? 'RESTORED' as const : 'REFUNDED' as const },
    voucherStatus: reward.expiresAt > now ? 'ACTIVE' : 'EXPIRED', refundPoints: reward.expiresAt > now ? 0 : reward.pointsCost };
}
