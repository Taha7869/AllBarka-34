import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { CartItem, Product } from '../types';

import ScrollProgressBar from '../components/ScrollProgressBar';
import GradualBlur from '../components/GradualBlur';
import BubbleMenu from '../components/BubbleMenu';
import MobileMenu from '../components/MobileMenu';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import BackToTop from '../components/BackToTop';
import ToastManager from '../components/ToastManager';
import StickyCartBottomBar from '../components/StickyCartBottomBar';
import ThemeToggle from '../components/ThemeToggle';
import type { InfoPageTab } from '../components/InfoPagesModal';
import type { PolicyTab } from '../components/PolicyPagesModal';
import type { CustomHamperCartInput } from '../components/CustomHamperBuilderModal';

// Code-split heavy modals and overlays
const QuickViewModal = React.lazy(() => import('../components/QuickViewModal'));
const AuthModal = React.lazy(() => import('../components/AuthModal'));
const CheckoutAuthChoiceModal = React.lazy(() => import('../components/CheckoutAuthChoiceModal'));
const PatronLoungeModal = React.lazy(() => import('../components/PatronLoungeModal'));
const InfoPagesModal = React.lazy(() => import('../components/InfoPagesModal'));
const PolicyPagesModal = React.lazy(() => import('../components/PolicyPagesModal'));
const AIConcierge = React.lazy(() => import('../components/AIConcierge'));
const CustomHamperBuilderModal = React.lazy(() => import('../components/CustomHamperBuilderModal'));
const StoreUpdatesDialog = React.lazy(() => import('../components/StoreUpdatesDialog'));

import LahoreExpressTimer from '../components/LahoreExpressTimer';
import { Menu, X, ShoppingBag, User, Gift, Languages, ChevronDown } from 'lucide-react';
import { AllBarkaHeaderLogo } from '../components/AllBarkaLogo';
import MobileHeaderBrand from '../components/MobileHeaderBrand';
import Breadcrumbs from '../components/Breadcrumbs';
import { PRODUCTS, getProductImage } from '../data/products';
import { acquireScrollLock } from '../utils/scrollLock';
import ErrorBoundary from '../components/ErrorBoundary';
import { useOnlineStatus } from '../hooks/useOnlineStatus';


