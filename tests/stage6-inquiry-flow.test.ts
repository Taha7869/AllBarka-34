import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import { createInquiriesRouter } from '../src/lib/inquiriesRouter';
import {
  isValidPhone,
  isValidQuantity,
  isValidBudget,
  resolveInquiryProductVariant,
  computeInquiryPayloadHash,
  generateInquiryReferenceId,
  IdempotencyConflictError,
  PersistenceUnavailableError,
} from '../src/lib/inquiryService';
import {
  CANONICAL_WHATSAPP_PHONE,
  MANDATORY_LEAD_TIME_NOTICE,
  NON_CATALOG_FILLINGS_DISCLAIMER,
  TABARRUK_EMPTY_DEFAULT_NOTICE,
  formatFillingsLabel,
  buildCustomerInquiryWhatsAppUrl,
  buildAdminWhatsAppPitchUrl,
} from '../src/lib/inquiryWhatsApp';
import { submitCustomQuoteInquiry } from '../src/lib/storefrontSubmissions';
import type { Product, InquiryRecord } from '../src/types';

// ============================================================================
// TEST FIXTURES & MOCK FIRESTORE
// ============================================================================

const TEST_CATALOG: Product[] = [
  {
    id: 'bid-box-luxury-tin',
    name_en: 'Luxury Tin Bid Box',
    name_ur: '',
    name_ar: '',
    category: 'celebration-boxes',
    image: null,
    imageName: null,
    prices: {
      'Empty Box (1 pc)': 350,
      'Empty Pack (25 pcs)': 7500,
      'Empty Pack (50 pcs)': 14000,
    },
    variants: [
      { label: 'Empty Box (1 pc)', price: 350, available: true },
      { label: 'Empty Pack (25 pcs)', price: 7500, available: true },
      { label: 'Empty Pack (50 pcs)', price: 14000, available: true },
    ],
    wholesale: 280,
    desc_en: '',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    isBidBox: true,
  },
  {
    id: 'bid-box-umrah-tabarruk',
    name_en: 'Umrah & Hajj Tabarruk Set',
    name_ur: '',
    name_ar: '',
    category: 'celebration-boxes',
    packagingSubcategory: 'tabarruk',
    image: null,
    imageName: null,
    prices: {
      'Empty Set (1 pc)': 200,
      'Empty Pack (25 pcs)': 4500,
    },
    variants: [
      { label: 'Empty Set (1 pc)', price: 200, available: true },
      { label: 'Empty Pack (25 pcs)', price: 4500, available: true },
    ],
    wholesale: 160,
    desc_en: '',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    isBidBox: true,
  },
  {
    id: 'bespoke-unpriced-box',
    name_en: 'Bespoke Handcrafted Wooden Coffer',
    name_ur: '',
    name_ar: '',
    category: 'celebration-boxes',
    image: null,
    imageName: null,
    prices: {},
    wholesale: null,
    desc_en: '',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    isBidBox: true,
  },
];

