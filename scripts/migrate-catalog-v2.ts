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
import {
  planCatalogMigrationV2,
  executeCatalogMigrationV2,
  type CatalogMigrationV2Plan
} from '../src/lib/catalogMigrationV2';

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

  // Fallback mock store for offline dry-run if no db is connected
  const effectiveDb: any = db || {
    collection: (_name: string) => ({
      get: async () => ({ docs: [] }),
      doc: (_id: string) => ({
        get: async () => ({ exists: false, data: () => undefined }),
      }),
    }),
  };

  const plan: CatalogMigrationV2Plan = await planCatalogMigrationV2({
    db: effectiveDb,
    products: PRODUCTS,
  });

  // Print Summary
  const creates = plan.items.filter(p => p.action === 'CREATE');
  const updates = plan.items.filter(p => p.action === 'UPDATE');
  const skips = plan.items.filter(p => p.action === 'SKIP');

  console.log('-----------------------------------------------------------');
  console.log('                  MIGRATION PLAN SUMMARY                   ');
  console.log('-----------------------------------------------------------');
  console.log(`CREATE:  ${creates.length} items`);
  console.log(`UPDATE:  ${updates.length} items`);
  console.log(`SKIP:    ${skips.length} items`);
  console.log(`MERCH:   ${plan.merchAction === 'CREATE' ? 'CREATE merchandising/settings' : 'SKIP (settings already exist)'}`);
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

  if (!db) {
    console.error('❌ Cannot execute live migration without active Firestore connection.');
    process.exit(1);
  }

  // Execution Phase
  console.log('🚀 Executing planned mutations in batches...');
  const operator = process.env.USER || process.env.USERNAME || 'automated_migration';
  const execResult = await executeCatalogMigrationV2({
    db,
    plan,
    operatorUid: operator,
  });

  console.log(`\n🎉 Migration successfully completed! ${execResult.executedCount} documents updated.`);
  console.log(`Durable Migration Journal: ${execResult.journalPath}`);
  console.log('\n===========================================================');
  console.log('                     ROLLBACK INSTRUCTIONS                 ');
  console.log('===========================================================');
  console.log(`Migration Batch ID: ${execResult.batchId}`);
  console.log('To roll back safely with durable state and merchant-edit protection, run:');
  console.log(`  rollbackCatalogMigrationV2({ db, batchId: '${execResult.batchId}' })`);
  console.log('Subsequent merchant edits will be automatically detected and protected.');
  console.log('===========================================================\n');
}

runMigration().catch(err => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
