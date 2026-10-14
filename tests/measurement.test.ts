import assert from 'node:assert/strict';
import test from 'node:test';
import { analyticsPayload, createMeasurementTracker, createAcceptedPurchaseRecorder, measuredCheckoutItems, readMeasurementConsent, saveMeasurementConsent, validMeasurementId, MEASUREMENT_CONSENT_KEY } from '../src/lib/analytics';
import { createLayoutShiftAccumulator } from '../src/lib/pageVitals';

const id = 'G-FIXTURE123'; const origin = 'https://allbarka.example';
const item = { productId: 'pista', quantity: 1, price: 1250, customerPhone: 'private-phone', name: 'Private invented name' };
function fixture(extra: Record<string,any> = {}) { const sent: any[] = [], loaded: string[] = [], disabled: string[] = []; const tracker = createMeasurementTracker({ origin: () => origin, load: async value => { loaded.push(value); }, send: (name,payload)=>sent.push({name,payload}), disable: value=>disabled.push(value), ...extra }); return { tracker,sent,loaded,disabled }; }

test('measurement is off until both a valid provider configuration and explicit consent exist', async () => {
  const f = fixture(); await f.tracker.configure(id); assert.equal(await f.tracker.track('page_view',{path:'/shop'}),false); assert.deepEqual(f.loaded,[]); assert.deepEqual(f.sent,[]);
  await f.tracker.consent('denied'); assert.deepEqual(f.loaded,[]); await f.tracker.consent('granted'); assert.deepEqual(f.loaded,[id]);
  assert.equal(await f.tracker.track('page_view',{path:'/shop'}),true); assert.equal(f.sent.length,1);
});

test('malformed provider IDs never become arbitrary script URLs or enabled trackers', async () => {
  for (const value of ['', 'https://evil.example', 'G-aBcde', 'G-PRIVATE\n', '<script>', null]) { assert.equal(validMeasurementId(value),false); const f=fixture(); await f.tracker.consent('granted'); await f.tracker.configure(value); assert.equal(await f.tracker.track('page_view',{}),false); assert.deepEqual(f.loaded,[]); }
});

test('private pages, unknown routes and search results do not produce page views; marketing parameters are discarded', () => {
  for (const path of ['/checkout?phone=private', '/success?claimToken=private', '/admin/orders', '/not-found', '/shop?search=private']) assert.equal(analyticsPayload('page_view',{path},origin),null);
  const payload=analyticsPayload('page_view',{path:'/product/pista?email=private&utm_campaign=test',accountId:'private-account'},origin)!;
  assert.equal(payload.page_location,origin+'/product/pista'); assert.equal(payload.page_referrer,''); assert.doesNotMatch(JSON.stringify(payload),/private|utm_|accountId/);
});

test('commerce event allowlists drop contact, order, account, gift and free-text fields, using registry names', () => {
  const payload=analyticsPayload('begin_checkout',{path:'/checkout?claimToken=private',value:1250,items:[item],orderId:'private-order',uid:'private-account',email:'private@example.com',address:'private-address',giftMessage:'private-note'},origin)!;
  assert.equal(payload.page_location,origin+'/shop'); assert.equal((payload.items as any[])[0].item_name.includes('Pistachios'),true); assert.doesNotMatch(JSON.stringify(payload),/private|claimToken|orderId|email|address|giftMessage|customerPhone/);
});

test('custom hampers remain measurable while recipient names, notes and component messages stay private', () => {
  const payload=analyticsPayload('purchase',{path:'/checkout',transactionId:'00000000-0000-4000-8000-000000000000',value:5000,items:[{productId:'custom-hamper',quantity:1,price:5000,hamperConfiguration:{recipientName:'private-recipient'}}]},origin)!;
  assert.equal((payload.items as any[])[0].item_id,'custom-hamper'); assert.doesNotMatch(JSON.stringify(payload),/private-recipient|hamperConfiguration/);
});

