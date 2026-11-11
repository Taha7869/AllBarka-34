/** Customer intent only: never used to infer product suitability or printing text. */
export const GIFT_RECIPIENTS = ['family', 'friend', 'colleagues', 'clients'] as const;
export type GiftRecipient = typeof GIFT_RECIPIENTS[number];

export function isGiftRecipient(value: unknown): value is GiftRecipient {
  return typeof value === 'string' && GIFT_RECIPIENTS.some(recipient => recipient === value);
}

export const GIFT_RECIPIENT_LABELS: Record<GiftRecipient, string> = {
  family: 'Family', friend: 'A friend', colleagues: 'Colleagues', clients: 'Clients',
};
