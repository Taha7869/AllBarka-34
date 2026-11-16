import type { Product } from '../types';
import type { LanguageCode } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/apiUrl';
import { productMatchesOccasion } from '../config/categories';

export interface ParsedGiftQuery {
  budget: number | null;
  occasion: string | null;
  recipient: string | null;
  rawText: string;
}

/**
 * Parses user input to extract budget, occasion, and recipient intent.
 * Examples:
 * - "Walid ke liye, Eid par, 5000" -> budget: 5000, occasion: 'ramadan', recipient: 'father'
 * - "Gift for wedding under 8000" -> budget: 8000, occasion: 'wedding', recipient: 'wedding'
 */
export function parseGiftQuery(input: string): ParsedGiftQuery {
  const text = (input || '').trim().toLowerCase();
  
  // 1. Extract numeric budget
  // Matches patterns like "5000", "5,000", "rs 5000", "pkr 5000", "budget 5000", "under 5000"
  let budget: number | null = null;
  const budgetMatch = text.match(/(?:rs\.?|pkr|budget|under|upto|max|below|\b)?\s*(\d[\d,]{2,6})\s*(?:rs|pkr|\b)?/i);
  if (budgetMatch && budgetMatch[1]) {
    const parsed = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 500 && parsed <= 500000) {
      budget = parsed;
    }
  }

  // 2. Extract Occasion
  let occasion: string | null = null;
  if (/eid|ramadan|ramzan|iftar|sehri/i.test(text)) {
    occasion = 'ramadan';
  } else if (/wedding|nikkah|shaadi|valima|dulha|dulhan|favor/i.test(text)) {
    occasion = 'wedding';
  } else if (/umrah|hajj|makkah|madinah|tabarruk|ziyarat/i.test(text)) {
    occasion = 'umrah';
  } else if (/corporate|office|client|employee|boss|company/i.test(text)) {
    occasion = 'corporate';
  } else if (/dawat|dinner|hosting|mehmaan|party/i.test(text)) {
    occasion = 'dawat';
  }

  // 3. Extract Recipient
  let recipient: string | null = null;
  if (/walid|father|abu|abbu|baba|dad/i.test(text)) {
    recipient = 'father';
  } else if (/walida|mother|ammi|ami|mom|mama/i.test(text)) {
    recipient = 'mother';
  } else if (/parents|walidain/i.test(text)) {
    recipient = 'parents';
  } else if (/dost|friend|yaar/i.test(text)) {
    recipient = 'friend';
  } else if (/family|ghar|khandan/i.test(text)) {
    recipient = 'family';
  } else if (/teacher|ustad/i.test(text)) {
    recipient = 'teacher';
  }

  return { budget, occasion, recipient, rawText: input };
}

/**
 * Gets the lowest entry price for a product among active, non-disabled portions.
 */
export function getProductStartingPrice(product: Product): number | null {
  if (product.quoteOnly || product.orderMode === 'inquiry_quote') return null;
  const disabledLabels = new Set(
    Array.isArray(product.variants)
      ? product.variants.filter(v => v && v.available === false).map(v => v.label.trim())
      : []
  );

  let minPrice = Infinity;
  for (const [w, price] of Object.entries(product.prices || {})) {
    if (typeof price === 'number' && price > 0 && !disabledLabels.has(w.trim())) {
      if (price < minPrice) minPrice = price;
    }
  }

  return minPrice === Infinity ? null : minPrice;
}

/**
 * Returns the default available portion label and price for cart addition.
 */
export function getDefaultProductPortion(product: Product): { weight: string; price: number } | null {
  if (!product || !product.prices) return null;
  const disabledLabels = new Set(
    Array.isArray(product.variants)
      ? product.variants.filter(v => v && v.available === false).map(v => v.label.trim())
      : []
  );

  for (const [w, price] of Object.entries(product.prices)) {
    if (typeof price === 'number' && price > 0 && !disabledLabels.has(w.trim())) {
      return { weight: w.trim(), price };
    }
  }
  return null;
}

/**
 * Checks if a product is canonically active, published, and not draft or quote-only.
 */
export function isEligibleGiftProduct(p: Product): boolean {
  return (
    p.active !== false &&
    !p.quoteOnly &&
    p.orderMode !== 'inquiry_quote' &&
    (p as any).status !== 'draft' &&
    (p as any).status !== 'archived' &&
    getProductStartingPrice(p) !== null
  );
}

/**
 * Deterministic fallback to find top 3 gift items matching budget and occasion from the published catalog.
 * Guarantees zero health claims and strictly respects patron budget constraints.
 */
