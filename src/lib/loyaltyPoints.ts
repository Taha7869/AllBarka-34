/** Server-only policy. Never accept loyalty amounts supplied by automation or clients. */
export function loyaltyRate(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.LOYALTY_POINTS_PER_100_RUPEES;
  if (raw === undefined || raw.trim() === '') return 1;
  const rate = Number(raw);
  if (!Number.isSafeInteger(rate) || rate < 0 || rate > 10000) throw new Error('INVALID_LOYALTY_POINTS_PER_100_RUPEES');
  return rate;
}
export function calculateLoyaltyPoints(total: number, wholesale = false, quote = false, rate = loyaltyRate()): number {
  if (wholesale || quote) return 0;
  if (!Number.isFinite(total) || total < 0) throw new Error('INVALID_LOYALTY_ORDER_TOTAL');
  return Math.floor(total / 100) * rate;
}
