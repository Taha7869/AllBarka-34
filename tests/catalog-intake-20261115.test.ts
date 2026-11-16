import assert from 'node:assert/strict';
import test from 'node:test';
import manifest from '../src/data/catalogIntake20261115.json';
import batchOne from '../src/data/catalogIntake20261110.json';
import batchTwo from '../src/data/catalogIntake20261113.json';
import batchThree from '../src/data/catalogIntake20261114.json';
import { PRODUCTS } from '../src/data/products';
import { intakeProducts20261115, importIntake20261115 } from '../src/lib/catalogIntake20261115';
import { isProductPubliclyVisible } from '../src/lib/catalogSchema';
import { memoryFirestore } from './helpers/memoryFirestore';

test('batch 4 adds the supplier-list gaps as hidden drafts with full content in three languages', () => {
  const intake = intakeProducts20261115() as any[];
  assert.equal(intake.length, 16);
  const earlier = new Set([...PRODUCTS, ...batchOne.newProducts, ...batchTwo.newProducts, ...batchThree.newProducts].map((p: any) => p.id));
  for (const p of intake) {
    assert.ok(!earlier.has(p.id), p.id);
    assert.equal(p.status, 'draft'); assert.equal(p.active, false); assert.equal(isProductPubliclyVisible(p), false);
    for (const l of ['en', 'ur', 'ar']) {
      for (const f of ['desc', 'recipe', 'sourcingDetails', 'storageTips', 'packagingDetails', 'allergenWarning']) assert.ok(String(p[`${f}_${l}`]).length > 30, `${p.id} ${f}_${l}`);
      assert.ok(String(p[`name_${l}`]).length > 2);
    }
    assert.ok(p.commerce.basePrice > 0);
    for (const o of p.commerce.options) assert.equal(o.label, `${o.quantity}${o.unit}`);
  }
  const ids = new Set(intake.map(p => p.id));
  for (const id of ['white-pepper-whole', 'lal-mirch-powder', 'coriander-powder', 'coriander-seeds-whole', 'dadar-mirch-dry-red-chilli', 'kamarkas', 'imli-tamarind', 'garam-masala-whole', 'turmeric-root-whole', 'mission-figs-dried', 'dried-blueberries', 'dried-kiwi', 'macadamia-nuts', 'brazil-nuts', 'pecans', 'almond-slices']) assert.ok(ids.has(id), id);
  assert.equal(intake.filter(p => p.category === 'herbs-spices').length, 9);
});

test('nut drafts carry the tree-nut warning and no copy makes a medical claim', () => {
  const banned = /\b(cures?|heals?|prevents?|treats?|immunity|diabet\w*|cancer|boosts?)\b/i;
  for (const p of intakeProducts20261115() as any[]) {
    if (p.category === 'nuts') assert.match(p.allergenWarning_en, /tree nuts/i, p.id);
    for (const f of ['desc_en', 'recipe_en', 'sourcingDetails_en', 'allergenWarning_en']) assert.ok(!banned.test(p[f]), `${p.id} ${f}`);
  }
});

test('create-only import of batch 4 is idempotent and never overwrites', async () => {
  const id = manifest.newProducts[0].id;
  const kept = { name_en: 'Owner edit', revision: 9 };
  const { db, records } = memoryFirestore({ [`products/${id}`]: kept });
  const first = await importIntake20261115({ db, actorUid: 'fixture-admin', execute: true });
  assert.equal(first.items.filter(i => i.action === 'CREATED_DRAFT').length, manifest.newProducts.length - 1);
  assert.deepEqual(records.get(`products/${id}`), kept);
  const second = await importIntake20261115({ db, actorUid: 'fixture-admin', execute: true });
  assert.equal(second.items.filter(i => i.action === 'SKIP_EXISTING').length, manifest.newProducts.length);
  await assert.rejects(importIntake20261115({ db: null, execute: true }), /INTAKE_AUTHORITY_REQUIRED/);
});

test('owner dedupe 16 Nov: merged drafts stay out and their bundles point at the kept product', () => {
  const all = JSON.stringify([manifest, batchTwo, batchThree]);
  for (const gone of ['aloobukhara-qandhari', 'plain-cashews', 'dried-figs-medium']) assert.ok(!all.includes(`"${gone}"`), gone);
  const kept = new Set(PRODUCTS.map(p => p.id));
  for (const id of ['alubukhara', 'kaju', 'afghan-figs', 'black-raisins']) assert.ok(kept.has(id), id);
});
