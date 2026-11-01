import type { Firestore } from 'firebase-admin/firestore';
import type { Product } from '../types';
import { BID_BOX_PRODUCTS, BID_BOX_PRODUCT_IDS, PRODUCTS } from '../data/products';
import { HAMPER_BOXES, type HamperBox } from './hamperCatalog';
import { HAMPER_BOX_SEEDS } from './hamperBoxSchema';
import { DEFAULT_CATALOG_CONFIGURATION, type CatalogConfiguration } from './catalogConfiguration';
import { readCatalogConfiguration } from './catalogConfigurationRouter';
import { CANONICAL_CATEGORIES, FOOD_CATEGORIES, COMMERCIAL_COLLECTIONS, OCCASION_TAGS, OCCASION_ALIASES } from '../config/categories';
import { resolveAuthoritativeKgRate } from './filledGiftPricing';
import { requiresStoredLegacyPackagingPricing } from './catalogSchema';
import { loadAuthoritativeCatalog, type CatalogSnapshot } from './catalogStore';

export type CatalogHealthIssueSeverity = 'DEFINITE_FAILURE' | 'MERCHANT_JUDGMENT';

export type CatalogHealthIssueCode =
  | 'MISSING_STORED_RECORD'
  | 'MISSING_STORED_HAMPER_BOX'
  | 'MISSING_1KG_RATE'
  | 'INVALID_RECIPE_REFERENCE'
  | 'INVALID_RECIPE_GRAMS'
  | 'RECIPE_INGREDIENT_MISSING_KG_RATE'
  | 'MISSING_FILLED_RECIPE'
  | 'ORPHAN_CATEGORY'
  | 'ORPHAN_OCCASION'
  | 'ORPHAN_COLLECTION'
  | 'MISSING_REQUIRED_NAME'
  | 'ZERO_PRICE_ON_STANDARD'
  | 'MISSING_MEDIA'
  | 'COPY_FACT_DISCREPANCY';

export interface CatalogHealthIssue {
  itemId: string;
  itemType: 'product' | 'hamperBox' | 'taxonomy' | 'settings';
  code: CatalogHealthIssueCode;
  severity: CatalogHealthIssueSeverity;
  message: string;
  details?: Record<string, unknown>;
}

export interface CatalogHealthSummary {
  totalProductsScanned: number;
  totalHamperBoxesScanned: number;
  definiteFailuresCount: number;
  merchantJudgmentCount: number;
  issuesByCode: Record<string, number>;
  issuesBySeverity: Record<CatalogHealthIssueSeverity, number>;
}

export interface CatalogHealthReport {
  generatedAt: string;
  source: 'firestore_live' | 'firestore_memory' | 'snapshot_fixture' | 'default_static';
  summary: CatalogHealthSummary;
  issues: CatalogHealthIssue[];
  actionableItems: {
    definiteFailures: string[];
    merchantJudgments: string[];
  };
}

export interface CatalogHealthInput {
  products: Product[];
  hamperBoxes?: HamperBox[];
  config?: CatalogConfiguration;
  storedProductDocIds?: Set<string> | string[];
  storedHamperBoxDocIds?: Set<string> | string[];
  source?: 'firestore_live' | 'firestore_memory' | 'snapshot_fixture' | 'default_static';
  now?: number | string;
}

const FOOD_CATEGORY_IDS = new Set([
  'nuts',
  'dry-fruits',
  'seeds-snacks',
  'herbs-spices',
  'dates',
  'essentials',
  'oils',
]);

const KNOWN_OCCASIONS = new Set([
  ...OCCASION_TAGS.map(o => o.id),
  ...Object.keys(OCCASION_ALIASES),
]);

const KNOWN_COLLECTIONS = new Set([
  ...Object.keys(COMMERCIAL_COLLECTIONS),
  'combos',
  'gift-boxes',
  'bundles',
  'deals',
  'celebration-boxes',
  'personalized-treats',
]);

