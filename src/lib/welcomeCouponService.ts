import type { Firestore } from 'firebase-admin/firestore';
import { STORE_COUPONS, CouponRecord } from './couponEngine';

export interface WelcomeVoucherResult {
  eligible: boolean;
  couponCode?: string;
  discountAmount?: number;
  message: string;
  reason?: string;
}

/**
 * Deterministically grants a welcome voucher to an eligible patron.
 * Uses atomic Firestore transaction on userEntitlements/{uid}_welcome.
 */
export async function claimWelcomeVoucher(db: Firestore, uid: string): Promise<WelcomeVoucherResult> {
  if (!db) {
    return {
      eligible: false,
      message: 'Persistence engine unavailable.',
      reason: 'PERSISTENCE_UNAVAILABLE',
    };
  }

  const entitlementRef = db.collection('userEntitlements').doc(`${uid}_welcome`);

  return await db.runTransaction(async (transaction) => {
    const entSnap = await transaction.get(entitlementRef);
    if (entSnap.exists) {
      const data = entSnap.data();
      return {
        eligible: true,
        couponCode: data?.couponCode || 'WELCOME200',
        discountAmount: 200,
        message: 'Welcome voucher is already active on your patron profile.',
      };
    }

    // Check if customer already has prior orders
    const ordersQuery = db.collection('orders').where('uid', '==', uid).limit(1);
    const existingOrders = await transaction.get(ordersQuery);
    if (!existingOrders.empty) {
      return {
        eligible: false,
        message: 'Welcome vouchers are reserved exclusively for first-time patrons.',
        reason: 'PRIOR_ORDERS_EXIST',
      };
    }

    const now = Date.now();
    const welcomeRecord = {
      uid,
      entitlementType: 'WELCOME_VOUCHER',
      couponCode: 'WELCOME200',
      claimedAt: now,
      claimedAtIso: new Date(now).toISOString(),
      status: 'ISSUED',
    };

    transaction.set(entitlementRef, welcomeRecord);

    return {
      eligible: true,
      couponCode: 'WELCOME200',
      discountAmount: 200,
      message: 'Welcome voucher claimed! Enjoy Rs. 200 off your initial boutique order.',
    };
  });
}
