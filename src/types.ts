export interface ProductBadge {
  icon: string;
  title: string;
  subtitle: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  health: string;
  tag?: string;
  image: string;
  imageName: string;
  prices: Record<string, number>;
  price?: number; // legacy fallback
  isBundle?: boolean;
  contents?: string;
  wholesale: number;
  desc: string;
  recipe?: string;
  origin?: string;
  harvest?: string;
  sourcingDetails?: string;
  storageTips?: string;
  packagingDetails?: string;
  earnedPoints?: Record<string, number> | number;
  nutritionalHighlights?: string[];
  badges?: ProductBadge[];
  keywords?: string[];
  allergenWarning?: string;
  tasteProfile?: string;
}

export interface CartItem {
  id: string; // Unique composite ID: `${product.id}-${selectedWeight}`
  productId: string;
  name: string;
  slug: string;
  image: string;
  selectedWeight: string; // e.g. "250g", "500g", "1kg"
  unitPrice: number; // Sanitized clean number in PKR
  price: number; // Sanitized clean number in PKR (backward compatibility alias)
  quantity: number;
  wholesale?: boolean;
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
  name: string;
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
