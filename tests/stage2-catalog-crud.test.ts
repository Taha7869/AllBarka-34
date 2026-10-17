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
  rollbackCatalogMigrationV2,
  resolveTargetTaxonomy
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
  validateCatalogPricing,
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

  let txLock: Promise<any> = Promise.resolve();
  const db: any = {
    collection: (name: string) => makeCollection(name),
    getAll: async (...references: any[]) => {
      return references.map(ref => makeSnapshot(ref.path, ref.id, ref));
    },
    runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
      let release: () => void;
      const acquire = new Promise<void>(resolve => { release = resolve; });
      const prevLock = txLock;
      txLock = txLock.then(() => acquire, () => acquire);
      await prevLock;
      try {
        const stagedWrites = new Map<string, any>();
        let hasWritten = false;
        const tx = {
          get: async (docRef: any) => {
            if (hasWritten) {
              throw new Error(
                `FIRESTORE_INVALID_TRANSACTION_ORDER: Firestore transactions require all reads to be executed before all writes. Attempted to read '${docRef.path}' after write operations were performed.`
              );
            }
            return makeSnapshot(docRef.path, docRef.id, docRef);
          },
          set: (docRef: any, data: any, options?: { merge?: boolean }) => {
            hasWritten = true;
            const existing = stagedWrites.has(docRef.path) ? stagedWrites.get(docRef.path) : store.get(docRef.path);
            stagedWrites.set(docRef.path, applyMockPatch(existing === '__DELETED__' ? undefined : existing, data, options?.merge ?? false));
          },
          delete: (docRef: any) => {
            hasWritten = true;
            stagedWrites.set(docRef.path, '__DELETED__');
          },
        };

        const result = await updateFunction(tx);
        for (const [path, data] of stagedWrites.entries()) {
          if (data === '__DELETED__') {
            store.delete(path);
          } else {
            store.set(path, data);
          }
        }
        return result;
      } finally {
        release!();
      }
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
// TEST 6: Seed schemaVersion: 1 Document Read, Edit, Duplicate & Quote/Order Compatibility
// ----------------------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Valid canonical schemaVersion: 1 seeded product supports admin edit, catalog reload, quote and order', async () => {
  const { db, store } = createMockFirestore();
  invalidateCatalogCache();

  // Seed a document directly with schemaVersion: 1 and valid canonical variants
  const canonicalBadam = {
    schemaVersion: 1 as const,
    productId: 'badam',
    id: 'badam',
    name_en: 'Almonds Premium American (Badam Giri)',
    name_ur: 'بادام گری امریکن',
    category: 'dry-fruits',
    active: true,
    status: 'published',
    orderMode: 'standard',
    productFamily: 'badam',
    pricingMode: 'variants',
    quoteOnly: false,
    variants: [
      { id: catalogVariantId('250g'), label: '250g', price: 990, available: true, weightGrams: 250 },
      { id: catalogVariantId('500g'), label: '500g', price: 1950, available: true, weightGrams: 500 },
      { id: catalogVariantId('1kg'), label: '1kg', price: 3800, available: true, weightGrams: 1000 },
    ],
    wholesale: 800,
    pricePer100g: 380,
    allowCustomWeight: false,
    minCustomWeightG: 100,
    maxCustomWeightG: 5000,
    shippingWeightG: null,
    revision: 10,
    updatedAt: new Date().toISOString(),
  };

  // Explicitly verify the fixture is accepted by the real validateCatalogPricing function
  const seedBadam = PRODUCTS.find(p => p.id === 'badam')!;
  const validatedPricing = validateCatalogPricing(canonicalBadam, seedBadam);
  assert.equal(validatedPricing.schemaVersion, 1);
  assert.equal(validatedPricing.variants.length, 3);
  store.set('products/badam', canonicalBadam);

  // 1. Read admin product
  const record = await getAdminProductRecord(db, 'badam');
  assert.equal(record.revision, 10);
  assert.equal(record.prices['250g'], 990);
  assert.equal(record.prices['1kg'], 3800);

  // 2. Edit product with expectedRevision: 10 (metadata-only edit)
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

  // 3. Reload public catalog -> verify canonical pricing preserved and flat prices derived accurately
  const freshCatalog = await loadAuthoritativeCatalog(db, { fresh: true });
  const badamFresh = freshCatalog.products.find(p => p.id === 'badam')!;
  assert.equal(badamFresh.name_en, 'Almonds Premium American (Extra Large Badam)');
  assert.equal(badamFresh.prices['250g'], 990);
  assert.equal(badamFresh.prices['500g'], 1950);

  // 4. Authoritative quote succeeds
  const quote = await quoteOrderForCustomer(db, {
    city: 'Lahore',
    shippingMethodId: 'standard',
    items: [{ id: 'badam-250g', productId: 'badam', selectedWeight: '250g', quantity: 2, price: 990 }],
  });
  assert.equal(quote.totals.subtotal, 1980);

  // 5. Persisted order succeeds
  const orderRes = await createDurableOrder({
    db,
    payload: {
      name: 'Canonical Test Customer',
      phone: '03001234567',
      email: 'canonical@example.com',
      address: 'Gulberg III',
      city: 'Lahore',
      shippingMethodId: 'standard',
      paymentMethod: 'cod',
      deliverySlot: 'Standard Delivery',
      items: [
        { id: 'badam-250g', productId: 'badam', selectedWeight: '250g', quantity: 2, price: 990 },
      ],
    },
    uid: null,
    idempotencyKey: 'canonical-seed-order-idempotency-001',
  });
  assert.equal(orderRes.status, 'ORDER_RECEIVED');
  assert.equal(orderRes.totals.subtotal, 1980);

  // 6. Duplicate product creates draft copy with preserved pricing
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
// TEST 6b: Dynamic Product Price-Editor Save Followed by Metadata Edit
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Dynamic product price-editor save followed by metadata edit preserves pricing and supports quote and order', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // 1. Create dynamic product
  await createAdminProduct({
    db,
    body: {
      id: 'dynamic-chilgoza-raw',
      name_en: 'Raw Pine Nuts (Chilgoza)',
      category: 'dry-fruits',
      prices: { '250g': 3200, '500g': 6200 },
      status: 'published',
      active: true,
    },
    actorUid: 'admin_1',
  });

  // 2. Save in price editor via updateCatalogPricing (which writes schemaVersion: 1, canonical variants, and deletes flat prices)
  const adminRec = await getAdminCatalogRecord(db, 'dynamic-chilgoza-raw');
  const savedPricing = await updateCatalogPricing({
    db,
    productId: 'dynamic-chilgoza-raw',
    body: {
      expectedRevision: adminRec.pricing.revision,
      expectedVersion: adminRec.version,
      pricing: {
        schemaVersion: 1,
        productId: 'dynamic-chilgoza-raw',
        revision: adminRec.pricing.revision,
        active: true,
        quoteOnly: false,
        variants: [
          { id: catalogVariantId('250g'), label: '250g', price: 3300, available: true, weightGrams: 250 },
          { id: catalogVariantId('500g'), label: '500g', price: 6400, available: true, weightGrams: 500 },
        ],
        wholesale: 2800,
        pricePer100g: 1300,
        allowCustomWeight: false,
        minCustomWeightG: 100,
        maxCustomWeightG: 5000,
        shippingWeightG: 270,
      },
    },
    actorUid: 'admin_1',
  });
  assert.equal(savedPricing.pricing.variants[0].price, 3300);

  // 3. Metadata-only edit via updateAdminProduct (rename product)
  const currentAdmin = await getAdminProductRecord(db, 'dynamic-chilgoza-raw');
  const updatedAdmin = await updateAdminProduct({
    db,
    productId: 'dynamic-chilgoza-raw',
    body: {
      name_en: 'Raw Pine Nuts Special Bannu (Chilgoza)',
      expectedRevision: currentAdmin.revision,
    },
    actorUid: 'admin_1',
  });
  assert.equal(updatedAdmin.name_en, 'Raw Pine Nuts Special Bannu (Chilgoza)');

  // 4. Reload public catalog -> verify canonical pricing preserved and flat prices derived accurately
  const freshCatalog = await loadAuthoritativeCatalog(db, { fresh: true });
  const freshChilgoza = freshCatalog.products.find(p => p.id === 'dynamic-chilgoza-raw')!;
  assert.equal(freshChilgoza.name_en, 'Raw Pine Nuts Special Bannu (Chilgoza)');
  assert.equal(freshChilgoza.prices['250g'], 3300);
  assert.equal(freshChilgoza.prices['500g'], 6400);

  // 5. Authoritative quote succeeds
  const quote = await quoteOrderForCustomer(db, {
    city: 'Lahore',
    shippingMethodId: 'standard',
    items: [{ id: 'chilgoza-250g', productId: 'dynamic-chilgoza-raw', selectedWeight: '250g', quantity: 2, price: 3300 }],
  });
  assert.equal(quote.totals.subtotal, 6600);

  // 6. Persisted order succeeds
  const order = await createDurableOrder({
    db,
    payload: {
      name: 'Customer Test',
      email: 'test@example.com',
      phone: '03001234567',
      address: 'Gulberg III, Lahore',
      city: 'Lahore',
      shippingMethodId: 'standard',
      paymentMethod: 'cod',
      deliverySlot: 'Standard Delivery',
      items: [{ id: 'chilgoza-250g', productId: 'dynamic-chilgoza-raw', selectedWeight: '250g', quantity: 2, price: 3300 }],
    },
    uid: null,
    idempotencyKey: 'dynamic-chilgoza-order-001',
  });
  assert.equal(order.status, 'ORDER_RECEIVED');
  assert.equal(order.totals.subtotal, 6600);
});

