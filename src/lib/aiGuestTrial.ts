import { sanitizeFirestoreData } from './firestoreData';
import crypto from 'crypto';

export class GuestTrialLimitError extends Error {
  constructor() {
    super('Your five complimentary AI messages are used. Sign in with Google to continue.');
    this.name = 'GuestTrialLimitError';
  }
}

/**
 * Server-side trial counter. The IP must come from a trusted ingress; set
 * TRUST_PROXY_HOPS only when the API is behind that many controlled proxies.
 * A hashed network and browser fingerprint avoids persisting raw IP addresses.
 */
export async function reserveGuestAiMessage(
  db: any,
  ip: string,
  userAgent: string,
  secret: string,
  now = Date.now()
): Promise<number> {
  if (!db || secret.length < 32) throw new Error('AI_GUEST_TRIAL_UNAVAILABLE');
  const key = crypto.createHmac('sha256', secret)
    .update(`${ip || 'unknown'}|${userAgent.slice(0, 256)}`)
    .digest('hex');
  const ref = db.collection('aiGuestTrials').doc(key);
  return db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const resetAt = typeof data?.resetAt === 'number' && data.resetAt > now
      ? data.resetAt : now + 24 * 60 * 60 * 1000;
    const used = resetAt === data?.resetAt ? Number(data?.used || 0) : 0;
    if (used >= 5) throw new GuestTrialLimitError();
    tx.set(ref, sanitizeFirestoreData({ used: used + 1, resetAt, updatedAt: now }), { merge: true });
    return 4 - used;
  });
}
