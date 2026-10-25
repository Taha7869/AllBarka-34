import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectOrderOutbox } from '../src/services/orderOutboxWorker';

export function parseOrderOutboxReportArgs(args: string[]): { limit: number; help: boolean } {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return { limit: 100, help: true };
  let raw = '100';
  if (args.length === 1 && args[0].startsWith('--limit=')) raw = args[0].slice('--limit='.length);
  else if (args.length === 2 && args[0] === '--limit') raw = args[1];
  else if (args.length) throw new Error('INVALID_REPORT_ARGUMENTS');
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 1000) throw new Error('INVALID_REPORT_LIMIT');
  return { limit: Number(raw), help: false };
}

/** Aggregate output deliberately contains no customer fields, credentials, raw errors or order references. */
export function summarizeOrderOutboxReport(report: Awaited<ReturnType<typeof inspectOrderOutbox>>, sampleLimit: number) {
  const reviewReasonCounts: Record<string, number> = {};
  for (const event of report.review) {
    const reason = /^[A-Z][A-Z0-9_]{0,79}$/.test(event.reason) ? event.reason : 'REVIEW_REQUIRED';
    reviewReasonCounts[reason] = (reviewReasonCounts[reason] || 0) + 1;
  }
  return {
    mode: 'REPORT_ONLY',
    scope: 'BOUNDED_SAMPLE_OF_ORDER_CREATED_EVENTS',
    sampleLimit,
    scannedEvents: report.scanned,
    sampleMayBeIncomplete: report.bounded,
    sampledStateCounts: report.counts,
    sampledReviewReasonCounts: reviewReasonCounts,
    dispatchesPerformed: 0,
    mutationsPerformed: 0,
    historicalDisabledEventsReplayed: 0,
    policy: 'Disabled and failed historical events require an explicit reviewed migration. This command never reactivates them.',
  };
}

export async function runOrderOutboxReport(args: string[] = process.argv.slice(2)): Promise<number> {
  let settings: ReturnType<typeof parseOrderOutboxReportArgs>;
  try { settings = parseOrderOutboxReportArgs(args); }
  catch {
    console.error('OUTBOX_REPORT_INVALID_ARGUMENTS: Use --limit 1 through 1000 (default 100), or --help.');
    return 1;
  }
  if (settings.help) {
    console.log('Usage: npm run outbox:report -- --limit 100\nRead-only bounded sample of canonical ORDER_CREATED events. No dispatch, writes or historical replay.\nRequires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY; optional FIRESTORE_DATABASE_ID.');
    return 0;
  }

  // Host environment wins; do not echo loaded values or fall back to public web credentials.
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!projectId || !clientEmail || !privateKey) {
    console.error('OUTBOX_REPORT_MISSING_ADMIN_CREDENTIALS: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required. No database connection or dispatch attempted.');
    return 1;
  }
  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    console.error('OUTBOX_REPORT_EMULATOR_REFUSED: Unset FIRESTORE_EMULATOR_HOST to report the actual host database. No connection or dispatch attempted.');
    return 1;
  }

  let app: ReturnType<typeof initializeApp> | undefined;
  let database: ReturnType<typeof getFirestore> | undefined;
  try {
    app = initializeApp({ projectId, credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }) }, `allbarka-outbox-report-${process.pid}`);
    const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
    database = databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);
    const report = await inspectOrderOutbox(database, settings.limit);
    console.log(JSON.stringify(summarizeOrderOutboxReport(report, settings.limit), null, 2));
    return 0;
  } catch {
    // SDK errors can contain credential text or endpoint metadata. Keep operator output fixed and safe.
    console.error('OUTBOX_REPORT_FAILED: Could not read the bounded sample. Verify Admin credentials, database selection, connectivity and read permissions. No dispatch or mutation attempted.');
    return 1;
  } finally {
    if (database) await database.terminate().catch(() => undefined);
    if (app) await deleteApp(app).catch(() => undefined);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runOrderOutboxReport();
}
