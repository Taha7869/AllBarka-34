import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { intakeProducts20261110 } from '../src/lib/catalogIntake20261110';
import { intakeProducts20261113 } from '../src/lib/catalogIntake20261113';
import { intakeProducts20261114 } from '../src/lib/catalogIntake20261114';
import { intakeProducts20261115 } from '../src/lib/catalogIntake20261115';
import { importIntake20261110 } from '../src/lib/catalogIntake20261110';
import { importIntake20261113 } from '../src/lib/catalogIntake20261113';
import { importIntake20261114 } from '../src/lib/catalogIntake20261114';
import { importIntake20261115 } from '../src/lib/catalogIntake20261115';
import { stripPrivateProductFields, validateDynamicProduct, isProductPubliclyVisible } from '../src/lib/catalogSchema';
import { evaluateDraftsReadiness, runPublishReadyDrafts20261118 } from '../scripts/publish-ready-drafts-20261118';
import { memoryFirestore } from './helpers/memoryFirestore';

const allDrafts = () => [
  ...intakeProducts20261110(),
  ...intakeProducts20261113(),
  ...intakeProducts20261114(),
  ...intakeProducts20261115(),
];

test('all 155 drafts have <200KB WebP studio images, unique SHA-256 hashes, priceIndicative: true, and DRAFT_IMAGES_SHEET.html', () => {
  const drafts = allDrafts();
  assert.equal(drafts.length, 155);
  const seenPaths = new Set<string>();
  const seenHashes = new Map<string, string>();
  const sheetHtml = fs.readFileSync('docs/catalog/DRAFT_IMAGES_SHEET.html', 'utf8');

  for (const p of drafts as any[]) {
    assert.equal(typeof p.image, 'string', p.id);
    assert.equal(p.image.includes('placeholder'), false, `${p.id} still uses placeholder`);
    assert.ok(p.image.endsWith('.webp'), `${p.id} image must be .webp: ${p.image}`);
    assert.ok(!seenPaths.has(p.image), `Duplicate image path ${p.image} on ${p.id}`);
    seenPaths.add(p.image);

    const filePath = `public${p.image}`;
    assert.ok(fs.existsSync(filePath), `${p.id} missing file ${filePath}`);
    const buf = fs.readFileSync(filePath);
    assert.ok(buf.length > 1000 && buf.length < 200 * 1024, `${p.id} size ${buf.length}B must be <200KB`);

    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    assert.ok(!seenHashes.has(sha256), `Duplicate image content hash between ${p.id} and ${seenHashes.get(sha256)}`);
    seenHashes.set(sha256, String(p.id));

    assert.equal(p.priceIndicative, true, `${p.id} must have priceIndicative: true`);
    assert.ok(sheetHtml.includes(`id="item-${p.id}"`), `${p.id} missing from DRAFT_IMAGES_SHEET.html`);

    const validated = validateDynamicProduct(p);
    assert.equal(validated.priceIndicative, true);
    const projected = stripPrivateProductFields(validated as any);
    assert.equal(projected.priceIndicative, true);
  }
  assert.equal(seenHashes.size, 155);
});

test('REFERENCE_PRICES_20261118.csv covers all 155 drafts with positive per-kg rates, source and date', () => {
  const csv = fs.readFileSync('docs/catalog/REFERENCE_PRICES_20261118.csv', 'utf8').trim().split(/\r?\n/);
  assert.equal(csv[0], '"id","price_pkr_per_kg","source","date"');
  assert.equal(csv.length, 156); // header + 155 rows
  const draftIds = new Set(allDrafts().map((p: any) => String(p.id)));
  const seenIds = new Set<string>();
  for (let i = 1; i < csv.length; i++) {
    const match = /^"([^"]+)","(\d+)","([^"]+)","(2026-11-18)"$/.exec(csv[i]);
    assert.ok(match, `Invalid CSV row ${i}: ${csv[i]}`);
    const [, id, rateStr, source] = match!;
    assert.ok(draftIds.has(id), `Unknown id in CSV: ${id}`);
    assert.ok(!seenIds.has(id), `Duplicate id in CSV: ${id}`);
    seenIds.add(id);
    assert.ok(Number(rateStr) > 0, `Rate must be positive for ${id}`);
    assert.ok(source.length > 10 && !source.includes('undefined'), `Invalid source for ${id}: ${source}`);
  }
  assert.equal(seenIds.size, 155);
});

