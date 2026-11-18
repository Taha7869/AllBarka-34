import fs from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../src/data/products';
import { intakeProducts20261110 } from '../src/lib/catalogIntake20261110';
import { intakeProducts20261113 } from '../src/lib/catalogIntake20261113';
import { intakeProducts20261114 } from '../src/lib/catalogIntake20261114';
import { intakeProducts20261115 } from '../src/lib/catalogIntake20261115';
import { publishAdminProduct, updateAdminProduct } from '../src/lib/catalogStore';
import { isProductPubliclyVisible } from '../src/lib/catalogSchema';

export interface DraftReadinessItem {
  id: string;
  batch: string;
  name_en: string;
  category: string;
  isBundle: boolean;
  image: string;
  priceSummary: string;
  priceIndicative: boolean;
  ready: boolean;
  skipReason?: string;
}

export function evaluateDraftsReadiness(
  customDrafts?: Array<{ batch: string; product: Record<string, any> }>,
  options?: {
    excludeIds?: Set<string> | string[];
  }
): DraftReadinessItem[] {
  const excludeSet = new Set(options?.excludeIds ? Array.from(options.excludeIds) : []);
  const allDrafts: Array<{ batch: string; product: Record<string, any> }> = customDrafts ?? [
    ...intakeProducts20261110().map(product => ({ batch: '20261110', product: product as Record<string, any> })),
    ...intakeProducts20261113().map(product => ({ batch: '20261113', product: product as Record<string, any> })),
    ...intakeProducts20261114().map(product => ({ batch: '20261114', product: product as Record<string, any> })),
    ...intakeProducts20261115().map(product => ({ batch: '20261115', product: product as Record<string, any> })),
  ];

  const liveSeedIds = new Set(PRODUCTS.map(p => p.id));
  const validSingleIds = new Set<string>();
  const readySingleIds = new Set<string>();
  const singleResults: DraftReadinessItem[] = [];

  // Pass 1: evaluate single items (tasveer + qeemat + copy mukammal)
  for (const { batch, product } of allDrafts) {
    if (product.isBundle) continue;
    const id = String(product.id);
    const image = String(product.image || '');
    const hasImage = Boolean(image && !image.includes('placeholder') && fs.existsSync(`public${image}`));
    const basePrice = Number(product.commerce?.basePrice || 0);
    const hasPrice = Number.isSafeInteger(basePrice) && basePrice > 0 && product.quoteOnly !== true;
    const hasCopy = ['en', 'ur', 'ar'].every(
      lang =>
        String(product[`name_${lang}`] || '').trim().length > 1 &&
        String(product[`desc_${lang}`] || '').trim().length > 20 &&
        String(product[`recipe_${lang}`] || '').trim().length > 20 &&
        String(product[`sourcingDetails_${lang}`] || '').trim().length > 20 &&
        String(product[`storageTips_${lang}`] || '').trim().length > 20 &&
        String(product[`packagingDetails_${lang}`] || '').trim().length > 20 &&
        String(product[`allergenWarning_${lang}`] || '').trim().length > 15
    );

    if (hasImage && hasPrice && hasCopy) {
      validSingleIds.add(id);
    }

    let skipReason: string | undefined;
    if (excludeSet.has(id)) {
      skipReason = 'HOLD_IMAGE_OR_ORIGIN_REVIEW';
    } else if (!hasImage) {
      skipReason = 'MISSING_REAL_PRODUCT_IMAGE';
    } else if (!hasPrice) {
      skipReason = 'MISSING_VALID_PRICE';
    } else if (!hasCopy) {
      skipReason = 'INCOMPLETE_TRILINGUAL_COPY';
    }

    const ready = !skipReason;
    if (ready) readySingleIds.add(id);

    singleResults.push({
      id,
      batch,
      name_en: String(product.name_en),
      category: String(product.category),
      isBundle: false,
      image,
      priceSummary: `${basePrice} PKR / ${product.commerce?.baseQuantity}${product.commerce?.baseUnit}`,
      priceIndicative: Boolean(product.priceIndicative),
      ready,
      ...(skipReason ? { skipReason } : {}),
    });
  }

  // Pass 2: evaluate bundles (after knowing which single items are valid and ready)
  const bundleResults: DraftReadinessItem[] = [];
  for (const { batch, product } of allDrafts) {
    if (!product.isBundle) continue;
    const id = String(product.id);
    const image = String(product.image || '');
    const hasImage = Boolean(image && !image.includes('placeholder') && fs.existsSync(`public${image}`));
    const bundlePrice = Number(product.prices?.Bundle || 0);
    const hasPrice = Number.isSafeInteger(bundlePrice) && bundlePrice > 0 && product.quoteOnly !== true;
    const hasCopy = ['en', 'ur', 'ar'].every(
      lang =>
        String(product[`name_${lang}`] || '').trim().length > 1 &&
        String(product[`desc_${lang}`] || '').trim().length > 40 &&
        String(product[`recipe_${lang}`] || '').trim().length > 20 &&
        String(product[`sourcingDetails_${lang}`] || '').trim().length > 20 &&
        String(product[`storageTips_${lang}`] || '').trim().length > 20 &&
        String(product[`packagingDetails_${lang}`] || '').trim().length > 20 &&
        String(product[`allergenWarning_${lang}`] || '').trim().length > 15
    );
    const componentIds: string[] = Array.isArray(product.componentIds) ? product.componentIds : [];
    const blockedComponents = componentIds.filter(cid => !liveSeedIds.has(cid) && !validSingleIds.has(cid));

    let skipReason: string | undefined;
    if (excludeSet.has(id)) {
      skipReason = 'HOLD_IMAGE_OR_ORIGIN_REVIEW';
    } else if (blockedComponents.length > 0) {
      skipReason = `HOLD_COMPONENT_NOT_PUBLISHED:${blockedComponents.join(',')}`;
    } else if (!hasImage) {
      skipReason = 'MISSING_REAL_PRODUCT_IMAGE';
    } else if (!hasPrice) {
      skipReason = 'MISSING_VALID_PRICE';
    } else if (!hasCopy) {
      skipReason = 'INCOMPLETE_TRILINGUAL_COPY';
    }

    bundleResults.push({
      id,
      batch,
      name_en: String(product.name_en),
      category: String(product.category),
      isBundle: true,
      image,
      priceSummary: `${bundlePrice} PKR (Bundle)`,
      priceIndicative: Boolean(product.priceIndicative),
      ready: !skipReason,
      ...(skipReason ? { skipReason } : {}),
    });
  }

  return [...singleResults, ...bundleResults];
}

