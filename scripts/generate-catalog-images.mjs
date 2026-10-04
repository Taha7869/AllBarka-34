/** Editorial SVG placeholders for catalog additions. Run with: node --import tsx scripts/generate-catalog-images.mjs herbs-spices */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { PRODUCTS } from '../src/data/products.ts';

const sequence = ['herbs-spices', 'nuts', 'snacks-seeds', 'oils', 'bundles'];
const category = process.argv[2];
if (!sequence.includes(category)) throw new Error(`Choose one category: ${sequence.join(', ')}`);
const refreshGenerated = process.argv.includes('--refresh-generated');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fonts = {
  ur: readFileSync('public/fonts/NotoNastaliqUrdu.ttf').toString('base64'),
  ar: readFileSync('public/fonts/Amiri-Regular.ttf').toString('base64'),
};
const out = resolve('public/images/products');
mkdirSync(out, { recursive: true });
const products = PRODUCTS.filter(p => p.category === category && (p.image === null || (refreshGenerated && p.image === `/images/products/${p.id}.svg`)));
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('about:blank');
const checks = [];

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
function hash(value) { let h = 2166136261; for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed) { let state = seed; return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32); }
function spread(seed, count, draw) {
  const random = rng(seed); const pieces = [];
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random());
    const x = 480 + Math.cos(angle) * radius * 265;
    const y = 405 + Math.sin(angle) * radius * 133;
    pieces.push(draw(x, y, random() * 360, random(), i));
  }
  return pieces.join('');
}
function piece(id, x, y, angle, variation) {
  const transform = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`;
  let inner;
  if (/cinnamon/.test(id)) inner = `<rect x="-49" y="-8" width="98" height="16" rx="7" fill="#a76b35" stroke="#69421f" stroke-width="3"/><path d="M-45-3H45M-45 3H45" stroke="#e0ac69" stroke-width="2"/>`;
  else if (/cardamom/.test(id)) inner = `<ellipse rx="27" ry="12" fill="${id.includes('black') ? '#5b4632' : '#929c5c'}" stroke="#645c37" stroke-width="2"/><path d="M-22 0H22M-12-8V8M3-10V10" stroke="#d4c789" stroke-width="1.5" opacity=".7"/>`;
  else if (/anise/.test(id)) inner = Array.from({ length: 8 }, (_, i) => `<path d="M0 0L-10-10L0-31L10-10Z" transform="rotate(${i * 45})" fill="#85502e" stroke="#4d2c1c" stroke-width="2"/>`).join('');
  else if (/cloves/.test(id)) inner = `<path d="M0 0V-23M-9-23Q0-32 9-23" stroke="#4b2a1e" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  else if (/rose/.test(id)) inner = `<ellipse rx="17" ry="7" fill="${variation > .5 ? '#a35e68' : '#cc8e8d'}" stroke="#e6bab4" stroke-width="1"/>`;
  else if (/mint|methi/.test(id)) inner = `<path d="M-18 3Q-5-18 19-4Q3 18-18 3Z" fill="${variation > .5 ? '#58694b' : '#89916b'}" stroke="#3c563b" stroke-width="2"/><path d="M-15 4Q0-1 15-4" stroke="#bcc49b" fill="none"/>`;
  else if (/gond/.test(id)) inner = `<path d="M-17-9L-4-19L15-12L20 7L2 16L-16 8Z" fill="${variation > .5 ? '#e4bd7c' : '#dfd2ae'}" stroke="#b89b73" stroke-width="2" opacity=".9"/>`;
  else if (/ginger|masala/.test(id)) inner = `<ellipse rx="23" ry="11" fill="${/chaat/.test(id) ? '#b77653' : '#bd9a68'}"/><ellipse cx="-5" cy="-3" rx="10" ry="3" fill="#e9ca91" opacity=".45"/>`;
  else if (/jujube|dates|prunes|chohara/.test(id)) inner = `<ellipse rx="19" ry="13" fill="${variation > .5 ? '#713927' : '#984c2e'}" stroke="#512c21" stroke-width="2"/><path d="M-11-3Q0-9 11-2" stroke="#c68756" fill="none" opacity=".7"/>`;
  else if (/pepper|sesame|poppy|basil/.test(id)) inner = `<circle r="${/pepper/.test(id) ? 9 : 5}" fill="${/white/.test(id) ? '#e2d5b0' : '#383b2f'}" stroke="#72664a" stroke-width="1"/>`;
  else if (/saffron/.test(id)) inner = `<path d="M-18-8Q0 5 18-7M-16 0Q0 10 17 0M-12 8Q2 17 16 9" stroke="#a13727" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  else if (/fig/.test(id)) inner = `<path d="M0-24Q22-13 19 7Q0 23-19 7Q-22-13 0-24Z" fill="#8b6746" stroke="#4a4430" stroke-width="2"/><path d="M-10 2Q0 12 10 1" stroke="#d7b07a" fill="none"/>`;
  else if (/apricot|mulberry|cranberr|raisin/.test(id)) inner = `<ellipse rx="${/raisin/.test(id) ? 12 : 17}" ry="${/raisin/.test(id) ? 8 : 12}" fill="${/golden/.test(id) ? '#bb8545' : /cranberr/.test(id) ? '#a34546' : '#74503b'}" stroke="#563822" stroke-width="1.5"/>`;
  else if (/walnut/.test(id)) inner = `<path d="M-17-7Q-19-21 0-17Q19-21 17-7Q22 9 2 17Q-17 18-17-7Z" fill="#b89061" stroke="#805b37" stroke-width="2"/><path d="M0-15Q-6 0 1 15M-12-5L-2 3M11-5L1 4" stroke="#795636" fill="none" stroke-width="2"/>`;
  else if (/pista/.test(id)) inner = `<path d="M-20-3Q-5-18 15-9Q24 5 9 14Q-10 21-20-3Z" fill="#e5d4b0" stroke="#957f55" stroke-width="2"/><ellipse cx="1" cy="1" rx="12" ry="7" fill="#7e9b64"/>`;
  else if (/almond|maghaz|pine[- ]nuts/.test(id)) inner = `<path d="M-20 0Q0-15 20 0Q0 17-20 0Z" fill="${variation > .5 ? '#b3804e' : '#c3986b'}" stroke="#835b35" stroke-width="2"/><path d="M-12 0H12" stroke="#e7bd88" stroke-width="1"/>`;
  else if (/cashew/.test(id)) inner = `<path d="M-17-6Q-25 15-5 17Q24 16 18-8Q14-16 7-12Q14 2 2 5Q-10 7-9-8Z" fill="#e7cd9a" stroke="#aa8a59" stroke-width="2"/>`;
  else if (/fox-nuts/.test(id)) inner = `<circle r="15" fill="#e7d8b9" stroke="#b9a17e" stroke-width="2"/><circle r="4" fill="#8f7860"/>`;
  else inner = `<ellipse rx="14" ry="5" fill="${variation > .5 ? '#9d875d' : '#c4ac79'}" stroke="#756443" stroke-width="1"/>`;
  return `<g transform="${transform}">${inner}</g>`;
}
function baseScene(product) {
  const seed = hash(product.id); const count = /cinnamon/.test(product.id) ? 30 : /cardamom|rose|jujube|fig|walnut|cashew|almond|dates/.test(product.id) ? 68 : 125;
  const content = spread(seed, count, (x, y, angle, variance) => piece(product.id, x, y, angle, variance));
  return `<ellipse cx="480" cy="557" rx="348" ry="58" fill="#766b55" opacity=".2" filter="url(#soft)"/>
    <ellipse cx="480" cy="440" rx="342" ry="193" fill="url(#ceramic)" stroke="#eee8db" stroke-width="13"/>
    <ellipse cx="480" cy="405" rx="296" ry="146" fill="#c2ae8b" stroke="#e7dfd0" stroke-width="5"/>
    <g clip-path="url(#bowlClip)"><ellipse cx="480" cy="405" rx="296" ry="146" fill="#876b4b"/>${content}</g>
    <ellipse cx="480" cy="411" rx="305" ry="152" fill="none" stroke="#f6f2ea" stroke-width="19" opacity=".94"/>
    <ellipse cx="480" cy="413" rx="314" ry="160" fill="none" stroke="#9f988a" stroke-width="3" opacity=".28"/>`;
}
function oilScene(product) {
  const seed = hash(product.id);
  const garnish = spread(seed, 22, (x, y, angle, variance) => piece(product.id.includes('chilgoza') ? 'pine-nuts' : 'pumpkin-seeds', x - 135, y + 102, angle, variance));
  return `<ellipse cx="485" cy="580" rx="230" ry="35" fill="#685a44" opacity=".25" filter="url(#soft)"/>
    <g opacity=".9">${garnish}</g>
    <rect x="401" y="122" width="158" height="63" rx="12" fill="url(#cap)" stroke="#c4bbad" stroke-width="4"/>
    ${Array.from({ length: 12 }, (_, i) => `<path d="M${411 + i * 12} 128v51" stroke="#c4c0b6" stroke-width="2" opacity=".65"/>`).join('')}
    <path d="M415 183h130v30q55 26 56 80v239q0 36-35 44H394q-35-8-35-44V293q1-54 56-80Z" fill="#eed59a" fill-opacity=".73" stroke="#f7ead4" stroke-width="13"/>
    <path d="M374 314h212v216q0 28-26 34H400q-26-6-26-34Z" fill="${product.id.includes('pumpkin') ? '#b68032' : '#cf9b46'}" opacity=".75"/>
    <path d="M392 213Q367 270 371 352v168" fill="none" stroke="#fff8e3" opacity=".7" stroke-width="15" stroke-linecap="round"/>
    <rect x="387" y="343" width="186" height="151" rx="5" fill="#f5efdf" stroke="#c9b98e" stroke-width="2"/>
    <text x="480" y="379" text-anchor="middle" fill="#aa8434" font-size="26" font-family="Georgia,serif">✦</text>
    <text x="480" y="415" text-anchor="middle" fill="#163e31" font-size="27" font-family="Georgia,serif">AllBarka</text>
    <path d="M423 430h114" stroke="#c6a15c"/>
    <text x="480" y="454" text-anchor="middle" fill="#173e31" font-size="14" letter-spacing="1.5" font-family="Arial,sans-serif">${product.id.includes('pumpkin') ? 'PUMPKIN SEED OIL' : 'CHILGOZA OIL'}</text>`;
}
function bundleScene(product) {
  const tones = ['#bb8a53', '#71835c', '#8d4e38', '#dec090', '#b15f4d', '#625939', '#d7ab69'];
  const slots = Array.from({ length: 6 }, (_, i) => {
    const x = 242 + (i % 3) * 160, y = 315 + Math.floor(i / 3) * 99;
    const fill = tones[(hash(product.id) + i) % tones.length];
    return `<rect x="${x}" y="${y}" width="144" height="85" rx="9" fill="#f2e6cd" stroke="#baa97f" stroke-width="5"/>
      <ellipse cx="${x + 72}" cy="${y + 42}" rx="58" ry="30" fill="${fill}"/>
      ${spread(hash(product.id + i), 10, (sx, sy, a, v) => piece((product.components?.[i % (product.components?.length || 1)] || (i % 2 ? 'almond' : 'dates')).toLowerCase(), x + 70 + (sx - 480) * .16, y + 41 + (sy - 405) * .17, a, v))}`;
  }).join('');
  return `<ellipse cx="480" cy="575" rx="350" ry="46" fill="#493f30" opacity=".27" filter="url(#soft)"/>
    <rect x="205" y="251" width="550" height="313" rx="21" fill="#0f382c" stroke="#bf9a54" stroke-width="11"/>
    <rect x="223" y="267" width="514" height="281" rx="10" fill="#e8d9ba" stroke="#f5e7ca" stroke-width="5"/>${slots}
    <path d="M480 234v331M212 408h540" stroke="#d4ae6c" stroke-width="18" opacity=".92"/>
    <path d="M456 248Q355 166 385 154Q425 143 480 225Q535 143 575 154Q605 166 504 248" fill="none" stroke="#d4ae6c" stroke-width="18" stroke-linecap="round"/>
    <circle cx="480" cy="408" r="32" fill="#0f382c" stroke="#e9c98e" stroke-width="7"/><text x="480" y="417" fill="#e9c98e" text-anchor="middle" font-size="26" font-family="Georgia,serif">A</text>`;
}
function scene(product, label) {
  const visual = product.category === 'oils' ? oilScene(product) : product.category === 'bundles' ? bundleScene(product) : baseScene(product);
  const badgeText = (product.badge || 'Curated Bundle').toUpperCase();
  const badgeWidth = Math.min(480, Math.max(185, 26 + badgeText.length * 10));
  const badge = product.category === 'bundles' ? `<rect x="63" y="62" width="${badgeWidth}" height="37" rx="18" fill="#173c2e"/><text x="${63 + badgeWidth / 2}" y="87" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#e9c27e">${escape(badgeText)}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 960 960" role="img" aria-label="${escape(product.name)} — ${escape(product.nameUr)} — ${escape(product.nameAr)}">
    <defs>
      <radialGradient id="stone" cx=".28" cy=".16" r=".95"><stop stop-color="#fff9ed"/><stop offset=".58" stop-color="#ecdfcb"/><stop offset="1" stop-color="#cabfa9"/></radialGradient>
      <linearGradient id="ceramic" x1=".1" x2=".8" y1="0" y2="1"><stop stop-color="#fffdf6"/><stop offset=".62" stop-color="#e7e1d7"/><stop offset="1" stop-color="#bdb9b1"/></linearGradient>
      <linearGradient id="cap" x2="1" y2="0"><stop stop-color="#f9f4e9"/><stop offset=".6" stop-color="#ddd9cc"/><stop offset="1" stop-color="#aaa99e"/></linearGradient>
      <linearGradient id="cloth" x2="1" y2="1"><stop stop-color="#0a3026"/><stop offset=".5" stop-color="#1e4a38"/><stop offset="1" stop-color="#09281f"/></linearGradient>
      <linearGradient id="panel" x2="0" y2="1"><stop stop-color="#f9f5eb"/><stop offset="1" stop-color="#f1e7d5"/></linearGradient>
      <clipPath id="bowlClip"><ellipse cx="480" cy="405" rx="292" ry="143"/></clipPath>
      <filter id="soft"><feGaussianBlur stdDeviation="13"/></filter>
    </defs>
    <rect width="960" height="960" fill="url(#stone)"/>
    <path d="M700-60Q793 59 890 15T1040 148V650Q857 567 796 447T700-60" fill="url(#cloth)" opacity=".94"/>
    <path d="M682-60Q775 97 845 107M776 22Q819 218 980 318M733 379Q885 512 990 480" stroke="#4d6a54" opacity=".42" stroke-width="15" fill="none"/>
    <path d="M-40 586Q121 513 197 590T574 714L-40 813Z" fill="url(#cloth)" opacity=".72"/>
    <circle cx="202" cy="108" r="134" fill="#fff9e9" opacity=".28" filter="url(#soft)"/>
    ${badge}${visual}
    <rect x="31" y="647" width="898" height="281" rx="22" fill="url(#panel)" stroke="#c4a565" stroke-width="3"/>
    <path d="M61 785H899" stroke="#c9aa70" stroke-width="2" opacity=".75"/>
    <image x="0" y="648" width="960" height="280" xlink:href="${label}"/>
    <path d="M59 928h842" stroke="#f9f4e6" stroke-width="3"/>
  </svg>`;
}

async function createLabel(product) {
  return await page.evaluate(async ({ p, fontData }) => {
    if (!window.catalogFonts) {
      const ur = new FontFace('CatalogUrdu', `url(data:font/ttf;base64,${fontData.ur})`);
      const ar = new FontFace('CatalogArabic', `url(data:font/ttf;base64,${fontData.ar})`);
      await Promise.all([ur.load(), ar.load()]); document.fonts.add(ur); document.fonts.add(ar);
      window.catalogFonts = true;
    }
    const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 280;
    const ctx = canvas.getContext('2d');
    const boxes = [];
    const safe = { left: 58, right: 902, top: 0, bottom: 280 };
    function wrap(value, family, maxWidth, maxSize, minSize) {
      for (let size = maxSize; size >= minSize; size--) {
        ctx.font = `${size}px ${family}`;
        const words = value.split(/\s+/); const lines = [''];
        for (const word of words) {
          const current = lines.length - 1;
          const trial = lines[current] ? `${lines[current]} ${word}` : word;
          if (ctx.measureText(trial).width <= maxWidth) lines[current] = trial;
          else if (lines[current]) lines.push(word);
          else { lines.push(word); break; }
        }
        if (lines.length <= 2 && lines.every(line => ctx.measureText(line).width <= maxWidth)) return { size, lines };
      }
      throw new Error(`Cannot fit complete text in two lines: ${value}`);
    }
    function put(value, options) {
      const fitted = wrap(value, options.family, options.maxWidth, options.maxSize, options.minSize);
      ctx.fillStyle = options.color; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.direction = options.rtl ? 'rtl' : 'ltr';
      ctx.font = `${fitted.size}px ${options.family}`;
      const lineHeight = options.lineHeight || fitted.size * 1.25;
      const startY = options.y + (fitted.lines.length === 1 ? lineHeight / 2 : 0);
      for (let index = 0; index < fitted.lines.length; index++) {
        const text = fitted.lines[index], y = startY + index * lineHeight;
        const measure = ctx.measureText(text);
        const box = { text, x1: options.x - measure.actualBoundingBoxLeft, x2: options.x + measure.actualBoundingBoxRight,
          y1: y - measure.actualBoundingBoxAscent, y2: y + measure.actualBoundingBoxDescent };
        if (box.x1 < safe.left || box.x2 > safe.right || box.y1 < safe.top || box.y2 > safe.bottom) throw new Error(`Text outside 6% safe area: ${JSON.stringify(box)}`);
        boxes.push(box); ctx.fillText(text, options.x, y);
      }
      return fitted;
    }
    ctx.fillStyle = '#987130'; ctx.font = '700 15px Arial'; ctx.textAlign = 'left'; ctx.fillText('ALLBARKA  /  THE PANTRY', 70, 32);
    put(p.name, { family: 'Georgia', x: 480, y: 80, maxWidth: 820, maxSize: 38, minSize: 24, color: '#173c2e', lineHeight: 41 });
    ctx.fillStyle = '#aa8240'; ctx.font = '700 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('URDU', 265, 163); ctx.fillText('ARABIC', 695, 163);
    put(p.nameUr, { family: 'CatalogUrdu', x: 265, y: 213, maxWidth: 365, maxSize: 28, minSize: 18, color: '#173c2e', rtl: true, lineHeight: 39 });
    put(p.nameAr, { family: 'CatalogArabic', x: 695, y: 213, maxWidth: 365, maxSize: 31, minSize: 19, color: '#173c2e', rtl: true, lineHeight: 37 });
    return { uri: canvas.toDataURL('image/png'), boxes, fontReady: document.fonts.check('24px CatalogUrdu') && document.fonts.check('24px CatalogArabic') };
  }, { p: { name: product.name, nameUr: product.nameUr, nameAr: product.nameAr }, fontData: fonts });
}

try {
  let source = readFileSync('src/data/products.ts', 'utf8');
  for (const product of products) {
    const path = `/images/products/${product.id}.svg`;
    const file = resolve(out, `${product.id}.svg`);
    const label = await createLabel(product);
    if (!label.fontReady || !label.boxes.length) throw new Error(`Font or bounds unavailable: ${product.id}`);
    const svg = scene(product, label.uri);
    if (!existsSync(file) || refreshGenerated) writeFileSync(file, svg, 'utf8');
    const marker = `id: '${product.id}',`;
    const index = source.indexOf(marker);
    if (index < 0) throw new Error(`Cannot locate ${product.id} in catalog source`);
    if (!source.slice(index, index + 150).includes(`image: '${path}'`)) source = source.slice(0, index + marker.length) + ` image: '${path}',` + source.slice(index + marker.length);
    checks.push({ id: product.id, boxes: label.boxes.length, safe: true, path });
  }
  writeFileSync('src/data/products.ts', source, 'utf8');
  writeFileSync(resolve(out, `overflow-report-${category}.json`), JSON.stringify({ category, checks }, null, 2));
  console.log(`${category}: ${checks.length} SVGs, ${checks.reduce((sum, item) => sum + item.boxes, 0)} text boxes within 6% safe area; 0 overflows.`);
} finally { await browser.close(); }
