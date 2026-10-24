import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, BID_BOX_PRODUCTS } from '../src/data/products';
import { storedCatalogRecord, loadAuthoritativeCatalog, invalidateCatalogCache, getAdminProductRecord, updateAdminProduct } from '../src/lib/catalogStore';
import { validateCatalogPricing, validateDynamicProduct, catalogVariantId } from '../src/lib/catalogSchema';
import { validateProductCommerce } from '../src/lib/productCommerce';
import { validateAndPriceOrder } from '../src/lib/orderValidation';
import { calculateMinOrderQuantityUnits } from '../src/lib/packagingMoq';
import { buildWaProductRows } from '../src/lib/waProductsExport';
import { memoryFirestore } from './helpers/memoryFirestore';

const affected = BID_BOX_PRODUCTS.filter(product => Object.keys(product.prices).some(label => label.length > 40));

test('known legacy packaging labels load unchanged, preserve merchant prices on metadata edits and price canonical orders/exports', async () => {
  assert.equal(affected.length, 4);
  for (const seed of affected) {
    const label = Object.keys(seed.prices).find(label => label.length > 40)!;
    const merchantPrice = seed.prices[label] + 137;
    const pricing = structuredClone(storedCatalogRecord(seed.id, seed).pricing);pricing.variants.find(variant=>variant.label===label)!.price=merchantPrice;
    const document = { ...structuredClone(seed), ...pricing, prices: { ...seed.prices, [label]: merchantPrice }, revision: 7, supplierCost: 19 };
    const { db, records } = memoryFirestore({ [`products/${seed.id}`]: document });
    invalidateCatalogCache();
    const loaded = (await loadAuthoritativeCatalog(db, { fresh: true })).products.find(product => product.id === seed.id)!;
    assert.equal(loaded.active, true); assert.deepEqual(loaded.prices, document.prices);
    assert.equal(storedCatalogRecord(seed.id, document).pricing.variants.find(variant => variant.label === label)?.id, catalogVariantId(label));
    const admin = await getAdminProductRecord(db, seed.id); assert.equal(admin.prices[label], merchantPrice);
    await updateAdminProduct({ db, productId: seed.id, body: { expectedRevision: 7, name_en: `${seed.name_en} revised` }, actorUid: 'fixture-owner' });
    assert.equal((records.get(`products/${seed.id}`) as any).prices[label], merchantPrice);
    invalidateCatalogCache(); const saved = (await loadAuthoritativeCatalog(db, { fresh: true })).products.find(product => product.id === seed.id)!;
    const quantity = calculateMinOrderQuantityUnits(saved, label);
    const order = validateAndPriceOrder({ products: [saved], items: [{ productId: saved.id, selectedWeight: label, quantity, price: 1 }], city: 'Lahore', shippingMethodId: 'standard', giftWrapping: false, isWholesale: false });
    assert.equal(order.items[0].selectedWeight, label); assert.equal(order.items[0].price, merchantPrice);
    const exported = buildWaProductRows([saved]).find(row => row.name.endsWith(`(${label})`));
    assert.equal(exported?.price, merchantPrice); assert.equal(exported?.base_product_id, seed.id);
  }
});

