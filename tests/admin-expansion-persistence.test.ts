import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { memoryFirestore } from './helpers/memoryFirestore';
import { createAdminProduct, updateAdminProduct, publishAdminProduct, loadAuthoritativeCatalog, getAdminCatalogRecord, updateCatalogPricing, invalidateCatalogCache } from '../src/lib/catalogStore';
import { createCatalogConfigurationRouter } from '../src/lib/catalogConfigurationRouter';
import { DEFAULT_CATALOG_CONFIGURATION } from '../src/lib/catalogConfiguration';
import { stripPrivateProductFields } from '../src/lib/catalogSchema';
import { resolveCustomWeight } from '../src/lib/productVariants';

const draft = () => ({ id: 'merchant-saffron', name_en: 'Merchant saffron', name_ur: '', name_ar: '', category: 'herbs-spices',
  desc_en: '', status: 'draft', active: false, prices: {}, commerce: { version: 1, kind: 'food', pricingMode: 'manual', quantityMode: 'fixed',
    baseQuantity: null, baseUnit: 'mg', basePrice: null, options: [], custom: null } });

test('new item draft, configured rates, reload, publish and stale edits use the real catalog services', async () => {
  const { db, records } = memoryFirestore();
  const created = await createAdminProduct({ db, body: draft(), actorUid: 'owner' });
  assert.deepEqual(created.prices, {});
  assert.equal(created.status, 'draft');
  assert.equal(created.name_ur, '');
  await assert.rejects(publishAdminProduct({ db, productId: created.id, expectedRevision: created.revision, actorUid: 'owner' }), /PRODUCT_REQUIRES_PRICING|PUBLISH_CONTENT_REQUIRED/);
  assert.equal((records.get(`products/${created.id}`) as any).status, 'draft');
  const commerce = { ...draft().commerce, pricingMode: 'calculated', quantityMode: 'both', baseQuantity: 1, baseUnit: 'g', basePrice: 1000,
    options: [{ label: '500mg', quantity: 500, unit: 'mg', available: true, override: false, shippingWeightG: 10 }],
    custom: { unit: 'mg', min: 250, max: 1000, step: 250, shippingWeightGPerUnit: null } };
  const saved = await updateAdminProduct({ db, productId: created.id, actorUid: 'owner', body: { expectedRevision: created.revision,
    commerce, image: '/images/product-placeholder.svg', desc_en: 'Merchant-confirmed product details.', supplierCost: 42,
    seo: { title_en: 'Merchant saffron in Lahore' } } });
  assert.equal(saved.prices['500mg'], 500);
  const published = await publishAdminProduct({ db, productId: created.id, expectedRevision: saved.revision, actorUid: 'owner' });
  assert.equal(published.status, 'published');
  invalidateCatalogCache();
  const loaded = (await loadAuthoritativeCatalog(db, { fresh: true })).products.find(p => p.id === created.id)!;
  assert.equal(loaded.prices['500mg'], 500);
  assert.equal(resolveCustomWeight(loaded, 'Custom 750mg').price, 750);
  assert.equal(loaded.seo?.title_en, 'Merchant saffron in Lahore');
  assert.equal(stripPrivateProductFields(loaded).supplierCost, undefined);
  const previousRevision = loaded.catalogRevision;
  (records.get(`products/${created.id}`) as any).commerce.custom.step = 125;
  invalidateCatalogCache();
  const reconfigured = (await loadAuthoritativeCatalog(db, { fresh: true })).products.find(p => p.id === created.id)!;
  assert.notEqual(reconfigured.catalogRevision, previousRevision, 'direct configuration edits invalidate quote fingerprints even without a revision bump');
  const metadataEdit = await updateAdminProduct({ db, productId: created.id, actorUid: 'owner', body: { expectedRevision: published.revision, name_en: 'Merchant renamed saffron' } });
  assert.equal(metadataEdit.prices['500mg'], 500, 'metadata-only edits retain canonical selling prices');
  await assert.rejects(updateAdminProduct({ db, productId: created.id, actorUid: 'owner', body: { expectedRevision: created.revision, name_en: 'Old edit' } }), /CATALOG_REVISION_CONFLICT/);
  const record = await getAdminCatalogRecord(db, created.id);
  await assert.rejects(updateCatalogPricing({ db, productId: created.id, actorUid: 'owner', body: { expectedRevision: record.pricing.revision, expectedVersion: record.version, pricing: record.pricing } }), /USE_PRODUCT_OPTIONS_EDITOR/);
});

test('configuration HTTP routes persist templates/taxonomy, deny customers and reject stale or destructive saves', async () => {
  const { db } = memoryFirestore();
  const app = express();app.use(express.json());
  app.use(createCatalogConfigurationRouter({ getDb: () => db, requireAdmin: (request, response, next) => {
    if (request.headers.authorization !== 'Bearer owner') return response.status(403).json({ code: 'FORBIDDEN_ADMIN' });
    (request as any).user = { uid: 'owner' };next();
  } }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal((await fetch(`${origin}/api/admin/catalog/configuration`)).status, 403);
    const initial = await (await fetch(`${origin}/api/admin/catalog/configuration`, { headers: { Authorization: 'Bearer owner' } })).json();
    assert.equal(initial.configuration.revision, 0);
    const configuration = structuredClone(DEFAULT_CATALOG_CONFIGURATION);
    configuration.taxonomy.push({ id: 'merchant-seasonal', type: 'category', name_en: 'Seasonal', name_ur: '', name_ar: '', description_en: '', description_ur: '', description_ar: '', visible: true });
    const save = () => fetch(`${origin}/api/admin/catalog/configuration`, { method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, configuration }) });
    assert.equal((await save()).status, 200);
    assert.equal((await save()).status, 409);
    const publicConfig = await (await fetch(`${origin}/api/catalog/taxonomy`)).json();
    assert.ok(publicConfig.taxonomy.some((entry: any) => entry.id === 'merchant-seasonal'));
    assert.equal(publicConfig.templates, undefined);
    const broken = { ...configuration, revision: 1, taxonomy: [] };
    const result = await fetch(`${origin}/api/admin/catalog/configuration`, { method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 1, configuration: broken }) });
    assert.equal(result.status, 400);
  } finally { server.closeAllConnections();await new Promise<void>(resolve => server.close(() => resolve())); }
});
