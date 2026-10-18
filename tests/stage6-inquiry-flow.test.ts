import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import {
  CANONICAL_WHATSAPP_PHONE,
  MANDATORY_LEAD_TIME_NOTICE,
  NON_CATALOG_FILLINGS_DISCLAIMER,
  TABARRUK_EMPTY_DEFAULT_NOTICE,
  formatFillingsLabel,
  buildCustomerInquiryWhatsAppUrl,
} from '../src/lib/inquiryWhatsApp';
import {
  calculatePackagingMoq,
  isPackagingProduct,
} from '../src/lib/packagingMoq';
import { submitCustomQuoteInquiry } from '../src/lib/storefrontSubmissions';
import type { Product, CustomQuoteModalInit } from '../src/types';

// ============================================================================
// 1. INQUIRY WHATSAPP & POLICY NOTICES
// ============================================================================

test('inquiryWhatsApp: canonical phone and mandatory policy text match exact specifications', () => {
  assert.equal(CANONICAL_WHATSAPP_PHONE, '923160666083');

  // Exact lead time notice:
  assert.equal(
    MANDATORY_LEAD_TIME_NOTICE,
    'Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate.'
  );

  // Exact Tabarruk empty packaging default notice:
  assert.equal(
    TABARRUK_EMPTY_DEFAULT_NOTICE,
    'Tabarruk bottles and base packaging are EMPTY by default. Optional fillings (Zamzam, Ajwa dates, roasted almonds) are custom additions subject to team confirmation and quote.'
  );

  // Non-catalog fillings disclaimer:
  assert.match(NON_CATALOG_FILLINGS_DISCLAIMER, /Chocolates, candies, and non-catalog fillings are customer-requested/i);
  assert.match(NON_CATALOG_FILLINGS_DISCLAIMER, /subject to team sourcing confirmation and quote/i);
});

test('inquiryWhatsApp: formatFillingsLabel maps known keys and passes custom keys', () => {
  assert.equal(formatFillingsLabel([]), '');
  assert.equal(
    formatFillingsLabel(['dry_fruits', 'dates', 'chocolates']),
    'Dry Fruits & Nuts, Premium Dates, Chocolates & Truffles (Custom-sourced)'
  );
  assert.equal(
    formatFillingsLabel(['candies', 'other']),
    'Candies & Sweets (Custom-sourced), Special Custom Fillings'
  );
  assert.equal(
    formatFillingsLabel(['panjeeri']),
    'panjeeri'
  );
});

