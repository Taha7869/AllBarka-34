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

test('Batch B Browser Acceptance: M10 Taste & Texture Finder, M27 Variety Comparison, M31 Local-language search, RTL, and Responsive display', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-batch-b-'));
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
      sourcefile: 'batch-b-fixture.tsx',
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
      if (m.type() === 'error' && !m.text().includes('404') && !m.text().includes('net::ERR_NO_BUFFER_SPACE') && !m.text().includes('net::ERR_INSUFFICIENT_RESOURCES')) errors.push(m.text());
    });

    // ─────────────────────────────────────────────────────────────
    // 1. M10: "Find Your Taste" Attribute & Texture Finder
    // ─────────────────────────────────────────────────────────────
    await page.goto(`${origin}/`);
    await page.locator('.heritage-hero-guide').waitFor();
    await page.locator('.heritage-hero-guide').click();

    // The selection guide dialog opens
    const guideDialog = page.locator('dialog.selection-guide');
    await guideDialog.waitFor();
    assert.ok(await guideDialog.isVisible(), 'Selection guide dialog must open');

    // Select Taste: Sweet
    const sweetChip = guideDialog.locator('button[data-guide-taste="sweet"]');
    await sweetChip.waitFor();
    await sweetChip.click();

    // Select Texture: Chewy
    const chewyChip = guideDialog.locator('button[data-guide-texture="chewy"]');
    await chewyChip.waitFor();
    await chewyChip.click();

    // Verify recommendations update with matched attribute tags
    const matchTag = guideDialog.locator('[data-match-attr="sweet"]');
    await matchTag.first().waitFor();
    assert.ok(await matchTag.count() > 0, 'Matched attribute tag for sweet must be rendered');

    // Test Add to Cart from the selection guide
    const addBtn = guideDialog.locator('button.selection-guide-add').first();
    await addBtn.click();
    await page.waitForTimeout(400);
    const cartCountAfterGuide = await page.evaluate(() => (window as any).fixture.cartCount);
    assert.ok(cartCountAfterGuide >= 1, 'Adding to cart from selection guide must increase cart items');

    // Close selection guide
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // ─────────────────────────────────────────────────────────────
    // 2. M27: Variety Comparison Table with Verified Facts
    // ─────────────────────────────────────────────────────────────
    await page.goto(`${origin}/product/pista`);
    await page.locator('#pdp-product-details').waitFor();

    // Button to trigger comparison modal
    const compareTrigger = page.locator('button:has-text("Compare with other harvest varieties")');
    await compareTrigger.waitFor();
    await compareTrigger.click();

    // Verify modal dialog appears
    const modal = page.locator('dialog.variety-comparison-modal');
    await modal.waitFor();
    assert.ok(await modal.isVisible(), 'Variety comparison modal must be open');

    // Verify comparison table contents
    const modalTable = modal.locator('table');
    await modalTable.waitFor();

    // Verify attribute rows
    const rows = modalTable.locator('tbody tr');
    assert.ok(await rows.count() >= 7, 'Must display variety, origin, roast, texture, flavor, shelf life, and price rows');

    // Verify peers rendered
    const colHeaders = modalTable.locator('thead th');
    assert.ok(await colHeaders.count() >= 3, 'Must render attribute column plus at least 2 comparable harvest peers');

    // Verify "Add to Bag" inside comparison modal works
    const addToBagButtons = modal.locator('button:has-text("Add to Bag")');
    if (await addToBagButtons.count() > 0) {
      await addToBagButtons.first().click();
      await page.waitForTimeout(400);
      const cartCountAfterModal = await page.evaluate(() => (window as any).fixture.cartCount);
      assert.ok(cartCountAfterModal > cartCountAfterGuide, 'Clicking Add to Bag in comparison modal must add item to cart');
    }

    // Close modal via Esc key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    assert.ok(!(await modal.isVisible()), 'Modal must close on Escape key');

    // ─────────────────────────────────────────────────────────────
    // 3. M31: Local-language Search Aliases in Storefront
    // ─────────────────────────────────────────────────────────────
    await page.goto(`${origin}/shop`);
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('chalgoza');
      await page.waitForTimeout(600);
      const catalogCards = page.locator('.table-catalog-card, article');
      const text = await catalogCards.first().innerText();
      assert.ok(/pine|chilgoza|chalgoza/i.test(text), 'Search for chalgoza alias must surface pine nuts');
    }

    // ─────────────────────────────────────────────────────────────
    // 4. RTL & Dark Mode Parity
    // ─────────────────────────────────────────────────────────────
    // Switch to Urdu
    await page.evaluate(() => (window as any).fixture.setLanguage('ur'));
    await page.waitForTimeout(400);

    const isRtl = await page.evaluate(() => (window as any).fixture.isRtl);
    assert.equal(isRtl, true, 'Urdu must set isRtl to true');

    // Revisit PDP in Urdu and open comparison modal
    await page.goto(`${origin}/product/pista`);
    await page.locator('#pdp-product-details').waitFor();
    const compareTriggerUr = page.locator('#pdp-product-details button').first();
    await compareTriggerUr.click();
    await modal.waitFor();
    const modalDir = await modal.getAttribute('dir');
    assert.equal(modalDir, 'rtl', 'Modal must render dir="rtl" in Urdu');

    // Close modal via close button
    const closeBtn = modal.locator('button[aria-label="Close"], button[aria-label="بند کریں"]');
    await closeBtn.click();
    await page.waitForTimeout(300);

    // Switch to Dark Mode
    await page.evaluate(() => (window as any).fixture.setTheme('dark'));
    await page.waitForTimeout(300);
    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
    assert.ok(hasDarkClass, 'Theme must apply dark class');

    // ─────────────────────────────────────────────────────────────
    // 5. Mobile Viewport Parity (390 x 844)
    // ─────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 390, height: 844 });
    await compareTriggerUr.click();
    await modal.waitFor();
    assert.ok(await modal.isVisible(), 'Modal must open on mobile viewport');

    // Ensure horizontal table scroll container exists
    const scrollContainer = modal.locator('.overflow-x-auto');
    assert.ok(await scrollContainer.isVisible(), 'Comparison table must be horizontally scrollable on mobile');

    // Close modal
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
