/** Editorial SVG placeholders for catalog additions. Run with: node --import tsx scripts/generate-catalog-images.mjs herbs-spices */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { PRODUCTS } from '../src/data/products.ts';
import { catalogImageScene } from './catalog-image-scenes.mjs';

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

async function createLabel(product) {
  return await page.evaluate(async ({ p, fontData }) => {
    if (!window.catalogFonts) {
      const ur = new FontFace('CatalogUrdu', 'url(data:font/ttf;base64,' + fontData.ur + ')');
      const ar = new FontFace('CatalogArabic', 'url(data:font/ttf;base64,' + fontData.ar + ')');
      await Promise.all([ur.load(), ar.load()]); document.fonts.add(ur); document.fonts.add(ar);
      window.catalogFonts = true;
    }
    const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 280;
    const ctx = canvas.getContext('2d');
    const boxes = [];
    // The label panel starts at y=648; bottom ink stays inside 6% of the entire image.
    const safe = { left: 58, right: 902, top: 0, bottom: 254 };
    function put(value, options) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.direction = options.rtl ? 'rtl' : 'ltr';
      for (let size = options.maxSize; size >= options.minSize; size--) {
        ctx.font = ((options.weight || '') + ' ' + size + 'px ' + options.family).trim();
        const lines = [''];
        for (const word of value.split(/\s+/)) {
          const i = lines.length - 1;
          const trial = lines[i] ? lines[i] + ' ' + word : word;
          if (ctx.measureText(trial).width <= options.maxWidth) lines[i] = trial;
          else if (lines[i]) lines.push(word);
          else { lines[0] = word; break; }
        }
        if (lines.length > 2 || lines.join(' ') !== value.replace(/\s+/g, ' ') || lines.some(line => ctx.measureText(line).width > options.maxWidth)) continue;
        const lineHeight = options.lineHeight;
        const startY = options.y + (lines.length === 1 ? lineHeight / 2 : 0);
        const measured = lines.map((text, i) => {
          const y = startY + i * lineHeight, m = ctx.measureText(text);
          return { text, kind: options.kind, fontSize: size, x1: options.x - m.actualBoundingBoxLeft, x2: options.x + m.actualBoundingBoxRight,
            y1: y - m.actualBoundingBoxAscent, y2: y + m.actualBoundingBoxDescent };
        });
        const left = Math.max(safe.left, options.x - options.maxWidth / 2);
        const right = Math.min(safe.right, options.x + options.maxWidth / 2);
        if (measured.some(b => b.x1 < left || b.x2 > right || b.y1 < safe.top || b.y2 > safe.bottom)) continue;
        ctx.fillStyle = options.color;
        measured.forEach((box, i) => { ctx.fillText(lines[i], options.x, startY + i * lineHeight); boxes.push({ ...box, y1: box.y1 + 648, y2: box.y2 + 648 }); });
        return;
      }
      throw Error('Full label cannot fit safely in two lines: ' + value);
    }
    put('ALLBARKA / THE PANTRY', { kind: 'brand', family: 'Arial', weight: '700', x: 212, y: 22, lineHeight: 20, maxWidth: 284, maxSize: 15, minSize: 15, color: '#987130' });
    put(p.name, { kind: 'name_en', family: 'Georgia', x: 480, y: 80, lineHeight: 41, maxWidth: 820, maxSize: 38, minSize: 24, color: '#173c2e' });
    put('URDU', { kind: 'language', family: 'Arial', weight: '700', x: 265, y: 151, lineHeight: 24, maxWidth: 120, maxSize: 12, minSize: 12, color: '#987130' });
    put('ARABIC', { kind: 'language', family: 'Arial', weight: '700', x: 695, y: 151, lineHeight: 24, maxWidth: 120, maxSize: 12, minSize: 12, color: '#987130' });
    put(p.nameUr, { kind: 'name_ur', family: 'CatalogUrdu', x: 265, y: 190, lineHeight: 34, maxWidth: 365, maxSize: 28, minSize: 18, color: '#173c2e', rtl: true });
    put(p.nameAr, { kind: 'name_ar', family: 'CatalogArabic', x: 695, y: 190, lineHeight: 34, maxWidth: 365, maxSize: 31, minSize: 19, color: '#173c2e', rtl: true });
    return { uri: canvas.toDataURL('image/png'), boxes, fontReady: document.fonts.check('24px CatalogUrdu') && document.fonts.check('24px CatalogArabic') };
  }, { p: { name: product.name, nameUr: product.nameUr, nameAr: product.nameAr }, fontData: fonts });
}

