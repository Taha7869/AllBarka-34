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
