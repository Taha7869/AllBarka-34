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
import { quoteOrderForCustomer } from '../src/lib/orderQuote';
import { PRODUCTS } from '../src/data/products';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { createCatalogConfigurationRouter } from '../src/lib/catalogConfigurationRouter';
import { createStorefrontContentRouter } from '../src/lib/storefrontContentRouter';

// Real components, cart, routers and isolated persistence. Auth is isolated; no live provider writes.
test('purchase continuity: cart, gift details, server quote and failure recovery', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-hero-'));
  const fixtureProducts=PRODUCTS.map(product=>({...product}));
  const { db } = memoryFirestore(Object.fromEntries([...fixtureProducts.map(product => [`products/${product.id}`, product] as const),...HAMPER_BOX_SEEDS.map(box=>[`hamperBoxes/${box.id}`,{schemaVersion:1,boxId:box.id,revision:0,price:box.price,active:true}] as const)]));
  const entry = `import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,useNavigate}from'react-router-dom';
import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{ThemeProvider,useTheme}from'./src/contexts/ThemeContext';import{CartProvider,useCart}from'./src/contexts/CartContext';import{CatalogProvider,useCatalogProducts}from'./src/contexts/CatalogContext';import{MerchandisingProvider}from'./src/contexts/MerchandisingContext';import{ProductMediaProvider}from'./src/contexts/ProductMediaContext';import{StorefrontContentProvider,useStorefrontContentRefresh}from'./src/contexts/StorefrontContentContext';
import{resolveHamper,hamperCartKey}from'./src/lib/hamperCatalog';
import RootLayout from'./src/layouts/RootLayout';import HomePage from'./src/pages/HomePage';import ShopPage from'./src/pages/ShopPage';import ProductDetailPage from'./src/pages/ProductDetailPage';import CartPage from'./src/pages/CartPage';import CheckoutPage from'./src/pages/CheckoutPage';import{PRODUCTS}from'./src/data/products';
function Controls(){const{setLanguage}=useLanguage();const{setTheme}=useTheme();const refresh=useStorefrontContentRefresh();const cart=useCart();const catalog=useCatalogProducts();const navigate=useNavigate();useEffect(()=>{window.fixture={navigate,seed:()=>{cart.addToCart(catalog.find(p=>p.id==='pista'),'250g',2,undefined,{silent:true,openCart:false});const h=resolveHamper({version:1,boxId:'box-wood',selections:['pista','kaju','badam','akhroot'],recipientName:'Ayesha',giftMessage:'عید مبارک'+String.fromCharCode(10)+'With love from Lahore'},catalog);if(h)cart.addToCart({...h,id:hamperCartKey(h.configuration),productId:'custom-hamper',selectedWeight:h.portion,price:h.unitPrice,quantity:1,hamperConfiguration:h.configuration},undefined,1,undefined,{silent:true,openCart:false});},open:()=>cart.setIsCartOpen(true),refresh,lang:setLanguage,theme:setTheme,cart:cart.cartItems,catalog,close:()=>cart.setIsCartOpen(false),clear:()=>cart.clearCart()};});return null;}
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
  const quoteState:{mode:'ok'|'hold'|'fail'}={mode:'ok'};let lastQuote:any;const held:express.Response[]=[];const orderRequests:any[]=[];
  app.post('/api/orders/quote',async(req,res)=>{if(quoteState.mode==='hold'){held.push(res);return;}if(quoteState.mode==='fail'){res.status(503).json({success:false,code:'FIXTURE_UNAVAILABLE',error:'Quote unavailable in isolated test'});return;}try{lastQuote=await quoteOrderForCustomer(db,req.body);res.json(lastQuote);}catch(error:any){res.status(400).json({success:false,error:error.message,code:error.code});}});
  app.post('/api/orders',(req,res)=>{orderRequests.push(req.body);res.status(503).json({success:false,code:'PERSISTENCE_PENDING',error:'Order not saved in isolated test'});});
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
    const evidence=process.env.ALLBARKA_CAPTURE_EVIDENCE==='true'?path.resolve('docs/evidence/premium-purchase'):path.join(temporary,'evidence');await fs.mkdir(evidence,{recursive:true});
    await page.goto(origin+'/cart');await page.waitForFunction(()=>(window as any).fixture.catalog.find((p:any)=>p.id==='pista')?.catalogRevision);
    await page.evaluate(()=>(window as any).fixture.seed());await page.waitForFunction(()=>(window as any).fixture.cart.length===2);await page.screenshot({animations:'disabled'});
    if(process.env.ALLBARKA_PURCHASE_BASELINE==='true'){
      await page.screenshot({path:path.join(evidence,'before-cart-1440.jpg'),quality:78,animations:'disabled'});
      await page.evaluate(()=>(window as any).fixture.open());await page.getByRole('dialog').waitFor();await page.screenshot({path:path.join(evidence,'before-drawer-1440.jpg'),quality:78,animations:'disabled'});await page.keyboard.press('Escape');
      await page.evaluate(()=>(window as any).fixture.navigate('/checkout'));await page.locator('#checkout-field-name').waitFor();await page.screenshot({path:path.join(evidence,'before-checkout-1440.jpg'),quality:78,animations:'disabled'});return;
    }
    const layouts:any[]=[];
    const setUi=async(width:number,language:string,theme:string)=>{await page.setViewportSize({width,height:width<768?844:1000});await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);window.scrollTo({top:0,behavior:'instant'});},{language,theme});await page.screenshot({animations:'disabled'});};
    const check=async(surface:string,width:number,language:string,theme:string)=>{const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);if(!fits)await page.screenshot({path:path.resolve('../verification/purchase-overflow.jpg'),animations:'disabled'});assert.equal(fits,true,JSON.stringify({surface,width,language,theme,overflow:await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(-12).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,90)})))}));layouts.push({surface,width,language,theme});};
    const enlarge=async(selector:string)=>{
      await page.evaluate(selector=>{const changes=[...document.querySelectorAll<HTMLElement>(selector+' *')].filter(e=>e.matches('input,select,textarea')||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent?.trim())).map(e=>[e,e.style.fontSize,e.style.lineHeight,parseFloat(getComputedStyle(e).fontSize)*2,parseFloat(getComputedStyle(e).lineHeight)*2] as const);(window as any).purchaseFontRestore=changes;changes.forEach(([e,,,size,line])=>{e.style.fontSize=size+'px';if(Number.isFinite(line))e.style.lineHeight=line+'px';});},selector);
      await page.screenshot({animations:'disabled'});
    };
    const restore=async()=>{await page.evaluate(()=>(window as any).purchaseFontRestore.forEach(([e,font,line]:any[])=>{e.style.fontSize=font;e.style.lineHeight=line;}));};
    assert.match(await page.locator('.purchase-cart').innerText(),/Ayesha/);assert.match(await page.locator('.purchase-cart').innerText(),/عید مبارک/);
    await page.locator('.purchase-cart-item').first().locator('.purchase-quantity button').last().click();await page.waitForFunction(()=>(window as any).fixture.cart.find((i:any)=>i.productId==='pista').quantity===3);
    await page.locator('.purchase-cart-item').first().locator('.purchase-quantity button').first().click();await page.waitForFunction(()=>(window as any).fixture.cart.find((i:any)=>i.productId==='pista').quantity===2);
    await page.locator('#cart-delivery-city').selectOption('Other City');assert.match(await page.locator('.purchase-totals').innerText(),/325/);await page.locator('#cart-delivery-city').selectOption('Lahore');
    for(const width of [360,390,768,1440])for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await setUi(width,language,theme);await check('cart',width,language,theme);
      if([390,1440].includes(width)&&language==='en'&&theme==='light')await page.screenshot({path:path.join(evidence,`after-cart-${width}.jpg`),quality:78,animations:'disabled'});
    }
    for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){await setUi(360,language,theme);await enlarge('.purchase-cart');await check('cart-enlarged',360,language,theme);await restore();}
    await setUi(1440,'en','light');await page.locator('.purchase-clear').focus();await page.evaluate(()=>(window as any).fixture.open());const drawer=page.locator('.purchase-drawer');await drawer.waitFor();
    await drawer.locator('.purchase-personalization summary').click();assert.match(await drawer.innerText(),/Ayesha/);assert.match(await drawer.innerText(),/عید مبارک/);
    await page.keyboard.press('Shift+Tab');assert.equal(await drawer.evaluate(e=>e.contains(document.activeElement)),true);
    for(const width of [360,390,768,1440])for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await setUi(width,language,theme);assert.equal(await drawer.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,`drawer/${width}/${language}/${theme}`);await check('drawer',width,language,theme);
      assert.ok(await drawer.locator('.purchase-drawer-scroll').evaluate(e=>e.clientHeight)>80);
      if(width===1440&&language==='en'&&theme==='light')await page.screenshot({path:path.join(evidence,'after-drawer-1440.jpg'),quality:78,animations:'disabled'});
    }
    for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){await setUi(360,language,theme);await enlarge('.purchase-drawer');assert.equal(await drawer.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,`drawer enlarged ${language}/${theme}`);assert.ok(await drawer.locator('.purchase-drawer-scroll').evaluate(e=>e.clientHeight)>50);await restore();}
    await setUi(844,'en','light');await page.setViewportSize({width:844,height:390});await page.screenshot({animations:'disabled'});assert.ok(await drawer.locator('.purchase-drawer-scroll').evaluate(e=>e.clientHeight)>50,'short landscape keeps a usable item area');assert.ok(await drawer.locator('.purchase-drawer-footer button').last().evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'landscape action remains reachable');
    await setUi(844,'en','light');await drawer.getByRole('button',{name:'Bank / Raast transfer',exact:true}).click();
    await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});assert.equal(await page.locator('.purchase-clear').evaluate(e=>e===document.activeElement),true,'drawer returns original focus after context changes');
    await page.reload();await page.waitForFunction(()=>(window as any).fixture.cart.length===2);assert.match(await page.locator('.purchase-cart').innerText(),/Ayesha/);
    // Hold the public snapshot to reproduce a genuine older bag vs fresh quote revision.
    const cachedCatalog=await (await page.request.get(origin+'/api/catalog')).json();await page.route('**/api/catalog',route=>route.fulfill({json:cachedCatalog}));
    const pista=fixtureProducts.find(p=>p.id==='pista')!;await db.collection('products').doc('pista').set({...pista,prices:{...pista.prices,'250g':pista.prices['250g']+100}});
    await page.evaluate(()=>(window as any).fixture.navigate('/checkout'));await page.locator('#checkout-field-name').waitFor();
    await page.waitForFunction(()=>document.querySelector('.purchase-quote-state')?.textContent==='Current price check');assert.ok(lastQuote?.items?.length===2);
    if(await page.locator('.purchase-order-details').getAttribute('open')===null)await page.locator('.purchase-order-details>summary').click();
    assert.match(await page.locator('.boutique-order-item').first().innerText(),new RegExp((2*(pista.prices['250g']+100)).toLocaleString()));
    assert.match(await page.locator('#checkoutForm').innerText(),new RegExp((2*(pista.prices['250g']+100)).toLocaleString()));
    assert.equal(await page.evaluate(()=>(window as any).fixture.cart.find((i:any)=>i.productId==='pista').unitPrice),pista.prices['250g'],'cart snapshot intentionally remains older than quote');
    await page.locator('#checkout-field-name').fill('Fixture Patron');await page.locator('#checkout-field-phone').fill('03001234567');
    const matrix=async(surface:string)=>{for(const width of [360,390,768,1440])for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){await setUi(width,language,theme);await check(surface,width,language,theme);if([390,1440].includes(width)&&language==='en'&&theme==='light'&&surface==='checkout-details'){if(width===390&&await page.locator('.purchase-order-details').getAttribute('open')!==null){await page.locator('.purchase-order-details>summary').click();await page.screenshot({animations:'disabled'});}await page.screenshot({path:path.join(evidence,`after-checkout-${width}.jpg`),quality:78,animations:'disabled'});}}};
    await matrix('checkout-details');await setUi(390,'en','light');await page.getByRole('button',{name:'Continue to delivery & address',exact:true}).click();await page.locator('#checkout-field-address').fill('Fixture Gulberg III Lahore');await matrix('checkout-shipping');
    await setUi(390,'en','light');await page.getByRole('button',{name:'Proceed to Payment & Review',exact:true}).click();const submit=page.locator('button[type=submit][aria-busy]');await submit.waitFor();await matrix('checkout-review');
    for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){await setUi(360,language,theme);await enlarge('.purchase-checkout');await check('checkout-enlarged',360,language,theme);await restore();}
    await setUi(1440,'en','light');const selection=page.locator('.purchase-order-details');if(await selection.getAttribute('open')===null)await selection.locator(':scope>summary').click();assert.match(await selection.innerText(),/Ayesha/);
    quoteState.mode='hold';await page.getByRole('button',{name:'Check total again',exact:true}).click();await page.waitForFunction(()=>document.querySelector('button[type=submit][aria-busy]')?.getAttribute('aria-busy')==='true');assert.equal(await submit.isDisabled(),true);assert.equal(orderRequests.length,0);
    quoteState.mode='fail';for(const response of held)if(!response.writableEnded)response.status(503).json({success:false,error:'Quote unavailable in isolated test'});await page.getByText('Quote unavailable in isolated test',{exact:true}).waitFor();assert.equal(await submit.isDisabled(),true);
    quoteState.mode='ok';await page.getByRole('button',{name:'Check total again',exact:true}).click();await page.waitForFunction(()=>document.querySelector('button[type=submit][aria-busy]')?.getAttribute('aria-busy')==='false'&&!document.querySelector<HTMLButtonElement>('button[type=submit][aria-busy]')?.disabled);
    await submit.click();await page.getByText('Order not saved in isolated test',{exact:true}).waitFor();assert.equal(orderRequests.length,1);assert.equal(orderRequests[0].paymentMethod,'bank');assert.equal(await page.evaluate(()=>(window as any).fixture.cart.length),2);assert.equal(orderRequests[0].items.find((i:any)=>i.productId==='custom-hamper').hamperConfiguration.giftMessage,'عید مبارک\nWith love from Lahore');
    await page.reload();await page.locator('#checkout-field-name').waitFor();assert.equal(await page.locator('#checkout-field-name').inputValue(),'Fixture Patron');assert.equal(await page.evaluate(()=>(window as any).fixture.cart.length),2);
    await page.evaluate(()=>{(window as any).fixture.clear();(window as any).fixture.navigate('/cart');});await page.locator('.purchase-empty-panel').waitFor();assert.match(await page.locator('.purchase-empty-panel').innerText(),/Browse collections/i);
    await fs.writeFile(path.join(evidence,'layouts.json'),JSON.stringify(layouts,null,2));assert.deepEqual(errors,[]);

  }finally{await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(temporary,{recursive:true,force:true});}
});