test('long-label exception is product-specific and does not loosen new commerce, arbitrary labels, IDs or duplicates', () => {
  const seed = affected[0]; const record = storedCatalogRecord(seed.id, seed).pricing;
  const index = record.variants.findIndex(variant => variant.label.length > 40);
  const canonical = structuredClone(record); assert.doesNotThrow(() => validateCatalogPricing(canonical, seed));
  for (const label of [canonical.variants[index].label + ' extra', 'Filled ' + 'x'.repeat(80), 'x'.repeat(161), canonical.variants[index].label + '\n']) {
    const changed = structuredClone(canonical); changed.variants[index] = { ...changed.variants[index], label, id: catalogVariantId(label) };
    assert.throws(() => validateCatalogPricing(changed, seed), /INVALID_CATALOG_VARIANT/);
  }
  const wrongProduct = PRODUCTS.find(product => product.id === 'pista')!;
  assert.throws(() => validateCatalogPricing({ ...canonical, productId: wrongProduct.id }, wrongProduct), /INVALID_CATALOG_VARIANT|INVALID_CATALOG_UNIT/);
  const duplicate = structuredClone(canonical); duplicate.variants.push(duplicate.variants[index]); assert.throws(() => validateCatalogPricing(duplicate, seed), /INVALID_CATALOG_VARIANT/);
  const wrongId = structuredClone(canonical); wrongId.variants[index].id = 'other'; assert.throws(() => validateCatalogPricing(wrongId, seed), /INVALID_CATALOG_VARIANT/);
  assert.throws(() => validateDynamicProduct({ ...seed, id: 'merchant-other', prices: { [canonical.variants[index].label]: 500 } }), /INVALID_PORTION_KEY/);
  assert.throws(() => validateProductCommerce({ version: 1, kind: 'packaging', pricingMode: 'manual', quantityMode: 'fixed', baseUnit: 'piece', baseQuantity: null, basePrice: null,
    custom: null, options: [{ label: canonical.variants[index].label, quantity: 1, unit: 'piece', override: false, available: true, shippingWeightG: 500 }] }), /INVALID_COMMERCE_LABEL/);
});

test('read compatibility never materializes prices, activates missing affected records or revives archived merchant items', async () => {
  const empty = memoryFirestore(); invalidateCatalogCache(); const absent = await loadAuthoritativeCatalog(empty.db, { fresh: true });
  for (const seed of affected) { const product = absent.products.find(product => product.id === seed.id)!; assert.equal(product.active, false); assert.deepEqual(product.prices, {}); }
  assert.equal(empty.records.size, 0);
  const initial = Object.fromEntries(PRODUCTS.map(product => [`products/${product.id}`, structuredClone(product)]));
  const fixture = memoryFirestore(initial); const before = JSON.stringify([...fixture.records]); invalidateCatalogCache();
  const loaded = await loadAuthoritativeCatalog(fixture.db, { fresh: true }); assert.deepEqual(loaded.invalidProductIds.filter(id=>PRODUCTS.some(product=>product.id===id)), []);
  for (const seed of PRODUCTS) assert.deepEqual(loaded.products.find(product => product.id === seed.id)!.prices, seed.prices, seed.id);
  assert.equal(JSON.stringify([...fixture.records]), before);
  const archived = memoryFirestore({ [`products/${affected[0].id}`]: { ...affected[0], active: false, status: 'archived' } });
  invalidateCatalogCache(); assert.equal((await loadAuthoritativeCatalog(archived.db, { fresh: true })).products.find(product => product.id === affected[0].id)!.active, false);
});

test('legacy publication inference is restricted to known public seeds and never publishes explicit drafts or new products', async () => {
  const seed = PRODUCTS.find(product => product.id === 'pista')!;
  for (const marker of [{ status: 'draft' }, { publicationStatus: 'draft' }, { isDraft: true }, { active: false, status: 'archived' }, { inStock: false }]) {
    const { db, records } = memoryFirestore({ [`products/${seed.id}`]: { ...seed, ...marker, revision: 3 } });
    const loaded = await getAdminProductRecord(db, seed.id); assert.notEqual(loaded.status, 'published');
    const saved = await updateAdminProduct({ db, productId: seed.id, actorUid: 'fixture-owner', body: { expectedRevision: 3, desc_en: 'Preserved private draft content' } });
    assert.notEqual(saved.status, 'published'); assert.notEqual((records.get(`products/${seed.id}`) as any).status, 'published');
  }
  const fresh = memoryFirestore({ 'products/merchant-new': { ...seed, id: 'merchant-new', revision: 1 } });
  assert.equal((await getAdminProductRecord(fresh.db, 'merchant-new')).status, 'draft');
  const published = memoryFirestore({ [`products/${seed.id}`]: { ...seed, revision: 1 } });
  assert.equal((await getAdminProductRecord(published.db, seed.id)).status, 'published');
  const explicit = await updateAdminProduct({ db: published.db, productId: seed.id, actorUid: 'fixture-owner', body: { expectedRevision: 1, status: 'draft', active: false } });
  assert.equal(explicit.status, 'draft');
});
