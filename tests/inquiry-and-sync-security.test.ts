import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import { PRODUCTS } from '../src/data/products';
import { mergeAuthoritativeCatalog } from '../src/lib/catalogStore';
import { buildWaProductRows, serializeWaProductsCsv } from '../src/lib/waProductsExport';
import { verifyN8nIntegrationSecret } from '../src/lib/integrationAuthentication';
import { createN8nCommerceRouter } from '../src/lib/n8nCommerceRouter';
import type { Product } from '../src/types';

const TEST_SECRET = 'offline-test-integration-secret-32-characters';

test('mergeAuthoritativeCatalog respects inactive products and appends dynamic products', () => {
  const codeProducts: Product[] = [
    {
      id: 'prod-1',
      name_en: 'Active Product 1',
      name_ur: 'پراڈکٹ 1',
      name_ar: 'منتج 1',
      category: 'dry-fruits',
      image: null,
      imageName: null,
      prices: { '500g': 1000 },
      wholesale: 800,
      desc_en: 'Description 1',
      desc_ur: '',
      desc_ar: '',
      active: true,
      inStock: true,
    },
    {
      id: 'prod-2',
      name_en: 'Active Product 2',
      name_ur: 'پراڈکٹ 2',
      name_ar: 'منتج 2',
      category: 'dry-fruits',
      image: null,
      imageName: null,
      prices: { '500g': 1200 },
      wholesale: 900,
      desc_en: 'Description 2',
      desc_ur: '',
      desc_ar: '',
      active: true,
      inStock: true,
    },
  ];

  const firestoreProducts: Product[] = [
    {
      ...codeProducts[0],
      active: false, // Admin turned this product OFF in Firestore
    },
    {
      id: 'prod-dynamic-new',
      name_en: 'Dynamic Seasonal Gift Box',
      name_ur: 'نیا گفٹ باکس',
      name_ar: 'صندوق جديد',
      category: 'gift-boxes',
      image: null,
      imageName: null,
      prices: { 'Default': 3500 },
      wholesale: 2800,
      desc_en: 'Created directly in Firestore',
      desc_ur: '',
      desc_ar: '',
      active: true,
      inStock: true,
      stockQty: 45,
    },
  ];

  const merged = mergeAuthoritativeCatalog(codeProducts, firestoreProducts);

  assert.equal(merged.length, 3, 'Should include 2 code products plus 1 dynamic Firestore product');

  const p1 = merged.find(p => p.id === 'prod-1');
  assert.ok(p1);
  assert.equal(p1.active, false, 'Disabled product in Firestore must NOT fall back to code true');
  assert.equal(p1.inStock, false, 'Inactive product must have inStock: false');

  const p2 = merged.find(p => p.id === 'prod-2');
  assert.ok(p2);
  assert.equal(p2.active, true, 'Unmodified product retains active state');

  const pDynamic = merged.find(p => p.id === 'prod-dynamic-new');
  assert.ok(pDynamic);
  assert.equal(pDynamic.name_en, 'Dynamic Seasonal Gift Box');
  assert.equal(pDynamic.active, true);
  assert.equal(pDynamic.stockQty, 45);

  // Test buildWaProductRows
  const waRows = buildWaProductRows(merged);
  const rowP1 = waRows.find(r => r.base_product_id === 'prod-1');
  assert.ok(rowP1);
  assert.equal(rowP1.active, false);
  assert.equal(rowP1.stock_qty, 0, 'Inactive product row must have stock_qty: 0');

  const rowDynamic = waRows.find(r => r.base_product_id === 'prod-dynamic-new');
  assert.ok(rowDynamic);
  assert.equal(rowDynamic.active, true);
  assert.equal(rowDynamic.stock_qty, 45, 'Dynamic product row must reflect stockQty');
});

