export interface PromoCode {
  code: string;
  type: 'PERCENTAGE_CAP' | 'FREE_SHIPPING' | 'FREE_GIFT_WRAP';
  discountValue?: number; // E.g., 10 for 10%
  maxDiscount?: number;   // E.g., 300 for Rs. 300 cap
}

export const PROMO_CODES: Record<string, PromoCode> = {
  'ALLBARKA10': {
    code: 'ALLBARKA10',
    type: 'PERCENTAGE_CAP',
    discountValue: 10,
    maxDiscount: 300,
  },
  'ZAFRANI': {
    code: 'ZAFRANI',
    type: 'FREE_SHIPPING',
  },
  'SHAHD-GIFT': {
    code: 'SHAHD-GIFT',
    type: 'FREE_GIFT_WRAP',
  }
};

export function validatePromo(code: string): PromoCode | null {
  const normalized = code.trim().toUpperCase();
  return PROMO_CODES[normalized] || null;
}
