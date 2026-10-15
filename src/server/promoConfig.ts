import type { PromoType } from '../types/promo';

/** Server-owned definitions: never accept promotion rules from the browser or a coupon document. */
export interface PromoConfig {
  readonly code: string;
  readonly type: PromoType;
  readonly value?: number;
  readonly maxDiscount?: number;
  readonly minOrder?: number;
  readonly firstOrderOnly?: boolean;
  readonly active: boolean;
  readonly expiresAt?: number | null;
}

export const PROMO_CONFIG: Readonly<Record<string, PromoConfig>> = Object.freeze({
  ISHAQUEAHMAD: Object.freeze({ code: 'ISHAQUEAHMAD', type: 'percent', value: 10, maxDiscount: 1000, active: true }),
  ALLBARKA10: Object.freeze({ code: 'ALLBARKA10', type: 'percent', value: 10, maxDiscount: 500, active: true }),
  ZAFRANI: Object.freeze({ code: 'ZAFRANI', type: 'free_shipping', active: true }),
  GIFTBOX: Object.freeze({ code: 'GIFTBOX', type: 'free_giftwrap', active: true }),
  MYSTERY: Object.freeze({ code: 'MYSTERY', type: 'free_gift', active: true }),
  FRIEND: Object.freeze({ code: 'FRIEND', type: 'flat', value: 200, minOrder: 2000, active: true }),
  WELCOME10: Object.freeze({ code: 'WELCOME10', type: 'percent', value: 10, maxDiscount: 500, firstOrderOnly: true, active: true }),
  BULK10: Object.freeze({ code: 'BULK10', type: 'percent', value: 10, minOrder: 5000, active: true }),
  EID15: Object.freeze({ code: 'EID15', type: 'percent', value: 15, maxDiscount: 1500, active: false, expiresAt: null }),
  CANCER: Object.freeze({ code: 'CANCER', type: 'quote', active: true }),
});
