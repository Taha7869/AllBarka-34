import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import manifest from '../src/data/catalogIntake20261114.json';
import batchOne from '../src/data/catalogIntake20261110.json';
import batchTwo from '../src/data/catalogIntake20261113.json';
import { PRODUCTS } from '../src/data/products';
import { intakeProducts20261114, importIntake20261114 } from '../src/lib/catalogIntake20261114';
import { bundleComponentValue, bundlePriceFromValue, referenceRate, type BundlePricingEntry } from '../src/lib/bundleReferencePricing';
import { isProductPubliclyVisible } from '../src/lib/catalogSchema';
import { readBundleFormat } from '../src/lib/merchandisingPresentation';
import { memoryFirestore } from './helpers/memoryFirestore';

const pricing = manifest.bundlePricing as Record<string, BundlePricingEntry & { packagedWeightG: number }>;
const bundles = () => intakeProducts20261114().filter(p => (p as any).isBundle);
const allIds = () => new Set<string>([...PRODUCTS.map(p => p.id), ...batchOne.newProducts.map(p => p.id), ...batchTwo.newProducts.map(p => p.id), ...manifest.newProducts.map(p => p.id)]);

test('batch 3 validates as drafts with placeholders, full content and no collisions across any batch', () => {
  const before = structuredClone(PRODUCTS);
  const intake = intakeProducts20261114();
  assert.equal(intake.length, manifest.newProducts.length);
  const earlier = new Set([...PRODUCTS.map(p => p.id), ...batchOne.newProducts.map(p => p.id), ...batchTwo.newProducts.map(p => p.id)]);
  for (const p of intake) {
    assert.ok(!earlier.has(String(p.id)), String(p.id));
    assert.equal(p.status, 'draft'); assert.equal(p.active, false);
    for (const l of ['en', 'ur', 'ar']) {
      for (const f of ['recipe', 'sourcingDetails', 'storageTips', 'packagingDetails', 'allergenWarning']) assert.ok(String(p[`${f}_${l}`]).length > 30, `${p.id} ${f}_${l}`);
      assert.ok(String(p[`name_${l}`]).length > 1); assert.ok(String(p[`desc_${l}`]).length > 60, `${p.id} desc_${l}`);
    }
    assert.ok(fs.existsSync(`public${p.image}`));
    assert.equal(isProductPubliclyVisible(p as any), false);
  }
  assert.deepEqual(PRODUCTS, before);
});

test('every bundle component exists in the live catalogue or a draft batch, and ids match the component list', () => {
  const ids = allIds();
  assert.equal(bundles().length, Object.keys(pricing).length);
  for (const b of bundles() as any[]) {
    assert.ok(b.componentIds.length >= 2, b.id);
    assert.deepEqual(b.componentIds, b.components.map((c: any) => c.productId));
    for (const id of b.componentIds) assert.ok(ids.has(id), `${b.id} -> ${id}`);
    assert.equal(b.componentIds.includes(b.id), false);
    assert.equal(Object.keys(b.prices).join(), 'Bundle');
    assert.ok(Number.isSafeInteger(b.prices.Bundle) && b.prices.Bundle > 0 && b.prices.Bundle % 50 === 0, b.id);
  }
});

test('bundle prices are exactly reproducible from the component reference rates', () => {
  for (const b of bundles() as any[]) {
    const entry = pricing[b.id];
    const value = bundleComponentValue(entry);
    assert.ok(Math.abs(value - entry.componentValuePKR) < 0.01, `${b.id} value ${value} vs ${entry.componentValuePKR}`);
    assert.equal(bundlePriceFromValue(entry, value), entry.pricePKR, b.id);
    assert.equal(b.prices.Bundle, entry.pricePKR, b.id);
  }
});

test('a deal always costs less than its parts and its badge states the real saving', () => {
  const deals = (bundles() as any[]).filter(b => pricing[b.id].tier === 'deal');
  assert.ok(deals.length >= 10);
  for (const b of deals) {
    const value = bundleComponentValue(pricing[b.id]);
    assert.ok(b.prices.Bundle < value, b.id);
    assert.equal(b.badge, `Save ${Math.round((value - b.prices.Bundle) / value * 100)}%`, b.id);
    assert.ok(Math.round((value - b.prices.Bundle) / value * 100) >= 5, b.id);
  }
  for (const b of (bundles() as any[]).filter(item => pricing[item.id].tier !== 'deal')) assert.ok(!/^Save /.test(b.badge), `${b.id} must not claim a saving`);
});

