export interface StaffMember {
  uid: string;
  email: string;
  displayName: string;
  enabled: boolean;
  revision: number;
  updatedAt: string | null;
}
export interface StaffOrder {
  orderId: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  isQuoteRequest: boolean;
  customer: { name: string; phone: string; city: string; address: string; deliverySlot: string; instructions: string };
  items: { productId: string; name: string; selectedWeight: string; quantity: number; price: number;
    hamper: null | { boxId: string; selections: string[]; recipientName: string; giftMessage: string } }[];
  totals: { subtotal: number; discount: number; shipping: number; giftWrapFee: number; total: number };
  gifting: { giftWrapping: boolean; giftMessage: string };
  deliveryDate: string;
}
export interface StaffLedger {
  orders: StaffOrder[];
  page: number;
  totalPages: number | null;
  totalCount: number | null;
  hasMore: boolean;
  nextCursor: string | null;
  truncated: boolean;
  asOf: string;
}
