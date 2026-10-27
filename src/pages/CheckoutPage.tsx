import { usePrefersReducedMotion as useReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { getLocalized } from '../utils/localize';
import React, { useState, useEffect } from 'react';
import { calculateOrderSummary, GIFT_WRAP_FEE, type PricingSummary } from '../lib/pricing';
import { readCheckoutDraft, CHECKOUT_DRAFT_KEY } from '../lib/checkoutPreferences';
import { acceptedCheckoutReceipt, appliedPromotionMessage } from '../lib/checkoutReceipt';
import { checkoutFingerprint, checkoutQuoteKey, getCheckoutAuthToken, CheckoutAuthenticationError, clearCheckoutAttempt, persistCheckoutAttempt, readCheckoutAttempt, resolveCheckoutAttempt, writeCheckoutSession, type CheckoutAttempt } from '../lib/checkoutAttempt';
import { checkoutReliabilityTranslations } from '../contexts/checkoutReliabilityTranslations';
import CartItemPersonalization from '../components/CartItemPersonalization';
import AddressBook from '../components/AddressBook';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle,
  LoaderCircle,
  Clock,
  Gift,
  Sparkles,
  ShieldCheck,
  MapPin,
  Tag,
  Navigation,
  Crosshair,
  Check,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  User,
  Phone,
  CreditCard,
  Building2,
  Truck,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Sun,
  Sunset,
  Moon,
  Zap,
  Lock,
  Crown,
  MessageCircle
} from 'lucide-react';
import { CartItem, ShippingMethodId } from '../types';
import ShippingMethodSelector, { SHIPPING_METHODS, calculateShippingFee } from '../components/ShippingMethodSelector';
import { calculateFinalTotal } from '../lib/pricing';
import { useAuth } from '../contexts/AuthContext';
import { useCart, parsePrice, formatPrice } from '../contexts/CartContext';
import { STORE_CONFIG } from '../config/store';
import { buildOrderTrackingWhatsAppUrl, buildHumanSupportWhatsAppUrl } from '../config/contacts';
import { placeOrder, getOrderQuote, type OrderPayload } from '../lib/order';
import { useLanguage } from '../contexts/LanguageContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { PRODUCTS } from '../data/products';
import { fetchLoyaltyProfile } from '../lib/loyaltyClient';
import type { IssuedPatronReward } from '../lib/rewardPolicy';

// Popular Lahore Neighborhoods for Rapid Delivery Pinning

const PREFERRED_PAYMENT_KEY = 'allbarka_preferred_payment';
const DELIVERY_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Peshawar', 'Multan'];
const isPlaceholderCity = (city: string) => /^(other city|outside lahore|nationwide)$/i.test(city.trim());

export type CheckoutStep = 'details' | 'shipping' | 'payment' | 'review' | 'success';

interface CheckoutPageProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

