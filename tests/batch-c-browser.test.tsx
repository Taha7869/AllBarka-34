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

test('Batch C Browser Acceptance: M12 Mehmaan Table Planner, M13 & M30 Occasion Planning Kit, RTL, Dark Mode, and Mobile Parity', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-batch-c-'));
  const { db } = memoryFirestore(Object.fromEntries(PRODUCTS.map(product => [`products/${product.id}`, product])));

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
import { PRODUCTS } from './src/data/products';

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

createRoot(document.getElementById('root')!).render(
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
                      <Route path="shop" element={<ShopPage />} />
                      <Route path="shop/:category" element={<ShopPage />} />
                      <Route path="product/:id" element={<ProductDetailPage />} />
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
      sourcefile: 'batch-c-fixture.tsx',
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
  app.get('/api/product-media', (_req, res) => res.json({ overrides: {} }));

  // Inquiries capture for verification
  const receivedInquiries: any[] = [];
  app.post('/api/inquiries', (req, res) => {
    receivedInquiries.push(req.body);
    res.json({ ok: true, reference: 'INQ-TEST-BATCH-C', status: 'RECEIVED' });
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
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
    });

    // ─────────────────────────────────────────────────────────────
    // 1. M12: Mehmaan Table Planner Acceptance
    // ─────────────────────────────────────────────────────────────
    await page.goto(`${origin}/`);
    const mehmaanTrigger = page.locator('.heritage-hero-mehmaan');
    await mehmaanTrigger.waitFor();
    await mehmaanTrigger.click();

    // Verify modal is open
    const mehmaanModal = page.locator('dialog.mehmaan-planner-modal');
    await mehmaanModal.waitFor();
    assert.ok(await mehmaanModal.isVisible(), 'Mehmaan table planner modal must be open');

    // Change guest count to 20
    const guest20Btn = mehmaanModal.locator('button:has-text("20 guests"), button:has-text("20")').first();
    await guest20Btn.click();
    await page.waitForTimeout(300);

    // Switch setting to Iftar
    const iftarBtn = mehmaanModal.locator('button:has-text("Ramzan Iftar"), button:has-text("Iftar")').first();
    if (await iftarBtn.isVisible()) {
      await iftarBtn.click();
      await page.waitForTimeout(300);
    }

    // Verify recommendations list
    const items = mehmaanModal.locator('section h4');
    assert.ok(await items.count() >= 2, 'Must recommend at least nuts and dates/fruits');

    // Click "Add All Selections to Bag"
    const addAllBtn = mehmaanModal.locator('button:has-text("Add All Selections to Bag")');
    await addAllBtn.click();
    await page.waitForTimeout(500);

    // Verify cart count increased
    const cartCount = await page.evaluate(() => (window as any).fixture.cartCount);
    assert.ok(cartCount >= 2, 'Adding all table selections to bag must increase cart count');

    // Close Mehmaan modal via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    assert.ok(!(await mehmaanModal.isVisible()), 'Modal must close on Escape key');

    // ─────────────────────────────────────────────────────────────
    // 2. M13 & M30: Occasion & Event Planning Kit Acceptance
    // ─────────────────────────────────────────────────────────────
    await page.goto(`${origin}/shop?filter=occasions`);
    const eventTrigger = page.locator('button:has-text("Plan Event & Favors")').first();
    await eventTrigger.waitFor();
    await eventTrigger.click();

    // Verify occasion modal is open
    const occasionModal = page.locator('dialog.occasion-inquiry-modal');
    await occasionModal.waitFor();
    assert.ok(await occasionModal.isVisible(), 'Occasion inquiry modal must be open');

    // Select Event Type: Corporate
    const corporateBtn = occasionModal.locator('button:has-text("Corporate & Executive")').first();
    if (await corporateBtn.isVisible()) {
      await corporateBtn.click();
    }

    // Select City: Karachi
    const citySelect = occasionModal.locator('#occasion-city');
    await citySelect.selectOption('karachi');

    // Enter Date: 14 days in future
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateInput = occasionModal.locator('#occasion-date');
    await dateInput.fill(futureDate);

    // Select Quantity: 100
    const qty100Btn = occasionModal.locator('button:has-text("100")').first();
    if (await qty100Btn.isVisible()) {
      await qty100Btn.click();
    }

    // Fill Client Info
    await occasionModal.locator('#occasion-name').fill('Fawad Chaudhry');
    await occasionModal.locator('#occasion-phone').fill('03009876543');
    await occasionModal.locator('#occasion-notes').fill('Emerald ribbons and gold typography for executive retreat.');

    // Submit inquiry
    const submitBtn = occasionModal.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(800);

    // Verify backend received the inquiry
    assert.ok(receivedInquiries.length >= 1, 'Inquiry must be dispatched to /api/inquiries');
    assert.equal(receivedInquiries[0].recipientName, 'Fawad Chaudhry');
    assert.equal(receivedInquiries[0].city, 'karachi');

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // ─────────────────────────────────────────────────────────────
    // 3. RTL & Urdu Parity
    // ─────────────────────────────────────────────────────────────
    await page.evaluate(() => (window as any).fixture.setLanguage('ur'));
    await page.waitForTimeout(400);

    // Open Mehmaan modal in Urdu
    await page.goto(`${origin}/`);
    await page.locator('.heritage-hero-mehmaan').click();
    await mehmaanModal.waitFor();

    const mehmaanDir = await mehmaanModal.getAttribute('dir');
    assert.equal(mehmaanDir, 'rtl', 'Mehmaan modal must render dir="rtl" in Urdu');

    // Verify Urdu title
    const mehmaanTitle = await mehmaanModal.locator('h2').innerText();
    assert.ok(mehmaanTitle.includes('دسترخوان'), 'Must render Urdu title for Mehmaan planner');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // ─────────────────────────────────────────────────────────────
    // 4. Mobile Viewport Parity (390 x 844)
    // ─────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.heritage-hero-mehmaan').click();
    await mehmaanModal.waitFor();
    assert.ok(await mehmaanModal.isVisible(), 'Mehmaan modal must display cleanly on mobile viewport');

    // Check no horizontal scroll overflow on dialog container
    const isOverflowing = await page.evaluate(() => {
      const modalBox = document.querySelector('dialog.mehmaan-planner-modal > div');
      return modalBox ? modalBox.scrollWidth > window.innerWidth : false;
    });
    assert.equal(isOverflowing, false, 'Modal box must not exceed mobile viewport width');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    assert.equal(errors.length, 0, `Browser acceptance encountered console errors: ${errors.join('; ')}`);
  } finally {
    await browser.close();
    server.closeAllConnections?.();
    await new Promise(r => server.close(r));
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