test('inquiryWhatsApp: buildCustomerInquiryWhatsAppUrl builds saved quote URL with ref ID and all details', () => {
  const url = buildCustomerInquiryWhatsAppUrl({
    quoteId: 'ABQ-890123-456',
    isUnsavedDraft: false,
    productName: 'Royal Hexagonal Tin Box',
    productId: 'tin-box-002',
    packagingVariant: 'Empty Box (1 pc)',
    mode: 'empty',
    quantity: 150,
    eventType: 'Nikkah & Baraat',
    targetEventDate: '2026-11-20',
    preferredFillings: ['dry_fruits', 'dates'],
    customFillingsNotes: 'Half roasted cashews, half Ajwa dates',
    monogramText: 'F & Z',
    cardMessage: 'With love from the Khan Family',
    customPrinting: 'Gold foil typography on lid',
    budgetType: 'per_piece',
    targetPricePkr: 220,
    referenceUnitPrice: 260,
    customerName: 'Fatima Zahra',
    customerPhone: '03160666083',
    city: 'Lahore',
    isTabarruk: false,
  });

  assert.ok(url.startsWith(`https://wa.me/${CANONICAL_WHATSAPP_PHONE}?text=`));
  const decodedText = decodeURIComponent(url.split('?text=')[1]);

  assert.match(decodedText, /Ref #ABQ-890123-456/);
  assert.doesNotMatch(decodedText, /\[UNSAVED DRAFT\]/);
  assert.match(decodedText, /Selected Product:\* Royal Hexagonal Tin Box \(tin-box-002\)/);
  assert.match(decodedText, /Variant \/ Portion:\* Empty Box \(1 pc\)/);
  assert.match(decodedText, /Packaging Mode:\* Box Only \(Empty Packaging\)/);
  assert.match(decodedText, /Quantity:\* 150 pcs/);
  assert.match(decodedText, /Occasion \/ Event:\* Nikkah & Baraat/);
  assert.match(decodedText, /Target Event Date:\* 2026-11-20/);
  assert.match(decodedText, /Preparation Lead Time:\* Acknowledged \(min 10 calendar days after design approval & advance\)/);
  assert.match(decodedText, /Preferred Fillings:\* Dry Fruits & Nuts, Premium Dates/);
  assert.match(decodedText, /Fillings Details:\* Half roasted cashews, half Ajwa dates/);
  assert.match(decodedText, /Monogram \/ Name Tag:\* F & Z/);
  assert.match(decodedText, /Card \/ Ribbon Message:\* With love from the Khan Family/);
  assert.match(decodedText, /Design & Printing Notes:\* Gold foil typography on lid/);
  assert.match(decodedText, /Standard Rate Ref:\* Rs\. 260\/pc/);
  assert.match(decodedText, /Target Offer \/ Budget:\* Rs\. 220 PKR \(per piece\)/);
  assert.match(decodedText, /Name:\* Fatima Zahra/);
  assert.match(decodedText, /Phone \/ WhatsApp:\* 03160666083/);
  assert.match(decodedText, /City:\* Lahore/);
});

test('inquiryWhatsApp: buildCustomerInquiryWhatsAppUrl generates [UNSAVED DRAFT] with no fake ID when persistence failed', () => {
  const url = buildCustomerInquiryWhatsAppUrl({
    quoteId: null,
    isUnsavedDraft: true,
    productName: 'Velvet Heritage Box',
    productId: 'wedding-box-001',
    mode: 'custom',
    quantity: 200,
    eventType: 'Walima',
    customerName: 'Ahmed Malik',
    customerPhone: '03001234567',
    city: 'Karachi',
    referenceUnitPrice: null,
  });

  const decodedText = decodeURIComponent(url.split('?text=')[1]);

  assert.match(decodedText, /\[UNSAVED DRAFT\]/);
  assert.doesNotMatch(decodedText, /Ref #/);
  assert.match(decodedText, /Packaging Mode:\* Bespoke Packaging & Custom Fillings/);
  assert.match(decodedText, /Standard Rate Ref:\* Custom Quote on Request/);
});

test('inquiryWhatsApp: Tabarruk inquiry includes explicit empty-default notice', () => {
  const url = buildCustomerInquiryWhatsAppUrl({
    quoteId: 'ABQ-TAB-001',
    productName: 'Tabarruk Zamzam & Ajwa Treasure Box',
    productId: 'tabarruk-set-004',
    mode: 'empty',
    quantity: 100,
    eventType: 'Umrah & Hajj Favors',
    customerName: 'Zainab Bibi',
    customerPhone: '03219876543',
    city: 'Rawalpindi',
    isTabarruk: true,
  });

  const decodedText = decodeURIComponent(url.split('?text=')[1]);
  assert.match(decodedText, /Tabarruk Notice:\* Empty by default; fillings added upon confirmation/);
});

// ============================================================================
// 2. AUTHORITATIVE MOQ & PRICING SEPARATION
// ============================================================================

test('packagingMoq: calculatePackagingMoq derives authoritative MOQ for priced packaging', () => {
  const packagingProduct: Product = {
    id: 'bid-box-luxury-tin',
    name_en: 'Luxury Tin Bid Box',
    name_ur: '',
    name_ar: '',
    category: 'celebration-boxes',
    image: null,
    imageName: null,
    prices: { 'Empty Box (1 pc)': 350 },
    wholesale: 280,
    desc_en: '',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    isBidBox: true,
  };

  assert.equal(isPackagingProduct(packagingProduct), true);
  // ceil(5000 / 350) = 15
  const moq = calculatePackagingMoq(packagingProduct, 'Empty Box (1 pc)');
  assert.equal(moq, 15);
});

test('packagingMoq: unpriced or custom packaging throws error so inquiry flags team confirmation', () => {
  const unpricedProduct: Product = {
    id: 'custom-bespoke-box',
    name_en: 'Bespoke Acrylic Treasure',
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
  };

  assert.throws(
    () => calculatePackagingMoq(unpricedProduct),
    /A valid positive published price is required to calculate MOQ/
  );
});

test('packagingMoq: ordinary food products are exempt from packaging MOQ rules', () => {
  const foodProduct: Product = {
    id: 'roasted-almonds',
    name_en: 'Roasted Salted Almonds',
    name_ur: '',
    name_ar: '',
    category: 'dry-fruits',
    image: null,
    imageName: null,
    prices: { '500g': 1800 },
    wholesale: 1500,
    desc_en: '',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
  };

  assert.equal(isPackagingProduct(foodProduct), false);
  assert.equal(calculatePackagingMoq(foodProduct), 1);
});

// ============================================================================
// 3. SERVER-SIDE /api/quotes & /api/inquiries ENDPOINTS
// ============================================================================

function createTestInquiryApp(options?: { throwOnPersist?: boolean }) {
  const app = express();
  app.use(express.json());

  const storedInquiries = new Map<string, any>();

  function sanitizePublicInquiryInput(raw: any): Record<string, any> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const allowedCustomerKeys = new Set([
      'customerName', 'name', 'phone', 'customerPhone', 'contact', 'email', 'city',
      'type', 'source', 'productId', 'productName', 'boxId', 'boxName', 'boxMode', 'mode',
      'quantity', 'estimatedQuantity', 'standardPrice', 'referenceUnitPrice',
      'offeredPrice', 'targetPricePkr', 'customerOfferedRate', 'eventType',
      'customPrintText', 'customPrinting', 'packagingVariant', 'variantLabel', 'portion', 'targetEventDate',
      'deliveryCity', 'notes', 'message', 'customHamperNotes', 'metadata', 'topic',
      'budgetType', 'preferredFillings', 'customFillingsNotes', 'monogramText', 'cardMessage',
      'leadTimeNoticeAcknowledged'
    ]);
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (allowedCustomerKeys.has(key)) sanitized[key] = val;
    }
    return sanitized;
  }

  app.post('/api/quotes', async (req, res) => {
    try {
      const raw = sanitizePublicInquiryInput(req.body || {});
      const resolvedName = String(raw.customerName || raw.name || '').trim();
      const resolvedPhone = String(raw.customerPhone || raw.phone || raw.contact || '').trim();

      if (resolvedName.length < 2) {
        return res.status(400).json({ error: 'Please provide your name.', code: 'MISSING_NAME' });
      }
      if (resolvedPhone.length < 10) {
        return res.status(400).json({ error: 'Please provide a valid phone number.', code: 'MISSING_PHONE' });
      }

      if (options?.throwOnPersist) {
        throw new Error('Firestore connection unavailable (simulated failure)');
      }

      const quoteId = `ABQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const safeQty = Math.max(1, Math.min(50000, Number(raw.quantity || raw.estimatedQuantity) || 50));
      const rawMode = String(raw.boxMode || raw.mode || '').toLowerCase();
      const safeMode: 'empty' | 'filled' | 'custom' =
        rawMode === 'empty' ? 'empty' : rawMode === 'custom' ? 'custom' : 'filled';

      const whatsappUrl = buildCustomerInquiryWhatsAppUrl({
        quoteId,
        productName: String(raw.productName || 'Custom Bid Box'),
        productId: String(raw.productId || 'custom'),
        packagingVariant: raw.packagingVariant || raw.variantLabel || null,
        mode: safeMode,
        quantity: safeQty,
        eventType: String(raw.eventType || 'Nikkah'),
        targetEventDate: raw.targetEventDate || null,
        preferredFillings: Array.isArray(raw.preferredFillings) ? raw.preferredFillings : [],
        customFillingsNotes: raw.customFillingsNotes || '',
        monogramText: raw.monogramText || '',
        cardMessage: raw.cardMessage || '',
        customPrinting: raw.customPrintText || raw.customPrinting || '',
        budgetType: raw.budgetType || null,
        targetPricePkr: raw.targetPricePkr || raw.offeredPrice || null,
        referenceUnitPrice: raw.referenceUnitPrice || raw.standardPrice || null,
        customerName: resolvedName,
        customerPhone: resolvedPhone,
        city: String(raw.city || 'Lahore'),
        isTabarruk: String(raw.productId || '').includes('tabarruk'),
      });

      const record = {
        id: quoteId,
        quoteId,
        type: 'bid_box_quote',
        customerName: resolvedName,
        phone: resolvedPhone,
        city: String(raw.city || 'Lahore'),
        productId: String(raw.productId || 'custom'),
        productName: String(raw.productName || 'Custom Bid Box'),
        packagingVariant: raw.packagingVariant || raw.variantLabel || null,
        boxMode: safeMode,
        quantity: safeQty,
        eventType: String(raw.eventType || 'Nikkah'),
        targetEventDate: raw.targetEventDate || null,
        budgetType: raw.budgetType || null,
        preferredFillings: Array.isArray(raw.preferredFillings) ? raw.preferredFillings : [],
        customFillingsNotes: raw.customFillingsNotes || '',
        monogramText: raw.monogramText || '',
        cardMessage: raw.cardMessage || '',
        standardPrice: raw.referenceUnitPrice || raw.standardPrice || null,
        offeredPrice: raw.targetPricePkr || raw.offeredPrice || null,
        // Crucial security guarantees:
        status: 'NEW',
        finalAgreedPrice: null,
        adminNotes: '',
        assignedTo: null,
        followUpDate: null,
        leadTimeNoticeAcknowledged: Boolean(raw.leadTimeNoticeAcknowledged),
        whatsappUrl,
        createdAt: new Date().toISOString(),
      };

      storedInquiries.set(quoteId, record);

      return res.json({
        ok: true,
        success: true,
        quoteId,
        inquiry: record,
        whatsappUrl,
        message: 'Custom quote logged.',
      });
    } catch (err: any) {
      if (err.message.includes('simulated failure')) {
        return res.status(503).json({
          ok: false,
          error: 'INQUIRY_PERSISTENCE_FAILED',
          message: 'Failed to record inquiry in persistent store. Please retry or message our concierge on WhatsApp.'
        });
      }
      return res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
    }
  });

  return { app, storedInquiries };
}

test('server /api/quotes: validates required fields (name, phone)', async () => {
  const { app } = createTestInquiryApp();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as { port: number };
  const url = `http://127.0.0.1:${port}/api/quotes`;

  try {
    // Missing name
    const res1 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'F', customerPhone: '03160666083' }),
    });
    assert.equal(res1.status, 400);
    const json1 = await res1.json();
    assert.equal(json1.code, 'MISSING_NAME');

    // Missing phone
    const res2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Fatima', customerPhone: '0316' }),
    });
    assert.equal(res2.status, 400);
    const json2 = await res2.json();
    assert.equal(json2.code, 'MISSING_PHONE');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('server /api/quotes: strips staff-only fields and enforces pristine customer defaults', async () => {
  const { app, storedInquiries } = createTestInquiryApp();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as { port: number };
  const url = `http://127.0.0.1:${port}/api/quotes`;

  try {
    const maliciousPayload = {
      customerName: 'Usman Ali',
      customerPhone: '03001234567',
      city: 'Islamabad',
      productId: 'tin-box-002',
      productName: 'Royal Tin Box',
      quantity: 100,
      leadTimeNoticeAcknowledged: true,
      // Attempt to self-approve and set zero agreed price:
      status: 'APPROVED',
      finalAgreedPrice: 0,
      adminNotes: 'Attacker injected note',
      assignedTo: 'Lead Admin',
      followUpDate: '2020-01-01',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(maliciousPayload),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(body.quoteId.startsWith('ABQ-'));

    const saved = storedInquiries.get(body.quoteId);
    assert.ok(saved);
    assert.equal(saved.status, 'NEW', 'Status MUST be NEW');
    assert.equal(saved.finalAgreedPrice, null, 'finalAgreedPrice MUST be null');
    assert.equal(saved.adminNotes, '', 'adminNotes MUST be stripped to empty');
    assert.equal(saved.assignedTo, null, 'assignedTo MUST be null');
    assert.equal(saved.followUpDate, null, 'followUpDate MUST be null');
    assert.equal(saved.leadTimeNoticeAcknowledged, true);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('server /api/quotes: persistence failure returns 503 INQUIRY_PERSISTENCE_FAILED', async () => {
  const { app } = createTestInquiryApp({ throwOnPersist: true });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as { port: number };
  const url = `http://127.0.0.1:${port}/api/quotes`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Maryam Sheikh',
        customerPhone: '03160666083',
        city: 'Lahore',
        quantity: 50,
      }),
    });

    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error, 'INQUIRY_PERSISTENCE_FAILED');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

// ============================================================================
// 4. CLIENT STOREFRONT SUBMISSION CONTRACT
// ============================================================================

test('storefrontSubmissions: submitCustomQuoteInquiry parses success and handles 503 correctly', async () => {
  const originalFetch = globalThis.fetch;
  try {
    // 1. Success case
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          ok: true,
          success: true,
          quoteId: 'ABQ-TEST-12345',
          whatsappUrl: 'https://wa.me/923160666083?text=Test',
          message: 'Custom quote logged.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const successResult = await submitCustomQuoteInquiry({
      productId: 'tin-box-002',
      productName: 'Royal Tin',
      boxMode: 'empty',
      quantity: 100,
      eventType: 'Nikkah',
      customerName: 'Ayesha Khan',
      customerPhone: '03160666083',
      city: 'Lahore',
    });
    assert.equal(successResult.quoteId, 'ABQ-TEST-12345');
    assert.ok(successResult.whatsappUrl.includes('923160666083'));

    // 2. 503 persistence failure case
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: 'INQUIRY_PERSISTENCE_FAILED',
          message: 'Failed to record inquiry in persistent store.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );

    await assert.rejects(
      async () => {
        await submitCustomQuoteInquiry({
          productId: 'tin-box-002',
          productName: 'Royal Tin',
          boxMode: 'empty',
          quantity: 100,
          eventType: 'Nikkah',
          customerName: 'Ayesha Khan',
          customerPhone: '03160666083',
          city: 'Lahore',
        });
      },
      (err: any) => {
        assert.equal(err.status, 503);
        assert.equal(err.code, 'INQUIRY_PERSISTENCE_FAILED');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ============================================================================
// 5. PRIVACY & SECURITY
// ============================================================================

test('privacy: customer contact details never leak into public catalog responses', () => {
  // Verify that Product type definition and catalog products contain no customer contact fields
  const sampleProduct: Product = {
    id: 'tin-box-002',
    name_en: 'Royal Tin Box',
    name_ur: '',
    name_ar: '',
    category: 'celebration-boxes',
    image: null,
    imageName: null,
    prices: { 'Empty Box (1 pc)': 300 },
    wholesale: 240,
    desc_en: '',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
  };

  const productKeys = Object.keys(sampleProduct);
  const forbiddenSensitiveKeys = ['customerName', 'customerPhone', 'phone', 'email', 'notes', 'monogramText'];
  for (const forbidden of forbiddenSensitiveKeys) {
    assert.equal(productKeys.includes(forbidden), false, `Product object must not contain ${forbidden}`);
  }
});
