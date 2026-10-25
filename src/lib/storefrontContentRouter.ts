import { Router,type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { DEFAULT_STOREFRONT_CONTENT,validateStorefrontContent,publicStorefrontContent,ContentError } from './storefrontContent';
function bundle(raw:any){
  if(!raw)return {version:1,revision:0,liveRevision:0,draft:structuredClone(DEFAULT_STOREFRONT_CONTENT),live:structuredClone(DEFAULT_STOREFRONT_CONTENT)};
  if(raw.version!==1||!Number.isSafeInteger(raw.revision)||raw.revision<0||!Number.isSafeInteger(raw.liveRevision)||raw.liveRevision<0||raw.liveRevision>raw.revision)throw new ContentError('CONTENT_STORE_INVALID',503);
  return {version:1,revision:raw.revision,liveRevision:raw.liveRevision,draft:validateStorefrontContent(raw.draft),live:validateStorefrontContent(raw.live,true)};
}
export async function readStorefrontContent(db:Firestore|null){if(!db)throw new ContentError('CONTENT_STORE_UNAVAILABLE',503);const snapshot=await db.collection('storefrontContent').doc('main').get();return bundle(snapshot.exists?snapshot.data():null);}
export function createStorefrontContentRouter(options:{getDb:()=>Firestore|null;requireAdmin:RequestHandler}){
  const router=Router();const error=(failure:unknown,res:import('express').Response)=>res.status(failure instanceof ContentError?failure.status:503).json({code:failure instanceof ContentError?failure.code:'CONTENT_STORE_UNAVAILABLE'});
  router.get('/api/storefront-content',async(_req,res)=>{res.setHeader('Cache-Control','no-store');try{const value=await readStorefrontContent(options.getDb());return res.json({content:publicStorefrontContent(value.live),revision:value.liveRevision});}catch(e){return error(e,res);}});
  router.get('/api/admin/storefront-content',options.requireAdmin,async(_req,res)=>{res.setHeader('Cache-Control','no-store');try{return res.json(await readStorefrontContent(options.getDb()));}catch(e){return error(e,res);}});
  for(const action of ['draft','publish']as const)router.post(`/api/admin/storefront-content/${action}`,options.requireAdmin,async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    try{const db=options.getDb();if(!db)throw new ContentError('CONTENT_STORE_UNAVAILABLE',503);const actor=(req as any).user?.uid;if(typeof actor!=='string'||!actor)throw new ContentError('FORBIDDEN_ADMIN',403);
      if(!Number.isSafeInteger(req.body?.expectedRevision)||req.body.expectedRevision<0)throw new ContentError('CONTENT_REVISION_CONFLICT',409);
      const requested=action==='draft'?validateStorefrontContent(req.body.content):null;
      const result=await db.runTransaction(async transaction=>{const reference=db.collection('storefrontContent').doc('main');const snapshot=await transaction.get(reference);const current=bundle(snapshot.exists?snapshot.data():null);
        if(current.revision!==req.body.expectedRevision||current.revision>=Number.MAX_SAFE_INTEGER)throw new ContentError('CONTENT_REVISION_CONFLICT',409);
        const next=action==='publish'?validateStorefrontContent(current.draft,true):requested!;
        if(action==='draft')for(const entry of current.draft.articles)if(!next.articles.some(article=>article.slug===entry.slug))throw new ContentError('ARCHIVE_ARTICLE_INSTEAD');
        const revision=current.revision+1;const updated={version:1,revision,liveRevision:action==='publish'?revision:current.liveRevision,draft:next,live:action==='publish'?next:current.live};
        const updatedAt=new Date().toISOString();transaction.set(reference,{...updated,updatedAt,updatedBy:actor});
        transaction.set(db.collection('storefrontContentAudits').doc(randomUUID()),{action:action==='publish'?'CONTENT_PUBLISHED':'CONTENT_DRAFT_SAVED',actorUid:actor,revision,updatedAt,previous:action==='publish'?current.live:current.draft,updated:next});return updated;
      });return res.json(result);
    }catch(e){return error(e,res);}
  });
  return router;
}
