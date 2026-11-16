import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { BUNDLE_COPY_20261116 } from '../src/data/bundleCopy20261116';
import { applyBundleCopy, plannedContent } from '../scripts/apply-bundle-copy-20261116';
import { memoryFirestore } from './helpers/memoryFirestore';

const CLAIMS = /immun|brain|warrior|cognitive|recovery|restorative|wellness|prophetic|omega|heart health|امیون|برین|وارئیر|إميون/i;

test('older bundles have descriptive names, matching dates and no health-claim wording', () => {
  for (const [id, copy] of Object.entries(BUNDLE_COPY_20261116)) {
    const p: any = PRODUCTS.find(x => x.id === id);
    assert.ok(p, id);
    assert.equal(p.name_en, copy.name_en);
    assert.ok(copy.name_en.length >= 18 && copy.name_en.length <= 90, id);
    for (const l of ['en', 'ur', 'ar']) assert.equal(copy[`desc_${l}` as 'desc_en'].split('\n\n').length, 3, `${id} ${l}`);
    for (const [k, v] of Object.entries(p)) {
      if (['id', 'image', 'imageName', 'galleryImages'].includes(k)) continue;
      const text = typeof v === 'string' ? v : Array.isArray(v) ? v.join(' ') : '';
      assert.ok(!CLAIMS.test(text), `${id}.${k}: ${text.slice(0, 80)}`);
      assert.ok(!/muzafati|panjgur/i.test(text), `${id}.${k} names a date that is not linked`);
    }
    assert.equal(p.healthTag, undefined, id);
  }
  const ramadan: any = PRODUCTS.find(p => p.id === 'bundle-ramadan-ready');
  assert.deepEqual(ramadan.componentIds, ['ajwa-dates', 'medjool-dates', 'afghan-figs']);
  assert.match(ramadan.name_en, /Ajwa & Medjool/);
});

test('live copy update is a read-only plan by default and never touches price or stock', async () => {
  const legacy = { id: 'bundle-immunity-shield', name_en: 'Immunity Shield', name: 'Immunity Shield', desc_en: 'old', prices: { Bundle: 3000 }, status: 'published', active: true, revision: 4 };
  const { db, records } = memoryFirestore({ 'products/bundle-immunity-shield': legacy });
  const plan = await applyBundleCopy({ db: db as any });
  assert.equal(plan.mode, 'READ_ONLY_PLAN');
  const item = plan.items.find(i => i.id === 'bundle-immunity-shield')!;
  assert.equal(item.action, 'WOULD_UPDATE');
  assert.ok(item.fields.includes('name_en') && item.fields.includes('desc_ur'));
  for (const forbidden of ['prices', 'variants', 'commerce', 'status', 'active', 'stock']) assert.ok(!item.fields.includes(forbidden), forbidden);
  assert.equal(plan.items.find(i => i.id === 'deal-1')!.action, 'SKIP_NOT_LIVE');
  assert.equal((records.get('products/bundle-immunity-shield') as any).name_en, 'Immunity Shield');
  assert.deepEqual(Object.keys(plannedContent({ id: 'bundle-immunity-shield', ...BUNDLE_COPY_20261116['bundle-immunity-shield'] })).filter(k => !['contents_en', 'contents_ur', 'contents_ar', 'components', 'tasteProfile_en', 'tasteProfile_ur', 'tasteProfile_ar'].includes(k)), []);
  await assert.rejects(() => applyBundleCopy({ db: db as any, execute: true }), /BUNDLE_COPY_AUTHORITY_REQUIRED/);
});
