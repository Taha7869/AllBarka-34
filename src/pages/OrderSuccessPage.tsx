import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ShoppingBag, MessageCircle, ArrowRight, Package, MapPin, Clock, RotateCcw } from 'lucide-react';
import { STORE_CONFIG } from '../config/store';
import { buildHumanSupportWhatsAppUrl, buildOrderTrackingWhatsAppUrl } from '../config/contacts';
import { formatPKR } from '../lib/pricing';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { PRODUCTS } from '../data/products';
import { fetchReorderItems } from '../lib/orderTrackingService';
import { getCheckoutAuthToken } from '../lib/checkoutAttempt';
import { recoverOrderSuccessReceipt, refreshOrderSuccessReceipt, type ConfirmedSuccessReceipt } from '../lib/orderSuccessRecovery';
import { TRACKING_POLL_MS, TRACKING_STEPS, trackingProgress } from '../lib/orderPresentation';
import { formatOrderStatusLabel } from '../lib/orderStatuses';
import { recordFunnelEvent } from '../lib/funnelTelemetry';
import { AllBarkaCrestVector } from '../components/AllBarkaLogo';
import GoldConfettiBurst from '../components/GoldConfettiBurst';
import BankTransferDetailsCard from '../components/BankTransferDetailsCard';

export type OrderSuccessSnapshot = ConfirmedSuccessReceipt;