test('invalid money, quantities, unknown SKUs and raw order IDs cannot pass the measurement boundary', () => {
  for (const raw of [{value:-1,items:[item]},{value:NaN,items:[item]},{value:1250,items:[{...item,quantity:51}]},{value:1250,items:[{...item,productId:'private-unknown'}]},{value:1250,items:[{...item,price:'1250'}]}]) assert.equal(analyticsPayload('add_to_cart',raw,origin),null);
  assert.equal(analyticsPayload('purchase',{value:1250,items:[item],transactionId:'AB-20261014-ORDER123'},origin),null); assert.equal(analyticsPayload('unknown-event',{},origin),null);
});

test('revocation fences a still-loading tag and suppresses all subsequent events', async () => {
  let finish!:()=>void; const f=fixture({load:()=>new Promise<void>(resolve=>{finish=resolve;})}); await f.tracker.configure(id); const pending=f.tracker.consent('granted');
  await f.tracker.consent('denied'); finish(); await pending; assert.equal(f.tracker.getState().ready,false); assert.ok(f.disabled.includes(id)); assert.equal(await f.tracker.track('add_to_cart',{value:1250,items:[item]}),false); assert.deepEqual(f.sent,[]);
});

test('concurrent repeated initialization loads one tag and records a page once, while new public routes still record', async () => {
  const f=fixture(); await f.tracker.consent('granted'); await Promise.all([f.tracker.configure(id),f.tracker.configure(id)]);
  await Promise.all([f.tracker.track('page_view',{path:'/shop'}),f.tracker.track('page_view',{path:'/shop'})]); assert.equal(f.loaded.length,1); assert.equal(f.sent.length,1);
  await f.tracker.track('page_view',{path:'/gifting'}); assert.equal(f.sent.length,2);
});

test('tag/provider failures leave shopping independent and never turn failures into collected events', async () => {
  const f=fixture({load:async()=>{throw new Error('Provider blocked');},disable:()=>{throw new Error('Cookies blocked');}}); await f.tracker.consent('granted'); await f.tracker.configure(id); assert.equal(await f.tracker.track('page_view',{}),false); await f.tracker.consent('denied'); assert.deepEqual(f.sent,[]);
});