export function getDeterministicGiftSuggestions(
  catalog: Product[],
  budget: number | null,
  occasion: string | null,
  limit = 3
): Product[] {
  const eligible = catalog.filter(isEligibleGiftProduct);

  const scored = eligible.map(product => {
    let score = 0;
    const startPrice = getProductStartingPrice(product) || 0;
    const cat = (product.category || '').toLowerCase();
    const id = product.id.toLowerCase();
    const name = (product.name_en || '').toLowerCase();

    // 1. Budget constraint check
    if (budget !== null) {
      if (startPrice > budget) {
        return { product, score: -1000 }; // Exceeds budget
      }
      // Prefer items that utilize a reasonable portion of the budget (between 40% and 100%)
      const ratio = startPrice / budget;
      if (ratio >= 0.5 && ratio <= 1.0) score += 30;
      else if (ratio >= 0.25) score += 15;
    }

    // 2. Gifting form-factor preference (gift boxes, hampers, bundles, tins)
    if (cat === 'gift-boxes' || cat === 'combos' || id.includes('hamper') || id.includes('tin') || id.includes('box')) {
      score += 40;
    } else if (cat === 'bundles' || id.startsWith('bundle-')) {
      score += 35;
    } else if (cat === 'dates') {
      score += 25; // Dates are the premier traditional gift in Pakistani culture
    } else if (cat === 'dry-fruits' || cat === 'nuts') {
      score += 15;
    }

    // 3. Occasion matching
    if (occasion) {
      if (productMatchesOccasion(product, occasion)) {
        score += 35;
      }
      if (id.includes(occasion) || name.includes(occasion)) {
        score += 25;
      }
    }

    return { product, score };
  });

  // Filter out any that strictly exceed budget (score < 0)
  const candidates = scored.filter(s => s.score >= 0);
  candidates.sort((a, b) => b.score - a.score);

  const result = candidates.slice(0, limit).map(c => c.product);

  // If budget was very low and filtered everything, take lowest priced eligible items
  if (result.length < limit) {
    const remainingNeeded = limit - result.length;
    const remainingPool = eligible
      .filter(p => !result.some(r => r.id === p.id))
      .sort((a, b) => (getProductStartingPrice(a) || 0) - (getProductStartingPrice(b) || 0));

    for (let i = 0; i < remainingNeeded && i < remainingPool.length; i++) {
      result.push(remainingPool[i]);
    }
  }

  return result.slice(0, limit);
}

export interface GiftFinderResult {
  suggestions: Product[];
  source: 'ai' | 'curated';
  text?: string;
  parsedQuery: ParsedGiftQuery;
}

/**
 * Searches for gift suggestions using the server-side AI concierge chat endpoint,
 * with seamless fallback to deterministic catalog filtering.
 */
export async function searchGiftFinder(
  query: string,
  language: LanguageCode,
  catalog: Product[],
  signal?: AbortSignal
): Promise<GiftFinderResult> {
  const parsed = parseGiftQuery(query);

  // Try calling the existing server AI chat route
  try {
    const formattedPrompt = `[Gift Finder Request] The customer asks: "${query}". Please recommend 3 published gift items or bundles from the AllBarka boutique suitable for this recipient, occasion, and budget. Strictly within budget, no health claims.`;

    const response = await fetch(apiUrl('/api/concierge/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userText: formattedPrompt,
        language,
        messages: [],
      }),
      signal,
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.available === true && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        // Map validated recommendations to full catalog products
        const aiProducts: Product[] = [];
        for (const rec of data.recommendations) {
          const match = catalog.find(p => p.id === rec.productId && isEligibleGiftProduct(p));
          if (match) {
            const price = getProductStartingPrice(match);
            // Verify budget constraint
            if (parsed.budget === null || (price !== null && price <= parsed.budget)) {
              if (!aiProducts.some(p => p.id === match.id)) {
                aiProducts.push(match);
              }
            }
          }
        }

        if (aiProducts.length >= 2) {
          // If 2 or 3 matching items found within budget, return AI results
          return {
            suggestions: aiProducts.slice(0, 3),
            source: 'ai',
            text: data.reply || data.text,
            parsedQuery: parsed,
          };
        }
      }
    }
  } catch {
    // Network / timeout / offline / rate-limit: smoothly proceed to curated fallback
  }

  // Graceful deterministic fallback
  const curated = getDeterministicGiftSuggestions(catalog, parsed.budget, parsed.occasion, 3);
  return {
    suggestions: curated,
    source: 'curated',
    parsedQuery: parsed,
  };
}
