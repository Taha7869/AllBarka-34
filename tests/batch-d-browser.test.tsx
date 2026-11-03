import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { once } from 'node:events';
import { build } from 'esbuild';
import { memoryFirestore } from './helpers/memoryFirestore';
import { launchTestBrowser } from './helpers/browser.mjs';
import { createStorefrontContentRouter } from '../src/lib/storefrontContentRouter';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { createCatalogConfigurationRouter } from '../src/lib/catalogConfigurationRouter';

test('Batch D Browser Acceptance: M32 Studio Preview & Restore, Responsive Device Modes, and Revision Protection', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-studio-browser-'));
  const { db } = memoryFirestore();

  const requireAdmin: any = (req: any, res: any, next: any) => {
    if (req.get('Authorization') !== 'Bearer owner') return res.status(403).json({ code: 'FORBIDDEN_ADMIN' });
    req.user = { uid: 'owner' };
    next();
  };

  const entry = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { StorefrontContentProvider } from './src/contexts/StorefrontContentContext';
import { CatalogProvider } from './src/contexts/CatalogContext';
import { MerchandisingProvider } from './src/contexts/MerchandisingContext';
import { CartProvider } from './src/contexts/CartContext';
import AdminContentPanel from './src/components/AdminContentPanel';
function PreviewControls(){const {setLanguage}=useLanguage();const {setTheme}=useTheme();React.useEffect(()=>{window.previewFixture={setLanguage,setTheme};},[setLanguage,setTheme]);return null;}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThemeProvider>
      <LanguageProvider><PreviewControls/>
        <CatalogProvider>
          <MerchandisingProvider>
            <StorefrontContentProvider>
              <CartProvider>
                <Routes>
                  <Route path="/" element={<div className="admin-main p-6 max-w-5xl mx-auto"><AdminContentPanel /></div>} />
                </Routes>
              </CartProvider>
            </StorefrontContentProvider>
          </MerchandisingProvider>
        </CatalogProvider>
      </LanguageProvider>
    </ThemeProvider>
  </BrowserRouter>
);`;

  await build({
    stdin: { contents: entry, loader: 'tsx', resolveDir: process.cwd(), sourcefile: 'studio-fixture.tsx' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: path.join(temporary, 'fixture.js'),
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'fixture-auth',
        setup(builder) {
          builder.onResolve({ filter: /\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'fixture-only' }));
          builder.onLoad({ filter: /.*/, namespace: 'fixture-only' }, () => ({
            contents: 'const currentUser={uid:"owner",getIdToken:async()=>"owner"};export const useAuth=()=>({currentUser,loading:false,patronProfile:null});',
            loader: 'js',
          }));
        },
      },
    ],
    logLevel: 'silent',
  });

  const app = express();
  app.use(express.json({ limit: '128kb' }));
  app.use(createStorefrontContentRouter({ getDb: () => db, requireAdmin }));
  app.use(createCatalogRouter({ getDb: () => db, requireAdmin }));
  app.use(createCatalogConfigurationRouter({ getDb: () => db, requireAdmin }));
  app.get('/api/product-media', (_req, res) => res.json({ overrides: {} }));
  app.use('/assets', express.static(path.resolve('dist/assets')));
  app.use('/images', express.static(path.resolve('public/images')));
  app.use('/fonts', express.static(path.resolve('public/fonts')));
  app.get('/fixture.js', (_req, res) => res.sendFile(path.join(temporary, 'fixture.js')));

  const distFiles = await fs.readdir('dist/assets').catch(() => []);
  const styles = distFiles.filter(x => x.endsWith('.css')).map(x => `<link rel="stylesheet" href="/assets/${x}">`).join('');
  app.get(/.*/, (_req, res) => res.type('html').send(`<!DOCTYPE html><html><head>${styles}</head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const browser = await launchTestBrowser();

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(`${origin}/`);
    await page.getByRole('heading', { name: 'Storefront studio', exact: true }).waitFor();

    // 1. Publish baseline content first
    const heroSection = page.locator('details.content-editor-section').first();
    await heroSection.getByLabel(/^Use custom content/).check();
    await heroSection.getByLabel(/^Heading · EN/).fill('Heritage Orchard Selections.');
    await heroSection.getByLabel(/^Description · EN/).fill('Authentic Lahori craftsmanship and premium dry fruits.');
    await heroSection.getByLabel(/^Primary button label · EN/).fill('Explore Table');
    await heroSection.getByLabel(/^Secondary button label · EN/).fill('Bespoke Gifts');

    // Save draft
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('Draft saved. Customers still see the published version.', { exact: true }).waitFor();

    // Publish to make it the live baseline
    await page.getByRole('button', { name: 'Publish saved draft', exact: true }).click();
    await page.getByText('Storefront published.', { exact: true }).waitFor();

    // 2. Open Preview
    await page.getByRole('button', { name: 'Preview draft', exact: true }).click();
    await page.locator('.content-draft-preview').waitFor();

    // Verify preview contains device mode switcher
    const desktopBtn = page.locator('button[data-preview-device="desktop"]');
    const mobileBtn = page.locator('button[data-preview-device="mobile"]');
    assert.ok(await desktopBtn.isVisible(), 'Desktop preview button must be visible');
    assert.ok(await mobileBtn.isVisible(), 'Mobile preview button must be visible');

    // Switch to Mobile Preview
    await mobileBtn.click();
    await page.waitForTimeout(300);

    // Verify genuine isolated responsive iframe exists with 390px width
    const previewIframe = page.locator('iframe.preview-storefront-iframe');
    assert.ok(await previewIframe.isVisible(), 'Storefront preview iframe must be mounted');
    let iframeBox = await previewIframe.boundingBox();
    assert.ok(iframeBox && Math.abs(iframeBox.width - 390) < 5, 'Mobile preview iframe width must be 390px');
    assert.equal(await previewIframe.evaluate((element: HTMLIFrameElement) => element.contentWindow!.matchMedia('(min-width: 768px)').matches), false);

    // Test Tablet Preview (768px)
    const tabletBtn = page.locator('button[data-preview-device="tablet"]');
    await tabletBtn.click();
    await page.waitForTimeout(300);
    iframeBox = await previewIframe.boundingBox();
    assert.ok(iframeBox && Math.abs(iframeBox.width - 768) < 5, 'Tablet preview iframe width must be 768px');
    assert.equal(await previewIframe.evaluate((element: HTMLIFrameElement) => element.contentWindow!.matchMedia('(min-width: 768px)').matches), true);

    // Test actual 1440px desktop viewport
    await desktopBtn.click();
    await page.waitForTimeout(300);
    iframeBox = await previewIframe.boundingBox();
    assert.ok(iframeBox && Math.abs(iframeBox.width - 1440) < 5, 'Desktop preview iframe must have its actual 1440px viewport');

    // Preview pages must never rewrite the authenticated host's metadata.
    const editorTitle = await page.title();
    const editorCanonicalCount = await page.locator('link[rel=canonical]').count();
    // Test Surface Switcher (Home, Journal, FAQ)
    const journalTab = page.locator('button[data-surface="journal"]');
    const faqTab = page.locator('button[data-surface="faq"]');
    const homeTab = page.locator('button[data-surface="home"]');

    await journalTab.click();
    await page.waitForTimeout(200);
    assert.ok(await page.locator('.preview-surface-tabs button[data-surface="journal"]').isVisible());

    await faqTab.click();
    await page.waitForTimeout(200);
    assert.ok(await page.locator('.preview-surface-tabs button[data-surface="faq"]').isVisible());

    await homeTab.click();
    await page.waitForTimeout(200);

    const frame = page.frameLocator('iframe.preview-storefront-iframe');
    assert.equal(await frame.locator('.editorial-home').count(), 1, 'Preview must use actual homepage sections');
    assert.equal(await page.locator('.content-hero-preview').count(), 0, 'No hidden host proxy may satisfy preview assertions');
    const captureEvidence = process.env.ALLBARKA_CAPTURE_EVIDENCE === 'true';
    if (captureEvidence) await fs.mkdir('docs/evidence/studio-final', { recursive: true });
    for (const language of ['en', 'ur', 'ar']) {
      for (const theme of ['light', 'dark']) {
        await page.evaluate(({language,theme}) => { (window as any).previewFixture.setLanguage(language); (window as any).previewFixture.setTheme(theme); }, {language,theme});
        await frame.locator(`html[lang="${language}"][dir="${language === 'en' ? 'ltr' : 'rtl'}"][data-theme="${theme}"]`).waitFor();
        assert.equal(await frame.locator('html').evaluate(root => root.classList.contains('dark')), theme === 'dark');
        if (captureEvidence && language === 'en' && theme === 'light') await previewIframe.screenshot({ path: 'docs/evidence/studio-final/after-desktop-en-light.jpg', type: 'jpeg', quality: 78 });
        if (language === 'ar' && theme === 'dark') {
          await mobileBtn.click();
          await page.waitForFunction(() => Math.abs(document.querySelector<HTMLIFrameElement>('iframe.preview-storefront-iframe')!.getBoundingClientRect().width - 390) < 2);
          if (captureEvidence) await previewIframe.screenshot({ path: 'docs/evidence/studio-final/after-mobile-ar-dark.jpg', type: 'jpeg', quality: 78 });
          await desktopBtn.click();
        }
      }
    }
    await page.evaluate(() => { (window as any).previewFixture.setLanguage('en'); (window as any).previewFixture.setTheme('light'); });
    await frame.locator('html[lang="en"][data-theme="light"]').waitFor();
    await journalTab.click();
    await frame.locator('.editorial-journal.journal-index').waitFor();
    assert.equal(await page.title(), editorTitle, 'Journal preview must not replace host metadata');
    assert.equal(await page.locator('link[rel=canonical]').count(), editorCanonicalCount);
    await faqTab.click();
    await frame.locator('.preview-surface-faq .premium-faq').waitFor();
    await homeTab.click();
    // A real preview link cannot navigate the authenticated editor or submit commerce actions.
    const editorUrl = page.url();
    await frame.locator('.table-hero-primary').click();
    assert.equal(page.url(), editorUrl);

    // 3. Edit draft with experimental changes
    await heroSection.getByLabel(/^Heading · EN/).fill('Unpublished Experimental Heading.');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('Draft saved. Customers still see the published version.', { exact: true }).waitFor();

    // Verify draft preview reflects the new edit
    await page.frameLocator('iframe.preview-storefront-iframe').getByRole('heading', { name: /Unpublished Experimental/ }).waitFor();

    // Switch preview version to Live
    const liveVersionBtn = page.locator('.content-draft-preview button:has-text("Live")');
    await liveVersionBtn.click();
    await page.waitForTimeout(300);

    // Verify live preview reflects the live baseline ('Heritage Orchard')
    await page.frameLocator('iframe.preview-storefront-iframe').getByRole('heading', { name: /Heritage Orchard/ }).waitFor();

    // 4. Test Restore Live to Draft
    // Auto-confirm window.confirm
    page.once('dialog', dialog => dialog.accept());
    const restoreBtn = page.locator('button:has-text("Restore live to draft")');
    await restoreBtn.click();
    await page.getByText('Draft restored from live published baseline.', { exact: true }).waitFor();

    // Verify draft input has reverted to live baseline ('Heritage Orchard Selections.')
    const headingInputVal = await heroSection.getByLabel(/^Heading · EN/).inputValue();
    assert.equal(headingInputVal, 'Heritage Orchard Selections.');

    assert.equal(errors.length, 0, `Browser acceptance encountered errors: ${errors.join('; ')}`);
  } finally {
    await browser.close();
    server.closeAllConnections?.();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
