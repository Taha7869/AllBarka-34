import fs from 'node:fs';
import path from 'node:path';
import type { Firestore } from 'firebase-admin/firestore';
import type { Product, ProductStatus, OrderMode } from '../types';
import { BID_BOX_PRODUCTS, BID_BOX_PRODUCT_IDS, PRODUCTS } from '../data/products';
import { HAMPER_BOX_SEEDS } from './hamperBoxSchema';
import { type HamperBox } from './hamperCatalog';
import { DEFAULT_CATALOG_CONFIGURATION, type CatalogConfiguration } from './catalogConfiguration';
import { readCatalogConfiguration } from './catalogConfigurationRouter';
import { CANONICAL_CATEGORIES, FOOD_CATEGORIES, COMMERCIAL_COLLECTIONS, OCCASION_TAGS, OCCASION_ALIASES } from '../config/categories';
import { resolveAuthoritativeKgRate } from './filledGiftPricing';
import { requiresStoredLegacyPackagingPricing } from './catalogSchema';
import { loadAuthoritativeCatalog, type CatalogSnapshot } from './catalogStore';
import { supportsCustomWeight } from './productVariants';

export type CatalogHealthIssueSeverity = 'DEFINITE_FAILURE' | 'MERCHANT_JUDGMENT';

export type CatalogHealthIssueCode =
  | 'MISSING_STORED_RECORD'
  | 'MISSING_STORED_HAMPER_BOX'
  | 'STORE_READ_UNAVAILABLE'
  | 'CONFIG_READ_UNAVAILABLE'
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
  | 'COPY_FACT_DISCREPANCY'
  | 'UNVERIFIED_CERTIFICATION_CLAIM'
  | 'DISCREPANT_CLAIMS'
  | 'MISSING_ALLERGEN_ADVISORY';

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

export interface CatalogHealthProvenance {
  snapshotFile?: string;
  description?: string;
  revision?: string | number;
  timestamp?: string;
  kind?: 'historical_audit' | 'catalog_export' | 'projection_fixture' | 'default_static' | 'live_firestore';
  scope?: {
    productSource?: 'observed_audit' | 'catalog_export' | 'projection_fixture' | 'compiled_reference';
    storedProductsAudited?: boolean;
    storedHamperBoxesAudited?: boolean;
    recipesAudited?: boolean;
    mediaAudited?: boolean;
    pricingAudited?: boolean;
  };
  notes?: string;
}

export interface CatalogHealthReport {
  generatedAt: string;
  source: 'firestore_live' | 'firestore_memory' | 'snapshot_fixture' | 'default_static';
  provenance?: CatalogHealthProvenance;
  readStatus: {
    products: 'CONFIRMED' | 'UNREADABLE' | 'NOT_AUDITED';
    hamperBoxes: 'CONFIRMED' | 'UNREADABLE' | 'NOT_AUDITED';
    config: 'CONFIRMED' | 'UNREADABLE_FALLBACK_DEFAULT' | 'STATIC_DEFAULT';
  };
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
  configReadStatus?: 'CONFIRMED' | 'UNREADABLE_FALLBACK_DEFAULT' | 'STATIC_DEFAULT';
  storedProductDocIds?: Set<string> | string[];
  storedProductReadStatus?: 'CONFIRMED' | 'UNREADABLE' | 'NOT_AUDITED';
  storedHamperBoxDocIds?: Set<string> | string[];
  storedHamperBoxReadStatus?: 'CONFIRMED' | 'UNREADABLE' | 'NOT_AUDITED';
  source?: 'firestore_live' | 'firestore_memory' | 'snapshot_fixture' | 'default_static';
  now?: number | string;
  recipesAudited?: boolean;
  mediaAudited?: boolean;
  provenance?: CatalogHealthProvenance;
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
        ids.add(entry.id.toLowerCase());
      }
    }
  }
  return ids;
}

function buildValidOccasionIds(config?: CatalogConfiguration): Set<string> {
  const ids = new Set<string>([
    ...OCCASION_TAGS.map(o => o.id.toLowerCase()),
    ...Object.keys(OCCASION_ALIASES).map(k => k.toLowerCase()),
  ]);
  if (config?.taxonomy) {
    for (const entry of config.taxonomy) {
      if (entry.type === 'occasion') {
        ids.add(entry.id.toLowerCase());
      }
    }
  }
  return ids;
}

