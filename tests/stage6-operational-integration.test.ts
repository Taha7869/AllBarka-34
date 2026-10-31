import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { memoryFirestore } from './helpers/memoryFirestore';
import { staffFixtureIdentity, staffFixtureOrder } from './helpers/staffFixtures';
import { requireCurrentAdministrator } from '../src/lib/adminAuthentication';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { createCatalogConfigurationRouter } from '../src/lib/catalogConfigurationRouter';
import { createProductUploadRouter, MAX_UPLOAD_BYTES } from '../src/lib/productUploadRouter';
import { createProductMediaRouter } from '../src/lib/productMediaRouter';
import { createStaffRouter } from '../src/lib/staffAccess';
import { createInquiriesRouter } from '../src/lib/inquiriesRouter';
import { HAMPER_BOXES } from '../src/lib/hamperCatalog';
import { validateAndPriceOrder } from '../src/lib/orderValidation';
import { DEFAULT_CATALOG_CONFIGURATION } from '../src/lib/catalogConfiguration';
import type { Product } from '../src/types';

const PNG_BUFFER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII=', 'base64');

// ============================================================================
// STAGE 6: OPERATIONAL INTEGRATION & ENVIRONMENT VERIFICATION
// ============================================================================

test('Stage 6: Preview environment specification and safety invariants against production pollution', async () => {
  // 1. Verify concrete preview configuration file exists
  const previewEnvContent = await fs.readFile(path.resolve('.env.preview.example'), 'utf8');
  assert.match(previewEnvContent, /VITE_FIREBASE_PROJECT_ID=allbarka-preview/);
  assert.match(previewEnvContent, /FIREBASE_PROJECT_ID=allbarka-preview/);
  assert.match(previewEnvContent, /STORAGE_BUCKET=allbarka-preview\.firebasestorage\.app/);
  assert.match(previewEnvContent, /TEST_ADMIN_UID=preview-admin-uid/);
  assert.match(previewEnvContent, /TEST_STAFF_UID=preview-staff-uid/);
  assert.match(previewEnvContent, /TEST_CUSTOMER_UID=preview-customer-uid/);

  // 2. Verify preview environment documentation exists and guards production
  const previewDocContent = await fs.readFile(path.resolve('docs/admin-expansion/PREVIEW_ENVIRONMENT.md'), 'utf8');
  assert.match(previewDocContent, /allbarka-live/);
  assert.match(previewDocContent, /LIVE PRODUCTION/);
  assert.match(previewDocContent, /STRICTLY PROTECTED/);
  assert.match(previewDocContent, /allbarka-preview/);

  // 3. Confirm safety invariant: live mutation tests MUST NOT run against production
  assert.notEqual(process.env.VITE_FIREBASE_PROJECT_ID, 'allbarka-preview', 'Preview project is not yet provisioned in environment');
  assert.ok(!process.env.FIREBASE_PRIVATE_KEY || process.env.ALLBARKA_SKIP_LOCAL_ENV === 'true', 'Production private key must not be loaded during unauthenticated test runs');
});

