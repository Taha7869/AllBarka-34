import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { hasAdminClaim } from '../src/lib/adminOperations';
import { publishAdminProduct, updateAdminProduct } from '../src/lib/catalogStore';
import { BID_BOX_PRODUCTS } from '../src/data/products';

// Owner decision 16 Nov 2026: publish the 8 bid boxes with their seed rates, keep the quote
// option, and show the "prices are a guide, team confirms after the order" notice (in code).
// Create-only: a bid box already in Firestore is reported and never overwritten.
// Default is a read-only plan; writing needs --execute, an explicit target, --confirm-project
// and a current admin uid, and goes through the admin update + publish services.
export async function publishBidBoxes(options: { db: Firestore | null; actorUid?: string; execute?: boolean }) {
  if (options.execute && (!options.db || !options.actorUid)) throw new Error('BID_BOX_AUTHORITY_REQUIRED');
  const items: Array<{ id: string; action: string; priced: number }> = [];
  for (const seed of BID_BOX_PRODUCTS) {
    const priced = Object.keys(seed.prices || {}).length;
    if (!options.db) { items.push({ id: seed.id, action: 'PLAN_UNVERIFIED', priced }); continue; }
    const snap = await options.db.collection('products').doc(seed.id).get();
    if (snap.exists) { items.push({ id: seed.id, action: `SKIP_EXISTS_${String(snap.data()?.status || 'unknown').toUpperCase()}`, priced }); continue; }
    if (!options.execute) { items.push({ id: seed.id, action: 'WOULD_PUBLISH', priced }); continue; }
    const seedRevision = Number.isSafeInteger((seed as any).revision) ? (seed as any).revision : 0;
    const saved = await updateAdminProduct({ db: options.db, productId: seed.id, body: { expectedRevision: seedRevision }, actorUid: options.actorUid! });
    await publishAdminProduct({ db: options.db, productId: seed.id, expectedRevision: saved.revision, actorUid: options.actorUid! });
    items.push({ id: seed.id, action: 'PUBLISHED', priced });
  }
  return { change: 'bid-boxes-20261116', mode: options.execute ? 'EXECUTE_CREATE_AND_PUBLISH' : options.db ? 'READ_ONLY_PLAN' : 'OFFLINE_PLAN_UNVERIFIED', items };
}

async function main() {
  const args = process.argv.slice(2);
  const value = (name: string) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const execute = args.includes('--execute');
  if (execute && args.includes('--dry-run')) throw new Error('CHOOSE_DRY_RUN_OR_EXECUTE');
  const projectId = value('project');
  const databaseId = value('database');
  if (!projectId) { console.log(JSON.stringify(await publishBidBoxes({ db: null }), null, 2)); return; }
  if (!databaseId) throw new Error('EXPLICIT_PROJECT_AND_DATABASE_REQUIRED');
  if (execute && value('confirm-project') !== projectId) throw new Error('TARGET_PROJECT_CONFIRMATION_REQUIRED');
  const credential = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
    ? cert({ projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(), privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') })
    : applicationDefault();
  const app = initializeApp({ projectId, credential });
  const db = getFirestore(app, databaseId);
  const actorUid = value('actor-uid');
  if (execute) {
    if (!actorUid) throw new Error('CURRENT_ADMIN_UID_REQUIRED');
    const account = await getAuth(app).getUser(actorUid);
    if (account.disabled || !hasAdminClaim(account.customClaims)) throw new Error('CURRENT_ADMIN_AUTHORITY_REQUIRED');
  }
  console.log(JSON.stringify(await publishBidBoxes({ db, actorUid, execute }), null, 2));
}

if (process.argv[1] && /publish-bid-boxes-20261116/.test(process.argv[1])) {
  main().catch(() => { console.error('BID_BOX_PUBLISH_FAILED: verify explicit target, current admin authority and private credentials; existing products are never overwritten.'); process.exitCode = 1; });
}
