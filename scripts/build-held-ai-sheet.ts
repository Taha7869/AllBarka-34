// Adds/refreshes the "Held items: new AI images" block at the top of docs/catalog/DRAFT_IMAGES_SHEET.html.
// Reads public/images/held-ai-20261120/<id>.webp for every id in IMAGE_HOLD_20261119.txt that exists,
// shows old (drafts-20261118) vs new (AI) side by side. Does not touch any other image or product data.
import fs from 'node:fs';
import { intakeProducts20261110 } from '../src/lib/catalogIntake20261110';
import { intakeProducts20261113 } from '../src/lib/catalogIntake20261113';
import { intakeProducts20261114 } from '../src/lib/catalogIntake20261114';
import { intakeProducts20261115 } from '../src/lib/catalogIntake20261115';

const all: any[] = [...intakeProducts20261110(), ...intakeProducts20261113(), ...intakeProducts20261114(), ...intakeProducts20261115()];
const byId = new Map(all.map(p => [String(p.id), p]));
const held = fs.readFileSync('docs/catalog/IMAGE_HOLD_20261119.txt', 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const aiDir = 'public/images/held-ai-20261120';
const aiIds = fs.existsSync(aiDir)
  ? fs.readdirSync(aiDir).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)).sort()
  : [];
const tracked = Array.from(new Set([...aiIds, ...held]));
const done = tracked.filter(id => fs.existsSync(`${aiDir}/${id}.webp`));
const pending = held.filter(id => !done.includes(id));

const card = (id: string) => {
  const p = byId.get(id)!;
  const kb = Math.round(fs.statSync(`${aiDir}/${id}.webp`).size / 1024);
  const oldImg = fs.existsSync(`public/images/drafts-20261118/${id}.webp`)
    ? `../../public/images/drafts-20261118/${id}.webp`
    : `../../public${p.image}`;
  const comps = p.isBundle ? `<div class="comps"><strong>Components:</strong> ${(p.componentIds || []).join(', ')}</div>` : '';
  return `      <div class="card" id="ai-${id}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px"><img src="../../${aiDir}/${id}.webp" alt="${p.name_en} (new AI)" /><img src="${oldImg}" alt="old" style="opacity:.55" /></div>
        <div class="info"><div class="name-en">${p.name_en}</div><div class="name-ur">${p.name_ur || ''}</div>
        <div><span class="id-badge">${id}</span> <span style="font-size:11px;color:#777">NEW AI left, OLD right • ${kb}KB</span></div>${comps}</div>
      </div>`;
};

const block = `<!--HELD_AI_START-->
  <section id="held-ai">
    <h2>HOLD items: new AI-generated images (${done.length} of ${tracked.length})</h2>
    <div class="meta" style="margin-bottom:10px">Left = new AI photo, right (faded) = previous composed image. Still draft; publish waits for owner "haan". Pending: ${pending.length ? pending.join(', ') : 'none'}</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(380px,1fr))">
${done.map(card).join('\n')}
    </div>
  </section>
<!--HELD_AI_END-->
`;

let html = fs.readFileSync('docs/catalog/DRAFT_IMAGES_SHEET.html', 'utf8');
html = html.replace(/<!--HELD_AI_START-->[\s\S]*?<!--HELD_AI_END-->\n?/, '');
html = html.replace('</header>\n', `</header>\n  ${block}`);
fs.writeFileSync('docs/catalog/DRAFT_IMAGES_SHEET.html', html, 'utf8');
console.log(`sheet: ${done.length} new AI images shown, ${pending.length} pending`);
