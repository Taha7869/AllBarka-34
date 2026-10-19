import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import type { Product } from '../src/types';
import {
  getCustomerVisibleCatalog,
  buildBuddyCatalogContext,
  buildBuddySystemInstruction,
  validateAiRecommendations,
  validateInquiryPrefill,
  sanitizeBuddyPrompt,
} from '../src/lib/aiBuddyResolution';
import { extractN8nReply } from '../src/services/n8nAIConsultant';
import {
  MANDATORY_LEAD_TIME_NOTICE,
  TABARRUK_EMPTY_DEFAULT_NOTICE,
  NON_CATALOG_FILLINGS_DISCLAIMER,
  buildCustomerInquiryWhatsAppUrl,
} from '../src/lib/inquiryWhatsApp';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const TEST_CATALOG: Product[] = [
  {
    id: 'roasted-iranian-pista',
    name_en: 'Roasted Iranian Pistachios (Pista)',
    name_ur: '',
    name_ar: '',
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
    name_ur: '',
    name_ar: '',
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
      { label: 'Discontinued Vintage Lid', price: 900, available: false },
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
    name_ur: '',
    name_ar: '',
    category: 'celebration-boxes',
    packagingSubcategory: 'tabarruk',
    isBidBox: true,
    image: '/images/products/tabarruk.jpg',
    imageName: 'tabarruk.jpg',
    prices: { 'Empty Set (1 pc)': 220, 'Empty Pack (25 pcs)': 5000 },
    variants: [
      { label: 'Empty Set (1 pc)', price: 220, available: true },
      { label: 'Empty Pack (25 pcs)', price: 5000, available: true },
    ],
    wholesale: 180,
    desc_en: 'Sacred Umrah keepsake set with glass bottle.',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    status: 'published',
  },
  {
    id: 'draft-unreleased-coffer',
    name_en: 'Draft Velvet Coffer',
    name_ur: '',
    name_ar: '',
    category: 'celebration-boxes',
    image: null,
    imageName: null,
    prices: { '1 pc': 1500 },
    wholesale: 1000,
    desc_en: 'Internal prototype coffer.',
    desc_ur: '',
    desc_ar: '',
    active: true,
    status: 'draft', // Draft status!
    internalNotes: 'Supplier invoice pending clearance',
    referencePrice: 850,
  },
  {
    id: 'archived-old-box',
    name_en: 'Archived Wooden Box',
    name_ur: '',
    name_ar: '',
    category: 'celebration-boxes',
    image: null,
    imageName: null,
    prices: { '1 pc': 500 },
    wholesale: 350,
    desc_en: 'Discontinued box.',
    desc_ur: '',
    desc_ar: '',
    active: false, // Inactive!
    status: 'archived',
  },
];

// ============================================================================
// 1. CATALOG FILTERING & AUTHORITATIVE DATA GROUNDING
// ============================================================================

test('aiBuddy: getCustomerVisibleCatalog strictly excludes draft, archived, and inactive products', () => {
  const visible = getCustomerVisibleCatalog(TEST_CATALOG);
  const visibleIds = visible.map(p => p.id);

  assert.ok(visibleIds.includes('roasted-iranian-pista'));
  assert.ok(visibleIds.includes('bid-box-luxury-tin'));
  assert.ok(visibleIds.includes('bid-box-tabarruk-set'));
  assert.equal(visibleIds.includes('draft-unreleased-coffer'), false, 'Draft products must be excluded');
  assert.equal(visibleIds.includes('archived-old-box'), false, 'Inactive/archived products must be excluded');
});

test('aiBuddy: buildBuddyCatalogContext attaches packaging MOQ but exempts ordinary food items', () => {
  const { contextText, visibleCount, isUnpricedFallback } = buildBuddyCatalogContext(TEST_CATALOG);

  assert.equal(visibleCount, 3);
  assert.equal(isUnpricedFallback, false);

  // Packaging products have derived MOQ (5000 / 350 = 15 pcs)
  assert.match(contextText, /Luxury Tin Bid Box \(ID: bid-box-luxury-tin\) \(MOQ: \d+ pcs\)/);

  // Food products are strictly exempt from packaging MOQ
  assert.match(contextText, /Roasted Iranian Pistachios \(Pista\) \(ID: roasted-iranian-pista\) \(Standard retail: no MOQ\)/);

  // Internal supplier notes and reference prices are never exposed
  assert.doesNotMatch(contextText, /Supplier invoice pending clearance/);
  assert.doesNotMatch(contextText, /referencePrice/);
});

