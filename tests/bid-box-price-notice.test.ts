import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { catalogTranslations } from '../src/contexts/catalogTranslations';

test('bid boxes tell customers the price is a guide and the team confirms after the order', () => {
  for (const lang of ['en', 'ur', 'ar']) {
    assert.ok(catalogTranslations[lang]['bidBox.priceNotice.title']?.length > 10, lang);
    assert.ok(catalogTranslations[lang]['bidBox.priceNotice.body']?.length > 60, lang);
  }
  assert.match(catalogTranslations.en['bidBox.priceNotice.body'], /contact you to confirm the final price/);
  for (const file of ['src/components/BidBoxesSection.tsx', 'src/components/QuickViewModal.tsx', 'src/pages/ProductDetailPage.tsx']) {
    assert.match(fs.readFileSync(file, 'utf8'), /<IndicativePriceNotice/, file);
  }
});

test('bid-box publish script plans read-only, then creates and publishes all 8 without overwriting', async () => {
  const { publishBidBoxes } = await import('../scripts/publish-bid-boxes-20261116');
  const { memoryFirestore } = await import('./helpers/memoryFirestore');
  const { invalidateCatalogCache, loadAuthoritativeCatalog } = await import('../src/lib/catalogStore');
  const existing = { id: 'bid-box-luxury-tin', status: 'draft', name_en: 'Owner edited tin' };
  const { db, records } = memoryFirestore({ 'products/bid-box-luxury-tin': existing });
  const plan = await publishBidBoxes({ db: db as any });
  assert.equal(plan.mode, 'READ_ONLY_PLAN');
  assert.equal(plan.items.length, 8);
  assert.equal(plan.items.find(i => i.id === 'bid-box-luxury-tin')!.action, 'SKIP_EXISTS_DRAFT');
  assert.equal(plan.items.filter(i => i.action === 'WOULD_PUBLISH').length, 7);
  await assert.rejects(() => publishBidBoxes({ db: db as any, execute: true }), /BID_BOX_AUTHORITY_REQUIRED/);
  const done = await publishBidBoxes({ db: db as any, actorUid: 'owner', execute: true });
  assert.equal(done.items.filter(i => i.action === 'PUBLISHED').length, 7);
  assert.equal((records.get('products/bid-box-luxury-tin') as any).name_en, 'Owner edited tin');
  assert.equal((records.get('products/bid-box-pyramid-favor') as any).status, 'published');
  invalidateCatalogCache();
});
