import type { CartItem, Product } from '../types';
import { isPackagingProduct } from './packagingMoq';

export type PairingReasonKey =
  | 'pairsWithDates'
  | 'pairsWithNuts'
  | 'pairsWithGiftBox'
  | 'pairsWithPantry'
  | 'pairsWithTea'
  | 'completeBox';

export interface CompleteTheBoxSuggestion {
  product: Product;
  portionLabel: string;
  price: number;
  reasonKey: PairingReasonKey;
}

function normalizePairingCategory(product: Pick<Product, 'id' | 'category' | 'name' | 'name_en'>): string {
  const raw = (product.category || '').trim().toLowerCase();
  const text = `${product.id || ''} ${product.name_en || ''} ${product.name || ''}`.toLowerCase();
  if (raw === 'dates' || /\b(date|dates|ajwa|medjool|mabroom|khajoor|amber\s*date|kalmi|mazafati)\b/.test(text)) {
    return 'dates';
  }
  if (raw === 'nuts' || raw === 'dry-fruits') return 'dry-fruits';
  if (raw === 'seeds-snacks' || raw === 'snacks-seeds') return 'snacks-seeds';
  if (raw === 'combos' || raw === 'deals') return 'bundles';
  if (raw === 'gifts') return 'gift-boxes';
  if (raw === 'bid-boxes' || raw === 'personalized-treats') return 'celebration-boxes';
  return raw;
}

const PAIRING_MATRIX: Record<string, { categories: string[]; reasonKey: PairingReasonKey }> = {
  dates: {
    categories: ['dry-fruits', 'saunf', 'herbal-teas', 'essentials', 'murabba-jaat'],
    reasonKey: 'pairsWithDates',
  },
  'dry-fruits': {
    categories: ['dates', 'essentials', 'saunf', 'murabba-jaat', 'herbal-teas', 'snacks-seeds'],
    reasonKey: 'pairsWithNuts',
  },
  'gift-boxes': {
    categories: ['saunf', 'herbal-teas', 'essentials', 'dates', 'dry-fruits'],
    reasonKey: 'pairsWithGiftBox',
  },
  'celebration-boxes': {
    categories: ['saunf', 'herbal-teas', 'dates', 'dry-fruits', 'essentials'],
    reasonKey: 'pairsWithGiftBox',
  },
  bundles: {
    categories: ['saunf', 'herbal-teas', 'essentials', 'dates', 'murabba-jaat'],
    reasonKey: 'pairsWithGiftBox',
  },
  'herbs-spices': {
    categories: ['essentials', 'herbal-teas', 'oils', 'saunf', 'murabba-jaat'],
    reasonKey: 'pairsWithPantry',
  },
  oils: {
    categories: ['essentials', 'herbs-spices', 'herbal-teas', 'murabba-jaat', 'snacks-seeds'],
    reasonKey: 'pairsWithPantry',
  },
  'murabba-jaat': {
    categories: ['essentials', 'dry-fruits', 'dates', 'herbal-teas', 'saunf'],
    reasonKey: 'pairsWithTea',
  },
  'herbal-teas': {
    categories: ['dates', 'dry-fruits', 'saunf', 'essentials', 'murabba-jaat'],
    reasonKey: 'pairsWithTea',
  },
  saunf: {
    categories: ['herbal-teas', 'dates', 'dry-fruits', 'essentials'],
    reasonKey: 'pairsWithTea',
  },
  'snacks-seeds': {
    categories: ['dates', 'dry-fruits', 'herbal-teas', 'essentials'],
    reasonKey: 'pairsWithNuts',
  },
  essentials: {
    categories: ['dry-fruits', 'dates', 'herbal-teas', 'murabba-jaat', 'saunf'],
    reasonKey: 'pairsWithPantry',
  },
};

