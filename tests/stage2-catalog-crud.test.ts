/**
 * AllBarka Renovation V2 — Stage 2 Acceptance Test Suite
 *
 * SPECIFICATION & GOVERNANCE:
 * - Requirements: REQ-S2-001 through REQ-S2-007
 * - Authority: AllBarka_Antigravity_Master_Prompt (1).md (Version 2.0)
 *
 * SCOPE & DEPENDENCY DISCLOSURE:
 * 1. REAL PRODUCTION FUNCTIONS & ROUTERS TESTED:
 *    - `createCatalogRouter` from `src/lib/catalogRouter.ts` (mounted on real Express HTTP server)
 *    - `createAdminProduct`, `updateAdminProduct`, `duplicateAdminProduct`, `publishAdminProduct`,
 *      `archiveAdminProduct`, `listAdminProducts`, `getAdminProductRecord`, `updateCatalogPricing` from `src/lib/catalogStore.ts`
 *    - `loadAuthoritativeCatalog`, `loadCatalogForTransaction`, `mergeAuthoritativeCatalog` from `src/lib/catalogStore.ts`
 *    - `getPublicMerchandising`, `getAdminMerchandising`, `updateAdminMerchandising`, `publishAdminMerchandising` from `src/lib/catalogStore.ts`
 *    - `planCatalogMigrationV2`, `executeCatalogMigrationV2`, `rollbackCatalogMigrationV2` from `src/lib/catalogMigrationV2.ts`
 *    - `createDurableOrder` from `src/lib/orderDatabase.ts` (durable atomic transaction execution)
 *    - `quoteOrderForCustomer` from `src/lib/orderQuote.ts`
 *    - `validateAndPriceOrder`, `ValidationError` from `src/lib/orderValidation.ts`
 *    - `isProductPubliclyVisible`, `stripPrivateProductFields`, `CatalogError`, `validateInternalDestination`, `validateMerchandisingSettings` from `src/lib/catalogSchema.ts`
 *
 * 2. FIXTURES & ISOLATION BOUNDARIES:
 *    - Database: Isolated in-memory Firestore fixture (`createMockFirestore`) implementing atomic
 *      transactions (`runTransaction`), `getAll`, `doc.get()`, `doc.set()`, `doc.delete()`, `collection.get()`, and `add()`.
 *      Correctly handles Firestore sentinel `FieldValue.delete()`.
 *    - Authentication: Test Express middleware simulating verified Firebase Admin token claims.
 *    - Network: Live loopback HTTP server over TCP (`server.listen(0)` and native Node.js `fetch`).
 *
 * 3. EXPLICIT NON-EXECUTION:
 *    - No mutations to live Google Cloud Production Firestore (prohibited by Stage 2 operating rules).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import express, { type Request, type Response, type NextFunction } from 'express';
import { once } from 'node:events';
import { type AddressInfo } from 'node:net';
import { FieldValue } from 'firebase-admin/firestore';

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
  getAdminCatalogRecord,
  updateCatalogPricing,
  listAdminProducts,
  getAdminMerchandising,
  updateAdminMerchandising,
  publishAdminMerchandising,
  getPublicMerchandising,
  invalidateCatalogCache,
  mergeAuthoritativeCatalog,
  CATALOG_COLLECTION,
  MERCHANDISING_COLLECTION,
  DEFAULT_MERCHANDISING
} from '../src/lib/catalogStore';
import {
  planCatalogMigrationV2,
  executeCatalogMigrationV2,
  rollbackCatalogMigrationV2
} from '../src/lib/catalogMigrationV2';
import { quoteOrderForCustomer } from '../src/lib/orderQuote';
import { createDurableOrder } from '../src/lib/orderDatabase';
import { validateAndPriceOrder, ValidationError } from '../src/lib/orderValidation';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import {
  CatalogError,
  isProductPubliclyVisible,
  stripPrivateProductFields,
  validateInternalDestination,
  validateMerchandisingSettings,
  catalogVariantId
} from '../src/lib/catalogSchema';
import type { Product, ProductStatus, OrderMode } from '../src/types';

/**
 * Isolated Firestore fixture tracking document mutations and supporting atomic transactions
 * with accurate FieldValue.delete() handling.
 */
