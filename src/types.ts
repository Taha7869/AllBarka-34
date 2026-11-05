import type { GiftRecipient } from './lib/giftRecipient';
import type { HamperConfiguration } from './lib/hamperCatalog';
import type { ProductCommerce, ProductSeo, ProductAttribute } from './lib/productCommerce';
import type { RecipeIngredient } from './lib/filledGiftPricing';
export type { RecipeIngredient } from './lib/filledGiftPricing';

export interface ProductBadge {
  icon: string;
  title: string;
  subtitle: string;
}

export interface BidBoxBulkTier {
  qty: number;
  label: string;
  discountBadge?: string;
  unitPrice: number;
  packPrice: number;
  variantKey: string;
}

export interface BidBoxFilledOption {
  label: string;
  subtitle: string;
  price: number;
  variantKey: string;
}

export interface BidBoxConfig {
  emptyUnitStarting?: number;
  emptyBulk50Unit?: number;
  emptyBulk100Unit?: number;
  filledMin?: number;
  filledMax?: number;
  filledSummary?: string;
  occasionTag?: string;
  dimensionsAndCapacity?: string;
  emptyOptionDetails?: string;
  filledOptionDetails?: string;
  emptyTiers?: BidBoxBulkTier[];
  filledOptions?: BidBoxFilledOption[];
  boxStyle?: string;
  allowsCustomDryFruits?: boolean;
  capacityG?: number;
  minUnits?: number;
  packagingSubcategory?: 'tin' | 'tabarruk' | 'wedding' | 'baby' | 'acrylic' | string | null;
  recipeIngredients?: RecipeIngredient[];
  filledRecipes?: Record<string, RecipeIngredient[]>;
  [key: string]: any;
}

export type ProductStatus = 'draft' | 'published' | 'archived';
export type OrderMode = 'standard' | 'inquiry_quote' | 'both';
export type RoastLevel = 'raw' | 'lightly_roasted' | 'salted' | 'slow_roasted' | 'unprocessed';
export type ClaimVerificationStatus = 'unverified' | 'verified' | 'discrepant';
export type CertificationType = 'halal' | 'organic' | 'gluten_free' | 'raw_natural' | 'vegan';
export type CropMode = 'cover' | 'contain';

export interface ProductPassport {
  variety?: string;
  harvestSeason?: string;
  roastLevel?: RoastLevel;
  processingMethod?: string;
  ingredients?: string[];
  allergens?: string[];
  storageInstructions?: string;
  bestBeforeDays?: number;
  certifications?: CertificationType[];
}

export interface ClaimsVerification {
  status: ClaimVerificationStatus;
  verifiedAt?: string;
  notes?: string;
}

export interface MediaFocalPoint {
  x: number; // 0.0 to 1.0 (0.5 is center)
  y: number; // 0.0 to 1.0 (0.5 is center)
}

export interface ProductPersonalizationConfig {
  supported: boolean;
  allowMonogram?: boolean;
  allowCardMessage?: boolean;
  allowRibbonColor?: boolean;
  ribbonColors?: string[];
  options?: string[];
  notes?: string;
}

export interface MerchandisingShowcaseTab {
  id: string; // e.g. 'dry-fruits', 'pantry', 'gifts', 'celebration-boxes', 'deals'
  label_en: string;
  label_ur: string;
  visible: boolean;
  productIds: string[]; // exactly 3 admin-selected products per tab
}

export interface MerchandisingCollectionEntry {
  collectionId: string; // e.g. 'combos', 'celebration-boxes', 'deals', 'personalized-treats'
  title_en: string;
  title_ur: string;
  slug: string; // validated internal destination e.g. '/celebration-boxes'
  image?: string;
  badge?: string;
  visible: boolean;
}

export interface MerchandisingOccasionEntry {
  tag: string; // e.g. 'wedding', 'ramadan', 'eid', 'umrah', 'corporate', 'baby-announcement'
  title_en: string;
  title_ur: string;
  slug: string; // validated internal destination e.g. '/occasions/wedding'
  icon?: string;
  visible: boolean;
}

export interface MerchandisingAutoplayConfig {
  enabled: boolean;
  intervalMs: number; // Rule D5 default: 6000
  resumeDelayMs: number; // Rule D5 default: 3000
}

export interface MerchandisingSettings {
  showcaseTabs: MerchandisingShowcaseTab[];
  featuredProductIds: string[];
  categoryOrder: string[];
  categoryVisibility: Record<string, boolean>;
  autoplay: MerchandisingAutoplayConfig;
  autoplayDurationMs: number;
  autoplayResumeDelayMs: number;
  collections: MerchandisingCollectionEntry[];
  occasions: MerchandisingOccasionEntry[];
  revision: number;
  updatedAt: string;
  updatedBy?: string;
}

