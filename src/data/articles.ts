export interface ArticleSection {
  heading: string;
  content: string[];
  callout?: {
    title: string;
    text: string;
  };
}

export interface JournalArticle {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: 'Storage & Care' | 'Culinary & Pairings' | 'Gifting' | 'Wellness & Science' | 'Buying Guides';
  readTime: string;
  publishedDate: string;
  updatedDate: string;
  author: {
    name: string;
    role: string;
  };
  image: string;
  tags: string[];
  sections: ArticleSection[];
  relatedProductIds: string[];
  sources?: string[];
}

export const JOURNAL_ARTICLES: JournalArticle[] = [
  {
    slug: 'choosing-pack-sizes',
    title: 'Choosing Pack Sizes: When to Select 250g, 500g, or 1kg',
    subtitle: 'A practical buying guide to optimize freshness, household consumption, and wholesale savings.',
    excerpt: 'Avoid letting precious nuts sit open too long. Here is how to match pack sizes to consumption speed, baking projects, and family needs.',
    category: 'Buying Guides',
    readTime: '4 min read',
    publishedDate: 'October 12, 2025',
    updatedDate: 'February 2026',
    author: {
      name: 'AllBarka Sourcing & Quality Team',
      role: 'Quality Assurance, Lahore Roastery',
    },
    image: '/images/products/deal-2.jpg',
    tags: ['Buying Guide', 'Pack Sizes', 'Wholesale', 'Freshness'],
    relatedProductIds: ['badam', 'kaju', 'pista', 'deal-2'],
    sections: [
      {
        heading: '1. The Freshness Window of Premium Harvest Lots',
        content: [
          'High-grade nuts such as unbleached California almonds and extra-light Chilean walnuts are rich in delicate mono- and polyunsaturated oils. Once their nitrogen thermal vacuum seal is broken, exposure to ambient atmospheric oxygen and humidity begins a slow degradation process.',
          'Choosing the right pack size is not merely an economic decision—it is the single most effective way to ensure every kernel you consume delivers the same crisp snap as the day it was roasted.'
        ],
        callout: {
          title: 'Rule of Thumb',
          text: 'Aim to purchase an amount your household will comfortably finish within 3 to 4 weeks of opening.'
        }
      },
      {
        heading: '2. The 250g Selection: Sampling & Single-Household Snacking',
        content: [
          'The 250g barrier pouch is ideal for individuals, couples, or anyone exploring a new harvest variety. It is also the recommended size for specialty items like roasted Iranian pistachios or dried apricots (Khubani) intended for a specific dessert recipe.',
          'Because the bag is depleted quickly, the contents remain at peak aromatic vibrancy without requiring refrigerator relocation.'
        ]
      },
      {
        heading: '3. The 500g Sweet Spot: Families & Regular Snackers',
        content: [
          'For households with 3 or more members who incorporate nuts into morning breakfasts or tea-time routines, the 500g pack offers balanced value without risk of staleness.',
          'At 500g, you achieve substantial price-per-gram savings compared to 250g pouches while keeping the opened lot small enough to stay crisp.'
        ]
      },
      {
        heading: '4. The 1kg Reserve: Baking, Festive Dawats & Wholesale Tiers',
        content: [
          'Select the 1kg reserve pouch when planning large family gatherings, Ramadan preparations, wedding giveaways, or weekly baking routines.',
          'AllBarka provides dedicated wholesale pricing tiers on 1kg orders. To maximize shelf-life, immediately decant 250g into a tabletop glass jar for daily snacking, and store the remaining 750g in an airtight container inside your refrigerator crisper.'
        ]
      }
    ],
    sources: [
      'International Nut and Dried Fruit Council (INC) Storage Standards',
      'AllBarka Quality Testing Protocol, Lahore Facility'
    ]
  },
  {
    slug: 'storing-nuts-and-dried-fruits',
    title: 'Storing Nuts & Dried Fruits: The Science of Preserving Crispness in Warm Climates',
    subtitle: 'How heat, oxygen, and ambient humidity affect natural plant oils—and how to keep kernels pristine.',
    excerpt: 'Discover why room-temperature bowls turn walnuts bitter, and how simple kitchen storage habits keep your dry fruits orchard-fresh.',
    category: 'Storage & Care',
    readTime: '5 min read',
    publishedDate: 'November 5, 2025',
    updatedDate: 'January 2026',
    author: {
      name: 'AllBarka Sourcing & Quality Team',
      role: 'Cold-Chain & Preservation Cell',
    },
    image: '/images/products/akhroot.jpg',
    tags: ['Storage Science', 'Walnuts', 'Freshness', 'Climate Tips'],
    relatedProductIds: ['akhroot', 'pista', 'badam', 'khubani'],
    sections: [
      {
        heading: '1. The Three Enemies of Nut Crispness',
        content: [
          'Every natural nut kernel contains two primary vulnerabilities: polyunsaturated fatty acids and hygroscopic surface structures.',
          'Heat accelerates oil rancidity (producing that sharp, unpleasant bitterness commonly associated with old bazaar walnuts). Oxygen causes lipid oxidation. Humidity robs roasted nuts of their brittle, satisfying snap.'
        ],
        callout: {
          title: 'The Nitrogen Seal Advantage',
          text: 'Every AllBarka pouch is sealed directly after inspection to lock out ambient moisture until you open it in your home.'
        }
      },
      {
        heading: '2. Refrigeration: Why Walnuts Require Cold Storage',
        content: [
          'Walnuts (Akhroot) possess the highest concentration of plant-based alpha-linolenic omega-3 fatty acids among all culinary nuts. These fragile double bonds oxidize rapidly above 21°C.',
          'If you intend to keep walnuts longer than 14 days, transfer them to an airtight glass container and store them in the middle shelf of your refrigerator (3°C to 5°C). Cold storage halts oxidation completely, preserving sweet, buttery flavors for up to 6 months.'
        ]
      },
      {
        heading: '3. Dried Fruits: Retaining Moisture Without Mold',
        content: [
          'Unlike nuts which must stay bone-dry, dried fruits like apricots (Khubani), plums (Alubukhara), and dark dates (Khajoor) depend on balanced interior moisture for their succulent chew.',
          'Never leave dried fruits exposed in open decorative bowls in hot kitchens. Keep their original zip-lock pouches tightly closed in a cool, shaded pantry cupboard.'
        ]
      }
    ],
    sources: [
      'USDA Food Safety and Inspection Service Guidelines for Tree Nuts',
      'Food Chemistry Journal: Lipid Oxidation in High-Altitude Tree Nuts'
    ]
  },
  {
    slug: 'tea-time-pairings',
    title: 'Lahori Tea-Time Pairings: Elevating Kashmiri Chai and Doodh Patti',
    subtitle: 'Curating the quintessential afternoon hospitality ritual with freshly roasted dry fruits and heritage savories.',
    excerpt: 'Explore traditional and contemporary tea pairings that harmonize the tannin depth of black tea with buttery cashews and roasted pistachios.',
    category: 'Culinary & Pairings',
    readTime: '4 min read',
    publishedDate: 'December 1, 2025',
    updatedDate: 'February 2026',
    author: {
      name: 'AllBarka Culinary & Sourcing Team',
      role: 'Hospitality & Taste Curators',
    },
    image: '/images/products/pista.jpg',
    tags: ['Tea Pairings', 'Kashmiri Chai', 'Nimko', 'Lahori Culture'],
    relatedProductIds: ['pista', 'kaju', 'nimko', 'chanay'],
    sections: [
      {
        heading: '1. The Afternoon Asr Hospitality Ritual in Lahore',
        content: [
          'In Lahore, afternoon tea is rarely just a cup of tea; it is an unhurried social ritual of hospitality, conversation, and seasonal celebration.',
          'Pairing hot tea with carefully selected nuts and savory roastery items creates a balanced sensory experience—contrasting rich dairy sweetness with clean, roasted sea-salt crunch.'
        ]
      },
      {
        heading: '2. Kashmiri Pink Chai & Sliced Iranian Pistachios',
        content: [
          'Kashmiri chai’s signature rose hue, aromatic cardamom undertones, and velvety clotted cream body call for finely slivered Iranian pistachios and blanched almond Giri.',
          'Lightly toasted pistachios release chlorophyll-rich aromatic oils when floating on warm milk, providing an authentic textural counterpoint to the tea’s creamy body.'
        ],
        callout: {
          title: 'Pairing Tip',
          text: 'Use unsalted or very lightly salted pistachios so the delicate floral notes of the saffron and cardamom are not overpowered.'
        }
      },
      {
        heading: '3. Strong Doodh Patti with Artisanal Nimko & Roasted Chanay',
        content: [
          'A robust, caramelized cup of Lahori Doodh Patti pairs brilliantly with spiced Artisanal Nimko and wood-roasted chickpeas (Chanay).',
          'The clean, zero-fat crunch of roasted chickpeas cuts through the rich milk solids, leaving the palate refreshed and pleasantly satisfied.'
        ]
      }
    ]
  },
  {
    slug: 'everyday-cooking-serving-ideas',
    title: 'Everyday Cooking & Serving Ideas: From Shahi Biryani to Morning Bowls',
    subtitle: 'Simple, nutritious ways to incorporate whole raw nuts, dried plums, and seeds into daily meals.',
    excerpt: 'Dry fruits are not just for winter snacking or formal occasions. Here are effortless ways to integrate them into daily breakfast, lunch, and dinner.',
    category: 'Culinary & Pairings',
    readTime: '5 min read',
    publishedDate: 'December 18, 2025',
    updatedDate: 'February 2026',
    author: {
      name: 'AllBarka Culinary & Sourcing Team',
      role: 'Recipe & Kitchen Studio',
    },
    image: '/images/products/alubukhara.jpg',
    tags: ['Recipes', 'Biryani', 'Smoothie Bowls', 'Daily Nutrition'],
    relatedProductIds: ['alubukhara', 'badam', 'chia_seeds', 'pumpkin_seeds'],
    sections: [
      {
        heading: '1. The Soul of Lahori Biryani: Fleshy Alubukhara',
        content: [
          'In authentic Lahori and Karachi style dawat biryani, gourmet dried plums (Alubukhara) are not mere garnishes—they are active flavor anchors.',
          'During the dum phase, the plums absorb spicy meat juices and steam, rehydrating into sweet, tangy pockets that burst delightfully against fragrant sela basmati rice.'
        ],
        callout: {
          title: 'Chef Recommendation',
          text: 'Add 6 to 8 whole Alubukhara per kilogram of rice during the final dum layering stage for optimal flavor permeation.'
        }
      },
      {
        heading: '2. The 10-Minute Morning Power Bowl',
        content: [
          'Transform plain yogurt or warm porridge into a sustained-energy breakfast by stirring in one tablespoon of organic chia seeds and topping with raw pumpkin seeds and sliced Golden Giri almonds.',
          'The combination provides 12g of clean plant protein, soluble prebiotic fiber, and essential minerals like magnesium and zinc without any refined sugar.'
        ]
      },
      {
        heading: '3. Sweet & Tangy Khubani Chutney',
        content: [
          'Soak 200g of AllBarka sun-dried apricots in warm water for 2 hours, then puree with a pinch of cumin, red chili flakes, black salt, and a splash of lemon juice.',
          'This versatile chutney keeps for up to 3 weeks in the refrigerator and elevates grilled meats, samosas, and roasted vegetables.'
        ]
      }
    ]
  },
  {
    slug: 'understanding-ingredients-and-allergens',
    title: 'Understanding Ingredients & Allergens: Tree Nuts, Peanuts, and Seeds',
    subtitle: 'Our strict facility protocol, cross-contact prevention, and guidance for sensitive patrons.',
    excerpt: 'Transparency is our foremost principle. Read our complete allergen disclosure, sorting methods, and safety protocols for peace of mind.',
    category: 'Wellness & Science',
    readTime: '4 min read',
    publishedDate: 'January 10, 2026',
    updatedDate: 'February 2026',
    author: {
      name: 'AllBarka Food Safety & Quality Board',
      role: 'Compliance & Hygiene Division',
    },
    image: '/images/products/kaju.jpg',
    tags: ['Allergens', 'Food Safety', 'Transparency', 'Health'],
    relatedProductIds: ['kaju', 'badam', 'pista', 'chia_seeds'],
    sections: [
      {
        heading: '1. Full Ingredient Transparency',
        content: [
          'At AllBarka, we believe customers have an absolute right to know what touches their food. Our whole nuts and sun-dried fruits contain zero added sugars, sulfur dioxide bleaching agents, artificial glazing syrups, or synthetic colors.',
          'What you see in the clear window of our packaging is 100% pure harvest crop.'
        ]
      },
      {
        heading: '2. Tree Nut Allergen Disclosures',
        content: [
          'Almonds, cashews, pistachios, and walnuts are classified as tree nuts. Individuals with diagnosed tree nut allergies must exercise extreme caution.',
          'All AllBarka whole nut varieties are processed and packed in our dedicated climate-controlled facility in Lahore. While individual packaging lines are sanitized between batches, airborne or contact trace cross-contamination cannot be 100% ruled out.'
        ],
        callout: {
          title: 'Mandatory Facility Statement',
          text: 'Packed in a facility that handles tree nuts (almonds, cashews, pistachios, walnuts), peanuts, sesame seeds, wheat/gluten (nimko), and dried fruits.'
        }
      },
      {
        heading: '3. Seed Safety & Gluten Status',
        content: [
          'Our chia seeds and pumpkin seeds are naturally gluten-free botanicals harvested from dedicated seed farms.',
          'However, because our roastery facility also handles traditional snacks (such as nimko which contains wheat flour), patrons with severe celiac disease or anaphylactic gluten allergies should be aware of potential facility-level trace contact.'
        ]
      }
    ],
    sources: [
      'Food and Agriculture Organization (FAO) / WHO Food Allergen Guidelines',
      'Pakistan Standards and Quality Control Authority (PSQCA) Labeling Norms'
    ]
  },
  {
    slug: 'gifting-and-selecting-combinations',
    title: 'Gifting & Selecting Combinations: Assembling Meaningful Curations',
    subtitle: 'From corporate gratitude to wedding dawats: etiquette and pairings for memorable bespoke gift boxes.',
    excerpt: 'Learn how to construct elegant, high-impact dry fruit gifts that honor traditions of hospitality while matching recipient preferences.',
    category: 'Gifting',
    readTime: '4 min read',
    publishedDate: 'January 25, 2026',
    updatedDate: 'February 2026',
    author: {
      name: 'AllBarka Hospitality & Gifting Atelier',
      role: 'Corporate & Celebration Concierge',
    },
    image: '/images/products/deal-1.jpg',
    tags: ['Gifting', 'Corporate Gifts', 'Hampers', 'Hospitality'],
    relatedProductIds: ['deal-1', 'deal-2', 'pista', 'kaju'],
    sections: [
      {
        heading: '1. The Cultural Significance of Dry Fruit Gifting in Pakistan',
        content: [
          'In South Asian hospitality, presenting premium dry fruits is a timeless gesture of profound respect, health, and heartfelt goodwill.',
          'Unlike perishable confections loaded with refined sugar, an artisanal dry fruit curation endures, allowing recipients to enjoy orchard-fresh nutrition over weeks with their families.'
        ]
      },
      {
        heading: '2. Pairing Principles: The Contrast of Texture and Tone',
        content: [
          'An exceptional curation balances texture, color, and culinary utility. Our signature duo "The Classics" pairs the extra-light golden curves of Chilean walnuts with the vibrant emerald tips of roasted Iranian pistachios.',
          'For executive and corporate recipients, "Work-Day Fuel" pairs hearty California Giri almonds with creamy W240 cashews, offering practical, high-value nutrition for busy desks.'
        ],
        callout: {
          title: 'AllBarka Presentation Standard',
          text: 'Every AllBarka gift combo arrives in a rigid boutique box finished with gold-trimmed satin ribbon and an embossed personalized calligraphy card.'
        }
      },
      {
        heading: '3. Custom Hampers for Corporate Orders',
        content: [
          'For corporate consignments exceeding 20 hampers, our team provides custom branded sleeves, bilingual calligraphy inserts, and dedicated multi-address courier dispatch across Lahore, Islamabad, and Karachi.',
          'Connect with our concierge team via WhatsApp (+92 316 0666083) to review bespoke box dimensions, ribbon selections, and corporate volume rates.'
        ]
      }
    ]
  }
];

export function getArticleBySlug(slug: string): JournalArticle | undefined {
  return JOURNAL_ARTICLES.find(
    (a) => a.slug.toLowerCase() === slug.toLowerCase().trim()
  );
}
