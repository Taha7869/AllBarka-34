import { apiUrl } from './apiUrl';
import { withApiDeadline } from './apiDeadline';

/** Account reads share the API's ownership checks; no privileged browser writes. */
export async function loadLoyaltyAccount(getToken: () => Promise<string>, signal?: AbortSignal) {
  return withApiDeadline(async requestSignal => {
    const token = await getToken();
    if (!token || requestSignal.aborted) throw new Error('LOYALTY_UNAVAILABLE');
    const get = async (path: string) => {
      const response = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        credentials: 'omit', cache: 'no-store', signal: requestSignal });
      if (!response.ok) throw new Error('LOYALTY_UNAVAILABLE');
      return response.json();
    };
    const [profile, rewards] = await Promise.all([get('/api/loyalty/profile'), get('/api/loyalty/rewards')]);
    if (!profile || !Number.isSafeInteger(profile.loyaltyPoints) || profile.loyaltyPoints < 0
      || !Array.isArray(profile.transactions) || !Array.isArray(profile.activeRewards) || !Array.isArray(rewards)) {
      throw new Error('LOYALTY_UNAVAILABLE');
    }
    return { profile, rewards };
  }, 12000, signal);
}

export class LoyaltyRequestError extends Error {
  constructor(public code: string) { super(code); this.name = 'LoyaltyRequestError'; }
}
export async function redeemLoyaltyVoucher(getToken: () => Promise<string>, rewardId: string, requestId: string, signal?: AbortSignal) {
  return withApiDeadline(async requestSignal => {
    const token = await getToken(); if (!token || requestSignal.aborted) throw new LoyaltyRequestError('LOYALTY_UNAVAILABLE');
    const response = await fetch(apiUrl('/api/loyalty/redeem'), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ rewardId, requestId }), signal: requestSignal, credentials: 'omit', cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || data?.success !== true) throw new LoyaltyRequestError(typeof data?.code === 'string' ? data.code : 'LOYALTY_UNAVAILABLE');
    return data as { success: true; activeRewardId: string; loyaltyPoints: number; duplicate: boolean };
  }, 15000, signal);
}
