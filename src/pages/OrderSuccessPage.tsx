import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ShoppingBag, MessageCircle, ArrowRight, Package, MapPin, Clock } from 'lucide-react';
import { STORE_CONFIG } from '../config/store';
import { formatPKR } from '../lib/pricing';
import { useLanguage } from '../contexts/LanguageContext';

export interface OrderSuccessSnapshot {
  orderId: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  deliverySlot?: string;
  items: Array<{
    name: string;
    selectedWeight?: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  giftWrapFee?: number;
  totalAmount: number;
  paymentMethod: string;
  whatsappMessage?: string;
  timestamp?: string;
}

export default function OrderSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();
  const [order, setOrder] = useState<OrderSuccessSnapshot | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    // 1. First priority: location state
    if (location.state?.orderData) {
      setOrder(location.state.orderData);
      try {
        sessionStorage.setItem('allbarka_latest_order', JSON.stringify(location.state.orderData));
      } catch {
        // ignore
      }
      setIsLoaded(true);
      return;
    }

    // 2. Second priority: sessionStorage snapshot for reloads/back-forward navigation
    try {
      const saved = sessionStorage.getItem('allbarka_latest_order') || sessionStorage.getItem('allbarka_order_success');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.orderId) {
          const normalized: OrderSuccessSnapshot = {
            orderId: parsed.orderId,
            name: parsed.name || parsed.customer?.name || 'Valued Patron',
            phone: parsed.phone || parsed.customer?.phone || '',
            address: parsed.address || parsed.customer?.address || '',
            city: parsed.city || parsed.customer?.city || 'Lahore',
            deliverySlot: parsed.deliverySlot || parsed.customer?.deliverySlot || 'Fastest Dispatch',
            items: (parsed.items || []).map((it: any) => ({
              name: it.name,
              selectedWeight: it.selectedWeight,
              quantity: it.quantity,
              price: it.price || it.unitPrice || 0,
            })),
            subtotal: parsed.subtotal ?? parsed.totals?.subtotal ?? 0,
            discount: parsed.discount ?? parsed.totals?.discountAmt ?? 0,
            shipping: parsed.shipping ?? parsed.totals?.shippingFee ?? 0,
            giftWrapFee: parsed.giftWrapFee ?? parsed.totals?.giftFee ?? 0,
            totalAmount: parsed.totalAmount ?? parsed.totals?.finalPayable ?? 0,
            paymentMethod: parsed.paymentMethod || parsed.customer?.paymentMethod || 'Cash on Delivery',
            whatsappMessage: parsed.whatsappMessage,
            timestamp: parsed.timestamp || new Date().toISOString()
          };
          setOrder(normalized);
        }
      }
    } catch {
      // ignore
    }

    setIsLoaded(true);
  }, [location.state]);

  if (!isLoaded) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center py-20" aria-busy="true">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-gold,#C7982F)]/20 border-t-[var(--color-gold,#C7982F)] animate-spin" />
      </div>
    );
  }

  // Graceful recovery state if accessed directly with no order snapshot
  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/30 flex items-center justify-center text-[var(--color-gold,#C7982F)] mb-6 shadow-xs">
          <Package size={30} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-ink,#29231D)] mb-3">
          No Recent Order Snapshot
        </h2>
        <p className="text-sm text-[var(--color-ink-muted,#635B52)] max-w-md mb-8 leading-relaxed">
          If you have recently placed an order, our concierge team will reach out to confirm your details. You can also explore our harvest selections.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-8 py-3.5 rounded-full bg-[var(--color-ink,#29231D)] text-white dark:bg-[var(--color-gold,#C7982F)] dark:text-[var(--color-ink,#29231D)] font-bold text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-all cursor-pointer"
          >
            Browse Collections
          </button>
          <a
            href={`https://wa.me/${STORE_CONFIG.whatsappBusinessNumber}?text=${encodeURIComponent('Assalam-o-Alaikum, I would like to inquire about my AllBarka order status.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-full border border-[var(--color-gold,#C7982F)]/40 text-[var(--color-ink,#29231D)] font-bold text-xs uppercase tracking-[0.2em] hover:bg-[var(--color-gold,#C7982F)]/10 transition-all text-center flex items-center justify-center gap-2"
          >
            <MessageCircle size={15} />
            Contact Concierge
          </a>
        </div>
      </div>
    );
  }

  const whatsappText = order.whatsappMessage
    ? order.whatsappMessage
    : `Assalam-o-Alaikum AllBarka, inquiring about Order ID: ${order.orderId}`;
  const whatsappUrl = `https://wa.me/${STORE_CONFIG.whatsappBusinessNumber}?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="w-full min-h-[70vh] py-12 px-4 sm:px-6 flex justify-center items-start">
      <div className="max-w-2xl w-full bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/30 rounded-3xl p-6 sm:p-10 shadow-[0_20px_60px_rgba(4,40,33,0.08)] relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-[var(--color-gold,#C7982F)]/10 border border-[var(--color-gold,#C7982F)]/30 flex items-center justify-center mx-auto mb-6 text-[var(--color-gold,#C7982F)]">
          <CheckCircle size={32} />
        </div>

        <div className="text-center mb-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-gold,#C7982F)] block mb-1">
            Order Confirmed
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-ink,#29231D)]">
            Thank You, {order.name.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-ink-muted,#635B52)] mt-2 max-w-md mx-auto">
            Your luxury harvest package is being prepared for dispatch in Lahore.
          </p>
        </div>

        {/* Order Details Receipt Card */}
        <div className="bg-[var(--color-surface-elevated,#FFFFFF)] dark:bg-[var(--color-surface-elevated,#222A28)] border border-[var(--color-gold,#C7982F)]/20 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[var(--color-gold,#C7982F)]/15 gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted,#635B52)] block">
                Order Identifier
              </span>
              <span className="font-mono text-sm font-bold text-[var(--color-emerald-dark,#042821)] dark:text-[var(--color-gold,#C7982F)]">
                {order.orderId}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted,#635B52)] block">
                Payment Method
              </span>
              <span className="text-xs font-bold text-[var(--color-ink,#29231D)]">
                {order.paymentMethod === 'bank' ? 'Direct Bank Transfer' : 'Cash on Delivery (COD)'}
              </span>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="py-4 border-b border-[var(--color-gold,#C7982F)]/15 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-[var(--color-gold,#C7982F)] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[var(--color-ink,#29231D)] block">Delivery Address</span>
                <span className="text-[var(--color-ink-muted,#635B52)]">{order.address}, {order.city}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={14} className="text-[var(--color-gold,#C7982F)] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[var(--color-ink,#29231D)] block">Contact & Slot</span>
                <span className="text-[var(--color-ink-muted,#635B52)]">{order.phone} • {order.deliverySlot || 'Fastest Dispatch'}</span>
              </div>
            </div>
          </div>

          {/* Items Summary */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div className="py-4 border-b border-[var(--color-gold,#C7982F)]/15">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted,#635B52)] block mb-2">
                Items ({order.items.reduce((acc, i) => acc + (i.quantity || 1), 0)})
              </span>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-[var(--color-ink,#29231D)]">
                      {item.name} {item.selectedWeight ? `(${item.selectedWeight})` : ''} <span className="text-[var(--color-ink-faint)]">× {item.quantity}</span>
                    </span>
                    <span className="font-medium text-[var(--color-ink,#29231D)]">
                      {formatPKR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals Breakdown */}
          <div className="pt-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-[var(--color-ink-muted,#635B52)]">
              <span>Subtotal</span>
              <span>{formatPKR(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Harvest Privilege Discount</span>
                <span>-{formatPKR(order.discount)}</span>
              </div>
            )}
            {order.giftWrapFee ? (
              <div className="flex justify-between text-[var(--color-ink-muted,#635B52)]">
                <span>Gift Packaging</span>
                <span>{formatPKR(order.giftWrapFee)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-[var(--color-ink-muted,#635B52)]">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? 'FREE' : formatPKR(order.shipping)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-[var(--color-gold,#C7982F)]/20 font-bold text-sm text-[var(--color-emerald-dark,#042821)] dark:text-[var(--color-gold,#C7982F)]">
              <span>Total Payable</span>
              <span className="font-serif text-base">{formatPKR(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3.5 px-6 rounded-full bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <MessageCircle size={16} />
            Track via WhatsApp
          </a>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="flex-1 py-3.5 px-6 rounded-full bg-[var(--color-ink,#29231D)] text-white dark:bg-[var(--color-gold,#C7982F)] dark:text-[var(--color-ink,#29231D)] font-bold text-xs uppercase tracking-wider text-center hover:opacity-90 transition-colors cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