function buildValidCategoryIds(config?: CatalogConfiguration): Set<string> {
  const ids = new Set<string>([
    ...Object.keys(CANONICAL_CATEGORIES),
    ...Object.keys(FOOD_CATEGORIES),
    ...Object.keys(COMMERCIAL_COLLECTIONS),
    'gift-boxes',
    'bundles',
    'deals',
    'celebration-boxes',
  ]);
  if (config?.taxonomy) {
    for (const entry of config.taxonomy) {
      if (entry.type === 'category' || entry.type === 'collection') {
        ids.add(entry.id);
      }
    }
  }
  return ids;
}

/**
 * Pure, bounded, read-only generator for Catalog Health Reports (M34 Foundation).
 * Inspects authoritative products, hamper boxes, and taxonomy against schema, business rules,
 * 1kg rates for custom-weight/filled hampers, media references, and verified facts.
 * Deliberately contains zero customer PII, zero credentials, and executes zero mutations.
 */
export function generateCatalogHealthReport(input: CatalogHealthInput): CatalogHealthReport {
  const {
    products,
    hamperBoxes = HAMPER_BOX_SEEDS,
    config = DEFAULT_CATALOG_CONFIGURATION,
    source = 'default_static',
    now = new Date().toISOString(),
  } = input;

  const storedProdIds = input.storedProductDocIds
    ? (input.storedProductDocIds instanceof Set ? input.storedProductDocIds : new Set(input.storedProductDocIds))
    : undefined;

  const storedBoxIds = input.storedHamperBoxDocIds
    ? (input.storedHamperBoxDocIds instanceof Set ? input.storedHamperBoxDocIds : new Set(input.storedHamperBoxDocIds))
    : undefined;

  const issues: CatalogHealthIssue[] = [];
  const validCategoryIds = buildValidCategoryIds(config);
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));

  // Find all products referenced in any recipe across the entire catalog
  const referencedIngredientIds = new Set<string>();
  for (const product of products) {
    if (Array.isArray(product.recipeIngredients)) {
      for (const ing of product.recipeIngredients) {
        if (ing?.productId) referencedIngredientIds.add(ing.productId);
      }
    }
    if (product.filledRecipes && typeof product.filledRecipes === 'object') {
      for (const recipeList of Object.values(product.filledRecipes)) {
        if (Array.isArray(recipeList)) {
          for (const ing of recipeList) {
            if (ing?.productId) referencedIngredientIds.add(ing.productId);
          }
        }
      }
    }
  }

  // 1. Authoritative Firestore Persistence Audit (Missing Records)
  if (storedProdIds !== undefined) {
    for (const bidBoxId of BID_BOX_PRODUCT_IDS) {
      if (!storedProdIds.has(bidBoxId)) {
        const requiresStored = requiresStoredLegacyPackagingPricing(bidBoxId);
        issues.push({
          itemId: bidBoxId,
          itemType: 'product',
          code: 'MISSING_STORED_RECORD',
          severity: requiresStored ? 'DEFINITE_FAILURE' : 'MERCHANT_JUDGMENT',
          message: requiresStored
            ? `Celebration box '${bidBoxId}' has legacy long labels and is absent from Firestore products; it is held unavailable (503/active: false) until persisted.`
            : `Celebration box '${bidBoxId}' is absent from Firestore products and relies on compiled seed fallback; admin edits will fail with 409 MISSING_CATALOG_PRODUCT.`,
          details: { bidBoxId, requiresStoredLegacyPackagingPricing: requiresStored },
        });
      }
    }
  }

  if (storedBoxIds !== undefined) {
    for (const box of HAMPER_BOX_SEEDS) {
      if (!storedBoxIds.has(box.id)) {
        issues.push({
          itemId: box.id,
          itemType: 'hamperBox',
          code: 'MISSING_STORED_HAMPER_BOX',
          severity: 'DEFINITE_FAILURE',
          message: `Hamper box '${box.id}' is absent from Firestore hamperBoxes collection; loadAuthoritativeCatalog forces price=0, active=false, disabling custom hampers.`,
          details: { boxId: box.id, referencePrice: box.price },
        });
      }
    }
  }

  // 2. Hamper Box Integrity
  for (const box of hamperBoxes) {
    if (!box.name_en || !box.name_en.trim()) {
      issues.push({
        itemId: box.id,
        itemType: 'hamperBox',
        code: 'MISSING_REQUIRED_NAME',
        severity: 'DEFINITE_FAILURE',
        message: `Hamper box '${box.id}' is missing English name.`,
      });
    }
    if (box.active !== false && (!box.price || box.price <= 0)) {
      issues.push({
        itemId: box.id,
        itemType: 'hamperBox',
        code: 'ZERO_PRICE_ON_STANDARD',
        severity: 'DEFINITE_FAILURE',
        message: `Active hamper box '${box.id}' has non-positive price (${box.price}).`,
      });
    }
    if (!box.image || typeof box.image !== 'string' || !box.image.trim()) {
      issues.push({
        itemId: box.id,
        itemType: 'hamperBox',
        code: 'MISSING_MEDIA',
        severity: 'MERCHANT_JUDGMENT',
        message: `Hamper box '${box.id}' has missing or empty image.`,
      });
    }
  }

  // 3. Product Integrity Audits
  for (const product of products) {
    const isPackaging = product.category === 'celebration-boxes' || product.isBidBox || product.commerce?.kind === 'packaging';
    const isQuoteOnly = product.quoteOnly === true || product.orderMode === 'inquiry_quote';
    const isFood = FOOD_CATEGORY_IDS.has(product.category) || product.commerce?.kind === 'food';

    // 3a. Required Name
    if (!product.name_en || !product.name_en.trim()) {
      issues.push({
        itemId: product.id,
        itemType: 'product',
        code: 'MISSING_REQUIRED_NAME',
        severity: 'DEFINITE_FAILURE',
        message: `Product '${product.id}' has missing or empty English name.`,
      });
    }

    // 3b. Standard Pricing
    if (!isQuoteOnly && product.active !== false && product.status !== 'draft' && product.status !== 'archived') {
      const prices = product.prices ? Object.values(product.prices) : [];
      const variants = product.variants ? product.variants.map(v => v.price) : [];
      const hasPositivePrice = (product.price && product.price > 0) ||
        prices.some(p => typeof p === 'number' && p > 0) ||
        variants.some(p => typeof p === 'number' && p > 0);

      if (!hasPositivePrice) {
        issues.push({
          itemId: product.id,
          itemType: 'product',
          code: 'ZERO_PRICE_ON_STANDARD',
          severity: 'DEFINITE_FAILURE',
          message: `Active standard product '${product.id}' has no positive price configured.`,
        });
      }
    }

    // 3c. 1kg Selling Rate Audit (for filled gifts, custom hampers, and custom weight)
    const kgRate = resolveAuthoritativeKgRate(product);
    const isReferencedInRecipe = referencedIngredientIds.has(product.id);
    const allowsCustom = product.allowCustomWeight === true;

    if (kgRate === null && isFood) {
      if (allowsCustom || isReferencedInRecipe) {
        issues.push({
          itemId: product.id,
          itemType: 'product',
          code: 'MISSING_1KG_RATE',
          severity: 'DEFINITE_FAILURE',
          message: allowsCustom
            ? `Food product '${product.id}' allows custom weight but has no explicit 1kg selling rate; custom weight pricing will fail.`
            : `Food product '${product.id}' is referenced in a gift recipe but has no explicit 1kg selling rate; recipe estimation will fail.`,
          details: { allowsCustom, isReferencedInRecipe },
        });
      } else if (product.active !== false && product.status === 'published') {
        issues.push({
          itemId: product.id,
          itemType: 'product',
          code: 'MISSING_1KG_RATE',
          severity: 'MERCHANT_JUDGMENT',
          message: `Published food product '${product.id}' has no explicit 1kg selling rate; it cannot be selected as an ingredient for custom hampers or custom weight without a merchant quote.`,
        });
      }
    }

    // 3d. Recipe and Ingredient Integrity
    const auditRecipeList = (recipe: unknown[], labelContext?: string) => {
      for (const item of recipe) {
        if (!item || typeof item !== 'object') {
          issues.push({
            itemId: product.id,
            itemType: 'product',
            code: 'INVALID_RECIPE_REFERENCE',
            severity: 'DEFINITE_FAILURE',
            message: `Product '${product.id}' has malformed recipe entry in ${labelContext || 'default recipe'}.`,
          });
          continue;
        }
        const { productId, grams } = item as { productId?: string; grams?: number };
        if (!productId || typeof productId !== 'string') {
          issues.push({
            itemId: product.id,
            itemType: 'product',
            code: 'INVALID_RECIPE_REFERENCE',
            severity: 'DEFINITE_FAILURE',
            message: `Product '${product.id}' has recipe item with missing productId in ${labelContext || 'default recipe'}.`,
          });
          continue;
        }

        const ingredientProd = productMap.get(productId);
        if (!ingredientProd) {
          issues.push({
            itemId: product.id,
            itemType: 'product',
            code: 'INVALID_RECIPE_REFERENCE',
            severity: 'DEFINITE_FAILURE',
            message: `Product '${product.id}' references nonexistent ingredient '${productId}' in ${labelContext || 'default recipe'}.`,
            details: { ingredientId: productId },
          });
        } else {
          if (ingredientProd.active === false || ingredientProd.status === 'archived') {
            issues.push({
              itemId: product.id,
              itemType: 'product',
              code: 'INVALID_RECIPE_REFERENCE',
              severity: 'DEFINITE_FAILURE',
              message: `Product '${product.id}' references inactive/archived ingredient '${productId}' in ${labelContext || 'default recipe'}.`,
              details: { ingredientId: productId, active: ingredientProd.active, status: ingredientProd.status },
            });
          }
          const ingKgRate = resolveAuthoritativeKgRate(ingredientProd);
          if (ingKgRate === null) {
            issues.push({
              itemId: product.id,
              itemType: 'product',
              code: 'RECIPE_INGREDIENT_MISSING_KG_RATE',
              severity: 'DEFINITE_FAILURE',
              message: `Product '${product.id}' references ingredient '${productId}' which lacks an authoritative 1kg rate in ${labelContext || 'default recipe'}.`,
              details: { ingredientId: productId },
            });
          }
        }

        if (typeof grams !== 'number' || !Number.isFinite(grams) || grams <= 0 || grams > 10_000) {
          issues.push({
            itemId: product.id,
            itemType: 'product',
            code: 'INVALID_RECIPE_GRAMS',
            severity: 'DEFINITE_FAILURE',
            message: `Product '${product.id}' has invalid ingredient weight (${grams}g) for '${productId}' in ${labelContext || 'default recipe'}.`,
            details: { ingredientId: productId, grams },
          });
        }
      }
    };

    if (Array.isArray(product.recipeIngredients) && product.recipeIngredients.length > 0) {
      auditRecipeList(product.recipeIngredients, 'default recipe');
    }

    if (product.filledRecipes && typeof product.filledRecipes === 'object') {
      for (const [variantLabel, recipe] of Object.entries(product.filledRecipes)) {
        if (Array.isArray(recipe)) {
          auditRecipeList(recipe, `variant '${variantLabel}'`);
        }
      }
    }

    // 3e. Packaging Recipe Completeness
    if (isPackaging) {
      const hasFilledVariants = (product.variants || []).some(v => /filled/i.test(v.label)) ||
        Object.keys(product.prices || {}).some(label => /filled/i.test(label)) ||
        product.orderMode === 'both';

      const hasAnyRecipe = (Array.isArray(product.recipeIngredients) && product.recipeIngredients.length > 0) ||
        (product.filledRecipes && Object.keys(product.filledRecipes).length > 0);

      if (hasFilledVariants && !hasAnyRecipe) {
        issues.push({
          itemId: product.id,
          itemType: 'product',
          code: 'MISSING_FILLED_RECIPE',
          severity: 'MERCHANT_JUDGMENT',
          message: `Packaging product '${product.id}' offers filled options but has no configured recipe; custom inquiries will require manual quotes.`,
        });
      }
    }

    // 3f. Taxonomy & Category Integrity
    if (!product.category || !validCategoryIds.has(product.category)) {
      issues.push({
        itemId: product.id,
        itemType: 'product',
        code: 'ORPHAN_CATEGORY',
        severity: 'DEFINITE_FAILURE',
        message: `Product '${product.id}' has unconfigured or orphan category '${product.category}'.`,
        details: { category: product.category },
      });
    }

    if (Array.isArray(product.occasions)) {
      for (const occ of product.occasions) {
        if (!KNOWN_OCCASIONS.has(occ.trim().toLowerCase())) {
          issues.push({
            itemId: product.id,
            itemType: 'product',
            code: 'ORPHAN_OCCASION',
            severity: 'MERCHANT_JUDGMENT',
            message: `Product '${product.id}' has unrecognized occasion tag '${occ}'.`,
            details: { occasion: occ },
          });
        }
      }
    }

    if (Array.isArray(product.collections)) {
      for (const col of product.collections) {
        if (!KNOWN_COLLECTIONS.has(col.trim().toLowerCase())) {
          issues.push({
            itemId: product.id,
            itemType: 'product',
            code: 'ORPHAN_COLLECTION',
            severity: 'MERCHANT_JUDGMENT',
            message: `Product '${product.id}' has unrecognized collection '${col}'.`,
            details: { collection: col },
          });
        }
      }
    }

    // 3g. Media Integrity
    const hasImage = typeof product.image === 'string' && product.image.trim().length > 0;
    if (!hasImage) {
      const isPublishedRetail = product.active !== false && product.status === 'published' && !isPackaging;
      issues.push({
        itemId: product.id,
        itemType: 'product',
        code: 'MISSING_MEDIA',
        severity: isPublishedRetail ? 'DEFINITE_FAILURE' : 'MERCHANT_JUDGMENT',
        message: `Product '${product.id}' has no primary image configured.`,
      });
    } else if (
      !product.image!.startsWith('/') &&
      !product.image!.startsWith('https://') &&
      !product.image!.startsWith('http://') &&
      !product.image!.startsWith('data:')
    ) {
      issues.push({
        itemId: product.id,
        itemType: 'product',
        code: 'MISSING_MEDIA',
        severity: 'DEFINITE_FAILURE',
        message: `Product '${product.id}' has invalid image URL format: '${product.image}'.`,
        details: { image: product.image },
      });
    }

    // 3h. Verified Claims / Copy Discrepancies
    if (product.id === 'ajwa-dates') {
      const desc = `${product.desc_en || ''} ${product.origin_en || ''}`.toLowerCase();
      if (desc.includes('muzafati') || desc.includes('iran')) {
        issues.push({
          itemId: product.id,
          itemType: 'product',
          code: 'COPY_FACT_DISCREPANCY',
          severity: 'MERCHANT_JUDGMENT',
          message: `Product 'ajwa-dates' copy mentions 'Muzafati' or 'Iran'; authentic Ajwa dates originate from Madinah, Saudi Arabia.`,
        });
      }
    } else if (product.id === 'medjool-dates') {
      const desc = `${product.desc_en || ''} ${product.origin_en || ''}`.toLowerCase();
      if (desc.includes('panjgur') || desc.includes('amber')) {
        issues.push({
          itemId: product.id,
          itemType: 'product',
          code: 'COPY_FACT_DISCREPANCY',
          severity: 'MERCHANT_JUDGMENT',
          message: `Product 'medjool-dates' copy mentions 'Panjgur Amber'; Medjool variety should have distinct, verified harvest provenance.`,
        });
      }
    }
  }

  // Summary aggregation
  const issuesByCode: Record<string, number> = {};
  const issuesBySeverity: Record<CatalogHealthIssueSeverity, number> = {
    DEFINITE_FAILURE: 0,
    MERCHANT_JUDGMENT: 0,
  };
  const definiteFailureItemIds = new Set<string>();
  const merchantJudgmentItemIds = new Set<string>();

  for (const issue of issues) {
    issuesByCode[issue.code] = (issuesByCode[issue.code] || 0) + 1;
    issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
    if (issue.severity === 'DEFINITE_FAILURE') {
      definiteFailureItemIds.add(issue.itemId);
    } else {
      merchantJudgmentItemIds.add(issue.itemId);
    }
  }

  const generatedAt = typeof now === 'number' ? new Date(now).toISOString() : String(now);

  return {
    generatedAt,
    source,
    summary: {
      totalProductsScanned: products.length,
      totalHamperBoxesScanned: hamperBoxes.length,
      definiteFailuresCount: issuesBySeverity.DEFINITE_FAILURE,
      merchantJudgmentCount: issuesBySeverity.MERCHANT_JUDGMENT,
      issuesByCode,
      issuesBySeverity,
    },
    issues,
    actionableItems: {
      definiteFailures: Array.from(definiteFailureItemIds).sort(),
      merchantJudgments: Array.from(merchantJudgmentItemIds).sort(),
    },
  };
}