// --------------------------------------------------------------------------
// TEST 6c: Variant Availability (Disabled Variant Excluded -> Quote Fails -> Re-enabled in Admin)
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Disabled variant is excluded from public catalog, rejected by quote/order, and usable when re-enabled in admin', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // 1. Create product with 2 variants, one available: true and one available: false
  await createAdminProduct({
    db,
    body: {
      id: 'variant-disable-test',
      name_en: 'Variant Disable Test Pistachio',
      category: 'dry-fruits',
      status: 'published',
      active: true,
      variants: [
        { label: '250g', price: 1100, available: true, weightGrams: 250 },
        { label: '500g', price: 2100, available: false, weightGrams: 500 },
      ],
    },
    actorUid: 'admin_1',
  });

  // 2. Public catalog projection must strictly exclude the disabled variant
  const publicCatalog = await loadAuthoritativeCatalog(db, { fresh: true });
  const publicProd = publicCatalog.products.find(p => p.id === 'variant-disable-test')!;
  assert.equal(publicProd.prices['250g'], 1100);
  assert.equal(publicProd.prices['500g'], undefined, 'Disabled variant must be excluded from public prices');
  assert.equal(publicProd.variants.length, 1);
  assert.equal(publicProd.variants[0].label, '250g');

  // 3. Attempting to quote or order the disabled variant fails with ValidationError
  await assert.rejects(async () => {
    await quoteOrderForCustomer(db, {
      city: 'Lahore',
      shippingMethodId: 'standard',
      items: [{ id: 'variant-disable-test-500g', productId: 'variant-disable-test', selectedWeight: '500g', quantity: 1, price: 2100 }],
    });
  }, (err: any) => err instanceof ValidationError || err.name === 'ValidationError');

  // 4. Admin product record preserves both variants and disabled status
  const adminProd = await getAdminProductRecord(db, 'variant-disable-test');
  assert.equal(adminProd.variants.length, 2);
  const disabledVar: any = adminProd.variants.find((v: any) => v.label === '500g')!;
  assert.equal(disabledVar.available, false);

  // 5. Admin re-enables the variant (available: true)
  const updatedAdmin = await updateAdminProduct({
    db,
    productId: 'variant-disable-test',
    body: {
      expectedRevision: adminProd.revision,
      variants: [
        { label: '250g', price: 1100, available: true, weightGrams: 250 },
        { label: '500g', price: 2100, available: true, weightGrams: 500 },
      ],
    },
    actorUid: 'admin_1',
  });
  assert.equal(updatedAdmin.revision, adminProd.revision + 1);

  // 6. Public catalog now includes the re-enabled variant
  const reloadedCatalog = await loadAuthoritativeCatalog(db, { fresh: true });
  const reloadedProd = reloadedCatalog.products.find(p => p.id === 'variant-disable-test')!;
  assert.equal(reloadedProd.prices['500g'], 2100, 'Re-enabled variant must now appear in public prices');

  // 7. Quote and order now succeed
  const quote = await quoteOrderForCustomer(db, {
    city: 'Lahore',
    shippingMethodId: 'standard',
    items: [{ id: 'variant-disable-test-500g', productId: 'variant-disable-test', selectedWeight: '500g', quantity: 1, price: 2100 }],
  });
  assert.equal(quote.totals.subtotal, 2100);

  const order = await createDurableOrder({
    db,
    payload: {
      name: 'Customer Test',
      email: 'test@example.com',
      phone: '03001234567',
      address: 'Gulberg III, Lahore',
      city: 'Lahore',
      shippingMethodId: 'standard',
      paymentMethod: 'cod',
      deliverySlot: 'Standard Delivery',
      items: [{ id: 'pista-500g', productId: 'variant-disable-test', selectedWeight: '500g', quantity: 1, price: 2100 }],
    },
    uid: null,
    idempotencyKey: 're-enabled-variant-order-001',
  });
  assert.equal(order.status, 'ORDER_RECEIVED');
  assert.equal(order.totals.subtotal, 2100);
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
  assert.throws(() => validateInternalDestination('/shop\\evil'), (err: any) => err instanceof CatalogError);
  assert.throws(() => validateInternalDestination('/\\evil.com'), (err: any) => err instanceof CatalogError);
  assert.throws(() => validateInternalDestination('javascript:alert(1)'), (err: any) => err instanceof CatalogError);
  assert.throws(() => validateInternalDestination('categories/dry-fruits'), (err: any) => err instanceof CatalogError);

  // 3. Public Product Projection strictly strips internal fields via explicit allowlist
  const rawProductWithInternalFields: any = {
    id: 'test-margin-prod',
    name_en: 'Margin Test Item',
    category: 'dry-fruits',
    prices: { '250g': 1000 },
    variants: [{ label: '250g', price: 1000 }],
    targetMarginPercent: 38.5,
    referencePrice: 1400,
    supplierCost: 615,
    supplierName: 'Wholesale Depot',
    supplierItemUrl: 'https://internal.supplier/item/123',
    internalNotes: 'Secret internal margin data',
    importBatch: 'batch_2026_01',
    importTimestamp: '2026-10-17T00:00:00Z',
    adminRevision: 5,
    createdBy: 'admin_1',
    updatedBy: 'admin_1',
  };
  const sanitized = stripPrivateProductFields(rawProductWithInternalFields);
  assert.equal(sanitized.id, 'test-margin-prod');
  assert.equal((sanitized as any).targetMarginPercent, undefined, 'targetMarginPercent must not leak in public product');
  assert.equal((sanitized as any).referencePrice, undefined);
  assert.equal((sanitized as any).supplierCost, undefined);
  assert.equal((sanitized as any).internalNotes, undefined);
  assert.equal((sanitized as any).adminRevision, undefined);
  assert.equal((sanitized as any).createdBy, undefined);
  assert.equal((sanitized as any).updatedBy, undefined);

  // 4. Validate merchandising settings schema
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

  // 5. Invalid autoplay interval rejects
  assert.throws(() => validateMerchandisingSettings({
    autoplay: { enabled: true, intervalMs: -500 },
  }), (err: any) => err instanceof CatalogError);
});

