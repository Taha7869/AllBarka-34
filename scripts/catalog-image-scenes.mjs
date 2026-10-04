// Repository-native illustrations: cream stone, ivory ceramics, emerald linen.
// These remain placeholders, not photographs or promises of a particular pack.
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
function hash(value) { let h = 2166136261; for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function random(seed) { let state = seed; return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32); }
const aliases = { pista: 'pistachio', kaju: 'cashew', badam: 'almond', akhroot: 'walnut', khubani: 'apricot', kishmish: 'green-raisin', khajoor: 'dates', alubukhara: 'prunes' };
function ingredient(id) { return aliases[id] || id.replaceAll('_', '-').replace(/^org-/, ''); }

function piece(rawId, x, y, angle, v = .5, scale = 1) {
  const id = ingredient(rawId);
  let body;
  if (/cinnamon/.test(id)) body = `<rect x="-49" y="-8" width="98" height="16" rx="6" fill="#ad7846" stroke="#694220" stroke-width="2"/><path d="M-43-4H40M-43 1H40M-43 5H40" stroke="#dec199" stroke-width="1"/><ellipse cx="43" rx="5" ry="7" fill="#68432b"/><ellipse cx="43" rx="2" ry="4" fill="#bb8b55"/>`;
  else if (/cardamom/.test(id)) body = `<path d="M-29 0Q-10-18 14-10L28 0L14 10Q-10 18-29 0Z" fill="${id.includes('black') ? '#564238' : '#849455'}" stroke="#514f34" stroke-width="2"/><path d="M-23 0H20M-18-5Q0-10 19 0M-18 5Q0 10 19 0" stroke="${id.includes('black') ? '#a38663' : '#c7c98d'}" fill="none" stroke-width="1.6"/>`;
  else if (/nutmeg|mace/.test(id)) body = v > .55 ? `<path d="M-23-5Q-14-29-4-10Q10-28 10-7Q32-13 15 6Q27 22 4 12Q-10 30-13 9Q-32 13-23-5Z" fill="#c57538" stroke="#91502a" stroke-width="2"/><path d="M-16-6L4 9L11-7M-12 4L1-9" stroke="#e3a564" fill="none" stroke-width="3"/>` : `<ellipse rx="22" ry="18" fill="#98744c" stroke="#5e4630" stroke-width="2"/><path d="M-13-13L-5 14M-4-16L4 16M6-14L14 11M-19-2L19 2" stroke="#c5a178" fill="none" stroke-width="2"/>`;
  else if (/anise/.test(id)) body = Array.from({ length: 8 }, (_, i) => `<path d="M0 0L-8-11L0-29L8-11Z" transform="rotate(${i * 45})" fill="#945d34" stroke="#573421" stroke-width="2"/><ellipse cy="-15" rx="2.5" ry="6" transform="rotate(${i * 45})" fill="#442e21"/>`).join('');
  else if (/cloves/.test(id)) body = `<path d="M0 9L-2-16M-7-17Q0-27 7-17" stroke="#56382a" stroke-width="6" fill="none" stroke-linecap="round"/><circle cy="-20" r="4" fill="#8b6744"/>`;
  else if (/rose/.test(id)) body = `<path d="M-18 2Q-24-13-6-13Q0-19 13-10L20 2Q10 17-4 11Q-14 17-18 2Z" fill="${v > .5 ? '#a9636e' : '#cc9292'}" stroke="#843f53" stroke-width="1"/><path d="M-14 0Q0-8 13 1" stroke="#e0b4ae" fill="none"/>`;
  else if (/mint|methi/.test(id)) body = `<path d="M-20 3L-14-7L-7-6L0-15L5-11L17-8L20-1L9 9L2 7L-7 13Z" fill="${v > .5 ? '#63734d' : '#90956b'}" stroke="#3e573b" stroke-width="1.3"/><path d="M-15 5L14-6M-5 1L-6-6M3-2L9 3" stroke="#c0c59b" fill="none"/>`;
  else if (/gond/.test(id)) body = `<path d="M-17-9L-4-19L15-12L20 7L2 16L-16 8Z" fill="${id.includes('katira') ? '#e2d9bc' : '#c9914b'}" stroke="#aa8760" stroke-width="1.5"/><path d="M-4-18L3 1L19 7M3 1L-15 8M3 1L14-11" stroke="#faf0ce" opacity=".65" fill="none"/>`;
  else if (/ginger|masala/.test(id) && !/almond/.test(id)) body = `<ellipse rx="${1 + v * 2}" ry="${.7 + v}" fill="${/chaat/.test(id) ? v > .5 ? '#b99570' : '#8b6846' : /garam/.test(id) ? v > .5 ? '#aa784e' : '#67472f' : v > .5 ? '#eddbb3' : '#bda177'}"/>`;
  else if (/panjeeri/.test(id)) body = `<path d="M-6-3L0-6L8-1L5 5L-5 4Z" fill="${v > .5 ? '#d8bb89' : '#b18d5e'}" stroke="#9d774c" stroke-width=".7"/>`;
  else if (/jujube|dates|prunes|chohara/.test(id)) body = `<path d="M-22 0Q-20-18 0-16Q22-16 23 0Q20 17 0 16Q-22 18-22 0Z" fill="${/chohara/.test(id) ? '#ae783d' : /prunes|ajwa/.test(id) ? '#4d3227' : '#7b422b'}" stroke="#4f3124" stroke-width="2"/><path d="M-16-5Q0-11 16-3M-15 2Q0-4 16 4M-12 8Q0 4 12 10" stroke="${/chohara/.test(id) ? '#d4aa70' : '#b37a4d'}" opacity=".65" fill="none" stroke-width="1.4"/>`;
  else if (/pepper/.test(id)) body = `<circle r="10" fill="#403a30" stroke="#252b23" stroke-width="1.5"/><path d="M-5-4L-1-7L5-3M-6 3L0 6L6 2" stroke="#746c55" fill="none" stroke-width="1.5"/>`;
  else if (/saffron/.test(id)) body = `<path d="M-18-8Q0 5 18-7M-16 0Q0 10 17 0M-12 8Q2 17 16 9" stroke="#aa3426" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
  else if (/fig/.test(id)) body = `<path d="M-24-2Q-21-19 0-19Q24-17 24 0Q23 17 0 17Q-26 15-24-2Z" fill="#be9864" stroke="#87603c" stroke-width="2"/><path d="M0-17L1-23M0 0L-17-9M0 0L-18 8M0 0L1 13M0 0L19 7M0 0L16-10" stroke="#7c5737" fill="none" stroke-width="1.5"/><ellipse rx="5" ry="3" fill="#947049"/>`;
  else if (/mulberry/.test(id)) body = `<ellipse rx="22" ry="10" fill="#c4ab78"/>${Array.from({length: 9}, (_, i) => `<circle cx="${-14 + (i % 5) * 7}" cy="${i < 5 ? -3 : 4}" r="5" fill="${i % 2 ? '#d6c493' : '#bfa06a'}" stroke="#a98b59" stroke-width=".8"/>`).join('')}`;
  else if (/raisin|cranberr|apricot/.test(id)) body = `<ellipse rx="${/raisin/.test(id) ? 12 : 21}" ry="${/raisin/.test(id) ? 8 : 14}" fill="${/golden/.test(id) ? '#c39340' : /green/.test(id) ? '#8b9855' : /black/.test(id) ? '#51442b' : /cranberr/.test(id) ? '#a54846' : '#d49850'}" stroke="#795234" stroke-width="1.4"/><path d="M-7-4Q0-7 7-3M-6 3Q0 0 7 4" stroke="#edd2a0" opacity=".45" fill="none"/>`;
  else if (/walnut/.test(id)) body = `<path d="M-19-6Q-25-17-8-20Q-3-26 1-15Q8-25 17-16Q26-13 18-4Q30 7 14 11Q16 24 2 15Q-10 23-14 13Q-27 15-19-6Z" fill="#c0a077" stroke="#80603e" stroke-width="1.7"/><path d="M0-17Q-6-1 2 16M-14-10L-2-4L-14 2M13-10L1-3L15 3M-11 10L0 6L10 12" stroke="#8c6741" fill="none" stroke-width="2"/>`;
  else if (/pista/.test(id)) body = `<path d="M-20-3Q-5-18 15-9Q24 5 9 14Q-10 21-20-3Z" fill="#e5d4b0" stroke="#a28b5e" stroke-width="1.8"/><ellipse cx="1" cy="1" rx="12" ry="7" fill="#859c5d"/><path d="M-14-5Q0 0 14 5" stroke="#64543a" fill="none" stroke-width="1.4"/>`;
  else if (/cashew/.test(id)) body = `<path d="M-17-6Q-25 15-5 17Q24 16 18-8Q14-16 7-12Q14 2 2 5Q-10 7-9-8Z" fill="${/roasted/.test(id) ? '#d1aa68' : '#e7cd9a'}" stroke="#aa8a59" stroke-width="1.8"/><path d="M-15 2Q-12 13 0 12Q16 11 13-5" stroke="#f4e3bd" stroke-width="2" fill="none"/>`;
  else if (/almond/.test(id)) body = `<path d="M-23 0Q-3-19 23 0Q1 19-23 0Z" fill="${/masala/.test(id) ? '#b96c36' : '#b78550'}" stroke="#835b35" stroke-width="1.8"/><path d="M-17 0Q0-8 17 0M-13 4Q0-2 13 4M-12-5Q0-10 11-4" stroke="#e0b17b" fill="none" stroke-width="1.3"/>`;
  else if (/fox-nuts/.test(id)) body = `<path d="M-15-4Q-11-19 2-14Q14-17 15-4Q22 8 8 15Q-7 19-14 10Q-20 6-15-4Z" fill="#eadfc7" stroke="#c0ab88" stroke-width="1.4"/><circle cx="5" cy="-3" r="3" fill="#987e59"/>`;
  else if (/sesame|poppy|basil|chia/.test(id)) body = `<ellipse rx="${/sesame/.test(id) ? 5 : /poppy/.test(id) ? 2 : 3.5}" ry="${/sesame/.test(id) ? 2.5 : /poppy/.test(id) ? 1.8 : 2.4}" fill="${/white|poppy/.test(id) ? v > .5 ? '#f0e2bf' : '#ccb58c' : /chia/.test(id) && v > .65 ? '#a7a796' : '#33372c'}" stroke="${/white|poppy/.test(id) ? '#b09a71' : '#777259'}" stroke-width=".6"/>`;
  else if (/ajwain|cumin|fennel/.test(id)) {
    const width = /ajwain/.test(id) ? 6 : /fennel/.test(id) ? 16 : 17;
    const height = /ajwain/.test(id) ? 4 : 5;
    body = `<path d="M-${width} 0Q0-${height * 2} ${width} 0Q0 ${height * 2}-${width} 0Z" fill="${/fennel/.test(id) ? '#94a46b' : /cumin/.test(id) ? '#a18a5c' : '#9d9575'}" stroke="#746446" stroke-width="1"/><path d="M-${width * .75} 0H${width * .75}M-${width * .5}-2Q0-4 ${width * .5}-2M-${width * .5} 2Q0 4 ${width * .5} 2" fill="none" stroke="#d4c591" stroke-width=".8"/>`;
  }
  else {
    const colour = /pumpkin/.test(id) ? '#7e985e' : /flax/.test(id) ? '#9f6a39' : /sunflower|melon|maghaz|pine/.test(id) ? '#e4d3a8' : '#b09a6f';
    const width = /pine/.test(id) ? 19 : /pumpkin|sunflower|melon|maghaz/.test(id) ? 15 : 11;
    body = `<path d="M-${width} 0Q0-9 ${width} 0Q0 10-${width} 0Z" fill="${colour}" stroke="#82734d" stroke-width="1"/><path d="M-${width * .6} 0H${width * .6}" stroke="#efe1bb" opacity=".65" fill="none"/>`;
  }
  return `<g data-ingredient="${esc(id)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(${scale})">${body}</g>`;
}
function scatter(id, count, cx, cy, rx, ry, scale = 1, seed = hash(id)) {
  const r = random(seed), fragments = [];
  for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); fragments.push(piece(id, cx + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry, r() * 360, r(), scale * (.85 + r() * .3))); }
  return fragments.join('');
}
function amount(id) { return /cinnamon/.test(id) ? 100 : /pepper|sesame|basil|poppy|chia/.test(id) ? 1100 : /ginger|masala/.test(id) && !/almond/.test(id) ? 900 : /seed|ajwain|cumin|fennel|panjeeri|raisin/.test(id) ? 420 : 210; }
function bowl(id, cx = 480, cy = 407, scale = 1) {
  const powder = /ginger|masala/.test(id) && !/almond/.test(id);
  const powderColor = /chaat/.test(id) ? '#a3815c' : /garam/.test(id) ? '#94653f' : '#d7c19a';
  return `<g transform="translate(${cx - 480 * scale} ${cy - 407 * scale}) scale(${scale})">
    <ellipse cx="480" cy="564" rx="345" ry="45" fill="#786548" opacity=".21" filter="url(#soft)"/>
    <ellipse cx="480" cy="448" rx="342" ry="183" fill="url(#ceramic)" stroke="#eee8db" stroke-width="9"/>
    <ellipse cx="480" cy="410" rx="311" ry="149" fill="#b6a17d"/>
    <g clip-path="url(#bowlClip)"><ellipse cx="480" cy="405" rx="296" ry="146" fill="${powder ? powderColor : 'url(#contents)'}"/>${powder ? `<ellipse cx="464" cy="381" rx="222" ry="103" fill="#fff5d8" opacity=".12"/><path d="M276 445Q486 326 701 439" stroke="#6b4b2d" stroke-width="5" fill="none" opacity=".13"/>` : ''}${scatter(id, amount(id), 480, 402, 280, 132)}<ellipse cx="480" cy="409" rx="302" ry="152" fill="url(#glaze)"/></g>
    <ellipse cx="480" cy="410" rx="310" ry="151" fill="none" stroke="#f6f2e8" stroke-width="16"/>
    <ellipse cx="480" cy="414" rx="322" ry="163" fill="none" stroke="#aa9b85" stroke-width="2" opacity=".5"/>
    <path d="M201 483Q472 657 765 481" fill="none" stroke="#faf6ea" stroke-width="6" opacity=".7"/>
    <ellipse cx="480" cy="448" rx="341" ry="182" fill="#76542e" opacity=".055" filter="url(#grain)"/>
  </g>`;
}
function bottle(product) {
  const id = product.id.includes('chilgoza') ? 'pine-nuts' : 'pumpkin-seeds';
  return `${bowl(id, 220, 504, .34)}<g data-presentation="bottle">
    <ellipse cx="485" cy="594" rx="193" ry="27" fill="#786548" opacity=".23" filter="url(#soft)"/>
    <rect x="401" y="122" width="158" height="63" rx="12" fill="url(#cap)" stroke="#c4bbad" stroke-width="3"/>
    ${Array.from({length: 12}, (_, i) => `<path d="M${411 + i * 12} 128v50" stroke="#bbb6a7" stroke-width="2" opacity=".6"/>`).join('')}
    <path d="M415 183h130v30q55 26 56 80v239q0 36-35 44H394q-35-8-35-44V293q1-54 56-80Z" fill="#efd7a2" fill-opacity=".7" stroke="#f7ead4" stroke-width="9"/>
    <path d="M374 300h212v230q0 28-26 34H400q-26-6-26-34Z" fill="${product.id.includes('pumpkin') ? '#876b29' : '#c99636'}" opacity=".88"/>
    <ellipse cx="480" cy="300" rx="104" ry="10" fill="#edd68a" opacity=".7"/>
    <path d="M392 213Q367 270 371 352v168" fill="none" stroke="#fff8e3" opacity=".7" stroke-width="13" stroke-linecap="round"/>
    <path d="M569 240L576 534" stroke="#fff5d9" stroke-width="4" opacity=".6"/>
    <rect x="387" y="343" width="186" height="151" rx="5" fill="#f5efdf" stroke="#c9b98e" stroke-width="2"/>
    <text x="480" y="380" text-anchor="middle" fill="#aa8434" font-size="26" font-family="Georgia,serif">✦</text>
    <text x="480" y="415" text-anchor="middle" fill="#163e31" font-size="27" font-family="Georgia,serif">AllBarka</text>
    <path d="M423 430h114" stroke="#c6a15c"/>
    <text x="480" y="453" text-anchor="middle" fill="#173e31" font-size="12" letter-spacing="1" font-family="Arial,sans-serif">${product.id.includes('pumpkin') ? 'PUMPKIN SEED OIL' : 'CHILGOZA OIL'}</text>
  </g>${scatter(id, 8, 688, 553, 67, 24, .8)}`;
}
function bundle(product) {
  const ids = product.componentIds || [];
  const count = /silver/.test(product.id) ? 3 : /gold-hamper/.test(product.id) ? 5 : /platinum/.test(product.id) ? 7 : /ramadan/.test(product.id) ? 4 : ids.length || (/mystery/.test(product.id) ? 5 : 4);
  const columns = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / columns), slotW = 480 / columns, slotH = 242 / rows;
  const pieces = Array.from({length: count}, (_, i) => {
    const x = 242 + (i % columns) * slotW, y = 310 + Math.floor(i / columns) * slotH;
    const id = ids[i];
    return `<rect x="${x}" y="${y}" width="${slotW - 17}" height="${slotH - 14}" rx="8" fill="${id ? '#eee1c4' : '#e6d6b4'}" stroke="#baa77e" stroke-width="3"/>
      ${id?.startsWith('oil-') ? `<g data-ingredient="${esc(id)}" transform="translate(${x + (slotW - 17) / 2} ${y + (slotH - 14) / 2})"><rect x="-18" y="-40" width="36" height="13" rx="3" fill="url(#cap)"/><rect x="-24" y="-26" width="48" height="64" rx="9" fill="#9a792d" stroke="#e9d8b4" stroke-width="3"/><rect x="-22" y="-10" width="44" height="31" rx="2" fill="#f8f0dd"/><text x="0" y="12" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="#173c2e">A</text></g>` : id ? scatter(id, /seed|maghaz|panjeeri/.test(id) ? 300 : 65, x + (slotW - 17) / 2, y + (slotH - 14) / 2, (slotW - 34) / 2, (slotH - 30) / 2, .47, hash(product.id + i)) : `<path d="M${x + 14} ${y + 14}H${x + slotW - 31}V${y + slotH - 27}H${x + 14}Z" fill="#153f30" stroke="#c6a05c"/><text x="${x + (slotW - 17) / 2}" y="${y + (slotH - 14) / 2 + 7}" font-size="20" fill="#e5c381" text-anchor="middle" font-family="Georgia,serif">A</text>`}`;
  }).join('');
  return `<g data-presentation="hamper"><ellipse cx="480" cy="576" rx="350" ry="36" fill="#776346" opacity=".22" filter="url(#soft)"/>
    <path d="M232 163H737L758 275H211Z" fill="url(#gift)" stroke="#ba9a5f" stroke-width="5"/><path d="M245 177H724L740 260H229Z" fill="none" stroke="#947441" stroke-width="2"/><text x="484" y="233" text-anchor="middle" font-family="Georgia,serif" font-size="32" fill="#dbc38d">AllBarka</text>
    <rect x="211" y="275" width="548" height="292" rx="17" fill="url(#gift)" stroke="#ba9a5f" stroke-width="8"/>
    <rect x="225" y="290" width="520" height="260" rx="9" fill="#e5d5b6" stroke="#f4e6ca" stroke-width="4"/>${pieces}
    <path d="M224 283H746" stroke="#f0d39c" stroke-width="3"/></g>`;
}

export function catalogImageScene(product, label) {
  const visual = product.category === 'oils' ? bottle(product) : product.category === 'bundles' ? bundle(product) : bowl(product.id);
  const badgeText = (product.badge || 'Curated Bundle').toUpperCase();
  const badgeWidth = Math.min(480, Math.max(185, 36 + badgeText.length * 10));
  const badge = product.category === 'bundles' ? `<rect x="63" y="62" width="${badgeWidth}" height="37" rx="18" fill="#173c2e"/><text x="${63 + badgeWidth / 2}" y="87" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#e9c27e">${esc(badgeText)}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 960 960" role="img" aria-label="${esc(product.name)} — ${esc(product.nameUr)} — ${esc(product.nameAr)}" data-catalog-style="editorial-v2" data-variant="primary">
    <defs>
      <radialGradient id="stone" cx=".28" cy=".16" r=".95"><stop stop-color="#fff9ed"/><stop offset=".58" stop-color="#ecdfcb"/><stop offset="1" stop-color="#cabfa9"/></radialGradient>
      <linearGradient id="ceramic" x1=".1" x2=".8" y1="0" y2="1"><stop stop-color="#fffdf6"/><stop offset=".62" stop-color="#e7e1d7"/><stop offset="1" stop-color="#bdb9b1"/></linearGradient>
      <radialGradient id="contents" cx=".3" cy=".2"><stop stop-color="#f4ecdc"/><stop offset="1" stop-color="#c9bba4"/></radialGradient>
      <linearGradient id="glaze" x2="0" y2="1"><stop stop-color="#fff6d6" stop-opacity=".17"/><stop offset=".5" stop-color="#fff6d6" stop-opacity="0"/><stop offset="1" stop-color="#594127" stop-opacity=".14"/></linearGradient>
      <linearGradient id="cap" x2="1" y2="0"><stop stop-color="#f9f4e9"/><stop offset=".6" stop-color="#ddd9cc"/><stop offset="1" stop-color="#aaa99e"/></linearGradient>
      <linearGradient id="cloth" x2="1" y2="1"><stop stop-color="#0a3026"/><stop offset=".5" stop-color="#1e4a38"/><stop offset="1" stop-color="#09281f"/></linearGradient>
      <linearGradient id="panel" x2="0" y2="1"><stop stop-color="#f9f5eb"/><stop offset="1" stop-color="#f1e7d5"/></linearGradient>
      <linearGradient id="gift" x2="1" y2="1"><stop stop-color="#234a37"/><stop offset=".5" stop-color="#14382b"/><stop offset="1" stop-color="#092c21"/></linearGradient>
      <clipPath id="bowlClip"><ellipse cx="480" cy="405" rx="292" ry="143"/></clipPath>
      <filter id="soft"><feGaussianBlur stdDeviation="12"/></filter>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".32" numOctaves="3" seed="7"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
    </defs>
    <rect width="960" height="960" fill="url(#stone)"/>
    <rect width="960" height="647" fill="#aa936b" opacity=".055" filter="url(#grain)"/>
    <path d="M700-60Q793 59 890 15T1040 148V650Q857 567 796 447T700-60" fill="url(#cloth)" opacity=".94"/>
    <path d="M682-60Q775 97 845 107M776 22Q819 218 980 318M733 379Q885 512 990 480" stroke="#4d6a54" opacity=".38" stroke-width="10" fill="none"/>
    <path d="M708 15Q759 266 881 374M824 82Q850 186 948 252" stroke="#798974" opacity=".28" stroke-width="2" fill="none"/>
    <path d="M-40 586Q121 513 197 590T574 714L-40 813Z" fill="url(#cloth)" opacity=".78"/>
    <path d="M0 630Q126 569 236 641" stroke="#7d896e" stroke-width="3" fill="none" opacity=".36"/>
    ${badge}${visual}
    <rect x="31" y="647" width="898" height="281" rx="22" fill="url(#panel)" stroke="#c4a565" stroke-width="2"/>
    <path d="M61 785H899" stroke="#c9aa70" stroke-width="1.4" opacity=".65"/>
    <image x="0" y="648" width="960" height="280" xlink:href="${label}"/>
  </svg>`;
}
