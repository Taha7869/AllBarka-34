import React, { useState, useEffect, useId } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  PackageCheck,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  XCircle,
  Sparkles,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { PRODUCTS } from '../data/products';
import SEO from '../components/SEO';
import {
  fetchOrderTracking,
  fetchReorderItems,
  type PublicOrderTrackingResult,
} from '../lib/orderTrackingService';

export default function OrderTrackingPage() {
  const { t, language, isRtl } = useLanguage();
  const [searchParams] = useSearchParams();
  const orderIdInputId = useId();
  const phoneInputId = useId();

  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<PublicOrderTrackingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { addToCart, setIsCartOpen } = useCart();
  const [isReordering, setIsReordering] = useState(false);
  const [reorderFeedback, setReorderFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    unavailableNames?: string[];
  } | null>(null);

  const handleReorder = async () => {
    const cleanOrderId = orderId.trim();
    const cleanPhone = phoneLast4.trim();
    if (!cleanOrderId || !/^\d{4}$/.test(cleanPhone)) return;

    setIsReordering(true);
    setReorderFeedback(null);
    try {
      const res = await fetchReorderItems(cleanOrderId, cleanPhone);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOrderId = orderId.trim();
    const cleanPhone = phoneLast4.trim();

    if (!cleanOrderId) {
      setErrorMessage(t('track.orderIdRequired', 'Please enter your order number.'));
      return;
    }

    if (!/^\d{4}$/.test(cleanPhone)) {
      setErrorMessage(t('track.phoneInvalid', 'Please enter the exact last 4 digits of your phone number.'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setTrackingResult(null);

    try {
      const data = await fetchOrderTracking(cleanOrderId, cleanPhone);
      setTrackingResult(data);
    } catch (err: any) {
      if (err?.message === 'ORDER_NOT_FOUND') {
        setErrorMessage(t('track.notFound', 'No order found matching this order number and phone combination. Please verify your details.'));
      } else if (err?.message === 'RATE_LIMITED') {
        setErrorMessage(t('track.rateLimited', 'Too many tracking requests. Please try again shortly.'));
      } else {
        setErrorMessage(t('track.error', 'Unable to retrieve order status. Please try again or contact concierge.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (status: string, isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted) {
      return <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />;
    }
    if (isCurrent) {
      return <Clock size={18} className="text-[#C7982F] animate-pulse" />;
    }
    switch (status) {
      case 'ORDER_RECEIVED':
        return <PackageCheck size={16} className="text-neutral-400" />;
      case 'CONFIRMED':
        return <ShieldCheck size={16} className="text-neutral-400" />;
      case 'PREPARING':
        return <Box size={16} className="text-neutral-400" />;
      case 'DISPATCHED':
      case 'OUT_FOR_DELIVERY':
        return <Truck size={16} className="text-neutral-400" />;
      case 'DELIVERED':
        return <Sparkles size={16} className="text-neutral-400" />;
      default:
        return <Clock size={16} className="text-neutral-400" />;
    }
  };

  return (
    <div className="w-full bg-[var(--color-base,#F6F1EA)] min-h-[80vh] py-8 sm:py-14" dir={isRtl ? 'rtl' : 'ltr'}>
      <SEO
        title={`${t('track.title', 'Track Your Order')} — AllBarka`}
        description={t('track.subtitle', 'Enter your order number and phone last 4 digits to check live status.')}
        canonicalPath="/track"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#042821]/10 dark:bg-emerald-950/60 border border-[#D4AF37]/35 text-[#042821] dark:text-[#E4C783] text-xs font-bold uppercase tracking-widest">
            <Truck size={14} />
            <span>{t('track.eyebrow', 'Boutique Order Tracker')}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#042821] dark:text-[#FAF9F5]">
            {t('track.title', 'Track Your Order')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 max-w-lg mx-auto">
            {t('track.subtitle', 'Enter your order number and the last 4 digits of your phone number to check live fulfillment status.')}
          </p>
        </header>

        {/* Tracking Input Card */}
        <section className="bg-white dark:bg-zinc-800/90 rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-lg space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Order Number Input */}
              <div>
                <label
                  htmlFor={orderIdInputId}
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
                >
                  {t('track.orderIdLabel', 'Order Number')}
                </label>
                <input
                  id={orderIdInputId}
                  type="text"
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder={t('track.orderIdPlaceholder', 'E.g. AB-12345')}
                  className="w-full rounded-xl border border-neutral-300 dark:border-zinc-600 bg-neutral-50 dark:bg-zinc-700 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus-ring min-h-[44px]"
                  aria-describedby="order-id-hint"
                />
              </div>

              {/* Phone Last 4 Digits */}
              <div>
                <label
                  htmlFor={phoneInputId}
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
                >
                  {t('track.phoneLabel', 'Last 4 Digits of Phone Number')}
                </label>
                <input
                  id={phoneInputId}
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={phoneLast4}
                  onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder={t('track.phonePlaceholder', 'E.g. 5678')}
                  className="w-full rounded-xl border border-neutral-300 dark:border-zinc-600 bg-neutral-50 dark:bg-zinc-700 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus-ring min-h-[44px]"
                />
              </div>
            </div>

            {/* Error Feedback */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs"
              >
                <AlertCircle size={16} className="shrink-0 text-amber-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !orderId.trim() || phoneLast4.length !== 4}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold uppercase tracking-wider bg-[#042821] hover:bg-[#074b39] text-[#FAF9F5] transition-all focus-ring min-h-[44px] shadow-md cursor-pointer disabled:opacity-50"
            >
              <Search size={16} />
              <span>{isLoading ? t('track.searching', 'Retrieving status...') : t('track.submitButton', 'Track Order')}</span>
            </button>
          </form>

          {/* Privacy Notice */}
          <div className="flex items-start gap-2 pt-2 border-t border-neutral-100 dark:border-zinc-700/60 text-[11px] text-neutral-500 dark:text-neutral-400">
            <ShieldCheck size={16} className="shrink-0 text-[#C7982F] mt-0.5" />
            <p>{t('track.privacyNote', 'For your security, this public tracking view shows fulfillment status only and never displays names, addresses, or items.')}</p>
          </div>
        </section>

        {/* Tracking Result View */}
        {trackingResult && (
          <section
            data-testid="order-tracking-result"
            className="bg-white dark:bg-zinc-800/90 rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/35 shadow-xl space-y-6 animate-fadeIn"
          >
            {/* Header with Order Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D4AF37]/20 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#042821] dark:text-[#E4C783]">
                  {t('track.orderNumber', 'Order Reference')}
                </span>
                <h2 className="text-xl sm:text-2xl font-mono font-bold text-[#120F17] dark:text-[#FAF9F5]">
                  #{trackingResult.orderId}
                </h2>
                {trackingResult.createdAt && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {t('track.orderDate', 'Order Date')}: {new Date(trackingResult.createdAt).toLocaleDateString(language === 'ur' ? 'ur-PK' : language === 'ar' ? 'ar-SA' : 'en-PK', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {trackingResult.isCancelled ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300">
                    <XCircle size={14} />
                    {t('order.status.CANCELLED', 'Cancelled')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                    <CheckCircle2 size={14} />
                    {t(`order.status.${trackingResult.status}`, String(trackingResult.status))}
                  </span>
                )}
              </div>
            </div>

            {/* Cancelled Banner */}
            {trackingResult.isCancelled ? (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs">
                {t('track.cancelledNotice', 'This order has been cancelled. Please contact our boutique support if you have questions.')}
              </div>
            ) : (
              /* Status Timeline Stepper */
              <div className="py-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-6">
                  {t('track.currentStatus', 'Fulfillment Timeline')}
                </h3>

                <ol className="relative border-s border-neutral-200 dark:border-zinc-700 ms-4 space-y-6">
                  {trackingResult.timeline.map((step, idx) => {
                    const isCompleted = step.completed;
                    const isCurrent = step.current;

                    return (
                      <li key={step.status} className="ms-6 relative">
                        {/* Step Icon Node */}
                        <span
                          className={`absolute -start-9 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all ${
                            isCompleted
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500'
                              : isCurrent
                              ? 'bg-[#FFFCF7] dark:bg-zinc-800 border-[#C7982F] ring-4 ring-[#C7982F]/20'
                              : 'bg-neutral-100 dark:bg-zinc-800 border-neutral-300 dark:border-zinc-600'
                          }`}
                        >
                          {getStepIcon(step.status, isCompleted, isCurrent)}
                        </span>

                        {/* Step Details */}
                        <div className="space-y-0.5">
                          <h4
                            className={`text-sm font-semibold ${
                              isCurrent
                                ? 'text-[#042821] dark:text-[#E4C783] font-bold text-base'
                                : isCompleted
                                ? 'text-neutral-800 dark:text-neutral-200'
                                : 'text-neutral-400 dark:text-neutral-500'
                            }`}
                          >
                            {t(step.key, step.status.replace(/_/g, ' '))}
                          </h4>

                          {isCurrent && (
                            <span className="inline-block text-[11px] font-medium text-[#C7982F] bg-[#C7982F]/10 px-2 py-0.5 rounded-md mt-0.5">
                              {t('track.inProgress', 'Active Stage')}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {/* Reorder Card ("Dobara mangwayein") */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#042821]/5 dark:bg-emerald-950/30 border border-[#D4AF37]/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RotateCcw size={16} className="text-[#C7982F]" />
                    <h4 className="text-sm font-bold text-[#042821] dark:text-[#FAF9F5]">
                      {t('track.reorder', 'Dobara Mangwayein')}
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">
                    {t('track.reorderSubtitle', 'Add these items to your bag at current boutique prices')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReorder}
                  disabled={isReordering}
                  className="focus-ring inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#042821] hover:bg-[#073d32] dark:bg-[#C7982F] dark:hover:bg-[#d8a83d] text-[#FAF9F5] dark:text-[#042821] text-xs font-bold transition-all disabled:opacity-50 min-h-11 shrink-0"
                >
                  <ShoppingBag size={14} />
                  <span>{isReordering ? t('track.reordering', 'Adding to Bag...') : t('track.reorder', 'Dobara Mangwayein')}</span>
                </button>
              </div>

              {/* Reorder feedback message */}
              {reorderFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs space-y-1 ${
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

            {/* Quick Actions Footer */}
            <div className="pt-4 border-t border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-[#042821] dark:text-[#E4C783] font-semibold hover:underline"
              >
                <span>{t('continueShopping', 'Continue Shopping')}</span>
                <ArrowRight size={14} />
              </Link>

              <Link
                to="/contact"
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                {t('needAssistance', 'Need assistance with this order?')}
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
