const fs = require('fs');
let content = fs.readFileSync('src/pages/InfoPage.tsx', 'utf-8');

const nutritionData = `  'blog-nutrition': {
    id: 'blog-nutrition',
    category: 'discover',
    categoryLabel: 'The Journal',
    navTitle: 'Nutritional Guidelines',
    badge: 'Wellness & Nutrition Profile',
    headline: 'Essential Macronutrients & Dietary Benefits',
    content: "AllBarka dry fruits are 100% raw, unbleached, and naturally preserved in nitrogen-flushed barrier pouches to retain their full micronutrient density:\\n\\n• Iranian Pistachios: 20g Protein / 100g, abundant in Vitamin B6, Potassium, and eye-healthy Lutein.\\n• American Mountain Almonds: 21g Plant Protein, rich in Alpha-Tocopherol (Vitamin E) and dietary fiber for cardiovascular and skin health.\\n• Chilean Walnuts: Supreme plant source of Omega-3 ALA (Alpha-Linolenic Acid) supporting brain health and lowering LDL cholesterol.\\n• King Cashews (W240): Packed with Zinc, Iron, and Magnesium for muscle recovery and immune function.\\n• Organic Chia & Pumpkin Seeds: High dietary fiber (34g/100g) and natural Tryptophan promoting restorative sleep and sustained satiety.\\n• Sun-Dried Apricots & Plums: High in Potassium and natural Sorbitol aiding digestive health.",
    icon: BookOpen,
    highlights: [
      "Zero Added Sugar, Artificial Glazes, or Preservatives",
      "Dense in Heart-Healthy Monounsaturated Fatty Acids",
      "Recommended Daily Portion: 30g mixed handful (approx. 180 kcal)"
    ],
    quote: "Whole-food nutrition straight from orchard trees to your daily vitality routine."
  },`;

const provenanceData = `  'orchard-provenance': {
    id: 'orchard-provenance',
    category: 'discover',
    categoryLabel: 'The Journal',
    navTitle: 'Orchard Provenance',
    badge: 'Terroir & Sourcing Map',
    headline: 'Single-Origin Provenance from Generational Orchards',
    content: "Every variety at AllBarka is traceable back to its certified growing belt:\\n\\n• Kerman & Rafsanjan (Iran): UNESCO-recognized arid soils yielding wood-roasted Akbari and jumbo pistachios with guaranteed 99% open-shell ratios.\\n• Central Valley (California, USA): Alluvial valley soils cultivating sweet, high-oil Nonpareil and Butte-Padre mountain almonds.\\n• Central Valleys (Chile): Glacial Andean snow-melt rivers irrigating extra-light Serr and Chandler walnuts, cracked fresh for zero bitter aftertaste.\\n• Mangalore & Goa (India): Tropical coastal microclimates producing jumbo W240 and royal W180 sweet white whole cashews.\\n• Hunza & Skardu Valleys (Pakistan): Alpine ultraviolet sun-cured golden apricots (Khubani) with pure honeyed tartness.\\n• Kandahar (Afghanistan): Traditional shade-drying vineyards producing seedless long emerald Kishmish.\\n• Madinah Oasis (Saudi Arabia): Historic date palm groves providing authentic dark Ajwa and amber dates.",
    icon: Leaf,
    highlights: [
      "Single-Estate Traceability for every harvest lot",
      "Direct ethical contracts with verified generational growers",
      "Zero mass-market blending or old crop mixing"
    ],
    quote: "True luxury begins with respect for the soil, sun, and origin."
  },`;

const contactData = `  'contact': {
    id: 'contact',
    category: 'information',
    categoryLabel: 'Get in Touch',
    navTitle: 'Contact',
    badge: 'Concierge',
    headline: 'Boutique Concierge',
    content: "For corporate gifting, custom hampers, or immediate assistance, our dedicated concierge is ready to assist you. Visit our boutique in Lahore or connect with us directly on WhatsApp.",
    icon: MessageCircle,
    highlights: [
      "Neelum Block, Allama Iqbal Town, Lahore",
      "Open Daily: 9:00 AM – 9:00 PM",
      "WhatsApp: 0316-0666083"
    ],
    quote: "Fast response guaranteed"
  },`;

// Check if 'contact' or 'orchard-provenance' is already in the object
if (!content.includes("'contact': {")) {
    // Append to the end of PAGES object
    content = content.replace(/};\n\nexport function InfoPagesModal/, contactData + '\n' + provenanceData + '\n};\n\nexport function InfoPagesModal');
}

// Replace existing blog-nutrition with the new array format (it currently has string array, wait, highlights is string[])
const oldNutritionRegex = /'blog-nutrition':\s*{[\s\S]*?},\n  'hand-sorting':/;
if (content.match(oldNutritionRegex)) {
    content = content.replace(oldNutritionRegex, nutritionData + "\n  'hand-sorting':");
}

fs.writeFileSync('src/pages/InfoPage.tsx', content);
