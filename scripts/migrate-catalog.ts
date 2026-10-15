import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'node:path';
import { planCatalogMigration } from '../src/lib/catalogMigration';
import { PRODUCTS } from '../src/data/products';
import { storedCatalogRecord } from '../src/lib/catalogStore';

// Default mode reads only. Existing legacy records are adopted without changing live business values.
const args = process.argv.slice(2);
const mode = args.length === 0 || args.join(' ') === '--dry-run' ? 'DRY_RUN'
  : args.join(' ') === '--create-missing' ? 'CREATE_MISSING' : args.join(' ') === '--adopt-legacy' ? 'ADOPT_LEGACY' : null;
if (!mode) { console.error('Usage: node --import tsx scripts/migrate-catalog.ts [--dry-run | --create-missing | --adopt-legacy]'); process.exitCode = 1; }
else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim(), clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim(), key = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !key) { console.error('CATALOG_MIGRATION_MISSING_ADMIN_CREDENTIALS'); process.exitCode = 1; }
  else {
    const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key.replace(/\\n/g, '\n') }), projectId }, `catalog-migration-${process.pid}`);
    const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID?.trim() || '(default)');
    try {
      const documents = await db.getAll(...PRODUCTS.map(product => db.collection('products').doc(product.id)));
      const plan = planCatalogMigration(documents.filter(document => document.exists).map(document => ({ id: document.id, data: document.data() })));
      console.log(JSON.stringify({ mode, products: plan.length, actions: plan.map(({ productId, action, differsFromSource }) => ({ productId, action, differsFromSource })), writes: mode === 'DRY_RUN' ? 0 : 'ONLY_EXPLICIT_SELECTED_ACTION' }, null, 2));
      if (plan.some(item => item.action === 'REQUIRES_OWNER_REVIEW')) { console.error('CATALOG_REQUIRES_OWNER_REVIEW: no migration writes performed.'); process.exitCode = 1; }
      else if (mode === 'CREATE_MISSING') {
        let created = 0;
        for (const item of plan.filter(item => item.action === 'CREATE_MISSING')) {
          // create() has an exists=false precondition; a concurrent merchant write always wins.
          await db.collection('products').doc(item.productId).create({ ...item.pricing, updatedAt: new Date().toISOString() }); created++;
        }
        console.log(JSON.stringify({ created, existingProductsOverwritten: 0 }));
      } else if (mode === 'ADOPT_LEGACY') {
        let adopted = 0;
        for (const item of plan.filter(item => item.action === 'ADOPT_LIVE_LEGACY')) {
          await db.runTransaction(async transaction => {
            const ref = db.collection('products').doc(item.productId), snapshot = await transaction.get(ref);
            const current = storedCatalogRecord(item.productId, snapshot.data());
            if ((snapshot.data() as any).schemaVersion === 1) return;
            if (JSON.stringify(current.pricing) !== JSON.stringify(item.pricing)) throw new Error('CATALOG_CHANGED_SINCE_PLAN');
            const updatedAt = new Date().toISOString();
            transaction.set(ref, { ...current.pricing, prices: FieldValue.delete(), price: FieldValue.delete(), updatedBy: FieldValue.delete(), updatedAt }, { merge: true });
            transaction.set(db.collection('catalogAudits').doc(), { productId: item.productId, action: 'LEGACY_ADOPTED', previous: current.pricing, pricing: current.pricing, previousVersion: current.version, actorUid: 'migration', updatedAt });
          }); adopted++;
        }
        console.log(JSON.stringify({ adopted, livePricesChanged: 0, existingProductsOverwritten: 0 }));
      }
    } catch { console.error('CATALOG_MIGRATION_FAILED: verify connectivity and permissions; no raw provider error or credentials printed. Re-run dry-run to reconcile any completed per-product transactions.'); process.exitCode = 1; }
    finally { await db.terminate().catch(() => {}); await deleteApp(app).catch(() => {}); }
  }
}
