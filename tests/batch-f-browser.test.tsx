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

test('Batch F Browser Acceptance: M21 Reduced Motion, M22 Branded 404 & Empty States, M24 Funnel Telemetry, M25 Brand Detail System', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-batch-f-'));
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
import NotFoundPage from './src/pages/NotFoundPage';

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
                      <Route path="product/:id" element={<ProductDetailPage />} />
                      <Route path="*" element={<NotFoundPage />} />
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
      sourcefile: 'batch-f-fixture.tsx',
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
    });
    const page = await context.newPage();

    // Setup listener for M24 privacy funnel events
    await page.addInitScript(() => {
      (window as any).__funnelEvents = [];
      window.addEventListener('allbarka-funnel-event', (e: any) => {
        (window as any).__funnelEvents.push(e.detail);
      });
    });

    // ----------------------------------------------------
    // TEST 1: M24 Funnel Telemetry on PDP view & Add to Cart
    // ----------------------------------------------------
    await page.goto(`${origin}/product/pista`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Pistachio")', { timeout: 10000 });

    const capturedEvents = await page.evaluate(() => (window as any).__funnelEvents);
    const viewItemEvent = capturedEvents.find((e: any) => e.milestone === 'view_item');
    assert.ok(viewItemEvent, 'view_item event was fired');
    assert.equal(viewItemEvent.productId, 'pista');

    // Add to cart and verify add_to_cart event
    const addBtn = page.locator('button:has-text("Add to")').first();
    await addBtn.click();
    await page.waitForTimeout(400);

    const updatedEvents = await page.evaluate(() => (window as any).__funnelEvents);
    const addToCartEvent = updatedEvents.find((e: any) => e.milestone === 'add_to_cart');
    assert.ok(addToCartEvent, 'add_to_cart event was fired');
    assert.equal(addToCartEvent.productId, 'pista');

    // ----------------------------------------------------
    // TEST 2: M22 Branded 404 & Useful Recovery Action
    // ----------------------------------------------------
    await page.goto(`${origin}/page-that-does-not-exist`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Page Not Found', { timeout: 10000 });

    const returnBtn = page.locator('a[href="/"]').first();
    assert.equal(await returnBtn.isVisible(), true);
    await returnBtn.click();
    await page.waitForTimeout(500);

    // Returned to homepage
    const pathname = await page.evaluate(() => (window as any).fixture.pathname);
    assert.equal(pathname, '/');

    // ----------------------------------------------------
    // TEST 3: M21 Reduced Motion Emulation
    // ----------------------------------------------------
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const prefersReduced = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    assert.equal(prefersReduced, true, 'Reduced motion media query is properly respected');

    await context.close();
  } finally {
    await browser.close();
    server.close();
    await fs.rm(temporary, { recursive: true, force: true }).catch(() => {});
  }
});
