import { validateDynamicProduct } from '../src/lib/catalogSchema';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { newItem, legacyCommerceOptions, itemPayload, itemSlug, optionPrice } from '../src/lib/adminItemForm';
import { productSeo } from '../src/lib/productSeo';
import { routeMetadata,renderRouteDocument } from '../src/lib/routeDocument';
import { resolveProductMedia } from '../src/lib/productMedia';
import { DEFAULT_CATALOG_CONFIGURATION } from '../src/lib/catalogConfiguration';
import { productMatchesCategory, productMatchesOccasion } from '../src/config/categories';
import { createProductUploadRouter,MAX_UPLOAD_BYTES } from '../src/lib/productUploadRouter';
import type { Product } from '../src/types';

test('item form never inserts rates, generates a stable ASCII slug and omits pricing on metadata saves',()=>{
  const form=newItem();assert.deepEqual(form.prices,{});assert.deepEqual(form.commerce.options,[]);assert.equal(form.name_ur,'');
  assert.equal(itemSlug('Royal Afghan Almonds!'),'royal-afghan-almonds');
  const p={...form,id:'merchant',revision:7,prices:{'250g':1200}} as unknown as Product;
  const body=itemPayload(p,'published',false,p);assert.equal(body.expectedRevision,7);assert.equal(body.prices,undefined);assert.equal(body.commerce,undefined);assert.equal(body.active,true);
  const edited=itemPayload(p,'draft',true,p);assert.deepEqual(edited.prices,{'250g':1200});assert.equal(edited.active,false);
});
test('SEO renders stored English social metadata in initial HTTP and localized fallback after hydration',()=>{
  const p={...newItem(),id:'merchant',name_en:'Saffron',desc_en:'Actual product',image:'/images/product-placeholder.svg',prices:{'1g':1000},seo:{title_en:'Saffron harvest',description_en:'Verified merchant description',title_ur:'زعفران',imageAlt_en:'Saffron jar',socialImage:'/images/og-image.jpg'},keywords:['saffron','Lahore']} as unknown as Product;
  assert.equal(productSeo(p,'ur').title,'زعفران');assert.equal(productSeo(p,'ar').title,'Saffron harvest');
  const meta=routeMetadata('/product/merchant','https://allbarka.com',[p]);assert.match(meta.title,/Saffron harvest/);assert.equal(meta.image,'/images/og-image.jpg');
  const html=renderRouteDocument('<head><title></title></head><div id="root"></div>',meta,'https://allbarka.com','fixture');assert.match(html,/name="keywords" content="saffron, Lahore"/);assert.match(html,/Verified merchant description/);
  assert.deepEqual(resolveProductMedia({...p,galleryImages:['/images/hero.jpg']}).images,[p.image,'/images/hero.jpg']);
});
test('custom category, collection and occasion remain exact and get initial HTTP metadata',()=>{
  const entry={...DEFAULT_CATALOG_CONFIGURATION.taxonomy[0],id:'seasonal',name_en:'Seasonal harvest',description_en:'Our seasonal collection',visible:true};
  const p={id:'merchant',category:'seasonal',collections:['gathering'],occasions:['harvest-festival']};
  assert.equal(productMatchesCategory(p,'seasonal'),true);assert.equal(productMatchesCategory(p,'gathering'),true);assert.equal(productMatchesCategory(p,'other'),false);assert.equal(productMatchesOccasion(p,'harvest-festival'),true);
  assert.equal(routeMetadata('/shop/seasonal','https://allbarka.com',[],[entry]).status,200);
  assert.equal(routeMetadata('/shop/seasonal','https://allbarka.com',[],[{...entry,visible:false}]).status,404);
});
test('photo upload enforces admin, raster signatures and bounded body; durable storage failures stay honest',async()=>{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII=','base64');
  let fail=false;const saved:any[]=[];
  const app=express();app.use(createProductUploadRouter({requireAdmin:(req,res,next)=>req.get('Authorization')==='Bearer owner'?next():res.status(403).json({code:'FORBIDDEN_ADMIN'}),getBucket:()=>({name:'fixture-bucket',file:(key:string)=>({save:async(bytes:Buffer,options:any)=>{if(fail)throw Error('unavailable');saved.push({key,bytes,options});}})} as any)}));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const send=(body:Buffer,mime='image/png',auth='Bearer owner')=>fetch(`${origin}/api/admin/catalog/uploads`,{method:'POST',headers:{Authorization:auth,'Content-Type':mime},body});
  try {
    assert.equal((await send(png,'image/png','')).status,403);assert.equal(saved.length,0);
    assert.equal((await send(Buffer.from('<html>'), 'image/png')).status,400);assert.equal((await send(png,'image/svg+xml')).status,400);
    assert.equal((await send(Buffer.alloc(MAX_UPLOAD_BYTES+1))).status,413);
    const response=await send(png);assert.equal(response.status,201);const result=await response.json();assert.match(result.url,/firebasestorage.googleapis.com/);assert.equal(saved.length,1);assert.deepEqual(saved[0].bytes,png);assert.equal(saved[0].options.metadata.contentType,'image/png');
    fail=true;assert.equal((await send(png)).status,503);assert.equal(saved.length,1);
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('explicitly blank legacy translations remain blank while absent legacy fields retain compatibility fallback',()=>{
  const p={id:'legacy-dates',name_en:'Legacy dates',category:'dates',prices:{'250g':100},name_ur:'',name_ar:''};
  assert.equal(validateDynamicProduct(p).name_ur,'');assert.equal(validateDynamicProduct(p).name_ar,'');
  const {name_ur,name_ar,...missing}=p;assert.equal(validateDynamicProduct(missing).name_ur,'Legacy dates');
});

test('legacy template conversion never guesses an unknown packaging piece count',()=>{
  const options=legacyCommerceOptions({variants:[{label:'Wedding pack special',price:1000,available:false},{label:'10 pcs',price:1200},{label:'1 KG',price:1800}]});
  assert.equal(options[0].unit,'pack');assert.equal(options[0].piecesPerPack,undefined);assert.equal(options[0].available,false);
  assert.equal(options[1].quantity,10);assert.equal(options[1].unit,'piece');assert.equal(options[2].unit,'kg');
});