function createMockFirestore(options?: { throwOnCommit?: boolean }) {
  const store = new Map<string, Map<string, any>>();

  function getCollection(name: string) {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  }

  const db: any = {
    _store: store,
    collection(name: string) {
      return {
        doc(id: string) {
          return {
            id,
            path: `${name}/${id}`,
            async get() {
              const col = getCollection(name);
              const exists = col.has(id);
              return {
                id,
                exists,
                data: () => (exists ? JSON.parse(JSON.stringify(col.get(id))) : undefined),
              };
            },
            async set(data: any, setOptions?: any) {
              const col = getCollection(name);
              const merged = setOptions?.merge && col.has(id) ? { ...col.get(id), ...data } : { ...data };
              col.set(id, JSON.parse(JSON.stringify(merged)));
            },
          };
        },
        limit(_count?: number) {
          const col = getCollection(name);
          return {
            async get() {
              return {
                docs: Array.from(col.entries()).map(([id, data]) => ({
                  id,
                  data: () => JSON.parse(JSON.stringify(data)),
                })),
              };
            },
          };
        },
        async get() {
          const col = getCollection(name);
          return {
            docs: Array.from(col.entries()).map(([id, data]) => ({
              id,
              data: () => JSON.parse(JSON.stringify(data)),
            })),
          };
        },
      };
    },
    async runTransaction(updateFunction: (tx: any) => Promise<any>) {
      const stagedWrites: Array<() => void> = [];
      const tx = {
        async get(docRef: any) {
          return docRef.get();
        },
        set(docRef: any, data: any, setOptions?: any) {
          stagedWrites.push(() => {
            const parts = docRef.path.split('/');
            const col = getCollection(parts[0]);
            const id = parts[1];
            const merged = setOptions?.merge && col.has(id) ? { ...col.get(id), ...data } : { ...data };
            col.set(id, JSON.parse(JSON.stringify(merged)));
          });
        },
      };

      const result = await updateFunction(tx);
      if (options?.throwOnCommit) {
        throw new Error('Firestore transaction commit failed: UNAVAILABLE');
      }
      for (const apply of stagedWrites) {
        apply();
      }
      return result;
    },
    batch() {
      const stagedWrites: Array<() => void> = [];
      return {
        set(docRef: any, data: any, setOptions?: any) {
          stagedWrites.push(() => {
            const parts = docRef.path.split('/');
            const col = getCollection(parts[0]);
            const id = parts[1];
            const merged = setOptions?.merge && col.has(id) ? { ...col.get(id), ...data } : { ...data };
            col.set(id, JSON.parse(JSON.stringify(merged)));
          });
        },
        async commit() {
          if (options?.throwOnCommit) {
            throw new Error('Firestore batch commit failed: UNAVAILABLE');
          }
          for (const apply of stagedWrites) {
            apply();
          }
        },
      };
    },
  };

  return db;
}

function createTestServer(options: {
  db: any;
  catalog?: Product[] | (() => Product[] | Promise<Product[]>);
  adminAllowed?: boolean;
}) {
  const app = express();
  app.use(express.json());

  const requireAdmin = (req: any, res: any, next: any) => {
    if (options.adminAllowed === false) {
      return res.status(403).json({ error: 'FORBIDDEN_ADMIN', code: 'FORBIDDEN_ADMIN' });
    }
    next();
  };

  const catalogOption = options.catalog;
  const getCatalogFn: () => Product[] | Promise<Product[]> =
    typeof catalogOption === 'function'
      ? catalogOption
      : () => (Array.isArray(catalogOption) ? catalogOption : TEST_CATALOG);

  const router = createInquiriesRouter({
    getDb: () => options.db,
    getCatalog: getCatalogFn,
    requireAdmin,
  });

  app.use(router);
  return app;
}

// ============================================================================
// 1. BUSINESS WORDING & NOTICES
// ============================================================================

test('inquiryWhatsApp: approved business wording and Zamzam distinction', () => {
  assert.equal(CANONICAL_WHATSAPP_PHONE, '923160666083');

  // Exact lead time notice
  assert.equal(
    MANDATORY_LEAD_TIME_NOTICE,
    'Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate.'
  );

  // Exact Tabarruk empty packaging default notice (Zamzam customer-provided, NOT AllBarka filling)
  assert.equal(
    TABARRUK_EMPTY_DEFAULT_NOTICE,
    'Tabarruk bottles are empty for customer-provided Zamzam water. Base packaging is empty by default; optional fillings (Ajwa dates, roasted almonds) are custom additions subject to team confirmation and quote.'
  );

  // Fillings label uses verified catalog date varieties
  const fillings = formatFillingsLabel(['dry_fruits', 'dates', 'chocolates', 'other']);
  assert.match(fillings, /AllBarka Luxury Dry Fruits/);
  assert.match(fillings, /Verified Catalog Dates \(Ajwa, Medjool, Panjgur Amber\)/);
  assert.match(fillings, /Chocolates & Truffles \(Custom-sourced on request\)/);
  assert.match(fillings, /Special Custom Fillings \(Sourcing-dependent request\)/);
  assert.doesNotMatch(fillings, /zamzam/i, 'Zamzam must NEVER be listed as an AllBarka-supplied filling');
});