test('consent storage rejects malformed data and tolerates disabled storage without inventing an opt-in', () => {
  const values=new Map<string,string>(); const storage={getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  assert.equal(readMeasurementConsent(storage),'unknown'); saveMeasurementConsent(storage,'denied'); assert.equal(readMeasurementConsent(storage),'denied'); saveMeasurementConsent(storage,'granted'); assert.equal(readMeasurementConsent(storage),'granted');
  for (const value of ['not-json','{"choice":"granted"}','{"v":2,"choice":"granted"}','{"v":1,"choice":"all"}']) {values.set(MEASUREMENT_CONSENT_KEY,value); assert.equal(readMeasurementConsent(storage),'unknown');}
  assert.equal(readMeasurementConsent({getItem:()=>{throw new Error('Blocked');}}),'unknown'); assert.doesNotThrow(()=>saveMeasurementConsent({setItem:()=>{throw new Error('Blocked');}},'denied'));
});

test('layout shifts use the largest five-second session with one-second gaps, excluding recent input', () => {
  const cls=createLayoutShiftAccumulator(); cls.add({startTime:100,value:.1}); cls.add({startTime:500,value:.2}); assert.ok(Math.abs(cls.value()-.3)<.001);
  cls.add({startTime:700,value:.8,hadRecentInput:true}); assert.ok(Math.abs(cls.value()-.3)<.001);
  cls.add({startTime:2500,value:.2}); cls.add({startTime:2700,value:.15}); assert.ok(Math.abs(cls.value()-.35)<.001);
  cls.add({startTime:2600,value:1}); cls.add({startTime:3000,value:-1}); assert.ok(Math.abs(cls.value()-.35)<.001);
});

test('web vital events include only supported numeric document metrics, without performance resource URLs', () => {
  const payload=analyticsPayload('web_vital',{path:'/',metric:'LCP',value:1234.567,element:'private-dom',resourceUrl:'https://private.example'},origin)!; assert.equal(payload.value,1235); assert.doesNotMatch(JSON.stringify(payload),/private|element|resourceUrl/);
  assert.equal(analyticsPayload('web_vital',{metric:'INP',value:200},origin),null); assert.equal(analyticsPayload('web_vital',{metric:'CLS',value:-1},origin),null);
});

test('verified merchandise discounts reconcile across quantities without including shipping or customer fields', () => {
  const raw = [{...item,quantity:3,price:1000},{...item,quantity:2,price:750}];
  const items = measuredCheckoutItems(raw, 4050)!;
  assert.equal(items.length,2); assert.ok(Math.abs(items.reduce((sum,item)=>sum+item.price*item.quantity,0)-4050)<.001);
  assert.deepEqual(items.map(item=>item.discount),[100,75]); assert.doesNotMatch(JSON.stringify(items),/private|customerPhone/);
  assert.equal(measuredCheckoutItems(raw,5000),null); assert.equal(measuredCheckoutItems(undefined,4050),null);
  const zero=measuredCheckoutItems(raw,0)!; assert.ok(zero.every(item=>item.price===0));
});

function purchaseFixture(extra: Record<string,any> = {}) {
  const markers=new Map<string,string>(), sent:any[]=[];
  const storage={getItem:(key:string)=>markers.get(key)||null,setItem:(key:string,value:string)=>{markers.set(key,value);},removeItem:(key:string)=>{markers.delete(key);}};
  const record=createAcceptedPurchaseRecorder({consent:()=> 'granted',fingerprint:async()=> 'a'.repeat(64),transactionId:()=> '00000000-0000-4000-8000-000000000000',storage:()=>storage,send:async payload=>{sent.push(payload);return true;},...extra});
  const receipt={orderId:'AB-20261014-PRIVATE123',orderType:'ORDER',durablePersistenceReady:true,items:[item],totals:{discountedSubtotal:1125,shipping:150,total:1275}};
  return {record,receipt,markers,sent};
}

test('accepted purchases record once per tab with random transactions and verified net merchandise totals', async () => {
  const f=purchaseFixture(); const result=await Promise.all([f.record(f.receipt),f.record(f.receipt)]);
  assert.deepEqual(result,[true,false]); assert.equal(await f.record(f.receipt),false); assert.equal(f.sent.length,1);
  assert.equal(f.sent[0].value,1125); assert.equal(f.sent[0].shipping,150); assert.equal(f.sent[0].items[0].price,1125);
  assert.doesNotMatch(JSON.stringify(f.sent),/PRIVATE123|private-phone|orderId/); assert.ok([...f.markers.keys()].every(key=>!key.includes(f.receipt.orderId)));
});

test('quote enquiries, failed persistence, denied consent and invalid receipts never record purchases', async () => {
  const f=purchaseFixture();
  for (const receipt of [{...f.receipt,orderType:'QUOTE_REQUEST'},{...f.receipt,durablePersistenceReady:false},{...f.receipt,items:[]},{...f.receipt,orderId:''}]) assert.equal(await f.record(receipt),false);
  const denied=purchaseFixture({consent:()=> 'denied'}); assert.equal(await denied.record(denied.receipt),false);
  assert.deepEqual(f.sent,[]); assert.equal(f.markers.size,0);
});

test('crypto, storage or provider failures never reject checkout and failed delivery releases its reservation', async () => {
  for (const extra of [{fingerprint:async()=>{throw new Error('Crypto blocked');}},{storage:()=>{throw new Error('Storage blocked');}},{send:async()=>{throw new Error('Provider failed');}},{send:async()=>false}]) {
    const f=purchaseFixture(extra); assert.equal(await f.record(f.receipt),false); assert.equal(f.markers.size,0);
  }
  let succeed=false; const f=purchaseFixture({send:async()=>succeed}); assert.equal(await f.record(f.receipt),false); succeed=true; assert.equal(await f.record(f.receipt),true);
});