async function checkSvgText(svg) {
  return page.evaluate(markup => {
    const holder = document.createElement('div'); holder.innerHTML = markup;
    const root = holder.querySelector('svg'); root.style.width = '960px'; root.style.height = '960px';
    document.body.replaceChildren(holder);
    return [...root.querySelectorAll('text')].map(text => {
      const b = text.getBBox(), matrix = text.getCTM();
      const corners = [[b.x,b.y], [b.x+b.width,b.y], [b.x,b.y+b.height], [b.x+b.width,b.y+b.height]].map(([x,y]) => new DOMPoint(x,y).matrixTransform(matrix));
      const box = { kind: 'scene', text: text.textContent, x1: Math.min(...corners.map(p => p.x)), x2: Math.max(...corners.map(p => p.x)),
        y1: Math.min(...corners.map(p => p.y)), y2: Math.max(...corners.map(p => p.y)) };
      if (box.x1 < 58 || box.x2 > 902 || box.y1 < 58 || box.y2 > 902) throw Error('Scene text outside 6% safe area: ' + JSON.stringify(box));
      return box;
    });
  }, svg);
}
try {
  let source = readFileSync('src/data/products.ts', 'utf8');
  const originalSource = source;
  const manifestPath = 'src/data/product-media.json';
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const originalManifest = JSON.stringify(manifest);
  for (const product of products) {
    const path = `/images/products/${product.id}.svg`;
    const label = await createLabel(product);
    if (!label.fontReady || !label.boxes.length) throw new Error(`Font or bounds unavailable: ${product.id}`);
    const file = resolve(`public${path}`);
    const svg = catalogImageScene(product, label.uri);
    const bounds = [...label.boxes, ...await checkSvgText(svg)];
    if (!existsSync(file) || refreshGenerated) writeFileSync(file, svg, 'utf8');
    checks.push({ id: product.id, variant: 'primary', boxes: bounds.length, bounds, safe: true, fontReady: label.fontReady, path });
    const configured = manifest[product.id];
    manifest[product.id] = { images: [path], videoUrl: configured?.videoUrl || '',
      videoPoster: configured?.videoPoster === `/images/products/${product.id}-secondary.svg` ? '' : configured?.videoPoster || '' };
    const marker = `id: '${product.id}',`;
    const index = source.indexOf(marker);
    if (index < 0) throw new Error(`Cannot locate ${product.id} in catalog source`);
    if (!source.slice(index, index + 150).includes(`image: '${path}'`)) source = source.slice(0, index + marker.length) + ` image: '${path}',` + source.slice(index + marker.length);
  }
  if (source !== originalSource) writeFileSync('src/data/products.ts', source, 'utf8');
  if (JSON.stringify(manifest) !== originalManifest) writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  // A resume with no pending products must not erase the successful audit report.
  if (checks.length) {
    const reportPath = resolve(out, `overflow-report-${category}.json`);
    const prior = !refreshGenerated && existsSync(reportPath) ? (JSON.parse(readFileSync(reportPath, 'utf8')).checks || []).filter(check => check.variant === 'primary') : [];
    const combined = [...new Map([...prior, ...checks].map(check => [check.path, check])).values()];
    writeFileSync(reportPath, JSON.stringify({ category, styleVersion: 2, canvas: 960, safeArea: { left: 58, right: 902, top: 58, bottom: 902 }, checks: combined }, null, 2));
  }
  console.log(`${category}: ${checks.length} SVGs, ${checks.reduce((sum, item) => sum + item.boxes, 0)} text boxes within 6% safe area; 0 overflows.`);
} finally { await browser.close(); }
