/** Public result types only. Promotion definitions stay in the server bundle. */
export type PromoType = 'percent' | 'flat' | 'free_shipping' | 'free_giftwrap' | 'free_gift' | 'quote';

export interface AppliedPromo {
  promoCode: string | null;
  promoType: PromoType | null;
  promoValue?: number;
  discountAmount: number;
  freeShipping: boolean;
  freeGiftWrap: boolean;
  freeGift: boolean;
  isQuoteRequest: boolean;
}
