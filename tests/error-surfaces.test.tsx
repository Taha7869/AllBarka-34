import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { once } from 'node:events';
import express from 'express';
import { build } from 'esbuild';
import { launchTestBrowser } from './helpers/browser.mjs';
import { ErrorBoundary, ErrorBoundaryFallback } from '../src/components/ErrorBoundary';
import NotFoundPage from '../src/pages/NotFoundPage';
import { LanguageProvider } from '../src/contexts/LanguageContext';

// ============================================================================
// PART 1: FAST SSR UNIT CHECKS (Initial Markup & Context Isolation)
// ============================================================================

test('SSR: ErrorBoundary renders children normally when no error occurs', () => {
  const html = renderToString(
    <LanguageProvider>
      <ErrorBoundary>
        <div data-testid="healthy-content">Healthy Boutique Content</div>
      </ErrorBoundary>
    </LanguageProvider>
  );

  assert.ok(html.includes('Healthy Boutique Content'));
  assert.ok(!html.includes('role="alert"'));
});

test('SSR: ErrorBoundaryFallback renders localized Urdu and Arabic with RTL direction', () => {
  // Urdu RTL
  const urduHtml = renderToString(
    <LanguageProvider initialLanguage="ur">
      <ErrorBoundaryFallback onReset={() => {}} />
    </LanguageProvider>
  );
  assert.ok(urduHtml.includes('dir="rtl"'));
  assert.ok(urduHtml.includes('آلبرکہ بوتیک نگہداشت'));
  assert.ok(urduHtml.includes('عارضی رکاوٹ'));
  assert.ok(urduHtml.includes('صفحہ ریفریش کریں'));
  assert.ok(urduHtml.includes('مرکزی صفحہ'));

  // Arabic RTL
  const arabicHtml = renderToString(
    <LanguageProvider initialLanguage="ar">
      <ErrorBoundaryFallback onReset={() => {}} />
    </LanguageProvider>
  );
  assert.ok(arabicHtml.includes('dir="rtl"'));
  assert.ok(arabicHtml.includes('عناية متجر البركة'));
  assert.ok(arabicHtml.includes('انقطاع مؤقت'));
  assert.ok(arabicHtml.includes('تحديث المتجر'));
  assert.ok(arabicHtml.includes('العودة للرئيسية'));
});

test('SSR: ErrorBoundaryFallback has safe fallback behavior outside LanguageProvider', () => {
  // Render without wrapping in LanguageProvider - must not throw and must use safe defaults
  const html = renderToString(<ErrorBoundaryFallback onReset={() => {}} />);

  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes('dir="ltr"'));
  assert.ok(html.includes('AllBarka Boutique Care'));
  assert.ok(html.includes('A Momentary Interruption'));
});