export default function RootLayout() {
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin/');
  const { currentUser, patronProfile, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  
  const mobileMenuTriggerRef = React.useRef<HTMLButtonElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCartPulsing, setIsCartPulsing] = useState(false);

  const { cartItems, isCartOpen, setIsCartOpen, totalItemsCount, addToCart } = useCart();

  // Derive active navigation state from actual route
  const activeNavItem = React.useMemo(() => {
    if (location.pathname === '/') return 'Home';
    if (location.pathname.startsWith('/shop/combos') || location.pathname.startsWith('/gifting')) return 'Gift Boxes';
    if (location.pathname === '/shop/herbs-spices' || location.pathname === '/category/herbs-spices') return 'Herbs & Spices';
    if (location.pathname.startsWith('/shop') || location.pathname.startsWith('/product') || location.pathname.startsWith('/category') || location.pathname.startsWith('/wholesale')) return 'Shop';
    if (location.pathname.startsWith('/journal')) return 'Journal';
    if (location.pathname.startsWith('/pages/contact') || location.pathname === '/contact') return 'Contact';
    return 'Home';
  }, [location.pathname]);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [authChoiceModalOpen, setAuthChoiceModalOpen] = useState(false);
  const [patronLoungeOpen, setPatronLoungeOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [selectedQuickViewProduct, setSelectedQuickViewProduct] = useState<Product | null>(null);

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
    window.addEventListener('open-auth-modal', handleOpenAuth);
    window.addEventListener('open-patron-lounge', handleOpenLounge);
    window.addEventListener('open-store-updates', handleOpenUpdates);
    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuth);
      window.removeEventListener('open-patron-lounge', handleOpenLounge);
      window.removeEventListener('open-store-updates', handleOpenUpdates);
    };
  }, []);
  
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalTab, setInfoModalTab] = useState<InfoPageTab>('our-story');
  
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyModalTab, setPolicyModalTab] = useState<PolicyTab>('shipping');
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [aiConciergeOpen, setAiConciergeOpen] = useState(false);
  const [hamperModalOpen, setHamperModalOpen] = useState(false);

  // Defer each overlay until first use, then retain it so drafts survive closing.
  const [loadedOverlays, setLoadedOverlays] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const open = { quick: !!selectedQuickViewProduct, hamper: hamperModalOpen, auth: authModalOpen,
      checkout: authChoiceModalOpen, patron: patronLoungeOpen, info: infoModalOpen, policy: policyModalOpen, updates: updatesOpen };
    setLoadedOverlays(previous => {
      const newlyOpened = Object.keys(open).filter(key => open[key as keyof typeof open] && !previous[key]);
      return newlyOpened.length ? { ...previous, ...Object.fromEntries(newlyOpened.map(key => [key, true])) } : previous;
    });
  }, [selectedQuickViewProduct, hamperModalOpen, authModalOpen, authChoiceModalOpen, patronLoungeOpen, infoModalOpen, policyModalOpen, updatesOpen]);

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
      const search = document.querySelector<HTMLInputElement>('#hero-search-input, #category-plp-container input[type="search"]');
      if (search) { event.preventDefault(); search.focus(); search.scrollIntoView({ block: 'center', behavior: 'instant' }); }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const handleInitiateCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if any modal or drawer is active:
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
  useEffect(() => {
    if (!isAnyModalOrDrawerOpen) return;
    const releaseLock = acquireScrollLock();
    return () => {
      releaseLock();
    };
  }, [isAnyModalOrDrawerOpen]);


  // We add AnimatePresence page transitions, but respect prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const pageTransitionVariants = {
    initial: { opacity: 0, y: 10 },
    enter: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.25, ease: 'easeOut' as const }
    },
    exit: { 
      opacity: 0, 
      y: -5,
      transition: { duration: 0.15, ease: 'easeIn' as const }
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full relative flex flex-col font-sans bg-[var(--color-base)] text-[var(--color-ink)] selection:bg-[var(--color-gold)]/30 selection:text-[var(--color-ink)]">
      <ToastManager />
      {!isAdminRoute && <GradualBlur preset="header" strength={1.5} opacity={0.9} />}
      
      {/* Lahore Same-Day Express Timer Bar */}
      {!isAdminRoute && <LahoreExpressTimer onOpenSchedule={() => { setPolicyModalTab('shipping'); setPolicyModalOpen(true); }} />}

      {/* Header Navigation */}
      <header 
        id="main-navigation-header"
        dir="ltr"
        className={`sticky top-0 left-0 right-0 z-[100] w-full transition-all duration-300 ${
          isScrolled 
            ? 'h-[60px] sm:h-[68px] bg-[var(--color-surface)]/85 dark:bg-[var(--color-base)]/85 backdrop-blur-xl shadow-[var(--shadow-card)] border-b border-[var(--color-border)]'
            : 'h-[68px] sm:h-20 bg-[var(--color-base)]/95 dark:bg-[var(--color-base)]/95 backdrop-blur-md shadow-none border-b border-transparent'
        }`}
      >
        {!online && <div role="status" className="fixed inset-x-0 top-0 z-[20000] border-b border-[#c7982f] bg-[#092e23] px-4 py-2 text-center text-xs text-[#fff8e9]">{t('checkout.offline')}</div>}
      {!isAdminRoute && <ScrollProgressBar showGlow={false} />}
        <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <div className="flex justify-between items-center gap-2 sm:gap-4 w-full h-full">
            
            {/* Leading Brand Mark: Desktop shows full logo, Mobile shows crest + animated intro */}
            <div className="flex items-center shrink-0">
              <div 
                onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                className="hidden lg:block cursor-pointer focus-ring rounded-xl p-1 -m-1"
                aria-label="AllBarka — Home"
              >
                <AllBarkaHeaderLogo />
              </div>

              <div className="block lg:hidden">
                <MobileHeaderBrand onHomeClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              </div>
            </div>
            
            {/* Center Navigation (Desktop Only) */}
            <div className="hidden xl:flex flex-1 justify-center px-4">
              <BubbleMenu 
                activeItem={activeNavItem} 
                onItemClick={(item) => navigate(item.path)} 
              />
            </div>

            {/* Trailing Utility Controls */}
            <div className="flex items-center gap-1.5 sm:gap-3 justify-end shrink-0">
              {/* Custom Gift Hamper Builder Button */}
              <button
                type="button"
                onClick={() => setHamperModalOpen(true)}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 border border-[#C7982F]/30 bg-[#C7982F]/10 hover:bg-[#C7982F]/20 text-[#806326] dark:text-[#E4C783] text-xs font-semibold tracking-wide cursor-pointer focus-ring"
                aria-label={t('nav.customHamper')}
              >
                <Gift size={15} className="text-[#C7982F]" />
                <span className="hidden lg:inline">{t('nav.customHamper')}</span>
              </button>

              {/* Language selector (Desktop only; mobile uses MobileMenu) */}
              <div className="relative hidden lg:flex items-center min-h-[44px] rounded-xl border border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 text-[#042821] dark:text-[#FFFCF7] focus-within:ring-2 focus-within:ring-[#C7982F]/35">
                <Languages size={16} className="absolute start-2.5 text-[#C7982F] pointer-events-none" aria-hidden="true" />
                <label htmlFor="desktop-language-select" className="sr-only">{t('nav.language')}</label>
                <select
                  id="desktop-language-select"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as LanguageCode)}
                  className="h-[42px] w-[112px] appearance-none cursor-pointer rounded-xl bg-transparent ps-8 pe-7 text-xs font-semibold focus:outline-none"
                  aria-label={t('nav.language')}
                >
                  <option value="en">English</option>
                  <option value="ur">اردو</option>
                  <option value="ar">العربية</option>
                </select>
                <ChevronDown size={13} className="absolute end-2.5 text-[#C7982F] pointer-events-none" aria-hidden="true" />
              </div>

              {/* Theme Toggle (Mobile & Desktop) */}
              <ThemeToggle className="min-w-[44px] min-h-[44px] border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 hover:bg-[#C7982F]/15 text-[#042821] dark:text-[#FFFCF7]" />

              {/* Patron VIP Lounge / Login (Desktop only) */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button 
                  type="button"
                  onClick={() => currentUser ? setPatronLoungeOpen(true) : setAuthModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 hover:bg-[#C7982F]/15 text-[#042821] dark:text-[#FFFCF7] focus-ring cursor-pointer"
                  aria-label={currentUser ? t('patronLounge') : t('vipLogin')}
                >
                  <div className="bg-[#C7982F]/15 p-1 rounded-lg">
                    <User size={16} className="text-[#C7982F]" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide whitespace-nowrap">
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
                    <span className="text-[11px] font-bold tracking-wide uppercase">{t('nav.logout')}</span>
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
                <AnimatePresence>
                  {totalItemsCount > 0 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1 -right-1 min-w-[19px] h-[19px] flex items-center justify-center bg-[#C7982F] text-[#042821] text-[10px] font-bold rounded-full px-1 shadow-xs leading-none pointer-events-none"
                    >
                      {totalItemsCount}
                    </motion.div>
                  )}
                </AnimatePresence>
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

      <MobileMenu 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        cartCount={totalItemsCount}
        onOpenCart={() => setIsCartOpen(true)}
        triggerRef={mobileMenuTriggerRef}
        onNavItemClick={(item) => {
          if (item === 'Home') navigate('/');
          else if (item === 'Shop') navigate('/shop');
          else if (item === 'Herbs & Spices') navigate('/shop/herbs-spices');
          else if (item === 'Gift Boxes') navigate('/shop/combos');
          else if (item === 'Contact') navigate('/pages/contact');
          else navigate('/shop');
        }}
      />

      <main className="flex-1 w-full relative z-10 flex flex-col items-center">
        {/* Shared Breadcrumb Navigation for all subpages (hidden on homepage) */}
        {!isAdminRoute && <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs />
        </div>}
        
        <ErrorBoundary>
          <React.Suspense
            fallback={
              <div className="min-h-[50vh] flex flex-col items-center justify-center p-8" aria-busy="true">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--color-gold,#C7982F)]/30 border-t-[var(--color-gold,#C7982F)] animate-spin mb-4" />
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--color-gold,#C7982F)]">
                  Loading AllBarka...
                </span>
              </div>
            }
          >
            <div className="w-full flex justify-center">
                {prefersReducedMotion || location.pathname === '/checkout' || location.pathname === '/cart' ? (
                  <div key={location.pathname} className="w-full flex-col flex items-center">
                    <Outlet context={{ cartItems, addToCart, handleAddToCart, setCartOpen: setIsCartOpen, setSelectedQuickViewProduct, setHamperModalOpen }} />
                  </div>
                ) : (
                  <motion.div
                    key={location.pathname}
                    variants={pageTransitionVariants}
                    initial="initial"
                    animate="enter"
                    className="w-full flex-col flex items-center origin-top bg-[var(--color-base)]"
                  >
                    <Outlet context={{ cartItems, addToCart, handleAddToCart, setCartOpen: setIsCartOpen, setSelectedQuickViewProduct, setHamperModalOpen }} />
                  </motion.div>
                )}
            </div>
          </React.Suspense>
        </ErrorBoundary>

      </main>

      {!isAdminRoute && <Footer />}
      <BackToTop hide={isAdminRoute || isAnyModalOrDrawerOpen} hasCartBar={totalItemsCount > 0 && location.pathname !== '/checkout' && location.pathname !== '/cart'} />
      
      <StickyCartBottomBar 
        hide={isAdminRoute || isAnyModalOrDrawerOpen}
      />
      
      {/* Drawer & Modals */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleInitiateCheckout}
      />
      {/* Lazy Overlays & Modals */}
      <React.Suspense fallback={authModalOpen ? <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-[#042821]/60 p-4 backdrop-blur-sm"><div className="flex items-center gap-5 rounded-2xl border border-[var(--color-border-accent)] bg-[var(--color-surface)] p-5 text-[var(--color-text-primary)]"><p role="status" dir="auto">{t('auth.working')}</p><button type="button" className="focus-ring grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)]" aria-label={t('close')} onClick={() => setAuthModalOpen(false)}><X size={18} /></button></div></div> : null}>
        {(authModalOpen || loadedOverlays.auth) && <AuthModal isOpen={authModalOpen} initialMode={authInitialMode} onClose={() => setAuthModalOpen(false)} />}
      </React.Suspense>
      <React.Suspense fallback={null}>
        {(!!selectedQuickViewProduct || loadedOverlays.quick) && <QuickViewModal product={selectedQuickViewProduct} isOpen={!!selectedQuickViewProduct} onClose={() => setSelectedQuickViewProduct(null)} onAddToCart={handleAddToCart} />}
        {(hamperModalOpen || loadedOverlays.hamper) && <CustomHamperBuilderModal isOpen={hamperModalOpen} onClose={() => setHamperModalOpen(false)} onAddToCart={handleAddCustomHamper} />}
        {(authChoiceModalOpen || loadedOverlays.checkout) && <CheckoutAuthChoiceModal isOpen={authChoiceModalOpen} onClose={() => setAuthChoiceModalOpen(false)} onSignIn={() => { setAuthChoiceModalOpen(false); setAuthModalOpen(true); }} onContinueAsGuest={() => { setAuthChoiceModalOpen(false); navigate('/checkout'); }} />}
        {(patronLoungeOpen || loadedOverlays.patron) && <PatronLoungeModal isOpen={patronLoungeOpen} onClose={() => setPatronLoungeOpen(false)} />}
        {(updatesOpen || loadedOverlays.updates) && <StoreUpdatesDialog isOpen={updatesOpen} onClose={() => setUpdatesOpen(false)} onSignIn={() => { setUpdatesOpen(false); setAuthInitialMode('signin'); setAuthModalOpen(true); }} />}
        {(infoModalOpen || loadedOverlays.info) && <InfoPagesModal isOpen={infoModalOpen} initialTab={infoModalTab} onClose={() => setInfoModalOpen(false)} />}
        {(policyModalOpen || loadedOverlays.policy) && <PolicyPagesModal isOpen={policyModalOpen} initialTab={policyModalTab} onClose={() => setPolicyModalOpen(false)} />}
        {!isAdminRoute && <AIConcierge hide={isAnyModalOrDrawerOpen && !aiConciergeOpen} hasCartBar={totalItemsCount > 0 && location.pathname !== '/checkout' && location.pathname !== '/cart'} onOpenChange={setAiConciergeOpen} />}
      </React.Suspense>
    </div>
  );
}