test('inquiryWhatsApp: lead time acknowledgment reflects honest customer state', () => {
  // 1. Acknowledged
  const urlAck = buildCustomerInquiryWhatsAppUrl({
    quoteId: 'ABQ-123',
    productName: 'Tin Box',
    productId: 'tin-box-002',
    mode: 'empty',
    quantity: 50,
    eventType: 'Nikkah',
    customerName: 'Fatima',
    customerPhone: '03160666083',
    city: 'Lahore',
    leadTimeNoticeAcknowledged: true,
  });
  const decodedAck = decodeURIComponent(urlAck);
  assert.match(decodedAck, /Preparation Lead Time:\* Acknowledged/);

  // 2. Not acknowledged
  const urlUnack = buildCustomerInquiryWhatsAppUrl({
    quoteId: 'ABQ-123',
    productName: 'Tin Box',
    productId: 'tin-box-002',
    mode: 'empty',
    quantity: 50,
    eventType: 'Nikkah',
    customerName: 'Fatima',
    customerPhone: '03160666083',
    city: 'Lahore',
    leadTimeNoticeAcknowledged: false,
  });
  const decodedUnack = decodeURIComponent(urlUnack);
  assert.match(decodedUnack, /Preparation Lead Time:\* Notice provided/);
  assert.doesNotMatch(decodedUnack, /Preparation Lead Time:\* Acknowledged/);
});

// ============================================================================
// 2. VALIDATION & SERVER-SIDE RESOLUTION
// ============================================================================

test('inquiryService: phone validation rejects alphabetic strings and malformed inputs', () => {
  assert.equal(isValidPhone('abcdefghij'), false, 'Alphabetic strings must be rejected');
  assert.equal(isValidPhone('0316'), false, 'Too short must be rejected');
  assert.equal(isValidPhone(''), false);
  assert.equal(isValidPhone(null), false);
  assert.equal(isValidPhone('03160666083'), true, 'Valid Pakistani 11-digit mobile');
  assert.equal(isValidPhone('+923160666083'), true, 'Valid E.164 Pakistani mobile');
  assert.equal(isValidPhone('+92 316-0666083'), true, 'Formatted mobile number');
});

test('inquiryService: quantity validation requires positive whole integer', () => {
  assert.equal(isValidQuantity(1.5), false, 'Fractional quantities must be rejected');
  assert.equal(isValidQuantity(0), false, 'Zero must be rejected');
  assert.equal(isValidQuantity(-5), false, 'Negative must be rejected');
  assert.equal(isValidQuantity(NaN), false);
  assert.equal(isValidQuantity('50'), false, 'Non-number must be rejected');
  assert.equal(isValidQuantity(50), true);
  assert.equal(isValidQuantity(1), true);
  assert.equal(isValidQuantity(50000), true);
  assert.equal(isValidQuantity(50001), false, 'Over cap must be rejected');
});

test('inquiryService: budget validation enforces non-negative finite amount', () => {
  assert.equal(isValidBudget(-100), false, 'Negative budget must be rejected');
  assert.equal(isValidBudget(NaN), false);
  assert.equal(isValidBudget(null), true, 'Optional budget can be null');
  assert.equal(isValidBudget(5000), true);
  assert.equal(isValidBudget(0), true);
});

test('inquiryService: resolveInquiryProductVariant does not label pack price as per-piece and keeps selected tier', () => {
  // Request 2 packs of 25 pcs
  const resolvedPack = resolveInquiryProductVariant({
    catalog: TEST_CATALOG,
    productId: 'bid-box-luxury-tin',
    requestedVariantLabel: 'Empty Pack (25 pcs)',
    boxMode: 'empty',
    quantity: 2,
  });

  assert.equal(resolvedPack.isVerifiedCatalogProduct, true);
  assert.equal(resolvedPack.productName, 'Luxury Tin Bid Box');
  assert.equal(resolvedPack.packagingVariant, 'Empty Pack (25 pcs)');
  assert.equal(resolvedPack.quantityUnit, 'packs');
  assert.equal(resolvedPack.piecesPerPack, 25);
  assert.equal(resolvedPack.standardPrice, 7500, 'Pack price is Rs. 7,500');
  assert.equal(resolvedPack.perPiecePrice, 300, 'Per-piece rate is Rs. 300 (7500 / 25)');
  assert.equal(resolvedPack.belowMoq, false, '2 packs * 25 pcs = 50 pcs >= MOQ');

  // Request quantity 100 on 1 pc variant: DO NOT change user variant to 100 pcs pack
  const resolvedSingle = resolveInquiryProductVariant({
    catalog: TEST_CATALOG,
    productId: 'bid-box-luxury-tin',
    requestedVariantLabel: 'Empty Box (1 pc)',
    boxMode: 'empty',
    quantity: 100,
  });
  assert.equal(resolvedSingle.packagingVariant, 'Empty Box (1 pc)', 'Do not switch user selected tier');
  assert.equal(resolvedSingle.quantityUnit, 'pieces');
  assert.equal(resolvedSingle.standardPrice, 350);
});

