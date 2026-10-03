import type { CartItem } from '../types';

export interface CheckoutReceiptTotals {
  subtotal: number;
  finalPayable: number;
  shippingFee: number;
  discountAmt: number;
  giftFee: number;
}

/** An idempotent retry may return the original accepted prices, before a refresh. */
export function acceptedCheckoutReceipt(items: CartItem[], fallback: CheckoutReceiptTotals, response: { totals?: any; items?: any[] }) {
  const amount = (value: unknown, previous: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : previous;
  const totals = {
    subtotal: amount(response.totals?.subtotal, fallback.subtotal),
    finalPayable: amount(response.totals?.total, fallback.finalPayable),
    shippingFee: amount(response.totals?.shipping, fallback.shippingFee),
    discountAmt: amount(response.totals?.discount, fallback.discountAmt),
    giftFee: amount(response.totals?.giftWrapFee, fallback.giftFee),
  };
  const acceptedItems = items.map(item => {
    const accepted = response.items?.find(line => line?.id === item.id)
      || (!item.hamperConfiguration ? response.items?.find(line => line?.productId === item.productId && line.selectedWeight === item.selectedWeight) : undefined);
    const price = amount(accepted?.price, item.unitPrice);
    return { ...item, price, unitPrice: price };
  });
  return { items: acceptedItems, totals };
}
