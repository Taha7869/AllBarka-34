import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { once } from 'node:events';
import { build } from 'esbuild';
import { launchTestBrowser } from './helpers/browser.mjs';
import { collectBrowserDiagnostics, useLocalFixtureFonts } from './helpers/browser-diagnostics.mjs';
import { memoryFirestore } from './helpers/memoryFirestore';
import { createConsentRouter } from '../src/lib/consentRouter';
import { CONSENT_POLICY_VERSION, CONSENT_STORAGE_KEY } from '../src/lib/consent';

test('Consent Manager Browser Acceptance: banner equal buttons, mobile non-overlap, preference modal, POST /api/consent, ConsentGate, GPC, RTL, Footer reopen, and /policies/cookies', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-consent-browser-'));
  const { db, records } = memoryFirestore({});

  const entry = `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ConsentProvider } from './src/contexts/ConsentContext';
import CookieNotice from './src/components/CookieNotice';
import ConsentGate from './src/components/ConsentGate';
import Footer from './src/components/Footer';
import PoliciesPage from './src/pages/PoliciesPage';

function Harness() {
  const { setLanguage } = useLanguage();
  const [analyticsLoads, setAnalyticsLoads] = useState(0);
  const [marketingLoads, setMarketingLoads] = useState(0);

  return (
    <div style={{ minHeight: '140vh', paddingBottom: '120px' }}>
      <header style={{ padding: '12px', display: 'flex', gap: '8px' }}>
        <button type="button" data-lang="en" onClick={() => setLanguage('en')}>EN</button>
        <button type="button" data-lang="ur" onClick={() => setLanguage('ur')}>UR</button>
        <button type="button" data-lang="ar" onClick={() => setLanguage('ar')}>AR</button>
        <Link to="/policies/cookies" data-go-cookies>Cookies Policy</Link>
      </header>
      <main style={{ padding: '16px' }}>
        <div data-analytics-loads={analyticsLoads}>
          <ConsentGate category="analytics" onGranted={() => setAnalyticsLoads(n => n + 1)}>
            <span data-gate-mounted="analytics">Analytics Allowed</span>
          </ConsentGate>
        </div>
        <div data-marketing-loads={marketingLoads}>
          <ConsentGate category="marketing" onGranted={() => setMarketingLoads(n => n + 1)}>
            <span data-gate-mounted="marketing">Marketing Allowed</span>
          </ConsentGate>
        </div>
        <Routes>
          <Route path="/" element={<div style={{ height: '300px' }}>Home</div>} />
          <Route path="/policies/cookies" element={<PoliciesPage asPage={true} initialTab="cookies" />} />
        </Routes>
      </main>
      <Footer />
      {/* Simulated bottom-right AI chat button matching AIConcierge.tsx position */}
      <button
        type="button"
        data-mock-chat-button
        style={{ position: 'fixed', bottom: '20px', right: '16px', width: '56px', height: '56px', zIndex: 30 }}
      >
        Chat
      </button>
      <CookieNotice />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <LanguageProvider>
      <ConsentProvider>
        <BrowserRouter>
          <Harness />
        </BrowserRouter>
      </ConsentProvider>
    </LanguageProvider>
  </ThemeProvider>
);
`;

  await build({
    stdin: {
      contents: entry,
      loader: 'tsx',
      resolveDir: process.cwd(),
      sourcefile: 'consent-manager-fixture.tsx',
    },
    outfile: path.join(temporary, 'bundle.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  });

  const app = express();
  app.use(express.json());
  const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
  app.use(createConsentRouter({ getDb: () => db as any, consentLimiter: limiter }));
  app.use('/assets', express.static(temporary));
  app.get(/.*/, (_req, res) => {
    res.type('html').send(`<!doctype html><html lang="en"><head>
      <meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        *{box-sizing:border-box}
        .fixed{position:fixed}.relative{position:relative}.inset-0{inset:0}.inset-x-3{left:12px;right:12px}
        .bottom-\\[calc\\(5\\.25rem\\+env\\(safe-area-inset-bottom\\)\\)\\]{bottom:84px}
        .z-10{z-index:10}.z-40{z-index:40}.z-\\[12100\\]{z-index:12100}
        .flex{display:flex}.flex-col{flex-direction:column}.flex-1{flex:1 1 0%}
        .items-end{align-items:flex-end}.justify-center{justify-content:center}
        .max-h-\\[88vh\\]{max-height:88vh}.overflow-y-auto{overflow-y:auto}.overflow-hidden{overflow:hidden}
        .grid{display:grid}.grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr))}
        .min-h-\\[44px\\]{min-height:44px}.w-full{width:100%}.gap-2{gap:8px}.p-4{padding:16px}
      </style>
    </head><body><div id="root"></div><script type="module" src="/assets/bundle.js"></script></body></html>`);
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;

  const browser = await launchTestBrowser();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    });
    const page = await context.newPage();
    await useLocalFixtureFonts(page);
    const diagnostics = collectBrowserDiagnostics(page, baseUrl);

    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    // 1. Banner visible with GPC badge, equal-size buttons (>=44px), and no overlap with mobile chat button
    const banner = page.locator('[data-consent-banner]');
    await banner.waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-gpc-indicator]').isVisible(), true);
    assert.equal(await page.locator('[data-gate-mounted="analytics"]').count(), 0);
    assert.equal(await page.locator('[data-gate-mounted="marketing"]').count(), 0);

    const [bBox, chatBox, acceptBox, rejectBox, chooseBox] = await Promise.all([
      banner.boundingBox(),
      page.locator('[data-mock-chat-button]').boundingBox(),
      page.locator('[data-consent-action="accept-all"]').boundingBox(),
      page.locator('[data-consent-action="reject-all"]').boundingBox(),
      page.locator('[data-consent-action="choose-preferences"]').boundingBox(),
    ]);
    assert.ok(bBox && chatBox && acceptBox && rejectBox && chooseBox);
    assert.ok(bBox.y + bBox.height <= chatBox.y + 1, `Banner bottom (${bBox.y + bBox.height}) must clear mobile chat button top (${chatBox.y})`);
    assert.ok(acceptBox.height >= 44 && rejectBox.height >= 44 && chooseBox.height >= 44);
    assert.equal(Math.round(acceptBox.height), Math.round(rejectBox.height));
    assert.equal(Math.round(rejectBox.height), Math.round(chooseBox.height));
    assert.equal(Math.round(acceptBox.width), Math.round(rejectBox.width));

    // 2. Switch to Urdu -> RTL and Urdu labels; open preference modal
    await page.click('[data-lang="ur"]');
    assert.equal(await banner.getAttribute('dir'), 'rtl');
    assert.match((await page.locator('[data-consent-action="accept-all"]').textContent()) || '', /سب قبول/);
    assert.match((await page.locator('[data-consent-action="reject-all"]').textContent()) || '', /سب رد/);

    await page.click('[data-consent-action="choose-preferences"]');
    const modal = page.locator('[data-consent-modal]');
    await modal.waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-gpc-modal-note]').isVisible(), true);
    assert.equal(await page.locator('[data-consent-toggle="analytics"]').getAttribute('aria-checked'), 'false');
    assert.equal(await page.locator('[data-consent-toggle="marketing"]').getAttribute('aria-checked'), 'false');

    // 3. Enable Analytics only, save -> logs POST /api/consent, mounts Analytics ConsentGate, keeps Marketing blocked
    const consentReqPromise = page.waitForResponse((res) => res.url().endsWith('/api/consent') && res.status() === 201);
    await page.click('[data-consent-toggle="analytics"]');
    await page.click('[data-consent-modal-action="save-preferences"]');
    await consentReqPromise;

    await page.locator('[data-gate-mounted="analytics"]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-gate-mounted="marketing"]').count(), 0);
    assert.equal(await page.locator('[data-analytics-loads]').getAttribute('data-analytics-loads'), '1');
    assert.equal(await page.locator('[data-marketing-loads]').getAttribute('data-marketing-loads'), '0');
    assert.equal(await banner.count(), 0);

    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), CONSENT_STORAGE_KEY);
    assert.equal(stored.policyVersion, CONSENT_POLICY_VERSION);
    assert.equal(stored.categories.analytics, true);
    assert.equal(stored.categories.marketing, false);
    const serverLogs = Array.from(records.entries()).filter(([k]) => k.startsWith('consentLogs/'));
    assert.equal(serverLogs.length, 1);
    assert.equal((serverLogs[0][1] as any).gpc, true);

    // 4. Footer "Cookie settings" re-opens preference modal
    await page.click('[data-footer-cookie-settings]');
    await modal.waitFor({ state: 'visible' });
    await page.click('[data-consent-modal-action="reject-all"]');
    assert.equal(await page.locator('[data-gate-mounted="analytics"]').count(), 0);

    // 5. /policies/cookies shows code-derived storage inventory and opens settings modal
    await page.click('[data-go-cookies]');
    await page.locator('[data-cookies-policy-section]').waitFor({ state: 'visible' });
    const policyText = (await page.locator('[data-cookies-policy-section]').textContent()) || '';
    assert.match(policyText, /allbarka_consent_v1/);
    assert.match(policyText, /__session/);
    await page.click('[data-policy-open-cookie-settings]');
    await modal.waitFor({ state: 'visible' });

    assert.equal(diagnostics.length, 0, diagnostics.join('\n'));
    await context.close();
  } finally {
    await browser.close();
    server.close();
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