test('packed weight covers the net weight, and the shipping weight is stored for checkout', () => {
  for (const b of bundles() as any[]) {
    const grams = pricing[b.id].components.filter(c => c.unit === 'g').reduce((sum, c) => sum + c.quantity, 0);
    const ml = pricing[b.id].components.filter(c => c.unit === 'ml').reduce((sum, c) => sum + c.quantity, 0);
    assert.ok(b.shippingWeightG >= grams + ml, b.id);
    assert.equal(b.shippingWeightG % 50, 0);
    assert.equal(b.shippingWeights.Bundle, b.shippingWeightG);
  }
});

test('every legacy occasion has at least one ready-made box, and Walima favour box uses the declared pack format', () => {
  const covered = new Set((bundles() as any[]).flatMap(b => b.occasions));
  for (const occasion of ['wedding', 'umrah', 'ramadan', 'birth', 'corporate']) assert.ok(covered.has(occasion), occasion);
  const walima: any = (bundles() as any[]).find(b => b.id === 'bundle-walima-favour');
  const format = readBundleFormat({ isBundle: true, badge: walima.badge });
  assert.deepEqual(format && [format.count, format.gramsEach, format.netGrams], [4, 100, 400]);
  assert.equal(walima.componentIds.length, 4);
  assert.ok(walima.components.every((c: any) => c.unitWeightG === 100));
});

test('allergen lines match the components and no copy makes a medical claim', () => {
  const tree = new Set(['badam', 'kaju', 'pista', 'akhroot', 'kagzi-walnut-inshell', 'kashmiri-walnut', 'pistachio-kernels', 'hazelnuts', 'mamra-almonds', 'plain-cashews', 'roasted-cashews', 'masala-almonds', 'pine-nuts', 'chilgoza-inshell', 'org-panjeeri']);
  const honey = new Set(['org-honey', 'honey-phulai', 'honey-beri']);
  for (const b of bundles() as any[]) {
    if (b.componentIds.some((id: string) => tree.has(id))) assert.match(b.allergenWarning_en, /tree nuts/, b.id);
    if (b.componentIds.some((id: string) => honey.has(id))) assert.match(b.allergenWarning_en, /12 months/, b.id);
    if (b.componentIds.includes('org-panjeeri')) assert.match(b.allergenWarning_en, /wheat and milk/, b.id);
  }
  const banned = /\b(cures?|heals?|prevents?|treats?|immunity|diabet\w*|cancer|boosts?)\b/i;
  for (const p of intakeProducts20261114() as any[]) for (const f of ['desc_en', 'recipe_en', 'sourcingDetails_en', 'allergenWarning_en']) assert.ok(!banned.test(p[f]), `${p.id} ${f}`);
});

test('premium pantry items: exact units, reference rates and no unverified origin claim', () => {
  const premium = manifest.newProducts.filter(p => !(p as any).isBundle);
  assert.equal(premium.length, 7);
  for (const p of premium as any[]) {
    assert.ok(p.commerce.basePrice > 0 && manifest.referenceRates[p.id as keyof typeof manifest.referenceRates]);
    for (const o of p.commerce.options) assert.equal(o.label, `${o.quantity}${o.unit}`);
    assert.ok(referenceRate(p.id)!.perUnit > 0);
  }
  const saffron: any = premium.find(p => p.id === 'saffron-afghan-negin');
  assert.equal(saffron.commerce.basePrice, 1200000);
  assert.deepEqual(saffron.commerce.options.map((o: any) => o.label), ['1g', '2g', '5g', '10g']);
  assert.match(saffron.sourcingDetails_en, /confirmed on request/);
  assert.equal(JSON.stringify(manifest).includes('musk'), false);
});