test('wa_products endpoint mounted before n8nCommerceRouter is reachable and supports CSV and auth', async () => {
  const app = express();

  function checkAuth(req: express.Request): boolean {
    const configuredSecret = TEST_SECRET;
    const headerSecret = req.headers['x-allbarka-integration-secret'];
    if (typeof headerSecret === 'string' && verifyN8nIntegrationSecret(headerSecret, configuredSecret)) {
      return true;
    }
    const querySecret = req.query.secret || req.query.key;
    if (typeof querySecret === 'string' && verifyN8nIntegrationSecret(querySecret, configuredSecret)) {
      return true;
    }
    return false;
  }

  // Mount wa-products before n8nCommerceRouter
  app.get('/api/integrations/n8n/wa-products', (req, res) => {
    if (!checkAuth(req)) {
      return res.status(401).json({ ok: false, error: 'Integration authentication required.', code: 'INTEGRATION_AUTH_REQUIRED' });
    }
    const sampleProducts: Product[] = [
      {
        id: 'badam',
        name_en: 'Royal Almonds',
        name_ur: 'بادام',
        name_ar: 'لوز',
        category: 'dry-fruits',
        image: null,
        imageName: null,
        prices: { '500g': 1200 },
        wholesale: 950,
        desc_en: 'Almonds',
        desc_ur: '',
        desc_ar: '',
        active: true,
      },
    ];
    const rows = buildWaProductRows(sampleProducts);
    if (String(req.query.format || '').toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.status(200).send(serializeWaProductsCsv(rows));
    }
    return res.json({ ok: true, count: rows.length, products: rows });
  });

  // Mount n8n commerce router with catch-all
  app.use('/api/integrations/n8n', createN8nCommerceRouter({
    getDb: () => null,
    getIntegrationSecret: () => TEST_SECRET,
  }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${port}/api/integrations/n8n`;

  try {
    // 1. Unauthenticated request should be rejected with 401
    const unauthRes = await fetch(`${baseUrl}/wa-products`);
    assert.equal(unauthRes.status, 401);
    const unauthBody = await unauthRes.json();
    assert.equal(unauthBody.code, 'INTEGRATION_AUTH_REQUIRED');

    // 2. Authenticated via header should succeed with 200 JSON
    const authHeaderRes = await fetch(`${baseUrl}/wa-products`, {
      headers: { 'X-AllBarka-Integration-Secret': TEST_SECRET },
    });
    assert.equal(authHeaderRes.status, 200);
    const jsonBody = await authHeaderRes.json();
    assert.equal(jsonBody.ok, true);
    assert.ok(Array.isArray(jsonBody.products));
    assert.equal(jsonBody.products[0].base_product_id, 'badam');

    // 3. Authenticated via query param (?secret=...)
    const authQueryRes = await fetch(`${baseUrl}/wa-products?secret=${encodeURIComponent(TEST_SECRET)}`);
    assert.equal(authQueryRes.status, 200);
    const queryBody = await authQueryRes.json();
    assert.equal(queryBody.ok, true);

    // 4. Authenticated CSV format
    const csvRes = await fetch(`${baseUrl}/wa-products?secret=${encodeURIComponent(TEST_SECRET)}&format=csv`);
    assert.equal(csvRes.status, 200);
    assert.ok(csvRes.headers.get('content-type')?.includes('text/csv'));
    const csvText = await csvRes.text();
    assert.ok(csvText.startsWith('product_id,base_product_id,name,'));
    assert.ok(csvText.includes('Royal Almonds'));

    // 5. Unmapped subpath in n8n router should return 404 INTEGRATION_ROUTE_NOT_FOUND
    const notFoundRes = await fetch(`${baseUrl}/non-existent-endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-AllBarka-Integration-Secret': TEST_SECRET },
      body: JSON.stringify({}),
    });
    assert.equal(notFoundRes.status, 404);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('public inquiry and quote sanitization strips staff fields and enforces defaults', async () => {
  const app = express();
  app.use(express.json());

  const storedInquiries = new Map<string, any>();

  function sanitizePublicInquiryInput(raw: any): Record<string, any> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const allowed = new Set([
      'customerName', 'name', 'phone', 'customerPhone', 'contact', 'email', 'city',
      'type', 'source', 'productId', 'productName', 'boxId', 'boxName', 'boxMode', 'mode',
      'quantity', 'estimatedQuantity', 'standardPrice', 'referenceUnitPrice',
      'offeredPrice', 'targetPricePkr', 'customerOfferedRate', 'eventType',
      'customPrintText', 'customPrinting', 'packagingVariant', 'targetEventDate',
      'deliveryCity', 'notes', 'message', 'customHamperNotes', 'metadata', 'topic'
    ]);
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (allowed.has(k)) res[k] = v;
    }
    return res;
  }

  app.post('/api/inquiries', (req, res) => {
    const body = sanitizePublicInquiryInput(req.body);
    const id = `ABI-${Date.now()}`;
    const record = {
      ...body,
      id,
      customerName: body.customerName || body.name || 'Patron',
      status: 'NEW',
      finalAgreedPrice: null,
      adminNotes: '',
      assignedTo: null,
      followUpDate: null,
      createdAt: new Date().toISOString(),
    };
    storedInquiries.set(id, record);
    res.json({ ok: true, inquiry: record });
  });

  app.patch('/api/admin/inquiries/:id', (req, res) => {
    const existing = storedInquiries.get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });

    const { status, adminNotes, finalAgreedPrice, assignedTo, followUpDate } = req.body || {};
    const updated = {
      ...existing,
      status: status || existing.status,
      adminNotes: adminNotes ?? existing.adminNotes,
      finalAgreedPrice: finalAgreedPrice ?? existing.finalAgreedPrice,
      assignedTo: assignedTo ?? existing.assignedTo,
      followUpDate: followUpDate ?? existing.followUpDate,
      updatedAt: new Date().toISOString(),
    };
    storedInquiries.set(req.params.id, updated);
    res.json({ ok: true, inquiry: updated });
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // 1. Submit public inquiry with malicious injected staff-only fields
    const maliciousPayload = {
      customerName: 'Fatima Zahra',
      phone: '03160666083',
      city: 'Lahore',
      type: 'bid_box_quote',
      quantity: 100,
      offeredPrice: 28000,
      // Injected staff fields:
      status: 'APPROVED',
      finalAgreedPrice: 500,
      adminNotes: 'Attacker secret note',
      assignedTo: 'Lead Hacker',
      followUpDate: '2020-01-01',
    };

    const submitRes = await fetch(`${baseUrl}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(maliciousPayload),
    });

    assert.equal(submitRes.status, 200);
    const submitJson = await submitRes.json();
    assert.equal(submitJson.ok, true);

    const saved = submitJson.inquiry;
    assert.equal(saved.customerName, 'Fatima Zahra');
    assert.equal(saved.status, 'NEW', 'Status MUST be forced to NEW on public submission');
    assert.equal(saved.finalAgreedPrice, null, 'finalAgreedPrice MUST be forced to null');
    assert.equal(saved.adminNotes, '', 'adminNotes MUST be stripped to empty');
    assert.equal(saved.assignedTo, null, 'assignedTo MUST be stripped to null');
    assert.equal(saved.followUpDate, null, 'followUpDate MUST be stripped to null');

    // 2. Admin patch allows updating staff fields
    const patchRes = await fetch(`${baseUrl}/admin/inquiries/${saved.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'QUOTED',
        finalAgreedPrice: 32000,
        adminNotes: 'Approved 10% volume discount',
        assignedTo: 'Taha (Concierge Lead)',
        followUpDate: '2026-10-25',
      }),
    });

    assert.equal(patchRes.status, 200);
    const patchJson = await patchRes.json();
    const updated = patchJson.inquiry;
    assert.equal(updated.status, 'QUOTED');
    assert.equal(updated.finalAgreedPrice, 32000);
    assert.equal(updated.adminNotes, 'Approved 10% volume discount');
    assert.equal(updated.assignedTo, 'Taha (Concierge Lead)');
    assert.equal(updated.followUpDate, '2026-10-25');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('durable persistence error returns 503 INQUIRY_PERSISTENCE_FAILED when database throws', async () => {
  const app = express();
  app.use(express.json());

  app.post('/api/inquiries', async (_req, res) => {
    try {
      // Simulate database failure
      throw new Error('Firestore connection timeout: UNAVAILABLE');
    } catch {
      return res.status(503).json({
        ok: false,
        error: 'INQUIRY_PERSISTENCE_FAILED',
        message: 'Failed to record inquiry in persistent store. Please retry or message our concierge on WhatsApp.'
      });
    }
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as { port: number };

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Test Patron', phone: '03001234567' }),
    });

    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error, 'INQUIRY_PERSISTENCE_FAILED');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
