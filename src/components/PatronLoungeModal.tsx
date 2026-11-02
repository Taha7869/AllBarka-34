import { usePrefersReducedMotion as useReducedMotion } from '../hooks/usePrefersReducedMotion';
import {staffRequest} from '../lib/adminClient';
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Package, MapPin, Phone, Crown, LogOut, Clock, Calendar, CheckCircle2, RotateCcw, ShoppingBag, AlertCircle, ShieldCheck, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { reviewReorderItems, revalidateReorderWithServerQuote, trackingProgress, TRACKING_STEPS, type ReorderAnalysis } from '../lib/orderPresentation';
import { Link } from 'react-router-dom';
import { acquireScrollLock } from '../utils/scrollLock';
import { apiUrl } from '../lib/apiUrl';
import { withApiDeadline } from '../lib/apiDeadline';
import { fetchLoyaltyProfile, redeemLoyaltyReward } from '../lib/loyaltyClient';

interface PatronLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PatronLoungeModal({ isOpen, onClose }: PatronLoungeModalProps) {
  const { currentUser, patronProfile, logout } = useAuth();
  const { t } = useLanguage();
  const { addToCart, openCart } = useCart();
  const PRODUCTS = useCatalogProducts();
  const [reviewingOrder, setReviewingOrder] = useState<any | null>(null);
  const [reorderAnalysis, setReorderAnalysis] = useState<ReorderAnalysis | null>(null);
  const [reorderValidating, setReorderValidating] = useState(false);
  const [reorderError, setReorderError] = useState('');
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const [ordersError, setOrdersError] = useState(false);
  const [ordersRevision, setOrdersRevision] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [loyaltyMessage, setLoyaltyMessage] = useState('');
  const [loyaltyRevision, setLoyaltyRevision] = useState(0);
  const redemptionRequests = useRef<Record<string, string>>({});
  const loyaltyIdentity = useRef(currentUser?.uid);
  loyaltyIdentity.current = currentUser?.uid;
  const [showAdminWorkspace, setShowAdminWorkspace] = useState(false);
  const [staffAccessUid,setStaffAccessUid]=useState<string|null>(null);
  useEffect(()=>{const controller=new AbortController();setStaffAccessUid(null);if(isOpen&&currentUser)staffRequest(()=>currentUser.getIdToken(),'/api/staff/access',{signal:controller.signal}).then(()=>{if(!controller.signal.aborted)setStaffAccessUid(currentUser.uid);}).catch(()=>{});return()=>controller.abort();},[currentUser,isOpen]);

