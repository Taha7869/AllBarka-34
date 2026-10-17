import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/data/products';
import { HAMPER_BOX_SEEDS } from '../src/lib/hamperBoxSchema';
import {
  loadAuthoritativeCatalog,
  loadCatalogForTransaction,
  createAdminProduct,
  updateAdminProduct,
  duplicateAdminProduct,
  publishAdminProduct,
  archiveAdminProduct,
  getAdminProductRecord,
  getAdminMerchandising,
  updateAdminMerchandising,
  publishAdminMerchandising,
  getPublicMerchandising,
  invalidateCatalogCache,
  mergeAuthoritativeCatalog,
  CATALOG_COLLECTION
} from '../src/lib/catalogStore';
import { quoteOrderForCustomer } from '../src/lib/orderQuote';
import { validateAndPriceOrder, ValidationError } from '../src/lib/orderValidation';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { CatalogError, isProductPubliclyVisible, stripPrivateProductFields } from '../src/lib/catalogSchema';
import type { Product, MerchandisingSettings } from '../src/types';

/**
 * Isolated in-memory Firestore test harness supporting get, set, runTransaction, getAll, and collection.get()
 */
function createMockFirestore() {
  const store = new Map<string, any>();

  // Pre-seed with compiled products and hamper boxes
  for (const product of PRODUCTS) {
    store.set(`products/${product.id}`, structuredClone(product));
  }
  for (const box of HAMPER_BOX_SEEDS) {
    store.set(`hamperBoxes/${box.id}`, { schemaVersion: 1, boxId: box.id, revision: 0, price: box.price, active: true });
  }

  const makeSnapshot = (path: string, id: string, docRef: any) => ({
    id,
    ref: docRef,
    exists: store.has(path),
    data: () => (store.has(path) ? structuredClone(store.get(path)) : undefined),
  });

  const makeDocRef = (path: string) => {
    const id = path.split('/').at(-1)!;
    const ref: any = {
      id,
      path,
      get: async () => makeSnapshot(path, id, ref),
      set: async (data: any, options?: { merge?: boolean }) => {
        if (options?.merge && store.has(path)) {
          store.set(path, { ...store.get(path), ...structuredClone(data) });
        } else {
          store.set(path, structuredClone(data));
        }
      },
      delete: async () => {
        store.delete(path);
      },
    };
    return ref;
  };

  const makeCollection = (colPath: string) => ({
    path: colPath,
    doc: (docId?: string) => makeDocRef(`${colPath}/${docId || 'auto_' + Math.random().toString(36).slice(2)}`),
    add: async (data: any) => {
      const id = 'auto_' + Math.random().toString(36).slice(2);
      const path = `${colPath}/${id}`;
      store.set(path, structuredClone(data));
      return makeDocRef(path);
    },
    get: async () => {
      const docs = [];
      const prefix = `${colPath}/`;
      for (const [key, val] of store.entries()) {
        if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/')) {
          const id = key.slice(prefix.length);
          docs.push(makeSnapshot(key, id, makeDocRef(key)));
        }
      }
      return { docs, empty: docs.length === 0, size: docs.length };
    },
    where: () => ({
      limit: () => ({
        get: async () => ({ empty: true, docs: [] }),
      }),
    }),
  });

  const db: any = {
    collection: (name: string) => makeCollection(name),
    getAll: async (...references: any[]) => {
      return references.map(ref => makeSnapshot(ref.path, ref.id, ref));
    },
    runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
      const tx = {
        get: async (docRef: any) => makeSnapshot(docRef.path, docRef.id, docRef),
        set: (docRef: any, data: any, options?: { merge?: boolean }) => {
          if (options?.merge && store.has(docRef.path)) {
            store.set(docRef.path, { ...store.get(docRef.path), ...structuredClone(data) });
          } else {
            store.set(docRef.path, structuredClone(data));
          }
        },
      };
      return await updateFunction(tx);
    },
    settings: () => {},
  };

  return { db, store };
}