export default function OrderSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, isRtl, language } = useLanguage();
  const { currentUser, loading: authLoading } = useAuth();
  const [confirmedReceipt, setOrder] = useState<OrderSuccessSnapshot | null>(null);
  const order = confirmedReceipt?.customerUid === (currentUser?.uid || null) ? confirmedReceipt : null;
  const [isLoaded, setIsLoaded] = useState(false);
  const [recoveryRevision, setRecoveryRevision] = useState(0);
  const [trackingRevision, setTrackingRevision] = useState(0);
  const [trackingState, setTrackingState] = useState<'checking' | 'live' | 'unavailable'>('checking');
  const { addToCart, setIsCartOpen } = useCart();
  const [isReordering, setIsReordering] = useState(false);
  const [reorderFeedback, setReorderFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    unavailableNames?: string[];
  } | null>(null);

  const handleReorder = async () => {
    if (!order?.orderId || !order?.phone) return;
    const phoneDigits = order.phone.replace(/\D/g, '');
    const phoneLast4 = phoneDigits.slice(-4);
    if (!/^\d{4}$/.test(phoneLast4)) return;

    setIsReordering(true);
    setReorderFeedback(null);
    try {
      const res = await fetchReorderItems(order.orderId, phoneLast4);
      if (!res || !res.success) {
        setReorderFeedback({
          type: 'error',
          message: t('track.error', 'Unable to retrieve order details for reorder.'),
        });
        return;
      }

      let addedCount = 0;
      for (const item of res.items) {
        const catalogProduct = PRODUCTS.find(p => p.id === item.productId);
        const payload = catalogProduct || {
          id: item.productId,
          name: item.name,
          image: item.image,
          prices: { [item.weight]: item.currentUnitPrice },
        };
        addToCart(payload, item.weight, item.quantity, item.currentUnitPrice, {
          silent: true,
          openCart: false,
        });
        addedCount += item.quantity;
      }

      if (addedCount > 0) {
        setIsCartOpen(true);
      }

      if (res.items.length === 0 && res.unavailableItems.length > 0) {
        setReorderFeedback({
          type: 'error',
          message: t('track.reorderAllUnavailable', 'None of the items from this order are currently available in the catalog.'),
          unavailableNames: res.unavailableItems.map(u => u.name),
        });
      } else if (res.unavailableItems.length > 0) {
        setReorderFeedback({
          type: 'warning',
          message: t('track.reorderPartialNotice', 'Note: Some items are no longer available in the boutique catalog and were skipped.'),
          unavailableNames: res.unavailableItems.map(u => u.name),
        });
      } else if (res.items.length > 0) {
        setReorderFeedback({
          type: 'success',
          message: t('track.reorderSuccess', 'Items added to your bag at current prices.'),
        });
      }
    } catch {
      setReorderFeedback({
        type: 'error',
        message: t('track.error', 'Unable to reorder items. Please try again.'),
      });
    } finally {
      setIsReordering(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setOrder(null);
    setIsLoaded(false);
    if (authLoading) return;
    let candidate: unknown = location.state?.orderData;
    try {
      if (!candidate) {
        // The checkout snapshot is newer than the last manually opened receipt.
        const saved = sessionStorage.getItem('allbarka_order_success') || sessionStorage.getItem('allbarka_latest_order');
        if (saved) candidate = JSON.parse(saved);
      }
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        const recovery = candidate as Record<string, unknown>;
        if (!recovery.claimToken && sessionStorage.getItem('pendingOrderId') === recovery.orderId) {
          candidate = { ...recovery, claimToken: sessionStorage.getItem('pendingClaimToken') };
        }
      }
      const requestedId = new URLSearchParams(location.search).get('orderId');
      if (requestedId) {
        const cached = candidate as Record<string, unknown> | undefined;
        candidate = cached?.orderId === requestedId ? cached : { orderId: requestedId };
      }
    } catch { /* Existing recovery data remains untouched when storage is unavailable. */ }
    let active = true;
    const controller = new AbortController();
    void recoverOrderSuccessReceipt(candidate, { language, customerUid: currentUser?.uid || null, signal: controller.signal,
      getAuthToken: () => getCheckoutAuthToken(currentUser, controller.signal),
    }).then(receipt => {
      if (!active) return;
      setOrder(receipt);
      if (receipt) recordFunnelEvent('order_placed', { itemCount: receipt.items?.length });
      if (receipt) {
        try {
          const saved = JSON.stringify(receipt);
          sessionStorage.setItem('allbarka_order_success', saved);
          sessionStorage.setItem('allbarka_latest_order', saved);
        } catch { /* in-memory receipt remains available */ }
      }
    }).catch(() => { if (active) setOrder(null); }).finally(() => { if (active) setIsLoaded(true); });
    return () => { active = false; controller.abort(); };
  }, [location.state, location.search, language, currentUser, authLoading, recoveryRevision]);

  useEffect(() => {
    if (!order?.orderId || authLoading) return;
    let active = true;
    let inFlight = false;
    const controller = new AbortController();
    const candidate = { orderId: order.orderId, claimToken: order.claimToken };
    const refresh = async () => {
      if (!active || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const receipt = await refreshOrderSuccessReceipt(candidate, { language, customerUid: currentUser?.uid || null, signal: controller.signal,
          getAuthToken: () => getCheckoutAuthToken(currentUser, controller.signal) });
        if (!active) return;
        setTrackingState(receipt ? 'live' : 'unavailable');
        if (receipt) setOrder(receipt);
      } catch { if (active) setTrackingState('unavailable'); }
      finally { inFlight = false; }
    };
    setTrackingState('checking');
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, TRACKING_POLL_MS);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => { active = false; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
  }, [order?.orderId, order?.claimToken, currentUser, authLoading, language, trackingRevision]);

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
          {t('checkout.receiptUnavailable')}
        </h2>
        <p className="text-sm text-[var(--color-ink-muted,#635B52)] max-w-md mb-8 leading-relaxed">
          {t('checkout.receiptRecovery')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => setRecoveryRevision(value => value + 1)}
            className="focus-ring min-h-11 px-8 py-3.5 rounded-full border border-[var(--color-gold,#C7982F)]/40 text-[var(--color-ink,#29231D)] font-bold text-xs hover:bg-[var(--color-gold,#C7982F)]/10">
            {t('retry')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-8 py-3.5 rounded-full bg-[var(--color-ink,#29231D)] text-white dark:bg-[var(--color-gold,#C7982F)] dark:text-[var(--color-ink,#29231D)] font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
          >
            Browse Collections
          </button>
          <a
            href={buildHumanSupportWhatsAppUrl('Assalam-o-Alaikum, I would like to inquire about my AllBarka order status.')}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-full border border-[var(--color-gold,#C7982F)]/40 text-[var(--color-ink,#29231D)] font-bold text-xs hover:bg-[var(--color-gold,#C7982F)]/10 transition-all text-center flex items-center justify-center gap-2"
          >
            <MessageCircle size={15} />
            Contact Concierge
          </a>
        </div>
      </div>
    );
  }

  const whatsappUrl = buildOrderTrackingWhatsAppUrl(order.orderId);
  const isQuoteRequest = order.orderType === 'QUOTE_REQUEST';

  return (
    <div className="w-full min-h-[70vh] py-12 px-4 sm:px-6 flex justify-center items-start bg-[var(--color-base,#FDFBF7)]">
      <div className="max-w-2xl w-full bg-[var(--color-surface,#FFFCF7)] border border-[#C7982F]/35 rounded-[22px] p-6 sm:p-10 shadow-[0_12px_40px_-14px_rgba(4,40,33,0.12)] relative overflow-hidden">
        {/* AllBarka Embossed Wax-Seal Stamp Moment + 1.5s One-Time Gold Confetti (static under prefers-reduced-motion) */}
        <GoldConfettiBurst />
        <div
          data-testid="order-seal-stamp"
          className="order-seal-stamp relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#042821] border-2 border-[#C7982F] shadow-[0_10px_28px_-8px_rgba(4,40,33,0.45)]"
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-1.5 rounded-full border border-[#E4C783]/45" />
          <div className="h-11 w-11">
            <AllBarkaCrestVector />
          </div>
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#C7982F] text-[#042821] ring-2 ring-[#FFFCF7] dark:ring-[#171D1B]"
          >
            <CheckCircle size={14} strokeWidth={2.5} />
          </span>
        </div>

        <div className="text-center mb-8">
          <span className="text-xs font-medium text-[var(--color-accent-text,#806326)] dark:text-[#E4C783] block mb-1.5">
            {t(isQuoteRequest ? 'checkout.quoteReceived' : 'checkout.receiptReceived')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-[var(--color-primary,#042821)] dark:text-[#FDFBF7]">
            Thank You, {order.name.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-ink-muted,#635B52)] mt-2 max-w-md mx-auto">
            {t(isQuoteRequest ? 'checkout.quoteRequestNotice' : 'checkout.receiptSaved')}
          </p>
        </div>

        {/* Order Details Receipt Card */}
        <div className="bg-[var(--color-surface-elevated,#FFFFFF)] dark:bg-[var(--color-surface-elevated,#222A28)] border border-[var(--color-gold,#C7982F)]/20 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[var(--color-gold,#C7982F)]/15 gap-2">
            <div>
              <span className="text-[10px] font-bold text-[var(--color-ink-muted,#635B52)] block">
                Order Identifier
              </span>
              <span className="font-mono text-sm font-bold text-[#042821] dark:text-[#E8C97A]">
                {order.orderId}
              </span>
            </div>
            {!isQuoteRequest && <div className="text-right">
              <span className="text-[10px] font-bold text-[var(--color-ink-muted,#635B52)] block">
                Payment Method
              </span>
              <span className="text-xs font-bold text-[var(--color-ink,#29231D)] dark:text-[#F6F1EA]">
                {order.paymentMethod === 'bank' ? t('checkout.bank') : t('checkout.cod')}
              </span>
            </div>}
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
              <span className="text-[10px] font-bold text-[var(--color-ink-muted,#635B52)] block mb-2">
                Items ({order.items.reduce((acc, i) => acc + (i.quantity || 1), 0)})
              </span>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-[var(--color-ink,#29231D)]">
                      {item.name} {item.selectedWeight ? `(${item.selectedWeight})` : ''} <span className="text-[var(--color-ink-faint)]">× {item.quantity}</span>
                    </span>
                    {!isQuoteRequest && <span className="font-medium text-[var(--color-ink,#29231D)]">
                      {formatPKR(item.price * item.quantity)}
                    </span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals Breakdown */}
          {isQuoteRequest ? <p role="status" className="pt-4 text-sm leading-relaxed text-[var(--color-ink,#29231D)]">{t('checkout.quoteNoPayment')}</p> : <div className="pt-4 space-y-1.5 text-xs">
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
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-[var(--color-gold,#C7982F)]/20 font-bold text-sm text-[#042821] dark:text-[#E8C97A]">
              <span>{t('checkout.totalLabel', 'Total Payable')}</span>
              <span className="font-serif text-base text-[#042821] dark:text-[#E8C97A]">{formatPKR(order.totalAmount)}</span>
            </div>
          </div>}
          {!isQuoteRequest && order.promoCode && <p className="mt-3 text-xs text-[var(--color-ink,#29231D)]"><span dir="ltr">{order.promoCode}</span>: {order.freeGiftWrap ? t('checkout.promoFreeGiftWrap') : order.freeGift ? t('checkout.promoFreeGift') : order.freeShipping ? t('checkout.promoFreeShipping') : `${t('checkout.promoSaved')} ${formatPKR(order.discountAmount ?? order.discount)}`}</p>}
        </div>

        {/* Bank / Wallet Transfer Details for active BANK orders */}
        {!isQuoteRequest &&
          order.paymentMethod === 'bank' &&
          String(order.status || '').toUpperCase() !== 'DELIVERED' &&
          String(order.status || '').toUpperCase() !== 'CANCELLED' && (
            <BankTransferDetailsCard orderId={order.orderId} className="mb-6" />
          )}

        {/* Action Buttons */}
        {!isQuoteRequest && <section aria-labelledby="order-tracking-title"className="mb-6 rounded-2xl border border-[var(--color-gold,#C7982F)]/25 p-5"dir={isRtl ?'rtl':'ltr'}>
          <h2 id="order-tracking-title"className="font-serif text-xl text-[var(--color-ink)] mb-4">{t('tracking.title')}</h2>
          {order.status === 'CANCELLED' ? <p role="status"><span>{formatOrderStatusLabel('CANCELLED', t)}</span> — {t('tracking.cancelled')}</p> : <ol aria-label={t('tracking.title')} className="grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-4 mb-5">
            {TRACKING_STEPS.map((step, index) => {
              const progress = trackingProgress(order.status || '');
              return <li key={step} aria-current={progress === index ? 'step' : undefined} className="text-center min-w-0">
                <span aria-hidden="true" className={`mx-auto mb-2 flex size-8 items-center justify-center rounded-full border text-xs ${index <= progress ? 'bg-[var(--color-gold)] border-[var(--color-gold)] text-[#042821]' : 'border-[var(--color-gold)]/25 text-[var(--color-ink-muted)]'}`}>{index < progress ? '✓' : index + 1}</span>
                <span className="block text-[10px] sm:text-xs [overflow-wrap:anywhere] text-[var(--color-ink)]">{t(`tracking.${step}`)}</span>
              </li>;
            })}
          </ol>}
          <dl className="space-y-2 text-sm text-[var(--color-ink)]">
            {order.trackingNumber && <div><dt className="text-xs text-[var(--color-ink-muted)]">{t('tracking.number')}</dt><dd dir="ltr" className="font-mono break-all">{order.trackingNumber}</dd></div>}
            {order.estimatedDelivery && <div><dt className="text-xs text-[var(--color-ink-muted)]">{t('tracking.eta')}</dt><dd>{new Date(order.estimatedDelivery.length === 10 ? `${order.estimatedDelivery}T12:00:00` : order.estimatedDelivery).toLocaleDateString(language === 'ur' ? 'ur-PK' : language === 'ar' ? 'ar' : 'en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>}
            <div className="flex flex-wrap justify-between gap-2"><dt>{t('tracking.earned')}</dt><dd className="font-bold">{order.loyaltyPointsEarned || 0}</dd></div>
            {currentUser && <div className="flex flex-wrap justify-between gap-2"><dt>{t('tracking.balance')}</dt><dd className="font-bold">{order.loyaltyPointsTotal || 0}</dd></div>}
          </dl>
          {!currentUser && (order.loyaltyPointsEarned || 0) > 0 && <p className="text-xs mt-3 text-[var(--color-ink-muted)]">{t('tracking.guest')}</p>}
          <p role="status" className="mt-4 text-xs leading-relaxed text-[var(--color-ink-muted)]">{t(`tracking.${trackingState}`)}</p>
          <button type="button" onClick={() => setTrackingRevision(value => value + 1)} className="focus-ring min-h-11 mt-2 text-xs font-bold text-[var(--color-gold)]">{t('tracking.refresh')}</button>
        </section>}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3.5 px-6 rounded-full bg-emerald-700 text-white font-bold text-xs text-center flex items-center justify-center gap-2 hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <MessageCircle size={16} />
            {t('checkout.trackWhatsApp')}
          </a>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="flex-1 py-3.5 px-6 rounded-full bg-[#042821] text-[#FDFBF7] dark:bg-[#D4A843] dark:text-[#121615] font-bold text-xs text-center hover:opacity-90 transition-colors cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>

        {/* Feature A: Reorder ("Dobara Mangwayein") */}
        {!isQuoteRequest && (
          <div className="mt-4 pt-4 border-t border-[var(--color-gold,#C7982F)]/20">
            <button
              type="button"
              onClick={handleReorder}
              disabled={isReordering}
              className="focus-ring w-full py-3.5 px-6 rounded-full bg-[var(--color-emerald-dark,#042821)] hover:bg-[#073d32] dark:bg-[var(--color-gold,#C7982F)] dark:hover:bg-[#d8a83d] text-white dark:text-[#042821] font-bold text-xs text-center flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 min-h-11"
            >
              <RotateCcw size={16} />
              <span>{isReordering ? t('track.reordering', 'Adding to Bag...') : t('track.reorder', 'Dobara Mangwayein')}</span>
            </button>

            {reorderFeedback && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs space-y-1 ${
                  reorderFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : reorderFeedback.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                    : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}
                role="status"
              >
                <p className="font-semibold">{reorderFeedback.message}</p>
                {reorderFeedback.unavailableNames && reorderFeedback.unavailableNames.length > 0 && (
                  <ul className="list-disc list-inside ps-2 opacity-90">
                    {reorderFeedback.unavailableNames.map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-xs leading-relaxed text-[var(--color-ink-muted)]">{t('checkout.trackingSendNotice')}</p>
      </div>
    </div>
  );
}
