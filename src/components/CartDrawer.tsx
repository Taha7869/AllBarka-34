import { getLocalized } from '../utils/localize';
import { hamperPackingLines } from '../lib/hamperCatalog';
import React, { useEffect, useState, useId, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Truck,
  MessageCircle,
  ArrowRight
} from 'lucide-react';
import type { CartItem } from '../types';
import { PRODUCTS } from '../data/products';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { useCart, parsePrice, formatPrice, FREE_SHIPPING_THRESHOLD } from '../contexts/CartContext';
import { buildAutomatedOrderWhatsAppUrl } from '../config/contacts';
import { acquireScrollLock } from '../utils/scrollLock';
import { useLanguage } from '../contexts/LanguageContext';

const PREFERRED_PAYMENT_KEY = 'allbarka_preferred_payment';

function SafeCartImage({
  src,
  alt,
  className,
  fallbackText,
}: {
  src: string;
  alt: string;
  className: string;
  fallbackText: string;
}) {
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); }, [src]);
  if (error || !src) {
    return (
      <div
        className={`${className} bg-[#F6F1EA] dark:bg-[#222A28] flex items-center justify-center border border-[#C7982F]/25 text-[#C7982F] font-serif font-bold select-none text-base`}
      >
        {fallbackText ? fallbackText.charAt(0).toUpperCase() : 'A'}
      </div>
    );
  }
  return (
    <img
      src={src}
      className={className}
      alt={alt}
      width={960}
      height={960}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
    />
  );
}

export interface CartDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  cartItems?: CartItem[];
  onUpdateQuantity?: (id: string, weight: string, delta: number) => void;
  onRemoveItem?: (id: string, weight: string) => void;
  paymentMethod?: string;
  onSetPaymentMethod?: (method: string) => void;
  onCheckout?: () => void;
  onAddToCart?: (productId: string, weight: string) => void;
}