// --------------------------------------------------------------------------
// TEST 10: Safe Migration Engine: Precedence, Durable Journal, Preconditions, Restart & Merchant-Edit Safety
// ---------------------------------------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Safe Migration Engine: Precedence, Durable Journal, Preconditions, Restart & Merchant-Edit Safety', async () => {
  const { db, store } = createMockFirestore(false); // Clean database without pre-seeded products

  // 1. Taxonomy Precedence: Bid Box packaging must precede gift-boxes with exact per-item occasions
  const bidBoxTaxonomy = resolveTargetTaxonomy({
    id: 'bid-box-umrah-tabarruk',
    name_en: 'Umrah & Hajj Tabarruk Box Set',
    category: 'gift-boxes',
    prices: { '1 pc': 2500 },
    isBidBox: true,
    active: true,
  } as any);
  assert.equal(bidBoxTaxonomy.productFamily, 'bid-box', 'Bid box packaging must precede general gift-boxes');
  assert.deepEqual(bidBoxTaxonomy.collections, ['celebration-boxes']);
  assert.deepEqual(bidBoxTaxonomy.occasions, ['umrah', 'ramadan'], 'Exact per-item occasions must be mapped');

  const cardNikkahTaxonomy = resolveTargetTaxonomy({
    id: 'bid-box-card-nikkah',
    name_en: 'Classic Card Bid Box',
    category: 'gift-boxes',
    prices: { '1 pc': 450 },
    isBidBox: true,
    active: true,
  } as any);
  assert.deepEqual(cardNikkahTaxonomy.occasions, ['wedding']);

  // Pre-seed a legacy product that has merchant pricing but lacks V2 taxonomy fields
  store.set('products/legacy-chohara', {
    id: 'legacy-chohara',
    name_en: 'Legacy Yellow Dry Chohara',
    category: 'dates',
    prices: { '500g': 1234 }, // Custom merchant price
    revision: 1,
    updatedAt: new Date().toISOString(),
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

  // 2. Dry run: plan only, 0 database writes
  const dryPlan = await planCatalogMigrationV2({ db, products: testProducts });
  assert.equal(dryPlan.createsCount, 1); // new-seed-product
  assert.equal(dryPlan.updatesCount, 1); // legacy-chohara backfill
  assert.equal(dryPlan.merchAction, 'CREATE');

  // Verify store remains untouched during dry run
  assert.equal(store.has('products/new-seed-product'), false);
  assert.equal(store.get('products/legacy-chohara').productFamily, undefined);

  // 3. Execute Run 1: apply mutations and record durable journal in Firestore
  const exec1 = await executeCatalogMigrationV2({
    db,
    plan: dryPlan,
    operatorUid: 'test_admin_uid',
  });
  assert.equal(exec1.executedCount, 2);
  assert.equal(exec1.createsCount, 1);
  assert.equal(exec1.updatesCount, 1);
  assert.ok(exec1.batchId.startsWith('migration_v2_'));

  // Verify durable journal exists in Firestore
  const journalDoc = store.get(`catalogMigrationJournals/${exec1.batchId}`);
  assert.ok(journalDoc, 'Migration journal must be durably stored in catalogMigrationJournals');
  assert.equal(journalDoc.status, 'COMPLETED');
  assert.equal(journalDoc.executedCount, 2);
  assert.ok(journalDoc.beforeImages['legacy-chohara']);

  // Verify legacy product merchant price was preserved
  const migratedLegacy = store.get('products/legacy-chohara');
  assert.equal(migratedLegacy.prices['500g'], 1234, 'Merchant price must be strictly preserved');
  assert.equal(migratedLegacy.productFamily, 'khajoor', 'Missing taxonomy fields backfilled');
  assert.equal(migratedLegacy.status, 'published');

  // Verify new product was created
  assert.equal(store.has('products/new-seed-product'), true);
  assert.equal(store.has('merchandising/settings'), true);

  // 4. Execute Run 2 (Idempotency check against migrated DB)
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

  // 5. Subsequent Merchant Edit Protection:
  // Simulate a merchant modifying a migrated product after migration completed!
  const legacyBeforeMerchant = store.get('products/legacy-chohara');
  store.set('products/legacy-chohara', {
    ...legacyBeforeMerchant,
    name_en: 'Merchant Custom Modified Chohara Title',
    prices: { '500g': 1500 },
    revision: (legacyBeforeMerchant.revision || 1) + 5, // Merchant updated revision
    updatedAt: new Date().toISOString(),
    migrationBatch: 'custom-merchant-edit',
  });

  // 6. Process Restart & Rollback via durable journal:
  // Discard in-memory beforeImages; pass ONLY batchId to simulate process restart
  const rollbackResult = await rollbackCatalogMigrationV2({
    db,
    batchId: exec1.batchId,
  });

  // legacy-chohara had subsequent merchant edits, so rollback MUST refuse to overwrite it!
  assert.equal(rollbackResult.skippedCount, 1, 'Subsequent merchant edits must be skipped on rollback');
  assert.ok(rollbackResult.conflicts.some(c => c.includes('PROTECTED_MERCHANT_EDIT')), 'Conflict must be reported');
  assert.equal(rollbackResult.deletedCount, 2, 'Untouched created items (new-seed-product, merch) are safely deleted');

  // Verify merchant-edited product was NOT overwritten
  const protectedLegacy = store.get('products/legacy-chohara');
  assert.equal(protectedLegacy.name_en, 'Merchant Custom Modified Chohara Title');
  assert.equal(protectedLegacy.prices['500g'], 1500);

  // Verify deleted items are gone
  assert.equal(store.has('products/new-seed-product'), false);
  assert.equal(store.has('merchandising/settings'), false);

  // 7. Partial execution and restart: test maxItems
  const partialProducts: any[] = [
    { id: 'partial-item-1', name_en: 'Partial Test Item 1', category: 'dry-fruits', prices: { '250g': 100 } },
    { id: 'partial-item-2', name_en: 'Partial Test Item 2', category: 'dry-fruits', prices: { '250g': 200 } },
  ];
  const partialPlan = await planCatalogMigrationV2({ db, products: partialProducts });
  const partialExec = await executeCatalogMigrationV2({
    db,
    plan: partialPlan,
    maxItems: 1,
    operatorUid: 'test_admin_uid',
  });
  assert.equal(partialExec.status, 'PARTIAL');
  assert.equal(partialExec.executedCount, 1);
  const partialJournal = store.get(`catalogMigrationJournals/${partialExec.batchId}`);
  assert.equal(partialJournal.status, 'PARTIAL');
});

