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
  const entry = `import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,useNavigate,useLocation}from'react-router-dom';
import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{ThemeProvider,useTheme}from'./src/contexts/ThemeContext';import{CartProvider,useCart}from'./src/contexts/CartContext';import{CatalogProvider}from'./src/contexts/CatalogContext';import{MerchandisingProvider}from'./src/contexts/MerchandisingContext';import{ProductMediaProvider}from'./src/contexts/ProductMediaContext';import{StorefrontContentProvider,useStorefrontContentRefresh}from'./src/contexts/StorefrontContentContext';
import RootLayout from'./src/layouts/RootLayout';import HomePage from'./src/pages/HomePage';import ShopPage from'./src/pages/ShopPage';import ProductDetailPage from'./src/pages/ProductDetailPage';import CartPage from'./src/pages/CartPage';import CheckoutPage from'./src/pages/CheckoutPage';import{PRODUCTS}from'./src/data/products';
function Controls(){const navigate=useNavigate();const location=useLocation();const{setLanguage,language}=useLanguage();const{setTheme,theme}=useTheme();const refresh=useStorefrontContentRefresh();const cart=useCart();useEffect(()=>{window.fixture={navigate,routeKey:location.key,pathname:location.pathname,language,theme,refresh,lang:setLanguage,theme:setTheme,cart:cart.cartItems,close:()=>cart.setIsCartOpen(false),clear:()=>cart.clearCart()};});return null;}
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
    const trigger=page.locator('.catalog-quick-controls button[aria-controls]');
    const sheet=page.getByRole('dialog');
    // Early user interaction inside the filter sheet must not be stolen by delayed initial focus.
    const earlyFocusPreserved=await page.evaluate(async()=>{
      document.querySelector<HTMLButtonElement>('.catalog-quick-controls button[aria-controls]')!.click();
      await new Promise<void>(resolve=>setTimeout(resolve,0));
      const range=document.querySelector<HTMLInputElement>('[role="dialog"] input[type="range"]');
      range?.focus();
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      return document.activeElement===range;
    });
    assert.equal(earlyFocusPreserved,true,'initial focus yields to an early user interaction');
    await sheet.locator('input[type=range]').fill('1000');
    await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).searchParams.has('budget'),false,'cancelled filters never apply');
    assert.equal(await trigger.evaluate(e=>e===document.activeElement),true,'Escape restores focus to filter trigger');
    // Cancel button and backdrop dismissal discard drafts; touch-like open still restores focus to visible trigger.
    await page.evaluate(()=>{(document.activeElement as HTMLElement|null)?.blur?.();document.querySelector<HTMLButtonElement>('.catalog-quick-controls button[aria-controls]')!.click();});
    await sheet.waitFor();
    await sheet.locator('input[type=range]').fill('1500');
    await sheet.locator('input[type=checkbox]').first().check();
    await sheet.locator('.catalog-filter-cancel').click();await sheet.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).searchParams.has('budget'),false,'Cancel button discards draft');
    assert.equal(new URL(page.url()).searchParams.has('special'),false,'Cancel button discards toggle draft');
    assert.equal(await trigger.evaluate(e=>e===document.activeElement),true,'Cancel restores focus even when opened without prior button focus');
    await trigger.click();await sheet.waitFor();
    await sheet.locator('select').last().selectOption('price-asc');
    await page.locator('.catalog-filter-backdrop').click({position:{x:8,y:8}});await sheet.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).searchParams.has('sort'),false,'backdrop click discards draft');
    assert.equal(await trigger.evaluate(e=>e===document.activeElement),true,'backdrop dismissal restores focus');
    // Desktop resize closes the mobile sheet, releases inert/scroll lock and restores focus to a visible control.
    await trigger.click();await sheet.waitFor();
    await sheet.locator('input[type=range]').fill('1200');
    await page.setViewportSize({width:1280,height:900});await sheet.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).searchParams.has('budget'),false,'desktop resize discards uncommitted mobile draft');
    assert.equal(await page.locator('#root').evaluate(root=>(root as HTMLElement).inert),false,'desktop resize releases inert');
    assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden','desktop resize releases scroll lock');
    assert.equal(await page.evaluate(()=>Boolean(document.activeElement&&document.activeElement!==document.body&&document.activeElement.getClientRects().length>0)),true,'desktop resize restores focus to a visible control');
    await page.setViewportSize({width:390,height:844});
    // Route change while open releases inert/scroll lock without stealing focus onto the old trigger.
    await trigger.click();await sheet.waitFor();
    const beforeNavKey=await page.evaluate(()=>(window as any).fixture.routeKey);
    await page.evaluate(()=>(window as any).fixture.navigate('/shop/dates'));
    await page.waitForFunction(key=>(window as any).fixture.routeKey!==key,beforeNavKey);
    await sheet.waitFor({state:'hidden'});
    assert.equal(await page.locator('#root').evaluate(root=>(root as HTMLElement).inert),false,'route change releases inert');
    assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden','route change releases scroll lock');
    assert.equal(await trigger.evaluate(e=>e===document.activeElement),false,'route change does not steal focus onto filter trigger');
    await page.evaluate(()=>(window as any).fixture.navigate('/shop/nuts'));
    await page.waitForFunction(()=>window.location.pathname==='/shop/nuts');
    // Responsive filter sheet matrix: 360x640, 390x844, 768x600, 844x390 x EN/UR/AR x light/dark + 200% enlarged text & simulated safe-area.
    for(const [width,height] of [[360,640],[390,844],[768,600],[844,390]] as const)for(const language of ['en','ur','ar'] as const)for(const theme of ['light','dark'] as const){
      await page.setViewportSize({width,height});
      await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);},{language,theme});
      await page.waitForFunction(({language,theme})=>document.documentElement.lang===language&&document.documentElement.dataset.theme===theme,{language,theme});
      await trigger.click();await sheet.waitFor();
      await page.waitForFunction(()=>document.querySelector('[role="dialog"]')?.contains(document.activeElement));
      const sheetState=await sheet.evaluate((root,vh)=>{
        const scroll=root.querySelector<HTMLElement>('.catalog-filter-scroll')!;
        const actions=root.querySelector<HTMLElement>('.catalog-filter-actions')!;
        const targets=[...root.querySelectorAll<HTMLElement>('button,select,input[type="range"],.catalog-filter-toggles label')];
        return {
          docOverflow:document.documentElement.scrollWidth>window.innerWidth+1,
          sheetOverflow:root.scrollWidth>root.clientWidth+1,
          scrollClientHeight:scroll.clientHeight,
          actionsBottom:actions.getBoundingClientRect().bottom,
          minTarget:Math.min(...targets.map(t=>Math.min(t.getBoundingClientRect().width,t.getBoundingClientRect().height))),
          vh,
        };
      },height);
      assert.equal(sheetState.docOverflow,false,`doc overflow ${width}x${height}/${language}/${theme}`);
      assert.equal(sheetState.sheetOverflow,false,`sheet overflow ${width}x${height}/${language}/${theme}`);
      assert.ok(sheetState.scrollClientHeight>80,`scroll height ${width}x${height}/${language}/${theme}`);
      assert.ok(sheetState.actionsBottom<=height+1,`actions reachable ${width}x${height}/${language}/${theme}`);
      assert.ok(sheetState.minTarget>=44,`44px targets ${width}x${height}/${language}/${theme}`);
      await sheet.locator('.catalog-filter-apply').focus();await page.keyboard.press('Tab');
      assert.equal(await sheet.locator('.catalog-filter-icon').evaluate(e=>e===document.activeElement),true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await sheet.locator('.catalog-filter-apply').evaluate(e=>e===document.activeElement),true);
      if(theme==='light'&&((width===360&&height===640)||(width===844&&height===390))){
        await sheet.locator('input[type=range]').fill('300');
        await sheet.locator('input[type=checkbox]').first().check();
        await sheet.locator('input[type=checkbox]').last().check();
        await sheet.evaluate(root=>{
          root.style.setProperty('--catalog-safe-area-bottom','34px');
          const elements=[...root.querySelectorAll<HTMLElement>('*')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent?.trim()));
          elements.forEach(e=>{e.style.fontSize=`${parseFloat(getComputedStyle(e).fontSize)*2}px`;});
        });
        const enlarged=await sheet.evaluate((root,vh)=>{
          const scroll=root.querySelector<HTMLElement>('.catalog-filter-scroll')!;
          const actions=root.querySelector<HTMLElement>('.catalog-filter-actions')!;
          const apply=root.querySelector<HTMLElement>('.catalog-filter-apply')!;
          const cancel=root.querySelector<HTMLElement>('.catalog-filter-cancel')!;
          const doubleScaled=[...root.querySelectorAll<HTMLElement>('*')].filter(e=>e.style.fontSize&&e.parentElement?.closest('[style*="font-size"]')).length;
          return {
            sheetOverflow:root.scrollWidth>root.clientWidth+1,
            scrollClientHeight:scroll.clientHeight,
            actionsBottom:actions.getBoundingClientRect().bottom,
            applyBottom:apply.getBoundingClientRect().bottom,
            cancelBottom:cancel.getBoundingClientRect().bottom,
            paddingBottom:parseFloat(getComputedStyle(actions).paddingBottom),
            noResults:Boolean(root.querySelector('.catalog-filter-no-results')),
            doubleScaled,
            vh,
          };
        },height);
        assert.equal(enlarged.sheetOverflow,false,`200% overflow ${width}x${height}/${language}`);
        assert.equal(enlarged.doubleScaled,0,`no 400% nested scaling ${width}x${height}/${language}`);
        assert.equal(enlarged.noResults,true,`zero-results status ${width}x${height}/${language}`);
        assert.ok(enlarged.paddingBottom>=42,`simulated safe-area inset applied ${width}x${height}/${language}`);
        assert.ok(enlarged.scrollClientHeight>44,`200% scroll space ${width}x${height}/${language}`);
        assert.ok(enlarged.actionsBottom<=height+1&&enlarged.applyBottom<=height+1&&enlarged.cancelBottom<=height+1,`200% actions reachable ${width}x${height}/${language}`);
        const controlCount=await sheet.locator('button:not(:disabled),input:not(:disabled),select:not(:disabled)').count();
        for(let step=0;step<controlCount+2;step++){
          await page.keyboard.press('Tab');
          const visible=await sheet.evaluate(root=>{
            const active=document.activeElement as HTMLElement|null;
            if(!active||!root.contains(active))return false;
            const r=active.getBoundingClientRect();
            return r.top>=-1&&r.bottom<=window.innerHeight+1&&r.left>=-1&&r.right<=window.innerWidth+1;
          });
          assert.equal(visible,true,`200% Tab focus visible step ${step} at ${width}x${height}/${language}`);
        }
      }
      await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
      assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
    }
    await page.evaluate(()=>{(window as any).fixture.lang('en');(window as any).fixture.theme('light');});await page.setViewportSize({width:390,height:844});
    // A new history entry can have the same pathname/query. Back must still cancel its draft.
    const routeKey=await page.evaluate(()=>(window as any).fixture.routeKey);
    await page.evaluate(()=>(window as any).fixture.navigate('/shop/nuts'));
    await page.waitForFunction(key=>(window as any).fixture.routeKey!==key,routeKey);
    await trigger.click();await sheet.waitFor();
    await sheet.locator('input[type=range]').fill('700');
    assert.equal(await page.locator('#root').evaluate(root=>(root as HTMLElement).inert),true);
    assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
    await page.goBack();await sheet.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).searchParams.has('budget'),false,'Back discards same-URL entry draft');
    assert.equal(await page.locator('#root').evaluate(root=>(root as HTMLElement).inert),false,'Back releases background inert');
    assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden','Back releases scroll lock');
    await page.goForward();
    await page.waitForFunction(key=>(window as any).fixture.routeKey!==key,routeKey);
    assert.equal(await sheet.count(),0,'Forward never resurrects an uncommitted draft');
    await trigger.click();await sheet.waitFor();
    assert.equal(await sheet.locator('input[type=range]').inputValue(),'10000','new draft uses committed filters');
    await sheet.locator('input[type=range]').fill('1000');
    await sheet.locator('.catalog-filter-apply').click();await sheet.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).searchParams.get('budget'),'1000');
    // Reset remains staged until Apply commits it; cancelling after Reset preserves committed filters.
    await trigger.click();await sheet.waitFor();
    assert.equal(await sheet.locator('input[type=range]').inputValue(),'1000');
    await sheet.locator('.catalog-filter-reset').click();
    assert.equal(await sheet.locator('input[type=range]').inputValue(),'10000','Reset stages default budget in draft');
    assert.equal(new URL(page.url()).searchParams.get('budget'),'1000','Reset does not mutate committed URL before Apply');
    await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).searchParams.get('budget'),'1000','cancelling after Reset keeps committed budget');
    await page.getByRole('combobox').first().fill('zzzz-no-product');
    await page.locator('#plp-products-grid').waitFor({state:'hidden'});
    await page.setViewportSize({width:1440,height:1200});
    await page.goto(origin);await page.locator('.boutique-product-card').first().waitFor();
    const home=page.locator('.boutique-product-card').first();await home.scrollIntoViewIfNeeded();
    await home.screenshot({path:path.join(evidence,'home-card.jpg'),quality:82,animations:'disabled'});
    assert.equal(await home.locator('.product-gallery').count(),1);
    await fs.writeFile(path.join(evidence,'layouts.json'),JSON.stringify(layouts,null,2));
    // Touch and non-reduced-motion check on mobile filter sheet
    const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
    await touch.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.fulfill({status:200,body:''}));
    const mobile=await touch.newPage();mobile.on('pageerror',e=>errors.push(e.message));
    await mobile.goto(origin+'/shop/nuts');await mobile.locator('.table-catalog-card').first().waitFor();
    await mobile.locator('.catalog-quick-controls button[aria-controls]').tap();
    const mobileSheet=mobile.getByRole('dialog');await mobileSheet.waitFor();
    assert.notEqual(await mobileSheet.evaluate(e=>getComputedStyle(e).animationName),'none');
    await mobileSheet.locator('.catalog-filter-cancel').tap();await mobileSheet.waitFor({state:'hidden'});
    assert.notEqual(await mobile.evaluate(()=>document.body.style.overflow),'hidden');
    await touch.close();
    assert.deepEqual(errors,[]);
  }finally{await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(temporary,{recursive:true,force:true});}
});
