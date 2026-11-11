import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { hasAdminClaim } from '../src/lib/adminOperations';
import { importIntake20261110 } from '../src/lib/catalogIntake20261110';

// No dotenv auto-load, no implicit project, no price reset and no publish step.
const args = process.argv.slice(2);
const execute = args.includes('--execute');
const readOnly = args.includes('--read-only');
const value = (name: string) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
async function main() {
  if (execute && readOnly) throw new Error('CHOOSE_READ_ONLY_OR_EXECUTE');
  if (!execute && !readOnly) {
    console.log(JSON.stringify(await importIntake20261110({ db: null }), null, 2));
    return;
  }
  const projectId = value('project');
  const databaseId = value('database');
  if (!projectId || !databaseId) throw new Error('EXPLICIT_PROJECT_AND_DATABASE_REQUIRED');
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
  console.log(JSON.stringify(await importIntake20261110({ db, actorUid, execute }), null, 2));
}
main().catch(() => { console.error('CATALOG_INTAKE_FAILED: verify explicit target, current admin authority and private credentials; no existing products are overwritten.'); process.exitCode = 1; });
