import { sanitizeFirestoreData } from '../lib/firestoreData';
import crypto from 'node:crypto';
import type { Firestore, DocumentReference } from 'firebase-admin/firestore';
import type { CanonicalOrder, OutboxOrderEvent } from '../lib/serverOrderService';
import {
  getN8nOrderDispatchConfig, projectCanonicalOrderForN8n, sendOrderToN8n,
  type N8nNotificationResult, type N8nOrderData, type N8nOrderDispatchConfig, type SendOrderToN8nOptions,
} from './n8nOrderNotification';
import { getN8nStatusDispatchConfig, sendStatusToN8n, projectStatusEvent } from './n8nStatusNotification';
import { outboxErrorDetails } from './outboxDiagnostics';

export const ORDER_OUTBOX_MAX_RETRIES = 5;
export const ORDER_OUTBOX_MAX_ATTEMPTS = 1 + ORDER_OUTBOX_MAX_RETRIES;
// QUOTA FIX: pehle 15000 (15s) tha — har tick par lease acquire/release = 2 faltu writes.
// Ab 60s poll + read-before-lease: idle tick par ZERO Firestore writes.
export const ORDER_OUTBOX_POLL_MS = 60000;
export const ORDER_OUTBOX_LOCK_PATH = 'outboxDispatchLocks/n8nOrderCreated';
const MAX_DUE_SCAN = 25;
export const ORDER_OUTBOX_BATCH_SIZE = 20;

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
  batchSize?: number;
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
 * also prevents overlapping timer/manual runs. A bounded batch drains ready events while each transport retains its fenced lease.
 */
