import type { Firestore } from 'firebase-admin/firestore';
import { firstOrderPromoContext } from '../server/promoEligibility';
import { loadAuthoritativeCatalog } from './catalogStore';
import { validateAndPriceOrder, ValidationError } from './orderValidation';
import { applyPatronReward, validateRewardInstanceId } from './rewardPolicy';
import { validateBulkRecipient, calculateBulkTotals, MAX_BULK_RECIPIENTS, type BulkRecipient } from './bulkGifting';

/** The HTTP quote and final order transaction share canonical pricing and reward policy. */
export async function quoteOrderForCustomer(db: Firestore | null, payload: any, user?: { uid?: string; wholesaleEligible?: boolean }) {
  const { items, city, shippingMethodId, discountCode, rewardId, giftWrapping, isWholesale, isMultiRecipient, recipients } = payload || {};
  const promoContext = await firstOrderPromoContext(db, user?.uid || null, discountCode);
  const catalog = await loadAuthoritativeCatalog(db, { fresh: true });
  const validated = validateAndPriceOrder({ items, city: city || 'Lahore', shippingMethodId, discountCode,
    giftWrapping: Boolean(giftWrapping), isWholesale: Boolean(isWholesale && user?.wholesaleEligible), promoContext,
    products: catalog.products, hamperBoxes: catalog.hamperBoxes, allowInquiryItems: true });
  if (rewardId) {
    if (!user?.uid) throw new ValidationError('Please sign in to use a patron reward.', 'REWARD_REQUIRES_AUTH');
    const snapshot = await db!.collection('users').doc(user.uid).collection('activeRewards').doc(validateRewardInstanceId(rewardId)).get();
    if (!snapshot.exists) throw new ValidationError('Selected reward does not exist for this patron.', 'REWARD_NOT_FOUND');
    validated.summary = applyPatronReward({ reward: snapshot.data() as any, summary: validated.summary, city: city || 'Lahore', shippingMethodId }).summary;
  }

  if (isMultiRecipient) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new ValidationError('Multi-address order must contain at least 1 recipient.', 'RECIPIENTS_REQUIRED');
    }
    if (recipients.length > MAX_BULK_RECIPIENTS) {
      throw new ValidationError(`Maximum ${MAX_BULK_RECIPIENTS} recipients allowed per order.`, 'MAX_RECIPIENTS_EXCEEDED');
    }
    const validatedRecipients: BulkRecipient[] = recipients.map((r, i) => validateBulkRecipient(r, i));
    const { totals: bulkTotals, shipments } = calculateBulkTotals({
      singleSummary: validated.summary,
      recipients: validatedRecipients,
      shippingMethodId,
      giftWrapping: Boolean(giftWrapping),
    });

    return {
      success: true,
      totals: bulkTotals,
      items: validated.items,
      shipments,
      isMultiRecipient: true,
      recipientCount: validatedRecipients.length,
      earnedPoints: (validated.earnedPoints || 0) * validatedRecipients.length,
      catalogVersion: catalog.version,
      generatedAt: Date.now(),
    };
  }

  return { success: true, totals: validated.summary, items: validated.items, earnedPoints: validated.earnedPoints,
    catalogVersion: catalog.version, generatedAt: Date.now() };
}
