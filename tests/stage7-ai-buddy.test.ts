import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Product, CustomQuoteModalInit } from '../src/types';
import {
  getCustomerVisibleCatalog,
  buildBuddyCatalogContext,
  buildBuddySystemInstruction,
  validateAiRecommendations,
  validateInquiryPrefill,
  validateAndSanitizeAssistantReply,
  sanitizeBuddyPrompt,
  OFFICIAL_WHATSAPP_URL,
  isExactOfficialWhatsAppUrl,
  resolveCanonicalProductUrl,
  sanitizeTextUrls,
} from '../src/lib/aiBuddyResolution';
import { extractN8nReply } from '../src/services/n8nAIConsultant';
import { createAiChatRouter } from '../src/lib/aiChatRouter';
import { createInquiriesRouter } from '../src/lib/inquiriesRouter';
import { routeMetadata } from '../src/lib/routeDocument';
import {
  MANDATORY_LEAD_TIME_NOTICE,
  TABARRUK_EMPTY_DEFAULT_NOTICE,
  NON_CATALOG_FILLINGS_DISCLAIMER,
  buildCustomerInquiryWhatsAppUrl,
} from '../src/lib/inquiryWhatsApp';

// ============================================================================
// DETERMINISTIC TEST FIXTURES & CATALOG
// ============================================================================

const TEST_CATALOG: Product[] = [
  {
    id: 'roasted-iranian-pista',
    name_en: 'Roasted Iranian Pistachios (Pista)',
    name_ur: 'بھنا ہوا ایرانی پستہ',
    name_ar: 'فستق إيراني محمص',
    category: 'nuts',
    image: '/images/products/pista.jpg',
    imageName: 'pista.jpg',
    prices: { '250g': 1250, '500g': 2500, '1kg': 4900 },
    wholesale: 4200,
    desc_en: 'Jumbo saffron-roasted Iranian pistachios.',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    status: 'published',
  },
  {
    id: 'bid-box-luxury-tin',
    name_en: 'Luxury Tin Bid Box',
    name_ur: 'لگژری ٹن باکس',
    name_ar: 'علبة قصدير فاخرة',
    category: 'celebration-boxes',
    packagingSubcategory: 'tin',
    isBidBox: true,
    image: '/images/products/tin-box.jpg',
    imageName: 'tin-box.jpg',
    prices: {
      'Empty Box (1 pc)': 350,
      'Empty Pack (25 pcs)': 7500,
      'Filled Box (1 pc)': 650,
    },
    variants: [
      { label: 'Empty Box (1 pc)', price: 350, available: true },
      { label: 'Empty Pack (25 pcs)', price: 7500, available: true },
      { label: 'Filled Box (1 pc)', price: 650, available: true },
      { label: 'Discontinued Lid', price: 900, available: false },
    ],
    wholesale: 280,
    desc_en: 'Matte gold floral embossed keepsake tin.',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    status: 'published',
  },
  {
    id: 'bid-box-tabarruk-set',
    name_en: 'Umrah & Hajj Tabarruk Box Set',
    name_ur: 'عمرہ و حج تبرک سیٹ',
    name_ar: 'طقم تبرك للعمرة والحج',
    category: 'celebration-boxes',
    packagingSubcategory: 'tabarruk',
    isBidBox: true,
    image: '/images/products/tabarruk.jpg',
    imageName: 'tabarruk.jpg',
    prices: {
      'Empty Box Set (1 set)': 1200,
      'Filled Royal Set': 2400,
    },
    variants: [
      { label: 'Empty Box Set (1 set)', price: 1200, available: true },
      { label: 'Filled Royal Set', price: 2400, available: true },
    ],
    wholesale: 950,
    desc_en: 'Velvet coffer with empty crystal bottles for customer-provided Zamzam.',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    status: 'published',
  },
  {
    id: 'unpriced-bid-box',
    name_en: 'Bespoke Custom Wooden Coffer',
    name_ur: 'لکڑی کا کسٹم بکس',
    name_ar: 'صندوق خشبي مخصص',
    category: 'celebration-boxes',
    packagingSubcategory: 'wedding',
    isBidBox: true,
    image: null,
    imageName: null,
    prices: {},
    variants: [],
    quoteOnly: true,
    orderMode: 'inquiry_quote',
    moqOverride: 50,
    wholesale: 0,
    desc_en: 'Handcrafted rosewood coffer with brass latch.',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    status: 'published',
  },
  {
    id: 'draft-tin-box-secret',
    name_en: 'Unpublished Prototype Tin',
    name_ur: 'ڈرافٹ ٹن',
    name_ar: 'علبة سرية',
    category: 'celebration-boxes',
    packagingSubcategory: 'tin',
    isBidBox: true,
    image: '/images/products/draft.jpg',
    imageName: 'draft.jpg',
    prices: { 'Empty Box (1 pc)': 500 },
    variants: [{ label: 'Empty Box (1 pc)', price: 500, available: true }],
    wholesale: 400,
    desc_en: 'Secret upcoming design.',
    desc_ur: '',
    desc_ar: '',
    active: true,
    status: 'draft', // DRAFT product - must never leak publicly
  },
  {
    id: 'archived-old-box',
    name_en: 'Retired 2024 Box',
    name_ur: 'پرانا باکس',
    name_ar: 'علبة قديمة',
    category: 'celebration-boxes',
    packagingSubcategory: 'wedding',
    isBidBox: true,
    image: null,
    imageName: null,
    prices: { 'Empty Box (1 pc)': 300 },
    variants: [{ label: 'Empty Box (1 pc)', price: 300, available: true }],
    wholesale: 200,
    desc_en: 'Discontinued product line.',
    desc_ur: '',
    desc_ar: '',
    active: false,
    status: 'archived', // ARCHIVED product
  },
];

