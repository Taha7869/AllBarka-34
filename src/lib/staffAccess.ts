import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth, DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import { Router, type RequestHandler } from 'express';
import { hasAdminClaim, listAdminOrders, parseAdminOrderFilters, validateAdminOrderId, AdminOperationError } from './adminOperations';
import { storedOrderStatus } from './orderStatuses';
import { resolveHamper } from './hamperCatalog';
import type { StaffMember, StaffOrder, StaffLedger } from './staffContracts';

export type StaffIdentityService = Pick<Auth, 'getUser' | 'getUserByEmail'>;
export class StaffAccessError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
const fail = (code: string, status = 400): never => { throw new StaffAccessError(code, status); };
const uid = (value: unknown): string => {
  if (typeof value !== 'string' || !value || value.length > 128 || /[\/\u0000-\u0020\u007f]/.test(value) || ['.','..'].includes(value)) return fail('INVALID_STAFF_UID');
  return value;
};
const text = (value: unknown, max = 200): string => typeof value === 'string' ? value.slice(0, max) : '';
const number = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
function member(value: any, memberUid: string): StaffMember {
  return { uid: memberUid, email: text(value?.email,254), displayName: text(value?.displayName), enabled: value?.version === 1 && value?.uid === memberUid && value?.enabled === true && Number.isSafeInteger(value?.revision) && value.revision > 0,
    revision: Number.isSafeInteger(value?.revision) && value.revision >= 0 ? value.revision : 0, updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : null };
}
async function identity(auth: StaffIdentityService | null, claims: { uid?: string; auth_time?: number }): Promise<UserRecord> {
  if (!auth) return fail('AUTH_SERVICE_UNAVAILABLE',503);
  const accountUid=uid(claims.uid);
  let account: UserRecord;
  try { account=await auth.getUser(accountUid); }
  catch (error) { return fail((error as any).code==='auth/user-not-found'?'STAFF_ACCESS_DENIED':'AUTH_SERVICE_UNAVAILABLE',(error as any).code==='auth/user-not-found'?403:503); }
  if (account.disabled) return fail('STAFF_ACCESS_DENIED',403);
  const validSince=Date.parse(account.tokensValidAfterTime || '');
  if (Number.isFinite(validSince) && (!Number.isFinite(claims.auth_time) || claims.auth_time! < Math.floor(validSince/1000))) return fail('STAFF_ACCESS_DENIED',403);
  return account;
}
async function administrator(auth:StaffIdentityService|null,claims:Partial<DecodedIdToken>) {
  const account=await identity(auth,claims);
  if (!hasAdminClaim(account.customClaims)) return fail('FORBIDDEN_ADMIN',403);
  return account;
}
export async function assertStaffReader(db:Firestore|null,auth:StaffIdentityService|null,claims:Partial<DecodedIdToken>) {
  const account=await identity(auth,claims);
  if (hasAdminClaim(account.customClaims)) return;
  if (!db) return fail('DB_UNAVAILABLE',503);
  const snap=await db.collection('staffAccess').doc(account.uid).get();
  if (!snap.exists || !member(snap.data(),account.uid).enabled || !account.emailVerified) return fail('STAFF_ACCESS_DENIED',403);
}
export async function lookupStaffAccount(db:Firestore|null,auth:StaffIdentityService|null,claims:Partial<DecodedIdToken>,email:unknown) {
  await administrator(auth,claims);
  if (!db) return fail('DB_UNAVAILABLE',503);
  if (typeof email!=='string'||email.trim().length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return fail('INVALID_STAFF_EMAIL');
  let account:UserRecord;
  try {account=await auth!.getUserByEmail(email.trim().toLowerCase());}
  catch(error){return fail((error as any).code==='auth/user-not-found'?'STAFF_ACCOUNT_NOT_FOUND':'AUTH_SERVICE_UNAVAILABLE',(error as any).code==='auth/user-not-found'?404:503);}
  if(account.disabled) return fail('STAFF_ACCOUNT_DISABLED');
  if(!account.emailVerified) return fail('STAFF_EMAIL_UNVERIFIED');
  if(hasAdminClaim(account.customClaims)) return fail('STAFF_ALREADY_ADMIN');
  const snapshot=await db.collection('staffAccess').doc(account.uid).get();
  return {...member(snapshot.data(),account.uid),email:account.email||'',displayName:account.displayName||''};
}
export async function changeStaffAccess(input:{db:Firestore|null;auth:StaffIdentityService|null;claims:Partial<DecodedIdToken>;targetUid:unknown;body:unknown}) {
  const actor=await administrator(input.auth,input.claims);
  const targetUid=uid(input.targetUid);const body=input.body as any;
  if (!body || typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['enabled','expectedRevision'].includes(key))||typeof body.enabled!=='boolean'||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0) return fail('INVALID_STAFF_ACCESS');
  if (!input.db) return fail('DB_UNAVAILABLE',503);
  let account:UserRecord|null=null;
  if (body.enabled) {
    try {account=await input.auth!.getUser(targetUid);}catch(error){return fail((error as any).code==='auth/user-not-found'?'STAFF_ACCOUNT_NOT_FOUND':'AUTH_SERVICE_UNAVAILABLE',(error as any).code==='auth/user-not-found'?404:503);}
    if(account.disabled) return fail('STAFF_ACCOUNT_DISABLED');
    if(!account.emailVerified) return fail('STAFF_EMAIL_UNVERIFIED');
    if(hasAdminClaim(account.customClaims)) return fail('STAFF_ALREADY_ADMIN');
  }
  const db=input.db;
  return db.runTransaction(async transaction=>{
    const ref=db.collection('staffAccess').doc(targetUid);const snap=await transaction.get(ref);const current=member(snap.data(),targetUid);
    if(!snap.exists&&!body.enabled) return fail('STAFF_ACCOUNT_NOT_FOUND',404);
    if(current.revision!==body.expectedRevision||current.revision>=Number.MAX_SAFE_INTEGER) return fail('STAFF_REVISION_CONFLICT',409);
    const updated:StaffMember={...current,email:account?.email||current.email,displayName:account?.displayName||current.displayName,enabled:body.enabled,revision:current.revision+1,updatedAt:new Date().toISOString()};
    transaction.set(ref,{...updated,version:1,updatedBy:actor.uid});
    transaction.set(db.collection('staffAccessAudits').doc(randomUUID()),{action:body.enabled?'STAFF_ORDER_READER_GRANTED':'STAFF_ORDER_READER_REVOKED',targetUid,actorUid:actor.uid,previousRevision:current.revision,revision:updated.revision,updatedAt:updated.updatedAt});
    return updated;
  });
}
/** Dedicated allowlist. Never spread an order, customer, item, schedule or totals object. */
export function sanitizeOrderForStaff(raw:any):StaffOrder {
  const quote=raw?.isQuoteRequest===true||raw?.orderType==='QUOTE_REQUEST'||raw?.status==='QUOTE_REQUESTED';
  const customer=raw?.customer||{}, totals=raw?.totals||{}, gifting=raw?.gifting||{};
  return {orderId:text(raw?.orderId,100),createdAt:text(raw?.createdAt,40),updatedAt:text(raw?.updatedAt||raw?.createdAt,40),status:storedOrderStatus(raw?.status)||text(raw?.status,40),paymentStatus:text(raw?.paymentStatus,40),paymentMethod:text(raw?.paymentMethod,20),isQuoteRequest:quote,
    customer:{name:text(customer.name),phone:text(customer.phone,40),city:text(customer.city,120),address:text(customer.address,1200),deliverySlot:text(customer.deliverySlot),instructions:text(customer.instructions,2000)},
    items:(Array.isArray(raw?.items)?raw.items:[]).slice(0,100).map((item:any)=>{const hamper=item.productId==='custom-hamper'?resolveHamper(item.hamperConfiguration)?.configuration:null;return {productId:text(item.productId,100),name:text(item.name),selectedWeight:text(item.selectedWeight,100),quantity:number(item.quantity),price:quote?0:number(item.price),hamper:hamper?{boxId:hamper.boxId,selections:[...hamper.selections],recipientName:hamper.recipientName,giftMessage:hamper.giftMessage}:null};}),
    totals:{subtotal:quote?0:number(totals.subtotal),discount:quote?0:number(totals.discount),shipping:quote?0:number(totals.shipping),giftWrapFee:quote?0:number(totals.giftWrapFee),total:quote?0:number(totals.total)},
    gifting:{giftWrapping:gifting.giftWrapping===true,giftMessage:text(gifting.giftMessage,1000)},deliveryDate:text(raw?.deliverySchedule?.scheduledDeliveryDate,40)};
}
export function createStaffRouter(options:{getDb:()=>Firestore|null;getAuth:()=>StaffIdentityService|null;requireAuth:RequestHandler;requireAdmin:RequestHandler}) {
  const router=Router();
  router.use(['/api/staff','/api/admin/staff'],(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
  const failure=(error:unknown,res:import('express').Response)=>res.status(error instanceof StaffAccessError?error.status:error instanceof AdminOperationError?error.httpStatus:503).json({code:error instanceof StaffAccessError||error instanceof AdminOperationError?error.code:'DB_UNAVAILABLE'});
  const claims=(request:import('express').Request)=>(request as any).user as Partial<DecodedIdToken>;
  router.use('/api/staff',options.requireAuth,async(req,res,next)=>{try{await assertStaffReader(options.getDb(),options.getAuth(),claims(req));next();}catch(error){failure(error,res);}});
  router.get('/api/staff/access',(_req,res)=>res.json({access:'orders_read'}));
  router.get('/api/staff/orders',async(req,res)=>{
    try{
      if(Object.keys(req.query).some(key=>!['page','limit','status','range','search','cursor'].includes(key)))return fail('INVALID_FILTER');
      const result=await listAdminOrders(options.getDb(),parseAdminOrderFilters({...req.query,limit:typeof req.query.limit==='string'?String(Math.min(Number(req.query.limit),25)):'20'}));
      const ledger:StaffLedger={orders:result.orders.map(sanitizeOrderForStaff),page:result.page,totalPages:result.totalPages,totalCount:result.totalCount,hasMore:result.hasMore,nextCursor:result.nextCursor,truncated:result.truncated,asOf:result.asOf};return res.json(ledger);
    }catch(error){return failure(error,res);}
  });
  router.get('/api/staff/orders/export',(_req,res)=>res.status(403).json({code:'STAFF_READ_ONLY'}));
  router.get('/api/staff/orders/:orderId',async(req,res)=>{
    try{const id=validateAdminOrderId(req.params.orderId);const db=options.getDb();if(!db)return fail('DB_UNAVAILABLE',503);const snap=await db.collection('orders').doc(id).get();if(!snap.exists)return fail('ORDER_NOT_FOUND',404);return res.json({order:sanitizeOrderForStaff({...snap.data(),orderId:id})});}catch(error){return failure(error,res);}
  });
  // Explicitly deny unknown staff methods/exports instead of falling through to a write route.
  router.use('/api/staff',(_req,res)=>res.status(403).json({code:'STAFF_READ_ONLY'}));
  router.use('/api/admin/staff',options.requireAdmin,async(req,res,next)=>{try{await administrator(options.getAuth(),claims(req));next();}catch(error){failure(error,res);}});
  router.get('/api/admin/staff',async(_req,res)=>{try{const db=options.getDb();if(!db)return fail('DB_UNAVAILABLE',503);const snap=await db.collection('staffAccess').limit(201).get();return res.json({members:snap.docs.slice(0,200).map(doc=>member(doc.data(),doc.id)),truncated:snap.docs.length>200});}catch(error){return failure(error,res);}});
  router.post('/api/admin/staff/lookup',async(req,res)=>{try{return res.json({member:await lookupStaffAccount(options.getDb(),options.getAuth(),claims(req),req.body?.email)});}catch(error){return failure(error,res);}});
  router.put('/api/admin/staff/:uid',async(req,res)=>{try{return res.json({member:await changeStaffAccess({db:options.getDb(),auth:options.getAuth(),claims:claims(req),targetUid:req.params.uid,body:req.body})});}catch(error){return failure(error,res);}});
  return router;
}
