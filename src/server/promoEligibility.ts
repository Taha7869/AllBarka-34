import type { Firestore } from 'firebase-admin/firestore';
import { getPromo, type PromoContext } from '../lib/couponEngine';
import { ValidationError } from '../lib/validationError';

/** Account history is read from Firestore, never from browser assertions. */
export async function firstOrderPromoContext(db: Firestore | null, uid: string | null, code: unknown,
  read?: (reference: any) => Promise<any>, knownOrderCount = 0): Promise<PromoContext> {
  if (!getPromo(code)?.firstOrderOnly) return { identityVerified: Boolean(uid) };
  if (!uid) throw new ValidationError('Please sign in to use this first-order promo code.', 'PROMO_REQUIRES_AUTH');
  if (!db) throw Object.assign(new Error('First-order eligibility is unavailable until the order database is configured.'), { code: 'PERSISTENCE_UNAVAILABLE' });
  if (knownOrderCount > 0) return { identityVerified: true, hasPastOrders: true };
  const query = db.collection('orders').where('uid', '==', uid).limit(1);
  const snapshot = read ? await read(query) : await query.get();
  return { identityVerified: true, hasPastOrders: !snapshot.empty };
}