export function createOrderOutboxWorker(options: OrderOutboxWorkerOptions) {
  const owner = crypto.randomUUID();
  const now = options.now ?? Date.now;
  const getConfig = options.getConfig ?? getN8nOrderDispatchConfig;
  const dispatch = options.dispatch ?? sendOrderToN8n;
  const getStatusConfig = options.getStatusConfig ?? getN8nStatusDispatchConfig;
  const dispatchStatus = options.dispatchStatus ?? sendStatusToN8n;
  const pollMs = Math.max(100, Math.min(60000, options.pollIntervalMs ?? ORDER_OUTBOX_POLL_MS));
  const batchSize = Math.max(1, Math.min(25, Math.floor(options.batchSize ?? ORDER_OUTBOX_BATCH_SIZE)));
  let lastBatch = { processed: 0, delivered: 0, failed: 0, retries: 0, moreWork: false };
  let wakeRequested = false;
  const pendingTimes = new Map<string, number>();
  const listeners: Array<() => void> = [];
  let stopped = false;
  let started = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<OutboxRunResult> | undefined;
  let lastTickAt: string | null = null;
  let lastResult: OutboxRunResult | null = null;
  let cyclePending = 0;
  let cycleEventId = 'none';
  let cycleStep = 'configuration';
  const log = (message: string, metadata?: Record<string, string | number>) => {
    try { options.logger?.(message, metadata); } catch { /* A logger failure must never stop durable delivery. */ }
  };
  async function step<T>(name: string, operation: () => Promise<T>): Promise<T> {
    cycleStep = name;
    try { return await operation(); }
    catch (error) {
      log('ORDER_OUTBOX_WORKER_ERROR', { step: name, eventId: cycleEventId,
        ...outboxErrorDetails(error, [getConfig().webhookUrl, getConfig().webhookSecret, getStatusConfig().webhookUrl, getStatusConfig().webhookSecret]),
        ...(typeof (error as any)?.code === 'number' || typeof (error as any)?.code === 'string' ? { errorCode: (error as any).code } : {}) });
      // Mark already logged so release/final catch cannot lose the original failed step.
      const failure = new Error(`Outbox step failed: ${name}`, { cause: error });
      (failure as any).outboxLogged = true;
      throw failure;
    }
  }

  async function acquireGlobalLease(db: Firestore, leaseMs: number): Promise<DispatchLease | null> {
    const ref = db.doc(ORDER_OUTBOX_LOCK_PATH);
    const token = crypto.randomUUID();
    return db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const nowMs = now();
      if (snapshot.exists && snapshot.data()?.leaseUntilMs > nowMs) return null;
      const lease = { owner, token, until: nowMs + leaseMs };
      transaction.set(ref, sanitizeFirestoreData({ owner, token, leaseUntilMs: lease.until, updatedAtMs: nowMs }));
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
      transaction.set(ref, sanitizeFirestoreData({
        owner: cooldownMs ? lease.owner : '', token: cooldownMs ? lease.token : '',
        leaseUntilMs: now() + cooldownMs, updatedAtMs: now(),
      }));
    });
  }

  async function renewGlobalLease(db: Firestore, lease: DispatchLease, leaseMs: number): Promise<boolean> {
    const ref = db.doc(ORDER_OUTBOX_LOCK_PATH);
    const until = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!ownsLease(snapshot.data(), lease, now())) return null;
      const next = now() + leaseMs;
      transaction.set(ref, sanitizeFirestoreData({ owner: lease.owner, token: lease.token, leaseUntilMs: next, updatedAtMs: now() }));
      return next;
    });
    if (until === null) return false;
    lease.until = until;
    return true;
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
        transaction.set(ref, sanitizeFirestoreData(terminalEvent(event, 'FAILED', nowMs, 'ORDER_WEBHOOK_ATTEMPTS_EXHAUSTED')));
        return { status: 'FAILED', eventId: event.eventId, orderId: event.orderId, attempts };
      }
      // Both reads precede the write, so a missing order can never be dispatched from an event's stale summary.
      const orderSnapshot = await transaction.get(db.collection('orders').doc(event.orderId));
      const order = orderSnapshot.exists ? orderSnapshot.data() as CanonicalOrder : null;
      if (!order || order.orderId !== event.orderId) {
        transaction.set(ref, sanitizeFirestoreData(terminalEvent(event, 'FAILED', nowMs, 'CANONICAL_ORDER_MISSING')));
        return { status: 'FAILED', eventId: event.eventId, orderId: event.orderId, attempts };
      }
      if (event.eventType === 'ORDER_STATUS_CHANGED' && enabledTypes.includes('ORDER_CREATED') && Number.isSafeInteger(order.createdAtMs)) {
        const creation = await transaction.get(db.collection('orderEvents').doc(`${event.orderId}_ORDER_CREATED_${order.createdAtMs}`));
        if (creation.exists && ['PENDING', 'LEASED'].includes(creation.data()?.deliveryState)) return null;
      }
      const claimed: OutboxOrderEvent = {
        ...event, deliveryState: 'LEASED', attempts: attempts + 1, leaseOwner: lease.owner,
        leaseToken: token, leaseUntilMs: lease.until, nextAttemptAtMs: lease.until,
        lastAttemptAtMs: nowMs, updatedAtMs: nowMs,
      };
      transaction.set(ref, sanitizeFirestoreData(claimed));
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
      transaction.set(ref, sanitizeFirestoreData(updated));
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

    // ============================================================
    // QUOTA FIX (READ-BEFORE-LEASE):
    // Pehle sasti READ se check karo ke koi due event hai hi ya nahi.
    // Kuch due na ho to yahin IDLE return — ZERO Firestore writes.
    // (Pehle har tick par lease acquire+release = 2 faltu writes hoti theen.)
    // Jo results yahan mile, lease ke baad wahi reuse hote hain — double query nahi.
    // ============================================================
    const batches = await step('firestore.read_due_events', () => Promise.all(enabledTypes.map(eventType => db.collection('orderEvents')
      .where('eventType', '==', eventType).where('nextAttemptAtMs', '<=', now())
      .orderBy('nextAttemptAtMs', 'asc').limit(MAX_DUE_SCAN).get())));
    const due = batches.flatMap(batch => batch.docs).sort((a, b) =>
      Number(a.data().nextAttemptAtMs) - Number(b.data().nextAttemptAtMs));
    cyclePending = due.length;
    if (!due.length) return { status: 'IDLE' };

    // Lease sirf tab lo jab kaam ho. Transport deadline lease se choti hai;
    // crashed processes expiry ke baad recover karte hain.
    const leaseMs = Math.max(60000, Math.min(30000, Math.max(config.timeoutMs, statusConfig.timeoutMs)) * 3 + 15000);
    const lease = await step('firestore.acquire_lease', () => acquireGlobalLease(db, leaseMs));
    if (!lease) return { status: 'BUSY' };
    let outcome: OutboxRunResult = { status: 'IDLE' };
    try {
      for (const snapshot of due.slice(0, batchSize)) {
        if (stopped) break;
        if (lastBatch.processed && !await step('firestore.renew_lease', () => renewGlobalLease(db, lease, leaseMs))) {
          return { status: 'LEASE_LOST' };
        }
        cycleEventId = snapshot.id;
        const claim = await step('firestore.claim_event_and_read_order', () => claimEvent(db, snapshot.ref, lease, enabledTypes));
        if (!claim) continue;
        if ('status' in claim) {
          outcome = claim; lastBatch.processed++; if (claim.status === 'FAILED') lastBatch.failed++;
          continue;
        }
        let wireOrder: N8nOrderData | undefined;
        const isStatus = claim.event.eventType === 'ORDER_STATUS_CHANGED';
        const selectedConfig = isStatus ? statusConfig : config;
        let result: N8nNotificationResult;
        let permanentFailure = false;
        try {
          if (isStatus) projectStatusEvent(claim.event);
          else wireOrder = projectCanonicalOrderForN8n(claim.order);
          const lock = await step('firestore.verify_lease', () => db.doc(ORDER_OUTBOX_LOCK_PATH).get());
          if (!ownsLease(lock.data(), lease, now())) return { status: 'LEASE_LOST', eventId: claim.event.eventId, orderId: claim.event.orderId };
          if (stopped) break;
          cycleStep = isStatus ? 'N8N_STATUS_WEBHOOK_URL.call' : 'N8N_ORDER_WEBHOOK_URL.call';
          try {
            result = isStatus ? await dispatchStatus(claim.event, { config: selectedConfig, now })
              : await dispatch(wireOrder!, { config: selectedConfig, now, eventId: claim.event.eventId });
          } catch (error) {
            result = { sent: false, status: 'FAILED', reason: 'ORDER_WEBHOOK_NETWORK_ERROR',
              ...outboxErrorDetails(error, [selectedConfig.webhookUrl, selectedConfig.webhookSecret]) };
          }
        } catch (error) {
          if ((error as any)?.outboxLogged) throw error;
          permanentFailure = true;
          log('ORDER_OUTBOX_WORKER_ERROR', { step: 'canonical_payload_validation', eventId: claim.event.eventId, ...outboxErrorDetails(error) });
          result = { sent: false, status: 'FAILED', reason: 'CANONICAL_ORDER_INVALID' };
        }
        if (!result.sent || result.status !== 'SUCCESS') log('ORDER_OUTBOX_WORKER_ERROR', {
          step: cycleStep, eventId: claim.event.eventId, orderId: claim.event.orderId,
          httpStatus: result.statusCode ?? 'no response', attempts: claim.event.attempts,
          ...outboxErrorDetails(new Error(result.reason || 'ORDER_WEBHOOK_FAILURE')),
          ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
          ...(result.errorStack ? { errorStack: result.errorStack } : {}),
        });
        outcome = await step('firestore.persist_delivery_result', () => completeEvent(db, claim, lease, result, permanentFailure));
        lastBatch.processed++;
        if (outcome.status === 'DELIVERED') lastBatch.delivered++;
        else if (outcome.status === 'FAILED') lastBatch.failed++;
        else if (outcome.status === 'RETRY_SCHEDULED') lastBatch.retries++;
        if (outcome.status === 'LEASE_LOST') break;
        // An uncertain event retains its own backoff; unrelated customers are not globally delayed.
      }
      lastBatch.moreWork = lastBatch.processed > 0 && (due.length > batchSize || lastBatch.processed < Math.min(due.length, batchSize));
      return outcome;
    } finally {
      await step('firestore.release_lease', () => releaseGlobalLease(db, lease, 0));
    }
  }

  function runOnce(): Promise<OutboxRunResult> {
    if (stopped) return Promise.resolve({ status: 'STOPPED' });
    if (inFlight) return Promise.resolve({ status: 'BUSY' });
    lastBatch = { processed: 0, delivered: 0, failed: 0, retries: 0, moreWork: false };
    wakeRequested = false;
    cyclePending = 0;
    cycleEventId = 'none';
    cycleStep = 'configuration';
    lastTickAt = new Date(now()).toISOString();
    inFlight = processOnce().catch((error): OutboxRunResult => {
      if (!error?.outboxLogged) log('ORDER_OUTBOX_WORKER_ERROR', { step: cycleStep, eventId: cycleEventId, ...outboxErrorDetails(error) });
      return { status: 'ERROR' };
    }).then(result => {
      lastResult = result;
      const delivered = lastBatch.delivered;
      const failed = lastBatch.failed;
      const pending = Math.max(0, cyclePending - delivered - failed);
      log(`outbox worker tick: ${pending} pending, ${delivered} delivered, ${failed} failed`, {
        status: result.status, eventId: result.eventId || cycleEventId, pending, delivered, failed,
        ...(result.attempts !== undefined ? { attempts: result.attempts } : {}),
      });
      return result;
    }).finally(() => { inFlight = undefined; });
    return inFlight;
  }

  function schedule(delay?: number): void {
    if (stopped || !started) return;
    if (timer) clearTimeout(timer);
    const future = [...pendingTimes.values()].filter(time => time > now());
    const retryDelay = future.length ? Math.max(100, Math.min(...future) - now()) : pollMs;
    const next = delay ?? (wakeRequested || lastBatch.moreWork ? 100 : Math.min(pollMs, retryDelay));
    timer = setTimeout(() => { timer = undefined; void runOnce().then(() => schedule()); }, next);
    timer.unref?.();
  }

  function wake(): void {
    if (stopped) return;
    wakeRequested = true;
    if (started && !inFlight) schedule(0);
  }

  function watchPending(): void {
    const db = options.getDb();
    if (!db) return;
    const configs = [['ORDER_CREATED', getConfig()], ['ORDER_STATUS_CHANGED', getStatusConfig()]] as const;
    for (const [eventType, config] of configs) {
      if (!config.enabled) continue;
      try {
        const query = db.collection('orderEvents').where('eventType', '==', eventType)
          .where('deliveryState', '==', 'PENDING').orderBy('nextAttemptAtMs', 'asc').limit(1);
        if (typeof query.onSnapshot !== 'function') continue;
        listeners.push(query.onSnapshot(snapshot => {
          const nextTime = snapshot.docs[0]?.data().nextAttemptAtMs;
          if (Number.isFinite(nextTime)) pendingTimes.set(eventType, nextTime); else pendingTimes.delete(eventType);
          if (Number.isFinite(nextTime) && nextTime <= now()) wake();
          else if (!inFlight) schedule();
        }, () => { pendingTimes.delete(eventType); log('ORDER_OUTBOX_LISTENER_UNAVAILABLE', { eventType }); }));
      } catch { log('ORDER_OUTBOX_LISTENER_UNAVAILABLE', { eventType }); }
    }
  }

  function start(): void {
    if (started || stopped) return;
    started = true;
    log('ORDER_OUTBOX_WORKER_STARTED', { pollIntervalMs: pollMs, batchSize, maxRetries: ORDER_OUTBOX_MAX_RETRIES });
    watchPending();
    void runOnce().then(() => schedule());
  }

  async function stop(): Promise<void> {
    stopped = true;
    if (timer) clearTimeout(timer);
    listeners.forEach(unsubscribe => unsubscribe());
    await inFlight;
  }

  return { runOnce, wake, start, stop, getState: () => ({ started, stopped, running: Boolean(inFlight), lastTickAt,
    lastResult: lastResult?.status || null, pollIntervalMs: pollMs, batchSize, listening: listeners.length, lastBatch: { ...lastBatch } }) };

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