export async function runPublishReadyDrafts20261118(options: {
  db: Firestore | null;
  actorUid?: string;
  execute?: boolean;
  excludeIds?: Set<string> | string[];
}) {
  if (options.execute && (!options.db || !options.actorUid)) {
    throw new Error('PUBLISH_AUTHORITY_REQUIRED');
  }

  const allDraftMap = new Map<string, Record<string, any>>();
  for (const p of [
    ...intakeProducts20261110(),
    ...intakeProducts20261113(),
    ...intakeProducts20261114(),
    ...intakeProducts20261115(),
  ]) {
    allDraftMap.set(String(p.id), p as Record<string, any>);
  }

  const readiness = evaluateDraftsReadiness(undefined, { excludeIds: options.excludeIds });
  const items: Array<{
    id: string;
    batch: string;
    name_en: string;
    isBundle: boolean;
    image: string;
    priceSummary: string;
    action:
      | 'WOULD_UPDATE_AND_PUBLISH'
      | 'UPDATED_AND_PUBLISHED'
      | 'SKIP_ALREADY_PUBLISHED'
      | 'SKIP_NOT_READY'
      | 'MISSING_IN_FIRESTORE';
    reason?: string;
    revision?: number;
  }> = [];

  for (const entry of readiness) {
    if (!entry.ready) {
      items.push({
        id: entry.id,
        batch: entry.batch,
        name_en: entry.name_en,
        isBundle: entry.isBundle,
        image: entry.image,
        priceSummary: entry.priceSummary,
        action: 'SKIP_NOT_READY',
        reason: entry.skipReason,
      });
      continue;
    }

    if (!options.db) {
      items.push({
        id: entry.id,
        batch: entry.batch,
        name_en: entry.name_en,
        isBundle: entry.isBundle,
        image: entry.image,
        priceSummary: entry.priceSummary,
        action: 'WOULD_UPDATE_AND_PUBLISH',
      });
      continue;
    }

    const snap = await options.db.collection('products').doc(entry.id).get();
    if (!snap.exists) {
      items.push({
        id: entry.id,
        batch: entry.batch,
        name_en: entry.name_en,
        isBundle: entry.isBundle,
        image: entry.image,
        priceSummary: entry.priceSummary,
        action: 'MISSING_IN_FIRESTORE',
      });
      continue;
    }

    const current = snap.data() as Record<string, any>;
    const currentRevision = Number.isSafeInteger(current.revision) ? current.revision : (current.adminRevision || 0);

    if (
      current.status === 'published' &&
      current.active === true &&
      current.image === entry.image &&
      current.priceIndicative === true &&
      isProductPubliclyVisible(current as any)
    ) {
      items.push({
        id: entry.id,
        batch: entry.batch,
        name_en: entry.name_en,
        isBundle: entry.isBundle,
        image: entry.image,
        priceSummary: entry.priceSummary,
        action: 'SKIP_ALREADY_PUBLISHED',
        revision: currentRevision,
      });
      continue;
    }

    if (!options.execute) {
      items.push({
        id: entry.id,
        batch: entry.batch,
        name_en: entry.name_en,
        isBundle: entry.isBundle,
        image: entry.image,
        priceSummary: entry.priceSummary,
        action: 'WOULD_UPDATE_AND_PUBLISH',
        revision: currentRevision,
      });
      continue;
    }

    const sourceProduct = allDraftMap.get(entry.id)!;
    // Sync updated image, priceIndicative: true, and enriched commerce/copy via canonical admin update service
    const updated = await updateAdminProduct({
      db: options.db,
      productId: entry.id,
      body: {
        ...sourceProduct,
        image: entry.image,
        imageName: entry.image,
        priceIndicative: true,
        expectedRevision: currentRevision,
      },
      actorUid: options.actorUid!,
    });

    // Publish via canonical admin publish service
    const published = await publishAdminProduct({
      db: options.db,
      productId: entry.id,
      expectedRevision: updated.revision,
      actorUid: options.actorUid!,
    });

    if (options.execute) {
      console.log(`[${items.length + 1}/${readiness.length}] Published: ${entry.id} (rev ${published.revision})`);
    }

    items.push({
      id: entry.id,
      batch: entry.batch,
      name_en: entry.name_en,
      isBundle: entry.isBundle,
      image: entry.image,
      priceSummary: entry.priceSummary,
      action: 'UPDATED_AND_PUBLISHED',
      revision: published.revision,
    });
  }

  const summary = {
    totalDrafts: readiness.length,
    readyToPublish: items.filter(i => i.action === 'WOULD_UPDATE_AND_PUBLISH' || i.action === 'UPDATED_AND_PUBLISHED').length,
    alreadyPublished: items.filter(i => i.action === 'SKIP_ALREADY_PUBLISHED').length,
    heldBack: items.filter(i => i.action === 'SKIP_NOT_READY').length,
    missingInFirestore: items.filter(i => i.action === 'MISSING_IN_FIRESTORE').length,
  };

  return {
    mode: options.execute ? 'EXECUTE_PUBLISH' : options.db ? 'DRY_RUN_LIVE_VERIFIED' : 'DRY_RUN_OFFLINE',
    summary,
    items,
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
  const offline = args.includes('--offline');

  let db: Firestore | null = null;
  if (!offline) {
    loadLocalEnv();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (clientEmail && privateKey) {
      const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: project, clientEmail, privateKey }), projectId: project });
      db = databaseId === '(default)' ? getFirestore(app) : getFirestore(app, databaseId);
      db.settings({ ignoreUndefinedProperties: true });
    }
  }

  if (execute) {
    if (argVal('--confirm-project') !== 'allbarka-live') {
      throw new Error('CONFIRM_PROJECT_REQUIRED');
    }
    if (!actorUid) {
      throw new Error('ACTOR_UID_REQUIRED');
    }
  }

  const excludeSet = new Set<string>();
  const excludeFile =
    argVal('--exclude-file') ||
    (fs.existsSync('docs/catalog/IMAGE_HOLD_20261119.txt') ? 'docs/catalog/IMAGE_HOLD_20261119.txt' : undefined);
  if (excludeFile && fs.existsSync(excludeFile)) {
    for (const line of fs.readFileSync(excludeFile, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) excludeSet.add(trimmed);
    }
  }
  const excludeArg = argVal('--exclude');
  if (excludeArg) {
    for (const id of excludeArg.split(',')) {
      const trimmed = id.trim();
      if (trimmed) excludeSet.add(trimmed);
    }
  }

  const report = await runPublishReadyDrafts20261118({ db, actorUid, execute, excludeIds: excludeSet });
  const outFile = argVal('--out');
  if (outFile) {
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n', 'utf8');
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

if (process.argv[1] && (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('publish-ready-drafts-20261118.ts'))) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
