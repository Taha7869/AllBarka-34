import type { Product } from '../types';
import { resolveCategorySlug, productMatchesCategory } from '../config/categories';

export interface SelectionPreferences {
  category: string;
  budget: number | null;
  taste?: string | null;
  texture?: string | null;
  occasion?: string | null;
}

export interface SelectionMatch {
  product: Product;
  weight: string;
  price: number;
  matchScore: number;
  matchedAttributes: string[];
  rationale?: string;
}

const TASTE_KEYWORDS: Record<string, string[]> = {
  sweet: ['sweet', 'sweetness', 'honey', 'sugar', 'dates', 'raisins', 'apricot', 'fig', 'caramel'],
  savory: ['savory', 'salted', 'roasted', 'salt', 'roast', 'spiced', 'pepper', 'wood-roasted'],
  salted: ['salted', 'salt', 'pink salt', 'sea salt', 'namkeen'],
  earthy: ['earthy', 'nutty', 'raw', 'walnut', 'almond', 'woody', 'natural'],
  rich: ['rich', 'buttery', 'creamy', 'creaminess', 'cashew', 'pistachio', 'ghee'],
  subtle: ['subtle', 'mild', 'delicate', 'natural sweetness'],
};

const TEXTURE_KEYWORDS: Record<string, string[]> = {
  crunchy: ['crunch', 'crunchy', 'crisp', 'snappy', 'hard'],
  chewy: ['chewy', 'chew', 'succulent', 'dates', 'raisins', 'figs', 'fleshy'],
  soft: ['soft', 'tender', 'creamy', 'smooth', 'velvety'],
  crispy: ['crisp', 'crispy', 'wood-roasted', 'roasted crunch', 'snappy'],
  buttery: ['buttery', 'melt', 'melt-in-the-mouth', 'silky', 'tender'],
};

const OCCASION_KEYWORDS: Record<string, string[]> = {
  daily: ['daily', 'breakfast', 'morning', 'vitality', 'wellness', 'snacking', 'energy'],
  hosting: ['hosting', 'mehmaan', 'guest', 'entertaining', 'dastarkhwan', 'tea-time'],
  gifting: ['gift', 'gifting', 'keepsake', 'favor', 'bid', 'celebration', 'wedding'],
  tea: ['tea', 'chai', 'tea-time', 'snack', 'afternoon'],
  iftar: ['iftar', 'ramadan', 'dates', 'sunnah', 'fasting', 'energy'],
};

export function selectionMatches(products: Product[], preferences: SelectionPreferences): SelectionMatch[] {
  if (preferences.budget !== null && (!Number.isFinite(preferences.budget) || preferences.budget <= 0)) {
    return [];
  }

  const results: SelectionMatch[] = [];

  for (const product of products) {
    if (product.active === false || product.quoteOnly) continue;
    if (preferences.category !== 'all' && !productMatchesCategory(product, preferences.category)) continue;

    const portions = Object.entries(product.prices || {})
      .filter(([, price]) => Number.isFinite(price) && price > 0)
      .sort((a, b) => a[1] - b[1]);

    const [weight, price] = portions[0] || [];
    if (!weight || !price) continue;
    if (preferences.budget !== null && price > preferences.budget) continue;

    const matchedAttributes: string[] = [];
    let matchScore = 10;

    const tasteHaystack = [
      product.tasteProfile_en,
      product.desc_en,
      product.name_en,
      product.passport?.variety,
      product.passport?.roastLevel,
      ...(product.keywords || []),
      ...(product.occasions || []),
    ].filter(Boolean).join(' ').toLowerCase();

    // 1. Taste matching
    if (preferences.taste && preferences.taste !== 'any') {
      const targets = TASTE_KEYWORDS[preferences.taste.toLowerCase()] || [preferences.taste.toLowerCase()];
      if (targets.some(kw => tasteHaystack.includes(kw))) {
        matchedAttributes.push(preferences.taste);
        matchScore += 20;
      }
    }

    // 2. Texture matching
    if (preferences.texture && preferences.texture !== 'any') {
      const targets = TEXTURE_KEYWORDS[preferences.texture.toLowerCase()] || [preferences.texture.toLowerCase()];
      if (targets.some(kw => tasteHaystack.includes(kw))) {
        matchedAttributes.push(preferences.texture);
        matchScore += 20;
      }
    }

    // 3. Occasion matching
    if (preferences.occasion && preferences.occasion !== 'any') {
      const targets = OCCASION_KEYWORDS[preferences.occasion.toLowerCase()] || [preferences.occasion.toLowerCase()];
      const occMatch = (product.occasions && product.occasions.some(o => targets.includes(o.toLowerCase())))
        || targets.some(kw => tasteHaystack.includes(kw));
      if (occMatch) {
        matchedAttributes.push(preferences.occasion);
        matchScore += 15;
      }
    }

    // Filter strictness: if taste or texture were specified and neither matched, skip
    const requestedTaste = preferences.taste && preferences.taste !== 'any';
    const requestedTexture = preferences.texture && preferences.texture !== 'any';
    if ((requestedTaste || requestedTexture) && matchedAttributes.length === 0) {
      continue;
    }

    results.push({
      product,
      weight,
      price,
      matchScore,
      matchedAttributes,
      rationale: matchedAttributes.length > 0 ? `Matches ${matchedAttributes.join(' & ')} profile` : undefined,
    });
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

export function selectionResultsPath(preferences: SelectionPreferences): string {
  const category = resolveCategorySlug(preferences.category) || 'all';
  const params = new URLSearchParams();
  if (preferences.budget !== null && Number.isFinite(preferences.budget) && preferences.budget >= 300 && preferences.budget < 10000) {
    params.set('budget', String(preferences.budget));
  }
  if (preferences.taste && preferences.taste !== 'any') {
    params.set('taste', preferences.taste);
  }
  if (preferences.texture && preferences.texture !== 'any') {
    params.set('texture', preferences.texture);
  }
  if (preferences.occasion && preferences.occasion !== 'any') {
    params.set('occasion', preferences.occasion);
  }
  return `${category === 'all' ? '/shop' : `/shop/${category}`}${params.size ? `?${params}` : ''}`;
}