export default function CheckoutPage({ isOpen, onClose: propsOnClose, onOpenAuth: propsOnOpenAuth }: CheckoutPageProps = {}) {
  const PRODUCTS = useCatalogProducts();
  const navigate = useNavigate();
  const { cartItems, clearCart, shippingCity, setShippingCity } = useCart();
  const { patronProfile, currentUser, loading: authLoading } = useAuth();
  const onOpenAuth = propsOnOpenAuth || (() => {});
  const { language, t: storefrontTranslation } = useLanguage();
  const t = React.useCallback((key: string, fallback = '') => checkoutReliabilityTranslations[language][key] || storefrontTranslation(key, fallback), [language, storefrontTranslation]);
  const mediaCover = useProductMediaCover();
  const [summaryExpanded, setSummaryExpanded] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width:1024px)').matches);
  useEffect(() => { if (typeof window.matchMedia !== 'function') return; const media=window.matchMedia('(min-width:1024px)'); const update=()=>setSummaryExpanded(media.matches); media.addEventListener('change',update); return()=>media.removeEventListener('change',update); }, []);
  const online = useOnlineStatus();
  const reduceMotion = useReducedMotion();
  const [restoredDraft] = useState(readCheckoutDraft);
  const [draftNotice, setDraftNotice] = useState(!!restoredDraft);
  const checkoutAttemptRef = React.useRef<CheckoutAttempt | null>(null);
  const submissionRequestRef = React.useRef<AbortController | null>(null);
  const couponRequestRef = React.useRef<AbortController | null>(null);
  const identityRef = React.useRef<string | null>(null);
  identityRef.current = currentUser?.uid || null;
  const isWholesale = false;
  // Customers explicitly choose a reward; the server validates its benefit again.
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

  // 1. All Hooks declared unconditionally at the top (Rules of Hooks)
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('details');
  const [orderItemsSnapshot, setOrderItemsSnapshot] = useState<CartItem[]>([]);
  const [savedTotals, setSavedTotals] = useState<{
    subtotal: number;
    finalPayable: number;
    shippingFee: number;
    discountAmt: number;
    giftFee: number;
  } | null>(null);
  const [orderSuccessResult, setOrderSuccessResult] = useState<{ orderId: string; whatsappUrl: string; claimToken?: string; isQuoteRequest: boolean } | null>(null);

  const selectedShippingMethod = 'standard';
  const [internalShippingMethod, setInternalShippingMethod] = useState<ShippingMethodId>(restoredDraft?.shipping || selectedShippingMethod);
  const activeShippingMethod = internalShippingMethod;
  const [selectedPayment, setSelectedPayment] = useState<string>(() => {
    try {
      const saved = restoredDraft?.payment || sessionStorage.getItem(PREFERRED_PAYMENT_KEY);
      if (saved === 'cod' || saved === 'bank') return saved;
    } catch { /* private mode */ }
    return 'cod';
  });

  const [formData, setFormData] = useState(() => ({
    name: restoredDraft?.customer.name || patronProfile?.name || '',
    phone: restoredDraft?.customer.phone || patronProfile?.phone || '',
    address: restoredDraft?.customer.address || '',
    city: isPlaceholderCity(shippingCity) ? '' : shippingCity,
    deliverySlot: restoredDraft?.customer.deliverySlot || 'Fastest Dispatch',
    giftWrapping: restoredDraft?.customer.giftWrapping || false,
    giftMessage: restoredDraft?.customer.giftMessage || '',
    instructions: restoredDraft?.customer.instructions || ''
  }));

  const [couponCode, setCouponCode] = useState(restoredDraft?.coupon || '');
  const [appliedCoupon, setAppliedCoupon] = useState(restoredDraft?.coupon || '');
  const [quote, setQuote] = useState<{ key: string; totals: PricingSummary; items?: any[] } | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteRefresh, setQuoteRefresh] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState<string | null>(null);
  const [couponErrorMsg, setCouponErrorMsg] = useState<string | null>(null);
  const [isQuoteRequestMode, setIsQuoteRequestMode] = useState(false);
  const [activeRewards, setActiveRewards] = useState<IssuedPatronReward[]>([]);

  const quoteKey = checkoutQuoteKey({ items: cartItems, city: formData.city, shippingMethodId: activeShippingMethod, giftWrapping: formData.giftWrapping, discountCode: appliedCoupon, rewardId: selectedRewardId, isWholesale }, currentUser?.uid || null);
  const pricingKeyRef = React.useRef(quoteKey);
  pricingKeyRef.current = quoteKey;
  const quoteStatusRef = React.useRef({ quote, loading: quoteLoading });
  quoteStatusRef.current = { quote, loading: quoteLoading };
  useEffect(() => () => { submissionRequestRef.current?.abort(); couponRequestRef.current?.abort(); }, [currentUser?.uid]);
  useEffect(() => { setShippingCity(formData.city); }, [formData.city, setShippingCity]);
  useEffect(() => {
    setQuote(null);
    setQuoteError('');
    if (!online || !cartItems.length || authLoading) { setQuoteLoading(false); return; }
    if (formData.city.trim().length < 2 || isPlaceholderCity(formData.city)) { setQuoteLoading(false); setQuoteError(t('shipping.enterCity')); return; }
    let active = true;
    const controller = new AbortController();
    setQuoteLoading(true); setQuoteError('');
    const timer = setTimeout(async () => {
      try {
        const authToken = await getCheckoutAuthToken(currentUser, controller.signal);
        if (!active || controller.signal.aborted) return;
        const result = await getOrderQuote({ items: cartItems, city: formData.city, shippingMethodId: activeShippingMethod, giftWrapping: formData.giftWrapping, discountCode: appliedCoupon, rewardId: selectedRewardId, isWholesale, authToken, signal: controller.signal });
        if (!active) return;
        if (result.success && result.totals) {
          setQuote({ key: quoteKey, totals: result.totals, items: result.items }); setIsQuoteRequestMode(result.totals.isQuoteRequest === true);
          if (appliedCoupon) setCouponErrorMsg(null);
        }
        else {
          const message = result.code === 'TIMEOUT' ? t('checkout.quoteTimeout', 'The price check timed out. Please retry.') : result.error || t('checkout.quoteFailed');
          setQuoteError(message);
          if (appliedCoupon) { setCouponSuccessMsg(null); setCouponErrorMsg(message); }
        }
      } catch (error) {
        if (active) setQuoteError(error instanceof CheckoutAuthenticationError ? t('checkout.signInAgain') : t('checkout.quoteFailed'));
      } finally { if (active) setQuoteLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [quoteKey, quoteRefresh, online, authLoading, currentUser, activeShippingMethod, appliedCoupon, cartItems, formData.giftWrapping, formData.city, selectedRewardId, isWholesale, t, PRODUCTS]);
  useEffect(() => {
    if (currentStep === 'success' || orderSuccessResult) return;
    if (!formData.name && !formData.phone && !formData.address && !formData.giftMessage && !formData.instructions) return;
    try { sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ customer: formData, shipping: activeShippingMethod, coupon: appliedCoupon, payment: selectedPayment, updatedAt: Date.now() })); } catch { /* browsing remains available */ }
  }, [formData, activeShippingMethod, appliedCoupon, selectedPayment, currentStep, orderSuccessResult]);

  // Inline Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [supportAction, setSupportAction] = useState<{ type: string; label: string; whatsappUrl?: string } | null>(null);
  const isSubmittingRef = React.useRef(false);

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    if (propsOnOpenAuth) {
      propsOnOpenAuth(mode);
    } else {
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode } }));
    }
  };

  // Pre-fill State from Patron Profile (preserving already edited values)
  useEffect(() => {
    if (patronProfile) {
      setFormData(prev => ({
        ...prev,
        name: prev.name.trim() ? prev.name : (patronProfile.name || ''),
        phone: prev.phone.trim() ? prev.phone : (patronProfile.phone || ''),
        address: prev.address.trim() ? prev.address : (patronProfile.address || '')
      }));
    }
  }, [patronProfile]);

  // Load active rewards safely
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setSelectedRewardId(null);
    setActiveRewards([]);
    if (currentUser) fetchLoyaltyProfile(currentUser, controller.signal).then(profile => {
      if (active) setActiveRewards(profile.activeRewards.filter(reward => reward.id && reward.expiresAt > Date.now()
        && ['free_shipping', 'gift_packaging'].includes(reward.rewardId)));
    }).catch(() => { /* Optional rewards never prevent an ordinary checkout. */ });
    return () => { active = false; controller.abort(); };
  }, [currentUser]);

  const onClose = propsOnClose || (() => { navigate('/shop'); });
  const onClearCart = () => { clearCart(); };

  const handleShippingChange = (method: ShippingMethodId) => {
    setInternalShippingMethod(method);
  };

  // Smart Auto-Scroll to Error Input Field
  const scrollToErrorField = (fieldId: string) => {
    setTimeout(() => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        el.focus();
        if (!reduceMotion) el.classList.add('animate-error-shake');
        setTimeout(() => {
          el.classList.remove('animate-error-shake');
        }, 500);
      }
    }, 90);
  };

  // 2. Empty cart check strictly AFTER all hooks
  if ((!cartItems || cartItems.length === 0) && currentStep !== 'success' && !orderSuccessResult) {
    return (
      <div className="min-h-[60vh] bg-[var(--color-cream,#FAF9F5)] pt-16 pb-12 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--color-surface,#FDFBF7)] rounded-3xl p-8 shadow-sm border border-[var(--color-gold,#B8935F)]/20 text-center">
          <div className="w-20 h-20 bg-[var(--color-cream,#FAF9F5)] rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={32} className="text-[var(--color-gold,#B8935F)]" />
          </div>
          <h2 className="text-2xl font-serif font-black text-[var(--color-ink,#1F120F)] mb-3">{t('checkout.emptyTitle')}</h2>
          <p className="text-[13px] text-[var(--color-ink,#1F120F)]/70 mb-8 leading-relaxed">
            {t('checkout.emptyCopy')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="w-full py-3.5 rounded-full bg-[var(--color-ink,#1F120F)] text-white font-bold text-xs uppercase tracking-[0.2em] hover:bg-[var(--color-gold,#B8935F)] transition-colors cursor-pointer"
          >
            {t('checkout.browse')}
          </button>
        </div>
      </div>
    );
  }

  // Map Picker State


  const handleBlur = (field: string) => {
    let err = '';
    if (field === 'name') {
      if (!formData.name.trim() || formData.name.trim().length < 3) err = 'checkout.nameError';
    }
    if (field === 'phone') {
      const cleanPhone = formData.phone.replace(/[\s-]/g, '');
      const pkPhoneRegex = /^(03\d{9}|\+923\d{9})$/;
      if (!cleanPhone) err = 'checkout.phoneRequired';
      else if (!pkPhoneRegex.test(cleanPhone)) err = 'checkout.phoneError';
    }
    if (field === 'address') {
      if (!formData.address.trim() || formData.address.trim().length < 8) err = 'checkout.addressError';
    }
    if (err) {
      setErrors(prev => ({ ...prev, [field]: err }));
    }
  };
const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Step 1 Validation
  const validateStep1 = (autoScroll = true) => {
    const errs: Record<string, string> = {};
    let firstErrorId = '';

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      errs.name = 'checkout.nameError';
      if (!firstErrorId) firstErrorId = 'checkout-field-name';
    }
    const cleanPhone = formData.phone.replace(/[\s-]/g, '');
    const isPkPhone = /^(03\d{9}|\+923\d{9})$/.test(cleanPhone);
    if (!cleanPhone) {
      errs.phone = 'checkout.phoneRequired';
      if (!firstErrorId) firstErrorId = 'checkout-field-phone';
    } else if (!isPkPhone) {
      errs.phone = 'checkout.phoneError';
      if (!firstErrorId) firstErrorId = 'checkout-field-phone';
    }

    setErrors(errs);

    if (firstErrorId && autoScroll) {
      scrollToErrorField(firstErrorId);
    }

    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = (autoScroll = true) => {
    const errs: Record<string, string> = {};
    let firstErrorId = '';

    if (!formData.address.trim() || formData.address.trim().length < 8) {
      errs.address = 'checkout.addressError';
      firstErrorId = 'checkout-field-address';
    }
    if (formData.city.trim().length < 2 || isPlaceholderCity(formData.city)) {
      errs.city = 'shipping.enterCity';
      if (!firstErrorId) firstErrorId = 'checkout-field-city';
    }
    setErrors(errs);

    if (firstErrorId && autoScroll) {
      scrollToErrorField(firstErrorId);
    }

    return Object.keys(errs).length === 0;
  };

  const handleProceedToStep2 = () => {
    if (validateStep1(true)) {
      setCurrentStep('shipping');
    }
  };

  const handleProceedToStep3 = () => {
    if (validateStep2(true)) {
      setCurrentStep(isQuoteRequestMode ? 'review' : 'payment');
    }
  };

  const handleApplyCoupon = async () => {
    setCouponErrorMsg(null); setCouponSuccessMsg(null);
    const code = couponCode.trim().toUpperCase();
    if (!code) { setAppliedCoupon(''); setIsQuoteRequestMode(false); setCouponErrorMsg(t('checkout.enterCoupon')); return; }
    setIsValidatingCoupon(true);
    couponRequestRef.current?.abort();
    const controller = new AbortController();
    couponRequestRef.current = controller;
    const initialKey = quoteKey;
    const initialUid = currentUser?.uid || null;
    try {
      const authToken = await getCheckoutAuthToken(currentUser, controller.signal);
      if (controller.signal.aborted) return;
      const result = await getOrderQuote({ items: cartItems, city: formData.city, shippingMethodId: activeShippingMethod, giftWrapping: formData.giftWrapping, discountCode: code, rewardId: selectedRewardId, isWholesale, authToken, signal: controller.signal });
      if (controller.signal.aborted || pricingKeyRef.current !== initialKey || identityRef.current !== initialUid) return;
      if (result.success && result.totals && result.totals.promoCode === code) {
        setAppliedCoupon(code); setCouponCode(code); setIsQuoteRequestMode(result.totals.isQuoteRequest === true);
        setCouponSuccessMsg(t('checkout.couponApplied'));
        if (result.totals.isQuoteRequest === true && (currentStep === 'payment' || currentStep === 'review')) setCurrentStep('review');
      } else { setAppliedCoupon(''); setIsQuoteRequestMode(false); setCouponErrorMsg(result.code === 'TIMEOUT' ? t('checkout.quoteTimeout', 'The price check timed out. Please retry.') : result.error || t('checkout.couponNoEffect')); }
    } catch (error) {
      if (!controller.signal.aborted) setCouponErrorMsg(error instanceof CheckoutAuthenticationError ? t('checkout.signInAgain') : t('checkout.quoteFailed'));
    } finally {
      if (couponRequestRef.current === controller) { couponRequestRef.current = null; setIsValidatingCoupon(false); }
    }
  };

  const localSummary = (() => {
    try { return calculateOrderSummary({ items: cartItems, city: formData.city, shippingMethodId: activeShippingMethod, giftWrapping: formData.giftWrapping }); }
    catch { return null; }
  })();
  const verifiedQuote = quote?.key === quoteKey ? quote.totals : null;
  const hasEstimate = !!(verifiedQuote || localSummary);
  const summary = verifiedQuote || localSummary || { subtotal: cartItems.reduce((sum, item) => sum + parsePrice(item.unitPrice ?? item.price) * item.quantity, 0), discount: 0, discountedSubtotal: 0, shipping: 0, giftWrapFee: 0, total: 0 };
  const subtotal = summary.subtotal;
  const discountAmt = summary.discount;
  const currentShippingFee = summary.shipping;
  const selectedMethodObj = SHIPPING_METHODS.find(method => method.id === activeShippingMethod) || SHIPPING_METHODS[0];
  const giftFeeTotal = summary.giftWrapFee;
  const finalPayable = summary.total;
  const displayItems = verifiedQuote ? acceptedCheckoutReceipt(cartItems, { subtotal, finalPayable, shippingFee: currentShippingFee, discountAmt, giftFee: giftFeeTotal }, { items: quote?.items }).items : cartItems;
  const appliedPromoMessage = appliedPromotionMessage(verifiedQuote, t) || couponSuccessMsg;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep1(false)) {
      setCurrentStep('details');
      const firstErr = (!formData.name.trim() || formData.name.trim().length < 3) ? 'checkout-field-name' : 'checkout-field-phone';
      scrollToErrorField(firstErr);
      return;
    }
    if (!validateStep2(false)) {
      setCurrentStep('shipping');
      scrollToErrorField('checkout-field-address');
      return;
    }

    if (!online || authLoading || !verifiedQuote || quoteLoading || couponRequestRef.current) { setSubmissionError(t('checkout.waitQuote')); return; }
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const controller = new AbortController();
    submissionRequestRef.current = controller;
    const submittedUid = currentUser?.uid || null;
    const submittedQuoteKey = quoteKey;
    setIsSubmittingOrder(true);
    setSubmissionError(null);
    setSupportAction(null);

    // Save order snapshot before emptying cart
    const itemsSnapshot = [...cartItems];
    setOrderItemsSnapshot(itemsSnapshot);
    const totalsSnapshot = {
      subtotal,
      finalPayable,
      shippingFee: currentShippingFee,
      discountAmt,
      giftFee: giftFeeTotal,
    };
    setSavedTotals(totalsSnapshot);

    try {
      const authToken = await getCheckoutAuthToken(currentUser, controller.signal);
      if (controller.signal.aborted || identityRef.current !== submittedUid) throw new Error(t('checkout.requestCancelled'));
      if (pricingKeyRef.current !== submittedQuoteKey || quoteStatusRef.current.loading || quoteStatusRef.current.quote?.key !== submittedQuoteKey || couponRequestRef.current) throw new Error(t('checkout.waitQuote'));

      const orderPayload: OrderPayload = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        deliverySlot: formData.deliverySlot,
        instructions: formData.instructions,
        giftWrapping: formData.giftWrapping,
        giftMessage: formData.giftMessage,
        ...(isQuoteRequestMode ? {} : { paymentMethod: selectedPayment }),
        items: cartItems.map(item => ({
          ...item,
          price: parsePrice(item.unitPrice ?? item.price)
        })),
        shippingMethodId: activeShippingMethod,
        discountCode: appliedCoupon,
        rewardId: selectedRewardId,
        isWholesale,
        expectedFinalTotal: finalPayable,
        authToken
      };
      const fingerprint = await checkoutFingerprint(orderPayload, submittedUid);
      // Digest creation is asynchronous: changed account/cart details invalidate the pending submission too.
      if (controller.signal.aborted || identityRef.current !== submittedUid) throw new Error(t('checkout.requestCancelled'));
      if (pricingKeyRef.current !== submittedQuoteKey || quoteStatusRef.current.loading || quoteStatusRef.current.quote?.key !== submittedQuoteKey || couponRequestRef.current) throw new Error(t('checkout.waitQuote'));
      const attempt = resolveCheckoutAttempt(fingerprint, checkoutAttemptRef.current || readCheckoutAttempt(), () =>
        typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `ik_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      checkoutAttemptRef.current = attempt;
      persistCheckoutAttempt(attempt);
      const orderResult = await placeOrder({ ...orderPayload, idempotencyKey: attempt.key }, { signal: controller.signal });
      if (controller.signal.aborted || identityRef.current !== submittedUid) { setSubmissionError(t('checkout.requestCancelled')); return; }

      if (!orderResult.success) {
        setSubmissionError(orderResult.error || t('checkout.orderUnavailable'));
        setSupportAction(orderResult.supportAction || null);
        if (orderResult.code === 'QUOTE_CHANGED') {
          setQuote(null);
          setQuoteRefresh(value => value + 1);
          setSubmissionError(t('checkout.quoteChanged'));
        }
        return;
      }

      try { sessionStorage.removeItem(CHECKOUT_DRAFT_KEY); } catch { /* storage unavailable */ }
      const orderId = orderResult.orderId!;
      const receipt = acceptedCheckoutReceipt(itemsSnapshot, totalsSnapshot, orderResult);
      setOrderItemsSnapshot(receipt.items);
      setSavedTotals(receipt.totals);
      const whatsappUrl = buildOrderTrackingWhatsAppUrl(orderId);

      if (orderResult.claimToken) {
        writeCheckoutSession('pendingClaimToken', orderResult.claimToken);
        writeCheckoutSession('pendingOrderId', orderId);
      }

      const isAcceptedQuote = orderResult.orderType === 'QUOTE_REQUEST';
      const successSnapshot = {
        orderId, durablePersistenceReady: true, customerUid: submittedUid, whatsappUrl, claimToken: orderResult.claimToken,
        orderType: orderResult.orderType, status: orderResult.status,
        promoCode: orderResult.totals?.promoCode || null, promoType: orderResult.totals?.promoType || null,
        discountAmount: orderResult.totals?.discountAmount ?? orderResult.totals?.discount ?? 0,
        freeShipping: orderResult.totals?.freeShipping === true, freeGiftWrap: orderResult.totals?.freeGiftWrap === true,
        freeGift: orderResult.totals?.freeGift === true,
        paymentMethod: isAcceptedQuote ? 'quote' : selectedPayment,
        items: receipt.items, totals: receipt.totals, whatsappMessage: orderResult.whatsappMessage,
        customer: { name: formData.name, phone: formData.phone, address: formData.address, city: formData.city,
          paymentMethod: isAcceptedQuote ? 'quote' : selectedPayment },
      };
      // Save order confirmation snapshot in session storage for resilient recovery
      try {
        sessionStorage.setItem("allbarka_order_success", JSON.stringify(successSnapshot));
      } catch (storageErr) {
        console.warn("Could not write order success snapshot to sessionStorage:", storageErr);
      }

      setOrderSuccessResult({ orderId, claimToken: orderResult.claimToken || undefined, whatsappUrl, isQuoteRequest: isAcceptedQuote });
      setCurrentStep('success');
      onClearCart();
      checkoutAttemptRef.current = null;
      clearCheckoutAttempt();
      if (isAcceptedQuote) navigate('/success', { state: { orderData: successSnapshot } });

      if (currentUser) {
        void (async () => { try {
          const { doc, setDoc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          await setDoc(doc(db, 'users', currentUser.uid), sanitizeFirestoreData({
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            city: formData.city
          }), { merge: true });
        } catch (e) {
          console.warn("Could not save address to patron profile:", e);
        } })();
      }

    } catch (err: any) {
      console.error('Order placement failed:', err);
      setSubmissionError(err instanceof CheckoutAuthenticationError ? t('checkout.signInAgain') : err.message || t('checkout.orderUnavailable'));
    } finally {
      if (submissionRequestRef.current === controller) submissionRequestRef.current = null;
      isSubmittingRef.current = false;
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div dir={language === 'en' ? 'ltr' : 'rtl'} className="boutique-checkout purchase-checkout w-full max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-8 py-10 px-4 sm:px-6 relative z-10" data-checkout-step={currentStep}>

      {currentStep !== 'success' && <aside className="boutique-order-summary" aria-label={t('boutique.order')}>
        <div className="purchase-overview-heading"><h2>{t('boutique.order')}</h2><bdi className="purchase-mobile-total">{isQuoteRequestMode?t('checkout.quoteRequestTitle'):hasEstimate?formatPrice(finalPayable):t('shipping.pending')}</bdi></div>
        <p className="purchase-quote-state" role="status">{t(verifiedQuote ? 'purchase.checked' : 'purchase.estimate')}</p>
        <details className="purchase-order-details" open={summaryExpanded} onToggle={event => setSummaryExpanded(event.currentTarget.open)}><summary>{t('purchase.bag')} ({cartItems.length})</summary><div className="boutique-order-items">
          {displayItems.map(item => <div key={item.id} className="boutique-order-item">
            <img src={mediaCover(PRODUCTS.find(product => product.id === item.productId || product.id === item.id), item.image)} alt={getLocalized(item, 'name', language)} width={80} height={80} onError={event=>{if(!event.currentTarget.src.endsWith('/images/product-placeholder.svg'))event.currentTarget.src='/images/product-placeholder.svg';}} />
            <div><strong>{getLocalized(item, 'name', language)}</strong><small>{item.selectedWeight} × {item.quantity}</small><CartItemPersonalization configuration={item.hamperConfiguration} expanded /></div>
            {!isQuoteRequestMode && <bdi>Rs. {(parsePrice(item.unitPrice ?? item.price) * item.quantity).toLocaleString()}</bdi>}
          </div>)}
        </div></details>
        {!!activeRewards.length && <div className="mb-4 rounded-xl border border-[var(--color-border)] p-3">
          <label htmlFor="checkout-patron-reward" className="mb-2 block text-xs font-semibold">{t('rewards.select')}</label>
          <select id="checkout-patron-reward" value={selectedRewardId || ''} onChange={event => setSelectedRewardId(event.target.value || null)} className="focus-ring min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]" aria-describedby="checkout-patron-reward-help">
            <option value="">{t('rewards.none')}</option>
            {activeRewards.map(reward => <option key={reward.id} value={reward.id}>{t(`rewards.${reward.rewardId}.name`)}</option>)}
          </select>
          <p id="checkout-patron-reward-help" className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">{selectedRewardId ? t(`rewards.${activeRewards.find(reward => reward.id === selectedRewardId)?.rewardId}.description`) : t('rewards.ready')}</p>
        </div>}
        {isQuoteRequestMode ? <div role="status" className="rounded-xl border border-[var(--color-gold)]/30 p-4"><h3 className="font-serif text-lg">{t('checkout.quoteRequestTitle')}</h3><p className="mt-2 text-sm">{t('checkout.quoteRequestNotice')}</p><p className="mt-2 text-xs">{t('checkout.quoteNoPayment')}</p></div> : <dl>
          <div><dt>{t('subtotal', 'Subtotal')}</dt><dd>Rs. {subtotal.toLocaleString()}</dd></div>
          <div><dt>{t('boutique.shipping')}</dt><dd>{hasEstimate ? `Rs. ${currentShippingFee.toLocaleString()}` : t('shipping.pending')}</dd></div>
          {discountAmt > 0 && <div><dt>{t('boutique.discount')}</dt><dd>− Rs. {discountAmt.toLocaleString()}</dd></div>}
          {giftFeeTotal > 0 && <div><dt>{t('boutique.wrapping')}</dt><dd>Rs. {giftFeeTotal.toLocaleString()}</dd></div>}
          <div className="boutique-order-total"><dt>{t('total', 'Total')}</dt><dd>{hasEstimate ? `Rs. ${finalPayable.toLocaleString()}` : t('shipping.pending')}</dd></div>
        </dl>}
        <p>{t('boutique.orderNote')}</p>
      </aside>}

      {/* Main Checkout Modal Container: 24px Outer Padding without restrictive max-h */}
      <motion.div
        initial={false}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 16 }}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
        className="purchase-checkout-form bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 w-full rounded-2xl shadow-sm relative overflow-hidden z-10 flex flex-col"
      >
        <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--color-gold,#B8935F)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header (24px padding on sides) */}
        <div className="purchase-checkout-header px-4 sm:px-6 py-4.5 border-b border-[var(--color-gold,#B8935F)]/20 bg-[var(--color-surface,#FDFBF7)]/85 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-ink,#1F120F)] border border-[var(--color-gold,#B8935F)]/60 flex items-center justify-center text-[var(--color-gold,#B8935F)] shadow-xs shrink-0">
              <ShoppingBag size={18} className="text-[var(--color-gold,#B8935F)]" />
            </div>
            <div>
              <p className="purchase-eyebrow">{t('purchase.checkoutEyebrow')}</p>
              <h1 className="font-serif">{t('checkout.heading')}</h1>
              <p className="text-[9.5px] text-[var(--color-gold,#B8935F)] font-bold uppercase tracking-widest leading-none mt-0.5">
                {t('purchase.checkoutIntro')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-[var(--color-ink,#1F120F)]/5 hover:bg-[var(--color-ink,#1F120F)]/10 text-[var(--color-ink,#1F120F)] flex items-center justify-center transition-colors cursor-pointer"
            aria-label={t('checkout.close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. Vertical Multi-Step Process Header */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-[var(--color-gold,#B8935F)]/15 bg-[var(--color-surface,#FDFBF7)]/50 shrink-0">
          <div className="purchase-checkout-steps grid grid-cols-3 gap-1.5 sm:gap-2">
            {/* Step 1 */}
            <button
              type="button"
              aria-current={currentStep === 'details' ? 'step' : undefined}
              onClick={() => setCurrentStep('details')}
              className={`flex min-h-11 items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-xl border text-center sm:text-start transition-all cursor-pointer ${
                currentStep === 'details'
                  ? 'bg-[#1F120F] text-[#FDFBF7] border-[#B8935F] shadow-xs'
                  : 'bg-[var(--color-surface,#FDFBF7)]/80 text-[#1F120F]/70 border-[#B8935F]/20 hover:border-[#B8935F]/40'
              }`}
            >
              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 ${
                currentStep === 'details' ? 'bg-[#B8935F] text-[#1F120F]' : 'bg-[#1F120F]/10 text-[#1F120F]'
              }`}>
                1
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider">{t('checkout.stepDetails')}</span>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              aria-current={currentStep === 'shipping' ? 'step' : undefined}
              onClick={() => { if (validateStep1(true)) setCurrentStep('shipping'); }}
              className={`flex min-h-11 items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-xl border text-center sm:text-start transition-all cursor-pointer ${
                currentStep === 'shipping'
                  ? 'bg-[#1F120F] text-[#FDFBF7] border-[#B8935F] shadow-xs'
                  : 'bg-[var(--color-surface,#FDFBF7)]/80 text-[#1F120F]/70 border-[#B8935F]/20 hover:border-[#B8935F]/40'
              }`}
            >
              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 ${
                currentStep === 'shipping' ? 'bg-[#B8935F] text-[#1F120F]' : 'bg-[#1F120F]/10 text-[#1F120F]'
              }`}>
                2
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider">{t('checkout.stepShipping')}</span>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              aria-current={currentStep === 'payment' || currentStep === 'review' ? 'step' : undefined}
              onClick={() => {
                if (!validateStep1(true)) { setCurrentStep('details'); return; }
                if (!validateStep2(true)) { setCurrentStep('shipping'); return; }
                setCurrentStep(isQuoteRequestMode ? 'review' : 'payment');
              }}
              className={`flex min-h-11 items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-xl border text-center sm:text-start transition-all cursor-pointer ${
                (currentStep === 'payment' || currentStep === 'review')
                  ? 'bg-[#1F120F] text-[#FDFBF7] border-[#B8935F] shadow-xs'
                  : 'bg-[var(--color-surface,#FDFBF7)]/80 text-[#1F120F]/70 border-[#B8935F]/20 hover:border-[#B8935F]/40'
              }`}
            >
              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 ${
                (currentStep === 'payment' || currentStep === 'review') ? 'bg-[#B8935F] text-[#1F120F]' : 'bg-[#1F120F]/10 text-[#1F120F]'
              }`}>
                3
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider">{t('checkout.stepReview')}</span>
            </button>
          </div>
        </div>

        {/* 3. Form Content (24px container padding) */}
        <form
          id="checkoutForm"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-5 pb-10 space-y-4 [scrollbar-width:thin]"
        >
          {draftNotice && <div role="status" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-3 text-xs"><p>{t('checkout.draftRestored')}</p><button type="button" onClick={() => { setFormData({ name: '', phone: '', address: '', city: 'Lahore', deliverySlot: 'Fastest Dispatch', giftWrapping: false, giftMessage: '', instructions: '' }); setCouponCode(''); setAppliedCoupon(''); setIsQuoteRequestMode(false); setCouponSuccessMsg(null); setCouponErrorMsg(null); setDraftNotice(false); try { sessionStorage.removeItem(CHECKOUT_DRAFT_KEY); } catch { /* private mode */ } }} className="focus-ring mt-2 min-h-11 underline underline-offset-4">{t('checkout.clearDraft')}</button></div>}
          {!online && <p role="status" className="rounded-xl border border-[var(--color-border)] p-3 text-sm">{t('checkout.offline')}</p>}
          {(currentStep === 'details' || currentStep === 'shipping') && <AddressBook customer={formData} onSelect={value => setFormData(previous => ({ ...previous, ...value }))} />}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-3 text-xs"><p role="status" aria-live="polite">{quoteLoading ? t('checkout.checkingQuote') : quoteError || (verifiedQuote ? t('checkout.quoteVerified') : t('checkout.waitQuote'))}</p><button type="button" disabled={!online || quoteLoading} onClick={() => setQuoteRefresh(value => value + 1)} className="focus-ring min-h-11 underline underline-offset-4 disabled:opacity-40">{t('checkout.refreshQuote')}</button>{quoteError && <a href={buildHumanSupportWhatsAppUrl()} target="_blank" rel="noreferrer" className="focus-ring ms-4 inline-flex min-h-11 items-center underline underline-offset-4">{t('footer.connect')}</a>}</div>
          {/* One server-validated promo, available before the payment step. */}
          {currentStep !== 'success' && (
                  <div className="space-y-1.5">
                    <label htmlFor="checkout-promo-code" className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80 flex items-center gap-1">
                      <Tag size={12} className="text-[var(--color-gold,#B8935F)]" />
                      {t('checkout.promoLabel')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        disabled={isSubmittingOrder}
                        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (!isValidatingCoupon) void handleApplyCoupon(); } }}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponErrorMsg(null);
                          setCouponSuccessMsg(null);
                        }}
                        id="checkout-promo-code"
                        aria-invalid={!!couponErrorMsg}
                        aria-describedby={couponErrorMsg ? 'checkout-promo-error' : appliedPromoMessage ? 'checkout-promo-effect' : undefined}
                        autoComplete="off"
                        maxLength={60}
                        placeholder={t('checkout.promoPlaceholder')}
                        className="flex-1 bg-[var(--color-surface,#FDFBF7)] dark:bg-[#1A201E] border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-2.5 px-3.5 text-base sm:text-sm min-h-[44px] font-semibold focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7] uppercase placeholder:normal-case placeholder:text-[var(--color-ink,#1F120F)]/30 dark:placeholder:text-[#FDFBF7]/30"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || isSubmittingOrder || !online || authLoading}
                        className="bg-[var(--color-ink,#1F120F)] text-[var(--color-gold,#B8935F)] border border-[var(--color-gold,#B8935F)]/50 px-4 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[var(--color-ink,#1F120F)]/80 transition-colors cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        {isValidatingCoupon ? t('checkout.promoChecking') : t('checkout.promoApply')}
                      </button>
                    </div>

                    {isValidatingCoupon && (
                      <div className="h-6 w-full rounded luxury-skeleton mt-1" />
                    )}

                    {appliedPromoMessage && (
                      <p id="checkout-promo-effect" role="status" aria-live="polite" className="text-[10.5px] text-[var(--color-gold,#B8935F)] font-black uppercase tracking-wide flex items-center gap-1">
                        <Sparkles size={12} className="text-[var(--color-gold,#B8935F)]" /> {appliedPromoMessage}
                      </p>
                    )}
                    {couponErrorMsg && (
                      <p id="checkout-promo-error" role="alert" className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{couponErrorMsg}</span>
                      </p>
                    )}
                    {appliedCoupon && <button type="button" disabled={isSubmittingOrder} onClick={() => { couponRequestRef.current?.abort(); setAppliedCoupon(''); setCouponCode(''); setIsQuoteRequestMode(false); setCouponSuccessMsg(null); setCouponErrorMsg(null); }} className="focus-ring min-h-11 text-xs underline underline-offset-4">{t('checkout.promoRemove')}</button>}
                  </div>
          )}

          {/* Skeleton State on Submitting Order */}
          {isSubmittingOrder && (
            <div className="p-4 rounded-2xl bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/30 space-y-3">
              <div className="h-4 w-36 rounded luxury-skeleton" />
              <div className="h-8 w-full rounded-xl luxury-skeleton" />
              <div className="h-14 w-full rounded-xl luxury-skeleton" />
              <p className="text-center text-[10px] uppercase font-bold tracking-widest text-[var(--color-gold,#B8935F)] animate-pulse pt-2">
                {t('checkout.preparing')}
              </p>
            </div>
          )}

          {!isSubmittingOrder && (
            <AnimatePresence mode="wait">
              {/* ───────────────── STEP 1: CONTACT & CLIENT DETAILS ───────────────── */}
              {currentStep === 'details' && (
                <motion.div
                  key="step-details"
                  initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: 10 }}
                  transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  {/* Auth Status Banner: VIP Patron vs Guest */}
                  {patronProfile ? (
                    <div className="p-3 rounded-2xl bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/60 shadow-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-gold,#B8935F)]/20 border border-[var(--color-gold,#B8935F)]/40 flex items-center justify-center text-[var(--color-gold,#B8935F)] shrink-0">
                          <Crown size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-serif font-bold text-white truncate">
                              {patronProfile.name}
                            </span>
                            <span className="text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--color-gold,#B8935F)] text-[#1A1A1A]">
                              {patronProfile.patronStatus || 'VIP Patron'}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-[var(--color-gold,#B8935F)] tracking-wide">
                            {t('checkout.profilePrefilled')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-gold,#B8935F)] shrink-0">
                        <ShieldCheck size={14} />
                        <span>{t('checkout.signedIn')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/30 shadow-2xs flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/25 flex items-center justify-center text-[var(--color-gold,#B8935F)] shrink-0">
                          <ShoppingBag size={13} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-[var(--color-ink,#1F120F)] block">
                            {t('checkout.guest')}
                          </span>
                          <span className="text-[9.5px] text-[var(--color-ink-muted,#5A5A5A)]">
                            {t('checkout.guestHint')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAuth('signin')}
                        className="min-h-11 px-2.5 py-1 rounded-lg bg-[var(--color-cream,#FAF9F5)] hover:bg-[#B8935F] text-[var(--color-ink,#1F120F)] hover:text-white border border-[var(--color-gold,#B8935F)]/35 text-[10px] font-bold tracking-wider transition-colors shrink-0 cursor-pointer"
                      >
                        {t('checkout.signIn')}
                      </button>
                    </div>
                  )}

                  {/* VIP Assurance Banner */}
                  {patronProfile && patronProfile.address && (
                    <div className="p-3 rounded-2xl bg-[#043327]/10 border border-[#D4AF37]/40 text-[#043327] flex items-center justify-between text-xs font-semibold mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-[#D4AF37]" />
                        <span>{t('checkout.savedAddress')}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-[#D4AF37] bg-[var(--color-surface,#FDFBF7)] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">{t('checkout.autoFilled')}</span>
                    </div>
                  )}

                  {/* Recipient Full Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="checkout-field-name" className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                      {t('checkout.nameLabel')} *
                    </label>
                    <div className="relative">
                      <User className="absolute start-3.5 top-3 text-[var(--color-gold,#B8935F)]" size={16} />
                      <input
                        id="checkout-field-name"
                        name="name"
                        autoComplete="shipping name"
                        required
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? 'checkout-name-error' : undefined}
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        onBlur={() => handleBlur('name')}
                        placeholder={t('checkout.namePlaceholder')}
                        className={`w-full bg-[var(--color-surface,#FDFBF7)] border rounded-xl py-3 ps-10 pe-3.5 text-base sm:text-sm font-semibold text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/30 focus:outline-none transition-all ${
                          errors.name
                            ? 'border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/30 shadow-xs'
                            : 'border-[var(--color-gold,#B8935F)]/30 focus:border-[var(--color-gold,#B8935F)] focus:ring-1 focus:ring-[var(--color-gold,#B8935F)]'
                        }`}
                      />
                    </div>
                    {errors.name && (
                      <p id="checkout-name-error" role="alert" className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{t(errors.name)}</span>
                      </p>
                    )}
                  </div>

                  {/* Phone / WhatsApp */}
                  <div className="space-y-1.5">
                    <label htmlFor="checkout-field-phone" className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                      {t('checkout.phoneLabel')} *
                    </label>
                    <div className="relative">
                      <Phone className="absolute start-3.5 top-3 text-[var(--color-gold,#B8935F)]" size={16} />
                      <input
                        id="checkout-field-phone"
                        name="phone"
                        autoComplete="shipping tel"
                        required
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? 'checkout-phone-error' : 'checkout-phone-hint'}
                        type="tel"
                        dir="ltr"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        onBlur={() => handleBlur('phone')}
                        placeholder={t('checkout.phonePlaceholder')}
                        className={`w-full bg-[var(--color-surface,#FDFBF7)] border rounded-xl py-3 ps-10 pe-3.5 text-base sm:text-sm font-semibold text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/30 focus:outline-none transition-all ${
                          errors.phone
                            ? 'border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/30 shadow-xs'
                            : 'border-[var(--color-gold,#B8935F)]/30 focus:border-[var(--color-gold,#B8935F)] focus:ring-1 focus:ring-[var(--color-gold,#B8935F)]'
                        }`}
                      />
                    </div>
                    {errors.phone ? (
                      <p id="checkout-phone-error" role="alert" className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{t(errors.phone)}</span>
                      </p>
                    ) : (
                      <p id="checkout-phone-hint" className="text-[10px] text-[var(--color-ink,#1F120F)]/60 mt-1">
                        {t('checkout.phoneHint')}
                      </p>
                    )}
                  </div>

                  {/* Special Delivery Notes */}
                  <div className="space-y-1.5">
                    <label htmlFor="checkout-instructions" className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                      {t('checkout.instructionsLabel')}
                    </label>
                    <textarea
                      id="checkout-instructions"
                      name="deliveryInstructions"
                      maxLength={300}
                      dir="auto"
                      value={formData.instructions || ''}
                      onChange={(e) => handleInputChange('instructions', e.target.value)}
                      placeholder={t('checkout.instructionsPlaceholder')}
                      className="w-full bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-2.5 px-3.5 text-base sm:text-sm font-medium text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/30 h-18 resize-none focus:outline-none focus:border-[var(--color-gold,#B8935F)]"
                    />
                  </div>

                  {/* Order Overview Summary Card: 16px inner padding */}
                  <div className="p-4 rounded-2xl bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/25 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70">
                        {t('checkout.items')}
                      </span>
                      <span className="text-[11px] font-serif font-bold text-[var(--color-gold,#B8935F)]">
                        {cartItems.length} {t('checkout.items')}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {displayItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] text-[var(--color-ink,#1F120F)]/80">
                          <span className="truncate max-w-[240px]">
                            {getLocalized(item, 'name', language)} <span className="text-[10px] text-[var(--color-gold,#B8935F)]">({item.selectedWeight})</span> x {item.quantity}
                          </span>
                          {!isQuoteRequestMode && <span className="font-bold shrink-0">Rs. {(item.price * item.quantity)?.toLocaleString()}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 1 Forward Button */}
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="purchase-primary w-full py-3.5 rounded-full bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)] text-xs font-black uppercase tracking-widest hover:bg-[var(--color-ink,#1F120F)]/90 hover:shadow-[0_4px_20px_rgba(184,147,95,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>{t('checkout.continueDelivery')}</span>
                    <ArrowRight size={14} className="text-[var(--color-gold,#B8935F)]" />
                  </button>
                </motion.div>
              )}

              {/* ───────────────── STEP 2: SHIPPING & DELIVERY ───────────────── */}
              {currentStep === 'shipping' && (
                <motion.div
                  key="step-shipping"
                  initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: 10 }}
                  transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  {/* Shipping Address with Locate on Map */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="checkout-field-address" className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                        {t('checkout.deliveryAddressLabel')} *
                      </label>
                    </div>
                    <div className="relative">
                      <MapPin className="absolute start-3.5 top-3 text-[var(--color-gold,#B8935F)]" size={16} />
                      <input
                        id="checkout-field-address"
                        name="address"
                        autoComplete="shipping street-address"
                        required
                        aria-invalid={!!errors.address}
                        aria-describedby={errors.address ? 'checkout-address-error' : undefined}
                        type="text"
                        value={formData.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        onBlur={() => handleBlur('address')}
                        placeholder={t('checkout.addressPlaceholder')}
                        className={`w-full bg-[var(--color-surface,#FDFBF7)] border rounded-xl py-3 ps-10 pe-3.5 text-base sm:text-sm font-semibold text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/30 focus:outline-none transition-all ${
                          errors.address
                            ? 'border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/30 shadow-xs'
                            : 'border-[var(--color-gold,#B8935F)]/30 focus:border-[var(--color-gold,#B8935F)] focus:ring-1 focus:ring-[var(--color-gold,#B8935F)]'
                        }`}
                      />
                    </div>
                    {errors.address && (
                      <p id="checkout-address-error" role="alert" className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{t(errors.address)}</span>
                      </p>
                    )}
                    {formData.address.includes('http') && (
                      <p className="text-[10px] text-[var(--color-gold,#B8935F)] font-bold mt-1 flex items-center gap-1">
                        <CheckCircle size={12} className="text-[var(--color-gold,#B8935F)]" />
                        {t('checkout.addressLink')}
                      </p>
                    )}
                  </div>

                  {/* Destination City */}
                  <div className="space-y-1.5">
                    <label htmlFor="checkout-field-city" className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                      {t('shipping.destination')}
                    </label>
                    <select
                      id="checkout-field-city"
                      name="destinationCity"
                      autoComplete="shipping address-level2"
                      required
                      aria-invalid={!!errors.city}
                      aria-describedby={errors.city ? 'checkout-city-error' : undefined}
                      value={DELIVERY_CITIES.includes(formData.city) ? formData.city : 'Other City'}
                      onChange={(e) => { if (e.target.value === 'Other City') { setShippingCity('Other City'); handleInputChange('city', ''); } else handleInputChange('city', e.target.value); }}
                      className="w-full bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 px-3.5 text-base sm:text-sm min-h-[44px] font-bold text-[var(--color-ink,#1F120F)] focus:outline-none focus:border-[var(--color-gold,#B8935F)] shadow-2xs cursor-pointer"
                    >
                      <option value="Lahore">{t('shipping.lahore')}</option>
                      <option value="Karachi">{t('city.Karachi')}</option>
                      <option value="Islamabad">{t('city.Islamabad')}</option>
                      <option value="Rawalpindi">{t('city.Rawalpindi')}</option>
                      <option value="Faisalabad">{t('city.Faisalabad')}</option>
                      <option value="Peshawar">{t('city.Peshawar')}</option>
                      <option value="Multan">{t('city.Multan')}</option>
                      <option value="Other City">{t('shipping.outside')}</option>
                    </select>
                    {!DELIVERY_CITIES.includes(formData.city) && <label className="block space-y-2 pt-2 text-xs font-semibold">
                      <span>{t('shipping.actualCity')}</span>
                      <input id="checkout-actual-city" type="text" name="city" autoComplete="shipping address-level2" required aria-invalid={!!errors.city} aria-describedby={errors.city ? 'checkout-city-error' : undefined} maxLength={60} value={formData.city} onChange={event => handleInputChange('city', event.target.value)} className="focus-ring min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base" />
                    </label>}
                    {errors.city && <p id="checkout-city-error" role="alert" className="text-xs text-rose-600">{t(errors.city)}</p>}
                    {!isQuoteRequestMode && <p className="text-xs leading-relaxed">{t(formData.city === 'Lahore' ? 'shipping.lahoreRule' : 'shipping.nationwideRule')}</p>}
                  </div>

                  {/* Luxury Shipping Method Selector */}
                  <div className="pt-1">
                    {!isQuoteRequestMode && <ShippingMethodSelector
                      selected={activeShippingMethod}
                      onSelect={handleShippingChange}
                      subtotal={summary.discountedSubtotal}
                      city={formData.city}
                      items={cartItems}
                    />}
                  </div>

                  {/* Preferred Delivery Time Slot */}
                  <div role="group" aria-labelledby="checkout-window-label" aria-describedby="checkout-window-hint" className="space-y-1.5">
                    <p id="checkout-window-label" className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80 flex items-center gap-1.5">
                      <Clock size={13} className="text-[var(--color-gold,#B8935F)]" />
                      {t('checkout.windowLabel')}
                    </p>
                    <p id="checkout-window-hint" className="text-xs text-[var(--color-ink-muted)]">{t('checkout.windowHint')}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'Fastest Dispatch', label: t('checkout.slotFastest'), icon: Zap },
                        { id: 'Morning (10 AM - 2 PM)', label: t('checkout.slotMorning'), icon: Sun },
                        { id: 'Evening (3 PM - 7 PM)', label: t('checkout.slotEvening'), icon: Sunset },
                        { id: 'Night (7 PM - 10 PM)', label: t('checkout.slotNight'), icon: Moon },
                      ].map((slot) => {
                        const isSelected = formData.deliverySlot === slot.id;
                        const IconComp = slot.icon;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleInputChange('deliverySlot', slot.id)}
                            className={`min-h-11 p-2.5 rounded-xl border text-start flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border-[var(--color-gold,#B8935F)] shadow-xs font-black'
                                : 'bg-[var(--color-surface,#FDFBF7)] text-[var(--color-ink,#1F120F)]/80 border-[var(--color-gold,#B8935F)]/25 hover:border-[var(--color-gold,#B8935F)]/60'
                            }`}
                          >
                            <IconComp size={13} className={isSelected ? 'text-[var(--color-gold,#B8935F)]' : 'text-[var(--color-ink,#1F120F)]/60'} />
                            <span className="text-[10px] truncate">{slot.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Luxury Gift Wrapping Card: 16px inner padding */}
                  <div
                    className={`p-4 rounded-2xl border transition-all duration-300 ${
                      formData.giftWrapping
                        ? 'bg-[var(--color-surface,#FDFBF7)] border-[var(--color-gold,#B8935F)] shadow-[0_2px_15px_rgba(184,147,95,0.15)]'
                        : 'bg-[var(--color-surface,#FDFBF7)] border-[var(--color-gold,#B8935F)]/25 hover:border-[var(--color-gold,#B8935F)]/50'
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.giftWrapping || verifiedQuote?.freeGiftWrap === true}
                        disabled={verifiedQuote?.freeGiftWrap === true}
                        onChange={(e) => handleInputChange('giftWrapping', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-[var(--color-ink,#1F120F)] accent-[var(--color-ink,#1F120F)] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[var(--color-ink,#1F120F)] flex items-center gap-1.5">
                            <Gift size={14} className="text-[var(--color-gold,#B8935F)]" />
                            {t('checkout.giftLabel')}
                          </span>
                          <span className="text-xs font-bold text-[var(--color-gold,#B8935F)] font-serif shrink-0">
                            {isQuoteRequestMode ? t('checkout.quoteRequestTitle') : verifiedQuote?.freeGiftWrap ? t('checkout.promoFreeGiftWrap') : `+Rs. ${GIFT_WRAP_FEE}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--color-ink,#1F120F)]/65 mt-0.5 leading-relaxed">
                          {t('checkout.giftDescription')}
                        </p>
                      </div>
                    </label>

                    {(formData.giftWrapping || verifiedQuote?.freeGiftWrap) && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-gold,#B8935F)]/20">
                        <label htmlFor="checkout-gift-message" className="block text-[9.5px] font-black text-[var(--color-ink,#1F120F)]/75 uppercase tracking-widest mb-1">
                          {t('checkout.giftMessageLabel')}
                        </label>
                    <div className="mb-2 flex flex-wrap gap-2">{['birthday', 'thanks', 'celebration'].map(key => <button type="button" key={key} onClick={() => handleInputChange('giftMessage', t(`gift.${key}Message`))} className="focus-ring min-h-11 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs">{t(`gift.${key}`)}</button>)}</div>
                        <input
                          id="checkout-gift-message"
                          name="giftMessage"
                          type="text"
                          maxLength={300}
                          dir="auto"
                          value={formData.giftMessage || ''}
                          onChange={(e) => handleInputChange('giftMessage', e.target.value)}
                          placeholder={t('checkout.giftPlaceholder')}
                          className="w-full bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 rounded-xl py-2.5 px-3 text-base sm:text-sm font-medium focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/30"
                        />
                      </div>
                    )}
                  </div>

                  {/* Step 2 Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('details')}
                      className="px-4 py-3 rounded-full bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/30 text-[var(--color-ink,#1F120F)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--color-gold,#B8935F)]/10 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>{t('checkout.back')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToStep3}
                      className="purchase-checkout-submit flex-1 py-3.5 rounded-full bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)] text-xs font-black uppercase tracking-widest hover:bg-[var(--color-ink,#1F120F)]/90 hover:shadow-[0_4px_20px_rgba(184,147,95,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>{isQuoteRequestMode ? t('checkout.reviewRequest') : t('checkout.proceedReview', 'Proceed to Payment & Review')}</span>
                      <ArrowRight size={14} className="text-[var(--color-gold,#B8935F)]" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ───────────────── STEP 3: PAYMENT & ORDER REVIEW ───────────────── */}
              {(currentStep === 'payment' || currentStep === 'review') && (
                <motion.div
                  key="step-payment"
                  initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: 10 }}
                  transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  {/* Payment Protocol Selector */}
                  {!isQuoteRequestMode && <div role="group" aria-labelledby="checkout-payment-label" className="space-y-2">
                    <p id="checkout-payment-label" className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                      {t('checkout.paymentLabel')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        aria-pressed={selectedPayment === 'cod'}
                        onClick={() => {
                            setSelectedPayment('cod');
                            try { sessionStorage.setItem(PREFERRED_PAYMENT_KEY, 'cod'); } catch { /* private mode */ }
                          }}
                        className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer ${
                          selectedPayment === 'cod'
                            ? 'bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border-[var(--color-gold,#B8935F)] shadow-xs'
                            : 'bg-[var(--color-surface,#FDFBF7)] text-[var(--color-ink,#1F120F)] dark:bg-[#1A201E] dark:text-[#FDFBF7] border-[var(--color-gold,#B8935F)]/25 hover:border-[var(--color-gold,#B8935F)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard size={15} className="text-[var(--color-gold,#B8935F)]" />
                          <span className="text-xs font-black uppercase tracking-wider">{t('checkout.cod')}</span>
                        </div>
                        <p className={`text-[10px] leading-snug ${selectedPayment === 'cod' ? 'text-[var(--color-surface,#FDFBF7)]/70' : 'text-[var(--color-ink,#1F120F)]/60'}`}>
                          {t('checkout.codDescription')}
                        </p>
                      </button>

                      <button
                        type="button"
                        aria-pressed={selectedPayment === 'bank'}
                        onClick={() => {
                            setSelectedPayment('bank');
                            try { sessionStorage.setItem(PREFERRED_PAYMENT_KEY, 'bank'); } catch { /* private mode */ }
                          }}
                        className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer ${
                          selectedPayment === 'bank'
                            ? 'bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border-[var(--color-gold,#B8935F)] shadow-xs'
                            : 'bg-[var(--color-surface,#FDFBF7)] text-[var(--color-ink,#1F120F)] dark:bg-[#1A201E] dark:text-[#FDFBF7] border-[var(--color-gold,#B8935F)]/25 hover:border-[var(--color-gold,#B8935F)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 size={15} className="text-[var(--color-gold,#B8935F)]" />
                          <span className="text-xs font-black uppercase tracking-wider">{t('checkout.bank')}</span>
                        </div>
                        <p className={`text-[10px] leading-snug ${selectedPayment === 'bank' ? 'text-[var(--color-surface,#FDFBF7)]/70' : 'text-[var(--color-ink,#1F120F)]/60'}`}>
                          {t('payment.bankDescription')}
                        </p>
                      </button>
                    </div>
                  </div>}

                  {/* Summary Review Card: 16px inner padding */}
                  <div className="p-4 rounded-2xl bg-[var(--color-surface,#FDFBF7)] dark:bg-[#1A201E] border border-[var(--color-gold,#B8935F)]/25 space-y-2 text-xs shadow-2xs">
                    {isQuoteRequestMode ? (
                      <div className="py-2 text-center text-[var(--color-emerald-dark,#042821)] dark:text-[#42f5bf] space-y-3">
                        <p className="font-serif font-black text-sm">
                          {t('checkout.quoteRequestTitle')}
                        </p>
                        <p className="text-[11.5px] leading-relaxed max-w-[280px] mx-auto opacity-90">
                          {t('checkout.quoteRequestNotice')}
                          <span className="block mt-2">{t('checkout.quoteNoPayment')}</span>
                        </p>
                        <div className="bg-[var(--color-emerald-dark,#042821)]/5 dark:bg-[#42f5bf]/10 p-3 rounded-xl border border-[var(--color-emerald-dark,#042821)]/10 text-start mt-3">
                          <p className="text-[10px] font-black uppercase tracking-wider mb-2 opacity-80">{t('checkout.items')}</p>
                          <div className="space-y-1.5">
                            {displayItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px]">
                                <span className="truncate max-w-[240px] font-medium text-[var(--color-ink,#1F120F)] dark:text-white">
                                  {getLocalized(item, 'name', language)} <span className="text-[10px] font-bold">({item.selectedWeight})</span>
                                </span>
                                <span className="font-bold">x {item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center pb-2 border-b border-[var(--color-gold,#B8935F)]/20">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">
                            {t('checkout.breakdown')}
                          </span>
                          <span className="text-[10px] font-serif font-bold text-[var(--color-gold,#B8935F)]">
                            {cartItems.length} {t('checkout.items')}
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px] text-[var(--color-ink,#1F120F)]/80 dark:text-[#FDFBF7]/80">
                          <span>{t('checkout.subtotalLabel')}</span>
                          <span className="font-bold text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">
                            Rs. {subtotal?.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px] text-[var(--color-ink,#1F120F)]/80 dark:text-[#FDFBF7]/80">
                          <span>{t('checkout.shippingLabel')} ({t(activeShippingMethod === 'standard' ? 'shipping.standard' : 'shipping.express')})</span>
                          <span className={`font-bold ${currentShippingFee === 0 ? 'text-[var(--color-gold,#B8935F)] font-black' : 'text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]'}`}>
                            {!hasEstimate ? t('shipping.pending') : currentShippingFee === 0 ? t('shipping.free') : `Rs. ${currentShippingFee?.toLocaleString()}`}
                          </span>
                        </div>

                        {(formData.giftWrapping || verifiedQuote?.freeGiftWrap) && (
                          <div className="flex justify-between text-[11px] text-[var(--color-gold,#B8935F)] font-bold">
                            <span>{t('checkout.giftLabel')}</span>
                            <span>{giftFeeTotal === 0 ? t('shipping.free') : `+Rs. ${GIFT_WRAP_FEE}`}</span>
                          </div>
                        )}

                        {discountAmt > 0 && (
                          <div className="flex justify-between text-[11px] text-[var(--color-gold,#B8935F)] font-bold">
                            <span>{t('checkout.discount')}</span>
                            <span>- Rs. {discountAmt?.toLocaleString()}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-[var(--color-gold,#B8935F)]/20 flex justify-between items-baseline">
                          <span className="text-xs font-serif font-black text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">{t('checkout.totalLabel')}</span>
                          <span className="text-base font-serif font-black text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">
                            {hasEstimate ? `Rs. ${finalPayable.toLocaleString()}` : t('shipping.pending')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Recipient & Shipping Snapshot */}
                  <div className="p-3.5 rounded-xl bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/30 text-[10px] space-y-1 text-[var(--color-ink,#1F120F)]/80">
                    <p className="font-bold text-[var(--color-ink,#1F120F)] flex items-center justify-between">
                      <span>{t('checkout.recipient')}: {formData.name}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep('details')}
                        className="min-h-11 text-[var(--color-accent-text,#806326)] hover:underline cursor-pointer"
                      >
                        {t('checkout.edit')}
                      </button>
                    </p>
                    <p className="truncate">{t('checkout.address')}: {formData.address || t('checkout.addressPending')}, {formData.city}</p>
                    <p>{t('checkout.windowLabel')}: {t(({ 'Fastest Dispatch': 'checkout.slotFastest', 'Morning (10 AM - 2 PM)': 'checkout.slotMorning', 'Evening (3 PM - 7 PM)': 'checkout.slotEvening', 'Night (7 PM - 10 PM)': 'checkout.slotNight' } as Record<string, string>)[formData.deliverySlot] || '', formData.deliverySlot)}</p>
                  </div>

                  {/* Submission Error Banner */}
                  {submissionError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 text-xs flex flex-col gap-2.5 text-start">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold">{t('checkout.notice')}</p>
                          <p className="text-[11px] mt-0.5 leading-relaxed">{submissionError}</p>
                        </div>
                      </div>
                      {supportAction?.whatsappUrl && (
                        <a
                          href={supportAction.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:bg-[#1EBE5D] transition-all shadow-xs"
                        >
                          <MessageCircle size={15} />
                          <span>{t('checkout.support')}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Step 3 Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('shipping')}
                      className="px-4 py-3 rounded-full bg-[var(--color-cream,#FAF9F5)] sm:bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/30 text-[var(--color-ink,#1F120F)] text-[var(--color-ink,#1F120F)] dark:text-[var(--color-ink,#1F120F)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--color-gold,#B8935F)]/10 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>{t('checkout.back')}</span>
                    </button>
                      <button
                        type="submit"
                        aria-busy={isSubmittingOrder || quoteLoading}
                        disabled={isSubmittingOrder || isValidatingCoupon || !online || authLoading || quoteLoading || !verifiedQuote}
                        className="purchase-checkout-submit flex-1 py-3.5 rounded-full bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)] text-xs font-black uppercase tracking-widest hover:bg-[var(--color-ink,#1F120F)]/90 hover:shadow-[0_4px_20px_rgba(184,147,95,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                      >
                        {isSubmittingOrder || quoteLoading ? <LoaderCircle size={16} aria-hidden="true" className="boutique-request-spinner text-[var(--color-gold,#B8935F)]" /> : <CheckCircle size={16} aria-hidden="true" className="text-[var(--color-gold,#B8935F)]" />}
                        <span>{isQuoteRequestMode ? t(isSubmittingOrder ? 'checkout.quoteSubmitting' : 'checkout.quoteSubmit') : isSubmittingOrder ? t('checkout.placingOrder', 'Placing Order…') : t('checkout.confirmOrder', 'Confirm & Place Order')}</span>
                      </button>
                  </div>
                </motion.div>
              )}
              {/* ───────────────── STEP 4: SUCCESS ───────────────── */}
              {currentStep === 'success' && orderSuccessResult && (
                <motion.div
                  key="step-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-5 text-center py-2"
                >
                  <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-gold,#B8935F)]/15 border-2 border-[var(--color-gold,#B8935F)] flex items-center justify-center text-[var(--color-gold,#B8935F)] shadow-lg">
                    <CheckCircle size={32} />
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-gold,#B8935F)] block mb-1">
                      {t('purchase.checkoutIntro')}
                    </span>
                    <h3 className="text-2xl font-serif font-black text-[var(--color-ink,#1F120F)] mb-1">
                      {t(orderSuccessResult.isQuoteRequest ? 'checkout.quoteReceived' : 'checkout.receiptReceived')}
                    </h3>
                    <p className="text-xs text-[var(--color-ink,#1F120F)]/70">
                      {t(orderSuccessResult.isQuoteRequest ? 'checkout.quoteRequestNotice' : 'checkout.receiptSaved')}
                    </p>
                  </div>

                  {/* Official Order ID Badge */}
                  <div className="purchase-checkout-form bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 rounded-2xl p-4 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-[var(--color-ink,#1F120F)]/60 mb-1 tracking-wider">
                      {t('checkout.trackingId')}
                    </p>
                    <p className="text-xl font-mono font-black text-[var(--color-ink,#1F120F)] tracking-wider">
                      {orderSuccessResult.orderId}
                    </p>
                  </div>

                  {/* Itemized Order Breakdown */}
                  {orderItemsSnapshot.length > 0 && (
                    <div className="bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/25 rounded-2xl p-4 text-start shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[var(--color-gold,#B8935F)]/15 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70">
                          {t('checkout.orderedItems')} ({orderItemsSnapshot.length})
                        </span>
                        <span className="text-[10px] font-bold text-[var(--color-gold,#B8935F)]">
                          {orderSuccessResult.isQuoteRequest ? t('checkout.quoteNoPayment') : selectedPayment === 'bank' ? t('checkout.bank') : t('checkout.cod')}
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                        {orderItemsSnapshot.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] text-[var(--color-ink,#1F120F)]/85">
                            <span className="truncate max-w-[220px]">
                              {getLocalized(item, 'name', language)} <span className="text-[10px] font-medium text-[var(--color-gold,#B8935F)]">({item.selectedWeight})</span> x {item.quantity}
                            </span>
                            {!orderSuccessResult.isQuoteRequest && <span className="font-bold shrink-0">
                              Rs. {(parsePrice(item.unitPrice ?? item.price) * item.quantity).toLocaleString()}
                            </span>}
                          </div>
                        ))}
                      </div>

                      {savedTotals && !orderSuccessResult.isQuoteRequest && (
                        <div className="border-t border-[var(--color-gold,#B8935F)]/15 pt-2 flex justify-between items-center text-xs">
                          <span className="font-bold text-[var(--color-ink,#1F120F)]">{t('checkout.totalLabel')}</span>
                          <span className="font-serif font-black text-sm text-[var(--color-emerald,#042821)]">
                            Rs. {savedTotals.finalPayable.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bank Transfer Details (if bank payment was chosen) */}
                  {selectedPayment === 'bank' && !orderSuccessResult.isQuoteRequest && (
                    <div className="bg-[#FAF9F5] border border-[#C7982F]/40 rounded-2xl p-4 text-start text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[var(--color-gold,#B8935F)] font-bold text-xs uppercase tracking-wider">
                        <Building2 size={14} />
                        <span>{t('payment.transferDetails')}</span>
                      </div>
                      <div className="text-[11px] text-[var(--color-ink,#1F120F)]/80 space-y-0.5 pt-1">
                        <p>{t('payment.confirmInstructions')}</p>
                      </div>
                      <p className="text-[10px] text-[var(--color-ink,#1F120F)]/60 pt-1">
                        {t('payment.shareReceipt')}
                      </p>
                    </div>
                  )}

                  {!currentUser && (
                    <div className="bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/50 rounded-xl p-4 shadow-sm text-start my-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-ink,#1F120F)] flex items-center justify-center shrink-0 text-[var(--color-gold,#B8935F)]">
                          <Crown size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-serif font-black text-[var(--color-ink,#1F120F)] leading-tight">
                            {t('checkout.accountTitle')}
                          </h4>
                          <p className="text-[10.5px] text-[var(--color-ink,#1F120F)]/70 mt-1 leading-snug">
                            {t('checkout.accountCopy')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => { onClose(); if(onOpenAuth) onOpenAuth(); }}
                          className="flex-1 py-2.5 min-h-[44px] rounded-lg bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] font-black text-[10px] uppercase tracking-widest text-center cursor-pointer"
                        >
                          {t('checkout.createAccount')}
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 py-2.5 min-h-[44px] rounded-lg bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/30 text-[var(--color-ink,#1F120F)] font-bold text-[10px] uppercase tracking-widest text-center cursor-pointer"
                        >
                          {t('checkout.later')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <a
                      href={orderSuccessResult.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 min-h-[48px] rounded-full bg-[#25D366] text-white font-black uppercase tracking-widest hover:bg-[#1da851] hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs"
                    >
                      <MessageCircle size={16} />
                      <span>{t('checkout.trackWhatsApp')}</span>
                    </a>
                    <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">{t('checkout.trackingSendNotice')}</p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3.5 min-h-[48px] rounded-full bg-[var(--color-surface,#FDFBF7)] text-[var(--color-ink,#1F120F)] border border-[var(--color-gold,#B8935F)]/30 font-bold uppercase tracking-widest hover:bg-[var(--color-gold,#B8935F)]/10 transition-colors cursor-pointer"
                    >
                      {t('checkout.continueShopping')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </form>

        {/* 4. Bottom Security Reassurance (Hide on Success) */}
        {currentStep !== 'success' && (
          <div className="px-4 sm:px-6 py-2.5 border-t border-[var(--color-gold,#B8935F)]/20 bg-[var(--color-surface,#FDFBF7)]/70 flex flex-wrap items-center justify-between gap-1.5 text-[9.5px] text-[var(--color-ink,#1F120F)]/65 shrink-0">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-[var(--color-gold,#B8935F)]" />
              {t('checkout.reviewDetails')}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-[var(--color-gold,#B8935F)]" />
              {t('checkout.supportAvailable')}
            </span>
          </div>
        )}
      </motion.div>

    </div>
  );
}
import { sanitizeFirestoreData } from '../lib/firestoreData';
