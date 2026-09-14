import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle,
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
import { placeOrder } from '../lib/order';

// Popular Lahore Neighborhoods for Rapid Delivery Pinning

export type CheckoutStep = 'details' | 'shipping' | 'payment' | 'success';

interface CheckoutPageProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

export default function CheckoutPage({ isOpen, onClose: propsOnClose, onOpenAuth: propsOnOpenAuth }: CheckoutPageProps = {}) {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { patronProfile, currentUser } = useAuth();
  const onOpenAuth = propsOnOpenAuth || (() => {});

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
  const [orderSuccessResult, setOrderSuccessResult] = useState<{ orderId: string; whatsappUrl: string; claimToken?: string } | null>(null);

  const selectedShippingMethod = 'standard';
  const [internalShippingMethod, setInternalShippingMethod] = useState<ShippingMethodId>(selectedShippingMethod);
  const activeShippingMethod = internalShippingMethod;
  const [selectedPayment, setSelectedPayment] = useState<string>('cod');

  const [formData, setFormData] = useState({
    name: patronProfile?.name || '',
    phone: patronProfile?.phone || '',
    address: '',
    city: 'Lahore',
    deliverySlot: 'Fastest Dispatch',
    giftWrapping: false,
    giftMessage: '',
    instructions: ''
  });

  const [couponCode, setCouponCode] = useState('');
  const [discountAmt, setDiscountAmt] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState<string | null>(null);
  const [couponErrorMsg, setCouponErrorMsg] = useState<string | null>(null);
  const [activeReward, setActiveReward] = useState<any>(null);
  const [rewardDetails, setRewardDetails] = useState<any>(null);

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
        address: prev.address.trim() ? prev.address : (patronProfile.address || ''),
        city: prev.city.trim() ? prev.city : (patronProfile.city || 'Lahore')
      }));
    }
  }, [patronProfile]);

  // Load active rewards safely
  useEffect(() => {
    if (currentUser) {
      let isMounted = true;
      import('../data/rewards').then(mod => {
        if (isMounted) setRewardDetails(mod.REWARDS);
      }).catch(console.error);

      import('firebase/firestore').then(({ collection, query, where, getDocs }) => {
        import('../lib/firebase').then(({ db }) => {
          const arQuery = query(collection(db, "users", currentUser.uid, "activeRewards"), where("status", "==", "ACTIVE"));
          getDocs(arQuery).then(snap => {
            if (isMounted && !snap.empty) {
              setActiveReward(snap.docs[0].data());
            }
          }).catch(e => console.error(e));
        }).catch(console.error);
      }).catch(console.error);

      return () => { isMounted = false; };
    }
  }, [currentUser]);

  const onClose = propsOnClose || (() => { navigate('/shop'); });
  const onClearCart = () => { clearCart(); };
  const isWholesale = false;

  const handleShippingChange = (method: ShippingMethodId) => {
    setInternalShippingMethod(method);
  };

  // Smart Auto-Scroll to Error Input Field
  const scrollToErrorField = (fieldId: string) => {
    setTimeout(() => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.classList.add('animate-error-shake');
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
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-[var(--color-gold,#B8935F)]/20 text-center">
          <div className="w-20 h-20 bg-[var(--color-cream,#FAF9F5)] rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={32} className="text-[var(--color-gold,#B8935F)]" />
          </div>
          <h2 className="text-2xl font-serif font-black text-[var(--color-ink,#1F120F)] mb-3">Your Box is Empty</h2>
          <p className="text-[13px] text-[var(--color-ink,#1F120F)]/70 mb-8 leading-relaxed">
            It looks like you haven't added any luxury items to your box yet. Discover our latest collections.
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="w-full py-3.5 rounded-full bg-[var(--color-ink,#1F120F)] text-white font-bold text-xs uppercase tracking-[0.2em] hover:bg-[var(--color-gold,#B8935F)] transition-colors cursor-pointer"
          >
            Browse Collections
          </button>
        </div>
      </div>
    );
  }

  // Map Picker State

  
  const handleBlur = (field: string) => {
    let err = '';
    if (field === 'name') {
      if (!formData.name.trim() || formData.name.trim().length < 3) err = 'Full name must be at least 3 characters.';
    }
    if (field === 'phone') {
      const cleanPhone = formData.phone.replace(/[\s-]/g, '');
      const pkPhoneRegex = /^((\+92)|(0092))-{0,1}\d{3}-{0,1}\d{7}$|^\d{11}$|^\d{4}-\d{7}$/;
      if (!cleanPhone) err = 'Phone number is required.';
      else if (!pkPhoneRegex.test(cleanPhone)) err = 'Please enter a valid Pakistani number (e.g., 03001234567)';
    }
    if (field === 'address') {
      if (!formData.address.trim() || formData.address.trim().length < 8) err = 'Please provide a complete street address.';
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
      errs.name = 'Please enter your full recipient name (min 3 characters).';
      if (!firstErrorId) firstErrorId = 'checkout-field-name';
    }
    const cleanPhone = formData.phone.replace(/[\s-]/g, '');
    const isPkPhone = /^(03\d{9}|\+923\d{9})$/.test(cleanPhone);
    if (!cleanPhone) {
      errs.phone = 'Please enter your phone or WhatsApp number.';
      if (!firstErrorId) firstErrorId = 'checkout-field-phone';
    } else if (!isPkPhone) {
      errs.phone = 'Please enter an 11-digit Pakistani mobile number (e.g., 03160666083).';
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
      errs.address = 'Please enter a complete delivery address with house, street, or sector details.';
      firstErrorId = 'checkout-field-address';
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
      setCurrentStep('payment');
    }
  };

  const handleApplyCoupon = () => {
    setCouponErrorMsg(null);
    setCouponSuccessMsg(null);
    if (!couponCode.trim()) {
      setCouponErrorMsg('Please enter a valid coupon code.');
      return;
    }

    setIsValidatingCoupon(true);
    setTimeout(() => {
      setIsValidatingCoupon(false);
      if (couponCode.toUpperCase().trim() === 'ALLBARKA10') {
        const discount = subtotal * 0.10;
        setDiscountAmt(discount);
        setCouponSuccessMsg('Complimentary 10% boutique discount applied.');
      } else {
        setDiscountAmt(0);
        setCouponErrorMsg('Code not recognized or expired for this harvest season.');
      }
    }, 600);
  };



  const GIFT_WRAP_FEE = 250;
  const subtotal = cartItems.reduce((acc, item) => acc + (parsePrice(item.unitPrice ?? item.price) * item.quantity), 0);
  const currentShippingFee = calculateShippingFee(activeShippingMethod, subtotal);
  const selectedMethodObj = SHIPPING_METHODS.find(m => m.id === activeShippingMethod) || SHIPPING_METHODS[0];
  const giftFeeTotal = formData.giftWrapping ? GIFT_WRAP_FEE : 0;
  const finalPayable = Math.max(0, subtotal - discountAmt) + currentShippingFee + giftFeeTotal;

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

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmittingOrder(true);
    setSubmissionError(null);

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
      let authToken: string | null = null;
      if (currentUser) {
        try {
          authToken = await currentUser.getIdToken();
        } catch (tokenErr) {
          console.warn('Could not acquire patron ID token:', tokenErr);
        }
      }

      const orderResult = await placeOrder({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        deliverySlot: formData.deliverySlot,
        instructions: formData.instructions,
        giftWrapping: formData.giftWrapping,
        giftMessage: formData.giftMessage,
        paymentMethod: selectedPayment,
        items: cartItems.map(item => ({
          ...item,
          price: parsePrice(item.unitPrice ?? item.price)
        })),
        shippingMethodId: activeShippingMethod,
        discountCode: couponCode,
        isWholesale,
        expectedFinalTotal: finalPayable,
        authToken
      });

      if (!orderResult.success) {
        setSubmissionError(orderResult.error || 'Unable to complete order placement.');
        setSupportAction(orderResult.supportAction || null);
        return;
      }

      const orderId = orderResult.orderId!;
      const whatsappUrl = orderResult.whatsappMessage
        ? `https://wa.me/${STORE_CONFIG.whatsappBusinessNumber}?text=${encodeURIComponent(orderResult.whatsappMessage)}`
        : `https://wa.me/${STORE_CONFIG.whatsappBusinessNumber}?text=${encodeURIComponent(`AllBarka Order ${orderId}`)}`;

      if (orderResult.claimToken) {
        sessionStorage.setItem("pendingClaimToken", orderResult.claimToken);
        sessionStorage.setItem("pendingOrderId", orderId);
      }
      
      // Save order confirmation snapshot in session storage for resilient recovery
      try {
        sessionStorage.setItem("allbarka_order_success", JSON.stringify({
          orderId,
          whatsappUrl,
          claimToken: orderResult.claimToken,
          items: itemsSnapshot,
          totals: totalsSnapshot,
          customer: {
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            paymentMethod: selectedPayment
          }
        }));
      } catch (storageErr) {
        console.warn("Could not write order success snapshot to sessionStorage:", storageErr);
      }

      if (currentUser) {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          await setDoc(doc(db, 'users', currentUser.uid), {
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            city: formData.city
          }, { merge: true });
        } catch (e) {
          console.warn("Could not save address to patron profile:", e);
        }
      }

      setOrderSuccessResult({
        orderId,
        claimToken: orderResult.claimToken || undefined,
        whatsappUrl
      });
      
      setCurrentStep('success');
      onClearCart();
    } catch (err: any) {
      console.error('Order placement failed:', err);
      setSubmissionError(err.message || 'Unable to place order. Please check your connection and try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="w-full flex justify-center py-12 px-4 sm:px-6 select-none relative z-10">

      {/* Main Checkout Modal Container: 24px Outer Padding without restrictive max-h */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 16 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 max-w-lg w-full rounded-[24px] sm:rounded-[28px] shadow-[0_24px_70px_rgba(31,18,15,0.3),0_0_30px_rgba(184,147,95,0.15)] relative overflow-hidden z-10 flex flex-col"
      >
        <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--color-gold,#B8935F)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header (24px padding on sides) */}
        <div className="px-6 py-4.5 border-b border-[var(--color-gold,#B8935F)]/20 bg-white/85 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-ink,#1F120F)] border border-[var(--color-gold,#B8935F)]/60 flex items-center justify-center text-[var(--color-gold,#B8935F)] shadow-xs shrink-0">
              <ShoppingBag size={18} className="text-[var(--color-gold,#B8935F)]" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-[var(--color-ink,#1F120F)] leading-tight">
                Curated Checkout
              </h3>
              <p className="text-[9.5px] text-[var(--color-gold,#B8935F)] font-bold uppercase tracking-widest leading-none mt-0.5">
                AllBarka Luxury Order
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--color-ink,#1F120F)]/5 hover:bg-[var(--color-ink,#1F120F)]/10 text-[var(--color-ink,#1F120F)] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close checkout"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. Vertical Multi-Step Process Header */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-[var(--color-gold,#B8935F)]/15 bg-white/50 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep('details')}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer ${
                currentStep === 'details'
                  ? 'bg-[#1F120F] text-[#FDFBF7] border-[#B8935F] shadow-xs'
                  : 'bg-white/80 text-[#1F120F]/70 border-[#B8935F]/20 hover:border-[#B8935F]/40'
              }`}
            >
              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 ${
                currentStep === 'details' ? 'bg-[#B8935F] text-[#1F120F]' : 'bg-[#1F120F]/10 text-[#1F120F]'
              }`}>
                1
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider">Details</span>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => { if (validateStep1(true)) setCurrentStep('shipping'); }}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer ${
                currentStep === 'shipping'
                  ? 'bg-[#1F120F] text-[#FDFBF7] border-[#B8935F] shadow-xs'
                  : 'bg-white/80 text-[#1F120F]/70 border-[#B8935F]/20 hover:border-[#B8935F]/40'
              }`}
            >
              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 ${
                currentStep === 'shipping' ? 'bg-[#B8935F] text-[#1F120F]' : 'bg-[#1F120F]/10 text-[#1F120F]'
              }`}>
                2
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider">Shipping</span>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => {
                if (!validateStep1(true)) { setCurrentStep('details'); return; }
                if (!validateStep2(true)) { setCurrentStep('shipping'); return; }
                setCurrentStep('payment');
              }}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer ${
                currentStep === 'payment'
                  ? 'bg-[#1F120F] text-[#FDFBF7] border-[#B8935F] shadow-xs'
                  : 'bg-white/80 text-[#1F120F]/70 border-[#B8935F]/20 hover:border-[#B8935F]/40'
              }`}
            >
              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 ${
                currentStep === 'payment' ? 'bg-[#B8935F] text-[#1F120F]' : 'bg-[#1F120F]/10 text-[#1F120F]'
              }`}>
                3
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider">Review</span>
            </button>
          </div>
        </div>
        
        {/* 3. Form Content (24px container padding) */}
        <form
          id="checkoutForm"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto min-h-0 px-6 py-5 pb-10 space-y-4 [scrollbar-width:thin]"
        >
          {/* Skeleton State on Submitting Order */}
          {isSubmittingOrder && (
            <div className="p-4 rounded-2xl bg-white border border-[var(--color-gold,#B8935F)]/30 space-y-3">
              <div className="h-4 w-36 rounded luxury-skeleton" />
              <div className="h-8 w-full rounded-xl luxury-skeleton" />
              <div className="h-14 w-full rounded-xl luxury-skeleton" />
              <p className="text-center text-[10px] uppercase font-bold tracking-widest text-[var(--color-gold,#B8935F)] animate-pulse pt-2">
                Compiling WhatsApp Encrypted Receipt...
              </p>
            </div>
          )}

          {!isSubmittingOrder && (
            <AnimatePresence mode="wait">
              {/* ───────────────── STEP 1: CONTACT & CLIENT DETAILS ───────────────── */}
              {currentStep === 'details' && (
                <motion.div
                  key="step-details"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
                            Pre-filled recipient info & VIP loyalty points enabled
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-gold,#B8935F)] shrink-0">
                        <ShieldCheck size={14} />
                        <span>Verified</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-white border border-[var(--color-gold,#B8935F)]/30 shadow-2xs flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/25 flex items-center justify-center text-[var(--color-gold,#B8935F)] shrink-0">
                          <ShoppingBag size={13} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-[var(--color-ink,#1F120F)] block">
                            Checking out as Guest
                          </span>
                          <span className="text-[9.5px] text-[var(--color-ink-muted,#5A5A5A)]">
                            Instant express order without account
                          </span>
                        </div>
                      </div>
                      {onOpenAuth && (
                        <button
                          type="button"
                          onClick={onOpenAuth}
                          className="px-2.5 py-1 rounded-lg bg-[var(--color-cream,#FAF9F5)] hover:bg-[#B8935F] text-[var(--color-ink,#1F120F)] hover:text-white border border-[var(--color-gold,#B8935F)]/35 text-[10px] font-bold tracking-wider transition-colors shrink-0 cursor-pointer"
                        >
                          Sign In
                        </button>
                      )}
                    </div>
                  )}

                  {/* VIP Assurance Banner */}
                  {patronProfile && patronProfile.address && (
                    <div className="p-3 rounded-2xl bg-[#043327]/10 border border-[#D4AF37]/40 text-[#043327] flex items-center justify-between text-xs font-semibold mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-[#D4AF37]" />
                        <span>Welcome back, <strong>{patronProfile.name}</strong>! Your saved Lahore address is auto-filled.</span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-[#D4AF37] bg-white px-2 py-0.5 rounded-full border border-[#D4AF37]/30">Auto-Filled</span>
                    </div>
                  )}

                  {/* Recipient Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                      Recipient Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 text-[var(--color-gold,#B8935F)]" size={16} />
                      <input
                        id="checkout-field-name"
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        onBlur={() => handleBlur('name')}
                        placeholder="e.g. Taha Ishaque"
                        className={`w-full bg-white border rounded-xl py-3 pl-10 pr-3.5 text-base sm:text-sm font-semibold text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/30 focus:outline-none transition-all ${
                          errors.name
                            ? 'border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/30 shadow-xs'
                            : 'border-[var(--color-gold,#B8935F)]/30 focus:border-[var(--color-gold,#B8935F)] focus:ring-1 focus:ring-[var(--color-gold,#B8935F)]'
                        }`}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{errors.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Phone / WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                      Phone / WhatsApp Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 text-[var(--color-gold,#B8935F)]" size={16} />
                      <input
                        id="checkout-field-phone"
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        onBlur={() => handleBlur('phone')}
                        placeholder="e.g. 03160666083"
                        className={`w-full bg-white border rounded-xl py-3 pl-10 pr-3.5 text-base sm:text-sm font-semibold text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/30 focus:outline-none transition-all ${
                          errors.phone
                            ? 'border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/30 shadow-xs'
                            : 'border-[var(--color-gold,#B8935F)]/30 focus:border-[var(--color-gold,#B8935F)] focus:ring-1 focus:ring-[var(--color-gold,#B8935F)]'
                        }`}
                      />
                    </div>
                    {errors.phone ? (
                      <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{errors.phone}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-[var(--color-ink,#1F120F)]/60 mt-1">
                        Used for dispatch confirmation & live courier delivery updates.
                      </p>
                    )}
                  </div>

                  {/* Special Delivery Notes */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                      Special Delivery Instructions (Optional)
                    </label>
                    <textarea
                      value={formData.instructions || ''}
                      onChange={(e) => handleInputChange('instructions', e.target.value)}
                      placeholder="e.g. Please call before arrival or leave with gate security."
                      className="w-full bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-2.5 px-3.5 text-base sm:text-sm font-medium text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/30 h-18 resize-none focus:outline-none focus:border-[var(--color-gold,#B8935F)]"
                    />
                  </div>

                  {/* Order Overview Summary Card: 16px inner padding */}
                  <div className="p-4 rounded-2xl bg-white border border-[var(--color-gold,#B8935F)]/25 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70">
                        Selected Harvest Items
                      </span>
                      <span className="text-[11px] font-serif font-bold text-[var(--color-gold,#B8935F)]">
                        {cartItems.length} {cartItems.length === 1 ? 'variety' : 'varieties'}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] text-[var(--color-ink,#1F120F)]/80">
                          <span className="truncate max-w-[240px]">
                            {item.name} <span className="text-[10px] text-[var(--color-gold,#B8935F)]">({item.selectedWeight})</span> x {item.quantity}
                          </span>
                          <span className="font-bold shrink-0">Rs. {(item.price * item.quantity)?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 1 Forward Button */}
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="w-full py-3.5 rounded-full bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)] text-xs font-black uppercase tracking-widest hover:bg-[var(--color-ink,#1F120F)]/90 hover:shadow-[0_4px_20px_rgba(184,147,95,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>Continue to Shipping & Address</span>
                    <ArrowRight size={14} className="text-[var(--color-gold,#B8935F)]" />
                  </button>
                </motion.div>
              )}

              {/* ───────────────── STEP 2: SHIPPING & DELIVERY ───────────────── */}
              {currentStep === 'shipping' && (
                <motion.div
                  key="step-shipping"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  {/* Shipping Address with Locate on Map */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                        Full Shipping Address *
                      </label>
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 text-[var(--color-gold,#B8935F)]" size={16} />
                      <input
                        id="checkout-field-address"
                        type="text"
                        value={formData.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        onBlur={() => handleBlur('address')}
                        placeholder="House #, Street #, Block / Phase, Landmark"
                        className={`w-full bg-white border rounded-xl py-3 pl-10 pr-3.5 text-base sm:text-sm font-semibold text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/30 focus:outline-none transition-all ${
                          errors.address
                            ? 'border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/30 shadow-xs'
                            : 'border-[var(--color-gold,#B8935F)]/30 focus:border-[var(--color-gold,#B8935F)] focus:ring-1 focus:ring-[var(--color-gold,#B8935F)]'
                        }`}
                      />
                    </div>
                    {errors.address && (
                      <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{errors.address}</span>
                      </p>
                    )}
                    {formData.address.includes('http') && (
                      <p className="text-[10px] text-[var(--color-gold,#B8935F)] font-bold mt-1 flex items-center gap-1">
                        <CheckCircle size={12} className="text-[var(--color-gold,#B8935F)]" />
                        Live Google Maps link attached for precision courier routing.
                      </p>
                    )}
                  </div>

                  {/* Destination City */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                      Destination City
                    </label>
                    <select
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 px-3.5 text-base sm:text-sm min-h-[44px] font-bold text-[var(--color-ink,#1F120F)] focus:outline-none focus:border-[var(--color-gold,#B8935F)] shadow-2xs cursor-pointer"
                    >
                      <option value="Lahore">Lahore (Same-Day / Direct Dispatch)</option>
                      <option value="Karachi">Karachi</option>
                      <option value="Islamabad">Islamabad</option>
                      <option value="Rawalpindi">Rawalpindi</option>
                      <option value="Faisalabad">Faisalabad</option>
                      <option value="Peshawar">Peshawar</option>
                      <option value="Multan">Multan</option>
                      <option value="Other City">Other City (Nationwide Air Express)</option>
                    </select>
                  </div>

                  {/* Luxury Shipping Method Selector */}
                  <div className="pt-1">
                    <ShippingMethodSelector
                      selected={activeShippingMethod}
                      onSelect={handleShippingChange}
                      subtotal={subtotal}
                    />
                  </div>

                  {/* Preferred Delivery Time Slot */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80 flex items-center gap-1.5">
                      <Clock size={13} className="text-[var(--color-gold,#B8935F)]" />
                      Preferred Delivery Window
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'Fastest Dispatch', label: 'Fastest Dispatch', icon: Zap },
                        { id: 'Morning (10 AM - 2 PM)', label: 'Morning (10 AM - 2 PM)', icon: Sun },
                        { id: 'Evening (3 PM - 7 PM)', label: 'Evening (3 PM - 7 PM)', icon: Sunset },
                        { id: 'Night (7 PM - 10 PM)', label: 'Night (7 PM - 10 PM)', icon: Moon },
                      ].map((slot) => {
                        const isSelected = formData.deliverySlot === slot.id;
                        const IconComp = slot.icon;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => handleInputChange('deliverySlot', slot.id)}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border-[var(--color-gold,#B8935F)] shadow-xs font-black'
                                : 'bg-white text-[var(--color-ink,#1F120F)]/80 border-[var(--color-gold,#B8935F)]/25 hover:border-[var(--color-gold,#B8935F)]/60'
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
                        : 'bg-white border-[var(--color-gold,#B8935F)]/25 hover:border-[var(--color-gold,#B8935F)]/50'
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.giftWrapping}
                        onChange={(e) => handleInputChange('giftWrapping', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-[var(--color-ink,#1F120F)] accent-[var(--color-ink,#1F120F)] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[var(--color-ink,#1F120F)] flex items-center gap-1.5">
                            <Gift size={14} className="text-[var(--color-gold,#B8935F)]" />
                            Premium Gift Box & Handwritten Card
                          </span>
                          <span className="text-xs font-bold text-[var(--color-gold,#B8935F)] font-serif shrink-0">
                            +Rs. {GIFT_WRAP_FEE}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--color-ink,#1F120F)]/65 mt-0.5 leading-relaxed">
                          Satin luxury gold ribbon, embossed presentation sleeve, and personalized calligraphed card.
                        </p>
                      </div>
                    </label>

                    {formData.giftWrapping && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-gold,#B8935F)]/20">
                        <label className="block text-[9.5px] font-black text-[var(--color-ink,#1F120F)]/75 uppercase tracking-widest mb-1">
                          Custom Message on Card
                        </label>
                        <input
                          type="text"
                          value={formData.giftMessage || ''}
                          onChange={(e) => handleInputChange('giftMessage', e.target.value)}
                          placeholder="e.g. Wishing you health and abundant prosperity! - From Ahmad"
                          className="w-full bg-white border border-[var(--color-gold,#B8935F)]/35 rounded-xl py-2.5 px-3 text-base sm:text-sm font-medium focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/30"
                        />
                      </div>
                    )}
                  </div>

                  {/* Step 2 Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('details')}
                      className="px-4 py-3 rounded-full bg-white border border-[var(--color-gold,#B8935F)]/30 text-[var(--color-ink,#1F120F)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--color-gold,#B8935F)]/10 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToStep3}
                      className="flex-1 py-3.5 rounded-full bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)] text-xs font-black uppercase tracking-widest hover:bg-[var(--color-ink,#1F120F)]/90 hover:shadow-[0_4px_20px_rgba(184,147,95,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Proceed to Payment & Review</span>
                      <ArrowRight size={14} className="text-[var(--color-gold,#B8935F)]" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ───────────────── STEP 3: PAYMENT & ORDER REVIEW ───────────────── */}
              {currentStep === 'payment' && (
                <motion.div
                  key="step-payment"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  {/* Payment Protocol Selector */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80">
                      Payment Protocol *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment('cod')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          selectedPayment === 'cod'
                            ? 'bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border-[var(--color-gold,#B8935F)] shadow-xs'
                            : 'bg-white text-[var(--color-ink,#1F120F)] border-[var(--color-gold,#B8935F)]/25 hover:border-[var(--color-gold,#B8935F)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard size={15} className="text-[var(--color-gold,#B8935F)]" />
                          <span className="text-xs font-black uppercase tracking-wider">Cash on Delivery</span>
                        </div>
                        <p className={`text-[10px] leading-snug ${selectedPayment === 'cod' ? 'text-[var(--color-surface,#FDFBF7)]/70' : 'text-[var(--color-ink,#1F120F)]/60'}`}>
                          Pay upon delivery inspection in Lahore & nationwide.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPayment('bank')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          selectedPayment === 'bank'
                            ? 'bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border-[var(--color-gold,#B8935F)] shadow-xs'
                            : 'bg-white text-[var(--color-ink,#1F120F)] border-[var(--color-gold,#B8935F)]/25 hover:border-[var(--color-gold,#B8935F)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 size={15} className="text-[var(--color-gold,#B8935F)]" />
                          <span className="text-xs font-black uppercase tracking-wider">Direct Bank Transfer</span>
                        </div>
                        <p className={`text-[10px] leading-snug ${selectedPayment === 'bank' ? 'text-[var(--color-surface,#FDFBF7)]/70' : 'text-[var(--color-ink,#1F120F)]/60'}`}>
                          Meezan / HBL / Raast account details generated on receipt.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Promo Code Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)]/80 flex items-center gap-1">
                      <Tag size={12} className="text-[var(--color-gold,#B8935F)]" />
                      Boutique Promo Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponErrorMsg(null);
                          setCouponSuccessMsg(null);
                        }}
                        placeholder="Enter ALLBARKA10"
                        className="flex-1 bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-2.5 px-3.5 text-base sm:text-sm min-h-[44px] font-semibold focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] uppercase placeholder:normal-case placeholder:text-[var(--color-ink,#1F120F)]/30"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon}
                        className="bg-[var(--color-ink,#1F120F)] text-[var(--color-gold,#B8935F)] border border-[var(--color-gold,#B8935F)]/50 px-4 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[var(--color-ink,#1F120F)]/80 transition-colors cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        {isValidatingCoupon ? 'Checking...' : 'Apply'}
                      </button>
                    </div>

                    {isValidatingCoupon && (
                      <div className="h-6 w-full rounded luxury-skeleton mt-1" />
                    )}

                    {couponSuccessMsg && (
                      <p className="text-[10.5px] text-[var(--color-gold,#B8935F)] font-black uppercase tracking-wide flex items-center gap-1">
                        <Sparkles size={12} className="text-[var(--color-gold,#B8935F)]" /> {couponSuccessMsg}
                      </p>
                    )}
                    {couponErrorMsg && (
                      <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{couponErrorMsg}</span>
                      </p>
                    )}
                  </div>

                  {/* Summary Review Card: 16px inner padding */}
                  <div className="p-4 rounded-2xl bg-white border border-[var(--color-gold,#B8935F)]/25 space-y-2 text-xs shadow-2xs">
                    <div className="flex justify-between items-center pb-2 border-b border-[var(--color-gold,#B8935F)]/20">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]">
                        Valuation Breakdown
                      </span>
                      <span className="text-[10px] font-serif font-bold text-[var(--color-gold,#B8935F)]">
                        {cartItems.length} items
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-[var(--color-ink,#1F120F)]/80">
                      <span>Harvest Items Subtotal</span>
                      <span className="font-bold text-[var(--color-ink,#1F120F)]">
                        Rs. {subtotal?.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-[var(--color-ink,#1F120F)]/80">
                      <span>Shipping ({selectedMethodObj.title})</span>
                      <span className={`font-bold ${currentShippingFee === 0 ? 'text-[var(--color-gold,#B8935F)] font-black' : 'text-[var(--color-ink,#1F120F)]'}`}>
                        {currentShippingFee === 0 ? 'FREE' : `Rs. ${currentShippingFee?.toLocaleString()}`}
                      </span>
                    </div>

                    {formData.giftWrapping && (
                      <div className="flex justify-between text-[11px] text-[var(--color-gold,#B8935F)] font-bold">
                        <span>Luxury Gift Box & Handwritten Card</span>
                        <span>+Rs. {GIFT_WRAP_FEE}</span>
                      </div>
                    )}

                    {discountAmt > 0 && (
                      <div className="flex justify-between text-[11px] text-[var(--color-gold,#B8935F)] font-bold">
                        <span>Promo Code Discount (10%)</span>
                        <span>- Rs. {discountAmt?.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[var(--color-gold,#B8935F)]/20 flex justify-between items-baseline">
                      <span className="text-xs font-serif font-black text-[var(--color-ink,#1F120F)]">Total Payable</span>
                      <span className="text-base font-serif font-black text-[var(--color-ink,#1F120F)]">
                        Rs. {finalPayable?.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Recipient & Shipping Snapshot */}
                  <div className="p-3.5 rounded-xl bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/30 text-[10px] space-y-1 text-[var(--color-ink,#1F120F)]/80">
                    <p className="font-bold text-[var(--color-ink,#1F120F)] flex items-center justify-between">
                      <span>Recipient: {formData.name || 'Patron'}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep('details')}
                        className="text-[var(--color-gold,#B8935F)] hover:underline cursor-pointer"
                      >
                        Edit Details
                      </button>
                    </p>
                    <p className="truncate">Address: {formData.address || 'Address pending'}, {formData.city}</p>
                    <p>Delivery Slot: {formData.deliverySlot}</p>
                  </div>

                  {/* Submission Error Banner */}
                  {submissionError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2.5 text-left">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold">Order Placement Notice</p>
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
                          <span>{supportAction.label || 'Place Order via WhatsApp Concierge'}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Step 3 Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('shipping')}
                      className="px-4 py-3 rounded-full bg-white border border-[var(--color-gold,#B8935F)]/30 text-[var(--color-ink,#1F120F)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--color-gold,#B8935F)]/10 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingOrder}
                      className="flex-1 py-3.5 rounded-full bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)] text-xs font-black uppercase tracking-widest hover:bg-[var(--color-ink,#1F120F)]/90 hover:shadow-[0_4px_20px_rgba(184,147,95,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      <CheckCircle size={16} className="text-[var(--color-gold,#B8935F)]" />
                      <span>{isSubmittingOrder ? 'Placing Order...' : 'Confirm & Place Order'}</span>
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
                      AllBarka Reserve Order
                    </span>
                    <h3 className="text-2xl font-serif font-black text-[var(--color-ink,#1F120F)] mb-1">
                      Order Confirmed
                    </h3>
                    <p className="text-xs text-[var(--color-ink,#1F120F)]/70">
                      Your gourmet harvest package has been registered with priority concierge dispatch.
                    </p>
                  </div>

                  {/* Official Order ID Badge */}
                  <div className="bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 rounded-2xl p-4 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-[var(--color-ink,#1F120F)]/60 mb-1 tracking-wider">
                      Official Tracking Order ID
                    </p>
                    <p className="text-xl font-mono font-black text-[var(--color-ink,#1F120F)] tracking-wider">
                      {orderSuccessResult.orderId}
                    </p>
                  </div>

                  {/* Itemized Order Breakdown */}
                  {orderItemsSnapshot.length > 0 && (
                    <div className="bg-white border border-[var(--color-gold,#B8935F)]/25 rounded-2xl p-4 text-left shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[var(--color-gold,#B8935F)]/15 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70">
                          Ordered Items ({orderItemsSnapshot.length})
                        </span>
                        <span className="text-[10px] font-bold text-[var(--color-gold,#B8935F)]">
                          {selectedPayment === 'bank' ? 'Direct Bank / Raast' : 'Cash on Delivery'}
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                        {orderItemsSnapshot.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] text-[var(--color-ink,#1F120F)]/85">
                            <span className="truncate max-w-[220px]">
                              {item.name} <span className="text-[10px] font-medium text-[var(--color-gold,#B8935F)]">({item.selectedWeight})</span> x {item.quantity}
                            </span>
                            <span className="font-bold shrink-0">
                              Rs. {(parsePrice(item.unitPrice ?? item.price) * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {savedTotals && (
                        <div className="border-t border-[var(--color-gold,#B8935F)]/15 pt-2 flex justify-between items-center text-xs">
                          <span className="font-bold text-[var(--color-ink,#1F120F)]">Total Payable</span>
                          <span className="font-serif font-black text-sm text-[var(--color-emerald,#042821)]">
                            Rs. {savedTotals.finalPayable.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bank Transfer Details (if bank payment was chosen) */}
                  {selectedPayment === 'bank' && (
                    <div className="bg-[#FAF9F5] border border-[#C7982F]/40 rounded-2xl p-4 text-left text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[var(--color-gold,#B8935F)] font-bold text-xs uppercase tracking-wider">
                        <Building2 size={14} />
                        <span>Meezan Bank / Raast Transfer Details</span>
                      </div>
                      <div className="text-[11px] text-[var(--color-ink,#1F120F)]/80 space-y-0.5 pt-1">
                        <p><strong>Bank:</strong> Meezan Bank Ltd (Islamic Banking)</p>
                        <p><strong>Account Title:</strong> AllBarka Gourmet Boutique</p>
                        <p><strong>Account Number:</strong> 0214-0106789123</p>
                        <p><strong>Raast ID:</strong> 03160666083</p>
                      </div>
                      <p className="text-[10px] text-[var(--color-ink,#1F120F)]/60 pt-1">
                        Please share the payment screenshot with our concierge via WhatsApp below for instant order release.
                      </p>
                    </div>
                  )}

                  {!currentUser && (
                    <div className="bg-white border border-[var(--color-gold,#B8935F)]/50 rounded-xl p-4 shadow-sm text-left my-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-ink,#1F120F)] flex items-center justify-center shrink-0 text-[var(--color-gold,#B8935F)]">
                          <Crown size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-serif font-black text-[var(--color-ink,#1F120F)] leading-tight">
                            Create your AllBarka account
                          </h4>
                          <p className="text-[10.5px] text-[var(--color-ink,#1F120F)]/70 mt-1 leading-snug">
                            Track your orders, view your purchase history and access future Patron benefits.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => { onClose(); if(onOpenAuth) onOpenAuth(); }}
                          className="flex-1 py-2.5 min-h-[44px] rounded-lg bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] font-black text-[10px] uppercase tracking-widest text-center cursor-pointer"
                        >
                          Create Account
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 py-2.5 min-h-[44px] rounded-lg bg-white border border-[var(--color-gold,#B8935F)]/30 text-[var(--color-ink,#1F120F)] font-bold text-[10px] uppercase tracking-widest text-center cursor-pointer"
                        >
                          Maybe Later
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
                      <span>Forward to WhatsApp Concierge</span>
                    </a>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3.5 min-h-[48px] rounded-full bg-white text-[var(--color-ink,#1F120F)] border border-[var(--color-gold,#B8935F)]/30 font-bold uppercase tracking-widest hover:bg-[var(--color-gold,#B8935F)]/10 transition-colors cursor-pointer"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </form>

        {/* 4. Bottom Security Reassurance (Hide on Success) */}
        {currentStep !== 'success' && (
          <div className="px-6 py-2.5 border-t border-[var(--color-gold,#B8935F)]/20 bg-white/70 flex items-center justify-between text-[9.5px] text-[var(--color-ink,#1F120F)]/65 shrink-0">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-[var(--color-gold,#B8935F)]" />
              Review your details before ordering
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-[var(--color-gold,#B8935F)]" />
              100% Crop Purity Guarantee
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