function buildValidCollectionIds(config?: CatalogConfiguration): Set<string> {
  const ids = new Set<string>([
    ...Object.keys(COMMERCIAL_COLLECTIONS).map(k => k.toLowerCase()),
    'combos',
    'gift-boxes',
    'bundles',
    'deals',
    'celebration-boxes',
    'personalized-treats',
  ]);
  if (config?.taxonomy) {
    for (const entry of config.taxonomy) {
      if (entry.type === 'collection') {
        ids.add(entry.id.toLowerCase());
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
    configReadStatus = 'STATIC_DEFAULT',
    storedProductReadStatus = input.storedProductReadStatus ?? (input.storedProductDocIds !== undefined ? 'CONFIRMED' : 'NOT_AUDITED'),
    storedHamperBoxReadStatus = input.storedHamperBoxReadStatus ?? (input.storedHamperBoxDocIds !== undefined ? 'CONFIRMED' : 'NOT_AUDITED'),
    source = 'default_static',
    provenance,
    now = new Date().toISOString(),
    recipesAudited = input.provenance?.scope?.recipesAudited ?? (input.recipesAudited ?? true),
    mediaAudited = input.provenance?.scope?.mediaAudited ?? (input.mediaAudited ?? true),
  } = input;

  const storedProdIds = input.storedProductDocIds
    ? (input.storedProductDocIds instanceof Set ? input.storedProductDocIds : new Set(input.storedProductDocIds))
    : undefined;

  const storedBoxIds = input.storedHamperBoxDocIds
    ? (input.storedHamperBoxDocIds instanceof Set ? input.storedHamperBoxDocIds : new Set(input.storedHamperBoxDocIds))
    : undefined;

  const issues: CatalogHealthIssue[] = [];
  const validCategoryIds = buildValidCategoryIds(config);
  const validOccasionIds = buildValidOccasionIds(config);
  const validCollectionIds = buildValidCollectionIds(config);
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));

  // Record read-status notices if database reads failed (preventing false missing doc accusations)
  if (storedProductReadStatus === 'UNREADABLE') {
    issues.push({
      itemId: 'products_collection',
      itemType: 'settings',
      code: 'STORE_READ_UNAVAILABLE',
      severity: 'MERCHANT_JUDGMENT',
      message: 'Firestore products collection could not be read; stored document presence is unverified rather than confirmed missing.',
    });
  }

  if (storedHamperBoxReadStatus === 'UNREADABLE') {
    issues.push({
      itemId: 'hamperBoxes_collection',
      itemType: 'settings',
      code: 'STORE_READ_UNAVAILABLE',
      severity: 'MERCHANT_JUDGMENT',
      message: 'Firestore hamperBoxes collection could not be read; stored document presence is unverified rather than confirmed missing.',
    });
  }

  if (configReadStatus === 'UNREADABLE_FALLBACK_DEFAULT') {
    issues.push({
      itemId: 'catalogSettings_main',
      itemType: 'settings',
      code: 'CONFIG_READ_UNAVAILABLE',
      severity: 'MERCHANT_JUDGMENT',
      message: 'catalogSettings/main could not be read; fell back to default catalog configuration rather than confirmed live settings.',
    });
  }

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

  // 1. Authoritative Firestore Persistence Audit (Only when collection was confirmed read)
  if (storedProductReadStatus === 'CONFIRMED' && storedProdIds !== undefined) {
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

  if (storedHamperBoxReadStatus === 'CONFIRMED' && storedBoxIds !== undefined) {
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
      const rawRow = product as unknown as Record<string, unknown>;
      const hasPositivePrice = (product.price && product.price > 0) ||
        prices.some(p => typeof p === 'number' && p > 0) ||
        variants.some(p => typeof p === 'number' && p > 0) ||
        (typeof rawRow.variantsCount === 'number' && rawRow.variantsCount > 0) ||
        (typeof rawRow.pricesCount === 'number' && rawRow.pricesCount > 0);

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

    // 3c. 1kg Selling Rate & Retail Custom Weight Integrity
    const kgRate = resolveAuthoritativeKgRate(product);
    const isReferencedInRecipe = referencedIngredientIds.has(product.id);
    const allowsCustom = product.allowCustomWeight === true;
    const retailCustomSupported = supportsCustomWeight(product);

    if (allowsCustom && isFood) {
      if (!product.pricePer100g || product.pricePer100g <= 0) {
        if (!product.commerce?.custom) {
          issues.push({
            itemId: product.id,
            itemType: 'product',
            code: 'ZERO_PRICE_ON_STANDARD',
            severity: 'DEFINITE_FAILURE',
            message: `Food product '${product.id}' allows custom weight but lacks a positive pricePer100g for retail custom weight.`,
          });
        }
      }
    }

    if (kgRate === null && isFood) {
      if (isReferencedInRecipe) {
        issues.push({
          itemId: product.id,
          itemType: 'product',
          code: 'RECIPE_INGREDIENT_MISSING_KG_RATE',
          severity: 'DEFINITE_FAILURE',
          message: `Food product '${product.id}' is referenced in a gift recipe but has no authoritative 1kg selling rate; recipe estimation will fail.`,
          details: { isReferencedInRecipe },
        });
      } else if (product.active !== false && product.status === 'published') {
        issues.push({
          itemId: product.id,
          itemType: 'product',
          code: 'MISSING_1KG_RATE',
          severity: 'MERCHANT_JUDGMENT',
          message: `Published food product '${product.id}' has no explicit 1kg selling rate. Standalone retail custom weight is ${retailCustomSupported ? 'functional via pricePer100g' : 'unavailable'}, but it cannot be estimated as an ingredient for custom hampers or filled gift recipes without an explicit 1kg rate.`,
          details: { allowsCustom, retailCustomSupported, pricePer100g: product.pricePer100g },
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

    if (recipesAudited) {
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
    }

    // 3f. Taxonomy & Category Integrity
    if (!product.category || !validCategoryIds.has(product.category.toLowerCase())) {
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
        if (!validOccasionIds.has(occ.trim().toLowerCase())) {
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
        if (!validCollectionIds.has(col.trim().toLowerCase())) {
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
    if (mediaAudited) {
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

    // 3i. M33 / M34 Verified Claims & Content Readiness Audit
    if (product.passport?.certifications && product.passport.certifications.length > 0) {
      const status = product.claimsVerification?.status;
      if (status !== 'verified') {
        issues.push({
          itemId: product.id,
          itemType: 'product',
          code: 'UNVERIFIED_CERTIFICATION_CLAIM',
          severity: 'MERCHANT_JUDGMENT',
          message: `Product '${product.id}' lists certifications (${product.passport.certifications.join(', ')}) but claimsVerification status is '${status || 'unverified'}'.`,
          details: { certifications: product.passport.certifications, claimsVerification: product.claimsVerification },
        });
      }
    }
    if (product.claimsVerification?.status === 'discrepant') {
      issues.push({
        itemId: product.id,
        itemType: 'product',
        code: 'DISCREPANT_CLAIMS',
        severity: 'MERCHANT_JUDGMENT',
        message: `Product '${product.id}' has claimsVerification marked as 'discrepant': ${product.claimsVerification.notes || 'Internal audit discrepancy'}.`,
        details: { notes: product.claimsVerification.notes },
      });
    }
    if (product.active !== false && product.status === 'published' && !isPackaging) {
      const hasAllergenInfo = Boolean(
        (product.passport?.allergens && product.passport.allergens.length > 0) ||
        (product.allergenWarning_en && product.allergenWarning_en.trim().length > 0)
      );
      if (!hasAllergenInfo) {
        issues.push({
          itemId: product.id,
          itemType: 'product',
          code: 'MISSING_ALLERGEN_ADVISORY',
          severity: 'MERCHANT_JUDGMENT',
          message: `Published food product '${product.id}' has no allergen advisory in passport or legacy allergen warning.`,
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
    provenance,
    readStatus: {
      products: storedProductReadStatus,
      hamperBoxes: storedHamperBoxReadStatus,
      config: configReadStatus,
    },
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
 * Loads and validates an explicit offline snapshot/audit file into a CatalogHealthInput.
 * Supports audit reports (like r04-cat1-audit.json) and catalog snapshot exports.
 * Validates input shapes, row types, and derives presence strictly from explicit evidence.
 */
export function loadCatalogHealthSnapshotFile(filePath: string): CatalogHealthInput {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Snapshot file not found at ${resolved}`);
  }
  let raw: any;
  try {
    raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  } catch (err: any) {
    throw new Error(`Malformed snapshot: invalid JSON in ${filePath} (${err?.message || 'unknown error'})`);
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Malformed snapshot: expected top-level JSON object in ${filePath}`);
  }

  // Format 1: Audit report format (e.g. r04-cat1-audit.json)
  if (raw.perProductAudit !== undefined) {
    if (!Array.isArray(raw.perProductAudit)) {
      throw new Error(`Malformed snapshot in ${filePath}: 'perProductAudit' must be an array`);
    }

    const observedProducts: Product[] = [];
    const storedProductDocIds = new Set<string>();
    let hasStoredProductAuditing = false;

    for (let i = 0; i < raw.perProductAudit.length; i++) {
      const row = raw.perProductAudit[i];
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Malformed snapshot in ${filePath}: perProductAudit row at index ${i} is not an object`);
      }
      if (typeof row.id !== 'string' || !row.id.trim()) {
        throw new Error(`Malformed snapshot in ${filePath}: perProductAudit row at index ${i} is missing valid string 'id'`);
      }

      if (typeof row.inFirestore === 'boolean') {
        hasStoredProductAuditing = true;
        if (row.inFirestore) {
          storedProductDocIds.add(row.id);
        }
      }

      const isPackaging = row.seedCategory === 'celebration-boxes' || row.projectedCategory === 'celebration-boxes' || !!row.packagingSubcategory;

      const p = {
        id: row.id,
        name_en: typeof row.name_en === 'string' ? row.name_en : '',
        name_ur: typeof row.name_ur === 'string' ? row.name_ur : '',
        name_ar: typeof row.name_ar === 'string' ? row.name_ar : '',
        name: typeof row.name_en === 'string' ? row.name_en : '',
        image: typeof row.image === 'string' ? row.image : null,
        imageName: typeof row.imageName === 'string' ? row.imageName : null,
        active: typeof row.firestoreActive === 'boolean'
          ? row.firestoreActive
          : typeof row.projectedActive === 'boolean'
            ? row.projectedActive
            : undefined,
        status: typeof row.firestoreExplicitStatus === 'string' && row.firestoreExplicitStatus
          ? (row.firestoreExplicitStatus as ProductStatus)
          : typeof row.projectedStatus === 'string'
            ? (row.projectedStatus as ProductStatus)
            : undefined,
        category: typeof row.firestoreCategory === 'string' && row.firestoreCategory
          ? row.firestoreCategory
          : typeof row.projectedCategory === 'string' && row.projectedCategory
            ? row.projectedCategory
            : typeof row.seedCategory === 'string'
              ? row.seedCategory
              : 'general',
        orderMode: typeof row.orderMode === 'string' ? (row.orderMode as OrderMode) : undefined,
        quoteOnly: typeof row.quoteOnly === 'boolean' ? row.quoteOnly : undefined,
        allowCustomWeight: typeof row.allowCustomWeight === 'boolean' ? row.allowCustomWeight : undefined,
        pricePer100g: typeof row.pricePer100g === 'number' ? row.pricePer100g : undefined,
        packagingSubcategory: typeof row.packagingSubcategory === 'string' ? row.packagingSubcategory : null,
        collections: Array.isArray(row.collections) ? row.collections : [],
        occasions: Array.isArray(row.occasions) ? row.occasions : [],
        isBidBox: isPackaging,
        price: typeof row.price === 'number' ? row.price : undefined,
        prices: row.prices && typeof row.prices === 'object' ? row.prices : {},
        variants: Array.isArray(row.variants) ? row.variants : undefined,
        variantsCount: typeof row.variantsCount === 'number' ? row.variantsCount : undefined,
        pricesCount: typeof row.pricesCount === 'number' ? row.pricesCount : undefined,
      } as unknown as Product;

      observedProducts.push(p);
    }

    let storedHamperBoxDocIds: Set<string> | undefined;
    let storedHamperBoxReadStatus: 'CONFIRMED' | 'NOT_AUDITED' = 'NOT_AUDITED';

    if (Array.isArray(raw.storedHamperBoxDocIds)) {
      storedHamperBoxDocIds = new Set<string>(raw.storedHamperBoxDocIds);
      storedHamperBoxReadStatus = 'CONFIRMED';
    } else if (Array.isArray(raw.hamperBoxDocIds)) {
      storedHamperBoxDocIds = new Set<string>(raw.hamperBoxDocIds);
      storedHamperBoxReadStatus = 'CONFIRMED';
    } else if (typeof raw.counts?.liveFirestoreHamperBoxDocs === 'number') {
      if (raw.counts.liveFirestoreHamperBoxDocs === 0) {
        storedHamperBoxDocIds = new Set<string>();
        storedHamperBoxReadStatus = 'CONFIRMED';
      } else {
        // A positive collection count without document IDs cannot establish which IDs exist.
        storedHamperBoxDocIds = undefined;
        storedHamperBoxReadStatus = 'NOT_AUDITED';
      }
    } else {
      storedHamperBoxDocIds = undefined;
      storedHamperBoxReadStatus = 'NOT_AUDITED';
    }

    return {
      products: observedProducts,
      hamperBoxes: HAMPER_BOX_SEEDS,
      config: DEFAULT_CATALOG_CONFIGURATION,
      configReadStatus: raw.settingsDocuments?.catalogSettingsMainExists || raw.settingsDocuments?.catalogSettingsMain?.exists ? 'CONFIRMED' : 'STATIC_DEFAULT',
      storedProductDocIds: hasStoredProductAuditing ? storedProductDocIds : undefined,
      storedProductReadStatus: hasStoredProductAuditing ? 'CONFIRMED' : 'NOT_AUDITED',
      storedHamperBoxDocIds,
      storedHamperBoxReadStatus,
      recipesAudited: false, // Recipes unrecorded in perProductAudit
      mediaAudited: false,   // Media unrecorded in perProductAudit
      source: 'snapshot_fixture',
      now: raw.generatedAt || Date.now(),
      provenance: {
        snapshotFile: filePath,
        description: `Audit Snapshot ${raw.auditId || 'R04-CAT1'} (${hasStoredProductAuditing ? storedProductDocIds.size : 'unverified'} Firestore products, ${storedHamperBoxDocIds ? storedHamperBoxDocIds.size : 'unknown'} hamperBoxes)`,
        revision: raw.featureCommit || raw.auditId,
        timestamp: raw.generatedAt,
        kind: 'historical_audit',
        scope: {
          productSource: 'observed_audit',
          storedProductsAudited: hasStoredProductAuditing,
          storedHamperBoxesAudited: storedHamperBoxReadStatus === 'CONFIRMED',
          recipesAudited: false,
          mediaAudited: false,
          pricingAudited: true,
        },
        notes: 'Constructed strictly from observed merchant fields in dated audit; unrecorded recipe and media fields were not audited in this snapshot.',
      },
    };
  }

  // Format 2: Direct products array (e.g. Catalog export snapshot, projection, or fixture)
  if (raw.products !== undefined) {
    if (!Array.isArray(raw.products)) {
      throw new Error(`Malformed snapshot in ${filePath}: 'products' must be an array`);
    }

    for (let i = 0; i < raw.products.length; i++) {
      const p = raw.products[i];
      if (!p || typeof p !== 'object' || Array.isArray(p)) {
        throw new Error(`Malformed snapshot in ${filePath}: products item at index ${i} is not an object`);
      }
      if (typeof p.id !== 'string' || !p.id.trim()) {
        throw new Error(`Malformed snapshot in ${filePath}: products item at index ${i} is missing valid string 'id'`);
      }
    }

    // Explicit presence evidence only
    let storedProductDocIds: Set<string> | undefined;
    let storedProductReadStatus: 'CONFIRMED' | 'NOT_AUDITED' = 'NOT_AUDITED';

    if (Array.isArray(raw.storedProductDocIds)) {
      storedProductDocIds = new Set<string>(raw.storedProductDocIds);
      storedProductReadStatus = 'CONFIRMED';
    } else {
      // Projections or fixtures do NOT prove Firestore persistence!
      storedProductDocIds = undefined;
      storedProductReadStatus = 'NOT_AUDITED';
    }

    let storedHamperBoxDocIds: Set<string> | undefined;
    let storedHamperBoxReadStatus: 'CONFIRMED' | 'NOT_AUDITED' = 'NOT_AUDITED';

    if (Array.isArray(raw.storedHamperBoxDocIds)) {
      storedHamperBoxDocIds = new Set<string>(raw.storedHamperBoxDocIds);
      storedHamperBoxReadStatus = 'CONFIRMED';
    } else if (typeof raw.counts?.liveFirestoreHamperBoxDocs === 'number') {
      if (raw.counts.liveFirestoreHamperBoxDocs === 0) {
        storedHamperBoxDocIds = new Set<string>();
        storedHamperBoxReadStatus = 'CONFIRMED';
      } else {
        storedHamperBoxDocIds = undefined;
        storedHamperBoxReadStatus = 'NOT_AUDITED';
      }
    } else {
      storedHamperBoxDocIds = undefined;
      storedHamperBoxReadStatus = 'NOT_AUDITED';
    }

    return {
      products: raw.products,
      hamperBoxes: Array.isArray(raw.hamperBoxes) ? raw.hamperBoxes : HAMPER_BOX_SEEDS,
      config: raw.config || DEFAULT_CATALOG_CONFIGURATION,
      configReadStatus: raw.config ? 'CONFIRMED' : 'STATIC_DEFAULT',
      storedProductDocIds,
      storedProductReadStatus,
      storedHamperBoxDocIds,
      storedHamperBoxReadStatus,
      recipesAudited: raw.recipesAudited ?? true,
      mediaAudited: raw.mediaAudited ?? true,
      source: 'snapshot_fixture',
      now: raw.now || raw.generatedAt || Date.now(),
      provenance: {
        snapshotFile: filePath,
        description: raw.description || `Catalog Export Snapshot (${raw.products.length} products, storedPersistence: ${storedProductReadStatus})`,
        revision: raw.revision,
        timestamp: raw.generatedAt,
        kind: storedProductDocIds ? 'catalog_export' : 'projection_fixture',
        scope: {
          productSource: storedProductDocIds ? 'catalog_export' : 'projection_fixture',
          storedProductsAudited: storedProductReadStatus === 'CONFIRMED',
          storedHamperBoxesAudited: storedHamperBoxReadStatus === 'CONFIRMED',
          recipesAudited: raw.recipesAudited ?? true,
          mediaAudited: raw.mediaAudited ?? true,
          pricingAudited: true,
        },
        notes: storedProductDocIds ? 'Export with verified document IDs' : 'Public projection/fixture; stored document persistence not audited in this snapshot.',
      },
    };
  }

  throw new Error(`Unrecognized snapshot format in ${filePath}. Supported snapshot formats: audit report with 'perProductAudit' array, or catalog export with 'products' array.`);
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
      configReadStatus: 'STATIC_DEFAULT',
      storedProductDocIds: undefined,
      storedProductReadStatus: 'NOT_AUDITED',
      storedHamperBoxDocIds: undefined,
      storedHamperBoxReadStatus: 'NOT_AUDITED',
      source: 'default_static',
      now,
      provenance: {
        description: 'Compiled static reference seeds (PRODUCTS, HAMPER_BOX_SEEDS). To audit an offline snapshot, use --snapshot=<path>.',
        revision: 'compiled_seeds',
      },
    });
  }

  let storedProductDocIds: Set<string> | undefined;
  let storedHamperBoxDocIds: Set<string> | undefined;
  let storedProductReadStatus: 'CONFIRMED' | 'UNREADABLE' | 'NOT_AUDITED' = 'NOT_AUDITED';
  let storedHamperBoxReadStatus: 'CONFIRMED' | 'UNREADABLE' | 'NOT_AUDITED' = 'NOT_AUDITED';

  try {
    const prodSnap = await db.collection('products').get();
    storedProductDocIds = new Set(prodSnap.docs.map(doc => doc.id));
    storedProductReadStatus = 'CONFIRMED';
  } catch {
    storedProductDocIds = undefined;
    storedProductReadStatus = 'UNREADABLE';
  }

  try {
    const boxSnap = await db.collection('hamperBoxes').get();
    storedHamperBoxDocIds = new Set(boxSnap.docs.map(doc => doc.id));
    storedHamperBoxReadStatus = 'CONFIRMED';
  } catch {
    storedHamperBoxDocIds = undefined;
    storedHamperBoxReadStatus = 'UNREADABLE';
  }

  const snapshot: CatalogSnapshot = await loadAuthoritativeCatalog(db, { fresh: true, now });
  let config: CatalogConfiguration = DEFAULT_CATALOG_CONFIGURATION;
  let configReadStatus: 'CONFIRMED' | 'UNREADABLE_FALLBACK_DEFAULT' = 'CONFIRMED';
  try {
    config = await readCatalogConfiguration(db);
  } catch {
    config = DEFAULT_CATALOG_CONFIGURATION;
    configReadStatus = 'UNREADABLE_FALLBACK_DEFAULT';
  }

  const resolvedSource = (options.source as CatalogHealthReport['source']) ||
    (typeof (db as any).__allbarka_memory === 'boolean' || !(db as any).projectId ? 'firestore_memory' : 'firestore_live');

  return generateCatalogHealthReport({
    products: snapshot.products,
    hamperBoxes: snapshot.hamperBoxes,
    config,
    configReadStatus,
    storedProductDocIds,
    storedProductReadStatus,
    storedHamperBoxDocIds,
    storedHamperBoxReadStatus,
    source: resolvedSource,
    now,
    provenance: {
      description: `Active ${resolvedSource} instance (project: ${(db as any).projectId || 'memory'})`,
      revision: snapshot.version,
    },
  });
}
