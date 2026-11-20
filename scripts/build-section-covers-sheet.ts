import fs from 'node:fs';
import path from 'node:path';

interface SectionCoverSpec {
  id: string;
  label: string;
  route: string;
  currentImage: string;
  sells: string;
  aliases?: string[];
}

const SECTIONS: SectionCoverSpec[] = [
  {
    id: 'all',
    label: 'All Items',
    route: '/shop',
    currentImage: '/assets/categories/all_items.png',
    sells: 'Curated AllBarka pantry assortment (nuts, dates, saffron, honey, murabba)',
  },
  {
    id: 'nuts',
    label: 'Dry Fruits & Nuts',
    route: '/shop/nuts',
    aliases: ['dry-fruits'],
    currentImage: '/assets/categories/dry_fruits.png',
    sells: 'Whole almonds, pistachios, walnuts, cashews, apricots & figs',
  },
  {
    id: 'dates',
    label: 'Dates',
    route: '/shop/dates',
    currentImage: '/images/generated/dark-dates-catalog-v1.webp',
    sells: 'Mazafati, Ajwa, Panjgur Amber & Medjool dates',
  },
  {
    id: 'herbs-spices',
    label: 'Herbs & Spices',
    route: '/shop/herbs-spices',
    currentImage: '/images/products/ceylon-cinnamon-1.webp',
    sells: 'Ceylon cinnamon, green cardamom, star anise, cloves, pepper, coriander, dry red chilli & saffron',
  },
  {
    id: 'oils',
    label: 'Cold-Pressed Oils',
    route: '/shop/oils',
    currentImage: '/images/generated/category-oils-tile-v1.webp',
    sells: 'Cold-pressed almond, mustard & kalonji oils in plain glass bottles',
  },
  {
    id: 'essentials',
    label: 'Desi Essentials',
    route: '/shop/essentials',
    currentImage: '/images/generated/category-essentials-tile-v1.webp',
    sells: 'Desi ghee, raw honey, unrefined desi shakkar & saffron',
  },
  {
    id: 'snacks-seeds',
    label: 'Snacks & Seeds',
    route: '/shop/snacks-seeds',
    aliases: ['seeds-snacks'],
    currentImage: '/assets/categories/snacks.png',
    sells: 'Pumpkin seeds, roasted chana, sunflower seeds, flaxseeds & makhana',
  },
  {
    id: 'saunf',
    label: 'Saunf & Mouth Fresheners',
    route: '/shop/saunf',
    currentImage: '/images/generated/category-saunf-tile-v1.webp',
    sells: 'Plain green fennel seeds, sugar-coated colourful saunf & cardamom',
  },
  {
    id: 'murabba-jaat',
    label: 'Murabba Jaat',
    route: '/shop/murabba-jaat',
    currentImage: '',
    sells: 'Traditional fruit preserves in syrup: amla, gajar, saib, behi & gulkand',
  },
  {
    id: 'herbal-teas',
    label: 'Chai & Herbal Teas',
    route: '/shop/herbal-teas',
    currentImage: '',
    sells: 'CTC chai patti, green tea with cardamom, chamomile blossoms, rose buds & kahwa',
  },
  {
    id: 'gift-boxes',
    label: 'Gift Boxes',
    route: '/gifting',
    aliases: ['gifts', 'combos'],
    currentImage: '/assets/categories/gifts.png',
    sells: 'Luxury bespoke rigid gift hampers filled with dates, nuts & honey',
  },
  {
    id: 'celebration-boxes',
    label: 'Celebration Boxes',
    route: '/shop/celebration-boxes',
    currentImage: '/images/products/bid-box-umrah-tabarruk-1.webp',
    sells: 'Wedding, Nikkah, Umrah Tabarruk & Aqeeqah favor and bid boxes',
  },
  {
    id: 'bundles',
    label: 'Bundles & Deals',
    route: '/shop/bundles',
    aliases: ['deals'],
    currentImage: '/assets/categories/deals.png',
    sells: 'Curated multi-item pantry pairings and value bundles',
  },
];

