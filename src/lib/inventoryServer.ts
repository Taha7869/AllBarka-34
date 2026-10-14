import { randomUUID } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { Router, type RequestHandler } from 'express';
import { pricingVersion } from './liveCatalog';
import type { CatalogSnapshot } from './catalogPricing';
import { InventoryError, INVENTORY_COLLECTION, INVENTORY_TARGETS, inventoryTarget, inventoryFromStored, validateInventory, validateStockCapacity,
  type InventoryRecord, type StockAllocation, type InventoryReservation } from './inventory';

function publicAdminRecord(id: string, raw?: Record<string, unknown>): InventoryRecord {
  const target = inventoryTarget(id); const value = inventoryFromStored(raw);
  const revision = Number.isSafeInteger(raw?.revision) && (raw!.revision as number) >= 0 ? raw!.revision as number : 0;
  return { id, kind: target.kind, unit: target.unit, ...value, revision,
    version: pricingVersion(raw === undefined ? ['missing', id] : [value, revision]),
    updatedAt: typeof raw?.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt)) ? raw.updatedAt : null };
}
export function createInventoryStore(getDb: () => Firestore | null) {
  let current: Map<string, unknown> | null = null; let unsubscribe: (() => void) | undefined; let invalid = false;
  const waiting = new Set<(error?: InventoryError) => void>();
  const finish = (error?: InventoryError) => { waiting.forEach(resolve => resolve(error)); waiting.clear(); };
  return {
    async getSnapshot(): Promise<Map<string, unknown>> {
      const db = getDb(); if (!db) return new Map();
      if (current) return current;
      if (invalid) throw new InventoryError('INVENTORY_UNAVAILABLE', 503);
      await new Promise<void>((resolve, reject) => {
        const done = (error?: InventoryError) => { clearTimeout(timer); waiting.delete(done); error ? reject(error) : resolve(); };
        const timer = setTimeout(() => done(new InventoryError('INVENTORY_UNAVAILABLE', 503)), 8000); waiting.add(done);
        if (unsubscribe) return;
        const fail = () => { invalid = false; current = null; unsubscribe?.(); unsubscribe = undefined; finish(new InventoryError('INVENTORY_UNAVAILABLE', 503)); };
        try {
          unsubscribe = db.collection(INVENTORY_COLLECTION).limit(INVENTORY_TARGETS.length * 2).onSnapshot(snapshot => {
            try {
              if (snapshot.docs.length >= INVENTORY_TARGETS.length * 2) throw new InventoryError('INVENTORY_UNAVAILABLE', 503);
              const next = new Map<string, unknown>();
              for (const doc of snapshot.docs) if (INVENTORY_TARGETS.some(target => target.id === doc.id)) {
                validateInventory(doc.data()); next.set(doc.id, doc.data());
              }
              invalid = false; current = next; finish();
            } catch { invalid = true; current = null; finish(new InventoryError('INVENTORY_UNAVAILABLE', 503)); }
          }, fail);
        } catch { fail(); }
      });
      if (!current) throw new InventoryError('INVENTORY_UNAVAILABLE', 503);
      return current;
    },
    close() { unsubscribe?.(); unsubscribe = undefined; invalid = false; current = null; finish(new InventoryError('INVENTORY_UNAVAILABLE', 503)); },
  };
}
export function catalogWithInventory(snapshot: CatalogSnapshot, records: Map<string, unknown>): CatalogSnapshot {
  const available = (id: string) => { const stock = inventoryFromStored(records.get(id)); return stock.mode === 'unlimited' || stock.available > 0; };
  const catalog = snapshot.catalog.map(product => ({ ...product, active: product.active !== false && (product.quoteOnly || available(product.id)) }));
  const boxes = snapshot.boxes.map(box => ({ ...box, active: box.active !== false && available(box.id) }));
  return { ...snapshot, catalog, boxes, revision: pricingVersion([snapshot.revision, catalog.map(product => product.active), boxes.map(box => box.active)]) };
}