test('aiBuddy: buildBuddyCatalogContext returns unpriced fallback on empty or failed catalog', () => {
  const { contextText, visibleCount, isUnpricedFallback } = buildBuddyCatalogContext([]);
  assert.equal(visibleCount, 0);
  assert.equal(isUnpricedFallback, true);
  assert.match(contextText, /Authoritative database currently unreachable/);
  assert.match(contextText, /WhatsApp/);
});

// ============================================================================
// 2. APPROVED ASSISTANT BEHAVIOR & POLICIES
// ============================================================================

test('aiBuddy: buildBuddySystemInstruction includes exact approved wording and policies', () => {
  const promptEn = buildBuddySystemInstruction({ catalog: TEST_CATALOG, language: 'en' });

  // 1. Exact mandatory lead time notice
  assert.match(promptEn, new RegExp(MANDATORY_LEAD_TIME_NOTICE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  // 2. Exact Tabarruk empty bottle policy
  assert.match(promptEn, new RegExp(TABARRUK_EMPTY_DEFAULT_NOTICE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  // 3. Exact non-catalog fillings disclaimer
  assert.match(promptEn, new RegExp(NON_CATALOG_FILLINGS_DISCLAIMER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  // 4. Distinction of goods (published catalog vs customization vs non-catalog fillings)
  assert.match(promptEn, /A\. Published Catalog Products/);
  assert.match(promptEn, /B\. Customization Ideas/);
  assert.match(promptEn, /C\. Non-Catalog Fillings/);

  // 5. Food branding & packaging outer presentation
  assert.match(promptEn, /outer presentation/);
  assert.match(promptEn, /obscuring mandatory food labeling/);

  // 6. Prohibitions on false certifications and medical claims
  assert.match(promptEn, /halal certifications/);
  assert.match(promptEn, /medical cures/);

  // 7. Multilingual support instructions
  const promptUr = buildBuddySystemInstruction({ catalog: TEST_CATALOG, language: 'ur' });
  assert.match(promptUr, /Roman Urdu/);
});

// ============================================================================
// 3. RECOMMENDATION VALIDATION & DYNAMIC UPDATES
// ============================================================================

test('aiBuddy: validateAiRecommendations accepts valid published items and rejects drafts/fake IDs', () => {
  const rawRecommendations = [
    'bid-box-luxury-tin',
    'roasted-iranian-pista',
    'draft-unreleased-coffer', // draft
    'completely-hallucinated-id-999', // nonexistent
    'archived-old-box', // inactive
  ];

  const validated = validateAiRecommendations(TEST_CATALOG, rawRecommendations);
  assert.equal(validated.length, 2, 'Only the 2 published, active products must be accepted');

  const tin = validated.find(r => r.productId === 'bid-box-luxury-tin')!;
  assert.equal(tin.productName, 'Luxury Tin Bid Box');
  assert.equal(tin.url, '/celebration-boxes?product=bid-box-luxury-tin');
  assert.equal(tin.isPackaging, true);
  assert.ok(tin.moq !== null && tin.moq > 0);
  assert.equal(tin.displayPrice, 'Rs. 350');

  const pista = validated.find(r => r.productId === 'roasted-iranian-pista')!;
  assert.equal(pista.productName, 'Roasted Iranian Pistachios (Pista)');
  assert.equal(pista.url, '/product/roasted-iranian-pista');
  assert.equal(pista.isPackaging, false);
  assert.equal(pista.moq, null, 'Food item has no packaging MOQ');
});

test('aiBuddy: validateAiRecommendations immediately reflects dynamic admin price updates and newly added products', () => {
  const dynamicCatalog: Product[] = JSON.parse(JSON.stringify(TEST_CATALOG));

  // 1. Admin edits price of bid-box-luxury-tin to 550
  const tin = dynamicCatalog.find(p => p.id === 'bid-box-luxury-tin')!;
  tin.prices = { 'Empty Box (1 pc)': 550 };
  tin.variants = [{ label: 'Empty Box (1 pc)', price: 550, available: true }];

  const res1 = validateAiRecommendations(dynamicCatalog, ['bid-box-luxury-tin']);
  assert.equal(res1[0].displayPrice, 'Rs. 550', 'Must reflect updated price immediately');

  // 2. Admin adds a newly created product dynamically
  const newProduct: Product = {
    id: 'new-royal-pouch',
    name_en: 'Royal Jamawar Pouch',
    name_ur: '',
    name_ar: '',
    category: 'celebration-boxes',
    image: '/images/pouch.jpg',
    imageName: 'pouch.jpg',
    prices: { '1 pc': 180 },
    variants: [{ label: '1 pc', price: 180, available: true }],
    wholesale: 140,
    desc_en: '',
    desc_ur: '',
    desc_ar: '',
    active: true,
    inStock: true,
    status: 'published',
  };
  dynamicCatalog.push(newProduct);

  const res2 = validateAiRecommendations(dynamicCatalog, ['new-royal-pouch']);
  assert.equal(res2.length, 1);
  assert.equal(res2[0].productName, 'Royal Jamawar Pouch');
  assert.equal(res2[0].displayPrice, 'Rs. 180');
});

// ============================================================================
// 4. INQUIRY PREFILL & DETERMINISTIC PRICING
// ============================================================================

test('aiBuddy: validateInquiryPrefill prevents silent substitution and calculates deterministic packaging subtotal', () => {
  // 1. Valid empty packaging request with known catalog price
  const prefillValid = validateInquiryPrefill(TEST_CATALOG, {
    productId: 'bid-box-luxury-tin',
    packagingVariant: 'Empty Box (1 pc)',
    boxMode: 'empty',
    quantity: 50,
    eventType: 'Nikkah',
    targetEventDate: '2026-12-15',
    budgetType: 'total',
    targetPricePkr: 20000,
    city: 'Lahore',
  });

  assert.ok(prefillValid);
  assert.equal(prefillValid.productName, 'Luxury Tin Bid Box');
  assert.equal(prefillValid.boxMode, 'empty');
  assert.equal(prefillValid.quantity, 50);
  assert.equal(prefillValid.standardPrice, 350);
  assert.equal(prefillValid.packagingSubtotal, 17500, '50 pcs * Rs. 350 = Rs. 17,500');
  assert.match(prefillValid.packagingSubtotalNotice!, /Packaging subtotal only/);
  assert.equal(prefillValid.isUrgentEvent, false);
  assert.equal(prefillValid.modalInit.quantity, 50);
  assert.equal(prefillValid.modalInit.eventType, 'Nikkah');

  // 2. Missing or disabled variant: NO silent substitution!
  const prefillDisabled = validateInquiryPrefill(TEST_CATALOG, {
    productId: 'bid-box-luxury-tin',
    packagingVariant: 'Discontinued Vintage Lid', // available: false
    boxMode: 'empty',
    quantity: 50,
  });

  assert.ok(prefillDisabled);
  assert.equal(prefillDisabled.standardPrice, null, 'Must NOT substitute disabled variant');
  assert.equal(prefillDisabled.packagingSubtotal, null);
  assert.equal(prefillDisabled.requiresTeamQuote, true);

  // 3. Nonexistent variant label: NO silent fallback to Empty Box (1 pc)
  const prefillNonexistent = validateInquiryPrefill(TEST_CATALOG, {
    productId: 'bid-box-luxury-tin',
    packagingVariant: 'Invented Gold Monogram Box',
    boxMode: 'empty',
    quantity: 50,
  });

  assert.ok(prefillNonexistent);
  assert.equal(prefillNonexistent.standardPrice, null);
  assert.equal(prefillNonexistent.packagingVariant, 'Invented Gold Monogram Box');
  assert.equal(prefillNonexistent.requiresTeamQuote, true);
});

test('aiBuddy: validateInquiryPrefill flags custom unpriced additions and urgent lead time', () => {
  // Urgent event: event date is tomorrow (less than 10 days)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const prefillUrgent = validateInquiryPrefill(TEST_CATALOG, {
    productId: 'bid-box-luxury-tin',
    packagingVariant: 'Empty Box (1 pc)',
    boxMode: 'custom',
    quantity: 100,
    eventType: 'Walima',
    targetEventDate: tomorrow,
    preferredFillings: ['chocolates', 'candies'],
    customFillingsNotes: 'Artisan truffles',
    monogramText: 'A & B',
  });

  assert.ok(prefillUrgent);
  assert.equal(prefillUrgent.isUrgentEvent, true, 'Event date within 10 days must be flagged urgent');
  assert.equal(prefillUrgent.hasUnpricedAdditions, true, 'Chocolates and custom fillings require team quote');
  assert.equal(prefillUrgent.requiresTeamQuote, true);
  assert.equal(prefillUrgent.standardPrice, null, 'Custom mode requires team quote without model-generated guessing');
});

// ============================================================================
// 5. PROMPT INJECTION & UNTRUSTED USER INPUT
// ============================================================================

test('aiBuddy: sanitizeBuddyPrompt strips control characters and bounds length', () => {
  const dirty = 'Hello AllBarka!\u0000\u0007\u001B[31mPlease recommend a gift.\u0000';
  const clean = sanitizeBuddyPrompt(dirty);
  assert.equal(clean, 'Hello AllBarka![31mPlease recommend a gift.');

  const oversized = 'A'.repeat(2000);
  assert.equal(sanitizeBuddyPrompt(oversized).length, 1000);
});

test('aiBuddy: extractN8nReply captures structured recommendations and inquiry prefill cleanly', () => {
  // 1. Direct JSON envelope
  const payload = {
    reply: 'I recommend our Luxury Tin Bid Box for your Nikkah.',
    action: 'answer',
    recommendedProductIds: ['bid-box-luxury-tin'],
    inquiryPrefill: {
      productId: 'bid-box-luxury-tin',
      packagingVariant: 'Empty Box (1 pc)',
      boxMode: 'empty',
      quantity: 50,
      eventType: 'Nikkah',
    },
  };

  const parsed = extractN8nReply(payload);
  assert.ok(parsed);
  assert.equal(parsed.reply, 'I recommend our Luxury Tin Bid Box for your Nikkah.');
  assert.deepEqual(parsed.recommendedProductIds, ['bid-box-luxury-tin']);
  assert.equal(parsed.inquiryPrefill?.quantity, 50);

  // 2. Markdown-wrapped JSON string
  const markdownWrapped = {
    output: '```json\n{"reply":"Curated gifts for you","action":"answer","recommendedProductIds":["roasted-iranian-pista"]}\n```',
  };

  const parsedMarkdown = extractN8nReply(markdownWrapped);
  assert.ok(parsedMarkdown);
  assert.equal(parsedMarkdown.reply, 'Curated gifts for you');
  assert.deepEqual(parsedMarkdown.recommendedProductIds, ['roasted-iranian-pista']);
});

// ============================================================================
// 6. STAGE 6 INQUIRY INTEGRATION & UNSAVED WHATSAPP FALLBACK
// ============================================================================

test('aiBuddy: inquiry prefill cleanly converts to Stage 6 saved record vs unsaved WhatsApp draft', () => {
  const prefill = validateInquiryPrefill(TEST_CATALOG, {
    productId: 'bid-box-luxury-tin',
    packagingVariant: 'Empty Box (1 pc)',
    boxMode: 'empty',
    quantity: 50,
    eventType: 'Nikkah',
  })!;

  // 1. Saved inquiry WhatsApp URL (with durable quoteId)
  const savedUrl = buildCustomerInquiryWhatsAppUrl({
    quoteId: 'ABQ-888999',
    isUnsavedDraft: false,
    productName: prefill.productName,
    productId: prefill.productId,
    packagingVariant: prefill.packagingVariant,
    mode: prefill.boxMode,
    quantity: prefill.quantity,
    eventType: prefill.eventType,
    customerName: 'Fatima',
    customerPhone: '03160666083',
    city: 'Lahore',
  });
  const decodedSaved = decodeURIComponent(savedUrl);
  assert.match(decodedSaved, /Ref #ABQ-888999/);
  assert.doesNotMatch(decodedSaved, /\[UNSAVED DRAFT\]/);

  // 2. Unsaved draft WhatsApp fallback (clear unsaved banner, no fake quoteId)
  const unsavedUrl = buildCustomerInquiryWhatsAppUrl({
    quoteId: null,
    isUnsavedDraft: true,
    productName: prefill.productName,
    productId: prefill.productId,
    packagingVariant: prefill.packagingVariant,
    mode: prefill.boxMode,
    quantity: prefill.quantity,
    eventType: prefill.eventType,
    customerName: 'Fatima',
    customerPhone: '03160666083',
    city: 'Lahore',
  });
  const decodedUnsaved = decodeURIComponent(unsavedUrl);
  assert.match(decodedUnsaved, /\[UNSAVED DRAFT\]/);
  assert.doesNotMatch(decodedUnsaved, /Ref #/);
});

// ============================================================================
// 7. REAL SERVER ROUTE INTEGRATION & TIMEOUT / ERROR RECOVERY
// ============================================================================

function createAiTestServer(options: {
  db: any;
  catalog: Product[] | (() => Product[] | Promise<Product[]>);
  n8nHandler: (body: any) => Promise<any>;
}) {
  const app = express();
  app.use(express.json());

  app.post(['/api/chat', '/api/concierge/chat'], async (req, res) => {
    const userText = req.body?.userText ?? req.body?.message;
    const language = ['ur', 'ar'].includes(req.body?.language) ? req.body.language : 'en';
    const messages = req.body?.messages ?? req.body?.history;

    if (typeof userText !== 'string' || !userText.trim() || userText.length > 1000) {
      return res.status(400).json({ error: 'INVALID_MESSAGE', code: 'INVALID_MESSAGE', available: false });
    }

    let mergedProducts: Product[] = [];
    let isCatalogFailure = false;
    try {
      if (!options.db) throw new Error('DATABASE_OFFLINE');
      const cat = typeof options.catalog === 'function' ? await options.catalog() : options.catalog;
      mergedProducts = cat;
    } catch {
      isCatalogFailure = true;
      mergedProducts = [];
    }

    const systemInstruction = buildBuddySystemInstruction({
      catalog: mergedProducts,
      language,
      isCatalogFailure,
    });

    const sanitizedMessage = sanitizeBuddyPrompt(userText);
    try {
      const n8nRes = await options.n8nHandler({
        message: sanitizedMessage,
        history: messages,
        system: systemInstruction,
      });

      if (!n8nRes) {
        return res.status(503).json({ error: 'AI_UNAVAILABLE', code: 'AI_UNAVAILABLE', available: false });
      }

      const answer = extractN8nReply(n8nRes);
      if (!answer) {
        return res.status(503).json({ error: 'AI_UNAVAILABLE', code: 'AI_UNAVAILABLE', available: false });
      }

      const recommendations = validateAiRecommendations(mergedProducts, answer.recommendedProductIds);
      const inquiryPrefill = validateInquiryPrefill(mergedProducts, answer.inquiryPrefill);

      return res.json({
        ...answer,
        recommendations,
        inquiryPrefill,
        systemInstructionReceived: systemInstruction,
      });
    } catch (err: any) {
      const code = err.message === 'AI_TIMEOUT' ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE';
      return res.status(503).json({ error: code, code, available: false });
    }
  });

  return app;
}

test('endpoint: successful AI buddy consultation returns validated recommendations and prefill', async () => {
  const app = createAiTestServer({
    db: { connected: true },
    catalog: TEST_CATALOG,
    n8nHandler: async () => ({
      reply: 'For your wedding, I recommend our Luxury Tin Bid Box.',
      action: 'answer',
      recommendedProductIds: ['bid-box-luxury-tin', 'draft-unreleased-coffer'],
      inquiryPrefill: {
        productId: 'bid-box-luxury-tin',
        packagingVariant: 'Empty Box (1 pc)',
        boxMode: 'empty',
        quantity: 50,
        eventType: 'Wedding',
      },
    }),
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/concierge/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userText: 'What do you recommend for a wedding?' }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.reply, 'For your wedding, I recommend our Luxury Tin Bid Box.');
    assert.equal(json.recommendations.length, 1, 'Draft product must be dropped from recommendations');
    assert.equal(json.recommendations[0].productId, 'bid-box-luxury-tin');
    assert.equal(json.recommendations[0].displayPrice, 'Rs. 350');
    assert.equal(json.inquiryPrefill.quantity, 50);
    assert.equal(json.inquiryPrefill.packagingSubtotal, 17500);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('endpoint: provider timeout returns HTTP 503 AI_TIMEOUT without a fake answer', async () => {
  const app = createAiTestServer({
    db: { connected: true },
    catalog: TEST_CATALOG,
    n8nHandler: async () => {
      throw new Error('AI_TIMEOUT');
    },
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/concierge/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userText: 'Hello AllBarka' }),
    });

    assert.equal(res.status, 503);
    const json = await res.json();
    assert.equal(json.code, 'AI_TIMEOUT');
    assert.equal(json.available, false);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('endpoint: catalog database failure injects unpriced guidance notice into prompt', async () => {
  let promptReceived = '';
  const app = createAiTestServer({
    db: null, // DB offline!
    catalog: [],
    n8nHandler: async body => {
      promptReceived = body.system;
      return { reply: 'Our team on WhatsApp is available to help.', action: 'human' };
    },
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/concierge/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userText: 'What is the price of pistachios?' }),
    });

    assert.equal(res.status, 200);
    assert.match(promptReceived, /CATALOG UNAVAILABLE/);
    assert.match(promptReceived, /WhatsApp/);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