export default function CartDrawer({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  cartItems: propsCartItems,
  onUpdateQuantity: propsOnUpdateQuantity,
  onRemoveItem: propsOnRemoveItem,
  paymentMethod: propsPaymentMethod,
  onSetPaymentMethod: propsOnSetPaymentMethod,
  onCheckout: propsOnCheckout,
  onAddToCart: propsOnAddToCart,
}: CartDrawerProps) {
  const navigate = useNavigate();
  const { t, isRtl , language } = useLanguage();
  const mediaCover = useProductMediaCover();
  const context = useCart();
  const drawerHeadingId = useId();

  // Prefer context state, fallback to props
  const isOpen = propsIsOpen !== undefined ? propsIsOpen : context.isCartOpen;
  const closeDrawer = propsOnClose || context.closeCart;
  const cartItems = propsCartItems || context.cartItems;
  const subtotal = context.subtotal;
  const totalItemCount = context.totalItemCount;
  const remainingForFree = context.remainingForFreeShipping;
  const freeProgress = context.freeShippingProgress;
  const isFreeUnlocked = context.isFreeShippingUnlocked;
  const { shippingCity, setShippingCity, estimatedShipping } = context;

  const [selectedPayment, setSelectedPayment] = useState<string>(() => {
    if (propsPaymentMethod) return propsPaymentMethod;
    try {
      const saved = sessionStorage.getItem(PREFERRED_PAYMENT_KEY);
      if (saved === 'cod' || saved === 'bank') return saved;
    } catch { /* private mode */ }
    return 'cod';
  });

  const handlePaymentChange = (method: string) => {
    setSelectedPayment(method);
    try { sessionStorage.setItem(PREFERRED_PAYMENT_KEY, method); } catch { /* private mode */ }
    if (propsOnSetPaymentMethod) propsOnSetPaymentMethod(method);
  };

  // Reference-counted body scroll lock when drawer is active
  useEffect(() => {
    if (!isOpen) return;
    const releaseLock = acquireScrollLock();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      releaseLock();
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeDrawer]);

  const handleQuantityDelta = (item: CartItem, delta: number) => {
    if (propsOnUpdateQuantity) {
      propsOnUpdateQuantity(item.id, item.selectedWeight, delta);
    } else {
      context.updateQuantity(item.id, item.quantity + delta);
    }
  };

  const handleQuantityDirect = (item: CartItem, newQtyString: string) => {
    const parsed = parseInt(newQtyString, 10);
    const safeQty = isNaN(parsed) ? 1 : Math.max(1, Math.min(50, parsed));
    context.updateQuantity(item.id, safeQty);
  };

  const handleRemove = (item: CartItem) => {
    if (propsOnRemoveItem) {
      propsOnRemoveItem(item.id, item.selectedWeight);
    } else {
      context.removeFromCart(item.id);
    }
  };

  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      isNavigatingRef.current = false;
    }
  }, [isOpen]);

  const handleBrowseCollections = () => {
    closeDrawer();
    navigate('/shop');
  };

  const handleProceedToCheckout = () => {
    try { sessionStorage.setItem(PREFERRED_PAYMENT_KEY, selectedPayment); } catch { /* private mode */ }
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    closeDrawer();
    if (propsOnCheckout) {
      propsOnCheckout();
    } else {
      navigate('/checkout');
    }
  };

  const handleAddRecommendation = (productId: string, weight: string) => {
    if (propsOnAddToCart) {
      propsOnAddToCart(productId, weight);
    } else {
      const prod = PRODUCTS.find((p) => p.id === productId);
      if (prod) context.addToCart(prod, weight, 1);
    }
  };

  // Recommendations: up to 3 catalog items not in cart
  const recommendations = PRODUCTS.filter(
    (prod) => !cartItems.some((item) => item.productId === prod.id || item.id.startsWith(prod.id))
  ).slice(0, 3);

  // 1-Click WhatsApp Quick Checkout — encodes full cart summary for guest checkout
  const handleWhatsAppCheckout = () => {
    if (cartItems.length === 0) return;
    const shippingCost = estimatedShipping;
    const estimatedTotal = shippingCost === null ? null : subtotal + shippingCost;

    // Build line-by-line cart summary
    const lines = cartItems.map((item) => {
      const itemUnit = parsePrice(item.unitPrice || item.price);
      const itemTotal = itemUnit * item.quantity;
      return [`• ${getLocalized(item, 'name', language)} (${item.selectedWeight}) × ${item.quantity} = Rs. ${itemTotal.toLocaleString()}`, ...hamperPackingLines(item.hamperConfiguration, language)].join('\n');
    });

    const shippingLine = `Delivery to ${shippingCity}: ${shippingCost === null ? 'confirmation required' : `Rs. ${shippingCost}`} (estimate)`;

    const messageLines = [
      'Assalam-o-Alaikum AllBarka! 🌿',
      'I would like to place the following order:',
      '',
      ...lines,
      '',
      `Subtotal: Rs. ${subtotal.toLocaleString()}`,
      shippingLine,
      estimatedTotal === null ? 'Please confirm the delivery charge and final total.' : `*Estimated total: Rs. ${estimatedTotal.toLocaleString()}*`,
      '',
      'Please confirm availability and share payment/delivery details. Shukriya! 🙏',
    ];

    window.open(buildAutomatedOrderWhatsAppUrl(messageLines.join('\n')), '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-[9990] flex overflow-hidden ${isRtl ? 'justify-start' : 'justify-end'}`}>
          {/* Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeDrawer}
            aria-hidden="true"
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] cursor-pointer"
          />

          {/* Slideout Drawer Container: Full screen on <640px and max-w-md on desktop */}
          <motion.aside
            initial={{ x: isRtl ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRtl ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerHeadingId}
            dir={isRtl ? 'rtl' : 'ltr'}
            className={`w-full sm:max-w-md bg-[#F6F1EA] dark:bg-[#121615] h-full relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden text-[#29231D] dark:text-[#F6F1EA] ${isRtl ? 'border-r' : 'border-l'} border-[#C7982F]/25 pb-[env(safe-area-inset-bottom)]`}
          >
            {/* ── 1. Top Fixed Header ── */}
            <div className="bg-[#FFFCF7] dark:bg-[#1A201E] border-b border-[#C7982F]/25 px-4 sm:px-5 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#F6F1EA] dark:bg-[#222A28] border border-[#C7982F]/40 flex items-center justify-center text-[#C7982F] relative shadow-xs shrink-0">
                  <ShoppingCart size={19} />
                  {totalItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#C7982F] text-[#042821] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#FFFCF7] dark:border-[#1A201E] shadow-xs">
                      {totalItemCount}
                    </span>
                  )}
                </div>
                <div>
                  <h2
                    id={drawerHeadingId}
                    className="text-lg font-serif font-bold text-[#29231D] dark:text-[#F6F1EA] leading-tight"
                  >
                    Your Luxury Box
                  </h2>
                  <p className="text-[10px] text-[#806326] dark:text-[#E4C783] font-semibold uppercase tracking-widest leading-none mt-1">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} curated
                  </p>
                </div>
              </div>

              {/* Accessible Close Button (Min 44x44px touch target) */}
              <button
                type="button"
                onClick={closeDrawer}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#F6F1EA] dark:bg-[#222A28] hover:bg-[#C7982F] text-[#29231D] dark:text-[#F6F1EA] hover:text-[#042821] flex items-center justify-center transition-all duration-200 cursor-pointer focus-ring shadow-xs border border-[#29231D]/10 dark:border-[#F6F1EA]/10"
                aria-label="Close cart drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Free Delivery Status Bar ── */}
            {cartItems.length > 0 && shippingCity === 'Lahore' && (
              <div className="bg-[#FFFCF7]/90 dark:bg-[#1A201E]/90 border-b border-[#29231D]/10 dark:border-[#F6F1EA]/10 px-4 sm:px-5 py-3 shrink-0">
                <div className="flex items-center justify-between text-xs font-medium text-[#29231D] dark:text-[#F6F1EA] mb-2">
                  <span className="flex items-center gap-1.5 font-semibold text-[11px] sm:text-xs">
                    <Truck size={14} className="text-[#C7982F] shrink-0" />
                    {isFreeUnlocked ? (
                      <span className="text-[#042821] dark:text-[#E4C783] font-bold flex items-center gap-1">
                        <Sparkles size={12} className="text-[#C7982F]" />
                        {t('freeShippingUnlocked')}
                      </span>
                    ) : (
                      <span>
                        {t('freeShippingHint').replace('{amount}', remainingForFree.toLocaleString())}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-[#806326] dark:text-[#E4C783] font-bold shrink-0 pl-2">
                    {freeProgress}%
                  </span>
                </div>
                <div className="h-2 w-full bg-[#ECE5DC] dark:bg-[#0D1110] border border-[#C7982F]/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C7982F] via-[#E4C783] to-[#C7982F] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${freeProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── 2. Scrollable Middle Area ── */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3.5 sm:p-4 space-y-4 [scrollbar-width:thin] overscroll-contain">
              {cartItems.length === 0 ? (
                /* Empty State */
                <div className="text-center py-16 px-4 flex flex-col items-center justify-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-[#FFFCF7] dark:bg-[#1A201E] border border-[#C7982F]/40 flex items-center justify-center text-[#C7982F] shadow-sm">
                    <ShoppingBag size={34} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#29231D] dark:text-[#F6F1EA]">
                      Your box is empty
                    </h3>
                    <p className="text-xs text-[#635B52] dark:text-[#A8A199] mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                      Handpicked Afghani chilgoza, Iranian pistachios, and Hunza dry fruits are waiting for you.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBrowseCollections}
                    className="mt-3 px-8 py-3.5 min-h-[44px] rounded-full bg-[#042821] dark:bg-[#0E4A3B] hover:bg-[#03201A] text-[#FFFCF7] text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer border border-[#C7982F]/40 flex items-center justify-center gap-2 focus-ring"
                  >
                    <ShoppingBag size={15} className="text-[#C7982F]" />
                    <span>Browse Collections</span>
                  </button>
                </div>
              ) : (
                /* Item Rows */
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const itemUnitPrice = parsePrice(item.unitPrice || item.price);
                    const itemTotalPrice = itemUnitPrice * item.quantity;
                    const matchedProduct = PRODUCTS.find((p) => p.id === item.productId || p.id === item.id);
                    const imageSource = mediaCover(matchedProduct, item.image || '');

                    return (
                      <div
                        key={item.id}
                        className="flex gap-3 p-3 bg-[#FFFCF7] dark:bg-[#1A201E] rounded-2xl border border-[#29231D]/10 dark:border-[#F6F1EA]/12 items-center shadow-xs hover:border-[#C7982F]/60 transition-all"
                      >
                        <SafeCartImage
                          src={imageSource}
                          alt={t(`imageAlt.${item.productId || item.slug}`, getLocalized(item, 'name', language))}
                          className="w-16 h-16 object-cover rounded-xl shrink-0 bg-[#F6F1EA] dark:bg-[#222A28] border border-[#29231D]/8 dark:border-[#F6F1EA]/10"
                          fallbackText={getLocalized(item, 'name', language)}
                        />

                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif font-bold text-[#29231D] dark:text-[#F6F1EA] text-sm truncate leading-tight">
                            {getLocalized(item, 'name', language)}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[#F6F1EA] dark:bg-[#222A28] border border-[#29231D]/10 dark:border-[#F6F1EA]/10 text-[#635B52] dark:text-[#A8A199] text-[9.5px] font-semibold uppercase tracking-wider">
                              {item.selectedWeight}
                            </span>
                            <span className="text-[11px] font-semibold text-[#806326] dark:text-[#E4C783]">
                              {formatPrice(itemUnitPrice)}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#29231D] dark:text-[#F6F1EA] mt-1 font-serif">
                            Total: {formatPrice(itemTotalPrice)}
                          </p>
                        </div>

                        {/* Quantity controls: strictly enforces 44x44px minimum touch targets */}
                        <div className="flex items-center bg-[#F6F1EA] dark:bg-[#222A28] rounded-xl border border-[#29231D]/10 dark:border-[#F6F1EA]/10 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuantityDelta(item, -1)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] bg-[#FFFCF7] dark:bg-[#1A201E] text-[#29231D] dark:text-[#F6F1EA] flex items-center justify-center rounded-lg hover:bg-[#C7982F] hover:text-[#042821] transition-all active:scale-95 shadow-xs cursor-pointer border border-[#29231D]/10 dark:border-[#F6F1EA]/10 focus-ring"
                            aria-label={
                              item.quantity === 1
                                ? `Remove ${getLocalized(item, 'name', language)} from cart`
                                : `Decrease quantity of ${getLocalized(item, 'name', language)}`
                            }
                          >
                            <Minus size={14} />
                          </button>

                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={item.quantity}
                            onChange={(e) => handleQuantityDirect(item, e.target.value)}
                            className="w-8 text-center bg-transparent font-mono text-sm font-bold text-[#29231D] dark:text-[#F6F1EA] focus:outline-hidden"
                            aria-label={`Quantity for ${getLocalized(item, 'name', language)}`}
                          />

                          <button
                            type="button"
                            onClick={() => handleQuantityDelta(item, 1)}
                            disabled={item.quantity >= 50}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] bg-[#FFFCF7] dark:bg-[#1A201E] text-[#29231D] dark:text-[#F6F1EA] flex items-center justify-center rounded-lg hover:bg-[#C7982F] hover:text-[#042821] transition-all active:scale-95 shadow-xs cursor-pointer border border-[#29231D]/10 dark:border-[#F6F1EA]/10 disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
                            aria-label={`Increase quantity of ${getLocalized(item, 'name', language)}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Accessible Remove Button (44x44px touch target) */}
                        <button
                          type="button"
                          onClick={() => handleRemove(item)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-xl transition-colors shrink-0 cursor-pointer focus-ring"
                          aria-label={`Remove ${getLocalized(item, 'name', language)} (${item.selectedWeight}) from cart`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cross-Sell Recommendations */}
              {recommendations.length > 0 && cartItems.length > 0 && (
                <div className="pt-3 border-t border-[#29231D]/10 dark:border-[#F6F1EA]/12 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-[#29231D] dark:text-[#F6F1EA] text-sm flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#C7982F]" />
                      You Might Also Like
                    </h3>
                    <span className="text-[10px] font-semibold text-[#806326] dark:text-[#E4C783] uppercase tracking-wider">
                      Pair & Save
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {recommendations.map((prod) => {
                      const firstWeight = Object.keys(prod.prices)[0] || '250g';
                      const initialPrice = parsePrice(prod.prices[firstWeight] || prod.wholesale);

                      return (
                        <div
                          key={prod.id}
                          className="p-2.5 rounded-xl bg-[#FFFCF7] dark:bg-[#1A201E] border border-[#29231D]/10 dark:border-[#F6F1EA]/12 flex flex-col justify-between items-start gap-1.5 hover:shadow-xs hover:border-[#C7982F]/60 transition-all group text-left"
                        >
                          <div className="w-full relative aspect-4/3 rounded-lg overflow-hidden bg-[#F6F1EA] dark:bg-[#222A28] shrink-0 border border-[#29231D]/8 dark:border-[#F6F1EA]/8">
                            <SafeCartImage
                              src={mediaCover(prod)}
                              alt={t(`imageAlt.${prod.id}`, getLocalized(prod, 'name', language))}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              fallbackText={getLocalized(prod, 'name', language)}
                            />
                          </div>
                          <div className="w-full min-w-0">
                            <h4 className="font-serif font-bold text-[#29231D] dark:text-[#F6F1EA] text-xs truncate leading-tight">
                              {getLocalized(prod, 'name', language)}
                            </h4>
                            <p className="text-[9px] text-[#806326] dark:text-[#E4C783] uppercase tracking-wider font-semibold">
                              {firstWeight}
                            </p>
                          </div>
                          <div className="w-full flex items-center justify-between mt-0.5">
                            <span className="text-xs font-serif font-bold text-[#29231D] dark:text-[#F6F1EA]">
                              {formatPrice(initialPrice)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddRecommendation(prod.id, firstWeight)}
                              className="min-h-[36px] px-3 py-1.5 rounded-md bg-[#042821] dark:bg-[#0E4A3B] hover:bg-[#03201A] text-[#FFFCF7] text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-xs border border-[#C7982F]/40 focus-ring"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button type="button" onClick={() => { closeDrawer(); navigate('/cart'); }} className="focus-ring min-h-11 shrink-0 border-t border-[var(--color-border)] px-5 py-2 text-sm font-semibold text-[var(--color-accent-text)] underline underline-offset-4">{t('cart.boxTools')}</button>

            {/* ── 3. Sticky Bottom Summary ── */}
            {cartItems.length > 0 && (
              <div className="p-4 border-t border-[#29231D]/10 dark:border-[#F6F1EA]/12 bg-[#FFFCF7] dark:bg-[#1A201E] shrink-0 space-y-3 shadow-lg">
                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#635B52] dark:text-[#A8A199] uppercase tracking-widest block">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePaymentChange('cod')}
                      className={`min-h-[44px] py-2 px-3 rounded-xl text-[11px] font-bold tracking-wider uppercase transition-all border cursor-pointer focus-ring flex items-center justify-center ${
                        selectedPayment === 'cod'
                          ? 'bg-[#042821] dark:bg-[#0E4A3B] text-[#FFFCF7] border-[#042821] dark:border-[#0E4A3B] shadow-xs'
                          : 'bg-[#F6F1EA] dark:bg-[#222A28] text-[#29231D] dark:text-[#F6F1EA] border-[#29231D]/10 dark:border-[#F6F1EA]/10 hover:border-[#C7982F]'
                      }`}
                    >
                      Cash on Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaymentChange('bank')}
                      className={`min-h-[44px] py-2 px-3 rounded-xl text-[11px] font-bold tracking-wider uppercase transition-all border cursor-pointer focus-ring flex items-center justify-center ${
                        selectedPayment === 'bank'
                          ? 'bg-[#042821] dark:bg-[#0E4A3B] text-[#FFFCF7] border-[#042821] dark:border-[#0E4A3B] shadow-xs'
                          : 'bg-[#F6F1EA] dark:bg-[#222A28] text-[#29231D] dark:text-[#F6F1EA] border-[#29231D]/10 dark:border-[#F6F1EA]/10 hover:border-[#C7982F]'
                      }`}
                    >
                      Bank / Raast
                    </button>
                  </div>
                </div>

                {/* Financial Summary */}
                <label className="block space-y-2 text-xs font-semibold">
                  <span>{t('shipping.destination')}</span>
                  <select className="focus-ring min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3" value={shippingCity === 'Lahore' ? 'Lahore' : 'Other City'} onChange={event => setShippingCity(event.target.value)}>
                    <option value="Lahore">{t('shipping.lahore')}</option>
                    <option value="Other City">{t('shipping.outside')}</option>
                  </select>
                </label>
                <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{t(shippingCity === 'Lahore' ? 'shipping.lahoreRule' : 'shipping.nationwideRule')}</p>
                <div className="space-y-1.5 text-xs text-[#29231D] dark:text-[#F6F1EA] pt-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#635B52] dark:text-[#A8A199]">{t('cartSubtotal', 'Subtotal')}</span>
                    <span className="font-bold text-[#29231D] dark:text-[#F6F1EA] font-mono">
                      <bdi dir="ltr">{formatPrice(subtotal)}</bdi>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#635B52] dark:text-[#A8A199]">
                      {t('shippingFee', 'Shipping Fee')}
                    </span>
                    <span className="font-bold text-[#806326] dark:text-[#E4C783]">
                      {estimatedShipping === null ? t('shipping.pending') : estimatedShipping === 0 ? t('shipping.free') : <bdi dir="ltr">{formatPrice(estimatedShipping)}</bdi>}
                    </span>
                  </div>
                  <div className="h-px bg-[#29231D]/10 dark:bg-[#F6F1EA]/10 my-1" />
                  <div className="flex justify-between items-baseline font-serif font-bold text-[#29231D] dark:text-[#F6F1EA]">
                    <span className="text-sm">{t('totalPayable', 'Estimated Total')}</span>
                    <span className="text-[#806326] dark:text-[#E4C783] text-lg font-mono">
                      <bdi dir="ltr">{estimatedShipping === null ? t('shipping.pending') : formatPrice(subtotal + estimatedShipping)}</bdi>
                    </span>
                  </div>
                </div>

                {/* Loyalty / Auth Catch */}
                <div className="flex items-center justify-between bg-[#F6F1EA] dark:bg-[#222A28] border border-[#C7982F]/30 p-2.5 rounded-xl">
                  <span className="text-[10px] text-[#635B52] dark:text-[#A8A199] font-medium leading-tight">
                    Log in to earn loyalty points<br className="sm:hidden" />
                    <span dir="rtl" className="sm:ml-1 text-[11px] font-sans">لائلٹی پوائنٹس کمانے کے لیے لاگ ان کریں</span>
                  </span>
                  <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))} className="text-[10px] uppercase font-bold text-[#806326] dark:text-[#E4C783] hover:underline whitespace-nowrap cursor-pointer">
                    Sign In
                  </button>
                </div>

                {/* Primary Checkout CTA */}
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="w-full min-h-[48px] py-3.5 px-5 rounded-full bg-[#1E3A2B] hover:bg-[#14281E] text-[#FDFBF7] text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-98 flex items-center justify-center gap-2.5 border border-[#C7982F]/40 cursor-pointer focus-ring"
                >
                  <ShoppingBag size={16} className="text-[#C7982F]" />
                  <span>{t('proceedToCheckout', 'Proceed to Checkout')}</span>
                  <ArrowRight size={15} className="text-[#FDFBF7]" />
                </button>

                {/* Secondary WhatsApp Quick Order */}
                <button
                  type="button"
                  onClick={handleWhatsAppCheckout}
                  className="w-full min-h-[44px] py-3 px-5 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#1E3A2B] dark:text-[#E4C783] text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 border border-[#25D366]/40 cursor-pointer focus-ring"
                >
                  <MessageCircle size={15} className="text-[#25D366]" />
                  <span>Order via WhatsApp</span>
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
