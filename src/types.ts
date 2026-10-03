import type { HamperConfiguration } from './lib/hamperCatalog';

export interface ProductBadge {
  icon: string;
  title: string;
  subtitle: string;
}

export interface Product {
  id: string;
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
  image: string;
  imageName: string;
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
