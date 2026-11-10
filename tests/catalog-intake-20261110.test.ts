import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import manifest from '../src/data/catalogIntake20261110.json';
import { PRODUCTS } from '../src/data/products';
import { intakeProducts20261110, importIntake20261110 } from '../src/lib/catalogIntake20261110';
import { loadAuthoritativeCatalog } from '../src/lib/catalogStore';
import { isProductPubliclyVisible } from '../src/lib/catalogSchema';
import { productMatchesCategory } from '../src/config/categories';
import { memoryFirestore } from './helpers/memoryFirestore';

test('owner intake validates without repricing or duplicating the existing catalogue', () => {
  const before = structuredClone(PRODUCTS);
  const intake = intakeProducts20261110();
  assert.equal(intake.length, 17);
  assert.equal(new Set(intake.map(p => p.id)).size, 17);
  for (const product of intake) {
    assert.ok(!PRODUCTS.some(existing => existing.id === product.id));
    assert.equal(product.status, 'draft');
    assert.equal(product.active, false);
    for (const lang of ['en', 'ur', 'ar']) assert.ok(String(product[`desc_${lang}`]).length > 40);
    assert.ok(fs.existsSync(`public${product.image}`));
    assert.equal(isProductPubliclyVisible(product as any), false);
  }
  for (const id of manifest.reuseExistingIds) assert.ok(PRODUCTS.some(p => p.id === id), id);
  assert.deepEqual(PRODUCTS, before);
});

test('create-only import preserves merchant edits and is idempotent with durable draft/audit state', async () => {
  const id = manifest.newProducts[0].id;
  const preserved = { name_en: 'Owner edited title', prices: { '100g': 777 }, revision: 42, status: 'archived' };
  const { db, records } = memoryFirestore({ [`products/${id}`]: preserved, 'products/kishmish': { prices: { '250g': 365 }, privateNote: 'fixture only' } });
  const old = structuredClone(records.get('products/kishmish'));
  const first = await importIntake20261110({ db, actorUid: 'fixture-admin', execute: true });
  assert.equal(first.items.filter(p => p.action === 'CREATED_DRAFT').length, 16);
  assert.deepEqual(records.get(`products/${id}`), preserved);
  assert.deepEqual(records.get('products/kishmish'), old);
  const state = structuredClone([...records]);
  const second = await importIntake20261110({ db, actorUid: 'fixture-admin', execute: true });
  assert.equal(second.items.every(p => p.action === 'SKIP_EXISTING'), true);
  assert.deepEqual([...records], state);
  const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
  for (const p of snapshot.products.filter(p => manifest.newProducts.some(n => n.id === p.id))) assert.equal(isProductPubliclyVisible(p), false);
});

test('offline/read-only plans do not write; unauthorised execution refuses', async () => {
  const { db, records } = memoryFirestore();
  assert.equal((await importIntake20261110({ db: null })).mode, 'OFFLINE_PLAN_UNVERIFIED');
  await importIntake20261110({ db });
  assert.equal(records.size, 0);
  await assert.rejects(importIntake20261110({ db, execute: true }), /INTAKE_AUTHORITY_REQUIRED/);
});

test('saunf grouping includes plain fennel and new mixes without capturing other foods; oil volume configuration stays editable', () => {
  assert.equal(productMatchesCategory(PRODUCTS.find(p => p.id === 'fennel-seeds')!, 'saunf'), true);
  assert.equal(productMatchesCategory(PRODUCTS.find(p => p.id === 'oil-almond')!, 'saunf'), false);
  for (const p of manifest.newProducts) {
    if (['mixed-mukhwas', 'sugar-coated-saunf'].includes(p.id)) assert.equal(productMatchesCategory(p, 'saunf'), true);
    if (p.category === 'oils') {
      assert.deepEqual(p.commerce.options.map(o => o.label), ['100ml', '250ml', '500ml', '1L']);
      assert.equal(p.commerce.custom?.unit, 'ml');
      assert.equal(p.commerce.basePrice, null);
    }
  }
});
