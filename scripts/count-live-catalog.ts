import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { countLiveCatalog } from '../src/lib/liveCatalogCount';

// Read-only: lists and counts documents in `products`. Never writes. Needs explicit project and database.
const value = (name: string) => process.argv.slice(2).find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
async function main() {
  const projectId = value('project'); const databaseId = value('database');
  if (!projectId || !databaseId) throw new Error('EXPLICIT_PROJECT_AND_DATABASE_REQUIRED');
  const credential = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
    ? cert({ projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(), privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') })
    : applicationDefault();
  const db = getFirestore(initializeApp({ projectId, credential }), databaseId);
  console.log(JSON.stringify(await countLiveCatalog(db), null, 2));
}
main().catch(() => { console.error('LIVE_COUNT_FAILED: pass --project and --database and use read-only admin credentials.'); process.exit(1); });
