import { sanitizeFirestoreData } from './firestoreData';
import crypto from 'crypto';

export class GuestTrialLimitError extends Error {
  constructor() {
    super('Your complimentary AI messages for today are used. Sign in with Google to continue.');
    this.name = 'GuestTrialLimitError';
  }
}

/**
 * Server-side trial counter. The IP must come from a trusted ingress; set
 * TRUST_PROXY_HOPS only when the API is behind that many controlled proxies.
 * A hashed network and browser fingerprint avoids persisting raw IP addresses.
 */
/**
 * Daily abuse ceiling for guests. The everyday limit customers feel is 5 messages a minute
 * (server.ts); this only stops a script from draining the AI quota. Railway can override it
 * with AI_GUEST_DAILY_LIMIT (1 to 200, default 60).
 */
export const DEFAULT_GUEST_DAILY_LIMIT = 60;
export function guestDailyLimit(value = process.env.AI_GUEST_DAILY_LIMIT): number {
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= 200 ? limit : DEFAULT_GUEST_DAILY_LIMIT;
}

const trialKey = (ip: string, userAgent: string, secret: string) => crypto.createHmac('sha256', secret)
  .update(`${ip || 'unknown'}|${userAgent.slice(0, 256)}`)
  .digest('hex');

export async function reserveGuestAiMessage(
  db: any,
  ip: string,
  userAgent: string,
  secret: string,
  now = Date.now(),
  limit = guestDailyLimit()
): Promise<number> {
  if (!db || secret.length < 32) throw new Error('AI_GUEST_TRIAL_UNAVAILABLE');
  const ref = db.collection('aiGuestTrials').doc(trialKey(ip, userAgent, secret));
  return db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const resetAt = typeof data?.resetAt === 'number' && data.resetAt > now
      ? data.resetAt : now + 24 * 60 * 60 * 1000;
    const used = resetAt === data?.resetAt ? Number(data?.used || 0) : 0;
    if (used >= limit) throw new GuestTrialLimitError();
    tx.set(ref, sanitizeFirestoreData({ used: used + 1, resetAt, updatedAt: now }), { merge: true });
    return limit - 1 - used;
  });
}

/**
 * Gives a reserved message back when the AI provider did not answer (busy, timeout, error), so a
 * customer is not charged a daily message for a reply they never got.
 */
export async function releaseGuestAiMessage(db: any, ip: string, userAgent: string, secret: string, now = Date.now()): Promise<void> {
  if (!db || secret.length < 32) return;
  const ref = db.collection('aiGuestTrials').doc(trialKey(ip, userAgent, secret));
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    if (!data || typeof data.resetAt !== 'number' || data.resetAt <= now || !(Number(data.used) > 0)) return;
    tx.set(ref, sanitizeFirestoreData({ used: Number(data.used) - 1, resetAt: data.resetAt, updatedAt: now }), { merge: true });
  });
}