/** Read all target records before any order/coupon/reward write, and aggregate repeated portions/hamper samples. */
export async function readStockReservation(db: Firestore, transaction: Transaction, requirements: StockAllocation[]) {
  const records = new Map<string, unknown>();
  for (const allocation of requirements) { const doc = await transaction.get(db.collection(INVENTORY_COLLECTION).doc(allocation.id)); records.set(allocation.id, doc.exists ? doc.data() : undefined); }
  validateStockCapacity(requirements, records);
  return requirements.flatMap(allocation => {
    const stock = inventoryFromStored(records.get(allocation.id));
    const record = publicAdminRecord(allocation.id, records.get(allocation.id) as Record<string, unknown>);
    if (record.revision >= Number.MAX_SAFE_INTEGER) throw new InventoryError('INVENTORY_UNAVAILABLE', 503);
    return stock.mode === 'tracked' ? [{ allocation, record }] : [];
  });
}
export function commitStockReservation(db: Firestore, transaction: Transaction, prepared: Awaited<ReturnType<typeof readStockReservation>>, now: string): InventoryReservation | undefined {
  if (!prepared.length) return undefined;
  for (const { allocation, record } of prepared) transaction.update(db.collection(INVENTORY_COLLECTION).doc(allocation.id), {
    available: record.available - allocation.units, revision: record.revision + 1, updatedAt: now, updatedBy: 'order-reservation' });
  return { status: 'RESERVED', allocations: prepared.map(entry => entry.allocation), reservedAt: now };
}
export async function readStockRelease(db: Firestore, transaction: Transaction, reservation: InventoryReservation | undefined) {
  if (reservation?.status !== 'RESERVED') return [];
  if (!Array.isArray(reservation.allocations) || new Set(reservation.allocations.map(value => value.id)).size !== reservation.allocations.length) throw new InventoryError('INVENTORY_UNAVAILABLE', 503);
  const prepared: Array<{ allocation: StockAllocation; record: InventoryRecord }> = [];
  for (const allocation of reservation.allocations) {
    const target = inventoryTarget(allocation.id);
    if (target.unit !== allocation.unit || target.kind !== allocation.kind || !Number.isSafeInteger(allocation.units) || allocation.units <= 0) throw new InventoryError('INVENTORY_UNAVAILABLE', 503);
    const stored = await transaction.get(db.collection(INVENTORY_COLLECTION).doc(allocation.id));
    const record = publicAdminRecord(allocation.id, stored.exists ? stored.data() : undefined);
    if (record.revision >= Number.MAX_SAFE_INTEGER) throw new InventoryError('INVENTORY_UNAVAILABLE', 503);
    if (record.mode === 'tracked') { validateInventory({ mode: 'tracked', available: record.available + allocation.units }, true); prepared.push({ allocation, record }); }
  }
  return prepared;
}
export function commitStockRelease(db: Firestore, transaction: Transaction, prepared: Awaited<ReturnType<typeof readStockRelease>>, now: string) {
  for (const { allocation, record } of prepared) transaction.update(db.collection(INVENTORY_COLLECTION).doc(allocation.id), {
    available: record.available + allocation.units, revision: record.revision + 1, updatedAt: now, updatedBy: 'order-cancellation' });
}

export async function updateInventory(input: { db: Firestore | null; id: unknown; actorUid: string; body: unknown }): Promise<InventoryRecord> {
  const target = inventoryTarget(input.id);
  if (!input.actorUid) throw new InventoryError('FORBIDDEN_ADMIN', 403);
  if (!input.db) throw new InventoryError('INVENTORY_UNAVAILABLE', 503);
  const body = input.body as Record<string, unknown>;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['expectedVersion', 'inventory', 'reason'].includes(key))
    || typeof body.expectedVersion !== 'string' || !/^[a-f0-9]{64}$/.test(body.expectedVersion) || typeof body.reason !== 'string'
    || body.reason.trim().length < 3 || body.reason.length > 300 || /[\u0000-\u001f\u007f]/.test(body.reason)) throw new InventoryError('INVALID_INVENTORY');
  const inventory = validateInventory(body.inventory, true); const reason = body.reason.trim();
  if (target.kind === 'products' && 'quoteOnly' in target.target && target.target.quoteOnly && inventory.mode === 'tracked') throw new InventoryError('INVALID_INVENTORY');
  const db = input.db; const ref = db.collection(INVENTORY_COLLECTION).doc(target.id);
  const audit = db.collection('inventoryAudits').doc(target.id).collection('entries').doc(randomUUID());
  const now = new Date().toISOString();
  return db.runTransaction(async transaction => {
    const stored = await transaction.get(ref); const previous = publicAdminRecord(target.id, stored.exists ? stored.data() : undefined);
    if (previous.version !== body.expectedVersion || previous.revision >= Number.MAX_SAFE_INTEGER) throw new InventoryError('INVENTORY_CONFLICT', 409);
    const data = { ...inventory, revision: previous.revision + 1, updatedAt: now, updatedBy: input.actorUid };
    transaction.set(ref, data, { merge: true });
    transaction.set(audit, { targetId: target.id, kind: target.kind, unit: target.unit, previousMode: previous.mode, previousAvailable: previous.available,
      mode: data.mode, available: data.available, revision: data.revision, reason, actorUid: input.actorUid, updatedAt: now });
    return publicAdminRecord(target.id, data);
  });
}
export function createInventoryRouter(options: { getDb: () => Firestore | null; requireAdmin: RequestHandler }) {
  const router = Router();
  const fail = (error: unknown, response: import('express').Response) => response.status(error instanceof InventoryError ? error.httpStatus : 503).json({ code: error instanceof InventoryError ? error.code : 'INVENTORY_UNAVAILABLE' });
  router.get('/api/admin/inventory/:id', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    try {
      const target = inventoryTarget(request.params.id); const db = options.getDb(); if (!db) throw new InventoryError('INVENTORY_UNAVAILABLE', 503);
      const snapshot = await db.collection(INVENTORY_COLLECTION).doc(target.id).get();
      return response.json({ record: publicAdminRecord(target.id, snapshot.exists ? snapshot.data() : undefined) });
    } catch (error) { return fail(error, response); }
  });
  router.post('/api/admin/inventory/:id', options.requireAdmin, async (request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    try {
      const actor = (request as typeof request & { user?: { uid?: string } }).user;
      return response.json({ record: await updateInventory({ db: options.getDb(), id: request.params.id, actorUid: actor?.uid || '', body: request.body }) });
    } catch (error) { return fail(error, response); }
  });
  return router;
}
