import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { hasAdminClaim } from '../src/lib/adminOperations';
import { updateAdminProduct } from '../src/lib/catalogStore';
import { applyBundleCopy20261116, BUNDLE_COPY_20261116 } from '../src/data/bundleCopy20261116';

// Owner decision 16 Nov 2026: new descriptive names and claim-free copy for the 9 older bundles.
// Content fields only. Never touches price, prices, variants, commerce, stock, status or active.
// Default is a read-only plan. Writing needs --execute, an explicit target, --confirm-project
// and a current admin uid, and goes through the admin update service (revision + audit).
const CONTENT_FIELDS = [
  'name_en', 'name_ur', 'name_ar', 'desc_en', 'desc_ur', 'desc_ar',
  'health_en', 'health_ur', 'health_ar', 'tasteProfile_en', 'tasteProfile_ur', 'tasteProfile_ar',
  'tag_en', 'tag_ur', 'tag_ar', 'contents_en', 'contents_ur', 'contents_ar', 'components', 'keywords',
] as const;

export function plannedContent(current: Record<string, any>) {
  const next = applyBundleCopy20261116({ ...current, id: String(current.id) }) as Record<string, any>;
  const changes: Record<string, unknown> = {};
  for (const field of CONTENT_FIELDS) {
    if (next[field] === undefined) continue;
    if (JSON.stringify(next[field]) !== JSON.stringify(current[field])) changes[field] = next[field];
  }
  return changes;
}

export async function applyBundleCopy(options: { db: Firestore | null; actorUid?: string; execute?: boolean }) {
  if (options.execute && (!options.db || !options.actorUid)) throw new Error('BUNDLE_COPY_AUTHORITY_REQUIRED');
  const items: Array<{ id: string; action: string; fields: string[] }> = [];
  for (const id of Object.keys(BUNDLE_COPY_20261116)) {
    if (!options.db) { items.push({ id, action: 'PLAN_UNVERIFIED', fields: [] }); continue; }
    const snap = await options.db.collection('products').doc(id).get();
    if (!snap.exists) { items.push({ id, action: 'SKIP_NOT_LIVE', fields: [] }); continue; }
    const current = { ...snap.data(), id } as Record<string, any>;
    const changes = plannedContent(current);
    const fields = Object.keys(changes);
    if (!fields.length) { items.push({ id, action: 'ALREADY_CURRENT', fields }); continue; }
    if (!options.execute) { items.push({ id, action: 'WOULD_UPDATE', fields }); continue; }
    const revision = Number.isSafeInteger(current.revision) ? current.revision : (current.adminRevision || 0);
    await updateAdminProduct({ db: options.db, productId: id, body: { ...changes, expectedRevision: revision }, actorUid: options.actorUid! });
    items.push({ id, action: 'UPDATED', fields });
  }
  return { change: 'bundle-copy-20261116', mode: options.execute ? 'EXECUTE_CONTENT_ONLY' : options.db ? 'READ_ONLY_PLAN' : 'OFFLINE_PLAN_UNVERIFIED', items };
}

async function main() {
  const args = process.argv.slice(2);
  const value = (name: string) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const execute = args.includes('--execute');
  if (execute && args.includes('--dry-run')) throw new Error('CHOOSE_DRY_RUN_OR_EXECUTE');
  const projectId = value('project');
  const databaseId = value('database');
  if (!projectId) { console.log(JSON.stringify(await applyBundleCopy({ db: null }), null, 2)); return; }
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
  console.log(JSON.stringify(await applyBundleCopy({ db, actorUid, execute }), null, 2));
}

if (process.argv[1] && /apply-bundle-copy-20261116/.test(process.argv[1])) {
  main().catch(() => { console.error('BUNDLE_COPY_FAILED: verify explicit target, current admin authority and private credentials; prices and stock are never touched.'); process.exitCode = 1; });
}
