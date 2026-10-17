/**
 * AllBarka Catalog V2 Safe Migration Engine
 *
 * SPECIFICATION & GOVERNANCE:
 * - Requirements: REQ-S2-007
 * - Authority: AllBarka_Antigravity_Master_Prompt (1).md (Version 2.0)
 *
 * GUARANTEES:
 * 1. Dry-run default: Planning function produces zero writes to the database.
 * 2. Non-destructive: Never overwrites customized merchant prices, titles, or deletes records.
 * 3. Strict idempotency: Second execution against migrated data performs 0 updates (100% SKIP).
 * 4. Durable journal: Persists execution progress and before-images in Firestore collection
 *    `catalogMigrationJournals` for process restart recovery and deterministic rollback.
 * 5. Precondition protection: Detects document changes between planning and execution.
 * 6. Subsequent merchant edit safety: Rollback detects later merchant edits and refuses to overwrite
 *    or delete them silently.
 */

import { randomUUID, createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../data/products';
import { CATALOG_COLLECTION, MERCHANDISING_COLLECTION, DEFAULT_MERCHANDISING } from './catalogStore';
import type { Product, ProductStatus, OrderMode } from '../types';

export const MIGRATION_JOURNALS_COLLECTION = 'catalogMigrationJournals';

/**
 * Computes a deterministic SHA-256 fingerprint of a Firestore document object,
 * canonically sorting all keys recursively to reliably detect direct content modifications.
 */
export function computeDocumentFingerprint(data: any): string {
  if (!data || typeof data !== 'object') return '';
  const canonicalize = (val: any): any => {
    if (val === null || val === undefined) return null;
    if (Array.isArray(val)) return val.map(canonicalize);
    if (typeof val === 'object') {
      const keys = Object.keys(val).sort();
      const obj: Record<string, any> = {};
      for (const k of keys) {
        obj[k] = canonicalize(val[k]);
      }
      return obj;
    }
    return val;
  };
  return createHash('sha256').update(JSON.stringify(canonicalize(data))).digest('hex');
}

export interface MigrationPlanItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'SKIP';
  reason: string;
  changes?: Record<string, unknown>;
  plannedRevision?: number;
  plannedUpdatedAt?: string;
}

export interface CatalogMigrationV2Plan {
  items: MigrationPlanItem[];
  createsCount: number;
  updatesCount: number;
  skipsCount: number;
  merchAction: 'CREATE' | 'SKIP';
}

export interface CatalogMigrationV2ExecutionResult {
  batchId: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  executedCount: number;
  createsCount: number;
  updatesCount: number;
  skipsCount: number;
  conflictsCount: number;
  beforeImages: Map<string, any | null>;
  journalPath: string;
  conflicts: string[];
}

export interface CatalogMigrationV2RollbackResult {
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'NOOP';
  restoredCount: number;
  deletedCount: number;
  skippedCount: number;
  conflicts: string[];
}

/**
 * Resolves target taxonomy with strict precedence:
 * Bid box packaging MUST be evaluated BEFORE general gift-boxes,
 * mapping exact occasion tags to the specific box identity.
 */
export function resolveTargetTaxonomy(product: Product): {
  productFamily: string;
  collections: string[];
  occasions: string[];
  orderMode: OrderMode;
  status: ProductStatus;
} {
  let productFamily = product.id.split('-')[0] || product.id;
  const collections: string[] = [];
  const occasions: string[] = [];
  const orderMode: OrderMode = product.quoteOnly ? 'inquiry_quote' : 'both';
  const status: ProductStatus = product.active === false ? 'archived' : 'published';

  // 1. Bid Box Packaging Precedence (Must be evaluated BEFORE general gift-boxes!)
  if (product.isBidBox || product.id.startsWith('bid-box')) {
    productFamily = 'bid-box';
    collections.push('celebration-boxes');
    if (product.id.includes('umrah') || product.id.includes('hajj') || product.id.includes('tabarruk')) {
      occasions.push('umrah', 'ramadan');
    } else if (product.id.includes('nikkah') || product.id.includes('baat-pakki') || product.id.includes('card')) {
      occasions.push('wedding');
    } else if (product.id.includes('birth') || product.id.includes('baby')) {
      occasions.push('baby-announcement', 'birth');
    } else if (product.id.includes('tin') || product.id.includes('luxury-tin')) {
      occasions.push('wedding', 'eid');
    } else if (product.id.includes('pyramid')) {
      occasions.push('wedding', 'party');
    } else if (product.id.includes('acrylic')) {
      occasions.push('wedding', 'vip');
    } else if (product.id.includes('jute') || product.id.includes('potli')) {
      occasions.push('wedding', 'giveaways');
    } else {
      occasions.push('wedding');
    }
  } else if (product.category === 'gift-boxes') {
    collections.push('combos');
    productFamily = 'gift-box';
    occasions.push('wedding', 'corporate');
  } else if (product.category === 'bundles') {
    collections.push('deals');
    productFamily = 'bundle';
  } else if (product.category === 'dates' || ['khajoor', 'aseel-dates', 'chohara'].includes(product.id)) {
    productFamily = 'khajoor';
    occasions.push('ramadan', 'umrah');
  }

  return { productFamily, collections, occasions, orderMode, status };
}

