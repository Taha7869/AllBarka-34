// Generates AI studio product photos for remaining held items via Gemini Image API.
// Uses GEMINI_API_KEY from local .env (never hardcoded, never logged).
// Usage: node --env-file=.env scripts/generate-held-gemini-api.mjs [id ...]
import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY?.trim();
if (!API_KEY) {
  console.error('GEMINI_API_KEY missing in environment');
  process.exit(1);
}

const OUT_RAW = path.join('public', 'images', 'held-ai-20261120', 'raw');
const OUT_WEBP = path.join('public', 'images', 'held-ai-20261120');
fs.mkdirSync(OUT_RAW, { recursive: true });

const STYLE =
  'Square 1:1 photorealistic luxury e-commerce food photography for a boutique dry-fruit and pantry store. ' +
  'Set on a cream travertine stone surface with a dark forest-green linen cloth folded softly in the background. ' +
  'Camera at 45 degrees, warm soft natural side lighting with gentle shadows, shallow depth of field. ' +
  'ABSOLUTELY NO text, NO letters, NO words, NO logos, NO labels, NO watermarks, NO hands, NO people.';

const PROMPTS = {
  'brazil-nuts':
    `${STYLE} A speckled cream ceramic bowl heaped with large, long, curved three-sided triangular Brazil nuts (smooth creamy-white kernels with patches of rough dark-brown papery skin along the edges — unmistakably long triangular Brazil nuts, NOT almonds or walnuts). Two loose Brazil nuts resting on the travertine beside the bowl.`,
  'gurbandi-almonds-inshell':
    `${STYLE} A speckled cream ceramic bowl filled with small, plump, dark-tan hard-shell Gurbandi almonds in their rough pitted woody shells, with 2–3 cracked shells on the travertine revealing the small, dark-brown pointed Gurbandi almond kernels inside.`,
  'kagzi-almonds-inshell':
    `${STYLE} A speckled cream ceramic bowl filled with light-tan, smooth, thin paper-shell Kagzi almonds in shell, with 2–3 easily cracked papery thin shells on the travertine showing elongated light-brown almond kernels peeking out (visually paler and thinner-shelled than hard-shell almonds).`,
  'macadamia-nuts':
    `${STYLE} A speckled cream ceramic bowl heaped with round, smooth, plump, creamy ivory-white shelled macadamia nuts (sphere-like halves and whole round buttery nuts, unmistakably macadamia). Two whole round macadamia nuts resting on the travertine.`,
  'salted-peanuts':
    `${STYLE} A speckled cream ceramic bowl heaped with golden-roasted, split and whole skinless salted peanuts lightly dusted with fine white sea-salt crystals (crunchy golden roasted moongphali, NOT almonds or cashews). A few loose salted roasted peanuts on the travertine.`,
  'dadar-mirch-dry-red-chilli':
    `${STYLE} A speckled cream ceramic bowl heaped with whole dried red chillies (Dadar Mirch / whole dried red peppers): glossy crinkled deep crimson-red whole dried chillies with stems attached, plus a few loose whole dried red chillies on the travertine.`,
  'salab-misri':
    `${STYLE} A speckled cream ceramic bowl filled with dried Salab Misri (Salep orchid tubers): hard, slightly translucent creamy-white to pale-yellowish ovoid/teardrop-shaped tubers with a smooth, waxy, slightly wrinkled surface (unmistakably pale hard tubers/nodules, NOT powder and NOT nuts). A few tubers on the travertine.`,
  'kamarkas':
    `${STYLE} A speckled cream ceramic bowl filled with authentic Kamarkas (Butea gum / Palash gond): sparkling, jagged, jewel-like ruby-red to dark reddish-brown translucent resin crystals and granules (looks like crushed deep-red garnet/amber resin chunks). A small scattering of glistening dark ruby-red resin granules on the travertine.`,
  'imli-tamarind':
    `${STYLE} A speckled cream ceramic bowl filled with authentic dried brown tamarind (imli): whole cracked brittle cinnamon-brown tamarind pods alongside glossy dark-brown sticky fibrous tamarind pulp with shiny dark seeds peeking out. Two curved brown tamarind pods resting on the travertine.`,
  'chamomile-tea':
    `${STYLE} A speckled cream ceramic bowl heaped with whole dried chamomile (babuna) flowers: delicate small daisy-like dried blossoms with bright golden-yellow dome centres and soft creamy-white petals (NO tea bags, ONLY loose whole dried chamomile flowers). A few dried chamomile blossoms scattered on the travertine.`,
  'coriander-seeds-whole':
    `${STYLE} A speckled cream ceramic bowl heaped with whole dried coriander seeds (dhaniya sabut): small, round, hollow-ribbed light golden-tan/beige spherical spice seeds with faint vertical ridges. A small pinch of round whole coriander seeds scattered on the travertine.`,
  'murabba-gajar':
    `${STYLE} An unlabelled clear glass jar with a plain matte black metal lid filled with whole baby carrots and thick vibrant reddish-orange carrot chunks preserved in glossy clear-amber sugar syrup, plus a small speckled cream ceramic bowl beside it with 3–4 glistening syrup-soaked orange-red carrot pieces. NO honey dipper, NO honey spoon, NO honeycomb.`,
  'murabba-harad':
    `${STYLE} An unlabelled clear glass jar with a plain matte black metal lid filled with whole dark-brown elongated ribbed harad (chebulic myrobalan) fruits preserved in thick dark caramel-brown sugar syrup, plus a small speckled cream ceramic bowl beside it holding 3–4 glossy dark-brown syrup-soaked harad fruits. NO honey dipper, NO honey spoon, NO honeycomb.`,
  'murabba-saib':
    `${STYLE} An unlabelled clear glass jar with a plain matte black metal lid filled with golden-amber preserved mini apples and thick apple wedges (murabba saib) suspended in thick glossy golden sugar syrup, plus a small speckled cream ceramic bowl beside it holding glossy syrup-soaked apple chunks. NO honey dipper, NO honey spoon, NO honeycomb.`,
  'gift-condolence-visit':
    `${STYLE} A dignified, understated matte dark forest-green open rigid gift box with 3 neat compartments: one filled with glossy dark-brown soft Mazafati dates, the middle holding an unlabelled clear glass jar of rich dark granular black tea leaves (chai patti) with a black lid, and the third filled with plump whole golden-brown almonds.`,
  'gift-ayadat-basket':
    `${STYLE} A woven artisanal natural-cane gift basket lined with dark forest-green linen, neatly arranged with an unlabelled clear glass jar of golden honey with a plain gold metal lid (NO honey dipper, NO label), a small speckled cream ceramic bowl of soft dark Mazafati dates, and a small speckled cream ceramic bowl of plump whole almonds.`,
  'deal-date-almond':
    `${STYLE} Two matching speckled cream ceramic bowls side by side on the cream travertine (everyday value duo look, NO gift box): left bowl heaped with glossy soft dark-brown Mazafati dates, right bowl heaped with plump roasted golden-brown whole almonds. A couple of loose dates and almonds between them.`,
  'bundle-chilgoza-heirloom':
    `${STYLE} A grand luxury heirloom presentation on cream travertine: an open dark forest-green lined presentation tray holding a speckled ceramic bowl of elongated dark-brown roasted chilgoza pine nuts in their shells, a second speckled ceramic bowl of pale creamy peeled chilgoza pine nut kernels, and an unlabelled clear glass bottle with a dark cork/cap filled with golden-amber chilgoza oil.`,
  'bundle-murabba-tasting':
    `${STYLE} A curated arrangement of 5 small matching unlabelled clear glass jars with plain black metal lids arranged neatly on cream travertine with dark forest-green linen behind, each visibly showing its distinct preserve in glossy syrup: pale-golden whole amla, golden apple wedges, bright orange-red carrot chunks, yellow quince wedges, and deep crimson-red rose-petal gulkand. NO honey dipper, NO labels.`,
  'deal-murabba-duo':
    `${STYLE} Two matching larger unlabelled clear glass jars with plain black metal lids side by side on cream travertine: left jar filled with whole pale-golden amla fruits in dark amber syrup, right jar filled with golden apple wedges in glossy golden syrup, with two tiny speckled cream ceramic tasting dishes in front holding syrup-soaked amla and apple pieces. NO honey dipper, NO labels.`,
};