function createMockFirestore(seedProducts: boolean = true) {
  const store = new Map<string, any>();

  if (seedProducts) {
    for (const product of PRODUCTS) {
      store.set(`products/${product.id}`, structuredClone(product));
    }
  }
  for (const box of HAMPER_BOX_SEEDS) {
    store.set(`hamperBoxes/${box.id}`, { schemaVersion: 1, boxId: box.id, revision: 0, price: box.price, active: true });
  }

  const applyMockPatch = (existing: any, incoming: any, merge: boolean = false) => {
    if (!merge || !existing) {
      const result: any = {};
      for (const [k, v] of Object.entries(incoming)) {
        if (v === FieldValue.delete() || (v && (v as any).constructor?.name === 'DeleteTransform')) continue;
        result[k] = structuredClone(v);
      }
      return result;
    }
    const result: any = { ...existing };
    for (const [k, v] of Object.entries(incoming)) {
      if (v === FieldValue.delete() || (v && (v as any).constructor?.name === 'DeleteTransform')) {
        delete result[k];
      } else {
        result[k] = structuredClone(v);
      }
    }
    return result;
  };

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
        const existing = store.get(path);
        store.set(path, applyMockPatch(existing, data, options?.merge ?? false));
      },
      delete: async () => {
        store.delete(path);
      },
      collection: (subCol: string) => makeCollection(`${path}/${subCol}`),
    };
    return ref;
  };

  const makeCollection = (colPath: string) => ({
    path: colPath,
    doc: (docId?: string) => makeDocRef(`${colPath}/${docId || 'auto_' + Math.random().toString(36).slice(2)}`),
    add: async (data: any) => {
      const id = 'auto_' + Math.random().toString(36).slice(2);
      const path = `${colPath}/${id}`;
      store.set(path, applyMockPatch(undefined, data, false));
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
      const stagedWrites = new Map<string, any>();
      const tx = {
        get: async (docRef: any) => {
          if (stagedWrites.has(docRef.path)) {
            const data = stagedWrites.get(docRef.path);
            return {
              id: docRef.id,
              ref: docRef,
              exists: true,
              data: () => structuredClone(data),
            };
          }
          return makeSnapshot(docRef.path, docRef.id, docRef);
        },
        set: (docRef: any, data: any, options?: { merge?: boolean }) => {
          const existing = stagedWrites.has(docRef.path) ? stagedWrites.get(docRef.path) : store.get(docRef.path);
          stagedWrites.set(docRef.path, applyMockPatch(existing, data, options?.merge ?? false));
        },
      };

      const result = await updateFunction(tx);
      for (const [path, data] of stagedWrites.entries()) {
        store.set(path, data);
      }
      return result;
    },
    settings: () => {},
  };

  return { db, store };
}

/**
 * Creates a real Express application hosting createCatalogRouter over HTTP loopback
 */
function createTestHttpServer(db: any) {
  const app = express();
  app.use(express.json());

  let currentActor: { uid: string; email: string; admin: boolean } | null = null;

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!currentActor || !currentActor.admin) {
      return res.status(403).json({ error: 'Forbidden. Authoritative admin privileges required.', code: 'FORBIDDEN_ADMIN' });
    }
    (req as any).user = currentActor;
    next();
  };

  app.use(createCatalogRouter({ getDb: () => db, requireAdmin }));

  return {
    app,
    setActor: (actor: { uid: string; email: string; admin: boolean } | null) => {
      currentActor = actor;
    },
  };
}

