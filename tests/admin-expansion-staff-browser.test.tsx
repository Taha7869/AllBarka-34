import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { once } from 'node:events';
import { build } from 'esbuild';
import { memoryFirestore } from './helpers/memoryFirestore';
import { launchTestBrowser } from './helpers/browser.mjs';
import { staffFixtureOrder,staffFixtureIdentity } from './helpers/staffFixtures';
import { createStaffRouter } from '../src/lib/staffAccess';
import { hasAdminClaim } from '../src/lib/adminOperations';

test('Stage 4 browser: administrator grants access; staff sees read-only orders, responsive details and immediate revoke handling',async()=>{
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'allbarka-staff-'));
  const original=staffFixtureOrder();const {db,records}=memoryFirestore({'orders/AB-STAFF-0001':original});const {auth}=staffFixtureIdentity();
  const requireAuth:any=(req:any,res:any,next:any)=>{const uid=req.get('Authorization')?.replace('Bearer ','');if(!['owner','reader','customer'].includes(uid))return res.status(401).json({code:'UNAUTHORIZED'});req.user={uid,auth_time:Math.floor(Date.now()/1000),...(uid==='owner'?{admin:true}:{})};next();};
  const requireAdmin:any=(req:any,res:any,next:any)=>requireAuth(req,res,()=>hasAdminClaim(req.user)?next():res.status(403).json({code:'FORBIDDEN_ADMIN'}));
  const entry=`import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route}from'react-router-dom';import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{ThemeProvider}from'./src/contexts/ThemeContext';import{FixtureAuthProvider}from'./src/contexts/AuthContext';import StaffOrdersWorkspace from './src/components/StaffOrdersWorkspace';import AdminStaffPanel from './src/components/AdminStaffPanel';
  function Controls(){const{setLanguage}=useLanguage();useEffect(()=>{window.fixtureLanguage=setLanguage},[setLanguage]);return null;}
  createRoot(document.getElementById('root')).render(<BrowserRouter><LanguageProvider><ThemeProvider><FixtureAuthProvider><Controls/><Routes><Route path="/staff/orders" element={<StaffOrdersWorkspace/>}/><Route path="/admin/team" element={<div className="admin-main" style={{maxWidth:1000,margin:'24px auto',padding:16}}><AdminStaffPanel/></div>}/></Routes></FixtureAuthProvider></ThemeProvider></LanguageProvider></BrowserRouter>);`;
  await build({stdin:{contents:entry,loader:'tsx',resolveDir:process.cwd(),sourcefile:'staff-fixture.tsx'},bundle:true,format:'iife',platform:'browser',outfile:path.join(temporary,'fixture.js'),jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'local-fixture-auth',setup(builder){builder.onResolve({filter:/\/AuthContext$/},()=>({path:'auth',namespace:'fixture-only'}));builder.onLoad({filter:/.*/,namespace:'fixture-only'},()=>({contents:`import React,{createContext,useContext,useState,useMemo}from'react';const Context=createContext(null);export const useAuth=()=>useContext(Context);export function FixtureAuthProvider({children}){const[uid,setUid]=useState(location.pathname.includes('/admin')?'owner':'reader');window.fixtureIdentity=setUid;const user=useMemo(()=>({uid,getIdToken:async()=>uid}),[uid]);return <Context.Provider value={{currentUser:user,loading:false,patronProfile:null}}>{children}</Context.Provider>}`,loader:'tsx',resolveDir:process.cwd()}));}}],logLevel:'silent'});
  const app=express();app.use(express.json());app.use(createStaffRouter({getDb:()=>db,getAuth:()=>auth,requireAuth,requireAdmin}));app.use('/assets',express.static(path.resolve('dist/assets')));app.get('/fixture.js',(_req,res)=>res.sendFile(path.join(temporary,'fixture.js')));app.get('/fixture.css',(_req,res)=>res.sendFile(path.join(temporary,'fixture.css')));const styles=(await fs.readdir('dist/assets')).filter(x=>x.endsWith('.css')).map(x=>`<link rel="stylesheet" href="/assets/${x}">`).join('');
  app.get(/.*/,(_req,res)=>res.type('html').send(`<html><head>${styles}<link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;const browser=await launchTestBrowser();
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.goto(`${origin}/admin/team`);await page.getByLabel(/^Staff account email/).fill('reader@example.test');await page.getByRole('button',{name:'Find account',exact:true}).click();await page.getByRole('button',{name:'Grant order access',exact:true}).click();await page.getByText('Team access saved.',{exact:true}).waitFor();assert.equal((records.get('staffAccess/reader') as any).enabled,true);
    await page.goto(`${origin}/staff/orders`);await page.getByText('Ayesha Patron',{exact:true}).waitFor();assert.doesNotMatch(await page.locator('body').innerText(),/SECRET|Export|Change status|Payment recording/);
    const shots=process.env.ALLBARKA_CAPTURE_EVIDENCE==='true'?path.resolve('docs/admin-expansion/evidence'):path.join(temporary,'evidence');await fs.mkdir(shots,{recursive:true});
    for(const [width,height]of [[390,844],[1440,900]]as const)for(const language of ['en','ur','ar']as const)for(const dark of [false,true]){
      await page.setViewportSize({width,height});await page.evaluate(({language,dark})=>{(window as any).fixtureLanguage(language);document.documentElement.classList.toggle('dark',dark);document.documentElement.dataset.theme=dark?'dark':'light';},{language,dark});await page.waitForTimeout(40);
      assert.equal(await page.locator('main.staff-workspace').getAttribute('dir'),language==='en'?'ltr':'rtl');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      if((language==='en'&&!dark)||(width===390&&language==='ur'&&dark)||(width===1440&&language==='ar'&&dark))await page.screenshot({path:path.join(shots,`stage4-${width}-${language}-${dark?'dark':'light'}.png`),fullPage:true});
    }
    await page.evaluate(()=>(window as any).fixtureLanguage('en'));await page.getByRole('button',{name:'View details',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByText('Gulberg III',{exact:true}).waitFor();assert.doesNotMatch(await dialog.innerText(),/SECRET|Internal|audit|Supplier|Change status|Export/i);assert.match(await dialog.innerText(),/500g × 2/);
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Close order details');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Close order details');await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),'View details');
    assert.deepEqual(errors,[]);
    const revoke=await fetch(`${origin}/api/admin/staff/reader`,{method:'PUT',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({enabled:false,expectedRevision:1})});assert.equal(revoke.status,200);
    await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('Order access is unavailable',{exact:true}).waitFor();assert.equal(await page.getByText('Ayesha Patron',{exact:true}).count(),0);assert.ok(errors.every(error=>error.includes('403')));assert.deepEqual(records.get('orders/AB-STAFF-0001'),original);
    await context.close();
  }finally{await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(temporary,{recursive:true,force:true});}
});
