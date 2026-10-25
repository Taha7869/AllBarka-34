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
  renderDeterministicCommercialAnswer,
  detectLanguageMode,
  FOOTNOTE_DISCLAIMER,
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
  {
    id: 'ajwa-dates-al-madinah',
    name_en: 'Ajwa Dates (Al-Madinah)',
    name_ur: 'عجوہ کھجور',
    name_ar: 'تمر عجوة',
    category: 'dates',
    image: '/images/products/ajwa.jpg',
    imageName: 'ajwa.jpg',
    prices: { '500g': 2500, '1kg': 5000 },
    wholesale: 4000,
    desc_en: 'Premium Saudi Ajwa dates.',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    status: 'published',
  },
  {
    id: 'almonds-american-jumbo',
    name_en: 'Almonds (American Jumbo)',
    name_ur: 'بادام',
    name_ar: 'لوز',
    category: 'nuts',
    image: '/images/products/almonds.jpg',
    imageName: 'almonds.jpg',
    prices: { '500g': 500, '1kg': 1000 },
    wholesale: 800,
    desc_en: 'Crisp California almonds.',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    status: 'published',
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

test('Stage 7.5 (f): Regressions for wrong-product price attribution and paraphrased delivery promises in prose sanitizer', () => {
  // 1. REPRODUCED DEFECT 1: Wrong-product price attribution & paraphrased delivery promise
  // Ajwa Dates is Rs. 5,000/kg; Almonds is Rs. 1,000/kg.
  // "Ajwa Dates are Rs. 1000 per kg. We will deliver your custom boxes tomorrow without fail."
  const reply1 = validateAndSanitizeAssistantReply({
    replyText: 'Ajwa Dates are Rs. 1000 per kg. We will deliver your custom boxes tomorrow without fail.',
    catalog: TEST_CATALOG,
  });
  assert.ok(!reply1.includes('Rs. 1000'), 'Must not allow Almonds price Rs. 1000 to be attributed to Ajwa Dates');
  assert.ok(!reply1.includes('tomorrow without fail'), 'Must not leak delivery promise');
  assert.ok(reply1.includes('(pricing subject to team confirmation and quote)'), 'Wrong-product price is neutralized');
  assert.ok(reply1.includes('10 calendar days preparation'), 'Delivery promise is bounded to mandatory lead-time notice');

  // 2. REPRODUCED DEFECT 1 (b): Cross-product price on celebration packaging
  // Luxury Tin is Rs. 350/pc (variants 350, 7500, 650); Tabarruk Set is Rs. 1200/set.
  // Claiming "Luxury Tin Bid Box is Rs. 1200 per piece." must be neutralized!
  const reply2 = validateAndSanitizeAssistantReply({
    replyText: 'Our Luxury Tin Bid Box is Rs. 1200 per piece.',
    catalog: TEST_CATALOG,
  });
  assert.ok(!reply2.includes('Rs. 1200'), 'Must not allow Tabarruk Set price Rs. 1200 to be attributed to Luxury Tin');
  assert.ok(reply2.includes('(pricing subject to team confirmation and quote)'));

  // 3. Legitimate catalog product facts, valid prices, and customization suggestions are preserved
  const reply3 = validateAndSanitizeAssistantReply({
    replyText: 'Ajwa Dates are Rs. 5,000 per kg, while Almonds are Rs. 1,000 per kg. Luxury Tin Bid Box is Rs. 350 / pc. Would you like custom foil monograms (subject to team quote)?',
    catalog: TEST_CATALOG,
  });
  assert.ok(reply3.includes('Rs. 5,000 per kg'), 'Valid Ajwa Dates price preserved');
  assert.ok(reply3.includes('Rs. 1,000 per kg'), 'Valid Almonds price preserved');
  assert.ok(reply3.includes('Rs. 350 / pc'), 'Valid Luxury Tin price preserved');
  assert.ok(reply3.includes('custom foil monograms'), 'Creative customization suggestion preserved');

  // 4. Paraphrased delivery promises neutralized across common formulations
  const deliveryFormulations = [
    'Custom boxes will arrive tomorrow.',
    'We will deliver your order in 3 days.',
    'We will dispatch your boxes tomorrow without fail.',
    'We guarantee delivery tomorrow.',
  ];
  for (const phrase of deliveryFormulations) {
    const sanitized = validateAndSanitizeAssistantReply({
      replyText: `For your event, ${phrase}`,
      catalog: TEST_CATALOG,
    });
    assert.ok(!sanitized.includes('tomorrow'), `Must not retain unverified arrival timeframe: ${phrase}`);
    assert.ok(!sanitized.includes('in 3 days'), `Must not retain unverified arrival timeframe: ${phrase}`);
    assert.ok(sanitized.includes('10 calendar days preparation'), `Must enforce preparation lead-time notice for: ${phrase}`);
  }

  // 5. Wrong portion price attribution in prose
  const reply5 = validateAndSanitizeAssistantReply({
    replyText: 'Ajwa Dates are Rs. 1250 per kg.',
    catalog: TEST_CATALOG,
  });
  assert.ok(!reply5.includes('Rs. 1250 per kg'));
  assert.ok(reply5.includes('(pricing subject to team confirmation and quote)'));

  // 6. Cross-product price attribution in prose
  const reply6 = validateAndSanitizeAssistantReply({
    replyText: 'Ajwa Dates and Almonds are Rs. 1000 per kg each.',
    catalog: TEST_CATALOG,
  });
  assert.ok(!reply6.includes('Rs. 1000 per kg each'));
  assert.ok(reply6.includes('(pricing subject to team confirmation and quote)'));
});

test('Stage 7.5 (g): Bounded timing instrumentation on production router path without PII or credential leakage', async () => {
  const harness = await createProductionTestHarness({
    catalog: TEST_CATALOG,
    askConsultant: async () => {
      await new Promise(r => setTimeout(r, 20));
      return {
        reply: 'Consultant response with timing.',
        action: 'answer',
        latencyMs: 18,
      };
    },
  });

  try {
    const res = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Check timing telemetry' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.timing, 'timing object must be returned');
    assert.equal(typeof data.timing.totalMs, 'number');
    assert.ok(data.timing.totalMs >= 15);
    assert.equal(typeof data.timing.bridgeMs, 'number');
    assert.equal(data.timing.bridgeMs, 18);

    // Verify zero PII or credentials leaked in response
    const jsonStr = JSON.stringify(data);
    assert.doesNotMatch(jsonStr, /secret|key|token|password|bearer|authorization/i);
  } finally {
    harness.close();
  }
});

test('Stage 7.5 (h): Deterministic commercial response contract regressions', async () => {
  let simulatedAnswer: any = {};
  const harness = await createProductionTestHarness({
    catalog: TEST_CATALOG,
    askConsultant: async () => simulatedAnswer,
  });

  try {
    // 1. REPRODUCED DEFECT 1: Correct product, wrong portion (Ajwa 1kg with 1250)
    // Ajwa has 250g at 1250 and 1kg at 5000. Wording claiming "Ajwa Dates are Rs. 1250 per kg." must be neutralized.
    simulatedAnswer = {
      action: 'answer',
      reply: 'Ajwa Dates are Rs. 1250 per kg.',
    };
    const res1 = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Ajwa 1kg price?' }),
    });
    const data1 = await res1.json();
    assert.equal(res1.status, 200);
    assert.ok(!data1.reply.includes('Rs. 1250 per kg'), 'Must not allow 250g price Rs. 1250 to be attributed to 1kg');
    assert.ok(data1.reply.includes('Welcome to AllBarka! Here is the verified commercial information'), 'Application-owned opening used');
    assert.ok(data1.reply.includes('https://wa.me/923160666083'), 'WhatsApp concierge link included');

    // And structured intent selection resolves 1kg directly to Rs. 5,000 from authoritative catalog:
    simulatedAnswer = {
      action: 'answer',
      conversationalOpening: 'Our Ajwa dates from Al-Madinah are soft, authentic, and naturally cured.',
      selectedProducts: [{ productId: 'ajwa-dates-al-madinah', variantLabel: '1kg' }],
    };
    const res1b = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I need 1kg Ajwa dates' }),
    });
    const data1b = await res1b.json();
    assert.ok(data1b.reply.includes('Ajwa Dates (Al-Madinah) — 1kg: Rs. 5,000'), 'Application renders exact 1kg catalog price');

    // 2. REPRODUCED DEFECT 2: Two products with different prices (Ajwa and Almonds Rs. 1000 each)
    // Almonds is Rs. 1000/kg; Ajwa is Rs. 5,000/kg. Claiming both are 1000/kg each must be neutralized.
    simulatedAnswer = {
      action: 'answer',
      reply: 'Ajwa Dates and Almonds are Rs. 1000 per kg each.',
    };
    const res2 = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What are the prices of Ajwa and Almonds?' }),
    });
    const data2 = await res2.json();
    assert.ok(!data2.reply.includes('Rs. 1000 per kg each'), 'Must not accept Almonds price for Ajwa Dates');
    assert.ok(data2.reply.includes('Welcome to AllBarka! Here is the verified commercial information'), 'Application-owned opening used');

    // And structured intent renders distinct verified prices for each product:
    simulatedAnswer = {
      action: 'answer',
      selectedProducts: [
        { productId: 'ajwa-dates-al-madinah', variantLabel: '1kg' },
        { productId: 'almonds-american-jumbo', variantLabel: '1kg' },
      ],
    };
    const res2b = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Show Ajwa and Almonds' }),
    });
    const data2b = await res2b.json();
    assert.ok(data2b.reply.includes('Ajwa Dates (Al-Madinah) — 1kg: Rs. 5,000'), 'Ajwa has its own verified price');
    assert.ok(data2b.reply.includes('Almonds (American Jumbo) — 1kg: Rs. 1,000'), 'Almonds has its own verified price');

    // 3. REPRODUCED DEFECT 3: Disabled or unpublished variants (Luxury Tin Discontinued Lid)
    // Discontinued Lid has available: false (price 900). Claiming it is Rs. 900 must be neutralized.
    simulatedAnswer = {
      action: 'answer',
      reply: 'Luxury Tin Discontinued Lid is Rs. 900.',
    };
    const res3 = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Can I get the discontinued lid?' }),
    });
    const data3 = await res3.json();
    assert.ok(!data3.reply.includes('Rs. 900'), 'Disabled variant price must not be accepted');

    // Structured reference to disabled variant flags unavailability and renders available options:
    simulatedAnswer = {
      action: 'answer',
      selectedProducts: [{ productId: 'bid-box-luxury-tin', variantLabel: 'Discontinued Lid' }],
    };
    const res3b = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Order discontinued lid' }),
    });
    const data3b = await res3b.json();
    assert.ok(data3b.reply.includes("'Discontinued Lid' is currently unavailable"), 'Flags disabled variant');
    assert.ok(data3b.reply.includes('Empty Box (1 pc): Rs. 350'), 'Lists available alternatives');
    assert.ok(data3b.reply.includes('Empty Pack (25 pcs): Rs. 7,500'), 'Lists available alternatives');

    // 4. REPRODUCED DEFECT 4: Customer proposed budget (1234) vs store price
    simulatedAnswer = {
      action: 'answer',
      reply: 'Our approved price is Rs. 1234.',
      inquiryPrefill: {
        productId: 'bid-box-luxury-tin',
        targetPricePkr: 1234,
        budgetType: 'per_piece',
      },
    };
    const res4 = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Can we do 1234 rupees?' }),
    });
    const data4 = await res4.json();
    assert.ok(!data4.reply.includes('Our approved price is Rs. 1234'), 'Must not claim customer budget is approved price');
    assert.ok(data4.reply.includes('customer proposed budget; final pricing requires team confirmation') ||
              data4.reply.includes('customer proposed target, final pricing requires team quote'));
    assert.ok(data4.reply.includes('Proposed Customer Budget: Rs. 1,234'));

    // 5. REPRODUCED DEFECT 5: Roman Urdu delivery commitment ("kal pakka deliver")
    simulatedAnswer = {
      action: 'answer',
      reply: 'Hum aap ke custom boxes kal pakka deliver kar dein ge.',
    };
    const res5 = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Bhai delivery kab tak ho gi?' }),
    });
    const data5 = await res5.json();
    assert.ok(!data5.reply.includes('kal pakka deliver'), 'Must not permit Roman Urdu delivery promise');
    assert.ok(data5.reply.includes('AllBarka mein khush-amdeed! Hamaray catalog aur store policies'), 'Roman Urdu opening rendered');

    // 6. Legitimate product selections, suggestions, and inquiry handoff
    simulatedAnswer = {
      action: 'answer',
      conversationalOpening: 'Warm celebration greetings from AllBarka! For your upcoming Nikkah, here is our luxury packaging recommendation.',
      selectedProducts: [{ productId: 'bid-box-luxury-tin', variantLabel: 'Empty Pack (25 pcs)' }],
      suggestedCustomizations: ['monogram', 'custom_ribbon'],
      applicablePolicies: ['lead_time', 'shipping_rates'],
      inquiryPrefill: {
        productId: 'bid-box-luxury-tin',
        packagingVariant: 'Empty Pack (25 pcs)',
        boxMode: 'empty',
        quantity: 2,
        eventType: 'Nikkah',
        targetPricePkr: 15000,
      },
    };
    const res6 = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I need 2 packs of Luxury Tin boxes for Nikkah with monograms' }),
    });
    const data6 = await res6.json();
    assert.equal(res6.status, 200);
    assert.ok(data6.reply.includes('Luxury Tin Bid Box — Empty Pack (25 pcs): Rs. 7,500 per pack of 25 pcs (Rs. 300/pc) [Minimum order: 1 pack (25 pieces total)]'));
    assert.ok(data6.reply.includes('Packaging Subtotal: Rs. 15,000 (2 packs = 50 pieces)'));
    assert.ok(data6.reply.includes('Personalization: Custom gold foil-stamped monogram'));
    assert.ok(data6.reply.includes('Accent: Matching satin or grosgrain ribbon band'));
    assert.ok(data6.reply.includes('Preparation & Lead Time:'));
    assert.ok(data6.reply.includes('https://wa.me/923160666083'));
    assert.ok(!data6.reply.includes(FOOTNOTE_DISCLAIMER), 'Technical footnote must be absent from ordinary customer replies');
    assert.equal(data6.recommendations.length, 1);
    assert.equal(data6.recommendations[0].productId, 'bid-box-luxury-tin');
    assert.equal(data6.inquiryPrefill.productId, 'bid-box-luxury-tin');
    assert.equal(data6.inquiryPrefill.packagingSubtotal, 15000);
  } finally {
    harness.close();
  }
});