function createMockFirestore() {
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
      const stagedWrites: Array<() => Promise<void>> = [];
      const tx = {
        async get(docRef: any) {
          return await docRef.get();
        },
        set(docRef: any, data: any, setOptions?: any) {
          stagedWrites.push(async () => {
            await docRef.set(data, setOptions);
          });
        },
      };
      const result = await updateFunction(tx);
      for (const write of stagedWrites) {
        await write();
      }
      return result;
    },
  };
  return db;
}

// Helper to start test server using the exact production createAiChatRouter
async function createProductionTestHarness(options: {
  catalog?: Product[];
  askConsultant?: (params: { message: string; history?: unknown; system: string }) => Promise<any>;
  reserveGuestTrial?: (ip: string, userAgent: string) => Promise<number | null>;
  timeoutMs?: number;
}) {
  const app = express();
  app.use(express.json());

  let dynamicCatalog = options.catalog ? [...options.catalog] : [...TEST_CATALOG];
  const inMemoryInquiries = new Map<string, any>();
  const mockDb = createMockFirestore();

  const chatRouter = createAiChatRouter({
    getDb: () => mockDb,
    getCatalog: async () => dynamicCatalog,
    askConsultant: options.askConsultant,
    reserveGuestTrial: options.reserveGuestTrial ?? (async () => 5),
    timeoutMs: options.timeoutMs,
  });

  const inquiriesRouter = createInquiriesRouter({
    getDb: () => mockDb,
    getCatalog: async () => dynamicCatalog,
    inMemoryStore: inMemoryInquiries,
  });

  app.use(chatRouter);
  app.use(inquiriesRouter);

  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    inMemoryInquiries,
    setDynamicCatalog: (newCatalog: Product[]) => {
      dynamicCatalog = newCatalog;
    },
    close: () => server.close(),
  };
}

// ============================================================================
// TEST SUITE: STAGE 7 CORRECTIONS & PRODUCTION REGRESSIONS
// ============================================================================