test('inquiryService: unpriced or uncataloged product requires team quote and rejects forged price', () => {
  const resolvedUncataloged = resolveInquiryProductVariant({
    catalog: TEST_CATALOG,
    productId: 'unknown-vendor-box-999',
    requestedVariantLabel: 'Custom',
    boxMode: 'empty',
    quantity: 50,
  });

  assert.equal(resolvedUncataloged.isVerifiedCatalogProduct, false);
  assert.equal(resolvedUncataloged.standardPrice, null, 'Never save client reference price as authoritative');
  assert.equal(resolvedUncataloged.requiresTeamQuote, true);

  const resolvedUnpriced = resolveInquiryProductVariant({
    catalog: TEST_CATALOG,
    productId: 'bespoke-unpriced-box',
    boxMode: 'empty',
    quantity: 50,
  });
  assert.equal(resolvedUnpriced.isVerifiedCatalogProduct, true);
  assert.equal(resolvedUnpriced.standardPrice, null);
  assert.equal(resolvedUnpriced.requiresTeamQuote, true);
});

// ============================================================================
// 3. REAL PRODUCTION ROUTER ENDPOINT TESTS
// ============================================================================

test('endpoint: missing database returns HTTP 503 without saving a receipt', async () => {
  const app = createTestServer({ db: null });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // 1. /api/quotes with db=null
    const resQuote = await fetch(`${baseUrl}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Amina Bibi',
        customerPhone: '03160666083',
        quantity: 50,
      }),
    });
    assert.equal(resQuote.status, 503, 'Must return 503 when db is null');
    const jsonQuote = await resQuote.json();
    assert.equal(jsonQuote.ok, false);
    assert.equal(jsonQuote.code, 'PERSISTENCE_UNAVAILABLE');

    // 2. /api/inquiries with db=null
    const resInq = await fetch(`${baseUrl}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Amina Bibi',
        phone: '03160666083',
        quantity: 50,
      }),
    });
    assert.equal(resInq.status, 503);
    const jsonInq = await resInq.json();
    assert.equal(jsonInq.ok, false);
    assert.equal(jsonInq.code, 'PERSISTENCE_UNAVAILABLE');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('endpoint: failed atomic commit returns 503 and leaves no partial records', async () => {
  const mockDb = createMockFirestore({ throwOnCommit: true });
  const app = createTestServer({ db: mockDb });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Fatima Zahra',
        customerPhone: '03160666083',
        productId: 'bid-box-luxury-tin',
        quantity: 50,
      }),
    });

    assert.equal(res.status, 503);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.error, 'INQUIRY_PERSISTENCE_FAILED');

    // Verify zero records were committed to store
    const inqCol = mockDb._store.get('inquiries');
    const quoteCol = mockDb._store.get('quotes');
    const intentCol = mockDb._store.get('inquiryIntents');
    assert.equal(inqCol ? inqCol.size : 0, 0, 'No partial inquiry records');
    assert.equal(quoteCol ? quoteCol.size : 0, 0, 'No partial quote records');
    assert.equal(intentCol ? intentCol.size : 0, 0, 'No partial intent records');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('endpoint: retry with same submissionKey returns identical quoteId without duplicating records', async () => {
  const mockDb = createMockFirestore();
  const app = createTestServer({ db: mockDb });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    const payload = {
      submissionKey: 'test-stable-key-001',
      customerName: 'Khadija Tul Kubra',
      customerPhone: '03001234567',
      city: 'Islamabad',
      productId: 'bid-box-luxury-tin',
      packagingVariant: 'Empty Box (1 pc)',
      boxMode: 'empty',
      quantity: 50,
      eventType: 'Nikkah',
      leadTimeNoticeAcknowledged: true,
    };

    // First attempt
    const res1 = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'test-stable-key-001',
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res1.status, 200);
    const json1 = await res1.json();
    assert.equal(json1.ok, true);
    const firstQuoteId = json1.quoteId;
    assert.ok(firstQuoteId.startsWith('ABQ-'));

    // Second attempt (simulated network timeout / lost response retry)
    const res2 = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'test-stable-key-001',
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res2.status, 200);
    const json2 = await res2.json();
    assert.equal(json2.quoteId, firstQuoteId, 'Must return the EXACT SAME quoteId');

    // Verify store has exactly ONE inquiry and ONE quote
    const inqCol = mockDb._store.get('inquiries');
    const quoteCol = mockDb._store.get('quotes');
    assert.equal(inqCol.size, 1);
    assert.equal(quoteCol.size, 1);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('endpoint: changed payload under same submissionKey returns 409 IDEMPOTENCY_PAYLOAD_MISMATCH', async () => {
  const mockDb = createMockFirestore();
  const app = createTestServer({ db: mockDb });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    const basePayload = {
      submissionKey: 'test-conflict-key-002',
      customerName: 'Zainab Bibi',
      customerPhone: '03001234567',
      city: 'Lahore',
      productId: 'bid-box-luxury-tin',
      quantity: 50,
      eventType: 'Nikkah',
    };

    const res1 = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });
    assert.equal(res1.status, 200);

    // Second attempt with altered quantity
    const res2 = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, quantity: 150 }),
    });

    assert.equal(res2.status, 409);
    const json2 = await res2.json();
    assert.equal(json2.code, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('endpoint: rejects invalid phone, fractional quantity, and ignores client forged reference price', async () => {
  const mockDb = createMockFirestore();
  const app = createTestServer({ db: mockDb });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    // 1. Invalid alphabetic phone
    const resPhone = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Bilal Khan',
        customerPhone: 'abcdefghij',
        quantity: 50,
      }),
    });
    assert.equal(resPhone.status, 400);
    assert.equal((await resPhone.json()).code, 'MISSING_PHONE');

    // 2. Fractional quantity
    const resQty = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Bilal Khan',
        customerPhone: '03160666083',
        quantity: 1.5,
      }),
    });
    assert.equal(resQty.status, 400);
    assert.equal((await resQty.json()).code, 'INVALID_QUANTITY');

    // 3. Client forged price (claims referenceUnitPrice = 1)
    const resForged = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Bilal Khan',
        customerPhone: '03160666083',
        productId: 'bid-box-luxury-tin',
        packagingVariant: 'Empty Box (1 pc)',
        boxMode: 'empty',
        quantity: 50,
        referenceUnitPrice: 1, // Attacker attempts to forge catalog price
      }),
    });
    assert.equal(resForged.status, 200);
    const jsonForged = await resForged.json();
    assert.equal(jsonForged.inquiry.standardPrice, 350, 'Server MUST resolve authoritative catalog price (350), NOT forged 1');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('endpoint: preserves custom mode and does not coerce to filled', async () => {
  const mockDb = createMockFirestore();
  const app = createTestServer({ db: mockDb });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Saima Noor',
        phone: '03160666083',
        city: 'Rawalpindi',
        productId: 'bid-box-luxury-tin',
        boxMode: 'custom', // Bespoke custom mode
        quantity: 100,
        eventType: 'Bari Gift Favors',
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.inquiry.boxMode, 'custom', 'Must preserve custom mode');
    assert.equal(json.inquiry.standardPrice, null, 'Custom configuration requires team quote');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('endpoint: admin authorization and public data isolation', async () => {
  // 1. Non-admin is rejected
  const mockDb = createMockFirestore();
  const appUnauth = createTestServer({ db: mockDb, adminAllowed: false });
  const serverUnauth = appUnauth.listen(0, '127.0.0.1');
  await once(serverUnauth, 'listening');
  const portUnauth = (serverUnauth.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${portUnauth}/api/admin/inquiries`);
    assert.equal(res.status, 403);
    assert.equal((await res.json()).code, 'FORBIDDEN_ADMIN');
  } finally {
    await new Promise<void>(resolve => serverUnauth.close(() => resolve()));
  }

  // 2. Authenticated admin reads inquiries and patches agreed price atomically
  const appAdmin = createTestServer({ db: mockDb, adminAllowed: true });
  const serverAdmin = appAdmin.listen(0, '127.0.0.1');
  await once(serverAdmin, 'listening');
  const portAdmin = (serverAdmin.address() as any).port;

  try {
    // Create an inquiry via public endpoint
    const pubRes = await fetch(`http://127.0.0.1:${portAdmin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Patron For Admin Patch',
        customerPhone: '03160666083',
        city: 'Lahore',
        quantity: 50,
      }),
    });
    const quoteId = (await pubRes.json()).quoteId;

    // Admin lists inquiries
    const listRes = await fetch(`http://127.0.0.1:${portAdmin}/api/admin/inquiries`);
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.ok(listJson.inquiries.some((i: any) => i.id === quoteId));

    // Admin patches agreed price
    const patchRes = await fetch(`http://127.0.0.1:${portAdmin}/api/admin/inquiries/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'QUOTED',
        finalAgreedPrice: 15000,
        adminNotes: 'Confirmed 10-day preparation window',
      }),
    });
    assert.equal(patchRes.status, 200);
    const patchJson = await patchRes.json();
    assert.equal(patchJson.inquiry.status, 'QUOTED');
    assert.equal(patchJson.inquiry.finalAgreedPrice, 15000);
    assert.ok(patchJson.whatsappReplyUrl.includes('15%2C000') || patchJson.whatsappReplyUrl.includes('15000'));
  } finally {
    await new Promise<void>(resolve => serverAdmin.close(() => resolve()));
  }
});

// ============================================================================
// 4. AUTHORITATIVE CATALOG RESOLUTION & DYNAMIC UPDATES
// ============================================================================

test('endpoint: dynamic catalog updates and additions reflect immediately without server restart', async () => {
  const mockDb = createMockFirestore();
  const liveCatalog: Product[] = JSON.parse(JSON.stringify(TEST_CATALOG));
  const app = createTestServer({
    db: mockDb,
    catalog: () => liveCatalog,
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    // 1. Initial inquiry for bid-box-luxury-tin has price 350
    const res1 = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Fatima',
        customerPhone: '03160666083',
        productId: 'bid-box-luxury-tin',
        packagingVariant: 'Empty Box (1 pc)',
        boxMode: 'empty',
        quantity: 10,
      }),
    });
    const json1 = await res1.json();
    assert.equal(json1.ok, true);
    assert.equal(json1.inquiry.standardPrice, 350);

    // 2. Admin dynamically updates price from 350 to 520
    const tinProd = liveCatalog.find(p => p.id === 'bid-box-luxury-tin')!;
    tinProd.prices = { ...tinProd.prices, 'Empty Box (1 pc)': 520 };
    tinProd.variants = (tinProd.variants || []).map(v => (v.label === 'Empty Box (1 pc)' ? { ...v, price: 520 } : v));

    const res2 = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Fatima',
        customerPhone: '03160666083',
        productId: 'bid-box-luxury-tin',
        packagingVariant: 'Empty Box (1 pc)',
        boxMode: 'empty',
        quantity: 10,
      }),
    });
    const json2 = await res2.json();
    assert.equal(json2.ok, true);
    assert.equal(json2.inquiry.standardPrice, 520, 'Price update reflects immediately without rebuilding');
    assert.ok(json2.inquiry.whatsappReplyUrl.includes('520'));

    // 3. Admin adds a brand new product dynamically
    const newProd: Product = {
      id: 'dynamic-new-velvet-box',
      name_en: 'Royal Velvet Coffer',
      name_ur: '',
      name_ar: '',
      category: 'celebration-boxes',
      image: null,
      imageName: null,
      prices: { 'Empty Box (1 pc)': 1200 },
      variants: [{ label: 'Empty Box (1 pc)', price: 1200, available: true }],
      wholesale: 950,
      desc_en: '',
      desc_ur: '',
      desc_ar: '',
      active: true,
      inStock: true,
      isBidBox: true,
    };
    liveCatalog.push(newProd);

    const res3 = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Fatima',
        customerPhone: '03160666083',
        productId: 'dynamic-new-velvet-box',
        packagingVariant: 'Empty Box (1 pc)',
        boxMode: 'empty',
        quantity: 10,
      }),
    });
    const json3 = await res3.json();
    assert.equal(json3.ok, true);
    assert.equal(json3.inquiry.isVerifiedCatalogProduct, true);
    assert.equal(json3.inquiry.productName, 'Royal Velvet Coffer');
    assert.equal(json3.inquiry.standardPrice, 1200);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('endpoint: catalog resolution failure returns HTTP 503 CATALOG_UNAVAILABLE without falling back to compiled prices', async () => {
  const mockDb = createMockFirestore();
  const app = createTestServer({
    db: mockDb,
    catalog: () => {
      throw new Error('Firestore catalog query timed out');
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Amina',
        customerPhone: '03160666083',
        productId: 'bid-box-luxury-tin',
        quantity: 20,
      }),
    });
    assert.equal(res.status, 503);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.code, 'CATALOG_UNAVAILABLE');
    assert.equal(json.error, 'CATALOG_UNAVAILABLE');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

// ============================================================================
// 5. NO SILENT VARIANT SUBSTITUTION & MODE CONSTRAINTS
// ============================================================================

test('inquiryService & endpoint: no silent variant substitution for unavailable or nonexistent variants', async () => {
  const catalogWithDisabled: Product[] = [
    {
      id: 'bid-box-acrylic',
      name_en: 'Acrylic Favor Box',
      name_ur: '',
      name_ar: '',
      category: 'celebration-boxes',
      image: null,
      imageName: null,
      prices: {
        'Empty Box (1 pc)': 250,
        'Filled Box (1 pc)': 550,
        'Discontinued Luxury Edition': 800,
      },
      variants: [
        { label: 'Empty Box (1 pc)', price: 250, available: true },
        { label: 'Filled Box (1 pc)', price: 550, available: true },
        { label: 'Discontinued Luxury Edition', price: 800, available: false },
      ],
      wholesale: 200,
      desc_en: '',
      desc_ur: '',
      desc_ar: '',
      active: true,
      inStock: true,
      isBidBox: true,
    },
    {
      id: 'inactive-catalog-box',
      name_en: 'Archived Gift Coffer',
      name_ur: '',
      name_ar: '',
      category: 'celebration-boxes',
      image: null,
      imageName: null,
      prices: { 'Empty Box (1 pc)': 500 },
      variants: [{ label: 'Empty Box (1 pc)', price: 500, available: true }],
      wholesale: 400,
      desc_en: '',
      desc_ur: '',
      desc_ar: '',
      active: false, // inactive product
      inStock: true,
      isBidBox: true,
    },
  ];

  // 1. Nonexistent variant label
  const nonexistent = resolveInquiryProductVariant({
    catalog: catalogWithDisabled,
    productId: 'bid-box-acrylic',
    requestedVariantLabel: 'Nonexistent Gold Lid Variant',
    boxMode: 'empty',
    quantity: 25,
  });
  assert.equal(nonexistent.unresolvedVariant, true);
  assert.equal(nonexistent.requiresTeamQuote, true);
  assert.equal(nonexistent.standardPrice, null, 'Must NOT substitute with Empty Box (1 pc)');
  assert.equal(nonexistent.perPiecePrice, null);
  assert.equal(nonexistent.packagingVariant, 'Nonexistent Gold Lid Variant', 'Preserve customer requested label');

  // 2. Disabled variant (available: false)
  const disabled = resolveInquiryProductVariant({
    catalog: catalogWithDisabled,
    productId: 'bid-box-acrylic',
    requestedVariantLabel: 'Discontinued Luxury Edition',
    boxMode: 'empty',
    quantity: 25,
  });
  assert.equal(disabled.unresolvedVariant, true);
  assert.equal(disabled.requiresTeamQuote, true);
  assert.equal(disabled.standardPrice, null, 'Must NOT substitute disabled variant');

  // 3. Mode mismatch: requested empty mode with filled variant
  const modeMismatch = resolveInquiryProductVariant({
    catalog: catalogWithDisabled,
    productId: 'bid-box-acrylic',
    requestedVariantLabel: 'Filled Box (1 pc)',
    boxMode: 'empty', // Mismatch!
    quantity: 25,
  });
  assert.equal(modeMismatch.requiresTeamQuote, true);
  assert.equal(modeMismatch.standardPrice, null, 'Mode mismatch must require team quote');

  // 4. Inactive product
  const inactive = resolveInquiryProductVariant({
    catalog: catalogWithDisabled,
    productId: 'inactive-catalog-box',
    requestedVariantLabel: 'Empty Box (1 pc)',
    boxMode: 'empty',
    quantity: 25,
  });
  assert.equal(inactive.requiresTeamQuote, true);
  assert.equal(inactive.standardPrice, null, 'Inactive product must require team quote');
});

// ============================================================================
// 6. CUSTOM PRINTING ALIAS END-TO-END
// ============================================================================

test('endpoint: customPrinting and customPrintText alias survives end-to-end identically', async () => {
  const mockDb = createMockFirestore();
  const app = createTestServer({ db: mockDb });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    // 1. Hash equivalence
    const hash1 = computeInquiryPayloadHash({
      customerName: 'Zainab',
      phone: '03160666083',
      city: 'Lahore',
      productId: 'bid-box-luxury-tin',
      customPrinting: 'Foil stamped monogram "Z & H"',
      quantity: 50,
      boxMode: 'empty',
      eventType: 'Nikkah',
    });
    const hash2 = computeInquiryPayloadHash({
      customerName: 'Zainab',
      phone: '03160666083',
      city: 'Lahore',
      productId: 'bid-box-luxury-tin',
      customPrintText: 'Foil stamped monogram "Z & H"',
      quantity: 50,
      boxMode: 'empty',
      eventType: 'Nikkah',
    });
    assert.equal(hash1, hash2, 'Aliases must produce identical payload hash for idempotency');

    // 2. Submit with customPrinting
    const res = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Zainab',
        customerPhone: '03160666083',
        productId: 'bid-box-luxury-tin',
        customPrinting: 'Foil stamped monogram "Z & H"',
        packagingVariant: 'Empty Box (1 pc)',
        boxMode: 'empty',
        quantity: 50,
      }),
    });
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.inquiry.customPrintText, 'Foil stamped monogram "Z & H"');
    assert.ok(json.inquiry.whatsappReplyUrl.includes(encodeURIComponent('Foil stamped monogram "Z & H"')));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

// ============================================================================
// 7. PACK RATES & QUANTITY FORMATTING IN WHATSAPP
// ============================================================================

test('inquiryWhatsApp: pack rates and quantities never label pack prices as /pc', () => {
  // Customer WhatsApp URL
  const custUrl = buildCustomerInquiryWhatsAppUrl({
    productName: 'Luxury Tin Bid Box',
    productId: 'bid-box-luxury-tin',
    packagingVariant: 'Empty Pack (25 pcs)',
    mode: 'empty',
    quantity: 4,
    quantityUnit: 'packs',
    piecesPerPack: 25,
    referenceUnitPrice: 7500,
    perPiecePrice: 300,
    eventType: 'Nikkah',
    customerName: 'Usman',
    customerPhone: '03160666083',
    city: 'Lahore',
  });
  const decodedCust = decodeURIComponent(custUrl);
  assert.match(decodedCust, /Quantity:\* 4 packs \(100 pcs total, 25 pcs\/pack\)/);
  assert.match(decodedCust, /Standard Rate Ref:\* Rs\. 7,500\/pack \(Rs\. 300\/pc\)/);
  assert.doesNotMatch(decodedCust, /Standard Rate Ref:\* Rs\. 7,500\/pc/);

  // Admin WhatsApp URL
  const adminUrl = buildAdminWhatsAppPitchUrl({
    id: 'ABQ-999',
    type: 'bid_box_quote',
    customerName: 'Usman',
    phone: '03160666083',
    productName: 'Luxury Tin Bid Box',
    packagingVariant: 'Empty Pack (25 pcs)',
    boxMode: 'empty',
    quantity: 4,
    quantityUnit: 'packs',
    piecesPerPack: 25,
    standardPrice: 7500,
    perPiecePrice: 300,
    eventType: 'Nikkah',
  });
  const decodedAdmin = decodeURIComponent(adminUrl);
  assert.match(decodedAdmin, /Quantity:\* 4 packs \(100 pcs total, 25 pcs\/pack\)/);
  assert.match(decodedAdmin, /Standard Rate Ref:\* Rs\. 7,500\/pack \(Rs\. 300\/pc\)/);
  assert.doesNotMatch(decodedAdmin, /Standard Rate Ref:\* Rs\. 7,500\/pc/);
});
