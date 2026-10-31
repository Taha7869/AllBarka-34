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
import type { Product } from '../src/types';

test('R04-KG1: Admin visual recipe editor mounts, calculates live rates, binds variant overrides, and persists recipes', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-recipe-editor-'));
  const configuration = structuredClone(DEFAULT_CATALOG_CONFIGURATION);

  const pista: any = {
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
    prices: { '1kg': 4500, '500g': 2400, '250g': 1250 },
    variants: [
      { id: '1kg', label: '1kg', price: 4500, available: true, weightGrams: 1000 },
      { id: '500g', label: '500g', price: 2400, available: true, weightGrams: 500 },
      { id: '250g', label: '250g', price: 1250, available: true, weightGrams: 250 },
    ],
    shippingWeights: { '1kg': 1000, '500g': 500, '250g': 250 },
    commerce: {
      version: 1,
      kind: 'food',
      pricingMode: 'manual',
      quantityMode: 'fixed',
      baseQuantity: null,
      baseUnit: 'g',
      basePrice: null,
      options: [
        { label: '1kg', quantity: 1, unit: 'kg', override: false, available: true, shippingWeightG: 1000 },
        { label: '500g', quantity: 500, unit: 'g', override: false, available: true, shippingWeightG: 500 },
        { label: '250g', quantity: 250, unit: 'g', override: false, available: true, shippingWeightG: 250 },
      ],
      custom: null,
    },
    schemaVersion: 1,
    revision: 2,
    adminRevision: 2,
  };

  const ajwaDates: any = {
    id: 'ajwa-dates',
    name_en: 'Ajwa Dates',
    name_ur: 'عجوہ کھجور',
    name_ar: 'تمر عجوة',
    desc_en: 'Authentic Madinah Ajwa dates',
    desc_ur: '',
    desc_ar: '',
    category: 'dates',
    status: 'published',
    orderMode: 'standard',
    active: true,
    image: '/images/product-placeholder.svg',
    imageName: null,
    prices: { '1kg': 2000, '500g': 1100 },
    variants: [
      { id: '1kg', label: '1kg', price: 2000, available: true, weightGrams: 1000 },
      { id: '500g', label: '500g', price: 1100, available: true, weightGrams: 500 },
    ],
    shippingWeights: { '1kg': 1000, '500g': 500 },
    commerce: {
      version: 1,
      kind: 'food',
      pricingMode: 'manual',
      quantityMode: 'fixed',
      baseQuantity: null,
      baseUnit: 'g',
      basePrice: null,
      options: [
        { label: '1kg', quantity: 1, unit: 'kg', override: false, available: true, shippingWeightG: 1000 },
        { label: '500g', quantity: 500, unit: 'g', override: false, available: true, shippingWeightG: 500 },
      ],
      custom: null,
    },
    schemaVersion: 1,
    revision: 1,
    adminRevision: 1,
  };

  const walnutQuoteOnly: any = {
    id: 'walnut-raw',
    name_en: 'Raw Walnuts',
    name_ur: 'اخروٹ',
    name_ar: 'جوز',
    desc_en: 'Shelled raw walnuts',
    desc_ur: '',
    desc_ar: '',
    category: 'dry-fruits',
    status: 'published',
    orderMode: 'standard',
    active: true,
    image: '/images/product-placeholder.svg',
    imageName: null,
    prices: { '250g': 800 },
    variants: [
      { id: '250g', label: '250g', price: 800, available: true, weightGrams: 250 },
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
  };

  const luxuryTin: any = {
    id: 'bid-box-luxury-tin',
    name_en: 'Luxury Tin Box',
    name_ur: 'لگژری ٹن باکس',
    name_ar: 'علبة قصدير فاخرة',
    desc_en: 'Gold foil metallic keepsake tin for gifting',
    desc_ur: '',
    desc_ar: '',
    category: 'packaging',
    packagingSubcategory: 'tin',
    preparationDays: 10,
    status: 'published',
    orderMode: 'inquiry_quote',
    active: true,
    image: '/images/product-placeholder.svg',
    imageName: null,
    prices: {
      '10 Boxes': 1000,
      'Filled Box (Standard)': 9000,
      'With Roasted Pistachios': 9500,
    },
    variants: [
      { id: '10-boxes', label: '10 Boxes', price: 1000, available: true, weightGrams: 500 },
      { id: 'filled-box-standard', label: 'Filled Box (Standard)', price: 9000, available: true, weightGrams: 600 },
      { id: 'with-roasted-pistachios', label: 'With Roasted Pistachios', price: 9500, available: true, weightGrams: 600 },
    ],
    shippingWeights: {
      '10 Boxes': 500,
      'Filled Box (Standard)': 600,
      'With Roasted Pistachios': 600,
    },
    commerce: {
      version: 1,
      kind: 'packaging',
      pricingMode: 'manual',
      quantityMode: 'fixed',
      baseQuantity: null,
      baseUnit: 'g',
      basePrice: null,
      options: [
        { label: '10 Boxes', quantity: 10, unit: 'piece', piecesPerPack: 10, override: false, available: true, shippingWeightG: 500 },
        { label: 'Filled Box (Standard)', quantity: 1, unit: 'piece', piecesPerPack: 1, override: false, available: true, shippingWeightG: 600 },
        { label: 'With Roasted Pistachios', quantity: 1, unit: 'piece', piecesPerPack: 1, override: false, available: true, shippingWeightG: 600 },
      ],
      custom: null,
    },
    schemaVersion: 1,
    revision: 1,
    adminRevision: 1,
  };

  const createSeedDryFruit = (id: string, name_en: string, price1kg: number): any => ({
    id,
    name_en,
    name_ur: name_en,
    name_ar: name_en,
    desc_en: 'Premium dry fruit selection',
    desc_ur: '',
    desc_ar: '',
    category: 'dry-fruits',
    status: 'published',
    orderMode: 'standard',
    active: true,
    image: '/images/product-placeholder.svg',
    imageName: null,
    prices: { '1kg': price1kg },
    variants: [
      { id: '1kg', label: '1kg', price: price1kg, available: true, weightGrams: 1000 },
    ],
    shippingWeights: { '1kg': 1000 },
    commerce: {
      version: 1,
      kind: 'food',
      pricingMode: 'manual',
      quantityMode: 'fixed',
      baseQuantity: null,
      baseUnit: 'g',
      basePrice: null,
      options: [
        { label: '1kg', quantity: 1, unit: 'kg', override: false, available: true, shippingWeightG: 1000 },
      ],
      custom: null,
    },
    schemaVersion: 1,
    revision: 1,
    adminRevision: 1,
  });

  const kaju = createSeedDryFruit('kaju', 'Cashews', 1001);
  const badam = createSeedDryFruit('badam', 'Almonds', 1001);
  const akhroot = createSeedDryFruit('akhroot', 'Walnuts', 1001);
  const kishmish = createSeedDryFruit('kishmish', 'Raisins', 1001);

  const { db, records } = memoryFirestore({
    'catalogSettings/main': configuration,
    'products/pista': pista,
    'products/ajwa-dates': ajwaDates,
    'products/walnut-raw': walnutQuoteOnly,
    'products/kaju': kaju,
    'products/badam': badam,
    'products/akhroot': akhroot,
    'products/kishmish': kishmish,
    'products/bid-box-luxury-tin': luxuryTin,
    'hamperBoxes/box-wood': { schemaVersion: 1, boxId: 'box-wood', revision: 1, price: 1800, active: true },
    'hamperBoxes/box-velvet': { schemaVersion: 1, boxId: 'box-velvet', revision: 1, price: 1400, active: true },
    'hamperBoxes/box-tin': { schemaVersion: 1, boxId: 'box-tin', revision: 1, price: 950, active: true },
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
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { CatalogProvider } from './src/contexts/CatalogContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

function Workspace() {
  const [product, setProduct] = useState(${JSON.stringify(luxuryTin)});
  const [key, setKey] = useState(0);
  const { setLanguage } = useLanguage();
  const { setTheme } = useTheme();

  useEffect(() => {
    (window as any).fixtureSetLanguage = setLanguage;
    (window as any).fixtureSetTheme = setTheme;
    (window as any).fixtureReloadProduct = (p) => {
      setProduct(p);
      setKey(k => k + 1);
    };
  }, [setLanguage, setTheme]);

  return (
    <AdminItemForm
      key={key}
      product={product}
      onClose={() => {}}
      onSaved={(p) => {
        (window as any).fixtureSavedProduct = p;
      }}
    />
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
      sourcefile: 'recipe-editor-fixture.tsx',
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

  const styles = (await fs.readdir('dist/assets')).filter(x => x.endsWith('.css')).map(x => `<link rel="stylesheet" href="/assets/${x}">`).join('');
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
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(`${origin}/`);
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();

    // Wait for catalog to load and populate live pricing
    await page.waitForResponse(r => r.url().endsWith('/api/catalog') && r.status() === 200);

    // 1. Jump to Recipe & Filling section via navigation
    const recipeShortcut = dialog.locator('.item-section-nav button').filter({ hasText: /Recipe/i });
    await recipeShortcut.click();
    const recipeSection = dialog.locator('#item-section-recipe');
    await recipeSection.waitFor();
    assert.equal(await recipeSection.getAttribute('open'), '');

    // 2. Add first ingredient: Roasted Pistachios (50g)
    const addIngBtn = recipeSection.getByRole('button', { name: /Add Ingredient/i }).first();
    await addIngBtn.click();

    const firstIngSelect = recipeSection.locator('select').first();
    const firstIngGrams = recipeSection.locator('input[type="number"]').first();

    // Assert new row starts empty without auto-selecting candidate or assigning 50g
    assert.equal(await firstIngSelect.inputValue(), '');
    assert.equal(await firstIngGrams.inputValue(), '');
    const badge = recipeSection.getByText(/Select an ingredient product/i);
    await badge.waitFor();
    assert.ok(await badge.isVisible());

    // Attempting to save with incomplete row must fail closed with validation error
    const saveBtn = dialog.locator('footer button[type="submit"]');
    await saveBtn.click();
    const errorAlert = dialog.locator('p[role="alert"].item-error');
    await errorAlert.waitFor();
    assert.match(await errorAlert.textContent() || '', /INVALID_RECIPE_INGREDIENT/);

    await firstIngSelect.selectOption('pista');
    await firstIngGrams.fill('50');

    // Verify live calculation
    await page.waitForFunction(() => {
      const text = document.querySelector('#item-section-recipe')?.textContent || '';
      return text.includes('Rs. 4,500 / kg') && text.includes('Rs. 225 PKR');
    });

    // 3. Add second ingredient: Ajwa Dates (50g)
    await addIngBtn.click();
    const secondIngSelect = recipeSection.locator('select').nth(1);
    const secondIngGrams = recipeSection.locator('input[type="number"]').nth(1);

    // Assert second row also starts empty
    assert.equal(await secondIngSelect.inputValue(), '');
    assert.equal(await secondIngGrams.inputValue(), '');

    await secondIngSelect.selectOption('ajwa-dates');
    await secondIngGrams.fill('50');

    // Verify live calculation for ajwa-dates 50g at Rs. 2,000/kg -> Rs. 100 PKR / box
    // Total filling: 100g per box, Total estimate: Rs. 325 PKR / box
    await page.waitForFunction(() => {
      const text = document.querySelector('#item-section-recipe')?.textContent || '';
      return text.includes('Rs. 2,000 / kg') && text.includes('Rs. 100 PKR') && text.includes('100g per box') && text.includes('Rs. 325 PKR');
    });

    // 4. Fill customer recipe descriptions (EN / UR / AR)
    const descDetails = recipeSection.locator('details').filter({ hasText: /Customer Recipe Descriptions/i });
    await descDetails.locator('summary').click();
    await descDetails.locator('textarea').nth(0).fill('50g Roasted Pistachios & 50g Ajwa Dates per box');
    await descDetails.locator('textarea').nth(1).fill('۵۰ گرام پستہ اور ۵۰ گرام عجوہ کھجور فی ڈبہ');
    await descDetails.locator('textarea').nth(2).fill('50 غرام فستق محمص و 50 غرام تمر عجوة لكل صندوق');

    // 5. Configure variant-specific recipe override for 'With Roasted Pistachios'
    const variantDetails = recipeSection.locator('details').filter({ hasText: /Variant-Specific Recipes/i });
    await variantDetails.locator('summary').first().click();

    const pistachiosVariant = variantDetails.locator('details').filter({ hasText: 'With Roasted Pistachios' });
    await pistachiosVariant.locator('summary').first().click();
    const enableCustomCheckbox = pistachiosVariant.locator('input[type="checkbox"]').first();
    await enableCustomCheckbox.check();

    // Verify custom variant copies the 2 configured default ingredients
    const variantSelects = pistachiosVariant.locator('select');
    assert.equal(await variantSelects.count(), 2);
    assert.equal(await variantSelects.nth(0).inputValue(), 'pista');
    assert.equal(await variantSelects.nth(1).inputValue(), 'ajwa-dates');

    // Verify variant "Add Ingredient" button adds a blank row
    const addVariantIngBtn = pistachiosVariant.getByRole('button', { name: /Add Ingredient/i }).first();
    await addVariantIngBtn.click();
    const thirdVariantSelect = pistachiosVariant.locator('select').nth(2);
    const thirdVariantGrams = pistachiosVariant.locator('input[type="number"]').nth(2);
    assert.equal(await thirdVariantSelect.inputValue(), '');
    assert.equal(await thirdVariantGrams.inputValue(), '');

    // Remove the blank third row
    const removeThirdBtn = pistachiosVariant.getByRole('button', { name: /Remove/i }).nth(2);
    await removeThirdBtn.click();

    // In custom variant recipe: set pista to 100g and remove ajwa-dates
    const customIngSelect = pistachiosVariant.locator('select').first();
    await customIngSelect.selectOption('pista');
    const customIngGrams = pistachiosVariant.locator('input[type="number"]').first();
    await customIngGrams.fill('100');
    const customRemoveBtn = pistachiosVariant.getByRole('button', { name: /Remove/i }).nth(1);
    await customRemoveBtn.click();

    // Verify custom variant calculation: 100g at Rs. 4,500/kg -> Rs. 450 PKR / box
    await page.waitForFunction(() => {
      const text = document.querySelector('#item-section-recipe')?.textContent || '';
      return text.includes('Rs. 450 PKR');
    });

    // 6. Review section preview
    const reviewShortcut = dialog.locator('.item-section-nav button[aria-controls="item-section-review"]');
    await reviewShortcut.click();
    const reviewBtn = dialog.locator('#item-section-review button').first();
    await reviewBtn.click();
    await page.waitForFunction(() => {
      const reviewText = document.querySelector('#item-section-review')?.textContent || '';
      return reviewText.includes('pista (50g)') && reviewText.includes('ajwa-dates (50g)');
    });

    // 7. Save product
    await saveBtn.click();

    // Wait for save completion
    await page.waitForFunction(() => !!(window as any).fixtureSavedProduct);

    // 8. Verify persisted Firestore data
    const savedDoc = records.get('products/bid-box-luxury-tin') as Record<string, any>;
    assert.ok(savedDoc, 'Saved document must exist in Firestore');
    assert.equal(savedDoc.revision, 2, 'Revision must advance monotonically');

    assert.deepEqual(savedDoc.recipeIngredients, [
      { productId: 'pista', grams: 50 },
      { productId: 'ajwa-dates', grams: 50 },
    ]);

    assert.deepEqual(savedDoc.filledRecipes, {
      'With Roasted Pistachios': [
        { productId: 'pista', grams: 100 },
      ],
    });

    assert.equal(savedDoc.recipe_en, '50g Roasted Pistachios & 50g Ajwa Dates per box');
    assert.equal(savedDoc.recipe_ur, '۵۰ گرام پستہ اور ۵۰ گرام عجوہ کھجور فی ڈبہ');
    assert.equal(savedDoc.recipe_ar, '50 غرام فستق محمص و 50 غرام تمر عجوة لكل صندوق');

    // 9. Reload record and verify round-trip display
    await page.evaluate((saved) => (window as any).fixtureReloadProduct(saved), savedDoc);
    await dialog.waitFor();
    await recipeShortcut.click();

    await page.waitForFunction(() => {
      const text = document.querySelector('#item-section-recipe')?.textContent || '';
      return text.includes('100g per box') && text.includes('Rs. 325 PKR');
    });

    // 10. Clear recipe by removing both ingredients and save
    const removeBtns = recipeSection.getByRole('button', { name: /Remove/i });
    await removeBtns.nth(0).click();
    await removeBtns.nth(0).click();

    // Disable the custom variant recipe (ensure section details are open)
    if (!await variantDetails.evaluate(el => (el as HTMLDetailsElement).open)) {
      await variantDetails.locator('summary').first().click();
    }
    if (!await pistachiosVariant.evaluate(el => (el as HTMLDetailsElement).open)) {
      await pistachiosVariant.locator('summary').first().click();
    }
    await enableCustomCheckbox.uncheck();

    await saveBtn.click();
    await page.waitForFunction(() => (window as any).fixtureSavedProduct?.revision === 3);

    const clearedDoc = records.get('products/bid-box-luxury-tin') as Record<string, any>;
    assert.equal(clearedDoc.revision, 3);
    assert.equal(clearedDoc.recipeIngredients, undefined, 'Explicitly clearing recipe removes recipeIngredients');
    assert.equal(clearedDoc.filledRecipes, undefined, 'Disabling variant overrides removes filledRecipes');

    // 11. Acceptance Fixture: 4 ingredients at Rs. 1,001/kg, 200g each
    // Verify each row displays -> Rs. 200 PKR / box, while aggregate preview displays Rs. 801 PKR / box
    await recipeShortcut.click();
    const fixtureIngredients = ['kaju', 'badam', 'akhroot', 'kishmish'];
    for (let i = 0; i < 4; i++) {
      await addIngBtn.click();
      const sel = recipeSection.locator('select').nth(i);
      const grams = recipeSection.locator('input[type="number"]').nth(i);
      await sel.selectOption(fixtureIngredients[i]);
      await grams.fill('200');
    }

    // Verify all 4 rows display "Rs. 200 PKR" per box (nominal rounded line item)
    await page.waitForFunction(() => {
      const text = document.querySelector('#item-section-recipe')?.textContent || '';
      const matches = text.match(/Rs\.\s*200\s*PKR/g);
      return matches && matches.length === 4;
    });

    // Verify aggregate preview displays 800g and Rs. 801 PKR / box
    // (Notice 200 * 4 = 800, but canonical shared estimator computes Rs. 801 PKR)
    await page.waitForFunction(() => {
      const text = document.querySelector('#item-section-recipe')?.textContent || '';
      return text.includes('800g per box') && text.includes('Rs. 801 PKR / box');
    });

    // 12. Mobile (390x844), RTL (Urdu), and Dark Mode checks
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => (window as any).fixtureSetLanguage('ur'));
    await page.waitForFunction(() => document.documentElement.dir === 'rtl' && document.documentElement.classList.contains('rtl'));
    const htmlDir = await page.evaluate(() => document.documentElement.dir);
    assert.equal(htmlDir, 'rtl');
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'ur');

    // Switch theme through supported mechanism
    await page.evaluate(() => (window as any).fixtureSetTheme('dark'));
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);

    // Verify visual parity and horizontal overflow boundaries at 390px in Urdu RTL
    const isDocOverflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(isDocOverflowing, false, 'Document element must not have horizontal overflow at 390px');

    const isDialogOverflowing = await dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    assert.equal(isDialogOverflowing, false, 'Dialog element must not have horizontal overflow at 390px');

    const isRecipeOverflowing = await recipeSection.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    assert.equal(isRecipeOverflowing, false, 'Recipe section must not have horizontal overflow at 390px');

    // Verify recipe controls are visible, usable, and within 390px bounds (not merely textContent presence)
    if (!await recipeSection.evaluate(el => (el as HTMLDetailsElement).open)) {
      await recipeShortcut.click();
    }

    const recipeControls = recipeSection.locator('select, input[type="number"], button');
    const controlCount = await recipeControls.count();
    assert.ok(controlCount >= 8, `Must mount at least 8 recipe controls (found ${controlCount})`);

    for (let i = 0; i < controlCount; i++) {
      const ctrl = recipeControls.nth(i);
      if (await ctrl.isVisible()) {
        assert.equal(await ctrl.isEnabled(), true, `Recipe control #${i} must be enabled and usable`);
        const box = await ctrl.boundingBox();
        assert.ok(box && box.width > 0 && box.height > 0, `Recipe control #${i} must have non-zero dimensions`);
        assert.ok(
          box.x >= -1 && box.x + box.width <= 390 + 1,
          `Recipe control #${i} must remain within 390px viewport (left: ${box.x}, right: ${box.x + box.width})`
        );
      }
    }

    // Verify recipe summary numbers render accurately in Urdu RTL
    const mobileRecipeText = await recipeSection.textContent() || '';
    assert.ok(mobileRecipeText.includes('800'), 'Must contain 800g filling mass');
    assert.ok(mobileRecipeText.includes('801'), 'Must contain Rs. 801 PKR aggregate preview');

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
