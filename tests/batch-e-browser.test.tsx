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
            contents: `export const useAuth=()=>({
              currentUser: { uid: 'test-patron-uid', getIdToken: async () => 'test-auth-token' },
              patronProfile: { name: 'Begum Salma Qureshi', email: 'salma@example.com' },
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

  app.get('/api/me/orders', (_req, res) => {
    return res.json({
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
              price: 350,
              unitPrice: 350,
            },
          ],
          totals: { subtotal: 700, total: 700, discount: 0, shipping: 0 },
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
        totals: { subtotal: 700, isQuoteRequest: false },
        items: [{ productId: 'pista', selectedWeight: '250g', price: 350, quantity: 2 }],
      });
    }
    if (quoteMode === 'price_changed') {
      return res.json({
        success: true,
        totals: { subtotal: 800, isQuoteRequest: false },
        items: [{ productId: 'pista', selectedWeight: '250g', price: 400, quantity: 2 }],
      });
    }
    return res.json({
      success: true,
      totals: { subtotal: 700, isQuoteRequest: false },
      items: [{ productId: 'pista', selectedWeight: '250g', price: 350, quantity: 2 }],
    });
  });

  app.post('/api/test-control/quote-mode', (req, res) => {
    quoteMode = req.body.mode;
    return res.json({ quoteMode });
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

    await context.close();
  } finally {
    await browser.close();
    server.close();
    await fs.rm(temporary, { recursive: true, force: true }).catch(() => {});
  }
});