function parseUnitAmount(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Returns the smallest available canonical retail portion and price for a product.
 * Never invents or alters prices — reads strictly from `product.prices`.
 */
export function pickStarterPortion(product: Product): { label: string; price: number } | null {
  if (!product.prices || typeof product.prices !== 'object') return null;
  const disabled = new Set(
    (product.variants || [])
      .filter((v) => v.available === false)
      .map((v) => v.label),
  );

  const candidates = Object.entries(product.prices)
    .filter(([label, amount]) => {
      if (disabled.has(label)) return false;
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return false;
      if (/^empty\b/i.test(label.trim())) return false;
      return true;
    })
    .sort((a, b) => a[1] - b[1]);

  if (candidates.length === 0) return null;
  return { label: candidates[0][0], price: candidates[0][1] };
}

function isPublishedRetailCandidate(product: Product): boolean {
  if (product.active === false) return false;
  if (product.status === 'draft' || product.status === 'archived') return false;
  if (product.quoteOnly || product.orderMode === 'inquiry_quote') return false;
  if (product.isBidBox || isPackagingProduct(product)) return false;
  if (product.category === 'celebration-boxes') return false;
  return true;
}

export function computeSuggestionBudgetCap(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 2200;
  return Math.max(1500, Math.min(4500, Math.round(subtotal * 0.65)));
}

export function getCompleteTheBoxSuggestions(
  cartItems: CartItem[],
  products: Product[],
  options: { maxItems?: number; subtotal?: number } = {},
): CompleteTheBoxSuggestion[] {
  const maxItems = Math.max(1, Math.min(3, options.maxItems ?? 2));
  if (!Array.isArray(cartItems) || cartItems.length === 0 || !Array.isArray(products) || products.length === 0) {
    return [];
  }

  const productById = new Map<string, Product>();
  for (const product of products) {
    productById.set(product.id, product);
  }

  // Collect IDs already in bag (plus bundle components so we never suggest something already inside their bundle)
  const excludedIds = new Set<string>();
  const cartCategories = new Set<string>();
  let computedSubtotal = 0;

  for (const item of cartItems) {
    const baseId = item.productId || item.id;
    excludedIds.add(baseId);
    excludedIds.add(item.id);
    const matched =
      productById.get(baseId) ||
      products.find((p) => item.id === p.id || item.id.startsWith(`${p.id}-`));
    if (matched) {
      excludedIds.add(matched.id);
      const normCat = normalizePairingCategory(matched);
      if (normCat) cartCategories.add(normCat);
      if (Array.isArray(matched.componentIds)) {
        for (const compId of matched.componentIds) excludedIds.add(compId);
      }
    }
    const unit = parseUnitAmount(item.unitPrice ?? item.price);
    computedSubtotal += unit * Math.max(1, item.quantity || 1);
  }

  const subtotal = typeof options.subtotal === 'number' && options.subtotal > 0 ? options.subtotal : computedSubtotal;
  const budgetCap = computeSuggestionBudgetCap(subtotal);

  // Build weighted category priority from everything in the cart
  const categoryScore = new Map<string, { score: number; reasonKey: PairingReasonKey }>();
  for (const cat of cartCategories) {
    const rule = PAIRING_MATRIX[cat];
    if (!rule) continue;
    rule.categories.forEach((targetCat, idx) => {
      const bonus = (rule.categories.length - idx) * 10;
      const existing = categoryScore.get(targetCat);
      if (!existing || bonus > existing.score) {
        categoryScore.set(targetCat, {
          score: (existing?.score || 0) + bonus,
          reasonKey: rule.reasonKey,
        });
      }
    });
  }

  interface ScoredCandidate {
    product: Product;
    portionLabel: string;
    price: number;
    reasonKey: PairingReasonKey;
    score: number;
    inBudget: boolean;
  }

  const scored: ScoredCandidate[] = [];

  for (const product of products) {
    if (excludedIds.has(product.id)) continue;
    if (!isPublishedRetailCandidate(product)) continue;

    const starter = pickStarterPortion(product);
    if (!starter) continue;

    const candidateCat = normalizePairingCategory(product);
    const inBudget = starter.price <= budgetCap;
    const catMatch = categoryScore.get(candidateCat);
    let score = catMatch ? catMatch.score : 0;

    // Avoid suggesting exact same category if other complementary categories exist
    if (cartCategories.has(candidateCat)) {
      score -= 12;
    }

    // Strongly prefer items within the customer's bag budget
    if (inBudget) {
      score += 40;
    } else if (starter.price <= budgetCap * 1.35) {
      score += 5;
    } else {
      score -= 35;
    }

    // Mild preference for signature non-bundle add-ons that travel well in a box
    if (!product.isBundle && product.category !== 'bundles' && product.category !== 'gift-boxes') {
      score += 8;
    }
    if (product.badge) {
      score += 6;
    }

    // Gentle affordability tie-breaker (prefers neat add-on sizes)
    if (starter.price <= 1500) score += 5;
    else if (starter.price <= 2500) score += 2;

    scored.push({
      product,
      portionLabel: starter.label,
      price: starter.price,
      reasonKey: catMatch ? catMatch.reasonKey : 'completeBox',
      score,
      inBudget,
    });
  }

  // Filter strictly to in-budget items if we have enough, otherwise allow closest affordable complements
  const inBudgetPool = scored.filter((item) => item.inBudget);
  const pool = inBudgetPool.length >= 1 ? inBudgetPool : scored.filter((item) => item.price <= Math.max(budgetCap * 1.5, 3000));

  pool.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.price !== b.price) return a.price - b.price;
    return a.product.id.localeCompare(b.product.id);
  });

  // Pick up to `maxItems`, preferring distinct categories so the two suggestions complement each other too
  const picked: CompleteTheBoxSuggestion[] = [];
  const pickedCategories = new Set<string>();

  for (const candidate of pool) {
    if (picked.length >= maxItems) break;
    const candCat = normalizePairingCategory(candidate.product);
    if (pickedCategories.has(candCat)) continue;
    pickedCategories.add(candCat);
    picked.push({
      product: candidate.product,
      portionLabel: candidate.portionLabel,
      price: candidate.price,
      reasonKey: candidate.reasonKey,
    });
  }

  if (picked.length < maxItems) {
    for (const candidate of pool) {
      if (picked.length >= maxItems) break;
      if (picked.some((entry) => entry.product.id === candidate.product.id)) continue;
      picked.push({
        product: candidate.product,
        portionLabel: candidate.portionLabel,
        price: candidate.price,
        reasonKey: candidate.reasonKey,
      });
    }
  }

  return picked;
}
