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
import { createProductUploadRouter } from '../src/lib/productUploadRouter';
import { DEFAULT_CATALOG_CONFIGURATION } from '../src/lib/catalogConfiguration';
import { loadAuthoritativeCatalog,invalidateCatalogCache } from '../src/lib/catalogStore';
import { validateAndPriceOrder } from '../src/lib/orderValidation';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII=','base64');

test('Stage 3 browser: mobile item workflow persists, publishes and buys with authoritative rates; desktop/RTL/dark parity',async()=>{
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'allbarka-stage3-'));
  const configuration=structuredClone(DEFAULT_CATALOG_CONFIGURATION);
  configuration.taxonomy.push({id:'seasonal-harvest',type:'category',name_en:'Seasonal harvest',name_ur:'موسمی فصل',name_ar:'حصاد موسمي',description_en:'Selected harvest',description_ur:'',description_ar:'',visible:true});
  const {db,records}=memoryFirestore({'catalogSettings/main':configuration});
  const requireAdmin:any=(request:any,response:any,next:any)=>{if(request.get('Authorization')!=='Bearer fixture-owner')return response.status(403).json({code:'FORBIDDEN_ADMIN'});request.user={uid:'fixture-owner'};next();};
  const entry=`import React,{useState,useEffect} from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,Link}from'react-router-dom';
  import AdminItemForm from './src/components/AdminItemForm';import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{CatalogProvider}from'./src/contexts/CatalogContext';import{CartProvider,useCart}from'./src/contexts/CartContext';import{ThemeProvider}from'./src/contexts/ThemeContext';import CategoryPLP from './src/components/CategoryPLP';import ProductDetailPage from './src/pages/ProductDetailPage';
  function Workspace(){const[saved,setSaved]=useState(null);const[key,setKey]=useState(0);const{setLanguage}=useLanguage();useEffect(()=>{window.fixtureLanguage=setLanguage},[setLanguage]);return <><button id="reopen" onClick={()=>setKey(x=>x+1)}>Reload record</button><Link to="/shop/seasonal-harvest" id="shop-link">Browse</Link><AdminItemForm key={key} product={saved} onClose={()=>{}} onSaved={p=>{setSaved(p);window.fixtureProduct=p;}}/></>}
  function CartReadout(){const{cartItems}=useCart();return <output id="cart-result">{JSON.stringify(cartItems)}</output>}
  createRoot(document.getElementById('root')).render(<BrowserRouter><LanguageProvider><ThemeProvider><CatalogProvider><CartProvider><Routes><Route path="/admin" element={<Workspace/>}/><Route path="/shop/:category" element={<CategoryPLP initialCategory="seasonal-harvest"/>}/><Route path="/product/:id" element={<ProductDetailPage/>}/></Routes><CartReadout/></CartProvider></CatalogProvider></ThemeProvider></LanguageProvider></BrowserRouter>);`;
  await build({stdin:{contents:entry,loader:'tsx',resolveDir:process.cwd(),sourcefile:'stage3-fixture.tsx'},bundle:true,format:'iife',platform:'browser',outfile:path.join(temporary,'fixture.js'),jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixture-auth-only',setup(builder){builder.onResolve({filter:/\/AuthContext$/},()=>({path:'auth',namespace:'test-only'}));builder.onLoad({filter:/.*/,namespace:'test-only'},()=>({contents:'const currentUser={uid:"fixture-owner",getIdToken:async()=>"fixture-owner"}; export const useAuth=()=>({currentUser,loading:false,patronProfile:null});',loader:'js'}));}}],logLevel:'silent'});
  const app=express();app.use(createProductUploadRouter({requireAdmin,getBucket:()=>({name:'fixture-bucket',file:()=>({save:async()=>{}})} as any)}));app.use(express.json());
  app.use(createCatalogConfigurationRouter({getDb:()=>db,requireAdmin}));app.use(createCatalogRouter({getDb:()=>db,requireAdmin}));
  app.use('/assets',express.static(path.resolve('dist/assets')));app.use('/images',express.static(path.resolve('public/images')));app.get('/fixture.js',(_req,res)=>res.sendFile(path.join(temporary,'fixture.js')));app.get('/fixture.css',(_req,res)=>res.sendFile(path.join(temporary,'fixture.css')));
  app.use('/api',(_req,res)=>res.status(503).json({code:'FIXTURE_UNAVAILABLE'}));
  const styles=(await fs.readdir('dist/assets')).filter(x=>x.endsWith('.css')).map(x=>`<link rel="stylesheet" href="/assets/${x}">`).join('');
  app.get(/.*/,(_req,res)=>res.type('html').send(`<html><head>${styles}<link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;const browser=await launchTestBrowser();
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.route('https://firebasestorage.googleapis.com/**',route=>route.fulfill({status:200,contentType:'image/png',body:png}));
    await page.goto(`${origin}/admin`);const dialog=page.getByRole('dialog');await dialog.getByLabel('Product ID',{exact:false}).first().waitFor();
    const english=dialog.locator('section').first().locator('details').first();
    await english.getByLabel(/^Name/).fill('Merchant Saffron');await english.getByLabel(/^Description/).fill('Verified saffron details.');
    assert.equal(await dialog.getByLabel('Product ID',{exact:false}).first().inputValue(),'merchant-saffron');
    await dialog.getByLabel(/^Category/).first().selectOption('seasonal-harvest');
    await dialog.getByRole('button',{name:'Add option',exact:true}).click();await dialog.getByLabel(/^Option label/).fill('500mg');await dialog.getByLabel(/^Quantity \(/).first().fill('500');await dialog.getByLabel(/^Unit \(/).first().selectOption('mg');await dialog.getByLabel(/^Price \(PKR\)/).fill('500');
    await dialog.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForFunction(()=>!!(window as any).fixtureProduct);
    assert.equal((records.get('products/merchant-saffron') as any).status,'draft');
    assert.equal((await (await fetch(`${origin}/api/catalog`)).json()).products.some((p:any)=>p.id==='merchant-saffron'),false);
    // Reopen from server, then add photos and a calculated custom range.
    await page.evaluate(()=>document.getElementById('reopen')!.click());await page.waitForFunction(()=>document.querySelector('[role="dialog"] h3')?.textContent==='Edit item');
    await dialog.getByLabel(/^Cover image URL/).fill('/images/product-placeholder.svg');await dialog.getByLabel(/^Upload photo/).setInputFiles({name:'saffron.png',mimeType:'image/png',buffer:png});
    await page.waitForFunction(()=>((document.querySelector('[role="dialog"] textarea') as HTMLTextAreaElement)?.value!==undefined)&&Array.from(document.querySelectorAll('textarea')).some(x=>x.value.includes('firebasestorage')));
    await dialog.getByLabel(/^Pricing method/).selectOption('calculated');await dialog.getByLabel(/^Base quantity/).fill('1');await dialog.getByLabel(/^Base unit/).selectOption('g');await dialog.getByLabel(/^Base rate/).fill('1000');await dialog.getByLabel(/^Quantity choice/).selectOption('both');
    await dialog.getByLabel(/^Minimum/).fill('250');await dialog.getByLabel(/^Maximum/).fill('1000');await dialog.getByLabel(/^Increment/).fill('250');await dialog.locator('section').nth(1).getByLabel(/^Unit \(/).last().selectOption('mg');
    await dialog.getByText('Search & social preview',{exact:true}).click();await dialog.getByLabel(/^SEO title · EN/).fill('Merchant saffron harvest');await dialog.getByLabel(/^Keywords/).fill('saffron, Lahore');
    await dialog.getByRole('button',{name:'Preview & readiness',exact:true}).click();assert.match(await dialog.innerText(),/Verified saffron details/);
    await dialog.getByRole('button',{name:'Publish item',exact:true}).click();await page.waitForFunction(()=>(window as any).fixtureProduct?.status==='published');
    const persisted:any=records.get('products/merchant-saffron');assert.equal(persisted.prices['500mg'],500);assert.equal(persisted.name_ur,'');assert.equal(persisted.galleryImages.length,1);assert.deepEqual(persisted.keywords,['saffron','Lahore']);
    // Taxonomy and reusable templates are edited through the actual admin controls.
    const configUI=dialog.locator('details.item-section').last();await configUI.locator(':scope > summary').click();
    const taxGroup=configUI.locator(':scope > .item-stack > div').first();await taxGroup.getByRole('button',{name:'Add taxonomy entry',exact:true}).click();
    const taxEntry=taxGroup.locator('details').last();await taxEntry.locator(':scope > summary').click();await taxEntry.getByLabel(/^Product ID/).fill('single-origin');await taxEntry.getByLabel(/^Name · EN/).fill('Single origin');
    const templateGroup=configUI.locator(':scope > .item-stack > div').nth(1);await templateGroup.getByRole('button',{name:'Add template',exact:true}).click();
    const templateEntry=templateGroup.locator('details').last();await templateEntry.locator(':scope > summary').click();await templateEntry.getByLabel(/^Product ID/).fill('saffron-standard');await templateEntry.getByLabel(/^Name · EN/).fill('Saffron standard');
    await templateEntry.getByRole('button',{name:'Add item',exact:true}).click();await templateEntry.getByLabel(/^Product ID/).last().fill('grade');await templateEntry.getByLabel(/^Name · EN/).last().fill('Grade');
    await Promise.all([page.waitForResponse(response=>response.url().endsWith('/api/admin/catalog/configuration')&&response.request().method()==='PUT'&&response.status()===200),configUI.getByRole('button',{name:'Save changes',exact:true}).click()]);
    const configSaved:any=records.get('catalogSettings/main');assert.equal(configSaved.revision,1);assert.ok(configSaved.taxonomy.some((x:any)=>x.id==='single-origin'));assert.equal(configSaved.templates.find((x:any)=>x.id==='saffron-standard').attributes[0].key,'grade');
    // Every viewport/language/theme uses the same mounted form and no horizontal overflow.
    const shots=process.env.ALLBARKA_CAPTURE_EVIDENCE==='true'?path.resolve('docs/admin-expansion/evidence'):path.join(temporary,'evidence');await fs.mkdir(shots,{recursive:true});
    for(const [width,height] of [[390,844],[1440,900]] as const)for(const lang of ['en','ur','ar'] as const)for(const dark of [false,true]){
      await page.setViewportSize({width,height});await page.evaluate(({lang,dark})=>{(window as any).fixtureLanguage(lang);document.documentElement.classList.toggle('dark',dark);document.documentElement.dataset.theme=dark?'dark':'light';},{lang,dark});await page.waitForTimeout(60);
      assert.equal(await dialog.getAttribute('dir'),lang==='en'?'ltr':'rtl');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth),true);
      await dialog.locator('.item-scroll').evaluate(e=>{e.scrollTop=0;});if((lang==='en'&&!dark)||(width===390&&lang==='ur'&&dark)||(width===1440&&lang==='ar'&&dark))await page.screenshot({path:path.join(shots,`stage3-${width}-${lang}-${dark?'dark':'light'}.png`)});
    }
    await page.evaluate(()=>(window as any).fixtureLanguage('en'));
    assert.deepEqual(errors,[]);
    (records.get('products/merchant-saffron') as any).revision+=1;
    await english.getByLabel(/^Description/).fill('Attempt preserved after a conflicting edit');await dialog.getByRole('button',{name:'Save changes',exact:true}).last().click();await dialog.getByRole('alert').waitFor();
    assert.equal(await english.getByLabel(/^Description/).inputValue(),'Attempt preserved after a conflicting edit');assert.match(await dialog.getByRole('alert').innerText(),/record changed/);assert.ok(errors.every(x=>x.includes('409')));errors.length=0;
    await page.evaluate(()=>(window as any).fixtureLanguage('en'));await page.goto(`${origin}/shop/seasonal-harvest`);await page.getByRole('heading',{name:'Seasonal harvest',exact:true}).waitFor();await page.getByRole('link',{name:/Merchant Saffron/}).first().click();
    await page.waitForURL('**/product/merchant-saffron');await page.getByRole('button',{name:/اپنی مقدار|Custom/}).first().click();
    const custom=page.locator('input[type=number][min="250"]');await custom.fill('750');
    // The actual customer button adds the normalized custom label to CartContext.
    const add=page.getByRole('button',{name:/Add to Bag|Add to Cart|بیگ|کارٹ/}).filter({hasNot:page.locator('[disabled]')}).first();await add.click();
    await page.waitForFunction(()=>document.querySelector('#cart-result')?.textContent?.includes('Custom 750mg'));
    const cart=JSON.parse(await page.locator('#cart-result').textContent()||'[]');assert.equal(cart[0].price,750);
    invalidateCatalogCache();const catalog=(await loadAuthoritativeCatalog(db,{fresh:true})).products;
    const checked=validateAndPriceOrder({products:catalog,items:[{productId:'merchant-saffron',selectedWeight:'Custom 750mg',quantity:1,price:1}],city:'Lahore',shippingMethodId:'standard',isWholesale:false,giftWrapping:false});assert.equal(checked.items[0].price,750);
    assert.deepEqual(errors,[]);await context.close();
  }finally{await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(temporary,{recursive:true,force:true});}
});
