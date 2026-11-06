import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {memoryFirestore} from './helpers/memoryFirestore';
import {DEFAULT_STOREFRONT_CONTENT,validateStorefrontContent,validatePublicStorefrontContent,contentDestination,publicStorefrontContent} from '../src/lib/storefrontContent';
import {createStorefrontContentRouter} from '../src/lib/storefrontContentRouter';
import {contentJournal,contentNavigation} from '../src/lib/contentPresentation';
import {MAIN_NAV_ITEMS} from '../src/config/navigation';
import {routeMetadata,renderRouteDocument} from '../src/lib/routeDocument';
const draft=()=>structuredClone(DEFAULT_STOREFRONT_CONTENT);

test('content validates bounded locales/sections/media/routes and cannot duplicate the product showcase',()=>{
  assert.equal(validateStorefrontContent(draft(),true).sections.filter(x=>x.id==='showcase').length,1);
  for(const path of ['https://evil.test','//evil.test','/admin/orders','/staff/orders','/api/orders','/shop/../admin','/%2f%2fevil.test','/shop?redirect=https://evil.test','/shop#bad<script>'])assert.throws(()=>contentDestination(path),/INVALID_CONTENT_DESTINATION/,path);
  assert.equal(contentDestination('/shop?search=pine%20nuts'),'/shop?search=pine%20nuts');assert.equal(contentDestination('/journal/harvest-note'),'/journal/harvest-note');
  const repeated=draft();repeated.sections[0].id='showcase';assert.throws(()=>validateStorefrontContent(repeated),/INVALID_HOME_SECTIONS/);
  const bad=draft();bad.hero.enabled=true;assert.doesNotThrow(()=>validateStorefrontContent(bad));assert.throws(()=>validateStorefrontContent(bad,true),/CONTENT_HERO_REQUIRED/);
  assert.throws(()=>validatePublicStorefrontContent({...draft(),hiddenArticles:['../../private']}),/INVALID_STOREFRONT_CONTENT/);
});
test('public projection and rendering hide unpublished articles without reviving archived compiled articles',()=>{
  const value=draft();value.articles.push({slug:'choosing-pack-sizes',visible:false,title:{en:'PRIVATE TITLE',ur:'',ar:''},excerpt:{en:'PRIVATE EXCERPT',ur:'',ar:''},body:{en:'PRIVATE BODY',ur:'',ar:''},image:'/images/hero.jpg',category:'Buying Guides',publishedDate:'2026-10-24',relatedProductIds:[]});
  const publicValue=publicStorefrontContent(value);assert.doesNotMatch(JSON.stringify(publicValue),/PRIVATE/);assert.deepEqual(publicValue.hiddenArticles,['choosing-pack-sizes']);assert.equal(contentJournal(publicValue,'en').some(x=>x.slug==='choosing-pack-sizes'),false);
  const custom={...value.articles[0],slug:'merchant-harvest',visible:true,title:{en:'Merchant harvest',ur:'فصل کی خبر',ar:''},body:{en:'Merchant-authored details.',ur:'فصل کی تفصیل۔',ar:''}};value.articles.push(custom);
  const published=publicStorefrontContent(validateStorefrontContent(value,true));assert.equal(contentJournal(published,'ur').find(x=>x.slug==='merchant-harvest')?.title,'فصل کی خبر');
  const meta=routeMetadata('/journal/merchant-harvest','https://allbarka.com',[],[],published);assert.equal(meta.status,200);assert.equal(meta.title,'Merchant harvest — AllBarka');assert.match(renderRouteDocument('<head><title></title></head>',meta,'https://allbarka.com','test'),/Merchant harvest/);
  assert.equal(routeMetadata('/journal/choosing-pack-sizes','https://allbarka.com',[],[],published).status,404);
});
test('navigation retains actions/default links while applying localized visible overrides to real destinations',()=>{
  const value=draft();value.navigation=[{id:'shop',visible:true,path:'/shop/seasonal',label:{en:'Harvest shop',ur:'فصل کی دکان',ar:''}},{id:'deals',visible:false,path:'/shop/deals',label:{en:'',ur:'',ar:''}}];
  const items=contentNavigation(MAIN_NAV_ITEMS,value,'ur');assert.equal(items.find(x=>x.id==='shop')?.defaultLabel,'فصل کی دکان');assert.equal(items.find(x=>x.id==='shop')?.dropdownItems?.[0].path,'/shop/seasonal');assert.equal(items.some(x=>x.id==='deals'),false);assert.equal(items.find(x=>x.id==='gifting')?.dropdownItems?.[0].action,'open-hamper-builder');
});
test('real content API isolates drafts, validates publish, rejects stale/unauthorized edits and commits audits atomically',async()=>{
  const {db,records}=memoryFirestore();const app=express();app.use(express.json({limit:'128kb'}));app.use(createStorefrontContentRouter({getDb:()=>db,requireAdmin:(req,res,next)=>{if(req.get('Authorization')!=='Bearer owner')return res.status(403).json({code:'FORBIDDEN_ADMIN'});(req as any).user={uid:'owner'};next();}}));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const request=(action:string,body:unknown,token='owner')=>fetch(`${origin}/api/admin/storefront-content/${action}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    const value=draft();value.banner={enabled:true,text:{en:'Merchant announcement',ur:'',ar:''},linkLabel:{en:'Shop',ur:'',ar:''},path:'/shop'};
    assert.equal((await request('draft',{expectedRevision:0,content:value},'reader')).status,403);
    assert.equal((await request('draft',{expectedRevision:0,content:value})).status,200);
    assert.equal((await request('draft',{expectedRevision:0,content:value})).status,409);
    let publicValue=await (await fetch(`${origin}/api/storefront-content`)).json();assert.equal(publicValue.content.banner.enabled,false);assert.equal(publicValue.revision,0);
    assert.equal((await request('publish',{expectedRevision:1})).status,200);publicValue=await (await fetch(`${origin}/api/storefront-content`)).json();assert.equal(publicValue.content.banner.text.en,'Merchant announcement');assert.equal(publicValue.revision,2);assert.equal(publicValue.updatedBy,undefined);
    const incomplete=draft();incomplete.hero.enabled=true;assert.equal((await request('draft',{expectedRevision:2,content:incomplete})).status,200);assert.equal((await request('publish',{expectedRevision:3})).status,400);
    assert.equal((records.get('storefrontContent/main') as any).liveRevision,2);assert.equal([...records.keys()].filter(x=>x.startsWith('storefrontContentAudits/')).length,3);
    const original=db.runTransaction.bind(db);db.runTransaction=(run:any)=>original((transaction:any)=>run({...transaction,set:(ref:any,v:any)=>{if(ref.path.startsWith('storefrontContentAudits/'))throw Error('fixture audit failure');transaction.set(ref,v);}}));
    assert.equal((await request('draft',{expectedRevision:3,content:value})).status,503);assert.equal((records.get('storefrontContent/main') as any).revision,3);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
