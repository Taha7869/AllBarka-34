const fs = require('fs');
let content = fs.readFileSync('src/pages/InfoPage.tsx', 'utf-8');

// The file might now have duplicate blog-nutrition, we need to remove the old one.
const oldNutrition = `  {
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

// Check how many times blog-nutrition appears
const matches = content.match(/id: 'blog-nutrition'/g);
if (matches && matches.length > 1) {
  // It has it twice, so we should remove one instance, specifically the second one.
  const regex = /{\s*id: 'blog-nutrition',[\s\S]*?},/; // will match the first one, which is the one we want to keep. Wait, we want to remove the second one.
}

