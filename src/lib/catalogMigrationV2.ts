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
 * 4. Deterministic rollback: Recorded before-images enable complete rollback to pre-migration state.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../data/products';
import { CATALOG_COLLECTION, MERCHANDISING_COLLECTION, DEFAULT_MERCHANDISING } from './catalogStore';
import type { Product, ProductStatus, OrderMode } from '../types';

export interface MigrationPlanItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'SKIP';
  reason: string;
  changes?: Record<string, unknown>;
}

export interface CatalogMigrationV2Plan {
  items: MigrationPlanItem[];
  createsCount: number;
  updatesCount: number;
  skipsCount: number;
  merchAction: 'CREATE' | 'SKIP';
}

export interface CatalogMigrationV2ExecutionResult {
  executedCount: number;
  createsCount: number;
  updatesCount: number;
  beforeImages: Map<string, any | null>;
}

export interface CatalogMigrationV2RollbackResult {
  restoredCount: number;
  deletedCount: number;
}

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

  if (product.category === 'gift-boxes') {
    collections.push('combos');
    productFamily = 'gift-box';
    occasions.push('wedding', 'corporate');
  } else if (product.category === 'bundles') {
    collections.push('deals');
    productFamily = 'bundle';
  } else if (product.category === 'dates' || ['khajoor', 'aseel-dates', 'chohara'].includes(product.id)) {
    productFamily = 'khajoor';
    occasions.push('ramadan', 'umrah');
  } else if (product.isBidBox) {
    collections.push('celebration-boxes');
    occasions.push('wedding', 'umrah', 'birth');
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

      if (!needsFamily && !needsCollections && !needsOccasions && !needsStatus && !needsOrderMode) {
        items.push({
          id: seed.id,
          action: 'SKIP',
          reason: 'Already has complete V2 data model fields. Preserving all merchant modifications.',
        });
      } else {
        const changes: Record<string, unknown> = {};
        if (needsFamily) changes.productFamily = target.productFamily;
        if (needsCollections) changes.collections = target.collections;
        if (needsOccasions) changes.occasions = target.occasions;
        if (needsStatus) changes.status = existing.active === false ? 'archived' : target.status;
        if (needsOrderMode) changes.orderMode = target.orderMode;
        if (existing.revision === undefined) changes.revision = 1;
        changes.updatedAt = new Date().toISOString();
        changes.migrationBatch = 'v2-backfill';

        items.push({
          id: seed.id,
          action: 'UPDATE',
          reason: 'Backfilling missing V2 canonical fields. Existing merchant prices and descriptions are strictly preserved.',
          changes,
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
 * Executes a planned catalog migration and records before-images for deterministic rollback.
 */
export async function executeCatalogMigrationV2(input: {
  db: Firestore | any;
  plan: CatalogMigrationV2Plan;
  operatorUid?: string;
}): Promise<CatalogMigrationV2ExecutionResult> {
  const db = input.db;
  const { plan, operatorUid } = input;
  const beforeImages = new Map<string, any | null>();

  let executedCount = 0;

  for (const item of plan.items) {
    if (item.action === 'SKIP' || !item.changes) continue;

    const docRef = db.collection(CATALOG_COLLECTION).doc(item.id);
    const snap = await docRef.get();
    beforeImages.set(item.id, snap.exists ? snap.data() : null);

    await docRef.set(item.changes, { merge: true });
    executedCount++;
  }

  if (plan.merchAction === 'CREATE') {
    const merchRef = db.collection(MERCHANDISING_COLLECTION).doc('settings');
    const snap = await merchRef.get();
    beforeImages.set('merchandising/settings', snap.exists ? snap.data() : null);

    await merchRef.set(DEFAULT_MERCHANDISING, { merge: true });
  }

  if (executedCount > 0 || plan.merchAction === 'CREATE') {
    await db.collection('catalogAudits').add({
      action: 'MIGRATION_V2_EXECUTED',
      executedCount,
      createsCount: plan.createsCount,
      updatesCount: plan.updatesCount,
      timestamp: new Date().toISOString(),
      operator: operatorUid || 'automated_migration',
    });
  }

  return {
    executedCount,
    createsCount: plan.createsCount,
    updatesCount: plan.updatesCount,
    beforeImages,
  };
}

/**
 * Reverts mutations using the before-images captured during execution.
 */
export async function rollbackCatalogMigrationV2(input: {
  db: Firestore | any;
  beforeImages: Map<string, any | null>;
}): Promise<CatalogMigrationV2RollbackResult> {
  const db = input.db;
  const { beforeImages } = input;

  let restoredCount = 0;
  let deletedCount = 0;

  for (const [key, beforeData] of beforeImages.entries()) {
    let docRef: any;
    if (key === 'merchandising/settings') {
      docRef = db.collection(MERCHANDISING_COLLECTION).doc('settings');
    } else {
      docRef = db.collection(CATALOG_COLLECTION).doc(key);
    }

    if (beforeData === null) {
      await docRef.delete();
      deletedCount++;
    } else {
      await docRef.set(beforeData);
      restoredCount++;
    }
  }

  return {
    restoredCount,
    deletedCount,
  };
}
