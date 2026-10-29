import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { memoryFirestore } from './helpers/memoryFirestore';
import { assertStaffReader,changeStaffAccess,lookupStaffAccount,sanitizeOrderForStaff,createStaffRouter } from '../src/lib/staffAccess';
import { requireCurrentAdministrator } from '../src/lib/adminAuthentication';
import { createCatalogRouter } from '../src/lib/catalogRouter';
import { createCatalogConfigurationRouter } from '../src/lib/catalogConfigurationRouter';
import { createProductMediaRouter } from '../src/lib/productMediaRouter';
import { createProductUploadRouter } from '../src/lib/productUploadRouter';
import { staffRequest,adminRequest } from '../src/lib/adminClient';
import { routeMetadata } from '../src/lib/routeDocument';
import {staffFixtureOrder,staffFixtureIdentity} from './helpers/staffFixtures';
const claims={uid:'owner'};
test('staff grant/revoke is authoritative, revisioned and audited without modifying unrelated Auth claims',async()=>{
  const {db,records}=memoryFirestore();const {auth,users}=staffFixtureIdentity();
  await assert.rejects(assertStaffReader(db,auth,{uid:'reader',staff:true} as any),/STAFF_ACCESS_DENIED/);
  const account=await lookupStaffAccount(db,auth,claims,' Reader@example.test ');assert.equal(account.uid,'reader');assert.equal(account.revision,0);
  const granted=await changeStaffAccess({db,auth,claims,targetUid:'reader',body:{enabled:true,expectedRevision:0}});assert.equal(granted.revision,1);
  await assertStaffReader(db,auth,{uid:'reader'});assert.deepEqual(users.get('reader').customClaims,{role:'customer',loyalty:'keep'});
  const attempts=await Promise.allSettled([changeStaffAccess({db,auth,claims,targetUid:'reader',body:{enabled:false,expectedRevision:1}}),changeStaffAccess({db,auth,claims,targetUid:'reader',body:{enabled:true,expectedRevision:1}})]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);assert.equal(attempts.filter(x=>x.status==='rejected').length,1);
  await assert.rejects(assertStaffReader(db,auth,{uid:'reader'}),/STAFF_ACCESS_DENIED/);assert.equal([...records.keys()].filter(k=>k.startsWith('staffAccessAudits/')).length,2);
});
test('role bypasses, disabled/unverified identities, stale admin claims and revoked sign-ins are denied',async()=>{
  const {db,records}=memoryFirestore({'staffAccess/reader':{uid:'reader',version:1,enabled:true,revision:1}});const {auth,users}=staffFixtureIdentity();
  users.get('reader').disabled=true;await assert.rejects(assertStaffReader(db,auth,{uid:'reader'}),/STAFF_ACCESS_DENIED/);users.get('reader').disabled=false;
  users.get('reader').emailVerified=false;await assert.rejects(lookupStaffAccount(db,auth,claims,'reader@example.test'),/STAFF_EMAIL_UNVERIFIED/);await assert.rejects(assertStaffReader(db,auth,{uid:'reader'}),/STAFF_ACCESS_DENIED/);users.get('reader').emailVerified=true;
  users.get('reader').tokensValidAfterTime=new Date().toISOString();await assert.rejects(assertStaffReader(db,auth,{uid:'reader',auth_time:1}),/STAFF_ACCESS_DENIED/);
  users.get('owner').customClaims={admin:false};await assert.rejects(changeStaffAccess({db,auth,claims:{uid:'owner',admin:true},targetUid:'reader',body:{enabled:false,expectedRevision:1}}),/FORBIDDEN_ADMIN/);
  assert.equal((records.get('staffAccess/reader') as any).enabled,true);
  await assert.rejects(assertStaffReader(null,auth,{uid:'reader',auth_time:Math.floor(Date.now()/1000)}),/DB_UNAVAILABLE/);await assert.rejects(assertStaffReader(db,null,{uid:'reader'}),/AUTH_SERVICE_UNAVAILABLE/);
});
test('staff order projection removes nested private data and keeps quote totals nonpayable',()=>{
  const view=sanitizeOrderForStaff(staffFixtureOrder());const text=JSON.stringify(view);assert.doesNotMatch(text,/SECRET|privateCost|supplierCost|privateMargin|adminNote|claimToken|n8nPayload|earnedPoints/);assert.equal(view.customer.address,'Gulberg III');assert.equal(view.items[0].quantity,2);assert.equal(view.totals.total,5150);
  const quote=sanitizeOrderForStaff({...staffFixtureOrder(),status:'QUOTE_REQUESTED',totals:{total:9999},items:[{price:9999}]});assert.equal(quote.isQuoteRequest,true);assert.equal(quote.totals.total,0);assert.equal(quote.items[0].price,0);
  assert.equal(routeMetadata('/staff/orders','https://allbarka.com',[]).noindex,true);
});
test('real HTTP permission matrix: readers can list/detail only and cannot reach any admin family or staff write/export',async()=>{
  const {db}=memoryFirestore({'orders/AB-STAFF-0001':staffFixtureOrder(),'staffAccess/reader':{uid:'reader',version:1,enabled:true,revision:1}});const {auth,users}=staffFixtureIdentity();
  const requireAuth:any=(req:any,res:any,next:any)=>{const value=req.get('Authorization')?.replace('Bearer ','');if(!['owner','reader','customer'].includes(value))return res.status(401).json({code:'UNAUTHORIZED'});req.user={uid:value,...(value==='owner'?{admin:true}:{}),auth_time:Math.floor(Date.now()/1000)};next();};
  const currentAdministrator=requireCurrentAdministrator(()=>auth);
  const requireAdmin:any=(req:any,res:any,next:any)=>requireAuth(req,res,()=>currentAdministrator(req,res,next));
  const app=express();app.use(createProductUploadRouter({requireAdmin,getBucket:()=>null}));app.use(express.json());app.use(createStaffRouter({getDb:()=>db,getAuth:()=>auth,requireAuth,requireAdmin}));app.use(createCatalogRouter({getDb:()=>db,requireAdmin}));app.use(createCatalogConfigurationRouter({getDb:()=>db,requireAdmin}));app.use(createProductMediaRouter({getDb:()=>db,requireAdmin}));app.use('/api/admin',requireAdmin,(_req,res)=>res.json({reachedAdmin:true}));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const request=(path:string,identity='reader',method='GET',body?:unknown)=>fetch(origin+path,{method,headers:{...(identity?{Authorization:`Bearer ${identity}`} :{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  try{
    assert.equal((await request('/api/staff/orders','')).status,401);assert.equal((await request('/api/staff/orders','customer')).status,403);
    const list=await (await request('/api/staff/orders')).json();assert.equal(list.orders.length,1);assert.equal(list.metrics,undefined);assert.doesNotMatch(JSON.stringify(list),/SECRET|adminNote/);
    const detail=await (await request('/api/staff/orders/AB-STAFF-0001')).json();assert.equal(detail.order.customer.name,'Ayesha Patron');assert.equal(detail.audits,undefined);
    for(const [method,path]of [['POST','/api/staff/orders/AB-STAFF-0001/status'],['PUT','/api/staff/access'],['GET','/api/staff/orders/export'],['GET','/api/admin/orders'],['GET','/api/admin/orders/export'],['POST','/api/admin/orders/AB-STAFF-0001/status'],['POST','/api/admin/orders/AB-STAFF-0001/payment'],['POST','/api/admin/orders/AB-STAFF-0001/notes'],['GET','/api/admin/catalog/products'],['POST','/api/admin/catalog/products'],['GET','/api/admin/catalog/configuration'],['PUT','/api/admin/catalog/configuration'],['POST','/api/admin/catalog/uploads'],['GET','/api/admin/product-media/pista'],['PATCH','/api/admin/product-media/pista'],['GET','/api/admin/staff'],['PUT','/api/admin/staff/reader'],['GET','/api/admin/updates'],['POST','/api/admin/updates'],['GET','/api/admin/inquiries']])assert.equal((await request(path,'reader',method)).status,403,`${method} ${path}`);
    assert.equal((await request('/api/admin/staff','owner')).status,200);
    const revoke=await request('/api/admin/staff/reader','owner','PUT',{enabled:false,expectedRevision:1});assert.equal(revoke.status,200);assert.equal((await request('/api/staff/orders')).status,403);
    users.get('owner').customClaims={admin:false};
    for(const path of ['/api/admin/orders','/api/admin/catalog/products','/api/admin/catalog/configuration','/api/admin/staff','/api/admin/updates','/api/admin/inquiries']) {
      assert.equal((await request(path,'owner')).status,403,`Demoted admin with old token: ${path}`);
    }
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('bounded staff client always uses GET, never accepts admin paths and cancels stalled tokens',async()=>{
  await assert.rejects(staffRequest(async()=>'', '/api/admin/orders'),/INVALID_PATH/);await assert.rejects(adminRequest(async()=>'', '/api/staff/orders'),/INVALID_PATH/);
  await assert.rejects(staffRequest(()=>new Promise(()=>{}),'/api/staff/orders',{timeoutMs:10}),/REQUEST_TIMEOUT/);
});

test('failed access audit rolls back the grant and invalid privilege fields never become stored roles',async()=>{
  const {db,records}=memoryFirestore();const {auth}=staffFixtureIdentity();
  await assert.rejects(changeStaffAccess({db,auth,claims,targetUid:'reader',body:{enabled:true,expectedRevision:0,admin:true}}),/INVALID_STAFF_ACCESS/);
  const original=db.runTransaction.bind(db);db.runTransaction=(run:any)=>original((transaction:any)=>run({...transaction,set:(ref:any,value:any)=>{if(ref.path.startsWith('staffAccessAudits/'))throw Error('fixture audit unavailable');transaction.set(ref,value);}}));
  await assert.rejects(changeStaffAccess({db,auth,claims,targetUid:'reader',body:{enabled:true,expectedRevision:0}}),/fixture audit unavailable/);
  assert.equal(records.has('staffAccess/reader'),false);
});
