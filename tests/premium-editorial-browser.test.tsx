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
test('editorial journal and story: discovery, article contents, share failures and related cart', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-hero-'));
  const { db } = memoryFirestore(Object.fromEntries(PRODUCTS.map(product => [`products/${product.id}`, product])));
  const entry = `import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,useNavigate}from'react-router-dom';
import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{ThemeProvider,useTheme}from'./src/contexts/ThemeContext';import{CartProvider,useCart}from'./src/contexts/CartContext';import{CatalogProvider}from'./src/contexts/CatalogContext';import{MerchandisingProvider}from'./src/contexts/MerchandisingContext';import{ProductMediaProvider}from'./src/contexts/ProductMediaContext';import{StorefrontContentProvider,useStorefrontContentRefresh}from'./src/contexts/StorefrontContentContext';
import JournalPage from'./src/pages/JournalPage';import InfoPage from'./src/pages/InfoPage';import RootLayout from'./src/layouts/RootLayout';import HomePage from'./src/pages/HomePage';import ShopPage from'./src/pages/ShopPage';import ProductDetailPage from'./src/pages/ProductDetailPage';import CartPage from'./src/pages/CartPage';import CheckoutPage from'./src/pages/CheckoutPage';import{PRODUCTS}from'./src/data/products';
function Controls(){const{setLanguage}=useLanguage();const{setTheme}=useTheme();const refresh=useStorefrontContentRefresh();const cart=useCart();useEffect(()=>{window.fixture={refresh,lang:setLanguage,theme:setTheme,cart:cart.cartItems,close:()=>cart.setIsCartOpen(false),clear:()=>cart.clearCart()};});return null;}
createRoot(document.getElementById('root')).render(<BrowserRouter><ThemeProvider><LanguageProvider><CatalogProvider initialProducts={PRODUCTS}><MerchandisingProvider><ProductMediaProvider><CartProvider><StorefrontContentProvider><Controls/><Routes><Route path="/" element={<RootLayout/>}><Route index element={<HomePage/>}/><Route path="shop" element={<ShopPage/>}/><Route path="shop/:category" element={<ShopPage/>}/><Route path="product/:id" element={<ProductDetailPage/>}/><Route path="cart" element={<CartPage/>}/><Route path="checkout" element={<CheckoutPage/>}/><Route path="gifting" element={<ShopPage/>}/><Route path="journal" element={<JournalPage/>}/><Route path="journal/:slug" element={<JournalPage/>}/><Route path="story" element={<InfoPage asPage initialTab="our-story"/>}/></Route></Routes></StorefrontContentProvider></CartProvider></ProductMediaProvider></MerchandisingProvider></CatalogProvider></LanguageProvider></ThemeProvider></BrowserRouter>);`;
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
  // Follow the current Vite entry, not stale CSS left by an interrupted build.
  const builtHtml=await fs.readFile('dist/index.html','utf8');
  const styles=[...builtHtml.matchAll(/<link\b[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g)].map(match=>match[1]);
  assert.ok(styles.length,'current production stylesheet');
  const css=styles.map(href=>`<link rel="stylesheet" href="${href}">`).join('');
  app.get(/.*/, (req,res)=>req.path.startsWith('/api/')?res.status(404).json({code:'NOT_FOUND'}):res.type('html').send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css}<style>@font-face{font-family:Amiri;src:url(/fonts/Amiri-Regular.ttf)}@font-face{font-family:"Noto Nastaliq Urdu";src:url(/fonts/NotoNastaliqUrdu.ttf)}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;const browser=await launchTestBrowser();
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.fulfill({status:200,body:''}));
    const page=await context.newPage();page.setDefaultTimeout(30000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    const evidence=process.env.ALLBARKA_CAPTURE_EVIDENCE==='true'?path.resolve('docs/evidence/premium-editorial'):path.join(temporary,'evidence');await fs.mkdir(evidence,{recursive:true});
    if(process.env.ALLBARKA_EDITORIAL_BASELINE==='true'){
      for(const route of ['journal','story']){await page.goto(origin+'/'+route);await page.locator('h1').waitFor();await page.screenshot({path:path.join(evidence,`before-${route}-1440.jpg`),quality:78,animations:'disabled'});}return;
    }
    await page.goto(origin+'/journal');await page.locator('.journal-feature').waitFor();
    const firstHref=await page.locator('.journal-feature a').first().getAttribute('href');
    await page.getByRole('button',{name:'Buying Guides',exact:true}).click();
    assert.equal(await page.locator(`.journal-grid a[href="${firstHref}"]`).count()>0,true,'featured entry remains present in its category results');
    await page.getByRole('searchbox').fill('zzzz-not-an-article');await page.getByRole('button',{name:'Reset filters',exact:true}).click();await page.locator('.journal-feature').waitFor();
    await page.locator('.journal-feature a').first().click();await page.locator('.journal-article').waitFor();
    await page.locator('.journal-contents a').first().click();assert.ok(new URL(page.url()).hash.startsWith('#article-section-'));
    await page.evaluate("Object.defineProperty(navigator,'share',{configurable:true,value:undefined}); Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}})");
    await page.getByRole('button',{name:'Share article',exact:true}).click();await page.getByRole('status').filter({hasText:'Could not share'}).waitFor();
    const card=page.locator('.journal-related .boutique-product-card').first();await card.waitFor();await card.locator('[data-confirmed]').click();
    await page.waitForFunction(()=>(window as any).fixture.cart.length>0);await page.evaluate(()=>{(window as any).fixture.close();(window as any).fixture.clear();});
    const layouts=[];
    for(const route of ['journal','journal/choosing-pack-sizes','story'])for(const width of [390,1440])for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await page.goto(origin+'/'+route);await page.locator('h1').waitFor();await page.setViewportSize({width,height:1000});
      await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);window.scrollTo({top:0,behavior:'instant'});},{language,theme});
      const painted=await page.screenshot({type:'jpeg',quality:78,animations:'disabled'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route}/${width}/${language}/${theme}: ${JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('article *')].filter(e=>e.getBoundingClientRect().width>innerWidth).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width})).slice(0,8)))}`);layouts.push({route,width,language,theme});
      if(language==='en'&&theme==='light')await fs.writeFile(path.join(evidence,`after-${route.replace('/','-')}-${width}.jpg`),painted);
    }
    await page.goto(origin+'/story');await page.locator('.heritage-story').waitFor();
    assert.doesNotMatch(await page.locator('.story-paths').innerText(),/table\.secondary|hero\.exploreGifts/);
    await page.locator('.story-journal-link a').click();await page.waitForURL('**/journal');
    await page.goto(origin+'/journal/not-real');await page.locator('.journal-empty').waitFor();
    await fs.writeFile(path.join(evidence,'layouts.json'),JSON.stringify(layouts,null,2));assert.deepEqual(errors,[]);
  }finally{await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(temporary,{recursive:true,force:true});}
});
