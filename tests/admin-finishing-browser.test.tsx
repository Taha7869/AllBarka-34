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

test('admin finishing: section navigation, independent unsaved scopes, pending saves, error focus and responsive accessibility', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-admin-finish-'));
  const { db, records } = memoryFirestore({ 'catalogSettings/main': structuredClone(DEFAULT_CATALOG_CONFIGURATION) });
  let hold = false; let release: (() => void) | undefined; let holdRefresh = false; let releaseRefresh: (() => void) | undefined;
  const entry = `import React,{useState,useEffect}from'react';import{createRoot}from'react-dom/client';
    import AdminItemForm from './src/components/AdminItemForm';import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{CatalogProvider}from'./src/contexts/CatalogContext';
    function Workspace(){const[open,setOpen]=useState(false);const{setLanguage}=useLanguage();useEffect(()=>{window.fixtureLanguage=setLanguage},[setLanguage]);return <><button id="open" onClick={()=>setOpen(true)}>Add fixture item</button>{open&&<AdminItemForm onClose={()=>setOpen(false)} onSaved={p=>{window.fixtureSaved=p;setOpen(false)}}/>}</>}
    createRoot(document.getElementById('root')).render(<LanguageProvider><CatalogProvider><Workspace/></CatalogProvider></LanguageProvider>);`;
  await build({ stdin: { contents: entry, loader: 'tsx', resolveDir: process.cwd(), sourcefile: 'admin-finishing-fixture.tsx' }, bundle: true,
    platform: 'browser', format: 'iife', outfile: path.join(temporary, 'fixture.js'), jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'isolated-auth', setup(builder) { builder.onResolve({ filter: /\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'test-only' }));
      builder.onLoad({ filter: /.*/, namespace: 'test-only' }, () => ({ contents: 'const currentUser={uid:"fixture-owner",getIdToken:async()=>"fixture-owner"};export const useAuth=()=>({currentUser,loading:false});', loader: 'js' })); } }], logLevel: 'silent' });
  const requireAdmin: any = (req: any, res: any, next: any) => { if (req.get('Authorization') !== 'Bearer fixture-owner') return res.status(403).json({ code: 'FORBIDDEN_ADMIN' }); req.user = { uid: 'fixture-owner' }; next(); };
  const app = express(); app.use(express.json());
  app.use('/api/admin/catalog/configuration', async (req, _res, next) => { if (hold && req.method === 'PUT') await new Promise<void>(resolve => { release = resolve; }); next(); });
  app.get('/api/catalog', async (_req, _res, next) => { if (holdRefresh) await new Promise<void>(resolve => { releaseRefresh = resolve; }); next(); });
  app.use(createCatalogConfigurationRouter({ getDb: () => db, requireAdmin })); app.use(createCatalogRouter({ getDb: () => db, requireAdmin }));
  app.use('/assets', express.static(path.resolve('dist/assets'))); app.use('/images', express.static(path.resolve('public/images'))); app.use(express.static(path.resolve('public')));
  app.get('/fixture.js', (_req, res) => res.sendFile(path.join(temporary, 'fixture.js'))); app.get('/fixture.css', (_req, res) => res.sendFile(path.join(temporary, 'fixture.css')));
  const css = (await fs.readdir('dist/assets')).filter(name => name.endsWith('.css')).map(name => `<link rel="stylesheet" href="/assets/${name}">`).join('');
  app.get('/', (_req, res) => res.type('html').send(`<html><head>${css}<link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const browser = await launchTestBrowser();
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(origin); await page.locator('#open').click(); const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Product ID/).first().waitFor();
    const unloadCancelled = () => page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; });
    assert.equal(await unloadCancelled(), false);
    await dialog.getByRole('combobox', { name: 'Go to section', exact: true }).selectOption('seo');
    assert.equal(await dialog.locator('#item-section-seo').getAttribute('open'), '');
    assert.equal(await dialog.locator('#item-section-seo>summary').evaluate(node => node === document.activeElement), true);
    await dialog.getByRole('combobox', { name: 'Go to section', exact: true }).selectOption('identity');
    const name = dialog.locator('#item-section-identity details').first().getByLabel(/^Name/); await name.fill('Finishing fixture');
    assert.equal(await unloadCancelled(), true);
    page.once('dialog', prompt => prompt.dismiss()); await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await dialog.count(), 1); assert.equal(await name.inputValue(), 'Finishing fixture');
    const reloadPrompt = page.waitForEvent('dialog');
    const cdp = await context.newCDPSession(page); const reloadCommand = cdp.send('Page.reload');
    const prompt = await reloadPrompt; assert.equal(prompt.type(), 'beforeunload'); await prompt.dismiss(); await reloadCommand; await cdp.detach();
    assert.equal(await name.inputValue(), 'Finishing fixture', 'cancelled browser reload retains unsaved input');


    const shots = process.env.ALLBARKA_CAPTURE_EVIDENCE === 'true' ? path.resolve('docs/admin-expansion/evidence') : path.join(temporary, 'evidence'); await fs.mkdir(shots, { recursive: true });
    for (const [width, height] of [[360, 800], [390, 844], [1440, 900]] as const) for (const language of ['en', 'ur', 'ar'] as const) for (const dark of [false, true]) {
      await page.setViewportSize({ width, height }); await page.evaluate(({ language, dark }) => { (window as any).fixtureLanguage(language); document.documentElement.classList.toggle('dark', dark); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, { language, dark });
      await page.waitForTimeout(35); assert.equal(await dialog.getAttribute('dir'), language === 'en' ? 'ltr' : 'rtl');
      const shortcuts = dialog.locator('.item-section-nav');
      if (width === 1440) { const button = shortcuts.locator('button[aria-controls="item-section-seo"]'); await button.click(); assert.equal(await dialog.locator('#item-section-seo>summary').evaluate(node => node === document.activeElement), true); assert.ok((await button.boundingBox())!.height >= 44); }
      else { const select = shortcuts.getByRole('combobox'); await select.selectOption('seo'); assert.ok((await select.boundingBox())!.height >= 44); }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}/${language}/${dark}`);
      assert.equal(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth), true);
      if ((width === 360 && language === 'ur' && dark) || (width === 1440 && language === 'en' && !dark)) await page.screenshot({ path: path.join(shots, `admin-finish-${width}-${language}.jpg`), quality: 82 });
    }
    // Enlarge actual computed text/control sizes by 200%, including RTL labels; keep controls reachable.
    for (const width of [360, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await dialog.evaluate(node => { node.querySelectorAll<HTMLElement>('h3,h4,p,button,input,select,textarea,summary,.item-field>span').forEach(element => { element.style.fontSize = `${parseFloat(getComputedStyle(element).fontSize) * 2}px`; }); });
      assert.equal(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth), true, `enlarged text ${width}`);
      const footer = await dialog.locator('.item-actions').boundingBox(); assert.ok(footer && footer.y + footer.height <= 901);
      assert.ok((await dialog.locator('.item-scroll').boundingBox())!.height > 44);
      await dialog.evaluate(node => node.querySelectorAll<HTMLElement>('[style]').forEach(element => { element.style.removeProperty('font-size'); }));
    }
    await page.evaluate(() => (window as any).fixtureLanguage('en')); await page.setViewportSize({ width: 390, height: 844 });
    await dialog.getByRole('combobox', { name: 'Go to section', exact: true }).selectOption('configuration');
    const configuration = dialog.locator('#item-section-configuration'); const taxonomy = configuration.locator(':scope>.item-stack>div').first();
    await taxonomy.getByRole('button', { name: 'Add taxonomy entry', exact: true }).click(); const entryUI = taxonomy.locator('details').last(); await entryUI.locator('summary').click();
    await entryUI.getByLabel(/^Product ID/).fill('finishing-season'); await entryUI.getByLabel(/^Name · EN/).fill('Finishing season');
    assert.equal(await dialog.getByRole('button', { name: 'Save draft', exact: true }).isDisabled(), true);
    assert.equal(await unloadCancelled(), true);
    hold = true; holdRefresh = true; await configuration.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.getAttribute('aria-busy') === 'true');
    assert.equal(await dialog.getByRole('button', { name: 'Close', exact: true }).isDisabled(), true); await page.keyboard.press('Escape'); assert.equal(await dialog.count(), 1);
    assert.equal(await entryUI.getByLabel(/^Name · EN/).isDisabled(), true);
    assert.ok(release); const response = page.waitForResponse(response => response.url().endsWith('/api/admin/catalog/configuration') && response.request().method() === 'PUT'); hold = false; release!();
    assert.equal((await response).status(), 200);
    assert.equal(await dialog.getAttribute('aria-busy'), 'true', 'configuration stays blocked until its catalog refresh settles');
    assert.equal(await dialog.getByRole('button', { name: 'Close', exact: true }).isDisabled(), true);
    await page.waitForTimeout(20); assert.ok(releaseRefresh); holdRefresh = false; releaseRefresh!();
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.getAttribute('aria-busy') === 'false');
    assert.equal(await name.inputValue(), 'Finishing fixture'); assert.equal(await unloadCancelled(), true, 'configuration save must not clear unsaved item edits');
    // Saving the item is allowed only after its independent configuration edits were saved.
    await dialog.getByRole('button', { name: 'Save draft', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
    assert.equal((records.get('products/finishing-fixture') as any).name_en, 'Finishing fixture'); assert.equal(await unloadCancelled(), false);
    assert.equal(await page.locator('#open').evaluate(node => node === document.activeElement), true);
    // A config-only edit also guards dismissal; a real stale revision preserves input and focuses its error.
    await page.locator('#open').click(); await dialog.getByLabel(/^Product ID/).first().waitFor();
    await dialog.getByRole('combobox', { name: 'Go to section', exact: true }).selectOption('configuration');
    const first = configuration.locator('details').first(); await first.locator('summary').click(); await first.getByLabel(/^Name · EN/).fill('Unsaved taxonomy title');
    assert.equal(await unloadCancelled(), true, 'configuration-only edits must be protected');
    (records.get('catalogSettings/main') as any).revision += 1;
    const conflict = page.waitForResponse(response => response.url().endsWith('/api/admin/catalog/configuration') && response.status() === 409);
    await configuration.getByRole('button', { name: 'Save changes', exact: true }).click(); await conflict; const alert = configuration.getByRole('alert'); await alert.waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'alert');
    assert.equal(await first.getByLabel(/^Name · EN/).inputValue(), 'Unsaved taxonomy title'); assert.equal(await unloadCancelled(), true);
    page.once('dialog', prompt => prompt.dismiss()); await page.keyboard.press('Escape'); assert.equal(await dialog.count(), 1);
    page.once('dialog', prompt => prompt.accept()); await dialog.getByRole('button', { name: 'Close', exact: true }).click(); await dialog.waitFor({ state: 'detached' }); assert.equal(await unloadCancelled(), false);
    assert.ok(errors.every(error => error.includes('409')), JSON.stringify(errors)); await context.close();
  } finally { release?.(); releaseRefresh?.(); await browser.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await fs.rm(temporary, { recursive: true, force: true }); }
});
