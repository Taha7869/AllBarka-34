/**
 * AllBarka Catalog V2 Safe Migration Script
 *
 * Requirements (REQ-S2-007):
 * - Dry-run default: Must explicitly pass `--execute` to apply mutations.
 * - Idempotency: Re-running leaves existing admin modifications intact.
 * - Non-destructive: Never deletes records or overwrites merchant-customized prices.
 * - Rollback: Prints explicit rollback instructions and audit record.
 *
 * Usage:
 *   npx tsx scripts/migrate-catalog-v2.ts [--dry-run] [--execute] [--db=<databaseId>]
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../src/data/products';
import { DEFAULT_MERCHANDISING, MERCHANDISING_COLLECTION, CATALOG_COLLECTION } from '../src/lib/catalogStore';
import type { Product, ProductStatus, OrderMode } from '../src/types';

interface MigrationPlanItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'SKIP';
  reason: string;
  changes?: Record<string, unknown>;
}

function resolveTargetTaxonomy(product: Product): {
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

async function runMigration() {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const isDryRun = !isExecute;
  const dbArg = args.find(a => a.startsWith('--db='))?.split('=')[1];

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'allbarka-production';
  const databaseId = dbArg || process.env.FIRESTORE_DATABASE_ID || '(default)';

  console.log('===========================================================');
  console.log('       ALLBARKA CATALOG V2 SAFE MIGRATION PRE-FLIGHT       ');
  console.log('===========================================================');
  console.log(`Mode:            ${isDryRun ? '🔍 DRY RUN (Simulate only, no writes)' : '🚀 LIVE EXECUTION (--execute)'}`);
  console.log(`Target Project:  ${projectId}`);
  console.log(`Target Database: ${databaseId}`);
  console.log(`Total Seeds:     ${PRODUCTS.length} compiled products`);
  console.log('-----------------------------------------------------------\n');

  const hasCredentials = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
    process.env.FIRESTORE_EMULATOR_HOST
  );

  let existingDocs = new Map<string, any>();
  let merchExists = false;
  let db: Firestore | null = null;

  if (!hasCredentials) {
    if (isExecute) {
      console.error('❌ Cannot execute live migration without active Firestore credentials.');
      console.error('   Please provide FIREBASE_SERVICE_ACCOUNT_KEY or set FIRESTORE_EMULATOR_HOST.');
      process.exit(1);
    }
    console.log('⚠️  No live Firebase credentials or FIRESTORE_EMULATOR_HOST detected.');
    console.log('   Simulating offline dry run (97 compiled seed products -> V2 canonical model).\n');
  } else {
    try {
      if (!getApps().length) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          initializeApp({ credential: cert(serviceAccount), projectId });
        } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
          initializeApp({
            credential: cert({
              projectId,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
            projectId,
          });
        } else {
          initializeApp({ projectId });
        }
      }
      db = databaseId && databaseId !== '(default)'
        ? getFirestore(getApps()[0], databaseId)
        : getFirestore(getApps()[0]);
      db.settings({ ignoreUndefinedProperties: true });

      console.log('Scanning existing Firestore catalog...');
      const existingDocsSnap = await db.collection(CATALOG_COLLECTION).get();
      existingDocs = new Map(existingDocsSnap.docs.map(d => [d.id, d.data()]));
      console.log(`Found ${existingDocs.size} existing documents in Firestore '${CATALOG_COLLECTION}'.\n`);

      const merchRef = db.collection(MERCHANDISING_COLLECTION).doc('settings');
      const merchSnap = await merchRef.get();
      merchExists = merchSnap.exists;
    } catch (err: any) {
      if (isDryRun) {
        console.warn(`⚠️  Could not connect to live Firestore (${err.message || 'Error'}).`);
        console.warn('   Simulating dry-run with 0 existing documents (clean-slate preview).\n');
      } else {
        console.error('❌ Cannot execute live migration without active Firestore connection:');
        console.error(err.message || err);
        process.exit(1);
      }
    }
  }

  const plan: MigrationPlanItem[] = [];

  for (const seed of PRODUCTS) {
    const existing = existingDocs.get(seed.id);
    const target = resolveTargetTaxonomy(seed);

    if (!existing) {
      // Missing from Firestore - initialize with canonical taxonomy
      plan.push({
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
      // Document already exists in Firestore.
      // Check if already migrated to V2 taxonomy
      const needsFamily = !existing.productFamily;
      const needsCollections = !existing.collections;
      const needsOccasions = !existing.occasions;
      const needsStatus = !existing.status;
      const needsOrderMode = !existing.orderMode;

      if (!needsFamily && !needsCollections && !needsOccasions && !needsStatus && !needsOrderMode) {
        plan.push({
          id: seed.id,
          action: 'SKIP',
          reason: 'Already has complete V2 data model fields. Preserving all merchant modifications.',
        });
      } else {
        // Apply missing taxonomy fields without touching prices or existing merchant customizations
        const changes: Record<string, unknown> = {};
        if (needsFamily) changes.productFamily = target.productFamily;
        if (needsCollections) changes.collections = target.collections;
        if (needsOccasions) changes.occasions = target.occasions;
        if (needsStatus) changes.status = existing.active === false ? 'archived' : target.status;
        if (needsOrderMode) changes.orderMode = target.orderMode;
        if (existing.revision === undefined) changes.revision = 1;
        changes.updatedAt = new Date().toISOString();
        changes.migrationBatch = 'v2-backfill';

        plan.push({
          id: seed.id,
          action: 'UPDATE',
          reason: 'Backfilling missing V2 canonical fields. Existing merchant prices and descriptions are strictly preserved.',
          changes,
        });
      }
    }
  }

  let merchAction: 'CREATE' | 'SKIP' = merchExists ? 'SKIP' : 'CREATE';

  // Print Summary
  const creates = plan.filter(p => p.action === 'CREATE');
  const updates = plan.filter(p => p.action === 'UPDATE');
  const skips = plan.filter(p => p.action === 'SKIP');

  console.log('-----------------------------------------------------------');
  console.log('                  MIGRATION PLAN SUMMARY                   ');
  console.log('-----------------------------------------------------------');
  console.log(`CREATE:  ${creates.length} items`);
  console.log(`UPDATE:  ${updates.length} items`);
  console.log(`SKIP:    ${skips.length} items`);
  console.log(`MERCH:   ${merchAction === 'CREATE' ? 'CREATE merchandising/settings' : 'SKIP (settings already exist)'}`);
  console.log('-----------------------------------------------------------\n');

  if (isDryRun) {
    console.log('📋 Sample Planned Mutations (Dry Run):');
    for (const item of [...creates.slice(0, 3), ...updates.slice(0, 3)]) {
      console.log(`  [${item.action}] Product: ${item.id} -> ${item.reason}`);
      console.log(`     Changes: ${JSON.stringify(item.changes)}`);
    }
    console.log('\n🔒 DRY RUN FINISHED. Zero writes performed.');
    console.log('👉 To apply mutations safely, execute:');
    console.log(`   npx tsx scripts/migrate-catalog-v2.ts --execute --db=${databaseId}\n`);
    return;
  }

  // Execution Phase
  console.log('🚀 Executing planned mutations in batches...');
  let executedCount = 0;

  for (const item of plan) {
    if (item.action === 'SKIP' || !item.changes) continue;
    const ref = db.collection(CATALOG_COLLECTION).doc(item.id);
    await ref.set(item.changes, { merge: true });
    executedCount++;
  }

  const merchRef = db.collection(MERCHANDISING_COLLECTION).doc('settings');
  if (merchAction === 'CREATE') {
    await merchRef.set(DEFAULT_MERCHANDISING, { merge: true });
    console.log('✅ Created default merchandising/settings document.');
  }

  // Record Migration Audit in catalogAudits
  await db.collection('catalogAudits').add({
    action: 'MIGRATION_V2_EXECUTED',
    executedCount,
    createsCount: creates.length,
    updatesCount: updates.length,
    timestamp: new Date().toISOString(),
    operator: process.env.USER || process.env.USERNAME || 'automated_migration',
  });

  console.log(`\n🎉 Migration successfully completed! ${executedCount} documents updated.`);
  console.log('\n===========================================================');
  console.log('                     ROLLBACK INSTRUCTIONS                 ');
  console.log('===========================================================');
  console.log('Every mutation merged fields under migrationBatch: v2-initial / v2-backfill.');
  console.log('To roll back if necessary:');
  console.log('1. Query documents where migrationBatch is set.');
  console.log('2. Remove fields: productFamily, collections, occasions, migrationBatch.');
  console.log('3. No existing merchant price records were deleted or overwritten.');
  console.log('===========================================================\n');
}

runMigration().catch(err => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