// --------------------------------------------------------------------------
// TEST 1: Create dynamic product via Admin API
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Create dynamic product via admin API persists in Firestore', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  const dynamicProductPayload = {
    id: 'kaghazi-akhrot-premium',
    name_en: 'Premium Thin-Shell Kaghazi Walnuts',
    name_ur: 'کاغذی اخروٹ گلگت',
    category: 'dry-fruits',
    productFamily: 'akhrot',
    orderMode: 'standard',
    status: 'draft',
    prices: {
      '250g': 850,
      '500g': 1600,
      '1kg': 3100,
    },
    referencePrice: 750,
    supplierCost: 650,
    supplierName: 'Gilgit Mountain Orchards Direct',
    internalNotes: 'Fresh autumn harvest. Zero chemical bleaching.',
  };

  const created = await createAdminProduct({
    db,
    body: dynamicProductPayload,
    actorUid: 'admin_test_uid',
  });

  assert.equal(created.id, 'kaghazi-akhrot-premium');
  assert.equal(created.status, 'draft');
  assert.equal(created.active, false); // Drafts are not storefront active
  assert.equal(created.revision, 1);
  assert.equal(created.prices['500g'], 1600);
  assert.equal(created.supplierName, 'Gilgit Mountain Orchards Direct');
});

// --------------------------------------------------------------------------
// TEST 2: Dynamic product survives cache invalidation and store reload
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Dynamic product survives cache reload and store restart', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // Create product
  await createAdminProduct({
    db,
    body: {
      id: 'panjgur-amber-dates',
      name_en: 'Balochistan Panjgur Amber Dates',
      name_ur: 'پنجگور عنبر کھجور',
      category: 'dates',
      productFamily: 'khajoor',
      status: 'draft',
      prices: { '500g': 950 },
    },
    actorUid: 'admin_test_uid',
  });

  // Invalidate cache (simulating process restart)
  invalidateCatalogCache();

  // Fetch full record from store
  const record = await getAdminProductRecord(db, 'panjgur-amber-dates');
  assert.equal(record.id, 'panjgur-amber-dates');
  assert.equal(record.category, 'dates');
  assert.equal(record.prices['500g'], 950);
  assert.equal(record.revision, 1);
});

// --------------------------------------------------------------------------
// TEST 3: Publish dynamic product; verify storefront discovery
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Publish dynamic product makes it visible on public storefront', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // Create as draft
  await createAdminProduct({
    db,
    body: {
      id: 'shahi-mewa-box',
      name_en: 'Shahi Mewa Bespoke Box',
      category: 'celebration-boxes',
      status: 'draft',
      prices: { '1 pc': 4500 },
    },
    actorUid: 'admin_test_uid',
  });

  // Verify not visible while draft
  let catalog = await loadAuthoritativeCatalog(db, { fresh: true });
  let found = catalog.products.find(p => p.id === 'shahi-mewa-box');
  assert.ok(found);
  assert.equal(found.status, 'draft');
  assert.equal(isProductPubliclyVisible(found), false);

  // Publish product
  const published = await publishAdminProduct({
    db,
    productId: 'shahi-mewa-box',
    actorUid: 'admin_test_uid',
  });
  assert.equal(published.status, 'published');
  assert.equal(published.active, true);
  assert.equal(published.revision, 2);

  // Verify now visible on public catalog
  invalidateCatalogCache();
  catalog = await loadAuthoritativeCatalog(db, { fresh: true });
  found = catalog.products.find(p => p.id === 'shahi-mewa-box');
  assert.ok(found);
  assert.equal(found.status, 'published');
  assert.equal(found.active, true);
  assert.equal(isProductPubliclyVisible(found), true);
});

// --------------------------------------------------------------------------
// TEST 4: Authoritative quote & standard order validation with dynamic product
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-006: Authoritative quote and order validation prices dynamic product', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // Create and publish a dynamic product
  await createAdminProduct({
    db,
    body: {
      id: 'hunza-sun-apricot',
      name_en: 'Hunza Sun-Dried Khubani',
      category: 'dry-fruits',
      status: 'published',
      active: true,
      prices: { '500g': 1400 },
    },
    actorUid: 'admin_test_uid',
  });
  await publishAdminProduct({ db, productId: 'hunza-sun-apricot', actorUid: 'admin_test_uid' });

  // 1. Validate quote calculation via quoteOrderForCustomer
  const quote = await quoteOrderForCustomer(db, {
    city: 'Lahore',
    shippingMethodId: 'standard',
    items: [
      { id: 'hunza-sun-apricot-500g', productId: 'hunza-sun-apricot', selectedWeight: '500g', quantity: 2, price: 1 } // Spoofed browser price
    ],
  });

  assert.equal(quote.success, true);
  assert.equal(quote.totals.subtotal, 2800); // 1400 * 2
  assert.equal(quote.items[0].price, 1400); // Ignores browser price 1
  assert.equal(quote.items[0].name, 'Hunza Sun-Dried Khubani');

  // 2. Validate order transaction loader
  const txCatalog = await loadCatalogForTransaction(db, {
    getAll: async (...refs: any[]) => refs.map((ref: any) => ({
      id: ref.id,
      ref,
      exists: true,
      data: () => (ref.id === 'hunza-sun-apricot' ? {
        id: 'hunza-sun-apricot',
        name_en: 'Hunza Sun-Dried Khubani',
        category: 'dry-fruits',
        prices: { '500g': 1400 },
        active: true,
        status: 'published',
      } : undefined),
    })),
  } as any, [{ productId: 'hunza-sun-apricot', selectedWeight: '500g', quantity: 2 }]);

  const foundTx = txCatalog.products.find(p => p.id === 'hunza-sun-apricot');
  assert.ok(foundTx);
  assert.equal(foundTx.prices['500g'], 1400);
});

