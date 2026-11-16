import { Router, type RequestHandler } from 'express';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

/**
 * First-party demand analytics (owner decision 16 Nov 2026).
 * Counts what customers look at and ask for, so the owner can see demand: product views,
 * add-to-bag, quote requests, checkout starts, orders and AI chat messages.
 * No cookies, no visitor ids, no IP or user-agent stored: only daily totals per event and product.
 * Counts are buffered in memory and flushed once a minute, so one write covers many events.
 */
export const DEMAND_EVENTS = ['product_view', 'add_to_cart', 'quote_request', 'checkout_start', 'order_placed', 'ai_chat'] as const;
export type DemandEvent = typeof DEMAND_EVENTS[number];
const PRODUCT_EVENTS = new Set<DemandEvent>(['product_view', 'add_to_cart', 'quote_request']);
const PRODUCT_ID = /^[a-z0-9][a-z0-9_-]{1,79}$/;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|uptime/i;
const MAX_KEYS_PER_DAY = 3000;

export function karachiDay(now = Date.now()): string {
  return new Date(now + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function validDemandEvent(body: unknown): { type: DemandEvent; productId: string | null } | null {
  if (!body || typeof body !== 'object') return null;
  const { type, productId } = body as Record<string, unknown>;
  if (typeof type !== 'string' || !(DEMAND_EVENTS as readonly string[]).includes(type)) return null;
  const event = type as DemandEvent;
  if (PRODUCT_EVENTS.has(event)) {
    if (typeof productId !== 'string' || !PRODUCT_ID.test(productId)) return null;
    return { type: event, productId };
  }
  return { type: event, productId: null };
}

export function createDemandBuffer(options: { getDb: () => Firestore | null; now?: () => number }) {
  const now = options.now || Date.now;
  let pending = new Map<string, number>();
  const keyOf = (day: string, type: DemandEvent, productId: string | null) => `${day}|${type}|${productId || '_total'}`;
  return {
    record(type: DemandEvent, productId: string | null) {
      const day = karachiDay(now());
      const totalKey = keyOf(day, type, null);
      pending.set(totalKey, (pending.get(totalKey) || 0) + 1);
      if (productId) {
        const key = keyOf(day, type, productId);
        if (pending.has(key) || pending.size < MAX_KEYS_PER_DAY) pending.set(key, (pending.get(key) || 0) + 1);
      }
    },
    size: () => pending.size,
    async flush(): Promise<number> {
      const db = options.getDb();
      if (!db || pending.size === 0) return 0;
      const batch = pending;
      pending = new Map();
      const byDay = new Map<string, Record<string, Record<string, FieldValue>>>();
      for (const [key, count] of batch) {
        const [day, type, product] = key.split('|');
        const doc = byDay.get(day) || {};
        doc[type] = { ...(doc[type] || {}), [product]: FieldValue.increment(count) };
        byDay.set(day, doc);
      }
      try {
        await Promise.all([...byDay].map(([day, events]) =>
          db.collection('analyticsDaily').doc(day).set({ day, events, updatedAt: new Date(now()).toISOString() }, { merge: true })));
        return batch.size;
      } catch {
        // Keep the counts for the next attempt instead of losing them.
        for (const [key, count] of batch) pending.set(key, (pending.get(key) || 0) + count);
        return 0;
      }
    },
  };
}

export interface DemandSummary {
  days: number;
  from: string;
  to: string;
  totals: Record<DemandEvent, number>;
  daily: Array<{ day: string } & Partial<Record<DemandEvent, number>>>;
  topProducts: Record<'product_view' | 'add_to_cart' | 'quote_request', Array<{ productId: string; count: number }>>;
}

export function summarizeDemand(docs: Array<{ day: string; events?: Record<string, Record<string, number>> }>, days: number): DemandSummary {
  const totals = Object.fromEntries(DEMAND_EVENTS.map(e => [e, 0])) as Record<DemandEvent, number>;
  const perProduct: Record<string, Map<string, number>> = { product_view: new Map(), add_to_cart: new Map(), quote_request: new Map() };
  const daily = [...docs].sort((a, b) => a.day.localeCompare(b.day)).map(doc => {
    const row: { day: string } & Partial<Record<DemandEvent, number>> = { day: doc.day };
    for (const event of DEMAND_EVENTS) {
      const counts = doc.events?.[event] || {};
      const total = Number(counts._total) || 0;
      row[event] = total;
      totals[event] += total;
      if (perProduct[event]) for (const [id, n] of Object.entries(counts)) if (id !== '_total') perProduct[event].set(id, (perProduct[event].get(id) || 0) + (Number(n) || 0));
    }
    return row;
  });
  const top = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([productId, count]) => ({ productId, count }));
  return {
    days, from: daily[0]?.day || '', to: daily.at(-1)?.day || '', totals, daily,
    topProducts: { product_view: top(perProduct.product_view), add_to_cart: top(perProduct.add_to_cart), quote_request: top(perProduct.quote_request) },
  };
}

export function createDemandAnalyticsRouter(options: { getDb: () => Firestore | null; requireAdmin: RequestHandler; eventLimiter?: RequestHandler; buffer: ReturnType<typeof createDemandBuffer> }) {
  const router = Router();
  const limiter = options.eventLimiter || ((_req, _res, next) => next());
  router.post('/api/events', limiter, (req, res) => {
    const event = validDemandEvent(req.body);
    const agent = String(req.get('user-agent') || '');
    if (event && agent && !BOT.test(agent)) options.buffer.record(event.type, event.productId);
    res.status(204).end();
  });
  router.get('/api/admin/analytics', options.requireAdmin, async (req, res) => {
    const db = options.getDb();
    if (!db) { res.status(503).json({ error: 'ANALYTICS_UNAVAILABLE' }); return; }
    const days = Math.min(90, Math.max(1, Math.round(Number(req.query.days) || 30)));
    await options.buffer.flush();
    const ids = Array.from({ length: days }, (_, i) => karachiDay(Date.now() - i * 86400000));
    const snaps = await Promise.all(ids.map(id => db.collection('analyticsDaily').doc(id).get()));
    const docs = snaps.filter(s => s.exists).map(s => ({ day: s.id, ...(s.data() as any) }));
    res.set('Cache-Control', 'no-store').json(summarizeDemand(docs, days));
  });
  return router;
}
