const fs = require('fs');
let content = fs.readFileSync('src/pages/InfoPage.tsx', 'utf-8');

const contactData = `
  'contact': {
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

const provenanceData = `
  'orchard-provenance': {
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
  }`;

// Find the end of the PAGES object and insert contact and provenance.
content = content.replace(/quote: 'True freshness shouldn’t spend days in transit.'\n\s*\}\n\s*\};/, "quote: 'True freshness shouldn’t spend days in transit.'\n  }," + contactData + provenanceData + "\n};");

fs.writeFileSync('src/pages/InfoPage.tsx', content);
