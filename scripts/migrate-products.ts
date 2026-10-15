import 'dotenv/config';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../src/data/products';
import { HAMPER_BOXES } from '../src/lib/hamperCatalog';
import { catalogSeedPlan } from '../src/lib/catalogSeed';

async function run() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--execute', '--offline'].includes(arg)) || args.includes('--execute') && args.includes('--offline')) {
    throw new Error('Use --offline for an offline preview, no flag for a read-only database plan, or --execute for create-only seeding.');
  }
  const execute = args.includes('--execute');
  let products = new Map<string, unknown>();
  let boxes = new Map<string, unknown>();
  let db: ReturnType<typeof getFirestore> | null = null;
  if (!args.includes('--offline')) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const emulator = process.env.FIRESTORE_EMULATOR_HOST;
    if (!projectId || (!emulator && (!clientEmail || !privateKey))) throw new Error('Explicit Firebase project and server credentials are required; use --offline to preview without database access.');
    if (!getApps().length) initializeApp({ projectId, ...(emulator ? {} : { credential: cert({ projectId, clientEmail: clientEmail!, privateKey: privateKey! }) }) });
    const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    db = getFirestore(getApp(), databaseId);
    console.log(`Target: ${projectId} / ${databaseId}. Mode: ${execute ? 'create missing records only' : 'read-only plan'}.`);
    const references = [...PRODUCTS.map(product => db!.collection('products').doc(product.id)), ...HAMPER_BOXES.map(box => db!.collection('catalogBoxes').doc(box.id))];
    const snapshots = await db.getAll(...references);
    products = new Map(snapshots.slice(0, PRODUCTS.length).filter(document => document.exists).map(document => [document.id, document.data()]));
    boxes = new Map(snapshots.slice(PRODUCTS.length).filter(document => document.exists).map(document => [document.id, document.data()]));
  }
  const plan = catalogSeedPlan(products, boxes);
  console.log(JSON.stringify({ createCount: plan.create.length, preserveCount: plan.preserve.length,
    invalidExistingRecords: plan.invalid, create: plan.create.map(entry => entry.path), preserve: plan.preserve }, null, 2));
  if (plan.invalid.length) throw new Error('Existing invalid pricing needs owner correction. Nothing was written. Existing prices are never overwritten by this migration.');
  if (!execute) { console.log('Preview complete. No database writes were made.'); return; }
  if (!db) throw new Error('Database target is required.');
  if (!plan.create.length) { console.log('All pricing records already exist; nothing was changed.'); return; }
  const batch = db.batch();
  const updatedAt = new Date().toISOString();
  for (const entry of plan.create) batch.create(db.doc(entry.path), { ...entry.pricing, updatedAt, updatedBy: 'catalog-seed' });
  // create() fails the entire batch if another editor creates any planned record meanwhile.
  await batch.commit();
  console.log(`Created ${plan.create.length} missing records. Existing records were preserved.`);
}
run().catch(() => { console.error('Catalogue seed could not complete. Check configuration, existing pricing validation and the reviewed target; no credentials are logged.'); process.exitCode = 1; });
