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

// Real components, cart, routers and isolated persistence. Auth is isolated; no live provider writes.
test('signature table: real-route layout, discovery, custom content and media recovery', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-hero-'));
  const { db } = memoryFirestore(Object.fromEntries(PRODUCTS.map(product => [`products/${product.id}`, product])));
  const entry = `import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,useNavigate}from'react-router-dom';
import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{ThemeProvider,useTheme}from'./src/contexts/ThemeContext';import{CartProvider}from'./src/contexts/CartContext';import{CatalogProvider}from'./src/contexts/CatalogContext';import{MerchandisingProvider}from'./src/contexts/MerchandisingContext';import{ProductMediaProvider}from'./src/contexts/ProductMediaContext';import{StorefrontContentProvider,useStorefrontContentRefresh}from'./src/contexts/StorefrontContentContext';
import RootLayout from'./src/layouts/RootLayout';import HomePage from'./src/pages/HomePage';import ShopPage from'./src/pages/ShopPage';import ProductDetailPage from'./src/pages/ProductDetailPage';import CartPage from'./src/pages/CartPage';import CheckoutPage from'./src/pages/CheckoutPage';import{PRODUCTS}from'./src/data/products';
function Controls(){const{setLanguage}=useLanguage();const{setTheme}=useTheme();const refresh=useStorefrontContentRefresh();useEffect(()=>{window.fixture={refresh,lang:setLanguage,theme:setTheme};});return null;}
createRoot(document.getElementById('root')).render(<BrowserRouter><ThemeProvider><LanguageProvider><CatalogProvider initialProducts={PRODUCTS}><MerchandisingProvider><ProductMediaProvider><CartProvider><StorefrontContentProvider><Controls/><Routes><Route path="/" element={<RootLayout/>}><Route index element={<HomePage/>}/><Route path="shop" element={<ShopPage/>}/><Route path="shop/:category" element={<ShopPage/>}/><Route path="product/:id" element={<ProductDetailPage/>}/><Route path="cart" element={<CartPage/>}/><Route path="checkout" element={<CheckoutPage/>}/><Route path="gifting" element={<ShopPage/>}/></Route></Routes></StorefrontContentProvider></CartProvider></ProductMediaProvider></MerchandisingProvider></CatalogProvider></LanguageProvider></ThemeProvider></BrowserRouter>);`;
  await build({ stdin: { contents: entry, loader: 'tsx', resolveDir: process.cwd(), sourcefile: 'interaction-fixture.tsx' },
    bundle: true, format: 'iife', platform: 'browser', outfile: path.join(temporary, 'fixture.js'), jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent', plugins: [{ name: 'isolated-auth', setup(builder) {
      builder.onResolve({ filter: /\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'isolated' }));
      builder.onLoad({ filter: /.*/, namespace: 'isolated' }, () => ({ contents: 'export const useAuth=()=>({currentUser:null,patronProfile:null,loading:false,logout:async()=>{}});', loader: 'js' }));
    } }] });
  const app = express(); app.use(express.json());
  const requireAdmin: any = (_req: any, res: any) => res.status(403).json({ code: 'FORBIDDEN_ADMIN' });
  app.use(createCatalogRouter({ getDb: () => db, requireAdmin }));
  app.use(createCatalogConfigurationRouter({ getDb: () => db, requireAdmin }));
  app.use(createStorefrontContentRouter({ getDb: () => db, requireAdmin }));
  app.get('/api/product-media', (_req, res) => res.json({ overrides: {} }));
  for(const folder of ['images','fonts','videos'])app.use('/'+folder,express.static(path.resolve('public',folder)));
  app.use('/assets',express.static(path.resolve('dist/assets')));
  app.get('/fixture.js',(_req,res)=>res.sendFile(path.join(temporary,'fixture.js')));
  const css=(await fs.readdir('dist/assets')).filter(f=>f.endsWith('.css')).map(f=>`<link rel="stylesheet" href="/assets/${f}">`).join('');
  app.get(/.*/, (req,res)=>req.path.startsWith('/api/')?res.status(404).json({code:'NOT_FOUND'}):res.type('html').send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css}<style>@font-face{font-family:Amiri;src:url(/fonts/Amiri-Regular.ttf)}@font-face{font-family:"Noto Nastaliq Urdu";src:url(/fonts/NotoNastaliqUrdu.ttf)}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;const browser=await launchTestBrowser();
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});context.setDefaultTimeout(10000);
    await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.fulfill({status:200,body:''}));
    const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin);await page.locator('.heritage-hero').waitFor();
    const shots=process.env.ALLBARKA_CAPTURE_EVIDENCE==='true'?path.resolve('docs/evidence/premium-v1'):path.join(temporary,'evidence');await fs.mkdir(shots,{recursive:true});
    if(process.env.ALLBARKA_HERO_BASELINE==='true'){
      for(const width of [1440,390]){await page.setViewportSize({width,height:width===390?844:1000});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);await page.screenshot({path:path.join(shots,`before-${width}.jpg`),quality:82});}return;
    }
    const layouts=[];
    for(const width of [360,390,768,1024,1440])for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:width<768?844:1000});
      await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);window.scrollTo({top:0,behavior:'instant'});},{language,theme});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(50);
      assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.heritage-hero').getAttribute('dir'),language==='en'?'ltr':'rtl');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width}/${language}/${theme}`);
      const boxes=await page.evaluate(()=>Object.fromEntries(Object.entries({hero:'.heritage-hero',art:'.table-hero-art',tools:'.table-discovery',primary:'.table-hero-primary',submit:'.table-discovery button[type=submit]'}).map(([key,selector])=>{const r=document.querySelector(selector)!.getBoundingClientRect();return [key,{top:r.top,bottom:r.bottom,height:r.height,width:r.width}];})));
      assert.ok(boxes.tools.top>=boxes.hero.bottom-1);assert.ok(boxes.primary.height>=44&&boxes.submit.height>=44&&boxes.submit.width>=44);
      if(language==='en'&&width<768){assert.ok(boxes.primary.bottom<844);assert.ok(boxes.art.top<844);}
      layouts.push({width,language,theme,...boxes});
      if(([390,1440].includes(width)&&language==='en'&&theme==='light')||(width===390&&language==='ur'&&theme==='dark')||(width===1440&&language==='ar'&&theme==='dark'))await page.screenshot({path:path.join(shots,`after-${width}-${language}-${theme}.jpg`),quality:82});
    }
    await page.evaluate(()=>{(window as any).fixture.lang('en');(window as any).fixture.theme('light');});await page.setViewportSize({width:390,height:844});
    const search=page.locator('#hero-search-input');await search.fill('pistachio');await page.locator('.boutique-suggestion').first().waitFor();
    await page.keyboard.press('ArrowDown');assert.equal(await page.locator('.boutique-suggestion').first().evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Escape');assert.equal(await search.evaluate(e=>e===document.activeElement),true);assert.equal(await search.getAttribute('aria-expanded'),'false');
    await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');assert.equal(await page.locator('.boutique-suggestion').last().evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Escape');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.waitForURL('**/product/pista');
    await page.goto(origin);await search.fill('missing-xyz');await page.locator('.boutique-search-empty').waitFor();await page.keyboard.press('Escape');await search.fill('walnut');await page.keyboard.press('Enter');await page.waitForURL('**/shop?search=walnut');
    await page.goto(origin);await page.locator('.table-category-pill').filter({hasText:'Pistachios'}).click();await page.waitForURL(/shop\/nuts.*pistachio/);
    await page.goto(origin);await page.locator('.heritage-hero-guide').click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await page.locator('.heritage-hero-guide').evaluate(e=>e===document.activeElement),true);
    await page.locator('.table-hero-secondary').click();await page.waitForURL('**/gifting');await page.goto(origin);await page.locator('.table-hero-primary').click();await page.waitForURL('**/shop/dry-fruits');await page.goto(origin);
    // Enlarged root text includes the real header and existing homepage sections.
    for(const width of [360,1440]){
      await page.setViewportSize({width,height:700});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.waitForFunction(()=>getComputedStyle(document.documentElement).fontSize==='32px');await page.waitForTimeout(100);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`200% text ${width}`);
    }
    await page.evaluate(()=>document.documentElement.style.fontSize='');await page.waitForFunction(()=>getComputedStyle(document.documentElement).fontSize==='16px');await page.setViewportSize({width:844,height:390});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'landscape');
    const {DEFAULT_STOREFRONT_CONTENT}=await import('../src/lib/storefrontContent');const custom=structuredClone(DEFAULT_STOREFRONT_CONTENT);
    custom.hero={...custom.hero,enabled:true,heading:{en:'Merchant headline',ur:'تاجر کا پیغام',ar:'رسالة المتجر'},accent:{en:'For this season',ur:'',ar:''},description:{en:'Published editorial copy',ur:'',ar:''},primaryLabel:{en:'Browse dates',ur:'',ar:''},primaryPath:'/shop/dates',secondaryLabel:{en:'Choose a gift',ur:'',ar:''},secondaryPath:'/gifting',image:'/images/dryfruit_flatlay_hero.webp',mobileImage:'/images/dryfruit_flatlay_hero_mobile.webp'};
    await page.route('**/api/storefront-content',r=>r.fulfill({json:{content:custom}}));await page.evaluate(()=>(window as any).fixture.refresh());await page.getByRole('heading',{name:'Merchant headline For this season'}).waitFor();assert.equal(await page.locator('.table-hero-primary').getAttribute('href'),'/shop/dates');assert.equal(await page.locator('.table-gift-figure').count(),0);
    await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector<HTMLImageElement>('.heritage-hero-background img')?.currentSrc.includes('mobile'));
    await page.locator('.table-hero-art').scrollIntoViewIfNeeded();
    const before=await page.locator('.table-hero-art').boundingBox();custom.hero.mobileImage='/images/failed-hero.webp';await page.route('**/images/failed-*',r=>r.abort());await page.evaluate(()=>(window as any).fixture.refresh());await page.waitForFunction(()=>document.querySelector<HTMLImageElement>('.heritage-hero-background img')?.style.visibility==='hidden');assert.equal((await page.locator('.table-hero-art').boundingBox())!.height,before!.height);assert.equal(await page.locator('.table-hero-primary').isVisible(),true);
    await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>{const i=document.querySelector<HTMLImageElement>('.heritage-hero-background img');return i?.naturalWidth&&getComputedStyle(i).visibility==='visible';});assert.equal(await page.locator('.heritage-hero-background img').evaluate(e=>getComputedStyle(e).animationName),'none');
    const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});touch.setDefaultTimeout(10000);
    await touch.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.fulfill({status:200,body:''});if(u.pathname.startsWith('/fonts/')||u.pathname.includes('dryfruit_flatlay_hero')||u.pathname.includes('gift-box-1.webp'))return r.abort();return r.continue();});const mobile=await touch.newPage();mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(origin);await mobile.locator('.table-hero-primary').waitFor();await mobile.waitForFunction(()=>document.querySelector<HTMLImageElement>('.heritage-hero-background img')?.style.visibility==='hidden');assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await mobile.locator('.heritage-hero-guide').tap();await mobile.getByRole('dialog').waitFor();await mobile.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).tap();await mobile.getByRole('dialog').waitFor({state:'hidden'});await mobile.locator('.table-hero-secondary').tap();await mobile.waitForURL('**/gifting');await touch.close();
    await fs.writeFile(path.join(shots,'layout-matrix.json'),JSON.stringify({source:'isolated real-route fixture; external resources blocked',layouts},null,2));assert.deepEqual(errors,[]);
  }finally{await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(temporary,{recursive:true,force:true});}
});
