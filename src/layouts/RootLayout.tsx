import { useCatalogProducts } from '../contexts/CatalogContext';
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigationType, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useConsent } from '../contexts/ConsentContext';
import { CartItem, Product } from '../types';

import ScrollProgressBar from '../components/ScrollProgressBar';
import GradualBlur from '../components/GradualBlur';
import BubbleMenu, { getPrimaryActiveSectionId } from '../components/BubbleMenu';
import Footer from '../components/Footer';
import BackToTop from '../components/BackToTop';
import ToastManager from '../components/ToastManager';
import StickyCartBottomBar from '../components/StickyCartBottomBar';
import { usePdpBuyBarVisible } from '../lib/pdpBuyBarSignal';
import PullToRefresh from '../components/PullToRefresh';
import CookieNotice from '../components/CookieNotice';
import PwaInstallBanner from '../components/PwaInstallBanner';
import OfflineStatusBar from '../components/OfflineStatusBar';
import StandaloneTabBar, { useStandaloneMode } from '../components/StandaloneTabBar';
import CurrencySelector from '../components/CurrencySelector';
import ThemeToggle from '../components/ThemeToggle';
import type { InfoPageTab } from '../components/InfoPagesModal';
import type { PolicyTab } from '../components/PolicyPagesModal';
import type { CustomHamperCartInput } from '../components/CustomHamperBuilderModal';
import type { OccasionInquiryPrefill } from '../components/OccasionInquiryModal';
import type { EventType } from '../lib/occasionPlanning';
import { CUSTOM_QUOTE_MODAL_EVENT } from '../lib/customQuoteEvent';
import { OPEN_AI_BUDDY_EVENT } from '../lib/heroScene';
import {
  OPEN_CONCIERGE_EVENT,
  hasActiveConciergeListener,
  normalizeOpenConciergeDetail,
  type OpenConciergeDetail,
  type PendingConciergeRequest,
} from '../lib/conciergeEvent';
import { CART_POP_EVENT } from '../lib/flyToCart';
import { MOTION_EASE_CSS } from '../lib/motion';

const MobileMenu = React.lazy(() => import('../components/MobileMenu'));
const CartDrawer = React.lazy(() => import('../components/CartDrawer'));
const HeaderSearchPanel = React.lazy(() => import('../components/HeaderSearchPanel'));
const CustomQuoteModal = React.lazy(() => import('../components/CustomQuoteModal'));
const AIConcierge = React.lazy(() => import('../components/AIConcierge'));
const QuickViewModal = React.lazy(() => import('../components/QuickViewModal'));
const AuthModal = React.lazy(() => import('../components/AuthModal'));
const CheckoutAuthChoiceModal = React.lazy(() => import('../components/CheckoutAuthChoiceModal'));
const PatronLoungeModal = React.lazy(() => import('../components/PatronLoungeModal'));
const InfoPagesModal = React.lazy(() => import('../components/InfoPagesModal'));
const PolicyPagesModal = React.lazy(() => import('../components/PolicyPagesModal'));
const CustomHamperBuilderModal = React.lazy(() => import('../components/CustomHamperBuilderModal'));
const StoreUpdatesDialog = React.lazy(() => import('../components/StoreUpdatesDialog'));
const MehmaanTablePlannerModal = React.lazy(() => import('../components/MehmaanTablePlannerModal'));
const OccasionInquiryModal = React.lazy(() => import('../components/OccasionInquiryModal'));
const ShopTheTableModal = React.lazy(() => import('../components/ShopTheTableModal'));

import LahoreExpressTimer from '../components/LahoreExpressTimer';
import { Menu, X, ShoppingBag, User, Gift, Languages, ChevronDown, Search, Sparkles } from 'lucide-react';
import { AllBarkaHeaderLogo } from '../components/AllBarkaLogo';
import MobileHeaderBrand from '../components/MobileHeaderBrand';
import Breadcrumbs from '../components/Breadcrumbs';
import { PRODUCTS, getProductImage } from '../data/products';
import { acquireScrollLock } from '../utils/scrollLock';
import ErrorBoundary from '../components/ErrorBoundary';
import { RouteLoadingSkeleton } from '../components/StorefrontSkeletons';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useFloatingLauncherPlacement } from '../hooks/useFloatingLauncherPlacement';