test('publish readiness holds back incomplete drafts and executes cleanly on ready drafts in memoryFirestore', async () => {
  const readiness = evaluateDraftsReadiness();
  assert.equal(readiness.length, 155);
  assert.equal(readiness.every(r => r.ready), true);

  // Verify incomplete drafts (placeholder image, zero price, missing copy, or unpublished component) are held back
  const sampleSingle = structuredClone(intakeProducts20261113()[0]) as Record<string, any>;
  const sampleBundle = structuredClone(intakeProducts20261114().find((p: any) => p.isBundle)!) as Record<string, any>;
  const customCheck = evaluateDraftsReadiness([
    { batch: '20261113', product: { ...sampleSingle, id: 'bad-image', image: '/images/product-placeholder.svg' } },
    { batch: '20261113', product: { ...sampleSingle, id: 'bad-price', commerce: { ...sampleSingle.commerce, basePrice: 0 } } },
    { batch: '20261113', product: { ...sampleSingle, id: 'bad-copy', desc_ur: 'short' } },
    { batch: '20261114', product: { ...sampleBundle, id: 'bad-bundle', componentIds: ['bad-image', 'badam'] } },
  ]);
  assert.equal(customCheck.find(r => r.id === 'bad-image')?.skipReason, 'MISSING_REAL_PRODUCT_IMAGE');
  assert.equal(customCheck.find(r => r.id === 'bad-price')?.skipReason, 'MISSING_VALID_PRICE');
  assert.equal(customCheck.find(r => r.id === 'bad-copy')?.skipReason, 'INCOMPLETE_TRILINGUAL_COPY');
  assert.equal(customCheck.find(r => r.id === 'bad-bundle')?.skipReason, 'HOLD_COMPONENT_NOT_PUBLISHED:bad-image');

  const { db, records } = memoryFirestore();
  await importIntake20261110({ db, actorUid: 'admin-test', execute: true });
  await importIntake20261113({ db, actorUid: 'admin-test', execute: true });
  await importIntake20261115({ db, actorUid: 'admin-test', execute: true });
  await importIntake20261114({ db, actorUid: 'admin-test', execute: true });

  // Dry run does not mutate drafts
  const dry = await runPublishReadyDrafts20261118({ db, execute: false });
  assert.equal(dry.mode, 'DRY_RUN_LIVE_VERIFIED');
  assert.equal(dry.summary.readyToPublish, 155);
  assert.equal((records.get('products/hazelnuts') as any).status, 'draft');

  // Execute without actorUid refuses
  await assert.rejects(runPublishReadyDrafts20261118({ db, execute: true }), /PUBLISH_AUTHORITY_REQUIRED/);

  // Execute with actorUid updates and publishes all 155 ready drafts
  const exec = await runPublishReadyDrafts20261118({ db, actorUid: 'admin-test', execute: true });
  assert.equal(exec.mode, 'EXECUTE_PUBLISH');
  assert.equal(exec.summary.readyToPublish, 155);

  const hazelnuts = records.get('products/hazelnuts') as any;
  assert.equal(hazelnuts.status, 'published');
  assert.equal(hazelnuts.active, true);
  assert.equal(hazelnuts.priceIndicative, true);
  assert.equal(hazelnuts.image, '/images/drafts-20261118/hazelnuts.webp');
  assert.equal(isProductPubliclyVisible(hazelnuts), true);

  // Second run is idempotent (all 155 SKIP_ALREADY_PUBLISHED)
  const second = await runPublishReadyDrafts20261118({ db, actorUid: 'admin-test', execute: true });
  assert.equal(second.summary.alreadyPublished, 155);
  assert.equal(second.summary.readyToPublish, 0);
});

test('IMAGE_HOLD_20261119.txt holds back the remaining 7 items leaving 148 ready to publish', async () => {
  const holdPath = 'docs/catalog/IMAGE_HOLD_20261119.txt';
  assert.ok(fs.existsSync(holdPath), 'IMAGE_HOLD_20261119.txt must exist');
  const holdIds = new Set(
    fs
      .readFileSync(holdPath, 'utf8')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(s => Boolean(s) && !s.startsWith('#'))
  );
  assert.equal(holdIds.size, 7, 'IMAGE_HOLD_20261119.txt must contain exactly 7 remaining IDs');

  const ready26 = [
    'pecans', 'murabba-amla', 'gulkand', 'mulethi-licorice-root', 'saffron-spanish-coupe',
    'almond-slices', 'ashwagandha', 'dried-shikakai', 'korean-red-ginseng-root',
    'murabba-bael', 'murabba-behi', 'gift-visit-small', 'gift-visit-hospital-light',
    'brazil-nuts', 'dadar-mirch-dry-red-chilli', 'gurbandi-almonds-inshell',
    'kagzi-almonds-inshell', 'macadamia-nuts', 'salab-misri', 'salted-peanuts',
    'murabba-gajar', 'murabba-harad', 'kamarkas', 'imli-tamarind',
    'chamomile-tea', 'coriander-seeds-whole',
  ];
  const readiness = evaluateDraftsReadiness(undefined, { excludeIds: holdIds });
  assert.equal(readiness.length, 155);
  for (const id of ready26) {
    const entry = readiness.find(r => r.id === id);
    assert.ok(entry?.ready, `${id} should now be ready`);
    assert.equal(entry?.image, `/images/held-ai-20261120/${id}.webp`);
  }

  const heldItems = readiness.filter(r => !r.ready);
  const readyItems = readiness.filter(r => r.ready);

  assert.equal(heldItems.length, 7, `Expected exactly 7 held items, got ${heldItems.length}`);
  assert.equal(readyItems.length, 148, `Expected exactly 148 ready items, got ${readyItems.length}`);

  for (const item of heldItems) {
    assert.ok(holdIds.has(item.id), `Unexpected held item: ${item.id}`);
    assert.equal(item.skipReason, 'HOLD_IMAGE_OR_ORIGIN_REVIEW');
  }

  // Test dry-run in memoryFirestore with excludeIds
  const { db } = memoryFirestore();
  await importIntake20261110({ db, actorUid: 'admin-test', execute: true });
  await importIntake20261113({ db, actorUid: 'admin-test', execute: true });
  await importIntake20261115({ db, actorUid: 'admin-test', execute: true });
  await importIntake20261114({ db, actorUid: 'admin-test', execute: true });

  const dry = await runPublishReadyDrafts20261118({ db, execute: false, excludeIds: holdIds });
  assert.equal(dry.summary.totalDrafts, 155);
  assert.equal(dry.summary.readyToPublish, 148);
  assert.equal(dry.summary.heldBack, 7);
});
