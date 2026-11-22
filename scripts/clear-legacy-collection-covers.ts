import fs from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { MerchandisingSettings, PublishedCollectionEntry } from '../src/types';
import { getSectionCover } from '../src/config/sectionCovers';
import {
  getAdminMerchandisingBundle,
  updateAdminMerchandising,
  publishAdminMerchandising,
  MERCHANDISING_COLLECTION,
} from '../src/lib/catalogStore';

export interface LegacyCollectionCoverMatch {
  collectionId: string;
  currentImage: string;
  studioCoverFallback: string;
}

export interface ClearLegacyCoversPlan {
  affected: LegacyCollectionCoverMatch[];
  unchangedCount: number;
  cleanedCollections: PublishedCollectionEntry[];
}

export function isLegacyCollectionCoverImage(collectionId: string, image?: string | null): boolean {
  const trimmed = typeof image === 'string' ? image.trim() : '';
  if (!trimmed) return false;
  if (trimmed.startsWith('/images/section-covers-20261120/')) return false;
  return Boolean(getSectionCover(collectionId));
}

export function planClearLegacyCollectionCovers(settings: MerchandisingSettings): ClearLegacyCoversPlan {
  const collections = Array.isArray(settings.collections) ? settings.collections : [];
  const affected: LegacyCollectionCoverMatch[] = [];
  let unchangedCount = 0;

  const cleanedCollections: PublishedCollectionEntry[] = collections.map(col => {
    if (isLegacyCollectionCoverImage(col.collectionId, col.image)) {
      const studio = getSectionCover(col.collectionId)!;
      affected.push({
        collectionId: col.collectionId,
        currentImage: String(col.image).trim(),
        studioCoverFallback: studio.src,
      });
      const next = { ...col };
      delete next.image;
      return next;
    }
    unchangedCount++;
    return { ...col };
  });

  return { affected, unchangedCount, cleanedCollections };
}

export async function runClearLegacyCollectionCovers(options: {
  db: Firestore | null;
  execute: boolean;
  actorUid?: string;
}) {
  if (!options.db) throw new Error('FIRESTORE_UNAVAILABLE');
  // Probe both docs directly first so Firestore quota/permission errors fail loudly
  // instead of silently falling back to DEFAULT_MERCHANDISING inside getAdminMerchandising.
  const [previewSnap, liveSnap] = await Promise.all([
    options.db.collection(MERCHANDISING_COLLECTION).doc('preview').get(),
    options.db.collection(MERCHANDISING_COLLECTION).doc('settings').get(),
  ]);
  const bundle = await getAdminMerchandisingBundle(options.db);
  const draftPlan = planClearLegacyCollectionCovers(bundle.draft);
  const livePlan = planClearLegacyCollectionCovers(bundle.live);

  const report = {
    mode: options.execute ? 'EXECUTE' : 'DRY_RUN',
    previewDocExists: previewSnap.exists,
    liveDocExists: liveSnap.exists,
    draftRevision: bundle.draftRevision,
    liveRevision: bundle.liveRevision,
    draftCollectionsTotal: bundle.draft.collections.length,
    liveCollectionsTotal: bundle.live.collections.length,
    draftLegacyImages: draftPlan.affected,
    liveLegacyImages: livePlan.affected,
    mutated: false,
    newDraftRevision: bundle.draftRevision,
    newLiveRevision: bundle.liveRevision,
  };

  if (!options.execute) return report;

  if (!options.actorUid) throw new Error('ACTOR_UID_REQUIRED');
  if (draftPlan.affected.length === 0 && livePlan.affected.length === 0) {
    return report;
  }

  // Always mutate through official audited admin services (save draft -> publish live).
  const updatedDraft = await updateAdminMerchandising({
    db: options.db,
    actorUid: options.actorUid,
    body: {
      ...bundle.draft,
      collections: draftPlan.cleanedCollections,
      expectedRevision: bundle.draftRevision,
    },
  });

  const published = await publishAdminMerchandising({
    db: options.db,
    actorUid: options.actorUid,
    expectedDraftRevision: updatedDraft.revision,
    expectedLiveRevision: bundle.liveRevision,
  });

  return {
    ...report,
    mutated: true,
    newDraftRevision: published.draftRevision,
    newLiveRevision: published.liveRevision,
  };
}

function loadLocalEnv() {
  if (!fs.existsSync('.env')) return;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');
  if (dryRun && execute) throw new Error('CANNOT_COMBINE_DRY_RUN_AND_EXECUTE');
  if (!dryRun && !execute) throw new Error('SPECIFY_DRY_RUN_OR_EXECUTE');

  const argVal = (prefix: string) => args.find(a => a.startsWith(`${prefix}=`))?.slice(prefix.length + 1);
  const project = argVal('--project') || argVal('--confirm-project') || 'allbarka-live';
  const databaseId = argVal('--database') || '(default)';
  const actorUid = argVal('--actor-uid') || process.env.ADMIN_UID;

  if (execute) {
    if (argVal('--confirm-project') !== 'allbarka-live') throw new Error('CONFIRM_PROJECT_REQUIRED');
    if (!actorUid) throw new Error('ACTOR_UID_REQUIRED');
  }

  loadLocalEnv();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) throw new Error('FIREBASE_ADMIN_CREDENTIALS_MISSING');

  const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: project, clientEmail, privateKey }), projectId: project });
  const db = databaseId === '(default)' ? getFirestore(app) : getFirestore(app, databaseId);
  db.settings({ ignoreUndefinedProperties: true });

  const result = await runClearLegacyCollectionCovers({ db, execute, actorUid });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('clear-legacy-collection-covers.ts'))) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
