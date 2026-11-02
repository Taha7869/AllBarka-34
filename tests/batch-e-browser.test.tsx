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
import { PRODUCTS } from '../src/data/products';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { invalidateCatalogCache } from '../src/lib/catalogStore';
import { createCatalogConfigurationRouter } from '../src/lib/catalogConfigurationRouter';
import { createStorefrontContentRouter } from '../src/lib/storefrontContentRouter';
import { createGiftRevealRouter, hashRevealToken } from '../src/lib/giftRevealRouter';

test('Batch E Browser Acceptance: M14 Gift Reveal, M26 Packaging & Scale Guide, M28 Shop the Table Scene, and M29 Reorder', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-batch-e-'));
  const testToken = '1111222233334444aaaabbbbccccdddd';
  const testTokenHash = hashRevealToken(testToken);

  const { db } = memoryFirestore({
    ...Object.fromEntries(PRODUCTS.map(product => [`products/${product.id}`, product])),
    [`giftReveals/${testTokenHash}`]: {
      tokenHash: testTokenHash,
      orderId: 'AB-ORDER-TEST',
      creatorUid: 'admin-tester',
      senderName: 'Begum Salma Qureshi',
      recipientName: 'Amina & Bilal',
      giftMessage: 'Heartiest congratulations on your new home! May it be filled with barakah.',
      items: [
        {
          productId: 'pista',
          name_en: 'Roasted Pistachios (Salted)',
          name_ur: 'بھنے ہوئے نمکین پستہ',
          name_ar: 'فستق محمص مملح',
          image: '/images/products/pista.webp',
          weight: '500g',
          quantity: 1,
        },
        {
          productId: 'kaju',
          name_en: 'Premium Cashews',
          name_ur: 'خاص کاجو',
          name_ar: 'كاجو فاخر',
          image: '/images/products/kaju.webp',
          weight: '500g',
          quantity: 1,
        },
      ],
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      revoked: false,
    },
  });

  const entry = `import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CartProvider, useCart } from './src/contexts/CartContext';
import { CatalogProvider } from './src/contexts/CatalogContext';
import { MerchandisingProvider } from './src/contexts/MerchandisingContext';
import { ProductMediaProvider } from './src/contexts/ProductMediaContext';
import { StorefrontContentProvider } from './src/contexts/StorefrontContentContext';
import RootLayout from './src/layouts/RootLayout';
import HomePage from './src/pages/HomePage';
import ShopPage from './src/pages/ShopPage';
import ProductDetailPage from './src/pages/ProductDetailPage';
import GiftRevealPage from './src/pages/GiftRevealPage';

function Controls() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLanguage, language, isRtl } = useLanguage();
  const { setTheme, theme } = useTheme();
  const cart = useCart();

  useEffect(() => {
    (window as any).fixture = {
      navigate,
      routeKey: location.key,
      pathname: location.pathname,
      language,
      isRtl,
      theme,
      setLanguage,
      setTheme,
      cartItems: cart.cartItems,
      cartCount: cart.cartItems.reduce((acc, item) => acc + item.quantity, 0),
      closeCart: () => cart.setIsCartOpen(false),
      clearCart: () => cart.clearCart(),
    };
  });
  return null;
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <BrowserRouter>
    <ThemeProvider>
      <LanguageProvider>
        <CatalogProvider>
          <MerchandisingProvider>
            <ProductMediaProvider>
              <CartProvider>
                <StorefrontContentProvider>
                  <Controls />
                  <Routes>
                    <Route path="/" element={<RootLayout />}>
                      <Route index element={<HomePage />} />
                      <Route path="shop" element={<ShopPage />} />
                      <Route path="shop/:category" element={<ShopPage />} />
                      <Route path="product/:id" element={<ProductDetailPage />} />
                      <Route path="reveal/:token" element={<GiftRevealPage />} />
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
);`;

  await build({
    stdin: {
      contents: entry,
      loader: 'tsx',
      resolveDir: process.cwd(),
      sourcefile: 'batch-e-fixture.tsx',
    },
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
            contents: `const testUser = { uid: 'test-patron-uid', getIdToken: async () => 'test-auth-token', getIdTokenResult: async () => ({ claims: {} }) };
            const testProfile = { name: 'Begum Salma Qureshi', email: 'salma@example.com' };
            export const useAuth = () => ({
              currentUser: testUser,
              patronProfile: testProfile,
              loading: false,
              logout: async () => {},
            });`,
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
  app.use(createGiftRevealRouter({ getDb: () => db, requireAdmin }));
  app.get('/api/product-media', (_req, res) => res.json({ overrides: {} }));

  let quoteMode = 'success';

  app.get('/api/me/loyalty', (_req, res) => {
    return res.json({
      success: true,
      loyaltyPoints: 500,
      activeRewards: [],
      transactions: [],
    });
  });

  app.get('/api/me/orders', (_req, res) => {
    return res.json({
      success: true,
      orders: [
        {
          orderId: 'AB-HIST-001',
          status: 'DELIVERED',
          createdAt: '2026-10-15T12:00:00.000Z',
          city: 'Lahore',
          items: [
            {
              productId: 'pista',
              name: 'Roasted Iranian Pistachios (Pista)',
              selectedWeight: '250g',
              quantity: 2,
              price: 1250,
              unitPrice: 1250,
            },
          ],
          totals: { subtotal: 2500, total: 2500, discount: 0, shipping: 0 },
        },
      ],
    });
  });

  app.post('/api/orders/quote', async (_req, res) => {
    if (quoteMode === 'network_error') {
      return res.status(500).json({ error: 'Database connection failed', code: 'SERVER_ERROR' });
    }
    if (quoteMode === 'quote_required') {
      return res.status(400).json({
        code: 'QUOTE_REQUIRED',
        error: 'Please request a personalized quote for custom boutique items.',
      });
    }
    if (quoteMode === 'product_unavailable') {
      return res.status(400).json({
        code: 'PRODUCT_UNAVAILABLE',
        error: 'Product "Roasted Iranian Pistachios (Pista)" is currently out of harvest.',
      });
    }
    if (quoteMode === 'variant_unavailable') {
      return res.status(400).json({
        code: 'VARIANT_UNAVAILABLE',
        error: 'Portion 250g is currently unavailable for this product.',
      });
    }
    if (quoteMode === 'delayed') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return res.json({
        success: true,
        totals: { subtotal: 2500, isQuoteRequest: false },
        items: [{ productId: 'pista', selectedWeight: '250g', price: 1250, quantity: 2 }],
      });
    }
    if (quoteMode === 'price_changed') {
      return res.json({
        success: true,
        totals: { subtotal: 2800, isQuoteRequest: false },
        items: [{ productId: 'pista', selectedWeight: '250g', price: 1400, quantity: 2 }],
      });
    }
    return res.json({
      success: true,
      totals: { subtotal: 2500, isQuoteRequest: false },
      items: [{ productId: 'pista', selectedWeight: '250g', price: 1250, quantity: 2 }],
    });
  });

  app.post('/api/test-control/quote-mode', (req, res) => {
    quoteMode = req.body.mode;
    return res.json({ quoteMode });
  });

  app.post('/api/test-control/update-price', async (req, res) => {
    const { productId, weight, price } = req.body;
    const docRef = db.collection('products').doc(productId);
    const snap = await docRef.get();
    if (snap.exists) {
      const data = snap.data();
      data.prices = { ...data.prices, [weight]: price };
      data.variants = (data.variants || []).map((v: any) => v.label === weight ? { ...v, price } : v);
      data.updatedAt = new Date().toISOString();
      await docRef.set(data);
      invalidateCatalogCache();
    }
    return res.json({ success: true });
  });

  for (const folder of ['images', 'fonts', 'videos']) {
    app.use('/' + folder, express.static(path.resolve('public', folder)));
  }
  app.use('/assets', express.static(path.resolve('dist/assets')));
  app.get('/fixture.js', (_req, res) => res.sendFile(path.join(temporary, 'fixture.js')));

  const builtHtml = await fs.readFile('dist/index.html', 'utf8').catch(() => '');
  const styles = [...builtHtml.matchAll(/<link\b[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g)].map(m => m[1]);
  const css = styles.map(href => `<link rel="stylesheet" href="${href}">`).join('');

  app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ code: 'NOT_FOUND' });
    return res.type('html').send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${css}
</head>
<body>
  <div id="root"></div>
  <script src="/fixture.js"></script>
</body>
</html>`);
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const browser = await launchTestBrowser();

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // ----------------------------------------------------
    // TEST 1: M14 Gift Reveal Recipient Unboxing Experience
    // ----------------------------------------------------
    await page.goto(`${origin}/reveal/${testToken}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Begum Salma Qureshi', { timeout: 10000 });
    
    // Sealed state verification
    const unboxButton = page.locator('button:has-text("Break Wax Seal")');
    assert.equal(await unboxButton.isVisible(), true);

    // Click to unbox
    await unboxButton.click();
    await page.waitForTimeout(600);

    // Calligraphy message & items revealed
    const messageLocator = page.locator('text=May it be filled with barakah');
    assert.equal(await messageLocator.isVisible(), true);
    
    const itemLocator = page.locator('text=Roasted Pistachios');
    assert.equal(await itemLocator.isVisible(), true);

    // Verify ZERO prices displayed anywhere on the gift reveal page
    const pageText = await page.innerText('body');
    assert.equal(pageText.includes('Rs.'), false, 'Gift reveal must never display prices to recipient');
    assert.equal(pageText.includes('PKR'), false, 'Gift reveal must never display currency to recipient');

    // ----------------------------------------------------
    // TEST 2: M28 Shop the Table Scene Modal
    // ----------------------------------------------------
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.heritage-hero-table-scene', { timeout: 10000 });

    const openTableBtn = page.locator('.heritage-hero-table-scene');
    assert.equal(await openTableBtn.isVisible(), true);
    await openTableBtn.click();

    // Verify modal is open and hotspots exist
    await page.waitForSelector('.shop-the-table-modal', { timeout: 5000 });
    const hotspots = page.locator('.shop-the-table-modal [data-hotspot]');
    assert.equal(await hotspots.count(), 4);

    // Click Cashew hotspot
    const kajuHotspot = page.locator('.shop-the-table-modal [data-hotspot="kaju"]');
    await kajuHotspot.click({ force: true });
    await page.waitForTimeout(300);

    // Add to Bag inside modal
    const addToBagBtn = page.locator('.shop-the-table-modal button:has-text("Add to Bag")');
    assert.equal(await addToBagBtn.isVisible(), true);
    await addToBagBtn.click();
    await page.waitForTimeout(400);

    // Cart updated
    const cartCount = await page.evaluate(() => (window as any).fixture.cartCount);
    assert.ok(cartCount >= 1, 'Item from table scene was added to bag');

    // Close modal
    const closeBtn = page.locator('.shop-the-table-modal button[aria-label="Close"]');
    await closeBtn.click();
    await page.waitForTimeout(300);

    // ----------------------------------------------------
    // TEST 3: M26 Packaging Preview & Scale Guide in PDP
    // ----------------------------------------------------
    // 1. Verify standard retail food item (pista) does NOT claim to be a keepsake box or show unverified dimensions
    await page.goto(`${origin}/product/pista`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.pdp-packaging-preview').isVisible(), false, 'Retail pista must not show keepsake packaging claims');

    // 2. Verify authentic packaging / celebration product (bid-box-luxury-tin) displays verified packaging & scale
    await page.goto(`${origin}/product/bid-box-luxury-tin`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.pdp-packaging-preview', { timeout: 10000 });
    assert.equal(await page.locator('.pdp-packaging-preview').isVisible(), true);

    // Toggle to "What Arrives Inside"
    const insideToggle = page.locator('.pdp-packaging-preview button[data-view-mode="inside"]');
    await insideToggle.click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.pdp-inside-breakdown').isVisible(), true);

    // Scale guide banner displays verified dimensions from catalog definition
    const scaleGuide = page.locator('[data-scale-guide]');
    assert.equal(await scaleGuide.isVisible(), true);
    const scaleText = await scaleGuide.innerText();
    assert.ok(scaleText.includes('18cm x 18cm') || scaleText.includes('Capacity') || scaleText.includes('tin'), 'Scale guide clarifies verified proportion');

    // ----------------------------------------------------
    // TEST 4: Mobile Viewport Parity (390 x 844)
    // ----------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/reveal/${testToken}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Begum Salma Qureshi', { timeout: 10000 });
    const mobileUnboxBtn = page.locator('button:has-text("Break Wax Seal")');
    assert.equal(await mobileUnboxBtn.isVisible(), true);

    // ----------------------------------------------------
    // TEST 5: M29 Patron Lounge Reorder Authoritative Quote Regressions
    // ----------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });

    const setQuoteMode = async (mode: string) => {
      await page.request.post(`${origin}/api/test-control/quote-mode`, { data: { mode } });
    };
    const updateProductPrice = async (productId: string, weight: string, price: number) => {
      await page.request.post(`${origin}/api/test-control/update-price`, { data: { productId, weight, price } });
    };

    // Go to home and clear cart
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      (window as any).fixture.clearCart();
    });
    await page.waitForFunction(() => (window as any).fixture.cartCount === 0);
    assert.equal(await page.evaluate(() => (window as any).fixture.cartCount), 0);

    // 5.1: QUOTE_REQUIRED
    // quote-required results keep confirmation disabled and count unchanged while clicking the inquiry action opens the custom quote modal
    await setQuoteMode('quote_required');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-patron-lounge')));
    await page.waitForSelector('#patron-title', { timeout: 5000 });
    await page.waitForSelector('button[data-action="start-reorder"]', { timeout: 10000 });
    await page.locator('button[data-action="start-reorder"]').click();

    await page.waitForSelector('[data-quote-notice]', { timeout: 5000 });
    const quoteConfirmBtn = page.locator('button[data-action="confirm-reorder"]');
    assert.equal(await quoteConfirmBtn.isDisabled(), true, 'Confirm button must be disabled for QUOTE_REQUIRED');
    assert.equal(await page.evaluate(() => (window as any).fixture.cartCount), 0, 'Cart count must remain 0 when quote is required');

    // Click personalized inquiry action: closes Patron Lounge and opens CustomQuoteModal
    const inquiryBtn = page.locator('button[data-action="open-personalized-inquiry"]');
    assert.equal(await inquiryBtn.isVisible(), true, 'Inquiry button must be visible in quote notice');
    await inquiryBtn.click();
    await page.waitForTimeout(400);

    // Verify Custom Quote Modal is visible and Patron Lounge is closed
    assert.equal(await page.locator('#custom-quote-modal-title').isVisible(), true, 'Custom quote modal must open');
    assert.equal(await page.locator('#patron-title').isVisible(), false, 'Patron lounge must be closed');
    // Close Custom Quote Modal
    await page.locator('button[aria-label="Close Custom Quote Modal"]').click();
    await page.waitForTimeout(300);

    // 5.2: PRODUCT_UNAVAILABLE and VARIANT_UNAVAILABLE
    // unavailable products/variants keep confirmation disabled and cart count unchanged
    await setQuoteMode('product_unavailable');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-patron-lounge')));
    await page.waitForSelector('#patron-title', { timeout: 5000 });
    await page.locator('button[data-action="start-reorder"]').click();
    await page.waitForSelector('[data-reorder-error], [data-unavailable-warning]', { timeout: 5000 });
    assert.equal(await page.locator('button[data-action="confirm-reorder"]').isDisabled(), true, 'Confirm button disabled on product unavailable');
    assert.equal(await page.evaluate(() => (window as any).fixture.cartCount), 0);

    // Cancel current review
    await page.locator('.reorder-review-panel button:has-text("Cancel")').click();
    await page.waitForTimeout(200);

    await setQuoteMode('variant_unavailable');
    await page.locator('button[data-action="start-reorder"]').click();
    await page.waitForSelector('[data-reorder-error], [data-unavailable-warning]', { timeout: 5000 });
    assert.equal(await page.locator('button[data-action="confirm-reorder"]').isDisabled(), true, 'Confirm button disabled on variant unavailable');
    assert.equal(await page.evaluate(() => (window as any).fixture.cartCount), 0);

    // 5.3: FAILED REQUESTS (Network / Server Error)
    // failed requests keep cart unchanged with actionable error
    await page.locator('.reorder-review-panel button:has-text("Cancel")').click();
    await page.waitForTimeout(200);

    await setQuoteMode('network_error');
    await page.locator('button[data-action="start-reorder"]').click();
    await page.waitForSelector('[data-reorder-error]', { timeout: 5000 });
    const errorText = await page.locator('[data-reorder-error]').innerText();
    assert.ok(errorText.toLowerCase().includes('failed') || errorText.toLowerCase().includes('verification'), 'Actionable error displayed on server error');
    assert.equal(await page.locator('button[data-action="confirm-reorder"]').isDisabled(), true, 'Confirm button disabled on server failure');
    assert.equal(await page.evaluate(() => (window as any).fixture.cartCount), 0);

    // 5.4: STALE CATALOG CONSISTENCY GUARD
    // catalog stale blocks cart addition until consistent review established
    await page.locator('.reorder-review-panel button:has-text("Cancel")').click();
    await page.waitForTimeout(200);

    // Set quoteMode to price_changed (1400) while db catalog remains 1250
    await setQuoteMode('price_changed');
    await page.locator('button[data-action="start-reorder"]').click();
    await page.waitForSelector('[data-renewed-review-notice]', { timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector('[data-reorder-validating]'), { timeout: 5000 });

    // Inconsistent: quote says 1400, catalog in db still says 1250
    // Attempting to confirm must halt and keep cart count at 0
    await page.locator('button[data-action="confirm-reorder"]').click();
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => (window as any).fixture.cartCount), 0, 'Cart count must remain 0 when catalog is stale');
    assert.equal(await page.locator('[data-reorder-error]').isVisible(), true, 'Stale catalog error must be displayed');

    // 5.5: CHANGED PRICES DISPLAY RENEWED REVIEW, THEN COMMIT MATCHING CART PRICE WHEN CATALOG AGREES
    // Now update db catalog to agree with 1400
    await updateProductPrice('pista', '250g', 1400);
    await page.locator('.reorder-review-panel button:has-text("Cancel")').click();
    await page.waitForTimeout(200);

    await page.locator('button[data-action="start-reorder"]').click();
    await page.waitForSelector('[data-renewed-review-notice]', { timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector('[data-reorder-validating]'), { timeout: 5000 });
    const changedConfirmBtn = page.locator('button[data-action="confirm-reorder"]');
    assert.equal(await changedConfirmBtn.isDisabled(), false, 'Confirm button enabled when catalog agrees with price change');
    await changedConfirmBtn.click();
    await page.waitForFunction(() => (window as any).fixture.cartCount === 2);
    await page.waitForTimeout(300);

    const cartCountAfterPriceChange = await page.evaluate(() => (window as any).fixture.cartCount);
    assert.equal(cartCountAfterPriceChange, 2, '2 units added to bag');
    const cartItems = await page.evaluate(() => (window as any).fixture.cartItems);
    assert.equal(cartItems[0].price, 1400, 'Cart item must have renewed price 1400');
    // Clear cart and reset db price
    await page.evaluate(() => (window as any).fixture.clearCart());
    await page.waitForFunction(() => (window as any).fixture.cartCount === 0);
    await updateProductPrice('pista', '250g', 1250);

    // 5.6: SUCCESSFUL UNCHANGED QUOTE COMMITS EXACT PRODUCT, VARIANT, QUANTITY, UNIT PRICE
    await setQuoteMode('success');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-patron-lounge')));
    await page.waitForSelector('#patron-title', { timeout: 5000 });
    await page.locator('button[data-action="start-reorder"]').click();
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[data-action="confirm-reorder"]') as HTMLButtonElement | null;
      return btn !== null && btn.disabled === false;
    }, { timeout: 10000 });
    const successConfirmBtn = page.locator('button[data-action="confirm-reorder"]');
    assert.equal(await successConfirmBtn.isDisabled(), false, 'Confirm button enabled for valid quote');
    await successConfirmBtn.click();
    await page.waitForFunction(() => (window as any).fixture.cartCount === 2);
    await page.waitForTimeout(300);

    const normalCartItems = await page.evaluate(() => (window as any).fixture.cartItems);
    assert.equal(normalCartItems.length, 1);
    assert.equal(normalCartItems[0].productId, 'pista');
    assert.equal(normalCartItems[0].selectedWeight, '250g');
    assert.equal(normalCartItems[0].quantity, 2);
    assert.equal(normalCartItems[0].price, 1250);
    await page.evaluate(() => (window as any).fixture.clearCart());
    await page.waitForFunction(() => (window as any).fixture.cartCount === 0);

    // 5.7: CANCELLED IN-FLIGHT DELAYED REQUEST CANNOT REVIVE OR OVERWRITE CURRENT REVIEW
    await setQuoteMode('delayed');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-patron-lounge')));
    await page.waitForSelector('#patron-title', { timeout: 5000 });
    await page.locator('button[data-action="start-reorder"]').click();
    await page.waitForSelector('[data-reorder-validating]', { timeout: 5000 });

    // Cancel while request is in flight
    await page.locator('.reorder-review-panel button:has-text("Cancel")').click();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.reorder-review-panel').isVisible(), false, 'Review panel must be closed after cancel');

    // Wait 2400ms (delayed server takes 2000ms)
    await page.waitForTimeout(2400);
    assert.equal(await page.locator('.reorder-review-panel').isVisible(), false, 'Late response must NOT revive review panel');
    assert.equal(await page.evaluate(() => (window as any).fixture.cartCount), 0, 'Cart must remain empty');

    await context.close();
  } finally {
    await browser.close();
    server.close();
    await fs.rm(temporary, { recursive: true, force: true }).catch(() => {});
  }
});
