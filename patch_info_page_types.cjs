const fs = require('fs');
let content = fs.readFileSync('src/pages/InfoPage.tsx', 'utf-8');

const oldTypes = `export type InfoPageTab = 
  | 'our-story'
  | 'sourcing-policy'
  | 'lahore-boutique'
  | 'blog-nutrition'
  | 'hand-sorting'
  | 'vacuum-sealing'
  | 'freshness-guarantee'
  | 'shipping'
  | 'contact';`;

const newTypes = `export type InfoPageTab = 
  | 'our-story'
  | 'sourcing-policy'
  | 'orchard-provenance'
  | 'lahore-boutique'
  | 'blog-nutrition'
  | 'hand-sorting'
  | 'vacuum-sealing'
  | 'freshness-guarantee'
  | 'shipping'
  | 'contact';`;

content = content.replace(oldTypes, newTypes);

const nutritionData = `  {
    id: 'blog-nutrition',
    category: 'discover',
    categoryLabel: 'The Journal',
    navTitle: 'Nutritional Guidelines',
    badge: 'Wellness & Nutrition Profile',
    headline: 'Essential Macronutrients & Dietary Benefits',
    content: "AllBarka dry fruits are 100% raw, unbleached, and naturally preserved in nitrogen-flushed barrier pouches to retain their full micronutrient density:\\n\\n• Iranian Pistachios: 20g Protein / 100g, abundant in Vitamin B6, Potassium, and eye-healthy Lutein.\\n• American Mountain Almonds: 21g Plant Protein, rich in Alpha-Tocopherol (Vitamin E) and dietary fiber for cardiovascular and skin health.\\n• Chilean Walnuts: Supreme plant source of Omega-3 ALA (Alpha-Linolenic Acid) supporting brain health and lowering LDL cholesterol.\\n• King Cashews (W240): Packed with Zinc, Iron, and Magnesium for muscle recovery and immune function.\\n• Organic Chia & Pumpkin Seeds: High dietary fiber (34g/100g) and natural Tryptophan promoting restorative sleep and sustained satiety.\\n• Sun-Dried Apricots & Plums: High in Potassium and natural Sorbitol aiding digestive health.",
    icon: <BookOpen size={18} />,
    highlights: [
      { icon: <CheckCircle2 size={18} />, label: "Zero Added Sugar, Artificial Glazes, or Preservatives" },
      { icon: <CheckCircle2 size={18} />, label: "Dense in Heart-Healthy Monounsaturated Fatty Acids" },
      { icon: <CheckCircle2 size={18} />, label: "Recommended Daily Portion: 30g mixed handful (approx. 180 kcal)" }
    ],
    meta: "Whole-food nutrition straight from orchard trees to your daily vitality routine."
  },`;

const provenanceData = `  {
    id: 'orchard-provenance',
    category: 'discover',
    categoryLabel: 'The Journal',
    navTitle: 'Orchard Provenance',
    badge: 'Terroir & Sourcing Map',
    headline: 'Single-Origin Provenance from Generational Orchards',
    content: "Every variety at AllBarka is traceable back to its certified growing belt:\\n\\n• Kerman & Rafsanjan (Iran): UNESCO-recognized arid soils yielding wood-roasted Akbari and jumbo pistachios with guaranteed 99% open-shell ratios.\\n• Central Valley (California, USA): Alluvial valley soils cultivating sweet, high-oil Nonpareil and Butte-Padre mountain almonds.\\n• Central Valleys (Chile): Glacial Andean snow-melt rivers irrigating extra-light Serr and Chandler walnuts, cracked fresh for zero bitter aftertaste.\\n• Mangalore & Goa (India): Tropical coastal microclimates producing jumbo W240 and royal W180 sweet white whole cashews.\\n• Hunza & Skardu Valleys (Pakistan): Alpine ultraviolet sun-cured golden apricots (Khubani) with pure honeyed tartness.\\n• Kandahar (Afghanistan): Traditional shade-drying vineyards producing seedless long emerald Kishmish.\\n• Madinah Oasis (Saudi Arabia): Historic date palm groves providing authentic dark Ajwa and amber dates.",
    icon: <Leaf size={18} />,
    highlights: [
      { icon: <CheckCircle2 size={18} />, label: "Single-Estate Traceability for every harvest lot" },
      { icon: <CheckCircle2 size={18} />, label: "Direct ethical contracts with verified generational growers" },
      { icon: <CheckCircle2 size={18} />, label: "Zero mass-market blending or old crop mixing" }
    ],
    meta: "True luxury begins with respect for the soil, sun, and origin."
  },`;

// Check if nutrition already exists and replace it, or add them both
const matchRegex = /{[\s\S]*?id: 'blog-nutrition',[\s\S]*?},/;
if (content.match(matchRegex)) {
  content = content.replace(matchRegex, nutritionData + '\n' + provenanceData);
} else {
  content = content.replace('const PAGES: PageData[] = [', 'const PAGES: PageData[] = [\n' + nutritionData + '\n' + provenanceData);
}

fs.writeFileSync('src/pages/InfoPage.tsx', content);