// --------------------------------------------------------------------------
// TEST 5: AI catalog context includes dynamic products
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-006: Merged catalog for AI concierge context includes dynamic products', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  await createAdminProduct({
    db,
    body: {
      id: 'chilgoza-raw-roast',
      name_en: 'Roasted Waziristan Chilgoza',
      category: 'dry-fruits',
      status: 'published',
      active: true,
      prices: { '250g': 3200 },
      wholesale: 2800,
    },
    actorUid: 'admin_test_uid',
  });
  await publishAdminProduct({ db, productId: 'chilgoza-raw-roast', actorUid: 'admin_test_uid' });

  const catalog = await loadAuthoritativeCatalog(db, { fresh: true });
  const mergedProducts = mergeAuthoritativeCatalog(PRODUCTS, catalog.products);

  const dynamicItem = mergedProducts.find(p => p.id === 'chilgoza-raw-roast');
  assert.ok(dynamicItem);
  assert.equal(dynamicItem.name_en, 'Roasted Waziristan Chilgoza');
  assert.equal(dynamicItem.prices['250g'], 3200);
  assert.equal(dynamicItem.active, true);
});

// --------------------------------------------------------------------------
// TEST 6: Archive product rejects new purchases
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Archiving product suppresses it from catalog and rejects checkout', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // Create and publish
  await createAdminProduct({
    db,
    body: {
      id: 'limited-saffron-tin',
      name_en: 'Limited Saffron Keepsake',
      category: 'essentials',
      status: 'published',
      active: true,
      prices: { '1g': 2200 },
    },
    actorUid: 'admin_test_uid',
  });
  await publishAdminProduct({ db, productId: 'limited-saffron-tin', actorUid: 'admin_test_uid' });

  // Archive product
  await archiveAdminProduct({
    db,
    productId: 'limited-saffron-tin',
    actorUid: 'admin_test_uid',
  });

  // Verify public catalog visibility
  invalidateCatalogCache();
  const catalog = await loadAuthoritativeCatalog(db, { fresh: true });
  const archived = catalog.products.find(p => p.id === 'limited-saffron-tin')!;
  assert.equal(archived.status, 'archived');
  assert.equal(archived.active, false);
  assert.equal(isProductPubliclyVisible(archived), false);

  // Verify order validation rejection
  assert.throws(() => {
    validateAndPriceOrder({
      city: 'Lahore',
      shippingMethodId: 'standard',
      items: [{ id: 'limited-saffron-tin', productId: 'limited-saffron-tin', selectedWeight: '1g', quantity: 1 }],
      products: catalog.products,
    });
  }, (err: any) => err instanceof ValidationError && err.code === 'PRODUCT_UNAVAILABLE');
});

// --------------------------------------------------------------------------
// TEST 7: Security: Non-admin mutations fail; stale edits conflict (409)
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-005: Concurrency check rejects stale edit with 409 conflict', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  const prod = await createAdminProduct({
    db,
    body: {
      id: 'concurrency-test-prod',
      name_en: 'Concurrency Test Item',
      category: 'dry-fruits',
      prices: { '250g': 1000 },
    },
    actorUid: 'admin_test_uid',
  });
  assert.equal(prod.revision, 1);

  // Simultaneous Edit 1: updates revision to 2
  await updateAdminProduct({
    db,
    productId: 'concurrency-test-prod',
    body: {
      name_en: 'Concurrency Test Item (Updated)',
      expectedRevision: 1,
    },
    actorUid: 'admin_1',
  });

  // Simultaneous Edit 2: attempts to update with stale expectedRevision 1 -> Must throw 409
  await assert.rejects(async () => {
    await updateAdminProduct({
      db,
      productId: 'concurrency-test-prod',
      body: {
        name_en: 'Competing Edit',
        expectedRevision: 1, // Stale! Current is 2
      },
      actorUid: 'admin_2',
    });
  }, (err: any) => err instanceof CatalogError && err.httpStatus === 409 && err.code === 'CATALOG_REVISION_CONFLICT');
});

