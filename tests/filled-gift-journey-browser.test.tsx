import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { once } from 'node:events';
import { build } from 'esbuild';
import { launchTestBrowser } from './helpers/browser.mjs';
import { memoryFirestore } from './helpers/memoryFirestore';
import { HAMPER_BOX_SEEDS } from '../src/lib/hamperBoxSchema';
import { hamperSelectionPrice, resolveHamper, CUSTOM_HAMPER_PRODUCT_ID } from '../src/lib/hamperCatalog';
import { PRODUCTS } from '../src/data/products';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { createCatalogConfigurationRouter } from '../src/lib/catalogConfigurationRouter';
import { createStorefrontContentRouter } from '../src/lib/storefrontContentRouter';
import { createInquiriesRouter } from '../src/lib/inquiriesRouter';
import { createDurableOrder } from '../src/lib/orderDatabase';
import type { Product } from '../src/types';

// End-to-end mounted browser and authoritative API inquiry journey verification
test('R04-KG1: mounted card/modal, authoritative inquiry persistence and returned WhatsApp message journey', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-journey-'));

  // Test fixtures:
  // 1. mock-nut-acceptance: Rs. 1000/kg (and Rs. 350 for 250g)
  const mockNut: Product = {
    ...PRODUCTS.find(p => p.id === 'badam')!,
    id: 'mock-nut-acceptance',
    name_en: 'Acceptance Almonds',
    name_ur: 'ٹیسٹ بادام',
    name_ar: 'لوز تجريبي',
    status: 'published',
    prices: { '1kg': 1000, '250g': 350 },
    variants: [
      { label: '1kg', price: 1000, available: true },
      { label: '250g', price: 350, available: true },
    ],
  };

  // 2. mock-box-acceptance: Rs. 100 empty pack, Rs. 9000 legacy filled option, 50g recipe
  const mockBox: Product = {
    ...PRODUCTS.find(p => p.id === 'bid-box-umrah-tabarruk')!,
    id: 'mock-box-acceptance',
    name_en: 'Acceptance Favor Box',
    name_ur: 'ٹیسٹ فیور بکس',
    name_ar: 'صندوق اختبار',
    category: 'celebration-boxes',
    packagingSubcategory: 'wedding',
    isBidBox: true,
    active: true,
    status: 'published',
    orderMode: 'both',
    shippingWeightG: 200,
    prices: {
      'Empty Box (1 pc)': 100,
      'Filled Legacy Option': 9000,
    },
    variants: [
      { label: 'Empty Box (1 pc)', price: 100, available: true },
      { label: 'Filled Legacy Option', price: 9000, available: true },
    ],
    filledRecipes: {
      'Filled Legacy Option': [{ productId: 'mock-nut-acceptance', grams: 50 }],
    },
    bidBoxConfig: {
      emptyUnitStarting: 100,
      emptyBulk50Unit: 90,
      emptyBulk100Unit: 80,
      emptyTiers: [
        { qty: 1, label: 'Empty Box (1 pc)', unitPrice: 100, packPrice: 100, variantKey: 'Empty Box (1 pc)' },
        { qty: 25, label: '25-pcs', unitPrice: 100, packPrice: 2500, variantKey: '25-pcs' },
      ],
      filledOptions: [
        { label: 'Filled Legacy Option', subtitle: '50g Almonds filling', price: 9000, variantKey: 'Filled Legacy Option' },
      ],
    },
  };

  // 3. Box where stored empty pricing was deleted (only filled option exists in stored prices)
  const boxDeletedEmpty: Product = {
    ...mockBox,
    id: 'mock-box-deleted-empty',
    name_en: 'Box With Deleted Empty Pricing',
    prices: { 'Filled Legacy Option': 9000 },
    variants: [{ label: 'Filled Legacy Option', price: 9000, available: true }],
  };

  // 4. Box where stored empty pricing is disabled in variants
  const boxDisabledEmpty: Product = {
    ...mockBox,
    id: 'mock-box-disabled-empty',
    name_en: 'Box With Disabled Empty Pricing',
    prices: { 'Empty Box (1 pc)': 100, 'Filled Legacy Option': 9000 },
    variants: [
      { label: 'Empty Box (1 pc)', price: 100, available: false },
      { label: 'Filled Legacy Option', price: 9000, available: true },
    ],
  };

  // 5. Box without recipe
  const boxNoRecipe: Product = {
    ...mockBox,
    id: 'mock-box-no-recipe',
    name_en: 'Box Without Configured Recipe',
    filledRecipes: undefined,
    recipeIngredients: undefined,
  };

  const fixtureProducts = [
    mockNut,
    mockBox,
    boxDeletedEmpty,
    boxDisabledEmpty,
    boxNoRecipe,
    ...PRODUCTS.filter(p => !['mock-nut-acceptance', 'mock-box-acceptance', 'mock-box-deleted-empty', 'mock-box-disabled-empty', 'mock-box-no-recipe'].includes(p.id)),
  ];

  const { db, records } = memoryFirestore(
    Object.fromEntries([
      ...fixtureProducts.map(product => [`products/${product.id}`, product] as const),
      ...HAMPER_BOX_SEEDS.map(box => [`hamperBoxes/${box.id}`, { schemaVersion: 1, boxId: box.id, revision: 0, price: box.price, active: true }] as const),
    ])
  );
  db.doc = (docPath: string) => db.collection(docPath.split('/')[0]).doc(docPath.split('/')[1]);

  // Client bundle with esbuild
  const entry = `
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CartProvider, useCart } from './src/contexts/CartContext';
import { CatalogProvider, useCatalogProducts } from './src/contexts/CatalogContext';
import { MerchandisingProvider } from './src/contexts/MerchandisingContext';
import { ProductMediaProvider } from './src/contexts/ProductMediaContext';
import { StorefrontContentProvider, useStorefrontContentRefresh } from './src/contexts/StorefrontContentContext';
import RootLayout from './src/layouts/RootLayout';
import HomePage from './src/pages/HomePage';
import ShopPage from './src/pages/ShopPage';
import ProductDetailPage from './src/pages/ProductDetailPage';
import BidBoxesSection from './src/components/BidBoxesSection';
import { PRODUCTS } from './src/data/products';

function Controls() {
  const { setLanguage } = useLanguage();
  const { setTheme } = useTheme();
  const refresh = useStorefrontContentRefresh();
  const cart = useCart();
  const catalog = useCatalogProducts();
  useEffect(() => {
    window.fixture = {
      refresh,
      lang: setLanguage,
      theme: setTheme,
      cart: cart.cartItems,
      catalog,
      close: () => cart.setIsCartOpen(false),
      clear: () => cart.clearCart(),
    };
  });
  return null;
}

function CelebrationPage() {
  return (
    <div className="py-8 px-4 max-w-7xl mx-auto">
      <BidBoxesSection compact={false} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <LanguageProvider>
        <CatalogProvider initialProducts={PRODUCTS}>
          <MerchandisingProvider>
            <ProductMediaProvider>
              <CartProvider>
                <StorefrontContentProvider>
                  <Controls />
                  <Routes>
                    <Route path="/" element={<RootLayout />}>
                      <Route index element={<HomePage />} />
                      <Route path="celebration-boxes" element={<CelebrationPage />} />
                      <Route path="shop" element={<ShopPage />} />
                      <Route path="shop/:category" element={<ShopPage />} />
                      <Route path="product/:id" element={<ProductDetailPage />} />
                      <Route path="gifting" element={<ShopPage />} />
                    </Route>
                  </Routes>
                </StorefrontContentProvider>
              </CartProvider>
            </ProductMediaProvider>
          </MerchandisingProvider>
        </CatalogProvider>
      </LanguageProvider>
    </ThemeProvider>
  </BrowserRouter>
);
`;

  await build({
    stdin: { contents: entry, loader: 'tsx', resolveDir: process.cwd(), sourcefile: 'journey-fixture.tsx' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: path.join(temporary, 'fixture.js'),
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
    plugins: [
      {
        name: 'isolated-auth',
        setup(builder) {
          builder.onResolve({ filter: /\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'isolated' }));
          builder.onLoad({ filter: /.*/, namespace: 'isolated' }, () => ({
            contents: 'export const useAuth=()=>({currentUser:null,patronProfile:null,loading:false,logout:async()=>{}});',
            loader: 'js',
          }));
        },
      },
    ],
  });

  const app = express();
  app.use(express.json());
  const requireAdmin: any = (_req: any, res: any) => res.status(403).json({ code: 'FORBIDDEN_ADMIN' });

  app.use(createCatalogRouter({ getDb: () => db, requireAdmin }));
  app.use(createCatalogConfigurationRouter({ getDb: () => db, requireAdmin }));
  app.use(createStorefrontContentRouter({ getDb: () => db, requireAdmin }));
  app.use(createInquiriesRouter({ getDb: () => db, requireAdmin }));
  app.get('/api/product-media', (_req, res) => res.json({ overrides: {} }));

  for (const folder of ['images', 'fonts', 'videos']) {
    app.use('/' + folder, express.static(path.resolve('public', folder)));
  }
  app.use('/assets', express.static(path.resolve('dist/assets')));
  app.get('/fixture.js', (_req, res) => res.sendFile(path.join(temporary, 'fixture.js')));

  const builtHtml = await fs.readFile('dist/index.html', 'utf8');
  const styles = [...builtHtml.matchAll(/<link\b[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g)].map(m => m[1]);
  const css = styles.map(href => `<link rel="stylesheet" href="${href}">`).join('');

  app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ code: 'NOT_FOUND' });
    res.type('html').send(`
      <html>
        <head>
          <meta name="viewport" content="width=device-width,initial-scale=1">
          ${css}
          <style>
            @font-face { font-family: Amiri; src: url(/fonts/Amiri-Regular.ttf); }
            @font-face { font-family: "Noto Nastaliq Urdu"; src: url(/fonts/NotoNastaliqUrdu.ttf); }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script src="/fixture.js"></script>
        </body>
      </html>
    `);
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const browser = await launchTestBrowser();

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.fulfill({ status: 200, body: '' })));
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    // =========================================================================
    // 1. CARD DISPLAY VERIFICATION
    // =========================================================================
    await page.goto(`${origin}/celebration-boxes`);
    await page.waitForFunction(() => (window as any).fixture?.catalog?.length > 0);

    // Locate acceptance box card
    const boxCard = page.locator('article', { hasText: 'Acceptance Favor Box' });
    await boxCard.waitFor();

    // Verify filled estimate on card: Rs. 150/box (Rs. 50 nuts + Rs. 100 empty box)
    const cardText = await boxCard.innerText();
    assert.match(cardText, /Rs\.\s*150\/box/, 'Card displays Rs. 150/box estimate');
    assert.doesNotMatch(cardText, /Rs\.\s*9,?000/, 'Card never displays legacy Rs. 9,000 filled price');
    assert.doesNotMatch(cardText, /Rs\.\s*9,?050/, 'Card never adds ingredients to legacy Rs. 9,000');

    // =========================================================================
    // 2. MODAL OPENING & BUDGET INDEPENDENCE
    // =========================================================================
    // Select "Filled Legacy Option" on card then click Request Custom Quote to open CustomQuoteModal
    await boxCard.locator('button', { hasText: 'Filled Legacy Option' }).click();
    await boxCard.locator('button', { hasText: 'Request Custom Quote' }).first().click();

    const quoteModal = page.locator('#custom-quote-modal-title');
    await quoteModal.waitFor();

    // Verify Catalog Reference Rate displays Rs. 150 / box for quantity 1
    const refRateText = await page.locator('text=Catalog Reference Rate:').locator('..').innerText();
    assert.match(refRateText, /Rs\.\s*150\s*\/\s*box/, 'Modal displays Rs. 150 / box reference rate');

    // Change quantity to 10
    const qtyInput = page.locator('#quote-quantity-input');
    await qtyInput.fill('10');

    // Wait for Catalog Reference Rate to reflect Rs. 150 / box (Est. Rs. 1,500 total)
    await page.waitForFunction(() => {
      const el = document.querySelector('input#quote-quantity-input') as HTMLInputElement;
      return el && el.value === '10';
    });
    const updatedRefRateText = await page.locator('text=Catalog Reference Rate:').locator('..').innerText();
    assert.match(updatedRefRateText, /Rs\.\s*150\s*\/\s*box/, 'Modal retains Rs. 150 / box');
    assert.match(updatedRefRateText, /Est\.\s*Rs\.\s*1,?500\s*total/, 'Modal computes Rs. 1,500 total for 10 boxes');

    // Assert customer budget starts empty and independent
    const budgetInput = page.locator('#quote-target-budget');
    assert.equal(await budgetInput.inputValue(), '', 'Customer target budget starts empty and is not prefilled');

    // Customer enters independent target budget offer of Rs. 120 / box
    await budgetInput.fill('120');

    // Fill customer contact information
    await page.locator('#quote-customer-name').fill('Fatima Zahra');
    await page.locator('#quote-customer-phone').fill('03160666083');

    // =========================================================================
    // 3. QUOTE SUBMISSION & AGREEMENT
    // =========================================================================
    // Submit custom quote
    await page.locator('button', { hasText: 'Submit & Save Custom Quote' }).click();

    // Verify success confirmation state
    const confirmationHeader = page.locator('text=Quote Saved & Logged');
    await confirmationHeader.waitFor();
    const confirmationText = await page.locator('.space-y-1').innerText();
    assert.match(confirmationText, /Ref\s*#ABQ-/i);
    const quoteIdMatch = confirmationText.match(/Ref\s*#(ABQ-[A-Z0-9-]+)/i);
    assert.ok(quoteIdMatch, 'Confirmation contains quote reference ID');
    const quoteId = quoteIdMatch[1];

    // Verify persisted record in memoryFirestore
    const storedRecord = (records.get(`inquiries/${quoteId}`) || records.get(`quotes/${quoteId}`)) as any;
    assert.ok(storedRecord, 'Inquiry must be stored in database');
    assert.equal(storedRecord.standardPrice, 150, 'Stored standardPrice is exactly Rs. 150/box');
    assert.equal(storedRecord.estimatedTotalPkr, 1500, 'Stored estimatedTotalPkr is exactly Rs. 1,500');
    assert.equal(storedRecord.offeredPrice, 120, 'Stored offeredPrice preserves customer target budget independently');
    assert.equal(storedRecord.quantity, 10, 'Stored quantity is 10 boxes');

    // Verify decoded returned WhatsApp message agrees completely
    assert.ok(storedRecord.whatsappUrl, 'Stored record has WhatsApp URL');
    const decodedWhatsApp = decodeURIComponent(storedRecord.whatsappUrl);
    assert.match(decodedWhatsApp, /Standard Rate Ref:\*\s*Rs\.\s*150\/pc/, 'WhatsApp message has Standard Rate Ref: Rs. 150/pc');
    assert.match(decodedWhatsApp, /Target Offer \/ Budget:\*\s*Rs\.\s*120 PKR/, 'WhatsApp message has customer Target Offer: Rs. 120 PKR');
    assert.doesNotMatch(decodedWhatsApp, /9,?000/, 'WhatsApp message never contains legacy Rs. 9,000');
    assert.doesNotMatch(decodedWhatsApp, /9,?050/, 'WhatsApp message never contains Rs. 9,050');

    // Close modal
    await page.locator('button[aria-label="Close Custom Quote Modal"]').click();

    // =========================================================================
    // 4. CHANGED AUTHORITATIVE KG RATE & FORGED BROWSER TOTALS
    // =========================================================================
    // Update authoritative kg rate in database: Rs. 1,000 -> Rs. 2,000/kg
    const updatedNut = {
      ...mockNut,
      prices: { '1kg': 2000, '250g': 600 },
      variants: [
        { label: '1kg', price: 2000, available: true },
        { label: '250g', price: 600, available: true },
      ],
    };
    records.set(`products/${mockNut.id}`, updatedNut);

    // Attempt to submit inquiry with forged browser values: standardPrice: 1, estimatedTotalPkr: 10
    const forgedResponse = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Zainab Bibi',
        customerPhone: '03009876543',
        productId: mockBox.id,
        packagingVariant: 'Filled Legacy Option',
        boxMode: 'filled',
        quantity: 10,
        standardPrice: 1, // Forged client rate
        referenceUnitPrice: 1, // Forged reference
        targetUnitPrice: 1,
        estimatedTotalPkr: 10, // Forged total
      }),
    });
    assert.equal(forgedResponse.status, 200);
    const forgedJson = await forgedResponse.json();
    assert.equal(forgedJson.ok, true);
    const forgedQuoteRecord = records.get(`inquiries/${forgedJson.quoteId}`) as any;
    assert.ok(forgedQuoteRecord);

    // Recomputed server estimate: 50g * 2000 / 1000 = Rs. 100 nut + Rs. 100 packaging = Rs. 200/box, Rs. 2000 total
    assert.equal(forgedQuoteRecord.standardPrice, 200, 'Server recomputed using changed authoritative kg rate (Rs. 200/box)');
    assert.equal(forgedQuoteRecord.estimatedTotalPkr, 2000, 'Server subtotal is Rs. 2,000 for 10 boxes');
    assert.notEqual(forgedQuoteRecord.standardPrice, 1, 'Server strictly ignored forged standardPrice: 1');
    assert.notEqual(forgedQuoteRecord.estimatedTotalPkr, 10, 'Server strictly ignored forged estimatedTotalPkr: 10');

    // =========================================================================
    // 5. MISSING RECIPE / KG / PACKAGING REMAINS UNPRICED
    // =========================================================================
    // Box without recipe
    const noRecipeResponse = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Maryam Noor',
        customerPhone: '03123456789',
        productId: boxNoRecipe.id,
        packagingVariant: 'Filled Legacy Option',
        boxMode: 'filled',
        quantity: 10,
      }),
    });
    assert.equal(noRecipeResponse.status, 200);
    const noRecipeJson = await noRecipeResponse.json();
    const noRecipeRecord = records.get(`inquiries/${noRecipeJson.quoteId}`) as any;
    assert.equal(noRecipeRecord.standardPrice, null, 'Missing recipe remains unpriced (standardPrice: null)');
    assert.equal(noRecipeRecord.requiresTeamQuote, true, 'Missing recipe sets requiresTeamQuote: true');
    const noRecipeDecodedWA = decodeURIComponent(noRecipeRecord.whatsappUrl);
    assert.match(noRecipeDecodedWA, /Standard Rate Ref:\*\s*Custom Quote on Request/, 'WhatsApp has honest quote-required message');
    assert.doesNotMatch(noRecipeDecodedWA, /9,?000/, 'Never restores legacy Rs. 9000');

    // Known legacy packaging label without recipe remains unpriced for new inquiries
    const legacyResponse = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Amina Tariq',
        customerPhone: '03211234567',
        productId: 'bid-box-umrah-tabarruk',
        packagingVariant: 'Filled with Zamzam Bottle & Ajwa Dates (Set of 10)',
        boxMode: 'filled',
        quantity: 10,
      }),
    });
    assert.equal(legacyResponse.status, 200);
    const legacyJson = await legacyResponse.json();
    const legacyRecord = records.get(`inquiries/${legacyJson.quoteId}`) as any;
    assert.equal(legacyRecord.standardPrice, null, 'Legacy packaging without recipe remains unpriced for new inquiry');
    assert.equal(legacyRecord.requiresTeamQuote, true);

    // =========================================================================
    // 6. DELETING / DISABLING STORED EMPTY PRICING CANNOT RESURRECT COMPILED TIER
    // =========================================================================
    // Deleted empty pricing
    const deletedEmptyRes = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Bilal Khan',
        customerPhone: '03331112233',
        productId: boxDeletedEmpty.id,
        packagingVariant: 'Filled Legacy Option',
        boxMode: 'filled',
        quantity: 10,
      }),
    });
    assert.equal(deletedEmptyRes.status, 200);
    const deletedEmptyJson = await deletedEmptyRes.json();
    const deletedEmptyRecord = records.get(`inquiries/${deletedEmptyJson.quoteId}`) as any;
    assert.equal(deletedEmptyRecord.standardPrice, null, 'Deleted empty pricing leaves filled estimate unpriced');
    assert.equal(deletedEmptyRecord.requiresTeamQuote, true);

    // Disabled empty pricing
    const disabledEmptyRes = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Usman Ali',
        customerPhone: '03445556677',
        productId: boxDisabledEmpty.id,
        packagingVariant: 'Filled Legacy Option',
        boxMode: 'filled',
        quantity: 10,
      }),
    });
    assert.equal(disabledEmptyRes.status, 200);
    const disabledEmptyJson = await disabledEmptyRes.json();
    const disabledEmptyRecord = records.get(`inquiries/${disabledEmptyJson.quoteId}`) as any;
    assert.equal(disabledEmptyRecord.standardPrice, null, 'Disabled empty pricing leaves filled estimate unpriced');
    assert.equal(disabledEmptyRecord.requiresTeamQuote, true);

    // =========================================================================
    // 7. HAMPER INQUIRY JOURNEY (STRUCTURED CONFIG & CART UNCHANGED)
    // =========================================================================
    await page.goto(`${origin}/gifting`);
    await page.locator('.gift-open-builder').click();
    const hamperDialog = page.locator('.gift-builder-dialog[role=dialog]');
    await hamperDialog.waitFor();

    // Advance to step 2 (selections)
    await hamperDialog.locator('.gift-builder-steps button').nth(1).click();
    // Advance to step 3 (personalization)
    await hamperDialog.locator('.gift-builder-steps button').nth(2).click();

    await hamperDialog.locator('#hamper-recipient').fill('Khadija');
    await hamperDialog.locator('#hamper-message').fill('With prayers and joy');

    // Click "Request Hamper Quote"
    await hamperDialog.locator('.gift-builder-add').click();
    await hamperDialog.waitFor({ state: 'hidden' });

    // Assert shopping bag item count is UNCHANGED (length is 0)
    assert.equal(await page.evaluate(() => (window as any).fixture.cart.length), 0, 'Hamper Request Quote leaves cart count unchanged');

    // Assert CustomQuoteModal is opened with complete structured configuration
    const hamperQuoteModal = page.locator('#custom-quote-modal-title');
    await hamperQuoteModal.waitFor();

    // Check prefilled recipient and message
    assert.equal(await page.locator('#quote-monogram-text').inputValue(), 'Khadija');
    assert.equal(await page.locator('#quote-card-message').inputValue(), 'With prayers and joy');

    // Check budget input starts empty
    assert.equal(await page.locator('#quote-target-budget').inputValue(), '', 'Customer budget starts empty');

    // Check Catalog Reference Rate
    const hamperRefRateText = await page.locator('text=Catalog Reference Rate:').locator('..').innerText();
    const expectedHamperUnit = 1800 + ['pista', 'kaju', 'badam', 'akhroot'].reduce(
      (sum, id) => sum + hamperSelectionPrice(fixtureProducts.find(p => p.id === id)!)!,
      0
    );
    assert.match(hamperRefRateText, new RegExp(`Rs\\.\\s*${expectedHamperUnit.toLocaleString()}`), 'Catalog Reference Rate displays hamper estimate');

    // Submit hamper quote
    await page.locator('#quote-customer-name').fill('Khadija Tul Kubra');
    await page.locator('#quote-customer-phone').fill('03001122334');
    await page.locator('button', { hasText: 'Submit & Save Custom Quote' }).click();

    await page.locator('text=Quote Saved & Logged').waitFor();
    const hamperQuoteText = await page.locator('.space-y-1').innerText();
    const hamperQuoteId = hamperQuoteText.match(/Ref\s*#(ABQ-[A-Z0-9-]+)/i)![1];

    const storedHamperRecord = (records.get(`inquiries/${hamperQuoteId}`) || records.get(`quotes/${hamperQuoteId}`)) as any;
    assert.ok(storedHamperRecord);
    assert.equal(storedHamperRecord.isVerifiedCatalogProduct, true, 'Server verified structured hamper configuration');
    assert.equal(storedHamperRecord.standardPrice, expectedHamperUnit, 'Stored standardPrice matches hamper estimate');
    assert.ok(storedHamperRecord.hamperConfiguration, 'Stored inquiry preserves structured hamper configuration');
    assert.equal(storedHamperRecord.hamperConfiguration.boxId, 'box-wood');
    assert.equal(storedHamperRecord.hamperConfiguration.recipientName, 'Khadija');

    // Test arbitrary custom-hamper string without valid config
    const unverifiedHamperRes = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Hassan Raza',
        customerPhone: '03009988776',
        productId: 'custom-hamper', // Arbitrary without valid configuration
        quantity: 1,
      }),
    });
    assert.equal(unverifiedHamperRes.status, 200);
    const unverifiedHamperJson = await unverifiedHamperRes.json();
    const unverifiedRecord = records.get(`inquiries/${unverifiedHamperJson.quoteId}`) as any;
    assert.equal(unverifiedRecord.isVerifiedCatalogProduct, false, 'Arbitrary custom-hamper is NOT verified');
    assert.equal(unverifiedRecord.standardPrice, null);
    assert.equal(unverifiedRecord.requiresTeamQuote, true);

    // =========================================================================
    // 8. DIRECT ORDER SUBMISSION STRICTLY FAILS CLOSED (QUOTE_REQUIRED)
    // =========================================================================
    await assert.rejects(
      () =>
        createDurableOrder({
          db,
          payload: {
            name: 'Direct Attempt',
            phone: '03160666083',
            address: '123 Mall Road Lahore',
            city: 'Lahore',
            paymentMethod: 'cod',
            shippingMethodId: 'standard',
            items: [{ productId: mockBox.id, selectedWeight: 'Filled Legacy Option', quantity: 10 }],
          },
          uid: null,
          idempotencyKey: 'direct-order-test-filled-packaging',
        }),
      (err: any) => {
        assert.equal(err.code, 'QUOTE_REQUIRED');
        return true;
      }
    );

    // =========================================================================
    // 9. DEDUPLICATION & PRIVACY
    // =========================================================================
    const idemKey = 'stable-idem-key-999';
    const idemPayload = {
      submissionKey: idemKey,
      customerName: 'Idempotent Patron',
      customerPhone: '03001234567',
      productId: mockBox.id,
      packagingVariant: 'Empty Box (1 pc)',
      boxMode: 'empty',
      quantity: 50,
      eventType: 'Nikkah',
    };
    const idemRes1 = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
      body: JSON.stringify(idemPayload),
    });
    const idemJson1 = await idemRes1.json();
    assert.equal(idemRes1.status, 200);

    const idemRes2 = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
      body: JSON.stringify(idemPayload),
    });
    const idemJson2 = await idemRes2.json();
    assert.equal(idemRes2.status, 200);
    assert.equal(idemJson1.quoteId, idemJson2.quoteId, 'Submitting with same key returns identical quote ID');

    // Mismatched payload under same key returns 409
    const mismatchRes = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
      body: JSON.stringify({ ...idemPayload, quantity: 99 }),
    });
    assert.equal(mismatchRes.status, 409);
    const mismatchJson = await mismatchRes.json();
    assert.equal(mismatchJson.code, 'IDEMPOTENCY_PAYLOAD_MISMATCH');

    // =========================================================================
    // 10. HAMPER BOX AUTHORITY: STORED PRICE, DYNAMIC UPDATE & FAIL CLOSED
    // =========================================================================
    // 10.1 Stored hamper box price different from compiled default (e.g. Rs. 2,200 vs compiled Rs. 1,800)
    const storedWoodBox = {
      schemaVersion: 1,
      boxId: 'box-wood',
      revision: 1,
      price: 2200,
      active: true,
      updatedAt: new Date().toISOString(),
    };
    records.set('hamperBoxes/box-wood', storedWoodBox);

    // Refresh client catalog
    await page.evaluate(async () => {
      await (window as any).fixture.refresh();
    });

    // Submit inquiry for custom hamper with box-wood
    const hamperConfig1 = {
      version: 1 as const,
      boxId: 'box-wood' as const,
      selections: ['pista', 'kaju', 'badam', 'akhroot'],
      recipientName: 'Fatima',
      giftMessage: 'Special Wishes',
    };

    const storedBoxRes1 = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Fatima Zahra',
        customerPhone: '03005544332',
        productId: 'custom-hamper',
        hamperConfiguration: hamperConfig1,
        quantity: 1,
      }),
    });
    assert.equal(storedBoxRes1.status, 200);
    const storedBoxJson1 = await storedBoxRes1.json();
    assert.equal(storedBoxJson1.ok, true);
    const storedBoxRecord1 = records.get(`inquiries/${storedBoxJson1.quoteId}`) as any;
    assert.ok(storedBoxRecord1);

    const ingredientSum = ['pista', 'kaju', 'badam', 'akhroot'].reduce(
      (sum, id) => sum + hamperSelectionPrice(fixtureProducts.find(p => p.id === id)!)!,
      0
    );
    const expectedStoredBox1 = 2200 + ingredientSum;
    assert.equal(storedBoxRecord1.standardPrice, expectedStoredBox1, 'Inquiry uses stored hamper box rate (Rs. 2,200), NOT compiled default (Rs. 1,800)');
    assert.equal(storedBoxRecord1.estimatedTotalPkr, expectedStoredBox1);
    assert.notEqual(storedBoxRecord1.standardPrice, 1800 + ingredientSum, 'Compiled default Rs. 1,800 is not used');

    // Returned WhatsApp URL reflects authoritative rate
    const decodedWA1 = decodeURIComponent(storedBoxRecord1.whatsappUrl);
    assert.match(decodedWA1, new RegExp(`Standard Rate Ref:\\*\\s*Rs\\.\\s*${expectedStoredBox1.toLocaleString()}/pc`));
    assert.match(decodedWA1, new RegExp(`Estimated Total Ref:\\*\\s*Rs\\.\\s*${expectedStoredBox1.toLocaleString()} PKR`));

    // 10.2 Dynamically change stored box rate in Firestore: Rs. 2,200 -> Rs. 2,500
    const updatedWoodBox = {
      ...storedWoodBox,
      revision: 2,
      price: 2500,
      updatedAt: new Date().toISOString(),
    };
    records.set('hamperBoxes/box-wood', updatedWoodBox);

    // Refresh client catalog
    await page.evaluate(async () => {
      await (window as any).fixture.refresh();
    });

    const storedBoxRes2 = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Fatima Zahra',
        customerPhone: '03005544332',
        productId: 'custom-hamper',
        hamperConfiguration: hamperConfig1,
        quantity: 2,
      }),
    });
    assert.equal(storedBoxRes2.status, 200);
    const storedBoxJson2 = await storedBoxRes2.json();
    const storedBoxRecord2 = records.get(`inquiries/${storedBoxJson2.quoteId}`) as any;
    assert.ok(storedBoxRecord2);

    const expectedStoredBox2 = 2500 + ingredientSum;
    assert.equal(storedBoxRecord2.standardPrice, expectedStoredBox2, 'Next inquiry dynamically uses new stored rate (Rs. 2,500)');
    assert.equal(storedBoxRecord2.estimatedTotalPkr, expectedStoredBox2 * 2, 'Estimated total is preserved for 2 hampers');
    const decodedWA2 = decodeURIComponent(storedBoxRecord2.whatsappUrl);
    assert.match(decodedWA2, new RegExp(`Standard Rate Ref:\\*\\s*Rs\\.\\s*${expectedStoredBox2.toLocaleString()}/pc`));
    assert.match(decodedWA2, new RegExp(`Estimated Total Ref:\\*\\s*Rs\\.\\s*${(expectedStoredBox2 * 2).toLocaleString()} PKR`));

    // 10.3 Inactive or disabled stored hamper box strictly fails closed
    const disabledWoodBox = {
      ...updatedWoodBox,
      revision: 3,
      price: 0,
      active: false,
      updatedAt: new Date().toISOString(),
    };
    records.set('hamperBoxes/box-wood', disabledWoodBox);

    // Refresh client catalog
    await page.evaluate(async () => {
      await (window as any).fixture.refresh();
    });

    const disabledBoxRes = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Fatima Zahra',
        customerPhone: '03005544332',
        productId: 'custom-hamper',
        hamperConfiguration: hamperConfig1,
        quantity: 1,
      }),
    });
    assert.equal(disabledBoxRes.status, 200);
    const disabledBoxJson = await disabledBoxRes.json();
    const disabledBoxRecord = records.get(`inquiries/${disabledBoxJson.quoteId}`) as any;
    assert.ok(disabledBoxRecord);
    assert.equal(disabledBoxRecord.isVerifiedCatalogProduct, false, 'Disabled hamper box is not verified');
    assert.equal(disabledBoxRecord.standardPrice, null, 'Disabled hamper box has standardPrice: null');
    assert.equal(disabledBoxRecord.requiresTeamQuote, true, 'Disabled hamper box sets requiresTeamQuote: true');
    assert.equal(disabledBoxRecord.estimatedTotalPkr, null);
    const disabledDecodedWA = decodeURIComponent(disabledBoxRecord.whatsappUrl);
    assert.match(disabledDecodedWA, /Standard Rate Ref:\*\s*Custom Quote on Request/, 'WhatsApp has honest quote-required message');
    assert.doesNotMatch(disabledDecodedWA, /1,?800/, 'Never restores compiled default Rs. 1,800');
    assert.doesNotMatch(disabledDecodedWA, /2,?500/, 'Never displays inactive Rs. 2,500');

    // =========================================================================
    // 11. NON-DIVISIBLE MONEY & ESTIMATOR TOTAL PRECISION PRESERVATION
    // =========================================================================
    // Configure ingredient at Rs. 1,001/kg, 50g per box, 10 boxes
    // Net ingredient estimate: 1001 * 50 * 10 / 1000 = 500.5 -> rounded half-up = Rs. 501
    // Empty packaging: Rs. 100/box * 10 = Rs. 1,000
    // Total estimatedTotalPkr = 501 + 1000 = Rs. 1,501
    // Unit price per box: Math.round(1501 / 10) = 150
    const oddNut: Product = {
      ...mockNut,
      id: 'mock-nut-acceptance',
      prices: { '1kg': 1001, '250g': 350 },
      variants: [
        { label: '1kg', price: 1001, available: true },
        { label: '250g', price: 350, available: true },
      ],
    };
    records.set(`products/${mockNut.id}`, oddNut);

    const nonDivisibleRes = await fetch(`${origin}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Tahir Abbas',
        customerPhone: '03007766554',
        productId: mockBox.id,
        packagingVariant: 'Filled Legacy Option',
        boxMode: 'filled',
        quantity: 10,
      }),
    });
    assert.equal(nonDivisibleRes.status, 200);
    const nonDivisibleJson = await nonDivisibleRes.json();
    assert.equal(nonDivisibleJson.ok, true);
    const nonDivisibleRecord = records.get(`inquiries/${nonDivisibleJson.quoteId}`) as any;
    assert.ok(nonDivisibleRecord);

    // standardPrice is the nominal per-box unit rate: Rs. 150/box
    assert.equal(nonDivisibleRecord.standardPrice, 150, 'Nominal unit price is Rs. 150');
    // estimatedTotalPkr preserves exact estimator total: Rs. 1,501
    assert.equal(nonDivisibleRecord.estimatedTotalPkr, 1501, 'Authoritative total strictly preserves Rs. 1,501 without rounding drift');
    assert.notEqual(nonDivisibleRecord.estimatedTotalPkr, 1500, 'Downstream total did not drift to Rs. 1,500 through unit price round trips');

    // Returned WhatsApp message contains exact preserved total
    const nonDivisibleWA = decodeURIComponent(nonDivisibleRecord.whatsappUrl);
    assert.match(nonDivisibleWA, /Standard Rate Ref:\*\s*Rs\.\s*150\/pc/, 'WhatsApp message has nominal unit rate: Rs. 150/pc');
    assert.match(nonDivisibleWA, /Estimated Total Ref:\*\s*Rs\.\s*1,501 PKR/, 'WhatsApp message has preserved total: Rs. 1,501 PKR');

    // =========================================================================
    // 12. CARD HONEST QUOTE-REQUIRED STATE (NO cfg.filledMin FALLBACK)
    // =========================================================================
    await page.goto(`${origin}/celebration-boxes`);
    const noRecipeCard = page.locator('article').filter({ hasText: 'Box Without Configured Recipe' });
    await noRecipeCard.waitFor();
    const noRecipeCardText = await noRecipeCard.innerText();
    assert.match(noRecipeCardText, /Quote on Request/, 'Unconfigured recipe card displays Quote on Request for filled mode');
    assert.doesNotMatch(noRecipeCardText, /Filled:\s*Rs\./i, 'Unconfigured recipe card never displays any numeric price for filled mode');

    assert.deepEqual(errors, [], 'Zero browser page errors');
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