  useEffect(() => {
    let active = true;
    setShowAdminWorkspace(false);
    if (isOpen && currentUser) {
      currentUser.getIdTokenResult().then(result => {
        if (active) setShowAdminWorkspace(result.claims.admin === true || result.claims.role === 'admin');
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [currentUser, isOpen]);


  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoyaltyData(null);
    setLoyaltyMessage('');
    if (isOpen && currentUser) {
      const fetchLoyalty = async () => {
        try {
          const { REWARDS } = await import('../data/rewards');
          if (active) setRewards(REWARDS);

          const profile = await fetchLoyaltyProfile(currentUser, controller.signal);
          if (active) setLoyaltyData(profile);
        } catch (e) {
          if (active) setLoyaltyMessage(t('rewards.loadError'));
        }
      };
      fetchLoyalty();
    }
    return () => { active = false; controller.abort(); };
  }, [isOpen, currentUser, loyaltyRevision, t]);

  const handleRedeem = async (rewardId: string) => {
    if (!currentUser || redeeming) return;
    setRedeeming(rewardId);
    setLoyaltyMessage('');
    const uid = currentUser.uid;
    try {
      const key = `${uid}:${rewardId}`;
      // Retain the same key after a timeout: retrying cannot deduct points twice.
      const requestId = redemptionRequests.current[key] ||= crypto.randomUUID();
      await redeemLoyaltyReward(currentUser, rewardId, requestId);
      if (loyaltyIdentity.current !== uid) return;
      delete redemptionRequests.current[key];
      setLoyaltyRevision(value => value + 1);
    } catch(e: any) {
       if (loyaltyIdentity.current === uid) setLoyaltyMessage(t('rewards.error'));
    } finally {
       setRedeeming(null);
    }
  };



  useEffect(() => {
    setOrders([]);
    setOrdersError(false);
    if (!isOpen || !currentUser) return;
    const controller = new AbortController();
    let active = true;
    setLoadingOrders(true);
    (async () => {
      try {
        const data = await withApiDeadline(async signal => {
          const idToken = await currentUser.getIdToken();
          if (signal.aborted || !idToken) throw new Error('Account verification unavailable');
          const response = await fetch(apiUrl('/api/me/orders'), {
            headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' }, signal,
            credentials: 'omit', cache: 'no-store',
          });
          if (!response.ok) throw new Error('Orders unavailable');
          const body = await response.json();
          if (body?.success !== true || !Array.isArray(body.orders)) throw new Error('Invalid order response');
          return body;
        }, 12000, controller.signal);
        if (active) setOrders(data.orders);
      } catch {
        if (active) setOrdersError(true);
      } finally {
        if (active) setLoadingOrders(false);
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [isOpen, currentUser, ordersRevision]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const releaseLock = acquireScrollLock();
    dialogRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,[tabindex="0"]') || []).filter(item => item.getClientRects().length);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { releaseLock(); document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [isOpen]);

  const startReorderReview = (order: any) => {
    const analysis = reviewReorderItems(order.items || [], PRODUCTS);
    setReviewingOrder(order);
    setReorderAnalysis(analysis);
  };

  const confirmReorder = () => {
    if (!reorderAnalysis || reorderAnalysis.reorderable.length === 0) return;
    reorderAnalysis.reorderable.forEach(({ product, weight, quantity }) => {
      addToCart(product, weight, quantity, undefined, { silent: true, openCart: false });
    });
    setReviewingOrder(null);
    setReorderAnalysis(null);
    onClose();
    openCart();
  };

  if (!isOpen) return null;

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ORDER_RECEIVED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONFIRMED': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'PREPARING': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'OUT_FOR_DELIVERY':
      case 'DISPATCHED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELLED': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFormattedDate = (order: any) => {
    const raw = order.createdAt || order.createdAtMs || order.timestamp;
    if (!raw) return 'Recently';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const pendingPoints = orders.reduce((sum, o) => {
    if (o.status !== 'DELIVERED' && o.status !== 'CANCELLED') {
      return sum + (o.earnedPoints || 0);
    }
    return sum;
  }, 0);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 select-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      <motion.div
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="patron-title" tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-4xl bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 rounded-[24px] shadow-[0_24px_60px_rgba(31,18,15,0.22),0_0_32px_rgba(184,147,95,0.15)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--color-gold,#B8935F)]/20 bg-white/80 dark:bg-[#1A201E]/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-ink,#1F120F)] border border-[var(--color-gold,#B8935F)]/50 flex items-center justify-center text-[var(--color-gold,#B8935F)] shadow-xs">
              <Crown size={18} className="text-[var(--color-gold,#B8935F)]" />
            </div>
            <div>
              <h3 id="patron-title" className="font-serif font-bold text-lg text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7] leading-tight">
                Patron Lounge
              </h3>
              <p className="text-[9.5px] font-bold tracking-widest uppercase text-[var(--color-gold,#B8935F)] mt-0.5">
                VIP Access Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('close')} className="w-11 h-11 rounded-full bg-[var(--color-ink,#1F120F)]/5 hover:bg-[var(--color-ink,#1F120F)]/10 text-[var(--color-ink,#1F120F)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#FDFBF7] dark:bg-[#0D1110] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Sidebar: Profile */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-[#1A201E] border border-[var(--color-gold,#B8935F)]/30 rounded-2xl p-5 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[var(--color-ink,#1F120F)] border-2 border-[var(--color-gold,#B8935F)] flex items-center justify-center text-[var(--color-gold,#B8935F)] mb-4 shadow-md">
                  <User size={28} />
                </div>
                <h4 className="text-xl font-serif font-black text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">
                  {patronProfile?.name || 'Patron Member'}
                </h4>
                <p className="text-xs font-bold text-[var(--color-gold,#B8935F)] uppercase tracking-wider mb-4">
                  {patronProfile?.patronStatus || 'VIP Patron'}
                </p>

                <div className="space-y-3 pt-4 border-t border-[var(--color-gold,#B8935F)]/20">
                  <div className="flex items-center gap-3 text-sm text-[var(--color-ink,#1F120F)]/80">
                    <User size={16} className="text-[var(--color-gold,#B8935F)]" />
                    <span className="font-medium" dir="ltr">{currentUser?.email}</span>
                  </div>
                  {patronProfile?.phone && (
                    <div className="flex items-center gap-3 text-sm text-[var(--color-ink,#1F120F)]/80">
                      <Phone size={16} className="text-[var(--color-gold,#B8935F)]" />
                      <span className="font-medium" dir="ltr">{patronProfile.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--color-gold,#B8935F)]/20">
                  <button type="button" className="focus-ring mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border-accent)] px-3 text-xs font-semibold" onClick={() => { onClose(); requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('open-store-updates'))); }}><Bell size={16}/><span dir="auto">{t('updates.open')}</span></button>
                  {showAdminWorkspace && <Link to="/admin/orders" onClick={onClose} dir="ltr" className="focus-ring mb-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border-accent)] bg-[var(--color-primary)] px-3 text-xs font-semibold text-[var(--color-primary-fg)]"><ShieldCheck size={16} /><span dir="auto">{t('admin.workspace')}</span></Link>}
                  {staffAccessUid===currentUser?.uid&&<Link to="/staff/orders" onClick={onClose} className="focus-ring mb-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border-accent)] px-3 text-xs font-semibold"><ShieldCheck size={16}/>{t('staff.workspace')}</Link>}
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 rounded-xl border border-[var(--color-ink,#1F120F)]/20 text-[var(--color-ink,#1F120F)] hover:bg-[var(--color-ink,#1F120F)]/5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={14} />
                    Secure Sign Out
                  </button>
                </div>
              </div>
            </div>


              {/* Patron Rewards Section */}
              <div className="bg-white dark:bg-[#1A201E] border border-[var(--color-gold,#B8935F)]/30 rounded-2xl p-5 shadow-sm mt-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7] flex items-center gap-2 mb-4">
                  <Crown size={16} className="text-[var(--color-gold,#B8935F)]" />
                  {t('rewards.title')}
                </h4>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-[var(--color-cream,#FAF9F5)] dark:bg-[#222A28] rounded-xl border border-[var(--color-gold,#B8935F)]/25">
                    <p className="text-[10px] text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60 font-bold uppercase tracking-wider mb-0.5">{t('rewards.available')}</p>
                    <p className="text-2xl font-serif font-black text-[var(--color-gold,#B8935F)]">{loyaltyData?.loyaltyPoints || 0}</p>
                  </div>
                  <div className="p-3 bg-[var(--color-cream,#FAF9F5)] dark:bg-[#222A28] rounded-xl border border-[var(--color-gold,#B8935F)]/25">
                    <p className="text-[10px] text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60 font-bold uppercase tracking-wider mb-0.5">{t('rewards.pending')}</p>
                    <p className="text-2xl font-serif font-black text-amber-700 dark:text-amber-500">+{pendingPoints}</p>
                  </div>
                </div>

                {loyaltyData?.activeRewards && loyaltyData.activeRewards.length > 0 && (
                  <div className="mb-6 p-3 bg-[var(--color-gold,#B8935F)]/10 border border-[var(--color-gold,#B8935F)]/20 rounded-xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7] mb-1">{t('rewards.active')}</p>
                    <p className="text-sm font-bold text-[var(--color-ink,#1F120F)]">
                      {t(`rewards.${loyaltyData.activeRewards[0].rewardId}.name`, rewards.find((r: any) => r.rewardId === loyaltyData.activeRewards[0].rewardId)?.name || t('rewards.active'))}
                    </p>
                    <p className="text-[10px] text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/80 mt-1">{t('rewards.ready')}</p>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  {loyaltyMessage && <p role="alert" className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{loyaltyMessage}</p>}
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70">{t('rewards.options')}</p>
                  {rewards.filter((r: any) => r.active).map((reward: any) => {
                    const canAfford = (loyaltyData?.loyaltyPoints || 0) >= reward.pointsCost;
                    const hasActive = loyaltyData?.activeRewards && loyaltyData.activeRewards.length > 0;
                    return (
                      <div key={reward.rewardId} className="border border-[var(--color-ink,#1F120F)]/10 dark:border-[#FDFBF7]/10 rounded-xl p-3">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">{t(`rewards.${reward.rewardId}.name`, reward.name)}</p>
                          <span className="text-[10px] font-black text-[var(--color-gold,#B8935F)] bg-[var(--color-gold,#B8935F)]/10 px-1.5 py-0.5 rounded">{reward.pointsCost} {t('rewards.points')}</span>
                        </div>
                        <p className="text-[10px] text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60 leading-snug mb-2">{t(`rewards.${reward.rewardId}.description`, reward.description)}</p>
                        <button
                          onClick={() => handleRedeem(reward.rewardId)}
                          disabled={!canAfford || hasActive || !!redeeming || !loyaltyData}
                          className="focus-ring min-h-11 w-full py-1.5 rounded-lg border border-[var(--color-gold,#B8935F)]/30 text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-gold,#B8935F)] hover:text-white text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]"
                        >
                          {t(redeeming === reward.rewardId ? 'rewards.redeeming' : hasActive ? 'rewards.waiting' : canAfford ? 'rewards.redeem' : 'rewards.insufficient')}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {loyaltyData?.transactions && loyaltyData.transactions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70 mb-2">{t('rewards.activity')}</p>
                    <div className="space-y-2">
                      {loyaltyData.transactions.slice(0, 3).map((tx: any) => (
                        <div key={tx.transactionId} className="flex justify-between items-center text-[10px]">
                          <span className="text-[var(--color-ink,#1F120F)]/70 truncate mr-2">{tx.description}</span>
                          <span className={`font-bold ${tx.points > 0 ? 'text-green-600' : 'text-[var(--color-ink,#1F120F)]'}`}>
                            {tx.points > 0 ? '+' : ''}{tx.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
{/* Main Content: Orders */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7] flex items-center gap-2 mb-2">
                <Package size={16} className="text-[var(--color-gold,#B8935F)]" />
                {t('account.orders')}
              </h4>

              <button type="button" disabled={loadingOrders} onClick={() => setOrdersRevision(value => value + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 text-xs disabled:opacity-50"><RotateCcw size={14} />{t('account.refresh')}</button>
              {ordersError ? <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm"><AlertCircle size={22} className="mb-3" /><p>{t('account.error')}</p><button type="button" onClick={() => setOrdersRevision(value => value + 1)} className="mt-3 min-h-11 underline">{t('account.retry')}</button></div> : loadingOrders ? (
                <div className="py-12 flex items-center justify-center text-[var(--color-gold,#B8935F)]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-gold,#B8935F)]"></div>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white dark:bg-[#1A201E] border border-[var(--color-gold,#B8935F)]/20 rounded-2xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-gold,#B8935F)]/10 mx-auto flex items-center justify-center mb-4">
                    <Package size={24} className="text-[var(--color-gold,#B8935F)]" />
                  </div>
                  <h5 className="font-serif font-black text-lg text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7] mb-2">
                    No orders yet
                  </h5>
                  <p className="text-sm text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60 max-w-xs mx-auto">
                    {t('account.browse')}
                  </p>
                  <Link to="/shop" onClick={onClose} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#1e3a2b] px-5 text-xs text-white">{t('account.browse')}</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const progress = trackingProgress(order.status || '');
                    const reorderItems = reviewReorderItems(order.items || [], PRODUCTS).reorderable;
                    const totalAmt = order.totals?.total ?? order.total ?? 0;
                    const subtotalAmt = order.totals?.subtotal ?? order.subtotal ?? 0;
                    const discountAmt = order.totals?.discount ?? order.discount ?? 0;
                    const shippingAmt = order.totals?.shipping ?? order.shipping ?? 0;
                    const giftWrapAmt = order.gifting?.giftWrapFee ?? order.giftWrap ?? 0;
                    const addressStr = order.customer?.address
                      ? `${order.customer.address}, ${order.customer.city || 'Lahore'}`
                      : (order.address || 'Lahore, Pakistan');
                    const paymentMethodStr = order.paymentMethod === 'bank' ? 'Direct Bank Transfer' : 'Cash on Delivery (COD)';

                    return (
                      <div key={order.orderId} className="bg-white dark:bg-[#1A201E] border border-[var(--color-gold,#B8935F)]/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="px-5 py-4 border-b border-[var(--color-gold,#B8935F)]/20 bg-[#FDFBF7]/50 dark:bg-transparent flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-[var(--color-ink,#1F120F)]/60 mb-0.5">Order ID</p>
                            <p className="font-mono text-sm font-bold text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]" dir="ltr">{order.orderId}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-[var(--color-ink,#1F120F)]/60 mb-0.5">Placed On</p>
                            <p className="text-sm font-medium text-[var(--color-ink,#1F120F)] flex items-center gap-1.5">
                              <Calendar size={13} className="text-[var(--color-gold,#B8935F)]" />
                              {getFormattedDate(order)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-[var(--color-ink,#1F120F)]/60 mb-0.5">Total</p>
                            <p className="font-serif font-black text-[var(--color-ink,#1F120F)]">Rs. {totalAmt.toLocaleString('en-PK')}</p>
                          </div>
                          <div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div className="p-5">
                          {progress >= 0 && <ol className="mb-6 grid grid-cols-3 sm:grid-cols-6 gap-2" aria-label={t('account.orders')}>{TRACKING_STEPS.map((stage, index) => <li key={stage} aria-current={index === progress ? 'step' : undefined} className="min-w-0"><div className={`mb-2 h-1 rounded-full ${index <= progress ? 'bg-[#c7982f]' : 'bg-[var(--color-border)]'}`} /><span className={`block text-[10px] [overflow-wrap:anywhere] ${index <= progress ? 'font-bold text-[var(--color-accent-text)]' : 'text-[var(--color-text-secondary)]'}`}>{t(`tracking.${stage}`)}</span></li>)}</ol>}
                          <div className="mb-5 rounded-xl border border-[var(--color-border)] p-3">
                            <button
                              type="button"
                              data-action="start-reorder"
                              disabled={!reorderItems.length}
                              onClick={() => startReorderReview(order)}
                              className="flex min-h-11 items-center gap-2 text-xs font-semibold disabled:opacity-40"
                            >
                              <ShoppingBag size={15} />
                              {t('account.reorder')}
                            </button>
                            <p className="text-[10px] leading-5 text-[var(--color-text-secondary)]">
                              {t('account.currentPrice')}{reorderItems.length !== (order.items || []).length && ` ${t('account.reorderMissing')}`}
                            </p>

                            {reviewingOrder?.orderId === order.orderId && reorderAnalysis && (
                              <div className="reorder-review-panel mt-3 p-4 rounded-xl bg-amber-50/60 dark:bg-zinc-800/80 border border-[var(--color-gold,#B8935F)]/30 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary,#042821)] dark:text-emerald-400">
                                      {t('account.reorderReviewTitle', 'Review Items Before Reorder')}
                                    </h4>
                                    {reorderValidating && (
                                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold animate-pulse" data-reorder-validating>
                                        · Verifying live rates...
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => { setReviewingOrder(null); setReorderAnalysis(null); }}
                                    className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                                  >
                                    {t('cancel', 'Cancel')}
                                  </button>
                                </div>

                                {reorderAnalysis.reorderable.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                                      {t('account.reorderableItems', 'Available selections at current catalog rates:')}
                                    </p>
                                    {reorderAnalysis.reorderable.map((item, rIdx) => (
                                      <div key={rIdx} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 text-xs">
                                        <div>
                                          <span className="font-bold text-neutral-900 dark:text-neutral-100">{item.product.name_en}</span>
                                          <span className="text-neutral-500 ml-1.5">({item.weight} × {item.quantity})</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-bold text-emerald-800 dark:text-emerald-400 block">
                                            Rs. {(item.currentUnitPrice * item.quantity).toLocaleString()}
                                          </span>
                                          {item.priceChanged && (
                                            <span className="text-[10px] text-amber-700 dark:text-amber-400 block" data-price-change>
                                              Price updated: was Rs. {item.originalUnitPrice?.toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-zinc-700 text-xs font-bold">
                                      <span>{t('estimatedSubtotal', 'Estimated Subtotal')}:</span>
                                      <span>Rs. {reorderAnalysis.estimatedSubtotal.toLocaleString()}</span>
                                    </div>
                                  </div>
                                )}

                                {reorderError && (
                                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200" data-reorder-error>
                                    <p className="font-semibold">{reorderError}</p>
                                  </div>
                                )}

                                {reorderAnalysis.quoteRequiredNotice && (
                                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200" data-quote-notice>
                                    <p className="font-semibold">{reorderAnalysis.quoteRequiredNotice}</p>
                                  </div>
                                )}

                                {reorderAnalysis.requiresRenewedReview && (
                                  <div className="p-2 rounded bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-[11px] text-amber-900 dark:text-amber-200" data-renewed-review-notice>
                                    <p className="font-semibold">Boutique rates or product availability have changed. Please review the updated selection below before confirming.</p>
                                  </div>
                                )}

                                {reorderAnalysis.hasUnavailableItems && (
                                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs space-y-1" data-unavailable-warning>
                                    <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-semibold">
                                      <AlertCircle size={14} />
                                      <span>{t('account.reorderUnavailable', 'Some items cannot be reordered:')}</span>
                                    </div>
                                    <ul className="list-disc list-inside text-[11px] text-rose-700 dark:text-rose-400 space-y-0.5">
                                      {reorderAnalysis.unavailable.map((u, uIdx) => (
                                        <li key={uIdx}>
                                          {u.productId} ({u.weight || 'standard'}) — {u.reason === 'discontinued' ? 'Discontinued' : u.reason === 'inactive' ? 'Temporarily unavailable' : u.reason === 'quote_only' ? 'Custom quote required' : 'Size unavailable'}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    data-action="confirm-reorder"
                                    disabled={reorderValidating || reorderAnalysis.reorderable.length === 0}
                                    onClick={confirmReorder}
                                    className="px-4 py-2 rounded-xl bg-[#043327] hover:bg-[#074b39] text-[#FAF9F5] text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
                                  >
                                    <ShoppingBag size={14} />
                                    <span>{t('account.confirmReorder', 'Add Available Items to Bag')}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mb-3 flex items-center justify-between text-xs text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70">
                            <span className="font-medium">Payment Method: <strong className="text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">{paymentMethodStr}</strong></span>
                            {order.earnedPoints > 0 && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                                {order.status === 'DELIVERED' ? `+${order.earnedPoints} Points Earned` : `+${order.earnedPoints} Points Pending Delivery`}
                              </span>
                            )}
                          </div>

                          <div className="space-y-3">
                            {(order.items || []).map((item: any, idx: number) => (
                              <div key={idx} className="flex flex-wrap justify-between items-center gap-2 text-sm">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="font-medium text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">{item.name}</span>
                                  <span className="text-xs text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/70 border border-[var(--color-ink,#1F120F)]/10 dark:border-[#FDFBF7]/10 rounded px-1.5 bg-gray-50 dark:bg-gray-800">{item.selectedWeight}</span>
                                  <span className="text-xs font-bold text-[var(--color-gold,#B8935F)]">x{item.quantity}</span>
                                </div>
                                <span className="font-medium text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">Rs. {((item.price || 0) * (item.quantity || 1)).toLocaleString('en-PK')}</span>
                              </div>
                            ))}
                          </div>

                          {(discountAmt > 0 || shippingAmt > 0 || giftWrapAmt > 0) && (
                            <div className="mt-4 pt-4 border-t border-dashed border-[var(--color-gold,#B8935F)]/30 space-y-1.5 text-xs">
                              {discountAmt > 0 && (
                                <div className="flex justify-between text-[var(--color-gold,#B8935F)] font-medium">
                                  <span>Discount</span>
                                  <span>- Rs. {discountAmt.toLocaleString('en-PK')}</span>
                                </div>
                              )}
                              {shippingAmt > 0 && (
                                <div className="flex justify-between text-[var(--color-ink,#1F120F)]/70">
                                  <span>Shipping</span>
                                  <span>Rs. {shippingAmt.toLocaleString('en-PK')}</span>
                                </div>
                              )}
                              {giftWrapAmt > 0 && (
                                <div className="flex justify-between text-[var(--color-gold,#B8935F)] font-medium">
                                  <span>Gift Wrap</span>
                                  <span>Rs. {giftWrapAmt.toLocaleString('en-PK')}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-4 pt-3 border-t border-[var(--color-gold,#B8935F)]/20 flex items-start gap-2 text-xs text-[var(--color-ink,#1F120F)]/70">
                            <MapPin size={14} className="text-[var(--color-gold,#B8935F)] shrink-0 mt-0.5" />
                            <span className="leading-snug">{addressStr}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