test('Stage 7.1: Canonical product ID preserved through inquiry modal prefill and submission', async () => {
  const harness = await createProductionTestHarness({
    askConsultant: async () => ({
      reply: 'For your Nikkah, I recommend the Luxury Tin Bid Box at Rs. 350/pc.',
      action: 'answer',
      recommendedProductIds: ['bid-box-luxury-tin'],
      inquiryPrefill: {
        productId: 'bid-box-luxury-tin',
        packagingVariant: 'Empty Box (1 pc)',
        boxMode: 'empty',
        quantity: 50,
        eventType: 'Nikkah',
        targetEventDate: '2026-11-20',
        budgetType: 'total',
        targetPricePkr: 18000,
        monogramText: 'Z & F',
        customPrintText: 'Gold foil stamping',
        city: 'Lahore',
      },
    }),
  });

  try {
    const res = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I need 50 wedding favor boxes for Nikkah' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.inquiryPrefill);

    // DEFECT 1 REGRESSION: productId must be canonical ID 'bid-box-luxury-tin', NOT product name 'Luxury Tin Bid Box'
    assert.equal(body.inquiryPrefill.productId, 'bid-box-luxury-tin');
    assert.equal(body.inquiryPrefill.productName, 'Luxury Tin Bid Box');
    assert.equal(body.inquiryPrefill.modalInit.productId, 'bid-box-luxury-tin');
    assert.equal(body.inquiryPrefill.modalInit.productName, 'Luxury Tin Bid Box');
    assert.equal(body.inquiryPrefill.modalInit.mode, 'empty');
    assert.equal(body.inquiryPrefill.modalInit.quantity, 50);
    assert.equal(body.inquiryPrefill.modalInit.monogramText, 'Z & F');
    assert.equal(body.inquiryPrefill.modalInit.customPrintText, 'Gold foil stamping');

    // Simulate patron clicking "Review & Submit Custom Quote" -> POST /api/quotes
    const quotePayload = {
      submissionKey: 'sub_test_canonical_id_001',
      productId: body.inquiryPrefill.modalInit.productId,
      productName: body.inquiryPrefill.modalInit.productName,
      packagingVariant: body.inquiryPrefill.modalInit.variantLabel,
      boxMode: body.inquiryPrefill.modalInit.mode,
      quantity: body.inquiryPrefill.modalInit.quantity,
      eventType: body.inquiryPrefill.modalInit.eventType,
      targetEventDate: body.inquiryPrefill.modalInit.targetEventDate,
      monogramText: body.inquiryPrefill.modalInit.monogramText,
      customPrinting: body.inquiryPrefill.modalInit.customPrintText,
      budgetType: body.inquiryPrefill.modalInit.budgetType,
      targetPricePkr: body.inquiryPrefill.modalInit.targetPricePkr,
      customerName: 'Fatima Khan',
      customerPhone: '03160666083',
      city: 'Lahore',
      leadTimeNoticeAcknowledged: true,
    };

    const quoteRes = await fetch(`${harness.baseUrl}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quotePayload),
    });

    assert.equal(quoteRes.status, 200);
    const quoteData = await quoteRes.json();
    assert.equal(quoteData.ok, true);
    assert.ok(quoteData.quoteId.startsWith('ABQ-'));
    assert.equal(quoteData.inquiry.productId, 'bid-box-luxury-tin');
    assert.equal(quoteData.inquiry.productName, 'Luxury Tin Bid Box');
    assert.equal(quoteData.inquiry.quantity, 50);
    assert.equal(quoteData.inquiry.standardPrice, 350);
  } finally {
    harness.close();
  }
});

test('Stage 7.1 (b): Unresolved/custom request stays custom without selecting an unrelated product', async () => {
  const harness = await createProductionTestHarness({
    askConsultant: async () => ({
      reply: 'We can craft custom laser-engraved acrylic coffrets upon request.',
      action: 'answer',
      inquiryPrefill: {
        productId: 'nonexistent-custom-acrylic-coffer',
        packagingVariant: 'Custom Hexagon (1 pc)',
        boxMode: 'custom',
        quantity: 100,
        eventType: 'Baat Pakki',
      },
    }),
  });

  try {
    const res = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Can you make custom acrylic hexagon boxes?' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.inquiryPrefill);

    // Unresolved product ID must become 'custom'
    assert.equal(body.inquiryPrefill.productId, 'custom');
    assert.equal(body.inquiryPrefill.productName, 'Custom Packaging Request');
    assert.equal(body.inquiryPrefill.modalInit.productId, 'custom');
    assert.equal(body.inquiryPrefill.standardPrice, null);
    assert.equal(body.inquiryPrefill.packagingSubtotal, null);
    assert.equal(body.inquiryPrefill.requiresTeamQuote, true);
  } finally {
    harness.close();
  }
});

test('Stage 7.2: Recommendation navigation uses canonical /product/:id and resolves properly', async () => {
  const harness = await createProductionTestHarness({
    askConsultant: async () => ({
      reply: 'Here are our celebration packaging selections.',
      action: 'answer',
      recommendedProductIds: ['bid-box-luxury-tin', 'bid-box-tabarruk-set'],
    }),
  });

  try {
    const res = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Show me wedding favor boxes' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.recommendations.length, 2);

    const tinRec = body.recommendations[0];
    // DEFECT 2 REGRESSION: Must NOT use /celebration-boxes?product=...
    assert.equal(tinRec.url, '/product/bid-box-luxury-tin');
    assert.ok(!tinRec.url.includes('celebration-boxes?product'));

    // Verify canonical route resolution through routeMetadata
    const origin = 'https://allbarka.com';
    const meta = routeMetadata(tinRec.url, origin, TEST_CATALOG);
    assert.equal(meta.status, 200);
    assert.equal(meta.type, 'product');
    assert.ok(meta.title.includes('Luxury Tin Bid Box'));

    // Assert that the rejected old URL would 404
    const badMeta = routeMetadata('/celebration-boxes?product=bid-box-luxury-tin', origin, TEST_CATALOG);
    assert.equal(badMeta.status, 404);
  } finally {
    harness.close();
  }
});

test('Stage 7.3: Public-catalog restrictions strictly exclude draft and archived products across all paths', async () => {
  // Test 1: getCustomerVisibleCatalog excludes drafts & archived
  const visible = getCustomerVisibleCatalog(TEST_CATALOG);
  const visibleIds = visible.map(p => p.id);
  assert.ok(!visibleIds.includes('draft-tin-box-secret'), 'Draft product must not be in visible catalog');
  assert.ok(!visibleIds.includes('archived-old-box'), 'Archived product must not be in visible catalog');
  assert.ok(visibleIds.includes('bid-box-luxury-tin'), 'Published product must be included');

  // Test 2: AI recommendation of a draft ID is dropped
  const recommendations = validateAiRecommendations(TEST_CATALOG, ['draft-tin-box-secret', 'bid-box-luxury-tin']);
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].productId, 'bid-box-luxury-tin');

  // Test 3: DEFECT 3 REGRESSION - validateInquiryPrefill with guessed draft ID returns generic custom request
  const prefill = validateInquiryPrefill(TEST_CATALOG, {
    productId: 'draft-tin-box-secret',
    quantity: 10,
    boxMode: 'empty',
  });

  assert.ok(prefill);
  assert.equal(prefill.productId, 'custom');
  assert.equal(prefill.productName, 'Custom Packaging Request');
  assert.equal(prefill.standardPrice, null, 'Must not reveal draft price Rs. 500');
  assert.equal(prefill.packagingSubtotal, null, 'Must not reveal draft subtotal Rs. 5000');
  assert.equal(prefill.modalInit.productId, 'custom');
  assert.equal(prefill.requiresTeamQuote, true);
});

test('Stage 7.4: Mixed priced and unpriced catalogs handle quote-only items without throwing', async () => {
  // buildBuddyCatalogContext must not throw on unpriced products
  const { contextText, visibleCount } = buildBuddyCatalogContext(TEST_CATALOG);
  assert.ok(visibleCount >= 3);
  assert.ok(contextText.includes('Bespoke Custom Wooden Coffer'));
  assert.ok(contextText.includes('Custom Quote on Request'));
  assert.ok(contextText.includes('MOQ: 50 pcs'));

  // Recommendation for quote-only item never claims purchasability with a price
  const recommendations = validateAiRecommendations(TEST_CATALOG, ['unpriced-bid-box']);
  assert.equal(recommendations.length, 1);
  const unpricedRec = recommendations[0];
  assert.equal(unpricedRec.startingPrice, null);
  assert.equal(unpricedRec.displayPrice, 'Quote on request');
  assert.equal(unpricedRec.moq, 50);

  // Full chatbot endpoint handles unpriced items smoothly
  const harness = await createProductionTestHarness({
    askConsultant: async () => ({
      reply: 'We offer handcrafted rosewood coffers by quote.',
      action: 'answer',
      recommendedProductIds: ['unpriced-bid-box'],
    }),
  });

  try {
    const res = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Tell me about wooden boxes' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.recommendations[0].displayPrice, 'Quote on request');
  } finally {
    harness.close();
  }
});

test('Stage 7.4 (b): Pack price, unit, and MOQ consistency for multi-piece packaging', () => {
  const packCatalog: Product[] = [
    {
      id: 'bulk-wedding-box',
      name_en: 'Royal Wedding Card Box',
      name_ur: '',
      name_ar: '',
      category: 'celebration-boxes',
      isBidBox: true,
      image: null,
      imageName: null,
      prices: {
        'Empty Pack (25 pcs)': 7500,
      },
      variants: [
        { label: 'Empty Pack (25 pcs)', price: 7500, available: true },
      ],
      wholesale: 6000,
      desc_en: 'Card box.',
      desc_ur: '',
      desc_ar: '',
      active: true,
      inStock: true,
      status: 'published',
    },
  ];

  const recs = validateAiRecommendations(packCatalog, ['bulk-wedding-box']);
  assert.equal(recs.length, 1);
  const rec = recs[0];

  // DEFECT 4 REGRESSION:
  // Must NOT report quantityUnit: 'pieces' with displayPrice: 'Rs. 7,500' leaving price basis unclear!
  assert.equal(rec.quantityUnit, 'packs');
  assert.ok(rec.displayPrice.includes('per pack of 25 pcs'));
  assert.ok(rec.displayPrice.includes('(Rs. 300/pc)'));
  assert.equal(rec.moq, 1);
  assert.equal(rec.moqDisplay, 'Minimum order: 1 pack (25 pieces total)');

  // 10-piece pack with a 25-piece threshold: MOQ is 3 packs (30 pieces total)
  const pack10Catalog: Product[] = [
    {
      id: 'bulk-10pc-box',
      name_en: 'Pack 10 Favor Box',
      name_ur: '',
      name_ar: '',
      category: 'celebration-boxes',
      isBidBox: true,
      image: null,
      imageName: null,
      prices: {
        'Empty Pack (10 pcs)': 1000, // Rs. 100/pc -> threshold 25 pcs -> 3 packs (30 pcs total)
      },
      variants: [
        { label: 'Empty Pack (10 pcs)', price: 1000, available: true },
      ],
      wholesale: 800,
      desc_en: 'Pack 10.',
      desc_ur: '',
      desc_ar: '',
      active: true,
      inStock: true,
      status: 'published',
    },
  ];
  const recs10 = validateAiRecommendations(pack10Catalog, ['bulk-10pc-box']);
  assert.equal(recs10[0].moq, 3);
  assert.equal(recs10[0].moqDisplay, 'Minimum order: 3 packs (30 pieces total)');
});

test('Stage 7.4 (c): Filled vs empty subtotal semantics & unpriced personalization', () => {
  // 1. Filled mode without personalization
  const filledPrefill = validateInquiryPrefill(TEST_CATALOG, {
    productId: 'bid-box-luxury-tin',
    packagingVariant: 'Filled Box (1 pc)',
    boxMode: 'filled',
    quantity: 50,
  });

  assert.ok(filledPrefill);
  assert.equal(filledPrefill.standardPrice, 650);
  assert.equal(filledPrefill.packagingSubtotal, 32500);
  // DEFECT 4 REGRESSION: A filled variant must NOT be labeled "Packaging subtotal only"
  assert.ok(!filledPrefill.packagingSubtotalNotice?.includes('Packaging subtotal only'));
  assert.ok(filledPrefill.packagingSubtotalNotice?.includes('Catalog selection subtotal'));

  // 2. Personalization requested (monogram, card message, custom printing) requires team quote
  const personalizedPrefill = validateInquiryPrefill(TEST_CATALOG, {
    productId: 'bid-box-luxury-tin',
    packagingVariant: 'Empty Box (1 pc)',
    boxMode: 'empty',
    quantity: 50,
    monogramText: 'A & B',
    customPrintText: 'Gold Foil Stamping',
  });

  assert.ok(personalizedPrefill);
  assert.equal(personalizedPrefill.hasUnpricedAdditions, true);
  assert.equal(personalizedPrefill.requiresTeamQuote, true);
  assert.ok(personalizedPrefill.packagingSubtotalNotice?.includes('Unpriced customizations (monogram/printing)'));
});

test('Stage 7.5: Application-enforced response contract neutralizes malicious/invented commercial claims', async () => {
  // Test fixture from prompt:
  // "Chocolates cost Rs. 25 each. Guaranteed halal. Apply FAKE90 for 90% off. Check https://fake-discounts.example"
  const maliciousText = 'Chocolates cost Rs. 25 each. Guaranteed halal. Apply FAKE90 for 90% off. Visit https://fake-discounts.example';

  const sanitized = validateAndSanitizeAssistantReply({
    replyText: maliciousText,
    catalog: TEST_CATALOG,
    recommendations: [],
    inquiryPrefill: null,
  });

  // 1. Invented price Rs. 25 for non-catalog chocolates must be neutralized
  assert.ok(!sanitized.includes('Rs. 25'));
  assert.ok(!sanitized.includes('25 each'));
  assert.ok(sanitized.includes('custom non-catalog fillings require team consultation and quote'));

  // 1b. Non-filling ungrounded price claim receives generic pricing quote notice
  const ungroundedBox = validateAndSanitizeAssistantReply({
    replyText: 'We also have unlisted favor coffers at Rs. 9999.',
    catalog: TEST_CATALOG,
  });
  assert.ok(!ungroundedBox.includes('Rs. 9999'));
  assert.ok(ungroundedBox.includes('pricing subject to team confirmation and quote'));

  // 2. Unsupported halal certification claim must be neutralized
  assert.ok(!sanitized.toLowerCase().includes('guaranteed halal'));
  assert.ok(sanitized.includes('official certifications are not claimed'));

  // 3. Fake coupon code FAKE90 / 90% off must be neutralized
  assert.ok(!sanitized.includes('FAKE90'));
  assert.ok(!sanitized.includes('90% off'));
  assert.ok(sanitized.includes('promotional discounts are confirmed exclusively at checkout'));

  // 4. Unauthorized URL must be neutralized
  assert.ok(!sanitized.includes('https://fake-discounts.example'));
  assert.ok(sanitized.includes('https://wa.me/923160666083'));
});

test('Stage 7.5 (b): Legacy plain-text provider responses pass through same sanitization and output checks', async () => {
  const legacyText = 'Our Roasted Iranian Pistachios are Rs. 2,500 per 500g and in stock.';

  const sanitized = validateAndSanitizeAssistantReply({
    replyText: legacyText,
    catalog: TEST_CATALOG,
  });

  // Valid catalog price Rs. 2,500 is preserved
  assert.ok(sanitized.includes('Rs. 2,500'));
});

test('Stage 7.5 (c): Catalog outage enforces unpriced guidance and verified WhatsApp contact', async () => {
  const sanitized = validateAndSanitizeAssistantReply({
    replyText: 'Pista is Rs. 2,500 and we have 50 in stock ready for delivery.',
    catalog: [],
    isCatalogFailure: true,
  });

  // In catalog outage, any pricing or immediate stock commitment is replaced with unpriced WhatsApp guidance
  assert.ok(!sanitized.includes('Rs. 2,500'));
  assert.ok(sanitized.includes('offline'));
  assert.ok(sanitized.includes('https://wa.me/923160666083'));
});

test('Stage 7.2 (b): Link destination validation allows only verified public products and exact WhatsApp URL', () => {
  // 1. Valid public product route is preserved
  const validProductText = 'You can view our box at /product/bid-box-luxury-tin.';
  const sanitizedValid = validateAndSanitizeAssistantReply({
    replyText: validProductText,
    catalog: TEST_CATALOG,
  });
  assert.ok(sanitizedValid.includes('/product/bid-box-luxury-tin.'));

  // 2. Nonexistent product route is redirected to official WhatsApp
  const fakeProductText = 'Check out our special coffer at /product/nonexistent-item or https://fake.example/product/nonexistent-item';
  const sanitizedFake = validateAndSanitizeAssistantReply({
    replyText: fakeProductText,
    catalog: TEST_CATALOG,
  });
  assert.ok(!sanitizedFake.includes('/product/nonexistent-item'));
  assert.ok(!sanitizedFake.includes('fake.example'));
  assert.ok(sanitizedFake.includes(OFFICIAL_WHATSAPP_URL));

  // 3. Lookalike WhatsApp domain (e.g. wa.me/923160666083.attacker.com) is strictly rejected
  const lookalikeText = 'Contact us on WhatsApp: https://wa.me/923160666083.attacker.com';
  const sanitizedLookalike = validateAndSanitizeAssistantReply({
    replyText: lookalikeText,
    catalog: TEST_CATALOG,
  });
  assert.ok(!sanitizedLookalike.includes('attacker.com'));
  assert.ok(sanitizedLookalike.includes(OFFICIAL_WHATSAPP_URL));

  // 4. Exact official WhatsApp URL with trailing punctuation is preserved cleanly
  const exactWaText = 'Please message our concierge: https://wa.me/923160666083.';
  const sanitizedWa = validateAndSanitizeAssistantReply({
    replyText: exactWaText,
    catalog: TEST_CATALOG,
  });
  assert.ok(sanitizedWa.includes('https://wa.me/923160666083.'));

  // 5. Direct unit verification of helper functions
  assert.equal(isExactOfficialWhatsAppUrl('https://wa.me/923160666083'), true);
  assert.equal(isExactOfficialWhatsAppUrl('https://wa.me/923160666083.'), true);
  assert.equal(isExactOfficialWhatsAppUrl('https://wa.me/923160666083.attacker.com'), false);
  assert.equal(isExactOfficialWhatsAppUrl('https://wa.me/923001234567'), false);
  assert.equal(resolveCanonicalProductUrl('/product/bid-box-luxury-tin', TEST_CATALOG), '/product/bid-box-luxury-tin');
  assert.equal(resolveCanonicalProductUrl('/product/draft-tin-box-secret', TEST_CATALOG), null);
  assert.equal(resolveCanonicalProductUrl('/product/nonexistent-box', TEST_CATALOG), null);
});

test('Stage 7.5 (d): Grounded commercial facts eliminate numeric allowlisting reproductions', () => {
  // Test catalog with single Rs. 500 product
  const catalogWith500Only: Product[] = [
    {
      id: 'box-500',
      name_en: 'Standard Favor Box',
      name_ur: '',
      name_ar: '',
      category: 'celebration-boxes',
      isBidBox: true,
      image: null,
      imageName: null,
      prices: { 'Empty Box (1 pc)': 500 },
      variants: [{ label: 'Empty Box (1 pc)', price: 500, available: true }],
      wholesale: 400,
      desc_en: 'Box.',
      desc_ur: '',
      desc_ar: '',
      active: true,
      inStock: true,
      status: 'published',
    },
  ];

  // Reproduction A: Catalog has only Rs. 500 box -> "Chocolates cost Rs. 500 each."
  // Previously passed because 500 was in global verifiedPrices. Must now be neutralized!
  const replyA = validateAndSanitizeAssistantReply({
    replyText: 'For your event, Chocolates cost Rs. 500 each.',
    catalog: catalogWith500Only,
  });
  assert.ok(!replyA.includes('Rs. 500'));
  assert.ok(!replyA.includes('500 each'));
  assert.ok(replyA.includes('custom non-catalog fillings require team consultation and quote'));

  // Reproduction B: "Chocolates cost Rs. 150 each."
  // Previously passed because 150 was hardcoded shipping amount. Must now be neutralized!
  const replyB = validateAndSanitizeAssistantReply({
    replyText: 'Chocolates cost Rs. 150 each.',
    catalog: catalogWith500Only,
  });
  assert.ok(!replyB.includes('Rs. 150'));
  assert.ok(!replyB.includes('150 each'));
  assert.ok(replyB.includes('custom non-catalog fillings require team consultation and quote'));

  // Reproduction C: Customer budget 1234 allows "Our approved price is Rs. 1234."
  // Previously passed because budget was added to verifiedPrices. Must now be neutralized!
  const replyC = validateAndSanitizeAssistantReply({
    replyText: 'Our approved price is Rs. 1234.',
    catalog: catalogWith500Only,
    inquiryPrefill: {
      productId: 'box-500',
      productName: 'Standard Favor Box',
      boxMode: 'empty',
      quantity: 50,
      quantityUnit: 'pieces',
      piecesPerPack: 1,
      totalPieces: 50,
      eventType: 'Nikkah',
      targetPricePkr: 1234,
      requiresTeamQuote: false,
      leadTimeNotice: '',
      modalInit: {} as any,
    },
  });
  assert.ok(!replyC.includes('Our approved price'));
  assert.ok(replyC.includes('customer proposed budget'));

  // Reproduction D: "Chocolates cost twenty five rupees each."
  // Non-catalog filling with English word numbers must be neutralized!
  const replyD = validateAndSanitizeAssistantReply({
    replyText: 'Chocolates cost twenty five rupees each.',
    catalog: catalogWith500Only,
  });
  assert.ok(!replyD.includes('twenty five rupees'));
  assert.ok(replyD.includes('custom non-catalog fillings require team consultation and quote'));

  // Reproduction E: Urdu non-catalog filling price: "چاکلیٹ کی قیمت ۲۵ روپے ہے۔"
  const replyE = validateAndSanitizeAssistantReply({
    replyText: 'چاکلیٹ کی قیمت ۲۵ روپے ہے۔',
    catalog: catalogWith500Only,
    language: 'ur',
  });
  assert.ok(!replyE.includes('۲۵ روپے'));
  assert.ok(replyE.includes('کسٹم فلنگز'));

  // Reproduction F: "We have 900 chocolates in stock, certified organic and delivery guaranteed tomorrow."
  const replyF = validateAndSanitizeAssistantReply({
    replyText: 'We have 900 chocolates in stock, certified organic and delivery guaranteed tomorrow.',
    catalog: catalogWith500Only,
  });
  assert.ok(!replyF.includes('900 chocolates in stock'));
  assert.ok(!replyF.includes('certified organic'));
  assert.ok(!replyF.includes('delivery guaranteed tomorrow'));
  assert.ok(replyF.includes('artisanal selections are prepared to order'));
  assert.ok(replyF.includes('official certifications are not claimed'));
  assert.ok(replyF.includes('delivery timelines are confirmed upon order review'));
});

test('Stage 7.5 (e): Valid catalog product facts, prices, and store shipping are preserved in prose', () => {
  // 1. Valid product price
  const reply1 = validateAndSanitizeAssistantReply({
    replyText: 'Our Luxury Tin Bid Box is Rs. 350 / pc.',
    catalog: TEST_CATALOG,
  });
  assert.ok(reply1.includes('Rs. 350 / pc'));

  // 2. Valid multi-portion pistachio price
  const reply2 = validateAndSanitizeAssistantReply({
    replyText: 'Roasted Iranian Pistachios are Rs. 2,500 per 500g.',
    catalog: TEST_CATALOG,
  });
  assert.ok(reply2.includes('Rs. 2,500 per 500g'));

  // 3. Valid store shipping rate in shipping context
  const reply3 = validateAndSanitizeAssistantReply({
    replyText: 'Standard delivery in Lahore is Rs. 250.',
    catalog: TEST_CATALOG,
  });
  assert.ok(reply3.includes('Rs. 250'));
});

test('Stage 7.6: Dynamic admin price update is reflected through the real catalog-loading dependency', async () => {
  let catalogPrice = 2500;
  const harness = await createProductionTestHarness({
    catalog: TEST_CATALOG,
    askConsultant: async ({ system }) => {
      // Return recommendation for pista
      return {
        reply: `Pista is Rs. ${catalogPrice}.`,
        action: 'answer',
        recommendedProductIds: ['roasted-iranian-pista'],
      };
    },
  });

  try {
    // 1. Initial query: price is 2500
    const res1 = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Price of pista?' }),
    });
    const data1 = await res1.json();
    assert.equal(data1.recommendations[0].startingPrice, 1250); // 250g starting price

    // 2. Admin updates the catalog dynamically
    catalogPrice = 3000;
    const updatedCatalog = TEST_CATALOG.map(p =>
      p.id === 'roasted-iranian-pista'
        ? { ...p, prices: { '250g': 1500, '500g': 3000, '1kg': 5800 } }
        : p
    );
    harness.setDynamicCatalog(updatedCatalog);

    // 3. Subsequent query without rebuilding server: starting price updates dynamically
    const res2 = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Price of pista now?' }),
    });
    const data2 = await res2.json();
    assert.equal(data2.recommendations[0].startingPrice, 1500);
  } finally {
    harness.close();
  }
});

test('Stage 7.6 (b): Provider timeout returns HTTP 503 AI_TIMEOUT', async () => {
  const harness = await createProductionTestHarness({
    timeoutMs: 100, // Short timeout for test
    askConsultant: async () => {
      // Simulate stalled external webhook
      await new Promise(resolve => setTimeout(resolve, 500));
      return { reply: 'Stalled answer', action: 'answer' };
    },
  });

  try {
    const res = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.code, 'AI_TIMEOUT');
  } finally {
    harness.close();
  }
});
