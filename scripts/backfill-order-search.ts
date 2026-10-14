import dotenv from 'dotenv';
import { cert, initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { backfillOrderSearch } from '../src/lib/orderSearchBackfill';

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: npm run orders:backfill-search -- [--execute] [--max-pages 10] [--after-id ORDER_ID]\nDefault: read-only, at most 2000 orders. --execute updates only searchPrefixes/searchVersion. Resume with the returned afterId.');
    return;
  }
  let execute = false, maxPages = 10, afterId: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--execute') execute = true;
    else if (args[i] === '--max-pages' && /^\d{1,4}$/.test(args[i + 1] || '')) maxPages = Number(args[++i]);
    else if (args[i] === '--after-id' && /^[A-Za-z0-9_-]{5,100}$/.test(args[i + 1] || '')) afterId = args[++i];
    else throw new Error('INVALID_BACKFILL_ARGUMENTS');
  }
  if (maxPages < 1 || maxPages > 1000) throw new Error('INVALID_BACKFILL_LIMIT');
  dotenv.config({ quiet: true });
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (!projectId || (!emulator && (!clientEmail || !privateKey))) throw new Error('BACKFILL_CREDENTIALS_REQUIRED');
  const app = initializeApp({ projectId, ...(emulator ? {} : { credential: cert({ projectId, clientEmail: clientEmail!, privateKey: privateKey!.replace(/\\n/g, '\n') }) }) }, `allbarka-order-search-${process.pid}`);
  const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || '(default)');
  try { console.log(JSON.stringify(await backfillOrderSearch(db, { execute, maxPages, afterId }), null, 2)); }
  finally { await db.terminate(); await deleteApp(app); }
}
main().catch(() => { console.error('Order search backfill failed. Check arguments, database selection, credentials and connectivity.'); process.exitCode = 1; });