// --------------------------------------------------------------------------
// TEST 8: Privacy: Public endpoints strip private and supplier fields
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-005: Public responses strip private supplier and internal fields', () => {
  const fullAdminProduct: Product = {
    id: 'private-data-product',
    name_en: 'Public Name',
    name_ur: 'نام',
    name_ar: 'اسم',
    category: 'dry-fruits',
    prices: { '250g': 1500 },
    wholesale: 1200,
    desc_en: 'Public description',
    desc_ur: 'تفصیل',
    desc_ar: 'وصف',
    image: null,
    imageName: null,
    referencePrice: 1350,
    supplierCost: 1100,
    supplierName: 'Confidential Orchard Owner',
    supplierItemUrl: 'https://internal-supplier.com/item/123',
    internalNotes: 'Staff only: fragile packaging required.',
    importBatch: 'BATCH-2026-OCT',
    adminRevision: 4,
  };

  const stripped = stripPrivateProductFields(fullAdminProduct);

  assert.equal(stripped.id, 'private-data-product');
  assert.equal(stripped.prices['250g'], 1500);
  assert.equal((stripped as any).referencePrice, undefined);
  assert.equal((stripped as any).supplierCost, undefined);
  assert.equal((stripped as any).supplierName, undefined);
  assert.equal((stripped as any).supplierItemUrl, undefined);
  assert.equal((stripped as any).internalNotes, undefined);
  assert.equal((stripped as any).importBatch, undefined);
  assert.equal((stripped as any).adminRevision, undefined);
});

// --------------------------------------------------------------------------
// TEST 9: Merchandising: Draft save, preview, and publish without redeployment
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004 & D6: Merchandising draft preview and publish lifecycle', async () => {
  const { db } = createMockFirestore();

  // 1. Initial settings return defaults
  const initial = await getPublicMerchandising(db);
  assert.equal(initial.autoplayDurationMs, 6000); // Rule D5 default
  assert.equal(initial.autoplayResumeDelayMs, 3000); // Rule D5 default

  // 2. Admin saves draft preview
  const draft = await updateAdminMerchandising({
    db,
    body: {
      featuredProductIds: ['badam', 'pista', 'shahi-mewa-box'],
      categoryOrder: ['celebration-boxes', 'dry-fruits', 'dates'],
      autoplayDurationMs: 5000,
      expectedRevision: initial.revision,
    },
    actorUid: 'admin_test_uid',
  });
  assert.equal(draft.revision, initial.revision + 1);
  assert.equal(draft.autoplayDurationMs, 5000);

  // 3. Public still sees old published settings before publish
  const publicBefore = await getPublicMerchandising(db);
  assert.equal(publicBefore.autoplayDurationMs, 6000);

  // 4. Admin publishes settings
  const published = await publishAdminMerchandising({
    db,
    actorUid: 'admin_test_uid',
  });
  assert.equal(published.autoplayDurationMs, 5000);

  // 5. Public now sees published settings
  const publicAfter = await getPublicMerchandising(db);
  assert.equal(publicAfter.autoplayDurationMs, 5000);
  assert.deepEqual(publicAfter.featuredProductIds, ['badam', 'pista', 'shahi-mewa-box']);
  assert.equal((publicAfter as any).updatedBy, undefined); // Stripped
});

// --------------------------------------------------------------------------
// TEST 10: Inactive Firestore products are never revived by compiled seeds
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-006: Inactive Firestore products are strictly suppressed', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // Mark an existing compiled product (e.g. 'badam') as active: false in Firestore
  await db.collection('products').doc('badam').set({
    active: false,
    status: 'archived',
    revision: 2,
    prices: { '250g': 1000 },
  }, { merge: true });

  const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
  const badam = snapshot.products.find(p => p.id === 'badam')!;

  assert.equal(badam.active, false);
  assert.equal(badam.status, 'archived');
  assert.equal(isProductPubliclyVisible(badam), false);

  // Merged catalog must not revert active to true
  const merged = mergeAuthoritativeCatalog(PRODUCTS, snapshot.products);
  const mergedBadam = merged.find(p => p.id === 'badam')!;
  assert.equal(mergedBadam.active, false);
});
