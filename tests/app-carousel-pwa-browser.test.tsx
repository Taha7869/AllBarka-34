import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { once } from 'node:events';
import { build } from 'esbuild';
import { launchTestBrowser } from './helpers/browser.mjs';
import { collectBrowserDiagnostics, useLocalFixtureFonts } from './helpers/browser-diagnostics.mjs';
import { IOS_A2HS_DISMISSED_KEY } from '../src/lib/pwa';
import { RECENT_KEY } from '../src/lib/catalogActivity';

test('App & Carousel Browser Acceptance: touch/hover pause + auto-resume, reduced-motion off, standalone tab bar clearance, iOS Safari one-time guide, and offline previously-viewed products', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-app-carousel-'));

  const entry = `import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { CartProvider } from './src/contexts/CartContext';
import { CatalogProvider } from './src/contexts/CatalogContext';
import { useCarouselAutoSlide } from './src/hooks/useCarouselAutoSlide';
import StandaloneTabBar from './src/components/StandaloneTabBar';
import PwaInstallBanner from './src/components/PwaInstallBanner';
import OfflinePage from './src/pages/OfflinePage';

function AutoSlideProbe() {
  const ref = useRef<HTMLDivElement>(null);
  const { isRunning, interacting, hovered, containerProps } = useCarouselAutoSlide({
    observeRef: ref,
    itemCount: 5,
    resumeDelayMs: 350,
  });
  return (
    <div
      ref={ref}
      data-probe-carousel
      data-running={String(isRunning)}
      data-interacting={String(interacting)}
      data-hovered={String(hovered)}
      style={{ width: '320px', height: '120px', border: '1px solid #C7982F', padding: '12px' }}
      {...containerProps}
    >
      <button type="button" data-probe-slide>Slide 1</button>
    </div>
  );
}

function Harness() {
  const { setLanguage } = useLanguage();
  const params = new URLSearchParams(window.location.search);
  const forceStandalone = params.get('standalone') === '1';
  const forceIos = params.get('ios') === '1';

  return (
    <div style={{ minHeight: '120vh', paddingBottom: '120px' }}>
      <header style={{ display: 'flex', gap: '8px', padding: '8px' }}>
        <button type="button" data-lang="en" onClick={() => setLanguage('en')}>EN</button>
        <button type="button" data-lang="ur" onClick={() => setLanguage('ur')}>UR</button>
        <Link to="/offline" data-go-offline>Offline</Link>
      </header>
      <Routes>
        <Route path="/" element={<AutoSlideProbe />} />
        <Route path="/offline" element={<OfflinePage />} />
      </Routes>
      {/* Simulated AIConcierge button using exact hasCartBar lift when standalone tab bar is active */}
      <button
        type="button"
        data-mock-chat
        style={{
          position: 'fixed',
          right: '16px',
          bottom: forceStandalone ? '96px' : '20px',
          width: '56px',
          height: '56px',
          zIndex: 30,
        }}
      >
        Chat
      </button>
      <StandaloneTabBar forceStandalone={forceStandalone} onOpenAccount={() => undefined} />
      <PwaInstallBanner forceIosSafari={forceIos} hidden={forceStandalone} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <LanguageProvider>
      <CurrencyProvider>
        <CatalogProvider>
          <CartProvider>
            <BrowserRouter>
              <Harness />
            </BrowserRouter>
          </CartProvider>
        </CatalogProvider>
      </CurrencyProvider>
    </LanguageProvider>
  </ThemeProvider>
);
`;

  await build({
    stdin: {
      contents: entry,
      loader: 'tsx',
      resolveDir: process.cwd(),
      sourcefile: 'app-carousel-fixture.tsx',
    },
    outfile: path.join(temporary, 'bundle.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  });

  const app = express();
  app.use('/assets', express.static(temporary));
  app.get(/.*/, (_req, res) => {
    res.type('html').send(`<!doctype html><html lang="en"><head>
      <meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        *{box-sizing:border-box}
        .fixed{position:fixed}.inset-x-0{left:0;right:0}.inset-x-3{left:12px;right:12px}.bottom-0{bottom:0}
        .bottom-\\[calc\\(5\\.25rem\\+env\\(safe-area-inset-bottom\\)\\)\\]{bottom:84px}
        .flex{display:flex}.flex-1{flex:1 1 0%}.flex-col{flex-direction:column}
        .items-center{align-items:center}.justify-center{justify-content:center}.justify-around{justify-content:space-around}
        .min-h-\\[48px\\]{min-height:48px}.min-h-\\[44px\\]{min-height:44px}.z-35{z-index:35}.z-40{z-index:40}
      </style>
    </head><body><div id="root"></div><script type="module" src="/assets/bundle.js"></script></body></html>`);
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;

  const browser = await launchTestBrowser();
  try {
    // 1. Standard motion mobile touch context: touch tap pauses carousel and automatically resumes after delay;
    //    mouse hover pauses and mouse leave resumes cleanly
    const ctx1 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'no-preference' });
    const page1 = await ctx1.newPage();
    await useLocalFixtureFonts(page1);
    const diag1 = collectBrowserDiagnostics(page1, baseUrl);
    await page1.goto(`${baseUrl}/?ios=1`, { waitUntil: 'networkidle' });

    const probe = page1.locator('[data-probe-carousel]');
    await probe.waitFor({ state: 'visible' });
    assert.equal(await probe.getAttribute('data-running'), 'true');

    // Mobile touch tap inside carousel -> pauses immediately, then auto-resumes after resumeDelayMs (350ms in harness)
    await page1.tap('[data-probe-slide]');
    assert.equal(await probe.getAttribute('data-running'), 'false');
    await page1.waitForFunction(
      () => document.querySelector('[data-probe-carousel]')?.getAttribute('data-running') === 'true',
      undefined,
      { timeout: 3000 }
    );

    // Mouse hover pauses, moving mouse away resumes
    await probe.hover();
    assert.equal(await probe.getAttribute('data-running'), 'false');
    await page1.mouse.move(1, 1);
    await page1.waitForFunction(
      () => document.querySelector('[data-probe-carousel]')?.getAttribute('data-running') === 'true',
      undefined,
      { timeout: 3000 }
    );

    // iOS Safari one-time guide visible on first load, dismissed once and never shown again after reload
    const iosBanner = page1.locator('[data-ios-a2hs-banner]');
    await iosBanner.waitFor({ state: 'visible' });
    await page1.click('[data-ios-a2hs-dismiss]');
    assert.equal(await iosBanner.count(), 0);
    assert.equal(await page1.evaluate((k) => localStorage.getItem(k), IOS_A2HS_DISMISSED_KEY), '1');
    await page1.reload({ waitUntil: 'networkidle' });
    assert.equal(await iosBanner.count(), 0);

    // Offline page shows previously viewed products in EN and Urdu RTL
    await page1.evaluate((k) => localStorage.setItem(k, JSON.stringify(['pista', 'badam'])), RECENT_KEY);
    await page1.click('[data-go-offline]');
    await page1.locator('[data-offline-page]').waitFor({ state: 'visible' });
    assert.equal(await page1.locator('[data-offline-product="pista"]').isVisible(), true);
    assert.equal(await page1.locator('[data-offline-product="badam"]').isVisible(), true);
    await page1.click('[data-lang="ur"]');
    assert.equal(await page1.locator('[data-offline-page]').getAttribute('dir'), 'rtl');

    assert.equal(diag1.length, 0, diag1.join('\n'));
    await ctx1.close();

    // 2. Reduced motion disables auto-slide completely + Standalone tab bar clears AI chat button cleanly
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page2 = await ctx2.newPage();
    await useLocalFixtureFonts(page2);
    const diag2 = collectBrowserDiagnostics(page2, baseUrl);
    await page2.goto(`${baseUrl}/?standalone=1`, { waitUntil: 'networkidle' });

    const probeReduced = page2.locator('[data-probe-carousel]');
    await probeReduced.waitFor({ state: 'visible' });
    assert.equal(await probeReduced.getAttribute('data-running'), 'false');

    const tabBar = page2.locator('[data-standalone-tab-bar]');
    await tabBar.waitFor({ state: 'visible' });
    const [tabBox, chatBox] = await Promise.all([
      tabBar.boundingBox(),
      page2.locator('[data-mock-chat]').boundingBox(),
    ]);
    assert.ok(tabBox && chatBox);
    assert.ok(chatBox.y + chatBox.height <= tabBox.y + 1, `Chat button bottom (${chatBox.y + chatBox.height}) must clear standalone tab bar top (${tabBox.y})`);

    assert.equal(diag2.length, 0, diag2.join('\n'));
    await ctx2.close();
  } finally {
    await browser.close();
    server.close();
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
