import { apiUrl } from './apiUrl';
import { withApiDeadline } from './apiDeadline';
import type { User } from 'firebase/auth';
import type { IssuedPatronReward } from './rewardPolicy';

export interface LoyaltyProfile {
  loyaltyPoints: number;
  transactions: Array<{ transactionId: string; points: number; description: string; createdAt: number }>;
  activeRewards: IssuedPatronReward[];
}
async function loyaltyRequest(user: Pick<User, 'getIdToken'>, path: string, body?: object, parentSignal?: AbortSignal, request: typeof fetch = fetch): Promise<any> {
  return withApiDeadline(async signal => {
    const token = await user.getIdToken();
    if (signal.aborted || !token) throw new Error('Account verification unavailable');
    const response = await request(apiUrl(path), { method: body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store', signal,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : 'Reward service unavailable');
    return result;
  }, 12000, parentSignal);
}
export async function fetchLoyaltyProfile(user: Pick<User, 'getIdToken'>, signal?: AbortSignal, request?: typeof fetch): Promise<LoyaltyProfile> {
  const data = await loyaltyRequest(user, '/api/loyalty/profile', undefined, signal, request);
  if (!Number.isSafeInteger(data?.loyaltyPoints) || data.loyaltyPoints < 0 || !Array.isArray(data.transactions) || !Array.isArray(data.activeRewards)) throw new Error('Invalid reward profile');
  return data;
}
export async function redeemLoyaltyReward(user: Pick<User, 'getIdToken'>, rewardId: string, requestId: string, request?: typeof fetch): Promise<void> {
  const result = await loyaltyRequest(user, '/api/loyalty/redeem', { rewardId, requestId }, undefined, request);
  if (result?.success !== true) throw new Error('Reward redemption was not confirmed');
}