/**
 * Plans the catalog migration non-destructively without performing any database mutations.
 */
export async function planCatalogMigrationV2(input: {
  db: Firestore | any;
  products?: Array<Product | any>;
}): Promise<CatalogMigrationV2Plan> {
  const db = input.db;
  const seeds = input.products || PRODUCTS;

  const existingDocsSnap = await db.collection(CATALOG_COLLECTION).get();
  const existingDocs = new Map<string, any>(
    existingDocsSnap.docs.map((d: any) => [d.id, d.data()])
  );

  const merchRef = db.collection(MERCHANDISING_COLLECTION).doc('settings');
  const merchSnap = await merchRef.get();
  const merchExists = merchSnap.exists;

  const items: MigrationPlanItem[] = [];

  for (const seed of seeds) {
    const existing = existingDocs.get(seed.id);
    const target = resolveTargetTaxonomy(seed);

    if (!existing) {
      items.push({
        id: seed.id,
        action: 'CREATE',
        reason: 'Product document absent from Firestore. Initialize with canonical data model.',
        changes: {
          id: seed.id,
          name_en: seed.name_en,
          category: seed.category,
          prices: seed.prices,
          active: target.status === 'published',
          status: target.status,
          orderMode: target.orderMode,
          productFamily: target.productFamily,
          collections: target.collections,
          occasions: target.occasions,
          revision: 1,
          adminRevision: 1,
          updatedAt: new Date().toISOString(),
          migrationBatch: 'v2-initial',
        },
      });
    } else {
      const needsFamily = !existing.productFamily;
      const needsCollections = !existing.collections;
      const needsOccasions = !existing.occasions;
      const needsStatus = !existing.status;
      const needsOrderMode = !existing.orderMode;

      const plannedRevision = Number.isSafeInteger(existing.revision) ? existing.revision : (existing.adminRevision || 0);
      const plannedUpdatedAt = existing.updatedAt || undefined;

      if (!needsFamily && !needsCollections && !needsOccasions && !needsStatus && !needsOrderMode) {
        items.push({
          id: seed.id,
          action: 'SKIP',
          reason: 'Already has complete V2 data model fields. Preserving all merchant modifications.',
          plannedRevision,
          plannedUpdatedAt,
        });
      } else {
        const changes: Record<string, unknown> = {};
        if (needsFamily) changes.productFamily = target.productFamily;
        if (needsCollections) changes.collections = target.collections;
        if (needsOccasions) changes.occasions = target.occasions;
        if (needsStatus) changes.status = existing.active === false ? 'archived' : target.status;
        if (needsOrderMode) changes.orderMode = target.orderMode;
        const nextRev = plannedRevision + 1;
        changes.revision = nextRev;
        changes.adminRevision = nextRev;
        changes.updatedAt = new Date().toISOString();
        changes.migrationBatch = 'v2-backfill';

        items.push({
          id: seed.id,
          action: 'UPDATE',
          reason: 'Backfilling missing V2 canonical fields. Existing merchant prices and descriptions are strictly preserved.',
          changes,
          plannedRevision,
          plannedUpdatedAt,
        });
      }
    }
  }

  const createsCount = items.filter(i => i.action === 'CREATE').length;
  const updatesCount = items.filter(i => i.action === 'UPDATE').length;
  const skipsCount = items.filter(i => i.action === 'SKIP').length;
  const merchAction = merchExists ? 'SKIP' : 'CREATE';

  return {
    items,
    createsCount,
    updatesCount,
    skipsCount,
    merchAction,
  };
}

