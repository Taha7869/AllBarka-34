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
test('premium browsing: selected portion, cart, responsive card parity and shop navigation', async () => {
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
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.fulfill({status:200,body:''}));
    const page=await context.newPage();page.setDefaultTimeout(30000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    const evidence=process.env.ALLBARKA_CAPTURE_EVIDENCE==='true'?path.resolve('docs/evidence/premium-v2'):path.join(temporary,'evidence');await fs.mkdir(evidence,{recursive:true});
    await page.goto(origin+'/shop/nuts');await page.locator('.table-catalog-card').first().waitFor();
    const card=page.locator('[data-product-id="pista"]');await card.waitFor();
    const option=Object.keys(PRODUCTS.find(p=>p.id==='pista')!.prices)[1];
    await card.locator('select').selectOption(option);
    assert.match(await card.innerText(),new RegExp(PRODUCTS.find(p=>p.id==='pista')!.prices[option].toLocaleString()));
    await card.locator('[data-confirmed]').click();
    await page.waitForFunction(option=>(window as any).fixture.cart.some((item:any)=>item.productId==='pista'&&item.selectedWeight===option),option);
    await page.evaluate(()=>{(window as any).fixture.close();(window as any).fixture.clear();});
    await page.getByRole('button',{name:/Discover more/}).click();
    assert.equal(await page.locator('.table-catalog-card').count(),22);
    await page.evaluate(()=>window.scrollTo({top:700,behavior:'instant'}));
    await page.waitForFunction(()=>window.scrollY>650);await page.waitForTimeout(80);
    const previousY=await page.evaluate(()=>window.scrollY);
    await card.locator('a[lang]').evaluate((e:HTMLAnchorElement)=>e.click());await page.waitForURL('**/product/pista');
    await page.goBack();await card.waitFor();
    await page.waitForFunction(y=>Math.abs(window.scrollY-y)<3,previousY);
    assert.equal(await page.locator('.table-catalog-card').count(),22);
    const layouts=[];
    for(const width of [360,390,768,1440])for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:1000});await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);},{language,theme});
      await page.screenshot({animations:'disabled'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}/${language}/${theme}`);
      const geometry=await card.evaluate(e=>({width:e.getBoundingClientRect().width,overflow:e.scrollWidth>e.clientWidth+1,targets:[...e.querySelectorAll('button,select')].map(b=>b.getBoundingClientRect().height)}));
      assert.equal(geometry.overflow,false);assert.ok(geometry.targets.every(h=>h>=44));layouts.push({width,language,theme,...geometry});
      if((width===390||width===1440)&&language==='en'&&theme==='light')await page.screenshot({path:path.join(evidence,`shop-${width}.jpg`),quality:82,animations:'disabled'});
    }
    await page.evaluate(()=>{(window as any).fixture.lang('en');(window as any).fixture.theme('light');});await page.setViewportSize({width:390,height:844});
    await page.locator('.catalog-quick-controls button[aria-controls]').click();
    const sheet=page.getByRole('dialog');await sheet.waitFor();
    await sheet.locator('input[type=range]').fill('1000');
    await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).searchParams.has('budget'),false,'cancelled filters never apply');
    await page.locator('.catalog-quick-controls button[aria-controls]').click();await sheet.waitFor();
    await sheet.locator('input[type=range]').fill('1000');
    await sheet.locator('.catalog-filter-apply').click();await sheet.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).searchParams.get('budget'),'1000');
    await page.getByRole('combobox').first().fill('zzzz-no-product');
    await page.locator('#plp-products-grid').waitFor({state:'hidden'});
    await page.setViewportSize({width:1440,height:1200});
    await page.goto(origin);await page.locator('.boutique-product-card').first().waitFor();
    const home=page.locator('.boutique-product-card').first();await home.scrollIntoViewIfNeeded();
    await home.screenshot({path:path.join(evidence,'home-card.jpg'),quality:82,animations:'disabled'});
    assert.equal(await home.locator('.product-gallery').count(),1);
    await fs.writeFile(path.join(evidence,'layouts.json'),JSON.stringify(layouts,null,2));assert.deepEqual(errors,[]);
  }finally{await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(temporary,{recursive:true,force:true});}
});
