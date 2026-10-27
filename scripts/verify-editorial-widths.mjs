import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Reuse the mounted editorial journey; add narrow/tablet and enlarged-text coverage.
const source = fs.readFileSync('tests/premium-editorial-browser.test.tsx', 'utf8');
const marker = "    await page.goto(origin+'/story');await page.locator('.heritage-story').waitFor();";
if (!source.includes('[390,1440]') || !source.includes(marker)) throw new Error('Editorial fixture changed; review this verification adapter.');
const extra = `    for(const route of ['journal','journal/choosing-pack-sizes','story']){
      await page.goto(origin+'/'+route);await page.locator('h1').waitFor();await page.setViewportSize({width:360,height:1000});
      await page.evaluate(()=>{const changes=[...document.querySelectorAll<HTMLElement>('.editorial-journal *, .heritage-story *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent?.trim())).map(e=>[e,parseFloat(getComputedStyle(e).fontSize)*2] as const);changes.forEach(([e,size])=>e.style.fontSize=size+'px');});
      await page.screenshot({animations:'disabled'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'enlarged text '+route+': '+JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('.heritage-story *')].filter(e=>e.getBoundingClientRect().width>innerWidth).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width})).slice(0,6))));
    }
`;
const temporary = 'tests/.editorial-widths.verify.tsx';
try {
  fs.writeFileSync(temporary, source.replace('[390,1440]', '[360,768]').replace("if(language==='en'&&theme==='light')", 'if(false)').replace("'layouts.json'", "'layouts-extra.json'").replace(marker, extra + marker));
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', '--test-isolation=none', temporary], {
    env: { ...process.env, ALLBARKA_SKIP_LOCAL_ENV: 'true', ALLBARKA_CAPTURE_EVIDENCE: 'true', ALLBARKA_EDITORIAL_BASELINE: 'false' }, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(temporary, { force: true });
}