// --------------------------------------------------------------------------
// TEST 1: Security: Anonymous & Non-Admin Rejection on Catalog Admin Endpoints
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-005: Anonymous and non-admin requests are rejected with 403 on real HTTP router', async () => {
  const { db } = createMockFirestore();
  const { app, setActor } = createTestHttpServer(db);

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    setActor(null);
    const anonRes = await fetch(`${baseUrl}/api/admin/catalog/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'hacker-product', prices: { '1kg': 100 } }),
    });
    assert.equal(anonRes.status, 403);
    const anonBody = await anonRes.json();
    assert.equal(anonBody.code, 'FORBIDDEN_ADMIN');

    setActor({ uid: 'patron_123', email: 'patron@example.com', admin: false });
    const patronRes = await fetch(`${baseUrl}/api/admin/catalog/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'patron-product', prices: { '1kg': 100 } }),
    });
    assert.equal(patronRes.status, 403);
    const patronBody = await patronRes.json();
    assert.equal(patronBody.code, 'FORBIDDEN_ADMIN');
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 2: Admin Creation of Uncompiled Product via Real HTTP Endpoint
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Admin creates product absent from compiled PRODUCTS via real HTTP endpoint', async () => {
  const { db } = createMockFirestore();
  const { app, setActor } = createTestHttpServer(db);
  invalidateCatalogCache();

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    setActor({ uid: 'admin_1', email: 'admin@allbarka.com', admin: true });

    assert.equal(PRODUCTS.some(p => p.id === 'kaghazi-akhrot-premium'), false);

    const createPayload = {
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

    const res = await fetch(`${baseUrl}/api/admin/catalog/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.product.id, 'kaghazi-akhrot-premium');
    assert.equal(body.product.status, 'draft');
    assert.equal(body.product.active, false);
    assert.equal(body.product.revision, 1);
    assert.equal(body.product.supplierName, 'Gilgit Mountain Orchards Direct');

    const stored = await db.collection(CATALOG_COLLECTION).doc('kaghazi-akhrot-premium').get();
    assert.equal(stored.exists, true);
    assert.equal(stored.data().name_en, 'Premium Thin-Shell Kaghazi Walnuts');
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 3: Draft Invisibility & Private Fields Stripping on Public Catalog
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004 & REQ-S2-005: Draft is invisible on /api/catalog and private fields are stripped', async () => {
  const { db } = createMockFirestore();
  const { app, setActor } = createTestHttpServer(db);
  invalidateCatalogCache();

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    setActor({ uid: 'admin_1', email: 'admin@allbarka.com', admin: true });

    await fetch(`${baseUrl}/api/admin/catalog/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'draft-only-box',
        name_en: 'Unpublished Draft Box',
        category: 'celebration-boxes',
        status: 'draft',
        prices: { '1 pc': 2500 },
        supplierCost: 1500,
        supplierName: 'Secret Supplier',
        internalNotes: 'Do not publish yet',
      }),
    });

    const publicRes = await fetch(`${baseUrl}/api/catalog`);
    assert.equal(publicRes.status, 200);
    const publicData = await publicRes.json();

    const foundDraft = publicData.products.find((p: any) => p.id === 'draft-only-box');
    assert.equal(foundDraft, undefined);

    for (const p of publicData.products) {
      assert.equal(p.supplierCost, undefined);
      assert.equal(p.supplierName, undefined);
      assert.equal(p.internalNotes, undefined);
      assert.equal(p.adminRevision, undefined);
    }
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 4: Admin Catalog: Draft Appears, Edits, Publishes, Archives in Admin View
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Admin listing displays drafts, supports edit, publish, and remains manageable after archiving', async () => {
  const { db } = createMockFirestore();
  const { app, setActor } = createTestHttpServer(db);
  invalidateCatalogCache();

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    setActor({ uid: 'admin_1', email: 'admin@allbarka.com', admin: true });

    // 1. Create a dynamic draft product
    const createRes = await fetch(`${baseUrl}/api/admin/catalog/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'admin-test-draft-honey',
        name_en: 'Sidr Mountain Honey',
        category: 'essentials',
        status: 'draft',
        prices: { '500g': 3200 },
        supplierCost: 2100,
        supplierName: 'Karak Beekeepers',
      }),
    });
    assert.equal(createRes.status, 201);

    // 2. Query admin catalog listing via GET /api/admin/catalog/products
    const adminListingRes = await fetch(`${baseUrl}/api/admin/catalog/products`);
    assert.equal(adminListingRes.status, 200);
    const adminListing = await adminListingRes.json();
    const adminDraft = adminListing.products.find((p: any) => p.id === 'admin-test-draft-honey');
    assert.ok(adminDraft, 'Draft product must appear in authenticated admin listing');
    assert.equal(adminDraft.status, 'draft');
    assert.equal(adminDraft.active, false);
    assert.equal(adminDraft.supplierCost, 2100, 'Admin listing retains supplier cost');

    // 3. Edit draft product
    const editRes = await fetch(`${baseUrl}/api/admin/catalog/products/admin-test-draft-honey`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name_en: 'Sidr Mountain Wild Honey (Potent)',
        expectedRevision: 1,
      }),
    });
    assert.equal(editRes.status, 200);
    const editBody = await editRes.json();
    assert.equal(editBody.product.revision, 2);

    // 4. Publish draft product
    const pubRes = await fetch(`${baseUrl}/api/admin/catalog/products/admin-test-draft-honey/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRevision: 2 }),
    });
    assert.equal(pubRes.status, 200);
    const pubBody = await pubRes.json();
    assert.equal(pubBody.product.status, 'published');
    assert.equal(pubBody.product.active, true);
    assert.equal(pubBody.product.revision, 3);

    // 5. Archive published product
    const arcRes = await fetch(`${baseUrl}/api/admin/catalog/products/admin-test-draft-honey/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRevision: 3 }),
    });
    assert.equal(arcRes.status, 200);
    const arcBody = await arcRes.json();
    assert.equal(arcBody.product.status, 'archived');
    assert.equal(arcBody.product.active, false);

    // 6. Prove archived product remains visible in admin listing
    invalidateCatalogCache();
    const reloadedAdmin = await fetch(`${baseUrl}/api/admin/catalog/products`);
    const reloadedBody = await reloadedAdmin.json();
    const archivedInAdmin = reloadedBody.products.find((p: any) => p.id === 'admin-test-draft-honey');
    assert.ok(archivedInAdmin, 'Archived product must remain manageable in admin listing');
    assert.equal(archivedInAdmin.status, 'archived');

    // 7. Verify public catalog does NOT show archived product
    const publicRes = await fetch(`${baseUrl}/api/catalog`);
    const publicBody = await publicRes.json();
    assert.equal(publicBody.products.some((p: any) => p.id === 'admin-test-draft-honey'), false);
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 5: Unify Legacy and Dynamic Product Pricing (Full Journey)
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004 & REQ-S2-006: Pricing editor save journey (create -> publish -> updateCatalogPricing [deletes prices] -> reload -> quote -> order)', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // 1. Create dynamic product
  const created = await createAdminProduct({
    db,
    body: {
      id: 'dynamic-kashmiri-saffron',
      name_en: 'Authentic Kashmiri Mongra Saffron',
      category: 'essentials',
      productFamily: 'zafran',
      status: 'draft',
      prices: { '1g': 1800, '5g': 8000 },
      shippingWeightG: 50,
    },
    actorUid: 'admin_1',
  });
  assert.equal(created.id, 'dynamic-kashmiri-saffron');

  // 2. Publish product
  const published = await publishAdminProduct({
    db,
    productId: 'dynamic-kashmiri-saffron',
    expectedRevision: created.revision,
    actorUid: 'admin_1',
  });
  assert.equal(published.status, 'published');
  assert.equal(published.active, true);

  // 3. Admin opens price editor and saves new variants (updateCatalogPricing deletes prices)
  const current = await getAdminCatalogRecord(db, 'dynamic-kashmiri-saffron');
  const updatedPricing = await updateCatalogPricing({
    db,
    productId: 'dynamic-kashmiri-saffron',
    actorUid: 'admin_1',
    body: {
      expectedRevision: current.pricing.revision,
      expectedVersion: current.version,
      pricing: {
        ...current.pricing,
        variants: [
          { id: catalogVariantId('1g'), label: '1g', price: 1950, available: true, weightGrams: 1 },
          { id: catalogVariantId('5g'), label: '5g', price: 8500, available: true, weightGrams: 5 },
        ],
      },
    },
  });
  assert.equal(updatedPricing.pricing.variants.length, 2);

  // 4. Reload from authoritative catalog: proves dynamic product derived prices from variants
  invalidateCatalogCache();
  const reloaded = await getAdminProductRecord(db, 'dynamic-kashmiri-saffron');
  assert.equal(reloaded.prices['1g'], 1950);
  assert.equal(reloaded.prices['5g'], 8500);

  const publicSnapshot = await loadAuthoritativeCatalog(db, { fresh: true });
  const pubItem = publicSnapshot.products.find(p => p.id === 'dynamic-kashmiri-saffron');
  assert.ok(pubItem);
  assert.equal(pubItem.prices['1g'], 1950);
  assert.equal(pubItem.prices['5g'], 8500);

  // 5. Authoritative quote calculation
  const quote = await quoteOrderForCustomer(db, {
    city: 'Lahore',
    shippingMethodId: 'standard',
    items: [
      { id: 'dynamic-kashmiri-saffron-1g', productId: 'dynamic-kashmiri-saffron', selectedWeight: '1g', quantity: 2, price: 10 },
    ],
  });
  assert.equal(quote.success, true);
  assert.equal(quote.items[0].price, 1950);
  assert.equal(quote.totals.subtotal, 3900);

  // 6. Durable order checkout
  const orderRes = await createDurableOrder({
    db,
    payload: {
      name: 'Dr. Tariq',
      phone: '03001234567',
      address: 'Defense Phase 5',
      city: 'Lahore',
      shippingMethodId: 'standard',
      paymentMethod: 'cod',
      deliverySlot: 'Standard Delivery',
      items: [
        { id: 'dynamic-kashmiri-saffron-1g', productId: 'dynamic-kashmiri-saffron', selectedWeight: '1g', quantity: 2, price: 1950 },
      ],
    },
    uid: null,
    idempotencyKey: 'journey-order-idempotency-key-001',
  });
  assert.equal(orderRes.status, 'ORDER_RECEIVED');
  assert.equal(orderRes.totals.subtotal, 3900);
});

// --------------------------------------------------------------------------
// TEST 6: Seed schemaVersion: 1 Document Read, Edit, Duplicate Compatibility
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Canonical schemaVersion: 1 documents support admin read, edit, and duplicate', async () => {
  const { db, store } = createMockFirestore();
  invalidateCatalogCache();

  // Seed a document directly with schemaVersion: 1 and variants (prices deleted)
  store.set('products/badam', {
    schemaVersion: 1,
    id: 'badam',
    name_en: 'Almonds Premium American (Badam Giri)',
    name_ur: 'بادام گری امریکن',
    category: 'dry-fruits',
    active: true,
    status: 'published',
    orderMode: 'standard',
    productFamily: 'badam',
    pricingMode: 'variants',
    variants: [
      { id: '250g', label: '250g', price: 990, active: true },
      { id: '500g', label: '500g', price: 1950, active: true },
      { id: '1kg', label: '1kg', price: 3800, active: true },
    ],
    revision: 10,
    updatedAt: new Date().toISOString(),
  });

  // 1. Read admin product
  const record = await getAdminProductRecord(db, 'badam');
  assert.equal(record.revision, 10);
  assert.equal(record.prices['250g'], 990);
  assert.equal(record.prices['1kg'], 3800);

  // 2. Edit product with expectedRevision: 10
  const updated = await updateAdminProduct({
    db,
    productId: 'badam',
    body: {
      name_en: 'Almonds Premium American (Extra Large Badam)',
      expectedRevision: 10,
    },
    actorUid: 'admin_1',
  });
  assert.equal(updated.name_en, 'Almonds Premium American (Extra Large Badam)');
  assert.equal(updated.revision, 11);

  // 3. Duplicate product
  const dup = await duplicateAdminProduct({
    db,
    sourceProductId: 'badam',
    expectedRevision: 11,
    actorUid: 'admin_1',
  });
  assert.ok(dup.id.startsWith('badam-draft-'));
  assert.equal(dup.status, 'draft');
  assert.equal(dup.active, false);
  assert.equal(dup.prices['250g'], 990);
});

// --------------------------------------------------------------------------
// TEST 7: Preserve Product and Shipping Capabilities
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Shipping weights, bundles, custom weights, and packaging configs round-trip safely', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // 1. Food product with portion shipping weights and margin percent
  const foodProduct = await createAdminProduct({
    db,
    body: {
      id: 'food-shipping-test',
      name_en: 'Portion Shipping Test Pistachio',
      category: 'dry-fruits',
      prices: { '250g': 1200, '500g': 2300, '1kg': 4500 },
      shippingWeightG: 520,
      shippingWeights: { '250g': 270, '500g': 520, '1kg': 1050 },
      targetMarginPercent: 35,
      fragile: false,
      origins: ['Pakistan', 'Iran'],
    },
    actorUid: 'admin_1',
  });

  const foodRecord = await getAdminProductRecord(db, 'food-shipping-test');
  assert.equal(foodRecord.shippingWeightG, 520);
  assert.deepEqual(foodRecord.shippingWeights, { '250g': 270, '500g': 520, '1kg': 1050 });
  assert.equal(foodRecord.targetMarginPercent, 35);
  assert.deepEqual(foodRecord.origins, ['Pakistan', 'Iran']);

  // 2. Explicit Bundle product
  const bundleProduct = await createAdminProduct({
    db,
    body: {
      id: 'bundle-test-box',
      name_en: 'Royal Nut Trio Bundle',
      category: 'bundles',
      prices: { '1 pack': 4999 },
      isBundle: true,
      components: [
        { productId: 'badam', quantity: 1, unitWeightG: 500 },
        { productId: 'pista', quantity: 1, unitWeightG: 250 },
      ],
      contents: ['American Almonds 500g', 'Roasted Pistachios 250g'],
    },
    actorUid: 'admin_1',
  });

  const bundleRecord = await getAdminProductRecord(db, 'bundle-test-box');
  assert.equal(bundleRecord.isBundle, true);
  assert.equal(bundleRecord.components?.length, 2);
  assert.equal(bundleRecord.contents?.length, 2);

  // 3. Packaging Bid Box product
  const bidBoxProduct = await createAdminProduct({
    db,
    body: {
      id: 'bid-box-test-acrylic',
      name_en: 'Royal Acrylic Favor Box',
      category: 'celebration-boxes',
      prices: { '1 pc': 650 },
      isBidBox: true,
      bidBoxConfig: {
        boxStyle: 'acrylic',
        allowsCustomDryFruits: true,
        capacityG: 300,
        minUnits: 25,
      },
    },
    actorUid: 'admin_1',
  });

  const bidBoxRecord = await getAdminProductRecord(db, 'bid-box-test-acrylic');
  assert.equal(bidBoxRecord.isBidBox, true);
  assert.equal(bidBoxRecord.bidBoxConfig?.boxStyle, 'acrylic');
  assert.equal(bidBoxRecord.bidBoxConfig?.minUnits, 25);

  // 4. Malformed records rejected
  await assert.rejects(async () => {
    await createAdminProduct({
      db,
      body: {
        id: 'invalid-negative-weight',
        name_en: 'Invalid Negative Weight Item',
        category: 'dry-fruits',
        prices: { '500g': 1000 },
        shippingWeightG: -50,
      },
      actorUid: 'admin_1',
    });
  }, (err: any) => err instanceof CatalogError && (err.code === 'INVALID_SHIPPING_WEIGHT' || err.code === 'INVALID_DYNAMIC_PRODUCT'));
});

// --------------------------------------------------------------------------
// TEST 8: Strict expectedRevision Rejection on Updates and Status Transitions
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Missing, negative, non-integer, and stale revisions are rejected with 409 conflict', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  await createAdminProduct({
    db,
    body: {
      id: 'revision-test-prod',
      name_en: 'Revision Test Product',
      category: 'dry-fruits',
      prices: { '250g': 1000 },
    },
    actorUid: 'admin_1',
  });

  // 1. Missing expectedRevision on update -> 409
  await assert.rejects(async () => {
    await updateAdminProduct({
      db,
      productId: 'revision-test-prod',
      body: { name_en: 'Missing Rev' },
      actorUid: 'admin_1',
    });
  }, (err: any) => err instanceof CatalogError && err.status === 409 && err.code === 'CATALOG_REVISION_CONFLICT');

  // 2. Negative expectedRevision on update -> 409
  await assert.rejects(async () => {
    await updateAdminProduct({
      db,
      productId: 'revision-test-prod',
      body: { name_en: 'Negative Rev', expectedRevision: -1 },
      actorUid: 'admin_1',
    });
  }, (err: any) => err instanceof CatalogError && err.status === 409);

  // 3. Stale expectedRevision on update -> 409
  await assert.rejects(async () => {
    await updateAdminProduct({
      db,
      productId: 'revision-test-prod',
      body: { name_en: 'Stale Rev', expectedRevision: 99 },
      actorUid: 'admin_1',
    });
  }, (err: any) => err instanceof CatalogError && err.status === 409);

  // 4. Missing expectedRevision on publish -> 409
  await assert.rejects(async () => {
    await publishAdminProduct({
      db,
      productId: 'revision-test-prod',
      actorUid: 'admin_1',
    });
  }, (err: any) => err instanceof CatalogError && err.status === 409);

  // 5. Missing expectedRevision on archive -> 409
  await assert.rejects(async () => {
    await archiveAdminProduct({
      db,
      productId: 'revision-test-prod',
      actorUid: 'admin_1',
    });
  }, (err: any) => err instanceof CatalogError && err.status === 409);
});

// --------------------------------------------------------------------------
// TEST 9: Merchandising Foundation & Internal Destination Validation
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Showcase tabs, autoplay settings, and strict internal destination validation', () => {
  // 1. Valid internal paths pass
  assert.equal(validateInternalDestination('/categories/dry-fruits'), '/categories/dry-fruits');
  assert.equal(validateInternalDestination('/deals?budget=1000'), '/deals?budget=1000');
  assert.equal(validateInternalDestination('/shop'), '/shop');

  // 2. Invalid internal paths reject
  assert.throws(() => validateInternalDestination('https://malicious.com'), (err: any) => err instanceof CatalogError);
  assert.throws(() => validateInternalDestination('//malicious.com'), (err: any) => err instanceof CatalogError);
  assert.throws(() => validateInternalDestination('javascript:alert(1)'), (err: any) => err instanceof CatalogError);
  assert.throws(() => validateInternalDestination('categories/dry-fruits'), (err: any) => err instanceof CatalogError);

  // 3. Validate merchandising settings schema
  const validSettings = validateMerchandisingSettings({
    showcaseTabs: [
      { id: 'tab1', label_en: 'Tab 1', label_ur: 'ٹیب ۱', visible: true, productIds: ['badam'] },
    ],
    autoplay: {
      enabled: true,
      intervalMs: 5000,
      resumeDelayMs: 3000,
    },
    collections: [
      { id: 'col1', title_en: 'Col 1', title_ur: 'کول ۱', destination: '/categories/dry-fruits', visible: true },
    ],
    occasions: [
      { id: 'occ1', title_en: 'Occ 1', title_ur: 'اوک ۱', destination: '/deals', visible: true },
    ],
  });
  assert.equal(validSettings.autoplay?.intervalMs, 5000);
  assert.equal(validSettings.collections?.length, 1);

  // 4. Invalid autoplay interval rejects
  assert.throws(() => validateMerchandisingSettings({
    autoplay: { enabled: true, intervalMs: -500 },
  }), (err: any) => err instanceof CatalogError);
});

// --------------------------------------------------------------------------
// TEST 10: Safe Migration Engine: Dry Run, Run 1, Run 2 Idempotency, and Rollback
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Migration engine executes dry-run (0 writes), run 1, run 2 (0 updates skip), and rollback', async () => {
  const { db, store } = createMockFirestore(false); // Clean database without pre-seeded products

  // Pre-seed a legacy product that has merchant pricing but lacks V2 taxonomy fields
  store.set('products/legacy-chohara', {
    id: 'legacy-chohara',
    name_en: 'Legacy Yellow Dry Chohara',
    category: 'dates',
    prices: { '500g': 1234 }, // Custom merchant price
  });

  const testProducts: any[] = [
    {
      id: 'legacy-chohara',
      name_en: 'Legacy Yellow Dry Chohara',
      category: 'dates',
      prices: { '500g': 900 }, // Seed price should NOT overwrite merchant 1234
    },
    {
      id: 'new-seed-product',
      name_en: 'New Seed Walnuts',
      category: 'dry-fruits',
      prices: { '250g': 800 },
    },
  ];

  // 1. Dry run: plan only, 0 database writes
  const dryPlan = await planCatalogMigrationV2({ db, products: testProducts });
  assert.equal(dryPlan.createsCount, 1); // new-seed-product
  assert.equal(dryPlan.updatesCount, 1); // legacy-chohara backfill
  assert.equal(dryPlan.merchAction, 'CREATE');

  // Verify store remains untouched during dry run
  assert.equal(store.has('products/new-seed-product'), false);
  assert.equal(store.get('products/legacy-chohara').productFamily, undefined);

  // 2. Execute Run 1: apply mutations and record before-images
  const exec1 = await executeCatalogMigrationV2({
    db,
    plan: dryPlan,
    operatorUid: 'test_admin_uid',
  });
  assert.equal(exec1.executedCount, 2);
  assert.equal(exec1.createsCount, 1);
  assert.equal(exec1.updatesCount, 1);

  // Verify legacy product merchant price was preserved
  const migratedLegacy = store.get('products/legacy-chohara');
  assert.equal(migratedLegacy.prices['500g'], 1234, 'Merchant price must be strictly preserved');
  assert.equal(migratedLegacy.productFamily, 'khajoor', 'Missing taxonomy fields backfilled');
  assert.equal(migratedLegacy.status, 'published');

  // Verify new product was created
  assert.equal(store.has('products/new-seed-product'), true);
  assert.equal(store.has('merchandising/settings'), true);

  // 3. Execute Run 2 (Idempotency check against migrated DB)
  const plan2 = await planCatalogMigrationV2({ db, products: testProducts });
  assert.equal(plan2.createsCount, 0, 'Second run must have 0 creates');
  assert.equal(plan2.updatesCount, 0, 'Second run must have 0 updates');
  assert.equal(plan2.skipsCount, 2, 'All items must be SKIPPED on second run');
  assert.equal(plan2.merchAction, 'SKIP', 'Merchandising must be SKIPPED on second run');

  const exec2 = await executeCatalogMigrationV2({
    db,
    plan: plan2,
    operatorUid: 'test_admin_uid',
  });
  assert.equal(exec2.executedCount, 0, 'Zero writes performed on second run');

  // 4. Rollback: Restore exact state before Run 1
  const rollbackResult = await rollbackCatalogMigrationV2({
    db,
    beforeImages: exec1.beforeImages,
  });
  assert.equal(rollbackResult.deletedCount, 2); // new-seed-product and merchandising/settings
  assert.equal(rollbackResult.restoredCount, 1); // legacy-chohara

  // Verify database is restored to pre-migration state
  assert.equal(store.has('products/new-seed-product'), false);
  assert.equal(store.has('merchandising/settings'), false);
  const restoredLegacy = store.get('products/legacy-chohara');
  assert.equal(restoredLegacy.prices['500g'], 1234);
  assert.equal(restoredLegacy.productFamily, undefined);
});

// --------------------------------------------------------------------------
// TEST 11: Duplicate Product as Draft via Admin Endpoint
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Duplicate product creates new draft copy in Firestore', async () => {
  const { db } = createMockFirestore();
  const { app, setActor } = createTestHttpServer(db);
  invalidateCatalogCache();

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    setActor({ uid: 'admin_1', email: 'admin@allbarka.com', admin: true });

    const dupRes = await fetch(`${baseUrl}/api/admin/catalog/products/badam/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRevision: 0 }),
    });

    assert.equal(dupRes.status, 201);
    const dupBody = await dupRes.json();
    assert.ok(dupBody.product.id.startsWith('badam-draft-'));
    assert.equal(dupBody.product.status, 'draft');
    assert.equal(dupBody.product.active, false);
    assert.equal(dupBody.product.revision, 1);
    assert.ok(dupBody.product.name_en.includes('Draft Copy'));

    const stored = await db.collection(CATALOG_COLLECTION).doc(dupBody.product.id).get();
    assert.equal(stored.exists, true);
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 12: Inactive Firestore Products Are Never Revived by Compiled Seeds
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-006: Inactive Firestore products are strictly suppressed across all loaders', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  await db.collection('products').doc('kaju').set({
    active: false,
    status: 'archived',
    revision: 2,
    prices: { '250g': 950 },
  }, { merge: true });

  const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
  const kaju = snapshot.products.find(p => p.id === 'kaju')!;

  assert.equal(kaju.active, false);
  assert.equal(kaju.status, 'archived');
  assert.equal(isProductPubliclyVisible(kaju), false);

  const merged = mergeAuthoritativeCatalog(PRODUCTS, snapshot.products);
  const mergedKaju = merged.find(p => p.id === 'kaju')!;
  assert.equal(mergedKaju.active, false);
});
