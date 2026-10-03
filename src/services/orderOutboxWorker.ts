import crypto from 'node:crypto';
import type { Firestore, DocumentReference } from 'firebase-admin/firestore';
import type { CanonicalOrder, OutboxOrderEvent } from '../lib/serverOrderService';
import {
  getN8nOrderDispatchConfig, projectCanonicalOrderForN8n, sendOrderToN8n,
  type N8nNotificationResult, type N8nOrderData, type N8nOrderDispatchConfig, type SendOrderToN8nOptions,
} from './n8nOrderNotification';
import { getN8nStatusDispatchConfig, sendStatusToN8n, projectStatusEvent } from './n8nStatusNotification';

export const ORDER_OUTBOX_MAX_ATTEMPTS = 6;
export const ORDER_OUTBOX_POLL_MS = 1000;
export const ORDER_OUTBOX_LOCK_PATH = 'outboxDispatchLocks/n8nOrderCreated';
const MAX_DUE_SCAN = 25;

export function orderOutboxBackoffMs(attempt: number): number {
  return Math.min(15 * 60 * 1000, 30000 * (2 ** Math.max(0, Math.min(10, attempt - 1))));
}

export interface OutboxRunResult {
  status: 'CONFIG_DISABLED' | 'PERSISTENCE_UNAVAILABLE' | 'BUSY' | 'IDLE' | 'DELIVERED' | 'RETRY_SCHEDULED' | 'FAILED' | 'LEASE_LOST' | 'ERROR' | 'STOPPED';
  eventId?: string;
  orderId?: string;
  attempts?: number;
}

export interface OrderOutboxWorkerOptions {
  getDb: () => Firestore | null;
  getConfig?: () => N8nOrderDispatchConfig;
  getStatusConfig?: () => N8nOrderDispatchConfig;
  logger?: (message: string, metadata?: Record<string, string | number>) => void;
  pollIntervalMs?: number;
  now?: () => number;
  dispatch?: (order: N8nOrderData, options: SendOrderToN8nOptions) => Promise<N8nNotificationResult>;
  dispatchStatus?: typeof sendStatusToN8n;
}

interface DispatchLease { owner: string; token: string; until: number }
interface ClaimedEvent { event: OutboxOrderEvent; order: CanonicalOrder; token: string }

function ownsLease(lock: any, lease: DispatchLease, nowMs: number): boolean {
  return lock?.owner === lease.owner && lock?.token === lease.token && lock?.leaseUntilMs > nowMs;
}

function terminalEvent(event: OutboxOrderEvent, state: 'DELIVERED' | 'FAILED', nowMs: number, reason?: string): OutboxOrderEvent {
  const { nextAttemptAtMs: _next, leaseOwner: _owner, leaseToken: _token, leaseUntilMs: _until, ...rest } = event;
  return {
    ...rest, deliveryState: state, updatedAtMs: nowMs,
    ...(state === 'DELIVERED' ? { deliveredAtMs: nowMs, lastError: '' } : { lastError: reason || 'ORDER_WEBHOOK_FAILURE' }),
  };
}

function safeFailureCode(result: N8nNotificationResult): string {
  return typeof result.reason === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(result.reason)
    ? result.reason : result.status === 'TIMEOUT' ? 'ORDER_WEBHOOK_TIMEOUT' : 'ORDER_WEBHOOK_FAILURE';
}

/**
 * Firestore leases are authoritative across backend instances; the in-process guard
 * also prevents overlapping timer/manual runs. Only one event is dispatched per cycle.
 */