export interface Product {
  id: string;
  commerce?: ProductCommerce;
  seo?: ProductSeo;
  attributes?: ProductAttribute[];
  templateId?: string;
  galleryImages?: string[];
  /** Purchase-time pricing fingerprint, including direct Console edits. */
  catalogRevision?: string;
  /** Owner-editable catalogue aliases; legacy localized fields remain compatible. */
  name?: string;
  nameUr?: string;
  nameAr?: string;
  description?: string;
  active?: boolean;
  inStock?: boolean;
  stockQty?: number;
  variants?: { label: string; price: number; available?: boolean; moqOverride?: number; minOrderQuantity?: number; [key: string]: any }[];
  minOrderQuantity?: number;
  pricePer100g?: number;
  allowCustomWeight?: boolean;
  minCustomWeightG?: number;
  maxCustomWeightG?: number;
  fragile?: boolean;
  quoteOnly?: boolean;
  isBidBox?: boolean;
  bidBoxConfig?: BidBoxConfig;
  packagingSubcategory?: 'tin' | 'tabarruk' | 'wedding' | 'baby' | 'acrylic' | string | null;
  recipeIngredients?: RecipeIngredient[];
  filledRecipes?: Record<string, RecipeIngredient[]>;
  components?: Array<string | { productId: string; quantity?: number; unitWeightG?: number }>;
  componentIds?: string[];
  contents?: string[];
  badge?: string;
  revision?: number;
  origins?: string[];
  /** Owner-editable packed shipping weight for a fixed bundle, in grams. */
  shippingWeightG?: number;
  /** Merchant-approved grams used for shipping billing, keyed by canonical portion. */
  shippingWeights?: Record<string, number>;
  name_en: string;
  name_ur: string;
  name_ar: string;
  category: string;
  category_en?: string;
  category_ur?: string;
  category_ar?: string;
  health_en?: string;
  health_ur?: string;
  health_ar?: string;
  tag_en?: string;
  tag_ur?: string;
  tag_ar?: string;
  image: string | null;
  imageName: string | null;
  prices: Record<string, number>;
  price?: number; // legacy fallback
  isBundle?: boolean;
  contents_en?: string;
  contents_ur?: string;
  contents_ar?: string;
  wholesale: number;
  desc_en: string;
  desc_ur: string;
  desc_ar: string;
  recipe_en?: string;
  recipe_ur?: string;
  recipe_ar?: string;
  origin_en?: string;
  origin_ur?: string;
  origin_ar?: string;
  harvest_en?: string;
  harvest_ur?: string;
  harvest_ar?: string;
  sourcingDetails_en?: string;
  sourcingDetails_ur?: string;
  sourcingDetails_ar?: string;
  storageTips_en?: string;
  storageTips_ur?: string;
  storageTips_ar?: string;
  packagingDetails_en?: string;
  packagingDetails_ur?: string;
  packagingDetails_ar?: string;
  earnedPoints?: Record<string, number> | number;
  nutritionalHighlights?: string[];
  badges?: ProductBadge[];
  keywords?: string[];
  allergenWarning_en?: string;
  allergenWarning_ur?: string;
  allergenWarning_ar?: string;
  tasteProfile_en?: string;
  tasteProfile_ur?: string;
  tasteProfile_ar?: string;

  /** Canonical product family (e.g. 'badam', 'khajoor', 'tin-bid-box') */
  productFamily?: string;
  /** Curated commercial collection slugs (e.g. 'combos', 'celebration-boxes', 'deals', 'personalized-treats') */
  collections?: string[];
  /** Occasion tags (e.g. 'wedding', 'umrah', 'ramadan', 'birth', 'corporate') */
  occasions?: string[];
  /** Personalization options */
  personalization?: ProductPersonalizationConfig;
  /** Explicit inclusions for gift boxes, hampers or bundles */
  inclusions?: string[];
  /** Explicit exclusions or prerequisites */
  exclusions?: string[];
  /** Ordering workflow supported: direct checkout, inquiry quote, or both */
  orderMode?: OrderMode;
  /** Publication lifecycle status: 'draft' | 'published' | 'archived' */
  status?: ProductStatus;
  /** Custom packaging or product MOQ override */
  moqOverride?: number;
  /** Preparation and lead time in calendar days (e.g. 10 days for custom packaging) */
  preparationDays?: number;
  /** Display sorting order within category or collection */
  displayOrder?: number;

  // Private & supplier fields (authoritative admin only; stripped from public responses)
  referencePrice?: number;
  supplierCost?: number;
  supplierName?: string;
  supplierItemUrl?: string;
  internalNotes?: string;
  importBatch?: string;
  importTimestamp?: string;
  adminRevision?: number;
  targetMarginPercent?: number;
  // M11 Verified Product Passport & M23 Media / Claims Controls
  passport?: ProductPassport;
  claimsVerification?: ClaimsVerification;
  mediaFocalPoint?: MediaFocalPoint;
  cropMode?: CropMode;
}