test('create-only import of batch 3 is idempotent and never overwrites', async () => {
  const id = manifest.newProducts[0].id;
  const kept = { name_en: 'Owner edit', revision: 9 };
  const { db, records } = memoryFirestore({ [`products/${id}`]: kept });
  const first = await importIntake20261114({ db, actorUid: 'fixture-admin', execute: true });
  assert.equal(first.items.filter(i => i.action === 'CREATED_DRAFT').length, manifest.newProducts.length - 1);
  assert.deepEqual(records.get(`products/${id}`), kept);
  const second = await importIntake20261114({ db, actorUid: 'fixture-admin', execute: true });
  assert.equal(second.items.filter(i => i.action === 'SKIP_EXISTING').length, manifest.newProducts.length);
  const stored: any = records.get('products/bundle-iftar-table');
  assert.equal(stored.status, 'draft'); assert.equal(stored.active, false);
  assert.deepEqual(stored.componentIds, pricing['bundle-iftar-table'].components.map(c => c.id));
});

test('component ids are kept for stored bundles and bad ids are rejected', async () => {
  const { validateDynamicProduct } = await import('../src/lib/catalogSchema');
  const source: any = structuredClone(intakeProducts20261114().find(p => (p as any).id === 'deal-nut-trio'));
  assert.deepEqual(validateDynamicProduct(source).componentIds, ['badam', 'kaju', 'akhroot']);
  for (const bad of [['bad id'], ['ok', 7], 'badam', Array.from({ length: 31 }, (_, i) => `id-${i}`)]) {
    assert.throws(() => validateDynamicProduct({ ...source, componentIds: bad }), /INVALID_COMPONENT_IDS/);
  }
});

test('every bundle name and description explains what is inside and why, in all three languages', () => {
  const catalog = new Map<string, any>();
  for (const p of [...PRODUCTS, ...batchOne.newProducts, ...batchTwo.newProducts, ...manifest.newProducts] as any[]) catalog.set(p.id, p);
  for (const b of bundles() as any[]) {
    assert.ok(b.name_en.length >= 18 && b.name_en.length <= 90, `${b.id} name length ${b.name_en.length}`);
    for (const l of ['en', 'ur', 'ar']) {
      const d: string = b[`desc_${l}`];
      assert.ok(d.includes('\n\n'), `${b.id} desc_${l} has paragraphs`);
      const inside = d.split('\n\n').length;
      assert.ok(inside >= 3, `${b.id} desc_${l} needs summary, inside and why`);
      for (const c of b.components as any[]) assert.ok(catalog.has(c.productId), `${b.id} -> ${c.productId}`);
    }
    // the English description names every component's quantity so the list is checkable against the price build
    const e = pricing[b.id].components;
    for (const line of e) assert.ok(b.desc_en.includes(`${line.quantity} ${line.unit}`), `${b.id} desc mentions ${line.quantity} ${line.unit}`);
  }
});

test('visit, host and get-well range covers visits, sick visits, new home, thanks and condolence with an elders-safe care note', () => {
  const visit = (bundles() as any[]).filter(b => b.collections.includes('visit-gifts'));
  assert.ok(visit.length >= 15, `visit range has ${visit.length}`);
  const ids = new Set(visit.map(b => b.id));
  for (const id of ['gift-visit-small', 'gift-visit-classic', 'gift-visit-premium-host', 'gift-ayadat-basket', 'gift-visit-hospital-light', 'gift-ayadat-premium-hamper', 'gift-rishta-visit', 'gift-new-home-blessing', 'gift-thank-you-tea', 'gift-condolence-visit', 'gift-eid-visit', 'gift-parents-visit']) assert.ok(ids.has(id), id);
  const spread = visit.map(b => pricing[b.id].pricePKR).sort((a, b) => a - b);
  assert.ok(spread[0] <= 1000 && spread[spread.length - 1] >= 5000, `price spread ${spread[0]}-${spread[spread.length - 1]}`);
  for (const b of visit.filter(v => v.id.startsWith('gift-ayadat') || v.id === 'gift-visit-hospital-light')) assert.match(b.recipe_en, /diet/i, b.id);
  for (const b of visit) assert.ok(b.keywords.includes('visit gift'), b.id);
});