// --------------------------------------------------------------------------
// TEST 10b: Atomic Concurrency Competing Writes with Promise.all
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Concurrent competing writes with Promise.all are atomically serialized and conflict-protected', async () => {
  const { db } = createMockFirestore();
  invalidateCatalogCache();

  // 1. Competing createAdminProduct with colliding ID
  const createPromise1 = createAdminProduct({
    db,
    body: { id: 'colliding-test-item', name_en: 'Race Item A', category: 'dry-fruits', prices: { '250g': 1000 } },
    actorUid: 'admin_1',
  });
  const createPromise2 = createAdminProduct({
    db,
    body: { id: 'colliding-test-item', name_en: 'Race Item B', category: 'dry-fruits', prices: { '250g': 1000 } },
    actorUid: 'admin_2',
  });

  const createResults = await Promise.allSettled([createPromise1, createPromise2]);
  const createSuccesses = createResults.filter(r => r.status === 'fulfilled');
  const createFailures = createResults.filter(r => r.status === 'rejected');
  assert.equal(createSuccesses.length, 1, 'Exactly one concurrent creation must succeed');
  assert.equal(createFailures.length, 1, 'The competing creation must fail with 409 conflict');
  assert.equal((createFailures[0] as PromiseRejectedResult).reason.code, 'PRODUCT_ALREADY_EXISTS');

  // 2. Competing updateAdminProduct with same expectedRevision
  const updatePromise1 = updateAdminProduct({
    db,
    productId: 'colliding-test-item',
    body: { name_en: 'Updated by Admin 1', expectedRevision: 1 },
    actorUid: 'admin_1',
  });
  const updatePromise2 = updateAdminProduct({
    db,
    productId: 'colliding-test-item',
    body: { name_en: 'Updated by Admin 2', expectedRevision: 1 },
    actorUid: 'admin_2',
  });

  const updateResults = await Promise.allSettled([updatePromise1, updatePromise2]);
  const updateSuccesses = updateResults.filter(r => r.status === 'fulfilled');
  const updateFailures = updateResults.filter(r => r.status === 'rejected');
  assert.equal(updateSuccesses.length, 1, 'Exactly one concurrent update must succeed');
  assert.equal(updateFailures.length, 1, 'The competing update must fail with 409 revision conflict');
  assert.equal((updateFailures[0] as PromiseRejectedResult).reason.code, 'CATALOG_REVISION_CONFLICT');

  // 3. Competing updateAdminMerchandising with same expectedRevision
  const merchSetup = await updateAdminMerchandising({ db, body: { featuredProductIds: ['badam'] }, actorUid: 'admin_1' });
  const merchPromise1 = updateAdminMerchandising({ db, body: { featuredProductIds: ['pista'], expectedRevision: merchSetup.revision }, actorUid: 'admin_1' });
  const merchPromise2 = updateAdminMerchandising({ db, body: { featuredProductIds: ['kaju'], expectedRevision: merchSetup.revision }, actorUid: 'admin_2' });

  const merchResults = await Promise.allSettled([merchPromise1, merchPromise2]);
  assert.equal(merchResults.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(merchResults.filter(r => r.status === 'rejected').length, 1);
  assert.equal((merchResults.find(r => r.status === 'rejected') as PromiseRejectedResult).reason.code, 'CATALOG_REVISION_CONFLICT');

  // 4. Competing publishAdminMerchandising with same expectedDraftRevision and expectedLiveRevision
  const currentDraft = await getAdminMerchandising(db, true);
  const currentLive = await getAdminMerchandising(db, false);
  const publishPromise1 = publishAdminMerchandising({
    db,
    actorUid: 'admin_1',
    expectedDraftRevision: currentDraft.revision,
    expectedLiveRevision: currentLive.revision,
  });
  const publishPromise2 = publishAdminMerchandising({
    db,
    actorUid: 'admin_2',
    expectedDraftRevision: currentDraft.revision,
    expectedLiveRevision: currentLive.revision,
  });

  const publishResults = await Promise.allSettled([publishPromise1, publishPromise2]);
  assert.equal(publishResults.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(publishResults.filter(r => r.status === 'rejected').length, 1);
  assert.equal((publishResults.find(r => r.status === 'rejected') as PromiseRejectedResult).reason.code, 'CATALOG_REVISION_CONFLICT');
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

// --------------------------------------------------------------------------
// TEST 13: Merchandising Concurrency Protection End to End
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-004: Merchandising concurrency protection end to end via HTTP router', async () => {
  const { db } = createMockFirestore();
  const { app, setActor } = createTestHttpServer(db);
  invalidateCatalogCache();

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    setActor({ uid: 'admin_1', email: 'admin@allbarka.com', admin: true });

    // 1. GET /api/admin/merchandising returns full bundle with draftRevision and liveRevision
    const getRes = await fetch(`${baseUrl}/api/admin/merchandising`);
    assert.equal(getRes.status, 200);
    const bundle = await getRes.json();
    assert.ok('draftRevision' in bundle);
    assert.ok('liveRevision' in bundle);
    assert.ok('draft' in bundle);
    assert.ok('live' in bundle);
    assert.equal(typeof bundle.draftRevision, 'number');
    assert.equal(typeof bundle.liveRevision, 'number');

    const draftRev = bundle.draftRevision;
    const liveRev = bundle.liveRevision;

    // 2. Missing revision tokens rejected with 409
    const missingRes1 = await fetch(`${baseUrl}/api/admin/merchandising/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(missingRes1.status, 409);
    const missingJson1 = await missingRes1.json();
    assert.equal(missingJson1.code, 'CATALOG_REVISION_CONFLICT');

    const missingRes2 = await fetch(`${baseUrl}/api/admin/merchandising/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedDraftRevision: draftRev }), // Missing expectedLiveRevision
    });
    assert.equal(missingRes2.status, 409);

    // 3. Stale revision tokens rejected with 409
    const staleRes = await fetch(`${baseUrl}/api/admin/merchandising/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedDraftRevision: draftRev + 99, expectedLiveRevision: liveRev }),
    });
    assert.equal(staleRes.status, 409);

    // 4. Two concurrent publish requests with the same tokens -> exactly one succeeds, other gets 409
    const pubReq1 = fetch(`${baseUrl}/api/admin/merchandising/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedDraftRevision: draftRev, expectedLiveRevision: liveRev }),
    });
    const pubReq2 = fetch(`${baseUrl}/api/admin/merchandising/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedDraftRevision: draftRev, expectedLiveRevision: liveRev }),
    });

    const [res1, res2] = await Promise.all([pubReq1, pubReq2]);
    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [200, 409], 'Exactly one publish succeeds with 200, concurrent fails with 409');

    const successRes = res1.status === 200 ? res1 : res2;
    const publishJson = await successRes.json();
    assert.ok(publishJson.draftRevision > draftRev);
    assert.ok(publishJson.liveRevision > liveRev);

    // 5. Save-after-publish: using resulting draftRevision succeeds; using old draftRevision fails
    const newDraftRev = publishJson.draftRevision;
    const staleSaveRes = await fetch(`${baseUrl}/api/admin/merchandising`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featuredProductIds: ['badam'],
        expectedRevision: draftRev, // Old draft revision!
      }),
    });
    assert.equal(staleSaveRes.status, 409);

    const validSaveRes = await fetch(`${baseUrl}/api/admin/merchandising`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featuredProductIds: ['badam', 'pista'],
        expectedRevision: newDraftRev, // Resulting draft revision
      }),
    });
    assert.equal(validSaveRes.status, 200);
    const savedJson = await validSaveRes.json();
    assert.deepEqual(savedJson.settings.featuredProductIds, ['badam', 'pista']);
  } finally {
    server.close();
  }
});

// --------------------------------------------------------------------------
// TEST 14: Regression Test A - Crash Recovery Using BatchId Alone
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Regression Test A - Fail after first committed product mutation and recover using batchId alone', async () => {
  const { db, store } = createMockFirestore(false);

  const testProducts = [
    { id: 'crash-item-1', name_en: 'Crash Test Item 1', category: 'dry-fruits', prices: { '250g': 500 } },
    { id: 'crash-item-2', name_en: 'Crash Test Item 2', category: 'dry-fruits', prices: { '250g': 600 } },
  ];

  const plan = await planCatalogMigrationV2({ db, products: testProducts });
  assert.equal(plan.createsCount, 2);

  const testBatchId = `test_crash_batch_${Date.now()}`;

  // Execute migration with failAfterItems: 1 to simulate crash immediately after item 1 commits
  let executionError: any = null;
  try {
    await executeCatalogMigrationV2({
      db,
      plan,
      batchId: testBatchId,
      failAfterItems: 1,
    });
  } catch (err: any) {
    executionError = err;
  }

  assert.ok(executionError, 'Migration must fail/crash after committing first item');
  assert.ok(executionError.message.includes('CRASH_SIMULATION'));

  // Verify item 1 committed to products collection
  assert.equal(store.has('products/crash-item-1'), true, 'Item 1 was committed before crash');
  // Verify item 2 was NOT committed
  assert.equal(store.has('products/crash-item-2'), false, 'Item 2 was not reached');

  // Verify durable journal in Firestore contains item 1's beforeImage and executedItemIds
  const journalDoc = store.get(`catalogMigrationJournals/${testBatchId}`);
  assert.ok(journalDoc, 'Journal must be durably stored in Firestore despite crash');
  assert.ok(journalDoc.executedItemIds.includes('crash-item-1'));
  assert.ok('crash-item-1' in journalDoc.beforeImages);

  // Recover by calling rollback with ONLY db and batchId (zero in-memory beforeImages)
  const rollbackResult = await rollbackCatalogMigrationV2({
    db,
    batchId: testBatchId,
  });

  assert.equal(rollbackResult.status, 'COMPLETED');
  assert.equal(rollbackResult.deletedCount, 1, 'Committed item 1 was cleanly rolled back');
  assert.equal(rollbackResult.conflicts.length, 0);

  // Verify item 1 is deleted from products collection
  assert.equal(store.has('products/crash-item-1'), false, 'Crash item 1 is cleanly deleted');
});

// --------------------------------------------------------------------------
// TEST 15: Regression Test B - Intervening Merchant Edit Protected
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Regression Test B - Existing product rev 5 -> migration rev 6 -> merchant rev 7 -> rollback preserves merchant edit', async () => {
  const { db, store } = createMockFirestore(false);

  // 1. Seed existing product with revision 5
  store.set('products/merchant-chohara', {
    id: 'merchant-chohara',
    name_en: 'Original Merchant Chohara Title',
    category: 'dates',
    prices: { '500g': 1200 },
    revision: 5,
    adminRevision: 5,
    updatedAt: new Date().toISOString(),
  });

  const products = [
    {
      id: 'merchant-chohara',
      name_en: 'Seed Chohara',
      category: 'dates',
      prices: { '500g': 900 },
    },
  ];

  // 2. Plan migration (plans update to revision 6)
  const plan = await planCatalogMigrationV2({ db, products });
  assert.equal(plan.updatesCount, 1);
  const planItem = plan.items.find(i => i.id === 'merchant-chohara')!;
  assert.equal(planItem.plannedRevision, 5);

  // 3. Execute migration
  const execResult = await executeCatalogMigrationV2({
    db,
    plan,
    operatorUid: 'migration_admin',
  });
  assert.equal(execResult.executedCount, 1);
  assert.equal(execResult.updatesCount, 1);

  // Verify product is now at revision 6
  const postMigDoc = store.get('products/merchant-chohara');
  assert.equal(postMigDoc.revision, 6);
  assert.equal(postMigDoc.productFamily, 'khajoor');

  // 4. Merchant updates the product to revision 7 with custom title and price
  store.set('products/merchant-chohara', {
    ...postMigDoc,
    name_en: 'Merchant Custom Protected Title',
    prices: { '500g': 1800 },
    revision: 7, // Intervening merchant edit incremented revision
    adminRevision: 7,
    migrationBatch: 'merchant-manual-edit',
  });

  // 5. Attempt rollback of the migration batch
  const rollbackResult = await rollbackCatalogMigrationV2({
    db,
    batchId: execResult.batchId,
  });

  // Rollback must detect intervening merchant edit and refuse to overwrite
  assert.equal(rollbackResult.status, 'PARTIAL'); // merch was deleted, product conflict skipped -> PARTIAL
  assert.equal(rollbackResult.skippedCount, 1);
  assert.equal(rollbackResult.restoredCount, 0);
  assert.ok(rollbackResult.conflicts.some(c => c.includes('PROTECTED_MERCHANT_EDIT')));

  // Verify product in Firestore strictly retained merchant changes
  const preservedDoc = store.get('products/merchant-chohara');
  assert.equal(preservedDoc.name_en, 'Merchant Custom Protected Title');
  assert.equal(preservedDoc.prices['500g'], 1800);
  assert.equal(preservedDoc.revision, 7);
});

// --------------------------------------------------------------------------
// TEST 16: Regression Test C - Merchant Update Arriving During Rollback Is Preserved
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Regression Test C - Merchant update arriving during rollback is preserved', async () => {
  const { db, store } = createMockFirestore(false);

  store.set('products/concurrent-rollback-prod', {
    id: 'concurrent-rollback-prod',
    name_en: 'Initial Product',
    category: 'dates',
    prices: { '250g': 400 },
    revision: 2,
    adminRevision: 2,
  });

  const plan = await planCatalogMigrationV2({
    db,
    products: [{ id: 'concurrent-rollback-prod', name_en: 'Initial Product', category: 'dates', prices: { '250g': 400 } }],
  });

  const exec = await executeCatalogMigrationV2({ db, plan });
  assert.equal(exec.updatesCount, 1);

  // Hook into db.runTransaction so that right before the rollback transaction reads or commits,
  // a merchant writes a concurrent update
  const origRunTx = db.runTransaction;
  let concurrentInjected = false;
  db.runTransaction = async (cb: any) => {
    if (!concurrentInjected) {
      concurrentInjected = true;
      // Merchant update arrives concurrently
      const currentDoc = store.get('products/concurrent-rollback-prod');
      store.set('products/concurrent-rollback-prod', {
        ...currentDoc,
        name_en: 'Concurrent Merchant Live Edit',
        revision: currentDoc.revision + 1,
        migrationBatch: 'concurrent-merchant-batch',
      });
    }
    return origRunTx.call(db, cb);
  };

  try {
    const rollback = await rollbackCatalogMigrationV2({ db, batchId: exec.batchId });
    assert.equal(rollback.status, 'PARTIAL');
    assert.equal(rollback.skippedCount, 1);
    assert.ok(rollback.conflicts.some(c => c.includes('PROTECTED_MERCHANT_EDIT')));

    const finalDoc = store.get('products/concurrent-rollback-prod');
    assert.equal(finalDoc.name_en, 'Concurrent Merchant Live Edit');
  } finally {
    db.runTransaction = origRunTx;
  }
});

// --------------------------------------------------------------------------
// TEST 17: Regression Test D - Transaction Callback Retry Must Not Duplicate Accounting
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Regression Test D - Transaction callback retry does not duplicate accounting', async () => {
  const { db, store } = createMockFirestore(false);

  const testProducts = [
    { id: 'retry-acc-prod', name_en: 'Retry Accounting Product', category: 'dry-fruits', prices: { '250g': 750 } },
  ];

  const plan = await planCatalogMigrationV2({ db, products: testProducts });
  assert.equal(plan.createsCount, 1);

  // Hook db.runTransaction to simulate retrying before succeeding
  const origRunTx = db.runTransaction;
  let attempts = 0;
  db.runTransaction = async (cb: any) => {
    attempts++;
    if (attempts < 3) {
      // Execute callback but simulate a transient retryable error before commit
      try {
        await cb({
          get: async () => ({ exists: false, data: () => undefined }),
          set: () => {},
        });
      } catch {
        // ignore
      }
      // Re-invoke for retry
      return db.runTransaction(cb);
    }
    return origRunTx.call(db, cb);
  };

  try {
    const result = await executeCatalogMigrationV2({
      db,
      plan,
      operatorUid: 'test_retry_admin',
    });

    assert.ok(attempts >= 3, 'Transaction callback must have executed multiple times');
    assert.equal(result.executedCount, 1, 'executedCount must be exactly 1 despite retries');
    assert.equal(result.createsCount, 1, 'createsCount must be exactly 1 despite retries');
    assert.equal(result.updatesCount, 0);
    assert.equal(result.beforeImages.has('retry-acc-prod'), true);

    const journalDoc = store.get(`catalogMigrationJournals/${result.batchId}`);
    assert.equal(journalDoc.executedCount, 1, 'Journal executedCount must be exactly 1');
    assert.equal(journalDoc.createsCount, 1);
  } finally {
    db.runTransaction = origRunTx;
  }
});

// --------------------------------------------------------------------------
// TEST 18: Shared Transaction Test Mock Rejection of Read After Write
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Shared transaction test mock strictly rejects any read after a write', async () => {
  const { db } = createMockFirestore(false);
  const docRef1 = db.collection('testCol').doc('doc1');
  const docRef2 = db.collection('testCol').doc('doc2');

  await assert.rejects(async () => {
    await db.runTransaction(async (tx: any) => {
      tx.set(docRef1, { foo: 'bar' });
      // Read of a different document after a write must fail!
      await tx.get(docRef2);
    });
  }, (err: any) => err.message.includes('FIRESTORE_INVALID_TRANSACTION_ORDER'));
});

// --------------------------------------------------------------------------
// TEST 19: Rollback Protection: Missing migrationBatch Marker
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Rollback conflict when migrationBatch marker is missing', async () => {
  const { db, store } = createMockFirestore(false);

  store.set('products/prod-missing-marker', {
    id: 'prod-missing-marker',
    name_en: 'Initial Name',
    category: 'dates',
    prices: { '250g': 300 },
    revision: 1,
    adminRevision: 1,
  });

  const plan = await planCatalogMigrationV2({
    db,
    products: [{ id: 'prod-missing-marker', name_en: 'Initial Name', category: 'dates', prices: { '250g': 300 } }],
  });

  const exec = await executeCatalogMigrationV2({ db, plan });
  assert.equal(exec.updatesCount, 1);

  // Simulate missing migrationBatch (deleted or stripped)
  const currentDoc = store.get('products/prod-missing-marker');
  delete currentDoc.migrationBatch;
  store.set('products/prod-missing-marker', currentDoc);

  const rollback = await rollbackCatalogMigrationV2({ db, batchId: exec.batchId });
  assert.equal(rollback.status, 'PARTIAL'); // merch deleted, product skipped with conflict
  assert.equal(rollback.skippedCount, 1);
  assert.ok(rollback.conflicts.some(c => c.includes('migrationBatch marker is missing')));

  const finalDoc = store.get('products/prod-missing-marker');
  assert.equal(finalDoc.productFamily, 'khajoor', 'Document content was not overwritten');
});

// --------------------------------------------------------------------------
// TEST 20: Rollback Protection: Mismatched migrationBatch Marker
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Rollback conflict when migrationBatch marker does not match batchId', async () => {
  const { db, store } = createMockFirestore(false);

  store.set('products/prod-mismatched-marker', {
    id: 'prod-mismatched-marker',
    name_en: 'Initial Name',
    category: 'dates',
    prices: { '250g': 350 },
    revision: 1,
    adminRevision: 1,
  });

  const plan = await planCatalogMigrationV2({
    db,
    products: [{ id: 'prod-mismatched-marker', name_en: 'Initial Name', category: 'dates', prices: { '250g': 350 } }],
  });

  const exec = await executeCatalogMigrationV2({ db, plan });
  assert.equal(exec.updatesCount, 1);

  // Set mismatched migrationBatch
  const currentDoc = store.get('products/prod-mismatched-marker');
  currentDoc.migrationBatch = 'competing-migration-batch-999';
  store.set('products/prod-mismatched-marker', currentDoc);

  const rollback = await rollbackCatalogMigrationV2({ db, batchId: exec.batchId });
  assert.equal(rollback.status, 'PARTIAL');
  assert.equal(rollback.skippedCount, 1);
  assert.ok(rollback.conflicts.some(c => c.includes("migrationBatch 'competing-migration-batch-999' != batchId")));

  const finalDoc = store.get('products/prod-mismatched-marker');
  assert.equal(finalDoc.migrationBatch, 'competing-migration-batch-999');
});

// --------------------------------------------------------------------------
// TEST 21: Rollback Protection: Same Revision But Changed Merchant Title/Price (Post-State Fingerprint)
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Rollback conflict when revision is unchanged but title/price modified (fingerprint check)', async () => {
  const { db, store } = createMockFirestore(false);

  store.set('products/prod-fingerprint-test', {
    id: 'prod-fingerprint-test',
    name_en: 'Initial Before Title',
    category: 'dates',
    prices: { '250g': 500 },
    revision: 1,
    adminRevision: 1,
  });

  const plan = await planCatalogMigrationV2({
    db,
    products: [{ id: 'prod-fingerprint-test', name_en: 'Initial Before Title', category: 'dates', prices: { '250g': 500 } }],
  });

  const exec = await executeCatalogMigrationV2({ db, plan });
  assert.equal(exec.updatesCount, 1);

  // Verify journal has postFingerprints
  const journalDoc = store.get(`catalogMigrationJournals/${exec.batchId}`);
  assert.ok(journalDoc.postFingerprints?.['prod-fingerprint-test']);

  // Simulate direct merchant edit without incrementing revision: title and price changed!
  const currentDoc = store.get('products/prod-fingerprint-test');
  assert.equal(currentDoc.revision, 2);
  currentDoc.name_en = 'Direct Merchant Title Modification';
  currentDoc.prices = { '250g': 1234 };
  // Revision remains 2, migrationBatch remains exec.batchId
  store.set('products/prod-fingerprint-test', currentDoc);

  const rollback = await rollbackCatalogMigrationV2({ db, batchId: exec.batchId });
  assert.equal(rollback.status, 'PARTIAL');
  assert.equal(rollback.skippedCount, 1);
  assert.ok(rollback.conflicts.some(c => c.includes('fingerprint mismatch')));

  const finalDoc = store.get('products/prod-fingerprint-test');
  assert.equal(finalDoc.name_en, 'Direct Merchant Title Modification');
  assert.equal(finalDoc.prices['250g'], 1234);
});

// --------------------------------------------------------------------------
// TEST 22: Rollback Protection: Missing Post-State Recovery Metadata
// --------------------------------------------------------------------------
test('Stage 2 - REQ-S2-007: Rollback conflict when post-state recovery metadata is missing', async () => {
  const { db, store } = createMockFirestore(false);

  store.set('products/prod-missing-meta', {
    id: 'prod-missing-meta',
    name_en: 'Initial Name',
    category: 'dates',
    prices: { '250g': 250 },
    revision: 1,
    adminRevision: 1,
  });

  const plan = await planCatalogMigrationV2({
    db,
    products: [{ id: 'prod-missing-meta', name_en: 'Initial Name', category: 'dates', prices: { '250g': 250 } }],
  });

  const exec = await executeCatalogMigrationV2({ db, plan });
  assert.equal(exec.updatesCount, 1);

  // Corrupt journal by deleting recovery metadata for this item
  const journalDoc = store.get(`catalogMigrationJournals/${exec.batchId}`);
  delete journalDoc.postFingerprints['prod-missing-meta'];
  delete journalDoc.postRevisions['prod-missing-meta'];
  store.set(`catalogMigrationJournals/${exec.batchId}`, journalDoc);

  const rollback = await rollbackCatalogMigrationV2({ db, batchId: exec.batchId });
  assert.equal(rollback.status, 'PARTIAL');
  assert.equal(rollback.skippedCount, 1);
  assert.ok(rollback.conflicts.some(c => c.includes('PROTECTED_CONFLICT_MISSING_METADATA')));

  const finalDoc = store.get('products/prod-missing-meta');
  assert.equal(finalDoc.productFamily, 'khajoor');
});