export default function RootLayout() {
  const PRODUCTS = useCatalogProducts();
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const location = useLocation();
  const navigationType = useNavigationType();
  const previousScrollRoute = useRef<string | null>(null);
  const hasMountedRef = useRef(false);
  useEffect(() => { hasMountedRef.current = true; }, []);
  const isAdminRoute = location.pathname.startsWith('/admin/');
  const { currentUser, patronProfile, logout, ensureAuthReady } = useAuth();
  const { language, setLanguage, isRtl, t } = useLanguage();

  // Lazily boot Firebase Auth when navigating to auth-backed routes or opening account overlays.
  useEffect(() => {
    if (
      location.pathname.startsWith('/admin') ||
      location.pathname.startsWith('/staff') ||
      location.pathname.startsWith('/checkout') ||
      location.pathname.startsWith('/track')
    ) {
      ensureAuthReady?.();
    }
  }, [location.pathname, ensureAuthReady]);
  const { needsPrompt: consentNeedsPrompt, isPreferencesOpen: consentPreferencesOpen } = useConsent();
  const isStandalone = useStandaloneMode();
  
  const mobileMenuTriggerRef = React.useRef<HTMLButtonElement>(null);
  const headerSearchBtnRef = React.useRef<HTMLButtonElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dispatchHiddenOnScroll, setDispatchHiddenOnScroll] = useState(false);
  const lastScrollYRef = useRef(0);
  const [isCartPulsing, setIsCartPulsing] = useState(false);
  const [cartPopTick, setCartPopTick] = useState(0);

  useEffect(() => {
    let pulseTimer: ReturnType<typeof setTimeout> | undefined;
    const onCartPop = () => {
      setCartPopTick((n) => n + 1);
      setIsCartPulsing(true);
      if (pulseTimer) clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => setIsCartPulsing(false), 380);
    };
    window.addEventListener(CART_POP_EVENT, onCartPop);
    return () => {
      window.removeEventListener(CART_POP_EVENT, onCartPop);
      if (pulseTimer) clearTimeout(pulseTimer);
    };
  }, []);

  const { cartItems, isCartOpen, setIsCartOpen, totalItemsCount, addToCart } = useCart();

  // Derive active navigation state from actual route & search query
  const activeNavItem = React.useMemo(() => {
    return getPrimaryActiveSectionId(location.pathname, location.search) || undefined;
  }, [location.pathname, location.search]);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [authChoiceModalOpen, setAuthChoiceModalOpen] = useState(false);
  const [patronLoungeOpen, setPatronLoungeOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [selectedQuickViewProduct, setSelectedQuickViewProduct] = useState<Product | null>(null);
  const [mehmaanModalOpen, setMehmaanModalOpen] = useState(false);
  const [occasionModalOpen, setOccasionModalOpen] = useState(false);
  const [defaultOccasion, setDefaultOccasion] = useState<EventType>('wedding');
  const [occasionPrefill, setOccasionPrefill] = useState<OccasionInquiryPrefill | undefined>(undefined);
  const [shopTheTableOpen, setShopTheTableOpen] = useState(false);

  // Global listeners for modals
  useEffect(() => {
    const handleOpenAuth = (e?: Event) => {
      const customEvent = e as CustomEvent<{ mode?: 'signin' | 'signup' | 'forgot_password' }>;
      if (customEvent?.detail?.mode) {
        setAuthInitialMode(customEvent.detail.mode);
      } else {
        setAuthInitialMode('signin');
      }
      setAuthModalOpen(true);
    };
    const handleOpenLounge = () => setPatronLoungeOpen(true);
    const handleOpenUpdates = () => setUpdatesOpen(true);
    const handleOpenHamper = () => setHamperModalOpen(true);
    const handleOpenMehmaan = () => setMehmaanModalOpen(true);
    const handleOpenTable = () => setShopTheTableOpen(true);
    const handleOpenOccasion = (e?: Event) => {
      const customEvent = e as CustomEvent<{ defaultOccasion?: EventType; prefill?: OccasionInquiryPrefill }>;
      setOccasionPrefill(customEvent?.detail?.prefill);
      if (customEvent?.detail?.defaultOccasion) {
        setDefaultOccasion(customEvent.detail.defaultOccasion);
      }
      setOccasionModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);
    window.addEventListener('open-patron-lounge', handleOpenLounge);
    window.addEventListener('open-store-updates', handleOpenUpdates);
    window.addEventListener('open-hamper-builder', handleOpenHamper);
    window.addEventListener('open-mehmaan-planner', handleOpenMehmaan);
    window.addEventListener('open-occasion-inquiry', handleOpenOccasion);
    window.addEventListener('open-shop-the-table', handleOpenTable);
    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuth);
      window.removeEventListener('open-patron-lounge', handleOpenLounge);
      window.removeEventListener('open-store-updates', handleOpenUpdates);
      window.removeEventListener('open-hamper-builder', handleOpenHamper);
      window.removeEventListener('open-mehmaan-planner', handleOpenMehmaan);
      window.removeEventListener('open-occasion-inquiry', handleOpenOccasion);
      window.removeEventListener('open-shop-the-table', handleOpenTable);
    };
  }, []);
  
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalTab, setInfoModalTab] = useState<InfoPageTab>('our-story');
  
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyModalTab, setPolicyModalTab] = useState<PolicyTab>('shipping');
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [aiConciergeOpen, setAiConciergeOpen] = useState(false);
  const [aiConciergeMounted, setAiConciergeMounted] = useState(false);
  const conciergeRequestSeqRef = useRef(0);
  const [pendingConciergeRequest, setPendingConciergeRequest] = useState<PendingConciergeRequest | null>(null);
  const [customQuoteLoaded, setCustomQuoteLoaded] = useState(false);
  const [hamperModalOpen, setHamperModalOpen] = useState(false);

  // Lazily mount heavy chat & custom quote bundles only when triggered.
  useEffect(() => {
    const onOpenBuddy = () => {
      setAiConciergeMounted(true);
      setAiConciergeOpen(true);
    };
    const onOpenConcierge = (event: Event) => {
      const detail = normalizeOpenConciergeDetail((event as CustomEvent<OpenConciergeDetail>).detail);
      if (!hasActiveConciergeListener()) {
        conciergeRequestSeqRef.current += 1;
        setPendingConciergeRequest({ id: conciergeRequestSeqRef.current, detail });
      }
      setAiConciergeMounted(true);
      setAiConciergeOpen(true);
    };
    const onOpenQuote = () => setCustomQuoteLoaded(true);
    window.addEventListener(OPEN_AI_BUDDY_EVENT, onOpenBuddy);
    window.addEventListener(OPEN_CONCIERGE_EVENT, onOpenConcierge);
    window.addEventListener(CUSTOM_QUOTE_MODAL_EVENT, onOpenQuote);
    return () => {
      window.removeEventListener(OPEN_AI_BUDDY_EVENT, onOpenBuddy);
      window.removeEventListener(OPEN_CONCIERGE_EVENT, onOpenConcierge);
      window.removeEventListener(CUSTOM_QUOTE_MODAL_EVENT, onOpenQuote);
    };
  }, []);

  // Defer each overlay until first use, then retain it so drafts survive closing.
  const [loadedOverlays, setLoadedOverlays] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const open = {
      quick: !!selectedQuickViewProduct, hamper: hamperModalOpen, auth: authModalOpen,
      checkout: authChoiceModalOpen, patron: patronLoungeOpen, info: infoModalOpen,
      policy: policyModalOpen, updates: updatesOpen,
      search: headerSearchOpen, cart: isCartOpen, mobileMenu: mobileMenuOpen,
    };
    if (authModalOpen || patronLoungeOpen || updatesOpen || authChoiceModalOpen) {
      ensureAuthReady?.();
    }
    setLoadedOverlays(previous => {
      const newlyOpened = Object.keys(open).filter(key => open[key as keyof typeof open] && !previous[key]);
      return newlyOpened.length ? { ...previous, ...Object.fromEntries(newlyOpened.map(key => [key, true])) } : previous;
    });
  }, [selectedQuickViewProduct, hamperModalOpen, authModalOpen, authChoiceModalOpen, patronLoungeOpen, infoModalOpen, policyModalOpen, updatesOpen, headerSearchOpen, isCartOpen, mobileMenuOpen, ensureAuthReady]);

  const handleAddCustomHamper = (hamperItem: CustomHamperCartInput) => {
    addToCart(hamperItem);
    setIsCartPulsing(true);
    setTimeout(() => setIsCartPulsing(false), 800);
  };

  const handleAddToCart = (productId: string, weight: string, customQty = 1) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    const unitPrice = product.prices[weight];
    if (!unitPrice || unitPrice <= 0) return;

    addToCart({
      id: `${product.id}-${weight}`,
      productId: product.id,
      name_en: product.name_en,
      name_ur: product.name_ur,
      name_ar: product.name_ar,
      slug: product.id,
      image: getProductImage(product),
      selectedWeight: weight,
      unitPrice,
      price: unitPrice,
      quantity: customQty,
      wholesale: false,
    });
    setIsCartPulsing(true);
    setTimeout(() => setIsCartPulsing(false), 800);
  };

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.altKey || event.metaKey) return;
      if ((event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]')) || document.querySelector('[aria-modal="true"]')) return;
      const search = document.querySelector<HTMLInputElement>('#category-plp-container input[type="search"]');
      event.preventDefault();
      if (search) {
        search.focus();
        search.scrollIntoView({ block: 'center', behavior: 'instant' });
      } else {
        setHeaderSearchOpen(true);
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const handleInitiateCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  useEffect(() => {
    if (previousScrollRoute.current === location.pathname) return;
    previousScrollRoute.current = location.pathname;
    if (!(navigationType === 'POP' && /^\/(shop|category)(\/|$)/.test(location.pathname))) window.scrollTo(0, 0);
  }, [location.pathname, navigationType]);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 24);
      if (y <= 12) {
        setDispatchHiddenOnScroll(false);
      } else if (y > lastScrollYRef.current + 6 && y > 32) {
        setDispatchHiddenOnScroll(true);
      } else if (y < lastScrollYRef.current - 12) {
        setDispatchHiddenOnScroll(false);
      }
      lastScrollYRef.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if any modal or drawer is active:
  // The product page's sticky buy bar takes the cart bar's place at the bottom of a phone screen.
  const pdpBuyBarVisible = usePdpBuyBarVisible();
  const isAnyModalOrDrawerOpen = 
    isCartOpen || 
    authModalOpen || 
    authChoiceModalOpen || 
    patronLoungeOpen || 
    updatesOpen ||
    selectedQuickViewProduct !== null || 
    infoModalOpen || 
    policyModalOpen || 
    galleryModalOpen ||
    hamperModalOpen ||
    aiConciergeOpen;
  const consentUiActive =
    consentPreferencesOpen ||
    (consentNeedsPrompt && !isAdminRoute && !isAnyModalOrDrawerOpen && location.pathname !== '/checkout' && !pdpBuyBarVisible && totalItemsCount === 0);
  const standaloneTabBarVisible =
    isStandalone &&
    !isAdminRoute &&
    !location.pathname.startsWith('/staff') &&
    location.pathname !== '/checkout' &&
    !isAnyModalOrDrawerOpen &&
    !pdpBuyBarVisible;
  const hasBottomObstruction =
    pdpBuyBarVisible ||
    standaloneTabBarVisible ||
    (totalItemsCount > 0 && location.pathname !== '/checkout' && location.pathname !== '/cart');
  const hideFloatingConcierge =
    isAdminRoute ||
    consentUiActive ||
    location.pathname === '/checkout' ||
    location.pathname === '/cart' ||
    (isAnyModalOrDrawerOpen && !aiConciergeOpen);
  const launcherPlacement = useFloatingLauncherPlacement({
    enabled: !hideFloatingConcierge && !aiConciergeMounted,
    hasBottomBar: hasBottomObstruction,
    hasCookieBar: consentUiActive,
  });
  useEffect(() => {
    if (!isAnyModalOrDrawerOpen) return;
    const releaseLock = acquireScrollLock();
    return () => {
      releaseLock();
    };
  }, [isAnyModalOrDrawerOpen]);


  // Calm 200ms content-only route fade (header & footer remain static; zero layout shift).
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="boutique-experience min-h-screen w-full max-w-full relative flex flex-col font-sans bg-[var(--color-base)] text-[var(--color-ink)] selection:bg-[var(--color-gold)]/30 selection:text-[var(--color-ink)]">
      <a
        href="#main-content"
        data-skip-link="true"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[25000] focus:rounded-xl focus:bg-[#042821] focus:px-4 focus:py-2.5 focus:text-xs focus:font-semibold focus:text-[#FDFBF7] focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-[#C7982F]"
      >
        {t('nav.skipToContent', 'Skip to main content')}
      </a>
      <ToastManager />
      {!isAdminRoute && <GradualBlur preset="header" strength={1.5} opacity={0.9} />}
      
      {/* Lahore Same-Day Express Timer Bar (32px on mobile; collapses cleanly on scroll down) */}
      {!isAdminRoute && (
        <LahoreExpressTimer
          hiddenOnScroll={dispatchHiddenOnScroll}
          onOpenSchedule={() => { setPolicyModalTab('shipping'); setPolicyModalOpen(true); }}
        />
      )}

      {/* Header Navigation (56px compact on mobile with Search, Cart & Menu; ThemeToggle inside MobileMenu) */}
      <header 
        id="main-navigation-header"
        data-scrolled={isScrolled ? 'true' : 'false'}
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`sticky top-0 left-0 right-0 z-[100] w-full min-h-[56px] h-[56px] md:h-auto transition-all duration-300 motion-reduce:transition-none flex items-center ${
          isScrolled 
            ? 'md:py-2 bg-[#FFFCF7] dark:bg-[#042821] shadow-[0_8px_24px_-12px_rgba(4,40,33,0.18)] border-b border-[#C7982F]/40'
            : 'md:py-3.5 bg-[#FDFBF7] dark:bg-[#0D1412] shadow-none border-b border-[#C7982F]/15'
        }`}
      >
        {!online && <div role="status" className="fixed inset-x-0 top-0 z-[20000] border-b border-[#c7982f] bg-[#092e23] px-4 py-2 text-center text-xs text-[#fff8e9]">{t('checkout.offline')}</div>}
      {!isAdminRoute && <ScrollProgressBar showGlow={false} />}
        <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 flex flex-col justify-center">
          <div className="boutique-header-row flex justify-between items-center gap-2 sm:gap-4 w-full">
            
            {/* Leading Brand Mark: Desktop shows full logo, Mobile shows crest + animated intro */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                className={`hidden lg:block cursor-pointer focus-ring rounded-xl p-1 -m-1 transition-transform duration-300 origin-left rtl:origin-right motion-reduce:transition-none ${
                  isScrolled ? 'scale-[0.94]' : 'scale-100'
                }`}
                aria-label="AllBarka — Home"
              >
                <AllBarkaHeaderLogo />
              </button>

              <div className="block lg:hidden">
                <MobileHeaderBrand onHomeClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              </div>
            </div>
            
            {/* Center Navigation (Desktop Only) */}
            <div className="boutique-header-navigation hidden xl:flex flex-1 justify-center px-2">
              <BubbleMenu 
                activeItem={activeNavItem} 
                onItemClick={(item) => navigate(item.path)} 
              />
            </div>

            {/* Trailing Utility Controls */}
            <div className="boutique-header-tools flex items-center gap-1.5 sm:gap-2.5 justify-end shrink-0">
              {/* Search button (opens Header Search + Voice panel on any route) */}
              <button
                ref={headerSearchBtnRef}
                id="header-search-btn"
                type="button"
                aria-expanded={headerSearchOpen}
                onClick={() => setHeaderSearchOpen((open) => !open)}
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all duration-200 border border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 hover:bg-[#C7982F]/15 text-[#042821] dark:text-[#FFFCF7] focus-ring cursor-pointer"
                aria-label={t('nav.search', 'Search catalogue')}
                title={t('nav.search', 'Search catalogue')}
              >
                <Search size={16} className="text-[#C7982F]" />
              </button>

              {/* Language selector (Desktop only; mobile uses MobileMenu) */}
              <div className="relative hidden md:flex items-center min-h-[42px] rounded-xl border border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 text-[#042821] dark:text-[#FFFCF7] focus-within:ring-2 focus-within:ring-[#C7982F]/35">
                <Languages size={15} className="absolute start-2.5 text-[#C7982F] pointer-events-none" aria-hidden="true" />
                <label htmlFor="desktop-language-select" className="sr-only">{t('nav.language')}</label>
                <select
                  id="desktop-language-select"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as LanguageCode)}
                  className="h-[40px] w-[104px] appearance-none cursor-pointer rounded-xl bg-transparent ps-8 pe-6 text-xs font-semibold focus:outline-none"
                  aria-label={t('nav.language')}
                >
                  <option value="en">English</option>
                  <option value="ur">اردو</option>
                  <option value="ar">العربية</option>
                </select>
                <ChevronDown size={13} className="absolute end-2.5 text-[#C7982F] pointer-events-none" aria-hidden="true" />
              </div>

              {/* Currency selector (Desktop only; mobile uses MobileMenu) */}
              <CurrencySelector variant="desktop" />

              {/* Theme Toggle (Desktop only; mobile theme controls live inside MobileMenu) */}
              <div className="hidden md:flex">
                <ThemeToggle className="min-w-[42px] min-h-[42px] border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 hover:bg-[#C7982F]/15 text-[#042821] dark:text-[#FFFCF7]" />
              </div>

              {/* Patron VIP Lounge / Login (Desktop only) */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button 
                  type="button"
                  onClick={() => currentUser ? setPatronLoungeOpen(true) : setAuthModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 hover:bg-[#C7982F]/15 text-[#042821] dark:text-[#FFFCF7] focus-ring cursor-pointer"
                  aria-label={currentUser ? t('patronLounge') : t('vipLogin')}
                >
                  <div className="bg-[#C7982F]/15 p-1 rounded-lg">
                    <User size={15} className="text-[#C7982F]" />
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap">
                    {currentUser ? (patronProfile?.name?.split(' ')[0] || t('patronLounge')) : t('nav.patron')}
                  </span>
                </button>
                
                {currentUser && (
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 focus-ring cursor-pointer"
                    aria-label={t('nav.logout')}
                  >
                    <span className="text-[11px] font-bold uppercase">{t('nav.logout')}</span>
                  </button>
                )}
              </div>

              {/* Cart Button */}
              <button 
                id="header-cart-btn"
                type="button"
                onClick={() => setIsCartOpen(true)}
                className={`relative min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all duration-200 border border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 hover:bg-[#C7982F]/15 text-[#042821] dark:text-[#FFFCF7] focus-ring cursor-pointer ${
                  isCartPulsing ? 'scale-105 bg-[#C7982F]/25 border-[#C7982F]' : ''
                }`}
                aria-label={`${t('shoppingBag')}: ${totalItemsCount}`}
              >
                <ShoppingBag size={19} strokeWidth={2.2} />
                {totalItemsCount > 0 && (
                  <div
                    key={prefersReducedMotion ? 'static-badge' : `badge-${cartPopTick}`}
                    style={
                      !prefersReducedMotion && cartPopTick > 0
                        ? { animation: `allbarka-badge-pop 280ms ${MOTION_EASE_CSS} both` }
                        : undefined
                    }
                    data-testid="header-cart-badge"
                    className="absolute -top-1 -right-1 min-w-[19px] h-[19px] flex items-center justify-center bg-[#C7982F] text-[#042821] text-[10px] font-bold rounded-full px-1 shadow-xs leading-none pointer-events-none tabular-nums"
                  >
                    {totalItemsCount}
                  </div>
                )}
              </button>
              
              {/* Mobile Menu Trigger */}
              <button 
                ref={mobileMenuTriggerRef}
                id="mobile-menu-trigger-btn"
                type="button"
                onClick={() => setMobileMenuOpen(true)} 
                className="xl:hidden min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#29231D] dark:text-[#FFFCF7] hover:bg-[#C7982F]/15 border border-[#29231D]/10 dark:border-[#C7982F]/25 transition-colors focus-ring cursor-pointer"
                aria-label={t('nav.openMenu')}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation-menu"
              >
                <Menu size={22} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <React.Suspense fallback={null}>
        {(headerSearchOpen || loadedOverlays.search) && (
          <HeaderSearchPanel
            isOpen={headerSearchOpen}
            onClose={() => setHeaderSearchOpen(false)}
            restoreFocusTo={headerSearchBtnRef.current}
          />
        )}

        {(mobileMenuOpen || loadedOverlays.mobileMenu) && (
          <MobileMenu 
            isOpen={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)} 
            cartCount={totalItemsCount}
            onOpenCart={() => setIsCartOpen(true)}
            triggerRef={mobileMenuTriggerRef}
          />
        )}
      </React.Suspense>

      <main id="main-content" tabIndex={-1} className="flex-1 w-full relative z-10 flex flex-col items-center focus:outline-none">
        <OfflineStatusBar />
        {/* Shared Breadcrumb Navigation for all subpages (hidden on homepage) */}
        {!isAdminRoute && <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs />
        </div>}
        
        <ErrorBoundary>
          <React.Suspense fallback={<RouteLoadingSkeleton pathname={location.pathname} />}>
            <div className="w-full flex justify-center">
                {prefersReducedMotion || location.pathname === '/checkout' || location.pathname === '/cart' ? (
                  <div key={location.pathname} className="w-full flex-col flex items-center">
                    <Outlet context={{ cartItems, addToCart, handleAddToCart, setCartOpen: setIsCartOpen, setSelectedQuickViewProduct, setHamperModalOpen }} />
                  </div>
                ) : (
                  <div
                    key={location.pathname}
                    style={
                      hasMountedRef.current
                        ? { animation: `allbarka-route-fade 200ms ${MOTION_EASE_CSS} both` }
                        : undefined
                    }
                    className="w-full flex-col flex items-center origin-top bg-[var(--color-base)]"
                  >
                    <Outlet context={{ cartItems, addToCart, handleAddToCart, setCartOpen: setIsCartOpen, setSelectedQuickViewProduct, setHamperModalOpen }} />
                  </div>
                )}
            </div>
          </React.Suspense>
        </ErrorBoundary>

      </main>

      {!isAdminRoute && <Footer />}
      {standaloneTabBarVisible && <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] w-full shrink-0" />}
      <BackToTop hide={isAdminRoute || isAnyModalOrDrawerOpen} hasCartBar={hasBottomObstruction} />
      
      <StickyCartBottomBar 
        hide={isAdminRoute || isAnyModalOrDrawerOpen || pdpBuyBarVisible || standaloneTabBarVisible}
      />
      <StandaloneTabBar
        visible={standaloneTabBarVisible}
        onOpenAccount={() => {
          if (currentUser) setPatronLoungeOpen(true);
          else {
            setAuthInitialMode('signin');
            setAuthModalOpen(true);
          }
        }}
      />
      <PullToRefresh disabled={isAdminRoute || isAnyModalOrDrawerOpen || location.pathname === '/checkout'} />
      <CookieNotice hidden={isAdminRoute || isAnyModalOrDrawerOpen || location.pathname === '/checkout' || pdpBuyBarVisible || totalItemsCount > 0} hasTabBar={standaloneTabBarVisible} />
      <PwaInstallBanner hidden={isAdminRoute || isAnyModalOrDrawerOpen || location.pathname === '/checkout' || pdpBuyBarVisible || consentUiActive || standaloneTabBarVisible} />
      
      {/* Drawer & Modals (Lazy-loaded on first use to keep initial JS lean) */}
      <React.Suspense fallback={null}>
        {(isCartOpen || loadedOverlays.cart) && (
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onCheckout={handleInitiateCheckout}
          />
        )}
        {(authModalOpen || loadedOverlays.auth) && <AuthModal isOpen={authModalOpen} initialMode={authInitialMode} onClose={() => setAuthModalOpen(false)} />}
        {(!!selectedQuickViewProduct || loadedOverlays.quick) && <QuickViewModal product={selectedQuickViewProduct ? PRODUCTS.find(product => product.id === selectedQuickViewProduct.id) || null : null} isOpen={!!selectedQuickViewProduct} onClose={() => setSelectedQuickViewProduct(null)} onAddToCart={handleAddToCart} />}
        {(hamperModalOpen || loadedOverlays.hamper) && <CustomHamperBuilderModal isOpen={hamperModalOpen} onClose={() => setHamperModalOpen(false)} onAddToCart={handleAddCustomHamper} />}
        {(authChoiceModalOpen || loadedOverlays.checkout) && <CheckoutAuthChoiceModal isOpen={authChoiceModalOpen} onClose={() => setAuthChoiceModalOpen(false)} onSignIn={() => { setAuthChoiceModalOpen(false); setAuthModalOpen(true); }} onContinueAsGuest={() => { setAuthChoiceModalOpen(false); navigate('/checkout'); }} />}
        {(patronLoungeOpen || loadedOverlays.patron) && <PatronLoungeModal isOpen={patronLoungeOpen} onClose={() => setPatronLoungeOpen(false)} />}
        {(updatesOpen || loadedOverlays.updates) && <StoreUpdatesDialog isOpen={updatesOpen} onClose={() => setUpdatesOpen(false)} onSignIn={() => { setUpdatesOpen(false); setAuthInitialMode('signin'); setAuthModalOpen(true); }} />}
        {(infoModalOpen || loadedOverlays.info) && <InfoPagesModal isOpen={infoModalOpen} initialTab={infoModalTab} onClose={() => setInfoModalOpen(false)} />}
        {(policyModalOpen || loadedOverlays.policy) && <PolicyPagesModal isOpen={policyModalOpen} initialTab={policyModalTab} onClose={() => setPolicyModalOpen(false)} />}
        {mehmaanModalOpen && <MehmaanTablePlannerModal isOpen={mehmaanModalOpen} onClose={() => setMehmaanModalOpen(false)} />}
        {occasionModalOpen && <OccasionInquiryModal isOpen={occasionModalOpen} defaultOccasion={defaultOccasion} prefill={occasionPrefill} onClose={() => setOccasionModalOpen(false)} />}
        {shopTheTableOpen && <ShopTheTableModal isOpen={shopTheTableOpen} onClose={() => setShopTheTableOpen(false)} />}
        {customQuoteLoaded && <CustomQuoteModal />}
        {!isAdminRoute && aiConciergeMounted && (
          <AIConcierge
            initialOpen={true}
            initialRequest={pendingConciergeRequest}
            onRequestHandled={(id) =>
              setPendingConciergeRequest((current) => (current?.id === id ? null : current))
            }
            hide={hideFloatingConcierge}
            hasCartBar={hasBottomObstruction}
            hasCookieBar={consentUiActive}
            onOpenChange={setAiConciergeOpen}
          />
        )}
      </React.Suspense>
      {!hideFloatingConcierge && !aiConciergeMounted && (
        <div
          data-ai-buddy-launcher="true"
          data-compact={launcherPlacement.isCompactOnScroll ? 'true' : 'false'}
          style={{
            bottom: `calc(env(safe-area-inset-bottom, 0px) + ${launcherPlacement.bottomPx}px)`,
            ...(launcherPlacement.side === 'right' ? { right: '10px' } : { left: '10px' }),
          }}
          className="fixed z-30 sm:right-6 sm:left-auto transition-[bottom,opacity,transform] duration-200 motion-reduce:transition-none"
        >
          <button
            type="button"
            onClick={() => {
              setAiConciergeMounted(true);
              setAiConciergeOpen(true);
            }}
            className={`relative flex items-center justify-center w-[44px] h-[44px] sm:w-14 sm:h-14 rounded-full cursor-pointer group select-none focus-ring ${launcherPlacement.isCompactOnScroll ? 'opacity-85 hover:opacity-100' : 'opacity-100'}`}
            title={t('concierge.title')}
            aria-label={t('concierge.open')}
            aria-expanded={false}
            aria-controls="allbarka-concierge-panel"
          >
            <span className={`block rounded-full p-[1.5px] bg-gradient-to-br from-[#D4B483] via-[#C7982F] to-[#B8935F] shadow-lg hover:shadow-xl transition-all duration-200 motion-reduce:transition-none motion-safe:group-hover:scale-105 motion-safe:active:scale-95 ${launcherPlacement.isCompactOnScroll ? 'w-9 h-9 sm:w-14 sm:h-14' : 'w-[44px] h-[44px] sm:w-14 sm:h-14'}`}>
              <span className="w-full h-full rounded-full bg-[var(--color-surface,#FFFCF7)] flex items-center justify-center relative overflow-hidden shadow-sm">
                <span className="absolute inset-[2px] rounded-full border border-[#C7982F]/40 pointer-events-none" />
                <span className="relative z-10 flex flex-col items-center justify-center">
                  <span className={`font-serif font-black tracking-tight text-[var(--color-accent-text,#806326)] leading-none ${launcherPlacement.isCompactOnScroll ?'text-[10px] sm:text-sm':'text-xs sm:text-sm'}`}>
                    AB
                  </span>
                  {!launcherPlacement.isCompactOnScroll && (
                    <span className="text-[6.5px] font-black text-[var(--color-ink,#29231D)] leading-none mt-0.5 opacity-90 flex items-center gap-0.5">
                      <Sparkles size={6} className="text-[#C7982F]" aria-hidden="true" />
                      AI
                    </span>
                  )}
                </span>
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
