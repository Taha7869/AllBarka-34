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
test('editorial product detail: food and packaging layouts, selected totals, gallery and responsive parity', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-hero-'));
  const { db } = memoryFirestore(Object.fromEntries(PRODUCTS.map(product => [`products/${product.id}`, product])));
  const entry = `import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,useNavigate}from'react-router-dom';
import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{ThemeProvider,useTheme}from'./src/contexts/ThemeContext';import{CartProvider,useCart}from'./src/contexts/CartContext';import{CatalogProvider}from'./src/contexts/CatalogContext';import{MerchandisingProvider}from'./src/contexts/MerchandisingContext';import{ProductMediaProvider}from'./src/contexts/ProductMediaContext';import{StorefrontContentProvider,useStorefrontContentRefresh}from'./src/contexts/StorefrontContentContext';
import RootLayout from'./src/layouts/RootLayout';import HomePage from'./src/pages/HomePage';import ShopPage from'./src/pages/ShopPage';import ProductDetailPage from'./src/pages/ProductDetailPage';import CartPage from'./src/pages/CartPage';import CheckoutPage from'./src/pages/CheckoutPage';import{PRODUCTS}from'./src/data/products';
function Controls(){const{setLanguage}=useLanguage();const{setTheme}=useTheme();const refresh=useStorefrontContentRefresh();const cart=useCart();useEffect(()=>{window.fixture={refresh,lang:setLanguage,theme:setTheme,cart:cart.cartItems,close:()=>cart.setIsCartOpen(false),clear:()=>cart.clearCart()};});return null;}
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
  // Follow the current Vite entry, not stale CSS left by an interrupted build.
  const builtHtml=await fs.readFile('dist/index.html','utf8');
  const styles=[...builtHtml.matchAll(/<link\b[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g)].map(match=>match[1]);
  assert.ok(styles.length,'current production stylesheet');
  const css=styles.map(href=>`<link rel="stylesheet" href="${href}">`).join('');
  app.get(/.*/, (req,res)=>req.path.startsWith('/api/')?res.status(404).json({code:'NOT_FOUND'}):res.type('html').send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css}<style>@font-face{font-family:Amiri;src:url(/fonts/Amiri-Regular.ttf)}@font-face{font-family:"Noto Nastaliq Urdu";src:url(/fonts/NotoNastaliqUrdu.ttf)}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;const browser=await launchTestBrowser();
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
    await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.fulfill({status:200,body:''}));
    const page=await context.newPage();page.setDefaultTimeout(30000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    const evidence=process.env.ALLBARKA_CAPTURE_EVIDENCE==='true'?path.resolve('docs/evidence/premium-v3'):path.join(temporary,'evidence');await fs.mkdir(evidence,{recursive:true});
    await page.goto(origin+'/product/pista');await page.locator('h1').waitFor();
    if(process.env.ALLBARKA_PDP_BASELINE==='true'){
      for(const width of [1440,390]){await page.setViewportSize({width,height:1100});await page.screenshot({path:path.join(evidence,`before-${width}.jpg`),quality:80,animations:'disabled'});}return;
    }
    const summary=page.locator('.pdp-selection-summary');await summary.waitFor();
    await page.getByRole('button',{name:'500g',exact:true}).click();
    await page.getByRole('button',{name:'Increase quantity',exact:true}).click();
    assert.match(await summary.innerText(),/500g/);assert.match(await summary.innerText(),/5,000/);
    await page.locator('.pdp-purchase [data-confirmed]').click();
    await page.waitForFunction(()=>(window as any).fixture.cart.some((item:any)=>item.productId==='pista'&&item.selectedWeight==='500g'&&item.quantity===2));
    await page.evaluate(()=>{(window as any).fixture.close();(window as any).fixture.clear();});
    await page.getByRole('button',{name:/View photos/}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
    const layouts=[];
    for(const width of [360,390,768,1440])for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:1100});await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);window.scrollTo({top:0,behavior:'instant'});},{language,theme});
      const painted=await page.screenshot({animations:'disabled',type:'jpeg',quality:80});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}/${language}/${theme}`);
      assert.equal(await page.locator('.pdp-editorial').getAttribute('dir'),language==='en'?'ltr':'rtl');
      const geometry=await summary.evaluate(e=>({width:e.getBoundingClientRect().width,overflow:e.scrollWidth>e.clientWidth+1}));assert.equal(geometry.overflow,false);layouts.push({width,language,theme,...geometry});
      if((width===1440||width===390)&&language==='en'&&theme==='light')await fs.writeFile(path.join(evidence,`after-${width}.jpg`),painted);
      if(width===390&&language==='ur'&&theme==='dark')await fs.writeFile(path.join(evidence,'after-390-ur-dark.jpg'),painted);
    }
    await page.evaluate(()=>{(window as any).fixture.lang('en');(window as any).fixture.theme('light');});
    const packaging=PRODUCTS.find(p=>p.isBidBox&&Object.keys(p.prices).length>0)!;assert.ok(packaging);
    await page.goto(origin+'/product/'+packaging.id);await page.locator('.pdp-editorial[data-product-kind="packaging"]').waitFor();
    assert.equal(await page.locator('.pdp-food-notes').count(),0);
    await page.setViewportSize({width:1440,height:1100});await page.screenshot({path:path.join(evidence,'packaging-1440.jpg'),quality:80,animations:'disabled'});
    await page.setViewportSize({width:390,height:1100});await page.evaluate(()=>{(window as any).fixture.lang('ur');(window as any).fixture.theme('dark');});
    await page.screenshot({path:path.join(evidence,'packaging-390-ur-dark.jpg'),quality:80,animations:'disabled'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.evaluate(()=>{(window as any).fixture.lang('en');(window as any).fixture.theme('light');});await page.screenshot();
    await page.goto(origin+'/product/not-a-real-selection');await page.locator('.pdp-empty').waitFor();
    assert.match(await page.locator('h1').innerText(),/Selection unavailable/);
    await page.locator('.pdp-empty').getByRole('button',{name:'Shop',exact:true}).click();await page.waitForURL('**/shop');
    const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    await touch.route('**/*',r=>{const u=new URL(r.request().url());return u.origin!==origin?r.fulfill({status:200,body:''}):u.pathname.startsWith('/images/')?r.abort():r.continue();});
    const failed=await touch.newPage();failed.setDefaultTimeout(30000);await failed.goto(origin+'/product/pista');await failed.locator('.pdp-photo-fallback').waitFor();
    await failed.getByRole('button',{name:'500g',exact:true}).tap();assert.match(await failed.locator('.pdp-selection-summary').innerText(),/500g/);
    assert.equal(await failed.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await touch.close();
    await fs.writeFile(path.join(evidence,'layouts.json'),JSON.stringify(layouts,null,2));assert.deepEqual(errors,[]);
  }finally{await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(temporary,{recursive:true,force:true});}
});