/**
 * Async audit execution that connects to an active Firestore instance (or memory fixture)
 * to evaluate live/memory document presence against snapshot projections.
 */
export async function runCatalogHealthAudit(
  db: Firestore | null = null,
  options: { source?: string; now?: number } = {}
): Promise<CatalogHealthReport> {
  const now = options.now ?? Date.now();
  if (!db) {
    return generateCatalogHealthReport({
      products: PRODUCTS,
      hamperBoxes: HAMPER_BOX_SEEDS,
      config: DEFAULT_CATALOG_CONFIGURATION,
      source: 'default_static',
      now,
    });
  }

  let storedProductDocIds: Set<string>;
  let storedHamperBoxDocIds: Set<string>;
  try {
    const [prodSnap, boxSnap] = await Promise.all([
      db.collection('products').get(),
      db.collection('hamperBoxes').get(),
    ]);
    storedProductDocIds = new Set(prodSnap.docs.map(doc => doc.id));
    storedHamperBoxDocIds = new Set(boxSnap.docs.map(doc => doc.id));
  } catch {
    storedProductDocIds = new Set();
    storedHamperBoxDocIds = new Set();
  }

  const snapshot: CatalogSnapshot = await loadAuthoritativeCatalog(db, { fresh: true, now });
  let config: CatalogConfiguration = DEFAULT_CATALOG_CONFIGURATION;
  try {
    config = await readCatalogConfiguration(db);
  } catch {
    config = DEFAULT_CATALOG_CONFIGURATION;
  }

  const resolvedSource = options.source as CatalogHealthReport['source'] ||
    (typeof (db as any).__allbarka_memory === 'boolean' || !(db as any).projectId ? 'firestore_memory' : 'firestore_live');

  return generateCatalogHealthReport({
    products: snapshot.products,
    hamperBoxes: snapshot.hamperBoxes,
    config,
    storedProductDocIds,
    storedHamperBoxDocIds,
    source: resolvedSource,
    now,
  });
}