test('Stage 7.5 (i): Food vs packaging units, unhardcoded customization suggestions, full translated lead-time policies, opening-bypass closure, and footnote removal', async () => {
  let simulatedAnswer: any = {
    action: 'answer',
    reply: 'Default reply',
  };

  const harness = await createProductionTestHarness({
    catalog: TEST_CATALOG,
    askConsultant: async () => simulatedAnswer,
  });

  try {
    // 1. Food weights vs packaging units (never / pc for food, / pc for single packaging, per pack for packs, per set for sets)
    simulatedAnswer = {
      action: 'answer',
      selectedProducts: [
        { productId: 'ajwa-dates-al-madinah', variantLabel: '1kg' },
        { productId: 'almonds-american-jumbo', variantLabel: '500g' },
        { productId: 'bid-box-luxury-tin', variantLabel: 'Empty Box (1 pc)' },
        { productId: 'bid-box-luxury-tin', variantLabel: 'Empty Pack (25 pcs)' },
        { productId: 'bid-box-tabarruk-set', variantLabel: 'Empty Box Set (1 set)' },
      ],
    };
    const res1 = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Compare dates and boxes' }),
    });
    const data1 = await res1.json();
    assert.equal(res1.status, 200);

    // Food portions must use food portion as price basis and NEVER output / pc
    assert.ok(data1.reply.includes('Ajwa Dates (Al-Madinah) — 1kg: Rs. 5,000'), 'Ajwa 1kg renders pure portion basis');
    assert.ok(!data1.reply.includes('Ajwa Dates (Al-Madinah) — 1kg: Rs. 5,000 / pc'), 'Food must never have / pc');
    assert.ok(data1.reply.includes('Almonds (American Jumbo) — 500g: Rs. 500'), 'Almonds 500g renders pure portion basis');
    assert.ok(!data1.reply.includes('Almonds (American Jumbo) — 500g: Rs. 500 / pc'), 'Almonds must never have / pc');

    // Single packaging variant uses / pc
    assert.ok(data1.reply.includes('Luxury Tin Bid Box — Empty Box (1 pc): Rs. 350 / pc [Minimum order: 15 pieces total]'), 'Single packaging variant has / pc');

    // Pack packaging variant uses per pack of N pcs (Rs. X/pc)
    assert.ok(data1.reply.includes('Luxury Tin Bid Box — Empty Pack (25 pcs): Rs. 7,500 per pack of 25 pcs (Rs. 300/pc) [Minimum order: 1 pack (25 pieces total)]'), 'Pack variant has pack breakdown');

    // Set packaging variant uses per set
    assert.ok(data1.reply.includes('Umrah & Hajj Tabarruk Box Set — Empty Box Set (1 set): Rs. 1,200 per set [Minimum order: 5 sets total]'), 'Tabarruk set has per set');

    // 2. Absent-catalog customization suggestions (empty catalog has no hardcoded origin/roast/variety claims)
    harness.setDynamicCatalog([]);
    simulatedAnswer = {
      action: 'answer',
      suggestedCustomizations: ['dates_filling', 'dry_fruits_filling'],
    };
    const res2 = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Suggest fillings' }),
    });
    const data2 = await res2.json();
    assert.equal(res2.status, 200);
    // Must NOT contain hardcoded origins, varieties, or flavor promises
    assert.ok(!data2.reply.includes('Saudi'), 'Must not claim Saudi origin with empty catalog');
    assert.ok(!data2.reply.includes('Mabroom'), 'Must not claim Mabroom with empty catalog');
    assert.ok(!data2.reply.includes('Safawi'), 'Must not claim Safawi with empty catalog');
    assert.ok(!data2.reply.includes('saffron pistachios'), 'Must not claim saffron pistachios with empty catalog');
    assert.ok(!data2.reply.includes('jumbo cashews'), 'Must not claim jumbo cashews with empty catalog');
    // Must contain generic optional suggestions
    assert.ok(data2.reply.includes('Dates filling (optional addition; specific variety and pricing confirmed by team upon custom quote)'), 'Generic dates suggestion');
    assert.ok(data2.reply.includes('Dry fruits and nuts filling (optional addition; specific selection and pricing confirmed by team upon custom quote)'), 'Generic dry fruits suggestion');

    // Reset catalog for remaining tests
    harness.setDynamicCatalog(TEST_CATALOG);

    // 3. Full translated preparation policies preserve all required conditions in English, Roman Urdu, Urdu, Arabic
    const langCases = [
      {
        lang: 'en',
        userMsg: 'How long to prepare custom boxes?',
        expectedLeadTime: 'Preparation & Lead Time: Minimum 10 calendar days after final design approval and receipt of the required advance payment; courier transit time is separate.',
        expectedAdvance: 'advance payment',
        expectedTransit: 'courier transit time is separate',
      },
      {
        lang: 'ur',
        userMsg: 'Custom boxes tayyar hone mein kitna waqt lage ga?', // Roman Urdu detection
        expectedLeadTime: 'Tayyari aur Dispatch Time: Final design approval aur matlooba advance adaigi ke baad kam az kam 10 calendar days darkar hain; courier transit ka waqt alag hai.',
        expectedAdvance: 'advance adaigi',
        expectedTransit: 'courier transit ka waqt alag hai',
      },
      {
        lang: 'ur',
        userMsg: 'باکسز کی تیاری میں کتنا وقت درکار ہے؟', // Urdu script
        expectedLeadTime: 'تیاری اور ڈلیوری: حتمی ڈیزائن منظوری اور مطلوبہ ایڈوانس ادائیگی کی وصولی کے بعد کم از کم 10 یوم درکار ہیں؛ کوریئر ٹرانزٹ کا وقت الگ ہے۔',
        expectedAdvance: 'ایڈوانس ادائیگی',
        expectedTransit: 'کوریئر ٹرانزٹ کا وقت الگ ہے',
      },
      {
        lang: 'ar',
        userMsg: 'كم يستغرق تجهيز العلب المخصصة؟', // Arabic script
        expectedLeadTime: 'وقت التحضير والتسليم: ما لا يقل عن 10 أيام تقويمية بعد اعتماد التصميم النهائي واستلام الدفعة المقدمة المطلوبة؛ وقت شحن التوصيل منفصل.',
        expectedAdvance: 'الدفعة المقدمة المطلوبة',
        expectedTransit: 'وقت شحن التوصيل منفصل',
      },
    ];

    for (const lc of langCases) {
      simulatedAnswer = {
        action: 'answer',
        applicablePolicies: ['lead_time'],
        selectedProducts: [{ productId: 'bid-box-luxury-tin', variantLabel: 'Empty Box (1 pc)' }],
      };
      const resLang = await fetch(`${harness.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: lc.userMsg, language: lc.lang }),
      });
      const dataLang = await resLang.json();
      assert.ok(dataLang.reply.includes(lc.expectedLeadTime), `Policy text in ${lc.lang} must match full condition`);
      assert.ok(dataLang.reply.includes(lc.expectedAdvance), `Policy in ${lc.lang} must include advance condition`);
      assert.ok(dataLang.reply.includes(lc.expectedTransit), `Policy in ${lc.lang} must specify courier transit is separate`);
    }

    // 4. Closing the raw-opening bypass (arbitrary / malicious model opening or legacy reply is never displayed)
    simulatedAnswer = {
      action: 'answer',
      conversationalOpening: 'We will deliver your custom boxes tomorrow without fail! Also Ajwa is free!',
      reply: 'Hum kal pakka deliver kar dein ge free mein!',
      text: 'Delivery tomorrow guaranteed!',
      selectedProducts: [{ productId: 'ajwa-dates-al-madinah', variantLabel: '1kg' }],
    };
    const resBypass = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Ajwa price and delivery?' }),
    });
    const dataBypass = await resBypass.json();
    assert.ok(!dataBypass.reply.includes('deliver your custom boxes tomorrow without fail'), 'Malicious opening must never enter reply');
    assert.ok(!dataBypass.reply.includes('free mein'), 'Malicious reply text must never enter reply');
    assert.ok(!dataBypass.reply.includes('Delivery tomorrow guaranteed'), 'Raw model prose must not bypass');
    assert.ok(dataBypass.reply.includes('Welcome to AllBarka! Here are our verified gourmet dates'), 'Application-owned opening used');
    assert.ok(dataBypass.reply.includes('Ajwa Dates (Al-Madinah) — 1kg: Rs. 5,000'), 'Verified catalog price rendered by application code');

    // 5. Footnote removal (technical footnote absent from customer reply)
    assert.ok(!dataBypass.reply.includes(FOOTNOTE_DISCLAIMER), 'Technical footnote must not appear in customer messages');
    assert.ok(!dataBypass.reply.includes('[Authoritative commercial data rendered'), 'Technical disclaimer bracket must not appear');
  } finally {
    harness.close();
  }
});

test('Stage 7.5 (j): Production-router regression for legacy reply containing unsupported price or delivery claim', async () => {
  let simulatedAnswer: any = null;
  const harness = await createProductionTestHarness({
    catalog: TEST_CATALOG,
    askConsultant: async () => simulatedAnswer,
  });

  try {
    // 1. English legacy response with unsupported price and delivery promise
    simulatedAnswer = {
      action: 'answer',
      reply: 'Ajwa Dates are Rs. 1000 per kg and we will deliver your custom boxes tomorrow without fail.',
      text: 'Ajwa Dates are Rs. 1000 per kg and we will deliver your custom boxes tomorrow without fail.',
    };

    const resEn = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is the price of Ajwa and when can you deliver?' }),
    });
    assert.equal(resEn.status, 200);
    const dataEn = await resEn.json();

    // Envelope parsing remains compatible: res.status 200, action is 'answer'
    assert.equal(dataEn.action, 'answer');
    assert.equal(dataEn.reply, dataEn.text);

    // Unsupported price and delivery promise are completely excluded from customer reply
    assert.ok(!dataEn.reply.includes('Rs. 1000'), 'Unsupported price must never enter customer-facing reply');
    assert.ok(!dataEn.reply.includes('tomorrow without fail'), 'Unsupported delivery promise must never enter customer-facing reply');
    assert.ok(!dataEn.reply.includes('Ajwa Dates are Rs. 1000'), 'Raw model prose must not bypass as verified commercial content');

    // Localized application-owned greeting_general, safe follow-up guidance, and WhatsApp concierge link
    assert.ok(dataEn.reply.includes('Welcome to AllBarka! Here is the verified commercial information from our catalog and store policies:'), 'Application-owned greeting_general opening rendered');
    assert.ok(dataEn.reply.includes('For verified catalog options, packaging inquiries, or custom event orders'), 'Application-owned safe follow-up guidance rendered');
    assert.ok(dataEn.reply.includes('https://wa.me/923160666083'), 'Official WhatsApp link rendered');

    // 2. Roman Urdu legacy response with unsupported price and delivery promise
    simulatedAnswer = {
      action: 'answer',
      reply: 'Ajwa 500 rupay kilo hai aur hum kal pakka deliver kar dein ge.',
    };

    const resUr = await fetch(`${harness.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Ajwa ki price kya hai aur delivery kab tak hogi?' }),
    });
    assert.equal(resUr.status, 200);
    const dataUr = await resUr.json();

    assert.ok(!dataUr.reply.includes('500 rupay'), 'Unsupported Roman Urdu price must not enter customer reply');
    assert.ok(!dataUr.reply.includes('kal pakka deliver'), 'Unsupported Roman Urdu delivery claim must not enter customer reply');
    assert.ok(dataUr.reply.includes('AllBarka mein khush-amdeed! Hamaray catalog aur store policies ki verified commercial maloomat yeh hain:'), 'Roman Urdu greeting_general opening rendered');
    assert.ok(dataUr.reply.includes('Verified catalog options, packaging inquiries'), 'Roman Urdu safe follow-up guidance rendered');
    assert.ok(dataUr.reply.includes('https://wa.me/923160666083'), 'WhatsApp concierge link rendered');
  } finally {
    harness.close();
  }
});

