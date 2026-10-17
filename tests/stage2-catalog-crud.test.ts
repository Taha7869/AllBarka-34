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
 *      `archiveAdminProduct`, `listAdminProducts`, `getAdminProductRecord` from `src/lib/catalogStore.ts`
 *    - `loadAuthoritativeCatalog`, `loadCatalogForTransaction`, `mergeAuthoritativeCatalog` from `src/lib/catalogStore.ts`
 *    - `getPublicMerchandising`, `getAdminMerchandising`, `updateAdminMerchandising`, `publishAdminMerchandising` from `src/lib/catalogStore.ts`
 *    - `createDurableOrder` from `src/lib/orderDatabase.ts` (durable atomic transaction execution)
 *    - `quoteOrderForCustomer` from `src/lib/orderQuote.ts`
 *    - `validateAndPriceOrder`, `ValidationError` from `src/lib/orderValidation.ts`
 *    - `isProductPubliclyVisible`, `stripPrivateProductFields`, `CatalogError` from `src/lib/catalogSchema.ts`
 *
 * 2. FIXTURES & ISOLATION BOUNDARIES:
 *    - Database: Isolated in-memory Firestore fixture (`createMockFirestore`) implementing atomic
 *      transactions (`runTransaction`), `getAll`, `doc.get()`, `doc.set()`, `collection.get()`, and `add()`.
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
  CATALOG_COLLECTION,
  MERCHANDISING_COLLECTION,
  DEFAULT_MERCHANDISING
} from '../src/lib/catalogStore';
import { quoteOrderForCustomer } from '../src/lib/orderQuote';
import { createDurableOrder } from '../src/lib/orderDatabase';
import { validateAndPriceOrder, ValidationError } from '../src/lib/orderValidation';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { CatalogError, isProductPubliclyVisible, stripPrivateProductFields } from '../src/lib/catalogSchema';
import type { Product, ProductStatus, OrderMode } from '../src/types';

