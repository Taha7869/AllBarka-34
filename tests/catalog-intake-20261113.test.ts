import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import manifest from '../src/data/catalogIntake20261113.json';
import { PRODUCTS } from '../src/data/products';
import { intakeProducts20261113, importIntake20261113 } from '../src/lib/catalogIntake20261113';
import { isProductPubliclyVisible } from '../src/lib/catalogSchema';
import { convertMeasurement, calculatedUnitPrice } from '../src/lib/productCommerce';
import { memoryFirestore } from './helpers/memoryFirestore';

test('batch 2 validates as drafts with placeholders, reference rates, full content and no collisions', () => {
  const before = structuredClone(PRODUCTS);
  const intake = intakeProducts20261113();
  assert.equal(intake.length, manifest.newProducts.length);
  for (const p of intake) {
    assert.ok(!PRODUCTS.some(e => e.id === p.id), String(p.id));
    assert.equal(p.status, 'draft'); assert.equal(p.active, false);
    const base = (p as any).commerce.basePrice;
    assert.ok(Number.isSafeInteger(base) && base > 0, `${p.id} needs a reference rate`);
    for (const l of ['en', 'ur', 'ar']) for (const f of ['recipe', 'sourcingDetails', 'storageTips', 'packagingDetails', 'allergenWarning']) assert.ok(String(p[`${f}_${l}`]).length > 30, `${p.id} ${f}_${l}`);
    assert.ok(fs.existsSync(`public${p.image}`));
    for (const l of ['en', 'ur', 'ar']) { assert.ok(String(p[`name_${l}`]).length > 1); assert.ok(String(p[`desc_${l}`]).length > 30); }
    assert.equal(isProductPubliclyVisible(p as any), false);
  }
  assert.deepEqual(PRODUCTS, before);
});

test('units: liquids use ml/L only, solids use mg/g/kg only, and every option converts exactly', () => {
  for (const p of manifest.newProducts) {
    const liquid = p.commerce.kind === 'liquid';
    for (const o of p.commerce.options) {
      assert.ok(liquid ? ['ml', 'L'].includes(o.unit) : ['mg', 'g', 'kg'].includes(o.unit), `${p.id} ${o.label}`);
      assert.equal(o.label, `${o.quantity}${o.unit}`);
      if (liquid) assert.equal(p.category, 'oils');
      else assert.throws(() => convertMeasurement(o.quantity, o.unit as any, 'ml'), /INCOMPATIBLE_MEASUREMENT/);
    }
  }
});

test('unit arithmetic is exact across mg, g, kg, ml and L', () => {
  assert.equal(convertMeasurement(1, 'kg', 'g'), 1000);
  assert.equal(convertMeasurement(250, 'mg', 'g'), 0.25);
  assert.equal(convertMeasurement(1.5, 'L', 'ml'), 1500);
  assert.equal(convertMeasurement(500, 'ml', 'L'), 0.5);
  assert.throws(() => convertMeasurement(1, 'kg', 'L'));
  const mass = { baseQuantity: 1, baseUnit: 'kg' as const, basePrice: 1000 };
  assert.equal(calculatedUnitPrice(mass, 250, 'g'), 250);
  assert.equal(calculatedUnitPrice(mass, 500, 'mg'), 1);
  const vol = { baseQuantity: 1, baseUnit: 'L' as const, basePrice: 1200 };
  assert.equal(calculatedUnitPrice(vol, 100, 'ml'), 120);
  assert.throws(() => calculatedUnitPrice(vol, 100, 'g'));
});

test('create-only import is idempotent and never overwrites', async () => {
  const id = manifest.newProducts[0].id;
  const kept = { name_en: 'Owner edit', revision: 9 };
  const { db, records } = memoryFirestore({ [`products/${id}`]: kept });
  const first = await importIntake20261113({ db, actorUid: 'fixture-admin', execute: true });
  assert.equal(first.items.filter(i => i.action === 'CREATED_DRAFT').length, manifest.newProducts.length - 1);
  assert.deepEqual(records.get(`products/${id}`), kept);
  const second = await importIntake20261113({ db, actorUid: 'fixture-admin', execute: true });
  assert.ok(second.items.every(i => i.action === 'SKIP_EXISTING'));
  await assert.rejects(importIntake20261113({ db, execute: true }), /INTAKE_AUTHORITY_REQUIRED/);
});

import { productMatchesCategory, CANONICAL_CATEGORIES, CUSTOMER_FACING_CATEGORIES } from '../src/config/categories';

test('Murabba Jaat is its own category and chai is a sub-category of Herbs & Spices', () => {
  assert.ok(CANONICAL_CATEGORIES['murabba-jaat'] && CANONICAL_CATEGORIES['herbal-teas']);
  assert.ok((CUSTOMER_FACING_CATEGORIES as readonly string[]).includes('murabba-jaat'));
  const murabba = manifest.newProducts.filter(p => p.category === 'murabba-jaat');
  assert.equal(murabba.length, 7);
  for (const p of murabba) assert.ok(productMatchesCategory(p as any, 'murabba-jaat') && !productMatchesCategory(p as any, 'herbs-spices'));
  const teas = manifest.newProducts.filter(p => p.collections.includes('herbal-teas'));
  assert.equal(teas.length, 11);
  for (const p of teas) assert.ok(p.category === 'herbs-spices' && productMatchesCategory(p as any, 'herbs-spices') && productMatchesCategory(p as any, 'herbal-teas'));
});

import { countLiveCatalog } from '../src/lib/liveCatalogCount';

test('live catalogue census is read-only and reports products the repository does not know', async () => {
  const { db, records } = memoryFirestore({
    'products/pista': { category: 'nuts', name_en: 'Pista', active: true },
    'products/owner-added-box': { category: 'celebration-boxes', name_en: 'Owner box', active: true },
    'products/owner-draft': { category: 'oils', name_en: 'Draft', status: 'draft' },
  });
  const before = structuredClone([...records]);
  const report = await countLiveCatalog(db);
  assert.equal(report.total, 3);
  assert.deepEqual(report.byState, { published: 2, draft: 1, archived: 0, inactive: 0 });
  assert.deepEqual(report.notInRepo.map(p => p.id).sort(), ['owner-added-box', 'owner-draft']);
  assert.ok(report.repoItemsNotLive > 90);
  assert.deepEqual([...records], before);
});