export interface CartItem {
  id: string; // Unique composite ID: `${product.id}-${selectedWeight}`
  productId: string;
  name_en: string;
  name_ur: string;
  name_ar: string;
  slug: string;
  image: string;
  selectedWeight: string; // e.g. "250g", "500g", "1kg"
  unitPrice: number; // Sanitized clean number in PKR
  price: number; // Sanitized clean number in PKR (backward compatibility alias)
  quantity: number;
  wholesale?: boolean;
  hamperConfiguration?: HamperConfiguration;
}

export interface DeliveryOption {
  id: string;
  name: string;
  price: number;
}

export type ShippingMethodId = 'standard' | 'express' | 'sameday';

export interface ShippingOption {
  id: ShippingMethodId;
  title: string;
  subtitle: string;
  estimate: string;
  badge?: string;
  basePrice: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
  type?: 'web' | 'map';
  snippet?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  modelUsed?: string;
  groundingSources?: GroundingSource[];
  toolUsed?: 'googleSearch' | 'googleMaps' | 'none';
}

export interface CustomerReview {
  id: string;
  name_en: string;
  name_ur: string;
  name_ar: string;
  roleOrTitle?: string;
  avatarInitials: string;
  location: string;
  neighborhoodGroup?: 'dha-cantt' | 'gulberg-modeltown' | 'gifting-wellness' | 'all';
  purchasedItem: string;
  verifiedSource: string;
  date?: string;
  headline: string;
  review: string;
  rating: number;
  isReviewOfTheMonth?: boolean;
}

export type LoyaltyTransactionType = 'EARN' | 'REDEEM' | 'REVERSAL' | 'ADJUSTMENT';

export interface LoyaltyTransaction {
  transactionId: string;
  type: LoyaltyTransactionType;
  points: number;
  orderId?: string;
  rewardId?: string;
  description: string;
  createdAt: number;
}

export interface PatronReward {
  rewardId: string;
  name: string;
  description: string;
  pointsCost: number;
  rewardType: 'SHIPPING' | 'SAMPLE' | 'PACKAGING' | 'DISCOUNT';
  minimumOrderAmount: number;
  active: boolean;
  expiryDays: number;
}

export interface ActiveReward {
  rewardId: string;
  claimedAt: number;
  expiresAt: number;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  rewardType?: string;
}

export type InquiryType = 'bid_box_quote' | 'wholesale' | 'custom_hamper' | 'general';
export type InquiryStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'APPROVED' | 'CLOSED';

export interface InquiryRecord {
  id: string;
  ticketId: string;
  quoteId: string;
  type: InquiryType;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  productId: string;
  productName: string;
  packagingVariant?: string | null;
  boxMode: 'empty' | 'filled' | 'custom';
  quantity: number;
  quantityUnit?: 'pieces' | 'packs' | 'sets';
  piecesPerPack?: number;
  eventType: string;
  giftRecipient?: GiftRecipient;
  targetEventDate?: string | null;
  budgetType?: 'per_piece' | 'total' | null;
  preferredFillings?: string[];
  customFillingsNotes?: string;
  monogramText?: string;
  cardMessage?: string;
  customPrintText: string;
  standardPrice: number | null;
  packPrice?: number | null;
  perPiecePrice?: number | null;
  estimatedTotalPkr?: number | null;
  requiresTeamQuote?: boolean;
  unresolvedVariant?: boolean;
  belowMoq?: boolean;
  moqRequired?: number | null;
  minPacksRequired?: number | null;
  isVerifiedCatalogProduct?: boolean;
  submissionKey?: string | null;
  offeredPrice: number | null;
  finalAgreedPrice: number | null;
  notes: string;
  adminNotes: string;
  status: InquiryStatus;
  whatsappUrl: string;
  whatsappReplyUrl: string;
  assignedTo?: string | null;
  followUpDate?: string | null;
  leadTimeNoticeAcknowledged?: boolean;
  netFillingGrams?: number | null;
  hamperConfiguration?: HamperConfiguration;
  createdAt: string;
  updatedAt: string;
}

export interface CustomQuoteModalInit {
  productId?: string;
  productName?: string;
  mode?: 'empty' | 'filled' | 'custom';
  quantity?: number;
  eventType?: string;
  giftRecipient?: GiftRecipient;
  occasion?: string;
  targetUnitPrice?: number;
  variantLabel?: string;
  portion?: string;
  notes?: string;
  targetEventDate?: string;
  preferredFillings?: string[];
  customFillingsNotes?: string;
  monogramText?: string;
  cardMessage?: string;
  customPrintText?: string;
  customPrinting?: string;
  city?: string;
  budgetType?: 'per_piece' | 'total';
  targetPricePkr?: number | string;
  netFillingGrams?: number | null;
  hamperConfiguration?: HamperConfiguration;
}
