import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MERCHANDISING } from '../src/config/merchandising';
import {
  isLegacyCollectionCoverImage,
  planClearLegacyCollectionCovers,
  runClearLegacyCollectionCovers,
} from '../scripts/clear-legacy-collection-covers';
import { memoryFirestore } from './helpers/memoryFirestore';

test('planClearLegacyCollectionCovers flags legacy overrides while preserving studio covers and empty images', () => {
  assert.equal(isLegacyCollectionCoverImage('saunf', '/images/generated/category-saunf-tile-v1.webp'), true);
  assert.equal(isLegacyCollectionCoverImage('dry-fruits', '/assets/categories/dry_fruits.png'), true);
  assert.equal(isLegacyCollectionCoverImage('saunf', '/images/section-covers-20261120/saunf.webp'), false);
  assert.equal(isLegacyCollectionCoverImage('saunf', ''), false);
  assert.equal(isLegacyCollectionCoverImage('unknown-custom-col', '/uploads/custom.webp'), false);

  const settings = {
    ...DEFAULT_MERCHANDISING,
    collections: [
      { collectionId: 'saunf', title_en: 'Saunf', slug: '/shop/saunf', visible: true, image: '/images/generated/category-saunf-tile-v1.webp' },
      { collectionId: 'dry-fruits', title_en: 'Dry Fruits', slug: '/shop/dry-fruits', visible: true, image: '/assets/categories/dry_fruits.png' },
      { collectionId: 'dates', title_en: 'Dates', slug: '/shop/dates', visible: true, image: '/images/section-covers-20261120/dates.webp' },
      { collectionId: 'deals', title_en: 'Deals', slug: '/shop/deals', visible: true },
    ],
  };

  const plan = planClearLegacyCollectionCovers(settings);
  assert.equal(plan.affected.length, 2);
  assert.deepEqual(plan.affected.map(a => a.collectionId), ['saunf', 'dry-fruits']);
  assert.equal(plan.affected[0].studioCoverFallback, '/images/section-covers-20261120/saunf.webp');
  assert.equal(plan.affected[1].studioCoverFallback, '/images/section-covers-20261120/nuts.webp');
  assert.equal(plan.cleanedCollections.find(c => c.collectionId === 'saunf')?.image, undefined);
  assert.equal(plan.cleanedCollections.find(c => c.collectionId === 'dates')?.image, '/images/section-covers-20261120/dates.webp');
});

test('runClearLegacyCollectionCovers dry-run does not mutate and execute clears via official admin services', async () => {
  const { db, records } = memoryFirestore();
  const seeded = {
    ...DEFAULT_MERCHANDISING,
    revision: 2,
    collections: [
      { collectionId: 'saunf', title_en: 'Saunf', slug: '/shop/saunf', visible: true, image: '/images/generated/category-saunf-tile-v1.webp' },
      { collectionId: 'dry-fruits', title_en: 'Dry Fruits', slug: '/shop/dry-fruits', visible: true, image: '/assets/categories/dry_fruits.png' },
    ],
  };
  await db.collection('merchandising').doc('preview').set(seeded);
  await db.collection('merchandising').doc('settings').set(seeded);

  const dry = await runClearLegacyCollectionCovers({ db, execute: false });
  assert.equal(dry.mode, 'DRY_RUN');
  assert.equal(dry.mutated, false);
  assert.equal(dry.draftLegacyImages.length, 2);
  assert.equal(dry.liveLegacyImages.length, 2);
  assert.equal((records.get('merchandising/settings') as any).collections[0].image, '/images/generated/category-saunf-tile-v1.webp');

  const exec = await runClearLegacyCollectionCovers({ db, execute: true, actorUid: 'admin-owner' });
  assert.equal(exec.mode, 'EXECUTE');
  assert.equal(exec.mutated, true);
  assert.equal((records.get('merchandising/preview') as any).collections[0].image, undefined);
  assert.equal((records.get('merchandising/settings') as any).collections[0].image, undefined);
  assert.equal((records.get('merchandising/settings') as any).collections[1].image, undefined);
});