const MODELS = ['gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];

async function generateOne(id, prompt) {
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      console.warn(`  [${id}] ${model} failed (${res.status}): ${msg.slice(0, 140)}`);
      continue;
    }
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData?.data);
    if (!imgPart) {
      console.warn(`  [${id}] ${model} returned no image part`);
      continue;
    }
    const mime = imgPart.inlineData.mimeType || 'image/png';
    const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
    const outPath = path.join(OUT_RAW, `${id}.${ext}`);
    fs.writeFileSync(outPath, Buffer.from(imgPart.inlineData.data, 'base64'));
    console.log(`OK ${id} via ${model} -> ${outPath}`);
    return true;
  }
  return false;
}

async function main() {
  const requested = process.argv.slice(2);
  const targets = requested.length
    ? requested
    : Object.keys(PROMPTS).filter(id => !fs.existsSync(path.join(OUT_WEBP, `${id}.webp`)));

  console.log(`Generating ${targets.length} images via Gemini Image API...`);
  let ok = 0;
  let fail = 0;
  for (const id of targets) {
    const prompt = PROMPTS[id];
    if (!prompt) {
      console.error(`Unknown id: ${id}`);
      fail++;
      continue;
    }
    const success = await generateOne(id, prompt);
    if (success) ok++;
    else fail++;
    await new Promise(r => setTimeout(r, 1200));
  }
  console.log(`Done: ok=${ok}, fail=${fail}`);
  if (fail > 0) process.exit(1);
}

main().catch(err => {
  console.error(err?.message || String(err));
  process.exit(1);
});
