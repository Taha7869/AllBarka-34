import CurrencySelector from './CurrencySelector';
import { usePrefersReducedMotion as useReducedMotion } from '../hooks/usePrefersReducedMotion';
import {useStorefrontContent} from '../contexts/StorefrontContentContext';
import {contentNavigation} from '../lib/contentPresentation';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getPrimaryActiveSectionId } from './BubbleMenu';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  Crown,
  Bell,
  Sparkles, 
  BookOpen, 
  MessageCircle, 
  Instagram, 
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { AllBarkaCrestVector } from './AllBarkaLogo';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { acquireScrollLock } from '../utils/scrollLock';
import { buildHumanSupportWhatsAppUrl } from '../config/contacts';
import { CANONICAL_CATEGORIES } from '../config/categories';
import { MAIN_NAV_ITEMS, COMPACT_FOOD_NAV_ITEMS } from '../config/navigation';
import { openCustomQuoteModal } from '../lib/customQuoteEvent';
import { catalogTranslations } from '../contexts/catalogTranslations';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  cartCount?: number;
  onOpenCart?: () => void;
  onNavItemClick?: (item: string) => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function MobileMenu({ 
  isOpen, 
  onClose, 
  cartCount = 0, 
  onOpenCart, 
  onNavItemClick,
  triggerRef
}: MobileMenuProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, isRtl, t } = useLanguage();
  const { currentUser, patronProfile, logout } = useAuth();
  const content=useStorefrontContent();
  const location = useLocation();
  const activeSection = content.navigation.find(entry => entry.visible && entry.path === location.pathname + location.search)?.id
    || getPrimaryActiveSectionId(location.pathname, location.search);
  const reduceMotion = useReducedMotion();
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    shop: false,
    gifting: false,
    'celebration-boxes': false,
    occasions: false,
    deals: false,
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const previousRoute = useRef(location.key);

  // Back/Forward and navigation outside this drawer must release its modal state.
  useEffect(() => {
    if (previousRoute.current === location.key) return;
    previousRoute.current = location.key;
    closeRef.current();
  }, [location.key]);

  // Match Tailwind's xl breakpoint: a hidden mobile drawer must not lock desktop.
  useEffect(() => {
    if (!isOpen || typeof window.matchMedia !== 'function') return;
    const desktop = window.matchMedia('(min-width: 80rem)');
    const update = () => {
      if (!desktop.matches) return;
      const focusWasInside = containerRef.current?.contains(document.activeElement);
      closeRef.current();
      if (focusWasInside) {
        const visibleHeaderControl = Array.from(document.querySelectorAll<HTMLElement>('header a[href], header button'))
          .find(element => element.getClientRects().length && !element.closest('[inert]'));
        visibleHeaderControl?.focus();
      }
    };
    update();
    if (typeof desktop.addEventListener === 'function') {
      desktop.addEventListener('change', update);
      return () => desktop.removeEventListener('change', update);
    }
    desktop.addListener(update);
    return () => desktop.removeListener(update);
  }, [isOpen]);

  const dismissMenu = () => {
    closeRef.current();
    triggerRef?.current?.focus();
  };

  // Focus management & Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      // A quick keyboard/pointer action inside the menu takes precedence.
      if (!containerRef.current?.contains(document.activeElement)) closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
        triggerRef?.current?.focus();
      } else if (e.key === 'Tab') {
        const controls = containerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || !containerRef.current?.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !containerRef.current?.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, triggerRef]);

  // Reference-counted background scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const releaseLock = acquireScrollLock();
    return () => {
      releaseLock();
    };
  }, [isOpen]);

  const handleDestination = (path: string, itemLabel?: string) => {
    onClose();
    if (itemLabel && onNavItemClick) onNavItemClick(itemLabel);
    navigate(path);
    triggerRef?.current?.focus();
  };

  const handleAuthAction = () => {
    onClose();
    if (currentUser) {
      window.dispatchEvent(new CustomEvent('open-patron-lounge'));
    } else {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
    }
  };

  const handleCartAction = () => {
    onClose();
    if (onOpenCart) {
      onOpenCart();
    } else {
      navigate('/cart');
    }
    triggerRef?.current?.focus();
  };

  const backdropVariants: Variants = {
    closed: { opacity: 0, transition: { duration: reduceMotion ? 0 : 0.25 } },
    open: { opacity: 1, transition: { duration: reduceMotion ? 0 : 0.25 } }
  };

  const drawerVariants: Variants = {
    closed: { 
      x: reduceMotion ? 0 : isRtl ? '100%' : '-100%',
      transition: { duration: reduceMotion ? 0 : 0.3, ease: [0.32, 0.72, 0, 1] }
    },
    open: { 
      x: 0, 
      transition: { duration: reduceMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <div
      id="mobile-navigation-menu"
      role={isOpen ? 'dialog' : undefined}
      aria-modal={isOpen ? true : undefined}
      aria-hidden={!isOpen}
      aria-label={t('nav.main')}
      inert={!isOpen}
      style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      className="fixed inset-0 z-[120] flex xl:hidden"
    >
    <AnimatePresence key={location.key}>
      {isOpen && (
        <React.Fragment key="menu-surfaces">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={dismissMenu}
            className="fixed inset-0 bg-[#042821]/60 dark:bg-black/75 backdrop-blur-xs"
          />

          {/* Slide-out Drawer Panel — Deep Matte Emerald & Champagne Gold */}
          <motion.div
            ref={containerRef}
            variants={drawerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="relative w-[85vw] max-w-[340px] h-full bg-[#042821] border-e border-[#C7982F]/35 shadow-2xl flex flex-col z-10 overflow-hidden text-[#FDFBF7]"
          >
            {/* Header / Brand in Drawer */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#C7982F]/25 bg-[#031F1A] shrink-0">
              <button
                type="button"
                onClick={() => handleDestination('/', 'Home')}
                className="flex min-h-11 items-center gap-2.5 cursor-pointer focus-ring rounded-lg p-1 -m-1 text-start"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <AllBarkaCrestVector />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-serif font-bold text-[#FDFBF7] leading-none">
                    AllBarka
                  </span>
                  <span className="text-[7px] font-sans font-semibold text-[#E4C783] leading-none mt-1">
                    LAHORE GIFTING HOUSE
                  </span>
                </div>
              </button>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={dismissMenu}
                className="w-11 h-11 rounded-full flex items-center justify-center text-[#FDFBF7] hover:bg-[#C7982F]/20 border border-[#C7982F]/35 transition-colors focus-ring cursor-pointer"
                aria-label={t('nav.closeMenu')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 overscroll-contain">
              
              {/* 1. Account / Login (or signed-in patron profile) */}
              <div>
                <span className="text-[10px] font-sans font-semibold text-[#E4C783] block mb-2 px-1">
                  {currentUser ? t('patronProfile', 'Patron Profile') : t('patronLounge', 'Patron Lounge')}
                </span>
                <button
                  type="button"
                  onClick={handleAuthAction}
                  className="w-full min-h-[48px] flex items-center justify-between p-3 rounded-xl bg-[#08352B] border border-[#C7982F]/35 hover:border-[#C7982F] transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-[#C7982F]/20 flex items-center justify-center shrink-0">
                      <Crown size={15} className="text-[#E4C783]" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#FDFBF7] truncate">
                        {currentUser ? (patronProfile?.name || t('patronAccount', 'Patron Account')) : t('vipLogin', 'Patron VIP Lounge')}
                      </div>
                      <div className="text-[10px] text-[#E4C783] truncate">
                        {currentUser ? t('loyaltyPerks', 'View loyalty perks & tier') : t('signInPrompt', 'Sign in for faster checkout')}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-[#E4C783] shrink-0 rtl:rotate-180" />
                </button>
                <button type="button" onClick={() => { onClose(); requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('open-store-updates'))); }} className="focus-ring mt-2 flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-[#C7982F]/25 bg-[#072E25] px-4 py-3 text-left text-xs font-semibold text-[#FDFBF7] hover:border-[#C7982F]/60">
                  <Bell size={16} className="text-[#E4C783]" aria-hidden="true" /><span dir="auto">{t('updates.open')}</span>
                </button>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                        logout();
                        onClose();
                    }}
                    className="w-full mt-2 min-h-[44px] flex items-center justify-center p-3 rounded-xl bg-red-950/60 border border-red-400/35 text-red-200 font-bold transition-all text-left cursor-pointer text-xs"
                  >
                    {t('sign_out', 'Sign Out')}
                  </button>
                )}
              </div>

              {/* 2. Cart with live item count & working link */}
              <div>
                <span className="text-[10px] font-sans font-semibold text-[#E4C783] block mb-2 px-1">
                  {t('shoppingBag', 'Shopping Bag')}
                </span>
                <button
                  type="button"
                  onClick={handleCartAction}
                  className="w-full min-h-[48px] flex items-center justify-between px-4 py-3 rounded-xl border border-[#C7982F]/35 bg-[#08352B] hover:bg-[#0B3F33] transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 text-xs font-bold text-[#FDFBF7]">
                    <ShoppingBag size={16} className="text-[#E4C783]" />
                    {t('reviewCart', 'Review Cart & Checkout')}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#C7982F] text-[#042821]">
                    {cartCount}
                  </span>
                </button>
              </div>

              {/* 3. Language selector: English, اردو, العربية */}
              <div className="border-t border-[#C7982F]/20 pt-4">
                <span className="text-[10px] font-sans font-semibold text-[#E4C783] block mb-2 px-1">
                  {t('languageSelector', 'Language / زبان / اللغة')}
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#031F1A] border border-[#C7982F]/25">
                  {(['en', 'ur', 'ar'] as LanguageCode[]).map((lang) => {
                    const isSelected = language === lang;
                    const labels: Record<LanguageCode, string> = {
                      en: 'English',
                      ur: 'اردو',
                      ar: 'العربية'
                    };
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setLanguage(lang)}
                        lang={lang}
                        dir={lang === 'en' ? 'ltr' : 'rtl'}
                        aria-pressed={isSelected}
                        className={`min-h-[44px] py-2 px-2 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#C7982F] text-[#042821] shadow-xs'
                            : 'text-[#F2ECE2]/80 hover:text-[#FDFBF7]'
                        }`}
                      >
                        {labels[lang]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3b. Currency selector: PKR, GBP, USD, AED */}
              <div className="border-t border-[#C7982F]/20 pt-4">
                <CurrencySelector variant="mobile" />
              </div>

              {/* 4. Theme selector: Light, Dark, Auto */}
              <div>
                <span className="text-[10px] font-sans font-semibold text-[#E4C783] block mb-2 px-1">
                  {t('appearanceMode', 'Appearance Mode')}
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#031F1A] border border-[#C7982F]/25">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    aria-pressed={theme === 'light'}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-[#C7982F] text-[#042821] shadow-xs'
                        : 'text-[#F2ECE2]/80 hover:text-[#FDFBF7]'
                    }`}
                  >
                    <Sun size={14} className={theme === 'light' ? 'text-[#042821]' : 'text-[#E4C783]'} />
                    <span>{t('nav.light')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    aria-pressed={theme === 'dark'}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#C7982F] text-[#042821] shadow-xs'
                        : 'text-[#F2ECE2]/80 hover:text-[#FDFBF7]'
                    }`}
                  >
                    <Moon size={14} className={theme === 'dark' ? 'text-[#042821]' : 'text-[#E4C783]'} />
                    <span>{t('nav.dark')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    aria-pressed={theme === 'system'}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      theme === 'system'
                        ? 'bg-[#C7982F] text-[#042821] shadow-xs'
                        : 'text-[#F2ECE2]/80 hover:text-[#FDFBF7]'
                    }`}
                  >
                    <Laptop size={14} />
                    <span>{t('nav.auto')}</span>
                  </button>
                </div>
              </div>

              {/* 5. Navigation Accordion & Compact Food Row */}
              <div className="border-t border-[#C7982F]/20 pt-4">
                <span className="text-[10px] font-sans font-semibold text-[#E4C783] block mb-2 px-1">
                  {t('ourCollections', 'Our Collections')}
                </span>

                {/* Accessible Accordion for Main Navigation */}
                <div className="space-y-1.5">
                  {contentNavigation(MAIN_NAV_ITEMS,content,language).slice(0, 5).map((item) => {
                    const isExpanded = !!expandedSections[item.id];

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#C7982F]/25 overflow-hidden bg-[#08352B]"
                      >
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-current={activeSection === item.id ? 'page' : undefined}
                          aria-controls={`mobile-nav-panel-${item.id}`}
                          onClick={() => toggleSection(item.id)}
                          className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-[#FDFBF7] hover:bg-[#C7982F]/15 transition-colors text-start cursor-pointer"
                        >
                          <span className="">{t(item.labelKey, item.defaultLabel)}</span>
                          <ChevronDown
                            size={14}
                            className={`text-[#E4C783] transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        <div
                          id={`mobile-nav-panel-${item.id}`}
                          role="region"
                          hidden={!isExpanded}
                          className={`px-2 pb-2.5 pt-1 space-y-0.5 bg-[#031F1A]/80 border-t border-[#C7982F]/15 ${
                            isExpanded ? 'block' : 'hidden'
                          }`}
                        >
                          {item.dropdownItems?.map((drop) => {
                            // Ensure backwards-compatible label matching for test suites
                            const labelText =
                              drop.id === 'herbs-spices'
                                ? catalogTranslations[language]?.['shop.herbs-spices'] || t('shop.herbs-spices', drop.defaultLabel)
                                : drop.id === 'curated-bundles'
                                ? catalogTranslations[language]?.['shop.bundles'] || t('shop.bundles', drop.defaultLabel)
                                : t(drop.labelKey, drop.defaultLabel);

                            return drop.action ? (
                              <button
                                key={drop.id}
                                type="button"
                                data-nav-path={drop.path}
                                onClick={() => {
                                  onClose();
                                  if (drop.action === 'open-hamper-builder') {
                                    window.dispatchEvent(new CustomEvent('open-hamper-builder'));
                                  } else if (drop.action === 'open-custom-quote') {
                                    openCustomQuoteModal({ mode: 'filled', quantity: 50 });
                                  }
                                }}
                                className="w-full min-h-[38px] flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-[#F2ECE2]/90 hover:bg-[#C7982F]/20 hover:text-[#FDFBF7] transition-colors text-start cursor-pointer"
                              >
                                <span className="truncate">{labelText}</span>
                                {drop.badge ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#C7982F]/25 text-[#E4C783]">
                                    {drop.badge}
                                  </span>
                                ) : (
                                  <ChevronRight size={12} className="text-[#E4C783]/60 shrink-0 rtl:rotate-180" />
                                )}
                              </button>
                            ) : (
                              <Link
                                key={drop.id}
                                to={drop.path}
                                data-nav-path={drop.path}
                                onClick={() => {
                                  onClose();
                                  if (onNavItemClick) onNavItemClick(labelText);
                                }}
                                className="w-full min-h-[38px] flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-[#F2ECE2]/90 hover:bg-[#C7982F]/20 hover:text-[#FDFBF7] transition-colors text-start cursor-pointer"
                              >
                                <span className="truncate">{labelText}</span>
                                {drop.badge ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#C7982F]/25 text-[#E4C783]">
                                    {drop.badge}
                                  </span>
                                ) : (
                                  <ChevronRight size={12} className="text-[#E4C783]/60 shrink-0 rtl:rotate-180" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Compact Food Categories Quick Navigation */}
                <div className="mt-4 pt-3 border-t border-[#C7982F]/20">
                  <span className="text-[10px] font-sans font-semibold text-[#E4C783] block mb-2 px-1">
                    {t('nav.foodRow', 'Compact Food Categories')}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {COMPACT_FOOD_NAV_ITEMS.map((food) => {
                      const foodLabel =
                        food.id === 'herbs-spices'
                          ? catalogTranslations[language]?.['shop.herbs-spices'] || t('shop.herbs-spices', food.defaultLabel)
                          : t(food.labelKey, food.defaultLabel);

                      return (
                        <Link
                          key={food.id}
                          to={food.path}
                          data-nav-path={food.path}
                          onClick={() => {
                            onClose();
                            if (onNavItemClick) onNavItemClick(foodLabel);
                          }}
                          className="min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl bg-[#08352B] border border-[#C7982F]/25 hover:border-[#C7982F] text-xs font-semibold text-[#FDFBF7] text-start transition-all cursor-pointer"
                        >
                          <span className="truncate">{foodLabel}</span>
                          <ChevronRight size={11} className="text-[#E4C783] shrink-0 rtl:rotate-180" />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Boutique Pages */}
                <div className="mt-4 space-y-1">
                  <Link
                    to="/journal"
                    onClick={() => onClose()}
                    className="w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#F2ECE2]/90 hover:bg-[#C7982F]/15 transition-colors text-start cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <BookOpen size={13} className="text-[#E4C783]" />
                      {t('journal', 'The Harvest Chronicle')}
                    </span>
                    <ChevronRight size={13} className="text-[#E4C783]/60 rtl:rotate-180" />
                  </Link>
                </div>
              </div>

              {/* 6. Social buttons: WhatsApp and Instagram */}
              <div className="border-t border-[#C7982F]/20 pt-4 pb-4">
                <span className="text-[10px] font-sans font-semibold text-[#E4C783] block mb-2 px-1">
                  {t('connectWithUs', 'Connect With Us')}
                </span>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={buildHumanSupportWhatsAppUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 basis-32 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#C7982F]/35 bg-[#08352B] text-xs font-bold text-[#FDFBF7] hover:bg-[#0B3F33] transition-all"
                  >
                    <MessageCircle size={16} className="text-[#25D366]" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href="https://www.instagram.com/allbarka.pk"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 basis-32 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#C7982F]/35 bg-[#08352B] text-xs font-bold text-[#FDFBF7] hover:bg-[#0B3F33] transition-all"
                  >
                    <Instagram size={16} className="text-[#E4C783]" />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>

            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
    </div>
  );
}
