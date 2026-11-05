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
  let transcriptions = 0, chats = 0, unavailable = false, transcriptText = 'pista 250g';
  const app = express();app.use(express.json());
  app.use(createVoiceRouter({ authenticateOptionalUser: (_q,_s,n) => n(), limiter: (_q,_s,n) => n(),
    getConfig: () => unavailable ? null : { key: 'isolated-fixture', model: 'whisper-large-v3' },
    fetcher: async (_url, init) => { transcriptions++;const file = (init!.body as FormData).get('file') as Blob;return new Response(JSON.stringify({text:transcriptText,duration:(file.size-44)/32000,segments:[]})); },
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
        start(){this.state='recording';get().recorder=this;}
        stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:get().mode==='oversize'?new Blob([new Uint8Array(4*1024*1024+1)]):new Blob(['fixture'])});this.onstop?.();});}
      }
      class Audio {
        async decodeAudioData(){if(get().mode==='decode-late')await new Promise(resolve=>{get().resolveDecode=resolve;});return{duration:get().duration||1};}async close(){}
      }
      class Offline {
        constructor(channels,length,rate){this.length=length;get().renderSamples=length;}
        destination={};createBufferSource(){return{connect(){},start(){}};}
        async startRendering(){return{getChannelData:()=>Float32Array.from({length:this.length},(_,i)=>Math.sin(i/10)*.1)};}
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
    await page.evaluate(()=>{(window as any).fixture.mode='late';});await mic().click();await review().getByRole('button',{name:'Cancel voice input',exact:true}).click();
    const stopLate=await page.evaluate(()=>(window as any).fixture.tracksStopped);
    await page.evaluate(()=>(window as any).fixture.resolvePermission());await page.waitForFunction(n=>(window as any).fixture.tracksStopped>n,stopLate);
    assert.equal(transcriptions,before,'cancelled permission result never uploads');
    await page.goto(origin+'/hero');await record();await page.getByRole('button',{name:'Use this text',exact:true}).click();
    // Hero's controlled query reaches the animated input through its state-sync effect.
    // Observe the committed value before the strict assertion, not click completion.
    await page.waitForFunction(()=>document.querySelector<HTMLInputElement>('#hero-search-input')?.value==='pista 250g');
    assert.equal(await page.locator('#hero-search-input').inputValue(),'pista 250g');
    await page.locator('#hero-search-suggestions a[href="/product/pista"]').waitFor();
    assert.deepEqual(await page.evaluate(()=>(window as any).fixture.searches),[],'using transcript does not submit hero search');
    await page.goto(origin+'/shop');await record();
    await page.getByRole('textbox',{name:'Edit transcript',exact:true}).fill('badam');await page.keyboard.press('ArrowUp');
    assert.equal(await page.getByRole('textbox',{name:'Edit transcript',exact:true}).evaluate(e=>e===document.activeElement),true,'search navigation does not steal transcript editing keys');
    await page.getByRole('button',{name:'Use this text',exact:true}).click();await page.waitForFunction(()=>new URL(location.href).searchParams.get('search')==='badam'&&document.querySelector<HTMLInputElement>('input[type=search]')?.value==='badam');assert.equal(await page.getByRole('combobox').first().inputValue(),'badam');
    unavailable=true;await mic().click();await page.getByRole('button',{name:'Stop recording',exact:true}).click();
    await page.getByRole('alert').waitFor();assert.match(await review().innerText(),/unavailable.*typing/s);
    await review().getByRole('button',{name:'Cancel voice input',exact:true}).click();await page.getByRole('combobox').first().fill('kaju');await page.waitForFunction(()=>document.querySelector<HTMLInputElement>('input[type=search]')?.value==='kaju');assert.equal(await page.getByRole('combobox').first().inputValue(),'kaju');
    unavailable=false;await page.evaluate(()=>{(window as any).fixture.mode='denied';});await mic().click();await page.getByRole('alert').waitFor();assert.match(await review().innerText(),/permission was not granted/);
    await review().getByRole('button',{name:'Cancel voice input',exact:true}).click();
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
    let layouts=0;
    for(const width of [360,390,768,1440])for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:width>=768?900:844});
      await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);},{language,theme});
      await page.waitForFunction(({language,theme})=>document.documentElement.dir===(language==='en'?'ltr':'rtl')&&document.documentElement.classList.contains('dark')===(theme==='dark'),{language,theme});
      const box=await page.locator('[data-voice-control] [role="region"]').boundingBox();
      assert.ok(box&&box.x>=0&&box.x+box.width<=width+.5,JSON.stringify({width,language,theme,box}));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const button=await page.locator('[data-voice-control] button').first().boundingBox();assert.ok(button&&button.width>=44&&button.height>=44);
      layouts++;
    }
    await page.setViewportSize({width:390,height:844});
    for(const language of ['en','ur','ar'])for(const theme of ['light','dark']){
      await page.evaluate(({language,theme})=>{(window as any).fixture.lang(language);(window as any).fixture.theme(theme);document.documentElement.style.fontSize='200%';},{language,theme});
      await page.waitForFunction(({language,theme})=>document.documentElement.dir===(language==='en'?'ltr':'rtl')&&document.documentElement.classList.contains('dark')===(theme==='dark'),{language,theme});
      const box=await page.locator('[data-voice-control] [role="region"]').boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=390.5,JSON.stringify({language,theme,box}));
      const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,nodes:Array.from(document.querySelectorAll('body *')).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'',left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})).filter(e=>e.left<0||e.right>innerWidth).slice(0,20)}));
      assert.ok(overflow.scroll<=overflow.width,JSON.stringify({language,theme,overflow}));layouts++;
    }
    await page.evaluate(()=>{document.documentElement.style.fontSize='';(window as any).fixture.lang('ur');(window as any).fixture.theme('dark');});
    await page.waitForFunction(()=>document.documentElement.dir==='rtl');
    console.info('VOICE_02_LAYOUTS_PASS',layouts);
    await panel.getByRole('button').first().focus();await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});

    // Exact capture boundary and codec overrun through real UI -> WAV -> HTTP path.
    await page.goto(origin+'/hero');
    await page.evaluate(()=>(window as any).fixture.lang('en'));await page.waitForFunction(()=>document.documentElement.dir==='ltr');
    const initialTime = new Date('2026-11-05T00:00:00Z');
    await page.clock.install({time:initialTime});await page.clock.pauseAt(new Date(initialTime.getTime()+1000));
    await page.evaluate(()=>{(window as any).fixture.duration=45;});
    const before45=transcriptions, tracks45=await page.evaluate(()=>(window as any).fixture.tracksStopped);
    await mic().click();assert.equal(await page.getByRole('timer').innerText(),'0:45');
    await page.clock.runFor(44000);assert.equal(await page.getByRole('timer').innerText(),'0:01');assert.equal(transcriptions,before45);
    await page.clock.runFor(1000);await page.getByRole('textbox',{name:'Edit transcript',exact:true}).waitFor();
    assert.equal(transcriptions,before45+1,'45s uses exactly one provider request');
    assert.ok(await page.evaluate(()=>(window as any).fixture.tracksStopped)>tracks45);
    await review().getByRole('button',{name:'Cancel voice input',exact:true}).click();
    await page.evaluate(()=>{(window as any).fixture.duration=65;});await record();
    assert.equal(await page.evaluate(()=>(window as any).fixture.renderSamples),960000,'bound allocation before resampling');
    assert.match(await review().innerText(),/first 60 seconds.*remaining part/s);
    await review().getByRole('button',{name:'Cancel voice input',exact:true}).click();

    transcriptText='pista 250g '.repeat(120).trim();await record();
    assert.equal(await page.getByRole('textbox',{name:'Edit transcript',exact:true}).inputValue(),transcriptText);
    assert.equal(await page.getByRole('button',{name:'Use this text',exact:true}).isDisabled(),true);
    await page.getByRole('textbox',{name:'Edit transcript',exact:true}).fill('pista 250g');
    assert.equal(await page.getByRole('button',{name:'Use this text',exact:true}).isEnabled(),true);
    await review().getByRole('button',{name:'Cancel voice input',exact:true}).click();transcriptText='pista 250g';

    // Oversized final recorder event must release the device and never upload corrupt slices.
    await page.evaluate(()=>{(window as any).fixture.mode='oversize';});
    const oversizeCalls=transcriptions, oversizeTracks=await page.evaluate(()=>(window as any).fixture.tracksStopped);
    await mic().click();await page.getByRole('button',{name:'Stop recording',exact:true}).click();await page.getByRole('alert').waitFor();
    assert.equal(transcriptions,oversizeCalls);assert.ok(await page.evaluate(()=>(window as any).fixture.tracksStopped)>oversizeTracks);
    await review().getByRole('button',{name:'Cancel voice input',exact:true}).click();

    // Upload has its own 25s budget even after 14s preparation.
    let held: any;let reached!:()=>void;const uploading=new Promise<void>(resolve=>{reached=resolve;});
    await page.route('**/api/concierge/transcribe',route=>{held=route;reached();});
    await page.evaluate(()=>{(window as any).fixture.mode='decode-late';(window as any).fixture.duration=45;});
    await mic().click();await page.getByRole('button',{name:'Stop recording',exact:true}).click();
    await page.waitForFunction(()=>!!(window as any).fixture.resolveDecode);
    await page.clock.runFor(14000);await page.evaluate(()=>(window as any).fixture.resolveDecode());await uploading;
    await page.clock.runFor(24000);assert.equal(await page.getByRole('alert').count(),0,'preparation budget must not abort a valid upload');
    await held.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'badam 500g'})});
    await page.getByRole('textbox',{name:'Edit transcript',exact:true}).waitFor();
    assert.equal(await page.getByRole('textbox',{name:'Edit transcript',exact:true}).inputValue(),'badam 500g');
    await page.unroute('**/api/concierge/transcribe');await review().getByRole('button',{name:'Cancel voice input',exact:true}).click();

    // Non-reduced-motion drawer remains mounted during exit; cancellation happens immediately.
    await page.goto(origin+'/buddy');await page.emulateMedia({reducedMotion:'no-preference'});
    await page.getByRole('button',{name:/Open.*(Buddy|concierge)/i}).click();await page.locator('[role="dialog"]').waitFor();await page.clock.runFor(1000);await record();
    await page.getByRole('button',{name:'Use this text',exact:true}).click();await page.locator('[role="dialog"] form button[type="submit"]').click();
    await page.waitForFunction(()=>document.body.textContent?.includes('Choose a portion to continue.'));
    await page.evaluate(()=>{(window as any).fixture.voices=[{lang:'en-GB',name:'Fixture local English',localService:true}];speechSynthesis.dispatchEvent(new Event('voiceschanged'));});
    await page.getByRole('button',{name:'Listen to reply',exact:true}).click();
    const cancels=await page.evaluate(()=>(window as any).fixture.speechCancels);
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.waitForFunction(n=>(window as any).fixture.speechCancels>n,cancels);
    assert.equal(await page.locator('[role="dialog"]').count(),1,'exit is retained while the clock is paused');
    // This case deliberately holds the exit frame to test audio cleanup before unmount.
    // Context teardown ends the fixture; animation completion is not driven by this clock.
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
