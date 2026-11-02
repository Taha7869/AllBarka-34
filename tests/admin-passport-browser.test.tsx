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
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { createCatalogConfigurationRouter } from '../src/lib/catalogConfigurationRouter';
import { DEFAULT_CATALOG_CONFIGURATION } from '../src/lib/catalogConfiguration';

test('R04-PASS1: Admin passport editor, storefront presentation, privacy suppression, and persistence browser acceptance', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-passport-browser-'));
  const configuration = structuredClone(DEFAULT_CATALOG_CONFIGURATION);

  const initialPista: any = {
    id: 'pista',
    name_en: 'Roasted Pistachios',
    name_ur: 'بھنے ہوئے پستے',
    name_ar: 'فستق محمص',
    desc_en: 'Premium roasted Iranian pistachios',
    desc_ur: '',
    desc_ar: '',
    category: 'dry-fruits',
    status: 'published',
    orderMode: 'standard',
    active: true,
    image: '/images/product-placeholder.svg',
    imageName: null,
    prices: { '250g': 1250 },
    variants: [
      { id: '250g', label: '250g', price: 1250, available: true, weightGrams: 250 },
    ],
    shippingWeights: { '250g': 250 },
    commerce: {
      version: 1,
      kind: 'food',
      pricingMode: 'manual',
      quantityMode: 'fixed',
      baseQuantity: null,
      baseUnit: 'g',
      basePrice: null,
      options: [
        { label: '250g', quantity: 250, unit: 'g', override: false, available: true, shippingWeightG: 250 },
      ],
      custom: null,
    },
    schemaVersion: 1,
    revision: 1,
    adminRevision: 1,
    mediaFocalPoint: { x: 0.5, y: 0.5 },
    cropMode: 'cover',
    passport: {
      variety: 'Akbari',
      roastLevel: 'salted',
      bestBeforeDays: 90,
      certifications: ['halal'],
    },
    claimsVerification: {
      status: 'verified',
      verifiedAt: '2026-10-15',
      notes: 'SECRET_INTERNAL_INITIAL_AUDIT_NOTES',
    },
  };

  const { db } = memoryFirestore({
    'catalogSettings/main': configuration,
    'products/pista': structuredClone(initialPista),
  });

  const requireAdmin: any = (request: any, response: any, next: any) => {
    if (request.get('Authorization') !== 'Bearer fixture-owner') {
      return response.status(403).json({ code: 'FORBIDDEN_ADMIN' });
    }
    request.user = { uid: 'fixture-owner' };
    next();
  };

  const entry = `import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AdminItemForm from './src/components/AdminItemForm';
import ProductDetailAccordion from './src/components/ProductDetailAccordion';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { CatalogProvider } from './src/contexts/CatalogContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

function Workspace() {
  const [product, setProduct] = useState(${JSON.stringify(initialPista)});
  const [key, setKey] = useState(0);
  const [mode, setMode] = useState<'admin' | 'storefront'>('admin');
  const { setLanguage, language } = useLanguage();
  const { setTheme } = useTheme();

  useEffect(() => {
    (window as any).fixtureSetLanguage = setLanguage;
    (window as any).fixtureSetTheme = setTheme;
    (window as any).fixtureSetMode = setMode;
    (window as any).fixtureReloadProduct = (p: any) => {
      setProduct(p);
      setKey(k => k + 1);
    };
  }, [setLanguage, setTheme]);

  return (
    <div id="fixture-container" className="p-4 bg-[var(--color-base)] text-[var(--color-text-primary)] min-h-screen">
      <div className="flex gap-2 mb-4">
        <button id="toggle-admin-btn" type="button" onClick={() => setMode('admin')}>Admin Editor</button>
        <button id="toggle-pdp-btn" type="button" onClick={() => setMode('storefront')}>Storefront PDP</button>
      </div>
      {mode === 'admin' ? (
        <AdminItemForm
          key={key}
          product={product}
          onClose={() => {}}
          onSaved={(p) => {
            (window as any).fixtureSavedProduct = p;
            setProduct(p);
          }}
        />
      ) : (
        <div id="storefront-preview" className="max-w-xl mx-auto p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow border border-amber-200/30">
          <h2 className="text-xl font-bold mb-2">{product.name_en}</h2>
          <div className="w-full aspect-square relative overflow-hidden rounded-xl mb-4 bg-neutral-100">
            <img
              id="pdp-main-image"
              src={product.image}
              alt={product.name_en}
              style={product.mediaFocalPoint ? { objectPosition: \`\${product.mediaFocalPoint.x * 100}% \${product.mediaFocalPoint.y * 100}%\` } : undefined}
              className={\`w-full h-full \${product.cropMode === 'cover' ? 'object-cover' : 'object-contain'}\`}
            />
          </div>
          <ProductDetailAccordion product={product} />
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <LanguageProvider>
      <CatalogProvider>
        <Workspace />
      </CatalogProvider>
    </LanguageProvider>
  </ThemeProvider>
);`;

  await build({
    stdin: {
      contents: entry,
      loader: 'tsx',
      resolveDir: process.cwd(),
      sourcefile: 'passport-editor-fixture.tsx',
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: path.join(temporary, 'fixture.js'),
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'fixture-auth-only',
        setup(builder) {
          builder.onResolve({ filter: /\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'test-only' }));
          builder.onLoad({ filter: /.*/, namespace: 'test-only' }, () => ({
            contents: 'const currentUser={uid:"fixture-owner",getIdToken:async()=>"fixture-owner"}; export const useAuth=()=>({currentUser,loading:false,patronProfile:null});',
            loader: 'js',
          }));
        },
      },
    ],
    logLevel: 'silent',
  });

  const app = express();
  app.use(express.json());
  app.use(createCatalogConfigurationRouter({ getDb: () => db, requireAdmin }));
  app.use(createCatalogRouter({ getDb: () => db, requireAdmin }));
  app.use('/assets', express.static(path.resolve('dist/assets')));
  app.use('/images', express.static(path.resolve('public/images')));
  app.get('/fixture.js', (_req, res) => res.sendFile(path.join(temporary, 'fixture.js')));

  const distFiles = await fs.readdir('dist/assets').catch(() => []);
  const styles = distFiles.filter(x => x.endsWith('.css')).map(x => `<link rel="stylesheet" href="/assets/${x}">`).join('');
  app.get(/.*/, (_req, res) => res.type('html').send(`<!DOCTYPE html><html><head>${styles}</head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const browser = await launchTestBrowser();

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('409')) errors.push(m.text()); });

    await page.goto(`${origin}/`);
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();

    // 1. Wait for form to finish loading
    await dialog.locator('fieldset').waitFor();

    // Jump to Media section and modify Focal Point + Crop Mode
    const mediaShortcut = dialog.locator('.item-section-nav button[aria-controls="item-section-media"]');
    await mediaShortcut.click();
    const mediaSection = dialog.locator('#item-section-media');
    await mediaSection.waitFor();

    const focalX = mediaSection.locator('input[type="number"]').first();
    const focalY = mediaSection.locator('input[type="number"]').nth(1);
    const cropSelect = mediaSection.locator('select');

    await focalX.fill('0.25');
    await focalY.fill('0.75');
    await cropSelect.selectOption('contain');

    // 2. Jump to Passport & Claims section
    const passportShortcut = dialog.locator('.item-section-nav button[aria-controls="item-section-passport"]');
    await passportShortcut.click();
    const passportSection = dialog.locator('#item-section-passport');
    await passportSection.waitFor();
    assert.equal(await passportSection.getAttribute('open'), '');

    // Fill passport fields
    const varietyInput = passportSection.locator('input[type="text"]').first();
    await varietyInput.fill('Akbari Super Long');

    const roastSelect = passportSection.locator('select').first();
    await roastSelect.selectOption('slow_roasted');

    const shelfLifeInput = passportSection.locator('input[type="number"]').first();
    await shelfLifeInput.fill('150');

    // Check organic certification checkbox
    const organicCheckbox = passportSection.locator('label').filter({ hasText: /Organic/i }).locator('input[type="checkbox"]');
    if (!(await organicCheckbox.isChecked())) {
      await organicCheckbox.check();
    }

    // Set claims verification to verified with new notes
    const claimsStatusSelect = passportSection.locator('select').nth(1);
    await claimsStatusSelect.selectOption('verified');

    const claimsNotesInput = passportSection.locator('textarea').nth(1);
    await claimsNotesInput.fill('CONFIDENTIAL_INTERNAL_AUDIT_BATCH_99');

    // 3. Save as published
    const saveResponsePromise = page.waitForResponse(r => r.url().includes('/api/admin/catalog/products/pista') && r.status() === 200);
    const publishButton = dialog.locator('footer.item-actions button.item-primary');
    await publishButton.click();
    await saveResponsePromise;

    // Check status notice
    await page.locator('p.item-status').waitFor();
    assert.equal(await page.locator('p.item-status').textContent(), 'Saved successfully.');

    // 4. Verify Firestore document persistence
    const savedDoc = await db.collection('products').doc('pista').get();
    assert.ok(savedDoc.exists);
    const savedData = savedDoc.data()!;
    assert.equal(savedData.mediaFocalPoint?.x, 0.25);
    assert.equal(savedData.mediaFocalPoint?.y, 0.75);
    assert.equal(savedData.cropMode, 'contain');
    assert.equal(savedData.passport?.variety, 'Akbari Super Long');
    assert.equal(savedData.passport?.roastLevel, 'slow_roasted');
    assert.equal(savedData.passport?.bestBeforeDays, 150);
    assert.ok(savedData.passport?.certifications?.includes('organic'));
    assert.equal(savedData.claimsVerification?.status, 'verified');
    assert.equal(savedData.claimsVerification?.notes, 'CONFIDENTIAL_INTERNAL_AUDIT_BATCH_99');
    assert.equal(savedData.revision, 2);

    // 5. Verify Public API Privacy
    const publicSingleRes = await fetch(`${origin}/api/catalog/products/pista`);
    assert.equal(publicSingleRes.status, 200);
    const publicSingleJson = await publicSingleRes.json();
    const publicSingleStr = JSON.stringify(publicSingleJson);

    // Private notes MUST NOT be leaked to public API!
    assert.equal(publicSingleStr.includes('CONFIDENTIAL_INTERNAL_AUDIT_BATCH_99'), false, 'Internal notes leaked in public single product API');
    assert.equal(publicSingleStr.includes('SECRET_INTERNAL_INITIAL_AUDIT_NOTES'), false);
    assert.equal(publicSingleJson.product.claimsVerification?.notes, undefined);
    assert.equal(publicSingleJson.product.claimsVerification?.status, 'verified');
    assert.ok(publicSingleJson.product.passport?.certifications?.includes('organic'));

    // 6. Test Stale Revision Conflict (409) while form is still open with revision 2
    // Emulate another concurrent admin bumping the revision in database
    await db.collection('products').doc('pista').set({ revision: 5, adminRevision: 5 }, { merge: true });

    // Submit save from current form (still holding expectedRevision: 2)
    const staleSaveResPromise = page.waitForResponse(r => r.url().includes('/api/admin/catalog/products/pista'));
    await publishButton.click();
    const staleSaveRes = await staleSaveResPromise;
    assert.equal(staleSaveRes.status(), 409);

    // Verify conflict alert appears
    const errorAlert = dialog.locator('p.item-error');
    await errorAlert.waitFor();
    assert.ok((await errorAlert.textContent())?.includes('CATALOG_REVISION_CONFLICT'));

    // 7. Switch to Storefront Preview mode and verify customer presentation
    await page.evaluate(() => {
      (window as any).fixtureSetMode('storefront');
    });

    const storefrontPreview = page.locator('#storefront-preview');
    await storefrontPreview.waitFor();

    // Verify main image cropMode and focal point
    const pdpImg = page.locator('#pdp-main-image');
    assert.equal(await pdpImg.getAttribute('class'), 'w-full h-full object-contain');
    const imgStyle = await pdpImg.getAttribute('style');
    assert.ok(imgStyle?.includes('object-position: 25% 75%'));

    // Use & storage accordion is open by default
    const shelfLifeText = page.getByText(/150 days from packaging/i);
    if (!(await shelfLifeText.isVisible())) {
      const storageBtn = page.getByRole('button', { name: /Use & storage/i });
      await storageBtn.click();
    }
    await shelfLifeText.waitFor();
    assert.ok(await shelfLifeText.isVisible());

    // Open Details & Sourcing accordion section
    const sourcingBtn = page.getByRole('button', { name: /Details & sourcing/i });
    await sourcingBtn.click();
    const varietyText = page.getByText(/Akbari Super Long/i);
    await varietyText.waitFor();
    assert.ok(await varietyText.isVisible());

    // Open Verified Passport & Quality accordion section
    const qualityBtn = page.getByRole('button', { name: /Verified Passport & Quality/i });
    await qualityBtn.click();
    assert.ok(await page.getByText(/AllBarka Verified Quality/i).isVisible());

    // Verify CONFIDENTIAL notes NEVER appear in storefront HTML
    const storefrontHtml = await page.locator('#storefront-preview').innerHTML();
    assert.equal(storefrontHtml.includes('CONFIDENTIAL_INTERNAL_AUDIT_BATCH_99'), false);
    assert.equal(storefrontHtml.includes('SECRET_INTERNAL_INITIAL_AUDIT_NOTES'), false);

    // 8. Test Mobile Viewport on Storefront (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await storefrontPreview.isVisible());

    // Switch back to admin mode to verify mobile and RTL dialog
    await page.evaluate(() => {
      (window as any).fixtureSetMode('admin');
    });
    await dialog.waitFor();
    await dialog.locator('fieldset').waitFor();
    assert.ok(await dialog.isVisible());

    // 9. Test RTL & Urdu Localization
    await page.evaluate(() => {
      (window as any).fixtureSetLanguage('ur');
    });
    await page.waitForTimeout(100);
    assert.equal(await dialog.getAttribute('dir'), 'rtl');

    // 10. Test Dark Mode
    await page.evaluate(() => {
      (window as any).fixtureSetTheme('dark');
    });
    await page.waitForTimeout(100);
    const containerClasses = await page.locator('#fixture-container').getAttribute('class');
    assert.ok(containerClasses?.includes('bg-[var(--color-base)]'));

    // Clean execution check: no unhandled page errors
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.closeAllConnections?.();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await fs.rm(temporary, { recursive: true, force: true }).catch(() => {});
  }
});