test('SSR: NotFoundPage renders branded 404 with navigation links in EN, UR, and AR', () => {
  // English
  const enHtml = renderToString(
    <MemoryRouter>
      <LanguageProvider initialLanguage="en">
        <NotFoundPage />
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.ok(enHtml.includes('Harvest Path Not Found'));
  assert.ok(enHtml.includes('404'));
  assert.ok(enHtml.includes('Page Not Found'));
  assert.ok(enHtml.includes('href="/shop"'));
  assert.ok(enHtml.includes('href="/"'));
  assert.ok(enHtml.includes('focus-ring'));

  // Urdu
  const urHtml = renderToString(
    <MemoryRouter>
      <LanguageProvider initialLanguage="ur">
        <NotFoundPage />
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.ok(urHtml.includes('dir="rtl"'));
  assert.ok(urHtml.includes('صفحہ دستیاب نہیں ہے'));
  assert.ok(urHtml.includes('آپ کا مطلوبہ صفحہ یا کلیکشن دستیاب نہیں ہے۔'));

  // Arabic
  const arHtml = renderToString(
    <MemoryRouter>
      <LanguageProvider initialLanguage="ar">
        <NotFoundPage />
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.ok(arHtml.includes('dir="rtl"'));
  assert.ok(arHtml.includes('الصفحة غير موجودة'));
  assert.ok(arHtml.includes('الصفحة أو التشكيلة التي تبحث عنها لم تعد متوفرة حالياً.'));
});

// ============================================================================
// PART 2: REAL BROWSER INTEGRATION (Controlled Crash, Recovery, & Navigation)
// ============================================================================

test('Browser: Real ErrorBoundary catches child failure, recovers via onReset, custom fallback, and 404 navigation across viewports/RTL/zoom', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-error-surfaces-'));
  const evidenceDir = path.resolve('docs/evidence/error-surfaces');
  await fs.mkdir(evidenceDir, { recursive: true });

  const clientSource = `
    import React, { useState, useEffect } from 'react';
    import { createRoot } from 'react-dom/client';
    import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
    import { ErrorBoundary } from './src/components/ErrorBoundary';
    import NotFoundPage from './src/pages/NotFoundPage';
    import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';

    function CrashingChild({ shouldCrash }) {
      if (shouldCrash) {
        throw new Error('Controlled child explosion for boundary verification');
      }
      return (
        <div id="healthy-content" tabIndex={0} className="p-8 bg-[#043327]/10 dark:bg-[#043327]/30 border border-[#D4AF37]/30 rounded-2xl text-center">
          <h3 className="font-serif text-xl font-bold text-[#120F17] dark:text-[#FAF9F5] mb-2">Boutique Service Active</h3>
          <p className="text-sm text-[#4A4540] dark:text-[#C5BFB5]">All systems operating with luxury precision.</p>
        </div>
      );
    }

    function ErrorTestHarness() {
      const [shouldCrash, setShouldCrash] = useState(false);
      const [useCustomFallback, setUseCustomFallback] = useState(false);
      const [resetCallCount, setResetCallCount] = useState(0);
      const [boundaryKey, setBoundaryKey] = useState(0);
      const { setLanguage } = useLanguage();

      useEffect(() => {
        window.__harness = {
          crash: () => setShouldCrash(true),
          recover: () => {
            setShouldCrash(false);
            setBoundaryKey(k => k + 1);
          },
          setCustomFallback: (val) => setUseCustomFallback(val),
          setLanguage: (lang) => setLanguage(lang),
          getResetCount: () => resetCallCount,
        };
      }, [resetCallCount, setLanguage]);

      return (
        <div className="p-4 sm:p-8 max-w-xl mx-auto">
          <ErrorBoundary
            key={boundaryKey}
            fallback={useCustomFallback ? <div id="custom-fallback-view" className="p-8 border-2 border-[#D4AF37] rounded-3xl bg-[#FAF9F5] dark:bg-[#120F17] text-center font-serif text-lg">Custom Boutique Exception View</div> : undefined}
            onReset={() => {
              setShouldCrash(false);
              setResetCallCount(c => c + 1);
            }}
          >
            <CrashingChild shouldCrash={shouldCrash} />
          </ErrorBoundary>
        </div>
      );
    }

    function LanguageExposer() {
      const { setLanguage } = useLanguage();
      useEffect(() => {
        window.__setLanguage = setLanguage;
      }, [setLanguage]);
      return null;
    }

    function App() {
      return (
        <LanguageProvider>
          <LanguageExposer />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<div id="home-view" className="p-8 text-center"><h1 className="font-serif text-2xl mb-4">AllBarka Home Table</h1><Link to="/shop" id="link-to-shop" className="underline text-emerald-800">Shop Catalog</Link></div>} />
              <Route path="/shop" element={<div id="shop-view" className="p-8 text-center"><h1 className="font-serif text-2xl mb-4">AllBarka Reserve Catalog</h1><Link to="/" id="link-to-home" className="underline text-emerald-800">Return Home</Link></div>} />
              <Route path="/error-test" element={<ErrorTestHarness />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </LanguageProvider>
      );
    }

    createRoot(document.getElementById('root')).render(<App />);
  `;

  await build({
    stdin: {
      contents: clientSource,
      loader: 'tsx',
      resolveDir: process.cwd(),
      sourcefile: 'error-surface-fixture.tsx',
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: path.join(temporary, 'fixture.js'),
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
  });

  const app = express();
  app.use('/assets', express.static(path.resolve('dist/assets')));
  app.get('/fixture.js', (_req, res) => res.sendFile(path.join(temporary, 'fixture.js')));

  const distFiles = await fs.readdir('dist/assets');
  const cssLinks = distFiles
    .filter(x => x.endsWith('.css'))
    .map(x => `<link rel="stylesheet" href="/assets/${x}">`)
    .join('');

  app.get(/.*/, (_req, res) =>
    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AllBarka Error Surfaces Fixture</title>
  ${cssLinks}
</head>
<body class="bg-[#FAF9F5] text-[#120F17] min-h-screen">
  <div id="root"></div>
  <script src="/fixture.js"></script>
</body>
</html>`)
  );

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

    // Catch any unexpected uncaught exceptions outside the boundary
    const uncaughtErrors: string[] = [];
    page.on('pageerror', e => {
      // React reports caught boundary errors in development, but in production bundles they are handled
      uncaughtErrors.push(e.message);
    });

    // ------------------------------------------------------------------------
    // Step 1: Healthy child renders initially
    // ------------------------------------------------------------------------
    await page.goto(`${origin}/error-test`);
    await page.locator('#healthy-content').waitFor();
    assert.equal(await page.locator('[role="alert"]').count(), 0);

    // ------------------------------------------------------------------------
    // Step 2: Trigger controlled error inside the REAL ErrorBoundary
    // ------------------------------------------------------------------------
    await page.evaluate(() => (window as any).__harness.crash());
    const alert = page.locator('[role="alert"]');
    await alert.waitFor();

    // Verify accessibility & honest boutique copy
    assert.equal(await alert.getAttribute('aria-live'), 'assertive');
    const alertText = await alert.innerText();
    assert.ok(alertText.includes('AllBarka Boutique Care') || alertText.includes('A Momentary Interruption'));
    assert.ok(
      !alertText.includes('remain secure'),
      'Must avoid unsupported assurance that stored selections remain secure'
    );

    // ------------------------------------------------------------------------
    // Step 3: Verify recovery via onReset
    // ------------------------------------------------------------------------
    const refreshBtn = alert.getByRole('button', { name: /Refresh Boutique|ریفریش|تحديث/i });
    await refreshBtn.click();

    // Healthy child should be restored
    await page.locator('#healthy-content').waitFor();
    assert.equal(await page.locator('[role="alert"]').count(), 0);
    const resetCount = await page.evaluate(() => (window as any).__harness.getResetCount());
    assert.equal(resetCount, 1, 'onReset handler must be invoked');

    // ------------------------------------------------------------------------
    // Step 4: Verify custom fallback prop when supplied
    // ------------------------------------------------------------------------
    await page.evaluate(() => {
      (window as any).__harness.setCustomFallback(true);
      (window as any).__harness.crash();
    });
    await page.locator('#custom-fallback-view').waitFor();
    assert.ok((await page.locator('#custom-fallback-view').innerText()).includes('Custom Boutique Exception View'));
    assert.equal(await page.locator('[role="alert"]').count(), 0);

    // Revert custom fallback and recover
    await page.evaluate(() => {
      (window as any).__harness.setCustomFallback(false);
      (window as any).__harness.recover();
    });
    await page.locator('#healthy-content').waitFor();

    // ------------------------------------------------------------------------
    // Step 5: Default Navigation on Error Surface (Return to Table -> /)
    // ------------------------------------------------------------------------
    await page.evaluate(() => (window as any).__harness.crash());
    await page.locator('[role="alert"]').waitFor();
    const returnLink = page.locator('[role="alert"] a[href="/"]');
    await returnLink.click();
    await page.locator('#home-view').waitFor();
    assert.equal(page.url(), `${origin}/`);

    // ------------------------------------------------------------------------
    // Step 6: 404 Surface & Navigation
    // ------------------------------------------------------------------------
    await page.goto(`${origin}/nonexistent-harvest-lot-12345`);
    const notFoundHeading = page.getByRole('heading', { level: 1 });
    await notFoundHeading.waitFor();
    assert.ok((await notFoundHeading.innerText()).includes('Harvest Path Not Found'));

    // Test navigation: Explore Shop -> /shop
    const shopLink = page.locator('a[href="/shop"]');
    await shopLink.click();
    await page.locator('#shop-view').waitFor();
    assert.equal(page.url(), `${origin}/shop`);

    // Test navigation: Return Home -> /
    await page.goto(`${origin}/another-broken-url`);
    const homeLink = page.locator('a[href="/"]').last();
    await homeLink.click();
    await page.locator('#home-view').waitFor();
    assert.equal(page.url(), `${origin}/`);

    // ------------------------------------------------------------------------
    // Step 7: Parity matrix across Viewports, Languages, RTL, Themes, & 200% Zoom
    // ------------------------------------------------------------------------
    const viewports = [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'desktop', width: 1440, height: 900 },
    ];
    const languages = ['en', 'ur', 'ar'] as const;
    const themes = [false, true]; // false = light, true = dark

    // Matrix check on both Error and 404 surfaces
    for (const surface of ['error', '404'] as const) {
      if (surface === 'error') {
        await page.goto(`${origin}/error-test`);
        await page.evaluate(() => (window as any).__harness.crash());
        await page.locator('[role="alert"]').waitFor();
      } else {
        await page.goto(`${origin}/missing-page-audit`);
        await page.getByRole('heading', { level: 1 }).waitFor();
      }

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        for (const lang of languages) {
          for (const dark of themes) {
            await page.waitForFunction(() => typeof (window as any).__setLanguage === 'function');
            await page.evaluate(
              ({ lang, dark }) => {
                (window as any).__setLanguage(lang);
                document.documentElement.classList.toggle('dark', dark);
              },
              { lang, dark }
            );

            // Await the committed language and the specific surface, not elapsed time.
            const expectedDir = lang === 'en' ? 'ltr' : 'rtl';
            const selector = surface === 'error' ? '[role="alert"]' : '[data-error-surface="not-found"]';
            await page.waitForFunction(({ selector, lang, dir }) => document.documentElement.lang === lang && document.querySelector(selector)?.getAttribute('dir') === dir, { selector, lang, dir: expectedDir });
            const surfaceContainer = page.locator(selector);
            assert.equal(await surfaceContainer.getAttribute('dir'), expectedDir);

            // 2. Verify zero horizontal overflow at standard zoom
            const hasNoHorizontalOverflow = await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth
            );
            assert.ok(
              hasNoHorizontalOverflow,
              `Horizontal overflow detected on ${surface} (${vp.name}, ${lang}, ${dark ? 'dark' : 'light'})`
            );

            // 3. Verify 200% text zoom compliance
            await page.evaluate(() => {
              document.documentElement.style.fontSize = '200%';
            });
            await page.waitForTimeout(30);

            const hasNoZoomOverflow = await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth + 2
            );
            assert.ok(
              hasNoZoomOverflow,
              `Horizontal overflow at 200% text zoom on ${surface} (${vp.name}, ${lang})`
            );

            // Revert zoom
            await page.evaluate(() => {
              document.documentElement.style.fontSize = '';
            });

            // 4. Keyboard Navigation: Tab to interactive controls and verify focus
            const firstInteractive = surface === 'error'
              ? page.locator('[role="alert"]').locator('button, a').first()
              : page.locator('a[href]').first();
            await firstInteractive.focus();
            const focusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
            assert.ok(
              ['button', 'a'].includes(focusedTag || ''),
              `Keyboard focus must land on interactive element, received ${focusedTag}`
            );
            await page.keyboard.press('Tab');
            const nextTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
            assert.ok(
              ['button', 'a', 'body'].includes(nextTag || ''),
              `Keyboard tab must navigate cleanly, received ${nextTag}`
            );

            // 5. Capture illustrative visual evidence for representative configurations
            if (
              (vp.name === 'mobile' && lang === 'ur' && dark) ||
              (vp.name === 'desktop' && lang === 'en' && !dark) ||
              (vp.name === 'desktop' && lang === 'ar' && dark)
            ) {
              const shotPath = path.join(
                evidenceDir,
                `${surface}-${vp.name}-${lang}-${dark ? 'dark' : 'light'}.png`
              );
              await page.screenshot({ path: shotPath });
            }
          }
        }
      }
    }

    await context.close();
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
