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

// Code-split heavy modals and overlays
const QuickViewModal = React.lazy(() => import('../components/QuickViewModal'));
const AuthModal = React.lazy(() => import('../components/AuthModal'));
const CheckoutAuthChoiceModal = React.lazy(() => import('../components/CheckoutAuthChoiceModal'));
const PatronLoungeModal = React.lazy(() => import('../components/PatronLoungeModal'));
const InfoPagesModal = React.lazy(() => import('../components/InfoPagesModal'));
const PolicyPagesModal = React.lazy(() => import('../components/PolicyPagesModal'));
const AIConcierge = React.lazy(() => import('../components/AIConcierge'));
const CustomHamperBuilderModal = React.lazy(() => import('../components/CustomHamperBuilderModal'));

import LahoreExpressTimer from '../components/LahoreExpressTimer';
import { Menu, X, ShoppingBag, User, Gift, Languages, ChevronDown } from 'lucide-react';
import { AllBarkaHeaderLogo } from '../components/AllBarkaLogo';
import MobileHeaderBrand from '../components/MobileHeaderBrand';
import Breadcrumbs from '../components/Breadcrumbs';
import { PRODUCTS, getProductImage } from '../data/products';
import { acquireScrollLock } from '../utils/scrollLock';
import ErrorBoundary from '../components/ErrorBoundary';


