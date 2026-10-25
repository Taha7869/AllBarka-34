import type { Firestore } from 'firebase-admin/firestore';
import { firstOrderPromoContext } from '../server/promoEligibility';
import { loadAuthoritativeCatalog } from './catalogStore';
import { validateAndPriceOrder, ValidationError } from './orderValidation';
import { applyPatronReward, validateRewardInstanceId } from './rewardPolicy';

/** The HTTP quote and final order transaction share canonical pricing and reward policy. */
export async function quoteOrderForCustomer(db: Firestore | null, payload: any, user?: { uid?: string; wholesaleEligible?: boolean }) {
  const { items, city, shippingMethodId, discountCode, rewardId, giftWrapping, isWholesale } = payload || {};
  const promoContext = await firstOrderPromoContext(db, user?.uid || null, discountCode);
  const catalog = await loadAuthoritativeCatalog(db, { fresh: true });
  const validated = validateAndPriceOrder({ items, city, shippingMethodId, discountCode,
    giftWrapping: Boolean(giftWrapping), isWholesale: Boolean(isWholesale && user?.wholesaleEligible), promoContext,
    products: catalog.products, hamperBoxes: catalog.hamperBoxes });
  if (rewardId) {
    if (!user?.uid) throw new ValidationError('Please sign in to use a patron reward.', 'REWARD_REQUIRES_AUTH');
    const snapshot = await db!.collection('users').doc(user.uid).collection('activeRewards').doc(validateRewardInstanceId(rewardId)).get();
    if (!snapshot.exists) throw new ValidationError('Selected reward does not exist for this patron.', 'REWARD_NOT_FOUND');
    validated.summary = applyPatronReward({ reward: snapshot.data() as any, summary: validated.summary, city, shippingMethodId }).summary;
  }
  return { success: true, totals: validated.summary, items: validated.items, earnedPoints: validated.earnedPoints,
    catalogVersion: catalog.version, generatedAt: Date.now() };
}
