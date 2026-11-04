import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { launchTestBrowser } from './helpers/browser.mjs';
import { createVoiceRouter } from '../src/lib/voiceRouter';

// Real UI, codec adapter and HTTP boundary; hardware/decoded samples/provider are fixtures.
// This does not measure real microphone capture or multilingual recognition accuracy.
test('voice review, cancellation and typing fallback across AI Buddy, hero and shop', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-voice-'));
  const entry = `import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';
import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{ThemeProvider,useTheme}from'./src/contexts/ThemeContext';import{CartProvider}from'./src/contexts/CartContext';
import AIConcierge from'./src/components/AIConcierge';import AllBarkaHero from'./src/components/AllBarkaHero';import CategoryPLP from'./src/components/CategoryPLP';
function Surface(){const{setLanguage}=useLanguage();const{setTheme}=useTheme();useEffect(()=>{window.fixture.lang=setLanguage;window.fixture.theme=setTheme;});return location.pathname==='/buddy'?<AIConcierge/>:location.pathname==='/hero'?<AllBarkaHero onSearch={text=>{window.fixture.searches.push(text)}}/>:<CategoryPLP/>;}
window.fixture={searches:[],tracksStopped:0,mode:'ok',voices:[],spoken:[],speechCancels:0};
createRoot(document.getElementById('root')).render(<BrowserRouter><ThemeProvider><LanguageProvider><CartProvider><Surface/></CartProvider></LanguageProvider></ThemeProvider></BrowserRouter>);`;
  await build({ stdin: { contents: entry, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, platform: 'browser',
    format: 'iife', jsx: 'automatic', outfile: path.join(temporary, 'fixture.js'), logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'isolated-auth', setup(builder) {
      builder.onResolve({ filter: /\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const useAuth=()=>({currentUser:null});' }));
    } }] });
  let transcriptions = 0, chats = 0, unavailable = false;
  const app = express();app.use(express.json());
  app.use(createVoiceRouter({ authenticateOptionalUser: (_q,_s,n) => n(), limiter: (_q,_s,n) => n(),
    getConfig: () => unavailable ? null : { key: 'isolated-fixture', model: 'whisper-large-v3' },
    fetcher: async () => { transcriptions++;return new Response(JSON.stringify({text:'pista 250g',duration:1,segments:[]})); },
  }));
  app.post('/api/concierge/chat', (_q,res) => {chats++;res.json({available:true,action:'answer',text:'Choose a portion to continue.'});});
  app.get('/fixture.js',(_q,res)=>res.sendFile(path.join(temporary,'fixture.js')));
  app.use('/fonts',express.static(path.resolve('public/fonts')));
  app.use('/assets',express.static(path.resolve('dist/assets')));app.use('/images',express.static(path.resolve('public/images')));
  const html = await fs.readFile('dist/index.html','utf8');
  const css = [...html.matchAll(/<link\b[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
  app.get(/.*/, (req,res) => req.path.startsWith('/api/') ? res.status(503).json({code:'ISOLATED_FIXTURE'}) : res.type('html').send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css}<style>@font-face{font-family:Amiri;src:url(/fonts/Amiri-Regular.ttf)}@font-face{font-family:"Noto Nastaliq Urdu";src:url(/fonts/NotoNastaliqUrdu.ttf)}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const browser=await launchTestBrowser();
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.fulfill({status:200,body:''}));
    await context.addInitScript({ content: `(() => {
      const get = () => window.fixture;
      Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
        if(get().mode==='denied')throw new DOMException('denied','NotAllowedError');
        const stream={getTracks:()=>[{stop:()=>{get().tracksStopped++;}}]};
        if(get().mode==='late')return await new Promise(resolve=>{get().resolvePermission=()=>resolve(stream);});
        return stream;
      }}});
      class Recorder {
        state='inactive';mimeType='audio/webm';ondataavailable;onstop;
        static isTypeSupported(){return true;}
        start(){this.state='recording';}
        stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['fixture'])});this.onstop?.();});}
      }
      class Audio {
        async decodeAudioData(){return{duration:1};}async close(){}
      }
      class Offline {
        destination={};createBufferSource(){return{connect(){},start(){}};}
        async startRendering(){return{getChannelData:()=>Float32Array.from({length:16000},(_,i)=>Math.sin(i/10)*.1)};}
      }
      Object.assign(window,{MediaRecorder:Recorder,AudioContext:Audio,OfflineAudioContext:Offline});
      const synth=new EventTarget();Object.assign(synth,{getVoices:()=>get().voices,cancel:()=>{get().speechCancels++;},speak:(utterance)=>{get().spoken.push(utterance.lang);utterance.onstart?.();}});
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
      window.SpeechSynthesisUtterance=class { constructor(text){this.text=text;} };
    })();` });
    const page=await context.newPage();page.setDefaultTimeout(15000);
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    const mic=()=>page.getByRole('button',{name:'Speak your request',exact:true});
    const review=()=>page.getByRole('region',{name:'Voice input'});
    async function record() {
      await mic().click();await page.getByRole('button',{name:'Stop recording',exact:true}).click();
      await page.getByRole('textbox',{name:'Edit transcript',exact:true}).waitFor();
    }
    await page.goto(origin+'/buddy');await page.getByRole('button',{name:/Open.*(Buddy|concierge)/i}).click();
    await record();assert.equal(chats,0,'transcription does not send a chat');
    await page.getByRole('textbox',{name:'Edit transcript',exact:true}).fill('badam 1kg');
    await page.getByRole('button',{name:'Use this text',exact:true}).click();
    const chatInput=page.locator('[role="dialog"] form input');assert.equal(await chatInput.inputValue(),'badam 1kg');assert.equal(chats,0);
    await page.locator('[role="dialog"] form button[type="submit"]').click();await page.waitForFunction(()=>document.body.textContent?.includes('Choose a portion to continue.'));assert.equal(chats,1);
    assert.equal(await page.getByRole('button',{name:'Listen to reply',exact:true}).count(),0,'no unavailable voice fallback');
    await page.evaluate(()=>{(window as any).fixture.voices=[{lang:'en-GB',name:'Fixture local English',localService:true}];speechSynthesis.dispatchEvent(new Event('voiceschanged'));});
    await page.getByRole('button',{name:'Listen to reply',exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>(window as any).fixture.spoken),['en-GB']);
    await mic().click();const stopped=await page.evaluate(()=>(window as any).fixture.tracksStopped);
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.waitForFunction(n=>(window as any).fixture.tracksStopped>n,stopped);
    const before=transcriptions;await page.getByRole('button',{name:/Open.*(Buddy|concierge)/i}).click();
    await page.evaluate(()=>{(window as any).fixture.mode='late';});await mic().click();await page.getByRole('button',{name:'Cancel voice input',exact:true}).click();
    const stopLate=await page.evaluate(()=>(window as any).fixture.tracksStopped);
    await page.evaluate(()=>(window as any).fixture.resolvePermission());await page.waitForFunction(n=>(window as any).fixture.tracksStopped>n,stopLate);
    assert.equal(transcriptions,before,'cancelled permission result never uploads');
    await page.goto(origin+'/hero');await record();await page.getByRole('button',{name:'Use this text',exact:true}).click();
    assert.equal(await page.locator('#hero-search-input').inputValue(),'pista 250g');
    await page.locator('#hero-search-suggestions a[href="/product/pista"]').waitFor();
    assert.deepEqual(await page.evaluate(()=>(window as any).fixture.searches),[],'using transcript does not submit hero search');
    await page.goto(origin+'/shop');await record();
    await page.getByRole('textbox',{name:'Edit transcript',exact:true}).fill('badam');await page.keyboard.press('ArrowUp');
    assert.equal(await page.getByRole('textbox',{name:'Edit transcript',exact:true}).evaluate(e=>e===document.activeElement),true,'search navigation does not steal transcript editing keys');
    await page.getByRole('button',{name:'Use this text',exact:true}).click();await page.waitForFunction(()=>new URL(location.href).searchParams.get('search')==='badam'&&document.querySelector<HTMLInputElement>('input[type=search]')?.value==='badam');assert.equal(await page.getByRole('combobox').first().inputValue(),'badam');
    unavailable=true;await mic().click();await page.getByRole('button',{name:'Stop recording',exact:true}).click();
    await page.getByRole('alert').waitFor();assert.match(await review().innerText(),/unavailable.*typing/s);
    await page.getByRole('button',{name:'Cancel voice input',exact:true}).click();await page.getByRole('combobox').first().fill('kaju');await page.waitForFunction(()=>document.querySelector<HTMLInputElement>('input[type=search]')?.value==='kaju');assert.equal(await page.getByRole('combobox').first().inputValue(),'kaju');
    unavailable=false;await page.evaluate(()=>{(window as any).fixture.mode='denied';});await mic().click();await page.getByRole('alert').waitFor();assert.match(await review().innerText(),/permission was not granted/);
    await page.getByRole('button',{name:'Cancel voice input',exact:true}).click();
    await page.evaluate(()=>{(window as any).fixture.mode='ok';(window as any).fixture.lang('ur');(window as any).fixture.theme('dark');});
    await page.waitForFunction(()=>document.documentElement.dir==='rtl');
    await page.locator('[data-voice-control] button').first().click();await page.waitForFunction(()=>document.querySelector('[data-voice-control] button')?.getAttribute('aria-pressed')==='true');
    const panel=page.locator('[data-voice-control] [role="region"]');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const geometry=await panel.evaluate(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));assert.ok(geometry.left>=0&&geometry.right<=390);
    const target=await page.locator('[data-voice-control] button').first().boundingBox();assert.ok(target&&target.width>=44&&target.height>=44);
    const evidence=process.env.ALLBARKA_VOICE_EVIDENCE_DIR?path.resolve(process.env.ALLBARKA_VOICE_EVIDENCE_DIR):temporary;await fs.mkdir(evidence,{recursive:true});
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(evidence,'voice-ur-dark.png'),animations:'disabled'});
    await panel.getByRole('button').first().focus();await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
    assert.deepEqual(errors,[]);
    console.info('VOICE_FIXTURE_EVIDENCE',path.join(evidence,'voice-ur-dark.png'));
    await context.close();
    const unsupported=await browser.newContext();const typed=await unsupported.newPage();
    await typed.addInitScript('window.MediaRecorder=undefined');await typed.goto(origin+'/shop');
    await typed.getByRole('combobox').first().waitFor();
    assert.equal(await typed.locator('[data-voice-control]').count(),0,'unsupported browser keeps normal text search');
    await typed.getByRole('combobox').first().fill('pista');await typed.waitForFunction(()=>new URL(location.href).searchParams.get('search')==='pista');
    await unsupported.close();
  } finally {await browser.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await fs.rm(temporary,{recursive:true,force:true});}
});
