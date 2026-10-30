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
import { HAMPER_BOX_SEEDS } from '../src/lib/hamperBoxSchema';
import { hamperSelectionPrice } from '../src/lib/hamperCatalog';
import { PRODUCTS } from '../src/data/products';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { createCatalogConfigurationRouter } from '../src/lib/catalogConfigurationRouter';
import { createStorefrontContentRouter } from '../src/lib/storefrontContentRouter';

// Real components, cart, routers and isolated persistence. Auth is isolated; no live provider writes.
test('gift atelier: discovery, current catalogue total, message preview and saved hamper', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-hero-'));
  const fixtureProducts=PRODUCTS.map(product=>product.id==='pista'?{...product,prices:{...product.prices,'1kg':(product.prices['1kg']||4500)+500,'250g':product.prices['250g']+500}}:product);
  const { db } = memoryFirestore(Object.fromEntries([...fixtureProducts.map(product => [`products/${product.id}`, product] as const),...HAMPER_BOX_SEEDS.map(box=>[`hamperBoxes/${box.id}`,{schemaVersion:1,boxId:box.id,revision:0,price:box.price,active:true}] as const)]));
  const entry = `import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,useNavigate}from'react-router-dom';
import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{ThemeProvider,useTheme}from'./src/contexts/ThemeContext';import{CartProvider,useCart}from'./src/contexts/CartContext';import{CatalogProvider,useCatalogProducts}from'./src/contexts/CatalogContext';import{MerchandisingProvider}from'./src/contexts/MerchandisingContext';import{ProductMediaProvider}from'./src/contexts/ProductMediaContext';import{StorefrontContentProvider,useStorefrontContentRefresh}from'./src/contexts/StorefrontContentContext';
import RootLayout from'./src/layouts/RootLayout';import HomePage from'./src/pages/HomePage';import ShopPage from'./src/pages/ShopPage';import ProductDetailPage from'./src/pages/ProductDetailPage';import CartPage from'./src/pages/CartPage';import CheckoutPage from'./src/pages/CheckoutPage';import{PRODUCTS}from'./src/data/products';
function Controls(){const{setLanguage}=useLanguage();const{setTheme}=useTheme();const refresh=useStorefrontContentRefresh();const cart=useCart();const catalog=useCatalogProducts();useEffect(()=>{window.fixture={refresh,lang:setLanguage,theme:setTheme,cart:cart.cartItems,catalog,close:()=>cart.setIsCartOpen(false),clear:()=>cart.clearCart()};});return null;}
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
    const evidence=process.env.ALLBARKA_CAPTURE_EVIDENCE==='true'?path.resolve('docs/evidence/premium-gifting'):path.join(temporary,'evidence');await fs.mkdir(evidence,{recursive:true});
    await page.goto(origin+'/gifting?utm_source=fixture');await page.locator('h1').waitFor();
    if(process.env.ALLBARKA_GIFT_BASELINE==='true'){
      await page.screenshot({path:path.join(evidence,'before-gifting-1440.jpg'),quality:78,animations:'disabled'});
      await page.getByRole('button',{name:/Launch Hamper Builder|Open Hamper Builder|Build Your Hamper|Create Your Hamper|Build a Hamper/i}).first().click();await page.getByRole('dialog').waitFor();
      await page.screenshot({path:path.join(evidence,'before-builder-1440.jpg'),quality:78,animations:'disabled'});return;
    }
    await page.waitForFunction(price=>(window as any).fixture.catalog.find((p:any)=>p.id==='pista')?.prices['250g']===price,fixtureProducts.find(p=>p.id==='pista')!.prices['250g']);
    const layouts=[];
    for(const width of [360,390,768,1440])for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:width<768?844:1000});await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);window.scrollTo({top:0,behavior:'instant'});},{language,theme});
      const painted=await page.screenshot({type:'jpeg',quality:78,animations:'disabled'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`landing ${width}/${language}/${theme}`);layouts.push({surface:'landing',width,language,theme});
      if(width===360&&language==='en'){assert.ok(await page.locator('.gift-opening figure img').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'mobile gift photo is visible early');assert.ok(await page.locator('.gift-open-builder').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'mobile main action is visible early');}
      if([390,1440].includes(width)&&language==='en'&&theme==='light')await fs.writeFile(path.join(evidence,`after-gifting-${width}.jpg`),painted);
    }
    for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await page.setViewportSize({width:360,height:844});await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);},{language,theme});await page.screenshot({animations:'disabled'});
      await page.evaluate(()=>{const changes=[...document.querySelectorAll<HTMLElement>('.gift-destination *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent?.trim())).map(e=>[e,e.style.fontSize,e.style.lineHeight,parseFloat(getComputedStyle(e).fontSize)*2,parseFloat(getComputedStyle(e).lineHeight)*2] as const);(window as any).giftFontRestore=changes;changes.forEach(([e,,,size,line])=>{e.style.fontSize=size+'px';if(Number.isFinite(line))e.style.lineHeight=line+'px';});});await page.screenshot({animations:'disabled'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`landing doubled text ${language}/${theme}`);
      await page.evaluate(()=>(window as any).giftFontRestore.forEach(([e,font,line]:any[])=>{e.style.fontSize=font;e.style.lineHeight=line;}));
    }
    const referenceImage=page.locator('.gift-opening figure img');const referenceSource=await referenceImage.getAttribute('src');await referenceImage.dispatchEvent('error');assert.match(await referenceImage.getAttribute('src')||'',/product-placeholder\.svg$/);await referenceImage.evaluate((image,src)=>{image.setAttribute('src',src!);},referenceSource);
    await page.evaluate(()=>{(window as any).fixture.lang('en');(window as any).fixture.theme('light');});await page.setViewportSize({width:390,height:1000});await page.screenshot();
    await page.locator('.gift-occasions button').nth(1).click();assert.equal(new URL(page.url()).searchParams.get('occasion'),'wedding');assert.equal(new URL(page.url()).searchParams.get('utm_source'),'fixture');await page.locator('.gift-occasions button').first().click();
    await page.locator('.gift-budget button').nth(1).click();assert.equal(new URL(page.url()).searchParams.get('budget'),'3000');assert.equal(new URL(page.url()).searchParams.get('utm_source'),'fixture');
    await page.locator('.gift-budget button').first().click();assert.equal(new URL(page.url()).searchParams.has('budget'),false);
    const unavailablePortion=async(route:any)=>{const response=await route.fetch();const data=await response.json();data.products=data.products.filter((product:any)=>product.id!=='pista');data.version+='-unavailable-portion';await route.fulfill({response,json:data});};
    await page.route('**/api/catalog',unavailablePortion);await page.reload();await page.waitForFunction(()=>(window as any).fixture.catalog.find((p:any)=>p.id==='pista')?.active===false);
    await page.locator('.gift-open-builder').click();await page.locator('.gift-builder-steps button').nth(1).click();
    assert.equal(await page.locator('.gift-remove-unavailable').count(),1,'an unavailable preselection has an explicit removal action');await page.locator('.gift-remove-unavailable').click();assert.equal(await page.locator('.gift-remove-unavailable').count(),0);
    await page.keyboard.press('Escape');await page.unroute('**/api/catalog',unavailablePortion);await page.reload();await page.waitForFunction(price=>(window as any).fixture.catalog.find((p:any)=>p.id==='pista')?.prices['250g']===price,fixtureProducts.find(p=>p.id==='pista')!.prices['250g']);
    await page.locator('.gift-open-builder').click();const dialog=page.locator('.gift-builder-dialog[role=dialog]');await dialog.waitFor();
    assert.equal(await dialog.locator('.gift-builder-preview').count(),1);
    await dialog.locator('.gift-builder-steps button').nth(1).click();
    await dialog.locator('.gift-builder-work button[aria-pressed=true]').first().click();
    assert.equal(await dialog.locator('.gift-builder-steps button').nth(2).isDisabled(),true,'under-capacity selection cannot advance');
    await dialog.locator('.gift-builder-work button').first().click();
    await dialog.locator('.gift-builder-steps button').nth(2).click();
    await dialog.locator('#hamper-recipient').fill('Ayesha');await dialog.locator('#hamper-message').fill('عید مبارک\nWith love from Lahore');
    assert.match(await dialog.locator('.gift-card-preview').innerText(),/Ayesha/);assert.match(await dialog.locator('.gift-card-preview').innerText(),/عید مبارک/);
    for(const width of [360,768,1440])for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:width<768?844:1000});await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);},{language,theme});
      await page.screenshot({animations:'disabled'});assert.equal(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,`builder ${width}/${language}/${theme}`);layouts.push({surface:'builder',width,language,theme});
    }
    await page.setViewportSize({width:844,height:390});await page.screenshot({animations:'disabled'});assert.ok(await dialog.locator('.gift-builder-scroll').evaluate(e=>e.clientHeight)>=60,'short landscape retains usable scroll area');assert.ok(await dialog.locator('.gift-builder-add').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'landscape action remains reachable');
    await page.setViewportSize({width:360,height:844});
    await page.evaluate(()=>{const changes=[...document.querySelectorAll<HTMLElement>('.gift-builder-dialog *')].filter(e=>e.matches('input,textarea')||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent?.trim())).map(e=>[e,e.style.fontSize,e.style.lineHeight,parseFloat(getComputedStyle(e).fontSize)*2,parseFloat(getComputedStyle(e).lineHeight)*2] as const);(window as any).giftFontRestore=changes;changes.forEach(([e,,,size,line])=>{e.style.fontSize=size+'px';if(Number.isFinite(line))e.style.lineHeight=line+'px';});});
    await page.screenshot({animations:'disabled'});assert.equal(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'enlarged builder text');assert.ok(await dialog.locator('.gift-builder-scroll').evaluate(e=>e.clientHeight)>=80,'enlarged text retains usable scroll area');
    await page.evaluate(()=>(window as any).giftFontRestore.forEach(([e,font,line]:any[])=>{e.style.fontSize=font;e.style.lineHeight=line;}));
    await page.setViewportSize({width:1440,height:1000});
    await page.evaluate(()=>{(window as any).fixture.lang('en');(window as any).fixture.theme('light');});await page.screenshot({path:path.join(evidence,'after-builder-1440.jpg'),quality:78,animations:'disabled'});
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    assert.equal(await page.locator('.gift-open-builder').evaluate(e=>e===document.activeElement),true,'focus returns to original launcher after context changes');
    await page.locator('.gift-open-builder').click();await dialog.waitFor();assert.match(await dialog.locator('.gift-card-preview').innerText(),/Ayesha/);
    await dialog.locator('.gift-builder-add').click();await dialog.waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>(window as any).fixture.cart.length), 0, 'Hamper Request Quote leaves cart count unchanged');
    const quoteModal = page.locator('#custom-quote-modal-title');await quoteModal.waitFor();
    assert.equal(await page.locator('#quote-monogram-text').inputValue(), 'Ayesha');
    assert.match(await page.locator('#quote-card-message').inputValue(), /عید مبارک/);
    assert.equal(await page.locator('#quote-target-budget').inputValue(), '', 'Customer budget starts empty');
    const expected=1800+['pista','kaju','badam','akhroot'].reduce((sum,id)=>sum+hamperSelectionPrice(fixtureProducts.find(p=>p.id===id)!)!,0);
    assert.match(await page.locator('text=Catalog Reference Rate:').locator('..').innerText(), new RegExp(`Rs\\.\\s*${expected.toLocaleString()}`));
    await page.locator('button[aria-label="Close Custom Quote Modal"]').click();await quoteModal.waitFor({state:'hidden'});
    await page.route('**/api/catalog',async route=>{const response=await route.fetch();const data=await response.json();data.hamperBoxes=data.hamperBoxes.map((box:any)=>({...box,active:false,price:0,catalogRevision:'unavailable-test'}));data.version+='-unavailable';await route.fulfill({response,json:data});});
    await page.reload();await page.waitForFunction(()=>document.querySelector<HTMLButtonElement>('.gift-open-builder')?.disabled===true);
    assert.match(await page.locator('.gift-opening').innerText(),/Custom packaging is unavailable/);
    await fs.writeFile(path.join(evidence,'layouts.json'),JSON.stringify(layouts,null,2));assert.deepEqual(errors,[]);
  }finally{await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(temporary,{recursive:true,force:true});}
});