export function createOrderOutboxWorker(options: OrderOutboxWorkerOptions) {
  const owner = crypto.randomUUID();
  const now = options.now ?? Date.now;
  const getConfig = options.getConfig ?? getN8nOrderDispatchConfig;
  const dispatch = options.dispatch ?? sendOrderToN8n;
  const getStatusConfig = options.getStatusConfig ?? getN8nStatusDispatchConfig;
  const dispatchStatus = options.dispatchStatus ?? sendStatusToN8n;
  const pollMs = Math.max(100, Math.min(60000, options.pollIntervalMs ?? ORDER_OUTBOX_POLL_MS));
  let stopped = false;
  let started = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<OutboxRunResult> | undefined;

  async function acquireGlobalLease(db: Firestore, leaseMs: number): Promise<DispatchLease | null> {
    const ref = db.doc(ORDER_OUTBOX_LOCK_PATH);
    const token = crypto.randomUUID();
    return db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const nowMs = now();
      if (snapshot.exists && snapshot.data()?.leaseUntilMs > nowMs) return null;
      const lease = { owner, token, until: nowMs + leaseMs };
      transaction.set(ref, { owner, token, leaseUntilMs: lease.until, updatedAtMs: nowMs });
      return lease;
    });
  }

  async function releaseGlobalLease(db: Firestore, lease: DispatchLease, cooldownMs: number): Promise<void> {
    const ref = db.doc(ORDER_OUTBOX_LOCK_PATH);
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const lock = snapshot.data();
      // Token fencing prevents a late process from releasing a replacement worker's lease.
      if (!snapshot.exists || lock?.owner !== lease.owner || lock?.token !== lease.token) return;
      transaction.set(ref, {
        owner: cooldownMs ? lease.owner : '', token: cooldownMs ? lease.token : '',
        leaseUntilMs: now() + cooldownMs, updatedAtMs: now(),
      });
    });
  }

  async function claimEvent(db: Firestore, ref: DocumentReference, lease: DispatchLease, enabledTypes: string[]): Promise<ClaimedEvent | OutboxRunResult | null> {
    const token = crypto.randomUUID();
    return db.runTransaction(async transaction => {
      const lockSnapshot = await transaction.get(db.doc(ORDER_OUTBOX_LOCK_PATH));
      const snapshot = await transaction.get(ref);
      const nowMs = now();
      if (!ownsLease(lockSnapshot.data(), lease, nowMs) || !snapshot.exists) return null;
      const event = snapshot.data() as OutboxOrderEvent;
      if (!enabledTypes.includes(event.eventType) || event.eventId !== ref.id
        || !['PENDING', 'LEASED'].includes(event.deliveryState)
        || !Number.isFinite(event.nextAttemptAtMs) || event.nextAttemptAtMs! > nowMs
        || (event.deliveryState === 'LEASED' && event.leaseUntilMs! > nowMs)) return null;
      const attempts = Number.isSafeInteger(event.attempts) && event.attempts >= 0 ? event.attempts : ORDER_OUTBOX_MAX_ATTEMPTS;
      if (attempts >= ORDER_OUTBOX_MAX_ATTEMPTS) {
        transaction.set(ref, terminalEvent(event, 'FAILED', nowMs, 'ORDER_WEBHOOK_ATTEMPTS_EXHAUSTED'));
        return { status: 'FAILED', eventId: event.eventId, orderId: event.orderId, attempts };
      }
      // Both reads precede the write, so a missing order can never be dispatched from an event's stale summary.
      const orderSnapshot = await transaction.get(db.collection('orders').doc(event.orderId));
      const order = orderSnapshot.exists ? orderSnapshot.data() as CanonicalOrder : null;
      if (!order || order.orderId !== event.orderId) {
        transaction.set(ref, terminalEvent(event, 'FAILED', nowMs, 'CANONICAL_ORDER_MISSING'));
        return { status: 'FAILED', eventId: event.eventId, orderId: event.orderId, attempts };
      }
      const claimed: OutboxOrderEvent = {
        ...event, deliveryState: 'LEASED', attempts: attempts + 1, leaseOwner: lease.owner,
        leaseToken: token, leaseUntilMs: lease.until, nextAttemptAtMs: lease.until,
        lastAttemptAtMs: nowMs, updatedAtMs: nowMs,
      };
      transaction.set(ref, claimed);
      return { event: claimed, order, token };
    });
  }

  async function completeEvent(db: Firestore, claim: ClaimedEvent, lease: DispatchLease, result: N8nNotificationResult, permanentFailure = false): Promise<OutboxRunResult> {
    const ref = db.collection('orderEvents').doc(claim.event.eventId);
    return db.runTransaction(async transaction => {
      const lockSnapshot = await transaction.get(db.doc(ORDER_OUTBOX_LOCK_PATH));
      const snapshot = await transaction.get(ref);
      const event = snapshot.data() as OutboxOrderEvent;
      const nowMs = now();
      if (!ownsLease(lockSnapshot.data(), lease, nowMs) || !snapshot.exists
        || event.deliveryState !== 'LEASED' || event.leaseToken !== claim.token || event.leaseOwner !== lease.owner || event.leaseUntilMs! <= nowMs) {
        return { status: 'LEASE_LOST', eventId: claim.event.eventId, orderId: claim.event.orderId };
      }
      const success = result.sent === true && result.status === 'SUCCESS';
      const failed = permanentFailure || event.attempts >= ORDER_OUTBOX_MAX_ATTEMPTS;
      let updated: OutboxOrderEvent;
      if (success || failed) {
        updated = terminalEvent(event, success ? 'DELIVERED' : 'FAILED', nowMs, safeFailureCode(result));
      } else {
        const { leaseOwner: _owner, leaseToken: _token, leaseUntilMs: _until, ...rest } = event;
        updated = {
          ...rest, deliveryState: 'PENDING', nextAttemptAtMs: nowMs + orderOutboxBackoffMs(event.attempts),
          updatedAtMs: nowMs, lastError: safeFailureCode(result),
        };
      }
      if (Number.isFinite(result.statusCode)) updated.lastStatusCode = result.statusCode;
      transaction.set(ref, updated);
      return {
        status: success ? 'DELIVERED' : failed ? 'FAILED' : 'RETRY_SCHEDULED',
        eventId: event.eventId, orderId: event.orderId, attempts: event.attempts,
      };
    });
  }

  async function processOnce(): Promise<OutboxRunResult> {
    const config = getConfig();
    const verified = getN8nOrderDispatchConfig({ N8N_ORDER_WEBHOOK_URL: config.webhookUrl, N8N_WEBHOOK_SECRET: config.webhookSecret });
    const statusConfig = getStatusConfig();
    const verifiedStatus = getN8nStatusDispatchConfig({ N8N_STATUS_WEBHOOK_URL: statusConfig.webhookUrl, N8N_STATUS_WEBHOOK_SECRET: statusConfig.webhookSecret });
    const enabledTypes = [config.enabled && verified.enabled ? 'ORDER_CREATED' : '', statusConfig.enabled && verifiedStatus.enabled ? 'ORDER_STATUS_CHANGED' : ''].filter(Boolean);
    if (!enabledTypes.length) return { status: 'CONFIG_DISABLED' };
    const db = options.getDb();
    if (!db) return { status: 'PERSISTENCE_UNAVAILABLE' };
    // The transport deadline is shorter than either lease; crashed processes recover after expiry.
    const leaseMs = Math.max(60000, Math.min(30000, Math.max(config.timeoutMs, statusConfig.timeoutMs)) * 3 + 15000);
    const lease = await acquireGlobalLease(db, leaseMs);
    if (!lease) return { status: 'BUSY' };
    let cooldownMs = 0;
    try {
      // Query each enabled receiver separately: an unavailable receiver's pending
      // events must not fill the first page and starve the other event type.
      // The required eventType/nextAttemptAtMs composite index is checked in.
      const batches = await Promise.all(enabledTypes.map(eventType => db.collection('orderEvents')
        .where('eventType', '==', eventType).where('nextAttemptAtMs', '<=', now())
        .orderBy('nextAttemptAtMs', 'asc').limit(MAX_DUE_SCAN).get()));
      const due = batches.flatMap(batch => batch.docs).sort((a, b) =>
        Number(a.data().nextAttemptAtMs) - Number(b.data().nextAttemptAtMs));
      for (const snapshot of due) {
        const claim = await claimEvent(db, snapshot.ref, lease, enabledTypes);
        if (!claim) continue;
        if ('status' in claim) return claim;
        let wireOrder: N8nOrderData | undefined;
        const isStatus = claim.event.eventType === 'ORDER_STATUS_CHANGED';
        const selectedConfig = isStatus ? statusConfig : config;
        try {
          if (isStatus) projectStatusEvent(claim.event);
          else wireOrder = projectCanonicalOrderForN8n(claim.order);
        } catch {
          return await completeEvent(db, claim, lease, { sent: false, status: 'FAILED', reason: 'CANONICAL_ORDER_INVALID' }, true);
        }
        // Recheck lease ownership immediately before crossing the network boundary.
        const lock = await db.doc(ORDER_OUTBOX_LOCK_PATH).get();
        if (!ownsLease(lock.data(), lease, now())) return { status: 'LEASE_LOST', eventId: claim.event.eventId, orderId: claim.event.orderId };
        let result: N8nNotificationResult;
        try {
          result = isStatus ? await dispatchStatus(claim.event, { config: selectedConfig, now })
            : await dispatch(wireOrder!, { config: selectedConfig, now });
        } catch {
          result = { sent: false, status: 'FAILED', reason: 'ORDER_WEBHOOK_NETWORK_ERROR' };
        }
        // After an uncertain delivery, keep other backend instances out briefly while the receiver settles.
        if (result.status !== 'SUCCESS' || !result.sent) cooldownMs = Math.max(30000, Math.min(60000, selectedConfig.timeoutMs * 2));
        return await completeEvent(db, claim, lease, result);
      }
      return { status: 'IDLE' };
    } finally {
      await releaseGlobalLease(db, lease, cooldownMs);
    }
  }

  function runOnce(): Promise<OutboxRunResult> {
    if (stopped) return Promise.resolve({ status: 'STOPPED' });
    if (inFlight) return Promise.resolve({ status: 'BUSY' });
    inFlight = processOnce().catch((): OutboxRunResult => {
      // Do not log webhook URLs, secrets, customer records, or raw SDK/network error messages.
      options.logger?.('ORDER_OUTBOX_WORKER_ERROR');
      return { status: 'ERROR' };
    }).finally(() => { inFlight = undefined; });
    return inFlight;
  }

  function schedule(): void {
    if (stopped) return;
    timer = setTimeout(() => { void runOnce().then(schedule); }, pollMs);
    timer.unref?.();
  }

  function start(): void {
    if (started || stopped) return;
    started = true;
    void runOnce().then(schedule);
  }

  async function stop(): Promise<void> {
    stopped = true;
    if (timer) clearTimeout(timer);
    await inFlight;
  }

  return { runOnce, start, stop };
}