function fileSizeKb(relPublicPath: string): string {
  if (!relPublicPath) return 'none';
  const abs = path.join('public', relPublicPath.replace(/^\//, ''));
  if (!fs.existsSync(abs)) return 'missing';
  return `${Math.round(fs.statSync(abs).size / 1024)} KB`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const newDir = 'public/images/section-covers-20261120';
let readyCount = 0;
let pendingCount = 0;

const cardsHtml = SECTIONS.map((sec, idx) => {
  const newRel = `/images/section-covers-20261120/${sec.id}.webp`;
  const hasNew = fs.existsSync(path.join(newDir, `${sec.id}.webp`));
  if (hasNew) readyCount++;
  else pendingCount++;

  const currentSrc = sec.currentImage ? `../../public${sec.currentImage}` : '';
  const newSrc = `../../public${newRel}`;

  return `
    <article class="card ${hasNew ? 'ready' : 'pending'}">
      <header class="card-head">
        <div>
          <span class="num">#${idx + 1}</span>
          <strong>${escapeHtml(sec.label)}</strong>
          <code>${escapeHtml(sec.id)}</code>
          ${sec.aliases?.length ? `<span class="aliases">aliases: ${escapeHtml(sec.aliases.join(', '))}</span>` : ''}
        </div>
        <span class="badge ${hasNew ? 'ok' : 'wait'}">${hasNew ? 'NEW 1600px READY' : 'PENDING QUOTA'}</span>
      </header>
      <p class="meta"><strong>Route:</strong> <code>${escapeHtml(sec.route)}</code> &middot; <strong>Depicts:</strong> ${escapeHtml(sec.sells)}</p>
      <div class="compare">
        <figure>
          <figcaption>CURRENT (${escapeHtml(sec.currentImage || 'placeholder / empty')} &middot; ${fileSizeKb(sec.currentImage)})</figcaption>
          ${
            currentSrc
              ? `<img src="${escapeHtml(currentSrc)}" alt="Current ${escapeHtml(sec.label)}" loading="lazy" />`
              : `<div class="empty-slot">AllBarka text placeholder (no cover image currently set)</div>`
          }
        </figure>
        <figure>
          <figcaption>NEW STUDIO COVER (${hasNew ? `${escapeHtml(newRel)} &middot; 1600×1600 WebP &middot; ${fileSizeKb(newRel)}` : 'queued for next quota reset'})</figcaption>
          ${
            hasNew
              ? `<img src="${escapeHtml(newSrc)}" alt="New ${escapeHtml(sec.label)}" loading="lazy" />`
              : `<div class="empty-slot pending-slot">Pending image-model quota reset</div>`
          }
        </figure>
      </div>
    </article>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AllBarka — Section Cover Images Review (Current vs New)</title>
  <style>
    :root { --bg: #faf7f0; --card: #fff; --ink: #16261f; --muted: #5a665f; --border: #e4dccb; --green: #143d2d; --gold: #c7982f; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; background: var(--bg); color: var(--ink); font-family: system-ui, -apple-system, sans-serif; }
    .wrap { max-width: 1200px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-family: Georgia, serif; color: var(--green); }
    .summary { margin: 0 0 24px; color: var(--muted); font-size: 14px; line-height: 1.5; }
    .pills { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }
    .pill { background: var(--card); border: 1px solid var(--border); border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 600; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 18px; }
    .card.ready { border-color: #2f7d57; }
    .card-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
    .num { display: inline-block; min-width: 28px; color: var(--gold); font-weight: 700; }
    code { background: #f2ede2; padding: 2px 6px; border-radius: 5px; font-size: 12px; }
    .aliases { margin-left: 8px; font-size: 12px; color: var(--muted); }
    .badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.04em; }
    .badge.ok { background: #e3f5ec; color: #0f5a38; }
    .badge.wait { background: #f8eed8; color: #7c560b; }
    .meta { margin: 0 0 12px; font-size: 13px; color: var(--muted); }
    .compare { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    @media (max-width: 720px) { .compare { grid-template-columns: 1fr; } }
    figure { margin: 0; }
    figcaption { font-size: 12px; color: var(--muted); margin-bottom: 6px; font-weight: 600; }
    img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 10px; border: 1px solid var(--border); background: #efe9dc; display: block; }
    .empty-slot { width: 100%; aspect-ratio: 1 / 1; border-radius: 10px; border: 1px dashed #c8beaa; background: #f4efe4; color: var(--muted); display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px; font-size: 13px; }
    .pending-slot { background: #fbf5e7; border-color: #d6b66f; color: #7c560b; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>AllBarka Section Covers — Current vs New (1600px WebP)</h1>
    <p class="summary">Staged for Claude &amp; owner review in <code>public/images/section-covers-20261120/</code>. Live storefront paths in <code>CategoryCarousel.tsx</code> are untouched until explicit approval (&ldquo;haan&rdquo;). Shared studio style: cream travertine, dark forest-green linen, natural side light, zero text/labels.</p>
    <div class="pills">
      <span class="pill">Total sections: ${SECTIONS.length}</span>
      <span class="pill">New 1600px covers ready: ${readyCount}</span>
      <span class="pill">Pending quota reset: ${pendingCount}</span>
    </div>
    ${cardsHtml}
  </div>
</body>
</html>
`;

fs.mkdirSync('docs/design', { recursive: true });
fs.writeFileSync('docs/design/SECTION_COVERS.html', html, 'utf8');
console.log(`section covers sheet: ${readyCount} ready, ${pendingCount} pending (${SECTIONS.length} total)`);
