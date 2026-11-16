/**
 * Free gift add-ons (owner decision 16 Nov 2026: "add-ons jo best lagta ha").
 * These cost nothing and change no price: card style, ribbon colour and a gift receipt
 * (no prices inside the parcel). Paid add-ons wait for owner prices.
 */
export const GIFT_CARD_STYLES = ['celebration', 'eid', 'dua'] as const;
export const GIFT_RIBBONS = ['gold', 'emerald', 'maroon', 'ivory'] as const;
export type GiftCardStyle = typeof GIFT_CARD_STYLES[number];
export type GiftRibbon = typeof GIFT_RIBBONS[number];
export interface GiftOptions { receipt: boolean; cardStyle: GiftCardStyle; ribbon: GiftRibbon }

export const DEFAULT_GIFT_OPTIONS: GiftOptions = { receipt: false, cardStyle: 'celebration', ribbon: 'gold' };

/** Returns validated options, or null when the customer chose nothing beyond the defaults. */
export function normalizeGiftOptions(input: unknown): GiftOptions | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const options: GiftOptions = {
    receipt: raw.receipt === true,
    cardStyle: (GIFT_CARD_STYLES as readonly unknown[]).includes(raw.cardStyle) ? raw.cardStyle as GiftCardStyle : DEFAULT_GIFT_OPTIONS.cardStyle,
    ribbon: (GIFT_RIBBONS as readonly unknown[]).includes(raw.ribbon) ? raw.ribbon as GiftRibbon : DEFAULT_GIFT_OPTIONS.ribbon,
  };
  const isDefault = !options.receipt && options.cardStyle === DEFAULT_GIFT_OPTIONS.cardStyle && options.ribbon === DEFAULT_GIFT_OPTIONS.ribbon;
  return isDefault ? null : options;
}

const CARD_LABEL: Record<GiftCardStyle, string> = { celebration: 'Celebration card', eid: 'Eid card', dua: 'Plain dua / get-well card (no festive design)' };
const RIBBON_LABEL: Record<GiftRibbon, string> = { gold: 'Gold ribbon', emerald: 'Emerald ribbon', maroon: 'Maroon ribbon', ivory: 'Ivory ribbon' };

/** Lines for the team's WhatsApp order message and the admin order view. */
export function giftOptionLines(options: GiftOptions | null | undefined): string[] {
  if (!options) return [];
  const lines = [`  Card: ${CARD_LABEL[options.cardStyle]}`, `  Ribbon: ${RIBBON_LABEL[options.ribbon]}`];
  if (options.receipt) lines.push('  GIFT RECEIPT: do not put prices or the invoice inside the parcel');
  return lines;
}