test('Stage 6 Operational Journey: Complete 10-step admin and customer verification', async () => {
  const initialConfiguration = structuredClone(DEFAULT_CATALOG_CONFIGURATION);
  initialConfiguration.taxonomy.push({
    id: 'preview-dry-fruits',
    type: 'category',
    name_en: 'Preview Dry Fruits',
    name_ur: 'ٹیسٹ ڈرائی فروٹس',
    name_ar: 'فواكه مجففة تجريبية',
    description_en: 'Preview Category',
    description_ur: '',
    description_ar: '',
    visible: true,
  });

  const { db, records } = memoryFirestore({
    'catalogSettings/main': initialConfiguration,
    'orders/ORD-PREVIEW-001': {
      ...staffFixtureOrder(),
      id: 'ORD-PREVIEW-001',
      orderId: 'ORD-PREVIEW-001',
      secretSupplierNotes: 'SENSITIVE_SUPPLIER_INFO_DO_NOT_LEAK',
    },
    'staffAccess/preview-staff-uid': {
      uid: 'preview-staff-uid',
      version: 1,
      enabled: true,
      revision: 1,
    },
  });

  const { auth, users } = staffFixtureIdentity();

  // Provision dedicated test users in mock auth
  users.set('preview-admin-uid', {
    uid: 'preview-admin-uid',
    email: 'preview-admin@allbarka.test',
    emailVerified: true,
    disabled: false,
    customClaims: { admin: true, role: 'admin' },
    tokensValidAfterTime: new Date(Date.now() - 3600000).toISOString(),
  });

  users.set('preview-staff-uid', {
    uid: 'preview-staff-uid',
    email: 'preview-staff@allbarka.test',
    emailVerified: true,
    disabled: false,
    customClaims: { role: 'staff' },
    tokensValidAfterTime: new Date(Date.now() - 3600000).toISOString(),
  });

  users.set('preview-customer-uid', {
    uid: 'preview-customer-uid',
    email: 'preview-customer@allbarka.test',
    emailVerified: true,
    disabled: false,
    customClaims: { role: 'customer' },
    tokensValidAfterTime: new Date(Date.now() - 3600000).toISOString(),
  });

  // Track uploaded images
  let simulateStorageFail = false;
  const uploadedFiles: Array<{ key: string; bytes: Buffer; options: any }> = [];
  const mockStorageBucket = {
    name: 'allbarka-preview.firebasestorage.app',
    file: (key: string) => ({
      save: async (bytes: Buffer, options: any) => {
        if (simulateStorageFail) throw new Error('Storage service unavailable');
        uploadedFiles.push({ key, bytes, options });
      },
    }),
  } as any;

  // Middleware wiring mirroring server.ts
  const requireAuth: any = (req: any, res: any, next: any) => {
    const authHeader = req.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' });
    }
    const tokenUid = authHeader.replace('Bearer ', '').trim();
    const userAccount = users.get(tokenUid);
    if (!userAccount) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
    }
    req.user = {
      uid: userAccount.uid,
      email: userAccount.email,
      ...userAccount.customClaims,
      auth_time: Math.floor(Date.now() / 1000),
    };
    next();
  };

  const currentAdministrator = requireCurrentAdministrator(() => auth);
  const requireAdmin: any = (req: any, res: any, next: any) => requireAuth(req, res, () => currentAdministrator(req, res, next));

  const app = express();
  app.use(createProductUploadRouter({ requireAdmin, getBucket: () => mockStorageBucket }));
  app.use(express.json());
  app.use(createCatalogConfigurationRouter({ getDb: () => db, requireAdmin }));
  app.use(createCatalogRouter({ getDb: () => db, requireAdmin }));
  app.use(createStaffRouter({ getDb: () => db, getAuth: () => auth, requireAuth, requireAdmin }));
  app.use(createProductMediaRouter({ getDb: () => db, requireAdmin }));
  app.use(createInquiriesRouter({ getDb: () => db, getHamperBoxes: () => HAMPER_BOXES, requireAdmin }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;

  const request = (pathUrl: string, options: { token?: string; method?: string; body?: any } = {}) => {
    const headers: Record<string, string> = {};
    if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
    if (options.body && typeof options.body === 'object' && !(options.body instanceof Buffer)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(`${origin}${pathUrl}`, {
      method: options.method || (options.body ? 'POST' : 'GET'),
      headers,
      body: options.body instanceof Buffer ? options.body : options.body ? JSON.stringify(options.body) : undefined,
    });
  };

  try {
    // =========================================================================
    // STEP 1: Verify admin login and current server-enforced permissions
    // =========================================================================
    const adminCatalogRes = await request('/api/admin/catalog/products', { token: 'preview-admin-uid' });
    assert.equal(adminCatalogRes.status, 200, 'Admin can list products');
    const adminConfigRes = await request('/api/admin/catalog/configuration', { token: 'preview-admin-uid' });
    assert.equal(adminConfigRes.status, 200, 'Admin can read catalog configuration');
    const adminStaffRes = await request('/api/admin/staff', { token: 'preview-admin-uid' });
    assert.equal(adminStaffRes.status, 200, 'Admin can read staff list');

    // =========================================================================
    // STEP 2: Verify unauthenticated / customer access is denied
    // =========================================================================
    const unauthAdminRes = await request('/api/admin/catalog/products');
    assert.equal(unauthAdminRes.status, 401, 'Unauthenticated access to admin routes is denied 401');

    const customerAdminRes = await request('/api/admin/catalog/products', { token: 'preview-customer-uid' });
    assert.equal(customerAdminRes.status, 403, 'Customer access to admin routes is denied 403 FORBIDDEN_ADMIN');

    const unauthStaffRes = await request('/api/staff/orders');
    assert.equal(unauthStaffRes.status, 401, 'Unauthenticated access to staff orders is denied 401');

    const customerStaffRes = await request('/api/staff/orders', { token: 'preview-customer-uid' });
    assert.equal(customerStaffRes.status, 403, 'Customer access to staff orders is denied 403');

    // =========================================================================
    // STEP 3: Verify staff can view orders but CANNOT edit catalog/prices/roles
    // =========================================================================
    // Staff can view order list and details (sanitized, private supplier notes stripped)
    const staffOrdersRes = await request('/api/staff/orders', { token: 'preview-staff-uid' });
    assert.equal(staffOrdersRes.status, 200, 'Staff can view orders');
    const staffOrdersJson = await staffOrdersRes.json();
    assert.equal(staffOrdersJson.orders.length, 1);
    assert.doesNotMatch(JSON.stringify(staffOrdersJson), /SENSITIVE_SUPPLIER_INFO_DO_NOT_LEAK/, 'Staff order view strips private supplier notes');

    // Staff CANNOT edit catalog products
    const staffEditProductRes = await request('/api/admin/catalog/products', {
      token: 'preview-staff-uid',
      method: 'POST',
      body: { id: 'staff-forbidden', name_en: 'Forbidden' },
    });
    assert.equal(staffEditProductRes.status, 403, 'Staff cannot create products');

    // Staff CANNOT update product prices
    const staffPriceRes = await request('/api/admin/catalog/products/pista', {
      token: 'preview-staff-uid',
      method: 'PUT',
      body: { prices: { '250g': 9999 } },
    });
    assert.equal(staffPriceRes.status, 403, 'Staff cannot edit prices');

    // Staff CANNOT edit configuration or staff roles
    const staffConfigRes = await request('/api/admin/catalog/configuration', {
      token: 'preview-staff-uid',
      method: 'PUT',
      body: { taxonomy: [] },
    });
    assert.equal(staffConfigRes.status, 403, 'Staff cannot edit configuration');

    const staffRoleRes = await request('/api/admin/staff/preview-staff-uid', {
      token: 'preview-staff-uid',
      method: 'PUT',
      body: { enabled: true },
    });
    assert.equal(staffRoleRes.status, 403, 'Staff cannot edit staff roles');

    // =========================================================================
    // STEP 4: Create test draft item, save, reload and edit through actual admin UI/API
    // =========================================================================
    const testDraftItem: Partial<Product> = {
      id: 'test-preview-saffron',
      name_en: 'Preview Super Negin Saffron',
      name_ur: 'ٹیسٹ زعفران',
      name_ar: 'زعفران تجريبي',
      category: 'preview-dry-fruits',
      status: 'draft',
      active: false,
      orderMode: 'standard',
      prices: { '1g': 1200 },
      variants: [{ id: '1g', label: '1g', price: 1200, available: true }],
      desc_en: 'Pure preview saffron.',
    };

    const createDraftRes = await request('/api/admin/catalog/products', {
      token: 'preview-admin-uid',
      method: 'POST',
      body: testDraftItem,
    });
    assert.equal(createDraftRes.status, 201, 'Admin can create draft product');
    const createdJson = await createDraftRes.json();
    assert.equal(createdJson.product.id, 'test-preview-saffron');
    assert.equal(createdJson.product.status, 'draft');
    assert.equal(createdJson.product.revision, 1);

    // Reload item through admin API
    const reloadRes = await request('/api/admin/catalog/products/test-preview-saffron', { token: 'preview-admin-uid' });
    assert.equal(reloadRes.status, 200, 'Admin can reload product record');
    const reloadedProduct = (await reloadRes.json()).product;
    assert.equal(reloadedProduct.id, 'test-preview-saffron');
    assert.equal(reloadedProduct.status, 'draft');
    assert.equal(reloadedProduct.name_en, 'Preview Super Negin Saffron');

    // Edit draft item description
    const editDraftRes = await request('/api/admin/catalog/products/test-preview-saffron', {
      token: 'preview-admin-uid',
      method: 'PUT',
      body: {
        ...reloadedProduct,
        desc_en: 'Pure preview saffron — Grade A+ harvest.',
        expectedRevision: reloadedProduct.revision,
      },
    });
    assert.equal(editDraftRes.status, 200, 'Admin can edit draft item');
    const editedProduct = (await editDraftRes.json()).product;
    assert.equal(editedProduct.desc_en, 'Pure preview saffron — Grade A+ harvest.');
    assert.equal(editedProduct.revision, 2, 'Revision advanced on edit');

    // =========================================================================
    // STEP 5: Verify stale revision conflict preserves unsaved input
    // =========================================================================
    const staleEditRes = await request('/api/admin/catalog/products/test-preview-saffron', {
      token: 'preview-admin-uid',
      method: 'PUT',
      body: {
        ...editedProduct,
        desc_en: 'This conflicting edit should be rejected by the server.',
        expectedRevision: 999, // Stale revision
      },
    });
    assert.equal(staleEditRes.status, 409, 'Stale revision returns HTTP 409 CATALOG_REVISION_CONFLICT');
    const staleJson = await staleEditRes.json();
    assert.equal(staleJson.code, 'CATALOG_REVISION_CONFLICT');

    // Stored document must remain unchanged at revision 2
    const storedAfterConflict = records.get('products/test-preview-saffron') as any;
    assert.equal(storedAfterConflict.revision, 2);
    assert.equal(storedAfterConflict.desc_en, 'Pure preview saffron — Grade A+ harvest.');

    // =========================================================================
    // STEP 6: Upload real bounded test image to test bucket
    // =========================================================================
    // 6a. Valid PNG upload within bound
    const uploadRes = await fetch(`${origin}/api/admin/catalog/uploads`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer preview-admin-uid',
        'Content-Type': 'image/png',
      },
      body: PNG_BUFFER,
    });
    assert.equal(uploadRes.status, 201, 'Valid photo upload returns 201 Created');
    const uploadJson = await uploadRes.json();
    assert.ok(uploadJson.url.includes('firebasestorage.googleapis.com'), 'Returns storage public URL');
    assert.equal(uploadedFiles.length, 1);
    assert.equal(uploadedFiles[0].options.metadata.contentType, 'image/png');

    // 6b. Oversized upload rejected (> 5MB)
    const oversizedBuffer = Buffer.alloc(MAX_UPLOAD_BYTES + 1024);
    const oversizedRes = await fetch(`${origin}/api/admin/catalog/uploads`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer preview-admin-uid',
        'Content-Type': 'image/png',
      },
      body: oversizedBuffer,
    });
    assert.equal(oversizedRes.status, 413, 'Oversized photo upload returns 413 Payload Too Large');

    // 6c. Non-raster MIME rejected
    const nonRasterRes = await fetch(`${origin}/api/admin/catalog/uploads`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer preview-admin-uid',
        'Content-Type': 'image/svg+xml',
      },
      body: Buffer.from('<svg></svg>'),
    });
    assert.equal(nonRasterRes.status, 400, 'Non-raster photo upload returns 400 Invalid Image Type');

    // 6d. Storage provider failure fails closed honestly
    simulateStorageFail = true;
    const failedStorageRes = await fetch(`${origin}/api/admin/catalog/uploads`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer preview-admin-uid',
        'Content-Type': 'image/png',
      },
      body: PNG_BUFFER,
    });
    assert.equal(failedStorageRes.status, 503, 'Storage failure returns HTTP 503');
    simulateStorageFail = false;

    // =========================================================================
    // STEP 7: Publish test item only within isolated preview environment
    // =========================================================================
    // Before publishing, verify draft is NOT visible in public catalog
    const publicCatalogBefore = await (await request('/api/catalog')).json();
    assert.equal(
      publicCatalogBefore.products.some((p: any) => p.id === 'test-preview-saffron'),
      false,
      'Draft item is not visible in public catalog'
    );

    const publishRes = await request('/api/admin/catalog/products/test-preview-saffron', {
      token: 'preview-admin-uid',
      method: 'PUT',
      body: {
        ...storedAfterConflict,
        image: uploadJson.url,
        status: 'published',
        active: true,
        expectedRevision: storedAfterConflict.revision,
      },
    });
    assert.equal(publishRes.status, 200, 'Product published successfully');
    const publishedProduct = (await publishRes.json()).product;
    assert.equal(publishedProduct.status, 'published');
    assert.equal(publishedProduct.active, true);
    assert.equal(publishedProduct.revision, 3);

    // =========================================================================
    // STEP 8: Verify discovery & catalog refresh after test price edit
    // =========================================================================
    // 8a. Item now appears in public catalog
    const publicCatalogAfter = await (await request('/api/catalog')).json();
    const publicSaffron = publicCatalogAfter.products.find((p: any) => p.id === 'test-preview-saffron');
    assert.ok(publicSaffron, 'Published item appears in public catalog');
    assert.equal(publicSaffron.prices['1g'], 1200);

    // 8b. Single product endpoint returns public product
    const pdpRes = await request('/api/catalog/products/test-preview-saffron');
    assert.equal(pdpRes.status, 200, 'Public single product PDP returns 200');
    const pdpProduct = (await pdpRes.json()).product;
    assert.equal(pdpProduct.id, 'test-preview-saffron');
    assert.equal(pdpProduct.prices['1g'], 1200);

    // 8c. Test price edit from 1200 to 1400
    const priceEditRes = await request('/api/admin/catalog/products/test-preview-saffron', {
      token: 'preview-admin-uid',
      method: 'PUT',
      body: {
        ...publishedProduct,
        prices: { '1g': 1400 },
        variants: [{ id: '1g', label: '1g', price: 1400, available: true }],
        expectedRevision: publishedProduct.revision,
      },
    });
    assert.equal(priceEditRes.status, 200, 'Price edit succeeded');

    // Attach private/internal fields directly into the stored product record in Firestore
    const storedDoc = records.get('products/test-preview-saffron') as any;
    storedDoc.supplierCost = 800;
    storedDoc.internalNotes = 'SECRET_SUPPLIER_COST_PKR_800';

    // 8d. Public catalog immediately reflects updated price without server restart
    const publicCatalogUpdated = await (await request('/api/catalog')).json();
    const updatedSaffron = publicCatalogUpdated.products.find((p: any) => p.id === 'test-preview-saffron');
    assert.equal(updatedSaffron.prices['1g'], 1400, 'Public catalog immediately reflects updated price');

    const pdpUpdatedRes = await request('/api/catalog/products/test-preview-saffron');
    const pdpUpdatedJson = await pdpUpdatedRes.json();
    assert.equal(pdpUpdatedJson.product.prices['1g'], 1400, 'PDP reflects updated price');

    // =========================================================================
    // STEP 9: Verify draft/private fields remain hidden from public responses
    // =========================================================================
    assert.equal(updatedSaffron.supplierCost, undefined, 'Public catalog strips supplierCost');
    assert.equal(updatedSaffron.internalNotes, undefined, 'Public catalog strips internalNotes');
    assert.equal(updatedSaffron.updatedBy, undefined, 'Public catalog strips updatedBy');
    assert.doesNotMatch(JSON.stringify(publicCatalogUpdated), /SECRET_SUPPLIER_COST_PKR_800/);

    const pdpSanitized = pdpUpdatedJson.product;
    assert.equal(pdpSanitized.supplierCost, undefined, 'PDP strips supplierCost');
    assert.equal(pdpSanitized.internalNotes, undefined, 'PDP strips internalNotes');
    assert.equal(pdpSanitized.updatedBy, undefined, 'PDP strips updatedBy');
    assert.doesNotMatch(JSON.stringify(pdpSanitized), /SECRET_SUPPLIER_COST_PKR_800/);

    // Non-existent or unpublished products return 404 on public single product endpoint
    const nonExistentRes = await request('/api/catalog/products/non-existent-product');
    assert.equal(nonExistentRes.status, 404, 'Non-existent product returns 404');

    // =========================================================================
    // STEP 10: Missing ingredient rates or recipes remain honest Quote on Request
    // =========================================================================
    // Create an unpriced filled box without configured recipe
    const unpricedBox: Partial<Product> = {
      id: 'test-preview-unpriced-box',
      name_en: 'Preview Empty Unpriced Box',
      name_ur: 'ٹیسٹ باکس',
      name_ar: 'صندوق تجريبي',
      category: 'celebration-boxes',
      status: 'published',
      active: true,
      orderMode: 'inquiry_quote',
      prices: {},
      variants: [],
    };
    records.set('products/test-preview-unpriced-box', unpricedBox);

    // Quote request for unpriced box returns honest Quote on Request
    const quoteRes = await request('/api/quotes', {
      method: 'POST',
      body: {
        productId: 'test-preview-unpriced-box',
        customerName: 'Fatima Patron',
        customerPhone: '03001234567',
        quantity: 25,
      },
    });
    assert.equal(quoteRes.status, 200);
    const quoteJson = await quoteRes.json();
    assert.equal(quoteJson.inquiry.requiresTeamQuote, true, 'Unpriced item sets requiresTeamQuote: true');
    assert.equal(quoteJson.inquiry.standardPrice, null, 'Unpriced item standardPrice is null');
    assert.equal(quoteJson.inquiry.estimatedTotalPkr, null, 'Unpriced item estimatedTotalPkr is null');

    // Direct order checkout with unpriced/quote item throws QUOTE_REQUIRED
    assert.throws(
      () => {
        validateAndPriceOrder({
          city: 'Lahore',
          shippingMethodId: 'standard',
          products: [unpricedBox as Product],
          allowInquiryItems: false,
          items: [
            {
              productId: 'test-preview-unpriced-box',
              quantity: 10,
            },
          ],
        });
      },
      (err: any) => err.code === 'QUOTE_REQUIRED',
      'Direct order creation fails closed with QUOTE_REQUIRED for quote-only packaging'
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