/** Start once when the persistent Express server starts; await stop() before process shutdown. */
export function startOrderOutboxWorker(options: OrderOutboxWorkerOptions) {
  const worker = createOrderOutboxWorker(options);
  worker.start();
  return worker;
}

/** Bounded read-only reconciliation. It never re-enables disabled or failed historical events. */
export async function inspectOrderOutbox(db: Firestore, limit = 100) {
  const snapshot = await db.collection('orderEvents').where('eventType', '==', 'ORDER_CREATED').limit(Math.max(1, Math.min(1000, Math.floor(limit)))).get();
  const counts: Record<OutboxOrderEvent['deliveryState'], number> = { PENDING: 0, LEASED: 0, DELIVERED: 0, FAILED: 0, DISABLED: 0 };
  const review: Array<{ eventId: string; orderId: string; state: string; attempts: number; reason: string }> = [];
  for (const document of snapshot.docs) {
    const event = document.data() as OutboxOrderEvent;
    if (event.deliveryState in counts) counts[event.deliveryState]++;
    if (event.deliveryState === 'DISABLED' || event.deliveryState === 'FAILED' || !Number.isFinite(event.nextAttemptAtMs) && ['PENDING', 'LEASED'].includes(event.deliveryState)) {
      review.push({ eventId: document.id, orderId: event.orderId, state: event.deliveryState, attempts: event.attempts, reason: event.disabledReason || event.lastError || 'REVIEW_REQUIRED' });
    }
  }
  return { scanned: snapshot.size, bounded: snapshot.size >= limit, counts, review, replayed: 0 as const };
}
