import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import express from 'express';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';
import { launchTestBrowser } from './helpers/browser.mjs';
import { usePrefersReducedMotion } from '../src/hooks/usePrefersReducedMotion';

test('motion preference has a safe server snapshot without browser APIs', () => {
  function Probe() { return <output>{String(usePrefersReducedMotion())}</output>; }
  assert.equal(renderToString(<Probe />), '<output>false</output>');
});

test('mounted motion controls follow device changes without reload or lost input, and clean up legacy listeners', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'allbarka-motion-'));
  const entry = `import React,{useEffect}from'react';import{createRoot}from'react-dom/client';
import{usePrefersReducedMotion}from'./src/hooks/usePrefersReducedMotion';
import ScrollReveal from'./src/components/motion/ScrollReveal';import MagneticButton from'./src/components/motion/MagneticButton';import BackToTop from'./src/components/BackToTop';
import{LanguageProvider,useLanguage}from'./src/contexts/LanguageContext';import{ThemeProvider,useTheme}from'./src/contexts/ThemeContext';
function Probe(){const reduce=usePrefersReducedMotion();return <output id="preference">{String(reduce)}</output>}
function Lab(){const{setLanguage}=useLanguage();const{setTheme}=useTheme();useEffect(()=>{window.fixture={lang:setLanguage,theme:setTheme};});return <><Probe/><ScrollReveal className="motion-form"><label>Saved draft<input id="draft" defaultValue=""/></label><MagneticButton id="motion-action" onClick={()=>window.clicks=(window.clicks||0)+1}>Keep shopping</MagneticButton></ScrollReveal><BackToTop threshold={0}/><div style={{height:1800}}/></>}
const root=createRoot(document.getElementById('root'));window.unmount=()=>root.unmount();window.pageToken='same-document';root.render(location.search.includes('probe')?<Probe/>:<ThemeProvider><LanguageProvider><Lab/></LanguageProvider></ThemeProvider>);`;
  await build({ stdin: { contents: entry, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, platform: 'browser', format: 'iife', outfile: path.join(temporary, 'fixture.js'), jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
  await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{usePrefersReducedMotion}from'./src/hooks/usePrefersReducedMotion';function Probe(){return <output id="preference">{String(usePrefersReducedMotion())}</output>}const root=createRoot(document.getElementById('root'));window.unmount=()=>root.unmount();root.render(<Probe/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',outfile:path.join(temporary,'probe.js'),jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
  const app = express();
  app.get('/fixture.js', (_req, res) => res.sendFile(path.join(temporary, 'fixture.js')));
  app.get('/probe.js', (_req,res)=>res.sendFile(path.join(temporary,'probe.js')));
  app.use('/assets', express.static(path.resolve('dist/assets')));
  const css = (await fs.readdir('dist/assets')).filter(x => x.endsWith('.css')).map(x => `<link rel="stylesheet" href="/assets/${x}">`).join('');
  app.get('/', (req, res) => res.type('html').send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body><div id="root"></div><script src="${req.query.probe !== undefined ? '/probe.js' : '/fixture.js'}"></script></body></html>`));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const browser = await launchTestBrowser();
  try {
    const context = await browser.newContext({ reducedMotion: 'no-preference' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.fulfill({ status: 200, body: '' }));
    const page = await context.newPage(); const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin); await page.locator('#preference').waitFor();
    await page.locator('#draft').fill('Keep this draft — محفوظ');
    const layouts: object[] = [];
    for (const width of [390, 1440]) for (const language of ['en', 'ur', 'ar']) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(({language,theme}) => { (window as any).fixture.lang(language); (window as any).fixture.theme(theme); }, {language,theme});
      for (const reduce of [true, false]) {
        await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
        await page.waitForFunction(value => document.querySelector('#preference')?.textContent === String(value), reduce);
        assert.equal(await page.locator('#draft').inputValue(), 'Keep this draft — محفوظ');
        assert.equal(await page.evaluate(() => (window as any).pageToken), 'same-document');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.locator('#motion-action').click();
        // Back-to-top must read the current preference, not the one at mount.
        await page.evaluate(() => { window.scrollBy(0,700); (window as any).scrollCalls=[]; window.scrollTo=(options:any)=>{(window as any).scrollCalls.push(options);}; });
        await page.locator('#back-to-top-btn').click();
        assert.equal(await page.evaluate(() => (window as any).scrollCalls.at(-1)?.behavior), reduce ? 'auto' : 'smooth');
        layouts.push({width,language,theme,reduce,inputPreserved:true});
      }
    }
    assert.equal(await page.evaluate(() => (window as any).clicks),24);
    assert.deepEqual(errors, []); await context.close();
    for (const legacy of [true, false]) {
      const isolated = await browser.newContext();
      await isolated.addInitScript({content: legacy ? `window.listeners=new Set();window.preference={matches:false,addListener:cb=>window.listeners.add(cb),removeListener:cb=>window.listeners.delete(cb)};window.matchMedia=()=>window.preference;window.changePreference=()=>{window.preference.matches=true;window.listeners.forEach(cb=>cb());};` : `window.listeners=new Set();window.matchMedia=undefined;`});
      const p=await isolated.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/?probe');
      await p.waitForFunction(()=>document.querySelector('#preference')?.textContent==='false',{},{timeout:4000}).catch(e=>{throw new Error(JSON.stringify({legacy,errors})+' '+e.message);});
      if(legacy){await p.evaluate(()=>(window as any).changePreference());await p.waitForFunction(()=>document.querySelector('#preference')?.textContent==='true');}
      await p.evaluate(()=>(window as any).unmount());assert.equal(await p.evaluate(()=>(window as any).listeners.size),0);await isolated.close();
    }
    assert.deepEqual(errors,[]);
    if(process.env.ALLBARKA_CAPTURE_EVIDENCE==='true'){await fs.mkdir('docs/evidence/motion-preference',{recursive:true});await fs.writeFile('docs/evidence/motion-preference/layouts.json',JSON.stringify(layouts,null,2)+'\n');}
  } finally {
    await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(temporary,{recursive:true,force:true});
  }
});