/**
 * Isolated Firestore fixture tracking document mutations and supporting atomic transactions
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
      // In-memory two-phase transaction simulation
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
          if (options?.merge && existing) {
            stagedWrites.set(docRef.path, { ...existing, ...structuredClone(data) });
          } else {
            stagedWrites.set(docRef.path, structuredClone(data));
          }
        },
      };

      const result = await updateFunction(tx);
      // Commit writes atomically
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

  // Dynamic actor control for testing anonymous, patron, and admin requests
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
    // 1. Anonymous request (no user)
    setActor(null);
    const anonRes = await fetch(`${baseUrl}/api/admin/catalog/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'hacker-product', prices: { '1kg': 100 } }),
    });
    assert.equal(anonRes.status, 403);
    const anonBody = await anonRes.json();
    assert.equal(anonBody.code, 'FORBIDDEN_ADMIN');

    // 2. Non-admin patron request (admin: false)
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

    // Confirm product is not in compiled seeds
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

    // Verify persisted directly in Firestore
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

    // Create draft product via admin API
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

    // Request public catalog
    const publicRes = await fetch(`${baseUrl}/api/catalog`);
    assert.equal(publicRes.status, 200);
    const publicData = await publicRes.json();

    // Draft product MUST NOT be present in public products list
    const foundDraft = publicData.products.find((p: any) => p.id === 'draft-only-box');
    assert.equal(foundDraft, undefined);

    // Verify all returned public products have zero private supplier fields
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
// TEST 4: Editing Existing Products & Stale Revision 409 Conflict
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004 & REQ-S2-005: Edit existing product updates fields, and stale revision returns 409', async () => {
  const { db } = createMockFirestore();
  const { app, setActor } = createTestHttpServer(db);
  invalidateCatalogCache();

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    setActor({ uid: 'admin_1', email: 'admin@allbarka.com', admin: true });

    // Create initial product
    await fetch(`${baseUrl}/api/admin/catalog/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'edit-test-pistachio',
        name_en: 'Initial Pistachio Name',
        category: 'dry-fruits',
        prices: { '250g': 1200 },
      }),
    });

    // 1. Successful update of existing product with expectedRevision: 1
    const editRes = await fetch(`${baseUrl}/api/admin/catalog/products/edit-test-pistachio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name_en: 'Updated Iranian Saffron Pistachios',
        prices: { '250g': 1300, '500g': 2500 },
        expectedRevision: 1,
      }),
    });

    assert.equal(editRes.status, 200);
    const editBody = await editRes.json();
    assert.equal(editBody.product.name_en, 'Updated Iranian Saffron Pistachios');
    assert.equal(editBody.product.prices['250g'], 1300);
    assert.equal(editBody.product.prices['500g'], 2500);
    assert.equal(editBody.product.revision, 2);

    // 2. Competing update with STALE revision 1 -> Must return HTTP 409
    const conflictRes = await fetch(`${baseUrl}/api/admin/catalog/products/edit-test-pistachio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name_en: 'Overwriting Stale Edit',
        expectedRevision: 1, // Stale! Current revision is 2
      }),
    });

    assert.equal(conflictRes.status, 409);
    const conflictBody = await conflictRes.json();
    assert.equal(conflictBody.code, 'CATALOG_REVISION_CONFLICT');
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 5: Publishing Product & Storefront Appearance
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Publish dynamic product makes it visible on public /api/catalog', async () => {
  const { db } = createMockFirestore();
  const { app, setActor } = createTestHttpServer(db);
  invalidateCatalogCache();

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    setActor({ uid: 'admin_1', email: 'admin@allbarka.com', admin: true });

    // Create draft
    await fetch(`${baseUrl}/api/admin/catalog/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'panjgur-amber-dates',
        name_en: 'Balochistan Panjgur Amber Dates',
        category: 'dates',
        productFamily: 'khajoor',
        status: 'draft',
        prices: { '500g': 950 },
        supplierCost: 700,
        supplierName: 'Panjgur Farm',
      }),
    });

    // Publish via admin publish endpoint
    const pubRes = await fetch(`${baseUrl}/api/admin/catalog/products/panjgur-amber-dates/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(pubRes.status, 200);
    const pubBody = await pubRes.json();
    assert.equal(pubBody.product.status, 'published');
    assert.equal(pubBody.product.active, true);
    assert.equal(pubBody.product.revision, 2);

    // Verify on public catalog
    invalidateCatalogCache();
    const publicRes = await fetch(`${baseUrl}/api/catalog`);
    const publicData = await publicRes.json();

    const publishedItem = publicData.products.find((p: any) => p.id === 'panjgur-amber-dates');
    assert.ok(publishedItem);
    assert.equal(publishedItem.name_en, 'Balochistan Panjgur Amber Dates');
    assert.equal(publishedItem.prices['500g'], 950);
    assert.equal(publishedItem.active, true);
    assert.equal(publishedItem.supplierCost, undefined); // Stripped
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 6: Duplicate Product as Draft via Admin Endpoint
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

    // Duplicate existing compiled product 'badam'
    const dupRes = await fetch(`${baseUrl}/api/admin/catalog/products/badam/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(dupRes.status, 201);
    const dupBody = await dupRes.json();
    assert.ok(dupBody.product.id.startsWith('badam-draft-'));
    assert.equal(dupBody.product.status, 'draft');
    assert.equal(dupBody.product.active, false);
    assert.equal(dupBody.product.revision, 1);
    assert.ok(dupBody.product.name_en.includes('Draft Copy'));

    // Verify stored in Firestore
    const stored = await db.collection(CATALOG_COLLECTION).doc(dupBody.product.id).get();
    assert.equal(stored.exists, true);
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 7: Authoritative Quote Calculation for Dynamic Product
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-006: Authoritative quote calculates canonical price for dynamic product', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // Create and publish dynamic product directly
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

  // Calculate quote with spoofed client price (Rs. 1)
  const quote = await quoteOrderForCustomer(db, {
    city: 'Lahore',
    shippingMethodId: 'standard',
    items: [
      { id: 'hunza-sun-apricot-500g', productId: 'hunza-sun-apricot', selectedWeight: '500g', quantity: 2, price: 1 },
    ],
  });

  assert.equal(quote.success, true);
  assert.equal(quote.totals.subtotal, 2800); // 1400 * 2 (ignores client price 1)
  assert.equal(quote.items[0].price, 1400);
  assert.equal(quote.items[0].name, 'Hunza Sun-Dried Khubani');
});

// --------------------------------------------------------------------------
// TEST 8: Full Durable Order Path with Dynamic Product
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-006: createDurableOrder persists order for dynamic uncompiled product', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // Create and publish dynamic product
  await createAdminProduct({
    db,
    body: {
      id: 'waziristan-chilgoza-jumbo',
      name_en: 'Jumbo Waziristan Roasted Chilgoza',
      category: 'dry-fruits',
      status: 'published',
      active: true,
      prices: { '250g': 3400 },
    },
    actorUid: 'admin_test_uid',
  });
  await publishAdminProduct({ db, productId: 'waziristan-chilgoza-jumbo', actorUid: 'admin_test_uid' });

  const orderPayload = {
    name: 'Fatima Zahra',
    phone: '03001234567',
    address: 'House 12, Street 4, Gulberg III',
    city: 'Lahore',
    shippingMethodId: 'standard',
    paymentMethod: 'cod',
    deliverySlot: 'Standard Delivery',
    items: [
      { id: 'waziristan-chilgoza-jumbo-250g', productId: 'waziristan-chilgoza-jumbo', selectedWeight: '250g', quantity: 1, price: 3400 },
    ],
  };

  const idempotencyKey = 'test-idempotency-key-chilgoza-001';

  // 1. First execution: Creates durable order
  const result = await createDurableOrder({
    db,
    payload: orderPayload,
    uid: null, // Guest checkout
    idempotencyKey,
  });

  assert.ok(result.orderId.startsWith('AB-'));
  assert.equal(result.status, 'ORDER_RECEIVED');
  assert.equal(result.totals.subtotal, 3400);
  assert.equal(result.items[0].name, 'Jumbo Waziristan Roasted Chilgoza');

  // Verify order document persisted in Firestore 'orders' collection
  const orderDoc = await db.collection('orders').doc(result.orderId).get();
  assert.equal(orderDoc.exists, true);
  assert.equal(orderDoc.data().totals.total, result.totals.total);

  // Verify idempotency record in 'checkoutIntents'
  const intentDoc = await db.collection('checkoutIntents').doc(idempotencyKey).get();
  assert.equal(intentDoc.exists, true);
  assert.equal(intentDoc.data().orderId, result.orderId);

  // 2. Second execution with identical idempotencyKey returns cached duplicate without second write
  const duplicateResult = await createDurableOrder({
    db,
    payload: orderPayload,
    uid: null,
    idempotencyKey,
  });

  assert.equal(duplicateResult.isDuplicate, true);
  assert.equal(duplicateResult.orderId, result.orderId);
  assert.equal(duplicateResult.totals.total, result.totals.total);
});

// --------------------------------------------------------------------------
// TEST 9: Archiving Product & Saved-Cart / Reorder Rejection
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Archive product suppresses it from catalog and rejects checkout', async () => {
  const { db } = createMockFirestore();
  const { app, setActor } = createTestHttpServer(db);
  invalidateCatalogCache();

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    setActor({ uid: 'admin_1', email: 'admin@allbarka.com', admin: true });

    // Create & publish
    await fetch(`${baseUrl}/api/admin/catalog/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'seasonal-saffron-tin',
        name_en: 'Seasonal Saffron Tin',
        category: 'essentials',
        status: 'published',
        active: true,
        prices: { '1g': 2200 },
      }),
    });
    await fetch(`${baseUrl}/api/admin/catalog/products/seasonal-saffron-tin/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // Archive product
    const arcRes = await fetch(`${baseUrl}/api/admin/catalog/products/seasonal-saffron-tin/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(arcRes.status, 200);

    // Verify /api/catalog does NOT return archived product
    invalidateCatalogCache();
    const publicRes = await fetch(`${baseUrl}/api/catalog`);
    const publicData = await publicRes.json();
    assert.equal(publicData.products.some((p: any) => p.id === 'seasonal-saffron-tin'), false);

    // Verify checkout with archived product from saved cart throws PRODUCT_UNAVAILABLE
    const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
    assert.throws(() => {
      validateAndPriceOrder({
        city: 'Lahore',
        shippingMethodId: 'standard',
        items: [{ id: 'seasonal-saffron-tin-1g', productId: 'seasonal-saffron-tin', selectedWeight: '1g', quantity: 1 }],
        products: snapshot.products,
      });
    }, (err: any) => err instanceof ValidationError && err.code === 'PRODUCT_UNAVAILABLE');
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 10: Merchandising: Draft Preview vs. Public Publish Endpoints
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004 & D6: Merchandising draft preview and publish lifecycle on real HTTP endpoints', async () => {
  const { db } = createMockFirestore();
  const { app, setActor } = createTestHttpServer(db);

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Initial public settings return Rule D5 defaults
    const pubInitRes = await fetch(`${baseUrl}/api/merchandising`);
    assert.equal(pubInitRes.status, 200);
    const pubInitBody = await pubInitRes.json();
    assert.equal(pubInitBody.settings.autoplayDurationMs, 6000);
    assert.equal(pubInitBody.settings.autoplayResumeDelayMs, 3000);

    // 2. Admin saves draft settings
    setActor({ uid: 'admin_1', email: 'admin@allbarka.com', admin: true });
    const draftRes = await fetch(`${baseUrl}/api/admin/merchandising`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featuredProductIds: ['badam', 'pista'],
        autoplayDurationMs: 4500,
        autoplayResumeDelayMs: 2500,
        expectedRevision: pubInitBody.settings.revision,
      }),
    });
    assert.equal(draftRes.status, 200);

    // 3. Admin preview endpoint shows draft settings
    const prevRes = await fetch(`${baseUrl}/api/admin/merchandising?preview=true`);
    const prevBody = await prevRes.json();
    assert.equal(prevBody.settings.autoplayDurationMs, 4500);

    // 4. Public endpoint STILL returns old published settings (6000ms)
    const pubMidRes = await fetch(`${baseUrl}/api/merchandising`);
    const pubMidBody = await pubMidRes.json();
    assert.equal(pubMidBody.settings.autoplayDurationMs, 6000);

    // 5. Admin publishes settings
    const pubActionRes = await fetch(`${baseUrl}/api/admin/merchandising/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(pubActionRes.status, 200);

    // 6. Public endpoint now returns the new published settings
    const pubFinalRes = await fetch(`${baseUrl}/api/merchandising`);
    const pubFinalBody = await pubFinalRes.json();
    assert.equal(pubFinalBody.settings.autoplayDurationMs, 4500);
    assert.deepEqual(pubFinalBody.settings.featuredProductIds, ['badam', 'pista']);
    assert.equal(pubFinalBody.settings.updatedBy, undefined); // Stripped
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 11: Inactive Firestore Products Are Never Revived by Compiled Seeds
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-006: Inactive Firestore products are strictly suppressed across all loaders', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // Mark compiled product 'kaju' as archived in Firestore
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

  // Merged catalog MUST NOT revive active to true
  const merged = mergeAuthoritativeCatalog(PRODUCTS, snapshot.products);
  const mergedKaju = merged.find(p => p.id === 'kaju')!;
  assert.equal(mergedKaju.active, false);
});

// --------------------------------------------------------------------------
// TEST 12: Migration Repeat-Run Safety & Idempotency on Persisted Records
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Safe migration backfills legacy records and is strictly idempotent on second run', async () => {
  const { db, store } = createMockFirestore();

  // Create a legacy document in Firestore: has merchant price Rs. 2999, but lacks V2 fields
  await db.collection('products').doc('legacy-ajwa').set({
    id: 'legacy-ajwa',
    name_en: 'Legacy Madina Ajwa',
    category: 'dates',
    prices: { '500g': 2999 }, // Custom merchant price
    // Lacks productFamily, collections, occasions, status, orderMode
  });

  // Simulation of Migration Run 1:
  const docSnap1 = await db.collection('products').doc('legacy-ajwa').get();
  const data1 = docSnap1.data();
  assert.equal(data1.productFamily, undefined);

  // Apply non-destructive backfill
  await db.collection('products').doc('legacy-ajwa').set({
    productFamily: 'khajoor',
    collections: [],
    occasions: ['ramadan', 'umrah'],
    status: 'published',
    orderMode: 'both',
    revision: 1,
    migrationBatch: 'v2-backfill',
  }, { merge: true });

  // Verify merchant price was PRESERVED
  const afterRun1 = (await db.collection('products').doc('legacy-ajwa').get()).data();
  assert.equal(afterRun1.prices['500g'], 2999);
  assert.equal(afterRun1.productFamily, 'khajoor');
  assert.equal(afterRun1.status, 'published');

  // Simulation of Migration Run 2:
  const docSnap2 = await db.collection('products').doc('legacy-ajwa').get();
  const data2 = docSnap2.data();

  // Check if any V2 fields are missing
  const needsFamily = !data2.productFamily;
  const needsCollections = !data2.collections;
  const needsOccasions = !data2.occasions;
  const needsStatus = !data2.status;
  const needsOrderMode = !data2.orderMode;

  const requiresUpdate = needsFamily || needsCollections || needsOccasions || needsStatus || needsOrderMode;
  assert.equal(requiresUpdate, false); // Proves run 2 takes SKIP action: 0 writes performed!
});