/**
 * Executes a planned catalog migration, writes progress to a durable Firestore journal,
 * checks preconditions to prevent stale writes, and records before-images for deterministic rollback.
 */
export async function executeCatalogMigrationV2(input: {
  db: Firestore | any;
  plan: CatalogMigrationV2Plan;
  operatorUid?: string;
  batchId?: string;
  maxItems?: number; // Allows partial execution simulation
  failAfterItems?: number; // Allows crash recovery simulation
}): Promise<CatalogMigrationV2ExecutionResult> {
  const db = input.db;
  const { plan, operatorUid, maxItems, failAfterItems } = input;
  const batchId = input.batchId || `migration_v2_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const journalRef = db.collection(MIGRATION_JOURNALS_COLLECTION).doc(batchId);
  const now = new Date().toISOString();

  const beforeImages = new Map<string, any | null>();
  const journalBeforeImages: Record<string, any> = {};
  const journalPostRevisions: Record<string, number> = {};
  const journalPostFingerprints: Record<string, string> = {};
  const executedItemIds: string[] = [];
  const conflicts: string[] = [];

  let executedCount = 0;
  let createsCount = 0;
  let updatesCount = 0;
  let skipsCount = 0;
  let conflictsCount = 0;

  // Initialize durable migration journal
  await journalRef.set({
    batchId,
    status: 'EXECUTING',
    operatorUid: operatorUid || 'automated_migration',
    startedAt: now,
    planSummary: {
      createsCount: plan.createsCount,
      updatesCount: plan.updatesCount,
      skipsCount: plan.skipsCount,
      merchAction: plan.merchAction,
    },
    executedItemIds: [],
    beforeImages: {},
    postRevisions: {},
    postFingerprints: {},
    conflicts: [],
  });

  for (const item of plan.items) {
    if (item.action === 'SKIP' || !item.changes) {
      skipsCount++;
      continue;
    }

    if (maxItems !== undefined && executedCount >= maxItems) {
      break;
    }

    const docRef = db.collection(CATALOG_COLLECTION).doc(item.id);

    // Precondition and mutation inside transaction.
    // Pure callback: do not mutate external state inside executeItem to ensure retry safety.
    // STRICT ORDERING: All transaction reads must be executed before ANY transaction writes!
    const executeItem = async (transaction: any) => {
      // 1. ALL TRANSACTION READS EXECUTED FIRST
      const snap = await transaction.get(docRef);
      const journalSnap = await transaction.get(journalRef);

      const exists = snap.exists;
      const currentData = exists ? snap.data() : null;

      if (item.action === 'CREATE' && exists) {
        return {
          conflict: `CONFLICT_CREATE_ALREADY_EXISTS: ${item.id} now exists in Firestore`,
        };
      }

      if (item.action === 'UPDATE') {
        if (!exists) {
          return {
            conflict: `CONFLICT_UPDATE_MISSING: ${item.id} was deleted since planning`,
          };
        }
        if (item.plannedRevision !== undefined) {
          const currentRev = Number.isSafeInteger(currentData.revision) ? currentData.revision : (currentData.adminRevision || 0);
          if (currentRev !== item.plannedRevision) {
            return {
              conflict: `CONFLICT_STALE_PLAN: ${item.id} modified since planning (rev ${currentRev} != planned ${item.plannedRevision})`,
            };
          }
        }
      }

      const postRev = item.action === 'CREATE'
        ? 1
        : ((Number.isSafeInteger(currentData?.revision) ? currentData.revision : (currentData?.adminRevision || 0)) + 1);

      const mergedChanges = {
        ...item.changes,
        revision: postRev,
        adminRevision: postRev,
        migrationBatch: batchId,
      };

      const finalData = item.action === 'CREATE'
        ? mergedChanges
        : { ...currentData, ...mergedChanges };

      const fingerprint = computeDocumentFingerprint(finalData);

      // 2. ALL TRANSACTION WRITES EXECUTED AFTER ALL READS
      // 2a. Mutate product document
      transaction.set(docRef, mergedChanges, { merge: true });

      // 2b. Atomically persist recovery record in the migration journal inside the SAME transaction
      const currentJournal = journalSnap.exists ? journalSnap.data() : {};
      const updatedBeforeImages = { ...(currentJournal.beforeImages || {}), [item.id]: currentData };
      const updatedPostRevisions = { ...(currentJournal.postRevisions || {}), [item.id]: postRev };
      const updatedPostFingerprints = { ...(currentJournal.postFingerprints || {}), [item.id]: fingerprint };
      const updatedExecutedIds = [...(currentJournal.executedItemIds || []), item.id];

      transaction.set(journalRef, {
        ...currentJournal,
        beforeImages: updatedBeforeImages,
        postRevisions: updatedPostRevisions,
        postFingerprints: updatedPostFingerprints,
        executedItemIds: updatedExecutedIds,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return {
        committed: true,
        action: item.action,
        itemId: item.id,
        beforeData: currentData,
        postRev,
        fingerprint,
      };
    };

    let itemOutcome: any;
    if (typeof db.runTransaction === 'function') {
      itemOutcome = await db.runTransaction(executeItem);
    } else {
      const snap = await docRef.get();
      const jSnap = await journalRef.get();
      itemOutcome = await executeItem({
        get: async (ref: any) => ref.path === docRef.path ? snap : jSnap,
        set: (ref: any, data: any, opts: any) => ref.set(data, opts),
      });
    }

    // Accounting performed strictly outside the retryable transaction callback
    if (itemOutcome?.conflict) {
      conflicts.push(itemOutcome.conflict);
      conflictsCount++;
    } else if (itemOutcome?.committed) {
      beforeImages.set(item.id, itemOutcome.beforeData);
      journalBeforeImages[item.id] = itemOutcome.beforeData;
      journalPostRevisions[item.id] = itemOutcome.postRev;
      journalPostFingerprints[item.id] = itemOutcome.fingerprint;
      executedItemIds.push(item.id);

      if (itemOutcome.action === 'CREATE') createsCount++;
      if (itemOutcome.action === 'UPDATE') updatesCount++;
      executedCount++;

      if (failAfterItems !== undefined && executedCount >= failAfterItems) {
        throw new Error(`CRASH_SIMULATION: Process crashed after committing ${executedCount} items (batch ${batchId})`);
      }
    }
  }

  // Merchandising initialization protected against concurrent creation
  if (plan.merchAction === 'CREATE' && (maxItems === undefined || executedCount < maxItems)) {
    const merchRef = db.collection(MERCHANDISING_COLLECTION).doc('settings');

    // STRICT ORDERING: All reads before any writes
    const executeMerch = async (transaction: any) => {
      // 1. ALL READS FIRST
      const snap = await transaction.get(merchRef);
      const journalSnap = await transaction.get(journalRef);

      if (snap.exists) {
        return { concurrentExists: true };
      }

      const finalMerchRev = Number.isSafeInteger(DEFAULT_MERCHANDISING.revision) ? DEFAULT_MERCHANDISING.revision : 1;
      const finalMerch = { ...DEFAULT_MERCHANDISING, revision: finalMerchRev, migrationBatch: batchId };
      const fingerprint = computeDocumentFingerprint(finalMerch);

      // 2. ALL WRITES AFTER ALL READS
      transaction.set(merchRef, finalMerch, { merge: true });

      const currentJournal = journalSnap.exists ? journalSnap.data() : {};
      const updatedBeforeImages = { ...(currentJournal.beforeImages || {}), 'merchandising/settings': null };
      const updatedPostRevisions = { ...(currentJournal.postRevisions || {}), 'merchandising/settings': finalMerchRev };
      const updatedPostFingerprints = { ...(currentJournal.postFingerprints || {}), 'merchandising/settings': fingerprint };
      const updatedExecutedIds = [...(currentJournal.executedItemIds || []), 'merchandising/settings'];

      transaction.set(journalRef, {
        ...currentJournal,
        beforeImages: updatedBeforeImages,
        postRevisions: updatedPostRevisions,
        postFingerprints: updatedPostFingerprints,
        executedItemIds: updatedExecutedIds,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return { committed: true, fingerprint };
    };

    let merchOutcome: any;
    if (typeof db.runTransaction === 'function') {
      merchOutcome = await db.runTransaction(executeMerch);
    } else {
      const snap = await merchRef.get();
      const jSnap = await journalRef.get();
      merchOutcome = await executeMerch({
        get: async (ref: any) => ref.path === merchRef.path ? snap : jSnap,
        set: (ref: any, data: any, opts: any) => ref.set(data, opts),
      });
    }

    if (merchOutcome?.committed) {
      const finalMerchRev = Number.isSafeInteger(DEFAULT_MERCHANDISING.revision) ? DEFAULT_MERCHANDISING.revision : 1;
      beforeImages.set('merchandising/settings', null);
      journalBeforeImages['merchandising/settings'] = null;
      journalPostRevisions['merchandising/settings'] = finalMerchRev;
      journalPostFingerprints['merchandising/settings'] = merchOutcome.fingerprint;
      executedItemIds.push('merchandising/settings');
    }
  }

  const isPartial = maxItems !== undefined && executedCount < (plan.createsCount + plan.updatesCount);
  const finalStatus = isPartial ? 'PARTIAL' : (conflictsCount > 0 ? 'PARTIAL' : 'COMPLETED');
  const completedAt = new Date().toISOString();

  // Finalize durable migration journal
  await journalRef.set({
    batchId,
    status: finalStatus,
    operatorUid: operatorUid || 'automated_migration',
    startedAt: now,
    completedAt,
    executedCount,
    createsCount,
    updatesCount,
    skipsCount,
    conflictsCount,
    executedItemIds,
    beforeImages: journalBeforeImages,
    postRevisions: journalPostRevisions,
    postFingerprints: journalPostFingerprints,
    conflicts,
  }, { merge: true });

  if (executedCount > 0 || plan.merchAction === 'CREATE') {
    await db.collection('catalogAudits').add({
      action: 'MIGRATION_V2_EXECUTED',
      batchId,
      status: finalStatus,
      executedCount,
      createsCount,
      updatesCount,
      timestamp: completedAt,
      operator: operatorUid || 'automated_migration',
    });
  }

  return {
    batchId,
    status: finalStatus,
    executedCount,
    createsCount,
    updatesCount,
    skipsCount,
    conflictsCount,
    beforeImages,
    journalPath: `${MIGRATION_JOURNALS_COLLECTION}/${batchId}`,
    conflicts,
  };
}

/**
 * Reverts mutations using the durable journal or provided before-images.
 * Strictly protects subsequent merchant edits: if a document was modified by a merchant
 * after this migration batch, rollback refuses to overwrite or delete it silently.
 */
export async function rollbackCatalogMigrationV2(input: {
  db: Firestore | any;
  batchId?: string;
  beforeImages?: Map<string, any | null>;
  operatorUid?: string;
}): Promise<CatalogMigrationV2RollbackResult> {
  const db = input.db;
  let beforeImages = input.beforeImages;
  let batchId = input.batchId;
  let postRevisions: Record<string, number> = {};
  let postFingerprints: Record<string, string> = {};

  // Support process restart by retrieving durable journal from Firestore
  if (batchId) {
    const journalSnap = await db.collection(MIGRATION_JOURNALS_COLLECTION).doc(batchId).get();
    if (journalSnap.exists) {
      const journalData = journalSnap.data();
      if ((!beforeImages || beforeImages.size === 0) && journalData.beforeImages) {
        beforeImages = new Map<string, any | null>(Object.entries(journalData.beforeImages));
      }
      if (journalData.postRevisions) {
        postRevisions = { ...journalData.postRevisions };
      }
      if (journalData.postFingerprints) {
        postFingerprints = { ...journalData.postFingerprints };
      }
    }
  }

  if (!beforeImages || beforeImages.size === 0) {
    return { status: 'NOOP', restoredCount: 0, deletedCount: 0, skippedCount: 0, conflicts: ['NO_BEFORE_IMAGES_FOUND'] };
  }

  let restoredCount = 0;
  let deletedCount = 0;
  let skippedCount = 0;
  const conflicts: string[] = [];

  for (const [key, beforeData] of beforeImages.entries()) {
    let docRef: any;
    if (key === 'merchandising/settings') {
      docRef = db.collection(MERCHANDISING_COLLECTION).doc('settings');
    } else {
      docRef = db.collection(CATALOG_COLLECTION).doc(key);
    }

    // STRICT ORDERING: All reads before any writes
    const executeRollbackItem = async (transaction: any) => {
      // 1. ALL READS FIRST
      const currentSnap = await transaction.get(docRef);
      if (!currentSnap.exists) {
        return { skipped: true, reason: 'NOT_FOUND' };
      }
      const current = currentSnap.data() || {};
      const currentRev = Number.isSafeInteger(current.revision) ? current.revision : (current.adminRevision || 0);
      const expectedPostRev = postRevisions[key];
      const expectedFingerprint = postFingerprints[key];

      // 1. Require recovery metadata when rolling back a batch
      if (batchId && (expectedPostRev === undefined || !expectedFingerprint)) {
        return {
          conflict: `PROTECTED_CONFLICT_MISSING_METADATA: Refusing to revert ${key} because post-migration recovery metadata is missing in journal ${batchId}`,
        };
      }

      // 2. Exact batch ownership check: missing OR mismatched migration marker produces protected conflict
      if (batchId) {
        if (!current.migrationBatch) {
          return {
            conflict: `PROTECTED_MERCHANT_EDIT: Refusing to revert ${key} because migrationBatch marker is missing (expected '${batchId}')`,
          };
        }
        if (current.migrationBatch !== batchId) {
          return {
            conflict: `PROTECTED_MERCHANT_EDIT: Refusing to revert ${key} because migrationBatch '${current.migrationBatch}' != batchId '${batchId}'`,
          };
        }
      }

      // 3. Exact revision check
      const targetRev = beforeData === null
        ? (expectedPostRev ?? 1)
        : (expectedPostRev ?? ((Number.isSafeInteger(beforeData.revision) ? beforeData.revision : (beforeData.adminRevision || 0)) + 1));

      if (currentRev !== targetRev) {
        return {
          conflict: `PROTECTED_MERCHANT_EDIT: Refusing to revert ${key} because revision (${currentRev}) does not match post-migration revision (${targetRev})`,
        };
      }

      // 4. Exact post-state fingerprint check: reliably detects direct Firestore content edits with same revision
      if (expectedFingerprint) {
        const currentFingerprint = computeDocumentFingerprint(current);
        if (currentFingerprint !== expectedFingerprint) {
          return {
            conflict: `PROTECTED_MERCHANT_EDIT: Refusing to revert ${key} because document content was modified since migration (fingerprint mismatch)`,
          };
        }
      }

      // 2. ALL WRITES AFTER ALL READS
      if (beforeData === null) {
        transaction.delete(docRef);
        return { deleted: true };
      } else {
        transaction.set(docRef, beforeData);
        return { restored: true };
      }
    };

    let itemResult: any;
    if (typeof db.runTransaction === 'function') {
      itemResult = await db.runTransaction(executeRollbackItem);
    } else {
      const snap = await docRef.get();
      itemResult = await executeRollbackItem({
        get: async () => snap,
        set: (ref: any, data: any) => ref.set(data),
        delete: (ref: any) => ref.delete(),
      });
    }

    if (itemResult?.conflict) {
      conflicts.push(itemResult.conflict);
      skippedCount++;
    } else if (itemResult?.restored) {
      restoredCount++;
    } else if (itemResult?.deleted) {
      deletedCount++;
    } else if (itemResult?.skipped) {
      skippedCount++;
    }
  }

  let status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'NOOP' = 'COMPLETED';
  if (conflicts.length > 0) {
    status = (restoredCount > 0 || deletedCount > 0) ? 'PARTIAL' : 'FAILED';
  } else if (restoredCount === 0 && deletedCount === 0 && skippedCount === 0) {
    status = 'NOOP';
  } else {
    status = 'COMPLETED';
  }

  if (batchId) {
    await db.collection(MIGRATION_JOURNALS_COLLECTION).doc(batchId).set({
      status: status === 'COMPLETED' ? 'ROLLED_BACK' : (status === 'PARTIAL' ? 'PARTIAL_ROLLBACK' : 'ROLLBACK_FAILED'),
      rollbackStatus: status,
      rolledBackAt: new Date().toISOString(),
      restoredCount,
      deletedCount,
      skippedCount,
      rollbackConflicts: conflicts,
      rollbackOperator: input.operatorUid || 'automated_migration',
    }, { merge: true });
  }

  return {
    status,
    restoredCount,
    deletedCount,
    skippedCount,
    conflicts,
  };
}
