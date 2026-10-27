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

// Real components, cart, routers and isolated persistence. Auth and quote failure are fixture adapters.
test('boutique interactions: committed cart feedback, honest failures, real gallery, keyboard/touch and full-layout responsive parity', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-interactions-'));
  const { db } = memoryFirestore(Object.fromEntries(PRODUCTS.map(product => [`products/${product.id}`, product])));
  const entry = `import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,useNavigate}from'react-router-dom';
import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{ThemeProvider,useTheme}from'./src/contexts/ThemeContext';import{CartProvider,useCart}from'./src/contexts/CartContext';import{CatalogProvider}from'./src/contexts/CatalogContext';import{MerchandisingProvider}from'./src/contexts/MerchandisingContext';import{ProductMediaProvider,useProductMediaRegistry}from'./src/contexts/ProductMediaContext';import{StorefrontContentProvider}from'./src/contexts/StorefrontContentContext';
import RootLayout from'./src/layouts/RootLayout';import HomePage from'./src/pages/HomePage';import ShopPage from'./src/pages/ShopPage';import ProductDetailPage from'./src/pages/ProductDetailPage';import CartPage from'./src/pages/CartPage';import CheckoutPage from'./src/pages/CheckoutPage';import CartAddButton from'./src/components/CartAddButton';import ProductImageGallery from'./src/components/ProductImageGallery';import MagneticButton from'./src/components/motion/MagneticButton';import{PRODUCTS}from'./src/data/products';
const item=PRODUCTS.find(p=>p.id==='pista');const photos=PRODUCTS.find(p=>p.id==='deal-1');
function Controls(){const cart=useCart();const{setLanguage}=useLanguage();const{setTheme}=useTheme();const navigate=useNavigate();const media=useProductMediaRegistry();useEffect(()=>{window.fixture={navigate,lang:setLanguage,theme:setTheme,cart:cart.cartItems,close:()=>cart.setIsCartOpen(false),clear:()=>{cart.clearCart();cart.setIsCartOpen(false)},cap:()=>cart.updateQuantity('pista-250g',50),add:()=>cart.addToCart(item,'250g',1,undefined,{silent:true,openCart:false}),media:media.setOverride};});return null;}
function Lab(){const{addToCart}=useCart();return <section className="w-full max-w-5xl px-5 py-10"><h1 className="font-serif text-3xl mb-8">Interaction verification</h1><div id="lab-gallery" style={{maxWidth:350}}><ProductImageGallery product={photos}/></div><div className="grid gap-4 mt-8" style={{maxWidth:350}}><CartAddButton id="lab-add" productId="pista" portion="250g" onAdd={()=>addToCart(item,'250g',1,undefined,{silent:true,openCart:false})} className="rounded-xl bg-[#1e3a2b] text-white px-5 flex items-center justify-center gap-2"/><CartAddButton id="lab-noop" productId="pista" portion="250g" onAdd={()=>{}} className="border rounded-xl px-5 flex items-center justify-center gap-2"/><CartAddButton id="lab-disabled" productId="pista" portion="250g" onAdd={()=>addToCart(item,'250g')} disabled className="border rounded-xl px-5"/><MagneticButton id="lab-anchor" as="a" href="#lab-gallery" style={{opacity:.7}} onClick={e=>{e.preventDefault();window.anchorClicks=(window.anchorClicks||0)+1}}>Gallery action</MagneticButton></div></section>}
createRoot(document.getElementById('root')).render(<BrowserRouter><ThemeProvider><LanguageProvider><CatalogProvider initialProducts={PRODUCTS}><MerchandisingProvider><ProductMediaProvider><CartProvider><StorefrontContentProvider><Controls/><Routes><Route path="/" element={<RootLayout/>}><Route index element={<HomePage/>}/><Route path="shop" element={<ShopPage/>}/><Route path="shop/:category" element={<ShopPage/>}/><Route path="product/:id" element={<ProductDetailPage/>}/><Route path="cart" element={<CartPage/>}/><Route path="checkout" element={<CheckoutPage/>}/><Route path="polish-lab" element={<Lab/>}/></Route></Routes></StorefrontContentProvider></CartProvider></ProductMediaProvider></MerchandisingProvider></CatalogProvider></LanguageProvider></ThemeProvider></BrowserRouter>);`;
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
  const quotes: express.Response[] = []; let orderCalls = 0; let releaseQuotes = false;
  app.post('/api/orders/quote', (_req, res) => {
    if (releaseQuotes) res.status(503).json({ success: false, code: 'FIXTURE_UNAVAILABLE', error: 'Quote unavailable in isolated test' });
    else quotes.push(res);
  });
  app.post('/api/orders', (_req, res) => { orderCalls++; res.status(503).json({ code: 'UNAVAILABLE' }); });
  app.use('/assets', express.static(path.resolve('dist/assets'))); app.use('/images', express.static(path.resolve('public/images')));
  app.use('/videos', express.static(path.resolve('public/videos')));
  app.get('/fixture.js', (_req, res) => res.sendFile(path.join(temporary, 'fixture.js')));
  app.get('/fixture.css', (_req, res) => res.sendFile(path.join(temporary, 'fixture.css')));
  const css = (await fs.readdir('dist/assets')).filter(file => file.endsWith('.css')).map(file => `<link rel="stylesheet" href="/assets/${file}">`).join('');
  app.get(/.*/, (req, res) => req.path.startsWith('/api/') ? res.status(404).json({ code: 'NOT_FOUND' }) : req.path.endsWith('.webp') ? res.status(404).end() : res.type('html').send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css}<link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`; const browser = await launchTestBrowser();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    // External font/provider resources are not part of isolated browser certification.
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.fulfill({ status: 200, body: '' }));
    const page = await context.newPage(); const errors: string[] = []; let expectedFailure = false;
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && !(expectedFailure && /status of (?:503|404)/.test(message.text()))) errors.push(message.text()); });
    await page.goto(`${origin}/polish-lab`); await page.locator('#lab-add').waitFor();
    const gallery = page.locator('#lab-gallery .product-gallery');
    await gallery.hover(); await page.waitForFunction(() => document.querySelector('#lab-gallery .product-gallery')?.getAttribute('data-previewing') === 'true');
    assert.equal(await gallery.locator('.product-gallery-preview').getAttribute('src'), await gallery.locator('.product-gallery-slide img').nth(1).getAttribute('src'));
    await page.mouse.move(0, 0); await page.waitForFunction(() => document.querySelector('#lab-gallery .product-gallery')?.getAttribute('data-previewing') === 'false');
    await gallery.getByRole('button', { name: 'Next photo', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#lab-gallery .product-gallery-counter')?.getAttribute('aria-label') === 'Photo 2/4');
    // The counter updates optimistically; complete the native scroll before the keyboard return journey.
    await page.waitForFunction(() => { const track=document.querySelector<HTMLElement>('#lab-gallery .product-gallery-track'); return track && Math.abs(track.scrollLeft-track.clientWidth)<1; });
    await page.mouse.move(0, 0); await gallery.hover(); assert.equal(await gallery.getAttribute('data-previewing'), 'false');
    await gallery.getByRole('button', { name: 'Previous photo', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#lab-gallery .product-gallery-counter')?.getAttribute('aria-label') === 'Photo 1/4');
    await page.waitForFunction(() => Math.abs(document.querySelector<HTMLElement>('#lab-gallery .product-gallery-track')!.scrollLeft)<1);
    assert.equal(await gallery.locator('a[tabindex="0"]').getAttribute('href'), '/product/deal-1');
    await page.locator('#lab-anchor').focus(); await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => (window as any).anchorClicks), 1);
    await page.locator('#lab-noop').click(); assert.equal(await page.locator('#lab-noop').getAttribute('data-confirmed'), 'false');
    assert.equal(await page.evaluate(() => (window as any).fixture.cart.length), 0);
    await page.locator('#lab-add').click(); await page.waitForFunction(() => document.querySelector('#lab-add')?.getAttribute('data-confirmed') === 'true');
    assert.equal(await page.evaluate(() => (window as any).fixture.cart[0].quantity), 1);
    assert.equal(await page.evaluate(() => (window as any).fixture.cart[0].unitPrice), PRODUCTS.find(product => product.id === 'pista')!.prices['250g']);
    await page.locator('#lab-add').click(); await page.waitForFunction(() => (window as any).fixture.cart[0].quantity === 2);
    await page.evaluate(() => (window as any).fixture.cap()); await page.waitForFunction(() => (window as any).fixture.cart[0].quantity === 50);
    await page.locator('#lab-add').click(); await page.waitForFunction(() => document.querySelector('#lab-add')?.getAttribute('data-confirmed') === 'false');
    assert.equal(await page.evaluate(() => (window as any).fixture.cart[0].quantity), 50); assert.equal(await page.locator('#lab-disabled').isDisabled(), true);
    await page.evaluate(() => { (window as any).fixture.clear(); (window as any).fixture.navigate('/shop/dry-fruits'); });
    await page.locator('.boutique-navigation [aria-current="page"]').waitFor();
    const navigation = page.locator('.boutique-navigation [aria-current="page"]').first(); await navigation.focus(); await page.keyboard.press('Enter');
    await page.getByRole('menu').waitFor(); await page.keyboard.press('Escape'); assert.equal(await navigation.evaluate(element => element === document.activeElement), true);
    await page.evaluate(() => (window as any).fixture.navigate('/product/pista')); await page.waitForFunction(() => location.pathname === '/product/pista' && document.querySelectorAll('.boutique-add-to-bag').length === 1);
    await page.locator('.boutique-add-to-bag').click(); await page.getByRole('button', { name: 'Close cart drawer', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => (window as any).fixture.cart[0].quantity), 1);
    await page.getByRole('button', { name: 'Close cart drawer', exact: true }).click(); await page.getByRole('dialog').waitFor({state:'hidden'});
    const shots = process.env.ALLBARKA_CAPTURE_EVIDENCE === 'true' ? path.resolve('docs/admin-expansion/evidence') : path.join(temporary, 'evidence'); await fs.mkdir(shots, { recursive: true });
    // Actual RootLayout, header/footer, PDP and cart are mounted for every combination.
    for (const width of [360, 390, 768, 1440]) for (const language of ['en', 'ur', 'ar']) for (const dark of [false, true]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.evaluate(({ language, dark }) => { (window as any).fixture.lang(language); (window as any).fixture.theme(dark ? 'dark' : 'light'); }, { language, dark });
      await page.waitForTimeout(40);
      for (const destination of ['/product/pista', '/cart']) {
        await page.evaluate(destination => (window as any).fixture.navigate(destination), destination); await page.waitForTimeout(40);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, JSON.stringify({ width, language, dark, destination, overflow: await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map(element => ({ tag: element.tagName, class: element.className }))) }));
      }
      if ((width === 390 && language === 'en' && !dark) || (width === 1440 && language === 'en' && !dark) || (width === 390 && language === 'ur' && dark) || (width === 1440 && language === 'ar' && dark)) {
        await page.evaluate(() => { (window as any).fixture.navigate('/product/pista'); window.scrollTo({ top: 0, behavior: 'instant' }); }); await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(shots, `polish-${width}-${language}-${dark ? 'dark' : 'light'}.jpg`), quality: 82 });
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { (window as any).fixture.lang('en'); (window as any).fixture.theme('light'); (window as any).fixture.navigate('/shop/dry-fruits'); });
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
    const menu = page.getByRole('dialog'); assert.equal(await menu.locator('button[aria-current="page"]').count(), 1);
    await menu.getByRole('button', { name: 'Close navigation menu', exact: true }).click();
    // Closed animation surfaces must immediately stop blocking input/focus.
    const closedMenu = page.locator('#mobile-navigation-menu');
    assert.equal(await closedMenu.evaluate(element => (element as HTMLElement).inert), true);
    assert.equal(await closedMenu.evaluate(element => getComputedStyle(element).pointerEvents), 'none');
    assert.equal(await closedMenu.getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('#mobile-menu-trigger-btn').evaluate(element => element === document.activeElement), true);
    await page.evaluate(() => (window as any).fixture.navigate('/checkout'));
    await page.locator('#checkout-field-name').fill('Fixture Patron'); await page.locator('#checkout-field-phone').fill('03001234567');
    await page.getByRole('button', { name: 'Continue to delivery & address', exact: true }).click(); await page.locator('#checkout-field-address').fill('Fixture Gulberg III Lahore');
    await page.getByRole('button', { name: 'Proceed to Payment & Review', exact: true }).click();
    const submit = page.locator('button[type="submit"][aria-busy]'); await submit.waitFor(); assert.equal(await submit.isDisabled(), true); assert.equal(await submit.getAttribute('aria-busy'), 'true');
    assert.equal(await submit.locator('.boutique-request-spinner').evaluate(element => getComputedStyle(element).animationName), 'none');
    expectedFailure = true; releaseQuotes = true; for (const response of quotes) if (!response.writableEnded) response.status(503).json({ success: false, code: 'FIXTURE_UNAVAILABLE', error: 'Quote unavailable in isolated test' });
    await page.getByText('Quote unavailable in isolated test', { exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('button[type="submit"][aria-busy]')?.getAttribute('aria-busy') === 'false');
    expectedFailure = false; assert.equal(await submit.isDisabled(), true); assert.equal(orderCalls, 0); assert.equal(await page.getByText('Quote unavailable in isolated test', { exact: true }).count(), 1, await page.locator('main').innerText());
    await page.evaluate(() => (window as any).fixture.navigate('/polish-lab')); await page.locator('#lab-anchor').waitFor();
    assert.equal(await page.locator('#lab-anchor').evaluate(element => getComputedStyle(element).opacity), '0.7');
    await page.setViewportSize({ width: 1440, height: 900 }); await page.locator('#lab-gallery').hover(); assert.equal(await gallery.getAttribute('data-previewing'), 'false');
    await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(0,0);expectedFailure=true;
    await page.evaluate(()=>(window as any).fixture.media('deal-1',{images:['/images/products/deal-1.jpg','/images/missing-preview.webp'],videoUrl:'',videoPoster:''}));
    await page.waitForFunction(()=>document.querySelector('#lab-gallery .product-gallery-slide img')?.getAttribute('src')==='/images/products/deal-1.jpg');
    await gallery.hover();await page.waitForFunction(()=>document.querySelector('#lab-gallery .product-gallery')?.getAttribute('data-previewing')==='false'&&!document.querySelector('#lab-gallery .product-gallery-preview'));
    assert.equal(await gallery.locator('.product-gallery-slide img').first().getAttribute('src'),'/images/products/deal-1.jpg');
    await page.evaluate(()=>(window as any).fixture.media('deal-1',null));expectedFailure=false;
    assert.deepEqual(errors, []);
    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
    await touch.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.fulfill({status:200,body:''}));
    const mobile = await touch.newPage();mobile.on('pageerror',error=>errors.push(error.message));mobile.on('console',message=>{if(message.type()==='error')errors.push(message.text());}); await mobile.goto(`${origin}/polish-lab`); await mobile.locator('#lab-gallery').waitFor();
    await mobile.locator('#lab-gallery .product-gallery-track').evaluate(element => element.scrollTo({ left: element.clientWidth, behavior: 'instant' }));
    await mobile.waitForFunction(() => document.querySelector('#lab-gallery .product-gallery-counter')?.getAttribute('aria-label') === 'Photo 2/4');
    assert.equal(await mobile.locator('#lab-gallery .product-gallery').getAttribute('data-previewing'), 'false');
    assert.equal(await mobile.locator('#lab-anchor').evaluate(element => getComputedStyle(element).opacity), '0.7');
    await mobile.locator('#lab-add').tap(); await mobile.waitForFunction(() => document.querySelector('#lab-add')?.getAttribute('data-confirmed') === 'true');
    assert.deepEqual(errors,[]);await touch.close(); await context.close();
  } finally {
    await browser.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await fs.rm(temporary, { recursive: true, force: true });
  }
});