export default function RootLayout() {
  const navigate = useNavigate();

  const location = useLocation();
  const { currentUser, patronProfile, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  
  const mobileMenuTriggerRef = React.useRef<HTMLButtonElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCartPulsing, setIsCartPulsing] = useState(false);

  const { cartItems, isCartOpen, setIsCartOpen, totalItemsCount, addToCart } = useCart();

  // Derive active navigation state from actual route
  const activeNavItem = React.useMemo(() => {
    if (location.pathname === '/') return 'Home';
    if (location.pathname.startsWith('/shop/combos') || location.pathname.startsWith('/gifting')) return 'Gift Boxes';
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
    window.addEventListener('open-auth-modal', handleOpenAuth);
    window.addEventListener('open-patron-lounge', handleOpenLounge);
    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuth);
      window.removeEventListener('open-patron-lounge', handleOpenLounge);
    };
  }, []);
  
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalTab, setInfoModalTab] = useState<InfoPageTab>('our-story');
  
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyModalTab, setPolicyModalTab] = useState<PolicyTab>('shipping');
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [aiConciergeOpen, setAiConciergeOpen] = useState(false);
  const [hamperModalOpen, setHamperModalOpen] = useState(false);

  const handleAddCustomHamper = (hamperItem: {
    id: string;
    name: string;
    selectedWeight: string;
    price: number;
    image: string;
    quantity: number;
  }) => {
    addToCart({
      id: hamperItem.id,
      productId: hamperItem.id,
      slug: 'custom-hamper',
      name: hamperItem.name,
      selectedWeight: hamperItem.selectedWeight,
      unitPrice: hamperItem.price,
      price: hamperItem.price,
      image: hamperItem.image,
      quantity: hamperItem.quantity,
    });
    setIsCartPulsing(true);
    setTimeout(() => setIsCartPulsing(false), 800);
  };

  const handleAddToCart = (productId: string, weight: string, customQty = 1) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    const unitPrice = product.prices[weight] || Object.values(product.prices)[0] || 0;

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

  const handleInitiateCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
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


  return (
    <div className="min-h-screen w-full max-w-full relative flex flex-col font-sans bg-[var(--color-base)] text-[var(--color-ink)] selection:bg-[var(--color-gold)]/30 selection:text-[var(--color-ink)]">
      <ScrollProgressBar />
      <ToastManager />
      <GradualBlur preset="header" strength={1.5} opacity={0.9} />
      
      {/* Lahore Same-Day Express Timer Bar */}
      <LahoreExpressTimer onOpenSchedule={() => { setPolicyModalTab('shipping'); setPolicyModalOpen(true); }} />

      {/* Header Navigation */}
      <header 
        id="main-navigation-header"
        className={`sticky top-0 left-0 right-0 z-[100] w-full transition-all duration-300 border-b border-[#29231D]/10 dark:border-[#C7982F]/20 bg-[#FFFCF7]/95 dark:bg-[#121615]/95 backdrop-blur-md ${
          isScrolled 
            ? 'shadow-[0_4px_20px_rgba(41,35,29,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)]' 
            : 'shadow-none'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[60px] sm:h-20 gap-2 sm:gap-4 w-full">
            
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
            <div className="hidden lg:flex flex-1 justify-center px-4">
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
                aria-label="Build Custom Luxury Gift Hamper"
              >
                <Gift size={15} className="text-[#C7982F]" />
                <span className="hidden lg:inline">Custom Hamper</span>
              </button>

              {/* Language selector (Desktop only; mobile uses MobileMenu) */}
              <div className="relative hidden lg:flex items-center min-h-[44px] rounded-xl border border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 text-[#042821] dark:text-[#FFFCF7] focus-within:ring-2 focus-within:ring-[#C7982F]/35">
                <Languages size={16} className="absolute start-2.5 text-[#C7982F] pointer-events-none" aria-hidden="true" />
                <label htmlFor="desktop-language-select" className="sr-only">Language</label>
                <select
                  id="desktop-language-select"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as LanguageCode)}
                  className="h-[42px] w-[112px] appearance-none cursor-pointer rounded-xl bg-transparent ps-8 pe-7 text-xs font-semibold focus:outline-none"
                  aria-label="Language"
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
              <button 
                type="button"
                onClick={() => currentUser ? setPatronLoungeOpen(true) : setAuthModalOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 hover:bg-[#C7982F]/15 text-[#042821] dark:text-[#FFFCF7] focus-ring cursor-pointer"
                aria-label={currentUser ? 'Open VIP patron lounge' : 'Patron login'}
              >
                <div className="bg-[#C7982F]/15 p-1 rounded-lg">
                  <User size={16} className="text-[#C7982F]" />
                </div>
                <span className="text-xs font-semibold tracking-wide whitespace-nowrap">
                  {currentUser ? (patronProfile?.name?.split(' ')[0] || 'VIP Patron') : 'Patron Login'}
                </span>
              </button>

              {/* Cart Button */}
              <button 
                id="header-cart-btn"
                type="button"
                onClick={() => setIsCartOpen(true)}
                className={`relative min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all duration-200 border border-[#29231D]/10 dark:border-[#C7982F]/25 bg-[#F6F1EA]/60 dark:bg-[#1A201E]/60 hover:bg-[#C7982F]/15 text-[#042821] dark:text-[#FFFCF7] focus-ring cursor-pointer ${
                  isCartPulsing ? 'scale-105 bg-[#C7982F]/25 border-[#C7982F]' : ''
                }`}
                aria-label={`Shopping bag with ${totalItemsCount} items`}
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
                className="lg:hidden min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#29231D] dark:text-[#FFFCF7] hover:bg-[#C7982F]/15 border border-[#29231D]/10 dark:border-[#C7982F]/25 transition-colors focus-ring cursor-pointer"
                aria-label="Open Navigation Menu"
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
          else if (item === 'Gift Boxes') navigate('/shop/combos');
          else if (item === 'Contact') navigate('/pages/contact');
          else navigate('/shop');
        }}
      />

      <main className="flex-1 w-full relative z-10 flex flex-col items-center">
        {/* Shared Breadcrumb Navigation for all subpages (hidden on homepage) */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs />
        </div>
        
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
            <div className="w-full flex flex-col items-center">
              <Outlet context={{ cartItems, addToCart, handleAddToCart, setCartOpen: setIsCartOpen, setSelectedQuickViewProduct, setHamperModalOpen }} />
            </div>
          </React.Suspense>
        </ErrorBoundary>

      </main>

      <Footer />
      <BackToTop hide={isAnyModalOrDrawerOpen} hasCartBar={totalItemsCount > 0 && location.pathname !== '/checkout' && location.pathname !== '/cart'} />
      
      <StickyCartBottomBar 
        hide={isAnyModalOrDrawerOpen}
      />
      
      {/* Drawer & Modals */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleInitiateCheckout}
      />
      {/* Lazy Overlays & Modals */}
      <React.Suspense fallback={null}>
        <QuickViewModal product={selectedQuickViewProduct} isWholesale={false} isOpen={!!selectedQuickViewProduct} onClose={() => setSelectedQuickViewProduct(null)} onAddToCart={handleAddToCart} />
        <CustomHamperBuilderModal isOpen={hamperModalOpen} onClose={() => setHamperModalOpen(false)} onAddToCart={handleAddCustomHamper} />
        <AuthModal isOpen={authModalOpen} initialMode={authInitialMode} onClose={() => setAuthModalOpen(false)} />
        <CheckoutAuthChoiceModal isOpen={authChoiceModalOpen} onClose={() => setAuthChoiceModalOpen(false)} onSignIn={() => { setAuthChoiceModalOpen(false); setAuthModalOpen(true); }} onContinueAsGuest={() => { setAuthChoiceModalOpen(false); navigate('/checkout'); }} />
        <PatronLoungeModal isOpen={patronLoungeOpen} onClose={() => setPatronLoungeOpen(false)} />
        <InfoPagesModal isOpen={infoModalOpen} initialTab={infoModalTab} onClose={() => setInfoModalOpen(false)} />
        <PolicyPagesModal isOpen={policyModalOpen} initialTab={policyModalTab} onClose={() => setPolicyModalOpen(false)} />
        <AIConcierge hide={isAnyModalOrDrawerOpen && !aiConciergeOpen} hasCartBar={totalItemsCount > 0 && location.pathname !== '/checkout' && location.pathname !== '/cart'} onOpenChange={setAiConciergeOpen} />
      </React.Suspense>
    </div>
  );
}
